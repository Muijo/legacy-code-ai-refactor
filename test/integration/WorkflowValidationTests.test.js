/**
 * Workflow Validation Tests
 * 
 * Tests for validating complete refactoring workflows and functional equivalence
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LegacyCodeAnalyzer } from '../../src/LegacyCodeAnalyzer.js';
import { ModernCodeGenerator } from '../../src/generation/ModernCodeGenerator.js';
import { TestGenerator } from '../../src/generation/TestGenerator.js';
import BehaviorComparisonSystem from '../../src/validation/BehaviorComparisonSystem.js';
import { MigrationPlanner } from '../../src/migration/MigrationPlanner.js';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Workflow Validation Tests', () => {
  let analyzer;
  let codeGenerator;
  let testGenerator;
  let behaviorComparison;
  let migrationPlanner;
  let testDataDir;

  beforeAll(async () => {
    testDataDir = join(__dirname, '../test-data/workflow');
    await fs.mkdir(testDataDir, { recursive: true });

    analyzer = new LegacyCodeAnalyzer({
      enableQualityAssessment: true,
      enableSemanticAnalysis: true,
      enableProgressReporting: true
    });

    codeGenerator = new ModernCodeGenerator();
    testGenerator = new TestGenerator();
    behaviorComparison = new BehaviorComparisonSystem();
    migrationPlanner = new MigrationPlanner();
  });

  afterAll(async () => {
    if (analyzer) await analyzer.cleanup();
  });

  describe('Complete Refactoring Workflows', () => {
    it('should complete full workflow for e-commerce legacy code', async () => {
      // Create realistic e-commerce legacy code
      const ecommerceCode = `
        // Legacy e-commerce order processing system
        var OrderProcessor = {
          taxRates: {
            'US': 0.08,
            'CA': 0.12,
            'UK': 0.20
          },
          
          processOrder: function(orderData) {
            var self = this;
            var result = {
              success: false,
              orderId: null,
              total: 0,
              errors: []
            };
            
            try {
              // Validation with nested conditions
              if (!orderData) {
                throw new Error('Order data is required');
              }
              
              if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
                throw new Error('Order must contain items');
              }
              
              if (!orderData.customer || !orderData.customer.email) {
                throw new Error('Customer email is required');
              }
              
              // Calculate totals with legacy patterns
              var subtotal = 0;
              for (var i = 0; i < orderData.items.length; i++) {
                var item = orderData.items[i];
                
                if (!item.price || !item.quantity) {
                  result.errors.push('Invalid item at index ' + i);
                  continue;
                }
                
                var itemTotal = parseFloat(item.price) * parseInt(item.quantity);
                
                // Apply discounts
                if (item.discount) {
                  itemTotal = itemTotal * (1 - parseFloat(item.discount));
                }
                
                subtotal += itemTotal;
              }
              
              // Calculate tax
              var country = orderData.customer.country || 'US';
              var taxRate = self.taxRates[country] || 0.08;
              var tax = subtotal * taxRate;
              
              // Calculate shipping
              var shipping = 0;
              if (subtotal < 50) {
                shipping = 9.99;
              } else if (subtotal < 100) {
                shipping = 4.99;
              }
              
              var total = subtotal + tax + shipping;
              
              // Generate order ID (legacy pattern)
              var orderId = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
              
              result.success = true;
              result.orderId = orderId;
              result.total = Math.round(total * 100) / 100; // Round to 2 decimal places
              result.breakdown = {
                subtotal: Math.round(subtotal * 100) / 100,
                tax: Math.round(tax * 100) / 100,
                shipping: shipping,
                total: Math.round(total * 100) / 100
              };
              
            } catch (error) {
              result.errors.push(error.message);
            }
            
            return result;
          },
          
          validatePayment: function(paymentData) {
            // Legacy payment validation
            if (!paymentData || !paymentData.cardNumber) {
              return { valid: false, error: 'Card number required' };
            }
            
            var cardNumber = paymentData.cardNumber.replace(/\s/g, '');
            
            // Simple Luhn algorithm check
            var sum = 0;
            var alternate = false;
            
            for (var i = cardNumber.length - 1; i >= 0; i--) {
              var n = parseInt(cardNumber.charAt(i), 10);
              
              if (alternate) {
                n *= 2;
                if (n > 9) {
                  n = (n % 10) + 1;
                }
              }
              
              sum += n;
              alternate = !alternate;
            }
            
            return {
              valid: (sum % 10) === 0,
              error: (sum % 10) === 0 ? null : 'Invalid card number'
            };
          }
        };
      `;

      const testFilePath = join(testDataDir, 'ecommerce-legacy.js');
      await fs.writeFile(testFilePath, ecommerceCode);

      // Step 1: Analyze legacy code
      console.log('Analyzing e-commerce legacy code...');
      const analysisResult = await analyzer.analyzeFile(testFilePath);
      
      expect(analysisResult.success).toBe(true);
      expect(analysisResult.quality.technicalDebtScore).toBeGreaterThan(0);
      expect(analysisResult.semantic.businessLogic.length).toBeGreaterThan(0);

      // Step 2: Create migration plan
      console.log('Creating migration plan...');
      const migrationPlan = await migrationPlanner.createMigrationPlan({
        sourceFile: testFilePath,
        analysisResult: analysisResult,
        targetFramework: 'modern-js',
        preserveBusinessLogic: true
      });

      expect(migrationPlan.steps.length).toBeGreaterThan(0);
      expect(migrationPlan.riskLevel).toBeDefined();

      // Step 3: Generate modern code
      console.log('Generating modern implementation...');
      const modernCode = await codeGenerator.generateModernImplementation({
        legacyCode: ecommerceCode,
        analysisResult: analysisResult,
        migrationPlan: migrationPlan,
        targetStyle: 'es6-class'
      });

      expect(modernCode.success).toBe(true);
      expect(modernCode.generatedCode).toContain('class');
      expect(modernCode.generatedCode).toContain('async');

      // Step 4: Generate comprehensive tests
      console.log('Generating tests...');
      const generatedTests = await testGenerator.generateTests({
        originalCode: ecommerceCode,
        modernCode: modernCode.generatedCode,
        analysisResult: analysisResult
      });

      expect(generatedTests.success).toBe(true);
      expect(generatedTests.testCases.length).toBeGreaterThan(0);

      // Step 5: Validate functional equivalence
      console.log('Validating functional equivalence...');
      const testCases = [
        {
          name: 'Valid order processing',
          input: {
            items: [
              { price: 29.99, quantity: 2, discount: 0.1 },
              { price: 15.50, quantity: 1 }
            ],
            customer: {
              email: 'test@example.com',
              country: 'US'
            }
          }
        },
        {
          name: 'Order with shipping threshold',
          input: {
            items: [
              { price: 25.00, quantity: 1 }
            ],
            customer: {
              email: 'test@example.com',
              country: 'CA'
            }
          }
        },
        {
          name: 'Invalid order data',
          input: {
            items: [],
            customer: null
          }
        }
      ];

      // Create executable functions for comparison
      const legacyProcessor = eval(`(${ecommerceCode}); OrderProcessor`);
      const modernProcessor = eval(`(${modernCode.generatedCode}); OrderProcessor || new OrderProcessor()`);

      for (const testCase of testCases) {
        const legacyResult = legacyProcessor.processOrder(testCase.input);
        const modernResult = modernProcessor.processOrder(testCase.input);

        // Compare key properties
        expect(modernResult.success).toBe(legacyResult.success);
        if (legacyResult.success) {
          expect(modernResult.total).toBeCloseTo(legacyResult.total, 2);
          expect(modernResult.breakdown.subtotal).toBeCloseTo(legacyResult.breakdown.subtotal, 2);
        } else {
          expect(modernResult.errors.length).toBeGreaterThan(0);
        }
      }

      console.log('E-commerce workflow validation completed successfully!');
    }, 60000);

    it('should handle user authentication workflow', async () => {
      const authCode = `
        // Legacy authentication system
        function AuthenticationManager() {
          this.users = {};
          this.sessions = {};
          this.loginAttempts = {};
          
          this.registerUser = function(userData) {
            var result = { success: false, errors: [] };
            
            try {
              // Validation
              if (!userData.username || userData.username.length < 3) {
                result.errors.push('Username must be at least 3 characters');
              }
              
              if (!userData.password || userData.password.length < 8) {
                result.errors.push('Password must be at least 8 characters');
              }
              
              if (!userData.email || !this.isValidEmail(userData.email)) {
                result.errors.push('Valid email is required');
              }
              
              if (this.users[userData.username]) {
                result.errors.push('Username already exists');
              }
              
              if (result.errors.length > 0) {
                return result;
              }
              
              // Hash password (simplified)
              var hashedPassword = this.hashPassword(userData.password);
              
              this.users[userData.username] = {
                username: userData.username,
                email: userData.email,
                password: hashedPassword,
                createdAt: new Date().getTime(),
                isActive: true
              };
              
              result.success = true;
              result.userId = userData.username;
              
            } catch (error) {
              result.errors.push(error.message);
            }
            
            return result;
          };
          
          this.authenticateUser = function(username, password) {
            var result = { success: false, sessionId: null, errors: [] };
            
            try {
              // Check rate limiting
              var attempts = this.loginAttempts[username] || { count: 0, lastAttempt: 0 };
              var now = Date.now();
              
              if (attempts.count >= 5 && (now - attempts.lastAttempt) < 300000) { // 5 minutes
                result.errors.push('Too many login attempts. Please try again later.');
                return result;
              }
              
              var user = this.users[username];
              if (!user || !user.isActive) {
                this.recordFailedAttempt(username);
                result.errors.push('Invalid credentials');
                return result;
              }
              
              var hashedPassword = this.hashPassword(password);
              if (user.password !== hashedPassword) {
                this.recordFailedAttempt(username);
                result.errors.push('Invalid credentials');
                return result;
              }
              
              // Create session
              var sessionId = this.generateSessionId();
              this.sessions[sessionId] = {
                username: username,
                createdAt: now,
                lastActivity: now,
                isValid: true
              };
              
              // Reset failed attempts
              delete this.loginAttempts[username];
              
              result.success = true;
              result.sessionId = sessionId;
              result.user = {
                username: user.username,
                email: user.email
              };
              
            } catch (error) {
              result.errors.push(error.message);
            }
            
            return result;
          };
          
          this.isValidEmail = function(email) {
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
          };
          
          this.hashPassword = function(password) {
            // Simplified hash function for testing
            var hash = 0;
            for (var i = 0; i < password.length; i++) {
              var char = password.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString();
          };
          
          this.generateSessionId = function() {
            return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          };
          
          this.recordFailedAttempt = function(username) {
            if (!this.loginAttempts[username]) {
              this.loginAttempts[username] = { count: 0, lastAttempt: 0 };
            }
            this.loginAttempts[username].count++;
            this.loginAttempts[username].lastAttempt = Date.now();
          };
        }
      `;

      const testFilePath = join(testDataDir, 'auth-legacy.js');
      await fs.writeFile(testFilePath, authCode);

      // Complete workflow
      const analysisResult = await analyzer.analyzeFile(testFilePath);
      expect(analysisResult.success).toBe(true);

      const migrationPlan = await migrationPlanner.createMigrationPlan({
        sourceFile: testFilePath,
        analysisResult: analysisResult,
        targetFramework: 'modern-js'
      });

      const modernCode = await codeGenerator.generateModernImplementation({
        legacyCode: authCode,
        analysisResult: analysisResult,
        migrationPlan: migrationPlan
      });

      expect(modernCode.success).toBe(true);

      // Test authentication scenarios
      const LegacyAuth = eval(`(${authCode}); AuthenticationManager`);
      const ModernAuth = eval(`(${modernCode.generatedCode}); AuthenticationManager || class AuthenticationManager {}`);

      const legacyAuth = new LegacyAuth();
      const modernAuth = new ModernAuth();

      // Test user registration
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com'
      };

      const legacyRegResult = legacyAuth.registerUser(userData);
      const modernRegResult = modernAuth.registerUser(userData);

      expect(modernRegResult.success).toBe(legacyRegResult.success);
      if (legacyRegResult.success) {
        expect(modernRegResult.userId).toBe(legacyRegResult.userId);
      }

      // Test authentication
      const legacyAuthResult = legacyAuth.authenticateUser('testuser', 'password123');
      const modernAuthResult = modernAuth.authenticateUser('testuser', 'password123');

      expect(modernAuthResult.success).toBe(legacyAuthResult.success);
      if (legacyAuthResult.success) {
        expect(modernAuthResult.sessionId).toBeDefined();
        expect(modernAuthResult.user.username).toBe(legacyAuthResult.user.username);
      }

      console.log('Authentication workflow validation completed!');
    }, 45000);

    it('should preserve complex business logic in data processing workflow', async () => {
      const dataProcessingCode = `
        // Legacy data processing system
        var DataProcessor = {
          config: {
            batchSize: 100,
            maxRetries: 3,
            timeout: 30000
          },
          
          processDataBatch: function(rawData, options) {
            var self = this;
            var result = {
              success: false,
              processed: 0,
              failed: 0,
              errors: [],
              data: []
            };
            
            try {
              options = options || {};
              var batchSize = options.batchSize || self.config.batchSize;
              
              if (!rawData || !Array.isArray(rawData)) {
                throw new Error('Raw data must be an array');
              }
              
              // Process in batches
              for (var i = 0; i < rawData.length; i += batchSize) {
                var batch = rawData.slice(i, i + batchSize);
                var batchResult = self.processBatch(batch, options);
                
                result.processed += batchResult.processed;
                result.failed += batchResult.failed;
                result.errors = result.errors.concat(batchResult.errors);
                result.data = result.data.concat(batchResult.data);
              }
              
              result.success = result.failed === 0 || (result.processed > result.failed);
              
            } catch (error) {
              result.errors.push(error.message);
            }
            
            return result;
          },
          
          processBatch: function(batch, options) {
            var result = {
              processed: 0,
              failed: 0,
              errors: [],
              data: []
            };
            
            for (var i = 0; i < batch.length; i++) {
              try {
                var item = batch[i];
                var processedItem = this.processItem(item, options);
                
                if (processedItem) {
                  result.data.push(processedItem);
                  result.processed++;
                } else {
                  result.failed++;
                  result.errors.push('Failed to process item at index ' + i);
                }
                
              } catch (error) {
                result.failed++;
                result.errors.push('Error processing item ' + i + ': ' + error.message);
              }
            }
            
            return result;
          },
          
          processItem: function(item, options) {
            if (!item || typeof item !== 'object') {
              return null;
            }
            
            var processed = {
              id: item.id || this.generateId(),
              timestamp: Date.now()
            };
            
            // Data transformation rules
            if (item.type === 'user') {
              processed.userData = {
                name: this.sanitizeString(item.name),
                email: this.normalizeEmail(item.email),
                age: this.validateAge(item.age),
                preferences: this.processPreferences(item.preferences)
              };
            } else if (item.type === 'order') {
              processed.orderData = {
                orderId: item.orderId,
                total: this.calculateTotal(item.items),
                currency: item.currency || 'USD',
                items: this.processOrderItems(item.items)
              };
            } else if (item.type === 'product') {
              processed.productData = {
                sku: item.sku,
                name: this.sanitizeString(item.name),
                price: this.validatePrice(item.price),
                category: this.normalizeCategory(item.category),
                inStock: Boolean(item.quantity > 0)
              };
            }
            
            return processed;
          },
          
          sanitizeString: function(str) {
            if (typeof str !== 'string') return '';
            return str.trim().replace(/[<>]/g, '');
          },
          
          normalizeEmail: function(email) {
            if (typeof email !== 'string') return '';
            return email.toLowerCase().trim();
          },
          
          validateAge: function(age) {
            var numAge = parseInt(age, 10);
            return (numAge >= 0 && numAge <= 150) ? numAge : null;
          },
          
          validatePrice: function(price) {
            var numPrice = parseFloat(price);
            return (numPrice >= 0) ? Math.round(numPrice * 100) / 100 : 0;
          },
          
          processPreferences: function(prefs) {
            if (!Array.isArray(prefs)) return [];
            return prefs.filter(function(pref) {
              return typeof pref === 'string' && pref.trim().length > 0;
            }).map(function(pref) {
              return pref.trim().toLowerCase();
            });
          },
          
          processOrderItems: function(items) {
            if (!Array.isArray(items)) return [];
            
            return items.map(function(item) {
              return {
                sku: item.sku || '',
                quantity: parseInt(item.quantity, 10) || 0,
                price: parseFloat(item.price) || 0
              };
            });
          },
          
          calculateTotal: function(items) {
            if (!Array.isArray(items)) return 0;
            
            var total = 0;
            for (var i = 0; i < items.length; i++) {
              var item = items[i];
              var price = parseFloat(item.price) || 0;
              var quantity = parseInt(item.quantity, 10) || 0;
              total += price * quantity;
            }
            
            return Math.round(total * 100) / 100;
          },
          
          normalizeCategory: function(category) {
            if (typeof category !== 'string') return 'uncategorized';
            return category.toLowerCase().replace(/\s+/g, '-');
          },
          
          generateId: function() {
            return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          }
        };
      `;

      const testFilePath = join(testDataDir, 'data-processing-legacy.js');
      await fs.writeFile(testFilePath, dataProcessingCode);

      // Complete workflow
      const analysisResult = await analyzer.analyzeFile(testFilePath);
      expect(analysisResult.success).toBe(true);
      expect(analysisResult.semantic.businessLogic.length).toBeGreaterThan(5);

      const modernCode = await codeGenerator.generateModernImplementation({
        legacyCode: dataProcessingCode,
        analysisResult: analysisResult,
        targetStyle: 'functional'
      });

      expect(modernCode.success).toBe(true);

      // Test complex data processing scenarios
      const LegacyProcessor = eval(`(${dataProcessingCode}); DataProcessor`);
      const ModernProcessor = eval(`(${modernCode.generatedCode}); DataProcessor || {}`);

      const testData = [
        {
          type: 'user',
          name: '  John Doe  ',
          email: 'JOHN@EXAMPLE.COM',
          age: '25',
          preferences: ['reading', '', 'gaming', null, 'cooking']
        },
        {
          type: 'order',
          orderId: 'ORD-123',
          items: [
            { sku: 'ITEM-1', price: '29.99', quantity: '2' },
            { sku: 'ITEM-2', price: '15.50', quantity: '1' }
          ]
        },
        {
          type: 'product',
          sku: 'PROD-456',
          name: '<script>Product Name</script>',
          price: '99.99',
          category: 'Electronics & Gadgets',
          quantity: 5
        }
      ];

      const legacyResult = LegacyProcessor.processDataBatch(testData);
      const modernResult = ModernProcessor.processDataBatch(testData);

      expect(modernResult.success).toBe(legacyResult.success);
      expect(modernResult.processed).toBe(legacyResult.processed);
      expect(modernResult.data.length).toBe(legacyResult.data.length);

      // Verify business logic preservation
      for (let i = 0; i < legacyResult.data.length; i++) {
        const legacyItem = legacyResult.data[i];
        const modernItem = modernResult.data[i];

        if (legacyItem.userData) {
          expect(modernItem.userData.name).toBe(legacyItem.userData.name);
          expect(modernItem.userData.email).toBe(legacyItem.userData.email);
          expect(modernItem.userData.age).toBe(legacyItem.userData.age);
          expect(modernItem.userData.preferences).toEqual(legacyItem.userData.preferences);
        }

        if (legacyItem.orderData) {
          expect(modernItem.orderData.total).toBeCloseTo(legacyItem.orderData.total, 2);
          expect(modernItem.orderData.items.length).toBe(legacyItem.orderData.items.length);
        }

        if (legacyItem.productData) {
          expect(modernItem.productData.name).toBe(legacyItem.productData.name);
          expect(modernItem.productData.price).toBe(legacyItem.productData.price);
          expect(modernItem.productData.inStock).toBe(legacyItem.productData.inStock);
        }
      }

      console.log('Data processing workflow validation completed!');
    }, 60000);
  });

  describe('Edge Case Handling', () => {
    it('should handle malformed legacy code gracefully', async () => {
      const malformedCode = `
        // Malformed legacy code with syntax issues
        function brokenFunction(data {  // Missing closing parenthesis
          var result = [];
          
          for (var i = 0; i < data.length; i++ {  // Missing closing parenthesis
            if (data[i].valid) {
              result.push(data[i];  // Missing closing parenthesis
            }
          }
          
          return result;
        }
        
        // Incomplete function
        function incompleteFunction(param) {
          var temp = param * 2;
          // Missing return statement and closing brace
      `;

      const testFilePath = join(testDataDir, 'malformed-legacy.js');
      await fs.writeFile(testFilePath, malformedCode);

      const analysisResult = await analyzer.analyzeFile(testFilePath);
      
      // Should handle malformed code gracefully
      expect(analysisResult).toBeDefined();
      if (!analysisResult.success) {
        expect(analysisResult.error).toBeDefined();
        console.log('Malformed code handled gracefully:', analysisResult.error);
      } else {
        // If parsing succeeded despite malformation, verify partial analysis
        expect(analysisResult.parsing).toBeDefined();
      }
    });

    it('should preserve behavior with null and undefined handling', async () => {
      const nullHandlingCode = `
        function handleNullsAndUndefined(data) {
          var result = {
            processed: [],
            skipped: 0,
            errors: []
          };
          
          if (data == null) {
            result.errors.push('Data is null or undefined');
            return result;
          }
          
          if (!Array.isArray(data)) {
            result.errors.push('Data must be an array');
            return result;
          }
          
          for (var i = 0; i < data.length; i++) {
            var item = data[i];
            
            if (item == null) {
              result.skipped++;
              continue;
            }
            
            if (typeof item === 'object') {
              var processed = {
                id: item.id || null,
                name: item.name || '',
                value: item.value !== undefined ? item.value : null,
                isValid: Boolean(item.isValid)
              };
              
              result.processed.push(processed);
            } else {
              result.skipped++;
            }
          }
          
          return result;
        }
      `;

      const testFilePath = join(testDataDir, 'null-handling-legacy.js');
      await fs.writeFile(testFilePath, nullHandlingCode);

      const analysisResult = await analyzer.analyzeFile(testFilePath);
      const modernCode = await codeGenerator.generateModernImplementation({
        legacyCode: nullHandlingCode,
        analysisResult: analysisResult
      });

      expect(modernCode.success).toBe(true);

      // Test null/undefined scenarios
      const legacyFunction = eval(`(${nullHandlingCode.match(/function handleNullsAndUndefined[^}]+}/)[0]})`);
      const modernFunction = eval(`(${modernCode.generatedCode.match(/(?:function|const) handleNullsAndUndefined[^}]+}|[^;]+;/)[0]})`);

      const testCases = [
        null,
        undefined,
        'not an array',
        [],
        [null, undefined, { id: 1, name: 'test' }, { value: 42 }, 'string item']
      ];

      for (const testCase of testCases) {
        const legacyResult = legacyFunction(testCase);
        const modernResult = modernFunction(testCase);

        expect(modernResult.processed.length).toBe(legacyResult.processed.length);
        expect(modernResult.skipped).toBe(legacyResult.skipped);
        expect(modernResult.errors.length).toBe(legacyResult.errors.length);
      }

      console.log('Null/undefined handling validation completed!');
    });
  });
});