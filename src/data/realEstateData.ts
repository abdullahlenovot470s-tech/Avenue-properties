import type {
  PropertyListing,
  PortfolioProject,
  BrandService,
  TeamMember,
  OfficeLocation,
} from '../types/index.ts';
import { BRAND_CONFIG } from '../config/brand.config.ts';

/*
 * ============================================================================
 * EXAMPLE PORTFOLIO PROJECT & PROPERTY LISTING ENTRIES (COPY & EDIT TO ADD)
 * ============================================================================
 *
 * const EXAMPLE_PORTFOLIO_PROJECT: PortfolioProject = {
 *   id: 'unique-slug-id',            // Unique URL/Firestore ID (lowercase-with-hyphens)
 *   title: 'PROJECT DISPLAY TITLE',  // Short uppercase title displayed on cards
 *   location: 'Sector F-7, Islamabad', // Neighbourhood & city line
 *   size: '1 Kanal',                 // Plot or floor size label shown on card
 *   beds: 5,                         // Bedroom count
 *   baths: 6,                        // Bathroom count
 *   projectDelivered: '2025',        // Completion year string
 *   image: '/brand/project-zenith.jpg', // Primary cover image path (or https:// URL)
 *   summary: 'Concise architectural summary shown on listing cards and detail overview.',
 *   architect: 'Studio Name',        // Lead design practice
 *   valuation: 'PKR 12 Crore',       // Display valuation string
 *   numericValuation: 120000000,     // Numeric valuation for mortgage/payment calculator
 *   category: 'Islamabad',           // City filter category (match BRAND_CONFIG.locale.mainCities)
 *   gallery: ['/brand/project-zenith.jpg', '/brand/gallery-kitchen.jpg'], // Up to 4 photos
 *   status: 'Available',             // 'Available' | 'Under Offer' | 'Sold'
 * };
 *
 * const EXAMPLE_PROPERTY_LISTING: PropertyListing = {
 *   id: 'unique-listing-id',         // Unique ID
 *   name: 'Villa Name',              // Display title
 *   location: 'Phase 6, DHA Lahore', // Street / society / city
 *   price: 'PKR 9.5 Crore',          // Formatted asking price
 *   numericPrice: 95000000,          // Numeric asking price
 *   beds: 5,
 *   baths: 6,
 *   sqft: '1 Kanal',                 // Size label
 *   category: 'Lahore',              // City filter category
 *   description: 'Main editorial overview.',
 *   extendedStory: 'Extended neighborhood & transfer details.',
 *   layoutVariant: 'exterior-left',  // 'exterior-left' | 'exterior-right' for Home alternating layout
 *   exteriorImage: '/brand/home-res-1-ext.jpg',
 *   interiorImages: ['/brand/home-res-1-int-1.jpg', '/brand/home-res-1-int-2.jpg'],
 *   architecturalStyle: 'Modern Classic',
 *   yearBuilt: 2024,
 *   amenities: ['Solar Backup', '24/7 Security'],
 *   architect: 'Architect Name',
 *   lotSize: '1 Kanal Corner Plot',
 *   featured: true,                  // Set true to appear in Home "Pick Your Perfect Home"
 *   status: 'Available',             // 'Available' | 'Under Offer' | 'Sold'
 * };
 * ============================================================================
 */

export const HERO_ASSETS = {
  heroImage: BRAND_CONFIG.images.hero,
  heroFallback: BRAND_CONFIG.images.heroFallback,
  approachWalkway: BRAND_CONFIG.images.approachWalkway,
  margallaRetreat: BRAND_CONFIG.images.about,
  serviceVilla: BRAND_CONFIG.images.serviceVilla,
  luxuryInterior: BRAND_CONFIG.images.luxuryInterior,
  ctaBackground: BRAND_CONFIG.images.cta,
  authVilla: BRAND_CONFIG.images.authVilla,
  authVillaMirrored: BRAND_CONFIG.images.authVillaAlt,
};

export const HERO_STATS = BRAND_CONFIG.stats.heroStats;

export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: 'aspen-retreat',
    title: 'THE ASPEN RETREAT',
    location: 'Bhurban, Murree Hills',
    size: '1 Kanal',
    beds: 5,
    baths: 6,
    projectDelivered: '2024',
    image: BRAND_CONFIG.images.projectAspen,
    summary:
      'A contemporary mountain residence situated on a scenic ridge in Bhurban, featuring heated flooring, local stone work, and private pine forest views.',
    architect: 'Apex Design Partners (NCA Lahore)',
    valuation: 'PKR 6.5 Crore',
    numericValuation: 65000000,
    category: 'Murree & Hills',
    gallery: [
      BRAND_CONFIG.images.projectAspen,
      BRAND_CONFIG.images.galleryKitchen,
      BRAND_CONFIG.images.homeRes1Ext,
    ],
  },
  {
    id: 'obsidian-monolith',
    title: 'THE OBSIDIAN MONOLITH',
    location: 'Block 2, Clifton, Karachi',
    size: '1,000 Sq. Yards',
    beds: 5,
    baths: 6,
    projectDelivered: '2023',
    image: BRAND_CONFIG.images.projectObsidian,
    summary:
      'Coastal modernist villa in Clifton Block 2 Karachi with private pool, acoustic double-glazing, dedicated guard room, and 99-year verified KDA lease.',
    architect: 'Metropolis Architecture Studio (NED Karachi)',
    valuation: 'PKR 18 Crore',
    numericValuation: 180000000,
    category: 'Karachi',
    gallery: [
      BRAND_CONFIG.images.projectObsidian,
      BRAND_CONFIG.images.homeRes2Int2,
      BRAND_CONFIG.images.galleryTerrace,
    ],
  },
  {
    id: 'zenith-pavilion',
    title: 'ZENITH PAVILION',
    location: 'Sector F-7, Islamabad',
    size: '1 Kanal',
    beds: 5,
    baths: 6,
    projectDelivered: '2024',
    image: BRAND_CONFIG.images.projectZenith,
    summary:
      'A peaceful residence under the Margalla Hills in Sector F-7 Islamabad with solid deodar woodwork, 15kW hybrid solar, and clear CDA title.',
    architect: 'Studio Raza Architects (PCATP)',
    valuation: 'PKR 14.5 Crore',
    numericValuation: 145000000,
    category: 'Islamabad',
    gallery: [
      BRAND_CONFIG.images.projectZenith,
      BRAND_CONFIG.images.homeRes1Int2,
      BRAND_CONFIG.images.homeRes2Int1,
    ],
  },
  {
    id: 'ironwood-gallery',
    title: 'IRONWOOD GALLERY',
    location: 'Phase 6, DHA Lahore',
    size: '1 Kanal',
    beds: 5,
    baths: 6,
    projectDelivered: '2024',
    image: BRAND_CONFIG.images.projectIronwood,
    summary:
      'Fair-face architectural residence on a prominent boulevard in DHA Phase 6 Lahore, featuring Italian porcelain tile, solar microgrid, and instant transfer.',
    architect: 'Malik & Associates (NUST)',
    valuation: 'PKR 9.5 Crore',
    numericValuation: 95000000,
    category: 'Lahore',
    gallery: [
      BRAND_CONFIG.images.projectIronwood,
      BRAND_CONFIG.images.galleryDining,
      BRAND_CONFIG.images.homeRes1Ext,
    ],
  },
  {
    id: 'reflection-residence',
    title: 'REFLECTION RESIDENCE',
    location: 'Bahria Enclave, Islamabad',
    size: '10 Marla',
    beds: 4,
    baths: 4,
    projectDelivered: '2023',
    image: BRAND_CONFIG.images.projectReflection,
    summary:
      'Sculptural 10 Marla residence overlooking the scenic Margalla foothills in Bahria Enclave, designed with open courtyards and contemporary skylights.',
    architect: 'Hamza Siddiqui Architects (PCATP)',
    valuation: 'PKR 4.8 Crore',
    numericValuation: 48000000,
    category: 'Islamabad',
    gallery: [BRAND_CONFIG.images.projectReflection, BRAND_CONFIG.images.galleryBedroom],
  },
];

export const SERVICES_OFFERED: BrandService[] = [
  {
    id: 'acquisition-strategy',
    number: '01',
    title: 'Residential Acquisition Strategy',
    description:
      "We provide a refined approach to finding your next home across Pakistan's most prestigious societies. Our services include property sourcing, private site tours, fard and registry verification, and expert price negotiation to ensure you secure a home that offers both comfort and lasting capital appreciation.",
    hasThumbnail: true,
    thumbnailImage: BRAND_CONFIG.images.serviceAcquisition,
    expandedDetails: [
      'Verified society transfer and registry documentation check',
      'FBR filer tax guidance and stamp duty / CVT optimization',
      'Dedicated assistance for overseas Pakistanis with power of attorney support',
      'Structural vetting, load-shedding-proof solar audits and gas connection checks',
    ],
    deliverables: [
      'Property Due Diligence Report (LDA / CDA / DHA / Bahria NOC Status)',
      'Comparative Price Analysis with Recent Society Transfers',
      'Complete Registry, Transfer, and Possession Handover Coordination',
    ],
  },
  {
    id: 'portfolio-management',
    number: '02',
    title: 'Property Management & Advisory',
    description:
      'For property owners in Pakistan and overseas, we provide comprehensive management to protect and enhance your residential holdings. From vetting high-profile corporate and diplomatic tenants to regular maintenance and rent collection, we handle all details with utmost diligence.',
    hasThumbnail: true,
    thumbnailImage: BRAND_CONFIG.images.serviceManagement,
    expandedDetails: [
      'Diplomatic and multinational corporate tenant verification',
      'Quarterly preventative maintenance, solar servicing, and generator checkups',
      'Tenancy contracts drafted in accordance with local rental laws',
      'Property tax, utility billing, and society maintenance handling',
    ],
    deliverables: [
      'Digital Property Statement with Rental Yield Reports',
      'Scheduled Solar System & Generator Maintenance Calendar',
      'Pre-Screened Tenant Placement Service',
    ],
  },
  {
    id: 'capital-transactions',
    number: '03',
    title: 'Investment Advice & High-Value Sales',
    description: `Navigating premier property transactions in ${BRAND_CONFIG.locale.country} requires deep local intelligence. ${BRAND_CONFIG.identity.brandShortName} structures high-value plot acquisitions, commercial floor purchases, and confidential resales between verified buyers.`,
    hasThumbnail: true,
    thumbnailImage: BRAND_CONFIG.images.serviceInvestment,
    expandedDetails: [
      'Prime commercial plots in Gulberg, DHA, and Blue Area Islamabad',
      'High-rental commercial floors and corporate office floors',
      'Installment plan advisory for upcoming approved developments',
      'Confidential resale transactions between verified principals',
    ],
    deliverables: [
      'Investment Analysis for Properties over PKR 15 Crore',
      'FBR Filer vs Non-Filer Tax Impact Comparison',
      'Discreet Matching for High-Value Private Transactions',
    ],
  },
];

// Backward compatibility alias
export const CURATION_SERVICES = SERVICES_OFFERED;

export const PROPERTY_LISTINGS: PropertyListing[] = [
  {
    id: 'clifton-coastal-monolith',
    name: 'The Obsidian Monolith',
    location: 'Block 2, Clifton, Karachi',
    price: 'PKR 18 Crore',
    numericPrice: 180000000,
    beds: 5,
    baths: 6,
    sqft: '1,000 Sq. Yards',
    category: 'Karachi',
    description:
      'Architectural fair-face concrete villa in Clifton Block 2 Karachi with private pool, acoustic double-glazing, dedicated guard room, and 99-year verified KDA lease.',
    extendedStory:
      'Premier coastal architectural residence in Clifton Karachi. High boundary walls, sweet water connections, full solar setup with standby generator, and clean title registry.',
    layoutVariant: 'exterior-left',
    exteriorImage: BRAND_CONFIG.images.homeRes1Ext,
    interiorImages: [BRAND_CONFIG.images.homeRes1Int1, BRAND_CONFIG.images.homeRes1Int2],
    architecturalStyle: 'Contemporary Monolith',
    yearBuilt: 2024,
    architect: 'Metropolis Architecture Studio (NED Karachi)',
    lotSize: '1,000 Sq. Yards Corner Plot',
    featured: true,
    amenities: [
      'Private Swimming Pool',
      '4-Car Porch',
      'Separate Drawing Room',
      '2 Servant Quarters',
      '24/7 Gated Security',
      'KDA Clear Title & Mutation',
    ],
  },
  {
    id: 'zenith-margalla-pavilion',
    name: 'Zenith Pavilion',
    location: 'Sector F-7, Islamabad',
    price: 'PKR 14.5 Crore',
    numericPrice: 145000000,
    beds: 5,
    baths: 6,
    sqft: '1 Kanal',
    category: 'Islamabad',
    description:
      'A peaceful residence at the foot of Margalla Hills with solid deodar woodwork, white travertine stone, and water features. Includes full solar setup, car porch, and separate servant quarter.',
    extendedStory:
      'CDA-approved property with verified fard and registry in Sector F-7, Islamabad. Designed with natural mountain light, wide terraces, underground water tank, and peaceful leafy surroundings.',
    layoutVariant: 'exterior-right',
    exteriorImage: BRAND_CONFIG.images.homeRes2Ext,
    interiorImages: [BRAND_CONFIG.images.homeRes2Int1, BRAND_CONFIG.images.homeRes2Int2],
    architecturalStyle: 'Modern Organic',
    yearBuilt: 2023,
    architect: 'Studio Raza Architects (PCATP)',
    lotSize: '1 Kanal Corner Plot',
    featured: true,
    amenities: [
      'Margalla Hills View',
      '15kW Hybrid Solar',
      'Car Porch for 3 Cars',
      'Servant Quarter with Bath',
      'CDA Transfer Ready',
      'Walking Distance to F-7 Park & Mosque',
    ],
  },
  {
    id: 'ironwood-boulevard-estate',
    name: 'Ironwood Gallery',
    location: 'Phase 6, DHA Lahore',
    price: 'PKR 9.5 Crore',
    numericPrice: 95000000,
    beds: 5,
    baths: 6,
    sqft: '1 Kanal',
    category: 'Lahore',
    description:
      'Spacious modern architectural villa with solid teak woodwork, double-height drawing room, landscaped side lawn, and swimming pool. Fitted with full solar backup and generator provisions.',
    extendedStory:
      'Situated on a prominent boulevard in DHA Phase 6 Lahore. Clear possession, all society dues cleared, and ready for immediate transfer with bank transfer or pay order.',
    layoutVariant: 'exterior-left',
    exteriorImage: BRAND_CONFIG.images.homeRes3Ext,
    interiorImages: [BRAND_CONFIG.images.homeRes3Int1, BRAND_CONFIG.images.homeRes3Int2],
    architecturalStyle: 'Modern Classic',
    yearBuilt: 2024,
    architect: 'Malik & Associates (NUST)',
    lotSize: '1 Kanal Boulevard Plot',
    featured: true,
    amenities: [
      'Swimming Pool',
      'Solar Backup System',
      'Spacious Car Porch',
      '2 Servant Quarters',
      'DHA 24/7 Security Patrol',
      'Commercial Hub & Mosque Nearby',
    ],
  },
  {
    id: 'aspen-ridge-lodge',
    name: 'The Aspen Retreat Lodge',
    location: 'Bhurban, Murree Hills',
    price: 'PKR 6.5 Crore',
    numericPrice: 65000000,
    beds: 5,
    baths: 6,
    sqft: '1 Kanal',
    category: 'Murree & Hills',
    description:
      'Stunning mountain villa in Bhurban with panoramic valley views, local pine woodwork, heavy insulation, heated floors, and backup power generator.',
    extendedStory:
      'Fully approved registry and mutation with clean revenue record. Perfect holiday home 5 minutes from Pearl Continental Bhurban, with road access throughout the year.',
    layoutVariant: 'exterior-left',
    exteriorImage: BRAND_CONFIG.images.cta,
    interiorImages: [BRAND_CONFIG.images.galleryTerrace, BRAND_CONFIG.images.galleryBedroom],
    architecturalStyle: 'Contemporary Mountain Lodge',
    yearBuilt: 2023,
    architect: 'Apex Design Partners (NCA Lahore)',
    lotSize: '1 Kanal Scenic Ridge',
    featured: true,
    amenities: [
      'Panoramic Valley Views',
      'Heavy Thermal Insulation',
      'Full Generator & Solar Backup',
      'Car Porch for 4 SUVs',
      'Caretaker Residence',
      'Gated Private Road',
    ],
  },
  {
    id: 'reflection-foothills-villa',
    name: 'Reflection Foothills Residence',
    location: 'Bahria Enclave, Islamabad',
    price: 'PKR 4.8 Crore',
    numericPrice: 48000000,
    beds: 4,
    baths: 4,
    sqft: '10 Marla',
    category: 'Islamabad',
    description:
      'Sculptural 10 Marla residence overlooking the scenic Margalla foothills in Bahria Enclave, designed with open courtyards and contemporary skylights.',
    extendedStory:
      'Fully verified Bahria transfer with clear title. Features modern open kitchen, private rooftop terrace, underground water storage, and solar backup.',
    layoutVariant: 'exterior-right',
    exteriorImage: BRAND_CONFIG.images.listingFoothills,
    interiorImages: [BRAND_CONFIG.images.galleryKitchen, BRAND_CONFIG.images.homeRes1Int1],
    architecturalStyle: 'Modernist Villa',
    yearBuilt: 2023,
    architect: 'Hamza Siddiqui Architects (PCATP)',
    lotSize: '10 Marla Plot',
    featured: true,
    amenities: [
      'Margalla Foothill Vista',
      'Uninterrupted Bahria Power',
      'Covered Car Porch',
      'Rooftop BBQ Pavilion',
      'Servant Room',
      '24/7 Security Patrol',
    ],
  },
  {
    id: 'dha-10-marla',
    name: '10 Marla Modern House',
    location: 'Phase 5, DHA Lahore',
    price: 'PKR 4.25 Crore',
    numericPrice: 42500000,
    beds: 4,
    baths: 5,
    sqft: '10 Marla',
    category: 'Lahore',
    description:
      'Brand new 10 Marla house in DHA Phase 5 Lahore. Features double-height lobby, modern Spanish tiles, imported sanitary fittings, and lush lawn.',
    extendedStory:
      'DHA transfer ready with all dues cleared. Located near Ring Road, international schools, and sports complex.',
    layoutVariant: 'exterior-left',
    exteriorImage: BRAND_CONFIG.images.listingDhaModern,
    interiorImages: [BRAND_CONFIG.images.projectIronwood, BRAND_CONFIG.images.galleryDining],
    architecturalStyle: 'Contemporary Suburban',
    yearBuilt: 2024,
    architect: 'Studio Raza Architects (PCATP)',
    lotSize: '10 Marla',
    featured: false,
    amenities: [
      '10kW Solar System',
      'Car Porch (2 Cars)',
      'Drawing & Dining',
      'Servant Quarter',
      'DHA Security',
      'Lawn & Terrace',
    ],
  },
  {
    id: 'f8-kanal-house',
    name: '1 Kanal Executive Villa',
    location: 'Sector F-8/1, Islamabad',
    price: 'PKR 6.8 Crore',
    numericPrice: 68000000,
    beds: 5,
    baths: 6,
    sqft: '1 Kanal',
    category: 'Islamabad',
    description:
      'Executive 1 Kanal residence in leafy Sector F-8 Islamabad with solid woodwork, wide driveway, mountain breeze, and clear CDA title.',
    extendedStory:
      'Prime capital location with immediate CDA registry and mutation. Quiet residential street with diplomatic-grade security nearby.',
    layoutVariant: 'exterior-right',
    exteriorImage: BRAND_CONFIG.images.listingF8Villa,
    interiorImages: [BRAND_CONFIG.images.homeRes1Int1, BRAND_CONFIG.images.homeRes2Int2],
    architecturalStyle: 'Classic Executive',
    yearBuilt: 2023,
    architect: 'Apex Design Partners (NCA Lahore)',
    lotSize: '1 Kanal',
    featured: false,
    amenities: [
      'Margalla Hills View',
      '15kW Solar Backup',
      '3-Car Porch',
      'Double Servant Quarter',
      'CDA Transfer Ready',
      'Underground Water Tank',
    ],
  },
  {
    id: 'dha-karachi-500',
    name: '500 Sq. Yards Coastal Villa',
    location: 'Phase 8, DHA Karachi',
    price: 'PKR 6.95 Crore',
    numericPrice: 69500000,
    beds: 5,
    baths: 6,
    sqft: '500 Sq. Yards',
    category: 'Karachi',
    description:
      'Breezy coastal villa in DHA Phase 8 Karachi with private plunge pool, modular kitchen, rooftop sea-facing lounge, and 24/7 DHA security.',
    extendedStory:
      'Clean DHA transfer with zero encumbrance. Equipped with underground sweet water tanks, solar panels, and driver room.',
    layoutVariant: 'exterior-left',
    exteriorImage: BRAND_CONFIG.images.listingDhaCoastal,
    interiorImages: [BRAND_CONFIG.images.rent4, BRAND_CONFIG.images.listingInteriorLiving],
    architecturalStyle: 'Modern Coastal',
    yearBuilt: 2024,
    architect: 'Metropolis Architecture Studio (NED)',
    lotSize: '500 Sq. Yards',
    featured: false,
    amenities: [
      'Plunge Pool',
      'Sweet Water Line',
      'Solar Backup',
      '3-Car Porch',
      'Driver Room',
      '24/7 DHA Patrol',
    ],
  },
  {
    id: 'askari-11-house',
    name: '8 Marla Family House',
    location: 'Askari 11, Lahore',
    price: 'PKR 2.95 Crore',
    numericPrice: 29500000,
    beds: 4,
    baths: 4,
    sqft: '8 Marla',
    category: 'Lahore',
    description:
      'Immaculate double-storey 8 Marla house in Askari 11 Lahore. Strict gated entry, continuous gas and water supply, and landscaped park nearby.',
    extendedStory:
      'Immediate possession with GHQ/Askari direct transfer. Peaceful, safe living environment with community amenities.',
    layoutVariant: 'exterior-right',
    exteriorImage: BRAND_CONFIG.images.listingAskari,
    interiorImages: [BRAND_CONFIG.images.listingInteriorLounge],
    architecturalStyle: 'Suburban Contemporary',
    yearBuilt: 2023,
    architect: 'Malik & Associates',
    lotSize: '8 Marla',
    featured: false,
    amenities: [
      'Askari Gated Security',
      'Car Porch',
      'Sui Gas & Clean Water',
      'Servant Room',
      'Parks & Jogging Track',
    ],
  },
  {
    id: 'bahria-rawalpindi-7-marla',
    name: '7 Marla Corner House',
    location: 'Phase 7, Bahria Town, Rawalpindi',
    price: 'PKR 2.4 Crore',
    numericPrice: 24000000,
    beds: 4,
    baths: 4,
    sqft: '7 Marla',
    category: 'Rawalpindi',
    description:
      'Elevated corner house in Bahria Town Phase 7 Rawalpindi. Enjoys scenic hill views, double kitchen, and zero load-shedding via Bahria power grid.',
    extendedStory:
      'All society dues cleared with Bahria transfer readiness. Close to clock tower commercial hub and safari park.',
    layoutVariant: 'exterior-left',
    exteriorImage: BRAND_CONFIG.images.authVillaAlt,
    interiorImages: [BRAND_CONFIG.images.listingF8Villa],
    architecturalStyle: 'Modern Villa',
    yearBuilt: 2024,
    architect: 'Malik & Associates (NUST)',
    lotSize: '7 Marla Corner',
    featured: false,
    amenities: [
      'Corner Plot with Extra Green Belt',
      'Bahria Power Supply',
      'Car Porch',
      'Double Kitchen',
      'Servant Room',
    ],
  },
  {
    id: 'gulberg-apartment',
    name: '3-Bed Luxury Apartment',
    location: 'Gulberg III, Lahore',
    price: 'PKR 2.1 Crore',
    numericPrice: 21000000,
    beds: 3,
    baths: 3,
    sqft: '3-Bed',
    category: 'Lahore',
    description:
      'High-end 3-bed apartment in the heart of Gulberg III Lahore. Features balcony views, dedicated basement parking, and full power backup generator.',
    extendedStory:
      'LDA approved high-rise complex with registered sublease. Walking distance to MM Alam Road dining and business centers.',
    layoutVariant: 'exterior-right',
    exteriorImage: BRAND_CONFIG.images.listingGulbergApt,
    interiorImages: [BRAND_CONFIG.images.listingDhaCoastal],
    architecturalStyle: 'Urban Modern',
    yearBuilt: 2024,
    architect: 'Studio Raza Architects (PCATP)',
    lotSize: '3-Bed Corner',
    featured: false,
    amenities: [
      'High Speed Lifts',
      'Standby Generator',
      'Covered Parking',
      '24/7 Security & CCTV',
      'Fitted Kitchen',
    ],
  },
  {
    id: 'bahria-5-marla',
    name: '5 Marla Designer Villa',
    location: 'Sector C, Bahria Town, Lahore',
    price: 'PKR 1.85 Crore',
    numericPrice: 18500000,
    beds: 3,
    baths: 3,
    sqft: '5 Marla',
    category: 'Lahore',
    description:
      'Compact luxury 5 Marla home in Bahria Town Lahore with solid woodwork, designer false ceilings, and instant possession.',
    extendedStory:
      'Bahria Town direct transfer with verified NOC. Located near Grand Jamia Mosque and commercial boulevard.',
    layoutVariant: 'exterior-left',
    exteriorImage: BRAND_CONFIG.images.listingBahriaVilla,
    interiorImages: [BRAND_CONFIG.images.projectIronwood],
    architecturalStyle: 'Modern Contemporary',
    yearBuilt: 2024,
    architect: 'Malik & Associates',
    lotSize: '5 Marla',
    featured: false,
    amenities: [
      'Uninterrupted Power',
      'Sui Gas Connected',
      'Car Porch',
      'Rooftop Terrace',
      '24/7 Security',
    ],
  },
  {
    id: 'clifton-2-bed',
    name: '2-Bed High-Rise Residence',
    location: 'Block 4, Clifton, Karachi',
    price: 'PKR 1.65 Crore',
    numericPrice: 16500000,
    beds: 2,
    baths: 2,
    sqft: '2-Bed',
    category: 'Karachi',
    description:
      'Cosmopolitan 2-bed apartment in Clifton Block 4 Karachi with sea breeze balcony, standby generator, and secure designated parking.',
    extendedStory:
      'Verified 99-year KDA lease with zero encumbrance. Walking distance to supermarkets, cafes, and Clifton beach.',
    layoutVariant: 'exterior-right',
    exteriorImage: BRAND_CONFIG.images.listingInteriorLiving,
    interiorImages: [BRAND_CONFIG.images.buy3],
    architecturalStyle: 'Modern Coastal',
    yearBuilt: 2023,
    architect: 'Metropolis Architecture Studio (NED)',
    lotSize: '2-Bed Floor Unit',
    featured: false,
    amenities: [
      'Sea Facing Balcony',
      'Sweet Water Tank',
      'Standby Generator',
      'Reserved Parking Slot',
      'High Speed Lifts',
    ],
  },
  {
    id: 'e11-apartment',
    name: '1-Bed Modern Apartment',
    location: 'Sector E-11, Islamabad',
    price: 'PKR 85 Lakh',
    numericPrice: 8500000,
    beds: 1,
    baths: 1,
    sqft: '1-Bed',
    category: 'Islamabad',
    description:
      'Affordable modern 1-bed apartment in Sector E-11 Islamabad with open hill views, lift facility, and high rental return potential.',
    extendedStory:
      'Registered sublease in well-managed residential tower with ongoing security and maintenance management.',
    layoutVariant: 'exterior-left',
    exteriorImage: BRAND_CONFIG.images.listingInteriorLounge,
    interiorImages: [BRAND_CONFIG.images.buy6],
    architecturalStyle: 'Contemporary Studio',
    yearBuilt: 2024,
    architect: 'Studio Raza Architects',
    lotSize: '1-Bed Unit',
    featured: false,
    amenities: [
      'Scenic Margalla Views',
      'Passenger Lift',
      'Separate Electricity Meter',
      'CCTV Monitoring',
      'Car Parking Area',
    ],
  },
];

export const TEAM_MEMBERS: TeamMember[] = BRAND_CONFIG.team.map((member) => ({
  name: member.name,
  role: member.role,
  location: member.location,
  bio: member.bio,
  avatarVariant: member.avatarVariant,
  image: BRAND_CONFIG.images[member.photoKey],
}));

export const REGIONAL_OFFICES: OfficeLocation[] = BRAND_CONFIG.contact.offices.map((office) => ({
  city: office.city,
  address: office.address,
  phone: office.phone,
  email: office.email,
  image: BRAND_CONFIG.images[office.imageKey],
  directors: office.directors,
}));

// Backward compatibility alias
export const GLOBAL_OFFICES = REGIONAL_OFFICES;
