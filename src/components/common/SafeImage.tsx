import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Building2 } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand.config';
import { resolveBrandImagePath } from '../../data/legacyImageMap';
import { optimizeImageUrl } from '../../lib/imageOptimization';

const LOCAL_FALLBACK_IMAGE = BRAND_CONFIG.images.fallbackVilla;
const DEFAULT_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  containerClassName?: string;
  priority?: boolean;
  sizes?: string;
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
  sizes = DEFAULT_SIZES,
  srcSet,
  ...props
}) => {
  const normalizedFallback = resolveBrandImagePath(fallbackSrc, LOCAL_FALLBACK_IMAGE);
  const resolvedSrc = resolveBrandImagePath(src, normalizedFallback);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const prevSrcRef = useRef<string>(resolvedSrc);
  const retryCountRef = useRef(0);

  const [currentSrc, setCurrentSrc] = useState(resolvedSrc);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const checkImageComplete = useCallback((el: HTMLImageElement | null = imgRef.current) => {
    if (el && el.complete && el.naturalWidth > 0) {
      setIsLoaded((prev) => (prev ? prev : true));
    }
  }, []);

  const setImgNode = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node;
      checkImageComplete(node);
    },
    [checkImageComplete]
  );

  // Only reset when the resolved src actually changes
  useEffect(() => {
    if (prevSrcRef.current === resolvedSrc) return;
    prevSrcRef.current = resolvedSrc;
    retryCountRef.current = 0;
    setCurrentSrc(resolvedSrc);
    setHasError(false);
    setIsLoaded(false);
    checkImageComplete();
  }, [resolvedSrc, checkImageComplete]);

  // After every render where currentSrc is set, detect already-cached / decoded images
  useEffect(() => {
    if (currentSrc && !hasError) {
      checkImageComplete();
    }
  });

  // Safety net: clear skeleton after 4s if browser marks image complete; otherwise rely on onError
  useEffect(() => {
    if (isLoaded || hasError || !currentSrc) return;
    const timer = window.setTimeout(() => {
      const el = imgRef.current;
      if (el && el.complete) {
        setIsLoaded(true);
      }
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [currentSrc, isLoaded, hasError]);

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
      checkImageComplete();
    } else if (currentSrc !== LOCAL_FALLBACK_IMAGE) {
      setCurrentSrc(LOCAL_FALLBACK_IMAGE);
      setIsLoaded(false);
      checkImageComplete();
    } else {
      setHasError(true);
    }
  };

  const effectiveLoading = loading ?? (priority ? 'eager' : 'lazy');
  const optimized400 = optimizeImageUrl(currentSrc, 400);
  const optimized800 = optimizeImageUrl(currentSrc, 800);
  const optimized1200 = optimizeImageUrl(currentSrc, 1200);
  const hasResponsiveVariants =
    optimized400 !== currentSrc || optimized800 !== currentSrc || optimized1200 !== currentSrc;
  const resolvedImgSrc = hasResponsiveVariants ? optimized800 : currentSrc;
  const resolvedSrcSet =
    srcSet ||
    (hasResponsiveVariants
      ? `${optimized400} 400w, ${optimized800} 800w, ${optimized1200} 1200w`
      : undefined);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-brand/10 ${containerClassName}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-brand/15 animate-pulse pointer-events-none z-0" />
      )}

      {!hasError && currentSrc ? (
        <img
          ref={setImgNode}
          src={resolvedImgSrc}
          srcSet={resolvedSrcSet}
          sizes={resolvedSrcSet ? sizes : undefined}
          alt={alt}
          width={width}
          height={height}
          referrerPolicy="no-referrer"
          loading={effectiveLoading}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : undefined}
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          className={`relative z-10 w-full h-full object-cover object-center ${className}`}
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
