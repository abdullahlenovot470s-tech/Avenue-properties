import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, Instagram, Linkedin, Twitter } from 'lucide-react';
import { SITE_CONFIG, getWhatsAppUrl, handleDemoContactClick } from '../config/siteConfig';
import { BRAND_CONFIG } from '../config/brand.config';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { URGLISH_COPY } from '../data/urglishTranslations';
import { trackEvent } from '../lib/analytics';

export const Footer: React.FC = () => {
  const { isManagement } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  return (
    <footer className="relative w-full pt-2 md:pt-4 pb-20 md:pb-10 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto">
      {/* Dark Brand Rounded Block */}
      <div className="relative w-full bg-brand rounded-2xl md:rounded-[32px] overflow-hidden p-5 md:p-14 text-brand-contrast shadow-2xl flex flex-col justify-between">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 pb-8 md:pb-12 border-b border-white/10">
          {/* Brand & Mission */}
          <div className="md:col-span-5 space-y-4">
            <Link
              to="/"
              className="font-display font-bold text-2xl sm:text-3xl tracking-tighter text-brand-contrast block"
            >
              {BRAND_CONFIG.identity.logoText}
            </Link>
            <p className="font-body text-xs sm:text-sm text-brand-contrast/70 max-w-sm leading-relaxed">
              {t(BRAND_CONFIG.copy.footer.missionTagline, URGLISH_COPY.footer.missionTagline)}
            </p>
            <div className="pt-2 flex items-center gap-3">
              <a
                href={SITE_CONFIG.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full glass-card-subtle flex items-center justify-center text-brand-contrast/80 hover:text-brand-contrast hover:bg-white/20 transition-all cursor-pointer"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={SITE_CONFIG.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-full glass-card-subtle flex items-center justify-center text-brand-contrast/80 hover:text-brand-contrast hover:bg-white/20 transition-all cursor-pointer"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href={SITE_CONFIG.social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="w-8 h-8 rounded-full glass-card-subtle flex items-center justify-center text-brand-contrast/80 hover:text-brand-contrast hover:bg-white/20 transition-all cursor-pointer"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3 space-y-3">
            <span className="text-[11px] font-display uppercase tracking-widest text-brand-contrast/50 block">
              Navigation
            </span>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm font-body">
              <li>
                <Link to="/" className="text-brand-contrast/80 hover:text-brand-contrast transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-brand-contrast/80 hover:text-brand-contrast transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-brand-contrast/80 hover:text-brand-contrast transition-colors">
                  Services
                </Link>
              </li>
              {BRAND_CONFIG.features.showProjectsPage && (
                <li>
                  <Link to="/projects" className="text-brand-contrast/80 hover:text-brand-contrast transition-colors">
                    Projects
                  </Link>
                </li>
              )}
              {BRAND_CONFIG.features.showBuyPage && (
                <li>
                  <Link to="/buy" className="text-brand-contrast/80 hover:text-brand-contrast transition-colors">
                    Buy
                  </Link>
                </li>
              )}
              {BRAND_CONFIG.features.showRentPage && (
                <li>
                  <Link to="/rent" className="text-brand-contrast/80 hover:text-brand-contrast transition-colors">
                    Rent
                  </Link>
                </li>
              )}
              <li>
                <Link to="/contact" className="text-brand-contrast/80 hover:text-brand-contrast transition-colors">
                  Contact
                </Link>
              </li>
              {isManagement && BRAND_CONFIG.features.enableAdminPanel && (
                <>
                  <li>
                    <Link to="/manage" className="text-emerald-300 hover:text-white transition-colors">
                      Manage Data
                    </Link>
                  </li>
                  {BRAND_CONFIG.features.enableEnquiriesDashboard && (
                    <li>
                      <Link to="/records" className="text-sky-300 hover:text-white transition-colors">
                        Client Records
                      </Link>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="md:col-span-4 space-y-3">
            <span className="text-[11px] font-display uppercase tracking-widest text-brand-contrast/50 block">
              Head Office
            </span>
            <div className="space-y-2 text-xs sm:text-sm text-brand-contrast/80 font-body">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-brand-contrast/60 shrink-0 mt-0.5" />
                <span>{SITE_CONFIG.offices[0]?.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-contrast/60 shrink-0" />
                <a
                  href={`mailto:${SITE_CONFIG.email.footer}`}
                  className="hover:text-brand-contrast transition-colors cursor-pointer"
                >
                  {SITE_CONFIG.email.footer}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand-contrast/60 shrink-0" />
                <a
                  href={`tel:${SITE_CONFIG.phone.lahore.replace(/[^0-9+]/g, '')}`}
                  onClick={(e) => {
                    trackEvent('call_click', { location: 'footer' });
                    handleDemoContactClick(e, showToast);
                  }}
                  className="hover:text-brand-contrast transition-colors cursor-pointer"
                >
                  {SITE_CONFIG.phone.lahore}
                </a>
              </div>
              <div className="pt-1">
                <a
                  href={getWhatsAppUrl(BRAND_CONFIG.contact.whatsappGreetings.generalFooter)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    trackEvent('whatsapp_click', { location: 'footer' });
                    handleDemoContactClick(e, showToast);
                  }}
                  className="inline-flex items-center gap-2 text-xs font-display text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <span>Chat on WhatsApp: {SITE_CONFIG.phone.whatsapp}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Disclosures & Copyright */}
        <div className="relative z-10 pt-6 sm:pt-8 flex flex-col items-center justify-center">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between text-[11px] text-brand-contrast/60 font-body gap-3">
            <span>
              © {BRAND_CONFIG.identity.legalName} {BRAND_CONFIG.identity.foundedYear}. All Rights Reserved.
            </span>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-brand-contrast transition-colors">
                Privacy Policy
              </Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-brand-contrast transition-colors">
                Terms of Use
              </Link>
            </div>
          </div>
        </div>

        {/* Faded Watermark Behind Footer Content */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
        >
          <span
            className="font-display font-black leading-none uppercase tracking-tighter text-center text-white/[0.07] select-none whitespace-nowrap"
            style={{ fontSize: 'clamp(3.25rem, 15vw, 12.5rem)' }}
          >
            {BRAND_CONFIG.identity.watermarkText}
          </span>
        </div>
      </div>
    </footer>
  );
};
