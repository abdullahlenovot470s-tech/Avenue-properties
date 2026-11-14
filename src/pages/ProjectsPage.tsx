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
  SlidersHorizontal,
  X,
  RotateCcw,
} from 'lucide-react';
import type { ProjectStatus } from '../types';
import { BRAND_CONFIG } from '../config/brand.config';

const getStatusBadgeStyle = (status?: ProjectStatus) =>
  status === 'Sold'
    ? 'bg-rose-600 text-white border-rose-500'
    : 'bg-amber-500 text-white border-amber-400';

interface UnifiedProject {
  id: string;
  name: string;
  location: string;
  price: string;
  numericPrice: number;
  beds: number;
  baths: number;
  sqft: string;
  category: string;
  image: string;
  architect: string;
  description: string;
  yearBuilt: number | string;
  status?: ProjectStatus;
}

export const ProjectsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'price-desc' | 'price-asc'>('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { isPropertySaved, toggleSaveProperty } = useAuth();
  const { propertyListings, portfolioProjects } = useCatalog();
  const { showToast } = useToast();

  // Combine both portfolio items and property listings for an exhaustive catalog
  const allProjects: UnifiedProject[] = useMemo(() => {
    const listA: UnifiedProject[] = propertyListings.map((p) => ({
      id: p.id,
      name: p.name,
      location: p.location,
      price: p.price,
      numericPrice: p.numericPrice,
      beds: p.beds,
      baths: p.baths,
      sqft: p.sqft,
      category: p.category,
      image: p.exteriorImage,
      architect: p.architect || p.architecturalStyle,
      description: p.description,
      yearBuilt: p.yearBuilt,
      status: p.status,
    }));

    const listB: UnifiedProject[] = portfolioProjects.map((p) => {
      let num = p.numericValuation || 350000000;
      if (!p.numericValuation && p.valuation.includes('Crore')) {
        const val = parseFloat(p.valuation.replace(/[^0-9.]/g, ''));
        if (!Number.isNaN(val)) num = val * 10000000;
      }
      return {
        id: p.id,
        name: p.title,
        location: p.location,
        price: p.valuation,
        numericPrice: num,
        beds: p.beds,
        baths: p.baths,
        sqft: p.size,
        category: p.category,
        image: p.image,
        architect: p.architect,
        description: p.summary,
        yearBuilt: p.projectDelivered,
        status: p.status,
      };
    });

    return [...listB, ...listA];
  }, [propertyListings, portfolioProjects]);

  const categories = ['All', ...BRAND_CONFIG.locale.mainCities];

  const filteredProjects = useMemo(() => {
    return allProjects
      .filter((p) => {
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.architect.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-desc') return b.numericPrice - a.numericPrice;
        if (sortBy === 'price-asc') return a.numericPrice - b.numericPrice;
        return 0;
      });
  }, [allProjects, selectedCategory, searchQuery, sortBy]);

  const hasActiveFilters = selectedCategory !== 'All' || searchQuery.trim() !== '' || sortBy !== 'featured';

  const handleClearFilters = () => {
    setSelectedCategory('All');
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

  useEffect(() => {
    document.title = `Signature Projects | ${BRAND_CONFIG.identity.brandName}`;
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-6">
      {/* Breadcrumb Navigation: Home / Projects */}
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
            Projects
          </li>
        </ol>
      </nav>

      {/* Header Banner with Ghost Watermark "PROJECTS" */}
      <section className="relative w-full bg-white rounded-[24px] sm:rounded-[32px] overflow-hidden p-4 sm:p-10 md:p-14 shadow-xl border border-slate-100">
        <div className="absolute top-4 right-0 pointer-events-none select-none overflow-hidden max-w-full z-0">
          <span
            className="font-display font-black leading-none uppercase tracking-tighter text-watermark/30 select-none"
            style={{ fontSize: 'clamp(4rem, 12vw, 7.5rem)' }}
          >
            PROJECTS
          </span>
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="text-[11px] font-display uppercase tracking-widest text-accent font-bold block">
            Signature Architectural Portfolio
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl text-brand uppercase tracking-tight leading-none">
            SIGNATURE PROJECTS.
          </h1>
          <p className="font-body text-xs sm:text-base text-brand/80 leading-relaxed font-light">
            Discover residential works created by {BRAND_CONFIG.locale.country}'s leading architects, licensed engineers, and master builders.
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="relative z-10 pt-6 sm:pt-10 flex flex-col gap-4 border-t border-slate-100 mt-6 sm:mt-8">
          {/* Mobile One Horizontally Scrolling Row: Filters Button + City Chips (< sm) */}
          <div className="flex sm:hidden items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="px-3 py-1.5 rounded-full bg-brand text-brand-contrast text-xs font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full font-display text-xs uppercase tracking-wider font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-brand text-brand-contrast shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Desktop/Tablet Controls (>= sm) */}
          <div className="hidden sm:flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Category Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full font-display text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-brand text-brand-contrast shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Box & Sort */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search city, architect..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-accent focus:bg-white transition-all"
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
              <h3 className="font-display font-bold text-base text-brand uppercase tracking-tight">
                Filter Projects
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
                  placeholder="Search city, architect..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-display uppercase tracking-wider text-slate-500 block mb-1">
                City / Region
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-display uppercase"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Cities' : c}
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
                className="flex-1 py-3 rounded-full bg-brand text-brand-contrast font-display text-xs uppercase tracking-wider font-semibold text-center shadow-md cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid / List */}
      <section className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-3 px-2">
          <span className="text-xs font-display uppercase tracking-widest text-slate-500 font-semibold">
            Showing {filteredProjects.length} Available Residences
          </span>
        </div>

        {filteredProjects.length > 0 ? (
          <>
            {/* 1. Mobile Compact Horizontal Row Cards (screens under 640px) */}
            <div className="space-y-3 sm:hidden">
              {filteredProjects.map((project) => {
                const saved = isPropertySaved(project.id);

                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex bg-white rounded-2xl p-2.5 border border-slate-100 shadow-sm gap-3 items-center group active:scale-[0.99] transition-all"
                  >
                    {/* Photo on left (w-[38%], aspect-[4/3], rounded-xl, object-cover) */}
                    <div className="relative w-[38%] shrink-0 aspect-[4/3] rounded-xl overflow-hidden border border-slate-200/80">
                      <SafeImage
                        src={project.image}
                        alt={project.name}
                        width={300}
                        height={225}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => handleHeartClick(e, project.id, project.name)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full glass-panel flex items-center justify-center cursor-pointer shadow-xs"
                        aria-label="Save project"
                      >
                        <Heart className={`w-3.5 h-3.5 ${saved ? 'text-rose-500 fill-current' : 'text-white'}`} />
                      </button>
                    </div>

                    {/* Text on right: price in bold, title max 2 lines, location with Pin, 1-line meta */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-display font-bold text-[0.95rem] text-brand leading-tight truncate">
                            {project.price}
                          </div>
                          {project.status && project.status !== 'Available' && (
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-display uppercase tracking-wider font-bold border ${getStatusBadgeStyle(
                                project.status
                              )}`}
                            >
                              {project.status}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-semibold text-[0.82rem] text-brand line-clamp-2 mt-0.5 leading-snug">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-1 text-[0.72rem] text-accent font-medium mt-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{project.location}</span>
                        </div>
                      </div>
                      <div className="text-[0.72rem] text-slate-500 font-body mt-1 truncate">
                        {project.beds} Beds · {project.baths} Baths · {project.sqft}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* 2. Tablet 2-Column Grid (640px to 1023px) */}
            <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4">
              {filteredProjects.map((project) => {
                const saved = isPropertySaved(project.id);

                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-[4/3] max-h-[12rem] overflow-hidden">
                      <SafeImage
                        src={project.image}
                        alt={project.name}
                        width={600}
                        height={450}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 left-2.5 right-12 flex flex-wrap gap-1.5">
                        <span className="glass-panel-dark px-2.5 py-0.5 rounded-full text-[10px] uppercase font-display tracking-wider text-white">
                          {project.category}
                        </span>
                        {project.status && project.status !== 'Available' && (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-display font-bold border shadow-xs ${getStatusBadgeStyle(
                              project.status
                            )}`}
                          >
                            {project.status}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleHeartClick(e, project.id, project.name)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full glass-panel flex items-center justify-center cursor-pointer"
                        aria-label="Save project"
                      >
                        <Heart className={`w-4 h-4 ${saved ? 'text-rose-500 fill-current' : 'text-white'}`} />
                      </button>
                    </div>

                    <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-1 text-[0.75rem] text-accent font-semibold mb-0.5 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{project.location}</span>
                        </div>
                        <h3 className="font-display font-bold text-sm text-brand uppercase line-clamp-1">
                          {project.name}
                        </h3>
                        <div className="font-display font-bold text-sm text-brand mt-0.5">
                          {project.price}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[0.75rem] text-slate-600">
                        <span>{project.beds} Beds · {project.baths} Baths</span>
                        <span>{project.sqft}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* 3. Desktop 3-Column Grid (1024px and up) - completely unchanged */}
            <div className="hidden lg:grid grid-cols-3 gap-8">
              {filteredProjects.map((project) => {
                const saved = isPropertySaved(project.id);

                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-[28px] overflow-hidden shadow-lg border border-slate-100 flex flex-col justify-between group hover:shadow-2xl transition-all duration-300"
                  >
                    {/* Photo with Heart Save Button & Category */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <SafeImage
                        src={project.image}
                        alt={project.name}
                        width={800}
                        height={600}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                      />

                      <div className="absolute top-3.5 left-3.5 right-14 flex flex-wrap gap-1.5">
                        <span className="glass-panel-dark px-3 py-1 rounded-full text-[10px] uppercase font-display tracking-widest text-white">
                          {project.category}
                        </span>
                        {project.status && project.status !== 'Available' && (
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] uppercase font-display tracking-widest font-bold border shadow-sm ${getStatusBadgeStyle(
                              project.status
                            )}`}
                          >
                            {project.status}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleHeartClick(e, project.id, project.name)}
                        className={`absolute top-3.5 right-3.5 w-10 h-10 rounded-full glass-panel flex items-center justify-center transition-all cursor-pointer shadow-md ${
                          saved
                            ? 'text-rose-500 fill-rose-500 bg-white/90 scale-105'
                            : 'text-white hover:text-rose-400 hover:scale-105'
                        }`}
                        aria-label="Save property to shortlist"
                        title={saved ? 'Remove from shortlist' : 'Save to shortlist'}
                      >
                        <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* Body Content */}
                    <div className="p-7 flex flex-col justify-between flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-accent font-semibold mb-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{project.location}</span>
                        </div>

                        <h3 className="font-display font-extrabold text-xl text-brand uppercase tracking-tight group-hover:text-accent transition-colors">
                          {project.name}
                        </h3>

                        <div className="font-display font-bold text-lg text-brand mt-1">
                          {project.price}
                        </div>

                        <p className="text-xs text-slate-700 font-medium font-body line-clamp-2 mt-2 leading-relaxed">
                          {project.description}
                        </p>
                      </div>

                      {/* Specs Row */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-xs text-slate-800 font-body">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5 text-slate-500" /> {project.beds} Beds
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="w-3.5 h-3.5 text-slate-400" /> {project.baths} Baths
                        </span>
                        <span className="flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5 text-slate-400" /> {project.sqft}
                        </span>
                      </div>

                      {/* Action link to /projects/:id */}
                      <Link
                        to={`/projects/${project.id}`}
                        className="w-full py-3 px-5 rounded-full bg-slate-100 hover:bg-brand text-brand hover:text-brand-contrast font-display text-xs uppercase tracking-widest font-semibold transition-all flex items-center justify-between group/btn cursor-pointer"
                      >
                        <span>View Full Details</span>
                        <span className="w-6 h-6 rounded-full bg-white text-brand flex items-center justify-center group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform">
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
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-md">
            <h3 className="font-display font-bold text-lg text-brand uppercase">
              No Residences Match Your Search
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto font-body mt-1">
              Try adjusting your city filter or search keywords.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-4 px-5 py-2.5 rounded-full bg-brand text-brand-contrast text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
