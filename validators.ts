/**
 * Validators
 * 
 * This module provides core validation functions and schema builders
 * that integrate with Zod while providing our standardized validation interfaces.
 */

import { z } from 'zod';
import { 
  ValidationSchema, 
  ValidationContext, 
  ValidationResult,
  fromZodError 
} from './types';

/**
 * Create a ValidationSchema from a Zod schema
 */
export function createSchema<T>(
  zodSchema: z.ZodType<T>,
  options: {
    id: string;
    name: string;
    description?: string;
    version?: string;
  }
): ValidationSchema<T> {
  return {
    // Metadata
    id: options.id,
    name: options.name,
    description: options.description,
    version: options.version,
    
    // Schema definition
    definition: zodSchema,
    zodSchema,
    
    // Validation methods
    validate(value: any, context?: ValidationContext): ValidationResult<T> {
      return this.safeParse(value, context);
    },
    
    parse(value: any, context?: ValidationContext): T {
      try {
        // Apply context-based refinements if needed
        const result = zodSchema.parse(value);
        return result;
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw error;
      }
    },
    
    async parseAsync(value: any, context?: ValidationContext): Promise<T> {
      try {
        // Apply context-based refinements if needed
        const result = await zodSchema.parseAsync(value);
        return result;
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw error;
      }
    },
    
    safeParse(value: any, context?: ValidationContext): ValidationResult<T> {
      // Apply context-based refinements if needed
      const result = zodSchema.safeParse(value);
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return {
          success: false,
          errors: fromZodError(result.error)
        };
      }
    },
    
    // Schema modification methods
    extend(extension): ValidationSchema<T> {
      return {
        ...this,
        ...extension,
        // Preserve the original extend method
        extend: this.extend
      };
    },
    
    refine(refinement, message = 'Validation failed'): ValidationSchema<T> {
      const refinedSchema = zodSchema.refine(
        (value) => refinement(value, {} as ValidationContext),
        { message }
      );
      
      return createSchema(refinedSchema, {
        id: this.id,
        name: this.name,
        description: this.description,
        version: this.version
      });
    },
    
    transform<U>(transformer): ValidationSchema<U> {
      const transformedSchema = zodSchema.transform(
        (value) => transformer(value, {} as ValidationContext)
      );
      
      return createSchema(transformedSchema, {
        id: this.id,
        name: this.name,
        description: this.description,
        version: this.version
      });
    }
  };
}

/**
 * Create a string schema with common string validations
 */
export function string(options?: {
  id?: string;
  name?: string;
  description?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  format?: 'email' | 'url' | 'uuid' | 'date' | 'time' | 'datetime';
}): ValidationSchema<string> {
  let schema = z.string();
  
  if (options?.minLength !== undefined) {
    schema = schema.min(options.minLength, `Must be at least ${options.minLength} characters`);
  }
  
  if (options?.maxLength !== undefined) {
    schema = schema.max(options.maxLength, `Must be at most ${options.maxLength} characters`);
  }
  
  if (options?.pattern) {
    schema = schema.regex(options.pattern, 'Invalid format');
  }
  
  if (options?.format === 'email') {
    schema = schema.email('Invalid email address');
  } else if (options?.format === 'url') {
    schema = schema.url('Invalid URL');
  } else if (options?.format === 'uuid') {
    schema = schema.uuid('Invalid UUID');
  } else if (options?.format === 'date') {
    schema = schema.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');
  } else if (options?.format === 'time') {
    schema = schema.regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM:SS)');
  } else if (options?.format === 'datetime') {
    schema = schema.regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/,
      'Invalid datetime format (ISO 8601)'
    );
  }
  
  return createSchema(schema, {
    id: options?.id || 'string',
    name: options?.name || 'String',
    description: options?.description || 'String validation schema'
  });
}

/**
 * Create a number schema with common numeric validations
 */
export function number(options?: {
  id?: string;
  name?: string;
  description?: string;
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
  negative?: boolean;
  multipleOf?: number;
}): ValidationSchema<number> {
  let schema = z.number();
  
  if (options?.min !== undefined) {
    schema = schema.min(options.min, `Must be at least ${options.min}`);
  }
  
  if (options?.max !== undefined) {
    schema = schema.max(options.max, `Must be at most ${options.max}`);
  }
  
  if (options?.integer) {
    schema = schema.int('Must be an integer');
  }
  
  if (options?.positive) {
    schema = schema.positive('Must be positive');
  }
  
  if (options?.negative) {
    schema = schema.negative('Must be negative');
  }
  
  if (options?.multipleOf) {
    schema = schema.multipleOf(options.multipleOf, `Must be a multiple of ${options.multipleOf}`);
  }
  
  return createSchema(schema, {
    id: options?.id || 'number',
    name: options?.name || 'Number',
    description: options?.description || 'Number validation schema'
  });
}

/**
 * Create a boolean schema
 */
export function boolean(options?: {
  id?: string;
  name?: string;
  description?: string;
}): ValidationSchema<boolean> {
  return createSchema(z.boolean(), {
    id: options?.id || 'boolean',
    name: options?.name || 'Boolean',
    description: options?.description || 'Boolean validation schema'
  });
}

/**
 * Create a date schema with common date validations
 */
export function date(options?: {
  id?: string;
  name?: string;
  description?: string;
  min?: Date;
  max?: Date;
}): ValidationSchema<Date> {
  let schema = z.date();
  
  if (options?.min) {
    schema = schema.min(options.min, `Must be after ${options.min.toISOString().split('T')[0]}`);
  }
  
  if (options?.max) {
    schema = schema.max(options.max, `Must be before ${options.max.toISOString().split('T')[0]}`);
  }
  
  return createSchema(schema, {
    id: options?.id || 'date',
    name: options?.name || 'Date',
    description: options?.description || 'Date validation schema'
  });
}

/**
 * Create an array schema
 */
export function array<T>(
  itemSchema: ValidationSchema<T>,
  options?: {
    id?: string;
    name?: string;
    description?: string;
    minLength?: number;
    maxLength?: number;
    unique?: boolean;
  }
): ValidationSchema<T[]> {
  let schema = z.array(itemSchema.zodSchema as z.ZodType<T>);
  
  if (options?.minLength !== undefined) {
    schema = schema.min(options.minLength, `Must have at least ${options.minLength} items`);
  }
  
  if (options?.maxLength !== undefined) {
    schema = schema.max(options.maxLength, `Must have at most ${options.maxLength} items`);
  }
  
  if (options?.unique) {
    schema = schema.refine(
      (items) => new Set(items).size === items.length,
      'Items must be unique'
    );
  }
  
  return createSchema(schema, {
    id: options?.id || `array(${itemSchema.id})`,
    name: options?.name || `Array of ${itemSchema.name}`,
    description: options?.description || `Array validation schema for ${itemSchema.name}`
  });
}

/**
 * Create an object schema
 */
export function object<T extends z.ZodRawShape>(
  shape: T,
  options?: {
    id?: string;
    name?: string;
    description?: string;
    strict?: boolean;
  }
): ValidationSchema<z.infer<z.ZodObject<T>>> {
  let schema = options?.strict 
    ? z.object(shape).strict() 
    : z.object(shape);
  
  return createSchema(schema, {
    id: options?.id || 'object',
    name: options?.name || 'Object',
    description: options?.description || 'Object validation schema'
  });
}

/**
 * Create an enum schema
 */
export function enumeration<T extends [string, ...string[]]>(
  values: T,
  options?: {
    id?: string;
    name?: string;
    description?: string;
  }
): ValidationSchema<T[number]> {
  const schema = z.enum(values);
  
  return createSchema(schema, {
    id: options?.id || 'enum',
    name: options?.name || 'Enum',
    description: options?.description || `Enum validation schema (${values.join(', ')})`
  });
}

/**
 * Create a schema that allows a value to be optional
 */
export function optional<T>(
  schema: ValidationSchema<T>,
  options?: {
    id?: string;
    name?: string;
    description?: string;
    defaultValue?: T;
  }
): ValidationSchema<T | undefined> {
  let zodSchema = schema.zodSchema?.optional();
  
  if (options?.defaultValue !== undefined) {
    zodSchema = zodSchema?.default(options.defaultValue);
  }
  
  return createSchema(zodSchema as z.ZodType<T | undefined>, {
    id: options?.id || `optional(${schema.id})`,
    name: options?.name || `Optional ${schema.name}`,
    description: options?.description || `Optional validation schema for ${schema.name}`
  });
}

/**
 * Create a schema that allows a value to be nullable
 */
export function nullable<T>(
  schema: ValidationSchema<T>,
  options?: {
    id?: string;
    name?: string;
    description?: string;
  }
): ValidationSchema<T | null> {
  const zodSchema = schema.zodSchema?.nullable();
  
  return createSchema(zodSchema as z.ZodType<T | null>, {
    id: options?.id || `nullable(${schema.id})`,
    name: options?.name || `Nullable ${schema.name}`,
    description: options?.description || `Nullable validation schema for ${schema.name}`
  });
}

/**
 * Create a schema that validates against multiple possible schemas
 */
export function union<T extends [ValidationSchema<any>, ValidationSchema<any>, ...ValidationSchema<any>[]]>(
  schemas: T,
  options?: {
    id?: string;
    name?: string;
    description?: string;
  }
): ValidationSchema<z.infer<z.ZodUnion<{ [K in keyof T]: z.ZodType<T[K] extends ValidationSchema<infer U> ? U : any> }>>> {
  const zodSchemas = schemas.map(s => s.zodSchema) as [z.ZodType<any>, z.ZodType<any>, ...z.ZodType<any>[]];
  const schema = z.union(zodSchemas as any);
  
  return createSchema(schema, {
    id: options?.id || `union(${schemas.map(s => s.id).join(',')})`,
    name: options?.name || `Union of ${schemas.map(s => s.name).join(', ')}`,
    description: options?.description || 'Union validation schema'
  });
}

/**
 * Create a schema that intersects multiple schemas
 */
export function intersection<
  T1 extends ValidationSchema<any>,
  T2 extends ValidationSchema<any>
>(
  schema1: T1,
  schema2: T2,
  options?: {
    id?: string;
    name?: string;
    description?: string;
  }
): ValidationSchema<z.infer<z.ZodIntersection<
  z.ZodType<T1 extends ValidationSchema<infer U1> ? U1 : any>,
  z.ZodType<T2 extends ValidationSchema<infer U2> ? U2 : any>
>>> {
  const zodSchema = z.intersection(
    schema1.zodSchema as any,
    schema2.zodSchema as any
  );
  
  return createSchema(zodSchema, {
    id: options?.id || `intersection(${schema1.id},${schema2.id})`,
    name: options?.name || `Intersection of ${schema1.name} and ${schema2.name}`,
    description: options?.description || 'Intersection validation schema'
  });
}

/**
 * Create a schema that allows any value (use with caution)
 */
export function any(options?: {
  id?: string;
  name?: string;
  description?: string;
}): ValidationSchema<any> {
  return createSchema(z.any(), {
    id: options?.id || 'any',
    name: options?.name || 'Any',
    description: options?.description || 'Any value validation schema'
  });
}

/**
 * Create a schema that validates a record (dictionary)
 */
export function record<K extends string | number | symbol, V>(
  valueSchema: ValidationSchema<V>,
  options?: {
    id?: string;
    name?: string;
    description?: string;
    keySchema?: ValidationSchema<K>;
  }
): ValidationSchema<Record<K, V>> {
  const keyZodSchema = options?.keySchema?.zodSchema || z.string() as z.ZodType<K>;
  const schema = z.record(keyZodSchema, valueSchema.zodSchema as z.ZodType<V>);
  
  return createSchema(schema, {
    id: options?.id || `record(${valueSchema.id})`,
    name: options?.name || `Record of ${valueSchema.name}`,
    description: options?.description || `Record validation schema for ${valueSchema.name}`
  });
}

/**
 * Alias for createSchema to directly access underlying Zod schema
 */
export function schema<T>(zodSchema: z.ZodType<T>, options?: {
  id?: string;
  name?: string;
  description?: string;
}): ValidationSchema<T> {
  return createSchema(zodSchema, {
    id: options?.id || 'custom',
    name: options?.name || 'Custom',
    description: options?.description || 'Custom validation schema'
  });
}