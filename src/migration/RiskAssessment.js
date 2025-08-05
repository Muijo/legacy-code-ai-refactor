/**
 * Risk Assessment and Mitigation System
 * 
 * Provides comprehensive risk scoring for migration steps,
 * generates mitigation strategies for identified risks, and
 * creates rollback plans with automated recovery procedures.
 */

export class RiskAssessment {
  constructor(options = {}) {
    this.options = {
      riskThreshold: options.riskThreshold || 7, // 1-10 scale
      mitigationStrategies: options.mitigationStrategies || new Map(),
      rollbackEnabled: options.rollbackEnabled !== false,
      ...options
    };
    
    this.riskFactors = new Map();
    this.mitigationDatabase = new Map();
    this.rollbackStrategies = new Map();
    
    this.initializeRiskFactors();
    this.initializeMitigationStrategies();
    this.initializeRollbackStrategies();
  }

  /**
   * Initialize risk factors and their weights
   */
  initializeRiskFactors() {
    this.riskFactors.set('code_complexity', {
      weight: 0.25,
      calculator: this.calculateComplexityRisk.bind(this)
    });
    
    this.riskFactors.set('dependency_coupling', {
      weight: 0.20,
      calculator: this.calculateCouplingRisk.bind(this)
    });
    
    this.riskFactors.set('test_coverage', {
      weight: 0.15,
      calculator: this.calculateTestCoverageRisk.bind(this)
    });
    
    this.riskFactors.set('business_criticality', {
      weight: 0.15,
      calculator: this.calculateBusinessCriticalityRisk.bind(this)
    });
    
    this.riskFactors.set('change_scope', {
      weight: 0.10,
      calculator: this.calculateChangeScopeRisk.bind(this)
    });
    
    this.riskFactors.set('team_expertise', {
      weight: 0.10,
      calculator: this.calculateExpertiseRisk.bind(this)
    });
    
    this.riskFactors.set('external_dependencies', {
      weight: 0.05,
      calculator: this.calculateExternalDependencyRisk.bind(this)
    });
  }

  /**
   * Initialize mitigation strategies database
   */
  initializeMitigationStrategies() {
    // High complexity mitigation
    this.mitigationDatabase.set('high_complexity', [
      {
        strategy: 'incremental_refactoring',
        description: 'Break down complex refactoring into smaller, manageable steps',
        effort: 3,
        effectiveness: 8,
        steps: [
          'Identify logical boundaries within complex code',
          'Create intermediate refactoring steps',
          'Implement and test each step independently',
          'Validate functionality at each checkpoint'
        ]
      },
      {
        strategy: 'pair_programming',
        description: 'Use pair programming for complex refactoring tasks',
        effort: 2,
        effectiveness: 7,
        steps: [
          'Assign experienced developer as pair',
          'Review refactoring plan together',
          'Implement changes collaboratively',
          'Cross-validate understanding and approach'
        ]
      }
    ]);

    // High coupling mitigation
    this.mitigationDatabase.set('high_coupling', [
      {
        strategy: 'interface_extraction',
        description: 'Extract interfaces to reduce coupling before refactoring',
        effort: 4,
        effectiveness: 9,
        steps: [
          'Identify coupling points',
          'Extract common interfaces',
          'Refactor dependencies to use interfaces',
          'Test interface implementations'
        ]
      },
      {
        strategy: 'dependency_injection',
        description: 'Apply dependency injection to decouple components',
        effort: 5,
        effectiveness: 8,
        steps: [
          'Identify injectable dependencies',
          'Create dependency injection container',
          'Refactor constructors to accept dependencies',
          'Configure dependency mappings'
        ]
      }
    ]);

    // Low test coverage mitigation
    this.mitigationDatabase.set('low_test_coverage', [
      {
        strategy: 'characterization_tests',
        description: 'Create characterization tests before refactoring',
        effort: 6,
        effectiveness: 9,
        steps: [
          'Analyze current behavior of legacy code',
          'Create tests that capture existing behavior',
          'Run tests to establish baseline',
          'Use tests to verify refactoring preserves behavior'
        ]
      },
      {
        strategy: 'golden_master_testing',
        description: 'Use golden master technique for complex legacy code',
        effort: 4,
        effectiveness: 8,
        steps: [
          'Capture current outputs for various inputs',
          'Create automated comparison tests',
          'Run golden master tests after refactoring',
          'Investigate and resolve any differences'
        ]
      }
    ]);

    // Business criticality mitigation
    this.mitigationDatabase.set('high_business_criticality', [
      {
        strategy: 'blue_green_deployment',
        description: 'Use blue-green deployment for critical systems',
        effort: 7,
        effectiveness: 9,
        steps: [
          'Set up parallel environment (green)',
          'Deploy refactored code to green environment',
          'Run comprehensive tests in green environment',
          'Switch traffic to green environment when validated'
        ]
      },
      {
        strategy: 'feature_flags',
        description: 'Use feature flags to control refactored code rollout',
        effort: 3,
        effectiveness: 8,
        steps: [
          'Implement feature flag system',
          'Wrap refactored code with feature flags',
          'Gradually enable for subset of users',
          'Monitor metrics and rollback if needed'
        ]
      }
    ]);
  }

  /**
   * Initialize rollback strategies
   */
  initializeRollbackStrategies() {
    this.rollbackStrategies.set('code_rollback', {
      type: 'version_control',
      description: 'Rollback to previous code version',
      automatable: true,
      steps: [
        'Identify last known good commit',
        'Create rollback branch',
        'Revert changes to previous state',
        'Deploy rolled back version',
        'Verify system functionality'
      ],
      estimatedTime: 30 // minutes
    });

    this.rollbackStrategies.set('database_rollback', {
      type: 'data_migration',
      description: 'Rollback database schema changes',
      automatable: false,
      steps: [
        'Stop application to prevent data corruption',
        'Restore database from backup',
        'Run reverse migration scripts',
        'Validate data integrity',
        'Restart application with previous code'
      ],
      estimatedTime: 120 // minutes
    });

    this.rollbackStrategies.set('configuration_rollback', {
      type: 'configuration',
      description: 'Rollback configuration changes',
      automatable: true,
      steps: [
        'Identify configuration changes',
        'Restore previous configuration files',
        'Restart affected services',
        'Validate configuration is working'
      ],
      estimatedTime: 15 // minutes
    });

    this.rollbackStrategies.set('feature_flag_rollback', {
      type: 'feature_control',
      description: 'Disable feature flags to rollback functionality',
      automatable: true,
      steps: [
        'Access feature flag management system',
        'Disable flags for refactored features',
        'Verify old functionality is active',
        'Monitor system stability'
      ],
      estimatedTime: 5 // minutes
    });
  }

  /**
   * Assess risk for a migration step
   * @param {Object} migrationStep - The migration step to assess
   * @param {Object} context - Additional context for risk assessment
   * @returns {Object} Risk assessment results
   */
  assessMigrationStepRisk(migrationStep, context = {}) {
    const riskScores = new Map();
    let totalWeightedRisk = 0;
    let totalWeight = 0;

    // Calculate risk for each factor
    for (const [factorName, factor] of this.riskFactors) {
      const riskScore = factor.calculator(migrationStep, context);
      riskScores.set(factorName, riskScore);
      
      totalWeightedRisk += riskScore * factor.weight;
      totalWeight += factor.weight;
    }

    const overallRisk = totalWeightedRisk / totalWeight;
    const riskLevel = this.categorizeRisk(overallRisk);

    return {
      overallRisk: Math.round(overallRisk * 10) / 10,
      riskLevel,
      riskFactors: Object.fromEntries(riskScores),
      highRiskFactors: this.identifyHighRiskFactors(riskScores),
      mitigationStrategies: this.generateMitigationStrategies(riskScores, overallRisk),
      rollbackPlan: this.createRollbackPlan(migrationStep, riskLevel),
      recommendations: this.generateRiskRecommendations(overallRisk, riskScores)
    };
  }

  /**
   * Calculate complexity-based risk
   */
  calculateComplexityRisk(migrationStep, context) {
    const codeMetrics = context.codeMetrics || {};
    const cyclomaticComplexity = codeMetrics.cyclomaticComplexity || 1;
    const linesOfCode = codeMetrics.linesOfCode || 0;
    const nestingDepth = codeMetrics.nestingDepth || 1;

    // Normalize complexity metrics to 1-10 scale
    const complexityScore = Math.min(10, 
      (cyclomaticComplexity / 10) * 3 +
      (linesOfCode / 1000) * 2 +
      (nestingDepth / 5) * 2
    );

    return Math.max(1, complexityScore);
  }

  /**
   * Calculate coupling-based risk
   */
  calculateCouplingRisk(migrationStep, context) {
    const dependencies = context.dependencies || [];
    const reverseDependencies = context.reverseDependencies || [];
    const circularDependencies = context.circularDependencies || [];

    const totalCoupling = dependencies.length + reverseDependencies.length;
    const circularPenalty = circularDependencies.length * 2;

    const couplingScore = Math.min(10, 
      (totalCoupling / 20) * 6 + 
      (circularPenalty / 10) * 4
    );

    return Math.max(1, couplingScore);
  }

  /**
   * Calculate test coverage risk
   */
  calculateTestCoverageRisk(migrationStep, context) {
    const testCoverage = context.testCoverage || 0; // 0-100%
    const hasUnitTests = context.hasUnitTests || false;
    const hasIntegrationTests = context.hasIntegrationTests || false;

    let coverageScore = 10 - (testCoverage / 10); // Invert: low coverage = high risk
    
    if (!hasUnitTests) coverageScore += 2;
    if (!hasIntegrationTests) coverageScore += 1;

    return Math.min(10, Math.max(1, coverageScore));
  }

  /**
   * Calculate business criticality risk
   */
  calculateBusinessCriticalityRisk(migrationStep, context) {
    const businessCriticality = context.businessCriticality || 'medium'; // low, medium, high, critical
    const userImpact = context.userImpact || 'medium';
    const revenueImpact = context.revenueImpact || 'low';

    const criticalityScores = {
      'low': 2,
      'medium': 5,
      'high': 8,
      'critical': 10
    };

    const businessScore = criticalityScores[businessCriticality] || 5;
    const userScore = criticalityScores[userImpact] || 5;
    const revenueScore = criticalityScores[revenueImpact] || 2;

    return (businessScore * 0.5 + userScore * 0.3 + revenueScore * 0.2);
  }

  /**
   * Calculate change scope risk
   */
  calculateChangeScopeRisk(migrationStep, context) {
    const filesAffected = context.filesAffected || 1;
    const modulesAffected = context.modulesAffected || 1;
    const apiChanges = context.apiChanges || false;
    const databaseChanges = context.databaseChanges || false;

    let scopeScore = Math.min(6, filesAffected / 10 + modulesAffected / 5);
    
    if (apiChanges) scopeScore += 2;
    if (databaseChanges) scopeScore += 2;

    return Math.min(10, Math.max(1, scopeScore));
  }

  /**
   * Calculate team expertise risk
   */
  calculateExpertiseRisk(migrationStep, context) {
    const teamExperience = context.teamExperience || 'medium'; // low, medium, high
    const technologyFamiliarity = context.technologyFamiliarity || 'medium';
    const domainKnowledge = context.domainKnowledge || 'medium';

    const expertiseScores = {
      'low': 8,
      'medium': 5,
      'high': 2
    };

    const experienceScore = expertiseScores[teamExperience] || 5;
    const techScore = expertiseScores[technologyFamiliarity] || 5;
    const domainScore = expertiseScores[domainKnowledge] || 5;

    return (experienceScore * 0.4 + techScore * 0.4 + domainScore * 0.2);
  }

  /**
   * Calculate external dependency risk
   */
  calculateExternalDependencyRisk(migrationStep, context) {
    const externalDependencies = context.externalDependencies || [];
    const thirdPartyServices = context.thirdPartyServices || [];
    const legacySystemIntegrations = context.legacySystemIntegrations || [];

    const totalExternal = externalDependencies.length + 
                         thirdPartyServices.length + 
                         legacySystemIntegrations.length;

    return Math.min(10, Math.max(1, totalExternal / 2 + 1));
  }

  /**
   * Categorize overall risk level
   */
  categorizeRisk(riskScore) {
    if (riskScore <= 3) return 'low';
    if (riskScore <= 6) return 'medium';
    if (riskScore <= 8) return 'high';
    return 'critical';
  }

  /**
   * Identify high-risk factors that need attention
   */
  identifyHighRiskFactors(riskScores) {
    const highRiskFactors = [];
    
    for (const [factor, score] of riskScores) {
      if (score >= 7) {
        highRiskFactors.push({
          factor,
          score,
          severity: score >= 9 ? 'critical' : 'high'
        });
      }
    }

    return highRiskFactors.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate mitigation strategies based on risk factors
   */
  generateMitigationStrategies(riskScores, overallRisk) {
    const strategies = [];

    // Add strategies based on high-risk factors
    for (const [factor, score] of riskScores) {
      if (score >= 6) {
        const factorStrategies = this.getMitigationStrategiesForFactor(factor, score);
        strategies.push(...factorStrategies);
      }
    }

    // Add general high-risk strategies
    if (overallRisk >= 8) {
      strategies.push({
        strategy: 'executive_approval',
        description: 'Require executive approval for high-risk changes',
        effort: 1,
        effectiveness: 6,
        steps: [
          'Document risk assessment results',
          'Present to executive stakeholders',
          'Obtain formal approval before proceeding',
          'Establish escalation procedures'
        ]
      });
    }

    // Sort by effectiveness/effort ratio
    return strategies.sort((a, b) => (b.effectiveness / b.effort) - (a.effectiveness / a.effort));
  }

  /**
   * Get mitigation strategies for a specific risk factor
   */
  getMitigationStrategiesForFactor(factor, score) {
    const factorMappings = {
      'code_complexity': 'high_complexity',
      'dependency_coupling': 'high_coupling',
      'test_coverage': 'low_test_coverage',
      'business_criticality': 'high_business_criticality'
    };

    const strategyKey = factorMappings[factor];
    if (strategyKey && this.mitigationDatabase.has(strategyKey)) {
      return this.mitigationDatabase.get(strategyKey).map(strategy => ({
        ...strategy,
        applicableToFactor: factor,
        factorScore: score
      }));
    }

    return [];
  }

  /**
   * Create rollback plan for migration step
   */
  createRollbackPlan(migrationStep, riskLevel) {
    const rollbackPlan = {
      riskLevel,
      automated: riskLevel === 'low',
      strategies: [],
      estimatedRollbackTime: 0,
      prerequisites: [],
      validationSteps: []
    };

    // Add appropriate rollback strategies based on migration type
    if (migrationStep.type === 'code_refactoring') {
      rollbackPlan.strategies.push(this.rollbackStrategies.get('code_rollback'));
    }

    if (migrationStep.databaseChanges) {
      rollbackPlan.strategies.push(this.rollbackStrategies.get('database_rollback'));
      rollbackPlan.automated = false; // Database rollbacks need manual oversight
    }

    if (migrationStep.configurationChanges) {
      rollbackPlan.strategies.push(this.rollbackStrategies.get('configuration_rollback'));
    }

    if (migrationStep.featureFlags) {
      rollbackPlan.strategies.push(this.rollbackStrategies.get('feature_flag_rollback'));
    }

    // Calculate total rollback time
    rollbackPlan.estimatedRollbackTime = rollbackPlan.strategies.reduce(
      (total, strategy) => total + strategy.estimatedTime, 0
    );

    // Add prerequisites based on risk level
    if (riskLevel === 'high' || riskLevel === 'critical') {
      rollbackPlan.prerequisites.push(
        'Create full system backup',
        'Notify stakeholders of rollback procedures',
        'Prepare communication plan for users'
      );
    }

    // Add validation steps
    rollbackPlan.validationSteps = [
      'Verify system functionality after rollback',
      'Check data integrity',
      'Validate user-facing features',
      'Monitor system performance',
      'Confirm no residual issues from failed migration'
    ];

    return rollbackPlan;
  }

  /**
   * Generate risk-based recommendations
   */
  generateRiskRecommendations(overallRisk, riskScores) {
    const recommendations = [];

    if (overallRisk >= 8) {
      recommendations.push({
        priority: 'critical',
        recommendation: 'Consider postponing this migration until risks are mitigated',
        rationale: 'Overall risk score is too high for safe execution'
      });
    } else if (overallRisk >= 6) {
      recommendations.push({
        priority: 'high',
        recommendation: 'Implement comprehensive mitigation strategies before proceeding',
        rationale: 'High risk requires additional safeguards'
      });
    }

    // Specific recommendations based on risk factors
    for (const [factor, score] of riskScores) {
      if (score >= 8) {
        recommendations.push(...this.getFactorSpecificRecommendations(factor, score));
      }
    }

    return recommendations;
  }

  /**
   * Get specific recommendations for high-risk factors
   */
  getFactorSpecificRecommendations(factor, score) {
    const recommendations = [];

    switch (factor) {
      case 'code_complexity':
        recommendations.push({
          priority: 'high',
          recommendation: 'Break down complex refactoring into smaller steps',
          rationale: `Code complexity score of ${score} indicates high refactoring difficulty`
        });
        break;

      case 'test_coverage':
        recommendations.push({
          priority: 'high',
          recommendation: 'Increase test coverage before refactoring',
          rationale: `Low test coverage (score: ${score}) increases risk of introducing bugs`
        });
        break;

      case 'business_criticality':
        recommendations.push({
          priority: 'critical',
          recommendation: 'Use blue-green deployment or feature flags',
          rationale: `High business criticality (score: ${score}) requires zero-downtime approach`
        });
        break;

      case 'dependency_coupling':
        recommendations.push({
          priority: 'medium',
          recommendation: 'Decouple dependencies before refactoring',
          rationale: `High coupling (score: ${score}) increases refactoring complexity`
        });
        break;
    }

    return recommendations;
  }

  /**
   * Assess risk for multiple migration steps
   * @param {Array} migrationSteps - Array of migration steps
   * @param {Object} globalContext - Global context for all steps
   * @returns {Object} Batch risk assessment results
   */
  assessBatchMigrationRisk(migrationSteps, globalContext = {}) {
    const stepAssessments = [];
    let totalRisk = 0;
    let highRiskSteps = 0;
    let criticalRiskSteps = 0;

    // Assess each step individually
    for (const step of migrationSteps) {
      const stepContext = { ...globalContext, ...step.context };
      const assessment = this.assessMigrationStepRisk(step, stepContext);
      
      stepAssessments.push({
        stepId: step.id,
        stepDescription: step.description,
        ...assessment
      });

      totalRisk += assessment.overallRisk;
      
      if (assessment.riskLevel === 'high') highRiskSteps++;
      if (assessment.riskLevel === 'critical') criticalRiskSteps++;
    }

    const averageRisk = migrationSteps.length > 0 ? totalRisk / migrationSteps.length : 0;
    const batchRiskLevel = this.categorizeRisk(averageRisk);

    // Identify interdependency risks
    const interdependencyRisks = this.assessInterdependencyRisks(migrationSteps, stepAssessments);

    return {
      batchRiskLevel,
      averageRisk: Math.round(averageRisk * 10) / 10,
      totalSteps: migrationSteps.length,
      highRiskSteps,
      criticalRiskSteps,
      stepAssessments,
      interdependencyRisks,
      batchMitigationStrategies: this.generateBatchMitigationStrategies(stepAssessments),
      batchRollbackPlan: this.createBatchRollbackPlan(stepAssessments, batchRiskLevel),
      executionRecommendations: this.generateBatchExecutionRecommendations(stepAssessments, batchRiskLevel)
    };
  }

  /**
   * Assess risks from step interdependencies
   */
  assessInterdependencyRisks(migrationSteps, stepAssessments) {
    const risks = [];

    // Check for cascading failure risks
    const highRiskSteps = stepAssessments.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical');
    
    for (const highRiskStep of highRiskSteps) {
      const dependentSteps = migrationSteps.filter(step => 
        step.dependencies && step.dependencies.includes(highRiskStep.stepId)
      );

      if (dependentSteps.length > 0) {
        risks.push({
          type: 'cascading_failure',
          severity: 'high',
          description: `Failure of high-risk step ${highRiskStep.stepId} could impact ${dependentSteps.length} dependent steps`,
          affectedSteps: dependentSteps.map(s => s.id),
          mitigation: 'Implement circuit breaker pattern and independent rollback for each step'
        });
      }
    }

    return risks;
  }

  /**
   * Generate mitigation strategies for batch migration
   */
  generateBatchMitigationStrategies(stepAssessments) {
    const strategies = [];

    const criticalSteps = stepAssessments.filter(s => s.riskLevel === 'critical');
    const highRiskSteps = stepAssessments.filter(s => s.riskLevel === 'high');

    if (criticalSteps.length > 0) {
      strategies.push({
        strategy: 'critical_step_isolation',
        description: 'Isolate critical risk steps and execute separately',
        effort: 4,
        effectiveness: 9,
        steps: [
          'Identify critical risk steps',
          'Create separate execution plan for critical steps',
          'Implement additional safeguards for critical steps',
          'Execute critical steps with maximum oversight'
        ]
      });
    }

    if (highRiskSteps.length > stepAssessments.length * 0.3) {
      strategies.push({
        strategy: 'phased_execution',
        description: 'Execute migration in phases to reduce overall risk',
        effort: 3,
        effectiveness: 8,
        steps: [
          'Group steps by risk level and dependencies',
          'Execute low-risk steps first',
          'Validate each phase before proceeding',
          'Adjust plan based on phase results'
        ]
      });
    }

    return strategies;
  }

  /**
   * Create rollback plan for batch migration
   */
  createBatchRollbackPlan(stepAssessments, batchRiskLevel) {
    const plan = {
      batchRiskLevel,
      rollbackStrategy: batchRiskLevel === 'critical' ? 'full_rollback' : 'selective_rollback',
      stepRollbackPlans: stepAssessments.map(s => ({
        stepId: s.stepId,
        rollbackPlan: s.rollbackPlan
      })),
      coordinatedRollbackSteps: [],
      estimatedTotalRollbackTime: 0
    };

    // Calculate total rollback time
    plan.estimatedTotalRollbackTime = stepAssessments.reduce(
      (total, step) => total + step.rollbackPlan.estimatedRollbackTime, 0
    );

    // Add coordinated rollback steps
    plan.coordinatedRollbackSteps = [
      'Stop all migration processes',
      'Assess scope of rollback needed',
      'Execute rollback in reverse dependency order',
      'Validate system state after each rollback',
      'Perform full system validation',
      'Document rollback results and lessons learned'
    ];

    return plan;
  }

  /**
   * Generate execution recommendations for batch migration
   */
  generateBatchExecutionRecommendations(stepAssessments, batchRiskLevel) {
    const recommendations = [];

    if (batchRiskLevel === 'critical') {
      recommendations.push({
        priority: 'critical',
        recommendation: 'Do not proceed with batch migration until risks are significantly reduced',
        rationale: 'Batch risk level is too high for safe execution'
      });
    }

    const criticalSteps = stepAssessments.filter(s => s.riskLevel === 'critical').length;
    const highRiskSteps = stepAssessments.filter(s => s.riskLevel === 'high').length;

    if (criticalSteps > 0) {
      recommendations.push({
        priority: 'critical',
        recommendation: `Address ${criticalSteps} critical risk steps before execution`,
        rationale: 'Critical risk steps require individual attention and mitigation'
      });
    }

    if (highRiskSteps > stepAssessments.length * 0.5) {
      recommendations.push({
        priority: 'high',
        recommendation: 'Consider breaking batch into smaller, lower-risk batches',
        rationale: 'High proportion of risky steps increases overall batch failure probability'
      });
    }

    return recommendations;
  }
}