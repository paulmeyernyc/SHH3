import { Request, Response, NextFunction } from 'express';
import { EdgeCacheOptions } from './cache-manager';
import { cacheManager } from './index';

/**
 * Cache configurations by entity type
 */
const ENTITY_CACHE_CONFIG: Record<string, EdgeCacheOptions> = {
  // Providers: Longer cache, less frequent updates
  providers: {
    maxAge: 60,            // 1 minute in browser
    sMaxAge: 3600,         // 1 hour in CDN
    staleWhileRevalidate: 300, // 5 minutes stale while revalidating
    tags: ['providers']
  },
  
  // Patients: Moderate cache, somewhat frequent updates
  patients: {
    maxAge: 60,             // 1 minute in browser (for testing)
    sMaxAge: 300,          // 5 minutes in CDN
    staleWhileRevalidate: 60, // 1 minute stale while revalidating
    tags: ['patients']
  },
  
  // Claims: Short cache, frequent updates
  claims: {
    maxAge: 60,            // 1 minute in browser (for testing)
    sMaxAge: 60,           // 1 minute in CDN
    staleWhileRevalidate: 10, // 10 seconds stale while revalidating
    tags: ['claims']
  },
  
  // FHIR resources: Longer cache, less frequent updates
  fhir: {
    maxAge: 60,            // 1 minute in browser (for testing)
    sMaxAge: 300,          // 5 minutes in CDN
    staleWhileRevalidate: 60, // 1 minute stale while revalidating
    tags: ['fhir_resources']
  },
  
  // Charts and analytics: Longer cache for better performance
  charts: {
    maxAge: 3600,          // 1 hour in browser
    sMaxAge: 7200,         // 2 hours in CDN
    staleWhileRevalidate: 600, // 10 minutes stale while revalidating
    tags: ['charts']
  }
};

/**
 * Apply cache control headers for specific entity types
 */
export function applyEntityCacheHeaders(
  entityType: keyof typeof ENTITY_CACHE_CONFIG
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const config = ENTITY_CACHE_CONFIG[entityType];
    if (!config) {
      return next();
    }
    
    // Apply cache headers
    const headers = cacheManager.getEdgeCacheHeaders(config);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Continue processing
    next();
  };
}

/**
 * Apply cache headers for specific routes or dynamic paths
 */
export function applyCacheHeaders(
  options: EdgeCacheOptions
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Apply cache headers
    const headers = cacheManager.getEdgeCacheHeaders(options);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Continue processing
    next();
  };
}

/**
 * Invalidate cache for specific entities or tags
 */
export function invalidateCache(
  tags: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // Process the request first
    next();
    
    // Then invalidate cache after response
    res.on('finish', () => {
      // Only invalidate for successful mutations
      if (
        (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') &&
        res.statusCode >= 200 && res.statusCode < 300
      ) {
        // Invalidate the specified tags
        tags.forEach(tag => {
          cacheManager.invalidateByTag(tag).catch(err => {
            console.error(`Error invalidating cache tag '${tag}':`, err);
          });
        });
      }
    });
  };
}