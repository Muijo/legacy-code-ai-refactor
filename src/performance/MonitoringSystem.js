/**
 * Real-time Monitoring System
 * Provides real-time monitoring for refactoring operations,
 * tracks system health, and generates alerts for issues.
 */

import { EventEmitter } from 'events';
import { PerformanceMeasurement } from './PerformanceMeasurement.js';
import fs from 'fs/promises';
import { join } from 'path';

export class MonitoringSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Monitoring intervals
      healthCheckInterval: 5000,     // 5 seconds
      metricsCollectionInterval: 1000, // 1 second
      alertCheckInterval: 2000,      // 2 seconds
      
      // Thresholds for alerts
      thresholds: {
        memory: {
          warning: 512 * 1024 * 1024,   // 512MB
          critical: 1024 * 1024 * 1024  // 1GB
        },
        cpu: {
          warning: 70,  // 70% CPU usage
          critical: 90  // 90% CPU usage
        },
        duration: {
          warning: 30000,  // 30 seconds
          critical: 60000  // 60 seconds
        },
        errorRate: {
          warning: 0.05,  // 5% error rate
          critical: 0.15  // 15% error rate
        },
        throughput: {
          warning: 1,   // 1 file per second minimum
          critical: 0.5 // 0.5 files per second minimum
        }
      },
      
      // Alert settings
      alertCooldown: 60000, // 1 minute cooldown between same alerts
      maxAlerts: 100,       // Maximum alerts to keep in memory
      enableFileLogging: true,
      logDirectory: './logs',
      
      // Monitoring features
      enableResourceTracking: true,
      enableOperationTracking: true,
      enableErrorTracking: true,
      enablePerformanceTracking: true,
      
      ...options
    };

    this.performanceMeasurement = new PerformanceMeasurement();
    this.isMonitoring = false;
    this.intervals = {};
    
    // Monitoring data
    this.systemHealth = {
      status: 'unknown',
      lastCheck: null,
      uptime: 0,
      startTime: Date.now()
    };
    
    this.metrics = {
      operations: new Map(),
      errors: [],
      alerts: [],
      performance: [],
      resources: []
    };
    
    this.alertHistory = new Map(); // Track alert cooldowns
    this.activeOperations = new Map();
    
    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring system
   */
  initializeMonitoring() {
    // Set up performance measurement event handlers
    this.performanceMeasurement.on('measurementStarted', (data) => {
      this.handleOperationStarted(data);
    });

    this.performanceMeasurement.on('measurementCompleted', (data) => {
      this.handleOperationCompleted(data);
    });

    this.performanceMeasurement.on('systemMetrics', (metrics) => {
      this.handleSystemMetrics(metrics);
    });

    // Set up error handling
    process.on('uncaughtException', (error) => {
      this.handleError('uncaughtException', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.handleError('unhandledRejection', { reason, promise });
    });
  }

  /**
   * Start monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    console.log('Starting monitoring system...');
    this.isMonitoring = true;
    this.systemHealth.startTime = Date.now();

    // Create log directory if needed
    if (this.options.enableFileLogging) {
      try {
        await fs.mkdir(this.options.logDirectory, { recursive: true });
      } catch (error) {
        console.warn('Failed to create log directory:', error.message);
      }
    }

    // Start monitoring intervals
    this.intervals.healthCheck = setInterval(() => {
      this.performHealthCheck();
    }, this.options.healthCheckInterval);

    this.intervals.metricsCollection = setInterval(() => {
      this.collectMetrics();
    }, this.options.metricsCollectionInterval);

    this.intervals.alertCheck = setInterval(() => {
      this.checkAlerts();
    }, this.options.alertCheckInterval);

    // Start performance measurement system
    this.performanceMeasurement.startSystemMetricsSampling();

    this.emit('monitoringStarted');
    console.log('Monitoring system started successfully');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('Stopping monitoring system...');
    this.isMonitoring = false;

    // Clear intervals
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    this.intervals = {};

    // Stop performance measurement
    this.performanceMeasurement.stopSystemMetricsSampling();

    this.emit('monitoringStopped');
    console.log('Monitoring system stopped');
  }

  /**
   * Perform system health check
   */
  performHealthCheck() {
    const now = Date.now();
    const uptime = now - this.systemHealth.startTime;
    
    const health = {
      status: 'healthy',
      timestamp: now,
      uptime,
      activeOperations: this.activeOperations.size,
      totalOperations: this.metrics.operations.size,
      errorCount: this.metrics.errors.length,
      alertCount: this.metrics.alerts.length,
      memoryUsage: this.performanceMeasurement.getMemoryUsage(),
      cpuUsage: this.performanceMeasurement.getCpuUsage()
    };

    // Determine health status
    const memoryUsage = health.memoryUsage.heapUsed;
    const cpuPercentage = this.calculateCpuPercentage(health.cpuUsage);
    const recentErrors = this.metrics.errors.filter(e => now - e.timestamp < 300000); // Last 5 minutes

    if (memoryUsage > this.options.thresholds.memory.critical ||
        cpuPercentage > this.options.thresholds.cpu.critical ||
        recentErrors.length > 10) {
      health.status = 'critical';
    } else if (memoryUsage > this.options.thresholds.memory.warning ||
               cpuPercentage > this.options.thresholds.cpu.warning ||
               recentErrors.length > 5) {
      health.status = 'warning';
    }

    this.systemHealth = health;
    this.emit('healthCheck', health);

    // Log health status if it changed
    if (health.status !== 'healthy') {
      this.logEvent('health', `System health: ${health.status}`, health);
    }
  }

  /**
   * Collect system metrics
   */
  collectMetrics() {
    const metrics = {
      timestamp: Date.now(),
      memory: this.performanceMeasurement.getMemoryUsage(),
      cpu: this.performanceMeasurement.getCpuUsage(),
      activeOperations: this.activeOperations.size,
      completedOperations: this.metrics.operations.size,
      errorRate: this.calculateErrorRate(),
      throughput: this.calculateThroughput()
    };

    this.metrics.resources.push(metrics);

    // Limit metrics history
    if (this.metrics.resources.length > 1000) {
      this.metrics.resources.shift();
    }

    this.emit('metricsCollected', metrics);
  }

  /**
   * Check for alert conditions
   */
  checkAlerts() {
    const now = Date.now();
    const currentMetrics = this.metrics.resources[this.metrics.resources.length - 1];
    
    if (!currentMetrics) return;

    // Check memory alerts
    this.checkMemoryAlerts(currentMetrics);
    
    // Check CPU alerts
    this.checkCpuAlerts(currentMetrics);
    
    // Check error rate alerts
    this.checkErrorRateAlerts(currentMetrics);
    
    // Check throughput alerts
    this.checkThroughputAlerts(currentMetrics);
    
    // Check long-running operations
    this.checkLongRunningOperations();
  }

  /**
   * Check memory usage alerts
   */
  checkMemoryAlerts(metrics) {
    const memoryUsage = metrics.memory.heapUsed;
    const thresholds = this.options.thresholds.memory;

    if (memoryUsage > thresholds.critical) {
      this.createAlert('memory', 'critical', 
        `Critical memory usage: ${this.formatBytes(memoryUsage)}`, 
        { memoryUsage, threshold: thresholds.critical });
    } else if (memoryUsage > thresholds.warning) {
      this.createAlert('memory', 'warning', 
        `High memory usage: ${this.formatBytes(memoryUsage)}`, 
        { memoryUsage, threshold: thresholds.warning });
    }
  }

  /**
   * Check CPU usage alerts
   */
  checkCpuAlerts(metrics) {
    const cpuPercentage = this.calculateCpuPercentage(metrics.cpu);
    const thresholds = this.options.thresholds.cpu;

    if (cpuPercentage > thresholds.critical) {
      this.createAlert('cpu', 'critical', 
        `Critical CPU usage: ${cpuPercentage.toFixed(1)}%`, 
        { cpuUsage: cpuPercentage, threshold: thresholds.critical });
    } else if (cpuPercentage > thresholds.warning) {
      this.createAlert('cpu', 'warning', 
        `High CPU usage: ${cpuPercentage.toFixed(1)}%`, 
        { cpuUsage: cpuPercentage, threshold: thresholds.warning });
    }
  }

  /**
   * Check error rate alerts
   */
  checkErrorRateAlerts(metrics) {
    const errorRate = metrics.errorRate;
    const thresholds = this.options.thresholds.errorRate;

    if (errorRate > thresholds.critical) {
      this.createAlert('errorRate', 'critical', 
        `Critical error rate: ${(errorRate * 100).toFixed(1)}%`, 
        { errorRate, threshold: thresholds.critical });
    } else if (errorRate > thresholds.warning) {
      this.createAlert('errorRate', 'warning', 
        `High error rate: ${(errorRate * 100).toFixed(1)}%`, 
        { errorRate, threshold: thresholds.warning });
    }
  }

  /**
   * Check throughput alerts
   */
  checkThroughputAlerts(metrics) {
    const throughput = metrics.throughput;
    const thresholds = this.options.thresholds.throughput;

    if (throughput < thresholds.critical) {
      this.createAlert('throughput', 'critical', 
        `Critical low throughput: ${throughput.toFixed(2)} files/sec`, 
        { throughput, threshold: thresholds.critical });
    } else if (throughput < thresholds.warning) {
      this.createAlert('throughput', 'warning', 
        `Low throughput: ${throughput.toFixed(2)} files/sec`, 
        { throughput, threshold: thresholds.warning });
    }
  }

  /**
   * Check for long-running operations
   */
  checkLongRunningOperations() {
    const now = Date.now();
    const thresholds = this.options.thresholds.duration;

    for (const [operationId, operation] of this.activeOperations) {
      const duration = now - operation.startTime;

      if (duration > thresholds.critical) {
        this.createAlert('longRunning', 'critical', 
          `Operation ${operationId} running for ${Math.round(duration / 1000)}s`, 
          { operationId, duration, threshold: thresholds.critical });
      } else if (duration > thresholds.warning) {
        this.createAlert('longRunning', 'warning', 
          `Operation ${operationId} running for ${Math.round(duration / 1000)}s`, 
          { operationId, duration, threshold: thresholds.warning });
      }
    }
  }

  /**
   * Create an alert
   */
  createAlert(type, severity, message, data = {}) {
    const alertKey = `${type}_${severity}`;
    const now = Date.now();

    // Check cooldown
    const lastAlert = this.alertHistory.get(alertKey);
    if (lastAlert && (now - lastAlert) < this.options.alertCooldown) {
      return; // Skip alert due to cooldown
    }

    const alert = {
      id: `alert_${now}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      timestamp: now,
      data,
      acknowledged: false
    };

    this.metrics.alerts.push(alert);
    this.alertHistory.set(alertKey, now);

    // Limit alert history
    if (this.metrics.alerts.length > this.options.maxAlerts) {
      this.metrics.alerts.shift();
    }

    this.emit('alert', alert);
    this.logEvent('alert', message, alert);

    console.log(`[${severity.toUpperCase()}] ${message}`);
  }

  /**
   * Handle operation started
   */
  handleOperationStarted(data) {
    this.activeOperations.set(data.operationId, {
      id: data.operationId,
      startTime: Date.now(),
      metadata: data.metadata
    });

    this.emit('operationStarted', data);
  }

  /**
   * Handle operation completed
   */
  handleOperationCompleted(data) {
    const operation = this.activeOperations.get(data.operationId);
    if (operation) {
      this.activeOperations.delete(data.operationId);
      
      const completedOperation = {
        ...operation,
        endTime: Date.now(),
        duration: data.measurement.duration,
        result: data.measurement.result,
        success: !data.measurement.result?.error
      };

      this.metrics.operations.set(data.operationId, completedOperation);
    }

    this.emit('operationCompleted', data);
  }

  /**
   * Handle system metrics
   */
  handleSystemMetrics(metrics) {
    // Store performance metrics
    this.metrics.performance.push({
      timestamp: metrics.timestamp,
      memory: metrics.memory,
      cpu: metrics.cpu,
      activeOperations: metrics.activeOperations
    });

    // Limit performance history
    if (this.metrics.performance.length > 1000) {
      this.metrics.performance.shift();
    }
  }

  /**
   * Handle errors
   */
  handleError(type, error) {
    const errorRecord = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message: error.message || String(error),
      stack: error.stack,
      timestamp: Date.now()
    };

    this.metrics.errors.push(errorRecord);

    // Limit error history
    if (this.metrics.errors.length > 1000) {
      this.metrics.errors.shift();
    }

    this.emit('error', errorRecord);
    this.logEvent('error', errorRecord.message, errorRecord);

    // Create alert for errors
    this.createAlert('error', 'warning', `Error occurred: ${errorRecord.message}`, errorRecord);
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate() {
    const now = Date.now();
    const recentWindow = 300000; // 5 minutes
    
    const recentOperations = Array.from(this.metrics.operations.values())
      .filter(op => now - op.endTime < recentWindow);
    
    if (recentOperations.length === 0) return 0;
    
    const failedOperations = recentOperations.filter(op => !op.success);
    return failedOperations.length / recentOperations.length;
  }

  /**
   * Calculate throughput
   */
  calculateThroughput() {
    const now = Date.now();
    const recentWindow = 60000; // 1 minute
    
    const recentOperations = Array.from(this.metrics.operations.values())
      .filter(op => now - op.endTime < recentWindow);
    
    return recentOperations.length / (recentWindow / 1000); // operations per second
  }

  /**
   * Calculate CPU percentage
   */
  calculateCpuPercentage(cpuData) {
    if (!cpuData || !cpuData.total) return 0;
    
    // Simplified CPU percentage calculation
    return Math.min(100, (cpuData.total / 1000000) * 100);
  }

  /**
   * Log event to file
   */
  async logEvent(type, message, data = {}) {
    if (!this.options.enableFileLogging) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    };

    try {
      const logFile = join(this.options.logDirectory, `monitoring_${new Date().toISOString().split('T')[0]}.log`);
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.warn('Failed to write log entry:', error.message);
    }
  }

  /**
   * Get current system status
   */
  getSystemStatus() {
    return {
      health: this.systemHealth,
      isMonitoring: this.isMonitoring,
      activeOperations: this.activeOperations.size,
      totalOperations: this.metrics.operations.size,
      errorCount: this.metrics.errors.length,
      alertCount: this.metrics.alerts.length,
      uptime: Date.now() - this.systemHealth.startTime
    };
  }

  /**
   * Get monitoring metrics
   */
  getMetrics(timeRange = 3600000) { // Default 1 hour
    const now = Date.now();
    const cutoff = now - timeRange;

    return {
      resources: this.metrics.resources.filter(m => m.timestamp > cutoff),
      performance: this.metrics.performance.filter(m => m.timestamp > cutoff),
      errors: this.metrics.errors.filter(e => e.timestamp > cutoff),
      alerts: this.metrics.alerts.filter(a => a.timestamp > cutoff),
      operations: Array.from(this.metrics.operations.values())
        .filter(op => op.endTime > cutoff)
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.metrics.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.metrics.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      this.emit('alertAcknowledged', alert);
    }
  }

  /**
   * Get resource usage summary
   */
  getResourceUsageSummary(timeRange = 3600000) {
    const metrics = this.getMetrics(timeRange);
    
    if (metrics.resources.length === 0) {
      return null;
    }

    const memoryUsages = metrics.resources.map(m => m.memory.heapUsed);
    const cpuUsages = metrics.resources.map(m => this.calculateCpuPercentage(m.cpu));

    return {
      memory: {
        current: memoryUsages[memoryUsages.length - 1],
        average: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        peak: Math.max(...memoryUsages),
        min: Math.min(...memoryUsages)
      },
      cpu: {
        current: cpuUsages[cpuUsages.length - 1],
        average: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length,
        peak: Math.max(...cpuUsages),
        min: Math.min(...cpuUsages)
      },
      timeRange,
      sampleCount: metrics.resources.length
    };
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Cleanup monitoring system
   */
  async cleanup() {
    this.stopMonitoring();
    this.performanceMeasurement.cleanup();
    this.removeAllListeners();
    
    // Clear data
    this.metrics.operations.clear();
    this.metrics.errors.length = 0;
    this.metrics.alerts.length = 0;
    this.metrics.performance.length = 0;
    this.metrics.resources.length = 0;
    this.activeOperations.clear();
    this.alertHistory.clear();
  }
}