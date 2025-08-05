
      // jQuery legacy patterns
      $(document).ready(function() {
        var globalData = {};
        
        $('.legacy-button').click(function() {
          var $this = $(this);
          var data = $this.data('info');
          
          // Nested callbacks and DOM manipulation
          $.ajax({
            url: '/api/process',
            data: data,
            success: function(response) {
              if (response.success) {
                $this.addClass('processed');
                globalData.lastProcessed = response.data;
                
                // More nested operations...
                setTimeout(function() {
                  $('.status').text('Processing complete');
                }, 1000);
              }
            }
          });
        });
        
        
          function jqueryHelper0(selector) {
            $(selector).each(function() {
              var $el = $(this);
              $el.data('processed-0', true);
            });
          }
        

          function jqueryHelper1(selector) {
            $(selector).each(function() {
              var $el = $(this);
              $el.data('processed-1', true);
            });
          }
        

          function jqueryHelper2(selector) {
            $(selector).each(function() {
              var $el = $(this);
              $el.data('processed-2', true);
            });
          }
        

          function jqueryHelper3(selector) {
            $(selector).each(function() {
              var $el = $(this);
              $el.data('processed-3', true);
            });
          }
        

          function jqueryHelper4(selector) {
            $(selector).each(function() {
              var $el = $(this);
              $el.data('processed-4', true);
            });
          }
        

          function jqueryHelper5(selector) {
            $(selector).each(function() {
              var $el = $(this);
              $el.data('processed-5', true);
            });
          }
        

          function jqueryHelper6(selector) {
            $(selector).each(function() {
              var $el = $(this);
              $el.data('processed-6', true);
            });
          }
        

          function jqueryHelper7(selector) {
            $(selector).each(function() {
              var $el = $(this);
              $el.data('processed-7', true);
            });
          }
        

          function jqueryHelper8(selector) {
            $(selector).each(function() {
              var $el = $(this);
              $el.data('processed-8', true);
            });
          }
        

          function jqueryHelper9(selector) {
            $(selector).each(function() {
              var $el = $(this);
              $el.data('processed-9', true);
            });
          }
        
      });
    