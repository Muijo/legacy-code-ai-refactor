
        // Legacy jQuery-style code with technical debt
        function processUserData(userData) {
          var result = {};
          
          // Anti-pattern: Global variable usage
          window.tempData = userData;
          
          // Anti-pattern: Nested callbacks
          $.ajax({
            url: '/api/validate',
            data: userData,
            success: function(response) {
              if (response.valid) {
                // Anti-pattern: DOM manipulation in business logic
                $('#status').text('Valid user');
                
                // Business logic mixed with presentation
                result.name = userData.name.toUpperCase();
                result.email = userData.email.toLowerCase();
                result.age = parseInt(userData.age);
                
                // Anti-pattern: Synchronous processing
                for (var i = 0; i < userData.preferences.length; i++) {
                  result.preferences = result.preferences || [];
                  result.preferences.push(userData.preferences[i].trim());
                }
              }
            },
            error: function(xhr, status, error) {
              console.log('Error: ' + error);
              $('#status').text('Invalid user');
            }
          });
          
          return result;
        }
        
        // Legacy pattern: Prototype pollution
        Object.prototype.customMethod = function() {
          return this.toString();
        };
      