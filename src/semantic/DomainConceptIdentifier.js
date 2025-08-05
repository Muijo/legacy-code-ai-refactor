/**
 * Domain concept identifier for extracting business domain concepts from code
 */
export class DomainConceptIdentifier {
  constructor(options = {}) {
    this.options = {
      minConfidenceScore: options.minConfidenceScore || 0.6,
      maxConceptsPerDomain: options.maxConceptsPerDomain || 10,
      ...options
    };

    // Extended domain patterns with relationships
    this.domainPatterns = {
      'E-commerce': {
        entities: [
          { name: 'Product', weight: 1.0, aliases: ['item', 'goods', 'merchandise'] },
          { name: 'Order', weight: 1.0, aliases: ['purchase', 'transaction'] },
          { name: 'Customer', weight: 1.0, aliases: ['buyer', 'client', 'user'] },
          { name: 'Cart', weight: 0.9, aliases: ['basket', 'shopping_cart'] },
          { name: 'Payment', weight: 0.9, aliases: ['billing', 'charge'] },
          { name: 'Inventory', weight: 0.8, aliases: ['stock', 'warehouse'] },
          { name: 'Shipping', weight: 0.8, aliases: ['delivery', 'fulfillment'] },
          { name: 'Discount', weight: 0.7, aliases: ['coupon', 'promotion', 'offer'] },
          { name: 'Category', weight: 0.7, aliases: ['classification', 'type'] },
          { name: 'Review', weight: 0.6, aliases: ['rating', 'feedback'] }
        ],
        relationships: [
          { from: 'Customer', to: 'Order', type: 'places' },
          { from: 'Order', to: 'Product', type: 'contains' },
          { from: 'Customer', to: 'Cart', type: 'owns' },
          { from: 'Product', to: 'Category', type: 'belongs_to' }
        ],
        businessRules: [
          'order_total_calculation',
          'inventory_validation',
          'payment_processing',
          'shipping_cost_calculation'
        ]
      },
      'Financial': {
        entities: [
          { name: 'Account', weight: 1.0, aliases: ['wallet', 'balance'] },
          { name: 'Transaction', weight: 1.0, aliases: ['transfer', 'movement'] },
          { name: 'Payment', weight: 0.9, aliases: ['charge', 'billing'] },
          { name: 'Invoice', weight: 0.9, aliases: ['bill', 'statement'] },
          { name: 'Credit', weight: 0.8, aliases: ['loan', 'advance'] },
          { name: 'Interest', weight: 0.8, aliases: ['rate', 'yield'] },
          { name: 'Fee', weight: 0.7, aliases: ['charge', 'cost'] },
          { name: 'Currency', weight: 0.7, aliases: ['money', 'denomination'] },
          { name: 'Exchange', weight: 0.6, aliases: ['conversion', 'rate'] },
          { name: 'Audit', weight: 0.6, aliases: ['log', 'trail'] }
        ],
        relationships: [
          { from: 'Account', to: 'Transaction', type: 'has' },
          { from: 'Transaction', to: 'Payment', type: 'triggers' },
          { from: 'Account', to: 'Balance', type: 'maintains' }
        ],
        businessRules: [
          'balance_calculation',
          'transaction_validation',
          'interest_calculation',
          'fee_assessment'
        ]
      },
      'User Management': {
        entities: [
          { name: 'User', weight: 1.0, aliases: ['person', 'member', 'account'] },
          { name: 'Role', weight: 0.9, aliases: ['permission', 'access_level'] },
          { name: 'Profile', weight: 0.8, aliases: ['info', 'details'] },
          { name: 'Session', weight: 0.8, aliases: ['login', 'authentication'] },
          { name: 'Group', weight: 0.7, aliases: ['team', 'organization'] },
          { name: 'Permission', weight: 0.7, aliases: ['right', 'privilege'] },
          { name: 'Registration', weight: 0.6, aliases: ['signup', 'enrollment'] },
          { name: 'Preference', weight: 0.6, aliases: ['setting', 'configuration'] }
        ],
        relationships: [
          { from: 'User', to: 'Role', type: 'has' },
          { from: 'User', to: 'Profile', type: 'owns' },
          { from: 'Role', to: 'Permission', type: 'grants' },
          { from: 'User', to: 'Group', type: 'belongs_to' }
        ],
        businessRules: [
          'authentication_validation',
          'authorization_check',
          'password_policy',
          'session_management'
        ]
      },
      'Content Management': {
        entities: [
          { name: 'Content', weight: 1.0, aliases: ['article', 'post', 'document'] },
          { name: 'Page', weight: 0.9, aliases: ['document', 'view'] },
          { name: 'Media', weight: 0.8, aliases: ['file', 'asset', 'resource'] },
          { name: 'Category', weight: 0.8, aliases: ['section', 'classification'] },
          { name: 'Tag', weight: 0.7, aliases: ['label', 'keyword'] },
          { name: 'Comment', weight: 0.7, aliases: ['feedback', 'response'] },
          { name: 'Author', weight: 0.6, aliases: ['creator', 'writer'] },
          { name: 'Publication', weight: 0.6, aliases: ['release', 'publish'] }
        ],
        relationships: [
          { from: 'Content', to: 'Category', type: 'belongs_to' },
          { from: 'Content', to: 'Tag', type: 'tagged_with' },
          { from: 'Author', to: 'Content', type: 'creates' }
        ],
        businessRules: [
          'content_validation',
          'publication_workflow',
          'access_control',
          'versioning'
        ]
      },
      'Inventory Management': {
        entities: [
          { name: 'Item', weight: 1.0, aliases: ['product', 'stock_item'] },
          { name: 'Warehouse', weight: 0.9, aliases: ['storage', 'facility'] },
          { name: 'Stock', weight: 0.9, aliases: ['inventory', 'quantity'] },
          { name: 'Supplier', weight: 0.8, aliases: ['vendor', 'provider'] },
          { name: 'Location', weight: 0.8, aliases: ['bin', 'shelf', 'zone'] },
          { name: 'Movement', weight: 0.7, aliases: ['transfer', 'adjustment'] },
          { name: 'Reorder', weight: 0.7, aliases: ['replenishment', 'restocking'] }
        ],
        relationships: [
          { from: 'Item', to: 'Stock', type: 'has' },
          { from: 'Stock', to: 'Location', type: 'stored_at' },
          { from: 'Supplier', to: 'Item', type: 'supplies' }
        ],
        businessRules: [
          'stock_level_validation',
          'reorder_point_calculation',
          'movement_tracking',
          'supplier_management'
        ]
      }
    };

    // Business process patterns
    this.businessProcessPatterns = [
      {
        name: 'Order Processing',
        steps: ['create', 'validate', 'process', 'fulfill', 'complete'],
        domain: 'E-commerce'
      },
      {
        name: 'Payment Processing',
        steps: ['authorize', 'capture', 'settle', 'refund'],
        domain: 'Financial'
      },
      {
        name: 'User Registration',
        steps: ['validate', 'create', 'verify', 'activate'],
        domain: 'User Management'
      },
      {
        name: 'Content Publishing',
        steps: ['draft', 'review', 'approve', 'publish'],
        domain: 'Content Management'
      }
    ];
  }

  /**
   * Identify domain concepts from code elements
   * @param {Object} codeElements - Extracted code elements
   * @returns {Array} Identified domain concepts with confidence scores
   */
  identifyDomainConcepts(codeElements) {
    const allText = this.extractAllText(codeElements);
    const identifiedDomains = [];

    // Analyze each domain
    Object.entries(this.domainPatterns).forEach(([domainName, domainData]) => {
      const domainAnalysis = this.analyzeDomain(allText, codeElements, domainName, domainData);
      
      if (domainAnalysis.confidence > this.options.minConfidenceScore) {
        identifiedDomains.push(domainAnalysis);
      }
    });

    // Sort by confidence and return top domains
    return identifiedDomains
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Return top 5 domains
  }

  /**
   * Analyze a specific domain against the code
   */
  analyzeDomain(allText, codeElements, domainName, domainData) {
    const foundEntities = [];
    const foundRelationships = [];
    const foundBusinessRules = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Analyze entities
    domainData.entities.forEach(entity => {
      const entityAnalysis = this.analyzeEntity(allText, codeElements, entity);
      maxPossibleScore += entity.weight;
      
      if (entityAnalysis.found) {
        foundEntities.push(entityAnalysis);
        totalScore += entity.weight * entityAnalysis.confidence;
      }
    });

    // Analyze relationships
    if (foundEntities.length > 1) {
      domainData.relationships.forEach(relationship => {
        const relationshipFound = this.analyzeRelationship(allText, codeElements, relationship, foundEntities);
        if (relationshipFound) {
          foundRelationships.push(relationship);
          totalScore += 0.5; // Bonus for found relationships
        }
      });
    }

    // Analyze business rules
    domainData.businessRules.forEach(rule => {
      const ruleFound = this.analyzeBusinessRule(allText, codeElements, rule);
      if (ruleFound) {
        foundBusinessRules.push(rule);
        totalScore += 0.3; // Bonus for business rules
      }
    });

    // Analyze business processes
    const foundProcesses = this.analyzeBusinessProcesses(allText, codeElements, domainName);

    const confidence = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

    return {
      domain: domainName,
      confidence: Math.min(confidence, 1.0),
      entities: foundEntities,
      relationships: foundRelationships,
      businessRules: foundBusinessRules,
      businessProcesses: foundProcesses,
      totalOccurrences: foundEntities.reduce((sum, e) => sum + e.occurrences, 0),
      recommendations: this.generateDomainRecommendations(domainName, foundEntities, foundRelationships)
    };
  }

  /**
   * Analyze a specific entity
   */
  analyzeEntity(allText, codeElements, entity) {
    let occurrences = 0;
    const foundIn = [];

    // Check main entity name
    const mainRegex = new RegExp(`\\b${entity.name}\\b`, 'gi');
    const mainMatches = allText.match(mainRegex) || [];
    occurrences += mainMatches.length;

    // Check aliases
    entity.aliases.forEach(alias => {
      const aliasRegex = new RegExp(`\\b${alias}\\b`, 'gi');
      const aliasMatches = allText.match(aliasRegex) || [];
      occurrences += aliasMatches.length * 0.8; // Slightly lower weight for aliases
    });

    // Find which code elements contain this entity
    [...codeElements.functions, ...codeElements.classes, ...codeElements.variables].forEach(element => {
      const elementText = element.name + ' ' + (element.body || '');
      if (mainRegex.test(elementText) || entity.aliases.some(alias => 
        new RegExp(`\\b${alias}\\b`, 'gi').test(elementText))) {
        foundIn.push({
          type: element.type || (element.params ? 'function' : element.body ? 'class' : 'variable'),
          name: element.name
        });
      }
    });

    return {
      name: entity.name,
      found: occurrences > 0,
      occurrences,
      confidence: Math.min(occurrences / 5, 1), // Max confidence at 5+ occurrences
      foundIn,
      weight: entity.weight
    };
  }

  /**
   * Analyze relationships between entities
   */
  analyzeRelationship(allText, codeElements, relationship, foundEntities) {
    const fromEntity = foundEntities.find(e => e.name === relationship.from);
    const toEntity = foundEntities.find(e => e.name === relationship.to);

    if (!fromEntity || !toEntity) return false;

    // Look for relationship patterns in code
    const relationshipPatterns = [
      new RegExp(`${relationship.from}.*${relationship.to}`, 'gi'),
      new RegExp(`${relationship.to}.*${relationship.from}`, 'gi'),
      new RegExp(`${relationship.from}.*${relationship.type}.*${relationship.to}`, 'gi')
    ];

    return relationshipPatterns.some(pattern => pattern.test(allText));
  }

  /**
   * Analyze business rules
   */
  analyzeBusinessRule(allText, codeElements, rule) {
    const rulePatterns = this.getBusinessRulePatterns(rule);
    return rulePatterns.some(pattern => pattern.test(allText));
  }

  /**
   * Get patterns for business rules
   */
  getBusinessRulePatterns(rule) {
    const patterns = {
      'order_total_calculation': [/calculate.*total/gi, /sum.*order/gi, /total.*amount/gi],
      'inventory_validation': [/check.*stock/gi, /validate.*inventory/gi, /available.*quantity/gi],
      'payment_processing': [/process.*payment/gi, /charge.*card/gi, /authorize.*payment/gi],
      'shipping_cost_calculation': [/calculate.*shipping/gi, /delivery.*cost/gi, /freight.*rate/gi],
      'balance_calculation': [/calculate.*balance/gi, /account.*total/gi, /balance.*update/gi],
      'transaction_validation': [/validate.*transaction/gi, /verify.*payment/gi, /check.*funds/gi],
      'interest_calculation': [/calculate.*interest/gi, /compound.*rate/gi, /interest.*amount/gi],
      'fee_assessment': [/calculate.*fee/gi, /assess.*charge/gi, /fee.*amount/gi],
      'authentication_validation': [/validate.*login/gi, /verify.*password/gi, /authenticate.*user/gi],
      'authorization_check': [/check.*permission/gi, /verify.*access/gi, /authorize.*action/gi],
      'password_policy': [/password.*policy/gi, /validate.*password/gi, /password.*strength/gi],
      'session_management': [/manage.*session/gi, /session.*timeout/gi, /login.*state/gi],
      'content_validation': [/validate.*content/gi, /check.*format/gi, /verify.*data/gi],
      'publication_workflow': [/publish.*content/gi, /workflow.*state/gi, /approval.*process/gi],
      'access_control': [/access.*control/gi, /permission.*check/gi, /role.*based/gi],
      'versioning': [/version.*control/gi, /track.*changes/gi, /revision.*history/gi],
      'stock_level_validation': [/check.*stock/gi, /validate.*quantity/gi, /inventory.*level/gi],
      'reorder_point_calculation': [/reorder.*point/gi, /minimum.*stock/gi, /replenish.*level/gi],
      'movement_tracking': [/track.*movement/gi, /inventory.*transfer/gi, /stock.*adjustment/gi],
      'supplier_management': [/manage.*supplier/gi, /vendor.*relationship/gi, /supplier.*performance/gi]
    };

    return patterns[rule] || [];
  }

  /**
   * Analyze business processes
   */
  analyzeBusinessProcesses(allText, codeElements, domainName) {
    const foundProcesses = [];

    this.businessProcessPatterns
      .filter(process => process.domain === domainName)
      .forEach(process => {
        const foundSteps = [];
        let totalSteps = process.steps.length;
        let foundStepCount = 0;

        process.steps.forEach(step => {
          const stepPattern = new RegExp(`\\b${step}\\b`, 'gi');
          if (stepPattern.test(allText)) {
            foundSteps.push(step);
            foundStepCount++;
          }
        });

        if (foundStepCount > 0) {
          foundProcesses.push({
            name: process.name,
            foundSteps,
            completeness: foundStepCount / totalSteps,
            confidence: Math.min(foundStepCount / totalSteps * 2, 1) // Higher confidence for more complete processes
          });
        }
      });

    return foundProcesses.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate domain-specific recommendations
   */
  generateDomainRecommendations(domainName, foundEntities, foundRelationships) {
    const recommendations = [];

    // Entity modeling recommendations
    if (foundEntities.length > 3) {
      recommendations.push({
        type: 'domain_modeling',
        priority: 'high',
        title: `Create ${domainName} Domain Model`,
        description: `Found ${foundEntities.length} ${domainName.toLowerCase()} entities that could benefit from explicit domain modeling`,
        entities: foundEntities.map(e => e.name),
        suggestion: `Consider creating a dedicated ${domainName.toLowerCase()} domain module with explicit entity classes`
      });
    }

    // Relationship modeling recommendations
    if (foundRelationships.length > 0) {
      recommendations.push({
        type: 'relationship_modeling',
        priority: 'medium',
        title: 'Model Entity Relationships',
        description: `Found ${foundRelationships.length} entity relationships that could be made explicit`,
        suggestion: 'Consider using domain-driven design patterns to model entity relationships'
      });
    }

    // Bounded context recommendations
    if (foundEntities.length > 5) {
      recommendations.push({
        type: 'bounded_context',
        priority: 'medium',
        title: `Define ${domainName} Bounded Context`,
        description: `Large number of ${domainName.toLowerCase()} entities suggests need for bounded context`,
        suggestion: `Consider creating a separate bounded context for ${domainName.toLowerCase()} functionality`
      });
    }

    return recommendations;
  }

  /**
   * Extract all text from code elements
   */
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

  /**
   * Get domain statistics
   */
  getDomainStatistics(identifiedDomains) {
    return {
      totalDomains: identifiedDomains.length,
      primaryDomain: identifiedDomains.length > 0 ? identifiedDomains[0].domain : null,
      domainDistribution: identifiedDomains.map(d => ({
        domain: d.domain,
        confidence: d.confidence,
        entityCount: d.entities.length
      })),
      crossDomainComplexity: identifiedDomains.length > 1 ? 
        identifiedDomains.slice(1).reduce((sum, d) => sum + d.confidence, 0) : 0
    };
  }
}