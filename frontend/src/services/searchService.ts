/**
 * Search API service.
 */

import { api } from './api';
import { ApiResponse, SearchResponse, SearchRequest } from '../types/api';

export const searchService = {
  /**
   * Search documents using GET request.
   */
  async search(
    query: string, 
    typeFilter?: string, 
    limit = 20, 
    offset = 0
  ): Promise<SearchResponse> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    if (typeFilter) {
      params.append('type_filter', typeFilter);
    }
    
    const response = await api.get<ApiResponse<SearchResponse>>(`/search?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Advanced search using POST request.
   */
  async advancedSearch(request: SearchRequest): Promise<SearchResponse> {
    const response = await api.post<ApiResponse<SearchResponse>>('/search', request);
    return response.data.data;
  }
};
