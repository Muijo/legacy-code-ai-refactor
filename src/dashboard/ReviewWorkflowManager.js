import fs from 'fs/promises';
import path from 'path';

export class ReviewWorkflowManager {
  constructor() {
    this.reviews = new Map();
    this.approvalRules = new Map();
    this.feedback = [];
    this.initializeDefaultRules();
  }

  initializeDefaultRules() {
    // Define approval rules for different types of changes
    this.approvalRules.set('high-risk', {
      requiresApproval: true,
      minimumReviewers: 2,
      requiredRoles: ['senior-developer', 'architect'],
      autoApprovalThreshold: 0, // Never auto-approve high-risk changes
      description: 'Changes that affect core business logic or have high complexity'
    });

    this.approvalRules.set('medium-risk', {
      requiresApproval: true,
      minimumReviewers: 1,
      requiredRoles: ['developer', 'senior-developer'],
      autoApprovalThreshold: 0.8, // Auto-approve if confidence > 80%
      description: 'Changes with moderate impact on existing functionality'
    });

    this.approvalRules.set('low-risk', {
      requiresApproval: false,
      minimumReviewers: 0,
      requiredRoles: [],
      autoApprovalThreshold: 0.6, // Auto-approve if confidence > 60%
      description: 'Minor changes like formatting, comments, or simple refactoring'
    });
  }

  async createReview(refactoringResult) {
    const review = {
      id: this.generateId(),
      refactoringId: refactoringResult.id,
      projectId: refactoringResult.projectId,
      status: 'pending',
      riskLevel: this.assessRiskLevel(refactoringResult),
      changes: refactoringResult.changes,
      originalCode: refactoringResult.originalCode,
      refactoredCode: refactoringResult.refactoredCode,
      aiConfidence: refactoringResult.confidence || 0.5,
      createdAt: new Date().toISOString(),
      reviewers: [],
      approvals: [],
      rejections: [],
      comments: [],
      feedback: null
    };

    // Check if auto-approval is possible
    const rule = this.approvalRules.get(review.riskLevel);
    if (review.aiConfidence >= rule.autoApprovalThreshold && !rule.requiresApproval) {
      review.status = 'auto-approved';
      review.approvedAt = new Date().toISOString();
      review.approvedBy = 'system';
    }

    this.reviews.set(review.id, review);
    return review;
  }

  assessRiskLevel(refactoringResult) {
    let riskScore = 0;

    // Factors that increase risk
    if (refactoringResult.linesChanged > 100) riskScore += 2;
    if (refactoringResult.complexityReduction < 0) riskScore += 3;
    if (refactoringResult.affectsBusinessLogic) riskScore += 3;
    if (refactoringResult.hasExternalDependencies) riskScore += 2;
    if (refactoringResult.modifiesPublicAPI) riskScore += 4;
    if (refactoringResult.confidence < 0.7) riskScore += 2;

    // Factors that decrease risk
    if (refactoringResult.hasComprehensiveTests) riskScore -= 1;
    if (refactoringResult.preservesFunctionality) riskScore -= 1;
    if (refactoringResult.confidence > 0.9) riskScore -= 1;

    if (riskScore >= 6) return 'high-risk';
    if (riskScore >= 3) return 'medium-risk';
    return 'low-risk';
  }

  async getReviewsForProject(projectId) {
    return Array.from(this.reviews.values())
      .filter(review => review.projectId === projectId);
  }

  async getPendingReviews(userId = null) {
    const reviews = Array.from(this.reviews.values())
      .filter(review => review.status === 'pending');
    
    // If userId is provided, filter reviews for projects owned by the user
    if (userId) {
      // This would need project ownership check
      // For now, return all pending reviews
      return reviews;
    }
    
    return reviews;
  }

  async getReview(reviewId) {
    const review = this.reviews.get(reviewId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found`);
    }
    return review;
  }

  async assignReviewer(reviewId, reviewerId, reviewerRole) {
    const review = this.reviews.get(reviewId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found`);
    }

    const rule = this.approvalRules.get(review.riskLevel);
    
    // Check if reviewer role is appropriate
    if (rule.requiredRoles.length > 0 && !rule.requiredRoles.includes(reviewerRole)) {
      throw new Error(`Reviewer role ${reviewerRole} not authorized for ${review.riskLevel} changes`);
    }

    // Add reviewer if not already assigned
    if (!review.reviewers.find(r => r.id === reviewerId)) {
      review.reviewers.push({
        id: reviewerId,
        role: reviewerRole,
        assignedAt: new Date().toISOString(),
        status: 'assigned'
      });
    }

    return review;
  }

  async submitReview(reviewId, reviewerId, decision, comments, feedback) {
    const review = this.reviews.get(reviewId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found`);
    }

    const reviewer = review.reviewers.find(r => r.id === reviewerId);
    if (!reviewer) {
      throw new Error(`Reviewer ${reviewerId} not assigned to review ${reviewId}`);
    }

    // Update reviewer status
    reviewer.status = 'completed';
    reviewer.completedAt = new Date().toISOString();

    // Add review decision
    const reviewDecision = {
      reviewerId,
      decision, // 'approve', 'reject', 'request-changes'
      comments,
      submittedAt: new Date().toISOString()
    };

    if (decision === 'approve') {
      review.approvals.push(reviewDecision);
    } else if (decision === 'reject') {
      review.rejections.push(reviewDecision);
    }

    review.comments.push(...comments);

    // Collect feedback for continuous improvement
    if (feedback) {
      this.collectFeedback(reviewId, reviewerId, feedback);
    }

    // Check if review is complete
    await this.checkReviewCompletion(reviewId);

    return review;
  }

  async checkReviewCompletion(reviewId) {
    const review = this.reviews.get(reviewId);
    const rule = this.approvalRules.get(review.riskLevel);

    // Check if minimum reviewers have completed
    const completedReviews = review.reviewers.filter(r => r.status === 'completed').length;
    
    if (completedReviews < rule.minimumReviewers) {
      return; // Still waiting for more reviews
    }

    // Check approval/rejection status
    if (review.rejections.length > 0) {
      review.status = 'rejected';
      review.rejectedAt = new Date().toISOString();
    } else if (review.approvals.length >= rule.minimumReviewers) {
      review.status = 'approved';
      review.approvedAt = new Date().toISOString();
    } else {
      review.status = 'changes-requested';
    }

    return review;
  }

  async generateCodeDiff(originalCode, refactoredCode) {
    // Simple diff generation - in a real implementation, you'd use a proper diff library
    const originalLines = originalCode.split('\n');
    const refactoredLines = refactoredCode.split('\n');
    
    const diff = [];
    const maxLines = Math.max(originalLines.length, refactoredLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const refactoredLine = refactoredLines[i] || '';
      
      if (originalLine !== refactoredLine) {
        if (originalLine && !refactoredLine) {
          diff.push({ type: 'removed', lineNumber: i + 1, content: originalLine });
        } else if (!originalLine && refactoredLine) {
          diff.push({ type: 'added', lineNumber: i + 1, content: refactoredLine });
        } else {
          diff.push({ type: 'modified', lineNumber: i + 1, original: originalLine, refactored: refactoredLine });
        }
      }
    }
    
    return diff;
  }

  async getReviewSummary(reviewId) {
    const review = this.reviews.get(reviewId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found`);
    }

    const diff = await this.generateCodeDiff(review.originalCode, review.refactoredCode);
    
    return {
      ...review,
      diff,
      rule: this.approvalRules.get(review.riskLevel),
      metrics: {
        linesAdded: diff.filter(d => d.type === 'added').length,
        linesRemoved: diff.filter(d => d.type === 'removed').length,
        linesModified: diff.filter(d => d.type === 'modified').length,
        totalChanges: diff.length
      }
    };
  }

  collectFeedback(reviewId, reviewerId, feedback) {
    const feedbackEntry = {
      id: this.generateId(),
      reviewId,
      reviewerId,
      timestamp: new Date().toISOString(),
      aiAccuracy: feedback.aiAccuracy, // 1-5 scale
      codeQuality: feedback.codeQuality, // 1-5 scale
      usefulnessRating: feedback.usefulnessRating, // 1-5 scale
      suggestions: feedback.suggestions || [],
      wouldUseAgain: feedback.wouldUseAgain,
      comments: feedback.comments
    };

    this.feedback.push(feedbackEntry);
    return feedbackEntry;
  }

  async getFeedbackAnalytics() {
    if (this.feedback.length === 0) {
      return {
        totalFeedback: 0,
        averageRatings: {},
        commonSuggestions: [],
        satisfactionRate: 0
      };
    }

    const totalFeedback = this.feedback.length;
    const averageRatings = {
      aiAccuracy: this.feedback.reduce((sum, f) => sum + f.aiAccuracy, 0) / totalFeedback,
      codeQuality: this.feedback.reduce((sum, f) => sum + f.codeQuality, 0) / totalFeedback,
      usefulnessRating: this.feedback.reduce((sum, f) => sum + f.usefulnessRating, 0) / totalFeedback
    };

    // Aggregate common suggestions
    const suggestionCounts = {};
    this.feedback.forEach(f => {
      f.suggestions.forEach(suggestion => {
        suggestionCounts[suggestion] = (suggestionCounts[suggestion] || 0) + 1;
      });
    });

    const commonSuggestions = Object.entries(suggestionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([suggestion, count]) => ({ suggestion, count }));

    const satisfactionRate = this.feedback.filter(f => f.wouldUseAgain).length / totalFeedback;

    return {
      totalFeedback,
      averageRatings,
      commonSuggestions,
      satisfactionRate: Math.round(satisfactionRate * 100)
    };
  }

  async exportReviewData(projectId) {
    const reviews = await this.getReviewsForProject(projectId);
    const analytics = await this.getFeedbackAnalytics();
    
    return {
      project: projectId,
      exportedAt: new Date().toISOString(),
      reviews: reviews.map(review => ({
        id: review.id,
        status: review.status,
        riskLevel: review.riskLevel,
        aiConfidence: review.aiConfidence,
        reviewersCount: review.reviewers.length,
        approvalsCount: review.approvals.length,
        rejectionsCount: review.rejections.length,
        commentsCount: review.comments.length,
        createdAt: review.createdAt,
        completedAt: review.approvedAt || review.rejectedAt
      })),
      analytics
    };
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}