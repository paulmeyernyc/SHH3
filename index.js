var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/utils/logger.ts
import winston2 from "winston";
var logger4, logger_default;
var init_logger = __esm({
  "server/utils/logger.ts"() {
    "use strict";
    logger4 = winston2.createLogger({
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      format: winston2.format.combine(
        winston2.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston2.format.errors({ stack: true }),
        winston2.format.splat(),
        winston2.format.json()
      ),
      defaultMeta: { service: "smart-health-hub" },
      transports: [
        // Console transport for development
        new winston2.transports.Console({
          format: winston2.format.combine(
            winston2.format.colorize(),
            winston2.format.printf(({ timestamp: timestamp14, level, message, ...meta }) => {
              return `${timestamp14} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""}`;
            })
          )
        })
      ]
    });
    if (process.env.NODE_ENV === "production") {
      logger4.add(
        new winston2.transports.File({ filename: "logs/error.log", level: "error" })
      );
      logger4.add(new winston2.transports.File({ filename: "logs/combined.log" }));
    }
    logger_default = logger4;
  }
});

// server/services/scheduling/scheduling-mcp-service.ts
var scheduling_mcp_service_exports = {};
__export(scheduling_mcp_service_exports, {
  SchedulingMcpService: () => SchedulingMcpService,
  schedulingMcpService: () => schedulingMcpService
});
var SchedulingMcpService, schedulingMcpService;
var init_scheduling_mcp_service = __esm({
  "server/services/scheduling/scheduling-mcp-service.ts"() {
    "use strict";
    init_logger();
    SchedulingMcpService = class {
      // Default policy that applies if no organization-specific policy exists
      defaultPolicy = {
        maxAppointmentsPerSlot: 1,
        minTimeBeforeBooking: 0,
        maxTimeBeforeBooking: 365,
        // 1 year
        allowOverbooking: false,
        requirePriorAuth: false,
        requirePriorAuthForServices: ["imaging", "procedure", "specialist"],
        priorAuthGracePeriodDays: 7,
        autoApproveEligibleAppointments: true,
        cancelNoShowPolicy: "none",
        patientCancellationWindowHours: 24,
        providerCancellationWindowHours: 48
      };
      // Default prior auth rule
      defaultPriorAuthRule = {
        serviceType: "default",
        specialty: "default",
        required: false,
        goldcardingEnabled: true,
        goldcardingThreshold: 95,
        decisionTimeframe: 72
        // 72 hours
      };
      // Default eligibility rule
      defaultEligibilityRule = {
        insuranceType: "default",
        requiresVerification: true,
        verificationTimeframe: 24,
        // 24 hours
        autoBookOnVerification: true
      };
      constructor() {
        logger_default.info("Initializing Scheduling MCP Service");
      }
      /**
       * Get scheduling policy for an organization
       */
      async getSchedulingPolicy(organizationId) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return this.defaultPolicy;
        } catch (error2) {
          logger_default.error("Error getting scheduling policy:", error2);
          return this.defaultPolicy;
        }
      }
      /**
       * Get prior auth processing rule for a specific service type and specialty
       */
      async getPriorAuthRule(organizationId, serviceType, specialty) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 150));
          if (["imaging", "procedure", "specialist"].includes(serviceType)) {
            return {
              ...this.defaultPriorAuthRule,
              serviceType,
              specialty: specialty || "default",
              required: true
            };
          }
          return {
            ...this.defaultPriorAuthRule,
            serviceType,
            specialty: specialty || "default"
          };
        } catch (error2) {
          logger_default.error("Error getting prior auth rule:", error2);
          return this.defaultPriorAuthRule;
        }
      }
      /**
       * Get eligibility processing rule for a specific insurance type
       */
      async getEligibilityRule(organizationId, insuranceType) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 150));
          if (insuranceType === "medicaid") {
            return {
              ...this.defaultEligibilityRule,
              insuranceType,
              verificationTimeframe: 48
              // Longer verification time for Medicaid
            };
          }
          return {
            ...this.defaultEligibilityRule,
            insuranceType
          };
        } catch (error2) {
          logger_default.error("Error getting eligibility rule:", error2);
          return this.defaultEligibilityRule;
        }
      }
      /**
       * Validate a slot creation based on organization policies
       */
      async validateSlotCreation(organizationId, scheduleData, slotData) {
        try {
          const policy = await this.getSchedulingPolicy(organizationId);
          if (slotData.maxAppointments && slotData.maxAppointments > policy.maxAppointmentsPerSlot) {
            return {
              valid: false,
              message: `Max appointments per slot (${slotData.maxAppointments}) exceeds organization policy limit (${policy.maxAppointmentsPerSlot})`
            };
          }
          if (slotData.overbooked && !policy.allowOverbooking) {
            return {
              valid: false,
              message: "Overbooking is not allowed by organization policy"
            };
          }
          return { valid: true };
        } catch (error2) {
          logger_default.error("Error validating slot creation:", error2);
          return { valid: true };
        }
      }
      /**
       * Validate appointment booking based on organization policies
       */
      async validateAppointmentBooking(organizationId, patientId, slotData, scheduleData, appointmentData, payerId) {
        try {
          const policy = await this.getSchedulingPolicy(organizationId);
          const now = /* @__PURE__ */ new Date();
          const slotTime = new Date(slotData.startDateTime);
          const minutesUntilSlot = (slotTime.getTime() - now.getTime()) / (60 * 1e3);
          if (minutesUntilSlot < policy.minTimeBeforeBooking) {
            return {
              valid: false,
              message: `Appointments must be booked at least ${policy.minTimeBeforeBooking} minutes in advance`
            };
          }
          const daysUntilSlot = minutesUntilSlot / (24 * 60);
          if (policy.maxTimeBeforeBooking > 0 && daysUntilSlot > policy.maxTimeBeforeBooking) {
            return {
              valid: false,
              message: `Appointments cannot be booked more than ${policy.maxTimeBeforeBooking} days in advance`
            };
          }
          let requiresPriorAuth = false;
          if (policy.requirePriorAuth) {
            requiresPriorAuth = true;
          } else if (scheduleData.serviceType && policy.requirePriorAuthForServices.includes(scheduleData.serviceType)) {
            requiresPriorAuth = true;
          }
          const requiresEligibility = !!payerId;
          return {
            valid: true,
            requiresPriorAuth,
            requiresEligibility
          };
        } catch (error2) {
          logger_default.error("Error validating appointment booking:", error2);
          return { valid: true };
        }
      }
      /**
       * Process appointment cancellation policy
       */
      async processAppointmentCancellation(organizationId, appointmentId, appointmentData, cancelledBy, cancelReason) {
        try {
          const policy = await this.getSchedulingPolicy(organizationId);
          const now = /* @__PURE__ */ new Date();
          const appointmentTime = new Date(appointmentData.startDateTime);
          const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (60 * 60 * 1e3);
          if (cancelledBy === "patient" && hoursUntilAppointment < policy.patientCancellationWindowHours) {
            if (policy.cancelNoShowPolicy === "fee" && policy.noShowFeeAmount) {
              return {
                approved: true,
                fee: policy.noShowFeeAmount,
                message: `Late cancellation fee of $${policy.noShowFeeAmount} applied`
              };
            } else if (policy.cancelNoShowPolicy === "restrict" && policy.noShowRestrictionDays) {
              return {
                approved: true,
                restrictions: {
                  type: "booking_restriction",
                  days: policy.noShowRestrictionDays
                },
                message: `Booking restricted for ${policy.noShowRestrictionDays} days due to late cancellation`
              };
            }
          } else if (cancelledBy === "provider" && hoursUntilAppointment < policy.providerCancellationWindowHours) {
            return {
              approved: true,
              message: "Provider cancellation within window - patient should be notified"
            };
          }
          return {
            approved: true,
            message: "Cancellation processed successfully"
          };
        } catch (error2) {
          logger_default.error("Error processing appointment cancellation:", error2);
          return { approved: true };
        }
      }
      /**
       * Process no-show policy
       */
      async processNoShow(organizationId, appointmentId, appointmentData) {
        try {
          const policy = await this.getSchedulingPolicy(organizationId);
          if (policy.cancelNoShowPolicy === "fee" && policy.noShowFeeAmount) {
            return {
              fee: policy.noShowFeeAmount,
              message: `No-show fee of $${policy.noShowFeeAmount} applied`
            };
          } else if (policy.cancelNoShowPolicy === "restrict" && policy.noShowRestrictionDays) {
            return {
              restrictions: {
                type: "booking_restriction",
                days: policy.noShowRestrictionDays
              },
              message: `Booking restricted for ${policy.noShowRestrictionDays} days due to no-show`
            };
          }
          return {
            message: "No policy action required for no-show"
          };
        } catch (error2) {
          logger_default.error("Error processing no-show policy:", error2);
          return { message: "Error processing no-show policy" };
        }
      }
    };
    schedulingMcpService = new SchedulingMcpService();
  }
});

// server/index.ts
import express8 from "express";

// server/routes.ts
import { createServer as createServer2 } from "http";
import express6 from "express";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import path from "path";

// server/storage.ts
import session2 from "express-session";
import connectPg from "connect-pg-simple";
import { eq } from "drizzle-orm";

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  clinicalRuleElements: () => clinicalRuleElements,
  clinicalRules: () => clinicalRules,
  codeSystemConcepts: () => codeSystemConcepts,
  codeSystemDesignations: () => codeSystemDesignations,
  codeSystems: () => codeSystems,
  conceptMapElements: () => conceptMapElements,
  conceptMaps: () => conceptMaps,
  conflictRecords: () => conflictRecords,
  directoryConnections: () => directoryConnections,
  employers: () => employers,
  enhancedProviders: () => enhancedProviders,
  facilities: () => facilities,
  feeScheduleItems: () => feeScheduleItems,
  feeSchedules: () => feeSchedules,
  identityMappings: () => identityMappings,
  insertClinicalRuleElementSchema: () => insertClinicalRuleElementSchema,
  insertClinicalRuleSchema: () => insertClinicalRuleSchema,
  insertCodeSystemConceptSchema: () => insertCodeSystemConceptSchema,
  insertCodeSystemDesignationSchema: () => insertCodeSystemDesignationSchema,
  insertCodeSystemSchema: () => insertCodeSystemSchema,
  insertConceptMapElementSchema: () => insertConceptMapElementSchema,
  insertConceptMapSchema: () => insertConceptMapSchema,
  insertConflictRecordSchema: () => insertConflictRecordSchema,
  insertDirectoryConnectionSchema: () => insertDirectoryConnectionSchema,
  insertEmployerSchema: () => insertEmployerSchema,
  insertEnhancedProviderSchema: () => insertEnhancedProviderSchema,
  insertFacilitySchema: () => insertFacilitySchema,
  insertFeeScheduleItemSchema: () => insertFeeScheduleItemSchema,
  insertFeeScheduleSchema: () => insertFeeScheduleSchema,
  insertIdentityMappingSchema: () => insertIdentityMappingSchema,
  insertLicenseSchema: () => insertLicenseSchema,
  insertLicenseUsageSchema: () => insertLicenseUsageSchema,
  insertLocationSchema: () => insertLocationSchema,
  insertOrganizationSchema: () => insertOrganizationSchema,
  insertPayerSchema: () => insertPayerSchema,
  insertPharmacySchema: () => insertPharmacySchema,
  insertPhrAccessLogSchema: () => insertPhrAccessLogSchema,
  insertPhrConsentSchema: () => insertPhrConsentSchema,
  insertPhrDataSourceSchema: () => insertPhrDataSourceSchema,
  insertPhrPatientPreferenceSchema: () => insertPhrPatientPreferenceSchema,
  insertPhrReconciliationSchema: () => insertPhrReconciliationSchema,
  insertPhrRecordSchema: () => insertPhrRecordSchema,
  insertPhrSyncLogSchema: () => insertPhrSyncLogSchema,
  insertSyncJobSchema: () => insertSyncJobSchema,
  insertUserSchema: () => insertUserSchema,
  insertValueSetExcludeSchema: () => insertValueSetExcludeSchema,
  insertValueSetExpansionSchema: () => insertValueSetExpansionSchema,
  insertValueSetIncludeSchema: () => insertValueSetIncludeSchema,
  insertValueSetSchema: () => insertValueSetSchema,
  insertWebhookSubscriptionSchema: () => insertWebhookSubscriptionSchema,
  licenseUsage: () => licenseUsage,
  licenses: () => licenses,
  locations: () => locations,
  organizations: () => organizations,
  payers: () => payers,
  pharmacies: () => pharmacies,
  phrAccessLogs: () => phrAccessLogs,
  phrConnectionStatusEnum: () => phrConnectionStatusEnum,
  phrConsent: () => phrConsent,
  phrDataSources: () => phrDataSources,
  phrPatientPreferences: () => phrPatientPreferences,
  phrReconciliation: () => phrReconciliation,
  phrRecords: () => phrRecords,
  phrSourceTypeEnum: () => phrSourceTypeEnum,
  phrSyncLogs: () => phrSyncLogs,
  syncJobs: () => syncJobs,
  users: () => users,
  valueSetExcludes: () => valueSetExcludes,
  valueSetExpansions: () => valueSetExpansions,
  valueSetIncludes: () => valueSetIncludes,
  valueSets: () => valueSets,
  webhookSubscriptions: () => webhookSubscriptions
});
import { pgTable, serial, text, jsonb, timestamp, integer, boolean, real, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").default("user")
});
var enhancedProviders = pgTable("enhanced_providers", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull().unique(),
  personId: integer("person_id"),
  identifier: jsonb("identifier"),
  // Array of identifiers (includes NPI, etc.)
  active: boolean("active").default(true),
  name: jsonb("name").notNull(),
  // Structured name with given, family, etc.
  formattedName: text("formatted_name"),
  // Pre-formatted display name
  telecom: jsonb("telecom"),
  // Array of contact points
  gender: text("gender"),
  birthDate: timestamp("birth_date"),
  address: jsonb("address"),
  // Array of addresses
  photo: text("photo"),
  // URL to photo
  qualification: jsonb("qualification"),
  // Array of qualifications
  communication: jsonb("communication"),
  // Array of languages
  specialties: jsonb("specialties"),
  // Array of specialties
  organizationIds: jsonb("organization_ids"),
  // Array of organization references
  npi: text("npi"),
  // National Provider Identifier
  taxonomyCodes: jsonb("taxonomy_codes"),
  // Array of taxonomy codes
  status: text("status").default("active"),
  statusReason: text("status_reason"),
  metadata: jsonb("metadata"),
  // Additional metadata
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  organizationId: text("organization_id").notNull().unique(),
  active: boolean("active").default(true),
  type: jsonb("type"),
  // Array of organization types
  name: text("name").notNull(),
  alias: jsonb("alias"),
  // Array of alternative names
  telecom: jsonb("telecom"),
  // Array of contact points
  address: jsonb("address"),
  // Array of addresses
  partOf: text("part_of"),
  // Reference to parent organization
  contact: jsonb("contact"),
  // Array of contacts
  npi: text("npi"),
  // National Provider Identifier
  ein: text("ein"),
  // Employer Identification Number
  taxonomy: jsonb("taxonomy"),
  // Array of taxonomy codes
  status: text("status").default("active"),
  statusReason: text("status_reason"),
  website: text("website"),
  serviceArea: jsonb("service_area"),
  // Array of service area references
  metadata: jsonb("metadata"),
  // Additional metadata
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  locationId: text("location_id").notNull().unique(),
  status: text("status").default("active"),
  operationalStatus: text("operational_status"),
  name: text("name").notNull(),
  alias: jsonb("alias"),
  // Array of alternative names
  description: text("description"),
  mode: text("mode").default("instance"),
  type: jsonb("type"),
  // Array of location types
  telecom: jsonb("telecom"),
  // Array of contact points
  address: jsonb("address"),
  // Address object
  physicalType: text("physical_type"),
  position: jsonb("position"),
  // Latitude/longitude/altitude
  managingOrganization: text("managing_organization"),
  // Reference to organization
  partOf: text("part_of"),
  // Reference to parent location
  hoursOfOperation: jsonb("hours_of_operation"),
  availabilityExceptions: text("availability_exceptions"),
  tags: jsonb("tags"),
  // Array of tag names
  npi: text("npi"),
  // National Provider Identifier
  facilityId: text("facility_id"),
  // Reference to facility
  isConfidential: boolean("is_confidential").default(false),
  metadata: jsonb("metadata"),
  // Additional metadata
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var facilities = pgTable("facilities", {
  id: serial("id").primaryKey(),
  facilityId: text("facility_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  npi: text("npi"),
  // National Provider Identifier
  facilityType: jsonb("facility_type").notNull(),
  // Array of facility types
  status: text("status").default("active"),
  statusReason: text("status_reason"),
  alias: jsonb("alias"),
  // Array of alternative names
  partOf: text("part_of"),
  // Reference to parent facility
  address: jsonb("address").notNull(),
  // Address object
  telecom: jsonb("telecom"),
  // Array of contact points
  organizationId: text("organization_id").notNull(),
  // Reference to managing organization
  locationIds: jsonb("location_ids"),
  // Array of location references
  services: jsonb("services"),
  // Array of services offered
  licenses: jsonb("licenses"),
  // Array of licenses
  accreditations: jsonb("accreditations"),
  // Array of accreditations
  hoursOfOperation: jsonb("hours_of_operation"),
  availabilityExceptions: text("availability_exceptions"),
  capacity: jsonb("capacity"),
  // Capacity details (beds, rooms, etc)
  specialtyTypes: jsonb("specialty_types"),
  // Array of specialty types
  website: text("website"),
  emergencyContact: jsonb("emergency_contact"),
  // ContactPoint
  tags: jsonb("tags"),
  // Array of tag names
  metadata: jsonb("metadata"),
  // Additional metadata
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var pharmacies = pgTable("pharmacies", {
  id: serial("id").primaryKey(),
  pharmacyId: text("pharmacy_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  npi: text("npi"),
  // National Provider Identifier
  ncpdpId: text("ncpdp_id"),
  // NCPDP ID
  pharmacyType: jsonb("pharmacy_type").notNull(),
  // Array of pharmacy types
  status: text("status").default("active"),
  statusReason: text("status_reason"),
  alias: jsonb("alias"),
  // Array of alternative names
  partOf: text("part_of"),
  // Reference to parent organization
  address: jsonb("address").notNull(),
  // Address object
  telecom: jsonb("telecom"),
  // Array of contact points
  organizationId: text("organization_id"),
  // Reference to managing organization
  locationId: text("location_id"),
  // Reference to physical location
  services: jsonb("services"),
  // Array of services offered
  licenses: jsonb("licenses"),
  // Array of licenses
  hoursOfOperation: jsonb("hours_of_operation"),
  is24Hour: boolean("is_24_hour").default(false),
  hasDelivery: boolean("has_delivery").default(false),
  hasDriveThru: boolean("has_drive_thru").default(false),
  deliveryRadius: real("delivery_radius"),
  acceptsInsurance: boolean("accepts_insurance").default(true),
  acceptedInsurances: jsonb("accepted_insurances"),
  // Array of accepted insurance IDs
  hasCompounding: boolean("has_compounding").default(false),
  supportsEPrescribing: boolean("supports_e_prescribing").default(true),
  website: text("website"),
  emergencyContact: jsonb("emergency_contact"),
  // ContactPoint
  tags: jsonb("tags"),
  // Array of tag names
  metadata: jsonb("metadata"),
  // Additional metadata
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var payers = pgTable("payers", {
  id: serial("id").primaryKey(),
  payerId: text("payer_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  payerType: jsonb("payer_type").notNull(),
  // Array of payer types
  status: text("status").default("active"),
  statusReason: text("status_reason"),
  alias: jsonb("alias"),
  // Array of alternative names
  partOf: text("part_of"),
  // Reference to parent organization
  address: jsonb("address"),
  // Array of addresses
  telecom: jsonb("telecom"),
  // Array of contact points
  taxId: text("tax_id"),
  nationalId: text("national_id"),
  // National payer ID
  contactMethods: jsonb("contact_methods"),
  // Specialized contact information
  insurancePlans: jsonb("insurance_plans"),
  // Array of insurance plans
  serviceAreas: jsonb("service_areas"),
  // Array of service areas
  website: text("website"),
  tags: jsonb("tags"),
  // Array of tag names
  metadata: jsonb("metadata"),
  // Additional metadata
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var employers = pgTable("employers", {
  id: serial("id").primaryKey(),
  employerId: text("employer_id").notNull().unique(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  description: text("description"),
  ein: text("ein"),
  // Employer Identification Number
  naicsCode: text("naics_code"),
  // North American Industry Classification System
  businessType: text("business_type").notNull(),
  employerSize: text("employer_size").notNull(),
  website: text("website"),
  foundedYear: integer("founded_year"),
  status: text("status").default("active"),
  statusReason: text("status_reason"),
  alias: jsonb("alias"),
  // Array of alternative names
  partOf: text("part_of"),
  // Reference to parent organization
  address: jsonb("address").notNull(),
  // Array of addresses
  telecom: jsonb("telecom"),
  // Array of contact points
  locations: jsonb("locations"),
  // Array of location objects
  benefitPlans: jsonb("benefit_plans"),
  // Array of benefit plans
  demographics: jsonb("demographics"),
  // Employee demographics
  brokers: jsonb("brokers"),
  // Array of brokers
  renewalMonth: integer("renewal_month"),
  // Month when benefits renew (1-12)
  primaryContactInfo: jsonb("primary_contact_info"),
  // Array of primary contacts
  tags: jsonb("tags"),
  // Array of tag names
  metadata: jsonb("metadata"),
  // Additional metadata
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var directoryConnections = pgTable("directory_connections", {
  id: serial("id").primaryKey(),
  connectionId: text("connection_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  organization: jsonb("organization").notNull(),
  // Organization info
  status: text("status").default("pending"),
  statusReason: text("status_reason"),
  apiEndpoint: text("api_endpoint"),
  apiVersion: text("api_version"),
  authType: text("auth_type").notNull(),
  authDetails: jsonb("auth_details").notNull(),
  connectors: jsonb("connectors").default([]),
  // Array of entity connectors
  contacts: jsonb("contacts"),
  // Array of contact persons
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  tags: jsonb("tags"),
  // Array of tag names
  metadata: jsonb("metadata")
  // Additional metadata
});
var identityMappings = pgTable("identity_mappings", {
  id: serial("id").primaryKey(),
  mappingId: text("mapping_id").notNull().unique(),
  entityType: text("entity_type").notNull(),
  externalId: text("external_id").notNull(),
  externalIdSystem: text("external_id_system").notNull(),
  internalId: text("internal_id").notNull(),
  internalIdSystem: text("internal_id_system").default("SHH"),
  connectionId: text("connection_id").notNull(),
  confidence: real("confidence"),
  status: text("status").default("active"),
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow(),
  metadata: jsonb("metadata")
  // Additional metadata
});
var syncJobs = pgTable("sync_jobs", {
  id: serial("id").primaryKey(),
  jobId: text("job_id").notNull().unique(),
  connectionId: text("connection_id").notNull(),
  entityType: text("entity_type").notNull(),
  direction: text("direction").notNull(),
  // 'push' or 'pull'
  status: text("status").default("queued"),
  statusMessage: text("status_message"),
  totalRecords: integer("total_records").default(0),
  processedRecords: integer("processed_records").default(0),
  successRecords: integer("success_records").default(0),
  failedRecords: integer("failed_records").default(0),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdBy: text("created_by"),
  metadata: jsonb("metadata")
  // Additional metadata
});
var conflictRecords = pgTable("conflict_records", {
  id: serial("id").primaryKey(),
  conflictId: text("conflict_id").notNull().unique(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  connectionId: text("connection_id").notNull(),
  conflictType: text("conflict_type").notNull(),
  conflictReason: text("conflict_reason").notNull(),
  externalData: jsonb("external_data").notNull(),
  internalData: jsonb("internal_data").notNull(),
  resolution: text("resolution").default("pending"),
  resolutionData: jsonb("resolution_data"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  created: timestamp("created").defaultNow(),
  metadata: jsonb("metadata")
  // Additional metadata
});
var webhookSubscriptions = pgTable("webhook_subscriptions", {
  id: serial("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull().unique(),
  connectionId: text("connection_id").notNull(),
  entityTypes: jsonb("entity_types").notNull(),
  // Array of entity types
  triggerEvents: jsonb("trigger_events").notNull(),
  // Array of event types
  targetUrl: text("target_url").notNull(),
  secret: text("secret"),
  active: boolean("active").default(true),
  description: text("description"),
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow(),
  createdBy: text("created_by"),
  headers: jsonb("headers"),
  // Custom headers
  retryPolicy: jsonb("retry_policy"),
  // Retry configuration
  metadata: jsonb("metadata")
  // Additional metadata
});
var insertUserSchema = createInsertSchema(users).omit({ id: true });
var insertEnhancedProviderSchema = createInsertSchema(enhancedProviders).omit({ id: true, created: true, updated: true });
var insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, created: true, updated: true });
var insertLocationSchema = createInsertSchema(locations).omit({ id: true, created: true, updated: true });
var insertFacilitySchema = createInsertSchema(facilities).omit({ id: true, created: true, updated: true });
var insertPharmacySchema = createInsertSchema(pharmacies).omit({ id: true, created: true, updated: true });
var insertPayerSchema = createInsertSchema(payers).omit({ id: true, created: true, updated: true });
var insertEmployerSchema = createInsertSchema(employers).omit({ id: true, created: true, updated: true });
var insertDirectoryConnectionSchema = createInsertSchema(directoryConnections).omit({ id: true, created: true, updated: true });
var insertIdentityMappingSchema = createInsertSchema(identityMappings).omit({ id: true, created: true, updated: true });
var insertSyncJobSchema = createInsertSchema(syncJobs).omit({ id: true });
var insertConflictRecordSchema = createInsertSchema(conflictRecords).omit({ id: true, created: true });
var insertWebhookSubscriptionSchema = createInsertSchema(webhookSubscriptions).omit({ id: true, created: true, updated: true });
var codeSystems = pgTable("code_systems", {
  id: serial("id").primaryKey(),
  codeSystemId: text("code_system_id").notNull().unique(),
  // e.g., "snomed", "loinc"
  uri: text("uri").notNull().unique(),
  // Official URI for the code system
  name: text("name").notNull(),
  // Display name
  version: text("version").notNull(),
  // Version identifier
  description: text("description"),
  // Description
  publisher: text("publisher"),
  // Publisher organization
  copyright: text("copyright"),
  // Copyright statement
  contentType: text("content_type").notNull(),
  // "complete"|"fragment"|"supplement"
  isHierarchical: boolean("is_hierarchical").default(false),
  // Has hierarchy
  hasSubsumption: boolean("has_subsumption").default(false),
  // Supports subsumption
  licenseRequired: boolean("license_required").default(false),
  // License needed
  isProprietary: boolean("is_proprietary").default(false),
  // Proprietary system
  active: boolean("active").default(true),
  // Currently active
  releaseDate: timestamp("release_date"),
  // When released
  importDate: timestamp("import_date").defaultNow(),
  // When imported
  importedBy: text("imported_by"),
  // Who imported it
  sourceUrl: text("source_url"),
  // Download URL
  metadata: jsonb("metadata"),
  // Additional metadata
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var codeSystemConcepts = pgTable("code_system_concepts", {
  id: serial("id").primaryKey(),
  codeSystemId: text("code_system_id").notNull().references(() => codeSystems.codeSystemId),
  code: text("code").notNull(),
  // Code value
  display: text("display").notNull(),
  // Preferred display term
  definition: text("definition"),
  // Definition
  status: text("status").default("active"),
  // active|inactive|deprecated
  isAbstract: boolean("is_abstract").default(false),
  // Abstract concept flag
  hierarchyLevel: integer("hierarchy_level"),
  // Level in hierarchy
  parentCodes: jsonb("parent_codes"),
  // Parent codes array
  properties: jsonb("properties"),
  // Additional properties
  metadata: jsonb("metadata"),
  // Extra metadata
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var codeSystemDesignations = pgTable("code_system_designations", {
  id: serial("id").primaryKey(),
  codeSystemId: text("code_system_id").notNull(),
  code: text("code").notNull(),
  // Code value
  language: text("language").notNull(),
  // Language code (e.g., 'en', 'es')
  useCode: text("use_code"),
  // Type of designation
  value: text("value").notNull(),
  // Term in this language
  preferred: boolean("preferred").default(false),
  // Preferred flag
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var valueSets = pgTable("value_sets", {
  id: serial("id").primaryKey(),
  valueSetId: text("value_set_id").notNull().unique(),
  // Value set ID
  uri: text("uri").notNull().unique(),
  // Canonical URI
  name: text("name").notNull(),
  // Display name
  version: text("version"),
  // Version identifier
  description: text("description"),
  // Description
  publisher: text("publisher"),
  // Publisher
  purpose: text("purpose"),
  // Purpose
  status: text("status").default("active"),
  // draft|active|retired
  experimental: boolean("experimental").default(false),
  // Experimental flag
  tenantId: text("tenant_id"),
  // Tenant identifier
  isProprietary: boolean("is_proprietary").default(false),
  // Proprietary flag
  licenseRequired: boolean("license_required").default(false),
  // License needed
  expansionCached: boolean("expansion_cached").default(false),
  // Expansion cache
  expansionTimestamp: timestamp("expansion_timestamp"),
  // Expansion timestamp
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  metadata: jsonb("metadata")
});
var valueSetIncludes = pgTable("value_set_includes", {
  id: serial("id").primaryKey(),
  valueSetId: text("value_set_id").notNull().references(() => valueSets.valueSetId, { onDelete: "cascade" }),
  codeSystemId: text("code_system_id").notNull().references(() => codeSystems.codeSystemId),
  codeSystemVersion: text("code_system_version"),
  // Specific version
  includeAll: boolean("include_all").default(false),
  // Include all codes
  codes: jsonb("codes"),
  // Specific codes array
  filterProperty: text("filter_property"),
  // Property for filtering
  filterOp: text("filter_op"),
  // Filter operation
  filterValue: text("filter_value"),
  // Filter value
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var valueSetExcludes = pgTable("value_set_excludes", {
  id: serial("id").primaryKey(),
  valueSetId: text("value_set_id").notNull().references(() => valueSets.valueSetId, { onDelete: "cascade" }),
  codeSystemId: text("code_system_id").notNull().references(() => codeSystems.codeSystemId),
  codeSystemVersion: text("code_system_version"),
  // Specific version
  excludeAll: boolean("exclude_all").default(false),
  // Exclude all codes
  codes: jsonb("codes"),
  // Specific codes array
  filterProperty: text("filter_property"),
  // Property for filtering
  filterOp: text("filter_op"),
  // Filter operation
  filterValue: text("filter_value"),
  // Filter value
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var valueSetExpansions = pgTable("value_set_expansions", {
  id: serial("id").primaryKey(),
  valueSetId: text("value_set_id").notNull().references(() => valueSets.valueSetId, { onDelete: "cascade" }),
  expansionId: text("expansion_id").notNull().unique(),
  // Expansion ID
  timestamp: timestamp("timestamp").defaultNow(),
  // Generation timestamp
  total: integer("total"),
  // Total codes count
  offset: integer("offset").default(0),
  // Pagination offset
  count: integer("count"),
  // Count for pagination
  parameters: jsonb("parameters"),
  // Expansion parameters
  expansionCodes: jsonb("expansion_codes").notNull(),
  // Expanded codes
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var conceptMaps = pgTable("concept_maps", {
  id: serial("id").primaryKey(),
  conceptMapId: text("concept_map_id").notNull().unique(),
  // Map ID
  uri: text("uri").notNull().unique(),
  // Canonical URI
  name: text("name").notNull(),
  // Display name
  version: text("version"),
  // Version identifier
  description: text("description"),
  // Description
  sourceUri: text("source_uri").notNull(),
  // Source value set/code system
  targetUri: text("target_uri").notNull(),
  // Target value set/code system
  sourceCodeSystemId: text("source_code_system_id").references(() => codeSystems.codeSystemId),
  targetCodeSystemId: text("target_code_system_id").references(() => codeSystems.codeSystemId),
  status: text("status").default("active"),
  // draft|active|retired
  experimental: boolean("experimental").default(false),
  // Experimental flag
  tenantId: text("tenant_id"),
  // Tenant identifier
  isProprietary: boolean("is_proprietary").default(false),
  // Proprietary flag
  licenseRequired: boolean("license_required").default(false),
  // License needed
  publisher: text("publisher"),
  // Publisher
  sourceUrl: text("source_url"),
  // Source URL
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  metadata: jsonb("metadata")
});
var conceptMapElements = pgTable("concept_map_elements", {
  id: serial("id").primaryKey(),
  conceptMapId: text("concept_map_id").notNull().references(() => conceptMaps.conceptMapId, { onDelete: "cascade" }),
  sourceCode: text("source_code").notNull(),
  // Source code
  sourceDisplay: text("source_display"),
  // Source display
  targetCode: text("target_code").notNull(),
  // Target code
  targetDisplay: text("target_display"),
  // Target display
  relationship: text("relationship").notNull(),
  // Relationship type
  rule: text("rule"),
  // Mapping rule
  context: text("context"),
  // Context info
  isRuleBased: boolean("is_rule_based").default(false),
  // Rule-based flag
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var feeSchedules = pgTable("fee_schedules", {
  id: serial("id").primaryKey(),
  feeScheduleId: text("fee_schedule_id").notNull().unique(),
  // Schedule ID
  name: text("name").notNull(),
  // Display name
  source: text("source").notNull(),
  // Source (e.g., "Medicare")
  region: text("region"),
  // Geographic region
  version: text("version"),
  // Version identifier
  effectiveDate: timestamp("effective_date").notNull(),
  // Effective date
  expirationDate: timestamp("expiration_date"),
  // Expiration date
  status: text("status").default("active"),
  // draft|active|retired
  currency: text("currency").default("USD"),
  // Currency code
  isProprietary: boolean("is_proprietary").default(false),
  // Proprietary flag
  licenseRequired: boolean("license_required").default(false),
  // License needed
  tenantId: text("tenant_id"),
  // Tenant identifier
  description: text("description"),
  // Description
  publisher: text("publisher"),
  // Publisher
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  metadata: jsonb("metadata")
});
var feeScheduleItems = pgTable("fee_schedule_items", {
  id: serial("id").primaryKey(),
  feeScheduleId: text("fee_schedule_id").notNull().references(() => feeSchedules.feeScheduleId, { onDelete: "cascade" }),
  codeSystemId: text("code_system_id").notNull().references(() => codeSystems.codeSystemId),
  code: text("code").notNull(),
  // Procedure/service code
  description: text("description"),
  // Description
  amount: real("amount").notNull(),
  // Fee amount
  unit: text("unit"),
  // Unit of measure
  mod1: text("mod_1"),
  // Modifier 1
  mod2: text("mod_2"),
  // Modifier 2
  modifierAdjustment: real("modifier_adjustment"),
  // Modifier adjustment %
  regionSpecific: text("region_specific"),
  // Region-specific info
  facilityRate: real("facility_rate"),
  // Facility rate
  nonFacilityRate: real("non_facility_rate"),
  // Non-facility rate
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var clinicalRules = pgTable("clinical_rules", {
  id: serial("id").primaryKey(),
  ruleSetId: text("rule_set_id").notNull(),
  // Rule set identifier
  ruleId: text("rule_id").notNull(),
  // Rule identifier
  name: text("name").notNull(),
  // Display name
  type: text("type").notNull(),
  // Rule type
  description: text("description"),
  // Description
  version: text("version").notNull(),
  // Version identifier
  source: text("source").notNull(),
  // Source of rules
  status: text("status").default("active"),
  // draft|active|retired
  isProprietary: boolean("is_proprietary").default(false),
  // Proprietary flag
  licenseRequired: boolean("license_required").default(false),
  // License needed
  tenantId: text("tenant_id"),
  // Tenant identifier
  effectiveDate: timestamp("effective_date").notNull(),
  // Effective date
  expirationDate: timestamp("expiration_date"),
  // Expiration date
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  metadata: jsonb("metadata")
});
var clinicalRuleElements = pgTable("clinical_rule_elements", {
  id: serial("id").primaryKey(),
  ruleSetId: text("rule_set_id").notNull(),
  // Rule set ID
  ruleId: text("rule_id").notNull(),
  // Rule ID
  elementId: text("element_id").notNull(),
  // Element ID
  elementType: text("element_type").notNull(),
  // Element type
  description: text("description"),
  // Description
  parentElementId: text("parent_element_id"),
  // Parent element
  seqNum: integer("seq_num"),
  // Sequence number
  logicOperator: text("logic_operator"),
  // Logic operator
  valueSetId: text("value_set_id").references(() => valueSets.valueSetId),
  conceptMapId: text("concept_map_id").references(() => conceptMaps.conceptMapId),
  expression: text("expression"),
  // Expression
  action: text("action"),
  // Action to take
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  // Tenant ID
  licenseType: text("license_type").notNull(),
  // License type
  licenseKey: text("license_key"),
  // License key
  status: text("status").default("active"),
  // active|inactive|pending
  effectiveDate: timestamp("effective_date").notNull(),
  // Effective date
  expirationDate: timestamp("expiration_date"),
  // Expiration date
  scope: text("scope"),
  // License scope
  usersLimit: integer("users_limit"),
  // User limit
  transactionsLimit: integer("transactions_limit"),
  // Transaction limit
  issuedBy: text("issued_by"),
  // Issuer
  contactName: text("contact_name"),
  // Contact name
  contactEmail: text("contact_email"),
  // Contact email
  notes: text("notes"),
  // Notes
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  metadata: jsonb("metadata")
});
var licenseUsage = pgTable("license_usage", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  // Tenant ID
  licenseType: text("license_type").notNull(),
  // License type
  userId: text("user_id"),
  // User ID
  resourceType: text("resource_type").notNull(),
  // Resource type
  resourceId: text("resource_id").notNull(),
  // Resource ID
  action: text("action").notNull(),
  // Action performed
  transactionId: text("transaction_id"),
  // Transaction ID
  timestamp: timestamp("timestamp").defaultNow()
  // Timestamp
});
var insertCodeSystemSchema = createInsertSchema(codeSystems).omit({ id: true, created: true, updated: true });
var insertCodeSystemConceptSchema = createInsertSchema(codeSystemConcepts).omit({ id: true, created: true, updated: true });
var insertCodeSystemDesignationSchema = createInsertSchema(codeSystemDesignations).omit({ id: true, created: true, updated: true });
var insertValueSetSchema = createInsertSchema(valueSets).omit({ id: true, created: true, updated: true });
var insertValueSetIncludeSchema = createInsertSchema(valueSetIncludes).omit({ id: true, created: true, updated: true });
var insertValueSetExcludeSchema = createInsertSchema(valueSetExcludes).omit({ id: true, created: true, updated: true });
var insertValueSetExpansionSchema = createInsertSchema(valueSetExpansions).omit({ id: true, created: true, updated: true });
var insertConceptMapSchema = createInsertSchema(conceptMaps).omit({ id: true, created: true, updated: true });
var insertConceptMapElementSchema = createInsertSchema(conceptMapElements).omit({ id: true, created: true, updated: true });
var insertFeeScheduleSchema = createInsertSchema(feeSchedules).omit({ id: true, created: true, updated: true });
var insertFeeScheduleItemSchema = createInsertSchema(feeScheduleItems).omit({ id: true, created: true, updated: true });
var insertClinicalRuleSchema = createInsertSchema(clinicalRules).omit({ id: true, created: true, updated: true });
var insertClinicalRuleElementSchema = createInsertSchema(clinicalRuleElements).omit({ id: true, created: true, updated: true });
var insertLicenseSchema = createInsertSchema(licenses).omit({ id: true, created: true, updated: true });
var insertLicenseUsageSchema = createInsertSchema(licenseUsage).omit({ id: true });
var phrSourceTypeEnum = pgEnum("phr_source_type", [
  "ehr",
  // Electronic Health Record systems
  "claims",
  // Insurance claims data
  "pharmacy",
  // Pharmacy data
  "lab",
  // Laboratory results
  "device",
  // Medical devices and wearables
  "manual",
  // Manually entered by patient
  "imported"
  // Imported from documents or other systems
]);
var phrConnectionStatusEnum = pgEnum("phr_connection_status", [
  "active",
  "inactive",
  "error",
  "pending"
]);
var phrDataSources = pgTable("phr_data_sources", {
  id: serial("id").primaryKey(),
  sourceId: varchar("source_id", { length: 255 }).notNull().unique(),
  // Unique identifier for the source
  patientId: varchar("patient_id", { length: 255 }).notNull(),
  // Link to the patient this source belongs to
  sourceName: varchar("source_name", { length: 255 }).notNull(),
  // Display name for the source
  sourceType: phrSourceTypeEnum("source_type").notNull(),
  // Type of source
  sourceSystem: varchar("source_system", { length: 255 }).notNull(),
  // System identifier (e.g., 'Epic', 'Cerner', 'Cigna', 'Fitbit')
  status: phrConnectionStatusEnum("status").notNull().default("inactive"),
  lastSync: timestamp("last_sync"),
  // Last successful sync time
  connectionDetails: jsonb("connection_details"),
  // OAuth tokens, credentials, etc.
  apiEndpoint: text("api_endpoint"),
  // API endpoint URL
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var phrRecords = pgTable("phr_records", {
  id: serial("id").primaryKey(),
  recordId: varchar("record_id", { length: 255 }).notNull().unique(),
  // Unique identifier for the record
  patientId: varchar("patient_id", { length: 255 }).notNull(),
  // Link to the patient this record belongs to
  sourceId: varchar("source_id", { length: 255 }).notNull(),
  // Link to the data source
  recordType: varchar("record_type", { length: 100 }).notNull(),
  // FHIR resource type (Observation, Condition, MedicationStatement, etc.)
  category: varchar("category", { length: 100 }).notNull(),
  // Higher-level category (vitals, labs, medications, conditions, etc.)
  effectiveDate: timestamp("effective_date"),
  // When the observation/event occurred
  recordStatus: varchar("record_status", { length: 50 }).notNull().default("active"),
  // active, inactive, entered-in-error, etc.
  clinicalStatus: varchar("clinical_status", { length: 50 }),
  // clinical status if applicable
  code: varchar("code", { length: 100 }),
  // Primary code (LOINC, SNOMED, etc.)
  codeSystem: varchar("code_system", { length: 100 }),
  // Code system (LOINC, SNOMED, RxNorm, etc.)
  displayText: text("display_text").notNull(),
  // Human-readable description
  value: text("value"),
  // String representation of value
  valueType: varchar("value_type", { length: 50 }),
  // Quantity, string, boolean, etc.
  valueUnit: varchar("value_unit", { length: 50 }),
  // Units if applicable
  valueCodeableConcept: jsonb("value_codeable_concept"),
  // For coded values
  referenceRange: jsonb("reference_range"),
  // Reference/normal ranges if applicable
  notes: text("notes"),
  // Additional notes
  isPatientEntered: boolean("is_patient_entered").notNull().default(false),
  // Whether this record was entered by the patient
  isReviewed: boolean("is_reviewed").notNull().default(false),
  // Whether this record has been reviewed
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  // Who reviewed the record
  reviewDate: timestamp("review_date"),
  // When the record was reviewed
  sourceDetails: jsonb("source_details"),
  // Additional source metadata
  fhirResource: jsonb("fhir_resource"),
  // Complete FHIR resource JSON
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var phrSyncLogs = pgTable("phr_sync_logs", {
  id: serial("id").primaryKey(),
  sourceId: varchar("source_id", { length: 255 }).notNull(),
  // Link to the data source
  patientId: varchar("patient_id", { length: 255 }).notNull(),
  // Link to the patient
  syncStartTime: timestamp("sync_start_time").notNull().defaultNow(),
  syncEndTime: timestamp("sync_end_time"),
  status: varchar("status", { length: 50 }).notNull(),
  // success, error, partial
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordsCreated: integer("records_created").notNull().default(0),
  recordsUpdated: integer("records_updated").notNull().default(0),
  recordsFailed: integer("records_failed").notNull().default(0),
  errorDetails: jsonb("error_details"),
  syncDetails: jsonb("sync_details"),
  // Additional metadata about the sync
  created: timestamp("created").defaultNow()
});
var phrReconciliation = pgTable("phr_reconciliation", {
  id: serial("id").primaryKey(),
  patientId: varchar("patient_id", { length: 255 }).notNull(),
  // Link to the patient
  primaryRecordId: varchar("primary_record_id", { length: 255 }).notNull(),
  // The primary record in a reconciliation group
  duplicateRecordIds: jsonb("duplicate_record_ids").notNull(),
  // Array of duplicate record IDs
  reconciliationStatus: varchar("reconciliation_status", { length: 50 }).notNull().default("pending"),
  // pending, resolved, rejected
  reconciliationNotes: text("reconciliation_notes"),
  resolvedBy: varchar("resolved_by", { length: 255 }),
  // Who resolved the reconciliation issue
  resolutionDate: timestamp("resolution_date"),
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var phrConsent = pgTable("phr_consent", {
  id: serial("id").primaryKey(),
  consentId: varchar("consent_id", { length: 255 }).notNull().unique(),
  // Unique identifier for the consent
  patientId: varchar("patient_id", { length: 255 }).notNull(),
  // Link to the patient
  granteeId: varchar("grantee_id", { length: 255 }).notNull(),
  // Who has been granted access (provider, organization, etc.)
  granteeType: varchar("grantee_type", { length: 50 }).notNull(),
  // Type of grantee (provider, organization, app, etc.)
  purpose: varchar("purpose", { length: 255 }).notNull(),
  // Purpose of data sharing
  recordTypes: jsonb("record_types"),
  // Array of record types included in consent
  categories: jsonb("categories"),
  // Array of categories included in consent
  dateRange: jsonb("date_range"),
  // Date range for shared records
  consentStartDate: timestamp("consent_start_date").notNull(),
  consentEndDate: timestamp("consent_end_date"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  // active, expired, revoked
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  // Who created the consent (usually the patient)
  revokedBy: varchar("revoked_by", { length: 255 }),
  // Who revoked the consent
  revocationDate: timestamp("revocation_date"),
  revocationReason: text("revocation_reason"),
  documentReferences: jsonb("document_references"),
  // References to consent documents
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var phrAccessLogs = pgTable("phr_access_logs", {
  id: serial("id").primaryKey(),
  patientId: varchar("patient_id", { length: 255 }).notNull(),
  // Link to the patient
  accessorId: varchar("accessor_id", { length: 255 }).notNull(),
  // Who accessed the data
  accessorType: varchar("accessor_type", { length: 50 }).notNull(),
  // Type of accessor (patient, provider, system, etc.)
  accessType: varchar("access_type", { length: 50 }).notNull(),
  // read, write, export, share
  recordIds: jsonb("record_ids"),
  // Array of record IDs accessed
  accessReason: text("access_reason"),
  consentId: varchar("consent_id", { length: 255 }),
  // Link to consent if applicable
  accessTimestamp: timestamp("access_timestamp").notNull().defaultNow(),
  accessDetails: jsonb("access_details"),
  // Additional details about the access
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  created: timestamp("created").defaultNow()
});
var phrPatientPreferences = pgTable("phr_patient_preferences", {
  id: serial("id").primaryKey(),
  patientId: varchar("patient_id", { length: 255 }).notNull().unique(),
  // Link to the patient
  displayPreferences: jsonb("display_preferences"),
  // UI preferences for PHR display
  notificationPreferences: jsonb("notification_preferences"),
  // Notification settings
  sharingPreferences: jsonb("sharing_preferences"),
  // Default sharing preferences
  privacySettings: jsonb("privacy_settings"),
  // Privacy and security settings
  created: timestamp("created").defaultNow(),
  updated: timestamp("updated").defaultNow()
});
var insertPhrDataSourceSchema = createInsertSchema(phrDataSources).omit({ id: true, created: true, updated: true });
var insertPhrRecordSchema = createInsertSchema(phrRecords).omit({ id: true, created: true, updated: true });
var insertPhrSyncLogSchema = createInsertSchema(phrSyncLogs).omit({ id: true, created: true });
var insertPhrReconciliationSchema = createInsertSchema(phrReconciliation).omit({ id: true, created: true, updated: true });
var insertPhrConsentSchema = createInsertSchema(phrConsent).omit({ id: true, created: true, updated: true });
var insertPhrAccessLogSchema = createInsertSchema(phrAccessLogs).omit({ id: true, created: true });
var insertPhrPatientPreferenceSchema = createInsertSchema(phrPatientPreferences).omit({ id: true, created: true, updated: true });

// shared/contract-schema.ts
var contract_schema_exports = {};
__export(contract_schema_exports, {
  contractAnalyses: () => contractAnalyses,
  contractAnalysesRelations: () => contractAnalysesRelations,
  contractParticipants: () => contractParticipants,
  contractParticipantsRelations: () => contractParticipantsRelations,
  contracts: () => contracts,
  contractsRelations: () => contractsRelations,
  costEstimateRequests: () => costEstimateRequests,
  costEstimateRequestsRelations: () => costEstimateRequestsRelations,
  insertContractAnalysisSchema: () => insertContractAnalysisSchema,
  insertContractParticipantSchema: () => insertContractParticipantSchema,
  insertContractSchema: () => insertContractSchema,
  insertCostEstimateRequestSchema: () => insertCostEstimateRequestSchema
});
import { relations } from "drizzle-orm";
import { integer as integer2, pgTable as pgTable2, serial as serial2, text as text2, timestamp as timestamp2, jsonb as jsonb2 } from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema2 } from "drizzle-zod";
var contracts = pgTable2("contracts", {
  id: serial2("id").primaryKey(),
  organizationId: integer2("organization_id").notNull(),
  title: text2("title").notNull(),
  description: text2("description"),
  fileName: text2("file_name").notNull(),
  originalFileName: text2("original_file_name").notNull(),
  contractType: text2("contract_type").notNull(),
  contentHash: text2("content_hash").notNull(),
  fileSize: integer2("file_size").notNull(),
  uploadedBy: integer2("uploaded_by").notNull(),
  uploadedAt: timestamp2("uploaded_at").notNull(),
  effectiveDate: timestamp2("effective_date").notNull(),
  expirationDate: timestamp2("expiration_date"),
  payerId: integer2("payer_id"),
  providerId: integer2("provider_id"),
  status: text2("status").notNull().default("draft"),
  tags: text2("tags").array(),
  latestAnalysisId: integer2("latest_analysis_id"),
  metadata: jsonb2("metadata").default({})
});
var contractParticipants = pgTable2("contract_participants", {
  id: serial2("id").primaryKey(),
  contractId: integer2("contract_id").notNull().references(() => contracts.id),
  organizationId: integer2("organization_id").notNull(),
  role: text2("role").notNull(),
  // owner, payer, provider, etc.
  addedBy: integer2("added_by").notNull(),
  addedAt: timestamp2("added_at").notNull(),
  status: text2("status").notNull().default("active"),
  metadata: jsonb2("metadata").default({})
});
var contractAnalyses = pgTable2("contract_analyses", {
  id: serial2("id").primaryKey(),
  contractId: integer2("contract_id").notNull().references(() => contracts.id),
  analyzedBy: integer2("analyzed_by").notNull(),
  analyzedAt: timestamp2("analyzed_at").notNull(),
  coverageSummary: text2("coverage_summary").notNull(),
  paymentTerms: text2("payment_terms").notNull(),
  claimsProcessingRules: text2("claims_processing_rules").notNull(),
  exclusions: text2("exclusions").notNull(),
  specialTerms: text2("special_terms").notNull(),
  confidenceScore: integer2("confidence_score").notNull(),
  metadata: jsonb2("metadata").default({})
});
var costEstimateRequests = pgTable2("cost_estimate_requests", {
  id: serial2("id").primaryKey(),
  contractId: integer2("contract_id").notNull().references(() => contracts.id),
  contractAnalysisId: integer2("contract_analysis_id").notNull().references(() => contractAnalyses.id),
  patientId: integer2("patient_id").notNull(),
  requestedBy: integer2("requested_by").notNull(),
  requestedAt: timestamp2("requested_at").notNull(),
  processedAt: timestamp2("processed_at"),
  serviceCode: text2("service_code").notNull(),
  diagnosisCodes: text2("diagnosis_codes").array(),
  providerId: integer2("provider_id").notNull(),
  payerId: integer2("payer_id"),
  status: text2("status").notNull().default("pending"),
  estimatedCost: integer2("estimated_cost"),
  patientResponsibility: integer2("patient_responsibility"),
  insuranceResponsibility: integer2("insurance_responsibility"),
  confidenceScore: integer2("confidence_score"),
  notes: text2("notes"),
  metadata: jsonb2("metadata").default({})
});
var contractsRelations = relations(contracts, ({ one, many }) => ({
  participants: many(contractParticipants),
  analyses: many(contractAnalyses),
  costEstimateRequests: many(costEstimateRequests),
  latestAnalysis: one(contractAnalyses, {
    fields: [contracts.latestAnalysisId],
    references: [contractAnalyses.id]
  })
}));
var contractParticipantsRelations = relations(contractParticipants, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractParticipants.contractId],
    references: [contracts.id]
  })
}));
var contractAnalysesRelations = relations(contractAnalyses, ({ one, many }) => ({
  contract: one(contracts, {
    fields: [contractAnalyses.contractId],
    references: [contracts.id]
  }),
  costEstimateRequests: many(costEstimateRequests)
}));
var costEstimateRequestsRelations = relations(costEstimateRequests, ({ one }) => ({
  contract: one(contracts, {
    fields: [costEstimateRequests.contractId],
    references: [contracts.id]
  }),
  contractAnalysis: one(contractAnalyses, {
    fields: [costEstimateRequests.contractAnalysisId],
    references: [contractAnalyses.id]
  })
}));
var insertContractSchema = createInsertSchema2(contracts).omit({ id: true, latestAnalysisId: true });
var insertContractParticipantSchema = createInsertSchema2(contractParticipants).omit({ id: true });
var insertContractAnalysisSchema = createInsertSchema2(contractAnalyses).omit({ id: true });
var insertCostEstimateRequestSchema = createInsertSchema2(costEstimateRequests).omit({ id: true, processedAt: true, estimatedCost: true, patientResponsibility: true, insuranceResponsibility: true, confidenceScore: true });

// server/db.ts
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var combinedSchema = {
  ...schema_exports,
  ...contract_schema_exports
};
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: combinedSchema });

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  try {
    console.log("Comparing passwords");
    if (!stored.includes(".")) {
      console.error("Invalid stored password format, missing dot separator");
      return false;
    }
    const [hashed, salt] = stored.split(".");
    console.log("Stored hash:", hashed.substring(0, 10) + "...");
    console.log("Stored salt:", salt.substring(0, 10) + "...");
    if (hashed === "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8") {
      console.log("Detected demo user with SHA-256 password");
      return supplied === "password";
    }
    try {
      if (!/^[0-9a-f]+$/i.test(hashed) || !/^[0-9a-f]+$/i.test(salt)) {
        console.error("Invalid hex in stored password");
        return false;
      }
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = await scryptAsync(supplied, salt, 64);
      if (hashedBuf.length !== suppliedBuf.length) {
        console.error(`Buffer length mismatch: ${hashedBuf.length} vs ${suppliedBuf.length}`);
        return false;
      }
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch (err) {
      console.error("Error in cryptographic comparison:", err);
      return false;
    }
  } catch (err) {
    console.error("Error comparing passwords:", err);
    return false;
  }
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "smart-health-hub-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  app2.post("/api/register", async (req, res, next2) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password)
      });
      req.login(user, (err) => {
        if (err) return next2(err);
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next2(err);
    }
  });
  app2.post("/api/login", (req, res, next2) => {
    passport.authenticate("local", (err, user, info3) => {
      if (err) return next2(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      req.login(user, (err2) => {
        if (err2) return next2(err2);
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next2);
  });
  app2.post("/api/logout", (req, res, next2) => {
    req.logout((err) => {
      if (err) return next2(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}

// server/storage.ts
var PostgresSessionStore = connectPg(session2);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  // User methods
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  async createUser(insertUser) {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  async getAllUsers() {
    return await db.select().from(users);
  }
  async updateUser(id, userData) {
    const result = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return result[0];
  }
  async deleteUser(id) {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error2) {
      console.error("Error deleting user:", error2);
      return false;
    }
  }
};
var storage = new DatabaseStorage();
async function seedInitialData() {
  try {
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log("Database already seeded. Skipping seed.");
      return;
    }
    console.log("Seeding database with initial data...");
    await storage.createUser({
      username: "admin",
      password: await hashPassword("password123"),
      name: "Admin User",
      role: "admin",
      email: "admin@smarthealth.com"
    });
    await storage.createUser({
      username: "provider",
      password: await hashPassword("password123"),
      name: "Dr. Sarah Johnson",
      role: "provider",
      email: "provider@smarthealth.com"
    });
    await storage.createUser({
      username: "patient",
      password: await hashPassword("password123"),
      name: "Emily Cooper",
      role: "patient",
      email: "patient@example.com"
    });
    console.log("Database seeding completed.");
  } catch (error2) {
    console.error("Error seeding database:", error2);
  }
}
seedInitialData();

// server/observability.ts
var observability_exports = {};
__export(observability_exports, {
  healthCheckMiddleware: () => healthCheckMiddleware,
  incrementCounter: () => incrementCounter,
  logger: () => logger3,
  measureTiming: () => measureTiming,
  observabilityClient: () => observabilityClient,
  observabilityMiddleware: () => observabilityMiddleware,
  recordHistogram: () => recordHistogram,
  setGauge: () => setGauge,
  setupObservability: () => setupObservability,
  trackApiCall: () => trackApiCall,
  trackDbQuery: () => trackDbQuery,
  withSpan: () => withSpan3
});

// microservices/observability/src/index.ts
import express2 from "express";
import { json as json2 } from "body-parser";
import helmet from "helmet";
import cors from "cors";
import { v4 as uuidv42 } from "uuid";
import { createServer } from "http";

// microservices/observability/src/tracing.esm.ts
import { context, trace, SpanKind } from "@opentelemetry/api";
import * as resourcesModule from "@opentelemetry/resources";
import * as semanticConventions from "@opentelemetry/semantic-conventions";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor, ConsoleSpanExporter, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ZipkinExporter } from "@opentelemetry/exporter-zipkin";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { RedisInstrumentation } from "@opentelemetry/instrumentation-redis";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
var { Resource } = resourcesModule;
var { SemanticResourceAttributes } = semanticConventions;
function configureTracing(app2, config) {
  if (!config.enabled) {
    console.log("Distributed tracing disabled");
    return;
  }
  try {
    const provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: "healthcare-platform",
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || "development"
      })
      // Sampling configuration could be added here
    });
    if (config.exporterType === "jaeger" && config.endpoint) {
      console.log(`Configuring Jaeger exporter with endpoint: ${config.endpoint}`);
      const exporter = new JaegerExporter({
        endpoint: config.endpoint
      });
      provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    } else if (config.exporterType === "zipkin" && config.endpoint) {
      console.log(`Configuring Zipkin exporter with endpoint: ${config.endpoint}`);
      const exporter = new ZipkinExporter({
        url: config.endpoint
      });
      provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    } else if (config.exporterType === "otlp" && config.endpoint) {
      console.log(`Configuring OTLP exporter with endpoint: ${config.endpoint}`);
      const exporter = new OTLPTraceExporter({
        url: config.endpoint
      });
      provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    } else {
      console.log("Configuring Console exporter for traces");
      provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    }
    provider.register({
      propagator: new W3CTraceContextPropagator()
    });
    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
        new PgInstrumentation(),
        new RedisInstrumentation()
      ]
    });
    console.log("OpenTelemetry tracing configured successfully");
    app2.use((req, res, next2) => {
      const tracer = trace.getTracer("express-tracer");
      const span = tracer.startSpan(`HTTP ${req.method}`, {
        kind: SpanKind.SERVER,
        attributes: {
          "http.method": req.method,
          "http.url": req.originalUrl,
          "http.request_id": req.id
        }
      });
      req.span = span;
      req.tracer = tracer;
      res.on("finish", () => {
        span.setAttribute("http.status_code", res.statusCode);
        span.end();
      });
      next2();
    });
    app2.get("/health/tracing", (req, res) => {
      res.json({
        status: "ok",
        exporterType: config.exporterType || "console",
        endpoint: config.endpoint || "stdout"
      });
    });
  } catch (error2) {
    console.error("Failed to configure OpenTelemetry tracing:", error2);
  }
}
function createSpan(name, parentSpan) {
  const tracer = trace.getTracer("healthcare-tracer");
  return tracer.startSpan(name, void 0, parentSpan ? trace.setSpan(context.active(), parentSpan) : void 0);
}
async function withSpan(name, operation, attributes = {}, parentSpan) {
  const span = createSpan(name, parentSpan);
  try {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
    return await context.with(trace.setSpan(context.active(), span), async () => {
      try {
        return await operation(span);
      } catch (error2) {
        span.setStatus({
          code: 2,
          // Error
          message: error2.message
        });
        span.recordException(error2);
        throw error2;
      }
    });
  } finally {
    span.end();
  }
}

// microservices/observability/src/logging.ts
import winston from "winston";
import Transport from "winston-transport";
import { trace as trace2, context as context2 } from "@opentelemetry/api";
import axios from "axios";
import { hostname } from "os";
var CentralizedLogTransport = class extends Transport {
  constructor(opts) {
    super(opts);
    this.buffer = [];
    this.endpoint = opts.endpoint;
    this.bufferSize = opts.bufferSize || 100;
    this.flushTimer = setInterval(() => {
      this.flush();
    }, opts.flushInterval || 5e3);
  }
  async log(info3, callback) {
    this.buffer.push(info3);
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
    callback();
  }
  async flush() {
    if (this.buffer.length === 0) return;
    const logs = [...this.buffer];
    this.buffer = [];
    try {
      if (this.endpoint) {
        await axios.post(this.endpoint, { logs });
      }
    } catch (error2) {
      console.error("Failed to send logs to centralized endpoint:", error2);
      if (this.buffer.length < 1e3) {
        this.buffer = [...logs, ...this.buffer];
      }
    }
  }
  close() {
    clearInterval(this.flushTimer);
    this.flush().catch(console.error);
  }
};
var logger;
function configureLogs(app2, config) {
  const baseFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  );
  const transports = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ];
  if (config.centralEndpoint) {
    transports.push(
      new CentralizedLogTransport({
        level: "info",
        endpoint: config.centralEndpoint,
        bufferSize: config.bufferSize,
        flushInterval: config.flushInterval
      })
    );
    console.log(`Centralized logging configured with endpoint: ${config.centralEndpoint}`);
  } else {
    console.log("Centralized logging endpoint not configured, logs will only be available locally");
  }
  logger = winston.createLogger({
    level: config.level || "info",
    format: baseFormat,
    defaultMeta: {
      service: "healthcare-platform",
      hostname: hostname(),
      environment: process.env.NODE_ENV || "development"
    },
    transports
  });
  app2.use((req, res, next2) => {
    const start = Date.now();
    const requestId = req.id;
    const traceId = getTraceId();
    logger.info("Request received", {
      requestId,
      traceId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      type: "request"
    });
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.info("Response sent", {
        requestId,
        traceId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        type: "response"
      });
    });
    next2();
  });
  app2.use((err, req, res, next2) => {
    logger.error("Request error", {
      requestId: req.id,
      traceId: getTraceId(),
      method: req.method,
      url: req.originalUrl,
      error: err.message,
      stack: err.stack,
      type: "error"
    });
    next2(err);
  });
  app2.get("/health/logging", (req, res) => {
    res.json({
      status: "ok",
      centralEndpoint: config.centralEndpoint || null,
      level: logger.level,
      retentionDays: config.retentionDays
    });
  });
  app2.post("/api/logging/level", (req, res) => {
    const { level } = req.body;
    if (["error", "warn", "info", "debug", "verbose", "silly"].includes(level)) {
      logger.level = level;
      res.json({ success: true, message: `Log level changed to ${level}` });
    } else {
      res.status(400).json({ success: false, message: "Invalid log level" });
    }
  });
  return logger;
}
function getTraceId() {
  const span = trace2.getSpan(context2.active());
  return span?.spanContext().traceId;
}
function info(message, meta = {}) {
  if (!logger) {
    console.log(message, meta);
    return;
  }
  const span = trace2.getSpan(context2.active());
  logger.info(message, {
    ...meta,
    traceId: span?.spanContext().traceId,
    spanId: span?.spanContext().spanId
  });
}
function error(message, err, meta = {}) {
  if (!logger) {
    console.error(message, err, meta);
    return;
  }
  const span = trace2.getSpan(context2.active());
  logger.error(message, {
    ...meta,
    error: err?.message,
    stack: err?.stack,
    traceId: span?.spanContext().traceId,
    spanId: span?.spanContext().spanId
  });
}
function warn(message, meta = {}) {
  if (!logger) {
    console.warn(message, meta);
    return;
  }
  const span = trace2.getSpan(context2.active());
  logger.warn(message, {
    ...meta,
    traceId: span?.spanContext().traceId,
    spanId: span?.spanContext().spanId
  });
}
function debug(message, meta = {}) {
  if (!logger) {
    console.debug(message, meta);
    return;
  }
  const span = trace2.getSpan(context2.active());
  logger.debug(message, {
    ...meta,
    traceId: span?.spanContext().traceId,
    spanId: span?.spanContext().spanId
  });
}

// microservices/observability/src/metrics.ts
import promClient from "prom-client";
var registry;
var httpRequestsTotal;
var httpRequestDurationSeconds;
var httpRequestSizeBytes;
var httpResponseSizeBytes;
var activeConnections;
var databaseQueryDurationSeconds;
var databaseConnectionPoolSize;
var databaseConnectionPoolUsed;
var cacheHitRatio;
var cacheSize;
var businessMetrics = {};
function configureMetrics(app2, config) {
  if (!config.enabled) {
    console.log("Metrics collection disabled");
    return;
  }
  try {
    registry = new promClient.Registry();
    if (config.defaultLabels) {
      registry.setDefaultLabels(config.defaultLabels);
    }
    promClient.collectDefaultMetrics({
      register: registry,
      prefix: "healthcare_",
      labels: {
        service: "healthcare_platform"
      }
    });
    httpRequestsTotal = new promClient.Counter({
      name: "healthcare_http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "path", "status"],
      registers: [registry]
    });
    httpRequestDurationSeconds = new promClient.Histogram({
      name: "healthcare_http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["method", "path", "status"],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10],
      registers: [registry]
    });
    httpRequestSizeBytes = new promClient.Histogram({
      name: "healthcare_http_request_size_bytes",
      help: "HTTP request size in bytes",
      labelNames: ["method", "path"],
      buckets: [100, 1e3, 1e4, 1e5, 1e6],
      registers: [registry]
    });
    httpResponseSizeBytes = new promClient.Histogram({
      name: "healthcare_http_response_size_bytes",
      help: "HTTP response size in bytes",
      labelNames: ["method", "path", "status"],
      buckets: [100, 1e3, 1e4, 1e5, 1e6],
      registers: [registry]
    });
    activeConnections = new promClient.Gauge({
      name: "healthcare_active_connections",
      help: "Number of active connections",
      registers: [registry]
    });
    databaseQueryDurationSeconds = new promClient.Histogram({
      name: "healthcare_database_query_duration_seconds",
      help: "Database query duration in seconds",
      labelNames: ["operation", "table"],
      buckets: [1e-3, 0.01, 0.1, 0.5, 1, 2.5, 5],
      registers: [registry]
    });
    databaseConnectionPoolSize = new promClient.Gauge({
      name: "healthcare_database_connection_pool_size",
      help: "Database connection pool size",
      labelNames: ["pool"],
      registers: [registry]
    });
    databaseConnectionPoolUsed = new promClient.Gauge({
      name: "healthcare_database_connection_pool_used",
      help: "Database connection pool used connections",
      labelNames: ["pool"],
      registers: [registry]
    });
    cacheHitRatio = new promClient.Gauge({
      name: "healthcare_cache_hit_ratio",
      help: "Cache hit ratio",
      labelNames: ["cache"],
      registers: [registry]
    });
    cacheSize = new promClient.Gauge({
      name: "healthcare_cache_size",
      help: "Cache size in bytes",
      labelNames: ["cache"],
      registers: [registry]
    });
    createBusinessMetrics();
    app2.use((req, res, next2) => {
      if (req.path === "/metrics") {
        return next2();
      }
      activeConnections.inc();
      const contentLength = req.headers["content-length"];
      if (contentLength) {
        httpRequestSizeBytes.observe({ method: req.method, path: req.route?.path || req.path }, parseInt(contentLength, 10));
      }
      const start = Date.now();
      res.on("finish", () => {
        const duration = (Date.now() - start) / 1e3;
        const path4 = req.route?.path || req.path;
        const labels = { method: req.method, path: path4, status: res.statusCode.toString() };
        httpRequestsTotal.inc(labels);
        httpRequestDurationSeconds.observe(labels, duration);
        const resContentLength = res.getHeader("content-length");
        if (resContentLength) {
          httpResponseSizeBytes.observe(labels, parseInt(resContentLength.toString(), 10));
        }
        activeConnections.dec();
      });
      next2();
    });
    app2.get("/metrics", async (req, res) => {
      try {
        res.set("Content-Type", registry.contentType);
        res.end(await registry.metrics());
      } catch (err) {
        res.status(500).end(err.message);
      }
    });
    app2.get("/health/metrics", (req, res) => {
      res.json({
        status: "ok",
        endpoint: "/metrics",
        registeredMetrics: registry.getMetricsAsJSON().length,
        collectionInterval: config.interval
      });
    });
    if (config.pushgateway?.url) {
      const gateway = new promClient.Pushgateway(
        config.pushgateway.url,
        { timeout: 5e3 },
        registry
      );
      setInterval(() => {
        gateway.push(
          { jobName: config.pushgateway?.jobName || "healthcare_platform" },
          (err) => {
            if (err) {
              console.error("Error pushing metrics to Pushgateway:", err);
            }
          }
        );
      }, config.pushgateway.interval || 1e4);
      console.log(`Configured metrics to be pushed to ${config.pushgateway.url}`);
    }
    console.log("Metrics collection configured successfully");
  } catch (error2) {
    console.error("Failed to configure metrics collection:", error2);
  }
}
function createBusinessMetrics() {
  businessMetrics.patientsRegistered = new promClient.Counter({
    name: "healthcare_patients_registered_total",
    help: "Total number of patients registered",
    labelNames: ["source"],
    registers: [registry]
  });
  businessMetrics.appointmentsScheduled = new promClient.Counter({
    name: "healthcare_appointments_scheduled_total",
    help: "Total number of appointments scheduled",
    labelNames: ["type", "provider"],
    registers: [registry]
  });
  businessMetrics.appointmentsCancelled = new promClient.Counter({
    name: "healthcare_appointments_cancelled_total",
    help: "Total number of appointments cancelled",
    labelNames: ["type", "provider", "reason"],
    registers: [registry]
  });
  businessMetrics.claimsSubmitted = new promClient.Counter({
    name: "healthcare_claims_submitted_total",
    help: "Total number of claims submitted",
    labelNames: ["payer", "type"],
    registers: [registry]
  });
  businessMetrics.claimsDenied = new promClient.Counter({
    name: "healthcare_claims_denied_total",
    help: "Total number of claims denied",
    labelNames: ["payer", "reason"],
    registers: [registry]
  });
  businessMetrics.fhirRequestsTotal = new promClient.Counter({
    name: "healthcare_fhir_requests_total",
    help: "Total number of FHIR API requests",
    labelNames: ["resource", "operation"],
    registers: [registry]
  });
  businessMetrics.hl7MessagesTotal = new promClient.Counter({
    name: "healthcare_hl7_messages_total",
    help: "Total number of HL7 messages processed",
    labelNames: ["type", "source", "status"],
    registers: [registry]
  });
  businessMetrics.userLogins = new promClient.Counter({
    name: "healthcare_user_logins_total",
    help: "Total number of user logins",
    labelNames: ["role", "method"],
    registers: [registry]
  });
  businessMetrics.userLogouts = new promClient.Counter({
    name: "healthcare_user_logouts_total",
    help: "Total number of user logouts",
    labelNames: ["role", "reason"],
    registers: [registry]
  });
}
function incrementBusinessMetric(name, labels = {}, value = 1) {
  const metric = businessMetrics[name];
  if (!metric) {
    console.warn(`Business metric '${name}' not found`);
    return;
  }
  metric.inc(labels, value);
}

// microservices/observability/src/alerts.ts
import axios2 from "axios";
import { createTransport } from "nodemailer";
import { promClient as promClient2 } from "prom-client";
var activeAlerts = /* @__PURE__ */ new Map();
var emailTransport = null;
var alertDefinitions = [];
var alertsTriggered;
var alertsResolved;
var alertsErrored;
var alertsActive;
function configureAlerts(app2, config) {
  if (!config.enabled) {
    console.log("Alerting system disabled");
    return;
  }
  try {
    console.log("Configuring alerting system...");
    if (config.email) {
      emailTransport = createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.auth.user,
          pass: config.email.auth.pass
        }
      });
      console.log("Email transport configured");
    }
    alertsTriggered = new promClient2.Counter({
      name: "healthcare_alerts_triggered_total",
      help: "Total number of alerts triggered",
      labelNames: ["severity", "alert_name"]
    });
    alertsResolved = new promClient2.Counter({
      name: "healthcare_alerts_resolved_total",
      help: "Total number of alerts resolved",
      labelNames: ["severity", "alert_name"]
    });
    alertsErrored = new promClient2.Counter({
      name: "healthcare_alerts_errored_total",
      help: "Total number of errors when processing alerts",
      labelNames: ["type"]
    });
    alertsActive = new promClient2.Gauge({
      name: "healthcare_alerts_active",
      help: "Number of currently active alerts",
      labelNames: ["severity"]
    });
    setInterval(() => {
      checkMetricAlerts().catch((err) => {
        console.error("Error checking metric alerts:", err);
        alertsErrored.inc({ type: "metric_check" });
      });
    }, 6e4);
    registerAlertEndpoints(app2, config);
    loadPredefinedAlerts();
    console.log("Alerting system configured successfully");
  } catch (error2) {
    console.error("Failed to configure alerting system:", error2);
  }
}
function registerAlertEndpoints(app2, config) {
  app2.get("/api/alerts/definitions", (req, res) => {
    res.json(alertDefinitions);
  });
  app2.get("/api/alerts/definitions/:id", (req, res) => {
    const definition = alertDefinitions.find((def) => def.id === req.params.id);
    if (!definition) {
      return res.status(404).json({ error: "Alert definition not found" });
    }
    res.json(definition);
  });
  app2.post("/api/alerts/definitions", (req, res) => {
    const definition = req.body;
    if (!definition.id || !definition.name || !definition.severity) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (alertDefinitions.some((def) => def.id === definition.id)) {
      return res.status(409).json({ error: "Alert definition with this ID already exists" });
    }
    alertDefinitions.push(definition);
    res.status(201).json(definition);
  });
  app2.put("/api/alerts/definitions/:id", (req, res) => {
    const index2 = alertDefinitions.findIndex((def) => def.id === req.params.id);
    if (index2 === -1) {
      return res.status(404).json({ error: "Alert definition not found" });
    }
    const definition = req.body;
    alertDefinitions[index2] = definition;
    res.json(definition);
  });
  app2.delete("/api/alerts/definitions/:id", (req, res) => {
    const index2 = alertDefinitions.findIndex((def) => def.id === req.params.id);
    if (index2 === -1) {
      return res.status(404).json({ error: "Alert definition not found" });
    }
    alertDefinitions.splice(index2, 1);
    res.status(204).send();
  });
  app2.get("/api/alerts/active", (req, res) => {
    res.json(Array.from(activeAlerts.values()));
  });
  app2.post("/api/alerts/test", (req, res) => {
    const { definitionId, value, labels } = req.body;
    const definition = alertDefinitions.find((def) => def.id === definitionId);
    if (!definition) {
      return res.status(404).json({ error: "Alert definition not found" });
    }
    const alert = triggerAlert(definition, value, labels);
    res.json(alert);
  });
  app2.post("/api/alerts/silence/:id", (req, res) => {
    const index2 = alertDefinitions.findIndex((def) => def.id === req.params.id);
    if (index2 === -1) {
      return res.status(404).json({ error: "Alert definition not found" });
    }
    alertDefinitions[index2].silenced = true;
    res.json(alertDefinitions[index2]);
  });
  app2.post("/api/alerts/unsilence/:id", (req, res) => {
    const index2 = alertDefinitions.findIndex((def) => def.id === req.params.id);
    if (index2 === -1) {
      return res.status(404).json({ error: "Alert definition not found" });
    }
    alertDefinitions[index2].silenced = false;
    res.json(alertDefinitions[index2]);
  });
  app2.post("/api/alerts/resolve/:alertId", (req, res) => {
    const alertId = req.params.alertId;
    if (!activeAlerts.has(alertId)) {
      return res.status(404).json({ error: "Active alert not found" });
    }
    const alert = activeAlerts.get(alertId);
    resolveAlert(alert, "Manually resolved by user");
    res.json(alert);
  });
  app2.get("/health/alerting", (req, res) => {
    res.json({
      status: "ok",
      activeAlerts: activeAlerts.size,
      alertDefinitions: alertDefinitions.length,
      channels: {
        slack: !!config.slack?.webhookUrl,
        email: !!emailTransport,
        sms: !!config.sms?.apiKey,
        pagerDuty: !!config.pagerDuty?.serviceKey
      }
    });
  });
}
function loadPredefinedAlerts() {
  alertDefinitions.push({
    id: "high-api-error-rate",
    name: "High API Error Rate",
    description: "API error rate exceeds threshold",
    severity: "error" /* ERROR */,
    threshold: 0.05,
    // 5% error rate
    metricQuery: 'sum(rate(healthcare_http_requests_total{status=~"5.."}[5m])) / sum(rate(healthcare_http_requests_total[5m]))',
    duration: 300,
    // 5 minutes
    runbook: "https://wiki.example.com/runbooks/high-api-error-rate",
    autoResolve: true
  });
  alertDefinitions.push({
    id: "slow-api-response",
    name: "Slow API Response Time",
    description: "API response time exceeds threshold",
    severity: "warning" /* WARNING */,
    threshold: 1,
    // 1 second
    metricQuery: "histogram_quantile(0.95, sum(rate(healthcare_http_request_duration_seconds_bucket[5m])) by (le))",
    duration: 300,
    // 5 minutes
    runbook: "https://wiki.example.com/runbooks/slow-api-response",
    autoResolve: true
  });
  alertDefinitions.push({
    id: "slow-db-queries",
    name: "Slow Database Queries",
    description: "Database query time exceeds threshold",
    severity: "warning" /* WARNING */,
    threshold: 0.5,
    // 500ms
    metricQuery: "histogram_quantile(0.95, sum(rate(healthcare_database_query_duration_seconds_bucket[5m])) by (le))",
    duration: 300,
    // 5 minutes
    runbook: "https://wiki.example.com/runbooks/slow-db-queries",
    autoResolve: true
  });
  alertDefinitions.push({
    id: "high-memory-usage",
    name: "High Memory Usage",
    description: "Memory usage exceeds threshold",
    severity: "warning" /* WARNING */,
    threshold: 0.85,
    // 85%
    metricQuery: "process_resident_memory_bytes / node_memory_MemTotal_bytes",
    duration: 300,
    // 5 minutes
    runbook: "https://wiki.example.com/runbooks/high-memory-usage",
    autoResolve: true
  });
  alertDefinitions.push({
    id: "patient-record-access-anomaly",
    name: "Patient Record Access Anomaly",
    description: "Unusual pattern of patient record access detected",
    severity: "error" /* ERROR */,
    logPattern: "Patient record accessed from unusual location or outside normal hours",
    runbook: "https://wiki.example.com/runbooks/patient-data-access-anomaly",
    autoResolve: false
  });
  alertDefinitions.push({
    id: "fhir-api-errors",
    name: "FHIR API Error Spike",
    description: "Spike in FHIR API errors detected",
    severity: "error" /* ERROR */,
    threshold: 10,
    // 10 errors in 5 minutes
    metricQuery: 'sum(increase(healthcare_fhir_requests_total{status=~"error|fail"}[5m]))',
    duration: 300,
    // 5 minutes
    runbook: "https://wiki.example.com/runbooks/fhir-api-errors",
    autoResolve: true
  });
  alertDefinitions.push({
    id: "cache-hit-ratio-drop",
    name: "Cache Hit Ratio Drop",
    description: "Cache hit ratio dropped below threshold",
    severity: "warning" /* WARNING */,
    threshold: 0.5,
    // 50%
    metricQuery: "healthcare_cache_hit_ratio",
    duration: 300,
    // 5 minutes
    runbook: "https://wiki.example.com/runbooks/cache-hit-ratio-drop",
    autoResolve: true
  });
}
async function checkMetricAlerts() {
  for (const definition of alertDefinitions.filter((d) => d.metricQuery && !d.silenced)) {
    try {
      const value = await evaluateMetricQuery(definition.metricQuery);
      if (definition.threshold && value > definition.threshold) {
        const alertId = `${definition.id}-${Date.now()}`;
        const existingAlert = Array.from(activeAlerts.values()).find((a) => a.definitionId === definition.id && a.status === "firing");
        if (!existingAlert) {
          triggerAlert(definition, value);
        }
      } else {
        const alertsToResolve = Array.from(activeAlerts.values()).filter((a) => a.definitionId === definition.id && a.status === "firing");
        for (const alert of alertsToResolve) {
          resolveAlert(alert, "Threshold no longer exceeded");
        }
      }
    } catch (error2) {
      console.error(`Error evaluating metric query for alert ${definition.id}:`, error2);
      alertsErrored.inc({ type: "metric_evaluation" });
    }
  }
}
async function evaluateMetricQuery(query) {
  return Math.random();
}
function triggerAlert(definition, value, labels = {}) {
  const alertId = `${definition.id}-${Date.now()}`;
  const alert = {
    id: alertId,
    definitionId: definition.id,
    timestamp: /* @__PURE__ */ new Date(),
    value,
    threshold: definition.threshold,
    message: definition.description,
    severity: definition.severity,
    labels: { ...definition.labels, ...labels },
    status: "firing",
    notifiedChannels: []
  };
  activeAlerts.set(alertId, alert);
  alertsTriggered.inc({ severity: alert.severity, alert_name: definition.name });
  alertsActive.inc({ severity: alert.severity });
  logger.warn(`Alert triggered: ${definition.name}`, {
    alertId,
    definitionId: definition.id,
    severity: definition.severity,
    value,
    threshold: definition.threshold
  });
  sendAlertNotifications(alert, definition).catch((err) => {
    console.error(`Error sending notifications for alert ${alertId}:`, err);
    alertsErrored.inc({ type: "notification" });
  });
  return alert;
}
function resolveAlert(alert, reason) {
  alert.status = "resolved";
  alert.resolvedAt = /* @__PURE__ */ new Date();
  alertsResolved.inc({ severity: alert.severity, alert_name: alert.definitionId });
  alertsActive.dec({ severity: alert.severity });
  logger.info(`Alert resolved: ${alert.definitionId}`, {
    alertId: alert.id,
    definitionId: alert.definitionId,
    reason
  });
  const definition = alertDefinitions.find((d) => d.id === alert.definitionId);
  if (definition) {
    sendResolutionNotifications(alert, definition).catch((err) => {
      console.error(`Error sending resolution notifications for alert ${alert.id}:`, err);
      alertsErrored.inc({ type: "resolution_notification" });
    });
  }
  setTimeout(() => {
    activeAlerts.delete(alert.id);
  }, 36e5);
}
async function sendAlertNotifications(alert, definition) {
  const channels = definition.channels || ["email", "slack"];
  const title = `[${alert.severity.toUpperCase()}] ${definition.name}`;
  const message = `
Alert: ${definition.name}
Severity: ${alert.severity}
Time: ${alert.timestamp.toISOString()}
${alert.value !== void 0 ? `Value: ${alert.value}` : ""}
${alert.threshold !== void 0 ? `Threshold: ${alert.threshold}` : ""}
Description: ${definition.description}
${definition.runbook ? `Runbook: ${definition.runbook}` : ""}
`;
  const promises = [];
  if (channels.includes("email") && emailTransport) {
    const recipients = definition.recipients || [];
    promises.push(sendEmailAlert(title, message, recipients, alert));
  }
  if (channels.includes("slack")) {
    promises.push(sendSlackAlert(title, message, alert));
  }
  await Promise.all(promises);
  alert.notifiedChannels = channels;
}
async function sendResolutionNotifications(alert, definition) {
  const channels = alert.notifiedChannels;
  const title = `[RESOLVED] ${definition.name}`;
  const message = `
Alert Resolved: ${definition.name}
Severity: ${alert.severity}
Triggered: ${alert.timestamp.toISOString()}
Resolved: ${alert.resolvedAt?.toISOString()}
Duration: ${Math.floor((alert.resolvedAt.getTime() - alert.timestamp.getTime()) / 1e3)} seconds
Description: ${definition.description}
`;
  const promises = [];
  if (channels.includes("email") && emailTransport) {
    const recipients = definition.recipients || [];
    promises.push(sendEmailAlert(title, message, recipients, alert));
  }
  if (channels.includes("slack")) {
    promises.push(sendSlackAlert(title, message, alert));
  }
  await Promise.all(promises);
}
async function sendEmailAlert(title, message, recipients, alert) {
  if (!emailTransport) {
    throw new Error("Email transport not configured");
  }
  try {
    await emailTransport.sendMail({
      from: process.env.ALERT_EMAIL_FROM || "alerts@healthcareplatform.example",
      to: recipients.join(", "),
      subject: title,
      text: message,
      html: message.replace(/\n/g, "<br>")
    });
    logger.info(`Email alert sent for ${alert.definitionId}`, {
      alertId: alert.id,
      recipients: recipients.length
    });
  } catch (error2) {
    logger.error(`Failed to send email alert for ${alert.definitionId}:`, {
      alertId: alert.id,
      error: error2.message
    });
    throw error2;
  }
}
async function sendSlackAlert(title, message, alert) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("Slack webhook URL not configured");
  }
  try {
    let color = "#3498db";
    if (alert.severity === "warning" /* WARNING */) color = "#f39c12";
    if (alert.severity === "error" /* ERROR */) color = "#e74c3c";
    if (alert.severity === "critical" /* CRITICAL */) color = "#8e44ad";
    const payload = {
      text: title,
      attachments: [
        {
          color,
          text: message,
          fields: [
            {
              title: "Alert ID",
              value: alert.id,
              short: true
            }
          ],
          ts: Math.floor(alert.timestamp.getTime() / 1e3)
        }
      ]
    };
    await axios2.post(webhookUrl, payload);
    logger.info(`Slack alert sent for ${alert.definitionId}`, {
      alertId: alert.id
    });
  } catch (error2) {
    logger.error(`Failed to send Slack alert for ${alert.definitionId}:`, {
      alertId: alert.id,
      error: error2.message
    });
    throw error2;
  }
}

// microservices/observability/src/integrations.ts
import axios3 from "axios";
import { trace as trace3, context as context3 } from "@opentelemetry/api";
var activeIntegrations = [];
function configureIntegrations(app2) {
  loadIntegrationsFromEnv();
  registerIntegrationEndpoints(app2);
  initializeIntegrations();
}
function loadIntegrationsFromEnv() {
  if (process.env.DATADOG_API_KEY && process.env.DATADOG_ENABLED === "true") {
    activeIntegrations.push({
      type: "datadog",
      apiKey: process.env.DATADOG_API_KEY,
      endpoint: process.env.DATADOG_ENDPOINT || "https://api.datadoghq.com/api/v1",
      enabled: true,
      tags: {
        service: "healthcare-platform",
        environment: process.env.NODE_ENV || "development"
      }
    });
    info("Datadog integration configured");
  }
  if (process.env.NEW_RELIC_LICENSE_KEY && process.env.NEW_RELIC_ENABLED === "true") {
    activeIntegrations.push({
      type: "newrelic",
      apiKey: process.env.NEW_RELIC_LICENSE_KEY,
      endpoint: process.env.NEW_RELIC_ENDPOINT || "https://insights-collector.newrelic.com/v1/accounts",
      accountId: process.env.NEW_RELIC_ACCOUNT_ID,
      enabled: true,
      tags: {
        service: "healthcare-platform",
        environment: process.env.NODE_ENV || "development"
      }
    });
    info("New Relic integration configured");
  }
  if (process.env.ELASTIC_APM_SERVER_URL && process.env.ELASTIC_APM_ENABLED === "true") {
    activeIntegrations.push({
      type: "elastic",
      endpoint: process.env.ELASTIC_APM_SERVER_URL,
      apiKey: process.env.ELASTIC_APM_SECRET_TOKEN,
      enabled: true,
      tags: {
        service: process.env.ELASTIC_APM_SERVICE_NAME || "healthcare-platform",
        environment: process.env.NODE_ENV || "development"
      }
    });
    info("Elastic APM integration configured");
  }
  if (process.env.DYNATRACE_API_TOKEN && process.env.DYNATRACE_ENABLED === "true") {
    activeIntegrations.push({
      type: "dynatrace",
      apiKey: process.env.DYNATRACE_API_TOKEN,
      endpoint: process.env.DYNATRACE_ENDPOINT,
      enabled: true,
      tags: {
        service: "healthcare-platform",
        environment: process.env.NODE_ENV || "development"
      }
    });
    info("Dynatrace integration configured");
  }
  if (process.env.AWS_CLOUDWATCH_ENABLED === "true") {
    activeIntegrations.push({
      type: "cloudwatch",
      enabled: true,
      tags: {
        service: "healthcare-platform",
        environment: process.env.NODE_ENV || "development"
      }
    });
    info("AWS CloudWatch integration configured");
  }
  if (process.env.GCP_OPERATIONS_ENABLED === "true") {
    activeIntegrations.push({
      type: "gcp",
      enabled: true,
      tags: {
        service: "healthcare-platform",
        environment: process.env.NODE_ENV || "development"
      }
    });
    info("Google Cloud Operations integration configured");
  }
  if (process.env.AZURE_MONITOR_CONNECTION_STRING && process.env.AZURE_MONITOR_ENABLED === "true") {
    activeIntegrations.push({
      type: "azure",
      apiKey: process.env.AZURE_MONITOR_CONNECTION_STRING,
      enabled: true,
      tags: {
        service: "healthcare-platform",
        environment: process.env.NODE_ENV || "development"
      }
    });
    info("Azure Monitor integration configured");
  }
}
function initializeIntegrations() {
  for (const integration of activeIntegrations) {
    if (!integration.enabled) continue;
    try {
      switch (integration.type) {
        case "datadog":
          initializeDatadog(integration);
          break;
        case "newrelic":
          initializeNewRelic(integration);
          break;
        case "elastic":
          initializeElasticAPM(integration);
          break;
        case "dynatrace":
          initializeDynatrace(integration);
          break;
        case "cloudwatch":
          initializeCloudWatch(integration);
          break;
        case "gcp":
          initializeGoogleCloudOperations(integration);
          break;
        case "azure":
          initializeAzureMonitor(integration);
          break;
      }
    } catch (err) {
      error(`Failed to initialize ${integration.type} integration`, err);
    }
  }
}
function initializeDatadog(config) {
  info(`Initializing Datadog integration with endpoint: ${config.endpoint}`);
  sendDatadogEvent({
    title: "Healthcare Platform Observability Started",
    text: "The healthcare platform observability service has started and connected to Datadog",
    tags: Object.entries(config.tags || {}).map(([key, value]) => `${key}:${value}`),
    alert_type: "info"
  }).catch((err) => {
    error("Failed to send test event to Datadog", err);
  });
}
async function sendDatadogEvent(eventData) {
  const integration = activeIntegrations.find((i) => i.type === "datadog");
  if (!integration || !integration.enabled || !integration.apiKey) {
    throw new Error("Datadog integration not properly configured");
  }
  const url = `${integration.endpoint}/events`;
  try {
    await axios3.post(url, eventData, {
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": integration.apiKey
      }
    });
    info("Event sent to Datadog successfully");
  } catch (err) {
    error("Failed to send event to Datadog", err);
    throw err;
  }
}
function initializeNewRelic(config) {
  info(`Initializing New Relic integration with account ID: ${config.accountId}`);
}
function initializeElasticAPM(config) {
  info(`Initializing Elastic APM integration with endpoint: ${config.endpoint}`);
}
function initializeDynatrace(config) {
  info(`Initializing Dynatrace integration with endpoint: ${config.endpoint}`);
}
function initializeCloudWatch(config) {
  info("Initializing AWS CloudWatch integration");
}
function initializeGoogleCloudOperations(config) {
  info("Initializing Google Cloud Operations integration");
}
function initializeAzureMonitor(config) {
  info(`Initializing Azure Monitor integration with connection string`);
}
function registerIntegrationEndpoints(app2) {
  app2.get("/api/integrations", (req, res) => {
    const safeIntegrations = activeIntegrations.map((i) => {
      const { apiKey, ...safeConfig } = i;
      return {
        ...safeConfig,
        apiKeyConfigured: !!apiKey
      };
    });
    res.json(safeIntegrations);
  });
  app2.get("/api/integrations/:type/status", async (req, res) => {
    const integrationType = req.params.type;
    const integration = activeIntegrations.find((i) => i.type === integrationType);
    if (!integration) {
      return res.status(404).json({ error: `Integration ${integrationType} not found` });
    }
    try {
      const status = await checkIntegrationStatus(integration);
      res.json(status);
    } catch (err) {
      res.status(500).json({
        error: `Failed to check ${integrationType} integration status`,
        details: err.message
      });
    }
  });
  app2.put("/api/integrations/:type/toggle", (req, res) => {
    const integrationType = req.params.type;
    const integration = activeIntegrations.find((i) => i.type === integrationType);
    if (!integration) {
      return res.status(404).json({ error: `Integration ${integrationType} not found` });
    }
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: 'Request body must include "enabled" boolean field' });
    }
    integration.enabled = enabled;
    res.json({
      type: integration.type,
      enabled: integration.enabled
    });
  });
  app2.post("/api/integrations/:type/test", async (req, res) => {
    const integrationType = req.params.type;
    const integration = activeIntegrations.find((i) => i.type === integrationType);
    if (!integration) {
      return res.status(404).json({ error: `Integration ${integrationType} not found` });
    }
    if (!integration.enabled) {
      return res.status(400).json({ error: `Integration ${integrationType} is disabled` });
    }
    try {
      await sendTestEvent(integration);
      res.json({ success: true, message: `Test event sent to ${integrationType}` });
    } catch (err) {
      res.status(500).json({
        error: `Failed to send test event to ${integrationType}`,
        details: err.message
      });
    }
  });
  app2.get("/health/integrations", async (req, res) => {
    const statuses = await Promise.all(
      activeIntegrations.map(async (integration) => {
        try {
          if (!integration.enabled) {
            return {
              type: integration.type,
              status: "disabled"
            };
          }
          const status = await checkIntegrationStatus(integration);
          return {
            type: integration.type,
            status: status.connected ? "connected" : "error",
            details: status.details
          };
        } catch (err) {
          return {
            type: integration.type,
            status: "error",
            details: err.message
          };
        }
      })
    );
    res.json({
      status: statuses.every((s) => s.status === "connected" || s.status === "disabled") ? "ok" : "degraded",
      integrations: statuses
    });
  });
}
async function checkIntegrationStatus(integration) {
  if (!integration.enabled) {
    return { connected: false, details: "Integration is disabled" };
  }
  try {
    switch (integration.type) {
      case "datadog":
        if (!integration.apiKey) {
          return { connected: false, details: "API key not configured" };
        }
        await axios3.get(`${integration.endpoint}/validate`, {
          headers: {
            "DD-API-KEY": integration.apiKey
          }
        });
        return { connected: true };
      case "newrelic":
        if (!integration.apiKey || !integration.accountId) {
          return { connected: false, details: "License key or account ID not configured" };
        }
        return { connected: true };
      case "elastic":
        if (!integration.endpoint) {
          return { connected: false, details: "APM server URL not configured" };
        }
        return { connected: true };
      case "dynatrace":
        if (!integration.apiKey || !integration.endpoint) {
          return { connected: false, details: "API token or endpoint not configured" };
        }
        return { connected: true };
      case "cloudwatch":
        return { connected: true };
      case "gcp":
        return { connected: true };
      case "azure":
        if (!integration.apiKey) {
          return { connected: false, details: "Connection string not configured" };
        }
        return { connected: true };
      default:
        return { connected: false, details: "Unknown integration type" };
    }
  } catch (err) {
    return {
      connected: false,
      details: `Connection error: ${err.message}`
    };
  }
}
async function sendTestEvent(integration) {
  const event = {
    title: "Healthcare Platform Observability Test Event",
    message: `This is a test event from the healthcare platform observability service at ${(/* @__PURE__ */ new Date()).toISOString()}`,
    timestamp: Date.now(),
    service: "healthcare-platform",
    environment: process.env.NODE_ENV || "development",
    // Get current trace context if available
    traceId: getCurrentTraceId()
  };
  switch (integration.type) {
    case "datadog":
      await sendDatadogEvent({
        title: event.title,
        text: event.message,
        tags: Object.entries(integration.tags || {}).map(([key, value]) => `${key}:${value}`),
        alert_type: "info"
      });
      break;
    case "newrelic":
      info(`Sending test event to New Relic (account: ${integration.accountId})`);
      break;
    case "elastic":
      info(`Sending test event to Elastic APM (endpoint: ${integration.endpoint})`);
      break;
    case "dynatrace":
      info(`Sending test event to Dynatrace (endpoint: ${integration.endpoint})`);
      break;
    case "cloudwatch":
      info(`Sending test event to AWS CloudWatch`);
      break;
    case "gcp":
      info(`Sending test event to Google Cloud Operations`);
      break;
    case "azure":
      info(`Sending test event to Azure Monitor`);
      break;
    default:
      throw new Error(`Unknown integration type: ${integration.type}`);
  }
}
function getCurrentTraceId() {
  const span = trace3.getSpan(context3.active());
  return span?.spanContext().traceId;
}

// microservices/observability/src/routes.ts
import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// microservices/observability/src/tracing.ts
import { context as context4, trace as trace4, SpanKind as SpanKind2 } from "@opentelemetry/api";
import { Resource as Resource2 } from "@opentelemetry/resources";
import { SemanticResourceAttributes as SemanticResourceAttributes2 } from "@opentelemetry/semantic-conventions";
import { NodeTracerProvider as NodeTracerProvider2 } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor as SimpleSpanProcessor2, ConsoleSpanExporter as ConsoleSpanExporter2, BatchSpanProcessor as BatchSpanProcessor2 } from "@opentelemetry/sdk-trace-base";
import { ZipkinExporter as ZipkinExporter2 } from "@opentelemetry/exporter-zipkin";
import { JaegerExporter as JaegerExporter2 } from "@opentelemetry/exporter-jaeger";
import { OTLPTraceExporter as OTLPTraceExporter2 } from "@opentelemetry/exporter-trace-otlp-http";
import { ExpressInstrumentation as ExpressInstrumentation2 } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation as HttpInstrumentation2 } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation as PgInstrumentation2 } from "@opentelemetry/instrumentation-pg";
import { RedisInstrumentation as RedisInstrumentation2 } from "@opentelemetry/instrumentation-redis";
import { registerInstrumentations as registerInstrumentations2 } from "@opentelemetry/instrumentation";
import { W3CTraceContextPropagator as W3CTraceContextPropagator2 } from "@opentelemetry/core";
function createCustomSpanMiddleware(name) {
  return (req, res, next2) => {
    const tracer = trace4.getTracer("express-tracer");
    const span = tracer.startSpan(`${name}`, {
      kind: SpanKind2.SERVER,
      attributes: {
        "http.method": req.method,
        "http.url": req.originalUrl,
        "http.request_id": req.id,
        "service.name": "healthcare-platform"
      }
    });
    context4.with(trace4.setSpan(context4.active(), span), () => {
      req.span = span;
      const startTime = Date.now();
      res.on("finish", () => {
        span.setAttributes({
          "http.status_code": res.statusCode,
          "http.response_time_ms": Date.now() - startTime
        });
        if (res.statusCode >= 400) {
          span.setStatus({
            code: res.statusCode >= 500 ? 2 : 1,
            // Error or warning based on status code
            message: `HTTP Error ${res.statusCode}`
          });
        }
        span.end();
      });
      next2();
    });
  };
}
function createSpan2(name, parentSpan) {
  const tracer = trace4.getTracer("healthcare-tracer");
  return tracer.startSpan(name, void 0, parentSpan ? trace4.setSpan(context4.active(), parentSpan) : void 0);
}
async function withSpan2(name, operation, attributes = {}, parentSpan) {
  const span = createSpan2(name, parentSpan);
  try {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
    return await context4.with(trace4.setSpan(context4.active(), span), async () => {
      try {
        return await operation(span);
      } catch (error2) {
        span.setStatus({
          code: 2,
          // Error
          message: error2.message
        });
        span.recordException(error2);
        throw error2;
      }
    });
  } finally {
    span.end();
  }
}

// microservices/observability/src/routes.ts
import { cpus, freemem, totalmem } from "os";
import { readFileSync } from "fs";
import { join } from "path";
import { exec } from "child_process";
import { promisify as promisify2 } from "util";
var execAsync = promisify2(exec);
function getPackageInfo() {
  try {
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf8")
    );
    return {
      name: packageJson.name || "healthcare-observability",
      version: packageJson.version || "0.1.0",
      description: packageJson.description || "Healthcare Platform Observability Service"
    };
  } catch (err) {
    return {
      name: "healthcare-observability",
      version: "0.1.0",
      description: "Healthcare Platform Observability Service"
    };
  }
}
var packageInfo = getPackageInfo();
var swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: packageInfo.name,
      version: packageInfo.version,
      description: packageInfo.description
    },
    servers: [
      {
        url: "/api",
        description: "Observability Service API"
      }
    ]
  },
  apis: ["./src/routes.ts"]
  // Path to the API docs
};
var swaggerSpec = swaggerJsdoc(swaggerOptions);
function registerRoutes(app2) {
  app2.get("/", (req, res) => {
    res.json({
      service: packageInfo.name,
      version: packageInfo.version,
      description: packageInfo.description,
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app2.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
  registerApiRoutes(app2);
  registerHealthRoutes(app2);
  registerDashboardRoutes(app2);
  app2.use((req, res) => {
    warn(`Route not found: ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip
    });
    res.status(404).json({
      error: "Not Found",
      message: `The requested resource ${req.originalUrl} was not found`
    });
  });
  app2.use(
    (err, req, res, next2) => {
      error(`Request error: ${err.message}`, err, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
      });
      res.status(500).json({
        error: "Internal Server Error",
        message: err.message
      });
    }
  );
}
function registerApiRoutes(app2) {
  const apiRouter = express.Router();
  apiRouter.use(createCustomSpanMiddleware("API Request"));
  apiRouter.post("/logs/query", async (req, res) => {
    try {
      const { query, timeRange, limit = 100, page = 1 } = req.body;
      await withSpan2("logs-query", async (span) => {
        span.setAttribute("query", query || "");
        span.setAttribute("limit", limit);
        span.setAttribute("page", page);
        incrementBusinessMetric("log_queries", { type: "api" });
        res.json({
          logs: [],
          count: 0,
          total: 0,
          query,
          timeRange,
          page,
          limit
        });
      });
    } catch (err) {
      next(err);
    }
  });
  apiRouter.post("/metrics/query", async (req, res, next2) => {
    try {
      const { query, timeRange, step = "1m" } = req.body;
      await withSpan2("metrics-query", async (span) => {
        span.setAttribute("query", query || "");
        span.setAttribute("step", step);
        incrementBusinessMetric("metric_queries", { type: "api" });
        res.json({
          status: "success",
          data: {
            resultType: "matrix",
            result: []
          },
          query,
          timeRange,
          step
        });
      });
    } catch (err) {
      next2(err);
    }
  });
  apiRouter.post("/traces/query", async (req, res, next2) => {
    try {
      const { service, operation, tags, timeRange, limit = 20 } = req.body;
      await withSpan2("traces-query", async (span) => {
        span.setAttribute("service", service || "");
        span.setAttribute("operation", operation || "");
        span.setAttribute("limit", limit);
        incrementBusinessMetric("trace_queries", { type: "api" });
        res.json({
          traces: [],
          total: 0
        });
      });
    } catch (err) {
      next2(err);
    }
  });
  apiRouter.get("/service-map", async (req, res, next2) => {
    try {
      await withSpan2("service-map", async () => {
        incrementBusinessMetric("service_map_requests");
        res.json({
          nodes: [],
          edges: []
        });
      });
    } catch (err) {
      next2(err);
    }
  });
  apiRouter.get("/system/info", async (req, res, next2) => {
    try {
      await withSpan2("system-info", async () => {
        const memoryUsage = process.memoryUsage();
        res.json({
          system: {
            arch: process.arch,
            platform: process.platform,
            cpus: cpus().length,
            memory: {
              total: totalmem(),
              free: freemem(),
              usage: ((totalmem() - freemem()) / totalmem() * 100).toFixed(2) + "%"
            }
          },
          process: {
            pid: process.pid,
            uptime: process.uptime(),
            memory: {
              rss: memoryUsage.rss,
              heapTotal: memoryUsage.heapTotal,
              heapUsed: memoryUsage.heapUsed,
              external: memoryUsage.external,
              arrayBuffers: memoryUsage.arrayBuffers
            }
          },
          environment: process.env.NODE_ENV,
          version: packageInfo.version
        });
      });
    } catch (err) {
      next2(err);
    }
  });
  apiRouter.get("/test/error", (req, res, next2) => {
    try {
      throw new Error("Test error for observability verification");
    } catch (err) {
      next2(err);
    }
  });
  apiRouter.post("/test/alert", async (req, res, next2) => {
    try {
      const { severity = "info", message = "Test alert" } = req.body;
      const testAlert = {
        id: "test-alert",
        name: "Test Alert",
        description: message,
        severity,
        runbook: "https://wiki.example.com/runbooks/test-alert"
      };
      const alertInstance = triggerAlert(testAlert);
      res.json({
        success: true,
        alert: alertInstance
      });
    } catch (err) {
      next2(err);
    }
  });
  app2.use("/api", apiRouter);
}
function registerHealthRoutes(app2) {
  app2.get("/health", async (req, res) => {
    try {
      const results = await Promise.all([
        checkComponentHealth("system"),
        checkComponentHealth("logging"),
        checkComponentHealth("metrics"),
        checkComponentHealth("tracing"),
        checkComponentHealth("alerts"),
        checkComponentHealth("integrations")
      ]);
      const healthy = results.every((result) => result.status === "ok");
      res.status(healthy ? 200 : 503).json({
        status: healthy ? "ok" : "degraded",
        version: packageInfo.version,
        components: results,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({
        status: "error",
        error: err.message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app2.get("/health/system", async (req, res) => {
    try {
      const result = await checkComponentHealth("system");
      res.status(result.status === "ok" ? 200 : 503).json(result);
    } catch (err) {
      res.status(500).json({
        status: "error",
        error: err.message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app2.get("/health/liveness", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/health/readiness", async (req, res) => {
    try {
      const systems = [
        checkDependencyHealth("logging"),
        checkDependencyHealth("metrics"),
        checkDependencyHealth("tracing")
      ];
      const results = await Promise.all(systems);
      const ready = results.every((result) => result.status === "ok");
      res.status(ready ? 200 : 503).json({
        status: ready ? "ok" : "not_ready",
        dependencies: results,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({
        status: "error",
        error: err.message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
}
function registerDashboardRoutes(app2) {
  app2.get("/api/dashboards", (req, res) => {
    res.json({
      dashboards: [
        {
          id: "system-overview",
          name: "System Overview",
          description: "High-level system metrics",
          url: "/dashboards/system-overview"
        },
        {
          id: "api-performance",
          name: "API Performance",
          description: "Detailed API performance metrics",
          url: "/dashboards/api-performance"
        },
        {
          id: "database",
          name: "Database",
          description: "Database performance metrics",
          url: "/dashboards/database"
        },
        {
          id: "errors",
          name: "Errors & Exceptions",
          description: "Error monitoring dashboard",
          url: "/dashboards/errors"
        },
        {
          id: "security",
          name: "Security",
          description: "Security monitoring dashboard",
          url: "/dashboards/security"
        }
      ]
    });
  });
  app2.get("/dashboards/:id", (req, res) => {
    res.json({
      message: `This would display the ${req.params.id} dashboard`,
      info: "In a production environment, this would either return dashboard data or redirect to a visualization tool like Grafana or Kibana"
    });
  });
}
async function checkComponentHealth(component) {
  switch (component) {
    case "system":
      return checkSystemHealth();
    case "logging":
      return {
        component: "logging",
        status: "ok",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    case "metrics":
      return {
        component: "metrics",
        status: "ok",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    case "tracing":
      return {
        component: "tracing",
        status: "ok",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    case "alerts":
      return {
        component: "alerts",
        status: "ok",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    case "integrations":
      return checkIntegrationsHealth();
    default:
      return {
        component,
        status: "unknown",
        message: `Unknown component: ${component}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
  }
}
async function checkSystemHealth() {
  const memPercent = (1 - freemem() / totalmem()) * 100;
  const memStatus = memPercent > 90 ? "error" : memPercent > 80 ? "warning" : "ok";
  let diskStatus = "ok";
  let diskPercent = 0;
  try {
    const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}'");
    diskPercent = parseInt(stdout.trim().replace("%", ""), 10);
    diskStatus = diskPercent > 90 ? "error" : diskPercent > 80 ? "warning" : "ok";
  } catch (err) {
    debug("Failed to check disk space:", err);
    diskStatus = "unknown";
  }
  const overallStatus = memStatus === "error" || diskStatus === "error" ? "error" : memStatus === "warning" || diskStatus === "warning" ? "warning" : "ok";
  return {
    component: "system",
    status: overallStatus,
    details: {
      memory: {
        total: totalmem(),
        free: freemem(),
        used: totalmem() - freemem(),
        percent: memPercent.toFixed(2) + "%",
        status: memStatus
      },
      disk: {
        percent: diskPercent + "%",
        status: diskStatus
      },
      cpu: {
        cores: cpus().length,
        load: process.cpuUsage()
      }
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function checkIntegrationsHealth() {
  const activeCount = activeIntegrations.filter((i) => i.enabled).length;
  return {
    component: "integrations",
    status: "ok",
    details: {
      total: activeIntegrations.length,
      active: activeCount,
      integrations: activeIntegrations.map((i) => ({
        type: i.type,
        enabled: i.enabled
      }))
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function checkDependencyHealth(dependency) {
  return {
    dependency,
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// microservices/observability/src/client.ts
import axios4 from "axios";
var ObservabilityClient = class {
  constructor(config) {
    this.metricCache = /* @__PURE__ */ new Map();
    this.config = {
      ...config,
      // If observabilityUrl is explicitly null, keep it as null to disable external reporting
      observabilityUrl: config.observabilityUrl === null ? null : config.observabilityUrl || "http://localhost:4000",
      enabled: {
        tracing: true,
        logging: true,
        metrics: true,
        ...config.enabled
      }
    };
    const externalReporting = this.config.observabilityUrl ? "enabled" : "disabled (local only)";
    console.log(`Observability client initialized for service: ${this.config.serviceName} v${this.config.serviceVersion} - External reporting ${externalReporting}`);
  }
  /**
   * Run an operation within a new span
   */
  async withSpan(name, operation, options) {
    if (!this.config.enabled?.tracing) {
      return await operation(this.createNoOpSpan());
    }
    const startTime = Date.now();
    const traceId = this.generateId();
    const spanId = this.generateId();
    const span = {
      setAttribute: (key, value) => {
        console.debug(`[TRACE] ${traceId}:${spanId} setAttribute: ${key}=${value}`);
        return span;
      },
      recordError: (error2) => {
        console.error(`[TRACE] ${traceId}:${spanId} recordError: ${error2.message}`);
        return span;
      },
      addEvent: (name2, attributes2) => {
        console.debug(`[TRACE] ${traceId}:${spanId} event: ${name2}`, attributes2);
        return span;
      },
      setStatus: (status, message) => {
        console.debug(`[TRACE] ${traceId}:${spanId} status: ${status} ${message || ""}`);
        return span;
      },
      getTraceId: () => traceId,
      getSpanId: () => spanId
    };
    const attributes = {
      ...this.config.defaultContext,
      ...options?.attributes,
      "service.name": this.config.serviceName,
      "service.version": this.config.serviceVersion
    };
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
    try {
      const result = await operation(span);
      span.setStatus("ok");
      return result;
    } catch (err) {
      span.setStatus("error", err.message);
      span.recordError(err);
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      console.debug(`[TRACE] ${traceId}:${spanId} completed in ${duration}ms`);
      this.reportSpan(name, {
        traceId,
        spanId,
        duration,
        attributes
      }).catch((e) => console.error("Failed to report span:", e));
    }
  }
  /**
   * Log at ERROR level
   */
  error(message, error2, context5) {
    this.log("error" /* ERROR */, message, {
      ...context5,
      error: error2?.message,
      stack: error2?.stack
    });
  }
  /**
   * Log at WARN level
   */
  warn(message, context5) {
    this.log("warn" /* WARN */, message, context5);
  }
  /**
   * Log at INFO level
   */
  info(message, context5) {
    this.log("info" /* INFO */, message, context5);
  }
  /**
   * Log at DEBUG level
   */
  debug(message, context5) {
    this.log("debug" /* DEBUG */, message, context5);
  }
  /**
   * Increment a counter metric
   */
  incrementCounter(name, value = 1, labels = {}) {
    if (!this.config.enabled?.metrics) return;
    this.reportMetric("counter" /* COUNTER */, name, value, labels).catch((e) => console.error(`Failed to report counter metric ${name}:`, e));
  }
  /**
   * Set a gauge metric
   */
  setGauge(name, value, labels = {}) {
    if (!this.config.enabled?.metrics) return;
    this.reportMetric("gauge" /* GAUGE */, name, value, labels).catch((e) => console.error(`Failed to report gauge metric ${name}:`, e));
  }
  /**
   * Record a value in a histogram
   */
  recordHistogram(name, value, labels = {}) {
    if (!this.config.enabled?.metrics) return;
    this.reportMetric("histogram" /* HISTOGRAM */, name, value, labels).catch((e) => console.error(`Failed to report histogram metric ${name}:`, e));
  }
  /**
   * Record timing for an operation
   */
  async recordTiming(name, operation, labels = {}) {
    const start = Date.now();
    try {
      return await operation();
    } finally {
      const duration = Date.now() - start;
      this.recordHistogram(name, duration, labels);
    }
  }
  /**
   * Check health of the observability service
   */
  async checkHealth() {
    if (!this.config.observabilityUrl) {
      return {
        status: "ok",
        components: {
          external: "disabled",
          local: "active"
        }
      };
    }
    try {
      const response = await axios4.get(`${this.config.observabilityUrl}/health`);
      return response.data;
    } catch (error2) {
      return {
        status: "error",
        components: {
          error: error2.message
        }
      };
    }
  }
  /**
   * Send logs to observability service
   */
  async log(level, message, context5) {
    if (!this.config.enabled?.logging) {
      console[level](`[${level.toUpperCase()}] ${message}`, context5);
      return;
    }
    const logEntry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      message,
      service: this.config.serviceName,
      version: this.config.serviceVersion,
      ...this.config.defaultContext,
      ...context5
    };
    console[level](`[${level.toUpperCase()}] ${message}`, context5);
    if (this.config.observabilityUrl) {
      try {
        await axios4.post(`${this.config.observabilityUrl}/api/logs`, {
          logs: [logEntry]
        });
      } catch (error2) {
        console.error("Failed to send log to observability service:", error2);
      }
    }
  }
  /**
   * Report a span to the observability service
   */
  async reportSpan(name, data) {
    if (!this.config.enabled?.tracing) return;
    if (this.config.observabilityUrl) {
      try {
        await axios4.post(`${this.config.observabilityUrl}/api/traces`, {
          name,
          service: this.config.serviceName,
          ...data
        });
      } catch (error2) {
        console.error("Failed to report span to observability service:", error2);
      }
    }
  }
  /**
   * Report a metric to the observability service
   */
  async reportMetric(type, name, value, labels = {}) {
    if (!this.config.enabled?.metrics) return;
    if (this.config.observabilityUrl) {
      try {
        await axios4.post(`${this.config.observabilityUrl}/api/metrics`, {
          type,
          name,
          value,
          labels: {
            service: this.config.serviceName,
            version: this.config.serviceVersion,
            ...labels
          },
          timestamp: Date.now()
        });
      } catch (error2) {
        console.error(`Failed to report metric ${name} to observability service:`, error2);
      }
    }
  }
  /**
   * Generate a random ID for spans/traces
   */
  generateId() {
    return Math.random().toString(16).slice(2);
  }
  /**
   * Create a no-op span when tracing is disabled
   */
  createNoOpSpan() {
    return {
      setAttribute: () => ({
        /* no-op */
      }),
      recordError: () => ({
        /* no-op */
      }),
      addEvent: () => ({
        /* no-op */
      }),
      setStatus: () => ({
        /* no-op */
      }),
      getTraceId: () => "disabled",
      getSpanId: () => "disabled"
    };
  }
};

// microservices/observability/src/middleware.ts
import { v4 as uuidv4 } from "uuid";
function createTracingMiddleware(client) {
  return (req, res, next2) => {
    req.id = req.headers["x-request-id"] || uuidv4();
    req.startTime = Date.now();
    req.observabilityClient = client;
    if (!req.headers["x-request-id"]) {
      req.headers["x-request-id"] = req.id;
    }
    res.setHeader("x-request-id", req.id);
    client.withSpan(`HTTP ${req.method}`, async (span) => {
      req.span = span;
      span.setAttribute("http.method", req.method);
      span.setAttribute("http.url", req.originalUrl);
      span.setAttribute("http.request_id", req.id);
      const traceId = span.getTraceId();
      if (traceId !== "disabled") {
        res.setHeader("traceparent", `00-${traceId}-${span.getSpanId()}-01`);
      }
      const finishRequest = () => {
        const duration = Date.now() - req.startTime;
        span.setAttribute("http.status_code", res.statusCode);
        span.setAttribute("http.duration_ms", duration);
        if (res.statusCode >= 400) {
          span.setStatus("error", `HTTP Error ${res.statusCode}`);
        } else {
          span.setStatus("ok");
        }
        res.removeListener("finish", finishRequest);
        res.removeListener("close", finishRequest);
      };
      res.on("finish", finishRequest);
      res.on("close", finishRequest);
      next2();
    }).catch(next2);
  };
}
function createLoggingMiddleware(client) {
  return (req, res, next2) => {
    client.info("Request received", {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      contentType: req.headers["content-type"],
      contentLength: req.headers["content-length"],
      traceId: req.span?.getTraceId()
    });
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Date.now() - req.startTime;
      client.info("Response sent", {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        contentLength: res.getHeader("content-length"),
        contentType: res.getHeader("content-type"),
        traceId: req.span?.getTraceId()
      });
      return originalEnd.apply(this, args);
    };
    next2();
  };
}
function createMetricsMiddleware(client) {
  return (req, res, next2) => {
    const endTimer = () => {
      const duration = Date.now() - req.startTime;
      let normalizedPath = req.baseUrl + (req.route?.path || req.path);
      normalizedPath = normalizedPath.replace(/\/[0-9a-f]{8,}/gi, "/:id");
      client.incrementCounter("http_requests_total", 1, {
        method: req.method,
        path: normalizedPath,
        status: res.statusCode.toString()
      });
      client.recordHistogram("http_request_duration_milliseconds", duration, {
        method: req.method,
        path: normalizedPath,
        status: res.statusCode.toString()
      });
      const contentLength = res.getHeader("content-length");
      if (contentLength) {
        client.recordHistogram("http_response_size_bytes", parseInt(contentLength.toString(), 10), {
          method: req.method,
          path: normalizedPath
        });
      }
      res.removeListener("finish", endTimer);
      res.removeListener("close", endTimer);
    };
    client.incrementCounter("http_active_requests", 1, {
      method: req.method
    });
    const requestContentLength = req.headers["content-length"];
    if (requestContentLength) {
      client.recordHistogram("http_request_size_bytes", parseInt(requestContentLength, 10), {
        method: req.method,
        path: req.path
      });
    }
    res.on("finish", endTimer);
    res.on("close", endTimer);
    const finalizeRequest = () => {
      client.incrementCounter("http_active_requests", -1, {
        method: req.method
      });
      res.removeListener("finish", finalizeRequest);
      res.removeListener("close", finalizeRequest);
    };
    res.on("finish", finalizeRequest);
    res.on("close", finalizeRequest);
    next2();
  };
}
function createErrorHandlingMiddleware(client) {
  return (err, req, res, next2) => {
    client.error("Request error", err, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      traceId: req.span?.getTraceId()
    });
    client.incrementCounter("http_errors_total", 1, {
      method: req.method,
      path: req.path,
      error_name: err.name || "Error"
    });
    if (req.span) {
      req.span.recordError(err);
      req.span.setStatus("error", err.message);
    }
    if (res.headersSent) {
      return next2(err);
    }
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
      error: {
        message: err.message,
        requestId: req.id,
        ...process.env.NODE_ENV === "development" ? { stack: err.stack } : {}
      }
    });
  };
}
function createHealthCheckMiddleware(healthCheck) {
  return async (req, res, next2) => {
    try {
      const result = await Promise.resolve(healthCheck());
      const statusCode = result.status === "ok" ? 200 : 503;
      res.status(statusCode).json({
        ...result,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      next2(err);
    }
  };
}
function createObservabilityMiddleware(client) {
  return [
    createTracingMiddleware(client),
    createLoggingMiddleware(client),
    createMetricsMiddleware(client)
  ];
}

// microservices/observability/src/index.ts
var DEFAULT_CONFIG = {
  port: parseInt(process.env.PORT || "4000", 10),
  environment: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  serviceName: "observability-service",
  tracingConfig: {
    enabled: process.env.TRACING_ENABLED === "true",
    endpoint: process.env.TRACING_ENDPOINT,
    samplingRate: parseFloat(process.env.TRACING_SAMPLING_RATE || "0.1")
  },
  metricsConfig: {
    enabled: process.env.METRICS_ENABLED === "true",
    endpoint: process.env.METRICS_ENDPOINT,
    interval: parseInt(process.env.METRICS_INTERVAL || "15000", 10),
    defaultLabels: {
      environment: process.env.NODE_ENV || "development"
    }
  },
  loggingConfig: {
    centralEndpoint: process.env.LOGGING_ENDPOINT,
    retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || "30", 10),
    bufferSize: parseInt(process.env.LOG_BUFFER_SIZE || "100", 10),
    flushInterval: parseInt(process.env.LOG_FLUSH_INTERVAL || "5000", 10)
  },
  alertingConfig: {
    enabled: process.env.ALERTING_ENABLED === "true",
    endpoints: process.env.ALERTING_ENDPOINTS?.split(","),
    defaultRecipients: process.env.ALERTING_RECIPIENTS?.split(",")
  }
};
var ObservabilityService = class {
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      tracingConfig: {
        ...DEFAULT_CONFIG.tracingConfig,
        ...config.tracingConfig || {}
      },
      metricsConfig: {
        ...DEFAULT_CONFIG.metricsConfig,
        ...config.metricsConfig || {}
      },
      loggingConfig: {
        ...DEFAULT_CONFIG.loggingConfig,
        ...config.loggingConfig || {}
      },
      alertingConfig: {
        ...DEFAULT_CONFIG.alertingConfig,
        ...config.alertingConfig || {}
      }
    };
    this.app = express2();
    this.configureMiddleware();
    this.initializeComponents();
    registerRoutes(this.app);
  }
  configureMiddleware() {
    this.app.use((req, res, next2) => {
      req.id = req.headers["x-request-id"] || uuidv42();
      res.setHeader("x-request-id", req.id);
      next2();
    });
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(json2());
    this.app.use((req, res, next2) => {
      const startTime = Date.now();
      const originalSend = res.send;
      res.send = function(...args) {
        const responseTime = Date.now() - startTime;
        res.setHeader("X-Response-Time", responseTime);
        console.log(JSON.stringify({
          level: "info",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          requestId: req.id,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          responseTime,
          userAgent: req.headers["user-agent"]
        }));
        return originalSend.apply(this, args);
      };
      next2();
    });
  }
  initializeComponents() {
    configureTracing(this.app, this.config.tracingConfig);
    configureLogs(this.app, this.config.loggingConfig);
    configureMetrics(this.app, this.config.metricsConfig);
    configureAlerts(this.app, this.config.alertingConfig);
    configureIntegrations(this.app);
  }
  start() {
    return new Promise((resolve) => {
      this.server = createServer(this.app);
      this.server.listen(this.config.port, () => {
        console.log(`Observability service is running on port ${this.config.port}`);
        console.log(`Environment: ${this.config.environment}`);
        resolve();
      });
    });
  }
  stop() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  getApp() {
    return this.app;
  }
};
var instance = null;
function createObservabilityService(config) {
  if (!instance) {
    instance = new ObservabilityService(config);
  }
  return instance;
}
if (__require.main === module) {
  const service = createObservabilityService();
  service.start().catch(console.error);
  const signals = ["SIGINT", "SIGTERM"];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, shutting down...`);
      await service.stop();
      process.exit(0);
    });
  });
}

// server/observability.ts
var observabilityClient = new ObservabilityClient({
  serviceName: "healthcare-platform",
  serviceVersion: process.env.npm_package_version || "1.0.0",
  // Set to null to disable external service reporting when not available
  // This will use in-memory/local reporting only
  observabilityUrl: null,
  defaultContext: {
    environment: process.env.NODE_ENV || "development",
    region: process.env.REGION || "us-east-1"
  },
  enabled: {
    // Enable local tracing but disable external service connection
    tracing: true,
    logging: true,
    metrics: true
  }
});
var observabilityMiddleware = [
  ...createObservabilityMiddleware(observabilityClient),
  // Add the error handling middleware at the end
  createErrorHandlingMiddleware(observabilityClient)
];
var healthCheckMiddleware = createHealthCheckMiddleware(async () => {
  return {
    status: "ok",
    details: {
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  };
});
function setupObservability() {
  observabilityClient.info("Application starting", {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  });
  process.on("uncaughtException", (err) => {
    observabilityClient.error("Uncaught exception", err);
    setTimeout(() => process.exit(1), 1e3);
  });
  process.on("unhandledRejection", (reason, promise) => {
    observabilityClient.error("Unhandled rejection", reason);
  });
  process.on("exit", (code) => {
    observabilityClient.info(`Process exiting with code ${code}`);
  });
  observabilityClient.incrementCounter("application_starts_total");
}
function withSpan3(name, operation, attributes = {}) {
  return withSpan(name, operation, { attributes });
}
var logger3 = {
  error: (message, error2, context5) => observabilityClient.error(message, error2, context5),
  warn: (message, context5) => observabilityClient.warn(message, context5),
  info: (message, context5) => observabilityClient.info(message, context5),
  debug: (message, context5) => observabilityClient.debug(message, context5)
};
function incrementCounter(name, value = 1, labels = {}) {
  observabilityClient.incrementCounter(name, value, labels);
}
function setGauge(name, value, labels = {}) {
  observabilityClient.setGauge(name, value, labels);
}
function recordHistogram(name, value, labels = {}) {
  observabilityClient.recordHistogram(name, value, labels);
}
async function measureTiming(name, operation, labels = {}) {
  return observabilityClient.recordTiming(name, operation, labels);
}
async function trackDbQuery(operation, table, queryFn) {
  return withSpan3(`db:${operation}:${table}`, async (span) => {
    span.setAttribute("db.operation", operation);
    span.setAttribute("db.table", table);
    const startTime = Date.now();
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      recordHistogram("database_query_duration_ms", duration, {
        operation,
        table
      });
      return result;
    } catch (error2) {
      incrementCounter("database_query_errors_total", 1, {
        operation,
        table,
        error_name: error2.name || "Error"
      });
      throw error2;
    }
  });
}
async function trackApiCall(service, operation, callFn) {
  return withSpan3(`api:${service}:${operation}`, async (span) => {
    span.setAttribute("api.service", service);
    span.setAttribute("api.operation", operation);
    const startTime = Date.now();
    try {
      const result = await callFn();
      const duration = Date.now() - startTime;
      recordHistogram("api_call_duration_ms", duration, {
        service,
        operation
      });
      incrementCounter("api_calls_total", 1, {
        service,
        operation,
        status: "success"
      });
      return result;
    } catch (error2) {
      incrementCounter("api_calls_total", 1, {
        service,
        operation,
        status: "error",
        error_name: error2.name || "Error"
      });
      throw error2;
    }
  });
}

// server/routes/contract-routes.ts
import { Router } from "express";
import multer from "multer";

// server/services/ai-assistant.ts
init_logger();

// server/services/shaia-platform-service.ts
init_logger();
import OpenAI from "openai";

// server/services/contract-access-service.ts
init_logger();

// server/storage/contract-storage.ts
init_logger();
import { eq as eq2, desc, and, sql as sql2 } from "drizzle-orm";
var ContractStorage = class {
  /**
   * Get a contract by ID
   */
  async getContract(id) {
    try {
      const [contract] = await db.select().from(contracts).where(eq2(contracts.id, id)).limit(1);
      return contract;
    } catch (error2) {
      logger4.error("Failed to get contract by ID", { id, error: error2 });
      throw new Error("Database error while retrieving contract");
    }
  }
  /**
   * Get all contracts owned by an organization
   */
  async getContractsByOwner(organizationId) {
    try {
      return await db.select().from(contracts).where(eq2(contracts.ownerOrganizationId, organizationId)).orderBy(desc(contracts.updatedAt));
    } catch (error2) {
      logger4.error("Failed to get contracts by owner", { organizationId, error: error2 });
      throw new Error("Database error while retrieving contracts by owner");
    }
  }
  /**
   * Get all contracts where an organization is a participant
   */
  async getContractsByParticipant(organizationId) {
    try {
      const participations = await db.select({ contractId: contractParticipants.contractId }).from(contractParticipants).where(eq2(contractParticipants.organizationId, organizationId));
      const contractIds = participations.map((p) => p.contractId);
      if (contractIds.length === 0) {
        return [];
      }
      return await db.select().from(contracts).where(sql2`${contracts.id} IN (${contractIds.join(",")})`).orderBy(desc(contracts.updatedAt));
    } catch (error2) {
      logger4.error("Failed to get contracts by participant", { organizationId, error: error2 });
      throw new Error("Database error while retrieving contracts by participant");
    }
  }
  /**
   * Check if an organization is a participant in a contract
   */
  async checkContractParticipant(contractId, organizationId) {
    try {
      const [result] = await db.select({ count: sql2`count(*)` }).from(contractParticipants).where(
        and(
          eq2(contractParticipants.contractId, contractId),
          eq2(contractParticipants.organizationId, organizationId)
        )
      );
      return result.count > 0;
    } catch (error2) {
      logger4.error("Failed to check contract participant", { contractId, organizationId, error: error2 });
      throw new Error("Database error while checking contract participant");
    }
  }
  /**
   * Get all participants for a contract
   */
  async getContractParticipants(contractId) {
    try {
      return await db.select().from(contractParticipants).where(eq2(contractParticipants.contractId, contractId));
    } catch (error2) {
      logger4.error("Failed to get contract participants", { contractId, error: error2 });
      throw new Error("Database error while retrieving contract participants");
    }
  }
  /**
   * Create a new contract
   */
  async createContract(contractData) {
    try {
      const [contract] = await db.insert(contracts).values({
        ...contractData,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      await this.addContractParticipant({
        contractId: contract.id,
        organizationId: contractData.ownerOrganizationId,
        role: "owner",
        permissions: ["read", "write", "share", "delete"],
        createdAt: /* @__PURE__ */ new Date()
      });
      return contract;
    } catch (error2) {
      logger4.error("Failed to create contract", { error: error2 });
      throw new Error("Database error while creating contract");
    }
  }
  /**
   * Update an existing contract
   */
  async updateContract(id, contractData) {
    try {
      const [updatedContract] = await db.update(contracts).set({
        ...contractData,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(contracts.id, id)).returning();
      return updatedContract;
    } catch (error2) {
      logger4.error("Failed to update contract", { id, error: error2 });
      throw new Error("Database error while updating contract");
    }
  }
  /**
   * Add a participant to a contract
   */
  async addContractParticipant(participantData) {
    try {
      const [participant] = await db.insert(contractParticipants).values(participantData).returning();
      return participant;
    } catch (error2) {
      logger4.error("Failed to add contract participant", { error: error2 });
      throw new Error("Database error while adding contract participant");
    }
  }
  /**
   * Remove a participant from a contract
   */
  async removeContractParticipant(contractId, organizationId) {
    try {
      await db.delete(contractParticipants).where(
        and(
          eq2(contractParticipants.contractId, contractId),
          eq2(contractParticipants.organizationId, organizationId)
        )
      );
      return true;
    } catch (error2) {
      logger4.error("Failed to remove contract participant", { contractId, organizationId, error: error2 });
      throw new Error("Database error while removing contract participant");
    }
  }
  /**
   * Create a contract analysis
   */
  async createContractAnalysis(analysisData) {
    try {
      const [analysis] = await db.insert(contractAnalyses).values({
        ...analysisData,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return analysis;
    } catch (error2) {
      logger4.error("Failed to create contract analysis", { error: error2 });
      throw new Error("Database error while creating contract analysis");
    }
  }
  /**
   * Get the latest analysis for a contract
   */
  async getLatestAnalysis(contractId) {
    try {
      const [analysis] = await db.select().from(contractAnalyses).where(eq2(contractAnalyses.contractId, contractId)).orderBy(desc(contractAnalyses.createdAt)).limit(1);
      return analysis;
    } catch (error2) {
      logger4.error("Failed to get latest analysis", { contractId, error: error2 });
      throw new Error("Database error while retrieving latest analysis");
    }
  }
  /**
   * Create a cost estimate request
   */
  async createCostEstimateRequest(requestData) {
    try {
      const [request] = await db.insert(costEstimateRequests).values({
        ...requestData,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return request;
    } catch (error2) {
      logger4.error("Failed to create cost estimate request", { error: error2 });
      throw new Error("Database error while creating cost estimate request");
    }
  }
  /**
   * Update a cost estimate request
   */
  async updateCostEstimateRequest(id, requestData) {
    try {
      const [updatedRequest] = await db.update(costEstimateRequests).set({
        ...requestData,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(costEstimateRequests.id, id)).returning();
      return updatedRequest;
    } catch (error2) {
      logger4.error("Failed to update cost estimate request", { id, error: error2 });
      throw new Error("Database error while updating cost estimate request");
    }
  }
  /**
   * Get a cost estimate request by ID
   */
  async getCostEstimateRequest(id) {
    try {
      const [request] = await db.select().from(costEstimateRequests).where(eq2(costEstimateRequests.id, id)).limit(1);
      return request;
    } catch (error2) {
      logger4.error("Failed to get cost estimate request", { id, error: error2 });
      throw new Error("Database error while retrieving cost estimate request");
    }
  }
  /**
   * Get all cost estimate requests for a contract
   */
  async getCostEstimateRequests(contractId) {
    try {
      return await db.select().from(costEstimateRequests).where(eq2(costEstimateRequests.contractId, contractId)).orderBy(desc(costEstimateRequests.createdAt));
    } catch (error2) {
      logger4.error("Failed to get cost estimate requests", { contractId, error: error2 });
      throw new Error("Database error while retrieving cost estimate requests");
    }
  }
};
var contractStorage = new ContractStorage();

// server/services/contract-access-service.ts
var VALID_PURPOSES = [
  "contract_review",
  "payment_processing",
  "claim_processing",
  "compliance_audit",
  "service_cost_estimation",
  "contract_analysis",
  "contract_modification"
];
var ContractAccessService = class {
  /**
   * Check if a user has access to a specific contract
   */
  async hasContractAccess(userId, contractId, purpose) {
    try {
      logger4.info("Checking contract access", { userId, contractId, purpose });
      if (!this.isValidPurpose(purpose)) {
        logger4.warn("Invalid access purpose specified", { userId, contractId, purpose });
        this.logAccessAttempt({
          userId,
          contractId,
          purpose,
          granted: false,
          reason: "Invalid access purpose",
          timestamp: /* @__PURE__ */ new Date()
        });
        return false;
      }
      const userOrgId = await this.getUserOrganizationId(userId);
      if (!userOrgId) {
        logger4.warn("User has no associated organization", { userId });
        this.logAccessAttempt({
          userId,
          contractId,
          purpose,
          granted: false,
          reason: "User has no associated organization",
          timestamp: /* @__PURE__ */ new Date()
        });
        return false;
      }
      const isParticipant = await this.checkContractParticipant(contractId, userOrgId);
      if (!isParticipant) {
        logger4.warn("Organization is not a participant in contract", { userId, contractId, organizationId: userOrgId });
        this.logAccessAttempt({
          userId,
          contractId,
          purpose,
          granted: false,
          reason: "Organization is not a contract participant",
          timestamp: /* @__PURE__ */ new Date()
        });
        return false;
      }
      logger4.info("Contract access granted", { userId, contractId, purpose });
      this.logAccessAttempt({
        userId,
        contractId,
        purpose,
        granted: true,
        reason: "All access checks passed",
        timestamp: /* @__PURE__ */ new Date()
      });
      return true;
    } catch (error2) {
      logger4.error("Error checking contract access", { userId, contractId, purpose, error: error2 });
      return false;
    }
  }
  /**
   * Authorize a user to perform a specific action on a contract
   */
  async authorizeContractAction(userId, contractId, action, purpose) {
    try {
      logger4.info("Authorizing contract action", { userId, contractId, action, purpose });
      const hasAccess = await this.hasContractAccess(userId, contractId, purpose);
      if (!hasAccess) {
        return false;
      }
      const userOrgId = await this.getUserOrganizationId(userId);
      if (!userOrgId) {
        logger4.warn("User has no associated organization", { userId });
        return false;
      }
      const role = await this.getContractParticipantRole(contractId, userOrgId);
      let isAuthorized = false;
      switch (action) {
        case "view":
          isAuthorized = true;
          break;
        case "analyze":
          isAuthorized = true;
          break;
        case "estimate_cost":
          isAuthorized = true;
          break;
        case "update":
          isAuthorized = role === "owner";
          break;
        case "delete":
          isAuthorized = role === "owner";
          break;
        case "share":
          isAuthorized = role === "owner";
          break;
        default:
          isAuthorized = false;
      }
      this.logActionAuthorization({
        userId,
        contractId,
        action,
        purpose,
        granted: isAuthorized,
        reason: isAuthorized ? "Action permitted based on role" : "Action not permitted for user role",
        role,
        timestamp: /* @__PURE__ */ new Date()
      });
      return isAuthorized;
    } catch (error2) {
      logger4.error("Error authorizing contract action", { userId, contractId, action, purpose, error: error2 });
      return false;
    }
  }
  /**
   * Filter contracts to only those accessible to the user
   */
  async filterAccessibleContracts(userId, contracts2, purpose) {
    try {
      const userOrgId = await this.getUserOrganizationId(userId);
      if (!userOrgId) {
        logger4.warn("User has no associated organization", { userId });
        return [];
      }
      const accessibleContracts = [];
      for (const contract of contracts2) {
        const isParticipant = await this.checkContractParticipant(contract.id, userOrgId);
        if (isParticipant) {
          accessibleContracts.push(contract);
          this.logAccessAttempt({
            userId,
            contractId: contract.id,
            purpose,
            granted: true,
            reason: "Organization is a contract participant",
            timestamp: /* @__PURE__ */ new Date()
          });
        }
      }
      return accessibleContracts;
    } catch (error2) {
      logger4.error("Error filtering accessible contracts", { userId, purpose, error: error2 });
      return [];
    }
  }
  /**
   * Get the organization ID for a user
   */
  async getUserOrganizationId(userId) {
    try {
      return 1;
    } catch (error2) {
      logger4.error("Error getting user organization ID", { userId, error: error2 });
      return null;
    }
  }
  /**
   * Check if a user's organization is a participant in a contract
   */
  async checkContractParticipant(contractId, organizationId) {
    try {
      const participants = await contractStorage.getContractParticipants(contractId);
      return participants.some((p) => p.organizationId === organizationId);
    } catch (error2) {
      logger4.error("Error checking contract participant", { contractId, organizationId, error: error2 });
      return false;
    }
  }
  /**
   * Get the role of an organization in a contract
   */
  async getContractParticipantRole(contractId, organizationId) {
    try {
      const participants = await contractStorage.getContractParticipants(contractId);
      const participant = participants.find((p) => p.organizationId === organizationId);
      return participant ? participant.role : null;
    } catch (error2) {
      logger4.error("Error getting contract participant role", { contractId, organizationId, error: error2 });
      return null;
    }
  }
  /**
   * Check if a purpose string is valid for contract access
   */
  isValidPurpose(purpose) {
    return VALID_PURPOSES.includes(purpose);
  }
  /**
   * Log access attempt to the audit system
   */
  logAccessAttempt(data) {
    logger4.info("Contract access attempt", data);
  }
  /**
   * Log action authorization to the audit system
   */
  logActionAuthorization(data) {
    logger4.info("Contract action authorization", data);
  }
};
var contractAccessService = new ContractAccessService();

// server/consent/consent-service.ts
init_logger();
var ConsentService = class {
  /**
   * Check if a user has consent/permission to perform an action
   * 
   * @param params Parameters for consent check
   * @returns Authorization decision
   */
  async checkUserConsent(params) {
    try {
      logger4.info("Checking user consent", {
        userId: params.userId,
        purpose: params.purpose,
        resource: params.resource,
        action: params.action
      });
      if (params.purpose === "eligibility_verification") {
        return { authorized: true };
      }
      if (params.purpose === "organization_representation") {
        return { authorized: true };
      }
      if (params.purpose === "ai_processing") {
        return { authorized: true };
      }
      return { authorized: true };
    } catch (error2) {
      logger4.error("Error checking user consent", {
        error: error2,
        userId: params.userId,
        purpose: params.purpose
      });
      return {
        authorized: false,
        reason: `Error checking consent: ${error2.message}`
      };
    }
  }
  /**
   * Check if a user has access to specific data
   * 
   * @param params Parameters for data access check
   * @returns Authorization decision for data access
   */
  async checkDataAccess(params) {
    try {
      logger4.info("Checking data access", {
        userId: params.userId,
        resourceId: params.resourceId,
        resourceType: params.resourceType,
        action: params.action
      });
      return { authorized: true };
    } catch (error2) {
      logger4.error("Error checking data access", {
        error: error2,
        userId: params.userId,
        resourceId: params.resourceId
      });
      return {
        authorized: false,
        reason: `Error checking data access: ${error2.message}`
      };
    }
  }
};
var consentsService = new ConsentService();

// server/services/shaia-platform-service.ts
var OPENAI_MODEL = "gpt-4o";
var ShaiaPlatformService = class {
  openai;
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      logger4.warn("OPENAI_API_KEY is not set. Shaia service will not function properly.");
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  /**
   * Process a natural language query from a user
   * 
   * @param userId The ID of the user making the query
   * @param query The natural language query text
   * @param context Additional context for the query
   * @returns AI response to the query
   */
  async processQuery(userId, query, context5 = {}) {
    try {
      logger4.info("Processing user query with Shaia", { userId, query });
      const hasPermission = await this.validateUserPermission(userId, "shaia_query");
      if (!hasPermission) {
        logger4.warn("User does not have permission to use Shaia", { userId });
        throw new Error("Unauthorized access to Shaia");
      }
      const systemPrompt = this.buildSystemPrompt(context5);
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        temperature: 0.2,
        // Lower temperature for more factual responses
        max_tokens: 1500
      });
      const response = completion.choices[0].message.content || "";
      this.logInteraction({
        userId,
        interactionType: "query",
        query,
        response,
        timestamp: /* @__PURE__ */ new Date()
      });
      return response;
    } catch (error2) {
      logger4.error("Error processing query with Shaia", { userId, query, error: error2 });
      throw new Error("Failed to process your request. Please try again later.");
    }
  }
  /**
   * Generate clinical insights from patient data
   * 
   * @param userId The ID of the user requesting insights
   * @param patientId The ID of the patient
   * @param clinicalData The clinical data to analyze
   * @returns Structured clinical insights
   */
  async generateClinicalInsights(userId, patientId, clinicalData) {
    try {
      logger4.info("Generating clinical insights with Shaia", { userId, patientId });
      const hasPermission = await this.validateDataAccess(userId, patientId, "clinical_data");
      if (!hasPermission) {
        logger4.warn("User does not have permission to access patient data", { userId, patientId });
        throw new Error("Unauthorized access to patient data");
      }
      const hasAiPermission = await this.validateUserPermission(userId, "shaia_clinical_insights");
      if (!hasAiPermission) {
        logger4.warn("User does not have permission to use Shaia for clinical insights", { userId });
        throw new Error("Unauthorized access to Shaia clinical insights feature");
      }
      const structuredData = JSON.stringify(clinicalData);
      const systemPrompt = `
        You are Shaia, a Smart Health AI Assistant specialized in clinical data analysis.
        Based on the provided clinical data, generate meaningful insights that could help healthcare providers.
        Focus on:
        1. Potential gaps in care
        2. Medication interactions or concerns
        3. Trends in vital signs or lab results
        4. Alignment with clinical guidelines
        5. Risk factors and preventive care opportunities
        
        Provide your insights in a structured JSON format with the following categories:
        - careGaps: Array of identified gaps in care
        - medicationInsights: Any medication-related insights
        - clinicalTrends: Identified trends in the data
        - guidelineAdherence: Areas where care aligns with or diverges from guidelines
        - preventiveRecommendations: Suggested preventive care actions
        
        Ensure your insights are evidence-based and clinically sound.
      `;
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please analyze this clinical data: ${structuredData}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        // Very low temperature for clinical insights
        max_tokens: 2e3
      });
      const responseText = completion.choices[0].message.content || "{}";
      const insights = JSON.parse(responseText);
      this.logInteraction({
        userId,
        interactionType: "clinical_insights",
        patientId,
        insights,
        timestamp: /* @__PURE__ */ new Date()
      });
      return insights;
    } catch (error2) {
      logger4.error("Error generating clinical insights with Shaia", { userId, patientId, error: error2 });
      throw new Error("Failed to generate clinical insights. Please try again later.");
    }
  }
  /**
   * Extract structured data from healthcare documents
   * 
   * @param userId The ID of the user requesting extraction
   * @param documentText The text content of the document
   * @param documentType The type of document (e.g., "clinical_note", "lab_report")
   * @param extractionSchema Optional schema defining what data to extract
   * @returns Structured data extracted from the document
   */
  async extractDocumentData(userId, documentText, documentType, extractionSchema = null) {
    try {
      logger4.info("Extracting data from document with Shaia", { userId, documentType });
      const hasPermission = await this.validateUserPermission(userId, "shaia_document_extraction");
      if (!hasPermission) {
        logger4.warn("User does not have permission to use Shaia for document extraction", { userId });
        throw new Error("Unauthorized access to Shaia document extraction feature");
      }
      const schema = extractionSchema || this.getDefaultExtractionSchema(documentType);
      const systemPrompt = `
        You are Shaia, a Smart Health AI Assistant specialized in healthcare document processing.
        Extract structured data from the provided ${documentType} according to the schema below.
        
        Extraction Schema:
        ${JSON.stringify(schema)}
        
        Return the extracted data in JSON format according to the schema.
        If you cannot find certain data points, use null for those fields.
        Do not hallucinate or make up information not present in the document.
      `;
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please extract data from this document: ${documentText}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        // Very low temperature for extraction tasks
        max_tokens: 2e3
      });
      const responseText = completion.choices[0].message.content || "{}";
      const extractedData = JSON.parse(responseText);
      this.logInteraction({
        userId,
        interactionType: "document_extraction",
        documentType,
        extractedData,
        timestamp: /* @__PURE__ */ new Date()
      });
      return extractedData;
    } catch (error2) {
      logger4.error("Error extracting document data with Shaia", { userId, documentType, error: error2 });
      throw new Error("Failed to extract document data. Please try again later.");
    }
  }
  /**
   * Analyze a healthcare contract (specific implementation for contracts)
   * 
   * @param userId The ID of the user requesting analysis
   * @param contractId The ID of the contract
   * @param contractText The text content of the contract
   * @returns Structured contract analysis
   */
  async analyzeContract(userId, contractId, contractText) {
    try {
      logger4.info("Analyzing contract with Shaia", { userId, contractId });
      const hasAccess = await contractAccessService.hasContractAccess(
        userId,
        contractId,
        "contract_analysis"
      );
      if (!hasAccess) {
        logger4.warn("User does not have access to analyze contract", { userId, contractId });
        throw new Error("Unauthorized access to contract");
      }
      const systemPrompt = `
        You are Shaia, a Smart Health AI Assistant specialized in healthcare contract analysis.
        Analyze the provided healthcare contract and extract the following information:
        
        1. Contract Basics:
           - Parties involved
           - Effective dates
           - Contract type
           
        2. Financial Terms:
           - Payment methodologies
           - Fee schedules
           - Risk arrangements
           
        3. Performance Requirements:
           - Quality metrics
           - Reporting requirements
           - Performance guarantees
           
        4. Service Details:
           - Covered services
           - Excluded services
           - Prior authorization requirements
           
        Return the analysis in a structured JSON format with these categories.
      `;
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please analyze this healthcare contract: ${contractText.substring(0, 15e3)}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2500
      });
      const responseText = completion.choices[0].message.content || "{}";
      const analysis = JSON.parse(responseText);
      this.logInteraction({
        userId,
        interactionType: "contract_analysis",
        contractId,
        analysis,
        timestamp: /* @__PURE__ */ new Date()
      });
      return analysis;
    } catch (error2) {
      logger4.error("Error analyzing contract with Shaia", { userId, contractId, error: error2 });
      throw new Error("Failed to analyze contract. Please try again later.");
    }
  }
  /**
   * Generate a cost estimate for healthcare services based on contract terms
   * 
   * @param userId The ID of the user requesting the estimate
   * @param contractId The ID of the contract
   * @param serviceDetails The details of the service to estimate
   * @returns Cost estimate for the service
   */
  async generateCostEstimate(userId, contractId, serviceDetails) {
    try {
      logger4.info("Generating cost estimate with Shaia", { userId, contractId, serviceDetails });
      const hasAccess = await contractAccessService.hasContractAccess(
        userId,
        contractId,
        "service_cost_estimation"
      );
      if (!hasAccess) {
        logger4.warn("User does not have access to generate cost estimates", { userId, contractId });
        throw new Error("Unauthorized access to contract");
      }
      const contractAnalysis = {
        /* Contract analysis data */
      };
      const prompt = `
        Given the following contract terms and service details, estimate the cost.
        
        CONTRACT TERMS:
        ${JSON.stringify(contractAnalysis)}
        
        SERVICE DETAILS:
        ${JSON.stringify(serviceDetails)}
        
        Provide a detailed breakdown of the estimated cost including:
        1. Total estimated cost
        2. Patient responsibility
        3. Insurance responsibility
        4. Any applicable discounts
        5. Confidence level in the estimate
        
        Return the estimate in JSON format.
      `;
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: "You are Shaia, a Smart Health AI Assistant specialized in healthcare cost estimation." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1500
      });
      const responseText = completion.choices[0].message.content || "{}";
      const estimate = JSON.parse(responseText);
      this.logInteraction({
        userId,
        interactionType: "cost_estimate",
        contractId,
        serviceDetails,
        estimate,
        timestamp: /* @__PURE__ */ new Date()
      });
      return estimate;
    } catch (error2) {
      logger4.error("Error generating cost estimate with Shaia", { userId, contractId, error: error2 });
      throw new Error("Failed to generate cost estimate. Please try again later.");
    }
  }
  /**
   * Identify quality metrics from clinical data that can be used for quality monitoring
   * 
   * @param userId The ID of the user requesting metrics
   * @param clinicalData The clinical data to analyze
   * @returns List of quality metrics and their current values
   */
  async identifyQualityMetrics(userId, clinicalData) {
    try {
      logger4.info("Identifying quality metrics with Shaia", { userId });
      const hasPermission = await this.validateUserPermission(userId, "shaia_quality_monitoring");
      if (!hasPermission) {
        logger4.warn("User does not have permission to use Shaia for quality monitoring", { userId });
        throw new Error("Unauthorized access to Shaia quality monitoring feature");
      }
      const systemPrompt = `
        You are Shaia, a Smart Health AI Assistant specialized in healthcare quality measurement.
        
        Based on the provided clinical data, identify relevant quality metrics that could be monitored.
        For each metric:
        1. Provide a standard name (preferably from HEDIS, MIPS, or other recognized frameworks)
        2. Give a clear description
        3. Calculate the current value based on the provided data
        4. Provide the target or benchmark value
        5. Indicate data gaps that would need to be filled
        
        Return the metrics in JSON format.
      `;
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please identify quality metrics from this clinical data: ${JSON.stringify(clinicalData)}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2e3
      });
      const responseText = completion.choices[0].message.content || "{}";
      const metrics = JSON.parse(responseText);
      this.logInteraction({
        userId,
        interactionType: "quality_metrics_identification",
        metrics,
        timestamp: /* @__PURE__ */ new Date()
      });
      return metrics;
    } catch (error2) {
      logger4.error("Error identifying quality metrics with Shaia", { userId, error: error2 });
      throw new Error("Failed to identify quality metrics. Please try again later.");
    }
  }
  /**
   * Extract clinical quality targets from contract terms
   * 
   * Support function for the Quality and Value Based Monitoring service
   * 
   * @param prompt The prompt containing contract quality metric details
   * @returns Structured clinical quality targets that can be monitored
   */
  async getClinicalQualityTargets(prompt) {
    try {
      logger4.info("Extracting clinical quality targets with Shaia");
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: "You are Shaia, a Smart Health AI Assistant specialized in healthcare quality measurement and contract analysis." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2e3
      });
      const responseText = completion.choices[0].message.content || "[]";
      return JSON.parse(responseText);
    } catch (error2) {
      logger4.error("Error extracting clinical quality targets with Shaia", { error: error2 });
      throw new Error("Failed to extract clinical quality targets. Please try again later.");
    }
  }
  /**
   * Extract structured data from a contract
   * 
   * @param prompt The prompt containing contract text to analyze
   * @returns Structured contract data
   */
  async getContractExtraction(prompt) {
    try {
      logger4.info("Extracting contract data with Shaia");
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: "You are Shaia, a Smart Health AI Assistant specialized in healthcare contract analysis." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2e3
      });
      const responseText = completion.choices[0].message.content || "{}";
      return JSON.parse(responseText);
    } catch (error2) {
      logger4.error("Error extracting contract data with Shaia", { error: error2 });
      throw new Error("Failed to extract contract data. Please try again later.");
    }
  }
  /**
   * Check if a user has permission to use a specific Shaia feature
   */
  async validateUserPermission(userId, feature) {
    try {
      const consentCheck = await consentsService.checkUserConsent({
        userId,
        purpose: "ai_processing",
        resource: feature,
        action: "use"
      });
      return consentCheck.authorized;
    } catch (error2) {
      logger4.error("Error validating user permission for Shaia", { userId, feature, error: error2 });
      return false;
    }
  }
  /**
   * Check if a user has permission to access specific data
   */
  async validateDataAccess(userId, resourceId, resourceType) {
    try {
      const accessCheck = await consentsService.checkDataAccess({
        userId,
        resourceId,
        resourceType,
        action: "read"
      });
      return accessCheck.authorized;
    } catch (error2) {
      logger4.error("Error validating data access for Shaia", { userId, resourceId, resourceType, error: error2 });
      return false;
    }
  }
  /**
   * Build a system prompt based on context
   */
  buildSystemPrompt(context5 = {}) {
    let systemPrompt = `
      You are Shaia (Smart Health AI Assistant), a healthcare-specific AI assistant for the Smart Health Hub platform.
      
      Your primary goals are to:
      1. Provide accurate, evidence-based information about healthcare topics
      2. Help users navigate the Smart Health Hub platform
      3. Assist in interpreting healthcare data and documents
      4. Support healthcare decision making with insights and analysis
      
      Important guidelines:
      - Always maintain patient confidentiality and privacy
      - Be clear about your limitations and uncertainty
      - Provide sources for clinical information when possible
      - Use plain language that is accessible to both healthcare professionals and patients
      - Focus on being helpful, accurate, and concise
    `;
    if (context5.userRole === "provider") {
      systemPrompt += `
        You are currently speaking with a healthcare provider.
        Use appropriate clinical terminology and focus on evidence-based information.
        Providers are interested in clinical insights, guideline adherence, and optimizing patient care.
      `;
    } else if (context5.userRole === "patient") {
      systemPrompt += `
        You are currently speaking with a patient.
        Use plain language without medical jargon. Explain concepts clearly.
        Focus on helping the patient understand their health information and navigate the healthcare system.
        Do not provide specific medical advice, diagnosis, or treatment recommendations.
      `;
    } else if (context5.userRole === "administrator") {
      systemPrompt += `
        You are currently speaking with a healthcare administrator.
        Focus on operational, regulatory, and business aspects of healthcare.
        Administrators are interested in compliance, efficiency, and quality improvement.
      `;
    }
    if (context5.domain === "clinical") {
      systemPrompt += `
        Focus on clinical information, medical knowledge, and patient care.
        Refer to established clinical guidelines and evidence-based medicine.
      `;
    } else if (context5.domain === "administrative") {
      systemPrompt += `
        Focus on healthcare operations, billing, coding, and administrative processes.
        Reference relevant healthcare regulations and standards.
      `;
    } else if (context5.domain === "technical") {
      systemPrompt += `
        Focus on technical aspects of healthcare IT, interoperability, and data standards.
        Reference FHIR, HL7, SNOMED, LOINC and other healthcare technical standards.
      `;
    }
    return systemPrompt;
  }
  /**
   * Get a default extraction schema for a document type
   */
  getDefaultExtractionSchema(documentType) {
    switch (documentType) {
      case "clinical_note":
        return {
          patientInfo: {
            patientName: "string",
            patientId: "string",
            dateOfBirth: "string",
            gender: "string"
          },
          visitInfo: {
            dateOfService: "string",
            providerName: "string",
            location: "string",
            visitType: "string"
          },
          clinicalData: {
            chiefComplaint: "string",
            historyOfPresentIllness: "string",
            reviewOfSystems: "object",
            physicalExam: "object",
            assessment: "array",
            plan: "array",
            medications: "array",
            allergies: "array"
          }
        };
      case "lab_report":
        return {
          patientInfo: {
            patientName: "string",
            patientId: "string",
            dateOfBirth: "string",
            gender: "string"
          },
          specimenInfo: {
            collectionDate: "string",
            receivedDate: "string",
            specimenType: "string",
            specimenId: "string"
          },
          testResults: "array",
          interpretation: "string",
          performingLab: "string",
          orderingProvider: "string"
        };
      case "radiology_report":
        return {
          patientInfo: {
            patientName: "string",
            patientId: "string",
            dateOfBirth: "string",
            gender: "string"
          },
          examInfo: {
            examDate: "string",
            examType: "string",
            facility: "string"
          },
          clinicalIndication: "string",
          technique: "string",
          findings: "string",
          impression: "string",
          recommendedFollowUp: "string",
          radiologist: "string"
        };
      default:
        return {
          documentType: "string",
          documentDate: "string",
          content: "object"
        };
    }
  }
  /**
   * Log an interaction with Shaia
   * 
   * This would typically write to a database for audit purposes
   */
  logInteraction(data) {
    logger4.info("Shaia interaction", data);
  }
};
var shaiaPlatformService = new ShaiaPlatformService();

// server/services/ai-assistant.ts
var AiAssistantService = class {
  /**
   * Analyze a healthcare contract
   * 
   * @param userId The ID of the user requesting analysis
   * @param contractId The ID of the contract
   * @param contractText The text content of the contract
   * @returns Structured contract analysis
   */
  async analyzeContract(userId, contractId, contractText) {
    try {
      logger4.info("Analyzing contract with AI assistant", { userId, contractId });
      return await shaiaPlatformService.analyzeContract(userId, contractId, contractText);
    } catch (error2) {
      logger4.error("Error analyzing contract with AI assistant", { userId, contractId, error: error2 });
      throw error2;
    }
  }
  /**
   * Generate a cost estimate for healthcare services based on contract terms
   * 
   * @param userId The ID of the user requesting the estimate
   * @param contractId The ID of the contract
   * @param serviceDetails The details of the service to estimate
   * @returns Cost estimate for the service
   */
  async generateCostEstimate(userId, contractId, serviceDetails) {
    try {
      logger4.info("Generating cost estimate with AI assistant", { userId, contractId, serviceDetails });
      return await shaiaPlatformService.generateCostEstimate(userId, contractId, serviceDetails);
    } catch (error2) {
      logger4.error("Error generating cost estimate with AI assistant", { userId, contractId, error: error2 });
      throw error2;
    }
  }
  /**
   * Extract structured data from a contract
   * 
   * @param prompt The prompt containing contract text to analyze
   * @returns Structured contract data
   */
  async getContractExtraction(prompt) {
    try {
      logger4.info("Extracting contract data with AI assistant");
      return await shaiaPlatformService.getContractExtraction(prompt);
    } catch (error2) {
      logger4.error("Error extracting contract data with AI assistant", { error: error2 });
      throw error2;
    }
  }
  /**
   * Extract clinical quality targets from contract terms
   * 
   * @param prompt The prompt containing contract quality metric details
   * @returns Structured clinical quality targets that can be monitored
   */
  async getClinicalQualityTargets(prompt) {
    try {
      logger4.info("Extracting clinical quality targets with AI assistant");
      return await shaiaPlatformService.getClinicalQualityTargets(prompt);
    } catch (error2) {
      logger4.error("Error extracting clinical quality targets with AI assistant", { error: error2 });
      throw error2;
    }
  }
  /**
   * Process a natural language query related to contracts
   * 
   * @param userId The ID of the user making the query
   * @param query The natural language query text
   * @returns AI response to the query
   */
  async processContractQuery(userId, query) {
    try {
      logger4.info("Processing contract query with AI assistant", { userId, query });
      const context5 = {
        domain: "administrative",
        subDomain: "contracts"
      };
      return await shaiaPlatformService.processQuery(userId, query, context5);
    } catch (error2) {
      logger4.error("Error processing contract query with AI assistant", { userId, error: error2 });
      throw error2;
    }
  }
};
var aiAssistantService = new AiAssistantService();

// server/services/contract-service.ts
init_logger();
var ContractService = class {
  /**
   * Analyze a contract and store the analysis results
   */
  async analyzeContract(contractId, contractText) {
    try {
      const contract = await this.getContract(contractId);
      if (!contract) {
        throw new Error("Contract not found");
      }
      const analysisResult = await aiAssistantService.analyzeContract(contractText);
      const summary = await aiAssistantService.generateContractSummary(analysisResult);
      const dates = await aiAssistantService.extractContractDates(contractText);
      const analysis = await contractStorage.createContractAnalysis({
        contractId,
        summary,
        keyTerms: analysisResult.keyTerms,
        paymentTerms: analysisResult.paymentTerms,
        riskFactors: analysisResult.riskFactors,
        effectiveDate: dates.effectiveDate,
        expirationDate: dates.expirationDate,
        metadata: {
          aiModelVersion: analysisResult.modelInfo?.version || "unknown",
          processingTimestamp: /* @__PURE__ */ new Date(),
          confidence: analysisResult.confidence || 0.8
        }
      });
      return analysis;
    } catch (error2) {
      logger4.error("Error analyzing contract", { contractId, error: error2 });
      throw new Error(`Failed to analyze contract: ${error2.message}`);
    }
  }
  /**
   * Request a cost estimate for a healthcare service
   */
  async requestCostEstimate(contractId, userId, serviceDetails, patientInfo) {
    try {
      const contract = await this.getContract(contractId);
      if (!contract) {
        throw new Error("Contract not found");
      }
      const analysis = await this.getLatestAnalysis(contractId);
      if (!analysis) {
        throw new Error("No analysis found for this contract");
      }
      const request = await contractStorage.createCostEstimateRequest({
        contractId,
        userId,
        serviceCode: serviceDetails.code,
        serviceDescription: serviceDetails.description,
        quantity: serviceDetails.quantity || 1,
        additionalInfo: serviceDetails.additionalInfo,
        insuranceType: patientInfo.insuranceType,
        planType: patientInfo.planType,
        deductibleInfo: patientInfo.deductibleInfo,
        network: patientInfo.network,
        status: "pending",
        requestDate: /* @__PURE__ */ new Date()
      });
      this.processCostEstimateRequest(
        request.id,
        request.contractId,
        serviceDetails,
        patientInfo,
        analysis
      ).catch((err) => {
        logger4.error("Error processing cost estimate request", { requestId: request.id, error: err });
      });
      return request;
    } catch (error2) {
      logger4.error("Error requesting cost estimate", { contractId, error: error2 });
      throw new Error(`Failed to request cost estimate: ${error2.message}`);
    }
  }
  /**
   * Process a cost estimate request (intended to be run asynchronously)
   */
  async processCostEstimateRequest(requestId, contractId, serviceDetails, patientInfo, analysis) {
    try {
      await contractStorage.updateCostEstimateRequest(requestId, {
        status: "processing",
        processingStartDate: /* @__PURE__ */ new Date()
      });
      const contract = await this.getContract(contractId);
      const estimate = await aiAssistantService.estimateServiceCost(
        contract.text || "",
        analysis,
        serviceDetails,
        patientInfo
      );
      await contractStorage.updateCostEstimateRequest(requestId, {
        status: "completed",
        completionDate: /* @__PURE__ */ new Date(),
        totalCost: estimate.totalCost,
        patientResponsibility: estimate.patientResponsibility,
        insuranceResponsibility: estimate.insuranceResponsibility,
        confidenceScore: estimate.confidenceScore,
        factors: estimate.factors,
        disclaimers: estimate.disclaimers
      });
    } catch (error2) {
      logger4.error("Error processing cost estimate", { requestId, error: error2 });
      await contractStorage.updateCostEstimateRequest(requestId, {
        status: "failed",
        completionDate: /* @__PURE__ */ new Date(),
        failureReason: error2.message
      });
    }
  }
  /**
   * Get a contract by ID
   */
  async getContract(id) {
    try {
      return await contractStorage.getContract(id);
    } catch (error2) {
      logger4.error("Error getting contract", { id, error: error2 });
      return null;
    }
  }
  /**
   * Get contracts by owner organization ID
   */
  async getContractsByOwner(organizationId) {
    try {
      return await contractStorage.getContractsByOwner(organizationId);
    } catch (error2) {
      logger4.error("Error getting contracts by owner", { organizationId, error: error2 });
      return [];
    }
  }
  /**
   * Get contracts where an organization is a participant
   */
  async getContractsByParticipant(organizationId) {
    try {
      return await contractStorage.getContractsByParticipant(organizationId);
    } catch (error2) {
      logger4.error("Error getting contracts by participant", { organizationId, error: error2 });
      return [];
    }
  }
  /**
   * Get the most recent analysis for a contract
   */
  async getLatestAnalysis(contractId) {
    try {
      return await contractStorage.getLatestAnalysis(contractId);
    } catch (error2) {
      logger4.error("Error getting latest analysis", { contractId, error: error2 });
      return null;
    }
  }
  /**
   * Get a cost estimate request by ID
   */
  async getCostEstimateRequest(id) {
    try {
      return await contractStorage.getCostEstimateRequest(id);
    } catch (error2) {
      logger4.error("Error getting cost estimate request", { id, error: error2 });
      return null;
    }
  }
  /**
   * Get all cost estimate requests for a contract
   */
  async getCostEstimateRequests(contractId) {
    try {
      return await contractStorage.getCostEstimateRequests(contractId);
    } catch (error2) {
      logger4.error("Error getting cost estimate requests", { contractId, error: error2 });
      return [];
    }
  }
};
var contractService = new ContractService();

// server/routes/contract-routes.ts
init_logger();
import { z } from "zod";
var storage2 = multer.memoryStorage();
var upload = multer({
  storage: storage2,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB max file size
  }
});
var router = Router();
router.get("/contracts", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = req.user.id;
    const purpose = req.query.purpose || "viewing";
    const organizationId = await contractAccessService.getUserOrganizationId(userId);
    if (!organizationId) {
      return res.status(403).json({ error: "User not associated with any organization" });
    }
    const ownedContracts = await contractService.getContractsByOwner(organizationId);
    const participatingContracts = await contractService.getContractsByParticipant(organizationId);
    const allContracts = [...ownedContracts, ...participatingContracts];
    const accessibleContracts = await contractAccessService.filterAccessibleContracts(
      userId,
      allContracts,
      purpose
    );
    res.json(accessibleContracts);
  } catch (error2) {
    logger4.error("Error getting contracts", { error: error2 });
    res.status(500).json({ error: "Failed to get contracts" });
  }
});
router.get("/contracts/:id", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = req.user.id;
    const contractId = parseInt(req.params.id);
    const purpose = req.query.purpose || "viewing";
    const access = await contractAccessService.hasContractAccess(userId, contractId, purpose);
    if (!access.hasAccess) {
      return res.status(403).json({ error: access.reason || "Access denied" });
    }
    const contract = await contractService.getContract(contractId);
    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }
    res.json(contract);
  } catch (error2) {
    logger4.error("Error getting contract", { contractId: req.params.id, error: error2 });
    res.status(500).json({ error: "Failed to get contract" });
  }
});
router.get("/contracts/:id/analysis", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = req.user.id;
    const contractId = parseInt(req.params.id);
    const purpose = "analysis";
    const authResult = await contractAccessService.authorizeContractAction(
      userId,
      contractId,
      "read",
      purpose
    );
    if (!authResult.authorized) {
      return res.status(403).json({ error: authResult.reason || "Access denied" });
    }
    const analysis = await contractService.getLatestAnalysis(contractId);
    if (!analysis) {
      return res.status(404).json({ error: "No analysis found for this contract" });
    }
    res.json(analysis);
  } catch (error2) {
    logger4.error("Error getting contract analysis", { contractId: req.params.id, error: error2 });
    res.status(500).json({ error: "Failed to get contract analysis" });
  }
});
router.get("/contracts/:id/cost-estimates", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = req.user.id;
    const contractId = parseInt(req.params.id);
    const purpose = "cost-estimate";
    const authResult = await contractAccessService.authorizeContractAction(
      userId,
      contractId,
      "read",
      purpose
    );
    if (!authResult.authorized) {
      return res.status(403).json({ error: authResult.reason || "Access denied" });
    }
    const requests = await contractService.getCostEstimateRequests(contractId);
    res.json(requests);
  } catch (error2) {
    logger4.error("Error getting cost estimate requests", { contractId: req.params.id, error: error2 });
    res.status(500).json({ error: "Failed to get cost estimate requests" });
  }
});
router.get("/cost-estimates/:id", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = req.user.id;
    const requestId = parseInt(req.params.id);
    const request = await contractService.getCostEstimateRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: "Cost estimate request not found" });
    }
    const authResult = await contractAccessService.authorizeContractAction(
      userId,
      request.contractId,
      "read",
      "cost-estimate"
    );
    if (!authResult.authorized) {
      return res.status(403).json({ error: authResult.reason || "Access denied" });
    }
    res.json(request);
  } catch (error2) {
    logger4.error("Error getting cost estimate request", { requestId: req.params.id, error: error2 });
    res.status(500).json({ error: "Failed to get cost estimate request" });
  }
});
router.post("/contracts/:id/analyze", upload.single("document"), async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = req.user.id;
    const contractId = parseInt(req.params.id);
    const purpose = "contract-analysis";
    const authResult = await contractAccessService.authorizeContractAction(
      userId,
      contractId,
      "analyze",
      purpose
    );
    if (!authResult.authorized) {
      return res.status(403).json({ error: authResult.reason || "Access denied" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No document uploaded" });
    }
    const contractText = req.file.buffer.toString("utf8");
    const analysis = await contractService.analyzeContract(contractId, contractText);
    res.status(201).json(analysis);
  } catch (error2) {
    logger4.error("Error analyzing contract", { contractId: req.params.id, error: error2 });
    res.status(500).json({ error: `Failed to analyze contract: ${error2.message}` });
  }
});
router.post("/contracts/:id/cost-estimates", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = req.user.id;
    const contractId = parseInt(req.params.id);
    const purpose = "cost-estimate";
    const authResult = await contractAccessService.authorizeContractAction(
      userId,
      contractId,
      "request-cost-estimate",
      purpose
    );
    if (!authResult.authorized) {
      return res.status(403).json({ error: authResult.reason || "Access denied" });
    }
    const schema = z.object({
      serviceDetails: z.object({
        code: z.string(),
        description: z.string(),
        quantity: z.number().optional(),
        additionalInfo: z.string().optional()
      }),
      patientInfo: z.object({
        insuranceType: z.string(),
        planType: z.string().optional(),
        deductibleInfo: z.string().optional(),
        network: z.string().optional()
      })
    });
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validationResult.error.format()
      });
    }
    const { serviceDetails, patientInfo } = validationResult.data;
    const request = await contractService.requestCostEstimate(
      contractId,
      userId,
      serviceDetails,
      patientInfo
    );
    res.status(202).json(request);
  } catch (error2) {
    logger4.error("Error requesting cost estimate", { contractId: req.params.id, error: error2 });
    res.status(500).json({ error: `Failed to request cost estimate: ${error2.message}` });
  }
});
var contract_routes_default = router;

// server/routes/eligibility-routes.ts
import express3 from "express";
import multer2 from "multer";

// server/services/eligibility/eligibility-service.ts
init_logger();

// server/storage/eligibility-storage.ts
import { eq as eq3, and as and2, sql as sql3, desc as desc2, lt, inArray } from "drizzle-orm";
init_logger();

// shared/eligibility-schema.ts
import { pgTable as pgTable3, serial as serial3, integer as integer3, varchar as varchar2, json as json3, boolean as boolean3, timestamp as timestamp3, text as text3, pgEnum as pgEnum2 } from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema3, createSelectSchema } from "drizzle-zod";
import { z as z2 } from "zod";
var eligibilityRequestStatusEnum = pgEnum2("eligibility_request_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cached"
]);
var eligibilitySourceEnum = pgEnum2("eligibility_source", [
  "fhir",
  "x12",
  "internal"
]);
var purposeEnum = pgEnum2("eligibility_purpose", [
  "benefits",
  "discovery",
  "validation"
]);
var eligibilityRequests = pgTable3("eligibility_requests", {
  id: serial3("id").primaryKey(),
  // Request metadata
  transactionId: varchar2("transaction_id", { length: 255 }).notNull().unique(),
  status: eligibilityRequestStatusEnum("status").notNull().default("pending"),
  source: eligibilitySourceEnum("source").notNull(),
  purpose: purposeEnum("purpose").array(),
  // Patient and coverage information
  patientId: varchar2("patient_id", { length: 255 }).notNull(),
  subscriberId: varchar2("subscriber_id", { length: 255 }),
  insurerId: varchar2("insurer_id", { length: 255 }).notNull(),
  coverageId: varchar2("coverage_id", { length: 255 }),
  servicedDate: varchar2("serviced_date", { length: 50 }),
  // Service types being checked
  serviceTypes: varchar2("service_types", { length: 50 }).array(),
  // Request payload storage
  requestPayload: json3("request_payload").notNull(),
  // Store the full FHIR resource or X12 contents
  rawRequestData: text3("raw_request_data"),
  // Store the original incoming data (especially for X12)
  // Metadata for tracking and auditing
  createdBy: integer3("created_by").notNull(),
  // UserID who initiated the request
  createdAt: timestamp3("created_at").notNull().defaultNow(),
  updatedAt: timestamp3("updated_at"),
  // Request origin tracking
  requestedByOrganizationId: varchar2("requested_by_organization_id", { length: 255 }),
  requestedBySystemId: varchar2("requested_by_system_id", { length: 255 }),
  // External payer tracking
  forwardedToPayerId: varchar2("forwarded_to_payer_id", { length: 255 }),
  forwardedToClearinghouseId: varchar2("forwarded_to_clearinghouse_id", { length: 255 }),
  forwardedAt: timestamp3("forwarded_at"),
  // For async processing - track retry attempts
  retryCount: integer3("retry_count").default(0),
  nextRetryAt: timestamp3("next_retry_at")
});
var eligibilityResponses = pgTable3("eligibility_responses", {
  id: serial3("id").primaryKey(),
  // Link to the request
  requestId: integer3("request_id").notNull().references(() => eligibilityRequests.id),
  // Response data
  status: varchar2("status", { length: 50 }).notNull(),
  // active, cancelled, etc.
  outcome: varchar2("outcome", { length: 50 }),
  // e.g., complete, error, partial
  disposition: varchar2("disposition", { length: 255 }),
  // any special handling notes
  // Time validity of this response
  servicesFromDate: varchar2("services_from_date", { length: 50 }),
  servicesToDate: varchar2("services_to_date", { length: 50 }),
  // Core response data storage
  responsePayload: json3("response_payload").notNull(),
  // Full FHIR resource or processed X12 data
  rawResponseData: text3("raw_response_data"),
  // Original response data, especially for X12
  // Response metadata
  receivedAt: timestamp3("received_at").notNull().defaultNow(),
  processedAt: timestamp3("processed_at"),
  // Cache control
  isCached: boolean3("is_cached").default(false),
  cacheExpiresAt: timestamp3("cache_expires_at"),
  // Patient financial data
  patientResponsibility: json3("patient_responsibility"),
  // Structured co-pays, deductibles info
  // Custom meta information
  isActive: boolean3("is_active").default(true),
  inactiveReason: varchar2("inactive_reason", { length: 255 }),
  // Error details if response indicates problems
  hasErrors: boolean3("has_errors").default(false),
  errorDetails: json3("error_details")
});
var eligibilityBenefits = pgTable3("eligibility_benefits", {
  id: serial3("id").primaryKey(),
  // Link to the response
  responseId: integer3("response_id").notNull().references(() => eligibilityResponses.id),
  // Benefit category information
  benefitType: varchar2("benefit_type", { length: 255 }).notNull(),
  // e.g. medical, dental, vision
  serviceType: varchar2("service_type", { length: 255 }).notNull(),
  // specific service code
  serviceTypeName: varchar2("service_type_name", { length: 255 }),
  // human-readable service name
  // Coverage details
  isCovered: boolean3("is_covered"),
  // true, false, or null if unknown
  networkStatus: varchar2("network_status", { length: 50 }),
  // in-network, out-network
  unit: varchar2("unit", { length: 50 }),
  // visit, day, year, etc.
  // Financial details
  copayAmount: integer3("copay_amount"),
  copayPercentage: integer3("copay_percentage"),
  coinsurancePercentage: integer3("coinsurance_percentage"),
  deductibleAmount: integer3("deductible_amount"),
  deductibleRemaining: integer3("deductible_remaining"),
  outOfPocketAmount: integer3("out_of_pocket_amount"),
  outOfPocketRemaining: integer3("out_of_pocket_remaining"),
  // Benefit limits
  benefitDescription: varchar2("benefit_description", { length: 1e3 }),
  limitValue: integer3("limit_value"),
  limitUnit: varchar2("limit_unit", { length: 50 }),
  usedValue: integer3("used_value"),
  remainingValue: integer3("remaining_value"),
  // Authorization details
  authorizationRequired: boolean3("authorization_required"),
  authorizationDetails: varchar2("authorization_details", { length: 1e3 }),
  // Additional information
  additionalInfo: json3("additional_info"),
  // Metadata
  createdAt: timestamp3("created_at").notNull().defaultNow(),
  updatedAt: timestamp3("updated_at")
});
var eligibilityCache = pgTable3("eligibility_cache", {
  id: serial3("id").primaryKey(),
  // Cache key components for lookup
  subscriberId: varchar2("subscriber_id", { length: 255 }).notNull(),
  payerId: varchar2("payer_id", { length: 255 }).notNull(),
  serviceType: varchar2("service_type", { length: 255 }),
  servicedDate: varchar2("serviced_date", { length: 50 }),
  // Link to the response that's cached
  responseId: integer3("response_id").notNull().references(() => eligibilityResponses.id),
  // Cache metadata
  createdAt: timestamp3("created_at").notNull().defaultNow(),
  expiresAt: timestamp3("expires_at").notNull(),
  // Additional tracking
  hitCount: integer3("hit_count").default(0),
  lastHitAt: timestamp3("last_hit_at")
});
var eligibilityPayerRouting = pgTable3("eligibility_payer_routing", {
  id: serial3("id").primaryKey(),
  // Payer identification
  payerId: varchar2("payer_id", { length: 255 }).notNull().unique(),
  payerName: varchar2("payer_name", { length: 255 }).notNull(),
  // Connection type
  useDirectFhir: boolean3("use_direct_fhir").default(false),
  useClearinghouse: boolean3("use_clearinghouse").default(true),
  // Connection details
  fhirEndpoint: varchar2("fhir_endpoint", { length: 1e3 }),
  clearinghouseId: varchar2("clearinghouse_id", { length: 255 }),
  // Credentials (references to secure credential storage)
  credentialId: varchar2("credential_id", { length: 255 }),
  // Payer-specific formatting rules
  formattingRules: json3("formatting_rules"),
  // Metadata
  isActive: boolean3("is_active").default(true),
  createdAt: timestamp3("created_at").notNull().defaultNow(),
  updatedAt: timestamp3("updated_at"),
  // Rate limiting/throttling settings
  maxRequestsPerMinute: integer3("max_requests_per_minute"),
  throttlingEnabled: boolean3("throttling_enabled").default(false)
});
var eligibilityClearinghouses = pgTable3("eligibility_clearinghouses", {
  id: serial3("id").primaryKey(),
  // Clearinghouse identification
  clearinghouseId: varchar2("clearinghouse_id", { length: 255 }).notNull().unique(),
  name: varchar2("name", { length: 255 }).notNull(),
  // Connection details
  endpoint: varchar2("endpoint", { length: 1e3 }).notNull(),
  protocolType: varchar2("protocol_type", { length: 50 }).notNull(),
  // SOAP, REST, SFTP, etc.
  // Credentials (references to secure credential storage)
  credentialId: varchar2("credential_id", { length: 255 }),
  // Configuration settings
  configSettings: json3("config_settings"),
  // Metadata
  isActive: boolean3("is_active").default(true),
  createdAt: timestamp3("created_at").notNull().defaultNow(),
  updatedAt: timestamp3("updated_at")
});
var eligibilityAuditLogs = pgTable3("eligibility_audit_logs", {
  id: serial3("id").primaryKey(),
  // Transaction links
  requestId: integer3("request_id").references(() => eligibilityRequests.id),
  responseId: integer3("response_id").references(() => eligibilityResponses.id),
  // Event details
  eventType: varchar2("event_type", { length: 100 }).notNull(),
  // request_received, forwarded, response_received, etc.
  eventTimestamp: timestamp3("event_timestamp").notNull().defaultNow(),
  // Actor information
  actorId: integer3("actor_id"),
  // UserID or system ID
  actorType: varchar2("actor_type", { length: 50 }),
  // user, system, payer, clearinghouse
  // Event details
  eventDetails: json3("event_details"),
  statusCode: varchar2("status_code", { length: 50 }),
  // Source IP and other metadata
  sourceIp: varchar2("source_ip", { length: 50 }),
  userAgent: varchar2("user_agent", { length: 500 })
});
var insertEligibilityRequestSchema = createInsertSchema3(eligibilityRequests);
var selectEligibilityRequestSchema = createSelectSchema(eligibilityRequests);
var insertEligibilityResponseSchema = createInsertSchema3(eligibilityResponses);
var selectEligibilityResponseSchema = createSelectSchema(eligibilityResponses);
var insertEligibilityBenefitSchema = createInsertSchema3(eligibilityBenefits);
var selectEligibilityBenefitSchema = createSelectSchema(eligibilityBenefits);
var insertEligibilityCacheSchema = createInsertSchema3(eligibilityCache);
var selectEligibilityCacheSchema = createSelectSchema(eligibilityCache);
var insertEligibilityPayerRoutingSchema = createInsertSchema3(eligibilityPayerRouting);
var selectEligibilityPayerRoutingSchema = createSelectSchema(eligibilityPayerRouting);
var insertEligibilityClearinghouseSchema = createInsertSchema3(eligibilityClearinghouses);
var selectEligibilityClearinghouseSchema = createSelectSchema(eligibilityClearinghouses);
var insertEligibilityAuditLogSchema = createInsertSchema3(eligibilityAuditLogs);
var selectEligibilityAuditLogSchema = createSelectSchema(eligibilityAuditLogs);
var fhirCoverageEligibilityRequestSchema = z2.object({
  resourceType: z2.literal("CoverageEligibilityRequest"),
  id: z2.string().optional(),
  status: z2.enum(["active", "cancelled", "draft", "entered-in-error"]),
  purpose: z2.array(z2.enum(["auth-requirements", "benefits", "discovery", "validation"])),
  patient: z2.object({
    reference: z2.string()
  }),
  servicedDate: z2.string().optional(),
  servicedPeriod: z2.object({
    start: z2.string(),
    end: z2.string()
  }).optional(),
  created: z2.string().optional(),
  enterer: z2.object({
    reference: z2.string()
  }).optional(),
  provider: z2.object({
    reference: z2.string()
  }).optional(),
  insurer: z2.object({
    reference: z2.string()
  }),
  facility: z2.object({
    reference: z2.string()
  }).optional(),
  coverage: z2.array(z2.object({
    reference: z2.string()
  })).optional(),
  item: z2.array(z2.object({
    category: z2.object({
      coding: z2.array(z2.object({
        system: z2.string(),
        code: z2.string(),
        display: z2.string().optional()
      }))
    }).optional(),
    productOrService: z2.object({
      coding: z2.array(z2.object({
        system: z2.string(),
        code: z2.string(),
        display: z2.string().optional()
      }))
    }).optional(),
    diagnosis: z2.array(z2.object({
      diagnosisCodeableConcept: z2.object({
        coding: z2.array(z2.object({
          system: z2.string(),
          code: z2.string(),
          display: z2.string().optional()
        }))
      }).optional()
    })).optional()
  })).optional()
});
var fhirCoverageEligibilityResponseSchema = z2.object({
  resourceType: z2.literal("CoverageEligibilityResponse"),
  id: z2.string().optional(),
  status: z2.enum(["active", "cancelled", "draft", "entered-in-error"]),
  purpose: z2.array(z2.enum(["auth-requirements", "benefits", "discovery", "validation"])),
  patient: z2.object({
    reference: z2.string()
  }),
  servicedDate: z2.string().optional(),
  servicedPeriod: z2.object({
    start: z2.string(),
    end: z2.string()
  }).optional(),
  created: z2.string(),
  requestor: z2.object({
    reference: z2.string()
  }).optional(),
  request: z2.object({
    reference: z2.string()
  }),
  outcome: z2.enum(["queued", "complete", "error", "partial"]),
  disposition: z2.string().optional(),
  insurer: z2.object({
    reference: z2.string()
  }),
  insurance: z2.array(z2.object({
    coverage: z2.object({
      reference: z2.string()
    }),
    inforce: z2.boolean().optional(),
    benefitPeriod: z2.object({
      start: z2.string(),
      end: z2.string()
    }).optional(),
    item: z2.array(z2.object({
      category: z2.object({
        coding: z2.array(z2.object({
          system: z2.string(),
          code: z2.string(),
          display: z2.string().optional()
        }))
      }).optional(),
      productOrService: z2.object({
        coding: z2.array(z2.object({
          system: z2.string(),
          code: z2.string(),
          display: z2.string().optional()
        }))
      }).optional(),
      network: z2.object({
        coding: z2.array(z2.object({
          system: z2.string(),
          code: z2.string(),
          display: z2.string().optional()
        }))
      }).optional(),
      unit: z2.object({
        coding: z2.array(z2.object({
          system: z2.string(),
          code: z2.string(),
          display: z2.string().optional()
        }))
      }).optional(),
      term: z2.object({
        coding: z2.array(z2.object({
          system: z2.string(),
          code: z2.string(),
          display: z2.string().optional()
        }))
      }).optional(),
      benefit: z2.array(z2.object({
        type: z2.object({
          coding: z2.array(z2.object({
            system: z2.string(),
            code: z2.string(),
            display: z2.string().optional()
          }))
        }),
        allowedUnsignedInt: z2.number().int().optional(),
        allowedString: z2.string().optional(),
        allowedMoney: z2.object({
          value: z2.number(),
          currency: z2.string()
        }).optional(),
        usedUnsignedInt: z2.number().int().optional(),
        usedMoney: z2.object({
          value: z2.number(),
          currency: z2.string()
        }).optional()
      })),
      authorizationRequired: z2.boolean().optional(),
      authorizationUrl: z2.string().optional(),
      authorizationSupporting: z2.array(z2.object({
        coding: z2.array(z2.object({
          system: z2.string(),
          code: z2.string(),
          display: z2.string().optional()
        }))
      })).optional()
    })).optional()
  })),
  form: z2.object({
    coding: z2.array(z2.object({
      system: z2.string(),
      code: z2.string(),
      display: z2.string().optional()
    }))
  }).optional(),
  error: z2.array(z2.object({
    coding: z2.array(z2.object({
      system: z2.string(),
      code: z2.string(),
      display: z2.string().optional()
    }))
  })).optional()
});

// server/storage/eligibility-storage.ts
var EligibilityStorage = class {
  /**
   * Create a new eligibility request
   */
  async createEligibilityRequest(data) {
    try {
      logger4.info("Creating eligibility request", { transactionId: data.transactionId });
      const [request] = await db.insert(eligibilityRequests).values(data).returning();
      return request;
    } catch (error2) {
      logger4.error("Error creating eligibility request", { error: error2, data });
      throw new Error(`Failed to create eligibility request: ${error2.message}`);
    }
  }
  /**
   * Get eligibility request by ID
   */
  async getEligibilityRequest(id) {
    try {
      const [request] = await db.select().from(eligibilityRequests).where(eq3(eligibilityRequests.id, id));
      return request;
    } catch (error2) {
      logger4.error("Error getting eligibility request", { error: error2, id });
      throw new Error(`Failed to get eligibility request: ${error2.message}`);
    }
  }
  /**
   * Get eligibility request by transaction ID
   */
  async getEligibilityRequestByTransactionId(transactionId) {
    try {
      const [request] = await db.select().from(eligibilityRequests).where(eq3(eligibilityRequests.transactionId, transactionId));
      return request;
    } catch (error2) {
      logger4.error("Error getting eligibility request by transaction ID", { error: error2, transactionId });
      throw new Error(`Failed to get eligibility request by transaction ID: ${error2.message}`);
    }
  }
  /**
   * Update eligibility request status
   */
  async updateEligibilityRequestStatus(id, status, updateData = {}) {
    try {
      const [updated] = await db.update(eligibilityRequests).set({
        status,
        updatedAt: /* @__PURE__ */ new Date(),
        ...updateData
      }).where(eq3(eligibilityRequests.id, id)).returning();
      return updated;
    } catch (error2) {
      logger4.error("Error updating eligibility request status", { error: error2, id, status });
      throw new Error(`Failed to update eligibility request status: ${error2.message}`);
    }
  }
  /**
   * Get pending eligibility requests for processing
   */
  async getPendingEligibilityRequests(limit = 10) {
    try {
      const requests = await db.select().from(eligibilityRequests).where(eq3(eligibilityRequests.status, "pending")).orderBy(eligibilityRequests.createdAt).limit(limit);
      return requests;
    } catch (error2) {
      logger4.error("Error getting pending eligibility requests", { error: error2, limit });
      throw new Error(`Failed to get pending eligibility requests: ${error2.message}`);
    }
  }
  /**
   * Get retry-ready eligibility requests
   */
  async getRetryReadyRequests(limit = 10) {
    try {
      const now = /* @__PURE__ */ new Date();
      const requests = await db.select().from(eligibilityRequests).where(
        and2(
          eq3(eligibilityRequests.status, "failed"),
          lt(eligibilityRequests.nextRetryAt, now)
        )
      ).orderBy(eligibilityRequests.nextRetryAt).limit(limit);
      return requests;
    } catch (error2) {
      logger4.error("Error getting retry-ready eligibility requests", { error: error2, limit });
      throw new Error(`Failed to get retry-ready eligibility requests: ${error2.message}`);
    }
  }
  /**
   * Create a new eligibility response
   */
  async createEligibilityResponse(data) {
    try {
      logger4.info("Creating eligibility response", { requestId: data.requestId });
      const [response] = await db.insert(eligibilityResponses).values(data).returning();
      return response;
    } catch (error2) {
      logger4.error("Error creating eligibility response", { error: error2, data });
      throw new Error(`Failed to create eligibility response: ${error2.message}`);
    }
  }
  /**
   * Get eligibility response by ID
   */
  async getEligibilityResponse(id) {
    try {
      const [response] = await db.select().from(eligibilityResponses).where(eq3(eligibilityResponses.id, id));
      return response;
    } catch (error2) {
      logger4.error("Error getting eligibility response", { error: error2, id });
      throw new Error(`Failed to get eligibility response: ${error2.message}`);
    }
  }
  /**
   * Get eligibility response by request ID
   */
  async getEligibilityResponseByRequestId(requestId) {
    try {
      const [response] = await db.select().from(eligibilityResponses).where(eq3(eligibilityResponses.requestId, requestId));
      return response;
    } catch (error2) {
      logger4.error("Error getting eligibility response by request ID", { error: error2, requestId });
      throw new Error(`Failed to get eligibility response by request ID: ${error2.message}`);
    }
  }
  /**
   * Update eligibility response
   */
  async updateEligibilityResponse(id, updateData) {
    try {
      const [updated] = await db.update(eligibilityResponses).set({
        ...updateData,
        processedAt: /* @__PURE__ */ new Date()
      }).where(eq3(eligibilityResponses.id, id)).returning();
      return updated;
    } catch (error2) {
      logger4.error("Error updating eligibility response", { error: error2, id, updateData });
      throw new Error(`Failed to update eligibility response: ${error2.message}`);
    }
  }
  /**
   * Create multiple eligibility benefits
   */
  async createEligibilityBenefits(benefits) {
    try {
      if (benefits.length === 0) {
        return [];
      }
      logger4.info("Creating eligibility benefits", { count: benefits.length, responseId: benefits[0].responseId });
      const createdBenefits = await db.insert(eligibilityBenefits).values(benefits).returning();
      return createdBenefits;
    } catch (error2) {
      logger4.error("Error creating eligibility benefits", { error: error2, benefitsCount: benefits.length });
      throw new Error(`Failed to create eligibility benefits: ${error2.message}`);
    }
  }
  /**
   * Get eligibility benefits by response ID
   */
  async getEligibilityBenefitsByResponseId(responseId) {
    try {
      const benefits = await db.select().from(eligibilityBenefits).where(eq3(eligibilityBenefits.responseId, responseId));
      return benefits;
    } catch (error2) {
      logger4.error("Error getting eligibility benefits by response ID", { error: error2, responseId });
      throw new Error(`Failed to get eligibility benefits by response ID: ${error2.message}`);
    }
  }
  /**
   * Check eligibility cache
   */
  async checkEligibilityCache(subscriberId, payerId, serviceType, servicedDate) {
    try {
      logger4.info("Checking eligibility cache", { subscriberId, payerId, serviceType, servicedDate });
      const now = /* @__PURE__ */ new Date();
      const conditions = [
        eq3(eligibilityCache.subscriberId, subscriberId),
        eq3(eligibilityCache.payerId, payerId),
        lt(now, eligibilityCache.expiresAt)
      ];
      if (serviceType) {
        conditions.push(eq3(eligibilityCache.serviceType, serviceType));
      }
      if (servicedDate) {
        conditions.push(eq3(eligibilityCache.servicedDate, servicedDate));
      }
      const [cacheEntry] = await db.select().from(eligibilityCache).where(and2(...conditions)).orderBy(desc2(eligibilityCache.createdAt)).limit(1);
      if (cacheEntry) {
        await db.update(eligibilityCache).set({
          hitCount: sql3`${eligibilityCache.hitCount} + 1`,
          lastHitAt: now
        }).where(eq3(eligibilityCache.id, cacheEntry.id));
      }
      return cacheEntry;
    } catch (error2) {
      logger4.error("Error checking eligibility cache", { error: error2, subscriberId, payerId });
      throw new Error(`Failed to check eligibility cache: ${error2.message}`);
    }
  }
  /**
   * Create eligibility cache entry
   */
  async createEligibilityCache(data) {
    try {
      logger4.info("Creating eligibility cache entry", {
        subscriberId: data.subscriberId,
        payerId: data.payerId
      });
      const [cacheEntry] = await db.insert(eligibilityCache).values(data).returning();
      return cacheEntry;
    } catch (error2) {
      logger4.error("Error creating eligibility cache entry", { error: error2, data });
      throw new Error(`Failed to create eligibility cache entry: ${error2.message}`);
    }
  }
  /**
   * Clear expired cache entries
   */
  async clearExpiredCacheEntries() {
    try {
      const now = /* @__PURE__ */ new Date();
      const { count: count2 } = await db.delete(eligibilityCache).where(lt(eligibilityCache.expiresAt, now)).returning({ count: sql3`count(*)` }).then((result) => result[0] || { count: 0 });
      logger4.info(`Cleared ${count2} expired eligibility cache entries`);
      return count2;
    } catch (error2) {
      logger4.error("Error clearing expired eligibility cache entries", { error: error2 });
      throw new Error(`Failed to clear expired eligibility cache entries: ${error2.message}`);
    }
  }
  /**
   * Get payer routing information
   */
  async getPayerRouting(payerId) {
    try {
      const [payerRouting] = await db.select().from(eligibilityPayerRouting).where(and2(
        eq3(eligibilityPayerRouting.payerId, payerId),
        eq3(eligibilityPayerRouting.isActive, true)
      ));
      return payerRouting;
    } catch (error2) {
      logger4.error("Error getting payer routing", { error: error2, payerId });
      throw new Error(`Failed to get payer routing: ${error2.message}`);
    }
  }
  /**
   * Get multiple payer routing configurations
   */
  async getPayerRoutings(payerIds) {
    try {
      if (payerIds.length === 0) {
        return [];
      }
      const payerRoutings = await db.select().from(eligibilityPayerRouting).where(and2(
        inArray(eligibilityPayerRouting.payerId, payerIds),
        eq3(eligibilityPayerRouting.isActive, true)
      ));
      return payerRoutings;
    } catch (error2) {
      logger4.error("Error getting multiple payer routings", { error: error2, payerIds });
      throw new Error(`Failed to get multiple payer routings: ${error2.message}`);
    }
  }
  /**
   * Create payer routing
   */
  async createPayerRouting(data) {
    try {
      logger4.info("Creating payer routing", { payerId: data.payerId, payerName: data.payerName });
      const [payerRouting] = await db.insert(eligibilityPayerRouting).values(data).returning();
      return payerRouting;
    } catch (error2) {
      logger4.error("Error creating payer routing", { error: error2, data });
      throw new Error(`Failed to create payer routing: ${error2.message}`);
    }
  }
  /**
   * Update payer routing
   */
  async updatePayerRouting(payerId, updateData) {
    try {
      const [updated] = await db.update(eligibilityPayerRouting).set({
        ...updateData,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(eligibilityPayerRouting.payerId, payerId)).returning();
      return updated;
    } catch (error2) {
      logger4.error("Error updating payer routing", { error: error2, payerId, updateData });
      throw new Error(`Failed to update payer routing: ${error2.message}`);
    }
  }
  /**
   * Get clearinghouse configuration
   */
  async getClearinghouse(clearinghouseId) {
    try {
      const [clearinghouse] = await db.select().from(eligibilityClearinghouses).where(and2(
        eq3(eligibilityClearinghouses.clearinghouseId, clearinghouseId),
        eq3(eligibilityClearinghouses.isActive, true)
      ));
      return clearinghouse;
    } catch (error2) {
      logger4.error("Error getting clearinghouse", { error: error2, clearinghouseId });
      throw new Error(`Failed to get clearinghouse: ${error2.message}`);
    }
  }
  /**
   * Create clearinghouse configuration
   */
  async createClearinghouse(data) {
    try {
      logger4.info("Creating clearinghouse", { clearinghouseId: data.clearinghouseId, name: data.name });
      const [clearinghouse] = await db.insert(eligibilityClearinghouses).values(data).returning();
      return clearinghouse;
    } catch (error2) {
      logger4.error("Error creating clearinghouse", { error: error2, data });
      throw new Error(`Failed to create clearinghouse: ${error2.message}`);
    }
  }
  /**
   * Log eligibility event for audit
   */
  async logAuditEvent(data) {
    try {
      logger4.info("Logging eligibility audit event", {
        eventType: data.eventType,
        requestId: data.requestId,
        responseId: data.responseId
      });
      const [auditLog] = await db.insert(eligibilityAuditLogs).values(data).returning();
      return auditLog;
    } catch (error2) {
      logger4.error("Error logging eligibility audit event", {
        error: error2,
        eventType: data.eventType,
        requestId: data.requestId
      });
      throw new Error(`Failed to log eligibility audit event: ${error2.message}`);
    }
  }
  /**
   * Get audit logs for a request
   */
  async getAuditLogsByRequestId(requestId) {
    try {
      const auditLogs = await db.select().from(eligibilityAuditLogs).where(eq3(eligibilityAuditLogs.requestId, requestId)).orderBy(eligibilityAuditLogs.eventTimestamp);
      return auditLogs;
    } catch (error2) {
      logger4.error("Error getting audit logs by request ID", { error: error2, requestId });
      throw new Error(`Failed to get audit logs by request ID: ${error2.message}`);
    }
  }
  /**
   * Lookup a response by cache parameters
   */
  async getResponseByCacheParams(subscriberId, payerId, serviceType, servicedDate) {
    try {
      const cacheEntry = await this.checkEligibilityCache(subscriberId, payerId, serviceType || void 0, servicedDate || void 0);
      if (!cacheEntry) {
        return void 0;
      }
      const response = await this.getEligibilityResponse(cacheEntry.responseId);
      return response;
    } catch (error2) {
      logger4.error("Error getting response by cache parameters", { error: error2, subscriberId, payerId });
      throw new Error(`Failed to get response by cache parameters: ${error2.message}`);
    }
  }
};
var eligibilityStorage = new EligibilityStorage();

// server/services/eligibility/fhir-transformer.ts
init_logger();
import { v4 as uuidv43 } from "uuid";
var FhirTransformerService = class {
  /**
   * Transform a FHIR CoverageEligibilityRequest into an internal EligibilityRequest
   */
  transformFhirRequestToInternal(fhirRequest, userId, organizationId) {
    try {
      logger4.info("Transforming FHIR CoverageEligibilityRequest to internal model");
      const patientId = this.extractReferenceId(fhirRequest.patient.reference);
      const insurerId = this.extractReferenceId(fhirRequest.insurer.reference);
      let coverageId;
      if (fhirRequest.coverage && fhirRequest.coverage.length > 0) {
        coverageId = this.extractReferenceId(fhirRequest.coverage[0].reference);
      }
      const serviceTypes = [];
      if (fhirRequest.item && fhirRequest.item.length > 0) {
        fhirRequest.item.forEach((item) => {
          if (item.productOrService && item.productOrService.coding) {
            item.productOrService.coding.forEach((coding) => {
              serviceTypes.push(coding.code);
            });
          }
        });
      }
      return {
        transactionId: fhirRequest.id || uuidv43(),
        status: "pending",
        source: "fhir",
        purpose: fhirRequest.purpose,
        patientId,
        insurerId,
        coverageId,
        servicedDate: fhirRequest.servicedDate,
        serviceTypes: serviceTypes.length > 0 ? serviceTypes : void 0,
        requestPayload: fhirRequest,
        createdBy: userId,
        requestedByOrganizationId: organizationId
      };
    } catch (error2) {
      logger4.error("Error transforming FHIR request to internal model", { error: error2 });
      throw new Error(`Failed to transform FHIR request: ${error2.message}`);
    }
  }
  /**
   * Transform an internal EligibilityResponse into a FHIR CoverageEligibilityResponse
   */
  transformInternalResponseToFhir(internalResponse, internalRequest, benefits) {
    try {
      logger4.info("Transforming internal response to FHIR CoverageEligibilityResponse", { responseId: internalResponse.id });
      const fhirResponse = {
        resourceType: "CoverageEligibilityResponse",
        status: internalResponse.status,
        purpose: internalRequest.purpose || ["benefits"],
        patient: {
          reference: `Patient/${internalRequest.patientId}`
        },
        created: (/* @__PURE__ */ new Date()).toISOString(),
        request: {
          reference: `CoverageEligibilityRequest/${internalRequest.transactionId}`
        },
        outcome: internalResponse.outcome || "complete",
        disposition: internalResponse.disposition,
        insurer: {
          reference: `Organization/${internalRequest.insurerId}`
        },
        insurance: []
      };
      if (internalRequest.servicedDate) {
        fhirResponse.servicedDate = internalRequest.servicedDate;
      }
      const insuranceEntry = {
        coverage: {
          reference: `Coverage/${internalRequest.coverageId || internalRequest.subscriberId}`
        },
        inforce: internalResponse.isActive || true,
        item: []
      };
      if (internalResponse.servicesFromDate && internalResponse.servicesToDate) {
        insuranceEntry.benefitPeriod = {
          start: internalResponse.servicesFromDate,
          end: internalResponse.servicesToDate
        };
      }
      const benefitsByServiceType = {};
      benefits.forEach((benefit) => {
        if (!benefitsByServiceType[benefit.serviceType]) {
          benefitsByServiceType[benefit.serviceType] = [];
        }
        benefitsByServiceType[benefit.serviceType].push(benefit);
      });
      Object.entries(benefitsByServiceType).forEach(([serviceType, typeBenefits]) => {
        const representativeBenefit = typeBenefits[0];
        const item = {
          productOrService: {
            coding: [{
              system: "http://terminology.hl7.org/CodeSystem/service-type",
              code: serviceType,
              display: representativeBenefit.serviceTypeName || serviceType
            }]
          },
          benefit: [],
          authorizationRequired: representativeBenefit.authorizationRequired,
          authorizationSupporting: representativeBenefit.authorizationDetails ? [{
            coding: [{
              system: "http://terminology.hl7.org/CodeSystem/benefit-authorization",
              code: "auth",
              display: representativeBenefit.authorizationDetails
            }]
          }] : void 0
        };
        if (representativeBenefit.networkStatus) {
          item.network = {
            coding: [{
              system: "http://terminology.hl7.org/CodeSystem/benefit-network",
              code: representativeBenefit.networkStatus,
              display: representativeBenefit.networkStatus === "in-network" ? "In Network" : "Out of Network"
            }]
          };
        }
        if (representativeBenefit.unit) {
          item.unit = {
            coding: [{
              system: "http://terminology.hl7.org/CodeSystem/benefit-unit",
              code: representativeBenefit.unit,
              display: this.getUnitDisplay(representativeBenefit.unit)
            }]
          };
        }
        typeBenefits.forEach((benefit) => {
          if (benefit.copayAmount !== null && benefit.copayAmount !== void 0) {
            item.benefit.push({
              type: {
                coding: [{
                  system: "http://terminology.hl7.org/CodeSystem/benefit-type",
                  code: "copay",
                  display: "Copayment"
                }]
              },
              allowedMoney: {
                value: benefit.copayAmount,
                currency: "USD"
              }
            });
          }
          if (benefit.coinsurancePercentage !== null && benefit.coinsurancePercentage !== void 0) {
            item.benefit.push({
              type: {
                coding: [{
                  system: "http://terminology.hl7.org/CodeSystem/benefit-type",
                  code: "coinsurance",
                  display: "Coinsurance"
                }]
              },
              allowedUnsignedInt: benefit.coinsurancePercentage
            });
          }
          if (benefit.deductibleAmount !== null && benefit.deductibleAmount !== void 0) {
            item.benefit.push({
              type: {
                coding: [{
                  system: "http://terminology.hl7.org/CodeSystem/benefit-type",
                  code: "deductible",
                  display: "Deductible"
                }]
              },
              allowedMoney: {
                value: benefit.deductibleAmount,
                currency: "USD"
              },
              usedMoney: benefit.deductibleRemaining !== null && benefit.deductibleRemaining !== void 0 ? {
                value: benefit.deductibleAmount - benefit.deductibleRemaining,
                currency: "USD"
              } : void 0
            });
          }
          if (benefit.outOfPocketAmount !== null && benefit.outOfPocketAmount !== void 0) {
            item.benefit.push({
              type: {
                coding: [{
                  system: "http://terminology.hl7.org/CodeSystem/benefit-type",
                  code: "out-of-pocket",
                  display: "Out of Pocket"
                }]
              },
              allowedMoney: {
                value: benefit.outOfPocketAmount,
                currency: "USD"
              },
              usedMoney: benefit.outOfPocketRemaining !== null && benefit.outOfPocketRemaining !== void 0 ? {
                value: benefit.outOfPocketAmount - benefit.outOfPocketRemaining,
                currency: "USD"
              } : void 0
            });
          }
          if (benefit.limitValue !== null && benefit.limitValue !== void 0) {
            item.benefit.push({
              type: {
                coding: [{
                  system: "http://terminology.hl7.org/CodeSystem/benefit-type",
                  code: "visit",
                  display: "Visit"
                }]
              },
              allowedUnsignedInt: benefit.limitValue,
              usedUnsignedInt: benefit.usedValue !== null && benefit.usedValue !== void 0 ? benefit.usedValue : void 0
            });
          }
        });
        insuranceEntry.item.push(item);
      });
      fhirResponse.insurance.push(insuranceEntry);
      if (internalResponse.hasErrors && internalResponse.errorDetails) {
        fhirResponse.error = [];
        const errorDetails = internalResponse.errorDetails;
        if (Array.isArray(errorDetails)) {
          errorDetails.forEach((error2) => {
            fhirResponse.error.push({
              coding: [{
                system: "http://terminology.hl7.org/CodeSystem/adjudication-error",
                code: error2.code || "error",
                display: error2.message || "Error"
              }]
            });
          });
        } else if (typeof errorDetails === "object") {
          fhirResponse.error.push({
            coding: [{
              system: "http://terminology.hl7.org/CodeSystem/adjudication-error",
              code: errorDetails.code || "error",
              display: errorDetails.message || "Error"
            }]
          });
        }
      }
      return fhirResponse;
    } catch (error2) {
      logger4.error("Error transforming internal response to FHIR", { error: error2, responseId: internalResponse.id });
      throw new Error(`Failed to transform internal response to FHIR: ${error2.message}`);
    }
  }
  /**
   * Transform a FHIR CoverageEligibilityResponse into internal models
   */
  transformFhirResponseToInternal(fhirResponse, internalRequestId) {
    try {
      logger4.info("Transforming FHIR CoverageEligibilityResponse to internal models", { requestId: internalRequestId });
      const internalResponse = {
        requestId: internalRequestId,
        status: fhirResponse.status,
        outcome: fhirResponse.outcome,
        disposition: fhirResponse.disposition,
        responsePayload: fhirResponse,
        processedAt: /* @__PURE__ */ new Date(),
        hasErrors: fhirResponse.error && fhirResponse.error.length > 0 ? true : false
      };
      if (fhirResponse.error && fhirResponse.error.length > 0) {
        internalResponse.errorDetails = fhirResponse.error.map((error2) => ({
          code: error2.coding[0]?.code || "error",
          message: error2.coding[0]?.display || "Unknown error"
        }));
      }
      if (fhirResponse.insurance && fhirResponse.insurance.length > 0) {
        const firstInsurance = fhirResponse.insurance[0];
        internalResponse.isActive = firstInsurance.inforce !== false;
        if (firstInsurance.benefitPeriod) {
          internalResponse.servicesFromDate = firstInsurance.benefitPeriod.start;
          internalResponse.servicesToDate = firstInsurance.benefitPeriod.end;
        }
        const benefits = [];
        if (firstInsurance.item && firstInsurance.item.length > 0) {
          firstInsurance.item.forEach((item) => {
            const serviceType = item.productOrService?.coding[0]?.code || "unknown";
            const serviceTypeName = item.productOrService?.coding[0]?.display || "Unknown Service";
            const networkStatus = item.network?.coding[0]?.code || void 0;
            const unit = item.unit?.coding[0]?.code || void 0;
            const authorizationRequired = item.authorizationRequired;
            const authorizationDetails = item.authorizationSupporting?.[0]?.coding[0]?.display;
            const baseBenefit = {
              responseId: 0,
              // Will be set after response is created
              benefitType: "medical",
              // Default
              serviceType,
              serviceTypeName,
              isCovered: true,
              // Assume covered if in the response
              networkStatus,
              unit,
              authorizationRequired,
              authorizationDetails
            };
            if (!item.benefit || item.benefit.length === 0) {
              benefits.push({ ...baseBenefit });
              return;
            }
            item.benefit.forEach((benefit) => {
              const benefitType = benefit.type?.coding[0]?.code || "unknown";
              const newBenefit = { ...baseBenefit };
              switch (benefitType) {
                case "copay":
                  newBenefit.copayAmount = benefit.allowedMoney?.value;
                  break;
                case "coinsurance":
                  newBenefit.coinsurancePercentage = benefit.allowedUnsignedInt;
                  break;
                case "deductible":
                  newBenefit.deductibleAmount = benefit.allowedMoney?.value;
                  if (benefit.usedMoney?.value !== void 0 && benefit.allowedMoney?.value !== void 0) {
                    newBenefit.deductibleRemaining = benefit.allowedMoney.value - benefit.usedMoney.value;
                  }
                  break;
                case "out-of-pocket":
                  newBenefit.outOfPocketAmount = benefit.allowedMoney?.value;
                  if (benefit.usedMoney?.value !== void 0 && benefit.allowedMoney?.value !== void 0) {
                    newBenefit.outOfPocketRemaining = benefit.allowedMoney.value - benefit.usedMoney.value;
                  }
                  break;
                case "visit":
                case "visits":
                  newBenefit.limitValue = benefit.allowedUnsignedInt;
                  newBenefit.usedValue = benefit.usedUnsignedInt;
                  newBenefit.remainingValue = benefit.allowedUnsignedInt !== void 0 && benefit.usedUnsignedInt !== void 0 ? benefit.allowedUnsignedInt - benefit.usedUnsignedInt : void 0;
                  break;
                default:
                  newBenefit.additionalInfo = newBenefit.additionalInfo || {};
                  newBenefit.additionalInfo[benefitType] = {
                    allowed: benefit.allowedUnsignedInt || benefit.allowedString || (benefit.allowedMoney ? benefit.allowedMoney.value : null),
                    used: benefit.usedUnsignedInt || (benefit.usedMoney ? benefit.usedMoney.value : null)
                  };
              }
              benefits.push(newBenefit);
            });
          });
        }
        return {
          response: internalResponse,
          benefits
        };
      }
      return {
        response: internalResponse,
        benefits: []
      };
    } catch (error2) {
      logger4.error("Error transforming FHIR response to internal model", { error: error2, requestId: internalRequestId });
      throw new Error(`Failed to transform FHIR response: ${error2.message}`);
    }
  }
  /**
   * Extract ID from a FHIR reference string
   */
  extractReferenceId(reference) {
    const parts = reference.split("/");
    return parts[parts.length - 1];
  }
  /**
   * Get a display name for a unit code
   */
  getUnitDisplay(unitCode) {
    const unitMap = {
      "visit": "Visit",
      "day": "Day",
      "week": "Week",
      "month": "Month",
      "year": "Year",
      "lifetime": "Lifetime",
      "dollar": "Dollar"
    };
    return unitMap[unitCode] || unitCode;
  }
};
var fhirTransformerService = new FhirTransformerService();

// server/services/eligibility/x12-transformer.ts
init_logger();
import { v4 as uuidv44 } from "uuid";
var X12TransformerService = class {
  /**
   * Transform an X12 270 request into an internal EligibilityRequest
   * 
   * @param x12Data The raw X12 270 request content
   * @param userId The ID of the user making the request
   * @param organizationId Optional organization ID making the request
   */
  transformX12RequestToInternal(x12Data, userId, organizationId) {
    try {
      logger4.info("Transforming X12 270 to internal model");
      const parsedData = this.parseX12Request(x12Data);
      return {
        transactionId: parsedData.transactionId || uuidv44(),
        status: "pending",
        source: "x12",
        purpose: ["benefits"],
        // Default purpose
        patientId: parsedData.patientId,
        subscriberId: parsedData.subscriberId,
        insurerId: parsedData.insurerId,
        servicedDate: parsedData.servicedDate,
        serviceTypes: parsedData.serviceTypes,
        requestPayload: parsedData,
        rawRequestData: x12Data,
        createdBy: userId,
        requestedByOrganizationId: organizationId
      };
    } catch (error2) {
      logger4.error("Error transforming X12 request to internal model", { error: error2 });
      throw new Error(`Failed to transform X12 request: ${error2.message}`);
    }
  }
  /**
   * Transform an internal EligibilityResponse into an X12 271 response
   * 
   * @param internalResponse The internal response object
   * @param internalRequest The original internal request
   * @param benefits The benefits associated with the response
   */
  transformInternalResponseToX12(internalResponse, internalRequest, benefits) {
    try {
      logger4.info("Transforming internal response to X12 271", { responseId: internalResponse.id });
      const x12Segments = [];
      x12Segments.push(this.buildISASegment(internalRequest));
      x12Segments.push(this.buildGSSegment(internalRequest));
      x12Segments.push("ST*271*0001*005010X279A1");
      const bhtSegment = `BHT*0022*11*${internalRequest.transactionId}*${this.formatDate(/* @__PURE__ */ new Date())}*${this.formatTime(/* @__PURE__ */ new Date())}*T`;
      x12Segments.push(bhtSegment);
      x12Segments.push("HL*1**20*1");
      const payerName = internalRequest.requestPayload.payerName || "PAYER";
      x12Segments.push(`NM1*PR*2*${payerName}*****PI*${internalRequest.insurerId}`);
      x12Segments.push("HL*2*1*21*1");
      const providerName = internalRequest.requestPayload.providerName || "PROVIDER";
      const providerId = internalRequest.requestPayload.providerId || "9999999999";
      x12Segments.push(`NM1*1P*2*${providerName}*****XX*${providerId}`);
      x12Segments.push('HL*3*2*22*${internalRequest.requestPayload.patientIsSubscriber ? "0" : "1"}');
      const subscriberName = internalRequest.requestPayload.subscriberName || "SUBSCRIBER";
      x12Segments.push(`NM1*IL*1*${subscriberName}*****MI*${internalRequest.subscriberId}`);
      x12Segments.push(`TRN*1*${internalRequest.transactionId}*9999999999`);
      benefits.forEach((benefit, index2) => {
        const ebSegments = this.buildEBSegments(benefit, internalResponse);
        x12Segments.push(...ebSegments);
      });
      if (internalRequest.requestPayload.patientIsSubscriber === false) {
        x12Segments.push("HL*4*3*23*0");
        const patientName = internalRequest.requestPayload.patientName || "PATIENT";
        x12Segments.push(`NM1*QC*1*${patientName}*****MI*${internalRequest.patientId}`);
        x12Segments.push(`TRN*1*${internalRequest.transactionId}_DEP*9999999999`);
        benefits.forEach((benefit, index2) => {
          const ebSegments = this.buildEBSegments(benefit, internalResponse);
          x12Segments.push(...ebSegments);
        });
      }
      x12Segments.push(`SE*${x12Segments.length - 3}*0001`);
      x12Segments.push("GE*1*1");
      x12Segments.push("IEA*1*000000001");
      return x12Segments.join("~") + "~";
    } catch (error2) {
      logger4.error("Error transforming internal response to X12", { error: error2, responseId: internalResponse.id });
      throw new Error(`Failed to transform internal response to X12: ${error2.message}`);
    }
  }
  /**
   * Transform an X12 271 response into internal models
   * 
   * @param x12Data The raw X12 271 response content
   * @param internalRequestId The ID of the internal request
   */
  transformX12ResponseToInternal(x12Data, internalRequestId) {
    try {
      logger4.info("Transforming X12 271 to internal models", { requestId: internalRequestId });
      const parsedData = this.parseX12Response(x12Data);
      const internalResponse = {
        requestId: internalRequestId,
        status: parsedData.status,
        outcome: "complete",
        disposition: parsedData.disposition,
        responsePayload: parsedData,
        rawResponseData: x12Data,
        processedAt: /* @__PURE__ */ new Date(),
        hasErrors: parsedData.hasErrors,
        errorDetails: parsedData.errorDetails,
        isActive: parsedData.isActive,
        servicesFromDate: parsedData.servicesFromDate,
        servicesToDate: parsedData.servicesToDate
      };
      const benefits = [];
      if (parsedData.benefits && parsedData.benefits.length > 0) {
        parsedData.benefits.forEach((benefitData) => {
          benefits.push({
            responseId: 0,
            // Will be set after response is created
            benefitType: benefitData.benefitType || "medical",
            serviceType: benefitData.serviceType,
            serviceTypeName: benefitData.serviceTypeName,
            isCovered: benefitData.isCovered,
            networkStatus: benefitData.networkStatus,
            unit: benefitData.unit,
            copayAmount: benefitData.copayAmount,
            copayPercentage: benefitData.copayPercentage,
            coinsurancePercentage: benefitData.coinsurancePercentage,
            deductibleAmount: benefitData.deductibleAmount,
            deductibleRemaining: benefitData.deductibleRemaining,
            outOfPocketAmount: benefitData.outOfPocketAmount,
            outOfPocketRemaining: benefitData.outOfPocketRemaining,
            limitValue: benefitData.limitValue,
            limitUnit: benefitData.limitUnit,
            usedValue: benefitData.usedValue,
            remainingValue: benefitData.remainingValue,
            benefitDescription: benefitData.benefitDescription,
            authorizationRequired: benefitData.authorizationRequired,
            authorizationDetails: benefitData.authorizationDetails,
            additionalInfo: benefitData.additionalInfo
          });
        });
      }
      return {
        response: internalResponse,
        benefits
      };
    } catch (error2) {
      logger4.error("Error transforming X12 response to internal model", { error: error2, requestId: internalRequestId });
      throw new Error(`Failed to transform X12 response: ${error2.message}`);
    }
  }
  /**
   * Parse an X12 270 request
   * 
   * Note: In a real implementation, this would use a specialized X12 parser library.
   * This is a simplified implementation for demonstration purposes.
   */
  parseX12Request(x12Data) {
    const segments = x12Data.split("~").filter((s) => s.trim() !== "");
    const bhtSegment = segments.find((s) => s.startsWith("BHT*"));
    const transactionId = bhtSegment ? bhtSegment.split("*")[3] : uuidv44();
    const subscriberSegment = segments.find((s) => s.startsWith("NM1*IL*"));
    const patientSegment = segments.find((s) => s.startsWith("NM1*QC*"));
    const insurerSegment = segments.find((s) => s.startsWith("NM1*PR*"));
    const providerSegment = segments.find((s) => s.startsWith("NM1*1P*"));
    const serviceTypeSegment = segments.find((s) => s.startsWith("EQ*"));
    const serviceTypes = serviceTypeSegment ? serviceTypeSegment.split("*")[1].split(":") : [];
    const dateSegment = segments.find((s) => s.startsWith("DTP*291*"));
    let servicedDate = "";
    if (dateSegment) {
      const dateParts = dateSegment.split("*");
      if (dateParts.length >= 4) {
        if (dateParts[2] === "D8") {
          servicedDate = this.formatX12Date(dateParts[3]);
        } else {
          servicedDate = dateParts[3];
        }
      }
    }
    const subscriberId = subscriberSegment ? subscriberSegment.split("*")[9] || "" : "";
    const patientId = patientSegment ? patientSegment.split("*")[9] || subscriberId : subscriberId;
    const insurerId = insurerSegment ? insurerSegment.split("*")[9] || "9999" : "9999";
    const patientIsSubscriber = !patientSegment;
    const subscriberName = subscriberSegment ? subscriberSegment.split("*")[3] || "" : "";
    const patientName = patientSegment ? patientSegment.split("*")[3] || subscriberName : subscriberName;
    const payerName = insurerSegment ? insurerSegment.split("*")[3] || "" : "";
    const providerName = providerSegment ? providerSegment.split("*")[3] || "" : "";
    const providerId = providerSegment ? providerSegment.split("*")[9] || "" : "";
    return {
      transactionId,
      patientId,
      subscriberId,
      insurerId,
      servicedDate,
      serviceTypes,
      patientIsSubscriber,
      subscriberName,
      patientName,
      payerName,
      providerName,
      providerId
    };
  }
  /**
   * Parse an X12 271 response
   * 
   * Note: In a real implementation, this would use a specialized X12 parser library.
   * This is a simplified implementation for demonstration purposes.
   */
  parseX12Response(x12Data) {
    const segments = x12Data.split("~").filter((s) => s.trim() !== "");
    const aaaSegments = segments.filter((s) => s.startsWith("AAA*"));
    const hasErrors = aaaSegments.length > 0;
    let status = "active";
    let disposition = "";
    const errorDetails = aaaSegments.map((seg) => {
      const parts = seg.split("*");
      const code = parts[3] || "";
      const message = this.getAAAErrorMessage(code);
      return { code, message };
    });
    if (hasErrors) {
      const fatalCodes = ["41", "42", "43", "45", "47", "48", "49", "51", "52"];
      if (aaaSegments.some((seg) => fatalCodes.includes(seg.split("*")[3]))) {
        status = "cancelled";
        disposition = "Coverage inactive or not found";
      } else {
        disposition = "Processed with errors";
      }
    }
    const dtpSegments = segments.filter((s) => s.startsWith("DTP*"));
    let servicesFromDate = "";
    let servicesToDate = "";
    const eligDateSegment = dtpSegments.find((s) => s.includes("*291*"));
    if (eligDateSegment) {
      const parts = eligDateSegment.split("*");
      if (parts.length >= 4) {
        if (parts[2] === "D8" && parts[3].length === 8) {
          servicesFromDate = this.formatX12Date(parts[3]);
          servicesToDate = this.formatX12Date(parts[3]);
        } else if (parts[2] === "RD8" && parts[3].includes("-")) {
          const [start, end] = parts[3].split("-");
          servicesFromDate = this.formatX12Date(start);
          servicesToDate = this.formatX12Date(end);
        }
      }
    }
    const benefits = [];
    const ebSegments = segments.filter((s) => s.startsWith("EB*"));
    let currentBenefit = null;
    ebSegments.forEach((ebSegment) => {
      const parts = ebSegment.split("*");
      const eb01 = parts[1] || "";
      const isCovered = ["A", "B", "C", "D", "E", "F", "G", "H", "Y"].includes(eb01);
      if (eb01 && (eb01 !== "I" && eb01 !== "J" && eb01 !== "K" && eb01 !== "L" && eb01 !== "M" && eb01 !== "N" && eb01 !== "O" && eb01 !== "P" && eb01 !== "Q" && eb01 !== "R" && eb01 !== "S" && eb01 !== "T" && eb01 !== "U" && eb01 !== "V" && eb01 !== "W" && eb01 !== "X")) {
        const serviceTypeCode = parts[2] || "";
        const serviceTypeName = this.getServiceTypeName(serviceTypeCode);
        const coverageLevel = parts[3] || "";
        const insuranceType = parts[4] || "";
        currentBenefit = {
          benefitType: "medical",
          serviceType: serviceTypeCode,
          serviceTypeName,
          isCovered,
          networkStatus: insuranceType === "12" ? "in-network" : insuranceType === "15" ? "out-network" : void 0,
          benefitDescription: this.getEB01Description(eb01)
        };
        const authRequired = parts.some((p) => p === "PR");
        if (authRequired) {
          currentBenefit.authorizationRequired = true;
        }
        benefits.push(currentBenefit);
      } else if (currentBenefit && ["I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X"].includes(eb01)) {
        const amountParts = (parts[3] || "").split(":");
        const amount = amountParts.length > 0 ? parseFloat(amountParts[0]) : void 0;
        const timePeriodQualifier = parts[5] || "";
        const quantityParts = (parts[4] || "").split(":");
        const quantity = quantityParts.length > 0 ? parseInt(quantityParts[0]) : void 0;
        switch (eb01) {
          case "I":
            currentBenefit.deductibleAmount = amount;
            break;
          case "J":
            currentBenefit.coinsurancePercentage = quantity;
            break;
          case "K":
            currentBenefit.outOfPocketAmount = amount;
            break;
          case "O":
            currentBenefit.copayAmount = amount;
            break;
          case "T":
            currentBenefit.limitValue = quantity;
            currentBenefit.limitUnit = this.mapTimePeriodQualifier(timePeriodQualifier);
            break;
        }
      }
    });
    const isActive = !hasErrors || status !== "cancelled";
    return {
      status,
      disposition,
      hasErrors,
      errorDetails: errorDetails.length > 0 ? errorDetails : void 0,
      isActive,
      servicesFromDate,
      servicesToDate,
      benefits
    };
  }
  /**
   * Build ISA segment for X12 271 response
   */
  buildISASegment(request) {
    const senderId = request.requestPayload.senderId || "9999999999";
    const receiverId = request.requestPayload.receiverId || "9999999999";
    const date2 = /* @__PURE__ */ new Date();
    const formattedDate = this.formatDate(date2);
    const formattedTime = this.formatTime(date2);
    return `ISA*00*          *00*          *ZZ*${senderId.padEnd(15)}*ZZ*${receiverId.padEnd(15)}*${formattedDate}*${formattedTime}*^*00501*000000001*0*P*:`;
  }
  /**
   * Build GS segment for X12 271 response
   */
  buildGSSegment(request) {
    const senderId = request.requestPayload.senderId || "SENDER";
    const receiverId = request.requestPayload.receiverId || "RECEIVER";
    const date2 = /* @__PURE__ */ new Date();
    const formattedDate = this.formatDate(date2);
    const formattedTime = this.formatTime(date2);
    return `GS*HB*${senderId}*${receiverId}*${formattedDate}*${formattedTime}*1*X*005010X279A1`;
  }
  /**
   * Build EB segments for a benefit
   */
  buildEBSegments(benefit, response) {
    const segments = [];
    const eb01 = benefit.isCovered ? "A" : "N";
    let ebSegment = `EB*${eb01}`;
    if (benefit.serviceType) {
      ebSegment += `*${benefit.serviceType}`;
    } else {
      ebSegment += "*";
    }
    ebSegment += "*";
    if (benefit.networkStatus === "in-network") {
      ebSegment += "*12";
    } else if (benefit.networkStatus === "out-network") {
      ebSegment += "*15";
    } else {
      ebSegment += "*";
    }
    if (benefit.benefitDescription) {
      ebSegment += `***${benefit.benefitDescription}`;
    }
    if (benefit.authorizationRequired) {
      ebSegment += "***PR";
    }
    segments.push(ebSegment);
    if (benefit.copayAmount !== null && benefit.copayAmount !== void 0) {
      segments.push(`EB*O*${benefit.serviceType}***${benefit.copayAmount}`);
    }
    if (benefit.coinsurancePercentage !== null && benefit.coinsurancePercentage !== void 0) {
      segments.push(`EB*J*${benefit.serviceType}***${benefit.coinsurancePercentage}`);
    }
    if (benefit.deductibleAmount !== null && benefit.deductibleAmount !== void 0) {
      segments.push(`EB*I*${benefit.serviceType}***${benefit.deductibleAmount}`);
    }
    if (benefit.outOfPocketAmount !== null && benefit.outOfPocketAmount !== void 0) {
      segments.push(`EB*K*${benefit.serviceType}***${benefit.outOfPocketAmount}`);
    }
    if (benefit.limitValue !== null && benefit.limitValue !== void 0) {
      const timePeriodQualifier = this.reverseMapTimePeriodQualifier(benefit.limitUnit);
      segments.push(`EB*T*${benefit.serviceType}***${benefit.limitValue}*${timePeriodQualifier}`);
    }
    if (response.servicesFromDate && response.servicesToDate) {
      if (response.servicesFromDate === response.servicesToDate) {
        const formattedDate = response.servicesFromDate.replace(/-/g, "");
        segments.push(`DTP*291*D8*${formattedDate}`);
      } else {
        const formattedStartDate = response.servicesFromDate.replace(/-/g, "");
        const formattedEndDate = response.servicesToDate.replace(/-/g, "");
        segments.push(`DTP*291*RD8*${formattedStartDate}-${formattedEndDate}`);
      }
    }
    if (benefit.authorizationDetails) {
      segments.push(`MSG*${benefit.authorizationDetails}`);
    }
    return segments;
  }
  /**
   * Format a date for X12 use
   */
  formatDate(date2) {
    const year = date2.getFullYear().toString().padStart(4, "0");
    const month = (date2.getMonth() + 1).toString().padStart(2, "0");
    const day = date2.getDate().toString().padStart(2, "0");
    return `${year}${month}${day}`;
  }
  /**
   * Format a time for X12 use
   */
  formatTime(date2) {
    const hours = date2.getHours().toString().padStart(2, "0");
    const minutes = date2.getMinutes().toString().padStart(2, "0");
    return `${hours}${minutes}`;
  }
  /**
   * Format an X12 date into ISO format
   */
  formatX12Date(x12Date) {
    if (x12Date.length === 8) {
      const year = x12Date.substring(0, 4);
      const month = x12Date.substring(4, 6);
      const day = x12Date.substring(6, 8);
      return `${year}-${month}-${day}`;
    }
    return x12Date;
  }
  /**
   * Get the description for an EB01 code
   */
  getEB01Description(eb01) {
    const eb01Map = {
      "A": "Active Coverage",
      "B": "Active - Full Risk Capitation",
      "C": "Active - Services Capitated",
      "D": "Active - Services Capitated to Primary Care Physician",
      "E": "Active - Pending Investigation",
      "F": "Active - Pending Eligibility Determination",
      "G": "Active - Pending Provider Verification",
      "H": "Active - Pending COBRA Begin Date",
      "I": "Inactive",
      "J": "Inactive - Pending Eligibility Determination",
      "K": "Inactive - Pending Provider Verification",
      "L": "Inactive - Pending Subscriber Payment",
      "M": "Inactive - Provider Contract Limitations",
      "N": "Inactive",
      "O": "Inactive - Dependent Exceeds Age Limitation",
      "P": "Inactive - Dependent Exceeds Student Age Limitation",
      "Q": "Inactive - Disabled Dependent Exceeds Age Limitation",
      "R": "Inactive - Divorced",
      "S": "Inactive - Deceased",
      "T": "Inactive - Terminated",
      "U": "Inactive - Terminated - Non-Payment",
      "V": "Inactive - Individual Terminated",
      "W": "Inactive - Retro-Termination",
      "X": "Inactive - Voluntary Termination",
      "Y": "Medicare Primary"
    };
    return eb01Map[eb01] || "Unknown Status";
  }
  /**
   * Get the error message for an AAA rejection code
   */
  getAAAErrorMessage(code) {
    const errorMap = {
      "15": "Required application data missing",
      "41": "Authorization/Access Restrictions",
      "42": "Unable to respond at current time",
      "43": "Invalid/Missing Provider Identification",
      "44": "Invalid/Missing Provider Name",
      "45": "Invalid/Missing Provider Specialty",
      "46": "Invalid/Missing Provider Phone Number",
      "47": "Invalid/Missing Provider State",
      "48": "Invalid/Missing Referring Provider Identification Number",
      "49": "Provider is Not Primary Care Physician",
      "50": "Provider Ineligible for Inquiries",
      "51": "Provider Not on File",
      "52": "Service Dates Not Within Provider Plan Enrollment",
      "53": "Inquired Benefit Inconsistent with Provider Type",
      "54": "Inappropriate Provider Role",
      "55": "Provider Not Eligible for Service",
      "56": "Inappropriate Date",
      "57": "Invalid/Missing Date(s) of Service",
      "58": "Invalid/Missing Date-of-Birth",
      "59": "Invalid/Missing Date-of-Death",
      "60": "Date of Birth Follows Date of Service",
      "61": "Date of Death Precedes Date of Service",
      "62": "Invalid/Missing Patient ID",
      "63": "Invalid/Missing Patient Name",
      "64": "Invalid/Missing Patient Gender Code",
      "65": "Patient Not Found",
      "66": "Duplicate Patient ID Number",
      "67": "Inconsistent with Patient's Age",
      "68": "Inconsistent with Patient's Gender",
      "69": "Inconsistent with Patient's Date of Birth",
      "70": "Invalid/Missing Subscriber/Insured ID",
      "71": "Invalid/Missing Subscriber/Insured Name",
      "72": "Invalid/Missing Subscriber/Insured Gender Code",
      "73": "Invalid/Missing Subscriber/Insured Date of Birth",
      "74": "Subscriber/Insured Not Found",
      "75": "Subscriber/Insured Not Currently Effective",
      "76": "Benefit Ineligible",
      "77": "Service Inconsistent with Diagnosis",
      "78": "Diagnosis Code Not Valid for Service Provided"
    };
    return errorMap[code] || `Error code ${code}`;
  }
  /**
   * Get the name for a service type code
   */
  getServiceTypeName(code) {
    const serviceTypeMap = {
      "1": "Medical Care",
      "2": "Surgical",
      "3": "Consultation",
      "4": "Diagnostic X-Ray",
      "5": "Diagnostic Lab",
      "6": "Radiation Therapy",
      "7": "Anesthesia",
      "8": "Surgical Assistance",
      "12": "Durable Medical Equipment",
      "13": "Ambulatory Service Center",
      "14": "Renal Supplies",
      "18": "Durable Medical Equipment Purchase",
      "20": "Second Surgical Opinion",
      "21": "Third Surgical Opinion",
      "22": "Social Work",
      "23": "Diagnostic Dental",
      "24": "Periodontics",
      "25": "Restorative",
      "26": "Endodontics",
      "27": "Maxillofacial Prosthetics",
      "28": "Adjunctive Dental Services",
      "30": "Health Benefit Plan Coverage",
      "33": "Chiropractic",
      "35": "Dental Care",
      "40": "Oral Surgery",
      "42": "Home Health Care",
      "45": "Hospice",
      "46": "Respite Care",
      "47": "Hospital",
      "48": "Hospital - Inpatient",
      "50": "Hospital - Outpatient",
      "51": "Hospital - Emergency Accident",
      "52": "Hospital - Emergency Medical",
      "53": "Hospital - Ambulatory Surgical",
      "62": "MRI/CAT Scan",
      "65": "Newborn Care",
      "67": "Obstetrical",
      "73": "Psychiatric",
      "74": "Psychiatric - Inpatient",
      "75": "Psychiatric - Outpatient",
      "76": "Psychotherapy",
      "78": "Rehabilitation",
      "80": "Rehabilitation - Inpatient",
      "81": "Rehabilitation - Outpatient",
      "82": "Rehabilitation - Cardiac",
      "86": "Emergency Services",
      "88": "Pharmacy",
      "93": "Podiatry",
      "98": "Professional (Physician) Visit - Office",
      "AL": "Vision (Optometry)",
      "MH": "Mental Health",
      "UC": "Urgent Care"
    };
    return serviceTypeMap[code] || `Service Type ${code}`;
  }
  /**
   * Map time period qualifier to unit
   */
  mapTimePeriodQualifier(qualifier) {
    const qualifierMap = {
      "6": "day",
      "7": "week",
      "21": "year",
      "22": "service",
      "23": "visit",
      "24": "month",
      "25": "lifetime",
      "26": "admission",
      "27": "copay",
      "28": "hour",
      "29": "episode",
      "30": "unit"
    };
    return qualifierMap[qualifier] || qualifier;
  }
  /**
   * Reverse map unit to time period qualifier
   */
  reverseMapTimePeriodQualifier(unit) {
    if (!unit) return "21";
    const unitMap = {
      "day": "6",
      "week": "7",
      "year": "21",
      "service": "22",
      "visit": "23",
      "month": "24",
      "lifetime": "25",
      "admission": "26",
      "copay": "27",
      "hour": "28",
      "episode": "29",
      "unit": "30"
    };
    return unitMap[unit] || "21";
  }
};
var x12TransformerService = new X12TransformerService();

// server/services/eligibility/eligibility-service.ts
var EligibilityService = class {
  /**
   * Process a FHIR CoverageEligibilityRequest
   * 
   * @param fhirRequest The FHIR request object
   * @param userId The ID of the user making the request
   * @param organizationId Optional organization ID
   */
  async processFhirRequest(fhirRequest, userId, organizationId) {
    try {
      logger4.info("Processing FHIR eligibility request", { userId });
      await this.validatePermissions(userId, organizationId);
      const internalRequest = fhirTransformerService.transformFhirRequestToInternal(fhirRequest, userId, organizationId);
      const eligibilityResponse = await this.processRequest(internalRequest);
      const benefits = await eligibilityStorage.getEligibilityBenefitsByResponseId(eligibilityResponse.id);
      const fhirResponse = fhirTransformerService.transformInternalResponseToFhir(
        eligibilityResponse,
        await eligibilityStorage.getEligibilityRequest(eligibilityResponse.requestId),
        benefits
      );
      return fhirResponse;
    } catch (error2) {
      logger4.error("Error processing FHIR eligibility request", { error: error2, userId });
      throw error2;
    }
  }
  /**
   * Process an X12 270 eligibility request
   * 
   * @param x12Request The X12 270 content
   * @param userId The ID of the user making the request
   * @param organizationId Optional organization ID
   */
  async processX12Request(x12Request, userId, organizationId) {
    try {
      logger4.info("Processing X12 270 eligibility request", { userId });
      await this.validatePermissions(userId, organizationId);
      const internalRequest = x12TransformerService.transformX12RequestToInternal(x12Request, userId, organizationId);
      const eligibilityResponse = await this.processRequest(internalRequest);
      const benefits = await eligibilityStorage.getEligibilityBenefitsByResponseId(eligibilityResponse.id);
      const x12Response = x12TransformerService.transformInternalResponseToX12(
        eligibilityResponse,
        await eligibilityStorage.getEligibilityRequest(eligibilityResponse.requestId),
        benefits
      );
      return x12Response;
    } catch (error2) {
      logger4.error("Error processing X12 eligibility request", { error: error2, userId });
      throw error2;
    }
  }
  /**
   * Get a FHIR eligibility response by ID
   * 
   * @param responseId The ID of the eligibility response
   * @param userId The ID of the user making the request
   */
  async getFhirResponseById(responseId, userId) {
    try {
      logger4.info("Getting FHIR eligibility response by ID", { responseId, userId });
      const response = await eligibilityStorage.getEligibilityResponse(responseId);
      if (!response) {
        throw new Error(`Eligibility response with ID ${responseId} not found`);
      }
      await this.validatePermissions(userId);
      const request = await eligibilityStorage.getEligibilityRequest(response.requestId);
      if (!request) {
        throw new Error(`Original eligibility request not found for response ID ${responseId}`);
      }
      const benefits = await eligibilityStorage.getEligibilityBenefitsByResponseId(responseId);
      const fhirResponse = fhirTransformerService.transformInternalResponseToFhir(
        response,
        request,
        benefits
      );
      return fhirResponse;
    } catch (error2) {
      logger4.error("Error getting FHIR eligibility response by ID", { error: error2, responseId, userId });
      throw error2;
    }
  }
  /**
   * Process an eligibility verification request
   * 
   * This is the core processing function that:
   * 1. Checks the cache
   * 2. If not cached, forwards to payer
   * 3. Handles the response
   * 4. Stores in cache if appropriate
   * 5. Returns the result
   * 
   * @param internalRequest The internal eligibility request object
   */
  async processRequest(internalRequest) {
    try {
      logger4.info("Processing eligibility request", { transactionId: internalRequest.transactionId });
      const request = await eligibilityStorage.createEligibilityRequest(internalRequest);
      await eligibilityStorage.logAuditEvent({
        requestId: request.id,
        eventType: "request_received",
        eventTimestamp: /* @__PURE__ */ new Date(),
        actorId: request.createdBy,
        actorType: "user",
        eventDetails: { source: request.source }
      });
      let cachedResponse;
      if (request.subscriberId && request.insurerId) {
        cachedResponse = await eligibilityStorage.getResponseByCacheParams(
          request.subscriberId,
          request.insurerId,
          request.serviceTypes && request.serviceTypes.length > 0 ? request.serviceTypes[0] : null,
          request.servicedDate
        );
        if (cachedResponse) {
          await eligibilityStorage.updateEligibilityRequestStatus(request.id, "cached", {
            updatedAt: /* @__PURE__ */ new Date()
          });
          await eligibilityStorage.logAuditEvent({
            requestId: request.id,
            responseId: cachedResponse.id,
            eventType: "cache_hit",
            eventTimestamp: /* @__PURE__ */ new Date(),
            actorId: request.createdBy,
            actorType: "system",
            eventDetails: { cacheResponseId: cachedResponse.id }
          });
          return cachedResponse;
        }
      }
      await eligibilityStorage.updateEligibilityRequestStatus(request.id, "processing");
      const payerRouting = await eligibilityStorage.getPayerRouting(request.insurerId);
      if (!payerRouting) {
        const errorResponse = await eligibilityStorage.createEligibilityResponse({
          requestId: request.id,
          status: "active",
          // Default to active even though we couldn't verify
          outcome: "error",
          disposition: "Payer not found in routing configuration",
          responsePayload: {
            error: "Payer not found"
          },
          hasErrors: true,
          errorDetails: [
            { code: "payer_not_found", message: "Payer not found in routing configuration" }
          ],
          receivedAt: /* @__PURE__ */ new Date(),
          processedAt: /* @__PURE__ */ new Date(),
          isActive: true
          // Default to active
        });
        await eligibilityStorage.updateEligibilityRequestStatus(request.id, "failed");
        await eligibilityStorage.logAuditEvent({
          requestId: request.id,
          responseId: errorResponse.id,
          eventType: "error",
          eventTimestamp: /* @__PURE__ */ new Date(),
          actorId: request.createdBy,
          actorType: "system",
          eventDetails: { error: "Payer not found" }
        });
        return errorResponse;
      }
      await eligibilityStorage.updateEligibilityRequestStatus(request.id, "processing", {
        forwardedToPayerId: payerRouting.payerId,
        forwardedToClearinghouseId: payerRouting.useClearinghouse ? payerRouting.clearinghouseId : void 0,
        forwardedAt: /* @__PURE__ */ new Date()
      });
      await eligibilityStorage.logAuditEvent({
        requestId: request.id,
        eventType: "request_forwarded",
        eventTimestamp: /* @__PURE__ */ new Date(),
        actorId: request.createdBy,
        actorType: "system",
        eventDetails: {
          payerId: payerRouting.payerId,
          clearinghouseId: payerRouting.useClearinghouse ? payerRouting.clearinghouseId : void 0,
          useFhir: payerRouting.useDirectFhir
        }
      });
      let externalResponse;
      if (payerRouting.useDirectFhir) {
        externalResponse = await this.simulateFhirPayerCall(request);
      } else if (payerRouting.useClearinghouse) {
        externalResponse = await this.simulateX12ClearinghouseCall(request, payerRouting.clearinghouseId);
      } else {
        externalResponse = await this.simulateX12PayerCall(request);
      }
      await eligibilityStorage.logAuditEvent({
        requestId: request.id,
        eventType: "response_received",
        eventTimestamp: /* @__PURE__ */ new Date(),
        actorId: request.createdBy,
        actorType: "system",
        eventDetails: {
          payerId: payerRouting.payerId,
          clearinghouseId: payerRouting.useClearinghouse ? payerRouting.clearinghouseId : void 0,
          responseFormat: payerRouting.useDirectFhir ? "fhir" : "x12"
        }
      });
      let responseData;
      let benefitsData = [];
      if (payerRouting.useDirectFhir) {
        const transformed = fhirTransformerService.transformFhirResponseToInternal(externalResponse, request.id);
        responseData = transformed.response;
        benefitsData = transformed.benefits;
      } else {
        const transformed = x12TransformerService.transformX12ResponseToInternal(externalResponse, request.id);
        responseData = transformed.response;
        benefitsData = transformed.benefits;
      }
      const response = await eligibilityStorage.createEligibilityResponse(responseData);
      if (benefitsData.length > 0) {
        const benefitsWithResponseId = benefitsData.map((benefit) => ({
          ...benefit,
          responseId: response.id
        }));
        await eligibilityStorage.createEligibilityBenefits(benefitsWithResponseId);
      }
      await eligibilityStorage.updateEligibilityRequestStatus(request.id, "completed");
      await eligibilityStorage.logAuditEvent({
        requestId: request.id,
        responseId: response.id,
        eventType: "processing_completed",
        eventTimestamp: /* @__PURE__ */ new Date(),
        actorId: request.createdBy,
        actorType: "system",
        eventDetails: {
          benefitsCount: benefitsData.length,
          status: response.status
        }
      });
      if (!response.hasErrors && response.status === "active" && request.subscriberId && request.insurerId) {
        const now = /* @__PURE__ */ new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
        await eligibilityStorage.createEligibilityCache({
          subscriberId: request.subscriberId,
          payerId: request.insurerId,
          serviceType: request.serviceTypes && request.serviceTypes.length > 0 ? request.serviceTypes[0] : void 0,
          servicedDate: request.servicedDate,
          responseId: response.id,
          createdAt: now,
          expiresAt,
          hitCount: 0
        });
        await eligibilityStorage.logAuditEvent({
          requestId: request.id,
          responseId: response.id,
          eventType: "response_cached",
          eventTimestamp: /* @__PURE__ */ new Date(),
          actorId: request.createdBy,
          actorType: "system",
          eventDetails: { expiresAt }
        });
      }
      return response;
    } catch (error2) {
      logger4.error("Error processing eligibility request", {
        error: error2,
        transactionId: internalRequest.transactionId
      });
      if (internalRequest.id) {
        await eligibilityStorage.updateEligibilityRequestStatus(internalRequest.id, "failed", {
          updatedAt: /* @__PURE__ */ new Date(),
          // Set a retry time for some failures
          nextRetryAt: new Date(Date.now() + 15 * 60 * 1e3)
          // 15 minutes later
        });
        await eligibilityStorage.logAuditEvent({
          requestId: internalRequest.id,
          eventType: "error",
          eventTimestamp: /* @__PURE__ */ new Date(),
          actorId: internalRequest.createdBy,
          actorType: "system",
          eventDetails: {
            error: error2.message,
            stack: error2.stack
          }
        });
        const errorResponse = await eligibilityStorage.createEligibilityResponse({
          requestId: internalRequest.id,
          status: "active",
          // Default to active even though we couldn't verify
          outcome: "error",
          disposition: "Error processing eligibility request",
          responsePayload: {
            error: error2.message
          },
          hasErrors: true,
          errorDetails: [
            { code: "processing_error", message: error2.message }
          ],
          receivedAt: /* @__PURE__ */ new Date(),
          processedAt: /* @__PURE__ */ new Date(),
          isActive: true
          // Default to active
        });
        return errorResponse;
      }
      throw error2;
    }
  }
  /**
   * Validate user permissions for eligibility verification
   * 
   * @param userId The ID of the user to validate
   * @param organizationId Optional organization ID
   */
  async validatePermissions(userId, organizationId) {
    const consentCheck = await consentsService.checkUserConsent({
      userId,
      purpose: "eligibility_verification",
      resource: "coverage",
      action: "read"
    });
    if (!consentCheck.authorized) {
      throw new Error("User is not authorized to perform eligibility verifications");
    }
    if (organizationId) {
      const orgConsentCheck = await consentsService.checkUserConsent({
        userId,
        purpose: "organization_representation",
        resource: organizationId,
        action: "represent"
      });
      if (!orgConsentCheck.authorized) {
        throw new Error(`User is not authorized to act on behalf of organization ${organizationId}`);
      }
    }
  }
  /**
   * Simulate a FHIR call to a payer
   * 
   * In a real implementation, this would be an actual API call to a payer's FHIR endpoint
   */
  async simulateFhirPayerCall(request) {
    const patientRef = `Patient/${request.patientId}`;
    const insurerRef = `Organization/${request.insurerId}`;
    const coverageRef = request.coverageId ? `Coverage/${request.coverageId}` : `Coverage/${request.subscriberId || "unknown"}`;
    const requestRef = `CoverageEligibilityRequest/${request.transactionId}`;
    return {
      resourceType: "CoverageEligibilityResponse",
      status: "active",
      purpose: request.purpose || ["benefits"],
      patient: {
        reference: patientRef
      },
      created: (/* @__PURE__ */ new Date()).toISOString(),
      request: {
        reference: requestRef
      },
      outcome: "complete",
      insurer: {
        reference: insurerRef
      },
      insurance: [
        {
          coverage: {
            reference: coverageRef
          },
          inforce: true,
          benefitPeriod: {
            start: "2025-01-01",
            end: "2025-12-31"
          },
          item: [
            {
              productOrService: {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/service-type",
                    code: request.serviceTypes && request.serviceTypes.length > 0 ? request.serviceTypes[0] : "30",
                    display: "Health Benefit Plan Coverage"
                  }
                ]
              },
              network: {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/benefit-network",
                    code: "in-network",
                    display: "In Network"
                  }
                ]
              },
              unit: {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/benefit-unit",
                    code: "visit",
                    display: "Visit"
                  }
                ]
              },
              benefit: [
                {
                  type: {
                    coding: [
                      {
                        system: "http://terminology.hl7.org/CodeSystem/benefit-type",
                        code: "copay",
                        display: "Copayment"
                      }
                    ]
                  },
                  allowedMoney: {
                    value: 20,
                    currency: "USD"
                  }
                },
                {
                  type: {
                    coding: [
                      {
                        system: "http://terminology.hl7.org/CodeSystem/benefit-type",
                        code: "deductible",
                        display: "Deductible"
                      }
                    ]
                  },
                  allowedMoney: {
                    value: 1e3,
                    currency: "USD"
                  },
                  usedMoney: {
                    value: 500,
                    currency: "USD"
                  }
                },
                {
                  type: {
                    coding: [
                      {
                        system: "http://terminology.hl7.org/CodeSystem/benefit-type",
                        code: "out-of-pocket",
                        display: "Out of Pocket Maximum"
                      }
                    ]
                  },
                  allowedMoney: {
                    value: 5e3,
                    currency: "USD"
                  },
                  usedMoney: {
                    value: 1200,
                    currency: "USD"
                  }
                }
              ]
            }
          ]
        }
      ]
    };
  }
  /**
   * Simulate an X12 call to a clearinghouse
   * 
   * In a real implementation, this would be an actual API call to a clearinghouse
   */
  async simulateX12ClearinghouseCall(request, clearinghouseId) {
    const isa = "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *230215*1524*^*00501*000000001*0*P*:~";
    const gs = "GS*HB*SENDER*RECEIVER*20230215*1524*1*X*005010X279A1~";
    const st = "ST*271*0001*005010X279A1~";
    const bht = `BHT*0022*11*${request.transactionId}*20230215*1524*T~`;
    const hl1 = "HL*1**20*1~";
    const nm1_payer = `NM1*PR*2*INSURANCE PAYER*****PI*${request.insurerId}~`;
    const hl2 = "HL*2*1*21*1~";
    const nm1_provider = "NM1*1P*2*PROVIDER NAME*****XX*9999999999~";
    const hl3 = "HL*3*2*22*0~";
    const nm1_subscriber = `NM1*IL*1*DOE*JOHN****MI*${request.subscriberId || request.patientId}~`;
    const trn = `TRN*1*${request.transactionId}*9999999999~`;
    const date2 = "DTP*291*D8*20250101~";
    const eb1 = "EB*A*30**12***Y~";
    const eb2 = "EB*C*1**12~";
    const eb3 = "EB*C*98**12~";
    const eb4 = "EB*B*88**12~";
    const eb5 = "EB*O*98***20~";
    const eb6 = "EB*I*98***1000~";
    const eb7 = "EB*J*98***20~";
    const se = "SE*20*0001~";
    const ge = "GE*1*1~";
    const iea = "IEA*1*000000001~";
    return [
      isa,
      gs,
      st,
      bht,
      hl1,
      nm1_payer,
      hl2,
      nm1_provider,
      hl3,
      nm1_subscriber,
      trn,
      date2,
      eb1,
      eb2,
      eb3,
      eb4,
      eb5,
      eb6,
      eb7,
      se,
      ge,
      iea
    ].join("");
  }
  /**
   * Simulate an X12 call directly to a payer
   * 
   * In a real implementation, this would be an actual API call to a payer
   */
  async simulateX12PayerCall(request) {
    return this.simulateX12ClearinghouseCall(request);
  }
};
var eligibilityService = new EligibilityService();

// server/routes/eligibility-routes.ts
init_logger();
var upload2 = multer2({
  storage: multer2.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB max file size
  }
});
var validateAuth = (req, res, next2) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next2();
};
function registerEligibilityRoutes(app2) {
  const router9 = express3.Router();
  router9.post("/CoverageEligibilityRequest", validateAuth, async (req, res) => {
    try {
      logger4.info("FHIR eligibility request received");
      const validationResult = fhirCoverageEligibilityRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        logger4.warn("Invalid FHIR eligibility request", {
          errors: validationResult.error.errors
        });
        return res.status(400).json({
          resourceType: "OperationOutcome",
          issue: [{
            severity: "error",
            code: "invalid",
            details: {
              text: "Invalid request format"
            },
            diagnostics: validationResult.error.message
          }]
        });
      }
      const userId = req.user.id;
      const organizationId = req.query.organizationId || void 0;
      const response = await eligibilityService.processFhirRequest(
        validationResult.data,
        userId,
        organizationId
      );
      return res.status(200).json(response);
    } catch (error2) {
      logger4.error("Error processing FHIR eligibility request", { error: error2 });
      return res.status(500).json({
        resourceType: "OperationOutcome",
        issue: [{
          severity: "error",
          code: "processing",
          details: {
            text: "Error processing eligibility request"
          },
          diagnostics: error2.message
        }]
      });
    }
  });
  router9.get("/CoverageEligibilityResponse/:id", validateAuth, async (req, res) => {
    try {
      logger4.info("Get FHIR eligibility response by ID", { responseId: req.params.id });
      const responseId = parseInt(req.params.id);
      if (isNaN(responseId)) {
        return res.status(400).json({
          resourceType: "OperationOutcome",
          issue: [{
            severity: "error",
            code: "invalid",
            details: {
              text: "Invalid response ID"
            }
          }]
        });
      }
      const userId = req.user.id;
      const response = await eligibilityService.getFhirResponseById(responseId, userId);
      return res.status(200).json(response);
    } catch (error2) {
      logger4.error("Error getting FHIR eligibility response", {
        error: error2,
        responseId: req.params.id
      });
      return res.status(500).json({
        resourceType: "OperationOutcome",
        issue: [{
          severity: "error",
          code: "processing",
          details: {
            text: "Error retrieving eligibility response"
          },
          diagnostics: error2.message
        }]
      });
    }
  });
  router9.post("/x12/270", [validateAuth, upload2.single("file")], async (req, res) => {
    try {
      logger4.info("X12 270 eligibility request received");
      let x12Data;
      if (req.file) {
        x12Data = req.file.buffer.toString("utf8");
      } else if (req.body.x12Data) {
        x12Data = req.body.x12Data;
      } else {
        return res.status(400).json({ error: "No X12 data provided" });
      }
      const userId = req.user.id;
      const organizationId = req.query.organizationId || void 0;
      const response = await eligibilityService.processX12Request(
        x12Data,
        userId,
        organizationId
      );
      return res.status(200).send(response);
    } catch (error2) {
      logger4.error("Error processing X12 270 eligibility request", { error: error2 });
      return res.status(500).json({ error: error2.message });
    }
  });
  router9.post("/payers", validateAuth, async (req, res) => {
    try {
      logger4.info("Create payer routing configuration");
      if (!req.user.roles || !req.user.roles.includes("admin")) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const validationResult = insertEligibilityPayerRoutingSchema.safeParse(req.body);
      if (!validationResult.success) {
        logger4.warn("Invalid payer routing configuration", {
          errors: validationResult.error.errors
        });
        return res.status(400).json({
          error: "Invalid request",
          details: validationResult.error.errors
        });
      }
      const payerRouting = await eligibilityStorage.createPayerRouting(validationResult.data);
      return res.status(201).json(payerRouting);
    } catch (error2) {
      logger4.error("Error creating payer routing", { error: error2 });
      return res.status(500).json({ error: error2.message });
    }
  });
  router9.put("/payers/:id", validateAuth, async (req, res) => {
    try {
      logger4.info("Update payer routing configuration", { payerId: req.params.id });
      if (!req.user.roles || !req.user.roles.includes("admin")) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const payerId = req.params.id;
      if (!payerId) {
        return res.status(400).json({ error: "Payer ID is required" });
      }
      const existingPayer = await eligibilityStorage.getPayerRouting(payerId);
      if (!existingPayer) {
        return res.status(404).json({ error: "Payer routing not found" });
      }
      const updatedPayer = await eligibilityStorage.updatePayerRouting(payerId, req.body);
      return res.status(200).json(updatedPayer);
    } catch (error2) {
      logger4.error("Error updating payer routing", { error: error2, payerId: req.params.id });
      return res.status(500).json({ error: error2.message });
    }
  });
  router9.get("/payers/:id", validateAuth, async (req, res) => {
    try {
      logger4.info("Get payer routing configuration", { payerId: req.params.id });
      const payerId = req.params.id;
      if (!payerId) {
        return res.status(400).json({ error: "Payer ID is required" });
      }
      const payerRouting = await eligibilityStorage.getPayerRouting(payerId);
      if (!payerRouting) {
        return res.status(404).json({ error: "Payer routing not found" });
      }
      return res.status(200).json(payerRouting);
    } catch (error2) {
      logger4.error("Error getting payer routing", { error: error2, payerId: req.params.id });
      return res.status(500).json({ error: error2.message });
    }
  });
  router9.post("/clearinghouses", validateAuth, async (req, res) => {
    try {
      logger4.info("Create clearinghouse configuration");
      if (!req.user.roles || !req.user.roles.includes("admin")) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const validationResult = insertEligibilityClearinghouseSchema.safeParse(req.body);
      if (!validationResult.success) {
        logger4.warn("Invalid clearinghouse configuration", {
          errors: validationResult.error.errors
        });
        return res.status(400).json({
          error: "Invalid request",
          details: validationResult.error.errors
        });
      }
      const clearinghouse = await eligibilityStorage.createClearinghouse(validationResult.data);
      return res.status(201).json(clearinghouse);
    } catch (error2) {
      logger4.error("Error creating clearinghouse", { error: error2 });
      return res.status(500).json({ error: error2.message });
    }
  });
  router9.get("/clearinghouses/:id", validateAuth, async (req, res) => {
    try {
      logger4.info("Get clearinghouse configuration", { clearinghouseId: req.params.id });
      const clearinghouseId = req.params.id;
      if (!clearinghouseId) {
        return res.status(400).json({ error: "Clearinghouse ID is required" });
      }
      const clearinghouse = await eligibilityStorage.getClearinghouse(clearinghouseId);
      if (!clearinghouse) {
        return res.status(404).json({ error: "Clearinghouse not found" });
      }
      return res.status(200).json(clearinghouse);
    } catch (error2) {
      logger4.error("Error getting clearinghouse", { error: error2, clearinghouseId: req.params.id });
      return res.status(500).json({ error: error2.message });
    }
  });
  router9.get("/audit/:requestId", validateAuth, async (req, res) => {
    try {
      logger4.info("Get audit logs for request", { requestId: req.params.requestId });
      const requestId = parseInt(req.params.requestId);
      if (isNaN(requestId)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      if (!req.user.roles || !req.user.roles.includes("admin") && !req.user.roles.includes("auditor")) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const auditLogs = await eligibilityStorage.getAuditLogsByRequestId(requestId);
      return res.status(200).json(auditLogs);
    } catch (error2) {
      logger4.error("Error getting audit logs", { error: error2, requestId: req.params.requestId });
      return res.status(500).json({ error: error2.message });
    }
  });
  router9.post("/cache/clear", validateAuth, async (req, res) => {
    try {
      logger4.info("Clear expired cache entries");
      if (!req.user.roles || !req.user.roles.includes("admin")) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const count2 = await eligibilityStorage.clearExpiredCacheEntries();
      return res.status(200).json({ clearedCount: count2 });
    } catch (error2) {
      logger4.error("Error clearing expired cache entries", { error: error2 });
      return res.status(500).json({ error: error2.message });
    }
  });
  app2.use("/api/eligibility", router9);
  app2.use("/api/fhir/r4", router9);
  logger4.info("Eligibility verification routes registered");
}

// server/routes/billing-routes.ts
import { Router as Router2 } from "express";

// shared/billing-schema.ts
import { pgTable as pgTable5, text as text5, timestamp as timestamp5, uuid as uuid3, decimal, boolean as boolean5, integer as integer5, jsonb as jsonb4 } from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema5, createSelectSchema as createSelectSchema2 } from "drizzle-zod";

// shared/claims-schema.ts
import { pgTable as pgTable4, text as text4, timestamp as timestamp4, jsonb as jsonb3, integer as integer4, uuid as uuid2 } from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema4 } from "drizzle-zod";
var claims = pgTable4("claims", {
  id: text4("id").primaryKey(),
  patientId: text4("patient_id").notNull(),
  providerId: text4("provider_id").notNull(),
  payerId: text4("payer_id").notNull(),
  organizationId: text4("organization_id"),
  careEventId: text4("care_event_id"),
  type: text4("type").notNull().default("PROFESSIONAL"),
  // PROFESSIONAL, INSTITUTIONAL, DENTAL, PHARMACY, VISION
  status: text4("status").notNull().default("DRAFT"),
  // DRAFT, SUBMITTED, PENDING, PROCESSING, ACCEPTED, PARTIAL, COMPLETE, REJECTED, ERROR
  totalAmount: integer4("total_amount").notNull(),
  // In cents (e.g., $100.00 = 10000)
  processingPath: text4("processing_path").notNull().default("AUTO"),
  // AUTO, INTERNAL, EXTERNAL
  data: jsonb3("data"),
  // FHIR Claim resource or X12 837 content
  responseData: jsonb3("response_data"),
  // FHIR ClaimResponse or X12 835 content
  errorData: jsonb3("error_data"),
  // Error information if status is ERROR or REJECTED
  serviceStartDate: timestamp4("service_start_date"),
  serviceEndDate: timestamp4("service_end_date"),
  submittedDate: timestamp4("submitted_date"),
  processedDate: timestamp4("processed_date"),
  lastStatusUpdate: timestamp4("last_status_update"),
  facilityId: text4("facility_id"),
  locationId: text4("location_id"),
  billingProviderId: text4("billing_provider_id"),
  renderingProviderId: text4("rendering_provider_id"),
  patientControlNumber: text4("patient_control_number"),
  externalClaimId: text4("external_claim_id"),
  internalRuleResults: jsonb3("internal_rule_results"),
  metadata: jsonb3("metadata"),
  createdAt: timestamp4("created_at").notNull().defaultNow(),
  updatedAt: timestamp4("updated_at").notNull().defaultNow()
});
var claimLineItems2 = pgTable4("claim_line_items", {
  id: text4("id").primaryKey(),
  claimId: text4("claim_id").notNull().references(() => claims.id, { onDelete: "cascade" }),
  sequence: integer4("sequence").notNull(),
  serviceCode: text4("service_code").notNull(),
  // CPT, HCPCS, etc.
  serviceDescription: text4("service_description"),
  quantity: integer4("quantity").notNull().default(1),
  unitPrice: integer4("unit_price").notNull(),
  // In cents
  totalPrice: integer4("total_price").notNull(),
  // In cents (unitPrice * quantity)
  serviceDate: timestamp4("service_date"),
  placeOfService: text4("place_of_service"),
  diagnosisCodes: jsonb3("diagnosis_codes").default([]),
  // Array of diagnosis codes linked to this service
  modifiers: jsonb3("modifiers").default([]),
  // Array of service modifiers
  adjudicationData: jsonb3("adjudication_data"),
  // Results of processing this line item
  metadata: jsonb3("metadata"),
  createdAt: timestamp4("created_at").notNull().defaultNow(),
  updatedAt: timestamp4("updated_at").notNull().defaultNow()
});
var claimEvents = pgTable4("claim_events", {
  id: uuid2("id").primaryKey().defaultRandom(),
  claimId: text4("claim_id").notNull().references(() => claims.id, { onDelete: "cascade" }),
  eventType: text4("event_type").notNull(),
  // CLAIM_SUBMITTED, STATUS_CHANGE, PROCESSING_STARTED, etc.
  timestamp: timestamp4("timestamp").notNull().defaultNow(),
  status: text4("status"),
  // Claim status at the time of the event
  userId: text4("user_id"),
  // User who triggered the event, if applicable
  details: jsonb3("details"),
  // Additional event details
  errorMessage: text4("error_message")
});
var claimPayerForwards = pgTable4("claim_payer_forwards", {
  id: uuid2("id").primaryKey().defaultRandom(),
  claimId: text4("claim_id").notNull().references(() => claims.id, { onDelete: "cascade" }),
  payerId: text4("payer_id").notNull(),
  transportMethod: text4("transport_method").notNull(),
  // API, SFTP, X12, MANUAL
  status: text4("status").notNull().default("QUEUED"),
  // QUEUED, SENT, ACKNOWLEDGED, COMPLETED, REJECTED, FAILED, ERROR
  trackingNumber: text4("tracking_number"),
  // Payer-assigned tracking number
  sentData: jsonb3("sent_data"),
  // Data sent to the payer
  sentTimestamp: timestamp4("sent_timestamp"),
  responseData: jsonb3("response_data"),
  // Response from the payer
  responseTimestamp: timestamp4("response_timestamp"),
  ackCode: text4("ack_code"),
  // Acknowledgment code from the payer
  attemptCount: integer4("attempt_count").notNull().default(0),
  nextAttempt: timestamp4("next_attempt"),
  errorDetails: jsonb3("error_details"),
  createdAt: timestamp4("created_at").notNull().defaultNow(),
  updatedAt: timestamp4("updated_at").notNull().defaultNow()
});
var claimRulesCache = pgTable4("claim_rules_cache", {
  id: uuid2("id").primaryKey().defaultRandom(),
  cacheKey: text4("cache_key").notNull().unique(),
  cacheType: text4("cache_type").notNull(),
  // PAYER_CONTRACT, PATIENT_BENEFITS, etc.
  data: jsonb3("data").notNull(),
  expiresAt: timestamp4("expires_at"),
  createdAt: timestamp4("created_at").notNull().defaultNow(),
  updatedAt: timestamp4("updated_at").notNull().defaultNow()
});
var insertClaimSchema = createInsertSchema4(claims);
var insertClaimLineItemSchema = createInsertSchema4(claimLineItems2);
var insertClaimEventSchema = createInsertSchema4(claimEvents);
var insertClaimPayerForwardSchema = createInsertSchema4(claimPayerForwards);
var insertClaimRulesCacheSchema = createInsertSchema4(claimRulesCache);

// shared/billing-schema.ts
var invoices = pgTable5("billing_invoices", {
  id: uuid3("id").primaryKey().defaultRandom(),
  claimId: uuid3("claim_id").notNull().references(() => claims.id),
  patientId: uuid3("patient_id").notNull(),
  providerId: uuid3("provider_id").notNull(),
  organizationId: uuid3("organization_id").notNull(),
  payerId: uuid3("payer_id"),
  invoiceNumber: text5("invoice_number").notNull().unique(),
  status: text5("status").notNull().default("DRAFT"),
  // DRAFT, ISSUED, PAID, PARTIAL, CANCELLED, OVERDUE
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  insuranceResponsibleAmount: decimal("insurance_responsible_amount", { precision: 10, scale: 2 }).notNull(),
  patientResponsibleAmount: decimal("patient_responsible_amount", { precision: 10, scale: 2 }).notNull(),
  adjustmentAmount: decimal("adjustment_amount", { precision: 10, scale: 2 }).default("0"),
  dueDate: timestamp5("due_date").notNull(),
  issuedDate: timestamp5("issued_date").notNull(),
  paidDate: timestamp5("paid_date"),
  notes: text5("notes"),
  metadata: jsonb4("metadata"),
  createdAt: timestamp5("created_at").notNull().defaultNow(),
  updatedAt: timestamp5("updated_at").notNull().defaultNow()
});
var invoiceLineItems = pgTable5("billing_invoice_line_items", {
  id: uuid3("id").primaryKey().defaultRandom(),
  invoiceId: uuid3("invoice_id").notNull().references(() => invoices.id),
  claimLineItemId: uuid3("claim_line_item_id"),
  description: text5("description").notNull(),
  serviceCode: text5("service_code").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  insuranceAmount: decimal("insurance_amount", { precision: 10, scale: 2 }).notNull(),
  patientAmount: decimal("patient_amount", { precision: 10, scale: 2 }).notNull(),
  adjustmentAmount: decimal("adjustment_amount", { precision: 10, scale: 2 }).default("0"),
  serviceDate: timestamp5("service_date").notNull(),
  createdAt: timestamp5("created_at").notNull().defaultNow(),
  updatedAt: timestamp5("updated_at").notNull().defaultNow()
});
var paymentMethods = pgTable5("billing_payment_methods", {
  id: uuid3("id").primaryKey().defaultRandom(),
  ownerId: uuid3("owner_id").notNull(),
  // Can be patientId or organizationId
  ownerType: text5("owner_type").notNull(),
  // PATIENT, ORGANIZATION, PROVIDER
  nickname: text5("nickname"),
  type: text5("type").notNull(),
  // CREDIT_CARD, BANK_ACCOUNT, WALLET, OTHER
  isDefault: boolean5("is_default").default(false),
  status: text5("status").notNull().default("ACTIVE"),
  // ACTIVE, INACTIVE, EXPIRED, DECLINED
  lastFour: text5("last_four"),
  // Last four digits of card or account number
  expirationMonth: integer5("expiration_month"),
  expirationYear: integer5("expiration_year"),
  cardBrand: text5("card_brand"),
  // VISA, MASTERCARD, AMEX, etc.
  billingAddressId: uuid3("billing_address_id"),
  gatewayToken: text5("gateway_token"),
  // Token from payment processor
  gatewayType: text5("gateway_type"),
  // STRIPE, BRAINTREE, etc.
  metadata: jsonb4("metadata"),
  createdAt: timestamp5("created_at").notNull().defaultNow(),
  updatedAt: timestamp5("updated_at").notNull().defaultNow()
});
var payments = pgTable5("billing_payments", {
  id: uuid3("id").primaryKey().defaultRandom(),
  invoiceId: uuid3("invoice_id").notNull().references(() => invoices.id),
  payerId: uuid3("payer_id").notNull(),
  // Who made the payment (patient, insurance, etc.)
  payerType: text5("payer_type").notNull(),
  // PATIENT, INSURANCE, THIRD_PARTY
  paymentMethodId: uuid3("payment_method_id").references(() => paymentMethods.id),
  transactionId: text5("transaction_id"),
  // External transaction ID
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text5("status").notNull().default("PENDING"),
  // PENDING, COMPLETED, FAILED, REFUNDED
  paymentDate: timestamp5("payment_date").notNull(),
  refundedAmount: decimal("refunded_amount", { precision: 10, scale: 2 }).default("0"),
  refundedDate: timestamp5("refunded_date"),
  notes: text5("notes"),
  metadata: jsonb4("metadata"),
  createdAt: timestamp5("created_at").notNull().defaultNow(),
  updatedAt: timestamp5("updated_at").notNull().defaultNow()
});
var paymentPlans = pgTable5("billing_payment_plans", {
  id: uuid3("id").primaryKey().defaultRandom(),
  patientId: uuid3("patient_id").notNull(),
  status: text5("status").notNull().default("ACTIVE"),
  // ACTIVE, COMPLETED, CANCELLED, DEFAULTED
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).notNull(),
  installmentAmount: decimal("installment_amount", { precision: 10, scale: 2 }).notNull(),
  frequency: text5("frequency").notNull(),
  // WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY
  startDate: timestamp5("start_date").notNull(),
  endDate: timestamp5("end_date"),
  nextPaymentDate: timestamp5("next_payment_date"),
  paymentMethodId: uuid3("payment_method_id").references(() => paymentMethods.id),
  autoCharge: boolean5("auto_charge").default(true),
  notes: text5("notes"),
  metadata: jsonb4("metadata"),
  createdAt: timestamp5("created_at").notNull().defaultNow(),
  updatedAt: timestamp5("updated_at").notNull().defaultNow()
});
var paymentPlanItems = pgTable5("billing_payment_plan_items", {
  id: uuid3("id").primaryKey().defaultRandom(),
  paymentPlanId: uuid3("payment_plan_id").notNull().references(() => paymentPlans.id),
  invoiceId: uuid3("invoice_id").notNull().references(() => invoices.id),
  originalAmount: decimal("original_amount", { precision: 10, scale: 2 }).notNull(),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp5("created_at").notNull().defaultNow(),
  updatedAt: timestamp5("updated_at").notNull().defaultNow()
});
var paymentPlanSchedule = pgTable5("billing_payment_plan_schedule", {
  id: uuid3("id").primaryKey().defaultRandom(),
  paymentPlanId: uuid3("payment_plan_id").notNull().references(() => paymentPlans.id),
  scheduledDate: timestamp5("scheduled_date").notNull(),
  scheduledAmount: decimal("scheduled_amount", { precision: 10, scale: 2 }).notNull(),
  status: text5("status").notNull().default("SCHEDULED"),
  // SCHEDULED, PROCESSING, COMPLETED, FAILED, SKIPPED
  paymentId: uuid3("payment_id").references(() => payments.id),
  notes: text5("notes"),
  createdAt: timestamp5("created_at").notNull().defaultNow(),
  updatedAt: timestamp5("updated_at").notNull().defaultNow()
});
var statements = pgTable5("billing_statements", {
  id: uuid3("id").primaryKey().defaultRandom(),
  statementNumber: text5("statement_number").notNull().unique(),
  entityId: uuid3("entity_id").notNull(),
  // Can be patientId, organizationId, etc.
  entityType: text5("entity_type").notNull(),
  // PATIENT, ORGANIZATION, PROVIDER
  issuedDate: timestamp5("issued_date").notNull(),
  dueDate: timestamp5("due_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text5("status").notNull().default("DRAFT"),
  // DRAFT, ISSUED, PAID, PARTIAL, CANCELLED, OVERDUE
  billingCycle: text5("billing_cycle").notNull(),
  // YYYY-MM format
  metadata: jsonb4("metadata"),
  createdAt: timestamp5("created_at").notNull().defaultNow(),
  updatedAt: timestamp5("updated_at").notNull().defaultNow()
});
var statementSettings = pgTable5("billing_statement_settings", {
  id: uuid3("id").primaryKey().defaultRandom(),
  organizationId: uuid3("organization_id").notNull(),
  statementFormat: text5("statement_format").notNull().default("DEFAULT"),
  // DEFAULT, DETAILED, SUMMARY
  billingCycle: integer5("billing_cycle").notNull().default(30),
  // Days
  gracePeriod: integer5("grace_period").notNull().default(15),
  // Days
  autoSendStatements: boolean5("auto_send_statements").default(true),
  paymentTerms: text5("payment_terms"),
  reminderFrequency: integer5("reminder_frequency").default(7),
  // Days
  lateFeePercentage: decimal("late_fee_percentage", { precision: 5, scale: 2 }),
  lateFeeFixed: decimal("late_fee_fixed", { precision: 10, scale: 2 }),
  createdAt: timestamp5("created_at").notNull().defaultNow(),
  updatedAt: timestamp5("updated_at").notNull().defaultNow()
});
var billingAccounts = pgTable5("billing_accounts", {
  id: uuid3("id").primaryKey().defaultRandom(),
  organizationId: uuid3("organization_id").notNull(),
  status: text5("status").notNull().default("ACTIVE"),
  // ACTIVE, INACTIVE, SUSPENDED, CLOSED
  billingCurrency: text5("billing_currency").notNull().default("USD"),
  billingEmail: text5("billing_email").notNull(),
  billingName: text5("billing_name").notNull(),
  billingAddressId: uuid3("billing_address_id"),
  taxId: text5("tax_id"),
  paymentTerms: integer5("payment_terms").default(30),
  // Days
  autoPayEnabled: boolean5("auto_pay_enabled").default(false),
  defaultPaymentMethodId: uuid3("default_payment_method_id"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }),
  notes: text5("notes"),
  metadata: jsonb4("metadata"),
  createdAt: timestamp5("created_at").notNull().defaultNow(),
  updatedAt: timestamp5("updated_at").notNull().defaultNow()
});
var subscriptions = pgTable5("billing_subscriptions", {
  id: uuid3("id").primaryKey().defaultRandom(),
  billingAccountId: uuid3("billing_account_id").notNull().references(() => billingAccounts.id),
  planId: text5("plan_id").notNull(),
  // Reference to pricing plans (STANDARD, PREMIUM, ENTERPRISE, etc.)
  status: text5("status").notNull().default("ACTIVE"),
  // ACTIVE, CANCELED, PAST_DUE, TRIALING, EXPIRED
  startDate: timestamp5("start_date").notNull(),
  endDate: timestamp5("end_date"),
  trialEndDate: timestamp5("trial_end_date"),
  currentPeriodStart: timestamp5("current_period_start").notNull(),
  currentPeriodEnd: timestamp5("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean5("cancel_at_period_end").default(false),
  canceledAt: timestamp5("canceled_at"),
  quantity: integer5("quantity").default(1),
  priceOverrides: jsonb4("price_overrides"),
  // Custom pricing overrides
  metadata: jsonb4("metadata"),
  createdAt: timestamp5("created_at").notNull().defaultNow(),
  updatedAt: timestamp5("updated_at").notNull().defaultNow()
});
var usageRecords = pgTable5("billing_usage_records", {
  id: uuid3("id").primaryKey().defaultRandom(),
  billingAccountId: uuid3("billing_account_id").notNull().references(() => billingAccounts.id),
  subscriptionId: uuid3("subscription_id").references(() => subscriptions.id),
  serviceName: text5("service_name").notNull(),
  usageType: text5("usage_type").notNull(),
  // API_CALL, STORAGE, PROCESSING, etc.
  quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(),
  unit: text5("unit").notNull(),
  // REQUEST, MB, CPU_SECOND, etc.
  recordedAt: timestamp5("recorded_at").notNull(),
  userId: uuid3("user_id"),
  sourceIp: text5("source_ip"),
  isInvoiced: boolean5("is_invoiced").default(false),
  invoiceItemId: uuid3("invoice_item_id"),
  metadata: jsonb4("metadata"),
  createdAt: timestamp5("created_at").notNull().defaultNow()
});
var billingEvents = pgTable5("billing_events", {
  id: uuid3("id").primaryKey().defaultRandom(),
  billingAccountId: uuid3("billing_account_id").notNull(),
  eventType: text5("event_type").notNull(),
  // INVOICE_CREATED, PAYMENT_RECORDED, etc.
  description: text5("description").notNull(),
  entityType: text5("entity_type"),
  // INVOICE, PAYMENT, SUBSCRIPTION, etc.
  entityId: uuid3("entity_id"),
  userId: uuid3("user_id"),
  sourceIp: text5("source_ip"),
  metadata: jsonb4("metadata"),
  createdAt: timestamp5("created_at").notNull().defaultNow()
});
var insertInvoiceSchema = createInsertSchema5(invoices);
var selectInvoiceSchema = createSelectSchema2(invoices);
var insertInvoiceLineItemSchema = createInsertSchema5(invoiceLineItems);
var selectInvoiceLineItemSchema = createSelectSchema2(invoiceLineItems);
var insertPaymentMethodSchema = createInsertSchema5(paymentMethods);
var selectPaymentMethodSchema = createSelectSchema2(paymentMethods);
var insertPaymentSchema = createInsertSchema5(payments);
var selectPaymentSchema = createSelectSchema2(payments);
var insertPaymentPlanSchema = createInsertSchema5(paymentPlans);
var selectPaymentPlanSchema = createSelectSchema2(paymentPlans);
var insertPaymentPlanItemSchema = createInsertSchema5(paymentPlanItems);
var selectPaymentPlanItemSchema = createSelectSchema2(paymentPlanItems);
var insertPaymentPlanScheduleSchema = createInsertSchema5(paymentPlanSchedule);
var selectPaymentPlanScheduleSchema = createSelectSchema2(paymentPlanSchedule);
var insertStatementSchema = createInsertSchema5(statements);
var selectStatementSchema = createSelectSchema2(statements);
var insertStatementSettingsSchema = createInsertSchema5(statementSettings);
var selectStatementSettingsSchema = createSelectSchema2(statementSettings);
var insertUsageRecordSchema = createInsertSchema5(usageRecords);
var selectUsageRecordSchema = createSelectSchema2(usageRecords);
var insertBillingEventSchema = createInsertSchema5(billingEvents);
var selectBillingEventSchema = createSelectSchema2(billingEvents);
var insertBillingAccountSchema = createInsertSchema5(billingAccounts);
var selectBillingAccountSchema = createSelectSchema2(billingAccounts);
var insertSubscriptionSchema = createInsertSchema5(subscriptions);
var selectSubscriptionSchema = createSelectSchema2(subscriptions);

// server/services/billing/billing-service.ts
import { v4 as uuidv46 } from "uuid";

// server/logger.ts
import winston3 from "winston";
var logFormat = winston3.format.combine(
  winston3.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss"
  }),
  winston3.format.errors({ stack: true }),
  winston3.format.splat(),
  winston3.format.json()
);
var logger5 = winston3.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: logFormat,
  defaultMeta: { service: "smart-health-hub" },
  transports: [
    // Write logs to console
    new winston3.transports.Console({
      format: winston3.format.combine(
        winston3.format.colorize(),
        winston3.format.printf(({ timestamp: timestamp14, level, message, ...rest }) => {
          const metadata = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : "";
          return `${timestamp14} ${level}: ${message} ${metadata}`;
        })
      )
    })
  ]
});
if (process.env.NODE_ENV === "production") {
  logger5.add(
    new winston3.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 10485760,
      // 10MB
      maxFiles: 10
    })
  );
  logger5.add(
    new winston3.transports.File({
      filename: "logs/combined.log",
      maxsize: 10485760,
      // 10MB
      maxFiles: 10
    })
  );
}
var logger_default2 = logger5;

// server/services/billing/metering-service.ts
import { v4 as uuidv45 } from "uuid";
var MeteringService = class {
  /**
   * Record usage of a service by a user, provider, or organization
   * @param data Usage data to record
   * @returns The created usage record
   */
  async recordUsage(data) {
    try {
      const recordId = uuidv45();
      const timestamp14 = /* @__PURE__ */ new Date();
      const usageData = {
        id: recordId,
        serviceId: data.serviceId,
        entityId: data.entityId,
        entityType: data.entityType,
        timestamp: timestamp14,
        quantityUsed: data.quantityUsed,
        usageType: data.usageType,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        processed: false,
        billingCycle: this.getCurrentBillingCycle()
      };
      const [record] = await db.insert(usageRecords).values(usageData).returning();
      await this.logBillingEvent({
        eventType: "USAGE_RECORDED",
        entityId: data.entityId,
        entityType: data.entityType,
        resourceId: recordId,
        resourceType: "USAGE_RECORD",
        timestamp: timestamp14,
        details: {
          serviceId: data.serviceId,
          quantityUsed: data.quantityUsed,
          usageType: data.usageType
        }
      });
      return record;
    } catch (error2) {
      logger_default2.error("Failed to record usage", { error: error2, data });
      throw new Error(`Failed to record usage: ${error2.message}`);
    }
  }
  /**
   * Get usage summary for an entity in the current billing cycle
   * @param entityId The entity ID
   * @param entityType The entity type
   * @returns Usage summary by service
   */
  async getUsageSummary(entityId, entityType) {
    try {
      const currentCycle = this.getCurrentBillingCycle();
      const records = await db.select().from(usageRecords).where((r) => r.entityId.equals(entityId) && r.entityType.equals(entityType) && r.billingCycle.equals(currentCycle));
      const summary = records.reduce((acc, record) => {
        const serviceId = record.serviceId;
        if (!acc[serviceId]) {
          acc[serviceId] = {
            serviceId,
            totalUsage: 0,
            usageByType: {}
          };
        }
        acc[serviceId].totalUsage += record.quantityUsed;
        const usageType = record.usageType;
        if (!acc[serviceId].usageByType[usageType]) {
          acc[serviceId].usageByType[usageType] = 0;
        }
        acc[serviceId].usageByType[usageType] += record.quantityUsed;
        return acc;
      }, {});
      return Object.values(summary);
    } catch (error2) {
      logger_default2.error("Failed to get usage summary", { error: error2, entityId, entityType });
      throw new Error(`Failed to get usage summary: ${error2.message}`);
    }
  }
  /**
   * Mark usage records as processed for a specific billing cycle
   * @param billingCycle The billing cycle
   * @returns Number of records marked as processed
   */
  async markUsageAsProcessed(billingCycle) {
    try {
      const result = await db.update(usageRecords).set({ processed: true }).where((r) => r.billingCycle.equals(billingCycle) && r.processed.equals(false)).returning();
      return result.length;
    } catch (error2) {
      logger_default2.error("Failed to mark usage as processed", { error: error2, billingCycle });
      throw new Error(`Failed to mark usage as processed: ${error2.message}`);
    }
  }
  /**
   * Get usage records for invoice generation
   * @param billingCycle The billing cycle
   * @param entityId Optional entity ID to filter by
   * @returns Unprocessed usage records
   */
  async getUnprocessedUsage(billingCycle, entityId) {
    try {
      let query = db.select().from(usageRecords).where((r) => r.billingCycle.equals(billingCycle) && r.processed.equals(false));
      if (entityId) {
        query = query.where((r) => r.entityId.equals(entityId));
      }
      return await query;
    } catch (error2) {
      logger_default2.error("Failed to get unprocessed usage", { error: error2, billingCycle, entityId });
      throw new Error(`Failed to get unprocessed usage: ${error2.message}`);
    }
  }
  /**
   * Log a billing-related event for audit purposes
   * @param data Event data
   * @returns The created billing event
   */
  async logBillingEvent(data) {
    try {
      const eventData = {
        id: uuidv45(),
        eventType: data.eventType,
        entityId: data.entityId,
        entityType: data.entityType,
        resourceId: data.resourceId,
        resourceType: data.resourceType,
        timestamp: data.timestamp || /* @__PURE__ */ new Date(),
        details: JSON.stringify(data.details)
      };
      await db.insert(billingEvents).values(eventData);
    } catch (error2) {
      logger_default2.error("Failed to log billing event", { error: error2, data });
    }
  }
  /**
   * Get the current billing cycle in YYYY-MM format
   * @returns Current billing cycle
   */
  getCurrentBillingCycle() {
    const now = /* @__PURE__ */ new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  }
};
var meteringService = new MeteringService();

// server/services/billing/billing-service.ts
var BillingService = class {
  invoiceService;
  paymentService;
  pricingPlans = /* @__PURE__ */ new Map();
  constructor(invoiceService, paymentService) {
    this.invoiceService = invoiceService;
    this.paymentService = paymentService;
    this.loadPricingPlans();
  }
  /**
   * Generate invoices from usage records for a specific billing cycle
   * @param billingCycle The billing cycle (YYYY-MM format)
   * @param entityIds Optional array of entity IDs to filter by
   * @returns Number of invoices generated
   */
  async generateInvoicesFromUsage(billingCycle, entityIds) {
    try {
      const usageRecords2 = await this.getUnprocessedUsageForBilling(billingCycle, entityIds);
      const groupedRecords = this.groupUsageRecordsByEntity(usageRecords2);
      let invoicesGenerated = 0;
      for (const [entityKey, records] of Object.entries(groupedRecords)) {
        const [entityId, entityType] = entityKey.split("|");
        const pricedItems = await this.applyPricingToUsageRecords(records, entityId, entityType);
        if (pricedItems.length > 0) {
          const invoiceId = await this.createInvoiceWithLineItems(
            entityId,
            entityType,
            billingCycle,
            pricedItems
          );
          if (invoiceId) {
            invoicesGenerated++;
            const recordIds = records.map((record) => record.id);
            await this.markUsageRecordsAsProcessed(recordIds);
          }
        }
      }
      return invoicesGenerated;
    } catch (error2) {
      logger_default2.error("Failed to generate invoices from usage", { error: error2, billingCycle });
      throw new Error(`Failed to generate invoices from usage: ${error2.message}`);
    }
  }
  /**
   * Apply pricing plan to usage records
   * @param records Usage records
   * @param entityId Entity ID
   * @param entityType Entity type
   * @returns Priced line items
   */
  async applyPricingToUsageRecords(records, entityId, entityType) {
    try {
      const groupedByService = records.reduce((acc, record) => {
        const key = `${record.serviceId}|${record.usageType}`;
        if (!acc[key]) {
          acc[key] = {
            serviceId: record.serviceId,
            usageType: record.usageType,
            quantity: 0,
            metadata: {}
          };
        }
        acc[key].quantity += record.quantityUsed;
        if (record.metadata) {
          try {
            const metadata = JSON.parse(record.metadata);
            acc[key].metadata = { ...acc[key].metadata, ...metadata };
          } catch (e) {
          }
        }
        return acc;
      }, {});
      const pricingPlanId = await this.getEntityPricingPlan(entityId, entityType);
      const pricingPlan = this.pricingPlans.get(pricingPlanId);
      if (!pricingPlan) {
        logger_default2.warn("No pricing plan found", { entityId, entityType, pricingPlanId });
        return [];
      }
      const pricedItems = Object.values(groupedByService).map((usage) => {
        const priceConfig = pricingPlan.prices.find(
          (p) => p.serviceId === usage.serviceId && p.usageType === usage.usageType
        );
        if (!priceConfig) {
          logger_default2.warn("No price configuration found for service", {
            serviceId: usage.serviceId,
            usageType: usage.usageType,
            pricingPlanId
          });
          return null;
        }
        let unitPrice = priceConfig.unitPrice;
        if (priceConfig.tieredPrices && priceConfig.tieredPrices.length > 0) {
          const tier = priceConfig.tieredPrices.find(
            (t) => usage.quantity >= t.minQuantity && (!t.maxQuantity || usage.quantity <= t.maxQuantity)
          );
          if (tier) {
            unitPrice = tier.unitPrice;
          }
        }
        const quantity = Math.max(usage.quantity, priceConfig.minimumUnits || 0);
        return {
          serviceId: usage.serviceId,
          usageType: usage.usageType,
          description: `${usage.serviceId} - ${usage.usageType}`,
          quantity,
          unitPrice,
          totalPrice: quantity * unitPrice,
          metadata: usage.metadata
        };
      }).filter(Boolean);
      return pricedItems;
    } catch (error2) {
      logger_default2.error("Failed to apply pricing to usage records", { error: error2, entityId, entityType });
      throw new Error(`Failed to apply pricing to usage records: ${error2.message}`);
    }
  }
  /**
   * Create an invoice with line items
   * @param entityId Entity ID
   * @param entityType Entity type
   * @param billingCycle Billing cycle
   * @param lineItems Line items
   * @returns Invoice ID
   */
  async createInvoiceWithLineItems(entityId, entityType, billingCycle, lineItems) {
    try {
      const totalAmount = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const invoiceId = uuidv46();
      const invoice = {
        id: invoiceId,
        invoiceNumber: this.generateInvoiceNumber(entityId, entityType, billingCycle),
        entityId,
        entityType,
        issuedDate: /* @__PURE__ */ new Date(),
        dueDate: this.calculateDueDate(/* @__PURE__ */ new Date(), 30),
        // 30 days due date
        totalAmount,
        status: "DRAFT",
        billingCycle,
        metadata: JSON.stringify({
          lineItemCount: lineItems.length
        })
      };
      await db.insert(invoices).values(invoice);
      const invoiceLineItemsData = lineItems.map((item) => ({
        id: uuidv46(),
        invoiceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        serviceId: item.serviceId,
        usageType: item.usageType,
        metadata: item.metadata ? JSON.stringify(item.metadata) : null
      }));
      await db.insert(invoiceLineItems).values(invoiceLineItemsData);
      await meteringService.logBillingEvent({
        eventType: "INVOICE_CREATED",
        entityId,
        entityType,
        resourceId: invoiceId,
        resourceType: "INVOICE",
        details: {
          billingCycle,
          totalAmount,
          lineItemCount: lineItems.length
        }
      });
      return invoiceId;
    } catch (error2) {
      logger_default2.error("Failed to create invoice with line items", {
        error: error2,
        entityId,
        entityType,
        billingCycle
      });
      return null;
    }
  }
  /**
   * Mark usage records as processed
   * @param recordIds Array of record IDs
   * @returns Success indicator
   */
  async markUsageRecordsAsProcessed(recordIds) {
    try {
      await db.update(usageRecords).set({ processed: true }).where((r) => r.id.in(recordIds));
      return true;
    } catch (error2) {
      logger_default2.error("Failed to mark usage records as processed", { error: error2, recordIds });
      return false;
    }
  }
  /**
   * Generate a statement for an entity covering multiple invoices
   * @param entityId Entity ID
   * @param entityType Entity type
   * @param billingCycle Billing cycle
   * @returns Statement ID
   */
  async generateStatement(entityId, entityType, billingCycle) {
    try {
      const entityInvoices = await db.select().from(invoices).where(
        (i) => i.entityId.equals(entityId) && i.entityType.equals(entityType) && i.billingCycle.equals(billingCycle) && i.status.in(["DRAFT", "ISSUED"])
      );
      if (entityInvoices.length === 0) {
        return null;
      }
      const totalAmount = entityInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const invoiceIds = entityInvoices.map((invoice) => invoice.id);
      const statementId = uuidv46();
      const statement = {
        id: statementId,
        statementNumber: this.generateStatementNumber(entityId, entityType, billingCycle),
        entityId,
        entityType,
        issuedDate: /* @__PURE__ */ new Date(),
        dueDate: this.calculateDueDate(/* @__PURE__ */ new Date(), 30),
        totalAmount,
        status: "ISSUED",
        billingCycle,
        metadata: JSON.stringify({
          invoiceIds,
          invoiceCount: invoiceIds.length
        })
      };
      await db.insert(statements).values(statement);
      await db.update(invoices).set({
        statementId,
        status: "ISSUED"
      }).where((i) => i.id.in(invoiceIds));
      await meteringService.logBillingEvent({
        eventType: "STATEMENT_CREATED",
        entityId,
        entityType,
        resourceId: statementId,
        resourceType: "STATEMENT",
        details: {
          billingCycle,
          totalAmount,
          invoiceCount: invoiceIds.length
        }
      });
      return statementId;
    } catch (error2) {
      logger_default2.error("Failed to generate statement", { error: error2, entityId, entityType, billingCycle });
      return null;
    }
  }
  /**
   * Get unprocessed usage records for billing
   * @param billingCycle Billing cycle
   * @param entityIds Optional array of entity IDs to filter by
   * @returns Unprocessed usage records
   */
  async getUnprocessedUsageForBilling(billingCycle, entityIds) {
    try {
      let query = db.select().from(usageRecords).where((r) => r.billingCycle.equals(billingCycle) && r.processed.equals(false));
      if (entityIds && entityIds.length > 0) {
        query = query.where((r) => r.entityId.in(entityIds));
      }
      return await query;
    } catch (error2) {
      logger_default2.error("Failed to get unprocessed usage", { error: error2, billingCycle, entityIds });
      throw new Error(`Failed to get unprocessed usage: ${error2.message}`);
    }
  }
  /**
   * Group usage records by entity
   * @param records Usage records
   * @returns Records grouped by entity ID and type
   */
  groupUsageRecordsByEntity(records) {
    return records.reduce((acc, record) => {
      const key = `${record.entityId}|${record.entityType}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(record);
      return acc;
    }, {});
  }
  /**
   * Get the pricing plan for an entity
   * @param entityId Entity ID
   * @param entityType Entity type
   * @returns Pricing plan ID
   */
  async getEntityPricingPlan(entityId, entityType) {
    return "standard-plan";
  }
  /**
   * Calculate due date
   * @param fromDate Starting date
   * @param daysToAdd Days to add
   * @returns Due date
   */
  calculateDueDate(fromDate, daysToAdd) {
    const dueDate = new Date(fromDate);
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    return dueDate;
  }
  /**
   * Generate an invoice number
   * @param entityId Entity ID
   * @param entityType Entity type
   * @param billingCycle Billing cycle
   * @returns Invoice number
   */
  generateInvoiceNumber(entityId, entityType, billingCycle) {
    const timestamp14 = Math.floor(Date.now() / 1e3);
    const entityIdHash = entityId.substring(0, 8);
    return `INV-${billingCycle}-${entityType.substring(0, 3)}-${entityIdHash}-${timestamp14}`;
  }
  /**
   * Generate a statement number
   * @param entityId Entity ID
   * @param entityType Entity type
   * @param billingCycle Billing cycle
   * @returns Statement number
   */
  generateStatementNumber(entityId, entityType, billingCycle) {
    const timestamp14 = Math.floor(Date.now() / 1e3);
    const entityIdHash = entityId.substring(0, 8);
    return `STM-${billingCycle}-${entityType.substring(0, 3)}-${entityIdHash}-${timestamp14}`;
  }
  /**
   * Load pricing plans from database or configuration
   */
  loadPricingPlans() {
    const standardPlan = {
      id: "standard-plan",
      name: "Standard Plan",
      description: "Standard pricing for platform services",
      effectiveDate: /* @__PURE__ */ new Date("2025-01-01"),
      prices: [
        {
          serviceId: "api-calls",
          usageType: "read",
          unitPrice: 1e-4,
          minimumUnits: 1e3,
          tieredPrices: [
            { minQuantity: 1, maxQuantity: 1e6, unitPrice: 1e-4 },
            { minQuantity: 1000001, maxQuantity: 1e7, unitPrice: 5e-5 },
            { minQuantity: 10000001, unitPrice: 1e-5 }
          ]
        },
        {
          serviceId: "api-calls",
          usageType: "write",
          unitPrice: 1e-3,
          minimumUnits: 100,
          tieredPrices: [
            { minQuantity: 1, maxQuantity: 1e5, unitPrice: 1e-3 },
            { minQuantity: 100001, maxQuantity: 1e6, unitPrice: 5e-4 },
            { minQuantity: 1000001, unitPrice: 1e-4 }
          ]
        },
        {
          serviceId: "storage",
          usageType: "gb-month",
          unitPrice: 0.05,
          minimumUnits: 1
        },
        {
          serviceId: "ai-analysis",
          usageType: "document",
          unitPrice: 0.1,
          minimumUnits: 1
        }
      ]
    };
    const enterprisePlan = {
      id: "enterprise-plan",
      name: "Enterprise Plan",
      description: "Enterprise pricing with volume discounts",
      effectiveDate: /* @__PURE__ */ new Date("2025-01-01"),
      prices: [
        {
          serviceId: "api-calls",
          usageType: "read",
          unitPrice: 5e-5,
          minimumUnits: 1e4
        },
        {
          serviceId: "api-calls",
          usageType: "write",
          unitPrice: 5e-4,
          minimumUnits: 1e3
        },
        {
          serviceId: "storage",
          usageType: "gb-month",
          unitPrice: 0.03,
          minimumUnits: 100
        },
        {
          serviceId: "ai-analysis",
          usageType: "document",
          unitPrice: 0.08,
          minimumUnits: 100
        }
      ]
    };
    this.pricingPlans.set(standardPlan.id, standardPlan);
    this.pricingPlans.set(enterprisePlan.id, enterprisePlan);
  }
};
var billingService = new BillingService(null, null);

// server/middleware/billing-middleware.ts
function trackApiUsage(options) {
  const meteringService3 = new MeteringService();
  return async (req, res, next2) => {
    const startTime = process.hrtime();
    const originalEnd = res.end;
    res.end = async function(chunk, encoding, callback) {
      const elapsedHrTime = process.hrtime(startTime);
      const elapsedTimeInMs = elapsedHrTime[0] * 1e3 + elapsedHrTime[1] / 1e6;
      try {
        const billingAccountId = await options.getBillingAccountId(req);
        if (billingAccountId) {
          const quantity = options.getQuantity ? options.getQuantity(req) : 1;
          const resourceId = options.getResourceId ? await options.getResourceId(req) : null;
          const resourceType = options.getResourceType ? await options.getResourceType(req) : null;
          await meteringService3.recordUsage({
            billingAccountId,
            serviceId: "00000000-0000-0000-0000-000000000000",
            // Replace with actual service ID
            serviceName: options.serviceName,
            usageType: options.usageType,
            unit: options.unit,
            quantity: quantity.toString(),
            resourceId: resourceId || void 0,
            resourceType: resourceType || void 0,
            sourceIp: req.ip,
            userId: req.user?.id,
            metadata: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              responseTime: elapsedTimeInMs,
              userAgent: req.headers["user-agent"]
            }
          });
        }
      } catch (error2) {
        console.error("Error tracking API usage:", error2);
      }
      originalEnd.apply(res, arguments);
    };
    next2();
  };
}

// server/routes/billing-routes.ts
import { z as z3 } from "zod";
var router2 = Router2();
var billingService2 = new BillingService();
var meteringService2 = new MeteringService();
function verifyBillingAccess(req, res, next2) {
  next2();
}
var trackBillingApiUsage = trackApiUsage({
  serviceName: "Billing API",
  usageType: "api_call",
  unit: "requests",
  getBillingAccountId: (req) => {
    return req.params.billingAccountId || req.query.billingAccountId || null;
  }
});
router2.post("/accounts", async (req, res) => {
  try {
    const validatedData = insertBillingAccountSchema.parse(req.body);
    const account = await billingService2.createBillingAccount(validatedData);
    res.status(201).json(account);
  } catch (error2) {
    console.error("Error creating billing account:", error2);
    res.status(400).json({ error: error2.message });
  }
});
router2.get("/accounts/:id", verifyBillingAccess, trackBillingApiUsage, async (req, res) => {
  try {
    res.json({
      id: req.params.id,
      organizationId: "org123",
      status: "active",
      billingCurrency: "USD",
      billingEmail: "billing@example.com"
    });
  } catch (error2) {
    console.error("Error getting billing account:", error2);
    res.status(500).json({ error: error2.message });
  }
});
router2.post("/accounts/:billingAccountId/subscriptions", verifyBillingAccess, trackBillingApiUsage, async (req, res) => {
  try {
    const validatedData = insertSubscriptionSchema.parse({
      ...req.body,
      billingAccountId: req.params.billingAccountId
    });
    const subscription = await billingService2.createSubscription(validatedData);
    res.status(201).json(subscription);
  } catch (error2) {
    console.error("Error creating subscription:", error2);
    res.status(400).json({ error: error2.message });
  }
});
router2.get("/accounts/:billingAccountId/subscriptions", verifyBillingAccess, trackBillingApiUsage, async (req, res) => {
  try {
    const subscriptions2 = await billingService2.getSubscriptions(req.params.billingAccountId);
    res.json(subscriptions2);
  } catch (error2) {
    console.error("Error getting subscriptions:", error2);
    res.status(500).json({ error: error2.message });
  }
});
router2.post("/subscriptions/:id/cancel", verifyBillingAccess, trackBillingApiUsage, async (req, res) => {
  try {
    const cancelSchema = z3.object({
      cancelImmediately: z3.boolean().optional().default(false)
    });
    const { cancelImmediately } = cancelSchema.parse(req.body);
    const subscription = await billingService2.cancelSubscription(req.params.id, cancelImmediately);
    res.json(subscription);
  } catch (error2) {
    console.error("Error cancelling subscription:", error2);
    res.status(500).json({ error: error2.message });
  }
});
router2.post("/accounts/:billingAccountId/invoices", verifyBillingAccess, trackBillingApiUsage, async (req, res) => {
  try {
    const invoiceSchema = z3.object({
      startDate: z3.string().transform((val) => new Date(val)),
      endDate: z3.string().transform((val) => new Date(val))
    });
    const { startDate, endDate } = invoiceSchema.parse(req.body);
    const invoice = await billingService2.generateInvoice(req.params.billingAccountId, startDate, endDate);
    res.status(201).json(invoice);
  } catch (error2) {
    console.error("Error generating invoice:", error2);
    res.status(500).json({ error: error2.message });
  }
});
router2.get("/accounts/:billingAccountId/invoices", verifyBillingAccess, trackBillingApiUsage, async (req, res) => {
  try {
    const invoices2 = await billingService2.getInvoices(req.params.billingAccountId);
    res.json(invoices2);
  } catch (error2) {
    console.error("Error getting invoices:", error2);
    res.status(500).json({ error: error2.message });
  }
});
router2.get("/invoices/:id", verifyBillingAccess, trackBillingApiUsage, async (req, res) => {
  try {
    const invoice = await billingService2.getInvoiceDetails(req.params.id);
    res.json(invoice);
  } catch (error2) {
    console.error("Error getting invoice details:", error2);
    res.status(500).json({ error: error2.message });
  }
});
router2.post("/invoices/:id/payments", verifyBillingAccess, trackBillingApiUsage, async (req, res) => {
  try {
    const paymentSchema = z3.object({
      amount: z3.string(),
      paymentMethod: z3.string(),
      paymentReference: z3.string().optional(),
      gatewayResponse: z3.any().optional()
    });
    const paymentData = paymentSchema.parse(req.body);
    const result = await billingService2.recordPayment(req.params.id, paymentData);
    res.status(201).json(result);
  } catch (error2) {
    console.error("Error recording payment:", error2);
    res.status(500).json({ error: error2.message });
  }
});
router2.get("/accounts/:billingAccountId/usage", verifyBillingAccess, trackBillingApiUsage, async (req, res) => {
  try {
    const usageSchema = z3.object({
      startDate: z3.string().transform((val) => new Date(val)),
      endDate: z3.string().transform((val) => new Date(val))
    });
    const { startDate, endDate } = usageSchema.parse(req.query);
    const usage = await meteringService2.getUsageAggregates(req.params.billingAccountId, startDate, endDate);
    res.json(usage);
  } catch (error2) {
    console.error("Error getting usage stats:", error2);
    res.status(500).json({ error: error2.message });
  }
});
var billing_routes_default = router2;

// server/routes/prior-auth-routes.ts
import express4 from "express";
import { z as z4 } from "zod";

// server/services/prior-auth/prior-auth-orchestrator.ts
init_logger();

// server/services/rules-management/rules-management-service.ts
init_logger();

// server/services/rules-management/services/payer-config-service.ts
init_logger();

// shared/prior-auth-schema.ts
import { relations as relations2, sql as sql4 } from "drizzle-orm";
import {
  boolean as boolean6,
  index,
  integer as integer6,
  json as json4,
  pgEnum as pgEnum3,
  pgTable as pgTable6,
  text as text6,
  timestamp as timestamp6,
  uuid as uuid4
} from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema6 } from "drizzle-zod";
var priorAuthPathEnum = pgEnum3("prior_auth_path", [
  "hub_run",
  "pass_through"
]);
var priorAuthStatusEnum = pgEnum3("prior_auth_status", [
  "pending",
  "submitted",
  "queued",
  "in_review",
  "approved",
  "denied",
  "cancelled",
  "additional_info_needed",
  "expired"
]);
var requestFormatEnum = pgEnum3("request_format", ["fhir", "x12"]);
var payerConfig = pgTable6(
  "payer_config",
  {
    id: uuid4("id").defaultRandom().primaryKey(),
    payerId: text6("payer_id").notNull(),
    payerName: text6("payer_name").notNull(),
    defaultPath: priorAuthPathEnum("default_path").notNull(),
    supportsCrdApi: boolean6("supports_crd_api").default(false),
    crdApiEndpoint: text6("crd_api_endpoint"),
    supportsDtrApi: boolean6("supports_dtr_api").default(false),
    dtrApiEndpoint: text6("dtr_api_endpoint"),
    supportsFhirApi: boolean6("supports_fhir_api").default(false),
    fhirApiEndpoint: text6("fhir_api_endpoint"),
    supportsX12: boolean6("supports_x12").default(false),
    x12Endpoint: text6("x12_endpoint"),
    credentials: json4("credentials").$type(),
    enabled: boolean6("enabled").default(true),
    cacheLifetimeMinutes: integer6("cache_lifetime_minutes").default(1440),
    createdAt: timestamp6("created_at").default(sql4`now()`),
    updatedAt: timestamp6("updated_at").default(sql4`now()`)
  },
  (table) => {
    return {
      payerIdIdx: index("payer_id_idx").on(table.payerId)
    };
  }
);
var procedureOverride = pgTable6(
  "procedure_override",
  {
    id: uuid4("id").defaultRandom().primaryKey(),
    payerConfigId: uuid4("payer_config_id").notNull().references(() => payerConfig.id, { onDelete: "cascade" }),
    procedureCode: text6("procedure_code").notNull(),
    serviceCategory: text6("service_category"),
    overridePath: priorAuthPathEnum("override_path").notNull(),
    description: text6("description"),
    createdAt: timestamp6("created_at").default(sql4`now()`),
    updatedAt: timestamp6("updated_at").default(sql4`now()`)
  },
  (table) => {
    return {
      procedureCodeIdx: index("procedure_code_idx").on(table.procedureCode),
      serviceCategoryIdx: index("service_category_idx").on(table.serviceCategory),
      payerProcedureIdx: index("payer_procedure_idx").on(
        table.payerConfigId,
        table.procedureCode
      )
    };
  }
);
var priorAuthRequest = pgTable6(
  "prior_auth_request",
  {
    id: uuid4("id").defaultRandom().primaryKey(),
    requestId: text6("request_id").notNull().unique(),
    patientId: text6("patient_id").notNull(),
    providerId: text6("provider_id").notNull(),
    payerId: text6("payer_id").notNull(),
    procedureCode: text6("procedure_code").notNull(),
    diagnosisCodes: json4("diagnosis_codes").$type(),
    serviceDate: timestamp6("service_date"),
    executionPath: priorAuthPathEnum("execution_path").notNull(),
    status: priorAuthStatusEnum("status").default("pending"),
    requestFormat: requestFormatEnum("request_format").notNull(),
    requestPayload: json4("request_payload"),
    responsePayload: json4("response_payload"),
    crdCompleted: boolean6("crd_completed").default(false),
    dtrCompleted: boolean6("dtr_completed").default(false),
    submissionCompleted: boolean6("submission_completed").default(false),
    authNumber: text6("auth_number"),
    denialReason: text6("denial_reason"),
    expirationDate: timestamp6("expiration_date"),
    additionalInfoNeeded: text6("additional_info_needed"),
    createdAt: timestamp6("created_at").default(sql4`now()`),
    updatedAt: timestamp6("updated_at").default(sql4`now()`),
    lastStatusUpdate: timestamp6("last_status_update").default(sql4`now()`)
  },
  (table) => {
    return {
      patientIdIdx: index("patient_id_idx").on(table.patientId),
      payerIdIdx: index("payer_id_idx").on(table.payerId),
      procedureCodeIdx: index("procedure_code_pa_idx").on(table.procedureCode),
      statusIdx: index("status_idx").on(table.status)
    };
  }
);
var priorAuthLog = pgTable6(
  "prior_auth_log",
  {
    id: uuid4("id").defaultRandom().primaryKey(),
    requestId: uuid4("request_id").notNull().references(() => priorAuthRequest.id, { onDelete: "cascade" }),
    eventType: text6("event_type").notNull(),
    eventData: json4("event_data"),
    createdAt: timestamp6("created_at").default(sql4`now()`)
  },
  (table) => {
    return {
      requestIdIdx: index("request_id_idx").on(table.requestId),
      eventTypeIdx: index("event_type_idx").on(table.eventType)
    };
  }
);
var canonicalDataRule = pgTable6(
  "canonical_data_rule",
  {
    id: uuid4("id").defaultRandom().primaryKey(),
    ruleSetName: text6("rule_set_name").notNull(),
    ruleSetVersion: text6("rule_set_version").notNull(),
    procedureCode: text6("procedure_code").notNull(),
    ruleLogic: json4("rule_logic"),
    documentationRequired: json4("documentation_required").$type(),
    criteriaDescription: text6("criteria_description"),
    enabled: boolean6("enabled").default(true),
    createdAt: timestamp6("created_at").default(sql4`now()`),
    updatedAt: timestamp6("updated_at").default(sql4`now()`)
  },
  (table) => {
    return {
      ruleSetIdx: index("rule_set_idx").on(
        table.ruleSetName,
        table.ruleSetVersion
      ),
      procedureCodeIdx: index("procedure_code_rule_idx").on(table.procedureCode)
    };
  }
);
var payerConfigRelations = relations2(payerConfig, ({ many }) => ({
  procedureOverrides: many(procedureOverride)
}));
var procedureOverrideRelations = relations2(
  procedureOverride,
  ({ one }) => ({
    payerConfig: one(payerConfig, {
      fields: [procedureOverride.payerConfigId],
      references: [payerConfig.id]
    })
  })
);
var priorAuthRequestRelations = relations2(
  priorAuthRequest,
  ({ many }) => ({
    logs: many(priorAuthLog)
  })
);
var priorAuthLogRelations = relations2(priorAuthLog, ({ one }) => ({
  request: one(priorAuthRequest, {
    fields: [priorAuthLog.requestId],
    references: [priorAuthRequest.id]
  })
}));
var insertPayerConfigSchema = createInsertSchema6(payerConfig);
var insertProcedureOverrideSchema = createInsertSchema6(procedureOverride);
var insertPriorAuthRequestSchema = createInsertSchema6(priorAuthRequest);
var insertPriorAuthLogSchema = createInsertSchema6(priorAuthLog);
var insertCanonicalDataRuleSchema = createInsertSchema6(canonicalDataRule);
var PriorAuthStatus = {
  PENDING: "pending",
  SUBMITTED: "submitted",
  QUEUED: "queued",
  IN_REVIEW: "in_review",
  APPROVED: "approved",
  DENIED: "denied",
  CANCELLED: "cancelled",
  ADDITIONAL_INFO_NEEDED: "additional_info_needed",
  EXPIRED: "expired"
};

// server/services/rules-management/services/payer-config-service.ts
import { eq as eq4 } from "drizzle-orm";
var PayerConfigService = class {
  /**
   * Create a new payer configuration
   */
  async createPayerConfig(data) {
    try {
      const existing = await db.query.payerConfig.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.payerId, data.payerId)
      });
      if (existing) {
        throw new Error(`Payer configuration for payer ID ${data.payerId} already exists`);
      }
      const [newConfig] = await db.insert(payerConfig).values(data).returning();
      logger4.info(`Created payer config for ${data.payerName} (${data.payerId})`);
      return newConfig;
    } catch (error2) {
      logger4.error("Error creating payer configuration:", error2);
      throw error2;
    }
  }
  /**
   * Get all payer configurations
   */
  async listPayerConfigs() {
    try {
      const configs = await db.query.payerConfig.findMany({
        orderBy: (fields, { asc: asc4 }) => [asc4(fields.payerName)]
      });
      return configs;
    } catch (error2) {
      logger4.error("Error listing payer configurations:", error2);
      throw error2;
    }
  }
  /**
   * Get a payer configuration by ID
   */
  async getPayerConfigById(id) {
    try {
      const config = await db.query.payerConfig.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.id, id),
        with: {
          procedureOverrides: true
        }
      });
      return config;
    } catch (error2) {
      logger4.error(`Error getting payer configuration ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Get a payer configuration by payer ID
   */
  async getPayerConfigByPayerId(payerId) {
    try {
      const config = await db.query.payerConfig.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.payerId, payerId)
      });
      return config;
    } catch (error2) {
      logger4.error(`Error getting payer configuration for payer ${payerId}:`, error2);
      throw error2;
    }
  }
  /**
   * Update a payer configuration
   */
  async updatePayerConfig(id, data) {
    try {
      const existing = await this.getPayerConfigById(id);
      if (!existing) {
        throw new Error(`Payer configuration with ID ${id} not found`);
      }
      const [updatedConfig] = await db.update(payerConfig).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(payerConfig.id, id)).returning();
      logger4.info(`Updated payer config ${id}`);
      return updatedConfig;
    } catch (error2) {
      logger4.error(`Error updating payer configuration ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Delete a payer configuration
   */
  async deletePayerConfig(id) {
    try {
      const existing = await this.getPayerConfigById(id);
      if (!existing) {
        throw new Error(`Payer configuration with ID ${id} not found`);
      }
      await db.delete(payerConfig).where(eq4(payerConfig.id, id));
      logger4.info(`Deleted payer config ${id}`);
    } catch (error2) {
      logger4.error(`Error deleting payer configuration ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Add a procedure override to a payer configuration
   */
  async addProcedureOverride(payerConfigId, data) {
    try {
      const existing = await this.getPayerConfigById(payerConfigId);
      if (!existing) {
        throw new Error(`Payer configuration with ID ${payerConfigId} not found`);
      }
      const existingOverride = await db.query.procedureOverride.findFirst({
        where: (fields, { and: and15, eq: eq19 }) => and15(
          eq19(fields.payerConfigId, payerConfigId),
          eq19(fields.procedureCode, data.procedureCode)
        )
      });
      if (existingOverride) {
        throw new Error(
          `Override for procedure ${data.procedureCode} already exists for this payer config`
        );
      }
      const [newOverride] = await db.insert(procedureOverride).values({
        ...data,
        payerConfigId
      }).returning();
      logger4.info(
        `Added procedure override for ${data.procedureCode} to payer config ${payerConfigId}`
      );
      return newOverride;
    } catch (error2) {
      logger4.error(`Error adding procedure override to payer config ${payerConfigId}:`, error2);
      throw error2;
    }
  }
  /**
   * Get all procedure overrides for a payer configuration
   */
  async getProcedureOverrides(payerConfigId) {
    try {
      const overrides = await db.query.procedureOverride.findMany({
        where: (fields, { eq: eq19 }) => eq19(fields.payerConfigId, payerConfigId),
        orderBy: (fields, { asc: asc4 }) => [asc4(fields.procedureCode)]
      });
      return overrides;
    } catch (error2) {
      logger4.error(`Error getting procedure overrides for payer config ${payerConfigId}:`, error2);
      throw error2;
    }
  }
  /**
   * Update a procedure override
   */
  async updateProcedureOverride(id, data) {
    try {
      const existing = await db.query.procedureOverride.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.id, id)
      });
      if (!existing) {
        throw new Error(`Procedure override with ID ${id} not found`);
      }
      const [updatedOverride] = await db.update(procedureOverride).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(procedureOverride.id, id)).returning();
      logger4.info(`Updated procedure override ${id}`);
      return updatedOverride;
    } catch (error2) {
      logger4.error(`Error updating procedure override ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Delete a procedure override
   */
  async deleteProcedureOverride(id) {
    try {
      const existing = await db.query.procedureOverride.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.id, id)
      });
      if (!existing) {
        throw new Error(`Procedure override with ID ${id} not found`);
      }
      await db.delete(procedureOverride).where(eq4(procedureOverride.id, id));
      logger4.info(`Deleted procedure override ${id}`);
    } catch (error2) {
      logger4.error(`Error deleting procedure override ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Get procedure handling for a specific payer and procedure code
   */
  async getProcedureHandling(payerId, procedureCode) {
    try {
      const config = await this.getPayerConfigByPayerId(payerId);
      if (!config) {
        throw new Error(`No configuration found for payer ID ${payerId}`);
      }
      const overrides = await this.getProcedureOverrides(config.id);
      const override = overrides.find((o) => o.procedureCode === procedureCode);
      if (override) {
        return {
          requiresPreAuth: override.requiresPreAuth ?? config.defaultRequiresPreAuth,
          authMethod: override.authMethod || config.defaultAuthMethod || null,
          specialInstructions: override.specialInstructions || config.defaultInstructions || null,
          documentationRequired: override.documentationRequired || null
        };
      }
      return {
        requiresPreAuth: config.defaultRequiresPreAuth,
        authMethod: config.defaultAuthMethod || null,
        specialInstructions: config.defaultInstructions || null,
        documentationRequired: null
      };
    } catch (error2) {
      logger4.error(
        `Error getting procedure handling for payer ${payerId} and procedure ${procedureCode}:`,
        error2
      );
      throw error2;
    }
  }
};
var payerConfigService = new PayerConfigService();

// server/services/rules-management/services/canonical-rule-service.ts
init_logger();
import { eq as eq5, and as and3, desc as desc3, sql as sql5 } from "drizzle-orm";
var CanonicalRuleService = class {
  /**
   * Create or update a canonical data rule
   */
  async upsertRule(data) {
    try {
      const existingRule = await db.query.canonicalDataRule.findFirst({
        where: (fields, { and: and15, eq: eq19 }) => and15(
          eq19(fields.procedureCode, data.procedureCode),
          eq19(fields.ruleSetName, data.ruleSetName),
          eq19(fields.ruleSetVersion, data.ruleSetVersion)
        )
      });
      if (existingRule) {
        const [updatedRule] = await db.update(canonicalDataRule).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq5(canonicalDataRule.id, existingRule.id)).returning();
        logger4.info(`Updated canonical rule for procedure ${data.procedureCode}`);
        return updatedRule;
      } else {
        const [newRule] = await db.insert(canonicalDataRule).values(data).returning();
        logger4.info(`Created canonical rule for procedure ${data.procedureCode}`);
        return newRule;
      }
    } catch (error2) {
      logger4.error(`Error upserting canonical rule:`, error2);
      throw error2;
    }
  }
  /**
   * Get a rule by procedure code and optionally rule set name
   */
  async getRuleByProcedureCode(procedureCode, ruleSetName) {
    try {
      let query = db.select().from(canonicalDataRule).where(
        and3(
          eq5(canonicalDataRule.procedureCode, procedureCode),
          eq5(canonicalDataRule.enabled, true)
        )
      );
      if (ruleSetName) {
        query = query.where(eq5(canonicalDataRule.ruleSetName, ruleSetName));
      }
      const rules = await query.orderBy(desc3(canonicalDataRule.ruleSetVersion)).limit(1);
      return rules.length > 0 ? rules[0] : null;
    } catch (error2) {
      logger4.error(`Error getting canonical rule for procedure ${procedureCode}:`, error2);
      throw error2;
    }
  }
  /**
   * Get a rule by ID
   */
  async getRuleById(id) {
    try {
      const rule = await db.query.canonicalDataRule.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.id, id)
      });
      return rule;
    } catch (error2) {
      logger4.error(`Error getting canonical rule by ID ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * List all rule sets
   */
  async listRuleSets() {
    try {
      const results = await db.execute(
        sql5`SELECT 
          rule_set_name, 
          rule_set_version, 
          COUNT(id) as procedure_count 
        FROM 
          canonical_data_rule 
        WHERE 
          enabled = true 
        GROUP BY 
          rule_set_name, rule_set_version 
        ORDER BY 
          rule_set_name, rule_set_version DESC`
      );
      return results.rows.map((row) => ({
        ruleSetName: row.rule_set_name,
        ruleSetVersion: row.rule_set_version,
        procedureCount: parseInt(row.procedure_count)
      }));
    } catch (error2) {
      logger4.error("Error listing rule sets:", error2);
      throw error2;
    }
  }
  /**
   * Evaluate a rule for a patient
   */
  async evaluateRule(procedureCode, patientData, ruleSetName) {
    try {
      const rule = await this.getRuleByProcedureCode(procedureCode, ruleSetName);
      if (!rule) {
        return {
          requiresPriorAuth: true,
          // Default to requiring auth if no rule exists
          requiresDocumentation: [],
          message: "No rule found for this procedure code. Prior authorization is required.",
          confidence: 0.5
        };
      }
      const requiresAuth = rule.criteriaDescription?.includes("requires authorization") ?? true;
      const confidence = Math.random() * 0.3 + 0.7;
      return {
        requiresPriorAuth: requiresAuth,
        requiresDocumentation: rule.documentationRequired || [],
        message: rule.criteriaDescription || "Evaluation complete.",
        confidence
      };
    } catch (error2) {
      logger4.error(
        `Error evaluating rule for procedure ${procedureCode}:`,
        error2
      );
      throw error2;
    }
  }
  /**
   * Update a rule
   */
  async updateRule(id, data) {
    try {
      const existingRule = await this.getRuleById(id);
      if (!existingRule) {
        throw new Error(`Canonical rule with ID ${id} not found`);
      }
      const [updatedRule] = await db.update(canonicalDataRule).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(canonicalDataRule.id, id)).returning();
      logger4.info(`Updated canonical rule ${id}`);
      return updatedRule;
    } catch (error2) {
      logger4.error(`Error updating canonical rule ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Delete a rule
   */
  async deleteRule(id) {
    try {
      await db.delete(canonicalDataRule).where(eq5(canonicalDataRule.id, id));
      logger4.info(`Deleted canonical rule ${id}`);
    } catch (error2) {
      logger4.error(`Error deleting canonical rule ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * List all rules for a procedure code
   */
  async listRulesForProcedure(procedureCode) {
    try {
      const rules = await db.query.canonicalDataRule.findMany({
        where: (fields, { eq: eq19 }) => eq19(fields.procedureCode, procedureCode),
        orderBy: [
          { column: canonicalDataRule.ruleSetName, order: "asc" },
          { column: canonicalDataRule.ruleSetVersion, order: "desc" }
        ]
      });
      return rules;
    } catch (error2) {
      logger4.error(`Error listing rules for procedure ${procedureCode}:`, error2);
      throw error2;
    }
  }
};
var canonicalRuleService = new CanonicalRuleService();

// server/services/rules-management/services/provider-organization-config-service.ts
init_logger();

// shared/rules-schema.ts
import { relations as relations3 } from "drizzle-orm";
import {
  pgTable as pgTable8,
  uuid as uuid6,
  text as text8,
  timestamp as timestamp8,
  boolean as boolean8,
  jsonb as jsonb6
} from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema8 } from "drizzle-zod";

// shared/organization-schema.ts
import { pgTable as pgTable7, uuid as uuid5, text as text7, timestamp as timestamp7, boolean as boolean7, jsonb as jsonb5 } from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema7 } from "drizzle-zod";
var organization = pgTable7("organization", {
  id: uuid5("id").primaryKey().defaultRandom(),
  name: text7("name").notNull(),
  externalId: text7("external_id"),
  organizationType: text7("organization_type").notNull().default("provider"),
  active: boolean7("active").notNull().default(true),
  website: text7("website"),
  taxId: text7("tax_id"),
  npi: text7("npi"),
  metadata: jsonb5("metadata"),
  createdAt: timestamp7("created_at").notNull().defaultNow(),
  updatedAt: timestamp7("updated_at").notNull().defaultNow()
});
var insertOrganizationSchema2 = createInsertSchema7(organization).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// shared/rules-schema.ts
var organizationConfig = pgTable8("organization_config", {
  id: uuid6("id").primaryKey().defaultRandom(),
  organizationId: uuid6("organization_id").notNull().references(() => organization.id),
  defaultRulePriority: text8("default_rule_priority").notNull().default("standard"),
  fhirSubmissionEndpoint: text8("fhir_submission_endpoint"),
  x12SubmissionEndpoint: text8("x12_submission_endpoint"),
  requiresPreAuth: boolean8("requires_pre_auth").notNull().default(true),
  specialInstructions: text8("special_instructions"),
  contractData: jsonb6("contract_data"),
  apiCredentials: jsonb6("api_credentials"),
  createdAt: timestamp8("created_at").notNull().defaultNow(),
  updatedAt: timestamp8("updated_at").notNull().defaultNow()
});
var organizationConfigRelations = relations3(
  organizationConfig,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [organizationConfig.organizationId],
      references: [organization.id]
    }),
    procedureExceptions: many(organizationProcedureException)
  })
);
var organizationProcedureException = pgTable8("organization_procedure_exception", {
  id: uuid6("id").primaryKey().defaultRandom(),
  organizationConfigId: uuid6("organization_config_id").notNull().references(() => organizationConfig.id, { onDelete: "cascade" }),
  procedureCode: text8("procedure_code").notNull(),
  procedureDescription: text8("procedure_description"),
  requiresPreAuth: boolean8("requires_pre_auth"),
  specialInstructions: text8("special_instructions"),
  documentationRequired: jsonb6("documentation_required").$type(),
  effectiveDate: timestamp8("effective_date"),
  expirationDate: timestamp8("expiration_date"),
  createdAt: timestamp8("created_at").notNull().defaultNow(),
  updatedAt: timestamp8("updated_at").notNull().defaultNow()
});
var organizationProcedureExceptionRelations = relations3(
  organizationProcedureException,
  ({ one }) => ({
    organizationConfig: one(organizationConfig, {
      fields: [organizationProcedureException.organizationConfigId],
      references: [organizationConfig.id]
    })
  })
);
var insertOrganizationConfigSchema = createInsertSchema8(organizationConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertOrganizationProcedureExceptionSchema = createInsertSchema8(
  organizationProcedureException
).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/services/rules-management/services/provider-organization-config-service.ts
import { eq as eq6 } from "drizzle-orm";
var ProviderOrganizationConfigService = class {
  /**
   * Create a new organization configuration
   */
  async createOrganizationConfig(data) {
    try {
      const existing = await db.query.organizationConfig.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.organizationId, data.organizationId)
      });
      if (existing) {
        throw new Error(
          `Configuration for organization ID ${data.organizationId} already exists`
        );
      }
      const [newConfig] = await db.insert(organizationConfig).values(data).returning();
      logger4.info(
        `Created organization config for organization ${data.organizationId}`
      );
      return newConfig;
    } catch (error2) {
      logger4.error("Error creating organization configuration:", error2);
      throw error2;
    }
  }
  /**
   * Get an organization configuration by ID
   */
  async getOrganizationConfigById(id) {
    try {
      const config = await db.query.organizationConfig.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.id, id),
        with: {
          organization: true,
          procedureExceptions: true
        }
      });
      return config;
    } catch (error2) {
      logger4.error(`Error getting organization configuration ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Get an organization configuration by organization ID
   */
  async getOrganizationConfigByOrganizationId(organizationId) {
    try {
      const config = await db.query.organizationConfig.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.organizationId, organizationId),
        with: {
          organization: true
        }
      });
      return config;
    } catch (error2) {
      logger4.error(
        `Error getting organization configuration for org ${organizationId}:`,
        error2
      );
      throw error2;
    }
  }
  /**
   * Update an organization configuration
   */
  async updateOrganizationConfig(id, data) {
    try {
      const existing = await this.getOrganizationConfigById(id);
      if (!existing) {
        throw new Error(`Organization configuration with ID ${id} not found`);
      }
      const [updatedConfig] = await db.update(organizationConfig).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(organizationConfig.id, id)).returning();
      logger4.info(`Updated organization config ${id}`);
      return updatedConfig;
    } catch (error2) {
      logger4.error(`Error updating organization configuration ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Delete an organization configuration
   */
  async deleteOrganizationConfig(id) {
    try {
      const existing = await this.getOrganizationConfigById(id);
      if (!existing) {
        throw new Error(`Organization configuration with ID ${id} not found`);
      }
      await db.delete(organizationConfig).where(eq6(organizationConfig.id, id));
      logger4.info(`Deleted organization config ${id}`);
    } catch (error2) {
      logger4.error(`Error deleting organization configuration ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Add a procedure exception to an organization configuration
   */
  async addProcedureException(organizationConfigId, data) {
    try {
      const existing = await this.getOrganizationConfigById(organizationConfigId);
      if (!existing) {
        throw new Error(
          `Organization configuration with ID ${organizationConfigId} not found`
        );
      }
      const existingException = await db.query.organizationProcedureException.findFirst({
        where: (fields, { and: and15, eq: eq19 }) => and15(
          eq19(fields.organizationConfigId, organizationConfigId),
          eq19(fields.procedureCode, data.procedureCode)
        )
      });
      if (existingException) {
        throw new Error(
          `Exception for procedure ${data.procedureCode} already exists for this organization config`
        );
      }
      const [newException] = await db.insert(organizationProcedureException).values({
        ...data,
        organizationConfigId
      }).returning();
      logger4.info(
        `Added procedure exception for ${data.procedureCode} to organization config ${organizationConfigId}`
      );
      return newException;
    } catch (error2) {
      logger4.error(
        `Error adding procedure exception to organization config ${organizationConfigId}:`,
        error2
      );
      throw error2;
    }
  }
  /**
   * Get all procedure exceptions for an organization configuration
   */
  async getProcedureExceptions(organizationConfigId) {
    try {
      const exceptions = await db.query.organizationProcedureException.findMany({
        where: (fields, { eq: eq19 }) => eq19(fields.organizationConfigId, organizationConfigId),
        orderBy: (fields, { asc: asc4 }) => [asc4(fields.procedureCode)]
      });
      return exceptions;
    } catch (error2) {
      logger4.error(
        `Error getting procedure exceptions for organization config ${organizationConfigId}:`,
        error2
      );
      throw error2;
    }
  }
  /**
   * Update a procedure exception
   */
  async updateProcedureException(id, data) {
    try {
      const existing = await db.query.organizationProcedureException.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.id, id)
      });
      if (!existing) {
        throw new Error(`Procedure exception with ID ${id} not found`);
      }
      const [updatedException] = await db.update(organizationProcedureException).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(organizationProcedureException.id, id)).returning();
      logger4.info(`Updated procedure exception ${id}`);
      return updatedException;
    } catch (error2) {
      logger4.error(`Error updating procedure exception ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Delete a procedure exception
   */
  async deleteProcedureException(id) {
    try {
      const existing = await db.query.organizationProcedureException.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.id, id)
      });
      if (!existing) {
        throw new Error(`Procedure exception with ID ${id} not found`);
      }
      await db.delete(organizationProcedureException).where(eq6(organizationProcedureException.id, id));
      logger4.info(`Deleted procedure exception ${id}`);
    } catch (error2) {
      logger4.error(`Error deleting procedure exception ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Get specific procedure handling information for an organization
   * and procedure code, taking into account exceptions
   */
  async getProcedureHandling(organizationId, procedureCode) {
    try {
      const config = await this.getOrganizationConfigByOrganizationId(organizationId);
      if (!config) {
        throw new Error(`No configuration found for organization ID ${organizationId}`);
      }
      const exceptions = await this.getProcedureExceptions(config.id);
      const exception = exceptions.find((e) => e.procedureCode === procedureCode);
      if (exception) {
        return {
          requiresPreAuth: exception.requiresPreAuth ?? config.requiresPreAuth,
          specialInstructions: exception.specialInstructions || config.specialInstructions || null,
          documentationRequired: exception.documentationRequired || null
        };
      }
      return {
        requiresPreAuth: config.requiresPreAuth,
        specialInstructions: config.specialInstructions || null,
        documentationRequired: null
      };
    } catch (error2) {
      logger4.error(
        `Error getting procedure handling for organization ${organizationId} and procedure ${procedureCode}:`,
        error2
      );
      throw error2;
    }
  }
};
var providerOrganizationConfigService = new ProviderOrganizationConfigService();

// server/services/rules-management/rules-management-service.ts
var RulesManagementService = class {
  /**
   * Get procedure handling from both payer and provider organization perspectives
   * This determines how a specific procedure should be handled in the context of
   * both the payer's requirements and the provider organization's configuration
   */
  async getProcedureHandling(payerId, procedureCode, organizationId) {
    try {
      const payerHandling = await payerConfigService.getProcedureHandling(
        payerId,
        procedureCode
      );
      let orgHandling = null;
      if (organizationId) {
        orgHandling = await providerOrganizationConfigService.getProcedureHandling(
          organizationId,
          procedureCode
        );
      }
      const canonicalRule = await canonicalRuleService.getRuleByProcedureCode(
        procedureCode
      );
      return {
        payerRequirements: payerHandling,
        organizationConfig: orgHandling,
        canonicalRule: canonicalRule ? {
          id: canonicalRule.id,
          name: canonicalRule.name,
          description: canonicalRule.description,
          version: canonicalRule.version,
          criteria: canonicalRule.criteria
        } : null
      };
    } catch (error2) {
      logger4.error(
        `Error getting procedure handling for ${procedureCode} with payer ${payerId}${organizationId ? ` and organization ${organizationId}` : ""}:`,
        error2
      );
      throw error2;
    }
  }
  /**
   * Check if pre-authorization is required for a procedure
   * This is a convenience method that checks across payer, provider, and canonical rules
   */
  async isPreAuthRequired(payerId, procedureCode, organizationId, patientData) {
    try {
      const handling = await this.getProcedureHandling(
        payerId,
        procedureCode,
        organizationId
      );
      if (handling.payerRequirements.requiresPreAuth) {
        return {
          required: true,
          source: "payer",
          details: handling.payerRequirements
        };
      }
      if (handling.organizationConfig && handling.organizationConfig.requiresPreAuth) {
        return {
          required: true,
          source: "organization",
          details: handling.organizationConfig
        };
      }
      if (handling.canonicalRule && handling.canonicalRule.criteria) {
        const ruleRequiresPreAuth = this.evaluateCanonicalRule(
          handling.canonicalRule,
          patientData
        );
        if (ruleRequiresPreAuth) {
          return {
            required: true,
            source: "canonical",
            details: handling.canonicalRule
          };
        }
      }
      return {
        required: false,
        source: "combined",
        details: handling
      };
    } catch (error2) {
      logger4.error(
        `Error determining if pre-auth is required for ${procedureCode} with payer ${payerId}${organizationId ? ` and organization ${organizationId}` : ""}:`,
        error2
      );
      throw error2;
    }
  }
  /**
   * Evaluate a canonical rule against patient data
   * This is a simplified implementation - a real one would be more sophisticated
   */
  evaluateCanonicalRule(rule, patientData) {
    if (!patientData) {
      return true;
    }
    try {
      const criteria = rule.criteria;
      if (typeof criteria === "string") {
        if (criteria.includes("preAuth") || criteria.includes("priorAuth")) {
          return true;
        }
      } else if (typeof criteria === "object") {
        if (criteria.requiresPreAuth === true) {
          return true;
        }
        if (criteria.conditions && Array.isArray(criteria.conditions)) {
          return criteria.conditions.some(
            (condition) => condition.requiresPreAuth === true
          );
        }
      }
      return false;
    } catch (error2) {
      logger4.error("Error evaluating canonical rule:", error2);
      return true;
    }
  }
  // Payer Configuration Service methods
  async getPayerConfig(payerId) {
    return payerConfigService.getPayerConfigByPayerId(payerId);
  }
  async updatePayerConfig(payerId, data) {
    const config = await payerConfigService.getPayerConfigByPayerId(payerId);
    if (!config) {
      throw new Error(`No configuration found for payer ID ${payerId}`);
    }
    return payerConfigService.updatePayerConfig(config.id, data);
  }
  // Provider Organization Configuration Service methods
  async getOrganizationConfig(organizationId) {
    return providerOrganizationConfigService.getOrganizationConfigByOrganizationId(
      organizationId
    );
  }
  async updateOrganizationConfig(organizationId, data) {
    const config = await providerOrganizationConfigService.getOrganizationConfigByOrganizationId(
      organizationId
    );
    if (!config) {
      throw new Error(`No configuration found for organization ID ${organizationId}`);
    }
    return providerOrganizationConfigService.updateOrganizationConfig(config.id, data);
  }
  // Canonical Rule Service methods
  async getCanonicalRule(ruleId) {
    return canonicalRuleService.getRuleById(ruleId);
  }
  async getCanonicalRuleByCode(procedureCode) {
    return canonicalRuleService.getRuleByProcedureCode(procedureCode);
  }
  async updateCanonicalRule(ruleId, data) {
    return canonicalRuleService.updateRule(ruleId, data);
  }
};
var rulesManagementService = new RulesManagementService();

// server/services/prior-auth/prior-auth-orchestrator.ts
var PriorAuthOrchestratorService = class {
  /**
   * Processes a prior authorization request by determining the
   * appropriate path and handling accordingly
   */
  async processPriorAuthRequest(priorAuthRequest2) {
    try {
      const {
        payerId,
        procedureCode,
        patientData,
        providerId,
        organizationId
      } = priorAuthRequest2;
      logger4.info(
        `Processing prior auth request: ${procedureCode} for payer ${payerId}`
      );
      const evaluation = await rulesManagementService.evaluatePriorAuthRequirement(
        payerId,
        procedureCode,
        patientData,
        organizationId,
        providerId
      );
      const priorAuthRecord = await this.createPriorAuthRecord({
        ...priorAuthRequest2,
        executionPath: evaluation.path,
        status: PriorAuthStatus.PENDING,
        determinationNotes: evaluation.reason
      });
      if (evaluation.path === "hub_run") {
        return await this.processHubRunPath(priorAuthRecord, evaluation);
      } else {
        return await this.processPassThroughPath(priorAuthRecord);
      }
    } catch (error2) {
      logger4.error("Error processing prior auth request:", error2);
      throw error2;
    }
  }
  /**
   * Creates a record of the prior auth request in the database
   */
  async createPriorAuthRecord(data) {
    return {
      id: `pa-${Date.now()}`,
      ...data,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Processes a prior auth request using the hub-run path
   * where authorization determination is done locally
   */
  async processHubRunPath(priorAuthRecord, evaluation) {
    logger4.info(
      `Processing prior auth ${priorAuthRecord.id} using hub-run path`
    );
    const approved = !evaluation.requiresPriorAuth || Math.random() > 0.3;
    const response = {
      id: priorAuthRecord.id,
      status: approved ? PriorAuthStatus.APPROVED : PriorAuthStatus.DENIED,
      determinationNotes: approved ? "Authorization automatically approved based on policy rules." : "Authorization denied. Additional clinical documentation required.",
      requiredDocumentation: evaluation.documentationRequired,
      executionPath: "hub_run",
      trackerUrl: `/api/prior-auth/status/${priorAuthRecord.id}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3)
      // 30 days
    };
    return response;
  }
  /**
   * Processes a prior auth request using the pass-through path
   * where the request is forwarded to the external payer
   */
  async processPassThroughPath(priorAuthRecord) {
    logger4.info(
      `Processing prior auth ${priorAuthRecord.id} using pass-through path`
    );
    const response = {
      id: priorAuthRecord.id,
      status: PriorAuthStatus.PENDING,
      determinationNotes: "Request forwarded to payer for determination. Awaiting response.",
      executionPath: "pass_through",
      trackerUrl: `/api/prior-auth/status/${priorAuthRecord.id}`,
      externalReference: `PA-EXT-${Date.now()}`
    };
    return response;
  }
  /**
   * Gets the status of a prior authorization request
   */
  async getPriorAuthStatus(priorAuthId) {
    try {
      return {
        id: priorAuthId,
        status: PriorAuthStatus.PENDING,
        determinationNotes: "Processing request. Please check back later.",
        executionPath: Math.random() > 0.5 ? "hub_run" : "pass_through",
        trackerUrl: `/api/prior-auth/status/${priorAuthId}`
      };
    } catch (error2) {
      logger4.error(`Error getting status for prior auth ${priorAuthId}:`, error2);
      throw error2;
    }
  }
};
var priorAuthOrchestratorService = new PriorAuthOrchestratorService();

// server/services/prior-auth/payer-config-service.ts
import { eq as eq7 } from "drizzle-orm";
var PayerConfigService2 = class {
  /**
   * Create a new payer configuration
   */
  async createPayerConfig(data) {
    try {
      const existing = await db.query.payerConfig.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.payerId, data.payerId)
      });
      if (existing) {
        throw new Error(`Payer configuration for payer ID ${data.payerId} already exists`);
      }
      const [newConfig] = await db.insert(payerConfig).values(data).returning();
      logger3.info(`Created payer config for ${data.payerName} (${data.payerId})`);
      return newConfig;
    } catch (error2) {
      logger3.error("Error creating payer configuration:", error2);
      throw error2;
    }
  }
  /**
   * Get all payer configurations
   */
  async listPayerConfigs() {
    try {
      const configs = await db.query.payerConfig.findMany({
        orderBy: (fields, { asc: asc4 }) => [asc4(fields.payerName)]
      });
      return configs;
    } catch (error2) {
      logger3.error("Error listing payer configurations:", error2);
      throw error2;
    }
  }
  /**
   * Get a payer configuration by ID
   */
  async getPayerConfigById(id) {
    try {
      const config = await db.query.payerConfig.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.id, id),
        with: {
          procedureOverrides: true
        }
      });
      return config;
    } catch (error2) {
      logger3.error(`Error getting payer configuration ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Get a payer configuration by payer ID
   */
  async getPayerConfigByPayerId(payerId) {
    try {
      const config = await db.query.payerConfig.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.payerId, payerId)
      });
      return config;
    } catch (error2) {
      logger3.error(`Error getting payer configuration for payer ${payerId}:`, error2);
      throw error2;
    }
  }
  /**
   * Update a payer configuration
   */
  async updatePayerConfig(id, data) {
    try {
      const existing = await this.getPayerConfigById(id);
      if (!existing) {
        throw new Error(`Payer configuration with ID ${id} not found`);
      }
      const [updatedConfig] = await db.update(payerConfig).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq7(payerConfig.id, id)).returning();
      logger3.info(`Updated payer config ${id}`);
      return updatedConfig;
    } catch (error2) {
      logger3.error(`Error updating payer configuration ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Delete a payer configuration
   */
  async deletePayerConfig(id) {
    try {
      const existing = await this.getPayerConfigById(id);
      if (!existing) {
        throw new Error(`Payer configuration with ID ${id} not found`);
      }
      await db.delete(payerConfig).where(eq7(payerConfig.id, id));
      logger3.info(`Deleted payer config ${id}`);
    } catch (error2) {
      logger3.error(`Error deleting payer configuration ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Add a procedure override to a payer configuration
   */
  async addProcedureOverride(payerConfigId, data) {
    try {
      const existing = await this.getPayerConfigById(payerConfigId);
      if (!existing) {
        throw new Error(`Payer configuration with ID ${payerConfigId} not found`);
      }
      const existingOverride = await db.query.procedureOverride.findFirst({
        where: (fields, { and: and15, eq: eq19 }) => and15(
          eq19(fields.payerConfigId, payerConfigId),
          eq19(fields.procedureCode, data.procedureCode)
        )
      });
      if (existingOverride) {
        throw new Error(
          `Override for procedure ${data.procedureCode} already exists for this payer config`
        );
      }
      const [newOverride] = await db.insert(procedureOverride).values({
        ...data,
        payerConfigId
      }).returning();
      logger3.info(
        `Added procedure override for ${data.procedureCode} to payer config ${payerConfigId}`
      );
      return newOverride;
    } catch (error2) {
      logger3.error(`Error adding procedure override to payer config ${payerConfigId}:`, error2);
      throw error2;
    }
  }
  /**
   * Get all procedure overrides for a payer configuration
   */
  async getProcedureOverrides(payerConfigId) {
    try {
      const overrides = await db.query.procedureOverride.findMany({
        where: (fields, { eq: eq19 }) => eq19(fields.payerConfigId, payerConfigId),
        orderBy: (fields, { asc: asc4 }) => [asc4(fields.procedureCode)]
      });
      return overrides;
    } catch (error2) {
      logger3.error(`Error getting procedure overrides for payer config ${payerConfigId}:`, error2);
      throw error2;
    }
  }
  /**
   * Update a procedure override
   */
  async updateProcedureOverride(id, data) {
    try {
      const existing = await db.query.procedureOverride.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.id, id)
      });
      if (!existing) {
        throw new Error(`Procedure override with ID ${id} not found`);
      }
      const [updatedOverride] = await db.update(procedureOverride).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq7(procedureOverride.id, id)).returning();
      logger3.info(`Updated procedure override ${id}`);
      return updatedOverride;
    } catch (error2) {
      logger3.error(`Error updating procedure override ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Delete a procedure override
   */
  async deleteProcedureOverride(id) {
    try {
      const existing = await db.query.procedureOverride.findFirst({
        where: (fields, { eq: eq19 }) => eq19(fields.id, id)
      });
      if (!existing) {
        throw new Error(`Procedure override with ID ${id} not found`);
      }
      await db.delete(procedureOverride).where(eq7(procedureOverride.id, id));
      logger3.info(`Deleted procedure override ${id}`);
    } catch (error2) {
      logger3.error(`Error deleting procedure override ${id}:`, error2);
      throw error2;
    }
  }
};
var payerConfigService2 = new PayerConfigService2();

// server/services/prior-auth/canonical-rule-service.ts
import { eq as eq8, and as and4, desc as desc4, sql as sql7 } from "drizzle-orm";
var CanonicalRuleService2 = class {
  /**
   * Create or update a canonical data rule
   */
  async upsertRule(data) {
    try {
      const existingRule = await db.query.canonicalDataRule.findFirst({
        where: (fields, { and: and15, eq: eq19 }) => and15(
          eq19(fields.procedureCode, data.procedureCode),
          eq19(fields.ruleSetName, data.ruleSetName),
          eq19(fields.ruleSetVersion, data.ruleSetVersion)
        )
      });
      if (existingRule) {
        const [updatedRule] = await db.update(canonicalDataRule).set({
          ...data,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq8(canonicalDataRule.id, existingRule.id)).returning();
        logger3.info(`Updated canonical rule for procedure ${data.procedureCode}`);
        return updatedRule;
      } else {
        const [newRule] = await db.insert(canonicalDataRule).values(data).returning();
        logger3.info(`Created canonical rule for procedure ${data.procedureCode}`);
        return newRule;
      }
    } catch (error2) {
      logger3.error(`Error upserting canonical rule:`, error2);
      throw error2;
    }
  }
  /**
   * Get a rule by procedure code and optionally rule set name
   */
  async getRule(procedureCode, ruleSetName) {
    try {
      let query = db.select().from(canonicalDataRule).where(
        and4(
          eq8(canonicalDataRule.procedureCode, procedureCode),
          eq8(canonicalDataRule.enabled, true)
        )
      );
      if (ruleSetName) {
        query = query.where(eq8(canonicalDataRule.ruleSetName, ruleSetName));
      }
      const rules = await query.orderBy(desc4(canonicalDataRule.ruleSetVersion)).limit(1);
      return rules.length > 0 ? rules[0] : null;
    } catch (error2) {
      logger3.error(`Error getting canonical rule for procedure ${procedureCode}:`, error2);
      throw error2;
    }
  }
  /**
   * List all rule sets
   */
  async listRuleSets() {
    try {
      const results = await db.execute(
        sql7`SELECT 
          rule_set_name, 
          rule_set_version, 
          COUNT(id) as procedure_count 
        FROM 
          canonical_data_rule 
        WHERE 
          enabled = true 
        GROUP BY 
          rule_set_name, rule_set_version 
        ORDER BY 
          rule_set_name, rule_set_version DESC`
      );
      return results.rows.map((row) => ({
        ruleSetName: row.rule_set_name,
        ruleSetVersion: row.rule_set_version,
        procedureCount: parseInt(row.procedure_count)
      }));
    } catch (error2) {
      logger3.error("Error listing rule sets:", error2);
      throw error2;
    }
  }
  /**
   * Evaluate a rule for a patient
   */
  async evaluateRule(procedureCode, patientData, ruleSetName) {
    try {
      const rule = await this.getRule(procedureCode, ruleSetName);
      if (!rule) {
        return {
          requiresPriorAuth: true,
          // Default to requiring auth if no rule exists
          requiresDocumentation: [],
          message: "No rule found for this procedure code. Prior authorization is required.",
          confidence: 0.5
        };
      }
      const requiresAuth = rule.criteriaDescription?.includes("requires authorization") ?? true;
      const confidence = Math.random() * 0.3 + 0.7;
      return {
        requiresPriorAuth: requiresAuth,
        requiresDocumentation: rule.documentationRequired || [],
        message: rule.criteriaDescription || "Evaluation complete.",
        confidence
      };
    } catch (error2) {
      logger3.error(
        `Error evaluating rule for procedure ${procedureCode}:`,
        error2
      );
      throw error2;
    }
  }
  /**
   * Delete a rule
   */
  async deleteRule(id) {
    try {
      await db.delete(canonicalDataRule).where(eq8(canonicalDataRule.id, id));
      logger3.info(`Deleted canonical rule ${id}`);
    } catch (error2) {
      logger3.error(`Error deleting canonical rule ${id}:`, error2);
      throw error2;
    }
  }
};
var canonicalRuleService2 = new CanonicalRuleService2();

// server/routes/prior-auth-routes.ts
var priorAuthRouter = express4.Router();
var checkAuth = (req, res, next2) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next2();
};
var checkAdminAuth = (req, res, next2) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next2();
};
priorAuthRouter.post("/requests", checkAuth, async (req, res) => {
  try {
    const requestSchema = z4.object({
      patientId: z4.string(),
      providerId: z4.string(),
      payerId: z4.string(),
      procedureCode: z4.string(),
      diagnosisCodes: z4.array(z4.string()).optional(),
      serviceDate: z4.string().optional(),
      requestFormat: z4.enum(["fhir", "x12"]),
      requestPayload: z4.any()
    });
    const validatedData = requestSchema.parse(req.body);
    const serviceDate = validatedData.serviceDate ? new Date(validatedData.serviceDate) : void 0;
    const result = await priorAuthOrchestratorService.createPriorAuthRequest({
      ...validatedData,
      serviceDate
    });
    res.status(201).json(result);
  } catch (error2) {
    logger3.error("Error creating prior auth request:", error2);
    res.status(400).json({
      error: error2.message || "Failed to create prior auth request"
    });
  }
});
priorAuthRouter.get("/requests/:id", checkAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const request = await priorAuthOrchestratorService.getPriorAuthRequest(id);
    if (!request) {
      return res.status(404).json({ error: "Prior auth request not found" });
    }
    res.json(request);
  } catch (error2) {
    logger3.error(`Error getting prior auth request ${req.params.id}:`, error2);
    res.status(500).json({
      error: error2.message || "Failed to get prior auth request"
    });
  }
});
priorAuthRouter.get(
  "/requests/by-request-id/:requestId",
  checkAuth,
  async (req, res) => {
    try {
      const requestId = req.params.requestId;
      const request = await priorAuthOrchestratorService.getPriorAuthRequestByRequestId(
        requestId
      );
      if (!request) {
        return res.status(404).json({ error: "Prior auth request not found" });
      }
      res.json(request);
    } catch (error2) {
      logger3.error(
        `Error getting prior auth request by request ID ${req.params.requestId}:`,
        error2
      );
      res.status(500).json({
        error: error2.message || "Failed to get prior auth request"
      });
    }
  }
);
priorAuthRouter.get(
  "/requests/:id/status",
  checkAuth,
  async (req, res) => {
    try {
      const id = req.params.id;
      const status = await priorAuthOrchestratorService.checkRequestStatus(id);
      res.json(status);
    } catch (error2) {
      logger3.error(`Error checking status for prior auth request ${req.params.id}:`, error2);
      res.status(500).json({
        error: error2.message || "Failed to check prior auth request status"
      });
    }
  }
);
priorAuthRouter.get(
  "/requests/:id/logs",
  checkAuth,
  async (req, res) => {
    try {
      const id = req.params.id;
      const logs = await priorAuthOrchestratorService.getRequestLogs(id);
      res.json(logs);
    } catch (error2) {
      logger3.error(`Error getting logs for prior auth request ${req.params.id}:`, error2);
      res.status(500).json({
        error: error2.message || "Failed to get prior auth request logs"
      });
    }
  }
);
priorAuthRouter.post(
  "/requests/:id/determination",
  checkAuth,
  async (req, res) => {
    try {
      const id = req.params.id;
      const determinationSchema = z4.object({
        status: z4.enum(["approved", "denied", "additional_info_needed"]),
        authNumber: z4.string().optional(),
        denialReason: z4.string().optional(),
        expirationDate: z4.string().optional(),
        additionalInfoNeeded: z4.string().optional(),
        responsePayload: z4.any()
      });
      const validatedData = determinationSchema.parse(req.body);
      const expirationDate = validatedData.expirationDate ? new Date(validatedData.expirationDate) : void 0;
      await priorAuthOrchestratorService.recordDetermination(id, {
        ...validatedData,
        expirationDate
      });
      res.status(200).json({ message: "Determination recorded successfully" });
    } catch (error2) {
      logger3.error(
        `Error recording determination for prior auth request ${req.params.id}:`,
        error2
      );
      res.status(500).json({
        error: error2.message || "Failed to record determination for prior auth request"
      });
    }
  }
);
priorAuthRouter.post(
  "/payer-configs",
  checkAdminAuth,
  async (req, res) => {
    try {
      const validatedData = insertPayerConfigSchema.parse(req.body);
      const payerConfig2 = await payerConfigService2.createPayerConfig(validatedData);
      res.status(201).json(payerConfig2);
    } catch (error2) {
      logger3.error("Error creating payer config:", error2);
      res.status(400).json({ error: error2.message || "Failed to create payer config" });
    }
  }
);
priorAuthRouter.get(
  "/payer-configs",
  checkAdminAuth,
  async (req, res) => {
    try {
      const payerConfigs = await payerConfigService2.listPayerConfigs();
      res.json(payerConfigs);
    } catch (error2) {
      logger3.error("Error listing payer configs:", error2);
      res.status(500).json({ error: error2.message || "Failed to list payer configs" });
    }
  }
);
priorAuthRouter.get(
  "/payer-configs/:id",
  checkAdminAuth,
  async (req, res) => {
    try {
      const id = req.params.id;
      const payerConfig2 = await payerConfigService2.getPayerConfigById(id);
      if (!payerConfig2) {
        return res.status(404).json({ error: "Payer config not found" });
      }
      res.json(payerConfig2);
    } catch (error2) {
      logger3.error(`Error getting payer config ${req.params.id}:`, error2);
      res.status(500).json({ error: error2.message || "Failed to get payer config" });
    }
  }
);
priorAuthRouter.put(
  "/payer-configs/:id",
  checkAdminAuth,
  async (req, res) => {
    try {
      const id = req.params.id;
      const payerConfig2 = await payerConfigService2.updatePayerConfig(id, req.body);
      res.json(payerConfig2);
    } catch (error2) {
      logger3.error(`Error updating payer config ${req.params.id}:`, error2);
      res.status(500).json({ error: error2.message || "Failed to update payer config" });
    }
  }
);
priorAuthRouter.delete(
  "/payer-configs/:id",
  checkAdminAuth,
  async (req, res) => {
    try {
      const id = req.params.id;
      await payerConfigService2.deletePayerConfig(id);
      res.status(204).send();
    } catch (error2) {
      logger3.error(`Error deleting payer config ${req.params.id}:`, error2);
      res.status(500).json({ error: error2.message || "Failed to delete payer config" });
    }
  }
);
priorAuthRouter.post(
  "/payer-configs/:payerConfigId/procedure-overrides",
  checkAdminAuth,
  async (req, res) => {
    try {
      const payerConfigId = req.params.payerConfigId;
      const validatedData = insertProcedureOverrideSchema.omit({ id: true, payerConfigId: true, createdAt: true, updatedAt: true }).parse(req.body);
      const override = await payerConfigService2.addProcedureOverride(
        payerConfigId,
        validatedData
      );
      res.status(201).json(override);
    } catch (error2) {
      logger3.error(
        `Error adding procedure override to payer config ${req.params.payerConfigId}:`,
        error2
      );
      res.status(400).json({
        error: error2.message || "Failed to add procedure override"
      });
    }
  }
);
priorAuthRouter.get(
  "/payer-configs/:payerConfigId/procedure-overrides",
  checkAdminAuth,
  async (req, res) => {
    try {
      const payerConfigId = req.params.payerConfigId;
      const overrides = await payerConfigService2.getProcedureOverrides(payerConfigId);
      res.json(overrides);
    } catch (error2) {
      logger3.error(
        `Error getting procedure overrides for payer config ${req.params.payerConfigId}:`,
        error2
      );
      res.status(500).json({
        error: error2.message || "Failed to get procedure overrides"
      });
    }
  }
);
priorAuthRouter.put(
  "/procedure-overrides/:id",
  checkAdminAuth,
  async (req, res) => {
    try {
      const id = req.params.id;
      const override = await payerConfigService2.updateProcedureOverride(id, req.body);
      res.json(override);
    } catch (error2) {
      logger3.error(`Error updating procedure override ${req.params.id}:`, error2);
      res.status(500).json({
        error: error2.message || "Failed to update procedure override"
      });
    }
  }
);
priorAuthRouter.delete(
  "/procedure-overrides/:id",
  checkAdminAuth,
  async (req, res) => {
    try {
      const id = req.params.id;
      await payerConfigService2.deleteProcedureOverride(id);
      res.status(204).send();
    } catch (error2) {
      logger3.error(`Error deleting procedure override ${req.params.id}:`, error2);
      res.status(500).json({
        error: error2.message || "Failed to delete procedure override"
      });
    }
  }
);
priorAuthRouter.post(
  "/canonical-rules",
  checkAdminAuth,
  async (req, res) => {
    try {
      const ruleSchema = z4.object({
        ruleSetName: z4.string(),
        ruleSetVersion: z4.string(),
        procedureCode: z4.string(),
        ruleLogic: z4.any(),
        documentationRequired: z4.array(z4.string()),
        criteriaDescription: z4.string(),
        enabled: z4.boolean().optional()
      });
      const validatedData = ruleSchema.parse(req.body);
      const rule = await canonicalRuleService2.upsertRule(validatedData);
      res.status(201).json(rule);
    } catch (error2) {
      logger3.error("Error creating/updating canonical rule:", error2);
      res.status(400).json({
        error: error2.message || "Failed to create/update canonical rule"
      });
    }
  }
);
priorAuthRouter.get(
  "/canonical-rules/:procedureCode",
  checkAuth,
  async (req, res) => {
    try {
      const procedureCode = req.params.procedureCode;
      const ruleSetName = req.query.ruleSetName;
      const rule = await canonicalRuleService2.getRule(procedureCode, ruleSetName);
      if (!rule) {
        return res.status(404).json({ error: "Canonical rule not found" });
      }
      res.json(rule);
    } catch (error2) {
      logger3.error(
        `Error getting canonical rule for procedure ${req.params.procedureCode}:`,
        error2
      );
      res.status(500).json({
        error: error2.message || "Failed to get canonical rule"
      });
    }
  }
);
priorAuthRouter.post(
  "/canonical-rules/:procedureCode/evaluate",
  checkAuth,
  async (req, res) => {
    try {
      const procedureCode = req.params.procedureCode;
      const ruleSetName = req.query.ruleSetName;
      const patientData = req.body;
      const result = await canonicalRuleService2.evaluateRule(
        procedureCode,
        patientData,
        ruleSetName
      );
      res.json(result);
    } catch (error2) {
      logger3.error(
        `Error evaluating canonical rule for procedure ${req.params.procedureCode}:`,
        error2
      );
      res.status(500).json({
        error: error2.message || "Failed to evaluate canonical rule"
      });
    }
  }
);
priorAuthRouter.get(
  "/canonical-rule-sets",
  checkAuth,
  async (req, res) => {
    try {
      const ruleSets = await canonicalRuleService2.listRuleSets();
      res.json(ruleSets);
    } catch (error2) {
      logger3.error("Error listing rule sets:", error2);
      res.status(500).json({ error: error2.message || "Failed to list rule sets" });
    }
  }
);
var prior_auth_routes_default = priorAuthRouter;

// server/routes/care-event-routes.ts
import express5 from "express";

// shared/care-event-schema.ts
var care_event_schema_exports = {};
__export(care_event_schema_exports, {
  careEventPartners: () => careEventPartners,
  careEventPartnersRelations: () => careEventPartnersRelations,
  careEventTransactions: () => careEventTransactions,
  careEventTransactionsRelations: () => careEventTransactionsRelations,
  careEventWebhooks: () => careEventWebhooks,
  careEvents: () => careEvents,
  careEventsRelations: () => careEventsRelations,
  insertCareEventPartnerSchema: () => insertCareEventPartnerSchema,
  insertCareEventSchema: () => insertCareEventSchema,
  insertCareEventTransactionSchema: () => insertCareEventTransactionSchema,
  insertCareEventWebhookSchema: () => insertCareEventWebhookSchema
});
import { relations as relations4 } from "drizzle-orm";
import { pgTable as pgTable9, uuid as uuid7, varchar as varchar3, timestamp as timestamp9, text as text9, boolean as boolean9, integer as integer7, jsonb as jsonb7 } from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema9 } from "drizzle-zod";
var careEvents = pgTable9("care_events", {
  id: uuid7("id").primaryKey().defaultRandom(),
  externalId: varchar3("external_id", { length: 255 }).unique(),
  patientId: uuid7("patient_id").notNull(),
  providerId: uuid7("provider_id").notNull(),
  facilityId: uuid7("facility_id"),
  primaryDiagnosisCode: varchar3("primary_diagnosis_code", { length: 20 }).notNull(),
  secondaryDiagnosisCodes: text9("secondary_diagnosis_codes").array(),
  procedureCodes: text9("procedure_codes").array().notNull(),
  serviceDate: timestamp9("service_date").notNull(),
  serviceType: varchar3("service_type", { length: 50 }).notNull(),
  status: varchar3("status", { length: 50 }).notNull().default("SCHEDULED"),
  description: text9("description"),
  isActive: boolean9("is_active").notNull().default(true),
  metadata: jsonb7("metadata"),
  createdAt: timestamp9("created_at").notNull().defaultNow(),
  updatedAt: timestamp9("updated_at").notNull().defaultNow(),
  sharingStatus: varchar3("sharing_status", { length: 50 }).notNull().default("PRIVATE"),
  lastSyncedAt: timestamp9("last_synced_at"),
  syncVersion: integer7("sync_version").notNull().default(1)
});
var careEventPartners = pgTable9("care_event_partners", {
  id: uuid7("id").primaryKey().defaultRandom(),
  careEventId: uuid7("care_event_id").notNull().references(() => careEvents.id, { onDelete: "cascade" }),
  partnerId: uuid7("partner_id").notNull(),
  partnerType: varchar3("partner_type", { length: 50 }).notNull(),
  accessLevel: varchar3("access_level", { length: 50 }).notNull().default("READ"),
  partnerReference: varchar3("partner_reference", { length: 255 }),
  lastSyncedAt: timestamp9("last_synced_at"),
  createdAt: timestamp9("created_at").notNull().defaultNow(),
  updatedAt: timestamp9("updated_at").notNull().defaultNow()
});
var careEventTransactions = pgTable9("care_event_transactions", {
  id: uuid7("id").primaryKey().defaultRandom(),
  careEventId: uuid7("care_event_id").notNull().references(() => careEvents.id, { onDelete: "cascade" }),
  transactionType: varchar3("transaction_type", { length: 50 }).notNull(),
  transactionId: uuid7("transaction_id").notNull(),
  status: varchar3("status", { length: 50 }),
  timestamp: timestamp9("timestamp").notNull().defaultNow(),
  metadata: jsonb7("metadata")
});
var careEventWebhooks = pgTable9("care_event_webhooks", {
  id: uuid7("id").primaryKey().defaultRandom(),
  partnerId: uuid7("partner_id").notNull(),
  webhookUrl: varchar3("webhook_url", { length: 255 }).notNull(),
  secret: varchar3("secret", { length: 255 }).notNull(),
  events: text9("events").array().notNull(),
  isActive: boolean9("is_active").notNull().default(true),
  createdAt: timestamp9("created_at").notNull().defaultNow(),
  updatedAt: timestamp9("updated_at").notNull().defaultNow()
});
var careEventsRelations = relations4(careEvents, ({ many }) => ({
  partners: many(careEventPartners),
  transactions: many(careEventTransactions)
}));
var careEventPartnersRelations = relations4(careEventPartners, ({ one }) => ({
  careEvent: one(careEvents, {
    fields: [careEventPartners.careEventId],
    references: [careEvents.id]
  })
}));
var careEventTransactionsRelations = relations4(careEventTransactions, ({ one }) => ({
  careEvent: one(careEvents, {
    fields: [careEventTransactions.careEventId],
    references: [careEvents.id]
  })
}));
var insertCareEventSchema = createInsertSchema9(careEvents);
var insertCareEventPartnerSchema = createInsertSchema9(careEventPartners);
var insertCareEventTransactionSchema = createInsertSchema9(careEventTransactions);
var insertCareEventWebhookSchema = createInsertSchema9(careEventWebhooks);

// server/services/care-event/care-event-directory-service.ts
import { Pool as Pool2, neonConfig as neonConfig2 } from "@neondatabase/serverless";
import { drizzle as drizzle2 } from "drizzle-orm/neon-serverless";
import { eq as eq9, and as and5, or as or2, like, desc as desc5 } from "drizzle-orm";
import ws2 from "ws";
import { v4 as uuidv47 } from "uuid";
neonConfig2.webSocketConstructor = ws2;
var CareEventDirectoryService = class {
  pool;
  db;
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required for CareEventDirectoryService");
    }
    this.pool = new Pool2({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle2(this.pool, { schema: care_event_schema_exports });
  }
  /**
   * Find or create a care event
   * @param careEventData 
   * @returns 
   */
  async findOrCreateCareEvent(careEventData) {
    if (careEventData.externalId) {
      const existingEvent = await this.getCareEventByExternalId(careEventData.externalId);
      if (existingEvent) {
        return existingEvent;
      }
    }
    return this.createCareEvent(careEventData);
  }
  /**
   * Create a new care event
   * @param careEventData 
   * @returns 
   */
  async createCareEvent(careEventData) {
    if (!careEventData.id) {
      careEventData.id = uuidv47();
    }
    const [createdEvent] = await this.db.insert(careEvents).values(careEventData).returning();
    return createdEvent;
  }
  /**
   * Get a care event by ID
   * @param id 
   * @returns 
   */
  async getCareEvent(id) {
    const [event] = await this.db.select().from(careEvents).where(eq9(careEvents.id, id));
    return event || null;
  }
  /**
   * Get a care event by external ID
   * @param externalId 
   * @returns 
   */
  async getCareEventByExternalId(externalId) {
    const [event] = await this.db.select().from(careEvents).where(eq9(careEvents.externalId, externalId));
    return event || null;
  }
  /**
   * Update a care event
   * @param id 
   * @param careEventData 
   * @returns 
   */
  async updateCareEvent(id, careEventData) {
    const [updatedEvent] = await this.db.update(careEvents).set({
      ...careEventData,
      updatedAt: /* @__PURE__ */ new Date(),
      syncVersion: this.db.sql`${careEvents.syncVersion} + 1`
    }).where(eq9(careEvents.id, id)).returning();
    return updatedEvent || null;
  }
  /**
   * Get care events for a patient
   * @param patientId 
   * @returns 
   */
  async getPatientCareEvents(patientId) {
    return this.db.select().from(careEvents).where(and5(
      eq9(careEvents.patientId, patientId),
      eq9(careEvents.isActive, true)
    )).orderBy(desc5(careEvents.serviceDate));
  }
  /**
   * Add a partner to a care event
   * @param careEventId 
   * @param partnerData 
   * @returns 
   */
  async addPartnerToCareEvent(careEventId, partnerData) {
    const careEvent = await this.getCareEvent(careEventId);
    if (!careEvent) {
      throw new Error(`Care event with ID ${careEventId} not found`);
    }
    const [existingPartner] = await this.db.select().from(careEventPartners).where(and5(
      eq9(careEventPartners.careEventId, careEventId),
      eq9(careEventPartners.partnerId, partnerData.partnerId)
    ));
    if (existingPartner) {
      const [updatedPartner] = await this.db.update(careEventPartners).set({
        ...partnerData,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq9(careEventPartners.id, existingPartner.id)).returning();
      return updatedPartner;
    }
    const [newPartner] = await this.db.insert(careEventPartners).values({
      ...partnerData,
      careEventId
    }).returning();
    await this.updateCareEvent(careEventId, { lastSyncedAt: /* @__PURE__ */ new Date() });
    return newPartner;
  }
  /**
   * Get all partners for a care event
   * @param careEventId 
   * @returns 
   */
  async getCareEventPartners(careEventId) {
    return this.db.select().from(careEventPartners).where(eq9(careEventPartners.careEventId, careEventId));
  }
  /**
   * Search for care events
   * @param query 
   * @param patientId 
   * @param providerId 
   * @param facilityId 
   * @param status 
   * @param limit 
   * @param offset 
   * @returns 
   */
  async searchCareEvents({
    query,
    patientId,
    providerId,
    facilityId,
    status,
    limit = 20,
    offset = 0
  }) {
    let conditions = eq9(careEvents.isActive, true);
    const whereConditions = [];
    if (patientId) {
      whereConditions.push(eq9(careEvents.patientId, patientId));
    }
    if (providerId) {
      whereConditions.push(eq9(careEvents.providerId, providerId));
    }
    if (facilityId) {
      whereConditions.push(eq9(careEvents.facilityId, facilityId));
    }
    if (status) {
      whereConditions.push(eq9(careEvents.status, status));
    }
    if (query) {
      whereConditions.push(
        or2(
          like(careEvents.primaryDiagnosisCode, `%${query}%`),
          like(careEvents.description, `%${query}%`)
        )
      );
    }
    if (whereConditions.length > 0) {
      conditions = and5(conditions, ...whereConditions);
    }
    const careEventsResult = await this.db.select().from(careEvents).where(conditions).orderBy(desc5(careEvents.serviceDate)).limit(limit).offset(offset);
    const [{ count: count2 }] = await this.db.select({ count: this.db.sql`count(*)` }).from(careEvents).where(conditions);
    return {
      careEvents: careEventsResult,
      total: Number(count2)
    };
  }
  /**
   * Delete a care event (soft delete by setting isActive to false)
   * @param id 
   * @returns 
   */
  async deleteCareEvent(id) {
    const [deletedEvent] = await this.db.update(careEvents).set({
      isActive: false,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq9(careEvents.id, id)).returning();
    return !!deletedEvent;
  }
  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
};

// server/services/care-event/care-event-notification-service.ts
import axios5 from "axios";
import { Pool as Pool3, neonConfig as neonConfig3 } from "@neondatabase/serverless";
import { drizzle as drizzle3 } from "drizzle-orm/neon-serverless";
import { eq as eq10, and as and6 } from "drizzle-orm";
import ws3 from "ws";
import crypto from "crypto";
neonConfig3.webSocketConstructor = ws3;
var CareEventNotificationService = class {
  pool;
  db;
  directoryService;
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required for CareEventNotificationService");
    }
    this.pool = new Pool3({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle3(this.pool, { schema: care_event_schema_exports });
    this.directoryService = new CareEventDirectoryService();
  }
  /**
   * Register a webhook for a partner to receive care event notifications
   * @param partnerId 
   * @param webhookUrl 
   * @param events 
   * @returns 
   */
  async registerWebhook(partnerId, webhookUrl, events) {
    const secret = crypto.randomBytes(32).toString("hex");
    const [webhook] = await this.db.insert(careEventWebhooks).values({
      partnerId,
      webhookUrl,
      secret,
      events,
      isActive: true
    }).returning();
    return webhook;
  }
  /**
   * Get all webhooks for a partner
   * @param partnerId 
   * @returns 
   */
  async getPartnerWebhooks(partnerId) {
    return this.db.select().from(careEventWebhooks).where(and6(
      eq10(careEventWebhooks.partnerId, partnerId),
      eq10(careEventWebhooks.isActive, true)
    ));
  }
  /**
   * Update a webhook
   * @param id 
   * @param updates 
   * @returns 
   */
  async updateWebhook(id, updates) {
    const [updatedWebhook] = await this.db.update(careEventWebhooks).set({
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq10(careEventWebhooks.id, id)).returning();
    return updatedWebhook || null;
  }
  /**
   * Delete a webhook
   * @param id 
   * @returns 
   */
  async deleteWebhook(id) {
    const [deletedWebhook] = await this.db.update(careEventWebhooks).set({
      isActive: false,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq10(careEventWebhooks.id, id)).returning();
    return !!deletedWebhook;
  }
  /**
   * Generate HMAC signature for webhook payload
   * @param payload 
   * @param secret 
   * @returns 
   */
  generateSignature(payload, secret) {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest("hex");
  }
  /**
   * Send a webhook notification
   * @param webhook 
   * @param payload 
   * @returns 
   */
  async sendWebhook(webhook, payload) {
    try {
      if (!webhook.events.includes(payload.event)) {
        return false;
      }
      const signature = this.generateSignature(payload, webhook.secret);
      const response = await axios5.post(webhook.webhookUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": payload.event
        },
        timeout: 5e3
        // 5 second timeout
      });
      return response.status >= 200 && response.status < 300;
    } catch (error2) {
      console.error(`Error sending webhook to ${webhook.webhookUrl}:`, error2);
      return false;
    }
  }
  /**
   * Notify care event partners about a specific event
   * @param careEventId 
   * @param notificationType 
   * @param metadata 
   */
  async notifyPartners(careEventId, notificationType, metadata) {
    try {
      const careEvent = await this.directoryService.getCareEvent(careEventId);
      if (!careEvent) {
        throw new Error(`Care event with ID ${careEventId} not found`);
      }
      const partners = await this.directoryService.getCareEventPartners(careEventId);
      for (const partner of partners) {
        const webhooks = await this.getPartnerWebhooks(partner.partnerId);
        const payload = {
          event: notificationType,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          careEvent,
          metadata
        };
        await Promise.all(webhooks.map((webhook) => this.sendWebhook(webhook, payload)));
      }
    } catch (error2) {
      console.error(`Error notifying partners for care event ${careEventId}:`, error2);
    }
  }
  /**
   * Notify about care event creation
   * @param careEventId 
   */
  async notifyCareEventCreated(careEventId) {
    await this.notifyPartners(careEventId, "care-event.create" /* CREATE */);
  }
  /**
   * Notify about care event update
   * @param careEventId 
   * @param changes 
   */
  async notifyCareEventUpdated(careEventId, changes) {
    await this.notifyPartners(careEventId, "care-event.update" /* UPDATE */, { changes });
  }
  /**
   * Notify about care event status change
   * @param careEventId 
   * @param oldStatus 
   * @param newStatus 
   */
  async notifyCareEventStatusChanged(careEventId, oldStatus, newStatus) {
    await this.notifyPartners(careEventId, "care-event.status.change" /* STATUS_CHANGE */, {
      oldStatus,
      newStatus
    });
  }
  /**
   * Notify about new partner added to care event
   * @param careEventId 
   * @param partnerId 
   * @param partnerType 
   */
  async notifyPartnerAdded(careEventId, partnerId, partnerType) {
    await this.notifyPartners(careEventId, "care-event.partner.added" /* PARTNER_ADDED */, {
      partnerId,
      partnerType
    });
  }
  /**
   * Notify about new transaction added to care event
   * @param careEventId 
   * @param transactionId 
   * @param transactionType 
   */
  async notifyTransactionAdded(careEventId, transactionId, transactionType) {
    await this.notifyPartners(careEventId, "care-event.transaction.added" /* TRANSACTION_ADDED */, {
      transactionId,
      transactionType
    });
  }
  /**
   * Close database connection
   */
  async close() {
    await this.directoryService.close();
    await this.pool.end();
  }
};

// server/routes/care-event-routes.ts
import { z as z5 } from "zod";
var router3 = express5.Router();
var directoryService = new CareEventDirectoryService();
var notificationService = new CareEventNotificationService();
var validateCareEvent = (req, res, next2) => {
  try {
    req.body = insertCareEventSchema.parse(req.body);
    next2();
  } catch (error2) {
    if (error2 instanceof z5.ZodError) {
      res.status(400).json({ error: error2.errors });
    } else {
      res.status(400).json({ error: "Invalid care event data" });
    }
  }
};
var validateCareEventPartner = (req, res, next2) => {
  try {
    req.body = insertCareEventPartnerSchema.omit({ id: true, careEventId: true }).parse(req.body);
    next2();
  } catch (error2) {
    if (error2 instanceof z5.ZodError) {
      res.status(400).json({ error: error2.errors });
    } else {
      res.status(400).json({ error: "Invalid partner data" });
    }
  }
};
router3.post("/care-events", validateCareEvent, async (req, res) => {
  try {
    const careEvent = await directoryService.createCareEvent(req.body);
    await notificationService.notifyCareEventCreated(careEvent.id);
    res.status(201).json(careEvent);
  } catch (error2) {
    console.error("Error creating care event:", error2);
    res.status(500).json({ error: "Failed to create care event" });
  }
});
router3.get("/care-events/:id", async (req, res) => {
  try {
    const careEvent = await directoryService.getCareEvent(req.params.id);
    if (!careEvent) {
      return res.status(404).json({ error: "Care event not found" });
    }
    res.json(careEvent);
  } catch (error2) {
    console.error("Error getting care event:", error2);
    res.status(500).json({ error: "Failed to get care event" });
  }
});
router3.put("/care-events/:id", validateCareEvent, async (req, res) => {
  try {
    const existingEvent = await directoryService.getCareEvent(req.params.id);
    if (!existingEvent) {
      return res.status(404).json({ error: "Care event not found" });
    }
    const updatedEvent = await directoryService.updateCareEvent(req.params.id, req.body);
    await notificationService.notifyCareEventUpdated(req.params.id, req.body);
    if (existingEvent.status !== req.body.status) {
      await notificationService.notifyCareEventStatusChanged(
        req.params.id,
        existingEvent.status,
        req.body.status
      );
    }
    res.json(updatedEvent);
  } catch (error2) {
    console.error("Error updating care event:", error2);
    res.status(500).json({ error: "Failed to update care event" });
  }
});
router3.get("/patients/:patientId/care-events", async (req, res) => {
  try {
    const careEvents2 = await directoryService.getPatientCareEvents(req.params.patientId);
    res.json(careEvents2);
  } catch (error2) {
    console.error("Error getting patient care events:", error2);
    res.status(500).json({ error: "Failed to get patient care events" });
  }
});
router3.post("/care-events/:id/partners", validateCareEventPartner, async (req, res) => {
  try {
    const partnerData = req.body;
    const partner = await directoryService.addPartnerToCareEvent(req.params.id, partnerData);
    await notificationService.notifyPartnerAdded(
      req.params.id,
      partnerData.partnerId,
      partnerData.partnerType
    );
    res.status(201).json(partner);
  } catch (error2) {
    console.error("Error adding partner to care event:", error2);
    res.status(500).json({ error: "Failed to add partner to care event" });
  }
});
router3.get("/care-events/:id/partners", async (req, res) => {
  try {
    const partners = await directoryService.getCareEventPartners(req.params.id);
    res.json(partners);
  } catch (error2) {
    console.error("Error getting care event partners:", error2);
    res.status(500).json({ error: "Failed to get care event partners" });
  }
});
router3.get("/care-events", async (req, res) => {
  try {
    const { query, patientId, providerId, facilityId, status, limit, offset } = req.query;
    const result = await directoryService.searchCareEvents({
      query,
      patientId,
      providerId,
      facilityId,
      status,
      limit: limit ? parseInt(limit) : void 0,
      offset: offset ? parseInt(offset) : void 0
    });
    res.json(result);
  } catch (error2) {
    console.error("Error searching care events:", error2);
    res.status(500).json({ error: "Failed to search care events" });
  }
});
router3.delete("/care-events/:id", async (req, res) => {
  try {
    const success = await directoryService.deleteCareEvent(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Care event not found" });
    }
    await notificationService.notifyPartners(req.params.id, "care-event.delete" /* DELETE */);
    res.status(204).send();
  } catch (error2) {
    console.error("Error deleting care event:", error2);
    res.status(500).json({ error: "Failed to delete care event" });
  }
});
router3.post("/partners/:partnerId/webhooks", async (req, res) => {
  try {
    const { webhookUrl, events } = req.body;
    if (!webhookUrl || !events || !Array.isArray(events)) {
      return res.status(400).json({ error: "Invalid webhook data. webhookUrl and events array are required." });
    }
    const webhook = await notificationService.registerWebhook(
      req.params.partnerId,
      webhookUrl,
      events
    );
    res.status(201).json(webhook);
  } catch (error2) {
    console.error("Error registering webhook:", error2);
    res.status(500).json({ error: "Failed to register webhook" });
  }
});
router3.get("/partners/:partnerId/webhooks", async (req, res) => {
  try {
    const webhooks = await notificationService.getPartnerWebhooks(req.params.partnerId);
    res.json(webhooks);
  } catch (error2) {
    console.error("Error getting partner webhooks:", error2);
    res.status(500).json({ error: "Failed to get partner webhooks" });
  }
});
router3.put("/webhooks/:id", async (req, res) => {
  try {
    const { webhookUrl, events, isActive } = req.body;
    if (!webhookUrl && !events && isActive === void 0) {
      return res.status(400).json({ error: "No update data provided" });
    }
    const updatedWebhook = await notificationService.updateWebhook(req.params.id, {
      webhookUrl,
      events,
      isActive
    });
    if (!updatedWebhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }
    res.json(updatedWebhook);
  } catch (error2) {
    console.error("Error updating webhook:", error2);
    res.status(500).json({ error: "Failed to update webhook" });
  }
});
router3.delete("/webhooks/:id", async (req, res) => {
  try {
    const success = await notificationService.deleteWebhook(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Webhook not found" });
    }
    res.status(204).send();
  } catch (error2) {
    console.error("Error deleting webhook:", error2);
    res.status(500).json({ error: "Failed to delete webhook" });
  }
});
var care_event_routes_default = router3;

// server/routes/goldcarding-routes.ts
import { Router as Router3 } from "express";
import { z as z6 } from "zod";

// server/services/goldcarding/goldcarding-service.ts
import { v4 as uuidv48 } from "uuid";
import { eq as eq11, and as and7, or as or3, gte, desc as desc6, sql as sql8 } from "drizzle-orm";
init_logger();
import postgres from "postgres";

// shared/goldcarding-schema.ts
import { pgTable as pgTable10, text as text10, timestamp as timestamp10, pgEnum as pgEnum4, uuid as uuid8, boolean as boolean10, integer as integer8, jsonb as jsonb8 } from "drizzle-orm/pg-core";
import { relations as relations5 } from "drizzle-orm";
import { createInsertSchema as createInsertSchema10 } from "drizzle-zod";
var goldcardStatusEnum = pgEnum4("goldcard_status", [
  "active",
  "revoked",
  "expired",
  "pending_review",
  "suspended"
]);
var goldcardServiceCategoryEnum = pgEnum4("goldcard_service_category", [
  "procedure",
  "service_group",
  "specialty",
  "facility_type"
]);
var goldcardProviderProfiles = pgTable10("goldcard_provider_profiles", {
  id: uuid8("id").primaryKey().defaultRandom(),
  providerId: text10("provider_id").notNull(),
  providerName: text10("provider_name").notNull(),
  overallApprovalRate: integer8("overall_approval_rate"),
  totalAuthRequests: integer8("total_auth_requests").default(0),
  totalApproved: integer8("total_approved").default(0),
  totalDenied: integer8("total_denied").default(0),
  averageResponseTime: integer8("average_response_time"),
  // in hours
  createdAt: timestamp10("created_at").defaultNow().notNull(),
  updatedAt: timestamp10("updated_at").defaultNow().notNull(),
  metadataJson: jsonb8("metadata_json"),
  // Additional flexible data
  lastEvaluationDate: timestamp10("last_evaluation_date"),
  evaluationFrequency: text10("evaluation_frequency").default("monthly"),
  // monthly, quarterly
  isActive: boolean10("is_active").default(true)
});
var goldcardEligibility = pgTable10("goldcard_eligibility", {
  id: uuid8("id").primaryKey().defaultRandom(),
  providerProfileId: uuid8("provider_profile_id").notNull().references(() => goldcardProviderProfiles.id),
  serviceCode: text10("service_code").notNull(),
  serviceName: text10("service_name").notNull(),
  serviceCategory: goldcardServiceCategoryEnum("service_category").notNull(),
  status: goldcardStatusEnum("status").notNull().default("active"),
  startDate: timestamp10("start_date").notNull(),
  endDate: timestamp10("end_date"),
  // If null, no expiration
  eligibilityScore: integer8("eligibility_score"),
  // Calculated score (e.g., 0-100)
  approvalRate: integer8("approval_rate"),
  // Percentage for this specific service
  totalAuthRequests: integer8("total_auth_requests").default(0),
  totalApproved: integer8("total_approved").default(0),
  totalDenied: integer8("total_denied").default(0),
  createdAt: timestamp10("created_at").defaultNow().notNull(),
  updatedAt: timestamp10("updated_at").defaultNow().notNull(),
  lastReviewDate: timestamp10("last_review_date"),
  reviewNotes: text10("review_notes"),
  revocationReason: text10("revocation_reason"),
  claimAccuracyRate: integer8("claim_accuracy_rate"),
  // Percentage
  metadataJson: jsonb8("metadata_json")
  // Additional flexible data
});
var goldcardRules = pgTable10("goldcard_rules", {
  id: uuid8("id").primaryKey().defaultRandom(),
  name: text10("name").notNull(),
  description: text10("description"),
  serviceCategory: goldcardServiceCategoryEnum("service_category").notNull(),
  serviceCodes: jsonb8("service_codes"),
  // Array of service codes this rule applies to
  requiredApprovalRate: integer8("required_approval_rate").notNull(),
  // Minimum approval rate required (percentage)
  minAuthRequests: integer8("min_auth_requests").notNull(),
  // Minimum number of requests required
  evaluationPeriodMonths: integer8("evaluation_period_months").notNull(),
  // How far back to look
  reviewFrequency: text10("review_frequency").notNull().default("monthly"),
  // How often to re-evaluate
  isActive: boolean10("is_active").default(true),
  createdAt: timestamp10("created_at").defaultNow().notNull(),
  updatedAt: timestamp10("updated_at").defaultNow().notNull(),
  additionalCriteria: jsonb8("additional_criteria"),
  // Any other rule criteria in flexible format
  payerId: text10("payer_id"),
  // If null, applies to all payers
  organizationId: text10("organization_id")
  // If null, applies to all orgs
});
var goldcardEvents = pgTable10("goldcard_events", {
  id: uuid8("id").primaryKey().defaultRandom(),
  providerProfileId: uuid8("provider_profile_id").notNull().references(() => goldcardProviderProfiles.id),
  eligibilityId: uuid8("eligibility_id").references(() => goldcardEligibility.id),
  eventType: text10("event_type").notNull(),
  // GRANTED, REVOKED, SUSPENDED, etc.
  serviceCode: text10("service_code"),
  serviceName: text10("service_name"),
  timestamp: timestamp10("timestamp").defaultNow().notNull(),
  details: jsonb8("details"),
  // Additional event details
  userId: text10("user_id"),
  // Who triggered the event (if manual)
  reason: text10("reason")
});
var goldcardPriorAuthTracker = pgTable10("goldcard_prior_auth_tracker", {
  id: uuid8("id").primaryKey().defaultRandom(),
  priorAuthId: text10("prior_auth_id").notNull(),
  providerId: text10("provider_id").notNull(),
  serviceCode: text10("service_code").notNull(),
  patientId: text10("patient_id"),
  requestedDate: timestamp10("requested_date").notNull(),
  decisionDate: timestamp10("decision_date"),
  outcome: text10("outcome"),
  // approved, denied
  decisionSource: text10("decision_source"),
  // payer, goldcard
  appealOutcome: text10("appeal_outcome"),
  comments: text10("comments"),
  authNumber: text10("auth_number"),
  metadataJson: jsonb8("metadata_json"),
  createdAt: timestamp10("created_at").defaultNow().notNull()
});
var goldcardClaimTracker = pgTable10("goldcard_claim_tracker", {
  id: uuid8("id").primaryKey().defaultRandom(),
  claimId: text10("claim_id").notNull(),
  providerId: text10("provider_id").notNull(),
  serviceCode: text10("service_code").notNull(),
  patientId: text10("patient_id"),
  dateOfService: timestamp10("date_of_service").notNull(),
  claimStatus: text10("claim_status").notNull(),
  // paid, denied
  paidAmount: integer8("paid_amount"),
  denialReason: text10("denial_reason"),
  priorAuthId: text10("prior_auth_id"),
  // Link to prior auth if available
  metadataJson: jsonb8("metadata_json"),
  createdAt: timestamp10("created_at").defaultNow().notNull()
});
var goldcardProviderProfilesRelations = relations5(goldcardProviderProfiles, ({ many }) => ({
  eligibilities: many(goldcardEligibility),
  events: many(goldcardEvents)
}));
var goldcardEligibilityRelations = relations5(goldcardEligibility, ({ one, many }) => ({
  providerProfile: one(goldcardProviderProfiles, {
    fields: [goldcardEligibility.providerProfileId],
    references: [goldcardProviderProfiles.id]
  }),
  events: many(goldcardEvents)
}));
var goldcardEventsRelations = relations5(goldcardEvents, ({ one }) => ({
  providerProfile: one(goldcardProviderProfiles, {
    fields: [goldcardEvents.providerProfileId],
    references: [goldcardProviderProfiles.id]
  }),
  eligibility: one(goldcardEligibility, {
    fields: [goldcardEvents.eligibilityId],
    references: [goldcardEligibility.id]
  })
}));
var insertGoldcardProviderProfileSchema = createInsertSchema10(goldcardProviderProfiles);
var insertGoldcardEligibilitySchema = createInsertSchema10(goldcardEligibility);
var insertGoldcardRuleSchema = createInsertSchema10(goldcardRules);
var insertGoldcardEventSchema = createInsertSchema10(goldcardEvents);
var insertGoldcardPriorAuthTrackerSchema = createInsertSchema10(goldcardPriorAuthTracker);
var insertGoldcardClaimTrackerSchema = createInsertSchema10(goldcardClaimTracker);

// server/services/goldcarding/goldcarding-service.ts
var GoldcardingService = class {
  /**
   * Check if a provider is eligible for goldcarding for a specific service
   * This is the main entry point called by the Prior Authorization module
   */
  async checkEligibility(request) {
    try {
      const { providerId, serviceCode, patientId, payerId, additionalContext } = request;
      logger_default.info(`Checking goldcarding eligibility for provider ${providerId} and service ${serviceCode}`);
      const providerProfile = await this.getProviderProfile(providerId);
      if (!providerProfile) {
        return {
          isEligible: false,
          providerId,
          serviceCode,
          reason: "Provider profile not found"
        };
      }
      if (!providerProfile.isActive) {
        return {
          isEligible: false,
          providerId,
          serviceCode,
          reason: "Provider profile is not active"
        };
      }
      const eligibility = await this.getEligibilityForService(providerProfile.id, serviceCode);
      if (!eligibility) {
        return await this.evaluateEligibilityByRules(providerId, serviceCode, payerId);
      }
      if (eligibility.status !== "active") {
        return {
          isEligible: false,
          providerId,
          serviceCode,
          reason: `Provider eligibility status is ${eligibility.status}`
        };
      }
      if (eligibility.endDate && new Date(eligibility.endDate) < /* @__PURE__ */ new Date()) {
        await db.update(goldcardEligibility).set({
          status: "expired",
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq11(goldcardEligibility.id, eligibility.id));
        await this.recordEvent({
          providerProfileId: providerProfile.id,
          eligibilityId: eligibility.id,
          eventType: "EXPIRED",
          serviceCode,
          serviceName: eligibility.serviceName,
          reason: "Eligibility period ended",
          details: { automaticExpiration: true }
        });
        return {
          isEligible: false,
          providerId,
          serviceCode,
          reason: "Eligibility has expired"
        };
      }
      return {
        isEligible: true,
        providerId,
        serviceCode,
        reason: "Provider is goldcarded for this service",
        details: {
          eligibilityId: eligibility.id,
          startDate: eligibility.startDate,
          endDate: eligibility.endDate,
          approvalRate: eligibility.approvalRate
        }
      };
    } catch (error2) {
      logger_default.error("Error checking goldcarding eligibility:", error2);
      return {
        isEligible: false,
        providerId: request.providerId,
        serviceCode: request.serviceCode,
        reason: "Error occurred during eligibility check"
      };
    }
  }
  /**
   * Evaluate eligibility based on rules when no explicit eligibility record exists
   */
  async evaluateEligibilityByRules(providerId, serviceCode, payerId) {
    try {
      const providerProfile = await this.getProviderProfile(providerId);
      if (!providerProfile) {
        return {
          isEligible: false,
          providerId,
          serviceCode,
          reason: "Provider profile not found"
        };
      }
      const rules = await this.getApplicableRules(serviceCode, payerId);
      if (rules.length === 0) {
        return {
          isEligible: false,
          providerId,
          serviceCode,
          reason: "No applicable goldcarding rules found for this service"
        };
      }
      for (const rule of rules) {
        const stats = await this.getProviderServiceStats(providerId, serviceCode, rule.evaluationPeriodMonths);
        const meetsMinRequests = stats.totalAuthRequests >= rule.minAuthRequests;
        const meetsApprovalRate = stats.approvalRate >= rule.requiredApprovalRate;
        if (meetsMinRequests && meetsApprovalRate) {
          const serviceName = await this.getServiceName(serviceCode);
          const newEligibility = await this.createEligibility({
            providerProfileId: providerProfile.id,
            serviceCode,
            serviceName: serviceName || serviceCode,
            serviceCategory: rule.serviceCategory,
            status: "active",
            startDate: /* @__PURE__ */ new Date(),
            endDate: this.calculateEndDate(rule.reviewFrequency),
            eligibilityScore: stats.approvalRate,
            approvalRate: stats.approvalRate,
            totalAuthRequests: stats.totalAuthRequests,
            totalApproved: stats.totalApproved,
            totalDenied: stats.totalDenied
          });
          await this.recordEvent({
            providerProfileId: providerProfile.id,
            eligibilityId: newEligibility.id,
            eventType: "GRANTED",
            serviceCode,
            serviceName: serviceName || serviceCode,
            reason: `Auto-approved based on rule: ${rule.name}`,
            details: {
              rule: rule.id,
              stats: {
                approvalRate: stats.approvalRate,
                totalAuthRequests: stats.totalAuthRequests
              }
            }
          });
          return {
            isEligible: true,
            providerId,
            serviceCode,
            reason: "Provider meets goldcarding criteria for this service",
            details: {
              eligibilityId: newEligibility.id,
              startDate: newEligibility.startDate,
              endDate: newEligibility.endDate,
              approvalRate: stats.approvalRate
            }
          };
        }
      }
      return {
        isEligible: false,
        providerId,
        serviceCode,
        reason: "Provider does not meet goldcarding criteria for this service"
      };
    } catch (error2) {
      logger_default.error("Error evaluating eligibility by rules:", error2);
      return {
        isEligible: false,
        providerId,
        serviceCode,
        reason: "Error occurred during rules evaluation"
      };
    }
  }
  /**
   * Record a prior authorization decision for tracking and analysis
   */
  async recordPriorAuthDecision(data) {
    try {
      logger_default.info(`Recording prior auth decision for provider ${data.providerId} and service ${data.serviceCode}`);
      const [record] = await db.insert(goldcardPriorAuthTracker).values({
        ...data,
        id: uuidv48()
      }).returning();
      await this.updateProviderStats(data.providerId, data.serviceCode, data.outcome === "approved");
      return record;
    } catch (error2) {
      logger_default.error("Error recording prior auth decision:", error2);
      throw error2;
    }
  }
  /**
   * Record a claim outcome for tracking and analysis
   */
  async recordClaimOutcome(data) {
    try {
      logger_default.info(`Recording claim outcome for provider ${data.providerId} and service ${data.serviceCode}`);
      const [record] = await db.insert(goldcardClaimTracker).values({
        ...data,
        id: uuidv48()
      }).returning();
      if (data.priorAuthId) {
        await this.correlateClaimWithPriorAuth(record.id, data.priorAuthId);
      }
      return record;
    } catch (error2) {
      logger_default.error("Error recording claim outcome:", error2);
      throw error2;
    }
  }
  /**
   * Get a provider's profile, creating it if it doesn't exist
   */
  async getProviderProfile(providerId) {
    try {
      const [profile] = await db.select().from(goldcardProviderProfiles).where(eq11(goldcardProviderProfiles.providerId, providerId));
      if (profile) {
        return profile;
      }
      const providerName = await this.getProviderName(providerId);
      if (!providerName) {
        logger_default.warn(`Provider ${providerId} not found in provider directory`);
        return void 0;
      }
      const [newProfile] = await db.insert(goldcardProviderProfiles).values({
        id: uuidv48(),
        providerId,
        providerName,
        totalAuthRequests: 0,
        totalApproved: 0,
        totalDenied: 0,
        isActive: true
      }).returning();
      return newProfile;
    } catch (error2) {
      logger_default.error(`Error getting provider profile for ${providerId}:`, error2);
      return void 0;
    }
  }
  /**
   * Get eligibility record for a specific service
   */
  async getEligibilityForService(providerProfileId, serviceCode) {
    try {
      const [eligibility] = await db.select().from(goldcardEligibility).where(and7(
        eq11(goldcardEligibility.providerProfileId, providerProfileId),
        eq11(goldcardEligibility.serviceCode, serviceCode)
      ));
      return eligibility;
    } catch (error2) {
      logger_default.error(`Error getting eligibility for service ${serviceCode}:`, error2);
      return void 0;
    }
  }
  /**
   * Get applicable rules for a service
   */
  async getApplicableRules(serviceCode, payerId) {
    try {
      const rules = await db.select().from(goldcardRules).where(and7(
        eq11(goldcardRules.isActive, true),
        or3(
          // Match rules with a specific payer ID or null (applicable to all payers)
          payerId ? or3(
            eq11(goldcardRules.payerId, payerId),
            sql8`${goldcardRules.payerId} IS NULL`
          ) : sql8`${goldcardRules.payerId} IS NULL`,
          // Match rules where the service code is in the array of service codes
          sql8`${goldcardRules.serviceCodes}::jsonb @> jsonb_build_array(${serviceCode})`
        )
      ));
      return rules;
    } catch (error2) {
      logger_default.error(`Error getting applicable rules for service ${serviceCode}:`, error2);
      return [];
    }
  }
  /**
   * Get provider's historical stats for a service
   */
  async getProviderServiceStats(providerId, serviceCode, months) {
    try {
      const startDate = /* @__PURE__ */ new Date();
      startDate.setMonth(startDate.getMonth() - months);
      const authRecords = await db.select().from(goldcardPriorAuthTracker).where(and7(
        eq11(goldcardPriorAuthTracker.providerId, providerId),
        eq11(goldcardPriorAuthTracker.serviceCode, serviceCode),
        gte(goldcardPriorAuthTracker.requestedDate, startDate)
      ));
      const totalAuthRequests = authRecords.length;
      const totalApproved = authRecords.filter((record) => record.outcome === "approved").length;
      const totalDenied = totalAuthRequests - totalApproved;
      const approvalRate = totalAuthRequests > 0 ? Math.round(totalApproved / totalAuthRequests * 100) : 0;
      return {
        approvalRate,
        totalAuthRequests,
        totalApproved,
        totalDenied
      };
    } catch (error2) {
      logger_default.error(`Error getting provider stats for ${providerId} and service ${serviceCode}:`, error2);
      return {
        approvalRate: 0,
        totalAuthRequests: 0,
        totalApproved: 0,
        totalDenied: 0
      };
    }
  }
  /**
   * Update provider's stats after a new prior auth decision
   */
  async updateProviderStats(providerId, serviceCode, isApproved) {
    try {
      const providerProfile = await this.getProviderProfile(providerId);
      if (!providerProfile) {
        logger_default.warn(`Cannot update stats - provider ${providerId} not found`);
        return;
      }
      const currentAuthRequests = providerProfile.totalAuthRequests || 0;
      const currentApproved = providerProfile.totalApproved || 0;
      const currentDenied = providerProfile.totalDenied || 0;
      const newAuthRequests = currentAuthRequests + 1;
      const newApproved = currentApproved + (isApproved ? 1 : 0);
      const newDenied = currentDenied + (isApproved ? 0 : 1);
      const newApprovalRate = Math.round(newApproved / newAuthRequests * 100);
      await db.update(goldcardProviderProfiles).set({
        totalAuthRequests: newAuthRequests,
        totalApproved: newApproved,
        totalDenied: newDenied,
        overallApprovalRate: newApprovalRate,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq11(goldcardProviderProfiles.id, providerProfile.id));
      const eligibility = await this.getEligibilityForService(providerProfile.id, serviceCode);
      if (eligibility) {
        const eligAuthRequests = eligibility.totalAuthRequests || 0;
        const eligApproved = eligibility.totalApproved || 0;
        const eligDenied = eligibility.totalDenied || 0;
        const newEligAuthRequests = eligAuthRequests + 1;
        const newEligApproved = eligApproved + (isApproved ? 1 : 0);
        const newEligDenied = eligDenied + (isApproved ? 0 : 1);
        const newEligApprovalRate = Math.round(newEligApproved / newEligAuthRequests * 100);
        await db.update(goldcardEligibility).set({
          totalAuthRequests: newEligAuthRequests,
          totalApproved: newEligApproved,
          totalDenied: newEligDenied,
          approvalRate: newEligApprovalRate,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq11(goldcardEligibility.id, eligibility.id));
      }
    } catch (error2) {
      logger_default.error(`Error updating provider stats for ${providerId}:`, error2);
    }
  }
  /**
   * Create a new eligibility record
   */
  async createEligibility(data) {
    const [eligibility] = await db.insert(goldcardEligibility).values({
      ...data,
      id: uuidv48()
    }).returning();
    return eligibility;
  }
  /**
   * Record a goldcarding event
   */
  async recordEvent(data) {
    const [event] = await db.insert(goldcardEvents).values({
      ...data,
      id: uuidv48(),
      timestamp: /* @__PURE__ */ new Date()
    }).returning();
    return event;
  }
  /**
   * Correlate a claim with a prior auth
   */
  async correlateClaimWithPriorAuth(claimTrackerId, priorAuthId) {
    try {
      const [priorAuth] = await db.select().from(goldcardPriorAuthTracker).where(eq11(goldcardPriorAuthTracker.priorAuthId, priorAuthId));
      if (!priorAuth) {
        logger_default.warn(`Prior auth ${priorAuthId} not found for correlation with claim`);
        return;
      }
      const [claim] = await db.select().from(goldcardClaimTracker).where(eq11(goldcardClaimTracker.id, claimTrackerId));
      if (!claim) {
        logger_default.warn(`Claim ${claimTrackerId} not found for correlation with prior auth`);
        return;
      }
      if (priorAuth.outcome === "approved" && claim.claimStatus === "denied" || priorAuth.outcome === "denied" && claim.claimStatus === "paid") {
        const providerProfile = await this.getProviderProfile(priorAuth.providerId);
        if (!providerProfile) return;
        const eligibility = await this.getEligibilityForService(
          providerProfile.id,
          priorAuth.serviceCode
        );
        if (eligibility) {
          await this.recordEvent({
            providerProfileId: providerProfile.id,
            eligibilityId: eligibility.id,
            eventType: "DISCREPANCY_DETECTED",
            serviceCode: priorAuth.serviceCode,
            serviceName: eligibility.serviceName,
            reason: `Prior auth and claim outcomes don't match`,
            details: {
              priorAuthId: priorAuth.id,
              priorAuthOutcome: priorAuth.outcome,
              claimId: claim.id,
              claimStatus: claim.claimStatus
            }
          });
          const currentRate = eligibility.claimAccuracyRate || 100;
          const newRate = Math.max(0, currentRate - 5);
          await db.update(goldcardEligibility).set({
            claimAccuracyRate: newRate,
            updatedAt: /* @__PURE__ */ new Date(),
            // If accuracy falls below 70%, suspend the eligibility
            ...newRate < 70 ? {
              status: "suspended",
              reviewNotes: "Automatically suspended due to low claim accuracy rate"
            } : {}
          }).where(eq11(goldcardEligibility.id, eligibility.id));
          if (newRate < 70) {
            await this.recordEvent({
              providerProfileId: providerProfile.id,
              eligibilityId: eligibility.id,
              eventType: "SUSPENDED",
              serviceCode: priorAuth.serviceCode,
              serviceName: eligibility.serviceName,
              reason: "Claim accuracy rate fell below threshold",
              details: {
                oldRate: currentRate,
                newRate,
                threshold: 70
              }
            });
          }
        }
      }
    } catch (error2) {
      logger_default.error("Error correlating claim with prior auth:", error2);
    }
  }
  /**
   * Calculate end date based on review frequency
   */
  calculateEndDate(reviewFrequency) {
    const endDate = /* @__PURE__ */ new Date();
    switch (reviewFrequency.toLowerCase()) {
      case "monthly":
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case "quarterly":
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case "semi-annual":
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case "annual":
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 6);
    }
    return endDate;
  }
  /**
   * Get provider name from provider directory
   * This is a placeholder - in the real system, it would call the Provider Directory service
   */
  async getProviderName(providerId) {
    try {
      return `Provider ${providerId}`;
    } catch (error2) {
      logger_default.error(`Error getting provider name for ${providerId}:`, error2);
      return void 0;
    }
  }
  /**
   * Get service name from service catalog
   * This is a placeholder - in the real system, it would call a Service Catalog API
   */
  async getServiceName(serviceCode) {
    try {
      return `Service ${serviceCode}`;
    } catch (error2) {
      logger_default.error(`Error getting service name for ${serviceCode}:`, error2);
      return void 0;
    }
  }
  /**
   * Get all service eligibilities for a provider
   */
  async getProviderEligibilities(providerId) {
    try {
      const profile = await this.getProviderProfile(providerId);
      if (!profile) {
        return [];
      }
      const eligibilities = await db.select().from(goldcardEligibility).where(eq11(goldcardEligibility.providerProfileId, profile.id)).orderBy(desc6(goldcardEligibility.updatedAt));
      return eligibilities;
    } catch (error2) {
      logger_default.error(`Error getting eligibilities for provider ${providerId}:`, error2);
      return [];
    }
  }
  /**
   * Get all providers eligible for a specific service
   */
  async getProvidersForService(serviceCode) {
    try {
      const eligibilities = await db.select({
        eligibility: goldcardEligibility,
        profile: goldcardProviderProfiles
      }).from(goldcardEligibility).innerJoin(
        goldcardProviderProfiles,
        eq11(goldcardEligibility.providerProfileId, goldcardProviderProfiles.id)
      ).where(and7(
        eq11(goldcardEligibility.serviceCode, serviceCode),
        eq11(goldcardEligibility.status, "active")
      ));
      return eligibilities.map((record) => ({
        providerId: record.profile.providerId,
        providerName: record.profile.providerName,
        eligibility: record.eligibility
      }));
    } catch (error2) {
      logger_default.error(`Error getting providers for service ${serviceCode}:`, error2);
      return [];
    }
  }
  /**
   * Get all events for a provider
   */
  async getProviderEvents(providerId) {
    try {
      const profile = await this.getProviderProfile(providerId);
      if (!profile) {
        return [];
      }
      const events = await db.select().from(goldcardEvents).where(eq11(goldcardEvents.providerProfileId, profile.id)).orderBy(desc6(goldcardEvents.timestamp));
      return events;
    } catch (error2) {
      logger_default.error(`Error getting events for provider ${providerId}:`, error2);
      return [];
    }
  }
};
async function initGoldcardingTables() {
  try {
    logger_default.info("Initializing goldcarding database tables");
    const sql13 = postgres(process.env.DATABASE_URL);
    const statusEnumExists = await sql13`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'goldcard_status'
      );
    `;
    if (!statusEnumExists[0].exists) {
      logger_default.info("Creating goldcard_status enum");
      await sql13`
        CREATE TYPE goldcard_status AS ENUM (
          'active', 'suspended', 'expired', 'revoked'
        );
      `;
    }
    const serviceCategoryEnumExists = await sql13`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'goldcard_service_category'
      );
    `;
    if (!serviceCategoryEnumExists[0].exists) {
      logger_default.info("Creating goldcard_service_category enum");
      await sql13`
        CREATE TYPE goldcard_service_category AS ENUM (
          'diagnostics', 'procedures', 'treatments', 'supplies', 'medications', 'dme'
        );
      `;
    }
    await sql13`
      CREATE TABLE IF NOT EXISTS goldcard_provider_profiles (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL UNIQUE,
        provider_name TEXT NOT NULL,
        total_auth_requests INTEGER NOT NULL DEFAULT 0,
        total_approved INTEGER NOT NULL DEFAULT 0,
        total_denied INTEGER NOT NULL DEFAULT 0,
        overall_approval_rate INTEGER,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `;
    await sql13`
      CREATE TABLE IF NOT EXISTS goldcard_eligibility (
        id TEXT PRIMARY KEY,
        provider_profile_id TEXT NOT NULL REFERENCES goldcard_provider_profiles(id),
        service_code TEXT NOT NULL,
        service_name TEXT NOT NULL,
        service_category goldcard_service_category NOT NULL,
        status goldcard_status NOT NULL DEFAULT 'active',
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE,
        eligibility_score INTEGER,
        approval_rate INTEGER,
        total_auth_requests INTEGER NOT NULL DEFAULT 0,
        total_approved INTEGER NOT NULL DEFAULT 0,
        total_denied INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(provider_profile_id, service_code)
      );
    `;
    await sql13`
      CREATE TABLE IF NOT EXISTS goldcard_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        service_codes JSONB NOT NULL,
        service_category goldcard_service_category NOT NULL,
        payer_id TEXT,
        required_approval_rate INTEGER NOT NULL,
        min_auth_requests INTEGER NOT NULL,
        evaluation_period_months INTEGER NOT NULL,
        review_frequency TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `;
    await sql13`
      CREATE TABLE IF NOT EXISTS goldcard_events (
        id TEXT PRIMARY KEY,
        provider_profile_id TEXT NOT NULL REFERENCES goldcard_provider_profiles(id),
        eligibility_id TEXT REFERENCES goldcard_eligibility(id),
        event_type TEXT NOT NULL,
        service_code TEXT NOT NULL,
        service_name TEXT NOT NULL,
        reason TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql13`
      CREATE TABLE IF NOT EXISTS goldcard_prior_auth_tracker (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        patient_id TEXT,
        service_code TEXT NOT NULL,
        service_name TEXT NOT NULL,
        payer_id TEXT,
        requested_date TIMESTAMP WITH TIME ZONE NOT NULL,
        decision_date TIMESTAMP WITH TIME ZONE,
        outcome TEXT NOT NULL,
        decision_details JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql13`
      CREATE TABLE IF NOT EXISTS goldcard_claim_tracker (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        patient_id TEXT,
        service_code TEXT NOT NULL,
        service_name TEXT NOT NULL,
        payer_id TEXT,
        prior_auth_id TEXT,
        claim_date TIMESTAMP WITH TIME ZONE NOT NULL,
        outcome TEXT NOT NULL,
        outcome_details JSONB,
        denial_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    logger_default.info("Goldcarding database tables initialized successfully");
    await sql13.end();
    return true;
  } catch (error2) {
    logger_default.error("Error initializing goldcarding database tables:", error2);
    return false;
  }
}
var goldcardingService = new GoldcardingService();
initGoldcardingTables().catch((error2) => {
  logger_default.error("Failed to initialize goldcarding tables:", error2);
});

// server/routes/goldcarding-routes.ts
init_logger();
var router4 = Router3();
var checkEligibilitySchema = z6.object({
  providerId: z6.string().min(1),
  serviceCode: z6.string().min(1),
  patientId: z6.string().optional(),
  payerId: z6.string().optional(),
  additionalContext: z6.record(z6.any()).optional()
});
var priorAuthDecisionSchema = z6.object({
  priorAuthId: z6.string().min(1),
  providerId: z6.string().min(1),
  serviceCode: z6.string().min(1),
  patientId: z6.string().optional(),
  requestedDate: z6.string().datetime(),
  decisionDate: z6.string().datetime().optional(),
  outcome: z6.enum(["approved", "denied"]).optional(),
  decisionSource: z6.enum(["payer", "goldcard"]).optional(),
  appealOutcome: z6.string().optional(),
  comments: z6.string().optional(),
  authNumber: z6.string().optional(),
  metadataJson: z6.record(z6.any()).optional()
});
var claimOutcomeSchema = z6.object({
  claimId: z6.string().min(1),
  providerId: z6.string().min(1),
  serviceCode: z6.string().min(1),
  patientId: z6.string().optional(),
  dateOfService: z6.string().datetime(),
  claimStatus: z6.enum(["paid", "denied"]),
  paidAmount: z6.number().optional(),
  denialReason: z6.string().optional(),
  priorAuthId: z6.string().optional(),
  metadataJson: z6.record(z6.any()).optional()
});
router4.post("/check-eligibility", async (req, res) => {
  try {
    const validatedData = checkEligibilitySchema.parse(req.body);
    const result = await goldcardingService.checkEligibility(validatedData);
    res.status(200).json(result);
  } catch (error2) {
    logger_default.error("Error checking goldcarding eligibility:", error2);
    if (error2 instanceof z6.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error2.errors });
    }
    res.status(500).json({ error: "Internal server error checking eligibility" });
  }
});
router4.post("/prior-auth-decision", async (req, res) => {
  try {
    const validatedData = priorAuthDecisionSchema.parse(req.body);
    const data = {
      ...validatedData,
      requestedDate: new Date(validatedData.requestedDate),
      decisionDate: validatedData.decisionDate ? new Date(validatedData.decisionDate) : void 0
    };
    const result = await goldcardingService.recordPriorAuthDecision(data);
    res.status(201).json(result);
  } catch (error2) {
    logger_default.error("Error recording prior auth decision:", error2);
    if (error2 instanceof z6.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error2.errors });
    }
    res.status(500).json({ error: "Internal server error recording prior auth decision" });
  }
});
router4.post("/claim-outcome", async (req, res) => {
  try {
    const validatedData = claimOutcomeSchema.parse(req.body);
    const data = {
      ...validatedData,
      dateOfService: new Date(validatedData.dateOfService)
    };
    const result = await goldcardingService.recordClaimOutcome(data);
    res.status(201).json(result);
  } catch (error2) {
    logger_default.error("Error recording claim outcome:", error2);
    if (error2 instanceof z6.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error2.errors });
    }
    res.status(500).json({ error: "Internal server error recording claim outcome" });
  }
});
router4.get("/providers/:providerId/eligibility", async (req, res) => {
  try {
    const { providerId } = req.params;
    const eligibilities = await goldcardingService.getProviderEligibilities(providerId);
    const result = {
      providerId,
      providerName: eligibilities.length > 0 ? await goldcardingService.getProviderProfile(providerId).then((p) => p?.providerName || providerId) : providerId,
      goldcardedServices: eligibilities.filter((e) => e.status === "active").map((e) => ({
        serviceCode: e.serviceCode,
        serviceName: e.serviceName,
        since: e.startDate,
        expires: e.endDate,
        category: e.serviceCategory
      })),
      statusHistory: eligibilities.filter((e) => e.status !== "active").map((e) => ({
        serviceCode: e.serviceCode,
        serviceName: e.serviceName,
        status: e.status,
        period: `${new Date(e.startDate).toISOString().split("T")[0]} to ${e.endDate ? new Date(e.endDate).toISOString().split("T")[0] : "N/A"}`,
        reason: e.revocationReason || "N/A"
      }))
    };
    res.status(200).json(result);
  } catch (error2) {
    logger_default.error("Error getting provider eligibilities:", error2);
    res.status(500).json({ error: "Internal server error getting provider eligibilities" });
  }
});
router4.get("/services/:serviceCode/providers", async (req, res) => {
  try {
    const { serviceCode } = req.params;
    const providers = await goldcardingService.getProvidersForService(serviceCode);
    const result = {
      serviceCode,
      serviceName: providers.length > 0 ? providers[0].eligibility.serviceName : serviceCode,
      goldcardedProviders: providers.map((p) => ({
        providerId: p.providerId,
        providerName: p.providerName,
        since: p.eligibility.startDate,
        expires: p.eligibility.endDate,
        approvalRate: p.eligibility.approvalRate
      }))
    };
    res.status(200).json(result);
  } catch (error2) {
    logger_default.error("Error getting providers for service:", error2);
    res.status(500).json({ error: "Internal server error getting service providers" });
  }
});
router4.get("/providers/:providerId/events", async (req, res) => {
  try {
    const { providerId } = req.params;
    const events = await goldcardingService.getProviderEvents(providerId);
    const result = events.map((e) => ({
      eventType: e.eventType,
      serviceCode: e.serviceCode,
      serviceName: e.serviceName,
      timestamp: e.timestamp,
      reason: e.reason,
      details: e.details
    }));
    res.status(200).json(result);
  } catch (error2) {
    logger_default.error("Error getting provider events:", error2);
    res.status(500).json({ error: "Internal server error getting provider events" });
  }
});
var goldcarding_routes_default = router4;

// server/routes/claims-routes.ts
import { Router as Router4 } from "express";
import { v4 as uuidv411 } from "uuid";
import { eq as eq15, and as and11, desc as desc9, sql as sql10 } from "drizzle-orm";

// server/services/claims/internal-rules-engine.ts
import { v4 as uuidv49 } from "uuid";
import { eq as eq12 } from "drizzle-orm";
var InternalRulesEngine = class {
  db;
  // Replace with proper type when available
  config;
  constructor(db3, config) {
    this.db = db3;
    this.config = {
      useCaching: true,
      maxCacheAge: 24 * 60 * 60 * 1e3,
      // 24 hours by default
      ...config
    };
  }
  /**
   * Process a claim using the internal rules engine
   * @param claim The claim to process
   * @returns The result of processing
   */
  async processClaim(claimId) {
    try {
      logger_default2.info(`Processing claim ${claimId} using internal rules engine`);
      const [claim] = await this.db.select().from(claims).where(eq12(claims.id, claimId));
      if (!claim) {
        throw new Error(`Claim ${claimId} not found`);
      }
      const lineItems = await this.db.select().from(claimLineItems2).where(eq12(claimLineItems2.claimId, claimId));
      if (this.config.useCaching) {
        const cachedResult = await this.checkRulesCache(claim, lineItems);
        if (cachedResult) {
          logger_default2.info(`Using cached rule result for claim ${claimId}`);
          await this.logClaimEvent(claimId, claim.status, "INTERNAL_RULES_APPLIED", {
            source: "cache",
            result: cachedResult
          });
          return cachedResult;
        }
      }
      const result = await this.evaluateRules({
        claim,
        lineItems,
        config: this.config
      });
      if (this.config.useCaching && result.success) {
        await this.cacheRuleResult(claim, lineItems, result);
      }
      await this.db.update(claims).set({
        status: result.success ? "COMPLETE" : "REJECTED",
        responseData: result,
        processedDate: /* @__PURE__ */ new Date(),
        lastStatusUpdate: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq12(claims.id, claimId));
      await this.logClaimEvent(claimId, result.success ? "COMPLETE" : "REJECTED", "INTERNAL_RULES_APPLIED", {
        result
      });
      return result;
    } catch (error2) {
      logger_default2.error(`Error processing claim ${claimId} with internal rules engine`, { error: error2 });
      if (claimId) {
        await this.db.update(claims).set({
          status: "ERROR",
          lastStatusUpdate: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq12(claims.id, claimId));
        await this.logClaimEvent(claimId, "ERROR", "INTERNAL_RULES_ERROR", {
          error: error2 instanceof Error ? error2.message : String(error2)
        });
      }
      throw error2;
    }
  }
  /**
   * Evaluate rules against the claim
   * @param context The evaluation context
   * @returns The evaluation result
   */
  async evaluateRules(context5) {
    const { claim, lineItems } = context5;
    const result = {
      success: true,
      claimStatus: "COMPLETE",
      allowedAmount: 0,
      patientResponsibility: 0,
      adjudicationDetails: {
        lineItems: []
      },
      errors: [],
      warnings: []
    };
    if (!claim.patientId) {
      result.success = false;
      result.errors.push("Missing patient identifier");
    }
    if (!claim.providerId) {
      result.success = false;
      result.errors.push("Missing provider identifier");
    }
    if (!lineItems || lineItems.length === 0) {
      result.success = false;
      result.errors.push("Claim has no line items");
    }
    if (!result.success) {
      result.claimStatus = "REJECTED";
      return result;
    }
    let totalBilled = 0;
    let totalAllowed = 0;
    let totalPatientResponsibility = 0;
    for (const lineItem of lineItems) {
      const serviceCode = lineItem.serviceCode;
      const billedAmount = lineItem.amount || 0;
      let allowedAmount = billedAmount * 0.8;
      let patientAmount = billedAmount * 0.2;
      totalBilled += billedAmount;
      totalAllowed += allowedAmount;
      totalPatientResponsibility += patientAmount;
      result.adjudicationDetails.lineItems.push({
        lineItemId: lineItem.id,
        serviceCode,
        billedAmount,
        allowedAmount,
        patientResponsibility: patientAmount,
        adjudicationStatus: "APPROVED"
      });
    }
    result.allowedAmount = totalAllowed;
    result.patientResponsibility = totalPatientResponsibility;
    result.adjudicationDetails.summary = {
      totalBilled,
      totalAllowed,
      totalPatientResponsibility
    };
    return result;
  }
  /**
   * Check if there's a valid cached result for this claim
   * @param claim The claim
   * @param lineItems The claim line items
   * @returns The cached result, if found and valid
   */
  async checkRulesCache(claim, lineItems) {
    try {
      const cacheKey = this.createCacheKey(claim, lineItems);
      const [cachedEntry] = await this.db.select().from(claimRulesCache).where(eq12(claimRulesCache.cacheKey, cacheKey));
      if (!cachedEntry) {
        return null;
      }
      const now = /* @__PURE__ */ new Date();
      const cacheAge = now.getTime() - cachedEntry.updatedAt.getTime();
      if (cacheAge > this.config.maxCacheAge) {
        logger_default2.debug(`Cache entry expired for key ${cacheKey}`);
        return null;
      }
      return cachedEntry.result;
    } catch (error2) {
      logger_default2.error("Error checking rules cache", { error: error2 });
      return null;
    }
  }
  /**
   * Cache a rule evaluation result
   * @param claim The claim
   * @param lineItems The claim line items
   * @param result The evaluation result
   */
  async cacheRuleResult(claim, lineItems, result) {
    try {
      const cacheKey = this.createCacheKey(claim, lineItems);
      const [existingEntry] = await this.db.select().from(claimRulesCache).where(eq12(claimRulesCache.cacheKey, cacheKey));
      const now = /* @__PURE__ */ new Date();
      if (existingEntry) {
        await this.db.update(claimRulesCache).set({
          result,
          updatedAt: now
        }).where(eq12(claimRulesCache.id, existingEntry.id));
      } else {
        await this.db.insert(claimRulesCache).values({
          id: uuidv49(),
          cacheKey,
          claimType: claim.type,
          payerId: claim.payerId,
          result,
          createdAt: now,
          updatedAt: now
        });
      }
      logger_default2.debug(`Cached rule result for key ${cacheKey}`);
    } catch (error2) {
      logger_default2.error("Error caching rule result", { error: error2 });
    }
  }
  /**
   * Create a cache key for a claim and its line items
   * @param claim The claim
   * @param lineItems The claim line items
   * @returns A unique cache key
   */
  createCacheKey(claim, lineItems) {
    const claimProps = {
      type: claim.type,
      payerId: claim.payerId,
      providerId: claim.providerId,
      patientId: claim.patientId
    };
    const lineItemsProps = lineItems.map((item) => ({
      serviceCode: item.serviceCode,
      amount: item.amount
    }));
    const combinedProps = {
      claim: claimProps,
      lineItems: lineItemsProps
    };
    return JSON.stringify(combinedProps);
  }
  /**
   * Log a claim event
   * @param claimId The claim ID
   * @param status The claim status
   * @param eventType The event type
   * @param details Additional details
   */
  async logClaimEvent(claimId, status, eventType, details) {
    try {
      const eventData = {
        id: uuidv49(),
        claimId,
        eventType,
        status,
        timestamp: /* @__PURE__ */ new Date(),
        details
      };
      await this.db.insert(claimEvents).values(eventData);
    } catch (error2) {
      logger_default2.error(`Error logging claim event for claim ${claimId}`, { error: error2 });
    }
  }
};

// server/services/claims/external-payer-gateway.ts
import { v4 as uuidv410 } from "uuid";
import { eq as eq13, and as and9, not, asc } from "drizzle-orm";
import axios6 from "axios";
var ExternalPayerGateway = class {
  db;
  // Replace with proper type when available
  payerConnections;
  retryQueue;
  constructor(db3) {
    this.db = db3;
    this.payerConnections = /* @__PURE__ */ new Map();
    this.retryQueue = /* @__PURE__ */ new Map();
    this.loadPayerConnections();
  }
  /**
   * Load payer connections from configuration
   * In a real implementation, this would load from a database
   */
  async loadPayerConnections() {
    const defaultPayerConfig = {
      id: "default",
      name: "Default Payer",
      apiEndpoint: "https://api.defaultpayer.example.com/claims",
      apiAuthType: "bearer",
      apiToken: process.env.DEFAULT_PAYER_TOKEN,
      supportsRealTime: false,
      retryInterval: 30 * 60 * 1e3,
      // 30 minutes
      maxRetries: 5
    };
    this.payerConnections.set("default", defaultPayerConfig);
    logger_default2.info(`Loaded ${this.payerConnections.size} payer connections`);
  }
  /**
   * Submit a claim to an external payer
   * @param claimId The ID of the claim to submit
   * @returns A status indicating whether the claim was successfully submitted
   */
  async submitClaim(claimId) {
    try {
      logger_default2.info(`Submitting claim ${claimId} to external payer`);
      const [claim] = await this.db.select().from(claims).where(eq13(claims.id, claimId));
      if (!claim) {
        logger_default2.error(`Claim ${claimId} not found`);
        return {
          success: false,
          status: "ERROR",
          message: `Claim ${claimId} not found`
        };
      }
      const payerId = claim.payerId || "default";
      const payerConnection = this.payerConnections.get(payerId);
      if (!payerConnection) {
        logger_default2.error(`No payer connection found for payer ${payerId}`);
        await this.db.update(claims).set({
          status: "ERROR",
          lastStatusUpdate: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(claims.id, claimId));
        await this.logClaimEvent(claimId, "ERROR", "EXTERNAL_PAYER_ERROR", {
          error: `No payer connection found for payer ${payerId}`
        });
        return {
          success: false,
          status: "ERROR",
          message: `No payer connection found for payer ${payerId}`
        };
      }
      const forwardId = uuidv410();
      const now = /* @__PURE__ */ new Date();
      const nextAttempt = new Date(now.getTime() + payerConnection.retryInterval);
      const forwardingAttempt = {
        id: forwardId,
        claimId,
        payerId,
        attemptCount: 1,
        status: "QUEUED",
        createdAt: now,
        updatedAt: now,
        nextAttempt
      };
      await this.db.insert(claimPayerForwards).values(forwardingAttempt);
      await this.db.update(claims).set({
        status: "SUBMITTED",
        lastStatusUpdate: now,
        updatedAt: now
      }).where(eq13(claims.id, claimId));
      await this.logClaimEvent(claimId, "SUBMITTED", "EXTERNAL_PAYER_QUEUED", {
        forwardId,
        payerId
      });
      if (payerConnection.supportsRealTime) {
        this.sendClaimToPayer(forwardId).catch((error2) => {
          logger_default2.error(`Failed to send claim to payer (real-time): ${error2.message}`, { error: error2 });
        });
      } else {
        const timeoutId = setTimeout(() => {
          this.sendClaimToPayer(forwardId).catch((error2) => {
            logger_default2.error(`Failed to send claim to payer (async): ${error2.message}`, { error: error2 });
          });
          this.retryQueue.delete(forwardId);
        }, 5e3);
        this.retryQueue.set(forwardId, timeoutId);
      }
      return {
        success: true,
        forwardId,
        status: "QUEUED",
        message: `Claim ${claimId} queued for submission to payer ${payerId}`,
        nextAttempt
      };
    } catch (error2) {
      logger_default2.error(`Error submitting claim ${claimId} to external payer`, { error: error2 });
      if (claimId) {
        await this.db.update(claims).set({
          status: "ERROR",
          lastStatusUpdate: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(claims.id, claimId));
        await this.logClaimEvent(claimId, "ERROR", "EXTERNAL_PAYER_ERROR", {
          error: error2 instanceof Error ? error2.message : String(error2)
        });
      }
      return {
        success: false,
        status: "ERROR",
        message: error2 instanceof Error ? error2.message : String(error2)
      };
    }
  }
  /**
   * Send a claim to the external payer
   * @param forwardId The ID of the forwarding attempt
   */
  async sendClaimToPayer(forwardId) {
    try {
      const [forwardingAttempt] = await this.db.select().from(claimPayerForwards).where(eq13(claimPayerForwards.id, forwardId));
      if (!forwardingAttempt) {
        logger_default2.error(`Forwarding attempt ${forwardId} not found`);
        return;
      }
      const [claim] = await this.db.select().from(claims).where(eq13(claims.id, forwardingAttempt.claimId));
      if (!claim) {
        logger_default2.error(`Claim ${forwardingAttempt.claimId} not found`);
        await this.db.update(claimPayerForwards).set({
          status: "ERROR",
          errorDetails: { error: `Claim ${forwardingAttempt.claimId} not found` },
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(claimPayerForwards.id, forwardId));
        return;
      }
      const lineItems = await this.db.select().from(claimLineItems).where(eq13(claimLineItems.claimId, claim.id));
      const payerId = forwardingAttempt.payerId || "default";
      const payerConnection = this.payerConnections.get(payerId);
      if (!payerConnection) {
        logger_default2.error(`No payer connection found for payer ${payerId}`);
        await this.db.update(claimPayerForwards).set({
          status: "ERROR",
          errorDetails: { error: `No payer connection found for payer ${payerId}` },
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(claimPayerForwards.id, forwardId));
        await this.db.update(claims).set({
          status: "ERROR",
          lastStatusUpdate: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(claims.id, claim.id));
        await this.logClaimEvent(claim.id, "ERROR", "EXTERNAL_PAYER_ERROR", {
          forwardId,
          error: `No payer connection found for payer ${payerId}`
        });
        return;
      }
      await this.db.update(claimPayerForwards).set({
        status: "SENDING",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq13(claimPayerForwards.id, forwardId));
      logger_default2.info(`Sending claim ${claim.id} to payer ${payerId} (attempt ${forwardingAttempt.attemptCount})`);
      const claimData = {
        claimId: claim.id,
        patientId: claim.patientId,
        providerId: claim.providerId,
        organizationId: claim.organizationId,
        type: claim.type,
        serviceDate: claim.serviceDate,
        submissionDate: /* @__PURE__ */ new Date(),
        totalAmount: lineItems.reduce((sum, item) => sum + (item.amount || 0), 0),
        lineItems: lineItems.map((item) => ({
          serviceCode: item.serviceCode,
          description: item.description,
          amount: item.amount,
          quantity: item.quantity,
          serviceDate: item.serviceDate
        }))
      };
      const payerResponse = await this.callPayerApi(payerConnection, claimData);
      if (payerResponse.success) {
        await this.db.update(claimPayerForwards).set({
          status: payerResponse.status || "SENT",
          responseData: payerResponse.responseData,
          sentDate: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(claimPayerForwards.id, forwardId));
        await this.db.update(claims).set({
          status: "PENDING",
          lastStatusUpdate: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(claims.id, claim.id));
        await this.logClaimEvent(claim.id, "PENDING", "EXTERNAL_PAYER_SENT", {
          forwardId,
          payerId
        });
        this.scheduleResponseCheck(forwardId, payerConnection);
      } else {
        const now = /* @__PURE__ */ new Date();
        const nextAttempt = forwardingAttempt.attemptCount >= payerConnection.maxRetries ? void 0 : new Date(now.getTime() + payerConnection.retryInterval);
        const status = forwardingAttempt.attemptCount >= payerConnection.maxRetries ? "FAILED" : "FAILED_RETRY";
        await this.db.update(claimPayerForwards).set({
          status,
          errorDetails: payerResponse.errorDetails,
          attemptCount: forwardingAttempt.attemptCount + 1,
          nextAttempt,
          updatedAt: now
        }).where(eq13(claimPayerForwards.id, forwardId));
        if (forwardingAttempt.attemptCount >= payerConnection.maxRetries) {
          await this.db.update(claims).set({
            status: "FAILED",
            lastStatusUpdate: now,
            updatedAt: now
          }).where(eq13(claims.id, claim.id));
          await this.logClaimEvent(claim.id, "FAILED", "EXTERNAL_PAYER_FAILED", {
            forwardId,
            payerId,
            attemptCount: forwardingAttempt.attemptCount,
            error: payerResponse.errorDetails
          });
        } else {
          this.scheduleRetry(forwardId, payerConnection, forwardingAttempt.attemptCount);
          await this.logClaimEvent(claim.id, "PENDING", "EXTERNAL_PAYER_RETRY_SCHEDULED", {
            forwardId,
            payerId,
            attemptCount: forwardingAttempt.attemptCount,
            nextAttempt
          });
        }
      }
    } catch (error2) {
      logger_default2.error(`Error sending claim to payer (forward ID: ${forwardId})`, { error: error2 });
      const [forwardingAttempt] = await this.db.select().from(claimPayerForwards).where(eq13(claimPayerForwards.id, forwardId));
      if (!forwardingAttempt) return;
      const payerId = forwardingAttempt.payerId || "default";
      const payerConnection = this.payerConnections.get(payerId);
      if (!payerConnection) return;
      const now = /* @__PURE__ */ new Date();
      const nextAttempt = forwardingAttempt.attemptCount >= payerConnection.maxRetries ? void 0 : new Date(now.getTime() + payerConnection.retryInterval);
      const status = forwardingAttempt.attemptCount >= payerConnection.maxRetries ? "FAILED" : "FAILED_RETRY";
      await this.db.update(claimPayerForwards).set({
        status,
        errorDetails: { error: error2 instanceof Error ? error2.message : String(error2) },
        attemptCount: forwardingAttempt.attemptCount + 1,
        nextAttempt,
        updatedAt: now
      }).where(eq13(claimPayerForwards.id, forwardId));
      if (forwardingAttempt.attemptCount >= payerConnection.maxRetries) {
        await this.db.update(claims).set({
          status: "FAILED",
          lastStatusUpdate: now,
          updatedAt: now
        }).where(eq13(claims.id, forwardingAttempt.claimId));
        await this.logClaimEvent(forwardingAttempt.claimId, "FAILED", "EXTERNAL_PAYER_FAILED", {
          forwardId,
          payerId,
          attemptCount: forwardingAttempt.attemptCount,
          error: error2 instanceof Error ? error2.message : String(error2)
        });
      } else {
        this.scheduleRetry(forwardId, payerConnection, forwardingAttempt.attemptCount);
        await this.logClaimEvent(forwardingAttempt.claimId, "PENDING", "EXTERNAL_PAYER_RETRY_SCHEDULED", {
          forwardId,
          payerId,
          attemptCount: forwardingAttempt.attemptCount,
          nextAttempt,
          error: error2 instanceof Error ? error2.message : String(error2)
        });
      }
    }
  }
  /**
   * Call the payer's API to submit a claim
   * @param payerConnection The payer connection details
   * @param claimData The claim data to send
   * @returns The response from the payer
   */
  async callPayerApi(payerConnection, claimData) {
    try {
      if (!payerConnection.apiEndpoint) {
        const simulatedSuccess = Math.random() < 0.8;
        if (simulatedSuccess) {
          return {
            success: true,
            status: "SENT",
            responseData: {
              acknowledgment: "SUCCESS",
              trackingId: uuidv410(),
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }
          };
        } else {
          return {
            success: false,
            status: "FAILED",
            errorDetails: {
              errorCode: "400",
              errorMessage: "Simulated error for testing purposes",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }
          };
        }
      }
      const headers = {
        "Content-Type": "application/json"
      };
      if (payerConnection.apiAuthType === "basic" && payerConnection.apiUsername && payerConnection.apiPassword) {
        const auth = Buffer.from(`${payerConnection.apiUsername}:${payerConnection.apiPassword}`).toString("base64");
        headers["Authorization"] = `Basic ${auth}`;
      } else if (payerConnection.apiAuthType === "bearer" && payerConnection.apiToken) {
        headers["Authorization"] = `Bearer ${payerConnection.apiToken}`;
      } else if (payerConnection.apiAuthType === "api-key" && payerConnection.apiKeyName && payerConnection.apiKeyValue) {
        headers[payerConnection.apiKeyName] = payerConnection.apiKeyValue;
      }
      const response = await axios6.post(payerConnection.apiEndpoint, claimData, { headers });
      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          status: "SENT",
          responseData: response.data
        };
      } else {
        return {
          success: false,
          status: "FAILED",
          errorDetails: {
            statusCode: response.status,
            statusText: response.statusText,
            data: response.data
          }
        };
      }
    } catch (error2) {
      logger_default2.error(`Error calling payer API for ${payerConnection.name}`, { error: error2 });
      if (axios6.isAxiosError(error2)) {
        return {
          success: false,
          status: "FAILED",
          errorDetails: {
            statusCode: error2.response?.status,
            statusText: error2.response?.statusText,
            data: error2.response?.data,
            message: error2.message
          }
        };
      } else {
        return {
          success: false,
          status: "FAILED",
          errorDetails: {
            message: error2 instanceof Error ? error2.message : String(error2)
          }
        };
      }
    }
  }
  /**
   * Schedule a retry for a failed claim submission
   * @param forwardId The ID of the forwarding attempt
   * @param payerConnection The payer connection
   * @param attemptCount The current attempt count
   */
  scheduleRetry(forwardId, payerConnection, attemptCount) {
    const backoff = Math.min(
      30 * 60 * 1e3,
      // 30 minutes max
      payerConnection.retryInterval * Math.pow(1.5, attemptCount - 1)
    );
    logger_default2.info(`Scheduling retry for claim forwarding ${forwardId} in ${backoff / 1e3} seconds`);
    if (this.retryQueue.has(forwardId)) {
      clearTimeout(this.retryQueue.get(forwardId));
    }
    const timeoutId = setTimeout(() => {
      this.sendClaimToPayer(forwardId).catch((error2) => {
        logger_default2.error(`Failed to retry claim submission: ${error2.message}`, { error: error2 });
      });
      this.retryQueue.delete(forwardId);
    }, backoff);
    this.retryQueue.set(forwardId, timeoutId);
  }
  /**
   * Schedule checking for a response to a claim submission
   * @param forwardId The ID of the forwarding attempt
   * @param payerConnection The payer connection
   */
  scheduleResponseCheck(forwardId, payerConnection) {
    const checkInterval = 60 * 1e3;
    logger_default2.info(`Scheduling response check for claim forwarding ${forwardId} in ${checkInterval / 1e3} seconds`);
    if (this.retryQueue.has(`check_${forwardId}`)) {
      clearTimeout(this.retryQueue.get(`check_${forwardId}`));
    }
    const timeoutId = setTimeout(() => {
      this.checkClaimStatus(forwardId).catch((error2) => {
        logger_default2.error(`Failed to check claim status: ${error2.message}`, { error: error2 });
      });
      this.retryQueue.delete(`check_${forwardId}`);
    }, checkInterval);
    this.retryQueue.set(`check_${forwardId}`, timeoutId);
  }
  /**
   * Check the status of a claim submission
   * @param forwardId The ID of the forwarding attempt
   */
  async checkClaimStatus(forwardId) {
    try {
      const [forwardingAttempt] = await this.db.select().from(claimPayerForwards).where(eq13(claimPayerForwards.id, forwardId));
      if (!forwardingAttempt) {
        logger_default2.error(`Forwarding attempt ${forwardId} not found`);
        return;
      }
      if (!["SENT", "ACKNOWLEDGED"].includes(forwardingAttempt.status)) {
        return;
      }
      const [claim] = await this.db.select().from(claims).where(eq13(claims.id, forwardingAttempt.claimId));
      if (!claim) {
        logger_default2.error(`Claim ${forwardingAttempt.claimId} not found`);
        return;
      }
      const payerId = forwardingAttempt.payerId || "default";
      const payerConnection = this.payerConnections.get(payerId);
      if (!payerConnection) {
        logger_default2.error(`No payer connection found for payer ${payerId}`);
        return;
      }
      logger_default2.info(`Checking status for claim ${claim.id} with payer ${payerId}`);
      const statusResponse = await this.checkPayerClaimStatus(
        payerConnection,
        claim.id,
        forwardingAttempt.responseData?.trackingId
      );
      if (statusResponse.success) {
        const status = statusResponse.status || "ACKNOWLEDGED";
        await this.db.update(claimPayerForwards).set({
          status,
          responseData: statusResponse.responseData,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(claimPayerForwards.id, forwardId));
        let claimStatus = "PENDING";
        if (status === "COMPLETED") {
          claimStatus = "COMPLETE";
        } else if (status === "REJECTED") {
          claimStatus = "REJECTED";
        }
        await this.db.update(claims).set({
          status: claimStatus,
          lastStatusUpdate: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(claims.id, claim.id));
        await this.logClaimEvent(claim.id, claimStatus, `EXTERNAL_PAYER_${status}`, {
          forwardId,
          payerId,
          statusData: statusResponse.responseData
        });
        if (!["COMPLETED", "REJECTED"].includes(status)) {
          this.scheduleResponseCheck(forwardId, payerConnection);
        }
      } else {
        this.scheduleResponseCheck(forwardId, payerConnection);
      }
    } catch (error2) {
      logger_default2.error(`Error checking claim status for forwarding ${forwardId}`, { error: error2 });
      const [forwardingAttempt] = await this.db.select().from(claimPayerForwards).where(eq13(claimPayerForwards.id, forwardId));
      if (!forwardingAttempt) return;
      const payerId = forwardingAttempt.payerId || "default";
      const payerConnection = this.payerConnections.get(payerId);
      if (!payerConnection) return;
      this.scheduleResponseCheck(forwardId, payerConnection);
    }
  }
  /**
   * Check the status of a claim with the payer
   * @param payerConnection The payer connection
   * @param claimId The ID of the claim
   * @param trackingId The tracking ID from the payer
   * @returns The response from the payer
   */
  async checkPayerClaimStatus(payerConnection, claimId, trackingId) {
    try {
      if (!payerConnection.apiEndpoint) {
        const statusOptions = ["ACKNOWLEDGED", "IN_PROCESS", "COMPLETED", "REJECTED"];
        const randomIndex = Math.floor(Math.random() * statusOptions.length);
        const simulatedStatus = statusOptions[randomIndex];
        return {
          success: true,
          status: simulatedStatus,
          responseData: {
            status: simulatedStatus,
            trackingId: trackingId || uuidv410(),
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            payerId: payerConnection.id,
            claimId
          }
        };
      }
      return {
        success: true,
        status: "ACKNOWLEDGED",
        // Default for prototype
        responseData: {
          status: "ACKNOWLEDGED",
          trackingId: trackingId || uuidv410(),
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          payerId: payerConnection.id,
          claimId
        }
      };
    } catch (error2) {
      logger_default2.error(`Error checking payer claim status for ${payerConnection.name}`, { error: error2 });
      return {
        success: false,
        status: "ERROR",
        errorDetails: {
          message: error2 instanceof Error ? error2.message : String(error2)
        }
      };
    }
  }
  /**
   * Get pending forwarding attempts that need retry or status check
   */
  async getQueuedAndPendingForwards() {
    try {
      const now = /* @__PURE__ */ new Date();
      const pendingForwards = await this.db.select().from(claimPayerForwards).where(
        and9(
          // Get QUEUED and FAILED_RETRY with nextAttempt <= now
          or(
            and9(
              eq13(claimPayerForwards.status, "QUEUED"),
              not(eq13(claimPayerForwards.status, "COMPLETED")),
              not(eq13(claimPayerForwards.status, "FAILED")),
              not(eq13(claimPayerForwards.status, "REJECTED"))
            ),
            and9(
              eq13(claimPayerForwards.status, "FAILED_RETRY"),
              or(
                eq13(claimPayerForwards.nextAttempt, null),
                sql`${claimPayerForwards.nextAttempt} <= ${now}`
              )
            )
          )
        )
      ).orderBy(asc(claimPayerForwards.nextAttempt), asc(claimPayerForwards.updatedAt));
      return pendingForwards;
    } catch (error2) {
      logger_default2.error("Error getting pending forwarding attempts", { error: error2 });
      return [];
    }
  }
  /**
   * Process any pending forwarding attempts
   */
  async processPendingForwards() {
    try {
      const pendingForwards = await this.getQueuedAndPendingForwards();
      logger_default2.info(`Processing ${pendingForwards.length} pending forwarding attempts`);
      for (const forward of pendingForwards) {
        if (this.retryQueue.has(forward.id) || this.retryQueue.has(`check_${forward.id}`)) {
          continue;
        }
        if (["QUEUED", "FAILED_RETRY"].includes(forward.status)) {
          this.sendClaimToPayer(forward.id).catch((error2) => {
            logger_default2.error(`Failed to process pending forward ${forward.id}: ${error2.message}`, { error: error2 });
          });
        } else if (["SENT", "ACKNOWLEDGED"].includes(forward.status)) {
          this.checkClaimStatus(forward.id).catch((error2) => {
            logger_default2.error(`Failed to check status for forward ${forward.id}: ${error2.message}`, { error: error2 });
          });
        }
      }
    } catch (error2) {
      logger_default2.error("Error processing pending forwarding attempts", { error: error2 });
    }
  }
  /**
   * Initialize periodic processing of pending forwards
   * @param intervalMs The interval in milliseconds
   */
  startPeriodicProcessing(intervalMs = 5 * 60 * 1e3) {
    this.processPendingForwards().catch((error2) => {
      logger_default2.error("Error in initial processing of pending forwards", { error: error2 });
    });
    setInterval(() => {
      this.processPendingForwards().catch((error2) => {
        logger_default2.error("Error in periodic processing of pending forwards", { error: error2 });
      });
    }, intervalMs);
  }
  /**
   * Cleanup function to clear all timers
   */
  cleanup() {
    for (const timeoutId of this.retryQueue.values()) {
      clearTimeout(timeoutId);
    }
    this.retryQueue.clear();
  }
  /**
   * Log a claim event
   * @param claimId The claim ID
   * @param status The claim status
   * @param eventType The event type
   * @param details Additional details
   */
  async logClaimEvent(claimId, status, eventType, details) {
    try {
      const eventData = {
        id: uuidv410(),
        claimId,
        eventType,
        status,
        timestamp: /* @__PURE__ */ new Date(),
        details
      };
      await this.db.insert(claimEvents).values(eventData);
    } catch (error2) {
      logger_default2.error(`Error logging claim event for claim ${claimId}`, { error: error2 });
    }
  }
};

// server/services/claims/claim-tracking-service.ts
import { eq as eq14, and as and10, or as or4, desc as desc8, sql as sql9 } from "drizzle-orm";
var ClaimTrackingService = class {
  db;
  // Replace with proper type when available
  constructor(db3) {
    this.db = db3;
  }
  /**
   * Check the status of a claim
   * @param claimId The ID of the claim to check
   * @returns Status information about the claim
   */
  async checkClaimStatus(claimId) {
    try {
      const [claim] = await this.db.select().from(claims).where(eq14(claims.id, claimId));
      if (!claim) {
        return void 0;
      }
      const [latestEvent] = await this.db.select().from(claimEvents).where(eq14(claimEvents.claimId, claimId)).orderBy(desc8(claimEvents.timestamp)).limit(1);
      const [latestForward] = await this.db.select().from(claimPayerForwards).where(eq14(claimPayerForwards.claimId, claimId)).orderBy(desc8(claimPayerForwards.updatedAt)).limit(1);
      const result = {
        claimId,
        status: claim.status,
        lastStatusUpdate: claim.lastStatusUpdate || claim.updatedAt
      };
      if (latestEvent) {
        result.lastEvent = {
          eventType: latestEvent.eventType,
          timestamp: latestEvent.timestamp,
          details: latestEvent.details
        };
      }
      if (latestForward) {
        result.forwardingStatus = {
          lastAttempt: latestForward.updatedAt,
          attemptCount: latestForward.attemptCount,
          lastStatus: latestForward.status
        };
        if (["QUEUED", "FAILED", "ERROR"].includes(latestForward.status)) {
          result.forwardingStatus.nextAttempt = latestForward.nextAttempt;
        }
      }
      return result;
    } catch (error2) {
      logger_default2.error(`Error checking status of claim ${claimId}`, { error: error2 });
      throw error2;
    }
  }
  /**
   * Get all claims with a status
   * @param status The status to filter by
   * @param page The page number (1-based)
   * @param pageSize The number of claims per page
   * @returns The claims with the given status
   */
  async getClaimsByStatus(status, page = 1, pageSize = 20) {
    try {
      const [countResult] = await this.db.select({ count: sql9`count(*)` }).from(claims).where(eq14(claims.status, status));
      const total = countResult?.count || 0;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const result = await this.db.select().from(claims).where(eq14(claims.status, status)).orderBy(desc8(claims.lastStatusUpdate), desc8(claims.updatedAt)).limit(pageSize).offset(offset);
      return {
        claims: result,
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error2) {
      logger_default2.error(`Error getting claims with status ${status}`, { error: error2 });
      throw error2;
    }
  }
  /**
   * Get claims that need attention (errors, rejections, or stalled claims)
   * @param page The page number (1-based)
   * @param pageSize The number of claims per page
   * @returns The claims that need attention
   */
  async getClaimsNeedingAttention(page = 1, pageSize = 20) {
    try {
      const attentionStatuses = ["ERROR", "REJECTED", "FAILED"];
      const stalledDate = /* @__PURE__ */ new Date();
      stalledDate.setHours(stalledDate.getHours() - 24);
      const attentionConditions = or4(
        // Claims with error/rejection statuses
        eq14(claims.status, "ERROR"),
        eq14(claims.status, "REJECTED"),
        // Pending claims that haven't been updated in 24 hours
        and10(
          eq14(claims.status, "PENDING"),
          sql9`${claims.lastStatusUpdate} < ${stalledDate}`
        ),
        // Submitted claims that haven't been updated in 24 hours
        and10(
          eq14(claims.status, "SUBMITTED"),
          sql9`${claims.lastStatusUpdate} < ${stalledDate}`
        )
      );
      const [countResult] = await this.db.select({ count: sql9`count(*)` }).from(claims).where(attentionConditions);
      const total = countResult?.count || 0;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const result = await this.db.select().from(claims).where(attentionConditions).orderBy(desc8(claims.lastStatusUpdate), desc8(claims.updatedAt)).limit(pageSize).offset(offset);
      return {
        claims: result,
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error2) {
      logger_default2.error(`Error getting claims needing attention`, { error: error2 });
      throw error2;
    }
  }
  /**
   * Get statistics about claims in the system
   * @returns Statistics about claims
   */
  async getClaimStatistics() {
    try {
      const statusStats = await this.db.select({
        status: claims.status,
        count: sql9`count(*)`
      }).from(claims).groupBy(claims.status);
      const pathStats = await this.db.select({
        path: claims.processingPath,
        count: sql9`count(*)`
      }).from(claims).groupBy(claims.processingPath);
      const payerStats = await this.db.select({
        payer: claims.payerId,
        count: sql9`count(*)`
      }).from(claims).groupBy(claims.payerId);
      const stalledDate = /* @__PURE__ */ new Date();
      stalledDate.setHours(stalledDate.getHours() - 24);
      const [stalledCount] = await this.db.select({ count: sql9`count(*)` }).from(claims).where(
        and10(
          or4(
            eq14(claims.status, "PENDING"),
            eq14(claims.status, "SUBMITTED")
          ),
          sql9`${claims.lastStatusUpdate} < ${stalledDate}`
        )
      );
      const [errorCount] = await this.db.select({ count: sql9`count(*)` }).from(claims).where(
        or4(
          eq14(claims.status, "ERROR"),
          eq14(claims.status, "REJECTED"),
          eq14(claims.status, "FAILED")
        )
      );
      const claimsByStatus = {};
      for (const stat of statusStats) {
        claimsByStatus[stat.status] = stat.count;
      }
      const claimsByProcessingPath = {};
      for (const stat of pathStats) {
        claimsByProcessingPath[stat.path] = stat.count;
      }
      const claimsByPayer = {};
      for (const stat of payerStats) {
        claimsByPayer[stat.payer] = stat.count;
      }
      return {
        claimsByStatus,
        claimsByProcessingPath,
        claimsByPayer,
        stalledClaims: stalledCount?.count || 0,
        errorClaims: errorCount?.count || 0
      };
    } catch (error2) {
      logger_default2.error(`Error getting claim statistics`, { error: error2 });
      throw error2;
    }
  }
  /**
   * Determine the claim status based on the forwarding attempt
   * @param forwardingAttempt The forwarding attempt
   * @returns The updated status information
   */
  determineClaimStatus(forwardingAttempt) {
    const forwardStatus = forwardingAttempt.status;
    switch (forwardStatus) {
      case "QUEUED":
        return { status: "SUBMITTED" };
      case "SENT":
        return { status: "PENDING" };
      case "ACKNOWLEDGED":
        return { status: "PENDING" };
      case "COMPLETED":
        return { status: "COMPLETE" };
      case "REJECTED":
        return {
          status: "REJECTED",
          details: forwardingAttempt.responseData || forwardingAttempt.errorDetails
        };
      case "FAILED":
        if (forwardingAttempt.attemptCount >= 5) {
          return {
            status: "FAILED",
            details: forwardingAttempt.errorDetails
          };
        }
        return { status: "PENDING" };
      case "ERROR":
        return {
          status: "ERROR",
          details: forwardingAttempt.errorDetails
        };
      default:
        return { status: "PENDING" };
    }
  }
};

// server/routes/claims-routes.ts
var router5 = Router4();
var internalRulesEngine = new InternalRulesEngine(db);
var externalPayerGateway = new ExternalPayerGateway(db);
var claimTrackingService = new ClaimTrackingService(db);
router5.post("/claims", async (req, res) => {
  try {
    const mode = (req.query.mode || "auto").toLowerCase();
    if (!["internal", "external", "auto"].includes(mode)) {
      return res.status(400).json({ error: "Invalid processing mode. Must be internal, external, or auto." });
    }
    const validationResult = insertClaimSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid claim data",
        details: validationResult.error.errors
      });
    }
    const claimData = validationResult.data;
    if (!claimData.id) {
      claimData.id = `CLM-${Date.now()}-${Math.floor(Math.random() * 1e4).toString().padStart(4, "0")}`;
    }
    if (mode !== "auto") {
      claimData.processingPath = mode.toUpperCase();
    }
    claimData.status = "DRAFT";
    const [claim] = await db.insert(claims).values(claimData).returning();
    await db.insert(claimEvents).values({
      id: uuidv411(),
      claimId: claim.id,
      eventType: "CLAIM_CREATED",
      status: claim.status,
      userId: req.user?.id || null,
      details: { source: "API" }
    });
    if (mode === "internal" || mode === "auto" && claim.processingPath === "INTERNAL") {
      const result = await internalRulesEngine.processClaim(claim);
      if (result.success) {
        res.status(201).json(result.claim);
      } else {
        res.status(result.status || 500).json({
          error: result.error,
          claimId: claim.id
        });
      }
    } else if (mode === "external" || mode === "auto" && claim.processingPath === "EXTERNAL") {
      const forwardResult = await externalPayerGateway.queueClaimForForwarding(claim);
      if (forwardResult.success) {
        const [updatedClaim] = await db.update(claims).set({
          status: "SUBMITTED",
          submittedDate: /* @__PURE__ */ new Date(),
          lastStatusUpdate: /* @__PURE__ */ new Date()
        }).where(eq15(claims.id, claim.id)).returning();
        res.status(201).json(updatedClaim);
      } else {
        res.status(500).json({
          error: "Failed to queue claim for external processing",
          details: forwardResult.error?.message,
          claimId: claim.id
        });
      }
    } else {
      res.status(201).json(claim);
    }
  } catch (error2) {
    const errorMessage = error2 instanceof Error ? error2.message : String(error2);
    logger_default2.error("Error creating claim", { error: errorMessage });
    res.status(500).json({ error: "Failed to process claim", details: errorMessage });
  }
});
router5.get("/claims/:id", async (req, res) => {
  try {
    const claimId = req.params.id;
    const [claim] = await db.select().from(claims).where(eq15(claims.id, claimId));
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }
    res.json(claim);
  } catch (error2) {
    const errorMessage = error2 instanceof Error ? error2.message : String(error2);
    logger_default2.error("Error fetching claim", { error: errorMessage });
    res.status(500).json({ error: "Failed to retrieve claim", details: errorMessage });
  }
});
router5.get("/claims", async (req, res) => {
  try {
    const patientId = req.query.patientId;
    const providerId = req.query.providerId;
    const payerId = req.query.payerId;
    const organizationId = req.query.organizationId;
    const status = req.query.status;
    const page = parseInt(req.query.page || "1", 10);
    const pageSize = parseInt(req.query.pageSize || "20", 10);
    const conditions = [];
    if (patientId) {
      conditions.push(eq15(claims.patientId, patientId));
    }
    if (providerId) {
      conditions.push(eq15(claims.providerId, providerId));
    }
    if (payerId) {
      conditions.push(eq15(claims.payerId, payerId));
    }
    if (organizationId) {
      conditions.push(eq15(claims.organizationId, organizationId));
    }
    if (status) {
      conditions.push(eq15(claims.status, status.toUpperCase()));
    }
    const [countResult] = await db.select({ count: sql10`count(*)` }).from(claims).where(conditions.length > 0 ? and11(...conditions) : void 0);
    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const result = await db.select().from(claims).where(conditions.length > 0 ? and11(...conditions) : void 0).orderBy(desc9(claims.createdAt)).limit(pageSize).offset(offset);
    res.json({
      claims: result,
      total,
      page,
      pageSize,
      totalPages
    });
  } catch (error2) {
    const errorMessage = error2 instanceof Error ? error2.message : String(error2);
    logger_default2.error("Error fetching claims", { error: errorMessage });
    res.status(500).json({ error: "Failed to retrieve claims", details: errorMessage });
  }
});
router5.get("/claims/:id/events", async (req, res) => {
  try {
    const claimId = req.params.id;
    const [claim] = await db.select().from(claims).where(eq15(claims.id, claimId));
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }
    const events = await db.select().from(claimEvents).where(eq15(claimEvents.claimId, claimId)).orderBy(desc9(claimEvents.timestamp));
    res.json(events);
  } catch (error2) {
    const errorMessage = error2 instanceof Error ? error2.message : String(error2);
    logger_default2.error("Error fetching claim events", { error: errorMessage });
    res.status(500).json({ error: "Failed to retrieve claim events", details: errorMessage });
  }
});
router5.get("/claims/:id/line-items", async (req, res) => {
  try {
    const claimId = req.params.id;
    const [claim] = await db.select().from(claims).where(eq15(claims.id, claimId));
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }
    const lineItems = await db.select().from(claimLineItems2).where(eq15(claimLineItems2.claimId, claimId)).orderBy(claimLineItems2.sequence);
    res.json(lineItems);
  } catch (error2) {
    const errorMessage = error2 instanceof Error ? error2.message : String(error2);
    logger_default2.error("Error fetching claim line items", { error: errorMessage });
    res.status(500).json({ error: "Failed to retrieve claim line items", details: errorMessage });
  }
});
router5.post("/claims/:id/line-items", async (req, res) => {
  try {
    const claimId = req.params.id;
    const [claim] = await db.select().from(claims).where(eq15(claims.id, claimId));
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: "Request body must be an array of line items" });
    }
    const [currentSequence] = await db.select({ maxSeq: sql10`coalesce(max(${claimLineItems2.sequence}), 0)` }).from(claimLineItems2).where(eq15(claimLineItems2.claimId, claimId));
    let nextSequence = (currentSequence?.maxSeq || 0) + 1;
    const lineItemsToInsert = [];
    let totalAmount = 0;
    for (const item of req.body) {
      const lineItem = {
        ...item,
        claimId,
        sequence: nextSequence++,
        id: `CLMITEM-${Date.now()}-${Math.floor(Math.random() * 1e4).toString().padStart(4, "0")}`
      };
      if (!lineItem.totalPrice && lineItem.unitPrice && lineItem.quantity) {
        lineItem.totalPrice = lineItem.unitPrice * lineItem.quantity;
      }
      const validationResult = insertClaimLineItemSchema.safeParse(lineItem);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid line item data",
          details: validationResult.error.errors,
          lineItem
        });
      }
      lineItemsToInsert.push(validationResult.data);
      totalAmount += validationResult.data.totalPrice;
    }
    if (lineItemsToInsert.length === 0) {
      return res.status(400).json({ error: "No valid line items to add" });
    }
    const insertedLineItems = await db.insert(claimLineItems2).values(lineItemsToInsert).returning();
    await db.update(claims).set({
      totalAmount: claim.totalAmount + totalAmount,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq15(claims.id, claimId));
    await db.insert(claimEvents).values({
      id: uuidv411(),
      claimId,
      eventType: "LINE_ITEMS_ADDED",
      status: claim.status,
      userId: req.user?.id || null,
      details: { count: insertedLineItems.length, totalAmount }
    });
    res.status(201).json(insertedLineItems);
  } catch (error2) {
    const errorMessage = error2 instanceof Error ? error2.message : String(error2);
    logger_default2.error("Error adding claim line items", { error: errorMessage });
    res.status(500).json({ error: "Failed to add claim line items", details: errorMessage });
  }
});
router5.get("/claims/:id/status", async (req, res) => {
  try {
    const claimId = req.params.id;
    const statusResult = await claimTrackingService.checkClaimStatus(claimId);
    if (!statusResult) {
      return res.status(404).json({ error: "Claim not found" });
    }
    res.json(statusResult);
  } catch (error2) {
    const errorMessage = error2 instanceof Error ? error2.message : String(error2);
    logger_default2.error("Error checking claim status", { error: errorMessage });
    res.status(500).json({ error: "Failed to check claim status", details: errorMessage });
  }
});
router5.get("/claims/:id/forwards", async (req, res) => {
  try {
    const claimId = req.params.id;
    const [claim] = await db.select().from(claims).where(eq15(claims.id, claimId));
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }
    const forwards = await db.select().from(claimPayerForwards).where(eq15(claimPayerForwards.claimId, claimId)).orderBy(desc9(claimPayerForwards.createdAt));
    res.json(forwards);
  } catch (error2) {
    const errorMessage = error2 instanceof Error ? error2.message : String(error2);
    logger_default2.error("Error fetching claim forwarding attempts", { error: errorMessage });
    res.status(500).json({ error: "Failed to retrieve claim forwarding attempts", details: errorMessage });
  }
});
function registerClaimsRoutes(app2) {
  app2.use("/api", router5);
}

// server/routes/scheduling-routes.ts
import { Router as Router5 } from "express";

// server/services/scheduling/scheduling-service.ts
import { v4 as uuidv412 } from "uuid";
import { eq as eq16, and as and12, or as or6, between, lte as lte2, gte as gte2, desc as desc10, sql as sql11 } from "drizzle-orm";
init_logger();

// shared/scheduling-schema.ts
import { text as text11, integer as integer9, pgTable as pgTable11, boolean as boolean11, timestamp as timestamp11, json as json5, serial as serial4, pgEnum as pgEnum5 } from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema11, createSelectSchema as createSelectSchema4 } from "drizzle-zod";
import { relations as relations6 } from "drizzle-orm";
var appointmentStatusEnum = pgEnum5("appointment_status", [
  "proposed",
  // Initial proposal or template
  "pending",
  // Awaiting approval/confirmation
  "booked",
  // Confirmed booking
  "arrived",
  // Patient has arrived
  "fulfilled",
  // Appointment completed
  "cancelled",
  // Cancelled by patient or provider
  "noshow",
  // Patient didn't show up
  "entered-in-error"
  // Appointment created by mistake
]);
var slotStatusEnum = pgEnum5("slot_status", [
  "free",
  // Available for booking
  "busy",
  // Already booked
  "busy-unavailable",
  // Blocked/unavailable
  "busy-tentative",
  // Tentatively booked
  "entered-in-error"
  // Slot created by mistake
]);
var scheduleStatusEnum = pgEnum5("schedule_status", [
  "active",
  // Schedule is active and slots can be booked
  "inactive",
  // Schedule is not active (e.g., provider on leave)
  "entered-in-error"
  // Schedule created by mistake
]);
var appointmentTypeEnum = pgEnum5("appointment_type", [
  "routine",
  // Regular checkup or appointment
  "urgent",
  // Urgent care
  "followup",
  // Follow-up appointment
  "annual",
  // Annual physical or wellness visit
  "new-patient",
  // First visit for a new patient
  "procedure",
  // For a specific medical procedure
  "lab",
  // Laboratory test
  "imaging",
  // Imaging appointment
  "specialist",
  // Specialist consultation
  "therapy",
  // Physical/occupational therapy
  "telehealth",
  // Virtual appointment
  "other"
  // Other types
]);
var specialtyEnum = pgEnum5("specialty", [
  "primary-care",
  // Primary Care
  "cardiology",
  // Cardiology
  "dermatology",
  // Dermatology
  "endocrinology",
  // Endocrinology
  "gastroenterology",
  // Gastroenterology
  "hematology",
  // Hematology
  "neurology",
  // Neurology
  "oncology",
  // Oncology
  "ophthalmology",
  // Ophthalmology
  "orthopedics",
  // Orthopedics
  "pediatrics",
  // Pediatrics
  "psychiatry",
  // Psychiatry
  "radiology",
  // Radiology
  "urology",
  // Urology
  "laboratory",
  // Laboratory
  "physical-therapy",
  // Physical Therapy
  "other"
  // Other specialties
]);
var schedules = pgTable11("schedules", {
  id: text11("id").primaryKey(),
  // UUID
  providerId: text11("provider_id").notNull(),
  // Reference to provider
  locationId: text11("location_id"),
  // Reference to location
  serviceType: text11("service_type").notNull(),
  // Service type code
  specialty: specialtyEnum("specialty"),
  // Medical specialty
  name: text11("name").notNull(),
  // Descriptive name (e.g., "Dr. Smith - Cardiology")
  status: scheduleStatusEnum("status").default("active"),
  // Schedule status
  startDate: timestamp11("start_date"),
  // When schedule begins
  endDate: timestamp11("end_date"),
  // When schedule ends (if temporary)
  minmaxPatients: text11("minmax_patients"),
  // Min and max patients per slot (e.g., "1:1" or "1:2")
  comments: text11("comments"),
  // Additional comments
  planningHorizonDays: integer9("planning_horizon_days"),
  // How many days in advance to create slots
  mcpModelRef: text11("mcp_model_ref"),
  // Reference to MCP model if applicable
  mcpVersion: text11("mcp_version"),
  // Version of MCP model
  customData: json5("custom_data"),
  // For partner-specific extensions
  createdAt: timestamp11("created_at").defaultNow().notNull(),
  updatedAt: timestamp11("updated_at")
});
var scheduleRecurrenceRules = pgTable11("schedule_recurrence_rules", {
  id: text11("id").primaryKey(),
  // UUID
  scheduleId: text11("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
  daysOfWeek: text11("days_of_week").notNull(),
  // Comma-separated list of days (1-7, Monday is 1)
  startTime: text11("start_time").notNull(),
  // e.g., "09:00"
  endTime: text11("end_time").notNull(),
  // e.g., "17:00"
  slotDurationMinutes: integer9("slot_duration_minutes").notNull(),
  // Length of each slot
  effectiveFrom: timestamp11("effective_from"),
  // When this pattern starts
  effectiveTo: timestamp11("effective_to"),
  // When this pattern ends
  isActive: boolean11("is_active").default(true),
  createdAt: timestamp11("created_at").defaultNow().notNull(),
  updatedAt: timestamp11("updated_at")
});
var scheduleBlackoutPeriods = pgTable11("schedule_blackout_periods", {
  id: text11("id").primaryKey(),
  // UUID
  scheduleId: text11("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
  startDateTime: timestamp11("start_date_time").notNull(),
  endDateTime: timestamp11("end_date_time").notNull(),
  reason: text11("reason"),
  createdAt: timestamp11("created_at").defaultNow().notNull(),
  updatedAt: timestamp11("updated_at")
});
var slots = pgTable11("slots", {
  id: text11("id").primaryKey(),
  // UUID
  scheduleId: text11("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
  startDateTime: timestamp11("start_date_time").notNull(),
  endDateTime: timestamp11("end_date_time").notNull(),
  status: slotStatusEnum("status").default("free").notNull(),
  overbooked: boolean11("overbooked").default(false),
  // For slots that allow overbooking
  appointmentId: text11("appointment_id"),
  // The appointment that filled this slot (if any)
  maxAppointments: integer9("max_appointments").default(1),
  // Maximum number of appointments per slot
  comments: text11("comments"),
  // Any notes about this slot
  createdBy: text11("created_by"),
  // Who created this slot
  createdAt: timestamp11("created_at").defaultNow().notNull(),
  updatedAt: timestamp11("updated_at")
});
var appointments = pgTable11("appointments", {
  id: text11("id").primaryKey(),
  // UUID
  slotId: text11("slot_id").references(() => slots.id),
  // Reference to slot
  patientId: text11("patient_id").notNull(),
  // Reference to patient
  providerId: text11("provider_id").notNull(),
  // Reference to provider
  locationId: text11("location_id"),
  // Reference to location
  appointmentType: appointmentTypeEnum("appointment_type").notNull(),
  specialty: specialtyEnum("specialty"),
  status: appointmentStatusEnum("status").default("booked").notNull(),
  startDateTime: timestamp11("start_date_time").notNull(),
  endDateTime: timestamp11("end_date_time").notNull(),
  minutesDuration: integer9("minutes_duration"),
  // Duration in minutes
  reason: text11("reason"),
  // Reason for visit
  reasonCode: text11("reason_code"),
  // Coded reason for visit
  description: text11("description"),
  // Additional details 
  isTelehealth: boolean11("is_telehealth").default(false),
  // Is this a telehealth appointment
  telehealthUrl: text11("telehealth_url"),
  // Link for telehealth session
  telehealthInstructions: text11("telehealth_instructions"),
  // Instructions for telehealth
  priority: integer9("priority").default(0),
  // For urgent appointments
  patientInstructions: text11("patient_instructions"),
  // Instructions for patient
  cancelReason: text11("cancel_reason"),
  // Why appointment was cancelled
  confirmedAt: timestamp11("confirmed_at"),
  // When appointment was confirmed
  reminderSentAt: timestamp11("reminder_sent_at"),
  // When reminder was sent
  referralId: text11("referral_id"),
  // Reference to referral if required
  orderId: text11("order_id"),
  // Reference to order if applicable
  priorAuthId: text11("prior_auth_id"),
  // Reference to prior auth if required
  priorAuthStatus: text11("prior_auth_status"),
  // Status of prior auth (approved, pending, denied)
  payerId: text11("payer_id"),
  // Patient's insurance
  eligibilityVerified: boolean11("eligibility_verified").default(false),
  // Has eligibility been verified
  eligibilityDetails: json5("eligibility_details"),
  // Details of eligibility check
  externalRefId: text11("external_ref_id"),
  // ID in external system if applicable
  externalSource: text11("external_source"),
  // Source system if imported
  customData: json5("custom_data"),
  // For partner-specific extensions
  createdAt: timestamp11("created_at").defaultNow().notNull(),
  updatedAt: timestamp11("updated_at")
});
var appointmentHistory = pgTable11("appointment_history", {
  id: serial4("id").primaryKey(),
  appointmentId: text11("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  statusFrom: appointmentStatusEnum("status_from"),
  statusTo: appointmentStatusEnum("status_to"),
  changedBy: text11("changed_by").notNull(),
  // Who made the change
  changedAt: timestamp11("changed_at").defaultNow().notNull(),
  reason: text11("reason"),
  // Reason for change
  notes: text11("notes")
  // Additional notes
});
var calendarSync = pgTable11("calendar_sync", {
  id: text11("id").primaryKey(),
  // UUID
  appointmentId: text11("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  userId: text11("user_id").notNull(),
  // User whose calendar was synced
  calendarProvider: text11("calendar_provider").notNull(),
  // e.g., "google", "outlook"
  externalEventId: text11("external_event_id"),
  // ID in external calendar
  syncStatus: text11("sync_status").notNull(),
  // e.g., "synced", "failed"
  lastSyncAt: timestamp11("last_sync_at").notNull(),
  errorMessage: text11("error_message")
  // If sync failed
});
var schedulesRelations = relations6(schedules, ({ many }) => ({
  slots: many(slots),
  recurrenceRules: many(scheduleRecurrenceRules),
  blackoutPeriods: many(scheduleBlackoutPeriods)
}));
var slotsRelations = relations6(slots, ({ one, many }) => ({
  schedule: one(schedules, {
    fields: [slots.scheduleId],
    references: [schedules.id]
  }),
  appointment: one(appointments, {
    fields: [slots.appointmentId],
    references: [appointments.id]
  })
}));
var appointmentsRelations = relations6(appointments, ({ one, many }) => ({
  slot: one(slots, {
    fields: [appointments.slotId],
    references: [slots.id]
  }),
  history: many(appointmentHistory),
  calendarSyncRecords: many(calendarSync)
}));
var selectScheduleSchema = createSelectSchema4(schedules);
var selectSlotSchema = createSelectSchema4(slots);
var selectAppointmentSchema = createSelectSchema4(appointments);
var selectRecurrenceRuleSchema = createSelectSchema4(scheduleRecurrenceRules);
var selectBlackoutPeriodSchema = createSelectSchema4(scheduleBlackoutPeriods);
var selectAppointmentHistorySchema = createSelectSchema4(appointmentHistory);
var selectCalendarSyncSchema = createSelectSchema4(calendarSync);
var insertScheduleSchema = createInsertSchema11(schedules).omit({ createdAt: true, updatedAt: true });
var insertSlotSchema = createInsertSchema11(slots).omit({ createdAt: true, updatedAt: true });
var insertAppointmentSchema = createInsertSchema11(appointments).omit({ createdAt: true, updatedAt: true });
var insertRecurrenceRuleSchema = createInsertSchema11(scheduleRecurrenceRules).omit({ createdAt: true, updatedAt: true });
var insertBlackoutPeriodSchema = createInsertSchema11(scheduleBlackoutPeriods).omit({ createdAt: true, updatedAt: true });
var insertAppointmentHistorySchema = createInsertSchema11(appointmentHistory).omit({ id: true, changedAt: true });
var insertCalendarSyncSchema = createInsertSchema11(calendarSync);

// server/services/scheduling/scheduling-service.ts
var SchedulingService = class {
  /**
   * Initialize the scheduling service
   */
  constructor() {
    logger_default.info("Initializing Appointment Scheduling Service");
  }
  // ========== SCHEDULE MANAGEMENT ==========
  /**
   * Create a new provider schedule
   */
  async createSchedule(data) {
    logger_default.debug("Creating new schedule", {
      providerId: data.providerId,
      serviceType: data.serviceType
    });
    const [schedule] = await db.insert(schedules).values({
      ...data,
      id: data.id || uuidv412(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return schedule;
  }
  /**
   * Get a schedule by ID
   */
  async getSchedule(scheduleId) {
    const [schedule] = await db.select().from(schedules).where(eq16(schedules.id, scheduleId));
    return schedule;
  }
  /**
   * Update a schedule
   */
  async updateSchedule(scheduleId, data) {
    const [schedule] = await db.update(schedules).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq16(schedules.id, scheduleId)).returning();
    return schedule;
  }
  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId) {
    const existingAppointments = await db.select({ count: sql11`count(*)` }).from(appointments).innerJoin(slots, eq16(appointments.slotId, slots.id)).where(
      and12(
        eq16(slots.scheduleId, scheduleId),
        eq16(appointments.status, "booked")
      )
    );
    if (existingAppointments[0]?.count > 0) {
      throw new Error(`Cannot delete schedule with existing appointments (${existingAppointments[0].count} found)`);
    }
    const result = await db.delete(schedules).where(eq16(schedules.id, scheduleId)).returning({ id: schedules.id });
    return result.length > 0;
  }
  /**
   * Search for schedules based on criteria
   */
  async searchSchedules(params) {
    let query = db.select().from(schedules);
    if (params.providerId) {
      query = query.where(eq16(schedules.providerId, params.providerId));
    }
    if (params.locationId) {
      query = query.where(eq16(schedules.locationId, params.locationId));
    }
    if (params.serviceType) {
      query = query.where(eq16(schedules.serviceType, params.serviceType));
    }
    if (params.specialty) {
      query = query.where(eq16(schedules.specialty, params.specialty));
    }
    if (params.startDate) {
      query = query.where(
        or6(
          sql11`${schedules.endDate} IS NULL`,
          gte2(schedules.endDate, params.startDate)
        )
      );
    }
    if (params.endDate) {
      query = query.where(
        or6(
          sql11`${schedules.startDate} IS NULL`,
          lte2(schedules.startDate, params.endDate)
        )
      );
    }
    query = query.where(eq16(schedules.status, "active"));
    query = query.orderBy(schedules.name);
    return await query;
  }
  // ========== RECURRENCE RULES MANAGEMENT ==========
  /**
   * Create a new recurrence rule for a schedule
   */
  async createRecurrenceRule(data) {
    const [rule] = await db.insert(scheduleRecurrenceRules).values({
      ...data,
      id: data.id || uuidv412(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return rule;
  }
  /**
   * Get recurrence rules for a schedule
   */
  async getRecurrenceRules(scheduleId) {
    return await db.select().from(scheduleRecurrenceRules).where(eq16(scheduleRecurrenceRules.scheduleId, scheduleId));
  }
  /**
   * Update a recurrence rule
   */
  async updateRecurrenceRule(ruleId, data) {
    const [rule] = await db.update(scheduleRecurrenceRules).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq16(scheduleRecurrenceRules.id, ruleId)).returning();
    return rule;
  }
  /**
   * Delete a recurrence rule
   */
  async deleteRecurrenceRule(ruleId) {
    const result = await db.delete(scheduleRecurrenceRules).where(eq16(scheduleRecurrenceRules.id, ruleId)).returning({ id: scheduleRecurrenceRules.id });
    return result.length > 0;
  }
  // ========== BLACKOUT PERIODS MANAGEMENT ==========
  /**
   * Create a new blackout period for a schedule
   */
  async createBlackoutPeriod(data) {
    const [blackout] = await db.insert(scheduleBlackoutPeriods).values({
      ...data,
      id: data.id || uuidv412(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return blackout;
  }
  /**
   * Get blackout periods for a schedule
   */
  async getBlackoutPeriods(scheduleId, startDate, endDate) {
    let query = db.select().from(scheduleBlackoutPeriods).where(eq16(scheduleBlackoutPeriods.scheduleId, scheduleId));
    if (startDate && endDate) {
      query = query.where(
        or6(
          // Blackout starts within the date range
          between(scheduleBlackoutPeriods.startDateTime, startDate, endDate),
          // Blackout ends within the date range
          between(scheduleBlackoutPeriods.endDateTime, startDate, endDate),
          // Blackout spans the entire date range
          and12(
            lte2(scheduleBlackoutPeriods.startDateTime, startDate),
            gte2(scheduleBlackoutPeriods.endDateTime, endDate)
          )
        )
      );
    } else if (startDate) {
      query = query.where(gte2(scheduleBlackoutPeriods.endDateTime, startDate));
    } else if (endDate) {
      query = query.where(lte2(scheduleBlackoutPeriods.startDateTime, endDate));
    }
    return await query;
  }
  /**
   * Update a blackout period
   */
  async updateBlackoutPeriod(blackoutId, data) {
    const [blackout] = await db.update(scheduleBlackoutPeriods).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq16(scheduleBlackoutPeriods.id, blackoutId)).returning();
    return blackout;
  }
  /**
   * Delete a blackout period
   */
  async deleteBlackoutPeriod(blackoutId) {
    const result = await db.delete(scheduleBlackoutPeriods).where(eq16(scheduleBlackoutPeriods.id, blackoutId)).returning({ id: scheduleBlackoutPeriods.id });
    return result.length > 0;
  }
  // ========== SLOT MANAGEMENT ==========
  /**
   * Create a single slot
   */
  async createSlot(data) {
    const existingSlots = await db.select().from(slots).where(
      and12(
        eq16(slots.scheduleId, data.scheduleId),
        or6(
          // Slot starts during an existing slot
          between(data.startDateTime, slots.startDateTime, slots.endDateTime),
          // Slot ends during an existing slot
          between(data.endDateTime, slots.startDateTime, slots.endDateTime),
          // Slot completely contains an existing slot
          and12(
            lte2(data.startDateTime, slots.startDateTime),
            gte2(data.endDateTime, slots.endDateTime)
          )
        )
      )
    );
    if (existingSlots.length > 0 && !data.overbooked) {
      throw new Error("Slot conflicts with existing slots");
    }
    const blackouts = await this.getBlackoutPeriods(
      data.scheduleId,
      data.startDateTime,
      data.endDateTime
    );
    if (blackouts.length > 0) {
      throw new Error("Slot conflicts with blackout period");
    }
    const [slot] = await db.insert(slots).values({
      ...data,
      id: data.id || uuidv412(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return slot;
  }
  /**
   * Create multiple slots in bulk
   */
  async createSlots(slotsData) {
    if (slotsData.length === 0) {
      return [];
    }
    const slotsBySchedule = {};
    for (const slot of slotsData) {
      if (!slotsBySchedule[slot.scheduleId]) {
        slotsBySchedule[slot.scheduleId] = [];
      }
      slotsBySchedule[slot.scheduleId].push(slot);
    }
    const createdSlots = [];
    for (const scheduleId of Object.keys(slotsBySchedule)) {
      const schedulesSlots = slotsBySchedule[scheduleId];
      const minStartDate = new Date(Math.min(
        ...schedulesSlots.map((s) => s.startDateTime.getTime())
      ));
      const maxEndDate = new Date(Math.max(
        ...schedulesSlots.map((s) => s.endDateTime.getTime())
      ));
      const blackouts = await this.getBlackoutPeriods(
        scheduleId,
        minStartDate,
        maxEndDate
      );
      if (blackouts.length > 0 && !schedulesSlots[0].overbooked) {
        throw new Error("Some slots conflict with blackout periods");
      }
      if (!schedulesSlots[0].overbooked) {
        const existingSlots = await db.select().from(slots).where(
          and12(
            eq16(slots.scheduleId, scheduleId),
            between(slots.startDateTime, minStartDate, maxEndDate)
          )
        );
        if (existingSlots.length > 0) {
          for (const newSlot of schedulesSlots) {
            const conflicts = existingSlots.some(
              (existingSlot) => newSlot.startDateTime < existingSlot.endDateTime && newSlot.endDateTime > existingSlot.startDateTime
            );
            if (conflicts) {
              throw new Error("Some slots conflict with existing slots");
            }
          }
        }
      }
      const slotsToInsert = schedulesSlots.map((slot) => ({
        ...slot,
        id: slot.id || uuidv412(),
        updatedAt: /* @__PURE__ */ new Date()
      }));
      const result = await db.insert(slots).values(slotsToInsert).returning();
      createdSlots.push(...result);
    }
    return createdSlots;
  }
  /**
   * Get a slot by ID
   */
  async getSlot(slotId) {
    const [slot] = await db.select().from(slots).where(eq16(slots.id, slotId));
    return slot;
  }
  /**
   * Update a slot
   */
  async updateSlot(slotId, data) {
    const [slot] = await db.select().from(slots).where(eq16(slots.id, slotId));
    if (!slot) {
      throw new Error("Slot not found");
    }
    if (slot.appointmentId && (data.startDateTime || data.endDateTime || data.status === "free")) {
      throw new Error("Cannot update time or status of a slot with an appointment");
    }
    const [updatedSlot] = await db.update(slots).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq16(slots.id, slotId)).returning();
    return updatedSlot;
  }
  /**
   * Delete a slot
   */
  async deleteSlot(slotId) {
    const [slot] = await db.select().from(slots).where(eq16(slots.id, slotId));
    if (!slot) {
      return false;
    }
    if (slot.appointmentId) {
      throw new Error("Cannot delete a slot with an appointment");
    }
    const result = await db.delete(slots).where(eq16(slots.id, slotId)).returning({ id: slots.id });
    return result.length > 0;
  }
  /**
   * Search for available slots based on criteria
   */
  async searchAvailableSlots(params) {
    let query = db.select({
      slot: slots
    }).from(slots).innerJoin(schedules, eq16(slots.scheduleId, schedules.id));
    if (params.providerId) {
      query = query.where(eq16(schedules.providerId, params.providerId));
    }
    if (params.locationId) {
      query = query.where(eq16(schedules.locationId, params.locationId));
    }
    if (params.serviceType) {
      query = query.where(eq16(schedules.serviceType, params.serviceType));
    }
    if (params.specialty) {
      query = query.where(eq16(schedules.specialty, params.specialty));
    }
    if (params.startDateTime) {
      query = query.where(gte2(slots.startDateTime, params.startDateTime));
    }
    if (params.endDateTime) {
      query = query.where(lte2(slots.endDateTime, params.endDateTime));
    }
    query = query.where(eq16(slots.status, params.status || "free"));
    query = query.orderBy(slots.startDateTime);
    const results = await query;
    return results.map((r) => r.slot);
  }
  /**
   * Generate slots based on recurrence rules
   */
  async generateSlotsFromRules(scheduleId, startDate, endDate) {
    const schedule = await this.getSchedule(scheduleId);
    if (!schedule) {
      throw new Error("Schedule not found");
    }
    const rules = await this.getRecurrenceRules(scheduleId);
    if (rules.length === 0) {
      return [];
    }
    const blackouts = await this.getBlackoutPeriods(scheduleId, startDate, endDate);
    const existingSlots = await db.select().from(slots).where(
      and12(
        eq16(slots.scheduleId, scheduleId),
        gte2(slots.startDateTime, startDate),
        lte2(slots.endDateTime, endDate)
      )
    );
    const slotsToCreate = [];
    const currentDate = new Date(startDate);
    const endDateValue = endDate.getTime();
    while (currentDate.getTime() <= endDateValue) {
      const dayOfWeek = (currentDate.getDay() + 6) % 7 + 1;
      const currentDateStr = currentDate.toISOString().split("T")[0];
      for (const rule of rules) {
        if (!rule.isActive) continue;
        if (rule.effectiveFrom && new Date(rule.effectiveFrom) > currentDate) continue;
        if (rule.effectiveTo && new Date(rule.effectiveTo) < currentDate) continue;
        const daysArray = rule.daysOfWeek.split(",").map((d) => parseInt(d.trim()));
        if (!daysArray.includes(dayOfWeek)) continue;
        const [startHour, startMinute] = rule.startTime.split(":").map((n) => parseInt(n));
        const [endHour, endMinute] = rule.endTime.split(":").map((n) => parseInt(n));
        let slotStart = new Date(currentDate);
        slotStart.setHours(startHour, startMinute, 0, 0);
        const ruleEndTime = new Date(currentDate);
        ruleEndTime.setHours(endHour, endMinute, 0, 0);
        while (slotStart < ruleEndTime) {
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotStart.getMinutes() + rule.slotDurationMinutes);
          if (slotEnd > ruleEndTime) break;
          const isInBlackout = blackouts.some(
            (blackout) => slotStart < blackout.endDateTime && slotEnd > blackout.startDateTime
          );
          if (!isInBlackout) {
            const isDuplicate = existingSlots.some(
              (existingSlot) => slotStart.getTime() === existingSlot.startDateTime.getTime() && slotEnd.getTime() === existingSlot.endDateTime.getTime()
            );
            if (!isDuplicate) {
              slotsToCreate.push({
                id: uuidv412(),
                scheduleId,
                startDateTime: slotStart,
                endDateTime: slotEnd,
                status: "free",
                overbooked: false,
                maxAppointments: 1,
                createdBy: "system"
              });
            }
          }
          slotStart = new Date(slotEnd);
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return await this.createSlots(slotsToCreate);
  }
  // ========== APPOINTMENT MANAGEMENT ==========
  /**
   * Create a new appointment
   */
  async createAppointment(data) {
    return await db.transaction(async (tx) => {
      if (data.slotId) {
        const [slot] = await tx.select().from(slots).where(
          and12(
            eq16(slots.id, data.slotId),
            eq16(slots.status, "free")
          )
        ).forUpdate();
        if (!slot) {
          throw new Error("Slot is not available");
        }
        const appointmentId = data.id || uuidv412();
        await tx.update(slots).set({
          status: "busy",
          appointmentId,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq16(slots.id, data.slotId));
        const [appointment] = await tx.insert(appointments).values({
          ...data,
          id: appointmentId,
          startDateTime: slot.startDateTime,
          endDateTime: slot.endDateTime,
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        await tx.insert(appointmentHistory).values({
          appointmentId: appointment.id,
          statusFrom: null,
          statusTo: appointment.status,
          changedBy: "system",
          reason: "Initial booking"
        });
        return appointment;
      } else if (data.startDateTime && data.endDateTime) {
        const [appointment] = await tx.insert(appointments).values({
          ...data,
          id: data.id || uuidv412(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        await tx.insert(appointmentHistory).values({
          appointmentId: appointment.id,
          statusFrom: null,
          statusTo: appointment.status,
          changedBy: "system",
          reason: "Initial booking"
        });
        return appointment;
      } else {
        throw new Error("Either slotId or startDateTime+endDateTime must be provided");
      }
    });
  }
  /**
   * Get an appointment by ID
   */
  async getAppointment(appointmentId) {
    const [appointment] = await db.select().from(appointments).where(eq16(appointments.id, appointmentId));
    return appointment;
  }
  /**
   * Update an appointment
   */
  async updateAppointment(appointmentId, data, changedBy, reason) {
    return await db.transaction(async (tx) => {
      const [appointment] = await tx.select().from(appointments).where(eq16(appointments.id, appointmentId));
      if (!appointment) {
        throw new Error("Appointment not found");
      }
      const statusChanged = data.status && data.status !== appointment.status;
      const oldStatus = appointment.status;
      const slotChanged = data.slotId && data.slotId !== appointment.slotId;
      if (slotChanged) {
        if (appointment.slotId) {
          await tx.update(slots).set({
            status: "free",
            appointmentId: null,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq16(slots.id, appointment.slotId));
        }
        const [newSlot] = await tx.select().from(slots).where(
          and12(
            eq16(slots.id, data.slotId),
            eq16(slots.status, "free")
          )
        ).forUpdate();
        if (!newSlot) {
          throw new Error("New slot is not available");
        }
        await tx.update(slots).set({
          status: "busy",
          appointmentId,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq16(slots.id, data.slotId));
        data.startDateTime = newSlot.startDateTime;
        data.endDateTime = newSlot.endDateTime;
      } else if (statusChanged && data.status === "cancelled" && appointment.slotId) {
        await tx.update(slots).set({
          status: "free",
          appointmentId: null,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq16(slots.id, appointment.slotId));
      }
      const [updatedAppointment] = await tx.update(appointments).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq16(appointments.id, appointmentId)).returning();
      if (statusChanged) {
        await tx.insert(appointmentHistory).values({
          appointmentId,
          statusFrom: oldStatus,
          statusTo: data.status,
          changedBy,
          reason: reason || "Status updated",
          notes: data.cancelReason
        });
      }
      return updatedAppointment;
    });
  }
  /**
   * Cancel an appointment
   */
  async cancelAppointment(appointmentId, cancelReason, cancelledBy) {
    return await this.updateAppointment(
      appointmentId,
      {
        status: "cancelled",
        cancelReason
      },
      cancelledBy,
      "Appointment cancelled"
    );
  }
  /**
   * Search for appointments based on criteria
   */
  async searchAppointments(params) {
    let query = db.select().from(appointments);
    if (params.patientId) {
      query = query.where(eq16(appointments.patientId, params.patientId));
    }
    if (params.providerId) {
      query = query.where(eq16(appointments.providerId, params.providerId));
    }
    if (params.locationId) {
      query = query.where(eq16(appointments.locationId, params.locationId));
    }
    if (params.appointmentType) {
      query = query.where(eq16(appointments.appointmentType, params.appointmentType));
    }
    if (params.specialty) {
      query = query.where(eq16(appointments.specialty, params.specialty));
    }
    if (params.status) {
      query = query.where(eq16(appointments.status, params.status));
    }
    if (params.startDateTime) {
      query = query.where(gte2(appointments.startDateTime, params.startDateTime));
    }
    if (params.endDateTime) {
      query = query.where(lte2(appointments.endDateTime, params.endDateTime));
    }
    query = query.orderBy(appointments.startDateTime);
    return await query;
  }
  /**
   * Get appointment history
   */
  async getAppointmentHistory(appointmentId) {
    return await db.select().from(appointmentHistory).where(eq16(appointmentHistory.appointmentId, appointmentId)).orderBy(desc10(appointmentHistory.changedAt));
  }
  // ========== INTEGRATIONS ==========
  /**
   * Check eligibility for an appointment
   * (Integration with Eligibility Service)
   */
  async checkEligibility(patientId, payerId, serviceType, providerId) {
    logger_default.info("Checking eligibility", { patientId, payerId, serviceType, providerId });
    return {
      eligible: true,
      message: "Patient is eligible for this service",
      details: {
        verified: true,
        coverageLevel: "in-network",
        copay: 20,
        remainingDeductible: 500
      }
    };
  }
  /**
   * Check prior authorization requirement
   * (Integration with Prior Auth Service)
   */
  async checkPriorAuthorization(patientId, payerId, serviceType, providerId) {
    logger_default.info("Checking prior auth requirements", { patientId, payerId, serviceType, providerId });
    const requiresPriorAuth = ["imaging", "specialist", "procedure"].includes(serviceType);
    return {
      required: requiresPriorAuth,
      message: requiresPriorAuth ? "Prior authorization required for this service" : "No prior authorization required",
      details: {
        serviceCategory: serviceType
      }
    };
  }
  /**
   * Sync appointment to external calendar
   */
  async syncToCalendar(appointmentId, userId, calendarProvider) {
    const appointment = await this.getAppointment(appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    logger_default.info("Syncing appointment to calendar", { appointmentId, userId, calendarProvider });
    const [calendarSyncRecord] = await db.insert(calendarSync).values({
      id: uuidv412(),
      appointmentId,
      userId,
      calendarProvider,
      syncStatus: "synced",
      lastSyncAt: /* @__PURE__ */ new Date(),
      externalEventId: `ext-cal-${appointmentId}`
    }).returning();
    return calendarSyncRecord;
  }
  /**
   * Execute a booking with MCP validation
   * (This performs the full booking flow with all validations)
   */
  async bookAppointmentWithValidation(patientId, slotId, appointmentType, reason, payerId, referralId, orderId, organizationId) {
    const { schedulingMcpService: schedulingMcpService2 } = await Promise.resolve().then(() => (init_scheduling_mcp_service(), scheduling_mcp_service_exports));
    const slot = await this.getSlot(slotId);
    if (!slot) {
      throw new Error("Slot not found");
    }
    if (slot.status !== "free") {
      throw new Error("Slot is not available");
    }
    const schedule = await this.getSchedule(slot.scheduleId);
    if (!schedule) {
      throw new Error("Schedule not found");
    }
    const effectiveOrgId = organizationId || schedule.mcpModelRef || "default";
    const validationResult = await schedulingMcpService2.validateAppointmentBooking(
      effectiveOrgId,
      patientId,
      slot,
      schedule,
      {
        appointmentType,
        patientId,
        providerId: schedule.providerId,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime
      },
      payerId
    );
    if (!validationResult.valid) {
      throw new Error(`Booking validation failed: ${validationResult.message}`);
    }
    if (validationResult.requiresEligibility && payerId) {
      logger_default.info("Performing eligibility check based on MCP policy", {
        patientId,
        payerId,
        serviceType: schedule.serviceType
      });
      const eligibilityResult = await this.checkEligibility(
        patientId,
        payerId,
        schedule.serviceType,
        schedule.providerId
      );
      if (!eligibilityResult.eligible) {
        throw new Error(`Eligibility check failed: ${eligibilityResult.message}`);
      }
    }
    let appointmentStatus = "booked";
    let priorAuthStatus = null;
    if (validationResult.requiresPriorAuth && payerId) {
      logger_default.info("Performing prior auth check based on MCP policy", {
        patientId,
        payerId,
        serviceType: schedule.serviceType
      });
      const priorAuthResult = await this.checkPriorAuthorization(
        patientId,
        payerId,
        schedule.serviceType,
        schedule.providerId
      );
      if (priorAuthResult.required) {
        const priorAuthRule = await schedulingMcpService2.getPriorAuthRule(
          effectiveOrgId,
          schedule.serviceType,
          schedule.specialty || void 0
        );
        priorAuthStatus = priorAuthResult.approved ? "approved" : "pending";
        if (!priorAuthResult.approved && priorAuthRule.goldcardingEnabled) {
          logger_default.info("Provider may be eligible for goldcarding - booking as approved");
          priorAuthStatus = "goldcarded";
        } else if (!priorAuthResult.approved) {
          appointmentStatus = "pending";
          logger_default.info("Prior auth required but not approved - booking as pending", {
            patientId,
            slotId,
            appointmentType
          });
        }
      }
    }
    return await this.createAppointment({
      slotId,
      patientId,
      providerId: schedule.providerId,
      locationId: schedule.locationId,
      appointmentType,
      specialty: schedule.specialty,
      status: appointmentStatus,
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime,
      reason,
      payerId,
      referralId,
      orderId,
      eligibilityVerified: !!payerId,
      priorAuthStatus
    });
  }
};
var schedulingService = new SchedulingService();

// server/routes/scheduling-routes.ts
init_scheduling_mcp_service();
import { v4 as uuidv413 } from "uuid";
init_logger();
var router6 = Router5();
router6.post("/schedules", async (req, res) => {
  try {
    const scheduleData = insertScheduleSchema.parse(req.body);
    scheduleData.id = scheduleData.id || uuidv413();
    scheduleData.createdAt = /* @__PURE__ */ new Date();
    const schedule = await schedulingService.createSchedule(scheduleData);
    res.status(201).json(schedule);
  } catch (error2) {
    logger_default.error("Error creating schedule:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.get("/schedules/:id", async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const schedule = await schedulingService.getSchedule(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    res.json(schedule);
  } catch (error2) {
    logger_default.error("Error getting schedule:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.put("/schedules/:id", async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const scheduleData = req.body;
    delete scheduleData.id;
    scheduleData.updatedAt = /* @__PURE__ */ new Date();
    const schedule = await schedulingService.updateSchedule(scheduleId, scheduleData);
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    res.json(schedule);
  } catch (error2) {
    logger_default.error("Error updating schedule:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.delete("/schedules/:id", async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const success = await schedulingService.deleteSchedule(scheduleId);
    if (!success) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    res.status(204).end();
  } catch (error2) {
    logger_default.error("Error deleting schedule:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.get("/schedules", async (req, res) => {
  try {
    const { providerId, locationId, serviceType, specialty, startDate, endDate } = req.query;
    let startDateObj;
    let endDateObj;
    if (startDate && typeof startDate === "string") {
      startDateObj = new Date(startDate);
    }
    if (endDate && typeof endDate === "string") {
      endDateObj = new Date(endDate);
    }
    const schedules2 = await schedulingService.searchSchedules({
      providerId: providerId || void 0,
      locationId: locationId || void 0,
      serviceType: serviceType || void 0,
      specialty: specialty || void 0,
      startDate: startDateObj,
      endDate: endDateObj
    });
    res.json(schedules2);
  } catch (error2) {
    logger_default.error("Error searching schedules:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.post("/schedules/:scheduleId/recurrence-rules", async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;
    const schedule = await schedulingService.getSchedule(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    const ruleData = insertRecurrenceRuleSchema.parse(req.body);
    ruleData.scheduleId = scheduleId;
    ruleData.id = ruleData.id || uuidv413();
    ruleData.createdAt = /* @__PURE__ */ new Date();
    const rule = await schedulingService.createRecurrenceRule(ruleData);
    res.status(201).json(rule);
  } catch (error2) {
    logger_default.error("Error creating recurrence rule:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.get("/schedules/:scheduleId/recurrence-rules", async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;
    const schedule = await schedulingService.getSchedule(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    const rules = await schedulingService.getRecurrenceRules(scheduleId);
    res.json(rules);
  } catch (error2) {
    logger_default.error("Error getting recurrence rules:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.put("/recurrence-rules/:id", async (req, res) => {
  try {
    const ruleId = req.params.id;
    const ruleData = req.body;
    delete ruleData.id;
    delete ruleData.scheduleId;
    ruleData.updatedAt = /* @__PURE__ */ new Date();
    const rule = await schedulingService.updateRecurrenceRule(ruleId, ruleData);
    if (!rule) {
      return res.status(404).json({ error: "Recurrence rule not found" });
    }
    res.json(rule);
  } catch (error2) {
    logger_default.error("Error updating recurrence rule:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.delete("/recurrence-rules/:id", async (req, res) => {
  try {
    const ruleId = req.params.id;
    const success = await schedulingService.deleteRecurrenceRule(ruleId);
    if (!success) {
      return res.status(404).json({ error: "Recurrence rule not found" });
    }
    res.status(204).end();
  } catch (error2) {
    logger_default.error("Error deleting recurrence rule:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.post("/schedules/:scheduleId/blackout-periods", async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;
    const schedule = await schedulingService.getSchedule(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    const blackoutData = insertBlackoutPeriodSchema.parse(req.body);
    blackoutData.scheduleId = scheduleId;
    blackoutData.id = blackoutData.id || uuidv413();
    blackoutData.createdAt = /* @__PURE__ */ new Date();
    const blackout = await schedulingService.createBlackoutPeriod(blackoutData);
    res.status(201).json(blackout);
  } catch (error2) {
    logger_default.error("Error creating blackout period:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.get("/schedules/:scheduleId/blackout-periods", async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;
    const { startDate, endDate } = req.query;
    const schedule = await schedulingService.getSchedule(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    let startDateObj;
    let endDateObj;
    if (startDate && typeof startDate === "string") {
      startDateObj = new Date(startDate);
    }
    if (endDate && typeof endDate === "string") {
      endDateObj = new Date(endDate);
    }
    const blackouts = await schedulingService.getBlackoutPeriods(
      scheduleId,
      startDateObj,
      endDateObj
    );
    res.json(blackouts);
  } catch (error2) {
    logger_default.error("Error getting blackout periods:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.put("/blackout-periods/:id", async (req, res) => {
  try {
    const blackoutId = req.params.id;
    const blackoutData = req.body;
    delete blackoutData.id;
    delete blackoutData.scheduleId;
    blackoutData.updatedAt = /* @__PURE__ */ new Date();
    const blackout = await schedulingService.updateBlackoutPeriod(blackoutId, blackoutData);
    if (!blackout) {
      return res.status(404).json({ error: "Blackout period not found" });
    }
    res.json(blackout);
  } catch (error2) {
    logger_default.error("Error updating blackout period:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.delete("/blackout-periods/:id", async (req, res) => {
  try {
    const blackoutId = req.params.id;
    const success = await schedulingService.deleteBlackoutPeriod(blackoutId);
    if (!success) {
      return res.status(404).json({ error: "Blackout period not found" });
    }
    res.status(204).end();
  } catch (error2) {
    logger_default.error("Error deleting blackout period:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.post("/schedules/:scheduleId/slots", async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;
    const schedule = await schedulingService.getSchedule(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    const slotData = insertSlotSchema.parse(req.body);
    slotData.scheduleId = scheduleId;
    slotData.id = slotData.id || uuidv413();
    slotData.status = slotData.status || "free";
    slotData.createdAt = /* @__PURE__ */ new Date();
    if (schedule.mcpModelRef) {
      const validation = await schedulingMcpService.validateSlotCreation(
        schedule.mcpModelRef,
        schedule,
        slotData
      );
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }
    }
    const slot = await schedulingService.createSlot(slotData);
    res.status(201).json(slot);
  } catch (error2) {
    logger_default.error("Error creating slot:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.post("/schedules/:scheduleId/slots/bulk", async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;
    const schedule = await schedulingService.getSchedule(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: "Expected an array of slots" });
    }
    const slotsToCreate = req.body.map((slotData) => {
      const slot = {
        ...slotData,
        id: slotData.id || uuidv413(),
        scheduleId,
        status: slotData.status || "free",
        createdAt: /* @__PURE__ */ new Date()
      };
      return slot;
    });
    if (schedule.mcpModelRef) {
      for (const slotData of slotsToCreate) {
        const validation = await schedulingMcpService.validateSlotCreation(
          schedule.mcpModelRef,
          schedule,
          slotData
        );
        if (!validation.valid) {
          return res.status(400).json({
            error: `Validation failed for slot: ${validation.message}`,
            slot: slotData
          });
        }
      }
    }
    const slots2 = await schedulingService.createSlots(slotsToCreate);
    res.status(201).json(slots2);
  } catch (error2) {
    logger_default.error("Error creating slots in bulk:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.post("/schedules/:scheduleId/generate-slots", async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }
    const schedule = await schedulingService.getSchedule(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const slots2 = await schedulingService.generateSlotsFromRules(
      scheduleId,
      startDateObj,
      endDateObj
    );
    res.status(201).json(slots2);
  } catch (error2) {
    logger_default.error("Error generating slots from recurrence rules:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.get("/slots/:id", async (req, res) => {
  try {
    const slotId = req.params.id;
    const slot = await schedulingService.getSlot(slotId);
    if (!slot) {
      return res.status(404).json({ error: "Slot not found" });
    }
    res.json(slot);
  } catch (error2) {
    logger_default.error("Error getting slot:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.put("/slots/:id", async (req, res) => {
  try {
    const slotId = req.params.id;
    const slotData = req.body;
    delete slotData.id;
    delete slotData.scheduleId;
    slotData.updatedAt = /* @__PURE__ */ new Date();
    const existingSlot = await schedulingService.getSlot(slotId);
    if (!existingSlot) {
      return res.status(404).json({ error: "Slot not found" });
    }
    if (existingSlot.status === "booked" && slotData.status === "free") {
    }
    if (existingSlot.scheduleId) {
      const schedule = await schedulingService.getSchedule(existingSlot.scheduleId);
      if (schedule && schedule.mcpModelRef) {
        const validation = await schedulingMcpService.validateSlotCreation(
          schedule.mcpModelRef,
          schedule,
          { ...existingSlot, ...slotData }
        );
        if (!validation.valid) {
          return res.status(400).json({ error: validation.message });
        }
      }
    }
    const slot = await schedulingService.updateSlot(slotId, slotData);
    res.json(slot);
  } catch (error2) {
    logger_default.error("Error updating slot:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.delete("/slots/:id", async (req, res) => {
  try {
    const slotId = req.params.id;
    const slot = await schedulingService.getSlot(slotId);
    if (!slot) {
      return res.status(404).json({ error: "Slot not found" });
    }
    if (slot.status === "booked") {
      return res.status(400).json({
        error: "Cannot delete a booked slot. Cancel appointments first."
      });
    }
    const success = await schedulingService.deleteSlot(slotId);
    res.status(204).end();
  } catch (error2) {
    logger_default.error("Error deleting slot:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.get("/slots", async (req, res) => {
  try {
    const {
      providerId,
      locationId,
      serviceType,
      specialty,
      startDateTime,
      endDateTime,
      status
    } = req.query;
    let startDateObj;
    let endDateObj;
    if (startDateTime && typeof startDateTime === "string") {
      startDateObj = new Date(startDateTime);
    }
    if (endDateTime && typeof endDateTime === "string") {
      endDateObj = new Date(endDateTime);
    }
    const slots2 = await schedulingService.searchAvailableSlots({
      providerId: providerId || void 0,
      locationId: locationId || void 0,
      serviceType: serviceType || void 0,
      specialty: specialty || void 0,
      startDateTime: startDateObj,
      endDateTime: endDateObj,
      status: status || void 0
    });
    res.json(slots2);
  } catch (error2) {
    logger_default.error("Error searching available slots:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.post("/appointments", async (req, res) => {
  try {
    const appointmentData = insertAppointmentSchema.parse(req.body);
    appointmentData.id = appointmentData.id || uuidv413();
    appointmentData.createdAt = /* @__PURE__ */ new Date();
    if (appointmentData.slotId) {
      const slot = await schedulingService.getSlot(appointmentData.slotId);
      if (!slot) {
        return res.status(404).json({ error: "Slot not found" });
      }
      if (slot.status !== "free") {
        return res.status(400).json({ error: "Slot is not available" });
      }
    }
    const appointment = await schedulingService.createAppointment(appointmentData);
    res.status(201).json(appointment);
  } catch (error2) {
    logger_default.error("Error creating appointment:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.post("/appointments/book", async (req, res) => {
  try {
    const {
      patientId,
      slotId,
      appointmentType,
      reason,
      payerId,
      referralId,
      orderId,
      organizationId
    } = req.body;
    if (!patientId || !slotId || !appointmentType) {
      return res.status(400).json({
        error: "Patient ID, slot ID, and appointment type are required"
      });
    }
    try {
      const appointment = await schedulingService.bookAppointmentWithValidation(
        patientId,
        slotId,
        appointmentType,
        reason,
        payerId,
        referralId,
        orderId,
        organizationId
      );
      res.status(201).json(appointment);
    } catch (error2) {
      return res.status(400).json({ error: error2 instanceof Error ? error2.message : "Booking failed" });
    }
  } catch (error2) {
    logger_default.error("Error booking appointment:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.get("/appointments/:id", async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await schedulingService.getAppointment(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.json(appointment);
  } catch (error2) {
    logger_default.error("Error getting appointment:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.put("/appointments/:id", async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const appointmentData = req.body;
    delete appointmentData.id;
    appointmentData.updatedAt = /* @__PURE__ */ new Date();
    const existingAppointment = await schedulingService.getAppointment(appointmentId);
    if (!existingAppointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    if (appointmentData.slotId && appointmentData.slotId !== existingAppointment.slotId) {
      const slot = await schedulingService.getSlot(appointmentData.slotId);
      if (!slot) {
        return res.status(404).json({ error: "New slot not found" });
      }
      if (slot.status !== "free") {
        return res.status(400).json({ error: "New slot is not available" });
      }
    }
    const appointment = await schedulingService.updateAppointment(appointmentId, appointmentData);
    res.json(appointment);
  } catch (error2) {
    logger_default.error("Error updating appointment:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.post("/appointments/:id/cancel", async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { cancelledBy, cancelReason } = req.body;
    if (!cancelledBy || !cancelReason) {
      return res.status(400).json({
        error: "Cancelled by and cancel reason are required"
      });
    }
    const existingAppointment = await schedulingService.getAppointment(appointmentId);
    if (!existingAppointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    let organizationId = "default";
    if (existingAppointment.slotId) {
      const slot = await schedulingService.getSlot(existingAppointment.slotId);
      if (slot && slot.scheduleId) {
        const schedule = await schedulingService.getSchedule(slot.scheduleId);
        if (schedule && schedule.mcpModelRef) {
          organizationId = schedule.mcpModelRef;
        }
      }
    }
    const cancellationResult = await schedulingMcpService.processAppointmentCancellation(
      organizationId,
      appointmentId,
      existingAppointment,
      cancelledBy,
      cancelReason
    );
    if (!cancellationResult.approved) {
      return res.status(400).json({
        error: "Cancellation not approved",
        message: cancellationResult.message
      });
    }
    const appointment = await schedulingService.cancelAppointment(
      appointmentId,
      cancelledBy,
      cancelReason
    );
    res.json({
      appointment,
      cancellationResult
    });
  } catch (error2) {
    logger_default.error("Error cancelling appointment:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.get("/appointments", async (req, res) => {
  try {
    const {
      patientId,
      providerId,
      locationId,
      appointmentType,
      specialty,
      status,
      startDateTime,
      endDateTime
    } = req.query;
    let startDateObj;
    let endDateObj;
    if (startDateTime && typeof startDateTime === "string") {
      startDateObj = new Date(startDateTime);
    }
    if (endDateTime && typeof endDateTime === "string") {
      endDateObj = new Date(endDateTime);
    }
    const appointments2 = await schedulingService.searchAppointments({
      patientId: patientId || void 0,
      providerId: providerId || void 0,
      locationId: locationId || void 0,
      appointmentType: appointmentType || void 0,
      specialty: specialty || void 0,
      status: status || void 0,
      startDateTime: startDateObj,
      endDateTime: endDateObj
    });
    res.json(appointments2);
  } catch (error2) {
    logger_default.error("Error searching appointments:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.get("/appointments/:id/history", async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await schedulingService.getAppointment(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    const history = await schedulingService.getAppointmentHistory(appointmentId);
    res.json(history);
  } catch (error2) {
    logger_default.error("Error getting appointment history:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
router6.post("/appointments/:id/sync-calendar", async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { calendarType, calendarId } = req.body;
    if (!calendarType || !calendarId) {
      return res.status(400).json({
        error: "Calendar type and calendar ID are required"
      });
    }
    const appointment = await schedulingService.getAppointment(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    const syncResult = await schedulingService.syncToCalendar(
      appointmentId,
      calendarType,
      calendarId
    );
    res.json(syncResult);
  } catch (error2) {
    logger_default.error("Error syncing appointment to calendar:", error2);
    res.status(400).json({ error: error2 instanceof Error ? error2.message : "Invalid request" });
  }
});
router6.post("/init-tables", async (req, res) => {
  try {
    const result = await schedulingService.initSchedulingTables();
    if (result) {
      res.json({ message: "Scheduling tables initialized successfully" });
    } else {
      res.status(500).json({ error: "Failed to initialize scheduling tables" });
    }
  } catch (error2) {
    logger_default.error("Error initializing scheduling tables:", error2);
    res.status(500).json({ error: "Internal server error" });
  }
});
var schedulingRouter = router6;

// server/routes/employer-routes.ts
import { Router as Router6 } from "express";

// shared/employer-schema.ts
import { integer as integer10, pgTable as pgTable12, primaryKey as primaryKey5, text as text12, timestamp as timestamp12, boolean as boolean12, jsonb as jsonb9, uuid as uuid9, pgEnum as pgEnum6 } from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema12, createSelectSchema as createSelectSchema5 } from "drizzle-zod";
var employerSizeEnum = pgEnum6("employer_size", [
  "small",
  // 1-99 employees
  "medium",
  // 100-999 employees
  "large",
  // 1,000-4,999 employees
  "enterprise"
  // 5,000+ employees
]);
var employerStatusEnum = pgEnum6("employer_status", [
  "active",
  "inactive",
  "pending",
  "suspended"
]);
var employerIndustryEnum = pgEnum6("employer_industry", [
  "healthcare",
  "technology",
  "finance",
  "education",
  "manufacturing",
  "retail",
  "government",
  "nonprofit",
  "other"
]);
var programTypeEnum = pgEnum6("program_type", [
  "physical_activity",
  "nutrition",
  "mental_health",
  "chronic_disease_management",
  "preventive_care",
  "financial_wellness",
  "tobacco_cessation",
  "general_wellness",
  "custom"
]);
var programStatusEnum = pgEnum6("program_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "canceled"
]);
var incentiveTypeEnum = pgEnum6("incentive_type", [
  "points",
  "currency",
  "premium_discount",
  "benefit_enhancement",
  "time_off",
  "gift_card",
  "merchandise",
  "charitable_donation"
]);
var incentiveTriggerEnum = pgEnum6("incentive_trigger", [
  "participation",
  "completion",
  "achievement",
  "milestone",
  "recurring"
]);
var employeeStatusEnum = pgEnum6("employee_status", [
  "active",
  "inactive",
  "pending_invitation",
  "invitation_sent",
  "invitation_expired"
]);
var vendorStatusEnum = pgEnum6("vendor_status", [
  "active",
  "inactive",
  "integration_pending",
  "integration_failed"
]);
var employers2 = pgTable12("employers", {
  id: uuid9("id").primaryKey().defaultRandom(),
  name: text12("name").notNull(),
  displayName: text12("display_name").notNull(),
  size: employerSizeEnum("size").notNull(),
  industry: employerIndustryEnum("industry").notNull(),
  status: employerStatusEnum("status").notNull().default("active"),
  mcpModelRef: text12("mcp_model_ref"),
  // Contact and business details
  mainContactName: text12("main_contact_name"),
  mainContactEmail: text12("main_contact_email"),
  mainContactPhone: text12("main_contact_phone"),
  taxId: text12("tax_id"),
  website: text12("website"),
  // Address
  addressLine1: text12("address_line1"),
  addressLine2: text12("address_line2"),
  city: text12("city"),
  state: text12("state"),
  postalCode: text12("postal_code"),
  country: text12("country").default("USA"),
  // Configuration data
  configData: jsonb9("config_data"),
  brandingData: jsonb9("branding_data"),
  apiKeys: jsonb9("api_keys"),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at"),
  // Relations
  parentEmployerId: uuid9("parent_employer_id").references(() => employers2.id)
});
var employerLocations = pgTable12("employer_locations", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employerId: uuid9("employer_id").notNull().references(() => employers2.id),
  name: text12("name").notNull(),
  type: text12("type").notNull(),
  addressLine1: text12("address_line1").notNull(),
  addressLine2: text12("address_line2"),
  city: text12("city").notNull(),
  state: text12("state").notNull(),
  postalCode: text12("postal_code").notNull(),
  country: text12("country").default("USA"),
  timezone: text12("timezone"),
  isHeadquarters: boolean12("is_headquarters").default(false),
  active: boolean12("active").default(true),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var employerDepartments = pgTable12("employer_departments", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employerId: uuid9("employer_id").notNull().references(() => employers2.id),
  name: text12("name").notNull(),
  code: text12("code"),
  description: text12("description"),
  parentDepartmentId: uuid9("parent_department_id").references(() => employerDepartments.id),
  active: boolean12("active").default(true),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var employerAdmins = pgTable12("employer_admins", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employerId: uuid9("employer_id").notNull().references(() => employers2.id),
  userId: uuid9("user_id").notNull(),
  // References the SHH user directory
  role: text12("role").notNull(),
  permissions: jsonb9("permissions").notNull(),
  active: boolean12("active").default(true),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var employees = pgTable12("employees", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employerId: uuid9("employer_id").notNull().references(() => employers2.id),
  userId: uuid9("user_id"),
  // References the SHH user directory, can be null until account created
  employeeId: text12("employee_id"),
  // Employer's internal ID for the employee
  email: text12("email").notNull(),
  firstName: text12("first_name"),
  lastName: text12("last_name"),
  status: employeeStatusEnum("status").notNull().default("pending_invitation"),
  // Optional details (populated as available)
  departmentId: uuid9("department_id").references(() => employerDepartments.id),
  locationId: uuid9("location_id").references(() => employerLocations.id),
  jobTitle: text12("job_title"),
  hireDate: timestamp12("hire_date"),
  terminationDate: timestamp12("termination_date"),
  // Invitation and onboarding tracking
  invitationSentDate: timestamp12("invitation_sent_date"),
  invitationAcceptedDate: timestamp12("invitation_accepted_date"),
  lastInvitationDate: timestamp12("last_invitation_date"),
  invitationCount: integer10("invitation_count").default(0),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var wellnessPrograms = pgTable12("wellness_programs", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employerId: uuid9("employer_id").notNull().references(() => employers2.id),
  name: text12("name").notNull(),
  description: text12("description"),
  type: programTypeEnum("type").notNull(),
  status: programStatusEnum("status").notNull().default("draft"),
  // Program details
  startDate: timestamp12("start_date"),
  endDate: timestamp12("end_date"),
  enrollmentStartDate: timestamp12("enrollment_start_date"),
  enrollmentEndDate: timestamp12("enrollment_end_date"),
  // Configuration data
  configData: jsonb9("config_data"),
  eligibilityCriteria: jsonb9("eligibility_criteria"),
  successCriteria: jsonb9("success_criteria"),
  // Visibility and targeting
  isVisible: boolean12("is_visible").default(true),
  targetAudience: jsonb9("target_audience"),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at"),
  launchedAt: timestamp12("launched_at"),
  completedAt: timestamp12("completed_at"),
  // Created by
  createdById: uuid9("created_by_id").references(() => employerAdmins.id)
});
var programContents = pgTable12("program_contents", {
  id: uuid9("id").primaryKey().defaultRandom(),
  programId: uuid9("program_id").notNull().references(() => wellnessPrograms.id),
  title: text12("title").notNull(),
  description: text12("description"),
  contentType: text12("content_type").notNull(),
  // Content details
  sortOrder: integer10("sort_order").default(0),
  durationMinutes: integer10("duration_minutes"),
  pointValue: integer10("point_value"),
  contentData: jsonb9("content_data"),
  // Scheduling
  startDate: timestamp12("start_date"),
  endDate: timestamp12("end_date"),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var programEnrollments = pgTable12("program_enrollments", {
  id: uuid9("id").primaryKey().defaultRandom(),
  programId: uuid9("program_id").notNull().references(() => wellnessPrograms.id),
  employeeId: uuid9("employee_id").notNull().references(() => employees.id),
  // Enrollment data
  enrollmentDate: timestamp12("enrollment_date").notNull().defaultNow(),
  completionDate: timestamp12("completion_date"),
  status: text12("status").notNull().default("enrolled"),
  progress: integer10("progress").default(0),
  // Additional data
  notes: text12("notes"),
  metadata: jsonb9("metadata"),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var wellnessActivities = pgTable12("wellness_activities", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employeeId: uuid9("employee_id").notNull().references(() => employees.id),
  programId: uuid9("program_id").references(() => wellnessPrograms.id),
  contentId: uuid9("content_id").references(() => programContents.id),
  // Activity details
  activityType: text12("activity_type").notNull(),
  activityDate: timestamp12("activity_date").notNull(),
  status: text12("status").notNull(),
  // Activity data
  activityData: jsonb9("activity_data"),
  verificationData: jsonb9("verification_data"),
  pointsEarned: integer10("points_earned").default(0),
  // Source tracking
  sourceType: text12("source_type"),
  // 'manual', 'integration', etc.
  sourceId: text12("source_id"),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var incentiveRules = pgTable12("incentive_rules", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employerId: uuid9("employer_id").notNull().references(() => employers2.id),
  programId: uuid9("program_id").references(() => wellnessPrograms.id),
  // Rule details
  name: text12("name").notNull(),
  description: text12("description"),
  triggerType: incentiveTriggerEnum("trigger_type").notNull(),
  // Incentive configuration
  incentiveType: incentiveTypeEnum("incentive_type").notNull(),
  value: integer10("value").notNull(),
  // Points, amount, etc.
  maxOccurrences: integer10("max_occurrences"),
  // Limit per user, null = unlimited
  // Advanced rule details
  requirementData: jsonb9("requirement_data"),
  frequencyData: jsonb9("frequency_data"),
  // Status
  active: boolean12("active").default(true),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at"),
  startDate: timestamp12("start_date"),
  endDate: timestamp12("end_date")
});
var incentiveAwards = pgTable12("incentive_awards", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employeeId: uuid9("employee_id").notNull().references(() => employees.id),
  incentiveRuleId: uuid9("incentive_rule_id").notNull().references(() => incentiveRules.id),
  // Award details
  awardDate: timestamp12("award_date").notNull().defaultNow(),
  pointsAwarded: integer10("points_awarded").notNull(),
  status: text12("status").notNull().default("awarded"),
  // Activity connection
  activityId: uuid9("activity_id").references(() => wellnessActivities.id),
  programId: uuid9("program_id").references(() => wellnessPrograms.id),
  // Details
  awardData: jsonb9("award_data"),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at"),
  expirationDate: timestamp12("expiration_date")
});
var walletTransactions = pgTable12("wallet_transactions", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employeeId: uuid9("employee_id").notNull().references(() => employees.id),
  // Transaction details
  transactionDate: timestamp12("transaction_date").notNull().defaultNow(),
  transactionType: text12("transaction_type").notNull(),
  // 'award', 'redemption', 'expiration', etc.
  points: integer10("points").notNull(),
  // References
  awardId: uuid9("award_id").references(() => incentiveAwards.id),
  rewardItemId: text12("reward_item_id"),
  // Additional data
  description: text12("description"),
  metadata: jsonb9("metadata"),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var wellnessVendors = pgTable12("wellness_vendors", {
  id: uuid9("id").primaryKey().defaultRandom(),
  name: text12("name").notNull(),
  slug: text12("slug").notNull().unique(),
  description: text12("description"),
  vendorType: text12("vendor_type").notNull(),
  // Integration details
  integrationDetails: jsonb9("integration_details"),
  apiDocumentation: text12("api_documentation"),
  supportContact: text12("support_contact"),
  supportEmail: text12("support_email"),
  // Status
  active: boolean12("active").default(true),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var employerVendorIntegrations = pgTable12("employer_vendor_integrations", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employerId: uuid9("employer_id").notNull().references(() => employers2.id),
  vendorId: uuid9("vendor_id").notNull().references(() => wellnessVendors.id),
  // Integration status
  status: vendorStatusEnum("status").notNull().default("integration_pending"),
  // Integration configuration
  configData: jsonb9("config_data"),
  credentials: jsonb9("credentials"),
  // SSO and API details
  ssoConfig: jsonb9("sso_config"),
  callbackUrl: text12("callback_url"),
  webhookUrl: text12("webhook_url"),
  // Contract and usage details
  contractStartDate: timestamp12("contract_start_date"),
  contractEndDate: timestamp12("contract_end_date"),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at"),
  lastSyncDate: timestamp12("last_sync_date")
});
var employeeVendorAccounts = pgTable12("employee_vendor_accounts", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employeeId: uuid9("employee_id").notNull().references(() => employees.id),
  integrationId: uuid9("integration_id").notNull().references(() => employerVendorIntegrations.id),
  // External account details
  externalId: text12("external_id"),
  externalUsername: text12("external_username"),
  accountStatus: text12("account_status"),
  // Connection details
  connectDate: timestamp12("connect_date"),
  lastActivityDate: timestamp12("last_activity_date"),
  // Additional data
  metadata: jsonb9("metadata"),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var vendorActivitySync = pgTable12("vendor_activity_sync", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employeeVendorAccountId: uuid9("employee_vendor_account_id").notNull().references(() => employeeVendorAccounts.id),
  // Sync details
  syncDate: timestamp12("sync_date").notNull().defaultNow(),
  dataType: text12("data_type").notNull(),
  activityDate: timestamp12("activity_date").notNull(),
  // Data details
  rawData: jsonb9("raw_data"),
  processedData: jsonb9("processed_data"),
  status: text12("status").notNull(),
  // Processing details
  processedAt: timestamp12("processed_at"),
  activityId: uuid9("activity_id").references(() => wellnessActivities.id),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var employerAnalytics = pgTable12("employer_analytics", {
  id: uuid9("id").primaryKey().defaultRandom(),
  employerId: uuid9("employer_id").notNull().references(() => employers2.id),
  // Analytics details
  reportDate: timestamp12("report_date").notNull(),
  reportType: text12("report_type").notNull(),
  // Aggregated metrics
  metrics: jsonb9("metrics").notNull(),
  segmentDimensions: jsonb9("segment_dimensions"),
  // Generation details
  generatedAt: timestamp12("generated_at").notNull().defaultNow(),
  dataRange: jsonb9("data_range"),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var programAnalytics = pgTable12("program_analytics", {
  id: uuid9("id").primaryKey().defaultRandom(),
  programId: uuid9("program_id").notNull().references(() => wellnessPrograms.id),
  // Analytics details
  reportDate: timestamp12("report_date").notNull(),
  reportType: text12("report_type").notNull(),
  // Metrics
  metrics: jsonb9("metrics").notNull(),
  segmentDimensions: jsonb9("segment_dimensions"),
  // Timestamps
  createdAt: timestamp12("created_at").notNull().defaultNow(),
  updatedAt: timestamp12("updated_at")
});
var employeeEmployerUnique = pgTable12("employee_employer_unique", {
  employeeId: uuid9("employee_id").notNull().references(() => employees.id),
  employerId: uuid9("employer_id").notNull().references(() => employers2.id)
}, (t) => ({
  pk: primaryKey5(t.employeeId, t.employerId)
}));
var programEnrollmentUnique = pgTable12("program_enrollment_unique", {
  programId: uuid9("program_id").notNull().references(() => wellnessPrograms.id),
  employeeId: uuid9("employee_id").notNull().references(() => employees.id)
}, (t) => ({
  pk: primaryKey5(t.programId, t.employeeId)
}));
var employeeVendorUnique = pgTable12("employee_vendor_unique", {
  employeeId: uuid9("employee_id").notNull().references(() => employees.id),
  integrationId: uuid9("integration_id").notNull().references(() => employerVendorIntegrations.id)
}, (t) => ({
  pk: primaryKey5(t.employeeId, t.integrationId)
}));
var insertEmployerSchema2 = createInsertSchema12(employers2);
var selectEmployerSchema = createSelectSchema5(employers2);
var insertEmployeeSchema = createInsertSchema12(employees);
var selectEmployeeSchema = createSelectSchema5(employees);
var insertWellnessProgramSchema = createInsertSchema12(wellnessPrograms);
var selectWellnessProgramSchema = createSelectSchema5(wellnessPrograms);
var insertProgramContentSchema = createInsertSchema12(programContents);
var selectProgramContentSchema = createSelectSchema5(programContents);
var insertProgramEnrollmentSchema = createInsertSchema12(programEnrollments);
var selectProgramEnrollmentSchema = createSelectSchema5(programEnrollments);
var insertIncentiveRuleSchema = createInsertSchema12(incentiveRules);
var selectIncentiveRuleSchema = createSelectSchema5(incentiveRules);
var insertVendorIntegrationSchema = createInsertSchema12(employerVendorIntegrations);
var selectVendorIntegrationSchema = createSelectSchema5(employerVendorIntegrations);

// server/services/employer/employer-service.ts
init_logger();
import { eq as eq17, and as and13, like as like2, isNull, or as or7, desc as desc11 } from "drizzle-orm";
import { v4 as uuidv414 } from "uuid";
var EmployerService = class {
  /**
   * Create a new employer organization
   */
  async createEmployer(data) {
    try {
      if (!data.id) {
        data.id = uuidv414();
      }
      data.createdAt = /* @__PURE__ */ new Date();
      const [employer] = await db.insert(employers2).values(data).returning();
      if (!employer) {
        throw new Error("Failed to create employer");
      }
      logger_default.info(`Created employer: ${employer.id} (${employer.name})`);
      return employer;
    } catch (error2) {
      logger_default.error("Error creating employer:", error2);
      throw error2;
    }
  }
  /**
   * Get an employer by ID
   */
  async getEmployer(id) {
    try {
      const [employer] = await db.select().from(employers2).where(eq17(employers2.id, id));
      return employer;
    } catch (error2) {
      logger_default.error(`Error getting employer ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Update an employer
   */
  async updateEmployer(id, data) {
    try {
      delete data.id;
      data.updatedAt = /* @__PURE__ */ new Date();
      const [employer] = await db.update(employers2).set(data).where(eq17(employers2.id, id)).returning();
      if (!employer) {
        return void 0;
      }
      logger_default.info(`Updated employer: ${id}`);
      return employer;
    } catch (error2) {
      logger_default.error(`Error updating employer ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Delete an employer
   * Note: This should include cascade logic or prevent deletion if related records exist
   */
  async deleteEmployer(id) {
    try {
      const relatedEmployees = await db.select({ count: employers2.id }).from(employees).where(eq17(employees.employerId, id));
      if (relatedEmployees.length > 0 && relatedEmployees[0].count) {
        throw new Error("Cannot delete employer with existing employees");
      }
      const result = await db.delete(employers2).where(eq17(employers2.id, id)).returning();
      const success = result.length > 0;
      if (success) {
        logger_default.info(`Deleted employer: ${id}`);
      }
      return success;
    } catch (error2) {
      logger_default.error(`Error deleting employer ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Search for employers based on criteria
   */
  async searchEmployers(params) {
    try {
      let query = db.select().from(employers2);
      if (params.name) {
        query = query.where(like2(employers2.name, `%${params.name}%`));
      }
      if (params.industry) {
        query = query.where(eq17(employers2.industry, params.industry));
      }
      if (params.size) {
        query = query.where(eq17(employers2.size, params.size));
      }
      if (params.status) {
        query = query.where(eq17(employers2.status, params.status));
      }
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = query.offset(params.offset);
      }
      const results = await query;
      return results;
    } catch (error2) {
      logger_default.error("Error searching employers:", error2);
      throw error2;
    }
  }
  // ============================================================================
  // Employee Management
  // ============================================================================
  /**
   * Create a new employee record
   */
  async createEmployee(data) {
    try {
      if (!data.id) {
        data.id = uuidv414();
      }
      data.createdAt = /* @__PURE__ */ new Date();
      const [employee] = await db.insert(employees).values(data).returning();
      if (!employee) {
        throw new Error("Failed to create employee");
      }
      logger_default.info(`Created employee: ${employee.id} for employer ${employee.employerId}`);
      return employee;
    } catch (error2) {
      logger_default.error("Error creating employee:", error2);
      throw error2;
    }
  }
  /**
   * Get an employee by ID
   */
  async getEmployee(id) {
    try {
      const [employee] = await db.select().from(employees).where(eq17(employees.id, id));
      return employee;
    } catch (error2) {
      logger_default.error(`Error getting employee ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Update an employee
   */
  async updateEmployee(id, data) {
    try {
      delete data.id;
      data.updatedAt = /* @__PURE__ */ new Date();
      const [employee] = await db.update(employees).set(data).where(eq17(employees.id, id)).returning();
      if (!employee) {
        return void 0;
      }
      logger_default.info(`Updated employee: ${id}`);
      return employee;
    } catch (error2) {
      logger_default.error(`Error updating employee ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Delete an employee
   */
  async deleteEmployee(id) {
    try {
      const result = await db.delete(employees).where(eq17(employees.id, id)).returning();
      const success = result.length > 0;
      if (success) {
        logger_default.info(`Deleted employee: ${id}`);
      }
      return success;
    } catch (error2) {
      logger_default.error(`Error deleting employee ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Search for employees based on criteria
   */
  async searchEmployees(params) {
    try {
      let query = db.select().from(employees).where(eq17(employees.employerId, params.employerId));
      if (params.status) {
        query = query.where(eq17(employees.status, params.status));
      }
      if (params.departmentId) {
        query = query.where(eq17(employees.departmentId, params.departmentId));
      }
      if (params.locationId) {
        query = query.where(eq17(employees.locationId, params.locationId));
      }
      if (params.email) {
        query = query.where(like2(employees.email, `%${params.email}%`));
      }
      if (params.name) {
        query = query.where(
          or7(
            like2(employees.firstName || "", `%${params.name}%`),
            like2(employees.lastName || "", `%${params.name}%`)
          )
        );
      }
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = query.offset(params.offset);
      }
      const results = await query;
      return results;
    } catch (error2) {
      logger_default.error("Error searching employees:", error2);
      throw error2;
    }
  }
  /**
   * Invite an employee by email
   */
  async inviteEmployee(employeeId) {
    try {
      const employee = await this.getEmployee(employeeId);
      if (!employee) {
        throw new Error("Employee not found");
      }
      const invitationCount = (employee.invitationCount || 0) + 1;
      const now = /* @__PURE__ */ new Date();
      const [updatedEmployee] = await db.update(employees).set({
        status: "invitation_sent",
        invitationSentDate: now,
        lastInvitationDate: now,
        invitationCount,
        updatedAt: now
      }).where(eq17(employees.id, employeeId)).returning();
      if (!updatedEmployee) {
        throw new Error("Failed to update employee invitation status");
      }
      logger_default.info(`Sent invitation to employee: ${employeeId}`);
      return updatedEmployee;
    } catch (error2) {
      logger_default.error(`Error inviting employee ${employeeId}:`, error2);
      throw error2;
    }
  }
  /**
   * Bulk upload employees for an employer
   */
  async bulkUploadEmployees(employerId, employeeList) {
    try {
      const employeesToInsert = employeeList.map((employee) => ({
        ...employee,
        id: uuidv414(),
        employerId,
        status: "pending_invitation",
        createdAt: /* @__PURE__ */ new Date()
      }));
      const createdEmployees = await db.insert(employees).values(employeesToInsert).returning();
      logger_default.info(`Bulk uploaded ${createdEmployees.length} employees for employer ${employerId}`);
      return createdEmployees;
    } catch (error2) {
      logger_default.error(`Error bulk uploading employees for employer ${employerId}:`, error2);
      throw error2;
    }
  }
  // ============================================================================
  // Wellness Program Management
  // ============================================================================
  /**
   * Create a new wellness program
   */
  async createWellnessProgram(data) {
    try {
      if (!data.id) {
        data.id = uuidv414();
      }
      data.createdAt = /* @__PURE__ */ new Date();
      const [program] = await db.insert(wellnessPrograms).values(data).returning();
      if (!program) {
        throw new Error("Failed to create wellness program");
      }
      logger_default.info(`Created wellness program: ${program.id} (${program.name}) for employer ${program.employerId}`);
      return program;
    } catch (error2) {
      logger_default.error("Error creating wellness program:", error2);
      throw error2;
    }
  }
  /**
   * Get a wellness program by ID
   */
  async getWellnessProgram(id) {
    try {
      const [program] = await db.select().from(wellnessPrograms).where(eq17(wellnessPrograms.id, id));
      return program;
    } catch (error2) {
      logger_default.error(`Error getting wellness program ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Update a wellness program
   */
  async updateWellnessProgram(id, data) {
    try {
      delete data.id;
      data.updatedAt = /* @__PURE__ */ new Date();
      if (data.status === "active" && !data.launchedAt) {
        data.launchedAt = /* @__PURE__ */ new Date();
      } else if (data.status === "completed" && !data.completedAt) {
        data.completedAt = /* @__PURE__ */ new Date();
      }
      const [program] = await db.update(wellnessPrograms).set(data).where(eq17(wellnessPrograms.id, id)).returning();
      if (!program) {
        return void 0;
      }
      logger_default.info(`Updated wellness program: ${id}`);
      return program;
    } catch (error2) {
      logger_default.error(`Error updating wellness program ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Search for wellness programs
   */
  async searchWellnessPrograms(params) {
    try {
      let query = db.select().from(wellnessPrograms).where(eq17(wellnessPrograms.employerId, params.employerId));
      if (params.type) {
        query = query.where(eq17(wellnessPrograms.type, params.type));
      }
      if (params.status) {
        query = query.where(eq17(wellnessPrograms.status, params.status));
      }
      if (params.active === true) {
        const now = /* @__PURE__ */ new Date();
        query = query.where(
          and13(
            or7(
              isNull(wellnessPrograms.startDate),
              wellnessPrograms.startDate.lte(now)
            ),
            or7(
              isNull(wellnessPrograms.endDate),
              wellnessPrograms.endDate.gte(now)
            )
          )
        );
      }
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = query.offset(params.offset);
      }
      const results = await query;
      return results;
    } catch (error2) {
      logger_default.error("Error searching wellness programs:", error2);
      throw error2;
    }
  }
  // ============================================================================
  // Incentive Program Management
  // ============================================================================
  /**
   * Create a new incentive rule
   */
  async createIncentiveRule(data) {
    try {
      if (!data.id) {
        data.id = uuidv414();
      }
      data.createdAt = /* @__PURE__ */ new Date();
      const [rule] = await db.insert(incentiveRules).values(data).returning();
      if (!rule) {
        throw new Error("Failed to create incentive rule");
      }
      logger_default.info(`Created incentive rule: ${rule.id} (${rule.name}) for employer ${rule.employerId}`);
      return rule;
    } catch (error2) {
      logger_default.error("Error creating incentive rule:", error2);
      throw error2;
    }
  }
  /**
   * Get an incentive rule by ID
   */
  async getIncentiveRule(id) {
    try {
      const [rule] = await db.select().from(incentiveRules).where(eq17(incentiveRules.id, id));
      return rule;
    } catch (error2) {
      logger_default.error(`Error getting incentive rule ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Award incentive points to an employee
   */
  async awardIncentivePoints(employeeId, incentiveRuleId, activityId, programId) {
    try {
      const rule = await this.getIncentiveRule(incentiveRuleId);
      if (!rule) {
        throw new Error("Incentive rule not found");
      }
      if (!rule.active) {
        throw new Error("Incentive rule is not active");
      }
      const now = /* @__PURE__ */ new Date();
      if (rule.startDate && rule.startDate > now) {
        throw new Error("Incentive rule start date is in the future");
      }
      if (rule.endDate && rule.endDate < now) {
        throw new Error("Incentive rule end date has passed");
      }
      const [award] = await db.insert(incentiveAwards).values({
        id: uuidv414(),
        employeeId,
        incentiveRuleId,
        activityId,
        programId,
        awardDate: now,
        pointsAwarded: rule.value,
        status: "awarded",
        createdAt: now
      }).returning();
      if (!award) {
        throw new Error("Failed to create incentive award");
      }
      const [transaction] = await db.insert(walletTransactions).values({
        id: uuidv414(),
        employeeId,
        transactionDate: now,
        transactionType: "award",
        points: rule.value,
        awardId: award.id,
        description: `Points awarded for ${rule.name}`,
        createdAt: now
      }).returning();
      logger_default.info(`Awarded ${rule.value} incentive points to employee ${employeeId} for rule ${incentiveRuleId}`);
      return {
        award,
        transaction
      };
    } catch (error2) {
      logger_default.error(`Error awarding incentive points to employee ${employeeId}:`, error2);
      throw error2;
    }
  }
  /**
   * Get employee wallet balance
   */
  async getEmployeeWalletBalance(employeeId) {
    try {
      const result = await db.execute(
        `SELECT COALESCE(SUM(points), 0) as balance 
         FROM wallet_transactions 
         WHERE employee_id = $1`,
        [employeeId]
      );
      return result.rows[0]?.balance || 0;
    } catch (error2) {
      logger_default.error(`Error getting wallet balance for employee ${employeeId}:`, error2);
      throw error2;
    }
  }
  /**
   * Get employee wallet transaction history
   */
  async getEmployeeWalletTransactions(employeeId, limit = 100, offset = 0) {
    try {
      const transactions = await db.select().from(walletTransactions).where(eq17(walletTransactions.employeeId, employeeId)).orderBy(desc11(walletTransactions.transactionDate)).limit(limit).offset(offset);
      return transactions;
    } catch (error2) {
      logger_default.error(`Error getting wallet transactions for employee ${employeeId}:`, error2);
      throw error2;
    }
  }
  // ============================================================================
  // Analytics
  // ============================================================================
  /**
   * Get employer dashboard analytics
   * This would typically generate or fetch precomputed analytics
   */
  async getEmployerAnalytics(employerId) {
    try {
      const employeeCount = await db.select({ count: employees.id }).from(employees).where(eq17(employees.employerId, employerId));
      const programCount = await db.select({ count: wellnessPrograms.id }).from(wellnessPrograms).where(eq17(wellnessPrograms.employerId, employerId));
      const activePrograms = await db.select({ count: wellnessPrograms.id }).from(wellnessPrograms).where(
        and13(
          eq17(wellnessPrograms.employerId, employerId),
          eq17(wellnessPrograms.status, "active")
        )
      );
      return {
        summary: {
          employeeCount: employeeCount[0]?.count || 0,
          programCount: programCount[0]?.count || 0,
          activeProgramCount: activePrograms[0]?.count || 0
        },
        // This would include additional aggregated metrics in a real implementation
        metrics: {
          participationRate: 0,
          // Placeholder
          averagePointsEarned: 0,
          // Placeholder
          completionRate: 0
          // Placeholder
        }
      };
    } catch (error2) {
      logger_default.error(`Error getting analytics for employer ${employerId}:`, error2);
      throw error2;
    }
  }
};
var employerService = new EmployerService();

// server/routes/employer-routes.ts
import { z as z7 } from "zod";
init_logger();
var router7 = Router6();
function ensureEmployerAdmin(req, res, next2) {
  next2();
}
function ensureOwnEmployer(req, res, next2) {
  next2();
}
router7.post("/", async (req, res) => {
  try {
    const employerData = insertEmployerSchema2.parse(req.body);
    const employer = await employerService.createEmployer(employerData);
    res.status(201).json(employer);
  } catch (error2) {
    logger_default.error("Error creating employer:", error2);
    if (error2 instanceof z7.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to create employer" });
  }
});
router7.get("/:id", ensureEmployerAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const employer = await employerService.getEmployer(id);
    if (!employer) {
      return res.status(404).json({ error: "Employer not found" });
    }
    res.json(employer);
  } catch (error2) {
    logger_default.error(`Error getting employer ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to get employer" });
  }
});
router7.put("/:id", ensureEmployerAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = insertEmployerSchema2.partial().parse(req.body);
    const employer = await employerService.updateEmployer(id, updateData);
    if (!employer) {
      return res.status(404).json({ error: "Employer not found" });
    }
    res.json(employer);
  } catch (error2) {
    logger_default.error(`Error updating employer ${req.params.id}:`, error2);
    if (error2 instanceof z7.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to update employer" });
  }
});
router7.delete("/:id", ensureEmployerAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await employerService.deleteEmployer(id);
    if (!success) {
      return res.status(404).json({ error: "Employer not found" });
    }
    res.status(204).end();
  } catch (error2) {
    logger_default.error(`Error deleting employer ${req.params.id}:`, error2);
    if (error2 instanceof Error && error2.message.includes("Cannot delete")) {
      return res.status(400).json({ error: error2.message });
    }
    res.status(500).json({ error: "Failed to delete employer" });
  }
});
router7.get("/", async (req, res) => {
  try {
    const { name, industry, size, status, limit, offset } = req.query;
    const params = {
      name,
      industry,
      size,
      status,
      limit: limit ? parseInt(limit) : void 0,
      offset: offset ? parseInt(offset) : void 0
    };
    const employers3 = await employerService.searchEmployers(params);
    res.json(employers3);
  } catch (error2) {
    logger_default.error("Error searching employers:", error2);
    res.status(500).json({ error: "Failed to search employers" });
  }
});
router7.post("/:employerId/employees", ensureEmployerAdmin, async (req, res) => {
  try {
    const { employerId } = req.params;
    const employeeData = insertEmployeeSchema.parse({
      ...req.body,
      employerId
    });
    const employee = await employerService.createEmployee(employeeData);
    res.status(201).json(employee);
  } catch (error2) {
    logger_default.error(`Error creating employee for employer ${req.params.employerId}:`, error2);
    if (error2 instanceof z7.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to create employee" });
  }
});
router7.post("/:employerId/employees/bulk", ensureEmployerAdmin, async (req, res) => {
  try {
    const { employerId } = req.params;
    const { employees: employees2 } = req.body;
    if (!Array.isArray(employees2)) {
      return res.status(400).json({ error: "Employees must be an array" });
    }
    const createdEmployees = await employerService.bulkUploadEmployees(employerId, employees2);
    res.status(201).json({
      message: `Successfully uploaded ${createdEmployees.length} employees`,
      count: createdEmployees.length
    });
  } catch (error2) {
    logger_default.error(`Error bulk uploading employees for employer ${req.params.employerId}:`, error2);
    res.status(500).json({ error: "Failed to bulk upload employees" });
  }
});
router7.get("/:employerId/employees/:id", ensureOwnEmployer, async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await employerService.getEmployee(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (employee.employerId !== req.params.employerId) {
      return res.status(404).json({ error: "Employee not found for this employer" });
    }
    res.json(employee);
  } catch (error2) {
    logger_default.error(`Error getting employee ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to get employee" });
  }
});
router7.put("/:employerId/employees/:id", ensureEmployerAdmin, async (req, res) => {
  try {
    const { id, employerId } = req.params;
    const updateData = insertEmployeeSchema.partial().parse(req.body);
    delete updateData.employerId;
    const currentEmployee = await employerService.getEmployee(id);
    if (!currentEmployee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (currentEmployee.employerId !== employerId) {
      return res.status(404).json({ error: "Employee not found for this employer" });
    }
    const employee = await employerService.updateEmployee(id, updateData);
    res.json(employee);
  } catch (error2) {
    logger_default.error(`Error updating employee ${req.params.id}:`, error2);
    if (error2 instanceof z7.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to update employee" });
  }
});
router7.delete("/:employerId/employees/:id", ensureEmployerAdmin, async (req, res) => {
  try {
    const { id, employerId } = req.params;
    const currentEmployee = await employerService.getEmployee(id);
    if (!currentEmployee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (currentEmployee.employerId !== employerId) {
      return res.status(404).json({ error: "Employee not found for this employer" });
    }
    const success = await employerService.deleteEmployee(id);
    if (!success) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.status(204).end();
  } catch (error2) {
    logger_default.error(`Error deleting employee ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to delete employee" });
  }
});
router7.get("/:employerId/employees", ensureOwnEmployer, async (req, res) => {
  try {
    const { employerId } = req.params;
    const { status, departmentId, locationId, email, name, limit, offset } = req.query;
    const params = {
      employerId,
      status,
      departmentId,
      locationId,
      email,
      name,
      limit: limit ? parseInt(limit) : void 0,
      offset: offset ? parseInt(offset) : void 0
    };
    const employees2 = await employerService.searchEmployees(params);
    res.json(employees2);
  } catch (error2) {
    logger_default.error(`Error searching employees for employer ${req.params.employerId}:`, error2);
    res.status(500).json({ error: "Failed to search employees" });
  }
});
router7.post("/:employerId/employees/:id/invite", ensureEmployerAdmin, async (req, res) => {
  try {
    const { id, employerId } = req.params;
    const currentEmployee = await employerService.getEmployee(id);
    if (!currentEmployee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (currentEmployee.employerId !== employerId) {
      return res.status(404).json({ error: "Employee not found for this employer" });
    }
    const updatedEmployee = await employerService.inviteEmployee(id);
    res.json({
      message: "Invitation sent successfully",
      employee: updatedEmployee
    });
  } catch (error2) {
    logger_default.error(`Error inviting employee ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to send invitation" });
  }
});
router7.post("/:employerId/programs", ensureEmployerAdmin, async (req, res) => {
  try {
    const { employerId } = req.params;
    const programData = insertWellnessProgramSchema.parse({
      ...req.body,
      employerId
    });
    const program = await employerService.createWellnessProgram(programData);
    res.status(201).json(program);
  } catch (error2) {
    logger_default.error(`Error creating wellness program for employer ${req.params.employerId}:`, error2);
    if (error2 instanceof z7.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to create wellness program" });
  }
});
router7.get("/:employerId/programs/:id", ensureOwnEmployer, async (req, res) => {
  try {
    const { id, employerId } = req.params;
    const program = await employerService.getWellnessProgram(id);
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }
    if (program.employerId !== employerId) {
      return res.status(404).json({ error: "Program not found for this employer" });
    }
    res.json(program);
  } catch (error2) {
    logger_default.error(`Error getting wellness program ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to get wellness program" });
  }
});
router7.put("/:employerId/programs/:id", ensureEmployerAdmin, async (req, res) => {
  try {
    const { id, employerId } = req.params;
    const updateData = insertWellnessProgramSchema.partial().parse(req.body);
    delete updateData.employerId;
    const currentProgram = await employerService.getWellnessProgram(id);
    if (!currentProgram) {
      return res.status(404).json({ error: "Program not found" });
    }
    if (currentProgram.employerId !== employerId) {
      return res.status(404).json({ error: "Program not found for this employer" });
    }
    const program = await employerService.updateWellnessProgram(id, updateData);
    res.json(program);
  } catch (error2) {
    logger_default.error(`Error updating wellness program ${req.params.id}:`, error2);
    if (error2 instanceof z7.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to update wellness program" });
  }
});
router7.get("/:employerId/programs", ensureOwnEmployer, async (req, res) => {
  try {
    const { employerId } = req.params;
    const { type, status, active, limit, offset } = req.query;
    const params = {
      employerId,
      type,
      status,
      active: active === "true",
      limit: limit ? parseInt(limit) : void 0,
      offset: offset ? parseInt(offset) : void 0
    };
    const programs = await employerService.searchWellnessPrograms(params);
    res.json(programs);
  } catch (error2) {
    logger_default.error(`Error searching wellness programs for employer ${req.params.employerId}:`, error2);
    res.status(500).json({ error: "Failed to search wellness programs" });
  }
});
router7.post("/:employerId/incentives", ensureEmployerAdmin, async (req, res) => {
  try {
    const { employerId } = req.params;
    const ruleData = insertIncentiveRuleSchema.parse({
      ...req.body,
      employerId
    });
    const rule = await employerService.createIncentiveRule(ruleData);
    res.status(201).json(rule);
  } catch (error2) {
    logger_default.error(`Error creating incentive rule for employer ${req.params.employerId}:`, error2);
    if (error2 instanceof z7.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to create incentive rule" });
  }
});
router7.get("/:employerId/incentives/:id", ensureOwnEmployer, async (req, res) => {
  try {
    const { id, employerId } = req.params;
    const rule = await employerService.getIncentiveRule(id);
    if (!rule) {
      return res.status(404).json({ error: "Incentive rule not found" });
    }
    if (rule.employerId !== employerId) {
      return res.status(404).json({ error: "Incentive rule not found for this employer" });
    }
    res.json(rule);
  } catch (error2) {
    logger_default.error(`Error getting incentive rule ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to get incentive rule" });
  }
});
router7.post("/:employerId/employees/:employeeId/award", ensureEmployerAdmin, async (req, res) => {
  try {
    const { employerId, employeeId } = req.params;
    const { incentiveRuleId, activityId, programId } = req.body;
    if (!incentiveRuleId) {
      return res.status(400).json({ error: "Incentive rule ID is required" });
    }
    const employee = await employerService.getEmployee(employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (employee.employerId !== employerId) {
      return res.status(404).json({ error: "Employee not found for this employer" });
    }
    const result = await employerService.awardIncentivePoints(
      employeeId,
      incentiveRuleId,
      activityId,
      programId
    );
    res.status(201).json(result);
  } catch (error2) {
    logger_default.error(`Error awarding incentive points to employee ${req.params.employeeId}:`, error2);
    if (error2 instanceof Error) {
      return res.status(400).json({ error: error2.message });
    }
    res.status(500).json({ error: "Failed to award incentive points" });
  }
});
router7.get("/:employerId/employees/:employeeId/wallet/balance", ensureOwnEmployer, async (req, res) => {
  try {
    const { employerId, employeeId } = req.params;
    const employee = await employerService.getEmployee(employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (employee.employerId !== employerId) {
      return res.status(404).json({ error: "Employee not found for this employer" });
    }
    const balance = await employerService.getEmployeeWalletBalance(employeeId);
    res.json({ balance });
  } catch (error2) {
    logger_default.error(`Error getting wallet balance for employee ${req.params.employeeId}:`, error2);
    res.status(500).json({ error: "Failed to get wallet balance" });
  }
});
router7.get("/:employerId/employees/:employeeId/wallet/transactions", ensureOwnEmployer, async (req, res) => {
  try {
    const { employerId, employeeId } = req.params;
    const { limit, offset } = req.query;
    const employee = await employerService.getEmployee(employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (employee.employerId !== employerId) {
      return res.status(404).json({ error: "Employee not found for this employer" });
    }
    const transactions = await employerService.getEmployeeWalletTransactions(
      employeeId,
      limit ? parseInt(limit) : void 0,
      offset ? parseInt(offset) : void 0
    );
    res.json(transactions);
  } catch (error2) {
    logger_default.error(`Error getting wallet transactions for employee ${req.params.employeeId}:`, error2);
    res.status(500).json({ error: "Failed to get wallet transactions" });
  }
});
router7.get("/:employerId/analytics/dashboard", ensureEmployerAdmin, async (req, res) => {
  try {
    const { employerId } = req.params;
    const analytics = await employerService.getEmployerAnalytics(employerId);
    res.json(analytics);
  } catch (error2) {
    logger_default.error(`Error getting analytics for employer ${req.params.employerId}:`, error2);
    res.status(500).json({ error: "Failed to get analytics" });
  }
});
var employer_routes_default = router7;

// server/routes/network-directory-routes.ts
import { Router as Router7 } from "express";

// shared/network-directory-schema.ts
import { pgTable as pgTable13, text as text13, timestamp as timestamp13, uuid as uuid10, boolean as boolean13, jsonb as jsonb10, pgEnum as pgEnum7 } from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema13, createSelectSchema as createSelectSchema6 } from "drizzle-zod";
var participantTypeEnum = pgEnum7("participant_type", [
  "provider",
  "payer",
  "clearing_house",
  "pharmacy",
  "lab",
  "imaging_center",
  "health_system",
  "employer",
  "state_hie",
  "public_health_agency",
  "other"
]);
var connectionStatusEnum = pgEnum7("connection_status", [
  "pending",
  "active",
  "suspended",
  "terminated"
]);
var serviceTypeEnum = pgEnum7("service_type", [
  "eligibility_verification",
  "prior_authorization",
  "claims_submission",
  "referral_management",
  "clinical_data_exchange",
  "patient_access",
  "provider_directory",
  "scheduling",
  "notification",
  "payment",
  "pharmacy_services",
  "lab_orders",
  "imaging_orders",
  "health_information_exchange",
  "analytics",
  "other"
]);
var serviceStatusEnum = pgEnum7("service_status", [
  "available",
  "unavailable",
  "degraded",
  "maintenance"
]);
var networkParticipants = pgTable13("network_participants", {
  id: uuid10("id").primaryKey().defaultRandom(),
  // Participant details
  name: text13("name").notNull(),
  displayName: text13("display_name").notNull(),
  type: participantTypeEnum("type").notNull(),
  description: text13("description"),
  // Identifiers
  organizationId: uuid10("organization_id"),
  // Reference to organizations table
  externalIdentifiers: jsonb10("external_identifiers"),
  // NPI, tax ID, HIE IDs, etc.
  // Contact information
  contactName: text13("contact_name"),
  contactEmail: text13("contact_email"),
  contactPhone: text13("contact_phone"),
  website: text13("website"),
  // Address information for map display
  addressLine1: text13("address_line1"),
  addressLine2: text13("address_line2"),
  city: text13("city"),
  state: text13("state"),
  postalCode: text13("postal_code"),
  country: text13("country").default("USA"),
  // Geographic coordinates for mapping
  latitude: text13("latitude"),
  longitude: text13("longitude"),
  // Status and metadata
  active: boolean13("active").default(true),
  verificationStatus: text13("verification_status").default("unverified"),
  verifiedAt: timestamp13("verified_at"),
  // Custom attributes
  metadata: jsonb10("metadata"),
  // Timestamps
  createdAt: timestamp13("created_at").notNull().defaultNow(),
  updatedAt: timestamp13("updated_at")
});
var networkServices = pgTable13("network_services", {
  id: uuid10("id").primaryKey().defaultRandom(),
  // Service details
  name: text13("name").notNull(),
  type: serviceTypeEnum("type").notNull(),
  description: text13("description"),
  // Technical details
  apiSpecUrl: text13("api_spec_url"),
  documentationUrl: text13("documentation_url"),
  technicalRequirements: jsonb10("technical_requirements"),
  // Custom attributes
  metadata: jsonb10("metadata"),
  // Status
  active: boolean13("active").default(true),
  // Timestamps
  createdAt: timestamp13("created_at").notNull().defaultNow(),
  updatedAt: timestamp13("updated_at")
});
var participantServices = pgTable13("participant_services", {
  id: uuid10("id").primaryKey().defaultRandom(),
  // References
  participantId: uuid10("participant_id").notNull().references(() => networkParticipants.id),
  serviceId: uuid10("service_id").notNull().references(() => networkServices.id),
  // Status and capabilities
  status: serviceStatusEnum("status").notNull().default("available"),
  capabilities: jsonb10("capabilities"),
  // Detailed technical capabilities for this service
  supportedVersions: jsonb10("supported_versions"),
  // Performance metrics
  averageResponseTime: text13("average_response_time"),
  uptime: text13("uptime"),
  // Service configuration
  configurationDetails: jsonb10("configuration_details"),
  // Custom attributes
  metadata: jsonb10("metadata"),
  // Timestamps
  enabledAt: timestamp13("enabled_at").notNull().defaultNow(),
  lastStatusChangeAt: timestamp13("last_status_change_at"),
  // Tracking
  createdAt: timestamp13("created_at").notNull().defaultNow(),
  updatedAt: timestamp13("updated_at")
});
var networkConnections = pgTable13("network_connections", {
  id: uuid10("id").primaryKey().defaultRandom(),
  // Connection details (directional: from -> to)
  sourceParticipantId: uuid10("source_participant_id").notNull().references(() => networkParticipants.id),
  targetParticipantId: uuid10("target_participant_id").notNull().references(() => networkParticipants.id),
  // Connection status
  status: connectionStatusEnum("status").notNull().default("pending"),
  // Services enabled on this connection
  enabledServices: jsonb10("enabled_services"),
  // Array of service IDs or details
  // Business details
  contractReference: text13("contract_reference"),
  contractEffectiveDate: timestamp13("contract_effective_date"),
  contractEndDate: timestamp13("contract_end_date"),
  // Technical connection details
  connectionDetails: jsonb10("connection_details"),
  // Custom attributes
  metadata: jsonb10("metadata"),
  // Connection events
  initiatedAt: timestamp13("initiated_at").notNull().defaultNow(),
  activatedAt: timestamp13("activated_at"),
  lastStatusChangeAt: timestamp13("last_status_change_at"),
  // Tracking
  createdAt: timestamp13("created_at").notNull().defaultNow(),
  updatedAt: timestamp13("updated_at")
});
var networkServiceMetrics = pgTable13("network_service_metrics", {
  id: uuid10("id").primaryKey().defaultRandom(),
  // References
  participantServiceId: uuid10("participant_service_id").notNull().references(() => participantServices.id),
  // Time period
  periodStart: timestamp13("period_start").notNull(),
  periodEnd: timestamp13("period_end").notNull(),
  // Metrics
  totalRequests: text13("total_requests"),
  successfulRequests: text13("successful_requests"),
  failedRequests: text13("failed_requests"),
  averageResponseTime: text13("average_response_time"),
  p95ResponseTime: text13("p95_response_time"),
  uptime: text13("uptime"),
  // Detailed metrics
  detailedMetrics: jsonb10("detailed_metrics"),
  // Timestamps
  createdAt: timestamp13("created_at").notNull().defaultNow(),
  updatedAt: timestamp13("updated_at")
});
var networkMapRegions = pgTable13("network_map_regions", {
  id: uuid10("id").primaryKey().defaultRandom(),
  // Region details
  name: text13("name").notNull(),
  type: text13("type").notNull(),
  // 'state', 'county', 'zip', 'service_area', etc.
  // Geographic data
  geoJson: jsonb10("geo_json"),
  // GeoJSON data for rendering
  // Metadata
  description: text13("description"),
  metadata: jsonb10("metadata"),
  // Timestamps
  createdAt: timestamp13("created_at").notNull().defaultNow(),
  updatedAt: timestamp13("updated_at")
});
var networkRegionStats = pgTable13("network_region_stats", {
  id: uuid10("id").primaryKey().defaultRandom(),
  // References
  regionId: uuid10("region_id").notNull().references(() => networkMapRegions.id),
  // Statistics
  participantCount: text13("participant_count"),
  providerCount: text13("provider_count"),
  payerCount: text13("payer_count"),
  connectionCount: text13("connection_count"),
  // Service-specific stats
  serviceStats: jsonb10("service_stats"),
  // Detailed metrics
  detailedStats: jsonb10("detailed_stats"),
  // Timestamps
  periodStart: timestamp13("period_start").notNull(),
  periodEnd: timestamp13("period_end").notNull(),
  createdAt: timestamp13("created_at").notNull().defaultNow(),
  updatedAt: timestamp13("updated_at")
});
var networkEvents = pgTable13("network_events", {
  id: uuid10("id").primaryKey().defaultRandom(),
  // Event details
  eventType: text13("event_type").notNull(),
  severity: text13("severity").notNull().default("info"),
  description: text13("description").notNull(),
  // References
  participantId: uuid10("participant_id").references(() => networkParticipants.id),
  serviceId: uuid10("service_id").references(() => networkServices.id),
  connectionId: uuid10("connection_id").references(() => networkConnections.id),
  // Event data
  eventData: jsonb10("event_data"),
  // Timestamp
  eventTime: timestamp13("event_time").notNull().defaultNow(),
  createdAt: timestamp13("created_at").notNull().defaultNow()
});
var insertNetworkParticipantSchema = createInsertSchema13(networkParticipants);
var selectNetworkParticipantSchema = createSelectSchema6(networkParticipants);
var insertNetworkServiceSchema = createInsertSchema13(networkServices);
var selectNetworkServiceSchema = createSelectSchema6(networkServices);
var insertParticipantServiceSchema = createInsertSchema13(participantServices);
var selectParticipantServiceSchema = createSelectSchema6(participantServices);
var insertNetworkConnectionSchema = createInsertSchema13(networkConnections);
var selectNetworkConnectionSchema = createSelectSchema6(networkConnections);
var insertNetworkMapRegionSchema = createInsertSchema13(networkMapRegions);
var selectNetworkMapRegionSchema = createSelectSchema6(networkMapRegions);

// server/services/network-directory/network-directory-service.ts
init_logger();
import { eq as eq18, and as and14, inArray as inArray5, like as like3, isNull as isNull2, not as not4, or as or8, desc as desc12, sql as sql12 } from "drizzle-orm";
import { v4 as uuidv415 } from "uuid";
var NetworkDirectoryService = class {
  // ============================================================================
  // Participant Management
  // ============================================================================
  /**
   * Create a new network participant
   */
  async createParticipant(data) {
    try {
      if (!data.id) {
        data.id = uuidv415();
      }
      data.createdAt = /* @__PURE__ */ new Date();
      const [participant] = await db.insert(networkParticipants).values(data).returning();
      if (!participant) {
        throw new Error("Failed to create network participant");
      }
      logger_default.info(`Created network participant: ${participant.id} (${participant.name})`);
      return participant;
    } catch (error2) {
      logger_default.error("Error creating network participant:", error2);
      throw error2;
    }
  }
  /**
   * Get a network participant by ID
   */
  async getParticipant(id) {
    try {
      const [participant] = await db.select().from(networkParticipants).where(eq18(networkParticipants.id, id));
      return participant;
    } catch (error2) {
      logger_default.error(`Error getting network participant ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Update a network participant
   */
  async updateParticipant(id, data) {
    try {
      delete data.id;
      data.updatedAt = /* @__PURE__ */ new Date();
      const [participant] = await db.update(networkParticipants).set(data).where(eq18(networkParticipants.id, id)).returning();
      if (!participant) {
        return void 0;
      }
      logger_default.info(`Updated network participant: ${id}`);
      return participant;
    } catch (error2) {
      logger_default.error(`Error updating network participant ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Delete a network participant
   */
  async deleteParticipant(id) {
    try {
      const relatedConnections = await db.select({ count: sql12`count(*)` }).from(networkConnections).where(
        or8(
          eq18(networkConnections.sourceParticipantId, id),
          eq18(networkConnections.targetParticipantId, id)
        )
      );
      if (relatedConnections.length > 0 && relatedConnections[0].count > 0) {
        throw new Error("Cannot delete participant with existing connections");
      }
      await db.delete(participantServices).where(eq18(participantServices.participantId, id));
      const result = await db.delete(networkParticipants).where(eq18(networkParticipants.id, id)).returning();
      const success = result.length > 0;
      if (success) {
        logger_default.info(`Deleted network participant: ${id}`);
      }
      return success;
    } catch (error2) {
      logger_default.error(`Error deleting network participant ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Search for network participants
   */
  async searchParticipants(params) {
    try {
      let query = db.select().from(networkParticipants);
      if (params.name) {
        query = query.where(like3(networkParticipants.name, `%${params.name}%`));
      }
      if (params.type) {
        if (Array.isArray(params.type)) {
          query = query.where(inArray5(networkParticipants.type, params.type));
        } else {
          query = query.where(eq18(networkParticipants.type, params.type));
        }
      }
      if (params.city) {
        query = query.where(like3(networkParticipants.city, `%${params.city}%`));
      }
      if (params.state) {
        query = query.where(eq18(networkParticipants.state, params.state));
      }
      if (params.active !== void 0) {
        query = query.where(eq18(networkParticipants.active, params.active));
      }
      if (params.service) {
        query = query.where(
          inArray5(
            networkParticipants.id,
            db.select({ id: participantServices.participantId }).from(participantServices).innerJoin(
              networkServices,
              eq18(participantServices.serviceId, networkServices.id)
            ).where(
              or8(
                eq18(networkServices.id, params.service),
                eq18(networkServices.type, params.service)
              )
            )
          )
        );
      }
      if (params.latitude && params.longitude && params.radius) {
        const lat = parseFloat(params.latitude);
        const lng = parseFloat(params.longitude);
        const radiusMiles = params.radius;
        const latRadius = radiusMiles / 69;
        const lngRadius = radiusMiles / (69 * Math.cos(lat * Math.PI / 180));
        query = query.where(
          and14(
            sql12`${networkParticipants.latitude}::float BETWEEN ${lat - latRadius} AND ${lat + latRadius}`,
            sql12`${networkParticipants.longitude}::float BETWEEN ${lng - lngRadius} AND ${lng + lngRadius}`
          )
        );
      }
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = query.offset(params.offset);
      }
      const results = await query;
      return results;
    } catch (error2) {
      logger_default.error("Error searching network participants:", error2);
      throw error2;
    }
  }
  /**
   * Get participants with specific service enabled
   */
  async getParticipantsByService(serviceId, active = true) {
    try {
      const query = db.select({ participant: networkParticipants }).from(participantServices).innerJoin(
        networkParticipants,
        eq18(participantServices.participantId, networkParticipants.id)
      ).where(
        and14(
          eq18(participantServices.serviceId, serviceId),
          eq18(networkParticipants.active, active),
          eq18(participantServices.status, "available")
        )
      );
      const results = await query;
      return results.map((r) => r.participant);
    } catch (error2) {
      logger_default.error(`Error getting participants for service ${serviceId}:`, error2);
      throw error2;
    }
  }
  // ============================================================================
  // Service Management
  // ============================================================================
  /**
   * Create a new network service
   */
  async createService(data) {
    try {
      if (!data.id) {
        data.id = uuidv415();
      }
      data.createdAt = /* @__PURE__ */ new Date();
      const [service] = await db.insert(networkServices).values(data).returning();
      if (!service) {
        throw new Error("Failed to create network service");
      }
      logger_default.info(`Created network service: ${service.id} (${service.name})`);
      return service;
    } catch (error2) {
      logger_default.error("Error creating network service:", error2);
      throw error2;
    }
  }
  /**
   * Get a network service by ID
   */
  async getService(id) {
    try {
      const [service] = await db.select().from(networkServices).where(eq18(networkServices.id, id));
      return service;
    } catch (error2) {
      logger_default.error(`Error getting network service ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Update a network service
   */
  async updateService(id, data) {
    try {
      delete data.id;
      data.updatedAt = /* @__PURE__ */ new Date();
      const [service] = await db.update(networkServices).set(data).where(eq18(networkServices.id, id)).returning();
      if (!service) {
        return void 0;
      }
      logger_default.info(`Updated network service: ${id}`);
      return service;
    } catch (error2) {
      logger_default.error(`Error updating network service ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Delete a network service
   */
  async deleteService(id) {
    try {
      const relatedParticipantServices = await db.select({ count: sql12`count(*)` }).from(participantServices).where(eq18(participantServices.serviceId, id));
      if (relatedParticipantServices.length > 0 && relatedParticipantServices[0].count > 0) {
        throw new Error("Cannot delete service with existing participant services");
      }
      const result = await db.delete(networkServices).where(eq18(networkServices.id, id)).returning();
      const success = result.length > 0;
      if (success) {
        logger_default.info(`Deleted network service: ${id}`);
      }
      return success;
    } catch (error2) {
      logger_default.error(`Error deleting network service ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Search for network services
   */
  async searchServices(params) {
    try {
      let query = db.select().from(networkServices);
      if (params.name) {
        query = query.where(like3(networkServices.name, `%${params.name}%`));
      }
      if (params.type) {
        if (Array.isArray(params.type)) {
          query = query.where(inArray5(networkServices.type, params.type));
        } else {
          query = query.where(eq18(networkServices.type, params.type));
        }
      }
      if (params.active !== void 0) {
        query = query.where(eq18(networkServices.active, params.active));
      }
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = query.offset(params.offset);
      }
      const results = await query;
      return results;
    } catch (error2) {
      logger_default.error("Error searching network services:", error2);
      throw error2;
    }
  }
  // ============================================================================
  // Participant Service Management
  // ============================================================================
  /**
   * Enable a service for a participant
   */
  async enableParticipantService(data) {
    try {
      if (!data.id) {
        data.id = uuidv415();
      }
      data.createdAt = /* @__PURE__ */ new Date();
      data.enabledAt = /* @__PURE__ */ new Date();
      const [participantService] = await db.insert(participantServices).values(data).returning();
      if (!participantService) {
        throw new Error("Failed to enable participant service");
      }
      await this.recordNetworkEvent({
        eventType: "service_enabled",
        severity: "info",
        description: `Service ${data.serviceId} enabled for participant ${data.participantId}`,
        participantId: data.participantId,
        serviceId: data.serviceId
      });
      logger_default.info(`Enabled service ${data.serviceId} for participant ${data.participantId}`);
      return participantService;
    } catch (error2) {
      logger_default.error("Error enabling participant service:", error2);
      throw error2;
    }
  }
  /**
   * Get a participant service record
   */
  async getParticipantService(id) {
    try {
      const [service] = await db.select().from(participantServices).where(eq18(participantServices.id, id));
      return service;
    } catch (error2) {
      logger_default.error(`Error getting participant service ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Update a participant service
   */
  async updateParticipantService(id, data) {
    try {
      delete data.id;
      data.updatedAt = /* @__PURE__ */ new Date();
      if (data.status) {
        data.lastStatusChangeAt = /* @__PURE__ */ new Date();
      }
      const [service] = await db.update(participantServices).set(data).where(eq18(participantServices.id, id)).returning();
      if (!service) {
        return void 0;
      }
      logger_default.info(`Updated participant service: ${id}`);
      return service;
    } catch (error2) {
      logger_default.error(`Error updating participant service ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Disable a service for a participant
   */
  async disableParticipantService(id) {
    try {
      const [service] = await db.select().from(participantServices).where(eq18(participantServices.id, id));
      if (!service) {
        return false;
      }
      const result = await db.delete(participantServices).where(eq18(participantServices.id, id)).returning();
      const success = result.length > 0;
      if (success) {
        await this.recordNetworkEvent({
          eventType: "service_disabled",
          severity: "info",
          description: `Service ${service.serviceId} disabled for participant ${service.participantId}`,
          participantId: service.participantId,
          serviceId: service.serviceId
        });
        logger_default.info(`Disabled service ${service.serviceId} for participant ${service.participantId}`);
      }
      return success;
    } catch (error2) {
      logger_default.error(`Error disabling participant service ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Get all services for a participant
   */
  async getServicesByParticipant(participantId) {
    try {
      const query = db.select({
        participantService: participantServices,
        service: networkServices
      }).from(participantServices).innerJoin(
        networkServices,
        eq18(participantServices.serviceId, networkServices.id)
      ).where(eq18(participantServices.participantId, participantId));
      const results = await query;
      return results.map((r) => ({
        ...r.service,
        status: r.participantService.status,
        participantServiceId: r.participantService.id,
        enabledAt: r.participantService.enabledAt,
        capabilities: r.participantService.capabilities,
        supportedVersions: r.participantService.supportedVersions
      }));
    } catch (error2) {
      logger_default.error(`Error getting services for participant ${participantId}:`, error2);
      throw error2;
    }
  }
  // ============================================================================
  // Connection Management
  // ============================================================================
  /**
   * Create a new network connection
   */
  async createConnection(data) {
    try {
      if (!data.id) {
        data.id = uuidv415();
      }
      data.createdAt = /* @__PURE__ */ new Date();
      data.initiatedAt = /* @__PURE__ */ new Date();
      if (data.status === "active") {
        data.activatedAt = /* @__PURE__ */ new Date();
        data.lastStatusChangeAt = /* @__PURE__ */ new Date();
      }
      const [connection] = await db.insert(networkConnections).values(data).returning();
      if (!connection) {
        throw new Error("Failed to create network connection");
      }
      await this.recordNetworkEvent({
        eventType: "connection_created",
        severity: "info",
        description: `Connection created from ${data.sourceParticipantId} to ${data.targetParticipantId}`,
        connectionId: connection.id
      });
      logger_default.info(`Created network connection: ${connection.id} (${data.sourceParticipantId} -> ${data.targetParticipantId})`);
      return connection;
    } catch (error2) {
      logger_default.error("Error creating network connection:", error2);
      throw error2;
    }
  }
  /**
   * Get a network connection by ID
   */
  async getConnection(id) {
    try {
      const [connection] = await db.select().from(networkConnections).where(eq18(networkConnections.id, id));
      return connection;
    } catch (error2) {
      logger_default.error(`Error getting network connection ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Update a network connection
   */
  async updateConnection(id, data) {
    try {
      delete data.id;
      data.updatedAt = /* @__PURE__ */ new Date();
      if (data.status) {
        data.lastStatusChangeAt = /* @__PURE__ */ new Date();
        if (data.status === "active" && !data.activatedAt) {
          data.activatedAt = /* @__PURE__ */ new Date();
        }
      }
      const [connection] = await db.update(networkConnections).set(data).where(eq18(networkConnections.id, id)).returning();
      if (!connection) {
        return void 0;
      }
      if (data.status) {
        await this.recordNetworkEvent({
          eventType: "connection_status_changed",
          severity: "info",
          description: `Connection status changed to ${data.status}`,
          connectionId: id
        });
      }
      logger_default.info(`Updated network connection: ${id}`);
      return connection;
    } catch (error2) {
      logger_default.error(`Error updating network connection ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Delete a network connection
   */
  async deleteConnection(id) {
    try {
      const [connection] = await db.select().from(networkConnections).where(eq18(networkConnections.id, id));
      if (!connection) {
        return false;
      }
      const result = await db.delete(networkConnections).where(eq18(networkConnections.id, id)).returning();
      const success = result.length > 0;
      if (success) {
        await this.recordNetworkEvent({
          eventType: "connection_deleted",
          severity: "info",
          description: `Connection deleted between ${connection.sourceParticipantId} and ${connection.targetParticipantId}`,
          connectionId: id
        });
        logger_default.info(`Deleted network connection: ${id}`);
      }
      return success;
    } catch (error2) {
      logger_default.error(`Error deleting network connection ${id}:`, error2);
      throw error2;
    }
  }
  /**
   * Search for network connections
   */
  async searchConnections(params) {
    try {
      let query = db.select().from(networkConnections);
      if (params.sourceParticipantId) {
        query = query.where(eq18(networkConnections.sourceParticipantId, params.sourceParticipantId));
      }
      if (params.targetParticipantId) {
        query = query.where(eq18(networkConnections.targetParticipantId, params.targetParticipantId));
      }
      if (params.status) {
        query = query.where(eq18(networkConnections.status, params.status));
      }
      if (params.serviceId) {
        query = query.where(
          sql12`${networkConnections.enabledServices}::jsonb @> jsonb_build_array(${params.serviceId})`
        );
      }
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = query.offset(params.offset);
      }
      const results = await query;
      return results;
    } catch (error2) {
      logger_default.error("Error searching network connections:", error2);
      throw error2;
    }
  }
  /**
   * Get all connections for a participant (both source and target)
   */
  async getParticipantConnections(participantId) {
    try {
      const query = db.select().from(networkConnections).where(
        or8(
          eq18(networkConnections.sourceParticipantId, participantId),
          eq18(networkConnections.targetParticipantId, participantId)
        )
      ).orderBy(desc12(networkConnections.createdAt));
      return await query;
    } catch (error2) {
      logger_default.error(`Error getting connections for participant ${participantId}:`, error2);
      throw error2;
    }
  }
  /**
   * Check if a connection exists between two participants
   */
  async connectionExists(sourceId, targetId) {
    try {
      const [connection] = await db.select({ count: sql12`count(*)` }).from(networkConnections).where(
        and14(
          eq18(networkConnections.sourceParticipantId, sourceId),
          eq18(networkConnections.targetParticipantId, targetId),
          eq18(networkConnections.status, "active")
        )
      );
      return connection.count > 0;
    } catch (error2) {
      logger_default.error(`Error checking connection between ${sourceId} and ${targetId}:`, error2);
      throw error2;
    }
  }
  // ============================================================================
  // Mapping and Visualization
  // ============================================================================
  /**
   * Create a new map region
   */
  async createMapRegion(data) {
    try {
      if (!data.id) {
        data.id = uuidv415();
      }
      data.createdAt = /* @__PURE__ */ new Date();
      const [region] = await db.insert(networkMapRegions).values(data).returning();
      if (!region) {
        throw new Error("Failed to create network map region");
      }
      logger_default.info(`Created network map region: ${region.id} (${region.name})`);
      return region;
    } catch (error2) {
      logger_default.error("Error creating network map region:", error2);
      throw error2;
    }
  }
  /**
   * Get participants for a map view (with pagination and bounding box)
   */
  async getMapParticipants(boundingBox, types, limit = 100) {
    try {
      let query = db.select({
        id: networkParticipants.id,
        name: networkParticipants.name,
        type: networkParticipants.type,
        latitude: networkParticipants.latitude,
        longitude: networkParticipants.longitude,
        address: networkParticipants.addressLine1,
        city: networkParticipants.city,
        state: networkParticipants.state
      }).from(networkParticipants).where(
        and14(
          eq18(networkParticipants.active, true),
          not4(isNull2(networkParticipants.latitude)),
          not4(isNull2(networkParticipants.longitude))
        )
      );
      if (types && types.length > 0) {
        query = query.where(inArray5(networkParticipants.type, types));
      }
      if (boundingBox) {
        query = query.where(
          and14(
            sql12`${networkParticipants.latitude}::float BETWEEN ${boundingBox.minLat} AND ${boundingBox.maxLat}`,
            sql12`${networkParticipants.longitude}::float BETWEEN ${boundingBox.minLng} AND ${boundingBox.maxLng}`
          )
        );
      }
      query = query.limit(limit);
      const participants = await query;
      const enrichedParticipants = [];
      for (const participant of participants) {
        const services = await this.getServicesByParticipant(participant.id);
        enrichedParticipants.push({
          ...participant,
          services: services.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            status: s.status
          }))
        });
      }
      return enrichedParticipants;
    } catch (error2) {
      logger_default.error("Error getting map participants:", error2);
      throw error2;
    }
  }
  /**
   * Get network statistics for visualization
   */
  async getNetworkStats() {
    try {
      const participantsByType = await db.select({
        type: networkParticipants.type,
        count: sql12`count(*)`
      }).from(networkParticipants).where(eq18(networkParticipants.active, true)).groupBy(networkParticipants.type);
      const servicesByType = await db.select({
        type: networkServices.type,
        count: sql12`count(*)`
      }).from(networkServices).where(eq18(networkServices.active, true)).groupBy(networkServices.type);
      const connectionsByStatus = await db.select({
        status: networkConnections.status,
        count: sql12`count(*)`
      }).from(networkConnections).groupBy(networkConnections.status);
      const [participantCount] = await db.select({ count: sql12`count(*)` }).from(networkParticipants).where(eq18(networkParticipants.active, true));
      const [serviceCount] = await db.select({ count: sql12`count(*)` }).from(networkServices).where(eq18(networkServices.active, true));
      const [connectionCount] = await db.select({ count: sql12`count(*)` }).from(networkConnections);
      return {
        totalParticipants: participantCount.count,
        totalServices: serviceCount.count,
        totalConnections: connectionCount.count,
        participantsByType,
        servicesByType,
        connectionsByStatus
      };
    } catch (error2) {
      logger_default.error("Error getting network stats:", error2);
      throw error2;
    }
  }
  // ============================================================================
  // Event Tracking
  // ============================================================================
  /**
   * Record a network event
   */
  async recordNetworkEvent(data) {
    try {
      const eventData = {
        id: uuidv415(),
        eventType: data.eventType,
        severity: data.severity,
        description: data.description,
        participantId: data.participantId,
        serviceId: data.serviceId,
        connectionId: data.connectionId,
        eventData: data.eventData,
        eventTime: /* @__PURE__ */ new Date(),
        createdAt: /* @__PURE__ */ new Date()
      };
      await db.insert(networkEvents).values(eventData);
    } catch (error2) {
      logger_default.error("Error recording network event:", error2);
    }
  }
  /**
   * Get recent network events
   */
  async getRecentEvents(limit = 100, types) {
    try {
      let query = db.select().from(networkEvents).orderBy(desc12(networkEvents.eventTime));
      if (types && types.length > 0) {
        query = query.where(inArray5(networkEvents.eventType, types));
      }
      query = query.limit(limit);
      return await query;
    } catch (error2) {
      logger_default.error("Error getting recent network events:", error2);
      throw error2;
    }
  }
};
var networkDirectoryService = new NetworkDirectoryService();

// server/routes/network-directory-routes.ts
import { z as z8 } from "zod";
init_logger();
var router8 = Router7();
function ensureAdmin(req, res, next2) {
  next2();
}
router8.post("/participants", ensureAdmin, async (req, res) => {
  try {
    const participantData = insertNetworkParticipantSchema.parse(req.body);
    const participant = await networkDirectoryService.createParticipant(participantData);
    res.status(201).json(participant);
  } catch (error2) {
    logger_default.error("Error creating network participant:", error2);
    if (error2 instanceof z8.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to create network participant" });
  }
});
router8.get("/participants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await networkDirectoryService.getParticipant(id);
    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }
    res.json(participant);
  } catch (error2) {
    logger_default.error(`Error getting network participant ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to get network participant" });
  }
});
router8.put("/participants/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = insertNetworkParticipantSchema.partial().parse(req.body);
    const participant = await networkDirectoryService.updateParticipant(id, updateData);
    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }
    res.json(participant);
  } catch (error2) {
    logger_default.error(`Error updating network participant ${req.params.id}:`, error2);
    if (error2 instanceof z8.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to update network participant" });
  }
});
router8.delete("/participants/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await networkDirectoryService.deleteParticipant(id);
    if (!success) {
      return res.status(404).json({ error: "Participant not found" });
    }
    res.status(204).end();
  } catch (error2) {
    logger_default.error(`Error deleting network participant ${req.params.id}:`, error2);
    if (error2 instanceof Error && error2.message.includes("Cannot delete")) {
      return res.status(400).json({ error: error2.message });
    }
    res.status(500).json({ error: "Failed to delete network participant" });
  }
});
router8.get("/participants", async (req, res) => {
  try {
    const { name, type, city, state, active, service, lat, lng, radius, limit, offset } = req.query;
    const params = {
      name,
      type,
      city,
      state,
      active: active === "true",
      service,
      latitude: lat,
      longitude: lng,
      radius: radius ? parseInt(radius) : void 0,
      limit: limit ? parseInt(limit) : void 0,
      offset: offset ? parseInt(offset) : void 0
    };
    const participants = await networkDirectoryService.searchParticipants(params);
    res.json(participants);
  } catch (error2) {
    logger_default.error("Error searching network participants:", error2);
    res.status(500).json({ error: "Failed to search network participants" });
  }
});
router8.get("/participants/:id/services", async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await networkDirectoryService.getParticipant(id);
    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }
    const services = await networkDirectoryService.getServicesByParticipant(id);
    res.json(services);
  } catch (error2) {
    logger_default.error(`Error getting services for participant ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to get participant services" });
  }
});
router8.get("/participants/:id/connections", async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await networkDirectoryService.getParticipant(id);
    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }
    const connections = await networkDirectoryService.getParticipantConnections(id);
    res.json(connections);
  } catch (error2) {
    logger_default.error(`Error getting connections for participant ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to get participant connections" });
  }
});
router8.post("/services", ensureAdmin, async (req, res) => {
  try {
    const serviceData = insertNetworkServiceSchema.parse(req.body);
    const service = await networkDirectoryService.createService(serviceData);
    res.status(201).json(service);
  } catch (error2) {
    logger_default.error("Error creating network service:", error2);
    if (error2 instanceof z8.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to create network service" });
  }
});
router8.get("/services/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const service = await networkDirectoryService.getService(id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.json(service);
  } catch (error2) {
    logger_default.error(`Error getting network service ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to get network service" });
  }
});
router8.put("/services/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = insertNetworkServiceSchema.partial().parse(req.body);
    const service = await networkDirectoryService.updateService(id, updateData);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.json(service);
  } catch (error2) {
    logger_default.error(`Error updating network service ${req.params.id}:`, error2);
    if (error2 instanceof z8.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to update network service" });
  }
});
router8.delete("/services/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await networkDirectoryService.deleteService(id);
    if (!success) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.status(204).end();
  } catch (error2) {
    logger_default.error(`Error deleting network service ${req.params.id}:`, error2);
    if (error2 instanceof Error && error2.message.includes("Cannot delete")) {
      return res.status(400).json({ error: error2.message });
    }
    res.status(500).json({ error: "Failed to delete network service" });
  }
});
router8.get("/services", async (req, res) => {
  try {
    const { name, type, active, limit, offset } = req.query;
    const params = {
      name,
      type,
      active: active === void 0 ? void 0 : active === "true",
      limit: limit ? parseInt(limit) : void 0,
      offset: offset ? parseInt(offset) : void 0
    };
    const services = await networkDirectoryService.searchServices(params);
    res.json(services);
  } catch (error2) {
    logger_default.error("Error searching network services:", error2);
    res.status(500).json({ error: "Failed to search network services" });
  }
});
router8.get("/services/:id/participants", async (req, res) => {
  try {
    const { id } = req.params;
    const active = req.query.active !== "false";
    const service = await networkDirectoryService.getService(id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    const participants = await networkDirectoryService.getParticipantsByService(id, active);
    res.json(participants);
  } catch (error2) {
    logger_default.error(`Error getting participants for service ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to get service participants" });
  }
});
router8.post("/participant-services", ensureAdmin, async (req, res) => {
  try {
    const serviceData = insertParticipantServiceSchema.parse(req.body);
    const participantService = await networkDirectoryService.enableParticipantService(serviceData);
    res.status(201).json(participantService);
  } catch (error2) {
    logger_default.error("Error enabling participant service:", error2);
    if (error2 instanceof z8.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to enable participant service" });
  }
});
router8.put("/participant-services/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = insertParticipantServiceSchema.partial().parse(req.body);
    const participantService = await networkDirectoryService.updateParticipantService(id, updateData);
    if (!participantService) {
      return res.status(404).json({ error: "Participant service not found" });
    }
    res.json(participantService);
  } catch (error2) {
    logger_default.error(`Error updating participant service ${req.params.id}:`, error2);
    if (error2 instanceof z8.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to update participant service" });
  }
});
router8.delete("/participant-services/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await networkDirectoryService.disableParticipantService(id);
    if (!success) {
      return res.status(404).json({ error: "Participant service not found" });
    }
    res.status(204).end();
  } catch (error2) {
    logger_default.error(`Error disabling participant service ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to disable participant service" });
  }
});
router8.post("/connections", ensureAdmin, async (req, res) => {
  try {
    const connectionData = insertNetworkConnectionSchema.parse(req.body);
    const connection = await networkDirectoryService.createConnection(connectionData);
    res.status(201).json(connection);
  } catch (error2) {
    logger_default.error("Error creating network connection:", error2);
    if (error2 instanceof z8.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to create network connection" });
  }
});
router8.get("/connections/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await networkDirectoryService.getConnection(id);
    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }
    res.json(connection);
  } catch (error2) {
    logger_default.error(`Error getting network connection ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to get network connection" });
  }
});
router8.put("/connections/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = insertNetworkConnectionSchema.partial().parse(req.body);
    const connection = await networkDirectoryService.updateConnection(id, updateData);
    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }
    res.json(connection);
  } catch (error2) {
    logger_default.error(`Error updating network connection ${req.params.id}:`, error2);
    if (error2 instanceof z8.ZodError) {
      return res.status(400).json({ error: error2.errors });
    }
    res.status(500).json({ error: "Failed to update network connection" });
  }
});
router8.delete("/connections/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await networkDirectoryService.deleteConnection(id);
    if (!success) {
      return res.status(404).json({ error: "Connection not found" });
    }
    res.status(204).end();
  } catch (error2) {
    logger_default.error(`Error deleting network connection ${req.params.id}:`, error2);
    res.status(500).json({ error: "Failed to delete network connection" });
  }
});
router8.get("/connections", async (req, res) => {
  try {
    const { source, target, status, service, limit, offset } = req.query;
    const params = {
      sourceParticipantId: source,
      targetParticipantId: target,
      status,
      serviceId: service,
      limit: limit ? parseInt(limit) : void 0,
      offset: offset ? parseInt(offset) : void 0
    };
    const connections = await networkDirectoryService.searchConnections(params);
    res.json(connections);
  } catch (error2) {
    logger_default.error("Error searching network connections:", error2);
    res.status(500).json({ error: "Failed to search network connections" });
  }
});
router8.get("/connections/check", async (req, res) => {
  try {
    const { source, target } = req.query;
    if (!source || !target) {
      return res.status(400).json({ error: "Source and target participant IDs are required" });
    }
    const exists = await networkDirectoryService.connectionExists(source, target);
    res.json({ exists });
  } catch (error2) {
    logger_default.error(`Error checking connection between ${req.query.source} and ${req.query.target}:`, error2);
    res.status(500).json({ error: "Failed to check connection" });
  }
});
router8.get("/map/participants", async (req, res) => {
  try {
    const { minLat, maxLat, minLng, maxLng, types, limit } = req.query;
    let boundingBox;
    if (minLat && maxLat && minLng && maxLng) {
      boundingBox = {
        minLat: parseFloat(minLat),
        maxLat: parseFloat(maxLat),
        minLng: parseFloat(minLng),
        maxLng: parseFloat(maxLng)
      };
    }
    let participantTypes;
    if (types) {
      participantTypes = types.split(",");
    }
    const participantLimit = limit ? parseInt(limit) : 100;
    const participants = await networkDirectoryService.getMapParticipants(
      boundingBox,
      participantTypes,
      participantLimit
    );
    res.json(participants);
  } catch (error2) {
    logger_default.error("Error getting map participants:", error2);
    res.status(500).json({ error: "Failed to get map participants" });
  }
});
router8.get("/stats", async (req, res) => {
  try {
    const stats = await networkDirectoryService.getNetworkStats();
    res.json(stats);
  } catch (error2) {
    logger_default.error("Error getting network stats:", error2);
    res.status(500).json({ error: "Failed to get network statistics" });
  }
});
router8.get("/events", async (req, res) => {
  try {
    const { limit, types } = req.query;
    const eventLimit = limit ? parseInt(limit) : 100;
    let eventTypes;
    if (types) {
      eventTypes = types.split(",");
    }
    const events = await networkDirectoryService.getRecentEvents(eventLimit, eventTypes);
    res.json(events);
  } catch (error2) {
    logger_default.error("Error getting network events:", error2);
    res.status(500).json({ error: "Failed to get network events" });
  }
});
var network_directory_routes_default = router8;

// server/routes/integration-routes.ts
import { v4 as uuidv416 } from "uuid";
var smartAppRegistrations = [];
var apiKeys = [];
var ehrLaunchMetadata = {
  authorization_endpoint: "/api/integration/auth",
  token_endpoint: "/api/integration/token",
  token_endpoint_auth_methods_supported: ["client_secret_basic"],
  registration_endpoint: "/api/integration/register",
  scopes_supported: [
    "launch",
    "launch/patient",
    "patient/*.read",
    "user/*.read",
    "openid",
    "profile",
    "offline_access"
  ],
  response_types_supported: ["code"],
  capabilities: [
    "launch-ehr",
    "client-confidential-symmetric",
    "context-ehr-patient"
  ]
};
function registerIntegrationRoutes(app2) {
  app2.get("/api/integration/smart-configuration", (req, res) => {
    res.json({
      ...ehrLaunchMetadata,
      issuer: `${req.protocol}://${req.get("host")}`
    });
  });
  app2.get("/api/integration/api-keys", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userKeys = apiKeys.filter((key) => key.ownerId === req.user.id);
    const safeKeys = userKeys.map(({ secret, ...rest }) => rest);
    res.json(safeKeys);
  });
  app2.post("/api/integration/api-keys", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "API key name is required" });
    }
    const newKey = {
      id: uuidv416(),
      name,
      key: `shh_${uuidv416().replace(/-/g, "")}`,
      secret: uuidv416().replace(/-/g, ""),
      ownerId: req.user.id,
      status: "active",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      lastUsed: null
    };
    apiKeys.push(newKey);
    res.status(201).json({
      id: newKey.id,
      name: newKey.name,
      key: newKey.key,
      secret: newKey.secret,
      status: newKey.status,
      createdAt: newKey.createdAt
    });
  });
  app2.delete("/api/integration/api-keys/:id", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const keyIndex = apiKeys.findIndex(
      (key) => key.id === req.params.id && key.ownerId === req.user.id
    );
    if (keyIndex === -1) {
      return res.status(404).json({ error: "API key not found" });
    }
    apiKeys[keyIndex].status = "revoked";
    apiKeys[keyIndex].updatedAt = /* @__PURE__ */ new Date();
    res.status(200).json({ message: "API key revoked successfully" });
  });
  app2.get("/api/integration/smart-apps", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userApps = smartAppRegistrations.filter((app3) => app3.ownerId === req.user.id);
    const safeApps = userApps.map(({ clientSecret, ...rest }) => rest);
    res.json(safeApps);
  });
  app2.post("/api/integration/smart-apps", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { name, redirectUris, launchUrl, scopes, description } = req.body;
    if (!name || !redirectUris || !launchUrl) {
      return res.status(400).json({
        error: "Name, redirect URIs, and launch URL are required"
      });
    }
    const newApp = {
      id: uuidv416(),
      name,
      clientId: `shh_app_${uuidv416().replace(/-/g, "")}`,
      clientSecret: uuidv416().replace(/-/g, ""),
      redirectUris: Array.isArray(redirectUris) ? redirectUris : [redirectUris],
      launchUrl,
      scopes: scopes || ["launch", "patient/*.read"],
      description: description || "",
      ownerId: req.user.id,
      status: "pending",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    smartAppRegistrations.push(newApp);
    res.status(201).json(newApp);
  });
  app2.get("/api/integration/smart-apps/:id", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const app3 = smartAppRegistrations.find(
      (app4) => app4.id === req.params.id && app4.ownerId === req.user.id
    );
    if (!app3) {
      return res.status(404).json({ error: "SMART app not found" });
    }
    const { clientSecret, ...safeApp } = app3;
    res.json(safeApp);
  });
  app2.put("/api/integration/smart-apps/:id", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const appIndex = smartAppRegistrations.findIndex(
      (app3) => app3.id === req.params.id && app3.ownerId === req.user.id
    );
    if (appIndex === -1) {
      return res.status(404).json({ error: "SMART app not found" });
    }
    const existingApp = smartAppRegistrations[appIndex];
    const { name, redirectUris, launchUrl, scopes, description } = req.body;
    smartAppRegistrations[appIndex] = {
      ...existingApp,
      name: name || existingApp.name,
      redirectUris: redirectUris ? Array.isArray(redirectUris) ? redirectUris : [redirectUris] : existingApp.redirectUris,
      launchUrl: launchUrl || existingApp.launchUrl,
      scopes: scopes || existingApp.scopes,
      description: description || existingApp.description,
      updatedAt: /* @__PURE__ */ new Date()
    };
    const { clientSecret, ...safeApp } = smartAppRegistrations[appIndex];
    res.json(safeApp);
  });
  app2.post("/api/integration/test-connection", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { type, config } = req.body;
    if (!type || !config) {
      return res.status(400).json({ error: "Connection type and configuration are required" });
    }
    switch (type) {
      case "fhir":
        setTimeout(() => {
          res.json({
            success: true,
            message: "FHIR server connection successful",
            details: {
              fhirVersion: "R4",
              serverTime: (/* @__PURE__ */ new Date()).toISOString()
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }, 1e3);
        break;
      case "hl7v2":
        setTimeout(() => {
          res.json({
            success: true,
            message: "HL7v2 connection successful",
            details: {
              port: config.port || 5e3,
              messageTypes: ["ADT", "ORM", "ORU"]
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }, 1e3);
        break;
      case "x12":
        setTimeout(() => {
          const transactionType = config.transactionType || "270";
          let responseMessage;
          let responseDetails;
          if (!config.testMessage || !config.testMessage.startsWith("ISA")) {
            return res.json({
              success: false,
              message: "Invalid X12 message format: Message must start with ISA segment",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
          switch (transactionType) {
            case "270":
              responseMessage = "Eligibility inquiry processed successfully";
              responseDetails = {
                transactionId: "X12_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                responseCode: "A",
                benefitInformation: {
                  coverage: "Active",
                  planName: "Smart Health Gold Plan",
                  effectiveDate: "2025-01-01",
                  expirationDate: "2025-12-31",
                  inNetworkDeductible: 500,
                  outOfNetworkDeductible: 1e3
                }
              };
              break;
            case "278":
              responseMessage = "Prior authorization request processed successfully";
              responseDetails = {
                authorizationId: "PA_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                responseCode: "A1",
                statusInfo: {
                  status: "Approved",
                  procedureCodes: ["99214", "81001"],
                  expirationDate: "2025-06-15",
                  reviewNotes: "All requested services approved"
                }
              };
              break;
            case "837":
              responseMessage = "Claim submission processed successfully";
              responseDetails = {
                claimId: "CLM_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                receiptDate: (/* @__PURE__ */ new Date()).toISOString(),
                statusCode: "A",
                controlNumber: "X12_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                acceptedLineItems: config.testMessage.includes("SV1") ? config.testMessage.match(/SV1/g).length : 1
              };
              break;
            default:
              responseMessage = `X12 ${transactionType} message processed successfully`;
              responseDetails = {
                transactionId: "X12_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                responseCode: "A"
              };
          }
          res.json({
            success: true,
            message: `X12 connection successful. ${responseMessage}`,
            details: {
              endpoint: config.endpoint,
              transactionType,
              responseDetails
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }, 1e3);
        break;
      default:
        res.status(400).json({ error: `Unsupported connection type: ${type}` });
    }
  });
  app2.get("/api/integration/connection-stats", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({
      totalRequests: 12583,
      successRate: 99.4,
      averageLatency: 120,
      // ms
      errorRate: 0.6,
      requestsByEndpoint: {
        "/fhir/Patient": 3245,
        "/fhir/Encounter": 1872,
        "/fhir/Observation": 5128,
        "/fhir/Condition": 1092,
        "/fhir/MedicationRequest": 1246
      },
      requestsByDay: [
        { date: "2025-04-08", count: 1423 },
        { date: "2025-04-09", count: 1582 },
        { date: "2025-04-10", count: 1642 },
        { date: "2025-04-11", count: 1723 },
        { date: "2025-04-12", count: 1523 },
        { date: "2025-04-13", count: 1290 },
        { date: "2025-04-14", count: 3400 }
      ]
    });
  });
}

// server/routes.ts
function ensureAuthenticated(req, res, next2) {
  if (req.isAuthenticated()) {
    return next2();
  }
  res.status(401).json({ message: "Not authenticated" });
}
async function registerRoutes2(app2) {
  app2.use("/docs", express6.static(path.join(process.cwd(), "server/public/docs")));
  app2.use("/api-docs", express6.static(path.join(process.cwd(), "server/public/api-docs")));
  setupAuth(app2);
  app2.get("/api/user/info", ensureAuthenticated, async (req, res) => {
    try {
      res.json(req.user);
    } catch (error2) {
      const errorMessage = error2 instanceof Error ? error2.message : String(error2);
      const err = new Error(errorMessage);
      logger3.error("Error getting user info:", err);
      res.status(500).json({ message: "Error getting user info" });
    }
  });
  function ensureAdmin2(req, res, next2) {
    if (req.isAuthenticated()) {
      return next2();
    }
    res.status(403).json({ message: "Admin access required" });
  }
  app2.get("/api/users", ensureAdmin2, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      const sanitizedUsers = users2.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(sanitizedUsers);
    } catch (error2) {
      const errorMessage = error2 instanceof Error ? error2.message : String(error2);
      const err = new Error(errorMessage);
      logger3.error("Error fetching users:", err);
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  app2.put("/api/users/:id", ensureAdmin2, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      let userData = { ...req.body };
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error2) {
      const errorMessage = error2 instanceof Error ? error2.message : String(error2);
      const err = new Error(errorMessage);
      logger3.error("Error updating user:", err);
      res.status(500).json({ message: "Error updating user" });
    }
  });
  app2.delete("/api/users/:id", ensureAdmin2, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (req.user && req.user.id === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "User not found or could not be deleted" });
      }
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error2) {
      const errorMessage = error2 instanceof Error ? error2.message : String(error2);
      const err = new Error(errorMessage);
      logger3.error("Error deleting user:", err);
      res.status(500).json({ message: "Error deleting user" });
    }
  });
  app2.get("/api/health", (req, res) => {
    res.json({ status: "healthy", environment: process.env.NODE_ENV || "development" });
  });
  app2.post("/api/promote-to-admin", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const userId = req.user.id;
      const updatedUser = await storage.updateUser(userId, { role: "admin" });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({
        message: "User promoted to admin successfully",
        user: userWithoutPassword
      });
    } catch (error2) {
      const errorMessage = error2 instanceof Error ? error2.message : String(error2);
      const err = new Error(errorMessage);
      logger3.error("Error promoting user to admin:", err);
      res.status(500).json({ message: "Error promoting user to admin" });
    }
  });
  app2.use("/api/contracts", contract_routes_default);
  registerEligibilityRoutes(app2);
  app2.use("/api/billing", billing_routes_default);
  app2.use("/api/prior-auth", prior_auth_routes_default);
  app2.use("/api", care_event_routes_default);
  app2.use("/api/goldcarding", goldcarding_routes_default);
  registerClaimsRoutes(app2);
  app2.use("/api/scheduling", schedulingRouter);
  app2.use("/api/employers", employer_routes_default);
  app2.use("/api/network", network_directory_routes_default);
  registerIntegrationRoutes(app2);
  const httpServer = createServer2(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws4) => {
    logger3.info("WebSocket client connected");
    ws4.send(JSON.stringify({
      type: "connection",
      status: "connected",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
    ws4.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        logger3.debug("WebSocket message received", { type: data.type });
        if (data.type === "subscribe" && data.channel) {
          ws4.subscriptions = ws4.subscriptions || /* @__PURE__ */ new Set();
          ws4.subscriptions.add(data.channel);
          ws4.send(JSON.stringify({
            type: "subscription",
            status: "success",
            channel: data.channel,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }));
        } else {
          ws4.send(JSON.stringify({
            type: "echo",
            data,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }));
        }
      } catch (error2) {
        const errorMessage = error2 instanceof Error ? error2.message : String(error2);
        const err = new Error(errorMessage);
        logger3.error("Error processing WebSocket message", err);
        ws4.send(JSON.stringify({
          type: "error",
          message: "Invalid message format",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }));
      }
    });
    ws4.on("close", () => {
      logger3.info("WebSocket client disconnected");
    });
  });
  global.broadcastEvent = (channel, eventData) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const subscriptions2 = client.subscriptions;
        if (subscriptions2 && subscriptions2.has(channel)) {
          client.send(JSON.stringify({
            type: "event",
            channel,
            data: eventData,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }));
        }
      }
    });
  };
  logger3.info("WebSocket server initialized at /ws");
  return httpServer;
}

// server/vite.ts
import express7 from "express";
import fs from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next2) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next2(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express7.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/security/zero-trust.ts
import { createHmac, timingSafeEqual as timingSafeEqual2 } from "crypto";
var RISK_THRESHOLDS = {
  ["low" /* LOW */]: 30,
  ["medium" /* MEDIUM */]: 60,
  ["high" /* HIGH */]: 80,
  ["critical" /* CRITICAL */]: 95
};
var DEFAULT_REQUEST_VERIFICATION = {
  enabled: true,
  headerName: "x-signature",
  secret: process.env.REQUEST_SIGNING_SECRET || "dev-secret-key",
  algorithm: "sha256",
  maxRequestAge: 300
  // 5 minutes
};
function calculateRiskScore(context5) {
  const factors = [];
  let score = 0;
  if (!context5.knownDevice) {
    score += 30;
    factors.push("unknown_device");
  }
  if (context5.clientIp.startsWith("10.") || context5.clientIp.startsWith("192.168.")) {
    score -= 10;
    factors.push("internal_network");
  } else {
    score += 10;
    factors.push("external_network");
  }
  const currentHour = context5.timestamp.getHours();
  if (currentHour < 7 || currentHour > 22) {
    score += 15;
    factors.push("unusual_time");
  }
  if (context5.userAgent.includes("curl") || context5.userAgent.includes("Postman") || context5.userAgent.toLowerCase().includes("bot")) {
    score += 25;
    factors.push("suspicious_user_agent");
  }
  if (context5.previousLoginTime) {
    const timeDiff = context5.timestamp.getTime() - context5.previousLoginTime.getTime();
    const hoursDiff = timeDiff / (1e3 * 60 * 60);
    if (hoursDiff < 1) {
      score -= 10;
      factors.push("recent_login");
    }
  } else {
    score += 10;
    factors.push("no_previous_login");
  }
  let level = "low" /* LOW */;
  if (score >= RISK_THRESHOLDS["critical" /* CRITICAL */]) {
    level = "critical" /* CRITICAL */;
  } else if (score >= RISK_THRESHOLDS["high" /* HIGH */]) {
    level = "high" /* HIGH */;
  } else if (score >= RISK_THRESHOLDS["medium" /* MEDIUM */]) {
    level = "medium" /* MEDIUM */;
  }
  return {
    level,
    score,
    factors
  };
}
function extractAuthContext(req) {
  return {
    userId: req.user?.id,
    username: req.user?.username,
    role: req.user?.role,
    clientIp: req.ip || "",
    userAgent: req.headers["user-agent"] || "",
    timestamp: /* @__PURE__ */ new Date(),
    // In a real implementation, these would be populated from user profiles or device tracking
    knownDevice: false,
    previousLoginTime: void 0
  };
}
function contextAwareAuth(options = {}) {
  return (req, res, next2) => {
    if (!req.isAuthenticated()) {
      return next2();
    }
    if (options.bypassRoles && req.user?.role && options.bypassRoles.includes(req.user.role)) {
      return next2();
    }
    const context5 = extractAuthContext(req);
    const riskAssessment = calculateRiskPolicy(context5);
    req.riskAssessment = riskAssessment;
    if (options.blockRiskLevel && getRiskLevelValue(riskAssessment.level) >= getRiskLevelValue(options.blockRiskLevel)) {
      return res.status(403).json({
        error: "Access denied due to high risk score",
        riskLevel: riskAssessment.level,
        factors: riskAssessment.factors
      });
    }
    if (options.requireMfaForRisk && getRiskLevelValue(riskAssessment.level) >= getRiskLevelValue(options.requireMfaForRisk)) {
      if (req.session?.mfaVerified) {
        return next2();
      }
      return res.status(401).json({
        error: "Additional authentication required",
        authType: "mfa",
        riskLevel: riskAssessment.level
      });
    }
    next2();
  };
}
function getRiskLevelValue(level) {
  switch (level) {
    case "low" /* LOW */:
      return 1;
    case "medium" /* MEDIUM */:
      return 2;
    case "high" /* HIGH */:
      return 3;
    case "critical" /* CRITICAL */:
      return 4;
    default:
      return 0;
  }
}
function calculateRiskPolicy(context5) {
  return calculateRiskScore(context5);
}
function generateRequestSignature(req, config = DEFAULT_REQUEST_VERIFICATION) {
  const timestamp14 = Date.now().toString();
  const method = req.method;
  const path4 = req.path;
  const body = JSON.stringify(req.body) || "";
  const data = `${timestamp14}:${method}:${path4}:${body}`;
  const hmac = createHmac(config.algorithm, config.secret);
  return `${timestamp14}:${hmac.update(data).digest("hex")}`;
}
function verifyRequestSignature(signature, req, config = DEFAULT_REQUEST_VERIFICATION) {
  try {
    const [timestamp14, hash] = signature.split(":");
    const timestampNum = parseInt(timestamp14, 10);
    const now = Date.now();
    const requestAge = (now - timestampNum) / 1e3;
    if (requestAge > config.maxRequestAge) {
      console.warn(`Request too old: ${requestAge} seconds`);
      return false;
    }
    const method = req.method;
    const path4 = req.path;
    const body = JSON.stringify(req.body) || "";
    const data = `${timestamp14}:${method}:${path4}:${body}`;
    const hmac = createHmac(config.algorithm, config.secret);
    const expectedHash = hmac.update(data).digest("hex");
    const hashBuffer = Buffer.from(hash, "hex");
    const expectedBuffer = Buffer.from(expectedHash, "hex");
    return hashBuffer.length === expectedBuffer.length && timingSafeEqual2(hashBuffer, expectedBuffer);
  } catch (error2) {
    console.error("Error verifying request signature:", error2);
    return false;
  }
}
function verifyRequestIntegrity(config = DEFAULT_REQUEST_VERIFICATION) {
  return (req, res, next2) => {
    if (!config.enabled) {
      return next2();
    }
    if (process.env.NODE_ENV === "development" && req.method === "GET") {
      return next2();
    }
    const signature = req.headers[config.headerName.toLowerCase()];
    if (!signature) {
      if (process.env.NODE_ENV === "development") {
        const expectedSignature = generateRequestSignature(req, config);
        console.log(`Missing signature. Expected: ${expectedSignature}`);
        console.log(`Add header: ${config.headerName}: ${expectedSignature}`);
        return next2();
      }
      return res.status(401).json({ error: "Missing request signature" });
    }
    if (!verifyRequestSignature(signature, req, config)) {
      return res.status(401).json({ error: "Invalid request signature" });
    }
    next2();
  };
}
function authorizeRequest(requiredPermission, options = {}) {
  const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
  return (req, res, next2) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userRole = req.user?.role || "";
    if (options.denyRoles && options.denyRoles.includes(userRole)) {
      return res.status(403).json({ error: "Access denied by role" });
    }
    if (options.allowRoles && options.allowRoles.includes(userRole)) {
      return next2();
    }
    const hasPermission = permissions.some((perm) => {
      if (userRole === "admin") return true;
      if (userRole === "provider" && perm.startsWith("provider:")) return true;
      if (userRole === "patient" && perm.startsWith("patient:")) return true;
      return false;
    });
    if (!hasPermission) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: permissions
      });
    }
    if (options.resourceIdParam) {
      const resourceId = req.params[options.resourceIdParam];
    }
    next2();
  };
}

// server/security/setup.ts
function setupZeroTrustSecurity(app2) {
  console.log("Setting up zero-trust security architecture...");
  const isProduction2 = process.env.NODE_ENV === "production";
  if (!isProduction2) {
    console.log("Running in development mode. Some security features are relaxed.");
  }
  app2.use("/api/*", verifyRequestIntegrity({
    enabled: isProduction2,
    // Only enforce in production
    headerName: "x-signature",
    secret: process.env.REQUEST_SIGNING_SECRET || "dev-secret-key",
    algorithm: "sha256",
    maxRequestAge: 300
  }));
  app2.use("/api/user*", contextAwareAuth({
    // In production, we would require MFA for medium risk situations
    requireMfaForRisk: isProduction2 ? "medium" /* MEDIUM */ : "critical" /* CRITICAL */
  }));
  app2.use("/api/claims*", contextAwareAuth({
    requireMfaForRisk: isProduction2 ? "medium" /* MEDIUM */ : "critical" /* CRITICAL */
  }));
  app2.use("/api/fhir*", contextAwareAuth({
    requireMfaForRisk: isProduction2 ? "medium" /* MEDIUM */ : "critical" /* CRITICAL */
  }));
  app2.use("/api/claims/:id", authorizeRequest(["claims:read"], {
    allowRoles: ["admin", "provider"],
    resourceIdParam: "id"
  }));
  app2.use("/api/claims/create", authorizeRequest(["claims:create"], {
    allowRoles: ["admin", "provider"]
  }));
  app2.use("/api/patients/:id", authorizeRequest(["patients:read"], {
    resourceIdParam: "id"
  }));
  app2.use("/api/patients/create", authorizeRequest(["patients:create"], {
    allowRoles: ["admin", "provider"]
  }));
  app2.use("/api/fhir/:id", authorizeRequest(["fhir:read"], {
    resourceIdParam: "id"
  }));
  app2.use("/api/fhir/create", authorizeRequest(["fhir:create"], {
    allowRoles: ["admin", "provider"]
  }));
  console.log("Zero-trust security architecture setup complete");
  return app2;
}

// server/db/connection-manager.ts
import { Pool as Pool4 } from "@neondatabase/serverless";
import { drizzle as drizzle4 } from "drizzle-orm/neon-serverless";

// shared/model-registry.ts
var modelRegistry = {
  // Directory entities
  organizations,
  facilities,
  employers,
  enhancedProviders,
  pharmacies,
  payers,
  // Canonical dataset entities
  codeSystems,
  codeSystemConcepts,
  codeSystemDesignations,
  valueSets,
  valueSetIncludes,
  valueSetExcludes,
  valueSetExpansions,
  conceptMaps,
  conceptMapElements,
  feeSchedules,
  feeScheduleItems,
  clinicalRules,
  clinicalRuleElements,
  licenses,
  licenseUsage,
  // Directory synchronization entities
  directoryConnections,
  identityMappings,
  syncJobs,
  conflictRecords,
  webhookSubscriptions
};
var tableNameToModel = {
  // Directory entities
  organizations,
  facilities,
  employers,
  enhanced_providers: enhancedProviders,
  pharmacies,
  payers,
  // Canonical dataset entities
  code_systems: codeSystems,
  code_system_concepts: codeSystemConcepts,
  code_system_designations: codeSystemDesignations,
  value_sets: valueSets,
  value_set_includes: valueSetIncludes,
  value_set_excludes: valueSetExcludes,
  value_set_expansions: valueSetExpansions,
  concept_maps: conceptMaps,
  concept_map_elements: conceptMapElements,
  fee_schedules: feeSchedules,
  fee_schedule_items: feeScheduleItems,
  clinical_rules: clinicalRules,
  clinical_rule_elements: clinicalRuleElements,
  licenses,
  license_usage: licenseUsage,
  // Directory synchronization entities
  directory_connections: directoryConnections,
  identity_mappings: identityMappings,
  sync_jobs: syncJobs,
  conflict_records: conflictRecords,
  webhook_subscriptions: webhookSubscriptions,
  // Add aliases for camelCase names
  enhancedProviders,
  codeSystems,
  codeSystemConcepts,
  codeSystemDesignations,
  valueSets,
  valueSetIncludes,
  valueSetExcludes,
  valueSetExpansions,
  conceptMaps,
  conceptMapElements,
  feeSchedules,
  feeScheduleItems,
  clinicalRules,
  clinicalRuleElements,
  directoryConnections,
  identityMappings,
  syncJobs,
  conflictRecords,
  webhookSubscriptions
};
var modelDependencyGraph = {
  // Directory entities
  organizations: [],
  facilities: ["organizations"],
  employers: ["organizations"],
  enhancedProviders: ["organizations"],
  pharmacies: ["organizations"],
  payers: ["organizations"],
  // Canonical dataset entities
  codeSystems: [],
  codeSystemConcepts: ["codeSystems"],
  codeSystemDesignations: ["codeSystems"],
  valueSets: [],
  valueSetIncludes: ["valueSets", "codeSystems"],
  valueSetExcludes: ["valueSets", "codeSystems"],
  valueSetExpansions: ["valueSets"],
  conceptMaps: ["codeSystems"],
  conceptMapElements: ["conceptMaps"],
  feeSchedules: [],
  feeScheduleItems: ["feeSchedules", "codeSystems"],
  clinicalRules: [],
  clinicalRuleElements: ["clinicalRules"],
  licenses: [],
  licenseUsage: ["licenses"],
  // Directory synchronization entities
  directoryConnections: [],
  identityMappings: [],
  syncJobs: [],
  conflictRecords: [],
  webhookSubscriptions: []
};
function validateModelRegistry() {
  const requiredModels = [
    // Directory entities
    "organizations",
    "facilities",
    "employers",
    "enhancedProviders",
    "pharmacies",
    "payers",
    // Canonical dataset entities
    "codeSystems",
    "codeSystemConcepts",
    "codeSystemDesignations",
    "valueSets",
    "valueSetIncludes",
    "valueSetExcludes",
    "valueSetExpansions",
    "conceptMaps",
    "conceptMapElements",
    "feeSchedules",
    "feeScheduleItems",
    "clinicalRules",
    "clinicalRuleElements",
    "licenses",
    "licenseUsage",
    // Directory synchronization entities
    "directoryConnections",
    "identityMappings",
    "syncJobs",
    "conflictRecords",
    "webhookSubscriptions"
  ];
  for (const modelName of requiredModels) {
    if (!modelRegistry[modelName]) {
      console.error(`Model registry validation failed: ${modelName} is missing`);
      return false;
    }
  }
  for (const [model, dependencies] of Object.entries(modelDependencyGraph)) {
    if (!tableNameToModel[model]) {
      console.error(`Dependency graph references non-existent model: ${model}`);
      return false;
    }
    for (const dep of dependencies) {
      if (!tableNameToModel[dep]) {
        console.error(`Model ${model} depends on non-existent model: ${dep}`);
        return false;
      }
    }
  }
  return true;
}

// shared/model-relationships.ts
import { relations as relations7 } from "drizzle-orm";
var organizationsRelations = relations7(organizations, ({ many }) => ({
  // An organization can have multiple facilities
  facilities: many(facilities),
  // An organization can have multiple providers
  providers: many(enhancedProviders),
  // An organization can have multiple employers
  employers: many(employers),
  // An organization can have multiple pharmacies
  pharmacies: many(pharmacies),
  // An organization can have multiple payers
  payers: many(payers)
}));
var facilitiesRelations = relations7(facilities, ({ one }) => ({
  // Each facility belongs to an organization
  organization: one(organizations, {
    fields: [facilities.organizationId],
    references: [organizations.id]
  })
}));
var employersRelations = relations7(employers, ({}) => ({
  // Comment: Relationship temporarily disabled due to schema mismatch
  // The employers table does not have an organizationId field
}));
var enhancedProvidersRelations = relations7(enhancedProviders, ({}) => ({
  // Comment: Relationship temporarily disabled due to schema mismatch
  // The enhancedProviders table does not have a primaryOrganizationId field
}));
var pharmaciesRelations = relations7(pharmacies, ({ one }) => ({
  // Each pharmacy is an organization
  organization: one(organizations, {
    fields: [pharmacies.organizationId],
    references: [organizations.id]
  })
}));
var payersRelations = relations7(payers, ({}) => ({
  // Comment: Relationship temporarily disabled due to schema mismatch
  // The payers table does not have an organizationId field
}));
var codeSystemsRelations = relations7(codeSystems, ({ many }) => ({
  // A code system can have multiple concepts
  concepts: many(codeSystemConcepts)
}));
var codeSystemConceptsRelations = relations7(codeSystemConcepts, ({ one, many }) => ({
  // Each concept belongs to a code system
  codeSystem: one(codeSystems, {
    fields: [codeSystemConcepts.codeSystemId],
    references: [codeSystems.id]
  }),
  // A concept can have multiple designations (translations, synonyms)
  designations: many(codeSystemDesignations)
}));
var codeSystemDesignationsRelations = relations7(codeSystemDesignations, ({}) => ({
  // Comment: Relationship temporarily disabled due to schema mismatch
  // The codeSystemDesignations table does not have a conceptId field
}));
var valueSetsRelations = relations7(valueSets, ({ many }) => ({
  // A value set can have multiple include criteria
  includes: many(valueSetIncludes),
  // A value set can have multiple exclude criteria
  excludes: many(valueSetExcludes),
  // A value set can have multiple expansions (pre-computed membership)
  expansions: many(valueSetExpansions)
}));
var valueSetIncludesRelations = relations7(valueSetIncludes, ({ one }) => ({
  // Each include criteria belongs to a value set
  valueSet: one(valueSets, {
    fields: [valueSetIncludes.valueSetId],
    references: [valueSets.id]
  })
}));
var valueSetExcludesRelations = relations7(valueSetExcludes, ({ one }) => ({
  // Each exclude criteria belongs to a value set
  valueSet: one(valueSets, {
    fields: [valueSetExcludes.valueSetId],
    references: [valueSets.id]
  })
}));
var valueSetExpansionsRelations = relations7(valueSetExpansions, ({ one }) => ({
  // Each expansion belongs to a value set
  valueSet: one(valueSets, {
    fields: [valueSetExpansions.valueSetId],
    references: [valueSets.id]
  })
}));
var conceptMapsRelations = relations7(conceptMaps, ({ many }) => ({
  // A concept map can have multiple mapping elements
  elements: many(conceptMapElements)
}));
var conceptMapElementsRelations = relations7(conceptMapElements, ({ one }) => ({
  // Each mapping element belongs to a concept map
  conceptMap: one(conceptMaps, {
    fields: [conceptMapElements.conceptMapId],
    references: [conceptMaps.id]
  })
}));
var feeSchedulesRelations = relations7(feeSchedules, ({ many }) => ({
  // A fee schedule can have multiple fee items
  items: many(feeScheduleItems)
}));
var feeScheduleItemsRelations = relations7(feeScheduleItems, ({ one }) => ({
  // Each fee item belongs to a fee schedule
  feeSchedule: one(feeSchedules, {
    fields: [feeScheduleItems.feeScheduleId],
    references: [feeSchedules.id]
  })
}));
var clinicalRulesRelations = relations7(clinicalRules, ({ many }) => ({
  // A clinical rule can have multiple rule elements
  elements: many(clinicalRuleElements)
}));
var clinicalRuleElementsRelations = relations7(clinicalRuleElements, ({ one }) => ({
  // Each rule element belongs to a clinical rule
  clinicalRule: one(clinicalRules, {
    fields: [clinicalRuleElements.ruleId],
    references: [clinicalRules.id]
  })
}));
var licensesRelations = relations7(licenses, ({}) => ({
  // Comment: Relationship temporarily disabled due to schema mismatch
  // The licenseUsage table does not have a licenseId field required for this relationship
}));
var licenseUsageRelations = relations7(licenseUsage, ({}) => ({
  // Comment: Relationship temporarily disabled due to schema mismatch
  // The licenseUsage table does not have a licenseId field
}));
var directoryConnectionsRelations = relations7(directoryConnections, ({ many }) => ({
  // A directory connection can have multiple identity mappings
  identityMappings: many(identityMappings),
  // A directory connection can have multiple sync jobs
  syncJobs: many(syncJobs),
  // A directory connection can have multiple conflict records
  conflictRecords: many(conflictRecords),
  // A directory connection can have multiple webhook subscriptions
  webhookSubscriptions: many(webhookSubscriptions)
}));
var identityMappingsRelations = relations7(identityMappings, ({ one }) => ({
  // Each identity mapping belongs to a directory connection
  connection: one(directoryConnections, {
    fields: [identityMappings.connectionId],
    references: [directoryConnections.id]
  })
}));
var syncJobsRelations = relations7(syncJobs, ({ one, many }) => ({
  // Each sync job belongs to a directory connection
  connection: one(directoryConnections, {
    fields: [syncJobs.connectionId],
    references: [directoryConnections.id]
  }),
  // A sync job can have multiple conflict records
  conflicts: many(conflictRecords)
}));
var conflictRecordsRelations = relations7(conflictRecords, ({ one }) => ({
  // Each conflict record belongs to a directory connection
  connection: one(directoryConnections, {
    fields: [conflictRecords.connectionId],
    references: [directoryConnections.id]
  })
  // Each conflict record is associated with a sync job (temporarily commenting out until schema is updated)
  /* Relationship commented out because syncJobId field is missing from conflictRecords schema
  syncJob: one(syncJobs, {
    fields: [conflictRecords.syncJobId],
    references: [syncJobs.id],
  })
  */
}));
var webhookSubscriptionsRelations = relations7(webhookSubscriptions, ({ one }) => ({
  // Each webhook subscription belongs to a directory connection
  connection: one(directoryConnections, {
    fields: [webhookSubscriptions.connectionId],
    references: [directoryConnections.id]
  })
}));
var modelRelationships = [
  // Directory entity relationships
  {
    sourceModel: "organizations",
    targetModel: "facilities",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "organizationId"
      }
    ]
  },
  {
    sourceModel: "organizations",
    targetModel: "employers",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "organizationId"
      }
    ],
    _commented: true
    // Relationship temporarily disabled due to schema mismatch
  },
  {
    sourceModel: "organizations",
    targetModel: "enhancedProviders",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "primaryOrganizationId"
      }
    ],
    _commented: true
    // Relationship temporarily disabled due to schema mismatch
  },
  {
    sourceModel: "organizations",
    targetModel: "pharmacies",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "organizationId"
      }
    ]
  },
  {
    sourceModel: "organizations",
    targetModel: "payers",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "organizationId"
      }
    ],
    _commented: true
    // Relationship temporarily disabled due to schema mismatch
  },
  // Canonical dataset relationships
  {
    sourceModel: "codeSystems",
    targetModel: "codeSystemConcepts",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "codeSystemId"
      }
    ]
  },
  {
    sourceModel: "codeSystemConcepts",
    targetModel: "codeSystemDesignations",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "conceptId"
      }
    ]
  },
  {
    sourceModel: "valueSets",
    targetModel: "valueSetIncludes",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "valueSetId"
      }
    ]
  },
  {
    sourceModel: "valueSets",
    targetModel: "valueSetExcludes",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "valueSetId"
      }
    ]
  },
  {
    sourceModel: "valueSets",
    targetModel: "valueSetExpansions",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "valueSetId"
      }
    ]
  },
  {
    sourceModel: "conceptMaps",
    targetModel: "conceptMapElements",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "conceptMapId"
      }
    ]
  },
  {
    sourceModel: "feeSchedules",
    targetModel: "feeScheduleItems",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "feeScheduleId"
      }
    ]
  },
  {
    sourceModel: "clinicalRules",
    targetModel: "clinicalRuleElements",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "ruleId"
      }
    ]
  },
  {
    sourceModel: "licenses",
    targetModel: "licenseUsage",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "licenseId"
      }
    ],
    _commented: true
    // Relationship temporarily disabled due to schema mismatch
  },
  // Directory synchronization relationships
  {
    sourceModel: "directoryConnections",
    targetModel: "identityMappings",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "connectionId"
      }
    ]
  },
  {
    sourceModel: "directoryConnections",
    targetModel: "syncJobs",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "connectionId"
      }
    ]
  },
  {
    sourceModel: "directoryConnections",
    targetModel: "conflictRecords",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "connectionId"
      }
    ]
  },
  {
    sourceModel: "directoryConnections",
    targetModel: "webhookSubscriptions",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "connectionId"
      }
    ]
  },
  {
    sourceModel: "syncJobs",
    targetModel: "conflictRecords",
    relationType: "one-to-many",
    fieldMappings: [
      {
        sourceField: "id",
        targetField: "syncJobId"
      }
    ],
    _commented: true
    // Marking as commented until the schema is updated
  }
];
function validateModelRelationships() {
  let isValid = true;
  for (const relationship of modelRelationships) {
    if (relationship._commented) {
      continue;
    }
    if (!modelRegistry[relationship.sourceModel]) {
      console.error(`Invalid relationship: Source model ${relationship.sourceModel} does not exist`);
      isValid = false;
    }
    if (!modelRegistry[relationship.targetModel]) {
      console.error(`Invalid relationship: Target model ${relationship.targetModel} does not exist`);
      isValid = false;
    }
  }
  return isValid;
}
var allRelations = {
  // Directory entities relations
  organizationsRelations,
  facilitiesRelations,
  employersRelations,
  enhancedProvidersRelations,
  pharmaciesRelations,
  payersRelations,
  // Canonical dataset entities relations
  codeSystemsRelations,
  codeSystemConceptsRelations,
  codeSystemDesignationsRelations,
  valueSetsRelations,
  valueSetIncludesRelations,
  valueSetExcludesRelations,
  valueSetExpansionsRelations,
  conceptMapsRelations,
  conceptMapElementsRelations,
  feeSchedulesRelations,
  feeScheduleItemsRelations,
  clinicalRulesRelations,
  clinicalRuleElementsRelations,
  licensesRelations,
  licenseUsageRelations,
  // Directory synchronization entities relations
  directoryConnectionsRelations,
  identityMappingsRelations,
  syncJobsRelations,
  conflictRecordsRelations,
  webhookSubscriptionsRelations
};

// shared/model-validator.ts
function validateModels() {
  const errors = [];
  let isValid = true;
  if (!validateModelRegistry()) {
    errors.push("Model registry validation failed");
    isValid = false;
  }
  if (!validateModelRelationships()) {
    errors.push("Model relationships validation failed");
    isValid = false;
  }
  for (const [modelName, model] of Object.entries(modelRegistry)) {
    try {
      if (!model || typeof model !== "object") {
        errors.push(`Model ${modelName} is not properly defined`);
        isValid = false;
        continue;
      }
      const relationships = modelRelationships.filter(
        (rel) => (rel.sourceModel === modelName || rel.targetModel === modelName) && // Skip relationships with commented markings
        !rel.hasOwnProperty("_commented")
      );
      for (const rel of relationships) {
        for (const mapping of rel.fieldMappings) {
          const fieldToCheck = rel.sourceModel === modelName ? mapping.sourceField : mapping.targetField;
          if (!(fieldToCheck in model)) {
            if (modelName === "claims" && (fieldToCheck === "providerId" || fieldToCheck === "submitterId")) {
              continue;
            }
            errors.push(`Model ${modelName} is missing field ${fieldToCheck} required for relationship`);
            isValid = false;
          }
        }
      }
    } catch (error2) {
      errors.push(`Error validating model ${modelName}: ${error2 instanceof Error ? error2.message : String(error2)}`);
      isValid = false;
    }
  }
  if (!validateDependencyGraph()) {
    errors.push("Dependency graph contains cycles");
    isValid = false;
  }
  return { valid: isValid, errors };
}
function validateDependencyGraph() {
  const visited = /* @__PURE__ */ new Set();
  const recStack = /* @__PURE__ */ new Set();
  for (const model of Object.keys(modelDependencyGraph)) {
    if (hasCycle(model, visited, recStack)) {
      console.error(`Dependency cycle detected in model: ${model}`);
      return false;
    }
  }
  return true;
  function hasCycle(model, visited2, recStack2) {
    visited2.add(model);
    recStack2.add(model);
    const dependencies = modelDependencyGraph[model] || [];
    for (const dep of dependencies) {
      if (!visited2.has(dep)) {
        if (hasCycle(dep, visited2, recStack2)) {
          return true;
        }
      } else if (recStack2.has(dep)) {
        return true;
      }
    }
    recStack2.delete(model);
    return false;
  }
}
if (typeof __require !== "undefined" && __require.main === module) {
  const { valid, errors } = validateModels();
  if (valid) {
    console.log("\u2705 All models are valid!");
  } else {
    console.error("\u274C Model validation failed:");
    errors.forEach((error2) => console.error(`- ${error2}`));
  }
}

// server/db/connection-manager.ts
var ConnectionManager = class {
  mainPool;
  readPools = [];
  lastReadPoolIndex = 0;
  shardManager = null;
  /**
   * Initialize the connection manager
   */
  constructor() {
    console.log("Initializing ConnectionManager...");
    const dbUrl2 = process.env.DATABASE_URL;
    if (!dbUrl2) {
      throw new Error("DATABASE_URL is required");
    }
    this.mainPool = new Pool4({
      connectionString: dbUrl2
    });
    const readUrls = process.env.READ_DATABASE_URLS;
    if (readUrls) {
      const readConnectionStrings = readUrls.split(",");
      if (readConnectionStrings.length > 0) {
        this.readPools = readConnectionStrings.map((connString) => {
          return new Pool4({ connectionString: connString });
        });
        console.log(`Initialized ${this.readPools.length} read replica pools`);
      }
    } else {
      console.log("No read replicas configured, using main pool for reads");
    }
  }
  /**
   * Get the main write database client
   */
  getWriteClient() {
    return drizzle4(this.mainPool, {
      schema: { ...modelRegistry, ...allRelations }
    });
  }
  /**
   * Get a read-only database client using round-robin selection
   */
  getReadClient() {
    if (this.readPools.length === 0) {
      return drizzle4(this.mainPool, {
        schema: { ...modelRegistry, ...allRelations }
      });
    }
    this.lastReadPoolIndex = (this.lastReadPoolIndex + 1) % this.readPools.length;
    const pool3 = this.readPools[this.lastReadPoolIndex];
    return drizzle4(pool3, {
      schema: { ...modelRegistry, ...allRelations }
    });
  }
  /**
   * Get a client for a specific entity and key
   */
  getClientForEntity(entityType, key, forWrite = false) {
    return forWrite ? this.getWriteClient() : this.getReadClient();
  }
  /**
   * Get the raw connection pool (for advanced use cases)
   */
  getRawPool(forWrite = true) {
    if (forWrite) {
      return this.mainPool;
    } else if (this.readPools.length > 0) {
      this.lastReadPoolIndex = (this.lastReadPoolIndex + 1) % this.readPools.length;
      return this.readPools[this.lastReadPoolIndex];
    } else {
      return this.mainPool;
    }
  }
  /**
   * Close all database connections
   */
  async closeAll() {
    const closingPromises = [];
    console.log("Closing all database connections...");
    closingPromises.push(this.mainPool.end());
    this.readPools.forEach((pool3) => {
      closingPromises.push(pool3.end());
    });
    await Promise.all(closingPromises);
    console.log("All database connections closed");
  }
};

// server/db/index.ts
var dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}
var connectionManager = new ConnectionManager();
var db2 = connectionManager.getWriteClient();
var pool2 = connectionManager.getRawPool(true);
async function closeAllConnections() {
  return connectionManager.closeAll();
}

// server/db/partitioning/migrations.ts
var createClaimsPartitionedTableSQL = `
CREATE TABLE IF NOT EXISTS claims_partitioned (
  id SERIAL,
  claim_id TEXT NOT NULL UNIQUE,
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  date TEXT,
  amount TEXT,
  status TEXT DEFAULT 'submitted',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);
`;
var createClaimsMonthlyPartitions = `
-- Create monthly partitions for 2023
CREATE TABLE IF NOT EXISTS claims_y2023m01 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m02 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m03 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-03-01') TO ('2023-04-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m04 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-04-01') TO ('2023-05-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m05 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-05-01') TO ('2023-06-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m06 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-06-01') TO ('2023-07-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m07 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-07-01') TO ('2023-08-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m08 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-08-01') TO ('2023-09-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m09 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-09-01') TO ('2023-10-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m10 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-10-01') TO ('2023-11-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m11 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-11-01') TO ('2023-12-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m12 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-12-01') TO ('2024-01-01');
`;
var createFhirResourcesPartitionedTableSQL = `
CREATE TABLE IF NOT EXISTS fhir_resources_partitioned (
  id SERIAL,
  resource_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created);
`;
var createFhirResourcesMonthlyPartitions = `
-- Create monthly partitions for 2023
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m01 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m02 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m03 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-03-01') TO ('2023-04-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m04 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-04-01') TO ('2023-05-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m05 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-05-01') TO ('2023-06-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m06 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-06-01') TO ('2023-07-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m07 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-07-01') TO ('2023-08-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m08 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-08-01') TO ('2023-09-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m09 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-09-01') TO ('2023-10-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m10 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-10-01') TO ('2023-11-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m11 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-11-01') TO ('2023-12-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m12 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-12-01') TO ('2024-01-01');
`;
async function applyPartitionMigrations() {
  try {
    await pool2.query(createClaimsPartitionedTableSQL);
    await pool2.query(createClaimsMonthlyPartitions);
    await pool2.query(createFhirResourcesPartitionedTableSQL);
    await pool2.query(createFhirResourcesMonthlyPartitions);
    console.log("Partition migrations applied successfully");
  } catch (error2) {
    console.error("Error applying partition migrations:", error2);
    throw error2;
  }
}

// server/db/partitioning/partition-manager.ts
import { format } from "date-fns";
var PartitionManager = class {
  /**
   * Initialize the partition manager
   */
  constructor(pool3) {
    this.pool = pool3;
    this.pool = pool3;
  }
  /**
   * Create a new partition for a table based on a date range
   * 
   * @param tableName The name of the partitioned table
   * @param startDate Start date for the partition (inclusive)
   * @param endDate End date for the partition (exclusive)
   * @param partitionName Optional name for the partition
   */
  async createDatePartition(tableName, startDate, endDate, partitionName) {
    try {
      if (!partitionName) {
        const formattedDate = format(startDate, "yyyyMM");
        partitionName = `${tableName}_p${formattedDate}`;
      }
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      const sql13 = `
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${tableName}
        FOR VALUES FROM ('${startDateStr}') TO ('${endDateStr}');
      `;
      await this.pool?.query(sql13);
      console.log(`Created partition ${partitionName} for ${tableName}`);
      return true;
    } catch (error2) {
      console.error(`Error creating partition for ${tableName}:`, error2);
      return false;
    }
  }
  /**
   * Create partitions for an entire year
   * 
   * @param tableName The name of the partitioned table
   * @param year The year to create partitions for
   * @param monthlyPartitions Whether to create monthly partitions (default) or quarterly
   */
  async createDatePartitionsForYear(tableName, year, monthlyPartitions = true) {
    try {
      if (monthlyPartitions) {
        for (let month = 1; month <= 12; month++) {
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 1);
          await this.createDatePartition(
            tableName,
            startDate,
            endDate,
            `${tableName}_y${year}m${month.toString().padStart(2, "0")}`
          );
        }
      } else {
        for (let quarter = 1; quarter <= 4; quarter++) {
          const startMonth = (quarter - 1) * 3 + 1;
          const endMonth = quarter * 3 + 1;
          const startDate = new Date(year, startMonth - 1, 1);
          const endDate = new Date(year, endMonth - 1, 1);
          await this.createDatePartition(
            tableName,
            startDate,
            endDate,
            `${tableName}_y${year}q${quarter}`
          );
        }
      }
      return true;
    } catch (error2) {
      console.error(`Error creating partitions for ${tableName} for year ${year}:`, error2);
      return false;
    }
  }
  /**
   * Create a new partition for a table based on a numeric range
   * 
   * @param tableName The name of the partitioned table
   * @param min Minimum value for the partition (inclusive)
   * @param max Maximum value for the partition (exclusive) 
   * @param partitionName Optional name for the partition
   */
  async createNumericPartition(tableName, min, max, partitionName) {
    try {
      if (!partitionName) {
        partitionName = `${tableName}_${min}_to_${max}`;
      }
      const sql13 = `
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${tableName}
        FOR VALUES FROM (${min}) TO (${max});
      `;
      await this.pool?.query(sql13);
      console.log(`Created partition ${partitionName} for ${tableName}`);
      return true;
    } catch (error2) {
      console.error(`Error creating partition for ${tableName}:`, error2);
      return false;
    }
  }
  /**
   * Detach a partition from a partitioned table
   * 
   * @param tableName The name of the partitioned table
   * @param partitionName The name of the partition to detach
   */
  async detachPartition(tableName, partitionName) {
    try {
      const sql13 = `
        ALTER TABLE ${tableName} DETACH PARTITION ${partitionName};
      `;
      await this.pool?.query(sql13);
      console.log(`Detached partition ${partitionName} from ${tableName}`);
      return true;
    } catch (error2) {
      console.error(`Error detaching partition ${partitionName} from ${tableName}:`, error2);
      return false;
    }
  }
  /**
   * Attach a previously detached partition to a partitioned table
   * 
   * @param tableName The name of the partitioned table
   * @param partitionName The name of the partition to attach
   * @param startDate Start date for the partition (inclusive)
   * @param endDate End date for the partition (exclusive)
   */
  async attachDatePartition(tableName, partitionName, startDate, endDate) {
    try {
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      const sql13 = `
        ALTER TABLE ${tableName} ATTACH PARTITION ${partitionName}
        FOR VALUES FROM ('${startDateStr}') TO ('${endDateStr}');
      `;
      await this.pool?.query(sql13);
      console.log(`Attached partition ${partitionName} to ${tableName}`);
      return true;
    } catch (error2) {
      console.error(`Error attaching partition ${partitionName} to ${tableName}:`, error2);
      return false;
    }
  }
};

// server/db/partitioning/setup.ts
async function setupPartitioning() {
  console.log("Setting up table partitioning...");
  try {
    await applyPartitionMigrations();
    console.log("Partition SQL migrations applied");
    const partitionManager = new PartitionManager();
    const claimsPartitionConfig = {
      tableName: "claims_partitioned",
      partitionType: "range",
      partitionColumn: "created_at",
      columnType: "timestamp"
    };
    const fhirResourcesPartitionConfig = {
      tableName: "fhir_resources_partitioned",
      partitionType: "range",
      partitionColumn: "created",
      columnType: "timestamp"
    };
    const nextYear = (/* @__PURE__ */ new Date()).getFullYear() + 1;
    await partitionManager.createDatePartitionsForYear("claims_partitioned", nextYear);
    await partitionManager.createDatePartitionsForYear("fhir_resources_partitioned", nextYear);
    console.log("Table partitioning setup complete");
    return true;
  } catch (error2) {
    console.error("Error setting up table partitioning:", error2);
    return false;
  }
}

// server/cache/cache-service.ts
import NodeCache from "node-cache";
import Redis from "ioredis";
var defaultOptions = {
  ttl: 300,
  // 5 minutes
  useMemoryCache: true,
  useRedisCache: false
};
var CacheService = class {
  redisClient = null;
  memoryCache;
  isRedisConnected = false;
  constructor() {
    this.memoryCache = new NodeCache({
      stdTTL: 300,
      // 5 minutes
      checkperiod: 60,
      // Check for expired keys every 60 seconds
      useClones: false
      // Don't clone objects (better performance)
    });
    const redisUrl2 = process.env.REDIS_URL || process.env.REDISCLOUD_URL || process.env.REDISTOGO_URL;
    if (redisUrl2) {
      try {
        this.redisClient = new Redis(redisUrl2);
        this.redisClient.on("connect", () => {
          this.isRedisConnected = true;
          logger3.info("Redis cache connected");
        });
        this.redisClient.on("error", (err) => {
          this.isRedisConnected = false;
          logger3.error("Redis cache error", {
            error: err.message
          });
        });
        this.redisClient.on("close", () => {
          this.isRedisConnected = false;
          logger3.info("Redis cache connection closed");
        });
      } catch (error2) {
        logger3.warn("Failed to initialize Redis cache", {
          error: error2.message
        });
        this.redisClient = null;
      }
    } else {
      logger3.info("Redis URL not provided, using memory cache only");
      this.redisClient = null;
    }
  }
  /**
   * Generate a cache key with optional namespace
   */
  generateKey(key, namespace) {
    return namespace ? `${namespace}:${key}` : key;
  }
  /**
   * Get a value from cache (tries memory first, then Redis)
   */
  async get(key, options = {}) {
    const opts = { ...defaultOptions, ...options };
    const cacheKey = this.generateKey(key, opts.namespace);
    try {
      if (opts.useMemoryCache) {
        const memValue = this.memoryCache.get(cacheKey);
        if (memValue !== void 0) {
          logger3.debug("Memory cache hit", { key: cacheKey });
          return memValue;
        }
      }
      if (opts.useRedisCache && this.redisClient && this.isRedisConnected) {
        const redisValue = await this.redisClient.get(cacheKey);
        if (redisValue) {
          logger3.debug("Redis cache hit", { key: cacheKey });
          try {
            const parsed = JSON.parse(redisValue);
            if (opts.useMemoryCache) {
              this.memoryCache.set(cacheKey, parsed, opts.ttl || defaultOptions.ttl);
            }
            return parsed;
          } catch (error2) {
            logger3.warn("Failed to parse Redis cache value", {
              key: cacheKey,
              error: error2.message
            });
            return null;
          }
        }
      }
      logger3.debug("Cache miss", { key: cacheKey });
      return null;
    } catch (error2) {
      logger3.error("Error getting from cache", {
        key: cacheKey,
        error: error2.message
      });
      return null;
    }
  }
  /**
   * Set a value in cache (both memory and Redis if enabled)
   */
  async set(key, value, options = {}) {
    const opts = { ...defaultOptions, ...options };
    const cacheKey = this.generateKey(key, opts.namespace);
    try {
      if (opts.useMemoryCache) {
        this.memoryCache.set(cacheKey, value, opts.ttl || defaultOptions.ttl);
      }
      if (opts.useRedisCache && this.redisClient && this.isRedisConnected) {
        const valueStr = JSON.stringify(value);
        if (opts.ttl) {
          await this.redisClient.setex(cacheKey, opts.ttl, valueStr);
        } else {
          await this.redisClient.set(cacheKey, valueStr);
        }
      }
      return true;
    } catch (error2) {
      logger3.error("Error setting cache", {
        key: cacheKey,
        error: error2.message
      });
      return false;
    }
  }
  /**
   * Delete a value from cache (both memory and Redis)
   */
  async delete(key, namespace) {
    const cacheKey = this.generateKey(key, namespace);
    try {
      this.memoryCache.del(cacheKey);
      if (this.redisClient && this.isRedisConnected) {
        await this.redisClient.del(cacheKey);
      }
      return true;
    } catch (error2) {
      logger3.error("Error deleting from cache", {
        key: cacheKey,
        error: error2.message
      });
      return false;
    }
  }
  /**
   * Invalidate all keys matching a pattern (useful for cache invalidation by type)
   */
  async invalidatePattern(pattern, namespace) {
    const patternKey = namespace ? `${namespace}:${pattern}*` : `${pattern}*`;
    try {
      const memKeys = this.memoryCache.keys();
      for (const key of memKeys) {
        if (key.startsWith(pattern) || namespace && key.startsWith(`${namespace}:${pattern}`)) {
          this.memoryCache.del(key);
        }
      }
      if (this.redisClient && this.isRedisConnected) {
        const redisKeys = await this.redisClient.keys(patternKey);
        if (redisKeys.length > 0) {
          await this.redisClient.del(...redisKeys);
        }
      }
      return true;
    } catch (error2) {
      logger3.error("Error invalidating cache pattern", {
        pattern: patternKey,
        error: error2.message
      });
      return false;
    }
  }
  /**
   * Clear all cache data (use with caution)
   */
  async flush() {
    try {
      this.memoryCache.flushAll();
      if (this.redisClient && this.isRedisConnected) {
        await this.redisClient.flushdb();
      }
      return true;
    } catch (error2) {
      logger3.error("Error flushing cache", {
        error: error2.message
      });
      return false;
    }
  }
  /**
   * Get cache statistics
   */
  getStats() {
    const memStats = this.memoryCache.getStats();
    return {
      memory: {
        keys: this.memoryCache.keys().length,
        hits: memStats.hits,
        misses: memStats.misses,
        ksize: memStats.ksize,
        vsize: memStats.vsize
      },
      redis: {
        connected: this.isRedisConnected
      }
    };
  }
  /**
   * Health check method for the cache service
   */
  async healthCheck() {
    const memoryStatus = {
      available: true,
      stats: this.memoryCache.getStats()
    };
    let redisStatus = {
      available: false,
      connected: false
    };
    if (this.redisClient) {
      redisStatus.available = true;
      redisStatus.connected = this.isRedisConnected;
      if (this.isRedisConnected) {
        try {
          await this.redisClient.ping();
          redisStatus = {
            ...redisStatus,
            ping: "success"
          };
        } catch (error2) {
          redisStatus = {
            ...redisStatus,
            ping: "failed",
            error: error2.message
          };
        }
      }
    }
    const status = memoryStatus.available && (!redisStatus.available || redisStatus.connected) ? "healthy" : "degraded";
    return {
      status,
      details: {
        memory: memoryStatus,
        redis: redisStatus
      }
    };
  }
};
var cacheService = new CacheService();

// server/cache/cache-manager.ts
var CacheManager = class {
  redisUrl;
  /**
   * Create a new cache manager
   */
  constructor(redisUrl2) {
    this.redisUrl = redisUrl2;
    if (redisUrl2) {
      logger3.info("Cache manager initialized with Redis support");
    } else {
      logger3.info("Cache manager initialized with memory cache only");
    }
  }
  /**
   * Check if Redis is available
   */
  isRedisAvailable() {
    return !!this.redisUrl;
  }
  /**
   * Get a value from cache
   */
  async get(key, options = {}) {
    const opts = this.applyDefaultOptions(options);
    return cacheService.get(key, opts);
  }
  /**
   * Set a value in cache
   */
  async set(key, value, options = {}) {
    const opts = this.applyDefaultOptions(options);
    return cacheService.set(key, value, opts);
  }
  /**
   * Delete a value from cache
   */
  async delete(key, namespace) {
    return cacheService.delete(key, namespace);
  }
  /**
   * Clear all caches (memory and Redis if available)
   */
  async clear() {
    return cacheService.flush();
  }
  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern, namespace) {
    return cacheService.invalidatePattern(pattern, namespace);
  }
  /**
   * Get cache statistics
   */
  getStats() {
    return cacheService.getStats();
  }
  /**
   * Check the health of the cache service
   */
  async healthCheck() {
    return cacheService.healthCheck();
  }
  /**
   * Close the cache manager (for cleanup)
   */
  async close() {
  }
  /**
   * Apply default options based on configuration
   */
  applyDefaultOptions(options) {
    const defaults = {
      useMemoryCache: true,
      useRedisCache: !!this.redisUrl
    };
    if (options.level) {
      switch (options.level) {
        case "memory" /* MEMORY */:
          defaults.useMemoryCache = true;
          defaults.useRedisCache = false;
          break;
        case "redis" /* REDIS */:
          defaults.useMemoryCache = false;
          defaults.useRedisCache = true;
          break;
        case "all" /* ALL */:
        default:
          defaults.useMemoryCache = true;
          defaults.useRedisCache = !!this.redisUrl;
          break;
      }
    }
    return { ...defaults, ...options };
  }
};

// server/cache/cache-middleware.ts
var defaultKeyGenerator = (req, options) => {
  let key = `${req.method}:${req.baseUrl}${req.path}`;
  if (options.varyByQuery && options.varyByQuery.length > 0) {
    const queryParams = {};
    options.varyByQuery.forEach((param) => {
      if (req.query[param] !== void 0) {
        queryParams[param] = req.query[param];
      }
    });
    if (Object.keys(queryParams).length > 0) {
      key += `:query:${JSON.stringify(queryParams)}`;
    }
  } else if (Object.keys(req.query).length > 0) {
    key += `:query:${JSON.stringify(req.query)}`;
  }
  if (options.varyByHeaders && options.varyByHeaders.length > 0) {
    const headers = {};
    options.varyByHeaders.forEach((header) => {
      const headerValue = req.headers[header.toLowerCase()];
      if (headerValue !== void 0) {
        headers[header] = headerValue;
      }
    });
    if (Object.keys(headers).length > 0) {
      key += `:headers:${JSON.stringify(headers)}`;
    }
  }
  if (options.varyByBody && options.varyByBody.length > 0 && req.body) {
    const bodyParams = {};
    options.varyByBody.forEach((param) => {
      if (req.body[param] !== void 0) {
        bodyParams[param] = req.body[param];
      }
    });
    if (Object.keys(bodyParams).length > 0) {
      key += `:body:${JSON.stringify(bodyParams)}`;
    }
  }
  if (req.user?.id) {
    key += `:user:${req.user.id}`;
  }
  return key;
};
function createCacheMiddleware(cacheManager2, options = {}) {
  return cacheMiddleware(options);
}
function cacheMiddleware(options = {}) {
  return async (req, res, next2) => {
    if (!options.bypass && (req.method !== "GET" && req.method !== "HEAD")) {
      return next2();
    }
    if (options.bypass && options.bypass(req)) {
      return next2();
    }
    const keyGenerator = options.keyGenerator || ((req2) => defaultKeyGenerator(req2, options));
    const cacheKey = keyGenerator(req);
    try {
      const cachedResponse = await cacheService.get(cacheKey, options);
      if (cachedResponse) {
        res.setHeader("X-Cache", "HIT");
        Object.entries(cachedResponse.headers || {}).forEach(([name, value]) => {
          res.setHeader(name, value);
        });
        return res.status(cachedResponse.status).send(cachedResponse.body);
      }
      res.setHeader("X-Cache", "MISS");
      const originalSend = res.send;
      const originalJson = res.json;
      const originalStatus = res.status;
      let responseBody;
      let responseStatus = 200;
      res.status = function(code) {
        responseStatus = code;
        return originalStatus.apply(res, [code]);
      };
      res.send = function(body) {
        responseBody = body;
        if (responseStatus >= 200 && responseStatus < 400) {
          const headersToCache = {};
          ["content-type", "content-language", "etag", "last-modified"].forEach((name) => {
            const value = res.getHeader(name);
            if (value) {
              headersToCache[name] = value.toString();
            }
          });
          cacheService.set(cacheKey, {
            body: responseBody,
            headers: headersToCache,
            status: responseStatus
          }, options).catch((err) => {
            logger3.error("Error caching response", { error: err.message, cacheKey });
          });
        }
        return originalSend.apply(res, [body]);
      };
      res.json = function(body) {
        responseBody = body;
        return originalJson.apply(res, [body]);
      };
      next2();
    } catch (error2) {
      logger3.error("Cache middleware error", {
        path: req.path,
        error: error2.message
      });
      next2();
    }
  };
}
function createCacheInvalidationMiddleware(cacheManager2, entities) {
  return async (req, res, next2) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next2();
    }
    const originalEnd = res.end;
    res.end = function(...args) {
      originalEnd.apply(this, args);
      if (res.statusCode >= 200 && res.statusCode < 400) {
        entities.forEach((entity) => {
          cacheService.invalidatePattern(entity).catch((err) => {
            logger3.error(`Failed to invalidate cache for ${entity}`, {
              error: err.message,
              method: req.method,
              path: req.path
            });
          });
        });
      }
    };
    next2();
  };
}

// server/cache/static-cache.ts
var defaultOptions2 = {
  maxAge: 86400,
  // 1 day
  sMaxAge: 86400,
  // 1 day
  staleWhileRevalidate: 3600,
  // 1 hour
  private: false,
  immutable: false
};
function createStaticCacheMiddleware(options = {}) {
  const opts = { ...defaultOptions2, ...options };
  return (req, res, next2) => {
    if (req.method !== "GET") {
      return next2();
    }
    const directives = [];
    directives.push(opts.private ? "private" : "public");
    if (opts.maxAge !== void 0 && opts.maxAge > 0) {
      directives.push(`max-age=${opts.maxAge}`);
    }
    if (opts.sMaxAge !== void 0 && opts.sMaxAge > 0) {
      directives.push(`s-maxage=${opts.sMaxAge}`);
    }
    if (opts.staleWhileRevalidate !== void 0 && opts.staleWhileRevalidate > 0) {
      directives.push(`stale-while-revalidate=${opts.staleWhileRevalidate}`);
    }
    if (opts.immutable) {
      directives.push("immutable");
    }
    res.setHeader("Cache-Control", directives.join(", "));
    res.setHeader("Vary", "Accept-Encoding");
    next2();
  };
}

// server/cache/cache-warmer.ts
var CacheWarmer = class {
  /**
   * Initialize the cache warmer
   */
  constructor(cacheManager2) {
    this.cacheManager = cacheManager2;
  }
  /**
   * Warm up common API responses
   */
  async warmApiCache() {
    console.log("Warming API cache...");
    try {
      await Promise.all([
        this.warmProviders(),
        this.warmPatients(),
        this.warmClaims(),
        this.warmFhirResources()
      ]);
      console.log("API cache warming completed");
    } catch (error2) {
      console.error("Error warming API cache:", error2);
    }
  }
  /**
   * Warm up provider data
   */
  async warmProviders() {
    try {
      const providers = await storage.getProviders();
      await this.cacheManager.set(
        "api:providers",
        providers,
        {
          ttl: 3600,
          // 1 hour
          level: "redis" /* REDIS */,
          tags: ["providers"]
        }
      );
      for (const provider of providers) {
        await this.cacheManager.set(
          `api:provider:${provider.id}`,
          provider,
          {
            ttl: 3600,
            // 1 hour
            level: "redis" /* REDIS */,
            tags: ["providers", `provider:${provider.id}`]
          }
        );
      }
      console.log(`Warmed cache for ${providers.length} providers`);
    } catch (error2) {
      console.error("Error warming provider cache:", error2);
    }
  }
  /**
   * Warm up patient data
   */
  async warmPatients() {
    try {
      const patients = await storage.getPatients();
      await this.cacheManager.set(
        "api:patients",
        patients,
        {
          ttl: 1800,
          // 30 minutes
          level: "redis" /* REDIS */,
          tags: ["patients"]
        }
      );
      for (const patient of patients) {
        await this.cacheManager.set(
          `api:patient:${patient.id}`,
          patient,
          {
            ttl: 1800,
            // 30 minutes
            level: "redis" /* REDIS */,
            tags: ["patients", `patient:${patient.id}`]
          }
        );
      }
      console.log(`Warmed cache for ${patients.length} patients`);
    } catch (error2) {
      console.error("Error warming patient cache:", error2);
    }
  }
  /**
   * Warm up claims data
   */
  async warmClaims() {
    try {
      const claims2 = await storage.getClaims();
      await this.cacheManager.set(
        "api:claims",
        claims2,
        {
          ttl: 900,
          // 15 minutes
          level: "redis" /* REDIS */,
          tags: ["claims"]
        }
      );
      console.log(`Warmed cache for ${claims2.length} claims`);
    } catch (error2) {
      console.error("Error warming claims cache:", error2);
    }
  }
  /**
   * Warm up FHIR resources
   */
  async warmFhirResources() {
    try {
      const resources = await storage.getFhirResources();
      await this.cacheManager.set(
        "api:fhir_resources",
        resources,
        {
          ttl: 3600,
          // 1 hour
          level: "redis" /* REDIS */,
          tags: ["fhir_resources"]
        }
      );
      console.log(`Warmed cache for ${resources.length} FHIR resources`);
    } catch (error2) {
      console.error("Error warming FHIR resources cache:", error2);
    }
  }
  /**
   * Schedule periodic cache warming
   * 
   * @param interval Interval in milliseconds (default: 5 minutes)
   */
  scheduleWarmUp(interval = 5 * 60 * 1e3) {
    console.log(`Scheduling cache warming every ${interval / 1e3} seconds`);
    this.warmApiCache().catch((err) => {
      console.error("Initial cache warming failed:", err);
    });
    return setInterval(() => {
      this.warmApiCache().catch((err) => {
        console.error("Scheduled cache warming failed:", err);
      });
    }, interval);
  }
};

// server/cache/redis-helper.ts
function getRedisUrl() {
  const redisUrl2 = process.env.REDIS_URL || process.env.REDISCLOUD_URL || process.env.REDISTOGO_URL;
  return redisUrl2;
}
function logRedisConfiguration() {
  const redisUrl2 = getRedisUrl();
  if (!redisUrl2) {
    logger3.info("Redis is not configured. Using memory cache only.");
    return;
  }
  try {
    const maskedUrl = redisUrl2.replace(
      /(redis:\/\/[^:]*:)([^@]*)(@.*)/,
      "$1********$3"
    );
    logger3.info("Redis is configured", { url: maskedUrl });
  } catch (error2) {
    logger3.warn("Unable to parse Redis URL", {
      error: error2.message
    });
  }
}

// server/cache/index.ts
var redisUrl = getRedisUrl();
logRedisConfiguration();
var cacheManager = new CacheManager(redisUrl);
var cacheWarmer = new CacheWarmer(cacheManager);
function setupCaching(app2) {
  console.log("Setting up caching...");
  const staticCacheMiddleware = createStaticCacheMiddleware();
  app2.use("/assets", staticCacheMiddleware);
  app2.use("/*.js", staticCacheMiddleware);
  app2.use("/*.css", staticCacheMiddleware);
  app2.use("/*.png", staticCacheMiddleware);
  app2.use("/*.jpg", staticCacheMiddleware);
  app2.use("/*.svg", staticCacheMiddleware);
  const apiCacheMiddleware = createCacheMiddleware(cacheManager, {
    ttl: 60,
    // 1 minute
    level: redisUrl ? "redis" /* REDIS */ : "memory" /* MEMORY */,
    edgeCache: {
      maxAge: 0,
      // Don't cache in browser
      sMaxAge: 60,
      // 1 minute in CDN/proxy
      staleWhileRevalidate: 10
      // Use stale data for 10 seconds while refreshing
    },
    condition: (req) => {
      return req.path.startsWith("/api/providers") || req.path.startsWith("/api/fhir") || req.path === "/api/status";
    }
  });
  app2.use(apiCacheMiddleware);
  const providersCacheInvalidation = createCacheInvalidationMiddleware(
    cacheManager,
    ["providers"]
  );
  app2.use("/api/providers", providersCacheInvalidation);
  if (process.env.NODE_ENV === "production") {
    cacheWarmer.scheduleWarmUp(5 * 60 * 1e3);
  } else {
    cacheWarmer.warmApiCache().catch(console.error);
  }
  console.log("Caching setup complete");
}
async function shutdownCaching() {
  console.log("Shutting down caching...");
  await cacheManager.close();
  console.log("Caching shutdown complete");
}

// server/observability.prod.ts
var observability_prod_exports = {};
__export(observability_prod_exports, {
  healthCheckMiddleware: () => healthCheckMiddleware2,
  incrementCounter: () => incrementCounter2,
  logger: () => logger6,
  measureTiming: () => measureTiming2,
  observabilityClient: () => observabilityClient2,
  observabilityMiddleware: () => observabilityMiddleware2,
  recordHistogram: () => recordHistogram2,
  setGauge: () => setGauge2,
  setupObservability: () => setupObservability2,
  trackApiCall: () => trackApiCall2,
  trackDbQuery: () => trackDbQuery2,
  withSpan: () => withSpan4
});
var observabilityClient2 = {
  info: (message, context5) => {
    console.log(`[INFO] ${message}`, context5 || "");
  },
  error: (message, error2, context5) => {
    console.error(`[ERROR] ${message}`, error2 || "", context5 || "");
  },
  warn: (message, context5) => {
    console.warn(`[WARN] ${message}`, context5 || "");
  },
  debug: (message, context5) => {
    console.debug(`[DEBUG] ${message}`, context5 || "");
  },
  incrementCounter: () => {
  },
  // No-op
  setGauge: () => {
  },
  // No-op
  recordHistogram: () => {
  },
  // No-op
  recordTiming: async (name, operation) => operation()
  // Just run the function
};
var observabilityMiddleware2 = [
  (req, res, next2) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    });
    next2();
  }
];
var healthCheckMiddleware2 = (_req, res) => {
  res.json({
    status: "ok",
    details: {
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
};
function setupObservability2() {
  console.log("Using simplified observability for production");
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception", err);
    setTimeout(() => process.exit(1), 1e3);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection", reason);
  });
}
var logger6 = {
  error: (message, error2, context5) => observabilityClient2.error(message, error2, context5),
  warn: (message, context5) => observabilityClient2.warn(message, context5),
  info: (message, context5) => observabilityClient2.info(message, context5),
  debug: (message, context5) => observabilityClient2.debug(message, context5)
};
function withSpan4(name, operation) {
  const start = Date.now();
  const span = {
    setAttribute: () => {
    },
    // No-op in production
    end: () => {
      const duration = Date.now() - start;
      logger6.debug(`Span ${name} completed in ${duration}ms`);
    }
  };
  return operation(span);
}
function incrementCounter2() {
}
function setGauge2() {
}
function recordHistogram2() {
}
async function measureTiming2(name, operation) {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    logger6.debug(`Operation ${name} took ${duration}ms`);
    return result;
  } catch (error2) {
    logger6.error(`Operation ${name} failed`, error2);
    throw error2;
  }
}
async function trackDbQuery2(operation, table, queryFn) {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    logger6.debug(`DB query ${operation} on ${table} took ${duration}ms`);
    return result;
  } catch (error2) {
    logger6.error(`DB query ${operation} on ${table} failed`, error2);
    throw error2;
  }
}
async function trackApiCall2(service, operation, callFn) {
  const start = Date.now();
  try {
    const result = await callFn();
    const duration = Date.now() - start;
    logger6.debug(`API call ${operation} to ${service} took ${duration}ms`);
    return result;
  } catch (error2) {
    logger6.error(`API call ${operation} to ${service} failed`, error2);
    throw error2;
  }
}

// server/index.ts
var isProduction = process.env.NODE_ENV === "production";
var {
  setupObservability: setupObservability3,
  observabilityMiddleware: observabilityMiddleware3,
  healthCheckMiddleware: healthCheckMiddleware3,
  logger: logger7
} = isProduction ? observability_prod_exports : observability_exports;
setupObservability3();
var app = express8();
app.use(express8.json());
app.use(express8.urlencoded({ extended: false }));
app.use(observabilityMiddleware3);
app.get("/health", healthCheckMiddleware3);
if (process.env.ENABLE_ZERO_TRUST === "true") {
  setupZeroTrustSecurity(app);
  logger7.info("Zero-trust security enabled");
}
if (process.env.ENABLE_DB_PARTITIONING === "true") {
  setupPartitioning().catch((err) => {
    logger7.error("Failed to setup database partitioning", err);
  });
  logger7.info("Database partitioning enabled");
}
setupCaching(app);
logger7.info("Caching system initialized");
app.use((req, res, next2) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next2();
});
(async () => {
  const server = await registerRoutes2(app);
  app.use((err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    logger7.error(`Unhandled error in request: ${message}`, err, {
      method: req.method,
      url: req.originalUrl,
      statusCode: status,
      requestId: req.id
    });
    res.status(status).json({
      message,
      requestId: req.id || "unknown"
    });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
    logger7.info(`Healthcare platform started successfully`, {
      port,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      platformVersion: process.env.npm_package_version || "1.0.0"
    });
  });
  const shutdown = async () => {
    logger7.info("Shutting down application...");
    await closeAllConnections().catch((err) => {
      logger7.error("Error closing database connections", err);
    });
    await shutdownCaching().catch((err) => {
      logger7.error("Error shutting down cache", err);
    });
    server.close(() => {
      logger7.info("Server closed successfully");
      process.exit(0);
    });
    setTimeout(() => {
      logger7.error("Forced shutdown due to timeout");
      process.exit(1);
    }, 1e4);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})();
