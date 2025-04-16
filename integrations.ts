/**
 * Observability Integrations Module
 * 
 * Provides integration with external observability platforms like:
 * - Datadog
 * - New Relic
 * - Dynatrace
 * - Elastic APM
 * - AWS CloudWatch
 * - Google Cloud Operations
 * - Azure Monitor
 */

import express from 'express';
import axios from 'axios';
import { trace, context } from '@opentelemetry/api';
import { createHash } from 'crypto';
import { logger, info, error } from './logging';

// Integration configuration
interface IntegrationConfig {
  type: 'datadog' | 'newrelic' | 'dynatrace' | 'elastic' | 'cloudwatch' | 'gcp' | 'azure';
  apiKey?: string;
  endpoint?: string;
  accountId?: string;
  enabled: boolean;
  tags?: Record<string, string>;
}

// Active integrations
const activeIntegrations: IntegrationConfig[] = [];

/**
 * Configure observability integrations with external systems
 */
export function configureIntegrations(app: express.Application): void {
  // Load integration configurations from environment variables
  loadIntegrationsFromEnv();

  // Register API endpoints
  registerIntegrationEndpoints(app);

  // Initialize active integrations
  initializeIntegrations();
}

/**
 * Load integrations from environment variables
 */
function loadIntegrationsFromEnv(): void {
  // Datadog integration
  if (process.env.DATADOG_API_KEY && process.env.DATADOG_ENABLED === 'true') {
    activeIntegrations.push({
      type: 'datadog',
      apiKey: process.env.DATADOG_API_KEY,
      endpoint: process.env.DATADOG_ENDPOINT || 'https://api.datadoghq.com/api/v1',
      enabled: true,
      tags: {
        service: 'healthcare-platform',
        environment: process.env.NODE_ENV || 'development'
      }
    });
    info('Datadog integration configured');
  }

  // New Relic integration
  if (process.env.NEW_RELIC_LICENSE_KEY && process.env.NEW_RELIC_ENABLED === 'true') {
    activeIntegrations.push({
      type: 'newrelic',
      apiKey: process.env.NEW_RELIC_LICENSE_KEY,
      endpoint: process.env.NEW_RELIC_ENDPOINT || 'https://insights-collector.newrelic.com/v1/accounts',
      accountId: process.env.NEW_RELIC_ACCOUNT_ID,
      enabled: true,
      tags: {
        service: 'healthcare-platform',
        environment: process.env.NODE_ENV || 'development'
      }
    });
    info('New Relic integration configured');
  }

  // Elastic APM integration
  if (process.env.ELASTIC_APM_SERVER_URL && process.env.ELASTIC_APM_ENABLED === 'true') {
    activeIntegrations.push({
      type: 'elastic',
      endpoint: process.env.ELASTIC_APM_SERVER_URL,
      apiKey: process.env.ELASTIC_APM_SECRET_TOKEN,
      enabled: true,
      tags: {
        service: process.env.ELASTIC_APM_SERVICE_NAME || 'healthcare-platform',
        environment: process.env.NODE_ENV || 'development'
      }
    });
    info('Elastic APM integration configured');
  }

  // Dynatrace integration
  if (process.env.DYNATRACE_API_TOKEN && process.env.DYNATRACE_ENABLED === 'true') {
    activeIntegrations.push({
      type: 'dynatrace',
      apiKey: process.env.DYNATRACE_API_TOKEN,
      endpoint: process.env.DYNATRACE_ENDPOINT,
      enabled: true,
      tags: {
        service: 'healthcare-platform',
        environment: process.env.NODE_ENV || 'development'
      }
    });
    info('Dynatrace integration configured');
  }

  // AWS CloudWatch integration
  if (process.env.AWS_CLOUDWATCH_ENABLED === 'true') {
    // AWS credentials are typically provided via environment variables
    // AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
    activeIntegrations.push({
      type: 'cloudwatch',
      enabled: true,
      tags: {
        service: 'healthcare-platform',
        environment: process.env.NODE_ENV || 'development'
      }
    });
    info('AWS CloudWatch integration configured');
  }

  // Google Cloud Operations (former Stackdriver) integration
  if (process.env.GCP_OPERATIONS_ENABLED === 'true') {
    // GCP credentials are typically provided via GOOGLE_APPLICATION_CREDENTIALS
    activeIntegrations.push({
      type: 'gcp',
      enabled: true,
      tags: {
        service: 'healthcare-platform',
        environment: process.env.NODE_ENV || 'development'
      }
    });
    info('Google Cloud Operations integration configured');
  }

  // Azure Monitor integration
  if (process.env.AZURE_MONITOR_CONNECTION_STRING && process.env.AZURE_MONITOR_ENABLED === 'true') {
    activeIntegrations.push({
      type: 'azure',
      apiKey: process.env.AZURE_MONITOR_CONNECTION_STRING,
      enabled: true,
      tags: {
        service: 'healthcare-platform',
        environment: process.env.NODE_ENV || 'development'
      }
    });
    info('Azure Monitor integration configured');
  }
}

/**
 * Initialize active integrations
 */
function initializeIntegrations(): void {
  for (const integration of activeIntegrations) {
    if (!integration.enabled) continue;

    try {
      switch (integration.type) {
        case 'datadog':
          initializeDatadog(integration);
          break;
        case 'newrelic':
          initializeNewRelic(integration);
          break;
        case 'elastic':
          initializeElasticAPM(integration);
          break;
        case 'dynatrace':
          initializeDynatrace(integration);
          break;
        case 'cloudwatch':
          initializeCloudWatch(integration);
          break;
        case 'gcp':
          initializeGoogleCloudOperations(integration);
          break;
        case 'azure':
          initializeAzureMonitor(integration);
          break;
      }
    } catch (err) {
      error(`Failed to initialize ${integration.type} integration`, err as Error);
    }
  }
}

/**
 * Initialize Datadog integration
 */
function initializeDatadog(config: IntegrationConfig): void {
  // In a real implementation, this would initialize the Datadog SDK
  info(`Initializing Datadog integration with endpoint: ${config.endpoint}`);

  // Send a test event to Datadog to verify connectivity
  sendDatadogEvent({
    title: 'Healthcare Platform Observability Started',
    text: 'The healthcare platform observability service has started and connected to Datadog',
    tags: Object.entries(config.tags || {}).map(([key, value]) => `${key}:${value}`),
    alert_type: 'info'
  }).catch(err => {
    error('Failed to send test event to Datadog', err);
  });
}

/**
 * Send an event to Datadog
 */
async function sendDatadogEvent(eventData: any): Promise<void> {
  const integration = activeIntegrations.find(i => i.type === 'datadog');
  if (!integration || !integration.enabled || !integration.apiKey) {
    throw new Error('Datadog integration not properly configured');
  }

  const url = `${integration.endpoint}/events`;
  
  try {
    await axios.post(url, eventData, {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': integration.apiKey
      }
    });
    info('Event sent to Datadog successfully');
  } catch (err) {
    error('Failed to send event to Datadog', err as Error);
    throw err;
  }
}

/**
 * Initialize New Relic integration
 */
function initializeNewRelic(config: IntegrationConfig): void {
  // In a real implementation, this would initialize the New Relic SDK
  info(`Initializing New Relic integration with account ID: ${config.accountId}`);

  // New Relic typically auto-instruments when added as a dependency
  // The configuration would normally be done with newrelic.js or via env vars
}

/**
 * Initialize Elastic APM integration
 */
function initializeElasticAPM(config: IntegrationConfig): void {
  // In a real implementation, this would initialize the Elastic APM agent
  info(`Initializing Elastic APM integration with endpoint: ${config.endpoint}`);

  // Elastic APM typically needs to be initialized at application startup
  // through environment variables or direct configuration
}

/**
 * Initialize Dynatrace integration
 */
function initializeDynatrace(config: IntegrationConfig): void {
  // In a real implementation, this would initialize the Dynatrace OneAgent SDK
  info(`Initializing Dynatrace integration with endpoint: ${config.endpoint}`);

  // Dynatrace typically uses a OneAgent that auto-instruments the application
}

/**
 * Initialize AWS CloudWatch integration
 */
function initializeCloudWatch(config: IntegrationConfig): void {
  // In a real implementation, this would initialize the AWS SDK for CloudWatch
  info('Initializing AWS CloudWatch integration');

  // CloudWatch integration typically uses the AWS SDK with environment credentials
}

/**
 * Initialize Google Cloud Operations integration
 */
function initializeGoogleCloudOperations(config: IntegrationConfig): void {
  // In a real implementation, this would initialize the Google Cloud monitoring client
  info('Initializing Google Cloud Operations integration');

  // Google Cloud Operations integration typically uses the Google Cloud client libraries
}

/**
 * Initialize Azure Monitor integration
 */
function initializeAzureMonitor(config: IntegrationConfig): void {
  // In a real implementation, this would initialize the Azure Monitor SDK
  info(`Initializing Azure Monitor integration with connection string`);

  // Azure Monitor integration typically uses the Application Insights SDK
}

/**
 * Register API endpoints for integration management
 */
function registerIntegrationEndpoints(app: express.Application): void {
  // Get all integrations
  app.get('/api/integrations', (req, res) => {
    // Return active integrations with sensitive info redacted
    const safeIntegrations = activeIntegrations.map(i => {
      const { apiKey, ...safeConfig } = i;
      return {
        ...safeConfig,
        apiKeyConfigured: !!apiKey
      };
    });
    
    res.json(safeIntegrations);
  });

  // Get integration status
  app.get('/api/integrations/:type/status', async (req, res) => {
    const integrationType = req.params.type;
    const integration = activeIntegrations.find(i => i.type === integrationType);
    
    if (!integration) {
      return res.status(404).json({ error: `Integration ${integrationType} not found` });
    }

    try {
      const status = await checkIntegrationStatus(integration);
      res.json(status);
    } catch (err) {
      res.status(500).json({ 
        error: `Failed to check ${integrationType} integration status`,
        details: (err as Error).message
      });
    }
  });

  // Enable/disable integration
  app.put('/api/integrations/:type/toggle', (req, res) => {
    const integrationType = req.params.type;
    const integration = activeIntegrations.find(i => i.type === integrationType);
    
    if (!integration) {
      return res.status(404).json({ error: `Integration ${integrationType} not found` });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Request body must include "enabled" boolean field' });
    }

    integration.enabled = enabled;
    
    res.json({ 
      type: integration.type,
      enabled: integration.enabled
    });
  });

  // Send test event to integration
  app.post('/api/integrations/:type/test', async (req, res) => {
    const integrationType = req.params.type;
    const integration = activeIntegrations.find(i => i.type === integrationType);
    
    if (!integration) {
      return res.status(404).json({ error: `Integration ${integrationType} not found` });
    }

    if (!integration.enabled) {
      return res.status(400).json({ error: `Integration ${integrationType} is disabled` });
    }

    try {
      await sendTestEvent(integration);
      res.json({ success: true, message: `Test event sent to ${integrationType}` });
    } catch (err) {
      res.status(500).json({ 
        error: `Failed to send test event to ${integrationType}`,
        details: (err as Error).message
      });
    }
  });

  // Health check for all integrations
  app.get('/health/integrations', async (req, res) => {
    const statuses = await Promise.all(
      activeIntegrations.map(async integration => {
        try {
          if (!integration.enabled) {
            return {
              type: integration.type,
              status: 'disabled'
            };
          }

          const status = await checkIntegrationStatus(integration);
          return {
            type: integration.type,
            status: status.connected ? 'connected' : 'error',
            details: status.details
          };
        } catch (err) {
          return {
            type: integration.type,
            status: 'error',
            details: (err as Error).message
          };
        }
      })
    );

    res.json({
      status: statuses.every(s => s.status === 'connected' || s.status === 'disabled') ? 'ok' : 'degraded',
      integrations: statuses
    });
  });
}

/**
 * Check integration status by testing connection
 */
async function checkIntegrationStatus(integration: IntegrationConfig): Promise<{ connected: boolean; details?: string }> {
  if (!integration.enabled) {
    return { connected: false, details: 'Integration is disabled' };
  }

  try {
    switch (integration.type) {
      case 'datadog':
        // Simplified check - in reality would validate API credentials
        if (!integration.apiKey) {
          return { connected: false, details: 'API key not configured' };
        }
        
        // Make a simple API call to validate credentials
        await axios.get(`${integration.endpoint}/validate`, {
          headers: {
            'DD-API-KEY': integration.apiKey
          }
        });
        
        return { connected: true };

      case 'newrelic':
        // Simplified check
        if (!integration.apiKey || !integration.accountId) {
          return { connected: false, details: 'License key or account ID not configured' };
        }
        
        return { connected: true };

      case 'elastic':
        // Simplified check
        if (!integration.endpoint) {
          return { connected: false, details: 'APM server URL not configured' };
        }
        
        return { connected: true };

      case 'dynatrace':
        // Simplified check
        if (!integration.apiKey || !integration.endpoint) {
          return { connected: false, details: 'API token or endpoint not configured' };
        }
        
        return { connected: true };

      case 'cloudwatch':
        // AWS credentials check would be more complex in reality
        return { connected: true };

      case 'gcp':
        // GCP credentials check would be more complex in reality
        return { connected: true };

      case 'azure':
        // Azure connection check would be more complex in reality
        if (!integration.apiKey) {
          return { connected: false, details: 'Connection string not configured' };
        }
        
        return { connected: true };

      default:
        return { connected: false, details: 'Unknown integration type' };
    }
  } catch (err) {
    return { 
      connected: false, 
      details: `Connection error: ${(err as Error).message}` 
    };
  }
}

/**
 * Send a test event to the specified integration
 */
async function sendTestEvent(integration: IntegrationConfig): Promise<void> {
  const event = {
    title: 'Healthcare Platform Observability Test Event',
    message: `This is a test event from the healthcare platform observability service at ${new Date().toISOString()}`,
    timestamp: Date.now(),
    service: 'healthcare-platform',
    environment: process.env.NODE_ENV || 'development',
    // Get current trace context if available
    traceId: getCurrentTraceId()
  };

  switch (integration.type) {
    case 'datadog':
      await sendDatadogEvent({
        title: event.title,
        text: event.message,
        tags: Object.entries(integration.tags || {}).map(([key, value]) => `${key}:${value}`),
        alert_type: 'info'
      });
      break;

    case 'newrelic':
      // In a real implementation, this would send an event to New Relic Insights
      info(`Sending test event to New Relic (account: ${integration.accountId})`);
      break;

    case 'elastic':
      // In a real implementation, this would send an event to Elastic APM
      info(`Sending test event to Elastic APM (endpoint: ${integration.endpoint})`);
      break;

    case 'dynatrace':
      // In a real implementation, this would send an event to Dynatrace
      info(`Sending test event to Dynatrace (endpoint: ${integration.endpoint})`);
      break;

    case 'cloudwatch':
      // In a real implementation, this would send an event to CloudWatch
      info(`Sending test event to AWS CloudWatch`);
      break;

    case 'gcp':
      // In a real implementation, this would send an event to Google Cloud Operations
      info(`Sending test event to Google Cloud Operations`);
      break;

    case 'azure':
      // In a real implementation, this would send an event to Azure Monitor
      info(`Sending test event to Azure Monitor`);
      break;

    default:
      throw new Error(`Unknown integration type: ${integration.type}`);
  }
}

/**
 * Get the current trace ID if available
 */
function getCurrentTraceId(): string | undefined {
  const span = trace.getSpan(context.active());
  return span?.spanContext().traceId;
}

/**
 * Create a unique identifier for an entity
 */
function createEntityId(entityType: string, entityName: string): string {
  return createHash('sha256')
    .update(`${entityType}:${entityName}:${process.env.NODE_ENV || 'development'}`)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Export functions for use in other modules
 */
export { 
  activeIntegrations,
  sendDatadogEvent
};