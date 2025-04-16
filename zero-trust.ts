import { Request, Response, NextFunction } from 'express';
import { createHash, createHmac, timingSafeEqual } from 'crypto';

/**
 * Risk level for access decisions
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  factors: string[];
}

/**
 * Authentication context to be evaluated
 */
export interface AuthContext {
  userId?: number;
  username?: string;
  role?: string;
  clientIp: string;
  userAgent: string;
  timestamp: Date;
  geoLocation?: string;
  deviceId?: string;
  previousLoginTime?: Date;
  knownDevice?: boolean;
}

/**
 * Risk threshold configuration
 */
const RISK_THRESHOLDS = {
  [RiskLevel.LOW]: 30,
  [RiskLevel.MEDIUM]: 60,
  [RiskLevel.HIGH]: 80,
  [RiskLevel.CRITICAL]: 95
};

/**
 * Request integrity verification configuration
 */
interface RequestVerificationConfig {
  enabled: boolean;
  headerName: string;
  secret: string;
  algorithm: string;
  maxRequestAge: number; // in seconds
}

/**
 * Default config for request verification
 */
const DEFAULT_REQUEST_VERIFICATION: RequestVerificationConfig = {
  enabled: true,
  headerName: 'x-signature',
  secret: process.env.REQUEST_SIGNING_SECRET || 'dev-secret-key',
  algorithm: 'sha256',
  maxRequestAge: 300 // 5 minutes
};

/**
 * Calculate risk score based on authentication context
 */
export function calculateRiskScore(context: AuthContext): RiskAssessment {
  const factors: string[] = [];
  let score = 0;
  
  // Unknown device increases risk
  if (!context.knownDevice) {
    score += 30;
    factors.push('unknown_device');
  }
  
  // Check for unusual IP or geo location
  // This would typically involve IP reputation checks and geo-anomaly detection
  // For demonstration, we're just adding placeholder logic
  if (context.clientIp.startsWith('10.') || context.clientIp.startsWith('192.168.')) {
    score -= 10; // Internal network reduces risk
    factors.push('internal_network');
  } else {
    score += 10;
    factors.push('external_network');
  }
  
  // Time-based risk analysis
  const currentHour = context.timestamp.getHours();
  if (currentHour < 7 || currentHour > 22) {
    score += 15; // Outside normal business hours
    factors.push('unusual_time');
  }
  
  // Unusual user agent
  if (context.userAgent.includes('curl') || 
      context.userAgent.includes('Postman') ||
      context.userAgent.toLowerCase().includes('bot')) {
    score += 25;
    factors.push('suspicious_user_agent');
  }
  
  // Previous login time proximity
  if (context.previousLoginTime) {
    const timeDiff = context.timestamp.getTime() - context.previousLoginTime.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff < 1) {
      score -= 10; // Recent login reduces risk
      factors.push('recent_login');
    }
  } else {
    score += 10; // No previous login recorded
    factors.push('no_previous_login');
  }
  
  // Determine risk level based on score
  let level = RiskLevel.LOW;
  if (score >= RISK_THRESHOLDS[RiskLevel.CRITICAL]) {
    level = RiskLevel.CRITICAL;
  } else if (score >= RISK_THRESHOLDS[RiskLevel.HIGH]) {
    level = RiskLevel.HIGH;
  } else if (score >= RISK_THRESHOLDS[RiskLevel.MEDIUM]) {
    level = RiskLevel.MEDIUM;
  }
  
  return {
    level,
    score,
    factors
  };
}

/**
 * Extract authentication context from request
 */
function extractAuthContext(req: Request): AuthContext {
  return {
    userId: req.user?.id,
    username: req.user?.username,
    role: req.user?.role,
    clientIp: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
    timestamp: new Date(),
    // In a real implementation, these would be populated from user profiles or device tracking
    knownDevice: false,
    previousLoginTime: undefined
  };
}

/**
 * Context-aware authentication middleware
 * Implements adaptive authentication based on risk assessment
 */
export function contextAwareAuth(
  options: { 
    requireMfaForRisk?: RiskLevel,
    blockRiskLevel?: RiskLevel,
    bypassRoles?: string[]
  } = {}
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if not authenticated
    if (!req.isAuthenticated()) {
      return next();
    }
    
    // Check for role-based bypass
    if (options.bypassRoles && req.user?.role && 
        options.bypassRoles.includes(req.user.role)) {
      return next();
    }
    
    // Extract and assess context
    const context = extractAuthContext(req);
    const riskAssessment = calculateRiskPolicy(context);
    
    // Store the assessment on the request for later use
    req.riskAssessment = riskAssessment;
    
    // Block if risk is too high
    if (options.blockRiskLevel && 
        getRiskLevelValue(riskAssessment.level) >= getRiskLevelValue(options.blockRiskLevel)) {
      return res.status(403).json({
        error: 'Access denied due to high risk score',
        riskLevel: riskAssessment.level,
        factors: riskAssessment.factors
      });
    }
    
    // Require additional authentication if risk above threshold
    if (options.requireMfaForRisk && 
        getRiskLevelValue(riskAssessment.level) >= getRiskLevelValue(options.requireMfaForRisk)) {
      
      // Check if MFA was already completed for this session
      if (req.session?.mfaVerified) {
        return next();
      }
      
      return res.status(401).json({
        error: 'Additional authentication required',
        authType: 'mfa',
        riskLevel: riskAssessment.level
      });
    }
    
    next();
  };
}

/**
 * Convert risk level to numeric value for comparison
 */
function getRiskLevelValue(level: RiskLevel): number {
  switch (level) {
    case RiskLevel.LOW: return 1;
    case RiskLevel.MEDIUM: return 2;
    case RiskLevel.HIGH: return 3;
    case RiskLevel.CRITICAL: return 4;
    default: return 0;
  }
}

/**
 * Apply risk policy to an auth context
 */
function calculateRiskPolicy(context: AuthContext): RiskAssessment {
  return calculateRiskScore(context);
}

/**
 * Generate a request signature for verification
 */
function generateRequestSignature(
  req: Request, 
  config: RequestVerificationConfig = DEFAULT_REQUEST_VERIFICATION
): string {
  const timestamp = Date.now().toString();
  const method = req.method;
  const path = req.path;
  const body = JSON.stringify(req.body) || '';
  
  const data = `${timestamp}:${method}:${path}:${body}`;
  const hmac = createHmac(config.algorithm, config.secret);
  
  return `${timestamp}:${hmac.update(data).digest('hex')}`;
}

/**
 * Verify a request signature
 */
function verifyRequestSignature(
  signature: string,
  req: Request,
  config: RequestVerificationConfig = DEFAULT_REQUEST_VERIFICATION
): boolean {
  try {
    const [timestamp, hash] = signature.split(':');
    const timestampNum = parseInt(timestamp, 10);
    
    // Check if request is too old
    const now = Date.now();
    const requestAge = (now - timestampNum) / 1000;
    
    if (requestAge > config.maxRequestAge) {
      console.warn(`Request too old: ${requestAge} seconds`);
      return false;
    }
    
    // Regenerate the expected signature
    const method = req.method;
    const path = req.path;
    const body = JSON.stringify(req.body) || '';
    
    const data = `${timestamp}:${method}:${path}:${body}`;
    const hmac = createHmac(config.algorithm, config.secret);
    const expectedHash = hmac.update(data).digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    const hashBuffer = Buffer.from(hash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    
    return hashBuffer.length === expectedBuffer.length && 
           timingSafeEqual(hashBuffer, expectedBuffer);
  } catch (error) {
    console.error('Error verifying request signature:', error);
    return false;
  }
}

/**
 * Request integrity verification middleware
 */
export function verifyRequestIntegrity(
  config: RequestVerificationConfig = DEFAULT_REQUEST_VERIFICATION
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip verification if disabled
    if (!config.enabled) {
      return next();
    }
    
    // Skip for non-mutating operations in development
    if (process.env.NODE_ENV === 'development' && req.method === 'GET') {
      return next();
    }
    
    const signature = req.headers[config.headerName.toLowerCase()] as string;
    
    if (!signature) {
      if (process.env.NODE_ENV === 'development') {
        // In development, generate and log expected signature
        const expectedSignature = generateRequestSignature(req, config);
        console.log(`Missing signature. Expected: ${expectedSignature}`);
        console.log(`Add header: ${config.headerName}: ${expectedSignature}`);
        return next();
      }
      
      return res.status(401).json({ error: 'Missing request signature' });
    }
    
    if (!verifyRequestSignature(signature, req, config)) {
      return res.status(401).json({ error: 'Invalid request signature' });
    }
    
    next();
  };
}

/**
 * Per-request authorization middleware
 * Verifies specific permissions for each API endpoint
 */
export function authorizeRequest(
  requiredPermission: string | string[],
  options: { 
    allowRoles?: string[],
    denyRoles?: string[],
    resourceIdParam?: string
  } = {}
) {
  const permissions = Array.isArray(requiredPermission) 
    ? requiredPermission 
    : [requiredPermission];
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if not authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user?.role || '';
    
    // Role-based checks
    if (options.denyRoles && options.denyRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied by role' });
    }
    
    if (options.allowRoles && options.allowRoles.includes(userRole)) {
      return next();
    }
    
    // In a real implementation, this would check a permissions database
    // For now, we'll use a simplified approach based on roles
    
    // Check if user has required permissions
    const hasPermission = permissions.some(perm => {
      // Simple role-based permission mapping
      if (userRole === 'admin') return true;
      if (userRole === 'provider' && perm.startsWith('provider:')) return true;
      if (userRole === 'patient' && perm.startsWith('patient:')) return true;
      
      return false;
    });
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissions
      });
    }
    
    // Resource-level authorization
    if (options.resourceIdParam) {
      const resourceId = req.params[options.resourceIdParam];
      
      // In a real implementation, check if user can access this specific resource
      // This would involve querying a permissions or ownership database
      
      // For now, we'll just let it pass
    }
    
    next();
  };
}