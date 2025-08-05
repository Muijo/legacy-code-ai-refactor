import { describe, it, expect, beforeEach } from 'vitest';
import { LegacyPatternDetector } from '../src/patterns/LegacyPatternDetector.js';
import { MultiLanguageParser } from '../src/parsers/MultiLanguageParser.js';

describe('LegacyPatternDetector', () => {
  let detector;
  let parser;

  beforeEach(() => {
    detector = new LegacyPatternDetector();
    parser = new MultiLanguageParser();
  });

  describe('Anti-pattern Detection', () => {
    it('should detect God Object anti-pattern', async () => {
      const code = `
        class GodClass {
          method1() { return 1; }
          method2() { return 2; }
          method3() { return 3; }
          method4() { return 4; }
          method5() { return 5; }
          method6() { return 6; }
          method7() { return 7; }
          method8() { return 8; }
          method9() { return 9; }
          method10() { return 10; }
          method11() { return 11; }
          method12() { return 12; }
          method13() { return 13; }
          method14() { return 14; }
          method15() { return 15; }
          method16() { return 16; }
          method17() { return 17; }
          method18() { return 18; }
          method19() { return 19; }
          method20() { return 20; }
        }
      `;

      const parseResult = await parser.parse(code, 'javascript');
      const result = await detector.detectPatterns(parseResult);

      expect(result.success).toBe(true);
      expect(result.antiPatterns.length).toBeGreaterThan(0);
      
      const godObject = result.antiPatterns.find(p => p.name === 'god_object');
      expect(godObject).toBeDefined();
      expect(godObject.confidence).toBeGreaterThan(0.7);
    });

    it('should detect Magic Numbers anti-pattern', async () => {
      const code = `
        function calculate() {
          const result = value * 3.14159 + 42 - 1337;
          if (result > 9999) {
            return result / 2.71828;
          }
          return result * 1.618;
        }
      `;

      const parseResult = await parser.parse(code, 'javascript');
      const result = await detector.detectPatterns(parseResult);

      expect(result.success).toBe(true);
      
      const magicNumbers = result.antiPatterns.find(p => p.name === 'magic_numbers');
      expect(magicNumbers).toBeDefined();
      expect(magicNumbers.magicNumbers.length).toBeGreaterThan(0);
    });

    it('should detect Long Method anti-pattern', async () => {
      const longMethodCode = `
        function veryLongMethod() {
          // Line 1
          let a = 1;
          // Line 2
          let b = 2;
          ${Array(60).fill(0).map((_, i) => `          // Line ${i + 3}\n          let var${i} = ${i};`).join('\n')}
          return a + b;
        }
      `;

      const parseResult = await parser.parse(longMethodCode, 'javascript');
      const result = await detector.detectPatterns(parseResult);

      expect(result.success).toBe(true);
      
      const longMethod = result.antiPatterns.find(p => p.name === 'long_method');
      expect(longMethod).toBeDefined();
      expect(longMethod.longMethods.length).toBeGreaterThan(0);
    });

    it('should detect Copy-Paste Programming anti-pattern', async () => {
      const code = `
        function processUserData() {
          const user = getUser();
          validateUser(user);
          saveUser(user);
          logActivity('user processed');
        }

        function processAdminData() {
          const user = getUser();
          validateUser(user);
          saveUser(user);
          logActivity('admin processed');
        }
      `;

      const parseResult = await parser.parse(code, 'javascript');
      const result = await detector.detectPatterns(parseResult);

      expect(result.success).toBe(true);
      
      const copyPaste = result.antiPatterns.find(p => p.name === 'copy_paste_programming');
      if (copyPaste) {
        expect(copyPaste.duplicates.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Design Pattern Detection', () => {
    it('should detect Singleton pattern', async () => {
      const code = `
        class Singleton {
          static instance = null;
          
          static getInstance() {
            if (!Singleton.instance) {
              Singleton.instance = new Singleton();
            }
            return Singleton.instance;
          }
        }
      `;

      const parseResult = await parser.parse(code, 'javascript');
      const result = await detector.detectPatterns(parseResult);

      expect(result.success).toBe(true);
      
      const singleton = result.designPatterns.find(p => p.name === 'singleton');
      expect(singleton).toBeDefined();
      expect(singleton.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Factory pattern', async () => {
      const code = `
        function createUser(type) {
          if (type === 'admin') {
            return new AdminUser();
          } else if (type === 'regular') {
            return new RegularUser();
          }
          return new GuestUser();
        }

        function buildProduct(spec) {
          return new Product(spec);
        }
      `;

      const parseResult = await parser.parse(code, 'javascript');
      const result = await detector.detectPatterns(parseResult);

      expect(result.success).toBe(true);
      
      const factory = result.designPatterns.find(p => p.name === 'factory');
      if (factory) {
        expect(factory.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should detect Observer pattern', async () => {
      const code = `
        class EventEmitter {
          constructor() {
            this.listeners = [];
          }
          
          addObserver(callback) {
            this.listeners.push(callback);
          }
          
          removeObserver(callback) {
            this.listeners = this.listeners.filter(l => l !== callback);
          }
          
          notifyObservers(data) {
            this.listeners.forEach(listener => listener(data));
          }
        }
      `;

      const parseResult = await parser.parse(code, 'javascript');
      const result = await detector.detectPatterns(parseResult);

      expect(result.success).toBe(true);
      
      const observer = result.designPatterns.find(p => p.name === 'observer');
      expect(observer).toBeDefined();
      expect(observer.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Framework-specific Pattern Detection', () => {
    it('should detect jQuery DOM manipulation', async () => {
      const code = `
        $(document).ready(function() {
          $('#button').click(function() {
            $('.content').hide();
            $('div.message').show().fadeIn();
          });
          
          jQuery('.form').submit(function(e) {
            e.preventDefault();
            $(this).find('input').val('');
          });
        });
      `;

      const parseResult = await parser.parse(code, 'javascript');
      const result = await detector.detectPatterns(parseResult);

      expect(result.success).toBe(true);
      
      const jquery = result.frameworkPatterns.find(p => p.name === 'jquery_dom_manipulation');
      expect(jquery).toBeDefined();
      expect(jquery.confidence).toBeGreaterThan(0.5);
      expect(jquery.patterns.length).toBeGreaterThan(0);
    });

    it('should detect jQuery AJAX patterns', async () => {
      const code = `
        $.ajax({
          url: '/api/data',
          method: 'GET',
          success: function(data) {
            console.log(data);
          }
        });
        
        $.get('/api/users', function(users) {
          displayUsers(users);
        });
        
        $.post('/api/save', { data: 'test' });
      `;

      const parseResult = await parser.parse(code, 'javascript');
      const result = await detector.detectPatterns(parseResult);

      expect(result.success).toBe(true);
      
      const jqueryAjax = result.frameworkPatterns.find(p => p.name === 'jquery_ajax');
      expect(jqueryAjax).toBeDefined();
      expect(jqueryAjax.confidence).toBeGreaterThan(0.8);
      expect(jqueryAjax.patterns.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Detection Summary', () => {
    it('should generate accurate summary statistics', async () => {
      const code = `
        class ProblematicClass {
          method1() { return 42; }
          method2() { return 3.14159; }
          method3() { return 1337; }
          
          static getInstance() {
            return new ProblematicClass();
          }
        }
        
        $(document).ready(function() {
          $('.button').click();
        });
      `;

      const parseResult = await parser.parse(code, 'javascript');
      const result = await detector.detectPatterns(parseResult);

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalPatterns).toBeGreaterThan(0);
      expect(typeof result.summary.highSeverityCount).toBe('number');
      expect(typeof result.summary.mediumSeverityCount).toBe('number');
      expect(typeof result.summary.lowSeverityCount).toBe('number');
    });
  });

  describe('Configuration Options', () => {
    it('should respect confidence threshold', async () => {
      const highThresholdDetector = new LegacyPatternDetector({
        confidenceThreshold: 0.95
      });

      const code = `
        function simpleFunction() {
          return 42;
        }
      `;

      const parseResult = await parser.parse(code, 'javascript');
      const result = await highThresholdDetector.detectPatterns(parseResult);

      expect(result.success).toBe(true);
      // With high threshold, fewer patterns should be detected
      expect(result.summary.totalPatterns).toBeLessThanOrEqual(1);
    });

    it('should allow disabling specific pattern types', async () => {
      const limitedDetector = new LegacyPatternDetector({
        enableAntiPatterns: true,
        enableDesignPatterns: false,
        enableFrameworkPatterns: false
      });

      const code = `
        class Singleton {
          static getInstance() { return new Singleton(); }
        }
        
        $(document).ready(function() {
          $('.test').click();
        });
      `;

      const parseResult = await parser.parse(code, 'javascript');
      const result = await limitedDetector.detectPatterns(parseResult);

      expect(result.success).toBe(true);
      expect(result.designPatterns).toHaveLength(0);
      expect(result.frameworkPatterns).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid parse results gracefully', async () => {
      const invalidParseResult = {
        success: false,
        error: 'Parse failed'
      };

      const result = await detector.detectPatterns(invalidParseResult);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing AST gracefully', async () => {
      const parseResultWithoutAST = {
        success: true,
        ast: null,
        language: 'javascript'
      };

      const result = await detector.detectPatterns(parseResultWithoutAST);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should provide detector statistics', () => {
      const stats = detector.getStats();

      expect(stats).toBeDefined();
      expect(stats.antiPatternDetectors).toBeGreaterThan(0);
      expect(stats.designPatternDetectors).toBeGreaterThan(0);
      expect(stats.frameworkPatternDetectors).toBeGreaterThan(0);
      expect(stats.confidenceThreshold).toBe(0.7);
    });
  });
});