#!/usr/bin/env node

/**
 * Demo script for the Legacy Code AI Refactor Dashboard
 * 
 * This script demonstrates the key features implemented in task 8:
 * - Web-based refactoring dashboard
 * - Progress visualization and status monitoring
 * - Manual intervention points for complex decisions
 * - Code review interface for AI-generated refactoring
 * - Approval workflow for high-risk changes
 * - Feedback collection system for continuous improvement
 */

import { RefactoringProjectManager } from './src/dashboard/RefactoringProjectManager.js';
import { ReviewWorkflowManager } from './src/dashboard/ReviewWorkflowManager.js';

console.log('🚀 Legacy Code AI Refactor Dashboard Demo\n');

// Initialize managers
const projectManager = new RefactoringProjectManager();
const reviewManager = new ReviewWorkflowManager();

async function demonstrateDashboard() {
  console.log('1. Creating a sample refactoring project...');
  
  // Create a sample project
  const project = await projectManager.createProject({
    name: 'Legacy E-commerce Module',
    description: 'Refactoring old PHP e-commerce code to modern standards',
    files: ['./test-files/sample.php', './test-files/sample.js']
  });
  
  console.log(`   ✅ Project created: ${project.name} (ID: ${project.id})`);
  console.log(`   📁 Files: ${project.files.length} files`);
  console.log(`   📊 Status: ${project.status}\n`);

  console.log('2. Simulating analysis progress...');
  
  // Simulate analysis with progress updates
  const progressCallback = (progress) => {
    console.log(`   📈 Analysis Progress: ${progress.progress}% - ${progress.currentFile || 'Processing...'}`);
  };
  
  // Start analysis (this would normally process real files)
  try {
    await projectManager.startAnalysis(project.id, progressCallback);
    console.log('   ✅ Analysis completed!\n');
  } catch (error) {
    console.log(`   ⚠️  Analysis simulation: ${error.message}\n`);
  }

  console.log('3. Demonstrating review workflow...');
  
  // Create a sample refactoring result for review
  const refactoringResult = {
    id: 'refactor-001',
    projectId: project.id,
    linesChanged: 150,
    complexityReduction: 3,
    affectsBusinessLogic: true,
    hasExternalDependencies: false,
    modifiesPublicAPI: false,
    confidence: 0.85,
    hasComprehensiveTests: true,
    preservesFunctionality: true,
    changes: [
      'Converted procedural PHP to object-oriented',
      'Added type hints and return types',
      'Extracted business logic into service classes',
      'Improved error handling'
    ],
    originalCode: `<?php
function process_order($order_data) {
    // Legacy procedural code
    $total = 0;
    foreach($order_data['items'] as $item) {
        $total += $item['price'] * $item['qty'];
    }
    return $total;
}`,
    refactoredCode: `<?php
class OrderProcessor {
    public function processOrder(array $orderData): float {
        $total = 0.0;
        foreach ($orderData['items'] as $item) {
            $total += $this->calculateItemTotal($item);
        }
        return $total;
    }
    
    private function calculateItemTotal(array $item): float {
        return (float)$item['price'] * (int)$item['qty'];
    }
}`
  };

  // Create review
  const review = await reviewManager.createReview(refactoringResult);
  console.log(`   📝 Review created: ${review.id}`);
  console.log(`   🎯 Risk Level: ${review.riskLevel}`);
  console.log(`   🤖 AI Confidence: ${Math.round(review.aiConfidence * 100)}%`);
  console.log(`   📋 Status: ${review.status}\n`);

  // Assign reviewer
  await reviewManager.assignReviewer(review.id, 'senior-dev-001', 'senior-developer');
  console.log('   👤 Reviewer assigned: senior-dev-001 (Senior Developer)');

  // Submit review with feedback
  const reviewDecision = await reviewManager.submitReview(
    review.id,
    'senior-dev-001',
    'approve',
    [
      {
        content: 'Great refactoring! The object-oriented approach is much cleaner.',
        timestamp: new Date().toISOString()
      },
      {
        content: 'Type hints and error handling improvements look good.',
        timestamp: new Date().toISOString()
      }
    ],
    {
      aiAccuracy: 4,
      codeQuality: 5,
      usefulnessRating: 4,
      wouldUseAgain: true,
      suggestions: ['Consider adding unit tests', 'Document the new API'],
      comments: 'AI did a great job with this refactoring. Very impressed!'
    }
  );

  console.log(`   ✅ Review submitted: ${reviewDecision.status}`);
  console.log(`   💬 Comments: ${reviewDecision.comments.length} comments added`);
  console.log(`   📊 Feedback collected for continuous improvement\n`);

  console.log('4. Demonstrating feedback analytics...');
  
  // Add more sample feedback
  reviewManager.collectFeedback('review-002', 'dev-002', {
    aiAccuracy: 3,
    codeQuality: 4,
    usefulnessRating: 3,
    wouldUseAgain: true,
    suggestions: ['Better variable naming', 'More comprehensive tests'],
    comments: 'Good but could be improved'
  });

  const analytics = await reviewManager.getFeedbackAnalytics();
  console.log(`   📈 Total Feedback Entries: ${analytics.totalFeedback}`);
  console.log(`   ⭐ Average AI Accuracy: ${analytics.averageRatings.aiAccuracy.toFixed(1)}/5`);
  console.log(`   🏆 Average Code Quality: ${analytics.averageRatings.codeQuality.toFixed(1)}/5`);
  console.log(`   👍 Satisfaction Rate: ${analytics.satisfactionRate}%`);
  console.log(`   💡 Top Suggestion: ${analytics.commonSuggestions[0]?.suggestion || 'None yet'}\n`);

  console.log('5. Dashboard features summary:');
  console.log('   ✅ Web-based interface for managing refactoring projects');
  console.log('   ✅ Real-time progress visualization and status monitoring');
  console.log('   ✅ Manual intervention points for complex decisions');
  console.log('   ✅ Code review interface with diff visualization');
  console.log('   ✅ Risk-based approval workflow for high-risk changes');
  console.log('   ✅ Comprehensive feedback collection system');
  console.log('   ✅ Analytics for continuous improvement\n');

  console.log('🎉 Dashboard demo completed!');
  console.log('💡 To start the dashboard server, run: npm run dashboard');
  console.log('🌐 Then visit: http://localhost:3000');
}

// Run the demonstration
demonstrateDashboard().catch(console.error);