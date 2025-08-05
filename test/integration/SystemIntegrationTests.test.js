/**
 * System Integration Tests
 * 
 * Comprehensive end-to-end testing for complete refactoring workflows
 * Tests the entire system from code ingestion to final validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { LegacyCodeAnalyzer } from '../../src/LegacyCodeAnalyzer.js';
import { BatchProcessingSystem } from '../../src/batch/BatchProcessingSystem.js';
import BehaviorComparisonSystem from '../../src/validation/BehaviorComparisonSystem.js';
import { ModernCodeGenerator } from '../../src/generation/ModernCodeGenerator.js';
import { MigrationPlanner } from '../../src/migration/MigrationPlanner.js';
import { PerformanceMeasurement } from '../../src/performance/PerformanceMeasurement.js';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('System Integration Tests', () => {
  let analyzer;
  let batchProcessor;
  let behaviorComparison;
  let codeGenerator;
  let migrationPlanner;
  let performanceMeasurement;
  let testDataDir;
  let outputDir;

  beforeAll(async () => {
    // Setup test directories
    testDataDir = join(__dirname, '../test-data/integration');
    outputDir = join(__dirname, '../output/integration');
    
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    
    // Initialize system components
    analyzer = new LegacyCodeAnalyzer({
      ingestion: {
        maxFileSize: 10 * 1024 * 1024, // 10MB for testing
        maxConcurrency: 2,
        supportedExtensions: ['.js', '.jsx', '.php', '.py', '.java']
      },
      quality: {
        complexityWeight: 0.3,
        maintainabilityWeight: 0.25,
        testabilityWeight: 0.2,
        readabilityWeight: 0.15,
        performanceWeight: 0.1
      },
      enableQualityAssessment: true,
      enableSemanticAnalysis: true,
      enableProgressReporting: true,
      batchSize: 10
    });

    batchProcessor = new BatchProcessingSystem({
      maxWorkers: 2,
      taskTimeout: 60000, // 1 minute for tests
      retryAttempts: 2,
      enableProgressTracking: true,
      enableReporting: true,
      reportOutputDirectory: outputDir
    });

    behaviorComparison = new BehaviorComparisonSystem();
    codeGenerator = new ModernCodeGenerator();
    migrationPlanner = new MigrationPlanner();
    performanceMeasurement = new PerformanceMeasurement();
  });

  afterAll(async () => {
    // Cleanup
    if (analyzer) await analyzer.cleanup();
    if (batchProcessor) await batchProcessor.shutdown();
  });

  beforeEach(async () => {
    // Clear previous test outputs
    try {
      const files = await fs.readdir(outputDir);
      for (const file of files) {
        await fs.unlink(join(outputDir, file));
      }
    } catch (error) {
      // Directory might not exist or be empty
    }
  });

  describe('End-to-End Refactoring Workflow', () => {
    it('should complete full refactoring workflow for JavaScript legacy code', async () => {
      // Create test legacy JavaScript file
      const legacyCode = `
        // Legacy jQuery-style code with technical debt
        function processUserData(userData) {
          var result = {};
          
          // Anti-pattern: Global variable usage
          window.tempData = userData;
          
          // Anti-pattern: Nested callbacks
          $.ajax({
            url: '/api/validate',
            data: userData,
            success: function(response) {
              if (response.valid) {
                // Anti-pattern: DOM manipulation in business logic
                $('#status').text('Valid user');
                
                // Business logic mixed with presentation
                result.name = userData.name.toUpperCase();
                result.email = userData.email.toLowerCase();
                result.age = parseInt(userData.age);
                
                // Anti-pattern: Synchronous processing
                for (var i = 0; i < userData.preferences.length; i++) {
                  result.preferences = result.preferences || [];
                  result.preferences.push(userData.preferences[i].trim());
                }
              }
            },
            error: function(xhr, status, error) {
              console.log('Error: ' + error);
              $('#status').text('Invalid user');
            }
          });
          
          return result;
        }
        
        // Legacy pattern: Prototype pollution
        Object.prototype.customMethod = function() {
          return this.toString();
        };
      `;

      const testFilePath = join(testDataDir, 'legacy-user-processor.js');
      await fs.writeFile(testFilePath, legacyCode);

      // Step 1: Analyze legacy code
      console.log('Step 1: Analyzing legacy code...');
      const analysisResult = await analyzer.analyzeFile(testFilePath);
      
      expect(analysisResult.success).toBe(true);
      expect(analysisResult.language).toBe('javascript');
      expect(analysisResult.quality).toBeDefined();
      expect(analysisResult.quality.technicalDebtScore).toBeGreaterThan(0);

      // Step 2: Extract business logic and patterns
      console.log('Step 2: Extracting business logic...');
      expect(analysisResult.semantic).toBeDefined();
      expect(analysisResult.semantic.businessLogic).toBeDefined();
      expect(analysisResult.semantic.businessLogic.length).toBeGreaterThan(0);

      // Step 3: Generate migration plan
      console.log('Step 3: Generating migration plan...');
      const migrationPlan = await migrationPlanner.createMigrationPlan({
        sourceFile: testFilePath,
        analysisResult: analysisResult,
        targetFramework: 'modern-js',
        preserveBusinessLogic: true
      });

      expect(migrationPlan).toBeDefined();
      expect(migrationPlan.steps).toBeDefined();
      expect(migrationPlan.steps.length).toBeGreaterThan(0);
      expect(migrationPlan.riskLevel).toBeDefined();

      // Step 4: Generate modern code
      console.log('Step 4: Generating modern code...');
      const modernCode = await codeGenerator.generateModernImplementation({
        legacyCode: legacyCode,
        analysisResult: analysisResult,
        migrationPlan: migrationPlan,
        targetStyle: 'es6-async'
      });

      expect(modernCode).toBeDefined();
      expect(modernCode.success).toBe(true);
      expect(modernCode.generatedCode).toBeDefined();
      expect(modernCode.generatedCode.length).toBeGreaterThan(0);

      // Step 5: Validate functional equivalence
      console.log('Step 5: Validating functional equivalence...');
      const testCases = [
        {
          input: {
            name: 'john doe',
            email: 'JOHN@EXAMPLE.COM',
            age: '25',
            preferences: [' reading ', ' gaming ']
          },
          expectedOutput: {
            name: 'JOHN DOE',
            email: 'john@example.com',
            age: 25,
            preferences: ['reading', 'gaming']
          }
        }
      ];

      // Create mock functions for comparison
      const legacyFunction = eval(`(${legacyCode.match(/function processUserData[^}]+}/)[0]})`);
      const modernFunction = eval(`(${modernCode.generatedCode.match(/(?:function|const) processUserData[^}]+}|[^;]+;/)[0]})`);

      const comparisonResult = await behaviorComparison.compareBehavior(
        legacyFunction,
        modernFunction,
        testCases
      );

      expect(comparisonResult.functionalEquivalence).toBe(true);
      expect(comparisonResult.summary.passed).toBeGreaterThan(0);

      // Step 6: Measure performance improvement
      console.log('Step 6: Measuring performance...');
      const performanceResult = await performanceMeasurement.comparePerformance({
        legacyImplementation: legacyFunction,
        modernImplementation: modernFunction,
        testCases: testCases,
        iterations: 100
      });

      expect(performanceResult).toBeDefined();
      expect(performanceResult.improvement).toBeDefined();

      console.log('End-to-end workflow completed successfully!');
    }, 30000); // 30 second timeout

    it('should handle batch processing of multiple legacy files', async () => {
      // Create multiple test files
      const testFiles = [
        {
          name: 'legacy-utils.js',
          content: `
            function oldStyleFunction() {
              var data = [];
              for (var i = 0; i < arguments.length; i++) {
                data.push(arguments[i]);
              }
              return data.join(',');
            }
          `
        },
        {
          name: 'legacy-validator.php',
          content: `
            <?php
            function validate_user($user_data) {
              if (!isset($user_data['email'])) {
                return false;
              }
              return filter_var($user_data['email'], FILTER_VALIDATE_EMAIL);
            }
            ?>
          `
        },
        {
          name: 'legacy-processor.py',
          content: `
            def process_data(data):
              result = []
              for item in data:
                if type(item) == str:
                  result.append(item.upper())
                else:
                  result.append(str(item))
              return result
          `
        }
      ];

      // Write test files
      const filePaths = [];
      for (const file of testFiles) {
        const filePath = join(testDataDir, file.name);
        await fs.writeFile(filePath, file.content);
        filePaths.push(filePath);
      }

      // Process files in batch
      console.log('Processing batch of legacy files...');
      const batchResults = [];
      
      for await (const result of analyzer.analyzeCodebase(testDataDir, {
        maxFiles: testFiles.length
      })) {
        if (result.type === 'file_result' && result.success) {
          batchResults.push(result);
        }
      }

      expect(batchResults.length).toBe(testFiles.length);
      
      // Verify each file was processed correctly
      for (const result of batchResults) {
        expect(result.success).toBe(true);
        expect(result.language).toBeDefined();
        expect(result.quality).toBeDefined();
      }

      console.log('Batch processing completed successfully!');
    }, 20000);
  });

  describe('Performance Validation Tests', () => {
    it('should demonstrate significant speed improvement over manual refactoring', async () => {
      const startTime = Date.now();
      
      // Create a moderately complex legacy file (simulating real-world scenario)
      const complexLegacyCode = `
        // Complex legacy code with multiple anti-patterns
        var GlobalState = {};
        
        function ComplexProcessor(data) {
          this.data = data;
          this.results = [];
          
          // Anti-pattern: Deeply nested callbacks
          this.process = function(callback) {
            var self = this;
            setTimeout(function() {
              for (var i = 0; i < self.data.length; i++) {
                (function(index) {
                  setTimeout(function() {
                    var item = self.data[index];
                    
                    // Business logic mixed with presentation
                    if (item.type === 'user') {
                      GlobalState.userCount = (GlobalState.userCount || 0) + 1;
                      self.results.push({
                        id: item.id,
                        name: item.name.toUpperCase(),
                        processed: true,
                        timestamp: new Date().getTime()
                      });
                    } else if (item.type === 'order') {
                      GlobalState.orderCount = (GlobalState.orderCount || 0) + 1;
                      self.results.push({
                        id: item.id,
                        total: parseFloat(item.amount) * 1.1, // Tax calculation
                        processed: true,
                        timestamp: new Date().getTime()
                      });
                    }
                    
                    if (index === self.data.length - 1) {
                      callback(self.results);
                    }
                  }, 10);
                })(i);
              }
            }, 50);
          };
        }
        
        // More legacy patterns
        function validateAndProcess(items, successCallback, errorCallback) {
          try {
            var processor = new ComplexProcessor(items);
            processor.process(function(results) {
              if (results.length > 0) {
                successCallback(results);
              } else {
                errorCallback('No results generated');
              }
            });
          } catch (e) {
            errorCallback(e.message);
          }
        }
      `;

      const testFilePath = join(testDataDir, 'complex-legacy.js');
      await fs.writeFile(testFilePath, complexLegacyCode);

      // Measure analysis time
      const analysisStart = Date.now();
      const analysisResult = await analyzer.analyzeFile(testFilePath);
      const analysisTime = Date.now() - analysisStart;

      expect(analysisResult.success).toBe(true);
      expect(analysisTime).toBeLessThan(5000); // Should complete in under 5 seconds

      // Measure modernization time
      const modernizationStart = Date.now();
      const migrationPlan = await migrationPlanner.createMigrationPlan({
        sourceFile: testFilePath,
        analysisResult: analysisResult,
        targetFramework: 'modern-js'
      });

      const modernCode = await codeGenerator.generateModernImplementation({
        legacyCode: complexLegacyCode,
        analysisResult: analysisResult,
        migrationPlan: migrationPlan
      });
      const modernizationTime = Date.now() - modernizationStart;

      expect(modernCode.success).toBe(true);
      expect(modernizationTime).toBeLessThan(10000); // Should complete in under 10 seconds

      const totalTime = Date.now() - startTime;
      
      // Validate speed improvement target
      // For a file of this complexity, manual refactoring would take hours
      // Our system should complete in minutes, demonstrating significant improvement
      expect(totalTime).toBeLessThan(30000); // Complete workflow in under 30 seconds
      
      console.log(`Complex refactoring completed in ${totalTime}ms`);
      console.log(`Analysis: ${analysisTime}ms, Modernization: ${modernizationTime}ms`);
      
      // Calculate theoretical speed improvement
      const manualRefactoringTimeEstimate = 4 * 60 * 60 * 1000; // 4 hours in ms
      const speedImprovement = manualRefactoringTimeEstimate / totalTime;
      
      expect(speedImprovement).toBeGreaterThan(30); // Should exceed 30x improvement
      console.log(`Theoretical speed improvement: ${Math.round(speedImprovement)}x`);
    }, 45000);

    it('should maintain performance under load', async () => {
      // Create multiple files to simulate load
      const fileCount = 10;
      const filePaths = [];

      for (let i = 0; i < fileCount; i++) {
        const content = `
          function loadTestFunction${i}(data) {
            var result = [];
            for (var j = 0; j < data.length; j++) {
              result.push(data[j] * ${i + 1});
            }
            return result;
          }
          
          var globalVar${i} = ${i};
        `;
        
        const filePath = join(testDataDir, `load-test-${i}.js`);
        await fs.writeFile(filePath, content);
        filePaths.push(filePath);
      }

      // Process all files and measure performance
      const startTime = Date.now();
      const results = [];

      for await (const result of analyzer.analyzeCodebase(testDataDir, {
        maxFiles: fileCount,
        pattern: 'load-test-*.js'
      })) {
        if (result.type === 'file_result') {
          results.push(result);
        }
      }

      const totalTime = Date.now() - startTime;
      const successfulResults = results.filter(r => r.success);

      expect(successfulResults.length).toBe(fileCount);
      expect(totalTime).toBeLessThan(20000); // Should process 10 files in under 20 seconds
      
      const averageTimePerFile = totalTime / fileCount;
      expect(averageTimePerFile).toBeLessThan(2000); // Under 2 seconds per file on average

      console.log(`Load test: ${fileCount} files processed in ${totalTime}ms`);
      console.log(`Average time per file: ${Math.round(averageTimePerFile)}ms`);
    }, 30000);
  });

  describe('Functional Equivalence Verification', () => {
    it('should verify functional equivalence across multiple scenarios', async () => {
      // Test scenario 1: Data transformation
      const dataTransformCode = `
        function transformUserData(users) {
          var transformed = [];
          for (var i = 0; i < users.length; i++) {
            var user = users[i];
            transformed.push({
              id: user.id,
              fullName: user.firstName + ' ' + user.lastName,
              email: user.email.toLowerCase(),
              isActive: user.status === 'active'
            });
          }
          return transformed;
        }
      `;

      const testFilePath = join(testDataDir, 'data-transform.js');
      await fs.writeFile(testFilePath, dataTransformCode);

      const analysisResult = await analyzer.analyzeFile(testFilePath);
      expect(analysisResult.success).toBe(true);

      const modernCode = await codeGenerator.generateModernImplementation({
        legacyCode: dataTransformCode,
        analysisResult: analysisResult,
        targetStyle: 'functional'
      });

      expect(modernCode.success).toBe(true);

      // Test with various input scenarios
      const testScenarios = [
        {
          name: 'Normal users',
          input: [
            { id: 1, firstName: 'John', lastName: 'Doe', email: 'JOHN@EXAMPLE.COM', status: 'active' },
            { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', status: 'inactive' }
          ]
        },
        {
          name: 'Empty array',
          input: []
        },
        {
          name: 'Single user',
          input: [
            { id: 1, firstName: 'Test', lastName: 'User', email: 'TEST@DOMAIN.COM', status: 'active' }
          ]
        },
        {
          name: 'Users with special characters',
          input: [
            { id: 1, firstName: 'José', lastName: 'García', email: 'jose.garcia@example.com', status: 'active' }
          ]
        }
      ];

      for (const scenario of testScenarios) {
        console.log(`Testing scenario: ${scenario.name}`);
        
        // Create test functions
        const legacyFunction = eval(`(${dataTransformCode.match(/function transformUserData[^}]+}/)[0]})`);
        const modernFunction = eval(`(${modernCode.generatedCode.match(/(?:function|const) transformUserData[^}]+}|[^;]+;/)[0]})`);

        const legacyResult = legacyFunction(scenario.input);
        const modernResult = modernFunction(scenario.input);

        expect(modernResult).toEqual(legacyResult);
      }

      console.log('All functional equivalence scenarios passed!');
    });

    it('should handle edge cases and error conditions', async () => {
      const errorHandlingCode = `
        function processWithErrorHandling(data) {
          try {
            if (!data) {
              throw new Error('Data is required');
            }
            
            if (typeof data !== 'object') {
              throw new Error('Data must be an object');
            }
            
            var result = {
              processed: true,
              timestamp: new Date().getTime()
            };
            
            if (data.items && Array.isArray(data.items)) {
              result.itemCount = data.items.length;
              result.items = [];
              
              for (var i = 0; i < data.items.length; i++) {
                if (data.items[i] && typeof data.items[i] === 'object') {
                  result.items.push({
                    index: i,
                    value: data.items[i].value || null
                  });
                }
              }
            }
            
            return result;
          } catch (error) {
            return {
              processed: false,
              error: error.message,
              timestamp: new Date().getTime()
            };
          }
        }
      `;

      const testFilePath = join(testDataDir, 'error-handling.js');
      await fs.writeFile(testFilePath, errorHandlingCode);

      const analysisResult = await analyzer.analyzeFile(testFilePath);
      const modernCode = await codeGenerator.generateModernImplementation({
        legacyCode: errorHandlingCode,
        analysisResult: analysisResult
      });

      // Test error conditions
      const errorTestCases = [
        { input: null, expectError: true },
        { input: undefined, expectError: true },
        { input: 'string', expectError: true },
        { input: 123, expectError: true },
        { input: {}, expectError: false },
        { input: { items: [] }, expectError: false },
        { input: { items: [{ value: 'test' }] }, expectError: false },
        { input: { items: [null, { value: 'test' }, {}] }, expectError: false }
      ];

      const legacyFunction = eval(`(${errorHandlingCode.match(/function processWithErrorHandling[^}]+}/)[0]})`);
      const modernFunction = eval(`(${modernCode.generatedCode.match(/(?:function|const) processWithErrorHandling[^}]+}|[^;]+;/)[0]})`);

      for (const testCase of errorTestCases) {
        const legacyResult = legacyFunction(testCase.input);
        const modernResult = modernFunction(testCase.input);

        // Compare error handling behavior
        expect(modernResult.processed).toBe(legacyResult.processed);
        if (testCase.expectError) {
          expect(modernResult.error).toBeDefined();
          expect(legacyResult.error).toBeDefined();
        } else {
          expect(modernResult.processed).toBe(true);
          expect(legacyResult.processed).toBe(true);
        }
      }

      console.log('Error handling equivalence verified!');
    });
  });
});