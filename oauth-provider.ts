/**
 * OAuth Provider Interface
 * 
 * Defines the interface for OAuth providers.
 */

import { AuthProviderType } from '../../model';

/**
 * OAuth2 token response
 */
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;  // For OpenID Connect
}

/**
 * OAuth2 user profile
 */
export interface OAuthUserProfile {
  id: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  [key: string]: any;  // Additional provider-specific fields
}

/**
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

/**
 * OAuth provider interface
 */
export interface IOAuthProvider {
  /**
   * Get provider type
   */
  getProviderType(): AuthProviderType;
  
  /**
   * Get authorization URL for redirect
   */
  getAuthorizationUrl(state?: string, additionalParams?: Record<string, string>): string;
  
  /**
   * Exchange authorization code for tokens
   */
  exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse>;
  
  /**
   * Get user profile using access token
   */
  getUserProfile(accessToken: string): Promise<OAuthUserProfile>;
  
  /**
   * Refresh access token using refresh token
   */
  refreshToken(refreshToken: string): Promise<OAuthTokenResponse>;
  
  /**
   * Revoke token
   */
  revokeToken(token: string, isRefreshToken?: boolean): Promise<boolean>;
}

/**
 * Abstract OAuth provider
 */
export abstract class BaseOAuthProvider implements IOAuthProvider {
  protected config: OAuthProviderConfig;
  
  constructor(config: OAuthProviderConfig) {
    this.config = config;
  }
  
  /**
   * Get provider type
   */
  abstract getProviderType(): AuthProviderType;
  
  /**
   * Get authorization URL for redirect
   */
  getAuthorizationUrl(state?: string, additionalParams?: Record<string, string>): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' ')
    });
    
    if (state) {
      params.append('state', state);
    }
    
    if (additionalParams) {
      for (const [key, value] of Object.entries(additionalParams)) {
        params.append(key, value);
      }
    }
    
    return `${this.config.authorizationUrl}?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for tokens
   */
  abstract exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse>;
  
  /**
   * Get user profile using access token
   */
  abstract getUserProfile(accessToken: string): Promise<OAuthUserProfile>;
  
  /**
   * Refresh access token using refresh token
   */
  abstract refreshToken(refreshToken: string): Promise<OAuthTokenResponse>;
  
  /**
   * Revoke token
   */
  abstract revokeToken(token: string, isRefreshToken?: boolean): Promise<boolean>;
}