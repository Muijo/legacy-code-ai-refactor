/**
 * MongoDB Project Model
 * Stores refactoring project information and metadata
 */

import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  originalPath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ['javascript', 'php', 'java', 'python', 'unknown'],
    default: 'unknown'
  },
  size: Number,
  linesOfCode: Number,
  uploadedPath: String,
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis'
  },
  refactoringId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Refactoring'
  },
  status: {
    type: String,
    enum: ['pending', 'analyzing', 'analyzed', 'refactoring', 'refactored', 'failed'],
    default: 'pending'
  },
  error: String
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['created', 'analyzing', 'analyzed', 'refactoring', 'completed', 'failed'],
    default: 'created'
  },
  files: [fileSchema],
  settings: {
    targetLanguage: {
      type: String,
      default: 'same'
    },
    modernizationLevel: {
      type: String,
      enum: ['minimal', 'moderate', 'aggressive'],
      default: 'moderate'
    },
    testFramework: {
      type: String,
      enum: ['vitest', 'jest', 'mocha'],
      default: 'vitest'
    },
    enableCaching: {
      type: Boolean,
      default: true
    },
    preserveComments: {
      type: Boolean,
      default: true
    },
    optimizePerformance: {
      type: Boolean,
      default: true
    },
    generateTests: {
      type: Boolean,
      default: true
    },
    includeEdgeCases: {
      type: Boolean,
      default: true
    }
  },
  statistics: {
    totalFiles: {
      type: Number,
      default: 0
    },
    analyzedFiles: {
      type: Number,
      default: 0
    },
    refactoredFiles: {
      type: Number,
      default: 0
    },
    totalLinesOfCode: {
      type: Number,
      default: 0
    },
    averageComplexity: {
      type: Number,
      default: 0
    },
    averageQualityScore: {
      type: Number,
      default: 0
    },
    estimatedTimeHours: {
      type: Number,
      default: 0
    }
  },
  migrationPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MigrationPlan'
  },
  userId: {
    type: String,
    index: true
  },
  tags: [String],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
projectSchema.index({ name: 1, userId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ createdAt: -1 });

// Virtual for progress
projectSchema.virtual('progress').get(function() {
  if (this.statistics.totalFiles === 0) return 0;
  
  const analyzed = (this.statistics.analyzedFiles / this.statistics.totalFiles) * 0.5;
  const refactored = (this.statistics.refactoredFiles / this.statistics.totalFiles) * 0.5;
  
  return Math.round((analyzed + refactored) * 100);
});

// Methods
projectSchema.methods.updateStatistics = async function() {
  const stats = {
    totalFiles: this.files.length,
    analyzedFiles: this.files.filter(f => ['analyzed', 'refactoring', 'refactored'].includes(f.status)).length,
    refactoredFiles: this.files.filter(f => f.status === 'refactored').length,
    totalLinesOfCode: this.files.reduce((sum, f) => sum + (f.linesOfCode || 0), 0)
  };
  
  // Calculate average complexity and quality from analyses
  const analyzedFiles = this.files.filter(f => f.analysisId);
  if (analyzedFiles.length > 0) {
    // Would need to populate and calculate from Analysis documents
    // For now, using placeholder values
    stats.averageComplexity = 10;
    stats.averageQualityScore = 75;
  }
  
  this.statistics = { ...this.statistics, ...stats };
  return this.save();
};

projectSchema.methods.addFile = async function(fileData) {
  this.files.push(fileData);
  await this.updateStatistics();
  return this.files[this.files.length - 1];
};

projectSchema.methods.updateFileStatus = async function(fileId, status, error = null) {
  const file = this.files.id(fileId);
  if (!file) {
    throw new Error('File not found');
  }
  
  file.status = status;
  if (error) {
    file.error = error;
  }
  
  await this.updateStatistics();
  return file;
};

projectSchema.methods.getFileById = function(fileId) {
  return this.files.id(fileId);
};

projectSchema.methods.updateStatus = async function(status) {
  this.status = status;
  return this.save();
};

// Static methods
projectSchema.statics.findByUserId = function(userId, options = {}) {
  const query = this.find({ userId });
  
  if (options.status) {
    query.where('status').equals(options.status);
  }
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort('-createdAt');
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  return query.exec();
};

projectSchema.statics.getProjectStatistics = async function(userId) {
  const stats = await this.aggregate([
    { $match: userId ? { userId } : {} },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalFiles: { $sum: '$statistics.totalFiles' },
        totalLinesOfCode: { $sum: '$statistics.totalLinesOfCode' }
      }
    }
  ]);
  
  const result = {
    total: 0,
    byStatus: {},
    totalFiles: 0,
    totalLinesOfCode: 0
  };
  
  stats.forEach(stat => {
    result.byStatus[stat._id] = stat.count;
    result.total += stat.count;
    result.totalFiles += stat.totalFiles;
    result.totalLinesOfCode += stat.totalLinesOfCode;
  });
  
  return result;
};

export const Project = mongoose.model('Project', projectSchema);