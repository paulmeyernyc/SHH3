/**
 * OAuth Service
 * 
 * Service for handling OAuth 2.0 authentication flows with multiple providers.
 */

import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../../common/error/app-error';
import { ErrorCode } from '../../../../common/error/error-types';
import { 
  AuthProviderType, 
  User, 
  OAuthProfile
} from '../../model';
import { EncryptionService } from '../encryption-service';
import { GoogleOAuthProvider } from './google-provider';
import { MicrosoftOAuthProvider } from './microsoft-provider';

// Interfaces - These should match the ones used in providers
interface OAuthProvider {
  getAuthorizationUrl(state: string): Promise<string>;
  getAccessToken(code: string): Promise<OAuthTokenResponse>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse>;
  getUserProfile(accessToken: string): Promise<OAuthUserProfile>;
  revokeToken(token: string): Promise<boolean>;
}

interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  tokenType: string;
  idToken?: string;
}

interface OAuthUserProfile {
  id: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  firstName?: string;
  lastName?: string;
  pictureUrl?: string;
  locale?: string;
  raw: any;
}

/**
 * OAuth service configuration
 */
export interface OAuthServiceConfig {
  /**
   * Base URL for OAuth redirects
   */
  baseUrl: string;
  
  /**
   * Default scopes for all providers
   */
  defaultScopes?: string[];
  
  /**
   * Google OAuth configuration
   */
  google?: {
    /**
     * Client ID
     */
    clientId: string;
    
    /**
     * Client secret
     */
    clientSecret: string;
    
    /**
     * Scopes
     */
    scopes?: string[];
    
    /**
     * Redirect URI
     */
    redirectUri?: string;
  };
  
  /**
   * Microsoft OAuth configuration
   */
  microsoft?: {
    /**
     * Client ID
     */
    clientId: string;
    
    /**
     * Client secret
     */
    clientSecret: string;
    
    /**
     * Tenant ID
     */
    tenantId?: string;
    
    /**
     * Scopes
     */
    scopes?: string[];
    
    /**
     * Redirect URI
     */
    redirectUri?: string;
  };
}

/**
 * OAuth service implementation
 */
export class OAuthService {
  private readonly encryptionService: EncryptionService;
  private readonly config: OAuthServiceConfig;
  private readonly providers: Map<AuthProviderType, OAuthProvider> = new Map();
  private readonly stateCodes: Map<string, { provider: AuthProviderType, expiresAt: number }> = new Map();
  
  constructor(encryptionService: EncryptionService, config: OAuthServiceConfig) {
    this.encryptionService = encryptionService;
    this.config = config;
    
    // Initialize OAuth providers
    this.initializeProviders();
    
    // Schedule cleanup for expired state codes
    setInterval(() => this.cleanupExpiredStates(), 60 * 1000); // Run every minute
  }
  
  /**
   * Initialize OAuth providers
   */
  private initializeProviders(): void {
    // Initialize Google provider if configured
    if (this.config.google) {
      const { clientId, clientSecret } = this.config.google;
      const redirectUri = this.config.google.redirectUri || `${this.config.baseUrl}/auth/callback/google`;
      const scopes = this.config.google.scopes || this.config.defaultScopes || [];
      
      this.providers.set(AuthProviderType.GOOGLE, new GoogleOAuthProvider({
        clientId,
        clientSecret,
        redirectUri,
        scopes
      }));
    }
    
    // Initialize Microsoft provider if configured
    if (this.config.microsoft) {
      const { clientId, clientSecret } = this.config.microsoft;
      const redirectUri = this.config.microsoft.redirectUri || `${this.config.baseUrl}/auth/callback/microsoft`;
      const scopes = this.config.microsoft.scopes || this.config.defaultScopes || [];
      const tenant = this.config.microsoft.tenantId;
      
      this.providers.set(AuthProviderType.MICROSOFT, new MicrosoftOAuthProvider({
        clientId,
        clientSecret,
        redirectUri,
        scopes,
        tenant
      }));
    }
  }
  
  /**
   * Create authorization URL for specified provider
   */
  async createAuthorizationUrl(provider: AuthProviderType): Promise<string> {
    const oauthProvider = this.providers.get(provider);
    
    if (!oauthProvider) {
      throw new AppError(
        `Unsupported OAuth provider: ${provider}`,
        400,
        { code: ErrorCode.OAUTH_ERROR }
      );
    }
    
    const state = await this.generateStateParameter();
    
    // Store state parameter with provider info
    this.stateCodes.set(state, {
      provider,
      expiresAt: Date.now() + 10 * 60 * 1000 // State valid for 10 minutes
    });
    
    return await oauthProvider.getAuthorizationUrl(state);
  }
  
  /**
   * Handle OAuth callback (exchange code for token)
   */
  async handleCallback(code: string, state: string): Promise<OAuthUserProfile> {
    // Validate state parameter to prevent CSRF
    const stateInfo = this.stateCodes.get(state);
    
    if (!stateInfo) {
      throw new AppError(
        'Invalid OAuth state parameter',
        400,
        { code: ErrorCode.OAUTH_ERROR }
      );
    }
    
    if (stateInfo.expiresAt < Date.now()) {
      this.stateCodes.delete(state);
      throw new AppError(
        'OAuth state parameter has expired',
        400,
        { code: ErrorCode.OAUTH_ERROR }
      );
    }
    
    const { provider } = stateInfo;
    const oauthProvider = this.providers.get(provider);
    
    if (!oauthProvider) {
      throw new AppError(
        `Unsupported OAuth provider: ${provider}`,
        400,
        { code: ErrorCode.OAUTH_ERROR }
      );
    }
    
    try {
      // Exchange code for token
      const tokenResponse = await oauthProvider.getAccessToken(code);
      
      // Clean up used state
      this.stateCodes.delete(state);
      
      // Get user profile using access token
      const userProfile = await oauthProvider.getUserProfile(tokenResponse.accessToken);
      
      return userProfile;
    } catch (error) {
      throw new AppError(
        `Failed to process OAuth callback: ${(error as Error).message}`,
        500,
        { code: ErrorCode.OAUTH_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Link OAuth profile to existing user
   */
  async linkUserProfile(user: User, profile: OAuthUserProfile): Promise<OAuthProfile> {
    // Check if profile is already linked to any user
    const existingProfile = await this.findProfileByProviderId(
      profile.provider as AuthProviderType, 
      profile.id
    );
    
    if (existingProfile) {
      throw new AppError(
        'This account is already linked to a user',
        400,
        { code: ErrorCode.OAUTH_ERROR }
      );
    }
    
    const oauthProfile: OAuthProfile = {
      id: uuidv4(),
      userId: user.id,
      provider: profile.provider as AuthProviderType,
      providerId: profile.id,
      profileData: profile.raw,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create the OAuth profile
    return await this.createOAuthProfile(oauthProfile);
  }
  
  /**
   * Refresh OAuth tokens for a profile
   */
  async refreshTokens(profileId: string): Promise<boolean> {
    const profile = await this.getOAuthProfileById(profileId);
    
    if (!profile) {
      throw new AppError(
        'OAuth profile not found',
        404,
        { code: ErrorCode.OAUTH_ERROR }
      );
    }
    
    const provider = this.providers.get(profile.provider);
    
    if (!provider) {
      throw new AppError(
        `Unsupported OAuth provider: ${profile.provider}`,
        400,
        { code: ErrorCode.OAUTH_ERROR }
      );
    }
    
    // Extract refresh token from profile data
    const refreshToken = profile.profileData?.refreshToken;
    
    if (!refreshToken) {
      return false;
    }
    
    try {
      // Refresh tokens
      const tokens = await provider.refreshAccessToken(refreshToken);
      
      // Update profile data with new tokens
      profile.profileData = {
        ...profile.profileData,
        ...tokens
      };
      profile.updatedAt = new Date();
      
      await this.updateOAuthProfile(profile);
      
      return true;
    } catch (error) {
      console.error('Failed to refresh OAuth tokens:', error);
      return false;
    }
  }
  
  /**
   * Revoke OAuth tokens for a profile
   */
  async revokeTokens(profileId: string): Promise<boolean> {
    const profile = await this.getOAuthProfileById(profileId);
    
    if (!profile) {
      throw new AppError(
        'OAuth profile not found',
        404,
        { code: ErrorCode.OAUTH_ERROR }
      );
    }
    
    const provider = this.providers.get(profile.provider);
    
    if (!provider) {
      throw new AppError(
        `Unsupported OAuth provider: ${profile.provider}`,
        400,
        { code: ErrorCode.OAUTH_ERROR }
      );
    }
    
    // Try to revoke access token first, then refresh token
    const accessToken = profile.profileData?.accessToken;
    const refreshToken = profile.profileData?.refreshToken;
    
    let result = true;
    
    if (accessToken) {
      result = await provider.revokeToken(accessToken) && result;
    }
    
    if (refreshToken) {
      result = await provider.revokeToken(refreshToken) && result;
    }
    
    return result;
  }
  
  /**
   * Unlink OAuth profile from user
   */
  async unlinkProfile(userId: string, profileId: string): Promise<boolean> {
    const profile = await this.getOAuthProfileById(profileId);
    
    if (!profile) {
      return false;
    }
    
    if (profile.userId !== userId) {
      return false;
    }
    
    // Attempt to revoke tokens
    await this.revokeTokens(profileId).catch(() => {});
    
    // Delete the profile
    return await this.deleteOAuthProfile(profileId);
  }
  
  /**
   * Find or create user from OAuth profile
   */
  async findOrCreateUser(profile: OAuthUserProfile): Promise<User> {
    // First check if there's a linked profile
    const existingOAuthProfile = await this.findProfileByProviderId(
      profile.provider as AuthProviderType, 
      profile.id
    );
    
    if (existingOAuthProfile) {
      // Get the user associated with this profile
      const user = await this.getUserById(existingOAuthProfile.userId);
      
      if (user) {
        // Update profile data with latest info
        existingOAuthProfile.profileData = {
          ...existingOAuthProfile.profileData,
          ...profile.raw
        };
        existingOAuthProfile.updatedAt = new Date();
        
        await this.updateOAuthProfile(existingOAuthProfile);
        
        return user;
      }
    }
    
    // If no existing profile or user found, check if there's a user with matching email
    if (profile.email && profile.emailVerified) {
      const existingUser = await this.getUserByEmail(profile.email);
      
      if (existingUser) {
        // Link this OAuth profile to the existing user
        await this.linkUserProfile(existingUser, profile);
        return existingUser;
      }
    }
    
    // Create a new user
    const username = this.generateUsernameFromProfile(profile);
    
    const newUser: User = {
      id: uuidv4(),
      username,
      email: profile.email || '',
      password: await this.encryptionService.generateRandomString(32), // Random password
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      status: 'active',
      verified: profile.emailVerified || false,
      roles: ['user'],
      permissions: [],
      mfaEnabled: false,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create the user
    const user = await this.createUser(newUser);
    
    // Link the OAuth profile
    await this.linkUserProfile(user, profile);
    
    return user;
  }
  
  /**
   * Generate state parameter for CSRF protection
   */
  private async generateStateParameter(): Promise<string> {
    return await this.encryptionService.generateRandomString(32);
  }
  
  /**
   * Clean up expired state codes
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, info] of this.stateCodes.entries()) {
      if (info.expiresAt < now) {
        this.stateCodes.delete(state);
      }
    }
  }
  
  /**
   * Generate username from OAuth profile
   */
  private generateUsernameFromProfile(profile: OAuthUserProfile): string {
    let username = '';
    
    if (profile.name) {
      // Convert name to lowercase and replace spaces with underscores
      username = profile.name.toLowerCase().replace(/\s+/g, '_');
    } else if (profile.firstName && profile.lastName) {
      // Combine first and last name
      username = `${profile.firstName.toLowerCase()}_${profile.lastName.toLowerCase()}`;
    } else if (profile.email) {
      // Use part before @ in email
      username = profile.email.split('@')[0];
    } else {
      // Fallback to provider + id
      username = `${profile.provider}_${profile.id}`;
    }
    
    // Add random suffix to ensure uniqueness
    const suffix = Math.floor(Math.random() * 1000);
    return `${username}_${suffix}`;
  }
  
  // Database access methods that would be implemented by the consuming code
  
  async findProfileByProviderId(provider: AuthProviderType, providerId: string): Promise<OAuthProfile | null> {
    // This would be implemented by the service consuming this class
    throw new Error('Method not implemented');
  }
  
  /**
   * Get OAuth profile by ID
   */
  async getOAuthProfileById(profileId: string): Promise<OAuthProfile | null> {
    // This would be implemented by the service consuming this class
    throw new Error('Method not implemented');
  }
  
  /**
   * Create OAuth profile
   */
  async createOAuthProfile(profile: OAuthProfile): Promise<OAuthProfile> {
    // This would be implemented by the service consuming this class
    throw new Error('Method not implemented');
  }
  
  /**
   * Update OAuth profile
   */
  async updateOAuthProfile(profile: OAuthProfile): Promise<OAuthProfile> {
    // This would be implemented by the service consuming this class
    throw new Error('Method not implemented');
  }
  
  /**
   * Delete OAuth profile
   */
  async deleteOAuthProfile(profileId: string): Promise<boolean> {
    // This would be implemented by the service consuming this class
    throw new Error('Method not implemented');
  }
  
  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    // This would be implemented by the service consuming this class
    throw new Error('Method not implemented');
  }
  
  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    // This would be implemented by the service consuming this class
    throw new Error('Method not implemented');
  }
  
  /**
   * Create user
   */
  async createUser(user: User): Promise<User> {
    // This would be implemented by the service consuming this class
    throw new Error('Method not implemented');
  }
}