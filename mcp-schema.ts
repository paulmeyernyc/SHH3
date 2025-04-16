/**
 * Model Context Protocol Database Schema
 * 
 * This module defines the database schema for storing Model Context Protocol (MCP)
 * integrations, models, and contexts.
 */

import { pgTable, serial, uuid, text, timestamp, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums for MCP entities
export const modelTypeEnum = pgEnum('model_type', [
  'prediction', 'classification', 'regression', 'reinforcement', 'unsupervised', 'other'
]);

export const modelDomainEnum = pgEnum('model_domain', [
  'healthcare', 'finance', 'education', 'transportation', 'other'
]);

export const contextTypeEnum = pgEnum('context_type', [
  'patient', 'provider', 'organization', 'encounter', 'location', 'custom'
]);

export const integrationTypeEnum = pgEnum('integration_type', [
  'source', 'sink', 'transform', 'custom'
]);

export const securityLevelEnum = pgEnum('security_level', [
  'public', 'internal', 'confidential', 'restricted'
]);

// Tables for MCP entities
export const mcpModel = pgTable('mcp_model', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').notNull().unique(),
  name: text('name').notNull(),
  version: text('version').notNull(),
  description: text('description'),
  type: modelTypeEnum('type').notNull(),
  domain: modelDomainEnum('domain').notNull(),
  created: timestamp('created').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow(),
  author: jsonb('author'),
  license: text('license'),
  repository: text('repository'),
  tags: jsonb('tags').notNull().default('[]'),
  inputSchema: jsonb('input_schema').notNull(),
  outputSchema: jsonb('output_schema').notNull(),
  contextRequirements: jsonb('context_requirements').notNull().default('[]'),
  securityLevel: securityLevelEnum('security_level').notNull().default('internal'),
});

export const mcpContext = pgTable('mcp_context', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  type: contextTypeEnum('type').notNull(),
  schema: jsonb('schema').notNull(),
  created: timestamp('created').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow(),
  version: text('version').notNull(),
  tags: jsonb('tags').notNull().default('[]'),
  required: boolean('required').notNull().default(false),
  securityLevel: securityLevelEnum('security_level').notNull().default('internal'),
});

export const mcpIntegration = pgTable('mcp_integration', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  version: text('version').notNull(),
  type: integrationTypeEnum('type').notNull(),
  created: timestamp('created').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow(),
  provider: jsonb('provider').notNull(),
  connectionParameters: jsonb('connection_parameters').notNull().default('[]'),
  capabilities: jsonb('capabilities').notNull().default('[]'),
  modelSupport: jsonb('model_support').notNull().default('[]'),
  contextSupport: jsonb('context_support').notNull().default('[]'),
  securityLevel: securityLevelEnum('security_level').notNull().default('internal'),
  active: boolean('active').notNull().default(true),
  configuration: jsonb('configuration'),
});

// Junction table for model-context relationships
export const mcpModelContext = pgTable('mcp_model_context', {
  id: serial('id').primaryKey(),
  modelId: serial('model_id').references(() => mcpModel.id).notNull(),
  contextId: serial('context_id').references(() => mcpContext.id).notNull(),
  created: timestamp('created').notNull().defaultNow(),
  priority: serial('priority').notNull().default(0),
  required: boolean('required').notNull().default(false),
});

// Junction table for model-integration relationships
export const mcpModelIntegration = pgTable('mcp_model_integration', {
  id: serial('id').primaryKey(),
  modelId: serial('model_id').references(() => mcpModel.id).notNull(),
  integrationId: serial('integration_id').references(() => mcpIntegration.id).notNull(),
  created: timestamp('created').notNull().defaultNow(),
  configuration: jsonb('configuration'),
  active: boolean('active').notNull().default(true),
});

// Define schemas for inserting data
export const insertMcpModelSchema = createInsertSchema(mcpModel);
export const insertMcpContextSchema = createInsertSchema(mcpContext);
export const insertMcpIntegrationSchema = createInsertSchema(mcpIntegration);
export const insertMcpModelContextSchema = createInsertSchema(mcpModelContext);
export const insertMcpModelIntegrationSchema = createInsertSchema(mcpModelIntegration);

// Define types for the Drizzle ORM
export type McpModel = typeof mcpModel.$inferSelect;
export type McpContext = typeof mcpContext.$inferSelect;
export type McpIntegration = typeof mcpIntegration.$inferSelect;
export type McpModelContext = typeof mcpModelContext.$inferSelect;
export type McpModelIntegration = typeof mcpModelIntegration.$inferSelect;

// Define types for inserting data
export type InsertMcpModel = z.infer<typeof insertMcpModelSchema>;
export type InsertMcpContext = z.infer<typeof insertMcpContextSchema>;
export type InsertMcpIntegration = z.infer<typeof insertMcpIntegrationSchema>;
export type InsertMcpModelContext = z.infer<typeof insertMcpModelContextSchema>;
export type InsertMcpModelIntegration = z.infer<typeof insertMcpModelIntegrationSchema>;