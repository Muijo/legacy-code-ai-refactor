/**
 * Start the dashboard with all features working
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import configuration
import config, { validateConfig } from './config.js';

// Import rate limiting only
import { rateLimitByIp } from './src/auth/authMiddleware.js';
import { httpLoggerMiddleware, logger } from './src/utils/logger.js';

// Import managers
import { RefactoringProjectManager } from './src/dashboard/RefactoringProjectManager.js';
import { ReviewWorkflowManager } from './src/dashboard/ReviewWorkflowManager.js';

// Import database
import { db } from './src/database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.security.allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Need unsafe-eval for Socket.IO
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// Middleware
app.use(cors({
  origin: config.security.allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(cookieParser(config.security.cookieSecret));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(httpLoggerMiddleware);

// Apply rate limiting
app.use(rateLimitByIp(config.security.rateLimitMax, config.security.rateLimitWindow));

// Static files (before auth routes)
app.use(express.static(path.join(__dirname, 'src/dashboard/public')));

// File upload configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent path traversal
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + sanitizedName);
  }
});

// Secure file upload configuration
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Only allow specific file types
    const allowedTypes = ['.js', '.jsx', '.ts', '.tsx', '.php', '.java', '.py'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${fileExt} not allowed. Only ${allowedTypes.join(', ')} files are permitted.`), false);
    }
  }
});

// Initialize managers
const projectManager = new RefactoringProjectManager();
const reviewManager = new ReviewWorkflowManager();

// Initialize without database (it will work in memory)
(async () => {
  await projectManager.initialize();
  console.log('Project manager initialized');
})();

// Create demo projects on startup
async function createDemoProjects() {
  if (!config.app.enableDemo) {
    return;
  }
  
  try {
    // Create demo project 1
    const demoFiles = [
      path.join(__dirname, 'test-project/legacy-code/user-manager.js'),
      path.join(__dirname, 'test-project/legacy-code/database.php')
    ];
    
    // Check if files exist
    const filesExist = await Promise.all(demoFiles.map(async f => {
      try {
        await fs.access(f);
        return true;
      } catch {
        return false;
      }
    }));
    
    if (filesExist.every(exists => exists)) {
      const demoProject = await projectManager.createProject({
        name: 'Demo: Legacy User System',
        description: 'Example legacy code with JavaScript and PHP files',
        files: demoFiles,
        userId: 'demo-user'
      });
      
      logger.info('Created demo project', { projectName: demoProject.name });
    }
  } catch (error) {
    logger.error('Failed to create demo projects:', error);
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dashboard/public/index.html'));
});

// API Routes - No authentication required
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await projectManager.getAllProjects();
    res.json(projects);
  } catch (error) {
    logger.error('Error fetching projects:', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', upload.array('files'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const files = req.files || [];
    
    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required and must be a non-empty string' });
    }
    
    if (name.length > 100) {
      return res.status(400).json({ error: 'Project name must be less than 100 characters' });
    }
    
    if (description && (typeof description !== 'string' || description.length > 1000)) {
      return res.status(400).json({ error: 'Description must be a string less than 1000 characters' });
    }
    
    if (files.length === 0) {
      return res.status(400).json({ error: 'At least one file must be uploaded' });
    }
    
    // Sanitize inputs
    const sanitizedName = name.trim().replace(/[<>]/g, '');
    const sanitizedDescription = description ? description.trim().replace(/[<>]/g, '') : '';
    
    const project = await projectManager.createProject({
      name: sanitizedName,
      description: sanitizedDescription,
      files: files.map(f => f.path),
      userId: 'demo-user'
    });
    
    logger.info('Project created', { projectId: project.id });
    res.json(project);
  } catch (error) {
    logger.error('Project creation error:', { error: error.message });
    if (error.message.includes('not allowed')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await projectManager.getProject(req.params.id);
    res.json(project);
  } catch (error) {
    logger.error('Error fetching project:', { error: error.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

app.post('/api/projects/:id/analyze', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Start analysis in background
    projectManager.startAnalysis(projectId, (progress) => {
      io.to(`project-${projectId}`).emit('analysisProgress', { projectId, progress });
    }).catch(error => {
      logger.error('Analysis error:', { error: error.message, projectId });
      io.to(`project-${projectId}`).emit('analysisError', { projectId, error: error.message });
    });
    
    res.json({ message: 'Analysis started' });
  } catch (error) {
    logger.error('Error starting analysis:', { error: error.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});

app.get('/api/projects/:id/suggestions', async (req, res) => {
  try {
    const suggestions = await projectManager.getSuggestions(req.params.id);
    res.json(suggestions);
  } catch (error) {
    logger.error('Error fetching suggestions:', { error: error.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

app.post('/api/projects/:id/refactor', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { selectedSuggestions } = req.body;
    
    // Start refactoring in background
    projectManager.startRefactoring(projectId, selectedSuggestions || [], (progress) => {
      io.to(`project-${projectId}`).emit('refactoringProgress', { projectId, progress });
    }).catch(error => {
      logger.error('Refactoring error:', { error: error.message, projectId });
      io.to(`project-${projectId}`).emit('refactoringError', { projectId, error: error.message });
    });
    
    res.json({ message: 'Refactoring started' });
  } catch (error) {
    logger.error('Error starting refactoring:', { error: error.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to start refactoring' });
  }
});

app.post('/api/projects/:id/intervention', async (req, res) => {
  try {
    const { interventionId, decision, notes } = req.body;
    const project = await projectManager.getProject(req.params.id);
    
    // No ownership check needed
    
    await projectManager.handleManualIntervention(req.params.id, interventionId, decision, notes);
    res.json({ message: 'Intervention handled' });
  } catch (error) {
    logger.error('Error handling intervention:', { error: error.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to handle intervention' });
  }
});

// Review Workflow API Routes
app.get('/api/reviews/pending', async (req, res) => {
  try {
    const reviews = await reviewManager.getPendingReviews(null);
    res.json(reviews);
  } catch (error) {
    logger.error('Error fetching pending reviews:', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
});

app.get('/api/projects/:id/reviews', async (req, res) => {
  try {
    const project = await projectManager.getProject(req.params.id);
    
    // No ownership check needed
    
    const reviews = await reviewManager.getReviewsForProject(req.params.id);
    res.json(reviews);
  } catch (error) {
    logger.error('Error fetching project reviews:', { error: error.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch project reviews' });
  }
});

app.get('/api/reviews/:id', async (req, res) => {
  try {
    const review = await reviewManager.getReviewSummary(req.params.id);
    
    // No access check needed
    
    res.json(review);
  } catch (error) {
    logger.error('Error fetching review:', { error: error.message, reviewId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

app.post('/api/reviews/:id/submit', async (req, res) => {
  try {
    const { decision, comments, feedback } = req.body;
    const review = await reviewManager.submitReview(
      req.params.id, 
      null,
      decision, 
      comments, 
      feedback
    );
    
    // Emit real-time update
    io.emit('reviewUpdated', { reviewId: req.params.id, review });
    
    res.json(review);
  } catch (error) {
    logger.error('Error submitting review:', { error: error.message, reviewId: req.params.id });
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Socket.IO for real-time updates - no authentication
// No authentication middleware needed

io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });
  
  socket.on('joinProject', async (projectId) => {
    try {
      // Anyone can join any project - no authentication
      socket.join(`project-${projectId}`);
      logger.info('Socket joined project', { socketId: socket.id, projectId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to join project' });
    }
  });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    const memoryUsage = process.memoryUsage();
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.server.environment,
      version: '1.0.0',
      database: dbHealth,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB'
      },
      config: {
        rateLimitEnabled: config.security.enableRateLimit,
        maxProjectsPerUser: config.app.maxProjectsPerUser,
        demoEnabled: config.app.enableDemo
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = config.server.port;
const HOST = config.server.host;

server.listen(PORT, HOST, async () => {
  logger.info('Server started', { 
    port: PORT, 
    host: HOST, 
    environment: config.server.environment 
  });
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🚀 Legacy Code AI Refactoring Dashboard                   ║
║                                                               ║
║     Running at: http://${HOST}:${PORT}                         ║
║     Environment: ${config.server.environment.padEnd(45)}║
║                                                               ║
║     Features:                                                 ║
║     ✅ Multi-language support (JS, PHP, Java, Python)        ║
║     ✅ Code quality analysis                                  ║
║     ✅ AI-powered refactoring suggestions                     ║
║     ✅ Real-time progress tracking                            ║
║     ✅ Code review workflow                                   ║
║     ✅ Comprehensive logging                                  ║
║                                                               ║
║     API Documentation: http://${HOST}:${PORT}/api-docs          ║
║     Health Check: http://${HOST}:${PORT}/health                 ║
║                                                               ║
║     Press Ctrl+C to stop                                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  // Validate configuration
  const configErrors = validateConfig();
  if (configErrors.length > 0) {
    logger.error('Configuration errors detected:', configErrors);
    if (config.server.environment === 'production') {
      logger.error('Shutting down due to configuration errors in production');
      process.exit(1);
    }
  }
  
  // Create demo projects
  await createDemoProjects();
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('\nShutting down gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  await projectManager.cleanup();
  process.exit(0);
}