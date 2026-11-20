import type { FirebaseApp } from 'firebase/app';
import type { AppCheck } from 'firebase/app-check';
import type { Auth, GoogleAuthProvider, User as FirebaseUser } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { BRAND_CONFIG } from '../config/brand.config';

const FIREBASE_ENABLED =
  BRAND_CONFIG.features.enableClientLogin ||
  BRAND_CONFIG.features.enableAdminPanel ||
  BRAND_CONFIG.features.enableEnquiriesDashboard;
const needAuth =
  BRAND_CONFIG.features.enableClientLogin || BRAND_CONFIG.features.enableAdminPanel;
const needStorage = BRAND_CONFIG.features.enableAdminPanel;

const recaptchaSiteKey = String(import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim();
const appCheckDebugToken = String(import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || '').trim();

let appPromise: Promise<FirebaseApp> | null = null;
let appCheckPromise: Promise<AppCheck | null> | null = null;
let appCheckInstance: AppCheck | null = null;
let authPromise: Promise<Auth | null> | null = null;
let authInstance: Auth | null = null;
let googleProviderPromise: Promise<GoogleAuthProvider | null> | null = null;
let dbPromise: Promise<Firestore> | null = null;
let storagePromise: Promise<FirebaseStorage | null> | null = null;
let connectionTested = false;

export async function getFirebaseAppAsync(): Promise<FirebaseApp> {
  if (!FIREBASE_ENABLED) {
    return Promise.reject(new Error('Firebase is disabled by feature flags.'));
  }
  if (!appPromise) {
    appPromise = import('firebase/app').then(({ initializeApp, getApps, getApp }) =>
      getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    );
  }
  return appPromise;
}

export async function initAppCheckAsync(): Promise<AppCheck | null> {
  if (!FIREBASE_ENABLED || typeof window === 'undefined') return null;
  if (appCheckInstance) return appCheckInstance;
  if (!appCheckPromise) {
    appCheckPromise = (async () => {
      if (appCheckDebugToken && typeof self !== 'undefined') {
        (
          self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
        ).FIREBASE_APPCHECK_DEBUG_TOKEN =
          appCheckDebugToken === 'true' ? true : appCheckDebugToken;
      }

      if (!recaptchaSiteKey) {
        return null;
      }

      try {
        const [app, { initializeAppCheck, ReCaptchaV3Provider }] = await Promise.all([
          getFirebaseAppAsync(),
          import('firebase/app-check'),
        ]);
        appCheckInstance = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(recaptchaSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
        return appCheckInstance;
      } catch (err) {
        console.warn('[Firebase App Check] Initialization skipped:', err);
        return null;
      }
    })();
  }
  return appCheckPromise;
}

export function isAppCheckInitialized(): boolean {
  return Boolean(appCheckInstance);
}

export async function getAuthAsync(): Promise<Auth | null> {
  if (!FIREBASE_ENABLED || !needAuth) return null;
  if (authInstance) return authInstance;
  if (!authPromise) {
    authPromise = (async () => {
      const [app, { getAuth }] = await Promise.all([
        getFirebaseAppAsync(),
        import('firebase/auth'),
        initAppCheckAsync(),
      ]);
      authInstance = getAuth(app);
      return authInstance;
    })();
  }
  return authPromise;
}

export function getCurrentFirebaseUser(): FirebaseUser | null {
  if (!FIREBASE_ENABLED || !needAuth) return null;
  return authInstance?.currentUser ?? null;
}

export async function getGoogleProviderAsync(): Promise<GoogleAuthProvider | null> {
  if (!FIREBASE_ENABLED || !needAuth || !BRAND_CONFIG.features.enableGoogleLogin) return null;
  if (!googleProviderPromise) {
    googleProviderPromise = import('firebase/auth').then(({ GoogleAuthProvider }) => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      return provider;
    });
  }
  return googleProviderPromise;
}

export async function getDbAsync(): Promise<Firestore> {
  if (!FIREBASE_ENABLED) {
    return Promise.reject(new Error('Firebase is disabled by feature flags.'));
  }
  if (!dbPromise) {
    dbPromise = (async () => {
      const [app, firestoreMod] = await Promise.all([
        getFirebaseAppAsync(),
        import('firebase/firestore'),
        initAppCheckAsync(),
      ]);

      let firestoreInstance: Firestore;
      try {
        firestoreInstance = firestoreMod.initializeFirestore(
          app,
          {
            localCache: firestoreMod.persistentLocalCache({
              tabManager: firestoreMod.persistentMultipleTabManager(),
            }),
          },
          firebaseConfig.firestoreDatabaseId
        );
      } catch {
        firestoreInstance = firestoreMod.getFirestore(app, firebaseConfig.firestoreDatabaseId);
      }

      if (BRAND_CONFIG.features.enableAdminPanel && !connectionTested && typeof window !== 'undefined') {
        connectionTested = true;
        void firestoreMod
          .getDocFromServer(firestoreMod.doc(firestoreInstance, 'test', 'connection'))
          .catch((error) => {
            if (isFirestoreQuotaError(error)) {
              console.warn(formatFirestoreQuotaMessage(error));
              return;
            }
            if (error instanceof Error && error.message.includes('the client is offline')) {
              console.error('Please check your Firebase configuration.');
            }
          });
      }

      return firestoreInstance;
    })();
  }
  return dbPromise;
}

export async function getStorageLazy(): Promise<FirebaseStorage | null> {
  if (!FIREBASE_ENABLED || !needStorage) return null;
  if (!storagePromise) {
    storagePromise = Promise.all([getFirebaseAppAsync(), import('firebase/storage')]).then(
      ([firebaseApp, { getStorage }]) => getStorage(firebaseApp)
    );
  }
  return storagePromise;
}

export function isFirestoreQuotaError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const msg = error instanceof Error ? error.message : String(error || '');
  return (
    code === 'resource-exhausted' ||
    /resource-exhausted|quota exceeded|free daily read units/i.test(msg)
  );
}

export function formatFirestoreQuotaMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error || '');
  if (/free daily read units/i.test(msg)) {
    const upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;
    return `Firestore daily free-tier read quota exceeded (resets tomorrow). Cached listings remain available. Manage plan: ${upgradeUrl}`;
  }
  return 'Firestore daily quota reached (resets tomorrow). Cached data remains available in your browser.';
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  if (isFirestoreQuotaError(error)) {
    console.warn('Firestore Quota Notice:', formatFirestoreQuotaMessage(error));
  }
  const currentUser = authInstance?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
