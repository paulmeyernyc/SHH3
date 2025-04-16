/**
 * Observability Integration for Smart Health Hub
 * 
 * This file provides integration with the observability infrastructure
 * for the main Smart Health Hub application. It initializes and configures
 * the observability client and exposes middleware and utility functions.
 * 
 * Usage:
 * ```
 * // In server/index.ts
 * import { setupObservability, observabilityMiddleware } from './observability';
 * 
 * // Initialize observability early
 * setupObservability();
 * 
 * // Add middleware to Express app
 * app.use(observabilityMiddleware);
 * ```
 * 
 * Tracing example:
 * ```
 * import { withSpan } from './observability';
 * 
 * async function processPatient(patientId: string) {
 *   return await withSpan('process-patient', async (span) => {
 *     span.setAttribute('patientId', patientId);
 *     
 *     // Your processing logic here
 *     
 *     return result;
 *   });
 * }
 * ```
 * 
 * Logging example:
 * ```
 * import { logger } from './observability';
 * 
 * logger.info('Patient data processed', { patientId, processingTimeMs });
 * logger.error('Failed to process patient', error, { patientId });
 * ```
 * 
 * Metrics example:
 * ```
 * import { incrementCounter, recordHistogram } from './observability';
 * 
 * incrementCounter('patients_processed_total', 1, { type: 'registration' });
 * recordHistogram('patient_processing_duration_ms', processingTime, { type: 'registration' });
 * ```
 */

import { 
  ObservabilityClient, 
  createObservabilityMiddleware,
  createErrorHandlingMiddleware,
  createHealthCheckMiddleware,
  withSpan as clientWithSpan,
  SimpleSpan
} from '../microservices/observability/src';

// Create client instance with fallback capability
const observabilityClient = new ObservabilityClient({
  serviceName: 'healthcare-platform',
  serviceVersion: process.env.npm_package_version || '1.0.0',
  // Set to null to disable external service reporting when not available
  // This will use in-memory/local reporting only
  observabilityUrl: null,
  defaultContext: {
    environment: process.env.NODE_ENV || 'development',
    region: process.env.REGION || 'us-east-1'
  },
  enabled: {
    // Enable local tracing but disable external service connection
    tracing: true,
    logging: true,
    metrics: true
  }
});

// Create middleware array
export const observabilityMiddleware = [
  ...createObservabilityMiddleware(observabilityClient),
  // Add the error handling middleware at the end
  createErrorHandlingMiddleware(observabilityClient)
];

// Create health check middleware
export const healthCheckMiddleware = createHealthCheckMiddleware(async () => {
  // You can add custom health checks here
  return {
    status: 'ok',
    details: {
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  };
});

/**
 * Initialize observability (should be called early in application startup)
 */
export function setupObservability(): void {
  // Log startup
  observabilityClient.info('Application starting', {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  });
  
  // Set up global error handlers
  process.on('uncaughtException', (err) => {
    observabilityClient.error('Uncaught exception', err);
    // Give time for the error to be reported before exiting
    setTimeout(() => process.exit(1), 1000);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    observabilityClient.error('Unhandled rejection', reason as Error);
  });
  
  // Log when process exits
  process.on('exit', (code) => {
    observabilityClient.info(`Process exiting with code ${code}`);
  });
  
  // Report startup success
  observabilityClient.incrementCounter('application_starts_total');
}

// Re-export key functions from the client for direct use
export function withSpan<T>(
  name: string, 
  operation: (span: SimpleSpan) => Promise<T>, 
  attributes: Record<string, any> = {}
): Promise<T> {
  return clientWithSpan(name, operation, { attributes });
}

// Logging shortcuts
export const logger = {
  error: (message: string, error?: Error, context?: Record<string, any>) => 
    observabilityClient.error(message, error, context),
    
  warn: (message: string, context?: Record<string, any>) => 
    observabilityClient.warn(message, context),
    
  info: (message: string, context?: Record<string, any>) => 
    observabilityClient.info(message, context),
    
  debug: (message: string, context?: Record<string, any>) => 
    observabilityClient.debug(message, context)
};

// Metrics shortcuts
export function incrementCounter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
  observabilityClient.incrementCounter(name, value, labels);
}

export function setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
  observabilityClient.setGauge(name, value, labels);
}

export function recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
  observabilityClient.recordHistogram(name, value, labels);
}

export async function measureTiming<T>(
  name: string, 
  operation: () => Promise<T>, 
  labels: Record<string, string> = {}
): Promise<T> {
  return observabilityClient.recordTiming(name, operation, labels);
}

/**
 * Track database query performance
 */
export async function trackDbQuery<T>(
  operation: string, 
  table: string, 
  queryFn: () => Promise<T>
): Promise<T> {
  return withSpan(`db:${operation}:${table}`, async (span) => {
    span.setAttribute('db.operation', operation);
    span.setAttribute('db.table', table);
    
    const startTime = Date.now();
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      // Record metrics
      recordHistogram('database_query_duration_ms', duration, {
        operation,
        table
      });
      
      return result;
    } catch (error) {
      // Record error metrics
      incrementCounter('database_query_errors_total', 1, {
        operation,
        table,
        error_name: (error as Error).name || 'Error'
      });
      
      // Re-throw the error
      throw error;
    }
  });
}

/**
 * Track external API call performance
 */
export async function trackApiCall<T>(
  service: string, 
  operation: string, 
  callFn: () => Promise<T>
): Promise<T> {
  return withSpan(`api:${service}:${operation}`, async (span) => {
    span.setAttribute('api.service', service);
    span.setAttribute('api.operation', operation);
    
    const startTime = Date.now();
    try {
      const result = await callFn();
      const duration = Date.now() - startTime;
      
      // Record metrics
      recordHistogram('api_call_duration_ms', duration, {
        service,
        operation
      });
      
      incrementCounter('api_calls_total', 1, {
        service,
        operation,
        status: 'success'
      });
      
      return result;
    } catch (error) {
      // Record error metrics
      incrementCounter('api_calls_total', 1, {
        service,
        operation,
        status: 'error',
        error_name: (error as Error).name || 'Error'
      });
      
      // Re-throw the error
      throw error;
    }
  });
}

// Export the client for advanced use cases
export { observabilityClient };