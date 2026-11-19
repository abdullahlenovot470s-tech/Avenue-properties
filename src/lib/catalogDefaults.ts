import { BRAND_CONFIG } from '../config/brand.config';
import type { ClientReview, FaqItem } from '../types';

const DEFAULT_FAQ_CATEGORIES = ['Title & Legal', 'Overseas Buyers', 'Pricing & Taxes'];

export function getDefaultFaqs(): FaqItem[] {
  return BRAND_CONFIG.copy.faqs.map((faq, idx) => ({
    id: `faq-${idx + 1}`,
    question: faq.question,
    answer: faq.answer,
    category: DEFAULT_FAQ_CATEGORIES[idx] || 'General Advisory',
  }));
}

export function getDefaultReviews(): ClientReview[] {
  return BRAND_CONFIG.copy.testimonials.map((review) => ({
    id: review.id,
    quote: review.quote,
    author: review.author,
    role: review.role,
    location: review.location,
    propertyContext: review.propertyContext,
    rating: review.rating,
    date: review.date,
  }));
}
