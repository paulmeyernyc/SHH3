/**
 * Database Client with Circuit Breaker
 * 
 * This module provides a PostgreSQL client with built-in
 * circuit breaker support for resilient database operations.
 */

import { Pool, PoolClient, QueryResult } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import { CircuitBreaker, CircuitBreakerOptions, CircuitState } from './circuit-breaker';

interface DatabaseClientOptions {
  connectionString: string;
  poolConfig?: any;
  circuitBreaker?: Partial<CircuitBreakerOptions>;
  loggingEnabled?: boolean;
  loggerFn?: (message: string, data?: any) => void;
}

/**
 * Database Client with Circuit Breaker integration
 */
export class DatabaseClient {
  private pool: Pool;
  private drizzleDb: any;
  private circuitBreaker: CircuitBreaker;
  private options: DatabaseClientOptions;
  private logger: (message: string, data?: any) => void;
  private databaseName: string;
  
  constructor(options: DatabaseClientOptions) {
    this.options = {
      loggingEnabled: false,
      ...options
    };
    
    // Setup logger
    this.logger = options.loggerFn || ((message, data) => {
      if (this.options.loggingEnabled) {
        if (data) {
          console.log(`[DatabaseClient] ${message}`, data);
        } else {
          console.log(`[DatabaseClient] ${message}`);
        }
      }
    });
    
    // Extract database name from connection string
    try {
      const url = new URL(options.connectionString);
      this.databaseName = url.pathname.replace('/', '') || 'default';
    } catch (e) {
      this.databaseName = 'default';
    }
    
    // Create database pool
    this.pool = new Pool({
      connectionString: options.connectionString,
      ...options.poolConfig
    });
    
    // Create Drizzle instance
    this.drizzleDb = drizzle(this.pool);
    
    // Create Circuit Breaker
    this.circuitBreaker = new CircuitBreaker({
      name: `db-${this.databaseName}`,
      failureThreshold: 3,
      resetTimeout: 10000, // 10 seconds
      halfOpenSuccessThreshold: 2,
      timeout: 5000, // 5 seconds
      healthCheck: this.healthCheck.bind(this),
      healthCheckInterval: 30000, // 30 seconds
      ...options.circuitBreaker
    });
    
    // Setup circuit breaker event listeners
    this.setupCircuitBreakerEvents();
  }
  
  /**
   * Run a SQL query through the circuit breaker
   */
  public async query<T = any>(
    text: string,
    params: any[] = []
  ): Promise<QueryResult<T>> {
    return this.circuitBreaker.execute(() => this.pool.query<T>(text, params));
  }
  
  /**
   * Execute a parameterized Drizzle query through the circuit breaker
   */
  public async execute<T = any>(query: any): Promise<T> {
    return this.circuitBreaker.execute(() => this.drizzleDb.execute(query));
  }
  
  /**
   * Get a client from the pool with circuit breaker protection
   */
  public async getClient(): Promise<PoolClient> {
    return this.circuitBreaker.execute(() => this.pool.connect());
  }
  
  /**
   * Run a transaction with circuit breaker protection
   */
  public async transaction<T = any>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Health check for the database
   */
  private async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1 as connected');
      return result.rows[0].connected === 1;
    } catch (error) {
      this.logger('Database health check failed', { error });
      return false;
    }
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
   * Get Drizzle DB instance
   */
  public getDrizzle() {
    return this.drizzleDb;
  }
  
  /**
   * Clean up resources
   */
  public async destroy() {
    this.circuitBreaker.destroy();
    await this.pool.end();
  }
  
  /**
   * Setup circuit breaker event listeners
   */
  private setupCircuitBreakerEvents() {
    this.circuitBreaker.on('stateChange', (newState, prevState, stats) => {
      this.logger(`Database circuit state changed from ${prevState} to ${newState}`, { stats });
    });
    
    this.circuitBreaker.on('failure', (error, latency, stats) => {
      this.logger(`Database circuit recorded failure (${latency}ms)`, { error, stats });
    });
    
    this.circuitBreaker.on('success', (latency, stats) => {
      this.logger(`Database circuit recorded success (${latency}ms)`, { stats });
    });
    
    this.circuitBreaker.on('healthCheck', (isHealthy, stats) => {
      this.logger(`Database health check: ${isHealthy ? 'healthy' : 'unhealthy'}`, { stats });
    });
    
    this.circuitBreaker.on('healthCheckError', (error, stats) => {
      this.logger('Database health check error', { error, stats });
    });
    
    this.circuitBreaker.on('reset', (stats) => {
      this.logger('Database circuit reset', { stats });
    });
  }
}

/**
 * Create a database client with circuit breaker
 */
export function createDatabaseClient(options: DatabaseClientOptions): DatabaseClient {
  return new DatabaseClient(options);
}