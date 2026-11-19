import { useEffect } from 'react';
import { BRAND_CONFIG } from '../config/brand.config';

export interface PageMetaOptions {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

export type PageSeoOptions = PageMetaOptions;

function getBaseOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return BRAND_CONFIG.identity.siteUrl.replace(/\/+$/, '');
}

export function resolveAbsoluteUrl(pathOrUrl: string): string {
  const origin = getBaseOrigin();
  const trimmed = String(pathOrUrl || '').trim();
  if (!trimmed) return origin;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return `${origin}${trimmed}`;
  return `${origin}/${trimmed}`;
}

export function resolveShareImageUrl(candidate?: string): string {
  const raw = String(candidate || '').trim();
  if (!raw || raw.startsWith('data:image')) {
    return resolveAbsoluteUrl(BRAND_CONFIG.images.hero);
  }
  return resolveAbsoluteUrl(raw);
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLd(data?: Record<string, unknown> | Record<string, unknown>[]): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('page-jsonld');
  if (!data) {
    if (existing) existing.remove();
    return;
  }
  const script = existing || document.createElement('script');
  script.id = 'page-jsonld';
  script.setAttribute('type', 'application/ld+json');
  script.textContent = JSON.stringify(data);
  if (!existing) {
    document.head.appendChild(script);
  }
}

export function buildRealEstateAgentJsonLd(): Record<string, unknown> {
  const origin = getBaseOrigin();
  return {
    '@context': 'https://schema.org',
    '@type': ['RealEstateAgent', 'Organization'],
    name: BRAND_CONFIG.identity.brandName,
    description: BRAND_CONFIG.identity.metaDescription,
    url: origin,
    logo: resolveAbsoluteUrl(BRAND_CONFIG.images.logo),
    image: resolveAbsoluteUrl(BRAND_CONFIG.images.hero),
    telephone: BRAND_CONFIG.contact.phone.whatsapp,
    email: BRAND_CONFIG.contact.email.general,
    areaServed: [...BRAND_CONFIG.locale.mainCities].map((city) => ({
      '@type': 'City',
      name: city,
    })),
    address: {
      '@type': 'PostalAddress',
      streetAddress: BRAND_CONFIG.contact.offices[0]?.address || '',
      addressLocality: BRAND_CONFIG.contact.offices[0]?.city || BRAND_CONFIG.locale.defaultCity,
      addressCountry: BRAND_CONFIG.locale.country,
    },
  };
}

export function buildPropertyListingJsonLd(params: {
  name: string;
  description: string;
  path: string;
  images: string[];
  priceNumeric?: number;
  priceCurrency?: string;
  availability?: 'InStock' | 'SoldOut';
  city: string;
  address: string;
  beds?: number;
  baths?: number;
  floorSizeText?: string;
  isRental?: boolean;
}): Record<string, unknown> {
  const url = resolveAbsoluteUrl(params.path);
  const validImages = params.images
    .filter((img) => Boolean(img) && !img.startsWith('data:image'))
    .slice(0, 6)
    .map(resolveAbsoluteUrl);

  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    url,
    priceCurrency: params.priceCurrency || BRAND_CONFIG.locale.currencyCode,
    availability:
      params.availability === 'SoldOut'
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
    seller: {
      '@type': 'RealEstateAgent',
      name: BRAND_CONFIG.identity.brandName,
    },
  };

  if (typeof params.priceNumeric === 'number' && params.priceNumeric > 0) {
    offer.price = params.priceNumeric;
    if (params.isRental) {
      offer.priceSpecification = {
        '@type': 'UnitPriceSpecification',
        price: params.priceNumeric,
        priceCurrency: params.priceCurrency || BRAND_CONFIG.locale.currencyCode,
        unitCode: 'MON',
      };
    }
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: params.name,
    description: params.description,
    url,
    image: validImages.length > 0 ? validImages : [resolveShareImageUrl()],
    ...(params.beds ? { numberOfBedrooms: params.beds } : {}),
    ...(params.baths ? { numberOfBathroomsTotal: params.baths } : {}),
    ...(params.floorSizeText
      ? { floorSize: { '@type': 'QuantitativeValue', name: params.floorSizeText } }
      : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: params.address,
      addressLocality: params.city,
      addressCountry: BRAND_CONFIG.locale.country,
    },
    offers: offer,
  };
}

export function usePageMeta(options: PageMetaOptions): void {
  const {
    title,
    description,
    path,
    image,
    type = 'website',
    noindex = false,
    structuredData,
  } = options;
  const serializedJsonLd = structuredData ? JSON.stringify(structuredData) : '';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const cleanTitle = title.trim();
    const cleanDesc = description.trim().slice(0, 320);
    const canonicalUrl = resolveAbsoluteUrl(
      path || (typeof window !== 'undefined' ? window.location.pathname || '/' : '/')
    );
    const imageUrl = resolveShareImageUrl(image);

    document.title = cleanTitle;
    upsertMeta('name', 'description', cleanDesc);
    upsertMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');
    upsertMeta('property', 'og:site_name', BRAND_CONFIG.identity.brandName);
    upsertMeta('property', 'og:title', cleanTitle);
    upsertMeta('property', 'og:description', cleanDesc);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', cleanTitle);
    upsertMeta('name', 'twitter:description', cleanDesc);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertCanonical(canonicalUrl);
    upsertJsonLd(structuredData);
  }, [title, description, path, image, type, noindex, serializedJsonLd]);
}

export const usePageSeo = usePageMeta;
