/**
 * Smart Health Hub - Employer Schema
 * 
 * This file defines the database schema for the Employer Module, which manages:
 * - Employer organization profiles and hierarchies
 * - Employee relationships and membership
 * - Wellness program configurations
 * - Incentive and rewards rules
 * - Third-party vendor integrations
 */

import { integer, pgTable, primaryKey, text, timestamp, boolean, jsonb, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const employerSizeEnum = pgEnum('employer_size', [
  'small', // 1-99 employees
  'medium', // 100-999 employees
  'large', // 1,000-4,999 employees
  'enterprise' // 5,000+ employees
]);

export const employerStatusEnum = pgEnum('employer_status', [
  'active',
  'inactive',
  'pending',
  'suspended'
]);

export const employerIndustryEnum = pgEnum('employer_industry', [
  'healthcare',
  'technology',
  'finance',
  'education',
  'manufacturing',
  'retail',
  'government',
  'nonprofit',
  'other'
]);

export const programTypeEnum = pgEnum('program_type', [
  'physical_activity',
  'nutrition',
  'mental_health',
  'chronic_disease_management',
  'preventive_care',
  'financial_wellness',
  'tobacco_cessation',
  'general_wellness',
  'custom'
]);

export const programStatusEnum = pgEnum('program_status', [
  'draft',
  'active',
  'paused',
  'completed',
  'canceled'
]);

export const incentiveTypeEnum = pgEnum('incentive_type', [
  'points',
  'currency',
  'premium_discount',
  'benefit_enhancement',
  'time_off',
  'gift_card',
  'merchandise',
  'charitable_donation'
]);

export const incentiveTriggerEnum = pgEnum('incentive_trigger', [
  'participation',
  'completion',
  'achievement',
  'milestone',
  'recurring'
]);

export const employeeStatusEnum = pgEnum('employee_status', [
  'active',
  'inactive',
  'pending_invitation',
  'invitation_sent',
  'invitation_expired'
]);

export const vendorStatusEnum = pgEnum('vendor_status', [
  'active',
  'inactive',
  'integration_pending',
  'integration_failed'
]);

// ============================================================================
// Employer Tables
// ============================================================================

/**
 * Main employer organization table
 */
export const employers = pgTable('employers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  size: employerSizeEnum('size').notNull(),
  industry: employerIndustryEnum('industry').notNull(),
  status: employerStatusEnum('status').notNull().default('active'),
  mcpModelRef: text('mcp_model_ref'),
  
  // Contact and business details
  mainContactName: text('main_contact_name'),
  mainContactEmail: text('main_contact_email'),
  mainContactPhone: text('main_contact_phone'),
  taxId: text('tax_id'),
  website: text('website'),
  
  // Address
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country').default('USA'),
  
  // Configuration data
  configData: jsonb('config_data'),
  brandingData: jsonb('branding_data'),
  apiKeys: jsonb('api_keys'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  
  // Relations
  parentEmployerId: uuid('parent_employer_id').references(() => employers.id),
});

/**
 * Employer locations (offices, facilities)
 */
export const employerLocations = pgTable('employer_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id),
  name: text('name').notNull(),
  type: text('type').notNull(),
  addressLine1: text('address_line1').notNull(),
  addressLine2: text('address_line2'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code').notNull(),
  country: text('country').default('USA'),
  timezone: text('timezone'),
  isHeadquarters: boolean('is_headquarters').default(false),
  active: boolean('active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Employer departments/divisions
 */
export const employerDepartments = pgTable('employer_departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id),
  name: text('name').notNull(),
  code: text('code'),
  description: text('description'),
  parentDepartmentId: uuid('parent_department_id').references(() => employerDepartments.id),
  active: boolean('active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Employer administrators (HR, benefits managers)
 */
export const employerAdmins = pgTable('employer_admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id),
  userId: uuid('user_id').notNull(), // References the SHH user directory
  role: text('role').notNull(),
  permissions: jsonb('permissions').notNull(),
  active: boolean('active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Employee table (links employees to employers)
 */
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id),
  userId: uuid('user_id'), // References the SHH user directory, can be null until account created
  employeeId: text('employee_id'), // Employer's internal ID for the employee
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  status: employeeStatusEnum('status').notNull().default('pending_invitation'),
  
  // Optional details (populated as available)
  departmentId: uuid('department_id').references(() => employerDepartments.id),
  locationId: uuid('location_id').references(() => employerLocations.id),
  jobTitle: text('job_title'),
  hireDate: timestamp('hire_date'),
  terminationDate: timestamp('termination_date'),
  
  // Invitation and onboarding tracking
  invitationSentDate: timestamp('invitation_sent_date'),
  invitationAcceptedDate: timestamp('invitation_accepted_date'),
  lastInvitationDate: timestamp('last_invitation_date'),
  invitationCount: integer('invitation_count').default(0),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// ============================================================================
// Wellness Program Tables
// ============================================================================

/**
 * Employer wellness programs configuration
 */
export const wellnessPrograms = pgTable('wellness_programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id),
  name: text('name').notNull(),
  description: text('description'),
  type: programTypeEnum('type').notNull(),
  status: programStatusEnum('status').notNull().default('draft'),
  
  // Program details
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  enrollmentStartDate: timestamp('enrollment_start_date'),
  enrollmentEndDate: timestamp('enrollment_end_date'),
  
  // Configuration data
  configData: jsonb('config_data'),
  eligibilityCriteria: jsonb('eligibility_criteria'),
  successCriteria: jsonb('success_criteria'),
  
  // Visibility and targeting
  isVisible: boolean('is_visible').default(true),
  targetAudience: jsonb('target_audience'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  launchedAt: timestamp('launched_at'),
  completedAt: timestamp('completed_at'),
  
  // Created by
  createdById: uuid('created_by_id').references(() => employerAdmins.id),
});

/**
 * Program content items (activities, challenges, resources)
 */
export const programContents = pgTable('program_contents', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id').notNull().references(() => wellnessPrograms.id),
  title: text('title').notNull(),
  description: text('description'),
  contentType: text('content_type').notNull(),
  
  // Content details
  sortOrder: integer('sort_order').default(0),
  durationMinutes: integer('duration_minutes'),
  pointValue: integer('point_value'),
  contentData: jsonb('content_data'),
  
  // Scheduling
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Program enrollment tracking
 */
export const programEnrollments = pgTable('program_enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id').notNull().references(() => wellnessPrograms.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  
  // Enrollment data
  enrollmentDate: timestamp('enrollment_date').notNull().defaultNow(),
  completionDate: timestamp('completion_date'),
  status: text('status').notNull().default('enrolled'),
  progress: integer('progress').default(0),
  
  // Additional data
  notes: text('notes'),
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Wellness activity tracking
 */
export const wellnessActivities = pgTable('wellness_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  programId: uuid('program_id').references(() => wellnessPrograms.id),
  contentId: uuid('content_id').references(() => programContents.id),
  
  // Activity details
  activityType: text('activity_type').notNull(),
  activityDate: timestamp('activity_date').notNull(),
  status: text('status').notNull(),
  
  // Activity data
  activityData: jsonb('activity_data'),
  verificationData: jsonb('verification_data'),
  pointsEarned: integer('points_earned').default(0),
  
  // Source tracking
  sourceType: text('source_type'), // 'manual', 'integration', etc.
  sourceId: text('source_id'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// ============================================================================
// Incentives & Rewards Tables
// ============================================================================

/**
 * Incentive configuration
 */
export const incentiveRules = pgTable('incentive_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id),
  programId: uuid('program_id').references(() => wellnessPrograms.id),
  
  // Rule details
  name: text('name').notNull(),
  description: text('description'),
  triggerType: incentiveTriggerEnum('trigger_type').notNull(),
  
  // Incentive configuration
  incentiveType: incentiveTypeEnum('incentive_type').notNull(),
  value: integer('value').notNull(), // Points, amount, etc.
  maxOccurrences: integer('max_occurrences'), // Limit per user, null = unlimited
  
  // Advanced rule details
  requirementData: jsonb('requirement_data'),
  frequencyData: jsonb('frequency_data'),
  
  // Status
  active: boolean('active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
});

/**
 * Employee incentive awards
 */
export const incentiveAwards = pgTable('incentive_awards', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  incentiveRuleId: uuid('incentive_rule_id').notNull().references(() => incentiveRules.id),
  
  // Award details
  awardDate: timestamp('award_date').notNull().defaultNow(),
  pointsAwarded: integer('points_awarded').notNull(),
  status: text('status').notNull().default('awarded'),
  
  // Activity connection
  activityId: uuid('activity_id').references(() => wellnessActivities.id),
  programId: uuid('program_id').references(() => wellnessPrograms.id),
  
  // Details
  awardData: jsonb('award_data'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  expirationDate: timestamp('expiration_date'),
});

/**
 * Wallet transactions (for spending points/rewards)
 */
export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  
  // Transaction details
  transactionDate: timestamp('transaction_date').notNull().defaultNow(),
  transactionType: text('transaction_type').notNull(), // 'award', 'redemption', 'expiration', etc.
  points: integer('points').notNull(),
  
  // References
  awardId: uuid('award_id').references(() => incentiveAwards.id),
  rewardItemId: text('reward_item_id'),
  
  // Additional data
  description: text('description'),
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// ============================================================================
// Vendor Integration Tables
// ============================================================================

/**
 * Third-party wellness vendors
 */
export const wellnessVendors = pgTable('wellness_vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  vendorType: text('vendor_type').notNull(),
  
  // Integration details
  integrationDetails: jsonb('integration_details'),
  apiDocumentation: text('api_documentation'),
  supportContact: text('support_contact'),
  supportEmail: text('support_email'),
  
  // Status
  active: boolean('active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Employer-vendor integrations
 */
export const employerVendorIntegrations = pgTable('employer_vendor_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id),
  vendorId: uuid('vendor_id').notNull().references(() => wellnessVendors.id),
  
  // Integration status
  status: vendorStatusEnum('status').notNull().default('integration_pending'),
  
  // Integration configuration
  configData: jsonb('config_data'),
  credentials: jsonb('credentials'),
  
  // SSO and API details
  ssoConfig: jsonb('sso_config'),
  callbackUrl: text('callback_url'),
  webhookUrl: text('webhook_url'),
  
  // Contract and usage details
  contractStartDate: timestamp('contract_start_date'),
  contractEndDate: timestamp('contract_end_date'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  lastSyncDate: timestamp('last_sync_date'),
});

/**
 * Employee vendor accounts (links to external systems)
 */
export const employeeVendorAccounts = pgTable('employee_vendor_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  integrationId: uuid('integration_id').notNull().references(() => employerVendorIntegrations.id),
  
  // External account details
  externalId: text('external_id'),
  externalUsername: text('external_username'),
  accountStatus: text('account_status'),
  
  // Connection details
  connectDate: timestamp('connect_date'),
  lastActivityDate: timestamp('last_activity_date'),
  
  // Additional data
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Employee vendor data sync (activity data from vendors)
 */
export const vendorActivitySync = pgTable('vendor_activity_sync', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeVendorAccountId: uuid('employee_vendor_account_id').notNull()
    .references(() => employeeVendorAccounts.id),
  
  // Sync details
  syncDate: timestamp('sync_date').notNull().defaultNow(),
  dataType: text('data_type').notNull(),
  activityDate: timestamp('activity_date').notNull(),
  
  // Data details
  rawData: jsonb('raw_data'),
  processedData: jsonb('processed_data'),
  status: text('status').notNull(),
  
  // Processing details
  processedAt: timestamp('processed_at'),
  activityId: uuid('activity_id').references(() => wellnessActivities.id),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// ============================================================================
// Analytics Tables
// ============================================================================

/**
 * Aggregated employer analytics
 */
export const employerAnalytics = pgTable('employer_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id),
  
  // Analytics details
  reportDate: timestamp('report_date').notNull(),
  reportType: text('report_type').notNull(),
  
  // Aggregated metrics
  metrics: jsonb('metrics').notNull(),
  segmentDimensions: jsonb('segment_dimensions'),
  
  // Generation details
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  dataRange: jsonb('data_range'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

/**
 * Program analytics
 */
export const programAnalytics = pgTable('program_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id').notNull().references(() => wellnessPrograms.id),
  
  // Analytics details
  reportDate: timestamp('report_date').notNull(),
  reportType: text('report_type').notNull(),
  
  // Metrics
  metrics: jsonb('metrics').notNull(),
  segmentDimensions: jsonb('segment_dimensions'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// ============================================================================
// Composite Keys & Indexes
// ============================================================================

// Unique constraints
export const employeeEmployerUnique = pgTable('employee_employer_unique', {
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  employerId: uuid('employer_id').notNull().references(() => employers.id),
}, (t) => ({
  pk: primaryKey(t.employeeId, t.employerId),
}));

export const programEnrollmentUnique = pgTable('program_enrollment_unique', {
  programId: uuid('program_id').notNull().references(() => wellnessPrograms.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
}, (t) => ({
  pk: primaryKey(t.programId, t.employeeId),
}));

export const employeeVendorUnique = pgTable('employee_vendor_unique', {
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  integrationId: uuid('integration_id').notNull().references(() => employerVendorIntegrations.id),
}, (t) => ({
  pk: primaryKey(t.employeeId, t.integrationId),
}));

// ============================================================================
// Zod Schemas
// ============================================================================

// Employers
export const insertEmployerSchema = createInsertSchema(employers);
export const selectEmployerSchema = createSelectSchema(employers);

// Employees
export const insertEmployeeSchema = createInsertSchema(employees);
export const selectEmployeeSchema = createSelectSchema(employees);

// Wellness Programs
export const insertWellnessProgramSchema = createInsertSchema(wellnessPrograms);
export const selectWellnessProgramSchema = createSelectSchema(wellnessPrograms);

// Program Contents
export const insertProgramContentSchema = createInsertSchema(programContents);
export const selectProgramContentSchema = createSelectSchema(programContents);

// Program Enrollments
export const insertProgramEnrollmentSchema = createInsertSchema(programEnrollments);
export const selectProgramEnrollmentSchema = createSelectSchema(programEnrollments);

// Incentive Rules
export const insertIncentiveRuleSchema = createInsertSchema(incentiveRules);
export const selectIncentiveRuleSchema = createSelectSchema(incentiveRules);

// Vendor Integrations
export const insertVendorIntegrationSchema = createInsertSchema(employerVendorIntegrations);
export const selectVendorIntegrationSchema = createSelectSchema(employerVendorIntegrations);

// ============================================================================
// Types
// ============================================================================

// Employers
export type Employer = z.infer<typeof selectEmployerSchema>;
export type InsertEmployer = z.infer<typeof insertEmployerSchema>;

// Employees
export type Employee = z.infer<typeof selectEmployeeSchema>;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

// Wellness Programs
export type WellnessProgram = z.infer<typeof selectWellnessProgramSchema>;
export type InsertWellnessProgram = z.infer<typeof insertWellnessProgramSchema>;

// Program Contents
export type ProgramContent = z.infer<typeof selectProgramContentSchema>;
export type InsertProgramContent = z.infer<typeof insertProgramContentSchema>;

// Program Enrollments
export type ProgramEnrollment = z.infer<typeof selectProgramEnrollmentSchema>;
export type InsertProgramEnrollment = z.infer<typeof insertProgramEnrollmentSchema>;

// Incentive Rules
export type IncentiveRule = z.infer<typeof selectIncentiveRuleSchema>;
export type InsertIncentiveRule = z.infer<typeof insertIncentiveRuleSchema>;

// Vendor Integrations
export type VendorIntegration = z.infer<typeof selectVendorIntegrationSchema>;
export type InsertVendorIntegration = z.infer<typeof insertVendorIntegrationSchema>;