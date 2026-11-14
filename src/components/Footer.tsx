import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, Instagram, Linkedin, Twitter } from 'lucide-react';
import { SITE_CONFIG, handleDemoContactClick, getWhatsAppUrl } from '../config/siteConfig';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const Footer: React.FC = () => {
  const { showToast } = useToast();
  const { isManagement } = useAuth();

  return (
    <footer className="relative w-full pt-4 pb-10 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto">
      {/* Dark Slate-Blue Rounded Block */}
      <div className="relative w-full bg-[#1B2A44] rounded-[24px] sm:rounded-[32px] overflow-hidden p-6 sm:p-10 md:p-14 text-white shadow-2xl flex flex-col justify-between">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-white/10">
          {/* Brand & Mission */}
          <div className="md:col-span-5 space-y-4">
            <Link to="/" className="font-display font-bold text-2xl sm:text-3xl tracking-tighter text-white block">
              Avenue
            </Link>
            <p className="font-body text-xs sm:text-sm text-white/70 max-w-sm leading-relaxed">
              Advisors for architectural residences and family homes in Pakistan. Bridging modern design with clear titles and lasting peace of mind.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <a
                href="#instagram"
                aria-label="Instagram"
                onClick={(e) => e.preventDefault()}
                className="w-8 h-8 rounded-full glass-card-subtle flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#linkedin"
                aria-label="LinkedIn"
                onClick={(e) => e.preventDefault()}
                className="w-8 h-8 rounded-full glass-card-subtle flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="#twitter"
                aria-label="Twitter / X"
                onClick={(e) => e.preventDefault()}
                className="w-8 h-8 rounded-full glass-card-subtle flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigation Links - 2 columns on mobile */}
          <div className="md:col-span-3 space-y-3">
            <span className="text-[11px] font-display uppercase tracking-widest text-white/50 block">
              Navigation
            </span>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm font-body">
              <li>
                <Link to="/" className="text-white/80 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-white/80 hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-white/80 hover:text-white transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/projects" className="text-white/80 hover:text-white transition-colors">
                  Projects
                </Link>
              </li>
              <li>
                <Link to="/buy" className="text-white/80 hover:text-white transition-colors">
                  Buy
                </Link>
              </li>
              <li>
                <Link to="/rent" className="text-white/80 hover:text-white transition-colors">
                  Rent
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/80 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              {isManagement && (
                <>
                  <li>
                    <Link to="/manage" className="text-emerald-300 hover:text-white transition-colors">
                      Manage Inventory
                    </Link>
                  </li>
                  <li>
                    <Link to="/records" className="text-sky-300 hover:text-white transition-colors">
                      Client Records
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="md:col-span-4 space-y-3">
            <span className="text-[11px] font-display uppercase tracking-widest text-white/50 block">
              Head Office
            </span>
            <div className="space-y-2 text-xs sm:text-sm text-white/80 font-body">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-white/60 shrink-0 mt-0.5" />
                <span>{SITE_CONFIG.offices[0].address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-white/60 shrink-0" />
                <a
                  href={`mailto:${SITE_CONFIG.email.footer}`}
                  onClick={(e) => handleDemoContactClick(e, showToast)}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  {SITE_CONFIG.email.footer}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-white/60 shrink-0" />
                <a
                  href={`tel:${SITE_CONFIG.phone.lahore.replace(/[^0-9+]/g, '')}`}
                  onClick={(e) => handleDemoContactClick(e, showToast)}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  {SITE_CONFIG.phone.lahore}
                </a>
              </div>
              <div className="pt-1">
                <a
                  href={getWhatsAppUrl('Assalam o Alaikum, I am inquiring about Avenue Luxury Properties.')}
                  onClick={(e) => handleDemoContactClick(e, showToast)}
                  target="_blank"
                  rel="noopener noreferrer"
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
          <div className="w-full flex flex-col sm:flex-row items-center justify-between text-[11px] text-white/60 font-body gap-3">
            <span>© Avenue 2025. All Rights Reserved.</span>
            <div className="flex items-center gap-4">
              <span className="hover:text-white transition-colors cursor-pointer">
                Privacy Notice
              </span>
              <span>·</span>
              <span className="hover:text-white transition-colors cursor-pointer">
                Terms of Representation
              </span>
              <span>·</span>
              <span className="hover:text-white transition-colors cursor-pointer">
                Legal Disclosures
              </span>
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
            AVENUE
          </span>
        </div>
      </div>
    </footer>
  );
};
