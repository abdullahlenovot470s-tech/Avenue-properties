import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BRAND_CONFIG } from '../config/brand.config';
import { URGLISH_COPY } from '../data/urglishTranslations';

export type DescriptionLanguage = 'en' | 'urglish';

interface LanguageContextType {
  language: DescriptionLanguage;
  isUrglish: boolean;
  setLanguage: (lang: DescriptionLanguage) => void;
  toggleLanguage: () => void;
  t: (enText: string, urglishText?: string) => string;
  getServiceCardDescription: (id: string, fallback: string) => string;
  getPortfolioSummary: (id: string, fallback: string) => string;
  getPropertyDescription: (id: string, fallback: string) => string;
  getPropertyExtendedStory: (id: string, fallback?: string) => string;
  getServiceOfferedCopy: (
    id: string,
    fallback: { description: string; expandedDetails: string[]; deliverables?: string[] }
  ) => { description: string; expandedDetails: string[]; deliverables?: string[] };
  getBuyDescription: (id: string, fallback: string) => string;
  getRentalDescription: (id: string, fallback: string) => string;
  getTeamBio: (name: string, fallback: string) => string;
  getFaqCopy: (faq: { id: string; question: string; answer: string }) => {
    question: string;
    answer: string;
  };
}

const STORAGE_KEY = `${BRAND_CONFIG.identity.storageKeyPrefix}-description-language`;

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function readStoredLanguage(): DescriptionLanguage {
  if (!BRAND_CONFIG.features.enableUrglishToggle || typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'urglish' ? 'urglish' : 'en';
  } catch {
    return 'en';
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const urglishEnabled = BRAND_CONFIG.features.enableUrglishToggle;
  const [language, setLanguageState] = useState<DescriptionLanguage>(() => readStoredLanguage());

  const setLanguage = useCallback(
    (lang: DescriptionLanguage) => {
      const resolved: DescriptionLanguage = urglishEnabled ? lang : 'en';
      setLanguageState(resolved);
      try {
        window.localStorage.setItem(STORAGE_KEY, resolved);
      } catch {
        // Ignore storage failures in restricted browsing modes
      }
    },
    [urglishEnabled]
  );

  const toggleLanguage = useCallback(() => {
    if (!urglishEnabled) return;
    setLanguage(language === 'en' ? 'urglish' : 'en');
  }, [urglishEnabled, language, setLanguage]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.descriptionLanguage = language;
    }
  }, [language]);

  const isUrglish = language === 'urglish';

  const t = useCallback(
    (enText: string, urglishText?: string) => {
      if (!isUrglish || !urglishText) return enText;
      return urglishText;
    },
    [isUrglish]
  );

  const getServiceCardDescription = useCallback(
    (id: string, fallback: string) => {
      if (!isUrglish) return fallback;
      return URGLISH_COPY.servicesSection.cardDescriptions[id] || fallback;
    },
    [isUrglish]
  );

  const getPortfolioSummary = useCallback(
    (id: string, fallback: string) => {
      if (!isUrglish) return fallback;
      return URGLISH_COPY.portfolioSummaries[id] || fallback;
    },
    [isUrglish]
  );

  const getPropertyDescription = useCallback(
    (id: string, fallback: string) => {
      if (!isUrglish) return fallback;
      return URGLISH_COPY.propertyListings[id]?.description || fallback;
    },
    [isUrglish]
  );

  const getPropertyExtendedStory = useCallback(
    (id: string, fallback?: string) => {
      if (!isUrglish) return fallback || '';
      return (
        URGLISH_COPY.propertyListings[id]?.extendedStory ||
        URGLISH_COPY.propertyListings[id]?.description ||
        URGLISH_COPY.portfolioSummaries[id] ||
        fallback ||
        ''
      );
    },
    [isUrglish]
  );

  const getServiceOfferedCopy = useCallback(
    (
      id: string,
      fallback: { description: string; expandedDetails: string[]; deliverables?: string[] }
    ) => {
      if (!isUrglish) return fallback;
      const localized = URGLISH_COPY.servicesOffered[id];
      if (!localized) return fallback;
      return {
        description: localized.description || fallback.description,
        expandedDetails: localized.expandedDetails || fallback.expandedDetails,
        deliverables: localized.deliverables || fallback.deliverables,
      };
    },
    [isUrglish]
  );

  const getBuyDescription = useCallback(
    (id: string, fallback: string) => {
      if (!isUrglish) return fallback;
      return URGLISH_COPY.buyDescriptions[id] || fallback;
    },
    [isUrglish]
  );

  const getRentalDescription = useCallback(
    (id: string, fallback: string) => {
      if (!isUrglish) return fallback;
      return URGLISH_COPY.rentalDescriptions[id] || fallback;
    },
    [isUrglish]
  );

  const getTeamBio = useCallback(
    (name: string, fallback: string) => {
      if (!isUrglish) return fallback;
      return URGLISH_COPY.teamBios[name] || fallback;
    },
    [isUrglish]
  );

  const getFaqCopy = useCallback(
    (faq: { id: string; question: string; answer: string }) => {
      if (!isUrglish) return { question: faq.question, answer: faq.answer };
      const byId = URGLISH_COPY.faqsById[faq.id];
      if (byId) return byId;
      const byQuestion = URGLISH_COPY.faqsByQuestion[faq.question];
      if (byQuestion) return byQuestion;
      return { question: faq.question, answer: faq.answer };
    },
    [isUrglish]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        isUrglish,
        setLanguage,
        toggleLanguage,
        t,
        getServiceCardDescription,
        getPortfolioSummary,
        getPropertyDescription,
        getPropertyExtendedStory,
        getServiceOfferedCopy,
        getBuyDescription,
        getRentalDescription,
        getTeamBio,
        getFaqCopy,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
