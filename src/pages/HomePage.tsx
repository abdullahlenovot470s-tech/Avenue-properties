import React from 'react';
import { Hero } from '../components/Hero';
import { ServicesSection } from '../components/ServicesSection';
import { Portfolio } from '../components/Portfolio';
import { ContactCta } from '../components/ContactCta';
import { PropertyListing, PortfolioProject } from '../types';
import { BRAND_CONFIG } from '../config/brand.config';

interface HomePageProps {
  onOpenConsultation: (service?: string) => void;
  onSelectProperty: (property: PropertyListing | PortfolioProject) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onOpenConsultation,
  onSelectProperty,
}) => {
  React.useEffect(() => {
    document.title = `${BRAND_CONFIG.identity.brandShortName} | ${BRAND_CONFIG.identity.brandName}`;
  }, []);

  return (
    <div className="w-full flex flex-col space-y-4 sm:space-y-6">
      {/* 1. HERO */}
      <Hero onOpenConsultation={() => onOpenConsultation('Executive Consultation')} />

      {/* 2. WHAT WE OFFER */}
      <ServicesSection onOpenConsultation={onOpenConsultation} />

      {/* 3. SIGNATURE PORTFOLIO */}
      {BRAND_CONFIG.features.showProjectsPage && (
        <Portfolio
          onSelectProject={onSelectProperty}
          onOpenConsultation={() => onOpenConsultation('Signature Portfolio Access')}
        />
      )}

      {/* 4. LET'S TALK (CTA) */}
      <ContactCta />
    </div>
  );
};
