import React, { Suspense, lazy } from 'react';
import { Hero } from '../components/Hero';
import { LanguageToggleBar } from '../components/LanguageToggleBar';
import { ServicesSection } from '../components/ServicesSection';
import { Portfolio } from '../components/Portfolio';
import { ContactCta } from '../components/ContactCta';
import { PropertyListing, PortfolioProject } from '../../../types';
import { BRAND_CONFIG } from '../../../config/brand.config';
import { buildRealEstateAgentJsonLd, usePageSeo } from '../../../lib/seo';

const ReviewsSection = lazy(() =>
  import('../components/ReviewsSection').then((m) => ({ default: m.ReviewsSection }))
);

interface HomePageProps {
  onOpenConsultation: (service?: string) => void;
  onSelectProperty: (property: PropertyListing | PortfolioProject) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onOpenConsultation,
  onSelectProperty,
}) => {
  const citiesLabel = BRAND_CONFIG.locale.mainCities.join(', ');

  usePageSeo({
    title: `${BRAND_CONFIG.identity.brandShortName} | ${BRAND_CONFIG.identity.brandName}`,
    description: `${BRAND_CONFIG.identity.brandName} — verified houses, luxury residences, apartments, and plots for sale and rent across ${citiesLabel}. Transparent title vetting and overseas client advisory.`,
    path: '/',
    image: BRAND_CONFIG.images.hero,
    structuredData: buildRealEstateAgentJsonLd(),
  });

  return (
    <div className="w-full flex flex-col space-y-4 sm:space-y-6">
      {/* 1. HERO */}
      <Hero onOpenConsultation={() => onOpenConsultation('Executive Consultation')} />

      {/* LANGUAGE TOGGLE BAR (English <-> Roman Urglish descriptions) */}
      <LanguageToggleBar />

      {/* 2. WHAT WE OFFER */}
      <ServicesSection onOpenConsultation={onOpenConsultation} />

      {/* 3. SIGNATURE PORTFOLIO */}
      {BRAND_CONFIG.features.showProjectsPage && (
        <Portfolio
          onSelectProject={onSelectProperty}
          onOpenConsultation={() => onOpenConsultation('Signature Portfolio Access')}
        />
      )}

      {/* 4. CLIENT REVIEWS */}
      {BRAND_CONFIG.features.enableReviews && (
        <Suspense
          fallback={
            <div
              aria-hidden="true"
              className="w-full py-5 md:py-10 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto"
            >
              <div className="w-full h-[360px] md:h-[420px] rounded-2xl md:rounded-[32px] bg-white/70 border border-slate-100" />
            </div>
          }
        >
          <ReviewsSection />
        </Suspense>
      )}

      {/* 5. LET'S TALK (CTA) */}
      <ContactCta />
    </div>
  );
};
