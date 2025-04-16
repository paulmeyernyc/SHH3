/**
 * Authentication middleware for document service
 * 
 * Provides request authentication and role-based authorization
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AccessDeniedError } from '../services/errors';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_for_development';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'document-service';
const JWT_ISSUER = process.env.JWT_ISSUER || 'smart-health-hub';

/**
 * Define user roles in the system
 */
export enum UserRole {
  USER = 'user',
  PROVIDER = 'provider',
  ADMIN = 'admin',
  SYSTEM = 'system'
}

/**
 * Extend Express Request type to include user information
 */
declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: number;
        username: string;
        roles: UserRole[];
        organizationId?: number;
        securityContext?: {
          deviceId?: string;
          ipAddress?: string;
          userAgent?: string;
          requestId: string;
          timestamp: number;
          riskScore: number;
        };
        [key: string]: any;
      };
    }
  }
}

/**
 * Authenticate the user via JWT token
 * 
 * Extracts and validates the JWT token from either the
 * Authorization header or a token cookie
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Get token from Authorization header (Bearer token) or from cookie
  const authHeader = req.headers.authorization;
  const tokenCookie = req.cookies?.token;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : tokenCookie;

  if (!token) {
    return next(new AuthenticationError('Authentication required - no token provided'));
  }

  try {
    // Verify the token
    const decoded = verifyToken(token);
    
    // Add user information to request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      roles: decoded.roles || [UserRole.USER], // Default to USER role if none provided
      organizationId: decoded.organizationId,
      ...decoded
    };

    // Add security context for zero-trust security controls
    addSecurityContext(req);
    
    next();
  } catch (error) {
    if ((error as Error).name === 'TokenExpiredError') {
      return next(new AuthenticationError('Token expired'));
    } else if ((error as Error).name === 'JsonWebTokenError') {
      return next(new AuthenticationError('Invalid token'));
    }
    return next(new AuthenticationError(`Authentication failed: ${(error as Error).message}`));
  }
}

/**
 * Require specific roles for access to a route
 * Multiple roles can be specified, user must have at least one
 */
export function requireRoles(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const hasRequiredRole = req.user.roles.some(role => roles.includes(role));
    
    if (!hasRequiredRole) {
      return next(new AccessDeniedError('Insufficient permissions'));
    }
    
    next();
  };
}

/**
 * Middleware to check if user has access to the specific organization
 * Used to restrict access to organization-specific resources
 */
export function checkOrganizationAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  const requestedOrgId = Number(req.params.organizationId || req.query.organizationId);
  
  // Skip check if no organization ID in request
  if (!requestedOrgId) {
    return next();
  }
  
  // Admin and System roles can access any organization
  if (req.user.roles.includes(UserRole.ADMIN) || req.user.roles.includes(UserRole.SYSTEM)) {
    return next();
  }
  
  // Check if user belongs to the requested organization
  if (req.user.organizationId !== requestedOrgId) {
    return next(new AccessDeniedError('You do not have access to this organization'));
  }
  
  next();
}

/**
 * Middleware to check if user owns a resource or has admin rights
 * 
 * Requires a resourceOwnerId to be present in the request.
 * This middleware assumes that the parameter with ownerId is available in req.params
 * (e.g., /documents/:id where the document has an ownerId field)
 */
export function checkResourceOwnership(ownerIdParam: string = 'ownerId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    // Admin and System roles can access any resource
    if (req.user.roles.includes(UserRole.ADMIN) || req.user.roles.includes(UserRole.SYSTEM)) {
      return next();
    }
    
    try {
      // Get the owner ID from the request parameter
      const ownerId = req.params[ownerIdParam] ? Number(req.params[ownerIdParam]) : undefined;
      
      // If no owner ID is found, let the route handler deal with it
      if (!ownerId) {
        return next();
      }
      
      // Check if the user is the owner
      if (req.user.id !== ownerId) {
        return next(new AccessDeniedError('You do not have access to this resource'));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Extract and attach API key information to the request
 * Used for service-to-service authentication
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return next(new AuthenticationError('API key required'));
  }

  try {
    // Verify the API key
    const apiKeyInfo = verifyApiKey(apiKey);
    
    // Assign a system role for API key authentication
    req.user = {
      id: -1, // Use a special ID for system access
      username: apiKeyInfo.serviceName,
      roles: [UserRole.SYSTEM],
      serviceId: apiKeyInfo.serviceId,
      securityContext: {
        requestId: generateRequestId(),
        timestamp: Date.now(),
        riskScore: calculateRiskScore(req),
        ipAddress: req.ip
      }
    };
    
    next();
  } catch (error) {
    next(new AuthenticationError(`Invalid API key: ${(error as Error).message}`));
  }
}

/**
 * Optional authentication - doesn't require auth but attaches user info if present
 * Useful for routes that work differently for authenticated vs. anonymous users
 */
export function optionalAuthentication(req: Request, res: Response, next: NextFunction): void {
  // Get token from Authorization header (Bearer token) or from cookie
  const authHeader = req.headers.authorization;
  const tokenCookie = req.cookies?.token;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : tokenCookie;

  if (!token) {
    // No token provided, continue as unauthenticated
    return next();
  }

  try {
    // Verify the token
    const decoded = verifyToken(token);
    
    // Add user information to request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      roles: decoded.roles || [UserRole.USER],
      organizationId: decoded.organizationId,
      ...decoded
    };

    // Add security context for zero-trust security controls
    addSecurityContext(req);
  } catch (error) {
    // Token is invalid, but we'll continue as unauthenticated
    // since this is optional authentication
  }
  
  next();
}

/**
 * Add security context information to the request
 * This is used for zero-trust security controls and audit logging
 */
function addSecurityContext(req: Request): void {
  if (!req.user) return;
  
  req.user.securityContext = {
    deviceId: req.headers['x-device-id'] as string,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] as string,
    requestId: generateRequestId(),
    timestamp: Date.now(),
    riskScore: calculateRiskScore(req)
  };
}

/**
 * Generate a request ID for tracking
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate a risk score for the request for zero-trust security
 * A higher score indicates higher risk
 */
function calculateRiskScore(req: Request): number {
  let score = 0;
  
  // Check if IP is unusual for the user
  // This would normally check against a database of known IPs
  const isKnownIP = true; // placeholder for actual check
  if (!isKnownIP) {
    score += 50;
  }
  
  // Check if request is coming from an unusual location
  // This would normally use IP geolocation
  const isUnusualLocation = false; // placeholder for actual check
  if (isUnusualLocation) {
    score += 30;
  }
  
  // Check if accessing sensitive resource
  if (req.path.includes('/secure/') || req.path.includes('/admin/')) {
    score += 20;
  }
  
  // Check for unusual user agent
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.includes('curl') || userAgent.includes('Postman')) {
    score += 10;
  }
  
  // Check for strange request patterns
  // This would normally check request frequency, etc.
  const hasStrangePatterns = false; // placeholder for actual check
  if (hasStrangePatterns) {
    score += 40;
  }
  
  return Math.min(score, 100); // Cap at 100
}

/**
 * Helper function to extract user ID from request
 */
export function extractUserId(req: Request): number | undefined {
  return req.user?.id;
}

/**
 * Helper function to extract organization ID from request
 */
export function extractOrganizationId(req: Request): number | undefined {
  return req.user?.organizationId;
}

/**
 * Helper function to extract token from request
 */
function extractTokenFromRequest(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  const tokenCookie = req.cookies?.token;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return tokenCookie;
}

/**
 * Verify JWT token
 */
function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET, {
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER
  }) as jwt.JwtPayload & {
    id: number;
    username: string;
    roles: UserRole[];
    organizationId?: number;
  };
}

/**
 * Verify API key
 */
function verifyApiKey(apiKey: string) {
  // This would normally check against a database of valid API keys
  // For this example, we'll use a simple check
  if (apiKey === 'test-api-key') {
    return {
      serviceId: 'test-service',
      serviceName: 'Test Service',
      permissions: ['read', 'write']
    };
  }
  
  throw new Error('Invalid API key');
}