import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { RefactoringProjectManager } from './RefactoringProjectManager.js';
import { ReviewWorkflowManager } from './ReviewWorkflowManager.js';
import { ProgressTracker } from '../batch/ProgressTracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Initialize managers
const projectManager = new RefactoringProjectManager();
const reviewManager = new ReviewWorkflowManager();

// Initialize database connection
(async () => {
  try {
    await projectManager.initialize();
    console.log('Database connection initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
})();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await projectManager.getAllProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', upload.array('files'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const files = req.files || [];
    
    const project = await projectManager.createProject({
      name,
      description,
      files: files.map(f => f.path)
    });
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await projectManager.getProject(req.params.id);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:id/analyze', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Start analysis in background
    projectManager.startAnalysis(projectId, (progress) => {
      io.emit('analysisProgress', { projectId, progress });
    });
    
    res.json({ message: 'Analysis started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:id/refactor', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { selectedSuggestions } = req.body;
    
    // Start refactoring in background
    projectManager.startRefactoring(projectId, selectedSuggestions, (progress) => {
      io.emit('refactoringProgress', { projectId, progress });
    });
    
    res.json({ message: 'Refactoring started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id/suggestions', async (req, res) => {
  try {
    const suggestions = await projectManager.getSuggestions(req.params.id);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:id/intervention', async (req, res) => {
  try {
    const { interventionId, decision, notes } = req.body;
    await projectManager.handleManualIntervention(req.params.id, interventionId, decision, notes);
    res.json({ message: 'Intervention handled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Review Workflow API Routes
app.get('/api/reviews/pending', async (req, res) => {
  try {
    const reviews = await reviewManager.getPendingReviews();
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id/reviews', async (req, res) => {
  try {
    const reviews = await reviewManager.getReviewsForProject(req.params.id);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reviews/:id', async (req, res) => {
  try {
    const review = await reviewManager.getReviewSummary(req.params.id);
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reviews/:id/assign', async (req, res) => {
  try {
    const { reviewerId, reviewerRole } = req.body;
    const review = await reviewManager.assignReviewer(req.params.id, reviewerId, reviewerRole);
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reviews/:id/submit', async (req, res) => {
  try {
    const { reviewerId, decision, comments, feedback } = req.body;
    const review = await reviewManager.submitReview(
      req.params.id, 
      reviewerId, 
      decision, 
      comments, 
      feedback
    );
    
    // Emit real-time update
    io.emit('reviewUpdated', { reviewId: req.params.id, review });
    
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/feedback/analytics', async (req, res) => {
  try {
    const analytics = await reviewManager.getFeedbackAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id/review-export', async (req, res) => {
  try {
    const exportData = await reviewManager.exportReviewData(req.params.id);
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('joinProject', (projectId) => {
    socket.join(`project-${projectId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Refactoring Dashboard running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('Shutting down gracefully...');
  
  // Close server
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close database connection
  await projectManager.cleanup();
  
  process.exit(0);
}