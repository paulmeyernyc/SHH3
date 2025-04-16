/**
 * Integration Gateway Service
 * 
 * Core service that coordinates data transformation and protocol handling
 * by leveraging the MCP service and protocol adapters
 */

import { 
  ProtocolAdapterFactory, 
  ProtocolAdapter, 
  ProcessingOptions, 
  ProcessingResult,
  ValidationResult,
  ConnectionStatus 
} from '../protocols/protocol-adapter';
import {
  ConnectionProfile,
  IntegrationLog,
  MappingDefinition,
  ProtocolMapping
} from '@shared/integration-schema';
import { db } from '../db';
import { eq, and, inArray } from 'drizzle-orm';
import {
  connectionProfiles,
  protocolMappings,
  protocolMappingFields,
  connectionContexts,
  integrationLogs
} from '@shared/integration-schema';
import { McpService } from './mcp-service';

/**
 * Integration direction
 */
export enum IntegrationDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND'
}

/**
 * Integration request
 */
export interface IntegrationRequest {
  connectionProfileId: number;
  contextId?: number;
  direction: IntegrationDirection;
  data: any;
  options?: ProcessingOptions;
  userId?: number;
  correlationId?: string;
  metaData?: Record<string, any>;
}

/**
 * Integration Gateway Service
 */
export class IntegrationGatewayService {
  constructor(
    private adapterFactory: ProtocolAdapterFactory,
    private mcpService: McpService
  ) {}

  /**
   * Process an integration request
   */
  async processRequest(request: IntegrationRequest): Promise<ProcessingResult> {
    const startTime = Date.now();
    let logEntry: Partial<IntegrationLog> = {
      connectionId: request.connectionProfileId,
      direction: request.direction,
      contextId: request.contextId,
      correlationId: request.correlationId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: request.userId,
      status: 'SUCCESS',
      timestamp: new Date(),
      requestData: request.data
    };

    try {
      // Get connection profile
      const profile = await this.getConnectionProfile(request.connectionProfileId);
      if (!profile) {
        throw new Error(`Connection profile not found: ${request.connectionProfileId}`);
      }

      // Get context (if not specified, use default for connection)
      const contextId = request.contextId || await this.getDefaultContextForConnection(request.connectionProfileId);
      if (!contextId) {
        throw new Error(`No context specified and no default context found for connection ${request.connectionProfileId}`);
      }

      // Get context definition from MCP
      const context = await this.mcpService.getContext(contextId);
      if (!context) {
        throw new Error(`Context not found: ${contextId}`);
      }

      // Get protocol adapter
      const adapter = this.adapterFactory.getAdapter(
        profile.protocolType, 
        profile.protocolVersion
      );

      // Get mapping definitions based on context models
      const modelIds = context.models.map(m => m.id);
      const mappings = await this.getProtocolMappings(
        modelIds,
        profile.protocolType,
        profile.protocolVersion,
        profile.organizationId
      );

      if (mappings.length === 0) {
        throw new Error(`No mappings found for models ${modelIds.join(', ')} and protocol ${profile.protocolType} ${profile.protocolVersion}`);
      }

      // Process based on direction
      let result: ProcessingResult;
      if (request.direction === IntegrationDirection.INBOUND) {
        result = await this.processInbound(adapter, request.data, mappings, request.options);
      } else {
        result = await this.processOutbound(adapter, request.data, mappings, request.options);
      }

      // Update log entry
      logEntry.status = result.success ? 'SUCCESS' : 'ERROR';
      logEntry.responseData = result.data;
      logEntry.errorDetails = result.errors ? { errors: result.errors, warnings: result.warnings } : undefined;
      logEntry.processingTimeMs = Date.now() - startTime;

      // Save log entry
      await this.createLogEntry(logEntry as IntegrationLog);

      return result;
    } catch (error) {
      // Update log entry with error
      logEntry.status = 'ERROR';
      logEntry.errorDetails = { 
        message: error.message,
        stack: error.stack
      };
      logEntry.processingTimeMs = Date.now() - startTime;

      // Save log entry
      await this.createLogEntry(logEntry as IntegrationLog);

      // Return error result
      return {
        success: false,
        errors: [{
          code: 'PROCESSING_ERROR',
          message: error.message,
          severity: 'ERROR',
          details: error.stack
        }]
      };
    }
  }

  /**
   * Process inbound data (external to internal)
   */
  private async processInbound(
    adapter: ProtocolAdapter,
    data: any,
    mappings: MappingDefinition[],
    options?: ProcessingOptions
  ): Promise<ProcessingResult> {
    // For inbound, we need to determine which mapping to use based on the data
    // For FHIR, we can use resourceType to determine which mapping to use
    let mapping: MappingDefinition | undefined;

    if (data.resourceType) {
      mapping = mappings.find(m => m.externalIdentifier === data.resourceType);
    }

    // If we couldn't determine mapping, try the first one
    if (!mapping && mappings.length > 0) {
      mapping = mappings[0];
    }

    if (!mapping) {
      return {
        success: false,
        errors: [{
          code: 'NO_MAPPING_FOUND',
          message: 'Could not determine appropriate mapping for the data',
          severity: 'ERROR'
        }]
      };
    }

    // Transform the data using the adapter
    return await adapter.transformInbound(data, mapping, options);
  }

  /**
   * Process outbound data (internal to external)
   */
  private async processOutbound(
    adapter: ProtocolAdapter,
    data: any,
    mappings: MappingDefinition[],
    options?: ProcessingOptions
  ): Promise<ProcessingResult> {
    // For outbound, we can use the model type to determine which mapping to use
    // This assumes we have a _type or similar field in our internal model
    let mapping: MappingDefinition | undefined;

    if (data._type) {
      const modelId = await this.mcpService.getModelIdByType(data._type);
      if (modelId) {
        mapping = mappings.find(m => m.modelId === modelId);
      }
    }

    // If we couldn't determine mapping, try the first one
    if (!mapping && mappings.length > 0) {
      mapping = mappings[0];
    }

    if (!mapping) {
      return {
        success: false,
        errors: [{
          code: 'NO_MAPPING_FOUND',
          message: 'Could not determine appropriate mapping for the data',
          severity: 'ERROR'
        }]
      };
    }

    // Transform the data using the adapter
    return await adapter.transformOutbound(data, mapping, options);
  }

  /**
   * Validate data without transforming
   */
  async validateData(
    connectionProfileId: number,
    direction: IntegrationDirection,
    data: any,
    options?: ProcessingOptions
  ): Promise<ValidationResult> {
    try {
      // Get connection profile
      const profile = await this.getConnectionProfile(connectionProfileId);
      if (!profile) {
        throw new Error(`Connection profile not found: ${connectionProfileId}`);
      }

      // Get protocol adapter
      const adapter = this.adapterFactory.getAdapter(
        profile.protocolType, 
        profile.protocolVersion
      );

      // Get model ID if available
      let modelId: number | undefined;
      if (direction === IntegrationDirection.OUTBOUND && data._type) {
        modelId = await this.mcpService.getModelIdByType(data._type);
      } else if (direction === IntegrationDirection.INBOUND && data.resourceType) {
        const mapping = await this.getProtocolMappingByExternalId(
          profile.protocolType,
          profile.protocolVersion,
          data.resourceType,
          profile.organizationId
        );
        if (mapping) {
          modelId = mapping.modelId;
        }
      }

      if (!modelId) {
        throw new Error('Could not determine model ID for validation');
      }

      // Get mapping definition
      const mapping = await this.getProtocolMappingById(modelId, profile.protocolType, profile.protocolVersion);
      if (!mapping) {
        throw new Error(`No mapping found for model ${modelId} and protocol ${profile.protocolType} ${profile.protocolVersion}`);
      }

      // Convert to MappingDefinition format
      const mappingDefinition: MappingDefinition = {
        modelId: mapping.modelId,
        protocolType: mapping.protocolType,
        protocolVersion: mapping.protocolVersion,
        externalIdentifier: mapping.externalIdentifier,
        fieldMappings: await this.getProtocolMappingFields(mapping.id)
      };

      // Validate based on direction
      if (direction === IntegrationDirection.INBOUND) {
        return await adapter.validateInbound(data, mappingDefinition, options);
      } else {
        return await adapter.validateOutbound(data, mappingDefinition, options);
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: error.message,
          severity: 'ERROR',
          details: error.stack
        }]
      };
    }
  }

  /**
   * Test connection to a profile
   */
  async testConnection(connectionProfileId: number): Promise<ConnectionStatus> {
    // Get connection profile
    const profile = await this.getConnectionProfile(connectionProfileId);
    if (!profile) {
      return {
        connected: false,
        lastError: `Connection profile not found: ${connectionProfileId}`
      };
    }

    // Get protocol adapter
    const adapter = this.adapterFactory.getAdapter(
      profile.protocolType, 
      profile.protocolVersion
    );

    // Test connection
    return await adapter.testConnection(profile);
  }

  /**
   * Get connection profile by ID
   */
  async getConnectionProfile(id: number): Promise<ConnectionProfile | undefined> {
    const [profile] = await db
      .select()
      .from(connectionProfiles)
      .where(eq(connectionProfiles.id, id));
    
    return profile;
  }

  /**
   * Get default context for a connection
   */
  async getDefaultContextForConnection(connectionId: number): Promise<number | undefined> {
    const [defaultContext] = await db
      .select()
      .from(connectionContexts)
      .where(and(
        eq(connectionContexts.connectionId, connectionId),
        eq(connectionContexts.isDefault, true)
      ));
    
    if (defaultContext) {
      return defaultContext.contextId;
    }

    // If no default, just get the first context
    const [anyContext] = await db
      .select()
      .from(connectionContexts)
      .where(eq(connectionContexts.connectionId, connectionId));
    
    return anyContext?.contextId;
  }

  /**
   * Get protocol mappings for models and protocol
   */
  async getProtocolMappings(
    modelIds: number[],
    protocolType: string,
    protocolVersion: string,
    organizationId?: number
  ): Promise<MappingDefinition[]> {
    // Get mappings from database
    let mappings: ProtocolMapping[] = [];
    
    if (organizationId) {
      // First try to get organization-specific mappings
      mappings = await db
        .select()
        .from(protocolMappings)
        .where(and(
          inArray(protocolMappings.modelId, modelIds),
          eq(protocolMappings.protocolType, protocolType),
          eq(protocolMappings.protocolVersion, protocolVersion),
          eq(protocolMappings.organizationId, organizationId)
        ));
    }
    
    // If no org-specific mappings, get default mappings
    if (mappings.length === 0) {
      mappings = await db
        .select()
        .from(protocolMappings)
        .where(and(
          inArray(protocolMappings.modelId, modelIds),
          eq(protocolMappings.protocolType, protocolType),
          eq(protocolMappings.protocolVersion, protocolVersion),
          eq(protocolMappings.isDefault, true)
        ));
    }
    
    // Convert to MappingDefinition format
    const result: MappingDefinition[] = [];
    
    for (const mapping of mappings) {
      const fields = await this.getProtocolMappingFields(mapping.id);
      
      result.push({
        modelId: mapping.modelId,
        protocolType: mapping.protocolType,
        protocolVersion: mapping.protocolVersion,
        externalIdentifier: mapping.externalIdentifier,
        fieldMappings: fields,
        transformationRules: mapping.transformationRules as Record<string, any>
      });
    }
    
    return result;
  }

  /**
   * Get protocol mapping by ID
   */
  async getProtocolMappingById(
    modelId: number,
    protocolType: string,
    protocolVersion: string
  ): Promise<ProtocolMapping | undefined> {
    // First try to get a default mapping
    const [defaultMapping] = await db
      .select()
      .from(protocolMappings)
      .where(and(
        eq(protocolMappings.modelId, modelId),
        eq(protocolMappings.protocolType, protocolType),
        eq(protocolMappings.protocolVersion, protocolVersion),
        eq(protocolMappings.isDefault, true)
      ));
    
    if (defaultMapping) {
      return defaultMapping;
    }
    
    // If no default, get any mapping for this model and protocol
    const [anyMapping] = await db
      .select()
      .from(protocolMappings)
      .where(and(
        eq(protocolMappings.modelId, modelId),
        eq(protocolMappings.protocolType, protocolType),
        eq(protocolMappings.protocolVersion, protocolVersion)
      ));
    
    return anyMapping;
  }

  /**
   * Get protocol mapping by external identifier
   */
  async getProtocolMappingByExternalId(
    protocolType: string,
    protocolVersion: string,
    externalId: string,
    organizationId?: number
  ): Promise<ProtocolMapping | undefined> {
    let mapping: ProtocolMapping | undefined;
    
    if (organizationId) {
      // First try to get organization-specific mapping
      const [orgMapping] = await db
        .select()
        .from(protocolMappings)
        .where(and(
          eq(protocolMappings.protocolType, protocolType),
          eq(protocolMappings.protocolVersion, protocolVersion),
          eq(protocolMappings.externalIdentifier, externalId),
          eq(protocolMappings.organizationId, organizationId)
        ));
      
      mapping = orgMapping;
    }
    
    if (!mapping) {
      // Try to get default mapping
      const [defaultMapping] = await db
        .select()
        .from(protocolMappings)
        .where(and(
          eq(protocolMappings.protocolType, protocolType),
          eq(protocolMappings.protocolVersion, protocolVersion),
          eq(protocolMappings.externalIdentifier, externalId),
          eq(protocolMappings.isDefault, true)
        ));
      
      mapping = defaultMapping;
    }
    
    return mapping;
  }

  /**
   * Get field mappings for a protocol mapping
   */
  async getProtocolMappingFields(mappingId: number): Promise<any[]> {
    const fields = await db
      .select()
      .from(protocolMappingFields)
      .where(eq(protocolMappingFields.mappingId, mappingId));
    
    return fields.map(field => ({
      modelField: field.modelField,
      protocolField: field.protocolField,
      dataType: field.dataType,
      isRequired: field.isRequired,
      defaultValue: field.defaultValue,
      transformationExpression: field.transformationExpression
    }));
  }

  /**
   * Create an integration log entry
   */
  async createLogEntry(log: IntegrationLog): Promise<void> {
    await db.insert(integrationLogs).values(log);
  }

  /**
   * Get integration logs
   */
  async getIntegrationLogs(
    connectionId?: number,
    limit: number = 100,
    offset: number = 0
  ): Promise<IntegrationLog[]> {
    if (connectionId) {
      return db
        .select()
        .from(integrationLogs)
        .where(eq(integrationLogs.connectionId, connectionId))
        .orderBy(integrationLogs.timestamp)
        .limit(limit)
        .offset(offset);
    } else {
      return db
        .select()
        .from(integrationLogs)
        .orderBy(integrationLogs.timestamp)
        .limit(limit)
        .offset(offset);
    }
  }
}