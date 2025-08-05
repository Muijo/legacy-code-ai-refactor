/**
 * Cross-cutting concern detector for identifying scattered concerns across the codebase
 */
export class CrossCuttingConcernDetector {
  constructor(options = {}) {
    this.options = {
      minOccurrences: options.minOccurrences || 3,
      minAffectedElements: options.minAffectedElements || 2,
      crossCuttingThreshold: options.crossCuttingThreshold || 0.7,
      ...options
    };

    // Comprehensive cross-cutting concern patterns
    this.concernPatterns = {
      'Logging': {
        patterns: [
          /console\.(log|info|warn|error|debug)/gi,
          /logger?\.(log|info|warn|error|debug|trace)/gi,
          /log4j|slf4j|winston|bunyan/gi,
          /\.(log|info|warn|error|debug)\s*\(/gi,
          /logging|log_/gi
        ],
        category: 'observability',
        severity: 'medium',
        description: 'Logging functionality scattered across multiple components',
        refactoringStrategy: 'centralized_logging'
      },
      'Error Handling': {
        patterns: [
          /try\s*{[^}]*}\s*catch/gi,
          /throw\s+new\s+\w*Error/gi,
          /\.catch\s*\(/gi,
          /error|exception|fail/gi,
          /handleError|onError|errorHandler/gi
        ],
        category: 'reliability',
        severity: 'high',
        description: 'Error handling logic duplicated across components',
        refactoringStrategy: 'centralized_error_handling'
      },
      'Authentication': {
        patterns: [
          /authenticate|login|logout|signin|signout/gi,
          /token|jwt|session|cookie/gi,
          /auth|authorization|credential/gi,
          /password|username|email.*password/gi,
          /isAuthenticated|checkAuth|verifyAuth/gi
        ],
        category: 'security',
        severity: 'high',
        description: 'Authentication logic scattered across multiple components',
        refactoringStrategy: 'authentication_middleware'
      },
      'Authorization': {
        patterns: [
          /authorize|permission|role|access/gi,
          /canAccess|hasPermission|checkRole|isAuthorized/gi,
          /admin|user|guest|owner|manager/gi,
          /rbac|acl|policy/gi,
          /allow|deny|grant|revoke/gi
        ],
        category: 'security',
        severity: 'high',
        description: 'Authorization checks distributed throughout the codebase',
        refactoringStrategy: 'authorization_aspect'
      },
      'Caching': {
        patterns: [
          /cache|redis|memcache|memcached/gi,
          /\.get\s*\(.*cache|\.set\s*\(.*cache/gi,
          /store|retrieve|invalidate.*cache/gi,
          /cached|caching|cache_key/gi,
          /ttl|expire|expiration/gi
        ],
        category: 'performance',
        severity: 'medium',
        description: 'Caching logic implemented inconsistently across components',
        refactoringStrategy: 'caching_abstraction'
      },
      'Validation': {
        patterns: [
          /validate|verify|check|sanitize|clean/gi,
          /isValid|isEmail|isPhone|isUrl/gi,
          /required|optional|min|max|length/gi,
          /schema|validator|validation/gi,
          /\.(test|match)\s*\(/gi
        ],
        category: 'data_integrity',
        severity: 'medium',
        description: 'Validation logic repeated across different modules',
        refactoringStrategy: 'validation_framework'
      },
      'Database Access': {
        patterns: [
          /database|db|sql|query|connection/gi,
          /select|insert|update|delete|create|drop/gi,
          /transaction|commit|rollback/gi,
          /orm|activerecord|sequelize|mongoose/gi,
          /\.find|\.save|\.create|\.update|\.delete/gi
        ],
        category: 'data_access',
        severity: 'high',
        description: 'Database access patterns scattered without proper abstraction',
        refactoringStrategy: 'repository_pattern'
      },
      'Configuration': {
        patterns: [
          /config|configuration|setting|environment/gi,
          /process\.env|getenv|config\./gi,
          /\.ini|\.json|\.yaml|\.yml|\.properties/gi,
          /APP_|ENV_|CONFIG_/gi,
          /loadConfig|getConfig|setConfig/gi
        ],
        category: 'configuration',
        severity: 'low',
        description: 'Configuration access spread across multiple components',
        refactoringStrategy: 'configuration_service'
      },
      'Serialization': {
        patterns: [
          /JSON\.(parse|stringify)|serialize|deserialize/gi,
          /toJSON|fromJSON|marshal|unmarshal/gi,
          /encode|decode|format|parse/gi,
          /xml|json|yaml|csv/gi,
          /\.toString\(\)|\.valueOf\(\)/gi
        ],
        category: 'data_transformation',
        severity: 'low',
        description: 'Serialization logic implemented inconsistently',
        refactoringStrategy: 'serialization_service'
      },
      'Monitoring': {
        patterns: [
          /monitor|metric|gauge|counter|histogram/gi,
          /performance|timing|duration|latency/gi,
          /alert|notification|alarm/gi,
          /health|status|ping|heartbeat/gi,
          /prometheus|grafana|datadog|newrelic/gi
        ],
        category: 'observability',
        severity: 'medium',
        description: 'Monitoring and metrics collection scattered across components',
        refactoringStrategy: 'monitoring_aspect'
      },
      'Internationalization': {
        patterns: [
          /i18n|l10n|locale|language|translation/gi,
          /translate|t\(|__\(|gettext/gi,
          /\.en\.|\.fr\.|\.es\.|\.de\./gi,
          /message|text|label.*locale/gi,
          /formatMessage|formatNumber|formatDate/gi
        ],
        category: 'localization',
        severity: 'low',
        description: 'Internationalization logic spread across UI components',
        refactoringStrategy: 'i18n_service'
      },
      'Rate Limiting': {
        patterns: [
          /rateLimit|throttle|debounce/gi,
          /limit|quota|bucket|window/gi,
          /requests?.*per.*second|rpm|rps/gi,
          /cooldown|backoff|retry/gi,
          /tooManyRequests|429/gi
        ],
        category: 'performance',
        severity: 'medium',
        description: 'Rate limiting implemented inconsistently across endpoints',
        refactoringStrategy: 'rate_limiting_middleware'
      },
      'Audit Trail': {
        patterns: [
          /audit|trail|history|changelog/gi,
          /track|record|log.*change|log.*action/gi,
          /created_by|updated_by|modified_by/gi,
          /version|revision|snapshot/gi,
          /who|when|what|where.*change/gi
        ],
        category: 'compliance',
        severity: 'medium',
        description: 'Audit trail functionality implemented inconsistently',
        refactoringStrategy: 'audit_aspect'
      }
    };

    // Refactoring strategies with implementation details
    this.refactoringStrategies = {
      'centralized_logging': {
        description: 'Create a centralized logging service with consistent formatting and levels',
        implementation: 'Implement a logger factory or dependency injection for logging',
        benefits: ['Consistent log format', 'Centralized configuration', 'Easy to modify logging behavior'],
        effort: 'medium'
      },
      'centralized_error_handling': {
        description: 'Implement global error handling with custom exception types',
        implementation: 'Create error handler middleware and custom exception classes',
        benefits: ['Consistent error responses', 'Centralized error logging', 'Better error categorization'],
        effort: 'high'
      },
      'authentication_middleware': {
        description: 'Extract authentication logic into middleware or decorators',
        implementation: 'Create authentication middleware that can be applied to routes/methods',
        benefits: ['Consistent authentication', 'Easier to modify auth logic', 'Better security'],
        effort: 'high'
      },
      'authorization_aspect': {
        description: 'Implement aspect-oriented programming for authorization checks',
        implementation: 'Use decorators or AOP framework for authorization',
        benefits: ['Declarative authorization', 'Separation of concerns', 'Easier to audit'],
        effort: 'high'
      },
      'caching_abstraction': {
        description: 'Create a caching abstraction layer with consistent interface',
        implementation: 'Implement cache service with pluggable backends',
        benefits: ['Consistent caching interface', 'Easy to switch cache providers', 'Better cache management'],
        effort: 'medium'
      },
      'validation_framework': {
        description: 'Implement a validation framework with reusable rules',
        implementation: 'Create validation schemas and rule engine',
        benefits: ['Reusable validation rules', 'Consistent validation messages', 'Better error handling'],
        effort: 'medium'
      },
      'repository_pattern': {
        description: 'Implement repository pattern for data access abstraction',
        implementation: 'Create repository interfaces and implementations',
        benefits: ['Database abstraction', 'Easier testing', 'Consistent data access'],
        effort: 'high'
      },
      'configuration_service': {
        description: 'Create a configuration service with environment-specific settings',
        implementation: 'Implement configuration manager with validation',
        benefits: ['Centralized configuration', 'Environment-specific settings', 'Configuration validation'],
        effort: 'low'
      },
      'serialization_service': {
        description: 'Create serialization service with pluggable formatters',
        implementation: 'Implement serializer factory with format-specific handlers',
        benefits: ['Consistent serialization', 'Easy to add new formats', 'Better error handling'],
        effort: 'low'
      },
      'monitoring_aspect': {
        description: 'Implement monitoring as cross-cutting aspect',
        implementation: 'Use AOP or decorators for automatic monitoring',
        benefits: ['Automatic metrics collection', 'Consistent monitoring', 'Easy to add/remove monitoring'],
        effort: 'medium'
      },
      'i18n_service': {
        description: 'Create internationalization service with resource bundles',
        implementation: 'Implement i18n service with locale-specific resource loading',
        benefits: ['Centralized translations', 'Easy to add languages', 'Consistent formatting'],
        effort: 'medium'
      },
      'rate_limiting_middleware': {
        description: 'Implement rate limiting as middleware with configurable policies',
        implementation: 'Create rate limiting middleware with different algorithms',
        benefits: ['Consistent rate limiting', 'Configurable policies', 'Better resource protection'],
        effort: 'medium'
      },
      'audit_aspect': {
        description: 'Implement audit trail as cross-cutting aspect',
        implementation: 'Use AOP or event-driven architecture for audit logging',
        benefits: ['Automatic audit logging', 'Consistent audit format', 'Compliance support'],
        effort: 'high'
      }
    };
  }

  /**
   * Detect cross-cutting concerns in code elements
   * @param {Object} codeElements - Extracted code elements
   * @returns {Object} Detected cross-cutting concerns with analysis
   */
  detectCrossCuttingConcerns(codeElements) {
    const detectedConcerns = [];
    const allText = this.extractAllText(codeElements);

    // Analyze each concern pattern
    Object.entries(this.concernPatterns).forEach(([concernName, concernData]) => {
      const concernAnalysis = this.analyzeConcern(
        concernName,
        concernData,
        codeElements,
        allText
      );

      if (this.isCrossCuttingConcern(concernAnalysis)) {
        detectedConcerns.push(concernAnalysis);
      }
    });

    // Analyze concern relationships
    const concernRelationships = this.analyzeConcernRelationships(detectedConcerns);

    // Generate refactoring recommendations
    const refactoringRecommendations = this.generateRefactoringRecommendations(detectedConcerns);

    return {
      concerns: detectedConcerns.sort((a, b) => b.crossCuttingScore - a.crossCuttingScore),
      relationships: concernRelationships,
      recommendations: refactoringRecommendations,
      statistics: this.generateConcernStatistics(detectedConcerns),
      refactoringPlan: this.generateRefactoringPlan(detectedConcerns)
    };
  }

  /**
   * Analyze a specific concern
   */
  analyzeConcern(concernName, concernData, codeElements, allText) {
    let totalOccurrences = 0;
    const affectedElements = [];
    const occurrenceDetails = [];

    // Count total occurrences across all patterns
    concernData.patterns.forEach((pattern, patternIndex) => {
      const matches = allText.match(pattern) || [];
      totalOccurrences += matches.length;

      // Track which elements are affected
      this.findAffectedElements(codeElements, pattern, affectedElements, patternIndex, matches);
    });

    // Calculate cross-cutting score
    const uniqueElements = this.deduplicateElements(affectedElements);
    const crossCuttingScore = this.calculateCrossCuttingScore(
      totalOccurrences,
      uniqueElements.length,
      codeElements
    );

    // Analyze concern distribution
    const distribution = this.analyzeConcernDistribution(uniqueElements);

    // Identify concern hotspots
    const hotspots = this.identifyHotspots(uniqueElements);

    return {
      name: concernName,
      category: concernData.category,
      severity: concernData.severity,
      description: concernData.description,
      refactoringStrategy: concernData.refactoringStrategy,
      totalOccurrences,
      affectedElements: uniqueElements,
      crossCuttingScore,
      distribution,
      hotspots,
      patterns: concernData.patterns.length,
      recommendation: this.generateConcernRecommendation(concernName, uniqueElements.length, crossCuttingScore)
    };
  }

  /**
   * Find elements affected by a specific pattern
   */
  findAffectedElements(codeElements, pattern, affectedElements, patternIndex, matches) {
    // Check functions
    codeElements.functions.forEach(func => {
      const funcText = func.name + ' ' + (func.body || '');
      if (pattern.test(funcText)) {
        affectedElements.push({
          type: 'function',
          name: func.name,
          patternIndex,
          matchCount: (funcText.match(pattern) || []).length,
          context: this.extractContext(funcText, pattern)
        });
      }
    });

    // Check classes
    codeElements.classes.forEach(cls => {
      const classText = cls.name + ' ' + (cls.methods || []).map(m => m.name).join(' ');
      if (pattern.test(classText)) {
        affectedElements.push({
          type: 'class',
          name: cls.name,
          patternIndex,
          matchCount: (classText.match(pattern) || []).length,
          context: this.extractContext(classText, pattern)
        });
      }
    });

    // Check variables
    codeElements.variables.forEach(variable => {
      const varText = variable.name;
      if (pattern.test(varText)) {
        affectedElements.push({
          type: 'variable',
          name: variable.name,
          patternIndex,
          matchCount: 1,
          context: varText
        });
      }
    });
  }

  /**
   * Calculate cross-cutting score
   */
  calculateCrossCuttingScore(occurrences, affectedElementCount, codeElements) {
    const totalElements = codeElements.functions.length + 
                         codeElements.classes.length + 
                         codeElements.variables.length;

    if (totalElements === 0) return 0;

    // Base score from element distribution
    const distributionScore = affectedElementCount / totalElements;
    
    // Bonus for high occurrence count
    const occurrenceBonus = Math.min(occurrences / 20, 0.5);
    
    // Penalty for low element count
    const elementPenalty = affectedElementCount < this.options.minAffectedElements ? 0.5 : 0;

    return Math.min(distributionScore + occurrenceBonus - elementPenalty, 1);
  }

  /**
   * Check if a concern is truly cross-cutting
   */
  isCrossCuttingConcern(concernAnalysis) {
    return concernAnalysis.totalOccurrences >= this.options.minOccurrences &&
           concernAnalysis.affectedElements.length >= this.options.minAffectedElements &&
           concernAnalysis.crossCuttingScore >= this.options.crossCuttingThreshold;
  }

  /**
   * Analyze concern distribution across different element types
   */
  analyzeConcernDistribution(affectedElements) {
    const distribution = {
      functions: 0,
      classes: 0,
      variables: 0,
      total: affectedElements.length
    };

    affectedElements.forEach(element => {
      distribution[element.type + 's']++;
    });

    return {
      ...distribution,
      functionPercentage: distribution.total > 0 ? (distribution.functions / distribution.total) * 100 : 0,
      classPercentage: distribution.total > 0 ? (distribution.classes / distribution.total) * 100 : 0,
      variablePercentage: distribution.total > 0 ? (distribution.variables / distribution.total) * 100 : 0
    };
  }

  /**
   * Identify hotspots where concerns are most concentrated
   */
  identifyHotspots(affectedElements) {
    const hotspots = [];
    const elementCounts = {};

    // Count occurrences per element
    affectedElements.forEach(element => {
      const key = `${element.type}:${element.name}`;
      if (!elementCounts[key]) {
        elementCounts[key] = { ...element, totalMatches: 0 };
      }
      elementCounts[key].totalMatches += element.matchCount;
    });

    // Find elements with high match counts
    Object.values(elementCounts).forEach(element => {
      if (element.totalMatches > 3) { // Threshold for hotspot
        hotspots.push({
          type: element.type,
          name: element.name,
          matchCount: element.totalMatches,
          severity: element.totalMatches > 10 ? 'high' : 
                   element.totalMatches > 6 ? 'medium' : 'low'
        });
      }
    });

    return hotspots.sort((a, b) => b.matchCount - a.matchCount);
  }

  /**
   * Analyze relationships between concerns
   */
  analyzeConcernRelationships(concerns) {
    const relationships = [];

    for (let i = 0; i < concerns.length; i++) {
      for (let j = i + 1; j < concerns.length; j++) {
        const concern1 = concerns[i];
        const concern2 = concerns[j];

        const relationship = this.findConcernRelationship(concern1, concern2);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }

    return relationships;
  }

  /**
   * Find relationship between two concerns
   */
  findConcernRelationship(concern1, concern2) {
    // Check for co-occurrence in same elements
    const sharedElements = this.findSharedElements(concern1.affectedElements, concern2.affectedElements);
    
    if (sharedElements.length > 0) {
      return {
        type: 'co_occurrence',
        concern1: concern1.name,
        concern2: concern2.name,
        sharedElements: sharedElements.map(e => e.name),
        strength: sharedElements.length / Math.min(concern1.affectedElements.length, concern2.affectedElements.length),
        recommendation: `Consider refactoring shared elements to separate ${concern1.name} and ${concern2.name} concerns`
      };
    }

    // Check for category relationship
    if (concern1.category === concern2.category) {
      return {
        type: 'category_related',
        concern1: concern1.name,
        concern2: concern2.name,
        category: concern1.category,
        strength: 0.5,
        recommendation: `Consider unified refactoring approach for ${concern1.category} concerns`
      };
    }

    return null;
  }

  /**
   * Generate refactoring recommendations
   */
  generateRefactoringRecommendations(concerns) {
    const recommendations = [];

    concerns.forEach(concern => {
      const strategy = this.refactoringStrategies[concern.refactoringStrategy];
      
      if (strategy) {
        recommendations.push({
          concernName: concern.name,
          priority: this.calculateRefactoringPriority(concern),
          strategy: concern.refactoringStrategy,
          description: strategy.description,
          implementation: strategy.implementation,
          benefits: strategy.benefits,
          effort: strategy.effort,
          affectedElements: concern.affectedElements.length,
          estimatedImpact: this.estimateRefactoringImpact(concern),
          prerequisites: this.identifyPrerequisites(concern),
          risks: this.identifyRefactoringRisks(concern)
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate refactoring plan
   */
  generateRefactoringPlan(concerns) {
    const phases = [];
    const highPriorityConcerns = concerns.filter(c => c.severity === 'high');
    const mediumPriorityConcerns = concerns.filter(c => c.severity === 'medium');
    const lowPriorityConcerns = concerns.filter(c => c.severity === 'low');

    if (highPriorityConcerns.length > 0) {
      phases.push({
        phase: 1,
        title: 'Critical Security and Reliability Concerns',
        concerns: highPriorityConcerns.map(c => c.name),
        estimatedEffort: 'high',
        description: 'Address security and reliability cross-cutting concerns first'
      });
    }

    if (mediumPriorityConcerns.length > 0) {
      phases.push({
        phase: 2,
        title: 'Performance and Observability Improvements',
        concerns: mediumPriorityConcerns.map(c => c.name),
        estimatedEffort: 'medium',
        description: 'Improve performance and observability through concern separation'
      });
    }

    if (lowPriorityConcerns.length > 0) {
      phases.push({
        phase: 3,
        title: 'Code Quality and Maintainability',
        concerns: lowPriorityConcerns.map(c => c.name),
        estimatedEffort: 'low',
        description: 'Final cleanup for better code quality and maintainability'
      });
    }

    return {
      phases,
      totalConcerns: concerns.length,
      estimatedDuration: this.estimateTotalDuration(phases),
      successMetrics: this.defineSuccessMetrics(concerns)
    };
  }

  /**
   * Generate concern statistics
   */
  generateConcernStatistics(concerns) {
    const categoryStats = {};
    const severityStats = { high: 0, medium: 0, low: 0 };
    let totalElements = 0;
    let totalOccurrences = 0;

    concerns.forEach(concern => {
      // Category statistics
      if (!categoryStats[concern.category]) {
        categoryStats[concern.category] = 0;
      }
      categoryStats[concern.category]++;

      // Severity statistics
      severityStats[concern.severity]++;

      totalElements += concern.affectedElements.length;
      totalOccurrences += concern.totalOccurrences;
    });

    return {
      totalConcerns: concerns.length,
      categoryDistribution: categoryStats,
      severityDistribution: severityStats,
      averageElementsPerConcern: concerns.length > 0 ? totalElements / concerns.length : 0,
      averageOccurrencesPerConcern: concerns.length > 0 ? totalOccurrences / concerns.length : 0,
      mostProblematicCategory: Object.entries(categoryStats).sort((a, b) => b[1] - a[1])[0]?.[0],
      refactoringComplexity: this.calculateOverallRefactoringComplexity(concerns)
    };
  }

  // Helper methods
  extractAllText(codeElements) {
    const texts = [];
    
    codeElements.functions.forEach(f => {
      texts.push(f.name, f.body || '');
    });
    
    codeElements.classes.forEach(c => {
      texts.push(c.name);
    });
    
    codeElements.variables.forEach(v => {
      texts.push(v.name);
    });
    
    texts.push(...codeElements.strings);
    
    return texts.join(' ');
  }

  extractContext(text, pattern) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      const start = Math.max(0, match.index - 20);
      const end = Math.min(text.length, match.index + match[0].length + 20);
      return text.substring(start, end);
    }
    return '';
  }

  deduplicateElements(elements) {
    const seen = new Set();
    return elements.filter(element => {
      const key = `${element.type}:${element.name}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  findSharedElements(elements1, elements2) {
    const set1 = new Set(elements1.map(e => `${e.type}:${e.name}`));
    return elements2.filter(e => set1.has(`${e.type}:${e.name}`));
  }

  generateConcernRecommendation(concernName, elementCount, score) {
    const recommendations = {
      'Logging': 'Consider implementing a centralized logging framework with consistent formatting',
      'Error Handling': 'Implement global error handling middleware with custom exception types',
      'Authentication': 'Extract authentication logic into reusable middleware or decorators',
      'Authorization': 'Use aspect-oriented programming or decorators for authorization checks',
      'Caching': 'Create a caching abstraction layer with pluggable backends',
      'Validation': 'Implement a validation framework with reusable schemas and rules',
      'Database Access': 'Apply repository pattern to abstract database operations',
      'Configuration': 'Create a configuration service with environment-specific settings'
    };

    return recommendations[concernName] || `Consider refactoring ${concernName} into a reusable service or aspect`;
  }

  calculateRefactoringPriority(concern) {
    if (concern.severity === 'high' && concern.crossCuttingScore > 0.8) return 'high';
    if (concern.severity === 'medium' && concern.crossCuttingScore > 0.7) return 'medium';
    return 'low';
  }

  estimateRefactoringImpact(concern) {
    const elementCount = concern.affectedElements.length;
    if (elementCount > 10) return 'high';
    if (elementCount > 5) return 'medium';
    return 'low';
  }

  identifyPrerequisites(concern) {
    const prerequisites = [];
    
    if (concern.name === 'Authentication' || concern.name === 'Authorization') {
      prerequisites.push('Security review and approval');
    }
    
    if (concern.name === 'Database Access') {
      prerequisites.push('Database schema analysis', 'Performance impact assessment');
    }
    
    if (concern.affectedElements.length > 10) {
      prerequisites.push('Comprehensive testing strategy');
    }

    return prerequisites;
  }

  identifyRefactoringRisks(concern) {
    const risks = [];
    
    if (concern.severity === 'high') {
      risks.push('Potential security vulnerabilities during transition');
    }
    
    if (concern.affectedElements.length > 15) {
      risks.push('High risk of introducing bugs due to widespread changes');
    }
    
    if (concern.category === 'data_access') {
      risks.push('Potential performance degradation');
    }

    return risks;
  }

  calculateOverallRefactoringComplexity(concerns) {
    const totalElements = concerns.reduce((sum, c) => sum + c.affectedElements.length, 0);
    const highSeverityConcerns = concerns.filter(c => c.severity === 'high').length;
    
    if (totalElements > 50 || highSeverityConcerns > 3) return 'high';
    if (totalElements > 20 || highSeverityConcerns > 1) return 'medium';
    return 'low';
  }

  estimateTotalDuration(phases) {
    const effortToWeeks = { low: 2, medium: 4, high: 8 };
    const totalWeeks = phases.reduce((sum, phase) => sum + effortToWeeks[phase.estimatedEffort], 0);
    return `${totalWeeks} weeks`;
  }

  defineSuccessMetrics(concerns) {
    return [
      'Reduction in code duplication',
      'Improved separation of concerns',
      'Decreased coupling between components',
      'Enhanced testability',
      'Better maintainability scores',
      `Elimination of ${concerns.length} cross-cutting concerns`
    ];
  }
}