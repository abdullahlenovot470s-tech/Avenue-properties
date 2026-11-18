import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  db,
  formatFirestoreQuotaMessage,
  handleFirestoreError,
  isFirestoreQuotaError,
  OperationType,
} from './firebase';
import { PORTFOLIO_PROJECTS, PROPERTY_LISTINGS } from '../data/realEstateData';
import { BUY_PROPERTIES, computeAreaCategory, type BuyProperty } from '../data/buyPropertiesData';
import { RENTAL_LISTINGS } from '../data/rentalsData';
import { resolveBrandImagePath } from '../data/legacyImageMap';
import { BRAND_CONFIG } from '../config/brand.config';
import type {
  BuyStatus,
  ClientReview,
  FaqItem,
  PortfolioProject,
  ProjectStatus,
  PropertyListing,
  RentalListing,
  RentStatus,
} from '../types';

export interface CatalogStoreData {
  projects: PortfolioProject[];
  listings: PropertyListing[];
  buy: BuyProperty[];
  rent: RentalListing[];
  faqs: FaqItem[];
  reviews: ClientReview[];
}

export interface CatalogMutationResult {
  success: boolean;
  catalog?: CatalogStoreData;
  snapshotPublished?: boolean;
  error?: string;
}

const VALID_CITIES: string[] = [...BRAND_CONFIG.locale.mainCities];
const DEFAULT_FALLBACK_IMAGE = BRAND_CONFIG.images.fallbackVilla;
const MAX_GALLERY_IMAGES = 30;
const MAX_CATALOG_ITEM_BYTES = 800 * 1024;
const MAX_SNAPSHOT_DOC_BYTES = 920 * 1024;
const MAX_CATALOG_READ_LIMIT = 200;
const ALLOWED_PROJECT_STATUSES: readonly ProjectStatus[] = ['Available', 'Under Offer', 'Sold'];
const ALLOWED_BUY_STATUSES: readonly BuyStatus[] = ['Available', 'Under Offer', 'Sold'];
const ALLOWED_RENT_STATUSES: readonly RentStatus[] = ['Available', 'Rented'];

const DEFAULT_FAQ_CATEGORIES = ['Title & Legal', 'Overseas Buyers', 'Pricing & Taxes'];

export function getDefaultFaqs(): FaqItem[] {
  return BRAND_CONFIG.copy.faqs.map((faq, idx) => ({
    id: `faq-${idx + 1}`,
    question: faq.question,
    answer: faq.answer,
    category: DEFAULT_FAQ_CATEGORIES[idx] || 'General Advisory',
  }));
}

export function getDefaultReviews(): ClientReview[] {
  return BRAND_CONFIG.copy.testimonials.map((review) => ({
    id: review.id,
    quote: review.quote,
    author: review.author,
    role: review.role,
    location: review.location,
    propertyContext: review.propertyContext,
    rating: review.rating,
    date: review.date,
  }));
}

let catalogSnapshotCache: CatalogStoreData | null = null;
let clientSeededConfirmed = false;
let clientFaqsSeededConfirmed = false;
let clientReviewsSeededConfirmed = false;
let publicSnapshotExists: boolean | null = null;
let lastSnapshotWriteFailed = false;
let inFlightCatalogFetch: Promise<{
  catalog: CatalogStoreData;
  fromFirestore: boolean;
  fromSnapshot?: boolean;
  snapshotWriteFailed?: boolean;
  quotaExceeded?: boolean;
  fetchFailed?: boolean;
  error?: string;
}> | null = null;

export function hydrateCatalogFirestoreSnapshot(catalog: CatalogStoreData): void {
  catalogSnapshotCache = catalog;
}

export function hasPublicCatalogSnapshot(): boolean | null {
  return publicSnapshotExists;
}

export function hasSnapshotWriteFailed(): boolean {
  return lastSnapshotWriteFailed;
}

function getEmptyCatalog(): CatalogStoreData {
  return {
    projects: [],
    listings: [],
    buy: [],
    rent: [],
    faqs: [],
    reviews: [],
  };
}

const LEGACY_REPLACEMENTS: Record<string, string> = {
  'photo-1600607687644-c7171b42498b': 'photo-1600585154340-be6161a56a0c',
  'photo-1502005229762-ee1b2b93e083': 'photo-1600210492486-724fe5c67fb0',
  'photo-1508873696983-2df5703bc20d': 'photo-1512917774080-9991f1c4c750',
  'photo-1540518614846-7ede433c4550': 'photo-1616486338812-3dadae4b4ace',
};

function generateId(prefix: string): string {
  const bytes = new Uint8Array(5);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${hex}`;
}

function normalizeCity(city: string): string {
  return VALID_CITIES.includes(city) ? city : BRAND_CONFIG.locale.defaultCity;
}

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

function getDefaultCatalog(): CatalogStoreData {
  return normalizeCatalogImages({
    projects: JSON.parse(JSON.stringify(PORTFOLIO_PROJECTS)),
    listings: JSON.parse(JSON.stringify(PROPERTY_LISTINGS)),
    buy: JSON.parse(JSON.stringify(BUY_PROPERTIES)),
    rent: JSON.parse(JSON.stringify(RENTAL_LISTINGS)),
    faqs: getDefaultFaqs(),
    reviews: getDefaultReviews(),
  });
}

function normalizeCatalogImages(store: CatalogStoreData): CatalogStoreData {
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
    faqs: Array.isArray(store.faqs) ? store.faqs : getDefaultFaqs(),
    reviews: Array.isArray(store.reviews) ? store.reviews : getDefaultReviews(),
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

function isValidCatalogImage(value: string): boolean {
  if (!value) return false;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)) {
    const idx = value.indexOf(',');
    return idx !== -1 && value.length > idx + 1;
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
      error: `Gallery must be an array of up to ${MAX_GALLERY_IMAGES} image URLs.`,
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
          error: 'Each gallery image must be a valid https:// URL, /brand/ path, or uploaded photo.',
        };
      }
    }
    return { ok: true, image: galleryInput[0], gallery: galleryInput };
  }

  const mainImage = String(body.image ?? '').trim() || DEFAULT_FALLBACK_IMAGE;
  if (!isValidCatalogImage(mainImage)) {
    return {
      ok: false,
      error: 'Main image must be a valid https:// URL or /brand/ path.',
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
  const bytes = new TextEncoder().encode(JSON.stringify(item)).length;
  if (bytes > MAX_CATALOG_ITEM_BYTES) {
    return 'Listing payload (including images) exceeds the 800 KB size limit. Please use smaller compressed images or fewer photos.';
  }
  return null;
}

function buildProjectFromBody(
  id: string,
  body: Record<string, unknown>
): { ok: true; item: PortfolioProject } | { ok: false; error: string } {
  const title = String(body.title || '').trim().slice(0, 200);
  const location = String(body.location || '').trim().slice(0, 200);
  const category = normalizeCity(String(body.category || BRAND_CONFIG.locale.defaultCity)).slice(0, 80);
  const valuation = String(body.valuation || '').trim().slice(0, 80);
  const size = (String(body.size || '').trim() || '1 Kanal').slice(0, 80);
  const beds = Math.max(0, Number(body.beds ?? 5) || 0);
  const baths = Math.max(0, Number(body.baths ?? 5) || 0);
  const projectDelivered = String(body.projectDelivered || new Date().getFullYear())
    .trim()
    .slice(0, 32);
  const architect = String(body.architect || BRAND_CONFIG.identity.architectDefault)
    .trim()
    .slice(0, 160);
  const summary = (
    String(body.summary || '').trim() ||
    `Architectural residence located in ${location || category} with verified title and transfer documentation.`
  ).slice(0, 5000);

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
  const title = String(body.title || '').trim().slice(0, 200);
  const city = normalizeCity(String(body.city || BRAND_CONFIG.locale.defaultCity)).slice(0, 80);
  const location = String(body.location || '').trim().slice(0, 200);
  const rawType = String(body.type || 'House').trim();
  const allowedTypes: BuyProperty['type'][] = ['House', 'Apartment', 'Plot'];
  const type: BuyProperty['type'] = allowedTypes.includes(rawType as BuyProperty['type'])
    ? (rawType as BuyProperty['type'])
    : 'House';
  const price = String(body.price || '').trim().slice(0, 80);
  const area = (String(body.area || '').trim() || '10 Marla').slice(0, 80);
  const beds = type === 'Plot' ? 0 : Math.max(0, Number(body.beds ?? 4) || 0);
  const baths = type === 'Plot' ? 0 : Math.max(0, Number(body.baths ?? 4) || 0);
  const description = (
    String(body.description || '').trim() ||
    `Verified ${type.toLowerCase()} for sale in ${location || city} with clear society transfer documentation.`
  ).slice(0, 5000);
  const featuresInput = Array.isArray(body.features)
    ? body.features.map((f: unknown) => String(f).trim()).filter(Boolean)
    : String(body.features || '')
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
  const features = (
    featuresInput.length > 0
      ? featuresInput
      : ['Verified Clear Title', '24/7 Society Security', 'All Utilities Available']
  ).slice(0, 30);
  const possession = String(body.possession || 'Ready to Move').trim().slice(0, 120);
  const nocStatus = String(body.nocStatus || 'Society Transfer Ready').trim().slice(0, 120);

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
  const title = String(body.title || '').trim().slice(0, 200);
  const city = normalizeCity(String(body.city || BRAND_CONFIG.locale.defaultCity)).slice(0, 80);
  const areaSociety = String(body.areaSociety || '').trim().slice(0, 200);
  const rawType = String(body.type || 'House').trim();
  const allowedTypes: RentalListing['type'][] = [
    'Apartment',
    'House',
    'Upper Portion',
    'Lower Portion',
  ];
  const type: RentalListing['type'] = allowedTypes.includes(rawType as RentalListing['type'])
    ? (rawType as RentalListing['type'])
    : 'House';
  const monthlyRent = Number(body.monthlyRent);
  const beds = Math.max(1, Number(body.beds ?? 3) || 3);
  const baths = Math.max(1, Number(body.baths ?? 3) || 3);
  const sizeOrFloor = (String(body.sizeOrFloor || '').trim() || '10 Marla').slice(0, 80);
  const furnished: RentalListing['furnished'] =
    String(body.furnished || 'Unfurnished') === 'Furnished' ? 'Furnished' : 'Unfurnished';
  const availableFrom = String(body.availableFrom || 'Immediate').trim().slice(0, 80);
  const securityDeposit = String(body.securityDeposit || "2 months' rent").trim().slice(0, 80);
  const advanceRent = String(body.advanceRent || '1 month').trim().slice(0, 80);
  const minContractPeriod = String(body.minContractPeriod || '11 months').trim().slice(0, 80);
  const amenitiesInput = Array.isArray(body.amenities)
    ? body.amenities.map((a: unknown) => String(a).trim()).filter(Boolean)
    : String(body.amenities || '')
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
  const amenities = (
    amenitiesInput.length > 0
      ? amenitiesInput
      : ['Electricity & Sui Gas Connected', '24/7 Gated Security', 'Reserved Parking']
  ).slice(0, 30);
  const description = (
    String(body.description || '').trim() ||
    `Well-maintained ${furnished.toLowerCase()} ${type.toLowerCase()} available for lease in ${areaSociety || city}.`
  ).slice(0, 5000);

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

function buildFaqFromBody(
  id: string,
  body: Record<string, unknown>
): { ok: true; item: FaqItem } | { ok: false; error: string } {
  const question = String(body.question || '').trim().slice(0, 500);
  const answer = String(body.answer || '').trim().slice(0, 5000);
  const category = String(body.category || '').trim().slice(0, 120);

  if (!question || !answer) {
    return {
      ok: false,
      error: 'Both question and answer are required.',
    };
  }

  const item: FaqItem = {
    id,
    question,
    answer,
    ...(category ? { category } : {}),
  };

  const sizeError = checkCatalogItemSize(item);
  if (sizeError) return { ok: false, error: sizeError };
  return { ok: true, item };
}

function buildReviewFromBody(
  id: string,
  body: Record<string, unknown>
): { ok: true; item: ClientReview } | { ok: false; error: string } {
  const author = String(body.author || '').trim().slice(0, 120);
  const quote = String(body.quote || '').trim().slice(0, 3000);
  const role = (String(body.role || '').trim() || 'Verified Client').slice(0, 120);
  const location = (String(body.location || '').trim() || BRAND_CONFIG.locale.defaultCity).slice(0, 120);
  const propertyContext = (String(body.propertyContext || '').trim() || 'Private Consultation').slice(
    0,
    160
  );
  const rawRating = Number(body.rating ?? 5);
  const rating = Number.isFinite(rawRating)
    ? Math.min(5, Math.max(1, Math.round(rawRating)))
    : 5;
  const date = (
    String(body.date || '').trim() ||
    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  ).slice(0, 64);

  if (!author || !quote) {
    return {
      ok: false,
      error: 'Reviewer name and review quote are required.',
    };
  }

  const item: ClientReview = {
    id,
    quote,
    author,
    role,
    location,
    propertyContext,
    rating,
    date,
  };

  const sizeError = checkCatalogItemSize(item);
  if (sizeError) return { ok: false, error: sizeError };
  return { ok: true, item };
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

async function readOrderedCollection<T extends { id: string }>(collectionName: string): Promise<T[]> {
  try {
    const q = query(
      collection(db, collectionName),
      orderBy('_sortOrder', 'desc'),
      limit(MAX_CATALOG_READ_LIMIT)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      const { _sortOrder: _ignored, ...rest } = data;
      return rest as unknown as T;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collectionName);
  }
}

async function seedSectionBatch(
  collectionName: string,
  items: Array<{ id: string }>
): Promise<void> {
  const baseOrder = Date.now();
  const batch = writeBatch(db);
  items.forEach((item, index) => {
    const ref = doc(db, collectionName, item.id);
    batch.set(ref, {
      ...stripUndefined(item as unknown as Record<string, unknown>),
      _sortOrder: baseOrder - index,
    });
  });
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, collectionName);
  }
}

async function clearCollectionBatch(collectionName: string): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, collectionName), limit(MAX_CATALOG_READ_LIMIT)));
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, collectionName);
  }
}

async function ensureCatalogSeededClient(): Promise<void> {
  if (clientSeededConfirmed) return;

  const metaRef = doc(db, 'catalog_meta', 'state');
  try {
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) {
      const data = metaSnap.data() as Record<string, unknown>;
      clientSeededConfirmed = true;
      if (data.faqsSeeded === true) clientFaqsSeededConfirmed = true;
      if (data.reviewsSeeded === true) clientReviewsSeededConfirmed = true;
      return;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'catalog_meta/state');
  }

  const defaults = getDefaultCatalog();
  await Promise.all([
    seedSectionBatch('catalog_projects', defaults.projects),
    seedSectionBatch('catalog_listings', defaults.listings),
    seedSectionBatch('catalog_buy', defaults.buy),
    seedSectionBatch('catalog_rent', defaults.rent),
    seedSectionBatch('catalog_faqs', defaults.faqs),
    seedSectionBatch('catalog_reviews', defaults.reviews),
  ]);
  try {
    await setDoc(metaRef, {
      seeded: true,
      seededAt: new Date().toISOString(),
      faqsSeeded: true,
      reviewsSeeded: true,
    });
    clientSeededConfirmed = true;
    clientFaqsSeededConfirmed = true;
    clientReviewsSeededConfirmed = true;
    catalogSnapshotCache = defaults;
    await writePublicSnapshotDoc(defaults);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'catalog_meta/state');
  }
}

async function ensureFaqsSeededClient(): Promise<void> {
  if (clientFaqsSeededConfirmed) return;
  await ensureCatalogSeededClient();
  if (clientFaqsSeededConfirmed) return;

  const metaRef = doc(db, 'catalog_meta', 'state');
  try {
    const metaSnap = await getDoc(metaRef);
    const metaData = (metaSnap.exists() ? metaSnap.data() : {}) as Record<string, unknown>;
    if (metaData.faqsSeeded === true) {
      clientFaqsSeededConfirmed = true;
      return;
    }
    const existing = await readOrderedCollection<FaqItem>('catalog_faqs');
    if (existing.length === 0) {
      await seedSectionBatch('catalog_faqs', getDefaultFaqs());
    }
    await setDoc(
      metaRef,
      {
        seeded: Boolean(metaData.seeded ?? true),
        seededAt: String(metaData.seededAt || new Date().toISOString()),
        faqsSeeded: true,
      },
      { merge: true }
    );
    clientFaqsSeededConfirmed = true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'catalog_faqs');
  }
}

async function ensureReviewsSeededClient(): Promise<void> {
  if (clientReviewsSeededConfirmed) return;
  await ensureCatalogSeededClient();
  if (clientReviewsSeededConfirmed) return;

  const metaRef = doc(db, 'catalog_meta', 'state');
  try {
    const metaSnap = await getDoc(metaRef);
    const metaData = (metaSnap.exists() ? metaSnap.data() : {}) as Record<string, unknown>;
    if (metaData.reviewsSeeded === true) {
      clientReviewsSeededConfirmed = true;
      return;
    }
    const existing = await readOrderedCollection<ClientReview>('catalog_reviews');
    if (existing.length === 0) {
      await seedSectionBatch('catalog_reviews', getDefaultReviews());
    }
    await setDoc(
      metaRef,
      {
        seeded: Boolean(metaData.seeded ?? true),
        seededAt: String(metaData.seededAt || new Date().toISOString()),
        reviewsSeeded: true,
      },
      { merge: true }
    );
    clientReviewsSeededConfirmed = true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'catalog_reviews');
  }
}

async function writePublicSnapshotDoc(catalog: CatalogStoreData): Promise<boolean> {
  try {
    const clean = JSON.parse(
      JSON.stringify({
        id: 'public',
        version: Date.now(),
        updatedAt: new Date().toISOString(),
        projects: (catalog.projects || []).slice(0, MAX_CATALOG_READ_LIMIT),
        listings: (catalog.listings || []).slice(0, MAX_CATALOG_READ_LIMIT),
        buy: (catalog.buy || []).slice(0, MAX_CATALOG_READ_LIMIT),
        rent: (catalog.rent || []).slice(0, MAX_CATALOG_READ_LIMIT),
        faqs: (catalog.faqs || []).slice(0, MAX_CATALOG_READ_LIMIT),
        reviews: (catalog.reviews || []).slice(0, MAX_CATALOG_READ_LIMIT),
      })
    ) as Record<string, unknown>;

    const bytes = new TextEncoder().encode(JSON.stringify(clean)).length;
    if (bytes > MAX_SNAPSHOT_DOC_BYTES) {
      console.warn(
        `[Firestore] Public snapshot (${Math.ceil(
          bytes / 1024
        )} KB) exceeds 920 KB cap because of legacy inline base64 photos. Replace old base64 images with cloud URLs.`
      );
      lastSnapshotWriteFailed = true;
      return false;
    }

    await setDoc(doc(db, 'catalog_snapshot', 'public'), clean);
    publicSnapshotExists = true;
    lastSnapshotWriteFailed = false;
    return true;
  } catch (err) {
    console.warn('[Firestore] Could not update catalog_snapshot/public:', err);
    lastSnapshotWriteFailed = true;
    return false;
  }
}

export async function publishPublicCatalogSnapshotFirestore(): Promise<{
  published: boolean;
  snapshotWriteFailed?: boolean;
  error?: string;
}> {
  try {
    const [projects, listings, buy, rent, faqs, reviews] = await Promise.all([
      readOrderedCollection<PortfolioProject>('catalog_projects'),
      readOrderedCollection<PropertyListing>('catalog_listings'),
      readOrderedCollection<BuyProperty>('catalog_buy'),
      readOrderedCollection<RentalListing>('catalog_rent'),
      readOrderedCollection<FaqItem>('catalog_faqs'),
      readOrderedCollection<ClientReview>('catalog_reviews'),
    ]);
    const normalized = normalizeCatalogImages({
      projects,
      listings,
      buy,
      rent,
      faqs: faqs.length > 0 ? faqs : getDefaultFaqs(),
      reviews: reviews.length > 0 ? reviews : getDefaultReviews(),
    });
    catalogSnapshotCache = normalized;
    const ok = await writePublicSnapshotDoc(normalized);
    if (!ok) {
      publicSnapshotExists = false;
    }
    return {
      published: ok,
      snapshotWriteFailed: !ok,
      ...(ok
        ? {}
        : {
            error:
              'Snapshot could not be published (payload may exceed the 920 KB cap due to inline base64 images).',
          }),
    };
  } catch (err) {
    lastSnapshotWriteFailed = true;
    return {
      published: false,
      snapshotWriteFailed: true,
      error: extractMutationError(err, 'Could not publish public catalog snapshot.'),
    };
  }
}

export async function fetchCatalogFromFirestore(): Promise<{
  catalog: CatalogStoreData;
  fromFirestore: boolean;
  fromSnapshot?: boolean;
  snapshotWriteFailed?: boolean;
  quotaExceeded?: boolean;
  fetchFailed?: boolean;
  error?: string;
}> {
  if (inFlightCatalogFetch) {
    return inFlightCatalogFetch;
  }

  inFlightCatalogFetch = (async () => {
    try {
      // 1-Read Optimization: try consolidated /catalog_snapshot/public document first
      const snapshotSnap = await getDoc(doc(db, 'catalog_snapshot', 'public'));
      if (snapshotSnap.exists()) {
        const snapData = snapshotSnap.data() as Partial<CatalogStoreData>;
        const normalized = normalizeCatalogImages({
          projects: Array.isArray(snapData.projects) ? snapData.projects : [],
          listings: Array.isArray(snapData.listings) ? snapData.listings : [],
          buy: Array.isArray(snapData.buy) ? snapData.buy : [],
          rent: Array.isArray(snapData.rent) ? snapData.rent : [],
          faqs: Array.isArray(snapData.faqs) && snapData.faqs.length > 0 ? snapData.faqs : getDefaultFaqs(),
          reviews:
            Array.isArray(snapData.reviews) && snapData.reviews.length > 0
              ? snapData.reviews
              : getDefaultReviews(),
        });
        publicSnapshotExists = true;
        lastSnapshotWriteFailed = false;
        clientSeededConfirmed = true;
        clientFaqsSeededConfirmed = true;
        clientReviewsSeededConfirmed = true;
        catalogSnapshotCache = normalized;
        return {
          catalog: normalized,
          fromFirestore: true,
          fromSnapshot: true,
          snapshotWriteFailed: false,
        };
      }

      publicSnapshotExists = false;

      // Fallback when catalog_snapshot/public has not been published yet
      const metaSnap = await getDoc(doc(db, 'catalog_meta', 'state'));
      if (!metaSnap.exists()) {
        clientSeededConfirmed = false;
        clientFaqsSeededConfirmed = false;
        clientReviewsSeededConfirmed = false;
        return {
          catalog: BRAND_CONFIG.features.showSampleDataOnError
            ? getDefaultCatalog()
            : getEmptyCatalog(),
          fromFirestore: false,
          fromSnapshot: false,
          fetchFailed: !BRAND_CONFIG.features.showSampleDataOnError,
        };
      }
      const metaData = metaSnap.data() as Record<string, unknown>;
      clientSeededConfirmed = true;
      const [projects, listings, buy, rent, faqs, reviews] = await Promise.all([
        readOrderedCollection<PortfolioProject>('catalog_projects'),
        readOrderedCollection<PropertyListing>('catalog_listings'),
        readOrderedCollection<BuyProperty>('catalog_buy'),
        readOrderedCollection<RentalListing>('catalog_rent'),
        readOrderedCollection<FaqItem>('catalog_faqs'),
        readOrderedCollection<ClientReview>('catalog_reviews'),
      ]);

      const faqsSeeded = metaData.faqsSeeded === true || faqs.length > 0;
      const reviewsSeeded = metaData.reviewsSeeded === true || reviews.length > 0;
      clientFaqsSeededConfirmed = metaData.faqsSeeded === true;
      clientReviewsSeededConfirmed = metaData.reviewsSeeded === true;

      const normalized = normalizeCatalogImages({
        projects,
        listings,
        buy,
        rent,
        faqs: faqsSeeded ? faqs : getDefaultFaqs(),
        reviews: reviewsSeeded ? reviews : getDefaultReviews(),
      });
      catalogSnapshotCache = normalized;
      return { catalog: normalized, fromFirestore: true, fromSnapshot: false };
    } catch (err) {
      const fallbackOnMissingCache = BRAND_CONFIG.features.showSampleDataOnError
        ? getDefaultCatalog()
        : getEmptyCatalog();

      if (isFirestoreQuotaError(err)) {
        const msg = formatFirestoreQuotaMessage(err);
        console.warn(msg);
        return {
          catalog: catalogSnapshotCache || fallbackOnMissingCache,
          fromFirestore: Boolean(catalogSnapshotCache),
          quotaExceeded: true,
          fetchFailed: !catalogSnapshotCache,
          error: msg,
        };
      }
      try {
        handleFirestoreError(err, OperationType.GET, 'catalog_snapshot/public');
      } catch {
        // Fall back safely to cached or defaults on offline/error
      }
      return {
        catalog: catalogSnapshotCache || fallbackOnMissingCache,
        fromFirestore: Boolean(catalogSnapshotCache),
        fetchFailed: !catalogSnapshotCache,
      };
    } finally {
      inFlightCatalogFetch = null;
    }
  })();

  return inFlightCatalogFetch;
}

function extractMutationError(err: unknown, fallback: string): string {
  if (isFirestoreQuotaError(err)) {
    return formatFirestoreQuotaMessage(err);
  }
  if (err instanceof Error) {
    if (err.message.includes('Missing or insufficient permissions')) {
      return 'Firestore permission denied. Sign in with the verified management Google account.';
    }
  }
  return fallback;
}

async function resolveNextCatalogSnapshot(
  updater: (current: CatalogStoreData) => CatalogStoreData
): Promise<{ catalog: CatalogStoreData; snapshotPublished: boolean }> {
  if (catalogSnapshotCache) {
    catalogSnapshotCache = normalizeCatalogImages(updater(catalogSnapshotCache));
  } else {
    const { catalog } = await fetchCatalogFromFirestore();
    catalogSnapshotCache = normalizeCatalogImages(updater(catalog));
  }
  const snapshotPublished = await writePublicSnapshotDoc(catalogSnapshotCache);
  return { catalog: catalogSnapshotCache, snapshotPublished };
}

export async function addProjectFirestore(
  input: Record<string, unknown>
): Promise<CatalogMutationResult> {
  const built = buildProjectFromBody(generateId('proj'), input);
  if (!built.ok) return { success: false, error: built.error };

  const path = `catalog_projects/${built.item.id}`;
  try {
    await ensureCatalogSeededClient();
    await setDoc(doc(db, 'catalog_projects', built.item.id), {
      ...stripUndefined(built.item as unknown as Record<string, unknown>),
      _sortOrder: Date.now(),
    });
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      projects: [built.item, ...prev.projects.filter((p) => p.id !== built.item.id)],
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not add project.') };
  }
}

export async function updateProjectFirestore(
  id: string,
  input: Record<string, unknown>
): Promise<CatalogMutationResult> {
  const built = buildProjectFromBody(id, input);
  if (!built.ok) return { success: false, error: built.error };

  try {
    await ensureCatalogSeededClient();
    const projRef = doc(db, 'catalog_projects', id);
    const projSnap = await getDoc(projRef);
    if (projSnap.exists()) {
      const existingData = projSnap.data() as Record<string, unknown>;
      const sortOrder =
        typeof existingData._sortOrder === 'number' ? existingData._sortOrder : Date.now();
      await setDoc(projRef, {
        ...stripUndefined(built.item as unknown as Record<string, unknown>),
        _sortOrder: sortOrder,
      });
      const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => (p.id === id ? built.item : p)),
      }));
      return { success: true, catalog, snapshotPublished };
    }

    const listRef = doc(db, 'catalog_listings', id);
    const listSnap = await getDoc(listRef);
    if (!listSnap.exists()) {
      return { success: false, error: 'Project item not found.' };
    }
    const existingList = listSnap.data() as PropertyListing & { _sortOrder?: number };
    const sortOrder =
      typeof existingList._sortOrder === 'number' ? existingList._sortOrder : Date.now();
    const updatedList = mapProjectToPropertyListing(existingList, built.item);
    await setDoc(listRef, {
      ...stripUndefined(updatedList as unknown as Record<string, unknown>),
      _sortOrder: sortOrder,
    });
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      listings: prev.listings.map((l) => (l.id === id ? updatedList : l)),
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    return { success: false, error: extractMutationError(err, 'Could not update project.') };
  }
}

export async function removeProjectFirestore(id: string): Promise<CatalogMutationResult> {
  try {
    await ensureCatalogSeededClient();
    const projRef = doc(db, 'catalog_projects', id);
    const listRef = doc(db, 'catalog_listings', id);
    const [projSnap, listSnap] = await Promise.all([getDoc(projRef), getDoc(listRef)]);
    if (!projSnap.exists() && !listSnap.exists()) {
      return { success: false, error: 'Project item not found.' };
    }
    const ops: Promise<void>[] = [];
    if (projSnap.exists()) ops.push(deleteDoc(projRef));
    if (listSnap.exists()) ops.push(deleteDoc(listRef));
    await Promise.all(ops);
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
      listings: prev.listings.filter((l) => l.id !== id),
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    return { success: false, error: extractMutationError(err, 'Could not remove project.') };
  }
}

export async function addBuyFirestore(
  input: Record<string, unknown>
): Promise<CatalogMutationResult> {
  const built = buildBuyFromBody(generateId('buy'), input);
  if (!built.ok) return { success: false, error: built.error };

  const path = `catalog_buy/${built.item.id}`;
  try {
    await ensureCatalogSeededClient();
    await setDoc(doc(db, 'catalog_buy', built.item.id), {
      ...stripUndefined(built.item as unknown as Record<string, unknown>),
      _sortOrder: Date.now(),
    });
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      buy: [built.item, ...prev.buy.filter((b) => b.id !== built.item.id)],
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not add property.') };
  }
}

export async function updateBuyFirestore(
  id: string,
  input: Record<string, unknown>
): Promise<CatalogMutationResult> {
  const built = buildBuyFromBody(id, input);
  if (!built.ok) return { success: false, error: built.error };

  const path = `catalog_buy/${id}`;
  try {
    await ensureCatalogSeededClient();
    const ref = doc(db, 'catalog_buy', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { success: false, error: 'Property not found.' };
    }
    const existingData = snap.data() as Record<string, unknown>;
    const sortOrder =
      typeof existingData._sortOrder === 'number' ? existingData._sortOrder : Date.now();
    await setDoc(ref, {
      ...stripUndefined(built.item as unknown as Record<string, unknown>),
      _sortOrder: sortOrder,
    });
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      buy: prev.buy.map((b) => (b.id === id ? built.item : b)),
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not update property.') };
  }
}

export async function removeBuyFirestore(id: string): Promise<CatalogMutationResult> {
  const path = `catalog_buy/${id}`;
  try {
    await ensureCatalogSeededClient();
    const ref = doc(db, 'catalog_buy', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { success: false, error: 'Property not found.' };
    }
    await deleteDoc(ref);
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      buy: prev.buy.filter((b) => b.id !== id),
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.DELETE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not remove property.') };
  }
}

export async function addRentFirestore(
  input: Record<string, unknown>
): Promise<CatalogMutationResult> {
  const built = buildRentFromBody(generateId('rent'), input);
  if (!built.ok) return { success: false, error: built.error };

  const path = `catalog_rent/${built.item.id}`;
  try {
    await ensureCatalogSeededClient();
    await setDoc(doc(db, 'catalog_rent', built.item.id), {
      ...stripUndefined(built.item as unknown as Record<string, unknown>),
      _sortOrder: Date.now(),
    });
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      rent: [built.item, ...prev.rent.filter((r) => r.id !== built.item.id)],
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not add rental listing.') };
  }
}

export async function updateRentFirestore(
  id: string,
  input: Record<string, unknown>
): Promise<CatalogMutationResult> {
  const built = buildRentFromBody(id, input);
  if (!built.ok) return { success: false, error: built.error };

  const path = `catalog_rent/${id}`;
  try {
    await ensureCatalogSeededClient();
    const ref = doc(db, 'catalog_rent', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { success: false, error: 'Rental listing not found.' };
    }
    const existingData = snap.data() as Record<string, unknown>;
    const sortOrder =
      typeof existingData._sortOrder === 'number' ? existingData._sortOrder : Date.now();
    await setDoc(ref, {
      ...stripUndefined(built.item as unknown as Record<string, unknown>),
      _sortOrder: sortOrder,
    });
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      rent: prev.rent.map((r) => (r.id === id ? built.item : r)),
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not update rental listing.') };
  }
}

export async function removeRentFirestore(id: string): Promise<CatalogMutationResult> {
  const path = `catalog_rent/${id}`;
  try {
    await ensureCatalogSeededClient();
    const ref = doc(db, 'catalog_rent', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { success: false, error: 'Rental listing not found.' };
    }
    await deleteDoc(ref);
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      rent: prev.rent.filter((r) => r.id !== id),
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.DELETE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not remove rental listing.') };
  }
}

export async function addFaqFirestore(
  input: Record<string, unknown>
): Promise<CatalogMutationResult> {
  const built = buildFaqFromBody(generateId('faq'), input);
  if (!built.ok) return { success: false, error: built.error };

  const path = `catalog_faqs/${built.item.id}`;
  try {
    await ensureFaqsSeededClient();
    await setDoc(doc(db, 'catalog_faqs', built.item.id), {
      ...stripUndefined(built.item as unknown as Record<string, unknown>),
      _sortOrder: Date.now(),
    });
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      faqs: [built.item, ...(prev.faqs || []).filter((f) => f.id !== built.item.id)],
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not add FAQ.') };
  }
}

export async function updateFaqFirestore(
  id: string,
  input: Record<string, unknown>
): Promise<CatalogMutationResult> {
  const built = buildFaqFromBody(id, input);
  if (!built.ok) return { success: false, error: built.error };

  const path = `catalog_faqs/${id}`;
  try {
    await ensureFaqsSeededClient();
    const ref = doc(db, 'catalog_faqs', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { success: false, error: 'FAQ not found.' };
    }
    const existingData = snap.data() as Record<string, unknown>;
    const sortOrder =
      typeof existingData._sortOrder === 'number' ? existingData._sortOrder : Date.now();
    await setDoc(ref, {
      ...stripUndefined(built.item as unknown as Record<string, unknown>),
      _sortOrder: sortOrder,
    });
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      faqs: (prev.faqs || []).map((f) => (f.id === id ? built.item : f)),
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not update FAQ.') };
  }
}

export async function removeFaqFirestore(id: string): Promise<CatalogMutationResult> {
  const path = `catalog_faqs/${id}`;
  try {
    await ensureFaqsSeededClient();
    const ref = doc(db, 'catalog_faqs', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { success: false, error: 'FAQ not found.' };
    }
    await deleteDoc(ref);
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      faqs: (prev.faqs || []).filter((f) => f.id !== id),
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.DELETE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not remove FAQ.') };
  }
}

export async function addReviewFirestore(
  input: Record<string, unknown>
): Promise<CatalogMutationResult> {
  const built = buildReviewFromBody(generateId('rev'), input);
  if (!built.ok) return { success: false, error: built.error };

  const path = `catalog_reviews/${built.item.id}`;
  try {
    await ensureReviewsSeededClient();
    await setDoc(doc(db, 'catalog_reviews', built.item.id), {
      ...stripUndefined(built.item as unknown as Record<string, unknown>),
      _sortOrder: Date.now(),
    });
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      reviews: [built.item, ...(prev.reviews || []).filter((r) => r.id !== built.item.id)],
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not add review.') };
  }
}

export async function updateReviewFirestore(
  id: string,
  input: Record<string, unknown>
): Promise<CatalogMutationResult> {
  const built = buildReviewFromBody(id, input);
  if (!built.ok) return { success: false, error: built.error };

  const path = `catalog_reviews/${id}`;
  try {
    await ensureReviewsSeededClient();
    const ref = doc(db, 'catalog_reviews', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { success: false, error: 'Review not found.' };
    }
    const existingData = snap.data() as Record<string, unknown>;
    const sortOrder =
      typeof existingData._sortOrder === 'number' ? existingData._sortOrder : Date.now();
    await setDoc(ref, {
      ...stripUndefined(built.item as unknown as Record<string, unknown>),
      _sortOrder: sortOrder,
    });
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      reviews: (prev.reviews || []).map((r) => (r.id === id ? built.item : r)),
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not update review.') };
  }
}

export async function removeReviewFirestore(id: string): Promise<CatalogMutationResult> {
  const path = `catalog_reviews/${id}`;
  try {
    await ensureReviewsSeededClient();
    const ref = doc(db, 'catalog_reviews', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { success: false, error: 'Review not found.' };
    }
    await deleteDoc(ref);
    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => ({
      ...prev,
      reviews: (prev.reviews || []).filter((r) => r.id !== id),
    }));
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.DELETE, path);
    } catch {
      // Logged
    }
    return { success: false, error: extractMutationError(err, 'Could not remove review.') };
  }
}

export async function resetCatalogFirestore(
  section: 'projects' | 'buy' | 'rent' | 'faqs' | 'reviews' | 'all'
): Promise<CatalogMutationResult> {
  try {
    const defaults = getDefaultCatalog();
    const metaRef = doc(db, 'catalog_meta', 'state');

    if (section === 'projects') {
      await Promise.all([
        clearCollectionBatch('catalog_projects'),
        clearCollectionBatch('catalog_listings'),
      ]);
      await Promise.all([
        seedSectionBatch('catalog_projects', defaults.projects),
        seedSectionBatch('catalog_listings', defaults.listings),
      ]);
      await setDoc(
        metaRef,
        { seeded: true, seededAt: new Date().toISOString() },
        { merge: true }
      );
    } else if (section === 'buy') {
      await clearCollectionBatch('catalog_buy');
      await seedSectionBatch('catalog_buy', defaults.buy);
      await setDoc(
        metaRef,
        { seeded: true, seededAt: new Date().toISOString() },
        { merge: true }
      );
    } else if (section === 'rent') {
      await clearCollectionBatch('catalog_rent');
      await seedSectionBatch('catalog_rent', defaults.rent);
      await setDoc(
        metaRef,
        { seeded: true, seededAt: new Date().toISOString() },
        { merge: true }
      );
    } else if (section === 'faqs') {
      await clearCollectionBatch('catalog_faqs');
      await seedSectionBatch('catalog_faqs', defaults.faqs);
      await setDoc(
        metaRef,
        { seeded: true, seededAt: new Date().toISOString(), faqsSeeded: true },
        { merge: true }
      );
      clientFaqsSeededConfirmed = true;
    } else if (section === 'reviews') {
      await clearCollectionBatch('catalog_reviews');
      await seedSectionBatch('catalog_reviews', defaults.reviews);
      await setDoc(
        metaRef,
        { seeded: true, seededAt: new Date().toISOString(), reviewsSeeded: true },
        { merge: true }
      );
      clientReviewsSeededConfirmed = true;
    } else {
      await Promise.all([
        clearCollectionBatch('catalog_projects'),
        clearCollectionBatch('catalog_listings'),
        clearCollectionBatch('catalog_buy'),
        clearCollectionBatch('catalog_rent'),
        clearCollectionBatch('catalog_faqs'),
        clearCollectionBatch('catalog_reviews'),
      ]);
      await Promise.all([
        seedSectionBatch('catalog_projects', defaults.projects),
        seedSectionBatch('catalog_listings', defaults.listings),
        seedSectionBatch('catalog_buy', defaults.buy),
        seedSectionBatch('catalog_rent', defaults.rent),
        seedSectionBatch('catalog_faqs', defaults.faqs),
        seedSectionBatch('catalog_reviews', defaults.reviews),
      ]);
      await setDoc(metaRef, {
        seeded: true,
        seededAt: new Date().toISOString(),
        faqsSeeded: true,
        reviewsSeeded: true,
      });
      clientFaqsSeededConfirmed = true;
      clientReviewsSeededConfirmed = true;
    }

    clientSeededConfirmed = true;

    const { catalog, snapshotPublished } = await resolveNextCatalogSnapshot((prev) => {
      if (section === 'projects') {
        return { ...prev, projects: defaults.projects, listings: defaults.listings };
      }
      if (section === 'buy') {
        return { ...prev, buy: defaults.buy };
      }
      if (section === 'rent') {
        return { ...prev, rent: defaults.rent };
      }
      if (section === 'faqs') {
        return { ...prev, faqs: defaults.faqs };
      }
      if (section === 'reviews') {
        return { ...prev, reviews: defaults.reviews };
      }
      return defaults;
    });
    return { success: true, catalog, snapshotPublished };
  } catch (err) {
    return { success: false, error: extractMutationError(err, 'Could not restore defaults.') };
  }
}
