/**
 * Proxy Handler
 * 
 * Handles proxying requests to backend services.
 */

import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options as ProxyOptions } from 'http-proxy-middleware';
import { nanoid } from 'nanoid';
import { RouteConfig, GatewayContext, AuthType } from './model';
import { ServiceDiscovery } from './service-discovery';
import { AppError } from '../../common/error/app-error';
import { ErrorCode } from '../../common/error/error-types';

/**
 * Proxy handler options
 */
export interface ProxyHandlerOptions {
  serviceDiscovery: ServiceDiscovery;
  enableCircuitBreaker?: boolean;
  defaultTimeout?: number;
  defaultRetries?: number;
  tracing?: boolean;
  metricsEnabled?: boolean;
}

/**
 * Proxy handler for routing requests to services
 */
export class ProxyHandler {
  private options: ProxyHandlerOptions;
  private serviceDiscovery: ServiceDiscovery;
  private circuitBreakers: Map<string, any> = new Map(); // Will use circuit breaker from microservices/common
  private proxies: Map<string, any> = new Map();

  constructor(options: ProxyHandlerOptions) {
    this.options = {
      enableCircuitBreaker: true,
      defaultTimeout: 30000, // 30 seconds
      defaultRetries: 1,
      tracing: true,
      metricsEnabled: true,
      ...options
    };

    this.serviceDiscovery = options.serviceDiscovery;
  }

  /**
   * Create middleware to handle a specific route
   */
  handleRoute(route: RouteConfig): (req: Request, res: Response, next: NextFunction) => void {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string || nanoid();

      // Add request ID if not present
      if (!req.headers['x-request-id']) {
        req.headers['x-request-id'] = requestId;
      }

      try {
        // Get service for the route
        const service = await this.serviceDiscovery.getService(route.service, route.serviceVersion);

        if (!service || !service.active) {
          throw AppError.serviceUnavailable(route.service, {
            details: { version: route.serviceVersion }
          });
        }

        // Create gateway context
        const context: GatewayContext = {
          route,
          service,
          startTime,
          requestId,
          originalUrl: req.originalUrl
        };

        // Add context to request for plugins
        (req as any).gatewayContext = context;

        // Handle authentication if required
        if (route.auth !== AuthType.NONE) {
          await this.handleAuthentication(req, res, route);
        }

        // If we get here, authentication was successful
        // Get or create proxy for this service
        const proxy = this.getOrCreateProxy(route, service);

        // Apply proxy
        proxy(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Handle authentication for a route
   */
  private async handleAuthentication(req: Request, res: Response, route: RouteConfig): Promise<void> {
    // This is a placeholder. In a real implementation, this would:
    // 1. Check the auth type (JWT, API key, etc.)
    // 2. Validate credentials
    // 3. Check scopes/permissions if required
    // 4. Add user/auth info to the request

    // For now, we'll simulate accepting all auth
    const context = (req as any).gatewayContext as GatewayContext;
    context.authInfo = {
      type: route.auth,
      user: { id: 'demouser' },
      scopes: []
    };

    // In a real implementation, we'd throw an error for invalid auth:
    // throw AppError.unauthorized('Invalid credentials');
    
    // Or for unauthorized access:
    // throw AppError.forbidden('Insufficient permissions');
  }

  /**
   * Get or create a proxy for a service
   */
  private getOrCreateProxy(route: RouteConfig, service: ServiceInfo): (req: Request, res: Response, next: NextFunction) => void {
    const cacheKey = `${route.id}:${service.id}`;
    
    // Return cached proxy if available
    if (this.proxies.has(cacheKey)) {
      return this.proxies.get(cacheKey);
    }

    // Configure proxy options
    const proxyOptions: ProxyOptions = {
      target: service.url,
      changeOrigin: true,
      timeout: route.timeout || this.options.defaultTimeout,
      pathRewrite: (path) => {
        if (route.strip) {
          // Remove the route path from the request path
          return path.replace(new RegExp(`^${route.path}`), route.target || '');
        }
        
        // Or use a specific target path
        if (route.target) {
          return route.target;
        }
        
        return path;
      },
      proxyTimeout: route.timeout || this.options.defaultTimeout,
      onProxyReq: (proxyReq, req) => {
        // Add gateway headers
        proxyReq.setHeader('x-forwarded-by', 'smart-health-hub-gateway');
        proxyReq.setHeader('x-request-id', (req as any).gatewayContext.requestId);
        
        // Add auth headers if available
        const context = (req as any).gatewayContext as GatewayContext;
        if (context.authInfo?.user) {
          proxyReq.setHeader('x-user-id', context.authInfo.user.id);
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        // Add gateway response headers
        proxyRes.headers['x-gateway-service'] = route.service;
        if (route.serviceVersion) {
          proxyRes.headers['x-gateway-service-version'] = route.serviceVersion;
        }
      },
      onError: (err, req, res) => {
        // Handle proxy errors
        console.error(`Proxy error for ${route.service}:`, err.message);
        
        // Don't send error directly, let Express error handler manage it
        const error = AppError.serviceUnavailable(route.service, {
          details: { route: route.path, serviceUrl: service.url },
          cause: err
        });
        
        const next = (req as any).next;
        if (typeof next === 'function') {
          next(error);
        } else {
          // Fallback if next isn't available
          res.status(503).json({
            errorId: nanoid(),
            code: ErrorCode.SERVICE_UNAVAILABLE,
            message: `Service ${route.service} is currently unavailable`,
            timestamp: new Date().toISOString()
          });
        }
      }
    };

    // Apply CORS if enabled
    if (route.cors) {
      proxyOptions.cors = true;
    }

    // Create proxy middleware
    const proxy = createProxyMiddleware(proxyOptions);
    
    // Store a reference to next for error handling
    const proxyWithNext = (req: Request, res: Response, next: NextFunction) => {
      (req as any).next = next;
      proxy(req, res, next);
    };

    // Cache the proxy
    this.proxies.set(cacheKey, proxyWithNext);
    
    return proxyWithNext;
  }
}

/**
 * Create a proxy handler
 */
export function createProxyHandler(options: ProxyHandlerOptions): ProxyHandler {
  return new ProxyHandler(options);
}