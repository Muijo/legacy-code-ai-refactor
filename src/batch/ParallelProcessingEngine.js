import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import { cpus } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parallel Processing Engine for large-scale legacy code refactoring
 * Implements multi-threaded processing with resource management and load balancing
 */
export class ParallelProcessingEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxWorkers: options.maxWorkers || Math.min(cpus().length, 8),
      maxMemoryPerWorker: options.maxMemoryPerWorker || 512 * 1024 * 1024, // 512MB
      taskTimeout: options.taskTimeout || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      loadBalancingStrategy: options.loadBalancingStrategy || 'round-robin',
      resourceMonitoringInterval: options.resourceMonitoringInterval || 5000,
      ...options
    };

    this.workers = new Map();
    this.taskQueue = [];
    this.activeTasks = new Map();
    this.completedTasks = new Map();
    this.failedTasks = new Map();
    this.workerStats = new Map();
    
    this.isRunning = false;
    this.currentWorkerIndex = 0;
    this.resourceMonitor = null;
    
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      retriedTasks: 0,
      averageTaskTime: 0,
      peakMemoryUsage: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Initialize the parallel processing engine
   */
  async initialize() {
    console.log(`Initializing parallel processing engine with ${this.options.maxWorkers} workers`);
    
    // Create worker pool
    for (let i = 0; i < this.options.maxWorkers; i++) {
      await this.createWorker(i);
    }

    // Start resource monitoring
    this.startResourceMonitoring();
    
    this.isRunning = true;
    this.stats.startTime = Date.now();
    
    this.emit('initialized', {
      workerCount: this.workers.size,
      maxMemoryPerWorker: this.options.maxMemoryPerWorker,
      timestamp: Date.now()
    });
  }

  /**
   * Create a new worker thread
   */
  async createWorker(workerId) {
    const workerPath = join(__dirname, 'RefactoringWorker.js');
    
    const worker = new Worker(workerPath, {
      workerData: {
        workerId,
        maxMemory: this.options.maxMemoryPerWorker
      }
    });

    const workerInfo = {
      id: workerId,
      worker,
      isIdle: true,
      currentTask: null,
      tasksCompleted: 0,
      tasksFailures: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      createdAt: Date.now()
    };

    // Set up worker event handlers
    worker.on('message', (message) => {
      this.handleWorkerMessage(workerId, message);
    });

    worker.on('error', (error) => {
      this.handleWorkerError(workerId, error);
    });

    worker.on('exit', (code) => {
      this.handleWorkerExit(workerId, code);
    });

    this.workers.set(workerId, workerInfo);
    this.workerStats.set(workerId, {
      tasksCompleted: 0,
      tasksFailures: 0,
      averageTaskTime: 0,
      memoryPeak: 0,
      uptime: 0
    });

    console.log(`Worker ${workerId} created successfully`);
  }

  /**
   * Process a batch of refactoring tasks in parallel
   */
  async processBatch(tasks, options = {}) {
    if (!this.isRunning) {
      throw new Error('Parallel processing engine not initialized');
    }

    console.log(`Processing batch of ${tasks.length} tasks`);
    
    this.stats.totalTasks += tasks.length;
    
    // Add tasks to queue with metadata
    const batchId = Date.now().toString();
    const enrichedTasks = tasks.map((task, index) => ({
      ...task,
      id: task.id || `${batchId}-${index}`,
      batchId,
      priority: task.priority || 'normal',
      retryCount: 0,
      createdAt: Date.now()
    }));

    // Sort tasks by priority and complexity
    enrichedTasks.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort by estimated complexity (if available)
      const complexityA = a.estimatedComplexity || 1;
      const complexityB = b.estimatedComplexity || 1;
      return complexityB - complexityA;
    });

    this.taskQueue.push(...enrichedTasks);

    // Start processing
    this.processTaskQueue();

    // Return a promise that resolves when all tasks are complete
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        const totalProcessed = this.stats.completedTasks + this.stats.failedTasks;
        const batchTasks = enrichedTasks.length;
        
        if (totalProcessed >= this.stats.totalTasks) {
          const results = {
            batchId,
            totalTasks: batchTasks,
            completedTasks: enrichedTasks.filter(t => this.completedTasks.has(t.id)).length,
            failedTasks: enrichedTasks.filter(t => this.failedTasks.has(t.id)).length,
            results: enrichedTasks.map(t => {
              if (this.completedTasks.has(t.id)) {
                return { taskId: t.id, status: 'completed', result: this.completedTasks.get(t.id) };
              } else if (this.failedTasks.has(t.id)) {
                return { taskId: t.id, status: 'failed', error: this.failedTasks.get(t.id) };
              }
              return { taskId: t.id, status: 'unknown' };
            }),
            duration: Date.now() - Date.now(),
            timestamp: Date.now()
          };
          
          resolve(results);
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };

      setTimeout(checkCompletion, 100);
    });
  }

  /**
   * Process the task queue using available workers
   */
  processTaskQueue() {
    if (this.taskQueue.length === 0) {
      return;
    }

    // Find available workers
    const availableWorkers = Array.from(this.workers.values())
      .filter(worker => worker.isIdle)
      .sort((a, b) => {
        // Load balancing strategy
        switch (this.options.loadBalancingStrategy) {
          case 'least-loaded':
            return a.tasksCompleted - b.tasksCompleted;
          case 'memory-optimized':
            return a.memoryUsage - b.memoryUsage;
          case 'round-robin':
          default:
            return a.id - b.id;
        }
      });

    // Assign tasks to available workers
    const tasksToAssign = Math.min(availableWorkers.length, this.taskQueue.length);
    
    for (let i = 0; i < tasksToAssign; i++) {
      const worker = availableWorkers[i];
      const task = this.taskQueue.shift();
      
      this.assignTaskToWorker(worker.id, task);
    }

    // Schedule next processing cycle if there are remaining tasks
    if (this.taskQueue.length > 0) {
      setTimeout(() => this.processTaskQueue(), 100);
    }
  }

  /**
   * Assign a task to a specific worker
   */
  assignTaskToWorker(workerId, task) {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo || !workerInfo.isIdle) {
      // Worker not available, put task back in queue
      this.taskQueue.unshift(task);
      return;
    }

    workerInfo.isIdle = false;
    workerInfo.currentTask = task;
    
    this.activeTasks.set(task.id, {
      task,
      workerId,
      startTime: Date.now(),
      timeout: setTimeout(() => {
        this.handleTaskTimeout(task.id);
      }, this.options.taskTimeout)
    });

    // Send task to worker
    workerInfo.worker.postMessage({
      type: 'process_task',
      task,
      options: this.options
    });

    this.emit('taskStarted', {
      taskId: task.id,
      workerId,
      timestamp: Date.now()
    });
  }

  /**
   * Handle messages from worker threads
   */
  handleWorkerMessage(workerId, message) {
    const workerInfo = this.workers.get(workerId);
    
    switch (message.type) {
      case 'task_completed':
        this.handleTaskCompleted(workerId, message.taskId, message.result);
        break;
        
      case 'task_failed':
        this.handleTaskFailed(workerId, message.taskId, message.error);
        break;
        
      case 'progress_update':
        this.handleProgressUpdate(workerId, message.taskId, message.progress);
        break;
        
      case 'resource_usage':
        this.updateWorkerResourceUsage(workerId, message.usage);
        break;
        
      default:
        console.warn(`Unknown message type from worker ${workerId}:`, message.type);
    }
  }

  /**
   * Handle task completion
   */
  handleTaskCompleted(workerId, taskId, result) {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;

    // Clear timeout
    clearTimeout(activeTask.timeout);
    
    // Update worker status
    const workerInfo = this.workers.get(workerId);
    workerInfo.isIdle = true;
    workerInfo.currentTask = null;
    workerInfo.tasksCompleted++;

    // Store result
    this.completedTasks.set(taskId, result);
    this.activeTasks.delete(taskId);
    
    // Update stats
    this.stats.completedTasks++;
    const taskDuration = Date.now() - activeTask.startTime;
    this.updateAverageTaskTime(taskDuration);

    this.emit('taskCompleted', {
      taskId,
      workerId,
      duration: taskDuration,
      result,
      timestamp: Date.now()
    });

    // Continue processing queue
    this.processTaskQueue();
  }

  /**
   * Handle progress update from worker
   */
  handleProgressUpdate(workerId, taskId, progress) {
    this.emit('progressUpdate', {
      workerId,
      taskId,
      progress,
      timestamp: Date.now()
    });
  }

  /**
   * Handle task failure
   */
  handleTaskFailed(workerId, taskId, error) {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;

    // Clear timeout
    clearTimeout(activeTask.timeout);
    
    // Update worker status
    const workerInfo = this.workers.get(workerId);
    workerInfo.isIdle = true;
    workerInfo.currentTask = null;
    workerInfo.tasksFailures++;

    // Handle retry logic
    const task = activeTask.task;
    task.retryCount++;

    if (task.retryCount <= this.options.retryAttempts) {
      console.log(`Retrying task ${taskId} (attempt ${task.retryCount}/${this.options.retryAttempts})`);
      this.stats.retriedTasks++;
      
      // Add back to queue with delay
      setTimeout(() => {
        this.taskQueue.unshift(task);
        this.processTaskQueue();
      }, 1000 * task.retryCount); // Exponential backoff
      
    } else {
      // Max retries reached, mark as failed
      this.failedTasks.set(taskId, error);
      this.stats.failedTasks++;
      
      this.emit('taskFailed', {
        taskId,
        workerId,
        error,
        retryCount: task.retryCount,
        timestamp: Date.now()
      });
    }

    this.activeTasks.delete(taskId);
    
    // Continue processing queue
    this.processTaskQueue();
  }

  /**
   * Handle task timeout
   */
  handleTaskTimeout(taskId) {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;

    console.warn(`Task ${taskId} timed out after ${this.options.taskTimeout}ms`);
    
    // Terminate the worker and create a new one
    const workerId = activeTask.workerId;
    this.restartWorker(workerId);
    
    // Handle as failure
    this.handleTaskFailed(workerId, taskId, new Error('Task timeout'));
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(workerId, error) {
    console.error(`Worker ${workerId} error:`, error);
    
    const workerInfo = this.workers.get(workerId);
    if (workerInfo && workerInfo.currentTask) {
      this.handleTaskFailed(workerId, workerInfo.currentTask.id, error);
    }
    
    // Restart the worker
    this.restartWorker(workerId);
  }

  /**
   * Handle worker exit
   */
  handleWorkerExit(workerId, code) {
    console.log(`Worker ${workerId} exited with code ${code}`);
    
    if (code !== 0) {
      // Unexpected exit, restart worker
      this.restartWorker(workerId);
    }
  }

  /**
   * Restart a worker
   */
  async restartWorker(workerId) {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      try {
        await workerInfo.worker.terminate();
      } catch (error) {
        console.warn(`Error terminating worker ${workerId}:`, error);
      }
    }

    // Create new worker
    await this.createWorker(workerId);
    
    this.emit('workerRestarted', {
      workerId,
      timestamp: Date.now()
    });
  }

  /**
   * Update worker resource usage
   */
  updateWorkerResourceUsage(workerId, usage) {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.memoryUsage = usage.memoryUsage;
      workerInfo.cpuUsage = usage.cpuUsage;
      
      // Update peak memory usage
      this.stats.peakMemoryUsage = Math.max(this.stats.peakMemoryUsage, usage.memoryUsage);
    }
  }

  /**
   * Start resource monitoring
   */
  startResourceMonitoring() {
    this.resourceMonitor = setInterval(() => {
      const totalMemory = Array.from(this.workers.values())
        .reduce((sum, worker) => sum + worker.memoryUsage, 0);
      
      const activeWorkers = Array.from(this.workers.values())
        .filter(worker => !worker.isIdle).length;

      this.emit('resourceUpdate', {
        totalMemoryUsage: totalMemory,
        activeWorkers,
        queueLength: this.taskQueue.length,
        activeTasks: this.activeTasks.size,
        timestamp: Date.now()
      });
      
    }, this.options.resourceMonitoringInterval);
  }

  /**
   * Update average task time
   */
  updateAverageTaskTime(taskDuration) {
    const totalCompleted = this.stats.completedTasks;
    this.stats.averageTaskTime = 
      ((this.stats.averageTaskTime * (totalCompleted - 1)) + taskDuration) / totalCompleted;
  }

  /**
   * Get current processing statistics
   */
  getStats() {
    const currentTime = Date.now();
    const runtime = this.stats.startTime ? currentTime - this.stats.startTime : 0;
    
    return {
      ...this.stats,
      runtime,
      tasksPerSecond: runtime > 0 ? (this.stats.completedTasks / (runtime / 1000)) : 0,
      queueLength: this.taskQueue.length,
      activeTasksCount: this.activeTasks.size,
      workerStats: Object.fromEntries(this.workerStats),
      memoryUsage: {
        current: Array.from(this.workers.values()).reduce((sum, w) => sum + w.memoryUsage, 0),
        peak: this.stats.peakMemoryUsage
      }
    };
  }

  /**
   * Get detailed progress information
   */
  getProgress() {
    const totalTasks = this.stats.totalTasks;
    const completedTasks = this.stats.completedTasks;
    const failedTasks = this.stats.failedTasks;
    const activeTasks = this.activeTasks.size;
    const queuedTasks = this.taskQueue.length;

    return {
      total: totalTasks,
      completed: completedTasks,
      failed: failedTasks,
      active: activeTasks,
      queued: queuedTasks,
      percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      estimatedTimeRemaining: this.estimateTimeRemaining(),
      timestamp: Date.now()
    };
  }

  /**
   * Estimate remaining processing time
   */
  estimateTimeRemaining() {
    if (this.stats.averageTaskTime === 0 || this.stats.completedTasks === 0) {
      return null;
    }

    const remainingTasks = this.taskQueue.length + this.activeTasks.size;
    const activeWorkers = Array.from(this.workers.values()).filter(w => !w.isIdle).length;
    const effectiveWorkers = Math.max(activeWorkers, 1);

    return Math.round((remainingTasks * this.stats.averageTaskTime) / effectiveWorkers);
  }

  /**
   * Shutdown the parallel processing engine
   */
  async shutdown() {
    console.log('Shutting down parallel processing engine...');
    
    this.isRunning = false;
    this.stats.endTime = Date.now();

    // Clear resource monitoring
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
    }

    // Clear all active task timeouts
    for (const activeTask of this.activeTasks.values()) {
      clearTimeout(activeTask.timeout);
    }

    // Terminate all workers
    const terminationPromises = Array.from(this.workers.values()).map(async (workerInfo) => {
      try {
        await workerInfo.worker.terminate();
      } catch (error) {
        console.warn(`Error terminating worker ${workerInfo.id}:`, error);
      }
    });

    await Promise.all(terminationPromises);
    
    this.workers.clear();
    this.activeTasks.clear();
    this.taskQueue.length = 0;

    this.emit('shutdown', {
      finalStats: this.getStats(),
      timestamp: Date.now()
    });

    console.log('Parallel processing engine shutdown complete');
  }
}