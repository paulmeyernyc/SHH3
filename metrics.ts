/**
 * Metrics Collection Module
 * 
 * Implements metrics collection across the platform with:
 * - Counters, Gauges, Histograms, and Summaries
 * - Automatic collection of system and Node.js metrics
 * - API endpoint metrics
 * - Custom business metrics
 * - Prometheus-compatible export endpoint
 * - Integration with external systems like Datadog, New Relic, etc.
 */

import express from 'express';
import promClient from 'prom-client';
import { trace, context } from '@opentelemetry/api';
import os from 'os';

// Configuration for metrics
interface MetricsConfig {
  enabled: boolean;
  endpoint?: string;
  interval: number;
  defaultLabels?: Record<string, string>;
  pushgateway?: {
    url: string;
    jobName: string;
    interval: number;
  };
}

// Global metrics registry
let registry: promClient.Registry;

// Common metrics
let httpRequestsTotal: promClient.Counter<string>;
let httpRequestDurationSeconds: promClient.Histogram<string>;
let httpRequestSizeBytes: promClient.Histogram<string>;
let httpResponseSizeBytes: promClient.Histogram<string>;
let activeConnections: promClient.Gauge<string>;
let databaseQueryDurationSeconds: promClient.Histogram<string>;
let databaseConnectionPoolSize: promClient.Gauge<string>;
let databaseConnectionPoolUsed: promClient.Gauge<string>;
let cacheHitRatio: promClient.Gauge<string>;
let cacheSize: promClient.Gauge<string>;
let businessMetrics: Record<string, promClient.Counter<string>> = {};

/**
 * Configure metrics collection
 */
export function configureMetrics(app: express.Application, config: MetricsConfig): void {
  // Skip if metrics are disabled
  if (!config.enabled) {
    console.log('Metrics collection disabled');
    return;
  }

  try {
    // Create registry
    registry = new promClient.Registry();

    // Set default labels
    if (config.defaultLabels) {
      registry.setDefaultLabels(config.defaultLabels);
    }

    // Enable collection of default metrics
    promClient.collectDefaultMetrics({
      register: registry,
      prefix: 'healthcare_',
      labels: {
        service: 'healthcare_platform'
      }
    });

    // Create HTTP metrics
    httpRequestsTotal = new promClient.Counter({
      name: 'healthcare_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [registry]
    });

    httpRequestDurationSeconds = new promClient.Histogram({
      name: 'healthcare_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10],
      registers: [registry]
    });

    httpRequestSizeBytes = new promClient.Histogram({
      name: 'healthcare_http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'path'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [registry]
    });

    httpResponseSizeBytes = new promClient.Histogram({
      name: 'healthcare_http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'path', 'status'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [registry]
    });

    activeConnections = new promClient.Gauge({
      name: 'healthcare_active_connections',
      help: 'Number of active connections',
      registers: [registry]
    });

    // Create database metrics
    databaseQueryDurationSeconds = new promClient.Histogram({
      name: 'healthcare_database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2.5, 5],
      registers: [registry]
    });

    databaseConnectionPoolSize = new promClient.Gauge({
      name: 'healthcare_database_connection_pool_size',
      help: 'Database connection pool size',
      labelNames: ['pool'],
      registers: [registry]
    });

    databaseConnectionPoolUsed = new promClient.Gauge({
      name: 'healthcare_database_connection_pool_used',
      help: 'Database connection pool used connections',
      labelNames: ['pool'],
      registers: [registry]
    });

    // Create cache metrics
    cacheHitRatio = new promClient.Gauge({
      name: 'healthcare_cache_hit_ratio',
      help: 'Cache hit ratio',
      labelNames: ['cache'],
      registers: [registry]
    });

    cacheSize = new promClient.Gauge({
      name: 'healthcare_cache_size',
      help: 'Cache size in bytes',
      labelNames: ['cache'],
      registers: [registry]
    });

    // Create business metrics
    createBusinessMetrics();

    // Add middleware to collect HTTP metrics
    app.use((req, res, next) => {
      // Skip metrics route to avoid circular measurements
      if (req.path === '/metrics') {
        return next();
      }

      // Track active connections
      activeConnections.inc();

      // Track request size if content-length is available
      const contentLength = req.headers['content-length'];
      if (contentLength) {
        httpRequestSizeBytes.observe({ method: req.method, path: req.route?.path || req.path }, parseInt(contentLength, 10));
      }

      // Track timing
      const start = Date.now();

      // Track response on finish
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const path = req.route?.path || req.path;
        const labels = { method: req.method, path, status: res.statusCode.toString() };

        // Increment request counter
        httpRequestsTotal.inc(labels);

        // Observe request duration
        httpRequestDurationSeconds.observe(labels, duration);

        // Track response size if content-length is available
        const resContentLength = res.getHeader('content-length');
        if (resContentLength) {
          httpResponseSizeBytes.observe(labels, parseInt(resContentLength.toString(), 10));
        }

        // Decrement active connections
        activeConnections.dec();
      });

      next();
    });

    // Serve metrics endpoint
    app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', registry.contentType);
        res.end(await registry.metrics());
      } catch (err) {
        res.status(500).end((err as Error).message);
      }
    });

    // Add endpoint to check metrics health
    app.get('/health/metrics', (req, res) => {
      res.json({
        status: 'ok',
        endpoint: '/metrics',
        registeredMetrics: registry.getMetricsAsJSON().length,
        collectionInterval: config.interval,
      });
    });

    // Setup metrics push to gateway if configured
    if (config.pushgateway?.url) {
      const gateway = new promClient.Pushgateway(
        config.pushgateway.url,
        { timeout: 5000 },
        registry
      );

      setInterval(() => {
        gateway.push(
          { jobName: config.pushgateway?.jobName || 'healthcare_platform' },
          (err) => {
            if (err) {
              console.error('Error pushing metrics to Pushgateway:', err);
            }
          }
        );
      }, config.pushgateway.interval || 10000);

      console.log(`Configured metrics to be pushed to ${config.pushgateway.url}`);
    }

    console.log('Metrics collection configured successfully');
  } catch (error) {
    console.error('Failed to configure metrics collection:', error);
  }
}

/**
 * Create healthcare-specific business metrics
 */
function createBusinessMetrics(): void {
  // Clinical metrics
  businessMetrics.patientsRegistered = new promClient.Counter({
    name: 'healthcare_patients_registered_total',
    help: 'Total number of patients registered',
    labelNames: ['source'],
    registers: [registry]
  });

  businessMetrics.appointmentsScheduled = new promClient.Counter({
    name: 'healthcare_appointments_scheduled_total',
    help: 'Total number of appointments scheduled',
    labelNames: ['type', 'provider'],
    registers: [registry]
  });

  businessMetrics.appointmentsCancelled = new promClient.Counter({
    name: 'healthcare_appointments_cancelled_total',
    help: 'Total number of appointments cancelled',
    labelNames: ['type', 'provider', 'reason'],
    registers: [registry]
  });

  businessMetrics.claimsSubmitted = new promClient.Counter({
    name: 'healthcare_claims_submitted_total',
    help: 'Total number of claims submitted',
    labelNames: ['payer', 'type'],
    registers: [registry]
  });

  businessMetrics.claimsDenied = new promClient.Counter({
    name: 'healthcare_claims_denied_total',
    help: 'Total number of claims denied',
    labelNames: ['payer', 'reason'],
    registers: [registry]
  });

  // Integration metrics
  businessMetrics.fhirRequestsTotal = new promClient.Counter({
    name: 'healthcare_fhir_requests_total',
    help: 'Total number of FHIR API requests',
    labelNames: ['resource', 'operation'],
    registers: [registry]
  });

  businessMetrics.hl7MessagesTotal = new promClient.Counter({
    name: 'healthcare_hl7_messages_total',
    help: 'Total number of HL7 messages processed',
    labelNames: ['type', 'source', 'status'],
    registers: [registry]
  });
  
  // User metrics
  businessMetrics.userLogins = new promClient.Counter({
    name: 'healthcare_user_logins_total',
    help: 'Total number of user logins',
    labelNames: ['role', 'method'],
    registers: [registry]
  });
  
  businessMetrics.userLogouts = new promClient.Counter({
    name: 'healthcare_user_logouts_total',
    help: 'Total number of user logouts',
    labelNames: ['role', 'reason'],
    registers: [registry]
  });
}

/**
 * Measure database query duration
 */
export function measureDatabaseQuery(operation: string, table: string, durationMs: number): void {
  if (!databaseQueryDurationSeconds) return;
  databaseQueryDurationSeconds.observe({ operation, table }, durationMs / 1000);
}

/**
 * Update connection pool metrics
 */
export function updateConnectionPoolMetrics(pool: string, size: number, used: number): void {
  if (!databaseConnectionPoolSize || !databaseConnectionPoolUsed) return;
  databaseConnectionPoolSize.set({ pool }, size);
  databaseConnectionPoolUsed.set({ pool }, used);
}

/**
 * Update cache metrics
 */
export function updateCacheMetrics(cacheName: string, hits: number, misses: number, size: number): void {
  if (!cacheHitRatio || !cacheSize) return;
  const total = hits + misses;
  const ratio = total > 0 ? hits / total : 0;
  cacheHitRatio.set({ cache: cacheName }, ratio);
  cacheSize.set({ cache: cacheName }, size);
}

/**
 * Increment a business metric
 */
export function incrementBusinessMetric(name: string, labels: Record<string, string> = {}, value: number = 1): void {
  const metric = businessMetrics[name];
  if (!metric) {
    console.warn(`Business metric '${name}' not found`);
    return;
  }
  
  metric.inc(labels, value);
}

/**
 * Create a custom metric
 */
export function createCustomCounter(name: string, help: string, labelNames: string[] = []): promClient.Counter<string> {
  const metricName = `healthcare_${name}`;
  
  // Return existing metric if already created
  if (businessMetrics[name]) {
    return businessMetrics[name];
  }
  
  const counter = new promClient.Counter({
    name: metricName,
    help,
    labelNames,
    registers: [registry]
  });
  
  businessMetrics[name] = counter;
  return counter;
}

/**
 * Create a custom gauge
 */
export function createCustomGauge(name: string, help: string, labelNames: string[] = []): promClient.Gauge<string> {
  const metricName = `healthcare_${name}`;
  
  const gauge = new promClient.Gauge({
    name: metricName,
    help,
    labelNames,
    registers: [registry]
  });
  
  return gauge;
}

/**
 * Create a custom histogram
 */
export function createCustomHistogram(
  name: string,
  help: string,
  labelNames: string[] = [],
  buckets: number[] = [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10]
): promClient.Histogram<string> {
  const metricName = `healthcare_${name}`;
  
  const histogram = new promClient.Histogram({
    name: metricName,
    help,
    labelNames,
    buckets,
    registers: [registry]
  });
  
  return histogram;
}