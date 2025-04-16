/**
 * Universal Consent Service Schema
 *
 * This file defines the database schema for the Universal Consent Service,
 * which acts as the central Policy Decision Point (PDP) for all data access
 * across the Smart Health Hub platform.
 */

import { pgTable, serial, varchar, timestamp, text, json, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Consent status enum
export const consentStatusEnum = pgEnum('consent_status', [
  'active',      // Consent is currently active
  'draft',       // Consent is in draft/pending state
  'superseded',  // Consent has been replaced by a newer version
  'rejected',    // Consent was explicitly rejected
  'expired',     // Consent has reached its expiration date
  'revoked',     // Consent was explicitly revoked by the patient
  'entered-in-error' // Consent was created in error
]);

// Provision type enum
export const provisionTypeEnum = pgEnum('provision_type', [
  'deny',    // Explicitly denies access
  'permit'   // Explicitly permits access
]);

// Purpose of use enum
export const purposeOfUseEnum = pgEnum('purpose_of_use', [
  'TREAT',     // Treatment
  'ETREAT',    // Emergency treatment
  'HPAYMT',    // Healthcare payment
  'HOPERAT',   // Healthcare operations
  'PATRQT',    // Patient request
  'PUBHLTH',   // Public health
  'RESEARCH',  // Research
  'HMARKT',    // Healthcare marketing
  'HRESCH',    // Healthcare research
  'FAMRQT',    // Family request
  'LEGAL',     // Legal
  'COVERAGE'   // Insurance coverage
]);

// Data category/class enum (simplified version)
export const dataClassEnum = pgEnum('data_class', [
  'Laboratory',
  'Medication',
  'Condition',
  'Allergy',
  'Procedure',
  'Immunization',
  'Vital',
  'Observation',
  'DocumentReference',
  'DiagnosticReport',
  'CarePlan',
  'Encounter',
  'Practitioner',
  'Organization',
  'Device',
  'MedicationRequest',
  'Genomic',
  'MentalHealth',
  'SensitiveInformation',
  'BreakTheGlass'
]);

// Main consent table
export const consents = pgTable('consents', {
  id: serial('id').primaryKey(),
  consentId: varchar('consent_id', { length: 255 }).notNull().unique(), // Unique identifier (e.g., FHIR Id)
  patientId: varchar('patient_id', { length: 255 }).notNull(), // Patient giving consent
  status: consentStatusEnum('status').notNull().default('active'),
  scope: varchar('scope', { length: 100 }).notNull().default('patient-privacy'), // FHIR consent scope
  category: varchar('category', { length: 100 }).notNull(), // e.g., "64292-6" for release of information
  effectiveStart: timestamp('effective_start').notNull(), // When consent becomes active
  effectiveEnd: timestamp('effective_end'), // When consent expires (if applicable)
  organization: varchar('organization', { length: 255 }), // Organization managing the consent
  sourceAttachment: varchar('source_attachment', { length: 255 }), // Link to scanned document, if applicable
  policyText: text('policy_text'), // Human-readable description
  templateReference: varchar('template_reference', { length: 255 }), // Template used, if applicable
  previous: varchar('previous', { length: 255 }), // Previous version ID, if applicable
  createdBy: varchar('created_by', { length: 255 }).notNull(), // Who created this consent
  created: timestamp('created').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow()
});

// Consent provisions (granular rules within a consent)
export const consentProvisions = pgTable('consent_provisions', {
  id: serial('id').primaryKey(),
  consentId: varchar('consent_id', { length: 255 }).notNull(),
  type: provisionTypeEnum('type').notNull().default('permit'),
  provisionId: varchar('provision_id', { length: 255 }).notNull(), // Unique ID for this provision
  periodStart: timestamp('period_start'), // Specific time period for this provision (if different from consent)
  periodEnd: timestamp('period_end'),
  actorRole: varchar('actor_role', { length: 100 }), // e.g., "PRCP" for recipient
  actorReference: varchar('actor_reference', { length: 255 }), // Who is authorized, e.g., "Organization/123"
  actorDisplay: varchar('actor_display', { length: 255 }), // Display name of the actor
  purpose: json('purpose').array(), // Array of purpose of use codes
  securityLabel: json('security_label').array(), // Array of security labels
  dataClasses: json('data_classes').array(), // Array of data classes covered
  excludeClasses: json('exclude_classes').array(), // Classes explicitly excluded
  created: timestamp('created').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow()
});

// Access decisions (logs of consent decisions)
export const consentDecisions = pgTable('consent_decisions', {
  id: serial('id').primaryKey(),
  transactionId: varchar('transaction_id', { length: 255 }).notNull(), // Unique ID for this decision
  patientId: varchar('patient_id', { length: 255 }).notNull(), // Patient whose data is being accessed
  requesterId: varchar('requester_id', { length: 255 }).notNull(), // Who requested access
  requesterType: varchar('requester_type', { length: 100 }).notNull(), // Provider, organization, system, etc.
  resourceType: varchar('resource_type', { length: 100 }), // FHIR resource type being accessed
  dataCategory: varchar('data_category', { length: 100 }), // Data category being accessed
  purpose: purposeOfUseEnum('purpose').notNull(), // Purpose of use for this access
  decision: varchar('decision', { length: 50 }).notNull(), // PERMIT, DENY
  appliedConsentIds: json('applied_consent_ids').array(), // Consents applied to reach this decision
  breakGlass: boolean('break_glass').default(false), // Whether this was a break-glass override
  breakGlassReason: text('break_glass_reason'), // Reason for break-glass, if applicable
  accessTime: timestamp('access_time').notNull().defaultNow(),
  created: timestamp('created').notNull().defaultNow(),
});

// Consent notifications (e.g., for consent expiration)
export const consentNotifications = pgTable('consent_notifications', {
  id: serial('id').primaryKey(),
  consentId: varchar('consent_id', { length: 255 }).notNull(),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  notificationType: varchar('notification_type', { length: 100 }).notNull(), // expiry, renewal, creation, etc.
  status: varchar('status', { length: 50 }).notNull(), // pending, sent, acknowledged
  message: text('message').notNull(),
  channel: varchar('channel', { length: 50 }).notNull(), // email, push, sms, portal, etc.
  scheduledTime: timestamp('scheduled_time').notNull(),
  sentTime: timestamp('sent_time'),
  acknowledgedTime: timestamp('acknowledged_time'),
  created: timestamp('created').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow()
});

// Dynamic consent requests (pending approvals)
export const dynamicConsentRequests = pgTable('dynamic_consent_requests', {
  id: serial('id').primaryKey(),
  requestId: varchar('request_id', { length: 255 }).notNull().unique(),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  requesterId: varchar('requester_id', { length: 255 }).notNull(),
  requesterName: varchar('requester_name', { length: 255 }).notNull(),
  requesterOrganization: varchar('requester_organization', { length: 255 }),
  resourceTypes: json('resource_types').array(),
  purpose: purposeOfUseEnum('purpose').notNull(),
  requestMessage: text('request_message'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, approved, rejected, expired
  expiresAt: timestamp('expires_at').notNull(), // When this request expires if not acted on
  responseTime: timestamp('response_time'), // When patient responded
  responseConsentId: varchar('response_consent_id', { length: 255 }), // ID of created consent if approved
  created: timestamp('created').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow()
});

// Insert schemas for validation
export const insertConsentSchema = createInsertSchema(consents).omit({ 
  id: true, 
  created: true, 
  updated: true 
});

export const insertConsentProvisionSchema = createInsertSchema(consentProvisions).omit({ 
  id: true, 
  created: true, 
  updated: true 
});

export const insertConsentDecisionSchema = createInsertSchema(consentDecisions).omit({ 
  id: true, 
  created: true 
});

export const insertConsentNotificationSchema = createInsertSchema(consentNotifications).omit({ 
  id: true, 
  created: true, 
  updated: true 
});

export const insertDynamicConsentRequestSchema = createInsertSchema(dynamicConsentRequests).omit({ 
  id: true, 
  created: true, 
  updated: true 
});

// Types
export type Consent = typeof consents.$inferSelect;
export type InsertConsent = z.infer<typeof insertConsentSchema>;

export type ConsentProvision = typeof consentProvisions.$inferSelect;
export type InsertConsentProvision = z.infer<typeof insertConsentProvisionSchema>;

export type ConsentDecision = typeof consentDecisions.$inferSelect;
export type InsertConsentDecision = z.infer<typeof insertConsentDecisionSchema>;

export type ConsentNotification = typeof consentNotifications.$inferSelect;
export type InsertConsentNotification = z.infer<typeof insertConsentNotificationSchema>;

export type DynamicConsentRequest = typeof dynamicConsentRequests.$inferSelect;
export type InsertDynamicConsentRequest = z.infer<typeof insertDynamicConsentRequestSchema>;

// Authorization request schema (used for real-time PDP decisions)
export const authorizationRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  requesterId: z.string().min(1, 'Requester ID is required'),
  requesterType: z.string().min(1, 'Requester type is required'),
  resourceType: z.string().optional(),
  dataCategory: z.string().optional(),
  purpose: z.enum(['TREAT', 'ETREAT', 'HPAYMT', 'HOPERAT', 'PATRQT', 'PUBHLTH', 'RESEARCH', 'HMARKT', 'HRESCH', 'FAMRQT', 'LEGAL', 'COVERAGE']),
  breakGlass: z.boolean().default(false),
  breakGlassReason: z.string().optional(),
});

export type AuthorizationRequest = z.infer<typeof authorizationRequestSchema>;