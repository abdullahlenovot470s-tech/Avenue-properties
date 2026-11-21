import React, { useState, useRef, useEffect, useId } from 'react';
import { Star, ArrowLeft, ArrowRight, Quote } from 'lucide-react';
import { BRAND_CONFIG } from '../../../config/brand.config';
import { useCatalog } from '../../../context/CatalogContext';
import type { ClientReview } from '../../../types';

const STAR_PATH =
  'M12 2.25l2.92 5.92 6.53.95-4.72 4.6 1.11 6.5L12 17.15l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.25z';

// Vertical y cut across STAR_PATH from bottom (20.22) up to top (2.25) matching exact filled area fraction (0.0 -> 1.0)
const STAR_AREA_TO_Y: readonly [number, number][] = [
  [0.0, 20.22],
  [0.1, 17.32],
  [0.2, 15.93],
  [0.3, 14.47],
  [0.4, 13.01],
  [0.5, 11.81],
  [0.6, 10.8],
  [0.7, 9.91],
  [0.8, 9.11],
  [0.9, 7.67],
  [0.95, 6.08],
  [0.98, 4.67],
  [1.0, 2.25],
];

function getAreaProportionalStarClipY(ratio: number): number {
  const clamped = Math.min(1, Math.max(0, ratio));
  if (clamped <= 0) return 24;
  if (clamped >= 1) return 0;
  for (let i = 1; i < STAR_AREA_TO_Y.length; i += 1) {
    const [r0, y0] = STAR_AREA_TO_Y[i - 1];
    const [r1, y1] = STAR_AREA_TO_Y[i];
    if (clamped <= r1) {
      const t = (clamped - r0) / (r1 - r0 || 1);
      return Number((y0 + t * (y1 - y0)).toFixed(2));
    }
  }
  return 0;
}

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
  const rawId = useId();
  const starClipId = `reviews-star-clip-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const ratingMatch = sectionCopy.summary.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  const averageReviewRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (typeof r.rating === 'number' ? r.rating : 5), 0) /
        reviews.length
      : 5;
  const ratingValue = ratingMatch ? Number(ratingMatch[1]) : Number(averageReviewRating.toFixed(1));
  const ratingMax = ratingMatch ? Number(ratingMatch[2]) : 5;
  const ratingRatio = Math.min(1, Math.max(0, ratingMax > 0 ? ratingValue / ratingMax : 1));
  const starClipY = getAreaProportionalStarClipY(ratingRatio);

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
      className="below-fold-section relative w-full py-5 md:py-10 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto"
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
            <div
              className="inline-flex items-center gap-2.5"
              aria-label={`Rated ${ratingValue} out of ${ratingMax}`}
              title={sectionCopy.summary}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-8 h-8 sm:w-9 sm:h-9 shrink-0"
                aria-hidden="true"
              >
                <defs>
                  <clipPath id={starClipId}>
                    <rect x="0" y={starClipY} width="24" height={Math.max(0, 24 - starClipY)} />
                  </clipPath>
                </defs>
                <path
                  d={STAR_PATH}
                  fill={BRAND_CONFIG.theme.starTrackFill}
                  stroke={BRAND_CONFIG.theme.starTrackStroke}
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                />
                <path
                  d={STAR_PATH}
                  fill={BRAND_CONFIG.theme.starFill}
                  stroke={BRAND_CONFIG.theme.starStroke}
                  strokeWidth="0.9"
                  strokeLinejoin="round"
                  clipPath={`url(#${starClipId})`}
                />
              </svg>
              <div className="flex items-baseline gap-1 font-display leading-none">
                <span className="text-lg sm:text-xl font-bold text-brand tabular-nums">
                  {ratingValue}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-text-muted tabular-nums">
                  / {ratingMax}
                </span>
              </div>
            </div>

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
