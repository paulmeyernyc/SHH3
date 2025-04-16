/**
 * Protocol Adapter Framework
 * 
 * Defines the interface and base functionality for protocol-specific adapters.
 * Each supported healthcare protocol (FHIR, HL7, X12, etc.) will have its own adapter
 * that implements this interface.
 */

import { ConnectionProfile } from "@shared/integration-schema";

/**
 * Result of data validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  severity: 'ERROR';
  details?: any;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  severity: 'WARNING';
  details?: any;
}

/**
 * Protocol-specific connection
 */
export interface Connection {
  id: string;
  isConnected: boolean;
  profile: ConnectionProfile;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(data: any): Promise<any>;
  receive(): Promise<any>;
  getStatus(): Promise<ConnectionStatus>;
}

/**
 * Connection status
 */
export interface ConnectionStatus {
  connected: boolean;
  lastConnected?: Date;
  lastError?: string;
  metadata?: any;
}

/**
 * Mapping definition between protocol and internal model
 */
export interface MappingDefinition {
  modelId: number;
  protocolType: string;
  protocolVersion: string;
  externalIdentifier: string;
  fieldMappings: FieldMapping[];
  transformationRules?: Record<string, any>;
}

/**
 * Field-level mapping
 */
export interface FieldMapping {
  modelField: string;
  protocolField: string;
  dataType: string;
  isRequired: boolean;
  defaultValue?: any;
  transformationExpression?: string;
}

/**
 * Processing options
 */
export interface ProcessingOptions {
  validateOnly?: boolean;
  includeWarnings?: boolean;
  fullResponse?: boolean;
  transformOptions?: Record<string, any>;
}

/**
 * Processing result
 */
export interface ProcessingResult {
  success: boolean;
  data?: any;
  originalData?: any;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  metadata?: any;
}

/**
 * Base protocol adapter interface
 * All protocol-specific adapters must implement this interface
 */
export interface ProtocolAdapter {
  // Identification
  readonly protocolType: string;
  readonly protocolVersion: string;
  readonly capabilities: string[];
  
  // Validation
  validateInbound(data: any, mappingDefinition: MappingDefinition, options?: ProcessingOptions): Promise<ValidationResult>;
  validateOutbound(data: any, mappingDefinition: MappingDefinition, options?: ProcessingOptions): Promise<ValidationResult>;
  
  // Transformation
  transformInbound(externalData: any, mappingDefinition: MappingDefinition, options?: ProcessingOptions): Promise<ProcessingResult>;
  transformOutbound(internalData: any, mappingDefinition: MappingDefinition, options?: ProcessingOptions): Promise<ProcessingResult>;
  
  // Connection management
  createConnection(profile: ConnectionProfile): Promise<Connection>;
  testConnection(profile: ConnectionProfile): Promise<ConnectionStatus>;
  
  // Protocol-specific operations
  getCapabilities(): string[];
  getSupportedOperations(): string[];
  generateSampleData(mappingDefinition: MappingDefinition): any;
}

/**
 * Abstract base class for protocol adapters
 * Provides common functionality that can be reused across adapters
 */
export abstract class BaseProtocolAdapter implements ProtocolAdapter {
  abstract readonly protocolType: string;
  abstract readonly protocolVersion: string;
  abstract readonly capabilities: string[];
  
  /**
   * Validate data coming from external system
   */
  abstract validateInbound(data: any, mappingDefinition: MappingDefinition, options?: ProcessingOptions): Promise<ValidationResult>;
  
  /**
   * Validate data going to external system
   */
  abstract validateOutbound(data: any, mappingDefinition: MappingDefinition, options?: ProcessingOptions): Promise<ValidationResult>;
  
  /**
   * Transform data from external format to internal model
   */
  abstract transformInbound(externalData: any, mappingDefinition: MappingDefinition, options?: ProcessingOptions): Promise<ProcessingResult>;
  
  /**
   * Transform data from internal model to external format
   */
  abstract transformOutbound(internalData: any, mappingDefinition: MappingDefinition, options?: ProcessingOptions): Promise<ProcessingResult>;
  
  /**
   * Create a connection to the external system
   */
  abstract createConnection(profile: ConnectionProfile): Promise<Connection>;
  
  /**
   * Test connection to the external system
   */
  abstract testConnection(profile: ConnectionProfile): Promise<ConnectionStatus>;
  
  /**
   * Get general adapter capabilities
   */
  getCapabilities(): string[] {
    return this.capabilities;
  }
  
  /**
   * Get supported operations
   */
  getSupportedOperations(): string[] {
    return [];
  }
  
  /**
   * Generate sample data based on mapping definition
   */
  abstract generateSampleData(mappingDefinition: MappingDefinition): any;
  
  /**
   * Apply field mapping to transform data
   * Helper method that can be used by adapter implementations
   */
  protected applyFieldMapping(data: any, mapping: FieldMapping, direction: 'inbound' | 'outbound'): any {
    // Get source and target field paths
    const sourcePath = direction === 'inbound' ? mapping.protocolField : mapping.modelField;
    const targetPath = direction === 'inbound' ? mapping.modelField : mapping.protocolField;
    
    // Get value from source
    const sourceValue = this.getValueByPath(data, sourcePath);
    
    // If source value is undefined, use default if available
    let value = sourceValue !== undefined ? sourceValue : mapping.defaultValue;
    
    // Apply transformation if specified
    if (mapping.transformationExpression && value !== undefined) {
      value = this.applyTransformation(value, mapping.transformationExpression);
    }
    
    // Return the value (for setting in target)
    return value;
  }
  
  /**
   * Get a value from an object by dot notation path
   */
  protected getValueByPath(obj: any, path: string): any {
    if (!obj || !path) {
      return undefined;
    }
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      
      // Handle array indexing
      if (part.includes('[') && part.includes(']')) {
        const arrName = part.substring(0, part.indexOf('['));
        const indexStr = part.substring(part.indexOf('[') + 1, part.indexOf(']'));
        const index = parseInt(indexStr, 10);
        
        if (current[arrName] && Array.isArray(current[arrName]) && !isNaN(index)) {
          current = current[arrName][index];
        } else {
          return undefined;
        }
      } else {
        current = current[part];
      }
    }
    
    return current;
  }
  
  /**
   * Set a value in an object by dot notation path
   */
  protected setValueByPath(obj: any, path: string, value: any): void {
    if (!obj || !path) {
      return;
    }
    
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      // Handle array indexing
      if (part.includes('[') && part.includes(']')) {
        const arrName = part.substring(0, part.indexOf('['));
        const indexStr = part.substring(part.indexOf('[') + 1, part.indexOf(']'));
        const index = parseInt(indexStr, 10);
        
        if (!current[arrName]) {
          current[arrName] = [];
        }
        
        if (!Array.isArray(current[arrName])) {
          current[arrName] = [current[arrName]];
        }
        
        if (current[arrName].length <= index) {
          // Fill array with nulls up to the index
          for (let j = current[arrName].length; j <= index; j++) {
            current[arrName][j] = {};
          }
        }
        
        current = current[arrName][index];
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
    
    const lastPart = parts[parts.length - 1];
    
    // Handle array indexing in the last part
    if (lastPart.includes('[') && lastPart.includes(']')) {
      const arrName = lastPart.substring(0, lastPart.indexOf('['));
      const indexStr = lastPart.substring(lastPart.indexOf('[') + 1, lastPart.indexOf(']'));
      const index = parseInt(indexStr, 10);
      
      if (!current[arrName]) {
        current[arrName] = [];
      }
      
      if (!Array.isArray(current[arrName])) {
        current[arrName] = [current[arrName]];
      }
      
      if (current[arrName].length <= index) {
        // Fill array with nulls up to the index
        for (let j = current[arrName].length; j <= index; j++) {
          current[arrName][j] = null;
        }
      }
      
      current[arrName][index] = value;
    } else {
      current[lastPart] = value;
    }
  }
  
  /**
   * Apply a transformation to a value
   * Handles common transformation expressions
   */
  protected applyTransformation(value: any, expression: string): any {
    // Basic built-in transformations
    if (expression === 'toString') {
      return String(value);
    } else if (expression === 'toNumber') {
      return Number(value);
    } else if (expression === 'toBoolean') {
      return Boolean(value);
    } else if (expression === 'toDate') {
      return new Date(value);
    } else if (expression.startsWith('format:')) {
      const format = expression.substring(7);
      return this.formatValue(value, format);
    } else if (expression.startsWith('map:')) {
      const mapDef = expression.substring(4);
      return this.mapValue(value, mapDef);
    } else if (expression.startsWith('js:')) {
      // Advanced: JavaScript expression (use with caution)
      const jsExpr = expression.substring(3);
      return this.evaluateJsExpression(value, jsExpr);
    }
    
    // Unknown transformation
    return value;
  }
  
  /**
   * Format a value according to a format string
   */
  protected formatValue(value: any, format: string): string {
    // Handle date formatting
    if (format.startsWith('date:')) {
      const dateFormat = format.substring(5);
      const date = value instanceof Date ? value : new Date(value);
      return this.formatDate(date, dateFormat);
    }
    
    // Handle number formatting
    if (format.startsWith('number:')) {
      const numberFormat = format.substring(7);
      return this.formatNumber(Number(value), numberFormat);
    }
    
    // Default string format
    return String(value);
  }
  
  /**
   * Format a date according to a format string
   */
  protected formatDate(date: Date, format: string): string {
    // Simple date formatter - in production use a robust library like date-fns
    if (format === 'ISO') {
      return date.toISOString();
    } else if (format === 'YYYY-MM-DD') {
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    } else if (format === 'MM/DD/YYYY') {
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
    }
    
    return date.toISOString();
  }
  
  /**
   * Format a number according to a format string
   */
  protected formatNumber(num: number, format: string): string {
    // Simple number formatter - in production use a robust library
    if (format.includes('decimal:')) {
      const decimalPlaces = parseInt(format.split(':')[1], 10);
      return num.toFixed(decimalPlaces);
    }
    
    return num.toString();
  }
  
  /**
   * Map a value using a mapping definition
   */
  protected mapValue(value: any, mapDef: string): any {
    // Parse mapping definition (format: "sourceValue1:targetValue1,sourceValue2:targetValue2")
    const mappings = mapDef.split(',');
    const map: Record<string, string> = {};
    
    mappings.forEach(mapping => {
      const [source, target] = mapping.split(':');
      if (source && target) {
        map[source.trim()] = target.trim();
      }
    });
    
    // Return mapped value or original if no mapping found
    return map[value] !== undefined ? map[value] : value;
  }
  
  /**
   * Evaluate a JavaScript expression
   * Note: This should be used with caution and proper sandboxing in production
   */
  protected evaluateJsExpression(value: any, expression: string): any {
    // SECURITY WARNING: This is a simplified version for development
    // In production, use a proper sandbox or avoid dynamic code execution
    try {
      // Simple expression evaluation with the value available as 'x'
      // eslint-disable-next-line no-new-func
      const fn = new Function('x', `return ${expression}`);
      return fn(value);
    } catch (error) {
      console.error(`Error evaluating expression '${expression}':`, error);
      return value;
    }
  }
}

/**
 * Factory for creating and managing protocol adapters
 */
export class ProtocolAdapterFactory {
  private adapters: Map<string, ProtocolAdapter> = new Map();
  
  /**
   * Register a protocol adapter
   */
  registerAdapter(adapter: ProtocolAdapter): void {
    const key = this.getAdapterKey(adapter.protocolType, adapter.protocolVersion);
    this.adapters.set(key, adapter);
    console.log(`Registered protocol adapter: ${adapter.protocolType} ${adapter.protocolVersion}`);
  }
  
  /**
   * Get a protocol adapter by type and version
   */
  getAdapter(protocolType: string, version: string): ProtocolAdapter {
    const key = this.getAdapterKey(protocolType, version);
    const adapter = this.adapters.get(key);
    
    if (!adapter) {
      throw new Error(`No adapter found for protocol ${protocolType} version ${version}`);
    }
    
    return adapter;
  }
  
  /**
   * Get all registered adapters
   */
  getAllAdapters(): ProtocolAdapter[] {
    return Array.from(this.adapters.values());
  }
  
  /**
   * Get the supported protocol types
   */
  getSupportedProtocols(): { type: string; version: string }[] {
    return Array.from(this.adapters.entries()).map(([key]) => {
      const [type, version] = key.split(':');
      return { type, version };
    });
  }
  
  /**
   * Generate adapter key from protocol type and version
   */
  private getAdapterKey(type: string, version: string): string {
    return `${type}:${version}`;
  }
}