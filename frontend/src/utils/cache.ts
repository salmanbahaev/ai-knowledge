/**
 * Smart caching system for API responses with TTL and invalidation.
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  enableDevLogs: boolean;
}

class ApiCache {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      enableDevLogs: process.env.NODE_ENV === 'development',
      ...config
    };
  }

  /**
   * Generate cache key from URL and params.
   */
  private generateKey(url: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}:${paramString}`;
  }

  /**
   * Check if cache item is expired.
   */
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * Clean up expired items and enforce size limit.
   */
  private cleanup(): void {
    // Remove expired items
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        if (this.config.enableDevLogs) {
          console.log(`🗑️ Cache expired: ${key}`);
        }
      }
    }

    // Enforce size limit (LRU - remove oldest)
    if (this.cache.size > this.config.maxSize) {
      const keysToDelete = Array.from(this.cache.keys()).slice(0, 
        this.cache.size - this.config.maxSize
      );
      keysToDelete.forEach(key => this.cache.delete(key));
    }
  }

  /**
   * Get cached data if available and not expired.
   */
  get<T>(url: string, params?: Record<string, any>): T | null {
    this.cleanup();
    
    const key = this.generateKey(url, params);
    const item = this.cache.get(key);

    if (item && !this.isExpired(item)) {
      if (this.config.enableDevLogs) {
        console.log(`💾 Cache hit: ${key}`);
      }
      return item.data;
    }

    return null;
  }

  /**
   * Store data in cache with TTL.
   */
  set<T>(url: string, data: T, params?: Record<string, any>, ttl?: number): void {
    const key = this.generateKey(url, params);
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    };

    this.cache.set(key, item);
    
    if (this.config.enableDevLogs) {
      console.log(`💾 Cache set: ${key} (TTL: ${item.ttl}ms)`);
    }

    this.cleanup();
  }

  /**
   * Invalidate specific cache entry.
   */
  invalidate(url: string, params?: Record<string, any>): void {
    const key = this.generateKey(url, params);
    this.cache.delete(key);
    
    if (this.config.enableDevLogs) {
      console.log(`🗑️ Cache invalidated: ${key}`);
    }
  }

  /**
   * Invalidate all cache entries matching URL pattern.
   */
  invalidatePattern(pattern: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(pattern)
    );
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (this.config.enableDevLogs) {
      console.log(`🗑️ Cache pattern invalidated: ${pattern} (${keysToDelete.length} items)`);
    }
  }

  /**
   * Clear all cache.
   */
  clear(): void {
    this.cache.clear();
    
    if (this.config.enableDevLogs) {
      console.log('🗑️ Cache cleared');
    }
  }

  /**
   * Get cache statistics.
   */
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }
}

// Global cache instance
export const apiCache = new ApiCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  enableDevLogs: true
});

// Cache configurations for different endpoints
export const CACHE_CONFIGS = {
  dashboard: {
    ttl: 2 * 60 * 1000, // 2 minutes - dashboard data changes frequently
    staleWhileRevalidate: true
  },
  search: {
    ttl: 10 * 60 * 1000, // 10 minutes - search results are relatively stable
    staleWhileRevalidate: false
  },
  health: {
    ttl: 30 * 1000, // 30 seconds - health status should be fresh
    staleWhileRevalidate: false
  },
  documents: {
    ttl: 5 * 60 * 1000, // 5 minutes - document list changes moderately
    staleWhileRevalidate: true
  }
} as const;
