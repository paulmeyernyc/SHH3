import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Healthcare Contract
 * Represents the legal contract between healthcare entities like providers and payers
 */
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  contractType: text("contract_type").notNull(),
  contentHash: text("content_hash").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  payerId: integer("payer_id"),
  providerId: integer("provider_id"),
  status: text("status").notNull().default("draft"),
  tags: text("tags").array(),
  latestAnalysisId: integer("latest_analysis_id"),
  metadata: jsonb("metadata").default({})
});

/**
 * Contract Participants
 * Links organizations to contracts with their specific roles
 */
export const contractParticipants = pgTable("contract_participants", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  organizationId: integer("organization_id").notNull(),
  role: text("role").notNull(), // owner, payer, provider, etc.
  addedBy: integer("added_by").notNull(),
  addedAt: timestamp("added_at").notNull(),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata").default({})
});

/**
 * Contract Analysis
 * AI-powered analysis of contract terms
 */
export const contractAnalyses = pgTable("contract_analyses", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  analyzedBy: integer("analyzed_by").notNull(),
  analyzedAt: timestamp("analyzed_at").notNull(),
  coverageSummary: text("coverage_summary").notNull(),
  paymentTerms: text("payment_terms").notNull(),
  claimsProcessingRules: text("claims_processing_rules").notNull(),
  exclusions: text("exclusions").notNull(),
  specialTerms: text("special_terms").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  metadata: jsonb("metadata").default({})
});

/**
 * Cost Estimate Requests
 * Requests for cost estimates based on contract terms
 */
export const costEstimateRequests = pgTable("cost_estimate_requests", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  contractAnalysisId: integer("contract_analysis_id").notNull().references(() => contractAnalyses.id),
  patientId: integer("patient_id").notNull(),
  requestedBy: integer("requested_by").notNull(),
  requestedAt: timestamp("requested_at").notNull(),
  processedAt: timestamp("processed_at"),
  serviceCode: text("service_code").notNull(),
  diagnosisCodes: text("diagnosis_codes").array(),
  providerId: integer("provider_id").notNull(),
  payerId: integer("payer_id"),
  status: text("status").notNull().default("pending"),
  estimatedCost: integer("estimated_cost"),
  patientResponsibility: integer("patient_responsibility"),
  insuranceResponsibility: integer("insurance_responsibility"),
  confidenceScore: integer("confidence_score"),
  notes: text("notes"),
  metadata: jsonb("metadata").default({})
});

// Relations
export const contractsRelations = relations(contracts, ({ one, many }) => ({
  participants: many(contractParticipants),
  analyses: many(contractAnalyses),
  costEstimateRequests: many(costEstimateRequests),
  latestAnalysis: one(contractAnalyses, {
    fields: [contracts.latestAnalysisId],
    references: [contractAnalyses.id]
  })
}));

export const contractParticipantsRelations = relations(contractParticipants, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractParticipants.contractId],
    references: [contracts.id]
  })
}));

export const contractAnalysesRelations = relations(contractAnalyses, ({ one, many }) => ({
  contract: one(contracts, {
    fields: [contractAnalyses.contractId],
    references: [contracts.id]
  }),
  costEstimateRequests: many(costEstimateRequests)
}));

export const costEstimateRequestsRelations = relations(costEstimateRequests, ({ one }) => ({
  contract: one(contracts, {
    fields: [costEstimateRequests.contractId],
    references: [contracts.id]
  }),
  contractAnalysis: one(contractAnalyses, {
    fields: [costEstimateRequests.contractAnalysisId],
    references: [contractAnalyses.id]
  })
}));

// Zod schemas for validation
export const insertContractSchema = createInsertSchema(contracts)
  .omit({ id: true, latestAnalysisId: true });
export const insertContractParticipantSchema = createInsertSchema(contractParticipants)
  .omit({ id: true });
export const insertContractAnalysisSchema = createInsertSchema(contractAnalyses)
  .omit({ id: true });
export const insertCostEstimateRequestSchema = createInsertSchema(costEstimateRequests)
  .omit({ id: true, processedAt: true, estimatedCost: true, patientResponsibility: true, insuranceResponsibility: true, confidenceScore: true });

// TypeScript types
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

export type ContractParticipant = typeof contractParticipants.$inferSelect;
export type InsertContractParticipant = z.infer<typeof insertContractParticipantSchema>;

export type ContractAnalysis = typeof contractAnalyses.$inferSelect;
export type InsertContractAnalysis = z.infer<typeof insertContractAnalysisSchema>;

export type CostEstimateRequest = typeof costEstimateRequests.$inferSelect;
export type InsertCostEstimateRequest = z.infer<typeof insertCostEstimateRequestSchema>;