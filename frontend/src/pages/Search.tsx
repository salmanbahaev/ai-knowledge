import React, { useState } from 'react';
import { Search as SearchIcon, Filter, FileText, Calendar, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { searchService } from '../services/searchService';
import { SearchResult } from '../types/api';



export const Search: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResponse = await searchService.search(query);
      setResults(searchResponse.results);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      pdf: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      docx: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      txt: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      pptx: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
    };
    return colors[type as keyof typeof colors] || colors.txt;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="responsive-margin">
        <h1 className="responsive-title text-gray-900 dark:text-white">{t('search.title')}</h1>
        <p className="responsive-subtitle text-gray-600 dark:text-gray-400">
          {t('search.subtitle')}
        </p>
      </div>

      {/* Search Bar */}
      <div className="responsive-card">
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              className="w-full pl-9 sm:pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg 
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white mobile-text
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         transition-colors duration-200 min-h-[44px]"
            />
          </div>
          <button className="i18n-secondary-button responsive-button">
            <div className="i18n-button-content">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </div>
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Search Results
              </h2>
              {!isLoading && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-gray-600 dark:text-gray-400">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              results.map((result) => (
                <div key={result.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getFileIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                          {result.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(result.type)}`}>
                          {result.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                        {result.content}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{result.author}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(result.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {result.tags.map((tag: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : searchQuery ? (
              <div className="p-8 text-center">
                <SearchIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No results found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try different keywords or check your spelling.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
