/**
 * Centralized Logging Module
 * 
 * Implements structured logging across the platform with centralized collection.
 * Features:
 * - Structured JSON logs
 * - Log levels with proper filtering
 * - Context tracking across services
 * - Integration with trace IDs for correlation
 * - Buffer and batch sending to reduce network overhead
 */

import express from 'express';
import winston from 'winston';
import Transport from 'winston-transport';
import { trace, context } from '@opentelemetry/api';
import axios from 'axios';
import { hostname } from 'os';

// Configuration for logging
interface LoggingConfig {
  centralEndpoint?: string;
  retentionDays: number;
  bufferSize: number;
  flushInterval: number;
  level?: string;
}

// Custom transport to send logs to centralized endpoint
class CentralizedLogTransport extends Transport {
  private buffer: any[] = [];
  private endpoint: string;
  private bufferSize: number;
  private flushTimer: NodeJS.Timeout;

  constructor(opts: any) {
    super(opts);
    this.endpoint = opts.endpoint;
    this.bufferSize = opts.bufferSize || 100;
    
    // Set up timer to periodically flush logs
    this.flushTimer = setInterval(() => {
      this.flush();
    }, opts.flushInterval || 5000);
  }

  async log(info: any, callback: () => void) {
    // Add to buffer
    this.buffer.push(info);

    // Flush if buffer full
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }

    callback();
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      if (this.endpoint) {
        await axios.post(this.endpoint, { logs });
      }
    } catch (error) {
      console.error('Failed to send logs to centralized endpoint:', error);
      // Re-add logs to buffer to try again later, with a cap to prevent memory issues
      if (this.buffer.length < 1000) {
        this.buffer = [...logs, ...this.buffer];
      }
    }
  }

  close() {
    clearInterval(this.flushTimer);
    this.flush().catch(console.error);
  }
}

// Create logger instance
let logger: winston.Logger;

/**
 * Configure the logging system
 */
export function configureLogs(app: express.Application, config: LoggingConfig): winston.Logger {
  // Base format with timestamp and structured JSON
  const baseFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  );

  // Transports
  const transports: Transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ];

  // Add centralized logging transport if endpoint configured
  if (config.centralEndpoint) {
    transports.push(
      new CentralizedLogTransport({
        level: 'info',
        endpoint: config.centralEndpoint,
        bufferSize: config.bufferSize,
        flushInterval: config.flushInterval
      })
    );
    console.log(`Centralized logging configured with endpoint: ${config.centralEndpoint}`);
  } else {
    console.log('Centralized logging endpoint not configured, logs will only be available locally');
  }

  // Create the logger
  logger = winston.createLogger({
    level: config.level || 'info',
    format: baseFormat,
    defaultMeta: {
      service: 'healthcare-platform',
      hostname: hostname(),
      environment: process.env.NODE_ENV || 'development'
    },
    transports
  });

  // Add middleware to log requests
  app.use((req, res, next) => {
    const start = Date.now();
    const requestId = req.id;
    const traceId = getTraceId();
    
    // Log request
    logger.info('Request received', {
      requestId,
      traceId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      type: 'request'
    });

    // Log response when completed
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Response sent', {
        requestId,
        traceId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        type: 'response'
      });
    });

    next();
  });

  // Add error logging middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Request error', {
      requestId: req.id,
      traceId: getTraceId(),
      method: req.method,
      url: req.originalUrl,
      error: err.message,
      stack: err.stack,
      type: 'error'
    });

    next(err);
  });

  // Add endpoint to check logging health
  app.get('/health/logging', (req, res) => {
    res.json({
      status: 'ok',
      centralEndpoint: config.centralEndpoint || null,
      level: logger.level,
      retentionDays: config.retentionDays
    });
  });

  // Add endpoint to dynamically change log level
  app.post('/api/logging/level', (req, res) => {
    const { level } = req.body;
    if (['error', 'warn', 'info', 'debug', 'verbose', 'silly'].includes(level)) {
      logger.level = level;
      res.json({ success: true, message: `Log level changed to ${level}` });
    } else {
      res.status(400).json({ success: false, message: 'Invalid log level' });
    }
  });

  return logger;
}

/**
 * Get the current trace ID if available
 */
function getTraceId(): string | undefined {
  const span = trace.getSpan(context.active());
  return span?.spanContext().traceId;
}

/**
 * Log at INFO level
 */
export function info(message: string, meta: Record<string, any> = {}): void {
  if (!logger) {
    console.log(message, meta);
    return;
  }

  const span = trace.getSpan(context.active());
  logger.info(message, {
    ...meta,
    traceId: span?.spanContext().traceId,
    spanId: span?.spanContext().spanId
  });
}

/**
 * Log at ERROR level
 */
export function error(message: string, err?: Error, meta: Record<string, any> = {}): void {
  if (!logger) {
    console.error(message, err, meta);
    return;
  }

  const span = trace.getSpan(context.active());
  logger.error(message, {
    ...meta,
    error: err?.message,
    stack: err?.stack,
    traceId: span?.spanContext().traceId,
    spanId: span?.spanContext().spanId
  });
}

/**
 * Log at WARN level
 */
export function warn(message: string, meta: Record<string, any> = {}): void {
  if (!logger) {
    console.warn(message, meta);
    return;
  }

  const span = trace.getSpan(context.active());
  logger.warn(message, {
    ...meta,
    traceId: span?.spanContext().traceId,
    spanId: span?.spanContext().spanId
  });
}

/**
 * Log at DEBUG level
 */
export function debug(message: string, meta: Record<string, any> = {}): void {
  if (!logger) {
    console.debug(message, meta);
    return;
  }

  const span = trace.getSpan(context.active());
  logger.debug(message, {
    ...meta,
    traceId: span?.spanContext().traceId,
    spanId: span?.spanContext().spanId
  });
}

// Export the configured logger for direct use
export { logger };