/**
 * Service Subscription Schema
 * 
 * This module defines the database schema for services, organization subscriptions,
 * and service capabilities.
 */

import { pgTable, serial, uuid, text, timestamp, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums for service-related entities
export const serviceStatusEnum = pgEnum('service_status', [
  'active', 'inactive', 'deprecated', 'beta', 'alpha'
]);

export const serviceTypeEnum = pgEnum('service_type', [
  'eligibility', 'claims', 'authorization', 'referral', 'clinical', 'analytics', 'financial', 'administrative', 'other'
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'inactive', 'pending', 'suspended', 'cancelled'
]);

// Services table - defines available services in the system
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  type: serviceTypeEnum('type').notNull(),
  status: serviceStatusEnum('status').notNull().default('active'),
  created: timestamp('created').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow(),
  version: text('version').notNull(),
  documentationUrl: text('documentation_url'),
  iconUrl: text('icon_url'),
  tags: jsonb('tags').notNull().default('[]'),
  capabilities: jsonb('capabilities').notNull().default('[]'),
  configuration: jsonb('configuration').notNull().default('{}'),
});

// Service capabilities table - defines granular capabilities within a service
export const serviceCapabilities = pgTable('service_capabilities', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').notNull().unique(),
  serviceId: serial('service_id').references(() => services.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  code: text('code').notNull(),
  created: timestamp('created').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow(),
  configuration: jsonb('configuration').notNull().default('{}'),
  active: boolean('active').notNull().default(true),
});

// Organization services table - maps organizations to services
export const organizationServices = pgTable('organization_services', {
  id: serial('id').primaryKey(),
  organizationId: serial('organization_id').notNull(), // References organization ID
  serviceId: serial('service_id').references(() => services.id).notNull(),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  created: timestamp('created').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow(),
  startDate: timestamp('start_date').notNull().defaultNow(),
  endDate: timestamp('end_date'),
  configurations: jsonb('configurations').notNull().default('{}'),
  contactEmail: text('contact_email'),
  notes: text('notes'),
});

// Organization service capabilities - maps organizations to specific capabilities
export const organizationServiceCapabilities = pgTable('organization_service_capabilities', {
  id: serial('id').primaryKey(),
  organizationServiceId: serial('organization_service_id').references(() => organizationServices.id).notNull(),
  capabilityId: serial('capability_id').references(() => serviceCapabilities.id).notNull(),
  enabled: boolean('enabled').notNull().default(true),
  created: timestamp('created').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow(),
  configurations: jsonb('configurations').notNull().default('{}'),
});

// Service plans - defines service plan tiers
export const servicePlans = pgTable('service_plans', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').notNull().unique(),
  serviceId: serial('service_id').references(() => services.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  tier: text('tier').notNull(), // e.g., 'basic', 'standard', 'premium', 'enterprise'
  created: timestamp('created').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow(),
  active: boolean('active').notNull().default(true),
  features: jsonb('features').notNull().default('[]'), // List of features included in this plan
  limitations: jsonb('limitations').notNull().default('{}'), // Any limitations like rate limits
  pricingInfo: jsonb('pricing_info').notNull().default('{}'), // Pricing details if applicable
});

// Service plan capabilities - defines which capabilities are included in which plans
export const servicePlanCapabilities = pgTable('service_plan_capabilities', {
  id: serial('id').primaryKey(),
  planId: serial('plan_id').references(() => servicePlans.id).notNull(),
  capabilityId: serial('capability_id').references(() => serviceCapabilities.id).notNull(),
  created: timestamp('created').notNull().defaultNow(),
  limitations: jsonb('limitations').notNull().default('{}'), // Capability-specific limitations within this plan
});

// Define schemas for inserting data
export const insertServiceSchema = createInsertSchema(services);
export const insertServiceCapabilitySchema = createInsertSchema(serviceCapabilities);
export const insertOrganizationServiceSchema = createInsertSchema(organizationServices);
export const insertOrganizationServiceCapabilitySchema = createInsertSchema(organizationServiceCapabilities);
export const insertServicePlanSchema = createInsertSchema(servicePlans);
export const insertServicePlanCapabilitySchema = createInsertSchema(servicePlanCapabilities);

// Define types for the Drizzle ORM
export type Service = typeof services.$inferSelect;
export type ServiceCapability = typeof serviceCapabilities.$inferSelect;
export type OrganizationService = typeof organizationServices.$inferSelect;
export type OrganizationServiceCapability = typeof organizationServiceCapabilities.$inferSelect;
export type ServicePlan = typeof servicePlans.$inferSelect;
export type ServicePlanCapability = typeof servicePlanCapabilities.$inferSelect;

// Define types for inserting data
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertServiceCapability = z.infer<typeof insertServiceCapabilitySchema>;
export type InsertOrganizationService = z.infer<typeof insertOrganizationServiceSchema>;
export type InsertOrganizationServiceCapability = z.infer<typeof insertOrganizationServiceCapabilitySchema>;
export type InsertServicePlan = z.infer<typeof insertServicePlanSchema>;
export type InsertServicePlanCapability = z.infer<typeof insertServicePlanCapabilitySchema>;