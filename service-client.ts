/**
 * Service Client
 * 
 * This module provides a client for inter-service communication
 * within the Smart Health Hub platform.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ServiceClientConfig {
  gatewayUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Service Client for inter-service communication
 */
export class ServiceClient {
  private client: AxiosInstance;
  private gatewayUrl: string;
  
  constructor(config: ServiceClientConfig) {
    this.gatewayUrl = config.gatewayUrl;
    
    // Create Axios instance
    this.client = axios.create({
      baseURL: config.gatewayUrl,
      timeout: config.timeout || 30000, // 30 seconds default timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config.headers
      }
    });
    
    // Add request interceptor for logging
    this.client.interceptors.request.use((request) => {
      console.log(`[ServiceClient] Request: ${request.method?.toUpperCase()} ${request.baseURL}${request.url}`);
      return request;
    });
    
    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[ServiceClient] Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          console.error(`[ServiceClient] Error: ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
          console.error(`[ServiceClient] Error details:`, error.response.data);
        } else {
          console.error(`[ServiceClient] Request failed:`, error.message);
        }
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Send GET request to another service
   */
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }
  
  /**
   * Send POST request to another service
   */
  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }
  
  /**
   * Send PUT request to another service
   */
  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }
  
  /**
   * Send DELETE request to another service
   */
  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }
  
  /**
   * Send PATCH request to another service
   */
  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }
}