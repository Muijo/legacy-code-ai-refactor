/**
 * Code quality assessment and technical debt scoring system
 */
export class CodeQualityAssessment {
  constructor(options = {}) {
    this.weights = {
      complexity: options.complexityWeight || 0.3,
      maintainability: options.maintainabilityWeight || 0.25,
      testability: options.testabilityWeight || 0.2,
      readability: options.readabilityWeight || 0.15,
      performance: options.performanceWeight || 0.1
    };
    
    this.thresholds = {
      complexity: {
        low: 10,
        medium: 20,
        high: 30
      },
      maintainability: {
        excellent: 85,
        good: 70,
        fair: 50,
        poor: 30
      },
      technicalDebt: {
        low: 20,
        medium: 50,
        high: 80
      }
    };
  }

  /**
   * Assess overall code quality for a parsed file
   * @param {Object} parseResult - Result from MultiLanguageParser
   * @returns {Object} Quality assessment with scores and recommendations
   */
  assessQuality(parseResult) {
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error,
        overallScore: 0,
        technicalDebtScore: 100
      };
    }

    const { ast, metadata, language, filePath } = parseResult;
    
    // Calculate individual quality metrics
    const complexityScore = this.assessComplexity(metadata);
    const maintainabilityScore = this.assessMaintainability(ast, metadata, language);
    const testabilityScore = this.assessTestability(ast, metadata, language);
    const readabilityScore = this.assessReadability(ast, metadata, language);
    const performanceScore = this.assessPerformance(ast, metadata, language);

    // Calculate weighted overall score
    const overallScore = (
      complexityScore * this.weights.complexity +
      maintainabilityScore * this.weights.maintainability +
      testabilityScore * this.weights.testability +
      readabilityScore * this.weights.readability +
      performanceScore * this.weights.performance
    );

    // Calculate technical debt score (inverse of quality)
    const technicalDebtScore = 100 - overallScore;

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      complexityScore,
      maintainabilityScore,
      testabilityScore,
      readabilityScore,
      performanceScore,
      metadata,
      language
    });

    // Identify code smells
    const codeSmells = this.identifyCodeSmells(ast, metadata, language);

    return {
      success: true,
      filePath,
      language,
      overallScore: Math.round(overallScore),
      technicalDebtScore: Math.round(technicalDebtScore),
      metrics: {
        complexity: {
          score: complexityScore,
          value: metadata.complexity,
          rating: this.getComplexityRating(metadata.complexity)
        },
        maintainability: {
          score: maintainabilityScore,
          rating: this.getMaintainabilityRating(maintainabilityScore)
        },
        testability: {
          score: testabilityScore,
          rating: this.getTestabilityRating(testabilityScore)
        },
        readability: {
          score: readabilityScore,
          rating: this.getReadabilityRating(readabilityScore)
        },
        performance: {
          score: performanceScore,
          rating: this.getPerformanceRating(performanceScore)
        }
      },
      codeSmells,
      recommendations,
      metadata: {
        linesOfCode: metadata.linesOfCode,
        functions: metadata.functions || 0,
        classes: metadata.classes || 0,
        fileSize: metadata.size,
        cyclomaticComplexity: metadata.complexity
      }
    };
  }

  /**
   * Assess cyclomatic complexity
   */
  assessComplexity(metadata) {
    const complexity = metadata.complexity || 0;
    const linesOfCode = metadata.linesOfCode || 1;
    
    // Normalize complexity by lines of code
    const complexityDensity = complexity / linesOfCode * 100;
    
    if (complexityDensity <= 2) return 90;
    if (complexityDensity <= 5) return 75;
    if (complexityDensity <= 10) return 60;
    if (complexityDensity <= 15) return 40;
    return 20;
  }

  /**
   * Assess maintainability index
   */
  assessMaintainability(ast, metadata, language) {
    const linesOfCode = metadata.linesOfCode || 1;
    const complexity = metadata.complexity || 1;
    const functions = metadata.functions || 1;
    
    // Simplified maintainability index calculation
    // Based on Halstead metrics and cyclomatic complexity
    const avgFunctionLength = linesOfCode / functions;
    const complexityPerFunction = complexity / functions;
    
    let score = 100;
    
    // Penalize long functions
    if (avgFunctionLength > 50) score -= 20;
    else if (avgFunctionLength > 30) score -= 10;
    else if (avgFunctionLength > 20) score -= 5;
    
    // Penalize high complexity per function
    if (complexityPerFunction > 10) score -= 25;
    else if (complexityPerFunction > 7) score -= 15;
    else if (complexityPerFunction > 5) score -= 10;
    
    // Language-specific adjustments
    if (language === 'php' || language === 'javascript') {
      // These languages tend to have more dynamic features
      score -= 5;
    }
    
    return Math.max(0, score);
  }

  /**
   * Assess testability
   */
  assessTestability(ast, metadata, language) {
    const functions = metadata.functions || 0;
    const classes = metadata.classes || 0;
    const linesOfCode = metadata.linesOfCode || 1;
    
    let score = 70; // Base score
    
    // Higher function count relative to LOC is generally more testable
    const functionDensity = functions / linesOfCode * 100;
    if (functionDensity > 5) score += 15;
    else if (functionDensity > 3) score += 10;
    else if (functionDensity > 1) score += 5;
    else score -= 10;
    
    // Classes can improve testability through dependency injection
    if (classes > 0) {
      score += Math.min(classes * 2, 10);
    }
    
    // Language-specific testability factors
    switch (language) {
      case 'javascript':
        // JavaScript has good testing ecosystem
        score += 5;
        break;
      case 'java':
        // Java has excellent testing frameworks
        score += 10;
        break;
      case 'python':
        // Python has good testing support
        score += 8;
        break;
      case 'php':
        // PHP testing can be more challenging
        score -= 5;
        break;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Assess readability
   */
  assessReadability(ast, metadata, language) {
    const linesOfCode = metadata.linesOfCode || 1;
    const functions = metadata.functions || 1;
    const complexity = metadata.complexity || 1;
    
    let score = 80; // Base score
    
    // Average function length affects readability
    const avgFunctionLength = linesOfCode / functions;
    if (avgFunctionLength > 100) score -= 30;
    else if (avgFunctionLength > 50) score -= 20;
    else if (avgFunctionLength > 30) score -= 10;
    else if (avgFunctionLength < 10) score += 5;
    
    // Complexity affects readability
    const avgComplexity = complexity / functions;
    if (avgComplexity > 15) score -= 25;
    else if (avgComplexity > 10) score -= 15;
    else if (avgComplexity > 7) score -= 10;
    else if (avgComplexity < 3) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Assess performance characteristics
   */
  assessPerformance(ast, metadata, language) {
    let score = 75; // Base score
    
    const linesOfCode = metadata.linesOfCode || 1;
    const complexity = metadata.complexity || 1;
    
    // High complexity can indicate performance issues
    if (complexity > linesOfCode * 0.5) {
      score -= 20;
    } else if (complexity > linesOfCode * 0.3) {
      score -= 10;
    }
    
    // Language-specific performance characteristics
    switch (language) {
      case 'javascript':
        // JavaScript performance depends heavily on patterns used
        score -= 5;
        break;
      case 'java':
        // Java generally has good performance
        score += 10;
        break;
      case 'python':
        // Python can have performance challenges
        score -= 10;
        break;
      case 'php':
        // PHP performance varies widely
        score -= 5;
        break;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Identify common code smells
   */
  identifyCodeSmells(ast, metadata, language) {
    const smells = [];
    const linesOfCode = metadata.linesOfCode || 0;
    const functions = metadata.functions || 0;
    const complexity = metadata.complexity || 0;
    
    // Long method smell
    if (functions > 0) {
      const avgFunctionLength = linesOfCode / functions;
      if (avgFunctionLength > 50) {
        smells.push({
          type: 'Long Method',
          severity: 'high',
          description: `Average function length is ${Math.round(avgFunctionLength)} lines`,
          suggestion: 'Break down large functions into smaller, focused methods'
        });
      }
    }
    
    // High complexity smell
    if (functions > 0) {
      const avgComplexity = complexity / functions;
      if (avgComplexity > 10) {
        smells.push({
          type: 'High Complexity',
          severity: 'high',
          description: `Average cyclomatic complexity is ${Math.round(avgComplexity)}`,
          suggestion: 'Reduce complexity by extracting methods and simplifying conditional logic'
        });
      }
    }
    
    // Large file smell
    if (linesOfCode > 1000) {
      smells.push({
        type: 'Large File',
        severity: 'medium',
        description: `File has ${linesOfCode} lines of code`,
        suggestion: 'Consider splitting into multiple smaller files'
      });
    }
    
    // God object smell (many functions in one file)
    if (functions > 20) {
      smells.push({
        type: 'God Object',
        severity: 'medium',
        description: `File contains ${functions} functions`,
        suggestion: 'Consider splitting responsibilities into multiple classes/modules'
      });
    }
    
    return smells;
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations(scores) {
    const recommendations = [];
    
    if (scores.complexityScore < 60) {
      recommendations.push({
        priority: 'high',
        category: 'complexity',
        title: 'Reduce Cyclomatic Complexity',
        description: 'Break down complex functions into smaller, more focused methods',
        impact: 'high'
      });
    }
    
    if (scores.maintainabilityScore < 50) {
      recommendations.push({
        priority: 'high',
        category: 'maintainability',
        title: 'Improve Code Structure',
        description: 'Refactor to improve separation of concerns and reduce coupling',
        impact: 'high'
      });
    }
    
    if (scores.testabilityScore < 60) {
      recommendations.push({
        priority: 'medium',
        category: 'testability',
        title: 'Enhance Testability',
        description: 'Extract dependencies and create more focused, testable functions',
        impact: 'medium'
      });
    }
    
    if (scores.readabilityScore < 70) {
      recommendations.push({
        priority: 'medium',
        category: 'readability',
        title: 'Improve Code Readability',
        description: 'Add meaningful names, comments, and simplify complex expressions',
        impact: 'medium'
      });
    }
    
    if (scores.performanceScore < 60) {
      recommendations.push({
        priority: 'low',
        category: 'performance',
        title: 'Optimize Performance',
        description: 'Review algorithms and data structures for potential optimizations',
        impact: 'low'
      });
    }
    
    return recommendations;
  }

  // Rating helper methods
  getComplexityRating(complexity) {
    if (complexity <= this.thresholds.complexity.low) return 'Low';
    if (complexity <= this.thresholds.complexity.medium) return 'Medium';
    if (complexity <= this.thresholds.complexity.high) return 'High';
    return 'Very High';
  }

  getMaintainabilityRating(score) {
    if (score >= this.thresholds.maintainability.excellent) return 'Excellent';
    if (score >= this.thresholds.maintainability.good) return 'Good';
    if (score >= this.thresholds.maintainability.fair) return 'Fair';
    if (score >= this.thresholds.maintainability.poor) return 'Poor';
    return 'Very Poor';
  }

  getTestabilityRating(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Very Poor';
  }

  getReadabilityRating(score) {
    if (score >= 85) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 65) return 'Fair';
    if (score >= 50) return 'Poor';
    return 'Very Poor';
  }

  getPerformanceRating(score) {
    if (score >= 85) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 65) return 'Fair';
    if (score >= 50) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Batch assess multiple files
   */
  async batchAssess(parseResults) {
    const assessments = [];
    const summary = {
      totalFiles: parseResults.length,
      averageScore: 0,
      averageTechnicalDebt: 0,
      highRiskFiles: 0,
      recommendations: new Map()
    };

    for (const parseResult of parseResults) {
      const assessment = this.assessQuality(parseResult);
      assessments.push(assessment);

      if (assessment.success) {
        summary.averageScore += assessment.overallScore;
        summary.averageTechnicalDebt += assessment.technicalDebtScore;
        
        if (assessment.technicalDebtScore > this.thresholds.technicalDebt.high) {
          summary.highRiskFiles++;
        }

        // Aggregate recommendations
        assessment.recommendations.forEach(rec => {
          const key = rec.category;
          if (!summary.recommendations.has(key)) {
            summary.recommendations.set(key, 0);
          }
          summary.recommendations.set(key, summary.recommendations.get(key) + 1);
        });
      }
    }

    if (summary.totalFiles > 0) {
      summary.averageScore = Math.round(summary.averageScore / summary.totalFiles);
      summary.averageTechnicalDebt = Math.round(summary.averageTechnicalDebt / summary.totalFiles);
    }

    return {
      assessments,
      summary
    };
  }
}