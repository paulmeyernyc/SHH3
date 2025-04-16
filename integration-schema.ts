/**
 * Integration Schema Extensions for MCP
 * 
 * This schema extends the Model Context Protocol (MCP) with additional
 * tables and relations to support the Integration Gateway functionality
 */

import { relations, pgTable, serial, integer, text, timestamp, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import * as mcpSchema from './mcp-schema';

/**
 * Supported protocol types enum
 */
export const protocolTypeEnum = pgEnum('protocol_type', [
  'FHIR_R4',       // Fast Healthcare Interoperability Resources (R4)
  'FHIR_STU3',     // Fast Healthcare Interoperability Resources (STU3)
  'HL7v2',         // Health Level 7 Version 2
  'HL7v3',         // Health Level 7 Version 3
  'CDA',           // Clinical Document Architecture
  'DICOM',         // Digital Imaging and Communications in Medicine
  'X12_270',       // X12 270/271 Eligibility
  'X12_276',       // X12 276/277 Claim Status
  'X12_278',       // X12 278 Referral Authorization
  'X12_834',       // X12 834 Benefit Enrollment
  'X12_835',       // X12 835 Claim Payment
  'X12_837',       // X12 837 Claim Submission
  'NCPDP_D0',      // NCPDP Telecommunication Standard
  'CSV',           // Custom CSV Format
  'JSON',          // Custom JSON Format
  'CUSTOM'         // Other custom protocols
]);

/**
 * Connection security types enum
 */
export const securityTypeEnum = pgEnum('security_type', [
  'BASIC',         // Basic Authentication
  'API_KEY',       // API Key Authentication
  'OAUTH2',        // OAuth 2.0
  'JWT',           // JSON Web Token
  'MUTUAL_TLS',    // Mutual TLS Authentication
  'IP_WHITELIST',  // IP Whitelisting
  'NONE'           // No Authentication
]);

/**
 * Connection status enum
 */
export const connectionStatusEnum = pgEnum('connection_status', [
  'ACTIVE',        // Connection is active and operational
  'INACTIVE',      // Connection is temporarily disabled
  'TESTING',       // Connection is in testing phase
  'FAILED',        // Connection has failed recent health checks
  'PENDING'        // Connection is pending configuration/approval
]);

/**
 * Protocol mappings table
 * Defines how data maps between internal models and external protocols
 */
export const protocolMappings = pgTable('mcp_protocol_mappings', {
  id: serial('id').primaryKey(),
  modelId: integer('model_id').references(() => mcpSchema.models.id).notNull(),
  protocolType: protocolTypeEnum('protocol_type').notNull(),
  protocolVersion: text('protocol_version').notNull(),
  externalIdentifier: text('external_identifier').notNull(),
  description: text('description'),
  mappingDefinition: jsonb('mapping_definition').notNull(), // Field-level mappings
  transformationRules: jsonb('transformation_rules'), // Custom transformation logic
  validationRules: jsonb('validation_rules'), // Custom validation rules
  isDefault: boolean('is_default').default(false),
  organizationId: integer('organization_id').references(() => mcpSchema.organizations.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Protocol mapping fields table
 * Detailed field-level mappings between model properties and protocol fields
 */
export const protocolMappingFields = pgTable('mcp_protocol_mapping_fields', {
  id: serial('id').primaryKey(),
  mappingId: integer('mapping_id').references(() => protocolMappings.id).notNull(),
  modelField: text('model_field').notNull(), // Field path in internal model
  protocolField: text('protocol_field').notNull(), // Field path in external protocol
  dataType: text('data_type').notNull(), // Expected data type
  isRequired: boolean('is_required').default(false),
  defaultValue: text('default_value'),
  transformationExpression: text('transformation_expression'), // Expression for data transformation
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Connection profiles table
 * Stores configurations for connecting to external systems
 */
export const connectionProfiles = pgTable('mcp_connection_profiles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  organizationId: integer('organization_id').references(() => mcpSchema.organizations.id),
  protocolType: protocolTypeEnum('protocol_type').notNull(),
  protocolVersion: text('protocol_version').notNull(),
  connectionDetails: jsonb('connection_details').notNull(), // Contains endpoints, ports, etc.
  securityType: securityTypeEnum('security_type').notNull(),
  securitySettings: jsonb('security_settings'), // Encrypted credentials, certificates, etc.
  connectionOptions: jsonb('connection_options'), // Timeouts, retries, etc.
  status: connectionStatusEnum('connection_status').default('INACTIVE'),
  metadataCache: jsonb('metadata_cache'), // Cache of remote system metadata
  lastConnected: timestamp('last_connected'),
  healthCheckInterval: integer('health_check_interval').default(300), // In seconds
  createdBy: integer('created_by'), // User ID who created this
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Connection contexts table
 * Links connection profiles to MCP contexts for proper data interpretation
 */
export const connectionContexts = pgTable('mcp_connection_contexts', {
  id: serial('id').primaryKey(),
  connectionId: integer('connection_id').references(() => connectionProfiles.id).notNull(),
  contextId: integer('context_id').references(() => mcpSchema.contexts.id).notNull(),
  isDefault: boolean('is_default').default(false),
  mappingOverrides: jsonb('mapping_overrides'), // Any context-specific mapping overrides
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Integration logs table
 * Records all integration activity for audit and troubleshooting
 */
export const integrationLogs = pgTable('mcp_integration_logs', {
  id: serial('id').primaryKey(),
  connectionId: integer('connection_id').references(() => connectionProfiles.id).notNull(),
  direction: text('direction').notNull(), // INBOUND or OUTBOUND
  status: text('status').notNull(), // SUCCESS, ERROR, WARNING
  messageId: text('message_id'), // External message identifier if available
  contextId: integer('context_id').references(() => mcpSchema.contexts.id),
  requestData: jsonb('request_data'), // Original request data (may be redacted for PHI)
  responseData: jsonb('response_data'), // Response data (may be redacted for PHI)
  errorDetails: jsonb('error_details'), // Details of any errors
  processingTimeMs: integer('processing_time_ms'), // Processing time in milliseconds
  ipAddress: text('ip_address'), // Source IP address
  userId: integer('user_id'), // User who initiated if applicable
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  correlationId: text('correlation_id') // For tracking related operations
});

/**
 * Relations configuration
 */

export const protocolMappingsRelations = relations(protocolMappings, ({ one, many }) => ({
  model: one(mcpSchema.models, {
    fields: [protocolMappings.modelId],
    references: [mcpSchema.models.id]
  }),
  organization: one(mcpSchema.organizations, {
    fields: [protocolMappings.organizationId],
    references: [mcpSchema.organizations.id]
  }),
  fields: many(protocolMappingFields)
}));

export const protocolMappingFieldsRelations = relations(protocolMappingFields, ({ one }) => ({
  mapping: one(protocolMappings, {
    fields: [protocolMappingFields.mappingId],
    references: [protocolMappings.id]
  })
}));

export const connectionProfilesRelations = relations(connectionProfiles, ({ one, many }) => ({
  organization: one(mcpSchema.organizations, {
    fields: [connectionProfiles.organizationId],
    references: [mcpSchema.organizations.id]
  }),
  contexts: many(connectionContexts),
  logs: many(integrationLogs)
}));

export const connectionContextsRelations = relations(connectionContexts, ({ one }) => ({
  connection: one(connectionProfiles, {
    fields: [connectionContexts.connectionId],
    references: [connectionProfiles.id]
  }),
  context: one(mcpSchema.contexts, {
    fields: [connectionContexts.contextId],
    references: [mcpSchema.contexts.id]
  })
}));

export const integrationLogsRelations = relations(integrationLogs, ({ one }) => ({
  connection: one(connectionProfiles, {
    fields: [integrationLogs.connectionId],
    references: [connectionProfiles.id]
  }),
  context: one(mcpSchema.contexts, {
    fields: [integrationLogs.contextId],
    references: [mcpSchema.contexts.id]
  })
}));

/**
 * Zod schemas for validation
 */

// Protocol Mapping schemas
export const insertProtocolMappingSchema = createInsertSchema(protocolMappings, {
  mappingDefinition: z.record(z.string(), z.any()),
  transformationRules: z.record(z.string(), z.any()).optional(),
  validationRules: z.record(z.string(), z.any()).optional()
});

export const selectProtocolMappingSchema = createSelectSchema(protocolMappings, {
  mappingDefinition: z.record(z.string(), z.any()),
  transformationRules: z.record(z.string(), z.any()).optional(),
  validationRules: z.record(z.string(), z.any()).optional()
});

// Protocol Mapping Field schemas
export const insertProtocolMappingFieldSchema = createInsertSchema(protocolMappingFields);
export const selectProtocolMappingFieldSchema = createSelectSchema(protocolMappingFields);

// Connection Profile schemas
export const insertConnectionProfileSchema = createInsertSchema(connectionProfiles, {
  connectionDetails: z.record(z.string(), z.any()),
  securitySettings: z.record(z.string(), z.any()).optional(),
  connectionOptions: z.record(z.string(), z.any()).optional(),
  metadataCache: z.record(z.string(), z.any()).optional()
});

export const selectConnectionProfileSchema = createSelectSchema(connectionProfiles, {
  connectionDetails: z.record(z.string(), z.any()),
  securitySettings: z.record(z.string(), z.any()).optional(),
  connectionOptions: z.record(z.string(), z.any()).optional(),
  metadataCache: z.record(z.string(), z.any()).optional()
});

// Connection Context schemas
export const insertConnectionContextSchema = createInsertSchema(connectionContexts, {
  mappingOverrides: z.record(z.string(), z.any()).optional()
});

export const selectConnectionContextSchema = createSelectSchema(connectionContexts, {
  mappingOverrides: z.record(z.string(), z.any()).optional()
});

// Integration Log schemas
export const insertIntegrationLogSchema = createInsertSchema(integrationLogs, {
  requestData: z.record(z.string(), z.any()).optional(),
  responseData: z.record(z.string(), z.any()).optional(),
  errorDetails: z.record(z.string(), z.any()).optional()
});

export const selectIntegrationLogSchema = createSelectSchema(integrationLogs, {
  requestData: z.record(z.string(), z.any()).optional(),
  responseData: z.record(z.string(), z.any()).optional(),
  errorDetails: z.record(z.string(), z.any()).optional()
});

// Type definitions
export type ProtocolMapping = typeof protocolMappings.$inferSelect;
export type InsertProtocolMapping = typeof protocolMappings.$inferInsert;

export type ProtocolMappingField = typeof protocolMappingFields.$inferSelect;
export type InsertProtocolMappingField = typeof protocolMappingFields.$inferInsert;

export type ConnectionProfile = typeof connectionProfiles.$inferSelect;
export type InsertConnectionProfile = typeof connectionProfiles.$inferInsert;

export type ConnectionContext = typeof connectionContexts.$inferSelect;
export type InsertConnectionContext = typeof connectionContexts.$inferInsert;

export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type InsertIntegrationLog = typeof integrationLogs.$inferInsert;

// Re-export MCP types that we depend on
export type { Model, Context, Organization } from './mcp-schema';