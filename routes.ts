/**
 * Routes Module for Observability Service
 * 
 * Defines API routes for the observability service including:
 * - Health checks
 * - API documentation
 * - Management endpoints for monitoring components
 * - Metric visualization dashboards (simplified)
 */

import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { info, warn, error, debug } from './logging';
import { createCustomSpanMiddleware, withSpan } from './tracing';
import { incrementBusinessMetric } from './metrics';
import { triggerAlert, AlertSeverity } from './alerts';
import { activeIntegrations } from './integrations';
import { cpus, freemem, totalmem } from 'os';
import { readFileSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper function to read package.json
function getPackageInfo(): { name: string; version: string; description: string } {
  try {
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
    );
    return {
      name: packageJson.name || 'healthcare-observability',
      version: packageJson.version || '0.1.0',
      description: packageJson.description || 'Healthcare Platform Observability Service'
    };
  } catch (err) {
    return {
      name: 'healthcare-observability',
      version: '0.1.0',
      description: 'Healthcare Platform Observability Service'
    };
  }
}

// Get package info
const packageInfo = getPackageInfo();

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: packageInfo.name,
      version: packageInfo.version,
      description: packageInfo.description,
    },
    servers: [
      {
        url: '/api',
        description: 'Observability Service API',
      },
    ],
  },
  apis: ['./src/routes.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Register routes for the observability service
 */
export function registerRoutes(app: express.Application): void {
  // Root endpoint with service info
  app.get('/', (req, res) => {
    res.json({
      service: packageInfo.name,
      version: packageInfo.version,
      description: packageInfo.description,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // API documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // API routes
  registerApiRoutes(app);

  // Health check endpoints
  registerHealthRoutes(app);

  // Dashboard routes
  registerDashboardRoutes(app);

  // Catch-all 404 handler
  app.use((req, res) => {
    warn(`Route not found: ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
    res.status(404).json({
      error: 'Not Found',
      message: `The requested resource ${req.originalUrl} was not found`,
    });
  });

  // Global error handler
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      error(`Request error: ${err.message}`, err, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
      });
    }
  );
}

/**
 * Register API routes
 */
function registerApiRoutes(app: express.Application): void {
  const apiRouter = express.Router();

  // Apply tracing middleware to all API routes
  apiRouter.use(createCustomSpanMiddleware('API Request'));

  /**
   * @swagger
   * /logs/query:
   *   post:
   *     summary: Query logs
   *     description: Search and filter logs from the centralized logging system
   *     tags: [Logs]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               query:
   *                 type: string
   *                 description: Search query
   *               timeRange:
   *                 type: object
   *                 properties:
   *                   start:
   *                     type: string
   *                     format: date-time
   *                   end:
   *                     type: string
   *                     format: date-time
   *               limit:
   *                 type: integer
   *                 default: 100
   *               page:
   *                 type: integer
   *                 default: 1
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 logs:
   *                   type: array
   *                   items:
   *                     type: object
   *                 count:
   *                   type: integer
   *                 total:
   *                   type: integer
   */
  apiRouter.post('/logs/query', async (req, res) => {
    try {
      // In a real implementation, this would query a log storage system
      // For now, we return mock data
      const { query, timeRange, limit = 100, page = 1 } = req.body;

      await withSpan('logs-query', async (span) => {
        span.setAttribute('query', query || '');
        span.setAttribute('limit', limit);
        span.setAttribute('page', page);

        incrementBusinessMetric('log_queries', { type: 'api' });

        res.json({
          logs: [],
          count: 0,
          total: 0,
          query,
          timeRange,
          page,
          limit
        });
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /metrics/query:
   *   post:
   *     summary: Query metrics
   *     description: Fetch time series metrics from the monitoring system
   *     tags: [Metrics]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               query:
   *                 type: string
   *                 description: Prometheus/PromQL compatible query
   *               timeRange:
   *                 type: object
   *                 properties:
   *                   start:
   *                     type: string
   *                     format: date-time
   *                   end:
   *                     type: string
   *                     format: date-time
   *               step:
   *                 type: string
   *                 default: 1m
   *                 description: Time step for data points (e.g. 30s, 1m, 5m)
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   */
  apiRouter.post('/metrics/query', async (req, res, next) => {
    try {
      // In a real implementation, this would query a Prometheus-compatible API
      const { query, timeRange, step = '1m' } = req.body;

      await withSpan('metrics-query', async (span) => {
        span.setAttribute('query', query || '');
        span.setAttribute('step', step);

        incrementBusinessMetric('metric_queries', { type: 'api' });

        res.json({
          status: 'success',
          data: {
            resultType: 'matrix',
            result: []
          },
          query,
          timeRange,
          step
        });
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /traces/query:
   *   post:
   *     summary: Query traces
   *     description: Search and retrieve distributed traces from the tracing system
   *     tags: [Traces]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               service:
   *                 type: string
   *               operation:
   *                 type: string
   *               tags:
   *                 type: object
   *                 additionalProperties:
   *                   type: string
   *               timeRange:
   *                 type: object
   *                 properties:
   *                   start:
   *                     type: string
   *                     format: date-time
   *                   end:
   *                     type: string
   *                     format: date-time
   *               limit:
   *                 type: integer
   *                 default: 20
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   */
  apiRouter.post('/traces/query', async (req, res, next) => {
    try {
      // In a real implementation, this would query Jaeger/Zipkin/etc.
      const { service, operation, tags, timeRange, limit = 20 } = req.body;

      await withSpan('traces-query', async (span) => {
        span.setAttribute('service', service || '');
        span.setAttribute('operation', operation || '');
        span.setAttribute('limit', limit);

        incrementBusinessMetric('trace_queries', { type: 'api' });

        res.json({
          traces: [],
          total: 0
        });
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /service-map:
   *   get:
   *     summary: Get service dependency map
   *     description: Returns the current service dependency graph built from trace data
   *     tags: [System]
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   */
  apiRouter.get('/service-map', async (req, res, next) => {
    try {
      // In a real implementation, this would build a service map from trace data
      await withSpan('service-map', async () => {
        incrementBusinessMetric('service_map_requests');

        res.json({
          nodes: [],
          edges: []
        });
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /system/info:
   *   get:
   *     summary: Get system information
   *     description: Returns information about the healthcare platform system
   *     tags: [System]
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   */
  apiRouter.get('/system/info', async (req, res, next) => {
    try {
      await withSpan('system-info', async () => {
        const memoryUsage = process.memoryUsage();
        
        res.json({
          system: {
            arch: process.arch,
            platform: process.platform,
            cpus: cpus().length,
            memory: {
              total: totalmem(),
              free: freemem(),
              usage: ((totalmem() - freemem()) / totalmem() * 100).toFixed(2) + '%'
            }
          },
          process: {
            pid: process.pid,
            uptime: process.uptime(),
            memory: {
              rss: memoryUsage.rss,
              heapTotal: memoryUsage.heapTotal,
              heapUsed: memoryUsage.heapUsed,
              external: memoryUsage.external,
              arrayBuffers: memoryUsage.arrayBuffers
            }
          },
          environment: process.env.NODE_ENV,
          version: packageInfo.version
        });
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /test/error:
   *   get:
   *     summary: Test error reporting
   *     description: Generates a test error to verify error tracking
   *     tags: [Testing]
   *     responses:
   *       500:
   *         description: Test error generated
   */
  apiRouter.get('/test/error', (req, res, next) => {
    try {
      // This is intentionally generating an error
      throw new Error('Test error for observability verification');
    } catch (err) {
      next(err);
    }
  });

  /**
   * @swagger
   * /test/alert:
   *   post:
   *     summary: Test alert system
   *     description: Triggers a test alert to verify alerting functionality
   *     tags: [Testing]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               severity:
   *                 type: string
   *                 enum: [info, warning, error, critical]
   *                 default: info
   *               message:
   *                 type: string
   *                 default: Test alert
   *     responses:
   *       200:
   *         description: Alert triggered successfully
   */
  apiRouter.post('/test/alert', async (req, res, next) => {
    try {
      const { severity = 'info', message = 'Test alert' } = req.body;
      
      // Create a mock alert definition for testing
      const testAlert = {
        id: 'test-alert',
        name: 'Test Alert',
        description: message,
        severity: severity as AlertSeverity,
        runbook: 'https://wiki.example.com/runbooks/test-alert'
      };
      
      // Trigger the test alert
      const alertInstance = triggerAlert(testAlert);
      
      res.json({
        success: true,
        alert: alertInstance
      });
    } catch (err) {
      next(err);
    }
  });

  // Mount the API router
  app.use('/api', apiRouter);
}

/**
 * Register health check routes
 */
function registerHealthRoutes(app: express.Application): void {
  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Overall health check
   *     description: Returns the overall health status of the observability service
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Service is healthy
   *       503:
   *         description: Service has health issues
   */
  app.get('/health', async (req, res) => {
    try {
      // Check all components
      const results = await Promise.all([
        checkComponentHealth('system'),
        checkComponentHealth('logging'),
        checkComponentHealth('metrics'),
        checkComponentHealth('tracing'),
        checkComponentHealth('alerts'),
        checkComponentHealth('integrations')
      ]);
      
      const healthy = results.every(result => result.status === 'ok');
      
      res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        version: packageInfo.version,
        components: results,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({
        status: 'error',
        error: (err as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * @swagger
   * /health/system:
   *   get:
   *     summary: System health check
   *     description: Checks the health of the system (CPU, memory, disk)
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: System is healthy
   *       503:
   *         description: System has health issues
   */
  app.get('/health/system', async (req, res) => {
    try {
      const result = await checkComponentHealth('system');
      res.status(result.status === 'ok' ? 200 : 503).json(result);
    } catch (err) {
      res.status(500).json({
        status: 'error',
        error: (err as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add a liveness probe for Kubernetes
  app.get('/health/liveness', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // Add a readiness probe for Kubernetes
  app.get('/health/readiness', async (req, res) => {
    try {
      // Check all dependencies are ready
      const systems = [
        checkDependencyHealth('logging'),
        checkDependencyHealth('metrics'),
        checkDependencyHealth('tracing')
      ];
      
      const results = await Promise.all(systems);
      const ready = results.every(result => result.status === 'ok');
      
      res.status(ready ? 200 : 503).json({
        status: ready ? 'ok' : 'not_ready',
        dependencies: results,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({
        status: 'error',
        error: (err as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * Register dashboard routes
 */
function registerDashboardRoutes(app: express.Application): void {
  /**
   * @swagger
   * /dashboards:
   *   get:
   *     summary: List available dashboards
   *     description: Returns a list of available dashboards
   *     tags: [Dashboards]
   *     responses:
   *       200:
   *         description: List of dashboards
   */
  app.get('/api/dashboards', (req, res) => {
    res.json({
      dashboards: [
        {
          id: 'system-overview',
          name: 'System Overview',
          description: 'High-level system metrics',
          url: '/dashboards/system-overview'
        },
        {
          id: 'api-performance',
          name: 'API Performance',
          description: 'Detailed API performance metrics',
          url: '/dashboards/api-performance'
        },
        {
          id: 'database',
          name: 'Database',
          description: 'Database performance metrics',
          url: '/dashboards/database'
        },
        {
          id: 'errors',
          name: 'Errors & Exceptions',
          description: 'Error monitoring dashboard',
          url: '/dashboards/errors'
        },
        {
          id: 'security',
          name: 'Security',
          description: 'Security monitoring dashboard',
          url: '/dashboards/security'
        }
      ]
    });
  });

  // In a real implementation, this would return actual dashboard data
  // or redirect to a dashboard system like Grafana
  app.get('/dashboards/:id', (req, res) => {
    res.json({
      message: `This would display the ${req.params.id} dashboard`,
      info: 'In a production environment, this would either return dashboard data or redirect to a visualization tool like Grafana or Kibana'
    });
  });
}

/**
 * Check the health of a component
 */
async function checkComponentHealth(component: string): Promise<any> {
  switch (component) {
    case 'system':
      return checkSystemHealth();
    case 'logging':
      return { 
        component: 'logging',
        status: 'ok',
        timestamp: new Date().toISOString()
      };
    case 'metrics':
      return { 
        component: 'metrics',
        status: 'ok',
        timestamp: new Date().toISOString()
      };
    case 'tracing':
      return { 
        component: 'tracing',
        status: 'ok',
        timestamp: new Date().toISOString()
      };
    case 'alerts':
      return { 
        component: 'alerts',
        status: 'ok',
        timestamp: new Date().toISOString()
      };
    case 'integrations':
      return checkIntegrationsHealth();
    default:
      return {
        component,
        status: 'unknown',
        message: `Unknown component: ${component}`,
        timestamp: new Date().toISOString()
      };
  }
}

/**
 * Check the health of the system
 */
async function checkSystemHealth(): Promise<any> {
  const memPercent = (1 - (freemem() / totalmem())) * 100;
  const memStatus = memPercent > 90 ? 'error' : (memPercent > 80 ? 'warning' : 'ok');
  
  let diskStatus = 'ok';
  let diskPercent = 0;
  
  try {
    // Check disk space usage
    const { stdout } = await execAsync('df -h / | tail -1 | awk \'{print $5}\'');
    diskPercent = parseInt(stdout.trim().replace('%', ''), 10);
    diskStatus = diskPercent > 90 ? 'error' : (diskPercent > 80 ? 'warning' : 'ok');
  } catch (err) {
    debug('Failed to check disk space:', err);
    diskStatus = 'unknown';
  }
  
  // Determine overall status
  const overallStatus = memStatus === 'error' || diskStatus === 'error' ? 'error' :
                        (memStatus === 'warning' || diskStatus === 'warning' ? 'warning' : 'ok');
  
  return {
    component: 'system',
    status: overallStatus,
    details: {
      memory: {
        total: totalmem(),
        free: freemem(),
        used: totalmem() - freemem(),
        percent: memPercent.toFixed(2) + '%',
        status: memStatus
      },
      disk: {
        percent: diskPercent + '%',
        status: diskStatus
      },
      cpu: {
        cores: cpus().length,
        load: process.cpuUsage()
      }
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Check the health of integrations
 */
async function checkIntegrationsHealth(): Promise<any> {
  const activeCount = activeIntegrations.filter(i => i.enabled).length;
  
  return {
    component: 'integrations',
    status: 'ok',
    details: {
      total: activeIntegrations.length,
      active: activeCount,
      integrations: activeIntegrations.map(i => ({
        type: i.type,
        enabled: i.enabled
      }))
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Check the health of a dependency
 */
async function checkDependencyHealth(dependency: string): Promise<any> {
  // In a real implementation, this would check if the dependency is available
  return {
    dependency,
    status: 'ok',
    timestamp: new Date().toISOString()
  };
}