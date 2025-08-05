import { EventEmitter } from 'events';

/**
 * Progress Tracker for monitoring batch refactoring operations
 * Provides real-time status reporting and progress visualization
 */
export class ProgressTracker extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      updateInterval: options.updateInterval || 1000,
      enableDetailedLogging: options.enableDetailedLogging !== false,
      enableProgressBar: options.enableProgressBar !== false,
      enableETACalculation: options.enableETACalculation !== false,
      historySize: options.historySize || 1000,
      ...options
    };

    this.batches = new Map();
    this.globalStats = {
      totalBatches: 0,
      activeBatches: 0,
      completedBatches: 0,
      failedBatches: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      startTime: null,
      lastUpdateTime: null
    };

    this.taskHistory = [];
    this.performanceMetrics = {
      averageTaskTime: 0,
      tasksPerSecond: 0,
      peakThroughput: 0,
      systemEfficiency: 0
    };

    this.updateInterval = null;
    this.isTracking = false;
    
    console.log('Progress Tracker initialized');
  }

  /**
   * Start tracking progress
   */
  startTracking() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.globalStats.startTime = Date.now();
    
    if (this.options.updateInterval > 0) {
      this.updateInterval = setInterval(() => {
        this.updateProgress();
      }, this.options.updateInterval);
    }

    this.emit('trackingStarted', {
      timestamp: Date.now()
    });

    if (this.options.enableDetailedLogging) {
      console.log('Progress tracking started');
    }
  }

  /**
   * Stop tracking progress
   */
  stopTracking() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.emit('trackingStopped', {
      finalStats: this.getGlobalStats(),
      timestamp: Date.now()
    });

    if (this.options.enableDetailedLogging) {
      console.log('Progress tracking stopped');
    }
  }

  /**
   * Register a new batch for tracking
   */
  registerBatch(batchId, totalTasks, metadata = {}) {
    const batch = {
      id: batchId,
      totalTasks,
      completedTasks: 0,
      failedTasks: 0,
      activeTasks: 0,
      queuedTasks: totalTasks,
      startTime: Date.now(),
      endTime: null,
      status: 'active',
      metadata,
      tasks: new Map(),
      milestones: [],
      estimatedCompletion: null,
      actualDuration: null
    };

    this.batches.set(batchId, batch);
    this.globalStats.totalBatches++;
    this.globalStats.activeBatches++;
    this.globalStats.totalTasks += totalTasks;

    this.emit('batchRegistered', {
      batchId,
      totalTasks,
      metadata,
      timestamp: Date.now()
    });

    if (this.options.enableDetailedLogging) {
      console.log(`Batch ${batchId} registered with ${totalTasks} tasks`);
    }

    return batch;
  }

  /**
   * Update task status within a batch
   */
  updateTaskStatus(batchId, taskId, status, metadata = {}) {
    const batch = this.batches.get(batchId);
    if (!batch) {
      console.warn(`Batch ${batchId} not found for task ${taskId}`);
      return;
    }

    const previousTask = batch.tasks.get(taskId);
    const previousStatus = previousTask?.status || 'queued';
    
    const task = {
      id: taskId,
      status,
      startTime: previousTask?.startTime || (status === 'active' ? Date.now() : null),
      endTime: (status === 'completed' || status === 'failed') ? Date.now() : null,
      duration: null,
      metadata: { ...previousTask?.metadata, ...metadata },
      timestamp: Date.now()
    };

    if (task.endTime && task.startTime) {
      task.duration = task.endTime - task.startTime;
    }

    batch.tasks.set(taskId, task);

    // Update batch counters
    this.updateBatchCounters(batch, previousStatus, status);

    // Add to task history for performance analysis
    if (status === 'completed' || status === 'failed') {
      this.addToTaskHistory(task);
    }

    // Update global stats
    this.updateGlobalStats(previousStatus, status);

    // Check if batch is complete
    if (batch.completedTasks + batch.failedTasks === batch.totalTasks) {
      this.completeBatch(batchId);
    }

    this.emit('taskStatusUpdated', {
      batchId,
      taskId,
      status,
      previousStatus,
      metadata,
      timestamp: Date.now()
    });
  }

  /**
   * Update batch counters based on task status change
   */
  updateBatchCounters(batch, previousStatus, newStatus) {
    // Decrement previous status counter
    switch (previousStatus) {
      case 'active':
        batch.activeTasks = Math.max(0, batch.activeTasks - 1);
        break;
      case 'queued':
        batch.queuedTasks = Math.max(0, batch.queuedTasks - 1);
        break;
    }

    // Increment new status counter
    switch (newStatus) {
      case 'active':
        batch.activeTasks++;
        break;
      case 'completed':
        batch.completedTasks++;
        break;
      case 'failed':
        batch.failedTasks++;
        break;
      case 'queued':
        batch.queuedTasks++;
        break;
    }
  }

  /**
   * Update global statistics
   */
  updateGlobalStats(previousStatus, newStatus) {
    if (newStatus === 'completed' && previousStatus !== 'completed') {
      this.globalStats.completedTasks++;
    }
    
    if (newStatus === 'failed' && previousStatus !== 'failed') {
      this.globalStats.failedTasks++;
    }

    this.globalStats.lastUpdateTime = Date.now();
  }

  /**
   * Complete a batch
   */
  completeBatch(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch || batch.status !== 'active') return;

    batch.endTime = Date.now();
    batch.actualDuration = batch.endTime - batch.startTime;
    batch.status = batch.failedTasks > 0 ? 'completed_with_errors' : 'completed';

    // Add completion milestone
    batch.milestones.push({
      type: 'completed',
      timestamp: batch.endTime,
      message: `Batch completed: ${batch.completedTasks}/${batch.totalTasks} tasks successful`
    });

    // Update global stats
    this.globalStats.activeBatches--;
    if (batch.status === 'completed') {
      this.globalStats.completedBatches++;
    } else {
      this.globalStats.failedBatches++;
    }

    this.emit('batchCompleted', {
      batchId,
      status: batch.status,
      completedTasks: batch.completedTasks,
      failedTasks: batch.failedTasks,
      duration: batch.actualDuration,
      timestamp: Date.now()
    });

    if (this.options.enableDetailedLogging) {
      console.log(`Batch ${batchId} completed: ${batch.completedTasks}/${batch.totalTasks} tasks successful in ${Math.round(batch.actualDuration / 1000)}s`);
    }
  }

  /**
   * Add task to history for performance analysis
   */
  addToTaskHistory(task) {
    if (task.duration) {
      this.taskHistory.push({
        duration: task.duration,
        status: task.status,
        timestamp: task.timestamp
      });

      // Maintain history size limit
      if (this.taskHistory.length > this.options.historySize) {
        this.taskHistory.shift();
      }

      // Update performance metrics
      this.updatePerformanceMetrics();
    }
  }

  /**
   * Update performance metrics based on task history
   */
  updatePerformanceMetrics() {
    if (this.taskHistory.length === 0) return;

    const completedTasks = this.taskHistory.filter(t => t.status === 'completed');
    
    if (completedTasks.length > 0) {
      // Calculate average task time
      const totalDuration = completedTasks.reduce((sum, t) => sum + t.duration, 0);
      this.performanceMetrics.averageTaskTime = totalDuration / completedTasks.length;

      // Calculate tasks per second (recent throughput)
      const recentTasks = completedTasks.slice(-10);
      if (recentTasks.length > 1) {
        const timeSpan = recentTasks[recentTasks.length - 1].timestamp - recentTasks[0].timestamp;
        if (timeSpan > 0) {
          const throughput = (recentTasks.length - 1) / (timeSpan / 1000);
          this.performanceMetrics.tasksPerSecond = throughput;
          this.performanceMetrics.peakThroughput = Math.max(
            this.performanceMetrics.peakThroughput, 
            throughput
          );
        }
      }

      // Calculate system efficiency (completed vs total)
      const totalTasks = this.globalStats.completedTasks + this.globalStats.failedTasks;
      if (totalTasks > 0) {
        this.performanceMetrics.systemEfficiency = 
          (this.globalStats.completedTasks / totalTasks) * 100;
      }
    }
  }

  /**
   * Update progress and emit events
   */
  updateProgress() {
    const globalProgress = this.calculateGlobalProgress();
    const batchProgresses = this.calculateBatchProgresses();

    this.emit('progressUpdate', {
      global: globalProgress,
      batches: batchProgresses,
      performance: this.performanceMetrics,
      timestamp: Date.now()
    });

    if (this.options.enableProgressBar) {
      this.displayProgressBar(globalProgress);
    }
  }

  /**
   * Calculate global progress
   */
  calculateGlobalProgress() {
    const totalTasks = this.globalStats.totalTasks;
    const completedTasks = this.globalStats.completedTasks;
    const failedTasks = this.globalStats.failedTasks;
    const processedTasks = completedTasks + failedTasks;

    const percentage = totalTasks > 0 ? Math.round((processedTasks / totalTasks) * 100) : 0;
    const eta = this.calculateETA(totalTasks, processedTasks);

    return {
      totalTasks,
      completedTasks,
      failedTasks,
      processedTasks,
      percentage,
      eta,
      runtime: this.globalStats.startTime ? Date.now() - this.globalStats.startTime : 0,
      activeBatches: this.globalStats.activeBatches,
      completedBatches: this.globalStats.completedBatches
    };
  }

  /**
   * Calculate progress for all batches
   */
  calculateBatchProgresses() {
    const progresses = {};
    
    for (const [batchId, batch] of this.batches) {
      const processedTasks = batch.completedTasks + batch.failedTasks;
      const percentage = batch.totalTasks > 0 ? 
        Math.round((processedTasks / batch.totalTasks) * 100) : 0;
      
      progresses[batchId] = {
        totalTasks: batch.totalTasks,
        completedTasks: batch.completedTasks,
        failedTasks: batch.failedTasks,
        activeTasks: batch.activeTasks,
        queuedTasks: batch.queuedTasks,
        percentage,
        status: batch.status,
        runtime: Date.now() - batch.startTime,
        eta: this.calculateETA(batch.totalTasks, processedTasks),
        milestones: batch.milestones.slice(-5) // Last 5 milestones
      };
    }

    return progresses;
  }

  /**
   * Calculate estimated time of arrival (ETA)
   */
  calculateETA(totalTasks, processedTasks) {
    if (!this.options.enableETACalculation || processedTasks === 0) {
      return null;
    }

    const remainingTasks = totalTasks - processedTasks;
    if (remainingTasks <= 0) return 0;

    const averageTaskTime = this.performanceMetrics.averageTaskTime;
    if (averageTaskTime === 0) return null;

    return Math.round(remainingTasks * averageTaskTime);
  }

  /**
   * Display progress bar in console
   */
  displayProgressBar(progress) {
    const barLength = 40;
    const filledLength = Math.round((progress.percentage / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    const eta = progress.eta ? `ETA: ${Math.round(progress.eta / 1000)}s` : 'ETA: --';
    const runtime = Math.round(progress.runtime / 1000);
    
    process.stdout.write(`\r[${bar}] ${progress.percentage}% (${progress.processedTasks}/${progress.totalTasks}) ${eta} Runtime: ${runtime}s`);
    
    if (progress.percentage === 100) {
      process.stdout.write('\n');
    }
  }

  /**
   * Add milestone to a batch
   */
  addMilestone(batchId, type, message, metadata = {}) {
    const batch = this.batches.get(batchId);
    if (!batch) return;

    const milestone = {
      type,
      message,
      metadata,
      timestamp: Date.now()
    };

    batch.milestones.push(milestone);

    this.emit('milestoneReached', {
      batchId,
      milestone,
      timestamp: Date.now()
    });

    if (this.options.enableDetailedLogging) {
      console.log(`Milestone [${batchId}]: ${message}`);
    }
  }

  /**
   * Get detailed batch information
   */
  getBatchDetails(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) return null;

    const tasks = Array.from(batch.tasks.values());
    const tasksByStatus = {
      queued: tasks.filter(t => t.status === 'queued').length,
      active: tasks.filter(t => t.status === 'active').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length
    };

    return {
      ...batch,
      tasksByStatus,
      averageTaskDuration: this.calculateAverageTaskDuration(tasks),
      slowestTask: this.findSlowestTask(tasks),
      fastestTask: this.findFastestTask(tasks)
    };
  }

  /**
   * Calculate average task duration for a batch
   */
  calculateAverageTaskDuration(tasks) {
    const completedTasks = tasks.filter(t => t.duration !== null);
    if (completedTasks.length === 0) return 0;

    const totalDuration = completedTasks.reduce((sum, t) => sum + t.duration, 0);
    return totalDuration / completedTasks.length;
  }

  /**
   * Find slowest task in a batch
   */
  findSlowestTask(tasks) {
    return tasks
      .filter(t => t.duration !== null)
      .reduce((slowest, task) => 
        !slowest || task.duration > slowest.duration ? task : slowest, null);
  }

  /**
   * Find fastest task in a batch
   */
  findFastestTask(tasks) {
    return tasks
      .filter(t => t.duration !== null)
      .reduce((fastest, task) => 
        !fastest || task.duration < fastest.duration ? task : fastest, null);
  }

  /**
   * Get global statistics
   */
  getGlobalStats() {
    return {
      ...this.globalStats,
      performance: this.performanceMetrics,
      activeBatchCount: this.globalStats.activeBatches,
      totalBatchCount: this.globalStats.totalBatches,
      successRate: this.globalStats.totalTasks > 0 ? 
        Math.round((this.globalStats.completedTasks / this.globalStats.totalTasks) * 100) : 0
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const runtime = this.globalStats.startTime ? 
      Date.now() - this.globalStats.startTime : 0;

    return {
      ...this.performanceMetrics,
      runtime,
      totalTasksProcessed: this.globalStats.completedTasks + this.globalStats.failedTasks,
      overallThroughput: runtime > 0 ? 
        ((this.globalStats.completedTasks + this.globalStats.failedTasks) / (runtime / 1000)) : 0,
      timestamp: Date.now()
    };
  }

  /**
   * Export progress data for analysis
   */
  exportProgressData() {
    return {
      globalStats: this.globalStats,
      performanceMetrics: this.performanceMetrics,
      batches: Object.fromEntries(this.batches),
      taskHistory: this.taskHistory.slice(-100), // Last 100 tasks
      timestamp: Date.now()
    };
  }

  /**
   * Reset all tracking data
   */
  reset() {
    this.batches.clear();
    this.taskHistory.length = 0;
    
    this.globalStats = {
      totalBatches: 0,
      activeBatches: 0,
      completedBatches: 0,
      failedBatches: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      startTime: null,
      lastUpdateTime: null
    };

    this.performanceMetrics = {
      averageTaskTime: 0,
      tasksPerSecond: 0,
      peakThroughput: 0,
      systemEfficiency: 0
    };

    this.emit('reset', { timestamp: Date.now() });

    if (this.options.enableDetailedLogging) {
      console.log('Progress tracker reset');
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopTracking();
    this.reset();
    this.removeAllListeners();
    
    console.log('Progress Tracker cleaned up');
  }
}