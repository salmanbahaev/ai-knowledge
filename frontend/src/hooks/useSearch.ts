/**
 * Custom hook for search functionality with debouncing and caching.
 */

import { useState, useCallback } from 'react';
import { useAsyncOperation } from './useAsyncOperation';
import { searchService } from '../services/searchService';
import { SearchResponse } from '../types/api';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const {
    data: searchResults,
    loading: searching,
    error: searchError,
    execute: executeSearch,
    clearError: clearSearchError
  } = useAsyncOperation<SearchResponse>(
    (query: string, limit?: number) => searchService.search(query, limit),
    {
      debounceMs: 300, // Debounce search requests
      onSuccess: (data) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Search completed: ${data.total_results} results for "${data.query}"`);
        }
      },
      onError: (error) => {
        console.error('❌ Search failed:', error.message);
      }
    }
  );

  const {
    loading: loadingSuggestions,
    execute: executeSuggestions
  } = useAsyncOperation<string[]>(
    (query: string) => searchService.getSuggestions(query),
    {
      debounceMs: 200, // Faster debounce for suggestions
      onSuccess: setSuggestions,
      onError: () => setSuggestions([]) // Clear suggestions on error
    }
  );

  const search = useCallback(
    async (searchQuery: string, limit = 10) => {
      if (!searchQuery.trim()) {
        return;
      }

      setQuery(searchQuery);
      await executeSearch(searchQuery, limit);
    },
    [executeSearch]
  );

  const getSuggestions = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      await executeSuggestions(searchQuery);
    },
    [executeSuggestions]
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    clearSearchError();
  }, [clearSearchError]);

  const clearCache = useCallback(() => {
    searchService.clearSearchCache();
  }, []);

  return {
    // State
    query,
    searchResults,
    suggestions,
    
    // Loading states
    searching,
    loadingSuggestions,
    
    // Errors
    searchError,
    
    // Actions
    search,
    getSuggestions,
    clearSearch,
    clearCache,
    clearSearchError,
    
    // Derived state
    hasResults: searchResults && searchResults.total_results > 0,
    hasQuery: query.trim().length > 0
  };
}
