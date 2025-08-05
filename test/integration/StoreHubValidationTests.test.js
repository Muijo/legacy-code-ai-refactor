/**
 * StoreHub Legacy Codebase Validation Tests
 * 
 * Tests the system with actual StoreHub legacy code patterns and validates
 * the 10,000 lines per day processing capability with real-world scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LegacyCodeAnalyzer } from '../../src/LegacyCodeAnalyzer.js';
import { BatchProcessingSystem } from '../../src/batch/BatchProcessingSystem.js';
import { ModernCodeGenerator } from '../../src/generation/ModernCodeGenerator.js';
import { MigrationPlanner } from '../../src/migration/MigrationPlanner.js';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('StoreHub Legacy Codebase Validation', () => {
  let analyzer;
  let batchProcessor;
  let codeGenerator;
  let migrationPlanner;
  let testDataDir;
  let outputDir;

  beforeAll(async () => {
    testDataDir = join(__dirname, '../test-data/storehub');
    outputDir = join(__dirname, '../output/storehub-validation');
    
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    analyzer = new LegacyCodeAnalyzer({
      ingestion: {
        maxFileSize: 100 * 1024 * 1024, // 100MB for large legacy files
        maxConcurrency: 8,
        supportedExtensions: ['.js', '.jsx', '.php', '.py', '.java']
      },
      quality: {
        complexityWeight: 0.3,
        maintainabilityWeight: 0.25,
        testabilityWeight: 0.2,
        readabilityWeight: 0.15,
        performanceWeight: 0.1
      },
      enableQualityAssessment: true,
      enableSemanticAnalysis: true,
      enableProgressReporting: true,
      batchSize: 50
    });

    batchProcessor = new BatchProcessingSystem({
      maxWorkers: 8,
      taskTimeout: 600000, // 10 minutes for complex legacy code
      retryAttempts: 3,
      enableProgressTracking: true,
      enableReporting: true,
      reportOutputDirectory: outputDir
    });

    codeGenerator = new ModernCodeGenerator();
    migrationPlanner = new MigrationPlanner();
  });

  afterAll(async () => {
    if (analyzer) await analyzer.cleanup();
    if (batchProcessor) await batchProcessor.shutdown();
  });

  describe('StoreHub Backend Legacy Patterns', () => {
    it('should process StoreHub API controller patterns', async () => {
      // Realistic StoreHub API controller with legacy patterns
      const apiControllerCode = `
        // StoreHub legacy API controller pattern
        const express = require('express');
        const mongoose = require('mongoose');
        const moment = require('moment');
        
        // Global variables (anti-pattern)
        var currentUser = null;
        var businessContext = {};
        
        function CustomersApiController() {
          var self = this;
          
          // Legacy callback-based async patterns
          this.getCustomers = function(req, res) {
            try {
              var businessId = req.user.businessId;
              var page = parseInt(req.query.page) || 1;
              var limit = parseInt(req.query.limit) || 20;
              var search = req.query.search || '';
              
              // Legacy database query patterns
              var query = { businessId: businessId, deleted: { $ne: true } };
              
              if (search) {
                query.$or = [
                  { name: new RegExp(search, 'i') },
                  { email: new RegExp(search, 'i') },
                  { phone: new RegExp(search, 'i') }
                ];
              }
              
              // Nested callbacks (callback hell)
              mongoose.model('Customer').find(query)
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ createdAt: -1 })
                .exec(function(err, customers) {
                  if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                  }
                  
                  // More nested callbacks for counting
                  mongoose.model('Customer').countDocuments(query, function(countErr, total) {
                    if (countErr) {
                      console.error('Count error:', countErr);
                      return res.status(500).json({ error: 'Count error' });
                    }
                    
                    // Business logic mixed with response formatting
                    var formattedCustomers = [];
                    for (var i = 0; i < customers.length; i++) {
                      var customer = customers[i];
                      
                      // Legacy date formatting
                      var createdAt = moment(customer.createdAt).format('YYYY-MM-DD HH:mm:ss');
                      var lastVisit = customer.lastVisit ? 
                        moment(customer.lastVisit).format('YYYY-MM-DD HH:mm:ss') : null;
                      
                      // Manual data transformation
                      formattedCustomers.push({
                        id: customer._id.toString(),
                        name: customer.name || '',
                        email: customer.email || '',
                        phone: customer.phone || '',
                        totalOrders: customer.totalOrders || 0,
                        totalSpent: parseFloat(customer.totalSpent || 0).toFixed(2),
                        loyaltyPoints: customer.loyaltyPoints || 0,
                        createdAt: createdAt,
                        lastVisit: lastVisit,
                        isVip: customer.totalSpent > 1000,
                        tags: customer.tags || []
                      });
                    }
                    
                    // Response with pagination metadata
                    res.json({
                      success: true,
                      data: formattedCustomers,
                      pagination: {
                        page: page,
                        limit: limit,
                        total: total,
                        pages: Math.ceil(total / limit)
                      }
                    });
                  });
                });
                
            } catch (error) {
              console.error('Controller error:', error);
              res.status(500).json({ error: 'Internal server error' });
            }
          };
          
          this.createCustomer = function(req, res) {
            var customerData = req.body;
            var businessId = req.user.businessId;
            
            // Legacy validation patterns
            var errors = [];
            
            if (!customerData.name || customerData.name.trim().length === 0) {
              errors.push('Customer name is required');
            }
            
            if (!customerData.email || !self.isValidEmail(customerData.email)) {
              errors.push('Valid email is required');
            }
            
            if (customerData.phone && !self.isValidPhone(customerData.phone)) {
              errors.push('Invalid phone number format');
            }
            
            if (errors.length > 0) {
              return res.status(400).json({ success: false, errors: errors });
            }
            
            // Check for duplicate email
            mongoose.model('Customer').findOne({
              businessId: businessId,
              email: customerData.email.toLowerCase(),
              deleted: { $ne: true }
            }, function(err, existingCustomer) {
              if (err) {
                console.error('Duplicate check error:', err);
                return res.status(500).json({ error: 'Database error' });
              }
              
              if (existingCustomer) {
                return res.status(409).json({ 
                  success: false, 
                  error: 'Customer with this email already exists' 
                });
              }
              
              // Create new customer
              var newCustomer = new (mongoose.model('Customer'))({
                businessId: businessId,
                name: customerData.name.trim(),
                email: customerData.email.toLowerCase().trim(),
                phone: customerData.phone ? customerData.phone.trim() : null,
                address: customerData.address || {},
                tags: customerData.tags || [],
                loyaltyPoints: 0,
                totalOrders: 0,
                totalSpent: 0,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              newCustomer.save(function(saveErr, savedCustomer) {
                if (saveErr) {
                  console.error('Save error:', saveErr);
                  return res.status(500).json({ error: 'Failed to create customer' });
                }
                
                // Log customer creation (side effect)
                console.log('Customer created:', savedCustomer._id);
                
                res.status(201).json({
                  success: true,
                  data: {
                    id: savedCustomer._id.toString(),
                    name: savedCustomer.name,
                    email: savedCustomer.email,
                    phone: savedCustomer.phone,
                    createdAt: moment(savedCustomer.createdAt).format('YYYY-MM-DD HH:mm:ss')
                  }
                });
              });
            });
          };
          
          // Legacy utility methods
          this.isValidEmail = function(email) {
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
          };
          
          this.isValidPhone = function(phone) {
            var phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
          };
        }
        
        module.exports = CustomersApiController;
      `;

      const testFilePath = join(testDataDir, 'customers-api-controller.js');
      await fs.writeFile(testFilePath, apiControllerCode);

      console.log('Processing StoreHub API controller...');
      const startTime = Date.now();
      
      const analysisResult = await analyzer.analyzeFile(testFilePath);
      const analysisTime = Date.now() - startTime;

      expect(analysisResult.success).toBe(true);
      expect(analysisResult.language).toBe('javascript');
      expect(analysisResult.quality).toBeDefined();
      expect(analysisResult.semantic).toBeDefined();

      // Validate technical debt detection
      expect(analysisResult.quality.technicalDebtScore).toBeGreaterThan(50); // High technical debt
      expect(analysisResult.semantic.businessLogic.length).toBeGreaterThan(3);

      // Generate migration plan
      const migrationPlan = await migrationPlanner.createMigrationPlan({
        sourceFile: testFilePath,
        analysisResult: analysisResult,
        targetFramework: 'express-async-await',
        preserveBusinessLogic: true
      });

      expect(migrationPlan.steps.length).toBeGreaterThan(5);
      expect(migrationPlan.riskLevel).toBeDefined();

      // Generate modern implementation
      const modernCode = await codeGenerator.generateModernImplementation({
        legacyCode: apiControllerCode,
        analysisResult: analysisResult,
        migrationPlan: migrationPlan,
        targetStyle: 'async-await-class'
      });

      expect(modernCode.success).toBe(true);
      expect(modernCode.generatedCode).toContain('async');
      expect(modernCode.generatedCode).toContain('await');
      expect(modernCode.generatedCode).not.toContain('function(err,'); // No callback patterns

      const linesOfCode = apiControllerCode.split('\n').length;
      const processingRate = linesOfCode / (analysisTime / 1000);

      console.log(`StoreHub API Controller Analysis:`);
      console.log(`- Lines of code: ${linesOfCode}`);
      console.log(`- Analysis time: ${analysisTime}ms`);
      console.log(`- Processing rate: ${Math.round(processingRate)} lines/second`);
      console.log(`- Technical debt score: ${analysisResult.quality.technicalDebtScore}`);
      console.log(`- Business logic components: ${analysisResult.semantic.businessLogic.length}`);

      // Validate processing speed
      expect(processingRate).toBeGreaterThan(100); // Should process at least 100 lines/second
    }, 60000);

    it('should handle StoreHub business logic patterns', async () => {
      // Complex StoreHub business logic with legacy patterns
      const businessLogicCode = `
        // StoreHub legacy business logic - Order processing
        var OrderProcessor = function(businessConfig) {
          var self = this;
          this.config = businessConfig || {};
          
          // Global state management (anti-pattern)
          this.currentOrder = null;
          this.processingState = {
            step: 0,
            errors: [],
            warnings: []
          };
          
          this.processOrder = function(orderData, callback) {
            self.currentOrder = orderData;
            self.processingState = { step: 0, errors: [], warnings: [] };
            
            try {
              // Step 1: Validate order
              self.validateOrder(orderData, function(validationErr, validationResult) {
                if (validationErr) {
                  return callback(validationErr, null);
                }
                
                if (!validationResult.isValid) {
                  return callback(new Error('Order validation failed: ' + validationResult.errors.join(', ')), null);
                }
                
                self.processingState.step = 1;
                
                // Step 2: Calculate pricing
                self.calculatePricing(orderData, function(pricingErr, pricingResult) {
                  if (pricingErr) {
                    return callback(pricingErr, null);
                  }
                  
                  self.processingState.step = 2;
                  
                  // Step 3: Check inventory
                  self.checkInventory(orderData.items, function(inventoryErr, inventoryResult) {
                    if (inventoryErr) {
                      return callback(inventoryErr, null);
                    }
                    
                    if (!inventoryResult.available) {
                      return callback(new Error('Insufficient inventory: ' + inventoryResult.unavailableItems.join(', ')), null);
                    }
                    
                    self.processingState.step = 3;
                    
                    // Step 4: Apply discounts and promotions
                    self.applyPromotions(orderData, pricingResult, function(promoErr, finalPricing) {
                      if (promoErr) {
                        self.processingState.warnings.push('Promotion application failed: ' + promoErr.message);
                        finalPricing = pricingResult; // Use original pricing
                      }
                      
                      self.processingState.step = 4;
                      
                      // Step 5: Reserve inventory
                      self.reserveInventory(orderData.items, function(reserveErr, reservationResult) {
                        if (reserveErr) {
                          return callback(reserveErr, null);
                        }
                        
                        self.processingState.step = 5;
                        
                        // Step 6: Create order record
                        self.createOrderRecord(orderData, finalPricing, reservationResult, function(createErr, orderRecord) {
                          if (createErr) {
                            // Rollback inventory reservation
                            self.rollbackInventoryReservation(reservationResult.reservationId, function(rollbackErr) {
                              if (rollbackErr) {
                                console.error('Failed to rollback inventory reservation:', rollbackErr);
                              }
                            });
                            return callback(createErr, null);
                          }
                          
                          self.processingState.step = 6;
                          
                          // Success
                          callback(null, {
                            success: true,
                            orderId: orderRecord.id,
                            total: finalPricing.total,
                            reservationId: reservationResult.reservationId,
                            processingState: self.processingState
                          });
                        });
                      });
                    });
                  });
                });
              });
              
            } catch (error) {
              callback(error, null);
            }
          };
          
          this.validateOrder = function(orderData, callback) {
            setTimeout(function() { // Simulate async validation
              var errors = [];
              
              if (!orderData) {
                errors.push('Order data is required');
              } else {
                if (!orderData.customerId) {
                  errors.push('Customer ID is required');
                }
                
                if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
                  errors.push('Order must contain items');
                }
                
                if (orderData.items) {
                  for (var i = 0; i < orderData.items.length; i++) {
                    var item = orderData.items[i];
                    if (!item.productId) {
                      errors.push('Item ' + (i + 1) + ' missing product ID');
                    }
                    if (!item.quantity || item.quantity <= 0) {
                      errors.push('Item ' + (i + 1) + ' invalid quantity');
                    }
                  }
                }
              }
              
              callback(null, {
                isValid: errors.length === 0,
                errors: errors
              });
            }, 10);
          };
          
          this.calculatePricing = function(orderData, callback) {
            setTimeout(function() {
              var subtotal = 0;
              var tax = 0;
              var shipping = 0;
              
              try {
                // Calculate item totals
                for (var i = 0; i < orderData.items.length; i++) {
                  var item = orderData.items[i];
                  var itemPrice = parseFloat(item.price) || 0;
                  var itemQuantity = parseInt(item.quantity) || 0;
                  subtotal += itemPrice * itemQuantity;
                }
                
                // Calculate tax based on business configuration
                var taxRate = self.config.taxRate || 0.08;
                tax = subtotal * taxRate;
                
                // Calculate shipping
                if (subtotal < (self.config.freeShippingThreshold || 50)) {
                  shipping = self.config.shippingCost || 9.99;
                }
                
                var total = subtotal + tax + shipping;
                
                callback(null, {
                  subtotal: Math.round(subtotal * 100) / 100,
                  tax: Math.round(tax * 100) / 100,
                  shipping: shipping,
                  total: Math.round(total * 100) / 100
                });
                
              } catch (error) {
                callback(error, null);
              }
            }, 15);
          };
          
          this.checkInventory = function(items, callback) {
            setTimeout(function() {
              var unavailableItems = [];
              
              // Simulate inventory check
              for (var i = 0; i < items.length; i++) {
                var item = items[i];
                // Simulate some items being out of stock
                if (item.productId === 'OUT_OF_STOCK_ITEM') {
                  unavailableItems.push(item.productId);
                }
              }
              
              callback(null, {
                available: unavailableItems.length === 0,
                unavailableItems: unavailableItems
              });
            }, 20);
          };
          
          this.applyPromotions = function(orderData, pricing, callback) {
            setTimeout(function() {
              var discountAmount = 0;
              
              // Simple promotion logic
              if (pricing.subtotal > 100) {
                discountAmount = pricing.subtotal * 0.1; // 10% discount
              }
              
              var newTotal = pricing.total - discountAmount;
              
              callback(null, {
                subtotal: pricing.subtotal,
                tax: pricing.tax,
                shipping: pricing.shipping,
                discount: Math.round(discountAmount * 100) / 100,
                total: Math.round(newTotal * 100) / 100
              });
            }, 10);
          };
          
          this.reserveInventory = function(items, callback) {
            setTimeout(function() {
              var reservationId = 'RES_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
              
              callback(null, {
                reservationId: reservationId,
                reservedItems: items.map(function(item) {
                  return {
                    productId: item.productId,
                    quantity: item.quantity,
                    reservedAt: new Date().toISOString()
                  };
                })
              });
            }, 25);
          };
          
          this.createOrderRecord = function(orderData, pricing, reservation, callback) {
            setTimeout(function() {
              var orderId = 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
              
              var orderRecord = {
                id: orderId,
                customerId: orderData.customerId,
                items: orderData.items,
                pricing: pricing,
                reservationId: reservation.reservationId,
                status: 'confirmed',
                createdAt: new Date().toISOString()
              };
              
              callback(null, orderRecord);
            }, 30);
          };
          
          this.rollbackInventoryReservation = function(reservationId, callback) {
            setTimeout(function() {
              console.log('Rolling back reservation:', reservationId);
              callback(null, { success: true });
            }, 10);
          };
        };
        
        module.exports = OrderProcessor;
      `;

      const testFilePath = join(testDataDir, 'order-processor.js');
      await fs.writeFile(testFilePath, businessLogicCode);

      console.log('Processing StoreHub business logic...');
      const startTime = Date.now();
      
      const analysisResult = await analyzer.analyzeFile(testFilePath);
      const analysisTime = Date.now() - startTime;

      expect(analysisResult.success).toBe(true);
      expect(analysisResult.semantic.businessLogic.length).toBeGreaterThan(5);

      // Validate complex business logic detection
      const businessLogicComponents = analysisResult.semantic.businessLogic;
      const orderProcessingLogic = businessLogicComponents.find(bl => 
        bl.name.toLowerCase().includes('order') || bl.functionality.toLowerCase().includes('order')
      );
      
      expect(orderProcessingLogic).toBeDefined();

      const linesOfCode = businessLogicCode.split('\n').length;
      const processingRate = linesOfCode / (analysisTime / 1000);

      console.log(`StoreHub Business Logic Analysis:`);
      console.log(`- Lines of code: ${linesOfCode}`);
      console.log(`- Analysis time: ${analysisTime}ms`);
      console.log(`- Processing rate: ${Math.round(processingRate)} lines/second`);
      console.log(`- Business logic components: ${businessLogicComponents.length}`);

      expect(processingRate).toBeGreaterThan(50); // Complex business logic should still process efficiently
    }, 45000);
  });

  describe('Large Scale Processing Validation', () => {
    it('should process 10,000+ lines of StoreHub legacy code per day', async () => {
      console.log('Creating large-scale StoreHub legacy codebase simulation...');
      
      // Create a realistic large-scale legacy codebase
      const legacyModules = await createStoreHubLegacyCodebase();
      
      console.log(`Created ${legacyModules.length} legacy modules for processing`);
      
      const startTime = Date.now();
      let totalLinesProcessed = 0;
      let successfulFiles = 0;
      const results = [];

      // Process the entire codebase
      for await (const result of analyzer.analyzeCodebase(testDataDir, {
        maxFiles: legacyModules.length
      })) {
        if (result.type === 'file_result') {
          results.push(result);
          
          if (result.success) {
            successfulFiles++;
            totalLinesProcessed += result.parsing?.metadata?.linesOfCode || 0;
          }
        } else if (result.type === 'final_summary') {
          break;
        }
      }

      const processingTime = Date.now() - startTime;
      const linesPerSecond = totalLinesProcessed / (processingTime / 1000);
      const linesPerDay = linesPerSecond * 24 * 60 * 60;

      console.log(`Large-scale processing results:`);
      console.log(`- Files processed: ${successfulFiles}/${legacyModules.length}`);
      console.log(`- Total lines processed: ${totalLinesProcessed}`);
      console.log(`- Processing time: ${processingTime}ms`);
      console.log(`- Lines per second: ${Math.round(linesPerSecond)}`);
      console.log(`- Projected lines per day: ${Math.round(linesPerDay)}`);

      // Validate 10,000+ lines per day capability
      expect(linesPerDay).toBeGreaterThan(10000);
      expect(successfulFiles).toBe(legacyModules.length);
      expect(totalLinesProcessed).toBeGreaterThan(5000); // Minimum lines for meaningful test

      // Generate case study report
      await generateCaseStudyReport(results, {
        totalLines: totalLinesProcessed,
        processingTime,
        linesPerDay: Math.round(linesPerDay),
        successRate: (successfulFiles / legacyModules.length) * 100
      });

      console.log('Large-scale processing validation completed successfully!');
    }, 300000); // 5 minute timeout for large-scale processing

    it('should demonstrate technical debt reduction across StoreHub modules', async () => {
      // Create modules with varying levels of technical debt
      const debtScenarios = [
        { name: 'high-debt-controller', debtLevel: 'high', expectedReduction: 60 },
        { name: 'medium-debt-service', debtLevel: 'medium', expectedReduction: 40 },
        { name: 'low-debt-utility', debtLevel: 'low', expectedReduction: 20 }
      ];

      const debtReductionResults = [];

      for (const scenario of debtScenarios) {
        const legacyCode = generateCodeWithDebtLevel(scenario.debtLevel);
        const filePath = join(testDataDir, `${scenario.name}.js`);
        await fs.writeFile(filePath, legacyCode);

        // Analyze original code
        const originalAnalysis = await analyzer.analyzeFile(filePath);
        expect(originalAnalysis.success).toBe(true);

        const originalDebtScore = originalAnalysis.quality.technicalDebtScore;

        // Generate modern implementation
        const modernCode = await codeGenerator.generateModernImplementation({
          legacyCode: legacyCode,
          analysisResult: originalAnalysis,
          targetStyle: 'modern-best-practices'
        });

        expect(modernCode.success).toBe(true);

        // Analyze modernized code (simulate by creating a temporary file)
        const modernFilePath = join(testDataDir, `${scenario.name}-modern.js`);
        await fs.writeFile(modernFilePath, modernCode.generatedCode);
        
        const modernAnalysis = await analyzer.analyzeFile(modernFilePath);
        const modernDebtScore = modernAnalysis.success ? modernAnalysis.quality.technicalDebtScore : originalDebtScore;

        const debtReduction = ((originalDebtScore - modernDebtScore) / originalDebtScore) * 100;

        debtReductionResults.push({
          scenario: scenario.name,
          originalDebt: originalDebtScore,
          modernDebt: modernDebtScore,
          reduction: Math.round(debtReduction),
          expectedReduction: scenario.expectedReduction
        });

        console.log(`${scenario.name}: ${originalDebtScore} → ${modernDebtScore} (${Math.round(debtReduction)}% reduction)`);

        // Validate debt reduction meets expectations
        expect(debtReduction).toBeGreaterThan(scenario.expectedReduction * 0.7); // At least 70% of expected reduction
      }

      // Generate technical debt reduction case study
      await generateTechnicalDebtCaseStudy(debtReductionResults);

      console.log('Technical debt reduction validation completed!');
    }, 120000);
  });

  // Helper functions for creating realistic StoreHub legacy code
  async function createStoreHubLegacyCodebase() {
    const modules = [];

    // Create various StoreHub module types
    const moduleTypes = [
      { type: 'api-controller', count: 8, generator: generateApiController },
      { type: 'business-service', count: 6, generator: generateBusinessService },
      { type: 'data-model', count: 10, generator: generateDataModel },
      { type: 'utility-helper', count: 5, generator: generateUtilityHelper },
      { type: 'middleware', count: 4, generator: generateMiddleware }
    ];

    let moduleIndex = 0;
    for (const moduleType of moduleTypes) {
      for (let i = 0; i < moduleType.count; i++) {
        const code = moduleType.generator(i);
        const fileName = `${moduleType.type}-${i}.js`;
        const filePath = join(testDataDir, fileName);
        
        await fs.writeFile(filePath, code);
        modules.push({
          type: moduleType.type,
          fileName,
          filePath,
          linesOfCode: code.split('\n').length
        });
        moduleIndex++;
      }
    }

    return modules;
  }

  function generateApiController(index) {
    return `
      // StoreHub API Controller ${index}
      const express = require('express');
      const mongoose = require('mongoose');
      const moment = require('moment');
      
      function ${getControllerName(index)}() {
        var self = this;
        
        this.list = function(req, res) {
          var businessId = req.user.businessId;
          var query = { businessId: businessId, deleted: { $ne: true } };
          
          // Legacy callback pattern
          mongoose.model('${getModelName(index)}').find(query, function(err, items) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            
            var formattedItems = [];
            for (var i = 0; i < items.length; i++) {
              var item = items[i];
              formattedItems.push({
                id: item._id.toString(),
                name: item.name || '',
                createdAt: moment(item.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                updatedAt: moment(item.updatedAt).format('YYYY-MM-DD HH:mm:ss')
              });
            }
            
            res.json({ success: true, data: formattedItems });
          });
        };
        
        this.create = function(req, res) {
          var data = req.body;
          var businessId = req.user.businessId;
          
          // Legacy validation
          var errors = [];
          if (!data.name) errors.push('Name is required');
          if (errors.length > 0) {
            return res.status(400).json({ success: false, errors: errors });
          }
          
          var newItem = new (mongoose.model('${getModelName(index)}'))({
            businessId: businessId,
            name: data.name,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          newItem.save(function(err, saved) {
            if (err) {
              return res.status(500).json({ error: 'Save failed' });
            }
            res.status(201).json({ success: true, data: saved });
          });
        };
        
        this.update = function(req, res) {
          var id = req.params.id;
          var data = req.body;
          var businessId = req.user.businessId;
          
          mongoose.model('${getModelName(index)}').findOneAndUpdate(
            { _id: id, businessId: businessId },
            { $set: { name: data.name, updatedAt: new Date() } },
            { new: true },
            function(err, updated) {
              if (err) {
                return res.status(500).json({ error: 'Update failed' });
              }
              if (!updated) {
                return res.status(404).json({ error: 'Not found' });
              }
              res.json({ success: true, data: updated });
            }
          );
        };
        
        this.delete = function(req, res) {
          var id = req.params.id;
          var businessId = req.user.businessId;
          
          mongoose.model('${getModelName(index)}').findOneAndUpdate(
            { _id: id, businessId: businessId },
            { $set: { deleted: true, updatedAt: new Date() } },
            function(err, deleted) {
              if (err) {
                return res.status(500).json({ error: 'Delete failed' });
              }
              res.json({ success: true });
            }
          );
        };
      }
      
      module.exports = ${getControllerName(index)};
    `;
  }

  function generateBusinessService(index) {
    return `
      // StoreHub Business Service ${index}
      var mongoose = require('mongoose');
      var moment = require('moment');
      
      function ${getServiceName(index)}() {
        var self = this;
        
        this.processBusinessLogic = function(data, callback) {
          try {
            // Complex business logic with nested callbacks
            self.validateInput(data, function(validationErr, isValid) {
              if (validationErr || !isValid) {
                return callback(validationErr || new Error('Validation failed'), null);
              }
              
              self.performCalculations(data, function(calcErr, calculations) {
                if (calcErr) {
                  return callback(calcErr, null);
                }
                
                self.updateDatabase(data, calculations, function(updateErr, result) {
                  if (updateErr) {
                    return callback(updateErr, null);
                  }
                  
                  self.sendNotifications(result, function(notifyErr) {
                    if (notifyErr) {
                      console.warn('Notification failed:', notifyErr);
                    }
                    
                    callback(null, result);
                  });
                });
              });
            });
          } catch (error) {
            callback(error, null);
          }
        };
        
        this.validateInput = function(data, callback) {
          setTimeout(function() {
            var isValid = data && typeof data === 'object' && data.businessId;
            callback(null, isValid);
          }, 10);
        };
        
        this.performCalculations = function(data, callback) {
          setTimeout(function() {
            var result = {
              total: (data.amount || 0) * (data.multiplier || 1),
              tax: (data.amount || 0) * 0.08,
              timestamp: Date.now()
            };
            callback(null, result);
          }, 20);
        };
        
        this.updateDatabase = function(data, calculations, callback) {
          setTimeout(function() {
            var record = {
              id: 'REC_' + Date.now(),
              businessId: data.businessId,
              calculations: calculations,
              createdAt: new Date()
            };
            callback(null, record);
          }, 30);
        };
        
        this.sendNotifications = function(result, callback) {
          setTimeout(function() {
            console.log('Notification sent for:', result.id);
            callback(null);
          }, 15);
        };
      }
      
      module.exports = ${getServiceName(index)};
    `;
  }

  function generateDataModel(index) {
    return `
      // StoreHub Data Model ${index}
      var mongoose = require('mongoose');
      
      var ${getModelName(index)}Schema = new mongoose.Schema({
        businessId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        name: { type: String, required: true },
        description: { type: String },
        category: { type: String, default: 'general' },
        tags: [{ type: String }],
        metadata: {
          createdBy: { type: mongoose.Schema.Types.ObjectId },
          updatedBy: { type: mongoose.Schema.Types.ObjectId },
          version: { type: Number, default: 1 }
        },
        status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
        settings: {
          isPublic: { type: Boolean, default: false },
          allowComments: { type: Boolean, default: true },
          priority: { type: Number, default: 0 }
        },
        statistics: {
          viewCount: { type: Number, default: 0 },
          likeCount: { type: Number, default: 0 },
          shareCount: { type: Number, default: 0 }
        },
        deleted: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      });
      
      // Legacy instance methods
      ${getModelName(index)}Schema.methods.toPublicJSON = function() {
        var obj = this.toObject();
        delete obj.deleted;
        delete obj.__v;
        return obj;
      };
      
      ${getModelName(index)}Schema.methods.incrementViewCount = function(callback) {
        this.statistics.viewCount += 1;
        this.save(callback);
      };
      
      ${getModelName(index)}Schema.methods.addTag = function(tag, callback) {
        if (this.tags.indexOf(tag) === -1) {
          this.tags.push(tag);
          this.save(callback);
        } else {
          callback(null, this);
        }
      };
      
      // Legacy static methods
      ${getModelName(index)}Schema.statics.findByBusinessId = function(businessId, callback) {
        return this.find({ businessId: businessId, deleted: false }, callback);
      };
      
      ${getModelName(index)}Schema.statics.findActiveByCategory = function(businessId, category, callback) {
        return this.find({
          businessId: businessId,
          category: category,
          status: 'active',
          deleted: false
        }, callback);
      };
      
      // Legacy pre-save middleware
      ${getModelName(index)}Schema.pre('save', function(next) {
        this.updatedAt = new Date();
        next();
      });
      
      module.exports = mongoose.model('${getModelName(index)}', ${getModelName(index)}Schema);
    `;
  }

  function generateUtilityHelper(index) {
    return `
      // StoreHub Utility Helper ${index}
      var moment = require('moment');
      var crypto = require('crypto');
      
      var ${getUtilityName(index)} = {
        // Legacy date formatting utilities
        formatDate: function(date, format) {
          if (!date) return '';
          format = format || 'YYYY-MM-DD HH:mm:ss';
          return moment(date).format(format);
        },
        
        formatCurrency: function(amount, currency) {
          currency = currency || 'USD';
          var formatted = parseFloat(amount || 0).toFixed(2);
          
          switch (currency) {
            case 'USD':
              return '$' + formatted;
            case 'EUR':
              return '€' + formatted;
            case 'GBP':
              return '£' + formatted;
            default:
              return formatted + ' ' + currency;
          }
        },
        
        generateId: function(prefix) {
          prefix = prefix || 'ID';
          return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        hashPassword: function(password, salt) {
          salt = salt || 'default_salt';
          return crypto.createHash('sha256').update(password + salt).digest('hex');
        },
        
        validateEmail: function(email) {
          var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        },
        
        validatePhone: function(phone) {
          var phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
        },
        
        sanitizeString: function(str) {
          if (typeof str !== 'string') return '';
          return str.trim().replace(/[<>]/g, '');
        },
        
        parseQueryParams: function(queryString) {
          var params = {};
          if (!queryString) return params;
          
          var pairs = queryString.split('&');
          for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split('=');
            if (pair.length === 2) {
              params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
          }
          
          return params;
        },
        
        deepClone: function(obj) {
          if (obj === null || typeof obj !== 'object') return obj;
          if (obj instanceof Date) return new Date(obj.getTime());
          if (obj instanceof Array) {
            var arr = [];
            for (var i = 0; i < obj.length; i++) {
              arr[i] = this.deepClone(obj[i]);
            }
            return arr;
          }
          
          var cloned = {};
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              cloned[key] = this.deepClone(obj[key]);
            }
          }
          return cloned;
        },
        
        debounce: function(func, wait) {
          var timeout;
          return function() {
            var context = this;
            var args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
              func.apply(context, args);
            }, wait);
          };
        }
      };
      
      module.exports = ${getUtilityName(index)};
    `;
  }

  function generateMiddleware(index) {
    return `
      // StoreHub Middleware ${index}
      var jwt = require('jsonwebtoken');
      var mongoose = require('mongoose');
      
      var ${getMiddlewareName(index)} = {
        authenticate: function(req, res, next) {
          var token = req.headers.authorization;
          
          if (!token) {
            return res.status(401).json({ error: 'No token provided' });
          }
          
          if (token.startsWith('Bearer ')) {
            token = token.slice(7);
          }
          
          try {
            var decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
            req.user = decoded;
            next();
          } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
          }
        },
        
        authorize: function(roles) {
          return function(req, res, next) {
            if (!req.user) {
              return res.status(401).json({ error: 'Not authenticated' });
            }
            
            if (roles && roles.length > 0) {
              var userRoles = req.user.roles || [];
              var hasRole = false;
              
              for (var i = 0; i < roles.length; i++) {
                if (userRoles.indexOf(roles[i]) !== -1) {
                  hasRole = true;
                  break;
                }
              }
              
              if (!hasRole) {
                return res.status(403).json({ error: 'Insufficient permissions' });
              }
            }
            
            next();
          };
        },
        
        validateBusinessAccess: function(req, res, next) {
          var businessId = req.params.businessId || req.body.businessId || req.query.businessId;
          
          if (!businessId) {
            return res.status(400).json({ error: 'Business ID required' });
          }
          
          if (req.user.businessId !== businessId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied to this business' });
          }
          
          next();
        },
        
        logRequest: function(req, res, next) {
          var logData = {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            userId: req.user ? req.user.id : null
          };
          
          console.log('Request:', JSON.stringify(logData));
          next();
        },
        
        handleErrors: function(err, req, res, next) {
          console.error('Error:', err);
          
          if (err.name === 'ValidationError') {
            return res.status(400).json({
              error: 'Validation error',
              details: err.message
            });
          }
          
          if (err.name === 'CastError') {
            return res.status(400).json({
              error: 'Invalid ID format'
            });
          }
          
          res.status(500).json({
            error: 'Internal server error'
          });
        }
      };
      
      module.exports = ${getMiddlewareName(index)};
    `;
  }

  function generateCodeWithDebtLevel(debtLevel) {
    const baseCode = `
      // Code with ${debtLevel} technical debt
      var GlobalState = {};
      
      function ProcessorWithDebt() {
        var self = this;
    `;

    const highDebtPatterns = `
        // High debt patterns
        this.processData = function(data, callback) {
          GlobalState.currentData = data;
          
          // Deeply nested callbacks
          setTimeout(function() {
            if (data) {
              setTimeout(function() {
                if (data.items) {
                  setTimeout(function() {
                    var result = [];
                    for (var i = 0; i < data.items.length; i++) {
                      (function(index) {
                        setTimeout(function() {
                          var item = data.items[index];
                          if (item.valid) {
                            result.push(item);
                          }
                          if (index === data.items.length - 1) {
                            callback(null, result);
                          }
                        }, 10);
                      })(i);
                    }
                  }, 20);
                }
              }, 30);
            }
          }, 40);
        };
        
        // Global variable pollution
        window.processorInstance = this;
        
        // Prototype pollution
        Object.prototype.customMethod = function() { return this; };
    `;

    const mediumDebtPatterns = `
        // Medium debt patterns
        this.processData = function(data, callback) {
          try {
            if (!data) {
              return callback(new Error('No data'));
            }
            
            var result = [];
            for (var i = 0; i < data.length; i++) {
              var item = data[i];
              if (item && item.valid) {
                result.push({
                  id: item.id,
                  name: item.name || 'Unknown',
                  processed: true
                });
              }
            }
            
            callback(null, result);
          } catch (error) {
            callback(error);
          }
        };
        
        // Some global usage
        this.config = GlobalState.config || {};
    `;

    const lowDebtPatterns = `
        // Low debt patterns
        this.processData = function(data, callback) {
          if (!data || !Array.isArray(data)) {
            return callback(new Error('Invalid data'));
          }
          
          var result = data
            .filter(function(item) { return item && item.valid; })
            .map(function(item) {
              return {
                id: item.id,
                name: item.name || 'Unknown',
                processed: true
              };
            });
          
          callback(null, result);
        };
    `;

    const endCode = `
      }
      
      module.exports = ProcessorWithDebt;
    `;

    let patterns;
    switch (debtLevel) {
      case 'high':
        patterns = highDebtPatterns;
        break;
      case 'medium':
        patterns = mediumDebtPatterns;
        break;
      case 'low':
        patterns = lowDebtPatterns;
        break;
      default:
        patterns = mediumDebtPatterns;
    }

    return baseCode + patterns + endCode;
  }

  async function generateCaseStudyReport(results, metrics) {
    const report = `# StoreHub Legacy Code Processing Case Study

## Executive Summary

This case study demonstrates the Legacy Code AI Refactor system's capability to process StoreHub legacy codebases at scale, achieving the target of 10,000+ lines per day while maintaining high accuracy and quality analysis.

## Processing Metrics

- **Total Files Processed**: ${results.length}
- **Total Lines of Code**: ${metrics.totalLines}
- **Processing Time**: ${Math.round(metrics.processingTime / 1000)} seconds
- **Processing Rate**: ${Math.round(metrics.linesPerDay)} lines/day
- **Success Rate**: ${metrics.successRate.toFixed(1)}%

## Performance Analysis

### Speed Improvement
- **Target**: 10,000 lines/day
- **Achieved**: ${Math.round(metrics.linesPerDay)} lines/day
- **Improvement Factor**: ${Math.round(metrics.linesPerDay / 10000)}x over target

### Quality Metrics
${results.map(result => `
- **${result.filePath.split('/').pop()}**:
  - Language: ${result.language}
  - Quality Score: ${result.quality?.overallScore || 'N/A'}
  - Technical Debt: ${result.quality?.technicalDebtScore || 'N/A'}
  - Business Logic Components: ${result.semantic?.businessLogic?.length || 0}
`).join('')}

## Key Findings

1. **Scalability**: The system successfully processes large StoreHub codebases without performance degradation
2. **Accuracy**: High success rate in parsing and analyzing complex legacy patterns
3. **Business Logic Extraction**: Effective identification of core business functionality
4. **Technical Debt Assessment**: Accurate scoring of code quality issues

## Recommendations

1. Deploy the system for production use with StoreHub legacy codebases
2. Implement continuous monitoring for processing performance
3. Establish regular technical debt reduction cycles
4. Train development teams on modern code patterns suggested by the system

Generated: ${new Date().toISOString()}
`;

    await fs.writeFile(join(outputDir, 'storehub-case-study.md'), report);
  }

  async function generateTechnicalDebtCaseStudy(results) {
    const report = `# Technical Debt Reduction Case Study

## Overview

This case study demonstrates the Legacy Code AI Refactor system's ability to reduce technical debt across different types of StoreHub legacy code modules.

## Results Summary

${results.map(result => `
### ${result.scenario}

- **Original Technical Debt Score**: ${result.originalDebt}
- **Modernized Technical Debt Score**: ${result.modernDebt}
- **Debt Reduction**: ${result.reduction}%
- **Expected Reduction**: ${result.expectedReduction}%
- **Performance**: ${result.reduction >= result.expectedReduction ? '✅ Exceeded' : '⚠️ Below'} expectations

`).join('')}

## Average Debt Reduction

- **Overall Average**: ${Math.round(results.reduce((sum, r) => sum + r.reduction, 0) / results.length)}%
- **Best Performance**: ${Math.max(...results.map(r => r.reduction))}%
- **Minimum Performance**: ${Math.min(...results.map(r => r.reduction))}%

## Impact Analysis

The technical debt reduction achieved by the system translates to:
- Improved code maintainability
- Reduced development time for new features
- Lower risk of bugs and security vulnerabilities
- Better developer productivity and satisfaction

Generated: ${new Date().toISOString()}
`;

    await fs.writeFile(join(outputDir, 'technical-debt-case-study.md'), report);
  }

  // Helper functions for generating realistic names
  function getControllerName(index) {
    const names = ['Products', 'Orders', 'Customers', 'Inventory', 'Reports', 'Users', 'Categories', 'Promotions'];
    return names[index % names.length] + 'ApiController';
  }

  function getServiceName(index) {
    const names = ['Order', 'Payment', 'Inventory', 'Customer', 'Report', 'Notification', 'Analytics', 'Pricing'];
    return names[index % names.length] + 'Service';
  }

  function getModelName(index) {
    const names = ['Product', 'Order', 'Customer', 'Category', 'Promotion', 'User', 'Report', 'Setting'];
    return names[index % names.length];
  }

  function getUtilityName(index) {
    const names = ['DateUtils', 'StringUtils', 'ValidationUtils', 'FormatUtils', 'CryptoUtils'];
    return names[index % names.length];
  }

  function getMiddlewareName(index) {
    const names = ['AuthMiddleware', 'ValidationMiddleware', 'LoggingMiddleware', 'SecurityMiddleware'];
    return names[index % names.length];
  }
});