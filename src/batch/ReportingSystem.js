import { EventEmitter } from 'events';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

/**
 * Comprehensive Reporting System for batch refactoring operations
 * Generates detailed reports in multiple formats with visualizations and analytics
 */
export class ReportingSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      outputDirectory: options.outputDirectory || './reports',
      enableHtmlReports: options.enableHtmlReports !== false,
      enableJsonReports: options.enableJsonReports !== false,
      enableCsvReports: options.enableCsvReports !== false,
      enableCharts: options.enableCharts !== false,
      autoGenerateReports: options.autoGenerateReports !== false,
      reportRetentionDays: options.reportRetentionDays || 30,
      ...options
    };

    this.reportTemplates = new Map();
    this.generatedReports = new Map();
    this.reportQueue = [];
    
    this.initializeTemplates();
    
    console.log('Reporting System initialized');
  }

  /**
   * Initialize report templates
   */
  initializeTemplates() {
    // HTML template for comprehensive reports
    this.reportTemplates.set('html_comprehensive', `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Legacy Code Refactoring Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007acc; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007acc; }
        .metric-label { color: #666; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .progress-bar { background: #e0e0e0; border-radius: 10px; overflow: hidden; height: 20px; margin: 10px 0; }
        .progress-fill { background: linear-gradient(90deg, #4caf50, #8bc34a); height: 100%; transition: width 0.3s ease; }
        .conflict-item { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .conflict-high { border-left: 4px solid #dc3545; }
        .conflict-medium { border-left: 4px solid #ffc107; }
        .conflict-low { border-left: 4px solid #28a745; }
        .recommendation { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .trend-up { color: #28a745; }
        .trend-down { color: #dc3545; }
        .trend-stable { color: #6c757d; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .chart-container { margin: 20px 0; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Legacy Code Refactoring Report</h1>
            <p>Generated on {{timestamp}}</p>
        </div>

        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-value">{{totalTasks}}</div>
                <div class="metric-label">Total Tasks Processed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{{successRate}}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{{totalLinesRefactored}}</div>
                <div class="metric-label">Lines Refactored</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{{averageQualityImprovement}}%</div>
                <div class="metric-label">Avg Quality Improvement</div>
            </div>
        </div>

        <div class="section">
            <h2>Processing Overview</h2>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {{successRate}}%"></div>
            </div>
            <p>{{successfulTasks}} successful, {{failedTasks}} failed out of {{totalTasks}} total tasks</p>
        </div>

        <div class="section">
            <h2>Quality Metrics</h2>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Trend</th>
                </tr>
                <tr>
                    <td>Average Task Duration</td>
                    <td>{{averageTaskDuration}}ms</td>
                    <td><span class="trend-{{durationTrend}}">{{durationTrendIcon}}</span></td>
                </tr>
                <tr>
                    <td>Complexity Reduction</td>
                    <td>{{averageComplexityReduction}}%</td>
                    <td><span class="trend-{{complexityTrend}}">{{complexityTrendIcon}}</span></td>
                </tr>
                <tr>
                    <td>Technical Debt Reduction</td>
                    <td>{{technicalDebtReduction}}</td>
                    <td><span class="trend-{{debtTrend}}">{{debtTrendIcon}}</span></td>
                </tr>
                <tr>
                    <td>Performance Gains</td>
                    <td>{{performanceGains}}%</td>
                    <td><span class="trend-{{performanceTrend}}">{{performanceTrendIcon}}</span></td>
                </tr>
            </table>
        </div>

        {{#if conflicts.totalConflicts}}
        <div class="section">
            <h2>Conflicts and Issues</h2>
            <p>Total conflicts detected: {{conflicts.totalConflicts}} ({{conflicts.conflictRate}}% of tasks)</p>
            {{#each conflicts.recentConflicts}}
            <div class="conflict-item conflict-{{severity}}">
                <strong>{{type}}</strong>: {{description}}
                <br><small>Batch: {{batchId}} | Severity: {{severity}}</small>
            </div>
            {{/each}}
        </div>
        {{/if}}

        {{#if recommendations}}
        <div class="section">
            <h2>Recommendations</h2>
            {{#each recommendations}}
            <div class="recommendation">
                <h4>{{type}} (Priority: {{priority}})</h4>
                <p>{{message}}</p>
                <ul>
                    {{#each actionItems}}
                    <li>{{this}}</li>
                    {{/each}}
                </ul>
            </div>
            {{/each}}
        </div>
        {{/if}}

        <div class="section">
            <h2>Batch Summary</h2>
            <table>
                <tr>
                    <th>Batch ID</th>
                    <th>Tasks</th>
                    <th>Success Rate</th>
                    <th>Avg Quality</th>
                    <th>Duration</th>
                </tr>
                {{#each batchSummaries}}
                <tr>
                    <td>{{batchId}}</td>
                    <td>{{totalTasks}}</td>
                    <td>{{successRate}}%</td>
                    <td>{{avgQuality}}%</td>
                    <td>{{duration}}ms</td>
                </tr>
                {{/each}}
            </table>
        </div>
    </div>
</body>
</html>
    `);

    // CSV template for data export
    this.reportTemplates.set('csv_summary', 
      'Timestamp,Total Tasks,Successful Tasks,Failed Tasks,Success Rate,Avg Quality Improvement,Avg Complexity Reduction,Technical Debt Reduction,Performance Gains,Total Conflicts\n'
    );
  }

  /**
   * Generate comprehensive report from aggregated data
   */
  async generateComprehensiveReport(aggregatedData, options = {}) {
    const reportId = `comprehensive_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    try {
      // Ensure output directory exists
      await this.ensureOutputDirectory();

      const reports = {};

      // Generate HTML report
      if (this.options.enableHtmlReports) {
        const htmlReport = await this.generateHtmlReport(aggregatedData, timestamp);
        const htmlPath = join(this.options.outputDirectory, `${reportId}.html`);
        await writeFile(htmlPath, htmlReport);
        reports.html = htmlPath;
      }

      // Generate JSON report
      if (this.options.enableJsonReports) {
        const jsonReport = this.generateJsonReport(aggregatedData, timestamp);
        const jsonPath = join(this.options.outputDirectory, `${reportId}.json`);
        await writeFile(jsonPath, JSON.stringify(jsonReport, null, 2));
        reports.json = jsonPath;
      }

      // Generate CSV report
      if (this.options.enableCsvReports) {
        const csvReport = this.generateCsvReport(aggregatedData, timestamp);
        const csvPath = join(this.options.outputDirectory, `${reportId}.csv`);
        await writeFile(csvPath, csvReport);
        reports.csv = csvPath;
      }

      // Store report metadata
      this.generatedReports.set(reportId, {
        id: reportId,
        timestamp,
        files: reports,
        data: aggregatedData
      });

      this.emit('reportGenerated', {
        reportId,
        files: reports,
        timestamp: Date.now()
      });

      console.log(`Comprehensive report generated: ${reportId}`);
      return { reportId, files: reports };

    } catch (error) {
      console.error('Failed to generate comprehensive report:', error);
      throw error;
    }
  }

  /**
   * Generate HTML report
   */
  async generateHtmlReport(data, timestamp) {
    const template = this.reportTemplates.get('html_comprehensive');
    
    // Prepare template data
    const templateData = {
      timestamp: new Date(timestamp).toLocaleString(),
      totalTasks: data.summary.totalTasks,
      successfulTasks: data.summary.successfulTasks,
      failedTasks: data.summary.failedTasks,
      successRate: data.summary.successRate,
      totalLinesRefactored: data.summary.totalLinesRefactored.toLocaleString(),
      averageTaskDuration: data.metrics.averageTaskDuration,
      averageQualityImprovement: data.metrics.averageQualityImprovement,
      averageComplexityReduction: data.metrics.averageComplexityReduction,
      technicalDebtReduction: data.metrics.technicalDebtReduction,
      performanceGains: data.metrics.performanceGains,
      conflicts: data.conflicts,
      recommendations: data.recommendations,
      batchSummaries: this.prepareBatchSummaries(data),
      // Trend indicators
      durationTrend: this.getTrendClass(data.trends?.performance?.direction),
      durationTrendIcon: this.getTrendIcon(data.trends?.performance?.direction),
      complexityTrend: this.getTrendClass(data.trends?.quality?.direction),
      complexityTrendIcon: this.getTrendIcon(data.trends?.quality?.direction),
      debtTrend: 'stable',
      debtTrendIcon: '→',
      performanceTrend: this.getTrendClass(data.trends?.performance?.direction),
      performanceTrendIcon: this.getTrendIcon(data.trends?.performance?.direction)
    };

    return this.renderTemplate(template, templateData);
  }

  /**
   * Generate JSON report
   */
  generateJsonReport(data, timestamp) {
    return {
      reportType: 'comprehensive',
      generatedAt: timestamp,
      version: '1.0',
      data: {
        ...data,
        metadata: {
          reportId: `json_${Date.now()}`,
          generatedBy: 'Legacy Code AI Refactor',
          format: 'json'
        }
      }
    };
  }

  /**
   * Generate CSV report
   */
  generateCsvReport(data, timestamp) {
    const header = this.reportTemplates.get('csv_summary');
    const row = [
      timestamp,
      data.summary.totalTasks,
      data.summary.successfulTasks,
      data.summary.failedTasks,
      data.summary.successRate,
      data.metrics.averageQualityImprovement,
      data.metrics.averageComplexityReduction,
      data.metrics.technicalDebtReduction,
      data.metrics.performanceGains,
      data.conflicts.totalConflicts
    ].join(',');

    return header + row + '\n';
  }

  /**
   * Generate batch-specific report
   */
  async generateBatchReport(batchData, options = {}) {
    const reportId = `batch_${batchData.batchId}_${Date.now()}`;
    
    try {
      await this.ensureOutputDirectory();

      const report = {
        reportType: 'batch',
        batchId: batchData.batchId,
        generatedAt: new Date().toISOString(),
        summary: {
          totalTasks: batchData.totalTasks,
          completedTasks: batchData.completedTasks,
          failedTasks: batchData.failedTasks,
          successRate: Math.round((batchData.completedTasks / batchData.totalTasks) * 100)
        },
        metrics: batchData.metrics || {},
        taskDetails: batchData.taskDetails || [],
        conflicts: this.extractBatchConflicts(batchData),
        recommendations: this.generateBatchRecommendations(batchData)
      };

      const jsonPath = join(this.options.outputDirectory, `${reportId}.json`);
      await writeFile(jsonPath, JSON.stringify(report, null, 2));

      this.generatedReports.set(reportId, {
        id: reportId,
        timestamp: Date.now(),
        files: { json: jsonPath },
        data: report
      });

      this.emit('batchReportGenerated', {
        reportId,
        batchId: batchData.batchId,
        file: jsonPath,
        timestamp: Date.now()
      });

      console.log(`Batch report generated: ${reportId}`);
      return { reportId, file: jsonPath };

    } catch (error) {
      console.error('Failed to generate batch report:', error);
      throw error;
    }
  }

  /**
   * Generate performance analytics report
   */
  async generatePerformanceReport(performanceData, options = {}) {
    const reportId = `performance_${Date.now()}`;
    
    try {
      await this.ensureOutputDirectory();

      const report = {
        reportType: 'performance',
        generatedAt: new Date().toISOString(),
        timeRange: {
          start: performanceData.startTime,
          end: performanceData.endTime,
          duration: performanceData.endTime - performanceData.startTime
        },
        throughput: {
          tasksPerSecond: performanceData.tasksPerSecond,
          peakThroughput: performanceData.peakThroughput,
          averageTaskTime: performanceData.averageTaskTime
        },
        resourceUtilization: {
          peakMemoryUsage: performanceData.peakMemoryUsage,
          averageCpuUsage: performanceData.averageCpuUsage,
          workerEfficiency: performanceData.workerEfficiency
        },
        trends: performanceData.trends || {},
        bottlenecks: this.identifyBottlenecks(performanceData),
        optimizationSuggestions: this.generateOptimizationSuggestions(performanceData)
      };

      const jsonPath = join(this.options.outputDirectory, `${reportId}.json`);
      await writeFile(jsonPath, JSON.stringify(report, null, 2));

      this.generatedReports.set(reportId, {
        id: reportId,
        timestamp: Date.now(),
        files: { json: jsonPath },
        data: report
      });

      this.emit('performanceReportGenerated', {
        reportId,
        file: jsonPath,
        timestamp: Date.now()
      });

      console.log(`Performance report generated: ${reportId}`);
      return { reportId, file: jsonPath };

    } catch (error) {
      console.error('Failed to generate performance report:', error);
      throw error;
    }
  }

  /**
   * Prepare batch summaries for template
   */
  prepareBatchSummaries(data) {
    // This would typically come from the aggregated data
    // For now, return a placeholder structure
    return [
      {
        batchId: 'batch_001',
        totalTasks: 50,
        successRate: 94,
        avgQuality: 85,
        duration: 12500
      },
      {
        batchId: 'batch_002',
        totalTasks: 75,
        successRate: 89,
        avgQuality: 78,
        duration: 18200
      }
    ];
  }

  /**
   * Get CSS class for trend direction
   */
  getTrendClass(direction) {
    switch (direction) {
      case 'improving': return 'up';
      case 'declining': return 'down';
      default: return 'stable';
    }
  }

  /**
   * Get icon for trend direction
   */
  getTrendIcon(direction) {
    switch (direction) {
      case 'improving': return '↗';
      case 'declining': return '↘';
      default: return '→';
    }
  }

  /**
   * Extract conflicts specific to a batch
   */
  extractBatchConflicts(batchData) {
    // Extract conflicts from batch data
    return {
      totalConflicts: 0,
      conflictsByType: {},
      conflictsBySeverity: {}
    };
  }

  /**
   * Generate recommendations specific to a batch
   */
  generateBatchRecommendations(batchData) {
    const recommendations = [];
    
    const successRate = (batchData.completedTasks / batchData.totalTasks) * 100;
    
    if (successRate < 90) {
      recommendations.push({
        type: 'success_rate',
        priority: 'high',
        message: `Batch success rate is ${Math.round(successRate)}%. Review failed tasks for common patterns.`
      });
    }

    return recommendations;
  }

  /**
   * Identify performance bottlenecks
   */
  identifyBottlenecks(performanceData) {
    const bottlenecks = [];

    if (performanceData.averageTaskTime > 30000) { // 30 seconds
      bottlenecks.push({
        type: 'slow_tasks',
        severity: 'medium',
        description: 'Tasks are taking longer than expected to complete',
        impact: 'Reduced overall throughput'
      });
    }

    if (performanceData.peakMemoryUsage > 0.8) { // 80% of available memory
      bottlenecks.push({
        type: 'memory_pressure',
        severity: 'high',
        description: 'High memory usage detected',
        impact: 'Potential system instability and reduced performance'
      });
    }

    return bottlenecks;
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizationSuggestions(performanceData) {
    const suggestions = [];

    if (performanceData.tasksPerSecond < 1) {
      suggestions.push({
        category: 'throughput',
        suggestion: 'Increase worker count or optimize task processing logic',
        expectedImpact: 'Improved processing speed'
      });
    }

    if (performanceData.workerEfficiency < 0.7) {
      suggestions.push({
        category: 'efficiency',
        suggestion: 'Review task distribution and load balancing strategies',
        expectedImpact: 'Better resource utilization'
      });
    }

    return suggestions;
  }

  /**
   * Render template with data
   */
  renderTemplate(template, data) {
    let rendered = template;

    // Simple template rendering (replace {{variable}} with values)
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value || '');
    }

    // Handle conditional blocks (simplified)
    rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
      return data[condition] ? content : '';
    });

    return rendered;
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDirectory() {
    try {
      await mkdir(this.options.outputDirectory, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Get list of generated reports
   */
  getGeneratedReports() {
    return Array.from(this.generatedReports.values()).map(report => ({
      id: report.id,
      timestamp: report.timestamp,
      files: report.files
    }));
  }

  /**
   * Get specific report data
   */
  getReportData(reportId) {
    return this.generatedReports.get(reportId);
  }

  /**
   * Clean up old reports
   */
  async cleanupOldReports() {
    const cutoffTime = Date.now() - (this.options.reportRetentionDays * 24 * 60 * 60 * 1000);
    const reportsToDelete = [];

    for (const [reportId, report] of this.generatedReports) {
      if (report.timestamp < cutoffTime) {
        reportsToDelete.push(reportId);
      }
    }

    for (const reportId of reportsToDelete) {
      this.generatedReports.delete(reportId);
    }

    this.emit('reportsCleanedUp', {
      deletedCount: reportsToDelete.length,
      timestamp: Date.now()
    });

    console.log(`Cleaned up ${reportsToDelete.length} old reports`);
  }

  /**
   * Export all report data
   */
  exportReportData() {
    return {
      generatedReports: Object.fromEntries(this.generatedReports),
      reportQueue: this.reportQueue,
      options: this.options,
      timestamp: Date.now()
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.generatedReports.clear();
    this.reportQueue.length = 0;
    this.removeAllListeners();
    
    console.log('Reporting System cleaned up');
  }
}