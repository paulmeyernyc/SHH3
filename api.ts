/**
 * Service Registry API
 * 
 * Provides API endpoints for service registration and discovery.
 */

import express, { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { rateLimit } from 'express-rate-limit';
import { ServiceInstance, ServiceRegistration, ServiceStatus, ServiceQuery, ServiceRegistrationSchema, Heartbeat } from './model';

const router = express.Router();

// Apply rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// In-memory storage for services
const services: Map<string, ServiceInstance> = new Map();

// Apply rate limiting to all routes
router.use(apiLimiter);

/**
 * Register a service
 * POST /registry/services
 */
router.post('/services', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validationResult = ServiceRegistrationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation Error', 
        details: validationResult.error.errors 
      });
    }
    
    const serviceReg: ServiceRegistration = validationResult.data;
    
    // Create service instance
    const id = nanoid();
    const now = new Date().toISOString();
    
    const service: ServiceInstance = {
      ...serviceReg,
      id,
      status: ServiceStatus.STARTING,
      lastUpdated: now,
      registered: now,
      weight: serviceReg.weight || 1, // Ensure weight has a default value
    };
    
    // Store service
    services.set(id, service);
    
    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
});

/**
 * Get all services
 * GET /registry/services
 */
router.get('/services', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract query parameters to filter services
    const query: ServiceQuery = {};
    
    if (req.query.name) query.name = req.query.name as string;
    if (req.query.version) query.version = req.query.version as string;
    if (req.query.type) query.type = req.query.type as any;
    if (req.query.status) query.status = req.query.status as any;
    if (req.query.path) query.path = req.query.path as string;
    if (req.query.active !== undefined) query.active = req.query.active === 'true';
    if (req.query.tags) {
      const tagsStr = req.query.tags as string;
      query.tags = tagsStr.split(',');
    }
    
    // Filter services by query
    const serviceList = Array.from(services.values()).filter(service => {
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
    
    res.json(serviceList);
  } catch (error) {
    next(error);
  }
});

/**
 * Get a service by ID
 * GET /registry/services/:id
 */
router.get('/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = services.get(req.params.id);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    next(error);
  }
});

/**
 * Update service heartbeat
 * PUT /registry/services/:id/heartbeat
 */
router.put('/services/:id/heartbeat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = services.get(req.params.id);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Validate heartbeat payload
    const heartbeat: Heartbeat = req.body;
    
    if (!heartbeat.status) {
      return res.status(400).json({ error: 'Missing status in heartbeat' });
    }
    
    // Update service
    service.status = heartbeat.status;
    service.lastUpdated = new Date().toISOString();
    
    // Store any additional details if provided
    if (heartbeat.details) {
      service.metadata = {
        ...service.metadata,
        heartbeatDetails: heartbeat.details
      };
    }
    
    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

/**
 * Update a service
 * PUT /registry/services/:id
 */
router.put('/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = services.get(req.params.id);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Validate request body
    const validationResult = ServiceRegistrationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation Error', 
        details: validationResult.error.errors 
      });
    }
    
    const serviceReg: ServiceRegistration = validationResult.data;
    
    // Update service
    const updatedService: ServiceInstance = {
      ...serviceReg,
      id: service.id,
      status: service.status,
      lastUpdated: new Date().toISOString(),
      registered: service.registered,
      weight: serviceReg.weight || service.weight,
    };
    
    // Store updated service
    services.set(service.id, updatedService);
    
    res.json(updatedService);
  } catch (error) {
    next(error);
  }
});

/**
 * Deregister a service
 * DELETE /registry/services/:id
 */
router.delete('/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exists = services.has(req.params.id);
    
    if (!exists) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Remove service
    services.delete(req.params.id);
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/**
 * Service registry health check
 * GET /registry/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    timestamp: new Date(),
    name: 'service-registry',
    version: '1.0.0',
    services: services.size
  });
});

export default router;