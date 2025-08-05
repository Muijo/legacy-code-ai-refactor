/**
 * Scalability Testing System
 * Tests system performance with varying loads and codebase sizes
 * to ensure the system can handle large-scale refactoring operations.
 */

import { PerformanceMeasurement } from './PerformanceMeasurement.js';
import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ScalabilityTester extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxConcurrency: 8,
      testDurations: [1000, 5000, 10000, 30000], // Test durations in ms
      fileSizes: [1000, 5000, 10000, 50000], // Lines of code
      batchSizes: [10, 50, 100, 500],
      memoryThresholds: {
        warning: 1024 * 1024 * 1024, // 1GB
        critical: 2048 * 1024 * 1024  // 2GB
      },
      cpuThresholds: {
        warning: 80, // 80% CPU usage
        critical: 95  // 95% CPU usage
      },
      ...options
    };

    this.performanceMeasurement = new PerformanceMeasurement();
    this.testResults = [];
    this.activeTests = new Map();
    this.workerPool = [];
  }

  /**
   * Run comprehensive scalability tests
   */
  async runScalabilityTests(analyzer, testConfig = {}) {
    const config = {
      testTypes: ['concurrency', 'fileSize', 'batchSize', 'duration'],
      generateTestData: true,
      ...testConfig
    };

    console.log('Starting scalability tests...');
    this.emit('testsStarted', { config });

    const results = {
      testId: `scalability_${Date.now()}`,
      startTime: Date.now(),
      config,
      results: {},
      summary: {}
    };

    try {
      // Test concurrency scaling
      if (config.testTypes.includes('concurrency')) {
        console.log('Testing concurrency scaling...');
        results.results.concurrency = await this.testConcurrencyScaling(analyzer);
      }

      // Test file size scaling
      if (config.testTypes.includes('fileSize')) {
        console.log('Testing file size scaling...');
        results.results.fileSize = await this.testFileSizeScaling(analyzer);
      }

      // Test batch size scaling
      if (config.testTypes.includes('batchSize')) {
        console.log('Testing batch size scaling...');
        results.results.batchSize = await this.testBatchSizeScaling(analyzer);
      }

      // Test duration scaling
      if (config.testTypes.includes('duration')) {
        console.log('Testing duration scaling...');
        results.results.duration = await this.testDurationScaling(analyzer);
      }

      // Generate summary
      results.summary = this.generateTestSummary(results.results);
      results.endTime = Date.now();
      results.totalDuration = results.endTime - results.startTime;

      this.testResults.push(results);
      this.emit('testsCompleted', results);

      return results;

    } catch (error) {
      results.error = error.message;
      results.endTime = Date.now();
      this.emit('testsError', { error, results });
      throw error;
    }
  }

  /**
   * Test how the system scales with increasing concurrency
   */
  async testConcurrencyScaling(analyzer) {
    const concurrencyLevels = [1, 2, 4, 8, 16];
    const results = [];

    for (const concurrency of concurrencyLevels) {
      console.log(`Testing concurrency level: ${concurrency}`);
      
      const testId = `concurrency_${concurrency}_${Date.now()}`;
      this.performanceMeasurement.startMeasurement(testId, {
        type: 'concurrency',
        level: concurrency
      });

      try {
        const testFiles = await this.generateTestFiles(50, 1000); // 50 files, 1000 lines each
        const startTime = Date.now();
        
        // Process files with specified concurrency
        const batches = this.createBatches(testFiles, Math.ceil(testFiles.length / concurrency));
        const promises = batches.map(batch => this.processBatch(analyzer, batch));
        
        await Promise.all(promises);
        
        const measurement = this.performanceMeasurement.endMeasurement(testId, {
          filesProcessed: testFiles.length,
          concurrency,
          success: true
        });

        results.push({
          concurrency,
          duration: measurement.duration,
          memoryUsage: measurement.memoryDelta,
          cpuUsage: measurement.cpuDelta,
          throughput: testFiles.length / (measurement.duration / 1000), // files per second
          efficiency: this.calculateEfficiency(measurement, concurrency)
        });

        // Cleanup test files
        await this.cleanupTestFiles(testFiles);

      } catch (error) {
        this.performanceMeasurement.endMeasurement(testId, {
          error: error.message,
          success: false
        });
        
        results.push({
          concurrency,
          error: error.message,
          success: false
        });
      }
    }

    return {
      type: 'concurrency',
      results,
      analysis: this.analyzeConcurrencyResults(results)
    };
  }

  /**
   * Test how the system scales with increasing file sizes
   */
  async testFileSizeScaling(analyzer) {
    const results = [];

    for (const fileSize of this.options.fileSizes) {
      console.log(`Testing file size: ${fileSize} lines`);
      
      const testId = `filesize_${fileSize}_${Date.now()}`;
      this.performanceMeasurement.startMeasurement(testId, {
        type: 'fileSize',
        size: fileSize
      });

      try {
        const testFiles = await this.generateTestFiles(10, fileSize); // 10 files of specified size
        
        let totalProcessed = 0;
        for (const filePath of testFiles) {
          await analyzer.analyzeFile(filePath);
          totalProcessed++;
        }

        const measurement = this.performanceMeasurement.endMeasurement(testId, {
          filesProcessed: totalProcessed,
          fileSize,
          success: true
        });

        results.push({
          fileSize,
          duration: measurement.duration,
          memoryUsage: measurement.memoryDelta,
          cpuUsage: measurement.cpuDelta,
          throughput: fileSize * totalProcessed / (measurement.duration / 1000), // lines per second
          memoryPerLine: measurement.memoryDelta.heapUsed / (fileSize * totalProcessed)
        });

        // Cleanup test files
        await this.cleanupTestFiles(testFiles);

      } catch (error) {
        this.performanceMeasurement.endMeasurement(testId, {
          error: error.message,
          success: false
        });
        
        results.push({
          fileSize,
          error: error.message,
          success: false
        });
      }
    }

    return {
      type: 'fileSize',
      results,
      analysis: this.analyzeFileSizeResults(results)
    };
  }

  /**
   * Test how the system scales with different batch sizes
   */
  async testBatchSizeScaling(analyzer) {
    const results = [];

    for (const batchSize of this.options.batchSizes) {
      console.log(`Testing batch size: ${batchSize}`);
      
      const testId = `batchsize_${batchSize}_${Date.now()}`;
      this.performanceMeasurement.startMeasurement(testId, {
        type: 'batchSize',
        size: batchSize
      });

      try {
        const testFiles = await this.generateTestFiles(200, 1000); // 200 files, 1000 lines each
        
        let totalProcessed = 0;
        const batches = this.createBatches(testFiles, batchSize);
        
        for (const batch of batches) {
          await this.processBatch(analyzer, batch);
          totalProcessed += batch.length;
        }

        const measurement = this.performanceMeasurement.endMeasurement(testId, {
          filesProcessed: totalProcessed,
          batchSize,
          batchCount: batches.length,
          success: true
        });

        results.push({
          batchSize,
          batchCount: batches.length,
          duration: measurement.duration,
          memoryUsage: measurement.memoryDelta,
          cpuUsage: measurement.cpuDelta,
          throughput: totalProcessed / (measurement.duration / 1000),
          avgBatchTime: measurement.duration / batches.length
        });

        // Cleanup test files
        await this.cleanupTestFiles(testFiles);

      } catch (error) {
        this.performanceMeasurement.endMeasurement(testId, {
          error: error.message,
          success: false
        });
        
        results.push({
          batchSize,
          error: error.message,
          success: false
        });
      }
    }

    return {
      type: 'batchSize',
      results,
      analysis: this.analyzeBatchSizeResults(results)
    };
  }

  /**
   * Test system performance over extended durations
   */
  async testDurationScaling(analyzer) {
    const results = [];

    for (const duration of this.options.testDurations) {
      console.log(`Testing duration: ${duration}ms`);
      
      const testId = `duration_${duration}_${Date.now()}`;
      this.performanceMeasurement.startMeasurement(testId, {
        type: 'duration',
        targetDuration: duration
      });

      try {
        const startTime = Date.now();
        let totalProcessed = 0;
        let memoryPeaks = [];
        let cpuPeaks = [];

        // Continuously process files for the specified duration
        while (Date.now() - startTime < duration) {
          const testFiles = await this.generateTestFiles(10, 500); // Small batches
          
          for (const filePath of testFiles) {
            if (Date.now() - startTime >= duration) break;
            
            await analyzer.analyzeFile(filePath);
            totalProcessed++;
            
            // Sample performance metrics
            const currentMemory = this.performanceMeasurement.getMemoryUsage();
            const currentCpu = this.performanceMeasurement.getCpuUsage();
            
            memoryPeaks.push(currentMemory.heapUsed);
            cpuPeaks.push(currentCpu.total);
          }
          
          await this.cleanupTestFiles(testFiles);
          
          // Brief pause to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const measurement = this.performanceMeasurement.endMeasurement(testId, {
          filesProcessed: totalProcessed,
          targetDuration: duration,
          actualDuration: Date.now() - startTime,
          success: true
        });

        results.push({
          targetDuration: duration,
          actualDuration: measurement.duration,
          filesProcessed: totalProcessed,
          memoryUsage: measurement.memoryDelta,
          cpuUsage: measurement.cpuDelta,
          memoryPeak: Math.max(...memoryPeaks),
          cpuPeak: Math.max(...cpuPeaks),
          throughput: totalProcessed / (measurement.duration / 1000),
          memoryStability: this.calculateStability(memoryPeaks),
          cpuStability: this.calculateStability(cpuPeaks)
        });

      } catch (error) {
        this.performanceMeasurement.endMeasurement(testId, {
          error: error.message,
          success: false
        });
        
        results.push({
          targetDuration: duration,
          error: error.message,
          success: false
        });
      }
    }

    return {
      type: 'duration',
      results,
      analysis: this.analyzeDurationResults(results)
    };
  }

  /**
   * Generate test files for scalability testing
   */
  async generateTestFiles(count, linesPerFile) {
    const testFiles = [];
    const testDir = join(__dirname, '../../test-files/scalability');
    
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    for (let i = 0; i < count; i++) {
      const fileName = `test_${Date.now()}_${i}.js`;
      const filePath = join(testDir, fileName);
      
      const content = this.generateTestFileContent(linesPerFile);
      await fs.writeFile(filePath, content);
      
      testFiles.push(filePath);
    }

    return testFiles;
  }

  /**
   * Generate test file content with specified number of lines
   */
  generateTestFileContent(lines) {
    const functions = [];
    const linesPerFunction = Math.max(10, Math.floor(lines / 10));
    
    for (let i = 0; i < Math.ceil(lines / linesPerFunction); i++) {
      const functionLines = [];
      functionLines.push(`function testFunction${i}(param1, param2) {`);
      
      for (let j = 1; j < linesPerFunction - 1; j++) {
        if (j % 5 === 0) {
          functionLines.push(`  if (param1 > ${j}) {`);
          functionLines.push(`    return param2 * ${j};`);
          functionLines.push(`  }`);
        } else {
          functionLines.push(`  const var${j} = param1 + param2 + ${j};`);
        }
      }
      
      functionLines.push(`  return param1 + param2;`);
      functionLines.push(`}`);
      
      functions.push(functionLines.join('\n'));
    }
    
    return functions.join('\n\n');
  }

  /**
   * Create batches from array of items
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of files
   */
  async processBatch(analyzer, batch) {
    const promises = batch.map(filePath => analyzer.analyzeFile(filePath));
    return Promise.all(promises);
  }

  /**
   * Cleanup test files
   */
  async cleanupTestFiles(testFiles) {
    const promises = testFiles.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File might not exist or already deleted
      }
    });
    
    await Promise.all(promises);
  }

  /**
   * Calculate efficiency based on performance and concurrency
   */
  calculateEfficiency(measurement, concurrency) {
    const idealSpeedup = concurrency;
    const actualSpeedup = 1 / (measurement.duration / 1000); // Simplified calculation
    return (actualSpeedup / idealSpeedup) * 100;
  }

  /**
   * Calculate stability of metrics over time
   */
  calculateStability(values) {
    if (values.length === 0) return 100;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Return stability as percentage (lower standard deviation = higher stability)
    return Math.max(0, 100 - (stdDev / mean) * 100);
  }

  /**
   * Analyze concurrency test results
   */
  analyzeConcurrencyResults(results) {
    const successful = results.filter(r => r.success !== false);
    if (successful.length === 0) return { error: 'No successful tests' };

    const optimalConcurrency = successful.reduce((best, current) => 
      current.efficiency > best.efficiency ? current : best
    );

    return {
      optimalConcurrency: optimalConcurrency.concurrency,
      maxThroughput: Math.max(...successful.map(r => r.throughput)),
      scalingEfficiency: successful.map(r => ({ concurrency: r.concurrency, efficiency: r.efficiency })),
      recommendation: this.generateConcurrencyRecommendation(successful)
    };
  }

  /**
   * Analyze file size test results
   */
  analyzeFileSizeResults(results) {
    const successful = results.filter(r => r.success !== false);
    if (successful.length === 0) return { error: 'No successful tests' };

    const memoryGrowth = successful.map((r, i) => ({
      fileSize: r.fileSize,
      memoryPerLine: r.memoryPerLine,
      growthRate: i > 0 ? (r.memoryPerLine / successful[i-1].memoryPerLine - 1) * 100 : 0
    }));

    return {
      memoryGrowth,
      maxFileSize: Math.max(...successful.map(r => r.fileSize)),
      memoryEfficiency: successful.map(r => ({ fileSize: r.fileSize, memoryPerLine: r.memoryPerLine })),
      recommendation: this.generateFileSizeRecommendation(successful)
    };
  }

  /**
   * Analyze batch size test results
   */
  analyzeBatchSizeResults(results) {
    const successful = results.filter(r => r.success !== false);
    if (successful.length === 0) return { error: 'No successful tests' };

    const optimalBatch = successful.reduce((best, current) => 
      current.throughput > best.throughput ? current : best
    );

    return {
      optimalBatchSize: optimalBatch.batchSize,
      maxThroughput: Math.max(...successful.map(r => r.throughput)),
      batchEfficiency: successful.map(r => ({ batchSize: r.batchSize, throughput: r.throughput })),
      recommendation: this.generateBatchSizeRecommendation(successful)
    };
  }

  /**
   * Analyze duration test results
   */
  analyzeDurationResults(results) {
    const successful = results.filter(r => r.success !== false);
    if (successful.length === 0) return { error: 'No successful tests' };

    const stabilityTrend = successful.map(r => ({
      duration: r.targetDuration,
      memoryStability: r.memoryStability,
      cpuStability: r.cpuStability
    }));

    return {
      stabilityTrend,
      longestDuration: Math.max(...successful.map(r => r.actualDuration)),
      avgStability: successful.reduce((sum, r) => sum + (r.memoryStability + r.cpuStability) / 2, 0) / successful.length,
      recommendation: this.generateDurationRecommendation(successful)
    };
  }

  /**
   * Generate test summary
   */
  generateTestSummary(results) {
    const summary = {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      recommendations: [],
      overallScore: 0
    };

    Object.values(results).forEach(testResult => {
      if (testResult.results) {
        summary.totalTests += testResult.results.length;
        summary.successfulTests += testResult.results.filter(r => r.success !== false).length;
        summary.failedTests += testResult.results.filter(r => r.success === false).length;
        
        if (testResult.analysis && testResult.analysis.recommendation) {
          summary.recommendations.push(testResult.analysis.recommendation);
        }
      }
    });

    summary.successRate = summary.totalTests > 0 ? (summary.successfulTests / summary.totalTests) * 100 : 0;
    summary.overallScore = this.calculateOverallScore(results);

    return summary;
  }

  /**
   * Calculate overall performance score
   */
  calculateOverallScore(results) {
    let totalScore = 0;
    let testCount = 0;

    Object.values(results).forEach(testResult => {
      if (testResult.results) {
        const successful = testResult.results.filter(r => r.success !== false);
        if (successful.length > 0) {
          // Simple scoring based on throughput and efficiency
          const avgThroughput = successful.reduce((sum, r) => sum + (r.throughput || 0), 0) / successful.length;
          const score = Math.min(100, avgThroughput / 10); // Normalize to 0-100
          totalScore += score;
          testCount++;
        }
      }
    });

    return testCount > 0 ? totalScore / testCount : 0;
  }

  /**
   * Generate recommendations based on test results
   */
  generateConcurrencyRecommendation(results) {
    const optimal = results.reduce((best, current) => 
      current.efficiency > best.efficiency ? current : best
    );
    
    return `Optimal concurrency level: ${optimal.concurrency} (${optimal.efficiency.toFixed(1)}% efficiency)`;
  }

  generateFileSizeRecommendation(results) {
    const maxEfficient = results.filter(r => r.memoryPerLine < 1000).pop(); // Less than 1KB per line
    return maxEfficient 
      ? `Recommended max file size: ${maxEfficient.fileSize} lines for optimal memory usage`
      : 'Consider breaking down large files for better memory efficiency';
  }

  generateBatchSizeRecommendation(results) {
    const optimal = results.reduce((best, current) => 
      current.throughput > best.throughput ? current : best
    );
    
    return `Optimal batch size: ${optimal.batchSize} files (${optimal.throughput.toFixed(1)} files/sec)`;
  }

  generateDurationRecommendation(results) {
    const avgStability = results.reduce((sum, r) => sum + (r.memoryStability + r.cpuStability) / 2, 0) / results.length;
    
    if (avgStability > 80) {
      return 'System shows good stability for long-running operations';
    } else {
      return 'Consider implementing periodic cleanup for long-running operations';
    }
  }

  /**
   * Get test results
   */
  getTestResults() {
    return this.testResults;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.performanceMeasurement.cleanup();
    
    // Cleanup any remaining test files
    try {
      const testDir = join(__dirname, '../../test-files/scalability');
      await fs.rmdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might not exist
    }
  }
}