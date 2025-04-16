/**
 * Base Service with Health Check Support
 * 
 * This is an extended version of the BaseService class that includes
 * built-in health check support, automatically registering with the
 * Health Check Service and providing standardized health check endpoints.
 */

import express, { Request, Response } from 'express';
import { BaseService } from './base-service';
import { HealthCheckClient } from './health-check-client';
import { healthCheckStatusEnum, dependencyTypeEnum } from '../../shared/health-check-schema';

interface ServiceDependency {
  name: string;
  type: keyof typeof dependencyTypeEnum.enumValues;
  required: boolean;
  healthCheckPath?: string;
  description?: string;
}

interface BaseServiceWithHealthOptions {
  name: string;
  version: string;
  description?: string;
  environment?: 'development' | 'test' | 'production';
  healthCheckPath?: string;
  dependencies?: ServiceDependency[];
  healthCheckServiceUrl?: string;
  autoRegisterWithHealthService?: boolean;
}

export class BaseServiceWithHealth extends BaseService {
  protected healthCheckClient: HealthCheckClient;
  protected healthCheckPath: string;
  protected serviceHealthEndpoint: string;
  
  constructor(options: BaseServiceWithHealthOptions) {
    super({
      name: options.name,
      version: options.version,
      environment: options.environment
    });
    
    this.healthCheckPath = options.healthCheckPath || '/health';
    this.serviceHealthEndpoint = this.healthCheckPath;
    
    // Initialize health check client
    this.healthCheckClient = new HealthCheckClient({
      serviceName: options.name,
      version: options.version,
      description: options.description,
      healthCheckServiceUrl: options.healthCheckServiceUrl || process.env.HEALTH_CHECK_SERVICE_URL,
      autoRegister: options.autoRegisterWithHealthService !== false,
      dependencies: options.dependencies
    });
  }
  
  /**
   * Initialize the service
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    
    // Initialize health check client
    await this.healthCheckClient.initialize();
    
    // Register health check endpoint
    if (this.app) {
      this.app.get(this.serviceHealthEndpoint, this.healthCheckClient.healthCheckMiddleware());
    }
  }
  
  /**
   * Stop the service
   */
  public async stop(): Promise<void> {
    // Shutdown health check client first
    await this.healthCheckClient.shutdown();
    
    // Then shutdown the service
    await super.stop();
  }
  
  /**
   * Update the status of a dependency
   */
  protected updateDependencyStatus(
    name: string, 
    status: keyof typeof healthCheckStatusEnum.enumValues,
    options?: {
      responseTime?: number;
      message?: string;
      details?: Record<string, any>;
    }
  ): void {
    this.healthCheckClient.updateDependencyStatus(name, status, options);
  }
  
  /**
   * Report a performance metric
   */
  protected reportMetric(options: {
    name: string;
    type: 'gauge' | 'counter' | 'histogram' | 'meter' | 'timer';
    value: number | object;
    unit?: string;
    tags?: Record<string, string>;
    description?: string;
  }): void {
    this.healthCheckClient.reportMetric(options);
  }
  
  /**
   * Start collecting and reporting standard metrics
   * at the specified interval (in milliseconds)
   */
  protected startMetricsCollection(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      const memoryUsage = process.memoryUsage();
      
      // Report memory usage
      this.reportMetric({
        name: 'memory.rss',
        type: 'gauge',
        value: memoryUsage.rss,
        unit: 'bytes',
        description: 'Resident Set Size - total memory allocated for the process'
      });
      
      this.reportMetric({
        name: 'memory.heapTotal',
        type: 'gauge',
        value: memoryUsage.heapTotal,
        unit: 'bytes',
        description: 'Total size of the allocated heap'
      });
      
      this.reportMetric({
        name: 'memory.heapUsed',
        type: 'gauge',
        value: memoryUsage.heapUsed,
        unit: 'bytes',
        description: 'Actual memory used during execution'
      });
      
      // Report uptime
      this.reportMetric({
        name: 'uptime',
        type: 'gauge',
        value: process.uptime(),
        unit: 'seconds',
        description: 'Service uptime in seconds'
      });
      
    }, intervalMs);
  }
}