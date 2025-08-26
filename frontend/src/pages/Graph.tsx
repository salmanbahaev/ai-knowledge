import React from 'react';
import { Network, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Graph: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white i18n-card-title">{t('graph.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('graph.subtitle')}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="i18n-center-content">
          <Network className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white i18n-card-title">
            {t('graph.coming.title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('graph.coming.description')}
          </p>
          <button className="i18n-secondary-button px-6 py-3 text-sm">
            <div className="i18n-button-content">
              <Network className="w-4 h-4 i18n-button-icon" />
              <span>Explore Graph</span>
            </div>
          </button>
          <div className="flex items-center justify-center space-x-2 text-sm text-primary-600 dark:text-primary-400 mt-4">
            <Zap className="w-4 h-4" />
            <span>{t('graph.coming.powered')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
