/**
 * Smart Health Hub - Network Directory Service
 * 
 * Core service for managing network participants, services, and connections.
 * This service provides business logic for:
 * - Network participant management
 * - Service capability tracking
 * - Inter-participant connections
 * - Network visualization and analytics
 */

import { db } from '../../db';
import {
  networkParticipants,
  networkServices,
  participantServices,
  networkConnections,
  networkMapRegions,
  networkRegionStats,
  networkServiceMetrics,
  networkEvents,
  
  NetworkParticipant,
  InsertNetworkParticipant,
  NetworkService,
  InsertNetworkService,
  ParticipantService,
  InsertParticipantService,
  NetworkConnection,
  InsertNetworkConnection,
  NetworkMapRegion,
  InsertNetworkMapRegion,
} from '../../../shared/network-directory-schema';
import { eq, and, inArray, like, isNull, not, or, desc, asc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';

/**
 * Search parameters for network participants
 */
export interface ParticipantSearchParams {
  name?: string;
  type?: string | string[];
  city?: string;
  state?: string;
  active?: boolean;
  service?: string;
  latitude?: string;
  longitude?: string;
  radius?: number; // in miles
  limit?: number;
  offset?: number;
}

/**
 * Search parameters for services
 */
export interface ServiceSearchParams {
  name?: string;
  type?: string | string[];
  active?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Search parameters for connections
 */
export interface ConnectionSearchParams {
  sourceParticipantId?: string;
  targetParticipantId?: string;
  status?: string;
  serviceId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Network Directory Service
 */
export class NetworkDirectoryService {
  
  // ============================================================================
  // Participant Management
  // ============================================================================
  
  /**
   * Create a new network participant
   */
  async createParticipant(data: InsertNetworkParticipant): Promise<NetworkParticipant> {
    try {
      // Generate ID if not provided
      if (!data.id) {
        data.id = uuidv4();
      }
      
      // Set created timestamp
      data.createdAt = new Date();
      
      // Insert the participant record
      const [participant] = await db.insert(networkParticipants).values(data).returning();
      
      if (!participant) {
        throw new Error('Failed to create network participant');
      }
      
      logger.info(`Created network participant: ${participant.id} (${participant.name})`);
      return participant;
    } catch (error) {
      logger.error('Error creating network participant:', error);
      throw error;
    }
  }
  
  /**
   * Get a network participant by ID
   */
  async getParticipant(id: string): Promise<NetworkParticipant | undefined> {
    try {
      const [participant] = await db.select().from(networkParticipants).where(eq(networkParticipants.id, id));
      return participant;
    } catch (error) {
      logger.error(`Error getting network participant ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a network participant
   */
  async updateParticipant(id: string, data: Partial<InsertNetworkParticipant>): Promise<NetworkParticipant | undefined> {
    try {
      // Remove id from update data if present
      delete data.id;
      
      // Set updated timestamp
      data.updatedAt = new Date();
      
      // Update the participant
      const [participant] = await db
        .update(networkParticipants)
        .set(data)
        .where(eq(networkParticipants.id, id))
        .returning();
        
      if (!participant) {
        return undefined;
      }
      
      logger.info(`Updated network participant: ${id}`);
      return participant;
    } catch (error) {
      logger.error(`Error updating network participant ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a network participant
   */
  async deleteParticipant(id: string): Promise<boolean> {
    try {
      // Check for related connections to prevent deletion
      const relatedConnections = await db
        .select({ count: sql<number>`count(*)` })
        .from(networkConnections)
        .where(
          or(
            eq(networkConnections.sourceParticipantId, id),
            eq(networkConnections.targetParticipantId, id)
          )
        );
        
      if (relatedConnections.length > 0 && relatedConnections[0].count > 0) {
        throw new Error('Cannot delete participant with existing connections');
      }
      
      // Delete the participant services first
      await db
        .delete(participantServices)
        .where(eq(participantServices.participantId, id));
      
      // Delete the participant
      const result = await db
        .delete(networkParticipants)
        .where(eq(networkParticipants.id, id))
        .returning();
        
      const success = result.length > 0;
      
      if (success) {
        logger.info(`Deleted network participant: ${id}`);
      }
      
      return success;
    } catch (error) {
      logger.error(`Error deleting network participant ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Search for network participants
   */
  async searchParticipants(params: ParticipantSearchParams): Promise<NetworkParticipant[]> {
    try {
      let query = db.select().from(networkParticipants);
      
      // Apply search filters
      if (params.name) {
        query = query.where(like(networkParticipants.name, `%${params.name}%`));
      }
      
      if (params.type) {
        if (Array.isArray(params.type)) {
          query = query.where(inArray(networkParticipants.type, params.type as any));
        } else {
          query = query.where(eq(networkParticipants.type, params.type as any));
        }
      }
      
      if (params.city) {
        query = query.where(like(networkParticipants.city, `%${params.city}%`));
      }
      
      if (params.state) {
        query = query.where(eq(networkParticipants.state, params.state));
      }
      
      if (params.active !== undefined) {
        query = query.where(eq(networkParticipants.active, params.active));
      }
      
      // Service filter - more complex as it requires a join
      if (params.service) {
        query = query.where(
          inArray(
            networkParticipants.id,
            db.select({ id: participantServices.participantId })
              .from(participantServices)
              .innerJoin(
                networkServices,
                eq(participantServices.serviceId, networkServices.id)
              )
              .where(
                or(
                  eq(networkServices.id, params.service),
                  eq(networkServices.type, params.service as any)
                )
              )
          )
        );
      }
      
      // Geospatial search if lat/long and radius provided
      if (params.latitude && params.longitude && params.radius) {
        // This is a simplified version; in production, use PostGIS for proper spatial queries
        // Here we're just doing a rough approximation
        const lat = parseFloat(params.latitude);
        const lng = parseFloat(params.longitude);
        const radiusMiles = params.radius;
        
        // Convert miles to rough degrees (very approximate)
        const latRadius = radiusMiles / 69; // ~69 miles per degree of latitude
        const lngRadius = radiusMiles / (69 * Math.cos(lat * Math.PI / 180)); // Adjust for longitude
        
        // Filter by bounding box (approximate)
        query = query.where(
          and(
            sql`${networkParticipants.latitude}::float BETWEEN ${lat - latRadius} AND ${lat + latRadius}`,
            sql`${networkParticipants.longitude}::float BETWEEN ${lng - lngRadius} AND ${lng + lngRadius}`
          )
        );
      }
      
      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit);
      }
      
      if (params.offset) {
        query = query.offset(params.offset);
      }
      
      // Execute query
      const results = await query;
      return results;
    } catch (error) {
      logger.error('Error searching network participants:', error);
      throw error;
    }
  }
  
  /**
   * Get participants with specific service enabled
   */
  async getParticipantsByService(serviceId: string, active: boolean = true): Promise<NetworkParticipant[]> {
    try {
      const query = db
        .select({ participant: networkParticipants })
        .from(participantServices)
        .innerJoin(
          networkParticipants,
          eq(participantServices.participantId, networkParticipants.id)
        )
        .where(
          and(
            eq(participantServices.serviceId, serviceId),
            eq(networkParticipants.active, active),
            eq(participantServices.status, 'available')
          )
        );
      
      const results = await query;
      return results.map(r => r.participant);
    } catch (error) {
      logger.error(`Error getting participants for service ${serviceId}:`, error);
      throw error;
    }
  }
  
  // ============================================================================
  // Service Management
  // ============================================================================
  
  /**
   * Create a new network service
   */
  async createService(data: InsertNetworkService): Promise<NetworkService> {
    try {
      // Generate ID if not provided
      if (!data.id) {
        data.id = uuidv4();
      }
      
      // Set created timestamp
      data.createdAt = new Date();
      
      // Insert the service record
      const [service] = await db.insert(networkServices).values(data).returning();
      
      if (!service) {
        throw new Error('Failed to create network service');
      }
      
      logger.info(`Created network service: ${service.id} (${service.name})`);
      return service;
    } catch (error) {
      logger.error('Error creating network service:', error);
      throw error;
    }
  }
  
  /**
   * Get a network service by ID
   */
  async getService(id: string): Promise<NetworkService | undefined> {
    try {
      const [service] = await db.select().from(networkServices).where(eq(networkServices.id, id));
      return service;
    } catch (error) {
      logger.error(`Error getting network service ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a network service
   */
  async updateService(id: string, data: Partial<InsertNetworkService>): Promise<NetworkService | undefined> {
    try {
      // Remove id from update data if present
      delete data.id;
      
      // Set updated timestamp
      data.updatedAt = new Date();
      
      // Update the service
      const [service] = await db
        .update(networkServices)
        .set(data)
        .where(eq(networkServices.id, id))
        .returning();
        
      if (!service) {
        return undefined;
      }
      
      logger.info(`Updated network service: ${id}`);
      return service;
    } catch (error) {
      logger.error(`Error updating network service ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a network service
   */
  async deleteService(id: string): Promise<boolean> {
    try {
      // Check for related participant services to prevent deletion
      const relatedParticipantServices = await db
        .select({ count: sql<number>`count(*)` })
        .from(participantServices)
        .where(eq(participantServices.serviceId, id));
        
      if (relatedParticipantServices.length > 0 && relatedParticipantServices[0].count > 0) {
        throw new Error('Cannot delete service with existing participant services');
      }
      
      // Delete the service
      const result = await db
        .delete(networkServices)
        .where(eq(networkServices.id, id))
        .returning();
        
      const success = result.length > 0;
      
      if (success) {
        logger.info(`Deleted network service: ${id}`);
      }
      
      return success;
    } catch (error) {
      logger.error(`Error deleting network service ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Search for network services
   */
  async searchServices(params: ServiceSearchParams): Promise<NetworkService[]> {
    try {
      let query = db.select().from(networkServices);
      
      // Apply search filters
      if (params.name) {
        query = query.where(like(networkServices.name, `%${params.name}%`));
      }
      
      if (params.type) {
        if (Array.isArray(params.type)) {
          query = query.where(inArray(networkServices.type, params.type as any));
        } else {
          query = query.where(eq(networkServices.type, params.type as any));
        }
      }
      
      if (params.active !== undefined) {
        query = query.where(eq(networkServices.active, params.active));
      }
      
      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit);
      }
      
      if (params.offset) {
        query = query.offset(params.offset);
      }
      
      // Execute query
      const results = await query;
      return results;
    } catch (error) {
      logger.error('Error searching network services:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // Participant Service Management
  // ============================================================================
  
  /**
   * Enable a service for a participant
   */
  async enableParticipantService(data: InsertParticipantService): Promise<ParticipantService> {
    try {
      // Generate ID if not provided
      if (!data.id) {
        data.id = uuidv4();
      }
      
      // Set timestamps
      data.createdAt = new Date();
      data.enabledAt = new Date();
      
      // Insert the participant service record
      const [participantService] = await db.insert(participantServices).values(data).returning();
      
      if (!participantService) {
        throw new Error('Failed to enable participant service');
      }
      
      // Record event
      await this.recordNetworkEvent({
        eventType: 'service_enabled',
        severity: 'info',
        description: `Service ${data.serviceId} enabled for participant ${data.participantId}`,
        participantId: data.participantId,
        serviceId: data.serviceId
      });
      
      logger.info(`Enabled service ${data.serviceId} for participant ${data.participantId}`);
      return participantService;
    } catch (error) {
      logger.error('Error enabling participant service:', error);
      throw error;
    }
  }
  
  /**
   * Get a participant service record
   */
  async getParticipantService(id: string): Promise<ParticipantService | undefined> {
    try {
      const [service] = await db.select().from(participantServices).where(eq(participantServices.id, id));
      return service;
    } catch (error) {
      logger.error(`Error getting participant service ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a participant service
   */
  async updateParticipantService(id: string, data: Partial<InsertParticipantService>): Promise<ParticipantService | undefined> {
    try {
      // Remove id from update data if present
      delete data.id;
      
      // Set updated timestamp
      data.updatedAt = new Date();
      
      // If status is changing, update lastStatusChangeAt
      if (data.status) {
        data.lastStatusChangeAt = new Date();
      }
      
      // Update the service
      const [service] = await db
        .update(participantServices)
        .set(data)
        .where(eq(participantServices.id, id))
        .returning();
        
      if (!service) {
        return undefined;
      }
      
      logger.info(`Updated participant service: ${id}`);
      return service;
    } catch (error) {
      logger.error(`Error updating participant service ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Disable a service for a participant
   */
  async disableParticipantService(id: string): Promise<boolean> {
    try {
      // Get service details for event logging
      const [service] = await db
        .select()
        .from(participantServices)
        .where(eq(participantServices.id, id));
      
      if (!service) {
        return false;
      }
      
      // Delete the participant service
      const result = await db
        .delete(participantServices)
        .where(eq(participantServices.id, id))
        .returning();
        
      const success = result.length > 0;
      
      if (success) {
        // Record event
        await this.recordNetworkEvent({
          eventType: 'service_disabled',
          severity: 'info',
          description: `Service ${service.serviceId} disabled for participant ${service.participantId}`,
          participantId: service.participantId,
          serviceId: service.serviceId
        });
        
        logger.info(`Disabled service ${service.serviceId} for participant ${service.participantId}`);
      }
      
      return success;
    } catch (error) {
      logger.error(`Error disabling participant service ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all services for a participant
   */
  async getServicesByParticipant(participantId: string): Promise<any[]> {
    try {
      const query = db
        .select({
          participantService: participantServices,
          service: networkServices
        })
        .from(participantServices)
        .innerJoin(
          networkServices,
          eq(participantServices.serviceId, networkServices.id)
        )
        .where(eq(participantServices.participantId, participantId));
      
      const results = await query;
      
      // Format results
      return results.map(r => ({
        ...r.service,
        status: r.participantService.status,
        participantServiceId: r.participantService.id,
        enabledAt: r.participantService.enabledAt,
        capabilities: r.participantService.capabilities,
        supportedVersions: r.participantService.supportedVersions
      }));
    } catch (error) {
      logger.error(`Error getting services for participant ${participantId}:`, error);
      throw error;
    }
  }
  
  // ============================================================================
  // Connection Management
  // ============================================================================
  
  /**
   * Create a new network connection
   */
  async createConnection(data: InsertNetworkConnection): Promise<NetworkConnection> {
    try {
      // Generate ID if not provided
      if (!data.id) {
        data.id = uuidv4();
      }
      
      // Set timestamps
      data.createdAt = new Date();
      data.initiatedAt = new Date();
      
      // If status is 'active', set activatedAt
      if (data.status === 'active') {
        data.activatedAt = new Date();
        data.lastStatusChangeAt = new Date();
      }
      
      // Insert the connection record
      const [connection] = await db.insert(networkConnections).values(data).returning();
      
      if (!connection) {
        throw new Error('Failed to create network connection');
      }
      
      // Record event
      await this.recordNetworkEvent({
        eventType: 'connection_created',
        severity: 'info',
        description: `Connection created from ${data.sourceParticipantId} to ${data.targetParticipantId}`,
        connectionId: connection.id
      });
      
      logger.info(`Created network connection: ${connection.id} (${data.sourceParticipantId} -> ${data.targetParticipantId})`);
      return connection;
    } catch (error) {
      logger.error('Error creating network connection:', error);
      throw error;
    }
  }
  
  /**
   * Get a network connection by ID
   */
  async getConnection(id: string): Promise<NetworkConnection | undefined> {
    try {
      const [connection] = await db.select().from(networkConnections).where(eq(networkConnections.id, id));
      return connection;
    } catch (error) {
      logger.error(`Error getting network connection ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a network connection
   */
  async updateConnection(id: string, data: Partial<InsertNetworkConnection>): Promise<NetworkConnection | undefined> {
    try {
      // Remove id from update data if present
      delete data.id;
      
      // Set updated timestamp
      data.updatedAt = new Date();
      
      // If status is changing, update lastStatusChangeAt
      if (data.status) {
        data.lastStatusChangeAt = new Date();
        
        // If status is changing to 'active', set activatedAt
        if (data.status === 'active' && !data.activatedAt) {
          data.activatedAt = new Date();
        }
      }
      
      // Update the connection
      const [connection] = await db
        .update(networkConnections)
        .set(data)
        .where(eq(networkConnections.id, id))
        .returning();
        
      if (!connection) {
        return undefined;
      }
      
      // Record event if status changed
      if (data.status) {
        await this.recordNetworkEvent({
          eventType: 'connection_status_changed',
          severity: 'info',
          description: `Connection status changed to ${data.status}`,
          connectionId: id
        });
      }
      
      logger.info(`Updated network connection: ${id}`);
      return connection;
    } catch (error) {
      logger.error(`Error updating network connection ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a network connection
   */
  async deleteConnection(id: string): Promise<boolean> {
    try {
      // Get connection details for event logging
      const [connection] = await db
        .select()
        .from(networkConnections)
        .where(eq(networkConnections.id, id));
      
      if (!connection) {
        return false;
      }
      
      // Delete the connection
      const result = await db
        .delete(networkConnections)
        .where(eq(networkConnections.id, id))
        .returning();
        
      const success = result.length > 0;
      
      if (success) {
        // Record event
        await this.recordNetworkEvent({
          eventType: 'connection_deleted',
          severity: 'info',
          description: `Connection deleted between ${connection.sourceParticipantId} and ${connection.targetParticipantId}`,
          connectionId: id
        });
        
        logger.info(`Deleted network connection: ${id}`);
      }
      
      return success;
    } catch (error) {
      logger.error(`Error deleting network connection ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Search for network connections
   */
  async searchConnections(params: ConnectionSearchParams): Promise<NetworkConnection[]> {
    try {
      let query = db.select().from(networkConnections);
      
      // Apply search filters
      if (params.sourceParticipantId) {
        query = query.where(eq(networkConnections.sourceParticipantId, params.sourceParticipantId));
      }
      
      if (params.targetParticipantId) {
        query = query.where(eq(networkConnections.targetParticipantId, params.targetParticipantId));
      }
      
      if (params.status) {
        query = query.where(eq(networkConnections.status, params.status as any));
      }
      
      // Filter by service ID (using enabledServices JSONB array)
      if (params.serviceId) {
        query = query.where(
          sql`${networkConnections.enabledServices}::jsonb @> jsonb_build_array(${params.serviceId})`
        );
      }
      
      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit);
      }
      
      if (params.offset) {
        query = query.offset(params.offset);
      }
      
      // Execute query
      const results = await query;
      return results;
    } catch (error) {
      logger.error('Error searching network connections:', error);
      throw error;
    }
  }
  
  /**
   * Get all connections for a participant (both source and target)
   */
  async getParticipantConnections(participantId: string): Promise<NetworkConnection[]> {
    try {
      const query = db
        .select()
        .from(networkConnections)
        .where(
          or(
            eq(networkConnections.sourceParticipantId, participantId),
            eq(networkConnections.targetParticipantId, participantId)
          )
        )
        .orderBy(desc(networkConnections.createdAt));
      
      return await query;
    } catch (error) {
      logger.error(`Error getting connections for participant ${participantId}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if a connection exists between two participants
   */
  async connectionExists(sourceId: string, targetId: string): Promise<boolean> {
    try {
      const [connection] = await db
        .select({ count: sql<number>`count(*)` })
        .from(networkConnections)
        .where(
          and(
            eq(networkConnections.sourceParticipantId, sourceId),
            eq(networkConnections.targetParticipantId, targetId),
            eq(networkConnections.status, 'active')
          )
        );
      
      return connection.count > 0;
    } catch (error) {
      logger.error(`Error checking connection between ${sourceId} and ${targetId}:`, error);
      throw error;
    }
  }
  
  // ============================================================================
  // Mapping and Visualization
  // ============================================================================
  
  /**
   * Create a new map region
   */
  async createMapRegion(data: InsertNetworkMapRegion): Promise<NetworkMapRegion> {
    try {
      // Generate ID if not provided
      if (!data.id) {
        data.id = uuidv4();
      }
      
      // Set created timestamp
      data.createdAt = new Date();
      
      // Insert the region record
      const [region] = await db.insert(networkMapRegions).values(data).returning();
      
      if (!region) {
        throw new Error('Failed to create network map region');
      }
      
      logger.info(`Created network map region: ${region.id} (${region.name})`);
      return region;
    } catch (error) {
      logger.error('Error creating network map region:', error);
      throw error;
    }
  }
  
  /**
   * Get participants for a map view (with pagination and bounding box)
   */
  async getMapParticipants(boundingBox?: {
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number
  }, types?: string[], limit: number = 100): Promise<any[]> {
    try {
      let query = db
        .select({
          id: networkParticipants.id,
          name: networkParticipants.name,
          type: networkParticipants.type,
          latitude: networkParticipants.latitude,
          longitude: networkParticipants.longitude,
          address: networkParticipants.addressLine1,
          city: networkParticipants.city,
          state: networkParticipants.state
        })
        .from(networkParticipants)
        .where(
          and(
            eq(networkParticipants.active, true),
            not(isNull(networkParticipants.latitude)),
            not(isNull(networkParticipants.longitude))
          )
        );
      
      // Apply type filter if provided
      if (types && types.length > 0) {
        query = query.where(inArray(networkParticipants.type, types as any));
      }
      
      // Apply bounding box filter if provided
      if (boundingBox) {
        query = query.where(
          and(
            sql`${networkParticipants.latitude}::float BETWEEN ${boundingBox.minLat} AND ${boundingBox.maxLat}`,
            sql`${networkParticipants.longitude}::float BETWEEN ${boundingBox.minLng} AND ${boundingBox.maxLng}`
          )
        );
      }
      
      // Apply limit
      query = query.limit(limit);
      
      // Execute query
      const participants = await query;
      
      // For each participant, get their enabled services
      const enrichedParticipants = [];
      
      for (const participant of participants) {
        // Get services
        const services = await this.getServicesByParticipant(participant.id);
        
        // Add services to participant
        enrichedParticipants.push({
          ...participant,
          services: services.map(s => ({
            id: s.id,
            name: s.name,
            type: s.type,
            status: s.status
          }))
        });
      }
      
      return enrichedParticipants;
    } catch (error) {
      logger.error('Error getting map participants:', error);
      throw error;
    }
  }
  
  /**
   * Get network statistics for visualization
   */
  async getNetworkStats(): Promise<any> {
    try {
      // Get participant counts by type
      const participantsByType = await db
        .select({
          type: networkParticipants.type,
          count: sql<number>`count(*)`
        })
        .from(networkParticipants)
        .where(eq(networkParticipants.active, true))
        .groupBy(networkParticipants.type);
      
      // Get service counts by type
      const servicesByType = await db
        .select({
          type: networkServices.type,
          count: sql<number>`count(*)`
        })
        .from(networkServices)
        .where(eq(networkServices.active, true))
        .groupBy(networkServices.type);
      
      // Get connection counts by status
      const connectionsByStatus = await db
        .select({
          status: networkConnections.status,
          count: sql<number>`count(*)`
        })
        .from(networkConnections)
        .groupBy(networkConnections.status);
      
      // Get total counts
      const [participantCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(networkParticipants)
        .where(eq(networkParticipants.active, true));
      
      const [serviceCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(networkServices)
        .where(eq(networkServices.active, true));
      
      const [connectionCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(networkConnections);
      
      return {
        totalParticipants: participantCount.count,
        totalServices: serviceCount.count,
        totalConnections: connectionCount.count,
        participantsByType,
        servicesByType,
        connectionsByStatus
      };
    } catch (error) {
      logger.error('Error getting network stats:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // Event Tracking
  // ============================================================================
  
  /**
   * Record a network event
   */
  async recordNetworkEvent(data: {
    eventType: string,
    severity: string,
    description: string,
    participantId?: string,
    serviceId?: string,
    connectionId?: string,
    eventData?: any
  }): Promise<void> {
    try {
      const eventData = {
        id: uuidv4(),
        eventType: data.eventType,
        severity: data.severity,
        description: data.description,
        participantId: data.participantId,
        serviceId: data.serviceId,
        connectionId: data.connectionId,
        eventData: data.eventData,
        eventTime: new Date(),
        createdAt: new Date()
      };
      
      await db.insert(networkEvents).values(eventData);
    } catch (error) {
      logger.error('Error recording network event:', error);
      // Don't throw, just log the error to avoid breaking the calling function
    }
  }
  
  /**
   * Get recent network events
   */
  async getRecentEvents(limit: number = 100, types?: string[]): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(networkEvents)
        .orderBy(desc(networkEvents.eventTime));
      
      // Filter by event types if provided
      if (types && types.length > 0) {
        query = query.where(inArray(networkEvents.eventType, types));
      }
      
      // Apply limit
      query = query.limit(limit);
      
      return await query;
    } catch (error) {
      logger.error('Error getting recent network events:', error);
      throw error;
    }
  }
}

// Create and export the service instance
export const networkDirectoryService = new NetworkDirectoryService();