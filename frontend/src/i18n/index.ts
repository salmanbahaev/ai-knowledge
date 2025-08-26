/**
 * i18n configuration for internationalization
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from '../locales/en/common.json';
import ruTranslations from '../locales/ru/common.json';

const resources = {
  en: {
    common: enTranslations,
  },
  ru: {
    common: ruTranslations,
  },
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en', // Default language
    debug: process.env.NODE_ENV === 'development',
    
    // Namespace configuration
    defaultNS: 'common',
    ns: ['common'],
    
    // Interpolation configuration
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    // React specific options
    react: {
      useSuspense: false,
    },
  });

export default i18n;


