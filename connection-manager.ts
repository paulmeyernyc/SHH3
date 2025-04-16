import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { modelRegistry, allRelations } from '@shared/models';
import { dbConfig } from './config';
import { ShardManager } from './sharding/shard-manager';

/**
 * Database Connection Manager
 * 
 * Manages read/write splitting, connection pooling and query routing
 * for the database layer.
 */
export class ConnectionManager {
  private mainPool: Pool;
  private readPools: Pool[] = [];
  private lastReadPoolIndex: number = 0;
  private shardManager: ShardManager | null = null;

  /**
   * Initialize the connection manager
   */
  constructor() {
    console.log('Initializing ConnectionManager...');
    
    // Use the DATABASE_URL directly to avoid issues
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required');
    }
    
    // Create main write pool
    this.mainPool = new Pool({
      connectionString: dbUrl
    });
    
    // Create read replica pools if available
    const readUrls = process.env.READ_DATABASE_URLS;
    if (readUrls) {
      const readConnectionStrings = readUrls.split(',');
      if (readConnectionStrings.length > 0) {
        this.readPools = readConnectionStrings.map(connString => {
          return new Pool({ connectionString: connString });
        });
        console.log(`Initialized ${this.readPools.length} read replica pools`);
      }
    } else {
      console.log('No read replicas configured, using main pool for reads');
    }
    
    // Initialize sharding if enabled (temporarily disabled for MVP)
    // We'll implement the ShardManager in a future iteration
    /* 
    if (process.env.ENABLE_SHARDING === 'true') {
      this.shardManager = new ShardManager(...);
      console.log('Database sharding enabled');
    }
    */
  }

  /**
   * Get the main write database client
   */
  getWriteClient() {
    return drizzle(this.mainPool, { 
      schema: { ...modelRegistry, ...allRelations } 
    });
  }

  /**
   * Get a read-only database client using round-robin selection
   */
  getReadClient() {
    // If no read replicas, use main pool
    if (this.readPools.length === 0) {
      return drizzle(this.mainPool, { 
        schema: { ...modelRegistry, ...allRelations } 
      });
    }
    
    // Round-robin selection of read replica
    this.lastReadPoolIndex = (this.lastReadPoolIndex + 1) % this.readPools.length;
    const pool = this.readPools[this.lastReadPoolIndex];
    
    return drizzle(pool, { 
      schema: { ...modelRegistry, ...allRelations } 
    });
  }

  /**
   * Get a client for a specific entity and key
   */
  getClientForEntity(entityType: string, key: string | number, forWrite: boolean = false) {
    // Currently we don't have sharding fully implemented
    // Use standard read/write client
    return forWrite ? this.getWriteClient() : this.getReadClient();
    
    // This will be implemented in future versions
    /*
    if (!this.shardManager) {
      return forWrite ? this.getWriteClient() : this.getReadClient();
    }
    
    // Get the appropriate pool from shard manager
    const pool = this.shardManager.getPoolForEntity(entityType, key, forWrite);
    
    return drizzle(pool, { 
      schema: { ...modelRegistry, ...allRelations } 
    });
    */
  }

  /**
   * Get the raw connection pool (for advanced use cases)
   */
  getRawPool(forWrite: boolean = true) {
    if (forWrite) {
      return this.mainPool;
    } else if (this.readPools.length > 0) {
      // Round-robin selection
      this.lastReadPoolIndex = (this.lastReadPoolIndex + 1) % this.readPools.length;
      return this.readPools[this.lastReadPoolIndex];
    } else {
      return this.mainPool;
    }
  }

  /**
   * Close all database connections
   */
  async closeAll() {
    const closingPromises: Promise<void>[] = [];
    
    console.log('Closing all database connections...');
    
    // Close main pool
    closingPromises.push(this.mainPool.end());
    
    // Close read pools
    this.readPools.forEach(pool => {
      closingPromises.push(pool.end());
    });
    
    // Sharding is disabled for now, this will be used in future versions
    /*
    // Close shard pools if different from main/read pools
    if (this.shardManager) {
      const shardClosingPromises = this.shardManager.closeAllPools();
      closingPromises.push(...shardClosingPromises);
    }
    */
    
    await Promise.all(closingPromises);
    console.log('All database connections closed');
  }
}