/**
 * Authorization Middleware
 * 
 * Middleware for authorizing users based on roles and permissions.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-service';
import { AppError } from '../../../common/error/app-error';
import { ErrorCode } from '../../../common/error/error-types';
import { User } from '../model';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
      resourceId?: string;
      resourceType?: string;
      action?: string;
    }
  }
}

/**
 * Authorization middleware options
 */
export interface AuthorizationOptions {
  /**
   * Required roles (any of these)
   */
  roles?: string[];
  
  /**
   * Required permissions (any of these)
   */
  permissions?: string[];
  
  /**
   * Resource type
   */
  resourceType?: string;
  
  /**
   * Action on resource
   */
  action?: string;
  
  /**
   * Resource ID parameter name
   */
  resourceIdParam?: string;
  
  /**
   * Check ownership of resource
   */
  checkOwnership?: boolean;
  
  /**
   * Required resource access level
   */
  requiredAccessLevel?: string;
  
  /**
   * Whether to check resource access
   */
  checkResourceAccess?: boolean;
  
  /**
   * Rate limit by IP
   */
  rateLimit?: {
    /**
     * Max requests
     */
    maxRequests: number;
    
    /**
     * Window in seconds
     */
    windowInSeconds: number;
    
    /**
     * Message to show when rate limited
     */
    message?: string;
  };
}

/**
 * Authorization middleware implementation
 */
export class AuthorizationMiddleware {
  private authService: AuthService;
  private rateLimits: Map<string, { count: number, resetAt: number }> = new Map();
  
  constructor(authService: AuthService) {
    this.authService = authService;
  }
  
  /**
   * Authorize based on roles
   */
  hasRoles(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new AppError(
            'Authentication required',
            401,
            { code: ErrorCode.UNAUTHORIZED }
          );
        }
        
        // Check if user has any of the required roles
        const hasRequiredRole = roles.some(role => req.user!.roles.includes(role));
        
        if (!hasRequiredRole) {
          throw new AppError(
            'Insufficient role privileges',
            403,
            { code: ErrorCode.FORBIDDEN }
          );
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Authorize based on permissions
   */
  hasPermissions(permissions: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new AppError(
            'Authentication required',
            401,
            { code: ErrorCode.UNAUTHORIZED }
          );
        }
        
        // Check if user has any of the required permissions
        const hasRequiredPermission = permissions.some(permission => 
          req.user!.permissions.includes(permission)
        );
        
        if (!hasRequiredPermission) {
          throw new AppError(
            'Insufficient permissions',
            403,
            { code: ErrorCode.FORBIDDEN }
          );
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Authorize based on resource access
   */
  hasResourceAccess(resourceType: string, action: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new AppError(
            'Authentication required',
            401,
            { code: ErrorCode.UNAUTHORIZED }
          );
        }
        
        // Get resource ID from request
        const resourceId = this.getResourceIdFromRequest(req);
        
        // Attach resource info to request
        req.resourceType = resourceType;
        req.action = action;
        req.resourceId = resourceId;
        
        // Check if user has access to the resource
        const hasAccess = await this.authService.checkResourceAccess(
          req.user.id,
          resourceType,
          resourceId,
          action
        );
        
        if (!hasAccess) {
          throw new AppError(
            'Access to resource denied',
            403,
            { code: ErrorCode.FORBIDDEN }
          );
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Authorize based on resource ownership
   */
  isResourceOwner(resourceType: string, resourceIdParam: string = 'id') {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new AppError(
            'Authentication required',
            401,
            { code: ErrorCode.UNAUTHORIZED }
          );
        }
        
        // Get resource ID from request
        const resourceId = req.params[resourceIdParam] || req.body.id;
        
        if (!resourceId) {
          throw new AppError(
            'Resource ID not provided',
            400,
            { code: ErrorCode.BAD_REQUEST }
          );
        }
        
        // Check if user owns the resource
        const isOwner = await this.authService.checkResourceOwnership(
          req.user.id,
          resourceType,
          resourceId
        );
        
        if (!isOwner) {
          throw new AppError(
            'You do not have ownership of this resource',
            403,
            { code: ErrorCode.FORBIDDEN }
          );
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Apply rate limiting
   */
  rateLimit(maxRequests: number, windowInSeconds: number, message?: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Math.floor(Date.now() / 1000);
        
        // Get or create rate limit entry
        let rateLimitEntry = this.rateLimits.get(ip);
        if (!rateLimitEntry || now > rateLimitEntry.resetAt) {
          rateLimitEntry = {
            count: 0,
            resetAt: now + windowInSeconds
          };
        }
        
        // Increment count
        rateLimitEntry.count++;
        
        // Update rate limit entry
        this.rateLimits.set(ip, rateLimitEntry);
        
        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rateLimitEntry.count).toString());
        res.setHeader('X-RateLimit-Reset', rateLimitEntry.resetAt.toString());
        
        // Check if rate limited
        if (rateLimitEntry.count > maxRequests) {
          throw new AppError(
            message || 'Rate limit exceeded',
            429,
            { code: ErrorCode.RATE_LIMIT_EXCEEDED }
          );
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Dynamic authorization based on options
   */
  authorize(options: AuthorizationOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check authentication
        if (!req.user) {
          throw new AppError(
            'Authentication required',
            401,
            { code: ErrorCode.UNAUTHORIZED }
          );
        }
        
        // Apply rate limiting if configured
        if (options.rateLimit) {
          const ip = req.ip || req.socket.remoteAddress || 'unknown';
          const now = Math.floor(Date.now() / 1000);
          
          // Get or create rate limit entry
          let rateLimitEntry = this.rateLimits.get(ip);
          if (!rateLimitEntry || now > rateLimitEntry.resetAt) {
            rateLimitEntry = {
              count: 0,
              resetAt: now + options.rateLimit.windowInSeconds
            };
          }
          
          // Increment count
          rateLimitEntry.count++;
          
          // Update rate limit entry
          this.rateLimits.set(ip, rateLimitEntry);
          
          // Add rate limit headers
          res.setHeader('X-RateLimit-Limit', options.rateLimit.maxRequests.toString());
          res.setHeader('X-RateLimit-Remaining', Math.max(0, options.rateLimit.maxRequests - rateLimitEntry.count).toString());
          res.setHeader('X-RateLimit-Reset', rateLimitEntry.resetAt.toString());
          
          // Check if rate limited
          if (rateLimitEntry.count > options.rateLimit.maxRequests) {
            throw new AppError(
              options.rateLimit.message || 'Rate limit exceeded',
              429,
              { code: ErrorCode.RATE_LIMIT_EXCEEDED }
            );
          }
        }
        
        // Check roles if specified
        if (options.roles && options.roles.length > 0) {
          const hasRequiredRole = options.roles.some(role => req.user!.roles.includes(role));
          
          if (!hasRequiredRole) {
            throw new AppError(
              'Insufficient role privileges',
              403,
              { code: ErrorCode.FORBIDDEN }
            );
          }
        }
        
        // Check permissions if specified
        if (options.permissions && options.permissions.length > 0) {
          const hasRequiredPermission = options.permissions.some(permission => 
            req.user!.permissions.includes(permission)
          );
          
          if (!hasRequiredPermission) {
            throw new AppError(
              'Insufficient permissions',
              403,
              { code: ErrorCode.FORBIDDEN }
            );
          }
        }
        
        // Check resource access if specified
        if (options.checkResourceAccess && options.resourceType && options.action) {
          const resourceId = this.getResourceIdFromRequest(req, options.resourceIdParam);
          
          // Attach resource info to request
          req.resourceType = options.resourceType;
          req.action = options.action;
          req.resourceId = resourceId;
          
          const hasAccess = await this.authService.checkResourceAccess(
            req.user.id,
            options.resourceType,
            resourceId,
            options.action
          );
          
          if (!hasAccess) {
            throw new AppError(
              'Access to resource denied',
              403,
              { code: ErrorCode.FORBIDDEN }
            );
          }
        }
        
        // Check resource ownership if specified
        if (options.checkOwnership && options.resourceType) {
          const resourceId = this.getResourceIdFromRequest(req, options.resourceIdParam);
          
          if (!resourceId) {
            throw new AppError(
              'Resource ID not provided',
              400,
              { code: ErrorCode.BAD_REQUEST }
            );
          }
          
          const isOwner = await this.authService.checkResourceOwnership(
            req.user.id,
            options.resourceType,
            resourceId
          );
          
          if (!isOwner) {
            throw new AppError(
              'You do not have ownership of this resource',
              403,
              { code: ErrorCode.FORBIDDEN }
            );
          }
        }
        
        // Get token risks if token is available
        if (req.header('Authorization')) {
          const tokenInfo = await this.authService.getTokenInfo(req.header('Authorization')?.split(' ')[1] || '');
          
          // Check for suspicious activities or token risks
          if (tokenInfo && tokenInfo.riskScore > 0.7) { // Assuming risk score is between 0 and 1
            throw new AppError(
              'Security risk detected',
              403,
              { code: ErrorCode.SECURITY_RISK }
            );
          }
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Get resource ID from request
   */
  private getResourceIdFromRequest(req: Request, paramName: string = 'id'): string {
    // Try to get from route params
    if (req.params && req.params[paramName]) {
      return req.params[paramName];
    }
    
    // Try to get from query params
    if (req.query && req.query[paramName]) {
      return req.query[paramName] as string;
    }
    
    // Try to get from body
    if (req.body && req.body[paramName]) {
      return req.body[paramName];
    }
    
    return '';
  }
}