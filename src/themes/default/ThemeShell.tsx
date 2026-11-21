import React, { useState } from 'react';
import { ScrollToTop } from '../../components/common/ScrollToTop';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { FloatingWhatsAppButton } from '../../components/common/FloatingWhatsAppButton';
import { BRAND_CONFIG } from '../../config/brand.config';
import type { PropertyListing, PortfolioProject } from '../../types';
import type { ThemeShellProps } from '../types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ConsultationModal } from './components/modals/ConsultationModal';
import { PropertyDetailModal } from './components/modals/PropertyDetailModal';

export function DefaultPageLoadingFallback() {
  return (
    <div className="min-h-[60svh] flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative w-11 h-11 flex items-center justify-center">
        <div className="w-11 h-11 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
        <span className="absolute font-display font-black text-xs text-brand">
          {BRAND_CONFIG.identity.brandMonogram}
        </span>
      </div>
      <span className="font-display uppercase tracking-widest text-xs font-semibold text-accent">
        Loading {BRAND_CONFIG.identity.brandShortName} Residence...
      </span>
    </div>
  );
}

export const ThemeShell: React.FC<ThemeShellProps> = ({ routeKey, children }) => {
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>(
    BRAND_CONFIG.locale.defaultServiceInterest
  );
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | PortfolioProject | null>(
    null
  );
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleOpenConsultation = (serviceTitle?: string) => {
    if (serviceTitle) {
      setSelectedService(serviceTitle);
    }
    setConsultationOpen(true);
  };

  const handleSelectProperty = (prop: PropertyListing | PortfolioProject) => {
    setSelectedProperty(prop);
    setPropertyModalOpen(true);
  };

  const handleBookViewing = (propertyName: string) => {
    setSelectedService(`Private Site Visit: ${propertyName}`);
    setConsultationOpen(true);
  };

  return (
    <div className="min-h-[100svh] overflow-x-clip bg-surface text-brand selection:bg-accent selection:text-accent-contrast antialiased flex flex-col justify-between">
      <ScrollToTop />

      {/* Shared Persistent Navbar across all pages */}
      <Navbar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      {/* Smooth non-blocking route transitions */}
      <main className="flex-1 w-full">
        <div key={routeKey} className="route-enter">
          <ErrorBoundary resetKey={routeKey}>
            {children({
              onOpenConsultation: handleOpenConsultation,
              onSelectProperty: handleSelectProperty,
            })}
          </ErrorBoundary>
        </div>
      </main>

      {/* Shared Footer across all pages */}
      <Footer />

      <FloatingWhatsAppButton hidden={mobileMenuOpen} />

      {/* Interactive Modals */}
      <ConsultationModal
        isOpen={consultationOpen}
        onClose={() => setConsultationOpen(false)}
        defaultService={selectedService}
      />

      <PropertyDetailModal
        isOpen={propertyModalOpen}
        property={selectedProperty}
        onClose={() => setPropertyModalOpen(false)}
        onBookViewing={handleBookViewing}
      />
    </div>
  );
};
