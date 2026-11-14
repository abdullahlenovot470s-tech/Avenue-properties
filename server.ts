import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import type { Transporter, TestAccount } from 'nodemailer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert, applicationDefault, type ServiceAccount } from 'firebase-admin/app';
import { getAuth as getAdminAuth, type Auth as AdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, type Firestore } from 'firebase-admin/firestore';
import { PORTFOLIO_PROJECTS, PROPERTY_LISTINGS } from './src/data/realEstateData.ts';
import { BUY_PROPERTIES, type BuyProperty } from './src/data/buyPropertiesData.ts';
import { RENTAL_LISTINGS } from './src/data/rentalsData.ts';
import type {
  PortfolioProject,
  PropertyListing,
  RentalListing,
  ProjectStatus,
  BuyStatus,
  RentStatus,
} from './src/types/index.ts';
import { BRAND_CONFIG } from './src/config/brand.config.ts';
import { resolveBrandImagePath } from './src/data/legacyImageMap.ts';

const PORT = Number(process.env.PORT) || 3000;
const MANAGEMENT_EMAIL = (process.env.MANAGEMENT_EMAIL || '').trim().toLowerCase();
const MANAGEMENT_PASSWORD = process.env.MANAGEMENT_PASSWORD || '';
const DEFAULT_MANAGEMENT_GOOGLE_EMAIL = BRAND_CONFIG.contact.managementGoogleEmail.toLowerCase();
const MANAGEMENT_GOOGLE_EMAILS = new Set(
  [
    DEFAULT_MANAGEMENT_GOOGLE_EMAIL,
    MANAGEMENT_EMAIL,
    ...String(process.env.MANAGEMENT_GOOGLE_EMAILS || '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase()),
  ].filter(Boolean)
);

function isManagementEmail(email: string): boolean {
  const clean = email.trim().toLowerCase();
  if (!clean) return false;
  return (Boolean(MANAGEMENT_EMAIL) && clean === MANAGEMENT_EMAIL) || MANAGEMENT_GOOGLE_EMAILS.has(clean);
}

const ENV_TOKEN_SECRET = (process.env.MANAGEMENT_TOKEN_SECRET || '').trim();
const TOKEN_SECRET = ENV_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

if (!ENV_TOKEN_SECRET) {
  console.warn(
    '[Security] MANAGEMENT_TOKEN_SECRET is not set; using an ephemeral per-process secret (sessions will reset on restart).'
  );
}

const MANAGEMENT_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const USER_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_AUTH_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

interface FirebaseAppletConfig {
  projectId?: string;
  apiKey?: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseAppletConfig(): FirebaseAppletConfig {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as FirebaseAppletConfig;
    }
  } catch (err) {
    console.warn('[Firebase] Could not read firebase-applet-config.json:', err);
  }
  return {};
}

const firebaseAppletConfig = loadFirebaseAppletConfig();

// Initialize Firebase Admin SDK + Firestore (replaces /tmp JSON persistence)
let firestoreDb: Firestore | null = null;
let adminAuthInstance: AdminAuth | null = null;

function validateServiceAccountObject(obj: unknown): ServiceAccount | null {
  if (typeof obj !== 'object' || obj === null) return null;
  const candidate = obj as Record<string, unknown>;
  const projectId =
    typeof candidate.project_id === 'string'
      ? candidate.project_id.trim()
      : typeof candidate.projectId === 'string'
        ? candidate.projectId.trim()
        : '';
  const privateKey =
    typeof candidate.private_key === 'string'
      ? candidate.private_key.trim()
      : typeof candidate.privateKey === 'string'
        ? candidate.privateKey.trim()
        : '';
  const clientEmail =
    typeof candidate.client_email === 'string'
      ? candidate.client_email.trim()
      : typeof candidate.clientEmail === 'string'
        ? candidate.clientEmail.trim()
        : '';

  if (!projectId || !privateKey || !clientEmail) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

function parseServiceAccountConfig(raw: string): ServiceAccount | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Raw JSON object
  if (trimmed.startsWith('{')) {
    try {
      const parsed = validateServiceAccountObject(JSON.parse(trimmed));
      if (parsed) return parsed;
    } catch {
      // Fall through to warning
    }
  }

  // 2. Path to a service account JSON file on disk
  try {
    if (trimmed.length < 512 && fs.existsSync(trimmed) && fs.statSync(trimmed).isFile()) {
      const fileContent = fs.readFileSync(trimmed, 'utf-8');
      const parsed = validateServiceAccountObject(JSON.parse(fileContent));
      if (parsed) return parsed;
    }
  } catch {
    // Fall through
  }

  // 3. Base64-encoded service account JSON
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 20) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf-8').trim();
      if (decoded.startsWith('{')) {
        const parsed = validateServiceAccountObject(JSON.parse(decoded));
        if (parsed) return parsed;
      }
    } catch {
      // Fall through
    }
  }

  console.warn(
    '[Persistence] FIREBASE_SERVICE_ACCOUNT_JSON is set but is not a valid Firebase service account JSON object (use FIRESTORE_DATABASE_ID for database IDs). Using ephemeral in-memory store.'
  );
  return null;
}

function initFirebaseAdmin(): void {
  const serviceAccountRaw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  const credentialsPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  const useAdc = process.env.FIREBASE_USE_ADC === 'true';

  const serviceAccount = parseServiceAccountConfig(serviceAccountRaw);
  const hasValidCredentialsFile = Boolean(
    credentialsPath && fs.existsSync(credentialsPath) && fs.statSync(credentialsPath).isFile()
  );

  if (credentialsPath && !hasValidCredentialsFile) {
    console.warn('[Persistence] GOOGLE_APPLICATION_CREDENTIALS path does not exist on disk; ignoring.');
  }

  if (!serviceAccount && !hasValidCredentialsFile && !useAdc) {
    if (!serviceAccountRaw) {
      console.warn(
        '[Persistence] Firestore admin credentials not configured (set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS). Using ephemeral in-memory store.'
      );
    }
    return;
  }

  try {
    let app = getAdminApps()[0];
    if (!app) {
      if (serviceAccount) {
        app = initializeAdminApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.projectId || firebaseAppletConfig.projectId,
        });
      } else {
        app = initializeAdminApp({
          credential: applicationDefault(),
          projectId: firebaseAppletConfig.projectId,
        });
      }
    }

    const databaseId =
      (process.env.FIRESTORE_DATABASE_ID || '').trim() ||
      firebaseAppletConfig.firestoreDatabaseId ||
      '(default)';

    firestoreDb = getAdminFirestore(app, databaseId);
    firestoreDb.settings({ ignoreUndefinedProperties: true });
    adminAuthInstance = getAdminAuth(app);
    console.log(`[Persistence] Connected to Firestore database "${databaseId}".`);
  } catch (err) {
    console.warn(
      '[Persistence] Could not initialize Firebase Admin SDK; falling back to in-memory store:',
      err instanceof Error ? err.message : String(err)
    );
    firestoreDb = null;
    adminAuthInstance = null;
  }
}

initFirebaseAdmin();

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  emailVerified: boolean;
  provider?: 'email' | 'google';
  photoURL?: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
  verifyCode?: string;
  verifyToken?: string;
  verifyExpiresAt?: number;
  verifyAttempts?: number;
  resetCode?: string;
  resetExpiresAt?: number;
  resetAttempts?: number;
}

interface ContactInquiryRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  office: string;
  subject: string;
  message: string;
  source: string;
  propertyTitle?: string;
  preferredDate?: string;
  timeframe?: string;
  status: 'new' | 'contacted' | 'resolved';
  createdAt: string;
}

type CityCategory = string;

interface CatalogStore {
  projects: PortfolioProject[];
  listings: PropertyListing[];
  buy: BuyProperty[];
  rent: RentalListing[];
}

const VALID_CITIES: CityCategory[] = [...BRAND_CONFIG.locale.mainCities];

function normalizeCity(city: string): CityCategory {
  return VALID_CITIES.includes(city) ? city : BRAND_CONFIG.locale.defaultCity;
}

function getDefaultCatalog(): CatalogStore {
  return {
    projects: JSON.parse(JSON.stringify(PORTFOLIO_PROJECTS)),
    listings: JSON.parse(JSON.stringify(PROPERTY_LISTINGS)),
    buy: JSON.parse(JSON.stringify(BUY_PROPERTIES)),
    rent: JSON.parse(JSON.stringify(RENTAL_LISTINGS)),
  };
}

const LEGACY_REPLACEMENTS: Record<string, string> = {
  'photo-1600607687644-c7171b42498b': 'photo-1600585154340-be6161a56a0c',
  'photo-1502005229762-ee1b2b93e083': 'photo-1600210492486-724fe5c67fb0',
  'photo-1508873696983-2df5703bc20d': 'photo-1512917774080-9991f1c4c750',
  'photo-1540518614846-7ede433c4550': 'photo-1616486338812-3dadae4b4ace',
};

function normalizeStockImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/stock/')) {
    return resolveBrandImagePath(url, BRAND_CONFIG.images.fallbackVilla);
  }
  const match = url.match(/^https:\/\/images\.unsplash\.com\/(photo-[^?\s'"]+)/);
  if (match) {
    const mapped = LEGACY_REPLACEMENTS[match[1]] || match[1];
    return resolveBrandImagePath(`/stock/${mapped}.jpg`, BRAND_CONFIG.images.fallbackVilla);
  }
  return url;
}

function normalizeCatalogImages(store: CatalogStore): CatalogStore {
  return {
    projects: store.projects.map((p) => ({
      ...p,
      image: normalizeStockImageUrl(p.image),
      gallery: Array.isArray(p.gallery) ? p.gallery.map(normalizeStockImageUrl) : p.gallery,
    })),
    listings: store.listings.map((l) => ({
      ...l,
      exteriorImage: normalizeStockImageUrl(l.exteriorImage),
      interiorImages: Array.isArray(l.interiorImages)
        ? l.interiorImages.map(normalizeStockImageUrl)
        : l.interiorImages,
    })),
    buy: store.buy.map((b) => ({
      ...b,
      image: normalizeStockImageUrl(b.image),
      gallery: Array.isArray(b.gallery) ? b.gallery.map(normalizeStockImageUrl) : b.gallery,
    })),
    rent: store.rent.map((r) => ({
      ...r,
      image: normalizeStockImageUrl(r.image),
      gallery: Array.isArray(r.gallery) ? r.gallery.map(normalizeStockImageUrl) : r.gallery,
    })),
  };
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

function emailDocId(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

// Ephemeral in-memory fallback store (only used when Firestore Admin credentials are unavailable)
const memoryUsersByEmail = new Map<string, StoredUser>();
let memoryInquiries: ContactInquiryRecord[] = [];
let memoryCatalog: CatalogStore = normalizeCatalogImages(getDefaultCatalog());
let catalogSeedPromise: Promise<void> | null = null;

async function seedCatalogSection(
  db: Firestore,
  collectionName: string,
  items: Array<{ id: string }>
): Promise<void> {
  const baseOrder = Date.now();
  const batch = db.batch();
  items.forEach((item, index) => {
    const ref = db.collection(collectionName).doc(item.id);
    batch.set(ref, {
      ...stripUndefined(item as unknown as Record<string, unknown>),
      _sortOrder: baseOrder - index,
    });
  });
  await batch.commit();
}

async function ensureCatalogSeeded(): Promise<void> {
  if (!firestoreDb) return;
  if (catalogSeedPromise) return catalogSeedPromise;

  catalogSeedPromise = (async () => {
    const db = firestoreDb!;
    const metaRef = db.collection('catalog_meta').doc('state');
    const metaSnap = await metaRef.get();
    if (metaSnap.exists) return;

    const defaults = normalizeCatalogImages(getDefaultCatalog());
    await seedCatalogSection(db, 'catalog_projects', defaults.projects);
    await seedCatalogSection(db, 'catalog_listings', defaults.listings);
    await seedCatalogSection(db, 'catalog_buy', defaults.buy);
    await seedCatalogSection(db, 'catalog_rent', defaults.rent);
    await metaRef.set({ seeded: true, seededAt: new Date().toISOString() });
  })().catch((err) => {
    catalogSeedPromise = null;
    throw err;
  });

  return catalogSeedPromise;
}

async function readOrderedCollection<T extends { id: string }>(
  db: Firestore,
  collectionName: string
): Promise<T[]> {
  const snap = await db.collection(collectionName).orderBy('_sortOrder', 'desc').get();
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const { _sortOrder: _ignored, ...rest } = data;
    return rest as unknown as T;
  });
}

// Unified Persistence Helpers (Firestore when configured, in-memory fallback otherwise)
async function getUserByEmail(email: string): Promise<StoredUser | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  if (!firestoreDb) {
    return memoryUsersByEmail.get(clean) || null;
  }
  const snap = await firestoreDb.collection('auth_users').doc(emailDocId(clean)).get();
  if (!snap.exists) return null;
  return snap.data() as StoredUser;
}

async function saveUser(user: StoredUser): Promise<void> {
  const normalized: StoredUser = { ...user, email: user.email.trim().toLowerCase() };
  if (!firestoreDb) {
    memoryUsersByEmail.set(normalized.email, normalized);
    return;
  }
  await firestoreDb
    .collection('auth_users')
    .doc(emailDocId(normalized.email))
    .set(stripUndefined(normalized as unknown as Record<string, unknown>));
}

async function listUsers(): Promise<StoredUser[]> {
  if (!firestoreDb) {
    return Array.from(memoryUsersByEmail.values());
  }
  const snap = await firestoreDb.collection('auth_users').get();
  return snap.docs.map((d) => d.data() as StoredUser);
}

async function deleteUserById(id: string): Promise<boolean> {
  if (!firestoreDb) {
    for (const [key, user] of memoryUsersByEmail.entries()) {
      if (user.id === id) {
        memoryUsersByEmail.delete(key);
        return true;
      }
    }
    return false;
  }
  const snap = await firestoreDb.collection('auth_users').where('id', '==', id).limit(1).get();
  if (snap.empty) return false;
  await snap.docs[0].ref.delete();
  return true;
}

async function listInquiries(): Promise<ContactInquiryRecord[]> {
  if (!firestoreDb) {
    return [...memoryInquiries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  const snap = await firestoreDb.collection('inquiries').orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => d.data() as ContactInquiryRecord);
}

async function createInquiry(record: ContactInquiryRecord): Promise<void> {
  if (!firestoreDb) {
    memoryInquiries = [record, ...memoryInquiries];
    return;
  }
  await firestoreDb
    .collection('inquiries')
    .doc(record.id)
    .set(stripUndefined(record as unknown as Record<string, unknown>));
}

async function updateInquiryStatus(
  id: string,
  status: ContactInquiryRecord['status']
): Promise<ContactInquiryRecord | null> {
  if (!firestoreDb) {
    const idx = memoryInquiries.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    memoryInquiries[idx] = { ...memoryInquiries[idx], status };
    return memoryInquiries[idx];
  }
  const ref = firestoreDb.collection('inquiries').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.update({ status });
  const updated = { ...(snap.data() as ContactInquiryRecord), status };
  return updated;
}

async function deleteInquiry(id: string): Promise<boolean> {
  if (!firestoreDb) {
    const before = memoryInquiries.length;
    memoryInquiries = memoryInquiries.filter((item) => item.id !== id);
    return memoryInquiries.length !== before;
  }
  const ref = firestoreDb.collection('inquiries').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

async function getCatalog(): Promise<CatalogStore> {
  if (!firestoreDb) {
    return memoryCatalog;
  }
  await ensureCatalogSeeded();
  const [projects, listings, buy, rent] = await Promise.all([
    readOrderedCollection<PortfolioProject>(firestoreDb, 'catalog_projects'),
    readOrderedCollection<PropertyListing>(firestoreDb, 'catalog_listings'),
    readOrderedCollection<BuyProperty>(firestoreDb, 'catalog_buy'),
    readOrderedCollection<RentalListing>(firestoreDb, 'catalog_rent'),
  ]);
  return normalizeCatalogImages({ projects, listings, buy, rent });
}

async function clearCollection(db: Firestore, collectionName: string): Promise<void> {
  const snap = await db.collection(collectionName).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}

async function addCatalogProject(item: PortfolioProject): Promise<CatalogStore> {
  if (!firestoreDb) {
    memoryCatalog = { ...memoryCatalog, projects: [item, ...memoryCatalog.projects] };
    return memoryCatalog;
  }
  await ensureCatalogSeeded();
  await firestoreDb
    .collection('catalog_projects')
    .doc(item.id)
    .set({
      ...stripUndefined(item as unknown as Record<string, unknown>),
      _sortOrder: Date.now(),
    });
  return getCatalog();
}

async function removeCatalogProject(id: string): Promise<{ removed: boolean; catalog: CatalogStore }> {
  if (!firestoreDb) {
    const before = memoryCatalog.projects.length + memoryCatalog.listings.length;
    memoryCatalog = {
      ...memoryCatalog,
      projects: memoryCatalog.projects.filter((p) => p.id !== id),
      listings: memoryCatalog.listings.filter((l) => l.id !== id),
    };
    const after = memoryCatalog.projects.length + memoryCatalog.listings.length;
    return { removed: before !== after, catalog: memoryCatalog };
  }
  await ensureCatalogSeeded();
  const projRef = firestoreDb.collection('catalog_projects').doc(id);
  const listRef = firestoreDb.collection('catalog_listings').doc(id);
  const [projSnap, listSnap] = await Promise.all([projRef.get(), listRef.get()]);
  if (!projSnap.exists && !listSnap.exists) {
    return { removed: false, catalog: await getCatalog() };
  }
  const ops: Promise<unknown>[] = [];
  if (projSnap.exists) ops.push(projRef.delete());
  if (listSnap.exists) ops.push(listRef.delete());
  await Promise.all(ops);
  return { removed: true, catalog: await getCatalog() };
}

async function addCatalogBuy(item: BuyProperty): Promise<CatalogStore> {
  if (!firestoreDb) {
    memoryCatalog = { ...memoryCatalog, buy: [item, ...memoryCatalog.buy] };
    return memoryCatalog;
  }
  await ensureCatalogSeeded();
  await firestoreDb
    .collection('catalog_buy')
    .doc(item.id)
    .set({
      ...stripUndefined(item as unknown as Record<string, unknown>),
      _sortOrder: Date.now(),
    });
  return getCatalog();
}

async function removeCatalogBuy(id: string): Promise<{ removed: boolean; catalog: CatalogStore }> {
  if (!firestoreDb) {
    const before = memoryCatalog.buy.length;
    memoryCatalog = {
      ...memoryCatalog,
      buy: memoryCatalog.buy.filter((item) => item.id !== id),
    };
    return { removed: memoryCatalog.buy.length !== before, catalog: memoryCatalog };
  }
  await ensureCatalogSeeded();
  const ref = firestoreDb.collection('catalog_buy').doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return { removed: false, catalog: await getCatalog() };
  }
  await ref.delete();
  return { removed: true, catalog: await getCatalog() };
}

async function addCatalogRent(item: RentalListing): Promise<CatalogStore> {
  if (!firestoreDb) {
    memoryCatalog = { ...memoryCatalog, rent: [item, ...memoryCatalog.rent] };
    return memoryCatalog;
  }
  await ensureCatalogSeeded();
  await firestoreDb
    .collection('catalog_rent')
    .doc(item.id)
    .set({
      ...stripUndefined(item as unknown as Record<string, unknown>),
      _sortOrder: Date.now(),
    });
  return getCatalog();
}

async function removeCatalogRent(id: string): Promise<{ removed: boolean; catalog: CatalogStore }> {
  if (!firestoreDb) {
    const before = memoryCatalog.rent.length;
    memoryCatalog = {
      ...memoryCatalog,
      rent: memoryCatalog.rent.filter((item) => item.id !== id),
    };
    return { removed: memoryCatalog.rent.length !== before, catalog: memoryCatalog };
  }
  await ensureCatalogSeeded();
  const ref = firestoreDb.collection('catalog_rent').doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return { removed: false, catalog: await getCatalog() };
  }
  await ref.delete();
  return { removed: true, catalog: await getCatalog() };
}

function mapProjectToPropertyListing(
  existing: PropertyListing,
  item: PortfolioProject
): PropertyListing {
  const parsedYear = Number(item.projectDelivered);
  return {
    ...existing,
    id: existing.id,
    name: item.title,
    location: item.location,
    price: item.valuation,
    numericPrice: item.numericValuation ?? existing.numericPrice,
    beds: item.beds,
    baths: item.baths,
    sqft: item.size,
    category: item.category,
    description: item.summary,
    exteriorImage: item.gallery[0] || item.image,
    interiorImages: item.gallery.slice(1),
    yearBuilt: Number.isFinite(parsedYear) && parsedYear > 1900 ? parsedYear : existing.yearBuilt,
    architect: item.architect,
    status: item.status,
  };
}

async function updateCatalogProject(
  id: string,
  item: PortfolioProject
): Promise<{ updated: boolean; catalog: CatalogStore }> {
  if (!firestoreDb) {
    const idx = memoryCatalog.projects.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const nextProjects = [...memoryCatalog.projects];
      nextProjects[idx] = item;
      memoryCatalog = { ...memoryCatalog, projects: nextProjects };
      return { updated: true, catalog: memoryCatalog };
    }
    const listingIdx = memoryCatalog.listings.findIndex((l) => l.id === id);
    if (listingIdx === -1) {
      return { updated: false, catalog: memoryCatalog };
    }
    const nextListings = [...memoryCatalog.listings];
    nextListings[listingIdx] = mapProjectToPropertyListing(nextListings[listingIdx], item);
    memoryCatalog = { ...memoryCatalog, listings: nextListings };
    return { updated: true, catalog: memoryCatalog };
  }
  await ensureCatalogSeeded();
  const ref = firestoreDb.collection('catalog_projects').doc(id);
  const snap = await ref.get();
  if (snap.exists) {
    const existingData = snap.data() as Record<string, unknown>;
    const sortOrder = typeof existingData._sortOrder === 'number' ? existingData._sortOrder : Date.now();
    await ref.set({
      ...stripUndefined(item as unknown as Record<string, unknown>),
      _sortOrder: sortOrder,
    });
    return { updated: true, catalog: await getCatalog() };
  }
  const listingRef = firestoreDb.collection('catalog_listings').doc(id);
  const listingSnap = await listingRef.get();
  if (!listingSnap.exists) {
    return { updated: false, catalog: await getCatalog() };
  }
  const existingListingData = listingSnap.data() as PropertyListing & { _sortOrder?: number };
  const sortOrder =
    typeof existingListingData._sortOrder === 'number' ? existingListingData._sortOrder : Date.now();
  const updatedListing = mapProjectToPropertyListing(existingListingData, item);
  await listingRef.set({
    ...stripUndefined(updatedListing as unknown as Record<string, unknown>),
    _sortOrder: sortOrder,
  });
  return { updated: true, catalog: await getCatalog() };
}

async function updateCatalogBuy(
  id: string,
  item: BuyProperty
): Promise<{ updated: boolean; catalog: CatalogStore }> {
  if (!firestoreDb) {
    const idx = memoryCatalog.buy.findIndex((b) => b.id === id);
    if (idx === -1) {
      return { updated: false, catalog: memoryCatalog };
    }
    const nextBuy = [...memoryCatalog.buy];
    nextBuy[idx] = item;
    memoryCatalog = { ...memoryCatalog, buy: nextBuy };
    return { updated: true, catalog: memoryCatalog };
  }
  await ensureCatalogSeeded();
  const ref = firestoreDb.collection('catalog_buy').doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return { updated: false, catalog: await getCatalog() };
  }
  const existingData = snap.data() as Record<string, unknown>;
  const sortOrder = typeof existingData._sortOrder === 'number' ? existingData._sortOrder : Date.now();
  await ref.set({
    ...stripUndefined(item as unknown as Record<string, unknown>),
    _sortOrder: sortOrder,
  });
  return { updated: true, catalog: await getCatalog() };
}

async function updateCatalogRent(
  id: string,
  item: RentalListing
): Promise<{ updated: boolean; catalog: CatalogStore }> {
  if (!firestoreDb) {
    const idx = memoryCatalog.rent.findIndex((r) => r.id === id);
    if (idx === -1) {
      return { updated: false, catalog: memoryCatalog };
    }
    const nextRent = [...memoryCatalog.rent];
    nextRent[idx] = item;
    memoryCatalog = { ...memoryCatalog, rent: nextRent };
    return { updated: true, catalog: memoryCatalog };
  }
  await ensureCatalogSeeded();
  const ref = firestoreDb.collection('catalog_rent').doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return { updated: false, catalog: await getCatalog() };
  }
  const existingData = snap.data() as Record<string, unknown>;
  const sortOrder = typeof existingData._sortOrder === 'number' ? existingData._sortOrder : Date.now();
  await ref.set({
    ...stripUndefined(item as unknown as Record<string, unknown>),
    _sortOrder: sortOrder,
  });
  return { updated: true, catalog: await getCatalog() };
}

async function resetCatalogSection(section: string): Promise<CatalogStore> {
  const defaults = normalizeCatalogImages(getDefaultCatalog());
  if (!firestoreDb) {
    if (section === 'projects') {
      memoryCatalog = { ...memoryCatalog, projects: defaults.projects, listings: defaults.listings };
    } else if (section === 'buy') {
      memoryCatalog = { ...memoryCatalog, buy: defaults.buy };
    } else if (section === 'rent') {
      memoryCatalog = { ...memoryCatalog, rent: defaults.rent };
    } else {
      memoryCatalog = defaults;
    }
    return memoryCatalog;
  }

  const db = firestoreDb;
  if (section === 'projects') {
    await Promise.all([clearCollection(db, 'catalog_projects'), clearCollection(db, 'catalog_listings')]);
    await Promise.all([
      seedCatalogSection(db, 'catalog_projects', defaults.projects),
      seedCatalogSection(db, 'catalog_listings', defaults.listings),
    ]);
  } else if (section === 'buy') {
    await clearCollection(db, 'catalog_buy');
    await seedCatalogSection(db, 'catalog_buy', defaults.buy);
  } else if (section === 'rent') {
    await clearCollection(db, 'catalog_rent');
    await seedCatalogSection(db, 'catalog_rent', defaults.rent);
  } else {
    await Promise.all([
      clearCollection(db, 'catalog_projects'),
      clearCollection(db, 'catalog_listings'),
      clearCollection(db, 'catalog_buy'),
      clearCollection(db, 'catalog_rent'),
    ]);
    await Promise.all([
      seedCatalogSection(db, 'catalog_projects', defaults.projects),
      seedCatalogSection(db, 'catalog_listings', defaults.listings),
      seedCatalogSection(db, 'catalog_buy', defaults.buy),
      seedCatalogSection(db, 'catalog_rent', defaults.rent),
    ]);
  }
  await db.collection('catalog_meta').doc('state').set({ seeded: true, seededAt: new Date().toISOString() });
  return getCatalog();
}

// Crypto & Token Helpers
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const computed = hashPassword(password, salt);
  const bufA = Buffer.from(computed, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

function sanitizeUser(u: StoredUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    provider: u.provider || 'email',
    photoURL: u.photoURL,
    phone: u.phone,
    role: 'client' as const,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

function signHmacPayload(payloadObj: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyHmacPayload<T extends Record<string, unknown>>(token: string): T | null {
  if (!token || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as T;
    if (typeof decoded.exp !== 'number' || Date.now() > decoded.exp) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function createManagementToken(email: string): string {
  const now = Date.now();
  return signHmacPayload({
    email: email.toLowerCase(),
    role: 'management',
    iat: now,
    exp: now + MANAGEMENT_TOKEN_TTL_MS,
  });
}

function verifyManagementToken(token: string): boolean {
  const decoded = verifyHmacPayload<{ email?: string; role?: string; exp?: number }>(token);
  if (!decoded || typeof decoded.email !== 'string') return false;
  return isManagementEmail(decoded.email) && decoded.role === 'management';
}

function createUserToken(user: { id: string; email: string }): string {
  const now = Date.now();
  return signHmacPayload({
    uid: user.id,
    email: user.email.toLowerCase(),
    role: 'client',
    iat: now,
    exp: now + USER_TOKEN_TTL_MS,
  });
}

function verifyUserToken(token: string): { uid: string; email: string } | null {
  const decoded = verifyHmacPayload<{ uid?: string; email?: string; role?: string; exp?: number }>(token);
  if (!decoded || decoded.role !== 'client' || !decoded.uid || !decoded.email) return null;
  return { uid: decoded.uid, email: decoded.email.toLowerCase() };
}

function extractBearerToken(req: Request): string {
  const authHeader = String(req.headers.authorization || '');
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

async function requireManagement(req: Request, res: Response, next: NextFunction) {
  const bearerToken = extractBearerToken(req);
  const firebaseHeaderToken = String(req.headers['x-firebase-token'] || '').trim();
  const candidateToken = bearerToken || firebaseHeaderToken;

  if (!candidateToken) {
    return res.status(401).json({
      success: false,
      error: 'Management authentication required. Please sign in again.',
    });
  }

  if (verifyManagementToken(candidateToken)) {
    return next();
  }

  // Fallback for multi-instance restarts or fresh sessions: verify a 3-part Firebase ID token
  const jwtCandidate =
    firebaseHeaderToken || (candidateToken.split('.').length === 3 ? candidateToken : '');
  if (jwtCandidate) {
    const verified = await verifyFirebaseIdToken(jwtCandidate);
    if (verified && verified.emailVerified && isManagementEmail(verified.email)) {
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Management session expired or invalid. Please sign in again.',
  });
}

interface VerifiedFirebaseIdentity {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  emailVerified: boolean;
  signInProvider?: string;
}

const GOOGLE_SECURETOKEN_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cachedGoogleCerts: Record<string, string> = {};
let cachedGoogleCertsExpiresAt = 0;

async function getGoogleSecureTokenCerts(forceRefresh = false): Promise<Record<string, string>> {
  if (!forceRefresh && cachedGoogleCertsExpiresAt > Date.now() && Object.keys(cachedGoogleCerts).length > 0) {
    return cachedGoogleCerts;
  }
  const res = await fetch(GOOGLE_SECURETOKEN_CERTS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Google X.509 certs (${res.status})`);
  }
  const certs = (await res.json()) as Record<string, string>;
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Math.max(60, Number(maxAgeMatch[1])) : 3600;
  cachedGoogleCerts = certs;
  cachedGoogleCertsExpiresAt = Date.now() + maxAgeSec * 1000;
  return certs;
}

async function verifyFirebaseJwtWithGoogleCerts(
  idToken: string,
  projectId: string
): Promise<VerifiedFirebaseIdentity | null> {
  const segments = idToken.split('.');
  if (segments.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = segments;

  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8')) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== 'RS256' || !header.kid) {
      return null;
    }

    const claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      auth_time?: number;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
      firebase?: {
        sign_in_provider?: string;
      };
    };

    const nowSec = Math.floor(Date.now() / 1000);
    if (
      claims.aud !== projectId ||
      claims.iss !== `https://securetoken.google.com/${projectId}` ||
      !claims.sub ||
      typeof claims.exp !== 'number' ||
      claims.exp <= nowSec ||
      typeof claims.iat !== 'number' ||
      claims.iat > nowSec + 300 ||
      !claims.email
    ) {
      return null;
    }

    let certs = await getGoogleSecureTokenCerts(false);
    let certPem = certs[header.kid];
    if (!certPem) {
      certs = await getGoogleSecureTokenCerts(true);
      certPem = certs[header.kid];
    }
    if (!certPem) {
      return null;
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();
    const signatureValid = verifier.verify(certPem, Buffer.from(signatureB64, 'base64url'));
    if (!signatureValid) {
      return null;
    }

    return {
      uid: claims.sub,
      email: claims.email.toLowerCase(),
      name: claims.name || claims.email.split('@')[0] || `${BRAND_CONFIG.identity.brandShortName} Member`,
      photoURL: claims.picture || undefined,
      emailVerified: Boolean(claims.email_verified),
      signInProvider: claims.firebase?.sign_in_provider,
    };
  } catch {
    return null;
  }
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseIdentity | null> {
  if (!idToken) return null;

  // 1. Prefer Firebase Admin SDK verification when credentials are available
  if (adminAuthInstance) {
    try {
      const decoded = await adminAuthInstance.verifyIdToken(idToken, true);
      if (!decoded.email) return null;
      return {
        uid: decoded.uid,
        email: decoded.email.toLowerCase(),
        name: decoded.name || decoded.email.split('@')[0] || `${BRAND_CONFIG.identity.brandShortName} Member`,
        photoURL: decoded.picture || undefined,
        emailVerified: Boolean(decoded.email_verified),
        signInProvider: decoded.firebase?.sign_in_provider,
      };
    } catch {
      return null;
    }
  }

  const projectId = (process.env.FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId || '').trim();
  const apiKey = (process.env.FIREBASE_API_KEY || firebaseAppletConfig.apiKey || '').trim();

  // 2. Cryptographic RS256 verification against Google's official public X.509 certificates
  if (projectId) {
    const certVerified = await verifyFirebaseJwtWithGoogleCerts(idToken, projectId);
    if (certVerified) {
      return certVerified;
    }
  }

  // 3. Fallback: validate JWT claims against projectId + verify via Identity Toolkit lookup
  if (!apiKey || !projectId) return null;

  const segments = idToken.split('.');
  if (segments.length !== 3) return null;

  try {
    const claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf-8')) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      firebase?: {
        sign_in_provider?: string;
      };
    };
    const nowSec = Math.floor(Date.now() / 1000);
    if (
      claims.aud !== projectId ||
      claims.iss !== `https://securetoken.google.com/${projectId}` ||
      !claims.sub ||
      typeof claims.exp !== 'number' ||
      claims.exp <= nowSec
    ) {
      return null;
    }

    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!lookupRes.ok) return null;
    const lookupJson = (await lookupRes.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        emailVerified?: boolean;
        displayName?: string;
        photoUrl?: string;
        disabled?: boolean;
      }>;
    };
    const fbUser = lookupJson.users?.[0];
    if (!fbUser || fbUser.disabled || !fbUser.localId || !fbUser.email) {
      return null;
    }
    return {
      uid: fbUser.localId,
      email: fbUser.email.toLowerCase(),
      name: fbUser.displayName || fbUser.email.split('@')[0] || `${BRAND_CONFIG.identity.brandShortName} Member`,
      photoURL: fbUser.photoUrl || undefined,
      emailVerified: Boolean(fbUser.emailVerified),
      signInProvider: claims.firebase?.sign_in_provider,
    };
  } catch {
    return null;
  }
}

// Sliding-Window Rate Limiter & Per-Account Failed Login Lockout
const rateLimitBuckets = new Map<string, number[]>();
const loginFailureTracker = new Map<string, { count: number; lockedUntil: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitBuckets.entries()) {
    const fresh = timestamps.filter((t) => now - t < 60 * 60 * 1000);
    if (fresh.length === 0) {
      rateLimitBuckets.delete(key);
    } else {
      rateLimitBuckets.set(key, fresh);
    }
  }
  for (const [email, rec] of loginFailureTracker.entries()) {
    if (rec.lockedUntil && now > rec.lockedUntil + LOGIN_LOCKOUT_MS) {
      loginFailureTracker.delete(email);
    }
  }
}, 5 * 60 * 1000).unref();

function getClientIp(req: Request): string {
  // Rely on Express req.ip (configured with trust proxy = 1) rather than the first
  // client-controlled X-Forwarded-For entry, which visitors can spoof to bypass limits.
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function createRateLimiter(options: { bucket: string; windowMs: number; max: number; message: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${options.bucket}:${getClientIp(req)}`;
    const now = Date.now();
    const recent = (rateLimitBuckets.get(key) || []).filter((ts) => now - ts < options.windowMs);
    if (recent.length >= options.max) {
      const oldest = recent[0];
      const retryAfterSec = Math.max(1, Math.ceil((options.windowMs - (now - oldest)) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: options.message,
      });
    }
    recent.push(now);
    rateLimitBuckets.set(key, recent);
    return next();
  };
}

function isLoginLocked(email: string): number {
  const rec = loginFailureTracker.get(email.toLowerCase());
  if (!rec) return 0;
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    return rec.lockedUntil - Date.now();
  }
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    loginFailureTracker.delete(email.toLowerCase());
  }
  return 0;
}

function recordLoginFailure(email: string): boolean {
  const key = email.toLowerCase();
  const prev = loginFailureTracker.get(key) || { count: 0, lockedUntil: 0 };
  const nextCount = prev.count + 1;
  if (nextCount >= MAX_AUTH_ATTEMPTS) {
    loginFailureTracker.set(key, { count: nextCount, lockedUntil: Date.now() + LOGIN_LOCKOUT_MS });
    return true;
  }
  loginFailureTracker.set(key, { count: nextCount, lockedUntil: 0 });
  return false;
}

function clearLoginFailures(email: string): void {
  loginFailureTracker.delete(email.toLowerCase());
}

// Email Delivery Helpers
let cachedEtherealTransporter: Transporter | null = null;
let cachedEtherealAccount: TestAccount | null = null;
let lastEmailConfigIssue: string | null = null;
const rejectedResendKeys = new Set<string>();

function cleanEnvValue(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getCleanResendApiKey(): { key: string; issue?: string } {
  let key = cleanEnvValue(process.env.RESEND_API_KEY);
  if (/^bearer\s+/i.test(key)) {
    key = key.replace(/^bearer\s+/i, '').trim();
  }
  if (!key || /^(your_resend_api_key|re_placeholder|placeholder)$/i.test(key)) {
    return { key: '' };
  }
  if (rejectedResendKeys.has(key)) {
    return {
      key: '',
      issue: 'Resend API key was rejected (401). Please update RESEND_API_KEY with a valid key.',
    };
  }
  return { key };
}

function normalizeSmtpConfig(): {
  configured: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  issue?: string;
} {
  let host = cleanEnvValue(process.env.SMTP_HOST);
  const port = Number(cleanEnvValue(process.env.SMTP_PORT)) || 587;
  const user = cleanEnvValue(process.env.SMTP_USER);
  const pass = cleanEnvValue(process.env.SMTP_PASS);
  const from =
    cleanEnvValue(process.env.EMAIL_FROM) ||
    (user
      ? `${BRAND_CONFIG.identity.brandName} <${user}>`
      : `${BRAND_CONFIG.identity.brandName} <no-reply@example.com>`);

  if (!host && !user && !pass) {
    return { configured: false, host: '', port, user: '', pass: '', from };
  }

  host = host.replace(/^smtps?:\/\//i, '').replace(/\/+$/, '').trim();
  // Auto-correct common email-style typo such as "smtp@gmail.com" -> "smtp.gmail.com"
  const prefixEmailMatch = host.match(/^(smtp|mail|imap|pop)@([a-z0-9.-]+\.[a-z]{2,})$/i);
  if (prefixEmailMatch) {
    host = `${prefixEmailMatch[1].toLowerCase()}.${prefixEmailMatch[2].toLowerCase()}`;
  }

  if (!host || !user || !pass) {
    return {
      configured: false,
      host: '',
      port,
      user,
      pass,
      from,
      issue: 'Incomplete SMTP settings. Provide SMTP_HOST, SMTP_USER, and SMTP_PASS.',
    };
  }

  if (host.includes('@') || /\s/.test(host) || !host.includes('.')) {
    return {
      configured: false,
      host: '',
      port,
      user,
      pass,
      from,
      issue: `Invalid SMTP_HOST "${host}". Use a mail server hostname such as smtp.gmail.com.`,
    };
  }

  return { configured: true, host, port, user, pass, from };
}

function getServerEmailConfigIssue(): string | null {
  const resend = getCleanResendApiKey();
  const smtp = normalizeSmtpConfig();
  return lastEmailConfigIssue || resend.issue || smtp.issue || null;
}

async function getTransporter(): Promise<{
  transporter: Transporter;
  fromAddress: string;
  isEthereal: boolean;
}> {
  const smtp = normalizeSmtpConfig();
  if (smtp.configured) {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });
    return { transporter, fromAddress: smtp.from, isEthereal: false };
  }

  if (!cachedEtherealTransporter || !cachedEtherealAccount) {
    cachedEtherealAccount = await nodemailer.createTestAccount();
    cachedEtherealTransporter = nodemailer.createTransport({
      host: cachedEtherealAccount.smtp.host,
      port: cachedEtherealAccount.smtp.port,
      secure: cachedEtherealAccount.smtp.secure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      auth: {
        user: cachedEtherealAccount.user,
        pass: cachedEtherealAccount.pass,
      },
    });
  }

  return {
    transporter: cachedEtherealTransporter,
    fromAddress: `${BRAND_CONFIG.identity.brandName} <${cachedEtherealAccount.user}>`,
    isEthereal: true,
  };
}

interface SendEmailResult {
  sent: boolean;
  provider: 'resend' | 'smtp' | 'ethereal' | 'none';
  previewUrl?: string;
  error?: string;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  allowEthereal?: boolean;
}): Promise<SendEmailResult> {
  const issues: string[] = [];
  const resend = getCleanResendApiKey();
  if (resend.issue) {
    issues.push(resend.issue);
  }

  if (resend.key) {
    try {
      const fromAddress =
        cleanEnvValue(process.env.EMAIL_FROM) ||
        `${BRAND_CONFIG.identity.brandName} <onboarding@resend.dev>`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resend.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      });
      if (res.ok) {
        lastEmailConfigIssue = null;
        return { sent: true, provider: 'resend' };
      }

      const errText = await res.text();
      let detail = `Resend error (${res.status})`;
      try {
        const parsedErr = JSON.parse(errText) as { message?: string };
        if (parsedErr.message) {
          detail = `Resend API: ${parsedErr.message}`;
        }
      } catch {
        // Use HTTP status fallback
      }
      if (res.status === 401 || res.status === 403) {
        rejectedResendKeys.add(resend.key);
        detail = 'Resend API key is invalid (401). Please verify RESEND_API_KEY.';
      }
      issues.push(detail);
      lastEmailConfigIssue = detail;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Resend request failed';
      issues.push(msg);
      lastEmailConfigIssue = msg;
    }
  }

  const smtp = normalizeSmtpConfig();
  if (smtp.issue) {
    issues.push(smtp.issue);
    lastEmailConfigIssue = smtp.issue;
  }

  if (smtp.configured) {
    try {
      const { transporter, fromAddress } = await getTransporter();
      await transporter.sendMail({
        from: fromAddress,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      lastEmailConfigIssue = null;
      return { sent: true, provider: 'smtp' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'SMTP delivery failed';
      issues.push(`SMTP (${smtp.host}): ${msg}`);
      lastEmailConfigIssue = `SMTP (${smtp.host}): ${msg}`;
    }
  }

  if (params.allowEthereal === false) {
    return {
      sent: false,
      provider: 'none',
      error: issues.join(' | ') || lastEmailConfigIssue || undefined,
    };
  }

  try {
    if (!cachedEtherealTransporter || !cachedEtherealAccount) {
      cachedEtherealAccount = await nodemailer.createTestAccount();
      cachedEtherealTransporter = nodemailer.createTransport({
        host: cachedEtherealAccount.smtp.host,
        port: cachedEtherealAccount.smtp.port,
        secure: cachedEtherealAccount.smtp.secure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        auth: {
          user: cachedEtherealAccount.user,
          pass: cachedEtherealAccount.pass,
        },
      });
    }
    const info = await cachedEtherealTransporter.sendMail({
      from: `${BRAND_CONFIG.identity.brandName} <${cachedEtherealAccount.user}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    return {
      sent: true,
      provider: 'ethereal',
      previewUrl,
      error: issues.length > 0 ? issues.join(' | ') : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Preview email service unavailable';
    return {
      sent: false,
      provider: 'none',
      error: issues.concat(msg).join(' | '),
    };
  }
}

function getServerEmailDeliveryMode(): 'resend' | 'smtp' | 'none' {
  if (getCleanResendApiKey().key) return 'resend';
  if (normalizeSmtpConfig().configured) return 'smtp';
  return 'none';
}

function getAlertRecipientEmail(): string {
  return (
    (process.env.ADMIN_ALERT_EMAIL || '').trim() ||
    MANAGEMENT_EMAIL ||
    DEFAULT_MANAGEMENT_GOOGLE_EMAIL
  ).toLowerCase();
}

function getServerWebhookConfig(): { url: string; key: string } {
  const url = (
    process.env.ENQUIRY_WEBHOOK_URL ||
    process.env.VITE_ENQUIRY_WEBHOOK_URL ||
    ''
  ).trim();
  const key = (process.env.ENQUIRY_KEY || process.env.VITE_ENQUIRY_KEY || '').trim();
  return { url, key };
}

function formatAlertLocalTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleString(BRAND_CONFIG.locale.currencyLocale, {
    timeZone: BRAND_CONFIG.locale.timezoneIana,
    dateStyle: 'medium',
    timeStyle: 'short',
  })} ${BRAND_CONFIG.locale.timezoneLabel}`;
}

function buildInquiryAlertEmailText(record: ContactInquiryRecord): string {
  const lines = [
    `New ${BRAND_CONFIG.identity.brandName} Enquiry (${record.source})`,
    `Time: ${formatAlertLocalTime(record.createdAt)}`,
    `Name: ${record.name}`,
    record.email ? `Email: ${record.email}` : '',
    record.phone ? `Phone: ${record.phone}` : '',
    record.office ? `City / Desk: ${record.office}` : '',
    record.subject ? `Interest: ${record.subject}` : '',
    record.propertyTitle ? `Property: ${record.propertyTitle}` : '',
    record.preferredDate ? `Preferred Date: ${record.preferredDate}` : '',
    record.timeframe ? `Timeframe / Budget: ${record.timeframe}` : '',
    record.message ? `Message: ${record.message}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

function buildInquiryAlertEmailHtml(record: ContactInquiryRecord): string {
  const brandColor = BRAND_CONFIG.theme.brand;
  const shortBrand = escapeHtml(BRAND_CONFIG.identity.brandShortName);
  const row = (label: string, val?: string) =>
    val
      ? `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;width:150px;">${escapeHtml(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:${brandColor};font-size:13px;">${escapeHtml(val)}</td></tr>`
      : '';

  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px 16px;">
      <div style="background:${brandColor};color:#ffffff;padding:24px 28px;border-radius:18px 18px 0 0;">
        <div style="font-size:20px;font-weight:800;letter-spacing:-0.4px;">${shortBrand} Enquiry Alert</div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.8px;color:#94a3b8;margin-top:4px;">${escapeHtml(record.source)} &bull; ${escapeHtml(formatAlertLocalTime(record.createdAt))}</div>
      </div>
      <div style="background:#ffffff;padding:24px 28px;border-radius:0 0 18px 18px;border:1px solid #e2e8f0;border-top:none;">
        <table style="width:100%;border-collapse:collapse;">
          ${row('Name', record.name)}
          ${row('Email', record.email)}
          ${row('Phone', record.phone)}
          ${row('City / Desk', record.office)}
          ${row('Interest', record.subject)}
          ${row('Property', record.propertyTitle)}
          ${row('Preferred Date', record.preferredDate)}
          ${row('Timeframe / Budget', record.timeframe)}
          ${row('Message', record.message)}
        </table>
      </div>
    </div>
  `;
}

async function dispatchInquiryAlert(
  record: ContactInquiryRecord,
  options?: { skipWebhook?: boolean; allowEtherealPreview?: boolean }
): Promise<{
  deliveredToInbox: boolean;
  emailProvider: 'resend' | 'smtp' | 'ethereal' | 'none';
  webhookSent: boolean;
  previewUrl?: string;
  error?: string;
}> {
  const emailMode = getServerEmailDeliveryMode();
  const webhookConfig = getServerWebhookConfig();
  const recipient = getAlertRecipientEmail();

  let deliveredToInbox = false;
  let usedEmailProvider: 'resend' | 'smtp' | 'ethereal' | 'none' = 'none';
  let previewUrl: string | undefined;
  let deliveryError: string | undefined;

  if (emailMode !== 'none' || options?.allowEtherealPreview) {
    const emailResult = await sendEmail({
      to: recipient,
      subject: `[${BRAND_CONFIG.identity.brandShortName}] New Enquiry: ${record.name} (${record.source})`,
      text: buildInquiryAlertEmailText(record),
      html: buildInquiryAlertEmailHtml(record),
      allowEthereal: Boolean(options?.allowEtherealPreview),
    });
    usedEmailProvider = emailResult.provider;
    previewUrl = emailResult.previewUrl;
    deliveryError = emailResult.error;
    deliveredToInbox = emailResult.provider === 'resend' || emailResult.provider === 'smtp';
  }

  let webhookSent = false;
  if (!options?.skipWebhook && webhookConfig.url && webhookConfig.key) {
    try {
      const res = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          key: webhookConfig.key,
          name: record.name,
          email: record.email,
          phone: record.phone,
          city: record.office,
          interest: record.subject,
          budget: record.timeframe || '',
          message: record.message,
          source: record.source,
          page: `${BRAND_CONFIG.identity.brandShortName} (${record.source})`,
          website: '',
        }),
      });
      webhookSent = res.ok;
    } catch (err) {
      console.warn('[Alert] Server webhook dispatch failed:', err instanceof Error ? err.message : String(err));
    }
  }

  return {
    deliveredToInbox,
    emailProvider: usedEmailProvider,
    webhookSent,
    previewUrl,
    error: deliveryError,
  };
}

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildVerificationEmailHtml(name: string, code: string, verifyLink: string): string {
  const safeName = escapeHtml(name);
  const shortBrand = escapeHtml(BRAND_CONFIG.identity.brandShortName);
  const fullBrand = escapeHtml(BRAND_CONFIG.identity.brandName);
  const greeting = escapeHtml(BRAND_CONFIG.locale.greeting);
  const brandColor = BRAND_CONFIG.theme.brand;

  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 32px 20px;">
      <div style="background: ${brandColor}; color: #ffffff; padding: 28px 32px; border-radius: 20px 20px 0 0;">
        <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${shortBrand}</div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-top: 4px;">${fullBrand}</div>
      </div>
      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 20px 20px; border: 1px solid #e2e8f0; border-top: none;">
        <h2 style="color: ${brandColor}; margin: 0 0 12px; font-size: 20px;">Verify your email address</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          ${greeting} ${safeName},<br/>
          Thank you for registering with ${shortBrand}. Enter the 6-digit verification code below or click the verification button to activate your account.
        </p>
        <div style="background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-bottom: 6px;">Verification Code</div>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: ${brandColor}; font-family: monospace;">${code}</div>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${verifyLink}" style="display: inline-block; background: ${brandColor}; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 14px 28px; border-radius: 999px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
          This code expires in 15 minutes. If you did not create an ${shortBrand} account, you may safely ignore this email.
        </p>
      </div>
    </div>
  `;
}

function buildResetEmailHtml(name: string, code: string): string {
  const safeName = escapeHtml(name);
  const shortBrand = escapeHtml(BRAND_CONFIG.identity.brandShortName);
  const greeting = escapeHtml(BRAND_CONFIG.locale.greeting);
  const brandColor = BRAND_CONFIG.theme.brand;

  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 32px 20px;">
      <div style="background: ${brandColor}; color: #ffffff; padding: 28px 32px; border-radius: 20px 20px 0 0;">
        <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${shortBrand}</div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-top: 4px;">Password Reset Request</div>
      </div>
      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 20px 20px; border: 1px solid #e2e8f0; border-top: none;">
        <h2 style="color: ${brandColor}; margin: 0 0 12px; font-size: 20px;">Reset your password</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          ${greeting} ${safeName},<br/>
          We received a request to reset the password for your ${shortBrand} client account. Enter the 6-digit code below in the Reset Password window to choose a new password.
        </p>
        <div style="background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-bottom: 6px;">Reset Code</div>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: ${brandColor}; font-family: monospace;">${code}</div>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
          This code expires in 15 minutes. If you did not request a password reset, please disregard this message.
        </p>
      </div>
    </div>
  `;
}

function parseNumericPKR(input: string | number | undefined, fallback = 50000000): number {
  if (typeof input === 'number' && !Number.isNaN(input) && input > 0) return input;
  const raw = String(input || '').trim();
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  const num = parseFloat(lower.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(num) || num <= 0) return fallback;
  if (lower.includes('crore') || lower.includes('cr')) return Math.round(num * 10000000);
  if (lower.includes('lakh') || lower.includes('lac')) return Math.round(num * 100000);
  if (lower.includes('thousand') || lower.endsWith('k')) return Math.round(num * 1000);
  return Math.round(num);
}

function computePriceRange(numericPrice: number): BuyProperty['priceRange'] {
  if (numericPrice < 10000000) return 'Under 1 Cr';
  if (numericPrice <= 30000000) return '1-3 Cr';
  if (numericPrice <= 70000000) return '3-7 Cr';
  return '7 Cr+';
}

function computeAreaCategory(area: string): BuyProperty['areaCategory'] {
  const lower = String(area || '').toLowerCase();
  const match = lower.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
  const numericValue = match ? parseFloat(match[1].replace(/,/g, '')) : NaN;

  let marlas = NaN;
  if (!Number.isNaN(numericValue) && numericValue > 0) {
    if (lower.includes('kanal')) {
      marlas = numericValue * 20;
    } else if (lower.includes('marla')) {
      marlas = numericValue;
    } else if (lower.includes('sq. yd') || lower.includes('sq yd') || lower.includes('yard') || lower.includes('gaz')) {
      marlas = numericValue / 25;
    } else if (lower.includes('sq. ft') || lower.includes('sq ft') || lower.includes('sqft')) {
      marlas = numericValue / 225;
    }
  }

  if (!Number.isNaN(marlas)) {
    if (marlas >= 40) return '2 Kanal+';
    if (marlas >= 20) return '1 Kanal';
    if (marlas > 5) return '10 Marla';
    return 'Up to 5 Marla';
  }

  if (lower.includes('2 kanal') || lower.includes('1,000') || lower.includes('1000')) return '2 Kanal+';
  if (lower.includes('1 kanal') || lower.includes('500')) return '1 Kanal';
  if (lower.includes('10 marla') || lower.includes('7 marla') || lower.includes('8 marla')) return '10 Marla';
  return 'Up to 5 Marla';
}

const DEFAULT_FALLBACK_IMAGE = BRAND_CONFIG.images.fallbackVilla;
const MAX_GALLERY_IMAGES = 4;
const MAX_CATALOG_ITEM_BYTES = 800 * 1024;
const ALLOWED_PROJECT_STATUSES: readonly ProjectStatus[] = ['Available', 'Under Offer', 'Sold'];
const ALLOWED_BUY_STATUSES: readonly BuyStatus[] = ['Available', 'Under Offer', 'Sold'];
const ALLOWED_RENT_STATUSES: readonly RentStatus[] = ['Available', 'Rented'];

function isValidCatalogImage(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('data:image/jpeg;base64,')) {
    return value.length > 'data:image/jpeg;base64,'.length;
  }
  if (value.startsWith('/')) {
    return value.length > 1;
  }
  return /^https?:\/\/\S+$/i.test(value);
}

function validateGalleryAndMainImage(
  body: Record<string, unknown>
): { ok: true; image: string; gallery: string[] } | { ok: false; error: string } {
  if (body.gallery !== undefined && !Array.isArray(body.gallery)) {
    return {
      ok: false,
      error: 'Gallery must be an array of up to 4 image URLs or data:image/jpeg;base64 strings.',
    };
  }

  const galleryInput = Array.isArray(body.gallery)
    ? body.gallery.map((g: unknown) => String(g ?? '').trim()).filter(Boolean)
    : [];

  if (galleryInput.length > MAX_GALLERY_IMAGES) {
    return {
      ok: false,
      error: `Up to ${MAX_GALLERY_IMAGES} images are allowed per listing.`,
    };
  }

  if (galleryInput.length > 0) {
    for (const entry of galleryInput) {
      if (!isValidCatalogImage(entry)) {
        return {
          ok: false,
          error: 'Each gallery image must be a valid URL or data:image/jpeg;base64 string.',
        };
      }
    }
    return { ok: true, image: galleryInput[0], gallery: galleryInput };
  }

  const mainImage = String(body.image ?? '').trim() || DEFAULT_FALLBACK_IMAGE;
  if (!isValidCatalogImage(mainImage)) {
    return {
      ok: false,
      error: 'Main image must be a valid URL or data:image/jpeg;base64 string.',
    };
  }
  return { ok: true, image: mainImage, gallery: [mainImage] };
}

function validateItemStatus<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  label: string
): { ok: true; status: T } | { ok: false; error: string } {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { ok: true, status: 'Available' as T };
  }
  const value = String(raw).trim() as T;
  if (!allowed.includes(value)) {
    return {
      ok: false,
      error: `Invalid status "${value}" for ${label}. Allowed values: ${allowed.join(', ')}.`,
    };
  }
  return { ok: true, status: value };
}

function checkCatalogItemSize(item: unknown): string | null {
  const bytes = Buffer.byteLength(JSON.stringify(item), 'utf8');
  if (bytes > MAX_CATALOG_ITEM_BYTES) {
    return 'Listing payload (including images) exceeds the 800 KB size limit. Please use smaller compressed images or fewer photos.';
  }
  return null;
}

function buildProjectFromBody(
  id: string,
  body: Record<string, unknown>
): { ok: true; item: PortfolioProject } | { ok: false; error: string } {
  const title = String(body.title || '').trim();
  const location = String(body.location || '').trim();
  const category = normalizeCity(String(body.category || BRAND_CONFIG.locale.defaultCity));
  const valuation = String(body.valuation || '').trim();
  const size = String(body.size || '').trim() || '1 Kanal';
  const beds = Math.max(0, Number(body.beds ?? 5) || 0);
  const baths = Math.max(0, Number(body.baths ?? 5) || 0);
  const projectDelivered = String(body.projectDelivered || new Date().getFullYear()).trim();
  const architect = String(body.architect || BRAND_CONFIG.identity.architectDefault).trim();
  const summary =
    String(body.summary || '').trim() ||
    `Architectural residence located in ${location || category} with verified title and transfer documentation.`;

  if (!title || !location || !valuation) {
    return {
      ok: false,
      error: 'Project title, location, and valuation/price are required.',
    };
  }

  const statusCheck = validateItemStatus(body.status, ALLOWED_PROJECT_STATUSES, 'projects');
  if (!statusCheck.ok) return statusCheck;

  const mediaCheck = validateGalleryAndMainImage(body);
  if (!mediaCheck.ok) return mediaCheck;

  const fallbackVal =
    typeof body.numericValuation === 'number' && body.numericValuation > 0
      ? body.numericValuation
      : 100000000;

  const item: PortfolioProject = {
    id,
    title,
    location,
    size,
    beds,
    baths,
    projectDelivered,
    image: mediaCheck.image,
    summary,
    architect,
    valuation,
    numericValuation: parseNumericPKR(valuation, fallbackVal),
    category,
    gallery: mediaCheck.gallery,
    status: statusCheck.status,
  };

  const sizeError = checkCatalogItemSize(item);
  if (sizeError) return { ok: false, error: sizeError };

  return { ok: true, item };
}

function buildBuyFromBody(
  id: string,
  body: Record<string, unknown>
): { ok: true; item: BuyProperty } | { ok: false; error: string } {
  const title = String(body.title || '').trim();
  const city = normalizeCity(String(body.city || BRAND_CONFIG.locale.defaultCity));
  const location = String(body.location || '').trim();
  const rawType = String(body.type || 'House').trim();
  const allowedTypes: BuyProperty['type'][] = ['House', 'Apartment', 'Plot'];
  const type: BuyProperty['type'] = allowedTypes.includes(rawType as BuyProperty['type'])
    ? (rawType as BuyProperty['type'])
    : 'House';
  const price = String(body.price || '').trim();
  const area = String(body.area || '').trim() || '10 Marla';
  const beds = type === 'Plot' ? 0 : Math.max(0, Number(body.beds ?? 4) || 0);
  const baths = type === 'Plot' ? 0 : Math.max(0, Number(body.baths ?? 4) || 0);
  const description =
    String(body.description || '').trim() ||
    `Verified ${type.toLowerCase()} for sale in ${location || city} with clear society transfer documentation.`;
  const featuresInput = Array.isArray(body.features)
    ? body.features.map((f: unknown) => String(f).trim()).filter(Boolean)
    : String(body.features || '')
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
  const features =
    featuresInput.length > 0
      ? featuresInput
      : ['Verified Clear Title', '24/7 Society Security', 'All Utilities Available'];
  const possession = String(body.possession || 'Ready to Move').trim();
  const nocStatus = String(body.nocStatus || 'Society Transfer Ready').trim();

  if (!title || !location || !price) {
    return {
      ok: false,
      error: 'Property title, location, and price are required.',
    };
  }

  const statusCheck = validateItemStatus(body.status, ALLOWED_BUY_STATUSES, 'buy properties');
  if (!statusCheck.ok) return statusCheck;

  const mediaCheck = validateGalleryAndMainImage(body);
  if (!mediaCheck.ok) return mediaCheck;

  const fallbackPrice =
    typeof body.numericPrice === 'number' && body.numericPrice > 0 ? body.numericPrice : 35000000;
  const numericPrice = parseNumericPKR(price, fallbackPrice);

  const item: BuyProperty = {
    id,
    title,
    city,
    location,
    type,
    price,
    numericPrice,
    priceRange: computePriceRange(numericPrice),
    area,
    areaCategory: computeAreaCategory(area),
    beds,
    baths,
    image: mediaCheck.image,
    gallery: mediaCheck.gallery,
    description,
    features,
    possession,
    nocStatus,
    status: statusCheck.status,
  };

  const sizeError = checkCatalogItemSize(item);
  if (sizeError) return { ok: false, error: sizeError };

  return { ok: true, item };
}

function buildRentFromBody(
  id: string,
  body: Record<string, unknown>
): { ok: true; item: RentalListing } | { ok: false; error: string } {
  const title = String(body.title || '').trim();
  const city = normalizeCity(String(body.city || BRAND_CONFIG.locale.defaultCity));
  const areaSociety = String(body.areaSociety || '').trim();
  const rawType = String(body.type || 'House').trim();
  const allowedTypes: RentalListing['type'][] = ['Apartment', 'House', 'Upper Portion', 'Lower Portion'];
  const type: RentalListing['type'] = allowedTypes.includes(rawType as RentalListing['type'])
    ? (rawType as RentalListing['type'])
    : 'House';
  const monthlyRent = Number(body.monthlyRent);
  const beds = Math.max(1, Number(body.beds ?? 3) || 3);
  const baths = Math.max(1, Number(body.baths ?? 3) || 3);
  const sizeOrFloor = String(body.sizeOrFloor || '').trim() || '10 Marla';
  const furnished: RentalListing['furnished'] =
    String(body.furnished || 'Unfurnished') === 'Furnished' ? 'Furnished' : 'Unfurnished';
  const availableFrom = String(body.availableFrom || 'Immediate').trim();
  const securityDeposit = String(body.securityDeposit || "2 months' rent").trim();
  const advanceRent = String(body.advanceRent || '1 month').trim();
  const minContractPeriod = String(body.minContractPeriod || '11 months').trim();
  const amenitiesInput = Array.isArray(body.amenities)
    ? body.amenities.map((a: unknown) => String(a).trim()).filter(Boolean)
    : String(body.amenities || '')
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
  const amenities =
    amenitiesInput.length > 0
      ? amenitiesInput
      : ['Electricity & Sui Gas Connected', '24/7 Gated Security', 'Reserved Parking'];
  const description =
    String(body.description || '').trim() ||
    `Well-maintained ${furnished.toLowerCase()} ${type.toLowerCase()} available for lease in ${areaSociety || city}.`;

  if (!title || !areaSociety || !monthlyRent || Number.isNaN(monthlyRent) || monthlyRent <= 0) {
    return {
      ok: false,
      error: `Rental title, society/location, and a valid monthly rent in ${BRAND_CONFIG.locale.currencyCode} are required.`,
    };
  }

  const statusCheck = validateItemStatus(body.status, ALLOWED_RENT_STATUSES, 'rental listings');
  if (!statusCheck.ok) return statusCheck;

  const mediaCheck = validateGalleryAndMainImage(body);
  if (!mediaCheck.ok) return mediaCheck;

  const item: RentalListing = {
    id,
    title,
    city,
    areaSociety,
    type,
    monthlyRent: Math.round(monthlyRent),
    beds,
    baths,
    sizeOrFloor,
    furnished,
    image: mediaCheck.image,
    gallery: mediaCheck.gallery,
    availableFrom,
    securityDeposit,
    advanceRent,
    minContractPeriod,
    amenities,
    description,
    status: statusCheck.status,
  };

  const sizeError = checkCatalogItemSize(item);
  if (sizeError) return { ok: false, error: sizeError };

  return { ok: true, item };
}

const loginLimiter = createRateLimiter({
  bucket: 'login',
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
});

const signupLimiter = createRateLimiter({
  bucket: 'signup',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many registration requests. Please try again shortly.',
});

const verifyCodeLimiter = createRateLimiter({
  bucket: 'verify-code',
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many verification attempts. Please try again in 15 minutes.',
});

const forgotPasswordLimiter = createRateLimiter({
  bucket: 'forgot-password',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many password reset requests. Please try again in 15 minutes.',
});

const resetPasswordLimiter = createRateLimiter({
  bucket: 'reset-password',
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many reset code attempts. Please try again in 15 minutes.',
});

const inquiryLimiter = createRateLimiter({
  bucket: 'inquiries',
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many inquiries submitted. Please wait a few minutes and try again.',
});

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));
  app.use(
    '/stock',
    express.static(path.resolve(process.cwd(), 'public/stock'), {
      maxAge: '365d',
      immutable: true,
    })
  );

  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    return res.json({ ok: true, persistence: firestoreDb ? 'firestore' : 'memory' });
  });

  // --- Catalog CRUD Routes (Projects, Buy, Rent) ---
  app.get('/api/catalog', async (_req: Request, res: Response) => {
    try {
      const catalog = await getCatalog();
      return res.json({ success: true, catalog });
    } catch (err) {
      console.error('GET /api/catalog error:', err);
      return res.status(500).json({ success: false, error: 'Could not load property catalog.' });
    }
  });

  app.post('/api/catalog/projects', requireManagement, async (req: Request, res: Response) => {
    try {
      const built = buildProjectFromBody(
        `proj-${crypto.randomBytes(5).toString('hex')}`,
        (req.body || {}) as Record<string, unknown>
      );
      if (!built.ok) {
        return res.status(400).json({ success: false, error: built.error });
      }

      const catalog = await addCatalogProject(built.item);
      return res.status(201).json({ success: true, item: built.item, catalog });
    } catch (err) {
      console.error('POST /api/catalog/projects error:', err);
      return res.status(500).json({ success: false, error: 'Could not add project.' });
    }
  });

  app.put('/api/catalog/projects/:id', requireManagement, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '').trim();
      const built = buildProjectFromBody(id, (req.body || {}) as Record<string, unknown>);
      if (!built.ok) {
        return res.status(400).json({ success: false, error: built.error });
      }

      const { updated, catalog } = await updateCatalogProject(id, built.item);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Project item not found.' });
      }
      return res.json({ success: true, item: built.item, catalog });
    } catch (err) {
      console.error('PUT /api/catalog/projects error:', err);
      return res.status(500).json({ success: false, error: 'Could not update project.' });
    }
  });

  app.delete('/api/catalog/projects/:id', requireManagement, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '');
      const { removed, catalog } = await removeCatalogProject(id);
      if (!removed) {
        return res.status(404).json({ success: false, error: 'Project item not found.' });
      }
      return res.json({ success: true, catalog });
    } catch (err) {
      console.error('DELETE /api/catalog/projects error:', err);
      return res.status(500).json({ success: false, error: 'Could not remove project.' });
    }
  });

  app.post('/api/catalog/buy', requireManagement, async (req: Request, res: Response) => {
    try {
      const built = buildBuyFromBody(
        `buy-${crypto.randomBytes(5).toString('hex')}`,
        (req.body || {}) as Record<string, unknown>
      );
      if (!built.ok) {
        return res.status(400).json({ success: false, error: built.error });
      }

      const catalog = await addCatalogBuy(built.item);
      return res.status(201).json({ success: true, item: built.item, catalog });
    } catch (err) {
      console.error('POST /api/catalog/buy error:', err);
      return res.status(500).json({ success: false, error: 'Could not add property.' });
    }
  });

  app.put('/api/catalog/buy/:id', requireManagement, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '').trim();
      const built = buildBuyFromBody(id, (req.body || {}) as Record<string, unknown>);
      if (!built.ok) {
        return res.status(400).json({ success: false, error: built.error });
      }

      const { updated, catalog } = await updateCatalogBuy(id, built.item);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Property not found.' });
      }
      return res.json({ success: true, item: built.item, catalog });
    } catch (err) {
      console.error('PUT /api/catalog/buy error:', err);
      return res.status(500).json({ success: false, error: 'Could not update property.' });
    }
  });

  app.delete('/api/catalog/buy/:id', requireManagement, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '');
      const { removed, catalog } = await removeCatalogBuy(id);
      if (!removed) {
        return res.status(404).json({ success: false, error: 'Property not found.' });
      }
      return res.json({ success: true, catalog });
    } catch (err) {
      console.error('DELETE /api/catalog/buy error:', err);
      return res.status(500).json({ success: false, error: 'Could not remove property.' });
    }
  });

  app.post('/api/catalog/rent', requireManagement, async (req: Request, res: Response) => {
    try {
      const built = buildRentFromBody(
        `rent-${crypto.randomBytes(5).toString('hex')}`,
        (req.body || {}) as Record<string, unknown>
      );
      if (!built.ok) {
        return res.status(400).json({ success: false, error: built.error });
      }

      const catalog = await addCatalogRent(built.item);
      return res.status(201).json({ success: true, item: built.item, catalog });
    } catch (err) {
      console.error('POST /api/catalog/rent error:', err);
      return res.status(500).json({ success: false, error: 'Could not add rental listing.' });
    }
  });

  app.put('/api/catalog/rent/:id', requireManagement, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '').trim();
      const built = buildRentFromBody(id, (req.body || {}) as Record<string, unknown>);
      if (!built.ok) {
        return res.status(400).json({ success: false, error: built.error });
      }

      const { updated, catalog } = await updateCatalogRent(id, built.item);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Rental listing not found.' });
      }
      return res.json({ success: true, item: built.item, catalog });
    } catch (err) {
      console.error('PUT /api/catalog/rent error:', err);
      return res.status(500).json({ success: false, error: 'Could not update rental listing.' });
    }
  });

  app.delete('/api/catalog/rent/:id', requireManagement, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '');
      const { removed, catalog } = await removeCatalogRent(id);
      if (!removed) {
        return res.status(404).json({ success: false, error: 'Rental listing not found.' });
      }
      return res.json({ success: true, catalog });
    } catch (err) {
      console.error('DELETE /api/catalog/rent error:', err);
      return res.status(500).json({ success: false, error: 'Could not remove rental listing.' });
    }
  });

  app.post('/api/catalog/reset', requireManagement, async (req: Request, res: Response) => {
    try {
      const section = String(req.body?.section || 'all');
      const catalog = await resetCatalogSection(section);
      return res.json({ success: true, catalog });
    } catch (err) {
      console.error('POST /api/catalog/reset error:', err);
      return res.status(500).json({ success: false, error: 'Could not restore defaults.' });
    }
  });

  // --- Auth Routes ---

  // 1. Signup with Email Verification
  app.post('/api/auth/signup', signupLimiter, async (req: Request, res: Response) => {
    try {
      const name = String(req.body?.name || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');

      if (!name) {
        return res.status(400).json({ success: false, error: 'Full name is required.' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
      }
      if (password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password should be at least 8 characters.' });
      }

      if (isManagementEmail(email)) {
        return res.status(403).json({
          success: false,
          error: 'This email cannot be registered here. Please use Google Sign-In or Management Login.',
        });
      }

      const existing = await getUserByEmail(email);
      if (existing && existing.emailVerified) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists. Please log in.',
        });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt);
      const verifyCode = generateOtpCode();
      const verifyToken = crypto.randomBytes(24).toString('hex');
      const verifyExpiresAt = Date.now() + 15 * 60 * 1000;

      const user: StoredUser = {
        id: existing?.id || `usr_${crypto.randomBytes(10).toString('hex')}`,
        name,
        email,
        passwordHash,
        salt,
        emailVerified: false,
        provider: 'email',
        createdAt: existing?.createdAt || new Date().toISOString(),
        verifyCode,
        verifyToken,
        verifyExpiresAt,
        verifyAttempts: 0,
      };

      await saveUser(user);

      const verifyLink = `${getBaseUrl(req)}/api/auth/verify-link?token=${verifyToken}&email=${encodeURIComponent(email)}`;
      const emailResult = await sendEmail({
        to: email,
        subject: `Verify your ${BRAND_CONFIG.identity.brandName} account`,
        text: `${BRAND_CONFIG.locale.greeting} ${name}, your ${BRAND_CONFIG.identity.brandShortName} verification code is ${verifyCode}. Or visit: ${verifyLink}`,
        html: buildVerificationEmailHtml(name, verifyCode, verifyLink),
      });

      return res.json({
        success: true,
        email,
        previewUrl: emailResult.previewUrl,
        provider: emailResult.provider,
      });
    } catch (err: unknown) {
      console.error('Signup route error:', err);
      return res.status(500).json({
        success: false,
        error: 'Could not send verification email right now. Please try again.',
      });
    }
  });

  // 2. Resend Verification Email
  app.post('/api/auth/resend-verification', signupLimiter, async (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const user = await getUserByEmail(email);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'No pending registration found for this email.',
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          error: 'This email is already verified. Please sign in.',
        });
      }

      const verifyCode = generateOtpCode();
      const verifyToken = crypto.randomBytes(24).toString('hex');
      user.verifyCode = verifyCode;
      user.verifyToken = verifyToken;
      user.verifyExpiresAt = Date.now() + 15 * 60 * 1000;
      user.verifyAttempts = 0;
      await saveUser(user);

      const verifyLink = `${getBaseUrl(req)}/api/auth/verify-link?token=${verifyToken}&email=${encodeURIComponent(email)}`;
      const emailResult = await sendEmail({
        to: email,
        subject: `Your new ${BRAND_CONFIG.identity.brandShortName} verification code`,
        text: `${BRAND_CONFIG.locale.greeting} ${user.name}, your new verification code is ${verifyCode}. Or visit: ${verifyLink}`,
        html: buildVerificationEmailHtml(user.name, verifyCode, verifyLink),
      });

      return res.json({
        success: true,
        previewUrl: emailResult.previewUrl,
        provider: emailResult.provider,
      });
    } catch (err: unknown) {
      console.error('Resend verification error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to resend verification email.',
      });
    }
  });

  // 3. Verify Email via 6-digit Code (with max-attempts limit)
  app.post('/api/auth/verify-email', verifyCodeLimiter, async (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const code = String(req.body?.code || '').trim();
      const user = await getUserByEmail(email);

      if (!user) {
        return res.status(404).json({ success: false, error: 'Account not found.' });
      }

      if (user.emailVerified) {
        return res.json({
          success: true,
          user: sanitizeUser(user),
          userToken: createUserToken(user),
        });
      }

      if (!user.verifyCode || (user.verifyExpiresAt && Date.now() > user.verifyExpiresAt)) {
        return res.status(400).json({
          success: false,
          error: 'Verification code expired or unavailable. Please resend a new one.',
        });
      }

      if (!code || user.verifyCode !== code) {
        const nextAttempts = (user.verifyAttempts || 0) + 1;
        if (nextAttempts >= MAX_AUTH_ATTEMPTS) {
          user.verifyCode = undefined;
          user.verifyToken = undefined;
          user.verifyExpiresAt = undefined;
          user.verifyAttempts = 0;
          await saveUser(user);
          return res.status(429).json({
            success: false,
            error: 'Too many invalid verification attempts. Please request a new verification code.',
          });
        }
        user.verifyAttempts = nextAttempts;
        await saveUser(user);
        return res.status(400).json({
          success: false,
          error: 'Invalid verification code. Please check your email.',
        });
      }

      user.emailVerified = true;
      user.verifyCode = undefined;
      user.verifyToken = undefined;
      user.verifyExpiresAt = undefined;
      user.verifyAttempts = 0;
      await saveUser(user);

      return res.json({
        success: true,
        user: sanitizeUser(user),
        userToken: createUserToken(user),
      });
    } catch (err) {
      console.error('Verify email error:', err);
      return res.status(500).json({ success: false, error: 'Verification failed. Please try again.' });
    }
  });

  // 4. Verify Email via Direct Email Link
  app.get('/api/auth/verify-link', async (req: Request, res: Response) => {
    try {
      const email = String(req.query.email || '').trim().toLowerCase();
      const token = String(req.query.token || '').trim();
      const user = await getUserByEmail(email);

      const shortBrand = escapeHtml(BRAND_CONFIG.identity.brandShortName);
      const surfaceColor = BRAND_CONFIG.theme.surface;
      const brandColor = BRAND_CONFIG.theme.brand;

      const isExpired = Boolean(user?.verifyExpiresAt && Date.now() > user.verifyExpiresAt);
      if (!user || !token || (!user.emailVerified && (user.verifyToken !== token || isExpired))) {
        return res.status(400).send(`
          <html>
            <body style="font-family: sans-serif; background: ${surfaceColor}; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
              <div style="background: white; padding: 40px; border-radius: 24px; max-width: 420px; text-align: center; box-shadow: 0 20px 50px rgba(27,42,68,0.1);">
                <h2 style="color: ${brandColor}; margin-top: 0;">Verification Link Invalid</h2>
                <p style="color: #64748b; font-size: 14px;">This verification link has expired or is invalid. Please request a new code in the app.</p>
                <a href="/#/login" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: ${brandColor}; color: white; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 13px;">Go to Login</a>
              </div>
            </body>
          </html>
        `);
      }

      user.emailVerified = true;
      user.verifyCode = undefined;
      user.verifyToken = undefined;
      user.verifyExpiresAt = undefined;
      user.verifyAttempts = 0;
      await saveUser(user);

      return res.send(`
        <html>
          <body style="font-family: sans-serif; background: ${surfaceColor}; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
            <div style="background: white; padding: 40px; border-radius: 24px; max-width: 420px; text-align: center; box-shadow: 0 20px 50px rgba(27,42,68,0.1);">
              <div style="width: 56px; height: 56px; border-radius: 999px; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px;">✓</div>
              <h2 style="color: ${brandColor}; margin-top: 0;">Email Verified!</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                Your ${shortBrand} account (${escapeHtml(email)}) is now active. Return to the app tab and click <strong>"I've verified my email"</strong> or sign in directly below.
              </p>
              <a href="/#/login" style="display: inline-block; margin-top: 18px; padding: 12px 28px; background: ${brandColor}; color: white; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 13px;">Sign In to ${shortBrand}</a>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('Verify link error:', err);
      return res.status(500).send('Verification failed. Please try again.');
    }
  });

  // 5. Check Verification Status
  app.post('/api/auth/check-verified', async (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const user = await getUserByEmail(email);
      if (!user || !user.emailVerified) {
        return res.json({ verified: false });
      }
      return res.json({
        verified: true,
        user: sanitizeUser(user),
        userToken: createUserToken(user),
      });
    } catch (err) {
      console.error('Check verified error:', err);
      return res.status(500).json({ verified: false });
    }
  });

  // 6. Login with Email & Password (with rate limiting & per-account lockout)
  app.post('/api/auth/login', loginLimiter, async (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required.',
        });
      }

      const remainingLockMs = isLoginLocked(email);
      if (remainingLockMs > 0) {
        const mins = Math.max(1, Math.ceil(remainingLockMs / 60000));
        return res.status(429).json({
          success: false,
          error: `Too many failed login attempts. Please try again in ${mins} minute(s).`,
        });
      }

      if (MANAGEMENT_EMAIL && MANAGEMENT_PASSWORD && email === MANAGEMENT_EMAIL) {
        const providedHash = crypto.createHash('sha256').update(password).digest();
        const expectedHash = crypto.createHash('sha256').update(MANAGEMENT_PASSWORD).digest();
        if (!crypto.timingSafeEqual(providedHash, expectedHash)) {
          const lockedNow = recordLoginFailure(email);
          return res.status(lockedNow ? 429 : 401).json({
            success: false,
            error: lockedNow
              ? 'Too many failed login attempts. Please try again in 15 minutes.'
              : 'Incorrect email or password. Please verify and try again.',
          });
        }

        clearLoginFailures(email);
        return res.json({
          success: true,
          user: {
            id: `mgmt_${BRAND_CONFIG.identity.storageKeyPrefix}_admin`,
            name: `${BRAND_CONFIG.identity.brandShortName} Management`,
            email: MANAGEMENT_EMAIL,
            emailVerified: true,
            role: 'management' as const,
            createdAt: '2025-01-01T00:00:00.000Z',
          },
          managementToken: createManagementToken(MANAGEMENT_EMAIL),
        });
      }

      const user = await getUserByEmail(email);

      if (user && user.provider === 'google' && !user.passwordHash) {
        return res.status(401).json({
          success: false,
          error: 'This account uses Google Sign-In. Please click "Continue with Google".',
        });
      }

      if (!user || !user.salt || !user.passwordHash || !verifyPassword(password, user.salt, user.passwordHash)) {
        const lockedNow = recordLoginFailure(email);
        return res.status(lockedNow ? 429 : 401).json({
          success: false,
          error: lockedNow
            ? 'Too many failed login attempts. Please try again in 15 minutes.'
            : 'Incorrect email or password. Please verify and try again.',
        });
      }

      if (!user.emailVerified) {
        return res.status(403).json({
          success: false,
          unverified: true,
          email: user.email,
        });
      }

      clearLoginFailures(email);
      user.lastLoginAt = new Date().toISOString();
      await saveUser(user);

      return res.json({
        success: true,
        user: sanitizeUser(user),
        userToken: createUserToken(user),
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({
        success: false,
        error: 'Sign in failed due to a server error. Please try again.',
      });
    }
  });

  // 6b. Sync Google Sign-In Accounts to Backend Registry (verifies Firebase ID token)
  app.post('/api/auth/google-sync', async (req: Request, res: Response) => {
    try {
      const idToken = extractBearerToken(req) || String(req.body?.idToken || '').trim();
      const verified = await verifyFirebaseIdToken(idToken);
      if (!verified) {
        return res.status(401).json({
          success: false,
          error: 'Valid Firebase authentication token is required.',
        });
      }

      const isMgmtAccount = isManagementEmail(verified.email);
      if (isMgmtAccount && !verified.emailVerified) {
        return res.status(403).json({
          success: false,
          error: 'Email verification is required for management access.',
        });
      }

      const existing = await getUserByEmail(verified.email);
      const now = new Date().toISOString();
      const resolvedProvider: 'email' | 'google' =
        verified.signInProvider === 'google.com' ? 'google' : 'email';
      let syncedUser: StoredUser;
      let statusCode = 200;

      if (existing) {
        existing.id = existing.id || verified.uid;
        existing.name = verified.name || existing.name;
        existing.emailVerified = true;
        if (verified.photoURL) existing.photoURL = verified.photoURL;
        existing.lastLoginAt = now;
        if (!existing.provider) existing.provider = resolvedProvider;
        await saveUser(existing);
        syncedUser = existing;
      } else {
        syncedUser = {
          id: verified.uid,
          name: verified.name,
          email: verified.email,
          passwordHash: '',
          salt: '',
          emailVerified: true,
          provider: resolvedProvider,
          photoURL: verified.photoURL,
          createdAt: now,
          lastLoginAt: now,
        };
        await saveUser(syncedUser);
        statusCode = 201;
      }

      if (isMgmtAccount) {
        return res.status(statusCode).json({
          success: true,
          isManagement: true,
          user: {
            ...sanitizeUser(syncedUser),
            role: 'management' as const,
          },
          managementToken: createManagementToken(verified.email),
          userToken: createUserToken(syncedUser),
        });
      }

      return res.status(statusCode).json({
        success: true,
        isManagement: false,
        user: sanitizeUser(syncedUser),
        userToken: createUserToken(syncedUser),
      });
    } catch (err) {
      console.error('Google sync error:', err);
      return res.status(500).json({ success: false, error: 'Could not sync Google profile.' });
    }
  });

  // 6c. Sync User Phone Update (authenticated via userToken or Firebase ID token)
  app.post('/api/auth/update-phone', async (req: Request, res: Response) => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      let verifiedEmail: string | null = null;
      let verifiedUid: string | null = null;
      let verifiedName: string | undefined;

      const userSession = verifyUserToken(token);
      if (userSession) {
        verifiedEmail = userSession.email;
        verifiedUid = userSession.uid;
      } else {
        const fbIdentity = await verifyFirebaseIdToken(token);
        if (fbIdentity) {
          verifiedEmail = fbIdentity.email;
          verifiedUid = fbIdentity.uid;
          verifiedName = fbIdentity.name;
        }
      }

      if (!verifiedEmail) {
        return res.status(401).json({ success: false, error: 'Invalid or expired authentication token.' });
      }

      const phone = String(req.body?.phone || '').trim();
      let user = await getUserByEmail(verifiedEmail);
      if (!user && verifiedUid) {
        user = {
          id: verifiedUid,
          name: verifiedName || verifiedEmail.split('@')[0] || `${BRAND_CONFIG.identity.brandShortName} Member`,
          email: verifiedEmail,
          passwordHash: '',
          salt: '',
          emailVerified: true,
          provider: 'google',
          createdAt: new Date().toISOString(),
        };
      }
      if (!user) {
        return res.status(404).json({ success: false, error: 'Account not found.' });
      }

      user.phone = phone || undefined;
      await saveUser(user);
      return res.json({ success: true, user: sanitizeUser(user) });
    } catch (err) {
      console.error('Update phone error:', err);
      return res.status(500).json({ success: false, error: 'Could not update phone number.' });
    }
  });

  // 7. Forgot Password (always returns uniform message to prevent account enumeration)
  app.post('/api/auth/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
    const genericResponse = {
      success: true,
      message: 'If an account exists for that email address, a password reset code has been sent.',
    };

    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!email || isManagementEmail(email)) {
        return res.json(genericResponse);
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return res.json(genericResponse);
      }

      const resetCode = generateOtpCode();
      user.resetCode = resetCode;
      user.resetExpiresAt = Date.now() + 15 * 60 * 1000;
      user.resetAttempts = 0;
      await saveUser(user);

      const emailResult = await sendEmail({
        to: email,
        subject: `${BRAND_CONFIG.identity.brandShortName} Password Reset Code`,
        text: `${BRAND_CONFIG.locale.greeting} ${user.name}, your ${BRAND_CONFIG.identity.brandShortName} password reset code is ${resetCode}. It expires in 15 minutes.`,
        html: buildResetEmailHtml(user.name, resetCode),
      });

      if (emailResult.previewUrl) {
        console.log(`[Email Preview] Password reset preview URL: ${emailResult.previewUrl}`);
      }

      return res.json(genericResponse);
    } catch (err: unknown) {
      console.error('Forgot password error:', err);
      return res.json(genericResponse);
    }
  });

  // 8. Reset Password with Code (with max-attempts limit)
  app.post('/api/auth/reset-password', resetPasswordLimiter, async (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const code = String(req.body?.code || '').trim();
      const newPassword = String(req.body?.newPassword || '');

      if (isManagementEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset code.',
        });
      }

      const user = await getUserByEmail(email);
      if (!user || !user.resetCode) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset code. Please request a new one.',
        });
      }

      if (user.resetExpiresAt && Date.now() > user.resetExpiresAt) {
        user.resetCode = undefined;
        user.resetExpiresAt = undefined;
        user.resetAttempts = 0;
        await saveUser(user);
        return res.status(400).json({
          success: false,
          error: 'Reset code has expired. Please request a new one.',
        });
      }

      if (!code || user.resetCode !== code) {
        const nextAttempts = (user.resetAttempts || 0) + 1;
        if (nextAttempts >= MAX_AUTH_ATTEMPTS) {
          user.resetCode = undefined;
          user.resetExpiresAt = undefined;
          user.resetAttempts = 0;
          await saveUser(user);
          return res.status(429).json({
            success: false,
            error: 'Too many invalid reset attempts. Please request a new password reset code.',
          });
        }
        user.resetAttempts = nextAttempts;
        await saveUser(user);
        return res.status(400).json({
          success: false,
          error: 'Invalid reset code. Please check your email.',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 8 characters long.',
        });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      user.salt = salt;
      user.passwordHash = hashPassword(newPassword, salt);
      user.resetCode = undefined;
      user.resetExpiresAt = undefined;
      user.resetAttempts = 0;
      user.emailVerified = true;
      await saveUser(user);
      clearLoginFailures(email);

      return res.json({ success: true });
    } catch (err) {
      console.error('Reset password error:', err);
      return res.status(500).json({ success: false, error: 'Could not reset password right now.' });
    }
  });

  // --- Contact & Inquiry Submissions Routes ---
  app.post('/api/inquiries', inquiryLimiter, async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const phone = String(body.phone || '').trim();
      const office = String(body.office || BRAND_CONFIG.locale.defaultCity).trim();
      const subject = String(body.subject || 'General Inquiry').trim();
      const message = String(body.message || '').trim();
      const source = String(body.source || 'Contact Page').trim();
      const propertyTitle = body.propertyTitle ? String(body.propertyTitle).trim() : undefined;
      const preferredDate = body.preferredDate ? String(body.preferredDate).trim() : undefined;
      const timeframe = body.timeframe ? String(body.timeframe).trim() : undefined;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Full name is required.' });
      }
      if (!email && !phone) {
        return res.status(400).json({
          success: false,
          error: 'Please provide an email address or contact phone number.',
        });
      }

      const record: ContactInquiryRecord = {
        id: `inq-${crypto.randomBytes(5).toString('hex')}`,
        name,
        email,
        phone,
        office,
        subject,
        message,
        source,
        propertyTitle,
        preferredDate,
        timeframe,
        status: 'new',
        createdAt: new Date().toISOString(),
      };

      await createInquiry(record);
      void dispatchInquiryAlert(record, {
        skipWebhook: Boolean(body.webhookDispatched),
      }).catch((err) => {
        console.warn('[Alert] Inquiry notification dispatch failed:', err);
      });
      return res.status(201).json({ success: true, inquiry: record });
    } catch (err) {
      console.error('POST /api/inquiries error:', err);
      return res.status(500).json({ success: false, error: 'Could not submit inquiry right now.' });
    }
  });

  app.get('/api/management/alerts-status', requireManagement, (_req: Request, res: Response) => {
    const emailProvider = getServerEmailDeliveryMode();
    const webhook = getServerWebhookConfig();
    return res.json({
      success: true,
      emailProvider,
      serverWebhookConfigured: Boolean(webhook.url && webhook.key),
      alertRecipient: getAlertRecipientEmail(),
      configIssue: getServerEmailConfigIssue() || undefined,
    });
  });

  app.post('/api/management/test-alert', requireManagement, async (_req: Request, res: Response) => {
    try {
      const testRecord: ContactInquiryRecord = {
        id: `test-${crypto.randomBytes(4).toString('hex')}`,
        name: 'TEST ENQUIRY',
        email: '',
        phone: '',
        office: BRAND_CONFIG.locale.defaultCity,
        subject: 'Alert Diagnostics Test',
        message: `Test from the ${BRAND_CONFIG.identity.brandShortName} management portal.`,
        source: 'Management test',
        status: 'new',
        createdAt: new Date().toISOString(),
      };
      const result = await dispatchInquiryAlert(testRecord, {
        allowEtherealPreview: true,
      });
      return res.json({
        success: result.deliveredToInbox || result.webhookSent,
        deliveredToInbox: result.deliveredToInbox,
        emailProvider: result.emailProvider,
        webhookSent: result.webhookSent,
        alertRecipient: getAlertRecipientEmail(),
        previewUrl: result.previewUrl,
        error: result.error,
      });
    } catch (err) {
      console.error('POST /api/management/test-alert error:', err);
      return res.status(500).json({
        success: false,
        error: 'Could not run alert test right now.',
      });
    }
  });

  // Management-only endpoints to view & manage Contact Submissions and Registered Accounts
  app.get('/api/management/records', requireManagement, async (_req: Request, res: Response) => {
    try {
      const [users, inquiries] = await Promise.all([listUsers(), listInquiries()]);
      const accounts = users
        .filter((u) => !isManagementEmail(u.email))
        .map(sanitizeUser)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json({
        success: true,
        inquiries,
        accounts,
      });
    } catch (err) {
      console.error('GET /api/management/records error:', err);
      return res.status(500).json({ success: false, error: 'Could not load client records.' });
    }
  });

  app.patch('/api/management/inquiries/:id', requireManagement, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '');
      const status = String(req.body?.status || '').trim();
      if (!['new', 'contacted', 'resolved'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status value.' });
      }

      const updated = await updateInquiryStatus(id, status as ContactInquiryRecord['status']);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Inquiry not found.' });
      }

      return res.json({ success: true, inquiry: updated });
    } catch (err) {
      console.error('PATCH /api/management/inquiries error:', err);
      return res.status(500).json({ success: false, error: 'Could not update inquiry.' });
    }
  });

  app.delete('/api/management/inquiries/:id', requireManagement, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '');
      const deleted = await deleteInquiry(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Inquiry not found.' });
      }
      return res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/management/inquiries error:', err);
      return res.status(500).json({ success: false, error: 'Could not delete inquiry.' });
    }
  });

  app.delete('/api/management/accounts/:id', requireManagement, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '');
      const deleted = await deleteUserById(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Account not found.' });
      }
      return res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/management/accounts error:', err);
      return res.status(500).json({ success: false, error: 'Could not delete account.' });
    }
  });

  // Mount Vite middleware in dev or serve static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
