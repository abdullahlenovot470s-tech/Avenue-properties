import React from 'react';
import { Languages } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand.config';
import { useLanguage } from '../context/LanguageContext';

export const LanguageToggleBar: React.FC = () => {
  const { language, setLanguage, isUrglish } = useLanguage();

  if (!BRAND_CONFIG.features.enableUrglishToggle) {
    return null;
  }

  return (
    <section
      aria-label="Description language switcher"
      className="w-full px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto"
    >
      {/* Mobile slim pill row (< 768px) */}
      <div className="flex md:hidden items-center justify-center">
        <div
          role="group"
          aria-label="Select description language"
          className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-slate-200/90 shadow-sm max-w-full"
        >
          <span className="pl-2.5 pr-1 text-brand/70 shrink-0" aria-hidden="true">
            <Languages className="w-3.5 h-3.5" />
          </span>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            aria-pressed={language === 'en'}
            className={`px-3 py-1.5 rounded-full font-display text-[11px] uppercase tracking-wider font-semibold transition-all whitespace-nowrap cursor-pointer ${
              language === 'en'
                ? 'bg-brand text-brand-contrast shadow-xs'
                : 'text-slate-600 hover:text-brand'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage('urglish')}
            aria-pressed={language === 'urglish'}
            className={`px-3 py-1.5 rounded-full font-display text-[11px] uppercase tracking-wider font-semibold transition-all whitespace-nowrap cursor-pointer ${
              language === 'urglish'
                ? 'bg-brand text-brand-contrast shadow-xs'
                : 'text-slate-600 hover:text-brand'
            }`}
          >
            Roman Urglish
          </button>
        </div>
      </div>

      {/* Desktop / Tablet full bar (>= 768px) */}
      <div className="hidden md:flex bg-white rounded-[24px] px-6 py-4 border border-slate-200/80 shadow-sm flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-surface/60 border border-slate-200/80 flex items-center justify-center text-brand shrink-0">
            <Languages className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-sm uppercase tracking-wider text-brand">
              {isUrglish ? 'Description Language · Roman Urglish' : 'Description Language'}
            </div>
            <p className="font-body text-xs text-slate-600 leading-snug">
              {isUrglish
                ? 'Basic terms English mein aur tamam property descriptions Roman Urdu (Urglish) mein hain. Client reviews original language mein hi rehte hain.'
                : 'Switch website descriptions & details between English and Roman Urglish. Client reviews remain unchanged.'}
            </p>
          </div>
        </div>

        <div
          role="group"
          aria-label="Select description language"
          className="inline-flex items-center p-1 rounded-xl bg-surface/70 border border-slate-200/90 shrink-0"
        >
          <button
            type="button"
            onClick={() => setLanguage('en')}
            aria-pressed={language === 'en'}
            className={`px-3.5 py-2 rounded-lg font-display text-xs uppercase tracking-wider font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              language === 'en'
                ? 'bg-brand text-brand-contrast shadow-sm'
                : 'text-slate-600 hover:text-brand'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage('urglish')}
            aria-pressed={language === 'urglish'}
            className={`px-3.5 py-2 rounded-lg font-display text-xs uppercase tracking-wider font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              language === 'urglish'
                ? 'bg-brand text-brand-contrast shadow-sm'
                : 'text-slate-600 hover:text-brand'
            }`}
          >
            Roman Urglish
          </button>
        </div>
      </div>
    </section>
  );
};
