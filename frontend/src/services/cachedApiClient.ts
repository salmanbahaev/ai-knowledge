/**
 * Enhanced API client with intelligent caching and error handling.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiCache, CACHE_CONFIGS } from '../utils/cache';
import { withRetry, handleApiError, RETRY_CONFIGS } from '../utils/errorHandler';

interface CachedRequestConfig extends AxiosRequestConfig {
  useCache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
  staleWhileRevalidate?: boolean;
  retryConfig?: keyof typeof RETRY_CONFIGS | false;
}

class CachedApiClient {
  private client: AxiosInstance;
  private backgroundRefreshPromises = new Map<string, Promise<any>>();

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp for request tracking
        (config as any)._requestTime = Date.now();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const requestTime = (response.config as any)._requestTime;
        const duration = Date.now() - requestTime;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🌐 API ${response.config.method?.toUpperCase()}: ${response.config.url} (${duration}ms)`);
        }
        
        return response;
      },
      (error) => {
        const status = error.response?.status;
        const url = error.config?.url;
        
        if (process.env.NODE_ENV === 'development') {
          console.error(`❌ API Error: ${url} - ${status || 'Network Error'}`);
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request with intelligent caching and retry logic.
   */
  async get<T>(
    url: string, 
    config: CachedRequestConfig = {}
  ): Promise<T> {
    const {
      useCache = true,
      cacheTTL,
      cacheKey,
      staleWhileRevalidate = false,
      retryConfig = 'standard',
      ...axiosConfig
    } = config;

    // Check cache first
    if (useCache) {
      const cached = apiCache.get<T>(cacheKey || url, axiosConfig.params);
      
      if (cached) {
        // If stale-while-revalidate, start background refresh
        if (staleWhileRevalidate) {
          this.refreshInBackground(url, axiosConfig, cacheTTL, cacheKey);
        }
        return cached;
      }
    }

    // Make fresh request with retry logic
    const requestOperation = async () => {
      try {
        const response = await this.client.get<T>(url, axiosConfig);
        return response.data;
      } catch (error) {
        throw handleApiError(error, {
          url,
          method: 'GET'
        });
      }
    };

    const result = retryConfig === false 
      ? await requestOperation()
      : await withRetry(requestOperation, RETRY_CONFIGS[retryConfig], { url, method: 'GET' });
    
    // Cache the response
    if (useCache) {
      apiCache.set(cacheKey || url, result, axiosConfig.params, cacheTTL);
    }
    
    return result;
  }

  /**
   * POST request with retry logic and cache invalidation.
   */
  async post<T>(
    url: string, 
    data?: any, 
    config: CachedRequestConfig = {}
  ): Promise<T> {
    const { retryConfig = 'standard', ...axiosConfig } = config;

    const requestOperation = async () => {
      try {
        const response = await this.client.post<T>(url, data, axiosConfig);
        return response.data;
      } catch (error) {
        throw handleApiError(error, {
          url,
          method: 'POST'
        });
      }
    };

    const result = retryConfig === false 
      ? await requestOperation()
      : await withRetry(requestOperation, RETRY_CONFIGS[retryConfig], { url, method: 'POST' });
    
    // Invalidate related cache entries
    this.invalidateRelatedCache(url);
    
    return result;
  }

  /**
   * PUT request with retry logic and cache invalidation.
   */
  async put<T>(
    url: string, 
    data?: any, 
    config: CachedRequestConfig = {}
  ): Promise<T> {
    const { retryConfig = 'standard', ...axiosConfig } = config;

    const requestOperation = async () => {
      try {
        const response = await this.client.put<T>(url, data, axiosConfig);
        return response.data;
      } catch (error) {
        throw handleApiError(error, {
          url,
          method: 'PUT'
        });
      }
    };

    const result = retryConfig === false 
      ? await requestOperation()
      : await withRetry(requestOperation, RETRY_CONFIGS[retryConfig], { url, method: 'PUT' });
    
    // Invalidate related cache entries
    this.invalidateRelatedCache(url);
    
    return result;
  }

  /**
   * DELETE request with retry logic and cache invalidation.
   */
  async delete<T>(url: string, config: CachedRequestConfig = {}): Promise<T> {
    const { retryConfig = 'standard', ...axiosConfig } = config;

    const requestOperation = async () => {
      try {
        const response = await this.client.delete<T>(url, axiosConfig);
        return response.data;
      } catch (error) {
        throw handleApiError(error, {
          url,
          method: 'DELETE'
        });
      }
    };

    const result = retryConfig === false 
      ? await requestOperation()
      : await withRetry(requestOperation, RETRY_CONFIGS[retryConfig], { url, method: 'DELETE' });
    
    // Invalidate related cache entries
    this.invalidateRelatedCache(url);
    
    return result;
  }

  /**
   * Refresh data in background for stale-while-revalidate.
   */
  private refreshInBackground(
    url: string, 
    config: AxiosRequestConfig, 
    cacheTTL?: number,
    cacheKey?: string
  ): void {
    const key = cacheKey || url;
    
    // Prevent multiple background requests for same resource
    if (this.backgroundRefreshPromises.has(key)) {
      return;
    }

    const promise = this.client.get(url, config)
      .then(response => {
        apiCache.set(key, response.data, config.params, cacheTTL);
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Background refresh completed: ${key}`);
        }
      })
      .catch(error => {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ Background refresh failed: ${key}`, error.message);
        }
      })
      .finally(() => {
        this.backgroundRefreshPromises.delete(key);
      });

    this.backgroundRefreshPromises.set(key, promise);
  }

  /**
   * Invalidate cache entries related to the URL.
   */
  private invalidateRelatedCache(url: string): void {
    // Extract base endpoint
    const baseEndpoint = url.split('/')[1]; // e.g., 'search', 'dashboard'
    
    // Invalidate related patterns
    apiCache.invalidatePattern(baseEndpoint);
  }

  /**
   * Manually invalidate cache for specific endpoint.
   */
  invalidateCache(pattern: string): void {
    apiCache.invalidatePattern(pattern);
  }

  /**
   * Clear all cache.
   */
  clearCache(): void {
    apiCache.clear();
  }

  /**
   * Get cache statistics.
   */
  getCacheStats() {
    return apiCache.getStats();
  }
}

// Create global cached API client
const baseURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000/api/v1';
export const cachedApi = new CachedApiClient(baseURL);

// Helper function to get cache configuration for endpoint
export function getCacheConfig(endpoint: string) {
  const endpointKey = Object.keys(CACHE_CONFIGS).find(key => 
    endpoint.includes(key)
  ) as keyof typeof CACHE_CONFIGS;
  
  return endpointKey ? CACHE_CONFIGS[endpointKey] : {
    ttl: 5 * 60 * 1000, // Default 5 minutes
    staleWhileRevalidate: false
  };
}
