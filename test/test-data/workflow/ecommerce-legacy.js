
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
            
            var cardNumber = paymentData.cardNumber.replace(/s/g, '');
            
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
      