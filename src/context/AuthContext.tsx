/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

interface AuthActionResult {
  success: boolean;
  error?: string;
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
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; popupBlocked?: boolean }>;
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
const MANAGEMENT_ACCOUNT_EMAIL = 'mangament@avenue-properties.come';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [managementToken, setManagementToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(MANAGEMENT_TOKEN_KEY) || sessionStorage.getItem(MANAGEMENT_TOKEN_KEY);
    } catch {
      return null;
    }
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
  useEffect(() => {
    guestSavedRef.current = guestSavedIds;
  }, [guestSavedIds]);

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
    mgmtToken?: string
  ): UserProfile => {
    const storedPhone = localStorage.getItem(`${USER_PHONE_PREFIX}${baseUser.id}`) || '';
    const storedSavedRaw = localStorage.getItem(`${USER_SAVED_PREFIX}${baseUser.id}`);
    let savedIds: string[] = storedSavedRaw ? JSON.parse(storedSavedRaw) : [];

    if (guestSavedRef.current.length > 0) {
      savedIds = Array.from(new Set([...savedIds, ...guestSavedRef.current]));
      localStorage.setItem(`${USER_SAVED_PREFIX}${baseUser.id}`, JSON.stringify(savedIds));
      localStorage.removeItem(GUEST_SAVED_KEY);
      setGuestSavedIds([]);
    }

    const isMgmtAccount =
      baseUser.role === 'management' &&
      baseUser.email.trim().toLowerCase() === MANAGEMENT_ACCOUNT_EMAIL &&
      Boolean(mgmtToken);

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
      if (isMgmtAccount && mgmtToken) {
        localStorage.setItem(MANAGEMENT_TOKEN_KEY, mgmtToken);
        sessionStorage.removeItem(MANAGEMENT_TOKEN_KEY);
      } else {
        localStorage.removeItem(MANAGEMENT_TOKEN_KEY);
        sessionStorage.removeItem(MANAGEMENT_TOKEN_KEY);
      }
    } else {
      sessionStorage.setItem(EMAIL_SESSION_KEY, JSON.stringify(profile));
      localStorage.removeItem(EMAIL_SESSION_KEY);
      if (isMgmtAccount && mgmtToken) {
        sessionStorage.setItem(MANAGEMENT_TOKEN_KEY, mgmtToken);
        localStorage.removeItem(MANAGEMENT_TOKEN_KEY);
      } else {
        localStorage.removeItem(MANAGEMENT_TOKEN_KEY);
        sessionStorage.removeItem(MANAGEMENT_TOKEN_KEY);
      }
    }

    setManagementToken(isMgmtAccount && mgmtToken ? mgmtToken : null);
    setCurrentUser(profile);
    return profile;
  };

  // Listen to Firebase auth state changes (Google Sign-In or verified Firebase accounts)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        const isGoogle = fbUser.providerData.some((p) => p.providerId === 'google.com');
        // Never mark unverified email/password Firebase users as logged in
        if (fbUser.emailVerified || isGoogle) {
          const storedPhone = localStorage.getItem(`${USER_PHONE_PREFIX}${fbUser.uid}`) || '';
          const storedSavedRaw = localStorage.getItem(`${USER_SAVED_PREFIX}${fbUser.uid}`);
          let savedIds: string[] = storedSavedRaw ? JSON.parse(storedSavedRaw) : [];

          if (guestSavedRef.current.length > 0) {
            savedIds = Array.from(new Set([...savedIds, ...guestSavedRef.current]));
            localStorage.setItem(`${USER_SAVED_PREFIX}${fbUser.uid}`, JSON.stringify(savedIds));
            localStorage.removeItem(GUEST_SAVED_KEY);
            setGuestSavedIds([]);
          }

          setCurrentUser({
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Avenue Member',
            email: fbUser.email || '',
            photoURL: fbUser.photoURL || undefined,
            phone: storedPhone || undefined,
            emailVerified: true,
            role: 'client',
            createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
            savedPropertyIds: savedIds,
          });
          setManagementToken(null);

          if (fbUser.email) {
            void fetch('/api/auth/google-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: fbUser.uid,
                name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Avenue Member',
                email: fbUser.email,
                photoURL: fbUser.photoURL || undefined,
              }),
            }).catch(() => {});
          }
        }
      } else {
        // Restore verified email session if present
        const savedEmailSession =
          localStorage.getItem(EMAIL_SESSION_KEY) || sessionStorage.getItem(EMAIL_SESSION_KEY);
        const savedMgmtToken =
          localStorage.getItem(MANAGEMENT_TOKEN_KEY) || sessionStorage.getItem(MANAGEMENT_TOKEN_KEY);

        if (savedEmailSession) {
          try {
            const parsed = JSON.parse(savedEmailSession) as UserProfile;
            if (parsed && parsed.emailVerified) {
              const storedSavedRaw = localStorage.getItem(`${USER_SAVED_PREFIX}${parsed.id}`);
              const storedPhone = localStorage.getItem(`${USER_PHONE_PREFIX}${parsed.id}`) || '';
              const isMgmtSession =
                parsed.role === 'management' &&
                parsed.email?.toLowerCase() === MANAGEMENT_ACCOUNT_EMAIL &&
                Boolean(savedMgmtToken);
              setManagementToken(isMgmtSession && savedMgmtToken ? savedMgmtToken : null);
              setCurrentUser({
                ...parsed,
                role: isMgmtSession ? 'management' : 'client',
                phone: storedPhone || parsed.phone,
                savedPropertyIds: storedSavedRaw
                  ? JSON.parse(storedSavedRaw)
                  : parsed.savedPropertyIds || [],
              });
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

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Google Sign-in with popup (no redirect inside iframe)
  const loginWithGoogle = async (): Promise<{
    success: boolean;
    error?: string;
    popupBlocked?: boolean;
  }> => {
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const fbUser = credential.user;

      // Immediately hydrate currentUser synchronously before navigation to /profile
      // so Protected Route checks don't race against onAuthStateChanged.
      localStorage.removeItem(EMAIL_SESSION_KEY);
      sessionStorage.removeItem(EMAIL_SESSION_KEY);
      localStorage.removeItem(MANAGEMENT_TOKEN_KEY);
      sessionStorage.removeItem(MANAGEMENT_TOKEN_KEY);
      setManagementToken(null);

      const storedPhone = localStorage.getItem(`${USER_PHONE_PREFIX}${fbUser.uid}`) || '';
      const storedSavedRaw = localStorage.getItem(`${USER_SAVED_PREFIX}${fbUser.uid}`);
      let savedIds: string[] = storedSavedRaw ? JSON.parse(storedSavedRaw) : [];

      if (guestSavedRef.current.length > 0) {
        savedIds = Array.from(new Set([...savedIds, ...guestSavedRef.current]));
        localStorage.setItem(`${USER_SAVED_PREFIX}${fbUser.uid}`, JSON.stringify(savedIds));
        localStorage.removeItem(GUEST_SAVED_KEY);
        setGuestSavedIds([]);
      }

      setFirebaseUser(fbUser);
      setCurrentUser({
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Avenue Member',
        email: fbUser.email || '',
        photoURL: fbUser.photoURL || undefined,
        phone: storedPhone || undefined,
        emailVerified: true,
        role: 'client',
        createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
        savedPropertyIds: savedIds,
      });

      if (fbUser.email) {
        void fetch('/api/auth/google-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Avenue Member',
            email: fbUser.email,
            photoURL: fbUser.photoURL || undefined,
          }),
        }).catch(() => {});
      }

      return { success: true };
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

  // 2. Email & Password Login
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
      const data = await response.json();

      if (response.ok && data.success && data.user) {
        const profile = hydrateUserSession(data.user, rememberMe, data.managementToken);
        return { success: true, isManagement: profile.role === 'management' };
      }

      if (response.status === 403 && data.unverified) {
        return { success: false, unverified: true };
      }

      // If account isn't in backend store, optionally check Firebase Email/Password if enabled
      if (response.status === 401) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
          const fbUser = userCredential.user;
          if (!fbUser.emailVerified) {
            return { success: false, unverified: true };
          }
          return { success: true };
        } catch (fbError: any) {
          if (fbError?.code === 'auth/too-many-requests') {
            return {
              success: false,
              error: 'Too many unsuccessful attempts. Please reset your password or try again later.',
            };
          }
          return {
            success: false,
            error: data.error || 'Incorrect email or password. Please verify and try again.',
          };
        }
      }

      return {
        success: false,
        error: data.error || 'Sign in failed. Please try again.',
      };
    } catch {
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    }
  };

  // 3. Signup with Email & Password + Free Email Verification API
  const signupWithEmail = async (data: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthActionResult> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          password: data.password,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
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
        error: 'Could not reach authentication server. Please try again.',
      };
    }
  };

  // 4. Verify Email with 6-digit OTP Code
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
      const data = await response.json();

      if (!response.ok || !data.success || !data.user) {
        return {
          success: false,
          error: data.error || 'Invalid verification code.',
        };
      }

      hydrateUserSession(data.user, true);
      return { success: true };
    } catch {
      return { success: false, error: 'Could not verify code right now. Please try again.' };
    }
  };

  // 5. Resend verification email
  const resendVerificationEmail = async (email?: string): Promise<AuthActionResult> => {
    const cleanEmail = email?.trim().toLowerCase();
    if (cleanEmail) {
      try {
        const response = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          return {
            success: true,
            previewUrl: data.previewUrl,
            provider: data.provider,
          };
        }
        return { success: false, error: data.error || 'Failed to resend verification email.' };
      } catch {
        return { success: false, error: 'Network error while resending email.' };
      }
    }

    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        return { success: true };
      }
      return { success: false, error: 'No email address provided to verify.' };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to resend verification email.' };
    }
  };

  // 6. Reload & check if email was verified (via link click or Firebase)
  const checkEmailVerified = async (email?: string): Promise<boolean> => {
    const cleanEmail = email?.trim().toLowerCase();
    if (cleanEmail) {
      try {
        const response = await fetch('/api/auth/check-verified', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const data = await response.json();
        if (data.verified && data.user) {
          hydrateUserSession(data.user, true);
          return true;
        }
      } catch {
        // Fallback to Firebase check below
      }
    }

    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          const fb = auth.currentUser;
          hydrateUserSession({
            id: fb.uid,
            name: fb.displayName || fb.email?.split('@')[0] || 'Avenue Member',
            email: fb.email || '',
            photoURL: fb.photoURL || undefined,
            emailVerified: true,
            createdAt: fb.metadata.creationTime || new Date().toISOString(),
          });
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  // 7. Send password reset email (OTP code via free email API, with Firebase fallback)
  const sendPasswordReset = async (email: string): Promise<AuthActionResult> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          previewUrl: data.previewUrl,
          provider: data.provider,
        };
      }

      if (response.status === 404) {
        // Check if account exists in Firebase Console auth
        try {
          await sendPasswordResetEmail(auth, cleanEmail);
          return { success: true };
        } catch {
          return { success: false, error: 'No account found with this email address.' };
        }
      }

      return { success: false, error: data.error || 'Could not send reset email.' };
    } catch {
      return { success: false, error: 'Network error while sending password reset email.' };
    }
  };

  // 8. Complete password reset with 6-digit code
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
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Could not reset password.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while resetting password.' };
    }
  };

  // 9. Update phone number (strictly optional on Profile)
  const updateUserPhone = (phone: string) => {
    if (currentUser) {
      const updated = { ...currentUser, phone };
      setCurrentUser(updated);
      localStorage.setItem(`${USER_PHONE_PREFIX}${currentUser.id}`, phone);
      if (localStorage.getItem(EMAIL_SESSION_KEY)) {
        localStorage.setItem(EMAIL_SESSION_KEY, JSON.stringify(updated));
      } else if (sessionStorage.getItem(EMAIL_SESSION_KEY)) {
        sessionStorage.setItem(EMAIL_SESSION_KEY, JSON.stringify(updated));
      }
      if (currentUser.email) {
        void fetch('/api/auth/update-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentUser.email, phone }),
        }).catch(() => {});
      }
    }
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
    setManagementToken(null);
    setCurrentUser(null);
  };

  // 11. Saved properties management
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
        : [...currentUser.savedPropertyIds, id];

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
      currentUser.email.toLowerCase() === MANAGEMENT_ACCOUNT_EMAIL &&
      managementToken
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
