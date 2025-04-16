/**
 * Circuit Breaker Implementation
 * 
 * This module implements the Circuit Breaker pattern to prevent cascading failures
 * by detecting failures and encapsulating the logic of preventing a failure from
 * constantly recurring.
 * 
 * The circuit breaker has three states:
 * - CLOSED: Requests flow normally
 * - OPEN: All requests immediately fail (short circuit)
 * - HALF_OPEN: Limited requests are allowed to test if the service has recovered
 * 
 * Benefits:
 * - Prevents cascading failures
 * - Allows failing services time to recover
 * - Provides fallback mechanisms
 * - Improves system resilience
 */

import EventEmitter from 'events';

// Circuit Breaker States
export enum CircuitState {
  CLOSED = 'CLOSED',       // Normal operation - requests flow through
  OPEN = 'OPEN',           // Circuit is open - requests fail fast
  HALF_OPEN = 'HALF_OPEN'  // Testing if service is recovered
}

// Options for configuring the Circuit Breaker
export interface CircuitBreakerOptions {
  failureThreshold: number;       // Number of failures before opening circuit
  resetTimeout: number;           // Time in ms before attempting half-open state
  halfOpenSuccessThreshold: number; // Number of successes to close the circuit
  timeout?: number;               // Request timeout in ms (0 = no timeout)
  monitorInterval?: number;       // Interval in ms to calculate metrics
  healthCheckInterval?: number;   // Interval in ms for automatic health checks
  healthCheck?: () => Promise<boolean>; // Function to check service health
  fallback?: <T>(...args: any[]) => Promise<T>; // Fallback function when circuit is open
  name?: string;                  // Circuit name for logging/metrics
  trackStats?: boolean;           // Whether to track performance stats
}

// Default options
const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  halfOpenSuccessThreshold: 3,
  timeout: 10000, // 10 seconds
  monitorInterval: 60000, // 1 minute
  healthCheckInterval: 0, // Disabled by default
  trackStats: true,
  name: 'default'
};

// Statistics for monitoring
export interface CircuitStats {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCount: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  lastStateChangeTime: Date | null;
  latency: {
    mean: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  errorPercentage: number;
  currentConcurrency: number;
  breakerOpenTime: number | null;
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker extends EventEmitter {
  private options: CircuitBreakerOptions;
  private state: CircuitState;
  private failureCount: number;
  private successCount: number;
  private totalCount: number;
  private lastFailureTime: Date | null;
  private lastSuccessTime: Date | null;
  private lastStateChangeTime: Date | null;
  private stateChangeTimer: NodeJS.Timeout | null;
  private healthCheckTimer: NodeJS.Timeout | null;
  private monitorTimer: NodeJS.Timeout | null;
  private latencies: number[];
  private currentConcurrency: number;
  private breakerOpenTime: number | null;
  
  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    super();
    
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Initialize state
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.lastStateChangeTime = new Date();
    this.stateChangeTimer = null;
    this.healthCheckTimer = null;
    this.monitorTimer = null;
    this.latencies = [];
    this.currentConcurrency = 0;
    this.breakerOpenTime = null;
    
    // Setup monitoring interval if enabled
    if (this.options.trackStats && this.options.monitorInterval) {
      this.monitorTimer = setInterval(() => {
        this.emitStats();
      }, this.options.monitorInterval);
    }
    
    // Setup health check interval if enabled
    if (this.options.healthCheck && this.options.healthCheckInterval) {
      this.healthCheckTimer = setInterval(() => {
        this.performHealthCheck();
      }, this.options.healthCheckInterval);
    }
  }
  
  /**
   * Execute a function through the circuit breaker
   * 
   * @param fn Function to execute
   * @param args Arguments to pass to the function
   * @returns Result of the function or fallback
   */
  public async execute<T>(fn: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
    // Check if circuit is open
    if (this.isOpen()) {
      // If circuit is open, fail fast
      if (this.options.fallback) {
        return this.options.fallback<T>(...args);
      }
      
      throw new Error(`Circuit ${this.options.name} is OPEN`);
    }
    
    // Increment concurrent requests
    this.currentConcurrency++;
    
    // Track execution time
    const startTime = Date.now();
    
    try {
      // Execute function with timeout if specified
      let result: T;
      
      if (this.options.timeout) {
        result = await this.executeWithTimeout<T>(fn, this.options.timeout, ...args);
      } else {
        result = await fn(...args);
      }
      
      // Record success
      const latency = Date.now() - startTime;
      this.recordSuccess(latency);
      
      return result;
    } catch (error) {
      // Record failure
      const latency = Date.now() - startTime;
      this.recordFailure(error, latency);
      
      // Use fallback if available
      if (this.options.fallback) {
        return this.options.fallback<T>(...args);
      }
      
      // Otherwise rethrow the error
      throw error;
    } finally {
      // Decrement concurrent requests
      this.currentConcurrency--;
    }
  }
  
  /**
   * Force the circuit breaker into a specific state
   * 
   * @param state The state to force
   */
  public forceState(state: CircuitState): void {
    if (this.state !== state) {
      this.changeState(state);
    }
  }
  
  /**
   * Reset the circuit breaker
   */
  public reset(): void {
    this.changeState(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.latencies = [];
    this.breakerOpenTime = null;
    
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
      this.stateChangeTimer = null;
    }
    
    this.emit('reset', this.getStats());
  }
  
  /**
   * Get current circuit breaker state
   */
  public getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Check if circuit is open
   */
  public isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }
  
  /**
   * Check if circuit is closed
   */
  public isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }
  
  /**
   * Check if circuit is half-open
   */
  public isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }
  
  /**
   * Get circuit breaker statistics
   */
  public getStats(): CircuitStats {
    // Calculate latency statistics
    let mean = 0;
    let min = 0;
    let max = 0;
    let p95 = 0;
    let p99 = 0;
    
    if (this.latencies.length > 0) {
      const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
      
      mean = sortedLatencies.reduce((sum, val) => sum + val, 0) / sortedLatencies.length;
      min = sortedLatencies[0];
      max = sortedLatencies[sortedLatencies.length - 1];
      
      // Calculate percentiles
      const p95Index = Math.floor(sortedLatencies.length * 0.95);
      const p99Index = Math.floor(sortedLatencies.length * 0.99);
      
      p95 = sortedLatencies[p95Index] || max;
      p99 = sortedLatencies[p99Index] || max;
    }
    
    // Calculate error percentage
    const errorPercentage = this.totalCount > 0
      ? (this.failureCount / this.totalCount) * 100
      : 0;
    
    return {
      name: this.options.name!,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCount: this.totalCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastStateChangeTime: this.lastStateChangeTime,
      latency: {
        mean,
        min,
        max,
        p95,
        p99
      },
      errorPercentage,
      currentConcurrency: this.currentConcurrency,
      breakerOpenTime: this.breakerOpenTime
    };
  }
  
  /**
   * Clean up resources when no longer needed
   */
  public destroy(): void {
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
    }
    
    this.removeAllListeners();
  }
  
  /**
   * Execute a function with a timeout
   * 
   * @param fn Function to execute
   * @param timeoutMs Timeout in milliseconds
   * @param args Arguments to pass to the function
   * @returns Result of the function
   * @throws Error if timeout is reached
   */
  private async executeWithTimeout<T>(
    fn: (...args: any[]) => Promise<T>,
    timeoutMs: number,
    ...args: any[]
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Circuit ${this.options.name} timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      
      fn(...args)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
  
  /**
   * Record a successful call
   * 
   * @param latencyMs Execution time in milliseconds
   */
  private recordSuccess(latencyMs: number): void {
    this.totalCount++;
    this.successCount++;
    this.lastSuccessTime = new Date();
    
    if (this.options.trackStats) {
      // Keep only the last 100 latencies to avoid memory issues
      if (this.latencies.length >= 100) {
        this.latencies.shift();
      }
      this.latencies.push(latencyMs);
    }
    
    // If in half-open state, check if we should close the circuit
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.options.halfOpenSuccessThreshold) {
        this.changeState(CircuitState.CLOSED);
      }
    }
    
    this.emit('success', latencyMs, this.getStats());
  }
  
  /**
   * Record a failed call
   * 
   * @param error Error that occurred
   * @param latencyMs Execution time in milliseconds
   */
  private recordFailure(error: any, latencyMs: number): void {
    this.totalCount++;
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.options.trackStats) {
      // Keep only the last 100 latencies to avoid memory issues
      if (this.latencies.length >= 100) {
        this.latencies.shift();
      }
      this.latencies.push(latencyMs);
    }
    
    // If in half-open state, immediately open the circuit again
    if (this.state === CircuitState.HALF_OPEN) {
      this.changeState(CircuitState.OPEN);
      return;
    }
    
    // If we've reached the failure threshold, open the circuit
    if (this.state === CircuitState.CLOSED && 
        this.failureCount >= this.options.failureThreshold) {
      this.changeState(CircuitState.OPEN);
    }
    
    this.emit('failure', error, latencyMs, this.getStats());
  }
  
  /**
   * Change the circuit state
   * 
   * @param newState New circuit state
   */
  private changeState(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;
    this.lastStateChangeTime = new Date();
    
    // Reset counters based on new state
    if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
      this.breakerOpenTime = null;
      
      // Clear any pending state change timer
      if (this.stateChangeTimer) {
        clearTimeout(this.stateChangeTimer);
        this.stateChangeTimer = null;
      }
    } else if (newState === CircuitState.OPEN) {
      this.successCount = 0;
      this.breakerOpenTime = Date.now();
      
      // Set timer to transition to half-open after reset timeout
      this.stateChangeTimer = setTimeout(() => {
        this.changeState(CircuitState.HALF_OPEN);
      }, this.options.resetTimeout);
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
      
      // Clear any pending state change timer
      if (this.stateChangeTimer) {
        clearTimeout(this.stateChangeTimer);
        this.stateChangeTimer = null;
      }
    }
    
    this.emit('stateChange', newState, previousState, this.getStats());
  }
  
  /**
   * Perform health check to see if service is available
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.options.healthCheck || this.state === CircuitState.CLOSED) {
      return;
    }
    
    try {
      const isHealthy = await this.options.healthCheck();
      
      if (isHealthy && this.state === CircuitState.OPEN) {
        this.changeState(CircuitState.HALF_OPEN);
      }
      
      this.emit('healthCheck', isHealthy, this.getStats());
    } catch (error) {
      this.emit('healthCheckError', error, this.getStats());
    }
  }
  
  /**
   * Emit current statistics
   */
  private emitStats(): void {
    const stats = this.getStats();
    this.emit('stats', stats);
  }
}