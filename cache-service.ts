/**
 * Cache Service Module
 * 
 * Provides a multi-level caching system with Redis as the distributed cache
 * and an in-memory cache for frequently accessed data.
 */

import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { logger } from '../observability';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  useMemoryCache?: boolean; // Whether to use memory cache as first level
  useRedisCache?: boolean; // Whether to use Redis cache as second level
  namespace?: string; // Cache namespace for key isolation
  level?: string; // Cache level (for use with CacheLevel enum)
  edgeCache?: {
    maxAge?: number;
    sMaxAge?: number;
    staleWhileRevalidate?: number;
    private?: boolean;
    immutable?: boolean;
  }
}

const defaultOptions: CacheOptions = {
  ttl: 300, // 5 minutes
  useMemoryCache: true,
  useRedisCache: false
};

/**
 * Cache Service class for multi-level caching
 */
export class CacheService {
  private redisClient: Redis | null = null;
  private memoryCache: NodeCache;
  private isRedisConnected: boolean = false;

  constructor() {
    // Initialize memory cache
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false // Don't clone objects (better performance)
    });

    // Initialize Redis client if URL is provided
    const redisUrl = process.env.REDIS_URL || 
                    process.env.REDISCLOUD_URL || 
                    process.env.REDISTOGO_URL;
    
    if (redisUrl) {
      try {
        this.redisClient = new Redis(redisUrl);
        
        this.redisClient.on('connect', () => {
          this.isRedisConnected = true;
          logger.info('Redis cache connected');
        });
        
        this.redisClient.on('error', (err) => {
          this.isRedisConnected = false;
          logger.error('Redis cache error', {
            error: err.message
          });
        });
        
        this.redisClient.on('close', () => {
          this.isRedisConnected = false;
          logger.info('Redis cache connection closed');
        });
      } catch (error) {
        logger.warn('Failed to initialize Redis cache', {
          error: (error as Error).message
        });
        this.redisClient = null;
      }
    } else {
      logger.info('Redis URL not provided, using memory cache only');
      this.redisClient = null;
    }
  }

  /**
   * Generate a cache key with optional namespace
   */
  private generateKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  /**
   * Get a value from cache (tries memory first, then Redis)
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const opts = { ...defaultOptions, ...options };
    const cacheKey = this.generateKey(key, opts.namespace);
    
    try {
      // Try memory cache first if enabled
      if (opts.useMemoryCache) {
        const memValue = this.memoryCache.get<T>(cacheKey);
        if (memValue !== undefined) {
          logger.debug('Memory cache hit', { key: cacheKey });
          return memValue;
        }
      }
      
      // Try Redis if enabled and connected
      if (opts.useRedisCache && this.redisClient && this.isRedisConnected) {
        const redisValue = await this.redisClient.get(cacheKey);
        if (redisValue) {
          logger.debug('Redis cache hit', { key: cacheKey });
          try {
            const parsed = JSON.parse(redisValue) as T;
            
            // Store in memory cache for faster subsequent access
            if (opts.useMemoryCache) {
              this.memoryCache.set(cacheKey, parsed, opts.ttl || defaultOptions.ttl);
            }
            
            return parsed;
          } catch (error) {
            logger.warn('Failed to parse Redis cache value', { 
              key: cacheKey,
              error: (error as Error).message
            });
            return null;
          }
        }
      }
      
      logger.debug('Cache miss', { key: cacheKey });
      return null;
    } catch (error) {
      logger.error('Error getting from cache', { 
        key: cacheKey,
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Set a value in cache (both memory and Redis if enabled)
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const opts = { ...defaultOptions, ...options };
    const cacheKey = this.generateKey(key, opts.namespace);
    
    try {
      // Set in memory cache if enabled
      if (opts.useMemoryCache) {
        this.memoryCache.set(cacheKey, value, opts.ttl || defaultOptions.ttl);
      }
      
      // Set in Redis if enabled and connected
      if (opts.useRedisCache && this.redisClient && this.isRedisConnected) {
        const valueStr = JSON.stringify(value);
        if (opts.ttl) {
          await this.redisClient.setex(cacheKey, opts.ttl, valueStr);
        } else {
          await this.redisClient.set(cacheKey, valueStr);
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error setting cache', { 
        key: cacheKey,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Delete a value from cache (both memory and Redis)
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    const cacheKey = this.generateKey(key, namespace);
    
    try {
      // Delete from memory cache
      this.memoryCache.del(cacheKey);
      
      // Delete from Redis if connected
      if (this.redisClient && this.isRedisConnected) {
        await this.redisClient.del(cacheKey);
      }
      
      return true;
    } catch (error) {
      logger.error('Error deleting from cache', { 
        key: cacheKey,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Invalidate all keys matching a pattern (useful for cache invalidation by type)
   */
  async invalidatePattern(pattern: string, namespace?: string): Promise<boolean> {
    const patternKey = namespace ? `${namespace}:${pattern}*` : `${pattern}*`;
    
    try {
      // Invalidate from memory cache (iterate all keys and check for match)
      const memKeys = this.memoryCache.keys();
      for (const key of memKeys) {
        if (key.startsWith(pattern) || (namespace && key.startsWith(`${namespace}:${pattern}`))) {
          this.memoryCache.del(key);
        }
      }
      
      // Invalidate from Redis if connected
      if (this.redisClient && this.isRedisConnected) {
        const redisKeys = await this.redisClient.keys(patternKey);
        if (redisKeys.length > 0) {
          await this.redisClient.del(...redisKeys);
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error invalidating cache pattern', { 
        pattern: patternKey,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Clear all cache data (use with caution)
   */
  async flush(): Promise<boolean> {
    try {
      // Clear memory cache
      this.memoryCache.flushAll();
      
      // Clear Redis if connected
      if (this.redisClient && this.isRedisConnected) {
        await this.redisClient.flushdb();
      }
      
      return true;
    } catch (error) {
      logger.error('Error flushing cache', { 
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memStats = this.memoryCache.getStats();
    return {
      memory: {
        keys: this.memoryCache.keys().length,
        hits: memStats.hits,
        misses: memStats.misses,
        ksize: memStats.ksize,
        vsize: memStats.vsize
      },
      redis: {
        connected: this.isRedisConnected
      }
    };
  }

  /**
   * Health check method for the cache service
   */
  async healthCheck(): Promise<{status: string, details: any}> {
    const memoryStatus = {
      available: true,
      stats: this.memoryCache.getStats()
    };
    
    let redisStatus = {
      available: false,
      connected: false
    };
    
    if (this.redisClient) {
      redisStatus.available = true;
      redisStatus.connected = this.isRedisConnected;
      
      if (this.isRedisConnected) {
        try {
          await this.redisClient.ping();
          redisStatus = {
            ...redisStatus,
            ping: 'success'
          };
        } catch (error) {
          redisStatus = {
            ...redisStatus,
            ping: 'failed',
            error: (error as Error).message
          };
        }
      }
    }
    
    const status = memoryStatus.available && 
      (!redisStatus.available || redisStatus.connected) ? 'healthy' : 'degraded';
    
    return {
      status,
      details: {
        memory: memoryStatus,
        redis: redisStatus
      }
    };
  }
}

export const cacheService = new CacheService();