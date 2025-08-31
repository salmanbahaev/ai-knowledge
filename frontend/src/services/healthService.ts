/**
 * Health check API service for monitoring backend status.
 */

import { cachedApi, getCacheConfig } from './cachedApiClient';

export interface ServiceHealth {
  status: string;
  message: string;
  details?: Record<string, any>;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    application: ServiceHealth;
  };
  uptime_seconds: number;
}

export const healthService = {
  /**
   * Get overall health status with short-term caching and quick retry.
   */
  async getHealth(): Promise<HealthResponse> {
    const cacheConfig = getCacheConfig('health');
    
    return await cachedApi.get<HealthResponse>('/health/', {
      useCache: true,
      cacheTTL: cacheConfig.ttl,
      staleWhileRevalidate: false, // Health status should be current
      retryConfig: 'quick' // Fast retry for health checks
    });
  },

  /**
   * Get database health status.
   */
  async getDatabaseHealth(): Promise<ServiceHealth> {
    const cacheConfig = getCacheConfig('health');
    
    return await cachedApi.get<ServiceHealth>('/health/database', {
      useCache: true,
      cacheTTL: cacheConfig.ttl,
    });
  },

  /**
   * Get cache health status.
   */
  async getCacheHealth(): Promise<ServiceHealth> {
    const cacheConfig = getCacheConfig('health');
    
    return await cachedApi.get<ServiceHealth>('/health/cache', {
      useCache: true,
      cacheTTL: cacheConfig.ttl,
    });
  },

  /**
   * Check if backend is reachable and healthy.
   */
  async isBackendHealthy(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      return health.status === 'healthy';
    } catch (error) {
      return false;
    }
  },

  /**
   * Force refresh health status.
   */
  async refreshHealth(): Promise<HealthResponse> {
    cachedApi.invalidateCache('health');
    return this.getHealth();
  }
};
