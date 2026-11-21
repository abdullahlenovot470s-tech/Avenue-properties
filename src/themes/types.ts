import type React from 'react';
import type { PropertyListing, PortfolioProject } from '../types';

export interface ThemeRouteActions {
  onOpenConsultation: (serviceTitle?: string) => void;
  onSelectProperty: (property: PropertyListing | PortfolioProject) => void;
}

export interface ThemeShellProps {
  routeKey: string;
  children: (actions: ThemeRouteActions) => React.ReactNode;
}

export interface ThemeHomePageProps {
  onOpenConsultation: (service?: string) => void;
  onSelectProperty: (property: PropertyListing | PortfolioProject) => void;
}

export interface ThemeConsultationPageProps {
  onOpenConsultation: (service?: string) => void;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  Shell: React.ComponentType<ThemeShellProps>;
  PageLoadingFallback: React.ComponentType;
  HomePage: React.ComponentType<ThemeHomePageProps>;
  loaders: {
    loadAboutPage: () => Promise<{ default: React.ComponentType<ThemeConsultationPageProps> }>;
    loadServicesPage: () => Promise<{ default: React.ComponentType<ThemeConsultationPageProps> }>;
    loadProjectsPage: (() => Promise<{ default: React.ComponentType }>) | null;
    loadProjectDetailPage: (() => Promise<{ default: React.ComponentType }>) | null;
    loadBuyPage: (() => Promise<{ default: React.ComponentType }>) | null;
    loadBuyDetailPage: (() => Promise<{ default: React.ComponentType }>) | null;
    loadRentPage: (() => Promise<{ default: React.ComponentType }>) | null;
    loadRentDetailPage: (() => Promise<{ default: React.ComponentType }>) | null;
    loadContactPage: () => Promise<{ default: React.ComponentType }>;
    loadNotFoundPage: () => Promise<{ default: React.ComponentType }>;
  };
}
