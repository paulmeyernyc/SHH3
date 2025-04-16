/**
 * Healthcare Validation Schemas
 * 
 * This module provides validation schemas for common healthcare data types.
 */

import { z } from 'zod';
import {
  string,
  number,
  boolean,
  date,
  object,
  array,
  optional,
  createSchema
} from '../common/validators';
import {
  validateNPI,
  validateICD10,
  validateCPT,
  validateLOINC,
  validateNDC,
  validateFHIRId,
  validateFHIRReference,
  validateUSPhone,
  validateUSPostalCode
} from '../rules';

/**
 * Schema for US address validation
 */
export const addressSchema = object(
  {
    line1: z.string().min(1, 'Address line 1 is required').max(100),
    line2: z.string().max(100).optional(),
    city: z.string().min(1, 'City is required').max(100),
    state: z.string().length(2, 'State must be a 2-letter code'),
    postalCode: z.string().refine(
      value => validateUSPostalCode.validate(value),
      { message: 'Invalid postal code format' }
    ),
    country: z.string().default('US')
  },
  {
    id: 'address',
    name: 'US Address',
    description: 'Validation schema for US addresses'
  }
);

/**
 * Schema for patient demographics
 */
export const demographicsSchema = object(
  {
    firstName: z.string().min(1, 'First name is required').max(50),
    middleName: z.string().max(50).optional(),
    lastName: z.string().min(1, 'Last name is required').max(50),
    dateOfBirth: z.coerce.date(),
    gender: z.enum(['male', 'female', 'other', 'unknown']),
    race: z.enum([
      'american-indian',
      'asian',
      'black',
      'pacific-islander',
      'white', 
      'multiple',
      'other',
      'unknown'
    ]).optional(),
    ethnicity: z.enum([
      'hispanic',
      'non-hispanic',
      'unknown'
    ]).optional(),
    preferredLanguage: z.string().max(50).optional()
  },
  {
    id: 'demographics',
    name: 'Patient Demographics',
    description: 'Validation schema for basic patient demographic information'
  }
);

/**
 * Schema for contact information
 */
export const contactInfoSchema = object(
  {
    phoneHome: z.string().refine(
      value => validateUSPhone.validate(value),
      { message: 'Invalid phone number format' }
    ).optional(),
    phoneCell: z.string().refine(
      value => validateUSPhone.validate(value),
      { message: 'Invalid phone number format' }
    ).optional(),
    phoneWork: z.string().refine(
      value => validateUSPhone.validate(value),
      { message: 'Invalid phone number format' }
    ).optional(),
    email: z.string().email().optional(),
    preferredContact: z.enum(['phoneHome', 'phoneCell', 'phoneWork', 'email']).optional(),
    address: addressSchema.zodSchema.optional()
  },
  {
    id: 'contact-info',
    name: 'Contact Information',
    description: 'Validation schema for patient contact information'
  }
);

/**
 * Schema for patient identifiers
 */
export const patientIdentifiersSchema = object(
  {
    mrn: z.string().min(1, 'Medical record number is required'),
    ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, 'SSN must be in format XXX-XX-XXXX').optional(),
    driverLicense: z.string().optional(),
    passportNumber: z.string().optional(),
    insuranceIds: z.array(z.string()).optional()
  },
  {
    id: 'patient-identifiers',
    name: 'Patient Identifiers',
    description: 'Validation schema for patient identification numbers'
  }
);

/**
 * Schema for healthcare provider
 */
export const providerSchema = object(
  {
    npi: z.string().refine(
      value => validateNPI.validate(value),
      { message: 'Invalid NPI format or check digit' }
    ),
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    credentials: z.array(z.string()).optional(),
    specialty: z.string().min(1, 'Specialty is required'),
    contactInfo: contactInfoSchema.zodSchema.optional(),
    facilityId: z.string().optional()
  },
  {
    id: 'provider',
    name: 'Healthcare Provider',
    description: 'Validation schema for healthcare providers'
  }
);

/**
 * Schema for facility/organization
 */
export const facilitySchema = object(
  {
    name: z.string().min(1, 'Facility name is required'),
    npi: z.string().refine(
      value => validateNPI.validate(value),
      { message: 'Invalid NPI format or check digit' }
    ).optional(),
    type: z.enum([
      'hospital',
      'clinic',
      'pharmacy',
      'lab',
      'imaging-center',
      'nursing-home',
      'home-health',
      'other'
    ]),
    address: addressSchema.zodSchema,
    phone: z.string().refine(
      value => validateUSPhone.validate(value),
      { message: 'Invalid phone number format' }
    ),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    active: z.boolean().default(true)
  },
  {
    id: 'facility',
    name: 'Healthcare Facility',
    description: 'Validation schema for healthcare facilities'
  }
);

/**
 * Schema for diagnosis
 */
export const diagnosisSchema = object(
  {
    code: z.string().refine(
      value => validateICD10.validate(value),
      { message: 'Invalid ICD-10 code format' }
    ),
    description: z.string().min(1, 'Description is required'),
    diagnosisDate: z.coerce.date().optional(),
    diagnosedBy: z.string().refine(
      value => validateNPI.validate(value),
      { message: 'Invalid NPI format or check digit' }
    ).optional(),
    status: z.enum(['active', 'resolved', 'remission', 'recurring']).optional(),
    notes: z.string().optional()
  },
  {
    id: 'diagnosis',
    name: 'Diagnosis',
    description: 'Validation schema for patient diagnoses'
  }
);

/**
 * Schema for procedure
 */
export const procedureSchema = object(
  {
    code: z.string().refine(
      value => validateCPT.validate(value),
      { message: 'Invalid CPT code format' }
    ),
    description: z.string().min(1, 'Description is required'),
    procedureDate: z.coerce.date(),
    performedBy: z.string().refine(
      value => validateNPI.validate(value),
      { message: 'Invalid NPI format or check digit' }
    ),
    facilityId: z.string().optional(),
    notes: z.string().optional(),
    outcome: z.enum(['successful', 'unsuccessful', 'aborted', 'complication']).optional()
  },
  {
    id: 'procedure',
    name: 'Procedure',
    description: 'Validation schema for medical procedures'
  }
);

/**
 * Schema for medication
 */
export const medicationSchema = object(
  {
    name: z.string().min(1, 'Medication name is required'),
    ndc: z.string().refine(
      value => validateNDC.validate(value),
      { message: 'Invalid NDC code format' }
    ).optional(),
    dosage: z.string().min(1, 'Dosage is required'),
    route: z.enum([
      'oral',
      'intravenous',
      'intramuscular',
      'subcutaneous',
      'topical',
      'inhaled',
      'rectal',
      'other'
    ]),
    frequency: z.string().min(1, 'Frequency is required'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    prescribedBy: z.string().refine(
      value => validateNPI.validate(value),
      { message: 'Invalid NPI format or check digit' }
    ),
    active: z.boolean().default(true),
    refills: z.number().int().min(0).optional(),
    notes: z.string().optional()
  },
  {
    id: 'medication',
    name: 'Medication',
    description: 'Validation schema for medications'
  }
);

/**
 * Schema for lab result
 */
export const labResultSchema = object(
  {
    loincCode: z.string().refine(
      value => validateLOINC.validate(value),
      { message: 'Invalid LOINC code format' }
    ),
    testName: z.string().min(1, 'Test name is required'),
    value: z.string().min(1, 'Result value is required'),
    units: z.string().optional(),
    referenceRange: z.string().optional(),
    interpretation: z.enum(['normal', 'abnormal', 'critical', 'inconclusive']).optional(),
    performedDate: z.coerce.date(),
    reportedDate: z.coerce.date().optional(),
    performedBy: z.string().optional(),
    notes: z.string().optional()
  },
  {
    id: 'lab-result',
    name: 'Lab Result',
    description: 'Validation schema for laboratory results'
  }
);

/**
 * Schema for vital signs
 */
export const vitalSignsSchema = object(
  {
    recordedAt: z.coerce.date(),
    recordedBy: z.string().optional(),
    temperature: z.number().optional(),
    temperatureUnit: z.enum(['celsius', 'fahrenheit']).optional(),
    heartRate: z.number().int().min(0).max(300).optional(),
    respiratoryRate: z.number().int().min(0).max(100).optional(),
    systolicBP: z.number().int().min(0).max(300).optional(),
    diastolicBP: z.number().int().min(0).max(200).optional(),
    bloodPressurePosition: z.enum(['sitting', 'standing', 'supine']).optional(),
    oxygenSaturation: z.number().min(0).max(100).optional(),
    height: z.number().optional(),
    heightUnit: z.enum(['cm', 'in']).optional(),
    weight: z.number().optional(),
    weightUnit: z.enum(['kg', 'lb']).optional(),
    bmi: z.number().optional(),
    painScore: z.number().int().min(0).max(10).optional(),
    notes: z.string().optional()
  },
  {
    id: 'vital-signs',
    name: 'Vital Signs',
    description: 'Validation schema for patient vital signs'
  }
);

/**
 * Schema for allergy
 */
export const allergySchema = object(
  {
    substance: z.string().min(1, 'Allergen substance is required'),
    type: z.enum(['medication', 'food', 'environmental', 'other']),
    reaction: z.string().min(1, 'Reaction is required'),
    severity: z.enum(['mild', 'moderate', 'severe', 'life-threatening', 'unknown']),
    active: z.boolean().default(true),
    onsetDate: z.coerce.date().optional(),
    recordedDate: z.coerce.date(),
    recordedBy: z.string().optional(),
    notes: z.string().optional()
  },
  {
    id: 'allergy',
    name: 'Allergy',
    description: 'Validation schema for patient allergies'
  }
);

/**
 * Schema for insurance coverage
 */
export const insuranceCoverageSchema = object(
  {
    payerId: z.string().min(1, 'Payer ID is required'),
    payerName: z.string().min(1, 'Payer name is required'),
    memberId: z.string().min(1, 'Member ID is required'),
    groupNumber: z.string().optional(),
    planName: z.string().optional(),
    planType: z.enum(['hmo', 'ppo', 'epo', 'pos', 'indemnity', 'medicare', 'medicaid', 'other']).optional(),
    relationshipToSubscriber: z.enum(['self', 'spouse', 'child', 'other']),
    subscriber: z.object({
      id: z.string().min(1, 'Subscriber ID is required'),
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      dateOfBirth: z.coerce.date().optional()
    }).optional(),
    effectiveDate: z.coerce.date(),
    expirationDate: z.coerce.date().optional(),
    priority: z.enum(['primary', 'secondary', 'tertiary', 'other']),
    active: z.boolean().default(true)
  },
  {
    id: 'insurance-coverage',
    name: 'Insurance Coverage',
    description: 'Validation schema for patient insurance coverage'
  }
);

/**
 * Schema for an insurance claim
 */
export const insuranceClaimSchema = object(
  {
    claimId: z.string().min(1, 'Claim ID is required'),
    patientId: z.string().min(1, 'Patient ID is required'),
    providerId: z.string().refine(
      value => validateNPI.validate(value),
      { message: 'Invalid NPI format or check digit' }
    ),
    facilityId: z.string().optional(),
    coverageId: z.string().min(1, 'Coverage ID is required'),
    serviceDate: z.coerce.date(),
    submissionDate: z.coerce.date(),
    diagnoses: z.array(z.string().refine(
      value => validateICD10.validate(value),
      { message: 'Invalid ICD-10 code format' }
    )),
    procedures: z.array(z.object({
      code: z.string().refine(
        value => validateCPT.validate(value),
        { message: 'Invalid CPT code format' }
      ),
      fee: z.number().min(0),
      quantity: z.number().int().min(1).default(1),
      modifiers: z.array(z.string()).optional()
    })),
    totalAmount: z.number().min(0),
    status: z.enum(['draft', 'submitted', 'in-process', 'returned', 'denied', 'partially-paid', 'paid']),
    adjudicationDate: z.coerce.date().optional(),
    paidAmount: z.number().min(0).optional(),
    notes: z.string().optional()
  },
  {
    id: 'insurance-claim',
    name: 'Insurance Claim',
    description: 'Validation schema for insurance claims'
  }
);

/**
 * Schema for a complete patient record
 */
export const patientRecordSchema = object(
  {
    id: z.string().min(1, 'Patient ID is required'),
    demographics: demographicsSchema.zodSchema,
    identifiers: patientIdentifiersSchema.zodSchema,
    contactInfo: contactInfoSchema.zodSchema,
    primaryProvider: z.string().refine(
      value => validateNPI.validate(value),
      { message: 'Invalid NPI format or check digit' }
    ).optional(),
    insurance: z.array(insuranceCoverageSchema.zodSchema).optional(),
    diagnoses: z.array(diagnosisSchema.zodSchema).optional(),
    medications: z.array(medicationSchema.zodSchema).optional(),
    allergies: z.array(allergySchema.zodSchema).optional(),
    procedures: z.array(procedureSchema.zodSchema).optional(),
    labResults: z.array(labResultSchema.zodSchema).optional(),
    vitalSigns: z.array(vitalSignsSchema.zodSchema).optional(),
    lastUpdated: z.coerce.date().default(() => new Date()),
    active: z.boolean().default(true)
  },
  {
    id: 'patient-record',
    name: 'Patient Record',
    description: 'Comprehensive validation schema for a complete patient record'
  }
);