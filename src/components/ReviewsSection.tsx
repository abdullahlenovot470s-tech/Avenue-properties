import React, { useState, useRef, useEffect } from 'react';
import { Star, ArrowLeft, ArrowRight, Quote } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand.config';
import { useCatalog } from '../context/CatalogContext';
import type { ClientReview } from '../types';

const GeneralUserDp: React.FC = () => (
  <div
    aria-hidden="true"
    className="w-11 h-11 rounded-full bg-surface border border-brand/15 flex items-center justify-center shrink-0 text-brand/65 overflow-hidden"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-6 h-6"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="8.5" r="4" fill="currentColor" opacity="0.85" />
      <path
        d="M4.5 20.5C4.5 16.634 7.85786 13.5 12 13.5C16.1421 13.5 19.5 16.634 19.5 20.5"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  </div>
);

export const ReviewsSection: React.FC = () => {
  const { clientReviews } = useCatalog();
  const reviews: readonly ClientReview[] = clientReviews;
  const sectionCopy = BRAND_CONFIG.copy.reviewsSection;
  const pageSize = 3;
  const totalPages = Math.max(1, Math.ceil(reviews.length / pageSize));
  const [page, setPage] = useState(0);
  const [activeMobileSlide, setActiveMobileSlide] = useState(0);
  const mobileTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(0);
    }
    if (activeMobileSlide >= reviews.length) {
      setActiveMobileSlide(0);
    }
  }, [page, totalPages, activeMobileSlide, reviews.length]);

  if (!BRAND_CONFIG.features.enableReviews || reviews.length === 0) return null;

  const currentPage = page < totalPages ? page : 0;
  const visibleDesktopReviews = reviews.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize
  );

  const handlePrevPage = () => {
    setPage((prev) => (prev === 0 ? totalPages - 1 : prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => (prev >= totalPages - 1 ? 0 : prev + 1));
  };

  const handleMobileScroll = () => {
    if (!mobileTrackRef.current) return;
    const { scrollLeft, offsetWidth } = mobileTrackRef.current;
    const cardWidth = offsetWidth * 0.86;
    if (cardWidth <= 0) return;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveMobileSlide(Math.min(Math.max(index, 0), reviews.length - 1));
  };

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="relative w-full py-5 md:py-10 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto"
    >
      <div className="relative w-full bg-white rounded-2xl md:rounded-[32px] overflow-hidden p-5 md:p-12 shadow-xl border border-slate-100">
        {/* Background Watermark */}
        <div className="absolute top-5 -right-6 md:-right-10 z-0 pointer-events-none select-none overflow-hidden max-w-full">
          <span
            className="font-display font-black leading-none uppercase tracking-tighter text-watermark/35 select-none"
            style={{ fontSize: 'clamp(4rem, 13vw, 7.5rem)' }}
          >
            {sectionCopy.watermark}
          </span>
        </div>

        {/* Editorial Section Header */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-10 pb-5 md:pb-8 border-b border-slate-200/80">
          <div className="max-w-2xl">
            <span className="text-[0.7rem] sm:text-xs font-display uppercase tracking-widest text-accent font-semibold block mb-1.5 sm:mb-2">
              {sectionCopy.eyebrow}
            </span>
            <h2
              id="reviews-heading"
              className="font-display font-bold md:font-extrabold text-[clamp(1.25rem,4.5vw,1.625rem)] md:text-3xl lg:text-4xl uppercase tracking-tight text-brand leading-tight"
              style={{ textWrap: 'balance' }}
            >
              {sectionCopy.heading}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-4 shrink-0">
            <p className="font-body text-xs sm:text-sm text-text-muted max-w-xs leading-relaxed">
              {sectionCopy.summary}
            </p>

            {totalPages > 1 && (
              <div className="hidden lg:flex items-center gap-3 shrink-0">
                <span className="text-xs font-display font-semibold text-text-muted tabular-nums">
                  {String(currentPage + 1).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    aria-label="Previous client reviews"
                    className="w-10 h-10 rounded-full border border-brand flex items-center justify-center text-brand hover:bg-brand/10 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPage}
                    aria-label="Next client reviews"
                    className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-brand-contrast hover:bg-accent hover:text-accent-contrast transition-colors shadow-sm cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop 3-Column Reviews Grid */}
        <div className="relative z-10 hidden lg:grid grid-cols-3 gap-6 pt-8 items-stretch">
          {visibleDesktopReviews.map((review) => {
            const ratingCount = typeof review.rating === 'number' ? review.rating : 5;
            return (
              <article
                key={review.id}
                className="rounded-2xl bg-surface/35 border border-slate-200/90 p-7 flex flex-col justify-between transition-colors duration-200 hover:bg-surface/55"
              >
                <div>
                  {/* Rating + Quote Mark */}
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className="flex items-center gap-1"
                      aria-label={`Rated ${ratingCount} out of 5 stars`}
                    >
                      {Array.from({ length: ratingCount }).map((_, idx) => (
                        <Star
                          key={idx}
                          className="w-4 h-4 fill-amber-400 text-amber-400"
                          aria-hidden="true"
                        />
                      ))}
                      <span className="ml-1.5 text-xs font-display font-semibold text-brand tabular-nums">
                        {ratingCount.toFixed(1)}
                      </span>
                    </div>
                    <Quote className="w-5 h-5 text-brand/20" aria-hidden="true" />
                  </div>

                  {/* Review Quote */}
                  <blockquote className="font-body text-sm sm:text-[15px] leading-relaxed text-text-primary/90 font-normal">
                    “{review.quote}”
                  </blockquote>
                </div>

                {/* Attribution Footer with General User DP */}
                <div className="pt-6 mt-6 border-t border-slate-200/80 flex items-center gap-3.5">
                  <GeneralUserDp />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm text-brand truncate">
                      {review.author}
                    </div>
                    <div className="font-body text-xs text-text-muted mt-0.5 truncate">
                      <span>{review.role}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{review.location}</span>
                    </div>
                    <div className="font-body text-[11px] text-text-muted/85 mt-0.5 truncate">
                      <span>{review.propertyContext}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{review.date}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Mobile / Tablet Swipeable Carousel */}
        <div
          ref={mobileTrackRef}
          onScroll={handleMobileScroll}
          className="relative z-10 pt-5 flex lg:hidden overflow-x-auto snap-x snap-mandatory no-scrollbar gap-3.5 pb-2 -mx-1 px-1"
        >
          {reviews.map((review) => {
            const ratingCount = typeof review.rating === 'number' ? review.rating : 5;
            return (
              <article
                key={review.id}
                className="w-[86%] sm:w-[62%] shrink-0 snap-center rounded-2xl bg-surface/35 border border-slate-200/90 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="flex items-center gap-1"
                      aria-label={`Rated ${ratingCount} out of 5 stars`}
                    >
                      {Array.from({ length: ratingCount }).map((_, idx) => (
                        <Star
                          key={idx}
                          className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                          aria-hidden="true"
                        />
                      ))}
                      <span className="ml-1 text-xs font-display font-semibold text-brand tabular-nums">
                        {ratingCount.toFixed(1)}
                      </span>
                    </div>
                    <Quote className="w-4 h-4 text-brand/20" aria-hidden="true" />
                  </div>

                  <blockquote className="font-body text-xs sm:text-sm leading-relaxed text-text-primary/90">
                    “{review.quote}”
                  </blockquote>
                </div>

                <div className="pt-4 mt-5 border-t border-slate-200/80 flex items-center gap-3">
                  <GeneralUserDp />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-[0.82rem] text-brand truncate">
                      {review.author}
                    </div>
                    <div className="font-body text-[0.72rem] text-text-muted truncate">
                      <span>{review.role}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{review.location}</span>
                    </div>
                    <div className="font-body text-[0.68rem] text-text-muted/85 truncate">
                      <span>{review.propertyContext}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Mobile Carousel Pagination Dots */}
        <div className="flex lg:hidden items-center justify-center gap-1.5 pt-3">
          {reviews.map((review, idx) => (
            <button
              key={review.id}
              type="button"
              onClick={() => {
                if (!mobileTrackRef.current) return;
                const cardWidth = mobileTrackRef.current.offsetWidth * 0.86;
                mobileTrackRef.current.scrollTo({ left: idx * cardWidth, behavior: 'smooth' });
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeMobileSlide === idx ? 'w-5 bg-brand' : 'w-1.5 bg-brand/25'
              }`}
              aria-label={`View review ${idx + 1} from ${review.author}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
