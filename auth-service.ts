/**
 * Authentication Service
 * 
 * Core service for user authentication and authorization.
 */

import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { 
  User, 
  UserStatus, 
  ApiKey, 
  Role, 
  Permission, 
  Session,
  AuthProviderType
} from '../model';
import { IAuthStorage } from '../storage';
import { AppError } from '../../../common/error/app-error';
import { EncryptionService } from './encryption-service';
import { TokenService } from './token-service';
import { MfaService } from './mfa-service';

/**
 * Authentication service configuration
 */
export interface AuthServiceConfig {
  /**
   * Password hashing rounds
   */
  bcryptRounds?: number;
  
  /**
   * Password requirements
   */
  passwordRequirements?: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  
  /**
   * Login failure handling
   */
  loginFailureHandling?: {
    maxAttempts: number;
    lockoutDuration: number; // in seconds
  };
  
  /**
   * Token service configuration
   */
  tokenServiceConfig: {
    jwtSecret: string;
    accessTokenExpiry?: number;
    refreshTokenExpiry?: number;
    issuer?: string;
    audience?: string;
  };
  
  /**
   * Encryption service configuration
   */
  encryptionServiceConfig: {
    secretKey: string;
  };
}

/**
 * User registration data
 */
export interface UserRegistrationData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  attributes?: Record<string, any>;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Login result
 */
export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  requireMfa: boolean;
  mfaMethods?: string[];
}

/**
 * Authentication service
 */
export class AuthService {
  private storage: IAuthStorage;
  private tokenService: TokenService;
  private encryptionService: EncryptionService;
  private mfaService: MfaService;
  private config: AuthServiceConfig;

  constructor(storage: IAuthStorage, config: AuthServiceConfig, mfaService: MfaService) {
    this.storage = storage;
    this.config = {
      bcryptRounds: 10,
      passwordRequirements: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      },
      loginFailureHandling: {
        maxAttempts: 5,
        lockoutDuration: 900 // 15 minutes
      },
      ...config
    };
    
    // Initialize services
    this.tokenService = new TokenService(config.tokenServiceConfig, storage);
    this.encryptionService = new EncryptionService(config.encryptionServiceConfig);
    this.mfaService = mfaService;
  }

  /**
   * Register a new user
   */
  async registerUser(data: UserRegistrationData): Promise<User> {
    // Validate data
    this.validateRegistrationData(data);
    
    // Check if user already exists
    const existingByUsername = await this.storage.getUserByUsername(data.username);
    if (existingByUsername) {
      throw AppError.badRequest('Username already exists');
    }
    
    const existingByEmail = await this.storage.getUserByEmail(data.email);
    if (existingByEmail) {
      throw AppError.badRequest('Email already exists');
    }
    
    // Hash password
    const hashedPassword = await this.hashPassword(data.password);
    
    // Create user
    const user: User = {
      id: nanoid(),
      username: data.username,
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      status: UserStatus.ACTIVE,
      verified: false,
      roles: data.roles || ['user'],
      permissions: [],
      mfaEnabled: false,
      loginAttempts: 0,
      attributes: data.attributes || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return this.storage.createUser(user);
  }

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials, metadata?: { userAgent?: string, ipAddress?: string }): Promise<LoginResult> {
    // Get user
    const user = await this.storage.getUserByUsername(credentials.username);
    if (!user) {
      throw AppError.unauthorized('Invalid username or password');
    }
    
    // Check if account is locked
    if (user.status === UserStatus.LOCKED) {
      const lockUntil = user.lockUntil ? new Date(user.lockUntil).getTime() : 0;
      if (lockUntil > Date.now()) {
        throw AppError.unauthorized('Account is temporarily locked');
      }
      
      // If lockout period has passed, reset the status
      await this.storage.updateUser(user.id, {
        status: UserStatus.ACTIVE,
        lockUntil: undefined,
        loginAttempts: 0
      });
    }
    
    // Verify password
    const isPasswordValid = await this.verifyPassword(credentials.password, user.password);
    if (!isPasswordValid) {
      // Increment login attempts
      await this.handleFailedLogin(user);
      
      throw AppError.unauthorized('Invalid username or password');
    }
    
    // Reset login attempts
    if (user.loginAttempts > 0) {
      await this.storage.updateUser(user.id, {
        loginAttempts: 0,
        lockUntil: undefined
      });
    }
    
    // Update last login
    await this.storage.updateUser(user.id, {
      lastLogin: new Date().toISOString()
    });
    
    // Generate tokens
    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(user, metadata);
    
    return {
      user,
      accessToken,
      refreshToken,
      requireMfa: user.mfaEnabled,
      mfaMethods: user.mfaMethods
    };
  }

  /**
   * Authorize API key
   */
  async authorizeApiKey(apiKey: string, resource: string, action: string): Promise<User> {
    // Get API key
    const key = await this.storage.getApiKeyByValue(apiKey);
    if (!key) {
      throw AppError.unauthorized('Invalid API key');
    }
    
    // Check if expired
    if (key.expiresAt && new Date(key.expiresAt).getTime() < Date.now()) {
      throw AppError.unauthorized('API key has expired');
    }
    
    // Get user
    const user = await this.storage.getUser(key.userId);
    if (!user) {
      throw AppError.resourceNotFound('User', key.userId);
    }
    
    // Check if user account is locked
    if (user.status === UserStatus.LOCKED) {
      throw AppError.unauthorized('User account is locked');
    }
    
    // Check if API key has necessary permissions
    if (key.permissions && key.permissions.length > 0) {
      const hasPermission = await this.hasApiKeyPermission(key, resource, action);
      if (!hasPermission) {
        throw AppError.forbidden('Insufficient permissions');
      }
    }
    
    // Update last used
    await this.storage.updateApiKey(key.id, {
      lastUsed: new Date().toISOString()
    });
    
    return user;
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<boolean> {
    return this.tokenService.revokeRefreshToken(refreshToken);
  }

  /**
   * Verify user token
   */
  async verifyToken(token: string): Promise<User> {
    // Verify token
    const payload = await this.tokenService.verifyAccessToken(token);
    
    // Get user
    const user = await this.storage.getUser(payload.sub);
    if (!user) {
      throw AppError.resourceNotFound('User', payload.sub);
    }
    
    // Check if account is locked
    if (user.status === UserStatus.LOCKED) {
      const lockUntil = user.lockUntil ? new Date(user.lockUntil).getTime() : 0;
      if (lockUntil > Date.now()) {
        throw AppError.unauthorized('Account is temporarily locked');
      }
      
      // If lockout period has passed, reset the status
      await this.storage.updateUser(user.id, {
        status: UserStatus.ACTIVE,
        lockUntil: undefined,
        loginAttempts: 0
      });
    }
    
    return user;
  }

  /**
   * Refresh tokens
   */
  async refreshTokens(refreshToken: string, metadata?: { userAgent?: string, ipAddress?: string }): Promise<{ accessToken: string, refreshToken: string }> {
    try {
      return await this.tokenService.refreshTokens(refreshToken, metadata);
    } catch (error) {
      if (error.code === 'TOKEN_EXPIRED') {
        throw AppError.unauthorized('Refresh token expired');
      } else if (error.code === 'INVALID_TOKEN') {
        throw AppError.unauthorized('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch {
      return false;
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    const rounds = this.config.bcryptRounds || 10;
    const salt = await bcrypt.genSalt(rounds);
    return bcrypt.hash(password, salt);
  }

  /**
   * Check if user has role
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    // Get user
    const user = await this.storage.getUser(userId);
    if (!user) {
      return false;
    }
    
    // Check if user has role directly
    return user.roles.includes(roleName);
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    // Get user
    const user = await this.storage.getUser(userId);
    if (!user) {
      return false;
    }
    
    // Check if user has permission directly
    if (user.permissions && user.permissions.length > 0) {
      // Get permissions from storage
      const permissions = await this.storage.getPermissionsByIds(user.permissions);
      
      // Check if any permission matches
      for (const permission of permissions) {
        if (
          permission.resource === resource &&
          permission.name === action
        ) {
          return true;
        }
      }
    }
    
    // Check if user has permission via roles
    if (user.roles && user.roles.length > 0) {
      return this.hasPermissionViaRoles(user.roles, resource, action);
    }
    
    return false;
  }

  /**
   * Check if API key has permission
   */
  async hasApiKeyPermission(apiKey: ApiKey, resource: string, action: string): Promise<boolean> {
    if (!apiKey.permissions || apiKey.permissions.length === 0) {
      return false;
    }
    
    // Get permissions from storage
    const permissions = await this.storage.getPermissionsByIds(apiKey.permissions);
    
    // Check if any permission matches
    for (const permission of permissions) {
      if (
        permission.resource === resource &&
        permission.name === action
      ) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if roles have permission
   */
  async hasPermissionViaRoles(roleNames: string[], resource: string, action: string): Promise<boolean> {
    // Get roles
    const roles = [];
    for (const roleName of roleNames) {
      const role = await this.storage.getRoleByName(roleName);
      if (role) {
        roles.push(role);
      }
    }
    
    // Check if any role has the permission
    for (const role of roles) {
      if (!role.permissions || role.permissions.length === 0) {
        continue;
      }
      
      // Get permissions from storage
      const permissions = await this.storage.getPermissionsByIds(role.permissions);
      
      // Check if any permission matches
      for (const permission of permissions) {
        if (
          permission.resource === resource &&
          permission.name === action
        ) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Create API key
   */
  async createApiKey(
    userId: string, 
    name: string, 
    permissions: string[] = [], 
    expiresInDays?: number
  ): Promise<{ apiKey: ApiKey, rawKey: string }> {
    // Verify user exists
    const user = await this.storage.getUser(userId);
    if (!user) {
      throw AppError.resourceNotFound('User', userId);
    }
    
    // Generate API key
    const rawKey = this.encryptionService.generateToken(32);
    
    // Calculate expiration date
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + (expiresInDays * 24 * 60 * 60 * 1000)).toISOString() 
      : undefined;
    
    // Create API key record
    const apiKey: ApiKey = {
      id: nanoid(),
      userId,
      name,
      key: rawKey, // In a real implementation, this would be hashed
      permissions,
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const createdKey = await this.storage.createApiKey(apiKey);
    
    return {
      apiKey: createdKey,
      rawKey
    };
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId: string, userId: string): Promise<boolean> {
    // Verify API key exists and belongs to user
    const apiKey = await this.storage.getApiKey(keyId);
    if (!apiKey || apiKey.userId !== userId) {
      throw AppError.resourceNotFound('API key', keyId);
    }
    
    return this.storage.deleteApiKey(keyId);
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<User> {
    // Get user
    const user = await this.storage.getUser(userId);
    if (!user) {
      throw AppError.resourceNotFound('User', userId);
    }
    
    // Verify current password
    const isPasswordValid = await this.verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Current password is incorrect');
    }
    
    // Validate new password
    this.validatePassword(newPassword);
    
    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);
    
    // Update user
    const updatedUser = await this.storage.updateUser(userId, {
      password: hashedPassword,
      updatedAt: new Date().toISOString()
    });
    
    // Revoke all refresh tokens
    await this.tokenService.revokeAllUserTokens(userId);
    
    return updatedUser;
  }

  /**
   * Reset user password (admin function)
   */
  async resetPassword(userId: string, newPassword: string): Promise<User> {
    // Get user
    const user = await this.storage.getUser(userId);
    if (!user) {
      throw AppError.resourceNotFound('User', userId);
    }
    
    // Validate new password
    this.validatePassword(newPassword);
    
    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);
    
    // Update user
    const updatedUser = await this.storage.updateUser(userId, {
      password: hashedPassword,
      updatedAt: new Date().toISOString()
    });
    
    // Revoke all refresh tokens
    await this.tokenService.revokeAllUserTokens(userId);
    
    return updatedUser;
  }

  /**
   * Validate registration data
   */
  private validateRegistrationData(data: UserRegistrationData): void {
    // Validate username
    if (!data.username || data.username.length < 3) {
      throw AppError.validation([{
        field: 'username',
        message: 'Username must be at least 3 characters long',
        code: 'INVALID_LENGTH'
      }]);
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      throw AppError.validation([{
        field: 'email',
        message: 'Email is invalid',
        code: 'INVALID_FORMAT'
      }]);
    }
    
    // Validate password
    this.validatePassword(data.password);
  }

  /**
   * Validate password
   */
  private validatePassword(password: string): void {
    const requirements = this.config.passwordRequirements;
    
    if (!password || password.length < requirements.minLength) {
      throw AppError.validation([{
        field: 'password',
        message: `Password must be at least ${requirements.minLength} characters long`,
        code: 'INVALID_LENGTH'
      }]);
    }
    
    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      throw AppError.validation([{
        field: 'password',
        message: 'Password must contain at least one uppercase letter',
        code: 'INVALID_FORMAT'
      }]);
    }
    
    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      throw AppError.validation([{
        field: 'password',
        message: 'Password must contain at least one lowercase letter',
        code: 'INVALID_FORMAT'
      }]);
    }
    
    if (requirements.requireNumbers && !/[0-9]/.test(password)) {
      throw AppError.validation([{
        field: 'password',
        message: 'Password must contain at least one number',
        code: 'INVALID_FORMAT'
      }]);
    }
    
    if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw AppError.validation([{
        field: 'password',
        message: 'Password must contain at least one special character',
        code: 'INVALID_FORMAT'
      }]);
    }
  }

  /**
   * Handle failed login
   */
  private async handleFailedLogin(user: User): Promise<void> {
    const maxAttempts = this.config.loginFailureHandling.maxAttempts;
    const lockoutDuration = this.config.loginFailureHandling.lockoutDuration;
    
    // Increment login attempts
    const loginAttempts = (user.loginAttempts || 0) + 1;
    
    // Check if account should be locked
    if (loginAttempts >= maxAttempts) {
      await this.storage.updateUser(user.id, {
        loginAttempts,
        status: UserStatus.LOCKED,
        lockUntil: new Date(Date.now() + (lockoutDuration * 1000)).toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      await this.storage.updateUser(user.id, {
        loginAttempts,
        updatedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Get token service
   */
  getTokenService(): TokenService {
    return this.tokenService;
  }

  /**
   * Get encryption service
   */
  getEncryptionService(): EncryptionService {
    return this.encryptionService;
  }

  /**
   * Get MFA service
   */
  getMfaService(): MfaService {
    return this.mfaService;
  }
}