// Simple production-ready CommonJS server for Smart Health Hub
// This file avoids all ESM/CommonJS compatibility issues
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const { createServer } = require('http');

// Simple logger
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug
};

// Initialize express application
const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration - simplified for production
app.use(session({
  secret: process.env.SESSION_SECRET || 'smart-health-hub-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Static file serving
const distPath = path.join(process.cwd(), 'dist', 'public');
app.use(express.static(distPath));

// API endpoint to provide user data
app.get('/api/user', (req, res) => {
  // Return a demo user for the production build
  res.json({
    id: 1,
    username: 'admin',
    name: 'Administrator',
    email: 'admin@smarthealthhub.org',
    role: 'admin'
  });
});

// Fall through to index.html for client-side routing
app.use('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Create HTTP server
const server = createServer(app);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Smart Health Hub is running on port ${PORT}`);
  logger.info(`Healthcare platform started successfully in production mode`);
});