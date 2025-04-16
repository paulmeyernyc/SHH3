
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';

// Import the simplified observability
import { setupObservability, observabilityMiddleware, healthCheckMiddleware, logger } from './observability.js';

// Initialize observability
setupObservability();

// Initialize express application
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add observability middleware
app.use(observabilityMiddleware);

// Health check endpoint
app.get('/health', healthCheckMiddleware);

// Routes setup
const server = createServer(app);

// Static file serving
const distPath = path.join(process.cwd(), 'dist', 'public');
app.use(express.static(distPath));

// Fall through to index.html
app.use('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Use a different port for testing production mode
const port = 5001;
server.listen({
  port,
  host: "0.0.0.0",
}, () => {
  console.log(`Serving on port ${port}`);
  logger.info(`Healthcare platform started successfully in production mode`);
});
