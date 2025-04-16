/**
 * FHIR Validation Example
 * 
 * This file demonstrates how to use the validation framework with FHIR resources.
 */

import { z } from 'zod';
import { createSchema, object, string, array, optional } from '../common/validators';
import { validateFHIRId, validateFHIRReference } from '../rules';
import { ValidationContext } from '../common/types';
import { AppError } from '../../../microservices/common/error/app-error';
import { ErrorCode } from '../../../microservices/common/error/error-types';
import { createValidator } from '../common/utils';

// FHIR Reference validator
const fhirReferenceSchema = string({
  id: 'fhir-reference',
  name: 'FHIR Reference',
  description: 'A reference to a FHIR resource'
}).refine(
  (value) => validateFHIRReference.validate(value),
  'Invalid FHIR reference format'
);

// FHIR Resource base schema
const fhirResourceBaseSchema = object(
  {
    resourceType: z.string().min(1, 'Resource type is required'),
    id: z.string().refine(
      value => validateFHIRId.validate(value),
      { message: 'Invalid FHIR resource ID format' }
    ).optional(),
    meta: z.object({
      versionId: z.string().optional(),
      lastUpdated: z.string().optional(),
      profile: z.array(z.string()).optional()
    }).optional()
  },
  {
    id: 'fhir-resource-base',
    name: 'FHIR Resource Base',
    description: 'Base schema for all FHIR resources'
  }
);

// FHIR Patient schema (simplified)
const fhirPatientSchema = fhirResourceBaseSchema.zodSchema.extend({
  resourceType: z.literal('Patient'),
  name: z.array(z.object({
    use: z.enum(['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden']).optional(),
    family: z.string().optional(),
    given: z.array(z.string()).optional(),
    prefix: z.array(z.string()).optional(),
    suffix: z.array(z.string()).optional(),
    text: z.string().optional()
  })).optional(),
  telecom: z.array(z.object({
    system: z.enum(['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other']),
    value: z.string(),
    use: z.enum(['home', 'work', 'temp', 'old', 'mobile']).optional(),
    rank: z.number().int().optional(),
    period: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional()
  })).optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  address: z.array(z.object({
    use: z.enum(['home', 'work', 'temp', 'old', 'billing']).optional(),
    type: z.enum(['postal', 'physical', 'both']).optional(),
    text: z.string().optional(),
    line: z.array(z.string()).optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    period: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional()
  })).optional(),
  active: z.boolean().optional()
});

// Create schema from Zod schema
const patientSchema = createSchema(fhirPatientSchema, {
  id: 'fhir-patient',
  name: 'FHIR Patient',
  description: 'Validation schema for FHIR Patient resources'
});

// FHIR Observation schema (simplified)
const fhirObservationSchema = fhirResourceBaseSchema.zodSchema.extend({
  resourceType: z.literal('Observation'),
  status: z.enum([
    'registered', 'preliminary', 'final', 'amended', 'corrected', 
    'cancelled', 'entered-in-error', 'unknown'
  ]),
  category: z.array(z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional()
    })),
    text: z.string().optional()
  })).optional(),
  code: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional()
    })).min(1, 'At least one coding is required'),
    text: z.string().optional()
  }),
  subject: z.object({
    reference: z.string().refine(
      value => validateFHIRReference.validate(value),
      { message: 'Invalid FHIR reference format' }
    ),
    type: z.string().optional(),
    display: z.string().optional()
  }),
  effectiveDateTime: z.string().optional(),
  effectivePeriod: z.object({
    start: z.string(),
    end: z.string().optional()
  }).optional(),
  valueQuantity: z.object({
    value: z.number(),
    unit: z.string().optional(),
    system: z.string().optional(),
    code: z.string().optional()
  }).optional(),
  valueString: z.string().optional(),
  valueBoolean: z.boolean().optional(),
  valueInteger: z.number().int().optional(),
  valueRange: z.object({
    low: z.object({
      value: z.number(),
      unit: z.string().optional(),
      system: z.string().optional(),
      code: z.string().optional()
    }).optional(),
    high: z.object({
      value: z.number(),
      unit: z.string().optional(),
      system: z.string().optional(),
      code: z.string().optional()
    }).optional()
  }).optional(),
  interpretation: z.array(z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional()
    })),
    text: z.string().optional()
  })).optional(),
  note: z.array(z.object({
    text: z.string()
  })).optional()
});

// Create schema from Zod schema
const observationSchema = createSchema(fhirObservationSchema, {
  id: 'fhir-observation',
  name: 'FHIR Observation',
  description: 'Validation schema for FHIR Observation resources'
});

// Example FHIR validation service
export class FHIRValidationService {
  // Validators
  private validatePatient = createValidator(patientSchema);
  private validateObservation = createValidator(observationSchema);
  
  // Helper function to validate a FHIR resource type
  validateResource(resource: any): boolean {
    // Check resource type
    if (!resource || !resource.resourceType) {
      throw new AppError({
        code: ErrorCode.FHIR_INVALID_RESOURCE,
        message: 'Missing resourceType property',
        details: { resource }
      });
    }
    
    // Validate based on resource type
    switch (resource.resourceType) {
      case 'Patient':
        return this.validatePatient(resource).success;
        
      case 'Observation':
        return this.validateObservation(resource).success;
        
      default:
        throw new AppError({
          code: ErrorCode.FHIR_UNSUPPORTED_OPERATION,
          message: `Resource type ${resource.resourceType} validation not implemented`,
          details: { resourceType: resource.resourceType }
        });
    }
  }
  
  // Validate that referenced resources exist
  async validateReferences(resource: any): Promise<boolean> {
    // Skip if no resource
    if (!resource) return false;
    
    // Function to extract all references
    const extractReferences = (obj: any, path: string[] = []): Array<{path: string[], value: string}> => {
      if (!obj || typeof obj !== 'object') return [];
      
      let references: Array<{path: string[], value: string}> = [];
      
      // Check for reference property
      if (obj.reference && typeof obj.reference === 'string' && validateFHIRReference.validate(obj.reference)) {
        references.push({ path: [...path, 'reference'], value: obj.reference });
      }
      
      // Recursively check all object properties
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
          // Handle arrays
          for (let i = 0; i < value.length; i++) {
            references = [...references, ...extractReferences(value[i], [...path, key, i.toString()])];
          }
        } else if (value && typeof value === 'object') {
          // Handle nested objects
          references = [...references, ...extractReferences(value, [...path, key])];
        }
      }
      
      return references;
    };
    
    // Extract all references from resource
    const references = extractReferences(resource);
    
    // No references to validate
    if (references.length === 0) return true;
    
    // Check each reference
    const invalidReferences: Array<{path: string[], value: string}> = [];
    
    for (const ref of references) {
      // Extract resource type and ID from reference
      // Format could be "ResourceType/id" or just "id"
      const parts = ref.value.split('/');
      let resourceType, id;
      
      if (parts.length === 2) {
        [resourceType, id] = parts;
      } else {
        id = parts[0];
        // Infer resource type if possible from context
        resourceType = this.inferResourceTypeFromPath(ref.path);
      }
      
      // Check if the referenced resource exists
      // const exists = await fhirRepository.resourceExists(resourceType, id);
      const exists = true; // Placeholder (in a real implementation, would check a database)
      
      if (!exists) {
        invalidReferences.push(ref);
      }
    }
    
    // If any references are invalid, throw an error
    if (invalidReferences.length > 0) {
      throw new AppError({
        code: ErrorCode.FHIR_INVALID_RESOURCE,
        message: 'Invalid references in FHIR resource',
        details: { invalidReferences }
      });
    }
    
    return true;
  }
  
  // Helper to infer resource type from path
  private inferResourceTypeFromPath(path: string[]): string {
    // Example of inference based on property names
    // This would be more comprehensive in a real implementation
    if (path.includes('subject')) return 'Patient';
    if (path.includes('performer')) return 'Practitioner';
    if (path.includes('location')) return 'Location';
    if (path.includes('encounter')) return 'Encounter';
    
    return 'Unknown';
  }
  
  // Process a FHIR resource with validation
  async processResource(resource: any): Promise<any> {
    // Basic validation
    if (!this.validateResource(resource)) {
      throw new AppError({
        code: ErrorCode.FHIR_INVALID_RESOURCE,
        message: 'Invalid FHIR resource',
        details: { resource, resourceType: resource?.resourceType }
      });
    }
    
    // Validate references
    await this.validateReferences(resource);
    
    // Would typically persist the resource here
    // const savedResource = await fhirRepository.save(resource);
    const savedResource = { ...resource, id: resource.id || 'generated-id' }; // Placeholder
    
    return savedResource;
  }
}