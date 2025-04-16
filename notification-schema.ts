/**
 * Notification Service Database Schema
 * 
 * This module defines the database schema for the Notification service:
 * - Notification Templates
 * - Notification Channels
 * - Notifications
 * - Notification Deliveries
 * - Notification Preferences
 */

import { pgTable, serial, text, jsonb, timestamp, boolean, integer, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enumerations
export const notificationTypeEnum = pgEnum('notification_type', [
  'info', 'success', 'warning', 'error', 'alert', 'reminder'
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending', 'sent', 'delivered', 'read', 'failed', 'cancelled'
]);

export const notificationPriorityEnum = pgEnum('notification_priority', [
  'low', 'normal', 'high', 'urgent', 'critical'
]);

export const channelTypeEnum = pgEnum('channel_type', [
  'inapp', 'email', 'sms', 'push', 'webhook'
]);

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending', 'sent', 'delivered', 'read', 'failed', 'bounced'
]);

// Notification Templates
export const notificationTemplates = pgTable('notification_templates', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // Unique identifier for the template
  name: text('name').notNull(),
  description: text('description'),
  type: notificationTypeEnum('type').notNull().default('info'),
  subject: text('subject'),
  content: text('content').notNull(),
  contentType: text('contentType').notNull().default('text/plain'), // text/plain, text/html, etc.
  channels: text('channels').array(), // Supported channels for this template
  variables: jsonb('variables').notNull().default('[]'), // Variables used in the template
  metadata: jsonb('metadata').notNull().default('{}'),
  organizationId: integer('organizationId'), // Optional organization scope
  isSystem: boolean('isSystem').notNull().default(false), // If true, this is a system template that can't be deleted
  isActive: boolean('isActive').notNull().default(true),
  createdBy: integer('createdBy').notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    codeIdx: index('template_code_idx').on(table.code),
    typeIdx: index('template_type_idx').on(table.type),
    orgIdx: index('template_org_idx').on(table.organizationId),
    activeIdx: index('template_active_idx').on(table.isActive)
  };
});

// Notification Channels
export const notificationChannels = pgTable('notification_channels', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // Unique identifier for the channel
  name: text('name').notNull(),
  description: text('description'),
  type: channelTypeEnum('type').notNull(),
  config: jsonb('config').notNull().default('{}'), // Configuration for the channel
  isActive: boolean('isActive').notNull().default(true),
  organizationId: integer('organizationId'), // Optional organization scope
  metadata: jsonb('metadata').notNull().default('{}'),
  createdBy: integer('createdBy').notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    codeIdx: index('channel_code_idx').on(table.code),
    typeIdx: index('channel_type_idx').on(table.type),
    orgIdx: index('channel_org_idx').on(table.organizationId),
    activeIdx: index('channel_active_idx').on(table.isActive)
  };
});

// Notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  templateId: integer('templateId').references(() => notificationTemplates.id),
  type: notificationTypeEnum('type').notNull().default('info'),
  subject: text('subject'),
  content: text('content').notNull(),
  data: jsonb('data').notNull().default('{}'), // Data used to render the notification
  status: notificationStatusEnum('status').notNull().default('pending'),
  priority: notificationPriorityEnum('priority').notNull().default('normal'),
  recipientId: integer('recipientId').notNull(), // User ID of the recipient
  recipientRoles: text('recipientRoles').array(), // Roles that can receive this notification
  organizationId: integer('organizationId'), // Optional organization scope
  referenceType: text('referenceType'), // Type of entity referenced (e.g., "claim", "patient")
  referenceId: text('referenceId'), // ID of the referenced entity
  expiresAt: timestamp('expiresAt', { mode: 'string' }),
  metadata: jsonb('metadata').notNull().default('{}'),
  isRead: boolean('isRead').notNull().default(false),
  readAt: timestamp('readAt', { mode: 'string' }),
  createdBy: integer('createdBy').notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    recipientIdx: index('notification_recipient_idx').on(table.recipientId),
    statusIdx: index('notification_status_idx').on(table.status),
    typeIdx: index('notification_type_idx').on(table.type),
    referenceIdx: index('notification_reference_idx').on(table.referenceType, table.referenceId),
    orgIdx: index('notification_org_idx').on(table.organizationId),
    readIdx: index('notification_read_idx').on(table.isRead)
  };
});

// Notification Deliveries
export const notificationDeliveries = pgTable('notification_deliveries', {
  id: serial('id').primaryKey(),
  notificationId: integer('notificationId').notNull()
    .references(() => notifications.id),
  channelId: integer('channelId').notNull()
    .references(() => notificationChannels.id),
  status: deliveryStatusEnum('status').notNull().default('pending'),
  recipientAddress: text('recipientAddress'), // Email, phone number, device token, etc.
  sentAt: timestamp('sentAt', { mode: 'string' }),
  deliveredAt: timestamp('deliveredAt', { mode: 'string' }),
  readAt: timestamp('readAt', { mode: 'string' }),
  failedAt: timestamp('failedAt', { mode: 'string' }),
  failureReason: text('failureReason'),
  retries: integer('retries').notNull().default(0),
  maxRetries: integer('maxRetries').notNull().default(3),
  externalId: text('externalId'), // ID from external notification service
  providerResponse: jsonb('providerResponse').notNull().default('{}'),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    notificationIdx: index('delivery_notification_idx').on(table.notificationId),
    channelIdx: index('delivery_channel_idx').on(table.channelId),
    statusIdx: index('delivery_status_idx').on(table.status),
    sentIdx: index('delivery_sent_idx').on(table.sentAt)
  };
});

// Notification Preferences
export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('userId').notNull(),
  notificationTypes: text('notificationTypes').array(), // Types user wants to receive
  channelPreferences: jsonb('channelPreferences').notNull().default('{}'), // Map of types to channels
  schedulePreferences: jsonb('schedulePreferences').notNull().default('{}'), // Preferred delivery times
  disabled: boolean('disabled').notNull().default(false), // If true, disable all notifications
  disabledChannels: text('disabledChannels').array(), // Channels specifically disabled
  dndStart: text('dndStart'), // Do not disturb start time (HH:MM format)
  dndEnd: text('dndEnd'), // Do not disturb end time (HH:MM format)
  dndDays: text('dndDays').array(), // Days for DND (Mon, Tue, etc.)
  organizationId: integer('organizationId'), // Optional organization scope
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    userIdx: uniqueIndex('pref_user_idx').on(table.userId),
    orgIdx: index('pref_org_idx').on(table.organizationId),
    disabledIdx: index('pref_disabled_idx').on(table.disabled)
  };
});

// Schema validation
export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates);
export const insertNotificationChannelSchema = createInsertSchema(notificationChannels);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertNotificationDeliverySchema = createInsertSchema(notificationDeliveries);
export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences);

// Types
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type NotificationChannel = typeof notificationChannels.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
export type InsertNotificationChannel = z.infer<typeof insertNotificationChannelSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertNotificationDelivery = z.infer<typeof insertNotificationDeliverySchema>;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;