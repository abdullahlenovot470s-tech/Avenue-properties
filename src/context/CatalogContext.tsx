import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PORTFOLIO_PROJECTS, PROPERTY_LISTINGS } from '../data/realEstateData';
import { BUY_PROPERTIES, BuyProperty } from '../data/buyPropertiesData';
import { RENTAL_LISTINGS } from '../data/rentalsData';
import { PortfolioProject, PropertyListing, RentalListing } from '../types';
import { useAuth } from './AuthContext';

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
  const { managementToken } = useAuth();

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
      const data = await res.json();
      if (res.ok && data.success && data.catalog) {
        applyCatalogPayload(data.catalog);
      }
    } catch (err) {
      console.warn('Could not fetch catalog from backend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  const addProject = async (input: NewProjectInput): Promise<ActionResult> => {
    try {
      const res = await fetch('/api/catalog/projects', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Could not add project.' };
      }
      applyCatalogPayload(data.catalog);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while adding project.' };
    }
  };

  const removeProject = async (id: string): Promise<ActionResult> => {
    try {
      const res = await fetch(`/api/catalog/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(false),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Could not remove project.' };
      }
      applyCatalogPayload(data.catalog);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while removing project.' };
    }
  };

  const addBuyProperty = async (input: NewBuyInput): Promise<ActionResult> => {
    try {
      const res = await fetch('/api/catalog/buy', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Could not add property.' };
      }
      applyCatalogPayload(data.catalog);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while adding property.' };
    }
  };

  const removeBuyProperty = async (id: string): Promise<ActionResult> => {
    try {
      const res = await fetch(`/api/catalog/buy/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(false),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Could not remove property.' };
      }
      applyCatalogPayload(data.catalog);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while removing property.' };
    }
  };

  const addRentalListing = async (input: NewRentInput): Promise<ActionResult> => {
    try {
      const res = await fetch('/api/catalog/rent', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Could not add rental listing.' };
      }
      applyCatalogPayload(data.catalog);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while adding rental listing.' };
    }
  };

  const removeRentalListing = async (id: string): Promise<ActionResult> => {
    try {
      const res = await fetch(`/api/catalog/rent/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(false),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Could not remove rental listing.' };
      }
      applyCatalogPayload(data.catalog);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while removing rental listing.' };
    }
  };

  const resetCatalog = async (section: 'projects' | 'buy' | 'rent' | 'all'): Promise<ActionResult> => {
    try {
      const res = await fetch('/api/catalog/reset', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ section }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Could not restore defaults.' };
      }
      applyCatalogPayload(data.catalog);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while restoring defaults.' };
    }
  };

  return (
    <CatalogContext.Provider
      value={{
        portfolioProjects,
        propertyListings,
        buyProperties,
        rentalListings,
        loading,
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
