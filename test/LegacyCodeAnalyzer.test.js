import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LegacyCodeAnalyzer } from '../src/LegacyCodeAnalyzer.js';
import { MultiLanguageParser } from '../src/parsers/MultiLanguageParser.js';
import { CodeQualityAssessment } from '../src/quality/CodeQualityAssessment.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('LegacyCodeAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new LegacyCodeAnalyzer({
      ingestion: {
        maxFileSize: 1024 * 1024, // 1MB for tests
        maxConcurrency: 2
      },
      enableQualityAssessment: true,
      enableProgressReporting: false,
      batchSize: 5
    });
  });

  afterEach(async () => {
    await analyzer.cleanup();
  });

  describe('MultiLanguageParser', () => {
    let parser;

    beforeEach(() => {
      parser = new MultiLanguageParser();
    });

    it('should parse JavaScript code successfully', async () => {
      const jsCode = `
        function testFunction(param) {
          if (param > 0) {
            return param * 2;
          } else {
            return 0;
          }
        }
        
        class TestClass {
          constructor() {
            this.value = 0;
          }
        }
      `;

      const result = await parser.parse(jsCode, 'javascript', 'test.js');
      
      expect(result.success).toBe(true);
      expect(result.language).toBe('javascript');
      expect(result.ast).toBeDefined();
      expect(result.metadata.functions).toBeGreaterThan(0);
      expect(result.metadata.classes).toBeGreaterThan(0);
      expect(result.metadata.complexity).toBeGreaterThan(1);
    });

    it('should parse PHP code successfully', async () => {
      const phpCode = `<?php
        class TestClass {
          public function testMethod($param) {
            if ($param > 0) {
              return $param * 2;
            } else {
              return 0;
            }
          }
        }
      ?>`;

      const result = await parser.parse(phpCode, 'php', 'test.php');
      
      expect(result.success).toBe(true);
      expect(result.language).toBe('php');
      expect(result.ast).toBeDefined();
      expect(result.metadata.linesOfCode).toBeGreaterThan(0);
    });

    it('should handle parsing errors gracefully', async () => {
      const invalidCode = 'function invalid syntax {{{';

      const result = await parser.parse(invalidCode, 'javascript', 'invalid.js');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.ast).toBeNull();
    });

    it('should detect language from file extension', () => {
      const parser = new MultiLanguageParser();
      
      expect(parser.detectLanguage('test.js', '')).toBe('javascript');
      expect(parser.detectLanguage('test.php', '')).toBe('php');
      expect(parser.detectLanguage('test.java', '')).toBe('java');
      expect(parser.detectLanguage('test.py', '')).toBe('python');
    });
  });

  describe('CodeQualityAssessment', () => {
    let qualityAssessment;

    beforeEach(() => {
      qualityAssessment = new CodeQualityAssessment();
    });

    it('should assess code quality correctly', () => {
      const parseResult = {
        success: true,
        language: 'javascript',
        filePath: 'test.js',
        ast: {},
        metadata: {
          linesOfCode: 50,
          functions: 3,
          classes: 1,
          complexity: 8,
          size: 1500
        }
      };

      const assessment = qualityAssessment.assessQuality(parseResult);
      
      expect(assessment.success).toBe(true);
      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(assessment.technicalDebtScore).toBeGreaterThan(0);
      expect(assessment.metrics).toBeDefined();
      expect(assessment.metrics.complexity).toBeDefined();
      expect(assessment.metrics.maintainability).toBeDefined();
      expect(assessment.recommendations).toBeInstanceOf(Array);
    });

    it('should identify code smells', () => {
      const parseResult = {
        success: true,
        language: 'javascript',
        filePath: 'test.js',
        ast: {},
        metadata: {
          linesOfCode: 2000, // Large file
          functions: 2, // Few functions = long methods
          classes: 0,
          complexity: 50, // High complexity
          size: 50000
        }
      };

      const assessment = qualityAssessment.assessQuality(parseResult);
      
      expect(assessment.codeSmells.length).toBeGreaterThan(0);
      
      const smellTypes = assessment.codeSmells.map(smell => smell.type);
      expect(smellTypes).toContain('Large File');
      expect(smellTypes).toContain('Long Method');
      expect(smellTypes).toContain('High Complexity');
    });

    it('should handle failed parse results', () => {
      const parseResult = {
        success: false,
        error: 'Parse error',
        filePath: 'test.js'
      };

      const assessment = qualityAssessment.assessQuality(parseResult);
      
      expect(assessment.success).toBe(false);
      expect(assessment.overallScore).toBe(0);
      expect(assessment.technicalDebtScore).toBe(100);
    });
  });

  describe('File Analysis', () => {
    it('should analyze a single JavaScript file', async () => {
      const testFile = join(__dirname, '../test-files/sample.js');
      
      const result = await analyzer.analyzeFile(testFile);
      
      expect(result.success).toBe(true);
      expect(result.language).toBe('javascript');
      expect(result.parsing).toBeDefined();
      expect(result.parsing.metadata).toBeDefined();
      expect(result.quality).toBeDefined();
      expect(result.quality.overallScore).toBeGreaterThan(0);
    });

    it('should handle non-existent files', async () => {
      const result = await analyzer.analyzeFile('non-existent-file.js');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Codebase Analysis', () => {
    it('should analyze multiple files in a directory', async () => {
      const testDir = join(__dirname, '../test-files');
      const results = [];
      
      for await (const result of analyzer.analyzeCodebase(testDir)) {
        if (result.type === 'final_summary') {
          expect(result.summary.totalFiles).toBeGreaterThan(0);
          break;
        }
        
        if (result.success) {
          results.push(result);
          expect(result.filePath).toBeDefined();
          expect(result.language).toBeDefined();
          expect(result.parsing).toBeDefined();
        }
      }
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Reporting', () => {
    it('should provide system statistics', () => {
      const stats = analyzer.getStats();
      
      expect(stats.ingestion).toBeDefined();
      expect(stats.parser).toBeDefined();
      expect(stats.parser.supportedLanguages).toContain('javascript');
      expect(stats.parser.supportedLanguages).toContain('php');
      expect(stats.parser.supportedLanguages).toContain('java');
      expect(stats.parser.supportedLanguages).toContain('python');
      expect(stats.quality).toBeDefined();
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple specific files', async () => {
      const testFiles = [
        join(__dirname, '../test-files/sample.js'),
        join(__dirname, '../test-files/sample.php'),
        join(__dirname, '../test-files/sample.py')
      ];
      
      const results = await analyzer.analyzeFiles(testFiles);
      
      expect(results.length).toBe(3);
      
      // Check that we got results for different languages
      const languages = results
        .filter(r => r.success)
        .map(r => r.language);
      
      expect(languages).toContain('javascript');
      expect(languages).toContain('php');
      expect(languages).toContain('python');
    });
  });
});

describe('Integration Tests', () => {
  it('should handle large codebase analysis workflow', async () => {
    const analyzer = new LegacyCodeAnalyzer({
      enableQualityAssessment: true,
      batchSize: 2
    });

    try {
      const testDir = join(__dirname, '../src');
      let totalFiles = 0;
      let successfulFiles = 0;
      let batchSummaries = 0;

      for await (const result of analyzer.analyzeCodebase(testDir)) {
        if (result.type === 'batch_summary') {
          batchSummaries++;
          expect(result.summary.fileCount).toBeGreaterThan(0);
        } else if (result.type === 'final_summary') {
          totalFiles = result.summary.totalFiles;
          successfulFiles = result.summary.successfulFiles;
          expect(totalFiles).toBeGreaterThan(0);
          expect(successfulFiles).toBeGreaterThan(0);
          break;
        } else if (result.success) {
          expect(result.parsing.metadata.linesOfCode).toBeGreaterThan(0);
          expect(result.quality.overallScore).toBeGreaterThanOrEqual(0);
          expect(result.quality.technicalDebtScore).toBeGreaterThanOrEqual(0);
        }
      }

      expect(totalFiles).toBeGreaterThan(0);
      expect(successfulFiles).toBeGreaterThan(0);
      
    } finally {
      await analyzer.cleanup();
    }
  });
});