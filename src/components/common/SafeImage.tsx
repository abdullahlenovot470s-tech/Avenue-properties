import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Building2 } from 'lucide-react';

const LOCAL_STOCK_FALLBACK = '/stock/photo-1600596542815-ffad4c1539a9.jpg';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  containerClassName?: string;
  priority?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = 'Avenue luxury property architectural showcase',
  fallbackSrc = LOCAL_STOCK_FALLBACK,
  className = '',
  containerClassName = '',
  priority = false,
  loading,
  width = 800,
  height = 600,
  ...props
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const retryCountRef = useRef(0);

  // Sync state when src prop changes
  useEffect(() => {
    retryCountRef.current = 0;
    if (!src) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      setIsLoaded(false);
      return;
    }
    setCurrentSrc(src);
    setHasError(false);
    setIsLoaded(false);
  }, [src, fallbackSrc]);

  // Immediately reveal images already decoded in browser memory cache (prevents stuck opacity-0)
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [currentSrc]);

  const handleError = () => {
    // Transient network retry once for external URLs before falling back
    if (
      retryCountRef.current === 0 &&
      currentSrc &&
      currentSrc.startsWith('http')
    ) {
      retryCountRef.current = 1;
      const sep = currentSrc.includes('?') ? '&' : '?';
      setCurrentSrc(`${currentSrc}${sep}retry=1`);
      return;
    }

    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsLoaded(false);
    } else if (currentSrc !== LOCAL_STOCK_FALLBACK) {
      setCurrentSrc(LOCAL_STOCK_FALLBACK);
      setIsLoaded(false);
    } else {
      setHasError(true);
    }
  };

  // Same-origin local stock images load instantaneously, so eager avoids lazy-scroll stalling inside carousels/tabs
  const effectiveLoading =
    loading ??
    (priority || (currentSrc && currentSrc.startsWith('/stock/')) ? 'eager' : 'lazy');

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#1B2A44]/10 ${containerClassName}`}>
      {/* Subtle neutral navy shimmer placeholder only until first decode */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-[#1B2A44]/15 animate-pulse pointer-events-none z-0" />
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
        <div className="w-full h-full min-h-[160px] bg-gradient-to-br from-[#1B2A44] to-[#2F4B73] flex flex-col items-center justify-center p-6 text-white/90 select-none">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2 border border-white/15">
            <Building2 className="w-5 h-5 text-amber-200" />
          </div>
          <span className="text-[11px] uppercase tracking-wider font-display font-medium text-white/90 text-center line-clamp-2 max-w-[200px]">
            {alt || 'Avenue Architectural Residence'}
          </span>
        </div>
      )}
    </div>
  );
};
