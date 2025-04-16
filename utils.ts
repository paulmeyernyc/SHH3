/**
 * Validation Utilities
 * 
 * This module provides helper functions for working with validation schemas
 * and processing validation results.
 */

import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { PgTableWithColumns } from 'drizzle-orm/pg-core';

import { 
  ValidationSchema,
  ValidationContext,
  ValidationResult,
  ValidationError,
  ValidationErrorCode,
  errorsToObject
} from './types';
import { createSchema } from './validators';

/**
 * Extract form errors from a validation result
 * Returns a more user-friendly error object for forms
 */
export function extractFormErrors<T>(result: ValidationResult<T>): Record<string, string> {
  if (result.success || !result.errors) {
    return {};
  }
  
  return errorsToObject(result.errors);
}

/**
 * Create a validator function from a schema
 */
export function createValidator<T>(schema: ValidationSchema<T>) {
  return (value: any, context?: ValidationContext) => {
    return schema.validate(value, context);
  };
}

/**
 * Create a validation schema from a Drizzle table
 */
export function createSchemaFromDrizzleTable<T extends PgTableWithColumns<any>>(
  table: T, 
  options?: {
    id?: string;
    name?: string;
    description?: string;
    exclude?: string[];
    required?: string[];
    customValidations?: Record<string, (value: any) => boolean | string>;
  }
): ValidationSchema<z.infer<ReturnType<typeof createInsertSchema>>> {
  const insertSchema = createInsertSchema(table, {
    // If exclude is provided, omit those fields
    ...(options?.exclude ? { exclude: options.exclude } : {})
  });
  
  // Add additional validations from options
  let zodSchema = insertSchema;
  
  // If required fields are specified, mark them as such
  if (options?.required && options.required.length > 0) {
    // This needs more sophisticated handling since we'd need to modify
    // the shape of the schema. For now, we'll just document it.
    console.warn('Required fields option not fully implemented for Drizzle schemas');
  }
  
  // If custom validations are provided, apply them
  if (options?.customValidations) {
    for (const [field, validation] of Object.entries(options.customValidations)) {
      zodSchema = zodSchema.refine(
        (data) => {
          const result = validation(data[field]);
          return typeof result === 'boolean' ? result : false;
        },
        (data) => {
          const result = validation(data[field]);
          return {
            message: typeof result === 'string' ? result : `Invalid value for field '${field}'`,
            path: [field]
          };
        }
      );
    }
  }
  
  // Create and return the validation schema
  return createSchema(zodSchema, {
    id: options?.id || `drizzle:${table._.name}`,
    name: options?.name || `${table._.name.charAt(0).toUpperCase() + table._.name.slice(1)}Schema`,
    description: options?.description || `Validation schema for ${table._.name}`
  });
}

/**
 * Enhance a schema with validation rules from business requirements
 */
export function enhanceSchemaWithBusinessRules<T>(
  schema: ValidationSchema<T>,
  rules: Array<{
    validate: (value: T, context?: ValidationContext) => boolean | string;
    message?: string;
    code?: ValidationErrorCode;
  }>
): ValidationSchema<T> {
  let zodSchema = schema.zodSchema as z.ZodType<T>;
  
  for (const rule of rules) {
    zodSchema = zodSchema.refine(
      (value) => {
        const result = rule.validate(value);
        return typeof result === 'boolean' ? result : false;
      },
      (value) => {
        const result = rule.validate(value);
        return {
          message: typeof result === 'string' 
            ? result 
            : rule.message || 'Business rule validation failed',
          code: rule.code || ValidationErrorCode.BUSINESS_RULE_VIOLATION
        };
      }
    );
  }
  
  return createSchema(zodSchema, {
    id: schema.id,
    name: schema.name,
    description: schema.description,
    version: schema.version
  });
}

/**
 * Combine validation errors from multiple sources
 */
export function combineValidationErrors(
  ...errorArrays: Array<ValidationError[] | undefined>
): ValidationError[] {
  const result: ValidationError[] = [];
  
  for (const errors of errorArrays) {
    if (errors && errors.length) {
      result.push(...errors);
    }
  }
  
  return result;
}

/**
 * Check if a value passes a validation schema
 */
export function isValid<T>(
  schema: ValidationSchema<T>,
  value: any,
  context?: ValidationContext
): boolean {
  return schema.validate(value, context).success;
}

/**
 * Create a schema for partial validation (all fields optional)
 * Useful for PATCH operations
 */
export function createPartialSchema<T>(
  schema: ValidationSchema<T>,
  options?: {
    id?: string;
    name?: string;
    description?: string;
    requiredFields?: string[];
  }
): ValidationSchema<Partial<T>> {
  // Start with a partial schema
  let zodSchema = schema.zodSchema?.partial() as z.ZodType<Partial<T>>;
  
  // Make specified fields required again if requiredFields is provided
  if (options?.requiredFields && options.requiredFields.length > 0) {
    // This is a simplification - it would need more type safety in practice
    const shape = zodSchema.shape || {};
    const required: Record<string, any> = {};
    
    // Make the specified fields required
    for (const field of options.requiredFields) {
      if (shape[field]) {
        // Use the unwrapped schema (remove .optional())
        required[field] = (shape[field] as any)._def.innerType;
      }
    }
    
    // Merge required fields with the partial schema
    zodSchema = zodSchema.merge(z.object(required)) as z.ZodType<Partial<T>>;
  }
  
  return createSchema(zodSchema, {
    id: options?.id || `partial:${schema.id}`,
    name: options?.name || `Partial ${schema.name}`,
    description: options?.description || `Partial validation schema for ${schema.name}`
  });
}

/**
 * Validate data against multiple schemas
 */
export function validateWithMultipleSchemas<T>(
  value: any,
  schemas: ValidationSchema<T>[],
  context?: ValidationContext
): ValidationResult<T> {
  // Try each schema in sequence until one succeeds
  for (const schema of schemas) {
    const result = schema.validate(value, context);
    if (result.success) {
      return result;
    }
  }
  
  // All schemas failed, combine errors from all schemas
  const allErrors: ValidationError[] = [];
  for (const schema of schemas) {
    const result = schema.validate(value, context);
    if (!result.success && result.errors) {
      allErrors.push(...result.errors);
    }
  }
  
  return {
    success: false,
    errors: allErrors
  };
}

/**
 * Create a schema with contextual validation
 * Validation will change depending on the context provided
 */
export function createContextualSchema<T>(
  baseSchema: ValidationSchema<T>,
  contextualValidations: Array<{
    condition: (context?: ValidationContext) => boolean;
    schema: ValidationSchema<T>;
  }>,
  options?: {
    id?: string;
    name?: string;
    description?: string;
  }
): ValidationSchema<T> {
  // Create a new schema with validation that depends on context
  return {
    id: options?.id || `contextual:${baseSchema.id}`,
    name: options?.name || `Contextual ${baseSchema.name}`,
    description: options?.description || `Context-dependent validation for ${baseSchema.name}`,
    version: baseSchema.version,
    
    // Use the base schema's definition
    definition: baseSchema.definition,
    zodSchema: baseSchema.zodSchema,
    
    // Context-aware validation methods
    validate(value: any, context?: ValidationContext): ValidationResult<T> {
      // Find a matching contextual validation
      for (const validation of contextualValidations) {
        if (validation.condition(context)) {
          return validation.schema.validate(value, context);
        }
      }
      
      // Default to base schema if no contextual validation matches
      return baseSchema.validate(value, context);
    },
    
    parse(value: any, context?: ValidationContext): T {
      const result = this.validate(value, context);
      if (!result.success) {
        throw new Error(`Validation failed: ${result.errors?.map(e => e.message).join(', ')}`);
      }
      return result.data as T;
    },
    
    async parseAsync(value: any, context?: ValidationContext): Promise<T> {
      const result = this.validate(value, context);
      if (!result.success) {
        throw new Error(`Validation failed: ${result.errors?.map(e => e.message).join(', ')}`);
      }
      return result.data as T;
    },
    
    safeParse(value: any, context?: ValidationContext): ValidationResult<T> {
      return this.validate(value, context);
    },
    
    // Schema modification methods
    extend(extension): ValidationSchema<T> {
      return {
        ...this,
        ...extension,
        extend: this.extend
      };
    },
    
    refine(refinement, message = 'Validation failed'): ValidationSchema<T> {
      // Apply refinement to each contextual schema
      const refinedContextuals = contextualValidations.map(validation => ({
        condition: validation.condition,
        schema: validation.schema.refine(refinement, message)
      }));
      
      return createContextualSchema(
        baseSchema.refine(refinement, message),
        refinedContextuals,
        {
          id: this.id,
          name: this.name,
          description: this.description
        }
      );
    },
    
    transform<U>(transformer): ValidationSchema<U> {
      // Apply transformer to each contextual schema
      const transformedContextuals = contextualValidations.map(validation => ({
        condition: validation.condition,
        schema: validation.schema.transform(transformer) as ValidationSchema<U>
      }));
      
      return createContextualSchema(
        baseSchema.transform(transformer) as ValidationSchema<U>,
        transformedContextuals,
        {
          id: this.id,
          name: this.name,
          description: this.description
        }
      ) as ValidationSchema<U>;
    }
  };
}