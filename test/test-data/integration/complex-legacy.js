
        // Complex legacy code with multiple anti-patterns
        var GlobalState = {};
        
        function ComplexProcessor(data) {
          this.data = data;
          this.results = [];
          
          // Anti-pattern: Deeply nested callbacks
          this.process = function(callback) {
            var self = this;
            setTimeout(function() {
              for (var i = 0; i < self.data.length; i++) {
                (function(index) {
                  setTimeout(function() {
                    var item = self.data[index];
                    
                    // Business logic mixed with presentation
                    if (item.type === 'user') {
                      GlobalState.userCount = (GlobalState.userCount || 0) + 1;
                      self.results.push({
                        id: item.id,
                        name: item.name.toUpperCase(),
                        processed: true,
                        timestamp: new Date().getTime()
                      });
                    } else if (item.type === 'order') {
                      GlobalState.orderCount = (GlobalState.orderCount || 0) + 1;
                      self.results.push({
                        id: item.id,
                        total: parseFloat(item.amount) * 1.1, // Tax calculation
                        processed: true,
                        timestamp: new Date().getTime()
                      });
                    }
                    
                    if (index === self.data.length - 1) {
                      callback(self.results);
                    }
                  }, 10);
                })(i);
              }
            }, 50);
          };
        }
        
        // More legacy patterns
        function validateAndProcess(items, successCallback, errorCallback) {
          try {
            var processor = new ComplexProcessor(items);
            processor.process(function(results) {
              if (results.length > 0) {
                successCallback(results);
              } else {
                errorCallback('No results generated');
              }
            });
          } catch (e) {
            errorCallback(e.message);
          }
        }
      