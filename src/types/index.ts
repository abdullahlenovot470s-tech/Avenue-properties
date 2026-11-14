import { BRAND_CONFIG } from '../config/brand.config.ts';

export type LocationCategory = string;
export type PakistanLocationCategory = LocationCategory;

export type ProjectStatus = 'Available' | 'Under Offer' | 'Sold';
export type BuyStatus = 'Available' | 'Under Offer' | 'Sold';
export type RentStatus = 'Available' | 'Rented';
export type PropertyStatus = 'Available' | 'Under Offer' | 'Sold' | 'Rented';

export type MainCity = (typeof BRAND_CONFIG.locale.mainCities)[number];

export interface PropertyListing {
  id: string;
  name: string;
  location: string;
  price: string;
  numericPrice: number;
  beds: number;
  baths: number;
  sqft: string;
  category: string;
  description: string;
  extendedStory?: string;
  layoutVariant: 'exterior-left' | 'exterior-right';
  exteriorImage: string;
  interiorImages: string[];
  architecturalStyle: string;
  yearBuilt: number;
  amenities: string[];
  architect?: string;
  lotSize?: string;
  featured?: boolean;
  status?: ProjectStatus;
}

export interface PortfolioProject {
  id: string;
  title: string;
  location: string;
  size: string;
  beds: number;
  baths: number;
  projectDelivered: string;
  image: string;
  summary: string;
  architect: string;
  valuation: string;
  numericValuation?: number;
  category: string;
  gallery: string[];
  status?: ProjectStatus;
}

export interface RentalListing {
  id: string;
  title: string;
  city: string;
  areaSociety: string;
  type: 'Apartment' | 'House' | 'Upper Portion' | 'Lower Portion';
  monthlyRent: number;
  beds: number;
  baths: number;
  sizeOrFloor: string;
  furnished: 'Furnished' | 'Unfurnished';
  image: string;
  gallery: string[];
  availableFrom: string;
  securityDeposit: string;
  advanceRent: string;
  minContractPeriod: string;
  amenities: string[];
  description: string;
  status?: RentStatus;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  publishedAt: string;
  author: string;
  image: string;
}

export interface BrandService {
  id: string;
  number: string;
  title: string;
  description: string;
  hasThumbnail?: boolean;
  thumbnailImage?: string;
  expandedDetails: string[];
  deliverables?: string[];
}

// Backward-compatible aliases
export type AvenueService = BrandService;
export type CurationService = BrandService;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  emailVerified?: boolean;
  role?: 'client' | 'management';
  createdAt: string;
  savedPropertyIds: string[];
}

export interface TeamMember {
  name: string;
  role: string;
  location: string;
  bio: string;
  avatarVariant: 'male' | 'female' | 'hijab';
  image?: string;
  social?: {
    linkedin?: string;
    email?: string;
  };
}

export interface OfficeLocation {
  city: string;
  address: string;
  phone: string;
  email: string;
  image: string;
  directors: string;
}

// Backward-compatible alias
export type GlobalOffice = OfficeLocation;
