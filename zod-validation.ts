/**
 * Zod Validation Integration
 * 
 * This module provides utility functions for converting Zod validation errors
 * to the standardized error format used in the Smart Health Hub platform.
 */

import { ZodError, ZodIssue } from 'zod';
import { AppError, FieldError } from './app-error';
import { ErrorCode } from './error-types';

/**
 * Convert a Zod validation error to field errors for AppError
 */
export function zodIssueToFieldError(issue: ZodIssue): FieldError {
  // Format the path (e.g., ["user", "address", "street"] => "user.address.street")
  const field = issue.path.join('.');
  
  // Convert Zod error code to a friendly error message if the message is too technical
  let message = issue.message;
  let code = 'INVALID_VALUE';
  
  // Map Zod error codes to more specific error codes
  switch (issue.code) {
    case 'invalid_type':
      code = issue.received === 'undefined' ? 'REQUIRED' : 'INVALID_TYPE';
      if (!message) {
        message = issue.received === 'undefined' 
          ? 'This field is required' 
          : `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
      
    case 'invalid_string':
      if (issue.validation === 'email') {
        code = 'INVALID_EMAIL';
        if (!message) message = 'Invalid email address';
      } else if (issue.validation === 'url') {
        code = 'INVALID_URL';
        if (!message) message = 'Invalid URL';
      } else if (issue.validation === 'uuid') {
        code = 'INVALID_UUID';
        if (!message) message = 'Invalid UUID';
      } else if (issue.validation === 'regex') {
        code = 'PATTERN_MISMATCH';
        if (!message) message = 'Invalid format';
      }
      break;
      
    case 'too_small':
      if (issue.type === 'string') {
        code = 'TOO_SHORT';
        if (!message) {
          message = issue.inclusive 
            ? `Should be at least ${issue.minimum} characters` 
            : `Should be more than ${issue.minimum} characters`;
        }
      } else if (issue.type === 'number') {
        code = 'TOO_SMALL';
        if (!message) {
          message = issue.inclusive 
            ? `Should be at least ${issue.minimum}` 
            : `Should be greater than ${issue.minimum}`;
        }
      } else if (issue.type === 'array') {
        code = 'TOO_FEW_ITEMS';
        if (!message) {
          message = issue.inclusive 
            ? `Should have at least ${issue.minimum} items` 
            : `Should have more than ${issue.minimum} items`;
        }
      }
      break;
      
    case 'too_big':
      if (issue.type === 'string') {
        code = 'TOO_LONG';
        if (!message) {
          message = issue.inclusive 
            ? `Should be at most ${issue.maximum} characters` 
            : `Should be less than ${issue.maximum} characters`;
        }
      } else if (issue.type === 'number') {
        code = 'TOO_LARGE';
        if (!message) {
          message = issue.inclusive 
            ? `Should be at most ${issue.maximum}` 
            : `Should be less than ${issue.maximum}`;
        }
      } else if (issue.type === 'array') {
        code = 'TOO_MANY_ITEMS';
        if (!message) {
          message = issue.inclusive 
            ? `Should have at most ${issue.maximum} items` 
            : `Should have fewer than ${issue.maximum} items`;
        }
      }
      break;
      
    case 'custom':
      code = 'CUSTOM';
      if (!message) message = 'Validation failed';
      break;
      
    case 'invalid_union':
      code = 'INVALID_TYPE';
      if (!message) message = 'Invalid input';
      break;
      
    case 'invalid_enum_value':
      code = 'INVALID_VALUE';
      if (!message) {
        message = `Invalid value, should be one of: ${issue.options.map(o => `'${o}'`).join(', ')}`;
      }
      break;
      
    case 'invalid_date':
      code = 'INVALID_DATE';
      if (!message) message = 'Invalid date';
      break;
      
    default:
      code = 'INVALID_VALUE';
      if (!message) message = 'Invalid value';
  }
  
  return {
    field,
    message,
    code,
    value: undefined // Zod doesn't provide the original value
  };
}

/**
 * Convert a Zod error to field errors for AppError
 */
export function zodErrorToFieldErrors(error: ZodError): FieldError[] {
  return error.errors.map(zodIssueToFieldError);
}

/**
 * Convert a Zod error to an AppError
 */
export function zodErrorToAppError(
  error: ZodError,
  message: string = 'Validation failed',
  details?: Record<string, any>
): AppError {
  return new AppError({
    code: ErrorCode.VALIDATION_INVALID_VALUE,
    message,
    details,
    fieldErrors: zodErrorToFieldErrors(error)
  });
}

/**
 * Extract the first error message from a Zod error
 */
export function getFirstZodErrorMessage(error: ZodError): string {
  return error.errors[0]?.message || 'Validation failed';
}

/**
 * Extract error messages by field from a Zod error
 */
export function getZodErrorsByField(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const issue of error.errors) {
    const field = issue.path.join('.') || 'value';
    
    // Only add the first error for each field
    if (!result[field]) {
      result[field] = issue.message;
    }
  }
  
  return result;
}

/**
 * Format Zod error messages into a human-readable string
 */
export function formatZodError(error: ZodError): string {
  const errorsByField = getZodErrorsByField(error);
  
  return Object.entries(errorsByField)
    .map(([field, message]) => `${field}: ${message}`)
    .join(', ');
}