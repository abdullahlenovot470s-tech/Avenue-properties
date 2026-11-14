import { BRAND_CONFIG } from '../config/brand.config.ts';

/**
 * Central Image Repository
 * Backed by `BRAND_CONFIG.images` in `src/config/brand.config.ts`.
 * Replace any image in `/public/brand/` keeping the same filename to rebrand the entire site.
 */
export const IMAGES = {
  hero: {
    main: BRAND_CONFIG.images.projectZenith,
    approachWalkway: BRAND_CONFIG.images.approachWalkway,
    approachPortrait: BRAND_CONFIG.images.fallbackVilla,
    serviceVilla: BRAND_CONFIG.images.serviceAcquisition,
    ctaBackground: BRAND_CONFIG.images.cta,
    authVilla: BRAND_CONFIG.images.authVilla,
    authVillaMirrored: BRAND_CONFIG.images.authVillaAlt,
  },

  services: {
    acquisition: BRAND_CONFIG.images.serviceAcquisition,
    management: BRAND_CONFIG.images.serviceManagement,
    investment: BRAND_CONFIG.images.serviceInvestment,
  },

  portfolio: {
    aspenRetreat: BRAND_CONFIG.images.projectAspen,
    obsidianMonolith: BRAND_CONFIG.images.projectObsidian,
    zenithPavilion: BRAND_CONFIG.images.projectZenith,
    ironwoodGallery: BRAND_CONFIG.images.projectIronwood,
    reflectionResidence: BRAND_CONFIG.images.projectReflection,
  },

  pickHome: {
    residence1: {
      exterior: BRAND_CONFIG.images.homeRes1Ext,
      interior1: BRAND_CONFIG.images.homeRes1Int1,
      interior2: BRAND_CONFIG.images.homeRes1Int2,
    },
    residence2: {
      exterior: BRAND_CONFIG.images.homeRes2Ext,
      interior1: BRAND_CONFIG.images.homeRes2Int1,
      interior2: BRAND_CONFIG.images.homeRes2Int2,
    },
    residence3: {
      exterior: BRAND_CONFIG.images.homeRes3Ext,
      interior1: BRAND_CONFIG.images.homeRes3Int1,
      interior2: BRAND_CONFIG.images.homeRes3Int2,
    },
  },

  buy: {
    prop1: BRAND_CONFIG.images.buy1,
    prop2: BRAND_CONFIG.images.buy2,
    prop3: BRAND_CONFIG.images.buy3,
    prop4: BRAND_CONFIG.images.buy4,
    prop5: BRAND_CONFIG.images.buy5,
    prop6: BRAND_CONFIG.images.buy6,
    prop7: BRAND_CONFIG.images.buy7,
    prop8: BRAND_CONFIG.images.buy8,
    prop9: BRAND_CONFIG.images.buy9,
  },

  rent: {
    rent1: BRAND_CONFIG.images.rent1,
    rent2: BRAND_CONFIG.images.rent2,
    rent3: BRAND_CONFIG.images.rent3,
    rent4: BRAND_CONFIG.images.rent4,
    rent5: BRAND_CONFIG.images.rent5,
    rent6: BRAND_CONFIG.images.rent6,
    rent7: BRAND_CONFIG.images.rent7,
    rent8: BRAND_CONFIG.images.rent8,
    rent9: BRAND_CONFIG.images.rent9,
    rent10: BRAND_CONFIG.images.rent10,
    rent11: BRAND_CONFIG.images.rent11,
    rent12: BRAND_CONFIG.images.rent12,
  },

  team: {
    member1: BRAND_CONFIG.images.team1,
    member2: BRAND_CONFIG.images.team2,
    member3: BRAND_CONFIG.images.team3,
    member4: BRAND_CONFIG.images.team4,
  },

  offices: {
    office1: BRAND_CONFIG.images.office1,
    office2: BRAND_CONFIG.images.office2,
    office3: BRAND_CONFIG.images.office3,
    overseas: BRAND_CONFIG.images.officeOverseas,
  },
};
