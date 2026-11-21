import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { BRAND_CONFIG } from '../../../config/brand.config';
import { useCatalog } from '../../../context/CatalogContext';
import { useLanguage } from '../../../context/LanguageContext';
import { URGLISH_COPY } from '../../../data/urglishTranslations';

export const ContactFaqSection: React.FC = () => {
  const { faqs } = useCatalog();
  const { t, getFaqCopy } = useLanguage();
  const [openFaqId, setOpenFaqId] = useState<string | null>(() => faqs[0]?.id || null);

  useEffect(() => {
    if (!openFaqId && faqs.length > 0) {
      setOpenFaqId(faqs[0].id);
    }
  }, [faqs, openFaqId]);

  if (!BRAND_CONFIG.features.enableFaqs || faqs.length === 0) {
    return null;
  }

  return (
    <section
      id="faq"
      aria-labelledby="contact-faq-heading"
      className="below-fold-section relative w-full bg-white rounded-2xl md:rounded-[32px] overflow-hidden p-5 md:p-14 shadow-xl border border-slate-100"
    >
      <div className="absolute top-4 right-0 pointer-events-none select-none overflow-hidden max-w-full z-0">
        <span
          className="font-display font-black leading-none uppercase tracking-tighter text-watermark/25 select-none"
          style={{ fontSize: 'clamp(4rem, 11vw, 7rem)' }}
        >
          FAQ
        </span>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-4 space-y-3">
          <span className="text-[11px] font-display uppercase tracking-widest text-accent font-bold flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Client Advisory</span>
          </span>
          <h2
            id="contact-faq-heading"
            className="font-display font-bold md:font-extrabold text-[clamp(1.25rem,4.5vw,1.625rem)] md:text-3xl text-brand uppercase tracking-tight leading-tight"
            style={{ textWrap: 'balance' }}
          >
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="font-body text-xs sm:text-sm text-brand/75 leading-relaxed">
            {t(
              `Essential guidance on title verification, overseas property transfers, and statutory fee disclosures across ${BRAND_CONFIG.locale.country}.`,
              URGLISH_COPY.contactPage.faqIntro
            )}
          </p>
        </div>

        <div className="lg:col-span-8 divide-y divide-slate-200/80 border-t border-b border-slate-200/80">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqId === faq.id;
            const headingId = `faq-trigger-${faq.id}`;
            const panelId = `faq-panel-${faq.id}`;
            const localizedFaq = getFaqCopy(faq);
            return (
              <div key={faq.id} className="py-4 sm:py-5">
                <button
                  id={headingId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="w-full flex items-start justify-between gap-4 text-left group cursor-pointer"
                >
                  <div className="space-y-1">
                    {faq.category && (
                      <span className="text-[10px] font-display uppercase tracking-widest text-accent font-semibold block">
                        {String(idx + 1).padStart(2, '0')} · {faq.category}
                      </span>
                    )}
                    <span className="font-display font-bold text-sm sm:text-base text-brand group-hover:text-accent transition-colors block leading-snug">
                      {localizedFaq.question}
                    </span>
                  </div>
                  <span
                    aria-hidden="true"
                    className={`w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 ${
                      isOpen
                        ? 'bg-brand text-brand-contrast border-brand rotate-180'
                        : 'bg-surface/40 text-brand group-hover:border-brand'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headingId}
                    className="pt-3 pr-10 sm:pr-12"
                  >
                    <p className="font-body text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {localizedFaq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
