
        function handleNullsAndUndefined(data) {
          var result = {
            processed: [],
            skipped: 0,
            errors: []
          };
          
          if (data == null) {
            result.errors.push('Data is null or undefined');
            return result;
          }
          
          if (!Array.isArray(data)) {
            result.errors.push('Data must be an array');
            return result;
          }
          
          for (var i = 0; i < data.length; i++) {
            var item = data[i];
            
            if (item == null) {
              result.skipped++;
              continue;
            }
            
            if (typeof item === 'object') {
              var processed = {
                id: item.id || null,
                name: item.name || '',
                value: item.value !== undefined ? item.value : null,
                isValid: Boolean(item.isValid)
              };
              
              result.processed.push(processed);
            } else {
              result.skipped++;
            }
          }
          
          return result;
        }
      