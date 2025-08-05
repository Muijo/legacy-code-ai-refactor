import { parse as babelParse } from '@babel/parser';
import traverse from '@babel/traverse';
const traverseDefault = traverse.default || traverse;
import * as t from '@babel/types';
import { Engine as PhpParser } from 'php-parser';
import { JavaParser } from './JavaParser.js';
import { PythonParser } from './PythonParser.js';
import { readFileSync } from 'fs';
import { extname } from 'path';

/**
 * Multi-language AST parser supporting JavaScript, PHP, Java, and Python
 */
export class MultiLanguageParser {
  constructor() {
    this.phpParser = new PhpParser({
      parser: {
        extractDoc: true,
        php7: true
      },
      ast: {
        withPositions: true
      }
    });
    
    this.javaParser = new JavaParser();
    this.pythonParser = new PythonParser();
  }

  /**
   * Parse code based on file extension or explicit language
   * @param {string} code - Source code to parse
   * @param {string} language - Language type (js, php, java, python)
   * @param {string} filePath - File path for context
   * @returns {Object} AST and metadata
   */
  async parse(code, language, filePath = '') {
    try {
      const detectedLanguage = language || this.detectLanguage(filePath, code);
      
      switch (detectedLanguage) {
        case 'javascript':
        case 'js':
          return this.parseJavaScript(code, filePath);
        case 'php':
          return this.parsePHP(code, filePath);
        case 'java':
          return this.parseJava(code, filePath);
        case 'python':
          return this.parsePython(code, filePath);
        default:
          throw new Error(`Unsupported language: ${detectedLanguage}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        language: language,
        filePath,
        ast: null,
        metadata: {
          parseTime: 0,
          complexity: 0,
          linesOfCode: code.split('\n').length
        }
      };
    }
  }

  /**
   * Parse JavaScript/TypeScript code
   */
  parseJavaScript(code, filePath) {
    const startTime = Date.now();
    
    const ast = babelParse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'asyncGenerators',
        'functionBind',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining'
      ]
    });

    const metadata = this.extractJavaScriptMetadata(ast, code);
    
    return {
      success: true,
      language: 'javascript',
      filePath,
      ast,
      metadata: {
        ...metadata,
        parseTime: Date.now() - startTime
      }
    };
  }

  /**
   * Parse PHP code
   */
  parsePHP(code, filePath) {
    const startTime = Date.now();
    
    const ast = this.phpParser.parseCode(code);
    const metadata = this.extractPHPMetadata(ast, code);
    
    return {
      success: true,
      language: 'php',
      filePath,
      ast,
      metadata: {
        ...metadata,
        parseTime: Date.now() - startTime
      }
    };
  }

  /**
   * Parse Java code using proper Java parser
   */
  parseJava(code, filePath) {
    return this.javaParser.parse(code, filePath);
  }

  /**
   * Parse Python code using proper Python parser
   */
  parsePython(code, filePath) {
    return this.pythonParser.parse(code, filePath);
  }

  /**
   * Detect language from file extension or code patterns
   */
  detectLanguage(filePath, code) {
    const ext = extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.js':
      case '.jsx':
      case '.ts':
      case '.tsx':
        return 'javascript';
      case '.php':
        return 'php';
      case '.java':
        return 'java';
      case '.py':
        return 'python';
      default:
        // Try to detect from code patterns
        if (code.includes('<?php') || code.includes('<?=')) return 'php';
        if (code.includes('public class') && code.includes('static void main')) return 'java';
        if (code.includes('def ') && code.includes('import ')) return 'python';
        return 'javascript'; // Default fallback
    }
  }

  /**
   * Extract metadata from JavaScript AST
   */
  extractJavaScriptMetadata(ast, code) {
    let complexity = 0;
    let functions = 0;
    let classes = 0;
    let imports = 0;
    let exports = 0;

    const self = this;
    traverseDefault(ast, {
      Function(path) {
        functions++;
        complexity += self.calculateCyclomaticComplexity(path.node);
      },
      ClassDeclaration(path) {
        classes++;
      },
      ImportDeclaration(path) {
        imports++;
      },
      ExportDeclaration(path) {
        exports++;
      }
    });

    return {
      linesOfCode: code.split('\n').length,
      complexity,
      functions,
      classes,
      imports,
      exports,
      size: code.length
    };
  }

  /**
   * Extract metadata from PHP AST
   */
  extractPHPMetadata(ast, code) {
    let complexity = 0;
    let functions = 0;
    let classes = 0;

    const traverse = (node) => {
      if (!node || typeof node !== 'object') return;
      
      if (node.kind === 'function') {
        functions++;
        complexity += this.calculatePHPComplexity(node);
      } else if (node.kind === 'class') {
        classes++;
      }

      // Recursively traverse children
      Object.values(node).forEach(child => {
        if (Array.isArray(child)) {
          child.forEach(traverse);
        } else if (child && typeof child === 'object') {
          traverse(child);
        }
      });
    };

    traverse(ast);

    return {
      linesOfCode: code.split('\n').length,
      complexity,
      functions,
      classes,
      size: code.length
    };
  }

  /**
   * Extract metadata from Java AST
   */
  extractJavaMetadata(ast, code) {
    // Simplified Java metadata extraction
    const lines = code.split('\n');
    const methods = (code.match(/\b(public|private|protected)?\s*(static)?\s*\w+\s+\w+\s*\(/g) || []).length;
    const classes = (code.match(/\bclass\s+\w+/g) || []).length;
    
    return {
      linesOfCode: lines.length,
      complexity: methods * 2, // Simplified complexity
      functions: methods,
      classes,
      size: code.length
    };
  }

  /**
   * Extract metadata from Python AST
   */
  extractPythonMetadata(ast, code) {
    const lines = code.split('\n');
    const functions = (code.match(/\bdef\s+\w+/g) || []).length;
    const classes = (code.match(/\bclass\s+\w+/g) || []).length;
    
    return {
      linesOfCode: lines.length,
      complexity: functions * 2, // Simplified complexity
      functions,
      classes,
      size: code.length
    };
  }

  /**
   * Calculate cyclomatic complexity for JavaScript functions
   */
  calculateCyclomaticComplexity(node) {
    let complexity = 1; // Base complexity

    const complexityNodes = [
      'IfStatement',
      'ConditionalExpression',
      'SwitchCase',
      'WhileStatement',
      'DoWhileStatement',
      'ForStatement',
      'ForInStatement',
      'ForOfStatement',
      'CatchClause'
    ];

    const traverse = (node) => {
      if (!node || typeof node !== 'object') return;
      
      if (complexityNodes.includes(node.type)) {
        complexity++;
      }

      Object.values(node).forEach(child => {
        if (Array.isArray(child)) {
          child.forEach(traverse);
        } else if (child && typeof child === 'object') {
          traverse(child);
        }
      });
    };

    traverse(node.body);
    return complexity;
  }

  /**
   * Calculate complexity for PHP functions
   */
  calculatePHPComplexity(node) {
    // Simplified PHP complexity calculation
    return 2; // Base complexity for PHP functions
  }

  /**
   * Simplified Python parsing
   */
  simplePythonParse(lines) {
    return lines.map((line, index) => ({
      type: 'Statement',
      line: index + 1,
      content: line.trim()
    })).filter(stmt => stmt.content.length > 0);
  }

  /**
   * Simplified Java parsing
   */
  simpleJavaParse(lines) {
    return lines.map((line, index) => ({
      type: 'Statement',
      line: index + 1,
      content: line.trim()
    })).filter(stmt => stmt.content.length > 0);
  }
}