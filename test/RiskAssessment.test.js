import { describe, it, expect, beforeEach } from 'vitest';
import { RiskAssessment } from '../src/migration/RiskAssessment.js';

describe('RiskAssessment', () => {
  let riskAssessment;
  let mockMigrationStep;
  let mockContext;

  beforeEach(() => {
    riskAssessment = new RiskAssessment({
      riskThreshold: 7,
      rollbackEnabled: true
    });

    mockMigrationStep = {
      id: 'step-1',
      description: 'Refactor legacy authentication module',
      type: 'code_refactoring',
      databaseChanges: false,
      configurationChanges: false,
      featureFlags: false
    };

    mockContext = {
      codeMetrics: {
        cyclomaticComplexity: 15,
        linesOfCode: 500,
        nestingDepth: 4
      },
      dependencies: ['moduleA', 'moduleB', 'moduleC'],
      reverseDependencies: ['moduleX', 'moduleY'],
      circularDependencies: [],
      testCoverage: 60,
      hasUnitTests: true,
      hasIntegrationTests: false,
      businessCriticality: 'high',
      userImpact: 'medium',
      revenueImpact: 'low',
      filesAffected: 5,
      modulesAffected: 2,
      apiChanges: false,
      teamExperience: 'medium',
      technologyFamiliarity: 'high',
      domainKnowledge: 'medium',
      externalDependencies: ['express', 'lodash'],
      thirdPartyServices: ['auth0'],
      legacySystemIntegrations: []
    };
  });

  describe('assessMigrationStepRisk', () => {
    it('should calculate overall risk score', () => {
      const assessment = riskAssessment.assessMigrationStepRisk(mockMigrationStep, mockContext);

      expect(assessment.overallRisk).toBeGreaterThan(0);
      expect(assessment.overallRisk).toBeLessThanOrEqual(10);
      expect(assessment.riskLevel).toMatch(/low|medium|high|critical/);
    });

    it('should identify risk factors', () => {
      const assessment = riskAssessment.assessMigrationStepRisk(mockMigrationStep, mockContext);

      expect(assessment.riskFactors).toBeDefined();
      expect(assessment.riskFactors.code_complexity).toBeGreaterThan(0);
      expect(assessment.riskFactors.dependency_coupling).toBeGreaterThan(0);
      expect(assessment.riskFactors.test_coverage).toBeGreaterThan(0);
      expect(assessment.riskFactors.business_criticality).toBeGreaterThan(0);
    });

    it('should identify high-risk factors', () => {
      const highRiskContext = {
        ...mockContext,
        codeMetrics: {
          cyclomaticComplexity: 50,
          linesOfCode: 2000,
          nestingDepth: 8
        },
        testCoverage: 10,
        businessCriticality: 'critical'
      };

      const assessment = riskAssessment.assessMigrationStepRisk(mockMigrationStep, highRiskContext);

      expect(assessment.highRiskFactors.length).toBeGreaterThan(0);
      expect(assessment.highRiskFactors[0].severity).toMatch(/high|critical/);
    });

    it('should generate mitigation strategies', () => {
      const assessment = riskAssessment.assessMigrationStepRisk(mockMigrationStep, mockContext);

      expect(assessment.mitigationStrategies).toBeDefined();
      expect(Array.isArray(assessment.mitigationStrategies)).toBe(true);
      
      if (assessment.mitigationStrategies.length > 0) {
        const strategy = assessment.mitigationStrategies[0];
        expect(strategy.strategy).toBeDefined();
        expect(strategy.description).toBeDefined();
        expect(strategy.effort).toBeGreaterThan(0);
        expect(strategy.effectiveness).toBeGreaterThan(0);
        expect(Array.isArray(strategy.steps)).toBe(true);
      }
    });

    it('should create rollback plan', () => {
      const assessment = riskAssessment.assessMigrationStepRisk(mockMigrationStep, mockContext);

      expect(assessment.rollbackPlan).toBeDefined();
      expect(assessment.rollbackPlan.riskLevel).toMatch(/low|medium|high|critical/);
      expect(Array.isArray(assessment.rollbackPlan.strategies)).toBe(true);
      expect(assessment.rollbackPlan.estimatedRollbackTime).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(assessment.rollbackPlan.validationSteps)).toBe(true);
    });

    it('should generate recommendations', () => {
      const assessment = riskAssessment.assessMigrationStepRisk(mockMigrationStep, mockContext);

      expect(assessment.recommendations).toBeDefined();
      expect(Array.isArray(assessment.recommendations)).toBe(true);
    });
  });

  describe('risk factor calculations', () => {
    it('should calculate complexity risk correctly', () => {
      const lowComplexityContext = {
        codeMetrics: { cyclomaticComplexity: 2, linesOfCode: 50, nestingDepth: 1 }
      };
      const highComplexityContext = {
        codeMetrics: { cyclomaticComplexity: 50, linesOfCode: 2000, nestingDepth: 10 }
      };

      const lowRisk = riskAssessment.calculateComplexityRisk(mockMigrationStep, lowComplexityContext);
      const highRisk = riskAssessment.calculateComplexityRisk(mockMigrationStep, highComplexityContext);

      expect(highRisk).toBeGreaterThan(lowRisk);
      expect(lowRisk).toBeGreaterThanOrEqual(1);
      expect(highRisk).toBeLessThanOrEqual(10);
    });

    it('should calculate coupling risk correctly', () => {
      const lowCouplingContext = {
        dependencies: ['moduleA'],
        reverseDependencies: [],
        circularDependencies: []
      };
      const highCouplingContext = {
        dependencies: Array(15).fill().map((_, i) => `module${i}`),
        reverseDependencies: Array(10).fill().map((_, i) => `reverseModule${i}`),
        circularDependencies: ['circularA', 'circularB']
      };

      const lowRisk = riskAssessment.calculateCouplingRisk(mockMigrationStep, lowCouplingContext);
      const highRisk = riskAssessment.calculateCouplingRisk(mockMigrationStep, highCouplingContext);

      expect(highRisk).toBeGreaterThan(lowRisk);
    });

    it('should calculate test coverage risk correctly', () => {
      const highCoverageContext = {
        testCoverage: 90,
        hasUnitTests: true,
        hasIntegrationTests: true
      };
      const lowCoverageContext = {
        testCoverage: 10,
        hasUnitTests: false,
        hasIntegrationTests: false
      };

      const lowRisk = riskAssessment.calculateTestCoverageRisk(mockMigrationStep, highCoverageContext);
      const highRisk = riskAssessment.calculateTestCoverageRisk(mockMigrationStep, lowCoverageContext);

      expect(highRisk).toBeGreaterThan(lowRisk);
    });

    it('should calculate business criticality risk correctly', () => {
      const lowCriticalityContext = {
        businessCriticality: 'low',
        userImpact: 'low',
        revenueImpact: 'low'
      };
      const highCriticalityContext = {
        businessCriticality: 'critical',
        userImpact: 'high',
        revenueImpact: 'high'
      };

      const lowRisk = riskAssessment.calculateBusinessCriticalityRisk(mockMigrationStep, lowCriticalityContext);
      const highRisk = riskAssessment.calculateBusinessCriticalityRisk(mockMigrationStep, highCriticalityContext);

      expect(highRisk).toBeGreaterThan(lowRisk);
    });
  });

  describe('mitigation strategies', () => {
    it('should provide strategies for high complexity', () => {
      const strategies = riskAssessment.getMitigationStrategiesForFactor('code_complexity', 8);

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies[0].strategy).toBeDefined();
      expect(strategies[0].applicableToFactor).toBe('code_complexity');
    });

    it('should provide strategies for high coupling', () => {
      const strategies = riskAssessment.getMitigationStrategiesForFactor('dependency_coupling', 9);

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies[0].strategy).toBeDefined();
      expect(strategies[0].applicableToFactor).toBe('dependency_coupling');
    });

    it('should provide strategies for low test coverage', () => {
      const strategies = riskAssessment.getMitigationStrategiesForFactor('test_coverage', 8);

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies[0].strategy).toBeDefined();
      expect(strategies[0].applicableToFactor).toBe('test_coverage');
    });

    it('should provide strategies for high business criticality', () => {
      const strategies = riskAssessment.getMitigationStrategiesForFactor('business_criticality', 9);

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies[0].strategy).toBeDefined();
      expect(strategies[0].applicableToFactor).toBe('business_criticality');
    });
  });

  describe('rollback plans', () => {
    it('should create appropriate rollback plan for code refactoring', () => {
      const step = { ...mockMigrationStep, type: 'code_refactoring' };
      const rollbackPlan = riskAssessment.createRollbackPlan(step, 'medium');

      expect(rollbackPlan.strategies.length).toBeGreaterThan(0);
      expect(rollbackPlan.strategies[0].type).toBe('version_control');
    });

    it('should create rollback plan for database changes', () => {
      const step = { ...mockMigrationStep, databaseChanges: true };
      const rollbackPlan = riskAssessment.createRollbackPlan(step, 'high');

      expect(rollbackPlan.automated).toBe(false);
      expect(rollbackPlan.strategies.some(s => s.type === 'data_migration')).toBe(true);
    });

    it('should create rollback plan for configuration changes', () => {
      const step = { ...mockMigrationStep, configurationChanges: true };
      const rollbackPlan = riskAssessment.createRollbackPlan(step, 'medium');

      expect(rollbackPlan.strategies.some(s => s.type === 'configuration')).toBe(true);
    });

    it('should create rollback plan for feature flag changes', () => {
      const step = { ...mockMigrationStep, featureFlags: true };
      const rollbackPlan = riskAssessment.createRollbackPlan(step, 'low');

      expect(rollbackPlan.strategies.some(s => s.type === 'feature_control')).toBe(true);
    });

    it('should add prerequisites for high-risk rollbacks', () => {
      const rollbackPlan = riskAssessment.createRollbackPlan(mockMigrationStep, 'critical');

      expect(rollbackPlan.prerequisites.length).toBeGreaterThan(0);
      expect(rollbackPlan.prerequisites.some(p => p.includes('backup'))).toBe(true);
    });
  });

  describe('batch migration risk assessment', () => {
    let mockMigrationSteps;

    beforeEach(() => {
      mockMigrationSteps = [
        {
          id: 'step-1',
          description: 'Low risk step',
          context: {
            codeMetrics: { cyclomaticComplexity: 2, linesOfCode: 100, nestingDepth: 1 },
            testCoverage: 90,
            businessCriticality: 'low'
          }
        },
        {
          id: 'step-2',
          description: 'Medium risk step',
          context: {
            codeMetrics: { cyclomaticComplexity: 10, linesOfCode: 500, nestingDepth: 3 },
            testCoverage: 60,
            businessCriticality: 'medium'
          }
        },
        {
          id: 'step-3',
          description: 'High risk step',
          context: {
            codeMetrics: { cyclomaticComplexity: 30, linesOfCode: 1500, nestingDepth: 6 },
            testCoverage: 20,
            businessCriticality: 'high'
          },
          dependencies: ['step-1']
        }
      ];
    });

    it('should assess batch migration risk', () => {
      const batchAssessment = riskAssessment.assessBatchMigrationRisk(mockMigrationSteps);

      expect(batchAssessment.batchRiskLevel).toMatch(/low|medium|high|critical/);
      expect(batchAssessment.averageRisk).toBeGreaterThan(0);
      expect(batchAssessment.totalSteps).toBe(3);
      expect(batchAssessment.stepAssessments).toHaveLength(3);
    });

    it('should identify interdependency risks', () => {
      const batchAssessment = riskAssessment.assessBatchMigrationRisk(mockMigrationSteps);

      expect(batchAssessment.interdependencyRisks).toBeDefined();
      expect(Array.isArray(batchAssessment.interdependencyRisks)).toBe(true);
    });

    it('should generate batch mitigation strategies', () => {
      const batchAssessment = riskAssessment.assessBatchMigrationRisk(mockMigrationSteps);

      expect(batchAssessment.batchMitigationStrategies).toBeDefined();
      expect(Array.isArray(batchAssessment.batchMitigationStrategies)).toBe(true);
    });

    it('should create batch rollback plan', () => {
      const batchAssessment = riskAssessment.assessBatchMigrationRisk(mockMigrationSteps);

      expect(batchAssessment.batchRollbackPlan).toBeDefined();
      expect(batchAssessment.batchRollbackPlan.rollbackStrategy).toMatch(/full_rollback|selective_rollback/);
      expect(batchAssessment.batchRollbackPlan.stepRollbackPlans).toHaveLength(3);
    });

    it('should generate execution recommendations', () => {
      const batchAssessment = riskAssessment.assessBatchMigrationRisk(mockMigrationSteps);

      expect(batchAssessment.executionRecommendations).toBeDefined();
      expect(Array.isArray(batchAssessment.executionRecommendations)).toBe(true);
    });

    it('should handle empty migration steps', () => {
      const batchAssessment = riskAssessment.assessBatchMigrationRisk([]);

      expect(batchAssessment.totalSteps).toBe(0);
      expect(batchAssessment.averageRisk).toBe(0);
      expect(batchAssessment.stepAssessments).toHaveLength(0);
    });
  });

  describe('risk categorization', () => {
    it('should categorize risk levels correctly', () => {
      expect(riskAssessment.categorizeRisk(2)).toBe('low');
      expect(riskAssessment.categorizeRisk(4)).toBe('medium');
      expect(riskAssessment.categorizeRisk(7)).toBe('high');
      expect(riskAssessment.categorizeRisk(9)).toBe('critical');
    });
  });

  describe('recommendations', () => {
    it('should generate critical recommendations for very high risk', () => {
      const highRiskContext = {
        ...mockContext,
        codeMetrics: { cyclomaticComplexity: 100, linesOfCode: 5000, nestingDepth: 15 },
        testCoverage: 5,
        businessCriticality: 'critical'
      };

      const assessment = riskAssessment.assessMigrationStepRisk(mockMigrationStep, highRiskContext);

      expect(assessment.recommendations.some(r => r.priority === 'critical')).toBe(true);
    });

    it('should generate factor-specific recommendations', () => {
      const recommendations = riskAssessment.getFactorSpecificRecommendations('code_complexity', 9);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].recommendation).toContain('smaller steps');
    });
  });
});