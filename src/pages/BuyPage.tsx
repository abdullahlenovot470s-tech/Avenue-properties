import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

export const BuyPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedPrice, setSelectedPrice] = useState<string>('All');
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'price-desc' | 'price-asc'>('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { isPropertySaved, toggleSaveProperty } = useAuth();
  const { buyProperties } = useCatalog();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = 'Properties for Sale | Avenue Luxury Properties';
  }, []);

  const cities = ['All', 'Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Murree & Hills'];
  const types = ['All', 'House', 'Plot', 'Penthouse', 'Apartment'];
  const priceOptions = ['All', 'Under 5 Crore', '5 - 10 Crore', '10 - 20 Crore', '20 Crore+'];
  const areaOptions = ['All', '10 Marla', '1 Kanal', '2 Kanal', '1,000 Sq. Yards+'];

  const filteredProperties = useMemo(() => {
    return buyProperties.filter((prop) => {
      const matchCity = selectedCity === 'All' || prop.city === selectedCity;
      const matchType = selectedType === 'All' || prop.type === selectedType;

      let matchPrice = true;
      if (selectedPrice === 'Under 5 Crore') matchPrice = prop.numericPrice < 50000000;
      else if (selectedPrice === '5 - 10 Crore') matchPrice = prop.numericPrice >= 50000000 && prop.numericPrice <= 100000000;
      else if (selectedPrice === '10 - 20 Crore') matchPrice = prop.numericPrice > 100000000 && prop.numericPrice <= 200000000;
      else if (selectedPrice === '20 Crore+') matchPrice = prop.numericPrice > 200000000;

      let matchArea = true;
      if (selectedArea !== 'All') {
        matchArea = prop.area.toLowerCase().includes(selectedArea.toLowerCase());
      }

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        prop.title.toLowerCase().includes(q) ||
        prop.location.toLowerCase().includes(q) ||
        prop.city.toLowerCase().includes(q) ||
        prop.area.toLowerCase().includes(q);

      return matchCity && matchType && matchPrice && matchArea && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'price-desc') return b.numericPrice - a.numericPrice;
      if (sortBy === 'price-asc') return a.numericPrice - b.numericPrice;
      return 0;
    });
  }, [buyProperties, selectedCity, selectedType, selectedPrice, selectedArea, searchQuery, sortBy]);

  const hasActiveFilters =
    selectedCity !== 'All' ||
    selectedType !== 'All' ||
    selectedPrice !== 'All' ||
    selectedArea !== 'All' ||
    searchQuery.trim() !== '';

  const handleClearFilters = () => {
    setSelectedCity('All');
    setSelectedType('All');
    setSelectedPrice('All');
    setSelectedArea('All');
    setSearchQuery('');
    setSortBy('featured');
    showToast('Filters cleared', 'info');
  };

  const handleHeartClick = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isNowSaved = toggleSaveProperty(id);
    if (isNowSaved) {
      showToast(`Saved "${name}" to your shortlist.`, 'success');
    } else {
      showToast(`Removed "${name}" from shortlist.`, 'info');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
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
            Buy
          </li>
        </ol>
      </nav>

      {/* Header Banner with Ghost Watermark "BUY" */}
      <section className="relative w-full bg-white rounded-[24px] sm:rounded-[32px] overflow-hidden p-4 sm:p-10 md:p-14 shadow-xl border border-slate-100">
        <div className="absolute top-4 right-0 pointer-events-none select-none overflow-hidden max-w-full z-0">
          <span
            className="font-display font-black leading-none uppercase tracking-tighter text-[#E2E8F0]/30 select-none"
            style={{ fontSize: 'clamp(4rem, 14vw, 8.5rem)' }}
          >
            BUY
          </span>
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="text-[11px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block">
            Residential Acquisitions & Plots
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl text-[#1B2A44] uppercase tracking-tight leading-none">
            PROPERTIES FOR SALE.
          </h1>
          <p className="font-body text-xs sm:text-base text-[#1B2A44]/80 leading-relaxed font-light">
            Verified houses, premium apartments, and residential plots across Lahore, Islamabad, Karachi, Rawalpindi, and Murree Hills with guaranteed clean titles.
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

          {/* Desktop/Tablet Secondary Filters: Type, Price, Area, Search Box, Clear Filters (sm and up) */}
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
                value={selectedPrice}
                onChange={(e) => setSelectedPrice(e.target.value)}
                className="px-3.5 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase tracking-wider focus:outline-none cursor-pointer"
              >
                {priceOptions.map((price) => (
                  <option key={price} value={price}>
                    {price === 'All' ? 'All Prices' : price}
                  </option>
                ))}
              </select>

              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="px-3.5 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase tracking-wider focus:outline-none cursor-pointer"
              >
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {area === 'All' ? 'All Areas' : area}
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
                  placeholder="Search society, city, plot..."
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
                <option value="price-desc">Price: High to Low</option>
                <option value="price-asc">Price: Low to High</option>
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
                Filter Properties
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
                  placeholder="Search society, city, plot..."
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
                Price Range
              </label>
              <select
                value={selectedPrice}
                onChange={(e) => setSelectedPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase"
              >
                {priceOptions.map((price) => (
                  <option key={price} value={price}>
                    {price === 'All' ? 'All Prices' : price}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-display uppercase tracking-wider text-slate-500 block mb-1">
                Area Size
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase"
              >
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {area === 'All' ? 'All Areas' : area}
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
                <option value="price-desc">Price: High to Low</option>
                <option value="price-asc">Price: Low to High</option>
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

      {/* Properties List */}
      <section className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-3 px-2">
          <span className="text-xs font-display uppercase tracking-widest text-slate-500 font-semibold">
            Showing {filteredProperties.length} Properties for Sale
          </span>
        </div>

        {filteredProperties.length > 0 ? (
          <>
            {/* 1. Mobile Compact Horizontal Row Cards (screens under 640px) */}
            <div className="space-y-3 sm:hidden">
              {filteredProperties.map((prop) => {
                const saved = isPropertySaved(prop.id);
                return (
                  <Link
                    key={prop.id}
                    to={`/buy/${prop.id}`}
                    className="flex bg-white rounded-2xl p-2.5 border border-slate-100 shadow-sm gap-3 items-center group active:scale-[0.99] transition-all"
                  >
                    {/* Photo on left (w-[38%], aspect-[4/3], rounded-xl, object-cover) */}
                    <div className="relative w-[38%] shrink-0 aspect-[4/3] rounded-xl overflow-hidden border border-slate-200/80">
                      <SafeImage
                        src={prop.image}
                        alt={prop.title}
                        width={300}
                        height={225}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => handleHeartClick(e, prop.id, prop.title)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full glass-panel flex items-center justify-center cursor-pointer shadow-xs"
                        aria-label="Save property"
                      >
                        <Heart className={`w-3.5 h-3.5 ${saved ? 'text-rose-500 fill-current' : 'text-white'}`} />
                      </button>
                    </div>

                    {/* Text on right */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="font-display font-bold text-[0.95rem] text-[#1B2A44] leading-tight">
                          {prop.price}
                        </div>
                        <h3 className="font-display font-semibold text-[0.82rem] text-[#1B2A44] line-clamp-2 mt-0.5 leading-snug">
                          {prop.title}
                        </h3>
                        <div className="flex items-center gap-1 text-[0.72rem] text-[#2F4B73] font-medium mt-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{prop.location}</span>
                        </div>
                      </div>
                      <div className="text-[0.72rem] text-slate-500 font-body mt-1 truncate">
                        {prop.type === 'Plot'
                          ? `Area: ${prop.area} · ${prop.possession}`
                          : `${prop.beds} Beds · ${prop.baths} Baths · ${prop.area}`}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* 2. Tablet 2-Column Grid (640px to 1023px) */}
            <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4">
              {filteredProperties.map((prop) => {
                const saved = isPropertySaved(prop.id);
                return (
                  <Link
                    key={prop.id}
                    to={`/buy/${prop.id}`}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-[4/3] max-h-[12rem] overflow-hidden">
                      <SafeImage
                        src={prop.image}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 left-2.5 glass-panel-dark px-2.5 py-0.5 rounded-full text-[9px] uppercase font-display text-white">
                        {prop.city} · {prop.type}
                      </div>
                      <button
                        onClick={(e) => handleHeartClick(e, prop.id, prop.title)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full glass-panel flex items-center justify-center cursor-pointer shadow-sm"
                      >
                        <Heart className={`w-3.5 h-3.5 ${saved ? 'text-rose-500 fill-current' : 'text-white'}`} />
                      </button>
                    </div>
                    <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                      <div>
                        <div className="font-display font-bold text-base text-[#1B2A44]">{prop.price}</div>
                        <h3 className="font-display font-bold text-sm text-[#1B2A44] line-clamp-1 mt-0.5">{prop.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-[#2F4B73] mt-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{prop.location}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 font-body border-t border-slate-100 pt-2 truncate">
                        {prop.type === 'Plot' ? `Area: ${prop.area} · ${prop.possession}` : `${prop.beds} Beds · ${prop.baths} Baths · ${prop.area}`}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* 3. Desktop 3-Column Grid (1024px and up) */}
            <div className="hidden lg:grid grid-cols-3 gap-8">
              {filteredProperties.map((prop) => {
                const saved = isPropertySaved(prop.id);
                return (
                  <div
                    key={prop.id}
                    className="bg-white rounded-[28px] sm:rounded-3xl overflow-hidden shadow-lg border border-slate-100 flex flex-col justify-between group hover:shadow-2xl transition-all duration-300"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <SafeImage
                        src={prop.image}
                        alt={prop.title}
                        width={800}
                        height={600}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-1.5">
                        <span className="glass-panel-dark px-3 py-1 rounded-full text-[10px] uppercase font-display tracking-widest text-white">
                          {prop.city}
                        </span>
                        <span className="glass-panel-dark px-2.5 py-1 rounded-full text-[10px] uppercase font-display tracking-widest text-emerald-300">
                          {prop.type}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleHeartClick(e, prop.id, prop.title)}
                        className={`absolute top-3.5 right-3.5 w-10 h-10 rounded-full glass-panel flex items-center justify-center transition-all cursor-pointer shadow-md ${
                          saved ? 'text-rose-500 fill-rose-500 bg-white/90 scale-105' : 'text-white hover:text-rose-400 hover:scale-105'
                        }`}
                        aria-label="Save property to shortlist"
                        title={saved ? 'Remove from shortlist' : 'Save to shortlist'}
                      >
                        <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <div className="p-6 sm:p-7 flex flex-col justify-between flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-[#2F4B73] font-semibold mb-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{prop.location}</span>
                        </div>
                        <h3 className="font-display font-extrabold text-xl text-[#1B2A44] uppercase tracking-tight group-hover:text-[#2F4B73] transition-colors">
                          {prop.title}
                        </h3>
                        <div className="font-display font-bold text-xl text-[#1B2A44] mt-1.5">
                          {prop.price}
                        </div>
                        <p className="text-xs text-slate-700 font-medium font-body line-clamp-2 mt-2 leading-relaxed">
                          {prop.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-xs text-slate-800 font-body">
                        {prop.type === 'Plot' ? (
                          <>
                            <span className="col-span-2 flex items-center gap-1 font-semibold text-[#1B2A44]">
                              <Maximize2 className="w-3.5 h-3.5 text-[#2F4B73]" /> Area: {prop.area}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                              {prop.possession}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1">
                              <Bed className="w-3.5 h-3.5 text-slate-400" /> {prop.beds} Beds
                            </span>
                            <span className="flex items-center gap-1">
                              <Bath className="w-3.5 h-3.5 text-slate-400" /> {prop.baths} Baths
                            </span>
                            <span className="flex items-center gap-1">
                              <Maximize2 className="w-3.5 h-3.5 text-slate-400" /> {prop.area}
                            </span>
                          </>
                        )}
                      </div>

                      <Link
                        to={`/buy/${prop.id}`}
                        className="w-full py-3 px-5 rounded-full bg-slate-100 hover:bg-[#1B2A44] text-[#1B2A44] hover:text-white font-display text-xs uppercase tracking-widest font-semibold transition-all flex items-center justify-between group/btn cursor-pointer"
                      >
                        <span>View Full Details</span>
                        <span className="w-6 h-6 rounded-full bg-white text-[#1B2A44] flex items-center justify-center group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </Link>
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
              No Properties Match Your Criteria
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto font-body">
              Try adjusting your city, budget bracket, or plot/house type parameters.
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
