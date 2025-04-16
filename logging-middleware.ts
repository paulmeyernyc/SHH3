/**
 * Logging Middleware for Integration Gateway
 * 
 * Provides standardized request/response logging and a structured logger
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import morgan from 'morgan';
import { performance } from 'perf_hooks';
import NodeCache from 'node-cache';

/**
 * Log levels enum
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Log object structure
 */
interface LogObject {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: any;
}

// Cache for collecting metrics
const metricsCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

// Default minimum log level
const MIN_LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// The log level ranking
const LOG_LEVEL_RANK = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3
};

/**
 * Check if a log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  const minLevelRank = LOG_LEVEL_RANK[MIN_LOG_LEVEL as LogLevel] || 1;
  const currentLevelRank = LOG_LEVEL_RANK[level];
  
  return currentLevelRank >= minLevelRank;
}

/**
 * Logger function for structured logging
 */
export function logger(level: LogLevel, message: string, meta: Record<string, any> = {}) {
  if (!shouldLog(level)) {
    return;
  }
  
  const logObject: LogObject = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };
  
  // Add correlation ID if available
  if (global.requestContext && global.requestContext.correlationId) {
    logObject.correlationId = global.requestContext.correlationId;
  }
  
  // Write to console in development and production
  switch (level) {
    case LogLevel.ERROR:
      console.error(JSON.stringify(logObject));
      break;
    case LogLevel.WARN:
      console.warn(JSON.stringify(logObject));
      break;
    case LogLevel.INFO:
      console.info(JSON.stringify(logObject));
      break;
    default:
      console.log(JSON.stringify(logObject));
  }
  
  // In production, this could also write to external logging systems
  // like AWS CloudWatch, Elasticsearch, Splunk, etc.
}

/**
 * Generate a request ID if none exists
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  
  // Set requestContext for the current request
  (global as any).requestContext = {
    correlationId
  };
  
  // Add correlation ID to response headers
  res.setHeader('x-correlation-id', correlationId);
  
  next();
}

/**
 * Track request duration and log request/response details
 */
export function loggingMiddleware(options: {
  skip?: (req: Request, res: Response) => boolean;
  logLevel?: LogLevel;
} = {}) {
  const {
    skip = (req: Request, res: Response) => false,
    logLevel = LogLevel.INFO
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip logging if specified
    if (skip(req, res)) {
      return next();
    }
    
    // Get original HTTP methods
    const originalSend = res.send;
    const originalEnd = res.end;
    const originalJson = res.json;
    
    // Start time
    const start = performance.now();
    
    // Store request details
    const requestData = {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.connection.remoteAddress,
      referrer: req.headers.referer || req.headers.referrer,
      userAgent: req.headers['user-agent']
    };
    
    // Add Body if not multipart (files) and not too large
    if (
      req.body && 
      req.headers['content-type'] !== 'multipart/form-data' &&
      !req.originalUrl.includes('/file/upload') &&
      JSON.stringify(req.body).length < 10000
    ) {
      (requestData as any).body = req.body;
    }
    
    if (shouldLog(LogLevel.DEBUG)) {
      logger(LogLevel.DEBUG, 'Incoming request', {
        request: requestData,
        headers: req.headers
      });
    } else {
      logger(logLevel, 'Incoming request', { request: requestData });
    }
    
    // Capture response data when res.send is called
    res.send = function(this: Response, body?: any): Response {
      const responseTime = performance.now() - start;
      
      // Log response
      if (body) {
        let responseBody;
        
        // Handle different body types
        if (typeof body === 'string' && body.length < 10000) {
          try {
            // Try to parse as JSON
            responseBody = JSON.parse(body);
          } catch {
            // If not JSON, use as string
            if (body.length < 1000) {
              responseBody = body;
            } else {
              responseBody = `${body.substring(0, 500)}... [truncated, ${body.length} bytes]`;
            }
          }
        } else if (Buffer.isBuffer(body)) {
          responseBody = `[Buffer: ${body.length} bytes]`;
        }
        
        logger(logLevel, 'Outgoing response', {
          response: {
            statusCode: res.statusCode,
            responseTime: `${responseTime.toFixed(2)}ms`,
            contentLength: body ? (Buffer.isBuffer(body) ? body.length : body.length) : 0,
            body: responseBody
          },
          request: requestData
        });
      }
      
      // Call the original send
      return originalSend.call(this, body);
    };
    
    // Capture response end
    res.end = function(this: Response, chunk?: any, encoding?: BufferEncoding, callback?: (() => void)): Response {
      const responseTime = performance.now() - start;
      
      // Log only if not already logged by send
      if (!chunk || chunk.length === 0) {
        logger(logLevel, 'Outgoing response', {
          response: {
            statusCode: res.statusCode,
            responseTime: `${responseTime.toFixed(2)}ms`,
            headers: res.getHeaders()
          },
          request: requestData
        });
      }
      
      // Call the original end
      return originalEnd.call(this, chunk, encoding, callback);
    };
    
    // Capture JSON responses
    res.json = function(this: Response, body?: any): Response {
      // Let send handle the logging
      return originalJson.call(this, body);
    };
    
    next();
  };
}

/**
 * Measure and log performance metrics for each request
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  
  // Store timing data
  const timings: Record<string, number> = {
    start: start
  };
  
  // Add method to track performance markers
  (req as any).perf = {
    mark: (name: string) => {
      timings[name] = performance.now() - start;
    }
  };
  
  // Track response end
  res.on('finish', () => {
    timings.finish = performance.now() - start;
    
    // Record the metrics
    MetricsCollector.getInstance().recordRequest(
      req.method,
      req.path,
      res.statusCode,
      timings.finish
    );
    
    if (shouldLog(LogLevel.DEBUG)) {
      logger(LogLevel.DEBUG, 'Request performance', {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        timings
      });
    }
  });
  
  next();
}

/**
 * Record request counts and response times for metrics
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: {
    requestCount: number;
    statusCounts: Record<string, number>;
    pathCounts: Record<string, number>;
    methodCounts: Record<string, number>;
    responseTimes: number[];
    errors: Record<string, number>;
  };
  
  private constructor() {
    this.resetMetrics();
    
    // Reset metrics every minute
    setInterval(() => {
      this.resetMetrics();
    }, 60000);
  }
  
  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }
  
  public resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      statusCounts: {},
      pathCounts: {},
      methodCounts: {},
      responseTimes: [],
      errors: {}
    };
  }
  
  public recordRequest(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number
  ): void {
    // Increment request count
    this.metrics.requestCount++;
    
    // Record status code
    const statusCodeKey = Math.floor(statusCode / 100) + 'xx';
    this.metrics.statusCounts[statusCodeKey] = (this.metrics.statusCounts[statusCodeKey] || 0) + 1;
    
    // Record method
    this.metrics.methodCounts[method] = (this.metrics.methodCounts[method] || 0) + 1;
    
    // Record response time
    this.metrics.responseTimes.push(responseTime);
    
    // Extract the base path (without query params and ids)
    const basePath = path
      .split('?')[0]                             // Remove query parameters
      .replace(/\/\d+(?=\/|$)/g, '/:id')         // Replace numeric IDs with :id
      .replace(/\/[a-f0-9-]{36}(?=\/|$)/g, '/:uuid'); // Replace UUIDs with :uuid
    
    // Record path
    this.metrics.pathCounts[basePath] = (this.metrics.pathCounts[basePath] || 0) + 1;
    
    // Record errors
    if (statusCode >= 400) {
      this.metrics.errors[statusCodeKey] = (this.metrics.errors[statusCodeKey] || 0) + 1;
    }
  }
  
  public getMetrics() {
    // Calculate response time stats
    const responseTimes = this.metrics.responseTimes;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    // Sort response times for percentiles
    const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
    const p50Index = Math.floor(sortedResponseTimes.length * 0.5);
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p99Index = Math.floor(sortedResponseTimes.length * 0.99);
    
    return {
      timestamp: new Date().toISOString(),
      requestCount: this.metrics.requestCount,
      statusCounts: this.metrics.statusCounts,
      methodCounts: this.metrics.methodCounts,
      // Only return top paths by count
      topPaths: Object.entries(this.metrics.pathCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reduce((obj, [path, count]) => ({ ...obj, [path]: count }), {}),
      responseTimeStats: {
        avg: avgResponseTime,
        p50: sortedResponseTimes[p50Index] || 0,
        p95: sortedResponseTimes[p95Index] || 0,
        p99: sortedResponseTimes[p99Index] || 0,
        max: Math.max(...responseTimes, 0)
      },
      errors: this.metrics.errors
    };
  }
}

/**
 * Middleware to collect metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip metrics routes to avoid circular metrics
  if (req.path === '/api/metrics' || req.path === '/health') {
    return next();
  }
  
  // Continue with performance tracking
  performanceMiddleware(req, res, next);
}

/**
 * Get metrics endpoint handler
 */
export function getMetricsHandler(req: Request, res: Response) {
  const metrics = MetricsCollector.getInstance().getMetrics();
  res.json(metrics);
}

/**
 * Combine all logging middleware into a single function
 */
export function setupLogging(app: any) {
  // Add request ID middleware
  app.use(requestIdMiddleware);
  
  // Add morgan for basic logging
  app.use(morgan('dev', {
    skip: (req: Request, res: Response) => {
      // Skip health check endpoints to reduce noise
      return req.path === '/health' || req.path === '/ping';
    }
  }));
  
  // Add performance metrics collection
  app.use(metricsMiddleware);
  
  // Add detailed request/response logging
  app.use(loggingMiddleware({
    skip: (req: Request, res: Response) => {
      // Skip health check and static endpoints
      return req.path === '/health' || 
             req.path === '/ping' ||
             req.path.startsWith('/public/') ||
             req.path.startsWith('/assets/');
    },
    logLevel: LogLevel.INFO
  }));
  
  // Add metrics endpoint
  app.get('/api/metrics', (req: Request, res: Response) => {
    getMetricsHandler(req, res);
  });
  
  logger(LogLevel.INFO, 'Logging middleware initialized');
}