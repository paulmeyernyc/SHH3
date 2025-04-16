/**
 * Database Configuration Manager
 * 
 * Centralizes database configuration and provides a clean interface
 * for accessing configuration across the application.
 */

// Types for sharding configuration
export type ShardingKey = 'id' | 'username' | 'patient_id' | 'provider_id' | 'region';

export interface ShardConfig {
  id: string;
  connectionString: string;
  weight?: number; // Used for load balancing
  readOnly?: boolean;
}

export interface ShardRangeConfig {
  min: string | number;
  max: string | number;
  shardId: string;
}

export interface ShardRoute {
  entityType: string;
  keyField: ShardingKey;
  ranges: ShardRangeConfig[];
}

export class DatabaseConfig {
  private _mainConnectionString: string;
  private _readConnectionStrings: string[] = [];
  private _enableSharding: boolean = false;
  private _shardConfigs: ShardConfig[] = [];
  private _shardRoutes: ShardRoute[] = [];

  constructor() {
    // Load main connection string from environment
    this._mainConnectionString = process.env.DATABASE_URL || '';
    
    // Check for read replicas in environment
    if (process.env.READ_DATABASE_URLS) {
      this._readConnectionStrings = process.env.READ_DATABASE_URLS.split(',');
    }
    
    // Enable sharding based on environment
    this._enableSharding = process.env.ENABLE_SHARDING === 'true';
    
    if (this._enableSharding) {
      this.loadShardConfigurations();
    }
  }

  /**
   * Load shard configurations from environment or config sources
   */
  private loadShardConfigurations() {
    // In a real implementation, this would load from:
    // 1. Environment variables
    // 2. Configuration file
    // 3. Database configuration table
    
    // For demonstration, we'll define a simple sharding setup
    // using the main connection and read replicas
    
    // Define the main write shard
    this._shardConfigs.push({
      id: 'shard-main',
      connectionString: this._mainConnectionString,
      weight: 100,
      readOnly: false
    });
    
    // Define read replica shards
    this._readConnectionStrings.forEach((connStr, index) => {
      this._shardConfigs.push({
        id: `shard-read-${index}`,
        connectionString: connStr,
        weight: 100,
        readOnly: true
      });
    });
    
    // Define sharding routes
    this._shardRoutes = [
      // Shard users by ID ranges
      {
        entityType: 'users',
        keyField: 'id',
        ranges: [
          { min: 0, max: 1000000, shardId: 'shard-main' }
        ]
      },
      // Shard patients by ID ranges
      {
        entityType: 'patients',
        keyField: 'id',
        ranges: [
          { min: 0, max: 1000000, shardId: 'shard-main' }
        ]
      },
      // Shard FHIR resources by resource_id
      {
        entityType: 'fhir_resources',
        keyField: 'id', // Using 'id' because 'resource_id' is not a valid ShardingKey
        ranges: [
          { min: 0, max: 1000000, shardId: 'shard-main' }
        ]
      }
    ];
  }

  /**
   * The main write database connection string
   */
  get mainConnectionString(): string {
    return this._mainConnectionString;
  }

  /**
   * Array of read replica connection strings
   */
  get readConnectionStrings(): string[] {
    return this._readConnectionStrings;
  }

  /**
   * Whether database sharding is enabled
   */
  get enableSharding(): boolean {
    return this._enableSharding;
  }

  /**
   * Shard configuration objects
   */
  get shardConfigs(): ShardConfig[] {
    return this._shardConfigs;
  }

  /**
   * Entity routing rules for sharding
   */
  get shardRoutes(): ShardRoute[] {
    return this._shardRoutes;
  }
}

// Export a singleton instance
export const dbConfig = new DatabaseConfig();