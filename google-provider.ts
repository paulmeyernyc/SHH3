/**
 * Google OAuth Provider
 * 
 * Implementation of OAuth 2.0 for Google authentication.
 */

import axios from 'axios';
import { AppError } from '../../../../common/error/app-error';
import { ErrorCode } from '../../../../common/error/error-types';
import { OAuthProvider, OAuthTokenResponse, OAuthUserProfile } from '../../model';

/**
 * Google OAuth configuration
 */
export interface GoogleOAuthConfig {
  /**
   * Google API version
   */
  apiVersion?: string;
  
  /**
   * Client ID
   */
  clientId: string;
  
  /**
   * Client secret
   */
  clientSecret: string;
  
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
 * Google OAuth Provider implementation
 */
export class GoogleOAuthProvider implements OAuthProvider {
  private readonly config: GoogleOAuthConfig;
  private readonly authUrl: string;
  private readonly tokenUrl: string;
  private readonly userInfoUrl: string;
  
  constructor(config: GoogleOAuthConfig) {
    // Apply defaults
    this.config = {
      apiVersion: 'v4',
      scopes: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      ...config
    };
    
    this.authUrl = this.config.authorizationUrl as string;
    this.tokenUrl = this.config.tokenUrl as string;
    this.userInfoUrl = this.config.userInfoUrl as string;
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
      access_type: 'offline',
      prompt: 'consent' // Force to get refresh token
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
        redirect_uri: this.config.redirectUri
      });
      
      const response = await axios.post(this.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const data = response.data;
      
      if (!data.access_token) {
        throw new AppError(
          'Invalid token response from Google',
          500,
          { code: ErrorCode.OAUTH_ERROR }
        );
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
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
          `Google OAuth error: ${error.response.data.error_description || error.response.data.error || error.message}`,
          error.response.status,
          { code: ErrorCode.OAUTH_ERROR, cause: error }
        );
      }
      
      throw new AppError(
        `Google OAuth error: ${(error as Error).message}`,
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
        grant_type: 'refresh_token'
      });
      
      const response = await axios.post(this.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const data = response.data;
      
      if (!data.access_token) {
        throw new AppError(
          'Invalid token refresh response from Google',
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
          `Google token refresh error: ${error.response.data.error_description || error.response.data.error || error.message}`,
          error.response.status,
          { code: ErrorCode.OAUTH_ERROR, cause: error }
        );
      }
      
      throw new AppError(
        `Google token refresh error: ${(error as Error).message}`,
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
      
      if (!data.sub) {
        throw new AppError(
          'Invalid user profile response from Google',
          500,
          { code: ErrorCode.OAUTH_ERROR }
        );
      }
      
      return {
        id: data.sub,
        email: data.email,
        emailVerified: data.email_verified === true,
        firstName: data.given_name,
        lastName: data.family_name,
        name: data.name,
        pictureUrl: data.picture,
        locale: data.locale,
        // Store the original data for reference
        raw: data
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if (axios.isAxiosError(error) && error.response) {
        throw new AppError(
          `Google profile error: ${error.response.data.error_description || error.response.data.error || error.message}`,
          error.response.status,
          { code: ErrorCode.OAUTH_ERROR, cause: error }
        );
      }
      
      throw new AppError(
        `Google profile error: ${(error as Error).message}`,
        500,
        { code: ErrorCode.OAUTH_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Revoke a token
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        token
      });
      
      await axios.post('https://accounts.google.com/o/oauth2/revoke', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to revoke Google token:', error);
      return false;
    }
  }
}