import type { NewsArticle } from '../types/index.ts';
import { BRAND_CONFIG } from '../config/brand.config.ts';

/*
 * ============================================================================
 * EXAMPLE NEWS / MARKET BRIEF ENTRY (COPY & EDIT TO PUBLISH ARTICLES)
 * ============================================================================
 *
 * const EXAMPLE_NEWS_ARTICLE: NewsArticle = {
 *   id: 'news-dha-lahore-outlook',   // Unique article ID
 *   title: '2025 DHA & Capital Property Transfer Guide',
 *   slug: 'dha-capital-property-transfer-guide',
 *   summary: 'Key verification steps for resident and overseas property buyers.',
 *   content: 'Full editorial body text...',
 *   category: 'Market Advisory',
 *   publishedAt: '2025-02-15',       // YYYY-MM-DD
 *   author: BRAND_CONFIG.team[0].name,
 *   image: BRAND_CONFIG.images.hero,
 * };
 * ============================================================================
 */

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'news-title-verification-guide',
    title: 'Essential Property Title & Transfer Verification Checklist',
    slug: 'essential-property-title-transfer-verification-checklist',
    summary: `How ${BRAND_CONFIG.identity.brandShortName} audits society allotments, fard records, and tax filings prior to buyer commitment.`,
    content: `Securing a residential or investment holding across major housing authorities requires methodical document verification prior to token money or bayana execution. Our advisory team inspects original allotment letters, clearance of society development charges, and up-to-date property tax receipts before recommending any asset.`,
    category: 'Legal & Advisory',
    publishedAt: '2025-02-10',
    author: BRAND_CONFIG.team[3]?.name || BRAND_CONFIG.identity.brandShortName,
    image: BRAND_CONFIG.images.approachWalkway,
  },
];
