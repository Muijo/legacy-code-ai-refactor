import { MultiLanguageParser } from './parsers/MultiLanguageParser.js';
import { CodebaseIngestionEngine } from './ingestion/CodebaseIngestionEngine.js';
import { CodeQualityAssessment } from './quality/CodeQualityAssessment.js';
import { SemanticAnalysisEngine } from './semantic/SemanticAnalysisEngine.js';
import { BusinessLogicDocumentationGenerator } from './semantic/BusinessLogicDocumentationGenerator.js';
import { RedisCache } from './cache/RedisCache.js';

/**
 * Main legacy code analysis infrastructure
 * Orchestrates parsing, ingestion, and quality assessment
 */
export class LegacyCodeAnalyzer {
  constructor(options = {}) {
    this.parser = new MultiLanguageParser();
    this.ingestionEngine = new CodebaseIngestionEngine(options.ingestion);
    this.qualityAssessment = new CodeQualityAssessment(options.quality);
    this.semanticAnalysis = new SemanticAnalysisEngine(options.semantic);
    this.documentationGenerator = new BusinessLogicDocumentationGenerator(options.documentation);
    
    this.options = {
      enableQualityAssessment: options.enableQualityAssessment !== false,
      enableSemanticAnalysis: options.enableSemanticAnalysis !== false,
      enableProgressReporting: options.enableProgressReporting !== false,
      enableCaching: options.enableCaching !== false,
      batchSize: options.batchSize || 100,
      ...options
    };
    
    // Initialize cache if enabled
    if (this.options.enableCaching) {
      this.cache = new RedisCache(options.cache);
      this.cache.connect().catch(err => {
        console.warn('Failed to connect to Redis cache:', err);
        this.options.enableCaching = false; // Disable caching on connection failure
      });
    }
  }

  /**
   * Analyze a single file
   * @param {string} filePath - Path to the file to analyze
   * @param {string} language - Optional language override
   * @returns {Object} Analysis result
   */
  async analyzeFile(filePath, language = null) {
    try {
      console.log(`Analyzing file: ${filePath}`);
      
      // Check cache first if enabled
      if (this.options.enableCaching && this.cache) {
        const cached = await this.cache.getCachedAnalysis(filePath);
        if (cached) {
          console.log(`Using cached analysis for: ${filePath}`);
          return cached;
        }
      }
      
      // Parse the file
      const content = await import('fs').then(fs => fs.promises.readFile(filePath, 'utf8'));
      const parseResult = await this.parser.parse(content, language, filePath);
      
      if (!parseResult.success) {
        return {
          success: false,
          filePath,
          error: parseResult.error,
          timestamp: Date.now()
        };
      }

      // Assess quality if enabled
      let qualityAssessment = null;
      if (this.options.enableQualityAssessment) {
        qualityAssessment = this.qualityAssessment.assessQuality(parseResult);
      }

      // Perform semantic analysis if enabled
      let semanticAnalysis = null;
      if (this.options.enableSemanticAnalysis) {
        semanticAnalysis = await this.semanticAnalysis.analyzeSemantics(parseResult);
      }

      const result = {
        success: true,
        filePath,
        language: parseResult.language,
        parsing: {
          ast: parseResult.ast,
          metadata: parseResult.metadata,
          parseTime: parseResult.metadata.parseTime
        },
        quality: qualityAssessment,
        semantic: semanticAnalysis,
        timestamp: Date.now()
      };
      
      // Cache the result if enabled
      if (this.options.enableCaching && this.cache) {
        await this.cache.cacheAnalysisResult(filePath, result);
      }

      return result;

    } catch (error) {
      return {
        success: false,
        filePath,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Analyze entire codebase
   * @param {string} rootPath - Root directory to analyze
   * @param {Object} options - Analysis options
   * @returns {AsyncGenerator} Stream of analysis results
   */
  async* analyzeCodebase(rootPath, options = {}) {
    console.log(`Starting codebase analysis: ${rootPath}`);
    
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    const results = [];

    try {
      // Stream file ingestion and analysis
      for await (const parseResult of this.ingestionEngine.ingestCodebase(rootPath, options)) {
        processedCount++;
        
        if (!parseResult.success) {
          errorCount++;
          yield {
            success: false,
            filePath: parseResult.filePath,
            error: parseResult.error,
            timestamp: Date.now()
          };
          continue;
        }

        // Assess quality if enabled
        let qualityAssessment = null;
        if (this.options.enableQualityAssessment) {
          qualityAssessment = this.qualityAssessment.assessQuality(parseResult);
        }

        // Perform semantic analysis if enabled
        let semanticAnalysis = null;
        if (this.options.enableSemanticAnalysis) {
          semanticAnalysis = await this.semanticAnalysis.analyzeSemantics(parseResult);
        }

        const analysisResult = {
          success: true,
          filePath: parseResult.filePath,
          language: parseResult.language,
          parsing: {
            metadata: parseResult.metadata,
            parseTime: parseResult.metadata.parseTime,
            processingMethod: parseResult.processingMethod
          },
          quality: qualityAssessment,
          semantic: semanticAnalysis,
          timestamp: Date.now()
        };

        results.push(analysisResult);
        yield analysisResult;

        // Progress reporting
        if (this.options.enableProgressReporting && processedCount % 10 === 0) {
          console.log(`Processed ${processedCount} files (${errorCount} errors)`);
        }

        // Batch processing for memory management
        if (results.length >= this.options.batchSize) {
          // Process batch summary
          const batchSummary = this.generateBatchSummary(results);
          yield {
            type: 'batch_summary',
            summary: batchSummary,
            timestamp: Date.now()
          };
          
          // Clear results to free memory
          results.length = 0;
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }

      // Final summary
      const duration = Date.now() - startTime;
      const ingestionStats = this.ingestionEngine.getStats();
      
      yield {
        type: 'final_summary',
        summary: {
          totalFiles: processedCount,
          successfulFiles: processedCount - errorCount,
          errorCount,
          duration,
          filesPerSecond: processedCount / (duration / 1000),
          ingestionStats,
          timestamp: Date.now()
        }
      };

    } catch (error) {
      console.error('Codebase analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate summary for a batch of results
   */
  generateBatchSummary(results) {
    const summary = {
      fileCount: results.length,
      languages: new Map(),
      averageComplexity: 0,
      averageQualityScore: 0,
      highRiskFiles: 0,
      totalLinesOfCode: 0
    };

    let complexitySum = 0;
    let qualitySum = 0;
    let qualityCount = 0;

    for (const result of results) {
      if (!result.success) continue;

      // Language distribution
      const lang = result.language;
      summary.languages.set(lang, (summary.languages.get(lang) || 0) + 1);

      // Complexity metrics
      if (result.parsing.metadata.complexity) {
        complexitySum += result.parsing.metadata.complexity;
      }

      // Lines of code
      if (result.parsing.metadata.linesOfCode) {
        summary.totalLinesOfCode += result.parsing.metadata.linesOfCode;
      }

      // Quality metrics
      if (result.quality && result.quality.success) {
        qualitySum += result.quality.overallScore;
        qualityCount++;
        
        if (result.quality.technicalDebtScore > 80) {
          summary.highRiskFiles++;
        }
      }
    }

    if (results.length > 0) {
      summary.averageComplexity = Math.round(complexitySum / results.length);
    }

    if (qualityCount > 0) {
      summary.averageQualityScore = Math.round(qualitySum / qualityCount);
    }

    return summary;
  }

  /**
   * Get analysis statistics
   */
  getStats() {
    return {
      ingestion: this.ingestionEngine.getStats(),
      parser: {
        supportedLanguages: ['javascript', 'php', 'java', 'python']
      },
      quality: {
        enabled: this.options.enableQualityAssessment
      }
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.ingestionEngine.cleanup();
    
    // Disconnect from cache if connected
    if (this.cache && this.options.enableCaching) {
      await this.cache.disconnect();
    }
  }

  /**
   * Analyze specific files (not entire codebase)
   * @param {string[]} filePaths - Array of file paths to analyze
   * @returns {Promise<Object[]>} Array of analysis results
   */
  async analyzeFiles(filePaths) {
    const results = [];
    
    console.log(`Analyzing ${filePaths.length} specific files`);
    
    for (const filePath of filePaths) {
      const result = await this.analyzeFile(filePath);
      results.push(result);
    }

    return results;
  }

  /**
   * Get quality assessment for parsed results
   * @param {Object[]} parseResults - Array of parse results
   * @returns {Object} Quality assessment summary
   */
  async assessQuality(parseResults) {
    if (!this.options.enableQualityAssessment) {
      throw new Error('Quality assessment is disabled');
    }

    return await this.qualityAssessment.batchAssess(parseResults);
  }

  /**
   * Generate business logic documentation from analysis results
   * @param {Object[]} analysisResults - Array of analysis results with semantic analysis
   * @param {Object} options - Documentation generation options
   * @returns {Object} Generated documentation
   */
  async generateDocumentation(analysisResults, options = {}) {
    if (!this.options.enableSemanticAnalysis) {
      throw new Error('Semantic analysis must be enabled to generate documentation');
    }

    // Extract semantic analysis results
    const semanticResults = analysisResults
      .filter(result => result.success && result.semantic && result.semantic.success)
      .map(result => result.semantic);

    if (semanticResults.length === 0) {
      throw new Error('No valid semantic analysis results found');
    }

    // Generate consolidated documentation
    return await this.documentationGenerator.generateConsolidatedDocumentation(semanticResults, options);
  }
}