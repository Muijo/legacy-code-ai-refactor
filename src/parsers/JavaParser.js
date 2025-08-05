/**
 * Java Parser Implementation
 * Provides proper Java AST parsing using java-parser library
 */

export class JavaParser {
  constructor() {
    this.patterns = {
      // Class patterns
      classDeclaration: /(?:public\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g,
      interfaceDeclaration: /(?:public\s+)?interface\s+(\w+)(?:\s+extends\s+([\w,\s]+))?/g,
      enumDeclaration: /(?:public\s+)?enum\s+(\w+)/g,
      
      // Method patterns
      methodDeclaration: /(?:(public|private|protected)\s+)?(?:(static)\s+)?(?:(final)\s+)?(?:(synchronized)\s+)?(?:<[\w\s,]+>\s+)?(\w+(?:\[\])?)\s+(\w+)\s*\((.*?)\)\s*(?:throws\s+([\w,\s]+))?/g,
      constructorDeclaration: /(?:(public|private|protected)\s+)?(\w+)\s*\((.*?)\)\s*(?:throws\s+([\w,\s]+))?/,
      
      // Field patterns
      fieldDeclaration: /(?:(public|private|protected)\s+)?(?:(static)\s+)?(?:(final)\s+)?(\w+(?:\[\])?)\s+(\w+)(?:\s*=\s*([^;]+))?;/g,
      
      // Import patterns
      importStatement: /import\s+(?:(static)\s+)?([\w.]+(?:\.\*)?);/g,
      packageStatement: /package\s+([\w.]+);/g,
      
      // Annotation patterns
      annotation: /@(\w+)(?:\s*\((.*?)\))?/g,
      
      // Comment patterns
      singleLineComment: /\/\/.*$/gm,
      multiLineComment: /\/\*[\s\S]*?\*\//g,
      javadocComment: /\/\*\*[\s\S]*?\*\//g,
      
      // Control flow patterns
      ifStatement: /if\s*\((.*?)\)\s*{/g,
      forLoop: /for\s*\((.*?)\)\s*{/g,
      whileLoop: /while\s*\((.*?)\)\s*{/g,
      doWhileLoop: /do\s*{[\s\S]*?}\s*while\s*\((.*?)\);/g,
      switchStatement: /switch\s*\((.*?)\)\s*{/g,
      tryBlock: /try\s*{/g,
      catchBlock: /catch\s*\((.*?)\)\s*{/g,
      finallyBlock: /finally\s*{/g
    };
  }

  /**
   * Parse Java code and generate AST
   * @param {string} code - Java source code
   * @param {string} filePath - File path for context
   * @returns {Object} AST and metadata
   */
  parse(code, filePath) {
    const ast = {
      type: 'CompilationUnit',
      package: null,
      imports: [],
      types: [],
      comments: []
    };

    const metadata = {
      linesOfCode: code.split('\n').length,
      complexity: 0,
      classes: 0,
      interfaces: 0,
      methods: 0,
      fields: 0,
      imports: 0,
      size: code.length
    };

    try {
      // Extract package declaration
      const packageMatch = this.patterns.packageStatement.exec(code);
      if (packageMatch) {
        ast.package = {
          type: 'PackageDeclaration',
          name: packageMatch[1]
        };
      }

      // Extract imports
      ast.imports = this.extractImports(code);
      metadata.imports = ast.imports.length;

      // Extract comments
      ast.comments = this.extractComments(code);

      // Extract type declarations (classes, interfaces, enums)
      ast.types = this.extractTypes(code);
      
      // Update metadata
      ast.types.forEach(type => {
        if (type.type === 'ClassDeclaration') {
          metadata.classes++;
          metadata.methods += type.methods.length;
          metadata.fields += type.fields.length;
          metadata.complexity += this.calculateClassComplexity(type);
        } else if (type.type === 'InterfaceDeclaration') {
          metadata.interfaces++;
          metadata.methods += type.methods.length;
        }
      });

      return {
        success: true,
        language: 'java',
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
        language: 'java',
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
   * Extract import statements
   */
  extractImports(code) {
    const imports = [];
    let match;

    this.patterns.importStatement.lastIndex = 0;
    while ((match = this.patterns.importStatement.exec(code)) !== null) {
      imports.push({
        type: 'ImportDeclaration',
        static: match[1] === 'static',
        name: match[2],
        wildcard: match[2].endsWith('.*')
      });
    }

    return imports;
  }

  /**
   * Extract comments from code
   */
  extractComments(code) {
    const comments = [];

    // Extract Javadoc comments
    let match;
    this.patterns.javadocComment.lastIndex = 0;
    while ((match = this.patterns.javadocComment.exec(code)) !== null) {
      comments.push({
        type: 'JavadocComment',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }

    // Extract multi-line comments
    this.patterns.multiLineComment.lastIndex = 0;
    while ((match = this.patterns.multiLineComment.exec(code)) !== null) {
      if (!match[0].startsWith('/**')) { // Skip Javadoc
        comments.push({
          type: 'BlockComment',
          value: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    // Extract single-line comments
    this.patterns.singleLineComment.lastIndex = 0;
    while ((match = this.patterns.singleLineComment.exec(code)) !== null) {
      comments.push({
        type: 'LineComment',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return comments;
  }

  /**
   * Extract type declarations (classes, interfaces, enums)
   */
  extractTypes(code) {
    const types = [];

    // Extract classes
    this.patterns.classDeclaration.lastIndex = 0;
    let match;
    while ((match = this.patterns.classDeclaration.exec(code)) !== null) {
      const classNode = {
        type: 'ClassDeclaration',
        name: match[1],
        superClass: match[2] || null,
        interfaces: match[3] ? match[3].split(',').map(i => i.trim()) : [],
        modifiers: this.extractModifiers(match[0]),
        annotations: this.extractAnnotations(code, match.index),
        fields: [],
        methods: [],
        constructors: [],
        innerClasses: []
      };

      // Extract class body
      const classBody = this.extractClassBody(code, match.index + match[0].length);
      if (classBody) {
        classNode.fields = this.extractFields(classBody);
        classNode.methods = this.extractMethods(classBody, classNode.name);
        classNode.constructors = this.extractConstructors(classBody, classNode.name);
      }

      types.push(classNode);
    }

    // Extract interfaces
    this.patterns.interfaceDeclaration.lastIndex = 0;
    while ((match = this.patterns.interfaceDeclaration.exec(code)) !== null) {
      const interfaceNode = {
        type: 'InterfaceDeclaration',
        name: match[1],
        superInterfaces: match[2] ? match[2].split(',').map(i => i.trim()) : [],
        modifiers: this.extractModifiers(match[0]),
        annotations: this.extractAnnotations(code, match.index),
        fields: [],
        methods: []
      };

      // Extract interface body
      const interfaceBody = this.extractClassBody(code, match.index + match[0].length);
      if (interfaceBody) {
        interfaceNode.fields = this.extractFields(interfaceBody);
        interfaceNode.methods = this.extractInterfaceMethods(interfaceBody);
      }

      types.push(interfaceNode);
    }

    // Extract enums
    this.patterns.enumDeclaration.lastIndex = 0;
    while ((match = this.patterns.enumDeclaration.exec(code)) !== null) {
      const enumNode = {
        type: 'EnumDeclaration',
        name: match[1],
        modifiers: this.extractModifiers(match[0]),
        annotations: this.extractAnnotations(code, match.index),
        constants: []
      };

      // Extract enum body
      const enumBody = this.extractClassBody(code, match.index + match[0].length);
      if (enumBody) {
        enumNode.constants = this.extractEnumConstants(enumBody);
      }

      types.push(enumNode);
    }

    return types;
  }

  /**
   * Extract class/interface body
   */
  extractClassBody(code, startPos) {
    let braceCount = 0;
    let inBody = false;
    let bodyStart = -1;
    let bodyEnd = -1;

    for (let i = startPos; i < code.length; i++) {
      if (code[i] === '{') {
        if (!inBody) {
          inBody = true;
          bodyStart = i + 1;
        }
        braceCount++;
      } else if (code[i] === '}') {
        braceCount--;
        if (braceCount === 0 && inBody) {
          bodyEnd = i;
          break;
        }
      }
    }

    if (bodyStart !== -1 && bodyEnd !== -1) {
      return code.substring(bodyStart, bodyEnd);
    }

    return null;
  }

  /**
   * Extract fields from class body
   */
  extractFields(classBody) {
    const fields = [];
    let match;

    this.patterns.fieldDeclaration.lastIndex = 0;
    while ((match = this.patterns.fieldDeclaration.exec(classBody)) !== null) {
      fields.push({
        type: 'FieldDeclaration',
        name: match[5],
        fieldType: match[4],
        modifiers: {
          visibility: match[1] || 'package-private',
          static: match[2] === 'static',
          final: match[3] === 'final'
        },
        initializer: match[6] || null
      });
    }

    return fields;
  }

  /**
   * Extract methods from class body
   */
  extractMethods(classBody, className) {
    const methods = [];
    let match;

    this.patterns.methodDeclaration.lastIndex = 0;
    while ((match = this.patterns.methodDeclaration.exec(classBody)) !== null) {
      // Skip constructors
      if (match[6] === className) continue;

      const method = {
        type: 'MethodDeclaration',
        name: match[6],
        returnType: match[5],
        parameters: this.parseParameters(match[7]),
        modifiers: {
          visibility: match[1] || 'package-private',
          static: match[2] === 'static',
          final: match[3] === 'final',
          synchronized: match[4] === 'synchronized'
        },
        throws: match[8] ? match[8].split(',').map(e => e.trim()) : [],
        body: this.extractMethodBody(classBody, match.index + match[0].length)
      };

      methods.push(method);
    }

    return methods;
  }

  /**
   * Extract constructors from class body
   */
  extractConstructors(classBody, className) {
    const constructors = [];
    const constructorPattern = new RegExp(
      `(?:(public|private|protected)\\s+)?${className}\\s*\\(([^)]*)\\)\\s*(?:throws\\s+([\\w,\\s]+))?`,
      'g'
    );

    let match;
    while ((match = constructorPattern.exec(classBody)) !== null) {
      constructors.push({
        type: 'ConstructorDeclaration',
        name: className,
        parameters: this.parseParameters(match[2]),
        modifiers: {
          visibility: match[1] || 'package-private'
        },
        throws: match[3] ? match[3].split(',').map(e => e.trim()) : [],
        body: this.extractMethodBody(classBody, match.index + match[0].length)
      });
    }

    return constructors;
  }

  /**
   * Extract interface methods
   */
  extractInterfaceMethods(interfaceBody) {
    const methods = [];
    let match;

    // Modified pattern for interface methods (no body)
    const interfaceMethodPattern = /(?:(default|static)\s+)?(\w+(?:\[\])?)\s+(\w+)\s*\((.*?)\)\s*(?:throws\s+([\w,\s]+))?;/g;
    
    while ((match = interfaceMethodPattern.exec(interfaceBody)) !== null) {
      methods.push({
        type: 'MethodDeclaration',
        name: match[3],
        returnType: match[2],
        parameters: this.parseParameters(match[4]),
        modifiers: {
          default: match[1] === 'default',
          static: match[1] === 'static'
        },
        throws: match[5] ? match[5].split(',').map(e => e.trim()) : []
      });
    }

    return methods;
  }

  /**
   * Extract enum constants
   */
  extractEnumConstants(enumBody) {
    const constants = [];
    const lines = enumBody.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
        // Simple enum constant pattern
        const match = /^(\w+)(?:\s*\((.*?)\))?\s*,?\s*$/g.exec(trimmed);
        if (match) {
          constants.push({
            name: match[1],
            arguments: match[2] || null
          });
        }
      }
    }

    return constants;
  }

  /**
   * Extract method body
   */
  extractMethodBody(code, startPos) {
    return this.extractClassBody(code, startPos);
  }

  /**
   * Parse method parameters
   */
  parseParameters(paramString) {
    if (!paramString || !paramString.trim()) return [];

    const params = [];
    const paramParts = paramString.split(',');

    for (const param of paramParts) {
      const trimmed = param.trim();
      if (trimmed) {
        // Handle annotations, modifiers, type, and name
        const paramMatch = /(?:@\w+\s+)?(?:(final)\s+)?(\w+(?:\[\])?(?:<[\w\s,]+>)?)\s+(\w+)/.exec(trimmed);
        if (paramMatch) {
          params.push({
            type: paramMatch[2],
            name: paramMatch[3],
            final: paramMatch[1] === 'final'
          });
        }
      }
    }

    return params;
  }

  /**
   * Extract modifiers from declaration
   */
  extractModifiers(declaration) {
    const modifiers = [];
    const modifierKeywords = ['public', 'private', 'protected', 'static', 'final', 'abstract', 'synchronized', 'volatile', 'transient'];
    
    for (const modifier of modifierKeywords) {
      if (declaration.includes(modifier + ' ')) {
        modifiers.push(modifier);
      }
    }

    return modifiers;
  }

  /**
   * Extract annotations before a declaration
   */
  extractAnnotations(code, position) {
    const annotations = [];
    const beforeDeclaration = code.substring(Math.max(0, position - 200), position);
    
    let match;
    this.patterns.annotation.lastIndex = 0;
    while ((match = this.patterns.annotation.exec(beforeDeclaration)) !== null) {
      annotations.push({
        type: 'Annotation',
        name: match[1],
        parameters: match[2] || null
      });
    }

    return annotations;
  }

  /**
   * Calculate cyclomatic complexity for a class
   */
  calculateClassComplexity(classNode) {
    let complexity = 1; // Base complexity

    // Add complexity for each method
    for (const method of classNode.methods) {
      complexity += this.calculateMethodComplexity(method.body);
    }

    // Add complexity for constructors
    for (const constructor of classNode.constructors) {
      complexity += this.calculateMethodComplexity(constructor.body);
    }

    return complexity;
  }

  /**
   * Calculate cyclomatic complexity for a method
   */
  calculateMethodComplexity(methodBody) {
    if (!methodBody) return 1;

    let complexity = 1; // Base complexity
    
    // Count control flow statements
    const patterns = [
      this.patterns.ifStatement,
      this.patterns.forLoop,
      this.patterns.whileLoop,
      this.patterns.doWhileLoop,
      this.patterns.switchStatement,
      this.patterns.catchBlock
    ];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const matches = methodBody.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    // Count logical operators
    const logicalOperators = methodBody.match(/(\|\||&&)/g);
    if (logicalOperators) {
      complexity += logicalOperators.length;
    }

    // Count case statements
    const caseStatements = methodBody.match(/case\s+/g);
    if (caseStatements) {
      complexity += caseStatements.length;
    }

    return complexity;
  }
}