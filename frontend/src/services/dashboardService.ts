/**
 * Dashboard API service with caching.
 */

import { cachedApi, getCacheConfig } from './cachedApiClient';
import { ApiResponse, DashboardData } from '../types/api';

export const dashboardService = {
  /**
   * Get dashboard statistics with smart caching.
   */
  async getStats(): Promise<DashboardData> {
    const cacheConfig = getCacheConfig('dashboard');
    
    const response = await cachedApi.get<ApiResponse<DashboardData>>(
      '/dashboard/stats',
      {
        useCache: true,
        cacheTTL: cacheConfig.ttl,
        staleWhileRevalidate: cacheConfig.staleWhileRevalidate
      }
    );
    
    return response.data;
  },

  /**
   * Force refresh dashboard data.
   */
  async refreshStats(): Promise<DashboardData> {
    // Invalidate cache first
    cachedApi.invalidateCache('dashboard');
    
    // Get fresh data
    return this.getStats();
  }
};
