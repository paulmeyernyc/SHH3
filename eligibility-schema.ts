import { pgTable, serial, integer, varchar, json, boolean, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enum for request status
export const eligibilityRequestStatusEnum = pgEnum('eligibility_request_status', [
  'pending',
  'processing', 
  'completed',
  'failed',
  'cached'
]);

// Enum for eligibility source
export const eligibilitySourceEnum = pgEnum('eligibility_source', [
  'fhir',
  'x12',
  'internal'
]);

// Enum for purpose
export const purposeEnum = pgEnum('eligibility_purpose', [
  'benefits',
  'discovery',
  'validation'
]);

// Eligibility request table
export const eligibilityRequests = pgTable('eligibility_requests', {
  id: serial('id').primaryKey(),
  
  // Request metadata
  transactionId: varchar('transaction_id', { length: 255 }).notNull().unique(),
  status: eligibilityRequestStatusEnum('status').notNull().default('pending'),
  source: eligibilitySourceEnum('source').notNull(),
  purpose: purposeEnum('purpose').array(),
  
  // Patient and coverage information
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  subscriberId: varchar('subscriber_id', { length: 255 }),
  insurerId: varchar('insurer_id', { length: 255 }).notNull(),
  coverageId: varchar('coverage_id', { length: 255 }),
  servicedDate: varchar('serviced_date', { length: 50 }),
  
  // Service types being checked
  serviceTypes: varchar('service_types', { length: 50 }).array(),
  
  // Request payload storage
  requestPayload: json('request_payload').notNull(), // Store the full FHIR resource or X12 contents
  rawRequestData: text('raw_request_data'), // Store the original incoming data (especially for X12)
  
  // Metadata for tracking and auditing
  createdBy: integer('created_by').notNull(), // UserID who initiated the request
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  
  // Request origin tracking
  requestedByOrganizationId: varchar('requested_by_organization_id', { length: 255 }),
  requestedBySystemId: varchar('requested_by_system_id', { length: 255 }),
  
  // External payer tracking
  forwardedToPayerId: varchar('forwarded_to_payer_id', { length: 255 }),
  forwardedToClearinghouseId: varchar('forwarded_to_clearinghouse_id', { length: 255 }),
  forwardedAt: timestamp('forwarded_at'),
  
  // For async processing - track retry attempts
  retryCount: integer('retry_count').default(0),
  nextRetryAt: timestamp('next_retry_at'),
});

// Eligibility response table
export const eligibilityResponses = pgTable('eligibility_responses', {
  id: serial('id').primaryKey(),
  
  // Link to the request
  requestId: integer('request_id').notNull().references(() => eligibilityRequests.id),
  
  // Response data
  status: varchar('status', { length: 50 }).notNull(), // active, cancelled, etc.
  outcome: varchar('outcome', { length: 50 }), // e.g., complete, error, partial
  disposition: varchar('disposition', { length: 255 }), // any special handling notes
  
  // Time validity of this response
  servicesFromDate: varchar('services_from_date', { length: 50 }),
  servicesToDate: varchar('services_to_date', { length: 50 }),
  
  // Core response data storage
  responsePayload: json('response_payload').notNull(), // Full FHIR resource or processed X12 data
  rawResponseData: text('raw_response_data'), // Original response data, especially for X12
  
  // Response metadata
  receivedAt: timestamp('received_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
  
  // Cache control
  isCached: boolean('is_cached').default(false),
  cacheExpiresAt: timestamp('cache_expires_at'),
  
  // Patient financial data
  patientResponsibility: json('patient_responsibility'), // Structured co-pays, deductibles info
  
  // Custom meta information
  isActive: boolean('is_active').default(true),
  inactiveReason: varchar('inactive_reason', { length: 255 }),
  
  // Error details if response indicates problems
  hasErrors: boolean('has_errors').default(false),
  errorDetails: json('error_details'),
});

// Benefits information extracted from responses
export const eligibilityBenefits = pgTable('eligibility_benefits', {
  id: serial('id').primaryKey(),
  
  // Link to the response
  responseId: integer('response_id').notNull().references(() => eligibilityResponses.id),
  
  // Benefit category information
  benefitType: varchar('benefit_type', { length: 255 }).notNull(), // e.g. medical, dental, vision
  serviceType: varchar('service_type', { length: 255 }).notNull(), // specific service code
  serviceTypeName: varchar('service_type_name', { length: 255 }), // human-readable service name
  
  // Coverage details
  isCovered: boolean('is_covered'), // true, false, or null if unknown
  networkStatus: varchar('network_status', { length: 50 }), // in-network, out-network
  unit: varchar('unit', { length: 50 }), // visit, day, year, etc.
  
  // Financial details
  copayAmount: integer('copay_amount'),
  copayPercentage: integer('copay_percentage'),
  coinsurancePercentage: integer('coinsurance_percentage'),
  deductibleAmount: integer('deductible_amount'),
  deductibleRemaining: integer('deductible_remaining'),
  outOfPocketAmount: integer('out_of_pocket_amount'),
  outOfPocketRemaining: integer('out_of_pocket_remaining'),
  
  // Benefit limits
  benefitDescription: varchar('benefit_description', { length: 1000 }),
  limitValue: integer('limit_value'),
  limitUnit: varchar('limit_unit', { length: 50 }),
  usedValue: integer('used_value'),
  remainingValue: integer('remaining_value'),
  
  // Authorization details
  authorizationRequired: boolean('authorization_required'),
  authorizationDetails: varchar('authorization_details', { length: 1000 }),
  
  // Additional information
  additionalInfo: json('additional_info'),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// Eligibility cache table for quick lookups
export const eligibilityCache = pgTable('eligibility_cache', {
  id: serial('id').primaryKey(),
  
  // Cache key components for lookup
  subscriberId: varchar('subscriber_id', { length: 255 }).notNull(),
  payerId: varchar('payer_id', { length: 255 }).notNull(),
  serviceType: varchar('service_type', { length: 255 }),
  servicedDate: varchar('serviced_date', { length: 50 }),
  
  // Link to the response that's cached
  responseId: integer('response_id').notNull().references(() => eligibilityResponses.id),
  
  // Cache metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  
  // Additional tracking
  hitCount: integer('hit_count').default(0),
  lastHitAt: timestamp('last_hit_at'),
});

// Eligibility payer routing rules
export const eligibilityPayerRouting = pgTable('eligibility_payer_routing', {
  id: serial('id').primaryKey(),
  
  // Payer identification
  payerId: varchar('payer_id', { length: 255 }).notNull().unique(),
  payerName: varchar('payer_name', { length: 255 }).notNull(),
  
  // Connection type
  useDirectFhir: boolean('use_direct_fhir').default(false),
  useClearinghouse: boolean('use_clearinghouse').default(true),
  
  // Connection details
  fhirEndpoint: varchar('fhir_endpoint', { length: 1000 }),
  clearinghouseId: varchar('clearinghouse_id', { length: 255 }),
  
  // Credentials (references to secure credential storage)
  credentialId: varchar('credential_id', { length: 255 }),
  
  // Payer-specific formatting rules
  formattingRules: json('formatting_rules'),
  
  // Metadata
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  
  // Rate limiting/throttling settings
  maxRequestsPerMinute: integer('max_requests_per_minute'),
  throttlingEnabled: boolean('throttling_enabled').default(false),
});

// Clearinghouse configuration
export const eligibilityClearinghouses = pgTable('eligibility_clearinghouses', {
  id: serial('id').primaryKey(),
  
  // Clearinghouse identification
  clearinghouseId: varchar('clearinghouse_id', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  
  // Connection details
  endpoint: varchar('endpoint', { length: 1000 }).notNull(),
  protocolType: varchar('protocol_type', { length: 50 }).notNull(), // SOAP, REST, SFTP, etc.
  
  // Credentials (references to secure credential storage)
  credentialId: varchar('credential_id', { length: 255 }),
  
  // Configuration settings
  configSettings: json('config_settings'),
  
  // Metadata
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// Audit log for all eligibility transactions
export const eligibilityAuditLogs = pgTable('eligibility_audit_logs', {
  id: serial('id').primaryKey(),
  
  // Transaction links
  requestId: integer('request_id').references(() => eligibilityRequests.id),
  responseId: integer('response_id').references(() => eligibilityResponses.id),
  
  // Event details
  eventType: varchar('event_type', { length: 100 }).notNull(), // request_received, forwarded, response_received, etc.
  eventTimestamp: timestamp('event_timestamp').notNull().defaultNow(),
  
  // Actor information
  actorId: integer('actor_id'), // UserID or system ID
  actorType: varchar('actor_type', { length: 50 }), // user, system, payer, clearinghouse
  
  // Event details
  eventDetails: json('event_details'),
  statusCode: varchar('status_code', { length: 50 }),
  
  // Source IP and other metadata
  sourceIp: varchar('source_ip', { length: 50 }),
  userAgent: varchar('user_agent', { length: 500 }),
});

// Zod schemas for validation
export const insertEligibilityRequestSchema = createInsertSchema(eligibilityRequests);
export const selectEligibilityRequestSchema = createSelectSchema(eligibilityRequests);

export const insertEligibilityResponseSchema = createInsertSchema(eligibilityResponses);
export const selectEligibilityResponseSchema = createSelectSchema(eligibilityResponses);

export const insertEligibilityBenefitSchema = createInsertSchema(eligibilityBenefits);
export const selectEligibilityBenefitSchema = createSelectSchema(eligibilityBenefits);

export const insertEligibilityCacheSchema = createInsertSchema(eligibilityCache);
export const selectEligibilityCacheSchema = createSelectSchema(eligibilityCache);

export const insertEligibilityPayerRoutingSchema = createInsertSchema(eligibilityPayerRouting);
export const selectEligibilityPayerRoutingSchema = createSelectSchema(eligibilityPayerRouting);

export const insertEligibilityClearinghouseSchema = createInsertSchema(eligibilityClearinghouses);
export const selectEligibilityClearinghouseSchema = createSelectSchema(eligibilityClearinghouses);

export const insertEligibilityAuditLogSchema = createInsertSchema(eligibilityAuditLogs);
export const selectEligibilityAuditLogSchema = createSelectSchema(eligibilityAuditLogs);

// Types (from zod schemas)
export type EligibilityRequest = z.infer<typeof selectEligibilityRequestSchema>;
export type InsertEligibilityRequest = z.infer<typeof insertEligibilityRequestSchema>;

export type EligibilityResponse = z.infer<typeof selectEligibilityResponseSchema>;
export type InsertEligibilityResponse = z.infer<typeof insertEligibilityResponseSchema>;

export type EligibilityBenefit = z.infer<typeof selectEligibilityBenefitSchema>;
export type InsertEligibilityBenefit = z.infer<typeof insertEligibilityBenefitSchema>;

export type EligibilityCache = z.infer<typeof selectEligibilityCacheSchema>;
export type InsertEligibilityCache = z.infer<typeof insertEligibilityCacheSchema>;

export type EligibilityPayerRouting = z.infer<typeof selectEligibilityPayerRoutingSchema>;
export type InsertEligibilityPayerRouting = z.infer<typeof insertEligibilityPayerRoutingSchema>;

export type EligibilityClearinghouse = z.infer<typeof selectEligibilityClearinghouseSchema>;
export type InsertEligibilityClearinghouse = z.infer<typeof insertEligibilityClearinghouseSchema>;

export type EligibilityAuditLog = z.infer<typeof selectEligibilityAuditLogSchema>;
export type InsertEligibilityAuditLog = z.infer<typeof insertEligibilityAuditLogSchema>;

// FHIR schemas for validation

// CoverageEligibilityRequest schema
export const fhirCoverageEligibilityRequestSchema = z.object({
  resourceType: z.literal('CoverageEligibilityRequest'),
  id: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'draft', 'entered-in-error']),
  purpose: z.array(z.enum(['auth-requirements', 'benefits', 'discovery', 'validation'])),
  patient: z.object({
    reference: z.string()
  }),
  servicedDate: z.string().optional(),
  servicedPeriod: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  created: z.string().optional(),
  enterer: z.object({
    reference: z.string()
  }).optional(),
  provider: z.object({
    reference: z.string()
  }).optional(),
  insurer: z.object({
    reference: z.string()
  }),
  facility: z.object({
    reference: z.string()
  }).optional(),
  coverage: z.array(z.object({
    reference: z.string()
  })).optional(),
  item: z.array(z.object({
    category: z.object({
      coding: z.array(z.object({
        system: z.string(),
        code: z.string(),
        display: z.string().optional()
      }))
    }).optional(),
    productOrService: z.object({
      coding: z.array(z.object({
        system: z.string(),
        code: z.string(),
        display: z.string().optional()
      }))
    }).optional(),
    diagnosis: z.array(z.object({
      diagnosisCodeableConcept: z.object({
        coding: z.array(z.object({
          system: z.string(),
          code: z.string(),
          display: z.string().optional()
        }))
      }).optional()
    })).optional(),
  })).optional()
});

// CoverageEligibilityResponse schema
export const fhirCoverageEligibilityResponseSchema = z.object({
  resourceType: z.literal('CoverageEligibilityResponse'),
  id: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'draft', 'entered-in-error']),
  purpose: z.array(z.enum(['auth-requirements', 'benefits', 'discovery', 'validation'])),
  patient: z.object({
    reference: z.string()
  }),
  servicedDate: z.string().optional(),
  servicedPeriod: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  created: z.string(),
  requestor: z.object({
    reference: z.string()
  }).optional(),
  request: z.object({
    reference: z.string()
  }),
  outcome: z.enum(['queued', 'complete', 'error', 'partial']),
  disposition: z.string().optional(),
  insurer: z.object({
    reference: z.string()
  }),
  insurance: z.array(z.object({
    coverage: z.object({
      reference: z.string()
    }),
    inforce: z.boolean().optional(),
    benefitPeriod: z.object({
      start: z.string(),
      end: z.string()
    }).optional(),
    item: z.array(z.object({
      category: z.object({
        coding: z.array(z.object({
          system: z.string(),
          code: z.string(),
          display: z.string().optional()
        }))
      }).optional(),
      productOrService: z.object({
        coding: z.array(z.object({
          system: z.string(),
          code: z.string(),
          display: z.string().optional()
        }))
      }).optional(),
      network: z.object({
        coding: z.array(z.object({
          system: z.string(),
          code: z.string(),
          display: z.string().optional()
        }))
      }).optional(),
      unit: z.object({
        coding: z.array(z.object({
          system: z.string(),
          code: z.string(),
          display: z.string().optional()
        }))
      }).optional(),
      term: z.object({
        coding: z.array(z.object({
          system: z.string(),
          code: z.string(),
          display: z.string().optional()
        }))
      }).optional(),
      benefit: z.array(z.object({
        type: z.object({
          coding: z.array(z.object({
            system: z.string(),
            code: z.string(),
            display: z.string().optional()
          }))
        }),
        allowedUnsignedInt: z.number().int().optional(),
        allowedString: z.string().optional(),
        allowedMoney: z.object({
          value: z.number(),
          currency: z.string()
        }).optional(),
        usedUnsignedInt: z.number().int().optional(),
        usedMoney: z.object({
          value: z.number(),
          currency: z.string()
        }).optional()
      })),
      authorizationRequired: z.boolean().optional(),
      authorizationUrl: z.string().optional(),
      authorizationSupporting: z.array(z.object({
        coding: z.array(z.object({
          system: z.string(),
          code: z.string(),
          display: z.string().optional()
        }))
      })).optional()
    })).optional()
  })),
  form: z.object({
    coding: z.array(z.object({
      system: z.string(),
      code: z.string(),
      display: z.string().optional()
    }))
  }).optional(),
  error: z.array(z.object({
    coding: z.array(z.object({
      system: z.string(),
      code: z.string(),
      display: z.string().optional()
    }))
  })).optional()
});

// Export the FHIR schemas 
export type FhirCoverageEligibilityRequest = z.infer<typeof fhirCoverageEligibilityRequestSchema>;
export type FhirCoverageEligibilityResponse = z.infer<typeof fhirCoverageEligibilityResponseSchema>;