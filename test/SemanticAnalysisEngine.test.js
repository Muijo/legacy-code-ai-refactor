import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticAnalysisEngine } from '../src/semantic/SemanticAnalysisEngine.js';
import { MultiLanguageParser } from '../src/parsers/MultiLanguageParser.js';

describe('SemanticAnalysisEngine', () => {
  let semanticEngine;
  let parser;

  beforeEach(() => {
    semanticEngine = new SemanticAnalysisEngine({
      businessLogicThreshold: 0.6,
      domainConceptMinScore: 0.5,
      crossCuttingConcernThreshold: 0.7
    });
    parser = new MultiLanguageParser();
  });

  describe('Business Logic Analysis', () => {
    it('should identify business logic in e-commerce code', async () => {
      const ecommerceCode = `
        function calculateOrderTotal(order) {
          let total = 0;
          order.items.forEach(item => {
            total += item.price * item.quantity;
          });
          
          // Apply discount
          if (order.customer.isVip) {
            total *= 0.9;
          }
          
          // Add tax
          total += total * 0.08;
          
          return total;
        }
        
        function validateInventory(product, quantity) {
          if (product.stock < quantity) {
            throw new Error('Insufficient inventory');
          }
          return true;
        }
      `;

      const parseResult = await parser.parse(ecommerceCode, 'javascript', 'ecommerce.js');
      const semanticResult = await semanticEngine.analyzeSemantics(parseResult);

      expect(semanticResult.success).toBe(true);
      expect(semanticResult.businessLogicAnalysis).toBeDefined();
      expect(semanticResult.businessLogicAnalysis.businessLogicElements.length).toBeGreaterThan(0);
      expect(semanticResult.semanticScores.businessLogicScore).toBeGreaterThan(50);
    });

    it('should identify infrastructure code', async () => {
      const infrastructureCode = `
        const express = require('express');
        const redis = require('redis');
        const logger = require('winston');
        
        function setupDatabase() {
          const connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
          });
          return connection;
        }
        
        function cacheData(key, data) {
          const client = redis.createClient();
          client.set(key, JSON.stringify(data));
          logger.info('Data cached successfully');
        }
      `;

      const parseResult = await parser.parse(infrastructureCode, 'javascript', 'infrastructure.js');
      const semanticResult = await semanticEngine.analyzeSemantics(parseResult);

      expect(semanticResult.success).toBe(true);
      expect(semanticResult.businessLogicAnalysis.infrastructureElements.length).toBeGreaterThan(0);
      expect(semanticResult.semanticScores.businessLogicScore).toBeLessThan(50);
    });
  });

  describe('Domain Concept Identification', () => {
    it('should identify e-commerce domain concepts', async () => {
      const ecommerceCode = `
        class Order {
          constructor(customer, products) {
            this.customer = customer;
            this.products = products;
            this.status = 'pending';
          }
          
          calculateTotal() {
            return this.products.reduce((sum, product) => {
              return sum + (product.price * product.quantity);
            }, 0);
          }
          
          processPayment(paymentMethod) {
            // Process payment logic
            this.status = 'paid';
          }
        }
        
        class Customer {
          constructor(name, email) {
            this.name = name;
            this.email = email;
            this.cart = new Cart();
          }
        }
        
        class Product {
          constructor(name, price, inventory) {
            this.name = name;
            this.price = price;
            this.inventory = inventory;
          }
        }
      `;

      const parseResult = await parser.parse(ecommerceCode, 'javascript', 'ecommerce-domain.js');
      const semanticResult = await semanticEngine.analyzeSemantics(parseResult);

      expect(semanticResult.success).toBe(true);
      expect(semanticResult.domainConcepts).toBeDefined();
      expect(semanticResult.domainConcepts.length).toBeGreaterThan(0);
      
      const ecommerceDomain = semanticResult.domainConcepts.find(d => d.domain === 'E-commerce');
      expect(ecommerceDomain).toBeDefined();
      expect(ecommerceDomain.entities.length).toBeGreaterThan(0);
    });

    it('should identify financial domain concepts', async () => {
      const financialCode = `
        function calculateInterest(account, rate, period) {
          const principal = account.balance;
          const interest = principal * rate * period;
          return interest;
        }
        
        function processTransaction(fromAccount, toAccount, amount) {
          if (fromAccount.balance < amount) {
            throw new Error('Insufficient funds');
          }
          
          fromAccount.balance -= amount;
          toAccount.balance += amount;
          
          // Create audit trail
          createAuditRecord({
            type: 'transfer',
            from: fromAccount.id,
            to: toAccount.id,
            amount: amount,
            timestamp: new Date()
          });
        }
      `;

      const parseResult = await parser.parse(financialCode, 'javascript', 'financial.js');
      const semanticResult = await semanticEngine.analyzeSemantics(parseResult);

      expect(semanticResult.success).toBe(true);
      expect(semanticResult.domainConcepts).toBeDefined();
      
      const financialDomain = semanticResult.domainConcepts.find(d => d.domain === 'Financial');
      expect(financialDomain).toBeDefined();
    });
  });

  describe('Business Rule Extraction', () => {
    it('should extract validation rules', async () => {
      const validationCode = `
        function validateUser(user) {
          if (!user.email || !user.email.includes('@')) {
            throw new Error('Invalid email address');
          }
          
          if (user.age < 18) {
            throw new Error('User must be at least 18 years old');
          }
          
          if (user.password.length < 8) {
            throw new Error('Password must be at least 8 characters');
          }
          
          return true;
        }
        
        function checkOrderLimit(customer, orderAmount) {
          const maxAmount = customer.isVip ? 10000 : 5000;
          if (orderAmount > maxAmount) {
            throw new Error('Order amount exceeds limit');
          }
        }
      `;

      const parseResult = await parser.parse(validationCode, 'javascript', 'validation.js');
      const semanticResult = await semanticEngine.analyzeSemantics(parseResult);

      expect(semanticResult.success).toBe(true);
      expect(semanticResult.businessRules).toBeDefined();
      expect(semanticResult.businessRules.rules).toBeDefined();
      expect(semanticResult.businessRules.rules.length).toBeGreaterThan(0);
      
      const validationRules = semanticResult.businessRules.rules.filter(r => r.primaryCategory === 'Validation');
      expect(validationRules.length).toBeGreaterThan(0);
    });

    it('should extract calculation rules', async () => {
      const calculationCode = `
        function calculateShippingCost(order, destination) {
          let baseCost = 10;
          const weight = order.items.reduce((sum, item) => sum + item.weight, 0);
          
          // Weight-based pricing
          if (weight > 5) {
            baseCost += (weight - 5) * 2;
          }
          
          // Distance-based pricing
          const distance = getDistance(order.origin, destination);
          if (distance > 100) {
            baseCost *= 1.5;
          }
          
          // Express shipping
          if (order.isExpress) {
            baseCost *= 2;
          }
          
          return baseCost;
        }
        
        function calculateTax(amount, location) {
          const taxRate = getTaxRate(location);
          return amount * taxRate;
        }
      `;

      const parseResult = await parser.parse(calculationCode, 'javascript', 'calculation.js');
      const semanticResult = await semanticEngine.analyzeSemantics(parseResult);

      expect(semanticResult.success).toBe(true);
      expect(semanticResult.businessRules.rules.length).toBeGreaterThan(0);
      
      const calculationRules = semanticResult.businessRules.rules.filter(r => r.primaryCategory === 'Calculation');
      expect(calculationRules.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Cutting Concern Detection', () => {
    it('should detect logging concerns', async () => {
      const loggingCode = `
        function processOrder(order) {
          console.log('Processing order:', order.id);
          
          try {
            validateOrder(order);
            console.log('Order validated successfully');
            
            const result = saveOrder(order);
            console.log('Order saved:', result.id);
            
            return result;
          } catch (error) {
            console.error('Order processing failed:', error);
            throw error;
          }
        }
        
        function validateOrder(order) {
          console.log('Validating order:', order.id);
          
          if (!order.customer) {
            console.error('Order missing customer');
            throw new Error('Customer required');
          }
          
          console.log('Order validation complete');
        }
        
        function saveOrder(order) {
          console.log('Saving order to database');
          // Database save logic
          console.log('Order saved successfully');
          return { id: 123 };
        }
      `;

      const parseResult = await parser.parse(loggingCode, 'javascript', 'logging.js');
      const semanticResult = await semanticEngine.analyzeSemantics(parseResult);

      expect(semanticResult.success).toBe(true);
      expect(semanticResult.crossCuttingConcerns).toBeDefined();
      expect(semanticResult.crossCuttingConcerns.concerns).toBeDefined();
      
      const loggingConcern = semanticResult.crossCuttingConcerns.concerns.find(c => c.name === 'Logging');
      expect(loggingConcern).toBeDefined();
      expect(loggingConcern.affectedElements.length).toBeGreaterThan(1);
    });

    it('should detect error handling concerns', async () => {
      const errorHandlingCode = `
        function processPayment(payment) {
          try {
            validatePayment(payment);
          } catch (error) {
            handlePaymentError(error);
            throw error;
          }
        }
        
        function validatePayment(payment) {
          try {
            checkCardDetails(payment.card);
          } catch (error) {
            logError('Card validation failed', error);
            throw new Error('Invalid card details');
          }
        }
        
        function saveTransaction(transaction) {
          try {
            database.save(transaction);
          } catch (error) {
            logError('Database save failed', error);
            throw new Error('Transaction save failed');
          }
        }
      `;

      const parseResult = await parser.parse(errorHandlingCode, 'javascript', 'error-handling.js');
      const semanticResult = await semanticEngine.analyzeSemantics(parseResult);

      expect(semanticResult.success).toBe(true);
      
      const errorHandlingConcern = semanticResult.crossCuttingConcerns.concerns.find(c => c.name === 'Error Handling');
      expect(errorHandlingConcern).toBeDefined();
      expect(errorHandlingConcern.affectedElements.length).toBeGreaterThan(1);
    });
  });

  describe('Semantic Scores', () => {
    it('should calculate semantic scores correctly', async () => {
      const mixedCode = `
        // Business logic
        function calculateDiscount(customer, order) {
          if (customer.isVip) {
            return order.total * 0.1;
          }
          return 0;
        }
        
        // Infrastructure
        function logActivity(message) {
          console.log(new Date().toISOString(), message);
        }
        
        // Mixed
        function processOrder(order) {
          console.log('Processing order:', order.id); // Infrastructure
          
          const discount = calculateDiscount(order.customer, order); // Business
          order.total -= discount;
          
          console.log('Order processed:', order.id); // Infrastructure
          return order;
        }
      `;

      const parseResult = await parser.parse(mixedCode, 'javascript', 'mixed.js');
      const semanticResult = await semanticEngine.analyzeSemantics(parseResult);

      expect(semanticResult.success).toBe(true);
      expect(semanticResult.semanticScores).toBeDefined();
      expect(semanticResult.semanticScores.businessLogicScore).toBeGreaterThanOrEqual(0);
      expect(semanticResult.semanticScores.businessLogicScore).toBeLessThanOrEqual(100);
      expect(semanticResult.semanticScores.domainClarityScore).toBeGreaterThanOrEqual(0);
      expect(semanticResult.semanticScores.separationOfConcernsScore).toBeGreaterThanOrEqual(0);
      expect(semanticResult.semanticScores.overallSemanticScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Recommendations', () => {
    it('should generate separation recommendations for mixed elements', async () => {
      const mixedCode = `
        function processUserRegistration(userData) {
          // Validation (business logic)
          if (!userData.email || !userData.password) {
            throw new Error('Email and password required');
          }
          
          // Database access (infrastructure)
          const connection = mysql.createConnection(dbConfig);
          
          // Business logic
          const hashedPassword = hashPassword(userData.password);
          
          // Infrastructure
          const query = 'INSERT INTO users (email, password) VALUES (?, ?)';
          connection.query(query, [userData.email, hashedPassword]);
          
          // Infrastructure
          logger.info('User registered:', userData.email);
          
          return { success: true };
        }
      `;

      const parseResult = await parser.parse(mixedCode, 'javascript', 'mixed-concerns.js');
      const semanticResult = await semanticEngine.analyzeSemantics(parseResult);

      expect(semanticResult.success).toBe(true);
      expect(semanticResult.recommendations).toBeDefined();
      expect(semanticResult.recommendations.length).toBeGreaterThan(0);
      
      const separationRecommendation = semanticResult.recommendations.find(r => r.type === 'separation');
      expect(separationRecommendation).toBeDefined();
    });

    it('should generate cross-cutting concern recommendations', async () => {
      const crossCuttingCode = `
        function createUser(userData) {
          console.log('Creating user:', userData.email);
          // User creation logic
          console.log('User created successfully');
        }
        
        function updateUser(userId, userData) {
          console.log('Updating user:', userId);
          // User update logic
          console.log('User updated successfully');
        }
        
        function deleteUser(userId) {
          console.log('Deleting user:', userId);
          // User deletion logic
          console.log('User deleted successfully');
        }
      `;

      const parseResult = await parser.parse(crossCuttingCode, 'javascript', 'cross-cutting.js');
      const semanticResult = await semanticEngine.analyzeSemantics(parseResult);

      expect(semanticResult.success).toBe(true);
      expect(semanticResult.recommendations).toBeDefined();
      
      const crossCuttingRecommendation = semanticResult.recommendations.find(r => r.type === 'cross_cutting');
      expect(crossCuttingRecommendation).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle parsing errors gracefully', async () => {
      const invalidParseResult = {
        success: false,
        error: 'Parse error',
        filePath: 'invalid.js'
      };

      const semanticResult = await semanticEngine.analyzeSemantics(invalidParseResult);

      expect(semanticResult.success).toBe(false);
      expect(semanticResult.error).toBe('Parse error');
      expect(semanticResult.filePath).toBe('invalid.js');
    });

    it('should handle analysis errors gracefully', async () => {
      const parseResult = {
        success: true,
        ast: null, // This will cause an error
        metadata: {},
        language: 'javascript',
        filePath: 'test.js'
      };

      const semanticResult = await semanticEngine.analyzeSemantics(parseResult);

      expect(semanticResult.success).toBe(false);
      expect(semanticResult.error).toBeDefined();
      expect(semanticResult.filePath).toBe('test.js');
    });
  });
});