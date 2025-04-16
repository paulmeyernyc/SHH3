import { relations } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Organization
 * 
 * Healthcare organizations like hospitals, health systems, clinics, etc.
 */
export const organization = pgTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  externalId: text("external_id"),
  organizationType: text("organization_type").notNull().default("provider"),
  active: boolean("active").notNull().default(true),
  website: text("website"),
  taxId: text("tax_id"),
  npi: text("npi"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Define schema for inserts
export const insertOrganizationSchema = createInsertSchema(organization).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Define types for TypeScript
export type Organization = typeof organization.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;