export interface BuyProperty {
  id: string;
  title: string;
  city: 'Lahore' | 'Islamabad' | 'Karachi' | 'Rawalpindi' | 'Murree & Hills';
  location: string;
  type: 'House' | 'Apartment' | 'Plot';
  price: string; // e.g. "PKR 1.85 Crore" or "PKR 95 Lakh"
  numericPrice: number; // in PKR
  priceRange: 'Under 1 Cr' | '1-3 Cr' | '3-7 Cr' | '7 Cr+';
  area: string; // e.g. "5 Marla", "10 Marla", "1 Kanal", "2 Kanal", "240 Sq. Yd"
  areaCategory: 'Up to 5 Marla' | '10 Marla' | '1 Kanal' | '2 Kanal+';
  beds: number;
  baths: number;
  image: string;
  gallery: string[];
  description: string;
  features: string[];
  possession: string;
  nocStatus: string;
  status?: 'Available' | 'Under Offer' | 'Sold';
}

export function computeAreaCategory(area: string): BuyProperty['areaCategory'] {
  const lower = String(area || '').toLowerCase();
  const match = lower.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
  const numericValue = match ? parseFloat(match[1].replace(/,/g, '')) : NaN;

  let marlas = NaN;
  if (!Number.isNaN(numericValue) && numericValue > 0) {
    if (lower.includes('kanal')) {
      marlas = numericValue * 20;
    } else if (lower.includes('marla')) {
      marlas = numericValue;
    } else if (lower.includes('sq. yd') || lower.includes('sq yd') || lower.includes('yard') || lower.includes('gaz')) {
      marlas = numericValue / 25;
    } else if (lower.includes('sq. ft') || lower.includes('sq ft') || lower.includes('sqft')) {
      marlas = numericValue / 225;
    }
  }

  if (!Number.isNaN(marlas)) {
    if (marlas >= 40) return '2 Kanal+';
    if (marlas >= 20) return '1 Kanal';
    if (marlas > 5) return '10 Marla';
    return 'Up to 5 Marla';
  }

  if (lower.includes('2 kanal') || lower.includes('1,000') || lower.includes('1000')) return '2 Kanal+';
  if (lower.includes('1 kanal') || lower.includes('500')) return '1 Kanal';
  if (lower.includes('10 marla') || lower.includes('7 marla') || lower.includes('8 marla')) return '10 Marla';
  return 'Up to 5 Marla';
}

export const BUY_PROPERTIES: BuyProperty[] = [
  // 1. 5 Marla house Bahria Town Lahore PKR 1.85 Cr
  {
    id: 'buy-bahria-5m-lhr',
    title: '5 Marla Designer House, Bahria Town',
    city: 'Lahore',
    location: 'Sector C, Bahria Town, Lahore',
    type: 'House',
    price: 'PKR 1.85 Crore',
    numericPrice: 18500000,
    priceRange: '1-3 Cr',
    area: '5 Marla',
    areaCategory: 'Up to 5 Marla',
    beds: 3,
    baths: 3,
    image: '/stock/photo-1600047509807-ba8f99d2cdde.jpg',
    gallery: [
      '/stock/photo-1600047509807-ba8f99d2cdde.jpg',
      '/stock/photo-1616046229478-9901c5536a45.jpg',
      '/stock/photo-1617806118233-18e1de247200.jpg',
    ],
    description:
      'Impeccably finished 5 Marla double-storey house in Bahria Town Lahore Sector C. Features solid ash wood doors, Spanish porcelain floor tiles, imported sanitary ware, and dedicated car porch.',
    features: [
      'Sui Gas & Electric Connected',
      'Solar UPS Conduit Wiring',
      'Fitted Modern Kitchen with Hood',
      'Walking Distance to Grand Mosque',
      '24/7 Gated Community Security',
    ],
    possession: 'Ready to Move',
    nocStatus: 'Bahria Town Transfer Ready',
  },

  // 2. 10 Marla house DHA Phase 5 Lahore PKR 4.2 Cr
  {
    id: 'buy-dha5-10m-lhr',
    title: '10 Marla Luxury Residence, DHA Phase 5',
    city: 'Lahore',
    location: 'Sector C, DHA Phase 5, Lahore',
    type: 'House',
    price: 'PKR 4.2 Crore',
    numericPrice: 42000000,
    priceRange: '3-7 Cr',
    area: '10 Marla',
    areaCategory: '10 Marla',
    beds: 4,
    baths: 5,
    image: '/stock/photo-1605276374104-dee2a0ed3cd6.jpg',
    gallery: [
      '/stock/photo-1605276374104-dee2a0ed3cd6.jpg',
      '/stock/photo-1600210492486-724fe5c67fb0.jpg',
      '/stock/photo-1600607687939-ce8a6c25118c.jpg',
    ],
    description:
      'Architecturally conceived 10 Marla bungalow in Sector C of DHA Phase 5 Lahore. High ceilings, expansive open-plan lounge, Turkish bath fixtures, and car porch for two executive sedans.',
    features: [
      'Prime Sector C Location',
      'Double-Glazed Soundproof Glass',
      '10kW Solar Net Metering',
      'Servant Quarter with Attached Bath',
      'Clear DHA Registry & Fard Record',
    ],
    possession: 'Immediate Possession',
    nocStatus: 'DHA Lahore Verified',
  },

  // 3. 3-bed apartment Clifton Karachi PKR 2.1 Cr
  {
    id: 'buy-clifton-3b-khi',
    title: '3-Bed Sea-Breeze Apartment, Clifton',
    city: 'Karachi',
    location: 'Block 2, Clifton, Karachi',
    type: 'Apartment',
    price: 'PKR 2.1 Crore',
    numericPrice: 21000000,
    priceRange: '1-3 Cr',
    area: '240 Sq. Yd',
    areaCategory: '10 Marla',
    beds: 3,
    baths: 3,
    image: '/stock/photo-1545324418-cc1a3fa10c00.jpg',
    gallery: [
      '/stock/photo-1545324418-cc1a3fa10c00.jpg',
      '/stock/photo-1600607687920-4e2a09cf159d.jpg',
      '/stock/photo-1618221195710-dd6b41faaea6.jpg',
    ],
    description:
      'Corner 3-bedroom luxury condominium in Clifton Block 2 Karachi. Panoramic coastal skyline views, high-speed passenger and cargo elevators, and round-the-clock standby power backup.',
    features: [
      'Reserved Basement Car Parking',
      'Sweet Water Line & RO Plant',
      'Standby Generator Backup',
      'Round-the-Clock CCTV & Guards',
      'Sub-lease Registered Title',
    ],
    possession: 'Vacant / Ready to Move',
    nocStatus: 'SBCA Approved & Sub-Lease Cleared',
  },

  // 4. 1 Kanal plot DHA Phase 7 Lahore PKR 3.4 Cr
  {
    id: 'buy-dha7-1k-plot-lhr',
    title: '1 Kanal Prime Residential Plot, DHA Phase 7',
    city: 'Lahore',
    location: 'Sector U, DHA Phase 7, Lahore',
    type: 'Plot',
    price: 'PKR 3.4 Crore',
    numericPrice: 34000000,
    priceRange: '3-7 Cr',
    area: '1 Kanal',
    areaCategory: '1 Kanal',
    beds: 0,
    baths: 0,
    image: '/stock/photo-1500382017468-9049fed747ef.jpg',
    gallery: [
      '/stock/photo-1500382017468-9049fed747ef.jpg',
      '/stock/photo-1600596542815-ffad4c1539a9.jpg',
    ],
    description:
      'Direct approach 1 Kanal residential plot located on a 60-foot wide avenue in Sector U, DHA Phase 7 Lahore. All development charges and possession utilities cleared, perfect for an architectural villa.',
    features: [
      '100% Possession Paid & Ready for Construction',
      'Facing 30-Kanal Community Park',
      'Underground Electricity Infrastructure',
      'Direct Access from Barki Road Interchange',
      'DHA Verified Allocation Letter',
    ],
    possession: 'Immediate Possession Available',
    nocStatus: 'DHA Lahore Clean Allocation',
  },

  // 5. 7 Marla house Bahria Town Rawalpindi PKR 1.4 Cr
  {
    id: 'buy-bahria8-7m-rwp',
    title: '7 Marla Modern Villa, Bahria Town',
    city: 'Rawalpindi',
    location: 'Phase 8, Bahria Town, Rawalpindi',
    type: 'House',
    price: 'PKR 1.4 Crore',
    numericPrice: 14000000,
    priceRange: '1-3 Cr',
    area: '7 Marla',
    areaCategory: '10 Marla',
    beds: 3,
    baths: 3,
    image: '/stock/photo-1513584684374-8bab748fbf90.jpg',
    gallery: [
      '/stock/photo-1513584684374-8bab748fbf90.jpg',
      '/stock/photo-1580587771525-78b9dba3b914.jpg',
    ],
    description:
      'Brand new 7 Marla architect-built villa in Bahria Town Phase 8 Rawalpindi. Uninterrupted power grid supply, rooftop terrace overlooking the valley, and European fittings throughout.',
    features: [
      'Bahria Uninterrupted Electricity Grid',
      'Sui Gas Connection in Place',
      'Rooftop BBQ Pavilion',
      'Open-plan American Kitchen',
      'Walk to Civic Center & Commercial',
    ],
    possession: 'Ready to Move',
    nocStatus: 'Bahria Town Verified Transfer',
  },

  // 6. 2-bed apartment E-11 Islamabad PKR 95 Lakh
  {
    id: 'buy-e11-2b-isb',
    title: '2-Bed Scenic Apartment, Sector E-11',
    city: 'Islamabad',
    location: 'Sector E-11/3, Islamabad',
    type: 'Apartment',
    price: 'PKR 95 Lakh',
    numericPrice: 9500000,
    priceRange: 'Under 1 Cr',
    area: '4 Marla',
    areaCategory: 'Up to 5 Marla',
    beds: 2,
    baths: 2,
    image: '/stock/photo-1502672260266-1c1ef2d93688.jpg',
    gallery: [
      '/stock/photo-1502672260266-1c1ef2d93688.jpg',
      '/stock/photo-1545324418-cc1a3fa10c00.jpg',
    ],
    description:
      'High-demand 2-bedroom executive apartment on the 3rd floor in Sector E-11 Islamabad. Panoramic views of Margalla Hills, high rental yield, dual lifts, and dedicated underground parking slot.',
    features: [
      'Margalla Hills View Balcony',
      'Passenger & Cargo Lifts with Backup',
      'Underground Dedicated Parking',
      'High Monthly Rental Demand',
      'CDA Zone Approved Building',
    ],
    possession: 'Immediate Possession',
    nocStatus: 'CDA Building By-Laws Cleared',
  },

  // Additional Residences for Sale
  {
    id: 'buy-margalla-2k-isb',
    title: 'The Margalla Pavilions, Sector F-7',
    city: 'Islamabad',
    location: 'Sector F-7/2, Islamabad',
    type: 'House',
    price: 'PKR 16.5 Crore',
    numericPrice: 165000000,
    priceRange: '7 Cr+',
    area: '2 Kanal',
    areaCategory: '2 Kanal+',
    beds: 6,
    baths: 7,
    image: '/stock/photo-1523217582562-09d0def993a6.jpg',
    gallery: [
      '/stock/photo-1523217582562-09d0def993a6.jpg',
      '/stock/photo-1600121848594-d8644e57abab.jpg',
    ],
    description:
      'Diplomatic enclave style estate sitting on 2 Kanal in Sector F-7 Islamabad. Features heated indoor pool, 25kW hybrid solar farm, Turkish travertine walls, and private security post.',
    features: [
      '2 Kanal Prime CDA Corner Plot',
      'Heated Indoor Lap Pool',
      '25kW Tier-1 Solar Net-Metering',
      'Private Guard & Driver Quarters',
      'Clear CDA Transfer & Title',
    ],
    possession: 'Immediate Possession',
    nocStatus: 'CDA F-7 Direct Transfer',
  },
  {
    id: 'buy-raya-2k-lhr',
    title: 'The Raya Fairways Villa, DHA Phase 6',
    city: 'Lahore',
    location: 'Defence Raya Golf Resort, Phase 6, DHA Lahore',
    type: 'House',
    price: 'PKR 11.5 Crore',
    numericPrice: 115000000,
    priceRange: '7 Cr+',
    area: '2 Kanal',
    areaCategory: '2 Kanal+',
    beds: 5,
    baths: 6,
    image: '/stock/photo-1570129477492-45c003edd2be.jpg',
    gallery: [
      '/stock/photo-1570129477492-45c003edd2be.jpg',
      '/stock/photo-1598928506311-c55ded91a20c.jpg',
    ],
    description:
      'Direct fairway-facing golf villa in Defence Raya Phase 6 Lahore. Bespoke deodar woodwork, infinity plunge pool overlooking hole 14, and landscaped courtyard lounge.',
    features: [
      'Overlooking 18-Hole Championship Golf Course',
      'Formal Drawing & Dining Hall',
      'DHA Phase 6 Supreme Gated Security',
      'German Double-Glazed Facade',
      'DHA Lahore Clean Allotment',
    ],
    possession: 'Immediate Possession',
    nocStatus: 'DHA Lahore Clear Title',
  },
  {
    id: 'buy-murree-1k-resort',
    title: 'Bhurban Ridge Villa, Murree Hills',
    city: 'Murree & Hills',
    location: 'PC Bhurban Road, Murree',
    type: 'House',
    price: 'PKR 8.5 Crore',
    numericPrice: 85000000,
    priceRange: '7 Cr+',
    area: '1 Kanal',
    areaCategory: '1 Kanal',
    beds: 4,
    baths: 4,
    image: '/stock/photo-1588880331179-bc9b93a8cb5e.jpg',
    gallery: [
      '/stock/photo-1588880331179-bc9b93a8cb5e.jpg',
      '/stock/photo-1505691938895-1758d7feb511.jpg',
    ],
    description:
      'Charming pine residence nestled in the hills of Bhurban. Features central gas heating, cedar wood ceilings, expansive terrace over pine-covered valleys, and all-season paved road access.',
    features: [
      '1 Kanal Pine Forest Elevation',
      'Central Gas Heating & Water Heater',
      'Full Central Heating & Geyser System',
      'Scenic Valley & Sunset Views',
      'Clear Registry & Intiqal in Murree Tehsil',
    ],
    possession: 'Ready to Move',
    nocStatus: 'Punjab Forest & Revenue Cleared',
  },
];
