/**
 * Service Registry Storage
 * 
 * Handles persistence of service registry data.
 */

import { nanoid } from 'nanoid';
import { 
  ServiceInstance, 
  ServiceRegistration, 
  ServiceStatus, 
  ServiceQuery 
} from './model';

/**
 * Storage interface for service registry
 */
export interface IServiceStorage {
  registerService(registration: ServiceRegistration): Promise<ServiceInstance>;
  deregisterService(id: string): Promise<boolean>;
  updateService(id: string, registration: ServiceRegistration): Promise<ServiceInstance | null>;
  updateHeartbeat(id: string, status: ServiceStatus, details?: Record<string, any>): Promise<boolean>;
  getService(id: string): Promise<ServiceInstance | null>;
  findServices(query: ServiceQuery): Promise<ServiceInstance[]>;
  getAllServices(): Promise<ServiceInstance[]>;
  getActiveServices(): Promise<ServiceInstance[]>;
}

/**
 * In-memory implementation of service storage
 */
export class MemoryServiceStorage implements IServiceStorage {
  private services: Map<string, ServiceInstance> = new Map();

  /**
   * Register a new service
   */
  async registerService(registration: ServiceRegistration): Promise<ServiceInstance> {
    const id = nanoid();
    const now = new Date().toISOString();
    
    const service: ServiceInstance = {
      ...registration,
      id,
      status: ServiceStatus.STARTING,
      lastUpdated: now,
      registered: now,
      weight: registration.weight || 1
    };
    
    this.services.set(id, service);
    return service;
  }

  /**
   * Deregister a service
   */
  async deregisterService(id: string): Promise<boolean> {
    return this.services.delete(id);
  }

  /**
   * Update service registration
   */
  async updateService(id: string, registration: ServiceRegistration): Promise<ServiceInstance | null> {
    const service = this.services.get(id);
    
    if (!service) {
      return null;
    }
    
    const updatedService: ServiceInstance = {
      ...registration,
      id,
      status: service.status,
      lastUpdated: new Date().toISOString(),
      registered: service.registered,
      weight: registration.weight || service.weight
    };
    
    this.services.set(id, updatedService);
    return updatedService;
  }

  /**
   * Update service heartbeat
   */
  async updateHeartbeat(id: string, status: ServiceStatus, details?: Record<string, any>): Promise<boolean> {
    const service = this.services.get(id);
    
    if (!service) {
      return false;
    }
    
    service.status = status;
    service.lastUpdated = new Date().toISOString();
    
    if (details) {
      service.metadata = {
        ...service.metadata,
        heartbeatDetails: details
      };
    }
    
    return true;
  }

  /**
   * Get a service by ID
   */
  async getService(id: string): Promise<ServiceInstance | null> {
    return this.services.get(id) || null;
  }

  /**
   * Find services by query
   */
  async findServices(query: ServiceQuery): Promise<ServiceInstance[]> {
    return Array.from(this.services.values()).filter(service => {
      // Check name
      if (query.name && service.name !== query.name) return false;
      
      // Check version
      if (query.version && service.version !== query.version) return false;
      
      // Check type
      if (query.type && service.type !== query.type) return false;
      
      // Check status
      if (query.status && service.status !== query.status) return false;
      
      // Check active
      if (query.active !== undefined) {
        const isActive = service.status === ServiceStatus.UP;
        if (query.active !== isActive) return false;
      }
      
      // Check path
      if (query.path) {
        const hasPath = service.endpoints.some(endpoint => endpoint.path === query.path);
        if (!hasPath) return false;
      }
      
      // Check tags
      if (query.tags && query.tags.length > 0) {
        const serviceTags = service.tags || [];
        const hasAllTags = query.tags.every(tag => serviceTags.includes(tag));
        if (!hasAllTags) return false;
      }
      
      return true;
    });
  }

  /**
   * Get all services
   */
  async getAllServices(): Promise<ServiceInstance[]> {
    return Array.from(this.services.values());
  }

  /**
   * Get active services
   */
  async getActiveServices(): Promise<ServiceInstance[]> {
    return Array.from(this.services.values()).filter(
      service => service.status === ServiceStatus.UP
    );
  }
}

// Export singleton instance
export const serviceStorage = new MemoryServiceStorage();