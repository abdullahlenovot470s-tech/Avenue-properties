import { BRAND_CONFIG } from '../config/brand.config';
import { defaultTheme } from './default';
import type { ThemeDefinition } from './types';

/**
 * Registry of installed frontend design themes.
 * To add a new theme:
 *   1. Create src/themes/<theme-id>/ exporting a ThemeDefinition.
 *   2. Register it below under '<theme-id>'.
 *   3. Set VITE_THEME=<theme-id> (or change DEFAULT_THEME_NAME in brand.config.ts).
 */
export const THEME_REGISTRY: Record<string, ThemeDefinition> = {
  default: defaultTheme,
};

export function getActiveTheme(themeName = BRAND_CONFIG.activeTheme): ThemeDefinition {
  const key = String(themeName || 'default').trim().toLowerCase();
  return THEME_REGISTRY[key] || defaultTheme;
}
