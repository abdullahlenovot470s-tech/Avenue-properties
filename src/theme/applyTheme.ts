import { BRAND_CONFIG } from '../config/brand.config';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function normalizeHex(hex: string): string {
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    return (
      '#' +
      clean
        .split('')
        .map((c) => c + c)
        .join('')
    );
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean}`;
  }
  return '#1B2A44';
}

export function hexToRgb(hex: string): Rgb {
  const full = normalizeHex(hex).slice(1);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

/**
 * WCAG 2.1 relative luminance (0 = pure black, 1 = pure white)
 */
function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks high-contrast foreground ink (#FFFFFF or #0F172A) for any solid hex background
 * so light accent colors still keep buttons and badges clearly legible.
 */
export function getContrastTextHex(bgHex: string): string {
  const bgLum = relativeLuminance(hexToRgb(bgHex));
  const whiteContrast = contrastRatio(bgLum, 1);
  const darkInkLum = relativeLuminance(hexToRgb('#0F172A'));
  const darkContrast = contrastRatio(bgLum, darkInkLum);
  return whiteContrast >= darkContrast ? '#FFFFFF' : '#0F172A';
}

/**
 * Applies all theme colors, computed contrast tokens, glass rgba effects,
 * Google Fonts, favicon, and metadata from BRAND_CONFIG to the DOM at startup.
 */
export function applyTheme(config = BRAND_CONFIG): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const { theme, fonts, identity } = config;

  const vars: Record<string, string> = {
    '--color-brand': normalizeHex(theme.brand),
    '--color-brand-nav': normalizeHex(theme.brandNav),
    '--color-brand-nav-scrolled': normalizeHex(theme.brandNavScrolled),
    '--color-brand-dark': normalizeHex(theme.brandDark),
    '--color-brand-deep': normalizeHex(theme.brandDeep),
    '--color-accent': normalizeHex(theme.accent),
    '--color-surface': normalizeHex(theme.surface),
    '--color-watermark': normalizeHex(theme.watermark),
    '--color-text-primary': normalizeHex(theme.textPrimary),
    '--color-text-muted': normalizeHex(theme.textMuted),
    '--color-success': normalizeHex(theme.success),
    '--color-error': normalizeHex(theme.error),
    '--color-brand-contrast': getContrastTextHex(theme.brand),
    '--color-accent-contrast': getContrastTextHex(theme.accent),

    // Derive rgba glass effects strictly from hex values in brand.config.ts
    '--glass-panel-bg': hexToRgba(theme.glassPanel, 0.14),
    '--glass-panel-border': hexToRgba(theme.glassPanel, 0.22),
    '--glass-panel-dark-bg': hexToRgba(theme.glassPanelDark, 0.78),
    '--glass-panel-dark-border': hexToRgba(theme.glassPanel, 0.16),
    '--glass-card-bg': hexToRgba(theme.glassCardSubtle, 0.08),
    '--glass-card-border': hexToRgba(theme.glassCardSubtle, 0.14),

    // Fonts
    '--font-display': `"${fonts.displayFont}", system-ui, -apple-system, sans-serif`,
    '--font-body': `"${fonts.bodyFont}", system-ui, -apple-system, sans-serif`,
  };

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  // Sync Google Fonts stylesheet if changed from static HTML build
  const fontLink = document.getElementById('brand-google-fonts') as HTMLLinkElement | null;
  if (fontLink && fonts.googleFontsUrl && fontLink.href !== fonts.googleFontsUrl) {
    fontLink.href = fonts.googleFontsUrl;
  }

  // Sync favicon
  let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    document.head.appendChild(faviconLink);
  }
  if (identity.faviconPath) {
    faviconLink.href = identity.faviconPath;
  }
}
