/**
 * Error Handler Middleware for Express
 * 
 * This middleware provides a consistent way to handle errors in Express applications,
 * transforming various error types into standardized API responses.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, FieldError } from './app-error';
import { ErrorCode, HttpStatusCode, ErrorSeverity } from './error-types';
import './types'; // Import the extended types

// Import captureError directly to avoid circular dependency
// We'll just declare it here for now
const captureError = (error: any) => {
  console.error('[ERROR CAPTURE MOCK]', error);
  return null;
};

// Environment configuration
const isDevelopment = process.env.NODE_ENV !== 'production';

// Function to process ZodError into field errors
function processZodError(error: ZodError): FieldError[] {
  return error.errors.map(err => {
    // Extract field path as string (e.g., 'user.address.street')
    const field = err.path.join('.');
    
    return {
      field,
      message: err.message,
      code: 'INVALID_VALUE',
      value: undefined // Can't safely access input in newer Zod versions
    };
  });
}

// Function to determine if the request accepts JSON
function acceptsJson(req: Request): boolean {
  return req.accepts(['json', 'html', 'text']) === 'json';
}

// Options for the error handler middleware
export interface ErrorHandlerOptions {
  // Whether to include detailed error information in responses
  includeDebugInfo?: boolean;
  // Whether to log errors
  logErrors?: boolean;
  // Custom logger function
  logger?: (message: string, error: any) => void;
  // Error capture service
  errorCapture?: typeof captureError;
}

/**
 * Express middleware to handle errors consistently
 */
export function errorHandler(options: ErrorHandlerOptions = {}) {
  const includeDebugInfo = options.includeDebugInfo !== undefined 
    ? options.includeDebugInfo 
    : isDevelopment;
    
  const logErrors = options.logErrors !== undefined
    ? options.logErrors
    : true;
    
  const logger = options.logger || console.error;
  const errorCapture = options.errorCapture || captureError;
  
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    // Generate request context for errors
    const context = {
      requestId: req.id || req.headers['x-request-id'] as string,
      userId: req.user?.id,
      tenantId: req.headers['x-tenant-id'] as string,
      environment: process.env.NODE_ENV,
      service: process.env.SERVICE_NAME,
      operation: `${req.method} ${req.path}`
    };
    
    let appError: AppError;
    
    // Convert different error types to AppError
    if (err instanceof AppError) {
      // Already an AppError, just add context if missing
      appError = err;
      if (!appError.context) {
        Object.defineProperty(appError, 'context', {
          value: context,
          enumerable: true,
          writable: false
        });
      }
    } else if (err instanceof ZodError) {
      // Zod validation error
      appError = AppError.validation(
        processZodError(err),
        'Request validation failed',
        { context }
      );
    } else if (err.type === 'entity.parse.failed') {
      // JSON parse error
      appError = new AppError({
        code: ErrorCode.VALIDATION_INVALID_FORMAT,
        message: 'Invalid JSON in request body',
        context,
        severity: ErrorSeverity.WARNING
      });
    } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
      // JWT/Auth errors
      appError = new AppError({
        code: ErrorCode.AUTHENTICATION_INVALID_TOKEN,
        message: err.message || 'Invalid authentication token',
        context,
        cause: err
      });
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      // Connection errors
      appError = new AppError({
        code: ErrorCode.NETWORK_CONNECTIVITY_ERROR,
        message: 'Unable to connect to the server',
        context,
        cause: err,
        details: {
          address: err.address,
          port: err.port
        }
      });
    } else if (err.name === 'SequelizeValidationError') {
      // ORM validation errors (if using Sequelize)
      const fieldErrors: FieldError[] = (err.errors || []).map((e: any) => ({
        field: e.path,
        message: e.message,
        value: e.value
      }));
      
      appError = AppError.validation(fieldErrors, 'Data validation error', { context });
    } else if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
      // Database unique constraint violations
      appError = new AppError({
        code: ErrorCode.VALIDATION_DUPLICATE_VALUE,
        message: 'A record with this value already exists',
        context,
        cause: err
      });
    } else if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      // Timeout errors
      appError = new AppError({
        code: ErrorCode.NETWORK_TIMEOUT,
        message: 'Request timed out',
        context,
        cause: err
      });
    } else if (err.status === 404 || err.statusCode === 404) {
      // 404 errors
      appError = new AppError({
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: err.message || 'Resource not found',
        httpStatus: HttpStatusCode.NOT_FOUND,
        context
      });
    } else {
      // Generic errors - convert to AppError
      appError = AppError.internal(err, err.message || 'Internal server error', { context });
    }
    
    // Log the error (if enabled)
    if (logErrors) {
      logger(`[ERROR] ${appError.code}: ${appError.message}`, appError.toLogFormat());
    }
    
    // Send the error to the error tracking service
    errorCapture(appError);
    
    // Send response in the appropriate format
    if (acceptsJson(req)) {
      // Send JSON response
      const { status, body } = appError.toResponseObject(includeDebugInfo);
      res.status(status).json(body);
    } else {
      // Non-JSON response (basic error page)
      const { status } = appError.toResponseObject();
      res.status(status).send(`
        <html>
          <head><title>Error: ${status}</title></head>
          <body>
            <h1>Error: ${status}</h1>
            <p>${appError.message}</p>
            <p>Error ID: ${appError.errorId}</p>
            ${includeDebugInfo && appError.stack ? `<pre>${appError.stack}</pre>` : ''}
          </body>
        </html>
      `);
    }
  };
}

/**
 * Express middleware to handle 404 errors
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError({
    code: ErrorCode.RESOURCE_NOT_FOUND,
    message: `Route not found: ${req.method} ${req.path}`,
    httpStatus: HttpStatusCode.NOT_FOUND,
    context: {
      requestId: req.id || req.headers['x-request-id'] as string,
      service: process.env.SERVICE_NAME,
      operation: `${req.method} ${req.path}`
    }
  });
  
  next(error);
}