import React, { useState, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand.config';
import { SafeImage } from './common/SafeImage';

interface ServicesSectionProps {
  onOpenConsultation: (serviceTitle?: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onOpenConsultation }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const cards = BRAND_CONFIG.copy.servicesSection.cards.map((card) => ({
    ...card,
    image: BRAND_CONFIG.images[card.imageKey],
  }));

  const handleCarouselScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, offsetWidth } = carouselRef.current;
      const cardWidth = offsetWidth * 0.84;
      const index = Math.round(scrollLeft / cardWidth);
      setActiveSlide(Math.min(Math.max(index, 0), cards.length - 1));
    }
  };

  return (
    <section
      id="services-section"
      className="relative w-full py-6 sm:py-10 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto"
    >
      <div className="relative w-full bg-accent rounded-[1.75rem] sm:rounded-[2.25rem] overflow-hidden p-4 sm:p-10 md:p-12 text-accent-contrast shadow-2xl">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-brand/60 rounded-full blur-3xl pointer-events-none" />

        {/* Header Row */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-12 pb-6 sm:pb-10 border-b border-current/15 items-end">
          <div className="lg:col-span-6">
            <span className="text-[0.7rem] sm:text-[0.75rem] font-display uppercase tracking-widest text-accent-contrast/70 block mb-1.5 sm:mb-2 font-medium">
              {BRAND_CONFIG.copy.servicesSection.heading}
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl uppercase tracking-tight text-accent-contrast leading-tight">
              {BRAND_CONFIG.copy.servicesSection.eyebrow}
            </h2>
          </div>

          <div className="lg:col-span-6">
            <p className="font-body text-xs sm:text-base leading-relaxed text-accent-contrast/85 font-light max-w-xl">
              {BRAND_CONFIG.copy.servicesSection.subtitle}
            </p>
          </div>
        </div>

        {/* Mobile Swipe Carousel */}
        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          className="relative z-10 pt-4 flex lg:hidden overflow-x-auto snap-x snap-mandatory no-scrollbar gap-3 pb-2 -mx-1 px-1"
        >
          {cards.map((card) => (
            <div
              key={card.number}
              onClick={() => onOpenConsultation(card.title)}
              className="w-[84%] shrink-0 snap-center relative rounded-2xl overflow-hidden aspect-[16/10] max-h-[14rem] p-3 text-white border border-white/15 flex flex-col justify-between shadow-md cursor-pointer active:scale-[0.99] transition-transform"
            >
              <div className="absolute inset-0 z-0 pointer-events-none">
                <SafeImage
                  src={card.image}
                  alt={card.title}
                  priority={true}
                  className="w-full h-full object-cover object-center select-none"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-brand/95 via-brand/55 to-transparent pointer-events-none z-0" />

              <div className="relative z-10 flex items-start justify-between">
                <span className="font-display font-black text-2xl text-white/50 leading-none select-none">
                  {card.number}
                </span>
                <div className="w-8 h-8 rounded-full glass-panel flex items-center justify-center text-white shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="relative z-10 flex flex-col space-y-1">
                <span className="text-[0.65rem] font-display uppercase tracking-widest text-white/80 font-semibold">
                  {card.locationTag}
                </span>
                <h3 className="font-display font-bold text-[0.95rem] text-white leading-tight">
                  {card.title}
                </h3>
                <p className="font-body text-[0.75rem] text-white/80 line-clamp-1 leading-snug">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Pagination Dots */}
        <div className="flex lg:hidden items-center justify-center gap-1.5 pt-3">
          {cards.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (carouselRef.current) {
                  const cardWidth = carouselRef.current.offsetWidth * 0.84;
                  carouselRef.current.scrollTo({ left: idx * cardWidth, behavior: 'smooth' });
                }
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeSlide === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/30'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Desktop Three Cards */}
        <div className="relative z-10 pt-8 hidden lg:flex flex-row gap-4 items-stretch">
          {cards.map((card, idx) => {
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={card.number}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onOpenConsultation(card.title)}
                className={`group relative rounded-3xl overflow-hidden shadow-xl border border-white/20 cursor-pointer min-h-[32rem] flex flex-col justify-between p-6 sm:p-7 transition-all duration-300 ease-out ${
                  hoveredIdx !== null
                    ? isHovered
                      ? 'lg:flex-[1.4] ring-2 ring-white/40'
                      : 'lg:flex-[0.8] opacity-90'
                    : 'flex-1'
                }`}
              >
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <SafeImage
                    src={card.image}
                    alt={card.title}
                    priority={true}
                    className="w-full h-full object-cover object-center select-none transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-brand/95 via-brand/60 to-transparent pointer-events-none z-0" />

                <div className="relative z-10 flex items-start justify-between">
                  <span className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-white/35 group-hover:text-white/60 transition-colors leading-none select-none">
                    {card.number}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenConsultation(card.title);
                    }}
                    className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white group-hover:bg-white group-hover:text-brand transition-all duration-300 shadow-md cursor-pointer shrink-0"
                    aria-label={`Inquire about ${card.title}`}
                  >
                    <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                </div>

                <div className="relative z-10 flex flex-col space-y-3 pt-8">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-[0.72rem] font-display uppercase tracking-widest text-white/90 glass-panel border border-white/20 font-semibold">
                      {card.locationTag}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xl sm:text-2xl text-white group-hover:text-amber-200 transition-colors leading-snug">
                    {card.title}
                  </h3>

                  <p className="font-body text-xs sm:text-sm text-white/85 leading-relaxed font-light line-clamp-3">
                    {card.description}
                  </p>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-brand font-display font-bold text-[0.72rem] uppercase tracking-wider shadow-md hover:bg-surface transition-all opacity-95 group-hover:opacity-100 group-hover:translate-y-0">
                      <span>Learn More</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
