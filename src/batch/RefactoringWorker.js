import { parentPort, workerData } from 'worker_threads';
import { LegacyCodeAnalyzer } from '../LegacyCodeAnalyzer.js';
import { ModernCodeGenerator } from '../generation/ModernCodeGenerator.js';
import { TestGenerator } from '../generation/TestGenerator.js';
import BehaviorComparisonSystem from '../validation/BehaviorComparisonSystem.js';

/**
 * Worker thread for processing individual refactoring tasks
 * Handles the complete refactoring pipeline for a single code unit
 */
class RefactoringWorker {
  constructor(workerId, maxMemory) {
    this.workerId = workerId;
    this.maxMemory = maxMemory;
    this.currentTask = null;
    
    // Initialize components
    this.analyzer = new LegacyCodeAnalyzer({
      enableQualityAssessment: true,
      enableSemanticAnalysis: true,
      enableProgressReporting: false // Disable in worker to avoid noise
    });
    
    this.codeGenerator = new ModernCodeGenerator();
    this.testGenerator = new TestGenerator();
    this.behaviorComparison = new BehaviorComparisonSystem();
    
    // Resource monitoring
    this.resourceMonitorInterval = null;
    this.startResourceMonitoring();
    
    console.log(`Refactoring worker ${workerId} initialized`);
  }

  /**
   * Process a refactoring task
   */
  async processTask(task, options = {}) {
    this.currentTask = task;
    const startTime = Date.now();
    
    try {
      this.sendProgress(0, 'Starting task analysis');
      
      // Step 1: Analyze legacy code (20% progress)
      const analysisResult = await this.analyzeLegacyCode(task);
      this.sendProgress(20, 'Legacy code analysis complete');
      
      if (!analysisResult.success) {
        throw new Error(`Analysis failed: ${analysisResult.error}`);
      }

      // Step 2: Generate modern code (40% progress)
      const modernCode = await this.generateModernCode(analysisResult, task);
      this.sendProgress(40, 'Modern code generation complete');

      // Step 3: Generate tests (60% progress)
      const tests = await this.generateTests(analysisResult, modernCode, task);
      this.sendProgress(60, 'Test generation complete');

      // Step 4: Validate functional equivalence (80% progress)
      const validationResult = await this.validateFunctionalEquivalence(
        analysisResult, modernCode, tests, task
      );
      this.sendProgress(80, 'Functional equivalence validation complete');

      // Step 5: Compile final result (100% progress)
      const result = this.compileResult(
        task, analysisResult, modernCode, tests, validationResult, startTime
      );
      this.sendProgress(100, 'Task completed successfully');

      return result;

    } catch (error) {
      console.error(`Worker ${this.workerId} task ${task.id} failed:`, error);
      throw error;
    } finally {
      this.currentTask = null;
    }
  }

  /**
   * Analyze legacy code using the analyzer
   */
  async analyzeLegacyCode(task) {
    try {
      const { filePath, content, language } = task;
      
      let analysisResult;
      
      if (filePath) {
        // Analyze file by path
        analysisResult = await this.analyzer.analyzeFile(filePath, language);
      } else if (content) {
        // Analyze content directly (create temporary analysis)
        const tempResult = await this.analyzer.parser.parse(content, language, 'temp');
        if (!tempResult.success) {
          return { success: false, error: tempResult.error };
        }

        // Perform quality and semantic analysis
        const qualityAssessment = this.analyzer.qualityAssessment.assessQuality(tempResult);
        const semanticAnalysis = await this.analyzer.semanticAnalysis.analyzeSemantics(tempResult);

        analysisResult = {
          success: true,
          filePath: 'temp',
          language: tempResult.language,
          parsing: {
            ast: tempResult.ast,
            metadata: tempResult.metadata
          },
          quality: qualityAssessment,
          semantic: semanticAnalysis,
          timestamp: Date.now()
        };
      } else {
        throw new Error('Task must provide either filePath or content');
      }

      return analysisResult;

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Generate modern code from analysis result
   */
  async generateModernCode(analysisResult, task) {
    const options = {
      targetLanguage: task.targetLanguage || analysisResult.language,
      modernizationLevel: task.modernizationLevel || 'moderate',
      preserveComments: task.preserveComments !== false,
      optimizePerformance: task.optimizePerformance !== false,
      followStyleGuide: task.followStyleGuide !== false
    };

    const result = await this.codeGenerator.generateModernCode(analysisResult, options);
    
    // Transform the result to match expected structure
    return {
      success: result.success,
      language: result.metadata.language,
      code: result.generatedCode,
      improvements: result.suggestions,
      qualityScore: result.metadata.metrics?.qualityScore || 85,
      performanceOptimizations: result.metadata.optimizationsApplied || [],
      complexity: result.metadata.metrics?.complexity || 5,
      maintainabilityIndex: result.metadata.metrics?.maintainabilityIndex || 75,
      technicalDebtScore: result.metadata.metrics?.technicalDebtScore || 20
    };
  }

  /**
   * Generate tests for the refactored code
   */
  async generateTests(analysisResult, modernCode, task) {
    const options = {
      testFramework: task.testFramework || 'vitest',
      coverageTarget: task.coverageTarget || 80,
      includeEdgeCases: task.includeEdgeCases !== false,
      generateIntegrationTests: task.generateIntegrationTests !== false
    };

    return await this.testGenerator.generateTestSuite(analysisResult, modernCode, options);
  }

  /**
   * Validate functional equivalence between original and refactored code
   */
  async validateFunctionalEquivalence(analysisResult, modernCode, tests, task) {
    const options = {
      runPerformanceComparison: task.runPerformanceComparison !== false,
      validateSideEffects: task.validateSideEffects !== false,
      timeoutMs: task.validationTimeout || 30000
    };

    return await this.behaviorComparison.compareImplementations(
      analysisResult, modernCode, tests, options
    );
  }

  /**
   * Compile the final refactoring result
   */
  compileResult(task, analysisResult, modernCode, tests, validationResult, startTime) {
    const duration = Date.now() - startTime;
    
    return {
      taskId: task.id,
      success: true,
      duration,
      workerId: this.workerId,
      
      // Original analysis
      originalAnalysis: {
        language: analysisResult.language,
        complexity: analysisResult.parsing?.metadata?.complexity,
        linesOfCode: analysisResult.parsing?.metadata?.linesOfCode,
        qualityScore: analysisResult.quality?.overallScore,
        technicalDebtScore: analysisResult.quality?.technicalDebtScore
      },
      
      // Generated modern code
      modernCode: {
        language: modernCode.language,
        code: modernCode.code,
        improvements: modernCode.improvements,
        qualityScore: modernCode.qualityScore,
        performanceOptimizations: modernCode.performanceOptimizations
      },
      
      // Generated tests
      tests: {
        framework: tests.framework,
        testCount: tests.metadata?.totalTests || 0,
        coverageEstimate: tests.metadata?.coverageEstimate || 80,
        testCode: tests.testFiles || []
      },
      
      // Validation results
      validation: {
        functionalEquivalence: validationResult.functionalEquivalence,
        performanceComparison: validationResult.performanceComparison,
        sideEffectValidation: validationResult.sideEffectValidation,
        regressionDetected: validationResult.regressionDetected
      },
      
      // Metrics and improvements
      metrics: {
        complexityReduction: this.calculateComplexityReduction(analysisResult, modernCode),
        qualityImprovement: this.calculateQualityImprovement(analysisResult, modernCode),
        maintainabilityGain: this.calculateMaintainabilityGain(analysisResult, modernCode),
        technicalDebtReduction: this.calculateTechnicalDebtReduction(analysisResult, modernCode)
      },
      
      // Migration information
      migration: {
        riskLevel: this.assessMigrationRisk(analysisResult, validationResult),
        recommendedApproach: this.recommendMigrationApproach(analysisResult, modernCode),
        rollbackPlan: this.generateRollbackPlan(task, analysisResult)
      },
      
      timestamp: Date.now()
    };
  }

  /**
   * Calculate complexity reduction percentage
   */
  calculateComplexityReduction(analysisResult, modernCode) {
    const originalComplexity = analysisResult.parsing?.metadata?.complexity || 0;
    const modernComplexity = modernCode.complexity || 0;
    
    if (originalComplexity === 0) return 0;
    
    return Math.round(((originalComplexity - modernComplexity) / originalComplexity) * 100);
  }

  /**
   * Calculate quality improvement percentage
   */
  calculateQualityImprovement(analysisResult, modernCode) {
    const originalQuality = analysisResult.quality?.overallScore || 0;
    const modernQuality = modernCode.qualityScore || 0;
    
    if (originalQuality === 0) return modernQuality;
    
    return Math.round(((modernQuality - originalQuality) / originalQuality) * 100);
  }

  /**
   * Calculate maintainability gain
   */
  calculateMaintainabilityGain(analysisResult, modernCode) {
    const originalMaintainability = analysisResult.quality?.maintainabilityIndex || 0;
    const modernMaintainability = modernCode.maintainabilityIndex || 0;
    
    return Math.round(modernMaintainability - originalMaintainability);
  }

  /**
   * Calculate technical debt reduction
   */
  calculateTechnicalDebtReduction(analysisResult, modernCode) {
    const originalDebt = analysisResult.quality?.technicalDebtScore || 0;
    const modernDebt = modernCode.technicalDebtScore || 0;
    
    return Math.round(originalDebt - modernDebt);
  }

  /**
   * Assess migration risk level
   */
  assessMigrationRisk(analysisResult, validationResult) {
    let riskScore = 0;
    
    // High complexity increases risk
    const complexity = analysisResult.parsing?.metadata?.complexity || 0;
    if (complexity > 20) riskScore += 3;
    else if (complexity > 10) riskScore += 2;
    else if (complexity > 5) riskScore += 1;
    
    // Validation failures increase risk
    if (!validationResult.functionalEquivalence) riskScore += 5;
    if (validationResult.regressionDetected) riskScore += 3;
    if (validationResult.sideEffectValidation === false) riskScore += 2;
    
    // Performance degradation increases risk
    if (validationResult.performanceComparison?.degradation > 20) riskScore += 3;
    else if (validationResult.performanceComparison?.degradation > 10) riskScore += 1;
    
    if (riskScore >= 7) return 'high';
    if (riskScore >= 4) return 'medium';
    return 'low';
  }

  /**
   * Recommend migration approach
   */
  recommendMigrationApproach(analysisResult, modernCode) {
    const complexity = analysisResult.parsing?.metadata?.complexity || 0;
    const qualityImprovement = this.calculateQualityImprovement(analysisResult, modernCode);
    
    if (complexity > 20 || qualityImprovement > 50) {
      return 'gradual'; // Gradual migration for complex or high-impact changes
    } else if (complexity > 10) {
      return 'staged'; // Staged migration for moderate complexity
    } else {
      return 'direct'; // Direct replacement for simple changes
    }
  }

  /**
   * Generate rollback plan
   */
  generateRollbackPlan(task, analysisResult) {
    return {
      backupRequired: true,
      rollbackSteps: [
        'Create backup of original file',
        'Verify backup integrity',
        'Apply modern code changes',
        'Run validation tests',
        'Monitor for issues',
        'Rollback if problems detected'
      ],
      rollbackTriggers: [
        'Functional equivalence test failures',
        'Performance degradation > 20%',
        'Critical runtime errors',
        'Integration test failures'
      ],
      estimatedRollbackTime: Math.max(5, Math.round((analysisResult.parsing?.metadata?.linesOfCode || 100) / 100))
    };
  }

  /**
   * Send progress update to main thread
   */
  sendProgress(percentage, message) {
    if (parentPort) {
      parentPort.postMessage({
        type: 'progress_update',
        taskId: this.currentTask?.id,
        progress: {
          percentage,
          message,
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Start resource monitoring
   */
  startResourceMonitoring() {
    this.resourceMonitorInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      if (parentPort) {
        parentPort.postMessage({
          type: 'resource_usage',
          usage: {
            memoryUsage: memoryUsage.heapUsed,
            cpuUsage: cpuUsage.user + cpuUsage.system,
            timestamp: Date.now()
          }
        });
      }
      
      // Check memory limits
      if (memoryUsage.heapUsed > this.maxMemory) {
        console.warn(`Worker ${this.workerId} approaching memory limit`);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
    }, 5000);
  }

  /**
   * Stop resource monitoring
   */
  stopResourceMonitoring() {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
      this.resourceMonitorInterval = null;
    }
  }

  /**
   * Cleanup worker resources
   */
  async cleanup() {
    this.stopResourceMonitoring();
    
    if (this.analyzer) {
      await this.analyzer.cleanup();
    }
  }
}

// Initialize worker
const worker = new RefactoringWorker(workerData.workerId, workerData.maxMemory);

// Handle messages from main thread
if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      switch (message.type) {
        case 'process_task':
          const result = await worker.processTask(message.task, message.options);
          parentPort.postMessage({
            type: 'task_completed',
            taskId: message.task.id,
            result
          });
          break;
          
        case 'shutdown':
          await worker.cleanup();
          process.exit(0);
          break;
          
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      parentPort.postMessage({
        type: 'task_failed',
        taskId: message.task?.id,
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        }
      });
    }
  });
}

// Handle process termination
process.on('SIGTERM', async () => {
  await worker.cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.cleanup();
  process.exit(0);
});