/**
 * Audit Service Client
 * 
 * This client library provides an easy-to-use interface for services to integrate
 * with the Audit Service for logging activities, data access, and changes for 
 * compliance and security purposes.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  AUDIT_RESOURCE_TYPES,
  AUDIT_ACTIONS,
  AUDIT_STATUSES,
  InsertAuditEvent,
  InsertAuditDataChange,
  InsertAuditAccess,
  AuditClientConfig
} from '../../shared/audit-schema';

/**
 * Audit Service Client
 */
export class AuditClient {
  private client: AxiosInstance;
  private serviceName: string;
  private readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private readonly MAX_RETRIES = 3;
  
  /**
   * Create a new Audit Client
   */
  constructor(config: AuditClientConfig) {
    const axiosConfig: AxiosRequestConfig = {
      baseURL: config.baseURL,
      timeout: config.timeout || this.DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': config.serviceName,
        ...(config.headers || {})
      }
    };
    
    this.client = axios.create(axiosConfig);
    this.serviceName = config.serviceName;
    
    // Setup retry mechanism if enabled
    if (config.retry !== false) {
      this.setupRetry(config.maxRetries || this.MAX_RETRIES);
    }
  }
  
  /**
   * Setup retry mechanism for failed requests
   */
  private setupRetry(maxRetries: number): void {
    this.client.interceptors.response.use(undefined, async (error: AxiosError) => {
      const config = error.config;
      
      // Add retry count to config if not present
      if (!config || !config.headers) {
        return Promise.reject(error);
      }
      
      const retryCount = config.headers['x-retry-count'] ? 
        parseInt(config.headers['x-retry-count'] as string) : 0;
      
      // Check if we should retry the request
      if (retryCount < maxRetries) {
        // Exponential backoff
        const delayMs = Math.pow(2, retryCount) * 100;
        
        // Update retry count
        config.headers['x-retry-count'] = (retryCount + 1).toString();
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Retry the request
        return this.client(config);
      }
      
      // Max retries reached, reject with original error
      return Promise.reject(error);
    });
  }
  
  /**
   * Log an audit event
   * 
   * @param resourceType Type of resource being audited (patient, user, etc.)
   * @param resourceId Identifier of the resource being audited
   * @param action Action performed (create, read, update, delete, etc.)
   * @param status Outcome status (success, failure, etc.)
   * @param description Human-readable description of the event
   * @param context Additional context (userId, username, etc.)
   * @returns The created audit event
   */
  async auditEvent(
    resourceType: string,
    resourceId: string | null,
    action: string,
    status: string,
    description: string,
    context: {
      userId?: number;
      username?: string;
      ipAddress?: string;
      sessionId?: string;
      organizationId?: number;
      metadata?: Record<string, any>;
      requestId?: string;
      retain?: boolean;
    } = {}
  ): Promise<any> {
    // Validate resource type and action
    if (!AUDIT_RESOURCE_TYPES.includes(resourceType) && !resourceType.startsWith('custom:')) {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }
    
    if (!AUDIT_ACTIONS.includes(action) && !action.startsWith('custom:')) {
      throw new Error(`Invalid action: ${action}`);
    }
    
    if (!AUDIT_STATUSES.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    // Build event data
    const eventData: InsertAuditEvent = {
      timestamp: new Date(),
      service: this.serviceName,
      resourceType,
      resourceId,
      action,
      status,
      description,
      userId: context.userId,
      username: context.username,
      ipAddress: context.ipAddress,
      sessionId: context.sessionId,
      organizationId: context.organizationId,
      metadata: context.metadata,
      requestId: context.requestId || uuidv4(),
      retain: context.retain || false
    };
    
    try {
      const response = await this.client.post('/api/audit/events', eventData);
      return response.data;
    } catch (error) {
      console.error(`Failed to audit event (${resourceType}/${action}):`, error);
      // Don't throw, just log the error - audit failures shouldn't break the application
      return null;
    }
  }
  
  /**
   * Record a login event
   * 
   * @param userId User ID
   * @param username Username
   * @param success Whether the login was successful
   * @param ipAddress IP address of the client
   * @param context Additional context
   * @returns The created audit event
   */
  async auditLogin(
    userId: number,
    username: string,
    success: boolean,
    ipAddress: string,
    context: {
      sessionId?: string;
      organizationId?: number;
      metadata?: Record<string, any>;
      requestId?: string;
    } = {}
  ): Promise<any> {
    return this.auditEvent(
      'user',
      userId.toString(),
      'login',
      success ? 'success' : 'failure',
      `User ${username} ${success ? 'logged in successfully' : 'failed to log in'}`,
      {
        userId,
        username,
        ipAddress,
        sessionId: context.sessionId,
        organizationId: context.organizationId,
        metadata: context.metadata,
        requestId: context.requestId
      }
    );
  }
  
  /**
   * Record a logout event
   * 
   * @param userId User ID
   * @param username Username
   * @param sessionId Session ID
   * @param context Additional context
   * @returns The created audit event
   */
  async auditLogout(
    userId: number,
    username: string,
    sessionId: string,
    context: {
      ipAddress?: string;
      organizationId?: number;
      metadata?: Record<string, any>;
      requestId?: string;
    } = {}
  ): Promise<any> {
    return this.auditEvent(
      'user',
      userId.toString(),
      'logout',
      'success',
      `User ${username} logged out`,
      {
        userId,
        username,
        sessionId,
        ipAddress: context.ipAddress,
        organizationId: context.organizationId,
        metadata: context.metadata,
        requestId: context.requestId
      }
    );
  }
  
  /**
   * Record a create operation
   * 
   * @param userId User ID
   * @param username Username
   * @param resourceType Type of resource being created
   * @param resourceId ID of the created resource
   * @param details Details about the created resource
   * @param description Human-readable description
   * @param context Additional context
   * @returns The created audit event
   */
  async auditCreate(
    userId: number,
    username: string,
    resourceType: string,
    resourceId: string,
    details: Record<string, any>,
    description: string,
    context: {
      ipAddress?: string;
      sessionId?: string;
      organizationId?: number;
      requestId?: string;
    } = {}
  ): Promise<any> {
    return this.auditEvent(
      resourceType,
      resourceId,
      'create',
      'success',
      description,
      {
        userId,
        username,
        ipAddress: context.ipAddress,
        sessionId: context.sessionId,
        organizationId: context.organizationId,
        metadata: { details },
        requestId: context.requestId
      }
    );
  }
  
  /**
   * Record an update operation with data changes
   * 
   * @param userId User ID
   * @param username Username
   * @param resourceType Type of resource being updated
   * @param resourceId ID of the updated resource
   * @param changes Array of changes (field, old value, new value)
   * @param description Human-readable description
   * @param context Additional context
   * @returns The created audit event with data changes
   */
  async auditUpdate(
    userId: number,
    username: string,
    resourceType: string,
    resourceId: string,
    changes: Array<{
      field: string;
      oldValue?: any;
      newValue?: any;
    }>,
    description: string,
    context: {
      ipAddress?: string;
      sessionId?: string;
      organizationId?: number;
      requestId?: string;
    } = {}
  ): Promise<any> {
    // First, create the audit event
    const event = await this.auditEvent(
      resourceType,
      resourceId,
      'update',
      'success',
      description,
      {
        userId,
        username,
        ipAddress: context.ipAddress,
        sessionId: context.sessionId,
        organizationId: context.organizationId,
        metadata: { changeCount: changes.length },
        requestId: context.requestId
      }
    );
    
    if (!event) {
      return null;
    }
    
    // Then, record each data change
    const dataChanges = [];
    
    for (const change of changes) {
      try {
        // Convert values to strings for storage
        const oldValueStr = change.oldValue !== undefined ? 
          (typeof change.oldValue === 'object' ? JSON.stringify(change.oldValue) : String(change.oldValue)) : 
          null;
        
        const newValueStr = change.newValue !== undefined ? 
          (typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : String(change.newValue)) : 
          null;
        
        const dataChangeObj: InsertAuditDataChange = {
          auditEventId: event.id,
          field: change.field,
          oldValue: oldValueStr,
          newValue: newValueStr,
          timestamp: new Date()
        };
        
        const dataChange = await this.client.post('/api/audit/data-changes', dataChangeObj);
        dataChanges.push(dataChange.data);
      } catch (error) {
        console.error(`Failed to record data change for field ${change.field}:`, error);
      }
    }
    
    return {
      event,
      dataChanges
    };
  }
  
  /**
   * Record a delete operation
   * 
   * @param userId User ID
   * @param username Username
   * @param resourceType Type of resource being deleted
   * @param resourceId ID of the deleted resource
   * @param details Details about the deleted resource
   * @param description Human-readable description
   * @param context Additional context
   * @returns The created audit event
   */
  async auditDelete(
    userId: number,
    username: string,
    resourceType: string,
    resourceId: string,
    details: Record<string, any>,
    description: string,
    context: {
      ipAddress?: string;
      sessionId?: string;
      organizationId?: number;
      requestId?: string;
    } = {}
  ): Promise<any> {
    return this.auditEvent(
      resourceType,
      resourceId,
      'delete',
      'success',
      description,
      {
        userId,
        username,
        ipAddress: context.ipAddress,
        sessionId: context.sessionId,
        organizationId: context.organizationId,
        metadata: { details },
        requestId: context.requestId
      }
    );
  }
  
  /**
   * Record resource access
   * 
   * @param userId User ID
   * @param username Username
   * @param resourceType Type of resource being accessed
   * @param resourceId ID of the accessed resource
   * @param accessGranted Whether access was granted
   * @param patientId Patient ID (if applicable)
   * @param purpose Purpose of access
   * @param context Additional context
   * @returns The created audit event with access record
   */
  async auditResourceAccess(
    userId: number,
    username: string,
    resourceType: string,
    resourceId: string,
    accessGranted: boolean,
    patientId?: string,
    purpose?: string,
    context: {
      ipAddress?: string;
      sessionId?: string;
      organizationId?: number;
      denialReason?: string;
      consentId?: string;
      emergencyAccess?: boolean;
      metadata?: Record<string, any>;
      requestId?: string;
    } = {}
  ): Promise<any> {
    // First, create the audit event
    const event = await this.auditEvent(
      resourceType,
      resourceId,
      'access',
      accessGranted ? 'success' : 'failure',
      accessGranted ? 
        `User ${username} accessed ${resourceType} ${resourceId}` : 
        `User ${username} was denied access to ${resourceType} ${resourceId}`,
      {
        userId,
        username,
        ipAddress: context.ipAddress,
        sessionId: context.sessionId,
        organizationId: context.organizationId,
        metadata: context.metadata,
        requestId: context.requestId
      }
    );
    
    if (!event) {
      return null;
    }
    
    // Then, create access record
    try {
      const accessObj: InsertAuditAccess = {
        auditEventId: event.id,
        timestamp: new Date(),
        userId,
        username,
        resourceType,
        resourceId,
        patientId,
        purpose,
        accessGranted,
        denialReason: accessGranted ? null : context.denialReason,
        consentId: context.consentId,
        ipAddress: context.ipAddress,
        sessionId: context.sessionId,
        emergencyAccess: context.emergencyAccess || false,
        metadata: context.metadata
      };
      
      const access = await this.client.post('/api/audit/access', accessObj);
      
      return {
        event,
        access: access.data
      };
    } catch (error) {
      console.error('Failed to record access record:', error);
      return { event };
    }
  }
  
  /**
   * Record an export operation
   * 
   * @param userId User ID
   * @param username Username
   * @param resourceType Type of resource being exported
   * @param resourceIds Array of resource IDs being exported
   * @param description Human-readable description
   * @param context Additional context
   * @returns The created audit event
   */
  async auditExport(
    userId: number,
    username: string,
    resourceType: string,
    resourceIds: string[],
    description: string,
    context: {
      ipAddress?: string;
      sessionId?: string;
      organizationId?: number;
      metadata?: Record<string, any>;
      requestId?: string;
    } = {}
  ): Promise<any> {
    return this.auditEvent(
      resourceType,
      null, // No specific resource ID for bulk export
      'export',
      'success',
      description,
      {
        userId,
        username,
        ipAddress: context.ipAddress,
        sessionId: context.sessionId,
        organizationId: context.organizationId,
        metadata: {
          resourceCount: resourceIds.length,
          resourceIds,
          ...(context.metadata || {})
        },
        requestId: context.requestId
      }
    );
  }
  
  /**
   * Record a system event
   * 
   * @param action System action
   * @param description Human-readable description
   * @param status Outcome status
   * @param context Additional context
   * @returns The created audit event
   */
  async auditSystemEvent(
    action: 'start' | 'stop' | 'configure' | 'error' | string,
    description: string,
    status: string = 'success',
    context: {
      metadata?: Record<string, any>;
      requestId?: string;
    } = {}
  ): Promise<any> {
    return this.auditEvent(
      'system',
      null,
      action,
      status,
      description,
      {
        metadata: context.metadata,
        requestId: context.requestId
      }
    );
  }
  
  /**
   * Get audit events by various filters
   * 
   * @param filters Filter criteria
   * @param page Page number (1-based)
   * @param pageSize Number of items per page
   * @returns Paginated list of audit events
   */
  async getEvents(
    filters: {
      userId?: number;
      username?: string;
      service?: string;
      resourceType?: string;
      resourceId?: string;
      action?: string;
      status?: string;
      requestId?: string;
      sessionId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      if (filters.userId) params.append('userId', filters.userId.toString());
      if (filters.username) params.append('username', filters.username);
      if (filters.service) params.append('service', filters.service);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.resourceId) params.append('resourceId', filters.resourceId);
      if (filters.action) params.append('action', filters.action);
      if (filters.status) params.append('status', filters.status);
      if (filters.requestId) params.append('requestId', filters.requestId);
      if (filters.sessionId) params.append('sessionId', filters.sessionId);
      
      if (filters.startDate) {
        params.append('startDate', filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        params.append('endDate', filters.endDate.toISOString());
      }
      
      const response = await this.client.get(`/api/audit/events?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get audit events:', error);
      throw error;
    }
  }
  
  /**
   * Get a single audit event with all related data
   * 
   * @param id Audit event ID
   * @returns Audit event with related data changes and access records
   */
  async getEvent(id: number): Promise<any> {
    try {
      const response = await this.client.get(`/api/audit/events/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get audit event ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get audit data changes by various filters
   * 
   * @param filters Filter criteria
   * @param page Page number (1-based)
   * @param pageSize Number of items per page
   * @returns Paginated list of data changes
   */
  async getDataChanges(
    filters: {
      auditEventId?: number;
      field?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      if (filters.auditEventId) params.append('auditEventId', filters.auditEventId.toString());
      if (filters.field) params.append('field', filters.field);
      
      if (filters.startDate) {
        params.append('startDate', filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        params.append('endDate', filters.endDate.toISOString());
      }
      
      const response = await this.client.get(`/api/audit/data-changes?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get audit data changes:', error);
      throw error;
    }
  }
  
  /**
   * Get audit access records by various filters
   * 
   * @param filters Filter criteria
   * @param page Page number (1-based)
   * @param pageSize Number of items per page
   * @returns Paginated list of access records
   */
  async getAccessRecords(
    filters: {
      auditEventId?: number;
      userId?: number;
      username?: string;
      patientId?: string;
      resourceType?: string;
      resourceId?: string;
      purpose?: string;
      accessGranted?: boolean;
      emergencyAccess?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      if (filters.auditEventId) params.append('auditEventId', filters.auditEventId.toString());
      if (filters.userId) params.append('userId', filters.userId.toString());
      if (filters.username) params.append('username', filters.username);
      if (filters.patientId) params.append('patientId', filters.patientId);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.resourceId) params.append('resourceId', filters.resourceId);
      if (filters.purpose) params.append('purpose', filters.purpose);
      
      if (filters.accessGranted !== undefined) {
        params.append('accessGranted', filters.accessGranted.toString());
      }
      
      if (filters.emergencyAccess !== undefined) {
        params.append('emergencyAccess', filters.emergencyAccess.toString());
      }
      
      if (filters.startDate) {
        params.append('startDate', filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        params.append('endDate', filters.endDate.toISOString());
      }
      
      const response = await this.client.get(`/api/audit/access?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get audit access records:', error);
      throw error;
    }
  }
  
  /**
   * Get statistics for audit data
   * 
   * @param startDate Start date for the statistics period
   * @param endDate End date for the statistics period
   * @returns Audit statistics
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      
      if (endDate) {
        params.append('endDate', endDate.toISOString());
      }
      
      const response = await this.client.get(`/api/audit/statistics?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get audit statistics:', error);
      throw error;
    }
  }
}

/**
 * Create a new Audit Client
 */
export function createAuditClient(config: AuditClientConfig): AuditClient {
  return new AuditClient(config);
}