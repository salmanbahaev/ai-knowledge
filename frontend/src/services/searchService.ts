/**
 * Search API service with intelligent caching.
 */

import { cachedApi, getCacheConfig } from './cachedApiClient';
import { ApiResponse, SearchResponse, SearchRequest } from '../types/api';

export const searchService = {
  /**
   * Search documents with caching for repeated queries.
   */
  async search(query: string, limit = 10): Promise<SearchResponse> {
    const request: SearchRequest = { query, limit };
    const cacheConfig = getCacheConfig('search');
    
    // For search, we use POST but cache based on query parameters
    const cacheKey = `search:${query}:${limit}`;
    
    // Check cache first
    const cached = cachedApi.get<ApiResponse<SearchResponse>>(
      '/search',
      {
        useCache: true,
        cacheTTL: cacheConfig.ttl,
        cacheKey,
        staleWhileRevalidate: false // Search results should be exact
      }
    );

    if (cached) {
      return (cached as any).data;
    }

    // Make fresh request
    const response = await cachedApi.post<ApiResponse<SearchResponse>>('/search', request);
    
    // Manually cache the POST response
    const apiCache = await import('../utils/cache').then(m => m.apiCache);
    apiCache.set(cacheKey, response, {}, cacheConfig.ttl);
    
    return response.data;
  },

  /**
   * Get search suggestions with short-term caching.
   */
  async getSuggestions(query: string): Promise<string[]> {
    try {
      const response = await cachedApi.get<ApiResponse<string[]>>(
        `/search/suggestions`,
        {
          params: { q: query },
          useCache: true,
          cacheTTL: 30 * 1000, // 30 seconds for suggestions
        }
      );
      return response.data;
    } catch (error) {
      // Fallback to empty array if suggestions not available
      return [];
    }
  },

  /**
   * Clear search cache (useful when new documents are added).
   */
  clearSearchCache(): void {
    cachedApi.invalidateCache('search');
  }
};
