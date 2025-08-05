#!/usr/bin/env node

/**
 * Simple start script for the Legacy Code AI Refactor Dashboard
 * No authentication required - just run and use!
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🚀 Legacy Code AI Refactor Dashboard                      ║
║                                                               ║
║     Starting on http://localhost:8080                         ║
║     No authentication required - just open and use!           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

const dashboard = spawn('node', ['start-dashboard.js'], {
  cwd: __dirname,
  env: {
    ...process.env,
    PORT: '8080',
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
});

// Filter output to remove MongoDB errors (app works without MongoDB)
dashboard.stdout.on('data', (data) => {
  const output = data.toString();
  // Skip MongoDB connection errors
  if (output.includes('MongoDB') || 
      output.includes('ECONNREFUSED') || 
      output.includes('MongooseServerSelectionError') ||
      output.includes('RefactoringProjectManager: Database connection failed')) {
    return;
  }
  process.stdout.write(output);
});

dashboard.stderr.on('data', (data) => {
  const output = data.toString();
  // Skip MongoDB errors in stderr too
  if (output.includes('MongoDB') || 
      output.includes('ECONNREFUSED') ||
      output.includes('reconnect') ||
      output.includes('connection error')) {
    return;
  }
  process.stderr.write(output);
});

dashboard.on('error', (error) => {
  console.error('Failed to start dashboard:', error);
  process.exit(1);
});

dashboard.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Dashboard exited with code ${code}`);
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  dashboard.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  dashboard.kill('SIGTERM');
});