/**
 * Care Event Schema
 * 
 * This file defines the database schema for care events using Drizzle ORM.
 * Care events represent healthcare transactions and serve as a central linking
 * structure to connect related healthcare processes.
 */
import { relations } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, text, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Care Events Table
export const careEvents = pgTable('care_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalId: varchar('external_id', { length: 255 }).unique(),
  patientId: uuid('patient_id').notNull(),
  providerId: uuid('provider_id').notNull(),
  facilityId: uuid('facility_id'),
  primaryDiagnosisCode: varchar('primary_diagnosis_code', { length: 20 }).notNull(),
  secondaryDiagnosisCodes: text('secondary_diagnosis_codes').array(),
  procedureCodes: text('procedure_codes').array().notNull(),
  serviceDate: timestamp('service_date').notNull(),
  serviceType: varchar('service_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('SCHEDULED'),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  sharingStatus: varchar('sharing_status', { length: 50 }).notNull().default('PRIVATE'),
  lastSyncedAt: timestamp('last_synced_at'),
  syncVersion: integer('sync_version').notNull().default(1)
});

// Care Event Partners Table
export const careEventPartners = pgTable('care_event_partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  careEventId: uuid('care_event_id').notNull().references(() => careEvents.id, { onDelete: 'cascade' }),
  partnerId: uuid('partner_id').notNull(),
  partnerType: varchar('partner_type', { length: 50 }).notNull(),
  accessLevel: varchar('access_level', { length: 50 }).notNull().default('READ'),
  partnerReference: varchar('partner_reference', { length: 255 }),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Care Event Transactions Table
export const careEventTransactions = pgTable('care_event_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  careEventId: uuid('care_event_id').notNull().references(() => careEvents.id, { onDelete: 'cascade' }),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(),
  transactionId: uuid('transaction_id').notNull(),
  status: varchar('status', { length: 50 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  metadata: jsonb('metadata')
});

// Care Event Webhooks Table
export const careEventWebhooks = pgTable('care_event_webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull(),
  webhookUrl: varchar('webhook_url', { length: 255 }).notNull(),
  secret: varchar('secret', { length: 255 }).notNull(),
  events: text('events').array().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Define relations
export const careEventsRelations = relations(careEvents, ({ many }) => ({
  partners: many(careEventPartners),
  transactions: many(careEventTransactions)
}));

export const careEventPartnersRelations = relations(careEventPartners, ({ one }) => ({
  careEvent: one(careEvents, {
    fields: [careEventPartners.careEventId],
    references: [careEvents.id]
  })
}));

export const careEventTransactionsRelations = relations(careEventTransactions, ({ one }) => ({
  careEvent: one(careEvents, {
    fields: [careEventTransactions.careEventId],
    references: [careEvents.id]
  })
}));

// Zod Schemas for validation
export const insertCareEventSchema = createInsertSchema(careEvents);
export const insertCareEventPartnerSchema = createInsertSchema(careEventPartners);
export const insertCareEventTransactionSchema = createInsertSchema(careEventTransactions);
export const insertCareEventWebhookSchema = createInsertSchema(careEventWebhooks);

// Infer types from Zod schemas
export type InsertCareEvent = z.infer<typeof insertCareEventSchema>;
export type InsertCareEventPartner = z.infer<typeof insertCareEventPartnerSchema>;
export type InsertCareEventTransaction = z.infer<typeof insertCareEventTransactionSchema>;
export type InsertCareEventWebhook = z.infer<typeof insertCareEventWebhookSchema>;

// Select types from Drizzle tables
export type CareEvent = typeof careEvents.$inferSelect;
export type CareEventPartner = typeof careEventPartners.$inferSelect;
export type CareEventTransaction = typeof careEventTransactions.$inferSelect;
export type CareEventWebhook = typeof careEventWebhooks.$inferSelect;