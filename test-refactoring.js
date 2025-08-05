/**
 * Test script to demonstrate the refactoring system
 */

import { LegacyCodeAnalyzer } from './src/LegacyCodeAnalyzer.js';
import { ModernCodeGenerator } from './src/generation/ModernCodeGenerator.js';
import { TestGenerator } from './src/generation/TestGenerator.js';
import BehaviorComparisonSystem from './src/validation/BehaviorComparisonSystem.js';
import { MigrationPlanner } from './src/migration/MigrationPlanner.js';
import { db } from './src/database/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testRefactoringSystem() {
  console.log('=== Legacy Code AI Refactoring System Demo ===\n');

  try {
    // Initialize database connection (optional)
    console.log('1. Initializing database connection...');
    try {
      await db.connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.log('⚠️  Database connection failed, continuing without persistence');
    }

    // Initialize components
    const analyzer = new LegacyCodeAnalyzer({
      enableQualityAssessment: true,
      enableSemanticAnalysis: true,
      enableCaching: true
    });

    const modernCodeGenerator = new ModernCodeGenerator();
    const testGenerator = new TestGenerator();
    const behaviorComparison = new BehaviorComparisonSystem();
    const migrationPlanner = new MigrationPlanner();

    // Test files
    const testFiles = [
      path.join(__dirname, 'test-project/legacy-code/user-manager.js'),
      path.join(__dirname, 'test-project/legacy-code/database.php')
    ];

    console.log('\n2. Analyzing legacy code files...');
    
    for (const filePath of testFiles) {
      console.log(`\n📄 Processing: ${path.basename(filePath)}`);
      console.log('─'.repeat(50));

      // Step 1: Analyze the legacy code
      console.log('🔍 Analyzing code...');
      const analysisResult = await analyzer.analyzeFile(filePath);
      
      if (!analysisResult.success) {
        console.error(`❌ Analysis failed: ${analysisResult.error}`);
        continue;
      }

      console.log(`✅ Analysis completed in ${analysisResult.parsing.parseTime}ms`);
      console.log(`   Language: ${analysisResult.language}`);
      console.log(`   Lines of Code: ${analysisResult.parsing.metadata.linesOfCode}`);
      console.log(`   Complexity: ${analysisResult.parsing.metadata.complexity}`);

      if (analysisResult.quality) {
        console.log(`   Quality Score: ${analysisResult.quality.overallScore}/100`);
        console.log(`   Technical Debt: ${analysisResult.quality.technicalDebtScore}/100`);
      }

      // Step 2: Generate modern code
      console.log('\n🚀 Generating modern code...');
      const modernCode = await modernCodeGenerator.generateModernCode(analysisResult, {
        targetLanguage: 'same',
        modernizationLevel: 'moderate',
        preserveComments: true,
        optimizePerformance: true
      });

      if (!modernCode.success) {
        console.error(`❌ Code generation failed: ${modernCode.error}`);
        continue;
      }

      console.log('✅ Modern code generated successfully');
      console.log(`   Patterns applied: ${modernCode.patterns.length}`);
      console.log(`   Issues fixed: ${modernCode.issuesFixed.length}`);

      // Step 3: Generate tests
      console.log('\n🧪 Generating test suite...');
      const testSuite = await testGenerator.generateTestSuite(analysisResult, modernCode, {
        framework: 'vitest',
        includeEdgeCases: true,
        generateMocks: true
      });

      console.log('✅ Test suite generated');
      console.log(`   Test cases: ${testSuite.tests.length}`);
      console.log(`   Estimated coverage: ${testSuite.estimatedCoverage}%`);

      // Step 4: Compare behavior
      console.log('\n🔄 Validating behavior preservation...');
      const behaviorValidation = await behaviorComparison.compareImplementations(
        analysisResult,
        modernCode,
        testSuite
      );

      console.log('✅ Behavior validation completed');
      console.log(`   Functional equivalence: ${behaviorValidation.functionalEquivalence}%`);
      console.log(`   Performance: ${behaviorValidation.performanceComparison.relativeSpeed}x`);
      console.log(`   Side effects preserved: ${behaviorValidation.sideEffectsValidation.preserved ? 'Yes' : 'No'}`);

      // Display sample of modernized code
      console.log('\n📝 Sample of modernized code:');
      console.log('─'.repeat(50));
      const codeLines = modernCode.code.split('\n');
      console.log(codeLines.slice(0, 20).join('\n'));
      if (codeLines.length > 20) {
        console.log('... (truncated)');
      }
    }

    // Create migration plan
    console.log('\n\n3. Creating migration plan...');
    const migrationPlan = await migrationPlanner.createComprehensivePlan(
      testFiles.map(f => ({ filePath: f })),
      {
        strategy: 'incremental',
        parallelExecution: true,
        riskTolerance: 'medium'
      }
    );

    console.log('✅ Migration plan created');
    console.log(`   Total phases: ${migrationPlan.phases.length}`);
    console.log(`   Estimated duration: ${migrationPlan.estimatedDuration.value} ${migrationPlan.estimatedDuration.unit}`);
    console.log(`   Risk assessment: ${migrationPlan.riskAssessment.overallRisk}`);

    console.log('\n📋 Migration phases:');
    migrationPlan.phases.forEach((phase, index) => {
      console.log(`   ${index + 1}. ${phase.name} (${phase.files.length} files)`);
    });

    // Cleanup
    console.log('\n4. Cleaning up...');
    await analyzer.cleanup();
    await db.disconnect();

    console.log('\n✨ Demo completed successfully!');
    console.log('\nTo start the full dashboard, run: npm run dashboard');

  } catch (error) {
    console.error('\n❌ Error during demo:', error);
    process.exit(1);
  }
}

// Run the test
testRefactoringSystem().catch(console.error);