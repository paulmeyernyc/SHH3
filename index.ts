/**
 * API Gateway
 * 
 * Main entry point for the API Gateway, which routes requests to various services.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from '../../common/error/error-middleware';
import { ServiceDiscovery, createServiceDiscovery } from './service-discovery';
import { ProxyHandler, createProxyHandler } from './proxy-handler';
import { routeRegistry } from './route-registry';
import gatewayApi from './api';
import { ServiceRegistryClient, createServiceRegistryClient } from '../../service-registry/src/client';
import { ServiceType } from '../../service-registry/src/model';
import { AppError } from '../../common/error/app-error';

// Load environment variables
const port = process.env.PORT || 8000;
const registryUrl = process.env.SERVICE_REGISTRY_URL || 'http://localhost:8080';

// Create Express server
const app = express();

// Apply middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Create service discovery
const serviceDiscovery = createServiceDiscovery({
  registryUrl
});

// Create proxy handler
const proxyHandler = createProxyHandler({
  serviceDiscovery
});

// Service registry client for self-registration
const registryClient = createServiceRegistryClient({
  registryUrl,
  onError: (error) => {
    console.error('Service registry error:', error.message);
  }
});

// Register API Gateway routes
app.use('/gateway', gatewayApi);

// Handle dynamic routing
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const path = req.path;
    const method = req.method;
    
    // Find matching route
    const route = await routeRegistry.findRouteByPath(path, method);
    
    if (!route) {
      return next(new AppError({
        code: 'RESOURCE_NOT_FOUND',
        message: `No route found for ${method} ${path}`,
        httpStatus: 404
      }));
    }
    
    // Proxy the request to the appropriate service
    proxyHandler.handleRoute(route)(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Apply error handling middleware
app.use(errorHandler());

// Start server
const server = app.listen(port, async () => {
  console.log(`API Gateway listening on port ${port}`);
  
  try {
    // Register gateway with service registry
    const serviceId = await registryClient.register({
      name: 'api-gateway',
      version: '1.0.0',
      type: ServiceType.REST,
      description: 'API Gateway',
      endpoints: [
        {
          path: '/gateway/routes',
          method: 'GET',
          secured: false,
          description: 'Get all routes'
        },
        {
          path: '/gateway/health',
          method: 'GET',
          secured: false,
          description: 'Health check'
        }
      ],
      host: process.env.HOST || 'localhost',
      port: Number(port)
    });
    
    console.log(`Registered API Gateway with service registry. Service ID: ${serviceId}`);
    
    // Update gateway status to UP
    await registryClient.updateStatus('UP');
  } catch (error) {
    console.error('Failed to register with service registry:', error);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Closing server...');
  
  try {
    // Deregister from service registry
    await registryClient.deregister();
    console.log('Deregistered from service registry');
  } catch (error) {
    console.error('Failed to deregister from service registry:', error);
  }
  
  // Close the server
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

// Export for testing
export { app, server };