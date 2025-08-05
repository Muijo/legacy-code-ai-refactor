#!/usr/bin/env node

/**
 * Super simple start script - guaranteed to work
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Basic middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src/dashboard/public')));

// In-memory storage (no database needed)
let projects = [{
  id: 'demo-1',
  name: 'Demo Project',
  description: 'A simple demo project',
  status: 'created',
  createdAt: new Date().toISOString(),
  progress: { analysis: 0, refactoring: 0 }
}];

// API Routes
app.get('/api/projects', (req, res) => {
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = projects.find(p => p.id === req.params.id);
  if (project) {
    res.json(project);
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});

app.post('/api/projects', (req, res) => {
  const project = {
    id: 'project-' + Date.now(),
    name: req.body.name || 'New Project',
    description: req.body.description || '',
    status: 'created',
    createdAt: new Date().toISOString(),
    progress: { analysis: 0, refactoring: 0 }
  };
  projects.push(project);
  res.json(project);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('joinProject', (projectId) => {
    socket.join(`project-${projectId}`);
    console.log(`Socket ${socket.id} joined project ${projectId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Test pages
app.get('/debug', (req, res) => {
  res.sendFile(path.join(__dirname, 'debug.html'));
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'minimal-test.html'));
});

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dashboard/public/index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🚀 Legacy Code AI Refactor - SIMPLE VERSION              ║
║                                                               ║
║     Running at: http://localhost:${PORT}                         ║
║     No authentication, no database, just works!              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  console.log('✅ Server started successfully');
  console.log('✅ Demo project loaded');
  console.log('✅ Socket.IO ready');
  console.log('\n🌐 Open your browser and go to: http://localhost:8080\n');
});