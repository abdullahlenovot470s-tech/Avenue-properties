import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand.config';
import { usePageMeta } from '../lib/seo';

export const NotFoundPage: React.FC = () => {
  usePageMeta({
    title: `Page Not Found | ${BRAND_CONFIG.identity.brandName}`,
    description: `The requested page could not be found on ${BRAND_CONFIG.identity.brandName}.`,
    path: '/404',
    noindex: true,
  });

  return (
    <div className="min-h-[75svh] pt-24 md:pt-32 pb-12 md:pb-20 px-5 md:px-6 max-w-xl mx-auto flex flex-col items-center justify-center text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-brand/5 border border-brand/10 flex items-center justify-center text-accent">
        <Building2 className="w-8 h-8" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <span className="text-xs font-display uppercase tracking-widest text-accent font-semibold block">
          404 · Page Unavailable
        </span>
        <h1 className="font-display font-bold md:font-extrabold text-[clamp(1.5rem,5.5vw,2rem)] md:text-3xl uppercase tracking-tight text-brand">
          Page Not Found
        </h1>
        <p className="font-body text-xs sm:text-sm text-slate-600 leading-relaxed">
          The page or section you requested is not available or may have moved.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-brand text-brand-contrast text-xs font-display uppercase tracking-wider font-semibold hover:bg-accent transition-colors shadow-sm max-w-full whitespace-normal text-center"
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Return Home</span>
        </Link>
        <Link
          to="/contact"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-brand/20 bg-white text-brand text-xs font-display uppercase tracking-wider font-semibold hover:bg-surface transition-colors max-w-full whitespace-normal text-center"
        >
          <span>Contact Us</span>
        </Link>
      </div>
    </div>
  );
};
