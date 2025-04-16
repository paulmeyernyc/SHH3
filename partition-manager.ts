import { Pool } from '@neondatabase/serverless';
import { format } from 'date-fns';

/**
 * Configuration for a partitioned table
 */
export interface PartitionConfig {
  tableName: string;
  partitionType: 'range' | 'list' | 'hash';
  partitionColumn: string;
  columnType: 'timestamp' | 'integer' | 'string';
}

/**
 * Partition Manager handles the creation and management of table partitions
 */
export class PartitionManager {
  /**
   * Initialize the partition manager
   */
  constructor(private pool?: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new partition for a table based on a date range
   * 
   * @param tableName The name of the partitioned table
   * @param startDate Start date for the partition (inclusive)
   * @param endDate End date for the partition (exclusive)
   * @param partitionName Optional name for the partition
   */
  async createDatePartition(
    tableName: string,
    startDate: Date,
    endDate: Date,
    partitionName?: string
  ): Promise<boolean> {
    try {
      // Generate partition name if not provided
      if (!partitionName) {
        const formattedDate = format(startDate, 'yyyyMM');
        partitionName = `${tableName}_p${formattedDate}`;
      }
      
      // Format dates for SQL
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      
      // Construct SQL
      const sql = `
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${tableName}
        FOR VALUES FROM ('${startDateStr}') TO ('${endDateStr}');
      `;
      
      // Execute SQL
      await this.pool?.query(sql);
      console.log(`Created partition ${partitionName} for ${tableName}`);
      return true;
    } catch (error) {
      console.error(`Error creating partition for ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Create partitions for an entire year
   * 
   * @param tableName The name of the partitioned table
   * @param year The year to create partitions for
   * @param monthlyPartitions Whether to create monthly partitions (default) or quarterly
   */
  async createDatePartitionsForYear(
    tableName: string,
    year: number,
    monthlyPartitions: boolean = true
  ): Promise<boolean> {
    try {
      if (monthlyPartitions) {
        // Create monthly partitions
        for (let month = 1; month <= 12; month++) {
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 1);
          
          await this.createDatePartition(
            tableName,
            startDate,
            endDate,
            `${tableName}_y${year}m${month.toString().padStart(2, '0')}`
          );
        }
      } else {
        // Create quarterly partitions
        for (let quarter = 1; quarter <= 4; quarter++) {
          const startMonth = (quarter - 1) * 3 + 1;
          const endMonth = quarter * 3 + 1;
          
          const startDate = new Date(year, startMonth - 1, 1);
          const endDate = new Date(year, endMonth - 1, 1);
          
          await this.createDatePartition(
            tableName,
            startDate,
            endDate,
            `${tableName}_y${year}q${quarter}`
          );
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error creating partitions for ${tableName} for year ${year}:`, error);
      return false;
    }
  }

  /**
   * Create a new partition for a table based on a numeric range
   * 
   * @param tableName The name of the partitioned table
   * @param min Minimum value for the partition (inclusive)
   * @param max Maximum value for the partition (exclusive) 
   * @param partitionName Optional name for the partition
   */
  async createNumericPartition(
    tableName: string,
    min: number,
    max: number,
    partitionName?: string
  ): Promise<boolean> {
    try {
      // Generate partition name if not provided
      if (!partitionName) {
        partitionName = `${tableName}_${min}_to_${max}`;
      }
      
      // Construct SQL
      const sql = `
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${tableName}
        FOR VALUES FROM (${min}) TO (${max});
      `;
      
      // Execute SQL
      await this.pool?.query(sql);
      console.log(`Created partition ${partitionName} for ${tableName}`);
      return true;
    } catch (error) {
      console.error(`Error creating partition for ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Detach a partition from a partitioned table
   * 
   * @param tableName The name of the partitioned table
   * @param partitionName The name of the partition to detach
   */
  async detachPartition(
    tableName: string,
    partitionName: string
  ): Promise<boolean> {
    try {
      // Construct SQL
      const sql = `
        ALTER TABLE ${tableName} DETACH PARTITION ${partitionName};
      `;
      
      // Execute SQL
      await this.pool?.query(sql);
      console.log(`Detached partition ${partitionName} from ${tableName}`);
      return true;
    } catch (error) {
      console.error(`Error detaching partition ${partitionName} from ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Attach a previously detached partition to a partitioned table
   * 
   * @param tableName The name of the partitioned table
   * @param partitionName The name of the partition to attach
   * @param startDate Start date for the partition (inclusive)
   * @param endDate End date for the partition (exclusive)
   */
  async attachDatePartition(
    tableName: string,
    partitionName: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    try {
      // Format dates for SQL
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      
      // Construct SQL
      const sql = `
        ALTER TABLE ${tableName} ATTACH PARTITION ${partitionName}
        FOR VALUES FROM ('${startDateStr}') TO ('${endDateStr}');
      `;
      
      // Execute SQL
      await this.pool?.query(sql);
      console.log(`Attached partition ${partitionName} to ${tableName}`);
      return true;
    } catch (error) {
      console.error(`Error attaching partition ${partitionName} to ${tableName}:`, error);
      return false;
    }
  }
}