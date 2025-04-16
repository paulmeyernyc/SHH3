/**
 * Audit Service
 * 
 * The Audit Service provides centralized audit logging capability for the Smart
 * Health Hub platform, tracking all activities, data access, and changes for 
 * compliance and security purposes.
 */

import express, { Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { eq, and, sql, asc, desc, gte, lte, inArray, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Redis } from 'ioredis';
import { CronJob } from 'cron';
import {
  auditEvents,
  auditDataChanges, 
  auditAccess,
  auditRetentionPolicies,
  AUDIT_RESOURCE_TYPES,
  AUDIT_ACTIONS,
  AUDIT_STATUSES
} from '../../shared/audit-schema';

/**
 * The main Audit Service class
 */
export class AuditService {
  app: express.Application;
  server: Server | null = null;
  pool: Pool | null = null;
  db: any = null;
  redis: Redis | null = null;
  port: number;
  environment: string;
  retentionJob: CronJob | null = null;
  
  /**
   * Create a new Audit Service instance
   */
  constructor(options: {
    port?: number;
    environment?: string;
    databaseUrl?: string;
    redisUrl?: string;
  } = {}) {
    this.app = express();
    this.port = options.port || 4000;
    this.environment = options.environment || 'development';
    
    // Setup middleware
    this.setupMiddleware();
    
    // Setup application routes
    this.setupRoutes();
    
    // Initialize database if URL provided
    if (options.databaseUrl) {
      this.initializeDatabase(options.databaseUrl);
    }
    
    // Initialize Redis cache if URL provided
    if (options.redisUrl) {
      this.initializeCache(options.redisUrl);
    }
    
    // Schedule retention policy execution (midnight every day)
    this.retentionJob = new CronJob(
      '0 0 * * *', // Run at midnight
      this.executeScheduledRetentionPolicies.bind(this),
      null,
      false, // Don't start automatically
      'UTC'
    );
  }
  
  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Basic security headers
    this.app.use(helmet());
    
    // Cross-Origin Resource Sharing
    this.app.use(cors());
    
    // Request logging
    this.app.use(morgan(this.environment === 'production' ? 'combined' : 'dev'));
    
    // JSON body parsing
    this.app.use(express.json({ limit: '2mb' }));
    
    // URL-encoded body parsing
    this.app.use(express.urlencoded({ extended: true }));
    
    // Error handling middleware
    this.app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      console.error('Error during request processing:', err);
      
      // Create an audit event for internal errors
      this.createErrorAuditEvent(req, err);
      
      res.status(500).json({
        error: 'Internal server error',
        message: this.environment === 'production' ? 'An error occurred' : err.message
      });
    });
  }
  
  /**
   * Create an audit event for an internal error
   */
  private async createErrorAuditEvent(req: Request, err: Error): Promise<void> {
    if (!this.db) return;
    
    try {
      const requestId = uuidv4();
      const metadata = {
        errorName: err.name,
        errorMessage: err.message,
        errorStack: this.environment !== 'production' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        query: req.query,
        headers: {
          userAgent: req.headers['user-agent'],
          contentType: req.headers['content-type']
        }
      };
      
      await this.db.insert(auditEvents).values({
        timestamp: new Date(),
        service: 'audit-service',
        ipAddress: req.ip,
        resourceType: 'system',
        resourceId: null,
        action: 'error',
        status: 'failure',
        description: `Internal server error: ${err.message}`,
        metadata,
        requestId,
        retain: true // Ensure error logs are retained longer
      });
    } catch (error) {
      console.error('Failed to create error audit event:', error);
    }
  }
  
  /**
   * Setup application routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      const dbStatus = this.db ? 'connected' : 'disconnected';
      const redisStatus = this.redis ? 'connected' : 'disconnected';
      
      const healthy = dbStatus === 'connected';
      
      res.status(healthy ? 200 : 503).json({
        status: healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          redis: redisStatus
        }
      });
    });
    
    // API version endpoint
    this.app.get('/api/version', (req: Request, res: Response) => {
      res.json({
        service: 'audit-service',
        version: '1.0.0',
        environment: this.environment
      });
    });
    
    // Audit events endpoints
    this.app.post('/api/audit/events', this.createAuditEvent.bind(this));
    this.app.post('/api/audit/events/bulk', this.bulkCreateAuditEvents.bind(this));
    this.app.get('/api/audit/events', this.listAuditEvents.bind(this));
    this.app.get('/api/audit/events/:id', this.getAuditEvent.bind(this));
    
    // Audit data changes endpoints
    this.app.post('/api/audit/data-changes', this.createDataChange.bind(this));
    this.app.get('/api/audit/data-changes', this.listDataChanges.bind(this));
    
    // Audit access records endpoints
    this.app.post('/api/audit/access', this.createAccessRecord.bind(this));
    this.app.get('/api/audit/access', this.listAccessRecords.bind(this));
    
    // Audit retention policy endpoints
    this.app.get('/api/audit/retention-policies', this.listRetentionPolicies.bind(this));
    this.app.get('/api/audit/retention-policies/:id', this.getRetentionPolicy.bind(this));
    this.app.post('/api/audit/retention-policies', this.createRetentionPolicy.bind(this));
    this.app.put('/api/audit/retention-policies/:id', this.updateRetentionPolicy.bind(this));
    this.app.delete('/api/audit/retention-policies/:id', this.deleteRetentionPolicy.bind(this));
    this.app.post('/api/audit/retention-policies/execute', this.executeRetentionPolicies.bind(this));
    
    // Statistics endpoint
    this.app.get('/api/audit/statistics', this.getStatistics.bind(this));
  }
  
  /**
   * Start the Audit Service
   */
  async start(): Promise<void> {
    if (this.server) {
      console.warn('Audit Service is already running');
      return;
    }
    
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Audit Service listening on port ${this.port}`);
        
        // Ensure tables exist
        if (this.db) {
          this.ensureTablesExist()
            .then(() => this.ensureDefaultRetentionPolicies())
            .catch(err => console.error('Error ensuring tables and policies exist:', err));
        }
        
        // Start the retention job
        if (this.retentionJob && !this.retentionJob.running) {
          this.retentionJob.start();
          console.log('Scheduled retention policy execution job started');
        }
        
        resolve();
      });
    });
  }
  
  /**
   * Initialize the database connection
   */
  private async initializeDatabase(databaseUrl: string): Promise<void> {
    try {
      this.pool = new Pool({ connectionString: databaseUrl });
      this.db = drizzle(this.pool);
      
      // Test the connection
      await this.pool.query('SELECT NOW()');
      console.log('Database connection established successfully');
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      this.pool = null;
      this.db = null;
      throw error;
    }
  }
  
  /**
   * Initialize Redis cache if configured
   */
  private async initializeCache(redisUrl: string): Promise<void> {
    try {
      this.redis = new Redis(redisUrl);
      console.log('Redis connection established successfully');
      
      this.redis.on('error', (err: Error) => {
        console.error('Redis error:', err);
      });
    } catch (error) {
      console.error('Failed to initialize Redis connection:', error);
      this.redis = null;
    }
  }
  
  /**
   * Ensure required database tables exist
   */
  private async ensureTablesExist(): Promise<void> {
    try {
      // Check if the tables exist by querying them
      await this.db.select().from(auditEvents).limit(1);
      await this.db.select().from(auditDataChanges).limit(1);
      await this.db.select().from(auditAccess).limit(1);
      await this.db.select().from(auditRetentionPolicies).limit(1);
      
      console.log('Audit tables verified');
    } catch (error) {
      console.error('Error verifying audit tables, they may need to be created:', error);
      throw error;
    }
  }
  
  /**
   * Ensure default retention policies exist
   */
  private async ensureDefaultRetentionPolicies(): Promise<void> {
    try {
      // Check if any policies exist
      const policies = await this.db.select().from(auditRetentionPolicies);
      
      if (policies.length === 0) {
        console.log('No retention policies found, creating defaults');
        
        const defaultPolicies = [
          {
            name: 'Standard Access Logs',
            description: 'Standard retention policy for access logs (1 year)',
            resourceTypes: AUDIT_RESOURCE_TYPES,
            actions: ['access', 'read'],
            retentionDays: 365,
            isActive: true
          },
          {
            name: 'Login Activity',
            description: 'Retention policy for login/logout events (2 years)',
            resourceTypes: ['user'],
            actions: ['login', 'logout'],
            retentionDays: 730,
            isActive: true
          },
          {
            name: 'Data Modifications',
            description: 'Retention policy for data changes (5 years)',
            resourceTypes: AUDIT_RESOURCE_TYPES,
            actions: ['create', 'update', 'delete'],
            retentionDays: 1825,
            isActive: true
          },
          {
            name: 'Patient Data Access',
            description: 'Extended retention for patient data access (7 years)',
            resourceTypes: ['patient'],
            actions: AUDIT_ACTIONS,
            retentionDays: 2555,
            isActive: true
          },
          {
            name: 'System Events',
            description: 'Retention for system events (6 months)',
            resourceTypes: ['system'],
            actions: ['start', 'stop', 'configure', 'error'],
            retentionDays: 180,
            isActive: true
          }
        ];
        
        for (const policy of defaultPolicies) {
          await this.db.insert(auditRetentionPolicies).values({
            ...policy,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        
        console.log('Default retention policies created');
      } else {
        console.log(`${policies.length} retention policies already exist`);
      }
    } catch (error) {
      console.error('Error ensuring default retention policies:', error);
    }
  }
  
  /**
   * Stop the Audit Service
   */
  async stop(): Promise<void> {
    if (this.retentionJob && this.retentionJob.running) {
      this.retentionJob.stop();
      console.log('Retention policy execution job stopped');
    }
    
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      console.log('Redis connection closed');
    }
    
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
      console.log('Database connection closed');
    }
    
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server!.close((err) => {
          if (err) {
            console.error('Error stopping Audit Service:', err);
            reject(err);
          } else {
            console.log('Audit Service stopped');
            this.server = null;
            resolve();
          }
        });
      });
    }
  }
  
  /**
   * Validate that a resource type is valid
   */
  private validateResourceType(type): boolean {
    return AUDIT_RESOURCE_TYPES.includes(type) || type.startsWith('custom:');
  }
  
  /**
   * Validate that an action is valid
   */
  private validateAction(action): boolean {
    return AUDIT_ACTIONS.includes(action) || action.startsWith('custom:');
  }
  
  /**
   * Create an audit event
   */
  private async createAuditEvent(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const eventData = req.body;
      
      // Validate required fields
      if (!eventData.service) {
        res.status(400).json({ error: 'service is required' });
        return;
      }
      
      if (!eventData.resourceType || !this.validateResourceType(eventData.resourceType)) {
        res.status(400).json({ error: 'resourceType is required and must be valid' });
        return;
      }
      
      if (!eventData.action || !this.validateAction(eventData.action)) {
        res.status(400).json({ error: 'action is required and must be valid' });
        return;
      }
      
      if (!eventData.status || !AUDIT_STATUSES.includes(eventData.status)) {
        res.status(400).json({ error: 'status is required and must be valid' });
        return;
      }
      
      // Set timestamp if not provided
      if (!eventData.timestamp) {
        eventData.timestamp = new Date();
      }
      
      // Generate request ID if not provided
      if (!eventData.requestId) {
        eventData.requestId = uuidv4();
      }
      
      // Insert the audit event
      const result = await this.db.insert(auditEvents).values(eventData).returning();
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating audit event:', error);
      res.status(500).json({ error: 'Failed to create audit event', message: error.message });
    }
  }
  
  /**
   * Create audit events in bulk
   */
  private async bulkCreateAuditEvents(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const events = req.body;
      
      if (!Array.isArray(events)) {
        res.status(400).json({ error: 'Request body must be an array of audit events' });
        return;
      }
      
      if (events.length === 0) {
        res.status(400).json({ error: 'No events provided' });
        return;
      }
      
      if (events.length > 1000) {
        res.status(400).json({ error: 'Too many events. Maximum 1000 events per request' });
        return;
      }
      
      // Validate each event
      for (const event of events) {
        if (!event.service) {
          res.status(400).json({ error: 'service is required for all events' });
          return;
        }
        
        if (!event.resourceType || !this.validateResourceType(event.resourceType)) {
          res.status(400).json({ error: 'resourceType is required and must be valid for all events' });
          return;
        }
        
        if (!event.action || !this.validateAction(event.action)) {
          res.status(400).json({ error: 'action is required and must be valid for all events' });
          return;
        }
        
        if (!event.status || !AUDIT_STATUSES.includes(event.status)) {
          res.status(400).json({ error: 'status is required and must be valid for all events' });
          return;
        }
        
        // Set timestamp if not provided
        if (!event.timestamp) {
          event.timestamp = new Date();
        }
        
        // Generate request ID if not provided
        if (!event.requestId) {
          event.requestId = uuidv4();
        }
      }
      
      // Insert all events
      const result = await this.db.insert(auditEvents).values(events).returning();
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating bulk audit events:', error);
      res.status(500).json({ error: 'Failed to create bulk audit events', message: error.message });
    }
  }
  
  /**
   * List audit events with filtering and pagination
   */
  private async listAuditEvents(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      
      // Validate pagination parameters
      if (page < 1) {
        res.status(400).json({ error: 'page must be greater than 0' });
        return;
      }
      
      if (pageSize < 1 || pageSize > 100) {
        res.status(400).json({ error: 'pageSize must be between 1 and 100' });
        return;
      }
      
      // Build filter conditions
      const conditions = [];
      
      if (req.query.userId) {
        conditions.push(eq(auditEvents.userId, parseInt(req.query.userId as string)));
      }
      
      if (req.query.username) {
        conditions.push(like(auditEvents.username, `%${req.query.username}%`));
      }
      
      if (req.query.service) {
        conditions.push(eq(auditEvents.service, req.query.service as string));
      }
      
      if (req.query.resourceType) {
        conditions.push(eq(auditEvents.resourceType, req.query.resourceType as string));
      }
      
      if (req.query.resourceId) {
        conditions.push(eq(auditEvents.resourceId, req.query.resourceId as string));
      }
      
      if (req.query.action) {
        conditions.push(eq(auditEvents.action, req.query.action as string));
      }
      
      if (req.query.status) {
        conditions.push(eq(auditEvents.status, req.query.status as string));
      }
      
      if (req.query.requestId) {
        conditions.push(eq(auditEvents.requestId, req.query.requestId as string));
      }
      
      if (req.query.sessionId) {
        conditions.push(eq(auditEvents.sessionId, req.query.sessionId as string));
      }
      
      if (req.query.startDate) {
        conditions.push(gte(auditEvents.timestamp, new Date(req.query.startDate as string)));
      }
      
      if (req.query.endDate) {
        conditions.push(lte(auditEvents.timestamp, new Date(req.query.endDate as string)));
      }
      
      // Count total items for pagination
      const countQuery = conditions.length > 0 ?
        this.db.select({ count: sql`count(*)` }).from(auditEvents).where(and(...conditions)) :
        this.db.select({ count: sql`count(*)` }).from(auditEvents);
      
      const countResult = await countQuery;
      const totalItems = parseInt(countResult[0].count);
      const totalPages = Math.ceil(totalItems / pageSize);
      
      // Get paginated results
      const offset = (page - 1) * pageSize;
      
      const queryBuilder = conditions.length > 0 ?
        this.db.select().from(auditEvents).where(and(...conditions)) :
        this.db.select().from(auditEvents);
      
      const events = await queryBuilder
        .orderBy(desc(auditEvents.timestamp))
        .limit(pageSize)
        .offset(offset);
      
      res.json({
        events,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error listing audit events:', error);
      res.status(500).json({ error: 'Failed to list audit events', message: error.message });
    }
  }
  
  /**
   * Get a single audit event with related data
   */
  private async getAuditEvent(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const eventId = parseInt(req.params.id);
      
      if (isNaN(eventId)) {
        res.status(400).json({ error: 'Invalid event ID' });
        return;
      }
      
      // Get the audit event
      const [event] = await this.db.select().from(auditEvents).where(eq(auditEvents.id, eventId));
      
      if (!event) {
        res.status(404).json({ error: 'Audit event not found' });
        return;
      }
      
      // Get related data changes
      const dataChanges = await this.db
        .select()
        .from(auditDataChanges)
        .where(eq(auditDataChanges.auditEventId, eventId))
        .orderBy(desc(auditDataChanges.timestamp));
      
      // Get related access records
      const accessRecords = await this.db
        .select()
        .from(auditAccess)
        .where(eq(auditAccess.auditEventId, eventId));
      
      res.json({
        event,
        dataChanges,
        accessRecords
      });
    } catch (error) {
      console.error(`Error getting audit event ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get audit event', message: error.message });
    }
  }
  
  /**
   * Create a data change record
   */
  private async createDataChange(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const changeData = req.body;
      
      // Validate required fields
      if (!changeData.auditEventId) {
        res.status(400).json({ error: 'auditEventId is required' });
        return;
      }
      
      if (!changeData.field) {
        res.status(400).json({ error: 'field is required' });
        return;
      }
      
      // Check if the audit event exists
      const [event] = await this.db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.id, changeData.auditEventId));
      
      if (!event) {
        res.status(404).json({ error: 'Audit event not found' });
        return;
      }
      
      // Set timestamp if not provided
      if (!changeData.timestamp) {
        changeData.timestamp = new Date();
      }
      
      // Insert the data change
      const result = await this.db.insert(auditDataChanges).values(changeData).returning();
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating data change record:', error);
      res.status(500).json({ error: 'Failed to create data change record', message: error.message });
    }
  }
  
  /**
   * List data changes with filtering and pagination
   */
  private async listDataChanges(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      
      // Validate pagination parameters
      if (page < 1) {
        res.status(400).json({ error: 'page must be greater than 0' });
        return;
      }
      
      if (pageSize < 1 || pageSize > 100) {
        res.status(400).json({ error: 'pageSize must be between 1 and 100' });
        return;
      }
      
      // Build filter conditions
      const conditions = [];
      
      if (req.query.auditEventId) {
        conditions.push(eq(auditDataChanges.auditEventId, parseInt(req.query.auditEventId as string)));
      }
      
      if (req.query.field) {
        conditions.push(eq(auditDataChanges.field, req.query.field as string));
      }
      
      if (req.query.startDate) {
        conditions.push(gte(auditDataChanges.timestamp, new Date(req.query.startDate as string)));
      }
      
      if (req.query.endDate) {
        conditions.push(lte(auditDataChanges.timestamp, new Date(req.query.endDate as string)));
      }
      
      // Count total items for pagination
      const countQuery = conditions.length > 0 ?
        this.db.select({ count: sql`count(*)` }).from(auditDataChanges).where(and(...conditions)) :
        this.db.select({ count: sql`count(*)` }).from(auditDataChanges);
      
      const countResult = await countQuery;
      const totalItems = parseInt(countResult[0].count);
      const totalPages = Math.ceil(totalItems / pageSize);
      
      // Get paginated results
      const offset = (page - 1) * pageSize;
      
      const queryBuilder = conditions.length > 0 ?
        this.db.select().from(auditDataChanges).where(and(...conditions)) :
        this.db.select().from(auditDataChanges);
      
      const changes = await queryBuilder
        .orderBy(desc(auditDataChanges.timestamp))
        .limit(pageSize)
        .offset(offset);
      
      res.json({
        changes,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error listing data changes:', error);
      res.status(500).json({ error: 'Failed to list data changes', message: error.message });
    }
  }
  
  /**
   * Create an access record
   */
  private async createAccessRecord(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const accessData = req.body;
      
      // Validate required fields
      if (!accessData.auditEventId) {
        res.status(400).json({ error: 'auditEventId is required' });
        return;
      }
      
      if (!accessData.resourceType) {
        res.status(400).json({ error: 'resourceType is required' });
        return;
      }
      
      if (accessData.accessGranted === undefined || accessData.accessGranted === null) {
        res.status(400).json({ error: 'accessGranted is required' });
        return;
      }
      
      // Check if the audit event exists
      const [event] = await this.db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.id, accessData.auditEventId));
      
      if (!event) {
        res.status(404).json({ error: 'Audit event not found' });
        return;
      }
      
      // Set timestamp if not provided
      if (!accessData.timestamp) {
        accessData.timestamp = new Date();
      }
      
      // Insert the access record
      const result = await this.db.insert(auditAccess).values(accessData).returning();
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating access record:', error);
      res.status(500).json({ error: 'Failed to create access record', message: error.message });
    }
  }
  
  /**
   * List access records with filtering and pagination
   */
  private async listAccessRecords(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      
      // Validate pagination parameters
      if (page < 1) {
        res.status(400).json({ error: 'page must be greater than 0' });
        return;
      }
      
      if (pageSize < 1 || pageSize > 100) {
        res.status(400).json({ error: 'pageSize must be between 1 and 100' });
        return;
      }
      
      // Build filter conditions
      const conditions = [];
      
      if (req.query.auditEventId) {
        conditions.push(eq(auditAccess.auditEventId, parseInt(req.query.auditEventId as string)));
      }
      
      if (req.query.userId) {
        conditions.push(eq(auditAccess.userId, parseInt(req.query.userId as string)));
      }
      
      if (req.query.username) {
        conditions.push(like(auditAccess.username, `%${req.query.username}%`));
      }
      
      if (req.query.patientId) {
        conditions.push(eq(auditAccess.patientId, req.query.patientId as string));
      }
      
      if (req.query.resourceType) {
        conditions.push(eq(auditAccess.resourceType, req.query.resourceType as string));
      }
      
      if (req.query.resourceId) {
        conditions.push(eq(auditAccess.resourceId, req.query.resourceId as string));
      }
      
      if (req.query.purpose) {
        conditions.push(eq(auditAccess.purpose, req.query.purpose as string));
      }
      
      if (req.query.accessGranted !== undefined) {
        conditions.push(eq(auditAccess.accessGranted, req.query.accessGranted === 'true'));
      }
      
      if (req.query.emergencyAccess !== undefined) {
        conditions.push(eq(auditAccess.emergencyAccess, req.query.emergencyAccess === 'true'));
      }
      
      if (req.query.startDate) {
        conditions.push(gte(auditAccess.timestamp, new Date(req.query.startDate as string)));
      }
      
      if (req.query.endDate) {
        conditions.push(lte(auditAccess.timestamp, new Date(req.query.endDate as string)));
      }
      
      // Count total items for pagination
      const countQuery = conditions.length > 0 ?
        this.db.select({ count: sql`count(*)` }).from(auditAccess).where(and(...conditions)) :
        this.db.select({ count: sql`count(*)` }).from(auditAccess);
      
      const countResult = await countQuery;
      const totalItems = parseInt(countResult[0].count);
      const totalPages = Math.ceil(totalItems / pageSize);
      
      // Get paginated results
      const offset = (page - 1) * pageSize;
      
      const queryBuilder = conditions.length > 0 ?
        this.db.select().from(auditAccess).where(and(...conditions)) :
        this.db.select().from(auditAccess);
      
      const access = await queryBuilder
        .orderBy(desc(auditAccess.timestamp))
        .limit(pageSize)
        .offset(offset);
      
      res.json({
        access,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error listing access records:', error);
      res.status(500).json({ error: 'Failed to list access records', message: error.message });
    }
  }
  
  /**
   * List retention policies with filtering and pagination
   */
  private async listRetentionPolicies(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      
      // Validate pagination parameters
      if (page < 1) {
        res.status(400).json({ error: 'page must be greater than 0' });
        return;
      }
      
      if (pageSize < 1 || pageSize > 100) {
        res.status(400).json({ error: 'pageSize must be between 1 and 100' });
        return;
      }
      
      // Build filter conditions
      const conditions = [];
      
      if (req.query.name) {
        conditions.push(like(auditRetentionPolicies.name, `%${req.query.name}%`));
      }
      
      if (req.query.resourceType) {
        // Filter for policies that include this resource type in their array
        conditions.push(sql`${req.query.resourceType} = ANY(${auditRetentionPolicies.resourceTypes})`);
      }
      
      if (req.query.action) {
        // Filter for policies that include this action in their array
        conditions.push(sql`${req.query.action} = ANY(${auditRetentionPolicies.actions})`);
      }
      
      if (req.query.isActive !== undefined) {
        conditions.push(eq(auditRetentionPolicies.isActive, req.query.isActive === 'true'));
      }
      
      // Count total items for pagination
      const countQuery = conditions.length > 0 ?
        this.db.select({ count: sql`count(*)` }).from(auditRetentionPolicies).where(and(...conditions)) :
        this.db.select({ count: sql`count(*)` }).from(auditRetentionPolicies);
      
      const countResult = await countQuery;
      const totalItems = parseInt(countResult[0].count);
      const totalPages = Math.ceil(totalItems / pageSize);
      
      // Get paginated results
      const offset = (page - 1) * pageSize;
      
      const queryBuilder = conditions.length > 0 ?
        this.db.select().from(auditRetentionPolicies).where(and(...conditions)) :
        this.db.select().from(auditRetentionPolicies);
      
      const policies = await queryBuilder
        .orderBy(asc(auditRetentionPolicies.name))
        .limit(pageSize)
        .offset(offset);
      
      res.json({
        policies,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error listing retention policies:', error);
      res.status(500).json({ error: 'Failed to list retention policies', message: error.message });
    }
  }
  
  /**
   * Get a single retention policy
   */
  private async getRetentionPolicy(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const policyId = parseInt(req.params.id);
      
      if (isNaN(policyId)) {
        res.status(400).json({ error: 'Invalid policy ID' });
        return;
      }
      
      // Get the retention policy
      const [policy] = await this.db
        .select()
        .from(auditRetentionPolicies)
        .where(eq(auditRetentionPolicies.id, policyId));
      
      if (!policy) {
        res.status(404).json({ error: 'Retention policy not found' });
        return;
      }
      
      res.json(policy);
    } catch (error) {
      console.error(`Error getting retention policy ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get retention policy', message: error.message });
    }
  }
  
  /**
   * Create a retention policy
   */
  private async createRetentionPolicy(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const policyData = req.body;
      
      // Validate required fields
      if (!policyData.name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      
      if (!policyData.resourceTypes || !Array.isArray(policyData.resourceTypes) || policyData.resourceTypes.length === 0) {
        res.status(400).json({ error: 'resourceTypes is required and must be a non-empty array' });
        return;
      }
      
      if (!policyData.actions || !Array.isArray(policyData.actions) || policyData.actions.length === 0) {
        res.status(400).json({ error: 'actions is required and must be a non-empty array' });
        return;
      }
      
      if (policyData.retentionDays === undefined || policyData.retentionDays === null || policyData.retentionDays < 0) {
        res.status(400).json({ error: 'retentionDays is required and must be non-negative' });
        return;
      }
      
      // Check if a policy with the same name already exists
      const existingPolicy = await this.db
        .select()
        .from(auditRetentionPolicies)
        .where(eq(auditRetentionPolicies.name, policyData.name));
      
      if (existingPolicy.length > 0) {
        res.status(409).json({ error: 'A retention policy with this name already exists' });
        return;
      }
      
      // Add timestamps
      policyData.createdAt = new Date();
      policyData.updatedAt = new Date();
      
      // Insert the retention policy
      const result = await this.db
        .insert(auditRetentionPolicies)
        .values(policyData)
        .returning();
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating retention policy:', error);
      res.status(500).json({ error: 'Failed to create retention policy', message: error.message });
    }
  }
  
  /**
   * Update a retention policy
   */
  private async updateRetentionPolicy(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const policyId = parseInt(req.params.id);
      const policyData = req.body;
      
      if (isNaN(policyId)) {
        res.status(400).json({ error: 'Invalid policy ID' });
        return;
      }
      
      // Check if the policy exists
      const existingPolicy = await this.db
        .select()
        .from(auditRetentionPolicies)
        .where(eq(auditRetentionPolicies.id, policyId));
      
      if (existingPolicy.length === 0) {
        res.status(404).json({ error: 'Retention policy not found' });
        return;
      }
      
      // Validate required fields
      if (policyData.name === '') {
        res.status(400).json({ error: 'name cannot be empty' });
        return;
      }
      
      if (policyData.resourceTypes !== undefined && (!Array.isArray(policyData.resourceTypes) || policyData.resourceTypes.length === 0)) {
        res.status(400).json({ error: 'resourceTypes must be a non-empty array' });
        return;
      }
      
      if (policyData.actions !== undefined && (!Array.isArray(policyData.actions) || policyData.actions.length === 0)) {
        res.status(400).json({ error: 'actions must be a non-empty array' });
        return;
      }
      
      if (policyData.retentionDays !== undefined && (policyData.retentionDays === null || policyData.retentionDays < 0)) {
        res.status(400).json({ error: 'retentionDays must be non-negative' });
        return;
      }
      
      // Check if a different policy with the same name already exists
      if (policyData.name && policyData.name !== existingPolicy[0].name) {
        const nameExists = await this.db
          .select()
          .from(auditRetentionPolicies)
          .where(eq(auditRetentionPolicies.name, policyData.name));
        
        if (nameExists.length > 0) {
          res.status(409).json({ error: 'A retention policy with this name already exists' });
          return;
        }
      }
      
      // Update the updatedAt timestamp
      policyData.updatedAt = new Date();
      
      // Update the retention policy
      const result = await this.db
        .update(auditRetentionPolicies)
        .set(policyData)
        .where(eq(auditRetentionPolicies.id, policyId))
        .returning();
      
      res.json(result[0]);
    } catch (error) {
      console.error(`Error updating retention policy ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to update retention policy', message: error.message });
    }
  }
  
  /**
   * Delete a retention policy
   */
  private async deleteRetentionPolicy(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const policyId = parseInt(req.params.id);
      
      if (isNaN(policyId)) {
        res.status(400).json({ error: 'Invalid policy ID' });
        return;
      }
      
      // Check if the policy exists
      const existingPolicy = await this.db
        .select()
        .from(auditRetentionPolicies)
        .where(eq(auditRetentionPolicies.id, policyId));
      
      if (existingPolicy.length === 0) {
        res.status(404).json({ error: 'Retention policy not found' });
        return;
      }
      
      // Delete the retention policy
      await this.db
        .delete(auditRetentionPolicies)
        .where(eq(auditRetentionPolicies.id, policyId));
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting retention policy ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to delete retention policy', message: error.message });
    }
  }
  
  /**
   * Execute retention policies
   */
  private async executeRetentionPolicies(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const dryRun = req.query.dryRun === 'true';
      const specificPolicyId = req.query.policyId ? parseInt(req.query.policyId as string) : null;
      
      // Get active retention policies
      const policiesQuery = this.db
        .select()
        .from(auditRetentionPolicies)
        .where(eq(auditRetentionPolicies.isActive, true));
      
      // Filter by specific policy ID if provided
      const policies = specificPolicyId ?
        await policiesQuery.where(eq(auditRetentionPolicies.id, specificPolicyId)) :
        await policiesQuery;
      
      if (policies.length === 0) {
        res.status(404).json({ 
          error: specificPolicyId ? 
            'Active retention policy not found with the specified ID' : 
            'No active retention policies found' 
        });
        return;
      }
      
      const results = [];
      
      // Process each policy
      for (const policy of policies) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
        
        // Build the conditions for events that should be deleted
        const conditions = [
          lte(auditEvents.timestamp, cutoffDate),
          eq(auditEvents.retain, false) // Don't delete events marked for retention
        ];
        
        // Add resource type filter
        if (policy.resourceTypes && policy.resourceTypes.length > 0) {
          conditions.push(inArray(auditEvents.resourceType, policy.resourceTypes));
        }
        
        // Add action filter
        if (policy.actions && policy.actions.length > 0) {
          conditions.push(inArray(auditEvents.action, policy.actions));
        }
        
        // Count events that would be deleted
        const countResult = await this.db
          .select({ count: sql`count(*)` })
          .from(auditEvents)
          .where(and(...conditions));
        
        const eventsToDelete = parseInt(countResult[0].count);
        
        let deletedCount = 0;
        
        // Delete events if not a dry run
        if (!dryRun && eventsToDelete > 0) {
          const deleteResult = await this.db
            .delete(auditEvents)
            .where(and(...conditions))
            .returning({ id: auditEvents.id });
          
          deletedCount = deleteResult.length;
        }
        
        results.push({
          policyId: policy.id,
          policyName: policy.name,
          cutoffDate: cutoffDate.toISOString(),
          eventsToDelete,
          eventsDeleted: dryRun ? 0 : deletedCount,
          dryRun
        });
      }
      
      res.json({
        executed: !dryRun,
        results
      });
    } catch (error) {
      console.error('Error executing retention policies:', error);
      res.status(500).json({ error: 'Failed to execute retention policies', message: error.message });
    }
  }
  
  /**
   * Execute scheduled retention policies (called by cron job)
   */
  private async executeScheduledRetentionPolicies(): Promise<void> {
    try {
      if (!this.db) {
        console.error('Cannot execute retention policies: Database not available');
        return;
      }
      
      console.log('Executing scheduled retention policies...');
      
      // Get active retention policies
      const policies = await this.db
        .select()
        .from(auditRetentionPolicies)
        .where(eq(auditRetentionPolicies.isActive, true));
      
      if (policies.length === 0) {
        console.log('No active retention policies found');
        return;
      }
      
      let totalDeleted = 0;
      
      // Process each policy
      for (const policy of policies) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
        
        // Build the conditions for events that should be deleted
        const conditions = [
          lte(auditEvents.timestamp, cutoffDate),
          eq(auditEvents.retain, false) // Don't delete events marked for retention
        ];
        
        // Add resource type filter
        if (policy.resourceTypes && policy.resourceTypes.length > 0) {
          conditions.push(inArray(auditEvents.resourceType, policy.resourceTypes));
        }
        
        // Add action filter
        if (policy.actions && policy.actions.length > 0) {
          conditions.push(inArray(auditEvents.action, policy.actions));
        }
        
        // Count events to be deleted
        const countResult = await this.db
          .select({ count: sql`count(*)` })
          .from(auditEvents)
          .where(and(...conditions));
        
        const eventsToDelete = parseInt(countResult[0].count);
        
        if (eventsToDelete > 0) {
          try {
            // Delete events
            const deleteResult = await this.db
              .delete(auditEvents)
              .where(and(...conditions));
            
            console.log(`Policy '${policy.name}': Deleted ${eventsToDelete} events older than ${cutoffDate.toISOString()}`);
            totalDeleted += eventsToDelete;
          } catch (e) {
            console.error(`Error executing retention policy '${policy.name}':`, e);
          }
        } else {
          console.log(`Policy '${policy.name}': No events to delete`);
        }
      }
      
      console.log(`Retention policy execution completed: ${totalDeleted} total events deleted`);
      
      // Log the retention execution as an audit event
      await this.db.insert(auditEvents).values({
        timestamp: new Date(),
        service: 'audit-service',
        resourceType: 'system',
        resourceId: null,
        action: 'retention',
        status: 'success',
        description: `Executed retention policies: ${totalDeleted} events deleted`,
        metadata: {
          policiesExecuted: policies.length,
          totalEventsDeleted: totalDeleted
        }
      });
    } catch (error) {
      console.error('Error executing scheduled retention policies:', error);
      
      // Log the error as an audit event
      if (this.db) {
        try {
          await this.db.insert(auditEvents).values({
            timestamp: new Date(),
            service: 'audit-service',
            resourceType: 'system',
            resourceId: null,
            action: 'retention',
            status: 'failure',
            description: `Failed to execute retention policies: ${error.message}`,
            metadata: {
              errorName: error.name,
              errorMessage: error.message,
              errorStack: this.environment !== 'production' ? error.stack : undefined
            }
          });
        } catch (e) {
          console.error('Failed to log retention policy error:', e);
        }
      }
    }
  }
  
  /**
   * Get audit statistics
   */
  private async getStatistics(req: Request, res: Response): Promise<void> {
    if (!this.db) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
      
      const dateConditions = [];
      
      if (startDate) {
        dateConditions.push(gte(auditEvents.timestamp, startDate));
      }
      
      if (endDate) {
        dateConditions.push(lte(auditEvents.timestamp, endDate));
      }
      
      const dateFilter = dateConditions.length > 0 ? and(...dateConditions) : undefined;
      
      // Get total event count
      const totalCountQuery = dateFilter ?
        this.db.select({ count: sql`count(*)` }).from(auditEvents).where(dateFilter) :
        this.db.select({ count: sql`count(*)` }).from(auditEvents);
      
      const totalCountResult = await totalCountQuery;
      const totalCount = parseInt(totalCountResult[0].count);
      
      // Get event count by status
      const statusCountQuery = this.db
        .select({
          status: auditEvents.status,
          count: sql`count(*)`,
        })
        .from(auditEvents);
      
      if (dateFilter) {
        statusCountQuery.where(dateFilter);
      }
      
      const statusCounts = await statusCountQuery.groupBy(auditEvents.status);
      
      // Get event count by resource type
      const resourceTypeCountQuery = this.db
        .select({
          resourceType: auditEvents.resourceType,
          count: sql`count(*)`,
        })
        .from(auditEvents);
      
      if (dateFilter) {
        resourceTypeCountQuery.where(dateFilter);
      }
      
      const resourceTypeCounts = await resourceTypeCountQuery.groupBy(auditEvents.resourceType);
      
      // Get event count by action
      const actionCountQuery = this.db
        .select({
          action: auditEvents.action,
          count: sql`count(*)`,
        })
        .from(auditEvents);
      
      if (dateFilter) {
        actionCountQuery.where(dateFilter);
      }
      
      const actionCounts = await actionCountQuery.groupBy(auditEvents.action);
      
      // Get event count by service
      const serviceCountQuery = this.db
        .select({
          service: auditEvents.service,
          count: sql`count(*)`,
        })
        .from(auditEvents);
      
      if (dateFilter) {
        serviceCountQuery.where(dateFilter);
      }
      
      const serviceCounts = await serviceCountQuery.groupBy(auditEvents.service);
      
      // Get count of data changes
      const dataChangesCountQuery = dateFilter ?
        this.db
          .select({ count: sql`count(*)` })
          .from(auditDataChanges)
          .innerJoin(auditEvents, eq(auditDataChanges.auditEventId, auditEvents.id))
          .where(dateFilter) :
        this.db.select({ count: sql`count(*)` }).from(auditDataChanges);
      
      const dataChangesCountResult = await dataChangesCountQuery;
      const dataChangesCount = parseInt(dataChangesCountResult[0].count);
      
      // Get count of access records
      const accessCountQuery = dateFilter ?
        this.db
          .select({ count: sql`count(*)` })
          .from(auditAccess)
          .innerJoin(auditEvents, eq(auditAccess.auditEventId, auditEvents.id))
          .where(dateFilter) :
        this.db.select({ count: sql`count(*)` }).from(auditAccess);
      
      const accessCountResult = await accessCountQuery;
      const accessCount = parseInt(accessCountResult[0].count);
      
      // Get events by time (daily for the past 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      const timeSeriesQuery = this.db
        .select({
          date: sql`date_trunc('day', timestamp)`,
          count: sql`count(*)`,
        })
        .from(auditEvents)
        .where(gte(auditEvents.timestamp, thirtyDaysAgo))
        .groupBy(sql`date_trunc('day', timestamp)`)
        .orderBy(sql`date_trunc('day', timestamp)`);
      
      const timeSeries = await timeSeriesQuery;
      
      // Format and return statistics
      const statistics = {
        totalEvents: totalCount,
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        byResourceType: resourceTypeCounts.reduce((acc, item) => {
          acc[item.resourceType] = parseInt(item.count);
          return acc;
        }, {}),
        byAction: actionCounts.reduce((acc, item) => {
          acc[item.action] = parseInt(item.count);
          return acc;
        }, {}),
        byService: serviceCounts.reduce((acc, item) => {
          acc[item.service] = parseInt(item.count);
          return acc;
        }, {}),
        dataChanges: dataChangesCount,
        accessRecords: accessCount,
        timeSeries: timeSeries.map(item => ({
          date: item.date,
          count: parseInt(item.count)
        })),
        filters: {
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null
        }
      };
      
      res.json(statistics);
    } catch (error) {
      console.error('Error getting audit statistics:', error);
      res.status(500).json({ error: 'Failed to get audit statistics', message: error.message });
    }
  }
}

// Create and start the service if this file is run directly
if (require.main === module) {
  const port = parseInt(process.env.PORT || '4000');
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;
  const environment = process.env.NODE_ENV || 'development';
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  const service = new AuditService({
    port,
    environment,
    databaseUrl,
    redisUrl
  });
  
  service.start()
    .then(() => {
      console.log(`Audit Service started successfully on port ${port}`);
    })
    .catch(err => {
      console.error('Failed to start Audit Service:', err);
      process.exit(1);
    });
}