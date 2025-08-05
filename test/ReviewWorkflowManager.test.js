import { describe, it, expect, beforeEach } from 'vitest';
import { ReviewWorkflowManager } from '../src/dashboard/ReviewWorkflowManager.js';

describe('ReviewWorkflowManager', () => {
  let reviewManager;

  beforeEach(() => {
    reviewManager = new ReviewWorkflowManager();
  });

  describe('createReview', () => {
    it('should create a review with correct risk assessment', async () => {
      const refactoringResult = {
        id: 'test-refactor-1',
        projectId: 'test-project-1',
        linesChanged: 50,
        complexityReduction: 2,
        affectsBusinessLogic: false,
        hasExternalDependencies: false,
        modifiesPublicAPI: false,
        confidence: 0.8,
        hasComprehensiveTests: true,
        preservesFunctionality: true,
        changes: ['Updated variable names', 'Extracted helper function'],
        originalCode: 'function oldCode() { return "old"; }',
        refactoredCode: 'function newCode() { return "new"; }'
      };

      const review = await reviewManager.createReview(refactoringResult);

      expect(review).toBeDefined();
      expect(review.id).toBeDefined();
      expect(review.refactoringId).toBe('test-refactor-1');
      expect(review.projectId).toBe('test-project-1');
      expect(review.riskLevel).toBe('low-risk');
      expect(review.status).toBe('auto-approved'); // Should be auto-approved for low risk
    });

    it('should assess high risk correctly', async () => {
      const refactoringResult = {
        id: 'test-refactor-2',
        projectId: 'test-project-1',
        linesChanged: 200,
        complexityReduction: -1,
        affectsBusinessLogic: true,
        hasExternalDependencies: true,
        modifiesPublicAPI: true,
        confidence: 0.6,
        hasComprehensiveTests: false,
        preservesFunctionality: true,
        changes: ['Major refactoring'],
        originalCode: 'complex code',
        refactoredCode: 'refactored complex code'
      };

      const review = await reviewManager.createReview(refactoringResult);

      expect(review.riskLevel).toBe('high-risk');
      expect(review.status).toBe('pending'); // Should require manual review
    });
  });

  describe('assignReviewer', () => {
    it('should assign reviewer with appropriate role', async () => {
      const refactoringResult = {
        id: 'test-refactor-3',
        projectId: 'test-project-1',
        linesChanged: 100,
        affectsBusinessLogic: true,
        confidence: 0.7,
        changes: [],
        originalCode: 'code',
        refactoredCode: 'refactored code'
      };

      const review = await reviewManager.createReview(refactoringResult);
      const updatedReview = await reviewManager.assignReviewer(
        review.id, 
        'reviewer-1', 
        'senior-developer'
      );

      expect(updatedReview.reviewers).toHaveLength(1);
      expect(updatedReview.reviewers[0].id).toBe('reviewer-1');
      expect(updatedReview.reviewers[0].role).toBe('senior-developer');
    });

    it('should reject inappropriate reviewer role', async () => {
      const refactoringResult = {
        id: 'test-refactor-4',
        projectId: 'test-project-1',
        linesChanged: 200,
        affectsBusinessLogic: true,
        modifiesPublicAPI: true,
        confidence: 0.5,
        changes: [],
        originalCode: 'code',
        refactoredCode: 'refactored code'
      };

      const review = await reviewManager.createReview(refactoringResult);

      await expect(
        reviewManager.assignReviewer(review.id, 'reviewer-1', 'junior-developer')
      ).rejects.toThrow('not authorized');
    });
  });

  describe('submitReview', () => {
    it('should handle review approval', async () => {
      const refactoringResult = {
        id: 'test-refactor-5',
        projectId: 'test-project-1',
        linesChanged: 80,
        confidence: 0.75,
        changes: [],
        originalCode: 'code',
        refactoredCode: 'refactored code'
      };

      const review = await reviewManager.createReview(refactoringResult);
      await reviewManager.assignReviewer(review.id, 'reviewer-1', 'developer');

      const updatedReview = await reviewManager.submitReview(
        review.id,
        'reviewer-1',
        'approve',
        [{ content: 'Looks good!', timestamp: new Date().toISOString() }],
        {
          aiAccuracy: 4,
          codeQuality: 4,
          usefulnessRating: 5,
          wouldUseAgain: true,
          comments: 'Great refactoring!'
        }
      );

      expect(updatedReview.status).toBe('approved');
      expect(updatedReview.approvals).toHaveLength(1);
      expect(updatedReview.approvals[0].decision).toBe('approve');
    });

    it('should handle review rejection', async () => {
      const refactoringResult = {
        id: 'test-refactor-6',
        projectId: 'test-project-1',
        linesChanged: 60,
        confidence: 0.7,
        changes: [],
        originalCode: 'code',
        refactoredCode: 'refactored code'
      };

      const review = await reviewManager.createReview(refactoringResult);
      await reviewManager.assignReviewer(review.id, 'reviewer-1', 'developer');

      const updatedReview = await reviewManager.submitReview(
        review.id,
        'reviewer-1',
        'reject',
        [{ content: 'This breaks functionality', timestamp: new Date().toISOString() }],
        {
          aiAccuracy: 2,
          codeQuality: 2,
          usefulnessRating: 1,
          wouldUseAgain: false,
          comments: 'AI made errors'
        }
      );

      expect(updatedReview.status).toBe('rejected');
      expect(updatedReview.rejections).toHaveLength(1);
    });
  });

  describe('generateCodeDiff', () => {
    it('should generate correct diff for code changes', async () => {
      const originalCode = `function oldFunction() {
  var x = 1;
  return x + 1;
}`;

      const refactoredCode = `function newFunction() {
  const x = 1;
  return x + 1;
}`;

      const diff = await reviewManager.generateCodeDiff(originalCode, refactoredCode);

      expect(diff).toHaveLength(2); // Two modified lines
      expect(diff[0].type).toBe('modified');
      expect(diff[0].original).toContain('oldFunction');
      expect(diff[0].refactored).toContain('newFunction');
      expect(diff[1].type).toBe('modified');
      expect(diff[1].original).toContain('var x');
      expect(diff[1].refactored).toContain('const x');
    });
  });

  describe('collectFeedback', () => {
    it('should collect and store feedback', () => {
      const feedback = {
        aiAccuracy: 4,
        codeQuality: 5,
        usefulnessRating: 4,
        wouldUseAgain: true,
        suggestions: ['Better error handling', 'More test coverage'],
        comments: 'Overall good experience'
      };

      const feedbackEntry = reviewManager.collectFeedback('review-1', 'reviewer-1', feedback);

      expect(feedbackEntry).toBeDefined();
      expect(feedbackEntry.reviewId).toBe('review-1');
      expect(feedbackEntry.reviewerId).toBe('reviewer-1');
      expect(feedbackEntry.aiAccuracy).toBe(4);
      expect(feedbackEntry.suggestions).toContain('Better error handling');
    });
  });

  describe('getFeedbackAnalytics', () => {
    it('should calculate feedback analytics correctly', async () => {
      // Add some feedback entries
      reviewManager.collectFeedback('review-1', 'reviewer-1', {
        aiAccuracy: 4,
        codeQuality: 5,
        usefulnessRating: 4,
        wouldUseAgain: true,
        suggestions: ['Better error handling'],
        comments: 'Good'
      });

      reviewManager.collectFeedback('review-2', 'reviewer-2', {
        aiAccuracy: 3,
        codeQuality: 4,
        usefulnessRating: 3,
        wouldUseAgain: false,
        suggestions: ['Better error handling', 'More documentation'],
        comments: 'Okay'
      });

      const analytics = await reviewManager.getFeedbackAnalytics();

      expect(analytics.totalFeedback).toBe(2);
      expect(analytics.averageRatings.aiAccuracy).toBe(3.5);
      expect(analytics.averageRatings.codeQuality).toBe(4.5);
      expect(analytics.satisfactionRate).toBe(50); // 1 out of 2 would use again
      expect(analytics.commonSuggestions[0].suggestion).toBe('Better error handling');
      expect(analytics.commonSuggestions[0].count).toBe(2);
    });
  });
});