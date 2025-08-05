/**
 * Python Parser Implementation
 * Provides proper Python AST parsing with indentation-aware parsing
 */

export class PythonParser {
  constructor() {
    this.patterns = {
      // Import patterns
      importStatement: /^(?:from\s+([\w.]+)\s+)?import\s+([\w,\s*]+)(?:\s+as\s+(\w+))?$/gm,
      
      // Class patterns
      classDeclaration: /^class\s+(\w+)(?:\s*\(([\w,\s]*)\))?\s*:$/gm,
      
      // Function patterns
      functionDeclaration: /^(?:async\s+)?def\s+(\w+)\s*\((.*?)\)\s*(?:->\s*([\w\[\],\s]+))?\s*:$/gm,
      decoratorPattern: /^@([\w.]+)(?:\s*\((.*?)\))?\s*$/gm,
      
      // Variable patterns
      variableAssignment: /^(\w+)\s*(?::\s*([\w\[\],\s]+))?\s*=\s*(.+)$/gm,
      globalDeclaration: /^global\s+([\w,\s]+)$/gm,
      nonlocalDeclaration: /^nonlocal\s+([\w,\s]+)$/gm,
      
      // Control flow patterns
      ifStatement: /^if\s+(.+):$/gm,
      elifStatement: /^elif\s+(.+):$/gm,
      elseStatement: /^else\s*:$/gm,
      forLoop: /^for\s+(\w+)\s+in\s+(.+):$/gm,
      whileLoop: /^while\s+(.+):$/gm,
      tryStatement: /^try\s*:$/gm,
      exceptStatement: /^except(?:\s+([\w,\s]+))?(?:\s+as\s+(\w+))?\s*:$/gm,
      finallyStatement: /^finally\s*:$/gm,
      withStatement: /^with\s+(.+)\s+as\s+(\w+)\s*:$/gm,
      
      // Other patterns
      returnStatement: /^return(?:\s+(.+))?$/gm,
      yieldStatement: /^yield(?:\s+from)?\s+(.+)$/gm,
      raiseStatement: /^raise(?:\s+(.+))?$/gm,
      assertStatement: /^assert\s+(.+)$/gm,
      passStatement: /^pass$/gm,
      breakStatement: /^break$/gm,
      continueStatement: /^continue$/gm,
      
      // Comment patterns
      singleLineComment: /^\s*#.*$/gm,
      docstring: /^"""[\s\S]*?"""|^'''[\s\S]*?'''/gm,
      
      // Lambda pattern
      lambdaExpression: /lambda\s+([\w,\s]*)\s*:\s*(.+)/g
    };
  }

  /**
   * Parse Python code and generate AST
   * @param {string} code - Python source code
   * @param {string} filePath - File path for context
   * @returns {Object} AST and metadata
   */
  parse(code, filePath) {
    const ast = {
      type: 'Module',
      body: [],
      imports: [],
      classes: [],
      functions: [],
      variables: []
    };

    const metadata = {
      linesOfCode: code.split('\n').length,
      complexity: 0,
      functions: 0,
      classes: 0,
      imports: 0,
      size: code.length
    };

    try {
      // Parse the code line by line with indentation tracking
      const lines = code.split('\n');
      const parsedStructure = this.parseWithIndentation(lines);
      
      // Extract top-level elements
      ast.body = parsedStructure;
      
      // Extract specific elements for easy access
      this.extractElements(ast.body, ast, metadata);
      
      // Calculate complexity
      metadata.complexity = this.calculateComplexity(ast.body);

      return {
        success: true,
        language: 'python',
        filePath,
        ast,
        metadata: {
          ...metadata,
          parseTime: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        language: 'python',
        filePath,
        ast: null,
        metadata: {
          ...metadata,
          parseTime: Date.now()
        }
      };
    }
  }

  /**
   * Parse Python code with indentation awareness
   */
  parseWithIndentation(lines) {
    const statements = [];
    let currentIndent = 0;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        i++;
        continue;
      }

      const indent = this.getIndentLevel(line);
      
      // Parse the line based on its content
      const statement = this.parseLine(line, lines, i);
      if (statement) {
        statement.indent = indent;
        
        // Handle block statements (functions, classes, control flow)
        if (this.isBlockStatement(statement)) {
          const blockEnd = this.findBlockEnd(lines, i + 1, indent);
          statement.body = this.parseWithIndentation(lines.slice(i + 1, blockEnd));
          i = blockEnd - 1;
        }
        
        statements.push(statement);
      }
      
      i++;
    }

    return statements;
  }

  /**
   * Parse a single line of Python code
   */
  parseLine(line, lines, lineIndex) {
    const trimmed = line.trim();
    
    // Check for decorators
    let decorators = [];
    let decoratorIndex = lineIndex - 1;
    while (decoratorIndex >= 0) {
      const prevLine = lines[decoratorIndex].trim();
      if (prevLine.startsWith('@')) {
        const decoratorMatch = this.patterns.decoratorPattern.exec(prevLine);
        if (decoratorMatch) {
          decorators.unshift({
            type: 'Decorator',
            name: decoratorMatch[1],
            arguments: decoratorMatch[2] || null
          });
        }
        decoratorIndex--;
      } else if (prevLine === '') {
        decoratorIndex--;
      } else {
        break;
      }
    }

    // Import statements
    let match = this.patterns.importStatement.exec(trimmed);
    if (match) {
      return {
        type: 'ImportDeclaration',
        module: match[1] || null,
        names: match[2].split(',').map(n => n.trim()),
        alias: match[3] || null
      };
    }

    // Class declaration
    this.patterns.classDeclaration.lastIndex = 0;
    match = this.patterns.classDeclaration.exec(trimmed);
    if (match) {
      return {
        type: 'ClassDeclaration',
        name: match[1],
        bases: match[2] ? match[2].split(',').map(b => b.trim()) : [],
        decorators,
        body: []
      };
    }

    // Function declaration
    this.patterns.functionDeclaration.lastIndex = 0;
    match = this.patterns.functionDeclaration.exec(trimmed);
    if (match) {
      return {
        type: 'FunctionDeclaration',
        name: match[1],
        parameters: this.parseParameters(match[2]),
        returnType: match[3] || null,
        async: trimmed.startsWith('async'),
        decorators,
        body: []
      };
    }

    // Control flow statements
    this.patterns.ifStatement.lastIndex = 0;
    match = this.patterns.ifStatement.exec(trimmed);
    if (match) {
      return {
        type: 'IfStatement',
        condition: match[1],
        body: []
      };
    }

    this.patterns.elifStatement.lastIndex = 0;
    match = this.patterns.elifStatement.exec(trimmed);
    if (match) {
      return {
        type: 'ElifStatement',
        condition: match[1],
        body: []
      };
    }

    this.patterns.elseStatement.lastIndex = 0;
    match = this.patterns.elseStatement.exec(trimmed);
    if (match) {
      return {
        type: 'ElseStatement',
        body: []
      };
    }

    this.patterns.forLoop.lastIndex = 0;
    match = this.patterns.forLoop.exec(trimmed);
    if (match) {
      return {
        type: 'ForStatement',
        target: match[1],
        iter: match[2],
        body: []
      };
    }

    this.patterns.whileLoop.lastIndex = 0;
    match = this.patterns.whileLoop.exec(trimmed);
    if (match) {
      return {
        type: 'WhileStatement',
        condition: match[1],
        body: []
      };
    }

    this.patterns.tryStatement.lastIndex = 0;
    match = this.patterns.tryStatement.exec(trimmed);
    if (match) {
      return {
        type: 'TryStatement',
        body: [],
        handlers: [],
        finallyBody: null
      };
    }

    this.patterns.exceptStatement.lastIndex = 0;
    match = this.patterns.exceptStatement.exec(trimmed);
    if (match) {
      return {
        type: 'ExceptHandler',
        type: match[1] || null,
        name: match[2] || null,
        body: []
      };
    }

    this.patterns.withStatement.lastIndex = 0;
    match = this.patterns.withStatement.exec(trimmed);
    if (match) {
      return {
        type: 'WithStatement',
        expression: match[1],
        target: match[2],
        body: []
      };
    }

    // Simple statements
    this.patterns.returnStatement.lastIndex = 0;
    match = this.patterns.returnStatement.exec(trimmed);
    if (match) {
      return {
        type: 'ReturnStatement',
        value: match[1] || null
      };
    }

    this.patterns.yieldStatement.lastIndex = 0;
    match = this.patterns.yieldStatement.exec(trimmed);
    if (match) {
      return {
        type: 'YieldStatement',
        value: match[1],
        from: trimmed.includes('yield from')
      };
    }

    this.patterns.raiseStatement.lastIndex = 0;
    match = this.patterns.raiseStatement.exec(trimmed);
    if (match) {
      return {
        type: 'RaiseStatement',
        exception: match[1] || null
      };
    }

    this.patterns.variableAssignment.lastIndex = 0;
    match = this.patterns.variableAssignment.exec(trimmed);
    if (match) {
      return {
        type: 'Assignment',
        target: match[1],
        annotation: match[2] || null,
        value: match[3]
      };
    }

    // Pass, break, continue
    if (trimmed === 'pass') {
      return { type: 'PassStatement' };
    }
    if (trimmed === 'break') {
      return { type: 'BreakStatement' };
    }
    if (trimmed === 'continue') {
      return { type: 'ContinueStatement' };
    }

    // Generic expression statement
    return {
      type: 'ExpressionStatement',
      expression: trimmed
    };
  }

  /**
   * Get indentation level of a line
   */
  getIndentLevel(line) {
    let indent = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === ' ') {
        indent++;
      } else if (line[i] === '\t') {
        indent += 4; // Treat tab as 4 spaces
      } else {
        break;
      }
    }
    return Math.floor(indent / 4); // Assume 4-space indentation
  }

  /**
   * Check if a statement starts a block
   */
  isBlockStatement(statement) {
    const blockTypes = [
      'ClassDeclaration',
      'FunctionDeclaration',
      'IfStatement',
      'ElifStatement',
      'ElseStatement',
      'ForStatement',
      'WhileStatement',
      'TryStatement',
      'ExceptHandler',
      'WithStatement'
    ];
    return blockTypes.includes(statement.type);
  }

  /**
   * Find the end of a block based on indentation
   */
  findBlockEnd(lines, startIndex, baseIndent) {
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) continue;
      
      // Skip comments
      if (trimmed.startsWith('#')) continue;
      
      const indent = this.getIndentLevel(line);
      if (indent <= baseIndent) {
        return i;
      }
    }
    return lines.length;
  }

  /**
   * Parse function parameters
   */
  parseParameters(paramString) {
    if (!paramString || !paramString.trim()) return [];

    const params = [];
    const paramParts = paramString.split(',');

    for (const param of paramParts) {
      const trimmed = param.trim();
      if (trimmed) {
        // Handle various parameter formats
        const paramMatch = /^(\*{0,2}\w+)(?:\s*:\s*([\w\[\],\s]+))?(?:\s*=\s*(.+))?$/.exec(trimmed);
        if (paramMatch) {
          const paramObj = {
            name: paramMatch[1],
            type: 'Parameter'
          };
          
          if (paramMatch[2]) {
            paramObj.annotation = paramMatch[2];
          }
          
          if (paramMatch[3]) {
            paramObj.default = paramMatch[3];
          }
          
          if (paramMatch[1].startsWith('**')) {
            paramObj.kind = 'kwonly';
            paramObj.name = paramMatch[1].substring(2);
          } else if (paramMatch[1].startsWith('*')) {
            paramObj.kind = 'varargs';
            paramObj.name = paramMatch[1].substring(1);
          } else {
            paramObj.kind = 'regular';
          }
          
          params.push(paramObj);
        }
      }
    }

    return params;
  }

  /**
   * Extract elements from parsed structure
   */
  extractElements(body, ast, metadata) {
    for (const statement of body) {
      switch (statement.type) {
        case 'ImportDeclaration':
          ast.imports.push(statement);
          metadata.imports++;
          break;
          
        case 'ClassDeclaration':
          ast.classes.push(statement);
          metadata.classes++;
          // Extract methods from class body
          if (statement.body) {
            this.extractElements(statement.body, ast, metadata);
          }
          break;
          
        case 'FunctionDeclaration':
          ast.functions.push(statement);
          metadata.functions++;
          break;
          
        case 'Assignment':
          ast.variables.push(statement);
          break;
      }
      
      // Recursively extract from nested structures
      if (statement.body && Array.isArray(statement.body)) {
        this.extractElements(statement.body, ast, metadata);
      }
    }
  }

  /**
   * Calculate cyclomatic complexity
   */
  calculateComplexity(body, baseComplexity = 1) {
    let complexity = baseComplexity;
    
    for (const statement of body) {
      switch (statement.type) {
        case 'IfStatement':
        case 'ElifStatement':
        case 'ForStatement':
        case 'WhileStatement':
        case 'ExceptHandler':
          complexity++;
          break;
          
        case 'FunctionDeclaration':
          // Each function adds its own complexity
          complexity += this.calculateComplexity(statement.body || [], 1);
          break;
      }
      
      // Check for logical operators in conditions
      if (statement.condition && typeof statement.condition === 'string') {
        const andCount = (statement.condition.match(/\band\b/g) || []).length;
        const orCount = (statement.condition.match(/\bor\b/g) || []).length;
        complexity += andCount + orCount;
      }
      
      // Recursively calculate for nested structures
      if (statement.body && Array.isArray(statement.body)) {
        complexity += this.calculateComplexity(statement.body, 0);
      }
    }
    
    return complexity;
  }

  /**
   * Extract docstrings from functions and classes
   */
  extractDocstring(body) {
    if (!body || body.length === 0) return null;
    
    const firstStatement = body[0];
    if (firstStatement.type === 'ExpressionStatement') {
      const expr = firstStatement.expression;
      // Check if it's a string literal (docstring)
      if (expr.startsWith('"""') || expr.startsWith("'''") || 
          expr.startsWith('"') || expr.startsWith("'")) {
        return expr;
      }
    }
    
    return null;
  }
}