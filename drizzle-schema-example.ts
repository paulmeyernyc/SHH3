/**
 * Drizzle Schema Validation Example
 * 
 * This file demonstrates how to use the validation framework with Drizzle ORM schemas.
 */

import { pgTable, serial, text, integer, boolean, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { createSchemaFromDrizzleTable, enhanceSchemaWithBusinessRules } from '../common/utils';
import { ValidationErrorCode } from '../common/types';
import { validateNPI, validateUSPhone, validateUSPostalCode } from '../rules';

// Define Drizzle schemas

// Provider table
export const providers = pgTable('providers', {
  id: serial('id').primaryKey(),
  npi: varchar('npi', { length: 10 }).notNull().unique(),
  firstName: varchar('first_name', { length: 50 }).notNull(),
  lastName: varchar('last_name', { length: 50 }).notNull(),
  specialty: varchar('specialty', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 100 }),
  addressLine1: varchar('address_line1', { length: 100 }),
  addressLine2: varchar('address_line2', { length: 100 }),
  city: varchar('city', { length: 50 }),
  state: varchar('state', { length: 2 }),
  postalCode: varchar('postal_code', { length: 10 }),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Patient table
export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  mrn: varchar('mrn', { length: 20 }).notNull().unique(),
  firstName: varchar('first_name', { length: 50 }).notNull(),
  lastName: varchar('last_name', { length: 50 }).notNull(),
  dateOfBirth: timestamp('date_of_birth').notNull(),
  gender: varchar('gender', { length: 10 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  addressLine1: varchar('address_line1', { length: 100 }),
  addressLine2: varchar('address_line2', { length: 100 }),
  city: varchar('city', { length: 50 }),
  state: varchar('state', { length: 2 }),
  postalCode: varchar('postal_code', { length: 10 }),
  primaryProviderId: integer('primary_provider_id').references(() => providers.id),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Create insert schemas using Drizzle-Zod directly (low-level approach)
export const insertProviderSchema = createInsertSchema(providers, {
  // Can specify custom validation for fields here
  npi: z => z.string().refine(
    value => validateNPI.validate(value),
    { message: 'Invalid NPI format or check digit' }
  ),
  phone: z => z.string().refine(
    value => validateUSPhone.validate(value),
    { message: 'Invalid phone number format' }
  ),
  email: z => z.string().email('Invalid email address'),
  postalCode: z => z.string().optional().refine(
    value => !value || validateUSPostalCode.validate(value),
    { message: 'Invalid postal code format' }
  )
});

// Create Provider schema using our framework (high-level approach)
export const providerSchema = createSchemaFromDrizzleTable(providers, {
  id: 'provider',
  name: 'Provider',
  description: 'Healthcare provider schema',
  customValidations: {
    npi: value => validateNPI.validate(value) || 'Invalid NPI format or check digit',
    phone: value => validateUSPhone.validate(value) || 'Invalid phone number format',
    email: value => !value || z.string().email().safeParse(value).success || 'Invalid email address',
    postalCode: value => !value || validateUSPostalCode.validate(value) || 'Invalid postal code format'
  }
});

// Create Patient schema using our framework
export const patientSchema = createSchemaFromDrizzleTable(patients, {
  id: 'patient',
  name: 'Patient',
  description: 'Patient schema',
  exclude: ['id', 'createdAt', 'updatedAt'], // Exclude auto-generated fields
  customValidations: {
    gender: value => ['male', 'female', 'other', 'unknown'].includes(value) || 'Invalid gender value',
    phone: value => !value || validateUSPhone.validate(value) || 'Invalid phone number format',
    email: value => !value || z.string().email().safeParse(value).success || 'Invalid email address',
    postalCode: value => !value || validateUSPostalCode.validate(value) || 'Invalid postal code format',
    dateOfBirth: value => {
      const dob = new Date(value);
      const now = new Date();
      return dob <= now || 'Date of birth cannot be in the future';
    }
  }
});

// Enhance the patient schema with business rules
export const enhancedPatientSchema = enhanceSchemaWithBusinessRules(
  patientSchema,
  [
    {
      validate: (patient) => {
        // Example business rule: Adult patients should have a primary provider
        const dob = new Date(patient.dateOfBirth);
        const now = new Date();
        const age = now.getFullYear() - dob.getFullYear();
        
        // If patient is adult, primary provider should be specified
        if (age >= 18 && !patient.primaryProviderId) {
          return 'Adult patients must have a primary provider';
        }
        
        return true;
      },
      code: ValidationErrorCode.BUSINESS_RULE_VIOLATION
    }
  ]
);

// Example service method using Drizzle validation
export async function createPatient(patientData: z.infer<typeof insertProviderSchema>) {
  // Validate using our schema
  const validationResult = enhancedPatientSchema.validate(patientData);
  
  if (!validationResult.success) {
    // Process validation errors
    console.error('Validation failed:', validationResult.errors);
    throw new Error(`Validation failed: ${validationResult.errors?.map(e => e.message).join(', ')}`);
  }
  
  // In a real implementation, would use the db to insert the data
  // const result = await db.insert(patients).values(patientData).returning();
  // return result[0];
  
  return {
    id: 1,
    ...patientData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}