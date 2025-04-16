/**
 * Authentication Middleware
 * 
 * Middleware for authenticating users based on JWT tokens.
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
      userId?: string;
      isAuthenticated?: () => boolean;
    }
  }
}

/**
 * Authentication middleware options
 */
export interface AuthenticationOptions {
  /**
   * Whether authentication is required
   */
  required?: boolean;
  
  /**
   * Whether to allow API key authentication
   */
  allowApiKey?: boolean;
}

/**
 * Authentication middleware implementation
 */
export class AuthenticationMiddleware {
  private authService: AuthService;
  
  constructor(authService: AuthService) {
    this.authService = authService;
  }
  
  /**
   * Authenticate via JWT token
   */
  authenticateJwt(options: AuthenticationOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = this.extractTokenFromRequest(req);
        
        if (!token) {
          if (options.required) {
            throw new AppError(
              'Authentication required',
              401,
              { code: ErrorCode.UNAUTHORIZED }
            );
          } else {
            return next();
          }
        }
        
        try {
          // Verify token and get payload
          const payload = await this.authService.verifyToken(token);
          
          // Get user from database
          const user = await this.authService.getUserById(payload.sub);
          
          if (!user) {
            throw new AppError(
              'User not found',
              401,
              { code: ErrorCode.UNAUTHORIZED }
            );
          }
          
          // Attach user to request
          this.attachUserToRequest(req, user);
          
          next();
        } catch (error) {
          if (options.required) {
            throw new AppError(
              'Invalid or expired token',
              401,
              { code: ErrorCode.UNAUTHORIZED, cause: error }
            );
          } else {
            next();
          }
        }
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Authenticate via API key
   */
  authenticateApiKey(options: AuthenticationOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const apiKey = req.headers['x-api-key'] as string;
        
        if (!apiKey) {
          if (options.required) {
            throw new AppError(
              'API key required',
              401,
              { code: ErrorCode.UNAUTHORIZED }
            );
          } else {
            return next();
          }
        }
        
        try {
          // Verify API key
          const apiKeyInfo = await this.authService.verifyApiKey(apiKey);
          
          // Get user associated with API key
          const user = await this.authService.getUserById(apiKeyInfo.userId);
          
          if (!user) {
            throw new AppError(
              'User not found',
              401,
              { code: ErrorCode.UNAUTHORIZED }
            );
          }
          
          // Attach user to request
          this.attachUserToRequest(req, user);
          
          // Attach API key info to request
          req.apiKey = apiKeyInfo;
          
          next();
        } catch (error) {
          if (options.required) {
            throw new AppError(
              'Invalid API key',
              401,
              { code: ErrorCode.UNAUTHORIZED, cause: error }
            );
          } else {
            next();
          }
        }
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Authenticate via JWT token or API key
   */
  authenticate(options: AuthenticationOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = this.extractTokenFromRequest(req);
        const apiKey = options.allowApiKey ? req.headers['x-api-key'] as string : undefined;
        
        if (!token && !apiKey) {
          if (options.required) {
            throw new AppError(
              'Authentication required',
              401,
              { code: ErrorCode.UNAUTHORIZED }
            );
          } else {
            return next();
          }
        }
        
        // Try with JWT token first
        if (token) {
          try {
            const payload = await this.authService.verifyToken(token);
            const user = await this.authService.getUserById(payload.sub);
            
            if (user) {
              this.attachUserToRequest(req, user);
              return next();
            }
          } catch (error) {
            // If token authentication failed and API key is not available or not allowed
            if (!apiKey || !options.allowApiKey) {
              if (options.required) {
                throw new AppError(
                  'Invalid or expired token',
                  401,
                  { code: ErrorCode.UNAUTHORIZED, cause: error }
                );
              } else {
                return next();
              }
            }
            // Otherwise, continue to API key authentication
          }
        }
        
        // Try with API key if available and allowed
        if (apiKey && options.allowApiKey) {
          try {
            const apiKeyInfo = await this.authService.verifyApiKey(apiKey);
            const user = await this.authService.getUserById(apiKeyInfo.userId);
            
            if (user) {
              this.attachUserToRequest(req, user);
              req.apiKey = apiKeyInfo;
              return next();
            }
          } catch (error) {
            if (options.required) {
              throw new AppError(
                'Invalid API key',
                401,
                { code: ErrorCode.UNAUTHORIZED, cause: error }
              );
            } else {
              return next();
            }
          }
        }
        
        // If we reached here and authentication is required, but no valid authentication was found
        if (options.required) {
          throw new AppError(
            'Authentication failed',
            401,
            { code: ErrorCode.UNAUTHORIZED }
          );
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Extract JWT token from request
   */
  private extractTokenFromRequest(req: Request): string | undefined {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Check cookie
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }
    
    // Check query parameter
    if (req.query && req.query.token) {
      return req.query.token as string;
    }
    
    return undefined;
  }
  
  /**
   * Get resource from request for authorization
   */
  private getResourceFromRequest(req: Request): string {
    return req.baseUrl.split('/')[1] || '';
  }
  
  /**
   * Get action from request for authorization
   */
  private getActionFromRequest(req: Request): string {
    switch (req.method) {
      case 'GET':
        return 'read';
      case 'POST':
        return 'create';
      case 'PUT':
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'access';
    }
  }
  
  /**
   * Attach user to request
   */
  private attachUserToRequest(req: Request, user: User): void {
    req.user = user;
    req.userId = user.id;
    req.isAuthenticated = () => true;
  }
}