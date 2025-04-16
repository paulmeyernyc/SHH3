/**
 * Token Service
 * 
 * Service for managing JWT tokens including generation, validation,
 * and revocation of access and refresh tokens.
 */

import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import { AppError } from '../../../common/error/app-error';
import { ErrorCode } from '../../../common/error/error-types';
import { EncryptionService } from './encryption-service';
import {
  User,
  TokenType,
  TokenClaims,
  TokenResponse,
  Session,
  TokenInfo
} from '../model';

// Promisify JWT functions
const jwtVerify = promisify<string, string, jwt.VerifyOptions, jwt.JwtPayload>(jwt.verify);
const jwtSign = promisify<object, string, jwt.SignOptions, string>(jwt.sign);

/**
 * Token configuration
 */
interface TokenConfig {
  /**
   * Secret key for signing tokens
   */
  secretKey: string;
  
  /**
   * Access token configuration
   */
  accessToken: {
    /**
     * Expiration time in seconds
     */
    expiresIn: number;
    
    /**
     * Algorithm to use
     */
    algorithm?: jwt.Algorithm;
    
    /**
     * Issuer
     */
    issuer?: string;
    
    /**
     * Audience
     */
    audience?: string;
  };
  
  /**
   * Refresh token configuration
   */
  refreshToken: {
    /**
     * Expiration time in seconds
     */
    expiresIn: number;
    
    /**
     * Algorithm to use
     */
    algorithm?: jwt.Algorithm;
    
    /**
     * Issuer
     */
    issuer?: string;
    
    /**
     * Audience
     */
    audience?: string;
  };
}

/**
 * Token verification options
 */
interface TokenVerifyOptions {
  /**
   * Token type
   */
  type: TokenType;
  
  /**
   * Skip expiration check
   */
  ignoreExpiration?: boolean;
  
  /**
   * Issuer
   */
  issuer?: string;
  
  /**
   * Audience
   */
  audience?: string;
}

/**
 * Token service
 */
export class TokenService {
  private readonly encryptionService: EncryptionService;
  private readonly config: TokenConfig;
  private readonly activeSessions: Map<string, Session> = new Map();
  private readonly blacklistedTokens: Map<string, number> = new Map();
  
  constructor(encryptionService: EncryptionService, config: TokenConfig) {
    this.encryptionService = encryptionService;
    this.config = config;
    
    // Schedule cleanup of expired blacklisted tokens
    setInterval(() => this.cleanupBlacklistedTokens(), 3600000); // Every hour
  }
  
  /**
   * Generate an access token for a user
   */
  async generateAccessToken(user: User, sessionId: string): Promise<string> {
    // Create payload
    const payload: TokenClaims = {
      sub: user.id,
      roles: user.roles,
      permissions: user.permissions,
      type: TokenType.ACCESS,
      jti: await this.encryptionService.generateRandomToken(16),
      sid: sessionId,
      // Add other user attributes if needed
    };
    
    // Sign token
    const token = await jwtSign(
      payload,
      this.config.secretKey,
      {
        expiresIn: this.config.accessToken.expiresIn,
        algorithm: this.config.accessToken.algorithm || 'HS256',
        issuer: this.config.accessToken.issuer,
        audience: this.config.accessToken.audience
      }
    );
    
    return token;
  }
  
  /**
   * Generate a refresh token for a user
   */
  async generateRefreshToken(user: User, sessionId: string): Promise<string> {
    // Create payload
    const payload: TokenClaims = {
      sub: user.id,
      type: TokenType.REFRESH,
      jti: await this.encryptionService.generateRandomToken(16),
      sid: sessionId
    };
    
    // Sign token
    const token = await jwtSign(
      payload,
      this.config.secretKey,
      {
        expiresIn: this.config.refreshToken.expiresIn,
        algorithm: this.config.refreshToken.algorithm || 'HS256',
        issuer: this.config.refreshToken.issuer,
        audience: this.config.refreshToken.audience
      }
    );
    
    return token;
  }
  
  /**
   * Generate both access and refresh tokens for a user
   */
  async generateTokenPair(user: User, ipAddress: string, userAgent: string): Promise<TokenResponse> {
    // Create session
    const sessionId = await this.encryptionService.generateUuid();
    const now = new Date();
    
    const session: Session = {
      id: sessionId,
      userId: user.id,
      ipAddress,
      userAgent,
      lastActive: now,
      expiresAt: new Date(now.getTime() + this.config.refreshToken.expiresIn * 1000),
      createdAt: now
    };
    
    // Store session
    this.activeSessions.set(sessionId, session);
    
    // Generate tokens
    const accessToken = await this.generateAccessToken(user, sessionId);
    const refreshToken = await this.generateRefreshToken(user, sessionId);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessToken.expiresIn,
      tokenType: 'Bearer'
    };
  }
  
  /**
   * Verify a token
   */
  async verifyToken(token: string, options: TokenVerifyOptions): Promise<TokenClaims> {
    try {
      // Check if token is blacklisted
      if (this.blacklistedTokens.has(token)) {
        throw new AppError(
          'Token has been revoked',
          401,
          { code: ErrorCode.UNAUTHORIZED }
        );
      }
      
      // Verify token
      const payload = await jwtVerify(
        token,
        this.config.secretKey,
        {
          algorithms: [this.config.accessToken.algorithm || 'HS256'],
          ignoreExpiration: options.ignoreExpiration || false,
          issuer: options.issuer || this.config.accessToken.issuer,
          audience: options.audience || this.config.accessToken.audience
        }
      );
      
      // Check token type
      if (payload.type !== options.type) {
        throw new AppError(
          'Invalid token type',
          401,
          { code: ErrorCode.UNAUTHORIZED }
        );
      }
      
      // Check if session exists for refresh tokens
      if (options.type === TokenType.REFRESH) {
        const session = this.activeSessions.get(payload.sid as string);
        
        if (!session) {
          throw new AppError(
            'Session not found or expired',
            401,
            { code: ErrorCode.UNAUTHORIZED }
          );
        }
        
        // Update session last active time
        session.lastActive = new Date();
        this.activeSessions.set(payload.sid as string, session);
      }
      
      return payload as TokenClaims;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(
          'Token has expired',
          401,
          { code: ErrorCode.UNAUTHORIZED }
        );
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(
          'Invalid token',
          401,
          { code: ErrorCode.UNAUTHORIZED }
        );
      }
      
      throw new AppError(
        'Token verification failed',
        401,
        { code: ErrorCode.UNAUTHORIZED, cause: error }
      );
    }
  }
  
  /**
   * Revoke a specific token
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      // Decode token without verification to get expiration time
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      
      if (!decoded || !decoded.exp) {
        return false;
      }
      
      // Add to blacklist with expiration time
      const expirationTime = decoded.exp;
      this.blacklistedTokens.set(token, expirationTime);
      
      // If it's a refresh token, revoke the session
      if (decoded.type === TokenType.REFRESH && decoded.sid) {
        this.activeSessions.delete(decoded.sid as string);
      }
      
      return true;
    } catch (error) {
      console.error('Token revocation failed:', error);
      return false;
    }
  }
  
  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    return this.activeSessions.delete(sessionId);
  }
  
  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    let count = 0;
    
    // Find all sessions for the user
    for (const [sid, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.activeSessions.delete(sid);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Get token info
   */
  async getTokenInfo(token: string): Promise<TokenInfo> {
    try {
      // Decode token without verification
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      
      if (!decoded) {
        throw new AppError('Invalid token format', 400, { code: ErrorCode.INVALID_INPUT });
      }
      
      // Check if token is blacklisted
      const isRevoked = this.blacklistedTokens.has(token);
      
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      const isExpired = decoded.exp !== undefined && decoded.exp < now;
      
      return {
        jti: decoded.jti as string,
        sub: decoded.sub as string,
        type: decoded.type as TokenType,
        issuedAt: new Date((decoded.iat || 0) * 1000),
        expiresAt: new Date((decoded.exp || 0) * 1000),
        isRevoked,
        isExpired
      };
    } catch (error) {
      throw new AppError('Failed to get token info', 400, { code: ErrorCode.INVALID_INPUT, cause: error });
    }
  }
  
  /**
   * Rotate refresh token (revoke old and generate new)
   */
  async rotateRefreshToken(refreshToken: string, ipAddress: string, userAgent: string): Promise<TokenResponse> {
    try {
      // Verify refresh token
      const claims = await this.verifyToken(refreshToken, { type: TokenType.REFRESH });
      
      // Get session
      const sessionId = claims.sid as string;
      const session = this.activeSessions.get(sessionId);
      
      if (!session) {
        throw new AppError('Session not found', 401, { code: ErrorCode.UNAUTHORIZED });
      }
      
      // Update session
      session.ipAddress = ipAddress;
      session.userAgent = userAgent;
      session.lastActive = new Date();
      this.activeSessions.set(sessionId, session);
      
      // Revoke old token
      await this.revokeToken(refreshToken);
      
      // Create user stub for token generation
      const user = {
        id: claims.sub as string,
        roles: claims.roles as string[] || [],
        permissions: claims.permissions as string[] || []
      } as User;
      
      // Generate new tokens
      const accessToken = await this.generateAccessToken(user, sessionId);
      const newRefreshToken = await this.generateRefreshToken(user, sessionId);
      
      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.config.accessToken.expiresIn,
        tokenType: 'Bearer'
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Token rotation failed', 401, { code: ErrorCode.UNAUTHORIZED, cause: error });
    }
  }
  
  /**
   * Get active session by ID
   */
  getSessionById(sessionId: string): Session | undefined {
    return this.activeSessions.get(sessionId);
  }
  
  /**
   * Get all active sessions for a user
   */
  getSessionsByUserId(userId: string): Session[] {
    const sessions: Session[] = [];
    
    for (const session of this.activeSessions.values()) {
      if (session.userId === userId) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }
  
  /**
   * Clean up expired blacklisted tokens
   */
  private cleanupBlacklistedTokens(): void {
    const now = Math.floor(Date.now() / 1000);
    
    for (const [token, expiration] of this.blacklistedTokens.entries()) {
      if (expiration < now) {
        this.blacklistedTokens.delete(token);
      }
    }
  }
}