/**
 * Error handling middleware for document service
 * 
 * Provides centralized error handling with standardized formatting
 * and error tracking
 */

import { Request, Response, NextFunction } from 'express';
import { DocumentServiceError, isDocumentServiceError } from '../services/errors';

interface ErrorMetrics {
  totalErrors: number;
  clientErrors: number;
  serverErrors: number;
  validationErrors: number;
  authErrors: number;
  notFoundErrors: number;
  errorsByEndpoint: Record<string, number>;
  errorsByType: Record<string, number>;
}

// Error metrics for monitoring
const errorMetrics: ErrorMetrics = {
  totalErrors: 0,
  clientErrors: 0,
  serverErrors: 0,
  validationErrors: 0,
  authErrors: 0,
  notFoundErrors: 0,
  errorsByEndpoint: {},
  errorsByType: {}
};

/**
 * Central error handling middleware
 * Processes all errors and returns standardized error responses
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  // Transform error to DocumentServiceError if it's not one already
  const error = isDocumentServiceError(err)
    ? err
    : new DocumentServiceError(
        err.message || 'An unexpected error occurred',
        500,
        'INTERNAL_ERROR',
        { originalError: err.name }
      );

  // Collect request information for logging
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: (req.user as any)?.id || 'anonymous',
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  };

  // Track error for metrics
  trackError(error, requestInfo);
  
  // Log error for troubleshooting
  logError(error, requestInfo);

  // Send standardized response to client
  res.status(error.statusCode).json({
    status: 'error',
    statusCode: error.statusCode,
    errorCode: error.errorCode,
    message: error.message,
    requestId: req.headers['x-request-id'] || 'unknown',
    timestamp: new Date().toISOString()
  });
}

/**
 * Track error metrics for monitoring and alerting
 */
function trackError(error: DocumentServiceError, requestInfo: any): void {
  errorMetrics.totalErrors++;
  
  // Track by error category
  if (error.statusCode >= 400 && error.statusCode < 500) {
    errorMetrics.clientErrors++;
  } else if (error.statusCode >= 500) {
    errorMetrics.serverErrors++;
  }
  
  // Track specific error types
  if (error.statusCode === 400 || error.statusCode === 422) {
    errorMetrics.validationErrors++;
  } else if (error.statusCode === 401 || error.statusCode === 403) {
    errorMetrics.authErrors++;
  } else if (error.statusCode === 404) {
    errorMetrics.notFoundErrors++;
  }
  
  // Track errors by endpoint
  const endpoint = requestInfo.url.split('?')[0]; // Remove query params
  errorMetrics.errorsByEndpoint[endpoint] = (errorMetrics.errorsByEndpoint[endpoint] || 0) + 1;
  
  // Track errors by type
  const errorType = error.errorCode;
  errorMetrics.errorsByType[errorType] = (errorMetrics.errorsByType[errorType] || 0) + 1;
  
  // In a production system, you might send these metrics to a monitoring service
  // like Prometheus, DataDog, New Relic, etc.
}

/**
 * Log error details for troubleshooting
 */
function logError(error: DocumentServiceError, requestInfo: any): void {
  // Combine error and request info for comprehensive logging
  const logData = {
    ...requestInfo,
    errorCode: error.errorCode,
    errorMessage: error.message,
    statusCode: error.statusCode,
    details: error.details,
    stack: error.stack
  };
  
  // In development, log to console
  // In production, would log to centralized logging system
  if (process.env.NODE_ENV === 'production') {
    // Simple JSON stringification for console in production
    // In a real system, this would go to proper logging system
    console.error('ERROR:', JSON.stringify(logData));
  } else {
    // More detailed logging for development
    console.error('\n===== ERROR DETAILS =====');
    console.error(`Time: ${new Date().toISOString()}`);
    console.error(`Request: ${requestInfo.method} ${requestInfo.url}`);
    console.error(`User: ${requestInfo.userId} (${requestInfo.ip})`);
    console.error(`Error: [${error.statusCode}] ${error.errorCode} - ${error.message}`);
    
    if (error.details) {
      console.error('Details:', error.details);
    }
    
    console.error('Stack:', error.stack);
    console.error('========================\n');
  }
}

/**
 * Middleware to handle 404 (Not Found) errors
 * This should be placed after all routes are defined
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(new DocumentServiceError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  ));
}

/**
 * Get current error metrics for monitoring
 * In a production system, this would expose metrics for Prometheus scraping
 */
export function getErrorMetrics(): ErrorMetrics {
  return { ...errorMetrics };
}

/**
 * Reset error metrics (for testing purposes)
 */
export function resetErrorMetrics(): void {
  errorMetrics.totalErrors = 0;
  errorMetrics.clientErrors = 0;
  errorMetrics.serverErrors = 0;
  errorMetrics.validationErrors = 0;
  errorMetrics.authErrors = 0;
  errorMetrics.notFoundErrors = 0;
  errorMetrics.errorsByEndpoint = {};
  errorMetrics.errorsByType = {};
}

/**
 * Utility function for async route handlers to catch errors
 * and pass them to the error middleware
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Rate limiting error handler middleware
 * Converts rate limiting errors to standard DocumentServiceError format
 */
export function rateLimitErrorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  // Check if this is a rate limit error from express-rate-limit
  if (err.message.includes('Too many requests') || err.message.includes('Rate limit exceeded')) {
    return next(new DocumentServiceError(
      'Rate limit exceeded, please try again later',
      429,
      'RATE_LIMIT_EXCEEDED',
      { originalError: err.message }
    ));
  }
  
  // Pass through to next error handler if not a rate limiting error
  next(err);
}

/**
 * JSON parsing error handler middleware
 * Converts body-parser JSON errors to standard DocumentServiceError format
 */
export function jsonParsingErrorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    return next(new DocumentServiceError(
      'Invalid JSON in request body',
      400,
      'INVALID_JSON',
      { originalError: err.message }
    ));
  }
  
  // Pass through to next error handler if not a JSON parsing error
  next(err);
}