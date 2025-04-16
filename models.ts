/**
 * Centralized Model Exports
 * 
 * This file provides a single entry point for importing all models and their relationships.
 * Use this file to avoid circular dependencies and standardize model access patterns.
 */

// Export everything from the model registry
export * from './model-registry';

// Export model relationships
export * from './model-relationships';

// Re-export schema definitions for convenience
export * from './schema';

// This file serves as the central export for all model-related modules

/**
 * Centralized Models Export
 * 
 * This file serves as a central entry point for importing all model-related
 * structures, including schemas, types, relationships, and utility functions.
 * 
 * Usage examples:
 * 
 * 1. Import models through the registry:
 *    import { getModel, modelRegistry } from '@shared/models';
 *    const usersModel = getModel('users');
 *    // or
 *    const { users } = modelRegistry;
 * 
 * 2. Importing relationships:
 *    import { allRelations } from '@shared/models';
 *    const db = drizzle(pool, { schema: { ...modelRegistry, ...allRelations } });
 * 
 * 3. Using types:
 *    import type { User, InsertUser } from '@shared/models';
 * 
 * 4. Using validation utilities:
 *    import { validateModels } from '@shared/models';
 *    const { valid, errors } = validateModels();
 */

// Export all individual schemas
export * from './schema';

// Export registry and related utilities
export { 
  modelRegistry,
  getModel,
  getAllModelNames,
  validateModelRegistry,
  tableNameToModel,
  modelDependencyGraph
} from './model-registry';

// Export relationships
export {
  allRelations,
  organizationsRelations,
  facilitiesRelations,
  employersRelations,
  enhancedProvidersRelations,
  pharmaciesRelations,
  payersRelations,
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
  directoryConnectionsRelations,
  identityMappingsRelations,
  syncJobsRelations,
  conflictRecordsRelations,
  webhookSubscriptionsRelations,
  validateModelRelationships,
  modelRelationships
} from './model-relationships';

// Export the ModelRelationship interface type
export type { ModelRelationship } from './model-relationships';

// Export validation utilities
export {
  validateModels,
  generateModelReport
} from './model-validator';