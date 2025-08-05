/**
 * MongoDB MigrationPlan Model
 * Stores migration strategies and execution plans
 */

import mongoose from 'mongoose';

const phaseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  order: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'],
    default: 'pending'
  },
  estimatedDuration: {
    value: Number,
    unit: {
      type: String,
      enum: ['hours', 'days', 'weeks']
    }
  },
  actualDuration: {
    value: Number,
    unit: {
      type: String,
      enum: ['hours', 'days', 'weeks']
    }
  },
  dependencies: [{
    phaseId: String,
    type: {
      type: String,
      enum: ['blocking', 'recommended']
    }
  }],
  tasks: [{
    name: String,
    description: String,
    type: {
      type: String,
      enum: ['analysis', 'refactoring', 'testing', 'deployment', 'validation', 'rollback']
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending'
    },
    assignee: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    estimatedHours: Number,
    actualHours: Number,
    completedAt: Date
  }],
  risks: [{
    type: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    probability: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    mitigation: String,
    contingency: String
  }],
  completedAt: Date
});

const resourceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['developer', 'tester', 'devops', 'architect', 'reviewer']
  },
  name: String,
  allocation: {
    percentage: Number,
    hours: Number
  },
  phases: [String],
  skills: [String]
});

const milestoneSchema = new mongoose.Schema({
  name: String,
  description: String,
  targetDate: Date,
  actualDate: Date,
  criteria: [String],
  status: {
    type: String,
    enum: ['pending', 'achieved', 'missed', 'revised'],
    default: 'pending'
  },
  dependencies: [{
    type: {
      type: String,
      enum: ['phase', 'task', 'external']
    },
    id: String,
    description: String
  }]
});

const migrationPlanSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['draft', 'approved', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'draft'
  },
  strategy: {
    type: {
      type: String,
      enum: ['big_bang', 'incremental', 'parallel_run', 'phased', 'pilot'],
      default: 'incremental'
    },
    description: String,
    rationale: String
  },
  scope: {
    totalFiles: Number,
    totalLinesOfCode: Number,
    languages: [String],
    modules: [{
      name: String,
      fileCount: Number,
      priority: String,
      complexity: String
    }],
    exclusions: [{
      path: String,
      reason: String
    }]
  },
  timeline: {
    startDate: Date,
    endDate: Date,
    actualStartDate: Date,
    actualEndDate: Date,
    bufferPercentage: {
      type: Number,
      default: 20
    }
  },
  phases: [phaseSchema],
  resources: [resourceSchema],
  milestones: [milestoneSchema],
  budget: {
    estimated: {
      hours: Number,
      cost: Number,
      currency: String
    },
    actual: {
      hours: Number,
      cost: Number
    },
    contingency: {
      percentage: Number,
      amount: Number
    }
  },
  risks: [{
    category: {
      type: String,
      enum: ['technical', 'resource', 'timeline', 'quality', 'business']
    },
    description: String,
    impact: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    probability: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    mitigation: String,
    owner: String,
    status: {
      type: String,
      enum: ['identified', 'mitigated', 'accepted', 'escalated'],
      default: 'identified'
    }
  }],
  rollbackPlan: {
    strategy: String,
    triggerCriteria: [String],
    steps: [{
      order: Number,
      action: String,
      responsibility: String,
      estimatedTime: String
    }],
    tested: {
      type: Boolean,
      default: false
    },
    testResults: String
  },
  successCriteria: [{
    metric: String,
    target: String,
    measurement: String,
    achieved: Boolean
  }],
  communicationPlan: {
    stakeholders: [{
      name: String,
      role: String,
      interest: String,
      influence: String,
      communicationFrequency: String
    }],
    channels: [String],
    keyMessages: [String],
    escalationPath: [String]
  },
  approvals: [{
    role: String,
    name: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'conditional'],
      default: 'pending'
    },
    comments: String,
    date: Date
  }],
  lessonsLearned: [{
    phase: String,
    type: {
      type: String,
      enum: ['success', 'challenge', 'improvement']
    },
    description: String,
    recommendation: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
migrationPlanSchema.index({ status: 1 });
migrationPlanSchema.index({ 'timeline.startDate': 1 });
migrationPlanSchema.index({ createdAt: -1 });

// Virtual for progress
migrationPlanSchema.virtual('progress').get(function() {
  if (!this.phases || this.phases.length === 0) return 0;
  
  const completed = this.phases.filter(p => p.status === 'completed').length;
  return Math.round((completed / this.phases.length) * 100);
});

// Virtual for timeline status
migrationPlanSchema.virtual('timelineStatus').get(function() {
  if (!this.timeline.startDate || !this.timeline.endDate) return 'not_started';
  
  const now = new Date();
  const start = new Date(this.timeline.startDate);
  const end = new Date(this.timeline.endDate);
  
  if (now < start) return 'not_started';
  if (now > end) return this.status === 'completed' ? 'completed' : 'overdue';
  
  const totalDuration = end - start;
  const elapsed = now - start;
  const expectedProgress = (elapsed / totalDuration) * 100;
  
  if (this.progress < expectedProgress - 10) return 'behind_schedule';
  if (this.progress > expectedProgress + 10) return 'ahead_of_schedule';
  return 'on_track';
});

// Virtual for risk score
migrationPlanSchema.virtual('riskScore').get(function() {
  if (!this.risks || this.risks.length === 0) return 0;
  
  const riskValues = {
    impact: { low: 1, medium: 2, high: 3, critical: 4 },
    probability: { low: 1, medium: 2, high: 3 }
  };
  
  const totalScore = this.risks.reduce((sum, risk) => {
    const impact = riskValues.impact[risk.impact] || 0;
    const probability = riskValues.probability[risk.probability] || 0;
    return sum + (impact * probability);
  }, 0);
  
  return Math.round(totalScore / this.risks.length);
});

// Methods
migrationPlanSchema.methods.updateStatus = async function(status) {
  this.status = status;
  
  if (status === 'in_progress' && !this.timeline.actualStartDate) {
    this.timeline.actualStartDate = new Date();
  } else if (status === 'completed' && !this.timeline.actualEndDate) {
    this.timeline.actualEndDate = new Date();
  }
  
  return this.save();
};

migrationPlanSchema.methods.updatePhaseStatus = async function(phaseOrder, status) {
  const phase = this.phases.find(p => p.order === phaseOrder);
  if (!phase) {
    throw new Error('Phase not found');
  }
  
  phase.status = status;
  
  if (status === 'completed') {
    phase.completedAt = new Date();
    
    // Auto-start next phase if all dependencies are met
    const nextPhase = this.phases.find(p => 
      p.order === phaseOrder + 1 && 
      p.status === 'pending'
    );
    
    if (nextPhase) {
      const dependenciesMet = nextPhase.dependencies.every(dep => {
        const depPhase = this.phases.find(p => p._id.toString() === dep.phaseId);
        return !depPhase || depPhase.status === 'completed';
      });
      
      if (dependenciesMet) {
        nextPhase.status = 'in_progress';
      }
    }
  }
  
  return this.save();
};

migrationPlanSchema.methods.updateTaskStatus = async function(phaseOrder, taskName, status) {
  const phase = this.phases.find(p => p.order === phaseOrder);
  if (!phase) {
    throw new Error('Phase not found');
  }
  
  const task = phase.tasks.find(t => t.name === taskName);
  if (!task) {
    throw new Error('Task not found');
  }
  
  task.status = status;
  if (status === 'completed') {
    task.completedAt = new Date();
  }
  
  // Check if all tasks in phase are completed
  const allTasksCompleted = phase.tasks.every(t => t.status === 'completed');
  if (allTasksCompleted && phase.status === 'in_progress') {
    phase.status = 'completed';
    phase.completedAt = new Date();
  }
  
  return this.save();
};

migrationPlanSchema.methods.addRisk = async function(risk) {
  this.risks.push(risk);
  return this.save();
};

migrationPlanSchema.methods.updateRiskStatus = async function(riskId, status, mitigation) {
  const risk = this.risks.id(riskId);
  if (!risk) {
    throw new Error('Risk not found');
  }
  
  risk.status = status;
  if (mitigation) {
    risk.mitigation = mitigation;
  }
  
  return this.save();
};

migrationPlanSchema.methods.addLessonLearned = async function(lesson) {
  this.lessonsLearned.push({
    ...lesson,
    addedAt: new Date()
  });
  return this.save();
};

migrationPlanSchema.methods.updateMilestone = async function(milestoneName, status, actualDate) {
  const milestone = this.milestones.find(m => m.name === milestoneName);
  if (!milestone) {
    throw new Error('Milestone not found');
  }
  
  milestone.status = status;
  if (actualDate) {
    milestone.actualDate = actualDate;
  }
  
  return this.save();
};

migrationPlanSchema.methods.generateExecutiveSummary = function() {
  return {
    name: this.name,
    status: this.status,
    strategy: this.strategy.type,
    progress: this.progress,
    timelineStatus: this.timelineStatus,
    riskScore: this.riskScore,
    timeline: {
      planned: {
        start: this.timeline.startDate,
        end: this.timeline.endDate
      },
      actual: {
        start: this.timeline.actualStartDate,
        end: this.timeline.actualEndDate
      }
    },
    phases: {
      total: this.phases.length,
      completed: this.phases.filter(p => p.status === 'completed').length,
      inProgress: this.phases.filter(p => p.status === 'in_progress').length
    },
    budget: {
      estimated: this.budget.estimated.hours,
      actual: this.budget.actual.hours,
      variance: this.budget.actual.hours ? 
        ((this.budget.actual.hours - this.budget.estimated.hours) / this.budget.estimated.hours * 100).toFixed(1) : 
        0
    },
    risks: {
      total: this.risks.length,
      high: this.risks.filter(r => r.impact === 'high' || r.impact === 'critical').length,
      mitigated: this.risks.filter(r => r.status === 'mitigated').length
    },
    milestones: {
      total: this.milestones.length,
      achieved: this.milestones.filter(m => m.status === 'achieved').length,
      upcoming: this.milestones.filter(m => m.status === 'pending').length
    }
  };
};

// Static methods
migrationPlanSchema.statics.findByProject = async function(projectId) {
  return this.findOne({ projectId }).exec();
};

migrationPlanSchema.statics.getActivePlans = async function(options = {}) {
  const query = this.find({
    status: { $in: ['approved', 'in_progress'] }
  });
  
  if (options.dueWithin) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + options.dueWithin);
    query.where('timeline.endDate').lte(dueDate);
  }
  
  return query.sort('timeline.endDate').exec();
};

migrationPlanSchema.statics.getRiskySummary = async function() {
  const plans = await this.find({
    status: { $in: ['in_progress', 'approved'] }
  });
  
  const riskyPlans = plans.filter(plan => {
    const isOverdue = plan.timelineStatus === 'overdue';
    const isBehindSchedule = plan.timelineStatus === 'behind_schedule';
    const hasHighRisk = plan.riskScore > 6;
    
    return isOverdue || isBehindSchedule || hasHighRisk;
  });
  
  return {
    total: plans.length,
    risky: riskyPlans.length,
    overdue: riskyPlans.filter(p => p.timelineStatus === 'overdue').length,
    behindSchedule: riskyPlans.filter(p => p.timelineStatus === 'behind_schedule').length,
    highRisk: riskyPlans.filter(p => p.riskScore > 6).length,
    plans: riskyPlans.map(p => ({
      id: p._id,
      name: p.name,
      project: p.projectId,
      status: p.status,
      timelineStatus: p.timelineStatus,
      riskScore: p.riskScore,
      progress: p.progress
    }))
  };
};

export const MigrationPlan = mongoose.model('MigrationPlan', migrationPlanSchema);