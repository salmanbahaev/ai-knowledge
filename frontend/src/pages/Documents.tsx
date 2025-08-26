import React from 'react';
import { FileText, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Documents: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white i18n-card-title">{t('documents.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('documents.subtitle')}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="i18n-center-content">
          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white i18n-card-title">
            {t('documents.management.title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('documents.management.description')}
          </p>
          <div className="documents-buttons flex flex-col gap-3 mt-6 w-full max-w-sm mx-auto">
            <button className="i18n-enhanced-button">
              <div className="i18n-button-content">
                <FileText className="w-4 h-4 i18n-button-icon" />
                <span>{t('documents.actions.browse')}</span>
              </div>
            </button>
            <button className="i18n-secondary-button">
              <div className="i18n-button-content">
                <Upload className="w-4 h-4 i18n-button-icon" />
                <span>{t('documents.actions.uploadNew')}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
