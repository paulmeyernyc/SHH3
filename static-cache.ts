/**
 * Static Asset Cache Middleware
 * 
 * Provides Express middleware for caching static assets with appropriate headers.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Options for the static cache middleware
 */
export interface StaticCacheOptions {
  /** Cache max age in seconds (defaults to 1 day) */
  maxAge?: number;
  /** Shared/proxy max age in seconds (defaults to same as maxAge) */
  sMaxAge?: number;
  /** Stale while revalidate in seconds (defaults to 1 hour) */
  staleWhileRevalidate?: number;
  /** Whether to cache private (client-side only) */
  private?: boolean;
  /** Whether to add immutable flag (for files that never change) */
  immutable?: boolean;
}

/**
 * Default static cache options (1 day client + CDN caching)
 */
const defaultOptions: StaticCacheOptions = {
  maxAge: 86400, // 1 day
  sMaxAge: 86400, // 1 day
  staleWhileRevalidate: 3600, // 1 hour
  private: false,
  immutable: false,
};

/**
 * Creates middleware for caching static assets
 */
export function createStaticCacheMiddleware(options: StaticCacheOptions = {}) {
  const opts = { ...defaultOptions, ...options };
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Only apply to GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Build Cache-Control directive
    const directives: string[] = [];
    
    // Public/private
    directives.push(opts.private ? 'private' : 'public');
    
    // Max-age
    if (opts.maxAge !== undefined && opts.maxAge > 0) {
      directives.push(`max-age=${opts.maxAge}`);
    }
    
    // s-maxage (for CDNs/proxies)
    if (opts.sMaxAge !== undefined && opts.sMaxAge > 0) {
      directives.push(`s-maxage=${opts.sMaxAge}`);
    }
    
    // Stale-while-revalidate
    if (opts.staleWhileRevalidate !== undefined && opts.staleWhileRevalidate > 0) {
      directives.push(`stale-while-revalidate=${opts.staleWhileRevalidate}`);
    }
    
    // Immutable flag
    if (opts.immutable) {
      directives.push('immutable');
    }
    
    // Set the Cache-Control header
    res.setHeader('Cache-Control', directives.join(', '));
    
    // Also set ETag for conditional requests
    res.setHeader('Vary', 'Accept-Encoding');
    
    next();
  };
}