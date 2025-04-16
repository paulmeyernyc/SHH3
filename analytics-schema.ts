/**
 * Analytics/Reporting Service Database Schema
 * 
 * This module defines the database schema for the Analytics/Reporting service:
 * - Report Definitions (templates for reports)
 * - Report Executions (instances of report runs)
 * - Report Subscriptions (scheduled reports)
 * - Dashboards (collections of visualizations)
 * - Dashboard Items (individual visualizations)
 * - Data Aggregations (pre-computed aggregated data)
 * - Export History (tracking of data exports)
 */

import { pgTable, pgEnum, serial, varchar, text, integer, boolean, timestamp, date, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums
export const reportTypeEnum = pgEnum('report_type', [
  'operational', 'clinical', 'financial', 'compliance', 'custom'
]);

export const reportFormatEnum = pgEnum('report_format', [
  'pdf', 'csv', 'excel', 'html', 'json'
]);

export const reportFrequencyEnum = pgEnum('report_frequency', [
  'once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
]);

export const reportStatusEnum = pgEnum('report_status', [
  'pending', 'running', 'completed', 'failed', 'canceled'
]);

export const visualizationTypeEnum = pgEnum('visualization_type', [
  'bar', 'line', 'pie', 'table', 'heatmap', 'scatter', 'metric', 'custom'
]);

export const aggregationTypeEnum = pgEnum('aggregation_type', [
  'count', 'sum', 'average', 'min', 'max', 'median', 'percentile', 'custom'
]);

export const exportStatusEnum = pgEnum('export_status', [
  'pending', 'processing', 'completed', 'failed'
]);

// Tables
export const reportDefinitions = pgTable('report_definitions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  type: reportTypeEnum('type').notNull(),
  
  queryDefinition: jsonb('query_definition').notNull(), // SQL query or aggregation pipeline
  parameters: jsonb('parameters').default('[]'), // Required and optional parameters
  
  defaultFormat: reportFormatEnum('default_format').default('pdf'),
  templates: jsonb('templates').default('{}'), // Templates for different formats
  
  isSystem: boolean('is_system').default(false),
  isActive: boolean('is_active').default(true),
  
  ownerId: integer('owner_id'),
  organizationId: integer('organization_id'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by')
});

export const reportExecutions = pgTable('report_executions', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id').references(() => reportDefinitions.id).notNull(),
  
  parameters: jsonb('parameters').default('{}'), // Actual parameters used for this execution
  filters: jsonb('filters').default('{}'), // Filters applied for this execution
  
  status: reportStatusEnum('status').notNull().default('pending'),
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
  duration: integer('duration'), // in milliseconds
  
  resultFormat: reportFormatEnum('result_format').notNull(),
  resultLocation: text('result_location'), // URL or file path to the result
  resultMetadata: jsonb('result_metadata').default('{}'),
  
  rowCount: integer('row_count'),
  
  errorMessage: text('error_message'),
  errorDetails: jsonb('error_details').default('{}'),
  
  requestedBy: integer('requested_by').notNull(),
  
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const reportSubscriptions = pgTable('report_subscriptions', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id').references(() => reportDefinitions.id).notNull(),
  
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  
  parameters: jsonb('parameters').default('{}'), // Fixed parameters for the subscription
  filters: jsonb('filters').default('{}'), // Fixed filters for the subscription
  
  frequency: reportFrequencyEnum('frequency').notNull(),
  schedule: jsonb('schedule').notNull(), // Cron expression or scheduling details
  
  formats: jsonb('formats').notNull(), // Array of formats to generate
  
  recipients: jsonb('recipients').notNull(), // Array of users, emails, or endpoints
  deliveryOptions: jsonb('delivery_options').default('{}'), // How to deliver (email, portal, etc.)
  
  isActive: boolean('is_active').default(true),
  
  lastExecutionId: integer('last_execution_id').references(() => reportExecutions.id),
  nextExecutionTime: timestamp('next_execution_time'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by').notNull(),
  updatedBy: integer('updated_by')
});

export const dashboards = pgTable('dashboards', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  
  layout: jsonb('layout').default('{}'), // Layout configuration
  
  isSystem: boolean('is_system').default(false),
  isActive: boolean('is_active').default(true),
  
  ownerId: integer('owner_id'),
  organizationId: integer('organization_id'),
  
  refreshInterval: integer('refresh_interval'), // in seconds, null for manual refresh
  lastRefreshed: timestamp('last_refreshed'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by')
});

export const dashboardItems = pgTable('dashboard_items', {
  id: serial('id').primaryKey(),
  dashboardId: integer('dashboard_id').references(() => dashboards.id).notNull(),
  
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  
  visualizationType: visualizationTypeEnum('visualization_type').notNull(),
  
  queryDefinition: jsonb('query_definition').notNull(), // SQL query or aggregation definition
  parameters: jsonb('parameters').default('{}'), // Parameters for the query
  
  configuration: jsonb('configuration').notNull(), // Visualization-specific configuration
  
  position: jsonb('position').notNull(), // Position in the dashboard (x, y, width, height)
  
  isActive: boolean('is_active').default(true),
  
  lastRefreshed: timestamp('last_refreshed'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by')
});

export const dataAggregations = pgTable('data_aggregations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  
  sourceTable: varchar('source_table', { length: 100 }).notNull(),
  sourceQuery: text('source_query'),
  
  aggregationType: aggregationTypeEnum('aggregation_type').notNull(),
  aggregationConfig: jsonb('aggregation_config').notNull(),
  
  dimensions: jsonb('dimensions').default('[]'), // Fields to group by
  metrics: jsonb('metrics').default('[]'), // Fields to aggregate
  filters: jsonb('filters').default('{}'), // Pre-filters to apply
  
  temporalGranularity: varchar('temporal_granularity', { length: 50 }), // daily, weekly, monthly, etc.
  
  refreshSchedule: jsonb('refresh_schedule'), // When to refresh this aggregation
  lastRefreshed: timestamp('last_refreshed'),
  nextRefresh: timestamp('next_refresh'),
  
  resultTable: varchar('result_table', { length: 100 }), // Where aggregated data is stored
  resultSchema: jsonb('result_schema').default('{}'), // Schema of the result
  
  isActive: boolean('is_active').default(true),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by')
});

export const exportHistory = pgTable('export_history', {
  id: serial('id').primaryKey(),
  
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  
  dataSource: varchar('data_source', { length: 100 }).notNull(), // Table, report, or entity
  query: text('query'), // The query that was executed
  parameters: jsonb('parameters').default('{}'),
  filters: jsonb('filters').default('{}'),
  
  format: reportFormatEnum('format').notNull(),
  
  status: exportStatusEnum('status').notNull().default('pending'),
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
  duration: integer('duration'), // in milliseconds
  
  resultLocation: text('result_location'), // URL or file path
  resultMetadata: jsonb('result_metadata').default('{}'),
  
  rowCount: integer('row_count'),
  
  requestedBy: integer('requested_by').notNull(),
  approvedBy: integer('approved_by'),
  
  purpose: text('purpose'), // Why the export was requested
  
  errorMessage: text('error_message'),
  errorDetails: jsonb('error_details').default('{}'),
  
  expirationDate: timestamp('expiration_date'), // When the export file expires
  accessCount: integer('access_count').default(0),
  lastAccessed: timestamp('last_accessed'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Analytics metrics table for time-series data
export const analyticsMetrics = pgTable('analytics_metrics', {
  id: serial('id').primaryKey(),
  
  metricKey: varchar('metric_key', { length: 200 }).notNull(),
  metricName: varchar('metric_name', { length: 200 }).notNull(),
  
  metricValue: text('metric_value').notNull(), // Stored as text for flexibility
  valueType: varchar('value_type', { length: 50 }).notNull(), // number, string, boolean, etc.
  
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  date: date('date').notNull().default(sql`CURRENT_DATE`),
  
  dimensions: jsonb('dimensions').default('{}'), // Attribute dimensions like service, entity, etc.
  tags: jsonb('tags').default('[]'), // Additional tags for filtering
  
  source: varchar('source', { length: 100 }).notNull(), // Where this metric came from
  
  organizationId: integer('organization_id'),
  userId: integer('user_id'),
  
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// ZOD schemas for validation
export const insertReportDefinitionSchema = createInsertSchema(reportDefinitions, {
  queryDefinition: z.record(z.unknown()).or(z.array(z.unknown())),
  parameters: z.array(z.unknown()).optional(),
  templates: z.record(z.unknown()).optional()
});

export const insertReportExecutionSchema = createInsertSchema(reportExecutions, {
  parameters: z.record(z.unknown()).optional(),
  filters: z.record(z.unknown()).optional(),
  resultMetadata: z.record(z.unknown()).optional(),
  errorDetails: z.record(z.unknown()).optional()
});

export const insertReportSubscriptionSchema = createInsertSchema(reportSubscriptions, {
  parameters: z.record(z.unknown()).optional(),
  filters: z.record(z.unknown()).optional(),
  schedule: z.record(z.unknown()).or(z.string()),
  formats: z.array(z.string()),
  recipients: z.array(z.unknown()),
  deliveryOptions: z.record(z.unknown()).optional()
});

export const insertDashboardSchema = createInsertSchema(dashboards, {
  layout: z.record(z.unknown()).optional()
});

export const insertDashboardItemSchema = createInsertSchema(dashboardItems, {
  queryDefinition: z.record(z.unknown()).or(z.array(z.unknown())).or(z.string()),
  parameters: z.record(z.unknown()).optional(),
  configuration: z.record(z.unknown()),
  position: z.record(z.unknown())
});

export const insertDataAggregationSchema = createInsertSchema(dataAggregations, {
  aggregationConfig: z.record(z.unknown()),
  dimensions: z.array(z.unknown()).optional(),
  metrics: z.array(z.unknown()).optional(),
  filters: z.record(z.unknown()).optional(),
  refreshSchedule: z.record(z.unknown()).or(z.string()).optional(),
  resultSchema: z.record(z.unknown()).optional()
});

export const insertExportHistorySchema = createInsertSchema(exportHistory, {
  parameters: z.record(z.unknown()).optional(),
  filters: z.record(z.unknown()).optional(),
  resultMetadata: z.record(z.unknown()).optional(),
  errorDetails: z.record(z.unknown()).optional()
});

export const insertAnalyticsMetricSchema = createInsertSchema(analyticsMetrics, {
  dimensions: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional()
});

// Types
export type ReportDefinition = typeof reportDefinitions.$inferSelect;
export type ReportExecution = typeof reportExecutions.$inferSelect;
export type ReportSubscription = typeof reportSubscriptions.$inferSelect;
export type Dashboard = typeof dashboards.$inferSelect;
export type DashboardItem = typeof dashboardItems.$inferSelect;
export type DataAggregation = typeof dataAggregations.$inferSelect;
export type ExportHistory = typeof exportHistory.$inferSelect;
export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;

export type InsertReportDefinition = z.infer<typeof insertReportDefinitionSchema>;
export type InsertReportExecution = z.infer<typeof insertReportExecutionSchema>;
export type InsertReportSubscription = z.infer<typeof insertReportSubscriptionSchema>;
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;
export type InsertDashboardItem = z.infer<typeof insertDashboardItemSchema>;
export type InsertDataAggregation = z.infer<typeof insertDataAggregationSchema>;
export type InsertExportHistory = z.infer<typeof insertExportHistorySchema>;
export type InsertAnalyticsMetric = z.infer<typeof insertAnalyticsMetricSchema>;

// Relations
export const relations = {
  reportDefinitions: {
    executions: (reportDefinitions) => {
      return {
        relation: '1:n',
        references: [reportExecutions.reportId],
        source: reportDefinitions.id
      };
    },
    subscriptions: (reportDefinitions) => {
      return {
        relation: '1:n',
        references: [reportSubscriptions.reportId],
        source: reportDefinitions.id
      };
    }
  },
  reportExecutions: {
    definition: (reportExecutions) => {
      return {
        relation: 'n:1',
        references: [reportDefinitions.id],
        source: reportExecutions.reportId
      };
    }
  },
  reportSubscriptions: {
    definition: (reportSubscriptions) => {
      return {
        relation: 'n:1',
        references: [reportDefinitions.id],
        source: reportSubscriptions.reportId
      };
    },
    lastExecution: (reportSubscriptions) => {
      return {
        relation: 'n:1',
        references: [reportExecutions.id],
        source: reportSubscriptions.lastExecutionId
      };
    }
  },
  dashboards: {
    items: (dashboards) => {
      return {
        relation: '1:n',
        references: [dashboardItems.dashboardId],
        source: dashboards.id
      };
    }
  },
  dashboardItems: {
    dashboard: (dashboardItems) => {
      return {
        relation: 'n:1',
        references: [dashboards.id],
        source: dashboardItems.dashboardId
      };
    }
  }
};