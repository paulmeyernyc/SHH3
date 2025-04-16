/**
 * Cache Manager Module
 * 
 * Provides a unified interface for managing different cache levels.
 */

import { cacheService, CacheOptions } from './cache-service';
import { logger } from '../observability';

/**
 * Cache level enumeration
 */
export enum CacheLevel {
  MEMORY = 'memory',
  REDIS = 'redis',
  ALL = 'all'
}

/**
 * Cache manager for controlling multiple cache levels
 */
export class CacheManager {
  private redisUrl?: string;
  
  /**
   * Create a new cache manager
   */
  constructor(redisUrl?: string) {
    this.redisUrl = redisUrl;
    
    if (redisUrl) {
      logger.info('Cache manager initialized with Redis support');
    } else {
      logger.info('Cache manager initialized with memory cache only');
    }
  }
  
  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return !!this.redisUrl;
  }
  
  /**
   * Get a value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const opts = this.applyDefaultOptions(options);
    return cacheService.get<T>(key, opts);
  }
  
  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const opts = this.applyDefaultOptions(options);
    return cacheService.set(key, value, opts);
  }
  
  /**
   * Delete a value from cache
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    return cacheService.delete(key, namespace);
  }
  
  /**
   * Clear all caches (memory and Redis if available)
   */
  async clear(): Promise<boolean> {
    return cacheService.flush();
  }
  
  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string, namespace?: string): Promise<boolean> {
    return cacheService.invalidatePattern(pattern, namespace);
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return cacheService.getStats();
  }
  
  /**
   * Check the health of the cache service
   */
  async healthCheck() {
    return cacheService.healthCheck();
  }
  
  /**
   * Close the cache manager (for cleanup)
   */
  async close() {
    // Any cleanup needed
  }
  
  /**
   * Apply default options based on configuration
   */
  private applyDefaultOptions(options: CacheOptions): CacheOptions {
    const defaults: CacheOptions = {
      useMemoryCache: true,
      useRedisCache: !!this.redisUrl
    };
    
    // If level is specified, override the cache type settings
    if (options.level) {
      switch (options.level) {
        case CacheLevel.MEMORY:
          defaults.useMemoryCache = true;
          defaults.useRedisCache = false;
          break;
        case CacheLevel.REDIS:
          defaults.useMemoryCache = false;
          defaults.useRedisCache = true;
          break;
        case CacheLevel.ALL:
        default:
          defaults.useMemoryCache = true;
          defaults.useRedisCache = !!this.redisUrl;
          break;
      }
    }
    
    return { ...defaults, ...options };
  }
}