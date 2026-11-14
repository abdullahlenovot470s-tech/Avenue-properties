/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { parseApiResponse, SERVER_UNREACHABLE_MESSAGE } from '../lib/http';

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

const GUEST_SAVED_KEY = 'avenue_guest_saved_homes_v3';
const USER_PHONE_PREFIX = 'avenue_user_phone_';
const USER_SAVED_PREFIX = 'avenue_user_saved_';
const EMAIL_SESSION_KEY = 'avenue_email_session_v1';
const MANAGEMENT_TOKEN_KEY = 'avenue_mgmt_token_v1';
const USER_TOKEN_KEY = 'avenue_user_token_v1';

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
      return 'This account has been disabled. Please contact Avenue support.';
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
    const stored = getStoredToken(MANAGEMENT_TOKEN_KEY);
    return isManagementTokenValid(stored) ? stored : null;
  });
  const [loading, setLoading] = useState(true);
  const [guestSavedIds, setGuestSavedIds] = useState<string[]>(() => {
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
    providerOverride?: 'email' | 'google'
  ): Promise<{ phone?: string; savedPropertyIds: string[]; createdAt: string }> => {
    const uid = fbUser.uid;
    const localPhone = localStorage.getItem(`${USER_PHONE_PREFIX}${uid}`) || '';
    let localSaved = readLocalSavedIds(uid);
    if (guestSavedRef.current.length > 0) {
      localSaved = Array.from(new Set([...localSaved, ...guestSavedRef.current])).slice(0, 100);
      localStorage.setItem(`${USER_SAVED_PREFIX}${uid}`, JSON.stringify(localSaved));
      localStorage.removeItem(GUEST_SAVED_KEY);
      setGuestSavedIds([]);
    }

    const fallbackCreatedAt = (fbUser.metadata.creationTime || new Date().toISOString()).slice(0, 64);
    if (!fbUser.emailVerified || !fbUser.email) {
      return {
        phone: localPhone || undefined,
        savedPropertyIds: localSaved,
        createdAt: fallbackCreatedAt,
      };
    }

    const userPath = `users/${uid}`;
    const userRef = doc(db, 'users', uid);
    const provider = providerOverride || resolveFirebaseProvider(fbUser);
    const cleanName = (fbUser.displayName || fbUser.email.split('@')[0] || 'Avenue Member')
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
        handleFirestoreError(err, OperationType.GET, userPath);
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
          handleFirestoreError(err, OperationType.CREATE, userPath);
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
          handleFirestoreError(err, OperationType.UPDATE, userPath);
        }
      }

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

  const syncGoogleUserWithBackend = async (fbUser: FirebaseUser): Promise<{ isManagement: boolean }> => {
    const existingSync = googleSyncInFlightRef.current;
    if (existingSync && existingSync.uid === fbUser.uid) {
      return existingSync.promise;
    }

    const runSync = (async (): Promise<{ isManagement: boolean }> => {
      try {
        const idToken = await fbUser.getIdToken();
        const res = await fetch('/api/auth/google-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ idToken }),
        });
        const parsed = await parseApiResponse<{
          success?: boolean;
          isManagement?: boolean;
          managementToken?: string;
          userToken?: string;
        }>(res);

        if (parsed.ok && parsed.data?.success) {
          if (parsed.data.userToken) {
            storeSessionToken(USER_TOKEN_KEY, parsed.data.userToken, true);
          }

          const mgmtToken = parsed.data.managementToken;
          if (parsed.data.isManagement && mgmtToken && isManagementTokenValid(mgmtToken, fbUser.email)) {
            storeSessionToken(MANAGEMENT_TOKEN_KEY, mgmtToken, true);
            setManagementToken(mgmtToken);
            setCurrentUser((prev) =>
              prev && prev.id === fbUser.uid ? { ...prev, role: 'management' } : prev
            );
            return { isManagement: true };
          }

          storeSessionToken(MANAGEMENT_TOKEN_KEY, undefined, true);
          setManagementToken(null);
          setCurrentUser((prev) =>
            prev && prev.id === fbUser.uid ? { ...prev, role: 'client' } : prev
          );
          return { isManagement: false };
        }
      } catch {
        // Backend sync failed or timed out; fall back to valid cached token for same email if present
      }

      const cachedToken = getStoredToken(MANAGEMENT_TOKEN_KEY);
      if (cachedToken && isManagementTokenValid(cachedToken, fbUser.email)) {
        setManagementToken(cachedToken);
        setCurrentUser((prev) =>
          prev && prev.id === fbUser.uid ? { ...prev, role: 'management' } : prev
        );
        return { isManagement: true };
      }

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

  // Listen to Firebase auth state changes (Google Sign-In or verified Firebase email/password accounts)
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) return;
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

          const storedMgmtToken = getStoredToken(MANAGEMENT_TOKEN_KEY);
          const hasMatchingMgmtToken =
            isGoogle && Boolean(storedMgmtToken && isManagementTokenValid(storedMgmtToken, fbUser.email));

          setManagementToken(hasMatchingMgmtToken ? storedMgmtToken : null);
          setCurrentUser({
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Avenue Member',
            email: fbUser.email || '',
            photoURL: fbUser.photoURL || undefined,
            phone: storedPhone || undefined,
            emailVerified: true,
            role: hasMatchingMgmtToken ? 'management' : 'client',
            createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
            savedPropertyIds: savedIds,
          });

          const firestoreSynced = await syncUserProfileToFirestore(fbUser);
          if (active) {
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

      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // 1. Google Sign-in with popup (no redirect inside iframe)
  const loginWithGoogle = async (): Promise<{
    success: boolean;
    error?: string;
    popupBlocked?: boolean;
    isManagement?: boolean;
  }> => {
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const fbUser = credential.user;

      localStorage.removeItem(EMAIL_SESSION_KEY);
      sessionStorage.removeItem(EMAIL_SESSION_KEY);
      localStorage.removeItem(MANAGEMENT_TOKEN_KEY);
      sessionStorage.removeItem(MANAGEMENT_TOKEN_KEY);
      localStorage.removeItem(USER_TOKEN_KEY);
      sessionStorage.removeItem(USER_TOKEN_KEY);
      setManagementToken(null);

      const firestoreSynced = await syncUserProfileToFirestore(fbUser, 'google');

      setFirebaseUser(fbUser);
      setCurrentUser({
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Avenue Member',
        email: fbUser.email || '',
        photoURL: fbUser.photoURL || undefined,
        phone: firestoreSynced.phone,
        emailVerified: true,
        role: 'client',
        createdAt: firestoreSynced.createdAt,
        savedPropertyIds: firestoreSynced.savedPropertyIds,
      });

      let isMgmt = false;
      if (fbUser.email) {
        const syncResult = await syncGoogleUserWithBackend(fbUser);
        isMgmt = syncResult.isManagement;
      }

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
    const cleanEmail = email.trim().toLowerCase();

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
        try {
          await setPersistence(
            auth,
            rememberMe ? browserLocalPersistence : browserSessionPersistence
          );
          const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
          const fbUser = userCredential.user;
          await fbUser.reload();

          if (!fbUser.emailVerified) {
            return { success: false, unverified: true, provider: 'firebase' };
          }

          await fbUser.getIdToken(true);
          const firestoreSynced = await syncUserProfileToFirestore(fbUser, 'email');
          setFirebaseUser(fbUser);
          setCurrentUser({
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Avenue Member',
            email: fbUser.email || cleanEmail,
            photoURL: fbUser.photoURL || undefined,
            phone: firestoreSynced.phone,
            emailVerified: true,
            role: 'client',
            createdAt: firestoreSynced.createdAt,
            savedPropertyIds: firestoreSynced.savedPropertyIds,
          });

          const syncResult = await syncGoogleUserWithBackend(fbUser);
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

      return {
        success: false,
        error: parsed.data?.error || 'Sign in failed. Please try again.',
      };
    } catch {
      try {
        await setPersistence(
          auth,
          rememberMe ? browserLocalPersistence : browserSessionPersistence
        );
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const fbUser = userCredential.user;
        await fbUser.reload();

        if (!fbUser.emailVerified) {
          return { success: false, unverified: true, provider: 'firebase' };
        }

        await fbUser.getIdToken(true);
        const firestoreSynced = await syncUserProfileToFirestore(fbUser, 'email');
        setFirebaseUser(fbUser);
        setCurrentUser({
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Avenue Member',
          email: fbUser.email || cleanEmail,
          photoURL: fbUser.photoURL || undefined,
          phone: firestoreSynced.phone,
          emailVerified: true,
          role: 'client',
          createdAt: firestoreSynced.createdAt,
          savedPropertyIds: firestoreSynced.savedPropertyIds,
        });
        return { success: true, isManagement: false };
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
    const cleanName = data.name.trim();
    const cleanEmail = data.email.trim().toLowerCase();

    try {
      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
      await updateProfile(credential.user, { displayName: cleanName });
      await sendEmailVerification(credential.user);
      setFirebaseUser(credential.user);

      return {
        success: true,
        provider: 'firebase',
      };
    } catch (fbError: any) {
      // Only fall back to backend email OTP if Email/Password provider is disabled in Firebase Console
      if (fbError?.code === 'auth/operation-not-allowed') {
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

      hydrateUserSession(data.user, true, undefined, data.userToken);
      return { success: true };
    } catch {
      return { success: false, error: SERVER_UNREACHABLE_MESSAGE };
    }
  };

  // 5. Resend verification email (prefers Firebase auth.currentUser if signed in unverified)
  const resendVerificationEmail = async (email?: string): Promise<AuthActionResult> => {
    const cleanEmail = email?.trim().toLowerCase();

    if (
      auth.currentUser &&
      !auth.currentUser.emailVerified &&
      (!cleanEmail || auth.currentUser.email?.toLowerCase() === cleanEmail)
    ) {
      try {
        await sendEmailVerification(auth.currentUser);
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

    if (cleanEmail) {
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
        }>(response);

        if (parsed.unreachable || !parsed.data) {
          return { success: false, error: SERVER_UNREACHABLE_MESSAGE };
        }

        const data = parsed.data;
        if (parsed.ok && data.success) {
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
    const cleanEmail = email?.trim().toLowerCase();

    if (
      auth.currentUser &&
      (!cleanEmail || auth.currentUser.email?.toLowerCase() === cleanEmail)
    ) {
      try {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          const fb = auth.currentUser;
          await fb.getIdToken(true);
          const firestoreSynced = await syncUserProfileToFirestore(fb);
          setFirebaseUser(fb);
          setCurrentUser({
            id: fb.uid,
            name: fb.displayName || fb.email?.split('@')[0] || 'Avenue Member',
            email: fb.email || cleanEmail || '',
            photoURL: fb.photoURL || undefined,
            phone: firestoreSynced.phone,
            emailVerified: true,
            role: 'client',
            createdAt: firestoreSynced.createdAt,
            savedPropertyIds: firestoreSynced.savedPropertyIds,
          });
          await syncGoogleUserWithBackend(fb);
          return true;
        }
      } catch {
        return false;
      }
    }

    if (cleanEmail) {
      try {
        const response = await fetch('/api/auth/check-verified', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const parsed = await parseApiResponse<{
          verified?: boolean;
          user?: any;
          userToken?: string;
        }>(response);
        if (parsed.ok && parsed.data?.verified && parsed.data.user) {
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
    const cleanEmail = email.trim().toLowerCase();
    const uniformMessage =
      'If an account exists for that email address, a password reset link has been sent to your inbox.';

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
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
    if (!currentUser) return;
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
      if (auth.currentUser && auth.currentUser.uid === currentUser.id && auth.currentUser.emailVerified) {
        const userPath = `users/${auth.currentUser.uid}`;
        try {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            phone: cleanPhone,
          });
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.UPDATE, userPath);
          } catch {
            // Logged structured Firestore error
          }
        }
      }

      try {
        let token = getStoredToken(USER_TOKEN_KEY);
        if (!token && auth.currentUser) {
          token = await auth.currentUser.getIdToken();
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
    })();
  };

  // 10. Logout
  const logout = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn('SignOut error', e);
    }
    localStorage.removeItem(EMAIL_SESSION_KEY);
    sessionStorage.removeItem(EMAIL_SESSION_KEY);
    localStorage.removeItem(MANAGEMENT_TOKEN_KEY);
    sessionStorage.removeItem(MANAGEMENT_TOKEN_KEY);
    localStorage.removeItem(USER_TOKEN_KEY);
    sessionStorage.removeItem(USER_TOKEN_KEY);
    setManagementToken(null);
    setCurrentUser(null);
  };

  // 11. Saved properties management (persisted to Firestore for verified users)
  const isPropertySaved = (id: string): boolean => {
    if (currentUser) {
      return currentUser.savedPropertyIds.includes(id);
    }
    return guestSavedIds.includes(id);
  };

  const toggleSaveProperty = (id: string): boolean => {
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

      if (auth.currentUser && auth.currentUser.uid === currentUser.id && auth.currentUser.emailVerified) {
        const userPath = `users/${auth.currentUser.uid}`;
        void updateDoc(doc(db, 'users', auth.currentUser.uid), {
          savedPropertyIds: newSavedIds,
        }).catch((err) => {
          try {
            handleFirestoreError(err, OperationType.UPDATE, userPath);
          } catch {
            // Logged structured Firestore error
          }
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

  const savedPropertyIds = currentUser ? currentUser.savedPropertyIds : guestSavedIds;
  const isManagement = Boolean(
    currentUser &&
      currentUser.role === 'management' &&
      isManagementTokenValid(managementToken)
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
