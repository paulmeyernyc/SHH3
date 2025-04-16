/**
 * Error Utilities
 * 
 * This module provides helper functions for common error handling scenarios
 * across the platform, making it easier to create and handle errors consistently.
 */

import { AxiosError } from 'axios';
import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { AppError, FieldError } from './app-error';
import { ErrorCode, ErrorCategory, HttpStatusCode } from './error-types';
import { captureError } from './error-capture';

/**
 * Convert database errors to AppErrors
 */
export function handleDatabaseError(error: any, operation: string = 'Database operation'): AppError {
  // PostgreSQL error codes
  const PG_UNIQUE_VIOLATION = '23505';
  const PG_FOREIGN_KEY_VIOLATION = '23503';
  const PG_NOT_NULL_VIOLATION = '23502';
  const PG_CHECK_VIOLATION = '23514';
  
  // Database-specific error mappings
  if (error.code === PG_UNIQUE_VIOLATION) {
    // Extract constraint name and fields from error message if possible
    const constraintMatch = error.detail?.match(/Key \((.*?)\)=/);
    const field = constraintMatch ? constraintMatch[1] : 'unknown';
    
    return new AppError({
      code: ErrorCode.VALIDATION_DUPLICATE_VALUE,
      message: `Duplicate value for ${field}`,
      httpStatus: HttpStatusCode.CONFLICT,
      details: {
        field,
        constraintName: error.constraint,
        detail: error.detail
      },
      cause: error
    });
  }
  
  if (error.code === PG_FOREIGN_KEY_VIOLATION) {
    // Extract constraint details
    const constraintMatch = error.detail?.match(/Key \((.*?)\)=\((.*?)\) is not present in table "(.*?)"/);
    const field = constraintMatch ? constraintMatch[1] : 'unknown';
    const value = constraintMatch ? constraintMatch[2] : 'unknown';
    const referencedTable = constraintMatch ? constraintMatch[3] : 'unknown';
    
    return new AppError({
      code: ErrorCode.DATA_INTEGRITY_REFERENCE_ERROR,
      message: `Referenced ${referencedTable} record does not exist`,
      httpStatus: HttpStatusCode.BAD_REQUEST,
      details: {
        field,
        value,
        referencedTable,
        constraintName: error.constraint,
        detail: error.detail
      },
      cause: error
    });
  }
  
  if (error.code === PG_NOT_NULL_VIOLATION) {
    const field = error.column || 'unknown';
    
    return new AppError({
      code: ErrorCode.VALIDATION_REQUIRED_FIELD_MISSING,
      message: `Required field ${field} is missing`,
      httpStatus: HttpStatusCode.BAD_REQUEST,
      details: {
        field,
        table: error.table,
        detail: error.detail
      },
      cause: error
    });
  }
  
  if (error.code === PG_CHECK_VIOLATION) {
    return new AppError({
      code: ErrorCode.VALIDATION_INVALID_VALUE,
      message: `Check constraint violated: ${error.constraint}`,
      httpStatus: HttpStatusCode.BAD_REQUEST,
      details: {
        constraintName: error.constraint,
        detail: error.detail
      },
      cause: error
    });
  }
  
  // Drizzle ORM errors
  if (error.name === 'DrizzleError') {
    return new AppError({
      code: ErrorCode.DATABASE_QUERY_ERROR,
      message: error.message || 'Database query error',
      details: { operation },
      cause: error
    });
  }
  
  // Prisma ORM errors
  if (error.name === 'PrismaClientKnownRequestError') {
    if (error.code === 'P2002') {
      // Unique constraint violation
      const fields = error.meta?.target || ['unknown field'];
      
      return new AppError({
        code: ErrorCode.VALIDATION_DUPLICATE_VALUE,
        message: `Duplicate value for ${fields.join(', ')}`,
        httpStatus: HttpStatusCode.CONFLICT,
        details: {
          fields,
          detail: error.message
        },
        cause: error
      });
    }
    
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      return new AppError({
        code: ErrorCode.DATA_INTEGRITY_REFERENCE_ERROR,
        message: 'Referenced record does not exist',
        httpStatus: HttpStatusCode.BAD_REQUEST,
        details: {
          field: error.meta?.field_name,
          detail: error.message
        },
        cause: error
      });
    }
    
    if (error.code === 'P2025') {
      // Record not found
      return new AppError({
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: error.meta?.cause || 'Record not found',
        httpStatus: HttpStatusCode.NOT_FOUND,
        details: {
          model: error.meta?.modelName
        },
        cause: error
      });
    }
  }
  
  // TypeORM errors
  if (error.name === 'QueryFailedError') {
    return new AppError({
      code: ErrorCode.DATABASE_QUERY_ERROR,
      message: error.message || 'Database query error',
      details: { 
        operation,
        query: error.query,
        parameters: error.parameters
      },
      cause: error
    });
  }
  
  // Default database error handling
  return new AppError({
    code: ErrorCode.DATABASE_QUERY_ERROR,
    message: `${operation} failed: ${error.message || 'Unknown database error'}`,
    cause: error
  });
}

/**
 * Convert Axios (HTTP client) errors to AppErrors
 */
export function handleAxiosError(error: AxiosError, serviceName: string = 'External service'): AppError {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const status = error.response.status;
    const data = error.response.data as any;
    
    // Check if the error response contains an app error format
    if (data && data.code && data.message) {
      return new AppError({
        code: data.code as ErrorCode,
        message: data.message,
        httpStatus: status,
        details: data.details || {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          serviceName
        },
        cause: error,
        fieldErrors: data.fieldErrors
      });
    }
    
    // Map common HTTP status codes to error codes
    let code: ErrorCode;
    let message: string;
    
    switch (status) {
      case 400:
        code = ErrorCode.INTEGRATION_DATA_FORMAT_ERROR;
        message = `${serviceName} reported a bad request`;
        break;
      case 401:
        code = ErrorCode.INTEGRATION_AUTHENTICATION_ERROR;
        message = `${serviceName} authentication failed`;
        break;
      case 403:
        code = ErrorCode.INTEGRATION_AUTHENTICATION_ERROR;
        message = `${serviceName} authorization failed`;
        break;
      case 404:
        code = ErrorCode.RESOURCE_NOT_FOUND;
        message = `Resource not found in ${serviceName}`;
        break;
      case 409:
        code = ErrorCode.RESOURCE_CONFLICT;
        message = `Resource conflict in ${serviceName}`;
        break;
      case 422:
        code = ErrorCode.INTEGRATION_DATA_FORMAT_ERROR;
        message = `Invalid data sent to ${serviceName}`;
        break;
      case 429:
        code = ErrorCode.INTEGRATION_RATE_LIMITED;
        message = `Rate limited by ${serviceName}`;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        code = ErrorCode.INTEGRATION_API_ERROR;
        message = `${serviceName} is experiencing issues`;
        break;
      default:
        code = ErrorCode.INTEGRATION_API_ERROR;
        message = `Error from ${serviceName}`;
    }
    
    return new AppError({
      code,
      message,
      httpStatus: mapExternalToInternalStatus(status),
      details: {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        serviceName,
        responseData: data,
        status
      },
      cause: error
    });
  } else if (error.request) {
    // The request was made but no response was received
    if (error.code === 'ECONNABORTED') {
      return new AppError({
        code: ErrorCode.NETWORK_TIMEOUT,
        message: `${serviceName} request timed out`,
        httpStatus: HttpStatusCode.GATEWAY_TIMEOUT,
        details: {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          timeout: error.config?.timeout,
          serviceName
        },
        cause: error
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      return new AppError({
        code: ErrorCode.NETWORK_CONNECTIVITY_ERROR,
        message: `Unable to connect to ${serviceName}`,
        httpStatus: HttpStatusCode.BAD_GATEWAY,
        details: {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          serviceName
        },
        cause: error
      });
    }
    
    return new AppError({
      code: ErrorCode.NETWORK_CONNECTIVITY_ERROR,
      message: `${serviceName} is unreachable`,
      httpStatus: HttpStatusCode.BAD_GATEWAY,
      details: {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        serviceName
      },
      cause: error
    });
  } else {
    // Something happened in setting up the request that triggered an Error
    return new AppError({
      code: ErrorCode.INTEGRATION_API_ERROR,
      message: `Error connecting to ${serviceName}`,
      details: {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        serviceName,
        errorMessage: error.message
      },
      cause: error
    });
  }
}

/**
 * Map external HTTP status codes to appropriate internal ones
 * to avoid leaking implementation details
 */
function mapExternalToInternalStatus(externalStatus: number): HttpStatusCode {
  // Keep 4xx errors as-is, they're typically client errors
  if (externalStatus >= 400 && externalStatus < 500) {
    return externalStatus as HttpStatusCode;
  }
  
  // Map 5xx errors to Bad Gateway or Service Unavailable
  if (externalStatus >= 500 && externalStatus < 600) {
    return HttpStatusCode.BAD_GATEWAY;
  }
  
  // Default to Internal Server Error for unexpected status codes
  return HttpStatusCode.INTERNAL_SERVER_ERROR;
}

/**
 * Convert Zod validation errors to field errors
 */
export function zodErrorToFieldErrors(error: ZodError): FieldError[] {
  return error.errors.map(zodIssueToFieldError);
}

/**
 * Convert a single Zod issue to a field error
 */
function zodIssueToFieldError(issue: ZodIssue): FieldError {
  const path = issue.path.join('.');
  
  // Map Zod error codes to more user-friendly messages
  let message = issue.message;
  let code = 'INVALID_VALUE';
  
  switch (issue.code) {
    case 'invalid_type':
      if (issue.expected === 'string') {
        message = `${path} must be a text value`;
      } else if (issue.expected === 'number') {
        message = `${path} must be a number`;
      } else if (issue.expected === 'boolean') {
        message = `${path} must be true or false`;
      } else if (issue.expected === 'date') {
        message = `${path} must be a valid date`;
      } else {
        message = `${path} has an invalid type`;
      }
      code = 'INVALID_TYPE';
      break;
      
    case 'invalid_string':
      if (issue.validation === 'email') {
        message = `${path} must be a valid email address`;
      } else if (issue.validation === 'url') {
        message = `${path} must be a valid URL`;
      } else if (issue.validation === 'uuid') {
        message = `${path} must be a valid UUID`;
      } else if (issue.validation === 'cuid') {
        message = `${path} must be a valid CUID`;
      }
      code = 'INVALID_FORMAT';
      break;
      
    case 'too_small':
      if (issue.type === 'string') {
        message = `${path} must be at least ${issue.minimum} characters`;
        code = 'TOO_SHORT';
      } else if (issue.type === 'number') {
        message = `${path} must be at least ${issue.minimum}`;
        code = 'TOO_SMALL';
      } else if (issue.type === 'array') {
        message = `${path} must have at least ${issue.minimum} items`;
        code = 'TOO_FEW_ITEMS';
      }
      break;
      
    case 'too_big':
      if (issue.type === 'string') {
        message = `${path} must be at most ${issue.maximum} characters`;
        code = 'TOO_LONG';
      } else if (issue.type === 'number') {
        message = `${path} must be at most ${issue.maximum}`;
        code = 'TOO_LARGE';
      } else if (issue.type === 'array') {
        message = `${path} must have at most ${issue.maximum} items`;
        code = 'TOO_MANY_ITEMS';
      }
      break;
      
    case 'custom':
      // Custom error messages come directly from the validator
      break;
  }
  
  return {
    field: path || 'unknown',
    message,
    code,
    value: undefined // Can't safely access input in newer Zod versions
  };
}

/**
 * Get value at a specified path in an object
 */
function getValueAtPath(path: (string | number)[], obj: any): any {
  return path.reduce((acc, key) => {
    if (acc === undefined) return undefined;
    return acc[key];
  }, obj);
}

/**
 * Higher-order function that wraps Express route handlers with error handling
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create a function to validate request parameters against a schema
 */
export function createRequestValidator<T>(
  schema: { parse: (data: any) => T; },
  location: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[location];
      const validated = schema.parse(data);
      
      // Replace the request data with the validated data
      req[location] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = zodErrorToFieldErrors(error);
        const appError = AppError.validation(
          fieldErrors,
          'Request validation failed',
          {
            details: {
              location
            }
          }
        );
        next(appError);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Safely execute a function and handle errors
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  errorMapper?: (error: any) => AppError
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    if (errorMapper) {
      throw errorMapper(error);
    }
    
    throw AppError.from(error);
  }
}

/**
 * Assert that a condition is true, or throw an error
 */
export function assert(
  condition: boolean,
  errorCode: ErrorCode,
  message: string,
  details?: any
): asserts condition {
  if (!condition) {
    throw new AppError({
      code: errorCode,
      message,
      details
    });
  }
}

/**
 * Assert that a value is not null or undefined, or throw an error
 */
export function assertExists<T>(
  value: T | null | undefined,
  errorCode: ErrorCode = ErrorCode.RESOURCE_NOT_FOUND,
  message: string = 'Required value is missing',
  details?: any
): T {
  if (value === null || value === undefined) {
    throw new AppError({
      code: errorCode,
      message,
      details
    });
  }
  
  return value;
}