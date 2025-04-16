/**
 * Service Discovery
 * 
 * Handles service discovery and load balancing for the API Gateway.
 */

import { 
  ServiceRegistryClient, 
  createServiceRegistryClient 
} from '../../service-registry/src/client';
import { ServiceInstance, ServiceStatus, ServiceType } from '../../service-registry/src/model';
import { ServiceInfo } from './model';
import { AppError } from '../../common/error/app-error';
import { ErrorCode } from '../../common/error/error-types';

/**
 * Service discovery configuration
 */
export interface ServiceDiscoveryConfig {
  registryUrl: string;
  refreshInterval?: number; // in milliseconds
  cacheTtl?: number; // in milliseconds
}

/**
 * Service discovery and load balancing
 */
export class ServiceDiscovery {
  private client: ServiceRegistryClient;
  private servicesCache: Map<string, ServiceInfo[]> = new Map();
  private lastCacheRefresh: Map<string, number> = new Map();
  private config: ServiceDiscoveryConfig;
  private refreshTimer?: NodeJS.Timeout;

  constructor(config: ServiceDiscoveryConfig) {
    this.config = {
      refreshInterval: 30000, // 30 seconds
      cacheTtl: 10000, // 10 seconds
      ...config
    };

    this.client = createServiceRegistryClient({
      registryUrl: this.config.registryUrl,
      onError: (error) => {
        console.error('Service discovery error:', error.message);
      }
    });

    // Start cache refresh timer
    this.startCacheRefresh();
  }

  /**
   * Get a service instance by name and version (with load balancing)
   */
  async getService(serviceName: string, version?: string): Promise<ServiceInfo> {
    const cacheKey = version ? `${serviceName}:${version}` : serviceName;
    const now = Date.now();

    // Check if cache is fresh enough
    const lastRefresh = this.lastCacheRefresh.get(cacheKey) || 0;
    const cacheTtl = this.config.cacheTtl || 10000;

    if (now - lastRefresh > cacheTtl) {
      await this.refreshServiceCache(serviceName, version);
    }

    // Get services from cache
    const services = this.servicesCache.get(cacheKey) || [];

    if (services.length === 0) {
      throw AppError.serviceUnavailable(serviceName, {
        details: { version }
      });
    }

    // Implement weighted round-robin load balancing
    // For simplicity, we'll just pick a random service based on weight
    // In a real implementation, this would be more sophisticated
    return this.selectServiceByWeight(services);
  }

  /**
   * Select a service by weight (weighted random selection)
   */
  private selectServiceByWeight(services: ServiceInfo[]): ServiceInfo {
    // Sum of all weights
    const totalWeight = services.reduce((sum, service) => sum + service.weight, 0);

    // Pick a random weight
    const random = Math.random() * totalWeight;

    // Find the service that corresponds to the random weight
    let cumulativeWeight = 0;
    for (const service of services) {
      cumulativeWeight += service.weight;
      if (random <= cumulativeWeight) {
        return service;
      }
    }

    // Fallback to the first service (should never happen unless weights are zero)
    return services[0];
  }

  /**
   * Refresh the service cache for a specific service
   */
  private async refreshServiceCache(serviceName: string, version?: string): Promise<void> {
    try {
      const cacheKey = version ? `${serviceName}:${version}` : serviceName;

      // Find active instances of the service
      const instances = await this.client.discover({
        name: serviceName,
        version,
        active: true,
        status: ServiceStatus.UP,
        type: ServiceType.REST
      });

      // Transform to ServiceInfo objects
      const services: ServiceInfo[] = instances.map(instance => this.transformToServiceInfo(instance));

      // Update cache
      this.servicesCache.set(cacheKey, services);
      this.lastCacheRefresh.set(cacheKey, Date.now());
    } catch (error) {
      console.error(`Failed to refresh service cache for ${serviceName}:`, error);
      // Don't throw, just log the error and let the caller use the existing cache
    }
  }

  /**
   * Start the cache refresh timer
   */
  private startCacheRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      // Refresh all service caches
      const cacheKeys = Array.from(this.servicesCache.keys());
      
      for (const cacheKey of cacheKeys) {
        const [serviceName, version] = cacheKey.split(':');
        await this.refreshServiceCache(serviceName, version);
      }
    }, this.config.refreshInterval);

    // Ensure timer doesn't prevent Node from exiting
    this.refreshTimer.unref();
  }

  /**
   * Transform a service instance to service info
   */
  private transformToServiceInfo(instance: ServiceInstance): ServiceInfo {
    const secure = !!instance.securePort;
    const port = secure ? instance.securePort! : instance.port;
    const protocol = secure ? 'https' : 'http';
    
    // Construct base URL
    const url = `${protocol}://${instance.host}:${port}`;
    
    // Find health endpoint
    let healthUrl: string | undefined;
    const healthEndpoint = instance.endpoints.find(e => 
      e.path === '/health' || e.path === '/api/health'
    );
    
    if (healthEndpoint) {
      healthUrl = `${url}${healthEndpoint.path}`;
    }
    
    return {
      id: instance.id,
      name: instance.name,
      version: instance.version,
      url,
      healthUrl,
      active: instance.status === ServiceStatus.UP,
      weight: instance.weight
    };
  }

  /**
   * Clean up resources
   */
  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }
}

/**
 * Create a service discovery instance
 */
export function createServiceDiscovery(config: ServiceDiscoveryConfig): ServiceDiscovery {
  return new ServiceDiscovery(config);
}