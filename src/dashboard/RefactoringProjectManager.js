import { LegacyCodeAnalyzer } from '../LegacyCodeAnalyzer.js';
import { BatchProcessingSystem } from '../batch/BatchProcessingSystem.js';
import { ModernizationSuggestionEngine } from '../patterns/ModernizationSuggestionEngine.js';
import { LegacyPatternDetector } from '../patterns/LegacyPatternDetector.js';
import { MigrationPlanner } from '../migration/MigrationPlanner.js';
import { ModernCodeGenerator } from '../generation/ModernCodeGenerator.js';
import { TestGenerator } from '../generation/TestGenerator.js';
import BehaviorComparisonSystem from '../validation/BehaviorComparisonSystem.js';
import { db, Project, Analysis, Refactoring, MigrationPlan } from '../database/index.js';
import fs from 'fs/promises';
import path from 'path';

export class RefactoringProjectManager {
  constructor() {
    this.projects = new Map();
    this.analyzer = new LegacyCodeAnalyzer({
      enableCaching: false, // Disable Redis caching if not available
      enableQualityAssessment: true,
      enableSemanticAnalysis: true
    });
    this.batchProcessor = new BatchProcessingSystem();
    this.patternDetector = new LegacyPatternDetector();
    this.suggestionEngine = new ModernizationSuggestionEngine();
    this.migrationPlanner = new MigrationPlanner();
    this.modernCodeGenerator = new ModernCodeGenerator();
    this.testGenerator = new TestGenerator();
    this.behaviorComparison = new BehaviorComparisonSystem();
    this.interventions = new Map();
    this.dbConnected = false;
  }

  async initialize() {
    try {
      await db.connect();
      this.dbConnected = true;
      console.log('RefactoringProjectManager: Database connected');
    } catch (error) {
      console.error('RefactoringProjectManager: Database connection failed:', error);
      // Continue without database - fallback to in-memory
    }
  }

  async createProject({ name, description, files, userId, settings = {} }) {
    // Create MongoDB project if connected
    let dbProject = null;
    if (this.dbConnected) {
      try {
        dbProject = new Project({
          name,
          description,
          userId,
          status: 'created',
          settings: {
            ...settings,
            enableCaching: settings.enableCaching !== false,
            generateTests: settings.generateTests !== false
          },
          files: files.map(filePath => ({
            originalPath: filePath,
            fileName: path.basename(filePath),
            language: this.detectLanguage(filePath),
            status: 'pending'
          })),
          statistics: {
            totalFiles: files.length
          }
        });
        
        await dbProject.save();
      } catch (error) {
        console.error('Failed to save project to database:', error);
      }
    }

    // Create in-memory project for backward compatibility
    const project = {
      id: dbProject?._id?.toString() || this.generateId(),
      name,
      description,
      files,
      status: 'created',
      createdAt: new Date().toISOString(),
      analysis: null,
      suggestions: [],
      migrationPlan: null,
      progress: {
        analysis: 0,
        refactoring: 0,
        validation: 0
      },
      interventions: [],
      results: null,
      dbProjectId: dbProject?._id
    };

    this.projects.set(project.id, project);
    return project;
  }

  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const langMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'javascript',
      '.tsx': 'javascript',
      '.php': 'php',
      '.java': 'java',
      '.py': 'python'
    };
    return langMap[ext] || 'unknown';
  }

  async getAllProjects(userId = null) {
    if (this.dbConnected && userId) {
      try {
        const dbProjects = await Project.findByUserId(userId);
        // Sync with in-memory projects
        for (const dbProject of dbProjects) {
          const id = dbProject._id.toString();
          if (!this.projects.has(id)) {
            // Convert DB project to in-memory format
            this.projects.set(id, {
              id,
              name: dbProject.name,
              description: dbProject.description,
              files: dbProject.files.map(f => f.originalPath),
              status: dbProject.status,
              createdAt: dbProject.createdAt.toISOString(),
              analysis: null,
              suggestions: [],
              migrationPlan: null,
              progress: {
                analysis: dbProject.statistics.analyzedFiles / dbProject.statistics.totalFiles * 100 || 0,
                refactoring: dbProject.statistics.refactoredFiles / dbProject.statistics.totalFiles * 100 || 0,
                validation: 0
              },
              interventions: [],
              results: null,
              dbProjectId: dbProject._id,
              userId: dbProject.userId
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch projects from database:', error);
      }
    }
    
    return Array.from(this.projects.values());
  }

  async getProjectsForUser(userId) {
    const allProjects = await this.getAllProjects(userId);
    return allProjects.filter(project => project.userId === userId);
  }

  async getProject(id) {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project ${id} not found`);
    }
    return project;
  }

  async startAnalysis(projectId, progressCallback) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    project.status = 'analyzing';
    
    // Update DB project status
    if (this.dbConnected && project.dbProjectId) {
      try {
        await Project.findByIdAndUpdate(project.dbProjectId, { status: 'analyzing' });
      } catch (error) {
        console.error('Failed to update project status in database:', error);
      }
    }
    
    try {
      // Analyze each file
      const analysisResults = [];
      const totalFiles = project.files.length;
      
      for (let i = 0; i < project.files.length; i++) {
        const filePath = project.files[i];
        
        // Analyze the file
        const analysis = await this.analyzer.analyzeFile(filePath);
        analysisResults.push(analysis);
        
        // Store analysis in MongoDB if connected
        if (this.dbConnected && project.dbProjectId && analysis.success) {
          try {
            const dbAnalysis = new Analysis({
              projectId: project.dbProjectId,
              fileId: project.dbProjectId, // Temporary - should be actual file ID
              filePath: analysis.filePath,
              language: analysis.language,
              status: 'completed',
              parsing: analysis.parsing,
              metadata: analysis.parsing?.metadata,
              quality: analysis.quality,
              semantic: analysis.semantic
            });
            
            await dbAnalysis.save();
            
            // Update file status in project
            const dbProject = await Project.findById(project.dbProjectId);
            const fileIndex = dbProject.files.findIndex(f => f.originalPath === filePath);
            if (fileIndex !== -1) {
              dbProject.files[fileIndex].status = 'analyzed';
              dbProject.files[fileIndex].analysisId = dbAnalysis._id;
              await dbProject.updateStatistics();
            }
          } catch (error) {
            console.error('Failed to save analysis to database:', error);
          }
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / totalFiles) * 100);
        project.progress.analysis = progress;
        progressCallback({ type: 'analysis', progress, currentFile: filePath });
      }

      // Generate modernization suggestions
      const suggestions = await this.generateSuggestions(analysisResults);
      
      project.analysis = {
        results: analysisResults,
        summary: this.generateAnalysisSummary(analysisResults),
        completedAt: new Date().toISOString()
      };
      
      project.suggestions = suggestions;
      project.status = 'analyzed';
      
      // Update DB project status
      if (this.dbConnected && project.dbProjectId) {
        try {
          await Project.findByIdAndUpdate(project.dbProjectId, { 
            status: 'analyzed',
            'statistics.analyzedFiles': analysisResults.filter(r => r.success).length
          });
        } catch (error) {
          console.error('Failed to update project status in database:', error);
        }
      }
      
      progressCallback({ type: 'analysis', progress: 100, completed: true });
      
    } catch (error) {
      project.status = 'error';
      project.error = error.message;
      
      // Update DB project status
      if (this.dbConnected && project.dbProjectId) {
        try {
          await Project.findByIdAndUpdate(project.dbProjectId, { 
            status: 'failed'
          });
        } catch (error) {
          console.error('Failed to update project error status in database:', error);
        }
      }
      
      throw error;
    }
  }

  async generateSuggestions(analysisResults) {
    const allSuggestions = [];
    
    for (const analysis of analysisResults) {
      try {
        if (!analysis.success || !analysis.parsing?.ast) {
          continue;
        }

        // First, detect patterns in the code
        const patternDetectionResult = await this.patternDetector.detectPatterns({
          success: true,
          ast: analysis.parsing.ast,
          language: analysis.language,
          filePath: analysis.filePath,
          metadata: analysis.parsing.metadata
        });

        // Then generate suggestions based on detected patterns
        if (patternDetectionResult.success) {
          const suggestionResult = await this.suggestionEngine.generateSuggestions(patternDetectionResult);
          
          if (suggestionResult.success && suggestionResult.modernizationSuggestions) {
            // Convert the suggestion engine format to our dashboard format
            const formattedSuggestions = suggestionResult.modernizationSuggestions.map(s => ({
              id: this.generateId(),
              type: s.pattern.type,
              priority: s.priority,
              title: s.modernization.name,
              description: s.modernization.description,
              filePath: analysis.filePath,
              impact: s.impact.level,
              effort: s.effort.level,
              pattern: s.pattern,
              modernization: s.modernization,
              pros: s.modernization.pros,
              cons: s.modernization.cons,
              examples: s.modernization.examples
            }));
            
            allSuggestions.push(...formattedSuggestions);
          }
        }

        // Add additional suggestions based on quality assessment
        if (analysis.quality) {
          if (analysis.quality.overallScore < 50) {
            allSuggestions.push({
              id: this.generateId(),
              type: 'quality',
              priority: 'high',
              title: `Major quality improvements needed`,
              description: `Code quality score is ${analysis.quality.overallScore}/100. Consider comprehensive refactoring.`,
              filePath: analysis.filePath,
              impact: 'high',
              effort: 'high'
            });
          }
          
          // Add suggestions for code smells
          if (analysis.quality.codeSmells && analysis.quality.codeSmells.length > 0) {
            const criticalSmells = analysis.quality.codeSmells.filter(s => s.severity === 'high' || s.severity === 'critical');
            if (criticalSmells.length > 0) {
              allSuggestions.push({
                id: this.generateId(),
                type: 'code-smell',
                priority: 'high',
                title: `Fix ${criticalSmells.length} critical code smells`,
                description: criticalSmells.map(s => s.description).join('; '),
                filePath: analysis.filePath,
                impact: 'high',
                effort: 'medium',
                codeSmells: criticalSmells
              });
            }
          }
        }
      } catch (error) {
        console.error('Error generating suggestions for file:', analysis.filePath, error);
      }
    }
    
    // Rank suggestions by priority and remove duplicates
    const uniqueSuggestions = this.deduplicateSuggestions(allSuggestions);
    return uniqueSuggestions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }

  deduplicateSuggestions(suggestions) {
    const seen = new Set();
    return suggestions.filter(s => {
      const key = `${s.type}-${s.title}-${s.filePath}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async getSuggestions(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    return project.suggestions;
  }

  async startRefactoring(projectId, selectedSuggestions, progressCallback) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    project.status = 'refactoring';
    
    try {
      // Create migration plan
      const migrationPlan = await this.migrationPlanner.createMigrationPlan(
        project.analysis.results,
        { suggestions: selectedSuggestions }
      );
      
      project.migrationPlan = migrationPlan;
      
      // Execute refactoring steps
      const totalSteps = migrationPlan.migrationSteps.length;
      const results = [];
      
      for (let i = 0; i < migrationPlan.migrationSteps.length; i++) {
        const step = migrationPlan.migrationSteps[i];
        
        // Check if manual intervention is required
        if (step.requiresIntervention) {
          await this.requestManualIntervention(projectId, step);
          // Wait for intervention to be resolved
          await this.waitForIntervention(projectId, step.id);
        }
        
        // Execute the step
        const stepResult = await this.executeRefactoringStep(step, project);
        results.push(stepResult);
        
        // Update progress
        const progress = Math.round(((i + 1) / totalSteps) * 100);
        project.progress.refactoring = progress;
        progressCallback({ 
          type: 'refactoring', 
          progress, 
          currentStep: step.description,
          stepResult 
        });
      }
      
      project.results = {
        steps: results,
        summary: this.generateRefactoringSummary(results),
        completedAt: new Date().toISOString()
      };
      
      project.status = 'completed';
      progressCallback({ type: 'refactoring', progress: 100, completed: true });
      
    } catch (error) {
      project.status = 'error';
      project.error = error.message;
      throw error;
    }
  }

  async requestManualIntervention(projectId, step) {
    const intervention = {
      id: this.generateId(),
      projectId,
      stepId: step.id,
      type: step.interventionType,
      description: step.description,
      options: step.options || [],
      context: step.context,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    this.interventions.set(intervention.id, intervention);
    
    const project = this.projects.get(projectId);
    project.interventions.push(intervention);
    
    return intervention;
  }

  async handleManualIntervention(projectId, interventionId, decision, notes) {
    const intervention = this.interventions.get(interventionId);
    if (!intervention) {
      throw new Error(`Intervention ${interventionId} not found`);
    }
    
    intervention.status = 'resolved';
    intervention.decision = decision;
    intervention.notes = notes;
    intervention.resolvedAt = new Date().toISOString();
    
    return intervention;
  }

  async waitForIntervention(projectId, stepId) {
    return new Promise((resolve) => {
      const checkIntervention = () => {
        const project = this.projects.get(projectId);
        const intervention = project.interventions.find(i => 
          i.stepId === stepId && i.status === 'resolved'
        );
        
        if (intervention) {
          resolve(intervention);
        } else {
          setTimeout(checkIntervention, 1000);
        }
      };
      
      checkIntervention();
    });
  }

  async executeRefactoringStep(step, project) {
    try {
      const results = {
        stepId: step.id,
        status: 'in-progress',
        executedAt: new Date().toISOString(),
        changes: [],
        warnings: [],
        errors: []
      };

      // Find the analysis result for this file
      const stepFilePath = step.filePath || step.targetFile;
      const fileAnalysis = project.analysis.results.find(a => 
        a.filePath === stepFilePath || 
        (step.files && step.files.includes(a.filePath))
      );

      if (!fileAnalysis) {
        throw new Error(`No analysis found for step file: ${stepFilePath || 'unknown'}`);
      }

      // Generate modern code based on the step type
      if (step.type === 'refactor' || step.type === 'modernize' || step.type === 'code_refactoring') {
        const generationResult = await this.modernCodeGenerator.generateModernCode(fileAnalysis, {
          targetLanguage: fileAnalysis.language,
          styleGuide: 'airbnb',
          optimizationLevel: 'moderate',
          preserveComments: true,
          generateDocumentation: true
        });

        if (generationResult.success) {
          // Write the generated code to a new file or update existing
          const modernizedPath = step.outputPath || 
            fileAnalysis.filePath.replace(/(\.[^.]+)$/, '.modern$1');
          
          // Join the generated code properly
          let codeToWrite = '';
          if (Array.isArray(generationResult.generatedCode)) {
            codeToWrite = generationResult.generatedCode.join('\n\n');
          } else if (typeof generationResult.generatedCode === 'string') {
            codeToWrite = generationResult.generatedCode;
          }
          
          if (!codeToWrite || codeToWrite.length === 0) {
            console.error('Warning: Generated code is empty for', fileAnalysis.filePath);
            console.error('generatedCode:', generationResult.generatedCode);
          }
          
          await fs.writeFile(modernizedPath, codeToWrite || '// Empty file - generation failed');
          
          results.changes.push({
            type: 'file_generated',
            filePath: modernizedPath,
            description: `Generated modern version of ${fileAnalysis.filePath}`,
            linesChanged: generationResult.metadata.generatedLinesOfCode,
            metrics: generationResult.metadata.metrics
          });

          // Add any warnings from the generator
          if (generationResult.warnings && generationResult.warnings.length > 0) {
            results.warnings.push(...generationResult.warnings.map(w => ({
              type: w.type,
              severity: w.severity,
              message: w.message
            })));
          }

          // Add improvement suggestions as info
          if (generationResult.suggestions && generationResult.suggestions.length > 0) {
            results.suggestions = generationResult.suggestions;
          }

          // If we need to generate tests
          if (step.generateTests) {
            try {
              const testResult = await this.testGenerator.generateTestSuite({
                ...fileAnalysis,
                modernCode: generationResult.generatedCode
              });

              if (testResult.success) {
                const testPath = fileAnalysis.filePath.replace(/(\.[^.]+)$/, '.test$1');
                await fs.writeFile(testPath, testResult.testCode);
                
                results.changes.push({
                  type: 'test_generated',
                  filePath: testPath,
                  description: `Generated test suite for ${fileAnalysis.filePath}`,
                  testCount: testResult.testCount
                });
              }
            } catch (testError) {
              results.warnings.push({
                type: 'test_generation',
                severity: 'medium',
                message: `Could not generate tests: ${testError.message}`
              });
            }
          }

          results.status = 'completed';
        } else {
          throw new Error(generationResult.error || 'Code generation failed');
        }
      } else if (step.type === 'validate') {
        // Run behavior comparison if we have original and modernized code
        const validationResult = await this.behaviorComparison.compareFiles(
          step.originalPath,
          step.modernizedPath
        );

        results.changes.push({
          type: 'validation_completed',
          description: 'Behavior validation completed',
          validationPassed: validationResult.equivalent,
          differences: validationResult.differences
        });

        results.status = validationResult.equivalent ? 'completed' : 'failed';
      } else {
        // Handle other step types
        results.status = 'completed';
        results.changes.push({
          type: step.type,
          description: step.description
        });
      }

      return results;
    } catch (error) {
      console.error('Error executing refactoring step:', error);
      return {
        stepId: step.id,
        status: 'failed',
        executedAt: new Date().toISOString(),
        changes: [],
        warnings: [],
        errors: [{
          type: 'execution_error',
          message: error.message,
          stack: error.stack
        }]
      };
    }
  }

  generateAnalysisSummary(analysisResults) {
    const totalFiles = analysisResults.length;
    const totalLines = analysisResults.reduce((sum, r) => sum + (r.metrics?.linesOfCode || 0), 0);
    const avgComplexity = analysisResults.reduce((sum, r) => sum + (r.metrics?.cyclomaticComplexity || 0), 0) / totalFiles;
    const avgTechnicalDebt = analysisResults.reduce((sum, r) => sum + (r.metrics?.technicalDebtScore || 0), 0) / totalFiles;
    
    return {
      totalFiles,
      totalLines,
      averageComplexity: Math.round(avgComplexity * 100) / 100,
      averageTechnicalDebt: Math.round(avgTechnicalDebt * 100) / 100,
      businessLogicComponents: analysisResults.reduce((sum, r) => sum + (r.businessLogic?.length || 0), 0),
      detectedPatterns: analysisResults.reduce((sum, r) => sum + (r.patterns?.length || 0), 0)
    };
  }

  generateRefactoringSummary(results) {
    const totalSteps = results.length;
    const completedSteps = results.filter(r => r.status === 'completed').length;
    const totalChanges = results.reduce((sum, r) => sum + (r.changes?.length || 0), 0);
    const totalWarnings = results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0);
    
    return {
      totalSteps,
      completedSteps,
      successRate: Math.round((completedSteps / totalSteps) * 100),
      totalChanges,
      totalWarnings
    };
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  async cleanup() {
    if (this.dbConnected) {
      try {
        await db.disconnect();
        this.dbConnected = false;
        console.log('RefactoringProjectManager: Database disconnected');
      } catch (error) {
        console.error('RefactoringProjectManager: Error disconnecting database:', error);
      }
    }
  }
}