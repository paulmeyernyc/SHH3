/**
 * Claims Schema
 * 
 * This file defines the database schema for the dual-path claims submission
 * and tracking system. It supports both internal rules-based processing and
 * external payer forwarding.
 */
import { pgTable, text, timestamp, jsonb, integer, bigint, boolean, uuid, primary } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

//-----------------------------------------------
// Claims Table
//-----------------------------------------------
export const claims = pgTable('claims', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull(),
  providerId: text('provider_id').notNull(),
  payerId: text('payer_id').notNull(),
  organizationId: text('organization_id'),
  careEventId: text('care_event_id'),
  type: text('type').notNull().default('PROFESSIONAL'), // PROFESSIONAL, INSTITUTIONAL, DENTAL, PHARMACY, VISION
  status: text('status').notNull().default('DRAFT'), // DRAFT, SUBMITTED, PENDING, PROCESSING, ACCEPTED, PARTIAL, COMPLETE, REJECTED, ERROR
  totalAmount: integer('total_amount').notNull(), // In cents (e.g., $100.00 = 10000)
  processingPath: text('processing_path').notNull().default('AUTO'), // AUTO, INTERNAL, EXTERNAL
  data: jsonb('data'), // FHIR Claim resource or X12 837 content
  responseData: jsonb('response_data'), // FHIR ClaimResponse or X12 835 content
  errorData: jsonb('error_data'), // Error information if status is ERROR or REJECTED
  serviceStartDate: timestamp('service_start_date'),
  serviceEndDate: timestamp('service_end_date'),
  submittedDate: timestamp('submitted_date'),
  processedDate: timestamp('processed_date'),
  lastStatusUpdate: timestamp('last_status_update'),
  facilityId: text('facility_id'),
  locationId: text('location_id'),
  billingProviderId: text('billing_provider_id'),
  renderingProviderId: text('rendering_provider_id'),
  patientControlNumber: text('patient_control_number'),
  externalClaimId: text('external_claim_id'),
  internalRuleResults: jsonb('internal_rule_results'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

//-----------------------------------------------
// Claim Line Items Table
//-----------------------------------------------
export const claimLineItems = pgTable('claim_line_items', {
  id: text('id').primaryKey(),
  claimId: text('claim_id').notNull()
    .references(() => claims.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  serviceCode: text('service_code').notNull(), // CPT, HCPCS, etc.
  serviceDescription: text('service_description'),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(), // In cents
  totalPrice: integer('total_price').notNull(), // In cents (unitPrice * quantity)
  serviceDate: timestamp('service_date'),
  placeOfService: text('place_of_service'),
  diagnosisCodes: jsonb('diagnosis_codes').default([]), // Array of diagnosis codes linked to this service
  modifiers: jsonb('modifiers').default([]), // Array of service modifiers
  adjudicationData: jsonb('adjudication_data'), // Results of processing this line item
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

//-----------------------------------------------
// Claim Events Table (Audit Trail)
//-----------------------------------------------
export const claimEvents = pgTable('claim_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  claimId: text('claim_id').notNull()
    .references(() => claims.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // CLAIM_SUBMITTED, STATUS_CHANGE, PROCESSING_STARTED, etc.
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  status: text('status'), // Claim status at the time of the event
  userId: text('user_id'), // User who triggered the event, if applicable
  details: jsonb('details'), // Additional event details
  errorMessage: text('error_message'),
});

//-----------------------------------------------
// Claim Payer Forwards Table (External Processing)
//-----------------------------------------------
export const claimPayerForwards = pgTable('claim_payer_forwards', {
  id: uuid('id').primaryKey().defaultRandom(),
  claimId: text('claim_id').notNull()
    .references(() => claims.id, { onDelete: 'cascade' }),
  payerId: text('payer_id').notNull(),
  transportMethod: text('transport_method').notNull(), // API, SFTP, X12, MANUAL
  status: text('status').notNull().default('QUEUED'), // QUEUED, SENT, ACKNOWLEDGED, COMPLETED, REJECTED, FAILED, ERROR
  trackingNumber: text('tracking_number'), // Payer-assigned tracking number
  sentData: jsonb('sent_data'), // Data sent to the payer
  sentTimestamp: timestamp('sent_timestamp'),
  responseData: jsonb('response_data'), // Response from the payer
  responseTimestamp: timestamp('response_timestamp'),
  ackCode: text('ack_code'), // Acknowledgment code from the payer
  attemptCount: integer('attempt_count').notNull().default(0),
  nextAttempt: timestamp('next_attempt'),
  errorDetails: jsonb('error_details'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

//-----------------------------------------------
// Claim Rules Cache Table (Internal Processing)
//-----------------------------------------------
export const claimRulesCache = pgTable('claim_rules_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  cacheKey: text('cache_key').notNull().unique(),
  cacheType: text('cache_type').notNull(), // PAYER_CONTRACT, PATIENT_BENEFITS, etc.
  data: jsonb('data').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

//-----------------------------------------------
// Zod Schemas
//-----------------------------------------------

// Insert Schemas (for validation)
export const insertClaimSchema = createInsertSchema(claims);
export const insertClaimLineItemSchema = createInsertSchema(claimLineItems);
export const insertClaimEventSchema = createInsertSchema(claimEvents);
export const insertClaimPayerForwardSchema = createInsertSchema(claimPayerForwards);
export const insertClaimRulesCacheSchema = createInsertSchema(claimRulesCache);

// Types
export type Claim = typeof claims.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;

export type ClaimLineItem = typeof claimLineItems.$inferSelect;
export type InsertClaimLineItem = z.infer<typeof insertClaimLineItemSchema>;

export type ClaimEvent = typeof claimEvents.$inferSelect;
export type InsertClaimEvent = z.infer<typeof insertClaimEventSchema>;

export type ClaimPayerForward = typeof claimPayerForwards.$inferSelect;
export type InsertClaimPayerForward = z.infer<typeof insertClaimPayerForwardSchema>;

export type ClaimRulesCache = typeof claimRulesCache.$inferSelect;
export type InsertClaimRulesCache = z.infer<typeof insertClaimRulesCacheSchema>;