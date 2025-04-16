/**
 * Microsoft OAuth Provider
 * 
 * Implementation of OAuth 2.0 for Microsoft/Azure AD authentication.
 */

import axios from 'axios';
import { AppError } from '../../../../common/error/app-error';
import { ErrorCode } from '../../../../common/error/error-types';
import { OAuthProvider, OAuthTokenResponse, OAuthUserProfile } from '../../model';

/**
 * Microsoft OAuth configuration
 */
export interface MicrosoftOAuthConfig {
  /**
   * Client ID
   */
  clientId: string;
  
  /**
   * Client secret
   */
  clientSecret: string;
  
  /**
   * Tenant ID (default: 'common')
   */
  tenant?: string;
  
  /**
   * Redirect URI
   */
  redirectUri: string;
  
  /**
   * OAuth scopes
   */
  scopes?: string[];
  
  /**
   * Authorization URL (override default)
   */
  authorizationUrl?: string;
  
  /**
   * Token URL (override default)
   */
  tokenUrl?: string;
  
  /**
   * User info URL (override default)
   */
  userInfoUrl?: string;
}

/**
 * Microsoft OAuth Provider implementation
 */
export class MicrosoftOAuthProvider implements OAuthProvider {
  private readonly config: MicrosoftOAuthConfig;
  private readonly authUrl: string;
  private readonly tokenUrl: string;
  private readonly userInfoUrl: string;
  private readonly tenant: string;
  
  constructor(config: MicrosoftOAuthConfig) {
    // Apply defaults
    this.tenant = config.tenant || 'common';
    
    this.config = {
      scopes: [
        'openid',
        'profile',
        'email',
        'User.Read'
      ],
      ...config
    };
    
    this.authUrl = this.config.authorizationUrl || `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/authorize`;
    this.tokenUrl = this.config.tokenUrl || `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`;
    this.userInfoUrl = this.config.userInfoUrl || 'https://graph.microsoft.com/v1.0/me';
  }
  
  /**
   * Get authorization URL
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (this.config.scopes || []).join(' '),
      state,
      response_mode: 'query'
    });
    
    return `${this.authUrl}?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async getAccessToken(code: string): Promise<OAuthTokenResponse> {
    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
        scope: (this.config.scopes || []).join(' ')
      });
      
      const response = await axios.post(this.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const data = response.data;
      
      if (!data.access_token) {
        throw new AppError(
          'Invalid token response from Microsoft',
          500,
          { code: ErrorCode.OAUTH_ERROR }
        );
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        idToken: data.id_token
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if (axios.isAxiosError(error) && error.response) {
        throw new AppError(
          `Microsoft OAuth error: ${error.response.data.error_description || error.response.data.error || error.message}`,
          error.response.status,
          { code: ErrorCode.OAUTH_ERROR, cause: error }
        );
      }
      
      throw new AppError(
        `Microsoft OAuth error: ${(error as Error).message}`,
        500,
        { code: ErrorCode.OAUTH_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Refresh access token using a refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: (this.config.scopes || []).join(' ')
      });
      
      const response = await axios.post(this.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const data = response.data;
      
      if (!data.access_token) {
        throw new AppError(
          'Invalid token refresh response from Microsoft',
          500,
          { code: ErrorCode.OAUTH_ERROR }
        );
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Sometimes refresh token isn't returned
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        idToken: data.id_token
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if (axios.isAxiosError(error) && error.response) {
        throw new AppError(
          `Microsoft token refresh error: ${error.response.data.error_description || error.response.data.error || error.message}`,
          error.response.status,
          { code: ErrorCode.OAUTH_ERROR, cause: error }
        );
      }
      
      throw new AppError(
        `Microsoft token refresh error: ${(error as Error).message}`,
        500,
        { code: ErrorCode.OAUTH_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Get user profile from access token
   */
  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    try {
      const response = await axios.get(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      const data = response.data;
      
      if (!data.id) {
        throw new AppError(
          'Invalid user profile response from Microsoft',
          500,
          { code: ErrorCode.OAUTH_ERROR }
        );
      }
      
      const profile: OAuthUserProfile = {
        id: data.id,
        email: data.mail || data.userPrincipalName,
        emailVerified: true, // Microsoft typically verifies emails
        firstName: data.givenName,
        lastName: data.surname,
        name: data.displayName,
        locale: data.preferredLanguage,
        // Store the original data for reference
        raw: data
      };
      
      return profile;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if (axios.isAxiosError(error) && error.response) {
        throw new AppError(
          `Microsoft profile error: ${error.response.data.error?.message || error.response.data.error || error.message}`,
          error.response.status,
          { code: ErrorCode.OAUTH_ERROR, cause: error }
        );
      }
      
      throw new AppError(
        `Microsoft profile error: ${(error as Error).message}`,
        500,
        { code: ErrorCode.OAUTH_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Revoke a token
   * Note: Microsoft doesn't have a standard token revocation endpoint
   * We'll return success since the token can't be revoked via API
   */
  async revokeToken(token: string): Promise<boolean> {
    // Microsoft doesn't provide a standard token revocation endpoint
    // The token will expire according to its lifetime
    return true;
  }
}