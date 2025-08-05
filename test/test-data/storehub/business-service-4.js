
      // StoreHub Business Service 4
      var mongoose = require('mongoose');
      var moment = require('moment');
      
      function ReportService() {
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
      
      module.exports = ReportService;
    