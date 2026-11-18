import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PORTFOLIO_PROJECTS, PROPERTY_LISTINGS } from '../data/realEstateData';
import { BUY_PROPERTIES, BuyProperty } from '../data/buyPropertiesData';
import { RENTAL_LISTINGS } from '../data/rentalsData';
import {
  PortfolioProject,
  PropertyListing,
  RentalListing,
  ProjectStatus,
  BuyStatus,
  RentStatus,
  FaqItem,
  ClientReview,
} from '../types';
import { useAuth } from './AuthContext';
import { auth } from '../lib/firebase';
import { BRAND_CONFIG } from '../config/brand.config';
import { IS_STATIC_MODE, parseApiResponse, SERVER_UNREACHABLE_MESSAGE } from '../lib/http';
import {
  addBuyFirestore,
  addFaqFirestore,
  addProjectFirestore,
  addRentFirestore,
  addReviewFirestore,
  CatalogMutationResult,
  CatalogStoreData,
  fetchCatalogFromFirestore,
  getDefaultFaqs,
  getDefaultReviews,
  hasPublicCatalogSnapshot,
  hasSnapshotWriteFailed,
  hydrateCatalogFirestoreSnapshot,
  publishPublicCatalogSnapshotFirestore,
  removeBuyFirestore,
  removeFaqFirestore,
  removeProjectFirestore,
  removeRentFirestore,
  removeReviewFirestore,
  resetCatalogFirestore,
  updateBuyFirestore,
  updateFaqFirestore,
  updateProjectFirestore,
  updateRentFirestore,
  updateReviewFirestore,
} from '../lib/catalogFirestore';

export type CityOption = string;
export type CatalogStorageMode = 'backend' | 'firestore' | 'defaults';

const CATALOG_CACHE_KEY = `${BRAND_CONFIG.identity.storageKeyPrefix}_catalog_cache_v2`;
const QUOTA_COOLDOWN_KEY = `${BRAND_CONFIG.identity.storageKeyPrefix}_fs_quota_cooldown_until`;
const BACKEND_OFFLINE_SESSION_KEY = `${BRAND_CONFIG.identity.storageKeyPrefix}_backend_unreachable_session`;

export const CATALOG_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const QUOTA_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown after quota exhaustion

interface BrowserCatalogCache {
  cachedAt: number;
  storageMode: CatalogStorageMode;
  catalog: CatalogStoreData;
}

let memoryCatalogCache: BrowserCatalogCache | null = null;

function isValidCatalogData(candidate: unknown): candidate is CatalogStoreData {
  if (!candidate || typeof candidate !== 'object') return false;
  const c = candidate as Record<string, unknown>;
  return (
    Array.isArray(c.projects) &&
    Array.isArray(c.listings) &&
    Array.isArray(c.buy) &&
    Array.isArray(c.rent) &&
    Array.isArray(c.faqs) &&
    Array.isArray(c.reviews)
  );
}

function readBrowserCatalogCache(allowExpired = false): BrowserCatalogCache | null {
  const now = Date.now();
  if (
    memoryCatalogCache &&
    (allowExpired || now - memoryCatalogCache.cachedAt < CATALOG_CACHE_TTL_MS)
  ) {
    return memoryCatalogCache;
  }

  try {
    const raw =
      localStorage.getItem(CATALOG_CACHE_KEY) || sessionStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BrowserCatalogCache>;
    if (typeof parsed.cachedAt !== 'number' || !isValidCatalogData(parsed.catalog)) {
      localStorage.removeItem(CATALOG_CACHE_KEY);
      sessionStorage.removeItem(CATALOG_CACHE_KEY);
      return null;
    }
    const isFresh = now - parsed.cachedAt < CATALOG_CACHE_TTL_MS;
    if (!isFresh && !allowExpired) {
      return null;
    }
    const mode: CatalogStorageMode =
      parsed.storageMode === 'backend' || parsed.storageMode === 'firestore'
        ? parsed.storageMode
        : 'defaults';
    const valid: BrowserCatalogCache = {
      cachedAt: parsed.cachedAt,
      storageMode: mode,
      catalog: parsed.catalog,
    };
    memoryCatalogCache = valid;
    return valid;
  } catch {
    return null;
  }
}

function writeBrowserCatalogCache(catalog: CatalogStoreData, mode: CatalogStorageMode): number {
  const cachedAt = Date.now();
  const entry: BrowserCatalogCache = { cachedAt, storageMode: mode, catalog };
  memoryCatalogCache = entry;
  hydrateCatalogFirestoreSnapshot(catalog);

  try {
    const serialized = JSON.stringify(entry);
    try {
      localStorage.setItem(CATALOG_CACHE_KEY, serialized);
      sessionStorage.removeItem(CATALOG_CACHE_KEY);
    } catch {
      // Storage quota exceeded: fall back cleanly to in-memory cache without throwing
      localStorage.removeItem(CATALOG_CACHE_KEY);
      try {
        sessionStorage.setItem(CATALOG_CACHE_KEY, serialized);
      } catch {
        sessionStorage.removeItem(CATALOG_CACHE_KEY);
      }
    }
  } catch {
    // Serialization/storage unavailable; memoryCatalogCache still protects this tab
  }
  return cachedAt;
}

function isQuotaCooldownActive(): boolean {
  try {
    const raw = localStorage.getItem(QUOTA_COOLDOWN_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until) || Date.now() >= until) {
      localStorage.removeItem(QUOTA_COOLDOWN_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function setQuotaCooldown(): void {
  try {
    localStorage.setItem(QUOTA_COOLDOWN_KEY, String(Date.now() + QUOTA_COOLDOWN_MS));
  } catch {
    // Ignore storage restriction
  }
}

function clearQuotaCooldown(): void {
  try {
    localStorage.removeItem(QUOTA_COOLDOWN_KEY);
  } catch {
    // Ignore
  }
}

function isSessionBackendOffline(): boolean {
  try {
    return sessionStorage.getItem(BACKEND_OFFLINE_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markSessionBackendOffline(offline: boolean): void {
  try {
    if (offline) {
      sessionStorage.setItem(BACKEND_OFFLINE_SESSION_KEY, '1');
    } else {
      sessionStorage.removeItem(BACKEND_OFFLINE_SESSION_KEY);
    }
  } catch {
    // Ignore
  }
}

export interface NewProjectInput {
  title: string;
  location: string;
  category: CityOption;
  valuation: string;
  size: string;
  beds: number;
  baths: number;
  projectDelivered: string;
  architect: string;
  summary: string;
  image: string;
  gallery?: string[];
  status?: ProjectStatus;
}

export interface NewBuyInput {
  title: string;
  city: CityOption;
  location: string;
  type: 'House' | 'Apartment' | 'Plot';
  price: string;
  area: string;
  beds: number;
  baths: number;
  image: string;
  gallery?: string[];
  description: string;
  features: string;
  possession: string;
  nocStatus: string;
  status?: BuyStatus;
}

export interface NewRentInput {
  title: string;
  city: CityOption;
  areaSociety: string;
  type: 'Apartment' | 'House' | 'Upper Portion' | 'Lower Portion';
  monthlyRent: number;
  beds: number;
  baths: number;
  sizeOrFloor: string;
  furnished: 'Furnished' | 'Unfurnished';
  image: string;
  gallery?: string[];
  availableFrom: string;
  securityDeposit: string;
  advanceRent: string;
  minContractPeriod: string;
  amenities: string;
  description: string;
  status?: RentStatus;
}

export interface NewFaqInput {
  question: string;
  answer: string;
  category?: string;
}

export interface NewReviewInput {
  quote: string;
  author: string;
  role: string;
  location: string;
  propertyContext: string;
  rating: number;
  date: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

interface CatalogContextType {
  portfolioProjects: PortfolioProject[];
  propertyListings: PropertyListing[];
  buyProperties: BuyProperty[];
  rentalListings: RentalListing[];
  faqs: FaqItem[];
  clientReviews: ClientReview[];
  loading: boolean;
  backendReachable: boolean;
  storageMode: CatalogStorageMode;
  cacheUpdatedAt: number | null;
  quotaError: string | null;
  snapshotSynced: boolean | null;
  snapshotWriteFailed: boolean;
  catalogUnavailable: boolean;
  refreshCatalog: (force?: boolean) => Promise<void>;
  publishSnapshot: () => Promise<{ published: boolean; snapshotWriteFailed?: boolean; error?: string }>;
  addProject: (input: NewProjectInput) => Promise<ActionResult>;
  updateProject: (id: string, input: NewProjectInput) => Promise<ActionResult>;
  removeProject: (id: string) => Promise<ActionResult>;
  addBuyProperty: (input: NewBuyInput) => Promise<ActionResult>;
  updateBuy: (id: string, input: NewBuyInput) => Promise<ActionResult>;
  removeBuyProperty: (id: string) => Promise<ActionResult>;
  addRentalListing: (input: NewRentInput) => Promise<ActionResult>;
  updateRental: (id: string, input: NewRentInput) => Promise<ActionResult>;
  removeRentalListing: (id: string) => Promise<ActionResult>;
  addFaq: (input: NewFaqInput) => Promise<ActionResult>;
  updateFaq: (id: string, input: NewFaqInput) => Promise<ActionResult>;
  removeFaq: (id: string) => Promise<ActionResult>;
  addReview: (input: NewReviewInput) => Promise<ActionResult>;
  updateReview: (id: string, input: NewReviewInput) => Promise<ActionResult>;
  removeReview: (id: string) => Promise<ActionResult>;
  resetCatalog: (
    section: 'projects' | 'buy' | 'rent' | 'faqs' | 'reviews' | 'all'
  ) => Promise<ActionResult>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const adminPanelEnabled = BRAND_CONFIG.features.enableAdminPanel;
  const initialCache = adminPanelEnabled ? readBrowserCatalogCache() : null;
  if (initialCache) {
    hydrateCatalogFirestoreSnapshot(initialCache.catalog);
  }

  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>(
    initialCache?.catalog.projects || PORTFOLIO_PROJECTS
  );
  const [propertyListings, setPropertyListings] = useState<PropertyListing[]>(
    initialCache?.catalog.listings || PROPERTY_LISTINGS
  );
  const [buyProperties, setBuyProperties] = useState<BuyProperty[]>(
    initialCache?.catalog.buy || BUY_PROPERTIES
  );
  const [rentalListings, setRentalListings] = useState<RentalListing[]>(
    initialCache?.catalog.rent || RENTAL_LISTINGS
  );
  const [faqs, setFaqs] = useState<FaqItem[]>(() => initialCache?.catalog.faqs || getDefaultFaqs());
  const [clientReviews, setClientReviews] = useState<ClientReview[]>(
    () => initialCache?.catalog.reviews || getDefaultReviews()
  );
  const [loading, setLoading] = useState<boolean>(adminPanelEnabled ? !initialCache : false);
  const [backendReachable, setBackendReachable] = useState<boolean>(
    adminPanelEnabled && initialCache ? initialCache.storageMode === 'backend' : !adminPanelEnabled ? false : true
  );
  const [storageMode, setStorageMode] = useState<CatalogStorageMode>(
    adminPanelEnabled ? initialCache?.storageMode || 'defaults' : 'defaults'
  );
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<number | null>(
    initialCache?.cachedAt || null
  );
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [snapshotSynced, setSnapshotSynced] = useState<boolean | null>(() =>
    adminPanelEnabled ? hasPublicCatalogSnapshot() : null
  );
  const [snapshotWriteFailed, setSnapshotWriteFailed] = useState<boolean>(() =>
    adminPanelEnabled ? hasSnapshotWriteFailed() : false
  );
  const [catalogUnavailable, setCatalogUnavailable] = useState<boolean>(false);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);
  const { isManagement, managementToken, firebaseUser, logout } = useAuth();

  const buildAuthHeaders = useCallback(
    async (json = true): Promise<Record<string, string>> => {
      const headers: Record<string, string> = {};
      if (json) headers['Content-Type'] = 'application/json';
      let fbToken = '';
      if (firebaseUser) {
        try {
          fbToken = await firebaseUser.getIdToken();
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
      return headers;
    },
    [managementToken, firebaseUser]
  );

  const applyCatalogPayload = useCallback((catalog: any, mode?: CatalogStorageMode) => {
    if (!catalog) return;
    if (Array.isArray(catalog.projects)) setPortfolioProjects(catalog.projects);
    if (Array.isArray(catalog.listings)) setPropertyListings(catalog.listings);
    if (Array.isArray(catalog.buy)) setBuyProperties(catalog.buy);
    if (Array.isArray(catalog.rent)) setRentalListings(catalog.rent);
    if (Array.isArray(catalog.faqs)) setFaqs(catalog.faqs);
    if (Array.isArray(catalog.reviews)) setClientReviews(catalog.reviews);

    if (mode && isValidCatalogData(catalog)) {
      const updatedTs = writeBrowserCatalogCache(catalog, mode);
      setCacheUpdatedAt(updatedTs);
    }
  }, []);

  const refreshCatalog = useCallback(
    async (force = false) => {
      if (!BRAND_CONFIG.features.enableAdminPanel) {
        setLoading(false);
        return;
      }
      if (!force) {
        const cached = readBrowserCatalogCache(false);
        if (cached) {
          applyCatalogPayload(cached.catalog);
          setBackendReachable(cached.storageMode === 'backend');
          setStorageMode(cached.storageMode);
          setCacheUpdatedAt(cached.cachedAt);
          setLoading(false);
          return;
        }
      }

      if (inFlightRefreshRef.current) {
        return inFlightRefreshRef.current;
      }

      const task = (async () => {
        const skipBackendProbe = IS_STATIC_MODE || (!force && isSessionBackendOffline());
        if (!skipBackendProbe) {
          try {
            const url = force ? '/api/catalog?refresh=1' : '/api/catalog';
            const res = await fetch(url, force ? { cache: 'no-store' } : undefined);
            const parsed = await parseApiResponse<{ success?: boolean; catalog?: any }>(res);
            if (parsed.ok && parsed.data?.success && parsed.data.catalog) {
              markSessionBackendOffline(false);
              clearQuotaCooldown();
              setQuotaError(null);
              setCatalogUnavailable(false);
              setBackendReachable(true);
              setStorageMode('backend');
              applyCatalogPayload(parsed.data.catalog, 'backend');
              return;
            }
          } catch (err) {
            console.warn('Could not fetch catalog from backend, using Firestore fallback:', err);
          }
          markSessionBackendOffline(true);
        }

        setBackendReachable(false);

        if (!force && isQuotaCooldownActive()) {
          const stale = readBrowserCatalogCache(true);
          if (stale) {
            applyCatalogPayload(stale.catalog);
            setStorageMode(stale.storageMode);
            setCacheUpdatedAt(stale.cachedAt);
            setCatalogUnavailable(false);
            setQuotaError(
              'Firestore daily quota cooldown active. Showing saved listings cached in your browser.'
            );
            return;
          }
        }

        const fsRes = await fetchCatalogFromFirestore();
        setSnapshotSynced(fsRes.fromSnapshot ?? hasPublicCatalogSnapshot());
        setSnapshotWriteFailed(
          Boolean(fsRes.snapshotWriteFailed ?? hasSnapshotWriteFailed())
        );

        if (fsRes.quotaExceeded && fsRes.error) {
          setQuotaCooldown();
          setQuotaError(fsRes.error);
          const stale = readBrowserCatalogCache(true);
          if (stale && !fsRes.fromFirestore) {
            applyCatalogPayload(stale.catalog);
            setStorageMode(stale.storageMode);
            setCacheUpdatedAt(stale.cachedAt);
            setCatalogUnavailable(false);
            return;
          }
        } else {
          clearQuotaCooldown();
          setQuotaError(null);
        }

        if (fsRes.fetchFailed && !fsRes.fromFirestore && !BRAND_CONFIG.features.showSampleDataOnError) {
          setCatalogUnavailable(true);
          setStorageMode('defaults');
          applyCatalogPayload(fsRes.catalog);
          return;
        }

        setCatalogUnavailable(false);
        const mode: CatalogStorageMode = fsRes.fromFirestore ? 'firestore' : 'defaults';
        setStorageMode(mode);
        applyCatalogPayload(fsRes.catalog, mode);
      })().finally(() => {
        setLoading(false);
        inFlightRefreshRef.current = null;
      });

      inFlightRefreshRef.current = task;
      return task;
    },
    [applyCatalogPayload]
  );

  const publishSnapshot = useCallback(async () => {
    const res = await publishPublicCatalogSnapshotFirestore();
    if (res.published) {
      setSnapshotSynced(true);
      setSnapshotWriteFailed(false);
    } else {
      setSnapshotSynced(false);
      setSnapshotWriteFailed(Boolean(res.snapshotWriteFailed ?? hasSnapshotWriteFailed()));
    }
    return res;
  }, []);

  useEffect(() => {
    void refreshCatalog(false);
  }, [refreshCatalog]);

  const runFirestoreFallback = async (
    firestoreFn: () => Promise<CatalogMutationResult>,
    fallbackError: string
  ): Promise<ActionResult> => {
    if (!BRAND_CONFIG.features.enableAdminPanel) {
      return { success: false, error: 'Catalog management is disabled.' };
    }
    if (!isManagement || !auth?.currentUser?.emailVerified) {
      return {
        success: false,
        error:
          'Direct Firestore management requires signing in with the verified management Google account.',
      };
    }

    const fsRes = await firestoreFn();
    if (fsRes.success && fsRes.catalog) {
      setQuotaError(null);
      setCatalogUnavailable(false);
      if (typeof fsRes.snapshotPublished === 'boolean') {
        setSnapshotSynced(fsRes.snapshotPublished);
        setSnapshotWriteFailed(!fsRes.snapshotPublished || hasSnapshotWriteFailed());
      } else {
        setSnapshotWriteFailed(hasSnapshotWriteFailed());
      }
      setStorageMode('firestore');
      applyCatalogPayload(fsRes.catalog, 'firestore');
      return { success: true };
    }
    return { success: false, error: fsRes.error || fallbackError || SERVER_UNREACHABLE_MESSAGE };
  };

  const executeMutation = async (
    url: string,
    method: 'POST' | 'PUT' | 'DELETE',
    bodyPayload: unknown,
    fallbackError: string,
    firestoreFn: () => Promise<CatalogMutationResult>
  ): Promise<ActionResult> => {
    if (IS_STATIC_MODE) {
      setBackendReachable(false);
      return runFirestoreFallback(firestoreFn, fallbackError);
    }
    try {
      const headers = await buildAuthHeaders(bodyPayload !== undefined);
      const res = await fetch(url, {
        method,
        headers,
        body: bodyPayload !== undefined ? JSON.stringify(bodyPayload) : undefined,
      });
      const parsed = await parseApiResponse<{
        success?: boolean;
        catalog?: any;
        error?: string;
      }>(res);

      if (parsed.unreachable || !parsed.data) {
        setBackendReachable(false);
        return runFirestoreFallback(firestoreFn, fallbackError);
      }

      setBackendReachable(true);

      if (parsed.status === 401) {
        void logout();
        return {
          success: false,
          error: parsed.data.error || 'Management session expired. Please sign in again.',
        };
      }

      if (!parsed.ok || !parsed.data.success) {
        return { success: false, error: parsed.data.error || fallbackError };
      }

      setStorageMode('backend');
      applyCatalogPayload(parsed.data.catalog, 'backend');
      return { success: true };
    } catch {
      setBackendReachable(false);
      return runFirestoreFallback(firestoreFn, fallbackError);
    }
  };

  const addProject = (input: NewProjectInput) =>
    executeMutation(
      '/api/catalog/projects',
      'POST',
      input,
      'Could not add project.',
      () => addProjectFirestore(input as unknown as Record<string, unknown>)
    );

  const updateProject = (id: string, input: NewProjectInput) =>
    executeMutation(
      `/api/catalog/projects/${encodeURIComponent(id)}`,
      'PUT',
      input,
      'Could not update project.',
      () => updateProjectFirestore(id, input as unknown as Record<string, unknown>)
    );

  const removeProject = (id: string) =>
    executeMutation(
      `/api/catalog/projects/${encodeURIComponent(id)}`,
      'DELETE',
      undefined,
      'Could not remove project.',
      () => removeProjectFirestore(id)
    );

  const addBuyProperty = (input: NewBuyInput) =>
    executeMutation(
      '/api/catalog/buy',
      'POST',
      input,
      'Could not add property.',
      () => addBuyFirestore(input as unknown as Record<string, unknown>)
    );

  const updateBuy = (id: string, input: NewBuyInput) =>
    executeMutation(
      `/api/catalog/buy/${encodeURIComponent(id)}`,
      'PUT',
      input,
      'Could not update property.',
      () => updateBuyFirestore(id, input as unknown as Record<string, unknown>)
    );

  const removeBuyProperty = (id: string) =>
    executeMutation(
      `/api/catalog/buy/${encodeURIComponent(id)}`,
      'DELETE',
      undefined,
      'Could not remove property.',
      () => removeBuyFirestore(id)
    );

  const addRentalListing = (input: NewRentInput) =>
    executeMutation(
      '/api/catalog/rent',
      'POST',
      input,
      'Could not add rental listing.',
      () => addRentFirestore(input as unknown as Record<string, unknown>)
    );

  const updateRental = (id: string, input: NewRentInput) =>
    executeMutation(
      `/api/catalog/rent/${encodeURIComponent(id)}`,
      'PUT',
      input,
      'Could not update rental listing.',
      () => updateRentFirestore(id, input as unknown as Record<string, unknown>)
    );

  const removeRentalListing = (id: string) =>
    executeMutation(
      `/api/catalog/rent/${encodeURIComponent(id)}`,
      'DELETE',
      undefined,
      'Could not remove rental listing.',
      () => removeRentFirestore(id)
    );

  const addFaq = (input: NewFaqInput) =>
    executeMutation(
      '/api/catalog/faqs',
      'POST',
      input,
      'Could not add FAQ.',
      () => addFaqFirestore(input as unknown as Record<string, unknown>)
    );

  const updateFaq = (id: string, input: NewFaqInput) =>
    executeMutation(
      `/api/catalog/faqs/${encodeURIComponent(id)}`,
      'PUT',
      input,
      'Could not update FAQ.',
      () => updateFaqFirestore(id, input as unknown as Record<string, unknown>)
    );

  const removeFaq = (id: string) =>
    executeMutation(
      `/api/catalog/faqs/${encodeURIComponent(id)}`,
      'DELETE',
      undefined,
      'Could not remove FAQ.',
      () => removeFaqFirestore(id)
    );

  const addReview = (input: NewReviewInput) =>
    executeMutation(
      '/api/catalog/reviews',
      'POST',
      input,
      'Could not add review.',
      () => addReviewFirestore(input as unknown as Record<string, unknown>)
    );

  const updateReview = (id: string, input: NewReviewInput) =>
    executeMutation(
      `/api/catalog/reviews/${encodeURIComponent(id)}`,
      'PUT',
      input,
      'Could not update review.',
      () => updateReviewFirestore(id, input as unknown as Record<string, unknown>)
    );

  const removeReview = (id: string) =>
    executeMutation(
      `/api/catalog/reviews/${encodeURIComponent(id)}`,
      'DELETE',
      undefined,
      'Could not remove review.',
      () => removeReviewFirestore(id)
    );

  const resetCatalog = (
    section: 'projects' | 'buy' | 'rent' | 'faqs' | 'reviews' | 'all'
  ) =>
    executeMutation(
      '/api/catalog/reset',
      'POST',
      { section },
      'Could not restore defaults.',
      () => resetCatalogFirestore(section)
    );

  return (
    <CatalogContext.Provider
      value={{
        portfolioProjects,
        propertyListings,
        buyProperties,
        rentalListings,
        faqs,
        clientReviews,
        loading,
        backendReachable,
        storageMode,
        cacheUpdatedAt,
        quotaError,
        snapshotSynced,
        snapshotWriteFailed,
        catalogUnavailable,
        refreshCatalog,
        publishSnapshot,
        addProject,
        updateProject,
        removeProject,
        addBuyProperty,
        updateBuy,
        removeBuyProperty,
        addRentalListing,
        updateRental,
        removeRentalListing,
        addFaq,
        updateFaq,
        removeFaq,
        addReview,
        updateReview,
        removeReview,
        resetCatalog,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return ctx;
};
