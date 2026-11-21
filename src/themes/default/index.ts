import './theme.css';
import { BRAND_CONFIG } from '../../config/brand.config';
import type { ThemeDefinition } from '../types';
import { ThemeShell, DefaultPageLoadingFallback } from './ThemeShell';
import { HomePage } from './pages/HomePage';

const SHOW_PROJECTS_PAGE = BRAND_CONFIG.features.showProjectsPage;
const SHOW_BUY_PAGE = BRAND_CONFIG.features.showBuyPage;
const SHOW_RENT_PAGE = BRAND_CONFIG.features.showRentPage;

export const defaultTheme: ThemeDefinition = {
  id: 'default',
  name: 'Architectural Editorial',
  Shell: ThemeShell,
  PageLoadingFallback: DefaultPageLoadingFallback,
  HomePage,
  loaders: {
    loadAboutPage: () =>
      import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })),
    loadServicesPage: () =>
      import('./pages/ServicesPage').then((m) => ({ default: m.ServicesPage })),
    loadProjectsPage: SHOW_PROJECTS_PAGE
      ? () => import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage }))
      : null,
    loadProjectDetailPage: SHOW_PROJECTS_PAGE
      ? () =>
          import('./pages/ProjectDetailPage').then((m) => ({
            default: m.ProjectDetailPage,
          }))
      : null,
    loadBuyPage: SHOW_BUY_PAGE
      ? () => import('./pages/BuyPage').then((m) => ({ default: m.BuyPage }))
      : null,
    loadBuyDetailPage: SHOW_BUY_PAGE
      ? () =>
          import('./pages/BuyDetailPage').then((m) => ({ default: m.BuyDetailPage }))
      : null,
    loadRentPage: SHOW_RENT_PAGE
      ? () => import('./pages/RentPage').then((m) => ({ default: m.RentPage }))
      : null,
    loadRentDetailPage: SHOW_RENT_PAGE
      ? () =>
          import('./pages/RentDetailPage').then((m) => ({ default: m.RentDetailPage }))
      : null,
    loadContactPage: () =>
      import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })),
    loadNotFoundPage: () =>
      import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
  },
};
