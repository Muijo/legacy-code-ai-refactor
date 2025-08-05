
      // Code with high technical debt
      var GlobalState = {};
      
      function ProcessorWithDebt() {
        var self = this;
    
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
    
      }
      
      module.exports = ProcessorWithDebt;
    