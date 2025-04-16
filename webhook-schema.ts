/**
 * Webhook System Database Schema
 * 
 * This module defines the database schema for the Webhook system:
 * - Webhook Subscriptions - External systems subscribe to events
 * - Webhook Events - Types of events that can be subscribed to
 * - Webhook Deliveries - Record of webhook delivery attempts
 */

import { pgTable, serial, text, jsonb, timestamp, boolean, integer, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enumerations
export const webhookStatusEnum = pgEnum('webhook_status', [
  'active', 'inactive', 'suspended', 'testing'
]);

export const deliveryStatusEnum = pgEnum('webhook_delivery_status', [
  'pending', 'delivered', 'failed', 'retry'
]);

export const securitySchemeEnum = pgEnum('webhook_security_scheme', [
  'none', 'basic', 'bearer', 'hmac', 'oauth2'
]);

// Webhook Events
export const webhookEvents = pgTable('webhook_events', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // Unique event name (e.g., "patient.created")
  displayName: text('display_name').notNull(), // Human-readable name
  description: text('description'), // Detailed description
  category: text('category').notNull(), // Grouping (e.g., "patient", "claim")
  samplePayload: jsonb('sample_payload').notNull().default('{}'), // Example payload
  payloadSchema: jsonb('payload_schema').notNull().default('{}'), // JSON Schema for validation
  isSystemEvent: boolean('is_system_event').notNull().default(false), // System events can't be deleted
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    nameIdx: index('webhook_event_name_idx').on(table.name),
    categoryIdx: index('webhook_event_category_idx').on(table.category)
  };
});

// Webhook Subscriptions
export const webhookSubscriptions = pgTable('webhook_subscriptions', {
  id: serial('id').primaryKey(),
  subscriberId: integer('subscriber_id').notNull(), // User or organization ID
  subscriberType: text('subscriber_type').notNull(), // "user" or "organization"
  name: text('name').notNull(), // Name of this subscription
  description: text('description'),
  status: webhookStatusEnum('status').notNull().default('active'),
  endpointUrl: text('endpoint_url').notNull(), // URL to deliver webhooks to
  events: text('events').array().notNull(), // Array of event names this subscription listens to
  
  // Security
  securityScheme: securitySchemeEnum('security_scheme').notNull().default('none'),
  securityKey: text('security_key'), // API key, client secret, etc.
  securityConfig: jsonb('security_config').notNull().default('{}'), // Additional security config

  // Settings
  contentType: text('content_type').notNull().default('application/json'),
  maxRetries: integer('max_retries').notNull().default(3),
  retryDelay: integer('retry_delay').notNull().default(60), // Seconds between retries
  timeout: integer('timeout').notNull().default(5), // Seconds to wait for response
  
  // Headers
  customHeaders: jsonb('custom_headers').notNull().default('{}'),
  
  // Filters
  filters: jsonb('filters').notNull().default('{}'), // Filtering criteria for events
  
  // Stats
  lastSuccessAt: timestamp('last_success_at', { mode: 'string' }),
  lastFailureAt: timestamp('last_failure_at', { mode: 'string' }),
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  
  // Metadata
  metadata: jsonb('metadata').notNull().default('{}'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    subscriberIdx: index('webhook_subscriber_idx').on(table.subscriberId, table.subscriberType),
    statusIdx: index('webhook_status_idx').on(table.status),
    eventsIdx: index('webhook_events_idx').on(table.events)
  };
});

// Webhook Deliveries
export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').notNull()
    .references(() => webhookSubscriptions.id),
  eventName: text('event_name').notNull(),
  eventId: text('event_id').notNull(), // UUID or other ID to identify this event instance
  status: deliveryStatusEnum('status').notNull().default('pending'),
  
  // Request
  payload: jsonb('payload').notNull(), // The actual data sent
  requestHeaders: jsonb('request_headers').notNull().default('{}'),
  requestedAt: timestamp('requested_at', { mode: 'string' }).notNull().defaultNow(),
  
  // Response
  responseStatus: integer('response_status'), // HTTP status code
  responseBody: text('response_body'),
  responseHeaders: jsonb('response_headers').notNull().default('{}'),
  respondedAt: timestamp('responded_at', { mode: 'string' }),
  
  // Retry info
  retryCount: integer('retry_count').notNull().default(0),
  nextRetryAt: timestamp('next_retry_at', { mode: 'string' }),
  
  // Error info
  error: text('error'),
  errorDetail: jsonb('error_detail').notNull().default('{}'),
  
  // Duration in milliseconds
  duration: integer('duration'),
  
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    subscriptionIdx: index('webhook_delivery_subscription_idx').on(table.subscriptionId),
    eventIdx: index('webhook_delivery_event_idx').on(table.eventName),
    statusIdx: index('webhook_delivery_status_idx').on(table.status),
    retryIdx: index('webhook_delivery_retry_idx').on(table.nextRetryAt)
  };
});

// Schema validation
export const insertWebhookEventSchema = createInsertSchema(webhookEvents);
export const insertWebhookSubscriptionSchema = createInsertSchema(webhookSubscriptions);
export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries);

// Types
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;

export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type InsertWebhookSubscription = z.infer<typeof insertWebhookSubscriptionSchema>;
export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;