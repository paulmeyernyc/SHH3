/**
 * Rate Limiting Middleware for Integration Gateway
 * 
 * Provides multiple strategies for rate limiting API requests:
 * - IP-based rate limiting
 * - User-based rate limiting
 * - API key-based rate limiting
 * - Route-specific rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { SQL, eq } from 'drizzle-orm';
import { db } from '../db';
import { logger, LogLevel } from './logging-middleware';
import { RateLimitError } from './error-middleware';

// Rate limit defaults
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute window
const DEFAULT_IP_RATE_LIMIT = 100; // 100 requests per minute
const DEFAULT_USER_RATE_LIMIT = 1000; // 1000 requests per minute
const DEFAULT_API_KEY_RATE_LIMIT = 2000; // 2000 requests per minute
const SENSITIVE_ROUTE_RATE_LIMIT = 20; // 20 requests per minute
const FILE_UPLOAD_RATE_LIMIT = 10; // 10 requests per minute
const SEARCH_RATE_LIMIT = 50; // 50 requests per minute

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * Configuration for rate limiting
 */
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response, next: NextFunction, options: RateLimitConfig) => void;
}

/**
 * Abstract class for rate limiters
 */
abstract class RateLimiter {
  protected config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      windowMs: config.windowMs || DEFAULT_WINDOW_MS,
      maxRequests: config.maxRequests || DEFAULT_IP_RATE_LIMIT,
      keyPrefix: config.keyPrefix || 'rl',
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      handler: config.handler || this.defaultHandler,
    };
  }

  /**
   * Default key generator based on IP address
   */
  protected defaultKeyGenerator(req: Request): string {
    return req.ip || req.connection.remoteAddress || '127.0.0.1';
  }

  /**
   * Default rate limit exceeded handler
   */
  protected defaultHandler(req: Request, res: Response, next: NextFunction, options: RateLimitConfig): void {
    const resetTime = new Date(Date.now() + options.windowMs);
    const err = new RateLimitError('Too many requests, please try again later.', {
      limit: options.maxRequests,
      resetTime: resetTime.toISOString(),
      windowMs: options.windowMs
    });
    next(err);
  }

  /**
   * Get the rate limit key for the request
   */
  protected getKey(req: Request): string {
    const key = this.config.keyGenerator!(req);
    return `${this.config.keyPrefix}:${key}`;
  }

  /**
   * Check if a request should be rate limited
   */
  abstract check(req: Request, res: Response, next: NextFunction): Promise<void>;

  /**
   * Increment the request count for a key
   */
  abstract increment(key: string): Promise<RateLimitRecord>;

  /**
   * Reset the request count for a key
   */
  abstract reset(key: string): Promise<void>;

  /**
   * Get rate limit info for a key
   */
  abstract get(key: string): Promise<RateLimitRecord | null>;
}

/**
 * In-memory implementation of rate limiting
 */
class MemoryRateLimiter extends RateLimiter {
  private cache: NodeCache;

  constructor(config: Partial<RateLimitConfig> = {}) {
    super(config);
    this.cache = new NodeCache({
      stdTTL: Math.ceil(this.config.windowMs / 1000),
      checkperiod: Math.ceil(this.config.windowMs / 10000),
    });
  }

  /**
   * Check if a request should be rate limited
   */
  async check(req: Request, res: Response, next: NextFunction): Promise<void> {
    const key = this.getKey(req);
    
    try {
      const record = await this.increment(key);
      
      // Set headers
      res.setHeader('X-RateLimit-Limit', this.config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.maxRequests - record.count).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());
      
      // Check if limit is exceeded
      if (record.count > this.config.maxRequests) {
        return this.config.handler!(req, res, next, this.config);
      }
      
      // Only count successful requests if configured
      if (this.config.skipSuccessfulRequests) {
        const originalEnd = res.end;
        res.end = function(this: Response, ...args: any[]): Response {
          if (res.statusCode < 400) {
            // Decrement the counter for successful responses
            const limiter = this as unknown as MemoryRateLimiter;
            const record = limiter.cache.get(key) as RateLimitRecord | undefined;
            if (record && record.count > 0) {
              record.count--;
              limiter.cache.set(key, record);
            }
          }
          return originalEnd.apply(this, args);
        };
      }
      
      next();
    } catch (err) {
      next(err);
    }
  }

  /**
   * Increment the request count for a key
   */
  async increment(key: string): Promise<RateLimitRecord> {
    let record = this.cache.get(key) as RateLimitRecord | undefined;
    const now = Date.now();
    
    if (!record) {
      record = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
    }
    
    // If the window has expired, reset the counter
    if (now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
    }
    
    record.count++;
    this.cache.set(key, record);
    
    return record;
  }

  /**
   * Reset the request count for a key
   */
  async reset(key: string): Promise<void> {
    this.cache.del(key);
  }

  /**
   * Get rate limit info for a key
   */
  async get(key: string): Promise<RateLimitRecord | null> {
    return (this.cache.get(key) as RateLimitRecord) || null;
  }
}

/**
 * Redis implementation of rate limiting
 */
class RedisRateLimiter extends RateLimiter {
  private client: Redis;
  private isConnected: boolean = false;

  constructor(config: Partial<RateLimitConfig> = {}, redisUrl?: string) {
    super(config);
    
    if (!redisUrl) {
      redisUrl = process.env.REDIS_URL;
    }
    
    if (!redisUrl) {
      throw new Error('Redis URL is required for RedisRateLimiter');
    }
    
    this.client = new Redis(redisUrl);
    
    this.client.on('connect', () => {
      this.isConnected = true;
      logger(LogLevel.INFO, 'Redis rate limiter connected');
    });
    
    this.client.on('error', (err) => {
      this.isConnected = false;
      logger(LogLevel.ERROR, 'Redis rate limiter error', { error: err.message });
    });
  }

  /**
   * Check if a request should be rate limited
   */
  async check(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Fall back to memory limiter if Redis is not connected
    if (!this.isConnected) {
      logger(LogLevel.WARN, 'Redis not connected, falling back to memory rate limiter');
      const memoryLimiter = new MemoryRateLimiter(this.config);
      return memoryLimiter.check(req, res, next);
    }
    
    const key = this.getKey(req);
    
    try {
      const record = await this.increment(key);
      
      // Set headers
      res.setHeader('X-RateLimit-Limit', this.config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.maxRequests - record.count).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());
      
      // Check if limit is exceeded
      if (record.count > this.config.maxRequests) {
        return this.config.handler!(req, res, next, this.config);
      }
      
      // Only count successful requests if configured
      if (this.config.skipSuccessfulRequests) {
        const originalEnd = res.end;
        res.end = function(this: Response, ...args: any[]): Response {
          if (res.statusCode < 400) {
            // Decrement the counter for successful responses
            this.client.hincrby(key, 'count', -1).catch(() => {});
          }
          return originalEnd.apply(this, args);
        };
      }
      
      next();
    } catch (err) {
      next(err);
    }
  }

  /**
   * Increment the request count for a key
   */
  async increment(key: string): Promise<RateLimitRecord> {
    const now = Date.now();
    const pipeline = this.client.pipeline();
    
    // Check if key exists
    pipeline.exists(key);
    
    // Get current values if it exists
    pipeline.hgetall(key);
    
    const results = await pipeline.exec();
    
    // Parse results
    const exists = results?.[0]?.[1] === 1;
    const data = results?.[1]?.[1] || {};
    
    let count = parseInt(data.count, 10) || 0;
    let resetTime = parseInt(data.resetTime, 10) || 0;
    
    // If the key doesn't exist or the reset time has passed, create a new record
    if (!exists || now > resetTime) {
      resetTime = now + this.config.windowMs;
      count = 0;
    }
    
    // Increment the count
    count++;
    
    // Store the updated record
    await this.client.hmset(key, {
      count,
      resetTime
    });
    
    // Set expiration based on reset time
    const ttlSeconds = Math.ceil((resetTime - now) / 1000);
    if (ttlSeconds > 0) {
      await this.client.expire(key, ttlSeconds);
    }
    
    const record: RateLimitRecord = { count, resetTime };
    return record;
  }

  /**
   * Reset the request count for a key
   */
  async reset(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Get rate limit info for a key
   */
  async get(key: string): Promise<RateLimitRecord | null> {
    const data = await this.client.hgetall(key);
    
    if (!data || !data.count) {
      return null;
    }
    
    return {
      count: parseInt(data.count, 10),
      resetTime: parseInt(data.resetTime, 10)
    };
  }
}

/**
 * Factory function to create a rate limiter based on environment
 */
function createRateLimiter(config: Partial<RateLimitConfig> = {}): RateLimiter {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    try {
      return new RedisRateLimiter(config, redisUrl);
    } catch (error) {
      logger(LogLevel.ERROR, 'Failed to create Redis rate limiter', { error: error.message });
      logger(LogLevel.WARN, 'Falling back to in-memory rate limiter');
    }
  }
  
  return new MemoryRateLimiter(config);
}

/**
 * IP-based rate limiting middleware
 */
export function ipRateLimiter(customConfig: Partial<RateLimitConfig> = {}) {
  const config = {
    windowMs: DEFAULT_WINDOW_MS,
    maxRequests: DEFAULT_IP_RATE_LIMIT,
    keyPrefix: 'rl:ip',
    keyGenerator: (req: Request) => req.ip || req.connection.remoteAddress || '127.0.0.1',
    ...customConfig
  };
  
  const limiter = createRateLimiter(config);
  
  return (req: Request, res: Response, next: NextFunction) => {
    limiter.check(req, res, next);
  };
}

/**
 * User-based rate limiting middleware
 */
export function userRateLimiter(customConfig: Partial<RateLimitConfig> = {}) {
  const config = {
    windowMs: DEFAULT_WINDOW_MS,
    maxRequests: DEFAULT_USER_RATE_LIMIT,
    keyPrefix: 'rl:user',
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated
      const user = (req as any).user;
      if (user && user.sub) {
        return user.sub;
      }
      
      // Fall back to IP address
      return req.ip || req.connection.remoteAddress || '127.0.0.1';
    },
    ...customConfig
  };
  
  const limiter = createRateLimiter(config);
  
  return (req: Request, res: Response, next: NextFunction) => {
    limiter.check(req, res, next);
  };
}

/**
 * API key-based rate limiting middleware
 */
export function apiKeyRateLimiter(customConfig: Partial<RateLimitConfig> = {}) {
  const config = {
    windowMs: DEFAULT_WINDOW_MS,
    maxRequests: DEFAULT_API_KEY_RATE_LIMIT,
    keyPrefix: 'rl:apikey',
    keyGenerator: (req: Request) => {
      // Use API key ID if available
      const apiKey = (req as any).apiKey;
      if (apiKey && apiKey.id) {
        return `key:${apiKey.id}`;
      }
      
      // Use API key from header if available
      const headerKey = req.headers['x-api-key'];
      if (headerKey) {
        return `header:${headerKey}`;
      }
      
      // Fall back to IP address
      return `ip:${req.ip || req.connection.remoteAddress || '127.0.0.1'}`;
    },
    ...customConfig
  };
  
  const limiter = createRateLimiter(config);
  
  return (req: Request, res: Response, next: NextFunction) => {
    limiter.check(req, res, next);
  };
}

/**
 * Create route-specific rate limiting middleware
 */
export function routeRateLimiter(route: string, maxRequests: number, customConfig: Partial<RateLimitConfig> = {}) {
  const config = {
    windowMs: DEFAULT_WINDOW_MS,
    maxRequests,
    keyPrefix: `rl:route:${route.replace(/\//g, '_')}`,
    keyGenerator: (req: Request) => {
      // Use user ID or API key if available
      const user = (req as any).user;
      const apiKey = (req as any).apiKey;
      
      if (user && user.sub) {
        return `user:${user.sub}`;
      }
      
      if (apiKey && apiKey.id) {
        return `key:${apiKey.id}`;
      }
      
      // Fall back to IP address
      return `ip:${req.ip || req.connection.remoteAddress || '127.0.0.1'}`;
    },
    ...customConfig
  };
  
  const limiter = createRateLimiter(config);
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Only apply to specified route
    if (req.path.startsWith(route)) {
      limiter.check(req, res, next);
    } else {
      next();
    }
  };
}

/**
 * Middleware to apply rate limits to sensitive endpoints
 */
export function sensitiveEndpointRateLimiter() {
  // Generic sensitive endpoint rate limiter
  const sensitiveRoutes = ['/api/auth', '/api/users', '/api/admin'];
  const fileUploadRoutes = ['/api/files/upload', '/api/documents/upload'];
  const searchRoutes = ['/api/search', '/api/query'];
  
  // IP-based limiter for sensitive routes
  const ipLimiter = createRateLimiter({
    windowMs: DEFAULT_WINDOW_MS,
    maxRequests: SENSITIVE_ROUTE_RATE_LIMIT,
    keyPrefix: 'rl:sensitive:ip',
    keyGenerator: (req: Request) => req.ip || req.connection.remoteAddress || '127.0.0.1'
  });
  
  // User-based limiter for sensitive routes
  const userLimiter = createRateLimiter({
    windowMs: DEFAULT_WINDOW_MS,
    maxRequests: SENSITIVE_ROUTE_RATE_LIMIT,
    keyPrefix: 'rl:sensitive:user',
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      return user && user.sub ? `user:${user.sub}` : `ip:${req.ip || req.connection.remoteAddress || '127.0.0.1'}`;
    }
  });
  
  // API key-based limiter for sensitive routes
  const apiKeyLimiter = createRateLimiter({
    windowMs: DEFAULT_WINDOW_MS,
    maxRequests: SENSITIVE_ROUTE_RATE_LIMIT,
    keyPrefix: 'rl:sensitive:apikey',
    keyGenerator: (req: Request) => {
      const apiKey = (req as any).apiKey;
      return apiKey && apiKey.id ? `key:${apiKey.id}` : `ip:${req.ip || req.connection.remoteAddress || '127.0.0.1'}`;
    }
  });
  
  // Specific limiter for file uploads
  const fileUploadLimiter = createRateLimiter({
    windowMs: DEFAULT_WINDOW_MS,
    maxRequests: FILE_UPLOAD_RATE_LIMIT,
    keyPrefix: 'rl:file:upload'
  });
  
  // Specific limiter for search queries
  const searchLimiter = createRateLimiter({
    windowMs: DEFAULT_WINDOW_MS,
    maxRequests: SEARCH_RATE_LIMIT,
    keyPrefix: 'rl:search'
  });
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if route is a sensitive endpoint
    const isSensitiveRoute = sensitiveRoutes.some(route => req.path.startsWith(route));
    const isFileUploadRoute = fileUploadRoutes.some(route => req.path.startsWith(route));
    const isSearchRoute = searchRoutes.some(route => req.path.startsWith(route));
    
    if (isSensitiveRoute) {
      // Apply appropriate limiter based on authentication method
      if ((req as any).user) {
        return userLimiter.check(req, res, next);
      } else if ((req as any).apiKey) {
        return apiKeyLimiter.check(req, res, next);
      } else {
        return ipLimiter.check(req, res, next);
      }
    } else if (isFileUploadRoute) {
      return fileUploadLimiter.check(req, res, next);
    } else if (isSearchRoute) {
      return searchLimiter.check(req, res, next);
    } else {
      // Not a sensitive route, continue
      next();
    }
  };
}

/**
 * Combine all rate limiting middleware into a single function
 */
export function setupRateLimiting(app: any) {
  const combinedRateLimiter = (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting for static assets
    if (req.path.startsWith('/public/') || 
        req.path.startsWith('/assets/') ||
        req.path === '/favicon.ico') {
      return next();
    }
    
    // Skip health check endpoints
    if (req.path === '/health' || req.path === '/ping') {
      return next();
    }
    
    // Apply IP-based rate limiting first (global limit across all endpoints)
    ipRateLimiter()(req, res, (err?: any) => {
      if (err) return next(err);
      
      // Then apply user or API key limiting based on authentication
      if ((req as any).user) {
        userRateLimiter()(req, res, (err?: any) => {
          if (err) return next(err);
          
          // Finally apply sensitive endpoint rate limiting
          sensitiveEndpointRateLimiter()(req, res, next);
        });
      } else if ((req as any).apiKey) {
        apiKeyRateLimiter()(req, res, (err?: any) => {
          if (err) return next(err);
          
          // Finally apply sensitive endpoint rate limiting
          sensitiveEndpointRateLimiter()(req, res, next);
        });
      } else {
        // No user or API key, just apply sensitive endpoint rate limiting
        sensitiveEndpointRateLimiter()(req, res, next);
      }
    });
  };
  
  // Apply the combined rate limiter
  app.use(combinedRateLimiter);
  
  // Add route-specific rate limits as needed
  // Examples:
  app.use(routeRateLimiter('/api/fhir/Patient', 300));
  app.use(routeRateLimiter('/api/fhir/Observation', 500));
  app.use(routeRateLimiter('/api/fhir/Claim', 200));
  
  logger(LogLevel.INFO, 'Rate limiting middleware initialized');
}