/**
 * Compact language switcher for mobile navbar
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

export const CompactLanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ru' : 'en';
    i18n.changeLanguage(newLang);
  };

  const currentLang = i18n.language === 'ru' ? 'RU' : 'EN';
  const nextLang = i18n.language === 'ru' ? 'EN' : 'RU';

  return (
    <button
      onClick={toggleLanguage}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 touch-target"
      aria-label={`Switch to ${nextLang}`}
      title={`Switch to ${nextLang}`}
    >
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 min-w-[20px] block">
        {currentLang}
      </span>
    </button>
  );
};





