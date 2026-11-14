/**
 * ============================================================================
 *  CLIENT EDITS HERE — WHITE-LABEL BRAND & CONTENT CONFIGURATION
 * ============================================================================
 *  Single source of truth for identity, theme colors, typography, image paths,
 *  contacts, locale rules, stats, marketing copy, leadership team, and flags.
 *
 *  HOW TO REBRAND THIS TEMPLATE:
 *    1. Edit the values in this file (`src/config/brand.config.ts`).
 *    2. Drop replacement images with the SAME filenames into `public/brand/`
 *       (see `public/brand/README.md` for dimensions and aspect ratios):
 *         - logo.svg, favicon.png
 *         - hero.jpg, hero-fallback.jpg, approach-walkway.jpg, about-portrait.jpg, cta-bg.jpg
 *         - auth-villa.jpg, auth-villa-alt.jpg, fallback-villa.jpg
 *         - service-villa.jpg, service-acquisition.jpg, luxury-interior.jpg
 *         - project-aspen.jpg, project-zenith.jpg, project-ironwood.jpg
 *         - home-res-1-ext.jpg, home-res-1-int-1.jpg, home-res-1-int-2.jpg,
 *           home-res-2-int-1.jpg, home-res-2-int-2.jpg, home-res-3-int-1.jpg, home-res-3-int-2.jpg
 *         - gallery-kitchen.jpg, gallery-terrace.jpg, gallery-dining.jpg, gallery-bedroom.jpg
 *         - listing-foothills.jpg, listing-dha-modern.jpg, listing-f8-villa.jpg,
 *           listing-dha-coastal.jpg, listing-askari.jpg, listing-gulberg-apt.jpg,
 *           listing-bahria-villa.jpg, listing-interior-living.jpg, listing-interior-lounge.jpg
 *         - buy-1.jpg .. buy-9.jpg
 *         - rent-1.jpg, rent-4.jpg .. rent-12.jpg
 *         - team-1.jpg .. team-4.jpg
 *         - office-1.jpg, office-3.jpg, office-overseas.jpg
 *    3. Update property catalogs in `src/data/` (`realEstateData.ts`,
 *       `buyPropertiesData.ts`, `rentalsData.ts`, `newsData.ts`).
 *    4. Configure `.env` (Firebase, email provider, management credentials).
 *
 *  NOTE: Keep this file pure TypeScript (no DOM globals or `import.meta.env`)
 *  so it can be imported safely by Vite, Node (`server.ts`), and React.
 * ============================================================================
 */

export const BRAND_CONFIG = {
  // --------------------------------------------------------------------------
  // 1. IDENTITY
  // --------------------------------------------------------------------------
  identity: {
    brandName: 'Avenue Luxury Properties',
    brandShortName: 'Avenue',
    brandMonogram: 'A',
    brandInitials: 'AV',
    watermarkText: 'AVENUE',
    legalName: 'Avenue',
    foundedYear: 2025,
    siteUrl: 'https://example.com',
    logoText: 'Avenue',
    logoImagePath: '/brand/logo.svg',
    faviconPath: '/brand/favicon.png',
    metaDescription:
      'Discover your architectural legacy. Avenue presents premium residences, property acquisitions, and architectural portfolios.',
    architectDefault: 'Avenue Design Atelier',
    storageKeyPrefix: 'avenue',
    demoToastMessage: 'Demo website: contact details are placeholders.',
    demoDisclaimer: 'Demo website. Listings, prices, names and contact details are fictional.',
  },

  // --------------------------------------------------------------------------
  // 2. THEME (HEX ONLY — rgba glass panels & shades derived at runtime)
  // --------------------------------------------------------------------------
  theme: {
    brand: '#1B2A44',        // Primary dark navy (text, dark buttons, headers)
    brandNav: '#142036',     // Unscrolled navbar bar background
    brandNavScrolled: '#101B2E', // Scrolled navbar pill background
    brandDark: '#0e1726',    // Deep showcase overlay & gradient base
    brandDeep: '#0d1624',    // Deepest dark overlay
    accent: '#2F4B73',       // Secondary accent (active tabs, highlights, drawer)
    surface: '#E6ECF5',      // Main light page canvas
    watermark: '#E2E8F0',    // Large editorial background watermark tone
    textPrimary: '#1B2A44',  // Main body text
    textMuted: '#64748B',    // Subdued body/caption ink
    glassPanel: '#FFFFFF',   // Light frosted glass base hex (alpha 0.14 / 0.22 border)
    glassPanelDark: '#101B2E', // Dark frosted glass base hex (alpha 0.78)
    glassCardSubtle: '#FFFFFF', // Subtle frosted badge base hex (alpha 0.08 / 0.14 border)
    success: '#10B981',      // Positive badges / verification
    error: '#F43F5E',        // Validation errors & danger states
  },

  // --------------------------------------------------------------------------
  // 3. FONTS
  // --------------------------------------------------------------------------
  fonts: {
    displayFont: 'Unbounded',
    bodyFont: 'Manrope',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&family=Unbounded:wght@400;600;700;800;900&display=swap',
  },

  // --------------------------------------------------------------------------
  // 4. IMAGES (Every image on the site points to /brand/*)
  // --------------------------------------------------------------------------
  images: {
    logo: '/brand/logo.svg',
    favicon: '/brand/favicon.png',
    hero: '/brand/hero.jpg',
    heroFallback: '/brand/hero-fallback.jpg',
    approachWalkway: '/brand/approach-walkway.jpg',
    about: '/brand/about-portrait.jpg',
    serviceVilla: '/brand/service-villa.jpg',
    luxuryInterior: '/brand/luxury-interior.jpg',
    cta: '/brand/cta-bg.jpg',
    authVilla: '/brand/auth-villa.jpg',
    authVillaAlt: '/brand/auth-villa-alt.jpg',
    fallbackVilla: '/brand/fallback-villa.jpg',

    // Services pillars
    serviceAcquisition: '/brand/service-acquisition.jpg',
    serviceManagement: '/brand/luxury-interior.jpg',
    serviceInvestment: '/brand/auth-villa-alt.jpg',

    // Signature portfolio projects
    projectAspen: '/brand/project-aspen.jpg',
    projectObsidian: '/brand/fallback-villa.jpg',
    projectZenith: '/brand/project-zenith.jpg',
    projectIronwood: '/brand/project-ironwood.jpg',
    projectReflection: '/brand/about-portrait.jpg',

    // Home showcase residences
    homeRes1Ext: '/brand/home-res-1-ext.jpg',
    homeRes1Int1: '/brand/home-res-1-int-1.jpg',
    homeRes1Int2: '/brand/home-res-1-int-2.jpg',
    homeRes2Ext: '/brand/auth-villa.jpg',
    homeRes2Int1: '/brand/home-res-2-int-1.jpg',
    homeRes2Int2: '/brand/home-res-2-int-2.jpg',
    homeRes3Ext: '/brand/service-villa.jpg',
    homeRes3Int1: '/brand/home-res-3-int-1.jpg',
    homeRes3Int2: '/brand/home-res-3-int-2.jpg',

    // Gallery interiors & extended listings
    galleryKitchen: '/brand/gallery-kitchen.jpg',
    galleryTerrace: '/brand/gallery-terrace.jpg',
    galleryDining: '/brand/gallery-dining.jpg',
    galleryBedroom: '/brand/gallery-bedroom.jpg',
    listingFoothills: '/brand/listing-foothills.jpg',
    listingDhaModern: '/brand/listing-dha-modern.jpg',
    listingF8Villa: '/brand/listing-f8-villa.jpg',
    listingDhaCoastal: '/brand/listing-dha-coastal.jpg',
    listingAskari: '/brand/listing-askari.jpg',
    listingGulbergApt: '/brand/listing-gulberg-apt.jpg',
    listingBahriaVilla: '/brand/listing-bahria-villa.jpg',
    listingInteriorLiving: '/brand/listing-interior-living.jpg',
    listingInteriorLounge: '/brand/listing-interior-lounge.jpg',

    // Buy catalog (9 listings)
    buy1: '/brand/buy-1.jpg',
    buy2: '/brand/buy-2.jpg',
    buy3: '/brand/buy-3.jpg',
    buy4: '/brand/buy-4.jpg',
    buy5: '/brand/buy-5.jpg',
    buy6: '/brand/buy-6.jpg',
    buy7: '/brand/buy-7.jpg',
    buy8: '/brand/buy-8.jpg',
    buy9: '/brand/buy-9.jpg',

    // Rent catalog (12 listings)
    rent1: '/brand/rent-1.jpg',
    rent2: '/brand/luxury-interior.jpg',
    rent3: '/brand/service-villa.jpg',
    rent4: '/brand/rent-4.jpg',
    rent5: '/brand/rent-5.jpg',
    rent6: '/brand/rent-6.jpg',
    rent7: '/brand/rent-7.jpg',
    rent8: '/brand/rent-8.jpg',
    rent9: '/brand/rent-9.jpg',
    rent10: '/brand/rent-10.jpg',
    rent11: '/brand/rent-11.jpg',
    rent12: '/brand/rent-12.jpg',

    // Team portraits
    team1: '/brand/team-1.jpg',
    team2: '/brand/team-2.jpg',
    team3: '/brand/team-3.jpg',
    team4: '/brand/team-4.jpg',

    // Offices
    office1: '/brand/office-1.jpg',
    office2: '/brand/about-portrait.jpg',
    office3: '/brand/office-3.jpg',
    officeOverseas: '/brand/office-overseas.jpg',
  },

  // --------------------------------------------------------------------------
  // 5. CONTACT, OFFICES & SOCIAL
  // --------------------------------------------------------------------------
  contact: {
    managementGoogleEmail: 'abdullah.lenovot470s@gmail.com',
    social: {
      instagram: 'https://www.instagram.com/',
      linkedin: 'https://www.linkedin.com/',
      twitter: 'https://x.com/',
    },
    phone: {
      whatsapp: '+92 300 1234567',
      whatsappDigits: '923001234567',
      lahore: '+92 42 1234567',
      islamabad: '+92 51 1234567',
      karachi: '+92 21 1234567',
      overseas: '+92 300 1234567',
    },
    email: {
      general: 'hello@example.com',
      footer: 'abdullah@example.com',
      lahore: 'lahore@example.com',
      islamabad: 'islamabad@example.com',
      karachi: 'karachi@example.com',
      overseas: 'overseas@example.com',
    },
    advisors: {
      lahore: 'Ahmed Raza Khan',
      islamabad: 'Ayesha Siddiqui',
      karachi: 'Hamza Malik',
      overseas: 'Fatima Noor',
    },
    whatsappGreetings: {
      generalFooter: 'Assalam o Alaikum, I am inquiring about Avenue Luxury Properties.',
      contactCta: 'Assalam o Alaikum, I would like to discuss a property acquisition.',
    },
    offices: [
      {
        city: 'Lahore',
        address: 'Main Boulevard, Phase 6, DHA Lahore',
        phone: '+92 42 1234567',
        email: 'lahore@example.com',
        directors: 'Ahmed Raza Khan',
        imageKey: 'office1' as const,
      },
      {
        city: 'Islamabad',
        address: 'Sector F-7 Markaz, Jinnah Super, Islamabad',
        phone: '+92 51 1234567',
        email: 'islamabad@example.com',
        directors: 'Ayesha Siddiqui',
        imageKey: 'office2' as const,
      },
      {
        city: 'Karachi',
        address: 'Khayaban-e-Shahbaz, Phase 6, DHA Karachi',
        phone: '+92 21 1234567',
        email: 'karachi@example.com',
        directors: 'Hamza Malik',
        imageKey: 'office3' as const,
      },
      {
        city: 'Overseas Desk',
        address: 'Dedicated desk for Pakistanis living in the UK, USA, UAE, Saudi Arabia and Canada',
        phone: '+92 300 1234567',
        email: 'overseas@example.com',
        directors: 'Fatima Noor',
        imageKey: 'officeOverseas' as const,
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 6. LOCALE, CURRENCY, UNITS & VALIDATION
  // --------------------------------------------------------------------------
  locale: {
    country: 'Pakistan',
    nationalityAdjective: 'Pakistani',
    greeting: 'Assalam o Alaikum',
    currencyCode: 'PKR',
    currencySymbol: 'PKR',
    currencyLocale: 'en-PK',
    timezoneIana: 'Asia/Karachi',
    timezoneLabel: 'PKT',
    dailyReportLabel: '8 PM PKT report',
    dateFormatHint: 'DD/MM/YYYY',
    mainCities: ['Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Murree & Hills'] as const,
    defaultCity: 'Lahore',
    areaUnits: ['Marla', 'Kanal', 'Sq. Yards', 'Sq. Ft'],
    areaFilterOptions: ['All Sizes', 'Up to 5 Marla', '10 Marla', '1 Kanal', '2 Kanal+'] as const,
    priceFilterOptions: ['All Prices', 'Under 1 Cr', '1-3 Cr', '3-7 Cr', '7 Cr+'] as const,
    buyTypeOptions: ['All Types', 'House', 'Apartment', 'Plot'] as const,
    rentTypeOptions: ['All Types', 'House', 'Apartment', 'Upper Portion', 'Lower Portion'] as const,
    rentBudgetOptions: [
      { label: 'All Budgets', value: 'All Budgets' },
      { label: 'Under 1 Lakh / mo', value: 'Under 1 Lakh' },
      { label: '1 - 2.5 Lakh / mo', value: '1 - 2.5 Lakh' },
      { label: '2.5 Lakh+ / mo', value: '2.5 Lakh+' },
    ],
    phonePlaceholder: 'e.g. 0300 1234567 or +92 300 1234567',
    shortPhonePlaceholder: '03XX XXXXXXX',
    phoneRegex: /^((\+|00)?92|0)?\d{7,14}$/,
    mobilePhoneRegex: /^(\+92|0)3\d{9}$/,
    phoneErrorMessage: 'Enter a valid phone number (e.g. 0300 1234567 or +92 300 1234567)',
    mobilePhoneErrorMessage:
      'Please enter a valid Pakistani mobile number (e.g. 03XX XXXXXXX or +923XXXXXXXXX).',
    defaultServiceInterest: 'Residential Acquisition Strategy',
    serviceInterests: [
      'Residential Acquisition Strategy',
      'Property Management & Advisory',
      'Investment Advice & High-Value Sales',
      'Private Site Viewing',
      'Verified Property Sale Appraisal',
    ],
    placeholderNames: {
      inquiryName: 'e.g. Ahmed Raza',
      inquiryEmail: 'e.g. ahmed.raza@example.com',
      consultationName: 'Tariq Mehmood',
      consultationEmail: 'tariq.mehmood@example.com',
      consultationPhone: '0300 1234567',
      consultationNotes:
        'Interested in 1 Kanal modern homes in DHA Phase 6 Lahore or Sector F-7 Islamabad...',
      signupName: 'e.g. Fatima Noor',
      signupEmail: 'e.g. fatima.noor@example.com',
      detailName: 'Bilal Khan',
      detailEmail: 'bilal.khan@example.com',
      projectDetailName: 'Fatima Noor',
      projectDetailEmail: 'fatima.noor@example.com',
      loginEmail: 'client@example.com',
      rentalDetailName: 'Asim Mahmood',
      rentalDetailEmail: 'asim@example.com',
      rentalDetailPhone: '0300-1234567',
    },
  },

  // --------------------------------------------------------------------------
  // 7. STATS
  // --------------------------------------------------------------------------
  stats: {
    heroStats: [
      {
        value: '6,000+',
        label: 'Happy Families',
        sublabel: 'Transfers completed across DHA, CDA and premier societies',
      },
      {
        value: '3,600+',
        label: 'Properties Delivered',
        sublabel: 'Completed residences with verified possession & approvals',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 8. COPY (UI headlines, paragraphs, services cards, legal & disclaimers)
  // --------------------------------------------------------------------------
  copy: {
    hero: {
      titleLine1: 'DISCOVER YOUR',
      titleLine2: 'ARCHITECTURAL',
      titleLine3: 'LEGACY.',
      subtitle:
        "Experience modern living with verified architectural excellence and enduring value across Pakistan's premier neighbourhoods.",
      ctaButtonLabel: 'Consultation',
      ctaDefaultInterest: 'Private Acquisition Inquiry',
    },
    homeIntro: {
      eyebrow: 'Verified Estates',
      heading: 'A CURATED APPROACH TO PAKISTANI REAL ESTATE.',
      paragraphs: [
        "At Avenue, we bring clarity, design excellence, and transparent due diligence to Pakistan's leading residential markets. From architect-designed modern residences in DHA Lahore and Sector F-7 Islamabad to coastal villas in Clifton Karachi and serene retreats in the Murree Hills.",
        "Every property in our portfolio undergoes thorough legal verification — inspecting land registry, allotment letters, NOC approvals, and utility provisions — ensuring effortless, transparent transfers for both local buyers and overseas Pakistanis.",
      ],
      ctaLabel: 'Explore Properties',
      badgeEyebrow: 'Architectural Standards',
      badgeHeadline: 'Vetted Titles & Clear Transfers',
    },
    portfolioSection: {
      watermark: 'PROJECTS',
      eyebrow: 'CURATED PORTFOLIOS',
      heading: 'SIGNATURE PORTFOLIO',
      guaranteeTitle: 'Avenue Legal Guarantee:',
      guaranteeBody:
        'Each estate in our signature portfolio undergoes rigorous LDA / CDA / KDA title scrutiny and engineering audits before listing.',
      ctaLabel: 'Explore Complete Portfolio',
    },
    servicesSection: {
      eyebrow: 'WHAT WE OFFER',
      heading: 'End-to-End Property Advisory',
      subtitle:
        "Avenue guides you smoothly through every step — whether buying a family home, managing rental yields from overseas, or securing high-value investments.",
      cards: [
        {
          id: '01',
          number: '01',
          title: 'RESIDENTIAL ACQUISITION',
          description:
            'Targeted sourcing, comparative market valuation, fard verification, and end-to-end society transfer support for local & overseas clients.',
          locationTag: 'DHA LAHORE',
          imageKey: 'serviceAcquisition' as const,
        },
        {
          id: '02',
          number: '02',
          title: 'PROPERTY MANAGEMENT',
          description:
            'Proactive asset stewardship, corporate and diplomatic tenant screening, solar system servicing, and transparent rental remittance.',
          locationTag: 'BAHRIA TOWN ISLAMABAD',
          imageKey: 'serviceManagement' as const,
        },
        {
          id: '03',
          number: '03',
          title: 'INVESTMENT ADVISORY',
          description:
            'High-conviction commercial floors, prime plot banking, FBR tax efficiency planning, and confidential principal-to-principal transactions.',
          locationTag: 'CLIFTON KARACHI',
          imageKey: 'serviceInvestment' as const,
        },
      ],
    },
    homePickSection: {
      watermark: 'RESIDENCES',
      eyebrow: 'PRIVATE COLLECTION',
      heading: 'PICK YOUR PERFECT HOME',
      ctaLabel: 'View Property Details',
      allProjectsLabel: 'Browse All Projects',
    },
    aboutPage: {
      watermark: 'AVENUE',
      eyebrow: 'Architectural Advisory & Brokerage',
      heading: 'REDEFINING REAL ESTATE INTEGRITY.',
      lead: "Avenue was founded to replace opacity with architectural rigor, verified legal titles, and principal-level advisory across Pakistan's finest residential enclaves.",
      whyChooseUs: [
        {
          title: '100% Title & NOC Verification',
          description:
            'Every listed residence passes independent fard, allotment, and LDA / CDA / KDA / DHA transfer scrutiny before presentation.',
        },
        {
          title: 'Principal-Level Confidentiality',
          description:
            'Direct senior partner representation with strict non-disclosure protocols and zero speculative brokerage inflation.',
        },
        {
          title: 'Overseas Desk & PoA Execution',
          description:
            'Seamless remote acquisitions via embassy-attested Power of Attorney, live video walkthroughs, and compliant banking channels.',
        },
      ],
      processSteps: [
        {
          step: '01',
          title: 'Private Discovery Brief',
          description:
            'Share target societies, sizing in Marla or Kanal, architectural preferences, and timeline with a managing partner.',
        },
        {
          step: '02',
          title: 'Legal & Structural Vetting',
          description:
            'Our PCATP architects and High Court title counsel inspect construction quality, solar/utility loads, and transfer records.',
        },
        {
          step: '03',
          title: 'Biometric Transfer & Handover',
          description:
            'Coordinated biometric verification, FBR tax filings, pay-order settlement, and keys-in-hand possession delivery.',
        },
      ],
    },
    contactCta: {
      eyebrow: 'Direct Principal Access',
      heading: 'GOT A QUESTION?',
      greeting: 'Assalam o Alaikum',
      intro:
        'An Avenue managing partner responds personally within two hours during local working days. Or connect directly via WhatsApp or office telephone.',
      cardTitle: "LET'S TALK",
      submitLabel: 'Send Inquiry Request',
    },
    footer: {
      missionTagline:
        "Your trusted partner in Pakistan's finest architectural residences, land transfers, and property holdings.",
      legalLinks: ['Privacy Notice', 'Terms of Representation', 'Legal Disclosures'],
    },
    auth: {
      loginEyebrow: 'Client Access Portal',
      loginHeading: 'SIGN IN TO AVENUE',
      loginSubtitle:
        'Access your saved architectural residences, private schedules, and verified client profile.',
      loginShowcaseBadge: 'Private Registry',
      loginQuote: '"True architecture elevates everyday existence into art."',
      loginQuoteAuthor: 'Ahmed Raza Khan — Managing Partner, Lahore',
      loginFooterCta: 'Join Avenue',
      signupEyebrow: 'Client Registration',
      signupHeading: 'JOIN AVENUE',
      signupSubtitle:
        'Register for confidential access to architectural residences in Pakistan.',
      signupTermsLabel:
        "I acknowledge Avenue's client representation terms, non-disclosure protocols, and verified legal representation standards.",
      signupSubmitLabel: 'Create Avenue Account',
      signupShowcaseBadge: 'Verified Ownership',
      signupQuote: '"Building architectural legacies with legal certainty."',
      signupQuoteSubtext:
        "Join Pakistan's premier registry of modern estates, verified fards, and vetted luxury acquisitions.",
    },
    faqs: [
      {
        question: 'How does Avenue verify property titles and society approvals?',
        answer:
          'Every property undergoes document inspection with the relevant authority (DHA, CDA, LDA, KDA, or Bahria Town), checking allotment status, clear dues, and tax records prior to listing.',
      },
      {
        question: 'Can overseas clients purchase or lease remotely?',
        answer:
          'Yes. Our Overseas Desk coordinates live architectural inspections, embassy-attested Power of Attorney preparation, banking channel guidance, and final biometric transfers.',
      },
      {
        question: 'Are listed valuations inclusive of society transfer fees?',
        answer:
          'Listed prices represent asking property valuations. Standard government stamp duty, FBR withholding tax, and society transfer fees are outlined transparently in every deal sheet.',
      },
    ],
    testimonials: [
      {
        quote:
          'Avenue handled our Sector F-7 acquisition from initial structural audit to CDA biometric transfer with complete transparency.',
        author: 'Dr. Salman Qureshi',
        location: 'Islamabad & London',
      },
      {
        quote:
          'Having verified fard documentation ready on day one saved us weeks of uncertainty in DHA Phase 6.',
        author: 'Sana Tariq',
        location: 'Lahore',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 9. LEADERSHIP TEAM
  // --------------------------------------------------------------------------
  team: [
    {
      name: 'Ahmed Raza Khan',
      role: 'Managing Partner & Co-Founder',
      location: 'Lahore',
      bio: 'Over 20 years of experience in Pakistani residential property advisory, facilitating premier transactions across DHA, CDA sectors, and Bahria Town.',
      avatarVariant: 'male' as const,
      photoKey: 'team1' as const,
    },
    {
      name: 'Ayesha Siddiqui',
      role: 'Principal Architectural Advisor',
      location: 'Karachi',
      bio: "Graduate of NCA Lahore and Member of PCATP. Ayesha leads Avenue's architectural verification, structural vetting, and design standards.",
      avatarVariant: 'female' as const,
      photoKey: 'team2' as const,
    },
    {
      name: 'Hamza Malik',
      role: 'Head of Property Advisory & Overseas Desk',
      location: 'Islamabad',
      bio: 'IBA Karachi graduate specialising in property portfolio advisory, FBR tax compliance, and seamless transfers for overseas Pakistanis.',
      avatarVariant: 'male' as const,
      photoKey: 'team3' as const,
    },
    {
      name: 'Fatima Noor',
      role: 'Director of Land Registry & Legal Audit',
      location: 'Lahore',
      bio: 'Advocate High Court specialising in LDA and CDA title scrutiny, fard verification, society approvals, and power of attorney execution.',
      avatarVariant: 'hijab' as const,
      photoKey: 'team4' as const,
    },
  ],

  // --------------------------------------------------------------------------
  // 10. FEATURE FLAGS
  // --------------------------------------------------------------------------
  features: {
    demoMode: false,
    showBuyPage: true,
    showRentPage: true,
    showProjectsPage: true,
    enableGoogleLogin: true,
    enableEnquiryWebhook: true,
    enableEmailAlerts: true,
  },
} as const;

export type BrandImageKey = keyof typeof BRAND_CONFIG.images;

export function getBrandImage(key: BrandImageKey): string {
  return BRAND_CONFIG.images[key];
}
