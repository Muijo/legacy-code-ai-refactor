import { describe, it, expect, beforeEach } from 'vitest';
import { ModernCodeGenerator } from '../src/generation/ModernCodeGenerator.js';

describe('ModernCodeGenerator', () => {
  let generator;
  let mockAnalysisResult;

  beforeEach(() => {
    generator = new ModernCodeGenerator({
      targetLanguage: 'javascript',
      styleGuide: 'airbnb',
      optimizationLevel: 'moderate',
      generateDocumentation: true
    });

    mockAnalysisResult = {
      success: true,
      filePath: '/src/legacy/UserManager.js',
      language: 'javascript',
      codeMetrics: {
        cyclomaticComplexity: 15,
        linesOfCode: 450,
        nestingDepth: 4
      },
      parsing: {
        classes: [
          {
            name: 'UserManager',
            exported: true,
            constructor: {
              parameters: [
                { name: 'database', type: 'object' },
                { name: 'config', type: 'object', defaultValue: '{}' }
              ],
              assignments: [
                { property: 'db', value: 'database' },
                { property: 'config', value: 'config' }
              ]
            },
            methods: [
              {
                name: 'getUser',
                async: true,
                parameters: [
                  { name: 'userId', type: 'string' }
                ],
                returnType: 'Promise<User>'
              },
              {
                name: 'createUser',
                async: true,
                parameters: [
                  { name: 'userData', type: 'object' }
                ],
                returnType: 'Promise<User>'
              }
            ]
          }
        ],
        functions: [
          {
            name: 'validateEmail',
            exported: true,
            parameters: [
              { name: 'email', type: 'string' }
            ],
            returnType: 'boolean'
          }
        ],
        dependencies: [
          { path: './database.js', type: 'import' },
          { path: './validator.js', type: 'import' }
        ]
      },
      businessLogic: [
        {
          type: 'validation',
          description: 'Email validation logic',
          location: 'validateEmail function',
          importance: 'high'
        },
        {
          type: 'data_access',
          description: 'User data retrieval and storage',
          location: 'UserManager class',
          importance: 'high'
        }
      ],
      patterns: [
        {
          type: 'anti_pattern',
          name: 'callback_hell',
          modernAlternative: 'async/await',
          location: 'getUser method'
        }
      ]
    };
  });

  describe('generateModernCode', () => {
    it('should generate modern code from analysis result', () => {
      const result = generator.generateModernCode(mockAnalysisResult);

      expect(result.success).toBe(true);
      expect(result.originalFile).toBe('/src/legacy/UserManager.js');
      expect(result.generatedCode).toBeDefined();
      expect(Array.isArray(result.generatedCode)).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('should include metadata about generation', () => {
      const result = generator.generateModernCode(mockAnalysisResult);

      expect(result.metadata.language).toBe('javascript');
      expect(result.metadata.styleGuide).toBe('airbnb');
      expect(result.metadata.optimizationLevel).toBe('moderate');
      expect(result.metadata.componentsGenerated).toBeGreaterThan(0);
      expect(result.metadata.metrics).toBeDefined();
    });

    it('should generate documentation when enabled', () => {
      const result = generator.generateModernCode(mockAnalysisResult);

      expect(result.documentation).toBeDefined();
      expect(result.documentation.overview).toBeDefined();
      expect(result.documentation.components).toBeDefined();
      expect(result.documentation.businessLogic).toBeDefined();
      expect(result.documentation.migration).toBeDefined();
      expect(result.documentation.usage).toBeDefined();
    });

    it('should not generate documentation when disabled', () => {
      const result = generator.generateModernCode(mockAnalysisResult, {
        generateDocumentation: false
      });

      expect(result.documentation).toBeNull();
    });

    it('should throw error for failed analysis result', () => {
      const failedResult = {
        success: false,
        error: 'Parse error'
      };

      expect(() => {
        generator.generateModernCode(failedResult);
      }).toThrow('Cannot generate code from failed analysis: Parse error');
    });
  });

  describe('component extraction', () => {
    it('should extract classes from analysis result', () => {
      const components = generator.extractComponents(mockAnalysisResult);

      const classComponent = components.find(c => c.type === 'class');
      expect(classComponent).toBeDefined();
      expect(classComponent.name).toBe('UserManager');
      expect(classComponent.data).toBeDefined();
      expect(classComponent.businessLogic).toBeDefined();
    });

    it('should extract functions from analysis result', () => {
      const components = generator.extractComponents(mockAnalysisResult);

      const functionComponent = components.find(c => c.type === 'function');
      expect(functionComponent).toBeDefined();
      expect(functionComponent.name).toBe('validateEmail');
      expect(functionComponent.data).toBeDefined();
    });

    it('should handle missing parsing data', () => {
      const resultWithoutParsing = {
        ...mockAnalysisResult,
        parsing: {}
      };

      const components = generator.extractComponents(resultWithoutParsing);
      expect(components).toHaveLength(0);
    });
  });

  describe('JavaScript code generation', () => {
    it('should generate JavaScript class', () => {
      const classComponent = {
        type: 'class',
        name: 'UserManager',
        data: mockAnalysisResult.parsing.classes[0]
      };

      const generatedClass = generator.generateJavaScriptClass(classComponent, {
        targetLanguage: 'javascript',
        styleGuide: 'airbnb'
      });

      expect(generatedClass).toContain('class UserManager');
      expect(generatedClass).toContain('constructor(database, config = {})');
      expect(generatedClass).toContain('async getUser(userId)');
      expect(generatedClass).toContain('async createUser(userData)');
      expect(generatedClass).toContain('export ');
    });

    it('should generate JavaScript function', () => {
      const functionComponent = {
        type: 'function',
        name: 'validateEmail',
        data: mockAnalysisResult.parsing.functions[0]
      };

      const generatedFunction = generator.generateJavaScriptFunction(functionComponent, {
        targetLanguage: 'javascript',
        styleGuide: 'airbnb'
      });

      expect(generatedFunction).toContain('function validateEmail(email)');
      expect(generatedFunction).toContain('export ');
    });

    it('should use arrow functions when preferred', () => {
      const functionComponent = {
        type: 'function',
        name: 'validateEmail',
        data: mockAnalysisResult.parsing.functions[0]
      };

      // Mock style rules to prefer arrow functions
      generator.styleRules.set('airbnb', {
        javascript: {
          preferences: { arrowFunctions: true }
        }
      });

      const generatedFunction = generator.generateJavaScriptFunction(functionComponent, {
        targetLanguage: 'javascript',
        styleGuide: 'airbnb'
      });

      expect(generatedFunction).toContain('const validateEmail = (email) =>');
    });
  });

  describe('style guide application', () => {
    it('should apply Airbnb style guide', () => {
      const components = ['let x = "test";'];
      
      const styledComponents = generator.applyStyleGuide(components, {
        styleGuide: 'airbnb',
        targetLanguage: 'javascript'
      });

      // Should apply single quotes preference
      expect(styledComponents[0]).toContain("'test'");
    });

    it('should apply indentation correctly', () => {
      const code = `class Test {
method() {
return true;
}
}`;

      const indentedCode = generator.applyIndentation(code, 2);
      
      expect(indentedCode).toContain('  method() {');
      expect(indentedCode).toContain('    return true;');
    });

    it('should apply quote style', () => {
      const code = 'const message = "hello world";';
      
      const singleQuoted = generator.applyQuoteStyle(code, 'single');
      expect(singleQuoted).toContain("'hello world'");
      
      const doubleQuoted = generator.applyQuoteStyle(code.replace('"', "'"), 'double');
      expect(doubleQuoted).toContain('"hello world"');
    });

    it('should apply semicolon rules', () => {
      const code = 'const x = 5\nconst y = 10';
      
      const withSemicolons = generator.applySemicolonRules(code, true);
      expect(withSemicolons).toContain('const x = 5;');
      
      const withoutSemicolons = generator.applySemicolonRules('const x = 5;', false);
      expect(withoutSemicolons).toContain('const x = 5');
    });
  });

  describe('optimizations', () => {
    it('should apply performance optimizations', () => {
      const components = ['let x = 5; console.log(x);']; // x is never reassigned
      
      const optimizedComponents = generator.applyOptimizations(components, {
        optimizationLevel: 'moderate'
      });

      expect(optimizedComponents[0]).toContain('const x = 5;');
    });

    it('should not apply aggressive optimizations in moderate mode', () => {
      const components = ['new Map();'];
      
      const optimizedComponents = generator.applyOptimizations(components, {
        optimizationLevel: 'moderate'
      });

      // Should not suggest WeakMap in moderate mode
      expect(optimizedComponents[0]).toBe('new Map();');
    });
  });

  describe('helper methods', () => {
    it('should format names according to conventions', () => {
      expect(generator.formatName('user_manager', 'class', { styleGuide: 'airbnb', targetLanguage: 'javascript' }))
        .toBe('UserManager');
      
      expect(generator.formatName('get_user_data', 'function', { styleGuide: 'airbnb', targetLanguage: 'javascript' }))
        .toBe('getUserData');
      
      expect(generator.formatName('maxRetries', 'constant', { styleGuide: 'airbnb', targetLanguage: 'javascript' }))
        .toBe('MAX_RETRIES');
    });

    it('should convert to PascalCase', () => {
      expect(generator.toPascalCase('user_manager')).toBe('UserManager');
      expect(generator.toPascalCase('api_client')).toBe('ApiClient');
    });

    it('should convert to camelCase', () => {
      expect(generator.toCamelCase('user_manager')).toBe('userManager');
      expect(generator.toCamelCase('api_client')).toBe('apiClient');
    });

    it('should convert to UPPER_SNAKE_CASE', () => {
      expect(generator.toUpperSnakeCase('maxRetries')).toBe('MAX_RETRIES');
      expect(generator.toUpperSnakeCase('apiEndpoint')).toBe('API_ENDPOINT');
    });

    it('should fill templates correctly', () => {
      const template = 'Hello {{name}}, you are {{age}} years old';
      const variables = { name: 'John', age: '30' };
      
      const result = generator.fillTemplate(template, variables);
      expect(result).toBe('Hello John, you are 30 years old');
    });

    it('should handle missing template variables', () => {
      const template = 'Hello {{name}}, you are {{age}} years old';
      const variables = { name: 'John' };
      
      const result = generator.fillTemplate(template, variables);
      expect(result).toBe('Hello John, you are  years old');
    });
  });

  describe('documentation generation', () => {
    it('should generate JSDoc for functions', () => {
      const functionData = {
        name: 'calculateTotal',
        description: 'Calculates the total amount',
        parameters: [
          { name: 'items', type: 'Array', description: 'List of items' },
          { name: 'tax', type: 'number', description: 'Tax rate' }
        ],
        returnType: 'number'
      };

      const jsdoc = generator.generateJSDoc(functionData, 'function');
      
      expect(jsdoc).toContain('/**');
      expect(jsdoc).toContain('Calculates the total amount');
      expect(jsdoc).toContain('@param {Array} items - List of items');
      expect(jsdoc).toContain('@param {number} tax - Tax rate');
      expect(jsdoc).toContain('@returns {number}');
      expect(jsdoc).toContain('*/');
    });

    it('should generate overview documentation', () => {
      const overview = generator.generateOverviewDocumentation(mockAnalysisResult);
      
      expect(overview.title).toContain('UserManager.js');
      expect(overview.originalFile).toBe('/src/legacy/UserManager.js');
      expect(overview.generationDate).toBeDefined();
      expect(overview.improvements).toHaveLength(4);
    });

    it('should generate business logic documentation', () => {
      const businessLogicDoc = generator.generateBusinessLogicDocumentation(mockAnalysisResult.businessLogic);
      
      expect(businessLogicDoc.summary).toContain('2 business logic components');
      expect(businessLogicDoc.components).toHaveLength(2);
      expect(businessLogicDoc.components[0].type).toBe('validation');
      expect(businessLogicDoc.components[1].type).toBe('data_access');
    });

    it('should handle empty business logic', () => {
      const businessLogicDoc = generator.generateBusinessLogicDocumentation([]);
      
      expect(businessLogicDoc.message).toContain('No business logic identified');
    });
  });

  describe('validation and suggestions', () => {
    it('should identify performance opportunities', () => {
      const codeWithNestedLoops = [
        'for (let i = 0; i < items.length; i++) { for (let j = 0; j < items.length; j++) { /* code */ } }'
      ];
      
      const opportunities = generator.identifyPerformanceOpportunities(codeWithNestedLoops);
      
      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities[0].type).toBe('performance');
      expect(opportunities[0].description).toContain('Nested loops detected');
    });

    it('should identify architectural improvements', () => {
      const largeFileResult = {
        ...mockAnalysisResult,
        codeMetrics: { linesOfCode: 600 }
      };
      
      const suggestions = generator.identifyArchitecturalImprovements(largeFileResult);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('architecture');
      expect(suggestions[0].description).toContain('Large file detected');
    });

    it('should check for syntax issues', () => {
      const codeWithVar = 'var x = 5;';
      
      const warnings = generator.checkSyntax(codeWithVar);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].type).toBe('syntax');
      expect(warnings[0].message).toContain('Use of var detected');
    });

    it('should check for security issues', () => {
      const codeWithEval = 'eval("console.log(\'hello\')");';
      
      const warnings = generator.checkSecurityIssues(codeWithEval);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].type).toBe('security');
      expect(warnings[0].severity).toBe('high');
      expect(warnings[0].message).toContain('Use of eval()');
    });
  });

  describe('metrics calculation', () => {
    it('should calculate generation metrics', () => {
      const optimizedCode = ['const x = 5;\nclass Test {}\nexport default Test;'];
      
      const metrics = generator.calculateGenerationMetrics(mockAnalysisResult, optimizedCode);
      
      expect(metrics.originalLinesOfCode).toBe(450);
      expect(metrics.generatedLinesOfCode).toBeGreaterThan(0);
      expect(metrics.complexityReduction).toBeDefined();
      expect(metrics.modernPatternsIntroduced).toBeGreaterThan(0);
      expect(metrics.estimatedPerformanceImprovement).toBeDefined();
    });

    it('should count modern patterns', () => {
      const modernCode = ['const x = 5; let y = 10; class Test {} export default Test;'];
      
      const count = generator.countModernPatterns(modernCode);
      
      expect(count).toBeGreaterThan(0);
    });

    it('should calculate complexity reduction', () => {
      const originalMetrics = { cyclomaticComplexity: 15 };
      const optimizedCode = ['simplified code'];
      
      const reduction = generator.calculateComplexityReduction(originalMetrics, optimizedCode);
      
      expect(reduction.original).toBe(15);
      expect(reduction.estimated).toBeLessThan(15);
      expect(reduction.reduction).toContain('%');
    });
  });

  describe('edge cases', () => {
    it('should handle empty analysis result', () => {
      const emptyResult = {
        success: true,
        filePath: '/empty.js',
        parsing: {}
      };

      const result = generator.generateModernCode(emptyResult);
      
      expect(result.success).toBe(true);
      expect(result.generatedCode).toHaveLength(0);
    });

    it('should handle missing component generator', () => {
      const unknownComponent = {
        type: 'unknown_type',
        name: 'test',
        data: {}
      };

      expect(() => {
        generator.generateComponent(unknownComponent, { targetLanguage: 'javascript' });
      }).toThrow('No generator found for component type: unknown_type');
    });

    it('should handle unsupported style guide', () => {
      const components = ['const x = 5;'];
      
      const result = generator.applyStyleGuide(components, {
        styleGuide: 'unsupported',
        targetLanguage: 'javascript'
      });
      
      expect(result).toEqual(components); // Should return unchanged
    });
  });
});