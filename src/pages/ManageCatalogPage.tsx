import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
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
} from 'lucide-react';
import { useCatalog, CityOption } from '../context/CatalogContext';
import { useToast } from '../context/ToastContext';
import { SafeImage } from '../components/common/SafeImage';
import { formatRent } from '../data/rentalsData';

type FilterView = 'all' | 'projects' | 'buy' | 'rent';
type SectionKey = 'projects' | 'buy' | 'rent';

const CITIES: CityOption[] = ['Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Murree & Hills'];

const SAMPLE_PHOTOS = [
  { label: 'Modern Villa', url: '/stock/photo-1613490493576-7fde63acd811.jpg' },
  { label: 'Luxury Estate', url: '/stock/photo-1600585154340-be6161a56a0c.jpg' },
  { label: 'Apartment', url: '/stock/photo-1545324418-cc1a3fa10c00.jpg' },
  { label: 'Hillside Home', url: '/stock/photo-1518780664697-55e3ad937233.jpg' },
];

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
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to load file'));
    reader.readAsDataURL(file);
  });
}

interface PhotoSelectorProps {
  value: string;
  onChange: (url: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PhotoSelector: React.FC<PhotoSelectorProps> = ({ value, onChange, onUpload }) => (
  <div className="space-y-2">
    <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold">
      Property Photo
    </label>
    <div className="flex items-center gap-3">
      <div className="w-20 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
        {value ? (
          <SafeImage src={value} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <ImageIcon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        <input
          type="text"
          placeholder="Paste image URL (https://...)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[10px] font-display uppercase tracking-wider font-semibold text-[#1B2A44] cursor-pointer transition-colors">
            <Upload className="w-3 h-3" />
            <span>Upload</span>
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
          {SAMPLE_PHOTOS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => onChange(sample.url)}
              className={`px-2 py-1 rounded-full text-[10px] font-body border cursor-pointer transition-colors ${
                value === sample.url
                  ? 'bg-[#1B2A44] text-white border-[#1B2A44]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

interface InventoryItemSummary {
  id: string;
  title: string;
  location: string;
  city: string;
  priceLabel: string;
  meta: string;
  image: string;
  link: string;
}

interface InventoryItemsPanelProps {
  sectionTitle: string;
  items: InventoryItemSummary[];
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder: string;
  confirmDeleteId: string | null;
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
          Click Remove on any item to take it off the live website immediately.
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

          return (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                  <SafeImage src={item.image} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <span className="text-[10px] font-display uppercase tracking-wider text-[#2F4B73] font-bold block">
                    {item.city}
                  </span>
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

                {isConfirming ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onConfirmDelete(item.id, item.title)}
                      className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Confirm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(null)}
                      className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer"
                      aria-label="Cancel removal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRequestDelete(item.id)}
                    className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
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
    addProject,
    removeProject,
    addBuyProperty,
    removeBuyProperty,
    addRentalListing,
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

  // Project form state
  const [projForm, setProjForm] = useState({
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
    image: SAMPLE_PHOTOS[0].url,
  });

  // Buy property form state
  const [buyForm, setBuyForm] = useState({
    title: '',
    city: 'Lahore' as CityOption,
    location: '',
    type: 'House' as 'House' | 'Apartment' | 'Plot' | 'Penthouse',
    price: '',
    area: '10 Marla',
    beds: '4',
    baths: '4',
    possession: 'Ready to Move',
    nocStatus: 'Society Transfer Ready',
    features: 'Verified Clear Title, Solar Backup Wiring, 24/7 Society Security',
    description: '',
    image: SAMPLE_PHOTOS[1].url,
  });

  // Rent listing form state
  const [rentForm, setRentForm] = useState({
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
    image: SAMPLE_PHOTOS[2].url,
  });

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
      }));
  }, [rentalListings, rentSearch]);

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setter(compressed);
      showToast('Photo uploaded and ready.', 'success');
    } catch {
      showToast('Could not read selected image file.', 'error');
    }
    e.target.value = '';
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projForm.title.trim() || !projForm.location.trim() || !projForm.valuation.trim()) {
      showToast('Please enter a project title, location, and valuation/price.', 'error');
      return;
    }
    setSubmittingProj(true);
    const res = await addProject({
      title: projForm.title,
      location: projForm.location,
      category: projForm.category,
      valuation: projForm.valuation,
      size: projForm.size,
      beds: Number(projForm.beds) || 0,
      baths: Number(projForm.baths) || 0,
      projectDelivered: projForm.projectDelivered,
      architect: projForm.architect,
      summary: projForm.summary,
      image: projForm.image,
    });
    setSubmittingProj(false);

    if (res.success) {
      showToast(`Added "${projForm.title}" to Projects.`, 'success');
      setProjForm({
        ...projForm,
        title: '',
        location: '',
        valuation: '',
        summary: '',
      });
    } else {
      showToast(res.error || 'Could not add project.', 'error');
    }
  };

  const handleAddBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyForm.title.trim() || !buyForm.location.trim() || !buyForm.price.trim()) {
      showToast('Please enter a property title, location, and price.', 'error');
      return;
    }
    setSubmittingBuy(true);
    const res = await addBuyProperty({
      ...buyForm,
      beds: buyForm.type === 'Plot' ? 0 : Number(buyForm.beds) || 0,
      baths: buyForm.type === 'Plot' ? 0 : Number(buyForm.baths) || 0,
    });
    setSubmittingBuy(false);

    if (res.success) {
      showToast(`Added "${buyForm.title}" to Buy listings.`, 'success');
      setBuyForm({
        ...buyForm,
        title: '',
        location: '',
        price: '',
        description: '',
      });
    } else {
      showToast(res.error || 'Could not add property.', 'error');
    }
  };

  const handleAddRent = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericRent = Number(rentForm.monthlyRent);
    if (!rentForm.title.trim() || !rentForm.areaSociety.trim() || !numericRent || numericRent <= 0) {
      showToast('Please enter a rental title, area/society, and monthly rent in PKR.', 'error');
      return;
    }
    setSubmittingRent(true);
    const res = await addRentalListing({
      ...rentForm,
      monthlyRent: numericRent,
      beds: Number(rentForm.beds) || 1,
      baths: Number(rentForm.baths) || 1,
    });
    setSubmittingRent(false);

    if (res.success) {
      showToast(`Added "${rentForm.title}" to Rent listings.`, 'success');
      setRentForm({
        ...rentForm,
        title: '',
        areaSociety: '',
        monthlyRent: '',
        description: '',
      });
    } else {
      showToast(res.error || 'Could not add rental listing.', 'error');
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
      showToast(`Removed "${title}".`, 'info');
    } else {
      showToast(res.error || 'Could not remove item.', 'error');
    }
  };

  const handleReset = async (section: 'all' | SectionKey) => {
    const res = await resetCatalog(section);
    setConfirmResetSection(null);
    if (res.success) {
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
              Add new listings or remove existing ones across Projects, Buy, and Rent from one integrated workspace. All changes save immediately to the backend.
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

      {/* SECTION 01: PROJECTS PAGE ADD / REMOVE */}
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
                  Projects Add &amp; Remove
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
            <form onSubmit={handleAddProject} className="lg:col-span-5 space-y-3.5">
              <PhotoSelector
                value={projForm.image}
                onChange={(url) => setProjForm((prev) => ({ ...prev, image: url }))}
                onUpload={(e) =>
                  handlePhotoUpload(e, (url) => setProjForm((prev) => ({ ...prev, image: url })))
                }
              />

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Margalla Courtyard"
                  value={projForm.title}
                  onChange={(e) => setProjForm({ ...projForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                />
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
                    Price / Valuation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PKR 12.5 Crore"
                    value={projForm.valuation}
                    onChange={(e) => setProjForm({ ...projForm, valuation: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Sector / Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector F-6/3, Islamabad"
                  value={projForm.location}
                  onChange={(e) => setProjForm({ ...projForm, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                />
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

              <button
                type="submit"
                disabled={submittingProj}
                className="w-full py-3.5 px-6 rounded-full bg-[#1B2A44] hover:bg-[#2F4B73] text-white font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                <span>{submittingProj ? 'Adding Project...' : 'Add to Projects'}</span>
              </button>
            </form>

            <InventoryItemsPanel
              sectionTitle="Active Projects"
              items={filteredProjects}
              searchValue={projSearch}
              onSearchChange={setProjSearch}
              searchPlaceholder="Search projects by title, city, or location..."
              confirmDeleteId={confirmDeleteId}
              onRequestDelete={setConfirmDeleteId}
              onConfirmDelete={(id, title) => handleRemove('projects', id, title)}
            />
          </div>
        </section>
      )}

      {/* SECTION 02: BUY PAGE ADD / REMOVE */}
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
                  Buy Listings Add &amp; Remove
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
            <form onSubmit={handleAddBuy} className="lg:col-span-5 space-y-3.5">
              <PhotoSelector
                value={buyForm.image}
                onChange={(url) => setBuyForm((prev) => ({ ...prev, image: url }))}
                onUpload={(e) =>
                  handlePhotoUpload(e, (url) => setBuyForm((prev) => ({ ...prev, image: url })))
                }
              />

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Property Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1 Kanal Modern Bungalow, DHA Phase 6"
                  value={buyForm.title}
                  onChange={(e) => setBuyForm({ ...buyForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    City *
                  </label>
                  <select
                    value={buyForm.city}
                    onChange={(e) => setBuyForm({ ...buyForm, city: e.target.value as CityOption })}
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
                    Property Type
                  </label>
                  <select
                    value={buyForm.type}
                    onChange={(e) =>
                      setBuyForm({
                        ...buyForm,
                        type: e.target.value as 'House' | 'Apartment' | 'Plot' | 'Penthouse',
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="House">House</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Plot">Plot</option>
                    <option value="Penthouse">Penthouse</option>
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
                    required
                    placeholder="e.g. PKR 8.5 Crore"
                    value={buyForm.price}
                    onChange={(e) => setBuyForm({ ...buyForm, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                  />
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
                  required
                  placeholder="e.g. Block K, DHA Phase 6, Lahore"
                  value={buyForm.location}
                  onChange={(e) => setBuyForm({ ...buyForm, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                />
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

              <button
                type="submit"
                disabled={submittingBuy}
                className="w-full py-3.5 px-6 rounded-full bg-[#1B2A44] hover:bg-[#2F4B73] text-white font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                <span>{submittingBuy ? 'Adding Property...' : 'Add to Buy Page'}</span>
              </button>
            </form>

            <InventoryItemsPanel
              sectionTitle="Active Buy Listings"
              items={filteredBuy}
              searchValue={buySearch}
              onSearchChange={setBuySearch}
              searchPlaceholder="Search buy listings by title, city, or location..."
              confirmDeleteId={confirmDeleteId}
              onRequestDelete={setConfirmDeleteId}
              onConfirmDelete={(id, title) => handleRemove('buy', id, title)}
            />
          </div>
        </section>
      )}

      {/* SECTION 03: RENT PAGE ADD / REMOVE */}
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
                  Rent Listings Add &amp; Remove
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
            <form onSubmit={handleAddRent} className="lg:col-span-5 space-y-3.5">
              <PhotoSelector
                value={rentForm.image}
                onChange={(url) => setRentForm((prev) => ({ ...prev, image: url }))}
                onUpload={(e) =>
                  handlePhotoUpload(e, (url) => setRentForm((prev) => ({ ...prev, image: url })))
                }
              />

              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                  Rental Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3-Bed Designer Apartment, Gulberg III"
                  value={rentForm.title}
                  onChange={(e) => setRentForm({ ...rentForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    City *
                  </label>
                  <select
                    value={rentForm.city}
                    onChange={(e) =>
                      setRentForm({ ...rentForm, city: e.target.value as CityOption })
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
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="House">House</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Upper Portion">Upper Portion</option>
                    <option value="Lower Portion">Lower Portion</option>
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
                    min="5000"
                    required
                    placeholder="e.g. 180000"
                    value={rentForm.monthlyRent}
                    onChange={(e) => setRentForm({ ...rentForm, monthlyRent: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                  />
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
                  required
                  placeholder="e.g. Sector F-10/3, Islamabad"
                  value={rentForm.areaSociety}
                  onChange={(e) => setRentForm({ ...rentForm, areaSociety: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                />
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

              <button
                type="submit"
                disabled={submittingRent}
                className="w-full py-3.5 px-6 rounded-full bg-[#1B2A44] hover:bg-[#2F4B73] text-white font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                <span>{submittingRent ? 'Adding Rental...' : 'Add to Rent Page'}</span>
              </button>
            </form>

            <InventoryItemsPanel
              sectionTitle="Active Rentals"
              items={filteredRent}
              searchValue={rentSearch}
              onSearchChange={setRentSearch}
              searchPlaceholder="Search rentals by title, city, or society..."
              confirmDeleteId={confirmDeleteId}
              onRequestDelete={setConfirmDeleteId}
              onConfirmDelete={(id, title) => handleRemove('rent', id, title)}
            />
          </div>
        </section>
      )}
    </div>
  );
};
