import { pgTable, text, timestamp, pgEnum, uuid, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const goldcardStatusEnum = pgEnum("goldcard_status", [
  "active",
  "revoked",
  "expired",
  "pending_review",
  "suspended"
]);

export const goldcardServiceCategoryEnum = pgEnum("goldcard_service_category", [
  "procedure",
  "service_group",
  "specialty",
  "facility_type"
]);

// Tables
export const goldcardProviderProfiles = pgTable("goldcard_provider_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  overallApprovalRate: integer("overall_approval_rate"),
  totalAuthRequests: integer("total_auth_requests").default(0),
  totalApproved: integer("total_approved").default(0),
  totalDenied: integer("total_denied").default(0),
  averageResponseTime: integer("average_response_time"), // in hours
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadataJson: jsonb("metadata_json"), // Additional flexible data
  lastEvaluationDate: timestamp("last_evaluation_date"),
  evaluationFrequency: text("evaluation_frequency").default("monthly"), // monthly, quarterly
  isActive: boolean("is_active").default(true)
});

export const goldcardEligibility = pgTable("goldcard_eligibility", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerProfileId: uuid("provider_profile_id").notNull().references(() => goldcardProviderProfiles.id),
  serviceCode: text("service_code").notNull(),
  serviceName: text("service_name").notNull(),
  serviceCategory: goldcardServiceCategoryEnum("service_category").notNull(),
  status: goldcardStatusEnum("status").notNull().default("active"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // If null, no expiration
  eligibilityScore: integer("eligibility_score"), // Calculated score (e.g., 0-100)
  approvalRate: integer("approval_rate"), // Percentage for this specific service
  totalAuthRequests: integer("total_auth_requests").default(0),
  totalApproved: integer("total_approved").default(0),
  totalDenied: integer("total_denied").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastReviewDate: timestamp("last_review_date"),
  reviewNotes: text("review_notes"),
  revocationReason: text("revocation_reason"),
  claimAccuracyRate: integer("claim_accuracy_rate"), // Percentage
  metadataJson: jsonb("metadata_json") // Additional flexible data
});

export const goldcardRules = pgTable("goldcard_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  serviceCategory: goldcardServiceCategoryEnum("service_category").notNull(),
  serviceCodes: jsonb("service_codes"), // Array of service codes this rule applies to
  requiredApprovalRate: integer("required_approval_rate").notNull(), // Minimum approval rate required (percentage)
  minAuthRequests: integer("min_auth_requests").notNull(), // Minimum number of requests required
  evaluationPeriodMonths: integer("evaluation_period_months").notNull(), // How far back to look
  reviewFrequency: text("review_frequency").notNull().default("monthly"), // How often to re-evaluate
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  additionalCriteria: jsonb("additional_criteria"), // Any other rule criteria in flexible format
  payerId: text("payer_id"), // If null, applies to all payers
  organizationId: text("organization_id") // If null, applies to all orgs
});

export const goldcardEvents = pgTable("goldcard_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerProfileId: uuid("provider_profile_id").notNull().references(() => goldcardProviderProfiles.id),
  eligibilityId: uuid("eligibility_id").references(() => goldcardEligibility.id),
  eventType: text("event_type").notNull(), // GRANTED, REVOKED, SUSPENDED, etc.
  serviceCode: text("service_code"),
  serviceName: text("service_name"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  details: jsonb("details"), // Additional event details
  userId: text("user_id"), // Who triggered the event (if manual)
  reason: text("reason")
});

// Store PA decisions for analysis
export const goldcardPriorAuthTracker = pgTable("goldcard_prior_auth_tracker", {
  id: uuid("id").primaryKey().defaultRandom(),
  priorAuthId: text("prior_auth_id").notNull(),
  providerId: text("provider_id").notNull(),
  serviceCode: text("service_code").notNull(),
  patientId: text("patient_id"),
  requestedDate: timestamp("requested_date").notNull(),
  decisionDate: timestamp("decision_date"),
  outcome: text("outcome"), // approved, denied
  decisionSource: text("decision_source"), // payer, goldcard
  appealOutcome: text("appeal_outcome"),
  comments: text("comments"),
  authNumber: text("auth_number"),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Store claims outcomes for correlation
export const goldcardClaimTracker = pgTable("goldcard_claim_tracker", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: text("claim_id").notNull(),
  providerId: text("provider_id").notNull(),
  serviceCode: text("service_code").notNull(),
  patientId: text("patient_id"),
  dateOfService: timestamp("date_of_service").notNull(),
  claimStatus: text("claim_status").notNull(), // paid, denied
  paidAmount: integer("paid_amount"),
  denialReason: text("denial_reason"),
  priorAuthId: text("prior_auth_id"), // Link to prior auth if available
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Relations
export const goldcardProviderProfilesRelations = relations(goldcardProviderProfiles, ({ many }) => ({
  eligibilities: many(goldcardEligibility),
  events: many(goldcardEvents)
}));

export const goldcardEligibilityRelations = relations(goldcardEligibility, ({ one, many }) => ({
  providerProfile: one(goldcardProviderProfiles, {
    fields: [goldcardEligibility.providerProfileId],
    references: [goldcardProviderProfiles.id]
  }),
  events: many(goldcardEvents)
}));

export const goldcardEventsRelations = relations(goldcardEvents, ({ one }) => ({
  providerProfile: one(goldcardProviderProfiles, {
    fields: [goldcardEvents.providerProfileId],
    references: [goldcardProviderProfiles.id]
  }),
  eligibility: one(goldcardEligibility, {
    fields: [goldcardEvents.eligibilityId],
    references: [goldcardEligibility.id]
  })
}));

// Zod schemas
export const insertGoldcardProviderProfileSchema = createInsertSchema(goldcardProviderProfiles);
export const insertGoldcardEligibilitySchema = createInsertSchema(goldcardEligibility);
export const insertGoldcardRuleSchema = createInsertSchema(goldcardRules);
export const insertGoldcardEventSchema = createInsertSchema(goldcardEvents);
export const insertGoldcardPriorAuthTrackerSchema = createInsertSchema(goldcardPriorAuthTracker);
export const insertGoldcardClaimTrackerSchema = createInsertSchema(goldcardClaimTracker);

// Types
export type GoldcardProviderProfile = typeof goldcardProviderProfiles.$inferSelect;
export type InsertGoldcardProviderProfile = typeof goldcardProviderProfiles.$inferInsert;

export type GoldcardEligibility = typeof goldcardEligibility.$inferSelect;
export type InsertGoldcardEligibility = typeof goldcardEligibility.$inferInsert;

export type GoldcardRule = typeof goldcardRules.$inferSelect;
export type InsertGoldcardRule = typeof goldcardRules.$inferInsert;

export type GoldcardEvent = typeof goldcardEvents.$inferSelect;
export type InsertGoldcardEvent = typeof goldcardEvents.$inferInsert;

export type GoldcardPriorAuthTracker = typeof goldcardPriorAuthTracker.$inferSelect;
export type InsertGoldcardPriorAuthTracker = typeof goldcardPriorAuthTracker.$inferInsert;

export type GoldcardClaimTracker = typeof goldcardClaimTracker.$inferSelect;
export type InsertGoldcardClaimTracker = typeof goldcardClaimTracker.$inferInsert;

// Service-specific types
export type GoldcardDecision = {
  isEligible: boolean;
  serviceCode: string;
  providerId: string;
  reason: string;
  details?: Record<string, any>;
}

export type GoldcardCheckRequest = {
  providerId: string;
  serviceCode: string;
  patientId?: string;
  payerId?: string;
  additionalContext?: Record<string, any>;
}