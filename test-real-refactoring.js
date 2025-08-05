#!/usr/bin/env node

/**
 * Test script to verify real refactoring functionality
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

async function testRealRefactoring() {
  console.log('🔍 Testing Real Refactoring System...\n');

  try {
    // 1. Get all projects
    console.log('1️⃣ Fetching existing projects...');
    const projectsResponse = await fetch(`${API_BASE}/projects`);
    const projects = await projectsResponse.json();
    console.log(`   Found ${projects.length} projects`);
    
    // Find demo project
    const demoProject = projects.find(p => p.name.includes('Demo'));
    if (!demoProject) {
      console.error('❌ No demo project found!');
      return;
    }
    
    console.log(`   Using project: ${demoProject.name} (ID: ${demoProject.id})`);
    
    // 2. Check if analysis is complete
    console.log('\n2️⃣ Checking analysis status...');
    if (demoProject.status !== 'analyzed' && demoProject.status !== 'completed') {
      console.log('   Starting analysis...');
      const analysisResponse = await fetch(`${API_BASE}/projects/${demoProject.id}/analyze`, {
        method: 'POST'
      });
      
      if (analysisResponse.ok) {
        console.log('   Analysis started, waiting for completion...');
        
        // Wait for analysis to complete
        await waitForStatus(demoProject.id, 'analyzed', 30000);
      }
    } else {
      console.log('   Analysis already complete');
    }
    
    // 3. Get suggestions
    console.log('\n3️⃣ Fetching modernization suggestions...');
    const suggestionsResponse = await fetch(`${API_BASE}/projects/${demoProject.id}/suggestions`);
    const suggestions = await suggestionsResponse.json();
    console.log(`   Found ${suggestions.length} suggestions`);
    
    if (suggestions.length > 0) {
      console.log('\n   Top suggestions:');
      suggestions.slice(0, 3).forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.title} (Priority: ${s.priority}, Impact: ${s.impact})`);
      });
    }
    
    // 4. Start refactoring with selected suggestions
    console.log('\n4️⃣ Starting refactoring process...');
    const selectedSuggestions = suggestions.slice(0, 3).map(s => s.id); // Select top 3
    
    const refactorResponse = await fetch(`${API_BASE}/projects/${demoProject.id}/refactor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionIds: selectedSuggestions })
    });
    
    if (refactorResponse.ok) {
      console.log('   Refactoring started...');
      
      // Monitor progress
      await monitorProgress(demoProject.id);
      
      // Wait for completion
      await waitForStatus(demoProject.id, 'completed', 60000);
      
      console.log('\n✅ Refactoring completed successfully!');
      
      // 5. Get final project details
      const finalProjectResponse = await fetch(`${API_BASE}/projects/${demoProject.id}`);
      const finalProject = await finalProjectResponse.json();
      
      if (finalProject.results) {
        console.log('\n📊 Refactoring Results:');
        console.log(`   Total steps: ${finalProject.results.summary?.totalSteps || 0}`);
        console.log(`   Completed steps: ${finalProject.results.summary?.completedSteps || 0}`);
        console.log(`   Success rate: ${finalProject.results.summary?.successRate || 0}%`);
        console.log(`   Total changes: ${finalProject.results.summary?.totalChanges || 0}`);
        
        // Show generated files
        if (finalProject.results.steps) {
          console.log('\n📁 Generated Files:');
          finalProject.results.steps.forEach(step => {
            if (step.changes) {
              step.changes.forEach(change => {
                if (change.type === 'file_generated') {
                  console.log(`   ✨ ${change.filePath}`);
                  console.log(`      Lines: ${change.linesChanged || 'N/A'}`);
                  if (change.metrics?.complexityReduction) {
                    console.log(`      Complexity reduction: ${change.metrics.complexityReduction.reduction}`);
                  }
                }
              });
            }
          });
        }
      }
      
      console.log('\n🎉 Real refactoring test completed successfully!');
    } else {
      const error = await refactorResponse.text();
      console.error(`❌ Refactoring failed: ${error}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function waitForStatus(projectId, targetStatus, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const response = await fetch(`${API_BASE}/projects/${projectId}`);
    const project = await response.json();
    
    if (project.status === targetStatus || project.status === 'error') {
      if (project.status === 'error') {
        throw new Error(`Project error: ${project.error}`);
      }
      return project;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Timeout waiting for status: ${targetStatus}`);
}

async function monitorProgress(projectId) {
  console.log('\n📈 Monitoring progress...');
  
  for (let i = 0; i < 10; i++) {
    const response = await fetch(`${API_BASE}/projects/${projectId}`);
    const project = await response.json();
    
    if (project.progress) {
      const { analysis, refactoring, validation } = project.progress;
      console.log(`   Analysis: ${analysis}% | Refactoring: ${refactoring}% | Validation: ${validation}%`);
    }
    
    if (project.status === 'completed' || project.status === 'error') {
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Run the test
testRealRefactoring().catch(console.error);