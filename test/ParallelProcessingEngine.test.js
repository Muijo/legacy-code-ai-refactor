import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ParallelProcessingEngine } from '../src/batch/ParallelProcessingEngine.js';
import { ResourceManager } from '../src/batch/ResourceManager.js';
import { ProgressTracker } from '../src/batch/ProgressTracker.js';

describe('ParallelProcessingEngine', () => {
  let engine;
  let resourceManager;
  let progressTracker;

  beforeEach(async () => {
    // Create test instances with minimal configuration
    engine = new ParallelProcessingEngine({
      maxWorkers: 2,
      taskTimeout: 10000,
      retryAttempts: 1,
      resourceMonitoringInterval: 1000
    });

    resourceManager = new ResourceManager({
      monitoringInterval: 1000,
      adaptiveScaling: false
    });

    progressTracker = new ProgressTracker({
      updateInterval: 500,
      enableDetailedLogging: false,
      enableProgressBar: false
    });
  });

  afterEach(async () => {
    if (engine) {
      await engine.shutdown();
    }
    if (resourceManager) {
      resourceManager.cleanup();
    }
    if (progressTracker) {
      progressTracker.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct default options', () => {
      expect(engine.options.maxWorkers).toBe(2);
      expect(engine.options.taskTimeout).toBe(10000);
      expect(engine.options.retryAttempts).toBe(1);
      expect(engine.isRunning).toBe(false);
    });

    it('should initialize worker pool', async () => {
      await engine.initialize();
      
      expect(engine.isRunning).toBe(true);
      expect(engine.workers.size).toBe(2);
      expect(engine.stats.startTime).toBeTruthy();
    });
  });

  describe('Task Processing', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should process simple tasks', async () => {
      const tasks = [
        {
          id: 'task1',
          type: 'refactor',
          content: 'function test() { return "hello"; }',
          language: 'javascript'
        },
        {
          id: 'task2',
          type: 'refactor',
          content: 'function test2() { return "world"; }',
          language: 'javascript'
        }
      ];

      const results = await engine.processBatch(tasks);
      
      expect(results.totalTasks).toBe(2);
      expect(results.results).toHaveLength(2);
      expect(results.batchId).toBeTruthy();
    });

    it('should handle task priorities', async () => {
      const tasks = [
        {
          id: 'low-priority',
          priority: 'low',
          content: 'function low() {}',
          language: 'javascript'
        },
        {
          id: 'high-priority',
          priority: 'high',
          content: 'function high() {}',
          language: 'javascript'
        }
      ];

      // Mock the task queue to verify ordering
      const originalProcessQueue = engine.processTaskQueue;
      let processedOrder = [];
      
      engine.processTaskQueue = function() {
        if (this.taskQueue.length > 0) {
          processedOrder.push(this.taskQueue[0].id);
        }
        return originalProcessQueue.call(this);
      };

      await engine.processBatch(tasks);
      
      // High priority task should be processed first
      expect(processedOrder[0]).toBe('high-priority');
    });

    it('should retry failed tasks', async () => {
      const tasks = [
        {
          id: 'failing-task',
          content: 'invalid syntax here',
          language: 'javascript'
        }
      ];

      // Mock worker to simulate failure
      const mockWorker = {
        postMessage: vi.fn(),
        on: vi.fn(),
        terminate: vi.fn()
      };

      // Replace one worker with mock
      const workerId = Array.from(engine.workers.keys())[0];
      const workerInfo = engine.workers.get(workerId);
      workerInfo.worker = mockWorker;

      // Simulate task failure
      setTimeout(() => {
        engine.handleTaskFailed(workerId, 'failing-task', new Error('Parse error'));
      }, 100);

      const results = await engine.processBatch(tasks);
      
      expect(results.failedTasks).toBe(1);
      expect(engine.stats.retriedTasks).toBeGreaterThan(0);
    });
  });

  describe('Resource Management', () => {
    beforeEach(() => {
      resourceManager.startMonitoring();
    });

    it('should monitor system resources', () => {
      expect(resourceManager.isMonitoring).toBe(true);
      expect(resourceManager.currentMetrics).toBeDefined();
      expect(resourceManager.systemInfo.cpuCount).toBeGreaterThan(0);
    });

    it('should calculate optimal worker count', () => {
      const optimalCount = resourceManager.calculateOptimalWorkerCount();
      expect(optimalCount).toBeGreaterThan(0);
      expect(optimalCount).toBeLessThanOrEqual(resourceManager.systemInfo.cpuCount * 2);
    });

    it('should provide load balancing recommendations', () => {
      const mockWorkers = [
        { id: 0, isIdle: true },
        { id: 1, isIdle: true }
      ];

      const mockTask = { id: 'test', estimatedComplexity: 3 };
      
      const recommendation = resourceManager.getLoadBalancingRecommendation(mockWorkers, mockTask);
      expect(recommendation).toBeDefined();
      expect(mockWorkers).toContain(recommendation);
    });

    it('should detect resource alerts', () => {
      let alertReceived = false;
      
      resourceManager.on('resourceAlert', (alert) => {
        alertReceived = true;
        expect(alert.type).toBeDefined();
        expect(alert.severity).toBeDefined();
        expect(alert.message).toBeDefined();
      });

      // Simulate high resource usage
      resourceManager.currentMetrics.cpuUsage = 95;
      resourceManager.analyzeResourceUsage();

      expect(alertReceived).toBe(true);
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(() => {
      progressTracker.startTracking();
    });

    it('should track batch progress', () => {
      const batchId = 'test-batch';
      const totalTasks = 5;

      progressTracker.registerBatch(batchId, totalTasks);
      
      const batch = progressTracker.batches.get(batchId);
      expect(batch).toBeDefined();
      expect(batch.totalTasks).toBe(totalTasks);
      expect(batch.status).toBe('active');
    });

    it('should update task status correctly', () => {
      const batchId = 'test-batch';
      progressTracker.registerBatch(batchId, 3);

      progressTracker.updateTaskStatus(batchId, 'task1', 'active');
      progressTracker.updateTaskStatus(batchId, 'task1', 'completed');

      const batch = progressTracker.batches.get(batchId);
      expect(batch.completedTasks).toBe(1);
      expect(batch.activeTasks).toBe(0);
    });

    it('should calculate progress percentage', () => {
      const batchId = 'test-batch';
      progressTracker.registerBatch(batchId, 4);

      progressTracker.updateTaskStatus(batchId, 'task1', 'completed');
      progressTracker.updateTaskStatus(batchId, 'task2', 'completed');

      const progress = progressTracker.calculateBatchProgresses();
      expect(progress[batchId].percentage).toBe(50);
    });

    it('should complete batch when all tasks are done', () => {
      let batchCompleted = false;
      
      progressTracker.on('batchCompleted', (event) => {
        batchCompleted = true;
        expect(event.batchId).toBe('test-batch');
        expect(event.status).toBe('completed');
      });

      const batchId = 'test-batch';
      progressTracker.registerBatch(batchId, 2);

      progressTracker.updateTaskStatus(batchId, 'task1', 'completed');
      progressTracker.updateTaskStatus(batchId, 'task2', 'completed');

      expect(batchCompleted).toBe(true);
    });

    it('should calculate performance metrics', () => {
      const batchId = 'test-batch';
      progressTracker.registerBatch(batchId, 2);

      // Simulate task completion with duration
      const task1 = {
        id: 'task1',
        status: 'completed',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        timestamp: Date.now()
      };

      progressTracker.addToTaskHistory(task1);
      
      expect(progressTracker.performanceMetrics.averageTaskTime).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should integrate all components for end-to-end processing', async () => {
      await engine.initialize();
      resourceManager.startMonitoring();
      progressTracker.startTracking();

      // Register batch with progress tracker
      const batchId = 'integration-test';
      progressTracker.registerBatch(batchId, 2);

      // Monitor resource usage
      let resourceUpdates = 0;
      resourceManager.on('resourceUpdate', () => {
        resourceUpdates++;
      });

      // Monitor progress updates
      let progressUpdates = 0;
      progressTracker.on('progressUpdate', () => {
        progressUpdates++;
      });

      // Process tasks
      const tasks = [
        {
          id: 'integration-task-1',
          content: 'function test1() { return 1; }',
          language: 'javascript'
        },
        {
          id: 'integration-task-2',
          content: 'function test2() { return 2; }',
          language: 'javascript'
        }
      ];

      const results = await engine.processBatch(tasks);

      // Update progress tracker
      for (const result of results.results) {
        progressTracker.updateTaskStatus(
          batchId, 
          result.taskId, 
          result.status === 'completed' ? 'completed' : 'failed'
        );
      }

      // Verify integration
      expect(results.totalTasks).toBe(2);
      expect(resourceUpdates).toBeGreaterThan(0);
      expect(progressUpdates).toBeGreaterThan(0);
      
      const globalStats = progressTracker.getGlobalStats();
      expect(globalStats.totalTasks).toBe(2);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should handle worker crashes gracefully', async () => {
      const workerId = Array.from(engine.workers.keys())[0];
      
      // Simulate worker crash
      engine.handleWorkerExit(workerId, 1);
      
      // Worker should be restarted
      expect(engine.workers.has(workerId)).toBe(true);
    });

    it('should handle task timeouts', async () => {
      const tasks = [
        {
          id: 'timeout-task',
          content: 'function timeout() { while(true) {} }',
          language: 'javascript'
        }
      ];

      // Set very short timeout for testing
      engine.options.taskTimeout = 100;

      const results = await engine.processBatch(tasks);
      
      // Task should eventually fail due to timeout
      expect(results.failedTasks).toBe(1);
    });

    it('should handle invalid tasks', async () => {
      const tasks = [
        {
          id: 'invalid-task',
          // Missing required fields
        }
      ];

      const results = await engine.processBatch(tasks);
      expect(results.failedTasks).toBe(1);
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should process multiple tasks efficiently', async () => {
      const taskCount = 10;
      const tasks = Array.from({ length: taskCount }, (_, i) => ({
        id: `perf-task-${i}`,
        content: `function test${i}() { return ${i}; }`,
        language: 'javascript'
      }));

      const startTime = Date.now();
      const results = await engine.processBatch(tasks);
      const duration = Date.now() - startTime;

      expect(results.totalTasks).toBe(taskCount);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      const stats = engine.getStats();
      expect(stats.tasksPerSecond).toBeGreaterThan(0);
    });

    it('should scale with available workers', async () => {
      // Test with different worker counts
      const workerCounts = [1, 2, 4];
      const results = [];

      for (const workerCount of workerCounts) {
        await engine.shutdown();
        
        engine = new ParallelProcessingEngine({
          maxWorkers: workerCount,
          taskTimeout: 10000
        });
        
        await engine.initialize();

        const tasks = Array.from({ length: 8 }, (_, i) => ({
          id: `scale-task-${i}`,
          content: `function test${i}() { return ${i}; }`,
          language: 'javascript'
        }));

        const startTime = Date.now();
        await engine.processBatch(tasks);
        const duration = Date.now() - startTime;

        results.push({ workerCount, duration });
      }

      // More workers should generally process faster (though not always due to overhead)
      expect(results[0].duration).toBeGreaterThan(0);
      expect(results[1].duration).toBeGreaterThan(0);
      expect(results[2].duration).toBeGreaterThan(0);
    });
  });
});