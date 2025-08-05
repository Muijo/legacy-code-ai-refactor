import { EventEmitter } from 'events';

/**
 * Result Aggregator for batch refactoring operations
 * Handles comprehensive reporting, conflict resolution, and quality metrics aggregation
 */
export class ResultAggregator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableConflictResolution: options.enableConflictResolution !== false,
      enableTrendAnalysis: options.enableTrendAnalysis !== false,
      enableQualityMetrics: options.enableQualityMetrics !== false,
      reportingInterval: options.reportingInterval || 30000, // 30 seconds
      maxResultHistory: options.maxResultHistory || 10000,
      conflictResolutionStrategy: options.conflictResolutionStrategy || 'latest_wins',
      ...options
    };

    this.batchResults = new Map();
    this.aggregatedMetrics = {
      totalBatches: 0,
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageTaskDuration: 0,
      averageQualityImprovement: 0,
      averageComplexityReduction: 0,
      totalLinesRefactored: 0,
      technicalDebtReduction: 0,
      performanceGains: 0
    };

    this.qualityTrends = [];
    this.performanceTrends = [];
    this.conflictLog = [];
    this.reportHistory = [];
    
    this.reportingTimer = null;
    this.isAggregating = false;

    console.log('Result Aggregator initialized');
  }

  /**
   * Start result aggregation and reporting
   */
  startAggregation() {
    if (this.isAggregating) return;
    
    this.isAggregating = true;
    
    if (this.options.reportingInterval > 0) {
      this.reportingTimer = setInterval(() => {
        this.generatePeriodicReport();
      }, this.options.reportingInterval);
    }

    this.emit('aggregationStarted', {
      timestamp: Date.now()
    });

    console.log('Result aggregation started');
  }

  /**
   * Stop result aggregation and reporting
   */
  stopAggregation() {
    if (!this.isAggregating) return;
    
    this.isAggregating = false;
    
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }

    this.emit('aggregationStopped', {
      finalReport: this.generateComprehensiveReport(),
      timestamp: Date.now()
    });

    console.log('Result aggregation stopped');
  }

  /**
   * Add batch results for aggregation
   */
  addBatchResults(batchId, results, metadata = {}) {
    const batchResult = {
      batchId,
      results: Array.isArray(results) ? results : [results],
      metadata,
      timestamp: Date.now(),
      processed: false
    };

    this.batchResults.set(batchId, batchResult);
    
    // Process the batch immediately
    this.processBatchResults(batchResult);

    this.emit('batchResultsAdded', {
      batchId,
      taskCount: batchResult.results.length,
      timestamp: Date.now()
    });

    console.log(`Added results for batch ${batchId}: ${batchResult.results.length} tasks`);
  }

  /**
   * Process batch results and update aggregated metrics
   */
  processBatchResults(batchResult) {
    if (batchResult.processed) return;

    const { results } = batchResult;
    let batchMetrics = {
      totalTasks: results.length,
      successfulTasks: 0,
      failedTasks: 0,
      totalDuration: 0,
      qualityImprovements: [],
      complexityReductions: [],
      linesRefactored: 0,
      technicalDebtReductions: [],
      performanceGains: [],
      conflicts: []
    };

    // Process each task result
    for (const result of results) {
      this.processTaskResult(result, batchMetrics);
    }

    // Update global aggregated metrics
    this.updateAggregatedMetrics(batchMetrics);

    // Handle conflicts if any
    if (batchMetrics.conflicts.length > 0) {
      this.handleBatchConflicts(batchResult.batchId, batchMetrics.conflicts);
    }

    // Update trends
    this.updateTrends(batchMetrics);

    batchResult.processed = true;
    batchResult.metrics = batchMetrics;

    this.emit('batchProcessed', {
      batchId: batchResult.batchId,
      metrics: batchMetrics,
      timestamp: Date.now()
    });
  }

  /**
   * Process individual task result
   */
  processTaskResult(result, batchMetrics) {
    if (result.success) {
      batchMetrics.successfulTasks++;
      
      // Duration metrics
      if (result.duration) {
        batchMetrics.totalDuration += result.duration;
      }

      // Quality metrics
      if (result.metrics) {
        if (result.metrics.qualityImprovement !== undefined) {
          batchMetrics.qualityImprovements.push(result.metrics.qualityImprovement);
        }
        
        if (result.metrics.complexityReduction !== undefined) {
          batchMetrics.complexityReductions.push(result.metrics.complexityReduction);
        }
        
        if (result.metrics.technicalDebtReduction !== undefined) {
          batchMetrics.technicalDebtReductions.push(result.metrics.technicalDebtReduction);
        }
      }

      // Lines of code metrics
      if (result.originalAnalysis && result.originalAnalysis.linesOfCode) {
        batchMetrics.linesRefactored += result.originalAnalysis.linesOfCode;
      }

      // Performance metrics
      if (result.validation && result.validation.performanceComparison) {
        const perfGain = result.validation.performanceComparison.improvement || 0;
        batchMetrics.performanceGains.push(perfGain);
      }

      // Check for conflicts
      const conflicts = this.detectTaskConflicts(result);
      if (conflicts.length > 0) {
        batchMetrics.conflicts.push(...conflicts);
      }

    } else {
      batchMetrics.failedTasks++;
    }
  }

  /**
   * Detect conflicts in task results
   */
  detectTaskConflicts(result) {
    const conflicts = [];

    // Check for validation failures
    if (result.validation && !result.validation.functionalEquivalence) {
      conflicts.push({
        type: 'functional_equivalence_failure',
        taskId: result.taskId,
        severity: 'high',
        description: 'Generated code does not maintain functional equivalence',
        details: result.validation
      });
    }

    // Check for performance regressions
    if (result.validation && result.validation.performanceComparison) {
      const degradation = result.validation.performanceComparison.degradation || 0;
      if (degradation > 20) {
        conflicts.push({
          type: 'performance_regression',
          taskId: result.taskId,
          severity: degradation > 50 ? 'high' : 'medium',
          description: `Performance degradation of ${degradation}%`,
          details: result.validation.performanceComparison
        });
      }
    }

    // Check for quality regressions
    if (result.metrics && result.metrics.qualityImprovement < -10) {
      conflicts.push({
        type: 'quality_regression',
        taskId: result.taskId,
        severity: 'medium',
        description: `Quality regression of ${Math.abs(result.metrics.qualityImprovement)}%`,
        details: result.metrics
      });
    }

    // Check for high risk migrations
    if (result.migration && result.migration.riskLevel === 'high') {
      conflicts.push({
        type: 'high_risk_migration',
        taskId: result.taskId,
        severity: 'medium',
        description: 'Migration classified as high risk',
        details: result.migration
      });
    }

    return conflicts;
  }

  /**
   * Handle conflicts detected in batch processing
   */
  handleBatchConflicts(batchId, conflicts) {
    const conflictSummary = {
      batchId,
      totalConflicts: conflicts.length,
      conflictsByType: this.groupConflictsByType(conflicts),
      conflictsBySeverity: this.groupConflictsBySeverity(conflicts),
      timestamp: Date.now()
    };

    // Log conflicts
    this.conflictLog.push(conflictSummary);

    // Apply conflict resolution strategy
    const resolutions = this.resolveConflicts(conflicts);

    this.emit('conflictsDetected', {
      batchId,
      conflicts: conflictSummary,
      resolutions,
      timestamp: Date.now()
    });

    console.warn(`Conflicts detected in batch ${batchId}:`, conflictSummary);
  }

  /**
   * Group conflicts by type
   */
  groupConflictsByType(conflicts) {
    const grouped = {};
    for (const conflict of conflicts) {
      grouped[conflict.type] = (grouped[conflict.type] || 0) + 1;
    }
    return grouped;
  }

  /**
   * Group conflicts by severity
   */
  groupConflictsBySeverity(conflicts) {
    const grouped = {};
    for (const conflict of conflicts) {
      grouped[conflict.severity] = (grouped[conflict.severity] || 0) + 1;
    }
    return grouped;
  }

  /**
   * Resolve conflicts based on configured strategy
   */
  resolveConflicts(conflicts) {
    const resolutions = [];

    for (const conflict of conflicts) {
      let resolution;

      switch (this.options.conflictResolutionStrategy) {
        case 'manual_review':
          resolution = this.createManualReviewResolution(conflict);
          break;
        case 'automatic_rollback':
          resolution = this.createAutomaticRollbackResolution(conflict);
          break;
        case 'quality_threshold':
          resolution = this.createQualityThresholdResolution(conflict);
          break;
        case 'latest_wins':
        default:
          resolution = this.createLatestWinsResolution(conflict);
          break;
      }

      resolutions.push(resolution);
    }

    return resolutions;
  }

  /**
   * Create manual review resolution
   */
  createManualReviewResolution(conflict) {
    return {
      conflictId: conflict.taskId,
      strategy: 'manual_review',
      action: 'flag_for_review',
      description: 'Task flagged for manual review due to conflict',
      priority: conflict.severity === 'high' ? 'urgent' : 'normal',
      timestamp: Date.now()
    };
  }

  /**
   * Create automatic rollback resolution
   */
  createAutomaticRollbackResolution(conflict) {
    return {
      conflictId: conflict.taskId,
      strategy: 'automatic_rollback',
      action: 'rollback_changes',
      description: 'Automatically rolling back changes due to conflict',
      rollbackPlan: this.generateRollbackPlan(conflict),
      timestamp: Date.now()
    };
  }

  /**
   * Create quality threshold resolution
   */
  createQualityThresholdResolution(conflict) {
    const action = conflict.severity === 'high' ? 'reject_changes' : 'accept_with_warning';
    
    return {
      conflictId: conflict.taskId,
      strategy: 'quality_threshold',
      action,
      description: `${action.replace('_', ' ')} based on quality threshold`,
      qualityScore: conflict.details?.qualityScore || 0,
      threshold: 70,
      timestamp: Date.now()
    };
  }

  /**
   * Create latest wins resolution
   */
  createLatestWinsResolution(conflict) {
    return {
      conflictId: conflict.taskId,
      strategy: 'latest_wins',
      action: 'accept_latest',
      description: 'Accepting latest changes despite conflict',
      warning: `Conflict of type ${conflict.type} was overridden`,
      timestamp: Date.now()
    };
  }

  /**
   * Generate rollback plan for conflict resolution
   */
  generateRollbackPlan(conflict) {
    return {
      steps: [
        'Backup current state',
        'Restore original code',
        'Verify restoration',
        'Update tracking systems'
      ],
      estimatedTime: 300000, // 5 minutes
      riskLevel: 'low'
    };
  }

  /**
   * Update aggregated metrics with batch results
   */
  updateAggregatedMetrics(batchMetrics) {
    this.aggregatedMetrics.totalBatches++;
    this.aggregatedMetrics.totalTasks += batchMetrics.totalTasks;
    this.aggregatedMetrics.successfulTasks += batchMetrics.successfulTasks;
    this.aggregatedMetrics.failedTasks += batchMetrics.failedTasks;
    this.aggregatedMetrics.totalLinesRefactored += batchMetrics.linesRefactored;

    // Update average task duration
    if (batchMetrics.successfulTasks > 0) {
      const newAvgDuration = batchMetrics.totalDuration / batchMetrics.successfulTasks;
      this.aggregatedMetrics.averageTaskDuration = this.updateRunningAverage(
        this.aggregatedMetrics.averageTaskDuration,
        newAvgDuration,
        this.aggregatedMetrics.successfulTasks - batchMetrics.successfulTasks,
        batchMetrics.successfulTasks
      );
    }

    // Update quality improvement average
    if (batchMetrics.qualityImprovements.length > 0) {
      const avgQualityImprovement = batchMetrics.qualityImprovements.reduce((a, b) => a + b, 0) / batchMetrics.qualityImprovements.length;
      this.aggregatedMetrics.averageQualityImprovement = this.updateRunningAverage(
        this.aggregatedMetrics.averageQualityImprovement,
        avgQualityImprovement,
        this.aggregatedMetrics.successfulTasks - batchMetrics.successfulTasks,
        batchMetrics.qualityImprovements.length
      );
    }

    // Update complexity reduction average
    if (batchMetrics.complexityReductions.length > 0) {
      const avgComplexityReduction = batchMetrics.complexityReductions.reduce((a, b) => a + b, 0) / batchMetrics.complexityReductions.length;
      this.aggregatedMetrics.averageComplexityReduction = this.updateRunningAverage(
        this.aggregatedMetrics.averageComplexityReduction,
        avgComplexityReduction,
        this.aggregatedMetrics.successfulTasks - batchMetrics.successfulTasks,
        batchMetrics.complexityReductions.length
      );
    }

    // Update technical debt reduction
    if (batchMetrics.technicalDebtReductions.length > 0) {
      const totalDebtReduction = batchMetrics.technicalDebtReductions.reduce((a, b) => a + b, 0);
      this.aggregatedMetrics.technicalDebtReduction += totalDebtReduction;
    }

    // Update performance gains
    if (batchMetrics.performanceGains.length > 0) {
      const avgPerformanceGain = batchMetrics.performanceGains.reduce((a, b) => a + b, 0) / batchMetrics.performanceGains.length;
      this.aggregatedMetrics.performanceGains = this.updateRunningAverage(
        this.aggregatedMetrics.performanceGains,
        avgPerformanceGain,
        this.aggregatedMetrics.successfulTasks - batchMetrics.successfulTasks,
        batchMetrics.performanceGains.length
      );
    }
  }

  /**
   * Update running average with new data
   */
  updateRunningAverage(currentAvg, newValue, currentCount, newCount) {
    if (currentCount === 0) return newValue;
    return ((currentAvg * currentCount) + (newValue * newCount)) / (currentCount + newCount);
  }

  /**
   * Update trend analysis data
   */
  updateTrends(batchMetrics) {
    if (!this.options.enableTrendAnalysis) return;

    const timestamp = Date.now();

    // Quality trends
    if (batchMetrics.qualityImprovements.length > 0) {
      const avgQuality = batchMetrics.qualityImprovements.reduce((a, b) => a + b, 0) / batchMetrics.qualityImprovements.length;
      this.qualityTrends.push({
        timestamp,
        averageQualityImprovement: avgQuality,
        sampleSize: batchMetrics.qualityImprovements.length
      });
    }

    // Performance trends
    if (batchMetrics.performanceGains.length > 0) {
      const avgPerformance = batchMetrics.performanceGains.reduce((a, b) => a + b, 0) / batchMetrics.performanceGains.length;
      this.performanceTrends.push({
        timestamp,
        averagePerformanceGain: avgPerformance,
        sampleSize: batchMetrics.performanceGains.length
      });
    }

    // Maintain trend history size
    const maxTrendSize = 1000;
    if (this.qualityTrends.length > maxTrendSize) {
      this.qualityTrends.shift();
    }
    if (this.performanceTrends.length > maxTrendSize) {
      this.performanceTrends.shift();
    }
  }

  /**
   * Generate periodic report
   */
  generatePeriodicReport() {
    const report = this.generateComprehensiveReport();
    
    this.reportHistory.push({
      ...report,
      reportType: 'periodic',
      timestamp: Date.now()
    });

    // Maintain report history size
    if (this.reportHistory.length > 100) {
      this.reportHistory.shift();
    }

    this.emit('periodicReport', report);

    console.log('Periodic report generated:', {
      totalTasks: report.summary.totalTasks,
      successRate: report.summary.successRate,
      averageQualityImprovement: report.metrics.averageQualityImprovement
    });
  }

  /**
   * Generate comprehensive report
   */
  generateComprehensiveReport() {
    const timestamp = Date.now();
    const successRate = this.aggregatedMetrics.totalTasks > 0 ? 
      Math.round((this.aggregatedMetrics.successfulTasks / this.aggregatedMetrics.totalTasks) * 100) : 0;

    const report = {
      timestamp,
      summary: {
        totalBatches: this.aggregatedMetrics.totalBatches,
        totalTasks: this.aggregatedMetrics.totalTasks,
        successfulTasks: this.aggregatedMetrics.successfulTasks,
        failedTasks: this.aggregatedMetrics.failedTasks,
        successRate,
        totalLinesRefactored: this.aggregatedMetrics.totalLinesRefactored
      },
      metrics: {
        averageTaskDuration: Math.round(this.aggregatedMetrics.averageTaskDuration),
        averageQualityImprovement: Math.round(this.aggregatedMetrics.averageQualityImprovement * 100) / 100,
        averageComplexityReduction: Math.round(this.aggregatedMetrics.averageComplexityReduction * 100) / 100,
        technicalDebtReduction: Math.round(this.aggregatedMetrics.technicalDebtReduction),
        performanceGains: Math.round(this.aggregatedMetrics.performanceGains * 100) / 100
      },
      conflicts: {
        totalConflicts: this.conflictLog.reduce((sum, log) => sum + log.totalConflicts, 0),
        recentConflicts: this.conflictLog.slice(-10),
        conflictRate: this.calculateConflictRate()
      },
      trends: this.generateTrendAnalysis(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Calculate conflict rate
   */
  calculateConflictRate() {
    const totalConflicts = this.conflictLog.reduce((sum, log) => sum + log.totalConflicts, 0);
    return this.aggregatedMetrics.totalTasks > 0 ? 
      Math.round((totalConflicts / this.aggregatedMetrics.totalTasks) * 100) : 0;
  }

  /**
   * Generate trend analysis
   */
  generateTrendAnalysis() {
    if (!this.options.enableTrendAnalysis) {
      return { enabled: false };
    }

    const trends = {
      enabled: true,
      quality: this.analyzeTrend(this.qualityTrends, 'averageQualityImprovement'),
      performance: this.analyzeTrend(this.performanceTrends, 'averagePerformanceGain')
    };

    return trends;
  }

  /**
   * Analyze trend for a specific metric
   */
  analyzeTrend(trendData, metric) {
    if (trendData.length < 3) {
      return { status: 'insufficient_data', dataPoints: trendData.length };
    }

    const recent = trendData.slice(-10);
    const older = trendData.slice(-20, -10);

    if (older.length === 0) {
      return { status: 'insufficient_data', dataPoints: trendData.length };
    }

    const recentAvg = recent.reduce((sum, point) => sum + point[metric], 0) / recent.length;
    const olderAvg = older.reduce((sum, point) => sum + point[metric], 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    let direction;
    if (change > 5) direction = 'improving';
    else if (change < -5) direction = 'declining';
    else direction = 'stable';

    return {
      status: 'analyzed',
      direction,
      change: Math.round(change * 100) / 100,
      recentAverage: Math.round(recentAvg * 100) / 100,
      previousAverage: Math.round(olderAvg * 100) / 100,
      dataPoints: trendData.length
    };
  }

  /**
   * Generate recommendations based on aggregated data
   */
  generateRecommendations() {
    const recommendations = [];

    // Success rate recommendations
    const successRate = this.aggregatedMetrics.totalTasks > 0 ? 
      (this.aggregatedMetrics.successfulTasks / this.aggregatedMetrics.totalTasks) * 100 : 0;

    if (successRate < 80) {
      recommendations.push({
        type: 'success_rate',
        priority: 'high',
        message: `Success rate is ${Math.round(successRate)}%. Consider reviewing failed tasks and improving error handling.`,
        actionItems: [
          'Analyze common failure patterns',
          'Improve input validation',
          'Enhance error recovery mechanisms'
        ]
      });
    }

    // Quality improvement recommendations
    if (this.aggregatedMetrics.averageQualityImprovement < 10) {
      recommendations.push({
        type: 'quality_improvement',
        priority: 'medium',
        message: `Average quality improvement is ${Math.round(this.aggregatedMetrics.averageQualityImprovement)}%. Consider more aggressive modernization strategies.`,
        actionItems: [
          'Review modernization patterns',
          'Increase refactoring scope',
          'Apply additional quality checks'
        ]
      });
    }

    // Performance recommendations
    if (this.aggregatedMetrics.performanceGains < 5) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: `Average performance gain is ${Math.round(this.aggregatedMetrics.performanceGains)}%. Focus on performance optimizations.`,
        actionItems: [
          'Profile generated code',
          'Apply performance patterns',
          'Optimize critical paths'
        ]
      });
    }

    // Conflict rate recommendations
    const conflictRate = this.calculateConflictRate();
    if (conflictRate > 10) {
      recommendations.push({
        type: 'conflict_resolution',
        priority: 'high',
        message: `Conflict rate is ${conflictRate}%. Review conflict resolution strategies.`,
        actionItems: [
          'Analyze conflict patterns',
          'Improve validation criteria',
          'Enhance conflict resolution strategies'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Get detailed batch report
   */
  getBatchReport(batchId) {
    const batchResult = this.batchResults.get(batchId);
    if (!batchResult) return null;

    return {
      batchId,
      processed: batchResult.processed,
      metrics: batchResult.metrics,
      metadata: batchResult.metadata,
      timestamp: batchResult.timestamp,
      taskDetails: batchResult.results.map(result => ({
        taskId: result.taskId,
        success: result.success,
        duration: result.duration,
        qualityImprovement: result.metrics?.qualityImprovement,
        complexityReduction: result.metrics?.complexityReduction,
        riskLevel: result.migration?.riskLevel
      }))
    };
  }

  /**
   * Export aggregated data for external analysis
   */
  exportAggregatedData() {
    return {
      aggregatedMetrics: this.aggregatedMetrics,
      qualityTrends: this.qualityTrends,
      performanceTrends: this.performanceTrends,
      conflictLog: this.conflictLog,
      reportHistory: this.reportHistory.slice(-10), // Last 10 reports
      batchSummaries: Array.from(this.batchResults.values()).map(batch => ({
        batchId: batch.batchId,
        metrics: batch.metrics,
        timestamp: batch.timestamp
      })),
      timestamp: Date.now()
    };
  }

  /**
   * Reset all aggregated data
   */
  reset() {
    this.batchResults.clear();
    this.qualityTrends.length = 0;
    this.performanceTrends.length = 0;
    this.conflictLog.length = 0;
    this.reportHistory.length = 0;

    this.aggregatedMetrics = {
      totalBatches: 0,
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageTaskDuration: 0,
      averageQualityImprovement: 0,
      averageComplexityReduction: 0,
      totalLinesRefactored: 0,
      technicalDebtReduction: 0,
      performanceGains: 0
    };

    this.emit('reset', { timestamp: Date.now() });
    console.log('Result aggregator reset');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopAggregation();
    this.reset();
    this.removeAllListeners();
    
    console.log('Result Aggregator cleaned up');
  }
}