/**
 * Model Relationships Management
 * 
 * This module provides utilities for managing and validating model relationships
 * to ensure data integrity and proper relationships between models.
 */

import { relations } from 'drizzle-orm';
import { modelRegistry } from './model-registry';
import { 
  // Directory entities
  organizations, facilities, employers, enhancedProviders, pharmacies, payers,
  
  // Canonical dataset entities
  codeSystems, codeSystemConcepts, codeSystemDesignations,
  valueSets, valueSetIncludes, valueSetExcludes, valueSetExpansions,
  conceptMaps, conceptMapElements,
  feeSchedules, feeScheduleItems,
  clinicalRules, clinicalRuleElements,
  licenses, licenseUsage,
  
  // Directory synchronization entities
  directoryConnections, identityMappings, syncJobs, conflictRecords, webhookSubscriptions
} from './schema';

/**
 * Define relationships for organizations
 */
export const organizationsRelations = relations(organizations, ({ many }) => ({
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

/**
 * Define relationships for facilities
 */
export const facilitiesRelations = relations(facilities, ({ one }) => ({
  // Each facility belongs to an organization
  organization: one(organizations, {
    fields: [facilities.organizationId],
    references: [organizations.id],
  })
}));

/**
 * Define relationships for employers
 */
export const employersRelations = relations(employers, ({ }) => ({
  // Comment: Relationship temporarily disabled due to schema mismatch
  // The employers table does not have an organizationId field
}));

/**
 * Define relationships for enhanced providers
 */
export const enhancedProvidersRelations = relations(enhancedProviders, ({ }) => ({
  // Comment: Relationship temporarily disabled due to schema mismatch
  // The enhancedProviders table does not have a primaryOrganizationId field
}));

/**
 * Define relationships for pharmacies
 */
export const pharmaciesRelations = relations(pharmacies, ({ one }) => ({
  // Each pharmacy is an organization
  organization: one(organizations, {
    fields: [pharmacies.organizationId],
    references: [organizations.id],
  })
}));

/**
 * Define relationships for payers
 */
export const payersRelations = relations(payers, ({ }) => ({
  // Comment: Relationship temporarily disabled due to schema mismatch
  // The payers table does not have an organizationId field
}));

/**
 * Define relationships for code systems
 */
export const codeSystemsRelations = relations(codeSystems, ({ many }) => ({
  // A code system can have multiple concepts
  concepts: many(codeSystemConcepts)
}));

/**
 * Define relationships for code system concepts
 */
export const codeSystemConceptsRelations = relations(codeSystemConcepts, ({ one, many }) => ({
  // Each concept belongs to a code system
  codeSystem: one(codeSystems, {
    fields: [codeSystemConcepts.codeSystemId],
    references: [codeSystems.id],
  }),
  // A concept can have multiple designations (translations, synonyms)
  designations: many(codeSystemDesignations)
}));

/**
 * Define relationships for code system designations
 */
export const codeSystemDesignationsRelations = relations(codeSystemDesignations, ({ }) => ({
  // Comment: Relationship temporarily disabled due to schema mismatch
  // The codeSystemDesignations table does not have a conceptId field
}));

/**
 * Define relationships for value sets
 */
export const valueSetsRelations = relations(valueSets, ({ many }) => ({
  // A value set can have multiple include criteria
  includes: many(valueSetIncludes),
  // A value set can have multiple exclude criteria
  excludes: many(valueSetExcludes),
  // A value set can have multiple expansions (pre-computed membership)
  expansions: many(valueSetExpansions)
}));

/**
 * Define relationships for value set includes
 */
export const valueSetIncludesRelations = relations(valueSetIncludes, ({ one }) => ({
  // Each include criteria belongs to a value set
  valueSet: one(valueSets, {
    fields: [valueSetIncludes.valueSetId],
    references: [valueSets.id],
  })
}));

/**
 * Define relationships for value set excludes
 */
export const valueSetExcludesRelations = relations(valueSetExcludes, ({ one }) => ({
  // Each exclude criteria belongs to a value set
  valueSet: one(valueSets, {
    fields: [valueSetExcludes.valueSetId],
    references: [valueSets.id],
  })
}));

/**
 * Define relationships for value set expansions
 */
export const valueSetExpansionsRelations = relations(valueSetExpansions, ({ one }) => ({
  // Each expansion belongs to a value set
  valueSet: one(valueSets, {
    fields: [valueSetExpansions.valueSetId],
    references: [valueSets.id],
  })
}));

/**
 * Define relationships for concept maps
 */
export const conceptMapsRelations = relations(conceptMaps, ({ many }) => ({
  // A concept map can have multiple mapping elements
  elements: many(conceptMapElements)
}));

/**
 * Define relationships for concept map elements
 */
export const conceptMapElementsRelations = relations(conceptMapElements, ({ one }) => ({
  // Each mapping element belongs to a concept map
  conceptMap: one(conceptMaps, {
    fields: [conceptMapElements.conceptMapId],
    references: [conceptMaps.id],
  })
}));

/**
 * Define relationships for fee schedules
 */
export const feeSchedulesRelations = relations(feeSchedules, ({ many }) => ({
  // A fee schedule can have multiple fee items
  items: many(feeScheduleItems)
}));

/**
 * Define relationships for fee schedule items
 */
export const feeScheduleItemsRelations = relations(feeScheduleItems, ({ one }) => ({
  // Each fee item belongs to a fee schedule
  feeSchedule: one(feeSchedules, {
    fields: [feeScheduleItems.feeScheduleId],
    references: [feeSchedules.id],
  })
}));

/**
 * Define relationships for clinical rules
 */
export const clinicalRulesRelations = relations(clinicalRules, ({ many }) => ({
  // A clinical rule can have multiple rule elements
  elements: many(clinicalRuleElements)
}));

/**
 * Define relationships for clinical rule elements
 */
export const clinicalRuleElementsRelations = relations(clinicalRuleElements, ({ one }) => ({
  // Each rule element belongs to a clinical rule
  clinicalRule: one(clinicalRules, {
    fields: [clinicalRuleElements.ruleId],
    references: [clinicalRules.id],
  })
}));

/**
 * Define relationships for licenses
 */
export const licensesRelations = relations(licenses, ({ }) => ({
  // Comment: Relationship temporarily disabled due to schema mismatch
  // The licenseUsage table does not have a licenseId field required for this relationship
}));

/**
 * Define relationships for license usage
 */
export const licenseUsageRelations = relations(licenseUsage, ({ }) => ({
  // Comment: Relationship temporarily disabled due to schema mismatch
  // The licenseUsage table does not have a licenseId field
}));

/**
 * Define relationships for directory connections
 */
export const directoryConnectionsRelations = relations(directoryConnections, ({ many }) => ({
  // A directory connection can have multiple identity mappings
  identityMappings: many(identityMappings),
  // A directory connection can have multiple sync jobs
  syncJobs: many(syncJobs),
  // A directory connection can have multiple conflict records
  conflictRecords: many(conflictRecords),
  // A directory connection can have multiple webhook subscriptions
  webhookSubscriptions: many(webhookSubscriptions)
}));

/**
 * Define relationships for identity mappings
 */
export const identityMappingsRelations = relations(identityMappings, ({ one }) => ({
  // Each identity mapping belongs to a directory connection
  connection: one(directoryConnections, {
    fields: [identityMappings.connectionId],
    references: [directoryConnections.id],
  })
}));

/**
 * Define relationships for sync jobs
 */
export const syncJobsRelations = relations(syncJobs, ({ one, many }) => ({
  // Each sync job belongs to a directory connection
  connection: one(directoryConnections, {
    fields: [syncJobs.connectionId],
    references: [directoryConnections.id],
  }),
  // A sync job can have multiple conflict records
  conflicts: many(conflictRecords)
}));

/**
 * Define relationships for conflict records
 */
export const conflictRecordsRelations = relations(conflictRecords, ({ one }) => ({
  // Each conflict record belongs to a directory connection
  connection: one(directoryConnections, {
    fields: [conflictRecords.connectionId],
    references: [directoryConnections.id],
  }),
  // Each conflict record is associated with a sync job (temporarily commenting out until schema is updated)
  /* Relationship commented out because syncJobId field is missing from conflictRecords schema
  syncJob: one(syncJobs, {
    fields: [conflictRecords.syncJobId],
    references: [syncJobs.id],
  })
  */
}));

/**
 * Define relationships for webhook subscriptions
 */
export const webhookSubscriptionsRelations = relations(webhookSubscriptions, ({ one }) => ({
  // Each webhook subscription belongs to a directory connection
  connection: one(directoryConnections, {
    fields: [webhookSubscriptions.connectionId],
    references: [directoryConnections.id],
  })
}));

/**
 * Type for describing a relationship between two models
 */
export interface ModelRelationship {
  sourceModel: keyof typeof modelRegistry;
  targetModel: keyof typeof modelRegistry;
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  fieldMappings: Array<{
    sourceField: string;
    targetField: string;
  }>;
  _commented?: boolean; // Optional flag to mark relationships that are not yet implemented
}

/**
 * Registry of all model relationships
 * This serves as documentation and can be used for validation
 */
export const modelRelationships: ModelRelationship[] = [
  // Directory entity relationships
  {
    sourceModel: 'organizations',
    targetModel: 'facilities',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'organizationId',
      }
    ]
  },
  {
    sourceModel: 'organizations',
    targetModel: 'employers',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'organizationId',
      }
    ],
    _commented: true // Relationship temporarily disabled due to schema mismatch
  },
  {
    sourceModel: 'organizations',
    targetModel: 'enhancedProviders',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'primaryOrganizationId',
      }
    ],
    _commented: true // Relationship temporarily disabled due to schema mismatch
  },
  {
    sourceModel: 'organizations',
    targetModel: 'pharmacies',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'organizationId',
      }
    ]
  },
  {
    sourceModel: 'organizations',
    targetModel: 'payers',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'organizationId',
      }
    ],
    _commented: true // Relationship temporarily disabled due to schema mismatch
  },
  
  // Canonical dataset relationships
  {
    sourceModel: 'codeSystems',
    targetModel: 'codeSystemConcepts',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'codeSystemId',
      }
    ]
  },
  {
    sourceModel: 'codeSystemConcepts',
    targetModel: 'codeSystemDesignations',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'conceptId',
      }
    ]
  },
  {
    sourceModel: 'valueSets',
    targetModel: 'valueSetIncludes',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'valueSetId',
      }
    ]
  },
  {
    sourceModel: 'valueSets',
    targetModel: 'valueSetExcludes',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'valueSetId',
      }
    ]
  },
  {
    sourceModel: 'valueSets',
    targetModel: 'valueSetExpansions',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'valueSetId',
      }
    ]
  },
  {
    sourceModel: 'conceptMaps',
    targetModel: 'conceptMapElements',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'conceptMapId',
      }
    ]
  },
  {
    sourceModel: 'feeSchedules',
    targetModel: 'feeScheduleItems',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'feeScheduleId',
      }
    ]
  },
  {
    sourceModel: 'clinicalRules',
    targetModel: 'clinicalRuleElements',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'ruleId',
      }
    ]
  },
  {
    sourceModel: 'licenses',
    targetModel: 'licenseUsage',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'licenseId',
      }
    ],
    _commented: true // Relationship temporarily disabled due to schema mismatch
  },
  
  // Directory synchronization relationships
  {
    sourceModel: 'directoryConnections',
    targetModel: 'identityMappings',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'connectionId',
      }
    ]
  },
  {
    sourceModel: 'directoryConnections',
    targetModel: 'syncJobs',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'connectionId',
      }
    ]
  },
  {
    sourceModel: 'directoryConnections',
    targetModel: 'conflictRecords',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'connectionId',
      }
    ]
  },
  {
    sourceModel: 'directoryConnections',
    targetModel: 'webhookSubscriptions',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'connectionId',
      }
    ]
  },
  {
    sourceModel: 'syncJobs',
    targetModel: 'conflictRecords',
    relationType: 'one-to-many',
    fieldMappings: [
      {
        sourceField: 'id',
        targetField: 'syncJobId',
      }
    ],
    _commented: true // Marking as commented until the schema is updated
  }
];

/**
 * Validate model relationships to ensure they are properly defined
 */
export function validateModelRelationships(): boolean {
  let isValid = true;
  
  // Check if all relationships reference existing models
  for (const relationship of modelRelationships) {
    // Skip validation for commented relationships
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

/**
 * Export all relations for use with Drizzle ORM
 */
export const allRelations = {
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