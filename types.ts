/**
 * Shard configuration
 */
export interface ShardConfig {
  shardId: string;
  connectionString: string;
  isActive: boolean;
  readOnly?: boolean;
  weight?: number;
}

/**
 * Range configuration for shard routing
 */
export interface ShardRangeConfig {
  min: string | number;
  max: string | number;
  shardId: string;
}

/**
 * Entity routing rule for shard assignment
 */
export interface ShardRoute {
  entityType: string;
  keyField: string;
  ranges: ShardRangeConfig[];
}