
      // Medium legacy file 12
      var globalState12 = {};
      
      function processData12(data) {
        var results = [];
        
        // Legacy pattern: nested loops with side effects
        for (var i = 0; i < data.length; i++) {
          globalState12.currentIndex = i;
          
          for (var j = 0; j < data[i].items.length; j++) {
            var item = data[i].items[j];
            
            // Business logic mixed with presentation
            if (item.type === 'important') {
              $('#status').text('Processing important item');
              results.push({
                id: item.id,
                value: item.value * 2,
                processed: true,
                timestamp: new Date().getTime()
              });
            }
          }
        }
        
        return results;
      }
      
      // More legacy patterns...
      
        function helperFunction12_0(param) {
          var temp = globalState12.temp || {};
          temp.value0 = param * 1;
          globalState12.temp = temp;
          return temp.value0;
        }
      

        function helperFunction12_1(param) {
          var temp = globalState12.temp || {};
          temp.value1 = param * 2;
          globalState12.temp = temp;
          return temp.value1;
        }
      

        function helperFunction12_2(param) {
          var temp = globalState12.temp || {};
          temp.value2 = param * 3;
          globalState12.temp = temp;
          return temp.value2;
        }
      

        function helperFunction12_3(param) {
          var temp = globalState12.temp || {};
          temp.value3 = param * 4;
          globalState12.temp = temp;
          return temp.value3;
        }
      

        function helperFunction12_4(param) {
          var temp = globalState12.temp || {};
          temp.value4 = param * 5;
          globalState12.temp = temp;
          return temp.value4;
        }
      

        function helperFunction12_5(param) {
          var temp = globalState12.temp || {};
          temp.value5 = param * 6;
          globalState12.temp = temp;
          return temp.value5;
        }
      

        function helperFunction12_6(param) {
          var temp = globalState12.temp || {};
          temp.value6 = param * 7;
          globalState12.temp = temp;
          return temp.value6;
        }
      

        function helperFunction12_7(param) {
          var temp = globalState12.temp || {};
          temp.value7 = param * 8;
          globalState12.temp = temp;
          return temp.value7;
        }
      

        function helperFunction12_8(param) {
          var temp = globalState12.temp || {};
          temp.value8 = param * 9;
          globalState12.temp = temp;
          return temp.value8;
        }
      

        function helperFunction12_9(param) {
          var temp = globalState12.temp || {};
          temp.value9 = param * 10;
          globalState12.temp = temp;
          return temp.value9;
        }
      

        function helperFunction12_10(param) {
          var temp = globalState12.temp || {};
          temp.value10 = param * 11;
          globalState12.temp = temp;
          return temp.value10;
        }
      

        function helperFunction12_11(param) {
          var temp = globalState12.temp || {};
          temp.value11 = param * 12;
          globalState12.temp = temp;
          return temp.value11;
        }
      

        function helperFunction12_12(param) {
          var temp = globalState12.temp || {};
          temp.value12 = param * 13;
          globalState12.temp = temp;
          return temp.value12;
        }
      

        function helperFunction12_13(param) {
          var temp = globalState12.temp || {};
          temp.value13 = param * 14;
          globalState12.temp = temp;
          return temp.value13;
        }
      

        function helperFunction12_14(param) {
          var temp = globalState12.temp || {};
          temp.value14 = param * 15;
          globalState12.temp = temp;
          return temp.value14;
        }
      

        function helperFunction12_15(param) {
          var temp = globalState12.temp || {};
          temp.value15 = param * 16;
          globalState12.temp = temp;
          return temp.value15;
        }
      

        function helperFunction12_16(param) {
          var temp = globalState12.temp || {};
          temp.value16 = param * 17;
          globalState12.temp = temp;
          return temp.value16;
        }
      

        function helperFunction12_17(param) {
          var temp = globalState12.temp || {};
          temp.value17 = param * 18;
          globalState12.temp = temp;
          return temp.value17;
        }
      

        function helperFunction12_18(param) {
          var temp = globalState12.temp || {};
          temp.value18 = param * 19;
          globalState12.temp = temp;
          return temp.value18;
        }
      

        function helperFunction12_19(param) {
          var temp = globalState12.temp || {};
          temp.value19 = param * 20;
          globalState12.temp = temp;
          return temp.value19;
        }
      

        function helperFunction12_20(param) {
          var temp = globalState12.temp || {};
          temp.value20 = param * 21;
          globalState12.temp = temp;
          return temp.value20;
        }
      

        function helperFunction12_21(param) {
          var temp = globalState12.temp || {};
          temp.value21 = param * 22;
          globalState12.temp = temp;
          return temp.value21;
        }
      

        function helperFunction12_22(param) {
          var temp = globalState12.temp || {};
          temp.value22 = param * 23;
          globalState12.temp = temp;
          return temp.value22;
        }
      

        function helperFunction12_23(param) {
          var temp = globalState12.temp || {};
          temp.value23 = param * 24;
          globalState12.temp = temp;
          return temp.value23;
        }
      

        function helperFunction12_24(param) {
          var temp = globalState12.temp || {};
          temp.value24 = param * 25;
          globalState12.temp = temp;
          return temp.value24;
        }
      
    