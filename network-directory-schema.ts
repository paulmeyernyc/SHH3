/**
 * Smart Health Hub - Network Directory Schema
 * 
 * This file defines the database schema for the Network Directory Service, which manages:
 * - Network participants (organizations, providers, payers)
 * - Service capabilities and enablement status
 * - Connection relationships between network entities
 * - Geographic data for network visualization
 */

import { pgTable, text, timestamp, uuid, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const participantTypeEnum = pgEnum('participant_type', [
  'provider',
  'payer',
  'clearing_house',
  'pharmacy',
  'lab',
  'imaging_center',
  'health_system',
  'employer',
  'state_hie',
  'public_health_agency',
  'other'
]);

export const connectionStatusEnum = pgEnum('connection_status', [
  'pending',
  'active',
  'suspended',
  'terminated'
]);

export const serviceTypeEnum = pgEnum('service_type', [
  'eligibility_verification',
  'prior_authorization',
  'claims_submission',
  'referral_management',
  'clinical_data_exchange',
  'patient_access',
  'provider_directory',
  'scheduling',
  'notification',
  'payment',
  'pharmacy_services',
  'lab_orders',
  'imaging_orders',
  'health_information_exchange',
  'analytics',
  'other'
]);

export const serviceStatusEnum = pgEnum('service_status', [
  'available',
  'unavailable',
  'degraded',
  'maintenance'
]);

// ============================================================================
// Tables
// ============================================================================

/**
 * Network participants (organizations in the network)
 */
export const networkParticipants = pgTable('network_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Participant details
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  type: participantTypeEnum('type').notNull(),
  description: text('description'),
  
  // Identifiers
  organizationId: uuid('organization_id'), // Reference to organizations table
  externalIdentifiers: jsonb('external_identifiers'), // NPI, tax ID, HIE IDs, etc.
  
  // Contact information
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  website: text('website'),
  
  // Address information for map display
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country').default('USA'),
  
  // Geographic coordinates for mapping
  latitude: text('latitude'),
  longitude: text('longitude'),
  
  // Status and metadata
  active: boolean('active').default(true),
  verificationStatus: text('verification_status').default('unverified'),
  verifiedAt: timestamp('verified_at'),
  
  // Custom attributes
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Service definitions available on the network
 */
export const networkServices = pgTable('network_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Service details
  name: text('name').notNull(),
  type: serviceTypeEnum('type').notNull(),
  description: text('description'),
  
  // Technical details
  apiSpecUrl: text('api_spec_url'),
  documentationUrl: text('documentation_url'),
  technicalRequirements: jsonb('technical_requirements'),
  
  // Custom attributes
  metadata: jsonb('metadata'),
  
  // Status
  active: boolean('active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Participant services (which services a participant supports)
 */
export const participantServices = pgTable('participant_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // References
  participantId: uuid('participant_id').notNull().references(() => networkParticipants.id),
  serviceId: uuid('service_id').notNull().references(() => networkServices.id),
  
  // Status and capabilities
  status: serviceStatusEnum('status').notNull().default('available'),
  capabilities: jsonb('capabilities'), // Detailed technical capabilities for this service
  supportedVersions: jsonb('supported_versions'),
  
  // Performance metrics
  averageResponseTime: text('average_response_time'),
  uptime: text('uptime'),
  
  // Service configuration
  configurationDetails: jsonb('configuration_details'),
  
  // Custom attributes
  metadata: jsonb('metadata'),
  
  // Timestamps
  enabledAt: timestamp('enabled_at').notNull().defaultNow(),
  lastStatusChangeAt: timestamp('last_status_change_at'),
  
  // Tracking
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Network connections between participants
 */
export const networkConnections = pgTable('network_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Connection details (directional: from -> to)
  sourceParticipantId: uuid('source_participant_id').notNull().references(() => networkParticipants.id),
  targetParticipantId: uuid('target_participant_id').notNull().references(() => networkParticipants.id),
  
  // Connection status
  status: connectionStatusEnum('status').notNull().default('pending'),
  
  // Services enabled on this connection
  enabledServices: jsonb('enabled_services'), // Array of service IDs or details
  
  // Business details
  contractReference: text('contract_reference'),
  contractEffectiveDate: timestamp('contract_effective_date'),
  contractEndDate: timestamp('contract_end_date'),
  
  // Technical connection details
  connectionDetails: jsonb('connection_details'),
  
  // Custom attributes
  metadata: jsonb('metadata'),
  
  // Connection events
  initiatedAt: timestamp('initiated_at').notNull().defaultNow(),
  activatedAt: timestamp('activated_at'),
  lastStatusChangeAt: timestamp('last_status_change_at'),
  
  // Tracking
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Network service usage metrics
 */
export const networkServiceMetrics = pgTable('network_service_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // References
  participantServiceId: uuid('participant_service_id').notNull().references(() => participantServices.id),
  
  // Time period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  // Metrics
  totalRequests: text('total_requests'),
  successfulRequests: text('successful_requests'),
  failedRequests: text('failed_requests'),
  averageResponseTime: text('average_response_time'),
  p95ResponseTime: text('p95_response_time'),
  uptime: text('uptime'),
  
  // Detailed metrics
  detailedMetrics: jsonb('detailed_metrics'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Map regions for network visualization
 */
export const networkMapRegions = pgTable('network_map_regions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Region details
  name: text('name').notNull(),
  type: text('type').notNull(), // 'state', 'county', 'zip', 'service_area', etc.
  
  // Geographic data
  geoJson: jsonb('geo_json'), // GeoJSON data for rendering
  
  // Metadata
  description: text('description'),
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Region statistics for map visualization
 */
export const networkRegionStats = pgTable('network_region_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // References
  regionId: uuid('region_id').notNull().references(() => networkMapRegions.id),
  
  // Statistics
  participantCount: text('participant_count'),
  providerCount: text('provider_count'),
  payerCount: text('payer_count'),
  connectionCount: text('connection_count'),
  
  // Service-specific stats
  serviceStats: jsonb('service_stats'),
  
  // Detailed metrics
  detailedStats: jsonb('detailed_stats'),
  
  // Timestamps
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Network events for auditing and monitoring
 */
export const networkEvents = pgTable('network_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Event details
  eventType: text('event_type').notNull(),
  severity: text('severity').notNull().default('info'),
  description: text('description').notNull(),
  
  // References
  participantId: uuid('participant_id').references(() => networkParticipants.id),
  serviceId: uuid('service_id').references(() => networkServices.id),
  connectionId: uuid('connection_id').references(() => networkConnections.id),
  
  // Event data
  eventData: jsonb('event_data'),
  
  // Timestamp
  eventTime: timestamp('event_time').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================================
// Zod Schemas
// ============================================================================

// Network Participants
export const insertNetworkParticipantSchema = createInsertSchema(networkParticipants);
export const selectNetworkParticipantSchema = createSelectSchema(networkParticipants);

// Network Services
export const insertNetworkServiceSchema = createInsertSchema(networkServices);
export const selectNetworkServiceSchema = createSelectSchema(networkServices);

// Participant Services
export const insertParticipantServiceSchema = createInsertSchema(participantServices);
export const selectParticipantServiceSchema = createSelectSchema(participantServices);

// Network Connections
export const insertNetworkConnectionSchema = createInsertSchema(networkConnections);
export const selectNetworkConnectionSchema = createSelectSchema(networkConnections);

// Network Map Regions
export const insertNetworkMapRegionSchema = createInsertSchema(networkMapRegions);
export const selectNetworkMapRegionSchema = createSelectSchema(networkMapRegions);

// ============================================================================
// Types
// ============================================================================

// Network Participants
export type NetworkParticipant = z.infer<typeof selectNetworkParticipantSchema>;
export type InsertNetworkParticipant = z.infer<typeof insertNetworkParticipantSchema>;

// Network Services
export type NetworkService = z.infer<typeof selectNetworkServiceSchema>;
export type InsertNetworkService = z.infer<typeof insertNetworkServiceSchema>;

// Participant Services
export type ParticipantService = z.infer<typeof selectParticipantServiceSchema>;
export type InsertParticipantService = z.infer<typeof insertParticipantServiceSchema>;

// Network Connections
export type NetworkConnection = z.infer<typeof selectNetworkConnectionSchema>;
export type InsertNetworkConnection = z.infer<typeof insertNetworkConnectionSchema>;

// Network Map Regions
export type NetworkMapRegion = z.infer<typeof selectNetworkMapRegionSchema>;
export type InsertNetworkMapRegion = z.infer<typeof insertNetworkMapRegionSchema>;