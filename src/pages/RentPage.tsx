import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatRent } from '../data/rentalsData';
import { useCatalog } from '../context/CatalogContext';
import { SafeImage } from '../components/common/SafeImage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Search,
  Heart,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  ArrowUpRight,
  ChevronRight,
  RotateCcw,
  Building,
  SlidersHorizontal,
  X,
} from 'lucide-react';

export const RentPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedBeds, setSelectedBeds] = useState<string>('All');
  const [selectedPrice, setSelectedPrice] = useState<string>('All');
  const [selectedFurnished, setSelectedFurnished] = useState<string>('Any');
  const [sortBy, setSortBy] = useState<'featured' | 'rent-asc' | 'rent-desc'>('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { isPropertySaved, toggleSaveProperty } = useAuth();
  const { rentalListings } = useCatalog();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Homes For Rent | Avenue Luxury Properties';
  }, []);

  const cities = ['All', 'Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Murree & Hills'];
  const types = ['All', 'Apartment', 'House', 'Upper Portion', 'Lower Portion'];
  const bedroomOptions = ['All', '1', '2', '3', '4+'];
  const priceOptions = ['All', 'Under 50,000', '50,000-1 Lakh', '1-2 Lakh', '2 Lakh+'];
  const furnishedOptions = ['Any', 'Furnished', 'Unfurnished'];

  const filteredListings = useMemo(() => {
    return rentalListings.filter((item) => {
      const matchCity = selectedCity === 'All' || item.city === selectedCity;
      const matchType = selectedType === 'All' || item.type.toLowerCase() === selectedType.toLowerCase();

      let matchBeds = true;
      if (selectedBeds === '1') matchBeds = item.beds === 1;
      else if (selectedBeds === '2') matchBeds = item.beds === 2;
      else if (selectedBeds === '3') matchBeds = item.beds === 3;
      else if (selectedBeds === '4+') matchBeds = item.beds >= 4;

      let matchPrice = true;
      if (selectedPrice === 'Under 50,000') {
        matchPrice = item.monthlyRent < 50000;
      } else if (selectedPrice === '50,000-1 Lakh') {
        matchPrice = item.monthlyRent >= 50000 && item.monthlyRent <= 100000;
      } else if (selectedPrice === '1-2 Lakh') {
        matchPrice = item.monthlyRent > 100000 && item.monthlyRent <= 200000;
      } else if (selectedPrice === '2 Lakh+') {
        matchPrice = item.monthlyRent > 200000;
      }

      const matchFurnished =
        selectedFurnished === 'Any' ||
        item.furnished.toLowerCase() === selectedFurnished.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.areaSociety.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.sizeOrFloor.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);

      return matchCity && matchType && matchBeds && matchPrice && matchFurnished && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'rent-desc') return b.monthlyRent - a.monthlyRent;
      if (sortBy === 'rent-asc') return a.monthlyRent - b.monthlyRent;
      return 0;
    });
  }, [rentalListings, selectedCity, selectedType, selectedBeds, selectedPrice, selectedFurnished, searchQuery, sortBy]);

  const hasActiveFilters =
    selectedCity !== 'All' ||
    selectedType !== 'All' ||
    selectedBeds !== 'All' ||
    selectedPrice !== 'All' ||
    selectedFurnished !== 'Any' ||
    searchQuery.trim() !== '';

  const handleClearFilters = () => {
    setSelectedCity('All');
    setSelectedType('All');
    setSelectedBeds('All');
    setSelectedPrice('All');
    setSelectedFurnished('Any');
    setSearchQuery('');
    setSortBy('featured');
    showToast('Filters cleared', 'info');
  };

  const handleHeartClick = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isNowSaved = toggleSaveProperty(id);
    if (isNowSaved) {
      showToast(`Saved "${title}" to your shortlist.`, 'success');
    } else {
      showToast(`Removed "${title}" from shortlist.`, 'info');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-6">
      {/* Breadcrumb Navigation: Home / Rent */}
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
            Rent
          </li>
        </ol>
      </nav>

      {/* Header Banner with Ghost Watermark "RENT" */}
      <section className="relative w-full bg-white rounded-[24px] sm:rounded-[32px] overflow-hidden p-4 sm:p-10 md:p-14 shadow-xl border border-slate-100">
        <div className="absolute top-4 right-0 pointer-events-none select-none overflow-hidden max-w-full z-0">
          <span
            className="font-display font-black leading-none uppercase tracking-tighter text-[#E2E8F0]/30 select-none"
            style={{ fontSize: 'clamp(4rem, 16vw, 9.5rem)' }}
          >
            RENT
          </span>
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="text-[11px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block">
            Executive Tenancies & Leasing
          </span>
          <h1
            className="font-display font-extrabold text-[#1B2A44] uppercase tracking-tight leading-none"
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 3rem)' }}
          >
            HOMES FOR RENT
          </h1>
          <p className="font-body text-xs sm:text-base text-[#1B2A44]/80 leading-relaxed font-light">
            Verified apartments, houses and portions for rent in Lahore, Islamabad, Rawalpindi and Karachi.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="relative z-10 pt-6 sm:pt-10 flex flex-col gap-4 border-t border-slate-100 mt-6 sm:mt-8">
          {/* Mobile One Horizontally Scrolling Row: Filters Button + City Chips (< sm) */}
          <div className="flex sm:hidden items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="px-3 py-1.5 rounded-full bg-[#1B2A44] text-white text-xs font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1.5 rounded-full font-display text-xs uppercase tracking-wider font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedCity === city
                    ? 'bg-[#1B2A44] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Desktop/Tablet City Chips (sm and up) */}
          <div className="hidden sm:flex flex-wrap items-center gap-2">
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-4 py-2 rounded-full font-display text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  selectedCity === city
                    ? 'bg-[#1B2A44] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Desktop/Tablet Secondary Filters: Type, Beds, Rent, Furnished, Search (sm and up) */}
          <div className="hidden sm:flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3.5 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase tracking-wider focus:outline-none cursor-pointer"
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type === 'All' ? 'All Types' : type}
                  </option>
                ))}
              </select>

              <select
                value={selectedBeds}
                onChange={(e) => setSelectedBeds(e.target.value)}
                className="px-3.5 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase tracking-wider focus:outline-none cursor-pointer"
              >
                {bedroomOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'All' ? 'All Beds' : `${opt} Bed${opt === '1' ? '' : 's'}`}
                  </option>
                ))}
              </select>

              <select
                value={selectedPrice}
                onChange={(e) => setSelectedPrice(e.target.value)}
                className="px-3.5 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase tracking-wider focus:outline-none cursor-pointer"
              >
                {priceOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'All' ? 'All Rents' : opt}
                  </option>
                ))}
              </select>

              <select
                value={selectedFurnished}
                onChange={(e) => setSelectedFurnished(e.target.value)}
                className="px-3.5 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase tracking-wider focus:outline-none cursor-pointer"
              >
                {furnishedOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'Any' ? 'Furnishing: Any' : opt}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-2 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-display uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search society, city, rent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#2F4B73] focus:bg-white transition-all"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase tracking-wider focus:outline-none cursor-pointer"
              >
                <option value="featured">Featured First</option>
                <option value="rent-asc">Rent: Low to High</option>
                <option value="rent-desc">Rent: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Filters Bottom Sheet */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden bg-black/60 backdrop-blur-xs">
          <div className="w-full bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display font-bold text-base text-[#1B2A44] uppercase tracking-tight">
                Filter Rentals
              </h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-display uppercase tracking-wider text-slate-500 block mb-1">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search society, city, rent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-display uppercase tracking-wider text-slate-500 block mb-1">
                Property Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase"
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type === 'All' ? 'All Types' : type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-display uppercase tracking-wider text-slate-500 block mb-1">
                Bedrooms
              </label>
              <select
                value={selectedBeds}
                onChange={(e) => setSelectedBeds(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase"
              >
                {bedroomOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'All' ? 'All Beds' : `${opt} Bed${opt === '1' ? '' : 's'}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-display uppercase tracking-wider text-slate-500 block mb-1">
                Rent Bracket
              </label>
              <select
                value={selectedPrice}
                onChange={(e) => setSelectedPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase"
              >
                {priceOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'All' ? 'All Rents' : opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-display uppercase tracking-wider text-slate-500 block mb-1">
                Furnishing
              </label>
              <select
                value={selectedFurnished}
                onChange={(e) => setSelectedFurnished(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase"
              >
                {furnishedOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'Any' ? 'Furnishing: Any' : opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-display uppercase tracking-wider text-slate-500 block mb-1">
                Sort Order
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase"
              >
                <option value="featured">Featured First</option>
                <option value="rent-asc">Rent: Low to High</option>
                <option value="rent-desc">Rent: High to Low</option>
              </select>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => {
                  handleClearFilters();
                  setMobileFiltersOpen(false);
                }}
                className="flex-1 py-3 rounded-full border border-slate-200 font-display text-xs uppercase tracking-wider font-semibold text-slate-700 text-center cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 py-3 rounded-full bg-[#1B2A44] text-white font-display text-xs uppercase tracking-wider font-semibold text-center shadow-md cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rentals List */}
      <section className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-3 px-2">
          <span className="text-xs font-display uppercase tracking-widest text-slate-500 font-semibold">
            Showing {filteredListings.length} Homes for Rent
          </span>
        </div>

        {filteredListings.length > 0 ? (
          <>
            {/* 1. Mobile Compact Horizontal Row Cards (screens under 640px) */}
            <div className="space-y-3 sm:hidden">
              {filteredListings.map((listing) => {
                const saved = isPropertySaved(listing.id);
                return (
                  <div
                    key={listing.id}
                    onClick={() => navigate(`/rent/${listing.id}`)}
                    className="flex bg-white rounded-2xl p-2.5 border border-slate-100 shadow-sm gap-3 items-center group cursor-pointer active:scale-[0.99] transition-all"
                  >
                    {/* Photo on left (w-[38%], aspect-[4/3], rounded-xl, object-cover) */}
                    <div className="relative w-[38%] shrink-0 aspect-[4/3] rounded-xl overflow-hidden border border-slate-200/80">
                      <SafeImage
                        src={listing.image}
                        alt={listing.title}
                        width={300}
                        height={225}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => handleHeartClick(e, listing.id, listing.title)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full glass-panel flex items-center justify-center cursor-pointer shadow-xs"
                        aria-label="Save rental"
                      >
                        <Heart className={`w-3.5 h-3.5 ${saved ? 'text-rose-500 fill-current' : 'text-white'}`} />
                      </button>
                    </div>

                    {/* Text on right */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-display font-bold text-[0.95rem] text-[#1B2A44] leading-tight truncate">
                            {formatRent(listing.monthlyRent)}
                          </div>
                          {listing.status && listing.status !== 'Available' && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-display uppercase tracking-wider font-bold bg-rose-600 text-white border border-rose-500">
                              {listing.status}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-semibold text-[0.82rem] text-[#1B2A44] line-clamp-2 mt-0.5 leading-snug">
                          {listing.title}
                        </h3>
                        <div className="flex items-center gap-1 text-[0.72rem] text-[#2F4B73] font-medium mt-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{listing.areaSociety}</span>
                        </div>
                      </div>
                      <div className="text-[0.72rem] text-slate-500 font-body mt-1 truncate">
                        {listing.beds} Beds · {listing.baths} Baths · {listing.sizeOrFloor}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Tablet 2-Column Grid (640px to 1023px) */}
            <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4">
              {filteredListings.map((listing) => {
                const saved = isPropertySaved(listing.id);
                return (
                  <div
                    key={listing.id}
                    onClick={() => navigate(`/rent/${listing.id}`)}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="relative aspect-[4/3] max-h-[12rem] overflow-hidden">
                      <SafeImage
                        src={listing.image}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 left-2.5 right-12 flex flex-wrap gap-1.5">
                        <span className="glass-panel-dark px-2.5 py-0.5 rounded-full text-[9px] uppercase font-display text-white">
                          {listing.city} · FOR RENT
                        </span>
                        {listing.status && listing.status !== 'Available' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] uppercase font-display font-bold bg-rose-600 text-white border border-rose-500">
                            {listing.status}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleHeartClick(e, listing.id, listing.title)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full glass-panel flex items-center justify-center cursor-pointer shadow-sm"
                      >
                        <Heart className={`w-3.5 h-3.5 ${saved ? 'text-rose-500 fill-current' : 'text-white'}`} />
                      </button>
                    </div>
                    <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                      <div>
                        <div className="font-display font-bold text-base text-[#1B2A44]">{formatRent(listing.monthlyRent)}</div>
                        <h3 className="font-display font-bold text-sm text-[#1B2A44] line-clamp-1 mt-0.5">{listing.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-[#2F4B73] mt-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{listing.areaSociety}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 font-body border-t border-slate-100 pt-2 truncate">
                        {listing.beds} Beds · {listing.baths} Baths · {listing.sizeOrFloor}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. Desktop 3-Column Grid (1024px and up) */}
            <div className="hidden lg:grid grid-cols-3 gap-8">
              {filteredListings.map((listing) => {
                const saved = isPropertySaved(listing.id);

                return (
                  <div
                    key={listing.id}
                    onClick={() => navigate(`/rent/${listing.id}`)}
                    className="bg-white rounded-[28px] sm:rounded-3xl overflow-hidden shadow-lg border border-slate-100 flex flex-col justify-between group hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <SafeImage
                        src={listing.image}
                        alt={listing.title}
                        width={800}
                        height={600}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                      />

                      <div className="absolute top-3.5 left-3.5 right-14 flex flex-wrap gap-1.5">
                        <span className="glass-panel-dark px-3 py-1 rounded-full text-[10px] uppercase font-display tracking-widest text-white">
                          {listing.city}
                        </span>
                        <span className="glass-panel-dark px-2.5 py-1 rounded-full text-[10px] uppercase font-display tracking-widest text-emerald-300 font-bold">
                          FOR RENT
                        </span>
                        <span className="glass-panel-dark px-2.5 py-1 rounded-full text-[10px] uppercase font-display tracking-widest text-white/90">
                          {listing.type}
                        </span>
                        {listing.status && listing.status !== 'Available' && (
                          <span className="px-3 py-1 rounded-full text-[10px] uppercase font-display tracking-widest font-bold bg-rose-600 text-white border border-rose-500 shadow-sm">
                            {listing.status}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleHeartClick(e, listing.id, listing.title)}
                        className={`absolute top-3.5 right-3.5 w-10 h-10 rounded-full glass-panel flex items-center justify-center transition-all cursor-pointer shadow-md ${
                          saved
                            ? 'text-rose-500 fill-rose-500 bg-white/90 scale-105'
                            : 'text-white hover:text-rose-400 hover:scale-105'
                        }`}
                        aria-label="Save rental to shortlist"
                        title={saved ? 'Remove from shortlist' : 'Save to shortlist'}
                      >
                        <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <div className="p-6 sm:p-7 flex flex-col justify-between flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-[#2F4B73] font-semibold mb-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{listing.areaSociety}</span>
                        </div>

                        <h3 className="font-display font-extrabold text-xl text-[#1B2A44] uppercase tracking-tight group-hover:text-[#2F4B73] transition-colors">
                          {listing.title}
                        </h3>

                        <div className="font-display font-bold text-xl text-[#1B2A44] mt-1.5">
                          {formatRent(listing.monthlyRent)}
                        </div>

                        <p className="text-xs text-slate-700 font-medium font-body line-clamp-2 mt-2 leading-relaxed">
                          {listing.description}
                        </p>
                      </div>

                      <div className="py-3 border-y border-slate-100 text-xs text-slate-700 font-body flex items-center justify-between font-medium">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5 text-slate-400" /> {listing.beds} Beds
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Bath className="w-3.5 h-3.5 text-slate-400" /> {listing.baths} Baths
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-[#1B2A44] font-semibold">
                          <Maximize2 className="w-3.5 h-3.5 text-[#2F4B73]" /> {listing.sizeOrFloor}
                        </span>
                      </div>

                      <div className="w-full py-3 px-5 rounded-full bg-slate-100 group-hover:bg-[#1B2A44] text-[#1B2A44] group-hover:text-white font-display text-xs uppercase tracking-widest font-semibold transition-all flex items-center justify-between">
                        <span>View Rental Details</span>
                        <span className="w-6 h-6 rounded-full bg-white text-[#1B2A44] flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-md space-y-3">
            <Building className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-display font-bold text-lg text-[#1B2A44] uppercase">
              No Homes Match Your Filters
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto font-body">
              Try adjusting your city, property type, rent bracket, or furnishing parameters.
            </p>
            <div className="pt-2">
              <button
                onClick={handleClearFilters}
                className="px-5 py-2.5 rounded-full bg-[#1B2A44] text-white font-display text-xs uppercase tracking-wider font-semibold hover:bg-[#2F4B73] transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
