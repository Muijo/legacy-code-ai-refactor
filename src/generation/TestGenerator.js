/**
 * Test Generation System
 * 
 * Creates comprehensive test generation for functional equivalence validation,
 * implements edge case test generation based on legacy code analysis, and
 * builds integration test creation for refactored components.
 */

export class TestGenerator {
  constructor(options = {}) {
    this.options = {
      testFramework: options.testFramework || 'vitest', // vitest, jest, mocha
      testStyle: options.testStyle || 'describe', // describe, tape, ava
      coverageTarget: options.coverageTarget || 80,
      generateEdgeCases: options.generateEdgeCases !== false,
      generateIntegrationTests: options.generateIntegrationTests !== false,
      mockingStrategy: options.mockingStrategy || 'automatic', // automatic, manual, none
      ...options
    };

    this.testTemplates = new Map();
    this.mockTemplates = new Map();
    this.assertionLibraries = new Map();
    
    this.initializeTestTemplates();
    this.initializeMockTemplates();
    this.initializeAssertionLibraries();
  }

  /**
   * Initialize test framework templates
   */
  initializeTestTemplates() {
    // Vitest/Jest templates
    this.testTemplates.set('vitest', {
      suite: `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
{{imports}}

describe('{{suiteName}}', () => {
{{setup}}
{{tests}}
});`,
      
      test: `  it('{{testDescription}}', {{async}}() => {
{{arrange}}
{{act}}
{{assert}}
  });`,
      
      setup: `  let {{instanceName}};
  
  beforeEach(() => {
{{setupCode}}
  });
  
  afterEach(() => {
{{cleanupCode}}
  });`,
      
      mock: `  const {{mockName}} = vi.fn({{mockImplementation}});`,
      
      spy: `  const {{spyName}} = vi.spyOn({{target}}, '{{method}}');`
    });

    // Jest templates (similar to vitest but with different imports)
    this.testTemplates.set('jest', {
      suite: `{{imports}}

describe('{{suiteName}}', () => {
{{setup}}
{{tests}}
});`,
      
      test: `  test('{{testDescription}}', {{async}}() => {
{{arrange}}
{{act}}
{{assert}}
  });`,
      
      setup: `  let {{instanceName}};
  
  beforeEach(() => {
{{setupCode}}
  });
  
  afterEach(() => {
{{cleanupCode}}
  });`,
      
      mock: `  const {{mockName}} = jest.fn({{mockImplementation}});`,
      
      spy: `  const {{spyName}} = jest.spyOn({{target}}, '{{method}});`
    });

    // Mocha templates
    this.testTemplates.set('mocha', {
      suite: `{{imports}}

describe('{{suiteName}}', function() {
{{setup}}
{{tests}}
});`,
      
      test: `  it('{{testDescription}}', {{async}}function() {
{{arrange}}
{{act}}
{{assert}}
  });`,
      
      setup: `  let {{instanceName}};
  
  beforeEach(function() {
{{setupCode}}
  });
  
  afterEach(function() {
{{cleanupCode}}
  });`
    });
  }

  /**
   * Initialize mock templates
   */
  initializeMockTemplates() {
    this.mockTemplates.set('database', {
      template: `const {{mockName}} = {
  find: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  save: vi.fn()
};`,
      methods: ['find', 'findOne', 'create', 'update', 'delete', 'save']
    });

    this.mockTemplates.set('http_client', {
      template: `const {{mockName}} = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn()
};`,
      methods: ['get', 'post', 'put', 'delete', 'patch']
    });

    this.mockTemplates.set('file_system', {
      template: `const {{mockName}} = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn()
};`,
      methods: ['readFile', 'writeFile', 'exists', 'mkdir', 'unlink']
    });

    this.mockTemplates.set('logger', {
      template: `const {{mockName}} = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};`,
      methods: ['info', 'warn', 'error', 'debug']
    });
  }

  /**
   * Initialize assertion libraries
   */
  initializeAssertionLibraries() {
    this.assertionLibraries.set('vitest', {
      equal: 'expect({{actual}}).toBe({{expected}});',
      deepEqual: 'expect({{actual}}).toEqual({{expected}});',
      truthy: 'expect({{actual}}).toBeTruthy();',
      falsy: 'expect({{actual}}).toBeFalsy();',
      null: 'expect({{actual}}).toBeNull();',
      undefined: 'expect({{actual}}).toBeUndefined();',
      defined: 'expect({{actual}}).toBeDefined();',
      throws: 'expect(() => {{code}}).toThrow({{error}});',
      called: 'expect({{mock}}).toHaveBeenCalled();',
      calledWith: 'expect({{mock}}).toHaveBeenCalledWith({{args}});',
      calledTimes: 'expect({{mock}}).toHaveBeenCalledTimes({{times}});',
      resolves: 'await expect({{promise}}).resolves.toBe({{expected}});',
      rejects: 'await expect({{promise}}).rejects.toThrow({{error}});'
    });

    this.assertionLibraries.set('chai', {
      equal: 'expect({{actual}}).to.equal({{expected}});',
      deepEqual: 'expect({{actual}}).to.deep.equal({{expected}});',
      truthy: 'expect({{actual}}).to.be.true;',
      falsy: 'expect({{actual}}).to.be.false;',
      null: 'expect({{actual}}).to.be.null;',
      undefined: 'expect({{actual}}).to.be.undefined;',
      defined: 'expect({{actual}}).to.not.be.undefined;',
      throws: 'expect(() => {{code}}).to.throw({{error}});'
    });
  }

  /**
   * Generate comprehensive test suite for refactored code
   * @param {Object} originalAnalysis - Original legacy code analysis
   * @param {Object} modernCode - Generated modern code
   * @param {Object} options - Test generation options
   * @returns {Object} Generated test suite
   */
  generateTestSuite(originalAnalysis, modernCode, options = {}) {
    const testOptions = { ...this.options, ...options };
    
    if (!originalAnalysis.success) {
      throw new Error('Cannot generate tests from failed analysis');
    }

    // Extract testable components
    const testableComponents = this.extractTestableComponents(originalAnalysis, modernCode);
    
    // Generate unit tests
    const unitTests = this.generateUnitTests(testableComponents, testOptions);
    
    // Generate integration tests
    const integrationTests = testOptions.generateIntegrationTests ? 
      this.generateIntegrationTests(testableComponents, originalAnalysis, testOptions) : [];
    
    // Generate edge case tests
    const edgeCaseTests = testOptions.generateEdgeCases ? 
      this.generateEdgeCaseTests(testableComponents, originalAnalysis, testOptions) : [];
    
    // Generate functional equivalence tests
    const equivalenceTests = this.generateFunctionalEquivalenceTests(
      originalAnalysis, modernCode, testOptions
    );

    // Generate mocks and fixtures
    const mocks = this.generateMocks(testableComponents, testOptions);
    const fixtures = this.generateTestFixtures(testableComponents, originalAnalysis);

    return {
      success: true,
      framework: testOptions.testFramework,
      testFiles: [
        ...unitTests,
        ...integrationTests,
        ...edgeCaseTests,
        ...equivalenceTests
      ],
      mocks,
      fixtures,
      metadata: {
        totalTests: this.countTotalTests([...unitTests, ...integrationTests, ...edgeCaseTests, ...equivalenceTests]),
        coverageEstimate: this.estimateCoverage(testableComponents, unitTests),
        testTypes: {
          unit: unitTests.length,
          integration: integrationTests.length,
          edgeCase: edgeCaseTests.length,
          equivalence: equivalenceTests.length
        }
      },
      runInstructions: this.generateRunInstructions(testOptions),
      recommendations: this.generateTestRecommendations(testableComponents, originalAnalysis)
    };
  }

  /**
   * Extract testable components from analysis and modern code
   */
  extractTestableComponents(originalAnalysis, modernCode) {
    const components = [];

    // Extract classes
    if (originalAnalysis.parsing?.classes) {
      for (const classInfo of originalAnalysis.parsing.classes) {
        components.push({
          type: 'class',
          name: classInfo.name,
          originalData: classInfo,
          modernCode: this.findModernCodeForComponent(classInfo.name, modernCode),
          methods: classInfo.methods || [],
          dependencies: this.extractDependencies(classInfo),
          businessLogic: this.getBusinessLogicForComponent(classInfo.name, originalAnalysis.businessLogic)
        });
      }
    }

    // Extract functions
    if (originalAnalysis.parsing?.functions) {
      for (const functionInfo of originalAnalysis.parsing.functions) {
        components.push({
          type: 'function',
          name: functionInfo.name,
          originalData: functionInfo,
          modernCode: this.findModernCodeForComponent(functionInfo.name, modernCode),
          parameters: functionInfo.parameters || [],
          returnType: functionInfo.returnType,
          dependencies: this.extractDependencies(functionInfo),
          businessLogic: this.getBusinessLogicForComponent(functionInfo.name, originalAnalysis.businessLogic)
        });
      }
    }

    return components;
  }

  /**
   * Generate unit tests for components
   */
  generateUnitTests(testableComponents, options) {
    const unitTestFiles = [];

    for (const component of testableComponents) {
      const testFile = this.generateUnitTestFile(component, options);
      unitTestFiles.push(testFile);
    }

    return unitTestFiles;
  }

  /**
   * Generate unit test file for a single component
   */
  generateUnitTestFile(component, options) {
    const template = this.testTemplates.get(options.testFramework);
    const assertions = this.assertionLibraries.get(options.testFramework) || this.assertionLibraries.get('vitest');

    // Generate imports
    const imports = this.generateTestImports(component, options);
    
    // Generate setup code
    const setup = this.generateTestSetup(component, options);
    
    // Generate individual tests
    const tests = this.generateComponentTests(component, options, assertions);

    const testContent = this.fillTemplate(template.suite, {
      imports,
      suiteName: component.name,
      setup,
      tests: tests.join('\n\n')
    });

    return {
      fileName: `${component.name}.test.js`,
      filePath: `test/unit/${component.name}.test.js`,
      content: testContent,
      type: 'unit',
      component: component.name,
      testCount: tests.length
    };
  }

  /**
   * Generate tests for a specific component
   */
  generateComponentTests(component, options, assertions) {
    const tests = [];

    if (component.type === 'class') {
      // Constructor tests
      tests.push(...this.generateConstructorTests(component, options, assertions));
      
      // Method tests
      for (const method of component.methods) {
        tests.push(...this.generateMethodTests(component, method, options, assertions));
      }
    } else if (component.type === 'function') {
      // Function tests
      tests.push(...this.generateFunctionTests(component, options, assertions));
    }

    return tests;
  }

  /**
   * Generate constructor tests
   */
  generateConstructorTests(component, options, assertions) {
    const tests = [];
    const template = this.testTemplates.get(options.testFramework);

    // Basic constructor test
    tests.push(this.fillTemplate(template.test, {
      testDescription: `should create ${component.name} instance`,
      async: '',
      arrange: `    // Arrange\n    const mockDependencies = {};`,
      act: `    // Act\n    const instance = new ${component.name}(mockDependencies);`,
      assert: `    // Assert\n    ${this.fillTemplate(assertions.defined, { actual: 'instance' })}\n    ${this.fillTemplate(assertions.equal, { actual: 'instance.constructor.name', expected: `'${component.name}'` })}`
    }));

    // Constructor with parameters test
    if (component.originalData.constructor?.parameters?.length > 0) {
      tests.push(this.fillTemplate(template.test, {
        testDescription: `should initialize ${component.name} with provided parameters`,
        async: '',
        arrange: `    // Arrange\n    const testParams = ${this.generateTestParameters(component.originalData.constructor.parameters)};`,
        act: `    // Act\n    const instance = new ${component.name}(...Object.values(testParams));`,
        assert: `    // Assert\n    ${this.fillTemplate(assertions.defined, { actual: 'instance' })}`
      }));
    }

    return tests;
  }

  /**
   * Generate method tests
   */
  generateMethodTests(component, method, options, assertions) {
    const tests = [];
    const template = this.testTemplates.get(options.testFramework);

    // Basic method test
    const isAsync = method.async ? 'async ' : '';
    const awaitKeyword = method.async ? 'await ' : '';

    tests.push(this.fillTemplate(template.test, {
      testDescription: `should ${method.name} successfully`,
      async: isAsync,
      arrange: `    // Arrange\n    const instance = new ${component.name}();\n    ${this.generateMethodArrangeCode(method)}`,
      act: `    // Act\n    const result = ${awaitKeyword}instance.${method.name}(${this.generateMethodCallParameters(method)});`,
      assert: `    // Assert\n    ${this.generateMethodAssertions(method, assertions)}`
    }));

    // Error handling test
    if (method.canThrow !== false) {
      tests.push(this.fillTemplate(template.test, {
        testDescription: `should handle ${method.name} errors`,
        async: isAsync,
        arrange: `    // Arrange\n    const instance = new ${component.name}();\n    const invalidInput = ${this.generateInvalidInput(method)};`,
        act: `    // Act & Assert\n    ${awaitKeyword}${this.fillTemplate(method.async ? assertions.rejects : assertions.throws, { 
          promise: method.async ? `instance.${method.name}(invalidInput)` : '',
          code: method.async ? '' : `instance.${method.name}(invalidInput)`,
          error: 'Error'
        })}`,
        assert: ''
      }));
    }

    return tests;
  }

  /**
   * Generate function tests
   */
  generateFunctionTests(component, options, assertions) {
    const tests = [];
    const template = this.testTemplates.get(options.testFramework);

    // Basic function test
    const isAsync = component.originalData.async ? 'async ' : '';
    const awaitKeyword = component.originalData.async ? 'await ' : '';

    tests.push(this.fillTemplate(template.test, {
      testDescription: `should ${component.name} with valid input`,
      async: isAsync,
      arrange: `    // Arrange\n    ${this.generateFunctionArrangeCode(component)}`,
      act: `    // Act\n    const result = ${awaitKeyword}${component.name}(${this.generateFunctionCallParameters(component)});`,
      assert: `    // Assert\n    ${this.generateFunctionAssertions(component, assertions)}`
    }));

    // Edge case tests
    tests.push(...this.generateFunctionEdgeCaseTests(component, options, assertions));

    return tests;
  }

  /**
   * Generate integration tests
   */
  generateIntegrationTests(testableComponents, originalAnalysis, options) {
    const integrationTests = [];

    // Find components that interact with each other
    const interactions = this.findComponentInteractions(testableComponents, originalAnalysis);

    for (const interaction of interactions) {
      const testFile = this.generateIntegrationTestFile(interaction, options);
      integrationTests.push(testFile);
    }

    return integrationTests;
  }

  /**
   * Generate edge case tests
   */
  generateEdgeCaseTests(testableComponents, originalAnalysis, options) {
    const edgeCaseTests = [];

    for (const component of testableComponents) {
      const edgeCases = this.identifyEdgeCases(component, originalAnalysis);
      
      if (edgeCases.length > 0) {
        const testFile = this.generateEdgeCaseTestFile(component, edgeCases, options);
        edgeCaseTests.push(testFile);
      }
    }

    return edgeCaseTests;
  }

  /**
   * Generate functional equivalence tests
   */
  generateFunctionalEquivalenceTests(originalAnalysis, modernCode, options) {
    const equivalenceTests = [];

    // Generate tests that compare original behavior with modern implementation
    const testFile = this.generateEquivalenceTestFile(originalAnalysis, modernCode, options);
    equivalenceTests.push(testFile);

    return equivalenceTests;
  }

  /**
   * Generate mocks for dependencies
   */
  generateMocks(testableComponents, options) {
    const mocks = new Map();

    for (const component of testableComponents) {
      const componentMocks = this.generateComponentMocks(component, options);
      mocks.set(component.name, componentMocks);
    }

    return Object.fromEntries(mocks);
  }

  /**
   * Generate component-specific mocks
   */
  generateComponentMocks(component, options) {
    const mocks = [];

    for (const dependency of component.dependencies) {
      const mockType = this.identifyMockType(dependency);
      const mockTemplate = this.mockTemplates.get(mockType);

      if (mockTemplate) {
        const mockCode = this.fillTemplate(mockTemplate.template, {
          mockName: `mock${this.capitalize(dependency.name)}`
        });

        mocks.push({
          name: dependency.name,
          type: mockType,
          code: mockCode,
          methods: mockTemplate.methods
        });
      }
    }

    return mocks;
  }

  /**
   * Generate test fixtures
   */
  generateTestFixtures(testableComponents, originalAnalysis) {
    const fixtures = {};

    // Generate sample data based on business logic
    for (const component of testableComponents) {
      if (component.businessLogic && component.businessLogic.length > 0) {
        fixtures[component.name] = this.generateComponentFixtures(component);
      }
    }

    return fixtures;
  }

  /**
   * Generate component-specific fixtures
   */
  generateComponentFixtures(component) {
    const fixtures = {
      validInputs: [],
      invalidInputs: [],
      expectedOutputs: [],
      edgeCases: []
    };

    // Generate based on business logic
    for (const logic of component.businessLogic) {
      if (logic.type === 'validation') {
        fixtures.validInputs.push(this.generateValidationFixtures(logic, true));
        fixtures.invalidInputs.push(this.generateValidationFixtures(logic, false));
      } else if (logic.type === 'calculation') {
        fixtures.validInputs.push(this.generateCalculationFixtures(logic));
        fixtures.expectedOutputs.push(this.generateExpectedCalculationResults(logic));
      }
    }

    return fixtures;
  }

  /**
   * Helper methods
   */
  fillTemplate(template, variables) {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, value || '');
    }

    return result;
  }

  findModernCodeForComponent(componentName, modernCode) {
    // Find the modern code that corresponds to this component
    if (modernCode.generatedCode) {
      return modernCode.generatedCode.find(code => 
        code.includes(`class ${componentName}`) || 
        code.includes(`function ${componentName}`) ||
        code.includes(`const ${componentName}`)
      );
    }
    return null;
  }

  extractDependencies(componentData) {
    const dependencies = [];
    
    // Extract from imports/requires
    if (componentData.imports) {
      dependencies.push(...componentData.imports.map(imp => ({
        name: imp.name || imp.source,
        type: 'import',
        source: imp.source
      })));
    }

    // Extract from method calls or property access
    if (componentData.externalCalls) {
      dependencies.push(...componentData.externalCalls.map(call => ({
        name: call.target,
        type: 'external_call',
        method: call.method
      })));
    }

    return dependencies;
  }

  getBusinessLogicForComponent(componentName, businessLogic) {
    if (!businessLogic) return [];
    
    return businessLogic.filter(logic => 
      logic.location && logic.location.includes(componentName)
    );
  }

  generateTestImports(component, options) {
    const framework = options.testFramework;
    let imports = '';

    if (framework === 'vitest') {
      imports += `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';\n`;
    } else if (framework === 'jest') {
      imports += `// Jest globals are available\n`;
    }

    imports += `import { ${component.name} } from '../src/${component.name}.js';\n`;

    // Add mock imports
    for (const dependency of component.dependencies) {
      imports += `import { ${dependency.name} } from '../src/${dependency.source || dependency.name}.js';\n`;
    }

    return imports;
  }

  generateTestSetup(component, options) {
    const template = this.testTemplates.get(options.testFramework);
    
    return this.fillTemplate(template.setup, {
      instanceName: component.name.toLowerCase(),
      setupCode: `    ${component.name.toLowerCase()} = new ${component.name}();`,
      cleanupCode: `    // Cleanup if needed`
    });
  }

  generateTestParameters(parameters) {
    const testParams = {};
    
    for (const param of parameters) {
      testParams[param.name] = this.generateTestValue(param.type);
    }

    return JSON.stringify(testParams, null, 2);
  }

  generateTestValue(type) {
    const testValues = {
      'string': '"test string"',
      'number': '42',
      'boolean': 'true',
      'object': '{}',
      'array': '[]',
      'function': '() => {}',
      'date': 'new Date()',
      'undefined': 'undefined',
      'null': 'null'
    };

    return testValues[type] || '"test value"';
  }

  generateMethodArrangeCode(method) {
    let arrangeCode = '';
    
    if (method.parameters && method.parameters.length > 0) {
      arrangeCode += `const testParams = ${this.generateTestParameters(method.parameters)};`;
    }

    return arrangeCode;
  }

  generateMethodCallParameters(method) {
    if (!method.parameters || method.parameters.length === 0) {
      return '';
    }

    return method.parameters.map(param => `testParams.${param.name}`).join(', ');
  }

  generateMethodAssertions(method, assertions) {
    let assertionCode = '';

    if (method.returnType && method.returnType !== 'void') {
      assertionCode += this.fillTemplate(assertions.defined, { actual: 'result' });
    } else {
      assertionCode += this.fillTemplate(assertions.undefined, { actual: 'result' });
    }

    return assertionCode;
  }

  generateInvalidInput(method) {
    if (method.parameters && method.parameters.length > 0) {
      const firstParam = method.parameters[0];
      
      switch (firstParam.type) {
        case 'string':
          return 'null';
        case 'number':
          return '"not a number"';
        case 'object':
          return 'null';
        case 'array':
          return '"not an array"';
        default:
          return 'undefined';
      }
    }
    
    return 'null';
  }

  generateFunctionArrangeCode(component) {
    let arrangeCode = '';
    
    if (component.parameters && component.parameters.length > 0) {
      arrangeCode += `const testParams = ${this.generateTestParameters(component.parameters)};`;
    }

    return arrangeCode;
  }

  generateFunctionCallParameters(component) {
    if (!component.parameters || component.parameters.length === 0) {
      return '';
    }

    return component.parameters.map(param => `testParams.${param.name}`).join(', ');
  }

  generateFunctionAssertions(component, assertions) {
    let assertionCode = '';

    if (component.returnType && component.returnType !== 'void') {
      assertionCode += this.fillTemplate(assertions.defined, { actual: 'result' });
    }

    return assertionCode;
  }

  generateFunctionEdgeCaseTests(component, options, assertions) {
    const tests = [];
    const template = this.testTemplates.get(options.testFramework);

    // Null/undefined parameter tests
    if (component.parameters && component.parameters.length > 0) {
      tests.push(this.fillTemplate(template.test, {
        testDescription: `should handle null parameters in ${component.name}`,
        async: component.originalData.async ? 'async ' : '',
        arrange: '    // Arrange\n    const nullParam = null;',
        act: '    // Act & Assert',
        assert: `    ${this.fillTemplate(assertions.throws, { code: `${component.name}(nullParam)`, error: 'Error' })}`
      }));
    }

    return tests;
  }

  findComponentInteractions(testableComponents, originalAnalysis) {
    const interactions = [];

    // Find components that depend on each other
    for (const component of testableComponents) {
      for (const dependency of component.dependencies) {
        const dependentComponent = testableComponents.find(c => c.name === dependency.name);
        
        if (dependentComponent) {
          interactions.push({
            primary: component,
            dependency: dependentComponent,
            interactionType: dependency.type
          });
        }
      }
    }

    return interactions;
  }

  generateIntegrationTestFile(interaction, options) {
    const template = this.testTemplates.get(options.testFramework);
    
    const testContent = this.fillTemplate(template.suite, {
      imports: this.generateIntegrationTestImports(interaction),
      suiteName: `${interaction.primary.name} Integration`,
      setup: this.generateIntegrationTestSetup(interaction, options),
      tests: this.generateIntegrationTests(interaction, options).join('\n\n')
    });

    return {
      fileName: `${interaction.primary.name}.integration.test.js`,
      filePath: `test/integration/${interaction.primary.name}.integration.test.js`,
      content: testContent,
      type: 'integration',
      components: [interaction.primary.name, interaction.dependency.name],
      testCount: 3 // Estimated
    };
  }

  generateIntegrationTestImports(interaction) {
    return `import { describe, it, expect, beforeEach } from 'vitest';
import { ${interaction.primary.name} } from '../src/${interaction.primary.name}.js';
import { ${interaction.dependency.name} } from '../src/${interaction.dependency.name}.js';`;
  }

  generateIntegrationTestSetup(interaction, options) {
    const template = this.testTemplates.get(options.testFramework);
    
    return this.fillTemplate(template.setup, {
      instanceName: 'system',
      setupCode: `    // Setup integrated system
    const dependency = new ${interaction.dependency.name}();
    system = new ${interaction.primary.name}(dependency);`,
      cleanupCode: '    // Cleanup integrated system'
    });
  }

  generateIntegrationTests(interaction, options) {
    const template = this.testTemplates.get(options.testFramework);
    const assertions = this.assertionLibraries.get(options.testFramework) || this.assertionLibraries.get('vitest');

    return [
      this.fillTemplate(template.test, {
        testDescription: `should integrate ${interaction.primary.name} with ${interaction.dependency.name}`,
        async: '',
        arrange: '    // Arrange - system is set up in beforeEach',
        act: '    // Act\n    const result = system.performIntegratedOperation();',
        assert: `    // Assert\n    ${this.fillTemplate(assertions.defined, { actual: 'result' })}`
      })
    ];
  }

  identifyEdgeCases(component, originalAnalysis) {
    const edgeCases = [];

    // Identify based on business logic
    for (const logic of component.businessLogic) {
      if (logic.type === 'validation') {
        edgeCases.push({
          type: 'boundary_value',
          description: `Test boundary values for ${logic.description}`,
          testData: this.generateBoundaryTestData(logic)
        });
      }
      
      if (logic.type === 'calculation') {
        edgeCases.push({
          type: 'calculation_edge',
          description: `Test edge cases for ${logic.description}`,
          testData: this.generateCalculationEdgeCases(logic)
        });
      }
    }

    // Identify based on parameters
    if (component.type === 'function' && component.parameters) {
      for (const param of component.parameters) {
        edgeCases.push({
          type: 'parameter_edge',
          description: `Test edge cases for parameter ${param.name}`,
          testData: this.generateParameterEdgeCases(param)
        });
      }
    }

    return edgeCases;
  }

  generateEdgeCaseTestFile(component, edgeCases, options) {
    const template = this.testTemplates.get(options.testFramework);
    
    const tests = edgeCases.map(edgeCase => 
      this.generateEdgeCaseTest(component, edgeCase, options)
    );

    const testContent = this.fillTemplate(template.suite, {
      imports: this.generateTestImports(component, options),
      suiteName: `${component.name} Edge Cases`,
      setup: this.generateTestSetup(component, options),
      tests: tests.join('\n\n')
    });

    return {
      fileName: `${component.name}.edge.test.js`,
      filePath: `test/edge/${component.name}.edge.test.js`,
      content: testContent,
      type: 'edge_case',
      component: component.name,
      testCount: edgeCases.length
    };
  }

  generateEdgeCaseTest(component, edgeCase, options) {
    const template = this.testTemplates.get(options.testFramework);
    const assertions = this.assertionLibraries.get(options.testFramework) || this.assertionLibraries.get('vitest');

    return this.fillTemplate(template.test, {
      testDescription: edgeCase.description,
      async: component.originalData.async ? 'async ' : '',
      arrange: `    // Arrange\n    const edgeCaseData = ${JSON.stringify(edgeCase.testData)};`,
      act: `    // Act\n    const result = ${component.originalData.async ? 'await ' : ''}${component.name}(edgeCaseData);`,
      assert: `    // Assert\n    ${this.fillTemplate(assertions.defined, { actual: 'result' })}`
    });
  }

  generateEquivalenceTestFile(originalAnalysis, modernCode, options) {
    const template = this.testTemplates.get(options.testFramework);
    
    const testContent = this.fillTemplate(template.suite, {
      imports: this.generateEquivalenceTestImports(originalAnalysis, modernCode),
      suiteName: 'Functional Equivalence Tests',
      setup: this.generateEquivalenceTestSetup(options),
      tests: this.generateEquivalenceTests(originalAnalysis, modernCode, options).join('\n\n')
    });

    return {
      fileName: 'functional-equivalence.test.js',
      filePath: 'test/equivalence/functional-equivalence.test.js',
      content: testContent,
      type: 'equivalence',
      component: 'all',
      testCount: 5 // Estimated
    };
  }

  generateEquivalenceTestImports(originalAnalysis, modernCode) {
    return `import { describe, it, expect } from 'vitest';
// Import both original and modern implementations for comparison
// Note: This would require keeping original code for comparison`;
  }

  generateEquivalenceTestSetup(options) {
    return `  // Setup for equivalence testing
  // This would involve setting up both original and modern implementations`;
  }

  generateEquivalenceTests(originalAnalysis, modernCode, options) {
    const template = this.testTemplates.get(options.testFramework);
    const assertions = this.assertionLibraries.get(options.testFramework) || this.assertionLibraries.get('vitest');

    return [
      this.fillTemplate(template.test, {
        testDescription: 'should produce equivalent results for same inputs',
        async: 'async ',
        arrange: '    // Arrange\n    const testInputs = generateTestInputs();',
        act: '    // Act\n    const originalResults = await runOriginalImplementation(testInputs);\n    const modernResults = await runModernImplementation(testInputs);',
        assert: `    // Assert\n    ${this.fillTemplate(assertions.deepEqual, { actual: 'modernResults', expected: 'originalResults' })}`
      })
    ];
  }

  identifyMockType(dependency) {
    const name = dependency.name.toLowerCase();
    
    if (name.includes('database') || name.includes('db') || name.includes('repository')) {
      return 'database';
    } else if (name.includes('http') || name.includes('client') || name.includes('api')) {
      return 'http_client';
    } else if (name.includes('file') || name.includes('fs')) {
      return 'file_system';
    } else if (name.includes('log')) {
      return 'logger';
    }
    
    return 'generic';
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  countTotalTests(testFiles) {
    return testFiles.reduce((total, file) => total + file.testCount, 0);
  }

  estimateCoverage(testableComponents, unitTests) {
    // Simple coverage estimation based on components and tests
    const totalComponents = testableComponents.length;
    const testedComponents = unitTests.length;
    
    return Math.min(100, Math.round((testedComponents / totalComponents) * 100));
  }

  generateRunInstructions(options) {
    const framework = options.testFramework;
    
    const instructions = {
      framework,
      commands: {
        runAll: `npm run test`,
        runUnit: `npm run test test/unit`,
        runIntegration: `npm run test test/integration`,
        runWithCoverage: `npm run test -- --coverage`,
        watch: `npm run test -- --watch`
      },
      setup: [
        `Install ${framework}: npm install --save-dev ${framework}`,
        'Add test scripts to package.json',
        'Configure test environment if needed'
      ]
    };

    return instructions;
  }

  generateTestRecommendations(testableComponents, originalAnalysis) {
    const recommendations = [];

    // Coverage recommendations
    const complexComponents = testableComponents.filter(c => 
      c.originalData.cyclomaticComplexity > 10
    );
    
    if (complexComponents.length > 0) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        description: `Focus on testing ${complexComponents.length} complex components`,
        components: complexComponents.map(c => c.name)
      });
    }

    // Business logic recommendations
    const businessCriticalComponents = testableComponents.filter(c => 
      c.businessLogic.some(bl => bl.importance === 'high')
    );
    
    if (businessCriticalComponents.length > 0) {
      recommendations.push({
        type: 'business_logic',
        priority: 'critical',
        description: 'Ensure comprehensive testing of business-critical components',
        components: businessCriticalComponents.map(c => c.name)
      });
    }

    // Integration testing recommendations
    const highCouplingComponents = testableComponents.filter(c => 
      c.dependencies.length > 3
    );
    
    if (highCouplingComponents.length > 0) {
      recommendations.push({
        type: 'integration',
        priority: 'medium',
        description: 'Add integration tests for highly coupled components',
        components: highCouplingComponents.map(c => c.name)
      });
    }

    return recommendations;
  }

  // Helper methods for generating test data
  generateBoundaryTestData(logic) {
    return {
      minimum: 0,
      maximum: 100,
      justBelowMin: -1,
      justAboveMax: 101,
      empty: '',
      null: null,
      undefined: undefined
    };
  }

  generateCalculationEdgeCases(logic) {
    return {
      zero: 0,
      negative: -1,
      veryLarge: Number.MAX_SAFE_INTEGER,
      verySmall: Number.MIN_SAFE_INTEGER,
      infinity: Infinity,
      negativeInfinity: -Infinity,
      nan: NaN
    };
  }

  generateParameterEdgeCases(param) {
    const edgeCases = {};
    
    switch (param.type) {
      case 'string':
        edgeCases.empty = '';
        edgeCases.veryLong = 'a'.repeat(10000);
        edgeCases.specialChars = '!@#$%^&*()';
        edgeCases.unicode = '🚀🌟💻';
        break;
      case 'number':
        edgeCases.zero = 0;
        edgeCases.negative = -1;
        edgeCases.decimal = 3.14159;
        edgeCases.infinity = Infinity;
        edgeCases.nan = NaN;
        break;
      case 'array':
        edgeCases.empty = [];
        edgeCases.single = [1];
        edgeCases.large = Array(1000).fill(0);
        break;
      case 'object':
        edgeCases.empty = {};
        edgeCases.nested = { a: { b: { c: 1 } } };
        edgeCases.circular = (() => {
          const obj = {};
          obj.self = obj;
          return obj;
        })();
        break;
    }
    
    return edgeCases;
  }

  generateValidationFixtures(logic, isValid) {
    if (logic.description.includes('email')) {
      return isValid ? 
        { email: 'test@example.com' } : 
        { email: 'invalid-email' };
    } else if (logic.description.includes('phone')) {
      return isValid ? 
        { phone: '+1234567890' } : 
        { phone: 'not-a-phone' };
    }
    
    return isValid ? { value: 'valid' } : { value: 'invalid' };
  }

  generateCalculationFixtures(logic) {
    return {
      input1: 10,
      input2: 20,
      factor: 1.5
    };
  }

  generateExpectedCalculationResults(logic) {
    return {
      result: 45, // 10 + 20 + (10 + 20) * 0.5
      precision: 2
    };
  }
}