/**
 * Person Connect Database Schema
 * 
 * This module defines the database schema for the Person Connect service:
 * - Master Person Index (MPI) for centralized person identification
 * - Person links for connecting related person records
 * - Roster management for organization-specific person lists
 * - Match results for recording potential duplicates
 */

import { pgTable, serial, text, jsonb, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enumerations
export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'unknown']);
export const addressTypeEnum = pgEnum('address_type', ['home', 'work', 'mailing', 'temporary', 'billing', 'other']);
export const contactTypeEnum = pgEnum('contact_type', ['phone', 'email', 'fax', 'pager', 'url', 'sms', 'other']);
export const identifierTypeEnum = pgEnum('identifier_type', [
  'mrn', 'ssn', 'passport', 'drivers_license', 'insurance', 'employer_id', 
  'national_id', 'medical_record', 'health_plan', 'bank_account', 'tax_id', 'other'
]);
export const identifierSystemEnum = pgEnum('identifier_system', [
  'SSA', 'NPI', 'DEA', 'DL', 'PPN', 'TAX', 'MRN', 'INS', 'EMP', 'BANK', 'OTHER'
]);
export const matchStatusEnum = pgEnum('match_status', [
  'exact', 'high', 'medium', 'low', 'possible', 'no_match', 'error', 'pending'
]);
export const linkTypeEnum = pgEnum('link_type', [
  'source', 'alternate', 'replaced-by', 'replaces', 'refer', 'seealso'
]);
export const rosterStatusEnum = pgEnum('roster_status', [
  'active', 'inactive', 'pending', 'error', 'archived'
]);
export const rosterTypeEnum = pgEnum('roster_type', [
  'patient', 'provider', 'employee', 'member', 'beneficiary', 'subscriber', 'dependent', 'other'
]);
export const personStatusEnum = pgEnum('person_status', [
  'active', 'inactive', 'pending', 'error'
]);

// Master Person Index
export const masterPersonIndex = pgTable('master_person_index', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull().unique(),
  organizationId: integer('organizationId').references(() => organizations.id),
  externalId: text('externalId'),
  names: jsonb('names').notNull().default('[]'),
  gender: genderEnum('gender').default('unknown'),
  birthDate: timestamp('birthDate', { mode: 'string' }),
  addresses: jsonb('addresses').notNull().default('[]'),
  contacts: jsonb('contacts').notNull().default('[]'),
  identifiers: jsonb('identifiers').notNull().default('[]'),
  active: boolean('active').notNull().default(true),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
});

// Person Links
export const personLinks = pgTable('person_links', {
  id: serial('id').primaryKey(),
  sourcePersonId: integer('sourcePersonId').notNull().references(() => masterPersonIndex.id),
  targetPersonId: integer('targetPersonId').notNull().references(() => masterPersonIndex.id),
  type: linkTypeEnum('type').notNull(),
  confidence: text('confidence'),
  metadata: jsonb('metadata').notNull().default('{}'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
});

// Person Rosters
export const personRosters = pgTable('person_rosters', {
  id: serial('id').primaryKey(),
  organizationId: integer('organizationId').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  description: text('description'),
  type: rosterTypeEnum('type').notNull(),
  status: rosterStatusEnum('status').notNull().default('active'),
  source: text('source'),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
});

// Roster People
export const rosterPeople = pgTable('roster_people', {
  id: serial('id').primaryKey(),
  rosterId: integer('rosterId').notNull().references(() => personRosters.id),
  personId: integer('personId').notNull().references(() => masterPersonIndex.id),
  externalId: text('externalId'),
  status: personStatusEnum('status').notNull().default('active'),
  startDate: timestamp('startDate', { mode: 'string' }),
  endDate: timestamp('endDate', { mode: 'string' }),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
});

// Match Results
export const matchResults = pgTable('match_results', {
  id: serial('id').primaryKey(),
  sourcePersonId: integer('sourcePersonId').notNull().references(() => masterPersonIndex.id),
  targetPersonId: integer('targetPersonId').references(() => masterPersonIndex.id),
  status: matchStatusEnum('status').notNull(),
  score: text('score'),
  algorithm: text('algorithm'),
  details: jsonb('details').notNull().default('{}'),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
});

// For reference (already defined elsewhere)
export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
});

// Schema validation
export const insertMasterPersonIndexSchema = createInsertSchema(masterPersonIndex);
export const insertPersonLinksSchema = createInsertSchema(personLinks);
export const insertPersonRostersSchema = createInsertSchema(personRosters);
export const insertRosterPeopleSchema = createInsertSchema(rosterPeople);
export const insertMatchResultsSchema = createInsertSchema(matchResults);

// Types
export type MasterPersonIndex = typeof masterPersonIndex.$inferSelect;
export type PersonLink = typeof personLinks.$inferSelect;
export type PersonRoster = typeof personRosters.$inferSelect;
export type RosterPerson = typeof rosterPeople.$inferSelect;
export type MatchResult = typeof matchResults.$inferSelect;
export type Organization = typeof organizations.$inferSelect;

export type InsertMasterPersonIndex = z.infer<typeof insertMasterPersonIndexSchema>;
export type InsertPersonLink = z.infer<typeof insertPersonLinksSchema>;
export type InsertPersonRoster = z.infer<typeof insertPersonRostersSchema>;
export type InsertRosterPerson = z.infer<typeof insertRosterPeopleSchema>;
export type InsertMatchResult = z.infer<typeof insertMatchResultsSchema>;