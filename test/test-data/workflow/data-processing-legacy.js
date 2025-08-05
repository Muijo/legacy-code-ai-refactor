
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
            return category.toLowerCase().replace(/s+/g, '-');
          },
          
          generateId: function() {
            return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          }
        };
      