/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CatalogProvider } from './context/CatalogContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { BRAND_CONFIG } from './config/brand.config';
import { initAnalytics } from './lib/analytics';
import { getActiveTheme } from './themes/registry';

const activeTheme = getActiveTheme();

const SHOW_PROJECTS_PAGE = BRAND_CONFIG.features.showProjectsPage;
const SHOW_BUY_PAGE = BRAND_CONFIG.features.showBuyPage;
const SHOW_RENT_PAGE = BRAND_CONFIG.features.showRentPage;
const ENABLE_CLIENT_LOGIN = BRAND_CONFIG.features.enableClientLogin;
const ENABLE_ADMIN_PANEL = BRAND_CONFIG.features.enableAdminPanel;
const ENABLE_LOGIN_PAGE = ENABLE_CLIENT_LOGIN || ENABLE_ADMIN_PANEL;
const ENABLE_ENQUIRIES_DASHBOARD =
  ENABLE_ADMIN_PANEL && BRAND_CONFIG.features.enableEnquiriesDashboard;

// Shared account, admin, and legal pages (not swapped per theme)
const loadLoginPage = ENABLE_LOGIN_PAGE ? () => import('./pages/LoginPage') : null;
const loadSignupPage = ENABLE_CLIENT_LOGIN ? () => import('./pages/SignupPage') : null;
const loadProfilePage = ENABLE_CLIENT_LOGIN ? () => import('./pages/ProfilePage') : null;
const loadManageCatalogPage = ENABLE_ADMIN_PANEL ? () => import('./pages/ManageCatalogPage') : null;
const loadClientRecordsPage = ENABLE_ENQUIRIES_DASHBOARD
  ? () => import('./pages/ClientRecordsPage')
  : null;
const loadPrivacyPolicyPage = () => import('./pages/PrivacyPolicyPage');
const loadTermsPage = () => import('./pages/TermsPage');

// Active theme pages
const { Shell: ThemeShell, PageLoadingFallback, HomePage, loaders } = activeTheme;

const NotFoundPage = lazy(loaders.loadNotFoundPage);
const AboutPage = lazy(loaders.loadAboutPage);
const ServicesPage = lazy(loaders.loadServicesPage);
const ProjectsPage =
  SHOW_PROJECTS_PAGE && loaders.loadProjectsPage ? lazy(loaders.loadProjectsPage) : NotFoundPage;
const ProjectDetailPage =
  SHOW_PROJECTS_PAGE && loaders.loadProjectDetailPage
    ? lazy(loaders.loadProjectDetailPage)
    : NotFoundPage;
const BuyPage =
  SHOW_BUY_PAGE && loaders.loadBuyPage ? lazy(loaders.loadBuyPage) : NotFoundPage;
const BuyDetailPage =
  SHOW_BUY_PAGE && loaders.loadBuyDetailPage ? lazy(loaders.loadBuyDetailPage) : NotFoundPage;
const RentPage =
  SHOW_RENT_PAGE && loaders.loadRentPage ? lazy(loaders.loadRentPage) : NotFoundPage;
const RentDetailPage =
  SHOW_RENT_PAGE && loaders.loadRentDetailPage ? lazy(loaders.loadRentDetailPage) : NotFoundPage;
const ContactPage = lazy(loaders.loadContactPage);

const LoginPage = loadLoginPage
  ? lazy(() => loadLoginPage().then((m) => ({ default: m.LoginPage })))
  : NotFoundPage;
const SignupPage = loadSignupPage
  ? lazy(() => loadSignupPage().then((m) => ({ default: m.SignupPage })))
  : NotFoundPage;
const ProfilePage = loadProfilePage
  ? lazy(() => loadProfilePage().then((m) => ({ default: m.ProfilePage })))
  : NotFoundPage;
const ManageCatalogPage = loadManageCatalogPage
  ? lazy(() => loadManageCatalogPage().then((m) => ({ default: m.ManageCatalogPage })))
  : NotFoundPage;
const ClientRecordsPage = loadClientRecordsPage
  ? lazy(() => loadClientRecordsPage().then((m) => ({ default: m.ClientRecordsPage })))
  : NotFoundPage;
const PrivacyPolicyPage = lazy(() =>
  loadPrivacyPolicyPage().then((m) => ({ default: m.PrivacyPolicyPage }))
);
const TermsPage = lazy(() => loadTermsPage().then((m) => ({ default: m.TermsPage })));

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

function ThemedAppContent() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  // Idle background prefetch of primary navigation routes after initial paint
  useEffect(() => {
    const prefetch = () => {
      if (loaders.loadProjectsPage) void loaders.loadProjectsPage();
      if (loaders.loadBuyPage) void loaders.loadBuyPage();
      if (loaders.loadRentPage) void loaders.loadRentPage();
      void loaders.loadAboutPage();
      void loaders.loadServicesPage();
      void loaders.loadContactPage();
    };

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = globalThis.setTimeout(prefetch, 900);
    return () => globalThis.clearTimeout(timer);
  }, []);

  const loginRouteEnabled = ENABLE_LOGIN_PAGE;

  return (
    <ThemeShell routeKey={location.pathname}>
      {({ onOpenConsultation, onSelectProperty }) => (
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes location={location}>
            <Route
              path="/"
              element={
                <HomePage
                  onOpenConsultation={onOpenConsultation}
                  onSelectProperty={onSelectProperty}
                />
              }
            />
            <Route
              path="/about"
              element={<AboutPage onOpenConsultation={onOpenConsultation} />}
            />
            <Route
              path="/services"
              element={<ServicesPage onOpenConsultation={onOpenConsultation} />}
            />
            <Route
              path="/projects"
              element={SHOW_PROJECTS_PAGE ? <ProjectsPage /> : <NotFoundPage />}
            />
            <Route
              path="/projects/:id"
              element={SHOW_PROJECTS_PAGE ? <ProjectDetailPage /> : <NotFoundPage />}
            />

            <Route
              path="/buy"
              element={SHOW_BUY_PAGE ? <BuyPage /> : <NotFoundPage />}
            />
            <Route
              path="/buy/:id"
              element={SHOW_BUY_PAGE ? <BuyDetailPage /> : <NotFoundPage />}
            />

            <Route
              path="/rent"
              element={SHOW_RENT_PAGE ? <RentPage /> : <NotFoundPage />}
            />
            <Route
              path="/rent/:id"
              element={SHOW_RENT_PAGE ? <RentDetailPage /> : <NotFoundPage />}
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
              element={ENABLE_CLIENT_LOGIN ? <SignupPage /> : <NotFoundPage />}
            />
            <Route
              path="/profile"
              element={ENABLE_CLIENT_LOGIN ? <ProfilePage /> : <NotFoundPage />}
            />
            <Route
              path="/manage"
              element={
                ENABLE_ADMIN_PANEL ? (
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
                ENABLE_ENQUIRIES_DASHBOARD ? (
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
      )}
    </ThemeShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary fullViewport>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <CatalogProvider>
              <ToastProvider>
                <ThemedAppContent />
              </ToastProvider>
            </CatalogProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
