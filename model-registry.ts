/**
 * Centralized Model Registry
 * 
 * This module acts as a central registry for all database models, allowing access
 * without creating circular dependencies. It also provides utilities for model validation
 * and relationship management.
 */

import { pgTable } from 'drizzle-orm/pg-core';
import { 
  // Only import what currently exists
  organizations, facilities, employers, 
  enhancedProviders, pharmacies, payers,
  
  // Canonical dataset entities
  codeSystems, codeSystemConcepts, codeSystemDesignations,
  valueSets, valueSetIncludes, valueSetExcludes, valueSetExpansions,
  conceptMaps, conceptMapElements, feeSchedules, feeScheduleItems,
  clinicalRules, clinicalRuleElements, licenses, licenseUsage,
  
  // Directory synchronization entities
  directoryConnections, identityMappings, syncJobs, conflictRecords, webhookSubscriptions
} from './schema';

import type { 
  // Legacy types
  User, Patient, Provider, Claim, FhirResource,
  InsertUser, InsertPatient, InsertProvider, InsertClaim, InsertFhirResource,
  
  // Base entity types
  Person, PatientIndex, UserDirectory, Organization, Facility, Employer, 
  PersonEmployerAffiliation, PersonPayerAffiliation,
  InsertPerson, InsertPatientIndex, InsertUserDirectory, InsertOrganization, InsertFacility, 
  InsertEmployer, InsertPersonEmployerAffiliation, InsertPersonPayerAffiliation,
  
  // Healthcare entity types
  EnhancedPatient, EnhancedProvider, PayerPlan, Encounter,
  InsertEnhancedPatient, InsertEnhancedProvider, InsertPayerPlan, InsertEncounter,
  
  // Administrative entity types
  EnhancedClaim, PriorAuthorization, Eligibility, Referral,
  InsertEnhancedClaim, InsertPriorAuthorization, InsertEligibility, InsertReferral,
  
  // Clinical entity types
  Condition, Medication, Procedure, Observation,
  InsertCondition, InsertMedication, InsertProcedure, InsertObservation,
  
  // Financial entity types
  Contract, FeeSchedule, Payment, CostEstimate,
  InsertContract, InsertFeeSchedule, InsertPayment, InsertCostEstimate
} from './schema';

/**
 * Model registry that contains all models
 */
export interface ModelRegistry {
  // Directory entities
  organizations: typeof organizations;
  facilities: typeof facilities;
  employers: typeof employers;
  enhancedProviders: typeof enhancedProviders;
  pharmacies: typeof pharmacies;
  payers: typeof payers;
  
  // Canonical dataset entities
  codeSystems: typeof codeSystems;
  codeSystemConcepts: typeof codeSystemConcepts;
  codeSystemDesignations: typeof codeSystemDesignations;
  valueSets: typeof valueSets;
  valueSetIncludes: typeof valueSetIncludes;
  valueSetExcludes: typeof valueSetExcludes;
  valueSetExpansions: typeof valueSetExpansions;
  conceptMaps: typeof conceptMaps;
  conceptMapElements: typeof conceptMapElements;
  feeSchedules: typeof feeSchedules;
  feeScheduleItems: typeof feeScheduleItems;
  clinicalRules: typeof clinicalRules;
  clinicalRuleElements: typeof clinicalRuleElements;
  licenses: typeof licenses;
  licenseUsage: typeof licenseUsage;
  
  // Directory synchronization entities
  directoryConnections: typeof directoryConnections;
  identityMappings: typeof identityMappings;
  syncJobs: typeof syncJobs;
  conflictRecords: typeof conflictRecords;
  webhookSubscriptions: typeof webhookSubscriptions;
}

/**
 * Select types registry containing all entity select types
 */
export interface SelectTypes {
  // Legacy types
  User: User;
  Patient: Patient;
  Provider: Provider;
  Claim: Claim;
  FhirResource: FhirResource;
  
  // Base entity types
  Person: Person;
  PatientIndex: PatientIndex;
  UserDirectory: UserDirectory;
  Organization: Organization;
  Facility: Facility;
  Employer: Employer;
  PersonEmployerAffiliation: PersonEmployerAffiliation;
  PersonPayerAffiliation: PersonPayerAffiliation;
  
  // Healthcare entity types
  EnhancedPatient: EnhancedPatient;
  EnhancedProvider: EnhancedProvider;
  PayerPlan: PayerPlan;
  Encounter: Encounter;
  
  // Administrative entity types
  EnhancedClaim: EnhancedClaim;
  PriorAuthorization: PriorAuthorization;
  Eligibility: Eligibility;
  Referral: Referral;
  
  // Clinical entity types
  Condition: Condition;
  Medication: Medication;
  Procedure: Procedure;
  Observation: Observation;
  
  // Financial entity types
  Contract: Contract;
  FeeSchedule: FeeSchedule;
  Payment: Payment;
  CostEstimate: CostEstimate;
}

/**
 * Insert types registry containing all entity insert types
 */
export interface InsertTypes {
  // Legacy types
  InsertUser: InsertUser;
  InsertPatient: InsertPatient;
  InsertProvider: InsertProvider;
  InsertClaim: InsertClaim;
  InsertFhirResource: InsertFhirResource;
  
  // Base entity types
  InsertPerson: InsertPerson;
  InsertPatientIndex: InsertPatientIndex;
  InsertUserDirectory: InsertUserDirectory;
  InsertOrganization: InsertOrganization;
  InsertFacility: InsertFacility;
  InsertEmployer: InsertEmployer;
  InsertPersonEmployerAffiliation: InsertPersonEmployerAffiliation;
  InsertPersonPayerAffiliation: InsertPersonPayerAffiliation;
  
  // Healthcare entity types
  InsertEnhancedPatient: InsertEnhancedPatient;
  InsertEnhancedProvider: InsertEnhancedProvider;
  InsertPayerPlan: InsertPayerPlan;
  InsertEncounter: InsertEncounter;
  
  // Administrative entity types
  InsertEnhancedClaim: InsertEnhancedClaim;
  InsertPriorAuthorization: InsertPriorAuthorization;
  InsertEligibility: InsertEligibility;
  InsertReferral: InsertReferral;
  
  // Clinical entity types
  InsertCondition: InsertCondition;
  InsertMedication: InsertMedication;
  InsertProcedure: InsertProcedure;
  InsertObservation: InsertObservation;
  
  // Financial entity types
  InsertContract: InsertContract;
  InsertFeeSchedule: InsertFeeSchedule;
  InsertPayment: InsertPayment;
  InsertCostEstimate: InsertCostEstimate;
}

/**
 * Registry of all models in the application
 */
export const modelRegistry: ModelRegistry = {
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

/**
 * Map of table names to their corresponding models
 */
export const tableNameToModel: Record<string, any> = {
  // Directory entities
  organizations: organizations,
  facilities: facilities,
  employers: employers,
  enhanced_providers: enhancedProviders,
  pharmacies: pharmacies,
  payers: payers,
  
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
  licenses: licenses,
  license_usage: licenseUsage,
  
  // Directory synchronization entities
  directory_connections: directoryConnections,
  identity_mappings: identityMappings,
  sync_jobs: syncJobs,
  conflict_records: conflictRecords,
  webhook_subscriptions: webhookSubscriptions,
  
  // Add aliases for camelCase names
  enhancedProviders: enhancedProviders,
  codeSystems: codeSystems,
  codeSystemConcepts: codeSystemConcepts,
  codeSystemDesignations: codeSystemDesignations,
  valueSets: valueSets,
  valueSetIncludes: valueSetIncludes,
  valueSetExcludes: valueSetExcludes,
  valueSetExpansions: valueSetExpansions,
  conceptMaps: conceptMaps,
  conceptMapElements: conceptMapElements,
  feeSchedules: feeSchedules,
  feeScheduleItems: feeScheduleItems,
  clinicalRules: clinicalRules,
  clinicalRuleElements: clinicalRuleElements,
  directoryConnections: directoryConnections,
  identityMappings: identityMappings,
  syncJobs: syncJobs,
  conflictRecords: conflictRecords,
  webhookSubscriptions: webhookSubscriptions
};

/**
 * Model dependency graph for reference
 * Used for understanding model relationships and dependency order
 */
export const modelDependencyGraph = {
  // Directory entities
  organizations: [],
  facilities: ['organizations'],
  employers: ['organizations'],
  enhancedProviders: ['organizations'],
  pharmacies: ['organizations'],
  payers: ['organizations'],
  
  // Canonical dataset entities
  codeSystems: [],
  codeSystemConcepts: ['codeSystems'],
  codeSystemDesignations: ['codeSystems'],
  valueSets: [],
  valueSetIncludes: ['valueSets', 'codeSystems'],
  valueSetExcludes: ['valueSets', 'codeSystems'],
  valueSetExpansions: ['valueSets'],
  conceptMaps: ['codeSystems'],
  conceptMapElements: ['conceptMaps'],
  feeSchedules: [],
  feeScheduleItems: ['feeSchedules', 'codeSystems'],
  clinicalRules: [],
  clinicalRuleElements: ['clinicalRules'],
  licenses: [],
  licenseUsage: ['licenses'],
  
  // Directory synchronization entities
  directoryConnections: [],
  identityMappings: [],
  syncJobs: [],
  conflictRecords: [],
  webhookSubscriptions: []
};

/**
 * Get a model by name
 */
export function getModel(modelName: keyof ModelRegistry) {
  return modelRegistry[modelName];
}

/**
 * Get all available model names
 */
export function getAllModelNames(): Array<keyof ModelRegistry> {
  return Object.keys(modelRegistry) as Array<keyof ModelRegistry>;
}

/**
 * Validate the model registry to ensure all models are properly registered
 */
export function validateModelRegistry(): boolean {
  // Check if all models are defined
  const requiredModels: Array<keyof ModelRegistry> = [
    // Directory entities
    'organizations', 'facilities', 'employers', 'enhancedProviders', 'pharmacies', 'payers',
    
    // Canonical dataset entities
    'codeSystems', 'codeSystemConcepts', 'codeSystemDesignations', 
    'valueSets', 'valueSetIncludes', 'valueSetExcludes', 'valueSetExpansions',
    'conceptMaps', 'conceptMapElements', 
    'feeSchedules', 'feeScheduleItems',
    'clinicalRules', 'clinicalRuleElements',
    'licenses', 'licenseUsage',
    
    // Directory synchronization entities
    'directoryConnections', 'identityMappings', 'syncJobs', 'conflictRecords', 'webhookSubscriptions'
  ];
  
  for (const modelName of requiredModels) {
    if (!modelRegistry[modelName]) {
      console.error(`Model registry validation failed: ${modelName} is missing`);
      return false;
    }
  }
  
  // Check dependency graph for completeness
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