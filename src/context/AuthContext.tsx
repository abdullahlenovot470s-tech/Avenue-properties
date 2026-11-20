/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import type { Auth, User as FirebaseUser } from 'firebase/auth';
import { IS_STATIC_MODE, parseApiResponse, SERVER_UNREACHABLE_MESSAGE } from '../lib/http';
import { BRAND_CONFIG } from '../config/brand.config';

const AUTH_ENABLED =
  BRAND_CONFIG.features.enableClientLogin || BRAND_CONFIG.features.enableAdminPanel;
const CLIENT_LOGIN_ENABLED = BRAND_CONFIG.features.enableClientLogin;

let firebaseLibPromise: Promise<typeof import('../lib/firebase')> | null = null;
function loadFirebaseLib() {
  if (!AUTH_ENABLED) {
    return Promise.reject(new Error('Firebase auth is disabled.'));
  }
  if (!firebaseLibPromise) {
    firebaseLibPromise = import('../lib/firebase');
  }
  return firebaseLibPromise;
}

interface AuthActionResult {
  success: boolean;
  error?: string;
  message?: string;
  unverified?: boolean;
  previewUrl?: string;
  provider?: string;
  isManagement?: boolean;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isManagement: boolean;
  managementToken: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<{
    success: boolean;
    error?: string;
    popupBlocked?: boolean;
    isManagement?: boolean;
  }>;
  loginWithEmail: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<AuthActionResult>;
  signupWithEmail: (data: {
    name: string;
    email: string;
    password: string;
  }) => Promise<AuthActionResult>;
  verifyEmailWithCode: (email: string, code: string) => Promise<AuthActionResult>;
  resendVerificationEmail: (email?: string) => Promise<AuthActionResult>;
  checkEmailVerified: (email?: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<AuthActionResult>;
  confirmPasswordResetWithCode: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<AuthActionResult>;
  updateUserPhone: (phone: string) => void;
  logout: () => Promise<void>;
  savedPropertyIds: string[];
  toggleSaveProperty: (id: string) => boolean;
  isPropertySaved: (id: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_PREFIX = BRAND_CONFIG.identity.storageKeyPrefix;
const GUEST_SAVED_KEY = `${STORAGE_PREFIX}_guest_saved_homes_v3`;
const USER_PHONE_PREFIX = `${STORAGE_PREFIX}_user_phone_`;
const USER_SAVED_PREFIX = `${STORAGE_PREFIX}_user_saved_`;
const EMAIL_SESSION_KEY = `${STORAGE_PREFIX}_email_session_v1`;
const MANAGEMENT_TOKEN_KEY = `${STORAGE_PREFIX}_mgmt_token_v1`;
const USER_TOKEN_KEY = `${STORAGE_PREFIX}_user_token_v1`;
const VERIFY_SESSION_PREFIX = `${STORAGE_PREFIX}_verify_sess_`;
const USER_SYNC_TS_PREFIX = `${STORAGE_PREFIX}_usync_ts_`;
const GOOGLE_SYNC_TS_PREFIX = `${STORAGE_PREFIX}_gsync_ts_`;
const USER_PROFILE_SYNC_TTL_MS = 15 * 60 * 1000;
const GOOGLE_SYNC_TTL_MS = 10 * 60 * 1000;
const MANAGEMENT_PORTAL_EMAIL = BRAND_CONFIG.contact.managementGoogleEmail.trim().toLowerCase();
const MANAGEMENT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_MEMBER_NAME = `${BRAND_CONFIG.identity.brandShortName} Member`;

function getRecentSyncTimestamp(prefix: string, uid: string): number {
  try {
    const raw = sessionStorage.getItem(`${prefix}${uid}`);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function recordSyncTimestamp(prefix: string, uid: string): void {
  try {
    sessionStorage.setItem(`${prefix}${uid}`, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
}

function clearSyncTimestamps(): void {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith(USER_SYNC_TS_PREFIX) || key.startsWith(GOOGLE_SYNC_TS_PREFIX))) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

function isVerifiedFirebaseManagementUser(fbUser: FirebaseUser | null): boolean {
  if (!fbUser || !fbUser.email) return false;
  return Boolean(
    fbUser.emailVerified && fbUser.email.trim().toLowerCase() === MANAGEMENT_PORTAL_EMAIL
  );
}

async function checkFirebaseMgmtSessionValid(fbUser: FirebaseUser | null): Promise<boolean> {
  if (!isVerifiedFirebaseManagementUser(fbUser) || !fbUser) return false;
  try {
    const tokenResult = await fbUser.getIdTokenResult();
    const authTimeMs = Date.parse(tokenResult.authTime);
    if (!Number.isFinite(authTimeMs)) return false;
    const ageMs = Date.now() - authTimeMs;
    return ageMs >= -300000 && ageMs <= MANAGEMENT_SESSION_TTL_MS;
  } catch {
    return false;
  }
}

function saveVerifySessionToken(email: string, token?: string): void {
  if (!email || !token) return;
  try {
    sessionStorage.setItem(`${VERIFY_SESSION_PREFIX}${email.trim().toLowerCase()}`, token);
  } catch {
    // Ignore storage quota errors
  }
}

function getVerifySessionToken(email: string): string | null {
  if (!email) return null;
  try {
    return sessionStorage.getItem(`${VERIFY_SESSION_PREFIX}${email.trim().toLowerCase()}`);
  } catch {
    return null;
  }
}

function clearVerifySessionToken(email?: string): void {
  try {
    if (email) {
      sessionStorage.removeItem(`${VERIFY_SESSION_PREFIX}${email.trim().toLowerCase()}`);
      return;
    }
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(VERIFY_SESSION_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

function parseManagementTokenPayload(
  token: string | null
): { email?: string; role?: string; exp?: number } | null {
  if (!token || !token.includes('.')) return null;
  try {
    const payloadB64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as { email?: string; role?: string; exp?: number };
  } catch {
    return null;
  }
}

function isManagementTokenValid(token: string | null, expectedEmail?: string | null): boolean {
  const parsed = parseManagementTokenPayload(token);
  if (!parsed) return false;
  if (parsed.role !== 'management' || typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) {
    return false;
  }
  if (expectedEmail) {
    return String(parsed.email || '').toLowerCase() === expectedEmail.trim().toLowerCase();
  }
  return true;
}

function getStoredToken(key: string): string | null {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeSessionToken(key: string, token: string | undefined, persistInLocalStorage: boolean): void {
  try {
    if (!token) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      return;
    }
    if (persistInLocalStorage) {
      localStorage.setItem(key, token);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, token);
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage quota errors
  }
}

function readLocalSavedIds(uid: string): string[] {
  try {
    const raw = localStorage.getItem(`${USER_SAVED_PREFIX}${uid}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function resolveFirebaseProvider(fbUser: FirebaseUser): 'google' | 'email' {
  return fbUser.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'email';
}

function mapFirebaseAuthError(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in or use Forgot Password.';
    case 'auth/invalid-email':
      return 'Please provide a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 8 characters long.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please verify and try again.';
    case 'auth/user-disabled':
      return `This account has been disabled. Please contact ${BRAND_CONFIG.identity.brandShortName} support.`;
    case 'auth/too-many-requests':
      return 'Too many attempts detected. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Network error while connecting to Firebase. Please check your connection.';
    case 'auth/operation-not-allowed':
      return 'Email/Password authentication is disabled in Firebase Console. Enable it under Authentication > Sign-in method.';
    case 'auth/unauthorized-domain': {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      return `Unauthorized domain (${host}). Please add this domain in Firebase Console > Authentication > Settings > Authorized domains.`;
    }
    default:
      return fallback;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [managementToken, setManagementToken] = useState<string | null>(() => {
    if (!AUTH_ENABLED || IS_STATIC_MODE) return null;
    const stored = getStoredToken(MANAGEMENT_TOKEN_KEY);
    return isManagementTokenValid(stored) ? stored : null;
  });
  const authEnabled = AUTH_ENABLED;
  const [firebaseMgmtSessionValid, setFirebaseMgmtSessionValid] = useState<boolean>(false);
  const [loading, setLoading] = useState(!authEnabled ? false : true);
  const [guestSavedIds, setGuestSavedIds] = useState<string[]>(() => {
    if (!BRAND_CONFIG.features.enableSavedProperties) return [];
    try {
      const raw = localStorage.getItem(GUEST_SAVED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const guestSavedRef = useRef<string[]>(guestSavedIds);
  const googleSyncInFlightRef = useRef<{ uid: string; promise: Promise<{ isManagement: boolean }> } | null>(
    null
  );
  useEffect(() => {
    guestSavedRef.current = guestSavedIds;
  }, [guestSavedIds]);

  const syncUserProfileToFirestore = async (
    fbUser: FirebaseUser,
    providerOverride?: 'email' | 'google',
    force = false
  ): Promise<{ phone?: string; savedPropertyIds: string[]; createdAt: string }> => {
    const uid = fbUser.uid;
    const localPhone = localStorage.getItem(`${USER_PHONE_PREFIX}${uid}`) || '';
    const hadGuestSaved = guestSavedRef.current.length > 0;
    let localSaved = readLocalSavedIds(uid);
    if (hadGuestSaved) {
      localSaved = Array.from(new Set([...localSaved, ...guestSavedRef.current])).slice(0, 100);
      localStorage.setItem(`${USER_SAVED_PREFIX}${uid}`, JSON.stringify(localSaved));
      localStorage.removeItem(GUEST_SAVED_KEY);
      setGuestSavedIds([]);
    }

    const fallbackCreatedAt = (fbUser.metadata.creationTime || new Date().toISOString()).slice(0, 64);
    if (!AUTH_ENABLED || !fbUser.emailVerified || !fbUser.email) {
      return {
        phone: localPhone || undefined,
        savedPropertyIds: localSaved,
        createdAt: fallbackCreatedAt,
      };
    }

    if (
      !force &&
      !hadGuestSaved &&
      Date.now() - getRecentSyncTimestamp(USER_SYNC_TS_PREFIX, uid) < USER_PROFILE_SYNC_TTL_MS
    ) {
      return {
        phone: localPhone || undefined,
        savedPropertyIds: localSaved,
        createdAt: fallbackCreatedAt,
      };
    }

    const fbLib = await loadFirebaseLib();
    const [db, { doc, getDoc, setDoc, updateDoc }] = await Promise.all([
      fbLib.getDbAsync(),
      import('firebase/firestore'),
    ]);
    const userPath = `users/${uid}`;
    const userRef = doc(db, 'users', uid);
    const provider = providerOverride || resolveFirebaseProvider(fbUser);
    const cleanName = (fbUser.displayName || fbUser.email.split('@')[0] || DEFAULT_MEMBER_NAME)
      .trim()
      .slice(0, 120);
    const cleanEmail = fbUser.email.trim().toLowerCase().slice(0, 254);
    const cleanPhoto =
      fbUser.photoURL && fbUser.photoURL.length <= 1000 ? fbUser.photoURL : undefined;
    const nowIso = new Date().toISOString().slice(0, 64);

    try {
      let existingData: Record<string, unknown> | null = null;
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          existingData = snap.data() as Record<string, unknown>;
        }
      } catch (err) {
        if (fbLib.isFirestoreQuotaError(err)) {
          recordSyncTimestamp(USER_SYNC_TS_PREFIX, uid);
          return {
            phone: localPhone || undefined,
            savedPropertyIds: localSaved,
            createdAt: fallbackCreatedAt,
          };
        }
        fbLib.handleFirestoreError(err, fbLib.OperationType.GET, userPath);
      }

      const firestoreSaved = Array.isArray(existingData?.savedPropertyIds)
        ? (existingData.savedPropertyIds as unknown[]).filter(
            (id): id is string => typeof id === 'string'
          )
        : [];
      const mergedSaved = Array.from(new Set([...firestoreSaved, ...localSaved])).slice(0, 100);
      localStorage.setItem(`${USER_SAVED_PREFIX}${uid}`, JSON.stringify(mergedSaved));

      const firestorePhone =
        typeof existingData?.phone === 'string' ? existingData.phone.trim().slice(0, 32) : '';
      const mergedPhone = (localPhone || firestorePhone).slice(0, 32);
      if (mergedPhone) {
        localStorage.setItem(`${USER_PHONE_PREFIX}${uid}`, mergedPhone);
      }

      const createdAt =
        typeof existingData?.createdAt === 'string' && existingData.createdAt
          ? existingData.createdAt.slice(0, 64)
          : fallbackCreatedAt;

      if (!existingData) {
        const createPayload: Record<string, unknown> = {
          id: uid,
          email: cleanEmail,
          name: cleanName,
          emailVerified: true,
          provider,
          createdAt,
          lastLoginAt: nowIso,
          savedPropertyIds: mergedSaved,
        };
        if (cleanPhoto) createPayload.photoURL = cleanPhoto;
        if (mergedPhone) createPayload.phone = mergedPhone;

        try {
          await setDoc(userRef, createPayload);
        } catch (err) {
          if (!fbLib.isFirestoreQuotaError(err)) {
            fbLib.handleFirestoreError(err, fbLib.OperationType.CREATE, userPath);
          }
        }
      } else {
        const updatePayload: Record<string, unknown> = {
          name: cleanName,
          emailVerified: true,
          provider,
          lastLoginAt: nowIso,
          savedPropertyIds: mergedSaved,
        };
        if (cleanPhoto) updatePayload.photoURL = cleanPhoto;
        if (mergedPhone) updatePayload.phone = mergedPhone;

        try {
          await updateDoc(userRef, updatePayload);
        } catch (err) {
          if (!fbLib.isFirestoreQuotaError(err)) {
            fbLib.handleFirestoreError(err, fbLib.OperationType.UPDATE, userPath);
          }
        }
      }

      recordSyncTimestamp(USER_SYNC_TS_PREFIX, uid);
      return {
        phone: mergedPhone || undefined,
        savedPropertyIds: mergedSaved,
        createdAt,
      };
    } catch {
      return {
        phone: localPhone || undefined,
        savedPropertyIds: localSaved,
        createdAt: fallbackCreatedAt,
      };
    }
  };

  const hydrateUserSession = (
    baseUser: {
      id: string;
      name: string;
      email: string;
      photoURL?: string;
      emailVerified: boolean;
      role?: 'client' | 'management';
      createdAt?: string;
    },
    persistInLocalStorage = true,
    mgmtToken?: string,
    userToken?: string
  ): UserProfile => {
    const storedPhone = localStorage.getItem(`${USER_PHONE_PREFIX}${baseUser.id}`) || '';
    let savedIds = readLocalSavedIds(baseUser.id);

    if (guestSavedRef.current.length > 0) {
      savedIds = Array.from(new Set([...savedIds, ...guestSavedRef.current]));
      localStorage.setItem(`${USER_SAVED_PREFIX}${baseUser.id}`, JSON.stringify(savedIds));
      localStorage.removeItem(GUEST_SAVED_KEY);
      setGuestSavedIds([]);
    }

    const validMgmtToken =
      baseUser.role === 'management' && isManagementTokenValid(mgmtToken ?? null)
        ? mgmtToken
        : undefined;
    const isMgmtAccount = Boolean(validMgmtToken);

    const profile: UserProfile = {
      id: baseUser.id,
      name: baseUser.name,
      email: baseUser.email,
      photoURL: baseUser.photoURL,
      phone: storedPhone || undefined,
      emailVerified: baseUser.emailVerified,
      role: isMgmtAccount ? 'management' : 'client',
      createdAt: baseUser.createdAt || new Date().toISOString(),
      savedPropertyIds: savedIds,
    };

    if (persistInLocalStorage) {
      localStorage.setItem(EMAIL_SESSION_KEY, JSON.stringify(profile));
      sessionStorage.removeItem(EMAIL_SESSION_KEY);
    } else {
      sessionStorage.setItem(EMAIL_SESSION_KEY, JSON.stringify(profile));
      localStorage.removeItem(EMAIL_SESSION_KEY);
    }

    storeSessionToken(MANAGEMENT_TOKEN_KEY, validMgmtToken, persistInLocalStorage);
    storeSessionToken(USER_TOKEN_KEY, userToken, persistInLocalStorage);

    setManagementToken(validMgmtToken || null);
    setCurrentUser(profile);
    return profile;
  };

  const syncGoogleUserWithBackend = async (
    fbUser: FirebaseUser,
    force = false
  ): Promise<{ isManagement: boolean }> => {
    if (IS_STATIC_MODE) {
      const fbMgmtValid = await checkFirebaseMgmtSessionValid(fbUser);
      setFirebaseMgmtSessionValid(fbMgmtValid);
      setManagementToken(null);
      setCurrentUser((prev) =>
        prev && prev.id === fbUser.uid
          ? { ...prev, role: fbMgmtValid ? 'management' : 'client' }
          : prev
      );
      return { isManagement: fbMgmtValid };
    }

    if (
      !force &&
      Date.now() - getRecentSyncTimestamp(GOOGLE_SYNC_TS_PREFIX, fbUser.uid) < GOOGLE_SYNC_TTL_MS
    ) {
      const cachedToken = getStoredToken(MANAGEMENT_TOKEN_KEY);
      if (cachedToken && isManagementTokenValid(cachedToken, fbUser.email)) {
        const fbValid = await checkFirebaseMgmtSessionValid(fbUser);
        setFirebaseMgmtSessionValid(fbValid);
        setManagementToken(cachedToken);
        return { isManagement: true };
      }
      if (!isVerifiedFirebaseManagementUser(fbUser)) {
        return { isManagement: false };
      }
      const fbValid = await checkFirebaseMgmtSessionValid(fbUser);
      setFirebaseMgmtSessionValid(fbValid);
      return { isManagement: fbValid };
    }

    const existingSync = googleSyncInFlightRef.current;
    if (existingSync && existingSync.uid === fbUser.uid) {
      const result = await existingSync.promise;
      setCurrentUser((prev) =>
        prev && prev.id === fbUser.uid
          ? { ...prev, role: result.isManagement ? 'management' : prev.role || 'client' }
          : prev
      );
      return result;
    }

    const requestSyncWithToken = async (forceRefresh: boolean) => {
      const idToken = await fbUser.getIdToken(forceRefresh);
      const res = await fetch('/api/auth/google-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ idToken }),
      });
      return parseApiResponse<{
        success?: boolean;
        isManagement?: boolean;
        managementToken?: string;
        userToken?: string;
      }>(res);
    };

    const runSync = (async (): Promise<{ isManagement: boolean }> => {
      let backendExplicitlyResponded = false;
      if (!IS_STATIC_MODE) {
        try {
          let parsed = await requestSyncWithToken(false);
          if (parsed.status === 401 && !parsed.unreachable) {
            parsed = await requestSyncWithToken(true);
          }

          if (!parsed.unreachable && parsed.data) {
            backendExplicitlyResponded = true;
          }

          if (parsed.ok && parsed.data?.success) {
            recordSyncTimestamp(GOOGLE_SYNC_TS_PREFIX, fbUser.uid);
            if (parsed.data.userToken) {
              storeSessionToken(USER_TOKEN_KEY, parsed.data.userToken, true);
            }

            const mgmtToken = parsed.data.managementToken;
            if (parsed.data.isManagement && mgmtToken && isManagementTokenValid(mgmtToken, fbUser.email)) {
              const fbValid = await checkFirebaseMgmtSessionValid(fbUser);
              setFirebaseMgmtSessionValid(fbValid);
              storeSessionToken(MANAGEMENT_TOKEN_KEY, mgmtToken, true);
              setManagementToken(mgmtToken);
              setCurrentUser((prev) =>
                prev && prev.id === fbUser.uid ? { ...prev, role: 'management' } : prev
              );
              return { isManagement: true };
            }

            setFirebaseMgmtSessionValid(false);
            storeSessionToken(MANAGEMENT_TOKEN_KEY, undefined, true);
            setManagementToken(null);
            setCurrentUser((prev) =>
              prev && prev.id === fbUser.uid ? { ...prev, role: 'client' } : prev
            );
            return { isManagement: false };
          }
        } catch {
          // Backend sync failed or timed out; fall back below
        }
      }

      if (!backendExplicitlyResponded) {
        recordSyncTimestamp(GOOGLE_SYNC_TS_PREFIX, fbUser.uid);
      }

      const cachedToken = getStoredToken(MANAGEMENT_TOKEN_KEY);
      if (cachedToken && isManagementTokenValid(cachedToken, fbUser.email)) {
        const fbValid = await checkFirebaseMgmtSessionValid(fbUser);
        setFirebaseMgmtSessionValid(fbValid);
        setManagementToken(cachedToken);
        setCurrentUser((prev) =>
          prev && prev.id === fbUser.uid ? { ...prev, role: 'management' } : prev
        );
        return { isManagement: true };
      }

      if (!backendExplicitlyResponded && isVerifiedFirebaseManagementUser(fbUser)) {
        const fbValid = await checkFirebaseMgmtSessionValid(fbUser);
        setFirebaseMgmtSessionValid(fbValid);
        setManagementToken(null);
        setCurrentUser((prev) =>
          prev && prev.id === fbUser.uid
            ? { ...prev, role: fbValid ? 'management' : 'client' }
            : prev
        );
        return { isManagement: fbValid };
      }

      setFirebaseMgmtSessionValid(false);
      setManagementToken(null);
      return { isManagement: false };
    })().finally(() => {
      if (googleSyncInFlightRef.current?.uid === fbUser.uid) {
        googleSyncInFlightRef.current = null;
      }
    });

    googleSyncInFlightRef.current = { uid: fbUser.uid, promise: runSync };
    return runSync;
  };

  const authListenerStartedRef = useRef(false);
  const authInitPromiseRef = useRef<Promise<Auth | null> | null>(null);
  const authUnsubscribeRef = useRef<(() => void) | null>(null);
  const activeMountRef = useRef(true);

  const ensureAuthReady = async (): Promise<Auth | null> => {
    if (!AUTH_ENABLED) {
      if (activeMountRef.current) setLoading(false);
      return null;
    }
    if (!authInitPromiseRef.current) {
      authInitPromiseRef.current = (async () => {
        const fbLib = await loadFirebaseLib();
        const [firebaseAuth, { onAuthStateChanged, signOut }] = await Promise.all([
          fbLib.getAuthAsync(),
          import('firebase/auth'),
        ]);
        if (!firebaseAuth) {
          if (activeMountRef.current) setLoading(false);
          return null;
        }
        if (!authListenerStartedRef.current && activeMountRef.current) {
          authListenerStartedRef.current = true;
          authUnsubscribeRef.current = onAuthStateChanged(firebaseAuth, async (fbUser) => {
            if (!activeMountRef.current) return;
            setFirebaseUser(fbUser);

            if (fbUser) {
              const isGoogle = fbUser.providerData.some((p) => p.providerId === 'google.com');
              // Never mark unverified email/password Firebase users as logged in
              if (fbUser.emailVerified || isGoogle) {
                const storedPhone = localStorage.getItem(`${USER_PHONE_PREFIX}${fbUser.uid}`) || '';
                let savedIds = readLocalSavedIds(fbUser.uid);

                if (guestSavedRef.current.length > 0) {
                  savedIds = Array.from(new Set([...savedIds, ...guestSavedRef.current]));
                  localStorage.setItem(`${USER_SAVED_PREFIX}${fbUser.uid}`, JSON.stringify(savedIds));
                  localStorage.removeItem(GUEST_SAVED_KEY);
                  setGuestSavedIds([]);
                }

                const storedMgmtToken = IS_STATIC_MODE ? null : getStoredToken(MANAGEMENT_TOKEN_KEY);
                const hasMatchingMgmtToken = Boolean(
                  !IS_STATIC_MODE &&
                    storedMgmtToken &&
                    isManagementTokenValid(storedMgmtToken, fbUser.email)
                );
                const isFbMgmt = isVerifiedFirebaseManagementUser(fbUser);
                const fbMgmtValid = isFbMgmt ? await checkFirebaseMgmtSessionValid(fbUser) : false;

                if (isFbMgmt && !fbMgmtValid && !hasMatchingMgmtToken) {
                  // Expired 8-hour management session: force clean sign-out
                  setFirebaseMgmtSessionValid(false);
                  setManagementToken(null);
                  setCurrentUser(null);
                  localStorage.removeItem(MANAGEMENT_TOKEN_KEY);
                  sessionStorage.removeItem(MANAGEMENT_TOKEN_KEY);
                  void signOut(firebaseAuth);
                  if (activeMountRef.current) setLoading(false);
                  return;
                }

                const initialIsMgmt = hasMatchingMgmtToken || fbMgmtValid;
                setFirebaseMgmtSessionValid(fbMgmtValid);
                setManagementToken(hasMatchingMgmtToken ? storedMgmtToken : null);
                setCurrentUser({
                  id: fbUser.uid,
                  name: fbUser.displayName || fbUser.email?.split('@')[0] || DEFAULT_MEMBER_NAME,
                  email: fbUser.email || '',
                  photoURL: fbUser.photoURL || undefined,
                  phone: storedPhone || undefined,
                  emailVerified: true,
                  role: initialIsMgmt ? 'management' : 'client',
                  createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
                  savedPropertyIds: savedIds,
                });

                const firestoreSynced = await syncUserProfileToFirestore(fbUser);
                if (activeMountRef.current) {
                  setCurrentUser((prev) =>
                    prev && prev.id === fbUser.uid
                      ? {
                          ...prev,
                          phone: firestoreSynced.phone || prev.phone,
                          savedPropertyIds: firestoreSynced.savedPropertyIds,
                          createdAt: firestoreSynced.createdAt,
                        }
                      : prev
                  );
                }

                if (fbUser.email) {
                  await syncGoogleUserWithBackend(fbUser);
                }
              }
            } else if (IS_STATIC_MODE) {
              setFirebaseMgmtSessionValid(false);
              setManagementToken(null);
              setCurrentUser(null);
            } else {
              // Restore verified email session if present
              const savedEmailSession = getStoredToken(EMAIL_SESSION_KEY);
              const savedMgmtToken = getStoredToken(MANAGEMENT_TOKEN_KEY);

              if (savedEmailSession) {
                try {
                  const parsed = JSON.parse(savedEmailSession) as UserProfile;
                  if (parsed && parsed.emailVerified) {
                    const hasValidMgmtToken =
                      parsed.role === 'management' && isManagementTokenValid(savedMgmtToken, parsed.email);

                    if (parsed.role === 'management' && !hasValidMgmtToken) {
                      // Expired 8-hour management token: force clean sign-out
                      localStorage.removeItem(EMAIL_SESSION_KEY);
                      sessionStorage.removeItem(EMAIL_SESSION_KEY);
                      localStorage.removeItem(MANAGEMENT_TOKEN_KEY);
                      sessionStorage.removeItem(MANAGEMENT_TOKEN_KEY);
                      setManagementToken(null);
                      setCurrentUser(null);
                    } else {
                      const storedSavedRaw = localStorage.getItem(`${USER_SAVED_PREFIX}${parsed.id}`);
                      const storedPhone = localStorage.getItem(`${USER_PHONE_PREFIX}${parsed.id}`) || '';
                      setManagementToken(hasValidMgmtToken && savedMgmtToken ? savedMgmtToken : null);
                      setCurrentUser({
                        ...parsed,
                        role: hasValidMgmtToken ? 'management' : 'client',
                        phone: storedPhone || parsed.phone,
                        savedPropertyIds: storedSavedRaw
                          ? JSON.parse(storedSavedRaw)
                          : parsed.savedPropertyIds || [],
                      });
                    }
                  } else {
                    setManagementToken(null);
                    setCurrentUser(null);
                  }
                } catch {
                  setManagementToken(null);
                  setCurrentUser(null);
                }
              } else {
                setManagementToken(null);
                setCurrentUser(null);
              }
            }

            if (activeMountRef.current) {
              setLoading(false);
            }
          });
        }
        return firebaseAuth;
      })();
    }
    return authInitPromiseRef.current;
  };

  // Defer Firebase Auth listener initialization until right after first paint
  useEffect(() => {
    activeMountRef.current = true;
    if (!authEnabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const startAuth = () => {
      if (cancelled) return;
      void ensureAuthReady();
    };

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const isAuthOrMgmtRoute = /^\/(login|signup|profile|manage|records)(\/|$)/.test(currentPath);

    rafId = window.requestAnimationFrame(() => {
      if (cancelled) return;
      if (isAuthOrMgmtRoute) {
        timerId = globalThis.setTimeout(startAuth, 0);
      } else if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(startAuth, { timeout: 1000 });
      } else {
        timerId = globalThis.setTimeout(startAuth, 200);
      }
    });

    return () => {
      cancelled = true;
      activeMountRef.current = false;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timerId !== null) globalThis.clearTimeout(timerId);
      authUnsubscribeRef.current?.();
      authUnsubscribeRef.current = null;
      authListenerStartedRef.current = false;
      authInitPromiseRef.current = null;
    };
  }, []);

  // 1. Google Sign-in with popup (no redirect inside iframe)
  const loginWithGoogle = async (): Promise<{
    success: boolean;
    error?: string;
    popupBlocked?: boolean;
    isManagement?: boolean;
  }> => {
    if (!AUTH_ENABLED || !BRAND_CONFIG.features.enableGoogleLogin) {
      return { success: false, error: 'Google sign-in is disabled.' };
    }
    const fbLib = await loadFirebaseLib();
    const [firebaseAuth, googleProvider, { signInWithPopup }] = await Promise.all([
      ensureAuthReady(),
      fbLib.getGoogleProviderAsync(),
      import('firebase/auth'),
    ]);
    if (!firebaseAuth || !googleProvider) {
      return { success: false, error: 'Google sign-in is disabled.' };
    }
    try {
      const credential = await signInWithPopup(firebaseAuth, googleProvider);
      const fbUser = credential.user;

      localStorage.removeItem(EMAIL_SESSION_KEY);
      sessionStorage.removeItem(EMAIL_SESSION_KEY);
      localStorage.removeItem(USER_TOKEN_KEY);
      sessionStorage.removeItem(USER_TOKEN_KEY);
      if (IS_STATIC_MODE) {
        setManagementToken(null);
      } else {
        const cachedMgmt = getStoredToken(MANAGEMENT_TOKEN_KEY);
        if (cachedMgmt && !isManagementTokenValid(cachedMgmt, fbUser.email)) {
          localStorage.removeItem(MANAGEMENT_TOKEN_KEY);
          sessionStorage.removeItem(MANAGEMENT_TOKEN_KEY);
          setManagementToken(null);
        }
      }

      const [firestoreSynced, syncResult] = await Promise.all([
        syncUserProfileToFirestore(fbUser, 'google', true),
        fbUser.email ? syncGoogleUserWithBackend(fbUser, true) : Promise.resolve({ isManagement: false }),
      ]);

      const isMgmt = syncResult.isManagement;
      setFirebaseUser(fbUser);
      setCurrentUser({
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || DEFAULT_MEMBER_NAME,
        email: fbUser.email || '',
        photoURL: fbUser.photoURL || undefined,
        phone: firestoreSynced.phone,
        emailVerified: true,
        role: isMgmt ? 'management' : 'client',
        createdAt: firestoreSynced.createdAt,
        savedPropertyIds: firestoreSynced.savedPropertyIds,
      });

      return { success: true, isManagement: isMgmt };
    } catch (error: any) {
      console.warn('Google sign-in popup error:', error?.code, error?.message);

      if (error?.code === 'auth/popup-blocked') {
        return {
          success: false,
          popupBlocked: true,
          error: 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.',
        };
      } else if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request'
      ) {
        return { success: false, error: 'Sign-in was cancelled.' };
      } else if (error?.code === 'auth/network-request-failed') {
        return { success: false, error: 'Network error. Please check your internet connection.' };
      } else if (error?.code === 'auth/account-exists-with-different-credential') {
        return {
          success: false,
          error: 'An account already exists with this email. Please log in with your password.',
        };
      } else if (error?.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        return {
          success: false,
          error: `Unauthorized domain (${host}). Please authorize this domain in the Firebase Console.`,
        };
      }

      return {
        success: false,
        error: error?.message || 'Could not complete Google sign-in. Please try again.',
      };
    }
  };

  // 2. Email & Password Login (supports Management/legacy backend login + Firebase Email/Password)
  const loginWithEmail = async (
    email: string,
    password: string,
    rememberMe = true
  ): Promise<AuthActionResult> => {
    if (!AUTH_ENABLED) {
      return { success: false, error: 'Account login is disabled.' };
    }
    const cleanEmail = email.trim().toLowerCase();

    if (IS_STATIC_MODE) {
      const firebaseAuth = await ensureAuthReady();
      if (!firebaseAuth) {
        return { success: false, error: 'Account login is disabled.' };
      }
      try {
        const {
          setPersistence,
          browserLocalPersistence,
          browserSessionPersistence,
          signInWithEmailAndPassword,
        } = await import('firebase/auth');
        await setPersistence(
          firebaseAuth,
          rememberMe ? browserLocalPersistence : browserSessionPersistence
        );
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
        const fbUser = userCredential.user;
        await fbUser.reload();

        if (!fbUser.emailVerified) {
          return { success: false, unverified: true, provider: 'firebase' };
        }

        await fbUser.getIdToken(true);
        const [firestoreSynced, syncResult] = await Promise.all([
          syncUserProfileToFirestore(fbUser, 'email', true),
          syncGoogleUserWithBackend(fbUser, true),
        ]);
        setFirebaseUser(fbUser);
        setCurrentUser({
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || DEFAULT_MEMBER_NAME,
          email: fbUser.email || cleanEmail,
          photoURL: fbUser.photoURL || undefined,
          phone: firestoreSynced.phone,
          emailVerified: true,
          role: syncResult.isManagement ? 'management' : 'client',
          createdAt: firestoreSynced.createdAt,
          savedPropertyIds: firestoreSynced.savedPropertyIds,
        });

        return { success: true, isManagement: syncResult.isManagement };
      } catch (fbError: any) {
        return {
          success: false,
          error: mapFirebaseAuthError(
            fbError?.code,
            'Incorrect email or password. Please verify and try again.'
          ),
        };
      }
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const parsed = await parseApiResponse<{
        success?: boolean;
        user?: any;
        managementToken?: string;
        userToken?: string;
        verificationSessionToken?: string;
        unverified?: boolean;
        error?: string;
      }>(response);

      if (parsed.ok && parsed.data?.success && parsed.data.user) {
        const profile = hydrateUserSession(
          parsed.data.user,
          rememberMe,
          parsed.data.managementToken,
          parsed.data.userToken
        );
        return { success: true, isManagement: profile.role === 'management' };
      }

      if (parsed.status === 403 && parsed.data?.unverified) {
        saveVerifySessionToken(cleanEmail, parsed.data.verificationSessionToken);
        return { success: false, unverified: true, provider: 'server' };
      }

      if (parsed.status === 429) {
        return {
          success: false,
          error: parsed.data?.error || 'Too many failed login attempts. Please try again shortly.',
        };
      }

      // Firebase Email/Password authentication (primary path for client email accounts)
      if (parsed.status === 401 || parsed.unreachable || !parsed.data) {
        const firebaseAuth = await ensureAuthReady();
        if (firebaseAuth) {
          try {
            const {
              setPersistence,
              browserLocalPersistence,
              browserSessionPersistence,
              signInWithEmailAndPassword,
            } = await import('firebase/auth');
            await setPersistence(
              firebaseAuth,
              rememberMe ? browserLocalPersistence : browserSessionPersistence
            );
            const userCredential = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
            const fbUser = userCredential.user;
            await fbUser.reload();

            if (!fbUser.emailVerified) {
              return { success: false, unverified: true, provider: 'firebase' };
            }

            await fbUser.getIdToken(true);
            const [firestoreSynced, syncResult] = await Promise.all([
              syncUserProfileToFirestore(fbUser, 'email', true),
              syncGoogleUserWithBackend(fbUser, true),
            ]);
            setFirebaseUser(fbUser);
            setCurrentUser({
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || DEFAULT_MEMBER_NAME,
              email: fbUser.email || cleanEmail,
              photoURL: fbUser.photoURL || undefined,
              phone: firestoreSynced.phone,
              emailVerified: true,
              role: syncResult.isManagement ? 'management' : 'client',
              createdAt: firestoreSynced.createdAt,
              savedPropertyIds: firestoreSynced.savedPropertyIds,
            });

            return { success: true, isManagement: syncResult.isManagement };
          } catch (fbError: any) {
            return {
              success: false,
              error: mapFirebaseAuthError(
                fbError?.code,
                parsed.data?.error || 'Incorrect email or password. Please verify and try again.'
              ),
            };
          }
        }
      }

      return {
        success: false,
        error: parsed.data?.error || 'Sign in failed. Please try again.',
      };
    } catch {
      const firebaseAuth = await ensureAuthReady();
      if (!firebaseAuth) {
        return { success: false, error: 'Account login is disabled.' };
      }
      try {
        const {
          setPersistence,
          browserLocalPersistence,
          browserSessionPersistence,
          signInWithEmailAndPassword,
        } = await import('firebase/auth');
        await setPersistence(
          firebaseAuth,
          rememberMe ? browserLocalPersistence : browserSessionPersistence
        );
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
        const fbUser = userCredential.user;
        await fbUser.reload();

        if (!fbUser.emailVerified) {
          return { success: false, unverified: true, provider: 'firebase' };
        }

        await fbUser.getIdToken(true);
        const [firestoreSynced, syncResult] = await Promise.all([
          syncUserProfileToFirestore(fbUser, 'email', true),
          syncGoogleUserWithBackend(fbUser, true),
        ]);
        setFirebaseUser(fbUser);
        setCurrentUser({
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || DEFAULT_MEMBER_NAME,
          email: fbUser.email || cleanEmail,
          photoURL: fbUser.photoURL || undefined,
          phone: firestoreSynced.phone,
          emailVerified: true,
          role: syncResult.isManagement ? 'management' : 'client',
          createdAt: firestoreSynced.createdAt,
          savedPropertyIds: firestoreSynced.savedPropertyIds,
        });
        return { success: true, isManagement: syncResult.isManagement };
      } catch (fbError: any) {
        return {
          success: false,
          error: mapFirebaseAuthError(
            fbError?.code,
            'Unable to reach the authentication server. Please check your connection or use Google Sign-In.'
          ),
        };
      }
    }
  };

  // 3. Signup with Email & Password via Firebase Auth + Real Email Verification Link
  const signupWithEmail = async (data: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthActionResult> => {
    if (!CLIENT_LOGIN_ENABLED) {
      return { success: false, error: 'Client registration is disabled.' };
    }
    const cleanName = data.name.trim();
    const cleanEmail = data.email.trim().toLowerCase();

    const [firebaseAuth, { createUserWithEmailAndPassword, updateProfile, sendEmailVerification }] =
      await Promise.all([ensureAuthReady(), import('firebase/auth')]);
    if (!firebaseAuth) {
      return { success: false, error: 'Client registration is disabled.' };
    }
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, data.password);
      await updateProfile(credential.user, { displayName: cleanName });
      await sendEmailVerification(credential.user);
      setFirebaseUser(credential.user);

      return {
        success: true,
        provider: 'firebase',
      };
    } catch (fbError: any) {
      // Only fall back to backend email OTP if Email/Password provider is disabled in Firebase Console
      if (!IS_STATIC_MODE && fbError?.code === 'auth/operation-not-allowed') {
        try {
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: cleanName,
              email: cleanEmail,
              password: data.password,
            }),
          });
          const parsed = await parseApiResponse<{
            success?: boolean;
            error?: string;
            previewUrl?: string;
            provider?: string;
            verificationSessionToken?: string;
          }>(response);

          if (parsed.unreachable || !parsed.data) {
            return {
              success: false,
              error: mapFirebaseAuthError(fbError?.code, SERVER_UNREACHABLE_MESSAGE),
            };
          }

          const result = parsed.data;
          if (!parsed.ok || !result.success) {
            return {
              success: false,
              error: result.error || 'Registration failed. Please try again.',
            };
          }

          saveVerifySessionToken(cleanEmail, result.verificationSessionToken);
          return {
            success: true,
            previewUrl: result.previewUrl,
            provider: result.provider,
          };
        } catch {
          return {
            success: false,
            error: mapFirebaseAuthError(fbError?.code, SERVER_UNREACHABLE_MESSAGE),
          };
        }
      }

      return {
        success: false,
        error: mapFirebaseAuthError(
          fbError?.code,
          fbError?.message || 'Could not create your account. Please try again.'
        ),
      };
    }
  };

  // 4. Verify Email with 6-digit OTP Code (used when server OTP fallback was issued)
  const verifyEmailWithCode = async (email: string, code: string): Promise<AuthActionResult> => {
    if (!CLIENT_LOGIN_ENABLED) {
      return { success: false, error: 'Client registration is disabled.' };
    }
    if (IS_STATIC_MODE) {
      return {
        success: false,
        error: 'Please open the verification link sent to your email address.',
      };
    }
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
        }),
      });
      const parsed = await parseApiResponse<{
        success?: boolean;
        user?: any;
        userToken?: string;
        error?: string;
      }>(response);

      if (parsed.unreachable || !parsed.data) {
        return { success: false, error: SERVER_UNREACHABLE_MESSAGE };
      }

      const data = parsed.data;
      if (!parsed.ok || !data.success || !data.user) {
        return {
          success: false,
          error: data.error || 'Invalid verification code.',
        };
      }

      clearVerifySessionToken(email);
      hydrateUserSession(data.user, true, undefined, data.userToken);
      return { success: true };
    } catch {
      return { success: false, error: SERVER_UNREACHABLE_MESSAGE };
    }
  };

  // 5. Resend verification email (prefers Firebase auth.currentUser if signed in unverified)
  const resendVerificationEmail = async (email?: string): Promise<AuthActionResult> => {
    if (!AUTH_ENABLED) {
      return { success: false, error: 'Account verification is disabled.' };
    }
    const cleanEmail = email?.trim().toLowerCase();
    const firebaseAuth = await ensureAuthReady();

    if (
      firebaseAuth?.currentUser &&
      !firebaseAuth.currentUser.emailVerified &&
      (!cleanEmail || firebaseAuth.currentUser.email?.toLowerCase() === cleanEmail)
    ) {
      try {
        const { sendEmailVerification } = await import('firebase/auth');
        await sendEmailVerification(firebaseAuth.currentUser);
        return { success: true, provider: 'firebase' };
      } catch (error: any) {
        return {
          success: false,
          error: mapFirebaseAuthError(
            error?.code,
            error?.message || 'Failed to resend verification email.'
          ),
        };
      }
    }

    if (!IS_STATIC_MODE && cleanEmail) {
      try {
        const response = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const parsed = await parseApiResponse<{
          success?: boolean;
          error?: string;
          previewUrl?: string;
          provider?: string;
          verificationSessionToken?: string;
        }>(response);

        if (parsed.unreachable || !parsed.data) {
          return { success: false, error: SERVER_UNREACHABLE_MESSAGE };
        }

        const data = parsed.data;
        if (parsed.ok && data.success) {
          saveVerifySessionToken(cleanEmail, data.verificationSessionToken);
          return {
            success: true,
            previewUrl: data.previewUrl,
            provider: data.provider,
          };
        }
        return { success: false, error: data.error || 'Failed to resend verification email.' };
      } catch {
        return { success: false, error: SERVER_UNREACHABLE_MESSAGE };
      }
    }

    return { success: false, error: 'No email address provided to verify.' };
  };

  // 6. Reload & check if email was verified (checks Firebase user first, then server OTP fallback)
  const checkEmailVerified = async (email?: string): Promise<boolean> => {
    if (!AUTH_ENABLED) return false;
    const cleanEmail = email?.trim().toLowerCase();
    const firebaseAuth = await ensureAuthReady();

    if (
      firebaseAuth?.currentUser &&
      (!cleanEmail || firebaseAuth.currentUser.email?.toLowerCase() === cleanEmail)
    ) {
      try {
        await firebaseAuth.currentUser.reload();
        if (firebaseAuth.currentUser.emailVerified) {
          const fb = firebaseAuth.currentUser;
          await fb.getIdToken(true);
          const [firestoreSynced, syncResult] = await Promise.all([
            syncUserProfileToFirestore(fb, undefined, true),
            syncGoogleUserWithBackend(fb, true),
          ]);
          setFirebaseUser(fb);
          setCurrentUser({
            id: fb.uid,
            name: fb.displayName || fb.email?.split('@')[0] || DEFAULT_MEMBER_NAME,
            email: fb.email || cleanEmail || '',
            photoURL: fb.photoURL || undefined,
            phone: firestoreSynced.phone,
            emailVerified: true,
            role: syncResult.isManagement ? 'management' : 'client',
            createdAt: firestoreSynced.createdAt,
            savedPropertyIds: firestoreSynced.savedPropertyIds,
          });
          return true;
        }
      } catch {
        return false;
      }
    }

    if (!IS_STATIC_MODE && cleanEmail) {
      try {
        const verificationSessionToken = getVerifySessionToken(cleanEmail);
        const response = await fetch('/api/auth/check-verified', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, verificationSessionToken }),
        });
        const parsed = await parseApiResponse<{
          verified?: boolean;
          user?: any;
          userToken?: string;
        }>(response);
        if (parsed.ok && parsed.data?.verified && parsed.data.user) {
          clearVerifySessionToken(cleanEmail);
          hydrateUserSession(parsed.data.user, true, undefined, parsed.data.userToken);
          return true;
        }
      } catch {
        return false;
      }
    }

    return false;
  };

  // 7. Send password reset email (uses Firebase sendPasswordResetEmail with backend fallback)
  const sendPasswordReset = async (email: string): Promise<AuthActionResult> => {
    if (!AUTH_ENABLED) {
      return { success: false, error: 'Password reset is disabled.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    const uniformMessage =
      'If an account exists for that email address, a password reset link has been sent to your inbox.';

    const firebaseAuth = await ensureAuthReady();
    if (firebaseAuth) {
      try {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(firebaseAuth, cleanEmail);
        return {
          success: true,
          provider: 'firebase',
          message: uniformMessage,
        };
      } catch (fbError: any) {
        if (fbError?.code === 'auth/too-many-requests') {
          return {
            success: false,
            error: mapFirebaseAuthError(fbError.code, 'Too many password reset requests.'),
          };
        }
        if (fbError?.code === 'auth/invalid-email') {
          return {
            success: false,
            error: 'Please enter a valid email address.',
          };
        }
      }
    }

    if (!IS_STATIC_MODE) {
      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const parsed = await parseApiResponse<{
          success?: boolean;
          message?: string;
          error?: string;
          previewUrl?: string;
          provider?: string;
        }>(response);

        if (parsed.ok && parsed.data?.success) {
          return {
            success: true,
            message: parsed.data.message || uniformMessage,
            previewUrl: parsed.data.previewUrl,
            provider: parsed.data.provider,
          };
        }
      } catch {
        // Fall through to uniform response
      }
    }

    return {
      success: true,
      provider: 'firebase',
      message: uniformMessage,
    };
  };

  // 8. Complete password reset with 6-digit code (server OTP fallback)
  const confirmPasswordResetWithCode = async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<AuthActionResult> => {
    if (!AUTH_ENABLED) {
      return { success: false, error: 'Password reset is disabled.' };
    }
    if (IS_STATIC_MODE) {
      return {
        success: false,
        error: 'Please use the password reset link sent to your email address.',
      };
    }
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        }),
      });
      const parsed = await parseApiResponse<{ success?: boolean; error?: string }>(response);
      if (parsed.unreachable || !parsed.data) {
        return { success: false, error: SERVER_UNREACHABLE_MESSAGE };
      }
      if (!parsed.ok || !parsed.data.success) {
        return { success: false, error: parsed.data.error || 'Could not reset password.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: SERVER_UNREACHABLE_MESSAGE };
    }
  };

  // 9. Update phone number (persisted in Firestore + localStorage + backend)
  const updateUserPhone = (phone: string) => {
    if (!AUTH_ENABLED || !currentUser) return;
    const cleanPhone = phone.trim().slice(0, 32);
    const updated = { ...currentUser, phone: cleanPhone || undefined };
    setCurrentUser(updated);
    localStorage.setItem(`${USER_PHONE_PREFIX}${currentUser.id}`, cleanPhone);
    if (localStorage.getItem(EMAIL_SESSION_KEY)) {
      localStorage.setItem(EMAIL_SESSION_KEY, JSON.stringify(updated));
    } else if (sessionStorage.getItem(EMAIL_SESSION_KEY)) {
      sessionStorage.setItem(EMAIL_SESSION_KEY, JSON.stringify(updated));
    }

    void (async () => {
      const fbLib = await loadFirebaseLib();
      const activeFbUser = fbLib.getCurrentFirebaseUser();
      if (activeFbUser && activeFbUser.uid === currentUser.id && activeFbUser.emailVerified) {
        const userPath = `users/${activeFbUser.uid}`;
        try {
          const [db, { doc, updateDoc }] = await Promise.all([
            fbLib.getDbAsync(),
            import('firebase/firestore'),
          ]);
          await updateDoc(doc(db, 'users', activeFbUser.uid), {
            phone: cleanPhone,
          });
        } catch (err) {
          try {
            fbLib.handleFirestoreError(err, fbLib.OperationType.UPDATE, userPath);
          } catch {
            // Logged structured Firestore error
          }
        }
      }

      if (!IS_STATIC_MODE) {
        try {
          let token = getStoredToken(USER_TOKEN_KEY);
          if (!token && activeFbUser) {
            token = await activeFbUser.getIdToken();
          }
          if (!token) return;

          await fetch('/api/auth/update-phone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ phone: cleanPhone }),
          });
        } catch {
          // Best-effort sync; local phone update already saved
        }
      }
    })();
  };

  // 10. Logout
  const logout = async () => {
    if (AUTH_ENABLED) {
      try {
        const { getCurrentFirebaseUser } = await loadFirebaseLib();
        const currentFb = getCurrentFirebaseUser();
        if (currentFb) {
          const [firebaseAuth, { signOut }] = await Promise.all([
            ensureAuthReady(),
            import('firebase/auth'),
          ]);
          if (firebaseAuth?.currentUser) {
            await signOut(firebaseAuth);
          }
        }
      } catch (e) {
        console.warn('SignOut error', e);
      }
    }
    localStorage.removeItem(EMAIL_SESSION_KEY);
    sessionStorage.removeItem(EMAIL_SESSION_KEY);
    localStorage.removeItem(MANAGEMENT_TOKEN_KEY);
    sessionStorage.removeItem(MANAGEMENT_TOKEN_KEY);
    localStorage.removeItem(USER_TOKEN_KEY);
    sessionStorage.removeItem(USER_TOKEN_KEY);
    clearVerifySessionToken();
    clearSyncTimestamps();
    setFirebaseMgmtSessionValid(false);
    setManagementToken(null);
    setCurrentUser(null);
  };

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    const verifyMgmtSessionNotExpired = async () => {
      if (
        !IS_STATIC_MODE &&
        managementToken &&
        currentUser?.email &&
        !isManagementTokenValid(managementToken, currentUser.email)
      ) {
        await logout();
        return;
      }
      if (firebaseUser && isVerifiedFirebaseManagementUser(firebaseUser)) {
        const valid = await checkFirebaseMgmtSessionValid(firebaseUser);
        setFirebaseMgmtSessionValid(valid);
        if (!valid && (IS_STATIC_MODE || !isManagementTokenValid(managementToken, firebaseUser.email))) {
          await logout();
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void verifyMgmtSessionNotExpired();
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [managementToken, currentUser?.email, firebaseUser]);

  // 11. Saved properties management (persisted to Firestore for verified users)
  const isPropertySaved = (id: string): boolean => {
    if (!BRAND_CONFIG.features.enableSavedProperties) return false;
    if (currentUser) {
      return currentUser.savedPropertyIds.includes(id);
    }
    return guestSavedIds.includes(id);
  };

  const toggleSaveProperty = (id: string): boolean => {
    if (!BRAND_CONFIG.features.enableSavedProperties) return false;
    if (currentUser) {
      const alreadySaved = currentUser.savedPropertyIds.includes(id);
      const newSavedIds = alreadySaved
        ? currentUser.savedPropertyIds.filter((pId) => pId !== id)
        : [...currentUser.savedPropertyIds, id].slice(0, 100);

      const updatedProfile: UserProfile = {
        ...currentUser,
        savedPropertyIds: newSavedIds,
      };

      setCurrentUser(updatedProfile);
      localStorage.setItem(`${USER_SAVED_PREFIX}${currentUser.id}`, JSON.stringify(newSavedIds));
      if (localStorage.getItem(EMAIL_SESSION_KEY)) {
        localStorage.setItem(EMAIL_SESSION_KEY, JSON.stringify(updatedProfile));
      } else if (sessionStorage.getItem(EMAIL_SESSION_KEY)) {
        sessionStorage.setItem(EMAIL_SESSION_KEY, JSON.stringify(updatedProfile));
      }

      if (AUTH_ENABLED) {
        void loadFirebaseLib()
          .then(async (fbLib) => {
            const activeFbUser = fbLib.getCurrentFirebaseUser();
            if (activeFbUser && activeFbUser.uid === currentUser.id && activeFbUser.emailVerified) {
              const userPath = `users/${activeFbUser.uid}`;
              try {
                const [db, { doc, updateDoc }] = await Promise.all([
                  fbLib.getDbAsync(),
                  import('firebase/firestore'),
                ]);
                await updateDoc(doc(db, 'users', activeFbUser.uid), {
                  savedPropertyIds: newSavedIds,
                });
              } catch (err) {
                try {
                  fbLib.handleFirestoreError(err, fbLib.OperationType.UPDATE, userPath);
                } catch {
                  // Logged structured Firestore error
                }
              }
            }
          })
          .catch(() => {
            // Firebase disabled
          });
      }

      return !alreadySaved;
    } else {
      const alreadySaved = guestSavedIds.includes(id);
      const newSaved = alreadySaved
        ? guestSavedIds.filter((pId) => pId !== id)
        : [...guestSavedIds, id];
      setGuestSavedIds(newSaved);
      localStorage.setItem(GUEST_SAVED_KEY, JSON.stringify(newSaved));
      return !alreadySaved;
    }
  };

  const savedPropertyIds = BRAND_CONFIG.features.enableSavedProperties
    ? currentUser
      ? currentUser.savedPropertyIds
      : guestSavedIds
    : [];
  const isManagement = Boolean(
    currentUser &&
      currentUser.role === 'management' &&
      (IS_STATIC_MODE
        ? isVerifiedFirebaseManagementUser(firebaseUser) && firebaseMgmtSessionValid
        : isManagementTokenValid(managementToken, currentUser.email) ||
          (isVerifiedFirebaseManagementUser(firebaseUser) && firebaseMgmtSessionValid))
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isAuthenticated: !!currentUser,
        isManagement,
        managementToken,
        loading,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        verifyEmailWithCode,
        resendVerificationEmail,
        checkEmailVerified,
        sendPasswordReset,
        confirmPasswordResetWithCode,
        updateUserPhone,
        logout,
        savedPropertyIds,
        toggleSaveProperty,
        isPropertySaved,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
