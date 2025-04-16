/**
 * Application Error
 * 
 * Custom error class for application errors.
 */

import { ErrorCode } from './error-types';

/**
 * Validation error format
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * App error options
 */
export interface AppErrorOptions {
  /**
   * Error code
   */
  code?: string;
  
  /**
   * Error details
   */
  details?: any;
  
  /**
   * Validation errors
   */
  validationErrors?: ValidationError[];
  
  /**
   * Original error
   */
  cause?: Error;
}

/**
 * Application error
 */
export class AppError extends Error {
  /**
   * HTTP status code
   */
  statusCode: number;
  
  /**
   * Error code
   */
  code?: string;
  
  /**
   * Error details
   */
  details?: any;
  
  /**
   * Validation errors
   */
  validationErrors?: ValidationError[];
  
  /**
   * Original error
   */
  cause?: Error;
  
  /**
   * Create a new application error
   */
  constructor(
    message: string,
    statusCode: number = 500,
    options: AppErrorOptions = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = options.code;
    this.details = options.details;
    this.validationErrors = options.validationErrors;
    this.cause = options.cause;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Create a not found error
   */
  static resourceNotFound(resource: string, resourceId: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(
      `${resource} with ID '${resourceId}' not found`,
      404,
      {
        code: ErrorCode.RESOURCE_NOT_FOUND,
        details: { resource, resourceId },
        ...options
      }
    );
  }
  
  /**
   * Create a validation error
   */
  static validation(errors: ValidationError[]): AppError {
    return new AppError(
      'Validation error',
      400,
      {
        code: ErrorCode.VALIDATION_ERROR,
        validationErrors: errors
      }
    );
  }
  
  /**
   * Create a bad request error
   */
  static badRequest(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(
      message,
      400,
      {
        code: ErrorCode.BAD_REQUEST,
        ...options
      }
    );
  }
  
  /**
   * Create an unauthorized error
   */
  static unauthorized(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(
      message,
      401,
      {
        code: ErrorCode.UNAUTHORIZED,
        ...options
      }
    );
  }
  
  /**
   * Create a forbidden error
   */
  static forbidden(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(
      message,
      403,
      {
        code: ErrorCode.FORBIDDEN,
        ...options
      }
    );
  }
  
  /**
   * Create a too many requests error
   */
  static tooManyRequests(message: string, retryAfterSeconds?: number): AppError {
    return new AppError(
      message,
      429,
      {
        code: ErrorCode.TOO_MANY_REQUESTS,
        details: retryAfterSeconds ? { retryAfter: retryAfterSeconds } : undefined
      }
    );
  }
  
  /**
   * Create an external service error
   */
  static external(service: string, message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(
      `${service}: ${message}`,
      502,
      {
        code: ErrorCode.EXTERNAL_SERVICE_ERROR,
        details: { service, ...options.details },
        cause: options.cause
      }
    );
  }
  
  /**
   * Create an internal server error
   */
  static internal(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(
      message,
      500,
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        ...options
      }
    );
  }
  
  /**
   * Create an error from API response
   */
  static fromApiResponse(status: number, data: any): AppError {
    let message = 'Unknown API error';
    let code = ErrorCode.INTERNAL_SERVER_ERROR;
    
    if (data && typeof data === 'object') {
      if (data.message) {
        message = data.message;
      } else if (data.error && data.error.message) {
        message = data.error.message;
      }
      
      if (data.code) {
        code = data.code;
      } else if (data.error && data.error.code) {
        code = data.error.code;
      }
    }
    
    return new AppError(message, status, { code, details: data });
  }
}