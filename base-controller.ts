/**
 * Base Controller
 * 
 * Base class with common functionality for controllers
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../services/errors';

/**
 * Base controller class
 */
export abstract class BaseController {
  /**
   * Execute a controller action with error handling
   */
  protected async executeAction(
    req: Request, 
    res: Response, 
    next: NextFunction, 
    action: () => Promise<any>
  ) {
    try {
      await action();
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * Send a success response
   */
  protected sendSuccessResponse(
    res: Response, 
    data: any, 
    statusCode: number = 200, 
    message?: string
  ) {
    const response: any = { data };
    
    if (message) {
      response.message = message;
    }
    
    res.status(statusCode).json(response);
  }
  
  /**
   * Send a created response (201)
   */
  protected sendCreatedResponse(res: Response, data: any, message?: string) {
    this.sendSuccessResponse(res, data, 201, message || 'Resource created successfully');
  }
  
  /**
   * Send a no content response (204)
   */
  protected sendNoContentResponse(res: Response) {
    res.status(204).end();
  }
  
  /**
   * Parse pagination parameters from request
   */
  protected getPaginationParams(req: Request): { limit: number; offset: number } {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Validate limit to prevent excessive queries
    const maxLimit = 100;
    if (limit > maxLimit) {
      throw new ValidationError(`Limit cannot exceed ${maxLimit}`);
    }
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    return { limit, offset };
  }
  
  /**
   * Parse sorting parameters from request
   */
  protected getSortingParams(req: Request): { orderBy?: string; order?: 'asc' | 'desc' } {
    const orderBy = req.query.orderBy as string;
    const order = req.query.order as 'asc' | 'desc';
    
    return { 
      orderBy: orderBy || undefined, 
      order: (order === 'asc' || order === 'desc') ? order : undefined 
    };
  }
  
  /**
   * Extract and validate a numeric ID from request parameters
   */
  protected getIdParam(req: Request, paramName: string = 'id'): number {
    const id = parseInt(req.params[paramName]);
    
    if (isNaN(id)) {
      throw new ValidationError(`Invalid ${paramName} parameter`);
    }
    
    return id;
  }
}