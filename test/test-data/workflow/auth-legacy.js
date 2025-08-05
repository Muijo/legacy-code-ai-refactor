
        // Legacy authentication system
        function AuthenticationManager() {
          this.users = {};
          this.sessions = {};
          this.loginAttempts = {};
          
          this.registerUser = function(userData) {
            var result = { success: false, errors: [] };
            
            try {
              // Validation
              if (!userData.username || userData.username.length < 3) {
                result.errors.push('Username must be at least 3 characters');
              }
              
              if (!userData.password || userData.password.length < 8) {
                result.errors.push('Password must be at least 8 characters');
              }
              
              if (!userData.email || !this.isValidEmail(userData.email)) {
                result.errors.push('Valid email is required');
              }
              
              if (this.users[userData.username]) {
                result.errors.push('Username already exists');
              }
              
              if (result.errors.length > 0) {
                return result;
              }
              
              // Hash password (simplified)
              var hashedPassword = this.hashPassword(userData.password);
              
              this.users[userData.username] = {
                username: userData.username,
                email: userData.email,
                password: hashedPassword,
                createdAt: new Date().getTime(),
                isActive: true
              };
              
              result.success = true;
              result.userId = userData.username;
              
            } catch (error) {
              result.errors.push(error.message);
            }
            
            return result;
          };
          
          this.authenticateUser = function(username, password) {
            var result = { success: false, sessionId: null, errors: [] };
            
            try {
              // Check rate limiting
              var attempts = this.loginAttempts[username] || { count: 0, lastAttempt: 0 };
              var now = Date.now();
              
              if (attempts.count >= 5 && (now - attempts.lastAttempt) < 300000) { // 5 minutes
                result.errors.push('Too many login attempts. Please try again later.');
                return result;
              }
              
              var user = this.users[username];
              if (!user || !user.isActive) {
                this.recordFailedAttempt(username);
                result.errors.push('Invalid credentials');
                return result;
              }
              
              var hashedPassword = this.hashPassword(password);
              if (user.password !== hashedPassword) {
                this.recordFailedAttempt(username);
                result.errors.push('Invalid credentials');
                return result;
              }
              
              // Create session
              var sessionId = this.generateSessionId();
              this.sessions[sessionId] = {
                username: username,
                createdAt: now,
                lastActivity: now,
                isValid: true
              };
              
              // Reset failed attempts
              delete this.loginAttempts[username];
              
              result.success = true;
              result.sessionId = sessionId;
              result.user = {
                username: user.username,
                email: user.email
              };
              
            } catch (error) {
              result.errors.push(error.message);
            }
            
            return result;
          };
          
          this.isValidEmail = function(email) {
            var emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/;
            return emailRegex.test(email);
          };
          
          this.hashPassword = function(password) {
            // Simplified hash function for testing
            var hash = 0;
            for (var i = 0; i < password.length; i++) {
              var char = password.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString();
          };
          
          this.generateSessionId = function() {
            return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          };
          
          this.recordFailedAttempt = function(username) {
            if (!this.loginAttempts[username]) {
              this.loginAttempts[username] = { count: 0, lastAttempt: 0 };
            }
            this.loginAttempts[username].count++;
            this.loginAttempts[username].lastAttempt = Date.now();
          };
        }
      