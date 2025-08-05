/**
 * Legacy Pattern Detector
 * Identifies anti-patterns, design patterns, and framework-specific patterns in legacy code
 */
export class LegacyPatternDetector {
  constructor(options = {}) {
    this.options = {
      enableAntiPatterns: options.enableAntiPatterns !== false,
      enableDesignPatterns: options.enableDesignPatterns !== false,
      enableFrameworkPatterns: options.enableFrameworkPatterns !== false,
      confidenceThreshold: options.confidenceThreshold || 0.7,
      ...options
    };

    this.antiPatternDetectors = new Map();
    this.designPatternDetectors = new Map();
    this.frameworkPatternDetectors = new Map();

    this.initializeDetectors();
  }

  initializeDetectors() {
    // Anti-pattern detectors
    this.antiPatternDetectors.set('god_object', this.detectGodObject.bind(this));
    this.antiPatternDetectors.set('magic_numbers', this.detectMagicNumbers.bind(this));
    this.antiPatternDetectors.set('long_method', this.detectLongMethod.bind(this));
    this.antiPatternDetectors.set('copy_paste_programming', this.detectCopyPasteProgramming.bind(this));
    this.antiPatternDetectors.set('spaghetti_code', this.detectSpaghettiCode.bind(this));
    this.antiPatternDetectors.set('dead_code', this.detectDeadCode.bind(this));
    this.antiPatternDetectors.set('feature_envy', this.detectFeatureEnvy.bind(this));

    // Design pattern detectors
    this.designPatternDetectors.set('singleton', this.detectSingleton.bind(this));
    this.designPatternDetectors.set('observer', this.detectObserver.bind(this));
    this.designPatternDetectors.set('factory', this.detectFactory.bind(this));
    this.designPatternDetectors.set('strategy', this.detectStrategy.bind(this));
    this.designPatternDetectors.set('decorator', this.detectDecorator.bind(this));

    // Framework-specific pattern detectors
    this.frameworkPatternDetectors.set('jquery_dom_manipulation', this.detectJQueryDOMManipulation.bind(this));
    this.frameworkPatternDetectors.set('jquery_ajax', this.detectJQueryAjax.bind(this));
    this.frameworkPatternDetectors.set('old_php_patterns', this.detectOldPHPPatterns.bind(this));
    this.frameworkPatternDetectors.set('legacy_javascript_patterns', this.detectLegacyJavaScriptPatterns.bind(this));
    this.frameworkPatternDetectors.set('deprecated_api_usage', this.detectDeprecatedAPIUsage.bind(this));
  }

  async detectPatterns(parseResult) {
    if (!parseResult.success || !parseResult.ast) {
      return {
        success: false,
        error: 'Invalid parse result provided',
        timestamp: Date.now()
      };
    }

    try {
      const detectionResults = {
        success: true,
        filePath: parseResult.filePath,
        language: parseResult.language,
        antiPatterns: [],
        designPatterns: [],
        frameworkPatterns: [],
        summary: {
          totalPatterns: 0,
          highSeverityCount: 0,
          mediumSeverityCount: 0,
          lowSeverityCount: 0
        },
        timestamp: Date.now()
      };

      if (this.options.enableAntiPatterns) {
        detectionResults.antiPatterns = await this.detectAntiPatterns(parseResult);
      }

      if (this.options.enableDesignPatterns) {
        detectionResults.designPatterns = await this.detectDesignPatterns(parseResult);
      }

      if (this.options.enableFrameworkPatterns) {
        detectionResults.frameworkPatterns = await this.detectFrameworkPatterns(parseResult);
      }

      this.generateSummary(detectionResults);
      return detectionResults;

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  async detectAntiPatterns(parseResult) {
    const antiPatterns = [];

    for (const [patternName, detector] of this.antiPatternDetectors) {
      try {
        const detection = await detector(parseResult);
        if (detection && detection.confidence >= this.options.confidenceThreshold) {
          antiPatterns.push({
            type: 'anti_pattern',
            name: patternName,
            ...detection
          });
        }
      } catch (error) {
        console.warn(`Anti-pattern detector ${patternName} failed:`, error.message);
      }
    }

    return antiPatterns;
  }

  async detectDesignPatterns(parseResult) {
    const designPatterns = [];

    for (const [patternName, detector] of this.designPatternDetectors) {
      try {
        const detection = await detector(parseResult);
        if (detection && detection.confidence >= this.options.confidenceThreshold) {
          designPatterns.push({
            type: 'design_pattern',
            name: patternName,
            ...detection
          });
        }
      } catch (error) {
        console.warn(`Design pattern detector ${patternName} failed:`, error.message);
      }
    }

    return designPatterns;
  }

  async detectFrameworkPatterns(parseResult) {
    const frameworkPatterns = [];

    for (const [patternName, detector] of this.frameworkPatternDetectors) {
      try {
        const detection = await detector(parseResult);
        if (detection && detection.confidence >= this.options.confidenceThreshold) {
          frameworkPatterns.push({
            type: 'framework_pattern',
            name: patternName,
            ...detection
          });
        }
      } catch (error) {
        console.warn(`Framework pattern detector ${patternName} failed:`, error.message);
      }
    }

    return frameworkPatterns;
  }

  generateSummary(detectionResults) {
    const allPatterns = [
      ...detectionResults.antiPatterns,
      ...detectionResults.designPatterns,
      ...detectionResults.frameworkPatterns
    ];

    detectionResults.summary.totalPatterns = allPatterns.length;
    
    for (const pattern of allPatterns) {
      switch (pattern.severity) {
        case 'high':
          detectionResults.summary.highSeverityCount++;
          break;
        case 'medium':
          detectionResults.summary.mediumSeverityCount++;
          break;
        case 'low':
          detectionResults.summary.lowSeverityCount++;
          break;
      }
    }
  }

  // Anti-pattern detectors
  async detectGodObject(parseResult) {
    const { ast, metadata } = parseResult;
    let methodCount = 0;
    let propertyCount = 0;
    let lineCount = metadata.linesOfCode || 0;

    if (parseResult.language === 'javascript') {
      this.traverseAST(ast, (node) => {
        if (node.type === 'ClassDeclaration' && node.body && node.body.body) {
          for (const member of node.body.body) {
            if (member.type === 'MethodDefinition') {
              methodCount++;
            } else if (member.type === 'PropertyDefinition') {
              propertyCount++;
            }
          }
        }
      });
    }

    const godObjectScore = this.calculateGodObjectScore(methodCount, propertyCount, lineCount);
    
    if (godObjectScore > 0.7) {
      return {
        confidence: godObjectScore,
        severity: godObjectScore > 0.9 ? 'high' : 'medium',
        description: 'Class or object has too many responsibilities',
        indicators: { methodCount, propertyCount, lineCount },
        locations: [],
        impact: 'High maintenance cost, difficult to test and modify'
      };
    }

    return null;
  }

  async detectMagicNumbers(parseResult) {
    const { ast } = parseResult;
    const magicNumbers = [];
    const allowedNumbers = new Set([0, 1, -1, 2, 10, 100, 1000]);

    this.traverseAST(ast, (node) => {
      if (node.type === 'Literal' && typeof node.value === 'number') {
        if (!allowedNumbers.has(node.value)) {
          magicNumbers.push({
            value: node.value,
            location: node.loc,
            context: this.getNodeContext(node)
          });
        }
      }
    });

    if (magicNumbers.length > 0) {
      const confidence = Math.min(0.9, magicNumbers.length * 0.1 + 0.5);
      return {
        confidence,
        severity: magicNumbers.length > 10 ? 'high' : 'medium',
        description: 'Magic numbers found in code',
        indicators: { magicNumberCount: magicNumbers.length },
        magicNumbers: magicNumbers.slice(0, 10),
        locations: magicNumbers.map(m => m.location),
        impact: 'Reduced code readability and maintainability'
      };
    }

    return null;
  }

  async detectLongMethod(parseResult) {
    const { ast } = parseResult;
    const longMethods = [];
    const maxMethodLines = 50;

    this.traverseAST(ast, (node) => {
      if (node.type === 'FunctionDeclaration' || node.type === 'MethodDefinition') {
        const methodLines = this.getNodeLineCount(node);
        if (methodLines > maxMethodLines) {
          longMethods.push({
            name: this.getMethodName(node),
            lines: methodLines,
            location: node.loc,
            complexity: this.calculateMethodComplexity(node)
          });
        }
      }
    });

    if (longMethods.length > 0) {
      const avgLines = longMethods.reduce((sum, m) => sum + m.lines, 0) / longMethods.length;
      const confidence = Math.min(0.9, (avgLines - maxMethodLines) / maxMethodLines);
      
      return {
        confidence,
        severity: avgLines > 100 ? 'high' : 'medium',
        description: 'Methods are too long and complex',
        indicators: {
          longMethodCount: longMethods.length,
          averageLines: Math.round(avgLines),
          maxLines: Math.max(...longMethods.map(m => m.lines))
        },
        longMethods: longMethods.slice(0, 5),
        locations: longMethods.map(m => m.location),
        impact: 'Difficult to understand, test, and maintain'
      };
    }

    return null;
  }

  async detectCopyPasteProgramming(parseResult) {
    const { ast } = parseResult;
    const functionBodies = [];
    const duplicates = [];

    // Collect function bodies for comparison
    this.traverseAST(ast, (node) => {
      if (node.type === 'FunctionDeclaration' || node.type === 'MethodDefinition') {
        const body = this.getFunctionBodyText(node);
        if (body && body.length > 50) { // Only consider substantial functions
          functionBodies.push({
            name: this.getMethodName(node),
            body: body.toLowerCase().replace(/\s+/g, ' ').trim(),
            location: node.loc,
            node
          });
        }
      }
    });

    // Find similar function bodies
    for (let i = 0; i < functionBodies.length; i++) {
      for (let j = i + 1; j < functionBodies.length; j++) {
        const similarity = this.calculateStringSimilarity(functionBodies[i].body, functionBodies[j].body);
        if (similarity > 0.8) {
          duplicates.push({
            function1: functionBodies[i].name,
            function2: functionBodies[j].name,
            similarity,
            locations: [functionBodies[i].location, functionBodies[j].location]
          });
        }
      }
    }

    if (duplicates.length > 0) {
      const avgSimilarity = duplicates.reduce((sum, d) => sum + d.similarity, 0) / duplicates.length;
      return {
        confidence: Math.min(0.95, avgSimilarity),
        severity: duplicates.length > 3 ? 'high' : 'medium',
        description: 'Duplicate or very similar code blocks detected',
        indicators: { duplicateCount: duplicates.length, averageSimilarity: avgSimilarity },
        duplicates: duplicates.slice(0, 5),
        locations: duplicates.flatMap(d => d.locations),
        impact: 'Increased maintenance burden, bug multiplication risk'
      };
    }

    return null;
  }

  async detectSpaghettiCode(parseResult) {
    const { ast } = parseResult;
    let gotoCount = 0;
    let deepNestingCount = 0;
    let complexControlFlow = 0;

    this.traverseAST(ast, (node) => {
      // Check for deep nesting
      const nestingLevel = this.calculateNestingLevel(node);
      if (nestingLevel > 4) {
        deepNestingCount++;
      }

      // Check for complex control flow
      if (['BreakStatement', 'ContinueStatement', 'ReturnStatement'].includes(node.type)) {
        const parentFunction = this.findParentFunction(node);
        if (parentFunction) {
          const returnCount = this.countReturnsInFunction(parentFunction);
          if (returnCount > 3) {
            complexControlFlow++;
          }
        }
      }
    });

    const spaghettiScore = (deepNestingCount * 0.4 + complexControlFlow * 0.6) / 10;

    if (spaghettiScore > 0.3) {
      return {
        confidence: Math.min(0.9, spaghettiScore),
        severity: spaghettiScore > 0.7 ? 'high' : 'medium',
        description: 'Complex, hard-to-follow control flow detected',
        indicators: { deepNestingCount, complexControlFlow, spaghettiScore },
        locations: [],
        impact: 'Difficult to understand, debug, and maintain'
      };
    }

    return null;
  }

  async detectDeadCode(parseResult) {
    const { ast } = parseResult;
    const declaredFunctions = new Set();
    const calledFunctions = new Set();
    const declaredVariables = new Set();
    const usedVariables = new Set();

    // First pass: collect declarations
    this.traverseAST(ast, (node) => {
      if (node.type === 'FunctionDeclaration' && node.id) {
        declaredFunctions.add(node.id.name);
      }
      if (node.type === 'VariableDeclarator' && node.id && node.id.type === 'Identifier') {
        declaredVariables.add(node.id.name);
      }
    });

    // Second pass: collect usage
    this.traverseAST(ast, (node) => {
      if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier') {
        calledFunctions.add(node.callee.name);
      }
      if (node.type === 'Identifier' && node.name) {
        usedVariables.add(node.name);
      }
    });

    const unusedFunctions = [...declaredFunctions].filter(f => !calledFunctions.has(f));
    const unusedVariables = [...declaredVariables].filter(v => !usedVariables.has(v));

    if (unusedFunctions.length > 0 || unusedVariables.length > 0) {
      const totalUnused = unusedFunctions.length + unusedVariables.length;
      const confidence = Math.min(0.9, totalUnused * 0.1 + 0.5);

      return {
        confidence,
        severity: totalUnused > 5 ? 'medium' : 'low',
        description: 'Unused functions and variables detected',
        indicators: {
          unusedFunctionCount: unusedFunctions.length,
          unusedVariableCount: unusedVariables.length
        },
        unusedFunctions: unusedFunctions.slice(0, 10),
        unusedVariables: unusedVariables.slice(0, 10),
        locations: [],
        impact: 'Code bloat, confusion, maintenance overhead'
      };
    }

    return null;
  }

  async detectFeatureEnvy(parseResult) {
    const { ast } = parseResult;
    const methodAnalysis = [];

    this.traverseAST(ast, (node) => {
      if (node.type === 'MethodDefinition' || node.type === 'FunctionDeclaration') {
        const externalCalls = this.countExternalMethodCalls(node);
        const internalCalls = this.countInternalMethodCalls(node);
        
        if (externalCalls > internalCalls && externalCalls > 3) {
          methodAnalysis.push({
            name: this.getMethodName(node),
            externalCalls,
            internalCalls,
            location: node.loc,
            envyRatio: externalCalls / (internalCalls + 1)
          });
        }
      }
    });

    if (methodAnalysis.length > 0) {
      const avgEnvyRatio = methodAnalysis.reduce((sum, m) => sum + m.envyRatio, 0) / methodAnalysis.length;
      
      return {
        confidence: Math.min(0.9, avgEnvyRatio * 0.2),
        severity: avgEnvyRatio > 3 ? 'medium' : 'low',
        description: 'Methods using external classes more than their own',
        indicators: {
          envyMethodCount: methodAnalysis.length,
          averageEnvyRatio: avgEnvyRatio
        },
        envyMethods: methodAnalysis.slice(0, 5),
        locations: methodAnalysis.map(m => m.location),
        impact: 'Poor encapsulation, tight coupling'
      };
    }

    return null;
  }

  // Design pattern detectors
  async detectSingleton(parseResult) {
    const { ast } = parseResult;
    const singletonIndicators = [];

    this.traverseAST(ast, (node) => {
      if (node.type === 'ClassDeclaration') {
        const hasStaticInstance = this.hasStaticInstanceMethod(node);
        const hasInstanceVariable = this.hasStaticInstanceVariable(node);

        if (hasStaticInstance && hasInstanceVariable) {
          singletonIndicators.push({
            className: node.id.name,
            location: node.loc,
            indicators: { hasStaticInstance, hasInstanceVariable }
          });
        }
      }
    });

    if (singletonIndicators.length > 0) {
      return {
        confidence: 0.8,
        severity: 'low',
        description: 'Singleton pattern implementation detected',
        indicators: { singletonCount: singletonIndicators.length },
        singletons: singletonIndicators,
        locations: singletonIndicators.map(s => s.location),
        impact: 'Ensures single instance, but may create testing difficulties'
      };
    }

    return null;
  }

  async detectObserver(parseResult) {
    const { ast } = parseResult;
    const observerIndicators = [];

    this.traverseAST(ast, (node) => {
      if (node.type === 'ClassDeclaration') {
        const hasObserverMethods = this.hasObserverMethods(node);
        const hasListenerArray = this.hasListenerArray(node);
        const hasNotifyMethod = this.hasNotifyMethod(node);

        if (hasObserverMethods || (hasListenerArray && hasNotifyMethod)) {
          observerIndicators.push({
            className: node.id.name,
            location: node.loc,
            indicators: { hasObserverMethods, hasListenerArray, hasNotifyMethod }
          });
        }
      }
    });

    if (observerIndicators.length > 0) {
      return {
        confidence: 0.75,
        severity: 'low',
        description: 'Observer pattern implementation detected',
        indicators: { observerCount: observerIndicators.length },
        observers: observerIndicators,
        locations: observerIndicators.map(o => o.location),
        impact: 'Loose coupling between subjects and observers'
      };
    }

    return null;
  }

  async detectFactory(parseResult) {
    const { ast } = parseResult;
    const factoryIndicators = [];

    this.traverseAST(ast, (node) => {
      if (node.type === 'FunctionDeclaration') {
        const hasFactoryName = /create|build|make|factory/i.test(node.id?.name || '');
        const hasConditionalCreation = this.hasConditionalObjectCreation(node);
        const returnsNewObjects = this.returnsNewObjects(node);

        if (hasFactoryName && (hasConditionalCreation || returnsNewObjects)) {
          factoryIndicators.push({
            functionName: node.id.name,
            location: node.loc,
            indicators: { hasFactoryName, hasConditionalCreation, returnsNewObjects }
          });
        }
      }
    });

    if (factoryIndicators.length > 0) {
      return {
        confidence: 0.8,
        severity: 'low',
        description: 'Factory pattern implementation detected',
        indicators: { factoryCount: factoryIndicators.length },
        factories: factoryIndicators,
        locations: factoryIndicators.map(f => f.location),
        impact: 'Encapsulates object creation logic'
      };
    }

    return null;
  }

  async detectStrategy(parseResult) {
    const { ast } = parseResult;
    const strategyIndicators = [];

    this.traverseAST(ast, (node) => {
      if (node.type === 'ClassDeclaration') {
        const hasStrategyInterface = this.hasStrategyInterface(node);
        const hasExecuteMethod = this.hasExecuteMethod(node);

        if (hasStrategyInterface || hasExecuteMethod) {
          strategyIndicators.push({
            className: node.id.name,
            location: node.loc,
            indicators: { hasStrategyInterface, hasExecuteMethod }
          });
        }
      }
    });

    if (strategyIndicators.length > 1) { // Need multiple strategies
      return {
        confidence: 0.75,
        severity: 'low',
        description: 'Strategy pattern implementation detected',
        indicators: { strategyCount: strategyIndicators.length },
        strategies: strategyIndicators,
        locations: strategyIndicators.map(s => s.location),
        impact: 'Enables algorithm selection at runtime'
      };
    }

    return null;
  }

  async detectDecorator(parseResult) {
    const { ast } = parseResult;
    const decoratorIndicators = [];

    this.traverseAST(ast, (node) => {
      if (node.type === 'ClassDeclaration') {
        const hasComponentReference = this.hasComponentReference(node);
        const hasMethodDelegation = this.hasMethodDelegation(node);
        const extendsComponent = this.extendsComponent(node);

        if (hasComponentReference && hasMethodDelegation && extendsComponent) {
          decoratorIndicators.push({
            className: node.id.name,
            location: node.loc,
            indicators: { hasComponentReference, hasMethodDelegation, extendsComponent }
          });
        }
      }
    });

    if (decoratorIndicators.length > 0) {
      return {
        confidence: 0.8,
        severity: 'low',
        description: 'Decorator pattern implementation detected',
        indicators: { decoratorCount: decoratorIndicators.length },
        decorators: decoratorIndicators,
        locations: decoratorIndicators.map(d => d.location),
        impact: 'Adds behavior to objects dynamically'
      };
    }

    return null;
  }

  // Framework-specific pattern detectors
  async detectJQueryDOMManipulation(parseResult) {
    if (parseResult.language !== 'javascript') return null;

    const { ast } = parseResult;
    const jqueryPatterns = [];

    this.traverseAST(ast, (node) => {
      if (node.type === 'CallExpression') {
        const callee = node.callee;
        
        if ((callee.type === 'Identifier' && (callee.name === '$' || callee.name === 'jQuery')) ||
            (callee.type === 'MemberExpression' && callee.object && callee.object.name === '$')) {
          
          const method = callee.property ? callee.property.name : 'selector';
          jqueryPatterns.push({
            type: 'jquery_call',
            method,
            location: node.loc,
            context: this.getNodeContext(node)
          });
        }
      }
    });

    if (jqueryPatterns.length > 0) {
      const confidence = Math.min(0.9, jqueryPatterns.length * 0.1 + 0.6);
      return {
        confidence,
        severity: 'medium',
        description: 'Legacy jQuery DOM manipulation detected',
        indicators: {
          jqueryCallCount: jqueryPatterns.length,
          commonMethods: this.getCommonMethods(jqueryPatterns)
        },
        patterns: jqueryPatterns.slice(0, 10),
        locations: jqueryPatterns.map(p => p.location),
        impact: 'Modern alternatives: vanilla JS DOM API, React, Vue.js'
      };
    }

    return null;
  }

  async detectJQueryAjax(parseResult) {
    if (parseResult.language !== 'javascript') return null;

    const { ast } = parseResult;
    const ajaxPatterns = [];

    this.traverseAST(ast, (node) => {
      if (node.type === 'CallExpression' && node.callee && node.callee.type === 'MemberExpression') {
        const object = node.callee.object;
        const property = node.callee.property;

        if (object && (object.name === '$' || object.name === 'jQuery') && 
            property && ['ajax', 'get', 'post', 'load', 'getJSON'].includes(property.name)) {
          
          ajaxPatterns.push({
            method: property.name,
            location: node.loc,
            hasCallbacks: this.hasCallbackParameters(node)
          });
        }
      }
    });

    if (ajaxPatterns.length > 0) {
      return {
        confidence: 0.9,
        severity: 'medium',
        description: 'Legacy jQuery AJAX patterns detected',
        indicators: {
          ajaxCallCount: ajaxPatterns.length,
          methods: [...new Set(ajaxPatterns.map(p => p.method))]
        },
        patterns: ajaxPatterns,
        locations: ajaxPatterns.map(p => p.location),
        impact: 'Modern alternatives: fetch API, axios, async/await'
      };
    }

    return null;
  }

  async detectOldPHPPatterns(parseResult) {
    if (parseResult.language !== 'php') return null;

    const { ast } = parseResult;
    const phpPatterns = [];

    this.traverseAST(ast, (node) => {
      // Detect old PHP patterns like mysql_* functions, register_globals usage, etc.
      if (node.type === 'call' && node.what && node.what.name) {
        const functionName = node.what.name;
        
        // Deprecated MySQL functions
        if (/^mysql_/.test(functionName)) {
          phpPatterns.push({
            type: 'deprecated_mysql',
            function: functionName,
            location: node.loc,
            modernAlternative: functionName.replace('mysql_', 'mysqli_')
          });
        }
        
        // Other deprecated functions
        const deprecatedFunctions = ['ereg', 'eregi', 'split', 'each'];
        if (deprecatedFunctions.includes(functionName)) {
          phpPatterns.push({
            type: 'deprecated_function',
            function: functionName,
            location: node.loc
          });
        }
      }
    });

    if (phpPatterns.length > 0) {
      return {
        confidence: 0.9,
        severity: 'high',
        description: 'Deprecated PHP patterns detected',
        indicators: { deprecatedPatternCount: phpPatterns.length },
        patterns: phpPatterns,
        locations: phpPatterns.map(p => p.location),
        impact: 'Security vulnerabilities, compatibility issues'
      };
    }

    return null;
  }

  async detectLegacyJavaScriptPatterns(parseResult) {
    if (parseResult.language !== 'javascript') return null;

    const { ast } = parseResult;
    const legacyPatterns = [];

    this.traverseAST(ast, (node) => {
      // Detect var declarations (should use let/const)
      if (node.type === 'VariableDeclaration' && node.kind === 'var') {
        legacyPatterns.push({
          type: 'var_declaration',
          location: node.loc,
          modernAlternative: 'let/const'
        });
      }

      // Detect function declarations that should be arrow functions
      if (node.type === 'FunctionExpression' && this.isSimpleFunction(node)) {
        legacyPatterns.push({
          type: 'function_expression',
          location: node.loc,
          modernAlternative: 'arrow function'
        });
      }

      // Detect old-style prototype manipulation
      if (node.type === 'MemberExpression' && 
          node.property && node.property.name === 'prototype') {
        legacyPatterns.push({
          type: 'prototype_manipulation',
          location: node.loc,
          modernAlternative: 'class syntax'
        });
      }
    });

    if (legacyPatterns.length > 0) {
      return {
        confidence: 0.8,
        severity: 'medium',
        description: 'Legacy JavaScript patterns detected',
        indicators: { legacyPatternCount: legacyPatterns.length },
        patterns: legacyPatterns.slice(0, 10),
        locations: legacyPatterns.map(p => p.location),
        impact: 'Modern alternatives available for better readability and performance'
      };
    }

    return null;
  }

  async detectDeprecatedAPIUsage(parseResult) {
    const { ast } = parseResult;
    const deprecatedAPIs = [];

    // Define deprecated APIs by language
    const deprecatedByLanguage = {
      javascript: [
        'document.write', 'eval', 'with', 'arguments.callee',
        'escape', 'unescape', 'String.prototype.substr'
      ],
      php: [
        'mysql_connect', 'mysql_query', 'ereg', 'split', 'each'
      ]
    };

    const deprecated = deprecatedByLanguage[parseResult.language] || [];

    this.traverseAST(ast, (node) => {
      if (node.type === 'CallExpression' && node.callee) {
        const callName = this.getCallName(node.callee);
        if (deprecated.some(api => callName.includes(api))) {
          deprecatedAPIs.push({
            api: callName,
            location: node.loc,
            context: this.getNodeContext(node)
          });
        }
      }
    });

    if (deprecatedAPIs.length > 0) {
      return {
        confidence: 0.95,
        severity: 'high',
        description: 'Deprecated API usage detected',
        indicators: { deprecatedAPICount: deprecatedAPIs.length },
        apis: deprecatedAPIs,
        locations: deprecatedAPIs.map(api => api.location),
        impact: 'Security risks, compatibility issues, performance problems'
      };
    }

    return null;
  }

  // Utility methods
  traverseAST(node, enterCallback) {
    if (!node || typeof node !== 'object') return;

    enterCallback(node);

    for (const key in node) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object') {
            this.traverseAST(item, enterCallback);
          }
        }
      } else if (child && typeof child === 'object') {
        this.traverseAST(child, enterCallback);
      }
    }
  }

  calculateGodObjectScore(methodCount, propertyCount, lineCount) {
    const methodScore = Math.min(1, methodCount / 20);
    const propertyScore = Math.min(1, propertyCount / 15);
    const lineScore = Math.min(1, lineCount / 500);
    return (methodScore + propertyScore + lineScore) / 3;
  }

  getNodeContext(node) {
    return {
      line: node.loc ? node.loc.start.line : null,
      column: node.loc ? node.loc.start.column : null
    };
  }

  getNodeLineCount(node) {
    if (!node.loc) return 0;
    return node.loc.end.line - node.loc.start.line + 1;
  }

  getMethodName(node) {
    if (node.type === 'FunctionDeclaration' && node.id) {
      return node.id.name;
    }
    if (node.type === 'MethodDefinition' && node.key) {
      return node.key.name;
    }
    return 'anonymous';
  }

  calculateMethodComplexity(node) {
    let complexity = 1;
    this.traverseAST(node, (n) => {
      if (['IfStatement', 'ForStatement', 'WhileStatement', 'DoWhileStatement', 
           'SwitchStatement', 'TryStatement'].includes(n.type)) {
        complexity++;
      }
    });
    return complexity;
  }

  // Additional utility methods for new pattern detectors
  getFunctionBodyText(node) {
    if (!node.body) return '';
    
    // Simple text extraction - in a real implementation, you'd want to use
    // the source code directly or a more sophisticated approach
    try {
      return JSON.stringify(node.body);
    } catch (error) {
      return '';
    }
  }

  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  calculateNestingLevel(node) {
    let level = 0;
    let current = node;
    
    while (current && current.parent) {
      if (['IfStatement', 'ForStatement', 'WhileStatement', 'DoWhileStatement',
           'SwitchStatement', 'TryStatement', 'BlockStatement'].includes(current.parent.type)) {
        level++;
      }
      current = current.parent;
    }
    
    return level;
  }

  findParentFunction(node) {
    let current = node;
    while (current && current.parent) {
      if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 
           'MethodDefinition'].includes(current.parent.type)) {
        return current.parent;
      }
      current = current.parent;
    }
    return null;
  }

  countReturnsInFunction(functionNode) {
    let returnCount = 0;
    this.traverseAST(functionNode, (node) => {
      if (node.type === 'ReturnStatement') {
        returnCount++;
      }
    });
    return returnCount;
  }

  countExternalMethodCalls(node) {
    let externalCalls = 0;
    this.traverseAST(node, (n) => {
      if (n.type === 'CallExpression' && n.callee && n.callee.type === 'MemberExpression') {
        // Simple heuristic: if it's not 'this.method()', consider it external
        if (!(n.callee.object && n.callee.object.type === 'ThisExpression')) {
          externalCalls++;
        }
      }
    });
    return externalCalls;
  }

  countInternalMethodCalls(node) {
    let internalCalls = 0;
    this.traverseAST(node, (n) => {
      if (n.type === 'CallExpression' && n.callee && n.callee.type === 'MemberExpression') {
        // Simple heuristic: if it's 'this.method()', consider it internal
        if (n.callee.object && n.callee.object.type === 'ThisExpression') {
          internalCalls++;
        }
      }
    });
    return internalCalls;
  }

  hasConditionalObjectCreation(node) {
    let hasConditional = false;
    this.traverseAST(node, (n) => {
      if (n.type === 'IfStatement' || n.type === 'SwitchStatement') {
        // Check if there's object creation inside
        this.traverseAST(n, (innerNode) => {
          if (innerNode.type === 'NewExpression') {
            hasConditional = true;
          }
        });
      }
    });
    return hasConditional;
  }

  returnsNewObjects(node) {
    let returnsNew = false;
    this.traverseAST(node, (n) => {
      if (n.type === 'ReturnStatement' && n.argument && n.argument.type === 'NewExpression') {
        returnsNew = true;
      }
    });
    return returnsNew;
  }

  hasStrategyInterface(node) {
    if (!node.body || !node.body.body) return false;
    return node.body.body.some(member => 
      member.type === 'MethodDefinition' && 
      member.key && 
      /execute|perform|run|apply/i.test(member.key.name)
    );
  }

  hasExecuteMethod(node) {
    if (!node.body || !node.body.body) return false;
    return node.body.body.some(member => 
      member.type === 'MethodDefinition' && 
      member.key && 
      member.key.name === 'execute'
    );
  }

  hasComponentReference(node) {
    if (!node.body || !node.body.body) return false;
    return node.body.body.some(member => 
      member.type === 'PropertyDefinition' && 
      member.key && 
      /component|wrapped|target/i.test(member.key.name)
    );
  }

  hasMethodDelegation(node) {
    if (!node.body || !node.body.body) return false;
    return node.body.body.some(member => {
      if (member.type === 'MethodDefinition' && member.value && member.value.body) {
        // Check if method body contains calls to component methods
        let hasDelegation = false;
        this.traverseAST(member.value.body, (n) => {
          if (n.type === 'CallExpression' && n.callee && n.callee.type === 'MemberExpression') {
            if (n.callee.object && /component|wrapped|target/i.test(n.callee.object.name)) {
              hasDelegation = true;
            }
          }
        });
        return hasDelegation;
      }
      return false;
    });
  }

  extendsComponent(node) {
    return node.superClass !== null;
  }

  isSimpleFunction(node) {
    if (!node.body || !node.body.body) return false;
    
    // Consider it simple if it has less than 3 statements and no complex control flow
    const statements = node.body.body;
    if (statements.length > 3) return false;
    
    for (const stmt of statements) {
      if (['IfStatement', 'ForStatement', 'WhileStatement', 'SwitchStatement'].includes(stmt.type)) {
        return false;
      }
    }
    
    return true;
  }

  getCallName(callee) {
    if (callee.type === 'Identifier') {
      return callee.name;
    }
    if (callee.type === 'MemberExpression') {
      const object = this.getCallName(callee.object);
      const property = callee.property.name || '';
      return `${object}.${property}`;
    }
    return '';
  }

  hasStaticInstanceMethod(classNode) {
    if (!classNode.body || !classNode.body.body) return false;
    return classNode.body.body.some(member => 
      member.type === 'MethodDefinition' && 
      member.static && 
      member.key && 
      /instance|getInstance/i.test(member.key.name)
    );
  }

  hasStaticInstanceVariable(classNode) {
    if (!classNode.body || !classNode.body.body) return false;
    return classNode.body.body.some(member => 
      member.type === 'PropertyDefinition' && 
      member.static &&
      member.key &&
      /instance/i.test(member.key.name)
    );
  }

  hasObserverMethods(classNode) {
    if (!classNode.body || !classNode.body.body) return false;
    const observerMethods = ['addObserver', 'removeObserver', 'notifyObservers', 'subscribe', 'unsubscribe'];
    return classNode.body.body.some(member => 
      member.type === 'MethodDefinition' && 
      member.key && 
      observerMethods.some(method => member.key.name.includes(method))
    );
  }

  hasListenerArray(classNode) {
    if (!classNode.body || !classNode.body.body) return false;
    return classNode.body.body.some(member => 
      member.type === 'PropertyDefinition' && 
      member.key && 
      /listeners?|observers?/i.test(member.key.name)
    );
  }

  hasNotifyMethod(classNode) {
    if (!classNode.body || !classNode.body.body) return false;
    return classNode.body.body.some(member => 
      member.type === 'MethodDefinition' && 
      member.key && 
      /notify|fire|trigger|emit/i.test(member.key.name)
    );
  }

  hasCallbackParameters(node) {
    return node.arguments && node.arguments.some(arg => 
      arg.type === 'FunctionExpression' || arg.type === 'ArrowFunctionExpression'
    );
  }

  getCommonMethods(patterns) {
    const methodCounts = {};
    patterns.forEach(p => {
      methodCounts[p.method] = (methodCounts[p.method] || 0) + 1;
    });
    
    return Object.entries(methodCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([method, count]) => ({ method, count }));
  }

  getStats() {
    return {
      antiPatternDetectors: this.antiPatternDetectors.size,
      designPatternDetectors: this.designPatternDetectors.size,
      frameworkPatternDetectors: this.frameworkPatternDetectors.size,
      confidenceThreshold: this.options.confidenceThreshold
    };
  }
}
