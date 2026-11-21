import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Pencil,
  Building2,
  Home,
  Key,
  Upload,
  RotateCcw,
  Search,
  MapPin,
  ExternalLink,
  ChevronRight,
  Check,
  X,
  Image as ImageIcon,
  Layers,
  Users,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  Quote,
  Star,
  Cloud,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useCatalog, CityOption } from '../context/CatalogContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SafeImage } from '../components/common/SafeImage';
import { formatRent } from '../data/rentalsData';
import type { ProjectStatus, BuyStatus, RentStatus, PropertyStatus } from '../types';
import { BRAND_CONFIG } from '../config/brand.config';
import { usePageSeo } from '../lib/seo';
import {
  getMediaStorageCapabilities,
  uploadPropertyPhoto,
  type MediaStorageCapabilities,
} from '../lib/mediaStorage';

type FilterView = 'all' | 'projects' | 'buy' | 'rent' | 'faqs' | 'reviews';
type SectionKey = 'projects' | 'buy' | 'rent' | 'faqs' | 'reviews';

const CITIES: CityOption[] = [...BRAND_CONFIG.locale.mainCities];

const PROJECT_STATUSES: ProjectStatus[] = ['Available', 'Under Offer', 'Sold'];
const BUY_STATUSES: BuyStatus[] = ['Available', 'Under Offer', 'Sold'];
const RENT_STATUSES: RentStatus[] = ['Available', 'Rented'];

const MAX_PHOTOS = 30;
const MAX_PAYLOAD_BYTES = 800 * 1024; // Firestore single-doc safety limit for text + URLs

const SAMPLE_PHOTOS = [
  { label: 'Modern Residence', url: BRAND_CONFIG.images.fallbackVilla },
  { label: 'Luxury Estate', url: BRAND_CONFIG.images.serviceVilla },
  { label: 'Apartment', url: BRAND_CONFIG.images.buy3 },
  { label: 'Hillside Home', url: BRAND_CONFIG.images.projectAspen },
];

function estimateUtf8Bytes(value: unknown): number {
  const json = JSON.stringify(value);
  return new TextEncoder().encode(json).length;
}

function getStatusBadgeClasses(status?: PropertyStatus): string {
  switch (status) {
    case 'Under Offer':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Sold':
    case 'Rented':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Available':
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

function isValidImageInput(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(trimmed)) {
    const idx = trimmed.indexOf(',');
    return idx !== -1 && trimmed.length > idx + 1;
  }
  if (trimmed.startsWith('/')) {
    return trimmed.length > 1;
  }
  return /^https?:\/\/\S+$/i.test(trimmed);
}

interface GalleryManagerProps {
  photos: string[];
  folder: string;
  onChange: (next: string[]) => void;
  estimateBasePayload: Record<string, unknown>;
  onError?: (msg: string | null) => void;
  error?: string | null;
}

const GalleryManager: React.FC<GalleryManagerProps> = ({
  photos,
  folder,
  onChange,
  estimateBasePayload,
  onError,
  error,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [mediaCaps, setMediaCaps] = useState<MediaStorageCapabilities | null>(null);
  const { managementToken } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    void getMediaStorageCapabilities().then((caps) => {
      if (active) setMediaCaps(caps);
    });
    return () => {
      active = false;
    };
  }, []);

  const displayedError = error || localError;
  const providerLabel =
    mediaCaps?.preferredProvider === 'cloudinary' ? 'Cloudinary CDN' : 'Firebase Storage';

  const tryApplyGallery = (nextGallery: string[], successMsg?: string) => {
    const estimatedBytes = estimateUtf8Bytes({
      ...estimateBasePayload,
      image: nextGallery[0] || '',
      gallery: nextGallery,
    });
    if (estimatedBytes > MAX_PAYLOAD_BYTES) {
      const msg = `Listing exceeds Firestore document limit (~${Math.ceil(
        estimatedBytes / 1024
      )} KB). Re-upload large inline photos via Upload Photo so they store as cloud URLs.`;
      setLocalError(msg);
      onError?.(msg);
      showToast('Document size limit exceeded.', 'error');
      return false;
    }
    setLocalError(null);
    onError?.(null);
    onChange(nextGallery);
    if (successMsg) showToast(successMsg, 'success');
    return true;
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setLocalError('Please paste an image URL first.');
      return;
    }
    if (!isValidImageInput(trimmed)) {
      setLocalError('Enter a valid https:// image URL or local /brand/ path.');
      return;
    }
    if (photos.length >= MAX_PHOTOS) {
      setLocalError(`Maximum ${MAX_PHOTOS} photos allowed per listing.`);
      return;
    }
    if (tryApplyGallery([...photos, trimmed])) {
      setUrlInput('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setLocalError(`Maximum ${MAX_PHOTOS} photos allowed per listing.`);
      return;
    }

    const toProcess = files.slice(0, remaining);
    const working = [...photos];
    let addedCount = 0;
    let usedProvider = providerLabel;

    setLocalError(null);
    onError?.(null);
    setUploadProgress({ current: 0, total: toProcess.length });

    try {
      for (let i = 0; i < toProcess.length; i += 1) {
        const file = toProcess[i];
        setUploadProgress({ current: i + 1, total: toProcess.length });
        const result = await uploadPropertyPhoto(file, {
          folder,
          managementToken,
        });
        usedProvider = result.provider === 'cloudinary' ? 'Cloudinary CDN' : 'Firebase Storage';
        working.push(result.url);
        addedCount += 1;
        onChange([...working]);
      }

      if (addedCount > 0) {
        showToast(
          addedCount === 1
            ? `Photo uploaded to ${usedProvider}.`
            : `${addedCount} photos uploaded to ${usedProvider}.`,
          'success'
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not upload photo to cloud storage.';
      setLocalError(msg);
      onError?.(msg);
      showToast(msg, 'error');
    } finally {
      setUploadProgress(null);
    }
  };

  const handleRemove = (index: number) => {
    const next = photos.filter((_, idx) => idx !== index);
    setLocalError(null);
    onError?.(null);
    onChange(next);
  };

  const handleSetMain = (index: number) => {
    if (index <= 0 || index >= photos.length) return;
    const selected = photos[index];
    const next = [selected, ...photos.filter((_, idx) => idx !== index)];
    setLocalError(null);
    onError?.(null);
    onChange(next);
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    setLocalError(null);
    onError?.(null);
    onChange(next);
  };

  const handleAddSample = (url: string) => {
    if (photos.includes(url)) {
      const idx = photos.indexOf(url);
      if (idx > 0) handleSetMain(idx);
      return;
    }
    if (photos.length >= MAX_PHOTOS) {
      setLocalError(`Maximum ${MAX_PHOTOS} photos allowed. Remove a photo first.`);
      return;
    }
    tryApplyGallery([...photos, url]);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold">
          Property Photos (Up to {MAX_PHOTOS})
        </label>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-display uppercase tracking-wider font-semibold">
            <Cloud className="w-3 h-3 text-accent" />
            <span>{providerLabel}</span>
          </span>
          <span className="text-[11px] font-display font-semibold text-accent">
            {photos.length} of {MAX_PHOTOS}
          </span>
        </div>
      </div>

      {/* Thumbnails Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
          {photos.map((photoUrl, idx) => (
            <div
              key={`${idx}-${photoUrl.slice(0, 32)}`}
              className={`relative rounded-xl overflow-hidden border bg-slate-100 ${
                idx === 0 ? 'border-brand ring-1 ring-brand/20' : 'border-slate-200'
              }`}
            >
              <div className="aspect-[16/10] w-full overflow-hidden">
                <SafeImage
                  src={photoUrl}
                  alt={`Listing photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/75 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Remove photo"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="p-1.5 bg-white border-t border-slate-100 flex items-center justify-between gap-1">
                {idx === 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-brand text-brand-contrast text-[10px] font-display uppercase tracking-wider font-semibold">
                    Main Photo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetMain(idx)}
                    className="flex-1 py-0.5 px-1.5 rounded-full bg-slate-100 hover:bg-brand text-brand hover:text-brand-contrast text-[10px] font-display uppercase tracking-wider font-semibold transition-colors cursor-pointer truncate"
                    title="Set as main cover photo"
                  >
                    Set Main
                  </button>
                )}

                <div className="flex items-center gap-0.5 shrink-0">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMove(idx, -1)}
                      className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                      aria-label="Move photo left"
                      title="Move earlier"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                  )}
                  {idx < photos.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 1)}
                      className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                      aria-label="Move photo right"
                      title="Move later"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-1 px-3 text-center">
          <ImageIcon className="w-5 h-5" />
          <span className="text-[11px] font-body">
            Upload photos to {providerLabel} or paste HTTPS URLs (defaults to a standard photo if empty)
          </span>
        </div>
      )}

      {/* Upload Progress Banner */}
      {uploadProgress && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-900 text-white px-3 py-2 text-[11px] font-display uppercase tracking-wider font-semibold">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>
            Uploading {uploadProgress.current} of {uploadProgress.total} to {providerLabel}...
          </span>
        </div>
      )}

      {/* URL input + Upload + Quick Samples */}
      {photos.length < MAX_PHOTOS && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Paste image URL (https://...)"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (localError) setLocalError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handleAddUrl}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-brand text-brand hover:text-brand-contrast text-[11px] font-display uppercase tracking-wider font-semibold transition-colors cursor-pointer shrink-0"
            >
              Add URL
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <label
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-semibold transition-colors ${
                uploadProgress
                  ? 'bg-slate-200 text-slate-400 cursor-wait'
                  : 'bg-brand text-brand-contrast hover:bg-accent cursor-pointer'
              }`}
            >
              {uploadProgress ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Upload className="w-3 h-3" />
              )}
              <span>{uploadProgress ? 'Uploading...' : 'Upload Photos'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={Boolean(uploadProgress)}
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            {SAMPLE_PHOTOS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => handleAddSample(sample.url)}
                className={`px-2 py-1 rounded-full text-[10px] font-body border cursor-pointer transition-colors ${
                  photos[0] === sample.url
                    ? 'bg-brand text-brand-contrast border-brand'
                    : photos.includes(sample.url)
                    ? 'bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sample.label}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-500 font-body leading-snug">
            Uploaded photos are optimized to WebP and stored on {providerLabel} as lightweight CDN URLs (up to {MAX_PHOTOS} photos per listing).
          </p>
        </div>
      )}

      {displayedError && (
        <div className="flex items-start gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] text-rose-700 font-body">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{displayedError}</span>
        </div>
      )}
    </div>
  );
};

interface InventoryItemSummary {
  id: string;
  title: string;
  location: string;
  city: string;
  priceLabel: string;
  meta: string;
  image: string;
  link: string;
  status: PropertyStatus;
}

interface InventoryItemsPanelProps {
  sectionTitle: string;
  items: InventoryItemSummary[];
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder: string;
  confirmDeleteId: string | null;
  editingId: string | null;
  onEdit: (id: string) => void;
  onRequestDelete: (id: string | null) => void;
  onConfirmDelete: (id: string, title: string) => void;
}

const InventoryItemsPanel: React.FC<InventoryItemsPanelProps> = ({
  sectionTitle,
  items,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  confirmDeleteId,
  editingId,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
}) => (
  <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <h3 className="font-display font-bold text-sm sm:text-base text-brand uppercase tracking-tight">
          {sectionTitle} ({items.length})
        </h3>
        <p className="text-[11px] text-slate-500 font-body">
          Click Edit to modify details, status, or photos, or Delete to remove an item.
        </p>
      </div>
    </div>

    <div className="relative">
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-accent"
      />
      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
    </div>

    {items.length > 0 ? (
      <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
        {items.map((item) => {
          const isConfirming = confirmDeleteId === item.id;
          const isEditing = editingId === item.id;

          return (
            <div
              key={item.id}
              className={`flex flex-col gap-2.5 p-3 rounded-2xl border bg-white transition-all ${
                isEditing
                  ? 'border-brand ring-1 ring-brand/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                    <SafeImage src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-display uppercase tracking-wider text-accent font-bold">
                        {item.city}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-display uppercase tracking-wider font-semibold ${getStatusBadgeClasses(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-sm text-brand truncate">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-display font-bold text-brand">{item.priceLabel}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{item.meta}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link
                    to={item.link}
                    className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-brand text-[11px] font-display uppercase tracking-wider font-semibold text-brand transition-colors"
                  >
                    View
                  </Link>

                  <button
                    type="button"
                    onClick={() => onEdit(item.id)}
                    className={`px-3 py-1.5 rounded-full border text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      isEditing
                        ? 'bg-brand text-brand-contrast border-brand'
                        : 'bg-slate-50 hover:bg-brand text-brand hover:text-brand-contrast border-slate-200 hover:border-brand'
                    }`}
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  {!isConfirming && (
                    <button
                      type="button"
                      onClick={() => onRequestDelete(item.id)}
                      className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {isConfirming && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">
                  <span className="text-[11px] font-body font-medium text-rose-800">
                    Delete this listing? This cannot be undone.
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onConfirmDelete(item.id, item.title)}
                      className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(null)}
                      className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <div className="py-10 text-center space-y-1.5 border border-dashed border-slate-200 bg-white rounded-2xl">
        <p className="font-display font-bold text-xs text-brand uppercase">
          No Listings Found
        </p>
        <p className="text-[11px] text-slate-500 font-body">
          Add a new listing using the form or clear your search filter.
        </p>
      </div>
    )}
  </div>
);

const createDefaultProjForm = () => ({
  title: '',
  location: '',
  category: BRAND_CONFIG.locale.defaultCity as CityOption,
  valuation: '',
  size: BRAND_CONFIG.locale.defaultSizes.project,
  beds: '5',
  baths: '6',
  projectDelivered: String(new Date().getFullYear()),
  architect: BRAND_CONFIG.identity.architectDefault as string,
  summary: '',
  status: 'Available' as ProjectStatus,
  gallery: [] as string[],
});

const createDefaultBuyForm = () => ({
  title: '',
  city: BRAND_CONFIG.locale.defaultCity as CityOption,
  location: '',
  type: 'House' as 'House' | 'Apartment' | 'Plot',
  price: '',
  area: BRAND_CONFIG.locale.defaultSizes.buy,
  beds: '4',
  baths: '4',
  possession: 'Ready to Move',
  nocStatus: 'Society Transfer Ready',
  features: 'Verified Clear Title, Solar Backup Wiring, 24/7 Society Security',
  description: '',
  status: 'Available' as BuyStatus,
  gallery: [] as string[],
});

const createDefaultRentForm = () => ({
  title: '',
  city: BRAND_CONFIG.locale.defaultCity as CityOption,
  areaSociety: '',
  type: 'House' as 'Apartment' | 'House' | 'Upper Portion' | 'Lower Portion',
  monthlyRent: '',
  beds: '3',
  baths: '3',
  sizeOrFloor: BRAND_CONFIG.locale.defaultSizes.rent,
  furnished: 'Unfurnished' as 'Furnished' | 'Unfurnished',
  availableFrom: 'Immediate',
  securityDeposit: "2 months' rent",
  advanceRent: '1 month',
  minContractPeriod: '11 months',
  amenities: 'Sui Gas Connected, Separate Electric Meter, 24/7 Security',
  description: '',
  status: 'Available' as RentStatus,
  gallery: [] as string[],
});

const createDefaultFaqForm = () => ({
  category: '',
  question: '',
  answer: '',
});

const createDefaultReviewForm = () => ({
  author: '',
  role: 'Residential Buyer',
  location: BRAND_CONFIG.locale.defaultCity as string,
  propertyContext: '',
  rating: '5',
  date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  quote: '',
});

export const ManageCatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = (searchParams.get('tab') as FilterView) || 'all';
  const [activeView, setActiveView] = useState<FilterView>(
    ['all', 'projects', 'buy', 'rent', 'faqs', 'reviews'].includes(initialParam)
      ? initialParam
      : 'all'
  );

  const {
    portfolioProjects,
    propertyListings,
    buyProperties,
    rentalListings,
    faqs,
    clientReviews,
    backendReachable,
    storageMode,
    quotaError,
    snapshotSynced,
    snapshotWriteFailed,
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
  } = useCatalog();
  const { isManagement, firebaseUser } = useAuth();
  const { showToast } = useToast();

  // Independent search & confirmation states per section
  const [refreshingCatalog, setRefreshingCatalog] = useState(false);
  const [publishingSnapshot, setPublishingSnapshot] = useState(false);
  const [projSearch, setProjSearch] = useState('');
  const [buySearch, setBuySearch] = useState('');
  const [rentSearch, setRentSearch] = useState('');
  const [faqSearch, setFaqSearch] = useState('');
  const [reviewSearch, setReviewSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmResetSection, setConfirmResetSection] = useState<'all' | SectionKey | null>(null);

  const [submittingProj, setSubmittingProj] = useState(false);
  const [submittingBuy, setSubmittingBuy] = useState(false);
  const [submittingRent, setSubmittingRent] = useState(false);
  const [submittingFaq, setSubmittingFaq] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Edit mode IDs per section
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [editingBuyId, setEditingBuyId] = useState<string | null>(null);
  const [editingRentId, setEditingRentId] = useState<string | null>(null);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Form refs for smooth scroll when clicking Edit
  const projFormRef = useRef<HTMLFormElement>(null);
  const buyFormRef = useRef<HTMLFormElement>(null);
  const rentFormRef = useRef<HTMLFormElement>(null);
  const faqFormRef = useRef<HTMLFormElement>(null);
  const reviewFormRef = useRef<HTMLFormElement>(null);

  // Inline validation & server errors per section
  const [projFieldErrors, setProjFieldErrors] = useState<{
    title?: string;
    location?: string;
    valuation?: string;
  }>({});
  const [projFormError, setProjFormError] = useState<string | null>(null);

  const [buyFieldErrors, setBuyFieldErrors] = useState<{
    title?: string;
    location?: string;
    price?: string;
  }>({});
  const [buyFormError, setBuyFormError] = useState<string | null>(null);

  const [rentFieldErrors, setRentFieldErrors] = useState<{
    title?: string;
    areaSociety?: string;
    monthlyRent?: string;
  }>({});
  const [rentFormError, setRentFormError] = useState<string | null>(null);

  const [faqFieldErrors, setFaqFieldErrors] = useState<{
    question?: string;
    answer?: string;
  }>({});
  const [faqFormError, setFaqFormError] = useState<string | null>(null);

  const [reviewFieldErrors, setReviewFieldErrors] = useState<{
    author?: string;
    quote?: string;
  }>({});
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);

  // Form states
  const [projForm, setProjForm] = useState(createDefaultProjForm);
  const [buyForm, setBuyForm] = useState(createDefaultBuyForm);
  const [rentForm, setRentForm] = useState(createDefaultRentForm);
  const [faqForm, setFaqForm] = useState(createDefaultFaqForm);
  const [reviewForm, setReviewForm] = useState(createDefaultReviewForm);

  usePageSeo({
    title: `Manage Data | ${BRAND_CONFIG.identity.brandName}`,
    description: `Management portal for ${BRAND_CONFIG.identity.brandName} catalog listings, FAQs, and client reviews.`,
    path: '/manage',
    noindex: true,
  });

  // Auto-upgrade legacy multi-collection Firestore catalogs to the 1-read public snapshot when admin visits
  const autoPublishedRef = useRef(false);
  useEffect(() => {
    if (
      !autoPublishedRef.current &&
      snapshotSynced === false &&
      isManagement &&
      firebaseUser?.emailVerified
    ) {
      autoPublishedRef.current = true;
      void publishSnapshot();
    }
  }, [snapshotSynced, isManagement, firebaseUser, publishSnapshot]);

  useEffect(() => {
    const paramTab = searchParams.get('tab') as FilterView;
    if (paramTab && ['all', 'projects', 'buy', 'rent', 'faqs', 'reviews'].includes(paramTab)) {
      setActiveView(paramTab);
    } else if (!paramTab) {
      setActiveView('all');
    }
  }, [searchParams]);

  const switchView = (view: FilterView) => {
    setActiveView(view);
    if (view === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: view });
    }
    setConfirmDeleteId(null);
    setConfirmResetSection(null);
  };

  // Filtered Projects list
  const allProjects = useMemo<InventoryItemSummary[]>(() => {
    const fromListings = propertyListings.map((p) => ({
      id: p.id,
      title: p.name,
      location: p.location,
      city: p.category,
      priceLabel: p.price,
      meta: `${p.beds} Beds · ${p.baths} Baths · ${p.sqft}`,
      image: p.exteriorImage,
      link: `/projects/${p.id}`,
      status: (p.status || 'Available') as PropertyStatus,
    }));
    const fromPortfolio = portfolioProjects.map((p) => ({
      id: p.id,
      title: p.title,
      location: p.location,
      city: p.category,
      priceLabel: p.valuation,
      meta: `${p.beds} Beds · ${p.baths} Baths · ${p.size}`,
      image: p.image,
      link: `/projects/${p.id}`,
      status: (p.status || 'Available') as PropertyStatus,
    }));
    return [...fromPortfolio, ...fromListings];
  }, [portfolioProjects, propertyListings]);

  const filteredProjects = useMemo(() => {
    const q = projSearch.trim().toLowerCase();
    return allProjects.filter(
      (item) =>
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q)
    );
  }, [allProjects, projSearch]);

  const filteredBuy = useMemo<InventoryItemSummary[]>(() => {
    const q = buySearch.trim().toLowerCase();
    return buyProperties
      .filter(
        (item) =>
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q)
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        location: item.location,
        city: `${item.city} · ${item.type}`,
        priceLabel: item.price,
        meta:
          item.type === 'Plot'
            ? `Area: ${item.area} · ${item.possession}`
            : `${item.beds} Beds · ${item.baths} Baths · ${item.area}`,
        image: item.image,
        link: `/buy/${item.id}`,
        status: (item.status || 'Available') as PropertyStatus,
      }));
  }, [buyProperties, buySearch]);

  const filteredRent = useMemo<InventoryItemSummary[]>(() => {
    const q = rentSearch.trim().toLowerCase();
    return rentalListings
      .filter(
        (item) =>
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.areaSociety.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q)
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        location: item.areaSociety,
        city: `${item.city} · ${item.type}`,
        priceLabel: formatRent(item.monthlyRent),
        meta: `${item.beds} Beds · ${item.baths} Baths · ${item.sizeOrFloor} · ${item.furnished}`,
        image: item.image,
        link: `/rent/${item.id}`,
        status: (item.status || 'Available') as PropertyStatus,
      }));
  }, [rentalListings, rentSearch]);

  const filteredFaqs = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    return faqs.filter(
      (faq) =>
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        (faq.category || '').toLowerCase().includes(q)
    );
  }, [faqs, faqSearch]);

  const filteredReviews = useMemo(() => {
    const q = reviewSearch.trim().toLowerCase();
    return clientReviews.filter(
      (rev) =>
        !q ||
        rev.author.toLowerCase().includes(q) ||
        rev.role.toLowerCase().includes(q) ||
        rev.location.toLowerCase().includes(q) ||
        rev.propertyContext.toLowerCase().includes(q) ||
        rev.quote.toLowerCase().includes(q)
    );
  }, [clientReviews, reviewSearch]);

  const base64CountsBySection = useMemo(() => {
    const hasInlineBase64 = (value?: string) =>
      typeof value === 'string' && value.startsWith('data:image');

    const projCount =
      portfolioProjects.filter(
        (p) => hasInlineBase64(p.image) || (p.gallery || []).some(hasInlineBase64)
      ).length +
      propertyListings.filter(
        (l) => hasInlineBase64(l.exteriorImage) || (l.interiorImages || []).some(hasInlineBase64)
      ).length;

    const buyCount = buyProperties.filter(
      (b) => hasInlineBase64(b.image) || (b.gallery || []).some(hasInlineBase64)
    ).length;

    const rentCount = rentalListings.filter(
      (r) => hasInlineBase64(r.image) || (r.gallery || []).some(hasInlineBase64)
    ).length;

    return {
      projects: projCount,
      buy: buyCount,
      rent: rentCount,
      total: projCount + buyCount + rentCount,
    };
  }, [portfolioProjects, propertyListings, buyProperties, rentalListings]);

  // Start / Cancel Edit Handlers
  const startEditProject = (id: string) => {
    const portfolio = portfolioProjects.find((p) => p.id === id);
    if (portfolio) {
      const photos = (portfolio.gallery?.length ? portfolio.gallery : [portfolio.image])
        .filter(Boolean)
        .slice(0, MAX_PHOTOS);
      setProjForm({
        title: portfolio.title,
        location: portfolio.location,
        category: portfolio.category,
        valuation: portfolio.valuation,
        size: portfolio.size,
        beds: String(portfolio.beds ?? 0),
        baths: String(portfolio.baths ?? 0),
        projectDelivered: String(portfolio.projectDelivered || new Date().getFullYear()),
        architect: portfolio.architect || BRAND_CONFIG.identity.architectDefault,
        summary: portfolio.summary || '',
        status: portfolio.status || 'Available',
        gallery: photos,
      });
    } else {
      const listing = propertyListings.find((p) => p.id === id);
      if (!listing) return;
      const photos = [listing.exteriorImage, ...(listing.interiorImages || [])]
        .filter(Boolean)
        .slice(0, MAX_PHOTOS);
      setProjForm({
        title: listing.name,
        location: listing.location,
        category: listing.category,
        valuation: listing.price,
        size: listing.sqft,
        beds: String(listing.beds ?? 0),
        baths: String(listing.baths ?? 0),
        projectDelivered: String(listing.yearBuilt || new Date().getFullYear()),
        architect: listing.architect || listing.architecturalStyle || BRAND_CONFIG.identity.architectDefault,
        summary: listing.description || '',
        status: listing.status || 'Available',
        gallery: photos,
      });
    }
    setEditingProjId(id);
    setProjFieldErrors({});
    setProjFormError(null);
    projFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const cancelEditProject = () => {
    setEditingProjId(null);
    setProjForm(createDefaultProjForm());
    setProjFieldErrors({});
    setProjFormError(null);
  };

  const startEditBuy = (id: string) => {
    const item = buyProperties.find((b) => b.id === id);
    if (!item) return;
    const photos = (item.gallery?.length ? item.gallery : [item.image])
      .filter(Boolean)
      .slice(0, MAX_PHOTOS);
    setBuyForm({
      title: item.title,
      city: item.city,
      location: item.location,
      type: item.type,
      price: item.price,
      area: item.area,
      beds: String(item.beds ?? 0),
      baths: String(item.baths ?? 0),
      possession: item.possession || 'Ready to Move',
      nocStatus: item.nocStatus || 'Society Transfer Ready',
      features: Array.isArray(item.features) ? item.features.join(', ') : '',
      description: item.description || '',
      status: item.status || 'Available',
      gallery: photos,
    });
    setEditingBuyId(id);
    setBuyFieldErrors({});
    setBuyFormError(null);
    buyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const cancelEditBuy = () => {
    setEditingBuyId(null);
    setBuyForm(createDefaultBuyForm());
    setBuyFieldErrors({});
    setBuyFormError(null);
  };

  const startEditRent = (id: string) => {
    const item = rentalListings.find((r) => r.id === id);
    if (!item) return;
    const photos = (item.gallery?.length ? item.gallery : [item.image])
      .filter(Boolean)
      .slice(0, MAX_PHOTOS);
    setRentForm({
      title: item.title,
      city: item.city,
      areaSociety: item.areaSociety,
      type: item.type,
      monthlyRent: String(item.monthlyRent || ''),
      beds: String(item.beds ?? 1),
      baths: String(item.baths ?? 1),
      sizeOrFloor: item.sizeOrFloor || BRAND_CONFIG.locale.defaultSizes.rent,
      furnished: item.furnished || 'Unfurnished',
      availableFrom: item.availableFrom || 'Immediate',
      securityDeposit: item.securityDeposit || "2 months' rent",
      advanceRent: item.advanceRent || '1 month',
      minContractPeriod: item.minContractPeriod || '11 months',
      amenities: Array.isArray(item.amenities) ? item.amenities.join(', ') : '',
      description: item.description || '',
      status: item.status || 'Available',
      gallery: photos,
    });
    setEditingRentId(id);
    setRentFieldErrors({});
    setRentFormError(null);
    rentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const cancelEditRent = () => {
    setEditingRentId(null);
    setRentForm(createDefaultRentForm());
    setRentFieldErrors({});
    setRentFormError(null);
  };

  const startEditFaq = (id: string) => {
    const item = faqs.find((f) => f.id === id);
    if (!item) return;
    setFaqForm({
      category: item.category || '',
      question: item.question,
      answer: item.answer,
    });
    setEditingFaqId(id);
    setFaqFieldErrors({});
    setFaqFormError(null);
    faqFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const cancelEditFaq = () => {
    setEditingFaqId(null);
    setFaqForm(createDefaultFaqForm());
    setFaqFieldErrors({});
    setFaqFormError(null);
  };

  const startEditReview = (id: string) => {
    const item = clientReviews.find((r) => r.id === id);
    if (!item) return;
    setReviewForm({
      author: item.author,
      role: item.role,
      location: item.location,
      propertyContext: item.propertyContext,
      rating: String(item.rating || 5),
      date: item.date || '',
      quote: item.quote,
    });
    setEditingReviewId(id);
    setReviewFieldErrors({});
    setReviewFormError(null);
    reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setReviewForm(createDefaultReviewForm());
    setReviewFieldErrors({});
    setReviewFormError(null);
  };

  // Submit Handlers (Add or Save Changes)
  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors: { title?: string; location?: string; valuation?: string } = {};
    if (!projForm.title.trim()) fieldErrors.title = 'Project title is required.';
    if (!projForm.location.trim()) fieldErrors.location = 'Location is required.';
    if (!projForm.valuation.trim()) fieldErrors.valuation = 'Price / valuation is required.';
    setProjFieldErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      setProjFormError('Please fill in the highlighted required fields.');
      return;
    }

    const gallery = projForm.gallery;
    const payload = {
      title: projForm.title.trim(),
      location: projForm.location.trim(),
      category: projForm.category,
      valuation: projForm.valuation.trim(),
      size: projForm.size,
      beds: Number(projForm.beds) || 0,
      baths: Number(projForm.baths) || 0,
      projectDelivered: projForm.projectDelivered,
      architect: projForm.architect,
      summary: projForm.summary,
      image: gallery[0] || '',
      gallery,
      status: projForm.status,
    };

    const payloadBytes = estimateUtf8Bytes(payload);
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      const msg = `Listing payload (${Math.ceil(
        payloadBytes / 1024
      )} KB) exceeds the 800 KB size limit. Remove a photo or use smaller images.`;
      setProjFormError(msg);
      showToast('Listing exceeds 800 KB size limit.', 'error');
      return;
    }

    setProjFormError(null);
    setSubmittingProj(true);
    const res = editingProjId
      ? await updateProject(editingProjId, payload)
      : await addProject(payload);
    setSubmittingProj(false);

    if (res.success) {
      showToast(
        editingProjId
          ? `Saved changes to "${payload.title}".`
          : `Added "${payload.title}" to Projects.`,
        'success'
      );
      setEditingProjId(null);
      setProjForm(createDefaultProjForm());
      setProjFieldErrors({});
      setProjFormError(null);
    } else {
      const errMsg = res.error || (editingProjId ? 'Could not update project.' : 'Could not add project.');
      setProjFormError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleSubmitBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors: { title?: string; location?: string; price?: string } = {};
    if (!buyForm.title.trim()) fieldErrors.title = 'Property title is required.';
    if (!buyForm.location.trim()) fieldErrors.location = 'Society / location is required.';
    if (!buyForm.price.trim()) fieldErrors.price = 'Price is required.';
    setBuyFieldErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      setBuyFormError('Please fill in the highlighted required fields.');
      return;
    }

    const gallery = buyForm.gallery;
    const payload = {
      title: buyForm.title.trim(),
      city: buyForm.city,
      location: buyForm.location.trim(),
      type: buyForm.type,
      price: buyForm.price.trim(),
      area: buyForm.area,
      beds: buyForm.type === 'Plot' ? 0 : Number(buyForm.beds) || 0,
      baths: buyForm.type === 'Plot' ? 0 : Number(buyForm.baths) || 0,
      possession: buyForm.possession,
      nocStatus: buyForm.nocStatus,
      features: buyForm.features,
      description: buyForm.description,
      image: gallery[0] || '',
      gallery,
      status: buyForm.status,
    };

    const payloadBytes = estimateUtf8Bytes(payload);
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      const msg = `Listing payload (${Math.ceil(
        payloadBytes / 1024
      )} KB) exceeds the 800 KB size limit. Remove a photo or use smaller images.`;
      setBuyFormError(msg);
      showToast('Listing exceeds 800 KB size limit.', 'error');
      return;
    }

    setBuyFormError(null);
    setSubmittingBuy(true);
    const res = editingBuyId
      ? await updateBuy(editingBuyId, payload)
      : await addBuyProperty(payload);
    setSubmittingBuy(false);

    if (res.success) {
      showToast(
        editingBuyId
          ? `Saved changes to "${payload.title}".`
          : `Added "${payload.title}" to Buy listings.`,
        'success'
      );
      setEditingBuyId(null);
      setBuyForm(createDefaultBuyForm());
      setBuyFieldErrors({});
      setBuyFormError(null);
    } else {
      const errMsg = res.error || (editingBuyId ? 'Could not update property.' : 'Could not add property.');
      setBuyFormError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleSubmitRent = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericRent = Number(rentForm.monthlyRent);
    const fieldErrors: { title?: string; areaSociety?: string; monthlyRent?: string } = {};
    if (!rentForm.title.trim()) fieldErrors.title = 'Rental title is required.';
    if (!rentForm.areaSociety.trim()) fieldErrors.areaSociety = 'Area / society is required.';
    if (!Number.isFinite(numericRent) || numericRent <= 0) {
      fieldErrors.monthlyRent = `Enter a valid monthly rent in ${BRAND_CONFIG.locale.currencyCode} greater than 0.`;
    }
    setRentFieldErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      setRentFormError('Please fill in the highlighted required fields.');
      return;
    }

    const gallery = rentForm.gallery;
    const payload = {
      title: rentForm.title.trim(),
      city: rentForm.city,
      areaSociety: rentForm.areaSociety.trim(),
      type: rentForm.type,
      monthlyRent: numericRent,
      beds: Number(rentForm.beds) || 1,
      baths: Number(rentForm.baths) || 1,
      sizeOrFloor: rentForm.sizeOrFloor,
      furnished: rentForm.furnished,
      availableFrom: rentForm.availableFrom,
      securityDeposit: rentForm.securityDeposit,
      advanceRent: rentForm.advanceRent,
      minContractPeriod: rentForm.minContractPeriod,
      amenities: rentForm.amenities,
      description: rentForm.description,
      image: gallery[0] || '',
      gallery,
      status: rentForm.status,
    };

    const payloadBytes = estimateUtf8Bytes(payload);
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      const msg = `Listing payload (${Math.ceil(
        payloadBytes / 1024
      )} KB) exceeds the 800 KB size limit. Remove a photo or use smaller images.`;
      setRentFormError(msg);
      showToast('Listing exceeds 800 KB size limit.', 'error');
      return;
    }

    setRentFormError(null);
    setSubmittingRent(true);
    const res = editingRentId
      ? await updateRental(editingRentId, payload)
      : await addRentalListing(payload);
    setSubmittingRent(false);

    if (res.success) {
      showToast(
        editingRentId
          ? `Saved changes to "${payload.title}".`
          : `Added "${payload.title}" to Rent listings.`,
        'success'
      );
      setEditingRentId(null);
      setRentForm(createDefaultRentForm());
      setRentFieldErrors({});
      setRentFormError(null);
    } else {
      const errMsg =
        res.error || (editingRentId ? 'Could not update rental listing.' : 'Could not add rental listing.');
      setRentFormError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleSubmitFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors: { question?: string; answer?: string } = {};
    if (!faqForm.question.trim()) fieldErrors.question = 'FAQ question is required.';
    if (!faqForm.answer.trim()) fieldErrors.answer = 'FAQ answer is required.';
    setFaqFieldErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      setFaqFormError('Please fill in the highlighted required fields.');
      return;
    }

    const payload = {
      category: faqForm.category.trim(),
      question: faqForm.question.trim(),
      answer: faqForm.answer.trim(),
    };

    setFaqFormError(null);
    setSubmittingFaq(true);
    const res = editingFaqId
      ? await updateFaq(editingFaqId, payload)
      : await addFaq(payload);
    setSubmittingFaq(false);

    if (res.success) {
      showToast(
        editingFaqId ? 'Saved changes to FAQ.' : 'Added FAQ to Contact page.',
        'success'
      );
      setEditingFaqId(null);
      setFaqForm(createDefaultFaqForm());
      setFaqFieldErrors({});
      setFaqFormError(null);
    } else {
      const errMsg = res.error || (editingFaqId ? 'Could not update FAQ.' : 'Could not add FAQ.');
      setFaqFormError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors: { author?: string; quote?: string } = {};
    if (!reviewForm.author.trim()) fieldErrors.author = 'Reviewer name is required.';
    if (!reviewForm.quote.trim()) fieldErrors.quote = 'Review quote is required.';
    setReviewFieldErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      setReviewFormError('Please fill in the highlighted required fields.');
      return;
    }

    const numericRating = Math.min(5, Math.max(1, Math.round(Number(reviewForm.rating) || 5)));
    const payload = {
      author: reviewForm.author.trim(),
      role: reviewForm.role.trim() || 'Verified Client',
      location: reviewForm.location.trim() || BRAND_CONFIG.locale.defaultCity,
      propertyContext: reviewForm.propertyContext.trim() || 'Private Consultation',
      rating: numericRating,
      date:
        reviewForm.date.trim() ||
        new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      quote: reviewForm.quote.trim(),
    };

    setReviewFormError(null);
    setSubmittingReview(true);
    const res = editingReviewId
      ? await updateReview(editingReviewId, payload)
      : await addReview(payload);
    setSubmittingReview(false);

    if (res.success) {
      showToast(
        editingReviewId
          ? `Saved changes to review by ${payload.author}.`
          : `Added review by ${payload.author} to Homepage.`,
        'success'
      );
      setEditingReviewId(null);
      setReviewForm(createDefaultReviewForm());
      setReviewFieldErrors({});
      setReviewFormError(null);
    } else {
      const errMsg =
        res.error || (editingReviewId ? 'Could not update review.' : 'Could not add review.');
      setReviewFormError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleRemove = async (section: SectionKey, id: string, title: string) => {
    let res;
    if (section === 'projects') {
      res = await removeProject(id);
    } else if (section === 'buy') {
      res = await removeBuyProperty(id);
    } else if (section === 'rent') {
      res = await removeRentalListing(id);
    } else if (section === 'faqs') {
      res = await removeFaq(id);
    } else {
      res = await removeReview(id);
    }

    setConfirmDeleteId(null);
    if (res.success) {
      if (section === 'projects' && editingProjId === id) cancelEditProject();
      if (section === 'buy' && editingBuyId === id) cancelEditBuy();
      if (section === 'rent' && editingRentId === id) cancelEditRent();
      if (section === 'faqs' && editingFaqId === id) cancelEditFaq();
      if (section === 'reviews' && editingReviewId === id) cancelEditReview();
      showToast(`Removed "${title}".`, 'info');
    } else {
      showToast(res.error || 'Could not remove item.', 'error');
    }
  };

  const handleReset = async (section: 'all' | SectionKey) => {
    const res = await resetCatalog(section);
    setConfirmResetSection(null);
    if (res.success) {
      if (section === 'all' || section === 'projects') cancelEditProject();
      if (section === 'all' || section === 'buy') cancelEditBuy();
      if (section === 'all' || section === 'rent') cancelEditRent();
      if (section === 'all' || section === 'faqs') cancelEditFaq();
      if (section === 'all' || section === 'reviews') cancelEditReview();
      showToast(
        section === 'all'
          ? 'Restored default items across Projects, Buy, Rent, FAQs, and Reviews.'
          : `Restored default ${section}.`,
        'success'
      );
    } else {
      showToast(res.error || 'Could not restore defaults.', 'error');
    }
  };

  const showProjects = activeView === 'all' || activeView === 'projects';
  const showBuy = activeView === 'all' || activeView === 'buy';
  const showRent = activeView === 'all' || activeView === 'rent';
  const showFaqs =
    BRAND_CONFIG.features.enableFaqs && (activeView === 'all' || activeView === 'faqs');
  const showReviews =
    BRAND_CONFIG.features.enableReviews && (activeView === 'all' || activeView === 'reviews');

  return (
    <div className="min-h-[100svh] pt-20 md:pt-24 pb-6 md:pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-4 md:space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="px-2">
        <ol className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-slate-500">
          <li>
            <Link to="/" className="hover:text-brand transition-colors">
              Home
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </li>
          <li className="text-brand font-bold" aria-current="page">
            Manage Data
          </li>
        </ol>
      </nav>

      {/* Centralized Inventory Overview & View Filter */}
      <section className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-10 shadow-xl border border-slate-100 space-y-5 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[11px] font-display uppercase tracking-widest text-accent font-bold block">
              Centralized Property Manager
            </span>
            <h1 className="font-display font-bold md:font-extrabold text-[clamp(1.5rem,5.5vw,2rem)] md:text-4xl text-brand uppercase tracking-tight leading-none">
              MANAGE DATA
            </h1>
            <p className="font-body text-xs sm:text-sm text-slate-600 max-w-2xl">
              Add, edit, or delete listings across Projects, Buy, Rent, Contact FAQs, and Homepage Client Reviews from one integrated workspace. All changes save immediately to Firebase Firestore and sync across your site.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {BRAND_CONFIG.features.enableEnquiriesDashboard && (
              <Link
                to="/records"
                className="px-4 py-2 rounded-full bg-brand hover:bg-accent text-brand-contrast text-xs font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Client Records</span>
              </Link>
            )}
            <button
              type="button"
              onClick={async () => {
                setRefreshingCatalog(true);
                await refreshCatalog(true);
                setRefreshingCatalog(false);
                showToast('Catalog synced from server/Firestore.', 'info');
              }}
              disabled={refreshingCatalog}
              className="px-4 py-2 rounded-full border border-slate-200 hover:border-brand disabled:opacity-60 text-slate-700 text-xs font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Catalog is cached in browser for 30 minutes and served via a 1-read Firestore snapshot to minimize reads. Click to force refresh."
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingCatalog ? 'animate-spin' : ''}`} />
              <span>{refreshingCatalog ? 'Syncing...' : 'Sync Catalog'}</span>
            </button>
            {confirmResetSection === 'all' ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleReset('all')}
                  className="px-3.5 py-2 rounded-full bg-amber-600 text-white text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                >
                  Confirm Restore All
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetSection(null)}
                  className="px-3.5 py-2 rounded-full bg-slate-100 text-slate-600 text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmResetSection('all')}
                className="px-4 py-2 rounded-full border border-slate-200 hover:border-brand text-slate-700 text-xs font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore All Defaults</span>
              </button>
            )}
          </div>
        </div>

        {quotaError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900 font-body flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{quotaError}</span>
          </div>
        )}

        {(snapshotSynced === false || snapshotWriteFailed) && (
          <div
            role="alert"
            className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-xs text-amber-950 font-body flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-display uppercase tracking-wider font-bold text-amber-900 text-[11px]">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {snapshotWriteFailed
                    ? 'Public Catalog Snapshot Exceeded Size Cap'
                    : 'Public Catalog Snapshot Missing'}
                </span>
              </div>
              <p className="leading-relaxed">
                <code className="font-mono text-[11px] bg-amber-100 px-1 py-0.5 rounded">
                  catalog_snapshot/public
                </code>{' '}
                {snapshotWriteFailed
                  ? 'failed to publish because its payload exceeded the 920 KB limit. The public site is making extra database reads on visitor loads.'
                  : 'is not published yet, so the public site is making extra database reads instead of a single snapshot read.'}
              </p>
              <p className="text-[11px] text-amber-900/90 font-medium">
                Items with inline base64 images (
                <code className="font-mono">data:image</code>): Projects:{' '}
                <strong>{base64CountsBySection.projects}</strong> · Buy:{' '}
                <strong>{base64CountsBySection.buy}</strong> · Rent:{' '}
                <strong>{base64CountsBySection.rent}</strong>
              </p>
            </div>
            <button
              type="button"
              disabled={publishingSnapshot}
              onClick={async () => {
                setPublishingSnapshot(true);
                const res = await publishSnapshot();
                setPublishingSnapshot(false);
                if (res.published) {
                  showToast('Public catalog snapshot published.', 'success');
                } else {
                  showToast(
                    res.error || 'Could not publish snapshot (check inline base64 photo sizes).',
                    'error'
                  );
                }
              }}
              className="px-4 py-2 rounded-full bg-amber-700 hover:bg-amber-800 disabled:opacity-60 text-white text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer shrink-0 flex items-center gap-1.5 self-start sm:self-center"
            >
              {publishingSnapshot ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>{publishingSnapshot ? 'Publishing...' : 'Retry publish'}</span>
            </button>
          </div>
        )}

        {!backendReachable && (
          isManagement && firebaseUser?.emailVerified ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 font-body flex flex-wrap items-center justify-between gap-2">
              <span>
                Connected directly to Firebase Firestore &amp; Cloud Media ({storageMode === 'firestore' ? (snapshotSynced ? '1-read public snapshot active · cached 30 min in browser' : 'Firestore catalog cached 30 min in browser') : 'built-in defaults ready — your first edit syncs automatically'}).
              </span>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 font-body">
              Backend server is unreachable on this static host. Sign in with the verified management Google account to save, edit, or delete listings directly in Firebase Firestore.
            </div>
          )
        )}

        {/* Integrated Filter Pills */}
        <div className="flex flex-wrap gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => switchView('all')}
            className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'all'
                ? 'bg-brand text-brand-contrast shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>
              All Sections (
              {allProjects.length +
                buyProperties.length +
                rentalListings.length +
                (BRAND_CONFIG.features.enableFaqs ? faqs.length : 0) +
                (BRAND_CONFIG.features.enableReviews ? clientReviews.length : 0)}
              )
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchView('projects')}
            className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'projects'
                ? 'bg-brand text-brand-contrast shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Projects ({allProjects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => switchView('buy')}
            className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'buy'
                ? 'bg-brand text-brand-contrast shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Buy ({buyProperties.length})</span>
          </button>

          <button
            type="button"
            onClick={() => switchView('rent')}
            className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'rent'
                ? 'bg-brand text-brand-contrast shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Rent ({rentalListings.length})</span>
          </button>

          {BRAND_CONFIG.features.enableFaqs && (
            <button
              type="button"
              onClick={() => switchView('faqs')}
              className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeView === 'faqs'
                  ? 'bg-brand text-brand-contrast shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>FAQs ({faqs.length})</span>
            </button>
          )}

          {BRAND_CONFIG.features.enableReviews && (
            <button
              type="button"
              onClick={() => switchView('reviews')}
              className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeView === 'reviews'
                  ? 'bg-brand text-brand-contrast shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Quote className="w-4 h-4" />
              <span>Reviews ({clientReviews.length})</span>
            </button>
          )}
        </div>
      </section>

      {/* SECTION 01: PROJECTS PAGE ADD / EDIT / DELETE */}
      {showProjects && (
        <section className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand text-brand-contrast flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-display uppercase tracking-widest text-accent font-bold block">
                  01 · Projects Page
                </span>
                <h2 className="font-display font-extrabold text-xl text-brand uppercase tracking-tight">
                  Projects Add, Edit &amp; Delete
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {confirmResetSection === 'projects' ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleReset('projects')}
                    className="px-3 py-1.5 rounded-full bg-amber-600 text-white text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Confirm Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetSection(null)}
                    className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetSection('projects')}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Defaults</span>
                </button>
              )}

              <Link
                to="/projects"
                className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-brand text-[11px] font-display uppercase tracking-wider font-semibold text-brand flex items-center gap-1.5 transition-colors"
              >
                <span>View Projects</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              ref={projFormRef}
              noValidate
              onSubmit={handleSubmitProject}
              className="lg:col-span-5 space-y-3.5"
            >
              {editingProjId && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2">
                  <span className="text-[11px] font-display uppercase tracking-wider font-bold text-brand truncate">
                    Editing: {projForm.title || 'Project'}
                  </span>
                  <button
                    type="button"
                    onClick={cancelEditProject}
                    className="text-[11px] font-display uppercase tracking-wider text-slate-600 hover:text-brand font-semibold cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <GalleryManager
                folder="projects"
                photos={projForm.gallery}
                onChange={(next) => setProjForm((prev) => ({ ...prev, gallery: next }))}
                estimateBasePayload={{ ...projForm, gallery: undefined }}
              />

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Margalla Courtyard"
                  value={projForm.title}
                  onChange={(e) => {
                    setProjForm({ ...projForm, title: e.target.value });
                    if (projFieldErrors.title) {
                      setProjFieldErrors((prev) => ({ ...prev, title: undefined }));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                    projFieldErrors.title
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 bg-slate-50 focus:border-accent'
                  }`}
                />
                {projFieldErrors.title && (
                  <p className="mt-1 text-[11px] text-rose-600 font-body">{projFieldErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    City *
                  </label>
                  <select
                    value={projForm.category}
                    onChange={(e) =>
                      setProjForm({ ...projForm, category: e.target.value as CityOption })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Status
                  </label>
                  <select
                    value={projForm.status}
                    onChange={(e) =>
                      setProjForm({ ...projForm, status: e.target.value as ProjectStatus })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Price / Valuation *
                  </label>
                  <input
                    type="text"
                    placeholder={BRAND_CONFIG.locale.adminPlaceholders.projectValuation}
                    value={projForm.valuation}
                    onChange={(e) => {
                      setProjForm({ ...projForm, valuation: e.target.value });
                      if (projFieldErrors.valuation) {
                        setProjFieldErrors((prev) => ({ ...prev, valuation: undefined }));
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                      projFieldErrors.valuation
                        ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                        : 'border-slate-200 bg-slate-50 focus:border-accent'
                    }`}
                  />
                  {projFieldErrors.valuation && (
                    <p className="mt-1 text-[11px] text-rose-600 font-body">
                      {projFieldErrors.valuation}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Sector / Location *
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. Central District, ${BRAND_CONFIG.locale.defaultCity}`}
                    value={projForm.location}
                    onChange={(e) => {
                      setProjForm({ ...projForm, location: e.target.value });
                      if (projFieldErrors.location) {
                        setProjFieldErrors((prev) => ({ ...prev, location: undefined }));
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                      projFieldErrors.location
                        ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                        : 'border-slate-200 bg-slate-50 focus:border-accent'
                    }`}
                  />
                  {projFieldErrors.location && (
                    <p className="mt-1 text-[11px] text-rose-600 font-body">
                      {projFieldErrors.location}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Area Size
                  </label>
                  <input
                    type="text"
                    placeholder={BRAND_CONFIG.locale.defaultSizes.project}
                    value={projForm.size}
                    onChange={(e) => setProjForm({ ...projForm, size: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Beds
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={projForm.beds}
                    onChange={(e) => setProjForm({ ...projForm, beds: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Baths
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={projForm.baths}
                    onChange={(e) => setProjForm({ ...projForm, baths: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Architect / Firm
                  </label>
                  <input
                    type="text"
                    value={projForm.architect}
                    onChange={(e) => setProjForm({ ...projForm, architect: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Year / Delivery
                  </label>
                  <input
                    type="text"
                    value={projForm.projectDelivered}
                    onChange={(e) => setProjForm({ ...projForm, projectDelivered: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief architectural highlights..."
                  value={projForm.summary}
                  onChange={(e) => setProjForm({ ...projForm, summary: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-accent"
                />
              </div>

              {projFormError && (
                <div className="flex items-start gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] text-rose-700 font-body">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{projFormError}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  disabled={submittingProj}
                  className="flex-1 py-3.5 px-6 rounded-full bg-brand hover:bg-accent text-brand-contrast font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {editingProjId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>
                    {submittingProj
                      ? editingProjId
                        ? 'Saving changes...'
                        : 'Adding Project...'
                      : editingProjId
                      ? 'Save changes'
                      : 'Add to Projects'}
                  </span>
                </button>
                {editingProjId && (
                  <button
                    type="button"
                    onClick={cancelEditProject}
                    disabled={submittingProj}
                    className="py-3.5 px-5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-display font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <InventoryItemsPanel
              sectionTitle="Active Projects"
              items={filteredProjects}
              searchValue={projSearch}
              onSearchChange={setProjSearch}
              searchPlaceholder="Search projects by title, city, or location..."
              confirmDeleteId={confirmDeleteId}
              editingId={editingProjId}
              onEdit={startEditProject}
              onRequestDelete={setConfirmDeleteId}
              onConfirmDelete={(id, title) => handleRemove('projects', id, title)}
            />
          </div>
        </section>
      )}

      {/* SECTION 02: BUY PAGE ADD / EDIT / DELETE */}
      {showBuy && (
        <section className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand text-brand-contrast flex items-center justify-center shrink-0">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-display uppercase tracking-widest text-accent font-bold block">
                  02 · Buy Page
                </span>
                <h2 className="font-display font-extrabold text-xl text-brand uppercase tracking-tight">
                  Buy Listings Add, Edit &amp; Delete
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {confirmResetSection === 'buy' ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleReset('buy')}
                    className="px-3 py-1.5 rounded-full bg-amber-600 text-white text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Confirm Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetSection(null)}
                    className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetSection('buy')}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Defaults</span>
                </button>
              )}

              <Link
                to="/buy"
                className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-brand text-[11px] font-display uppercase tracking-wider font-semibold text-brand flex items-center gap-1.5 transition-colors"
              >
                <span>View Buy</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              ref={buyFormRef}
              noValidate
              onSubmit={handleSubmitBuy}
              className="lg:col-span-5 space-y-3.5"
            >
              {editingBuyId && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2">
                  <span className="text-[11px] font-display uppercase tracking-wider font-bold text-brand truncate">
                    Editing: {buyForm.title || 'Buy Listing'}
                  </span>
                  <button
                    type="button"
                    onClick={cancelEditBuy}
                    className="text-[11px] font-display uppercase tracking-wider text-slate-600 hover:text-brand font-semibold cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <GalleryManager
                folder="buy"
                photos={buyForm.gallery}
                onChange={(next) => setBuyForm((prev) => ({ ...prev, gallery: next }))}
                estimateBasePayload={{ ...buyForm, gallery: undefined }}
              />

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Property Title *
                </label>
                <input
                  type="text"
                  placeholder={BRAND_CONFIG.locale.adminPlaceholders.buyTitle}
                  value={buyForm.title}
                  onChange={(e) => {
                    setBuyForm({ ...buyForm, title: e.target.value });
                    if (buyFieldErrors.title) {
                      setBuyFieldErrors((prev) => ({ ...prev, title: undefined }));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                    buyFieldErrors.title
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 bg-slate-50 focus:border-accent'
                  }`}
                />
                {buyFieldErrors.title && (
                  <p className="mt-1 text-[11px] text-rose-600 font-body">{buyFieldErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    City *
                  </label>
                  <select
                    value={buyForm.city}
                    onChange={(e) => setBuyForm({ ...buyForm, city: e.target.value as CityOption })}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Property Type
                  </label>
                  <select
                    value={buyForm.type}
                    onChange={(e) =>
                      setBuyForm({
                        ...buyForm,
                        type: e.target.value as 'House' | 'Apartment' | 'Plot',
                      })
                    }
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="House">House</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Plot">Plot</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Status
                  </label>
                  <select
                    value={buyForm.status}
                    onChange={(e) => setBuyForm({ ...buyForm, status: e.target.value as BuyStatus })}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    {BUY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Price *
                  </label>
                  <input
                    type="text"
                    placeholder={BRAND_CONFIG.locale.adminPlaceholders.buyPrice}
                    value={buyForm.price}
                    onChange={(e) => {
                      setBuyForm({ ...buyForm, price: e.target.value });
                      if (buyFieldErrors.price) {
                        setBuyFieldErrors((prev) => ({ ...prev, price: undefined }));
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                      buyFieldErrors.price
                        ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                        : 'border-slate-200 bg-slate-50 focus:border-accent'
                    }`}
                  />
                  {buyFieldErrors.price && (
                    <p className="mt-1 text-[11px] text-rose-600 font-body">{buyFieldErrors.price}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Area / Plot Size
                  </label>
                  <input
                    type="text"
                    placeholder={BRAND_CONFIG.locale.adminPlaceholders.buyArea}
                    value={buyForm.area}
                    onChange={(e) => setBuyForm({ ...buyForm, area: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Society / Location *
                </label>
                <input
                  type="text"
                  placeholder={`e.g. Phase 6, ${BRAND_CONFIG.locale.defaultCity}`}
                  value={buyForm.location}
                  onChange={(e) => {
                    setBuyForm({ ...buyForm, location: e.target.value });
                    if (buyFieldErrors.location) {
                      setBuyFieldErrors((prev) => ({ ...prev, location: undefined }));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                    buyFieldErrors.location
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 bg-slate-50 focus:border-accent'
                  }`}
                />
                {buyFieldErrors.location && (
                  <p className="mt-1 text-[11px] text-rose-600 font-body">{buyFieldErrors.location}</p>
                )}
              </div>

              {buyForm.type !== 'Plot' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={buyForm.beds}
                      onChange={(e) => setBuyForm({ ...buyForm, beds: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={buyForm.baths}
                      onChange={(e) => setBuyForm({ ...buyForm, baths: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Possession
                  </label>
                  <input
                    type="text"
                    value={buyForm.possession}
                    onChange={(e) => setBuyForm({ ...buyForm, possession: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    NOC / Title Status
                  </label>
                  <input
                    type="text"
                    value={buyForm.nocStatus}
                    onChange={(e) => setBuyForm({ ...buyForm, nocStatus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Key highlights of this property..."
                  value={buyForm.description}
                  onChange={(e) => setBuyForm({ ...buyForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-accent"
                />
              </div>

              {buyFormError && (
                <div className="flex items-start gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] text-rose-700 font-body">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{buyFormError}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  disabled={submittingBuy}
                  className="flex-1 py-3.5 px-6 rounded-full bg-brand hover:bg-accent text-brand-contrast font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {editingBuyId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>
                    {submittingBuy
                      ? editingBuyId
                        ? 'Saving changes...'
                        : 'Adding Property...'
                      : editingBuyId
                      ? 'Save changes'
                      : 'Add to Buy Page'}
                  </span>
                </button>
                {editingBuyId && (
                  <button
                    type="button"
                    onClick={cancelEditBuy}
                    disabled={submittingBuy}
                    className="py-3.5 px-5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-display font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <InventoryItemsPanel
              sectionTitle="Active Buy Listings"
              items={filteredBuy}
              searchValue={buySearch}
              onSearchChange={setBuySearch}
              searchPlaceholder="Search buy listings by title, city, or location..."
              confirmDeleteId={confirmDeleteId}
              editingId={editingBuyId}
              onEdit={startEditBuy}
              onRequestDelete={setConfirmDeleteId}
              onConfirmDelete={(id, title) => handleRemove('buy', id, title)}
            />
          </div>
        </section>
      )}

      {/* SECTION 03: RENT PAGE ADD / EDIT / DELETE */}
      {showRent && (
        <section className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand text-brand-contrast flex items-center justify-center shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-display uppercase tracking-widest text-accent font-bold block">
                  03 · Rent Page
                </span>
                <h2 className="font-display font-extrabold text-xl text-brand uppercase tracking-tight">
                  Rent Listings Add, Edit &amp; Delete
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {confirmResetSection === 'rent' ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleReset('rent')}
                    className="px-3 py-1.5 rounded-full bg-amber-600 text-white text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Confirm Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetSection(null)}
                    className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetSection('rent')}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Defaults</span>
                </button>
              )}

              <Link
                to="/rent"
                className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-brand text-[11px] font-display uppercase tracking-wider font-semibold text-brand flex items-center gap-1.5 transition-colors"
              >
                <span>View Rent</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              ref={rentFormRef}
              noValidate
              onSubmit={handleSubmitRent}
              className="lg:col-span-5 space-y-3.5"
            >
              {editingRentId && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2">
                  <span className="text-[11px] font-display uppercase tracking-wider font-bold text-brand truncate">
                    Editing: {rentForm.title || 'Rental Listing'}
                  </span>
                  <button
                    type="button"
                    onClick={cancelEditRent}
                    className="text-[11px] font-display uppercase tracking-wider text-slate-600 hover:text-brand font-semibold cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <GalleryManager
                folder="rent"
                photos={rentForm.gallery}
                onChange={(next) => setRentForm((prev) => ({ ...prev, gallery: next }))}
                estimateBasePayload={{ ...rentForm, gallery: undefined }}
              />

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Rental Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3-Bed Designer Apartment, Gulberg III"
                  value={rentForm.title}
                  onChange={(e) => {
                    setRentForm({ ...rentForm, title: e.target.value });
                    if (rentFieldErrors.title) {
                      setRentFieldErrors((prev) => ({ ...prev, title: undefined }));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                    rentFieldErrors.title
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 bg-slate-50 focus:border-accent'
                  }`}
                />
                {rentFieldErrors.title && (
                  <p className="mt-1 text-[11px] text-rose-600 font-body">{rentFieldErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    City *
                  </label>
                  <select
                    value={rentForm.city}
                    onChange={(e) =>
                      setRentForm({ ...rentForm, city: e.target.value as CityOption })
                    }
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Property Type
                  </label>
                  <select
                    value={rentForm.type}
                    onChange={(e) =>
                      setRentForm({
                        ...rentForm,
                        type: e.target.value as
                          | 'Apartment'
                          | 'House'
                          | 'Upper Portion'
                          | 'Lower Portion',
                      })
                    }
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="House">House</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Upper Portion">Upper Portion</option>
                    <option value="Lower Portion">Lower Portion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Status
                  </label>
                  <select
                    value={rentForm.status}
                    onChange={(e) =>
                      setRentForm({ ...rentForm, status: e.target.value as RentStatus })
                    }
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    {RENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Monthly Rent ({BRAND_CONFIG.locale.currencyCode}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 180000"
                    value={rentForm.monthlyRent}
                    onChange={(e) => {
                      setRentForm({ ...rentForm, monthlyRent: e.target.value });
                      if (rentFieldErrors.monthlyRent) {
                        setRentFieldErrors((prev) => ({ ...prev, monthlyRent: undefined }));
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                      rentFieldErrors.monthlyRent
                        ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                        : 'border-slate-200 bg-slate-50 focus:border-accent'
                    }`}
                  />
                  {rentFieldErrors.monthlyRent && (
                    <p className="mt-1 text-[11px] text-rose-600 font-body">
                      {rentFieldErrors.monthlyRent}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Furnishing
                  </label>
                  <select
                    value={rentForm.furnished}
                    onChange={(e) =>
                      setRentForm({
                        ...rentForm,
                        furnished: e.target.value as 'Furnished' | 'Unfurnished',
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="Unfurnished">Unfurnished</option>
                    <option value="Furnished">Furnished</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Area / Society *
                </label>
                <input
                  type="text"
                  placeholder={`e.g. Sector F-10/3, ${BRAND_CONFIG.locale.mainCities[1] || BRAND_CONFIG.locale.defaultCity}`}
                  value={rentForm.areaSociety}
                  onChange={(e) => {
                    setRentForm({ ...rentForm, areaSociety: e.target.value });
                    if (rentFieldErrors.areaSociety) {
                      setRentFieldErrors((prev) => ({ ...prev, areaSociety: undefined }));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                    rentFieldErrors.areaSociety
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 bg-slate-50 focus:border-accent'
                  }`}
                />
                {rentFieldErrors.areaSociety && (
                  <p className="mt-1 text-[11px] text-rose-600 font-body">
                    {rentFieldErrors.areaSociety}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Size / Floor
                  </label>
                  <input
                    type="text"
                    placeholder={BRAND_CONFIG.locale.defaultSizes.rent}
                    value={rentForm.sizeOrFloor}
                    onChange={(e) => setRentForm({ ...rentForm, sizeOrFloor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Beds
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={rentForm.beds}
                    onChange={(e) => setRentForm({ ...rentForm, beds: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Baths
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={rentForm.baths}
                    onChange={(e) => setRentForm({ ...rentForm, baths: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Lease highlights and nearby landmarks..."
                  value={rentForm.description}
                  onChange={(e) => setRentForm({ ...rentForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-accent"
                />
              </div>

              {rentFormError && (
                <div className="flex items-start gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] text-rose-700 font-body">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{rentFormError}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  disabled={submittingRent}
                  className="flex-1 py-3.5 px-6 rounded-full bg-brand hover:bg-accent text-brand-contrast font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {editingRentId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>
                    {submittingRent
                      ? editingRentId
                        ? 'Saving changes...'
                        : 'Adding Rental...'
                      : editingRentId
                      ? 'Save changes'
                      : 'Add to Rent Page'}
                  </span>
                </button>
                {editingRentId && (
                  <button
                    type="button"
                    onClick={cancelEditRent}
                    disabled={submittingRent}
                    className="py-3.5 px-5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-display font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <InventoryItemsPanel
              sectionTitle="Active Rentals"
              items={filteredRent}
              searchValue={rentSearch}
              onSearchChange={setRentSearch}
              searchPlaceholder="Search rentals by title, city, or society..."
              confirmDeleteId={confirmDeleteId}
              editingId={editingRentId}
              onEdit={startEditRent}
              onRequestDelete={setConfirmDeleteId}
              onConfirmDelete={(id, title) => handleRemove('rent', id, title)}
            />
          </div>
        </section>
      )}

      {/* SECTION 04: CONTACT PAGE FAQS ADD / EDIT / DELETE */}
      {showFaqs && (
        <section className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand text-brand-contrast flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-display uppercase tracking-widest text-accent font-bold block">
                  04 · Contact Page
                </span>
                <h2 className="font-display font-extrabold text-xl text-brand uppercase tracking-tight">
                  Contact FAQs Add, Edit &amp; Delete
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {confirmResetSection === 'faqs' ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleReset('faqs')}
                    className="px-3 py-1.5 rounded-full bg-amber-600 text-white text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Confirm Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetSection(null)}
                    className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetSection('faqs')}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Defaults</span>
                </button>
              )}

              <Link
                to="/contact"
                className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-brand text-[11px] font-display uppercase tracking-wider font-semibold text-brand flex items-center gap-1.5 transition-colors"
              >
                <span>View Contact</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              ref={faqFormRef}
              noValidate
              onSubmit={handleSubmitFaq}
              className="lg:col-span-5 space-y-3.5"
            >
              {editingFaqId && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2">
                  <span className="text-[11px] font-display uppercase tracking-wider font-bold text-brand truncate">
                    Editing FAQ
                  </span>
                  <button
                    type="button"
                    onClick={cancelEditFaq}
                    className="text-[11px] font-display uppercase tracking-wider text-slate-600 hover:text-brand font-semibold cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Topic / Category (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Title & Legal, Overseas Buyers, Pricing & Taxes"
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Question *
                </label>
                <input
                  type="text"
                  placeholder="e.g. How are property titles and society approvals verified?"
                  value={faqForm.question}
                  onChange={(e) => {
                    setFaqForm({ ...faqForm, question: e.target.value });
                    if (faqFieldErrors.question) {
                      setFaqFieldErrors((prev) => ({ ...prev, question: undefined }));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                    faqFieldErrors.question
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 bg-slate-50 focus:border-accent'
                  }`}
                />
                {faqFieldErrors.question && (
                  <p className="mt-1 text-[11px] text-rose-600 font-body">
                    {faqFieldErrors.question}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Answer *
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide a clear, thorough answer for prospective buyers, landlords, or tenants..."
                  value={faqForm.answer}
                  onChange={(e) => {
                    setFaqForm({ ...faqForm, answer: e.target.value });
                    if (faqFieldErrors.answer) {
                      setFaqFieldErrors((prev) => ({ ...prev, answer: undefined }));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                    faqFieldErrors.answer
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 bg-slate-50 focus:border-accent'
                  }`}
                />
                {faqFieldErrors.answer && (
                  <p className="mt-1 text-[11px] text-rose-600 font-body">
                    {faqFieldErrors.answer}
                  </p>
                )}
              </div>

              {faqFormError && (
                <div className="flex items-start gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] text-rose-700 font-body">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{faqFormError}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  disabled={submittingFaq}
                  className="flex-1 py-3.5 px-6 rounded-full bg-brand hover:bg-accent text-brand-contrast font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {editingFaqId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>
                    {submittingFaq
                      ? editingFaqId
                        ? 'Saving changes...'
                        : 'Adding FAQ...'
                      : editingFaqId
                      ? 'Save changes'
                      : 'Add FAQ'}
                  </span>
                </button>
                {editingFaqId && (
                  <button
                    type="button"
                    onClick={cancelEditFaq}
                    disabled={submittingFaq}
                    className="py-3.5 px-5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-display font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
              <div>
                <h3 className="font-display font-bold text-sm sm:text-base text-brand uppercase tracking-tight">
                  Active Contact FAQs ({filteredFaqs.length})
                </h3>
                <p className="text-[11px] text-slate-500 font-body">
                  Appears on the Contact page directly beneath Regional Offices. Click Edit or Delete to manage items.
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search FAQs by question, answer, or category..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-accent"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              </div>

              {filteredFaqs.length > 0 ? (
                <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                  {filteredFaqs.map((faq) => {
                    const isConfirming = confirmDeleteId === faq.id;
                    const isEditing = editingFaqId === faq.id;

                    return (
                      <div
                        key={faq.id}
                        className={`flex flex-col gap-2.5 p-3.5 rounded-2xl border bg-white transition-all ${
                          isEditing
                            ? 'border-brand ring-1 ring-brand/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            {faq.category && (
                              <span className="text-[10px] font-display uppercase tracking-wider text-accent font-bold block">
                                {faq.category}
                              </span>
                            )}
                            <h4 className="font-display font-bold text-sm text-brand leading-snug">
                              {faq.question}
                            </h4>
                            <p className="font-body text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                            <button
                              type="button"
                              onClick={() => startEditFaq(faq.id)}
                              className={`px-3 py-1.5 rounded-full border text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                isEditing
                                  ? 'bg-brand text-brand-contrast border-brand'
                                  : 'bg-slate-50 hover:bg-brand text-brand hover:text-brand-contrast border-slate-200 hover:border-brand'
                              }`}
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            {!isConfirming && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(faq.id)}
                                className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {isConfirming && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">
                            <span className="text-[11px] font-body font-medium text-rose-800">
                              Delete this FAQ? This cannot be undone.
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleRemove('faqs', faq.id, faq.question)}
                                className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center space-y-1.5 border border-dashed border-slate-200 bg-white rounded-2xl">
                  <p className="font-display font-bold text-xs text-brand uppercase">
                    No FAQs Found
                  </p>
                  <p className="text-[11px] text-slate-500 font-body">
                    Add a new FAQ using the form or clear your search filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 05: HOMEPAGE CLIENT REVIEWS ADD / EDIT / DELETE */}
      {showReviews && (
        <section className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand text-brand-contrast flex items-center justify-center shrink-0">
                <Quote className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-display uppercase tracking-widest text-accent font-bold block">
                  05 · Homepage Reviews
                </span>
                <h2 className="font-display font-extrabold text-xl text-brand uppercase tracking-tight">
                  Client Reviews Add, Edit &amp; Delete
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {confirmResetSection === 'reviews' ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleReset('reviews')}
                    className="px-3 py-1.5 rounded-full bg-amber-600 text-white text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Confirm Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetSection(null)}
                    className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetSection('reviews')}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Defaults</span>
                </button>
              )}

              <Link
                to="/"
                className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-brand text-[11px] font-display uppercase tracking-wider font-semibold text-brand flex items-center gap-1.5 transition-colors"
              >
                <span>View Homepage</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              ref={reviewFormRef}
              noValidate
              onSubmit={handleSubmitReview}
              className="lg:col-span-5 space-y-3.5"
            >
              {editingReviewId && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2">
                  <span className="text-[11px] font-display uppercase tracking-wider font-bold text-brand truncate">
                    Editing: {reviewForm.author || 'Review'}
                  </span>
                  <button
                    type="button"
                    onClick={cancelEditReview}
                    className="text-[11px] font-display uppercase tracking-wider text-slate-600 hover:text-brand font-semibold cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 text-[11px] text-slate-600 font-body">
                Homepage review cards display a uniform user avatar icon automatically rather than writer profile photos.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Reviewer Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Salman Qureshi"
                    value={reviewForm.author}
                    onChange={(e) => {
                      setReviewForm({ ...reviewForm, author: e.target.value });
                      if (reviewFieldErrors.author) {
                        setReviewFieldErrors((prev) => ({ ...prev, author: undefined }));
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                      reviewFieldErrors.author
                        ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                        : 'border-slate-200 bg-slate-50 focus:border-accent'
                    }`}
                  />
                  {reviewFieldErrors.author && (
                    <p className="mt-1 text-[11px] text-rose-600 font-body">
                      {reviewFieldErrors.author}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Role / Client Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Overseas Homebuyer"
                    value={reviewForm.role}
                    onChange={(e) => setReviewForm({ ...reviewForm, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Location / City
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. ${BRAND_CONFIG.locale.defaultCity}`}
                    value={reviewForm.location}
                    onChange={(e) => setReviewForm({ ...reviewForm, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Star Rating (1–5)
                  </label>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="5">5.0 Stars</option>
                    <option value="4">4.0 Stars</option>
                    <option value="3">3.0 Stars</option>
                    <option value="2">2.0 Stars</option>
                    <option value="1">1.0 Star</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Property Context
                  </label>
                  <input
                    type="text"
                    placeholder={BRAND_CONFIG.locale.adminPlaceholders.reviewPropertyContext}
                    value={reviewForm.propertyContext}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, propertyContext: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Review Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. February 2026"
                    value={reviewForm.date}
                    onChange={(e) => setReviewForm({ ...reviewForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Review Quote *
                </label>
                <textarea
                  rows={4}
                  placeholder="Share the client's verified experience..."
                  value={reviewForm.quote}
                  onChange={(e) => {
                    setReviewForm({ ...reviewForm, quote: e.target.value });
                    if (reviewFieldErrors.quote) {
                      setReviewFieldErrors((prev) => ({ ...prev, quote: undefined }));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:bg-white focus:outline-none ${
                    reviewFieldErrors.quote
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 bg-slate-50 focus:border-accent'
                  }`}
                />
                {reviewFieldErrors.quote && (
                  <p className="mt-1 text-[11px] text-rose-600 font-body">
                    {reviewFieldErrors.quote}
                  </p>
                )}
              </div>

              {reviewFormError && (
                <div className="flex items-start gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] text-rose-700 font-body">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{reviewFormError}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 py-3.5 px-6 rounded-full bg-brand hover:bg-accent text-brand-contrast font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {editingReviewId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>
                    {submittingReview
                      ? editingReviewId
                        ? 'Saving changes...'
                        : 'Adding Review...'
                      : editingReviewId
                      ? 'Save changes'
                      : 'Add Review'}
                  </span>
                </button>
                {editingReviewId && (
                  <button
                    type="button"
                    onClick={cancelEditReview}
                    disabled={submittingReview}
                    className="py-3.5 px-5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-display font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
              <div>
                <h3 className="font-display font-bold text-sm sm:text-base text-brand uppercase tracking-tight">
                  Active Homepage Reviews ({filteredReviews.length})
                </h3>
                <p className="text-[11px] text-slate-500 font-body">
                  Displayed on the homepage above the contact section. Click Edit or Delete to manage reviews.
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search reviews by name, city, property, or quote..."
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-accent"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              </div>

              {filteredReviews.length > 0 ? (
                <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                  {filteredReviews.map((rev) => {
                    const isConfirming = confirmDeleteId === rev.id;
                    const isEditing = editingReviewId === rev.id;
                    const stars = typeof rev.rating === 'number' ? rev.rating : 5;

                    return (
                      <div
                        key={rev.id}
                        className={`flex flex-col gap-2.5 p-3.5 rounded-2xl border bg-white transition-all ${
                          isEditing
                            ? 'border-brand ring-1 ring-brand/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-0.5">
                                {Array.from({ length: stars }).map((_, idx) => (
                                  <Star
                                    key={idx}
                                    className="w-3 h-3 fill-amber-400 text-amber-400"
                                  />
                                ))}
                                <span className="ml-1 text-[11px] font-display font-bold text-brand">
                                  {stars.toFixed(1)}
                                </span>
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="text-[10px] font-display uppercase tracking-wider text-accent font-bold">
                                {rev.location}
                              </span>
                            </div>

                            <h4 className="font-display font-bold text-sm text-brand">
                              {rev.author}{' '}
                              <span className="font-body font-normal text-xs text-slate-500">
                                — {rev.role}
                              </span>
                            </h4>

                            <p className="font-body text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              “{rev.quote}”
                            </p>

                            <div className="text-[11px] font-body text-slate-500">
                              <span>{rev.propertyContext}</span>
                              {rev.date && (
                                <>
                                  <span> · </span>
                                  <span>{rev.date}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                            <button
                              type="button"
                              onClick={() => startEditReview(rev.id)}
                              className={`px-3 py-1.5 rounded-full border text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                isEditing
                                  ? 'bg-brand text-brand-contrast border-brand'
                                  : 'bg-slate-50 hover:bg-brand text-brand hover:text-brand-contrast border-slate-200 hover:border-brand'
                              }`}
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            {!isConfirming && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(rev.id)}
                                className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {isConfirming && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">
                            <span className="text-[11px] font-body font-medium text-rose-800">
                              Delete this review? This cannot be undone.
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleRemove('reviews', rev.id, rev.author)}
                                className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center space-y-1.5 border border-dashed border-slate-200 bg-white rounded-2xl">
                  <p className="font-display font-bold text-xs text-brand uppercase">
                    No Reviews Found
                  </p>
                  <p className="text-[11px] text-slate-500 font-body">
                    Add a new review using the form or clear your search filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
