/**
 * Observability Client
 * 
 * Client library for integrating applications with the observability infrastructure.
 * This provides simplified interfaces for:
 * - Distributed tracing
 * - Structured logging
 * - Metrics reporting
 * - Health checks
 * 
 * Usage:
 * ```
 * import { ObservabilityClient } from '@healthcare/observability';
 * 
 * const client = new ObservabilityClient({
 *   serviceName: 'patient-service',
 *   serviceVersion: '1.0.0'
 * });
 * 
 * // Create a span for an operation
 * client.withSpan('process-patient-data', async (span) => {
 *   // Add context to the span
 *   span.setAttribute('patientId', patientId);
 *   
 *   // Your operation code here
 *   const result = await processPatient(patientId);
 *   
 *   // Record success metrics
 *   client.incrementCounter('patients_processed');
 *   
 *   return result;
 * });
 * 
 * // Log structured information
 * client.info('Patient data processed successfully', { 
 *   patientId, 
 *   processingTime 
 * });
 * ```
 */

import { Span, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import axios from 'axios';

/**
 * Client configuration
 */
export interface ObservabilityClientConfig {
  /**
   * Service name
   */
  serviceName: string;
  
  /**
   * Service version
   */
  serviceVersion: string;
  
  /**
   * Observability service URL
   * - If undefined, defaults to localhost:4000
   * - If null, external reporting is disabled (local-only mode)
   */
  observabilityUrl?: string | null;
  
  /**
   * Additional context for all telemetry
   */
  defaultContext?: Record<string, any>;
  
  /**
   * Enable/disable components
   */
  enabled?: {
    /**
     * Enable tracing
     */
    tracing?: boolean;
    
    /**
     * Enable logging
     */
    logging?: boolean;
    
    /**
     * Enable metrics
     */
    metrics?: boolean;
  };
}

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Simplified span interface for consumers
 */
export interface SimpleSpan {
  /**
   * Set an attribute on the span
   */
  setAttribute(key: string, value: string | number | boolean): SimpleSpan;
  
  /**
   * Record an error
   */
  recordError(error: Error): SimpleSpan;
  
  /**
   * Add an event to the span
   */
  addEvent(name: string, attributes?: Record<string, any>): SimpleSpan;
  
  /**
   * Set span status
   */
  setStatus(status: 'ok' | 'error', message?: string): SimpleSpan;
  
  /**
   * Get trace ID (for correlation with logs)
   */
  getTraceId(): string;
  
  /**
   * Get span ID
   */
  getSpanId(): string;
}

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram'
}

/**
 * Main client class for observability
 */
export class ObservabilityClient {
  private readonly config: ObservabilityClientConfig;
  private readonly metricCache: Map<string, any> = new Map();
  
  constructor(config: ObservabilityClientConfig) {
    this.config = {
      ...config,
      // If observabilityUrl is explicitly null, keep it as null to disable external reporting
      observabilityUrl: config.observabilityUrl === null 
        ? null 
        : (config.observabilityUrl || 'http://localhost:4000'),
      enabled: {
        tracing: true,
        logging: true,
        metrics: true,
        ...config.enabled
      }
    };
    
    const externalReporting = this.config.observabilityUrl ? 'enabled' : 'disabled (local only)';
    console.log(`Observability client initialized for service: ${this.config.serviceName} v${this.config.serviceVersion} - External reporting ${externalReporting}`);
  }
  
  /**
   * Run an operation within a new span
   */
  async withSpan<T>(
    name: string, 
    operation: (span: SimpleSpan) => Promise<T>, 
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, any>;
      parentSpan?: Span;
    }
  ): Promise<T> {
    if (!this.config.enabled?.tracing) {
      // Tracing disabled, run operation directly
      return await operation(this.createNoOpSpan());
    }
    
    // In a real implementation, this would use OpenTelemetry to create a span
    // For now, we'll create a simple wrapper
    const startTime = Date.now();
    const traceId = this.generateId();
    const spanId = this.generateId();
    
    // Create a simplified span
    const span: SimpleSpan = {
      setAttribute: (key, value) => {
        console.debug(`[TRACE] ${traceId}:${spanId} setAttribute: ${key}=${value}`);
        return span;
      },
      recordError: (error) => {
        console.error(`[TRACE] ${traceId}:${spanId} recordError: ${error.message}`);
        return span;
      },
      addEvent: (name, attributes) => {
        console.debug(`[TRACE] ${traceId}:${spanId} event: ${name}`, attributes);
        return span;
      },
      setStatus: (status, message) => {
        console.debug(`[TRACE] ${traceId}:${spanId} status: ${status} ${message || ''}`);
        return span;
      },
      getTraceId: () => traceId,
      getSpanId: () => spanId
    };
    
    // Set initial attributes
    const attributes = {
      ...this.config.defaultContext,
      ...options?.attributes,
      'service.name': this.config.serviceName,
      'service.version': this.config.serviceVersion
    };
    
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value as any);
    });
    
    try {
      // Run the operation
      const result = await operation(span);
      
      // End span successfully
      span.setStatus('ok');
      return result;
    } catch (err) {
      // Record error and re-throw
      span.setStatus('error', (err as Error).message);
      span.recordError(err as Error);
      throw err;
    } finally {
      // Record span duration
      const duration = Date.now() - startTime;
      console.debug(`[TRACE] ${traceId}:${spanId} completed in ${duration}ms`);
      
      // In a real implementation, we would report this span
      this.reportSpan(name, {
        traceId,
        spanId,
        duration,
        attributes
      }).catch(e => console.error('Failed to report span:', e));
    }
  }
  
  /**
   * Log at ERROR level
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, {
      ...context,
      error: error?.message,
      stack: error?.stack
    });
  }
  
  /**
   * Log at WARN level
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  /**
   * Log at INFO level
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  /**
   * Log at DEBUG level
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    if (!this.config.enabled?.metrics) return;
    
    this.reportMetric(MetricType.COUNTER, name, value, labels)
      .catch(e => console.error(`Failed to report counter metric ${name}:`, e));
  }
  
  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    if (!this.config.enabled?.metrics) return;
    
    this.reportMetric(MetricType.GAUGE, name, value, labels)
      .catch(e => console.error(`Failed to report gauge metric ${name}:`, e));
  }
  
  /**
   * Record a value in a histogram
   */
  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    if (!this.config.enabled?.metrics) return;
    
    this.reportMetric(MetricType.HISTOGRAM, name, value, labels)
      .catch(e => console.error(`Failed to report histogram metric ${name}:`, e));
  }
  
  /**
   * Record timing for an operation
   */
  async recordTiming<T>(
    name: string, 
    operation: () => Promise<T>, 
    labels: Record<string, string> = {}
  ): Promise<T> {
    const start = Date.now();
    try {
      return await operation();
    } finally {
      const duration = Date.now() - start;
      this.recordHistogram(name, duration, labels);
    }
  }
  
  /**
   * Check health of the observability service
   */
  async checkHealth(): Promise<{
    status: 'ok' | 'degraded' | 'error';
    components: Record<string, any>;
  }> {
    // If observabilityUrl is null, external service is disabled by design
    if (!this.config.observabilityUrl) {
      return {
        status: 'ok',
        components: {
          external: 'disabled',
          local: 'active'
        }
      };
    }
    
    try {
      const response = await axios.get(`${this.config.observabilityUrl}/health`);
      return response.data;
    } catch (error) {
      return {
        status: 'error',
        components: {
          error: (error as Error).message
        }
      };
    }
  }
  
  /**
   * Send logs to observability service
   */
  private async log(level: LogLevel, message: string, context?: Record<string, any>): Promise<void> {
    if (!this.config.enabled?.logging) {
      // Just log locally if disabled
      console[level](`[${level.toUpperCase()}] ${message}`, context);
      return;
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.config.serviceName,
      version: this.config.serviceVersion,
      ...this.config.defaultContext,
      ...context
    };
    
    // Log locally too
    console[level](`[${level.toUpperCase()}] ${message}`, context);
    
    // Only send to external service if URL is configured
    if (this.config.observabilityUrl) {
      try {
        // In a real implementation, this would queue logs and batch send them
        await axios.post(`${this.config.observabilityUrl}/api/logs`, {
          logs: [logEntry]
        });
      } catch (error) {
        console.error('Failed to send log to observability service:', error);
      }
    }
  }
  
  /**
   * Report a span to the observability service
   */
  private async reportSpan(name: string, data: any): Promise<void> {
    if (!this.config.enabled?.tracing) return;
    
    // Only send to external service if URL is configured
    if (this.config.observabilityUrl) {
      try {
        await axios.post(`${this.config.observabilityUrl}/api/traces`, {
          name,
          service: this.config.serviceName,
          ...data
        });
      } catch (error) {
        console.error('Failed to report span to observability service:', error);
      }
    }
  }
  
  /**
   * Report a metric to the observability service
   */
  private async reportMetric(
    type: MetricType, 
    name: string, 
    value: number, 
    labels: Record<string, string> = {}
  ): Promise<void> {
    if (!this.config.enabled?.metrics) return;
    
    // Only send to external service if URL is configured
    if (this.config.observabilityUrl) {
      try {
        await axios.post(`${this.config.observabilityUrl}/api/metrics`, {
          type,
          name,
          value,
          labels: {
            service: this.config.serviceName,
            version: this.config.serviceVersion,
            ...labels
          },
          timestamp: Date.now()
        });
      } catch (error) {
        console.error(`Failed to report metric ${name} to observability service:`, error);
      }
    }
  }
  
  /**
   * Generate a random ID for spans/traces
   */
  private generateId(): string {
    return Math.random().toString(16).slice(2);
  }
  
  /**
   * Create a no-op span when tracing is disabled
   */
  private createNoOpSpan(): SimpleSpan {
    return {
      setAttribute: () => ({ /* no-op */ } as SimpleSpan),
      recordError: () => ({ /* no-op */ } as SimpleSpan),
      addEvent: () => ({ /* no-op */ } as SimpleSpan),
      setStatus: () => ({ /* no-op */ } as SimpleSpan),
      getTraceId: () => 'disabled',
      getSpanId: () => 'disabled'
    };
  }
}