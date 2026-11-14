/**
 * SITE CONFIGURATION
 * Backed by `src/config/brand.config.ts` so legacy imports keep working seamlessly.
 */
import type React from 'react';
import { BRAND_CONFIG } from './brand.config.ts';

export const DEMO_MODE = BRAND_CONFIG.features.demoMode;

// Toast notification message when demo contact links are clicked
export const DEMO_CONTACT_TOAST = BRAND_CONFIG.identity.demoToastMessage;

export const SITE_CONFIG = {
  demoMode: BRAND_CONFIG.features.demoMode,
  disclaimer: BRAND_CONFIG.identity.demoDisclaimer,
  social: BRAND_CONFIG.contact.social,
  phone: BRAND_CONFIG.contact.phone,
  email: BRAND_CONFIG.contact.email,
  advisors: BRAND_CONFIG.contact.advisors,
  offices: BRAND_CONFIG.contact.offices.map((office) => ({
    city: office.city,
    address: office.address,
    phone: office.phone,
    email: office.email,
    directors: office.directors,
    image: BRAND_CONFIG.images[office.imageKey],
  })),
  forms: {
    phonePlaceholder: BRAND_CONFIG.locale.phonePlaceholder,
    phoneRegex: BRAND_CONFIG.locale.phoneRegex,
    phoneErrorMessage: BRAND_CONFIG.locale.phoneErrorMessage,
  },
};

export function normalizePhoneInput(raw: string): string {
  return raw.replace(/[\s\-().]/g, '').trim();
}

export function isValidContactPhone(raw: string): boolean {
  const cleaned = normalizePhoneInput(raw);
  return /^\+?\d{7,15}$/.test(cleaned);
}

export function isValidContactEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

/**
 * Intercepts tel:, mailto: and wa.me actions in demo mode to prevent
 * launching dialler, mail client, or external messaging applications.
 */
export function handleDemoContactClick(
  e: React.MouseEvent,
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void
): boolean {
  if (DEMO_MODE) {
    e.preventDefault();
    if (showToast) {
      showToast(DEMO_CONTACT_TOAST, 'info');
    }
    return false;
  }
  return true;
}

/**
 * Builds a WhatsApp URL for demo or production.
 */
export function getWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${SITE_CONFIG.phone.whatsappDigits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
