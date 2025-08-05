
        // Malformed legacy code with syntax issues
        function brokenFunction(data {  // Missing closing parenthesis
          var result = [];
          
          for (var i = 0; i < data.length; i++ {  // Missing closing parenthesis
            if (data[i].valid) {
              result.push(data[i];  // Missing closing parenthesis
            }
          }
          
          return result;
        }
        
        // Incomplete function
        function incompleteFunction(param) {
          var temp = param * 2;
          // Missing return statement and closing brace
      