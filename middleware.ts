/**
 * Express Middleware for Observability
 * 
 * This module provides middleware components for Express applications to integrate
 * with the observability infrastructure:
 * 
 * 1. Tracing middleware - adds distributed tracing to incoming requests
 * 2. Logging middleware - adds structured request/response logging
 * 3. Metrics middleware - tracks HTTP metrics automatically
 * 4. Error handling middleware - captures and reports errors
 * 
 * Usage:
 * ```
 * import express from 'express';
 * import { ObservabilityClient } from './client';
 * import { 
 *   createTracingMiddleware,
 *   createLoggingMiddleware,
 *   createMetricsMiddleware,
 *   createErrorHandlingMiddleware
 * } from './middleware';
 * 
 * const app = express();
 * const client = new ObservabilityClient({
 *   serviceName: 'healthcare-api',
 *   serviceVersion: '1.0.0'
 * });
 * 
 * // Add observability middleware
 * app.use(createTracingMiddleware(client));
 * app.use(createLoggingMiddleware(client));
 * app.use(createMetricsMiddleware(client));
 * 
 * // ... your routes here ...
 * 
 * // Add error handling middleware last
 * app.use(createErrorHandlingMiddleware(client));
 * ```
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ObservabilityClient, SimpleSpan } from './client';

/**
 * Extend the Express Request interface to include observability properties
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Unique request ID
       */
      id: string;
      
      /**
       * Start time of the request
       */
      startTime: number;
      
      /**
       * Active span for the request
       */
      span?: SimpleSpan;
      
      /**
       * Client instance for observability reporting
       */
      observabilityClient?: ObservabilityClient;
    }
  }
}

/**
 * Create middleware for distributed tracing
 */
export function createTracingMiddleware(client: ObservabilityClient) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Initialize request context
    req.id = req.headers['x-request-id'] as string || uuidv4();
    req.startTime = Date.now();
    req.observabilityClient = client;
    
    // Set request ID header if not already present
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = req.id;
    }
    res.setHeader('x-request-id', req.id);
    
    // Create a span for this request
    client.withSpan(`HTTP ${req.method}`, async (span) => {
      // Store span for use in route handlers
      req.span = span;
      
      // Set span attributes
      span.setAttribute('http.method', req.method);
      span.setAttribute('http.url', req.originalUrl);
      span.setAttribute('http.request_id', req.id);
      
      // Set trace context headers for downstream services
      const traceId = span.getTraceId();
      if (traceId !== 'disabled') {
        res.setHeader('traceparent', `00-${traceId}-${span.getSpanId()}-01`);
      }
      
      // Create a finished event handler to capture response details
      const finishRequest = () => {
        const duration = Date.now() - req.startTime;
        
        // Set response attributes on span
        span.setAttribute('http.status_code', res.statusCode);
        span.setAttribute('http.duration_ms', duration);
        
        // Set span status based on response code
        if (res.statusCode >= 400) {
          span.setStatus('error', `HTTP Error ${res.statusCode}`);
        } else {
          span.setStatus('ok');
        }
        
        // Remove listeners to prevent memory leaks
        res.removeListener('finish', finishRequest);
        res.removeListener('close', finishRequest);
      };
      
      // Attach listeners to capture when the response finishes
      res.on('finish', finishRequest);
      res.on('close', finishRequest);
      
      // Continue to the next middleware
      next();
    }).catch(next);
  };
}

/**
 * Create middleware for request/response logging
 */
export function createLoggingMiddleware(client: ObservabilityClient) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Log the incoming request
    client.info('Request received', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      traceId: req.span?.getTraceId()
    });
    
    // Capture the original res.end method
    const originalEnd = res.end;
    
    // Override the end method to log the response
    res.end = function(this: express.Response, ...args: any[]) {
      // Calculate request duration
      const duration = Date.now() - req.startTime;
      
      // Log the response
      client.info('Response sent', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        contentLength: res.getHeader('content-length'),
        contentType: res.getHeader('content-type'),
        traceId: req.span?.getTraceId()
      });
      
      // Call the original end method
      return originalEnd.apply(this, args);
    };
    
    next();
  };
}

/**
 * Create middleware for HTTP metrics collection
 */
export function createMetricsMiddleware(client: ObservabilityClient) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Track response time
    const endTimer = () => {
      const duration = Date.now() - req.startTime;
      
      // Generate a normalized path by replacing path parameters
      // e.g. /users/123 -> /users/:id
      let normalizedPath = req.baseUrl + (req.route?.path || req.path);
      
      // For now, a simple normalization. In production, 
      // this would use route information to be more accurate
      normalizedPath = normalizedPath.replace(/\/[0-9a-f]{8,}/gi, '/:id');
      
      // Record HTTP request metrics
      client.incrementCounter('http_requests_total', 1, {
        method: req.method,
        path: normalizedPath,
        status: res.statusCode.toString()
      });
      
      // Record request duration
      client.recordHistogram('http_request_duration_milliseconds', duration, {
        method: req.method,
        path: normalizedPath,
        status: res.statusCode.toString()
      });
      
      // Track response size if available
      const contentLength = res.getHeader('content-length');
      if (contentLength) {
        client.recordHistogram('http_response_size_bytes', parseInt(contentLength.toString(), 10), {
          method: req.method,
          path: normalizedPath
        });
      }
      
      // Clean up listeners
      res.removeListener('finish', endTimer);
      res.removeListener('close', endTimer);
    };
    
    // Track active requests
    client.incrementCounter('http_active_requests', 1, {
      method: req.method
    });
    
    // Track request body size if available
    const requestContentLength = req.headers['content-length'];
    if (requestContentLength) {
      client.recordHistogram('http_request_size_bytes', parseInt(requestContentLength, 10), {
        method: req.method,
        path: req.path
      });
    }
    
    // Set up event handlers for when the response finishes
    res.on('finish', endTimer);
    res.on('close', endTimer);
    
    // Handle response completion (to decrement active requests)
    const finalizeRequest = () => {
      client.incrementCounter('http_active_requests', -1, {
        method: req.method
      });
      
      res.removeListener('finish', finalizeRequest);
      res.removeListener('close', finalizeRequest);
    };
    
    res.on('finish', finalizeRequest);
    res.on('close', finalizeRequest);
    
    next();
  };
}

/**
 * Create middleware for error handling and reporting
 */
export function createErrorHandlingMiddleware(client: ObservabilityClient) {
  return (
    err: Error, 
    req: express.Request, 
    res: express.Response, 
    next: express.NextFunction
  ) => {
    // Log the error
    client.error('Request error', err, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      traceId: req.span?.getTraceId()
    });
    
    // Record error metrics
    client.incrementCounter('http_errors_total', 1, {
      method: req.method,
      path: req.path,
      error_name: err.name || 'Error'
    });
    
    // Record error in the active span if available
    if (req.span) {
      req.span.recordError(err);
      req.span.setStatus('error', err.message);
    }
    
    // If headers are already sent, delegate to Express's default error handler
    if (res.headersSent) {
      return next(err);
    }
    
    // Determine status code from error or default to 500
    const statusCode = (err as any).statusCode || (err as any).status || 500;
    
    // Send appropriate error response
    res.status(statusCode).json({
      error: {
        message: err.message,
        requestId: req.id,
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
      }
    });
  };
}

/**
 * Create health check middleware
 */
export function createHealthCheckMiddleware(
  healthCheck: () => Promise<{ status: string; details?: any }> | { status: string; details?: any }
) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const result = await Promise.resolve(healthCheck());
      const statusCode = result.status === 'ok' ? 200 : 503;
      
      res.status(statusCode).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Create middleware that combines all observability middleware
 */
export function createObservabilityMiddleware(client: ObservabilityClient) {
  return [
    createTracingMiddleware(client),
    createLoggingMiddleware(client),
    createMetricsMiddleware(client)
  ];
}