import { initializeApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  type Firestore,
} from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { BRAND_CONFIG } from '../config/brand.config';

export const app = initializeApp(firebaseConfig);

const needAuth =
  BRAND_CONFIG.features.enableClientLogin || BRAND_CONFIG.features.enableAdminPanel;
const needStorage = BRAND_CONFIG.features.enableAdminPanel;

let appCheckInstance: AppCheck | null = null;
const recaptchaSiteKey = String(import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim();
const appCheckDebugToken = String(import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || '').trim();

if (typeof window !== 'undefined') {
  if (appCheckDebugToken && typeof self !== 'undefined') {
    (
      self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN =
      appCheckDebugToken === 'true' ? true : appCheckDebugToken;
  }

  if (recaptchaSiteKey) {
    try {
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      console.warn('[Firebase App Check] Initialization skipped:', err);
    }
  } else {
    console.info(
      '[Firebase App Check] VITE_RECAPTCHA_SITE_KEY is not set; skipping App Check initialization.'
    );
  }
}

export const appCheck: AppCheck | null = appCheckInstance;
export const auth: Auth | null = needAuth ? getAuth(app) : null;

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db: Firestore = firestoreInstance;

let storagePromise: Promise<FirebaseStorage | null> | null = null;

export async function getStorageLazy(): Promise<FirebaseStorage | null> {
  if (!needStorage) return null;
  if (!storagePromise) {
    storagePromise = Promise.all([import('firebase/storage'), import('./firebase')]).then(
      ([{ getStorage }, { app: firebaseApp }]) => getStorage(firebaseApp)
    );
  }
  return storagePromise;
}
export const googleProvider: GoogleAuthProvider | null =
  needAuth && BRAND_CONFIG.features.enableGoogleLogin
    ? (() => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        return provider;
      })()
    : null;

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
  const currentUser = auth?.currentUser;
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

async function testConnection(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      console.warn(formatFirestoreQuotaMessage(error));
      return;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (BRAND_CONFIG.features.enableAdminPanel) {
  void testConnection();
}
