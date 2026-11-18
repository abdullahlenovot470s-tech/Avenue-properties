import React from 'react';
import { MapPin } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand.config';

interface LocationMapEmbedProps {
  query: string;
  title?: string;
  className?: string;
}

export const LocationMapEmbed: React.FC<LocationMapEmbedProps> = ({
  query,
  title = 'Location Map',
  className = '',
}) => {
  const cleanQuery = query.trim();
  if (!BRAND_CONFIG.features.enableMaps || !cleanQuery) {
    return null;
  }

  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(cleanQuery)}&output=embed`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-surface/40 shadow-sm ${className}`}
    >
      <div className="px-4 py-2.5 border-b border-slate-200/80 flex items-center gap-2 text-[11px] font-display uppercase tracking-wider text-brand font-semibold bg-white/80">
        <MapPin className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
        <span className="truncate">{cleanQuery}</span>
      </div>
      <iframe
        title={title}
        src={embedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-56 sm:h-64 border-0 block"
      />
    </div>
  );
};
