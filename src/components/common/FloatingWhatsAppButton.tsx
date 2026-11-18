import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand.config';
import { getWhatsAppUrl, handleDemoContactClick } from '../../config/siteConfig';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { trackEvent } from '../../lib/analytics';

export const FloatingWhatsAppButton: React.FC = () => {
  const location = useLocation();
  const { showToast } = useToast();
  const { isUrglish } = useLanguage();
  const { buyProperties, rentalListings, portfolioProjects, propertyListings } = useCatalog();

  const hiddenPath =
    location.pathname.startsWith('/manage') || location.pathname.startsWith('/records');

  const detailTitle = useMemo(() => {
    const buyMatch = location.pathname.match(/^\/buy\/([^/]+)$/);
    if (buyMatch) {
      const id = decodeURIComponent(buyMatch[1]);
      return buyProperties.find((p) => p.id === id)?.title || '';
    }
    const rentMatch = location.pathname.match(/^\/rent\/([^/]+)$/);
    if (rentMatch) {
      const id = decodeURIComponent(rentMatch[1]);
      return rentalListings.find((r) => r.id === id)?.title || '';
    }
    const projectMatch = location.pathname.match(/^\/projects\/([^/]+)$/);
    if (projectMatch) {
      const id = decodeURIComponent(projectMatch[1]);
      return (
        propertyListings.find((l) => l.id === id)?.name ||
        portfolioProjects.find((p) => p.id === id)?.title ||
        ''
      );
    }
    return '';
  }, [location.pathname, buyProperties, rentalListings, portfolioProjects, propertyListings]);

  if (!BRAND_CONFIG.features.enableFloatingWhatsApp || hiddenPath) {
    return null;
  }

  const pageUrl = typeof window !== 'undefined' ? window.location.href : BRAND_CONFIG.identity.siteUrl;
  const greeting = detailTitle
    ? `${BRAND_CONFIG.locale.greeting} ${BRAND_CONFIG.identity.brandShortName}, I am interested in "${detailTitle}" (${pageUrl}).`
    : isUrglish
      ? `${BRAND_CONFIG.locale.greeting} ${BRAND_CONFIG.identity.brandShortName}, mujhe properties aur consultation ke baray mein maloomat chahiye.`
      : BRAND_CONFIG.contact.whatsappGreetings.generalFooter;

  const href = getWhatsAppUrl(greeting);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    trackEvent('whatsapp_click', {
      location: 'floating_button',
      path: location.pathname,
      ...(detailTitle ? { property: detailTitle } : {}),
    });
    handleDemoContactClick(e, showToast);
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label={`Chat with ${BRAND_CONFIG.identity.brandShortName} on WhatsApp`}
      className="fixed z-40 bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] sm:bottom-6 sm:right-6 inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl border border-white/20 transition-all hover:scale-105 active:scale-95 font-display text-xs uppercase tracking-wider font-bold"
    >
      <MessageCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
};
