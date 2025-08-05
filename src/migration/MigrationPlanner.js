/**
 * Migration Planning System
 * 
 * Integrates dependency resolution and risk assessment to create
 * comprehensive migration plans with step ordering, risk mitigation,
 * and rollback procedures.
 */

import { DependencyResolver } from './DependencyResolver.js';
import { RiskAssessment } from './RiskAssessment.js';

export class MigrationPlanner {
  constructor(options = {}) {
    this.options = {
      maxParallelSteps: options.maxParallelSteps || 4,
      riskThreshold: options.riskThreshold || 7,
      requireApprovalForHighRisk: options.requireApprovalForHighRisk !== false,
      ...options
    };

    this.dependencyResolver = new DependencyResolver({
      maxDepth: options.maxDepth || 50,
      circularDependencyStrategy: options.circularDependencyStrategy || 'break_weakest',
      includeTransitive: options.includeTransitive !== false
    });

    this.riskAssessment = new RiskAssessment({
      riskThreshold: this.options.riskThreshold,
      rollbackEnabled: options.rollbackEnabled !== false
    });

    this.migrationPlans = new Map();
  }

  /**
   * Create comprehensive migration plan
   * @param {Array} codeAnalysisResults - Results from code analysis
   * @param {Object} migrationContext - Context for migration planning
   * @returns {Object} Complete migration plan
   */
  createMigrationPlan(codeAnalysisResults, migrationContext = {}) {
    // Step 1: Analyze dependencies
    const dependencyAnalysis = this.dependencyResolver.analyzeDependencies(codeAnalysisResults);

    // Step 2: Generate migration steps from analysis results
    const migrationSteps = this.generateMigrationSteps(codeAnalysisResults, dependencyAnalysis, migrationContext);

    // Step 3: Order steps based on dependencies
    const stepOrdering = this.dependencyResolver.generateStepOrdering(
      migrationSteps.map(step => step.targetFile)
    );

    // Step 4: Assess risks for each step
    const riskAssessment = this.riskAssessment.assessBatchMigrationRisk(
      migrationSteps, 
      migrationContext
    );

    // Step 5: Optimize execution plan
    const optimizedPlan = this.optimizeExecutionPlan(migrationSteps, stepOrdering, riskAssessment);

    // Step 6: Create comprehensive plan
    const migrationPlan = {
      id: this.generatePlanId(),
      createdAt: new Date().toISOString(),
      context: migrationContext,
      
      // Dependency information
      dependencyAnalysis,
      
      // Migration steps
      totalSteps: migrationSteps.length,
      migrationSteps: optimizedPlan.steps,
      
      // Execution planning
      executionPhases: optimizedPlan.phases,
      parallelizableSteps: stepOrdering.parallelizable,
      criticalPath: stepOrdering.criticalPath,
      
      // Risk assessment
      overallRisk: riskAssessment.batchRiskLevel,
      riskAssessment,
      
      // Mitigation and rollback
      mitigationStrategies: this.consolidateMitigationStrategies(riskAssessment),
      rollbackPlan: this.createComprehensiveRollbackPlan(riskAssessment),
      
      // Execution recommendations
      executionRecommendations: this.generateExecutionRecommendations(optimizedPlan, riskAssessment),
      
      // Estimates
      estimatedDuration: this.calculateTotalDuration(optimizedPlan),
      estimatedEffort: this.calculateTotalEffort(migrationSteps),
      
      // Approval requirements
      requiresApproval: this.determineApprovalRequirements(riskAssessment),
      
      // Monitoring and validation
      validationCriteria: this.generateValidationCriteria(migrationSteps),
      monitoringPlan: this.createMonitoringPlan(migrationSteps, riskAssessment)
    };

    // Store the plan
    this.migrationPlans.set(migrationPlan.id, migrationPlan);

    return migrationPlan;
  }

  /**
   * Generate migration steps from code analysis results
   */
  generateMigrationSteps(codeAnalysisResults, dependencyAnalysis, context) {
    const steps = [];

    for (const result of codeAnalysisResults) {
      if (!result.success) continue;

      const step = {
        id: this.generateStepId(result.filePath),
        targetFile: result.filePath,
        description: `Refactor ${result.filePath}`,
        type: 'code_refactoring',
        
        // Context for risk assessment
        context: {
          ...context,
          codeMetrics: result.codeMetrics || {},
          dependencies: this.getDependenciesForFile(result.filePath, dependencyAnalysis),
          reverseDependencies: this.getReverseDependenciesForFile(result.filePath, dependencyAnalysis),
          circularDependencies: this.getCircularDependenciesForFile(result.filePath, dependencyAnalysis),
          businessLogic: result.businessLogic || [],
          patterns: result.patterns || [],
          technicalDebt: result.technicalDebt || []
        },

        // Migration details
        modernizationSuggestions: result.modernizationSuggestions || [],
        estimatedEffort: this.estimateStepEffort(result),
        prerequisites: [],
        deliverables: this.generateStepDeliverables(result),
        
        // Validation
        validationTests: this.generateValidationTests(result),
        successCriteria: this.generateSuccessCriteria(result)
      };

      steps.push(step);
    }

    return steps;
  }

  /**
   * Get dependencies for a specific file
   */
  getDependenciesForFile(filePath, dependencyAnalysis) {
    const deps = dependencyAnalysis.directDependencies.get(filePath) || new Set();
    return Array.from(deps).map(dep => dep.file || dep);
  }

  /**
   * Get reverse dependencies for a specific file
   */
  getReverseDependenciesForFile(filePath, dependencyAnalysis) {
    const deps = dependencyAnalysis.reverseDependencies.get(filePath) || new Set();
    return Array.from(deps).map(dep => dep.file || dep);
  }

  /**
   * Get circular dependencies involving a specific file
   */
  getCircularDependenciesForFile(filePath, dependencyAnalysis) {
    return dependencyAnalysis.circularDependencies.filter(cycle => 
      cycle.chain && cycle.chain.includes(filePath)
    );
  }

  /**
   * Optimize execution plan based on dependencies and risks
   */
  optimizeExecutionPlan(migrationSteps, stepOrdering, riskAssessment) {
    // Create step lookup
    const stepLookup = new Map();
    migrationSteps.forEach(step => stepLookup.set(step.targetFile, step));

    // Order steps according to dependency analysis
    const orderedSteps = stepOrdering.orderedSteps.map(filePath => stepLookup.get(filePath)).filter(Boolean);

    // Group steps into execution phases
    const phases = this.createExecutionPhases(orderedSteps, stepOrdering, riskAssessment);

    // Apply risk-based optimizations
    const optimizedPhases = this.applyRiskOptimizations(phases, riskAssessment);

    return {
      steps: orderedSteps,
      phases: optimizedPhases,
      optimizations: this.getAppliedOptimizations(phases, optimizedPhases)
    };
  }

  /**
   * Create execution phases for migration steps
   */
  createExecutionPhases(orderedSteps, stepOrdering, riskAssessment) {
    const phases = [];
    const dependencyLevels = stepOrdering.dependencyLevels;
    const levelGroups = new Map();

    // Group steps by dependency level
    for (const step of orderedSteps) {
      const level = dependencyLevels.get(step.targetFile) || 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level).push(step);
    }

    // Create phases from levels
    for (const [level, steps] of levelGroups) {
      const phaseRisk = this.calculatePhaseRisk(steps, riskAssessment);
      
      phases.push({
        id: `phase-${level}`,
        level,
        steps,
        parallelizable: steps.length > 1,
        maxParallelism: Math.min(steps.length, this.options.maxParallelSteps),
        riskLevel: phaseRisk.level,
        estimatedDuration: this.calculatePhaseDuration(steps),
        prerequisites: level > 0 ? [`phase-${level - 1}`] : [],
        validationRequired: phaseRisk.level === 'high' || phaseRisk.level === 'critical'
      });
    }

    return phases;
  }

  /**
   * Calculate risk level for a phase
   */
  calculatePhaseRisk(steps, riskAssessment) {
    const stepAssessments = riskAssessment.stepAssessments.filter(assessment =>
      steps.some(step => step.id === assessment.stepId)
    );

    if (stepAssessments.length === 0) {
      return { level: 'low', score: 1 };
    }

    const averageRisk = stepAssessments.reduce((sum, assessment) => 
      sum + assessment.overallRisk, 0) / stepAssessments.length;

    return {
      level: this.riskAssessment.categorizeRisk(averageRisk),
      score: averageRisk
    };
  }

  /**
   * Apply risk-based optimizations to execution phases
   */
  applyRiskOptimizations(phases, riskAssessment) {
    const optimizedPhases = phases.map(phase => ({ ...phase }));

    // Separate high-risk steps
    for (const phase of optimizedPhases) {
      const highRiskSteps = phase.steps.filter(step => {
        const assessment = riskAssessment.stepAssessments.find(a => a.stepId === step.id);
        return assessment && (assessment.riskLevel === 'high' || assessment.riskLevel === 'critical');
      });

      if (highRiskSteps.length > 0 && phase.steps.length > highRiskSteps.length) {
        // Split phase into high-risk and normal-risk sub-phases
        phase.subPhases = [
          {
            id: `${phase.id}-normal`,
            steps: phase.steps.filter(step => !highRiskSteps.includes(step)),
            parallelizable: true,
            riskLevel: 'medium'
          },
          {
            id: `${phase.id}-high-risk`,
            steps: highRiskSteps,
            parallelizable: false, // Execute high-risk steps sequentially
            riskLevel: 'high',
            requiresApproval: true
          }
        ];
      }
    }

    // Add buffer time for high-risk phases
    for (const phase of optimizedPhases) {
      if (phase.riskLevel === 'high' || phase.riskLevel === 'critical') {
        phase.estimatedDuration *= 1.5; // Add 50% buffer
        phase.bufferTime = phase.estimatedDuration * 0.33;
      }
    }

    return optimizedPhases;
  }

  /**
   * Consolidate mitigation strategies from risk assessment
   */
  consolidateMitigationStrategies(riskAssessment) {
    const consolidatedStrategies = new Map();

    // Collect strategies from individual steps
    for (const stepAssessment of riskAssessment.stepAssessments) {
      for (const strategy of stepAssessment.mitigationStrategies) {
        const key = strategy.strategy;
        if (!consolidatedStrategies.has(key)) {
          consolidatedStrategies.set(key, {
            ...strategy,
            applicableSteps: [],
            totalEffort: 0,
            averageEffectiveness: 0
          });
        }

        const consolidated = consolidatedStrategies.get(key);
        consolidated.applicableSteps.push(stepAssessment.stepId);
        consolidated.totalEffort += strategy.effort;
        consolidated.averageEffectiveness = 
          (consolidated.averageEffectiveness + strategy.effectiveness) / 2;
      }
    }

    // Add batch-level strategies
    for (const strategy of riskAssessment.batchMitigationStrategies) {
      consolidatedStrategies.set(`batch_${strategy.strategy}`, {
        ...strategy,
        scope: 'batch',
        applicableSteps: riskAssessment.stepAssessments.map(s => s.stepId)
      });
    }

    return Array.from(consolidatedStrategies.values())
      .sort((a, b) => (b.averageEffectiveness / b.effort) - (a.averageEffectiveness / a.effort));
  }

  /**
   * Create comprehensive rollback plan
   */
  createComprehensiveRollbackPlan(riskAssessment) {
    const batchRollbackPlan = riskAssessment.batchRollbackPlan;

    return {
      ...batchRollbackPlan,
      
      // Enhanced rollback procedures
      preRollbackChecklist: [
        'Assess scope of issues requiring rollback',
        'Notify stakeholders of rollback initiation',
        'Ensure all team members are available',
        'Verify backup integrity and accessibility',
        'Document current system state'
      ],

      rollbackProcedure: [
        'Execute emergency stop procedures',
        'Isolate affected systems',
        'Begin rollback in reverse dependency order',
        'Validate each rollback step',
        'Restore system to known good state',
        'Perform comprehensive system validation',
        'Resume normal operations',
        'Conduct post-rollback analysis'
      ],

      postRollbackActions: [
        'Document rollback results and timeline',
        'Analyze root causes of migration failure',
        'Update migration plan based on lessons learned',
        'Communicate status to stakeholders',
        'Plan remediation and retry strategy'
      ],

      rollbackTriggers: [
        'Critical system failure during migration',
        'Data corruption or loss detected',
        'Performance degradation beyond acceptable limits',
        'Security vulnerabilities introduced',
        'Business operations significantly impacted'
      ],

      automatedRollbackCapabilities: this.identifyAutomatableRollbacks(batchRollbackPlan),
      manualInterventionPoints: this.identifyManualInterventionPoints(batchRollbackPlan)
    };
  }

  /**
   * Generate execution recommendations
   */
  generateExecutionRecommendations(optimizedPlan, riskAssessment) {
    const recommendations = [...riskAssessment.executionRecommendations];

    // Add plan-specific recommendations
    if (optimizedPlan.phases.length > 5) {
      recommendations.push({
        priority: 'medium',
        recommendation: 'Consider breaking migration into multiple smaller batches',
        rationale: `${optimizedPlan.phases.length} phases may be too complex for single execution`
      });
    }

    const highRiskPhases = optimizedPlan.phases.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical');
    if (highRiskPhases.length > 0) {
      recommendations.push({
        priority: 'high',
        recommendation: `Execute ${highRiskPhases.length} high-risk phases with additional oversight`,
        rationale: 'High-risk phases require careful monitoring and potential manual intervention'
      });
    }

    const parallelPhases = optimizedPlan.phases.filter(p => p.parallelizable);
    if (parallelPhases.length > 0) {
      recommendations.push({
        priority: 'low',
        recommendation: `Leverage parallelization in ${parallelPhases.length} phases to reduce execution time`,
        rationale: 'Parallel execution can significantly reduce overall migration duration'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate total duration for migration plan
   */
  calculateTotalDuration(optimizedPlan) {
    let totalDuration = 0;

    for (const phase of optimizedPlan.phases) {
      if (phase.subPhases) {
        // Sequential sub-phases
        totalDuration += phase.subPhases.reduce((sum, subPhase) => 
          sum + this.calculatePhaseDuration(subPhase.steps), 0);
      } else {
        totalDuration += phase.estimatedDuration;
      }
    }

    return {
      sequential: totalDuration,
      withParallelization: this.calculateParallelizedDuration(optimizedPlan.phases),
      criticalPath: optimizedPlan.phases.reduce((sum, phase) => 
        sum + (phase.estimatedDuration || 0), 0)
    };
  }

  /**
   * Calculate duration with parallelization
   */
  calculateParallelizedDuration(phases) {
    let totalDuration = 0;

    for (const phase of phases) {
      if (phase.parallelizable && phase.steps.length > 1) {
        const parallelDuration = Math.max(...phase.steps.map(step => step.estimatedEffort || 2));
        totalDuration += parallelDuration;
      } else {
        totalDuration += phase.estimatedDuration;
      }
    }

    return totalDuration;
  }

  /**
   * Calculate total effort for migration steps
   */
  calculateTotalEffort(migrationSteps) {
    const totalHours = migrationSteps.reduce((sum, step) => sum + (step.estimatedEffort || 2), 0);
    
    return {
      totalHours,
      totalDays: Math.ceil(totalHours / 8),
      totalWeeks: Math.ceil(totalHours / 40),
      breakdown: {
        development: totalHours * 0.6,
        testing: totalHours * 0.25,
        documentation: totalHours * 0.1,
        review: totalHours * 0.05
      }
    };
  }

  /**
   * Determine approval requirements
   */
  determineApprovalRequirements(riskAssessment) {
    const requirements = {
      required: false,
      level: 'none',
      approvers: [],
      criteria: []
    };

    if (riskAssessment.batchRiskLevel === 'critical') {
      requirements.required = true;
      requirements.level = 'executive';
      requirements.approvers = ['CTO', 'Engineering Director'];
      requirements.criteria = ['Risk mitigation plan approved', 'Rollback procedures validated'];
    } else if (riskAssessment.batchRiskLevel === 'high') {
      requirements.required = true;
      requirements.level = 'management';
      requirements.approvers = ['Engineering Manager', 'Tech Lead'];
      requirements.criteria = ['Risk assessment reviewed', 'Testing plan approved'];
    } else if (riskAssessment.criticalRiskSteps > 0) {
      requirements.required = true;
      requirements.level = 'technical';
      requirements.approvers = ['Senior Developer', 'Architect'];
      requirements.criteria = ['Critical steps reviewed', 'Mitigation strategies in place'];
    }

    return requirements;
  }

  /**
   * Generate validation criteria for migration plan
   */
  generateValidationCriteria(migrationSteps) {
    const criteria = [
      {
        type: 'functional',
        description: 'All existing functionality preserved',
        validationMethod: 'automated_testing',
        priority: 'critical'
      },
      {
        type: 'performance',
        description: 'No performance regression introduced',
        validationMethod: 'performance_testing',
        priority: 'high'
      },
      {
        type: 'security',
        description: 'No security vulnerabilities introduced',
        validationMethod: 'security_scanning',
        priority: 'high'
      },
      {
        type: 'integration',
        description: 'All integrations working correctly',
        validationMethod: 'integration_testing',
        priority: 'high'
      }
    ];

    // Add step-specific criteria
    for (const step of migrationSteps) {
      if (step.successCriteria) {
        criteria.push(...step.successCriteria.map(criterion => ({
          ...criterion,
          stepId: step.id,
          stepSpecific: true
        })));
      }
    }

    return criteria;
  }

  /**
   * Create monitoring plan for migration execution
   */
  createMonitoringPlan(migrationSteps, riskAssessment) {
    return {
      realTimeMetrics: [
        'Migration step completion rate',
        'Error rate and failure count',
        'System performance metrics',
        'Resource utilization',
        'User impact indicators'
      ],

      alertingRules: [
        {
          metric: 'step_failure_rate',
          threshold: '> 10%',
          severity: 'critical',
          action: 'halt_migration'
        },
        {
          metric: 'performance_degradation',
          threshold: '> 20%',
          severity: 'high',
          action: 'investigate_immediately'
        },
        {
          metric: 'error_rate',
          threshold: '> 5%',
          severity: 'medium',
          action: 'monitor_closely'
        }
      ],

      checkpoints: this.generateMonitoringCheckpoints(migrationSteps, riskAssessment),
      
      reportingSchedule: {
        realTime: 'Every 5 minutes during execution',
        summary: 'After each phase completion',
        final: 'Within 24 hours of completion'
      },

      escalationProcedures: [
        'Step 1: Alert technical team lead',
        'Step 2: Notify engineering manager if unresolved in 15 minutes',
        'Step 3: Escalate to on-call architect if critical issues persist',
        'Step 4: Initiate rollback procedures if system stability threatened'
      ]
    };
  }

  /**
   * Generate monitoring checkpoints
   */
  generateMonitoringCheckpoints(migrationSteps, riskAssessment) {
    const checkpoints = [];

    // Add checkpoints for high-risk steps
    for (const stepAssessment of riskAssessment.stepAssessments) {
      if (stepAssessment.riskLevel === 'high' || stepAssessment.riskLevel === 'critical') {
        checkpoints.push({
          stepId: stepAssessment.stepId,
          type: 'pre_execution',
          description: `Validate prerequisites for high-risk step ${stepAssessment.stepId}`,
          required: true
        });

        checkpoints.push({
          stepId: stepAssessment.stepId,
          type: 'post_execution',
          description: `Validate successful completion of ${stepAssessment.stepId}`,
          required: true
        });
      }
    }

    // Add phase-level checkpoints
    checkpoints.push({
      type: 'phase_completion',
      description: 'Validate phase completion and system stability',
      frequency: 'after_each_phase'
    });

    return checkpoints;
  }

  /**
   * Helper methods
   */
  generatePlanId() {
    return `migration-plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateStepId(filePath) {
    return `step-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`;
  }

  estimateStepEffort(analysisResult) {
    const baseEffort = 2; // hours
    const complexityMultiplier = (analysisResult.codeMetrics?.cyclomaticComplexity || 1) / 10;
    const sizeMultiplier = (analysisResult.codeMetrics?.linesOfCode || 100) / 500;
    
    return Math.max(1, Math.round(baseEffort * (1 + complexityMultiplier + sizeMultiplier)));
  }

  generateStepDeliverables(analysisResult) {
    return [
      'Refactored code with modern patterns',
      'Updated unit tests',
      'Documentation updates',
      'Code review completion'
    ];
  }

  generateValidationTests(analysisResult) {
    return [
      'Unit tests for refactored functionality',
      'Integration tests for external dependencies',
      'Regression tests for existing behavior'
    ];
  }

  generateSuccessCriteria(analysisResult) {
    return [
      {
        type: 'functional',
        description: 'All existing functionality preserved',
        validationMethod: 'automated_testing'
      },
      {
        type: 'quality',
        description: 'Code quality metrics improved',
        validationMethod: 'static_analysis'
      }
    ];
  }

  calculatePhaseDuration(steps) {
    return steps.reduce((sum, step) => sum + (step.estimatedEffort || 2), 0);
  }

  getAppliedOptimizations(originalPhases, optimizedPhases) {
    const optimizations = [];
    
    for (let i = 0; i < optimizedPhases.length; i++) {
      const original = originalPhases[i];
      const optimized = optimizedPhases[i];
      
      if (optimized.subPhases && !original.subPhases) {
        optimizations.push({
          type: 'risk_separation',
          phase: optimized.id,
          description: 'Separated high-risk steps into sequential sub-phase'
        });
      }
      
      if (optimized.bufferTime && !original.bufferTime) {
        optimizations.push({
          type: 'buffer_time',
          phase: optimized.id,
          description: `Added ${optimized.bufferTime} hours buffer time for high-risk phase`
        });
      }
    }
    
    return optimizations;
  }

  identifyAutomatableRollbacks(batchRollbackPlan) {
    return batchRollbackPlan.stepRollbackPlans
      .filter(plan => plan.rollbackPlan.automated)
      .map(plan => ({
        stepId: plan.stepId,
        strategies: plan.rollbackPlan.strategies.filter(s => s.automatable)
      }));
  }

  identifyManualInterventionPoints(batchRollbackPlan) {
    return batchRollbackPlan.stepRollbackPlans
      .filter(plan => !plan.rollbackPlan.automated)
      .map(plan => ({
        stepId: plan.stepId,
        reason: 'Manual oversight required',
        strategies: plan.rollbackPlan.strategies.filter(s => !s.automatable)
      }));
  }

  /**
   * Get migration plan by ID
   */
  getMigrationPlan(planId) {
    return this.migrationPlans.get(planId);
  }

  /**
   * List all migration plans
   */
  listMigrationPlans() {
    return Array.from(this.migrationPlans.values());
  }

  /**
   * Update migration plan
   */
  updateMigrationPlan(planId, updates) {
    const plan = this.migrationPlans.get(planId);
    if (!plan) {
      throw new Error(`Migration plan ${planId} not found`);
    }

    const updatedPlan = { ...plan, ...updates, updatedAt: new Date().toISOString() };
    this.migrationPlans.set(planId, updatedPlan);
    
    return updatedPlan;
  }
}