/**
 * Validation Middleware
 * 
 * This module provides Express middleware for request validation
 * using our validation framework.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ValidationSchema, ValidationContext } from '../common/types';
import { AppError } from '../../../microservices/common/error/app-error';
import { zodErrorToAppError } from '../../../microservices/common/error/zod-validation';

/**
 * Location in the request to validate
 */
export type ValidationLocation = 'body' | 'query' | 'params' | 'headers' | 'cookies';

/**
 * Validation options
 */
export interface ValidationOptions {
  // Where to look for data in the request
  location?: ValidationLocation;
  // Replace the original data with the validated data
  replace?: boolean;
  // Skip validation if the location doesn't exist or is empty
  skipIfEmpty?: boolean;
  // Context factory function
  contextFactory?: (req: Request) => ValidationContext;
  // Custom error handler
  errorHandler?: (error: any, req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Create validation middleware for Express
 */
export function createValidationMiddleware<T>(
  schema: ValidationSchema<T>,
  options: ValidationOptions = {}
) {
  const location = options.location || 'body';
  const replace = options.replace !== false; // Default to true
  const skipIfEmpty = options.skipIfEmpty || false;
  
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the data to validate
      const data = req[location as keyof Request];
      
      // Skip validation if data is empty and skipIfEmpty is true
      if (skipIfEmpty && (!data || (typeof data === 'object' && Object.keys(data).length === 0))) {
        return next();
      }
      
      // Create validation context if factory provided
      const context = options.contextFactory?.(req);
      
      // Validate the data
      const result = schema.validate(data, context);
      
      // Handle successful validation
      if (result.success) {
        // Replace the original data with the validated data if specified
        if (replace && result.data) {
          req[location as keyof Request] = result.data as any;
        }
        return next();
      }
      
      // Convert validation errors to AppError
      const appError = AppError.validation(
        result.errors?.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          code: error.code,
          value: error.value
        })) || [],
        `Validation failed for request ${location}`
      );
      
      // Use custom error handler if provided or pass to next
      if (options.errorHandler) {
        options.errorHandler(appError, req, res, next);
      } else {
        next(appError);
      }
    } catch (error) {
      // Handle Zod errors directly
      if (error instanceof ZodError) {
        const appError = zodErrorToAppError(
          error,
          `Validation failed for request ${location}`
        );
        
        if (options.errorHandler) {
          options.errorHandler(appError, req, res, next);
        } else {
          next(appError);
        }
      } else {
        // Pass other errors to next middleware
        next(error);
      }
    }
  };
}

/**
 * Shorthand function to validate request body
 */
export function validateBody<T>(
  schema: ValidationSchema<T>,
  options: Omit<ValidationOptions, 'location'> = {}
) {
  return createValidationMiddleware(schema, { ...options, location: 'body' });
}

/**
 * Shorthand function to validate request query parameters
 */
export function validateQuery<T>(
  schema: ValidationSchema<T>,
  options: Omit<ValidationOptions, 'location'> = {}
) {
  return createValidationMiddleware(schema, { ...options, location: 'query' });
}

/**
 * Shorthand function to validate URL parameters
 */
export function validateParams<T>(
  schema: ValidationSchema<T>,
  options: Omit<ValidationOptions, 'location'> = {}
) {
  return createValidationMiddleware(schema, { ...options, location: 'params' });
}

/**
 * Combine multiple validation middlewares into one
 */
export function validateRequest(validations: Array<(req: Request, res: Response, next: NextFunction) => void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Create an array of promises for each validation
    const validationPromises = validations.map(validation => {
      return new Promise<void>((resolve, reject) => {
        validation(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
    
    // Run all validations and call next when all are complete
    Promise.all(validationPromises)
      .then(() => next())
      .catch(err => next(err));
  };
}

/**
 * Create a validation context factory based on user authentication
 */
export function createAuthContextFactory() {
  return (req: Request): ValidationContext => {
    const user = req.user as any;
    
    return {
      user: user ? {
        id: user.id,
        roles: user.roles || [],
        permissions: user.permissions || []
      } : undefined,
      request: {
        id: req.id as string || req.headers['x-request-id'] as string,
        path: req.path,
        method: req.method
      },
      environment: process.env.NODE_ENV as any || 'development',
      timestamp: new Date()
    };
  };
}