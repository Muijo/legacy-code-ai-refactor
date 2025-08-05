import { EventEmitter } from 'events';
import { ParallelProcessingEngine } from './ParallelProcessingEngine.js';
import { ResourceManager } from './ResourceManager.js';
import { ProgressTracker } from './ProgressTracker.js';
import { ResultAggregator } from './ResultAggregator.js';
import { ReportingSystem } from './ReportingSystem.js';

/**
 * Integrated Batch Processing System for large-scale legacy code refactoring
 * Orchestrates parallel processing, resource management, progress tracking, and reporting
 */
export class BatchProcessingSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Processing options
      maxWorkers: options.maxWorkers || Math.min(8, 8), // Default to 8 workers
      taskTimeout: options.taskTimeout || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      
      // Resource management options
      maxCpuUsage: options.maxCpuUsage || 80,
      maxMemoryUsage: options.maxMemoryUsage || 75,
      adaptiveScaling: options.adaptiveScaling !== false,
      
      // Progress tracking options
      enableProgressTracking: options.enableProgressTracking !== false,
      enableDetailedLogging: options.enableDetailedLogging !== false,
      
      // Result aggregation options
      enableConflictResolution: options.enableConflictResolution !== false,
      conflictResolutionStrategy: options.conflictResolutionStrategy || 'latest_wins',
      enableTrendAnalysis: options.enableTrendAnalysis !== false,
      
      // Reporting options
      enableReporting: options.enableReporting !== false,
      reportOutputDirectory: options.reportOutputDirectory || './reports',
      autoGenerateReports: options.autoGenerateReports !== false,
      
      ...options
    };

    // Initialize components
    this.processingEngine = new ParallelProcessingEngine({
      maxWorkers: this.options.maxWorkers,
      taskTimeout: this.options.taskTimeout,
      retryAttempts: this.options.retryAttempts,
      loadBalancingStrategy: 'adaptive'
    });

    this.resourceManager = new ResourceManager({
      maxCpuUsage: this.options.maxCpuUsage,
      maxMemoryUsage: this.options.maxMemoryUsage,
      adaptiveScaling: this.options.adaptiveScaling,
      loadBalancingStrategy: 'adaptive'
    });

    this.progressTracker = new ProgressTracker({
      enableDetailedLogging: this.options.enableDetailedLogging,
      enableProgressBar: this.options.enableDetailedLogging,
      enableETACalculation: true
    });

    this.resultAggregator = new ResultAggregator({
      enableConflictResolution: this.options.enableConflictResolution,
      conflictResolutionStrategy: this.options.conflictResolutionStrategy,
      enableTrendAnalysis: this.options.enableTrendAnalysis
    });

    this.reportingSystem = new ReportingSystem({
      outputDirectory: this.options.reportOutputDirectory,
      enableHtmlReports: true,
      enableJsonReports: true,
      enableCsvReports: true,
      autoGenerateReports: this.options.autoGenerateReports
    });

    this.isInitialized = false;
    this.isProcessing = false;
    this.activeBatches = new Map();
    
    this.setupEventHandlers();
    
    console.log('Batch Processing System initialized');
  }

  /**
   * Set up event handlers between components
   */
  setupEventHandlers() {
    // Processing engine events
    this.processingEngine.on('taskStarted', (event) => {
      this.progressTracker.updateTaskStatus(event.batchId || 'default', event.taskId, 'active');
    });

    this.processingEngine.on('taskCompleted', (event) => {
      this.progressTracker.updateTaskStatus(event.batchId || 'default', event.taskId, 'completed', {
        duration: event.duration,
        result: event.result
      });
    });

    this.processingEngine.on('taskFailed', (event) => {
      this.progressTracker.updateTaskStatus(event.batchId || 'default', event.taskId, 'failed', {
        error: event.error
      });
    });

    // Resource manager events
    this.resourceManager.on('resourceAlert', (alert) => {
      console.warn(`Resource Alert: ${alert.message}`);
      this.emit('resourceAlert', alert);
    });

    this.resourceManager.on('optimizationRecommendations', (recommendations) => {
      this.handleOptimizationRecommendations(recommendations);
    });

    // Progress tracker events
    this.progressTracker.on('batchCompleted', (event) => {
      this.handleBatchCompletion(event);
    });

    this.progressTracker.on('progressUpdate', (progress) => {
      this.emit('progressUpdate', progress);
    });

    // Result aggregator events
    this.resultAggregator.on('conflictsDetected', (event) => {
      console.warn(`Conflicts detected in batch ${event.batchId}: ${event.conflicts.totalConflicts} conflicts`);
      this.emit('conflictsDetected', event);
    });

    this.resultAggregator.on('periodicReport', (report) => {
      if (this.options.autoGenerateReports) {
        this.generateComprehensiveReport(report);
      }
    });
  }

  /**
   * Initialize the batch processing system
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing batch processing system...');

    try {
      // Initialize components in order
      await this.processingEngine.initialize();
      this.resourceManager.startMonitoring();
      this.progressTracker.startTracking();
      this.resultAggregator.startAggregation();

      this.isInitialized = true;

      this.emit('initialized', {
        workerCount: this.processingEngine.workers.size,
        resourceMonitoring: this.resourceManager.isMonitoring,
        progressTracking: this.progressTracker.isTracking,
        resultAggregation: this.resultAggregator.isAggregating,
        timestamp: Date.now()
      });

      console.log('Batch processing system initialized successfully');

    } catch (error) {
      console.error('Failed to initialize batch processing system:', error);
      throw error;
    }
  }

  /**
   * Process a batch of refactoring tasks
   */
  async processBatch(tasks, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Batch processing system not initialized');
    }

    const batchId = options.batchId || `batch_${Date.now()}`;
    const batchMetadata = {
      name: options.name || 'Unnamed Batch',
      description: options.description || '',
      priority: options.priority || 'normal',
      ...options.metadata
    };

    console.log(`Starting batch processing: ${batchId} (${tasks.length} tasks)`);

    try {
      // Register batch with progress tracker
      this.progressTracker.registerBatch(batchId, tasks.length, batchMetadata);
      
      // Store batch info
      this.activeBatches.set(batchId, {
        id: batchId,
        taskCount: tasks.length,
        metadata: batchMetadata,
        startTime: Date.now(),
        status: 'processing'
      });

      this.isProcessing = true;

      // Update resource manager with current queue length
      this.resourceManager.updateWorkerMetrics('system', {
        queueLength: tasks.length,
        activeBatches: this.activeBatches.size
      });

      // Process tasks using parallel processing engine
      const processingResults = await this.processingEngine.processBatch(tasks, {
        batchId,
        ...options
      });

      // Aggregate results
      this.resultAggregator.addBatchResults(batchId, processingResults.results, {
        batchId,
        processingDuration: processingResults.duration,
        metadata: batchMetadata
      });

      // Update batch status
      const batchInfo = this.activeBatches.get(batchId);
      if (batchInfo) {
        batchInfo.status = 'completed';
        batchInfo.endTime = Date.now();
        batchInfo.duration = batchInfo.endTime - batchInfo.startTime;
        batchInfo.results = processingResults;
      }

      // Generate batch-specific report if enabled
      if (this.options.enableReporting) {
        await this.generateBatchReport(batchId, processingResults);
      }

      this.emit('batchCompleted', {
        batchId,
        results: processingResults,
        duration: batchInfo?.duration,
        timestamp: Date.now()
      });

      console.log(`Batch processing completed: ${batchId} (${processingResults.completedTasks}/${processingResults.totalTasks} successful)`);

      return {
        batchId,
        success: true,
        results: processingResults,
        duration: batchInfo?.duration,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error(`Batch processing failed: ${batchId}`, error);
      
      // Update batch status
      const batchInfo = this.activeBatches.get(batchId);
      if (batchInfo) {
        batchInfo.status = 'failed';
        batchInfo.error = error.message;
        batchInfo.endTime = Date.now();
      }

      this.emit('batchFailed', {
        batchId,
        error: error.message,
        timestamp: Date.now()
      });

      throw error;

    } finally {
      // Clean up if this was the last active batch
      if (this.activeBatches.size === 1) {
        this.isProcessing = false;
      }
    }
  }

  /**
   * Process multiple batches concurrently
   */
  async processMultipleBatches(batches, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Batch processing system not initialized');
    }

    console.log(`Processing ${batches.length} batches concurrently`);

    const batchPromises = batches.map(async (batch, index) => {
      const batchOptions = {
        ...options,
        batchId: batch.id || `multi_batch_${Date.now()}_${index}`,
        name: batch.name || `Batch ${index + 1}`,
        ...batch.options
      };

      try {
        return await this.processBatch(batch.tasks, batchOptions);
      } catch (error) {
        return {
          batchId: batchOptions.batchId,
          success: false,
          error: error.message,
          timestamp: Date.now()
        };
      }
    });

    const results = await Promise.allSettled(batchPromises);
    
    const summary = {
      totalBatches: batches.length,
      successfulBatches: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failedBatches: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }),
      timestamp: Date.now()
    };

    this.emit('multipleBatchesCompleted', summary);

    console.log(`Multiple batch processing completed: ${summary.successfulBatches}/${summary.totalBatches} successful`);

    return summary;
  }

  /**
   * Handle batch completion
   */
  handleBatchCompletion(event) {
    const batchInfo = this.activeBatches.get(event.batchId);
    if (batchInfo) {
      console.log(`Batch ${event.batchId} completed: ${event.completedTasks}/${event.completedTasks + event.failedTasks} tasks successful`);
    }
  }

  /**
   * Handle optimization recommendations from resource manager
   */
  handleOptimizationRecommendations(recommendations) {
    for (const recommendation of recommendations.recommendations) {
      switch (recommendation.type) {
        case 'worker_count':
          if (this.options.adaptiveScaling) {
            console.log(`Resource optimization: Adjusting worker count to ${recommendation.recommended}`);
            // Note: In a real implementation, you might dynamically adjust workers
          }
          break;
          
        case 'memory_per_worker':
          console.log(`Resource optimization: Recommended memory per worker: ${Math.round(recommendation.recommended / 1024 / 1024)}MB`);
          break;
          
        case 'batch_size':
          console.log(`Resource optimization: Recommended batch size: ${recommendation.recommended}`);
          break;
      }
    }

    this.emit('optimizationRecommendations', recommendations);
  }

  /**
   * Generate comprehensive report
   */
  async generateComprehensiveReport(reportData = null) {
    if (!this.options.enableReporting) return null;

    try {
      const data = reportData || this.resultAggregator.generateComprehensiveReport();
      const report = await this.reportingSystem.generateComprehensiveReport(data);
      
      this.emit('reportGenerated', {
        type: 'comprehensive',
        reportId: report.reportId,
        files: report.files,
        timestamp: Date.now()
      });

      console.log(`Comprehensive report generated: ${report.reportId}`);
      return report;

    } catch (error) {
      console.error('Failed to generate comprehensive report:', error);
      throw error;
    }
  }

  /**
   * Generate batch-specific report
   */
  async generateBatchReport(batchId, results) {
    if (!this.options.enableReporting) return null;

    try {
      const batchData = this.resultAggregator.getBatchReport(batchId);
      if (!batchData) {
        console.warn(`No batch data found for report generation: ${batchId}`);
        return null;
      }

      const report = await this.reportingSystem.generateBatchReport(batchData);
      
      this.emit('reportGenerated', {
        type: 'batch',
        batchId,
        reportId: report.reportId,
        file: report.file,
        timestamp: Date.now()
      });

      console.log(`Batch report generated: ${report.reportId}`);
      return report;

    } catch (error) {
      console.error(`Failed to generate batch report for ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * Get current system status
   */
  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      processing: this.isProcessing,
      activeBatches: this.activeBatches.size,
      
      // Component status
      processingEngine: {
        running: this.processingEngine.isRunning,
        workers: this.processingEngine.workers.size,
        queueLength: this.processingEngine.taskQueue.length,
        activeTasks: this.processingEngine.activeTasks.size,
        stats: this.processingEngine.getStats()
      },
      
      resourceManager: {
        monitoring: this.resourceManager.isMonitoring,
        currentMetrics: this.resourceManager.currentMetrics,
        recommendations: this.resourceManager.getLatestRecommendations()
      },
      
      progressTracker: {
        tracking: this.progressTracker.isTracking,
        globalProgress: this.progressTracker.calculateGlobalProgress(),
        performance: this.progressTracker.getPerformanceSummary()
      },
      
      resultAggregator: {
        aggregating: this.resultAggregator.isAggregating,
        metrics: this.resultAggregator.aggregatedMetrics,
        conflictRate: this.resultAggregator.calculateConflictRate()
      },
      
      timestamp: Date.now()
    };
  }

  /**
   * Get processing statistics
   */
  getProcessingStatistics() {
    const engineStats = this.processingEngine.getStats();
    const progressStats = this.progressTracker.getGlobalStats();
    const aggregatedMetrics = this.resultAggregator.aggregatedMetrics;
    const resourceStatus = this.resourceManager.getResourceStatus();

    return {
      processing: {
        totalTasks: engineStats.totalTasks,
        completedTasks: engineStats.completedTasks,
        failedTasks: engineStats.failedTasks,
        tasksPerSecond: engineStats.tasksPerSecond,
        averageTaskTime: engineStats.averageTaskTime,
        runtime: engineStats.runtime
      },
      
      quality: {
        averageQualityImprovement: aggregatedMetrics.averageQualityImprovement,
        averageComplexityReduction: aggregatedMetrics.averageComplexityReduction,
        technicalDebtReduction: aggregatedMetrics.technicalDebtReduction,
        totalLinesRefactored: aggregatedMetrics.totalLinesRefactored
      },
      
      resources: {
        cpuUsage: resourceStatus.system.currentMetrics.cpuUsage,
        memoryUsage: resourceStatus.system.currentMetrics.memoryUsage,
        activeWorkers: resourceStatus.system.currentMetrics.activeWorkers,
        peakMemoryUsage: engineStats.memoryUsage.peak
      },
      
      batches: {
        totalBatches: aggregatedMetrics.totalBatches,
        activeBatches: this.activeBatches.size,
        completedBatches: progressStats.completedBatches
      },
      
      timestamp: Date.now()
    };
  }

  /**
   * Pause processing (if supported)
   */
  async pauseProcessing() {
    console.log('Pausing batch processing...');
    
    // Note: This is a simplified implementation
    // In a real system, you might need more sophisticated pause/resume logic
    this.isProcessing = false;
    
    this.emit('processingPaused', {
      timestamp: Date.now()
    });
  }

  /**
   * Resume processing (if supported)
   */
  async resumeProcessing() {
    console.log('Resuming batch processing...');
    
    this.isProcessing = true;
    
    this.emit('processingResumed', {
      timestamp: Date.now()
    });
  }

  /**
   * Shutdown the batch processing system
   */
  async shutdown() {
    console.log('Shutting down batch processing system...');

    try {
      // Stop all components
      await this.processingEngine.shutdown();
      this.resourceManager.stopMonitoring();
      this.progressTracker.stopTracking();
      this.resultAggregator.stopAggregation();

      // Generate final report if enabled
      if (this.options.enableReporting && this.options.autoGenerateReports) {
        try {
          await this.generateComprehensiveReport();
        } catch (error) {
          console.warn('Failed to generate final report during shutdown:', error);
        }
      }

      // Clean up
      this.activeBatches.clear();
      this.isInitialized = false;
      this.isProcessing = false;

      this.emit('shutdown', {
        finalStats: this.getProcessingStatistics(),
        timestamp: Date.now()
      });

      console.log('Batch processing system shutdown complete');

    } catch (error) {
      console.error('Error during batch processing system shutdown:', error);
      throw error;
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    this.processingEngine?.cleanup?.();
    this.resourceManager?.cleanup?.();
    this.progressTracker?.cleanup?.();
    this.resultAggregator?.cleanup?.();
    this.reportingSystem?.cleanup?.();
    
    this.removeAllListeners();
    
    console.log('Batch Processing System cleaned up');
  }
}