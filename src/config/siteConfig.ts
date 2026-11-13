/**
 * SITE CONFIGURATION
 * Single source of truth for contact details, offices, and demo settings.
 * Fictional placeholders for a demo. Replace before going live.
 */

export const DEMO_MODE = true;

// Toast notification message when demo contact links are clicked
export const DEMO_CONTACT_TOAST = 'Demo website: contact details are placeholders.';

export const SITE_CONFIG = {
  demoMode: DEMO_MODE,
  disclaimer: 'Demo website. Listings, prices, names and contact details are fictional.',
  phone: {
    whatsapp: '+92 300 1234567',
    whatsappDigits: '923001234567',
    lahore: '+92 42 1234567',
    islamabad: '+92 51 1234567',
    karachi: '+92 21 1234567',
    overseas: '+92 300 1234567',
  },
  email: {
    general: 'hello@example.com',
    footer: 'abdullah@example.com',
    lahore: 'lahore@example.com',
    islamabad: 'islamabad@example.com',
    karachi: 'karachi@example.com',
    overseas: 'overseas@example.com',
  },
  advisors: {
    lahore: 'Ahmed Raza Khan',
    islamabad: 'Ayesha Siddiqui',
    karachi: 'Hamza Malik',
    overseas: 'Fatima Noor',
  },
  offices: [
    {
      city: 'Lahore',
      address: 'Main Boulevard, Phase 6, DHA Lahore',
      phone: '+92 42 1234567',
      email: 'lahore@example.com',
      directors: 'Ahmed Raza Khan',
    },
    {
      city: 'Islamabad',
      address: 'Sector F-7 Markaz, Jinnah Super, Islamabad',
      phone: '+92 51 1234567',
      email: 'islamabad@example.com',
      directors: 'Ayesha Siddiqui',
    },
    {
      city: 'Karachi',
      address: 'Khayaban-e-Shahbaz, Phase 6, DHA Karachi',
      phone: '+92 21 1234567',
      email: 'karachi@example.com',
      directors: 'Hamza Malik',
    },
    {
      city: 'Overseas Desk',
      address: 'Dedicated desk for Pakistanis living in the UK, USA, UAE, Saudi Arabia and Canada',
      phone: '+92 300 1234567',
      email: 'overseas@example.com',
      directors: 'Fatima Noor',
    },
  ],
  forms: {
    phonePlaceholder: 'e.g. 0300 1234567',
    phoneRegex: /^(\+92|0)3\d{9}$/,
    phoneErrorMessage: 'Enter a valid Pakistani mobile number',
  },
};

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
