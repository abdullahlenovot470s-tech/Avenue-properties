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
} from 'lucide-react';
import { useCatalog, CityOption } from '../context/CatalogContext';
import { useToast } from '../context/ToastContext';
import { SafeImage } from '../components/common/SafeImage';
import { formatRent } from '../data/rentalsData';
import type { ProjectStatus, BuyStatus, RentStatus, PropertyStatus } from '../types';

type FilterView = 'all' | 'projects' | 'buy' | 'rent';
type SectionKey = 'projects' | 'buy' | 'rent';

const CITIES: CityOption[] = ['Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Murree & Hills'];

const PROJECT_STATUSES: ProjectStatus[] = ['Available', 'Under Offer', 'Sold'];
const BUY_STATUSES: BuyStatus[] = ['Available', 'Under Offer', 'Sold'];
const RENT_STATUSES: RentStatus[] = ['Available', 'Rented'];

const MAX_PHOTOS = 4;
const MAX_PAYLOAD_BYTES = 800 * 1024; // 800 KB limit matching server.ts

const SAMPLE_PHOTOS = [
  { label: 'Modern Residence', url: '/stock/photo-1600596542815-ffad4c1539a9.jpg' },
  { label: 'Luxury Estate', url: '/stock/photo-1580587771525-78b9dba3b914.jpg' },
  { label: 'Apartment', url: '/stock/photo-1545324418-cc1a3fa10c00.jpg' },
  { label: 'Hillside Home', url: '/stock/photo-1518780664697-55e3ad937233.jpg' },
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
  if (trimmed.startsWith('data:image/jpeg;base64,')) {
    return trimmed.length > 'data:image/jpeg;base64,'.length;
  }
  if (trimmed.startsWith('/')) {
    return trimmed.length > 1;
  }
  return /^https?:\/\/\S+$/i.test(trimmed);
}

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1000;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to load file'));
    reader.readAsDataURL(file);
  });
}

interface GalleryManagerProps {
  photos: string[];
  onChange: (next: string[]) => void;
  estimateBasePayload: Record<string, unknown>;
  onError?: (msg: string | null) => void;
  error?: string | null;
}

const GalleryManager: React.FC<GalleryManagerProps> = ({
  photos,
  onChange,
  estimateBasePayload,
  onError,
  error,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { showToast } = useToast();

  const displayedError = error || localError;

  const tryApplyGallery = (nextGallery: string[], successMsg?: string) => {
    const estimatedBytes = estimateUtf8Bytes({
      ...estimateBasePayload,
      image: nextGallery[0] || '',
      gallery: nextGallery,
    });
    if (estimatedBytes > MAX_PAYLOAD_BYTES) {
      const msg = `Listing exceeds the 800 KB size limit (currently ~${Math.ceil(
        estimatedBytes / 1024
      )} KB). Remove a photo or use smaller compressed images.`;
      setLocalError(msg);
      onError?.(msg);
      showToast('Photo size limit (800 KB) exceeded.', 'error');
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
      setLocalError('Enter a valid https:// image URL or local /stock/ path.');
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
    let working = [...photos];
    let addedCount = 0;

    for (const file of toProcess) {
      try {
        const compressed = await compressImageFile(file);
        const candidate = [...working, compressed];
        const estimatedBytes = estimateUtf8Bytes({
          ...estimateBasePayload,
          image: candidate[0] || '',
          gallery: candidate,
        });
        if (estimatedBytes > MAX_PAYLOAD_BYTES) {
          const msg = `Adding "${file.name}" exceeds the 800 KB size limit (~${Math.ceil(
            estimatedBytes / 1024
          )} KB). Use fewer or smaller photos.`;
          setLocalError(msg);
          onError?.(msg);
          showToast('Listing payload exceeds 800 KB limit.', 'error');
          if (addedCount > 0) {
            onChange(working);
          }
          return;
        }
        working = candidate;
        addedCount += 1;
      } catch {
        setLocalError('Could not read one of the selected image files.');
        showToast('Could not read selected image file.', 'error');
        return;
      }
    }

    if (addedCount > 0) {
      setLocalError(null);
      onError?.(null);
      onChange(working);
      showToast(
        addedCount === 1 ? 'Photo compressed and added.' : `${addedCount} photos compressed and added.`,
        'success'
      );
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
        <span className="text-[11px] font-display font-semibold text-[#2F4B73]">
          {photos.length} of {MAX_PHOTOS} photos
        </span>
      </div>

      {/* Thumbnails Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {photos.map((photoUrl, idx) => (
            <div
              key={`${idx}-${photoUrl.slice(0, 32)}`}
              className={`relative rounded-xl overflow-hidden border bg-slate-100 ${
                idx === 0 ? 'border-[#1B2A44] ring-1 ring-[#1B2A44]/20' : 'border-slate-200'
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
                  <span className="px-2 py-0.5 rounded-full bg-[#1B2A44] text-white text-[10px] font-display uppercase tracking-wider font-semibold">
                    Main Photo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetMain(idx)}
                    className="w-full py-0.5 px-2 rounded-full bg-slate-100 hover:bg-[#1B2A44] text-[#1B2A44] hover:text-white text-[10px] font-display uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                  >
                    Set as main photo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-1 px-3 text-center">
          <ImageIcon className="w-5 h-5" />
          <span className="text-[11px] font-body">
            Optional: upload or paste URLs (defaults to a standard property photo if left empty)
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
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
            />
            <button
              type="button"
              onClick={handleAddUrl}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-[#1B2A44] text-[#1B2A44] hover:text-white text-[11px] font-display uppercase tracking-wider font-semibold transition-colors cursor-pointer shrink-0"
            >
              Add URL
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[10px] font-display uppercase tracking-wider font-semibold text-[#1B2A44] cursor-pointer transition-colors">
              <Upload className="w-3 h-3" />
              <span>Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                multiple
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
                    ? 'bg-[#1B2A44] text-white border-[#1B2A44]'
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
            Pasted image URLs load fastest for longer catalogs; uploaded photos are compressed (max 800 KB per listing).
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
        <h3 className="font-display font-bold text-sm sm:text-base text-[#1B2A44] uppercase tracking-tight">
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
        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#2F4B73]"
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
                  ? 'border-[#1B2A44] ring-1 ring-[#1B2A44]/20'
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
                      <span className="text-[10px] font-display uppercase tracking-wider text-[#2F4B73] font-bold">
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
                    <h4 className="font-display font-bold text-sm text-[#1B2A44] truncate">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-display font-bold text-[#1B2A44]">{item.priceLabel}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{item.meta}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link
                    to={item.link}
                    className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-[#1B2A44] text-[11px] font-display uppercase tracking-wider font-semibold text-[#1B2A44] transition-colors"
                  >
                    View
                  </Link>

                  <button
                    type="button"
                    onClick={() => onEdit(item.id)}
                    className={`px-3 py-1.5 rounded-full border text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      isEditing
                        ? 'bg-[#1B2A44] text-white border-[#1B2A44]'
                        : 'bg-slate-50 hover:bg-[#1B2A44] text-[#1B2A44] hover:text-white border-slate-200 hover:border-[#1B2A44]'
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
        <p className="font-display font-bold text-xs text-[#1B2A44] uppercase">
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
  category: 'Lahore' as CityOption,
  valuation: '',
  size: '1 Kanal',
  beds: '5',
  baths: '6',
  projectDelivered: String(new Date().getFullYear()),
  architect: 'Avenue Design Atelier',
  summary: '',
  status: 'Available' as ProjectStatus,
  gallery: [] as string[],
});

const createDefaultBuyForm = () => ({
  title: '',
  city: 'Lahore' as CityOption,
  location: '',
  type: 'House' as 'House' | 'Apartment' | 'Plot',
  price: '',
  area: '10 Marla',
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
  city: 'Lahore' as CityOption,
  areaSociety: '',
  type: 'House' as 'Apartment' | 'House' | 'Upper Portion' | 'Lower Portion',
  monthlyRent: '',
  beds: '3',
  baths: '3',
  sizeOrFloor: '10 Marla',
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

export const ManageCatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = (searchParams.get('tab') as FilterView) || 'all';
  const [activeView, setActiveView] = useState<FilterView>(
    ['all', 'projects', 'buy', 'rent'].includes(initialParam) ? initialParam : 'all'
  );

  const {
    portfolioProjects,
    propertyListings,
    buyProperties,
    rentalListings,
    backendReachable,
    addProject,
    updateProject,
    removeProject,
    addBuyProperty,
    updateBuy,
    removeBuyProperty,
    addRentalListing,
    updateRental,
    removeRentalListing,
    resetCatalog,
  } = useCatalog();
  const { showToast } = useToast();

  // Independent search & confirmation states per section
  const [projSearch, setProjSearch] = useState('');
  const [buySearch, setBuySearch] = useState('');
  const [rentSearch, setRentSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmResetSection, setConfirmResetSection] = useState<'all' | SectionKey | null>(null);

  const [submittingProj, setSubmittingProj] = useState(false);
  const [submittingBuy, setSubmittingBuy] = useState(false);
  const [submittingRent, setSubmittingRent] = useState(false);

  // Edit mode IDs per section
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [editingBuyId, setEditingBuyId] = useState<string | null>(null);
  const [editingRentId, setEditingRentId] = useState<string | null>(null);

  // Form refs for smooth scroll when clicking Edit
  const projFormRef = useRef<HTMLFormElement>(null);
  const buyFormRef = useRef<HTMLFormElement>(null);
  const rentFormRef = useRef<HTMLFormElement>(null);

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

  // Form states
  const [projForm, setProjForm] = useState(createDefaultProjForm);
  const [buyForm, setBuyForm] = useState(createDefaultBuyForm);
  const [rentForm, setRentForm] = useState(createDefaultRentForm);

  useEffect(() => {
    document.title = 'Manage Inventory | Avenue Luxury Properties';
  }, []);

  useEffect(() => {
    const paramTab = searchParams.get('tab') as FilterView;
    if (paramTab && ['all', 'projects', 'buy', 'rent'].includes(paramTab)) {
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
        architect: portfolio.architect || 'Avenue Design Atelier',
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
        architect: listing.architect || listing.architecturalStyle || 'Avenue Design Atelier',
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
      sizeOrFloor: item.sizeOrFloor || '10 Marla',
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
      fieldErrors.monthlyRent = 'Enter a valid monthly rent in PKR greater than 0.';
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

  const handleRemove = async (section: SectionKey, id: string, title: string) => {
    let res;
    if (section === 'projects') {
      res = await removeProject(id);
    } else if (section === 'buy') {
      res = await removeBuyProperty(id);
    } else {
      res = await removeRentalListing(id);
    }

    setConfirmDeleteId(null);
    if (res.success) {
      if (section === 'projects' && editingProjId === id) cancelEditProject();
      if (section === 'buy' && editingBuyId === id) cancelEditBuy();
      if (section === 'rent' && editingRentId === id) cancelEditRent();
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
      showToast(
        section === 'all'
          ? 'Restored default listings across Projects, Buy, and Rent.'
          : `Restored default ${section} listings.`,
        'success'
      );
    } else {
      showToast(res.error || 'Could not restore defaults.', 'error');
    }
  };

  const showProjects = activeView === 'all' || activeView === 'projects';
  const showBuy = activeView === 'all' || activeView === 'buy';
  const showRent = activeView === 'all' || activeView === 'rent';

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="px-2">
        <ol className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-slate-500">
          <li>
            <Link to="/" className="hover:text-[#1B2A44] transition-colors">
              Home
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </li>
          <li className="text-[#1B2A44] font-bold" aria-current="page">
            Manage Inventory
          </li>
        </ol>
      </nav>

      {/* Centralized Inventory Overview & View Filter */}
      <section className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-10 shadow-xl border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[11px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block">
              Centralized Property Manager
            </span>
            <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-[#1B2A44] uppercase tracking-tight leading-none">
              MANAGE INVENTORY
            </h1>
            <p className="font-body text-xs sm:text-sm text-slate-600 max-w-2xl">
              Add, edit, or delete listings across Projects, Buy, and Rent from one integrated workspace. All changes save immediately to the backend.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/records"
              className="px-4 py-2 rounded-full bg-[#1B2A44] hover:bg-[#2F4B73] text-white text-xs font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Client Records</span>
            </Link>
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
                className="px-4 py-2 rounded-full border border-slate-200 hover:border-[#1B2A44] text-slate-700 text-xs font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore All Defaults</span>
              </button>
            )}
          </div>
        </div>

        {!backendReachable && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 font-body">
            Backend server is currently unreachable. Showing built-in listings; adding, editing, or deleting items requires an active server connection.
          </div>
        )}

        {/* Integrated Filter Pills */}
        <div className="flex flex-wrap gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => switchView('all')}
            className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'all'
                ? 'bg-[#1B2A44] text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>
              All Sections ({allProjects.length + buyProperties.length + rentalListings.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchView('projects')}
            className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'projects'
                ? 'bg-[#1B2A44] text-white shadow-md'
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
                ? 'bg-[#1B2A44] text-white shadow-md'
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
                ? 'bg-[#1B2A44] text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Rent ({rentalListings.length})</span>
          </button>
        </div>
      </section>

      {/* SECTION 01: PROJECTS PAGE ADD / EDIT / DELETE */}
      {showProjects && (
        <section className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1B2A44] text-white flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block">
                  01 · Projects Page
                </span>
                <h2 className="font-display font-extrabold text-xl text-[#1B2A44] uppercase tracking-tight">
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
                className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-[#1B2A44] text-[11px] font-display uppercase tracking-wider font-semibold text-[#1B2A44] flex items-center gap-1.5 transition-colors"
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
                  <span className="text-[11px] font-display uppercase tracking-wider font-bold text-[#1B2A44] truncate">
                    Editing: {projForm.title || 'Project'}
                  </span>
                  <button
                    type="button"
                    onClick={cancelEditProject}
                    className="text-[11px] font-display uppercase tracking-wider text-slate-600 hover:text-[#1B2A44] font-semibold cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <GalleryManager
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
                      : 'border-slate-200 bg-slate-50 focus:border-[#2F4B73]'
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
                    placeholder="e.g. PKR 12.5 Crore"
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
                        : 'border-slate-200 bg-slate-50 focus:border-[#2F4B73]'
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
                    placeholder="e.g. Sector F-6/3, Islamabad"
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
                        : 'border-slate-200 bg-slate-50 focus:border-[#2F4B73]'
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
                    placeholder="1 Kanal"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
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
                  className="flex-1 py-3.5 px-6 rounded-full bg-[#1B2A44] hover:bg-[#2F4B73] text-white font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
              <div className="w-10 h-10 rounded-full bg-[#1B2A44] text-white flex items-center justify-center shrink-0">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block">
                  02 · Buy Page
                </span>
                <h2 className="font-display font-extrabold text-xl text-[#1B2A44] uppercase tracking-tight">
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
                className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-[#1B2A44] text-[11px] font-display uppercase tracking-wider font-semibold text-[#1B2A44] flex items-center gap-1.5 transition-colors"
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
                  <span className="text-[11px] font-display uppercase tracking-wider font-bold text-[#1B2A44] truncate">
                    Editing: {buyForm.title || 'Buy Listing'}
                  </span>
                  <button
                    type="button"
                    onClick={cancelEditBuy}
                    className="text-[11px] font-display uppercase tracking-wider text-slate-600 hover:text-[#1B2A44] font-semibold cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <GalleryManager
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
                  placeholder="e.g. 1 Kanal Modern Bungalow, DHA Phase 6"
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
                      : 'border-slate-200 bg-slate-50 focus:border-[#2F4B73]'
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
                    placeholder="e.g. PKR 8.5 Crore"
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
                        : 'border-slate-200 bg-slate-50 focus:border-[#2F4B73]'
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
                    placeholder="e.g. 1 Kanal"
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
                  placeholder="e.g. Block K, DHA Phase 6, Lahore"
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
                      : 'border-slate-200 bg-slate-50 focus:border-[#2F4B73]'
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
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
                  className="flex-1 py-3.5 px-6 rounded-full bg-[#1B2A44] hover:bg-[#2F4B73] text-white font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
              <div className="w-10 h-10 rounded-full bg-[#1B2A44] text-white flex items-center justify-center shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block">
                  03 · Rent Page
                </span>
                <h2 className="font-display font-extrabold text-xl text-[#1B2A44] uppercase tracking-tight">
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
                className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-[#1B2A44] text-[11px] font-display uppercase tracking-wider font-semibold text-[#1B2A44] flex items-center gap-1.5 transition-colors"
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
                  <span className="text-[11px] font-display uppercase tracking-wider font-bold text-[#1B2A44] truncate">
                    Editing: {rentForm.title || 'Rental Listing'}
                  </span>
                  <button
                    type="button"
                    onClick={cancelEditRent}
                    className="text-[11px] font-display uppercase tracking-wider text-slate-600 hover:text-[#1B2A44] font-semibold cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <GalleryManager
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
                      : 'border-slate-200 bg-slate-50 focus:border-[#2F4B73]'
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
                    Monthly Rent (PKR) *
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
                        : 'border-slate-200 bg-slate-50 focus:border-[#2F4B73]'
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
                  placeholder="e.g. Sector F-10/3, Islamabad"
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
                      : 'border-slate-200 bg-slate-50 focus:border-[#2F4B73]'
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
                    placeholder="10 Marla"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
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
                  className="flex-1 py-3.5 px-6 rounded-full bg-[#1B2A44] hover:bg-[#2F4B73] text-white font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
    </div>
  );
};
