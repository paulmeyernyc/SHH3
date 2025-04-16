/**
 * Validation Types
 * 
 * This module defines the core types used throughout the validation framework.
 */

import { z } from 'zod';

/**
 * Result of a validation operation
 */
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Validation error information
 */
export interface ValidationError {
  path: string[];
  message: string;
  code: ValidationErrorCode;
  value?: any;
}

/**
 * Standard validation error codes
 */
export enum ValidationErrorCode {
  // Type validation
  INVALID_TYPE = 'INVALID_TYPE',
  REQUIRED = 'REQUIRED',
  
  // String validation
  TOO_SHORT = 'TOO_SHORT',
  TOO_LONG = 'TOO_LONG',
  INVALID_STRING = 'INVALID_STRING',
  PATTERN_MISMATCH = 'PATTERN_MISMATCH',
  
  // Numeric validation
  TOO_SMALL = 'TOO_SMALL',
  TOO_LARGE = 'TOO_LARGE',
  NOT_INTEGER = 'NOT_INTEGER',
  INVALID_NUMBER = 'INVALID_NUMBER',
  
  // Date validation
  INVALID_DATE = 'INVALID_DATE',
  DATE_TOO_EARLY = 'DATE_TOO_EARLY',
  DATE_TOO_LATE = 'DATE_TOO_LATE',
  
  // Array validation
  TOO_FEW_ITEMS = 'TOO_FEW_ITEMS',
  TOO_MANY_ITEMS = 'TOO_MANY_ITEMS',
  ARRAY_ELEMENT_INVALID = 'ARRAY_ELEMENT_INVALID',
  
  // Object validation
  INVALID_OBJECT = 'INVALID_OBJECT',
  UNKNOWN_KEYS = 'UNKNOWN_KEYS',
  
  // Format validation
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_URL = 'INVALID_URL',
  INVALID_UUID = 'INVALID_UUID',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_POSTAL_CODE = 'INVALID_POSTAL_CODE',
  
  // Domain-specific validation
  INVALID_NPI = 'INVALID_NPI',                 // National Provider Identifier
  INVALID_ICD_CODE = 'INVALID_ICD_CODE',       // ICD-10 or ICD-11 code
  INVALID_CPT_CODE = 'INVALID_CPT_CODE',       // CPT code
  INVALID_HCPCS_CODE = 'INVALID_HCPCS_CODE',   // HCPCS code
  INVALID_NDC_CODE = 'INVALID_NDC_CODE',       // National Drug Code
  INVALID_LOINC_CODE = 'INVALID_LOINC_CODE',   // LOINC code
  INVALID_SNOMED_CODE = 'INVALID_SNOMED_CODE', // SNOMED CT code
  INVALID_FHIR_ID = 'INVALID_FHIR_ID',         // FHIR resource ID
  INVALID_FHIR_REFERENCE = 'INVALID_FHIR_REFERENCE', // FHIR reference
  
  // HIPAA validation
  PHI_VALIDATION_ERROR = 'PHI_VALIDATION_ERROR', // Protected Health Information validation
  
  // Relationship validation
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',       // Referenced entity doesn't exist
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',   // Circular reference detected
  INVALID_RELATIONSHIP = 'INVALID_RELATIONSHIP', // Invalid relationship between entities
  
  // Business rule validation
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION', // Violates a business rule
  
  // Other
  CUSTOM = 'CUSTOM'                            // Custom validation error
}

/**
 * Validation context provides additional information for validation
 */
export interface ValidationContext {
  // User making the request (for permission-based validation)
  user?: {
    id: string | number;
    roles?: string[];
    permissions?: string[];
  };
  
  // Organization context (for multi-tenant validation)
  organization?: {
    id: string | number;
    type?: string;
  };
  
  // Operation context
  operation?: {
    type: 'create' | 'read' | 'update' | 'delete' | 'list' | 'search' | 'custom';
    name?: string;
  };
  
  // Environment context
  environment?: 'development' | 'test' | 'staging' | 'production';
  
  // Time context
  timestamp?: Date;
  
  // Request context
  request?: {
    id?: string;
    path?: string;
    method?: string;
  };
  
  // Dependency data for cross-entity validation
  entities?: Record<string, any>;
  
  // Custom context properties
  [key: string]: any;
}

/**
 * Validator function type
 */
export type Validator<T = any> = (
  value: any,
  context?: ValidationContext
) => ValidationResult<T>;

/**
 * Schema describes the shape of data and provides validation capabilities
 */
export interface ValidationSchema<T = any> {
  // Metadata
  id: string;
  name: string;
  description?: string;
  version?: string;
  
  // Validation methods
  validate: (value: any, context?: ValidationContext) => ValidationResult<T>;
  parseAsync: (value: any, context?: ValidationContext) => Promise<T>;
  parse: (value: any, context?: ValidationContext) => T;
  safeParse: (value: any, context?: ValidationContext) => ValidationResult<T>;
  
  // Schema definition (for introspection)
  definition: any;
  
  // Optional zodSchema for compatibility with zod ecosystem
  zodSchema?: z.ZodType<T>;
  
  // Utility methods
  extend: (extension: Partial<Omit<ValidationSchema<T>, 'extend'>>) => ValidationSchema<T>;
  refine: (refinement: (value: T, context: ValidationContext) => boolean | Promise<boolean>, message?: string) => ValidationSchema<T>;
  transform: <U>(transformer: (value: T, context: ValidationContext) => U | Promise<U>) => ValidationSchema<U>;
}

/**
 * ValidationRule defines a reusable validation constraint
 */
export interface ValidationRule {
  // Metadata
  id: string;
  name: string;
  description?: string;
  
  // Validation function
  validate: (value: any, context?: ValidationContext) => boolean;
  
  // Error information when validation fails
  errorMessage: string;
  errorCode: ValidationErrorCode;
  
  // Apply this rule to a schema (for fluent API)
  applyTo: <T>(schema: ValidationSchema<T>) => ValidationSchema<T>;
}

/**
 * Convert Zod errors to our standard validation errors
 */
export function fromZodError(error: z.ZodError): ValidationError[] {
  return error.errors.map(issue => {
    const path = issue.path;
    let code = ValidationErrorCode.CUSTOM;
    
    // Map Zod error codes to our standard codes
    switch (issue.code) {
      case 'invalid_type':
        code = issue.received === 'undefined' 
          ? ValidationErrorCode.REQUIRED 
          : ValidationErrorCode.INVALID_TYPE;
        break;
      case 'too_small':
        if (issue.type === 'string') code = ValidationErrorCode.TOO_SHORT;
        else if (issue.type === 'number') code = ValidationErrorCode.TOO_SMALL;
        else if (issue.type === 'array') code = ValidationErrorCode.TOO_FEW_ITEMS;
        else if (issue.type === 'date') code = ValidationErrorCode.DATE_TOO_EARLY;
        break;
      case 'too_big':
        if (issue.type === 'string') code = ValidationErrorCode.TOO_LONG;
        else if (issue.type === 'number') code = ValidationErrorCode.TOO_LARGE;
        else if (issue.type === 'array') code = ValidationErrorCode.TOO_MANY_ITEMS;
        else if (issue.type === 'date') code = ValidationErrorCode.DATE_TOO_LATE;
        break;
      case 'invalid_string':
        if (issue.validation === 'email') code = ValidationErrorCode.INVALID_EMAIL;
        else if (issue.validation === 'url') code = ValidationErrorCode.INVALID_URL;
        else if (issue.validation === 'uuid') code = ValidationErrorCode.INVALID_UUID;
        else if (issue.validation === 'regex') code = ValidationErrorCode.PATTERN_MISMATCH;
        else code = ValidationErrorCode.INVALID_STRING;
        break;
      case 'invalid_date':
        code = ValidationErrorCode.INVALID_DATE;
        break;
      default:
        code = ValidationErrorCode.CUSTOM;
    }
    
    return {
      path,
      message: issue.message,
      code,
      value: undefined // Zod doesn't provide access to original values
    };
  });
}

/**
 * Convert validation errors to a human-friendly object
 * with keys corresponding to field paths
 */
export function errorsToObject(errors: ValidationError[]): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const error of errors) {
    const key = error.path.join('.');
    result[key || 'value'] = error.message;
  }
  
  return result;
}