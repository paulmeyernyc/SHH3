/**
 * Cache Middleware Module
 * 
 * Provides Express middleware for automatic API response caching.
 */

import { Request, Response, NextFunction } from 'express';
import { cacheService, CacheOptions } from './cache-service';
import { logger } from '../observability';

/**
 * Cache middleware configuration
 */
export interface CacheMiddlewareOptions extends CacheOptions {
  /** Cache key generator function */
  keyGenerator?: (req: Request) => string;
  /** Whether to bypass cache for this request (useful for conditional caching) */
  bypass?: (req: Request) => boolean;
  /** Headers to include in the cache key (for varying cache by headers) */
  varyByHeaders?: string[];
  /** Query parameters to include in the cache key */
  varyByQuery?: string[];
  /** Request body fields to include in the cache key (for POST/PUT caching) */
  varyByBody?: string[];
}

/**
 * Default cache key generator
 */
const defaultKeyGenerator = (req: Request, options: CacheMiddlewareOptions) => {
  // Start with base path and method
  let key = `${req.method}:${req.baseUrl}${req.path}`;
  
  // Add query parameters if specified
  if (options.varyByQuery && options.varyByQuery.length > 0) {
    const queryParams: Record<string, any> = {};
    options.varyByQuery.forEach(param => {
      if (req.query[param] !== undefined) {
        queryParams[param] = req.query[param];
      }
    });
    
    if (Object.keys(queryParams).length > 0) {
      key += `:query:${JSON.stringify(queryParams)}`;
    }
  } else if (Object.keys(req.query).length > 0) {
    // If no specific query params specified, use all
    key += `:query:${JSON.stringify(req.query)}`;
  }
  
  // Add headers if specified
  if (options.varyByHeaders && options.varyByHeaders.length > 0) {
    const headers: Record<string, any> = {};
    options.varyByHeaders.forEach(header => {
      const headerValue = req.headers[header.toLowerCase()];
      if (headerValue !== undefined) {
        headers[header] = headerValue;
      }
    });
    
    if (Object.keys(headers).length > 0) {
      key += `:headers:${JSON.stringify(headers)}`;
    }
  }
  
  // Add body parameters if specified (for POST/PUT/PATCH requests)
  if (options.varyByBody && options.varyByBody.length > 0 && req.body) {
    const bodyParams: Record<string, any> = {};
    options.varyByBody.forEach(param => {
      if (req.body[param] !== undefined) {
        bodyParams[param] = req.body[param];
      }
    });
    
    if (Object.keys(bodyParams).length > 0) {
      key += `:body:${JSON.stringify(bodyParams)}`;
    }
  }
  
  // Add user ID if authenticated (to prevent serving cached data across users)
  if (req.user?.id) {
    key += `:user:${req.user.id}`;
  }
  
  return key;
};

/**
 * Creates a middleware function for caching API responses
 */
export function createCacheMiddleware(cacheManager: any, options: CacheMiddlewareOptions = {}) {
  return cacheMiddleware(options);
}

/**
 * Original middleware function for caching API responses
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip non-cacheable methods by default
    if (!options.bypass && (req.method !== 'GET' && req.method !== 'HEAD')) {
      return next();
    }
    
    // Skip if bypass function returns true
    if (options.bypass && options.bypass(req)) {
      return next();
    }
    
    // Generate cache key
    const keyGenerator = options.keyGenerator || 
      ((req: Request) => defaultKeyGenerator(req, options));
    
    const cacheKey = keyGenerator(req);
    
    try {
      // Try to get from cache
      const cachedResponse = await cacheService.get<{
        body: any;
        headers: Record<string, string>;
        status: number;
      }>(cacheKey, options);
      
      // If found in cache, return the cached response
      if (cachedResponse) {
        // Set cache status header
        res.setHeader('X-Cache', 'HIT');
        
        // Set the cached headers
        Object.entries(cachedResponse.headers || {}).forEach(([name, value]) => {
          res.setHeader(name, value);
        });
        
        // Send the cached response with the original status code
        return res.status(cachedResponse.status).send(cachedResponse.body);
      }
      
      // Set cache status header
      res.setHeader('X-Cache', 'MISS');
      
      // Capture the original methods
      const originalSend = res.send;
      const originalJson = res.json;
      const originalStatus = res.status;
      
      let responseBody: any;
      let responseStatus = 200;
      
      // Override status method
      res.status = function(code) {
        responseStatus = code;
        return originalStatus.apply(res, [code]);
      };
      
      // Override send method
      res.send = function(body) {
        responseBody = body;
        
        // Only cache successful responses
        if (responseStatus >= 200 && responseStatus < 400) {
          const headersToCache: Record<string, string> = {};
          
          // Copy relevant headers to cache
          ['content-type', 'content-language', 'etag', 'last-modified'].forEach(name => {
            const value = res.getHeader(name);
            if (value) {
              headersToCache[name] = value.toString();
            }
          });
          
          // Cache the response
          cacheService.set(cacheKey, {
            body: responseBody,
            headers: headersToCache,
            status: responseStatus
          }, options).catch(err => {
            logger.error('Error caching response', { error: err.message, cacheKey });
          });
        }
        
        return originalSend.apply(res, [body]);
      };
      
      // Override json method
      res.json = function(body) {
        responseBody = body;
        return originalJson.apply(res, [body]);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error', { 
        path: req.path,
        error: (error as Error).message 
      });
      next();
    }
  };
}

/**
 * Middleware to clear cache entries based on a pattern
 */
export function clearCacheMiddleware(pattern: string, namespace?: string) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await cacheService.invalidatePattern(pattern, namespace);
      next();
    } catch (error) {
      logger.error('Clear cache middleware error', { 
        pattern,
        error: (error as Error).message 
      });
      next();
    }
  };
}

/**
 * Create middleware that invalidates specific cache entities on write operations
 */
export function createCacheInvalidationMiddleware(cacheManager: any, entities: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only apply to write operations
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }
    
    // Store the original end method
    const originalEnd = res.end;
    
    // Override end method to invalidate cache after successful response
    res.end = function(this: Response, ...args: any[]) {
      // Call original end method
      originalEnd.apply(this, args);
      
      // Only invalidate cache for successful responses
      if (res.statusCode >= 200 && res.statusCode < 400) {
        // Invalidate each entity in the cache
        entities.forEach(entity => {
          cacheService.invalidatePattern(entity)
            .catch((err: Error) => {
              logger.error(`Failed to invalidate cache for ${entity}`, { 
                error: err.message,
                method: req.method,
                path: req.path 
              });
            });
        });
      }
    };
    
    next();
  };
}