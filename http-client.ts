/**
 * HTTP Client with Circuit Breaker
 * 
 * This module provides an Axios-based HTTP client with built-in
 * circuit breaker support for making resilient HTTP requests
 * to external services.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { CircuitBreaker, CircuitBreakerOptions, CircuitState } from './circuit-breaker';

interface ServiceClientOptions {
  baseURL: string;
  circuitBreaker?: Partial<CircuitBreakerOptions>;
  defaultRequestConfig?: AxiosRequestConfig;
  retries?: number;
  retryDelay?: number;
  loggingEnabled?: boolean;
  loggerFn?: (message: string, data?: any) => void;
}

/**
 * HTTP Client with Circuit Breaker integration
 */
export class HttpClient {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private options: ServiceClientOptions;
  private logger: (message: string, data?: any) => void;
  
  constructor(options: ServiceClientOptions) {
    this.options = {
      retries: 0,
      retryDelay: 1000,
      loggingEnabled: false,
      ...options
    };
    
    // Create Axios instance
    this.client = axios.create({
      baseURL: options.baseURL,
      timeout: options.circuitBreaker?.timeout || 10000,
      ...options.defaultRequestConfig
    });
    
    // Setup logger
    this.logger = options.loggerFn || ((message, data) => {
      if (this.options.loggingEnabled) {
        if (data) {
          console.log(`[HttpClient] ${message}`, data);
        } else {
          console.log(`[HttpClient] ${message}`);
        }
      }
    });
    
    // Create Circuit Breaker
    const serviceName = new URL(options.baseURL).hostname;
    this.circuitBreaker = new CircuitBreaker({
      name: `http-${serviceName}`,
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenSuccessThreshold: 2,
      timeout: options.circuitBreaker?.timeout || 10000,
      ...options.circuitBreaker
    });
    
    // Setup circuit breaker event listeners
    this.setupCircuitBreakerEvents();
  }
  
  /**
   * Make a GET request with circuit breaker protection
   */
  public async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest<T>(() => this.client.get<T>(url, config));
  }
  
  /**
   * Make a POST request with circuit breaker protection
   */
  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest<T>(() => this.client.post<T>(url, data, config));
  }
  
  /**
   * Make a PUT request with circuit breaker protection
   */
  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest<T>(() => this.client.put<T>(url, data, config));
  }
  
  /**
   * Make a PATCH request with circuit breaker protection
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest<T>(() => this.client.patch<T>(url, data, config));
  }
  
  /**
   * Make a DELETE request with circuit breaker protection
   */
  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest<T>(() => this.client.delete<T>(url, config));
  }
  
  /**
   * Get circuit breaker statistics
   */
  public getStats() {
    return this.circuitBreaker.getStats();
  }
  
  /**
   * Get current circuit state
   */
  public getCircuitState() {
    return this.circuitBreaker.getState();
  }
  
  /**
   * Reset the circuit breaker
   */
  public resetCircuit() {
    this.circuitBreaker.reset();
  }
  
  /**
   * Force the circuit breaker into a specific state
   */
  public forceCircuitState(state: CircuitState) {
    this.circuitBreaker.forceState(state);
  }
  
  /**
   * Clean up resources when no longer needed
   */
  public destroy() {
    this.circuitBreaker.destroy();
  }
  
  /**
   * Execute an HTTP request through the circuit breaker with retry support
   */
  private async executeRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retryCount = 0
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.circuitBreaker.execute(async () => {
        try {
          return await requestFn();
        } catch (error) {
          // If we have retries left and the error is retriable, retry the request
          if (retryCount < (this.options.retries || 0) && this.isRetriableError(error)) {
            this.logger(`Retrying request (${retryCount + 1}/${this.options.retries})`, { error });
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
            
            // Recursive retry
            return this.executeRequest<T>(requestFn, retryCount + 1);
          }
          
          // Otherwise, rethrow the error
          throw error;
        }
      });
    } catch (error) {
      // Convert circuit breaker errors to appropriate HTTP errors
      if (error instanceof Error && error.message.includes('Circuit') && error.message.includes('OPEN')) {
        const httpError: any = new Error('Service unavailable - circuit open');
        httpError.isCircuitOpenError = true;
        httpError.status = 503;
        throw httpError;
      }
      
      throw error;
    }
  }
  
  /**
   * Check if an error is retriable
   */
  private isRetriableError(error: any): boolean {
    // Retry network errors
    if (!error.response) {
      return true;
    }
    
    // Retry server errors (5xx) but not client errors (4xx)
    return error.response && error.response.status >= 500 && error.response.status < 600;
  }
  
  /**
   * Setup circuit breaker event listeners
   */
  private setupCircuitBreakerEvents() {
    this.circuitBreaker.on('stateChange', (newState, prevState, stats) => {
      this.logger(`Circuit state changed from ${prevState} to ${newState}`, { stats });
    });
    
    this.circuitBreaker.on('failure', (error, latency, stats) => {
      this.logger(`Circuit recorded failure (${latency}ms)`, { error, stats });
    });
    
    this.circuitBreaker.on('success', (latency, stats) => {
      this.logger(`Circuit recorded success (${latency}ms)`, { stats });
    });
    
    this.circuitBreaker.on('healthCheck', (isHealthy, stats) => {
      this.logger(`Circuit health check: ${isHealthy ? 'healthy' : 'unhealthy'}`, { stats });
    });
    
    this.circuitBreaker.on('healthCheckError', (error, stats) => {
      this.logger('Circuit health check error', { error, stats });
    });
    
    this.circuitBreaker.on('reset', (stats) => {
      this.logger('Circuit reset', { stats });
    });
  }
}

/**
 * Create an HTTP client with circuit breaker
 */
export function createHttpClient(options: ServiceClientOptions): HttpClient {
  return new HttpClient(options);
}