import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organization } from "./organization-schema";

/**
 * Organization Rule Configuration
 * 
 * Contains rule configurations specific to a healthcare organization
 * (e.g. hospital, practice group, health system)
 */
export const organizationConfig = pgTable("organization_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id),
  defaultRulePriority: text("default_rule_priority").notNull().default("standard"),
  fhirSubmissionEndpoint: text("fhir_submission_endpoint"),
  x12SubmissionEndpoint: text("x12_submission_endpoint"),
  requiresPreAuth: boolean("requires_pre_auth").notNull().default(true),
  specialInstructions: text("special_instructions"),
  contractData: jsonb("contract_data"),
  apiCredentials: jsonb("api_credentials"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const organizationConfigRelations = relations(
  organizationConfig,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [organizationConfig.organizationId],
      references: [organization.id],
    }),
    procedureExceptions: many(organizationProcedureException),
  })
);

/**
 * Organization Procedure Exceptions
 * 
 * Contains procedure-specific overrides for an organization
 */
export const organizationProcedureException = pgTable("organization_procedure_exception", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationConfigId: uuid("organization_config_id")
    .notNull()
    .references(() => organizationConfig.id, { onDelete: "cascade" }),
  procedureCode: text("procedure_code").notNull(),
  procedureDescription: text("procedure_description"),
  requiresPreAuth: boolean("requires_pre_auth"),
  specialInstructions: text("special_instructions"),
  documentationRequired: jsonb("documentation_required").$type<string[]>(),
  effectiveDate: timestamp("effective_date"),
  expirationDate: timestamp("expiration_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const organizationProcedureExceptionRelations = relations(
  organizationProcedureException,
  ({ one }) => ({
    organizationConfig: one(organizationConfig, {
      fields: [organizationProcedureException.organizationConfigId],
      references: [organizationConfig.id],
    }),
  })
);

// Define schemas for inserts
export const insertOrganizationConfigSchema = createInsertSchema(organizationConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationProcedureExceptionSchema = createInsertSchema(
  organizationProcedureException
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Define types for TypeScript
export type OrganizationConfig = typeof organizationConfig.$inferSelect;
export type InsertOrganizationConfig = z.infer<typeof insertOrganizationConfigSchema>;

export type OrganizationProcedureException = typeof organizationProcedureException.$inferSelect;
export type InsertOrganizationProcedureException = z.infer<
  typeof insertOrganizationProcedureExceptionSchema
>;