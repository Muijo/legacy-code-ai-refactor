import { EventEmitter } from 'events';
import { cpus, totalmem, freemem } from 'os';

/**
 * Resource Manager for optimizing parallel processing performance
 * Handles load balancing, memory management, and resource allocation
 */
export class ResourceManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxCpuUsage: options.maxCpuUsage || 80, // Maximum CPU usage percentage
      maxMemoryUsage: options.maxMemoryUsage || 75, // Maximum memory usage percentage
      monitoringInterval: options.monitoringInterval || 2000,
      adaptiveScaling: options.adaptiveScaling !== false,
      loadBalancingStrategy: options.loadBalancingStrategy || 'adaptive',
      resourceThrottling: options.resourceThrottling !== false,
      ...options
    };

    this.systemInfo = {
      cpuCount: cpus().length,
      totalMemory: totalmem(),
      architecture: process.arch,
      platform: process.platform
    };

    this.currentMetrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      freeMemory: 0,
      loadAverage: [0, 0, 0],
      activeWorkers: 0,
      queueLength: 0,
      throughput: 0,
      timestamp: Date.now()
    };

    this.historicalMetrics = [];
    this.maxHistorySize = 100;
    
    this.workerMetrics = new Map();
    this.resourceAlerts = new Map();
    
    this.monitoringInterval = null;
    this.isMonitoring = false;
    
    console.log('Resource Manager initialized:', {
      cpuCount: this.systemInfo.cpuCount,
      totalMemory: Math.round(this.systemInfo.totalMemory / 1024 / 1024 / 1024) + 'GB',
      maxCpuUsage: this.options.maxCpuUsage + '%',
      maxMemoryUsage: this.options.maxMemoryUsage + '%'
    });
  }

  /**
   * Start resource monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateSystemMetrics();
      this.analyzeResourceUsage();
      this.optimizeResourceAllocation();
    }, this.options.monitoringInterval);

    console.log('Resource monitoring started');
    this.emit('monitoringStarted', { timestamp: Date.now() });
  }

  /**
   * Stop resource monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Resource monitoring stopped');
    this.emit('monitoringStopped', { timestamp: Date.now() });
  }

  /**
   * Update system resource metrics
   */
  updateSystemMetrics() {
    const freeMemory = freemem();
    const usedMemory = this.systemInfo.totalMemory - freeMemory;
    
    this.currentMetrics = {
      cpuUsage: this.calculateCpuUsage(),
      memoryUsage: Math.round((usedMemory / this.systemInfo.totalMemory) * 100),
      freeMemory,
      loadAverage: this.getLoadAverage(),
      activeWorkers: this.workerMetrics.size,
      queueLength: this.currentMetrics.queueLength, // Updated externally
      throughput: this.calculateThroughput(),
      timestamp: Date.now()
    };

    // Store historical data
    this.historicalMetrics.push({ ...this.currentMetrics });
    if (this.historicalMetrics.length > this.maxHistorySize) {
      this.historicalMetrics.shift();
    }

    this.emit('metricsUpdated', this.currentMetrics);
  }

  /**
   * Calculate current CPU usage
   */
  calculateCpuUsage() {
    // Simplified CPU usage calculation
    // In a real implementation, you might use more sophisticated methods
    const loadAvg = this.getLoadAverage()[0];
    return Math.min(Math.round((loadAvg / this.systemInfo.cpuCount) * 100), 100);
  }

  /**
   * Get system load average
   */
  getLoadAverage() {
    try {
      return process.platform === 'win32' ? [0, 0, 0] : require('os').loadavg();
    } catch (error) {
      return [0, 0, 0];
    }
  }

  /**
   * Calculate processing throughput
   */
  calculateThroughput() {
    if (this.historicalMetrics.length < 2) return 0;
    
    const recent = this.historicalMetrics.slice(-10);
    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
    
    if (timeSpan === 0) return 0;
    
    // Calculate tasks processed per second based on worker activity
    const avgActiveWorkers = recent.reduce((sum, m) => sum + m.activeWorkers, 0) / recent.length;
    return Math.round(avgActiveWorkers * 1000 / (timeSpan / recent.length));
  }

  /**
   * Analyze resource usage and detect issues
   */
  analyzeResourceUsage() {
    const metrics = this.currentMetrics;
    const alerts = [];

    // CPU usage analysis
    if (metrics.cpuUsage > this.options.maxCpuUsage) {
      alerts.push({
        type: 'high_cpu',
        severity: metrics.cpuUsage > 95 ? 'critical' : 'warning',
        message: `CPU usage at ${metrics.cpuUsage}%`,
        recommendation: 'Consider reducing worker count or task complexity'
      });
    }

    // Memory usage analysis
    if (metrics.memoryUsage > this.options.maxMemoryUsage) {
      alerts.push({
        type: 'high_memory',
        severity: metrics.memoryUsage > 90 ? 'critical' : 'warning',
        message: `Memory usage at ${metrics.memoryUsage}%`,
        recommendation: 'Consider reducing batch size or worker memory limits'
      });
    }

    // Load average analysis
    const loadAvg = metrics.loadAverage[0];
    if (loadAvg > this.systemInfo.cpuCount * 2) {
      alerts.push({
        type: 'high_load',
        severity: 'warning',
        message: `System load average at ${loadAvg.toFixed(2)}`,
        recommendation: 'System may be overloaded, consider reducing concurrency'
      });
    }

    // Process alerts
    for (const alert of alerts) {
      this.handleResourceAlert(alert);
    }
  }

  /**
   * Handle resource alerts
   */
  handleResourceAlert(alert) {
    const alertKey = `${alert.type}_${alert.severity}`;
    const existingAlert = this.resourceAlerts.get(alertKey);
    
    // Avoid spam by checking if we've recently sent this alert
    if (existingAlert && Date.now() - existingAlert.timestamp < 30000) {
      return;
    }

    this.resourceAlerts.set(alertKey, {
      ...alert,
      timestamp: Date.now()
    });

    console.warn(`Resource Alert [${alert.severity.toUpperCase()}]:`, alert.message);
    console.warn(`Recommendation:`, alert.recommendation);

    this.emit('resourceAlert', alert);
  }

  /**
   * Optimize resource allocation based on current metrics
   */
  optimizeResourceAllocation() {
    if (!this.options.adaptiveScaling) return;

    const metrics = this.currentMetrics;
    const recommendations = [];

    // Worker count optimization
    const optimalWorkerCount = this.calculateOptimalWorkerCount();
    if (optimalWorkerCount !== metrics.activeWorkers) {
      recommendations.push({
        type: 'worker_count',
        current: metrics.activeWorkers,
        recommended: optimalWorkerCount,
        reason: this.getWorkerCountReason(optimalWorkerCount, metrics.activeWorkers)
      });
    }

    // Memory allocation optimization
    const optimalMemoryPerWorker = this.calculateOptimalMemoryPerWorker();
    recommendations.push({
      type: 'memory_per_worker',
      recommended: optimalMemoryPerWorker,
      reason: 'Optimized based on current memory usage patterns'
    });

    // Batch size optimization
    const optimalBatchSize = this.calculateOptimalBatchSize();
    recommendations.push({
      type: 'batch_size',
      recommended: optimalBatchSize,
      reason: 'Optimized based on throughput and resource usage'
    });

    if (recommendations.length > 0) {
      this.emit('optimizationRecommendations', {
        recommendations,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Calculate optimal worker count based on system resources
   */
  calculateOptimalWorkerCount() {
    const metrics = this.currentMetrics;
    let optimalCount = this.systemInfo.cpuCount;

    // Adjust based on CPU usage
    if (metrics.cpuUsage > this.options.maxCpuUsage) {
      optimalCount = Math.max(1, Math.floor(optimalCount * 0.8));
    } else if (metrics.cpuUsage < 50) {
      optimalCount = Math.min(this.systemInfo.cpuCount * 2, optimalCount + 1);
    }

    // Adjust based on memory usage
    if (metrics.memoryUsage > this.options.maxMemoryUsage) {
      optimalCount = Math.max(1, Math.floor(optimalCount * 0.7));
    }

    // Consider queue length
    if (metrics.queueLength > optimalCount * 10) {
      optimalCount = Math.min(this.systemInfo.cpuCount * 2, optimalCount + 1);
    }

    return optimalCount;
  }

  /**
   * Get reason for worker count recommendation
   */
  getWorkerCountReason(recommended, current) {
    if (recommended > current) {
      return 'Increase workers to improve throughput';
    } else if (recommended < current) {
      return 'Reduce workers to lower resource usage';
    }
    return 'Current worker count is optimal';
  }

  /**
   * Calculate optimal memory per worker
   */
  calculateOptimalMemoryPerWorker() {
    const availableMemory = this.currentMetrics.freeMemory;
    const workerCount = Math.max(1, this.currentMetrics.activeWorkers);
    
    // Reserve 25% of total memory for system
    const usableMemory = this.systemInfo.totalMemory * 0.75;
    const memoryPerWorker = Math.floor(usableMemory / workerCount);
    
    // Ensure minimum and maximum limits
    const minMemory = 256 * 1024 * 1024; // 256MB
    const maxMemory = 2 * 1024 * 1024 * 1024; // 2GB
    
    return Math.max(minMemory, Math.min(maxMemory, memoryPerWorker));
  }

  /**
   * Calculate optimal batch size
   */
  calculateOptimalBatchSize() {
    const metrics = this.currentMetrics;
    let batchSize = 50; // Default

    // Adjust based on throughput
    if (metrics.throughput > 10) {
      batchSize = Math.min(200, batchSize * 2);
    } else if (metrics.throughput < 2) {
      batchSize = Math.max(10, Math.floor(batchSize / 2));
    }

    // Adjust based on memory usage
    if (metrics.memoryUsage > 80) {
      batchSize = Math.max(10, Math.floor(batchSize * 0.7));
    }

    return batchSize;
  }

  /**
   * Update worker metrics
   */
  updateWorkerMetrics(workerId, metrics) {
    this.workerMetrics.set(workerId, {
      ...metrics,
      timestamp: Date.now()
    });

    // Update queue length if provided
    if (metrics.queueLength !== undefined) {
      this.currentMetrics.queueLength = metrics.queueLength;
    }
  }

  /**
   * Remove worker metrics
   */
  removeWorkerMetrics(workerId) {
    this.workerMetrics.delete(workerId);
  }

  /**
   * Get load balancing recommendation for task assignment
   */
  getLoadBalancingRecommendation(workers, task) {
    const strategy = this.options.loadBalancingStrategy;
    
    switch (strategy) {
      case 'cpu_optimized':
        return this.getCpuOptimizedWorker(workers);
      case 'memory_optimized':
        return this.getMemoryOptimizedWorker(workers);
      case 'adaptive':
        return this.getAdaptiveWorker(workers, task);
      case 'round_robin':
      default:
        return this.getRoundRobinWorker(workers);
    }
  }

  /**
   * Get worker with lowest CPU usage
   */
  getCpuOptimizedWorker(workers) {
    return workers.reduce((best, worker) => {
      const workerMetrics = this.workerMetrics.get(worker.id);
      const bestMetrics = this.workerMetrics.get(best.id);
      
      if (!workerMetrics) return best;
      if (!bestMetrics) return worker;
      
      return workerMetrics.cpuUsage < bestMetrics.cpuUsage ? worker : best;
    });
  }

  /**
   * Get worker with lowest memory usage
   */
  getMemoryOptimizedWorker(workers) {
    return workers.reduce((best, worker) => {
      const workerMetrics = this.workerMetrics.get(worker.id);
      const bestMetrics = this.workerMetrics.get(best.id);
      
      if (!workerMetrics) return best;
      if (!bestMetrics) return worker;
      
      return workerMetrics.memoryUsage < bestMetrics.memoryUsage ? worker : best;
    });
  }

  /**
   * Get worker using adaptive strategy
   */
  getAdaptiveWorker(workers, task) {
    // Consider task complexity and worker capabilities
    const taskComplexity = task.estimatedComplexity || 1;
    
    return workers.reduce((best, worker) => {
      const workerMetrics = this.workerMetrics.get(worker.id);
      const bestMetrics = this.workerMetrics.get(best.id);
      
      if (!workerMetrics) return best;
      if (!bestMetrics) return worker;
      
      // Calculate worker efficiency score
      const workerScore = this.calculateWorkerScore(workerMetrics, taskComplexity);
      const bestScore = this.calculateWorkerScore(bestMetrics, taskComplexity);
      
      return workerScore > bestScore ? worker : best;
    });
  }

  /**
   * Get worker using round-robin strategy
   */
  getRoundRobinWorker(workers) {
    return workers[0]; // Simplified - actual round-robin would be handled by caller
  }

  /**
   * Calculate worker efficiency score
   */
  calculateWorkerScore(metrics, taskComplexity) {
    const cpuScore = Math.max(0, 100 - metrics.cpuUsage);
    const memoryScore = Math.max(0, 100 - (metrics.memoryUsage / 1024 / 1024 / 1024) * 10);
    const taskScore = Math.max(0, 100 - metrics.tasksCompleted * 2);
    
    // Weight scores based on task complexity
    const weights = taskComplexity > 5 ? 
      { cpu: 0.4, memory: 0.4, task: 0.2 } : 
      { cpu: 0.3, memory: 0.3, task: 0.4 };
    
    return (cpuScore * weights.cpu) + (memoryScore * weights.memory) + (taskScore * weights.task);
  }

  /**
   * Get current resource status
   */
  getResourceStatus() {
    return {
      system: {
        ...this.systemInfo,
        currentMetrics: this.currentMetrics
      },
      workers: Object.fromEntries(this.workerMetrics),
      alerts: Object.fromEntries(this.resourceAlerts),
      recommendations: this.getLatestRecommendations(),
      timestamp: Date.now()
    };
  }

  /**
   * Get latest optimization recommendations
   */
  getLatestRecommendations() {
    const optimalWorkerCount = this.calculateOptimalWorkerCount();
    const optimalMemoryPerWorker = this.calculateOptimalMemoryPerWorker();
    const optimalBatchSize = this.calculateOptimalBatchSize();
    
    return {
      workerCount: optimalWorkerCount,
      memoryPerWorker: optimalMemoryPerWorker,
      batchSize: optimalBatchSize,
      timestamp: Date.now()
    };
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends() {
    if (this.historicalMetrics.length < 10) {
      return { insufficient_data: true };
    }

    const recent = this.historicalMetrics.slice(-20);
    const older = this.historicalMetrics.slice(-40, -20);
    
    const recentAvg = this.calculateAverageMetrics(recent);
    const olderAvg = this.calculateAverageMetrics(older);
    
    return {
      cpuTrend: this.calculateTrend(olderAvg.cpuUsage, recentAvg.cpuUsage),
      memoryTrend: this.calculateTrend(olderAvg.memoryUsage, recentAvg.memoryUsage),
      throughputTrend: this.calculateTrend(olderAvg.throughput, recentAvg.throughput),
      timestamp: Date.now()
    };
  }

  /**
   * Calculate average metrics for a set of data points
   */
  calculateAverageMetrics(metrics) {
    const sum = metrics.reduce((acc, m) => ({
      cpuUsage: acc.cpuUsage + m.cpuUsage,
      memoryUsage: acc.memoryUsage + m.memoryUsage,
      throughput: acc.throughput + m.throughput
    }), { cpuUsage: 0, memoryUsage: 0, throughput: 0 });
    
    const count = metrics.length;
    return {
      cpuUsage: sum.cpuUsage / count,
      memoryUsage: sum.memoryUsage / count,
      throughput: sum.throughput / count
    };
  }

  /**
   * Calculate trend direction
   */
  calculateTrend(oldValue, newValue) {
    if (oldValue === 0) return 'stable';
    
    const change = ((newValue - oldValue) / oldValue) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopMonitoring();
    this.workerMetrics.clear();
    this.resourceAlerts.clear();
    this.historicalMetrics.length = 0;
    
    console.log('Resource Manager cleaned up');
  }
}