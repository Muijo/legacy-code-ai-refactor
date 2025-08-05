#!/usr/bin/env node

/**
 * Test ModernCodeGenerator directly
 */

import { ModernCodeGenerator } from './src/generation/ModernCodeGenerator.js';
import { LegacyCodeAnalyzer } from './src/LegacyCodeAnalyzer.js';

async function testModernization() {
  console.log('🔍 Testing ModernCodeGenerator directly...\n');

  // Initialize components
  const analyzer = new LegacyCodeAnalyzer({
    enableCaching: false,
    enableQualityAssessment: true,
    enableSemanticAnalysis: true
  });
  
  const generator = new ModernCodeGenerator({
    targetLanguage: 'javascript',
    styleGuide: 'airbnb',
    optimizationLevel: 'moderate'
  });

  // Test file
  const testFile = './test-project/legacy-code/user-manager.js';
  
  try {
    // 1. Analyze the legacy code
    console.log('1️⃣ Analyzing legacy code...');
    const analysisResult = await analyzer.analyzeFile(testFile);
    
    if (!analysisResult.success) {
      console.error('❌ Analysis failed:', analysisResult.error);
      return;
    }
    
    console.log('✅ Analysis successful');
    console.log('   Language:', analysisResult.language);
    console.log('   Lines of code:', analysisResult.codeMetrics?.linesOfCode);
    console.log('   Classes found:', analysisResult.parsing?.classes?.length || 0);
    console.log('   Functions found:', analysisResult.parsing?.functions?.length || 0);
    console.log('   Quality score:', analysisResult.quality?.overallScore);
    
    // Debug: Show what's in the analysis result
    console.log('\n📋 Analysis structure:');
    console.log('   parsing:', Object.keys(analysisResult.parsing || {}));
    console.log('   parsing.ast exists:', !!analysisResult.parsing?.ast);
    console.log('   parsing.metadata:', analysisResult.parsing?.metadata);
    
    // 2. Generate modern code
    console.log('\n2️⃣ Generating modern code...');
    try {
      const generationResult = await generator.generateModernCode(analysisResult, {
        targetLanguage: 'javascript',
        styleGuide: 'airbnb',
        optimizationLevel: 'moderate',
        preserveComments: true,
        generateDocumentation: true
      });
      
      if (!generationResult.success) {
        console.error('❌ Generation failed');
        return;
      }
      
      console.log('✅ Generation successful');
      console.log('   Components generated:', generationResult.metadata.componentsGenerated);
      console.log('   Generated code is array:', Array.isArray(generationResult.generatedCode));
      console.log('   Generated code length:', generationResult.generatedCode.length);
      
      // 3. Show the generated code
      console.log('\n📄 Generated Code:');
      console.log('─'.repeat(60));
      
      if (Array.isArray(generationResult.generatedCode)) {
        const code = generationResult.generatedCode.join('\n\n');
        console.log(code || '(No code generated)');
      } else {
        console.log(generationResult.generatedCode || '(No code generated)');
      }
      
      console.log('─'.repeat(60));
      
      // 4. Show suggestions and warnings
      if (generationResult.suggestions?.length > 0) {
        console.log('\n💡 Improvement Suggestions:');
        generationResult.suggestions.forEach((s, i) => {
          console.log(`   ${i + 1}. ${s.description} (${s.severity})`);
        });
      }
      
      if (generationResult.warnings?.length > 0) {
        console.log('\n⚠️  Warnings:');
        generationResult.warnings.forEach((w, i) => {
          console.log(`   ${i + 1}. ${w.message} (${w.severity})`);
        });
      }
      
      console.log('\n✅ Test completed!');
      
    } catch (genError) {
      console.error('❌ Generation failed:', genError.message);
      console.error('\nStack trace:');
      console.error(genError.stack);
      return;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

// Run the test
testModernization().catch(console.error);