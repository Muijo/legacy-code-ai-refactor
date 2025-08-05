import { describe, it, expect, beforeEach } from 'vitest';
import { ModernizationSuggestionEngine } from '../src/patterns/ModernizationSuggestionEngine.js';

describe('ModernizationSuggestionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new ModernizationSuggestionEngine();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(engine.options.includeBackwardCompatibility).toBe(true);
      expect(engine.options.riskTolerance).toBe('medium');
      expect(engine.options.prioritizePerformance).toBe(true);
    });

    it('should accept custom options', () => {
      const customEngine = new ModernizationSuggestionEngine({
        riskTolerance: 'high',
        includeBackwardCompatibility: false
      });

      expect(customEngine.options.riskTolerance).toBe('high');
      expect(customEngine.options.includeBackwardCompatibility).toBe(false);
    });

    it('should initialize modernization rules', () => {
      const stats = engine.getStats();
      expect(stats.modernizationRules).toBeGreaterThan(0);
    });
  });

  describe('Suggestion Generation', () => {
    it('should generate suggestions for God Object pattern', async () => {
      const detectionResults = {
        success: true,
        filePath: 'test.js',
        language: 'javascript',
        antiPatterns: [{
          type: 'anti_pattern',
          name: 'god_object',
          confidence: 0.8,
          severity: 'high',
          indicators: { methodCount: 25, propertyCount: 10, lineCount: 500 }
        }],
        designPatterns: [],
        frameworkPatterns: []
      };

      const result = await engine.generateSuggestions(detectionResults);

      expect(result.success).toBe(true);
      expect(result.modernizationSuggestions.length).toBeGreaterThan(0);
      
      const godObjectSuggestion = result.modernizationSuggestions.find(s => s.patternName === 'god_object');
      expect(godObjectSuggestion).toBeDefined();
      expect(godObjectSuggestion.title).toContain('Break down God Object');
      expect(godObjectSuggestion.benefits).toContain('Improved maintainability and testability');
      expect(godObjectSuggestion.migrationSteps).toBeDefined();
      expect(godObjectSuggestion.codeExample).toBeDefined();
    });

    it('should generate suggestions for Magic Numbers pattern', async () => {
      const detectionResults = {
        success: true,
        filePath: 'test.js',
        language: 'javascript',
        antiPatterns: [{
          type: 'anti_pattern',
          name: 'magic_numbers',
          confidence: 0.7,
          severity: 'medium',
          indicators: { magicNumberCount: 5 }
        }],
        designPatterns: [],
        frameworkPatterns: []
      };

      const result = await engine.generateSuggestions(detectionResults);

      expect(result.success).toBe(true);
      
      const magicNumbersSuggestion = result.modernizationSuggestions.find(s => s.patternName === 'magic_numbers');
      expect(magicNumbersSuggestion).toBeDefined();
      expect(magicNumbersSuggestion.title).toContain('Replace magic numbers');
      expect(magicNumbersSuggestion.effort.score).toBe(1); // Low effort
      expect(magicNumbersSuggestion.backwardCompatibility.compatible).toBe(true);
    });

    it('should generate suggestions for jQuery patterns', async () => {
      const detectionResults = {
        success: true,
        filePath: 'test.js',
        language: 'javascript',
        antiPatterns: [],
        designPatterns: [],
        frameworkPatterns: [{
          type: 'framework_pattern',
          name: 'jquery_dom_manipulation',
          confidence: 0.9,
          severity: 'medium',
          indicators: { jqueryCallCount: 15 }
        }]
      };

      const result = await engine.generateSuggestions(detectionResults);

      expect(result.success).toBe(true);
      
      const jquerySuggestion = result.modernizationSuggestions.find(s => s.patternName === 'jquery_dom_manipulation');
      expect(jquerySuggestion).toBeDefined();
      expect(jquerySuggestion.title).toContain('Migrate from jQuery');
      expect(jquerySuggestion.benefits).toContain('Reduced bundle size');
      expect(jquerySuggestion.codeExample.before).toContain('$');
      expect(jquerySuggestion.codeExample.after).toContain('querySelector');
    });

    it('should handle multiple patterns and rank suggestions', async () => {
      const detectionResults = {
        success: true,
        filePath: 'test.js',
        language: 'javascript',
        antiPatterns: [
          {
            type: 'anti_pattern',
            name: 'god_object',
            confidence: 0.8,
            severity: 'high',
            indicators: { methodCount: 25, propertyCount: 10 }
          },
          {
            type: 'anti_pattern',
            name: 'magic_numbers',
            confidence: 0.7,
            severity: 'medium',
            indicators: { magicNumberCount: 3 }
          }
        ],
        designPatterns: [],
        frameworkPatterns: []
      };

      const result = await engine.generateSuggestions(detectionResults);

      expect(result.success).toBe(true);
      expect(result.modernizationSuggestions.length).toBe(2);
      
      // Should be ranked by priority (high priority first)
      expect(result.modernizationSuggestions[0].priority).toBe('high');
      expect(result.modernizationSuggestions[0].patternName).toBe('god_object');
    });

    it('should generate generic suggestions for unknown patterns', async () => {
      const detectionResults = {
        success: true,
        filePath: 'test.js',
        language: 'javascript',
        antiPatterns: [{
          type: 'anti_pattern',
          name: 'unknown_pattern',
          confidence: 0.6,
          severity: 'medium'
        }],
        designPatterns: [],
        frameworkPatterns: []
      };

      const result = await engine.generateSuggestions(detectionResults);

      expect(result.success).toBe(true);
      expect(result.modernizationSuggestions.length).toBe(1);
      
      const genericSuggestion = result.modernizationSuggestions[0];
      expect(genericSuggestion.title).toContain('Modernize unknown pattern');
      expect(genericSuggestion.migrationSteps).toBeDefined();
    });
  });

  describe('Ranking and Prioritization', () => {
    it('should rank suggestions by priority, impact, and effort', () => {
      const suggestions = [
        {
          priority: 'low',
          impact: { score: 1 },
          effort: { score: 3 }
        },
        {
          priority: 'high',
          impact: { score: 3 },
          effort: { score: 1 }
        },
        {
          priority: 'medium',
          impact: { score: 2 },
          effort: { score: 2 }
        }
      ];

      const ranked = engine.rankSuggestions(suggestions);

      expect(ranked[0].priority).toBe('high');
      expect(ranked[1].priority).toBe('medium');
      expect(ranked[2].priority).toBe('low');
    });

    it('should rank by impact when priority is the same', () => {
      const suggestions = [
        {
          priority: 'medium',
          impact: { score: 1 },
          effort: { score: 1 }
        },
        {
          priority: 'medium',
          impact: { score: 3 },
          effort: { score: 1 }
        }
      ];

      const ranked = engine.rankSuggestions(suggestions);

      expect(ranked[0].impact.score).toBe(3);
      expect(ranked[1].impact.score).toBe(1);
    });

    it('should rank by effort when priority and impact are the same', () => {
      const suggestions = [
        {
          priority: 'medium',
          impact: { score: 2 },
          effort: { score: 3 }
        },
        {
          priority: 'medium',
          impact: { score: 2 },
          effort: { score: 1 }
        }
      ];

      const ranked = engine.rankSuggestions(suggestions);

      expect(ranked[0].effort.score).toBe(1); // Lower effort first
      expect(ranked[1].effort.score).toBe(3);
    });
  });

  describe('Effort and Impact Estimation', () => {
    it('should estimate effort levels correctly', () => {
      const lowEffort = engine.estimateEffort('low');
      const mediumEffort = engine.estimateEffort('medium');
      const highEffort = engine.estimateEffort('high');

      expect(lowEffort.score).toBe(1);
      expect(mediumEffort.score).toBe(2);
      expect(highEffort.score).toBe(3);

      expect(lowEffort.timeEstimate).toBeDefined();
      expect(mediumEffort.timeEstimate).toBeDefined();
      expect(highEffort.timeEstimate).toBeDefined();
    });

    it('should estimate impact levels correctly', () => {
      const lowImpact = engine.estimateImpact('low');
      const mediumImpact = engine.estimateImpact('medium');
      const highImpact = engine.estimateImpact('high');

      expect(lowImpact.score).toBe(1);
      expect(mediumImpact.score).toBe(2);
      expect(highImpact.score).toBe(3);

      expect(lowImpact.description).toBeDefined();
      expect(mediumImpact.description).toBeDefined();
      expect(highImpact.description).toBeDefined();
    });

    it('should default to medium for unknown levels', () => {
      const unknownEffort = engine.estimateEffort('unknown');
      const unknownImpact = engine.estimateImpact('unknown');

      expect(unknownEffort.score).toBe(2);
      expect(unknownImpact.score).toBe(2);
    });
  });

  describe('Summary Generation', () => {
    it('should generate accurate summary statistics', async () => {
      const detectionResults = {
        success: true,
        filePath: 'test.js',
        language: 'javascript',
        antiPatterns: [
          {
            type: 'anti_pattern',
            name: 'god_object',
            confidence: 0.8,
            severity: 'high',
            indicators: { methodCount: 25, propertyCount: 10 }
          },
          {
            type: 'anti_pattern',
            name: 'magic_numbers',
            confidence: 0.7,
            severity: 'medium',
            indicators: { magicNumberCount: 3 }
          }
        ],
        designPatterns: [],
        frameworkPatterns: []
      };

      const result = await engine.generateSuggestions(detectionResults);

      expect(result.summary.totalSuggestions).toBe(2);
      expect(result.summary.highPrioritySuggestions).toBe(1);
      expect(result.summary.mediumPrioritySuggestions).toBe(1);
      expect(result.summary.lowPrioritySuggestions).toBe(0);
      expect(result.summary.estimatedEffort).toBeGreaterThan(0);
      expect(result.summary.potentialImpact).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid detection results gracefully', async () => {
      const invalidResults = {
        success: false,
        error: 'Detection failed'
      };

      const result = await engine.generateSuggestions(invalidResults);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle errors in suggestion generators gracefully', async () => {
      // Mock a failing suggestion generator
      engine.modernizationRules.set('failing_pattern', () => {
        throw new Error('Generator failed');
      });

      const detectionResults = {
        success: true,
        filePath: 'test.js',
        language: 'javascript',
        antiPatterns: [{
          type: 'anti_pattern',
          name: 'failing_pattern',
          confidence: 0.8,
          severity: 'high'
        }],
        designPatterns: [],
        frameworkPatterns: []
      };

      const result = await engine.generateSuggestions(detectionResults);

      expect(result.success).toBe(true);
      expect(result.modernizationSuggestions.length).toBe(1);
      
      // Should fall back to generic suggestion
      const suggestion = result.modernizationSuggestions[0];
      expect(suggestion.title).toContain('Modernize failing pattern');
    });
  });

  describe('Configuration Options', () => {
    it('should respect risk tolerance settings', () => {
      const conservativeEngine = new ModernizationSuggestionEngine({
        riskTolerance: 'low'
      });

      const aggressiveEngine = new ModernizationSuggestionEngine({
        riskTolerance: 'high'
      });

      expect(conservativeEngine.options.riskTolerance).toBe('low');
      expect(aggressiveEngine.options.riskTolerance).toBe('high');
    });

    it('should handle backward compatibility preferences', () => {
      const compatibilityEngine = new ModernizationSuggestionEngine({
        includeBackwardCompatibility: true
      });

      const modernEngine = new ModernizationSuggestionEngine({
        includeBackwardCompatibility: false
      });

      expect(compatibilityEngine.options.includeBackwardCompatibility).toBe(true);
      expect(modernEngine.options.includeBackwardCompatibility).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should provide engine statistics', () => {
      const stats = engine.getStats();

      expect(stats).toBeDefined();
      expect(stats.modernizationRules).toBeGreaterThan(0);
      expect(stats.riskTolerance).toBe('medium');
      expect(stats.includeBackwardCompatibility).toBe(true);
    });
  });
});