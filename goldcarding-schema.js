"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertGoldcardClaimTrackerSchema = exports.insertGoldcardPriorAuthTrackerSchema = exports.insertGoldcardEventSchema = exports.insertGoldcardRuleSchema = exports.insertGoldcardEligibilitySchema = exports.insertGoldcardProviderProfileSchema = exports.goldcardEventsRelations = exports.goldcardEligibilityRelations = exports.goldcardProviderProfilesRelations = exports.goldcardClaimTracker = exports.goldcardPriorAuthTracker = exports.goldcardEvents = exports.goldcardRules = exports.goldcardEligibility = exports.goldcardProviderProfiles = exports.goldcardServiceCategoryEnum = exports.goldcardStatusEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_orm_1 = require("drizzle-orm");
var drizzle_zod_1 = require("drizzle-zod");
// Enums
exports.goldcardStatusEnum = (0, pg_core_1.pgEnum)("goldcard_status", [
    "active",
    "revoked",
    "expired",
    "pending_review",
    "suspended"
]);
exports.goldcardServiceCategoryEnum = (0, pg_core_1.pgEnum)("goldcard_service_category", [
    "procedure",
    "service_group",
    "specialty",
    "facility_type"
]);
// Tables
exports.goldcardProviderProfiles = (0, pg_core_1.pgTable)("goldcard_provider_profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    providerId: (0, pg_core_1.text)("provider_id").notNull(),
    providerName: (0, pg_core_1.text)("provider_name").notNull(),
    overallApprovalRate: (0, pg_core_1.integer)("overall_approval_rate"),
    totalAuthRequests: (0, pg_core_1.integer)("total_auth_requests").default(0),
    totalApproved: (0, pg_core_1.integer)("total_approved").default(0),
    totalDenied: (0, pg_core_1.integer)("total_denied").default(0),
    averageResponseTime: (0, pg_core_1.integer)("average_response_time"), // in hours
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    metadataJson: (0, pg_core_1.jsonb)("metadata_json"), // Additional flexible data
    lastEvaluationDate: (0, pg_core_1.timestamp)("last_evaluation_date"),
    evaluationFrequency: (0, pg_core_1.text)("evaluation_frequency").default("monthly"), // monthly, quarterly
    isActive: (0, pg_core_1.boolean)("is_active").default(true)
});
exports.goldcardEligibility = (0, pg_core_1.pgTable)("goldcard_eligibility", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    providerProfileId: (0, pg_core_1.uuid)("provider_profile_id").notNull().references(function () { return exports.goldcardProviderProfiles.id; }),
    serviceCode: (0, pg_core_1.text)("service_code").notNull(),
    serviceName: (0, pg_core_1.text)("service_name").notNull(),
    serviceCategory: (0, exports.goldcardServiceCategoryEnum)("service_category").notNull(),
    status: (0, exports.goldcardStatusEnum)("status").notNull().default("active"),
    startDate: (0, pg_core_1.timestamp)("start_date").notNull(),
    endDate: (0, pg_core_1.timestamp)("end_date"), // If null, no expiration
    eligibilityScore: (0, pg_core_1.integer)("eligibility_score"), // Calculated score (e.g., 0-100)
    approvalRate: (0, pg_core_1.integer)("approval_rate"), // Percentage for this specific service
    totalAuthRequests: (0, pg_core_1.integer)("total_auth_requests").default(0),
    totalApproved: (0, pg_core_1.integer)("total_approved").default(0),
    totalDenied: (0, pg_core_1.integer)("total_denied").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    lastReviewDate: (0, pg_core_1.timestamp)("last_review_date"),
    reviewNotes: (0, pg_core_1.text)("review_notes"),
    revocationReason: (0, pg_core_1.text)("revocation_reason"),
    claimAccuracyRate: (0, pg_core_1.integer)("claim_accuracy_rate"), // Percentage
    metadataJson: (0, pg_core_1.jsonb)("metadata_json") // Additional flexible data
});
exports.goldcardRules = (0, pg_core_1.pgTable)("goldcard_rules", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    serviceCategory: (0, exports.goldcardServiceCategoryEnum)("service_category").notNull(),
    serviceCodes: (0, pg_core_1.jsonb)("service_codes"), // Array of service codes this rule applies to
    requiredApprovalRate: (0, pg_core_1.integer)("required_approval_rate").notNull(), // Minimum approval rate required (percentage)
    minAuthRequests: (0, pg_core_1.integer)("min_auth_requests").notNull(), // Minimum number of requests required
    evaluationPeriodMonths: (0, pg_core_1.integer)("evaluation_period_months").notNull(), // How far back to look
    reviewFrequency: (0, pg_core_1.text)("review_frequency").notNull().default("monthly"), // How often to re-evaluate
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    additionalCriteria: (0, pg_core_1.jsonb)("additional_criteria"), // Any other rule criteria in flexible format
    payerId: (0, pg_core_1.text)("payer_id"), // If null, applies to all payers
    organizationId: (0, pg_core_1.text)("organization_id") // If null, applies to all orgs
});
exports.goldcardEvents = (0, pg_core_1.pgTable)("goldcard_events", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    providerProfileId: (0, pg_core_1.uuid)("provider_profile_id").notNull().references(function () { return exports.goldcardProviderProfiles.id; }),
    eligibilityId: (0, pg_core_1.uuid)("eligibility_id").references(function () { return exports.goldcardEligibility.id; }),
    eventType: (0, pg_core_1.text)("event_type").notNull(), // GRANTED, REVOKED, SUSPENDED, etc.
    serviceCode: (0, pg_core_1.text)("service_code"),
    serviceName: (0, pg_core_1.text)("service_name"),
    timestamp: (0, pg_core_1.timestamp)("timestamp").defaultNow().notNull(),
    details: (0, pg_core_1.jsonb)("details"), // Additional event details
    userId: (0, pg_core_1.text)("user_id"), // Who triggered the event (if manual)
    reason: (0, pg_core_1.text)("reason")
});
// Store PA decisions for analysis
exports.goldcardPriorAuthTracker = (0, pg_core_1.pgTable)("goldcard_prior_auth_tracker", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    priorAuthId: (0, pg_core_1.text)("prior_auth_id").notNull(),
    providerId: (0, pg_core_1.text)("provider_id").notNull(),
    serviceCode: (0, pg_core_1.text)("service_code").notNull(),
    patientId: (0, pg_core_1.text)("patient_id"),
    requestedDate: (0, pg_core_1.timestamp)("requested_date").notNull(),
    decisionDate: (0, pg_core_1.timestamp)("decision_date"),
    outcome: (0, pg_core_1.text)("outcome"), // approved, denied
    decisionSource: (0, pg_core_1.text)("decision_source"), // payer, goldcard
    appealOutcome: (0, pg_core_1.text)("appeal_outcome"),
    comments: (0, pg_core_1.text)("comments"),
    authNumber: (0, pg_core_1.text)("auth_number"),
    metadataJson: (0, pg_core_1.jsonb)("metadata_json"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull()
});
// Store claims outcomes for correlation
exports.goldcardClaimTracker = (0, pg_core_1.pgTable)("goldcard_claim_tracker", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    claimId: (0, pg_core_1.text)("claim_id").notNull(),
    providerId: (0, pg_core_1.text)("provider_id").notNull(),
    serviceCode: (0, pg_core_1.text)("service_code").notNull(),
    patientId: (0, pg_core_1.text)("patient_id"),
    dateOfService: (0, pg_core_1.timestamp)("date_of_service").notNull(),
    claimStatus: (0, pg_core_1.text)("claim_status").notNull(), // paid, denied
    paidAmount: (0, pg_core_1.integer)("paid_amount"),
    denialReason: (0, pg_core_1.text)("denial_reason"),
    priorAuthId: (0, pg_core_1.text)("prior_auth_id"), // Link to prior auth if available
    metadataJson: (0, pg_core_1.jsonb)("metadata_json"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull()
});
// Relations
exports.goldcardProviderProfilesRelations = (0, drizzle_orm_1.relations)(exports.goldcardProviderProfiles, function (_a) {
    var many = _a.many;
    return ({
        eligibilities: many(exports.goldcardEligibility),
        events: many(exports.goldcardEvents)
    });
});
exports.goldcardEligibilityRelations = (0, drizzle_orm_1.relations)(exports.goldcardEligibility, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        providerProfile: one(exports.goldcardProviderProfiles, {
            fields: [exports.goldcardEligibility.providerProfileId],
            references: [exports.goldcardProviderProfiles.id]
        }),
        events: many(exports.goldcardEvents)
    });
});
exports.goldcardEventsRelations = (0, drizzle_orm_1.relations)(exports.goldcardEvents, function (_a) {
    var one = _a.one;
    return ({
        providerProfile: one(exports.goldcardProviderProfiles, {
            fields: [exports.goldcardEvents.providerProfileId],
            references: [exports.goldcardProviderProfiles.id]
        }),
        eligibility: one(exports.goldcardEligibility, {
            fields: [exports.goldcardEvents.eligibilityId],
            references: [exports.goldcardEligibility.id]
        })
    });
});
// Zod schemas
exports.insertGoldcardProviderProfileSchema = (0, drizzle_zod_1.createInsertSchema)(exports.goldcardProviderProfiles);
exports.insertGoldcardEligibilitySchema = (0, drizzle_zod_1.createInsertSchema)(exports.goldcardEligibility);
exports.insertGoldcardRuleSchema = (0, drizzle_zod_1.createInsertSchema)(exports.goldcardRules);
exports.insertGoldcardEventSchema = (0, drizzle_zod_1.createInsertSchema)(exports.goldcardEvents);
exports.insertGoldcardPriorAuthTrackerSchema = (0, drizzle_zod_1.createInsertSchema)(exports.goldcardPriorAuthTracker);
exports.insertGoldcardClaimTrackerSchema = (0, drizzle_zod_1.createInsertSchema)(exports.goldcardClaimTracker);
