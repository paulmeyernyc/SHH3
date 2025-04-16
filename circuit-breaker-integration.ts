/**
 * Circuit Breaker Integration with Error Handling Framework
 * 
 * This module provides integration between the Circuit Breaker pattern
 * and the Error Handling Framework.
 */

import { AppError } from './app-error';
import { ErrorCode, HttpStatusCode } from './error-types';
import { captureError } from './error-capture';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',         // Normal operation, requests flow through
  OPEN = 'OPEN',             // Circuit is open, requests are immediately rejected
  HALF_OPEN = 'HALF_OPEN'    // Testing if the service is back, allowing limited requests
}

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  // Name of the circuit (for logging and monitoring)
  name: string;
  // Maximum number of failures before opening the circuit
  failureThreshold: number;
  // Time in milliseconds to keep the circuit open
  resetTimeout: number;
  // Number of successful requests required to close the circuit from half-open
  successThreshold: number;
  // Maximum number of requests allowed in half-open state
  halfOpenMaxRequests?: number;
  // Function to determine if an error should count as a failure
  isFailure?: (error: Error) => boolean;
  // Function called when circuit state changes
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  // Function called when circuit trips
  onCircuitTrip?: (failures: number) => void;
  // Function called when circuit resets
  onCircuitReset?: () => void;
}

/**
 * Circuit breaker implementation with error handling integration
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private nextAttempt: number = Date.now();
  private halfOpenCounter: number = 0;
  private lastError: Error | null = null;
  
  private readonly options: Required<CircuitBreakerOptions>;
  
  constructor(options: CircuitBreakerOptions) {
    // Set default options
    this.options = {
      name: options.name,
      failureThreshold: options.failureThreshold,
      resetTimeout: options.resetTimeout,
      successThreshold: options.successThreshold,
      halfOpenMaxRequests: options.halfOpenMaxRequests || 1,
      isFailure: options.isFailure || ((_) => true),
      onStateChange: options.onStateChange || (() => {}),
      onCircuitTrip: options.onCircuitTrip || (() => {}),
      onCircuitReset: options.onCircuitReset || (() => {})
    };
  }
  
  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        // Circuit is open, reject the request
        throw this.createOpenCircuitError();
      } else {
        // Transition to half-open
        this.transitionTo(CircuitState.HALF_OPEN);
      }
    }
    
    // Check half-open request limit
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCounter >= this.options.halfOpenMaxRequests) {
        throw this.createOpenCircuitError();
      }
      this.halfOpenCounter++;
    }
    
    try {
      // Execute the function
      const result = await fn();
      
      // Record success
      this.recordSuccess();
      
      return result;
    } catch (error) {
      // Record failure if applicable
      if (error instanceof Error && this.options.isFailure(error)) {
        this.recordFailure(error);
      }
      
      // Rethrow the error
      throw error;
    }
  }
  
  /**
   * Record a successful operation
   */
  private recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.options.onCircuitReset();
      }
    } else {
      // Reset failures in closed state
      this.failures = 0;
      this.lastError = null;
    }
  }
  
  /**
   * Record a failed operation
   */
  private recordFailure(error: Error): void {
    this.lastError = error;
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state reopens the circuit
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      this.failures++;
      if (this.failures >= this.options.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
        this.options.onCircuitTrip(this.failures);
      }
    }
  }
  
  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) {
      return;
    }
    
    const prevState = this.state;
    this.state = newState;
    
    // Reset counters on state change
    if (newState === CircuitState.CLOSED) {
      this.failures = 0;
      this.successes = 0;
      this.lastError = null;
    } else if (newState === CircuitState.OPEN) {
      this.successes = 0;
      this.nextAttempt = Date.now() + this.options.resetTimeout;
      this.halfOpenCounter = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successes = 0;
      this.halfOpenCounter = 0;
    }
    
    // Notify state change
    this.options.onStateChange(prevState, newState);
    
    // Log state change
    console.log(`[Circuit Breaker] ${this.options.name}: ${prevState} -> ${newState}`);
  }
  
  /**
   * Create an error for open circuit
   */
  private createOpenCircuitError(): AppError {
    const cause = this.lastError;
    
    const error = new AppError({
      code: ErrorCode.SERVICE_CIRCUIT_OPEN,
      message: `Service '${this.options.name}' is unavailable (circuit open)`,
      httpStatus: HttpStatusCode.SERVICE_UNAVAILABLE,
      details: {
        service: this.options.name,
        circuitState: this.state,
        failures: this.failures,
        nextAttempt: new Date(this.nextAttempt).toISOString(),
        cause: cause ? {
          name: cause.name,
          message: cause.message
        } : undefined
      },
      cause: cause || undefined,
      troubleshoot: {
        userAction: 'Please try again later',
        developerAction: 'Check the underlying service and its dependencies'
      }
    });
    
    // Capture the error for monitoring
    captureError(error);
    
    return error;
  }
  
  /**
   * Get the current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get the failure count
   */
  getFailureCount(): number {
    return this.failures;
  }
  
  /**
   * Get the success count (in half-open state)
   */
  getSuccessCount(): number {
    return this.successes;
  }
  
  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
  }
  
  /**
   * Force the circuit to open
   */
  forceOpen(): void {
    this.transitionTo(CircuitState.OPEN);
  }
}

/**
 * Create a circuit breaker with the specified options
 */
export function createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  return new CircuitBreaker(options);
}

/**
 * Create a circuit-breaker-protected function
 */
export function withCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  circuitBreaker: CircuitBreaker
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return circuitBreaker.execute(() => fn(...args));
  }) as T;
}