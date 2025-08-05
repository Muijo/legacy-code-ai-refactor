
      // Simple legacy JavaScript code
      function processData(data) {
        var result = [];
        
        for (var i = 0; i < data.length; i++) {
          if (data[i] && data[i].valid) {
            result.push({
              id: data[i].id,
              name: data[i].name || 'Unknown',
              processed: true
            });
          }
        }
        
        return result;
      }
      
      var globalConfig = {
        enabled: true,
        version: '1.0'
      };
    