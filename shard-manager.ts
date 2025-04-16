import { Pool } from '@neondatabase/serverless';
import { ShardConfig, ShardRoute, ShardRangeConfig } from './types';

/**
 * Shard Manager handles database sharding and routing
 */
export class ShardManager {
  private shardPools: Map<string, Pool> = new Map();
  private routeMap: Map<string, ShardRangeConfig[]> = new Map();
  
  /**
   * Initialize the shard manager
   */
  constructor(
    private shardConfigs: ShardConfig[],
    private shardRoutes: ShardRoute[]
  ) {
    this.initializeShards();
    this.initializeRoutes();
  }
  
  /**
   * Initialize shard connections
   */
  private initializeShards() {
    for (const config of this.shardConfigs) {
      if (config.isActive) {
        const pool = new Pool({
          connectionString: config.connectionString
        });
        
        this.shardPools.set(config.shardId, pool);
        console.log(`Initialized shard: ${config.shardId}`);
      }
    }
  }
  
  /**
   * Initialize routing rules
   */
  private initializeRoutes() {
    for (const route of this.shardRoutes) {
      const key = this.getRouteKey(route.entityType, route.keyField);
      this.routeMap.set(key, route.ranges);
    }
  }
  
  /**
   * Generate a route key for lookup
   */
  private getRouteKey(entityType: string, keyField: string): string {
    return `${entityType}:${keyField}`;
  }
  
  /**
   * Find the shard ID for a given entity and key
   */
  private findShardForKey(
    entityType: string,
    keyField: string,
    keyValue: string | number
  ): string | null {
    const routeKey = this.getRouteKey(entityType, keyField);
    const ranges = this.routeMap.get(routeKey);
    
    if (!ranges) {
      return null;
    }
    
    // Convert key to comparable value
    const numValue = typeof keyValue === 'number' 
      ? keyValue 
      : parseInt(keyValue, 10);
    
    // Find matching range
    for (const range of ranges) {
      const min = typeof range.min === 'number' 
        ? range.min 
        : parseInt(range.min, 10);
        
      const max = typeof range.max === 'number' 
        ? range.max 
        : parseInt(range.max, 10);
      
      if (numValue >= min && numValue < max) {
        return range.shardId;
      }
    }
    
    return null;
  }
  
  /**
   * Get a database pool for a specific entity and key
   */
  getPoolForEntity(
    entityType: string,
    key: string | number,
    forWrite: boolean = false
  ): Pool {
    // Default to first writeable shard if we can't determine the correct shard
    let shardId: string | null = null;
    
    // Try to find the shard based on entity type and key
    for (const route of this.shardRoutes) {
      if (route.entityType === entityType) {
        shardId = this.findShardForKey(
          entityType,
          route.keyField,
          key
        );
        if (shardId) break;
      }
    }
    
    if (shardId && this.shardPools.has(shardId)) {
      const pool = this.shardPools.get(shardId);
      
      // If we're in read mode, check if this shard is read-only
      const config = this.shardConfigs.find(c => c.shardId === shardId);
      
      if (forWrite && config?.readOnly) {
        // Can't write to a read-only shard, find a writable shard
        for (const [id, _] of this.shardPools) {
          const shardConfig = this.shardConfigs.find(c => c.shardId === id);
          if (!shardConfig?.readOnly) {
            return this.shardPools.get(id)!;
          }
        }
      }
      
      return pool!;
    }
    
    // No specific shard found, return default (first non-readonly for writes)
    if (forWrite) {
      for (const [id, pool] of this.shardPools) {
        const config = this.shardConfigs.find(c => c.shardId === id);
        if (!config?.readOnly) {
          return pool;
        }
      }
    }
    
    // Just return the first pool if we can't find anything else
    const firstPool = this.shardPools.values().next().value;
    return firstPool;
  }
  
  /**
   * Close all database connections to shards
   */
  closeAllPools(): Promise<void>[] {
    const closingPromises: Promise<void>[] = [];
    
    for (const [_, pool] of this.shardPools) {
      closingPromises.push(pool.end());
    }
    
    return closingPromises;
  }
}