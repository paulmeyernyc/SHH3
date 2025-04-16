/**
 * Health Check Client Library
 * 
 * This library provides a standardized way for microservices to:
 * 1. Report their health status to the central health check service
 * 2. Register themselves in the service registry
 * 3. Check the health of their dependencies
 * 4. Report performance metrics
 */

import axios from 'axios';
import os from 'os';
import { 
  HealthCheckResponse, 
  DependencyHealthCheck,
  healthCheckStatusEnum,
  dependencyTypeEnum,
  metricTypeEnum
} from '../../shared/health-check-schema';

interface MemoryUsage {
  rss: number;        // Resident Set Size - total memory allocated for the process
  heapTotal: number;  // Total size of the allocated heap
  heapUsed: number;   // Actual memory used during execution
  external: number;   // Memory used by C++ objects bound to JavaScript objects
  arrayBuffers?: number; // Memory used by ArrayBuffers and SharedArrayBuffers
}

interface CPUUsage {
  user: number;       // CPU time spent in user mode
  system: number;     // CPU time spent in system mode
  percent: number;    // CPU usage percentage
}

interface HealthCheckClientOptions {
  serviceName: string;
  version: string;
  description?: string;
  healthCheckServiceUrl?: string;
  autoRegister?: boolean;
  sendHeartbeat?: boolean;
  heartbeatInterval?: number; // in milliseconds
  dependencies?: Array<{
    name: string;
    type: keyof typeof dependencyTypeEnum.enumValues;
    required: boolean;
    healthCheckPath?: string;
    description?: string;
  }>;
}

interface MetricOptions {
  name: string;
  type: keyof typeof metricTypeEnum.enumValues;
  value: number | object;
  unit?: string;
  tags?: Record<string, string>;
  description?: string;
}

/**
 * Health Check Client
 * 
 * Used by microservices to report health status and metrics
 */
export class HealthCheckClient {
  private options: HealthCheckClientOptions;
  private healthCheckServiceUrl: string;
  private startTime: number;
  private heartbeatInterval?: NodeJS.Timeout;
  private dependencies: Map<string, DependencyHealthCheck>;
  private metrics: Map<string, any>;
  private serviceId?: number;
  private registered: boolean = false;
  
  constructor(options: HealthCheckClientOptions) {
    this.options = {
      autoRegister: true,
      sendHeartbeat: true,
      heartbeatInterval: 30000, // 30 seconds
      ...options
    };
    
    this.healthCheckServiceUrl = options.healthCheckServiceUrl || 
      process.env.HEALTH_CHECK_SERVICE_URL || 
      'http://health-check-service:4010';
    
    this.startTime = Date.now();
    this.dependencies = new Map();
    this.metrics = new Map();
    
    // Initialize dependencies
    if (options.dependencies) {
      for (const dep of options.dependencies) {
        this.dependencies.set(dep.name, {
          name: dep.name,
          type: dep.type,
          status: 'unknown' as any,
          message: 'Not checked yet'
        });
      }
    }
  }
  
  /**
   * Initialize the health check client
   */
  public async initialize(): Promise<void> {
    if (this.options.autoRegister) {
      await this.register();
    }
    
    if (this.options.sendHeartbeat && this.registered) {
      this.startHeartbeat();
    }
  }
  
  /**
   * Register the service with the Health Check Service
   */
  public async register(): Promise<boolean> {
    try {
      const response = await axios.post(`${this.healthCheckServiceUrl}/api/services`, {
        name: this.options.serviceName,
        version: this.options.version,
        description: this.options.description,
        status: 'online',
        baseUrl: process.env.SERVICE_URL || undefined,
        healthCheckPath: '/health'
      });
      
      this.serviceId = response.data.id;
      this.registered = true;
      
      // Register dependencies if any
      if (this.options.dependencies && this.serviceId) {
        for (const dep of this.options.dependencies) {
          await axios.post(`${this.healthCheckServiceUrl}/api/services/${this.serviceId}/dependencies`, {
            dependencyName: dep.name,
            dependencyType: dep.type,
            isRequired: dep.required,
            healthCheckPath: dep.healthCheckPath,
            description: dep.description
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to register service with Health Check Service:', error);
      this.registered = false;
      return false;
    }
  }
  
  /**
   * Start sending heartbeats to the Health Check Service
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        if (!this.serviceId) return;
        
        const healthCheck = await this.getHealthCheck();
        
        await axios.post(`${this.healthCheckServiceUrl}/api/services/${this.serviceId}/heartbeat`, {
          status: healthCheck.status,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to send heartbeat:', error);
      }
    }, this.options.heartbeatInterval);
  }
  
  /**
   * Stop sending heartbeats
   */
  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }
  
  /**
   * Clean up resources
   */
  public async shutdown(): Promise<void> {
    this.stopHeartbeat();
    
    // Update service status to offline
    if (this.serviceId && this.registered) {
      try {
        await axios.patch(`${this.healthCheckServiceUrl}/api/services/${this.serviceId}`, {
          status: 'offline',
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to update service status to offline:', error);
      }
    }
  }
  
  /**
   * Add or update a dependency status
   */
  public updateDependencyStatus(
    name: string, 
    status: keyof typeof healthCheckStatusEnum.enumValues,
    options?: {
      responseTime?: number;
      message?: string;
      details?: Record<string, any>;
    }
  ): void {
    const dependency = this.dependencies.get(name);
    
    if (!dependency) {
      console.warn(`Dependency ${name} not registered`);
      return;
    }
    
    this.dependencies.set(name, {
      ...dependency,
      status,
      responseTime: options?.responseTime,
      message: options?.message,
      details: options?.details
    });
    
    // If registered, send update to health check service
    if (this.serviceId && this.registered) {
      this.reportDependencyStatus(name, status, options).catch(error => {
        console.error(`Failed to report dependency status for ${name}:`, error);
      });
    }
  }
  
  /**
   * Report a dependency status to the Health Check Service
   */
  private async reportDependencyStatus(
    name: string,
    status: keyof typeof healthCheckStatusEnum.enumValues,
    options?: {
      responseTime?: number;
      message?: string;
      details?: Record<string, any>;
    }
  ): Promise<void> {
    if (!this.serviceId) return;
    
    try {
      await axios.post(
        `${this.healthCheckServiceUrl}/api/services/${this.serviceId}/dependencies/${name}/status`,
        {
          status,
          responseTime: options?.responseTime,
          message: options?.message,
          details: options?.details,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error(`Failed to report dependency status for ${name}:`, error);
    }
  }
  
  /**
   * Add or update a metric
   */
  public reportMetric(options: MetricOptions): void {
    this.metrics.set(options.name, {
      ...options,
      timestamp: new Date().toISOString()
    });
    
    // If registered, send to health check service
    if (this.serviceId && this.registered) {
      this.sendMetricToHealthCheckService(options).catch(error => {
        console.error(`Failed to send metric ${options.name}:`, error);
      });
    }
  }
  
  /**
   * Send a metric to the Health Check Service
   */
  private async sendMetricToHealthCheckService(options: MetricOptions): Promise<void> {
    if (!this.serviceId) return;
    
    try {
      await axios.post(
        `${this.healthCheckServiceUrl}/api/services/${this.serviceId}/metrics`,
        {
          name: options.name,
          type: options.type,
          value: options.value,
          unit: options.unit,
          timestamp: new Date().toISOString(),
          tags: options.tags,
          description: options.description
        }
      );
    } catch (error) {
      console.error(`Failed to send metric ${options.name}:`, error);
    }
  }
  
  /**
   * Get memory usage information
   */
  private getMemoryUsage(): MemoryUsage {
    const memoryUsage = process.memoryUsage();
    
    return {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers
    };
  }
  
  /**
   * Get CPU usage information
   */
  private getCpuUsage(): CPUUsage {
    const cpus = os.cpus();
    let totalUser = 0;
    let totalSystem = 0;
    let totalIdle = 0;
    
    for (const cpu of cpus) {
      totalUser += cpu.times.user;
      totalSystem += cpu.times.sys;
      totalIdle += cpu.times.idle;
    }
    
    const total = totalUser + totalSystem + totalIdle;
    const percent = ((totalUser + totalSystem) / total) * 100;
    
    return {
      user: totalUser,
      system: totalSystem,
      percent: parseFloat(percent.toFixed(2))
    };
  }
  
  /**
   * Check dependencies health
   */
  public async checkDependenciesHealth(): Promise<DependencyHealthCheck[]> {
    const results: DependencyHealthCheck[] = [];
    
    for (const [name, dependency] of this.dependencies.entries()) {
      try {
        // Special handling for different dependency types
        switch(dependency.type) {
          case 'service': {
            // For service dependencies, try to call their health endpoint
            if (dependency.healthCheckPath) {
              const startTime = Date.now();
              const response = await axios.get(dependency.healthCheckPath, { timeout: 5000 });
              const responseTime = Date.now() - startTime;
              
              results.push({
                name,
                type: dependency.type,
                status: response.data.status || 'healthy',
                responseTime,
                message: response.data.message || 'OK',
                details: response.data.details
              });
            } else {
              results.push({
                name,
                type: dependency.type,
                status: 'warning',
                message: 'No health check path configured'
              });
            }
            break;
          }
          
          case 'database': {
            // For database dependencies, we would need specific DB client checks
            // Here's a placeholder for custom DB health check logic
            results.push({
              name,
              type: dependency.type,
              status: 'unknown',
              message: 'Database health check not implemented'
            });
            break;
          }
          
          default: {
            // For other dependency types
            results.push({
              name,
              type: dependency.type,
              status: 'unknown',
              message: `Health check for ${dependency.type} not implemented`
            });
          }
        }
      } catch (error) {
        let message = 'Connection failed';
        if (error instanceof Error) {
          message = error.message;
        }
        
        results.push({
          name,
          type: dependency.type,
          status: 'unhealthy',
          message
        });
      }
    }
    
    // Update dependencies map with results
    for (const result of results) {
      this.dependencies.set(result.name, result);
      
      // Also report to health check service
      if (this.serviceId && this.registered) {
        this.reportDependencyStatus(
          result.name, 
          result.status as any, 
          {
            responseTime: result.responseTime,
            message: result.message,
            details: result.details
          }
        ).catch(error => {
          console.error(`Failed to report dependency status for ${result.name}:`, error);
        });
      }
    }
    
    return results;
  }
  
  /**
   * Get health check response
   */
  public async getHealthCheck(): Promise<HealthCheckResponse> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000); // in seconds
    
    // Get memory and CPU metrics
    const memoryUsage = this.getMemoryUsage();
    const cpuUsage = this.getCpuUsage();
    
    // Auto-report some metrics
    this.reportMetric({
      name: 'memory.usage',
      type: 'gauge',
      value: memoryUsage.heapUsed,
      unit: 'bytes',
      description: 'Heap memory usage'
    });
    
    this.reportMetric({
      name: 'cpu.usage',
      type: 'gauge',
      value: cpuUsage.percent,
      unit: 'percent',
      description: 'CPU usage percentage'
    });
    
    // Check dependencies if any
    let dependencyChecks: DependencyHealthCheck[] = [];
    if (this.dependencies.size > 0) {
      dependencyChecks = await this.checkDependenciesHealth();
    }
    
    // Determine overall status based on dependencies
    let status: keyof typeof healthCheckStatusEnum.enumValues = 'healthy';
    let message = 'Service is healthy';
    
    const requiredDependencies = Array.from(this.dependencies.values())
      .filter(dep => {
        const depConfig = this.options.dependencies?.find(d => d.name === dep.name);
        return depConfig?.required === true;
      });
    
    const unhealthyRequired = requiredDependencies.filter(dep => dep.status === 'unhealthy');
    const degradedDeps = Array.from(this.dependencies.values()).filter(dep => dep.status === 'degraded');
    const warningDeps = Array.from(this.dependencies.values()).filter(dep => dep.status === 'warning');
    
    if (unhealthyRequired.length > 0) {
      status = 'unhealthy';
      message = `Required dependencies unhealthy: ${unhealthyRequired.map(d => d.name).join(', ')}`;
    } else if (degradedDeps.length > 0) {
      status = 'degraded';
      message = `Some dependencies degraded: ${degradedDeps.map(d => d.name).join(', ')}`;
    } else if (warningDeps.length > 0) {
      status = 'warning';
      message = `Some dependencies have warnings: ${warningDeps.map(d => d.name).join(', ')}`;
    }
    
    // Compile the health check response
    const healthCheckResponse: HealthCheckResponse = {
      status,
      version: this.options.version,
      uptime,
      timestamp: new Date().toISOString(),
      message,
      dependencies: dependencyChecks,
      details: {
        hostname: os.hostname(),
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version
      },
      metrics: {
        memory: memoryUsage,
        cpu: cpuUsage,
        ...Object.fromEntries(this.metrics)
      }
    };
    
    // If registered, report health check result
    if (this.serviceId && this.registered) {
      this.reportHealthCheck(healthCheckResponse).catch(error => {
        console.error('Failed to report health check result:', error);
      });
    }
    
    return healthCheckResponse;
  }
  
  /**
   * Report health check result to the Health Check Service
   */
  private async reportHealthCheck(healthCheck: HealthCheckResponse): Promise<void> {
    if (!this.serviceId) return;
    
    try {
      await axios.post(
        `${this.healthCheckServiceUrl}/api/services/${this.serviceId}/health-checks`,
        {
          status: healthCheck.status,
          responseTime: 0, // Not applicable for self-check
          uptime: healthCheck.uptime,
          memoryUsage: healthCheck.metrics?.memory,
          cpuUsage: healthCheck.metrics?.cpu,
          message: healthCheck.message,
          details: healthCheck.details
        }
      );
    } catch (error) {
      console.error('Failed to report health check result:', error);
    }
  }
  
  /**
   * Express/Connect middleware for health check endpoint
   */
  public healthCheckMiddleware() {
    return async (req: any, res: any) => {
      const healthCheck = await this.getHealthCheck();
      
      res.status(healthCheck.status === 'unhealthy' ? 503 : 200)
         .json(healthCheck);
    };
  }
}