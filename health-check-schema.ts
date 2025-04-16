/**
 * Health Check and Service Discovery Schema
 * 
 * This module defines the schema for the Health Check and Service Discovery system:
 * - Service Registry (information about available services)
 * - Health Check Results (status and metrics data)
 * - Dependency Definitions (relationships between services)
 * - Performance Metrics (detailed performance data)
 */

import { pgTable, pgEnum, serial, text, timestamp, boolean, integer, jsonb, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums
export const serviceStatusEnum = pgEnum('service_status', [
  'online',
  'offline',
  'degraded',
  'maintenance'
]);

export const healthCheckStatusEnum = pgEnum('health_check_status', [
  'healthy',
  'unhealthy',
  'degraded',
  'warning'
]);

export const dependencyTypeEnum = pgEnum('dependency_type', [
  'service',
  'database',
  'cache',
  'storage',
  'external',
  'queue'
]);

export const metricTypeEnum = pgEnum('metric_type', [
  'gauge',     // Current value (e.g., memory usage)
  'counter',   // Always increasing value (e.g., requests count)
  'histogram', // Distribution of values (e.g., response times)
  'meter',     // Rate measurements (e.g., requests per second)
  'timer'      // Timing measurements (e.g., average execution time)
]);

// Tables
export const serviceRegistry = pgTable('service_registry', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  version: varchar('version', { length: 50 }).notNull(),
  description: text('description'),
  status: serviceStatusEnum('status').notNull().default('offline'),
  baseUrl: varchar('base_url', { length: 255 }),
  healthCheckPath: varchar('health_check_path', { length: 100 }).default('/health'),
  lastHeartbeat: timestamp('last_heartbeat').defaultNow(),
  registeredAt: timestamp('registered_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  metadata: jsonb('metadata')
});

export const healthCheckResults = pgTable('health_check_results', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id').notNull().references(() => serviceRegistry.id),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  status: healthCheckStatusEnum('status').notNull(),
  responseTime: integer('response_time'), // in milliseconds
  uptime: integer('uptime'), // in seconds
  memoryUsage: jsonb('memory_usage'),
  cpuUsage: jsonb('cpu_usage'),
  message: text('message'),
  details: jsonb('details')
});

export const serviceDependencies = pgTable('service_dependencies', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id').notNull().references(() => serviceRegistry.id),
  dependencyName: varchar('dependency_name', { length: 100 }).notNull(),
  dependencyType: dependencyTypeEnum('dependency_type').notNull(),
  isRequired: boolean('is_required').notNull().default(true),
  healthCheckPath: varchar('health_check_path', { length: 255 }),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  metadata: jsonb('metadata')
});

export const dependencyStatuses = pgTable('dependency_statuses', {
  id: serial('id').primaryKey(),
  dependencyId: integer('dependency_id').notNull().references(() => serviceDependencies.id),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  status: healthCheckStatusEnum('status').notNull(),
  responseTime: integer('response_time'), // in milliseconds
  message: text('message'),
  details: jsonb('details')
});

export const performanceMetrics = pgTable('performance_metrics', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id').notNull().references(() => serviceRegistry.id),
  name: varchar('name', { length: 100 }).notNull(),
  type: metricTypeEnum('type').notNull(),
  value: jsonb('value').notNull(),
  unit: varchar('unit', { length: 20 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  tags: jsonb('tags'),
  description: text('description')
});

// Relations
export const serviceRegistryRelations = relations(serviceRegistry, ({ many }) => ({
  healthChecks: many(healthCheckResults),
  dependencies: many(serviceDependencies),
  metrics: many(performanceMetrics)
}));

export const healthCheckResultsRelations = relations(healthCheckResults, ({ one }) => ({
  service: one(serviceRegistry, {
    fields: [healthCheckResults.serviceId],
    references: [serviceRegistry.id]
  })
}));

export const serviceDependenciesRelations = relations(serviceDependencies, ({ one, many }) => ({
  service: one(serviceRegistry, {
    fields: [serviceDependencies.serviceId],
    references: [serviceRegistry.id]
  }),
  statuses: many(dependencyStatuses)
}));

export const dependencyStatusesRelations = relations(dependencyStatuses, ({ one }) => ({
  dependency: one(serviceDependencies, {
    fields: [dependencyStatuses.dependencyId],
    references: [serviceDependencies.id]
  })
}));

export const performanceMetricsRelations = relations(performanceMetrics, ({ one }) => ({
  service: one(serviceRegistry, {
    fields: [performanceMetrics.serviceId],
    references: [serviceRegistry.id]
  })
}));

// Zod Schemas
export const insertServiceRegistrySchema = createInsertSchema(serviceRegistry, {
  description: z.string().optional(),
  baseUrl: z.string().url().optional(),
  healthCheckPath: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const insertHealthCheckResultSchema = createInsertSchema(healthCheckResults, {
  responseTime: z.number().nonnegative().optional(),
  uptime: z.number().nonnegative().optional(),
  memoryUsage: z.record(z.any()).optional(),
  cpuUsage: z.record(z.any()).optional(),
  message: z.string().optional(),
  details: z.record(z.any()).optional()
});

export const insertServiceDependencySchema = createInsertSchema(serviceDependencies, {
  healthCheckPath: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const insertDependencyStatusSchema = createInsertSchema(dependencyStatuses, {
  responseTime: z.number().nonnegative().optional(),
  message: z.string().optional(),
  details: z.record(z.any()).optional()
});

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics, {
  unit: z.string().optional(),
  tags: z.record(z.any()).optional(),
  description: z.string().optional()
});

// Types
export type ServiceRegistry = typeof serviceRegistry.$inferSelect;
export type HealthCheckResult = typeof healthCheckResults.$inferSelect;
export type ServiceDependency = typeof serviceDependencies.$inferSelect;
export type DependencyStatus = typeof dependencyStatuses.$inferSelect;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;

export type InsertServiceRegistry = z.infer<typeof insertServiceRegistrySchema>;
export type InsertHealthCheckResult = z.infer<typeof insertHealthCheckResultSchema>;
export type InsertServiceDependency = z.infer<typeof insertServiceDependencySchema>;
export type InsertDependencyStatus = z.infer<typeof insertDependencyStatusSchema>;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;

// Health check response types
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'warning';
  version: string;
  uptime: number;
  timestamp: string;
  message?: string;
  details?: {
    [key: string]: any;
  };
  dependencies?: DependencyHealthCheck[];
  metrics?: {
    [key: string]: any;
  };
}

export interface DependencyHealthCheck {
  name: string;
  type: 'service' | 'database' | 'cache' | 'storage' | 'external' | 'queue';
  status: 'healthy' | 'unhealthy' | 'degraded' | 'warning';
  responseTime?: number;
  message?: string;
  details?: {
    [key: string]: any;
  };
}