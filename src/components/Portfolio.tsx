import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useCatalog } from '../context/CatalogContext';
import { PortfolioProject } from '../types';
import { BRAND_CONFIG } from '../config/brand.config';
import { SafeImage } from './common/SafeImage';
import { PillButton } from './common/PillButton';
import { ArrowLeft, ArrowRight, MapPin, Maximize2, Calendar, CheckCircle2, ArrowUpRight } from 'lucide-react';

interface PortfolioProps {
  onSelectProject: (project: PortfolioProject) => void;
  onOpenConsultation: () => void;
}

export const Portfolio: React.FC<PortfolioProps> = ({ onSelectProject }) => {
  const navigate = useNavigate();
  const { portfolioProjects } = useCatalog();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (portfolioProjects.length > 0 && currentIndex >= portfolioProjects.length) {
      setCurrentIndex(0);
    }
  }, [portfolioProjects.length, currentIndex]);

  if (portfolioProjects.length === 0) {
    return null;
  }

  const safeIndex = currentIndex < portfolioProjects.length ? currentIndex : 0;
  const activeProject = portfolioProjects[safeIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? portfolioProjects.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= portfolioProjects.length - 1 ? 0 : prev + 1));
  };

  const thumbnailProjects = portfolioProjects
    .map((p, idx) => ({ ...p, originalIdx: idx }))
    .filter((_, idx) => idx !== safeIndex);

  return (
    <section
      id="portfolio"
      className="relative w-full py-6 sm:py-10 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto"
    >
      <div className="relative w-full bg-white rounded-[24px] sm:rounded-[32px] overflow-hidden p-4 sm:p-8 md:p-12 shadow-xl border border-slate-100">
        {/* Giant Watermark */}
        <div className="absolute top-6 -left-8 md:-left-12 z-0 pointer-events-none select-none overflow-hidden max-w-full">
          <span
            className="font-display font-black leading-none uppercase tracking-tighter text-watermark/35 select-none"
            style={{ fontSize: 'clamp(4rem, 14vw, 8rem)' }}
          >
            {BRAND_CONFIG.copy.portfolioSection.watermark}
          </span>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* Left Column: Featured Card */}
          <div className="lg:col-span-6">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeProject.id}
                initial={{ opacity: 0.4, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={() => onSelectProject(activeProject)}
                className="relative w-full aspect-[4/3] max-h-[14rem] sm:max-h-none rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl group border border-slate-200 cursor-pointer"
              >
                <SafeImage
                  src={activeProject.image}
                  alt={activeProject.title}
                  priority={true}
                  width={800}
                  height={600}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/30 to-transparent" />

                {/* Mobile Glass Overlay (< lg) */}
                <div className="flex lg:hidden absolute inset-x-3 bottom-3 glass-panel rounded-xl p-3 text-white shadow-lg border border-white/25 items-end justify-between">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-display font-bold text-[0.95rem] uppercase tracking-tight text-white leading-tight truncate">
                      {activeProject.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[0.72rem] text-white/80 font-body mt-0.5">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-white/70 shrink-0" />
                        <span className="truncate">{activeProject.location}</span>
                      </span>
                      <span>·</span>
                      <span className="shrink-0">{activeProject.size}</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Desktop Glass Overlay Card */}
                <div className="hidden lg:block absolute inset-x-6 bottom-6 glass-panel rounded-3xl p-6 text-white shadow-xl border border-white/25">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-display uppercase tracking-widest text-white/70">
                      Featured Residence · {activeProject.architect}
                    </span>
                    <span className="text-xs font-display font-semibold text-emerald-300">
                      {activeProject.valuation}
                    </span>
                  </div>

                  <h3 className="font-display font-extrabold text-2xl lg:text-3xl uppercase tracking-tight text-white mb-3">
                    {activeProject.title}
                  </h3>

                  <div className="grid grid-cols-3 gap-2 py-3 my-2 border-y border-white/15 text-xs text-white/80">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-white/60 shrink-0" />
                      <span className="truncate">{activeProject.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-white/60 shrink-0" />
                      <span className="truncate">{activeProject.size}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-white/60 shrink-0" />
                      <span className="truncate">Delivered {activeProject.projectDelivered}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-1">
                    <PillButton
                      variant="white"
                      size="sm"
                      onClick={() => {
                        onSelectProject(activeProject);
                      }}
                    >
                      View Details
                    </PillButton>

                    <div className="flex items-center gap-1.5 text-xs text-white/70 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Possession Ready</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-6 flex flex-col space-y-6 sm:space-y-8">
            <div className="flex flex-col space-y-3 sm:space-y-4">
              <div className="flex flex-row items-center justify-between gap-4">
                <h2 className="font-display font-extrabold text-xl sm:text-3xl lg:text-4xl text-brand uppercase tracking-tight">
                  {BRAND_CONFIG.copy.portfolioSection.heading}
                </h2>
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <button
                  onClick={() => navigate('/projects')}
                  className="text-xs font-display uppercase tracking-wider text-brand hover:text-accent font-bold flex items-center gap-1"
                >
                  <span>VIEW ALL PROPERTIES</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    aria-label="Previous portfolio item"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-brand flex items-center justify-center text-brand hover:bg-brand/10 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNext}
                    aria-label="Next portfolio item"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand flex items-center justify-center text-brand-contrast hover:bg-accent hover:text-accent-contrast transition-colors shadow-sm cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-6 pt-1">
              {thumbnailProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setCurrentIndex(project.originalIdx)}
                  className="group relative aspect-[4/3] max-h-[10rem] sm:max-h-none rounded-xl sm:rounded-3xl overflow-hidden shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg transition-all duration-300"
                >
                  <SafeImage
                    src={project.image}
                    alt={project.title}
                    priority={true}
                    width={800}
                    height={600}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand/85 via-black/20 to-transparent group-hover:from-brand/95 transition-colors" />

                  <div className="absolute inset-x-2.5 sm:inset-x-4 bottom-2.5 sm:bottom-4 text-white">
                    <span className="text-[0.65rem] sm:text-[10px] font-display uppercase tracking-widest text-white/70 block truncate">
                      {project.location}
                    </span>
                    <h4 className="font-display font-bold text-[0.82rem] sm:text-base uppercase tracking-tight text-white group-hover:text-amber-200 transition-colors line-clamp-1">
                      {project.title}
                    </h4>
                    <span className="text-[0.68rem] sm:text-[11px] text-white/80 font-body truncate block">
                      {project.size} · {project.projectDelivered}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 sm:p-5 rounded-2xl bg-surface/40 border border-surface text-[0.72rem] sm:text-[13px] text-brand/90 leading-relaxed font-body">
              <span className="font-semibold text-brand">
                {BRAND_CONFIG.copy.portfolioSection.guaranteeTitle}
              </span>{' '}
              {BRAND_CONFIG.copy.portfolioSection.guaranteeBody}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
