import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for prior auth path selection
export const priorAuthPathEnum = pgEnum("prior_auth_path", [
  "hub_run",
  "pass_through",
]);

// Enum for prior auth status
export const priorAuthStatusEnum = pgEnum("prior_auth_status", [
  "pending",
  "submitted",
  "queued",
  "in_review",
  "approved",
  "denied",
  "cancelled",
  "additional_info_needed",
  "expired",
]);

// Enum for request format type
export const requestFormatEnum = pgEnum("request_format", ["fhir", "x12"]);

// Table for payer configuration
export const payerConfig = pgTable(
  "payer_config",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payerId: text("payer_id").notNull(),
    payerName: text("payer_name").notNull(),
    defaultPath: priorAuthPathEnum("default_path").notNull(),
    supportsCrdApi: boolean("supports_crd_api").default(false),
    crdApiEndpoint: text("crd_api_endpoint"),
    supportsDtrApi: boolean("supports_dtr_api").default(false),
    dtrApiEndpoint: text("dtr_api_endpoint"),
    supportsFhirApi: boolean("supports_fhir_api").default(false),
    fhirApiEndpoint: text("fhir_api_endpoint"),
    supportsX12: boolean("supports_x12").default(false),
    x12Endpoint: text("x12_endpoint"),
    credentials: json("credentials").$type<{
      clientId?: string;
      clientSecret?: string;
      apiKey?: string;
      username?: string;
      password?: string;
      certificateThumbprint?: string;
    }>(),
    enabled: boolean("enabled").default(true),
    cacheLifetimeMinutes: integer("cache_lifetime_minutes").default(1440),
    createdAt: timestamp("created_at").default(sql`now()`),
    updatedAt: timestamp("updated_at").default(sql`now()`),
  },
  (table) => {
    return {
      payerIdIdx: index("payer_id_idx").on(table.payerId),
    };
  }
);

// Table for procedure code overrides
export const procedureOverride = pgTable(
  "procedure_override",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payerConfigId: uuid("payer_config_id")
      .notNull()
      .references(() => payerConfig.id, { onDelete: "cascade" }),
    procedureCode: text("procedure_code").notNull(),
    serviceCategory: text("service_category"),
    overridePath: priorAuthPathEnum("override_path").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").default(sql`now()`),
    updatedAt: timestamp("updated_at").default(sql`now()`),
  },
  (table) => {
    return {
      procedureCodeIdx: index("procedure_code_idx").on(table.procedureCode),
      serviceCategoryIdx: index("service_category_idx").on(table.serviceCategory),
      payerProcedureIdx: index("payer_procedure_idx").on(
        table.payerConfigId,
        table.procedureCode
      ),
    };
  }
);

// Table for prior auth requests
export const priorAuthRequest = pgTable(
  "prior_auth_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: text("request_id").notNull().unique(),
    patientId: text("patient_id").notNull(),
    providerId: text("provider_id").notNull(),
    payerId: text("payer_id").notNull(),
    procedureCode: text("procedure_code").notNull(),
    diagnosisCodes: json("diagnosis_codes").$type<string[]>(),
    serviceDate: timestamp("service_date"),
    executionPath: priorAuthPathEnum("execution_path").notNull(),
    status: priorAuthStatusEnum("status").default("pending"),
    requestFormat: requestFormatEnum("request_format").notNull(),
    requestPayload: json("request_payload"),
    responsePayload: json("response_payload"),
    crdCompleted: boolean("crd_completed").default(false),
    dtrCompleted: boolean("dtr_completed").default(false),
    submissionCompleted: boolean("submission_completed").default(false),
    authNumber: text("auth_number"),
    denialReason: text("denial_reason"),
    expirationDate: timestamp("expiration_date"),
    additionalInfoNeeded: text("additional_info_needed"),
    createdAt: timestamp("created_at").default(sql`now()`),
    updatedAt: timestamp("updated_at").default(sql`now()`),
    lastStatusUpdate: timestamp("last_status_update").default(sql`now()`),
  },
  (table) => {
    return {
      patientIdIdx: index("patient_id_idx").on(table.patientId),
      payerIdIdx: index("payer_id_idx").on(table.payerId),
      procedureCodeIdx: index("procedure_code_pa_idx").on(table.procedureCode),
      statusIdx: index("status_idx").on(table.status),
    };
  }
);

// Table for prior auth logs
export const priorAuthLog = pgTable(
  "prior_auth_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => priorAuthRequest.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    eventData: json("event_data"),
    createdAt: timestamp("created_at").default(sql`now()`),
  },
  (table) => {
    return {
      requestIdIdx: index("request_id_idx").on(table.requestId),
      eventTypeIdx: index("event_type_idx").on(table.eventType),
    };
  }
);

// Table for canonical data rules
export const canonicalDataRule = pgTable(
  "canonical_data_rule",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ruleSetName: text("rule_set_name").notNull(),
    ruleSetVersion: text("rule_set_version").notNull(),
    procedureCode: text("procedure_code").notNull(),
    ruleLogic: json("rule_logic"),
    documentationRequired: json("documentation_required").$type<string[]>(),
    criteriaDescription: text("criteria_description"),
    enabled: boolean("enabled").default(true),
    createdAt: timestamp("created_at").default(sql`now()`),
    updatedAt: timestamp("updated_at").default(sql`now()`),
  },
  (table) => {
    return {
      ruleSetIdx: index("rule_set_idx").on(
        table.ruleSetName,
        table.ruleSetVersion
      ),
      procedureCodeIdx: index("procedure_code_rule_idx").on(table.procedureCode),
    };
  }
);

// Relations
export const payerConfigRelations = relations(payerConfig, ({ many }) => ({
  procedureOverrides: many(procedureOverride),
}));

export const procedureOverrideRelations = relations(
  procedureOverride,
  ({ one }) => ({
    payerConfig: one(payerConfig, {
      fields: [procedureOverride.payerConfigId],
      references: [payerConfig.id],
    }),
  })
);

export const priorAuthRequestRelations = relations(
  priorAuthRequest,
  ({ many }) => ({
    logs: many(priorAuthLog),
  })
);

export const priorAuthLogRelations = relations(priorAuthLog, ({ one }) => ({
  request: one(priorAuthRequest, {
    fields: [priorAuthLog.requestId],
    references: [priorAuthRequest.id],
  }),
}));

// Zod schemas for validation
export const insertPayerConfigSchema = createInsertSchema(payerConfig);
export const insertProcedureOverrideSchema = createInsertSchema(procedureOverride);
export const insertPriorAuthRequestSchema = createInsertSchema(priorAuthRequest);
export const insertPriorAuthLogSchema = createInsertSchema(priorAuthLog);
export const insertCanonicalDataRuleSchema = createInsertSchema(canonicalDataRule);

// Types
export type PayerConfig = typeof payerConfig.$inferSelect;
export type InsertPayerConfig = typeof payerConfig.$inferInsert;

export type ProcedureOverride = typeof procedureOverride.$inferSelect;
export type InsertProcedureOverride = typeof procedureOverride.$inferInsert;

export type PriorAuthRequest = typeof priorAuthRequest.$inferSelect;
export type InsertPriorAuthRequest = typeof priorAuthRequest.$inferInsert;

export type PriorAuthLog = typeof priorAuthLog.$inferSelect;
export type InsertPriorAuthLog = typeof priorAuthLog.$inferInsert;

export type CanonicalDataRule = typeof canonicalDataRule.$inferSelect;
export type InsertCanonicalDataRule = typeof canonicalDataRule.$inferInsert;

// Export PriorAuthStatus for use in the orchestrator
export type PriorAuthStatus = (typeof priorAuthStatusEnum.enumValues)[number];

// Export the enum values as a constant object for use with dot notation
export const PriorAuthStatus = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  QUEUED: 'queued',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  DENIED: 'denied',
  CANCELLED: 'cancelled',
  ADDITIONAL_INFO_NEEDED: 'additional_info_needed',
  EXPIRED: 'expired',
} as const;