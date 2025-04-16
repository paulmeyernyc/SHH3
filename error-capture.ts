/**
 * Error Capture Service
 * 
 * This module provides error capture functionality to send errors to
 * monitoring services like Sentry, Datadog, etc.
 */

import { AppError } from './app-error';
import { ErrorSeverity } from './error-types';

// Interface for error capture configuration
export interface ErrorCaptureConfig {
  enabled: boolean;
  environment?: string;
  release?: string;
  serviceName?: string;
  sampleRate?: number;
  excludedErrorCodes?: string[];
  captureService?: ErrorCaptureService;
}

// Interface for an error capture service
export interface ErrorCaptureService {
  captureError(error: Error | AppError, context?: Record<string, any>): string;
  captureMessage(message: string, level: string, context?: Record<string, any>): string;
  setContext(key: string, context: Record<string, any>): void;
  setUser(user: Record<string, any>): void;
  setTag(key: string, value: string): void;
  setExtra(key: string, value: any): void;
}

// Default configuration
const defaultConfig: ErrorCaptureConfig = {
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV || 'development',
  serviceName: process.env.SERVICE_NAME || 'unknown',
  sampleRate: 1.0,
  excludedErrorCodes: []
};

// Current configuration
let currentConfig: ErrorCaptureConfig = { ...defaultConfig };

// Check if error should be captured based on error code and sampling
function shouldCaptureError(error: AppError): boolean {
  if (!currentConfig.enabled) {
    return false;
  }
  
  if (currentConfig.excludedErrorCodes?.includes(error.code)) {
    return false;
  }
  
  // Sample based on sample rate
  if (currentConfig.sampleRate !== undefined && currentConfig.sampleRate < 1.0) {
    return Math.random() < currentConfig.sampleRate;
  }
  
  return true;
}

// Map AppError severity to error capture level
function mapSeverityToLevel(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.FATAL:
      return 'fatal';
    case ErrorSeverity.ERROR:
      return 'error';
    case ErrorSeverity.WARNING:
      return 'warning';
    case ErrorSeverity.INFO:
      return 'info';
    default:
      return 'error';
  }
}

/**
 * Default error capture service that just logs to console
 */
class ConsoleErrorCapture implements ErrorCaptureService {
  captureError(error: Error | AppError, context?: Record<string, any>): string {
    const errorId = (error as AppError).errorId || `console-${Date.now()}`;
    
    console.error('[ERROR CAPTURE]', {
      errorId,
      error: error instanceof AppError ? error.toLogFormat() : error,
      context
    });
    
    return errorId;
  }
  
  captureMessage(message: string, level: string, context?: Record<string, any>): string {
    const messageId = `console-${Date.now()}`;
    
    console.log(`[ERROR CAPTURE] [${level.toUpperCase()}] ${message}`, {
      messageId,
      context
    });
    
    return messageId;
  }
  
  setContext(key: string, context: Record<string, any>): void {
    console.log(`[ERROR CAPTURE] Setting context for ${key}:`, context);
  }
  
  setUser(user: Record<string, any>): void {
    console.log('[ERROR CAPTURE] Setting user:', user);
  }
  
  setTag(key: string, value: string): void {
    console.log(`[ERROR CAPTURE] Setting tag ${key}:`, value);
  }
  
  setExtra(key: string, value: any): void {
    console.log(`[ERROR CAPTURE] Setting extra ${key}:`, value);
  }
}

// The default capture service is the console logger
let captureService: ErrorCaptureService = new ConsoleErrorCapture();

/**
 * Configure the error capture service
 */
export function configureErrorCapture(config: Partial<ErrorCaptureConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config
  };
  
  // Set the capture service if provided
  if (config.captureService) {
    captureService = config.captureService;
  }
  
  // Set basic context on the capture service
  captureService.setContext('service', {
    name: currentConfig.serviceName,
    environment: currentConfig.environment,
    release: currentConfig.release
  });
}

/**
 * Initialize the error capture service with Sentry
 * This is a separate function to avoid requiring Sentry as a dependency
 * if it's not being used.
 */
export function initSentryErrorCapture(
  dsn: string,
  options: any = {}
): ErrorCaptureService {
  try {
    // This is done with require instead of import to make it optional
    const Sentry = require('@sentry/node');
    
    // Initialize Sentry
    Sentry.init({
      dsn,
      environment: currentConfig.environment,
      release: currentConfig.release,
      ...options
    });
    
    // Create a Sentry error capture service
    const sentryCaptureService: ErrorCaptureService = {
      captureError(error: Error | AppError, context?: Record<string, any>): string {
        let eventId: string;
        
        if (error instanceof AppError) {
          // Add AppError specific data
          Sentry.configureScope((scope: any) => {
            scope.setContext('appError', {
              code: error.code,
              category: error.category,
              errorId: error.errorId,
              details: error.details
            });
            
            if (error.context) {
              scope.setContext('errorContext', error.context);
            }
            
            if (error.context?.userId) {
              scope.setUser({ id: error.context.userId });
            }
            
            scope.setLevel(mapSeverityToLevel(error.severity));
            
            if (context) {
              Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value);
              });
            }
          });
          
          eventId = Sentry.captureException(error.cause || error);
        } else {
          // Regular Error
          Sentry.configureScope((scope: any) => {
            if (context) {
              Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value);
              });
            }
          });
          
          eventId = Sentry.captureException(error);
        }
        
        return eventId;
      },
      
      captureMessage(message: string, level: string, context?: Record<string, any>): string {
        Sentry.configureScope((scope: any) => {
          if (context) {
            Object.entries(context).forEach(([key, value]) => {
              scope.setExtra(key, value);
            });
          }
        });
        
        return Sentry.captureMessage(message, level);
      },
      
      setContext(key: string, context: Record<string, any>): void {
        Sentry.configureScope((scope: any) => {
          scope.setContext(key, context);
        });
      },
      
      setUser(user: Record<string, any>): void {
        Sentry.configureScope((scope: any) => {
          scope.setUser(user);
        });
      },
      
      setTag(key: string, value: string): void {
        Sentry.configureScope((scope: any) => {
          scope.setTag(key, value);
        });
      },
      
      setExtra(key: string, value: any): void {
        Sentry.configureScope((scope: any) => {
          scope.setExtra(key, value);
        });
      }
    };
    
    return sentryCaptureService;
  } catch (error) {
    console.error('Failed to initialize Sentry error capture:', error);
    return new ConsoleErrorCapture();
  }
}

/**
 * Initialize the error capture service with Datadog
 * This is a separate function to avoid requiring Datadog as a dependency
 * if it's not being used.
 */
export function initDatadogErrorCapture(
  apiKey: string,
  options: any = {}
): ErrorCaptureService {
  try {
    // This is done with require instead of import to make it optional
    const ddTrace = require('dd-trace');
    
    // Initialize Datadog tracer
    ddTrace.init({
      service: currentConfig.serviceName,
      env: currentConfig.environment,
      version: currentConfig.release,
      ...options
    });
    
    // Create a Datadog error capture service
    const datadogCaptureService: ErrorCaptureService = {
      captureError(error: Error | AppError, context?: Record<string, any>): string {
        const errorId = (error as AppError).errorId || `dd-${Date.now()}`;
        
        // Get current span from tracer
        const span = ddTrace.scope().active();
        
        if (span) {
          // Add error to current span
          span.addTags({
            'error.type': error.name,
            'error.msg': error.message,
            'error.stack': error.stack
          });
          
          if (error instanceof AppError) {
            span.addTags({
              'error.id': error.errorId,
              'error.code': error.code,
              'error.category': error.category,
              'error.severity': error.severity
            });
            
            if (error.context) {
              Object.entries(error.context).forEach(([key, value]) => {
                span.setTag(`error.context.${key}`, JSON.stringify(value));
              });
            }
          }
          
          if (context) {
            Object.entries(context).forEach(([key, value]) => {
              span.setTag(`error.capture.${key}`, JSON.stringify(value));
            });
          }
          
          span.setTag('error', true);
        }
        
        // Log to console as backup
        console.error('[DATADOG ERROR]', {
          errorId,
          error: error instanceof AppError ? error.toLogFormat() : error,
          context
        });
        
        return errorId;
      },
      
      captureMessage(message: string, level: string, context?: Record<string, any>): string {
        const messageId = `dd-${Date.now()}`;
        
        // Get current span from tracer
        const span = ddTrace.scope().active();
        
        if (span) {
          span.addTags({
            'message': message,
            'level': level
          });
          
          if (context) {
            Object.entries(context).forEach(([key, value]) => {
              span.setTag(`message.context.${key}`, JSON.stringify(value));
            });
          }
        }
        
        // Log to console as backup
        console.log(`[DATADOG ${level.toUpperCase()}] ${message}`, {
          messageId,
          context
        });
        
        return messageId;
      },
      
      setContext(key: string, context: Record<string, any>): void {
        // No direct equivalent in Datadog - applied per span
        console.log(`[DATADOG] Setting context for ${key}:`, context);
      },
      
      setUser(user: Record<string, any>): void {
        if (user.id) {
          ddTrace.setUser({ id: user.id });
        }
      },
      
      setTag(key: string, value: string): void {
        // Global tags can be set on tracer init
        const span = ddTrace.scope().active();
        if (span) {
          span.setTag(key, value);
        }
      },
      
      setExtra(key: string, value: any): void {
        // Set as regular tag
        const span = ddTrace.scope().active();
        if (span) {
          span.setTag(key, JSON.stringify(value));
        }
      }
    };
    
    return datadogCaptureService;
  } catch (error) {
    console.error('Failed to initialize Datadog error capture:', error);
    return new ConsoleErrorCapture();
  }
}

/**
 * Capture an error and send it to the configured monitoring service
 */
export function captureError(
  error: Error | AppError,
  context?: Record<string, any>
): string | null {
  try {
    // Skip capture if it's disabled or error is excluded
    if (error instanceof AppError && !shouldCaptureError(error)) {
      return null;
    }
    
    return captureService.captureError(error, context);
  } catch (captureError) {
    // Fail silently if error capture itself fails
    console.error('Error capture failed:', captureError);
    return null;
  }
}

/**
 * Capture a message with a specified level
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
): string | null {
  try {
    if (!currentConfig.enabled) {
      return null;
    }
    
    return captureService.captureMessage(message, level, context);
  } catch (error) {
    console.error('Message capture failed:', error);
    return null;
  }
}

/**
 * Set the current user for error context
 */
export function setErrorUser(user: { id: string | number, [key: string]: any }): void {
  try {
    captureService.setUser(user);
  } catch (error) {
    console.error('Setting error user failed:', error);
  }
}

/**
 * Check if error capture is enabled
 */
export function isErrorCaptureEnabled(): boolean {
  return currentConfig.enabled;
}

/**
 * Get the current capture service for testing
 */
export function getCurrentCaptureService(): ErrorCaptureService {
  return captureService;
}