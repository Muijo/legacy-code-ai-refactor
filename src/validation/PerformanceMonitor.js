/**
 * Performance Monitor
 * 
 * Monitors and measures performance metrics during function execution
 * including execution time, memory usage, CPU usage, and resource consumption.
 */

class PerformanceMonitor {
    constructor() {
        this.measurements = new Map();
        this.baselines = new Map();
        this.regressionThreshold = 0.1; // 10% performance regression threshold
    }

    /**
     * Start a performance measurement
     * @param {string} id - Unique identifier for the measurement
     * @returns {Object} Measurement context
     */
    startMeasurement(id = null) {
        const measurementId = id || this.generateMeasurementId();
        
        const context = {
            id: measurementId,
            startTime: process.hrtime.bigint(),
            startMemory: process.memoryUsage(),
            startCpu: process.cpuUsage(),
            startTimestamp: Date.now()
        };

        this.measurements.set(measurementId, context);
        return context;
    }

    /**
     * End a performance measurement
     * @param {Object} context - Measurement context from startMeasurement
     * @returns {Object} Performance metrics
     */
    endMeasurement(context) {
        if (!context || !this.measurements.has(context.id)) {
            throw new Error('Invalid measurement context');
        }

        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        const endCpu = process.cpuUsage(context.startCpu);
        const endTimestamp = Date.now();

        const metrics = {
            id: context.id,
            executionTime: {
                nanoseconds: Number(endTime - context.startTime),
                milliseconds: Number(endTime - context.startTime) / 1000000,
                seconds: Number(endTime - context.startTime) / 1000000000
            },
            memoryUsage: {
                heapUsed: endMemory.heapUsed - context.startMemory.heapUsed,
                heapTotal: endMemory.heapTotal - context.startMemory.heapTotal,
                external: endMemory.external - context.startMemory.external,
                rss: endMemory.rss - context.startMemory.rss,
                peak: {
                    heapUsed: Math.max(endMemory.heapUsed, context.startMemory.heapUsed),
                    heapTotal: Math.max(endMemory.heapTotal, context.startMemory.heapTotal)
                }
            },
            cpuUsage: {
                user: endCpu.user,
                system: endCpu.system,
                total: endCpu.user + endCpu.system
            },
            wallClockTime: endTimestamp - context.startTimestamp,
            timestamp: {
                start: context.startTimestamp,
                end: endTimestamp
            }
        };

        // Clean up measurement context
        this.measurements.delete(context.id);

        return metrics;
    }

    /**
     * Measure the performance of a function execution
     * @param {Function} func - Function to measure
     * @param {Array} args - Arguments to pass to the function
     * @param {Object} options - Measurement options
     * @returns {Object} Function result and performance metrics
     */
    async measureFunction(func, args = [], options = {}) {
        const { iterations = 1, warmup = 0, id = null } = options;
        
        // Warmup runs (not measured)
        for (let i = 0; i < warmup; i++) {
            try {
                await func(...args);
            } catch (error) {
                // Ignore warmup errors
            }
        }

        const measurements = [];
        let lastResult = null;
        let lastError = null;

        // Actual measurements
        for (let i = 0; i < iterations; i++) {
            const context = this.startMeasurement(id ? `${id}_${i}` : null);
            
            try {
                lastResult = await func(...args);
                const metrics = this.endMeasurement(context);
                measurements.push(metrics);
            } catch (error) {
                const metrics = this.endMeasurement(context);
                metrics.error = error.message;
                measurements.push(metrics);
                lastError = error;
            }
        }

        return {
            result: lastResult,
            error: lastError,
            measurements,
            statistics: this.calculateStatistics(measurements),
            iterations,
            warmup
        };
    }

    /**
     * Calculate statistical metrics from multiple measurements
     * @param {Array} measurements - Array of performance measurements
     * @returns {Object} Statistical analysis
     */
    calculateStatistics(measurements) {
        if (measurements.length === 0) {
            return null;
        }

        const executionTimes = measurements.map(m => m.executionTime.milliseconds);
        const memoryUsages = measurements.map(m => m.memoryUsage.heapUsed);
        const cpuUsages = measurements.map(m => m.cpuUsage.total);

        return {
            executionTime: {
                min: Math.min(...executionTimes),
                max: Math.max(...executionTimes),
                mean: this.calculateMean(executionTimes),
                median: this.calculateMedian(executionTimes),
                standardDeviation: this.calculateStandardDeviation(executionTimes),
                percentiles: this.calculatePercentiles(executionTimes)
            },
            memoryUsage: {
                min: Math.min(...memoryUsages),
                max: Math.max(...memoryUsages),
                mean: this.calculateMean(memoryUsages),
                median: this.calculateMedian(memoryUsages),
                standardDeviation: this.calculateStandardDeviation(memoryUsages)
            },
            cpuUsage: {
                min: Math.min(...cpuUsages),
                max: Math.max(...cpuUsages),
                mean: this.calculateMean(cpuUsages),
                median: this.calculateMedian(cpuUsages),
                standardDeviation: this.calculateStandardDeviation(cpuUsages)
            },
            sampleSize: measurements.length
        };
    }

    /**
     * Compare performance between two sets of measurements
     * @param {Object} baseline - Baseline performance measurements
     * @param {Object} current - Current performance measurements
     * @returns {Object} Performance comparison results
     */
    comparePerformance(baseline, current) {
        if (!baseline.statistics || !current.statistics) {
            throw new Error('Both baseline and current measurements must have statistics');
        }

        const comparison = {
            executionTime: this.calculatePerformanceChange(
                baseline.statistics.executionTime.mean,
                current.statistics.executionTime.mean
            ),
            memoryUsage: this.calculatePerformanceChange(
                baseline.statistics.memoryUsage.mean,
                current.statistics.memoryUsage.mean
            ),
            cpuUsage: this.calculatePerformanceChange(
                baseline.statistics.cpuUsage.mean,
                current.statistics.cpuUsage.mean
            )
        };

        // Determine if there's a regression
        comparison.hasRegression = this.detectRegression(comparison);
        comparison.summary = this.generatePerformanceSummary(comparison);

        return comparison;
    }

    /**
     * Calculate performance change percentage
     * @param {number} baseline - Baseline value
     * @param {number} current - Current value
     * @returns {Object} Performance change information
     */
    calculatePerformanceChange(baseline, current) {
        const change = current - baseline;
        const percentageChange = baseline !== 0 ? (change / baseline) * 100 : 0;
        
        return {
            baseline,
            current,
            absoluteChange: change,
            percentageChange,
            improvement: change < 0, // Negative change is improvement for time/memory/cpu
            regression: change > (baseline * this.regressionThreshold)
        };
    }

    /**
     * Detect performance regression
     * @param {Object} comparison - Performance comparison results
     * @returns {boolean} True if regression detected
     */
    detectRegression(comparison) {
        return comparison.executionTime.regression ||
               comparison.memoryUsage.regression ||
               comparison.cpuUsage.regression;
    }

    /**
     * Generate performance summary
     * @param {Object} comparison - Performance comparison results
     * @returns {Object} Performance summary
     */
    generatePerformanceSummary(comparison) {
        const summary = {
            overall: 'neutral',
            improvements: [],
            regressions: [],
            details: {}
        };

        // Check execution time
        if (comparison.executionTime.improvement) {
            summary.improvements.push(`Execution time improved by ${Math.abs(comparison.executionTime.percentageChange).toFixed(2)}%`);
        } else if (comparison.executionTime.regression) {
            summary.regressions.push(`Execution time regressed by ${comparison.executionTime.percentageChange.toFixed(2)}%`);
        }

        // Check memory usage
        if (comparison.memoryUsage.improvement) {
            summary.improvements.push(`Memory usage improved by ${Math.abs(comparison.memoryUsage.percentageChange).toFixed(2)}%`);
        } else if (comparison.memoryUsage.regression) {
            summary.regressions.push(`Memory usage regressed by ${comparison.memoryUsage.percentageChange.toFixed(2)}%`);
        }

        // Check CPU usage
        if (comparison.cpuUsage.improvement) {
            summary.improvements.push(`CPU usage improved by ${Math.abs(comparison.cpuUsage.percentageChange).toFixed(2)}%`);
        } else if (comparison.cpuUsage.regression) {
            summary.regressions.push(`CPU usage regressed by ${comparison.cpuUsage.percentageChange.toFixed(2)}%`);
        }

        // Determine overall performance
        if (summary.regressions.length > 0) {
            summary.overall = 'regression';
        } else if (summary.improvements.length > 0) {
            summary.overall = 'improvement';
        }

        return summary;
    }

    /**
     * Set baseline performance for comparison
     * @param {string} name - Baseline name
     * @param {Object} measurements - Performance measurements
     */
    setBaseline(name, measurements) {
        this.baselines.set(name, measurements);
    }

    /**
     * Get baseline performance
     * @param {string} name - Baseline name
     * @returns {Object} Baseline measurements
     */
    getBaseline(name) {
        return this.baselines.get(name);
    }

    /**
     * Generate performance report
     * @param {Object} measurements - Performance measurements
     * @param {string} baselineName - Optional baseline name for comparison
     * @returns {Object} Performance report
     */
    generateReport(measurements, baselineName = null) {
        const report = {
            measurements,
            statistics: measurements.statistics,
            timestamp: new Date().toISOString(),
            comparison: null,
            recommendations: []
        };

        // Add comparison if baseline exists
        if (baselineName && this.baselines.has(baselineName)) {
            const baseline = this.baselines.get(baselineName);
            report.comparison = this.comparePerformance(baseline, measurements);
            report.recommendations = this.generateRecommendations(report.comparison);
        }

        return report;
    }

    /**
     * Generate performance recommendations
     * @param {Object} comparison - Performance comparison results
     * @returns {Array} Array of recommendations
     */
    generateRecommendations(comparison) {
        const recommendations = [];

        if (comparison.hasRegression) {
            recommendations.push({
                type: 'warning',
                category: 'performance',
                message: 'Performance regression detected. Consider optimizing the implementation.',
                priority: 'high',
                details: comparison.summary.regressions
            });
        }

        if (comparison.summary.improvements.length > 0) {
            recommendations.push({
                type: 'success',
                category: 'performance',
                message: 'Performance improvements detected.',
                priority: 'info',
                details: comparison.summary.improvements
            });
        }

        // Specific recommendations based on metrics
        if (comparison.memoryUsage.regression) {
            recommendations.push({
                type: 'optimization',
                category: 'memory',
                message: 'Consider memory optimization techniques such as object pooling or reducing allocations.',
                priority: 'medium'
            });
        }

        if (comparison.executionTime.regression) {
            recommendations.push({
                type: 'optimization',
                category: 'execution',
                message: 'Consider algorithmic optimizations or reducing computational complexity.',
                priority: 'medium'
            });
        }

        return recommendations;
    }

    /**
     * Utility methods for statistical calculations
     */
    calculateMean(values) {
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    calculateStandardDeviation(values) {
        const mean = this.calculateMean(values);
        const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
        const variance = this.calculateMean(squaredDifferences);
        return Math.sqrt(variance);
    }

    calculatePercentiles(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const percentiles = {};
        
        [50, 75, 90, 95, 99].forEach(p => {
            const index = Math.ceil((p / 100) * sorted.length) - 1;
            percentiles[`p${p}`] = sorted[Math.max(0, index)];
        });

        return percentiles;
    }

    generateMeasurementId() {
        return `measurement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default PerformanceMonitor;