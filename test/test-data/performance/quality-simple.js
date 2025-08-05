
      function complexFunction0(data, options) {
        var result = { processed: 0, errors: [] };
        
        
          if (data && data.level0) {
            for (var i0 = 0; i0 < data.level0.length; i0++) {
              try {
                var item0 = data.level0[i0];
                if (item0.active) {
                  result.processed++;
                }
              } catch (e) {
                result.errors.push(e.message);
              }
            }
          }
        

            if (data && data.level1) {
              for (var i1 = 0; i1 < data.level1.length; i1++) {
                try {
                  var item1 = data.level1[i1];
                  if (item1.active) {
                    result.processed++;
                  }
                } catch (e) {
                  result.errors.push(e.message);
                }
              }
            }
        
        
        return result;
      }
    


      function complexFunction1(data, options) {
        var result = { processed: 0, errors: [] };
        
        
          if (data && data.level0) {
            for (var i0 = 0; i0 < data.level0.length; i0++) {
              try {
                var item0 = data.level0[i0];
                if (item0.active) {
                  result.processed++;
                }
              } catch (e) {
                result.errors.push(e.message);
              }
            }
          }
        

            if (data && data.level1) {
              for (var i1 = 0; i1 < data.level1.length; i1++) {
                try {
                  var item1 = data.level1[i1];
                  if (item1.active) {
                    result.processed++;
                  }
                } catch (e) {
                  result.errors.push(e.message);
                }
              }
            }
        
        
        return result;
      }
    


      function complexFunction2(data, options) {
        var result = { processed: 0, errors: [] };
        
        
          if (data && data.level0) {
            for (var i0 = 0; i0 < data.level0.length; i0++) {
              try {
                var item0 = data.level0[i0];
                if (item0.active) {
                  result.processed++;
                }
              } catch (e) {
                result.errors.push(e.message);
              }
            }
          }
        

            if (data && data.level1) {
              for (var i1 = 0; i1 < data.level1.length; i1++) {
                try {
                  var item1 = data.level1[i1];
                  if (item1.active) {
                    result.processed++;
                  }
                } catch (e) {
                  result.errors.push(e.message);
                }
              }
            }
        
        
        return result;
      }
    