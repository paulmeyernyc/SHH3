
// Smart Health Hub Standalone Production Server
const express = require('express');
const path = require('path');
const fs = require('fs');

// Initialize express application
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/user', (req, res) => {
  // Demo user for standalone mode
  res.json({
    id: 1,
    username: 'admin',
    name: 'Administrator',
    email: 'admin@smarthealthhub.org',
    role: 'admin'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// All other routes should serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Smart Health Hub running in standalone mode on port ${PORT}`);
});
  