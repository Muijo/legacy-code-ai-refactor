import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationPlanner } from '../src/migration/MigrationPlanner.js';

describe('MigrationPlanner', () => {
  let migrationPlanner;
  let mockCodeAnalysisResults;
  let mockMigrationContext;

  beforeEach(() => {
    migrationPlanner = new MigrationPlanner({
      maxParallelSteps: 3,
      riskThreshold: 6,
      requireApprovalForHighRisk: true
    });

    mockCodeAnalysisResults = [
      {
        success: true,
        filePath: '/src/auth/UserAuth.js',
        codeMetrics: {
          cyclomaticComplexity: 12,
          linesOfCode: 450,
          nestingDepth: 3
        },
        parsing: {
          dependencies: [
            { path: '/src/utils/crypto.js', type: 'import', strength: 'strong' },
            { path: '/src/db/UserModel.js', type: 'import', strength: 'medium' }
          ]
        },
        businessLogic: ['authentication', 'session_management'],
        patterns: ['singleton', 'observer'],
        modernizationSuggestions: ['use_async_await', 'extract_validation']
      },
      {
        success: true,
        filePath: '/src/utils/crypto.js',
        codeMetrics: {
          cyclomaticComplexity: 5,
          linesOfCode: 150,
          nestingDepth: 2
        },
        parsing: {
          dependencies: []
        },
        businessLogic: ['encryption', 'hashing'],
        patterns: ['utility'],
        modernizationSuggestions: ['use_modern_crypto_api']
      },
      {
        success: true,
        filePath: '/src/db/UserModel.js',
        codeMetrics: {
          cyclomaticComplexity: 20,
          linesOfCode: 800,
          nestingDepth: 4
        },
        parsing: {
          dependencies: [
            { path: '/src/utils/crypto.js', type: 'import', strength: 'weak' }
          ]
        },
        businessLogic: ['user_management', 'data_persistence'],
        patterns: ['active_record'],
        modernizationSuggestions: ['extract_repository', 'use_orm']
      }
    ];

    mockMigrationContext = {
      testCoverage: 65,
      hasUnitTests: true,
      hasIntegrationTests: true,
      businessCriticality: 'high',
      userImpact: 'medium',
      revenueImpact: 'low',
      teamExperience: 'high',
      technologyFamiliarity: 'medium',
      domainKnowledge: 'high'
    };
  });

  describe('createMigrationPlan', () => {
    it('should create comprehensive migration plan', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.id).toBeDefined();
      expect(plan.createdAt).toBeDefined();
      expect(plan.totalSteps).toBe(3);
      expect(plan.migrationSteps).toHaveLength(3);
      expect(plan.executionPhases).toBeDefined();
      expect(plan.overallRisk).toMatch(/low|medium|high|critical/);
    });

    it('should include dependency analysis', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.dependencyAnalysis).toBeDefined();
      expect(plan.dependencyAnalysis.directDependencies).toBeDefined();
      expect(plan.dependencyAnalysis.reverseDependencies).toBeDefined();
      expect(plan.dependencyAnalysis.dependencyMetrics).toBeDefined();
    });

    it('should generate migration steps with context', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      const step = plan.migrationSteps[0];
      expect(step.id).toBeDefined();
      expect(step.targetFile).toBeDefined();
      expect(step.description).toBeDefined();
      expect(step.type).toBe('code_refactoring');
      expect(step.context).toBeDefined();
      expect(step.modernizationSuggestions).toBeDefined();
      expect(step.estimatedEffort).toBeGreaterThan(0);
    });

    it('should create execution phases', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.executionPhases).toBeDefined();
      expect(Array.isArray(plan.executionPhases)).toBe(true);
      expect(plan.executionPhases.length).toBeGreaterThan(0);

      const phase = plan.executionPhases[0];
      expect(phase.id).toBeDefined();
      expect(phase.steps).toBeDefined();
      expect(phase.riskLevel).toMatch(/low|medium|high|critical/);
      expect(phase.estimatedDuration).toBeGreaterThan(0);
    });

    it('should include risk assessment', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.riskAssessment).toBeDefined();
      expect(plan.riskAssessment.batchRiskLevel).toMatch(/low|medium|high|critical/);
      expect(plan.riskAssessment.stepAssessments).toHaveLength(3);
      expect(plan.riskAssessment.batchMitigationStrategies).toBeDefined();
    });

    it('should consolidate mitigation strategies', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.mitigationStrategies).toBeDefined();
      expect(Array.isArray(plan.mitigationStrategies)).toBe(true);
      
      if (plan.mitigationStrategies.length > 0) {
        const strategy = plan.mitigationStrategies[0];
        expect(strategy.strategy).toBeDefined();
        expect(strategy.description).toBeDefined();
        expect(strategy.effort).toBeGreaterThan(0);
        expect(strategy.effectiveness).toBeGreaterThan(0);
      }
    });

    it('should create comprehensive rollback plan', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.rollbackPlan).toBeDefined();
      expect(plan.rollbackPlan.preRollbackChecklist).toBeDefined();
      expect(plan.rollbackPlan.rollbackProcedure).toBeDefined();
      expect(plan.rollbackPlan.postRollbackActions).toBeDefined();
      expect(plan.rollbackPlan.rollbackTriggers).toBeDefined();
    });

    it('should generate execution recommendations', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.executionRecommendations).toBeDefined();
      expect(Array.isArray(plan.executionRecommendations)).toBe(true);
    });

    it('should calculate duration estimates', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.estimatedDuration).toBeDefined();
      expect(plan.estimatedDuration.sequential).toBeGreaterThan(0);
      expect(plan.estimatedDuration.withParallelization).toBeGreaterThan(0);
      expect(plan.estimatedDuration.criticalPath).toBeGreaterThan(0);
    });

    it('should calculate effort estimates', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.estimatedEffort).toBeDefined();
      expect(plan.estimatedEffort.totalHours).toBeGreaterThan(0);
      expect(plan.estimatedEffort.totalDays).toBeGreaterThan(0);
      expect(plan.estimatedEffort.breakdown).toBeDefined();
      expect(plan.estimatedEffort.breakdown.development).toBeGreaterThan(0);
    });

    it('should determine approval requirements', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.requiresApproval).toBeDefined();
      expect(plan.requiresApproval.required).toBeDefined();
      expect(plan.requiresApproval.level).toMatch(/none|technical|management|executive/);
    });

    it('should generate validation criteria', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.validationCriteria).toBeDefined();
      expect(Array.isArray(plan.validationCriteria)).toBe(true);
      expect(plan.validationCriteria.length).toBeGreaterThan(0);

      const criterion = plan.validationCriteria[0];
      expect(criterion.type).toBeDefined();
      expect(criterion.description).toBeDefined();
      expect(criterion.validationMethod).toBeDefined();
      expect(criterion.priority).toMatch(/low|medium|high|critical/);
    });

    it('should create monitoring plan', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.monitoringPlan).toBeDefined();
      expect(plan.monitoringPlan.realTimeMetrics).toBeDefined();
      expect(plan.monitoringPlan.alertingRules).toBeDefined();
      expect(plan.monitoringPlan.checkpoints).toBeDefined();
      expect(plan.monitoringPlan.reportingSchedule).toBeDefined();
      expect(plan.monitoringPlan.escalationProcedures).toBeDefined();
    });
  });

  describe('step generation', () => {
    it('should generate migration steps from analysis results', () => {
      const dependencyAnalysis = migrationPlanner.dependencyResolver.analyzeDependencies(mockCodeAnalysisResults);
      const steps = migrationPlanner.generateMigrationSteps(mockCodeAnalysisResults, dependencyAnalysis, mockMigrationContext);

      expect(steps).toHaveLength(3);
      
      const step = steps[0];
      expect(step.id).toBeDefined();
      expect(step.targetFile).toBeDefined();
      expect(step.description).toBeDefined();
      expect(step.type).toBe('code_refactoring');
      expect(step.context).toBeDefined();
      expect(step.estimatedEffort).toBeGreaterThan(0);
    });

    it('should include dependencies in step context', () => {
      const dependencyAnalysis = migrationPlanner.dependencyResolver.analyzeDependencies(mockCodeAnalysisResults);
      const steps = migrationPlanner.generateMigrationSteps(mockCodeAnalysisResults, dependencyAnalysis, mockMigrationContext);

      const authStep = steps.find(s => s.targetFile === '/src/auth/UserAuth.js');
      expect(authStep.context.dependencies).toBeDefined();
      expect(authStep.context.dependencies.length).toBeGreaterThan(0);
    });

    it('should generate deliverables for each step', () => {
      const dependencyAnalysis = migrationPlanner.dependencyResolver.analyzeDependencies(mockCodeAnalysisResults);
      const steps = migrationPlanner.generateMigrationSteps(mockCodeAnalysisResults, dependencyAnalysis, mockMigrationContext);

      const step = steps[0];
      expect(step.deliverables).toBeDefined();
      expect(Array.isArray(step.deliverables)).toBe(true);
      expect(step.deliverables.length).toBeGreaterThan(0);
    });

    it('should generate validation tests for each step', () => {
      const dependencyAnalysis = migrationPlanner.dependencyResolver.analyzeDependencies(mockCodeAnalysisResults);
      const steps = migrationPlanner.generateMigrationSteps(mockCodeAnalysisResults, dependencyAnalysis, mockMigrationContext);

      const step = steps[0];
      expect(step.validationTests).toBeDefined();
      expect(Array.isArray(step.validationTests)).toBe(true);
      expect(step.validationTests.length).toBeGreaterThan(0);
    });
  });

  describe('execution optimization', () => {
    it('should optimize execution plan based on dependencies and risks', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      expect(plan.executionPhases).toBeDefined();
      expect(plan.parallelizableSteps).toBeDefined();
      expect(plan.criticalPath).toBeDefined();
    });

    it('should create phases with appropriate risk levels', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      for (const phase of plan.executionPhases) {
        expect(phase.riskLevel).toMatch(/low|medium|high|critical/);
        expect(phase.estimatedDuration).toBeGreaterThan(0);
      }
    });

    it('should apply risk-based optimizations', () => {
      // Create high-risk scenario
      const highRiskResults = mockCodeAnalysisResults.map(result => ({
        ...result,
        codeMetrics: {
          cyclomaticComplexity: 50,
          linesOfCode: 2000,
          nestingDepth: 8
        }
      }));

      const highRiskContext = {
        ...mockMigrationContext,
        testCoverage: 10,
        businessCriticality: 'critical'
      };

      const plan = migrationPlanner.createMigrationPlan(highRiskResults, highRiskContext);

      // Should have risk-based optimizations
      const hasHighRiskPhases = plan.executionPhases.some(phase => 
        phase.riskLevel === 'high' || phase.riskLevel === 'critical'
      );
      expect(hasHighRiskPhases).toBe(true);
    });
  });

  describe('plan management', () => {
    it('should store and retrieve migration plans', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);
      const retrievedPlan = migrationPlanner.getMigrationPlan(plan.id);

      expect(retrievedPlan).toEqual(plan);
    });

    it('should list all migration plans', () => {
      const plan1 = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);
      const plan2 = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);

      const allPlans = migrationPlanner.listMigrationPlans();
      expect(allPlans).toHaveLength(2);
      expect(allPlans.map(p => p.id)).toContain(plan1.id);
      expect(allPlans.map(p => p.id)).toContain(plan2.id);
    });

    it('should update migration plans', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, mockMigrationContext);
      const updates = { status: 'in_progress', executedSteps: 1 };

      const updatedPlan = migrationPlanner.updateMigrationPlan(plan.id, updates);

      expect(updatedPlan.status).toBe('in_progress');
      expect(updatedPlan.executedSteps).toBe(1);
      expect(updatedPlan.updatedAt).toBeDefined();
    });

    it('should throw error when updating non-existent plan', () => {
      expect(() => {
        migrationPlanner.updateMigrationPlan('non-existent-id', {});
      }).toThrow('Migration plan non-existent-id not found');
    });
  });

  describe('helper methods', () => {
    it('should estimate step effort based on complexity', () => {
      const simpleResult = {
        codeMetrics: { cyclomaticComplexity: 2, linesOfCode: 50 }
      };
      const complexResult = {
        codeMetrics: { cyclomaticComplexity: 30, linesOfCode: 1500 }
      };

      const simpleEffort = migrationPlanner.estimateStepEffort(simpleResult);
      const complexEffort = migrationPlanner.estimateStepEffort(complexResult);

      expect(complexEffort).toBeGreaterThan(simpleEffort);
      expect(simpleEffort).toBeGreaterThanOrEqual(1);
    });

    it('should generate appropriate deliverables', () => {
      const deliverables = migrationPlanner.generateStepDeliverables(mockCodeAnalysisResults[0]);

      expect(deliverables).toContain('Refactored code with modern patterns');
      expect(deliverables).toContain('Updated unit tests');
      expect(deliverables).toContain('Documentation updates');
      expect(deliverables).toContain('Code review completion');
    });

    it('should generate validation tests', () => {
      const tests = migrationPlanner.generateValidationTests(mockCodeAnalysisResults[0]);

      expect(tests).toContain('Unit tests for refactored functionality');
      expect(tests).toContain('Integration tests for external dependencies');
      expect(tests).toContain('Regression tests for existing behavior');
    });

    it('should generate success criteria', () => {
      const criteria = migrationPlanner.generateSuccessCriteria(mockCodeAnalysisResults[0]);

      expect(criteria).toHaveLength(2);
      expect(criteria[0].type).toBe('functional');
      expect(criteria[1].type).toBe('quality');
    });

    it('should calculate phase duration', () => {
      const steps = [
        { estimatedEffort: 4 },
        { estimatedEffort: 6 },
        { estimatedEffort: 2 }
      ];

      const duration = migrationPlanner.calculatePhaseDuration(steps);
      expect(duration).toBe(12);
    });
  });

  describe('edge cases', () => {
    it('should handle empty code analysis results', () => {
      const plan = migrationPlanner.createMigrationPlan([], mockMigrationContext);

      expect(plan.totalSteps).toBe(0);
      expect(plan.migrationSteps).toHaveLength(0);
      expect(plan.executionPhases).toHaveLength(0);
    });

    it('should handle failed analysis results', () => {
      const mixedResults = [
        { success: false, filePath: '/src/failed.js', error: 'Parse error' },
        ...mockCodeAnalysisResults
      ];

      const plan = migrationPlanner.createMigrationPlan(mixedResults, mockMigrationContext);

      expect(plan.totalSteps).toBe(3); // Only successful results
      expect(plan.migrationSteps).toHaveLength(3);
    });

    it('should handle missing context gracefully', () => {
      const plan = migrationPlanner.createMigrationPlan(mockCodeAnalysisResults, {});

      expect(plan.id).toBeDefined();
      expect(plan.totalSteps).toBe(3);
      expect(plan.overallRisk).toMatch(/low|medium|high|critical/);
    });
  });
});