
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
      