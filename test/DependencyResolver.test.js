import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyResolver } from '../src/migration/DependencyResolver.js';

describe('DependencyResolver', () => {
  let resolver;
  let mockCodeAnalysisResults;

  beforeEach(() => {
    resolver = new DependencyResolver({
      maxDepth: 10,
      circularDependencyStrategy: 'break_weakest',
      includeTransitive: true
    });

    // Mock code analysis results with dependencies
    mockCodeAnalysisResults = [
      {
        success: true,
        filePath: '/src/moduleA.js',
        parsing: {
          dependencies: [
            { path: '/src/moduleB.js', type: 'import', strength: 'strong', line: 1 },
            { path: '/src/utils.js', type: 'import', strength: 'medium', line: 2 }
          ]
        }
      },
      {
        success: true,
        filePath: '/src/moduleB.js',
        parsing: {
          dependencies: [
            { path: '/src/moduleC.js', type: 'import', strength: 'strong', line: 1 },
            { path: '/src/utils.js', type: 'function_call', strength: 'weak', line: 5 }
          ]
        }
      },
      {
        success: true,
        filePath: '/src/moduleC.js',
        parsing: {
          dependencies: [
            { path: '/src/moduleA.js', type: 'import', strength: 'medium', line: 1 } // Creates cycle
          ]
        }
      },
      {
        success: true,
        filePath: '/src/utils.js',
        parsing: {
          dependencies: []
        }
      }
    ];
  });

  describe('analyzeDependencies', () => {
    it('should build dependency graph correctly', () => {
      const analysis = resolver.analyzeDependencies(mockCodeAnalysisResults);

      expect(analysis.directDependencies.size).toBe(4);
      expect(analysis.directDependencies.get('/src/moduleA.js').size).toBe(2);
      expect(analysis.directDependencies.get('/src/moduleB.js').size).toBe(2);
      expect(analysis.directDependencies.get('/src/moduleC.js').size).toBe(1);
      expect(analysis.directDependencies.get('/src/utils.js').size).toBe(0);
    });

    it('should build reverse dependency graph', () => {
      const analysis = resolver.analyzeDependencies(mockCodeAnalysisResults);

      expect(analysis.reverseDependencies.get('/src/utils.js').size).toBe(2);
      expect(analysis.reverseDependencies.get('/src/moduleA.js').size).toBe(1);
    });

    it('should detect circular dependencies', () => {
      const analysis = resolver.analyzeDependencies(mockCodeAnalysisResults);

      expect(analysis.circularDependencies.length).toBeGreaterThan(0);
      const cycle = analysis.circularDependencies[0];
      expect(cycle.chain).toContain('/src/moduleA.js');
      expect(cycle.chain).toContain('/src/moduleB.js');
      expect(cycle.chain).toContain('/src/moduleC.js');
    });

    it('should calculate dependency metrics', () => {
      const analysis = resolver.analyzeDependencies(mockCodeAnalysisResults);

      expect(analysis.dependencyMetrics.totalFiles).toBe(4);
      expect(analysis.dependencyMetrics.totalDependencies).toBe(5);
      expect(analysis.dependencyMetrics.averageDependencies).toBe(1.25);
      expect(analysis.dependencyMetrics.isolatedFiles).toBe(1); // utils.js
    });

    it('should generate resolution suggestions', () => {
      const analysis = resolver.analyzeDependencies(mockCodeAnalysisResults);

      expect(analysis.resolutionSuggestions.length).toBeGreaterThan(0);
      const circularSuggestion = analysis.resolutionSuggestions.find(s => s.type === 'circular_dependency');
      expect(circularSuggestion).toBeDefined();
      expect(circularSuggestion.severity).toBe('high');
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect simple circular dependency', () => {
      resolver.analyzeDependencies(mockCodeAnalysisResults);
      const cycles = resolver.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);
      const cycle = cycles[0];
      expect(cycle.chain.length).toBeGreaterThan(3); // At least A -> B -> C -> A
    });

    it('should calculate cycle strength', () => {
      resolver.analyzeDependencies(mockCodeAnalysisResults);
      const cycles = resolver.detectCircularDependencies();

      const cycle = cycles[0];
      expect(cycle.strength).toBeDefined();
      expect(cycle.strength.total).toBeGreaterThan(0);
      expect(cycle.strength.classification).toMatch(/weak|medium|strong/);
    });

    it('should suggest break points', () => {
      resolver.analyzeDependencies(mockCodeAnalysisResults);
      const cycles = resolver.detectCircularDependencies();

      const cycle = cycles[0];
      expect(cycle.breakSuggestions).toBeDefined();
      expect(cycle.breakSuggestions.length).toBeGreaterThan(0);
      
      const suggestion = cycle.breakSuggestions[0];
      expect(suggestion.from).toBeDefined();
      expect(suggestion.to).toBeDefined();
      expect(suggestion.strategy).toBeDefined();
      expect(suggestion.effort).toBeGreaterThan(0);
      expect(suggestion.risk).toBeGreaterThan(0);
    });
  });

  describe('generateStepOrdering', () => {
    it('should order steps based on dependencies', () => {
      resolver.analyzeDependencies(mockCodeAnalysisResults);
      const files = ['/src/moduleA.js', '/src/moduleB.js', '/src/moduleC.js', '/src/utils.js'];
      const ordering = resolver.generateStepOrdering(files);

      expect(ordering.orderedSteps).toHaveLength(4);
      
      // utils.js should come first (no dependencies)
      expect(ordering.orderedSteps[0]).toBe('/src/utils.js');
      
      // Check that dependencies come before dependents (where possible)
      const utilsIndex = ordering.orderedSteps.indexOf('/src/utils.js');
      const moduleAIndex = ordering.orderedSteps.indexOf('/src/moduleA.js');
      const moduleBIndex = ordering.orderedSteps.indexOf('/src/moduleB.js');
      
      expect(utilsIndex).toBeLessThan(moduleAIndex);
      expect(utilsIndex).toBeLessThan(moduleBIndex);
    });

    it('should identify parallelizable steps', () => {
      resolver.analyzeDependencies(mockCodeAnalysisResults);
      const files = ['/src/moduleA.js', '/src/moduleB.js', '/src/moduleC.js', '/src/utils.js'];
      const ordering = resolver.generateStepOrdering(files);

      expect(ordering.parallelizable).toBeDefined();
      expect(Array.isArray(ordering.parallelizable)).toBe(true);
    });

    it('should calculate critical path', () => {
      resolver.analyzeDependencies(mockCodeAnalysisResults);
      const files = ['/src/moduleA.js', '/src/moduleB.js', '/src/moduleC.js', '/src/utils.js'];
      const ordering = resolver.generateStepOrdering(files);

      expect(ordering.criticalPath).toBeDefined();
      expect(ordering.criticalPath.path).toBeDefined();
      expect(ordering.criticalPath.length).toBeGreaterThanOrEqual(0);
      expect(ordering.criticalPath.estimatedDuration).toBeGreaterThan(0);
    });

    it('should calculate dependency levels', () => {
      resolver.analyzeDependencies(mockCodeAnalysisResults);
      const files = ['/src/moduleA.js', '/src/moduleB.js', '/src/moduleC.js', '/src/utils.js'];
      const ordering = resolver.generateStepOrdering(files);

      expect(ordering.dependencyLevels).toBeDefined();
      expect(ordering.dependencyLevels.size).toBe(4);
      
      // utils.js should be at level 0 (no dependencies)
      expect(ordering.dependencyLevels.get('/src/utils.js')).toBe(0);
    });
  });

  describe('circular dependency resolution', () => {
    it('should resolve circular dependencies with break_weakest strategy', () => {
      resolver.analyzeDependencies(mockCodeAnalysisResults);
      const resolutions = resolver.resolveCircularDependencies('break_weakest');

      expect(resolutions.length).toBeGreaterThan(0);
      const resolution = resolutions[0];
      expect(resolution.strategy).toBe('break_weakest');
      expect(resolution.steps).toBeDefined();
      expect(resolution.estimatedEffort).toBeGreaterThan(0);
      expect(resolution.risk).toBeGreaterThan(0);
    });

    it('should provide extract_interface resolution strategy', () => {
      resolver.analyzeDependencies(mockCodeAnalysisResults);
      const resolutions = resolver.resolveCircularDependencies('extract_interface');

      expect(resolutions.length).toBeGreaterThan(0);
      const resolution = resolutions[0];
      expect(resolution.strategy).toBe('extract_interface');
      expect(resolution.steps).toHaveLength(5);
    });

    it('should provide dependency_injection resolution strategy', () => {
      resolver.analyzeDependencies(mockCodeAnalysisResults);
      const resolutions = resolver.resolveCircularDependencies('dependency_injection');

      expect(resolutions.length).toBeGreaterThan(0);
      const resolution = resolutions[0];
      expect(resolution.strategy).toBe('dependency_injection');
      expect(resolution.steps).toHaveLength(5);
    });
  });

  describe('dependency strength and type handling', () => {
    it('should handle different dependency types correctly', () => {
      const testResults = [
        {
          success: true,
          filePath: '/src/test.js',
          parsing: {
            dependencies: [
              { path: '/src/import.js', type: 'import', strength: 'strong' },
              { path: '/src/call.js', type: 'function_call', strength: 'medium' },
              { path: '/src/inherit.js', type: 'class_inheritance', strength: 'strong' },
              { path: '/src/global.js', type: 'global_variable', strength: 'weak' }
            ]
          }
        }
      ];

      const analysis = resolver.analyzeDependencies(testResults);
      const deps = analysis.directDependencies.get('/src/test.js');
      
      expect(deps.size).toBe(4);
      
      const depTypes = Array.from(deps).map(d => d.type);
      expect(depTypes).toContain('import');
      expect(depTypes).toContain('function_call');
      expect(depTypes).toContain('class_inheritance');
      expect(depTypes).toContain('global_variable');
    });

    it('should estimate break effort correctly for different dependency types', () => {
      const importDep = { type: 'import', strength: 'medium' };
      const inheritanceDep = { type: 'class_inheritance', strength: 'strong' };
      const globalDep = { type: 'global_variable', strength: 'weak' };

      const importEffort = resolver.estimateBreakEffort(importDep);
      const inheritanceEffort = resolver.estimateBreakEffort(inheritanceDep);
      const globalEffort = resolver.estimateBreakEffort(globalDep);

      expect(inheritanceEffort).toBeGreaterThan(importEffort);
      expect(globalEffort).toBeLessThan(inheritanceEffort);
    });

    it('should assess break risk correctly for different dependency types', () => {
      const importDep = { type: 'import', strength: 'weak' };
      const inheritanceDep = { type: 'class_inheritance', strength: 'strong' };

      const importRisk = resolver.assessBreakRisk(importDep);
      const inheritanceRisk = resolver.assessBreakRisk(inheritanceDep);

      expect(inheritanceRisk).toBeGreaterThan(importRisk);
    });
  });

  describe('transitive dependencies', () => {
    it('should build transitive dependencies when enabled', () => {
      const analysis = resolver.analyzeDependencies(mockCodeAnalysisResults);

      expect(analysis.transitiveDependencies).toBeDefined();
      expect(analysis.transitiveDependencies.size).toBe(4);
      
      // moduleA should transitively depend on moduleC through moduleB
      const moduleATransitive = analysis.transitiveDependencies.get('/src/moduleA.js');
      expect(moduleATransitive.has('/src/moduleC.js')).toBe(true);
      expect(moduleATransitive.has('/src/utils.js')).toBe(true);
    });

    it('should not build transitive dependencies when disabled', () => {
      const resolverNoTransitive = new DependencyResolver({ includeTransitive: false });
      const analysis = resolverNoTransitive.analyzeDependencies(mockCodeAnalysisResults);

      expect(analysis.transitiveDependencies.size).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty dependency list', () => {
      const analysis = resolver.analyzeDependencies([]);

      expect(analysis.directDependencies.size).toBe(0);
      expect(analysis.circularDependencies.length).toBe(0);
      expect(analysis.dependencyMetrics.totalFiles).toBe(0);
    });

    it('should handle files with no dependencies', () => {
      const singleFileResults = [{
        success: true,
        filePath: '/src/standalone.js',
        parsing: { dependencies: [] }
      }];

      const analysis = resolver.analyzeDependencies(singleFileResults);

      expect(analysis.directDependencies.size).toBe(1);
      expect(analysis.dependencyMetrics.isolatedFiles).toBe(1);
      expect(analysis.circularDependencies.length).toBe(0);
    });

    it('should handle failed analysis results', () => {
      const mixedResults = [
        { success: false, filePath: '/src/failed.js', error: 'Parse error' },
        ...mockCodeAnalysisResults
      ];

      const analysis = resolver.analyzeDependencies(mixedResults);

      expect(analysis.directDependencies.size).toBe(4); // Only successful ones
      expect(analysis.directDependencies.has('/src/failed.js')).toBe(false);
    });

    it('should respect max depth for transitive dependencies', () => {
      const shallowResolver = new DependencyResolver({ maxDepth: 1 });
      
      // Create a deep dependency chain
      const deepResults = [];
      for (let i = 0; i < 10; i++) {
        deepResults.push({
          success: true,
          filePath: `/src/module${i}.js`,
          parsing: {
            dependencies: i < 9 ? [{ path: `/src/module${i + 1}.js`, type: 'import', strength: 'strong' }] : []
          }
        });
      }

      const analysis = shallowResolver.analyzeDependencies(deepResults);
      
      // With maxDepth=1, transitive dependencies should be limited
      const module0Transitive = analysis.transitiveDependencies.get('/src/module0.js');
      expect(module0Transitive.size).toBeLessThanOrEqual(2); // Direct + 1 level
    });
  });
});