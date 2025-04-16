/**
 * Search Service Database Schema
 * 
 * This module defines the database schema for the Search Service:
 * - Search Indices (configuration for what data is indexed and how)
 * - Search Mappings (field mappings for each index)
 * - Search Configurations (search service configuration settings)
 * - Search History (tracking of search queries for analytics)
 * - Search Filters (saved filter configurations)
 * - Search Synonyms (domain-specific synonyms for query expansion)
 */

import { pgTable, pgEnum, serial, text, timestamp, integer, boolean, jsonb, uuid, foreignKey, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums
export const searchDataTypeEnum = pgEnum('search_data_type', [
  'patient',
  'claim',
  'provider',
  'medication',
  'document',
  'note',
  'appointment',
  'condition',
  'procedure',
  'allergy',
  'lab_result',
  'encounter',
  'vital_sign',
  'immunization',
  'care_plan',
  'other'
]);

export const searchFieldTypeEnum = pgEnum('search_field_type', [
  'text',
  'keyword',
  'integer',
  'float',
  'date',
  'boolean',
  'geo_point',
  'object',
  'nested'
]);

export const searchFilterTypeEnum = pgEnum('search_filter_type', [
  'term',
  'range',
  'match',
  'exists',
  'geo_distance',
  'nested',
  'custom'
]);

export const searchOperationEnum = pgEnum('search_operation', [
  'search',
  'index',
  'update',
  'delete',
  'reindex',
  'analyze',
  'bulk'
]);

// Tables
export const searchIndices = pgTable('search_indices', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  
  dataType: searchDataTypeEnum('data_type').notNull(),
  sourceTable: text('source_table'),
  
  refreshInterval: text('refresh_interval').default('30s'),
  numberOfShards: integer('number_of_shards').default(1),
  numberOfReplicas: integer('number_of_replicas').default(1),
  
  pipeline: text('pipeline'),
  settings: jsonb('settings').default({}),
  
  isActive: boolean('is_active').notNull().default(true),
  
  lastIndexed: timestamp('last_indexed'),
  documentCount: integer('document_count').default(0),
  
  syncFrequency: text('sync_frequency').default('1h'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by')
}, (table) => {
  return {
    nameIdx: uniqueIndex('search_indices_name_idx').on(table.name),
    dataTypeIdx: index('search_indices_data_type_idx').on(table.dataType),
    activeIdx: index('search_indices_active_idx').on(table.isActive)
  };
});

export const searchMappings = pgTable('search_mappings', {
  id: serial('id').primaryKey(),
  indexId: integer('index_id').notNull().references(() => searchIndices.id, { onDelete: 'cascade' }),
  
  fieldName: text('field_name').notNull(),
  fieldPath: text('field_path'),
  fieldType: searchFieldTypeEnum('field_type').notNull(),
  
  isSearchable: boolean('is_searchable').notNull().default(true),
  isAggregatable: boolean('is_aggregatable').notNull().default(false),
  boost: integer('boost').default(1),
  
  analyzer: text('analyzer'),
  searchAnalyzer: text('search_analyzer'),
  
  options: jsonb('options').default({}),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => {
  return {
    indexFieldIdx: uniqueIndex('search_mappings_index_field_idx').on(table.indexId, table.fieldName),
    indexIdx: index('search_mappings_index_idx').on(table.indexId)
  };
});

export const searchConfigurations = pgTable('search_configurations', {
  id: serial('id').primaryKey(),
  
  configKey: text('config_key').notNull(),
  configValue: text('config_value'),
  configValueJson: jsonb('config_value_json'),
  
  description: text('description'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by')
}, (table) => {
  return {
    configKeyIdx: uniqueIndex('search_configurations_key_idx').on(table.configKey)
  };
});

export const searchHistory = pgTable('search_history', {
  id: serial('id').primaryKey(),
  
  userId: integer('user_id'),
  sessionId: text('session_id'),
  
  query: text('query').notNull(),
  indices: text('indices').array(),
  filters: jsonb('filters').default({}),
  
  resultCount: integer('result_count'),
  executionTimeMs: integer('execution_time_ms'),
  
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  
  metadata: jsonb('metadata').default({})
}, (table) => {
  return {
    userIdx: index('search_history_user_idx').on(table.userId),
    sessionIdx: index('search_history_session_idx').on(table.sessionId),
    timestampIdx: index('search_history_timestamp_idx').on(table.timestamp)
  };
});

export const searchFilters = pgTable('search_filters', {
  id: serial('id').primaryKey(),
  
  name: text('name').notNull(),
  description: text('description'),
  
  indexId: integer('index_id').references(() => searchIndices.id, { onDelete: 'set null' }),
  dataType: searchDataTypeEnum('data_type'),
  
  filterType: searchFilterTypeEnum('filter_type').notNull(),
  filterConfig: jsonb('filter_config').notNull(),
  
  isGlobal: boolean('is_global').notNull().default(false),
  userId: integer('user_id'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => {
  return {
    nameIdx: uniqueIndex('search_filters_name_user_idx').on(table.name, table.userId),
    indexIdx: index('search_filters_index_idx').on(table.indexId),
    userIdx: index('search_filters_user_idx').on(table.userId),
    typeIdx: index('search_filters_type_idx').on(table.filterType)
  };
});

export const searchSynonyms = pgTable('search_synonyms', {
  id: serial('id').primaryKey(),
  
  indexId: integer('index_id').references(() => searchIndices.id, { onDelete: 'cascade' }),
  
  term: text('term').notNull(),
  synonyms: text('synonyms').array().notNull(),
  
  isActive: boolean('is_active').notNull().default(true),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by')
}, (table) => {
  return {
    indexTermIdx: uniqueIndex('search_synonyms_index_term_idx').on(table.indexId, table.term),
    indexIdx: index('search_synonyms_index_idx').on(table.indexId),
    termIdx: index('search_synonyms_term_idx').on(table.term)
  };
});

export const searchOperations = pgTable('search_operations', {
  id: serial('id').primaryKey(),
  
  operation: searchOperationEnum('operation').notNull(),
  
  indexId: integer('index_id').references(() => searchIndices.id, { onDelete: 'set null' }),
  status: text('status').notNull(),
  
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  
  documentCount: integer('document_count'),
  errorCount: integer('error_count').default(0),
  
  details: jsonb('details').default({}),
  error: text('error'),
  
  requestedBy: integer('requested_by')
}, (table) => {
  return {
    operationIdx: index('search_operations_operation_idx').on(table.operation),
    indexIdx: index('search_operations_index_idx').on(table.indexId),
    statusIdx: index('search_operations_status_idx').on(table.status),
    startedAtIdx: index('search_operations_started_at_idx').on(table.startedAt)
  };
});

// Zod schemas for validation
export const insertSearchIndexSchema = createInsertSchema(searchIndices);
export const insertSearchMappingSchema = createInsertSchema(searchMappings);
export const insertSearchConfigurationSchema = createInsertSchema(searchConfigurations);
export const insertSearchHistorySchema = createInsertSchema(searchHistory);
export const insertSearchFilterSchema = createInsertSchema(searchFilters);
export const insertSearchSynonymSchema = createInsertSchema(searchSynonyms);
export const insertSearchOperationSchema = createInsertSchema(searchOperations);

// TypeScript types
export type SearchIndex = typeof searchIndices.$inferSelect;
export type SearchMapping = typeof searchMappings.$inferSelect;
export type SearchConfiguration = typeof searchConfigurations.$inferSelect;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type SearchFilter = typeof searchFilters.$inferSelect;
export type SearchSynonym = typeof searchSynonyms.$inferSelect;
export type SearchOperation = typeof searchOperations.$inferSelect;

export type InsertSearchIndex = z.infer<typeof insertSearchIndexSchema>;
export type InsertSearchMapping = z.infer<typeof insertSearchMappingSchema>;
export type InsertSearchConfiguration = z.infer<typeof insertSearchConfigurationSchema>;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type InsertSearchFilter = z.infer<typeof insertSearchFilterSchema>;
export type InsertSearchSynonym = z.infer<typeof insertSearchSynonymSchema>;
export type InsertSearchOperation = z.infer<typeof insertSearchOperationSchema>;

// Define relationships between tables
export const relations = {
  searchIndices: {
    mappings: {
      relationName: 'indexToMappings',
      columns: [searchIndices.id],
      foreignColumns: [searchMappings.indexId]
    },
    synonyms: {
      relationName: 'indexToSynonyms',
      columns: [searchIndices.id],
      foreignColumns: [searchSynonyms.indexId]
    },
    filters: {
      relationName: 'indexToFilters',
      columns: [searchIndices.id],
      foreignColumns: [searchFilters.indexId]
    },
    operations: {
      relationName: 'indexToOperations',
      columns: [searchIndices.id],
      foreignColumns: [searchOperations.indexId]
    }
  },
  
  searchMappings: {
    index: {
      relationName: 'mappingToIndex',
      columns: [searchMappings.indexId],
      foreignColumns: [searchIndices.id]
    }
  },
  
  searchFilters: {
    index: {
      relationName: 'filterToIndex',
      columns: [searchFilters.indexId],
      foreignColumns: [searchIndices.id]
    }
  },
  
  searchSynonyms: {
    index: {
      relationName: 'synonymToIndex',
      columns: [searchSynonyms.indexId],
      foreignColumns: [searchIndices.id]
    }
  },
  
  searchOperations: {
    index: {
      relationName: 'operationToIndex',
      columns: [searchOperations.indexId],
      foreignColumns: [searchIndices.id]
    }
  }
};