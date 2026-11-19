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
import { BRAND_CONFIG } from '../config/brand.config';
import { IS_STATIC_MODE, parseApiResponse, SERVER_UNREACHABLE_MESSAGE } from '../lib/http';
import { getDefaultFaqs, getDefaultReviews } from '../lib/catalogDefaults';
import type { CatalogMutationResult, CatalogStoreData } from '../lib/catalogFirestore';

export type CityOption = string;
export type CatalogStorageMode = 'backend' | 'firestore' | 'defaults';

const CATALOG_CACHE_KEY = `${BRAND_CONFIG.identity.storageKeyPrefix}_catalog_cache_v3`;
const LEGACY_CATALOG_CACHE_KEY = `${BRAND_CONFIG.identity.storageKeyPrefix}_catalog_cache_v2`;
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

function hasAnyPropertyCatalogItems(catalog: CatalogStoreData): boolean {
  return (
    catalog.projects.length > 0 ||
    catalog.listings.length > 0 ||
    catalog.buy.length > 0 ||
    catalog.rent.length > 0
  );
}

function readBrowserCatalogCache(allowExpired = false): BrowserCatalogCache | null {
  try {
    localStorage.removeItem(LEGACY_CATALOG_CACHE_KEY);
    sessionStorage.removeItem(LEGACY_CATALOG_CACHE_KEY);
  } catch {
    // Ignore storage access errors
  }

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
    const mode: CatalogStorageMode =
      parsed.storageMode === 'backend' || parsed.storageMode === 'firestore'
        ? parsed.storageMode
        : 'defaults';
    if (!hasAnyPropertyCatalogItems(parsed.catalog)) {
      localStorage.removeItem(CATALOG_CACHE_KEY);
      sessionStorage.removeItem(CATALOG_CACHE_KEY);
      return null;
    }
    const isFresh = now - parsed.cachedAt < CATALOG_CACHE_TTL_MS;
    if (!isFresh && !allowExpired) {
      return null;
    }
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

function reconcileById<T extends { id: string }>(prev: T[], next: T[]): T[] {
  if (prev === next) return prev;
  if (prev.length === next.length) {
    const serializedPrev = new Map<string, string>();
    const prevById = new Map<string, T>();
    for (const item of prev) {
      prevById.set(item.id, item);
      serializedPrev.set(item.id, JSON.stringify(item));
    }
    let anyChanged = false;
    const merged = next.map((item, idx) => {
      const prevAtIdx = prev[idx];
      if (prevAtIdx && prevAtIdx.id === item.id && serializedPrev.get(item.id) === JSON.stringify(item)) {
        return prevAtIdx;
      }
      anyChanged = true;
      const existing = prevById.get(item.id);
      if (existing && serializedPrev.get(item.id) === JSON.stringify(item)) {
        return existing;
      }
      return item;
    });
    return anyChanged ? merged : prev;
  }

  const prevById = new Map<string, { item: T; raw: string }>();
  for (const item of prev) {
    prevById.set(item.id, { item, raw: JSON.stringify(item) });
  }
  return next.map((item) => {
    const match = prevById.get(item.id);
    if (match && match.raw === JSON.stringify(item)) {
      return match.item;
    }
    return item;
  });
}

function writeBrowserCatalogCache(catalog: CatalogStoreData, mode: CatalogStorageMode): number {
  const cachedAt = Date.now();
  const entry: BrowserCatalogCache = { cachedAt, storageMode: mode, catalog };
  memoryCatalogCache = entry;

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
  const instantRender = BRAND_CONFIG.features.instantCatalogRender;
  const initialCache = adminPanelEnabled ? readBrowserCatalogCache(instantRender) : null;

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
  const [loading, setLoading] = useState<boolean>(
    instantRender ? false : adminPanelEnabled ? !initialCache : false
  );
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
  const [snapshotSynced, setSnapshotSynced] = useState<boolean | null>(null);
  const [snapshotWriteFailed, setSnapshotWriteFailed] = useState<boolean>(false);
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
    if (Array.isArray(catalog.projects)) {
      setPortfolioProjects((prev) => reconcileById(prev, catalog.projects));
    }
    if (Array.isArray(catalog.listings)) {
      setPropertyListings((prev) => reconcileById(prev, catalog.listings));
    }
    if (Array.isArray(catalog.buy)) {
      setBuyProperties((prev) => reconcileById(prev, catalog.buy));
    }
    if (Array.isArray(catalog.rent)) {
      setRentalListings((prev) => reconcileById(prev, catalog.rent));
    }
    if (Array.isArray(catalog.faqs)) {
      setFaqs((prev) => reconcileById(prev, catalog.faqs));
    }
    if (Array.isArray(catalog.reviews)) {
      setClientReviews((prev) => reconcileById(prev, catalog.reviews));
    }

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

        const fsMod = await import('../lib/catalogFirestore');
        const staleOrCurrent = readBrowserCatalogCache(true);
        if (staleOrCurrent) {
          fsMod.hydrateCatalogFirestoreSnapshot(staleOrCurrent.catalog);
        }
        const fsRes = await fsMod.fetchCatalogFromFirestore();
        setSnapshotSynced(fsRes.fromSnapshot ?? fsMod.hasPublicCatalogSnapshot());
        setSnapshotWriteFailed(
          Boolean(fsRes.snapshotWriteFailed ?? fsMod.hasSnapshotWriteFailed())
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
        applyCatalogPayload(fsRes.catalog, fsRes.fromFirestore ? mode : undefined);
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
    const fsMod = await import('../lib/catalogFirestore');
    const res = await fsMod.publishPublicCatalogSnapshotFirestore();
    if (res.published) {
      setSnapshotSynced(true);
      setSnapshotWriteFailed(false);
      if (res.catalog) {
        setQuotaError(null);
        setCatalogUnavailable(false);
        setStorageMode('firestore');
        applyCatalogPayload(res.catalog, 'firestore');
      }
    } else {
      setSnapshotSynced(false);
      setSnapshotWriteFailed(Boolean(res.snapshotWriteFailed ?? fsMod.hasSnapshotWriteFailed()));
    }
    return res;
  }, [applyCatalogPayload]);

  // Defer catalog background fetch until right after first paint
  useEffect(() => {
    if (!adminPanelEnabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const startFetch = () => {
      if (cancelled) return;
      void refreshCatalog(false);
    };

    rafId = window.requestAnimationFrame(() => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(startFetch, { timeout: 1000 });
      } else {
        timerId = globalThis.setTimeout(startFetch, 0);
      }
    });

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timerId !== null) globalThis.clearTimeout(timerId);
    };
  }, [adminPanelEnabled, refreshCatalog]);

  const runFirestoreFallback = async (
    firestoreFn: (fsMod: typeof import('../lib/catalogFirestore')) => Promise<CatalogMutationResult>,
    fallbackError: string
  ): Promise<ActionResult> => {
    if (!BRAND_CONFIG.features.enableAdminPanel) {
      return { success: false, error: 'Catalog management is disabled.' };
    }
    const [{ getCurrentFirebaseUser, getAuthAsync }, fsMod] = await Promise.all([
      import('../lib/firebase'),
      import('../lib/catalogFirestore'),
    ]);
    const activeFbUser = getCurrentFirebaseUser() || (await getAuthAsync())?.currentUser;
    if (!isManagement || !activeFbUser?.emailVerified) {
      return {
        success: false,
        error:
          'Direct Firestore management requires signing in with the verified management Google account.',
      };
    }

    const fsRes = await firestoreFn(fsMod);
    if (fsRes.success && fsRes.catalog) {
      setQuotaError(null);
      setCatalogUnavailable(false);
      if (typeof fsRes.snapshotPublished === 'boolean') {
        setSnapshotSynced(fsRes.snapshotPublished);
        setSnapshotWriteFailed(!fsRes.snapshotPublished || fsMod.hasSnapshotWriteFailed());
      } else {
        setSnapshotWriteFailed(fsMod.hasSnapshotWriteFailed());
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
    firestoreFn: (fsMod: typeof import('../lib/catalogFirestore')) => Promise<CatalogMutationResult>
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
      (fs) => fs.addProjectFirestore(input as unknown as Record<string, unknown>)
    );

  const updateProject = (id: string, input: NewProjectInput) =>
    executeMutation(
      `/api/catalog/projects/${encodeURIComponent(id)}`,
      'PUT',
      input,
      'Could not update project.',
      (fs) => fs.updateProjectFirestore(id, input as unknown as Record<string, unknown>)
    );

  const removeProject = (id: string) =>
    executeMutation(
      `/api/catalog/projects/${encodeURIComponent(id)}`,
      'DELETE',
      undefined,
      'Could not remove project.',
      (fs) => fs.removeProjectFirestore(id)
    );

  const addBuyProperty = (input: NewBuyInput) =>
    executeMutation(
      '/api/catalog/buy',
      'POST',
      input,
      'Could not add property.',
      (fs) => fs.addBuyFirestore(input as unknown as Record<string, unknown>)
    );

  const updateBuy = (id: string, input: NewBuyInput) =>
    executeMutation(
      `/api/catalog/buy/${encodeURIComponent(id)}`,
      'PUT',
      input,
      'Could not update property.',
      (fs) => fs.updateBuyFirestore(id, input as unknown as Record<string, unknown>)
    );

  const removeBuyProperty = (id: string) =>
    executeMutation(
      `/api/catalog/buy/${encodeURIComponent(id)}`,
      'DELETE',
      undefined,
      'Could not remove property.',
      (fs) => fs.removeBuyFirestore(id)
    );

  const addRentalListing = (input: NewRentInput) =>
    executeMutation(
      '/api/catalog/rent',
      'POST',
      input,
      'Could not add rental listing.',
      (fs) => fs.addRentFirestore(input as unknown as Record<string, unknown>)
    );

  const updateRental = (id: string, input: NewRentInput) =>
    executeMutation(
      `/api/catalog/rent/${encodeURIComponent(id)}`,
      'PUT',
      input,
      'Could not update rental listing.',
      (fs) => fs.updateRentFirestore(id, input as unknown as Record<string, unknown>)
    );

  const removeRentalListing = (id: string) =>
    executeMutation(
      `/api/catalog/rent/${encodeURIComponent(id)}`,
      'DELETE',
      undefined,
      'Could not remove rental listing.',
      (fs) => fs.removeRentFirestore(id)
    );

  const addFaq = (input: NewFaqInput) =>
    executeMutation(
      '/api/catalog/faqs',
      'POST',
      input,
      'Could not add FAQ.',
      (fs) => fs.addFaqFirestore(input as unknown as Record<string, unknown>)
    );

  const updateFaq = (id: string, input: NewFaqInput) =>
    executeMutation(
      `/api/catalog/faqs/${encodeURIComponent(id)}`,
      'PUT',
      input,
      'Could not update FAQ.',
      (fs) => fs.updateFaqFirestore(id, input as unknown as Record<string, unknown>)
    );

  const removeFaq = (id: string) =>
    executeMutation(
      `/api/catalog/faqs/${encodeURIComponent(id)}`,
      'DELETE',
      undefined,
      'Could not remove FAQ.',
      (fs) => fs.removeFaqFirestore(id)
    );

  const addReview = (input: NewReviewInput) =>
    executeMutation(
      '/api/catalog/reviews',
      'POST',
      input,
      'Could not add review.',
      (fs) => fs.addReviewFirestore(input as unknown as Record<string, unknown>)
    );

  const updateReview = (id: string, input: NewReviewInput) =>
    executeMutation(
      `/api/catalog/reviews/${encodeURIComponent(id)}`,
      'PUT',
      input,
      'Could not update review.',
      (fs) => fs.updateReviewFirestore(id, input as unknown as Record<string, unknown>)
    );

  const removeReview = (id: string) =>
    executeMutation(
      `/api/catalog/reviews/${encodeURIComponent(id)}`,
      'DELETE',
      undefined,
      'Could not remove review.',
      (fs) => fs.removeReviewFirestore(id)
    );

  const resetCatalog = (
    section: 'projects' | 'buy' | 'rent' | 'faqs' | 'reviews' | 'all'
  ) =>
    executeMutation(
      '/api/catalog/reset',
      'POST',
      { section },
      'Could not restore defaults.',
      (fs) => fs.resetCatalogFirestore(section)
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
