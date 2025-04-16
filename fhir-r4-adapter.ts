/**
 * FHIR R4 Protocol Adapter
 * 
 * Implements the Protocol Adapter interface for FHIR R4 standard
 * (Fast Healthcare Interoperability Resources, Release 4)
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  BaseProtocolAdapter,
  Connection,
  ConnectionStatus,
  MappingDefinition,
  ProcessingOptions,
  ProcessingResult,
  ValidationError,
  ValidationResult,
  ValidationWarning
} from './protocol-adapter';
import { ConnectionProfile } from '@shared/integration-schema';

/**
 * FHIR R4 Resource Types
 */
export enum FHIRResourceType {
  Patient = 'Patient',
  Practitioner = 'Practitioner',
  Organization = 'Organization',
  Encounter = 'Encounter',
  Observation = 'Observation',
  Condition = 'Condition',
  Procedure = 'Procedure',
  MedicationRequest = 'MedicationRequest',
  Medication = 'Medication',
  AllergyIntolerance = 'AllergyIntolerance',
  Immunization = 'Immunization',
  DiagnosticReport = 'DiagnosticReport',
  DocumentReference = 'DocumentReference',
  QuestionnaireResponse = 'QuestionnaireResponse',
  CarePlan = 'CarePlan',
  Claim = 'Claim',
  Coverage = 'Coverage',
  ExplanationOfBenefit = 'ExplanationOfBenefit'
}

/**
 * FHIR R4 Connection implementation
 */
export class FHIRR4Connection implements Connection {
  id: string;
  isConnected: boolean = false;
  private client: AxiosInstance;
  private lastError?: string;
  private lastConnected?: Date;
  private metadata: any = {};

  constructor(public profile: ConnectionProfile) {
    this.id = `fhir-r4-${profile.id}-${Date.now()}`;
    
    // Create HTTP client
    const config: AxiosRequestConfig = {
      baseURL: profile.connectionDetails.baseUrl as string,
      timeout: (profile.connectionOptions?.timeout as number) || 30000,
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json'
      }
    };
    
    // Add authentication if provided
    if (profile.securityType === 'BASIC') {
      config.auth = {
        username: profile.securitySettings?.username as string,
        password: profile.securitySettings?.password as string
      };
    } else if (profile.securityType === 'API_KEY') {
      const apiKeyHeader = profile.securitySettings?.apiKeyHeader as string || 'x-api-key';
      config.headers = {
        ...config.headers,
        [apiKeyHeader]: profile.securitySettings?.apiKey
      };
    } else if (profile.securityType === 'OAUTH2' && profile.securitySettings?.accessToken) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${profile.securitySettings.accessToken}`
      };
    }
    
    this.client = axios.create(config);
  }

  /**
   * Connect to the FHIR server
   */
  async connect(): Promise<void> {
    try {
      // Test connection with metadata endpoint
      const response = await this.client.get('/metadata');
      
      if (response.status === 200) {
        this.isConnected = true;
        this.lastConnected = new Date();
        this.metadata = response.data;
        return;
      }
      
      throw new Error(`Unexpected response: ${response.status}`);
    } catch (error) {
      this.isConnected = false;
      this.lastError = error.message || 'Unknown error';
      throw new Error(`Failed to connect to FHIR server: ${this.lastError}`);
    }
  }

  /**
   * Disconnect from FHIR server (no-op for HTTP)
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  /**
   * Send data to FHIR server
   */
  async send(data: any): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      // Determine if this is a create or update
      const resourceType = data.resourceType;
      const id = data.id;
      
      if (!resourceType) {
        throw new Error('Missing resourceType in FHIR resource');
      }
      
      let response;
      if (id) {
        // Update existing resource
        response = await this.client.put(`/${resourceType}/${id}`, data);
      } else {
        // Create new resource
        response = await this.client.post(`/${resourceType}`, data);
      }
      
      return response.data;
    } catch (error) {
      this.lastError = error.message || 'Unknown error';
      throw new Error(`Failed to send data to FHIR server: ${this.lastError}`);
    }
  }

  /**
   * Receive data from FHIR server (query)
   */
  async receive(resourceType?: string, query?: Record<string, string>): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      let endpoint = '/';
      
      if (resourceType) {
        endpoint += resourceType;
        
        // Add query parameters
        if (query && Object.keys(query).length > 0) {
          const queryString = Object.entries(query)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
          
          endpoint += `?${queryString}`;
        }
      }
      
      const response = await this.client.get(endpoint);
      return response.data;
    } catch (error) {
      this.lastError = error.message || 'Unknown error';
      throw new Error(`Failed to receive data from FHIR server: ${this.lastError}`);
    }
  }

  /**
   * Get FHIR connection status
   */
  async getStatus(): Promise<ConnectionStatus> {
    return {
      connected: this.isConnected,
      lastConnected: this.lastConnected,
      lastError: this.lastError,
      metadata: this.metadata
    };
  }
}

/**
 * FHIR R4 Adapter Implementation
 */
export class FHIRR4Adapter extends BaseProtocolAdapter {
  readonly protocolType = 'FHIR_R4';
  readonly protocolVersion = '4.0.1';
  readonly capabilities = [
    'query',
    'create',
    'update',
    'delete',
    'transaction',
    'history',
    'search',
    'validate'
  ];
  
  /**
   * Validate incoming FHIR data
   */
  async validateInbound(data: any, mappingDefinition: MappingDefinition, options?: ProcessingOptions): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check if it's a valid FHIR resource
    if (!data.resourceType) {
      errors.push({
        code: 'MISSING_RESOURCE_TYPE',
        message: 'Missing resourceType in FHIR resource',
        severity: 'ERROR'
      });
    } else if (data.resourceType !== mappingDefinition.externalIdentifier) {
      errors.push({
        code: 'RESOURCE_TYPE_MISMATCH',
        message: `Resource type ${data.resourceType} does not match expected type ${mappingDefinition.externalIdentifier}`,
        severity: 'ERROR'
      });
    }
    
    // Check required fields
    for (const mapping of mappingDefinition.fieldMappings) {
      if (mapping.isRequired) {
        const value = this.getValueByPath(data, mapping.protocolField);
        if (value === undefined || value === null || value === '') {
          errors.push({
            code: 'MISSING_REQUIRED_FIELD',
            message: `Required field ${mapping.protocolField} is missing`,
            path: mapping.protocolField,
            severity: 'ERROR'
          });
        }
      }
    }
    
    // Add warnings for extensions that are not mapped
    if (data.extension && Array.isArray(data.extension)) {
      const mappedExtensions = mappingDefinition.fieldMappings
        .filter(m => m.protocolField.startsWith('extension'))
        .map(m => m.protocolField);
      
      data.extension.forEach((ext: any, index: number) => {
        const extensionUrl = ext.url;
        if (extensionUrl && !mappedExtensions.some(m => m.includes(extensionUrl))) {
          warnings.push({
            code: 'UNMAPPED_EXTENSION',
            message: `Extension ${extensionUrl} is not mapped to any internal field`,
            path: `extension[${index}]`,
            severity: 'WARNING'
          });
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 && options?.includeWarnings ? warnings : undefined
    };
  }
  
  /**
   * Validate outgoing data before sending to FHIR server
   */
  async validateOutbound(data: any, mappingDefinition: MappingDefinition, options?: ProcessingOptions): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Ensure resourceType is specified and matches mapping
    if (!data.resourceType) {
      errors.push({
        code: 'MISSING_RESOURCE_TYPE',
        message: 'Missing resourceType in FHIR resource',
        severity: 'ERROR'
      });
    } else if (data.resourceType !== mappingDefinition.externalIdentifier) {
      errors.push({
        code: 'RESOURCE_TYPE_MISMATCH',
        message: `Resource type ${data.resourceType} does not match expected type ${mappingDefinition.externalIdentifier}`,
        severity: 'ERROR'
      });
    }
    
    // FHIR-specific validations
    if (data.resourceType === 'Patient') {
      // Patient requires at least one name
      if (!data.name || !Array.isArray(data.name) || data.name.length === 0) {
        errors.push({
          code: 'MISSING_PATIENT_NAME',
          message: 'Patient resource must have at least one name',
          path: 'name',
          severity: 'ERROR'
        });
      }
      
      // Patient should have a gender
      if (!data.gender) {
        warnings.push({
          code: 'MISSING_PATIENT_GENDER',
          message: 'Patient resource should have a gender',
          path: 'gender',
          severity: 'WARNING'
        });
      }
    }
    
    // Check for value constraints in specific resource types
    if (data.resourceType === 'Observation' && !data.status) {
      errors.push({
        code: 'MISSING_OBSERVATION_STATUS',
        message: 'Observation resource must have a status',
        path: 'status',
        severity: 'ERROR'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 && options?.includeWarnings ? warnings : undefined
    };
  }
  
  /**
   * Transform FHIR data to internal model
   */
  async transformInbound(externalData: any, mappingDefinition: MappingDefinition, options?: ProcessingOptions): Promise<ProcessingResult> {
    // Validate first if not skipped
    if (!options?.validateOnly) {
      const validationResult = await this.validateInbound(externalData, mappingDefinition, options);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          originalData: options?.fullResponse ? externalData : undefined
        };
      }
    }
    
    // Create the internal model object
    const internalData: any = {};
    
    // Process each field mapping
    for (const mapping of mappingDefinition.fieldMappings) {
      const value = this.applyFieldMapping(externalData, mapping, 'inbound');
      
      if (value !== undefined) {
        this.setValueByPath(internalData, mapping.modelField, value);
      }
    }
    
    // Apply any custom transformation rules from the mapping definition
    if (mappingDefinition.transformationRules) {
      this.applyCustomTransformations(internalData, mappingDefinition.transformationRules, 'inbound');
    }
    
    return {
      success: true,
      data: internalData,
      originalData: options?.fullResponse ? externalData : undefined,
      warnings: options?.includeWarnings ? [] : undefined
    };
  }
  
  /**
   * Transform internal model to FHIR format
   */
  async transformOutbound(internalData: any, mappingDefinition: MappingDefinition, options?: ProcessingOptions): Promise<ProcessingResult> {
    // Create the FHIR resource object
    const fhirData: any = {
      resourceType: mappingDefinition.externalIdentifier
    };
    
    // Process each field mapping
    for (const mapping of mappingDefinition.fieldMappings) {
      const value = this.applyFieldMapping(internalData, mapping, 'outbound');
      
      if (value !== undefined) {
        this.setValueByPath(fhirData, mapping.protocolField, value);
      }
    }
    
    // Apply any custom transformation rules from the mapping definition
    if (mappingDefinition.transformationRules) {
      this.applyCustomTransformations(fhirData, mappingDefinition.transformationRules, 'outbound');
    }
    
    // Validate if required
    if (!options?.validateOnly) {
      const validationResult = await this.validateOutbound(fhirData, mappingDefinition, options);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          originalData: options?.fullResponse ? internalData : undefined
        };
      }
    }
    
    return {
      success: true,
      data: fhirData,
      originalData: options?.fullResponse ? internalData : undefined,
      warnings: options?.includeWarnings ? [] : undefined
    };
  }
  
  /**
   * Create a connection to a FHIR server
   */
  async createConnection(profile: ConnectionProfile): Promise<Connection> {
    const connection = new FHIRR4Connection(profile);
    await connection.connect();
    return connection;
  }
  
  /**
   * Test connection to a FHIR server
   */
  async testConnection(profile: ConnectionProfile): Promise<ConnectionStatus> {
    try {
      const connection = new FHIRR4Connection(profile);
      await connection.connect();
      return await connection.getStatus();
    } catch (error) {
      return {
        connected: false,
        lastError: error.message
      };
    }
  }
  
  /**
   * Get supported operations for FHIR
   */
  getSupportedOperations(): string[] {
    return [
      'read',
      'search',
      'create',
      'update',
      'delete',
      'history',
      'transaction',
      'batch'
    ];
  }
  
  /**
   * Generate sample FHIR data based on mapping definition
   */
  generateSampleData(mappingDefinition: MappingDefinition): any {
    const resourceType = mappingDefinition.externalIdentifier;
    let sample: any = { resourceType };
    
    // Generate appropriate sample data based on resource type
    switch (resourceType) {
      case FHIRResourceType.Patient:
        sample = this.generatePatientSample();
        break;
      case FHIRResourceType.Practitioner:
        sample = this.generatePractitionerSample();
        break;
      case FHIRResourceType.Observation:
        sample = this.generateObservationSample();
        break;
      case FHIRResourceType.Condition:
        sample = this.generateConditionSample();
        break;
      // Add more resource types as needed
      default:
        // Generic sample with basic fields
        sample.id = 'example-id';
        sample.meta = {
          versionId: '1',
          lastUpdated: new Date().toISOString()
        };
    }
    
    return sample;
  }
  
  /**
   * Apply custom transformations from mapping definition
   */
  private applyCustomTransformations(data: any, rules: Record<string, any>, direction: 'inbound' | 'outbound'): void {
    // Process transformation rules specific to the direction
    const directionRules = rules[direction];
    if (!directionRules) return;
    
    // Apply each transformation rule
    for (const rule of directionRules) {
      // Skip rules that don't apply to this resource type
      if (rule.condition && !this.evaluateCondition(data, rule.condition)) {
        continue;
      }
      
      // Apply the action
      if (rule.action === 'set') {
        this.setValueByPath(data, rule.path, rule.value);
      } else if (rule.action === 'copy') {
        const sourceValue = this.getValueByPath(data, rule.sourcePath);
        if (sourceValue !== undefined) {
          this.setValueByPath(data, rule.targetPath, sourceValue);
        }
      } else if (rule.action === 'delete') {
        this.deleteValueByPath(data, rule.path);
      } else if (rule.action === 'rename') {
        const sourceValue = this.getValueByPath(data, rule.oldPath);
        if (sourceValue !== undefined) {
          this.setValueByPath(data, rule.newPath, sourceValue);
          this.deleteValueByPath(data, rule.oldPath);
        }
      }
    }
  }
  
  /**
   * Evaluate a condition against data
   */
  private evaluateCondition(data: any, condition: any): boolean {
    const field = this.getValueByPath(data, condition.field);
    
    switch (condition.operator) {
      case 'eq':
        return field === condition.value;
      case 'neq':
        return field !== condition.value;
      case 'exists':
        return field !== undefined && field !== null;
      case 'notExists':
        return field === undefined || field === null;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(field);
      case 'startsWith':
        return typeof field === 'string' && field.startsWith(condition.value);
      case 'endsWith':
        return typeof field === 'string' && field.endsWith(condition.value);
      default:
        return false;
    }
  }
  
  /**
   * Delete a value at a specific path
   */
  private deleteValueByPath(obj: any, path: string): void {
    if (!obj || !path) {
      return;
    }
    
    const parts = path.split('.');
    
    if (parts.length === 1) {
      delete obj[parts[0]];
      return;
    }
    
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      // Handle array indexing
      if (part.includes('[') && part.includes(']')) {
        const arrName = part.substring(0, part.indexOf('['));
        const indexStr = part.substring(part.indexOf('[') + 1, part.indexOf(']'));
        const index = parseInt(indexStr, 10);
        
        if (!current[arrName] || !Array.isArray(current[arrName]) || current[arrName].length <= index) {
          return;
        }
        
        current = current[arrName][index];
      } else {
        if (!current[part]) {
          return;
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
      
      if (current[arrName] && Array.isArray(current[arrName]) && current[arrName].length > index) {
        current[arrName].splice(index, 1);
      }
    } else {
      delete current[lastPart];
    }
  }
  
  /**
   * Generate a sample Patient resource
   */
  private generatePatientSample(): any {
    return {
      resourceType: 'Patient',
      id: 'example-patient',
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString()
      },
      text: {
        status: 'generated',
        div: '<div xmlns="http://www.w3.org/1999/xhtml">Example Patient</div>'
      },
      identifier: [
        {
          system: 'http://example.org/fhir/mrn',
          value: 'MRN12345'
        }
      ],
      active: true,
      name: [
        {
          use: 'official',
          family: 'Smith',
          given: ['John', 'Jacob']
        }
      ],
      telecom: [
        {
          system: 'phone',
          value: '555-123-4567',
          use: 'home'
        },
        {
          system: 'email',
          value: 'john.smith@example.com'
        }
      ],
      gender: 'male',
      birthDate: '1970-01-01',
      address: [
        {
          use: 'home',
          line: ['123 Main St'],
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'USA'
        }
      ]
    };
  }
  
  /**
   * Generate a sample Practitioner resource
   */
  private generatePractitionerSample(): any {
    return {
      resourceType: 'Practitioner',
      id: 'example-practitioner',
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString()
      },
      identifier: [
        {
          system: 'http://example.org/fhir/npi',
          value: '1234567890'
        }
      ],
      active: true,
      name: [
        {
          use: 'official',
          family: 'Jones',
          given: ['Sarah'],
          prefix: ['Dr.']
        }
      ],
      telecom: [
        {
          system: 'phone',
          value: '555-987-6543',
          use: 'work'
        }
      ],
      gender: 'female',
      birthDate: '1980-05-15',
      qualification: [
        {
          code: {
            coding: [
              {
                system: 'http://example.org/fhir/qualification',
                code: 'MD',
                display: 'Doctor of Medicine'
              }
            ]
          },
          period: {
            start: '2005-01-01'
          },
          issuer: {
            reference: 'Organization/example-med-school',
            display: 'Example Medical School'
          }
        }
      ]
    };
  }
  
  /**
   * Generate a sample Observation resource
   */
  private generateObservationSample(): any {
    return {
      resourceType: 'Observation',
      id: 'example-observation',
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString()
      },
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
              display: 'Vital Signs'
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8867-4',
            display: 'Heart rate'
          }
        ],
        text: 'Heart rate'
      },
      subject: {
        reference: 'Patient/example-patient'
      },
      effectiveDateTime: new Date().toISOString(),
      valueQuantity: {
        value: 80,
        unit: 'beats/minute',
        system: 'http://unitsofmeasure.org',
        code: '/min'
      }
    };
  }
  
  /**
   * Generate a sample Condition resource
   */
  private generateConditionSample(): any {
    return {
      resourceType: 'Condition',
      id: 'example-condition',
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString()
      },
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active',
            display: 'Active'
          }
        ]
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: 'confirmed',
            display: 'Confirmed'
          }
        ]
      },
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-category',
              code: 'problem-list-item',
              display: 'Problem List Item'
            }
          ]
        }
      ],
      severity: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '6736007',
            display: 'Moderate'
          }
        ]
      },
      code: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '73211009',
            display: 'Diabetes mellitus'
          }
        ],
        text: 'Diabetes'
      },
      subject: {
        reference: 'Patient/example-patient'
      },
      onsetDateTime: '2020-01-01',
      recordedDate: new Date().toISOString()
    };
  }
}