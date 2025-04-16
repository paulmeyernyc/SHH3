/**
 * Production-compatible version of the Observability module
 * 
 * This simplified version avoids ESM/CommonJS compatibility issues
 * by providing stub implementations that don't depend on problematic modules.
 */

import { type Request, Response, NextFunction, type Express } from "express";

// Create a minimal client with no external dependencies
const observabilityClient = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(`[INFO] ${message}`, context || '');
  },
  error: (message: string, error?: Error, context?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, error || '', context || '');
  },
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, context || '');
  },
  debug: (message: string, context?: Record<string, any>) => {
    console.debug(`[DEBUG] ${message}`, context || '');
  },
  incrementCounter: () => {}, // No-op
  setGauge: () => {}, // No-op
  recordHistogram: () => {}, // No-op
  recordTiming: async <T>(name: string, operation: () => Promise<T>) => operation() // Just run the function
};

// Simplified middleware that just logs requests
export const observabilityMiddleware = [
  (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    });
    next();
  }
];

// Simple health check middleware
export const healthCheckMiddleware = (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    details: {
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
};

// Setup function - minimal implementation
export function setupObservability(): void {
  console.log('Using simplified observability for production');
  
  // Set up global error handlers
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception', err);
    setTimeout(() => process.exit(1), 1000);
  });
  
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection', reason);
  });
}

// Logging shortcuts
export const logger = {
  error: (message: string, error?: Error, context?: Record<string, any>) => 
    observabilityClient.error(message, error, context),
    
  warn: (message: string, context?: Record<string, any>) => 
    observabilityClient.warn(message, context),
    
  info: (message: string, context?: Record<string, any>) => 
    observabilityClient.info(message, context),
    
  debug: (message: string, context?: Record<string, any>) => 
    observabilityClient.debug(message, context)
};

// Simplified span for tracing
export type SimpleSpan = {
  setAttribute: (key: string, value: any) => void;
  end: () => void;
};

// Simplified withSpan utility
export function withSpan<T>(
  name: string, 
  operation: (span: SimpleSpan) => Promise<T>
): Promise<T> {
  const start = Date.now();
  const span: SimpleSpan = {
    setAttribute: () => {}, // No-op in production
    end: () => {
      const duration = Date.now() - start;
      logger.debug(`Span ${name} completed in ${duration}ms`);
    }
  };
  
  return operation(span);
}

// Simplified metrics utilities
export function incrementCounter(): void {}
export function setGauge(): void {}
export function recordHistogram(): void {}

export async function measureTiming<T>(
  name: string, 
  operation: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    logger.debug(`Operation ${name} took ${duration}ms`);
    return result;
  } catch (error) {
    logger.error(`Operation ${name} failed`, error as Error);
    throw error;
  }
}

// Database query tracking
export async function trackDbQuery<T>(
  operation: string, 
  table: string, 
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    logger.debug(`DB query ${operation} on ${table} took ${duration}ms`);
    return result;
  } catch (error) {
    logger.error(`DB query ${operation} on ${table} failed`, error as Error);
    throw error;
  }
}

// API call tracking
export async function trackApiCall<T>(
  service: string, 
  operation: string, 
  callFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await callFn();
    const duration = Date.now() - start;
    logger.debug(`API call ${operation} to ${service} took ${duration}ms`);
    return result;
  } catch (error) {
    logger.error(`API call ${operation} to ${service} failed`, error as Error);
    throw error;
  }
}

// Export the client for advanced use cases
export { observabilityClient };