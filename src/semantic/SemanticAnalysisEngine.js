import { MultiLanguageParser } from '../parsers/MultiLanguageParser.js';
import { DomainConceptIdentifier } from './DomainConceptIdentifier.js';
import { BusinessRuleExtractor } from './BusinessRuleExtractor.js';
import { CrossCuttingConcernDetector } from './CrossCuttingConcernDetector.js';

/**
 * Semantic analysis engine for separating business logic from infrastructure
 * and identifying domain concepts and business rules
 */
export class SemanticAnalysisEngine {
  constructor(options = {}) {
    this.parser = new MultiLanguageParser();
    this.domainIdentifier = new DomainConceptIdentifier(options.domain);
    this.businessRuleExtractor = new BusinessRuleExtractor(options.businessRules);
    this.crossCuttingDetector = new CrossCuttingConcernDetector(options.crossCutting);
    
    this.options = {
      businessLogicThreshold: options.businessLogicThreshold || 0.7,
      domainConceptMinScore: options.domainConceptMinScore || 0.6,
      crossCuttingConcernThreshold: options.crossCuttingConcernThreshold || 0.8,
      ...options
    };

    // Business logic indicators
    this.businessLogicPatterns = {
      javascript: [
        /calculate|compute|process|validate|verify|check/i,
        /business|domain|rule|policy|workflow/i,
        /order|payment|customer|product|inventory/i,
        /discount|tax|price|billing|invoice/i,
        /approval|authorization|permission/i
      ],
      php: [
        /calculate|compute|process|validate|verify|check/i,
        /business|domain|rule|policy|workflow/i,
        /order|payment|customer|product|inventory/i,
        /discount|tax|price|billing|invoice/i,
        /approval|authorization|permission/i
      ],
      java: [
        /calculate|compute|process|validate|verify|check/i,
        /business|domain|rule|policy|workflow/i,
        /service|manager|handler|processor/i,
        /order|payment|customer|product|inventory/i
      ],
      python: [
        /calculate|compute|process|validate|verify|check/i,
        /business|domain|rule|policy|workflow/i,
        /order|payment|customer|product|inventory/i,
        /discount|tax|price|billing|invoice/i
      ]
    };

    // Infrastructure patterns
    this.infrastructurePatterns = {
      javascript: [
        /database|db|sql|query|connection/i,
        /http|request|response|api|endpoint/i,
        /cache|redis|memcache|session/i,
        /log|logger|debug|trace/i,
        /config|setting|environment|env/i,
        /auth|authentication|jwt|token/i
      ],
      php: [
        /database|db|sql|query|connection|pdo|mysqli/i,
        /http|request|response|api|endpoint|curl/i,
        /cache|redis|memcache|session/i,
        /log|logger|debug|trace/i,
        /config|setting|environment|env/i
      ],
      java: [
        /database|db|sql|query|connection|jdbc/i,
        /http|request|response|api|endpoint|servlet/i,
        /cache|redis|memcache|session/i,
        /log|logger|debug|trace|slf4j/i,
        /config|setting|environment|properties/i
      ],
      python: [
        /database|db|sql|query|connection|sqlalchemy/i,
        /http|request|response|api|endpoint|flask|django/i,
        /cache|redis|memcache|session/i,
        /log|logger|debug|trace|logging/i,
        /config|setting|environment|env/i
      ]
    };

    // Cross-cutting concern patterns
    this.crossCuttingPatterns = [
      {
        name: 'Logging',
        patterns: [/log|logger|debug|trace|info|warn|error/i],
        category: 'observability'
      },
      {
        name: 'Authentication',
        patterns: [/auth|login|logout|token|jwt|session/i],
        category: 'security'
      },
      {
        name: 'Authorization',
        patterns: [/permission|role|access|authorize|acl/i],
        category: 'security'
      },
      {
        name: 'Caching',
        patterns: [/cache|redis|memcache|store|retrieve/i],
        category: 'performance'
      },
      {
        name: 'Validation',
        patterns: [/validate|verify|check|sanitize|clean/i],
        category: 'data_integrity'
      },
      {
        name: 'Error Handling',
        patterns: [/error|exception|try|catch|throw|handle/i],
        category: 'reliability'
      },
      {
        name: 'Configuration',
        patterns: [/config|setting|environment|property/i],
        category: 'configuration'
      },
      {
        name: 'Database Access',
        patterns: [/database|db|sql|query|transaction|connection/i],
        category: 'data_access'
      }
    ];

    // Domain concept indicators
    this.domainConceptPatterns = [
      {
        domain: 'E-commerce',
        concepts: [
          'Order', 'Product', 'Customer', 'Payment', 'Cart', 'Checkout',
          'Inventory', 'Shipping', 'Discount', 'Coupon', 'Tax', 'Invoice'
        ]
      },
      {
        domain: 'Financial',
        concepts: [
          'Account', 'Transaction', 'Balance', 'Transfer', 'Interest',
          'Loan', 'Credit', 'Debit', 'Statement', 'Audit'
        ]
      },
      {
        domain: 'User Management',
        concepts: [
          'User', 'Profile', 'Role', 'Permission', 'Group', 'Session',
          'Registration', 'Authentication', 'Authorization'
        ]
      },
      {
        domain: 'Content Management',
        concepts: [
          'Content', 'Article', 'Page', 'Media', 'Category', 'Tag',
          'Comment', 'Review', 'Rating', 'Publication'
        ]
      }
    ];
  }

  /**
   * Perform comprehensive semantic analysis on parsed code
   * @param {Object} parseResult - Result from MultiLanguageParser
   * @returns {Object} Semantic analysis results
   */
  async analyzeSemantics(parseResult) {
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error,
        filePath: parseResult.filePath
      };
    }

    const { ast, metadata, language, filePath } = parseResult;
    
    try {
      // Extract code elements for analysis
      const codeElements = this.extractCodeElements(ast, language);
      
      // Analyze business logic vs infrastructure
      const businessLogicAnalysis = this.analyzeBusinessLogic(codeElements, language);
      
      // Identify domain concepts using specialized identifier
      const domainConcepts = this.domainIdentifier.identifyDomainConcepts(codeElements);
      
      // Extract business rules using specialized extractor
      const businessRules = this.businessRuleExtractor.extractBusinessRules(codeElements, language);
      
      // Detect cross-cutting concerns using specialized detector
      const crossCuttingConcerns = this.crossCuttingDetector.detectCrossCuttingConcerns(codeElements);
      
      // Calculate semantic scores
      const semanticScores = this.calculateSemanticScores(
        businessLogicAnalysis,
        domainConcepts,
        crossCuttingConcerns.concerns || crossCuttingConcerns
      );

      return {
        success: true,
        filePath,
        language,
        businessLogicAnalysis,
        domainConcepts,
        businessRules,
        crossCuttingConcerns,
        semanticScores,
        recommendations: this.generateSemanticRecommendations(
          businessLogicAnalysis,
          domainConcepts,
          crossCuttingConcerns.concerns || []
        ),
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Extract code elements for semantic analysis
   */
  extractCodeElements(ast, language) {
    const elements = {
      functions: [],
      classes: [],
      variables: [],
      imports: [],
      comments: [],
      strings: []
    };

    // Language-specific extraction
    switch (language) {
      case 'javascript':
        this.extractJavaScriptElements(ast, elements);
        break;
      case 'php':
        this.extractPHPElements(ast, elements);
        break;
      case 'java':
        this.extractJavaElements(ast, elements);
        break;
      case 'python':
        this.extractPythonElements(ast, elements);
        break;
    }

    return elements;
  }

  /**
   * Extract JavaScript code elements
   */
  extractJavaScriptElements(ast, elements) {
    const traverse = (node) => {
      if (!node || typeof node !== 'object') return;

      switch (node.type) {
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
          elements.functions.push({
            name: node.id?.name || 'anonymous',
            params: node.params?.map(p => p.name) || [],
            body: this.extractFunctionBody(node.body),
            async: node.async || false,
            generator: node.generator || false
          });
          break;

        case 'ClassDeclaration':
          elements.classes.push({
            name: node.id?.name || 'anonymous',
            methods: this.extractClassMethods(node.body),
            superClass: node.superClass?.name
          });
          break;

        case 'VariableDeclarator':
          elements.variables.push({
            name: node.id?.name,
            type: this.inferVariableType(node.init)
          });
          break;

        case 'ImportDeclaration':
          elements.imports.push({
            source: node.source?.value,
            specifiers: node.specifiers?.map(s => s.local?.name)
          });
          break;

        case 'Literal':
          if (typeof node.value === 'string') {
            elements.strings.push(node.value);
          }
          break;
      }

      // Recursively traverse child nodes
      Object.values(node).forEach(child => {
        if (Array.isArray(child)) {
          child.forEach(traverse);
        } else if (child && typeof child === 'object') {
          traverse(child);
        }
      });
    };

    traverse(ast);
  }

  /**
   * Extract PHP code elements
   */
  extractPHPElements(ast, elements) {
    const traverse = (node) => {
      if (!node || typeof node !== 'object') return;

      switch (node.kind) {
        case 'function':
          elements.functions.push({
            name: node.name?.name || 'anonymous',
            params: node.arguments?.map(p => p.name?.name) || [],
            body: this.extractNodeText(node.body),
            visibility: node.visibility
          });
          break;

        case 'class':
          elements.classes.push({
            name: node.name?.name || 'anonymous',
            methods: this.extractPHPClassMethods(node.body),
            extends: node.extends?.name
          });
          break;

        case 'assign':
          if (node.left?.kind === 'variable') {
            elements.variables.push({
              name: node.left.name,
              type: this.inferPHPVariableType(node.right)
            });
          }
          break;

        case 'string':
          elements.strings.push(node.value);
          break;
      }

      // Recursively traverse child nodes
      Object.values(node).forEach(child => {
        if (Array.isArray(child)) {
          child.forEach(traverse);
        } else if (child && typeof child === 'object') {
          traverse(child);
        }
      });
    };

    traverse(ast);
  }

  /**
   * Extract Java code elements (simplified)
   */
  extractJavaElements(ast, elements) {
    // Simplified extraction for Java AST
    if (ast.body) {
      ast.body.forEach(statement => {
        const content = statement.content || '';
        
        // Extract function-like patterns
        const methodMatches = content.match(/\b(public|private|protected)?\s*(static)?\s*\w+\s+(\w+)\s*\(/g);
        if (methodMatches) {
          methodMatches.forEach(match => {
            const nameMatch = match.match(/(\w+)\s*\(/);
            if (nameMatch) {
              elements.functions.push({
                name: nameMatch[1],
                params: [],
                body: content,
                visibility: match.includes('public') ? 'public' : 
                          match.includes('private') ? 'private' : 'protected'
              });
            }
          });
        }

        // Extract class patterns
        const classMatches = content.match(/\bclass\s+(\w+)/g);
        if (classMatches) {
          classMatches.forEach(match => {
            const nameMatch = match.match(/class\s+(\w+)/);
            if (nameMatch) {
              elements.classes.push({
                name: nameMatch[1],
                methods: [],
                extends: null
              });
            }
          });
        }

        // Extract string literals
        const stringMatches = content.match(/"([^"]*)"/g);
        if (stringMatches) {
          elements.strings.push(...stringMatches.map(s => s.slice(1, -1)));
        }
      });
    }
  }

  /**
   * Extract Python code elements (simplified)
   */
  extractPythonElements(ast, elements) {
    // Simplified extraction for Python AST
    if (ast.body) {
      ast.body.forEach(statement => {
        const content = statement.content || '';
        
        // Extract function patterns
        const funcMatches = content.match(/\bdef\s+(\w+)\s*\(/g);
        if (funcMatches) {
          funcMatches.forEach(match => {
            const nameMatch = match.match(/def\s+(\w+)/);
            if (nameMatch) {
              elements.functions.push({
                name: nameMatch[1],
                params: [],
                body: content,
                async: content.includes('async def')
              });
            }
          });
        }

        // Extract class patterns
        const classMatches = content.match(/\bclass\s+(\w+)/g);
        if (classMatches) {
          classMatches.forEach(match => {
            const nameMatch = match.match(/class\s+(\w+)/);
            if (nameMatch) {
              elements.classes.push({
                name: nameMatch[1],
                methods: [],
                superClass: null
              });
            }
          });
        }

        // Extract string literals
        const stringMatches = content.match(/'([^']*)'|"([^"]*)"/g);
        if (stringMatches) {
          elements.strings.push(...stringMatches.map(s => s.slice(1, -1)));
        }
      });
    }
  }

  /**
   * Analyze business logic vs infrastructure code
   */
  analyzeBusinessLogic(codeElements, language) {
    const businessLogicPatterns = this.businessLogicPatterns[language] || [];
    const infrastructurePatterns = this.infrastructurePatterns[language] || [];
    
    const analysis = {
      businessLogicScore: 0,
      infrastructureScore: 0,
      businessLogicElements: [],
      infrastructureElements: [],
      mixedElements: []
    };

    // Analyze functions
    codeElements.functions.forEach(func => {
      const businessScore = this.calculatePatternScore(func.name + ' ' + func.body, businessLogicPatterns);
      const infraScore = this.calculatePatternScore(func.name + ' ' + func.body, infrastructurePatterns);
      
      const element = {
        type: 'function',
        name: func.name,
        businessScore,
        infraScore,
        classification: this.classifyElement(businessScore, infraScore)
      };

      if (element.classification === 'business') {
        analysis.businessLogicElements.push(element);
      } else if (element.classification === 'infrastructure') {
        analysis.infrastructureElements.push(element);
      } else {
        analysis.mixedElements.push(element);
      }
    });

    // Analyze classes
    codeElements.classes.forEach(cls => {
      const businessScore = this.calculatePatternScore(cls.name, businessLogicPatterns);
      const infraScore = this.calculatePatternScore(cls.name, infrastructurePatterns);
      
      const element = {
        type: 'class',
        name: cls.name,
        businessScore,
        infraScore,
        classification: this.classifyElement(businessScore, infraScore)
      };

      if (element.classification === 'business') {
        analysis.businessLogicElements.push(element);
      } else if (element.classification === 'infrastructure') {
        analysis.infrastructureElements.push(element);
      } else {
        analysis.mixedElements.push(element);
      }
    });

    // Calculate overall scores
    const totalElements = analysis.businessLogicElements.length + 
                         analysis.infrastructureElements.length + 
                         analysis.mixedElements.length;
    
    if (totalElements > 0) {
      analysis.businessLogicScore = analysis.businessLogicElements.length / totalElements;
      analysis.infrastructureScore = analysis.infrastructureElements.length / totalElements;
    }

    return analysis;
  }

  /**
   * Identify domain concepts in the code
   */
  identifyDomainConcepts(codeElements) {
    const identifiedConcepts = [];
    const allText = this.extractAllText(codeElements);

    this.domainConceptPatterns.forEach(domainPattern => {
      const domainConcepts = [];
      
      domainPattern.concepts.forEach(concept => {
        const regex = new RegExp(`\\b${concept}\\b`, 'gi');
        const matches = allText.match(regex);
        
        if (matches && matches.length > 0) {
          domainConcepts.push({
            concept,
            occurrences: matches.length,
            confidence: Math.min(matches.length / 10, 1) // Max confidence at 10+ occurrences
          });
        }
      });

      if (domainConcepts.length > 0) {
        const domainScore = domainConcepts.reduce((sum, c) => sum + c.confidence, 0) / domainConcepts.length;
        
        identifiedConcepts.push({
          domain: domainPattern.domain,
          concepts: domainConcepts,
          domainScore,
          totalOccurrences: domainConcepts.reduce((sum, c) => sum + c.occurrences, 0)
        });
      }
    });

    return identifiedConcepts.sort((a, b) => b.domainScore - a.domainScore);
  }

  /**
   * Extract business rules from code elements
   */
  extractBusinessRules(codeElements, language) {
    const businessRules = [];
    
    // Look for conditional logic that might represent business rules
    codeElements.functions.forEach(func => {
      const rules = this.extractRulesFromFunction(func, language);
      businessRules.push(...rules);
    });

    return businessRules;
  }

  /**
   * Extract business rules from a function
   */
  extractRulesFromFunction(func, language) {
    const rules = [];
    const body = func.body || '';
    
    // Look for conditional patterns that suggest business rules
    const conditionalPatterns = [
      /if\s*\([^)]*\)\s*{[^}]*}/gi,
      /switch\s*\([^)]*\)\s*{[^}]*}/gi,
      /when\s+[^{]*{[^}]*}/gi
    ];

    conditionalPatterns.forEach(pattern => {
      const matches = body.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Extract condition and action
          const conditionMatch = match.match(/\(([^)]*)\)/);
          const condition = conditionMatch ? conditionMatch[1] : '';
          
          if (this.isBusinessRule(condition, func.name)) {
            rules.push({
              type: 'conditional',
              function: func.name,
              condition: condition.trim(),
              description: this.generateRuleDescription(condition, func.name),
              confidence: this.calculateRuleConfidence(condition, func.name)
            });
          }
        });
      }
    });

    return rules;
  }

  /**
   * Detect cross-cutting concerns
   */
  detectCrossCuttingConcerns(codeElements) {
    const detectedConcerns = [];
    const allText = this.extractAllText(codeElements);

    this.crossCuttingPatterns.forEach(pattern => {
      let totalMatches = 0;
      const matchingElements = [];

      pattern.patterns.forEach(regex => {
        const matches = allText.match(regex);
        if (matches) {
          totalMatches += matches.length;
        }
      });

      // Check which elements contain this concern
      [...codeElements.functions, ...codeElements.classes].forEach(element => {
        const elementText = element.name + ' ' + (element.body || '');
        const hasPattern = pattern.patterns.some(regex => regex.test(elementText));
        
        if (hasPattern) {
          matchingElements.push({
            type: element.type || (element.params ? 'function' : 'class'),
            name: element.name
          });
        }
      });

      if (totalMatches > 0 && matchingElements.length > 1) {
        detectedConcerns.push({
          name: pattern.name,
          category: pattern.category,
          occurrences: totalMatches,
          affectedElements: matchingElements,
          crossCuttingScore: Math.min(matchingElements.length / 5, 1), // Max score at 5+ elements
          recommendation: this.generateCrossCuttingRecommendation(pattern.name, matchingElements.length)
        });
      }
    });

    return detectedConcerns.sort((a, b) => b.crossCuttingScore - a.crossCuttingScore);
  }

  /**
   * Calculate semantic scores
   */
  calculateSemanticScores(businessLogicAnalysis, domainConcepts, crossCuttingConcerns) {
    const businessLogicScore = businessLogicAnalysis.businessLogicScore || 0;
    const domainClarityScore = domainConcepts.length > 0 ? 
      domainConcepts[0].domainScore : 0;
    const separationOfConcernsScore = 1 - (crossCuttingConcerns.length * 0.1);
    
    return {
      businessLogicScore: Math.round(businessLogicScore * 100),
      domainClarityScore: Math.round(domainClarityScore * 100),
      separationOfConcernsScore: Math.round(Math.max(0, separationOfConcernsScore) * 100),
      overallSemanticScore: Math.round(
        (businessLogicScore + domainClarityScore + Math.max(0, separationOfConcernsScore)) / 3 * 100
      )
    };
  }

  /**
   * Generate semantic recommendations
   */
  generateSemanticRecommendations(businessLogicAnalysis, domainConcepts, crossCuttingConcerns) {
    const recommendations = [];

    // Business logic separation recommendations
    if (businessLogicAnalysis.mixedElements.length > 0) {
      recommendations.push({
        type: 'separation',
        priority: 'high',
        title: 'Separate Business Logic from Infrastructure',
        description: `${businessLogicAnalysis.mixedElements.length} elements mix business logic with infrastructure concerns`,
        affectedElements: businessLogicAnalysis.mixedElements.map(e => e.name),
        suggestion: 'Extract business logic into separate modules or services'
      });
    }

    // Domain modeling recommendations
    if (domainConcepts.length > 1) {
      recommendations.push({
        type: 'domain_modeling',
        priority: 'medium',
        title: 'Improve Domain Modeling',
        description: `Multiple domain concepts detected: ${domainConcepts.map(d => d.domain).join(', ')}`,
        suggestion: 'Consider creating explicit domain models and bounded contexts'
      });
    }

    // Cross-cutting concerns recommendations
    crossCuttingConcerns.forEach(concern => {
      if (concern.crossCuttingScore > this.options.crossCuttingConcernThreshold) {
        recommendations.push({
          type: 'cross_cutting',
          priority: 'medium',
          title: `Extract ${concern.name} Concern`,
          description: `${concern.name} is scattered across ${concern.affectedElements.length} elements`,
          affectedElements: concern.affectedElements.map(e => e.name),
          suggestion: concern.recommendation
        });
      }
    });

    return recommendations;
  }

  // Helper methods
  calculatePatternScore(text, patterns) {
    let score = 0;
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length;
      }
    });
    return Math.min(score / 10, 1); // Normalize to 0-1
  }

  classifyElement(businessScore, infraScore) {
    if (businessScore > infraScore && businessScore > this.options.businessLogicThreshold) {
      return 'business';
    } else if (infraScore > businessScore && infraScore > this.options.businessLogicThreshold) {
      return 'infrastructure';
    } else {
      return 'mixed';
    }
  }

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

  isBusinessRule(condition, functionName) {
    const businessIndicators = [
      /amount|price|cost|total|sum/i,
      /status|state|valid|invalid/i,
      /permission|role|access/i,
      /date|time|expired|active/i,
      /count|limit|maximum|minimum/i
    ];
    
    const text = condition + ' ' + functionName;
    return businessIndicators.some(pattern => pattern.test(text));
  }

  generateRuleDescription(condition, functionName) {
    return `Business rule in ${functionName}: when ${condition}`;
  }

  calculateRuleConfidence(condition, functionName) {
    // Simple confidence calculation based on business keywords
    const businessKeywords = ['amount', 'price', 'valid', 'status', 'permission', 'limit'];
    const text = (condition + ' ' + functionName).toLowerCase();
    const matches = businessKeywords.filter(keyword => text.includes(keyword));
    return Math.min(matches.length / 3, 1);
  }

  generateCrossCuttingRecommendation(concernName, elementCount) {
    const recommendations = {
      'Logging': 'Consider using a centralized logging framework or aspect-oriented programming',
      'Authentication': 'Extract authentication logic into middleware or decorators',
      'Authorization': 'Implement role-based access control (RBAC) or attribute-based access control (ABAC)',
      'Caching': 'Use a caching abstraction layer or decorators',
      'Validation': 'Create reusable validation rules and schemas',
      'Error Handling': 'Implement centralized error handling with custom exception types',
      'Configuration': 'Use a configuration management system',
      'Database Access': 'Implement repository pattern or data access layer'
    };
    
    return recommendations[concernName] || 'Consider extracting this concern into a reusable component';
  }

  // Additional helper methods for code extraction
  extractFunctionBody(body) {
    if (!body) return '';
    if (typeof body === 'string') return body;
    if (body.body && Array.isArray(body.body)) {
      return body.body.map(stmt => this.extractNodeText(stmt)).join('\n');
    }
    return this.extractNodeText(body);
  }

  extractClassMethods(body) {
    if (!body || !body.body) return [];
    return body.body
      .filter(node => node.type === 'MethodDefinition')
      .map(method => ({
        name: method.key?.name || 'anonymous',
        kind: method.kind,
        static: method.static
      }));
  }

  extractPHPClassMethods(body) {
    if (!body || !Array.isArray(body)) return [];
    return body
      .filter(node => node.kind === 'method')
      .map(method => ({
        name: method.name?.name || 'anonymous',
        visibility: method.visibility
      }));
  }

  extractNodeText(node) {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.raw) return node.raw;
    if (node.value) return String(node.value);
    return '';
  }

  inferVariableType(init) {
    if (!init) return 'unknown';
    if (init.type === 'Literal') {
      return typeof init.value;
    }
    if (init.type === 'ArrayExpression') return 'array';
    if (init.type === 'ObjectExpression') return 'object';
    if (init.type === 'FunctionExpression') return 'function';
    return 'unknown';
  }

  inferPHPVariableType(init) {
    if (!init) return 'unknown';
    if (init.kind === 'string') return 'string';
    if (init.kind === 'number') return 'number';
    if (init.kind === 'boolean') return 'boolean';
    if (init.kind === 'array') return 'array';
    return 'unknown';
  }
}