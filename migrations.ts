import { pool } from '../index';

/**
 * SQL migrations for setting up partitioned tables
 */
export const createClaimsPartitionedTableSQL = `
CREATE TABLE IF NOT EXISTS claims_partitioned (
  id SERIAL,
  claim_id TEXT NOT NULL UNIQUE,
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  date TEXT,
  amount TEXT,
  status TEXT DEFAULT 'submitted',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);
`;

export const createClaimsMonthlyPartitions = `
-- Create monthly partitions for 2023
CREATE TABLE IF NOT EXISTS claims_y2023m01 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m02 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m03 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-03-01') TO ('2023-04-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m04 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-04-01') TO ('2023-05-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m05 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-05-01') TO ('2023-06-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m06 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-06-01') TO ('2023-07-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m07 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-07-01') TO ('2023-08-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m08 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-08-01') TO ('2023-09-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m09 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-09-01') TO ('2023-10-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m10 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-10-01') TO ('2023-11-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m11 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-11-01') TO ('2023-12-01');
  
CREATE TABLE IF NOT EXISTS claims_y2023m12 PARTITION OF claims_partitioned
  FOR VALUES FROM ('2023-12-01') TO ('2024-01-01');
`;

export const createFhirResourcesPartitionedTableSQL = `
CREATE TABLE IF NOT EXISTS fhir_resources_partitioned (
  id SERIAL,
  resource_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created);
`;

export const createFhirResourcesMonthlyPartitions = `
-- Create monthly partitions for 2023
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m01 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m02 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m03 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-03-01') TO ('2023-04-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m04 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-04-01') TO ('2023-05-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m05 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-05-01') TO ('2023-06-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m06 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-06-01') TO ('2023-07-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m07 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-07-01') TO ('2023-08-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m08 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-08-01') TO ('2023-09-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m09 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-09-01') TO ('2023-10-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m10 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-10-01') TO ('2023-11-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m11 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-11-01') TO ('2023-12-01');
  
CREATE TABLE IF NOT EXISTS fhir_resources_y2023m12 PARTITION OF fhir_resources_partitioned
  FOR VALUES FROM ('2023-12-01') TO ('2024-01-01');
`;

/**
 * Apply all migrations for partitioned tables
 */
export async function applyPartitionMigrations(): Promise<void> {
  try {
    // Create partitioned claims table
    await pool.query(createClaimsPartitionedTableSQL);
    await pool.query(createClaimsMonthlyPartitions);
    
    // Create partitioned FHIR resources table
    await pool.query(createFhirResourcesPartitionedTableSQL);
    await pool.query(createFhirResourcesMonthlyPartitions);
    
    console.log('Partition migrations applied successfully');
  } catch (error) {
    console.error('Error applying partition migrations:', error);
    throw error;
  }
}