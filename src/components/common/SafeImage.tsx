import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Building2 } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand.config';
import { resolveBrandImagePath } from '../../data/legacyImageMap';

const LOCAL_FALLBACK_IMAGE = BRAND_CONFIG.images.fallbackVilla;

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  containerClassName?: string;
  priority?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = `${BRAND_CONFIG.identity.brandShortName} property architectural showcase`,
  fallbackSrc = LOCAL_FALLBACK_IMAGE,
  className = '',
  containerClassName = '',
  priority = false,
  loading,
  width = 800,
  height = 600,
  ...props
}) => {
  const normalizedFallback = resolveBrandImagePath(fallbackSrc, LOCAL_FALLBACK_IMAGE);
  const resolvedInitial = resolveBrandImagePath(src, normalizedFallback);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [currentSrc, setCurrentSrc] = useState(resolvedInitial);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    retryCountRef.current = 0;
    const nextSrc = resolveBrandImagePath(src, normalizedFallback);
    setCurrentSrc(nextSrc);
    setHasError(false);
    setIsLoaded(false);
  }, [src, normalizedFallback]);

  useLayoutEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [currentSrc]);

  const handleError = () => {
    if (retryCountRef.current === 0 && currentSrc && currentSrc.startsWith('http')) {
      retryCountRef.current = 1;
      const sep = currentSrc.includes('?') ? '&' : '?';
      setCurrentSrc(`${currentSrc}${sep}retry=1`);
      return;
    }

    if (normalizedFallback && currentSrc !== normalizedFallback) {
      setCurrentSrc(normalizedFallback);
      setIsLoaded(false);
    } else if (currentSrc !== LOCAL_FALLBACK_IMAGE) {
      setCurrentSrc(LOCAL_FALLBACK_IMAGE);
      setIsLoaded(false);
    } else {
      setHasError(true);
    }
  };

  const isLocalAsset =
    currentSrc && (currentSrc.startsWith('/brand/') || currentSrc.startsWith('/stock/'));
  const effectiveLoading = loading ?? (priority || isLocalAsset ? 'eager' : 'lazy');

  return (
    <div className={`relative w-full h-full overflow-hidden bg-brand/10 ${containerClassName}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-brand/15 animate-pulse pointer-events-none z-0" />
      )}

      {!hasError && currentSrc ? (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          referrerPolicy="no-referrer"
          loading={effectiveLoading}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : undefined}
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          className={`w-full h-full object-cover object-center transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          {...props}
        />
      ) : (
        <div className="w-full h-full min-h-[160px] bg-gradient-to-br from-brand to-accent flex flex-col items-center justify-center p-6 text-white/90 select-none">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2 border border-white/15">
            <Building2 className="w-5 h-5 text-amber-200" />
          </div>
          <span className="text-[11px] uppercase tracking-wider font-display font-medium text-white/90 text-center line-clamp-2 max-w-[200px]">
            {alt || `${BRAND_CONFIG.identity.brandShortName} Architectural Residence`}
          </span>
        </div>
      )}
    </div>
  );
};
