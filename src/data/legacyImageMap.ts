import { BRAND_CONFIG } from '../config/brand.config.ts';

/**
 * Backward-compatibility map translating legacy `/stock/photo-*.jpg` paths
 * (including any previously saved in Firestore documents or hardcoded URLs)
 * to the canonical files under `/public/brand/`.
 */
export const LEGACY_IMAGE_PATH_MAP: Record<string, string> = {
  // Legacy alias IDs
  'photo-1600607687644-c7171b42498b': BRAND_CONFIG.images.projectZenith,
  'photo-1502005229762-ee1b2b93e083': BRAND_CONFIG.images.luxuryInterior,
  'photo-1508873696983-2df5703bc20d': BRAND_CONFIG.images.about,
  'photo-1540518614846-7ede433c4550': BRAND_CONFIG.images.homeRes2Int1,

  // Hero & core assets
  'photo-1613490493576-7fde63acd811': BRAND_CONFIG.images.hero,
  'photo-1600607687920-4e2a09cf159d': BRAND_CONFIG.images.approachWalkway,
  'photo-1512917774080-9991f1c4c750': BRAND_CONFIG.images.about,
  'photo-1580587771525-78b9dba3b914': BRAND_CONFIG.images.serviceVilla,
  'photo-1600210492486-724fe5c67fb0': BRAND_CONFIG.images.luxuryInterior,
  'photo-1542314831-068cd1dbfeeb': BRAND_CONFIG.images.cta,
  'photo-1613977257363-707ba9348227': BRAND_CONFIG.images.authVilla,
  'photo-1600566753190-17f0baa2a6c3': BRAND_CONFIG.images.authVillaAlt,
  'photo-1600585154340-be6161a56a0c': BRAND_CONFIG.images.projectZenith,
  'photo-1600596542815-ffad4c1539a9': BRAND_CONFIG.images.fallbackVilla,
  'photo-1600585154526-990dced4db0d': BRAND_CONFIG.images.serviceAcquisition,
  'photo-1518780664697-55e3ad937233': BRAND_CONFIG.images.projectAspen,
  'photo-1600566753086-00f18fb6b3ea': BRAND_CONFIG.images.projectIronwood,

  // Home residences
  'photo-1600573472550-8090b5e0745e': BRAND_CONFIG.images.homeRes1Ext,
  'photo-1600607687939-ce8a6c25118c': BRAND_CONFIG.images.homeRes1Int1,
  'photo-1618221195710-dd6b41faaea6': BRAND_CONFIG.images.homeRes1Int2,
  'photo-1616486338812-3dadae4b4ace': BRAND_CONFIG.images.homeRes2Int1,
  'photo-1600566753376-12c8ab7fb75b': BRAND_CONFIG.images.homeRes2Int2,
  'photo-1616046229478-9901c5536a45': BRAND_CONFIG.images.homeRes3Int1,
  'photo-1617806118233-18e1de247200': BRAND_CONFIG.images.homeRes3Int2,

  // Gallery interiors & extended listings
  'photo-1507089947368-19c1da9775ae': BRAND_CONFIG.images.galleryKitchen,
  'photo-1600607687644-c7171b42498f': BRAND_CONFIG.images.galleryTerrace,
  'photo-1600566753151-384129cf4e3e': BRAND_CONFIG.images.galleryDining,
  'photo-1595526114035-0d45ed16cfbf': BRAND_CONFIG.images.galleryBedroom,
  'photo-1522708323590-d24dbb6b0267': BRAND_CONFIG.images.listingFoothills,
  'photo-1600585152220-90363fe7e115': BRAND_CONFIG.images.listingDhaModern,
  'photo-1505691938895-1758d7feb511': BRAND_CONFIG.images.listingF8Villa,
  'photo-1560448204-e02f11c3d0e2': BRAND_CONFIG.images.listingDhaCoastal,
  'photo-1599809275671-b5942cabc7a2': BRAND_CONFIG.images.listingAskari,
  'photo-1522771739844-6a9f6d5f14af': BRAND_CONFIG.images.listingGulbergApt,
  'photo-1598928506311-c55ded91a20c': BRAND_CONFIG.images.listingBahriaVilla,
  'photo-1600121848594-d8644e57abab': BRAND_CONFIG.images.listingInteriorLiving,
  'photo-1554995207-c18c203602cb': BRAND_CONFIG.images.listingInteriorLounge,

  // Buy properties
  'photo-1600047509807-ba8f99d2cdde': BRAND_CONFIG.images.buy1,
  'photo-1605276374104-dee2a0ed3cd6': BRAND_CONFIG.images.buy2,
  'photo-1545324418-cc1a3fa10c00': BRAND_CONFIG.images.buy3,
  'photo-1500382017468-9049fed747ef': BRAND_CONFIG.images.buy4,
  'photo-1513584684374-8bab748fbf90': BRAND_CONFIG.images.buy5,
  'photo-1502672260266-1c1ef2d93688': BRAND_CONFIG.images.buy6,
  'photo-1523217582562-09d0def993a6': BRAND_CONFIG.images.buy7,
  'photo-1570129477492-45c003edd2be': BRAND_CONFIG.images.buy8,
  'photo-1588880331179-bc9b93a8cb5e': BRAND_CONFIG.images.buy9,

  // Rent properties
  'photo-1512915922686-57c11dde9b6b': BRAND_CONFIG.images.rent1,
  'photo-1513694203232-719a280e022f': BRAND_CONFIG.images.rent4,
  'photo-1600566752355-35792bedcfea': BRAND_CONFIG.images.rent5,
  'photo-1512918728675-ed5a9ecdebfd': BRAND_CONFIG.images.rent6,
  'photo-1574362848149-11496d93a7c7': BRAND_CONFIG.images.rent7,
  'photo-1576941089067-2de3c901e126': BRAND_CONFIG.images.rent8,
  'photo-1567496898669-ee935f5f647a': BRAND_CONFIG.images.rent9,
  'photo-1486406146926-c627a92ad1ab': BRAND_CONFIG.images.rent10,
  'photo-1564013799919-ab600027ffc6': BRAND_CONFIG.images.rent11,
  'photo-1520250497591-112f2f40a3f4': BRAND_CONFIG.images.rent12,

  // Team & Offices
  'photo-1507003211169-0a1dd7228f2d': BRAND_CONFIG.images.team1,
  'photo-1573496359142-b8d87734a5a2': BRAND_CONFIG.images.team2,
  'photo-1500648767791-00dcc994a43e': BRAND_CONFIG.images.team3,
  'photo-1580489944761-15a19d654956': BRAND_CONFIG.images.team4,
  'photo-1589308078059-be1415eab4c3': BRAND_CONFIG.images.office1,
  'photo-1507525428034-b723cf961d3e': BRAND_CONFIG.images.office3,
  'photo-1526778548025-fa2f459cd5c1': BRAND_CONFIG.images.officeOverseas,
};

/**
 * Resolves any image path (including legacy `/stock/photo-*.jpg` or Unsplash URLs
 * already persisted in Firestore) to the canonical `/brand/...` file path.
 */
export function resolveBrandImagePath(
  src?: string | null,
  fallback: string = BRAND_CONFIG.images.fallbackVilla
): string {
  const clean = String(src || '').trim();
  if (!clean) return fallback;

  const stockMatch = clean.match(/^\/stock\/(photo-[^?.\s'"]+)\.jpg$/i);
  if (stockMatch) {
    return LEGACY_IMAGE_PATH_MAP[stockMatch[1]] || fallback;
  }

  const unsplashMatch = clean.match(/^https:\/\/images\.unsplash\.com\/(photo-[^?\s'"]+)/i);
  if (unsplashMatch) {
    return LEGACY_IMAGE_PATH_MAP[unsplashMatch[1]] || clean;
  }

  return clean;
}
