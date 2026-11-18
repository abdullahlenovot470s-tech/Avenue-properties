/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CatalogProvider } from './context/CatalogContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { ScrollToTop } from './components/common/ScrollToTop';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { FloatingWhatsAppButton } from './components/common/FloatingWhatsAppButton';
import { HomePage } from './pages/HomePage';
import { ConsultationModal } from './components/modals/ConsultationModal';
import { PropertyDetailModal } from './components/modals/PropertyDetailModal';
import { PropertyListing, PortfolioProject } from './types';
import { BRAND_CONFIG } from './config/brand.config';
import { initAnalytics } from './lib/analytics';

// Prefetchable lazy route loaders for instant subsequent page transitions
const loadAboutPage = () => import('./pages/AboutPage');
const loadServicesPage = () => import('./pages/ServicesPage');
const loadProjectsPage = () => import('./pages/ProjectsPage');
const loadProjectDetailPage = () => import('./pages/ProjectDetailPage');
const loadBuyPage = () => import('./pages/BuyPage');
const loadBuyDetailPage = () => import('./pages/BuyDetailPage');
const loadRentPage = () => import('./pages/RentPage');
const loadRentDetailPage = () => import('./pages/RentDetailPage');
const loadContactPage = () => import('./pages/ContactPage');
const loadLoginPage = () => import('./pages/LoginPage');
const loadSignupPage = () => import('./pages/SignupPage');
const loadProfilePage = () => import('./pages/ProfilePage');
const loadManageCatalogPage = () => import('./pages/ManageCatalogPage');
const loadClientRecordsPage = () => import('./pages/ClientRecordsPage');
const loadPrivacyPolicyPage = () => import('./pages/PrivacyPolicyPage');
const loadTermsPage = () => import('./pages/TermsPage');
const loadNotFoundPage = () => import('./pages/NotFoundPage');

const AboutPage = lazy(() => loadAboutPage().then((m) => ({ default: m.AboutPage })));
const ServicesPage = lazy(() => loadServicesPage().then((m) => ({ default: m.ServicesPage })));
const ProjectsPage = lazy(() => loadProjectsPage().then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() =>
  loadProjectDetailPage().then((m) => ({ default: m.ProjectDetailPage }))
);
const BuyPage = lazy(() => loadBuyPage().then((m) => ({ default: m.BuyPage })));
const BuyDetailPage = lazy(() => loadBuyDetailPage().then((m) => ({ default: m.BuyDetailPage })));
const RentPage = lazy(() => loadRentPage().then((m) => ({ default: m.RentPage })));
const RentDetailPage = lazy(() => loadRentDetailPage().then((m) => ({ default: m.RentDetailPage })));
const ContactPage = lazy(() => loadContactPage().then((m) => ({ default: m.ContactPage })));
const LoginPage = lazy(() => loadLoginPage().then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => loadSignupPage().then((m) => ({ default: m.SignupPage })));
const ProfilePage = lazy(() => loadProfilePage().then((m) => ({ default: m.ProfilePage })));
const ManageCatalogPage = lazy(() =>
  loadManageCatalogPage().then((m) => ({ default: m.ManageCatalogPage }))
);
const ClientRecordsPage = lazy(() =>
  loadClientRecordsPage().then((m) => ({ default: m.ClientRecordsPage }))
);
const PrivacyPolicyPage = lazy(() =>
  loadPrivacyPolicyPage().then((m) => ({ default: m.PrivacyPolicyPage }))
);
const TermsPage = lazy(() => loadTermsPage().then((m) => ({ default: m.TermsPage })));
const NotFoundPage = lazy(() => loadNotFoundPage().then((m) => ({ default: m.NotFoundPage })));

// Lightweight fallback during rare un-prefetched chunk load
function PageLoadingFallback() {
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

function ManagementRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isManagement, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoadingFallback />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isManagement) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AnimatedAppContent() {
  const location = useLocation();

  // Consultation and Property Modal states
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>(
    BRAND_CONFIG.locale.defaultServiceInterest
  );
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | PortfolioProject | null>(
    null
  );
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    initAnalytics();
  }, []);

  // Idle background prefetch of primary navigation routes after initial paint
  useEffect(() => {
    const prefetch = () => {
      if (BRAND_CONFIG.features.showProjectsPage) void loadProjectsPage();
      if (BRAND_CONFIG.features.showBuyPage) void loadBuyPage();
      if (BRAND_CONFIG.features.showRentPage) void loadRentPage();
      void loadAboutPage();
      void loadServicesPage();
      void loadContactPage();
    };

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = globalThis.setTimeout(prefetch, 900);
    return () => globalThis.clearTimeout(timer);
  }, []);

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

  const loginRouteEnabled =
    BRAND_CONFIG.features.enableClientLogin || BRAND_CONFIG.features.enableAdminPanel;

  return (
    <div className="min-h-[100svh] overflow-x-clip bg-surface text-brand selection:bg-accent selection:text-accent-contrast antialiased flex flex-col justify-between">
      <ScrollToTop />

      {/* Shared Persistent Navbar across all pages */}
      <Navbar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      {/* Smooth non-blocking route transitions */}
      <main className="flex-1 w-full">
        <div key={location.pathname} className="route-enter">
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes location={location}>
                <Route
                  path="/"
                  element={
                    <HomePage
                      onOpenConsultation={handleOpenConsultation}
                      onSelectProperty={handleSelectProperty}
                    />
                  }
                />
                <Route
                  path="/about"
                  element={<AboutPage onOpenConsultation={handleOpenConsultation} />}
                />
                <Route
                  path="/services"
                  element={<ServicesPage onOpenConsultation={handleOpenConsultation} />}
                />
                <Route
                  path="/projects"
                  element={
                    BRAND_CONFIG.features.showProjectsPage ? <ProjectsPage /> : <NotFoundPage />
                  }
                />
                <Route
                  path="/projects/:id"
                  element={
                    BRAND_CONFIG.features.showProjectsPage ? (
                      <ProjectDetailPage />
                    ) : (
                      <NotFoundPage />
                    )
                  }
                />

                <Route
                  path="/buy"
                  element={BRAND_CONFIG.features.showBuyPage ? <BuyPage /> : <NotFoundPage />}
                />
                <Route
                  path="/buy/:id"
                  element={
                    BRAND_CONFIG.features.showBuyPage ? <BuyDetailPage /> : <NotFoundPage />
                  }
                />

                <Route
                  path="/rent"
                  element={BRAND_CONFIG.features.showRentPage ? <RentPage /> : <NotFoundPage />}
                />
                <Route
                  path="/rent/:id"
                  element={
                    BRAND_CONFIG.features.showRentPage ? <RentDetailPage /> : <NotFoundPage />
                  }
                />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route
                  path="/login"
                  element={loginRouteEnabled ? <LoginPage /> : <NotFoundPage />}
                />
                <Route
                  path="/signup"
                  element={
                    BRAND_CONFIG.features.enableClientLogin ? <SignupPage /> : <NotFoundPage />
                  }
                />
                <Route
                  path="/profile"
                  element={
                    BRAND_CONFIG.features.enableClientLogin ? <ProfilePage /> : <NotFoundPage />
                  }
                />
                <Route
                  path="/manage"
                  element={
                    BRAND_CONFIG.features.enableAdminPanel ? (
                      <ManagementRoute>
                        <ManageCatalogPage />
                      </ManagementRoute>
                    ) : (
                      <NotFoundPage />
                    )
                  }
                />
                <Route
                  path="/records"
                  element={
                    BRAND_CONFIG.features.enableAdminPanel &&
                    BRAND_CONFIG.features.enableEnquiriesDashboard ? (
                      <ManagementRoute>
                        <ClientRecordsPage />
                      </ManagementRoute>
                    ) : (
                      <NotFoundPage />
                    )
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
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
}

export default function App() {
  return (
    <ErrorBoundary fullViewport>
      <HashRouter>
        <LanguageProvider>
          <AuthProvider>
            <CatalogProvider>
              <ToastProvider>
                <AnimatedAppContent />
              </ToastProvider>
            </CatalogProvider>
          </AuthProvider>
        </LanguageProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
