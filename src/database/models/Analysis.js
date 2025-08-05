/**
 * MongoDB Analysis Model
 * Stores code analysis results and metrics
 */

import mongoose from 'mongoose';

const semanticAnalysisSchema = new mongoose.Schema({
  businessLogic: [{
    type: {
      type: String,
      enum: ['validation', 'calculation', 'transformation', 'workflow', 'integration']
    },
    description: String,
    location: {
      line: Number,
      column: Number,
      endLine: Number,
      endColumn: Number
    },
    confidence: Number,
    relatedFunctions: [String]
  }],
  dataFlow: [{
    variable: String,
    type: String,
    usage: String,
    locations: [{
      line: Number,
      type: String
    }]
  }],
  dependencies: [{
    name: String,
    type: String,
    usage: String,
    critical: Boolean
  }]
});

const qualityMetricsSchema = new mongoose.Schema({
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  maintainabilityIndex: Number,
  codeComplexity: Number,
  technicalDebtScore: Number,
  testCoverage: Number,
  duplicateCodePercentage: Number,
  codeSmells: [{
    type: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    location: {
      line: Number,
      column: Number
    },
    description: String,
    suggestedFix: String
  }],
  securityIssues: [{
    type: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    cwe: String,
    location: {
      line: Number,
      column: Number
    },
    description: String,
    recommendation: String
  }]
});

const analysisSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ['javascript', 'php', 'java', 'python', 'unknown'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'analyzing', 'completed', 'failed'],
    default: 'pending'
  },
  parsing: {
    success: Boolean,
    parseTime: Number,
    astSize: Number,
    error: String
  },
  metadata: {
    linesOfCode: Number,
    complexity: Number,
    functions: Number,
    classes: Number,
    imports: Number,
    exports: Number,
    size: Number
  },
  quality: qualityMetricsSchema,
  semantic: semanticAnalysisSchema,
  patterns: [{
    type: {
      type: String,
      enum: ['singleton', 'factory', 'observer', 'mvc', 'repository', 'other']
    },
    confidence: Number,
    location: String,
    description: String
  }],
  recommendations: [{
    type: {
      type: String,
      enum: ['refactor', 'optimize', 'security', 'modernize', 'test']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    description: String,
    estimatedEffort: String,
    impact: String
  }],
  error: String,
  retryCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
analysisSchema.index({ projectId: 1, filePath: 1 });
analysisSchema.index({ status: 1 });
analysisSchema.index({ 'quality.overallScore': -1 });
analysisSchema.index({ createdAt: -1 });

// Virtual for risk level
analysisSchema.virtual('riskLevel').get(function() {
  if (!this.quality) return 'unknown';
  
  const score = this.quality.overallScore;
  if (score >= 80) return 'low';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'high';
  return 'critical';
});

// Methods
analysisSchema.methods.updateStatus = async function(status, error = null) {
  this.status = status;
  if (error) {
    this.error = error;
    this.retryCount++;
  }
  return this.save();
};

analysisSchema.methods.setParsingResult = async function(parseResult) {
  this.parsing = {
    success: parseResult.success,
    parseTime: parseResult.metadata?.parseTime,
    astSize: JSON.stringify(parseResult.ast || {}).length,
    error: parseResult.error
  };
  
  if (parseResult.metadata) {
    this.metadata = parseResult.metadata;
  }
  
  return this.save();
};

analysisSchema.methods.setQualityMetrics = async function(qualityAssessment) {
  if (qualityAssessment && qualityAssessment.success) {
    this.quality = {
      overallScore: qualityAssessment.overallScore,
      maintainabilityIndex: qualityAssessment.maintainabilityIndex,
      codeComplexity: qualityAssessment.codeComplexity,
      technicalDebtScore: qualityAssessment.technicalDebtScore,
      testCoverage: qualityAssessment.testCoverage || 0,
      duplicateCodePercentage: qualityAssessment.duplicateCodePercentage || 0,
      codeSmells: qualityAssessment.codeSmells || [],
      securityIssues: qualityAssessment.securityIssues || []
    };
  }
  
  return this.save();
};

analysisSchema.methods.setSemanticAnalysis = async function(semanticAnalysis) {
  if (semanticAnalysis && semanticAnalysis.success) {
    this.semantic = {
      businessLogic: semanticAnalysis.businessLogic || [],
      dataFlow: semanticAnalysis.dataFlow || [],
      dependencies: semanticAnalysis.dependencies || []
    };
    
    if (semanticAnalysis.patterns) {
      this.patterns = semanticAnalysis.patterns;
    }
  }
  
  return this.save();
};

analysisSchema.methods.addRecommendation = async function(recommendation) {
  this.recommendations.push(recommendation);
  return this.save();
};

analysisSchema.methods.generateSummary = function() {
  return {
    filePath: this.filePath,
    language: this.language,
    riskLevel: this.riskLevel,
    qualityScore: this.quality?.overallScore || 0,
    complexity: this.metadata?.complexity || 0,
    issues: {
      codeSmells: this.quality?.codeSmells?.length || 0,
      securityIssues: this.quality?.securityIssues?.length || 0,
      highPriorityRecommendations: this.recommendations.filter(r => 
        r.priority === 'high' || r.priority === 'critical'
      ).length
    }
  };
};

// Static methods
analysisSchema.statics.findByProject = function(projectId, options = {}) {
  const query = this.find({ projectId });
  
  if (options.status) {
    query.where('status').equals(options.status);
  }
  
  if (options.riskLevel) {
    // This is a virtual field, so we need to filter post-query
    // or use aggregation pipeline
  }
  
  if (options.language) {
    query.where('language').equals(options.language);
  }
  
  if (options.sort) {
    query.sort(options.sort);
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  return query.exec();
};

analysisSchema.statics.getProjectStatistics = async function(projectId) {
  const stats = await this.aggregate([
    { $match: { projectId: mongoose.Types.ObjectId(projectId) } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        completedFiles: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failedFiles: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        totalLinesOfCode: { $sum: '$metadata.linesOfCode' },
        averageComplexity: { $avg: '$metadata.complexity' },
        averageQualityScore: { $avg: '$quality.overallScore' },
        totalCodeSmells: { $sum: { $size: { $ifNull: ['$quality.codeSmells', []] } } },
        totalSecurityIssues: { $sum: { $size: { $ifNull: ['$quality.securityIssues', []] } } }
      }
    }
  ]);
  
  return stats[0] || {
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    totalLinesOfCode: 0,
    averageComplexity: 0,
    averageQualityScore: 0,
    totalCodeSmells: 0,
    totalSecurityIssues: 0
  };
};

analysisSchema.statics.getLanguageDistribution = async function(projectId) {
  return this.aggregate([
    { $match: { projectId: mongoose.Types.ObjectId(projectId) } },
    {
      $group: {
        _id: '$language',
        count: { $sum: 1 },
        linesOfCode: { $sum: '$metadata.linesOfCode' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

analysisSchema.statics.getHighRiskFiles = async function(projectId, limit = 10) {
  return this.find({
    projectId,
    status: 'completed',
    'quality.overallScore': { $lt: 40 }
  })
  .sort('quality.overallScore')
  .limit(limit)
  .exec();
};

export const Analysis = mongoose.model('Analysis', analysisSchema);