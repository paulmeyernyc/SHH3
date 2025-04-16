/**
 * Centralized error handling for Document Service
 * 
 * Provides a hierarchy of error types with standardized error codes and messages
 */

/**
 * Base error class for Document Service
 * Provides consistent error properties and structure
 */
export class DocumentServiceError extends Error {
  statusCode: number;
  errorCode: string;
  details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    
    // Ensures proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, DocumentServiceError.prototype);
  }
}

/**
 * Type guard to check if an error is a DocumentServiceError
 */
export function isDocumentServiceError(error: any): error is DocumentServiceError {
  return error instanceof DocumentServiceError;
}

/**
 * Creates an error with appropriate status code and default message
 */
export function createErrorFromStatus(statusCode: number, message?: string): DocumentServiceError {
  switch (statusCode) {
    case 400:
      return new ValidationError(message || 'Bad request');
    case 401:
      return new AuthenticationError(message || 'Authentication required');
    case 403:
      return new AccessDeniedError(message || 'Access denied');
    case 404:
      return new NotFoundError(message || 'Resource not found');
    case 409:
      return new ConflictError(message || 'Resource conflict');
    case 413:
      return new PayloadTooLargeError(message || 'Payload too large');
    case 429:
      return new RateLimitError(message || 'Too many requests');
    case 500:
      return new InternalServerError(message || 'Internal server error');
    case 501:
      return new NotImplementedError(message || 'Feature not implemented');
    case 503:
      return new ServiceUnavailableError(message || 'Service unavailable');
    default:
      if (statusCode >= 400 && statusCode < 500) {
        return new ClientError(message || 'Client error', statusCode);
      } else if (statusCode >= 500) {
        return new ServerError(message || 'Server error', statusCode);
      } else {
        return new DocumentServiceError(
          message || 'Unknown error', 
          statusCode,
          'UNKNOWN_ERROR'
        );
      }
  }
}

/**
 * Authentication Errors (401)
 */
export class AuthenticationError extends DocumentServiceError {
  constructor(message: string = 'Authentication required', details?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_REQUIRED', details);
  }
}

/**
 * Authorization Errors (403)
 */
export class AccessDeniedError extends DocumentServiceError {
  constructor(message: string = 'Access denied', details?: Record<string, any>) {
    super(message, 403, 'ACCESS_DENIED', details);
  }
}

/**
 * Resource Not Found Errors (404)
 */
export class NotFoundError extends DocumentServiceError {
  constructor(message: string = 'Resource not found', details?: Record<string, any>) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

/**
 * Validation Errors (400/422)
 */
export class ValidationError extends DocumentServiceError {
  constructor(message: string = 'Validation failed', details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Conflict Errors (409)
 */
export class ConflictError extends DocumentServiceError {
  constructor(message: string = 'Resource conflict', details?: Record<string, any>) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Rate Limit Errors (429)
 */
export class RateLimitError extends DocumentServiceError {
  constructor(message: string = 'Too many requests', details?: Record<string, any>) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

/**
 * Payload Too Large Errors (413)
 */
export class PayloadTooLargeError extends DocumentServiceError {
  constructor(message: string = 'Payload too large', details?: Record<string, any>) {
    super(message, 413, 'PAYLOAD_TOO_LARGE', details);
  }
}

/**
 * Base class for all client errors (4xx)
 */
export class ClientError extends DocumentServiceError {
  constructor(message: string = 'Client error', statusCode: number = 400, details?: Record<string, any>) {
    super(message, statusCode, 'CLIENT_ERROR', details);
  }
}

/**
 * Internal Server Errors (500)
 */
export class InternalServerError extends DocumentServiceError {
  constructor(message: string = 'Internal server error', details?: Record<string, any>) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

/**
 * Not Implemented Errors (501)
 */
export class NotImplementedError extends DocumentServiceError {
  constructor(message: string = 'Feature not implemented', details?: Record<string, any>) {
    super(message, 501, 'NOT_IMPLEMENTED', details);
  }
}

/**
 * Service Unavailable Errors (503)
 */
export class ServiceUnavailableError extends DocumentServiceError {
  constructor(message: string = 'Service unavailable', details?: Record<string, any>) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

/**
 * Base class for all server errors (5xx)
 */
export class ServerError extends DocumentServiceError {
  constructor(message: string = 'Server error', statusCode: number = 500, details?: Record<string, any>) {
    super(message, statusCode, 'SERVER_ERROR', details);
  }
}

/**
 * Security related errors
 */
export class SecurityError extends DocumentServiceError {
  constructor(message: string = 'Security violation', details?: Record<string, any>) {
    super(message, 403, 'SECURITY_VIOLATION', details);
  }
}

/**
 * Storage related errors
 */
export class StorageError extends DocumentServiceError {
  constructor(message: string = 'Storage operation failed', details?: Record<string, any>) {
    super(message, 500, 'STORAGE_ERROR', details);
  }
}

/**
 * Database related errors
 */
export class DatabaseError extends DocumentServiceError {
  constructor(message: string = 'Database operation failed', details?: Record<string, any>) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

/**
 * External service errors
 */
export class ExternalServiceError extends DocumentServiceError {
  constructor(message: string = 'External service error', details?: Record<string, any>) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends DocumentServiceError {
  constructor(message: string = 'Configuration error', details?: Record<string, any>) {
    super(message, 500, 'CONFIGURATION_ERROR', details);
  }
}

/**
 * Missing dependencies or required services
 */
export class DependencyError extends DocumentServiceError {
  constructor(message: string = 'Required dependency unavailable', details?: Record<string, any>) {
    super(message, 503, 'DEPENDENCY_ERROR', details);
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends DocumentServiceError {
  constructor(message: string = 'Operation timed out', details?: Record<string, any>) {
    super(message, 504, 'TIMEOUT', details);
  }
}

/**
 * Format errors for specific resources
 */
export function formatDocumentNotFoundError(id: string | number, more?: Record<string, any>) {
  return new NotFoundError(`Document with ID ${id} not found`, {
    resourceType: 'document',
    resourceId: id,
    ...more
  });
}

export function formatLibraryNotFoundError(id: string | number, more?: Record<string, any>) {
  return new NotFoundError(`Library with ID ${id} not found`, {
    resourceType: 'library',
    resourceId: id,
    ...more
  });
}

export function formatCategoryNotFoundError(id: string | number, more?: Record<string, any>) {
  return new NotFoundError(`Category with ID ${id} not found`, {
    resourceType: 'category',
    resourceId: id,
    ...more
  });
}

export function formatPermissionDeniedError(resourceType: string, resourceId: string | number, more?: Record<string, any>) {
  return new AccessDeniedError(`You don't have permission to access this ${resourceType}`, {
    resourceType,
    resourceId,
    ...more
  });
}