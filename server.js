
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import session from 'express-session';
import { createServer } from 'http';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple logger replacement
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
const PORT = process.env.PORT || 5001; // Use a different port from development
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Smart Health Hub is running on port ${PORT}`);
  logger.info(`Healthcare platform started successfully in production mode`);
});
