/**
 * MCP Service
 * 
 * This service interacts with the MCP (Model Context Protocol) Service
 * to retrieve model definitions, contexts, and other MCP-related data.
 */

import axios, { AxiosInstance } from 'axios';
import { Model, Context, Organization } from '@shared/mcp-schema';

/**
 * Context with models
 */
export interface ContextWithModels extends Context {
  models: Model[];
}

/**
 * MCP Service
 */
export class McpService {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey?: string;
  private cache: Map<string, any> = new Map();
  private cacheTTL: number = 60 * 60 * 1000; // 1 hour cache time
  
  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    
    // Create HTTP client for MCP service
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Add API key if provided
    if (apiKey) {
      this.client.defaults.headers.common['x-api-key'] = apiKey;
    }
  }
  
  /**
   * Get all models
   */
  async getModels(): Promise<Model[]> {
    const cacheKey = 'models';
    
    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached as Model[];
    }
    
    // Fetch from API
    const response = await this.client.get('/api/mcp/models');
    const models = response.data as Model[];
    
    // Cache result
    this.setCached(cacheKey, models);
    
    return models;
  }
  
  /**
   * Get a model by ID
   */
  async getModel(id: number): Promise<Model | undefined> {
    const cacheKey = `model:${id}`;
    
    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached as Model;
    }
    
    try {
      // Fetch from API
      const response = await this.client.get(`/api/mcp/models/${id}`);
      const model = response.data as Model;
      
      // Cache result
      this.setCached(cacheKey, model);
      
      return model;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return undefined;
      }
      throw error;
    }
  }
  
  /**
   * Get model ID by type
   */
  async getModelIdByType(type: string): Promise<number | undefined> {
    const models = await this.getModels();
    const model = models.find(m => m.type === type);
    return model?.id;
  }
  
  /**
   * Get a context by ID
   */
  async getContext(id: number): Promise<ContextWithModels | undefined> {
    const cacheKey = `context:${id}`;
    
    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached as ContextWithModels;
    }
    
    try {
      // Fetch from API
      const response = await this.client.get(`/api/mcp/contexts/${id}`);
      const context = response.data as Context;
      
      // Get models for this context
      const modelsResponse = await this.client.get(`/api/mcp/contexts/${id}/models`);
      const contextWithModels: ContextWithModels = {
        ...context,
        models: modelsResponse.data
      };
      
      // Cache result
      this.setCached(cacheKey, contextWithModels);
      
      return contextWithModels;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return undefined;
      }
      throw error;
    }
  }
  
  /**
   * Get contexts for an organization
   */
  async getContextsForOrganization(organizationId: number): Promise<Context[]> {
    const cacheKey = `contexts:org:${organizationId}`;
    
    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached as Context[];
    }
    
    // Fetch from API
    const response = await this.client.get(`/api/mcp/organizations/${organizationId}/contexts`);
    const contexts = response.data as Context[];
    
    // Cache result
    this.setCached(cacheKey, contexts);
    
    return contexts;
  }
  
  /**
   * Get an organization by ID
   */
  async getOrganization(id: number): Promise<Organization | undefined> {
    const cacheKey = `organization:${id}`;
    
    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached as Organization;
    }
    
    try {
      // Fetch from API
      const response = await this.client.get(`/api/mcp/organizations/${id}`);
      const organization = response.data as Organization;
      
      // Cache result
      this.setCached(cacheKey, organization);
      
      return organization;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return undefined;
      }
      throw error;
    }
  }
  
  /**
   * Validate data against model schemas
   */
  async validateAgainstModels(data: any, models: Model[]): Promise<{ isValid: boolean; errors?: any[] }> {
    // For simple objects, validate against first model
    if (!Array.isArray(data) && models.length > 0) {
      return this.validateAgainstModel(data, models[0].id);
    }
    
    // For arrays, validate each item against appropriate model based on _type
    if (Array.isArray(data)) {
      const errors: any[] = [];
      let isValid = true;
      
      for (const item of data) {
        if (item._type) {
          const model = models.find(m => m.type === item._type);
          if (model) {
            const result = await this.validateAgainstModel(item, model.id);
            if (!result.isValid) {
              isValid = false;
              if (result.errors) {
                errors.push(...result.errors);
              }
            }
          } else {
            isValid = false;
            errors.push({
              path: '',
              message: `No model found for type ${item._type}`
            });
          }
        } else {
          isValid = false;
          errors.push({
            path: '',
            message: 'Missing _type property for array item'
          });
        }
      }
      
      return {
        isValid,
        errors: errors.length > 0 ? errors : undefined
      };
    }
    
    // Could not validate
    return {
      isValid: false,
      errors: [{
        path: '',
        message: 'Could not determine model for validation'
      }]
    };
  }
  
  /**
   * Validate data against a specific model
   */
  async validateAgainstModel(data: any, modelId: number): Promise<{ isValid: boolean; errors?: any[] }> {
    try {
      // Call MCP validation API
      const response = await this.client.post(`/api/mcp/models/${modelId}/validate`, {
        data
      });
      
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return {
          isValid: false,
          errors: error.response.data.errors || [{
            path: '',
            message: error.response.data.message || 'Validation failed'
          }]
        };
      }
      
      return {
        isValid: false,
        errors: [{
          path: '',
          message: error.message || 'Validation failed'
        }]
      };
    }
  }
  
  /**
   * Get from cache
   */
  private getCached(key: string): any | undefined {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }
    
    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.data;
  }
  
  /**
   * Set in cache
   */
  private setCached(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.cacheTTL
    });
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Set cache TTL
   */
  setCacheTTL(ttlMs: number): void {
    this.cacheTTL = ttlMs;
  }
}