import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { BRAND_CONFIG } from './src/config/brand.config.ts';

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildBrandJsonLd(): string {
  const siteUrl = BRAND_CONFIG.identity.siteUrl.replace(/\/+$/, '');
  const toAbs = (p: string) =>
    /^https?:\/\//i.test(p) ? p : `${siteUrl}${p.startsWith('/') ? p : `/${p}`}`;

  const data = {
    '@context': 'https://schema.org',
    '@type': ['RealEstateAgent', 'Organization'],
    name: BRAND_CONFIG.identity.brandName,
    description: BRAND_CONFIG.identity.metaDescription,
    url: siteUrl,
    logo: toAbs(BRAND_CONFIG.images.logo),
    image: toAbs(BRAND_CONFIG.images.hero),
    telephone: BRAND_CONFIG.contact.phone.whatsapp,
    email: BRAND_CONFIG.contact.email.general,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BRAND_CONFIG.contact.offices[0]?.address || '',
      addressLocality: BRAND_CONFIG.contact.offices[0]?.city || BRAND_CONFIG.locale.defaultCity,
      addressCountry: BRAND_CONFIG.locale.country,
    },
    areaServed: [...BRAND_CONFIG.locale.mainCities].map((city) => ({
      '@type': 'City',
      name: city,
    })),
  };

  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function buildCriticalFontPreloads(bundle?: Record<string, unknown>): string {
  const targets = [
    {
      pattern: /manrope-latin-400-normal.*\.woff2$/,
      devHref: '/node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff2',
    },
    {
      pattern: /unbounded-latin-700-normal.*\.woff2$/,
      devHref: '/node_modules/@fontsource/unbounded/files/unbounded-latin-700-normal.woff2',
    },
  ];

  const bundleKeys = bundle ? Object.keys(bundle) : [];
  return targets
    .map(({ pattern, devHref }) => {
      const matched = bundleKeys.find((k) => pattern.test(k));
      const href = bundle ? (matched ? `/${matched}` : '') : devHref;
      if (!href) return '';
      return `<link rel="preload" as="font" type="font/woff2" href="${escapeHtmlAttr(href)}" crossorigin />`;
    })
    .filter(Boolean)
    .join('\n    ');
}

function brandHtmlPlugin(): Plugin {
  return {
    name: 'brand-config-html',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const title = `${BRAND_CONFIG.identity.brandName} | Premium Architectural Residences`;
        const replacements: Record<string, string> = {
          __BRAND_TITLE__: escapeHtmlAttr(title),
          __BRAND_DESCRIPTION__: escapeHtmlAttr(BRAND_CONFIG.identity.metaDescription),
          __BRAND_FAVICON__: escapeHtmlAttr(BRAND_CONFIG.images.favicon),
          __BRAND_HERO_IMAGE__: escapeHtmlAttr(BRAND_CONFIG.images.hero),
          __BRAND_FONT_PRELOADS__: buildCriticalFontPreloads(
            ctx?.bundle as Record<string, unknown> | undefined
          ),
          __BRAND_JSONLD__: buildBrandJsonLd(),
        };

        let result = html;
        for (const [token, value] of Object.entries(replacements)) {
          result = result.split(token).join(value);
        }
        return result;
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), brandHtmlPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/react-router/') ||
              id.includes('/node_modules/react-router-dom/') ||
              id.includes('/node_modules/scheduler/')
            ) {
              return 'react-vendor';
            }
            if (id.includes('/node_modules/firebase/') || id.includes('/node_modules/@firebase/')) {
              return 'firebase-vendor';
            }
            if (id.includes('/node_modules/motion/') || id.includes('/node_modules/framer-motion/')) {
              return 'motion-vendor';
            }
            if (id.includes('/node_modules/lucide-react/')) {
              return 'icons-vendor';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
