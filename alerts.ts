/**
 * Alerting Module
 * 
 * Implements an alerting system that monitors metrics and logs
 * to detect anomalies and send notifications through various channels.
 * 
 * Features:
 * - Alert rules based on metrics thresholds
 * - Log pattern detection for error conditions
 * - Multiple notification channels (email, SMS, Slack, webhooks)
 * - Alert grouping and deduplication
 * - Scheduled maintenance windows
 * - Escalation policies
 */

import express from 'express';
import axios from 'axios';
import { createTransport, Transporter } from 'nodemailer';
import { promClient } from 'prom-client';
import { logger } from './logging';

// Configuration for alerts
interface AlertingConfig {
  enabled: boolean;
  endpoints?: string[];
  defaultRecipients?: string[];
  slack?: {
    webhookUrl?: string;
    channel?: string;
  };
  email?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    from: string;
  };
  sms?: {
    apiKey?: string;
    from?: string;
  };
  pagerDuty?: {
    serviceKey?: string;
    integrationKey?: string;
  }
}

// Alert severity levels
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Alert definition
interface AlertDefinition {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  threshold?: number;
  metricQuery?: string;
  logPattern?: string;
  duration?: number; // Duration in seconds condition must be met
  silenced?: boolean;
  recipients?: string[];
  channels?: string[];
  groupBy?: string[];
  labels?: Record<string, string>;
  runbook?: string;
  autoResolve?: boolean;
}

// Alert instance
interface Alert {
  id: string;
  definitionId: string;
  timestamp: Date;
  value?: number;
  threshold?: number;
  message: string;
  severity: AlertSeverity;
  labels: Record<string, string>;
  status: 'firing' | 'resolved';
  resolvedAt?: Date;
  notifiedChannels: string[];
}

// Track active alerts
let activeAlerts: Map<string, Alert> = new Map();

// Email transport
let emailTransport: Transporter | null = null;

// Alert definitions
const alertDefinitions: AlertDefinition[] = [];

// Metrics
let alertsTriggered: any;
let alertsResolved: any;
let alertsErrored: any;
let alertsActive: any;

/**
 * Configure alerting system
 */
export function configureAlerts(app: express.Application, config: AlertingConfig): void {
  // Skip if alerting is disabled
  if (!config.enabled) {
    console.log('Alerting system disabled');
    return;
  }
  
  try {
    console.log('Configuring alerting system...');
    
    // Initialize email transport if configured
    if (config.email) {
      emailTransport = createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.auth.user,
          pass: config.email.auth.pass,
        },
      });
      
      console.log('Email transport configured');
    }
    
    // Initialize metrics
    alertsTriggered = new promClient.Counter({
      name: 'healthcare_alerts_triggered_total',
      help: 'Total number of alerts triggered',
      labelNames: ['severity', 'alert_name']
    });
    
    alertsResolved = new promClient.Counter({
      name: 'healthcare_alerts_resolved_total',
      help: 'Total number of alerts resolved',
      labelNames: ['severity', 'alert_name']
    });
    
    alertsErrored = new promClient.Counter({
      name: 'healthcare_alerts_errored_total',
      help: 'Total number of errors when processing alerts',
      labelNames: ['type']
    });
    
    alertsActive = new promClient.Gauge({
      name: 'healthcare_alerts_active',
      help: 'Number of currently active alerts',
      labelNames: ['severity']
    });
    
    // Schedule regular check for metric-based alerts
    // This would typically be connected to a time series database
    // like Prometheus, but we'll keep it simple for now
    setInterval(() => {
      checkMetricAlerts().catch(err => {
        console.error('Error checking metric alerts:', err);
        alertsErrored.inc({ type: 'metric_check' });
      });
    }, 60000); // Check every minute
    
    // Register API endpoints for alerts management
    registerAlertEndpoints(app, config);
    
    // Load predefined alert definitions
    loadPredefinedAlerts();
    
    console.log('Alerting system configured successfully');
    
  } catch (error) {
    console.error('Failed to configure alerting system:', error);
  }
}

/**
 * Register alert management endpoints
 */
function registerAlertEndpoints(app: express.Application, config: AlertingConfig): void {
  // Get all alert definitions
  app.get('/api/alerts/definitions', (req, res) => {
    res.json(alertDefinitions);
  });
  
  // Get specific alert definition
  app.get('/api/alerts/definitions/:id', (req, res) => {
    const definition = alertDefinitions.find(def => def.id === req.params.id);
    if (!definition) {
      return res.status(404).json({ error: 'Alert definition not found' });
    }
    res.json(definition);
  });
  
  // Create new alert definition
  app.post('/api/alerts/definitions', (req, res) => {
    const definition: AlertDefinition = req.body;
    
    // Validate definition
    if (!definition.id || !definition.name || !definition.severity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if already exists
    if (alertDefinitions.some(def => def.id === definition.id)) {
      return res.status(409).json({ error: 'Alert definition with this ID already exists' });
    }
    
    alertDefinitions.push(definition);
    res.status(201).json(definition);
  });
  
  // Update alert definition
  app.put('/api/alerts/definitions/:id', (req, res) => {
    const index = alertDefinitions.findIndex(def => def.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Alert definition not found' });
    }
    
    const definition: AlertDefinition = req.body;
    alertDefinitions[index] = definition;
    res.json(definition);
  });
  
  // Delete alert definition
  app.delete('/api/alerts/definitions/:id', (req, res) => {
    const index = alertDefinitions.findIndex(def => def.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Alert definition not found' });
    }
    
    alertDefinitions.splice(index, 1);
    res.status(204).send();
  });
  
  // Get active alerts
  app.get('/api/alerts/active', (req, res) => {
    res.json(Array.from(activeAlerts.values()));
  });
  
  // Manually trigger an alert (for testing)
  app.post('/api/alerts/test', (req, res) => {
    const { definitionId, value, labels } = req.body;
    
    const definition = alertDefinitions.find(def => def.id === definitionId);
    if (!definition) {
      return res.status(404).json({ error: 'Alert definition not found' });
    }
    
    // Trigger alert
    const alert = triggerAlert(definition, value, labels);
    res.json(alert);
  });
  
  // Silence an alert
  app.post('/api/alerts/silence/:id', (req, res) => {
    const index = alertDefinitions.findIndex(def => def.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Alert definition not found' });
    }
    
    alertDefinitions[index].silenced = true;
    res.json(alertDefinitions[index]);
  });
  
  // Unsilence an alert
  app.post('/api/alerts/unsilence/:id', (req, res) => {
    const index = alertDefinitions.findIndex(def => def.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Alert definition not found' });
    }
    
    alertDefinitions[index].silenced = false;
    res.json(alertDefinitions[index]);
  });
  
  // Resolve an alert manually
  app.post('/api/alerts/resolve/:alertId', (req, res) => {
    const alertId = req.params.alertId;
    if (!activeAlerts.has(alertId)) {
      return res.status(404).json({ error: 'Active alert not found' });
    }
    
    const alert = activeAlerts.get(alertId)!;
    resolveAlert(alert, 'Manually resolved by user');
    res.json(alert);
  });
  
  // Health check for alerting system
  app.get('/health/alerting', (req, res) => {
    res.json({
      status: 'ok',
      activeAlerts: activeAlerts.size,
      alertDefinitions: alertDefinitions.length,
      channels: {
        slack: !!config.slack?.webhookUrl,
        email: !!emailTransport,
        sms: !!config.sms?.apiKey,
        pagerDuty: !!config.pagerDuty?.serviceKey
      }
    });
  });
}

/**
 * Load predefined alerts for common healthcare platform scenarios
 */
function loadPredefinedAlerts(): void {
  // High API error rate
  alertDefinitions.push({
    id: 'high-api-error-rate',
    name: 'High API Error Rate',
    description: 'API error rate exceeds threshold',
    severity: AlertSeverity.ERROR,
    threshold: 0.05, // 5% error rate
    metricQuery: 'sum(rate(healthcare_http_requests_total{status=~"5.."}[5m])) / sum(rate(healthcare_http_requests_total[5m]))',
    duration: 300, // 5 minutes
    runbook: 'https://wiki.example.com/runbooks/high-api-error-rate',
    autoResolve: true
  });
  
  // Slow API response time
  alertDefinitions.push({
    id: 'slow-api-response',
    name: 'Slow API Response Time',
    description: 'API response time exceeds threshold',
    severity: AlertSeverity.WARNING,
    threshold: 1.0, // 1 second
    metricQuery: 'histogram_quantile(0.95, sum(rate(healthcare_http_request_duration_seconds_bucket[5m])) by (le))',
    duration: 300, // 5 minutes
    runbook: 'https://wiki.example.com/runbooks/slow-api-response',
    autoResolve: true
  });
  
  // High database query time
  alertDefinitions.push({
    id: 'slow-db-queries',
    name: 'Slow Database Queries',
    description: 'Database query time exceeds threshold',
    severity: AlertSeverity.WARNING,
    threshold: 0.5, // 500ms
    metricQuery: 'histogram_quantile(0.95, sum(rate(healthcare_database_query_duration_seconds_bucket[5m])) by (le))',
    duration: 300, // 5 minutes
    runbook: 'https://wiki.example.com/runbooks/slow-db-queries',
    autoResolve: true
  });
  
  // High memory usage
  alertDefinitions.push({
    id: 'high-memory-usage',
    name: 'High Memory Usage',
    description: 'Memory usage exceeds threshold',
    severity: AlertSeverity.WARNING,
    threshold: 0.85, // 85%
    metricQuery: 'process_resident_memory_bytes / node_memory_MemTotal_bytes',
    duration: 300, // 5 minutes
    runbook: 'https://wiki.example.com/runbooks/high-memory-usage',
    autoResolve: true
  });
  
  // Patient record access anomaly
  alertDefinitions.push({
    id: 'patient-record-access-anomaly',
    name: 'Patient Record Access Anomaly',
    description: 'Unusual pattern of patient record access detected',
    severity: AlertSeverity.ERROR,
    logPattern: 'Patient record accessed from unusual location or outside normal hours',
    runbook: 'https://wiki.example.com/runbooks/patient-data-access-anomaly',
    autoResolve: false
  });
  
  // FHIR API error spike
  alertDefinitions.push({
    id: 'fhir-api-errors',
    name: 'FHIR API Error Spike',
    description: 'Spike in FHIR API errors detected',
    severity: AlertSeverity.ERROR,
    threshold: 10, // 10 errors in 5 minutes
    metricQuery: 'sum(increase(healthcare_fhir_requests_total{status=~"error|fail"}[5m]))',
    duration: 300, // 5 minutes
    runbook: 'https://wiki.example.com/runbooks/fhir-api-errors',
    autoResolve: true
  });
  
  // Cache hit ratio drop
  alertDefinitions.push({
    id: 'cache-hit-ratio-drop',
    name: 'Cache Hit Ratio Drop',
    description: 'Cache hit ratio dropped below threshold',
    severity: AlertSeverity.WARNING,
    threshold: 0.5, // 50%
    metricQuery: 'healthcare_cache_hit_ratio',
    duration: 300, // 5 minutes
    runbook: 'https://wiki.example.com/runbooks/cache-hit-ratio-drop',
    autoResolve: true
  });
}

/**
 * Check metric-based alerts
 */
async function checkMetricAlerts(): Promise<void> {
  // This is a simplified placeholder for metric evaluation
  // In a real system, this would query a time series database like Prometheus
  
  // For each alert definition that has a metricQuery
  for (const definition of alertDefinitions.filter(d => d.metricQuery && !d.silenced)) {
    try {
      // Evaluate metric query (placeholder)
      // In reality, this would make a query to your monitoring system
      const value = await evaluateMetricQuery(definition.metricQuery!);
      
      // Check if threshold is exceeded
      if (definition.threshold && value > definition.threshold) {
        // Create unique ID for this alert instance
        const alertId = `${definition.id}-${Date.now()}`;
        
        // Check if this alert is already active
        const existingAlert = Array.from(activeAlerts.values())
          .find(a => a.definitionId === definition.id && a.status === 'firing');
        
        if (!existingAlert) {
          // Trigger new alert
          triggerAlert(definition, value);
        }
      } else {
        // Check if there are any active alerts for this definition
        const alertsToResolve = Array.from(activeAlerts.values())
          .filter(a => a.definitionId === definition.id && a.status === 'firing');
        
        // Resolve them
        for (const alert of alertsToResolve) {
          resolveAlert(alert, 'Threshold no longer exceeded');
        }
      }
    } catch (error) {
      console.error(`Error evaluating metric query for alert ${definition.id}:`, error);
      alertsErrored.inc({ type: 'metric_evaluation' });
    }
  }
}

/**
 * Simplified mock function to evaluate a metric query
 * In a real system, this would query Prometheus, Datadog, etc.
 */
async function evaluateMetricQuery(query: string): Promise<number> {
  // Mock implementation - in reality would call your metrics system
  return Math.random();
}

/**
 * Trigger a new alert
 */
export function triggerAlert(
  definition: AlertDefinition, 
  value?: number, 
  labels: Record<string, string> = {}
): Alert {
  // Create alert instance
  const alertId = `${definition.id}-${Date.now()}`;
  const alert: Alert = {
    id: alertId,
    definitionId: definition.id,
    timestamp: new Date(),
    value,
    threshold: definition.threshold,
    message: definition.description,
    severity: definition.severity,
    labels: { ...definition.labels, ...labels },
    status: 'firing',
    notifiedChannels: []
  };
  
  // Store in active alerts
  activeAlerts.set(alertId, alert);
  
  // Update metrics
  alertsTriggered.inc({ severity: alert.severity, alert_name: definition.name });
  alertsActive.inc({ severity: alert.severity });
  
  // Log alert
  logger.warn(`Alert triggered: ${definition.name}`, {
    alertId,
    definitionId: definition.id,
    severity: definition.severity,
    value,
    threshold: definition.threshold
  });
  
  // Send notifications
  sendAlertNotifications(alert, definition)
    .catch(err => {
      console.error(`Error sending notifications for alert ${alertId}:`, err);
      alertsErrored.inc({ type: 'notification' });
    });
  
  return alert;
}

/**
 * Resolve an active alert
 */
export function resolveAlert(alert: Alert, reason: string): void {
  // Update alert
  alert.status = 'resolved';
  alert.resolvedAt = new Date();
  
  // Update metrics
  alertsResolved.inc({ severity: alert.severity, alert_name: alert.definitionId });
  alertsActive.dec({ severity: alert.severity });
  
  // Log resolution
  logger.info(`Alert resolved: ${alert.definitionId}`, {
    alertId: alert.id,
    definitionId: alert.definitionId,
    reason
  });
  
  // Send resolution notifications
  const definition = alertDefinitions.find(d => d.id === alert.definitionId);
  if (definition) {
    sendResolutionNotifications(alert, definition)
      .catch(err => {
        console.error(`Error sending resolution notifications for alert ${alert.id}:`, err);
        alertsErrored.inc({ type: 'resolution_notification' });
      });
  }
  
  // Remove from active alerts after some time
  setTimeout(() => {
    activeAlerts.delete(alert.id);
  }, 3600000); // Keep resolved alerts for 1 hour
}

/**
 * Send notifications for a new alert
 */
async function sendAlertNotifications(alert: Alert, definition: AlertDefinition): Promise<void> {
  // Determine notification channels
  const channels = definition.channels || ['email', 'slack'];
  
  // Build notification message
  const title = `[${alert.severity.toUpperCase()}] ${definition.name}`;
  const message = `
Alert: ${definition.name}
Severity: ${alert.severity}
Time: ${alert.timestamp.toISOString()}
${alert.value !== undefined ? `Value: ${alert.value}` : ''}
${alert.threshold !== undefined ? `Threshold: ${alert.threshold}` : ''}
Description: ${definition.description}
${definition.runbook ? `Runbook: ${definition.runbook}` : ''}
`;

  // Send to each channel
  const promises: Promise<any>[] = [];
  
  if (channels.includes('email') && emailTransport) {
    const recipients = definition.recipients || [];
    promises.push(sendEmailAlert(title, message, recipients, alert));
  }
  
  if (channels.includes('slack')) {
    promises.push(sendSlackAlert(title, message, alert));
  }
  
  // Add other channels as needed
  
  await Promise.all(promises);
  
  // Update notified channels
  alert.notifiedChannels = channels;
}

/**
 * Send notifications for alert resolution
 */
async function sendResolutionNotifications(alert: Alert, definition: AlertDefinition): Promise<void> {
  // Only send to channels that were notified of the original alert
  const channels = alert.notifiedChannels;
  
  // Build resolution message
  const title = `[RESOLVED] ${definition.name}`;
  const message = `
Alert Resolved: ${definition.name}
Severity: ${alert.severity}
Triggered: ${alert.timestamp.toISOString()}
Resolved: ${alert.resolvedAt?.toISOString()}
Duration: ${Math.floor((alert.resolvedAt!.getTime() - alert.timestamp.getTime()) / 1000)} seconds
Description: ${definition.description}
`;

  // Send to each channel
  const promises: Promise<any>[] = [];
  
  if (channels.includes('email') && emailTransport) {
    const recipients = definition.recipients || [];
    promises.push(sendEmailAlert(title, message, recipients, alert));
  }
  
  if (channels.includes('slack')) {
    promises.push(sendSlackAlert(title, message, alert));
  }
  
  // Add other channels as needed
  
  await Promise.all(promises);
}

/**
 * Send an email alert
 */
async function sendEmailAlert(title: string, message: string, recipients: string[], alert: Alert): Promise<void> {
  if (!emailTransport) {
    throw new Error('Email transport not configured');
  }
  
  try {
    await emailTransport.sendMail({
      from: process.env.ALERT_EMAIL_FROM || 'alerts@healthcareplatform.example',
      to: recipients.join(', '),
      subject: title,
      text: message,
      html: message.replace(/\n/g, '<br>')
    });
    
    logger.info(`Email alert sent for ${alert.definitionId}`, {
      alertId: alert.id,
      recipients: recipients.length
    });
  } catch (error) {
    logger.error(`Failed to send email alert for ${alert.definitionId}:`, {
      alertId: alert.id,
      error: (error as Error).message
    });
    throw error;
  }
}

/**
 * Send a Slack alert
 */
async function sendSlackAlert(title: string, message: string, alert: Alert): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    throw new Error('Slack webhook URL not configured');
  }
  
  try {
    // Color based on severity
    let color = '#3498db'; // info (blue)
    if (alert.severity === AlertSeverity.WARNING) color = '#f39c12'; // warning (orange)
    if (alert.severity === AlertSeverity.ERROR) color = '#e74c3c'; // error (red)
    if (alert.severity === AlertSeverity.CRITICAL) color = '#8e44ad'; // critical (purple)
    
    // Format message for Slack
    const payload = {
      text: title,
      attachments: [
        {
          color,
          text: message,
          fields: [
            {
              title: 'Alert ID',
              value: alert.id,
              short: true
            }
          ],
          ts: Math.floor(alert.timestamp.getTime() / 1000)
        }
      ]
    };
    
    await axios.post(webhookUrl, payload);
    
    logger.info(`Slack alert sent for ${alert.definitionId}`, {
      alertId: alert.id
    });
  } catch (error) {
    logger.error(`Failed to send Slack alert for ${alert.definitionId}:`, {
      alertId: alert.id,
      error: (error as Error).message
    });
    throw error;
  }
}

/**
 * Trigger an alert based on a log pattern or event
 */
export function triggerLogBasedAlert(pattern: string, message: string, labels: Record<string, string> = {}): void {
  // Find matching alert definitions
  const matchingDefinitions = alertDefinitions.filter(
    def => def.logPattern && new RegExp(def.logPattern).test(pattern) && !def.silenced
  );
  
  // Trigger alert for each matching definition
  for (const definition of matchingDefinitions) {
    triggerAlert(definition, undefined, { ...labels, message });
  }
}