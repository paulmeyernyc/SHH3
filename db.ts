/**
 * Database Connection Module for Batch Service
 * 
 * This module sets up the database connection for the batch service
 * using the Drizzle ORM with PostgreSQL/Neon.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as batchSchema from '../../../shared/batch-schema';

// Configure Neon for WebSocket support
neonConfig.webSocketConstructor = ws;

// Get database connection from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

// Create connection pool
const pool = new Pool({ connectionString: DATABASE_URL });

// Initialize Drizzle with schema
export const db = drizzle(pool, { schema: batchSchema });

// Handle connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

// Export pool for direct use when needed
export { pool };

// For clean shutdown
export function closeDatabase() {
  return pool.end();
}