/**
 * CommonJS version of the server index file for GitHub compatibility
 */
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');
const fs = require('fs');

// Setup express
const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Setup session
const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'development_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  }
};

app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

// Setup auth
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Basic routes
app.get('/api/user', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(req.user);
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    // For testing, accept any login
    const user = { id: 1, username, name: username, role: 'admin' };
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json(user);
    });
  } else {
    res.status(400).json({ error: 'Username and password required' });
  }
});

app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.sendStatus(200);
  });
});

// Serve static files
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
