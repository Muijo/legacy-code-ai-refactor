import { LegacyCodeAnalyzer } from './LegacyCodeAnalyzer.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main entry point for the Legacy Code AI Refactor system
 */
async function main() {
  console.log('Legacy Code AI Refactor - Analysis Infrastructure');
  console.log('================================================');

  try {
    // Initialize the analyzer with default options
    const analyzer = new LegacyCodeAnalyzer({
      ingestion: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        maxConcurrency: 4,
        supportedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.php', '.java', '.py']
      },
      quality: {
        complexityWeight: 0.3,
        maintainabilityWeight: 0.25,
        testabilityWeight: 0.2,
        readabilityWeight: 0.15,
        performanceWeight: 0.1
      },
      enableQualityAssessment: true,
      enableProgressReporting: true,
      batchSize: 50
    });

    // Example: Analyze a test file
    const testFilePath = join(__dirname, '../test-files/sample.js');
    console.log('\n1. Testing single file analysis...');
    
    try {
      const singleResult = await analyzer.analyzeFile(testFilePath);
      console.log('Single file analysis result:', {
        success: singleResult.success,
        language: singleResult.language,
        complexity: singleResult.parsing?.metadata?.complexity,
        qualityScore: singleResult.quality?.overallScore,
        technicalDebt: singleResult.quality?.technicalDebtScore
      });
    } catch (error) {
      console.log('Single file analysis skipped (test file not found)');
    }

    // Example: Analyze current project directory (limited scope)
    console.log('\n2. Testing codebase analysis...');
    const projectRoot = join(__dirname, '..');
    
    let fileCount = 0;
    let totalComplexity = 0;
    let totalQualityScore = 0;
    let qualityCount = 0;

    for await (const result of analyzer.analyzeCodebase(projectRoot, { 
      maxFiles: 10 // Limit for demo
    })) {
      if (result.type === 'batch_summary') {
        console.log('Batch summary:', result.summary);
        continue;
      }
      
      if (result.type === 'final_summary') {
        console.log('Final summary:', result.summary);
        break;
      }

      if (result.success) {
        fileCount++;
        if (result.parsing?.metadata?.complexity) {
          totalComplexity += result.parsing.metadata.complexity;
        }
        if (result.quality?.overallScore) {
          totalQualityScore += result.quality.overallScore;
          qualityCount++;
        }
        
        console.log(`Analyzed: ${result.filePath} (${result.language}) - Quality: ${result.quality?.overallScore || 'N/A'}`);
      } else {
        console.log(`Error analyzing: ${result.filePath} - ${result.error}`);
      }
    }

    // Display final statistics
    console.log('\n3. Analysis Statistics:');
    console.log('======================');
    console.log(`Files processed: ${fileCount}`);
    console.log(`Average complexity: ${fileCount > 0 ? Math.round(totalComplexity / fileCount) : 0}`);
    console.log(`Average quality score: ${qualityCount > 0 ? Math.round(totalQualityScore / qualityCount) : 0}`);
    
    const stats = analyzer.getStats();
    console.log('System stats:', stats);

    // Cleanup
    await analyzer.cleanup();
    console.log('\nAnalysis completed successfully!');

  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { LegacyCodeAnalyzer };
export default main;