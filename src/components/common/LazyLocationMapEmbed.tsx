import React, { Suspense, lazy } from 'react';
import { BRAND_CONFIG } from '../../config/brand.config';

const LocationMapEmbedInner = lazy(() =>
  import('./LocationMapEmbed').then((m) => ({ default: m.LocationMapEmbed }))
);

interface LazyLocationMapEmbedProps {
  query: string;
  title?: string;
  className?: string;
}

export const LazyLocationMapEmbed: React.FC<LazyLocationMapEmbedProps> = ({
  query,
  title,
  className = '',
}) => {
  if (!BRAND_CONFIG.features.enableMaps || !query.trim()) {
    return null;
  }

  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-surface/40 shadow-sm h-[265px] sm:h-[297px] ${className}`}
        />
      }
    >
      <LocationMapEmbedInner query={query} title={title} className={className} />
    </Suspense>
  );
};
