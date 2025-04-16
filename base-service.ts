/**
 * Base Service
 * 
 * This module provides a base class for all microservices in the Smart Health Hub platform.
 * It handles common functionality like:
 * - Express server setup and configuration
 * - Middleware registration
 * - Error handling
 * - Health checks
 * - Graceful shutdown
 * - Observability (logging, metrics, tracing)
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

// Database configuration interface
export interface DatabaseConfig {
  url: string;
  sslEnabled?: boolean;
  maxConnections?: number;
  idleTimeout?: number;
}

// Dependencies configuration interface
export interface DependenciesConfig {
  services: string[];
  databases?: string[];
  external?: string[];
}

// Service configuration interface
export interface ServiceConfig {
  name: string;
  version: string;
  description: string;
  port: number;
  environment: 'development' | 'test' | 'production';
  database?: DatabaseConfig;
  dependencies?: DependenciesConfig;
}

/**
 * Base Service Class
 * 
 * Provides common functionality for all microservices.
 */
export abstract class BaseService {
  protected app: Express;
  protected server: Server | null = null;
  protected config: ServiceConfig;
  protected pool: Pool | null = null;
  
  constructor(config: ServiceConfig) {
    this.config = config;
    this.app = express();
    
    // Configure Express
    this.configureMiddleware();
    
    // Configure database if needed
    if (config.database?.url) {
      this.pool = new Pool({ 
        connectionString: config.database.url 
      });
    }
    
    // Configure routes
    this.configureRoutes();
  }
  
  /**
   * Configure Express middleware
   */
  private configureMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());
    
    // Parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Logging middleware
    this.app.use(morgan(this.config.environment === 'development' ? 'dev' : 'combined'));
    
    // Health check endpoint
    this.app.get('/health', function(req: Request, res: Response) {
      res.json({
        status: 'ok',
        service: this.config.name,
        version: this.config.version,
        environment: this.config.environment,
        timestamp: new Date().toISOString()
      });
    }.bind(this));
    
    // Error handling middleware
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error(`[${this.config.name}] Error:`, err);
      
      // Return error response
      res.status(err.status || 500).json({
        error: {
          message: err.message || 'Internal Server Error',
          code: err.code || 'INTERNAL_ERROR',
          status: err.status || 500
        }
      });
    });
  }
  
  /**
   * Configure service-specific routes
   */
  private configureRoutes(): void {
    // Register routes
    this.registerRoutes();
    
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: {
          message: 'Not Found',
          code: 'NOT_FOUND',
          status: 404
        }
      });
    });
  }
  
  /**
   * Start the service
   */
  public async start(): Promise<void> {
    try {
      // Initialize service-specific components
      await this.initialize();
      
      // Start HTTP server
      this.server = this.app.listen(this.config.port, () => {
        console.log(`[${this.config.name}] Service running on port ${this.config.port}`);
        console.log(`[${this.config.name}] Environment: ${this.config.environment}`);
      });
    } catch (error) {
      console.error(`[${this.config.name}] Failed to start service:`, error);
      throw error;
    }
  }
  
  /**
   * Stop the service
   */
  public async stop(): Promise<void> {
    try {
      // Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server?.close((err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      
      // Close database connection
      if (this.pool) {
        await this.pool.end();
      }
      
      console.log(`[${this.config.name}] Service stopped`);
    } catch (error) {
      console.error(`[${this.config.name}] Failed to stop service:`, error);
      throw error;
    }
  }
  
  /**
   * Initialize service-specific components
   * 
   * This method should be implemented by derived classes.
   */
  protected abstract initialize(): Promise<void>;
  
  /**
   * Register service-specific routes
   * 
   * This method should be implemented by derived classes.
   */
  protected abstract registerRoutes(): void;
}