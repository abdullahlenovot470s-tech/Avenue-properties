import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PORTFOLIO_PROJECTS, PROPERTY_LISTINGS } from '../data/realEstateData';
import { BUY_PROPERTIES, BuyProperty } from '../data/buyPropertiesData';
import { RENTAL_LISTINGS } from '../data/rentalsData';
import { PortfolioProject, PropertyListing, RentalListing } from '../types';
import { useAuth } from './AuthContext';
import { parseApiResponse, SERVER_UNREACHABLE_MESSAGE } from '../lib/http';

export type CityOption = 'Lahore' | 'Islamabad' | 'Karachi' | 'Rawalpindi' | 'Murree & Hills';

export interface NewProjectInput {
  title: string;
  location: string;
  category: CityOption;
  valuation: string;
  size: string;
  beds: number;
  baths: number;
  projectDelivered: string;
  architect: string;
  summary: string;
  image: string;
  gallery?: string[];
}

export interface NewBuyInput {
  title: string;
  city: CityOption;
  location: string;
  type: 'House' | 'Apartment' | 'Plot' | 'Penthouse';
  price: string;
  area: string;
  beds: number;
  baths: number;
  image: string;
  gallery?: string[];
  description: string;
  features: string;
  possession: string;
  nocStatus: string;
}

export interface NewRentInput {
  title: string;
  city: CityOption;
  areaSociety: string;
  type: 'Apartment' | 'House' | 'Upper Portion' | 'Lower Portion';
  monthlyRent: number;
  beds: number;
  baths: number;
  sizeOrFloor: string;
  furnished: 'Furnished' | 'Unfurnished';
  image: string;
  gallery?: string[];
  availableFrom: string;
  securityDeposit: string;
  advanceRent: string;
  minContractPeriod: string;
  amenities: string;
  description: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

interface CatalogContextType {
  portfolioProjects: PortfolioProject[];
  propertyListings: PropertyListing[];
  buyProperties: BuyProperty[];
  rentalListings: RentalListing[];
  loading: boolean;
  backendReachable: boolean;
  refreshCatalog: () => Promise<void>;
  addProject: (input: NewProjectInput) => Promise<ActionResult>;
  removeProject: (id: string) => Promise<ActionResult>;
  addBuyProperty: (input: NewBuyInput) => Promise<ActionResult>;
  removeBuyProperty: (id: string) => Promise<ActionResult>;
  addRentalListing: (input: NewRentInput) => Promise<ActionResult>;
  removeRentalListing: (id: string) => Promise<ActionResult>;
  resetCatalog: (section: 'projects' | 'buy' | 'rent' | 'all') => Promise<ActionResult>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>(PORTFOLIO_PROJECTS);
  const [propertyListings, setPropertyListings] = useState<PropertyListing[]>(PROPERTY_LISTINGS);
  const [buyProperties, setBuyProperties] = useState<BuyProperty[]>(BUY_PROPERTIES);
  const [rentalListings, setRentalListings] = useState<RentalListing[]>(RENTAL_LISTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [backendReachable, setBackendReachable] = useState<boolean>(true);
  const { managementToken, logout } = useAuth();

  const authHeaders = (json = true): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (managementToken) headers.Authorization = `Bearer ${managementToken}`;
    return headers;
  };

  const applyCatalogPayload = (catalog: any) => {
    if (!catalog) return;
    if (Array.isArray(catalog.projects)) setPortfolioProjects(catalog.projects);
    if (Array.isArray(catalog.listings)) setPropertyListings(catalog.listings);
    if (Array.isArray(catalog.buy)) setBuyProperties(catalog.buy);
    if (Array.isArray(catalog.rent)) setRentalListings(catalog.rent);
  };

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog');
      const parsed = await parseApiResponse<{ success?: boolean; catalog?: any }>(res);
      if (parsed.ok && parsed.data?.success && parsed.data.catalog) {
        applyCatalogPayload(parsed.data.catalog);
        setBackendReachable(true);
      } else {
        setBackendReachable(false);
      }
    } catch (err) {
      setBackendReachable(false);
      console.warn('Could not fetch catalog from backend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  const executeMutation = async (
    url: string,
    options: RequestInit,
    fallbackError: string
  ): Promise<ActionResult> => {
    try {
      const res = await fetch(url, options);
      const parsed = await parseApiResponse<{
        success?: boolean;
        catalog?: any;
        error?: string;
      }>(res);

      if (parsed.unreachable || !parsed.data) {
        setBackendReachable(false);
        return { success: false, error: SERVER_UNREACHABLE_MESSAGE };
      }

      setBackendReachable(true);

      if (parsed.status === 401) {
        void logout();
        return {
          success: false,
          error: parsed.data.error || 'Management session expired. Please sign in again.',
        };
      }

      if (!parsed.ok || !parsed.data.success) {
        return { success: false, error: parsed.data.error || fallbackError };
      }

      applyCatalogPayload(parsed.data.catalog);
      return { success: true };
    } catch {
      setBackendReachable(false);
      return { success: false, error: SERVER_UNREACHABLE_MESSAGE };
    }
  };

  const addProject = (input: NewProjectInput) =>
    executeMutation(
      '/api/catalog/projects',
      {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(input),
      },
      'Could not add project.'
    );

  const removeProject = (id: string) =>
    executeMutation(
      `/api/catalog/projects/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: authHeaders(false),
      },
      'Could not remove project.'
    );

  const addBuyProperty = (input: NewBuyInput) =>
    executeMutation(
      '/api/catalog/buy',
      {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(input),
      },
      'Could not add property.'
    );

  const removeBuyProperty = (id: string) =>
    executeMutation(
      `/api/catalog/buy/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: authHeaders(false),
      },
      'Could not remove property.'
    );

  const addRentalListing = (input: NewRentInput) =>
    executeMutation(
      '/api/catalog/rent',
      {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(input),
      },
      'Could not add rental listing.'
    );

  const removeRentalListing = (id: string) =>
    executeMutation(
      `/api/catalog/rent/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: authHeaders(false),
      },
      'Could not remove rental listing.'
    );

  const resetCatalog = (section: 'projects' | 'buy' | 'rent' | 'all') =>
    executeMutation(
      '/api/catalog/reset',
      {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ section }),
      },
      'Could not restore defaults.'
    );

  return (
    <CatalogContext.Provider
      value={{
        portfolioProjects,
        propertyListings,
        buyProperties,
        rentalListings,
        loading,
        backendReachable,
        refreshCatalog,
        addProject,
        removeProject,
        addBuyProperty,
        removeBuyProperty,
        addRentalListing,
        removeRentalListing,
        resetCatalog,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return ctx;
};
