/**
 * Business logic documentation generator for creating automatic documentation
 * of extracted business components, rules, and their relationships
 */
export class BusinessLogicDocumentationGenerator {
  constructor(options = {}) {
    this.options = {
      outputFormat: options.outputFormat || 'markdown',
      includeCodeExamples: options.includeCodeExamples !== false,
      includeDiagrams: options.includeDiagrams !== false,
      detailLevel: options.detailLevel || 'medium', // low, medium, high
      ...options
    };

    // Documentation templates
    this.templates = {
      markdown: {
        header: '# Business Logic Documentation\n\n',
        section: '## {title}\n\n',
        subsection: '### {title}\n\n',
        businessRule: '**{name}**: {description}\n\n',
        codeBlock: '```{language}\n{code}\n```\n\n',
        list: '- {item}\n',
        table: '| {headers} |\n| {separators} |\n{rows}\n\n'
      },
      html: {
        header: '<h1>Business Logic Documentation</h1>\n',
        section: '<h2>{title}</h2>\n',
        subsection: '<h3>{title}</h3>\n',
        businessRule: '<p><strong>{name}</strong>: {description}</p>\n',
        codeBlock: '<pre><code class="{language}">{code}</code></pre>\n',
        list: '<li>{item}</li>\n',
        table: '<table>\n<thead>\n<tr>{headers}</tr>\n</thead>\n<tbody>\n{rows}\n</tbody>\n</table>\n'
      }
    };

    // Business rule explanation templates
    this.ruleExplanationTemplates = {
      'Validation': {
        template: 'This validation rule ensures that {subject} meets the requirement: {condition}. When this condition is not met, {consequence}.',
        examples: {
          'email_validation': 'user email addresses are properly formatted',
          'age_validation': 'users meet the minimum age requirement',
          'password_validation': 'passwords meet security standards'
        }
      },
      'Calculation': {
        template: 'This calculation rule computes {result} based on {inputs}. The formula applied is: {formula}.',
        examples: {
          'tax_calculation': 'the tax amount based on the order total and tax rate',
          'discount_calculation': 'the discount amount based on customer tier and order value',
          'shipping_calculation': 'shipping costs based on weight, distance, and service level'
        }
      },
      'Authorization': {
        template: 'This authorization rule controls access to {resource} by checking {criteria}. Users must have {requirements} to proceed.',
        examples: {
          'role_check': 'appropriate role permissions',
          'ownership_check': 'ownership of the resource',
          'permission_check': 'specific permission grants'
        }
      },
      'Workflow': {
        template: 'This workflow rule manages the transition from {fromState} to {toState} when {trigger} occurs. This ensures {purpose}.',
        examples: {
          'order_processing': 'proper order lifecycle management',
          'approval_workflow': 'appropriate review and approval processes',
          'status_management': 'consistent state transitions'
        }
      }
    };

    // Domain concept explanation templates
    this.domainExplanationTemplates = {
      'E-commerce': {
        description: 'This system implements e-commerce functionality for online retail operations.',
        keyEntities: ['Product', 'Order', 'Customer', 'Cart', 'Payment'],
        businessProcesses: ['Product Catalog Management', 'Order Processing', 'Payment Processing', 'Inventory Management']
      },
      'Financial': {
        description: 'This system handles financial operations including transactions, accounts, and payments.',
        keyEntities: ['Account', 'Transaction', 'Payment', 'Balance'],
        businessProcesses: ['Transaction Processing', 'Account Management', 'Payment Processing', 'Audit Trail']
      },
      'User Management': {
        description: 'This system manages user accounts, authentication, and authorization.',
        keyEntities: ['User', 'Role', 'Permission', 'Session'],
        businessProcesses: ['User Registration', 'Authentication', 'Authorization', 'Profile Management']
      },
      'Content Management': {
        description: 'This system manages content creation, publication, and organization.',
        keyEntities: ['Content', 'Page', 'Media', 'Category'],
        businessProcesses: ['Content Creation', 'Publication Workflow', 'Content Organization', 'Access Control']
      }
    };
  }

  /**
   * Generate comprehensive business logic documentation
   * @param {Object} semanticAnalysis - Results from semantic analysis
   * @param {Object} options - Generation options
   * @returns {Object} Generated documentation
   */
  async generateDocumentation(semanticAnalysis, options = {}) {
    const mergedOptions = { ...this.options, ...options };
    
    try {
      // Extract business components
      const businessComponents = this.extractBusinessComponents(semanticAnalysis);
      
      // Generate documentation sections
      const sections = [];
      
      // Executive Summary
      sections.push(this.generateExecutiveSummary(businessComponents));
      
      // Domain Overview
      if (semanticAnalysis.domainConcepts && semanticAnalysis.domainConcepts.length > 0) {
        sections.push(this.generateDomainOverview(semanticAnalysis.domainConcepts));
      }
      
      // Business Rules Documentation
      if (semanticAnalysis.businessRules && semanticAnalysis.businessRules.rules) {
        sections.push(this.generateBusinessRulesDocumentation(semanticAnalysis.businessRules));
      }
      
      // Business Logic Components
      if (semanticAnalysis.businessLogicAnalysis) {
        sections.push(this.generateBusinessLogicComponents(semanticAnalysis.businessLogicAnalysis));
      }
      
      // Cross-Cutting Concerns Impact
      if (semanticAnalysis.crossCuttingConcerns && semanticAnalysis.crossCuttingConcerns.concerns) {
        sections.push(this.generateCrossCuttingConcernsImpact(semanticAnalysis.crossCuttingConcerns));
      }
      
      // Dependency Mapping
      sections.push(this.generateDependencyMapping(businessComponents));
      
      // Recommendations
      if (semanticAnalysis.recommendations) {
        sections.push(this.generateRecommendationsSection(semanticAnalysis.recommendations));
      }
      
      // Compile final documentation
      const documentation = this.compileDocumentation(sections, mergedOptions);
      
      return {
        success: true,
        documentation,
        format: mergedOptions.outputFormat,
        sections: sections.length,
        businessComponents: businessComponents.length,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Extract business components from semantic analysis
   */
  extractBusinessComponents(semanticAnalysis) {
    const components = [];

    // Extract from business logic analysis
    if (semanticAnalysis.businessLogicAnalysis) {
      semanticAnalysis.businessLogicAnalysis.businessLogicElements?.forEach(element => {
        components.push({
          type: 'business_logic',
          name: element.name,
          elementType: element.type,
          businessScore: element.businessScore,
          classification: element.classification,
          source: 'business_logic_analysis'
        });
      });
    }

    // Extract from domain concepts
    if (semanticAnalysis.domainConcepts) {
      semanticAnalysis.domainConcepts.forEach(domain => {
        domain.entities?.forEach(entity => {
          components.push({
            type: 'domain_entity',
            name: entity.name,
            domain: domain.domain,
            confidence: entity.confidence,
            occurrences: entity.occurrences,
            source: 'domain_analysis'
          });
        });
      });
    }

    // Extract from business rules
    if (semanticAnalysis.businessRules && semanticAnalysis.businessRules.rules) {
      semanticAnalysis.businessRules.rules.forEach(rule => {
        components.push({
          type: 'business_rule',
          name: rule.description || rule.condition || 'Unnamed Rule',
          category: rule.primaryCategory,
          confidence: rule.confidence,
          complexity: rule.complexity,
          sourceFunction: rule.sourceFunction,
          source: 'business_rules'
        });
      });
    }

    return components;
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary(businessComponents) {
    const businessLogicComponents = businessComponents.filter(c => c.type === 'business_logic').length;
    const domainEntities = businessComponents.filter(c => c.type === 'domain_entity').length;
    const businessRules = businessComponents.filter(c => c.type === 'business_rule').length;

    const summary = {
      title: 'Executive Summary',
      content: [
        `This document provides a comprehensive analysis of the business logic contained within the analyzed codebase.`,
        ``,
        `**Key Findings:**`,
        `- **${businessLogicComponents}** business logic components identified`,
        `- **${domainEntities}** domain entities discovered`,
        `- **${businessRules}** business rules extracted`,
        ``,
        `The analysis reveals the core business functionality and provides insights into the domain model, business rules, and their relationships. This documentation serves as a foundation for understanding the business logic and planning future refactoring or enhancement efforts.`
      ]
    };

    return summary;
  }

  /**
   * Generate domain overview section
   */
  generateDomainOverview(domainConcepts) {
    const content = ['This section provides an overview of the business domains identified in the codebase.', ''];

    domainConcepts.forEach(domain => {
      const template = this.domainExplanationTemplates[domain.domain];
      
      content.push(`### ${domain.domain} Domain`);
      content.push('');
      
      if (template) {
        content.push(template.description);
        content.push('');
        
        content.push('**Key Entities:**');
        domain.entities.forEach(entity => {
          content.push(`- **${entity.name}**: Found ${entity.occurrences} times (confidence: ${Math.round(entity.confidence * 100)}%)`);
        });
        content.push('');
        
        if (domain.businessProcesses && domain.businessProcesses.length > 0) {
          content.push('**Business Processes:**');
          domain.businessProcesses.forEach(process => {
            content.push(`- **${process.name}**: ${Math.round(process.confidence * 100)}% complete`);
          });
          content.push('');
        }
      }
      
      if (domain.relationships && domain.relationships.length > 0) {
        content.push('**Entity Relationships:**');
        domain.relationships.forEach(rel => {
          content.push(`- ${rel.from} ${rel.type} ${rel.to}`);
        });
        content.push('');
      }
    });

    return {
      title: 'Domain Overview',
      content
    };
  }

  /**
   * Generate business rules documentation
   */
  generateBusinessRulesDocumentation(businessRules) {
    const content = ['This section documents the business rules identified in the codebase.', ''];

    // Group rules by category
    const rulesByCategory = {};
    businessRules.rules.forEach(rule => {
      const category = rule.primaryCategory || 'Uncategorized';
      if (!rulesByCategory[category]) {
        rulesByCategory[category] = [];
      }
      rulesByCategory[category].push(rule);
    });

    Object.entries(rulesByCategory).forEach(([category, rules]) => {
      content.push(`### ${category} Rules`);
      content.push('');

      const template = this.ruleExplanationTemplates[category];
      if (template) {
        content.push(template.template.replace(/{[^}]+}/g, '**[specific details]**'));
        content.push('');
      }

      rules.forEach((rule, index) => {
        content.push(`#### Rule ${index + 1}: ${this.generateRuleName(rule)}`);
        content.push('');
        
        // Rule description
        const explanation = this.generateRuleExplanation(rule);
        content.push(explanation);
        content.push('');
        
        // Rule details
        content.push('**Details:**');
        content.push(`- **Source Function**: ${rule.sourceFunction || 'Unknown'}`);
        content.push(`- **Confidence**: ${Math.round((rule.confidence || 0) * 100)}%`);
        content.push(`- **Complexity**: ${rule.complexity || 'Unknown'}`);
        
        if (rule.condition) {
          content.push(`- **Condition**: \`${rule.condition}\``);
        }
        
        content.push('');

        // Code example if available
        if (this.options.includeCodeExamples && rule.location) {
          content.push('**Code Example:**');
          content.push('```javascript');
          content.push(rule.condition || rule.rule || 'Code not available');
          content.push('```');
          content.push('');
        }
      });
    });

    // Rule statistics
    content.push('### Rule Statistics');
    content.push('');
    content.push('| Category | Count | Average Confidence | Average Complexity |');
    content.push('|----------|-------|-------------------|-------------------|');
    
    Object.entries(rulesByCategory).forEach(([category, rules]) => {
      const avgConfidence = rules.reduce((sum, r) => sum + (r.confidence || 0), 0) / rules.length;
      const avgComplexity = rules.reduce((sum, r) => sum + (r.complexity || 0), 0) / rules.length;
      
      content.push(`| ${category} | ${rules.length} | ${Math.round(avgConfidence * 100)}% | ${Math.round(avgComplexity)} |`);
    });
    content.push('');

    return {
      title: 'Business Rules Documentation',
      content
    };
  }

  /**
   * Generate business logic components documentation
   */
  generateBusinessLogicComponents(businessLogicAnalysis) {
    const content = ['This section documents the business logic components identified in the codebase.', ''];

    // Business Logic Elements
    if (businessLogicAnalysis.businessLogicElements && businessLogicAnalysis.businessLogicElements.length > 0) {
      content.push('### Pure Business Logic Components');
      content.push('');
      content.push('These components contain primarily business logic with minimal infrastructure concerns:');
      content.push('');

      businessLogicAnalysis.businessLogicElements.forEach(element => {
        content.push(`#### ${element.name} (${element.type})`);
        content.push('');
        content.push(`- **Business Score**: ${Math.round(element.businessScore * 100)}%`);
        content.push(`- **Classification**: ${element.classification}`);
        content.push(`- **Recommendation**: Extract and preserve this business logic during refactoring`);
        content.push('');
      });
    }

    // Mixed Elements
    if (businessLogicAnalysis.mixedElements && businessLogicAnalysis.mixedElements.length > 0) {
      content.push('### Mixed Business/Infrastructure Components');
      content.push('');
      content.push('These components mix business logic with infrastructure concerns and should be refactored:');
      content.push('');

      businessLogicAnalysis.mixedElements.forEach(element => {
        content.push(`#### ${element.name} (${element.type})`);
        content.push('');
        content.push(`- **Business Score**: ${Math.round(element.businessScore * 100)}%`);
        content.push(`- **Infrastructure Score**: ${Math.round(element.infraScore * 100)}%`);
        content.push(`- **Recommendation**: Separate business logic from infrastructure concerns`);
        content.push('');
      });
    }

    // Infrastructure Elements
    if (businessLogicAnalysis.infrastructureElements && businessLogicAnalysis.infrastructureElements.length > 0) {
      content.push('### Infrastructure Components');
      content.push('');
      content.push('These components are primarily infrastructure-focused:');
      content.push('');

      businessLogicAnalysis.infrastructureElements.forEach(element => {
        content.push(`- **${element.name}** (${element.type}): ${Math.round(element.infraScore * 100)}% infrastructure`);
      });
      content.push('');
    }

    return {
      title: 'Business Logic Components',
      content
    };
  }

  /**
   * Generate cross-cutting concerns impact documentation
   */
  generateCrossCuttingConcernsImpact(crossCuttingConcerns) {
    const content = ['This section analyzes how cross-cutting concerns affect business logic components.', ''];

    if (crossCuttingConcerns.concerns && crossCuttingConcerns.concerns.length > 0) {
      content.push('### Identified Cross-Cutting Concerns');
      content.push('');

      crossCuttingConcerns.concerns.forEach(concern => {
        content.push(`#### ${concern.name} (${concern.category})`);
        content.push('');
        content.push(concern.description);
        content.push('');
        content.push(`- **Severity**: ${concern.severity}`);
        content.push(`- **Affected Elements**: ${concern.affectedElements.length}`);
        content.push(`- **Cross-Cutting Score**: ${Math.round(concern.crossCuttingScore * 100)}%`);
        content.push(`- **Recommendation**: ${concern.recommendation}`);
        content.push('');

        if (concern.hotspots && concern.hotspots.length > 0) {
          content.push('**Hotspots:**');
          concern.hotspots.forEach(hotspot => {
            content.push(`- ${hotspot.name} (${hotspot.type}): ${hotspot.matchCount} occurrences`);
          });
          content.push('');
        }
      });
    }

    // Refactoring recommendations
    if (crossCuttingConcerns.recommendations && crossCuttingConcerns.recommendations.length > 0) {
      content.push('### Refactoring Recommendations');
      content.push('');

      crossCuttingConcerns.recommendations.forEach(rec => {
        content.push(`#### ${rec.strategy}`);
        content.push('');
        content.push(`**Priority**: ${rec.priority}`);
        content.push('');
        content.push(`**Description**: ${rec.description}`);
        content.push('');
        content.push(`**Implementation**: ${rec.implementation}`);
        content.push('');
        content.push('**Benefits:**');
        rec.benefits?.forEach(benefit => {
          content.push(`- ${benefit}`);
        });
        content.push('');
      });
    }

    return {
      title: 'Cross-Cutting Concerns Impact',
      content
    };
  }

  /**
   * Generate dependency mapping
   */
  generateDependencyMapping(businessComponents) {
    const content = ['This section maps the dependencies between business logic components.', ''];

    // Group components by type
    const componentsByType = {};
    businessComponents.forEach(component => {
      if (!componentsByType[component.type]) {
        componentsByType[component.type] = [];
      }
      componentsByType[component.type].push(component);
    });

    content.push('### Component Overview');
    content.push('');
    content.push('| Component Type | Count | Description |');
    content.push('|----------------|-------|-------------|');
    
    Object.entries(componentsByType).forEach(([type, components]) => {
      const description = this.getComponentTypeDescription(type);
      content.push(`| ${type.replace('_', ' ')} | ${components.length} | ${description} |`);
    });
    content.push('');

    // Dependency analysis
    content.push('### Dependency Analysis');
    content.push('');
    content.push('Based on the analysis, the following dependency patterns were identified:');
    content.push('');

    // Business rules dependencies
    const businessRules = businessComponents.filter(c => c.type === 'business_rule');
    if (businessRules.length > 0) {
      const functionDependencies = {};
      businessRules.forEach(rule => {
        if (rule.sourceFunction) {
          if (!functionDependencies[rule.sourceFunction]) {
            functionDependencies[rule.sourceFunction] = [];
          }
          functionDependencies[rule.sourceFunction].push(rule);
        }
      });

      content.push('**Function-Rule Dependencies:**');
      Object.entries(functionDependencies).forEach(([func, rules]) => {
        content.push(`- **${func}**: Contains ${rules.length} business rule(s)`);
        rules.forEach(rule => {
          content.push(`  - ${rule.category}: ${rule.name}`);
        });
      });
      content.push('');
    }

    // Domain entity relationships
    const domainEntities = businessComponents.filter(c => c.type === 'domain_entity');
    if (domainEntities.length > 0) {
      const entitiesByDomain = {};
      domainEntities.forEach(entity => {
        if (!entitiesByDomain[entity.domain]) {
          entitiesByDomain[entity.domain] = [];
        }
        entitiesByDomain[entity.domain].push(entity);
      });

      content.push('**Domain Entity Groupings:**');
      Object.entries(entitiesByDomain).forEach(([domain, entities]) => {
        content.push(`- **${domain} Domain**: ${entities.map(e => e.name).join(', ')}`);
      });
      content.push('');
    }

    return {
      title: 'Dependency Mapping',
      content
    };
  }

  /**
   * Generate recommendations section
   */
  generateRecommendationsSection(recommendations) {
    const content = ['This section provides actionable recommendations for improving the business logic architecture.', ''];

    // Group recommendations by priority
    const recsByPriority = {
      high: recommendations.filter(r => r.priority === 'high'),
      medium: recommendations.filter(r => r.priority === 'medium'),
      low: recommendations.filter(r => r.priority === 'low')
    };

    ['high', 'medium', 'low'].forEach(priority => {
      const recs = recsByPriority[priority];
      if (recs.length > 0) {
        content.push(`### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority Recommendations`);
        content.push('');

        recs.forEach((rec, index) => {
          content.push(`#### ${index + 1}. ${rec.title}`);
          content.push('');
          content.push(rec.description);
          content.push('');
          content.push(`**Suggestion**: ${rec.suggestion}`);
          content.push('');
          
          if (rec.affectedElements && rec.affectedElements.length > 0) {
            content.push('**Affected Elements:**');
            rec.affectedElements.forEach(element => {
              content.push(`- ${element}`);
            });
            content.push('');
          }
        });
      }
    });

    return {
      title: 'Recommendations',
      content
    };
  }

  /**
   * Compile final documentation
   */
  compileDocumentation(sections, options) {
    const template = this.templates[options.outputFormat];
    let documentation = template.header;

    sections.forEach(section => {
      documentation += template.section.replace('{title}', section.title);
      documentation += section.content.join('\n') + '\n\n';
    });

    return documentation;
  }

  // Helper methods
  generateRuleName(rule) {
    if (rule.description) return rule.description.substring(0, 50) + '...';
    if (rule.condition) return `Condition: ${rule.condition.substring(0, 30)}...`;
    return `${rule.primaryCategory} Rule`;
  }

  generateRuleExplanation(rule) {
    const template = this.ruleExplanationTemplates[rule.primaryCategory];
    if (!template) {
      return `This ${rule.primaryCategory?.toLowerCase() || 'business'} rule implements specific business logic requirements.`;
    }

    let explanation = template.template;
    
    // Replace placeholders with actual values
    if (rule.condition) {
      explanation = explanation.replace('{condition}', rule.condition);
      explanation = explanation.replace('{subject}', this.extractSubjectFromCondition(rule.condition));
    }
    
    if (rule.sourceFunction) {
      explanation = explanation.replace('{resource}', rule.sourceFunction);
    }

    // Remove any remaining placeholders
    explanation = explanation.replace(/{[^}]+}/g, '[specific details]');

    return explanation;
  }

  extractSubjectFromCondition(condition) {
    // Simple extraction of subject from condition
    const words = condition.split(/\s+/);
    const subjects = words.filter(word => 
      word.length > 3 && 
      !['this', 'that', 'with', 'from', 'when', 'then'].includes(word.toLowerCase())
    );
    return subjects[0] || 'the data';
  }

  getComponentTypeDescription(type) {
    const descriptions = {
      'business_logic': 'Components containing core business logic',
      'domain_entity': 'Domain model entities and concepts',
      'business_rule': 'Extracted business rules and constraints'
    };
    return descriptions[type] || 'Business components';
  }

  /**
   * Generate documentation for multiple files
   * @param {Array} semanticAnalysisResults - Array of semantic analysis results
   * @param {Object} options - Generation options
   * @returns {Object} Consolidated documentation
   */
  async generateConsolidatedDocumentation(semanticAnalysisResults, options = {}) {
    const consolidatedAnalysis = this.consolidateAnalysisResults(semanticAnalysisResults);
    return await this.generateDocumentation(consolidatedAnalysis, options);
  }

  /**
   * Consolidate multiple semantic analysis results
   */
  consolidateAnalysisResults(results) {
    const consolidated = {
      businessLogicAnalysis: {
        businessLogicElements: [],
        infrastructureElements: [],
        mixedElements: []
      },
      domainConcepts: [],
      businessRules: { rules: [] },
      crossCuttingConcerns: { concerns: [] },
      recommendations: []
    };

    results.forEach(result => {
      if (result.success) {
        // Consolidate business logic analysis
        if (result.businessLogicAnalysis) {
          consolidated.businessLogicAnalysis.businessLogicElements.push(
            ...(result.businessLogicAnalysis.businessLogicElements || [])
          );
          consolidated.businessLogicAnalysis.infrastructureElements.push(
            ...(result.businessLogicAnalysis.infrastructureElements || [])
          );
          consolidated.businessLogicAnalysis.mixedElements.push(
            ...(result.businessLogicAnalysis.mixedElements || [])
          );
        }

        // Consolidate domain concepts
        if (result.domainConcepts) {
          consolidated.domainConcepts.push(...result.domainConcepts);
        }

        // Consolidate business rules
        if (result.businessRules && result.businessRules.rules) {
          consolidated.businessRules.rules.push(...result.businessRules.rules);
        }

        // Consolidate cross-cutting concerns
        if (result.crossCuttingConcerns && result.crossCuttingConcerns.concerns) {
          consolidated.crossCuttingConcerns.concerns.push(...result.crossCuttingConcerns.concerns);
        }

        // Consolidate recommendations
        if (result.recommendations) {
          consolidated.recommendations.push(...result.recommendations);
        }
      }
    });

    // Deduplicate and merge similar items
    consolidated.domainConcepts = this.mergeDomainConcepts(consolidated.domainConcepts);
    consolidated.crossCuttingConcerns.concerns = this.mergeCrossCuttingConcerns(consolidated.crossCuttingConcerns.concerns);

    return consolidated;
  }

  /**
   * Merge similar domain concepts
   */
  mergeDomainConcepts(domainConcepts) {
    const merged = {};
    
    domainConcepts.forEach(concept => {
      if (!merged[concept.domain]) {
        merged[concept.domain] = {
          domain: concept.domain,
          entities: [],
          confidence: 0,
          totalOccurrences: 0
        };
      }
      
      merged[concept.domain].entities.push(...(concept.entities || []));
      merged[concept.domain].confidence = Math.max(merged[concept.domain].confidence, concept.confidence || 0);
      merged[concept.domain].totalOccurrences += concept.totalOccurrences || 0;
    });

    return Object.values(merged);
  }

  /**
   * Merge similar cross-cutting concerns
   */
  mergeCrossCuttingConcerns(concerns) {
    const merged = {};
    
    concerns.forEach(concern => {
      if (!merged[concern.name]) {
        merged[concern.name] = {
          ...concern,
          affectedElements: [...(concern.affectedElements || [])],
          totalOccurrences: concern.totalOccurrences || 0
        };
      } else {
        merged[concern.name].affectedElements.push(...(concern.affectedElements || []));
        merged[concern.name].totalOccurrences += concern.totalOccurrences || 0;
        merged[concern.name].crossCuttingScore = Math.max(
          merged[concern.name].crossCuttingScore,
          concern.crossCuttingScore || 0
        );
      }
    });

    return Object.values(merged);
  }
}