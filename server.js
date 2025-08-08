const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const backupRoutes = require('./routes/backup');
const restoreRoutes = require('./routes/restore');
const { router: authRoutes } = require('./routes/auth');
const n8nRoutes = require('./routes/n8n');
const crossEnvRoutes = require('./routes/cross-env');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/restore', restoreRoutes);
app.use('/api/n8n', n8nRoutes);
app.use('/api/cross-env', crossEnvRoutes);

// Serve main page - use test version
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

// Serve original page for reference
app.get('/original.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve test page
app.get('/test-smart-selection.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-smart-selection.html'));
});

// Serve smart selection demo
app.get('/smart-selection-demo.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'smart-selection-demo.html'));
});

// Handle common typos for auto-login
app.get('/auto-login.htm', (req, res) => {
  res.redirect('/auto-login.html');
});

app.get('/autologin.html', (req, res) => {
  res.redirect('/auto-login.html');
});

// Simple login page
app.get('/simple-login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'simple-login.html'));
});

// Debug main page
app.get('/debug-main.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'debug-main.html'));
});

// Working app page
app.get('/working-app.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'working-app.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 N8N Backup & Restore Server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to access the interface`);
});