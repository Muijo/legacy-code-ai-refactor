/**
 * Dependency Resolution Engine
 * 
 * Provides comprehensive dependency analysis across files and modules,
 * implements step ordering based on dependency constraints, and handles
 * circular dependency detection and resolution.
 */

export class DependencyResolver {
  constructor(options = {}) {
    this.options = {
      maxDepth: options.maxDepth || 50,
      circularDependencyStrategy: options.circularDependencyStrategy || 'break_weakest',
      includeTransitive: options.includeTransitive !== false,
      ...options
    };
    
    this.dependencyGraph = new Map();
    this.reverseDependencyGraph = new Map();
    this.circularDependencies = new Set();
    this.resolutionStrategies = new Map();
  }

  /**
   * Analyze dependencies across multiple files and modules
   * @param {Array} codeAnalysisResults - Results from code analysis
   * @returns {Object} Comprehensive dependency analysis
   */
  analyzeDependencies(codeAnalysisResults) {
    this.dependencyGraph.clear();
    this.reverseDependencyGraph.clear();
    this.circularDependencies.clear();

    // Build initial dependency graph
    for (const result of codeAnalysisResults) {
      if (!result.success || !result.parsing?.dependencies) continue;
      
      const filePath = result.filePath;
      const dependencies = result.parsing.dependencies;
      
      this.dependencyGraph.set(filePath, new Set());
      this.reverseDependencyGraph.set(filePath, new Set());
      
      // Add direct dependencies
      for (const dep of dependencies) {
        this.addDependency(filePath, dep.path, {
          type: dep.type,
          strength: dep.strength || 'strong',
          line: dep.line,
          column: dep.column
        });
      }
    }

    // Detect circular dependencies
    const circularDeps = this.detectCircularDependencies();
    
    // Build transitive dependencies if enabled
    const transitiveDeps = this.options.includeTransitive ? 
      this.buildTransitiveDependencies() : new Map();

    return {
      directDependencies: this.dependencyGraph,
      reverseDependencies: this.reverseDependencyGraph,
      transitiveDependencies: transitiveDeps,
      circularDependencies: circularDeps,
      dependencyMetrics: this.calculateDependencyMetrics(),
      resolutionSuggestions: this.generateResolutionSuggestions()
    };
  }

  /**
   * Add a dependency relationship between two files
   */
  addDependency(fromFile, toFile, metadata = {}) {
    if (!this.dependencyGraph.has(fromFile)) {
      this.dependencyGraph.set(fromFile, new Set());
    }
    if (!this.reverseDependencyGraph.has(toFile)) {
      this.reverseDependencyGraph.set(toFile, new Set());
    }

    // Store dependency with metadata
    const depInfo = { file: toFile, ...metadata };
    this.dependencyGraph.get(fromFile).add(depInfo);
    this.reverseDependencyGraph.get(toFile).add({ file: fromFile, ...metadata });
  }

  /**
   * Detect circular dependencies using DFS
   * @returns {Array} List of circular dependency chains
   */
  detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    const circularChains = [];

    const dfs = (node, path = []) => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart).concat([node]);
        circularChains.push({
          chain: cycle,
          strength: this.calculateCycleStrength(cycle),
          breakSuggestions: this.suggestCycleBreakPoints(cycle)
        });
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const dependencies = this.dependencyGraph.get(node) || new Set();
      for (const dep of dependencies) {
        dfs(dep.file, [...path]);
      }

      recursionStack.delete(node);
      path.pop();
    };

    // Check all nodes for cycles
    for (const node of this.dependencyGraph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return circularChains;
  }

  /**
   * Calculate the strength of a circular dependency
   */
  calculateCycleStrength(cycle) {
    let totalStrength = 0;
    let strongDeps = 0;

    for (let i = 0; i < cycle.length - 1; i++) {
      const from = cycle[i];
      const to = cycle[i + 1];
      const deps = this.dependencyGraph.get(from) || new Set();
      
      for (const dep of deps) {
        if (dep.file === to) {
          if (dep.strength === 'strong') strongDeps++;
          totalStrength += dep.strength === 'strong' ? 3 : 
                         dep.strength === 'medium' ? 2 : 1;
        }
      }
    }

    return {
      total: totalStrength,
      strong: strongDeps,
      average: totalStrength / (cycle.length - 1),
      classification: strongDeps > cycle.length / 2 ? 'strong' : 
                     totalStrength > cycle.length ? 'medium' : 'weak'
    };
  }

  /**
   * Suggest break points for circular dependencies
   */
  suggestCycleBreakPoints(cycle) {
    const suggestions = [];

    for (let i = 0; i < cycle.length - 1; i++) {
      const from = cycle[i];
      const to = cycle[i + 1];
      const deps = this.dependencyGraph.get(from) || new Set();
      
      for (const dep of deps) {
        if (dep.file === to) {
          suggestions.push({
            from,
            to,
            strength: dep.strength,
            type: dep.type,
            strategy: this.getBreakStrategy(dep),
            effort: this.estimateBreakEffort(dep),
            risk: this.assessBreakRisk(dep)
          });
        }
      }
    }

    // Sort by effort and risk
    return suggestions.sort((a, b) => {
      const aScore = a.effort + a.risk;
      const bScore = b.effort + b.risk;
      return aScore - bScore;
    });
  }

  /**
   * Get strategy for breaking a dependency
   */
  getBreakStrategy(dependency) {
    switch (dependency.type) {
      case 'import':
        return dependency.strength === 'weak' ? 'extract_interface' : 'dependency_injection';
      case 'function_call':
        return 'callback_pattern';
      case 'class_inheritance':
        return 'composition_over_inheritance';
      case 'global_variable':
        return 'parameter_passing';
      default:
        return 'extract_abstraction';
    }
  }

  /**
   * Estimate effort to break a dependency (1-10 scale)
   */
  estimateBreakEffort(dependency) {
    const baseEffort = {
      'import': 3,
      'function_call': 2,
      'class_inheritance': 7,
      'global_variable': 4,
      'data_dependency': 5
    };

    const strengthMultiplier = {
      'weak': 0.7,
      'medium': 1.0,
      'strong': 1.5
    };

    return Math.round((baseEffort[dependency.type] || 5) * 
                     (strengthMultiplier[dependency.strength] || 1));
  }

  /**
   * Assess risk of breaking a dependency (1-10 scale)
   */
  assessBreakRisk(dependency) {
    const baseRisk = {
      'import': 2,
      'function_call': 3,
      'class_inheritance': 8,
      'global_variable': 6,
      'data_dependency': 7
    };

    const strengthMultiplier = {
      'weak': 0.5,
      'medium': 1.0,
      'strong': 1.8
    };

    return Math.round((baseRisk[dependency.type] || 5) * 
                     (strengthMultiplier[dependency.strength] || 1));
  }

  /**
   * Build transitive dependency relationships
   */
  buildTransitiveDependencies() {
    const transitive = new Map();

    const getTransitiveDeps = (node, visited = new Set(), depth = 0) => {
      if (visited.has(node) || depth > this.options.maxDepth) {
        return new Set();
      }

      visited.add(node);
      const result = new Set();
      const directDeps = this.dependencyGraph.get(node) || new Set();

      for (const dep of directDeps) {
        result.add(dep.file);
        const transitiveDeps = getTransitiveDeps(dep.file, new Set(visited), depth + 1);
        for (const transDep of transitiveDeps) {
          result.add(transDep);
        }
      }

      return result;
    };

    for (const node of this.dependencyGraph.keys()) {
      transitive.set(node, getTransitiveDeps(node));
    }

    return transitive;
  }

  /**
   * Generate step ordering based on dependency constraints
   * @param {Array} files - Files to order
   * @returns {Object} Ordered steps with dependency information
   */
  generateStepOrdering(files) {
    const fileSet = new Set(files);
    const ordered = [];
    const visited = new Set();
    const processing = new Set();
    const cycles = [];

    const visit = (file) => {
      if (visited.has(file)) return;
      if (processing.has(file)) {
        // Circular dependency detected
        cycles.push(file);
        return;
      }

      processing.add(file);
      
      // Visit dependencies first
      const deps = this.dependencyGraph.get(file) || new Set();
      for (const dep of deps) {
        if (fileSet.has(dep.file)) {
          visit(dep.file);
        }
      }

      processing.delete(file);
      visited.add(file);
      ordered.push(file);
    };

    // Process all files
    for (const file of files) {
      visit(file);
    }

    return {
      orderedSteps: ordered,
      parallelizable: this.identifyParallelizableSteps(ordered),
      criticalPath: this.calculateCriticalPath(ordered),
      cyclicDependencies: cycles,
      dependencyLevels: this.calculateDependencyLevels(ordered)
    };
  }

  /**
   * Identify steps that can be executed in parallel
   */
  identifyParallelizableSteps(orderedSteps) {
    const levels = new Map();
    const parallelGroups = [];

    // Calculate dependency levels
    for (const step of orderedSteps) {
      const deps = this.dependencyGraph.get(step) || new Set();
      let maxLevel = 0;

      for (const dep of deps) {
        if (orderedSteps.includes(dep.file)) {
          maxLevel = Math.max(maxLevel, (levels.get(dep.file) || 0) + 1);
        }
      }

      levels.set(step, maxLevel);
    }

    // Group by levels
    const levelGroups = new Map();
    for (const [step, level] of levels) {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level).push(step);
    }

    // Convert to parallel groups
    for (const [level, steps] of levelGroups) {
      if (steps.length > 1) {
        parallelGroups.push({
          level,
          steps,
          maxParallelism: Math.min(steps.length, 4) // Limit parallelism
        });
      }
    }

    return parallelGroups;
  }

  /**
   * Calculate critical path through dependencies
   */
  calculateCriticalPath(orderedSteps) {
    const pathLengths = new Map();
    const criticalPath = [];

    // Calculate longest path to each node
    for (const step of orderedSteps) {
      const deps = this.dependencyGraph.get(step) || new Set();
      let maxPath = 0;
      let criticalPredecessor = null;

      for (const dep of deps) {
        if (orderedSteps.includes(dep.file)) {
          const depPath = pathLengths.get(dep.file) || 0;
          if (depPath + 1 > maxPath) {
            maxPath = depPath + 1;
            criticalPredecessor = dep.file;
          }
        }
      }

      pathLengths.set(step, maxPath);
    }

    // Find the step with the longest path
    let maxLength = 0;
    let endNode = null;
    for (const [step, length] of pathLengths) {
      if (length > maxLength) {
        maxLength = length;
        endNode = step;
      }
    }

    // Reconstruct critical path
    let current = endNode;
    while (current) {
      criticalPath.unshift(current);
      const deps = this.dependencyGraph.get(current) || new Set();
      let next = null;
      let maxPath = -1;

      for (const dep of deps) {
        if (orderedSteps.includes(dep.file)) {
          const depPath = pathLengths.get(dep.file) || 0;
          if (depPath > maxPath) {
            maxPath = depPath;
            next = dep.file;
          }
        }
      }

      current = next;
    }

    return {
      path: criticalPath,
      length: maxLength,
      estimatedDuration: this.estimatePathDuration(criticalPath)
    };
  }

  /**
   * Calculate dependency levels for visualization
   */
  calculateDependencyLevels(orderedSteps) {
    const levels = new Map();

    for (const step of orderedSteps) {
      const deps = this.dependencyGraph.get(step) || new Set();
      let maxLevel = 0;

      for (const dep of deps) {
        if (orderedSteps.includes(dep.file)) {
          maxLevel = Math.max(maxLevel, (levels.get(dep.file) || 0) + 1);
        }
      }

      levels.set(step, maxLevel);
    }

    return levels;
  }

  /**
   * Estimate duration for a path of steps
   */
  estimatePathDuration(path) {
    // Simple estimation based on file complexity
    return path.length * 2; // 2 hours per step average
  }

  /**
   * Calculate dependency metrics
   */
  calculateDependencyMetrics() {
    const metrics = {
      totalFiles: this.dependencyGraph.size,
      totalDependencies: 0,
      averageDependencies: 0,
      maxDependencies: 0,
      circularDependencies: this.circularDependencies.size,
      isolatedFiles: 0,
      hubFiles: [], // Files with many dependencies
      dependencyDistribution: new Map()
    };

    let totalDeps = 0;
    let maxDeps = 0;

    for (const [file, deps] of this.dependencyGraph) {
      const depCount = deps.size;
      totalDeps += depCount;
      maxDeps = Math.max(maxDeps, depCount);

      if (depCount === 0) {
        metrics.isolatedFiles++;
      }

      if (depCount > 10) {
        metrics.hubFiles.push({ file, dependencies: depCount });
      }

      // Distribution
      const bucket = Math.floor(depCount / 5) * 5;
      const bucketKey = `${bucket}-${bucket + 4}`;
      metrics.dependencyDistribution.set(
        bucketKey, 
        (metrics.dependencyDistribution.get(bucketKey) || 0) + 1
      );
    }

    metrics.totalDependencies = totalDeps;
    metrics.averageDependencies = metrics.totalFiles > 0 ? totalDeps / metrics.totalFiles : 0;
    metrics.maxDependencies = maxDeps;

    // Sort hub files by dependency count
    metrics.hubFiles.sort((a, b) => b.dependencies - a.dependencies);

    return metrics;
  }

  /**
   * Generate resolution suggestions for dependency issues
   */
  generateResolutionSuggestions() {
    const suggestions = [];

    // Suggestions for circular dependencies
    for (const cycle of this.circularDependencies) {
      suggestions.push({
        type: 'circular_dependency',
        severity: 'high',
        description: `Circular dependency detected: ${cycle.chain?.join(' -> ')}`,
        suggestions: cycle.breakSuggestions || [],
        priority: cycle.strength?.classification === 'strong' ? 'critical' : 'high'
      });
    }

    // Suggestions for hub files
    const metrics = this.calculateDependencyMetrics();
    for (const hub of metrics.hubFiles.slice(0, 5)) {
      suggestions.push({
        type: 'high_coupling',
        severity: 'medium',
        description: `File ${hub.file} has ${hub.dependencies} dependencies`,
        suggestions: [
          'Consider breaking into smaller modules',
          'Extract common functionality into utilities',
          'Apply dependency injection pattern'
        ],
        priority: 'medium'
      });
    }

    return suggestions;
  }

  /**
   * Resolve circular dependencies using specified strategy
   */
  resolveCircularDependencies(strategy = null) {
    const resolvedCycles = [];
    const appliedStrategy = strategy || this.options.circularDependencyStrategy;

    for (const cycle of this.circularDependencies) {
      const resolution = this.applyCycleResolutionStrategy(cycle, appliedStrategy);
      resolvedCycles.push(resolution);
    }

    return resolvedCycles;
  }

  /**
   * Apply a specific strategy to resolve a circular dependency
   */
  applyCycleResolutionStrategy(cycle, strategy) {
    switch (strategy) {
      case 'break_weakest':
        return this.breakWeakestLink(cycle);
      case 'extract_interface':
        return this.extractInterface(cycle);
      case 'dependency_injection':
        return this.applyDependencyInjection(cycle);
      default:
        return this.breakWeakestLink(cycle);
    }
  }

  /**
   * Break the weakest link in a circular dependency
   */
  breakWeakestLink(cycle) {
    const suggestions = cycle.breakSuggestions || [];
    if (suggestions.length === 0) return null;

    const weakestLink = suggestions[0]; // Already sorted by effort + risk
    
    return {
      strategy: 'break_weakest',
      targetDependency: weakestLink,
      steps: [
        `Identify the dependency from ${weakestLink.from} to ${weakestLink.to}`,
        `Apply ${weakestLink.strategy} pattern`,
        `Refactor code to remove direct dependency`,
        `Add tests to verify functionality is preserved`,
        `Update documentation`
      ],
      estimatedEffort: weakestLink.effort,
      risk: weakestLink.risk
    };
  }

  /**
   * Extract interface to break circular dependency
   */
  extractInterface(cycle) {
    return {
      strategy: 'extract_interface',
      steps: [
        'Identify common interface between circular dependencies',
        'Extract interface or abstract base class',
        'Refactor dependencies to use interface',
        'Apply dependency inversion principle',
        'Test and validate changes'
      ],
      estimatedEffort: 6,
      risk: 4
    };
  }

  /**
   * Apply dependency injection to resolve circular dependency
   */
  applyDependencyInjection(cycle) {
    return {
      strategy: 'dependency_injection',
      steps: [
        'Identify injectable dependencies',
        'Create dependency injection container',
        'Refactor classes to accept dependencies via constructor',
        'Configure dependency injection mappings',
        'Test dependency resolution'
      ],
      estimatedEffort: 8,
      risk: 5
    };
  }
}