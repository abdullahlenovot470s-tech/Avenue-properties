/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CatalogProvider } from './context/CatalogContext';
import { ToastProvider } from './context/ToastContext';
import { ScrollToTop } from './components/common/ScrollToTop';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ConsultationModal } from './components/modals/ConsultationModal';
import { PropertyDetailModal } from './components/modals/PropertyDetailModal';
import { PropertyListing, PortfolioProject } from './types';

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

// Lightweight fallback during rare un-prefetched chunk load
function PageLoadingFallback() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative w-11 h-11 flex items-center justify-center">
        <div className="w-11 h-11 rounded-full border-2 border-[#1B2A44]/20 border-t-[#1B2A44] animate-spin" />
        <span className="absolute font-display font-black text-xs text-[#1B2A44]">A</span>
      </div>
      <span className="font-display uppercase tracking-widest text-xs font-semibold text-[#2F4B73]">
        Loading Avenue Residence...
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
  const [selectedService, setSelectedService] = useState('Residential Acquisition Strategy');
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | PortfolioProject | null>(
    null
  );
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);

  // Idle background prefetch of primary navigation routes after initial paint
  useEffect(() => {
    const prefetch = () => {
      void loadProjectsPage();
      void loadBuyPage();
      void loadRentPage();
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

  return (
    <div className="min-h-screen bg-[#E6ECF5] text-[#1B2A44] selection:bg-[#2F4B73] selection:text-white antialiased flex flex-col justify-between">
      <ScrollToTop />

      {/* Shared Persistent Navbar across all pages */}
      <Navbar />

      {/* Smooth non-blocking route transitions */}
      <main className="flex-1 w-full">
        <div key={location.pathname} className="route-enter">
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
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />

              <Route path="/buy" element={<BuyPage />} />
              <Route path="/buy/:id" element={<BuyDetailPage />} />

              <Route path="/rent" element={<RentPage />} />
              <Route path="/rent/:id" element={<RentDetailPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/manage"
                element={
                  <ManagementRoute>
                    <ManageCatalogPage />
                  </ManagementRoute>
                }
              />
              <Route
                path="/records"
                element={
                  <ManagementRoute>
                    <ClientRecordsPage />
                  </ManagementRoute>
                }
              />
              <Route
                path="*"
                element={
                  <HomePage
                    onOpenConsultation={handleOpenConsultation}
                    onSelectProperty={handleSelectProperty}
                  />
                }
              />
            </Routes>
          </Suspense>
        </div>
      </main>

      {/* Shared Footer across all pages */}
      <Footer />

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
    <HashRouter>
      <AuthProvider>
        <CatalogProvider>
          <ToastProvider>
            <AnimatedAppContent />
          </ToastProvider>
        </CatalogProvider>
      </AuthProvider>
    </HashRouter>
  );
}
