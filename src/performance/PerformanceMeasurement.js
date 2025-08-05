/**
 * Performance Measurement System
 * Provides before/after performance comparison tools, memory usage tracking,
 * and execution time optimization for the Legacy Code AI Refactor system.
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import os from 'os';

export class PerformanceMeasurement extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableMemoryTracking: true,
      enableCpuTracking: true,
      enableDiskIOTracking: true,
      samplingInterval: 1000, // 1 second
      maxSamples: 1000,
      enableGCTracking: true,
      ...options
    };

    this.measurements = new Map();
    this.activeOperations = new Map();
    this.systemMetrics = [];
    this.gcMetrics = [];
    this.samplingTimer = null;
    
    this.initializeTracking();
  }

  /**
   * Initialize performance tracking systems
   */
  initializeTracking() {
    if (this.options.enableGCTracking && global.gc) {
      // Track garbage collection events
      const originalGC = global.gc;
      global.gc = (...args) => {
        const start = performance.now();
        const result = originalGC.apply(global, args);
        const duration = performance.now() - start;
        
        this.gcMetrics.push({
          timestamp: Date.now(),
          duration,
          type: 'manual'
        });
        
        this.emit('gc', { duration, type: 'manual' });
        return result;
      };
    }

    // Start system metrics sampling
    this.startSystemMetricsSampling();
  }

  /**
   * Start measuring performance for an operation
   */
  startMeasurement(operationId, metadata = {}) {
    const measurement = {
      id: operationId,
      startTime: performance.now(),
      startTimestamp: Date.now(),
      startMemory: this.getMemoryUsage(),
      startCpu: this.getCpuUsage(),
      metadata,
      samples: [],
      completed: false
    };

    this.activeOperations.set(operationId, measurement);
    this.emit('measurementStarted', { operationId, metadata });
    
    return measurement;
  }

  /**
   * End measurement for an operation
   */
  endMeasurement(operationId, result = {}) {
    const measurement = this.activeOperations.get(operationId);
    if (!measurement) {
      throw new Error(`No active measurement found for operation: ${operationId}`);
    }

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    const endCpu = this.getCpuUsage();

    measurement.endTime = endTime;
    measurement.endTimestamp = Date.now();
    measurement.endMemory = endMemory;
    measurement.endCpu = endCpu;
    measurement.duration = endTime - measurement.startTime;
    measurement.memoryDelta = this.calculateMemoryDelta(measurement.startMemory, endMemory);
    measurement.cpuDelta = this.calculateCpuDelta(measurement.startCpu, endCpu);
    measurement.result = result;
    measurement.completed = true;

    this.measurements.set(operationId, measurement);
    this.activeOperations.delete(operationId);
    
    this.emit('measurementCompleted', { operationId, measurement });
    
    return measurement;
  }

  /**
   * Add a sample point during an active measurement
   */
  addSample(operationId, sampleData = {}) {
    const measurement = this.activeOperations.get(operationId);
    if (!measurement) {
      return;
    }

    const sample = {
      timestamp: Date.now(),
      relativeTime: performance.now() - measurement.startTime,
      memory: this.getMemoryUsage(),
      cpu: this.getCpuUsage(),
      ...sampleData
    };

    measurement.samples.push(sample);
    
    // Limit samples to prevent memory issues
    if (measurement.samples.length > this.options.maxSamples) {
      measurement.samples.shift();
    }

    this.emit('sampleAdded', { operationId, sample });
  }

  /**
   * Compare performance between two measurements
   */
  comparePerformance(beforeId, afterId) {
    const before = this.measurements.get(beforeId);
    const after = this.measurements.get(afterId);

    if (!before || !after) {
      throw new Error('Both measurements must exist for comparison');
    }

    const comparison = {
      operationIds: { before: beforeId, after: afterId },
      duration: {
        before: before.duration,
        after: after.duration,
        improvement: before.duration - after.duration,
        improvementPercent: ((before.duration - after.duration) / before.duration) * 100
      },
      memory: {
        before: before.memoryDelta,
        after: after.memoryDelta,
        improvement: this.compareMemoryUsage(before.memoryDelta, after.memoryDelta)
      },
      cpu: {
        before: before.cpuDelta,
        after: after.cpuDelta,
        improvement: this.compareCpuUsage(before.cpuDelta, after.cpuDelta)
      },
      timestamp: Date.now()
    };

    this.emit('performanceComparison', comparison);
    return comparison;
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    return {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      system: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      }
    };
  }

  /**
   * Get current CPU usage
   */
  getCpuUsage() {
    const cpus = os.cpus();
    const usage = process.cpuUsage();
    
    return {
      user: usage.user,
      system: usage.system,
      total: usage.user + usage.system,
      cores: cpus.length,
      loadAverage: os.loadavg(),
      cpuInfo: cpus.map(cpu => ({
        model: cpu.model,
        speed: cpu.speed
      }))
    };
  }

  /**
   * Calculate memory usage delta
   */
  calculateMemoryDelta(startMemory, endMemory) {
    return {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
      arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
      system: {
        used: endMemory.system.used - startMemory.system.used
      }
    };
  }

  /**
   * Calculate CPU usage delta
   */
  calculateCpuDelta(startCpu, endCpu) {
    return {
      user: endCpu.user - startCpu.user,
      system: endCpu.system - startCpu.system,
      total: (endCpu.user + endCpu.system) - (startCpu.user + startCpu.system)
    };
  }

  /**
   * Compare memory usage between two measurements
   */
  compareMemoryUsage(before, after) {
    return {
      rss: {
        delta: before.rss - after.rss,
        percent: before.rss !== 0 ? ((before.rss - after.rss) / Math.abs(before.rss)) * 100 : 0
      },
      heapUsed: {
        delta: before.heapUsed - after.heapUsed,
        percent: before.heapUsed !== 0 ? ((before.heapUsed - after.heapUsed) / Math.abs(before.heapUsed)) * 100 : 0
      }
    };
  }

  /**
   * Compare CPU usage between two measurements
   */
  compareCpuUsage(before, after) {
    return {
      total: {
        delta: before.total - after.total,
        percent: before.total !== 0 ? ((before.total - after.total) / before.total) * 100 : 0
      },
      user: {
        delta: before.user - after.user,
        percent: before.user !== 0 ? ((before.user - after.user) / before.user) * 100 : 0
      },
      system: {
        delta: before.system - after.system,
        percent: before.system !== 0 ? ((before.system - after.system) / before.system) * 100 : 0
      }
    };
  }

  /**
   * Start system metrics sampling
   */
  startSystemMetricsSampling() {
    if (this.samplingTimer) {
      return;
    }

    this.samplingTimer = setInterval(() => {
      const metrics = {
        timestamp: Date.now(),
        memory: this.getMemoryUsage(),
        cpu: this.getCpuUsage(),
        activeOperations: this.activeOperations.size
      };

      this.systemMetrics.push(metrics);
      
      // Limit system metrics to prevent memory issues
      if (this.systemMetrics.length > this.options.maxSamples) {
        this.systemMetrics.shift();
      }

      this.emit('systemMetrics', metrics);
    }, this.options.samplingInterval);
  }

  /**
   * Stop system metrics sampling
   */
  stopSystemMetricsSampling() {
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer);
      this.samplingTimer = null;
    }
  }

  /**
   * Get performance statistics
   */
  getStatistics() {
    const completedMeasurements = Array.from(this.measurements.values());
    
    if (completedMeasurements.length === 0) {
      return {
        totalMeasurements: 0,
        activeOperations: this.activeOperations.size,
        systemMetrics: this.systemMetrics.length,
        gcEvents: this.gcMetrics.length
      };
    }

    const durations = completedMeasurements.map(m => m.duration);
    const memoryUsages = completedMeasurements.map(m => m.memoryDelta.heapUsed);

    return {
      totalMeasurements: completedMeasurements.length,
      activeOperations: this.activeOperations.size,
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        average: durations.reduce((a, b) => a + b, 0) / durations.length,
        total: durations.reduce((a, b) => a + b, 0)
      },
      memory: {
        min: Math.min(...memoryUsages),
        max: Math.max(...memoryUsages),
        average: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
      },
      systemMetrics: this.systemMetrics.length,
      gcEvents: this.gcMetrics.length,
      lastUpdated: Date.now()
    };
  }

  /**
   * Get measurement by ID
   */
  getMeasurement(operationId) {
    return this.measurements.get(operationId) || this.activeOperations.get(operationId);
  }

  /**
   * Get all measurements
   */
  getAllMeasurements() {
    return {
      completed: Array.from(this.measurements.values()),
      active: Array.from(this.activeOperations.values())
    };
  }

  /**
   * Clear all measurements and reset
   */
  reset() {
    this.measurements.clear();
    this.activeOperations.clear();
    this.systemMetrics.length = 0;
    this.gcMetrics.length = 0;
    this.emit('reset');
  }

  /**
   * Cleanup and stop all tracking
   */
  cleanup() {
    this.stopSystemMetricsSampling();
    this.removeAllListeners();
    this.reset();
  }
}