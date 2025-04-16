/**
 * API Gateway API
 * 
 * Provides API endpoints for managing gateway routes.
 */

import express, { Request, Response, NextFunction } from 'express';
import { RouteConfigSchema } from './model';
import { routeRegistry } from './route-registry';
import { AppError } from '../../common/error/app-error';
import { ErrorCode } from '../../common/error/error-types';

const router = express.Router();

/**
 * Get all routes
 * GET /gateway/routes
 */
router.get('/routes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const routes = await routeRegistry.getAllRoutes();
    res.json(routes);
  } catch (error) {
    next(error);
  }
});

/**
 * Get a route by ID
 * GET /gateway/routes/:id
 */
router.get('/routes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const route = await routeRegistry.getRoute(id);
    
    if (!route) {
      return next(AppError.resourceNotFound('Route', id));
    }
    
    res.json(route);
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new route
 * POST /gateway/routes
 */
router.post('/routes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = RouteConfigSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return next(AppError.validation(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'INVALID_VALUE'
        })),
        'Invalid route configuration'
      ));
    }
    
    const route = await routeRegistry.addRoute(validationResult.data);
    res.status(201).json(route);
  } catch (error) {
    next(error);
  }
});

/**
 * Update a route
 * PUT /gateway/routes/:id
 */
router.put('/routes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validationResult = RouteConfigSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return next(AppError.validation(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'INVALID_VALUE'
        })),
        'Invalid route configuration'
      ));
    }
    
    const route = await routeRegistry.updateRoute(id, validationResult.data);
    
    if (!route) {
      return next(AppError.resourceNotFound('Route', id));
    }
    
    res.json(route);
  } catch (error) {
    next(error);
  }
});

/**
 * Partially update a route
 * PATCH /gateway/routes/:id
 */
router.patch('/routes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // We allow partial updates, so we don't validate the entire object
    const route = await routeRegistry.updateRoute(id, req.body);
    
    if (!route) {
      return next(AppError.resourceNotFound('Route', id));
    }
    
    res.json(route);
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a route
 * DELETE /gateway/routes/:id
 */
router.delete('/routes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const success = await routeRegistry.deleteRoute(id);
    
    if (!success) {
      return next(AppError.resourceNotFound('Route', id));
    }
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/**
 * Gateway health check
 * GET /gateway/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    timestamp: new Date(),
    name: 'api-gateway',
    version: '1.0.0'
  });
});

export default router;