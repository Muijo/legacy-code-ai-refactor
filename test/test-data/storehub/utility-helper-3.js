
      // StoreHub Utility Helper 3
      var moment = require('moment');
      var crypto = require('crypto');
      
      var FormatUtils = {
        // Legacy date formatting utilities
        formatDate: function(date, format) {
          if (!date) return '';
          format = format || 'YYYY-MM-DD HH:mm:ss';
          return moment(date).format(format);
        },
        
        formatCurrency: function(amount, currency) {
          currency = currency || 'USD';
          var formatted = parseFloat(amount || 0).toFixed(2);
          
          switch (currency) {
            case 'USD':
              return '$' + formatted;
            case 'EUR':
              return '€' + formatted;
            case 'GBP':
              return '£' + formatted;
            default:
              return formatted + ' ' + currency;
          }
        },
        
        generateId: function(prefix) {
          prefix = prefix || 'ID';
          return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        hashPassword: function(password, salt) {
          salt = salt || 'default_salt';
          return crypto.createHash('sha256').update(password + salt).digest('hex');
        },
        
        validateEmail: function(email) {
          var emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/;
          return emailRegex.test(email);
        },
        
        validatePhone: function(phone) {
          var phoneRegex = /^[+]?[1-9][d]{0,15}$/;
          return phoneRegex.test(phone.replace(/[s-()]/g, ''));
        },
        
        sanitizeString: function(str) {
          if (typeof str !== 'string') return '';
          return str.trim().replace(/[<>]/g, '');
        },
        
        parseQueryParams: function(queryString) {
          var params = {};
          if (!queryString) return params;
          
          var pairs = queryString.split('&');
          for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split('=');
            if (pair.length === 2) {
              params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
          }
          
          return params;
        },
        
        deepClone: function(obj) {
          if (obj === null || typeof obj !== 'object') return obj;
          if (obj instanceof Date) return new Date(obj.getTime());
          if (obj instanceof Array) {
            var arr = [];
            for (var i = 0; i < obj.length; i++) {
              arr[i] = this.deepClone(obj[i]);
            }
            return arr;
          }
          
          var cloned = {};
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              cloned[key] = this.deepClone(obj[key]);
            }
          }
          return cloned;
        },
        
        debounce: function(func, wait) {
          var timeout;
          return function() {
            var context = this;
            var args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
              func.apply(context, args);
            }, wait);
          };
        }
      };
      
      module.exports = FormatUtils;
    