/**
 * Local startup script - runs the refactoring system without external services
 */

import { LegacyCodeAnalyzer } from './src/LegacyCodeAnalyzer.js';
import { RefactoringProjectManager } from './src/dashboard/RefactoringProjectManager.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Legacy Code AI Refactoring System ===');
console.log('Starting in local mode (no external services required)\n');

// Create simple web interface
const app = express();
app.use(cors());
app.use(express.json());

// Initialize components
const projectManager = new RefactoringProjectManager();
const analyzer = new LegacyCodeAnalyzer({
  enableCaching: false,  // Disable Redis caching
  enableQualityAssessment: true,
  enableSemanticAnalysis: true
});

// Serve static files
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Legacy Code AI Refactoring</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .header {
      background-color: #2c3e50;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .section {
      background-color: white;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .button {
      background-color: #3498db;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
    }
    .button:hover {
      background-color: #2980b9;
    }
    .code-area {
      background-color: #f8f8f8;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      overflow-x: auto;
    }
    .status {
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
    }
    .status.success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .status.error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .status.info {
      background-color: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }
    .file-list {
      list-style: none;
      padding: 0;
    }
    .file-item {
      padding: 10px;
      margin: 5px 0;
      background-color: #f8f9fa;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    .metric-card {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      text-align: center;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
    }
    .metric-label {
      color: #7f8c8d;
      font-size: 14px;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 Legacy Code AI Refactoring System</h1>
    <p>Transform your legacy code into modern, maintainable applications</p>
  </div>

  <div class="section">
    <h2>Quick Demo</h2>
    <p>Select a demo file or paste your own code to see the refactoring in action:</p>
    
    <select id="demoFile" style="padding: 8px; margin-bottom: 10px;">
      <option value="">-- Select a demo file --</option>
      <option value="user-manager.js">JavaScript: User Manager (Legacy)</option>
      <option value="database.php">PHP: Database Connection (Deprecated)</option>
    </select>
    
    <button class="button" onclick="loadDemo()">Load Demo</button>
    <button class="button" onclick="analyzeCode()">Analyze Code</button>
    <button class="button" onclick="refactorCode()">Refactor Code</button>
    
    <div id="status"></div>
  </div>

  <div class="section">
    <h2>Input Code</h2>
    <textarea id="inputCode" class="code-area" rows="15" style="width: 100%;" placeholder="Paste your legacy code here..."></textarea>
  </div>

  <div class="section" id="analysisSection" style="display: none;">
    <h2>Analysis Results</h2>
    <div class="metrics" id="metrics"></div>
    <div id="analysisDetails" class="code-area" style="margin-top: 20px;"></div>
  </div>

  <div class="section" id="refactoredSection" style="display: none;">
    <h2>Refactored Code</h2>
    <div id="improvements" style="margin-bottom: 20px;"></div>
    <textarea id="outputCode" class="code-area" rows="15" style="width: 100%;" readonly></textarea>
  </div>

  <div class="section" id="testsSection" style="display: none;">
    <h2>Generated Tests</h2>
    <textarea id="testCode" class="code-area" rows="10" style="width: 100%;" readonly></textarea>
  </div>

  <script>
    let currentAnalysis = null;

    async function loadDemo() {
      const select = document.getElementById('demoFile');
      const file = select.value;
      if (!file) return;

      showStatus('Loading demo file...', 'info');
      
      try {
        const response = await fetch('/api/demo/' + file);
        const data = await response.json();
        document.getElementById('inputCode').value = data.code;
        showStatus('Demo file loaded successfully!', 'success');
      } catch (error) {
        showStatus('Error loading demo: ' + error.message, 'error');
      }
    }

    async function analyzeCode() {
      const code = document.getElementById('inputCode').value;
      if (!code.trim()) {
        showStatus('Please enter some code to analyze', 'error');
        return;
      }

      showStatus('Analyzing code...', 'info');
      
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        
        const result = await response.json();
        currentAnalysis = result;
        
        if (result.success) {
          displayAnalysis(result);
          showStatus('Analysis completed successfully!', 'success');
        } else {
          showStatus('Analysis failed: ' + result.error, 'error');
        }
      } catch (error) {
        showStatus('Error: ' + error.message, 'error');
      }
    }

    async function refactorCode() {
      if (!currentAnalysis) {
        showStatus('Please analyze the code first', 'error');
        return;
      }

      showStatus('Refactoring code...', 'info');
      
      try {
        const response = await fetch('/api/refactor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysis: currentAnalysis })
        });
        
        const result = await response.json();
        
        if (result.success) {
          displayRefactoredCode(result);
          showStatus('Refactoring completed successfully!', 'success');
        } else {
          showStatus('Refactoring failed: ' + result.error, 'error');
        }
      } catch (error) {
        showStatus('Error: ' + error.message, 'error');
      }
    }

    function displayAnalysis(analysis) {
      const section = document.getElementById('analysisSection');
      section.style.display = 'block';
      
      // Display metrics
      const metricsDiv = document.getElementById('metrics');
      metricsDiv.innerHTML = \`
        <div class="metric-card">
          <div class="metric-value">\${analysis.metadata.linesOfCode || 0}</div>
          <div class="metric-label">Lines of Code</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">\${analysis.metadata.complexity || 0}</div>
          <div class="metric-label">Complexity</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">\${analysis.quality?.overallScore || 0}/100</div>
          <div class="metric-label">Quality Score</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">\${analysis.quality?.technicalDebtScore || 0}/100</div>
          <div class="metric-label">Technical Debt</div>
        </div>
      \`;
      
      // Display details
      const detailsDiv = document.getElementById('analysisDetails');
      const issues = analysis.quality?.issues || [];
      detailsDiv.innerHTML = \`
        <strong>Language:</strong> \${analysis.language}\\n
        <strong>Parse Time:</strong> \${analysis.parseTime}ms\\n\\n
        <strong>Issues Found:</strong>\\n
        \${issues.map(issue => \`• \${issue.type}: \${issue.description}\`).join('\\n')}
      \`;
    }

    function displayRefactoredCode(result) {
      // Display refactored code
      const refactoredSection = document.getElementById('refactoredSection');
      refactoredSection.style.display = 'block';
      document.getElementById('outputCode').value = result.modernCode.code;
      
      // Display improvements
      const improvementsDiv = document.getElementById('improvements');
      improvementsDiv.innerHTML = \`
        <div class="status success">
          <strong>Improvements Applied:</strong>
          <ul>
            \${result.modernCode.patterns.map(p => \`<li>\${p.name}: \${p.description}</li>\`).join('')}
          </ul>
          <strong>Issues Fixed:</strong> \${result.modernCode.issuesFixed.length}
        </div>
      \`;
      
      // Display tests if generated
      if (result.tests && result.tests.tests.length > 0) {
        const testsSection = document.getElementById('testsSection');
        testsSection.style.display = 'block';
        document.getElementById('testCode').value = result.tests.tests.map(t => t.code).join('\\n\\n');
      }
    }

    function showStatus(message, type) {
      const statusDiv = document.getElementById('status');
      statusDiv.className = 'status ' + type;
      statusDiv.textContent = message;
      
      if (type === 'success' || type === 'error') {
        setTimeout(() => {
          statusDiv.textContent = '';
          statusDiv.className = 'status';
        }, 5000);
      }
    }
  </script>
</body>
</html>
  `);
});

// API Routes
app.get('/api/demo/:file', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'test-project/legacy-code', req.params.file);
    const fs = await import('fs/promises');
    const code = await fs.readFile(filePath, 'utf-8');
    res.json({ code });
  } catch (error) {
    res.status(404).json({ error: 'Demo file not found' });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { code } = req.body;
    
    // Create temporary file
    const tempFile = path.join(__dirname, 'temp', `temp-${Date.now()}.js`);
    const fs = await import('fs/promises');
    
    // Ensure temp directory exists
    await fs.mkdir(path.join(__dirname, 'temp'), { recursive: true });
    await fs.writeFile(tempFile, code);
    
    // Analyze
    const result = await analyzer.analyzeFile(tempFile);
    
    // Clean up
    await fs.unlink(tempFile);
    
    res.json({
      success: result.success,
      language: result.language,
      metadata: result.parsing?.metadata,
      quality: result.quality,
      semantic: result.semantic,
      parseTime: result.parsing?.parseTime,
      error: result.error
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/refactor', async (req, res) => {
  try {
    const { analysis } = req.body;
    
    // Import generators
    const { ModernCodeGenerator } = await import('./src/generation/ModernCodeGenerator.js');
    const { TestGenerator } = await import('./src/generation/TestGenerator.js');
    
    const modernCodeGenerator = new ModernCodeGenerator();
    const testGenerator = new TestGenerator();
    
    // Generate modern code
    const modernCode = await modernCodeGenerator.generateModernCode(analysis, {
      targetLanguage: 'same',
      modernizationLevel: 'moderate',
      preserveComments: true,
      optimizePerformance: true
    });
    
    // Generate tests
    const tests = await testGenerator.generateTestSuite(analysis, modernCode, {
      framework: 'vitest',
      includeEdgeCases: true
    });
    
    res.json({
      success: true,
      modernCode,
      tests
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log('\nOpen your browser and navigate to the URL above to use the system.');
  console.log('\nFeatures available:');
  console.log('- Code analysis with quality metrics');
  console.log('- Automatic code modernization');
  console.log('- Test generation');
  console.log('- Demo files for JavaScript and PHP');
  console.log('\nPress Ctrl+C to stop the server.');
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  await analyzer.cleanup();
  process.exit(0);
});