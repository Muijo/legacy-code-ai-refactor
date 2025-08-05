/**
 * Simple Demo - Shows basic refactoring functionality
 */

import { MultiLanguageParser } from './src/parsers/MultiLanguageParser.js';
import { CodeQualityAssessment } from './src/quality/CodeQualityAssessment.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Legacy Code Refactoring - Simple Demo\n');

async function analyzeAndRefactor() {
  // Read the legacy JavaScript file
  const filePath = path.join(__dirname, 'test-project/legacy-code/user-manager.js');
  const code = await fs.readFile(filePath, 'utf-8');
  
  console.log('📄 Original Legacy Code (first 40 lines):');
  console.log('─'.repeat(60));
  console.log(code.split('\n').slice(0, 40).join('\n'));
  console.log('─'.repeat(60));
  
  // Parse the code
  console.log('\n🔍 Analyzing code...');
  const parser = new MultiLanguageParser();
  const parseResult = await parser.parse(code, 'javascript', filePath);
  
  if (!parseResult.success) {
    console.error('❌ Parsing failed:', parseResult.error);
    return;
  }
  
  console.log('✅ Parsing successful!');
  console.log(`   • Lines of code: ${parseResult.metadata.linesOfCode}`);
  console.log(`   • Functions: ${parseResult.metadata.functions}`);
  console.log(`   • Classes: ${parseResult.metadata.classes}`);
  console.log(`   • Complexity: ${parseResult.metadata.complexity}`);
  
  // Assess quality
  console.log('\n📊 Assessing code quality...');
  const qualityAssessment = new CodeQualityAssessment();
  const quality = qualityAssessment.assessQuality(parseResult);
  
  console.log('✅ Quality assessment complete!');
  console.log(`   • Overall Score: ${quality.overallScore}/100`);
  console.log(`   • Maintainability: ${quality.maintainabilityIndex}/100`);
  console.log(`   • Technical Debt: ${quality.technicalDebtScore}/100`);
  
  if (quality.codeSmells.length > 0) {
    console.log('\n⚠️  Code Smells Detected:');
    quality.codeSmells.slice(0, 5).forEach(smell => {
      console.log(`   • ${smell.severity.toUpperCase()}: ${smell.description}`);
    });
  }
  
  // Simple refactoring suggestions
  console.log('\n💡 Refactoring Suggestions:');
  const suggestions = generateSimpleSuggestions(parseResult, quality);
  suggestions.forEach((suggestion, i) => {
    console.log(`   ${i + 1}. ${suggestion}`);
  });
  
  // Generate modernized code sample
  console.log('\n✨ Modernized Code Sample:');
  console.log('─'.repeat(60));
  const modernCode = generateModernSample();
  console.log(modernCode);
  console.log('─'.repeat(60));
  
  console.log('\n✅ Demo completed!');
  console.log('\n📝 Summary:');
  console.log('   • Analyzed legacy JavaScript code');
  console.log('   • Identified quality issues and code smells');
  console.log('   • Generated modernization suggestions');
  console.log('   • Showed sample of modernized code');
  console.log('\n🌐 For full functionality, visit http://localhost:3001');
}

function generateSimpleSuggestions(parseResult, quality) {
  const suggestions = [];
  
  // Basic suggestions based on analysis
  if (parseResult.metadata.complexity > 10) {
    suggestions.push('Break down complex functions into smaller, focused functions');
  }
  
  if (quality.codeSmells.some(s => s.type === 'var_usage')) {
    suggestions.push('Replace var declarations with const/let for better scoping');
  }
  
  suggestions.push('Convert constructor functions to ES6 classes');
  suggestions.push('Use async/await instead of callbacks for asynchronous operations');
  suggestions.push('Replace XMLHttpRequest with modern fetch API');
  suggestions.push('Implement proper error handling with try/catch blocks');
  suggestions.push('Add TypeScript or JSDoc type annotations');
  suggestions.push('Use ES6 modules (import/export) instead of global variables');
  
  return suggestions;
}

function generateModernSample() {
  return `// Modern ES6+ version with class syntax and async/await
  
class UserManager {
  constructor() {
    this.users = new Map();
  }
  
  async addUser({ name, email, age }) {
    // Validation with proper error handling
    this.validateUser({ name, email, age });
    
    const user = {
      id: crypto.randomUUID(),
      name,
      email, 
      age,
      createdAt: new Date().toISOString()
    };
    
    this.users.set(user.id, user);
    console.log('User added:', user);
    
    // Sync with server using modern fetch
    await this.syncWithServer();
    return user;
  }
  
  validateUser({ name, email, age }) {
    if (!name?.trim()) {
      throw new Error('Name is required');
    }
    
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    if (age < 18) {
      throw new Error('User must be 18 or older');
    }
  }
  
  isValidEmail(email) {
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
  }
  
  async syncWithServer() {
    try {
      const response = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          users: Array.from(this.users.values()) 
        })
      });
      
      if (!response.ok) {
        throw new Error('Sync failed');
      }
      
      const data = await response.json();
      console.log('Sync successful:', data);
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  }
}

export default UserManager;`;
}

// Run the demo
analyzeAndRefactor().catch(console.error);