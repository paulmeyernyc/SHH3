import { applyPartitionMigrations } from './migrations';
import { PartitionManager, PartitionConfig } from './partition-manager';

/**
 * Configure and set up table partitioning
 * 
 * This script can be run to set up partitioned tables in the database
 */
async function setupPartitioning() {
  console.log('Setting up table partitioning...');
  
  try {
    // First, apply the SQL migrations to create partitioned tables
    await applyPartitionMigrations();
    console.log('Partition SQL migrations applied');
    
    // Then use the PartitionManager to create any additional partitions
    const partitionManager = new PartitionManager();
    
    // Configure claims table partitioning
    const claimsPartitionConfig: PartitionConfig = {
      tableName: 'claims_partitioned',
      partitionType: 'range',
      partitionColumn: 'created_at',
      columnType: 'timestamp'
    };
    
    // Configure FHIR resources table partitioning
    const fhirResourcesPartitionConfig: PartitionConfig = {
      tableName: 'fhir_resources_partitioned',
      partitionType: 'range',
      partitionColumn: 'created',
      columnType: 'timestamp'
    };
    
    // Create next year's partitions (for future data)
    const nextYear = new Date().getFullYear() + 1;
    await partitionManager.createDatePartitionsForYear('claims_partitioned', nextYear);
    await partitionManager.createDatePartitionsForYear('fhir_resources_partitioned', nextYear);
    
    console.log('Table partitioning setup complete');
    return true;
  } catch (error) {
    console.error('Error setting up table partitioning:', error);
    return false;
  }
}

// Export for use in server initialization
export { setupPartitioning };