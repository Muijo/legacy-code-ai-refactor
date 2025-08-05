
      // StoreHub Middleware 0
      var jwt = require('jsonwebtoken');
      var mongoose = require('mongoose');
      
      var AuthMiddleware = {
        authenticate: function(req, res, next) {
          var token = req.headers.authorization;
          
          if (!token) {
            return res.status(401).json({ error: 'No token provided' });
          }
          
          if (token.startsWith('Bearer ')) {
            token = token.slice(7);
          }
          
          try {
            var decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
            req.user = decoded;
            next();
          } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
          }
        },
        
        authorize: function(roles) {
          return function(req, res, next) {
            if (!req.user) {
              return res.status(401).json({ error: 'Not authenticated' });
            }
            
            if (roles && roles.length > 0) {
              var userRoles = req.user.roles || [];
              var hasRole = false;
              
              for (var i = 0; i < roles.length; i++) {
                if (userRoles.indexOf(roles[i]) !== -1) {
                  hasRole = true;
                  break;
                }
              }
              
              if (!hasRole) {
                return res.status(403).json({ error: 'Insufficient permissions' });
              }
            }
            
            next();
          };
        },
        
        validateBusinessAccess: function(req, res, next) {
          var businessId = req.params.businessId || req.body.businessId || req.query.businessId;
          
          if (!businessId) {
            return res.status(400).json({ error: 'Business ID required' });
          }
          
          if (req.user.businessId !== businessId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied to this business' });
          }
          
          next();
        },
        
        logRequest: function(req, res, next) {
          var logData = {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            userId: req.user ? req.user.id : null
          };
          
          console.log('Request:', JSON.stringify(logData));
          next();
        },
        
        handleErrors: function(err, req, res, next) {
          console.error('Error:', err);
          
          if (err.name === 'ValidationError') {
            return res.status(400).json({
              error: 'Validation error',
              details: err.message
            });
          }
          
          if (err.name === 'CastError') {
            return res.status(400).json({
              error: 'Invalid ID format'
            });
          }
          
          res.status(500).json({
            error: 'Internal server error'
          });
        }
      };
      
      module.exports = AuthMiddleware;
    