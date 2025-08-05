/**
 * Tests for BehaviorComparisonSystem
 */

import { describe, test, expect, beforeEach } from 'vitest';
import BehaviorComparisonSystem from '../src/validation/BehaviorComparisonSystem.js';
import SideEffectTracker from '../src/validation/SideEffectTracker.js';
import PerformanceMonitor from '../src/validation/PerformanceMonitor.js';

describe('BehaviorComparisonSystem', () => {
    let behaviorComparison;

    beforeEach(() => {
        behaviorComparison = new BehaviorComparisonSystem();
    });

    describe('compareBehavior', () => {
        test('should detect functional equivalence for identical functions', async () => {
            const legacyFunction = (a, b) => a + b;
            const refactoredFunction = (x, y) => x + y;
            
            const testCases = [
                { name: 'basic addition', inputs: [2, 3] },
                { name: 'negative numbers', inputs: [-1, 5] },
                { name: 'zero values', inputs: [0, 0] }
            ];

            const result = await behaviorComparison.compareBehavior(
                legacyFunction,
                refactoredFunction,
                testCases
            );

            expect(result.functionalEquivalence).toBe(true);
            expect(result.summary.passed).toBe(3);
            expect(result.summary.failed).toBe(0);
            expect(result.testResults).toHaveLength(3);
        });

        test('should detect functional differences', async () => {
            const legacyFunction = (a, b) => a + b;
            const refactoredFunction = (x, y) => x * y; // Different behavior
            
            const testCases = [
                { name: 'different behavior', inputs: [2, 3] }
            ];

            const result = await behaviorComparison.compareBehavior(
                legacyFunction,
                refactoredFunction,
                testCases
            );

            expect(result.functionalEquivalence).toBe(false);
            expect(result.summary.passed).toBe(0);
            expect(result.summary.failed).toBe(1);
        });

        test('should handle async functions', async () => {
            const legacyFunction = async (value) => {
                return new Promise(resolve => {
                    setTimeout(() => resolve(value * 2), 10);
                });
            };
            
            const refactoredFunction = async (value) => {
                await new Promise(resolve => setTimeout(resolve, 5));
                return value * 2;
            };
            
            const testCases = [
                { name: 'async test', inputs: [5] }
            ];

            const result = await behaviorComparison.compareBehavior(
                legacyFunction,
                refactoredFunction,
                testCases
            );

            expect(result.functionalEquivalence).toBe(true);
            expect(result.testResults[0].legacyOutput).toBe(10);
            expect(result.testResults[0].refactoredOutput).toBe(10);
        });

        test('should handle function errors', async () => {
            const legacyFunction = (value) => {
                if (value < 0) throw new Error('Negative value');
                return value * 2;
            };
            
            const refactoredFunction = (value) => {
                if (value < 0) throw new Error('Negative value');
                return value * 2;
            };
            
            const testCases = [
                { name: 'error case', inputs: [-1] },
                { name: 'success case', inputs: [5] }
            ];

            const result = await behaviorComparison.compareBehavior(
                legacyFunction,
                refactoredFunction,
                testCases
            );

            expect(result.functionalEquivalence).toBe(true);
            expect(result.summary.passed).toBe(2);
        });
    });

    describe('deepCompare', () => {
        test('should compare primitive values correctly', () => {
            expect(behaviorComparison.deepCompare(5, 5)).toBe(true);
            expect(behaviorComparison.deepCompare(5, 6)).toBe(false);
            expect(behaviorComparison.deepCompare('hello', 'hello')).toBe(true);
            expect(behaviorComparison.deepCompare('hello', 'world')).toBe(false);
            expect(behaviorComparison.deepCompare(true, true)).toBe(true);
            expect(behaviorComparison.deepCompare(true, false)).toBe(false);
        });

        test('should compare null and undefined correctly', () => {
            expect(behaviorComparison.deepCompare(null, null)).toBe(true);
            expect(behaviorComparison.deepCompare(undefined, undefined)).toBe(true);
            expect(behaviorComparison.deepCompare(null, undefined)).toBe(false);
        });

        test('should compare objects correctly', () => {
            const obj1 = { a: 1, b: 2 };
            const obj2 = { a: 1, b: 2 };
            const obj3 = { a: 1, b: 3 };
            
            expect(behaviorComparison.deepCompare(obj1, obj2)).toBe(true);
            expect(behaviorComparison.deepCompare(obj1, obj3)).toBe(false);
        });

        test('should compare nested objects correctly', () => {
            const obj1 = { a: { b: { c: 1 } } };
            const obj2 = { a: { b: { c: 1 } } };
            const obj3 = { a: { b: { c: 2 } } };
            
            expect(behaviorComparison.deepCompare(obj1, obj2)).toBe(true);
            expect(behaviorComparison.deepCompare(obj1, obj3)).toBe(false);
        });

        test('should compare arrays correctly', () => {
            const arr1 = [1, 2, 3];
            const arr2 = [1, 2, 3];
            const arr3 = [1, 2, 4];
            
            expect(behaviorComparison.deepCompare(arr1, arr2)).toBe(true);
            expect(behaviorComparison.deepCompare(arr1, arr3)).toBe(false);
        });

        test('should handle special values', () => {
            expect(behaviorComparison.deepCompare(NaN, NaN)).toBe(true);
            
            const date1 = new Date(2023, 0, 1); // January 1, 2023
            const date2 = new Date(2023, 0, 1); // January 1, 2023
            const date3 = new Date(2023, 0, 2); // January 2, 2023
            
            expect(behaviorComparison.deepCompare(date1, date2)).toBe(true);
            expect(behaviorComparison.deepCompare(date1, date3)).toBe(false);
        });
    });

    describe('measurePerformance', () => {
        test('should measure function performance', async () => {
            const testFunction = (n) => {
                let sum = 0;
                for (let i = 0; i < n; i++) {
                    sum += i;
                }
                return sum;
            };

            const performance = await behaviorComparison.measurePerformance(testFunction, [1000]);

            expect(performance.executionTime).toBeGreaterThan(0);
            expect(typeof performance.memoryUsage).toBe('number');
            expect(typeof performance.cpuUsage).toBe('number');
        });
    });

    describe('comparePerformance', () => {
        test('should compare performance between functions', async () => {
            const slowFunction = async (n) => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return n * 2;
            };

            const fastFunction = (n) => n * 2;

            const testCases = [
                { name: 'performance test', inputs: [5] }
            ];

            const result = await behaviorComparison.comparePerformance(
                slowFunction,
                fastFunction,
                testCases
            );

            expect(result.hasRegression).toBe(false);
            expect(result.results).toHaveLength(1);
            expect(result.results[0].improvement.executionTime).toBeGreaterThan(0);
        });
    });

    describe('generateComparisonReport', () => {
        test('should generate comprehensive report', async () => {
            const legacyFunction = (a, b) => a + b;
            const refactoredFunction = (x, y) => x + y;
            
            const testCases = [
                { name: 'test case', inputs: [2, 3] }
            ];

            const comparisonResults = await behaviorComparison.compareBehavior(
                legacyFunction,
                refactoredFunction,
                testCases
            );

            const report = behaviorComparison.generateComparisonReport(comparisonResults);

            expect(report.summary).toBeDefined();
            expect(report.details).toBeDefined();
            expect(report.recommendations).toBeDefined();
            expect(report.timestamp).toBeDefined();
            expect(report.summary.functionalEquivalence).toBe(true);
        });
    });

    describe('generateRecommendations', () => {
        test('should generate success recommendations for passing tests', () => {
            const results = {
                functionalEquivalence: true,
                summary: { passed: 3, failed: 0, errors: 0, totalTests: 3 },
                sideEffectComparison: { allMatch: true },
                performanceComparison: { hasRegression: false }
            };

            const recommendations = behaviorComparison.generateRecommendations(results);

            expect(recommendations).toHaveLength(1);
            expect(recommendations[0].type).toBe('success');
            expect(recommendations[0].priority).toBe('info');
        });

        test('should generate critical recommendations for failed tests', () => {
            const results = {
                functionalEquivalence: false,
                summary: { passed: 1, failed: 2, errors: 0, totalTests: 3 },
                sideEffectComparison: { allMatch: true },
                performanceComparison: { hasRegression: false }
            };

            const recommendations = behaviorComparison.generateRecommendations(results);

            expect(recommendations.some(r => r.type === 'critical')).toBe(true);
            expect(recommendations.some(r => r.priority === 'high')).toBe(true);
        });

        test('should generate warning recommendations for side effect mismatches', () => {
            const results = {
                functionalEquivalence: true,
                summary: { passed: 3, failed: 0, errors: 0, totalTests: 3 },
                sideEffectComparison: { allMatch: false },
                performanceComparison: { hasRegression: false }
            };

            const recommendations = behaviorComparison.generateRecommendations(results);

            expect(recommendations.some(r => r.type === 'warning')).toBe(true);
            expect(recommendations.some(r => r.priority === 'medium')).toBe(true);
        });

        test('should generate performance recommendations for regressions', () => {
            const results = {
                functionalEquivalence: true,
                summary: { passed: 3, failed: 0, errors: 0, totalTests: 3 },
                sideEffectComparison: { allMatch: true },
                performanceComparison: { hasRegression: true }
            };

            const recommendations = behaviorComparison.generateRecommendations(results);

            expect(recommendations.some(r => r.type === 'performance')).toBe(true);
            expect(recommendations.some(r => r.priority === 'medium')).toBe(true);
        });
    });
});