/**
 * Audit Service Database Schema
 * 
 * This module defines the database schema for the Audit Service,
 * which tracks all system activities, data access, and changes
 * for compliance and security purposes.
 */

import { pgTable, text, timestamp, integer, uuid, boolean, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';

/**
 * Resource types that can be audited
 */
export const AUDIT_RESOURCE_TYPES = [
  'system',
  'user',
  'patient',
  'practitioner',
  'organization',
  'claim',
  'coverage',
  'encounter',
  'procedure',
  'medication',
  'document',
  'observation',
  'condition',
  'appointment',
  'message',
  'notification',
  'workflow',
  'subscription',
  'integration',
  'context',
  'service'
] as const;

export type AuditResourceType = typeof AUDIT_RESOURCE_TYPES[number];

/**
 * Actions that can be audited
 */
export const AUDIT_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'export',
  'import',
  'search',
  'login',
  'logout',
  'access',
  'error',
  'start',
  'stop',
  'configure',
  'subscribe',
  'unsubscribe',
  'execute',
  'complete',
  'fail',
  'retry'
] as const;

export type AuditAction = typeof AUDIT_ACTIONS[number];

/**
 * Status values for audit events
 */
export const AUDIT_STATUSES = [
  'success',
  'failure',
  'pending',
  'canceled',
  'warning'
] as const;

export type AuditStatus = typeof AUDIT_STATUSES[number];

/**
 * Main Audit Events Table
 * 
 * Tracks all auditable events across the system.
 */
export const auditEvents = pgTable('audit_events', {
  id: integer('id').primaryKey().serial(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  userId: integer('user_id'),
  username: text('username'),
  service: text('service').notNull(),
  ipAddress: text('ip_address'),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  action: text('action').notNull(),
  status: text('status').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  requestId: uuid('request_id'),
  sessionId: text('session_id'),
  organizationId: integer('organization_id'),
  retain: boolean('retain').default(false)
});

export const insertAuditEventSchema = createInsertSchema(auditEvents);

export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;

/**
 * Audit Data Changes Table
 * 
 * Tracks specific data changes for more detailed auditing.
 */
export const auditDataChanges = pgTable('audit_data_changes', {
  id: integer('id').primaryKey().serial(),
  auditEventId: integer('audit_event_id').notNull().references(() => auditEvents.id, { onDelete: 'cascade' }),
  field: text('field').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  timestamp: timestamp('timestamp').notNull().defaultNow()
});

export const insertAuditDataChangeSchema = createInsertSchema(auditDataChanges);

export type AuditDataChange = typeof auditDataChanges.$inferSelect;
export type InsertAuditDataChange = z.infer<typeof insertAuditDataChangeSchema>;

/**
 * Audit Access Table
 * 
 * Tracks data access events specifically for patient data.
 */
export const auditAccess = pgTable('audit_access', {
  id: integer('id').primaryKey().serial(),
  auditEventId: integer('audit_event_id').notNull().references(() => auditEvents.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  userId: integer('user_id'),
  username: text('username'),
  patientId: text('patient_id'),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  purpose: text('purpose'),
  accessGranted: boolean('access_granted').notNull(),
  denialReason: text('denial_reason'),
  consentId: text('consent_id'),
  ipAddress: text('ip_address'),
  sessionId: text('session_id'),
  emergencyAccess: boolean('emergency_access').default(false),
  metadata: jsonb('metadata')
});

export const insertAuditAccessSchema = createInsertSchema(auditAccess);

export type AuditAccess = typeof auditAccess.$inferSelect;
export type InsertAuditAccess = z.infer<typeof insertAuditAccessSchema>;

/**
 * Audit Retention Policy Table
 * 
 * Defines retention policies for audit data.
 */
export const auditRetentionPolicies = pgTable('audit_retention_policies', {
  id: integer('id').primaryKey().serial(),
  name: text('name').notNull().unique(),
  description: text('description'),
  resourceTypes: text('resource_types').array(),
  actions: text('actions').array(),
  retentionDays: integer('retention_days'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const insertAuditRetentionPolicySchema = createInsertSchema(auditRetentionPolicies);

export type AuditRetentionPolicy = typeof auditRetentionPolicies.$inferSelect;
export type InsertAuditRetentionPolicy = z.infer<typeof insertAuditRetentionPolicySchema>;

/**
 * Relation definitions for the audit schema
 */
export const auditRelations = {
  events: relations(auditEvents, ({ many }) => ({
    dataChanges: many(auditDataChanges),
    accessRecords: many(auditAccess)
  })),
  
  dataChanges: relations(auditDataChanges, ({ one }) => ({
    event: one(auditEvents, {
      fields: [auditDataChanges.auditEventId],
      references: [auditEvents.id]
    })
  })),
  
  access: relations(auditAccess, ({ one }) => ({
    event: one(auditEvents, {
      fields: [auditAccess.auditEventId],
      references: [auditEvents.id]
    })
  }))
};

/**
 * Export all necessary types and schemas for client library use
 */
export * from './audit-schema';

/**
 * Create a client configuration for the Audit Service client
 */
export interface AuditClientConfig {
  /**
   * Base URL of the Audit Service
   */
  baseURL: string;
  
  /**
   * Service name (required for all audit events)
   */
  serviceName: string;
  
  /**
   * Default timeout for requests in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to retry failed requests
   */
  retry?: boolean;
  
  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;
  
  /**
   * Additional HTTP headers to send with every request
   */
  headers?: Record<string, string>;
}