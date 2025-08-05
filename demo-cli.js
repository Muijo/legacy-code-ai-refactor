/**
 * CLI Demo - Shows the refactoring system in action
 */

import { LegacyCodeAnalyzer } from './src/LegacyCodeAnalyzer.js';
import { ModernCodeGenerator } from './src/generation/ModernCodeGenerator.js';
import { TestGenerator } from './src/generation/TestGenerator.js';
import BehaviorComparisonSystem from './src/validation/BehaviorComparisonSystem.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Disable external services
process.env.DISABLE_REDIS = 'true';
process.env.DISABLE_MONGODB = 'true';

async function runDemo() {
  console.log('🚀 Legacy Code AI Refactoring System - CLI Demo\n');

  // Initialize components (without external services)
  const analyzer = new LegacyCodeAnalyzer({
    enableCaching: false,
    enableQualityAssessment: true,
    enableSemanticAnalysis: true
  });

  const modernCodeGenerator = new ModernCodeGenerator();
  const testGenerator = new TestGenerator();
  const behaviorComparison = new BehaviorComparisonSystem();

  // Demo with JavaScript file
  const jsFile = path.join(__dirname, 'test-project/legacy-code/user-manager.js');
  
  console.log('📄 Processing Legacy JavaScript File');
  console.log('═'.repeat(50));
  
  // Step 1: Analyze
  console.log('\n1️⃣  Analyzing legacy code...');
  const analysis = await analyzer.analyzeFile(jsFile);
  
  if (!analysis.success) {
    console.error('❌ Analysis failed:', analysis.error);
    return;
  }
  
  console.log('✅ Analysis complete!');
  console.log(`   • Language: ${analysis.language}`);
  console.log(`   • Lines: ${analysis.parsing.metadata.linesOfCode}`);
  console.log(`   • Complexity: ${analysis.parsing.metadata.complexity}`);
  console.log(`   • Quality Score: ${analysis.quality?.overallScore || 'N/A'}/100`);
  
  if (analysis.quality?.codeSmells?.length > 0) {
    console.log(`   • Code Smells: ${analysis.quality.codeSmells.length} found`);
    analysis.quality.codeSmells.slice(0, 3).forEach(smell => {
      console.log(`     - ${smell.type}: ${smell.description}`);
    });
  }

  // Step 2: Generate Modern Code
  console.log('\n2️⃣  Generating modern code...');
  const modernCode = await modernCodeGenerator.generateModernCode(analysis, {
    targetLanguage: 'same',
    modernizationLevel: 'moderate',
    preserveComments: true,
    optimizePerformance: true
  });

  if (!modernCode.success) {
    console.error('❌ Code generation failed:', modernCode.error);
    return;
  }

  console.log('✅ Modern code generated!');
  console.log(`   • Patterns applied: ${modernCode.patterns?.length || 0}`);
  if (modernCode.patterns?.length > 0) {
    modernCode.patterns.forEach(pattern => {
      console.log(`     - ${pattern.name}: ${pattern.description}`);
    });
  }
  console.log(`   • Issues fixed: ${modernCode.issuesFixed?.length || 0}`);

  // Step 3: Generate Tests
  console.log('\n3️⃣  Generating test suite...');
  const tests = await testGenerator.generateTestSuite(analysis, modernCode, {
    framework: 'vitest',
    includeEdgeCases: true,
    generateMocks: true
  });

  console.log('✅ Tests generated!');
  console.log(`   • Test cases: ${tests.tests.length}`);
  console.log(`   • Coverage: ${tests.estimatedCoverage}%`);
  console.log(`   • Framework: ${tests.framework}`);

  // Step 4: Validate Behavior
  console.log('\n4️⃣  Validating behavior preservation...');
  const validation = await behaviorComparison.compareImplementations(
    analysis,
    modernCode,
    tests
  );

  console.log('✅ Validation complete!');
  console.log(`   • Functional equivalence: ${validation.functionalEquivalence}%`);
  console.log(`   • Performance: ${validation.performanceComparison.relativeSpeed}x`);
  console.log(`   • Side effects preserved: ${validation.sideEffectsValidation.preserved ? 'Yes' : 'No'}`);

  // Save outputs
  console.log('\n5️⃣  Saving outputs...');
  const outputDir = path.join(__dirname, 'demo-output');
  await fs.mkdir(outputDir, { recursive: true });

  // Save modern code
  const modernFile = path.join(outputDir, 'user-manager-modern.js');
  await fs.writeFile(modernFile, modernCode.code);
  console.log(`   • Modern code saved to: ${path.relative(__dirname, modernFile)}`);

  // Save tests
  const testFile = path.join(outputDir, 'user-manager.test.js');
  const testCode = tests.tests.map(t => t.code).join('\n\n');
  await fs.writeFile(testFile, testCode);
  console.log(`   • Tests saved to: ${path.relative(__dirname, testFile)}`);

  // Display sample of modernized code
  console.log('\n📝 Sample of Modernized Code:');
  console.log('─'.repeat(50));
  const codeLines = modernCode.code.split('\n');
  console.log(codeLines.slice(0, 30).join('\n'));
  if (codeLines.length > 30) {
    console.log('\n... (truncated - see full file in demo-output/)');
  }

  // Summary
  console.log('\n✨ Refactoring Summary');
  console.log('═'.repeat(50));
  console.log('Before:');
  console.log('  • Legacy ES5 syntax with var declarations');
  console.log('  • Constructor function pattern');
  console.log('  • Manual validation with alerts');
  console.log('  • XMLHttpRequest for AJAX');
  console.log('  • Global state management');
  
  console.log('\nAfter:');
  console.log('  • Modern ES6+ class syntax');
  console.log('  • Async/await for asynchronous operations');
  console.log('  • Proper error handling with exceptions');
  console.log('  • Fetch API for HTTP requests');
  console.log('  • Encapsulated state management');
  console.log('  • TypeScript-ready with JSDoc types');
  console.log('  • Comprehensive test coverage');

  console.log('\n✅ Demo completed successfully!');
  console.log('\n📁 Check the demo-output/ directory for generated files.');
  console.log('🌐 Visit http://localhost:3001 for the web interface.');

  // Cleanup
  await analyzer.cleanup();
}

// Run the demo
runDemo().catch(error => {
  console.error('\n❌ Demo failed:', error);
  process.exit(1);
});