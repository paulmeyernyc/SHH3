/**
 * FHIR Data Model (R4)
 * 
 * This module defines the database schema for FHIR resources following the R4 standard.
 * Each resource type has its own table with structured fields matching FHIR specifications.
 * References between resources are maintained to support proper FHIR relationships.
 */

import { serial, integer, text, json, boolean, date, timestamp, pgTable, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Common FHIR enums
export const resourceTypeEnum = pgEnum('resource_type', [
  // Administrative
  'Patient', 'Practitioner', 'PractitionerRole', 'Organization', 'Location', 
  'HealthcareService', 'Encounter', 'EpisodeOfCare', 'RelatedPerson', 'Group',
  // Clinical
  'Condition', 'Observation', 'Procedure', 'MedicationRequest', 'MedicationAdministration',
  'MedicationDispense', 'MedicationStatement', 'AllergyIntolerance', 'DiagnosticReport',
  'CarePlan', 'CareTeam', 'ImmunizationRecommendation', 'Immunization',
  // Financial
  'Coverage', 'CoverageEligibilityRequest', 'CoverageEligibilityResponse', 'Claim',
  'ClaimResponse', 'ExplanationOfBenefit', 'PaymentNotice', 'PaymentReconciliation',
  // Identification
  'Person', 'Device', 'DeviceMetric',
  // Workflow
  'Task', 'Appointment', 'AppointmentResponse', 'Schedule', 'Slot',
  // Documents & Lists
  'DocumentReference', 'QuestionnaireResponse', 'List', 'Composition'
]);

export const identifierUseEnum = pgEnum('identifier_use', ['usual', 'official', 'temp', 'secondary', 'old']);

export const nameUseEnum = pgEnum('name_use', ['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden']);

export const addressUseEnum = pgEnum('address_use', ['home', 'work', 'temp', 'old', 'billing']);

export const addressTypeEnum = pgEnum('address_type', ['postal', 'physical', 'both']);

export const contactPointSystemEnum = pgEnum('contact_point_system', ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other']);

export const contactPointUseEnum = pgEnum('contact_point_use', ['home', 'work', 'temp', 'old', 'mobile']);

export const administrativeGenderEnum = pgEnum('administrative_gender', ['male', 'female', 'other', 'unknown']);

export const linkTypeEnum = pgEnum('link_type', ['replaced-by', 'replaces', 'refer', 'seealso']);

// Base FHIR Resource Table - Contains common fields for all resources
export const fhirResource = pgTable("fhir_resource", {
  id: serial("id").primaryKey(),
  resourceType: resourceTypeEnum("resource_type").notNull(),
  resourceId: text("resource_id").notNull().unique(), // The logical id of the resource
  versionId: text("version_id"), // Version-specific identifier 
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  profile: json("profile"), // Profiles this resource claims to conform to
  security: json("security"), // Security labels applied to this resource
  tag: json("tag"), // Tags applied to this resource
  source: text("source"), // Source of the resource
  meta: json("meta"), // Metadata about the resource
  implicitRules: text("implicit_rules"), // A set of rules under which this content was created
  language: text("language"), // Language of the resource content
  text: json("text"), // Text summary of the resource
  // Audit fields
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

// Patient Resource - One of the most important FHIR resources
export const fhirPatient = pgTable("fhir_patient", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull().unique(), // The logical id (references fhir_resource.resourceId)
  resourceFK: integer("resource_fk").references(() => fhirResource.id), // Foreign key to the base resource
  identifier: json("identifier").notNull(), // An identifier for this patient
  active: boolean("active").default(true), // Whether this patient's record is in active use
  name: json("name").notNull(), // A name associated with the patient
  telecom: json("telecom"), // A contact detail for the individual
  gender: administrativeGenderEnum("gender"), // male | female | other | unknown
  birthDate: date("birth_date"), // The date of birth for the individual
  deceasedBoolean: boolean("deceased_boolean"), // Indicates if the individual is deceased or not
  deceasedDateTime: timestamp("deceased_date_time"), // Indicates if the individual is deceased or not
  address: json("address"), // An address for the individual
  maritalStatus: json("marital_status"), // Marital (civil) status of a patient
  multipleBirthBoolean: boolean("multiple_birth_boolean"), // Whether patient is part of a multiple birth
  multipleBirthInteger: integer("multiple_birth_integer"), // Whether patient is part of a multiple birth
  photo: json("photo"), // Image of the patient
  contact: json("contact"), // A contact party (e.g. guardian, partner, friend) for the patient
  communication: json("communication"), // A language which may be used to communicate with the patient about his or her health
  generalPractitioner: json("general_practitioner"), // Patient's nominated primary care provider
  managingOrganization: json("managing_organization"), // Organization that is the custodian of the patient record
  link: json("link"), // Link to another patient resource that concerns the same actual person
  // Extensions for custom data
  extension: json("extension"),
  // Audit fields
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

// Practitioner Resource - Healthcare professionals
export const fhirPractitioner = pgTable("fhir_practitioner", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull().unique(), // The logical id (references fhir_resource.resourceId)
  resourceFK: integer("resource_fk").references(() => fhirResource.id), // Foreign key to the base resource
  identifier: json("identifier"), // An identifier for the person as this practitioner
  active: boolean("active").default(true), // Whether this practitioner's record is in active use
  name: json("name").notNull(), // The name(s) associated with the practitioner
  telecom: json("telecom"), // A contact detail for the practitioner (that apply to all roles)
  address: json("address"), // Address(es) of the practitioner that apply to all roles
  gender: administrativeGenderEnum("gender"), // male | female | other | unknown
  birthDate: date("birth_date"), // The date on which the practitioner was born
  photo: json("photo"), // Image of the person
  qualification: json("qualification"), // Qualifications obtained by training and certification
  communication: json("communication"), // A language the practitioner can use in patient communication
  // Extensions for custom data
  extension: json("extension"),
  // Audit fields
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

// Organization Resource - A formally or informally recognized grouping of people or organizations
export const fhirOrganization = pgTable("fhir_organization", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull().unique(), // The logical id (references fhir_resource.resourceId)
  resourceFK: integer("resource_fk").references(() => fhirResource.id), // Foreign key to the base resource
  identifier: json("identifier"), // Identifies this organization across multiple systems
  active: boolean("active").default(true), // Whether the organization's record is still in active use
  type: json("type"), // Kind of organization
  name: text("name").notNull(), // Name used for the organization
  alias: json("alias"), // A list of alternate names that the organization is known as or was known as in the past
  telecom: json("telecom"), // A contact detail for the organization
  address: json("address"), // An address for the organization
  partOf: json("part_of"), // The organization of which this organization forms a part
  contact: json("contact"), // Contact for the organization for a certain purpose
  endpoint: json("endpoint"), // Technical endpoints providing access to services operated for the organization
  // Extensions for custom data
  extension: json("extension"),
  // Audit fields
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

// Encounter Resource - An interaction between a patient and healthcare provider(s)
export const fhirEncounter = pgTable("fhir_encounter", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull().unique(), // The logical id (references fhir_resource.resourceId)
  resourceFK: integer("resource_fk").references(() => fhirResource.id), // Foreign key to the base resource
  identifier: json("identifier"), // Identifier(s) by which this encounter is known
  status: text("status").notNull(), // planned | arrived | triaged | in-progress | onleave | finished | cancelled +
  statusHistory: json("status_history"), // List of past encounter statuses
  class: text("class").notNull(), // Classification of patient encounter
  classHistory: json("class_history"), // List of past encounter classes
  type: json("type"), // Specific type of encounter
  serviceType: json("service_type"), // Specific type of service
  priority: json("priority"), // Indicates the urgency of the encounter
  subject: json("subject").notNull(), // The patient or group present at the encounter
  episodeOfCare: json("episode_of_care"), // Episode(s) of care that this encounter should be recorded against
  basedOn: json("based_on"), // The request that initiated this encounter
  participant: json("participant"), // List of participants involved in the encounter
  appointment: json("appointment"), // The appointment that scheduled this encounter
  period: json("period"), // The start and end time of the encounter
  length: integer("length"), // Quantity of time the encounter lasted
  reasonCode: json("reason_code"), // Coded reason the encounter takes place
  reasonReference: json("reason_reference"), // Reason the encounter takes place (reference)
  diagnosis: json("diagnosis"), // The list of diagnosis relevant to this encounter
  account: json("account"), // The set of accounts that may be used for billing for this Encounter
  hospitalization: json("hospitalization"), // Details about the admission to a healthcare service
  location: json("location"), // List of locations where the patient has been
  serviceProvider: json("service_provider"), // The organization (facility) responsible for this encounter
  partOf: json("part_of"), // Another Encounter this encounter is part of
  // Extensions for custom data
  extension: json("extension"),
  // Audit fields
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

// Condition Resource - Detailed information about a condition, problem, diagnosis, or other event, situation, issue, or clinical concept
export const fhirCondition = pgTable("fhir_condition", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull().unique(), // The logical id (references fhir_resource.resourceId)
  resourceFK: integer("resource_fk").references(() => fhirResource.id), // Foreign key to the base resource
  identifier: json("identifier"), // External Ids for this condition
  clinicalStatus: json("clinical_status"), // active | recurrence | relapse | inactive | remission | resolved
  verificationStatus: json("verification_status"), // unconfirmed | provisional | differential | confirmed | refuted | entered-in-error
  category: json("category"), // problem-list-item | encounter-diagnosis
  severity: json("severity"), // Subjective severity of condition
  code: json("code"), // Identification of the condition, problem or diagnosis
  bodySite: json("body_site"), // Anatomical location, if relevant
  subject: json("subject").notNull(), // Who has the condition
  encounter: json("encounter"), // Encounter created as part of encounter/admission/stay
  onsetDateTime: timestamp("onset_date_time"), // Estimated or actual date, date-time, or age
  onsetAge: json("onset_age"), // Estimated or actual date, date-time, or age
  onsetPeriod: json("onset_period"), // Estimated or actual date, date-time, or age
  onsetRange: json("onset_range"), // Estimated or actual date, date-time, or age
  onsetString: text("onset_string"), // Estimated or actual date, date-time, or age
  abatementDateTime: timestamp("abatement_date_time"), // When in resolution/remission
  abatementAge: json("abatement_age"), // When in resolution/remission
  abatementPeriod: json("abatement_period"), // When in resolution/remission
  abatementRange: json("abatement_range"), // When in resolution/remission
  abatementString: text("abatement_string"), // When in resolution/remission
  recordedDate: timestamp("recorded_date"), // Date record was first recorded
  recorder: json("recorder"), // Who recorded the condition
  asserter: json("asserter"), // Person who asserts the condition
  stage: json("stage"), // Stage/grade, usually assessed formally
  evidence: json("evidence"), // Supporting evidence
  note: json("note"), // Additional information about the condition
  // Extensions for custom data
  extension: json("extension"),
  // Audit fields
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

// Observation Resource - Measurements and simple assertions about a patient, device or other subject
export const fhirObservation = pgTable("fhir_observation", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull().unique(), // The logical id (references fhir_resource.resourceId)
  resourceFK: integer("resource_fk").references(() => fhirResource.id), // Foreign key to the base resource
  identifier: json("identifier"), // Business Identifier for observation
  basedOn: json("based_on"), // Fulfills plan, proposal or order
  partOf: json("part_of"), // Part of referenced event
  status: text("status").notNull(), // registered | preliminary | final | amended +
  category: json("category"), // Classification of type of observation
  code: json("code").notNull(), // Type of observation (code / type)
  subject: json("subject"), // Who and/or what the observation is about
  focus: json("focus"), // What the observation is about, when it is not about the subject
  encounter: json("encounter"), // Healthcare event during which this observation is made
  effectiveDateTime: timestamp("effective_date_time"), // Clinically relevant time/time-period for observation
  effectivePeriod: json("effective_period"), // Clinically relevant time/time-period for observation
  effectiveTiming: json("effective_timing"), // Clinically relevant time/time-period for observation
  effectiveInstant: timestamp("effective_instant"), // Clinically relevant time/time-period for observation
  issued: timestamp("issued"), // Date/Time this version was made available
  performer: json("performer"), // Who is responsible for the observation
  valueQuantity: json("value_quantity"), // Actual result
  valueCodeableConcept: json("value_codeable_concept"), // Actual result
  valueString: text("value_string"), // Actual result
  valueBoolean: boolean("value_boolean"), // Actual result
  valueInteger: integer("value_integer"), // Actual result
  valueRange: json("value_range"), // Actual result
  valueRatio: json("value_ratio"), // Actual result
  valueSampledData: json("value_sampled_data"), // Actual result
  valueTime: timestamp("value_time"), // Actual result
  valueDateTime: timestamp("value_date_time"), // Actual result
  valuePeriod: json("value_period"), // Actual result
  dataAbsentReason: json("data_absent_reason"), // Why the result is missing
  interpretation: json("interpretation"), // High, low, normal, etc.
  note: json("note"), // Comments about the observation
  bodySite: json("body_site"), // Observed body part
  method: json("method"), // How it was done
  specimen: json("specimen"), // Specimen used for this observation
  device: json("device"), // (Measurement) Device
  referenceRange: json("reference_range"), // Provides guide for interpretation
  hasMember: json("has_member"), // Related resource that belongs to the Observation group
  derivedFrom: json("derived_from"), // Related measurements the observation is made from
  component: json("component"), // Component results
  // Extensions for custom data
  extension: json("extension"),
  // Audit fields
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

// MedicationRequest Resource - Ordering of medication for patient or group
export const fhirMedicationRequest = pgTable("fhir_medication_request", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull().unique(), // The logical id (references fhir_resource.resourceId)
  resourceFK: integer("resource_fk").references(() => fhirResource.id), // Foreign key to the base resource
  identifier: json("identifier"), // External ids for this request
  status: text("status").notNull(), // active | on-hold | cancelled | completed | entered-in-error | stopped | draft | unknown
  statusReason: json("status_reason"), // Reason for current status
  intent: text("intent").notNull(), // proposal | plan | order | original-order | reflex-order | filler-order | instance-order | option
  category: json("category"), // Type of medication usage
  priority: text("priority"), // routine | urgent | asap | stat
  doNotPerform: boolean("do_not_perform"), // True if request is prohibiting action
  reportedBoolean: boolean("reported_boolean"), // Reported rather than primary record
  reportedReference: json("reported_reference"), // Reported rather than primary record
  medicationCodeableConcept: json("medication_codeable_concept"), // Medication to be taken
  medicationReference: json("medication_reference"), // Medication to be taken
  subject: json("subject").notNull(), // Who or group medication request is for
  encounter: json("encounter"), // Encounter created as part of encounter/admission/stay
  supportingInformation: json("supporting_information"), // Information to support ordering of the medication
  authoredOn: timestamp("authored_on"), // When request was initially authored
  requester: json("requester"), // Who/What requested the Request
  performer: json("performer"), // Intended performer of administration
  performerType: json("performer_type"), // Desired kind of performer of the medication administration
  recorder: json("recorder"), // Person who entered the request
  reasonCode: json("reason_code"), // Reason or indication for ordering or not ordering the medication
  reasonReference: json("reason_reference"), // Condition or observation that supports why the prescription is being written
  instantiatesCanonical: json("instantiates_canonical"), // Instantiates FHIR protocol or definition
  instantiatesUri: json("instantiates_uri"), // Instantiates external protocol or definition
  basedOn: json("based_on"), // What request fulfills
  groupIdentifier: json("group_identifier"), // Composite request this is part of
  courseOfTherapyType: json("course_of_therapy_type"), // Overall pattern of medication administration
  insurance: json("insurance"), // Associated insurance coverage
  note: json("note"), // Information about the prescription
  dosageInstruction: json("dosage_instruction"), // How medication should be taken
  dispenseRequest: json("dispense_request"), // Medication supply authorization
  substitution: json("substitution"), // Any restrictions on medication substitution
  priorPrescription: json("prior_prescription"), // An order/prescription that this supersedes
  detectedIssue: json("detected_issue"), // Clinical Issue with action
  eventHistory: json("event_history"), // A list of events of interest in the lifecycle
  // Extensions for custom data
  extension: json("extension"),
  // Audit fields
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

// Claim Resource - Claim, Pre-determination or Pre-authorization
export const fhirClaim = pgTable("fhir_claim", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull().unique(), // The logical id (references fhir_resource.resourceId)
  resourceFK: integer("resource_fk").references(() => fhirResource.id), // Foreign key to the base resource
  identifier: json("identifier"), // Business Identifier for claim
  status: text("status").notNull(), // active | cancelled | draft | entered-in-error
  type: json("type").notNull(), // Category or discipline
  subType: json("sub_type"), // More granular claim type
  use: text("use").notNull(), // claim | preauthorization | predetermination
  patient: json("patient").notNull(), // The recipient of the products and services
  billablePeriod: json("billable_period"), // Relevant time frame for the claim
  created: timestamp("created").notNull(), // Resource creation date
  enterer: json("enterer"), // Author of the claim
  insurer: json("insurer"), // Target
  provider: json("provider").notNull(), // Party responsible for the claim
  priority: json("priority"), // Desired processing urgency
  fundsReserve: json("funds_reserve"), // For whom to reserve funds
  related: json("related"), // Prior or related claims
  prescription: json("prescription"), // Prescription authorizing services and products
  originalPrescription: json("original_prescription"), // Original prescription if superseded by fulfiller
  payee: json("payee"), // Recipient of benefits payable
  referral: json("referral"), // Treatment referral
  facility: json("facility"), // Servicing facility
  careTeam: json("care_team"), // Members of the care team
  supportingInfo: json("supporting_info"), // Supporting information
  diagnosis: json("diagnosis"), // Pertinent diagnosis information
  procedure: json("procedure"), // Clinical procedures performed
  insurance: json("insurance").notNull(), // Patient insurance information
  accident: json("accident"), // Details of the event
  item: json("item"), // Product or service provided
  total: json("total"), // Total claim cost
  // Extensions for custom data
  extension: json("extension"),
  // Audit fields
  updated: timestamp("updated").notNull().defaultNow(),
});

// Coverage Resource - Insurance or medical plan or a payment agreement
export const fhirCoverage = pgTable("fhir_coverage", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull().unique(), // The logical id (references fhir_resource.resourceId)
  resourceFK: integer("resource_fk").references(() => fhirResource.id), // Foreign key to the base resource
  identifier: json("identifier"), // Business Identifier for the coverage
  status: text("status").notNull(), // active | cancelled | draft | entered-in-error
  type: json("type"), // Classification of benefit plan
  policyHolder: json("policy_holder"), // Owner of the policy
  subscriber: json("subscriber"), // Subscriber to the policy
  subscriberId: text("subscriber_id"), // ID assigned to the subscriber
  beneficiary: json("beneficiary").notNull(), // Plan beneficiary
  dependent: text("dependent"), // Dependent number
  relationship: json("relationship"), // Beneficiary relationship to the subscriber
  period: json("period"), // Coverage start and end dates
  payor: json("payor").notNull(), // Issuer of the policy
  class: json("class"), // Additional coverage classifications
  order: integer("order"), // Relative order of the coverage
  network: text("network"), // Insurer network
  costToBeneficiary: json("cost_to_beneficiary"), // Patient payments for services/products
  subrogation: boolean("subrogation"), // Reimbursement to insurer
  contract: json("contract"), // Contract details
  // Extensions for custom data
  extension: json("extension"),
  // Audit fields
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

// DocumentReference Resource - A reference to a document
export const fhirDocumentReference = pgTable("fhir_document_reference", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull().unique(), // The logical id (references fhir_resource.resourceId)
  resourceFK: integer("resource_fk").references(() => fhirResource.id), // Foreign key to the base resource
  identifier: json("identifier"), // Business identifiers for the document
  status: text("status").notNull(), // current | superseded | entered-in-error
  docStatus: text("doc_status"), // preliminary | final | amended | entered-in-error
  type: json("type"), // Kind of document (LOINC if possible)
  category: json("category"), // Categorization of document
  subject: json("subject"), // Who/what is the subject of the document
  date: timestamp("date"), // When this document reference was created
  author: json("author"), // Who and/or what authored the document
  authenticator: json("authenticator"), // Who/what authenticated the document
  custodian: json("custodian"), // Organization which maintains the document
  relatesTo: json("relates_to"), // Relationships to other documents
  description: text("description"), // Human-readable description
  securityLabel: json("security_label"), // Document security-tags
  content: json("content").notNull(), // Document referenced
  context: json("context"), // Clinical context of document
  // Extensions for custom data
  extension: json("extension"),
  // Audit fields
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

// FHIR reference tracking table - to track references between resources
export const fhirReference = pgTable("fhir_reference", {
  id: serial("id").primaryKey(),
  sourceResourceType: resourceTypeEnum("source_resource_type").notNull(),
  sourceResourceId: text("source_resource_id").notNull(), 
  referenceType: text("reference_type").notNull(), // The type of reference (e.g., "subject", "patient", "encounter")
  targetResourceType: resourceTypeEnum("target_resource_type").notNull(),
  targetResourceId: text("target_resource_id").notNull(),
  // Audit fields
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

// Insert schemas for FHIR resources
export const insertFhirResourceSchema = createInsertSchema(fhirResource);
export const insertFhirPatientSchema = createInsertSchema(fhirPatient);
export const insertFhirPractitionerSchema = createInsertSchema(fhirPractitioner);
export const insertFhirOrganizationSchema = createInsertSchema(fhirOrganization);
export const insertFhirEncounterSchema = createInsertSchema(fhirEncounter);
export const insertFhirConditionSchema = createInsertSchema(fhirCondition);
export const insertFhirObservationSchema = createInsertSchema(fhirObservation);
export const insertFhirMedicationRequestSchema = createInsertSchema(fhirMedicationRequest);
export const insertFhirClaimSchema = createInsertSchema(fhirClaim);
export const insertFhirCoverageSchema = createInsertSchema(fhirCoverage);
export const insertFhirDocumentReferenceSchema = createInsertSchema(fhirDocumentReference);
export const insertFhirReferenceSchema = createInsertSchema(fhirReference);

// Export types for FHIR resources
export type FhirResource = typeof fhirResource.$inferSelect;
export type FhirPatient = typeof fhirPatient.$inferSelect;
export type FhirPractitioner = typeof fhirPractitioner.$inferSelect;
export type FhirOrganization = typeof fhirOrganization.$inferSelect;
export type FhirEncounter = typeof fhirEncounter.$inferSelect;
export type FhirCondition = typeof fhirCondition.$inferSelect;
export type FhirObservation = typeof fhirObservation.$inferSelect;
export type FhirMedicationRequest = typeof fhirMedicationRequest.$inferSelect;
export type FhirClaim = typeof fhirClaim.$inferSelect;
export type FhirCoverage = typeof fhirCoverage.$inferSelect;
export type FhirDocumentReference = typeof fhirDocumentReference.$inferSelect;
export type FhirReference = typeof fhirReference.$inferSelect;

// Export insert types for FHIR resources
export type InsertFhirResource = z.infer<typeof insertFhirResourceSchema>;
export type InsertFhirPatient = z.infer<typeof insertFhirPatientSchema>;
export type InsertFhirPractitioner = z.infer<typeof insertFhirPractitionerSchema>;
export type InsertFhirOrganization = z.infer<typeof insertFhirOrganizationSchema>;
export type InsertFhirEncounter = z.infer<typeof insertFhirEncounterSchema>;
export type InsertFhirCondition = z.infer<typeof insertFhirConditionSchema>;
export type InsertFhirObservation = z.infer<typeof insertFhirObservationSchema>;
export type InsertFhirMedicationRequest = z.infer<typeof insertFhirMedicationRequestSchema>;
export type InsertFhirClaim = z.infer<typeof insertFhirClaimSchema>;
export type InsertFhirCoverage = z.infer<typeof insertFhirCoverageSchema>;
export type InsertFhirDocumentReference = z.infer<typeof insertFhirDocumentReferenceSchema>;
export type InsertFhirReference = z.infer<typeof insertFhirReferenceSchema>;