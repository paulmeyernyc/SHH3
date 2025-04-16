/**
 * Drizzle ORM OpenAPI Documentation Generator
 * 
 * This module provides functionality to generate OpenAPI documentation
 * from Drizzle ORM schema definitions.
 */

import { AnyPgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';

// Type mapping from SQL/Drizzle types to OpenAPI/JSON schema types
const TYPE_MAPPING: Record<string, { type: string; format?: string }> = {
  // Drizzle numeric types
  serial: { type: 'integer' },
  integer: { type: 'integer' },
  bigint: { type: 'integer', format: 'int64' },
  smallint: { type: 'integer', format: 'int32' },
  real: { type: 'number', format: 'float' },
  doublePrecision: { type: 'number', format: 'double' },
  decimal: { type: 'number' },
  numeric: { type: 'number' },
  
  // Drizzle string types
  text: { type: 'string' },
  varchar: { type: 'string' },
  char: { type: 'string' },
  
  // Drizzle boolean type
  boolean: { type: 'boolean' },
  
  // Drizzle date/time types
  date: { type: 'string', format: 'date' },
  timestamp: { type: 'string', format: 'date-time' },
  timestamptz: { type: 'string', format: 'date-time' },
  time: { type: 'string', format: 'time' },
  timetz: { type: 'string', format: 'time' },
  
  // Drizzle JSON types
  json: { type: 'object' },
  jsonb: { type: 'object' },
  
  // Drizzle array types (will be handled separately to add items property)
  array: { type: 'array' },
  
  // UUID type
  uuid: { type: 'string', format: 'uuid' },
};

/**
 * Generate OpenAPI schema from Drizzle table schema
 */
export function generateSchemaFromDrizzleTable<T extends PgTableWithColumns<any>>(
  table: T,
  options: {
    description?: string;
    includeExample?: boolean;
    requiredFields?: string[];
  } = {}
): Record<string, any> {
  const properties: Record<string, any> = {};
  const requiredFields = options.requiredFields || [];
  
  // Extract table name and convert to PascalCase for schema name
  const tableName = table._.name;
  const pascalCaseTableName = tableName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  // Process each column from the table definition
  for (const columnName in table) {
    if (columnName === '_') continue; // Skip internal properties
    
    const column = table[columnName];
    
    // Skip columns that are not actual table columns
    if (typeof column === 'function' || !column) continue;
    
    // Extract column data type if possible
    let dataType = '';
    let isArray = false;
    
    try {
      // Access internal Drizzle properties (note: this is implementation-specific and may change)
      // @ts-ignore - Drizzle internal API is not fully typed
      dataType = column.dataType?.toLowerCase() || '';
      
      // Check if it's an array type
      // @ts-ignore - Drizzle internal API is not fully typed
      isArray = column.isArray || false;
    } catch (e) {
      // Fallback if internal properties are not accessible
      dataType = 'unknown';
    }
    
    // Map Drizzle data type to OpenAPI type
    let typeInfo = TYPE_MAPPING[dataType] || { type: 'string' };
    
    // Handle array types
    if (isArray) {
      typeInfo = {
        type: 'array',
        items: TYPE_MAPPING[dataType] || { type: 'string' },
      };
    }
    
    // Create the property definition
    const property: Record<string, any> = {
      type: typeInfo.type,
    };
    
    // Add format if available
    if (typeInfo.format) {
      property.format = typeInfo.format;
    }
    
    // Add description if available
    // @ts-ignore - Drizzle internal API is not fully typed
    if (column.description) {
      // @ts-ignore - Drizzle internal API is not fully typed
      property.description = column.description;
    }
    
    // Add example if requested
    if (options.includeExample) {
      property.example = generateExampleValue(dataType, isArray);
    }
    
    // Add the property to the schema
    properties[columnName] = property;
  }
  
  // Create the full schema definition
  const schema = {
    type: 'object',
    description: options.description || `${pascalCaseTableName} schema`,
    properties,
  };
  
  // Add required fields if specified
  if (requiredFields.length > 0) {
    schema.required = requiredFields;
  }
  
  return { [pascalCaseTableName]: schema };
}

/**
 * Generate example value based on data type
 */
function generateExampleValue(dataType: string, isArray: boolean): any {
  let value;
  
  switch (dataType) {
    case 'serial':
    case 'integer':
    case 'bigint':
    case 'smallint':
      value = 1;
      break;
    case 'real':
    case 'doublePrecision':
    case 'decimal':
    case 'numeric':
      value = 1.23;
      break;
    case 'text':
    case 'varchar':
    case 'char':
      value = 'example';
      break;
    case 'boolean':
      value = true;
      break;
    case 'date':
      value = '2023-01-01';
      break;
    case 'timestamp':
    case 'timestamptz':
      value = '2023-01-01T12:00:00Z';
      break;
    case 'time':
    case 'timetz':
      value = '12:00:00';
      break;
    case 'json':
    case 'jsonb':
      value = { key: 'value' };
      break;
    case 'uuid':
      value = '123e4567-e89b-12d3-a456-426614174000';
      break;
    default:
      value = 'example';
  }
  
  return isArray ? [value] : value;
}

/**
 * Generate OpenAPI schemas from multiple Drizzle tables
 */
export function generateSchemasFromDrizzleTables(
  tables: Record<string, PgTableWithColumns<any>>,
  options: {
    descriptions?: Record<string, string>;
    includeExamples?: boolean;
    requiredFields?: Record<string, string[]>;
  } = {}
): Record<string, any> {
  const schemas: Record<string, any> = {};
  
  for (const tableName in tables) {
    const table = tables[tableName];
    
    const schema = generateSchemaFromDrizzleTable(table, {
      description: options.descriptions?.[tableName],
      includeExample: options.includeExamples,
      requiredFields: options.requiredFields?.[tableName],
    });
    
    Object.assign(schemas, schema);
  }
  
  return { schemas };
}

/**
 * Generate request and response schemas for CRUD operations
 */
export function generateCrudSchemas(
  tableName: string,
  options: {
    excludeFromCreate?: string[];
    excludeFromUpdate?: string[];
    readOnly?: string[];
    writeOnly?: string[];
    description?: string;
  } = {}
): Record<string, any> {
  const schemas: Record<string, any> = {};
  
  const pascalCaseTableName = tableName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  const baseSchemaName = pascalCaseTableName;
  
  // The base reference schema should already exist from generateSchemaFromDrizzleTable
  // We're just defining the CRUD variations
  
  // Create request schema (excludes IDs, timestamps, etc.)
  schemas[`${baseSchemaName}Create`] = {
    allOf: [
      {
        $ref: `#/components/schemas/${baseSchemaName}`,
      },
      {
        type: 'object',
        properties: options.excludeFromCreate?.reduce((acc, field) => {
          acc[field] = { readOnly: true };
          return acc;
        }, {}),
      },
    ],
    description: `Schema for creating a new ${tableName}`,
  };
  
  // Update request schema (similar to create but some fields may differ)
  schemas[`${baseSchemaName}Update`] = {
    allOf: [
      {
        $ref: `#/components/schemas/${baseSchemaName}`,
      },
      {
        type: 'object',
        properties: options.excludeFromUpdate?.reduce((acc, field) => {
          acc[field] = { readOnly: true };
          return acc;
        }, {}),
      },
    ],
    description: `Schema for updating a ${tableName}`,
  };
  
  // Response schema (may include additional metadata)
  schemas[`${baseSchemaName}Response`] = {
    allOf: [
      {
        $ref: `#/components/schemas/${baseSchemaName}`,
      },
      {
        type: 'object',
        properties: {},
      },
    ],
    description: `Schema for ${tableName} response`,
  };
  
  return schemas;
}

/**
 * Generate a complete set of OpenAPI components from Drizzle schema
 */
export function generateDrizzleComponents(
  tables: Record<string, PgTableWithColumns<any>>,
  options: {
    descriptions?: Record<string, string>;
    includeExamples?: boolean;
    requiredFields?: Record<string, string[]>;
    crudOptions?: Record<string, {
      excludeFromCreate?: string[];
      excludeFromUpdate?: string[];
      readOnly?: string[];
      writeOnly?: string[];
    }>;
  } = {}
): Record<string, any> {
  // Generate base schemas
  const baseSchemas = generateSchemasFromDrizzleTables(tables, {
    descriptions: options.descriptions,
    includeExamples: options.includeExamples,
    requiredFields: options.requiredFields,
  }).schemas;
  
  let schemas = { ...baseSchemas };
  
  // Generate CRUD schemas if requested
  if (options.crudOptions) {
    for (const tableName in options.crudOptions) {
      const crudSchemas = generateCrudSchemas(
        tableName,
        options.crudOptions[tableName]
      );
      
      schemas = { ...schemas, ...crudSchemas };
    }
  }
  
  return { schemas };
}