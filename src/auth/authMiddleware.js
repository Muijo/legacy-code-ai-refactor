import jwt from 'jsonwebtoken';
import { AuthService } from './authService.js';
import { User } from '../database/models/User.js';
import config from '../../config.js';
import { logger, securityLogger } from '../utils/logger.js';

const authService = new AuthService();

/**
 * Authenticate user with JWT token
 */
export async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token
    const decoded = await authService.verifyAccessToken(token);
    
    // Get user
    const user = await User.findById(decoded.userId).select('-password -refreshTokens');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt && decoded.iat) {
      const passwordChangedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < passwordChangedTimestamp) {
        return res.status(401).json({ error: 'Token expired due to password change' });
      }
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name
    };

    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    
    if (error.message === 'Access token expired') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Authenticate with API key
 */
export async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Validate API key
    const user = await authService.validateApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      authMethod: 'apikey'
    };

    next();
  } catch (error) {
    logger.error('API key authentication error', { error: error.message });
    return res.status(401).json({ error: 'Invalid API key' });
  }
}

/**
 * Authenticate with either JWT or API key
 */
export async function authenticateFlexible(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  } else if (apiKey) {
    return authenticateApiKey(req, res, next);
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
}

/**
 * Authorize user based on roles
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Authorization denied', { 
        userId: req.user.id, 
        userRole: req.user.role, 
        requiredRoles: roles 
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Check specific permission
 */
export function checkPermission(resource, action) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasPermission = await authService.checkPermission(
      req.user.id,
      resource,
      action
    );

    if (!hasPermission) {
      logger.warn('Permission denied', { 
        userId: req.user.id, 
        resource, 
        action 
      });
      return res.status(403).json({ error: 'Permission denied' });
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (token) {
      const decoded = await authService.verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password -refreshTokens');
      
      if (user && user.isActive) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          name: user.name
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

/**
 * Rate limit by user
 */
export function userRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const userLimits = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;

    if (!userLimits.has(userId)) {
      userLimits.set(userId, { count: 0, windowStart });
    }

    const userLimit = userLimits.get(userId);

    if (userLimit.windowStart !== windowStart) {
      userLimit.count = 0;
      userLimit.windowStart = windowStart;
    }

    if (userLimit.count >= maxRequests) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: windowMs - (now - windowStart)
      });
    }

    userLimit.count++;
    next();
  };
}

/**
 * Rate limit by IP address
 */
export function rateLimitByIp(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const ipLimits = new Map();

  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;

    if (!ipLimits.has(clientIp)) {
      ipLimits.set(clientIp, { count: 0, windowStart });
    }

    const ipLimit = ipLimits.get(clientIp);

    if (ipLimit.windowStart !== windowStart) {
      ipLimit.count = 0;
      ipLimit.windowStart = windowStart;
    }

    if (ipLimit.count >= maxRequests) {
      logger.warn('IP rate limit exceeded', { 
        ip: clientIp,
        count: ipLimit.count,
        windowStart: new Date(windowStart)
      });
      
      return res.status(429).json({ 
        error: 'Too many requests. Please try again later.',
        retryAfter: windowMs - (now - windowStart)
      });
    }

    ipLimit.count++;
    next();
  };
}