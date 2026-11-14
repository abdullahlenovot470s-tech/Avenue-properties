import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { BRAND_CONFIG } from './src/config/brand.config';

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function brandHtmlPlugin(): Plugin {
  return {
    name: 'brand-config-html',
    transformIndexHtml(html) {
      const title = `${BRAND_CONFIG.identity.brandName} | Premium Architectural Residences`;
      const replacements: Record<string, string> = {
        __BRAND_TITLE__: escapeHtmlAttr(title),
        __BRAND_DESCRIPTION__: escapeHtmlAttr(BRAND_CONFIG.identity.metaDescription),
        __BRAND_FAVICON__: escapeHtmlAttr(BRAND_CONFIG.images.favicon),
        __BRAND_HERO_IMAGE__: escapeHtmlAttr(BRAND_CONFIG.images.hero),
        __BRAND_GOOGLE_FONTS_URL__: escapeHtmlAttr(BRAND_CONFIG.fonts.googleFontsUrl),
      };

      let result = html;
      for (const [token, value] of Object.entries(replacements)) {
        result = result.split(token).join(value);
      }
      return result;
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), brandHtmlPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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
