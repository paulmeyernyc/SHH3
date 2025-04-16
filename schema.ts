import { pgTable, serial, text, json, jsonb, timestamp, integer, boolean, real, uuid, primaryKey, date, varchar, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * Users Table Schema
 * Stores user authentication information
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').default('user')
});

/**
 * Enhanced Providers Table Schema
 * Stores provider/practitioner information aligned with FHIR Practitioner
 */
export const enhancedProviders = pgTable('enhanced_providers', {
  id: serial('id').primaryKey(),
  providerId: text('provider_id').notNull().unique(),
  personId: integer('person_id'),
  identifier: jsonb('identifier'), // Array of identifiers (includes NPI, etc.)
  active: boolean('active').default(true),
  name: jsonb('name').notNull(), // Structured name with given, family, etc.
  formattedName: text('formatted_name'), // Pre-formatted display name
  telecom: jsonb('telecom'), // Array of contact points
  gender: text('gender'),
  birthDate: timestamp('birth_date'),
  address: jsonb('address'), // Array of addresses
  photo: text('photo'), // URL to photo
  qualification: jsonb('qualification'), // Array of qualifications
  communication: jsonb('communication'), // Array of languages
  specialties: jsonb('specialties'), // Array of specialties
  organizationIds: jsonb('organization_ids'), // Array of organization references
  npi: text('npi'), // National Provider Identifier
  taxonomyCodes: jsonb('taxonomy_codes'), // Array of taxonomy codes
  status: text('status').default('active'),
  statusReason: text('status_reason'),
  metadata: jsonb('metadata'), // Additional metadata
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Organizations Table Schema
 * Stores organization information aligned with FHIR Organization
 */
export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  organizationId: text('organization_id').notNull().unique(),
  active: boolean('active').default(true),
  type: jsonb('type'), // Array of organization types
  name: text('name').notNull(),
  alias: jsonb('alias'), // Array of alternative names
  telecom: jsonb('telecom'), // Array of contact points
  address: jsonb('address'), // Array of addresses
  partOf: text('part_of'), // Reference to parent organization
  contact: jsonb('contact'), // Array of contacts
  npi: text('npi'), // National Provider Identifier
  ein: text('ein'), // Employer Identification Number
  taxonomy: jsonb('taxonomy'), // Array of taxonomy codes
  status: text('status').default('active'),
  statusReason: text('status_reason'),
  website: text('website'),
  serviceArea: jsonb('service_area'), // Array of service area references
  metadata: jsonb('metadata'), // Additional metadata
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Locations Table Schema
 * Stores location information aligned with FHIR Location
 */
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  locationId: text('location_id').notNull().unique(),
  status: text('status').default('active'),
  operationalStatus: text('operational_status'),
  name: text('name').notNull(),
  alias: jsonb('alias'), // Array of alternative names
  description: text('description'),
  mode: text('mode').default('instance'),
  type: jsonb('type'), // Array of location types
  telecom: jsonb('telecom'), // Array of contact points
  address: jsonb('address'), // Address object
  physicalType: text('physical_type'),
  position: jsonb('position'), // Latitude/longitude/altitude
  managingOrganization: text('managing_organization'), // Reference to organization
  partOf: text('part_of'), // Reference to parent location
  hoursOfOperation: jsonb('hours_of_operation'),
  availabilityExceptions: text('availability_exceptions'),
  tags: jsonb('tags'), // Array of tag names
  npi: text('npi'), // National Provider Identifier
  facilityId: text('facility_id'), // Reference to facility
  isConfidential: boolean('is_confidential').default(false),
  metadata: jsonb('metadata'), // Additional metadata
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Facilities Table Schema
 * Stores facility information aligned with FHIR Location with facility extensions
 */
export const facilities = pgTable('facilities', {
  id: serial('id').primaryKey(),
  facilityId: text('facility_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  npi: text('npi'), // National Provider Identifier
  facilityType: jsonb('facility_type').notNull(), // Array of facility types
  status: text('status').default('active'),
  statusReason: text('status_reason'),
  alias: jsonb('alias'), // Array of alternative names
  partOf: text('part_of'), // Reference to parent facility
  address: jsonb('address').notNull(), // Address object
  telecom: jsonb('telecom'), // Array of contact points
  organizationId: text('organization_id').notNull(), // Reference to managing organization
  locationIds: jsonb('location_ids'), // Array of location references
  services: jsonb('services'), // Array of services offered
  licenses: jsonb('licenses'), // Array of licenses
  accreditations: jsonb('accreditations'), // Array of accreditations
  hoursOfOperation: jsonb('hours_of_operation'),
  availabilityExceptions: text('availability_exceptions'),
  capacity: jsonb('capacity'), // Capacity details (beds, rooms, etc)
  specialtyTypes: jsonb('specialty_types'), // Array of specialty types
  website: text('website'),
  emergencyContact: jsonb('emergency_contact'), // ContactPoint
  tags: jsonb('tags'), // Array of tag names
  metadata: jsonb('metadata'), // Additional metadata
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Pharmacies Table Schema
 * Stores pharmacy information aligned with FHIR Organization with pharmacy extensions
 */
export const pharmacies = pgTable('pharmacies', {
  id: serial('id').primaryKey(),
  pharmacyId: text('pharmacy_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  npi: text('npi'), // National Provider Identifier
  ncpdpId: text('ncpdp_id'), // NCPDP ID
  pharmacyType: jsonb('pharmacy_type').notNull(), // Array of pharmacy types
  status: text('status').default('active'),
  statusReason: text('status_reason'),
  alias: jsonb('alias'), // Array of alternative names
  partOf: text('part_of'), // Reference to parent organization
  address: jsonb('address').notNull(), // Address object
  telecom: jsonb('telecom'), // Array of contact points
  organizationId: text('organization_id'), // Reference to managing organization
  locationId: text('location_id'), // Reference to physical location
  services: jsonb('services'), // Array of services offered
  licenses: jsonb('licenses'), // Array of licenses
  hoursOfOperation: jsonb('hours_of_operation'),
  is24Hour: boolean('is_24_hour').default(false),
  hasDelivery: boolean('has_delivery').default(false),
  hasDriveThru: boolean('has_drive_thru').default(false),
  deliveryRadius: real('delivery_radius'),
  acceptsInsurance: boolean('accepts_insurance').default(true),
  acceptedInsurances: jsonb('accepted_insurances'), // Array of accepted insurance IDs
  hasCompounding: boolean('has_compounding').default(false),
  supportsEPrescribing: boolean('supports_e_prescribing').default(true),
  website: text('website'),
  emergencyContact: jsonb('emergency_contact'), // ContactPoint
  tags: jsonb('tags'), // Array of tag names
  metadata: jsonb('metadata'), // Additional metadata
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Payers Table Schema
 * Stores payer information aligned with FHIR Organization with payer extensions
 */
export const payers = pgTable('payers', {
  id: serial('id').primaryKey(),
  payerId: text('payer_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  payerType: jsonb('payer_type').notNull(), // Array of payer types
  status: text('status').default('active'),
  statusReason: text('status_reason'),
  alias: jsonb('alias'), // Array of alternative names
  partOf: text('part_of'), // Reference to parent organization
  address: jsonb('address'), // Array of addresses
  telecom: jsonb('telecom'), // Array of contact points
  taxId: text('tax_id'),
  nationalId: text('national_id'), // National payer ID
  contactMethods: jsonb('contact_methods'), // Specialized contact information
  insurancePlans: jsonb('insurance_plans'), // Array of insurance plans
  serviceAreas: jsonb('service_areas'), // Array of service areas
  website: text('website'),
  tags: jsonb('tags'), // Array of tag names
  metadata: jsonb('metadata'), // Additional metadata
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Employers Table Schema
 * Stores employer information aligned with FHIR Organization with employer extensions
 */
export const employers = pgTable('employers', {
  id: serial('id').primaryKey(),
  employerId: text('employer_id').notNull().unique(),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  description: text('description'),
  ein: text('ein'), // Employer Identification Number
  naicsCode: text('naics_code'), // North American Industry Classification System
  businessType: text('business_type').notNull(),
  employerSize: text('employer_size').notNull(),
  website: text('website'),
  foundedYear: integer('founded_year'),
  status: text('status').default('active'),
  statusReason: text('status_reason'),
  alias: jsonb('alias'), // Array of alternative names
  partOf: text('part_of'), // Reference to parent organization
  address: jsonb('address').notNull(), // Array of addresses
  telecom: jsonb('telecom'), // Array of contact points
  locations: jsonb('locations'), // Array of location objects
  benefitPlans: jsonb('benefit_plans'), // Array of benefit plans
  demographics: jsonb('demographics'), // Employee demographics
  brokers: jsonb('brokers'), // Array of brokers
  renewalMonth: integer('renewal_month'), // Month when benefits renew (1-12)
  primaryContactInfo: jsonb('primary_contact_info'), // Array of primary contacts
  tags: jsonb('tags'), // Array of tag names
  metadata: jsonb('metadata'), // Additional metadata
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Directory Connections Table Schema
 * Stores connections to external systems for directory synchronization
 */
export const directoryConnections = pgTable('directory_connections', {
  id: serial('id').primaryKey(),
  connectionId: text('connection_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  organization: jsonb('organization').notNull(), // Organization info
  status: text('status').default('pending'),
  statusReason: text('status_reason'),
  apiEndpoint: text('api_endpoint'),
  apiVersion: text('api_version'),
  authType: text('auth_type').notNull(),
  authDetails: jsonb('auth_details').notNull(),
  connectors: jsonb('connectors').default([]), // Array of entity connectors
  contacts: jsonb('contacts'), // Array of contact persons
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  tags: jsonb('tags'), // Array of tag names
  metadata: jsonb('metadata') // Additional metadata
});

/**
 * Identity Mappings Table Schema
 * Maps external identifiers to internal identifiers
 */
export const identityMappings = pgTable('identity_mappings', {
  id: serial('id').primaryKey(),
  mappingId: text('mapping_id').notNull().unique(),
  entityType: text('entity_type').notNull(),
  externalId: text('external_id').notNull(),
  externalIdSystem: text('external_id_system').notNull(),
  internalId: text('internal_id').notNull(),
  internalIdSystem: text('internal_id_system').default('SHH'),
  connectionId: text('connection_id').notNull(),
  confidence: real('confidence'),
  status: text('status').default('active'),
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow(),
  metadata: jsonb('metadata') // Additional metadata
});

/**
 * Sync Jobs Table Schema
 * Tracks synchronization jobs
 */
export const syncJobs = pgTable('sync_jobs', {
  id: serial('id').primaryKey(),
  jobId: text('job_id').notNull().unique(),
  connectionId: text('connection_id').notNull(),
  entityType: text('entity_type').notNull(),
  direction: text('direction').notNull(), // 'push' or 'pull'
  status: text('status').default('queued'),
  statusMessage: text('status_message'),
  totalRecords: integer('total_records').default(0),
  processedRecords: integer('processed_records').default(0),
  successRecords: integer('success_records').default(0),
  failedRecords: integer('failed_records').default(0),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  createdBy: text('created_by'),
  metadata: jsonb('metadata') // Additional metadata
});

/**
 * Conflict Records Table Schema
 * Stores synchronization conflicts for manual resolution
 */
export const conflictRecords = pgTable('conflict_records', {
  id: serial('id').primaryKey(),
  conflictId: text('conflict_id').notNull().unique(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  connectionId: text('connection_id').notNull(),
  conflictType: text('conflict_type').notNull(),
  conflictReason: text('conflict_reason').notNull(),
  externalData: jsonb('external_data').notNull(),
  internalData: jsonb('internal_data').notNull(),
  resolution: text('resolution').default('pending'),
  resolutionData: jsonb('resolution_data'),
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  created: timestamp('created').defaultNow(),
  metadata: jsonb('metadata') // Additional metadata
});

/**
 * Webhook Subscriptions Table Schema
 * Manages webhook subscriptions for directory entities
 */
export const webhookSubscriptions = pgTable('webhook_subscriptions', {
  id: serial('id').primaryKey(),
  subscriptionId: text('subscription_id').notNull().unique(),
  connectionId: text('connection_id').notNull(),
  entityTypes: jsonb('entity_types').notNull(), // Array of entity types
  triggerEvents: jsonb('trigger_events').notNull(), // Array of event types
  targetUrl: text('target_url').notNull(),
  secret: text('secret'),
  active: boolean('active').default(true),
  description: text('description'),
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow(),
  createdBy: text('created_by'),
  headers: jsonb('headers'), // Custom headers
  retryPolicy: jsonb('retry_policy'), // Retry configuration
  metadata: jsonb('metadata') // Additional metadata
});

/**
 * Insert schemas for validation
 */
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertEnhancedProviderSchema = createInsertSchema(enhancedProviders).omit({ id: true, created: true, updated: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, created: true, updated: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, created: true, updated: true });
export const insertFacilitySchema = createInsertSchema(facilities).omit({ id: true, created: true, updated: true });
export const insertPharmacySchema = createInsertSchema(pharmacies).omit({ id: true, created: true, updated: true });
export const insertPayerSchema = createInsertSchema(payers).omit({ id: true, created: true, updated: true });
export const insertEmployerSchema = createInsertSchema(employers).omit({ id: true, created: true, updated: true });
export const insertDirectoryConnectionSchema = createInsertSchema(directoryConnections).omit({ id: true, created: true, updated: true });
export const insertIdentityMappingSchema = createInsertSchema(identityMappings).omit({ id: true, created: true, updated: true });
export const insertSyncJobSchema = createInsertSchema(syncJobs).omit({ id: true });
export const insertConflictRecordSchema = createInsertSchema(conflictRecords).omit({ id: true, created: true });
export const insertWebhookSubscriptionSchema = createInsertSchema(webhookSubscriptions).omit({ id: true, created: true, updated: true });

/**
 * Type definitions
 */
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type EnhancedProvider = typeof enhancedProviders.$inferSelect;
export type InsertEnhancedProvider = z.infer<typeof insertEnhancedProviderSchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;

export type Pharmacy = typeof pharmacies.$inferSelect;
export type InsertPharmacy = z.infer<typeof insertPharmacySchema>;

export type Payer = typeof payers.$inferSelect;
export type InsertPayer = z.infer<typeof insertPayerSchema>;

export type Employer = typeof employers.$inferSelect;
export type InsertEmployer = z.infer<typeof insertEmployerSchema>;

export type DirectoryConnection = typeof directoryConnections.$inferSelect;
export type InsertDirectoryConnection = z.infer<typeof insertDirectoryConnectionSchema>;

export type IdentityMapping = typeof identityMappings.$inferSelect;
export type InsertIdentityMapping = z.infer<typeof insertIdentityMappingSchema>;

export type SyncJob = typeof syncJobs.$inferSelect;
export type InsertSyncJob = z.infer<typeof insertSyncJobSchema>;

export type ConflictRecord = typeof conflictRecords.$inferSelect;
export type InsertConflictRecord = z.infer<typeof insertConflictRecordSchema>;

export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type InsertWebhookSubscription = z.infer<typeof insertWebhookSubscriptionSchema>;

/**
 * Code Systems Table Schema
 * Stores metadata about terminology code systems (SNOMED CT, LOINC, etc.)
 */
export const codeSystems = pgTable('code_systems', {
  id: serial('id').primaryKey(),
  codeSystemId: text('code_system_id').notNull().unique(),  // e.g., "snomed", "loinc"
  uri: text('uri').notNull().unique(),             // Official URI for the code system
  name: text('name').notNull(),                   // Display name
  version: text('version').notNull(),             // Version identifier
  description: text('description'),               // Description
  publisher: text('publisher'),                   // Publisher organization
  copyright: text('copyright'),                   // Copyright statement
  contentType: text('content_type').notNull(),    // "complete"|"fragment"|"supplement"
  isHierarchical: boolean('is_hierarchical').default(false), // Has hierarchy
  hasSubsumption: boolean('has_subsumption').default(false), // Supports subsumption
  licenseRequired: boolean('license_required').default(false), // License needed
  isProprietary: boolean('is_proprietary').default(false), // Proprietary system
  active: boolean('active').default(true),        // Currently active
  releaseDate: timestamp('release_date'),         // When released
  importDate: timestamp('import_date').defaultNow(), // When imported
  importedBy: text('imported_by'),                // Who imported it
  sourceUrl: text('source_url'),                  // Download URL
  metadata: jsonb('metadata'),                    // Additional metadata
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Code System Concepts Table Schema
 * Stores actual codes/concepts from code systems
 */
export const codeSystemConcepts = pgTable('code_system_concepts', {
  id: serial('id').primaryKey(),
  codeSystemId: text('code_system_id').notNull().references(() => codeSystems.codeSystemId),
  code: text('code').notNull(),                   // Code value
  display: text('display').notNull(),             // Preferred display term
  definition: text('definition'),                 // Definition
  status: text('status').default('active'),       // active|inactive|deprecated
  isAbstract: boolean('is_abstract').default(false), // Abstract concept flag
  hierarchyLevel: integer('hierarchy_level'),     // Level in hierarchy
  parentCodes: jsonb('parent_codes'),             // Parent codes array
  properties: jsonb('properties'),                // Additional properties
  metadata: jsonb('metadata'),                    // Extra metadata
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Code System Designations Table Schema
 * Stores translations, synonyms, and alternate terms for concepts
 */
export const codeSystemDesignations = pgTable('code_system_designations', {
  id: serial('id').primaryKey(),
  codeSystemId: text('code_system_id').notNull(),
  code: text('code').notNull(),                   // Code value
  language: text('language').notNull(),           // Language code (e.g., 'en', 'es')
  useCode: text('use_code'),                      // Type of designation
  value: text('value').notNull(),                 // Term in this language
  preferred: boolean('preferred').default(false), // Preferred flag
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Value Sets Table Schema
 * Stores metadata about value sets (collections of codes)
 */
export const valueSets = pgTable('value_sets', {
  id: serial('id').primaryKey(),
  valueSetId: text('value_set_id').notNull().unique(), // Value set ID
  uri: text('uri').notNull().unique(),            // Canonical URI
  name: text('name').notNull(),                   // Display name
  version: text('version'),                       // Version identifier
  description: text('description'),               // Description
  publisher: text('publisher'),                   // Publisher
  purpose: text('purpose'),                       // Purpose
  status: text('status').default('active'),       // draft|active|retired
  experimental: boolean('experimental').default(false), // Experimental flag
  tenantId: text('tenant_id'),                    // Tenant identifier
  isProprietary: boolean('is_proprietary').default(false), // Proprietary flag
  licenseRequired: boolean('license_required').default(false), // License needed
  expansionCached: boolean('expansion_cached').default(false), // Expansion cache
  expansionTimestamp: timestamp('expansion_timestamp'), // Expansion timestamp
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  metadata: jsonb('metadata')
});

/**
 * Value Set Includes Table Schema
 * Stores inclusion criteria for value sets
 */
export const valueSetIncludes = pgTable('value_set_includes', {
  id: serial('id').primaryKey(),
  valueSetId: text('value_set_id').notNull().references(() => valueSets.valueSetId, { onDelete: 'cascade' }),
  codeSystemId: text('code_system_id').notNull().references(() => codeSystems.codeSystemId),
  codeSystemVersion: text('code_system_version'), // Specific version
  includeAll: boolean('include_all').default(false), // Include all codes
  codes: jsonb('codes'),                          // Specific codes array
  filterProperty: text('filter_property'),        // Property for filtering
  filterOp: text('filter_op'),                    // Filter operation
  filterValue: text('filter_value'),              // Filter value
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Value Set Excludes Table Schema
 * Stores exclusion criteria for value sets
 */
export const valueSetExcludes = pgTable('value_set_excludes', {
  id: serial('id').primaryKey(),
  valueSetId: text('value_set_id').notNull().references(() => valueSets.valueSetId, { onDelete: 'cascade' }),
  codeSystemId: text('code_system_id').notNull().references(() => codeSystems.codeSystemId),
  codeSystemVersion: text('code_system_version'), // Specific version
  excludeAll: boolean('exclude_all').default(false), // Exclude all codes
  codes: jsonb('codes'),                          // Specific codes array
  filterProperty: text('filter_property'),        // Property for filtering
  filterOp: text('filter_op'),                    // Filter operation
  filterValue: text('filter_value'),              // Filter value
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Value Set Expansions Table Schema
 * Stores pre-computed expansions of value sets
 */
export const valueSetExpansions = pgTable('value_set_expansions', {
  id: serial('id').primaryKey(),
  valueSetId: text('value_set_id').notNull().references(() => valueSets.valueSetId, { onDelete: 'cascade' }),
  expansionId: text('expansion_id').notNull().unique(), // Expansion ID
  timestamp: timestamp('timestamp').defaultNow(), // Generation timestamp
  total: integer('total'),                       // Total codes count
  offset: integer('offset').default(0),          // Pagination offset
  count: integer('count'),                       // Count for pagination
  parameters: jsonb('parameters'),               // Expansion parameters
  expansionCodes: jsonb('expansion_codes').notNull(), // Expanded codes
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Concept Maps Table Schema
 * Stores mappings between code systems
 */
export const conceptMaps = pgTable('concept_maps', {
  id: serial('id').primaryKey(),
  conceptMapId: text('concept_map_id').notNull().unique(), // Map ID
  uri: text('uri').notNull().unique(),            // Canonical URI
  name: text('name').notNull(),                   // Display name
  version: text('version'),                       // Version identifier
  description: text('description'),               // Description
  sourceUri: text('source_uri').notNull(),        // Source value set/code system
  targetUri: text('target_uri').notNull(),        // Target value set/code system
  sourceCodeSystemId: text('source_code_system_id').references(() => codeSystems.codeSystemId),
  targetCodeSystemId: text('target_code_system_id').references(() => codeSystems.codeSystemId),
  status: text('status').default('active'),       // draft|active|retired
  experimental: boolean('experimental').default(false), // Experimental flag
  tenantId: text('tenant_id'),                    // Tenant identifier
  isProprietary: boolean('is_proprietary').default(false), // Proprietary flag
  licenseRequired: boolean('license_required').default(false), // License needed
  publisher: text('publisher'),                   // Publisher
  sourceUrl: text('source_url'),                  // Source URL
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  metadata: jsonb('metadata')
});

/**
 * Concept Map Elements Table Schema
 * Stores the actual mappings between concepts
 */
export const conceptMapElements = pgTable('concept_map_elements', {
  id: serial('id').primaryKey(),
  conceptMapId: text('concept_map_id').notNull().references(() => conceptMaps.conceptMapId, { onDelete: 'cascade' }),
  sourceCode: text('source_code').notNull(),      // Source code
  sourceDisplay: text('source_display'),          // Source display
  targetCode: text('target_code').notNull(),      // Target code
  targetDisplay: text('target_display'),          // Target display
  relationship: text('relationship').notNull(),    // Relationship type
  rule: text('rule'),                             // Mapping rule
  context: text('context'),                       // Context info
  isRuleBased: boolean('is_rule_based').default(false), // Rule-based flag
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Fee Schedules Table Schema
 * Stores metadata about fee schedules
 */
export const feeSchedules = pgTable('fee_schedules', {
  id: serial('id').primaryKey(),
  feeScheduleId: text('fee_schedule_id').notNull().unique(), // Schedule ID
  name: text('name').notNull(),                   // Display name
  source: text('source').notNull(),               // Source (e.g., "Medicare")
  region: text('region'),                         // Geographic region
  version: text('version'),                       // Version identifier
  effectiveDate: timestamp('effective_date').notNull(), // Effective date
  expirationDate: timestamp('expiration_date'),   // Expiration date
  status: text('status').default('active'),       // draft|active|retired
  currency: text('currency').default('USD'),      // Currency code
  isProprietary: boolean('is_proprietary').default(false), // Proprietary flag
  licenseRequired: boolean('license_required').default(false), // License needed
  tenantId: text('tenant_id'),                    // Tenant identifier
  description: text('description'),               // Description
  publisher: text('publisher'),                   // Publisher
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  metadata: jsonb('metadata')
});

/**
 * Fee Schedule Items Table Schema
 * Stores the actual fee amounts for procedure/service codes
 */
export const feeScheduleItems = pgTable('fee_schedule_items', {
  id: serial('id').primaryKey(),
  feeScheduleId: text('fee_schedule_id').notNull().references(() => feeSchedules.feeScheduleId, { onDelete: 'cascade' }),
  codeSystemId: text('code_system_id').notNull().references(() => codeSystems.codeSystemId),
  code: text('code').notNull(),                   // Procedure/service code
  description: text('description'),               // Description
  amount: real('amount').notNull(),               // Fee amount
  unit: text('unit'),                             // Unit of measure
  mod1: text('mod_1'),                            // Modifier 1
  mod2: text('mod_2'),                            // Modifier 2
  modifierAdjustment: real('modifier_adjustment'), // Modifier adjustment %
  regionSpecific: text('region_specific'),        // Region-specific info
  facilityRate: real('facility_rate'),            // Facility rate
  nonFacilityRate: real('non_facility_rate'),     // Non-facility rate
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Clinical Rules Table Schema
 * Stores metadata about clinical decision rules
 */
export const clinicalRules = pgTable('clinical_rules', {
  id: serial('id').primaryKey(),
  ruleSetId: text('rule_set_id').notNull(),       // Rule set identifier
  ruleId: text('rule_id').notNull(),              // Rule identifier
  name: text('name').notNull(),                   // Display name
  type: text('type').notNull(),                   // Rule type
  description: text('description'),               // Description
  version: text('version').notNull(),             // Version identifier
  source: text('source').notNull(),               // Source of rules
  status: text('status').default('active'),       // draft|active|retired
  isProprietary: boolean('is_proprietary').default(false), // Proprietary flag
  licenseRequired: boolean('license_required').default(false), // License needed
  tenantId: text('tenant_id'),                    // Tenant identifier
  effectiveDate: timestamp('effective_date').notNull(), // Effective date
  expirationDate: timestamp('expiration_date'),   // Expiration date
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  metadata: jsonb('metadata')
});

/**
 * Clinical Rule Elements Table Schema
 * Stores the logical elements that compose the rules
 */
export const clinicalRuleElements = pgTable('clinical_rule_elements', {
  id: serial('id').primaryKey(),
  ruleSetId: text('rule_set_id').notNull(),       // Rule set ID
  ruleId: text('rule_id').notNull(),              // Rule ID
  elementId: text('element_id').notNull(),        // Element ID
  elementType: text('element_type').notNull(),    // Element type
  description: text('description'),               // Description
  parentElementId: text('parent_element_id'),     // Parent element
  seqNum: integer('seq_num'),                     // Sequence number
  logicOperator: text('logic_operator'),          // Logic operator
  valueSetId: text('value_set_id').references(() => valueSets.valueSetId),
  conceptMapId: text('concept_map_id').references(() => conceptMaps.conceptMapId),
  expression: text('expression'),                 // Expression
  action: text('action'),                         // Action to take
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * Licenses Table Schema
 * Stores information about which tenants have which licenses
 */
export const licenses = pgTable('licenses', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),          // Tenant ID
  licenseType: text('license_type').notNull(),    // License type
  licenseKey: text('license_key'),                // License key
  status: text('status').default('active'),       // active|inactive|pending
  effectiveDate: timestamp('effective_date').notNull(), // Effective date
  expirationDate: timestamp('expiration_date'),   // Expiration date
  scope: text('scope'),                           // License scope
  usersLimit: integer('users_limit'),             // User limit
  transactionsLimit: integer('transactions_limit'), // Transaction limit
  issuedBy: text('issued_by'),                    // Issuer
  contactName: text('contact_name'),              // Contact name
  contactEmail: text('contact_email'),            // Contact email
  notes: text('notes'),                           // Notes
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  metadata: jsonb('metadata')
});

/**
 * License Usage Table Schema
 * Tracks usage of licensed resources for audit and compliance
 */
export const licenseUsage = pgTable('license_usage', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),          // Tenant ID
  licenseType: text('license_type').notNull(),    // License type
  userId: text('user_id'),                        // User ID
  resourceType: text('resource_type').notNull(),  // Resource type
  resourceId: text('resource_id').notNull(),      // Resource ID
  action: text('action').notNull(),               // Action performed
  transactionId: text('transaction_id'),          // Transaction ID
  timestamp: timestamp('timestamp').defaultNow(), // Timestamp
});

/**
 * Insert schemas for validation
 */
export const insertCodeSystemSchema = createInsertSchema(codeSystems).omit({ id: true, created: true, updated: true });
export const insertCodeSystemConceptSchema = createInsertSchema(codeSystemConcepts).omit({ id: true, created: true, updated: true });
export const insertCodeSystemDesignationSchema = createInsertSchema(codeSystemDesignations).omit({ id: true, created: true, updated: true });
export const insertValueSetSchema = createInsertSchema(valueSets).omit({ id: true, created: true, updated: true });
export const insertValueSetIncludeSchema = createInsertSchema(valueSetIncludes).omit({ id: true, created: true, updated: true });
export const insertValueSetExcludeSchema = createInsertSchema(valueSetExcludes).omit({ id: true, created: true, updated: true });
export const insertValueSetExpansionSchema = createInsertSchema(valueSetExpansions).omit({ id: true, created: true, updated: true });
export const insertConceptMapSchema = createInsertSchema(conceptMaps).omit({ id: true, created: true, updated: true });
export const insertConceptMapElementSchema = createInsertSchema(conceptMapElements).omit({ id: true, created: true, updated: true });
export const insertFeeScheduleSchema = createInsertSchema(feeSchedules).omit({ id: true, created: true, updated: true });
export const insertFeeScheduleItemSchema = createInsertSchema(feeScheduleItems).omit({ id: true, created: true, updated: true });
export const insertClinicalRuleSchema = createInsertSchema(clinicalRules).omit({ id: true, created: true, updated: true });
export const insertClinicalRuleElementSchema = createInsertSchema(clinicalRuleElements).omit({ id: true, created: true, updated: true });
export const insertLicenseSchema = createInsertSchema(licenses).omit({ id: true, created: true, updated: true });
export const insertLicenseUsageSchema = createInsertSchema(licenseUsage).omit({ id: true });

/**
 * Type definitions for canonical dataset
 */
export type CodeSystem = typeof codeSystems.$inferSelect;
export type InsertCodeSystem = z.infer<typeof insertCodeSystemSchema>;

export type CodeSystemConcept = typeof codeSystemConcepts.$inferSelect;
export type InsertCodeSystemConcept = z.infer<typeof insertCodeSystemConceptSchema>;

export type CodeSystemDesignation = typeof codeSystemDesignations.$inferSelect;
export type InsertCodeSystemDesignation = z.infer<typeof insertCodeSystemDesignationSchema>;

export type ValueSet = typeof valueSets.$inferSelect;
export type InsertValueSet = z.infer<typeof insertValueSetSchema>;

export type ValueSetInclude = typeof valueSetIncludes.$inferSelect;
export type InsertValueSetInclude = z.infer<typeof insertValueSetIncludeSchema>;

export type ValueSetExclude = typeof valueSetExcludes.$inferSelect;
export type InsertValueSetExclude = z.infer<typeof insertValueSetExcludeSchema>;

export type ValueSetExpansion = typeof valueSetExpansions.$inferSelect;
export type InsertValueSetExpansion = z.infer<typeof insertValueSetExpansionSchema>;

export type ConceptMap = typeof conceptMaps.$inferSelect;
export type InsertConceptMap = z.infer<typeof insertConceptMapSchema>;

export type ConceptMapElement = typeof conceptMapElements.$inferSelect;
export type InsertConceptMapElement = z.infer<typeof insertConceptMapElementSchema>;

export type FeeSchedule = typeof feeSchedules.$inferSelect;
export type InsertFeeSchedule = z.infer<typeof insertFeeScheduleSchema>;

export type FeeScheduleItem = typeof feeScheduleItems.$inferSelect;
export type InsertFeeScheduleItem = z.infer<typeof insertFeeScheduleItemSchema>;

export type ClinicalRule = typeof clinicalRules.$inferSelect;
export type InsertClinicalRule = z.infer<typeof insertClinicalRuleSchema>;

export type ClinicalRuleElement = typeof clinicalRuleElements.$inferSelect;
export type InsertClinicalRuleElement = z.infer<typeof insertClinicalRuleElementSchema>;

export type License = typeof licenses.$inferSelect;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;

export type LicenseUsage = typeof licenseUsage.$inferSelect;
export type InsertLicenseUsage = z.infer<typeof insertLicenseUsageSchema>;

/**
 * PHR Service Tables Schema
 */

// PHR data source types
export const phrSourceTypeEnum = pgEnum('phr_source_type', [
  'ehr', // Electronic Health Record systems
  'claims', // Insurance claims data
  'pharmacy', // Pharmacy data
  'lab', // Laboratory results
  'device', // Medical devices and wearables
  'manual', // Manually entered by patient
  'imported' // Imported from documents or other systems
]);

// PHR Connection status types
export const phrConnectionStatusEnum = pgEnum('phr_connection_status', [
  'active',
  'inactive',
  'error',
  'pending'
]);

// PHR data sources (connections to external systems)
export const phrDataSources = pgTable('phr_data_sources', {
  id: serial('id').primaryKey(),
  sourceId: varchar('source_id', { length: 255 }).notNull().unique(), // Unique identifier for the source
  patientId: varchar('patient_id', { length: 255 }).notNull(), // Link to the patient this source belongs to
  sourceName: varchar('source_name', { length: 255 }).notNull(), // Display name for the source
  sourceType: phrSourceTypeEnum('source_type').notNull(), // Type of source
  sourceSystem: varchar('source_system', { length: 255 }).notNull(), // System identifier (e.g., 'Epic', 'Cerner', 'Cigna', 'Fitbit')
  status: phrConnectionStatusEnum('status').notNull().default('inactive'),
  lastSync: timestamp('last_sync'), // Last successful sync time
  connectionDetails: jsonb('connection_details'), // OAuth tokens, credentials, etc.
  apiEndpoint: text('api_endpoint'), // API endpoint URL
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

// PHR data records
export const phrRecords = pgTable('phr_records', {
  id: serial('id').primaryKey(),
  recordId: varchar('record_id', { length: 255 }).notNull().unique(), // Unique identifier for the record
  patientId: varchar('patient_id', { length: 255 }).notNull(), // Link to the patient this record belongs to
  sourceId: varchar('source_id', { length: 255 }).notNull(), // Link to the data source
  recordType: varchar('record_type', { length: 100 }).notNull(), // FHIR resource type (Observation, Condition, MedicationStatement, etc.)
  category: varchar('category', { length: 100 }).notNull(), // Higher-level category (vitals, labs, medications, conditions, etc.)
  effectiveDate: timestamp('effective_date'), // When the observation/event occurred
  recordStatus: varchar('record_status', { length: 50 }).notNull().default('active'), // active, inactive, entered-in-error, etc.
  clinicalStatus: varchar('clinical_status', { length: 50 }), // clinical status if applicable
  code: varchar('code', { length: 100 }), // Primary code (LOINC, SNOMED, etc.)
  codeSystem: varchar('code_system', { length: 100 }), // Code system (LOINC, SNOMED, RxNorm, etc.)
  displayText: text('display_text').notNull(), // Human-readable description
  value: text('value'), // String representation of value
  valueType: varchar('value_type', { length: 50 }), // Quantity, string, boolean, etc.
  valueUnit: varchar('value_unit', { length: 50 }), // Units if applicable
  valueCodeableConcept: jsonb('value_codeable_concept'), // For coded values
  referenceRange: jsonb('reference_range'), // Reference/normal ranges if applicable
  notes: text('notes'), // Additional notes
  isPatientEntered: boolean('is_patient_entered').notNull().default(false), // Whether this record was entered by the patient
  isReviewed: boolean('is_reviewed').notNull().default(false), // Whether this record has been reviewed
  reviewedBy: varchar('reviewed_by', { length: 255 }), // Who reviewed the record
  reviewDate: timestamp('review_date'), // When the record was reviewed
  sourceDetails: jsonb('source_details'), // Additional source metadata
  fhirResource: jsonb('fhir_resource'), // Complete FHIR resource JSON
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

// PHR data sync history
export const phrSyncLogs = pgTable('phr_sync_logs', {
  id: serial('id').primaryKey(),
  sourceId: varchar('source_id', { length: 255 }).notNull(), // Link to the data source
  patientId: varchar('patient_id', { length: 255 }).notNull(), // Link to the patient
  syncStartTime: timestamp('sync_start_time').notNull().defaultNow(),
  syncEndTime: timestamp('sync_end_time'),
  status: varchar('status', { length: 50 }).notNull(), // success, error, partial
  recordsProcessed: integer('records_processed').notNull().default(0),
  recordsCreated: integer('records_created').notNull().default(0),
  recordsUpdated: integer('records_updated').notNull().default(0),
  recordsFailed: integer('records_failed').notNull().default(0),
  errorDetails: jsonb('error_details'),
  syncDetails: jsonb('sync_details'), // Additional metadata about the sync
  created: timestamp('created').defaultNow()
});

// PHR reconciliation records
export const phrReconciliation = pgTable('phr_reconciliation', {
  id: serial('id').primaryKey(),
  patientId: varchar('patient_id', { length: 255 }).notNull(), // Link to the patient
  primaryRecordId: varchar('primary_record_id', { length: 255 }).notNull(), // The primary record in a reconciliation group
  duplicateRecordIds: jsonb('duplicate_record_ids').notNull(), // Array of duplicate record IDs
  reconciliationStatus: varchar('reconciliation_status', { length: 50 }).notNull().default('pending'), // pending, resolved, rejected
  reconciliationNotes: text('reconciliation_notes'),
  resolvedBy: varchar('resolved_by', { length: 255 }), // Who resolved the reconciliation issue
  resolutionDate: timestamp('resolution_date'),
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

// PHR consent records for data sharing
export const phrConsent = pgTable('phr_consent', {
  id: serial('id').primaryKey(),
  consentId: varchar('consent_id', { length: 255 }).notNull().unique(), // Unique identifier for the consent
  patientId: varchar('patient_id', { length: 255 }).notNull(), // Link to the patient
  granteeId: varchar('grantee_id', { length: 255 }).notNull(), // Who has been granted access (provider, organization, etc.)
  granteeType: varchar('grantee_type', { length: 50 }).notNull(), // Type of grantee (provider, organization, app, etc.)
  purpose: varchar('purpose', { length: 255 }).notNull(), // Purpose of data sharing
  recordTypes: jsonb('record_types'), // Array of record types included in consent
  categories: jsonb('categories'), // Array of categories included in consent
  dateRange: jsonb('date_range'), // Date range for shared records
  consentStartDate: timestamp('consent_start_date').notNull(),
  consentEndDate: timestamp('consent_end_date'),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, expired, revoked
  createdBy: varchar('created_by', { length: 255 }).notNull(), // Who created the consent (usually the patient)
  revokedBy: varchar('revoked_by', { length: 255 }), // Who revoked the consent
  revocationDate: timestamp('revocation_date'),
  revocationReason: text('revocation_reason'),
  documentReferences: jsonb('document_references'), // References to consent documents
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

// PHR data access logs
export const phrAccessLogs = pgTable('phr_access_logs', {
  id: serial('id').primaryKey(),
  patientId: varchar('patient_id', { length: 255 }).notNull(), // Link to the patient
  accessorId: varchar('accessor_id', { length: 255 }).notNull(), // Who accessed the data
  accessorType: varchar('accessor_type', { length: 50 }).notNull(), // Type of accessor (patient, provider, system, etc.)
  accessType: varchar('access_type', { length: 50 }).notNull(), // read, write, export, share
  recordIds: jsonb('record_ids'), // Array of record IDs accessed
  accessReason: text('access_reason'),
  consentId: varchar('consent_id', { length: 255 }), // Link to consent if applicable
  accessTimestamp: timestamp('access_timestamp').notNull().defaultNow(),
  accessDetails: jsonb('access_details'), // Additional details about the access
  ipAddress: varchar('ip_address', { length: 100 }),
  userAgent: text('user_agent'),
  created: timestamp('created').defaultNow()
});

// PHR patient preferences
export const phrPatientPreferences = pgTable('phr_patient_preferences', {
  id: serial('id').primaryKey(),
  patientId: varchar('patient_id', { length: 255 }).notNull().unique(), // Link to the patient
  displayPreferences: jsonb('display_preferences'), // UI preferences for PHR display
  notificationPreferences: jsonb('notification_preferences'), // Notification settings
  sharingPreferences: jsonb('sharing_preferences'), // Default sharing preferences
  privacySettings: jsonb('privacy_settings'), // Privacy and security settings
  created: timestamp('created').defaultNow(),
  updated: timestamp('updated').defaultNow()
});

/**
 * PHR Insert schemas for validation
 */
export const insertPhrDataSourceSchema = createInsertSchema(phrDataSources).omit({ id: true, created: true, updated: true });
export const insertPhrRecordSchema = createInsertSchema(phrRecords).omit({ id: true, created: true, updated: true });
export const insertPhrSyncLogSchema = createInsertSchema(phrSyncLogs).omit({ id: true, created: true });
export const insertPhrReconciliationSchema = createInsertSchema(phrReconciliation).omit({ id: true, created: true, updated: true });
export const insertPhrConsentSchema = createInsertSchema(phrConsent).omit({ id: true, created: true, updated: true });
export const insertPhrAccessLogSchema = createInsertSchema(phrAccessLogs).omit({ id: true, created: true });
export const insertPhrPatientPreferenceSchema = createInsertSchema(phrPatientPreferences).omit({ id: true, created: true, updated: true });

/**
 * PHR Types
 */
export type PhrDataSource = typeof phrDataSources.$inferSelect;
export type InsertPhrDataSource = z.infer<typeof insertPhrDataSourceSchema>;

export type PhrRecord = typeof phrRecords.$inferSelect;
export type InsertPhrRecord = z.infer<typeof insertPhrRecordSchema>;

export type PhrSyncLog = typeof phrSyncLogs.$inferSelect;
export type InsertPhrSyncLog = z.infer<typeof insertPhrSyncLogSchema>;

export type PhrReconciliation = typeof phrReconciliation.$inferSelect;
export type InsertPhrReconciliation = z.infer<typeof insertPhrReconciliationSchema>;

export type PhrConsent = typeof phrConsent.$inferSelect;
export type InsertPhrConsent = z.infer<typeof insertPhrConsentSchema>;

export type PhrAccessLog = typeof phrAccessLogs.$inferSelect;
export type InsertPhrAccessLog = z.infer<typeof insertPhrAccessLogSchema>;

export type PhrPatientPreference = typeof phrPatientPreferences.$inferSelect;
export type InsertPhrPatientPreference = z.infer<typeof insertPhrPatientPreferenceSchema>;