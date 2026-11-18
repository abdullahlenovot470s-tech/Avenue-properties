import { BRAND_CONFIG } from '../config/brand.config';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;

function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.doNotTrack === '1' || (window as { doNotTrack?: string }).doNotTrack === '1';
}

function injectAnalyticsScripts(cfToken: string, gaId: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (cfToken && !document.querySelector('script[data-cf-beacon]')) {
    const cfScript = document.createElement('script');
    cfScript.defer = true;
    cfScript.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    cfScript.setAttribute('data-cf-beacon', JSON.stringify({ token: cfToken }));
    document.head.appendChild(cfScript);
  }

  if (gaId && !isDoNotTrackEnabled() && !document.querySelector('script[data-ga4-loader]')) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { anonymize_ip: true });

    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.defer = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    gaScript.setAttribute('data-ga4-loader', 'true');
    document.head.appendChild(gaScript);
  }
}

export function initAnalytics(): void {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!BRAND_CONFIG.features.enableAnalytics) return;

  const cfToken = String(import.meta.env.VITE_CF_ANALYTICS_TOKEN || '').trim();
  const gaId = String(import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();

  if (!cfToken && !gaId) return;
  initialized = true;

  const loadAfterWindowLoad = () => injectAnalyticsScripts(cfToken, gaId);

  if (document.readyState === 'complete') {
    loadAfterWindowLoad();
  } else {
    window.addEventListener('load', loadAfterWindowLoad, { once: true });
  }
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return;
  if (!BRAND_CONFIG.features.enableAnalytics) return;
  if (isDoNotTrackEnabled()) return;

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params || {});
    }
  } catch {
    // Analytics should never break UX
  }
}
