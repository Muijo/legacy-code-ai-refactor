/**
 * MongoDB Refactoring Model
 * Stores refactored code and transformation details
 */

import mongoose from 'mongoose';

const transformationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'syntax_modernization',
      'pattern_implementation',
      'performance_optimization',
      'security_hardening',
      'code_structure',
      'dependency_update',
      'async_conversion',
      'type_safety',
      'error_handling'
    ]
  },
  description: String,
  before: {
    code: String,
    line: Number
  },
  after: {
    code: String,
    line: Number
  },
  impact: {
    type: String,
    enum: ['low', 'medium', 'high']
  },
  automated: Boolean
});

const testResultSchema = new mongoose.Schema({
  framework: {
    type: String,
    enum: ['vitest', 'jest', 'mocha', 'junit', 'pytest']
  },
  totalTests: Number,
  passedTests: Number,
  failedTests: Number,
  skippedTests: Number,
  coverage: {
    statements: Number,
    branches: Number,
    functions: Number,
    lines: Number
  },
  duration: Number,
  testSuite: String,
  failures: [{
    testName: String,
    error: String,
    expected: mongoose.Schema.Types.Mixed,
    actual: mongoose.Schema.Types.Mixed
  }]
});

const refactoringSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    required: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  originalFilePath: {
    type: String,
    required: true
  },
  refactoredFilePath: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'testing', 'completed', 'failed', 'rejected'],
    default: 'pending'
  },
  targetLanguage: {
    type: String,
    enum: ['javascript', 'typescript', 'php', 'java', 'python', 'same'],
    default: 'same'
  },
  modernizationLevel: {
    type: String,
    enum: ['minimal', 'moderate', 'aggressive'],
    default: 'moderate'
  },
  originalCode: {
    content: String,
    hash: String,
    size: Number
  },
  refactoredCode: {
    content: String,
    hash: String,
    size: Number
  },
  transformations: [transformationSchema],
  improvements: {
    qualityScore: {
      before: Number,
      after: Number,
      improvement: Number
    },
    complexity: {
      before: Number,
      after: Number,
      improvement: Number
    },
    performance: {
      estimatedImprovement: String,
      metrics: mongoose.Schema.Types.Mixed
    },
    security: {
      vulnerabilitiesFixed: Number,
      hardeningApplied: [String]
    },
    maintainability: {
      before: Number,
      after: Number
    }
  },
  generatedTests: {
    enabled: Boolean,
    testFilePath: String,
    framework: String,
    testCount: Number,
    coverage: {
      statements: Number,
      branches: Number,
      functions: Number,
      lines: Number
    }
  },
  validation: {
    behaviorPreserved: Boolean,
    syntaxValid: Boolean,
    testsPass: Boolean,
    performanceAcceptable: Boolean,
    manualReviewRequired: Boolean,
    validationErrors: [String]
  },
  testResults: testResultSchema,
  aiMetadata: {
    model: String,
    promptTokens: Number,
    completionTokens: Number,
    temperature: Number,
    reasoning: String
  },
  userFeedback: {
    approved: Boolean,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    modifications: [{
      line: Number,
      original: String,
      modified: String,
      reason: String
    }]
  },
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
refactoringSchema.index({ projectId: 1, originalFilePath: 1 });
refactoringSchema.index({ analysisId: 1 });
refactoringSchema.index({ status: 1 });
refactoringSchema.index({ 'improvements.qualityScore.improvement': -1 });

// Virtual for success rate
refactoringSchema.virtual('successRate').get(function() {
  if (!this.testResults) return null;
  if (this.testResults.totalTests === 0) return 100;
  
  return Math.round((this.testResults.passedTests / this.testResults.totalTests) * 100);
});

// Virtual for overall improvement
refactoringSchema.virtual('overallImprovement').get(function() {
  if (!this.improvements) return 0;
  
  const improvements = [];
  
  if (this.improvements.qualityScore?.improvement) {
    improvements.push(this.improvements.qualityScore.improvement);
  }
  
  if (this.improvements.complexity?.before && this.improvements.complexity?.after) {
    const complexityImprovement = 
      ((this.improvements.complexity.before - this.improvements.complexity.after) / 
       this.improvements.complexity.before) * 100;
    improvements.push(complexityImprovement);
  }
  
  if (this.improvements.maintainability?.before && this.improvements.maintainability?.after) {
    const maintainabilityImprovement = 
      ((this.improvements.maintainability.after - this.improvements.maintainability.before) / 
       this.improvements.maintainability.before) * 100;
    improvements.push(maintainabilityImprovement);
  }
  
  if (improvements.length === 0) return 0;
  
  return Math.round(improvements.reduce((a, b) => a + b, 0) / improvements.length);
});

// Methods
refactoringSchema.methods.updateStatus = async function(status, error = null) {
  this.status = status;
  if (error) {
    this.error = error;
    this.retryCount++;
  }
  return this.save();
};

refactoringSchema.methods.setRefactoredCode = async function(code, metadata = {}) {
  const crypto = await import('crypto');
  
  this.refactoredCode = {
    content: code,
    hash: crypto.createHash('sha256').update(code).digest('hex'),
    size: code.length
  };
  
  if (metadata.transformations) {
    this.transformations = metadata.transformations;
  }
  
  if (metadata.targetLanguage) {
    this.targetLanguage = metadata.targetLanguage;
  }
  
  return this.save();
};

refactoringSchema.methods.setImprovements = async function(improvements) {
  this.improvements = improvements;
  return this.save();
};

refactoringSchema.methods.setTestResults = async function(testResults) {
  this.testResults = testResults;
  
  // Update validation based on test results
  if (testResults.totalTests > 0) {
    this.validation.testsPass = testResults.failedTests === 0;
  }
  
  return this.save();
};

refactoringSchema.methods.setGeneratedTests = async function(testInfo) {
  this.generatedTests = {
    enabled: true,
    ...testInfo
  };
  return this.save();
};

refactoringSchema.methods.setValidation = async function(validation) {
  this.validation = {
    ...this.validation,
    ...validation
  };
  return this.save();
};

refactoringSchema.methods.addUserFeedback = async function(feedback) {
  this.userFeedback = {
    ...this.userFeedback,
    ...feedback,
    timestamp: new Date()
  };
  
  if (feedback.approved) {
    this.status = 'completed';
  } else if (feedback.approved === false) {
    this.status = 'rejected';
  }
  
  return this.save();
};

refactoringSchema.methods.generateSummary = function() {
  return {
    filePath: this.originalFilePath,
    status: this.status,
    targetLanguage: this.targetLanguage,
    modernizationLevel: this.modernizationLevel,
    transformationCount: this.transformations.length,
    overallImprovement: this.overallImprovement,
    testSuccess: this.successRate,
    validation: {
      behaviorPreserved: this.validation.behaviorPreserved,
      testsPass: this.validation.testsPass,
      syntaxValid: this.validation.syntaxValid
    },
    userApproved: this.userFeedback?.approved
  };
};

// Static methods
refactoringSchema.statics.findByProject = function(projectId, options = {}) {
  const query = this.find({ projectId });
  
  if (options.status) {
    query.where('status').equals(options.status);
  }
  
  if (options.approved !== undefined) {
    query.where('userFeedback.approved').equals(options.approved);
  }
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort('-createdAt');
  }
  
  if (options.populate) {
    query.populate(options.populate);
  }
  
  return query.exec();
};

refactoringSchema.statics.getProjectStatistics = async function(projectId) {
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
        approvedFiles: {
          $sum: { $cond: [{ $eq: ['$userFeedback.approved', true] }, 1, 0] }
        },
        averageQualityImprovement: { $avg: '$improvements.qualityScore.improvement' },
        totalTransformations: { $sum: { $size: '$transformations' } },
        averageTestCoverage: { $avg: '$generatedTests.coverage.lines' }
      }
    }
  ]);
  
  return stats[0] || {
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    approvedFiles: 0,
    averageQualityImprovement: 0,
    totalTransformations: 0,
    averageTestCoverage: 0
  };
};

refactoringSchema.statics.getTransformationDistribution = async function(projectId) {
  return this.aggregate([
    { $match: { projectId: mongoose.Types.ObjectId(projectId) } },
    { $unwind: '$transformations' },
    {
      $group: {
        _id: '$transformations.type',
        count: { $sum: 1 },
        highImpact: {
          $sum: { $cond: [{ $eq: ['$transformations.impact', 'high'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

refactoringSchema.statics.getBestImprovements = async function(projectId, limit = 10) {
  return this.find({
    projectId,
    status: 'completed',
    'improvements.qualityScore.improvement': { $gt: 0 }
  })
  .sort('-improvements.qualityScore.improvement')
  .limit(limit)
  .exec();
};

export const Refactoring = mongoose.model('Refactoring', refactoringSchema);