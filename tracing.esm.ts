/**
 * Distributed Tracing Module (ESM Version)
 * 
 * Implements distributed tracing across the platform using OpenTelemetry.
 * This helps track request flows across multiple services, making it easier
 * to troubleshoot performance issues and understand system behavior.
 * 
 * This version uses ESM-compatible imports.
 */

import express from 'express';
import { context, trace, SpanKind, Span } from '@opentelemetry/api';
// Fix for ESM compatibility - import entire package first
import * as resourcesModule from '@opentelemetry/resources';
// Then destructure what's needed
const { Resource } = resourcesModule;
import * as semanticConventions from '@opentelemetry/semantic-conventions';
const { SemanticResourceAttributes } = semanticConventions;
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor, ConsoleSpanExporter, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

// Configuration for tracing
interface TracingConfig {
  enabled: boolean;
  endpoint?: string;
  samplingRate: number;
  exporterType?: 'jaeger' | 'zipkin' | 'otlp' | 'console';
}

// Middleware to create custom spans for specific operations
export function createCustomSpanMiddleware(name: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const tracer = trace.getTracer('express-tracer');
    const span = tracer.startSpan(`${name}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.originalUrl,
        'http.request_id': req.id,
        'service.name': 'healthcare-platform',
      },
    });

    // Set current span as active
    context.with(trace.setSpan(context.active(), span), () => {
      // Add span to request for potential use in handlers
      (req as any).span = span;

      // Track response status and timing
      const startTime = Date.now();
      
      // Capture response completion
      res.on('finish', () => {
        span.setAttributes({
          'http.status_code': res.statusCode,
          'http.response_time_ms': Date.now() - startTime,
        });

        // Tag error conditions
        if (res.statusCode >= 400) {
          span.setStatus({
            code: res.statusCode >= 500 ? 2 : 1, // Error or warning based on status code
            message: `HTTP Error ${res.statusCode}`,
          });
        }

        span.end();
      });

      next();
    });
  };
}

/**
 * Configure tracing for the application
 */
export function configureTracing(app: express.Application, config: TracingConfig): void {
  // Skip setup if tracing is disabled
  if (!config.enabled) {
    console.log('Distributed tracing disabled');
    return;
  }

  try {
    // Create a tracer provider
    const provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'healthcare-platform',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      }),
      // Sampling configuration could be added here
    });

    // Add appropriate exporter based on configuration
    if (config.exporterType === 'jaeger' && config.endpoint) {
      console.log(`Configuring Jaeger exporter with endpoint: ${config.endpoint}`);
      const exporter = new JaegerExporter({
        endpoint: config.endpoint,
      });
      provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    } else if (config.exporterType === 'zipkin' && config.endpoint) {
      console.log(`Configuring Zipkin exporter with endpoint: ${config.endpoint}`);
      const exporter = new ZipkinExporter({
        url: config.endpoint,
      });
      provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    } else if (config.exporterType === 'otlp' && config.endpoint) {
      console.log(`Configuring OTLP exporter with endpoint: ${config.endpoint}`);
      const exporter = new OTLPTraceExporter({
        url: config.endpoint,
      });
      provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    } else {
      // Default to console exporter for development
      console.log('Configuring Console exporter for traces');
      provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    }

    // Register the provider
    provider.register({
      propagator: new W3CTraceContextPropagator(),
    });

    // Register auto-instrumentations
    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
        new PgInstrumentation(),
        new RedisInstrumentation(),
      ],
    });

    console.log('OpenTelemetry tracing configured successfully');

    // Add tracing middleware to express
    app.use((req, res, next) => {
      const tracer = trace.getTracer('express-tracer');
      const span = tracer.startSpan(`HTTP ${req.method}`, {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': req.method,
          'http.url': req.originalUrl,
          'http.request_id': req.id,
        },
      });

      // Store current span and tracer on request for later use
      (req as any).span = span;
      (req as any).tracer = tracer;

      // End span when response finishes
      res.on('finish', () => {
        span.setAttribute('http.status_code', res.statusCode);
        span.end();
      });

      next();
    });

    // Add route for health check related to tracing
    app.get('/health/tracing', (req, res) => {
      res.json({
        status: 'ok',
        exporterType: config.exporterType || 'console',
        endpoint: config.endpoint || 'stdout',
      });
    });

  } catch (error) {
    console.error('Failed to configure OpenTelemetry tracing:', error);
  }
}

/**
 * Create a new span for a specific operation
 */
export function createSpan(name: string, parentSpan?: Span): Span {
  const tracer = trace.getTracer('healthcare-tracer');
  return tracer.startSpan(name, undefined, parentSpan ? trace.setSpan(context.active(), parentSpan) : undefined);
}

/**
 * Run an operation within a new span
 */
export async function withSpan<T>(
  name: string, 
  operation: (span: Span) => Promise<T>, 
  attributes: Record<string, string> = {},
  parentSpan?: Span
): Promise<T> {
  const span = createSpan(name, parentSpan);
  
  try {
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });

    // Run the operation within the context of this span
    return await context.with(trace.setSpan(context.active(), span), async () => {
      try {
        return await operation(span);
      } catch (error) {
        // Record error in span
        span.setStatus({
          code: 2, // Error
          message: (error as Error).message,
        });
        span.recordException(error as Error);
        throw error;
      }
    });
  } finally {
    span.end();
  }
}