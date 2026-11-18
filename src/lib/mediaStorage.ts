import { auth, getStorageLazy } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { BRAND_CONFIG } from '../config/brand.config';
import { IS_STATIC_MODE } from './http';

export type MediaProvider = 'cloudinary' | 'firebase';

export interface MediaStorageCapabilities {
  preferredProvider: MediaProvider;
  cloudinaryMode: 'unsigned' | 'signed' | 'none';
  cloudinaryCloudName?: string;
  firebaseBucket: string;
}

export interface UploadedPhotoResult {
  url: string;
  provider: MediaProvider;
  bytes: number;
  originalBytes: number;
}

interface PreparedImageBlob {
  blob: Blob;
  contentType: string;
  extension: string;
  bytes: number;
  originalBytes: number;
}

const CLIENT_CLOUDINARY_CLOUD_NAME = String(
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
).trim();
const CLIENT_CLOUDINARY_UPLOAD_PRESET = String(
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || ''
).trim();
const HAS_CLIENT_CLOUDINARY_ENV = Boolean(
  CLIENT_CLOUDINARY_CLOUD_NAME && CLIENT_CLOUDINARY_UPLOAD_PRESET
);

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_ORIGINAL_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
const FIXED_CLOUDINARY_FOLDER = `${
  BRAND_CONFIG.identity.storageKeyPrefix.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'catalog'
}-catalog`;

const PHOTO_UPLOAD_UNCONFIGURED_MESSAGE =
  'Photo upload is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET, or enable Firebase Storage (requires the Blaze plan).';

const MANAGEMENT_GOOGLE_EMAIL = BRAND_CONFIG.contact.managementGoogleEmail.toLowerCase();

let cachedCapabilities: MediaStorageCapabilities | null = null;
let capabilitiesPromise: Promise<MediaStorageCapabilities> | null = null;

function buildSafeFilename(originalName: string, ext: string): string {
  const base = originalName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${rand}-${base || 'property'}.${ext}`;
}

export async function getMediaStorageCapabilities(
  forceRefresh = false
): Promise<MediaStorageCapabilities> {
  if (!forceRefresh && cachedCapabilities) {
    return cachedCapabilities;
  }
  if (!forceRefresh && capabilitiesPromise) {
    return capabilitiesPromise;
  }

  const task = (async (): Promise<MediaStorageCapabilities> => {
    const firebaseBucket = String(firebaseConfig.storageBucket || '').trim();

    if (CLIENT_CLOUDINARY_CLOUD_NAME && CLIENT_CLOUDINARY_UPLOAD_PRESET) {
      const cap: MediaStorageCapabilities = {
        preferredProvider: 'cloudinary',
        cloudinaryMode: 'unsigned',
        cloudinaryCloudName: CLIENT_CLOUDINARY_CLOUD_NAME,
        firebaseBucket,
      };
      cachedCapabilities = cap;
      return cap;
    }

    if (!IS_STATIC_MODE) {
      try {
        const res = await fetch('/api/media/config');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = (await res.json()) as {
            success?: boolean;
            cloudinary?: {
              configured?: boolean;
              mode?: 'signed' | 'unsigned' | 'none';
              cloudName?: string;
              uploadPreset?: string;
            };
          };
          if (data?.success && data.cloudinary?.configured && data.cloudinary.cloudName) {
            const cap: MediaStorageCapabilities = {
              preferredProvider: 'cloudinary',
              cloudinaryMode: data.cloudinary.mode === 'signed' ? 'signed' : 'unsigned',
              cloudinaryCloudName: data.cloudinary.cloudName,
              firebaseBucket,
            };
            cachedCapabilities = cap;
            return cap;
          }
        }
      } catch {
        // Static hosting or backend offline -> use Firebase Storage
      }
    }

    const fallback: MediaStorageCapabilities = {
      preferredProvider: 'firebase',
      cloudinaryMode: 'none',
      firebaseBucket,
    };
    cachedCapabilities = fallback;
    return fallback;
  })().finally(() => {
    capabilitiesPromise = null;
  });

  capabilitiesPromise = task;
  return task;
}

async function prepareOptimizedImage(file: File): Promise<PreparedImageBlob> {
  const mime = String(file.type || '').toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
    throw new Error(`"${file.name}" must be a JPEG, PNG, or WebP image.`);
  }
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    throw new Error(`"${file.name}" exceeds the 15 MB limit. Please upload a smaller image.`);
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const maxDimension = 1600;
        const largestSide = Math.max(img.width, img.height);
        const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
        const targetWidth = Math.max(1, Math.round(img.width * scale));
        const targetHeight = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve({
            blob: file,
            contentType: file.type || 'image/jpeg',
            extension: file.type.includes('png') ? 'png' : 'jpg',
            bytes: file.size,
            originalBytes: file.size,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        URL.revokeObjectURL(objectUrl);

        canvas.toBlob(
          (webpBlob) => {
            if (webpBlob && webpBlob.size > 0 && webpBlob.type === 'image/webp') {
              resolve({
                blob: webpBlob,
                contentType: 'image/webp',
                extension: 'webp',
                bytes: webpBlob.size,
                originalBytes: file.size,
              });
              return;
            }
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob && jpegBlob.size > 0) {
                  resolve({
                    blob: jpegBlob,
                    contentType: 'image/jpeg',
                    extension: 'jpg',
                    bytes: jpegBlob.size,
                    originalBytes: file.size,
                  });
                } else {
                  reject(new Error(`Could not compress "${file.name}".`));
                }
              },
              'image/jpeg',
              0.84
            );
          },
          'image/webp',
          0.84
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err instanceof Error ? err : new Error('Failed to process image.'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not decode image "${file.name}".`));
    };

    img.src = objectUrl;
  });
}

async function uploadToCloudinaryUnsigned(
  prepared: PreparedImageBlob,
  originalName: string
): Promise<string> {
  const formData = new FormData();
  formData.append(
    'file',
    prepared.blob,
    buildSafeFilename(originalName, prepared.extension)
  );
  formData.append('upload_preset', CLIENT_CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', FIXED_CLOUDINARY_FOLDER);

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    CLIENT_CLOUDINARY_CLOUD_NAME
  )}/image/upload`;
  const res = await fetch(endpoint, { method: 'POST', body: formData });
  const data = (await res.json()) as {
    secure_url?: string;
    error?: { message?: string };
  };
  if (!res.ok || !data.secure_url) {
    throw new Error(
      data.error?.message || 'Cloudinary unsigned upload failed. Verify your upload preset.'
    );
  }
  return data.secure_url;
}

async function uploadToCloudinarySigned(
  prepared: PreparedImageBlob,
  originalName: string,
  managementToken?: string | null
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let fbToken = '';
  if (auth?.currentUser) {
    try {
      fbToken = await auth.currentUser.getIdToken();
    } catch {
      fbToken = '';
    }
  }
  if (managementToken) {
    headers.Authorization = `Bearer ${managementToken}`;
  } else if (fbToken) {
    headers.Authorization = `Bearer ${fbToken}`;
  }
  if (fbToken) {
    headers['X-Firebase-Token'] = fbToken;
  }

  const targetFolder = FIXED_CLOUDINARY_FOLDER;
  const sigRes = await fetch('/api/media/cloudinary-signature', {
    method: 'POST',
    headers,
    body: JSON.stringify({ folder: targetFolder }),
  });
  const sigData = (await sigRes.json()) as {
    success?: boolean;
    error?: string;
    signature?: string;
    timestamp?: number;
    apiKey?: string;
    cloudName?: string;
    folder?: string;
  };
  if (!sigRes.ok || !sigData.success || !sigData.signature || !sigData.cloudName || !sigData.apiKey) {
    throw new Error(sigData.error || 'Could not authorize Cloudinary upload.');
  }

  const formData = new FormData();
  formData.append(
    'file',
    prepared.blob,
    buildSafeFilename(originalName, prepared.extension)
  );
  formData.append('api_key', sigData.apiKey);
  formData.append('timestamp', String(sigData.timestamp));
  formData.append('signature', sigData.signature);
  formData.append('folder', sigData.folder || targetFolder);

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    sigData.cloudName
  )}/image/upload`;
  const uploadRes = await fetch(endpoint, { method: 'POST', body: formData });
  const uploadJson = (await uploadRes.json()) as {
    secure_url?: string;
    error?: { message?: string };
  };
  if (!uploadRes.ok || !uploadJson.secure_url) {
    throw new Error(
      uploadJson.error?.message || 'Cloudinary signed upload failed. Check server credentials.'
    );
  }
  return uploadJson.secure_url;
}

function formatFirebaseStorageError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const message = err instanceof Error ? err.message : String(err || '');

  const isUnavailableOrDenied =
    code === 'storage/unauthorized' ||
    code === 'storage/unauthenticated' ||
    code === 'storage/bucket-not-found' ||
    code === 'storage/project-not-found' ||
    code === 'storage/quota-exceeded' ||
    code === 'storage/unknown' ||
    code === 'storage/retry-limit-exceeded' ||
    /unauthorized|permission|billing|blaze|upgrade|bucket|unavailable|not configured|cors/i.test(
      message
    );

  if (!HAS_CLIENT_CLOUDINARY_ENV && isUnavailableOrDenied) {
    return PHOTO_UPLOAD_UNCONFIGURED_MESSAGE;
  }

  if (code === 'storage/unauthorized' || /unauthorized|permission/i.test(message)) {
    return `Firebase Storage permission denied. Sign in with verified management Google account (${MANAGEMENT_GOOGLE_EMAIL}) and ensure storage.rules are deployed.`;
  }
  if (code === 'storage/bucket-not-found' || code === 'storage/project-not-found') {
    return PHOTO_UPLOAD_UNCONFIGURED_MESSAGE;
  }
  if (code === 'storage/quota-exceeded') {
    return 'Firebase Storage free quota reached. Configure Cloudinary env vars or upgrade your storage plan.';
  }
  if (code === 'storage/retry-limit-exceeded' || /network|cors/i.test(message)) {
    return 'Network or CORS error uploading to Firebase Storage. Check your connection or configure Storage CORS / Cloudinary.';
  }
  return message || 'Could not upload photo to Firebase Storage.';
}

async function uploadToFirebaseStorage(
  prepared: PreparedImageBlob,
  originalName: string,
  folder: string
): Promise<string> {
  const userEmail = String(auth?.currentUser?.email || '').trim().toLowerCase();
  const lazyStorage = await getStorageLazy();
  if (!lazyStorage || !auth?.currentUser || !auth.currentUser.emailVerified || userEmail !== MANAGEMENT_GOOGLE_EMAIL) {
    throw new Error(
      `Firebase Storage uploads require Google Sign-In with ${MANAGEMENT_GOOGLE_EMAIL}. Sign in with Google, or configure Cloudinary for direct preset uploads.`
    );
  }

  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'general';
  const fileName = buildSafeFilename(originalName, prepared.extension);
  const objectPath = `catalog/${safeFolder}/${fileName}`;
  const storageRef = ref(lazyStorage, objectPath);

  try {
    await uploadBytes(storageRef, prepared.blob, {
      contentType: prepared.contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    });
    return await getDownloadURL(storageRef);
  } catch (err) {
    throw new Error(formatFirebaseStorageError(err));
  }
}

export async function uploadPropertyPhoto(
  file: File,
  options: {
    folder: string;
    managementToken?: string | null;
  }
): Promise<UploadedPhotoResult> {
  const prepared = await prepareOptimizedImage(file);
  const capabilities = await getMediaStorageCapabilities();

  if (capabilities.preferredProvider === 'cloudinary') {
    if (capabilities.cloudinaryMode === 'unsigned') {
      const url = await uploadToCloudinaryUnsigned(prepared, file.name);
      return {
        url,
        provider: 'cloudinary',
        bytes: prepared.bytes,
        originalBytes: prepared.originalBytes,
      };
    }
    if (capabilities.cloudinaryMode === 'signed' && !IS_STATIC_MODE) {
      const url = await uploadToCloudinarySigned(
        prepared,
        file.name,
        options.managementToken
      );
      return {
        url,
        provider: 'cloudinary',
        bytes: prepared.bytes,
        originalBytes: prepared.originalBytes,
      };
    }
  }

  const url = await uploadToFirebaseStorage(prepared, file.name, options.folder);
  return {
    url,
    provider: 'firebase',
    bytes: prepared.bytes,
    originalBytes: prepared.originalBytes,
  };
}
