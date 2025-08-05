
        function processWithErrorHandling(data) {
          try {
            if (!data) {
              throw new Error('Data is required');
            }
            
            if (typeof data !== 'object') {
              throw new Error('Data must be an object');
            }
            
            var result = {
              processed: true,
              timestamp: new Date().getTime()
            };
            
            if (data.items && Array.isArray(data.items)) {
              result.itemCount = data.items.length;
              result.items = [];
              
              for (var i = 0; i < data.items.length; i++) {
                if (data.items[i] && typeof data.items[i] === 'object') {
                  result.items.push({
                    index: i,
                    value: data.items[i].value || null
                  });
                }
              }
            }
            
            return result;
          } catch (error) {
            return {
              processed: false,
              error: error.message,
              timestamp: new Date().getTime()
            };
          }
        }
      