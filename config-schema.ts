/**
 * Configuration Management Service Database Schema
 * 
 * This module defines the database schema for the Configuration Management Service,
 * which provides centralized configuration for all microservices in the platform.
 */

import { pgTable, serial, text, boolean, timestamp, integer, json } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';

export const CONFIG_ENVIRONMENTS = ['development', 'test', 'staging', 'production'] as const;

export type ConfigEnvironment = typeof CONFIG_ENVIRONMENTS[number];

export const CONFIG_VALUE_TYPES = ['string', 'number', 'boolean', 'json'] as const;

export type ConfigValueType = typeof CONFIG_VALUE_TYPES[number];

/**
 * Configuration Namespaces Table
 * 
 * Represents configuration namespaces that group related configuration settings.
 * Supports hierarchical namespaces (e.g., api.rate_limits.default).
 */
export const configNamespaces = pgTable('config_namespaces', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  parentId: integer('parent_id').references(() => configNamespaces.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertNamespaceSchema = createInsertSchema(configNamespaces)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type ConfigNamespace = typeof configNamespaces.$inferSelect;
export type InsertConfigNamespace = z.infer<typeof insertNamespaceSchema>;

/**
 * Configuration Settings Table
 * 
 * Stores the actual configuration values with version tracking.
 */
export const configSettings = pgTable('config_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  valueType: text('value_type').$type<ConfigValueType>().notNull(),
  description: text('description'),
  environment: text('environment').$type<ConfigEnvironment>().notNull(),
  namespaceId: integer('namespace_id').references(() => configNamespaces.id),
  isSecret: boolean('is_secret').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertSettingSchema = createInsertSchema(configSettings)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type ConfigSetting = typeof configSettings.$inferSelect;
export type InsertConfigSetting = z.infer<typeof insertSettingSchema>;

/**
 * Configuration History Table
 * 
 * Tracks changes to configuration settings for audit purposes.
 */
export const configHistory = pgTable('config_history', {
  id: serial('id').primaryKey(),
  settingId: integer('setting_id').notNull().references(() => configSettings.id),
  action: text('action').$type<'create' | 'update' | 'delete'>().notNull(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertHistorySchema = createInsertSchema(configHistory)
  .omit({ id: true, createdAt: true });

export type ConfigHistory = typeof configHistory.$inferSelect;
export type InsertConfigHistory = z.infer<typeof insertHistorySchema>;

/**
 * Relation definitions for the config schema
 */
export const configRelations = {
  configNamespaces: relations(configNamespaces, ({ one, many }) => ({
    parent: one(configNamespaces, {
      fields: [configNamespaces.parentId],
      references: [configNamespaces.id],
    }),
    children: many(configNamespaces),
    settings: many(configSettings),
  })),
  
  configSettings: relations(configSettings, ({ one, many }) => ({
    namespace: one(configNamespaces, {
      fields: [configSettings.namespaceId],
      references: [configNamespaces.id],
    }),
    history: many(configHistory),
  })),
  
  configHistory: relations(configHistory, ({ one }) => ({
    setting: one(configSettings, {
      fields: [configHistory.settingId],
      references: [configSettings.id],
    }),
  })),
};