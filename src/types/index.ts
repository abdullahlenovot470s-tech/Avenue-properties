export type PakistanLocationCategory = 'All' | 'Lahore' | 'Islamabad' | 'Karachi' | 'Rawalpindi' | 'Murree & Hills';

export type ProjectStatus = 'Available' | 'Under Offer' | 'Sold';
export type BuyStatus = 'Available' | 'Under Offer' | 'Sold';
export type RentStatus = 'Available' | 'Rented';
export type PropertyStatus = 'Available' | 'Under Offer' | 'Sold' | 'Rented';

export interface PropertyListing {
  id: string;
  name: string;
  location: string;
  price: string;
  numericPrice: number; // in PKR
  beds: number;
  baths: number;
  sqft: string; // e.g. "2 Kanal (9,000 sq ft)" or "1,000 Sq. Yards"
  category: 'Lahore' | 'Islamabad' | 'Karachi' | 'Rawalpindi' | 'Murree & Hills';
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
  size: string; // Marla / Kanal / Sq. Yards
  beds: number;
  baths: number;
  projectDelivered: string;
  image: string;
  summary: string;
  architect: string;
  valuation: string; // e.g. "PKR 6.5 Crore"
  numericValuation?: number;
  category: 'Lahore' | 'Islamabad' | 'Karachi' | 'Rawalpindi' | 'Murree & Hills';
  gallery: string[];
  status?: ProjectStatus;
}

export interface RentalListing {
  id: string;
  title: string;
  city: 'Lahore' | 'Islamabad' | 'Karachi' | 'Rawalpindi' | 'Murree & Hills';
  areaSociety: string;
  type: 'Apartment' | 'House' | 'Upper Portion' | 'Lower Portion';
  monthlyRent: number; // in PKR, e.g. 220000
  beds: number;
  baths: number;
  sizeOrFloor: string; // e.g. "10 Marla" or "5th Floor"
  furnished: 'Furnished' | 'Unfurnished';
  image: string;
  gallery: string[];
  availableFrom: string; // DD/MM/YYYY
  securityDeposit: string; // e.g. "2 months' rent"
  advanceRent: string; // e.g. "1 month" or "3 months"
  minContractPeriod: string; // "11 months"
  amenities: string[];
  description: string;
  status?: RentStatus;
}

export interface AvenueService {
  id: string;
  number: string;
  title: string;
  description: string;
  hasThumbnail?: boolean;
  thumbnailImage?: string;
  expandedDetails: string[];
  deliverables?: string[];
}

// Backward-compatible alias
export type CurationService = AvenueService;

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
