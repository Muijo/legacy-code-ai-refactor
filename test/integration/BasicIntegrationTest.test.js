/**
 * Basic Integration Test
 * 
 * Simple test to verify the integration test setup works correctly
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LegacyCodeAnalyzer } from '../../src/LegacyCodeAnalyzer.js';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Basic Integration Test', () => {
  let analyzer;
  let testDataDir;

  beforeAll(async () => {
    testDataDir = join(__dirname, '../test-data/basic');
    await fs.mkdir(testDataDir, { recursive: true });

    analyzer = new LegacyCodeAnalyzer({
      enableQualityAssessment: true,
      enableSemanticAnalysis: true,
      enableProgressReporting: false
    });
  });

  afterAll(async () => {
    if (analyzer) await analyzer.cleanup();
  });

  it('should analyze a simple legacy JavaScript file', async () => {
    const simpleCode = `
      // Simple legacy JavaScript code
      function processData(data) {
        var result = [];
        
        for (var i = 0; i < data.length; i++) {
          if (data[i] && data[i].valid) {
            result.push({
              id: data[i].id,
              name: data[i].name || 'Unknown',
              processed: true
            });
          }
        }
        
        return result;
      }
      
      var globalConfig = {
        enabled: true,
        version: '1.0'
      };
    `;

    const testFilePath = join(testDataDir, 'simple-legacy.js');
    await fs.writeFile(testFilePath, simpleCode);

    console.log('Analyzing simple legacy code...');
    const startTime = Date.now();
    
    const analysisResult = await analyzer.analyzeFile(testFilePath);
    const analysisTime = Date.now() - startTime;

    expect(analysisResult.success).toBe(true);
    expect(analysisResult.language).toBe('javascript');
    expect(analysisResult.parsing).toBeDefined();
    expect(analysisResult.quality).toBeDefined();
    expect(analysisResult.semantic).toBeDefined();

    console.log(`Analysis completed in ${analysisTime}ms`);
    console.log(`Quality score: ${analysisResult.quality.overallScore}`);
    console.log(`Technical debt score: ${analysisResult.quality.technicalDebtScore}`);
    console.log(`Business logic components: ${analysisResult.semantic?.businessLogic?.length || 0}`);

    // Validate basic metrics
    expect(analysisResult.quality.overallScore).toBeGreaterThan(0);
    expect(analysisResult.quality.technicalDebtScore).toBeGreaterThan(0);
    expect(analysisResult.semantic?.businessLogic?.length || 0).toBeGreaterThanOrEqual(0);
    expect(analysisTime).toBeLessThan(5000); // Should complete in under 5 seconds

    console.log('Basic integration test passed!');
  });

  it('should process multiple files in sequence', async () => {
    const files = [
      {
        name: 'utils.js',
        content: `
          function formatDate(date) {
            return date.toISOString().split('T')[0];
          }
          
          function validateEmail(email) {
            return /^[^@]+@[^@]+\.[^@]+$/.test(email);
          }
        `
      },
      {
        name: 'processor.js',
        content: `
          function processUsers(users) {
            var processed = [];
            
            for (var i = 0; i < users.length; i++) {
              var user = users[i];
              if (user.email && validateEmail(user.email)) {
                processed.push({
                  id: user.id,
                  email: user.email.toLowerCase(),
                  createdAt: formatDate(new Date())
                });
              }
            }
            
            return processed;
          }
        `
      }
    ];

    const results = [];
    let totalLinesProcessed = 0;
    const startTime = Date.now();

    for (const file of files) {
      const filePath = join(testDataDir, file.name);
      await fs.writeFile(filePath, file.content);

      const result = await analyzer.analyzeFile(filePath);
      results.push(result);
      
      if (result.success) {
        totalLinesProcessed += result.parsing?.metadata?.linesOfCode || 0;
      }
    }

    const totalTime = Date.now() - startTime;
    const processingRate = totalLinesProcessed / (totalTime / 1000);

    console.log(`Processed ${files.length} files in ${totalTime}ms`);
    console.log(`Total lines: ${totalLinesProcessed}`);
    console.log(`Processing rate: ${Math.round(processingRate)} lines/second`);

    // Validate all files were processed successfully
    expect(results.length).toBe(files.length);
    for (const result of results) {
      expect(result.success).toBe(true);
    }

    expect(processingRate).toBeGreaterThan(10); // Should process at least 10 lines/second
    console.log('Multi-file processing test passed!');
  });
});