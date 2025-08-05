/**
 * Tests for Performance Measurement System
 */

import { PerformanceMeasurement } from '../src/performance/PerformanceMeasurement.js';
import { ScalabilityTester } from '../src/performance/ScalabilityTester.js';
import { PerformanceOptimizer } from '../src/performance/PerformanceOptimizer.js';

describe('Performance Measurement System', () => {
  let performanceMeasurement;
  let scalabilityTester;
  let performanceOptimizer;

  beforeEach(() => {
    performanceMeasurement = new PerformanceMeasurement({
      samplingInterval: 100, // Faster sampling for tests
      maxSamples: 10
    });
    
    scalabilityTester = new ScalabilityTester({
      testDurations: [100, 500], // Shorter durations for tests
      fileSizes: [100, 500],
      batchSizes: [5, 10]
    });
    
    performanceOptimizer = new PerformanceOptimizer();
  });

  afterEach(async () => {
    await performanceMeasurement.cleanup();
    await scalabilityTester.cleanup();
    performanceOptimizer.cleanup();
  });

  describe('PerformanceMeasurement', () => {
    test('should start and end measurements correctly', async () => {
      const operationId = 'test_operation';
      const metadata = { type: 'test', description: 'Test operation' };

      // Start measurement
      const measurement = performanceMeasurement.startMeasurement(operationId, metadata);
      
      expect(measurement).toBeDefined();
      expect(measurement.id).toBe(operationId);
      expect(measurement.metadata).toEqual(metadata);
      expect(measurement.startTime).toBeDefined();
      expect(measurement.completed).toBe(false);

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 50));

      // End measurement
      const result = { success: true, processed: 10 };
      const completedMeasurement = performanceMeasurement.endMeasurement(operationId, result);

      expect(completedMeasurement.completed).toBe(true);
      expect(completedMeasurement.duration).toBeGreaterThan(0);
      expect(completedMeasurement.result).toEqual(result);
      expect(completedMeasurement.memoryDelta).toBeDefined();
      expect(completedMeasurement.cpuDelta).toBeDefined();
    });

    test('should track memory usage correctly', () => {
      const memoryUsage = performanceMeasurement.getMemoryUsage();
      
      expect(memoryUsage).toBeDefined();
      expect(memoryUsage.rss).toBeGreaterThan(0);
      expect(memoryUsage.heapTotal).toBeGreaterThan(0);
      expect(memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(memoryUsage.system).toBeDefined();
      expect(memoryUsage.system.total).toBeGreaterThan(0);
    });

    test('should track CPU usage correctly', () => {
      const cpuUsage = performanceMeasurement.getCpuUsage();
      
      expect(cpuUsage).toBeDefined();
      expect(cpuUsage.user).toBeGreaterThanOrEqual(0);
      expect(cpuUsage.system).toBeGreaterThanOrEqual(0);
      expect(cpuUsage.total).toBeGreaterThanOrEqual(0);
      expect(cpuUsage.cores).toBeGreaterThan(0);
      expect(Array.isArray(cpuUsage.loadAverage)).toBe(true);
    });

    test('should compare performance between measurements', async () => {
      // First measurement
      const beforeId = 'before_optimization';
      performanceMeasurement.startMeasurement(beforeId);
      await new Promise(resolve => setTimeout(resolve, 100));
      performanceMeasurement.endMeasurement(beforeId, { processed: 5 });

      // Second measurement (simulating optimization)
      const afterId = 'after_optimization';
      performanceMeasurement.startMeasurement(afterId);
      await new Promise(resolve => setTimeout(resolve, 50));
      performanceMeasurement.endMeasurement(afterId, { processed: 5 });

      // Compare measurements
      const comparison = performanceMeasurement.comparePerformance(beforeId, afterId);
      
      expect(comparison).toBeDefined();
      expect(comparison.operationIds.before).toBe(beforeId);
      expect(comparison.operationIds.after).toBe(afterId);
      expect(comparison.duration).toBeDefined();
      expect(comparison.memory).toBeDefined();
      expect(comparison.cpu).toBeDefined();
      expect(comparison.duration.improvement).toBeGreaterThan(0); // Should be faster
    });

    test('should add samples during measurement', async () => {
      const operationId = 'sampling_test';
      performanceMeasurement.startMeasurement(operationId);

      // Add samples
      performanceMeasurement.addSample(operationId, { customData: 'sample1' });
      await new Promise(resolve => setTimeout(resolve, 10));
      performanceMeasurement.addSample(operationId, { customData: 'sample2' });

      const measurement = performanceMeasurement.endMeasurement(operationId);
      
      expect(measurement.samples).toBeDefined();
      expect(measurement.samples.length).toBe(2);
      expect(measurement.samples[0].customData).toBe('sample1');
      expect(measurement.samples[1].customData).toBe('sample2');
    });

    test('should generate statistics correctly', async () => {
      // Create multiple measurements
      for (let i = 0; i < 3; i++) {
        const id = `test_${i}`;
        performanceMeasurement.startMeasurement(id);
        await new Promise(resolve => setTimeout(resolve, 10 + i * 10));
        performanceMeasurement.endMeasurement(id, { processed: i + 1 });
      }

      const stats = performanceMeasurement.getStatistics();
      
      expect(stats.totalMeasurements).toBe(3);
      expect(stats.duration).toBeDefined();
      expect(stats.duration.min).toBeGreaterThan(0);
      expect(stats.duration.max).toBeGreaterThan(stats.duration.min);
      expect(stats.duration.average).toBeGreaterThan(0);
      expect(stats.memory).toBeDefined();
    });

    test('should emit events correctly', (done) => {
      const operationId = 'event_test';
      let eventsReceived = 0;

      performanceMeasurement.on('measurementStarted', (data) => {
        expect(data.operationId).toBe(operationId);
        eventsReceived++;
      });

      performanceMeasurement.on('measurementCompleted', (data) => {
        expect(data.operationId).toBe(operationId);
        expect(data.measurement).toBeDefined();
        eventsReceived++;
        
        if (eventsReceived === 2) {
          done();
        }
      });

      performanceMeasurement.startMeasurement(operationId);
      setTimeout(() => {
        performanceMeasurement.endMeasurement(operationId);
      }, 10);
    });
  });

  describe('PerformanceOptimizer', () => {
    test('should analyze memory usage correctly', () => {
      const performanceData = {
        memory: {
          heapUsed: 600 * 1024 * 1024, // 600MB - above medium threshold
          rss: 700 * 1024 * 1024
        },
        memoryDelta: {
          heapUsed: 50 * 1024 * 1024 // 50MB increase
        },
        duration: 2000,
        cpu: { total: 500000, user: 300000, system: 200000 }
      };

      const analysis = performanceOptimizer.analyzePerformance(performanceData);
      
      expect(analysis).toBeDefined();
      expect(analysis.issues.length).toBeGreaterThan(0);
      expect(analysis.suggestions.length).toBeGreaterThan(0);
      
      const memoryIssues = analysis.issues.filter(i => i.type === 'memory');
      expect(memoryIssues.length).toBeGreaterThan(0);
      expect(memoryIssues[0].severity).toBe('medium');
    });

    test('should generate optimization strategies', () => {
      const performanceData = {
        memory: {
          heapUsed: 1200 * 1024 * 1024 // 1.2GB - above high threshold
        },
        duration: 15000, // 15 seconds - slow
        cpu: { total: 800000 },
        result: { filesProcessed: 10 }
      };

      const analysis = performanceOptimizer.analyzePerformance(performanceData);
      
      expect(analysis.optimizations.length).toBeGreaterThan(0);
      
      const memoryOptimization = analysis.optimizations.find(o => o.type === 'memory_optimization');
      expect(memoryOptimization).toBeDefined();
      expect(memoryOptimization.priority).toBe('high');
      
      const durationOptimization = analysis.optimizations.find(o => o.type === 'duration_optimization');
      expect(durationOptimization).toBeDefined();
    });

    test('should calculate performance score correctly', () => {
      // Good performance data
      const goodData = {
        memory: { heapUsed: 50 * 1024 * 1024 }, // 50MB - low
        duration: 500, // 0.5 seconds - fast
        cpu: { total: 100000 } // Low CPU
      };

      const goodAnalysis = performanceOptimizer.analyzePerformance(goodData);
      expect(goodAnalysis.score).toBeGreaterThan(80);

      // Poor performance data
      const poorData = {
        memory: { heapUsed: 1500 * 1024 * 1024 }, // 1.5GB - high
        duration: 20000, // 20 seconds - very slow
        cpu: { total: 900000 } // High CPU
      };

      const poorAnalysis = performanceOptimizer.analyzePerformance(poorData);
      expect(poorAnalysis.score).toBeLessThan(50);
    });

    test('should set and compare with baseline', () => {
      const baselineData = {
        duration: 1000,
        memory: { heapUsed: 100 * 1024 * 1024 }
      };

      performanceOptimizer.setBaseline(baselineData);

      const currentData = {
        duration: 800, // 20% improvement
        memory: { heapUsed: 80 * 1024 * 1024 } // 20% less memory
      };

      const comparison = performanceOptimizer.compareWithBaseline(currentData);
      
      expect(comparison).toBeDefined();
      expect(comparison.duration.improvement).toBe(200);
      expect(comparison.duration.improvementPercent).toBe(20);
      expect(comparison.memory.improvement).toBeGreaterThan(0);
    });

    test('should format bytes correctly', () => {
      expect(performanceOptimizer.formatBytes(0)).toBe('0 Bytes');
      expect(performanceOptimizer.formatBytes(1024)).toBe('1 KB');
      expect(performanceOptimizer.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(performanceOptimizer.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('Integration Tests', () => {
    test('should integrate performance measurement with optimization', async () => {
      // Start measurement
      const operationId = 'integration_test';
      performanceMeasurement.startMeasurement(operationId, { type: 'integration' });

      // Simulate work with high memory usage
      const largeArray = new Array(100000).fill('test data');
      await new Promise(resolve => setTimeout(resolve, 100));

      // End measurement
      const measurement = performanceMeasurement.endMeasurement(operationId, {
        processed: largeArray.length,
        success: true
      });

      // Analyze performance
      const analysis = performanceOptimizer.analyzePerformance(measurement);
      
      expect(analysis).toBeDefined();
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(100);

      // Should have some suggestions if performance is not optimal
      if (analysis.score < 90) {
        expect(analysis.suggestions.length).toBeGreaterThan(0);
        expect(analysis.optimizations.length).toBeGreaterThan(0);
      }
    });

    test('should handle performance comparison workflow', async () => {
      // Baseline measurement
      const baselineId = 'baseline';
      performanceMeasurement.startMeasurement(baselineId);
      await new Promise(resolve => setTimeout(resolve, 100));
      const baselineMeasurement = performanceMeasurement.endMeasurement(baselineId);

      // Set baseline in optimizer
      performanceOptimizer.setBaseline(baselineMeasurement);

      // Optimized measurement
      const optimizedId = 'optimized';
      performanceMeasurement.startMeasurement(optimizedId);
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate optimization
      const optimizedMeasurement = performanceMeasurement.endMeasurement(optimizedId);

      // Compare measurements
      const performanceComparison = performanceMeasurement.comparePerformance(baselineId, optimizedId);
      const baselineComparison = performanceOptimizer.compareWithBaseline(optimizedMeasurement);

      expect(performanceComparison).toBeDefined();
      expect(baselineComparison).toBeDefined();
      expect(performanceComparison.duration.improvement).toBeGreaterThan(0);
    });
  });
});