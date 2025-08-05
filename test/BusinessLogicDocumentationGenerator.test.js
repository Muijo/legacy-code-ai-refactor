import { describe, it, expect, beforeEach } from 'vitest';
import { BusinessLogicDocumentationGenerator } from '../src/semantic/BusinessLogicDocumentationGenerator.js';

describe('BusinessLogicDocumentationGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new BusinessLogicDocumentationGenerator({
      outputFormat: 'markdown',
      includeCodeExamples: true,
      includeDiagrams: true,
      detailLevel: 'medium'
    });
  });

  describe('Documentation Generation', () => {
    it('should generate comprehensive documentation from semantic analysis', async () => {
      const mockSemanticAnalysis = {
        businessLogicAnalysis: {
          businessLogicElements: [
            {
              name: 'calculateOrderTotal',
              type: 'function',
              businessScore: 0.9,
              classification: 'business'
            },
            {
              name: 'validatePayment',
              type: 'function',
              businessScore: 0.8,
              classification: 'business'
            }
          ],
          infrastructureElements: [
            {
              name: 'connectDatabase',
              type: 'function',
              infraScore: 0.95,
              classification: 'infrastructure'
            }
          ],
          mixedElements: [
            {
              name: 'processOrder',
              type: 'function',
              businessScore: 0.6,
              infraScore: 0.4,
              classification: 'mixed'
            }
          ]
        },
        domainConcepts: [
          {
            domain: 'E-commerce',
            confidence: 0.85,
            entities: [
              { name: 'Order', confidence: 0.9, occurrences: 15 },
              { name: 'Product', confidence: 0.8, occurrences: 12 },
              { name: 'Customer', confidence: 0.85, occurrences: 10 }
            ],
            businessProcesses: [
              { name: 'Order Processing', confidence: 0.8 }
            ],
            relationships: [
              { from: 'Customer', to: 'Order', type: 'places' }
            ],
            totalOccurrences: 37
          }
        ],
        businessRules: {
          rules: [
            {
              type: 'validation',
              primaryCategory: 'Validation',
              description: 'Email validation rule',
              condition: 'email.includes("@")',
              confidence: 0.9,
              complexity: 2,
              sourceFunction: 'validateUser'
            },
            {
              type: 'calculation',
              primaryCategory: 'Calculation',
              description: 'Tax calculation rule',
              condition: 'total * taxRate',
              confidence: 0.85,
              complexity: 3,
              sourceFunction: 'calculateTax'
            }
          ]
        },
        crossCuttingConcerns: {
          concerns: [
            {
              name: 'Logging',
              category: 'observability',
              severity: 'medium',
              description: 'Logging functionality scattered across multiple components',
              affectedElements: [
                { name: 'processOrder', type: 'function' },
                { name: 'validatePayment', type: 'function' }
              ],
              crossCuttingScore: 0.75,
              recommendation: 'Consider implementing a centralized logging framework',
              hotspots: [
                { name: 'processOrder', type: 'function', matchCount: 5 }
              ]
            }
          ],
          recommendations: [
            {
              strategy: 'centralized_logging',
              priority: 'medium',
              description: 'Create a centralized logging service',
              implementation: 'Implement a logger factory',
              benefits: ['Consistent log format', 'Centralized configuration']
            }
          ]
        },
        recommendations: [
          {
            type: 'separation',
            priority: 'high',
            title: 'Separate Business Logic from Infrastructure',
            description: 'Mixed elements should be refactored',
            suggestion: 'Extract business logic into separate modules',
            affectedElements: ['processOrder']
          }
        ]
      };

      const result = await generator.generateDocumentation(mockSemanticAnalysis);

      expect(result.success).toBe(true);
      expect(result.documentation).toBeDefined();
      expect(result.format).toBe('markdown');
      expect(result.sections).toBeGreaterThan(0);
      expect(result.businessComponents).toBeGreaterThan(0);

      // Check that documentation contains expected sections
      expect(result.documentation).toContain('# Business Logic Documentation');
      expect(result.documentation).toContain('## Executive Summary');
      expect(result.documentation).toContain('## Domain Overview');
      expect(result.documentation).toContain('## Business Rules Documentation');
      expect(result.documentation).toContain('## Business Logic Components');
    });

    it('should handle empty semantic analysis gracefully', async () => {
      const emptyAnalysis = {
        businessLogicAnalysis: null,
        domainConcepts: [],
        businessRules: { rules: [] },
        crossCuttingConcerns: { concerns: [] },
        recommendations: []
      };

      const result = await generator.generateDocumentation(emptyAnalysis);

      expect(result.success).toBe(true);
      expect(result.documentation).toBeDefined();
      expect(result.documentation).toContain('# Business Logic Documentation');
      expect(result.documentation).toContain('## Executive Summary');
    });
  });

  describe('Business Component Extraction', () => {
    it('should extract business components from semantic analysis', () => {
      const mockAnalysis = {
        businessLogicAnalysis: {
          businessLogicElements: [
            { name: 'calculateTotal', type: 'function', businessScore: 0.9, classification: 'business' }
          ]
        },
        domainConcepts: [
          {
            domain: 'E-commerce',
            entities: [
              { name: 'Order', confidence: 0.8, occurrences: 5 }
            ]
          }
        ],
        businessRules: {
          rules: [
            {
              description: 'Validation rule',
              primaryCategory: 'Validation',
              confidence: 0.7,
              complexity: 2,
              sourceFunction: 'validate'
            }
          ]
        }
      };

      const components = generator.extractBusinessComponents(mockAnalysis);

      expect(components).toHaveLength(3);
      expect(components[0].type).toBe('business_logic');
      expect(components[1].type).toBe('domain_entity');
      expect(components[2].type).toBe('business_rule');
    });
  });

  describe('Executive Summary Generation', () => {
    it('should generate executive summary with component counts', () => {
      const mockComponents = [
        { type: 'business_logic', name: 'func1' },
        { type: 'business_logic', name: 'func2' },
        { type: 'domain_entity', name: 'Order' },
        { type: 'business_rule', name: 'rule1' }
      ];

      const summary = generator.generateExecutiveSummary(mockComponents);

      expect(summary.title).toBe('Executive Summary');
      const summaryText = summary.content.join(' ');
      expect(summaryText).toContain('**2** business logic components identified');
      expect(summaryText).toContain('**1** domain entities discovered');
      expect(summaryText).toContain('**1** business rules extracted');
    });
  });

  describe('Domain Overview Generation', () => {
    it('should generate domain overview with entities and relationships', () => {
      const mockDomainConcepts = [
        {
          domain: 'E-commerce',
          entities: [
            { name: 'Order', confidence: 0.9, occurrences: 10 },
            { name: 'Product', confidence: 0.8, occurrences: 8 }
          ],
          businessProcesses: [
            { name: 'Order Processing', confidence: 0.85 }
          ],
          relationships: [
            { from: 'Customer', to: 'Order', type: 'places' }
          ]
        }
      ];

      const overview = generator.generateDomainOverview(mockDomainConcepts);

      expect(overview.title).toBe('Domain Overview');
      const overviewText = overview.content.join(' ');
      expect(overviewText).toContain('### E-commerce Domain');
      expect(overviewText).toContain('**Order**: Found 10 times');
      expect(overviewText).toContain('**Product**: Found 8 times');
      expect(overviewText).toContain('**Order Processing**: 85% complete');
      expect(overviewText).toContain('Customer places Order');
    });
  });

  describe('Business Rules Documentation', () => {
    it('should generate business rules documentation with categories', () => {
      const mockBusinessRules = {
        rules: [
          {
            primaryCategory: 'Validation',
            description: 'Email validation',
            condition: 'email.includes("@")',
            confidence: 0.9,
            complexity: 2,
            sourceFunction: 'validateEmail'
          },
          {
            primaryCategory: 'Calculation',
            description: 'Tax calculation',
            condition: 'amount * rate',
            confidence: 0.8,
            complexity: 3,
            sourceFunction: 'calculateTax'
          }
        ]
      };

      const rulesDoc = generator.generateBusinessRulesDocumentation(mockBusinessRules);

      expect(rulesDoc.title).toBe('Business Rules Documentation');
      expect(rulesDoc.content).toContain('### Validation Rules');
      expect(rulesDoc.content).toContain('### Calculation Rules');
      expect(rulesDoc.content).toContain('#### Rule 1: Email validation');
      expect(rulesDoc.content).toContain('**Source Function**: validateEmail');
      expect(rulesDoc.content).toContain('**Confidence**: 90%');
      expect(rulesDoc.content).toContain('### Rule Statistics');
    });
  });

  describe('Business Logic Components Documentation', () => {
    it('should document business logic components by classification', () => {
      const mockAnalysis = {
        businessLogicElements: [
          { name: 'calculateTotal', type: 'function', businessScore: 0.9, classification: 'business' }
        ],
        mixedElements: [
          { name: 'processOrder', type: 'function', businessScore: 0.6, infraScore: 0.4, classification: 'mixed' }
        ],
        infrastructureElements: [
          { name: 'connectDB', type: 'function', infraScore: 0.95, classification: 'infrastructure' }
        ]
      };

      const componentsDoc = generator.generateBusinessLogicComponents(mockAnalysis);

      expect(componentsDoc.title).toBe('Business Logic Components');
      expect(componentsDoc.content).toContain('### Pure Business Logic Components');
      expect(componentsDoc.content).toContain('### Mixed Business/Infrastructure Components');
      expect(componentsDoc.content).toContain('### Infrastructure Components');
      expect(componentsDoc.content).toContain('#### calculateTotal (function)');
      expect(componentsDoc.content).toContain('#### processOrder (function)');
    });
  });

  describe('Cross-Cutting Concerns Documentation', () => {
    it('should document cross-cutting concerns and refactoring recommendations', () => {
      const mockConcerns = {
        concerns: [
          {
            name: 'Logging',
            category: 'observability',
            severity: 'medium',
            description: 'Logging scattered across components',
            affectedElements: [{ name: 'func1', type: 'function' }],
            crossCuttingScore: 0.8,
            recommendation: 'Use centralized logging',
            hotspots: [{ name: 'func1', type: 'function', matchCount: 5 }]
          }
        ],
        recommendations: [
          {
            strategy: 'centralized_logging',
            priority: 'medium',
            description: 'Create logging service',
            implementation: 'Use logger factory',
            benefits: ['Consistent format']
          }
        ]
      };

      const concernsDoc = generator.generateCrossCuttingConcernsImpact(mockConcerns);

      expect(concernsDoc.title).toBe('Cross-Cutting Concerns Impact');
      expect(concernsDoc.content).toContain('### Identified Cross-Cutting Concerns');
      expect(concernsDoc.content).toContain('#### Logging (observability)');
      expect(concernsDoc.content).toContain('**Severity**: medium');
      expect(concernsDoc.content).toContain('### Refactoring Recommendations');
      expect(concernsDoc.content).toContain('#### centralized_logging');
    });
  });

  describe('Dependency Mapping', () => {
    it('should generate dependency mapping for business components', () => {
      const mockComponents = [
        { type: 'business_logic', name: 'func1' },
        { type: 'domain_entity', name: 'Order', domain: 'E-commerce' },
        { type: 'business_rule', name: 'rule1', sourceFunction: 'func1', category: 'Validation' }
      ];

      const dependencyDoc = generator.generateDependencyMapping(mockComponents);

      expect(dependencyDoc.title).toBe('Dependency Mapping');
      expect(dependencyDoc.content).toContain('### Component Overview');
      expect(dependencyDoc.content).toContain('| Component Type | Count | Description |');
      expect(dependencyDoc.content).toContain('### Dependency Analysis');
      expect(dependencyDoc.content).toContain('**Function-Rule Dependencies:**');
      expect(dependencyDoc.content).toContain('**Domain Entity Groupings:**');
    });
  });

  describe('Recommendations Section', () => {
    it('should generate recommendations grouped by priority', () => {
      const mockRecommendations = [
        {
          priority: 'high',
          title: 'Critical Issue',
          description: 'Fix this immediately',
          suggestion: 'Do this now',
          affectedElements: ['func1', 'func2']
        },
        {
          priority: 'medium',
          title: 'Medium Issue',
          description: 'Fix this soon',
          suggestion: 'Do this later'
        },
        {
          priority: 'low',
          title: 'Low Issue',
          description: 'Fix this eventually',
          suggestion: 'Do this when convenient'
        }
      ];

      const recommendationsDoc = generator.generateRecommendationsSection(mockRecommendations);

      expect(recommendationsDoc.title).toBe('Recommendations');
      expect(recommendationsDoc.content).toContain('### High Priority Recommendations');
      expect(recommendationsDoc.content).toContain('### Medium Priority Recommendations');
      expect(recommendationsDoc.content).toContain('### Low Priority Recommendations');
      expect(recommendationsDoc.content).toContain('#### 1. Critical Issue');
      expect(recommendationsDoc.content).toContain('**Affected Elements:**');
    });
  });

  describe('Consolidated Documentation', () => {
    it('should generate consolidated documentation from multiple analysis results', async () => {
      const mockResults = [
        {
          success: true,
          businessLogicAnalysis: {
            businessLogicElements: [{ name: 'func1', type: 'function' }]
          },
          domainConcepts: [{ domain: 'E-commerce', entities: [{ name: 'Order' }] }],
          businessRules: { rules: [{ description: 'rule1' }] }
        },
        {
          success: true,
          businessLogicAnalysis: {
            businessLogicElements: [{ name: 'func2', type: 'function' }]
          },
          domainConcepts: [{ domain: 'E-commerce', entities: [{ name: 'Product' }] }],
          businessRules: { rules: [{ description: 'rule2' }] }
        }
      ];

      const result = await generator.generateConsolidatedDocumentation(mockResults);

      expect(result.success).toBe(true);
      expect(result.documentation).toBeDefined();
      expect(result.businessComponents).toBeGreaterThan(0);
    });

    it('should consolidate analysis results correctly', () => {
      const mockResults = [
        {
          success: true,
          domainConcepts: [
            { domain: 'E-commerce', entities: [{ name: 'Order' }], confidence: 0.8, totalOccurrences: 5 }
          ]
        },
        {
          success: true,
          domainConcepts: [
            { domain: 'E-commerce', entities: [{ name: 'Product' }], confidence: 0.9, totalOccurrences: 3 }
          ]
        }
      ];

      const consolidated = generator.consolidateAnalysisResults(mockResults);

      expect(consolidated.domainConcepts).toHaveLength(1);
      expect(consolidated.domainConcepts[0].domain).toBe('E-commerce');
      expect(consolidated.domainConcepts[0].entities).toHaveLength(2);
      expect(consolidated.domainConcepts[0].confidence).toBe(0.9); // Max confidence
      expect(consolidated.domainConcepts[0].totalOccurrences).toBe(8); // Sum of occurrences
    });
  });

  describe('Output Formats', () => {
    it('should generate HTML format documentation', async () => {
      const htmlGenerator = new BusinessLogicDocumentationGenerator({
        outputFormat: 'html'
      });

      const mockAnalysis = {
        businessLogicAnalysis: { businessLogicElements: [] },
        domainConcepts: [],
        businessRules: { rules: [] },
        crossCuttingConcerns: { concerns: [] },
        recommendations: []
      };

      const result = await htmlGenerator.generateDocumentation(mockAnalysis);

      expect(result.success).toBe(true);
      expect(result.format).toBe('html');
      expect(result.documentation).toContain('<h1>Business Logic Documentation</h1>');
      expect(result.documentation).toContain('<h2>Executive Summary</h2>');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully during documentation generation', async () => {
      // Mock a scenario that would cause an error
      const invalidAnalysis = null;

      const result = await generator.generateDocumentation(invalidAnalysis);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });
});