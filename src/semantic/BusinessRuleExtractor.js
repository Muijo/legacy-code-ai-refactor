/**
 * Business rule extractor for identifying and categorizing business rules in code
 */
export class BusinessRuleExtractor {
  constructor(options = {}) {
    this.options = {
      minConfidenceScore: options.minConfidenceScore || 0.6,
      maxRulesPerFunction: options.maxRulesPerFunction || 10,
      ...options
    };

    // Business rule patterns by category
    this.ruleCategories = {
      'Validation': {
        patterns: [
          /if\s*\([^)]*\s*(===?|!==?|>|<|>=|<=)\s*[^)]*\)\s*{[^}]*throw|return\s+false|error/gi,
          /validate|verify|check|ensure|require/gi,
          /\b(min|max|length|size|range|format|pattern)\b/gi,
          /\b(empty|null|undefined|invalid|valid)\b/gi
        ],
        keywords: ['validate', 'verify', 'check', 'ensure', 'require', 'min', 'max', 'length', 'format'],
        description: 'Rules that validate data integrity and business constraints'
      },
      'Calculation': {
        patterns: [
          /calculate|compute|sum|total|amount|price|cost|rate|percentage/gi,
          /\+|\-|\*|\/|Math\.|pow|sqrt|round|floor|ceil/gi,
          /\b(tax|discount|fee|interest|commission|markup)\b/gi
        ],
        keywords: ['calculate', 'compute', 'sum', 'total', 'amount', 'price', 'tax', 'discount'],
        description: 'Rules that perform business calculations and computations'
      },
      'Authorization': {
        patterns: [
          /\b(role|permission|access|authorize|allow|deny|grant|revoke)\b/gi,
          /\b(admin|user|guest|owner|manager|staff)\b/gi,
          /if\s*\([^)]*\.(role|permission|access|isAdmin|canAccess)/gi
        ],
        keywords: ['role', 'permission', 'access', 'authorize', 'admin', 'user'],
        description: 'Rules that control access and permissions'
      },
      'Workflow': {
        patterns: [
          /\b(status|state|stage|phase|step|workflow|process)\b/gi,
          /\b(pending|approved|rejected|completed|cancelled|active|inactive)\b/gi,
          /switch\s*\([^)]*status|state\)|if\s*\([^)]*status|state/gi
        ],
        keywords: ['status', 'state', 'workflow', 'process', 'pending', 'approved', 'completed'],
        description: 'Rules that manage business process workflows and state transitions'
      },
      'Business Logic': {
        patterns: [
          /\b(business|domain|rule|policy|constraint|requirement)\b/gi,
          /\b(order|customer|product|inventory|payment|billing)\b/gi,
          /if\s*\([^)]*\.(type|category|kind|classification)/gi
        ],
        keywords: ['business', 'domain', 'rule', 'policy', 'order', 'customer', 'product'],
        description: 'Core business logic and domain-specific rules'
      },
      'Temporal': {
        patterns: [
          /\b(date|time|timestamp|duration|expiry|expired|timeout)\b/gi,
          /\b(before|after|during|until|since|ago|from|to)\b/gi,
          /Date\.|moment\.|dayjs\.|new Date/gi
        ],
        keywords: ['date', 'time', 'expired', 'timeout', 'before', 'after'],
        description: 'Rules that deal with time-based constraints and scheduling'
      },
      'Conditional': {
        patterns: [
          /if\s*\([^)]*\)\s*{[^}]*}/gi,
          /switch\s*\([^)]*\)\s*{[^}]*}/gi,
          /\?\s*[^:]*\s*:/gi, // Ternary operator
          /&&|\|\||and\s+|or\s+/gi
        ],
        keywords: ['if', 'switch', 'case', 'when', 'then', 'else'],
        description: 'Conditional logic that implements business decisions'
      }
    };

    // Business rule complexity indicators
    this.complexityIndicators = [
      { pattern: /if\s*\([^)]*&&[^)]*\)/gi, weight: 2, description: 'Multiple conditions' },
      { pattern: /if\s*\([^)]*\|\|[^)]*\)/gi, weight: 2, description: 'Alternative conditions' },
      { pattern: /nested.*if|if.*if/gi, weight: 3, description: 'Nested conditions' },
      { pattern: /switch.*case.*case/gi, weight: 2, description: 'Multiple cases' },
      { pattern: /for|while|forEach/gi, weight: 1, description: 'Iterative logic' },
      { pattern: /try.*catch/gi, weight: 1, description: 'Error handling' }
    ];

    // Domain-specific rule patterns
    this.domainRulePatterns = {
      'E-commerce': [
        { pattern: /calculate.*total|sum.*items|order.*amount/gi, type: 'calculation', domain: 'order_processing' },
        { pattern: /check.*inventory|validate.*stock|available.*quantity/gi, type: 'validation', domain: 'inventory_management' },
        { pattern: /apply.*discount|calculate.*tax|shipping.*cost/gi, type: 'calculation', domain: 'pricing' },
        { pattern: /payment.*valid|authorize.*card|process.*payment/gi, type: 'validation', domain: 'payment_processing' }
      ],
      'Financial': [
        { pattern: /calculate.*interest|compound.*rate|balance.*update/gi, type: 'calculation', domain: 'interest_calculation' },
        { pattern: /validate.*transaction|verify.*funds|check.*limit/gi, type: 'validation', domain: 'transaction_validation' },
        { pattern: /assess.*fee|calculate.*charge|penalty.*amount/gi, type: 'calculation', domain: 'fee_calculation' },
        { pattern: /risk.*assessment|credit.*score|fraud.*detection/gi, type: 'business_logic', domain: 'risk_management' }
      ],
      'User Management': [
        { pattern: /validate.*password|check.*strength|password.*policy/gi, type: 'validation', domain: 'authentication' },
        { pattern: /check.*permission|verify.*access|authorize.*action/gi, type: 'authorization', domain: 'access_control' },
        { pattern: /session.*timeout|login.*expiry|token.*valid/gi, type: 'temporal', domain: 'session_management' },
        { pattern: /role.*assignment|permission.*grant|access.*level/gi, type: 'authorization', domain: 'role_management' }
      ]
    };
  }

  /**
   * Extract business rules from code elements
   * @param {Object} codeElements - Extracted code elements
   * @param {string} language - Programming language
   * @returns {Array} Extracted business rules with categorization
   */
  extractBusinessRules(codeElements, language) {
    const extractedRules = [];

    // Extract rules from functions
    codeElements.functions.forEach(func => {
      const functionRules = this.extractRulesFromFunction(func, language);
      extractedRules.push(...functionRules);
    });

    // Extract rules from classes
    codeElements.classes.forEach(cls => {
      const classRules = this.extractRulesFromClass(cls, language);
      extractedRules.push(...classRules);
    });

    // Categorize and score rules
    const categorizedRules = this.categorizeRules(extractedRules);
    
    // Identify domain-specific rules
    const domainRules = this.identifyDomainRules(extractedRules);

    // Generate rule relationships
    const ruleRelationships = this.identifyRuleRelationships(categorizedRules);

    return {
      rules: categorizedRules,
      domainRules,
      ruleRelationships,
      statistics: this.generateRuleStatistics(categorizedRules),
      recommendations: this.generateRuleRecommendations(categorizedRules, domainRules)
    };
  }

  /**
   * Extract business rules from a function
   */
  extractRulesFromFunction(func, language) {
    const rules = [];
    const functionBody = func.body || '';
    const functionName = func.name;

    // Extract conditional rules
    const conditionalRules = this.extractConditionalRules(functionBody, functionName);
    rules.push(...conditionalRules);

    // Extract validation rules
    const validationRules = this.extractValidationRules(functionBody, functionName);
    rules.push(...validationRules);

    // Extract calculation rules
    const calculationRules = this.extractCalculationRules(functionBody, functionName);
    rules.push(...calculationRules);

    // Extract workflow rules
    const workflowRules = this.extractWorkflowRules(functionBody, functionName);
    rules.push(...workflowRules);

    return rules.map(rule => ({
      ...rule,
      sourceFunction: functionName,
      sourceType: 'function',
      language
    }));
  }

  /**
   * Extract business rules from a class
   */
  extractRulesFromClass(cls, language) {
    const rules = [];
    const className = cls.name;

    // Extract rules from class methods
    if (cls.methods) {
      cls.methods.forEach(method => {
        const methodRules = this.extractRulesFromFunction(method, language);
        rules.push(...methodRules.map(rule => ({
          ...rule,
          sourceClass: className,
          sourceMethod: method.name
        })));
      });
    }

    return rules;
  }

  /**
   * Extract conditional rules
   */
  extractConditionalRules(code, context) {
    const rules = [];
    const conditionalPatterns = [
      { pattern: /if\s*\(([^)]+)\)\s*{([^}]*)}/gi, type: 'if_statement' },
      { pattern: /switch\s*\(([^)]+)\)\s*{([^}]*)}/gi, type: 'switch_statement' },
      { pattern: /([^?]+)\?\s*([^:]+)\s*:\s*([^;]+)/gi, type: 'ternary_operator' }
    ];

    conditionalPatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const condition = match[1]?.trim();
        const action = match[2]?.trim();

        if (this.isBusinessRule(condition, context)) {
          rules.push({
            type: 'conditional',
            subtype: type,
            condition,
            action: action || 'unknown',
            description: this.generateRuleDescription(condition, context, 'conditional'),
            confidence: this.calculateRuleConfidence(condition, context),
            complexity: this.calculateRuleComplexity(match[0]),
            location: { start: match.index, end: match.index + match[0].length }
          });
        }
      }
    });

    return rules;
  }

  /**
   * Extract validation rules
   */
  extractValidationRules(code, context) {
    const rules = [];
    const validationPatterns = [
      /if\s*\([^)]*\.(length|size|count)\s*[<>=!]+\s*\d+/gi,
      /if\s*\([^)]*\s*(===?|!==?)\s*(null|undefined|empty|"")/gi,
      /validate|verify|check|ensure|require/gi,
      /throw.*Error|return\s+false|return\s+null/gi
    ];

    validationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const ruleText = match[0];
        
        if (this.isValidationRule(ruleText)) {
          rules.push({
            type: 'validation',
            rule: ruleText,
            description: this.generateRuleDescription(ruleText, context, 'validation'),
            confidence: this.calculateRuleConfidence(ruleText, context),
            complexity: this.calculateRuleComplexity(ruleText),
            location: { start: match.index, end: match.index + ruleText.length }
          });
        }
      }
    });

    return rules;
  }

  /**
   * Extract calculation rules
   */
  extractCalculationRules(code, context) {
    const rules = [];
    const calculationPatterns = [
      /(\w+)\s*=\s*([^;]*[+\-*/][^;]*)/gi,
      /calculate|compute|sum|total|amount/gi,
      /Math\.\w+\([^)]*\)/gi,
      /\b\d+\s*[+\-*/]\s*\d+/gi
    ];

    calculationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const calculationText = match[0];
        
        if (this.isCalculationRule(calculationText, context)) {
          rules.push({
            type: 'calculation',
            formula: calculationText,
            description: this.generateRuleDescription(calculationText, context, 'calculation'),
            confidence: this.calculateRuleConfidence(calculationText, context),
            complexity: this.calculateRuleComplexity(calculationText),
            location: { start: match.index, end: match.index + calculationText.length }
          });
        }
      }
    });

    return rules;
  }

  /**
   * Extract workflow rules
   */
  extractWorkflowRules(code, context) {
    const rules = [];
    const workflowPatterns = [
      /switch\s*\([^)]*status|state\)/gi,
      /if\s*\([^)]*\.(status|state)\s*===?\s*['"]([^'"]+)['"]/gi,
      /\b(pending|approved|rejected|completed|cancelled|active|inactive)\b/gi
    ];

    workflowPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const workflowText = match[0];
        
        if (this.isWorkflowRule(workflowText)) {
          rules.push({
            type: 'workflow',
            rule: workflowText,
            state: match[2] || 'unknown',
            description: this.generateRuleDescription(workflowText, context, 'workflow'),
            confidence: this.calculateRuleConfidence(workflowText, context),
            complexity: this.calculateRuleComplexity(workflowText),
            location: { start: match.index, end: match.index + workflowText.length }
          });
        }
      }
    });

    return rules;
  }

  /**
   * Categorize extracted rules
   */
  categorizeRules(rules) {
    return rules.map(rule => {
      const categories = [];
      let bestCategory = 'unknown';
      let bestScore = 0;

      Object.entries(this.ruleCategories).forEach(([categoryName, categoryData]) => {
        const score = this.calculateCategoryScore(rule, categoryData);
        if (score > bestScore) {
          bestScore = score;
          bestCategory = categoryName;
        }
        if (score > 0.3) {
          categories.push({ category: categoryName, score });
        }
      });

      return {
        ...rule,
        primaryCategory: bestCategory,
        categories,
        categoryConfidence: bestScore
      };
    });
  }

  /**
   * Identify domain-specific rules
   */
  identifyDomainRules(rules) {
    const domainRules = [];

    Object.entries(this.domainRulePatterns).forEach(([domain, patterns]) => {
      patterns.forEach(domainPattern => {
        rules.forEach(rule => {
          const ruleText = rule.condition || rule.rule || rule.formula || '';
          if (domainPattern.pattern.test(ruleText)) {
            domainRules.push({
              ...rule,
              domain,
              domainType: domainPattern.type,
              domainContext: domainPattern.domain,
              domainConfidence: 0.8
            });
          }
        });
      });
    });

    return domainRules;
  }

  /**
   * Identify relationships between rules
   */
  identifyRuleRelationships(rules) {
    const relationships = [];

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];

        const relationship = this.analyzeRuleRelationship(rule1, rule2);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }

    return relationships;
  }

  /**
   * Analyze relationship between two rules
   */
  analyzeRuleRelationship(rule1, rule2) {
    // Check for sequential relationship
    if (rule1.sourceFunction === rule2.sourceFunction) {
      return {
        type: 'sequential',
        rule1: rule1.description,
        rule2: rule2.description,
        relationship: 'same_function',
        strength: 0.7
      };
    }

    // Check for dependency relationship
    const rule1Text = rule1.condition || rule1.rule || '';
    const rule2Text = rule2.condition || rule2.rule || '';
    
    if (this.hasCommonVariables(rule1Text, rule2Text)) {
      return {
        type: 'dependency',
        rule1: rule1.description,
        rule2: rule2.description,
        relationship: 'shared_variables',
        strength: 0.6
      };
    }

    // Check for category relationship
    if (rule1.primaryCategory === rule2.primaryCategory) {
      return {
        type: 'categorical',
        rule1: rule1.description,
        rule2: rule2.description,
        relationship: 'same_category',
        strength: 0.5
      };
    }

    return null;
  }

  /**
   * Generate rule statistics
   */
  generateRuleStatistics(rules) {
    const categoryStats = {};
    const complexityStats = { low: 0, medium: 0, high: 0 };
    let totalConfidence = 0;

    rules.forEach(rule => {
      // Category statistics
      if (!categoryStats[rule.primaryCategory]) {
        categoryStats[rule.primaryCategory] = 0;
      }
      categoryStats[rule.primaryCategory]++;

      // Complexity statistics
      if (rule.complexity <= 2) complexityStats.low++;
      else if (rule.complexity <= 5) complexityStats.medium++;
      else complexityStats.high++;

      totalConfidence += rule.confidence;
    });

    return {
      totalRules: rules.length,
      averageConfidence: rules.length > 0 ? totalConfidence / rules.length : 0,
      categoryDistribution: categoryStats,
      complexityDistribution: complexityStats,
      highConfidenceRules: rules.filter(r => r.confidence > 0.8).length,
      businessCriticalRules: rules.filter(r => 
        ['Validation', 'Calculation', 'Authorization'].includes(r.primaryCategory)
      ).length
    };
  }

  /**
   * Generate rule recommendations
   */
  generateRuleRecommendations(rules, domainRules) {
    const recommendations = [];

    // Complex rules recommendation
    const complexRules = rules.filter(r => r.complexity > 5);
    if (complexRules.length > 0) {
      recommendations.push({
        type: 'complexity',
        priority: 'high',
        title: 'Simplify Complex Business Rules',
        description: `${complexRules.length} rules have high complexity and should be refactored`,
        affectedRules: complexRules.map(r => r.description),
        suggestion: 'Break down complex rules into smaller, more manageable components'
      });
    }

    // Scattered rules recommendation
    const validationRules = rules.filter(r => r.primaryCategory === 'Validation');
    if (validationRules.length > 3) {
      recommendations.push({
        type: 'centralization',
        priority: 'medium',
        title: 'Centralize Validation Rules',
        description: `${validationRules.length} validation rules are scattered across the codebase`,
        suggestion: 'Consider creating a centralized validation service or rule engine'
      });
    }

    // Domain rules recommendation
    if (domainRules.length > 0) {
      const domains = [...new Set(domainRules.map(r => r.domain))];
      recommendations.push({
        type: 'domain_modeling',
        priority: 'medium',
        title: 'Extract Domain-Specific Rules',
        description: `Found ${domainRules.length} domain-specific rules across ${domains.length} domains`,
        domains,
        suggestion: 'Consider creating domain-specific rule modules or services'
      });
    }

    return recommendations;
  }

  // Helper methods
  isBusinessRule(condition, context) {
    const businessKeywords = [
      'amount', 'price', 'cost', 'total', 'sum', 'balance',
      'status', 'state', 'valid', 'invalid', 'active', 'inactive',
      'permission', 'role', 'access', 'authorize',
      'date', 'time', 'expired', 'timeout',
      'count', 'limit', 'maximum', 'minimum',
      'customer', 'order', 'product', 'payment'
    ];

    const text = (condition + ' ' + context).toLowerCase();
    return businessKeywords.some(keyword => text.includes(keyword));
  }

  isValidationRule(ruleText) {
    const validationIndicators = [
      /validate|verify|check|ensure|require/i,
      /length|size|count|empty|null|undefined/i,
      /throw.*Error|return\s+false/i
    ];
    
    return validationIndicators.some(pattern => pattern.test(ruleText));
  }

  isCalculationRule(calculationText, context) {
    const calculationIndicators = [
      /[+\-*/]/,
      /calculate|compute|sum|total|amount/i,
      /Math\./,
      /price|cost|tax|discount|fee|interest/i
    ];
    
    return calculationIndicators.some(pattern => pattern.test(calculationText + ' ' + context));
  }

  isWorkflowRule(workflowText) {
    const workflowIndicators = [
      /status|state/i,
      /pending|approved|rejected|completed|cancelled/i,
      /workflow|process|stage|phase/i
    ];
    
    return workflowIndicators.some(pattern => pattern.test(workflowText));
  }

  calculateCategoryScore(rule, categoryData) {
    const ruleText = (rule.condition || rule.rule || rule.formula || '').toLowerCase();
    let score = 0;

    categoryData.patterns.forEach(pattern => {
      const matches = ruleText.match(pattern);
      if (matches) {
        score += matches.length * 0.2;
      }
    });

    categoryData.keywords.forEach(keyword => {
      if (ruleText.includes(keyword.toLowerCase())) {
        score += 0.3;
      }
    });

    return Math.min(score, 1);
  }

  calculateRuleConfidence(ruleText, context) {
    const businessKeywords = ['business', 'rule', 'policy', 'constraint', 'requirement'];
    const text = (ruleText + ' ' + context).toLowerCase();
    const matches = businessKeywords.filter(keyword => text.includes(keyword));
    return Math.min(0.5 + (matches.length * 0.2), 1);
  }

  calculateRuleComplexity(ruleText) {
    let complexity = 1;

    this.complexityIndicators.forEach(indicator => {
      const matches = ruleText.match(indicator.pattern);
      if (matches) {
        complexity += matches.length * indicator.weight;
      }
    });

    return complexity;
  }

  generateRuleDescription(ruleText, context, type) {
    const cleanText = ruleText.replace(/[{}();]/g, ' ').trim();
    return `${type} rule in ${context}: ${cleanText}`;
  }

  hasCommonVariables(text1, text2) {
    const variables1 = text1.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    const variables2 = text2.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    
    return variables1.some(v => variables2.includes(v));
  }
}