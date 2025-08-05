import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResultAggregator } from '../src/batch/ResultAggregator.js';
import { ReportingSystem } from '../src/batch/ReportingSystem.js';

describe('ResultAggregator', () => {
  let aggregator;
  let reportingSystem;

  beforeEach(() => {
    aggregator = new ResultAggregator({
      reportingInterval: 1000,
      enableConflictResolution: true,
      enableTrendAnalysis: true,
      conflictResolutionStrategy: 'latest_wins'
    });

    reportingSystem = new ReportingSystem({
      outputDirectory: './test-reports',
      enableHtmlReports: true,
      enableJsonReports: true,
      enableCsvReports: true
    });
  });

  afterEach(() => {
    if (aggregator) {
      aggregator.cleanup();
    }
    if (reportingSystem) {
      reportingSystem.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct default options', () => {
      expect(aggregator.options.enableConflictResolution).toBe(true);
      expect(aggregator.options.enableTrendAnalysis).toBe(true);
      expect(aggregator.options.conflictResolutionStrategy).toBe('latest_wins');
      expect(aggregator.isAggregating).toBe(false);
    });

    it('should start aggregation correctly', () => {
      aggregator.startAggregation();
      
      expect(aggregator.isAggregating).toBe(true);
      expect(aggregator.reportingTimer).toBeTruthy();
    });
  });

  describe('Batch Result Processing', () => {
    beforeEach(() => {
      aggregator.startAggregation();
    });

    it('should add and process batch results', () => {
      const batchId = 'test-batch-1';
      const results = [
        {
          taskId: 'task1',
          success: true,
          duration: 1500,
          metrics: {
            qualityImprovement: 25,
            complexityReduction: 15,
            technicalDebtReduction: 10
          },
          originalAnalysis: {
            linesOfCode: 100
          },
          validation: {
            functionalEquivalence: true,
            performanceComparison: {
              improvement: 5
            }
          }
        },
        {
          taskId: 'task2',
          success: true,
          duration: 2000,
          metrics: {
            qualityImprovement: 30,
            complexityReduction: 20,
            technicalDebtReduction: 15
          },
          originalAnalysis: {
            linesOfCode: 150
          },
          validation: {
            functionalEquivalence: true,
            performanceComparison: {
              improvement: 8
            }
          }
        }
      ];

      aggregator.addBatchResults(batchId, results);

      const batchResult = aggregator.batchResults.get(batchId);
      expect(batchResult).toBeDefined();
      expect(batchResult.processed).toBe(true);
      expect(batchResult.metrics.successfulTasks).toBe(2);
      expect(batchResult.metrics.failedTasks).toBe(0);
    });

    it('should update aggregated metrics correctly', () => {
      const batchId = 'test-batch-2';
      const results = [
        {
          taskId: 'task1',
          success: true,
          duration: 1000,
          metrics: {
            qualityImprovement: 20,
            complexityReduction: 10,
            technicalDebtReduction: 5
          },
          originalAnalysis: {
            linesOfCode: 80
          }
        }
      ];

      aggregator.addBatchResults(batchId, results);

      expect(aggregator.aggregatedMetrics.totalBatches).toBe(1);
      expect(aggregator.aggregatedMetrics.totalTasks).toBe(1);
      expect(aggregator.aggregatedMetrics.successfulTasks).toBe(1);
      expect(aggregator.aggregatedMetrics.totalLinesRefactored).toBe(80);
      expect(aggregator.aggregatedMetrics.averageQualityImprovement).toBe(20);
    });

    it('should detect and handle conflicts', () => {
      let conflictsDetected = false;
      
      aggregator.on('conflictsDetected', (event) => {
        conflictsDetected = true;
        expect(event.batchId).toBe('conflict-batch');
        expect(event.conflicts.totalConflicts).toBeGreaterThan(0);
      });

      const batchId = 'conflict-batch';
      const results = [
        {
          taskId: 'failing-task',
          success: true,
          validation: {
            functionalEquivalence: false, // This should trigger a conflict
            performanceComparison: {
              degradation: 30 // This should also trigger a conflict
            }
          },
          metrics: {
            qualityImprovement: -15 // Quality regression
          }
        }
      ];

      aggregator.addBatchResults(batchId, results);
      
      expect(conflictsDetected).toBe(true);
      expect(aggregator.conflictLog.length).toBe(1);
    });

    it('should resolve conflicts based on strategy', () => {
      const conflicts = [
        {
          taskId: 'task1',
          type: 'functional_equivalence_failure',
          severity: 'high',
          description: 'Test conflict'
        }
      ];

      const resolutions = aggregator.resolveConflicts(conflicts);
      
      expect(resolutions).toHaveLength(1);
      expect(resolutions[0].strategy).toBe('latest_wins');
      expect(resolutions[0].action).toBe('accept_latest');
    });
  });

  describe('Trend Analysis', () => {
    beforeEach(() => {
      aggregator.startAggregation();
    });

    it('should track quality trends', () => {
      // Add multiple batches to establish trends
      const batches = [
        {
          id: 'batch1',
          results: [{
            taskId: 'task1',
            success: true,
            metrics: { qualityImprovement: 20 }
          }]
        },
        {
          id: 'batch2',
          results: [{
            taskId: 'task2',
            success: true,
            metrics: { qualityImprovement: 25 }
          }]
        },
        {
          id: 'batch3',
          results: [{
            taskId: 'task3',
            success: true,
            metrics: { qualityImprovement: 30 }
          }]
        }
      ];

      for (const batch of batches) {
        aggregator.addBatchResults(batch.id, batch.results);
      }

      expect(aggregator.qualityTrends.length).toBe(3);
      expect(aggregator.qualityTrends[0].averageQualityImprovement).toBe(20);
      expect(aggregator.qualityTrends[2].averageQualityImprovement).toBe(30);
    });

    it('should analyze trend direction correctly', () => {
      // Create trend data
      const trendData = [
        { averageQualityImprovement: 10, timestamp: Date.now() - 3000 },
        { averageQualityImprovement: 15, timestamp: Date.now() - 2000 },
        { averageQualityImprovement: 20, timestamp: Date.now() - 1000 },
        { averageQualityImprovement: 25, timestamp: Date.now() }
      ];

      const trend = aggregator.analyzeTrend(trendData, 'averageQualityImprovement');
      
      expect(trend.status).toBe('analyzed');
      expect(trend.direction).toBe('improving');
      expect(trend.change).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', () => {
      aggregator.startAggregation();
      
      // Add some test data
      aggregator.addBatchResults('test-batch', [
        {
          taskId: 'task1',
          success: true,
          duration: 1000,
          metrics: { qualityImprovement: 20 },
          originalAnalysis: { linesOfCode: 100 }
        }
      ]);

      const report = aggregator.generateComprehensiveReport();
      
      expect(report.summary).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.conflicts).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.recommendations).toBeDefined();
      
      expect(report.summary.totalTasks).toBe(1);
      expect(report.summary.successfulTasks).toBe(1);
      expect(report.summary.successRate).toBe(100);
    });

    it('should generate recommendations based on data', () => {
      aggregator.startAggregation();
      
      // Add data that should trigger recommendations
      aggregator.aggregatedMetrics.totalTasks = 100;
      aggregator.aggregatedMetrics.successfulTasks = 70; // 70% success rate
      aggregator.aggregatedMetrics.averageQualityImprovement = 5; // Low quality improvement

      const recommendations = aggregator.generateRecommendations();
      
      expect(recommendations.length).toBeGreaterThan(0);
      
      const successRateRec = recommendations.find(r => r.type === 'success_rate');
      expect(successRateRec).toBeDefined();
      expect(successRateRec.priority).toBe('high');
      
      const qualityRec = recommendations.find(r => r.type === 'quality_improvement');
      expect(qualityRec).toBeDefined();
    });
  });

  describe('Reporting System Integration', () => {
    it('should generate HTML report', async () => {
      const mockData = {
        summary: {
          totalTasks: 100,
          successfulTasks: 85,
          failedTasks: 15,
          successRate: 85,
          totalLinesRefactored: 5000
        },
        metrics: {
          averageTaskDuration: 2500,
          averageQualityImprovement: 22.5,
          averageComplexityReduction: 18.3,
          technicalDebtReduction: 150,
          performanceGains: 12.7
        },
        conflicts: {
          totalConflicts: 5,
          recentConflicts: [],
          conflictRate: 5
        },
        trends: {
          enabled: true,
          quality: { direction: 'improving' },
          performance: { direction: 'stable' }
        },
        recommendations: [
          {
            type: 'performance',
            priority: 'medium',
            message: 'Consider optimizing slow tasks',
            actionItems: ['Profile task execution', 'Optimize algorithms']
          }
        ]
      };

      const htmlReport = await reportingSystem.generateHtmlReport(mockData, new Date().toISOString());
      
      expect(htmlReport).toContain('Legacy Code Refactoring Report');
      expect(htmlReport).toContain('100'); // Total tasks
      expect(htmlReport).toContain('85%'); // Success rate
      expect(htmlReport).toContain('5,000'); // Lines refactored
    });

    it('should generate JSON report', () => {
      const mockData = {
        summary: { totalTasks: 50 },
        metrics: { averageQualityImprovement: 15 }
      };

      const jsonReport = reportingSystem.generateJsonReport(mockData, new Date().toISOString());
      
      expect(jsonReport.reportType).toBe('comprehensive');
      expect(jsonReport.data.summary.totalTasks).toBe(50);
      expect(jsonReport.data.metrics.averageQualityImprovement).toBe(15);
    });

    it('should generate CSV report', () => {
      const mockData = {
        summary: {
          totalTasks: 25,
          successfulTasks: 20,
          failedTasks: 5,
          successRate: 80
        },
        metrics: {
          averageQualityImprovement: 18,
          averageComplexityReduction: 12,
          technicalDebtReduction: 75,
          performanceGains: 8
        },
        conflicts: {
          totalConflicts: 2
        }
      };

      const csvReport = reportingSystem.generateCsvReport(mockData, new Date().toISOString());
      
      expect(csvReport).toContain('25'); // Total tasks
      expect(csvReport).toContain('80'); // Success rate
      expect(csvReport).toContain('18'); // Quality improvement
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large numbers of batch results efficiently', () => {
      aggregator.startAggregation();
      
      const startTime = Date.now();
      const batchCount = 100;
      const tasksPerBatch = 10;

      // Generate large amount of test data
      for (let i = 0; i < batchCount; i++) {
        const results = Array.from({ length: tasksPerBatch }, (_, j) => ({
          taskId: `task_${i}_${j}`,
          success: Math.random() > 0.1, // 90% success rate
          duration: Math.random() * 3000 + 500,
          metrics: {
            qualityImprovement: Math.random() * 40 + 10,
            complexityReduction: Math.random() * 30 + 5,
            technicalDebtReduction: Math.random() * 20 + 2
          },
          originalAnalysis: {
            linesOfCode: Math.floor(Math.random() * 200) + 50
          }
        }));

        aggregator.addBatchResults(`batch_${i}`, results);
      }

      const processingTime = Date.now() - startTime;
      
      expect(aggregator.aggregatedMetrics.totalBatches).toBe(batchCount);
      expect(aggregator.aggregatedMetrics.totalTasks).toBe(batchCount * tasksPerBatch);
      expect(processingTime).toBeLessThan(5000); // Should process within 5 seconds
    });

    it('should maintain memory efficiency with trend data', () => {
      aggregator.startAggregation();
      
      // Add many trend data points
      for (let i = 0; i < 2000; i++) {
        aggregator.qualityTrends.push({
          timestamp: Date.now() + i,
          averageQualityImprovement: Math.random() * 50,
          sampleSize: 10
        });
      }

      // Trigger trend maintenance
      aggregator.updateTrends({ qualityImprovements: [25] });
      
      // Should maintain reasonable size
      expect(aggregator.qualityTrends.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed batch results gracefully', () => {
      aggregator.startAggregation();
      
      const batchId = 'malformed-batch';
      const results = [
        {
          // Missing required fields
          taskId: 'incomplete-task'
          // No success field, no metrics, etc.
        },
        null, // Null result
        undefined, // Undefined result
        {
          taskId: 'valid-task',
          success: true,
          duration: 1000
        }
      ];

      // Should not throw error
      expect(() => {
        aggregator.addBatchResults(batchId, results);
      }).not.toThrow();

      const batchResult = aggregator.batchResults.get(batchId);
      expect(batchResult).toBeDefined();
      expect(batchResult.processed).toBe(true);
    });

    it('should handle conflict resolution errors gracefully', () => {
      // Mock a conflict resolution strategy that throws
      aggregator.options.conflictResolutionStrategy = 'invalid_strategy';
      
      const conflicts = [
        {
          taskId: 'task1',
          type: 'test_conflict',
          severity: 'medium'
        }
      ];

      // Should not throw error and fall back to default strategy
      expect(() => {
        const resolutions = aggregator.resolveConflicts(conflicts);
        expect(resolutions).toHaveLength(1);
      }).not.toThrow();
    });
  });
});