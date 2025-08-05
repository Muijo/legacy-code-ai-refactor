
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
            var emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/;
            return emailRegex.test(email);
          };
          
          this.isValidPhone = function(phone) {
            var phoneRegex = /^[+]?[1-9][d]{0,15}$/;
            return phoneRegex.test(phone.replace(/[s-()]/g, ''));
          };
        }
        
        module.exports = CustomersApiController;
      