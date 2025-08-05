#!/usr/bin/env node

/**
 * Clean startup script that suppresses MongoDB connection errors
 * since the app works without MongoDB
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
║     Starting on port ${process.env.PORT || 8080}...                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

const dashboard = spawn('node', ['start-dashboard.js'], {
  cwd: __dirname,
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
});

// Filter output to remove MongoDB errors
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
  if (output.includes('MongoDB') || output.includes('ECONNREFUSED')) {
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
  dashboard.kill('SIGTERM');
});