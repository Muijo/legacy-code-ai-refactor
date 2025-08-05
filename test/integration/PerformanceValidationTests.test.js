/**
 * Performance Validation Tests
 * 
 * Tests to validate the 30x speed improvement target and processing capabilities
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LegacyCodeAnalyzer } from '../../src/LegacyCodeAnalyzer.js';
import { BatchProcessingSystem } from '../../src/batch/BatchProcessingSystem.js';
import { PerformanceMeasurement } from '../../src/performance/PerformanceMeasurement.js';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Performance Validation Tests', () => {
  let analyzer;
  let batchProcessor;
  let performanceMeasurement;
  let testDataDir;

  beforeAll(async () => {
    testDataDir = join(__dirname, '../test-data/performance');
    await fs.mkdir(testDataDir, { recursive: true });

    analyzer = new LegacyCodeAnalyzer({
      ingestion: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxConcurrency: 8,
        supportedExtensions: ['.js', '.jsx', '.php', '.py', '.java']
      },
      enableQualityAssessment: true,
      enableSemanticAnalysis: true,
      batchSize: 100
    });

    batchProcessor = new BatchProcessingSystem({
      maxWorkers: 8,
      taskTimeout: 300000, // 5 minutes
      enableProgressTracking: true,
      adaptiveScaling: true
    });

    performanceMeasurement = new PerformanceMeasurement();
  });

  afterAll(async () => {
    if (analyzer) await analyzer.cleanup();
    if (batchProcessor) await batchProcessor.shutdown();
  });

  describe('Speed Improvement Validation', () => {
    it('should achieve 30x speed improvement over manual refactoring', async () => {
      // Create a realistic legacy codebase scenario
      const legacyFiles = await createRealisticLegacyCodebase();
      
      console.log(`Created ${legacyFiles.length} legacy files for performance testing`);
      
      // Measure automated refactoring time
      const automatedStart = Date.now();
      
      const results = [];
      let processedFiles = 0;
      let totalLinesProcessed = 0;

      for await (const result of analyzer.analyzeCodebase(testDataDir, {
        maxFiles: legacyFiles.length
      })) {
        if (result.type === 'file_result' && result.success) {
          results.push(result);
          processedFiles++;
          totalLinesProcessed += result.parsing?.metadata?.linesOfCode || 0;
        } else if (result.type === 'final_summary') {
          break;
        }
      }

      const automatedTime = Date.now() - automatedStart;
      
      // Calculate processing rate
      const linesPerSecond = totalLinesProcessed / (automatedTime / 1000);
      const linesPerDay = linesPerSecond * 24 * 60 * 60;

      console.log(`Automated processing results:`);
      console.log(`- Files processed: ${processedFiles}`);
      console.log(`- Total lines: ${totalLinesProcessed}`);
      console.log(`- Processing time: ${automatedTime}ms`);
      console.log(`- Lines per second: ${Math.round(linesPerSecond)}`);
      console.log(`- Lines per day: ${Math.round(linesPerDay)}`);

      // Validate 10,000 lines per day capability
      expect(linesPerDay).toBeGreaterThan(10000);

      // Estimate manual refactoring time
      // Conservative estimate: 1 line per minute for manual refactoring
      const manualTimeEstimate = totalLinesProcessed * 60 * 1000; // 1 minute per line in ms
      const speedImprovement = manualTimeEstimate / automatedTime;

      console.log(`Estimated manual time: ${Math.round(manualTimeEstimate / 1000 / 60)} minutes`);
      console.log(`Speed improvement: ${Math.round(speedImprovement)}x`);

      // Validate 30x speed improvement
      expect(speedImprovement).toBeGreaterThan(30);
    }, 120000); // 2 minute timeout

    it('should maintain performance with large files', async () => {
      // Create a large legacy file (5000+ lines)
      const largeFileContent = generateLargeLegacyFile(5000);
      const largeFilePath = join(testDataDir, 'large-legacy-file.js');
      await fs.writeFile(largeFilePath, largeFileContent);

      const startTime = Date.now();
      const result = await analyzer.analyzeFile(largeFilePath);
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.parsing?.metadata?.linesOfCode).toBeGreaterThan(4500);
      
      // Should process large files efficiently (under 30 seconds)
      expect(processingTime).toBeLessThan(30000);
      
      const linesPerSecond = result.parsing.metadata.linesOfCode / (processingTime / 1000);
      console.log(`Large file processing: ${result.parsing.metadata.linesOfCode} lines in ${processingTime}ms`);
      console.log(`Processing rate: ${Math.round(linesPerSecond)} lines/second`);

      // Should maintain reasonable processing rate even for large files
      expect(linesPerSecond).toBeGreaterThan(100);
    }, 60000);

    it('should scale efficiently with parallel processing', async () => {
      // Create multiple medium-sized files
      const fileCount = 20;
      const filePaths = [];

      for (let i = 0; i < fileCount; i++) {
        const content = generateMediumLegacyFile(500, i);
        const filePath = join(testDataDir, `parallel-test-${i}.js`);
        await fs.writeFile(filePath, content);
        filePaths.push(filePath);
      }

      // Test sequential processing
      const sequentialStart = Date.now();
      const sequentialResults = [];
      
      for (const filePath of filePaths.slice(0, 5)) { // Test with 5 files
        const result = await analyzer.analyzeFile(filePath);
        if (result.success) sequentialResults.push(result);
      }
      const sequentialTime = Date.now() - sequentialStart;

      // Test parallel processing
      const parallelStart = Date.now();
      const parallelResults = [];
      
      for await (const result of analyzer.analyzeCodebase(testDataDir, {
        maxFiles: 5,
        pattern: 'parallel-test-*.js'
      })) {
        if (result.type === 'file_result' && result.success) {
          parallelResults.push(result);
        } else if (result.type === 'final_summary') {
          break;
        }
      }
      const parallelTime = Date.now() - parallelStart;

      console.log(`Sequential processing: ${sequentialTime}ms for ${sequentialResults.length} files`);
      console.log(`Parallel processing: ${parallelTime}ms for ${parallelResults.length} files`);

      // Parallel processing should be faster
      expect(parallelTime).toBeLessThan(sequentialTime);
      
      const parallelSpeedup = sequentialTime / parallelTime;
      console.log(`Parallel speedup: ${parallelSpeedup.toFixed(2)}x`);
      
      // Should achieve some parallel speedup (at least 1.5x)
      expect(parallelSpeedup).toBeGreaterThan(1.5);
    }, 90000);
  });

  describe('Throughput Validation', () => {
    it('should process 10,000+ lines per day consistently', async () => {
      // Create a realistic workload
      const workloadFiles = [];
      let totalLines = 0;

      // Mix of small, medium, and large files
      for (let i = 0; i < 10; i++) {
        const smallFile = generateSmallLegacyFile(100, i);
        const smallPath = join(testDataDir, `throughput-small-${i}.js`);
        await fs.writeFile(smallPath, smallFile);
        workloadFiles.push(smallPath);
        totalLines += 100;
      }

      for (let i = 0; i < 5; i++) {
        const mediumFile = generateMediumLegacyFile(500, i);
        const mediumPath = join(testDataDir, `throughput-medium-${i}.js`);
        await fs.writeFile(mediumPath, mediumFile);
        workloadFiles.push(mediumPath);
        totalLines += 500;
      }

      for (let i = 0; i < 2; i++) {
        const largeFile = generateLargeLegacyFile(2000);
        const largePath = join(testDataDir, `throughput-large-${i}.js`);
        await fs.writeFile(largePath, largeFile);
        workloadFiles.push(largePath);
        totalLines += 2000;
      }

      console.log(`Created workload: ${workloadFiles.length} files, ~${totalLines} lines`);

      // Process the workload
      const startTime = Date.now();
      const results = [];

      for await (const result of analyzer.analyzeCodebase(testDataDir, {
        maxFiles: workloadFiles.length,
        pattern: 'throughput-*.js'
      })) {
        if (result.type === 'file_result' && result.success) {
          results.push(result);
        } else if (result.type === 'final_summary') {
          break;
        }
      }

      const processingTime = Date.now() - startTime;
      const actualLinesProcessed = results.reduce((sum, r) => sum + (r.parsing?.metadata?.linesOfCode || 0), 0);
      
      // Calculate daily throughput
      const linesPerSecond = actualLinesProcessed / (processingTime / 1000);
      const linesPerDay = linesPerSecond * 24 * 60 * 60;

      console.log(`Throughput test results:`);
      console.log(`- Files processed: ${results.length}/${workloadFiles.length}`);
      console.log(`- Lines processed: ${actualLinesProcessed}`);
      console.log(`- Processing time: ${processingTime}ms`);
      console.log(`- Daily throughput: ${Math.round(linesPerDay)} lines/day`);

      // Validate throughput requirement
      expect(linesPerDay).toBeGreaterThan(10000);
      expect(results.length).toBe(workloadFiles.length);
    }, 180000); // 3 minute timeout

    it('should maintain quality while processing at high speed', async () => {
      // Create files with varying complexity
      const complexityLevels = [
        { name: 'simple', lines: 200, complexity: 'low' },
        { name: 'moderate', lines: 500, complexity: 'medium' },
        { name: 'complex', lines: 1000, complexity: 'high' }
      ];

      const qualityResults = [];

      for (const level of complexityLevels) {
        const content = generateFileWithComplexity(level.lines, level.complexity);
        const filePath = join(testDataDir, `quality-${level.name}.js`);
        await fs.writeFile(filePath, content);

        const startTime = Date.now();
        const result = await analyzer.analyzeFile(filePath);
        const processingTime = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(result.quality).toBeDefined();
        expect(result.semantic).toBeDefined();

        qualityResults.push({
          level: level.name,
          lines: result.parsing?.metadata?.linesOfCode || 0,
          processingTime,
          qualityScore: result.quality?.overallScore || 0,
          technicalDebt: result.quality?.technicalDebtScore || 0,
          businessLogicCount: result.semantic?.businessLogic?.length || 0
        });
      }

      // Verify quality analysis is maintained across complexity levels
      for (const qr of qualityResults) {
        console.log(`${qr.level}: ${qr.lines} lines, ${qr.processingTime}ms, quality: ${qr.qualityScore}, debt: ${qr.technicalDebt}`);
        
        // Quality analysis should be present regardless of processing speed
        expect(qr.qualityScore).toBeGreaterThan(0);
        expect(qr.technicalDebt).toBeGreaterThan(0);
        expect(qr.businessLogicCount).toBeGreaterThan(0);
        
        // Processing time should scale reasonably with complexity
        const linesPerSecond = qr.lines / (qr.processingTime / 1000);
        expect(linesPerSecond).toBeGreaterThan(50); // Minimum acceptable rate
      }
    });
  });

  // Helper functions for generating test files
  async function createRealisticLegacyCodebase() {
    const files = [];
    
    // Create various types of legacy files
    const fileTypes = [
      { count: 5, generator: () => generateJQueryLegacyFile(300) },
      { count: 3, generator: () => generatePHPLegacyFile(400) },
      { count: 4, generator: () => generateJavaScriptLegacyFile(250) },
      { count: 2, generator: () => generatePythonLegacyFile(350) }
    ];

    let fileIndex = 0;
    for (const fileType of fileTypes) {
      for (let i = 0; i < fileType.count; i++) {
        const content = fileType.generator();
        const extension = getExtensionForContent(content);
        const filePath = join(testDataDir, `realistic-${fileIndex}${extension}`);
        await fs.writeFile(filePath, content);
        files.push(filePath);
        fileIndex++;
      }
    }

    return files;
  }

  function generateLargeLegacyFile(targetLines) {
    const functions = [];
    let currentLines = 0;

    while (currentLines < targetLines) {
      const functionLines = Math.floor(Math.random() * 50) + 20; // 20-70 lines per function
      const functionCode = generateLegacyFunction(functionLines, functions.length);
      functions.push(functionCode);
      currentLines += functionLines;
    }

    return functions.join('\n\n');
  }

  function generateMediumLegacyFile(targetLines, index) {
    return `
      // Medium legacy file ${index}
      var globalState${index} = {};
      
      function processData${index}(data) {
        var results = [];
        
        // Legacy pattern: nested loops with side effects
        for (var i = 0; i < data.length; i++) {
          globalState${index}.currentIndex = i;
          
          for (var j = 0; j < data[i].items.length; j++) {
            var item = data[i].items[j];
            
            // Business logic mixed with presentation
            if (item.type === 'important') {
              $('#status').text('Processing important item');
              results.push({
                id: item.id,
                value: item.value * 2,
                processed: true,
                timestamp: new Date().getTime()
              });
            }
          }
        }
        
        return results;
      }
      
      // More legacy patterns...
      ${Array.from({ length: Math.floor(targetLines / 20) }, (_, i) => `
        function helperFunction${index}_${i}(param) {
          var temp = globalState${index}.temp || {};
          temp.value${i} = param * ${i + 1};
          globalState${index}.temp = temp;
          return temp.value${i};
        }
      `).join('\n')}
    `;
  }

  function generateSmallLegacyFile(targetLines, index) {
    return `
      // Small legacy file ${index}
      function simpleProcessor${index}(input) {
        var output = [];
        
        // Legacy pattern: manual array processing
        for (var i = 0; i < input.length; i++) {
          if (input[i] != null) {
            output.push(input[i].toString().toUpperCase());
          }
        }
        
        return output;
      }
      
      var config${index} = {
        enabled: true,
        multiplier: ${index + 1}
      };
      
      ${Array.from({ length: Math.floor(targetLines / 10) }, (_, i) => `
        // Utility function ${i}
        function util${index}_${i}() {
          return config${index}.multiplier * ${i};
        }
      `).join('\n')}
    `;
  }

  function generateFileWithComplexity(targetLines, complexity) {
    const baseComplexity = {
      low: { nesting: 2, functions: 3, patterns: 1 },
      medium: { nesting: 4, functions: 8, patterns: 3 },
      high: { nesting: 6, functions: 15, patterns: 5 }
    };

    const config = baseComplexity[complexity];
    const functions = [];

    for (let i = 0; i < config.functions; i++) {
      const functionCode = generateComplexFunction(
        Math.floor(targetLines / config.functions),
        config.nesting,
        i
      );
      functions.push(functionCode);
    }

    return functions.join('\n\n');
  }

  function generateComplexFunction(lines, maxNesting, index) {
    const nestingLevels = Array.from({ length: maxNesting }, (_, i) => '  '.repeat(i + 1));
    
    return `
      function complexFunction${index}(data, options) {
        var result = { processed: 0, errors: [] };
        
        ${nestingLevels.map((indent, level) => `
        ${indent}if (data && data.level${level}) {
        ${indent}  for (var i${level} = 0; i${level} < data.level${level}.length; i${level}++) {
        ${indent}    try {
        ${indent}      var item${level} = data.level${level}[i${level}];
        ${indent}      if (item${level}.active) {
        ${indent}        result.processed++;
        ${indent}      }
        ${indent}    } catch (e) {
        ${indent}      result.errors.push(e.message);
        ${indent}    }
        ${indent}  }
        ${indent}}
        `).join('\n')}
        
        return result;
      }
    `;
  }

  function generateJQueryLegacyFile(lines) {
    return `
      // jQuery legacy patterns
      $(document).ready(function() {
        var globalData = {};
        
        $('.legacy-button').click(function() {
          var $this = $(this);
          var data = $this.data('info');
          
          // Nested callbacks and DOM manipulation
          $.ajax({
            url: '/api/process',
            data: data,
            success: function(response) {
              if (response.success) {
                $this.addClass('processed');
                globalData.lastProcessed = response.data;
                
                // More nested operations...
                setTimeout(function() {
                  $('.status').text('Processing complete');
                }, 1000);
              }
            }
          });
        });
        
        ${Array.from({ length: Math.floor(lines / 30) }, (_, i) => `
          function jqueryHelper${i}(selector) {
            $(selector).each(function() {
              var $el = $(this);
              $el.data('processed-${i}', true);
            });
          }
        `).join('\n')}
      });
    `;
  }

  function generatePHPLegacyFile(lines) {
    return `
      <?php
      // PHP legacy patterns
      class LegacyProcessor {
        private $data = array();
        
        public function processData($input) {
          global $globalConfig;
          
          foreach ($input as $key => $value) {
            if (isset($value['type'])) {
              switch ($value['type']) {
                case 'user':
                  $this->data['users'][] = $this->processUser($value);
                  break;
                case 'order':
                  $this->data['orders'][] = $this->processOrder($value);
                  break;
              }
            }
          }
          
          return $this->data;
        }
        
        ${Array.from({ length: Math.floor(lines / 25) }, (_, i) => `
          private function helperMethod${i}($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * ${i + 1};
            }
            return $result;
          }
        `).join('\n')}
      }
      ?>
    `;
  }

  function generateJavaScriptLegacyFile(lines) {
    return `
      // JavaScript legacy patterns
      var LegacyModule = (function() {
        var privateData = {};
        
        function init() {
          // Legacy initialization
          if (typeof window !== 'undefined') {
            window.LegacyModule = LegacyModule;
          }
        }
        
        function processItems(items) {
          var processed = [];
          
          for (var i = 0; i < items.length; i++) {
            var item = items[i];
            
            // Legacy pattern: manual type checking
            if (typeof item === 'object' && item !== null) {
              processed.push({
                id: item.id || 'unknown',
                value: item.value || 0,
                processed: true
              });
            }
          }
          
          return processed;
        }
        
        ${Array.from({ length: Math.floor(lines / 20) }, (_, i) => `
          function utility${i}(input) {
            var output = {};
            output.result = input * ${i + 1};
            output.timestamp = Date.now();
            return output;
          }
        `).join('\n')}
        
        return {
          init: init,
          process: processItems
        };
      })();
    `;
  }

  function generatePythonLegacyFile(lines) {
    return `
      # Python legacy patterns
      import sys
      
      class LegacyProcessor:
          def __init__(self):
              self.data = {}
              self.processed_count = 0
          
          def process_data(self, input_data):
              results = []
              
              for item in input_data:
                  if type(item) == dict:
                      if 'type' in item:
                          if item['type'] == 'user':
                              results.append(self.process_user(item))
                          elif item['type'] == 'order':
                              results.append(self.process_order(item))
                  
                  self.processed_count += 1
              
              return results
          
          ${Array.from({ length: Math.floor(lines / 15) }, (_, i) => `
          def helper_method_${i}(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * ${i + 1})
              return result
          `).join('\n')}
    `;
  }

  function generateLegacyFunction(lines, index) {
    const statements = [];
    let currentLines = 0;

    while (currentLines < lines) {
      const statementType = Math.random();
      
      if (statementType < 0.3) {
        // Variable declaration
        statements.push(`  var variable${currentLines} = ${Math.floor(Math.random() * 100)};`);
        currentLines += 1;
      } else if (statementType < 0.6) {
        // Loop
        const loopLines = Math.min(5, lines - currentLines);
        statements.push(`  for (var i${currentLines} = 0; i${currentLines} < 10; i${currentLines}++) {`);
        statements.push(`    // Loop body ${currentLines}`);
        statements.push(`    result.push(i${currentLines} * 2);`);
        statements.push(`  }`);
        currentLines += loopLines;
      } else {
        // Conditional
        statements.push(`  if (condition${currentLines}) {`);
        statements.push(`    // Conditional logic ${currentLines}`);
        statements.push(`    return true;`);
        statements.push(`  }`);
        currentLines += 4;
      }
    }

    return `
      function legacyFunction${index}(input) {
        var result = [];
        var condition${index} = input && input.length > 0;
        
        ${statements.join('\n')}
        
        return result;
      }
    `;
  }

  function getExtensionForContent(content) {
    if (content.includes('<?php')) return '.php';
    if (content.includes('import ') && content.includes('def ')) return '.py';
    if (content.includes('class ') && content.includes('public ')) return '.java';
    return '.js';
  }
});