import { validationResult } from 'express-validator';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Middleware to validate request using express-validator
 */
export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));

    logger.warn('Validation error', {
      path: req.path,
      method: req.method,
      errors: extractedErrors,
      ip: req.ip
    });

    return res.status(400).json({
      error: 'Validation failed',
      details: extractedErrors
    });
  }

  next();
}

/**
 * Custom validators
 */
export const customValidators = {
  /**
   * Check if value is a valid file extension
   */
  isValidFileExtension: (value, allowedExtensions) => {
    const ext = value.toLowerCase();
    return allowedExtensions.includes(ext);
  },

  /**
   * Check if value is a valid language
   */
  isValidLanguage: (value) => {
    const validLanguages = ['javascript', 'typescript', 'php', 'java', 'python'];
    return validLanguages.includes(value.toLowerCase());
  },

  /**
   * Check if value is a valid refactoring type
   */
  isValidRefactoringType: (value) => {
    const validTypes = ['modernize', 'optimize', 'security', 'performance', 'quality'];
    return validTypes.includes(value.toLowerCase());
  },

  /**
   * Check if value is within range
   */
  isInRange: (value, min, max) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  },

  /**
   * Check if array has unique values
   */
  hasUniqueValues: (array) => {
    return Array.isArray(array) && new Set(array).size === array.length;
  },

  /**
   * Check if date is in future
   */
  isFutureDate: (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date > new Date();
  },

  /**
   * Check if date is in past
   */
  isPastDate: (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date < new Date();
  },

  /**
   * Check if value matches regex
   */
  matchesPattern: (value, pattern) => {
    const regex = new RegExp(pattern);
    return regex.test(value);
  },

  /**
   * Check if JSON is valid
   */
  isValidJSON: (value) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if URL is valid
   */
  isValidURL: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Sanitize middleware
 */
export function sanitizeInput(fields) {
  return (req, res, next) => {
    fields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        // Trim whitespace
        req.body[field] = req.body[field].trim();
        
        // Remove null bytes
        req.body[field] = req.body[field].replace(/\0/g, '');
        
        // Basic XSS prevention
        req.body[field] = req.body[field]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      }
    });
    
    next();
  };
}

/**
 * File upload validation
 */
export function validateFileUpload(options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['.js', '.jsx', '.ts', '.tsx', '.php', '.java', '.py'],
    maxFiles = 10
  } = options;

  return (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (req.files.length > maxFiles) {
      return res.status(400).json({ 
        error: `Too many files. Maximum ${maxFiles} files allowed` 
      });
    }

    for (const file of req.files) {
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({ 
          error: `File ${file.originalname} exceeds maximum size of ${maxSize / 1024 / 1024}MB` 
        });
      }

      // Check file type
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedTypes.includes(ext)) {
        return res.status(400).json({ 
          error: `File type ${ext} not allowed. Allowed types: ${allowedTypes.join(', ')}` 
        });
      }

      // Check for malicious patterns in filename
      if (file.originalname.includes('..') || file.originalname.includes('/')) {
        return res.status(400).json({ 
          error: 'Invalid file name' 
        });
      }
    }

    next();
  };
}

/**
 * Query parameter validation
 */
export function validateQueryParams(validParams) {
  return (req, res, next) => {
    const invalidParams = Object.keys(req.query).filter(
      param => !validParams.includes(param)
    );

    if (invalidParams.length > 0) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: `Unknown parameters: ${invalidParams.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Pagination validation
 */
export function validatePagination(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  if (page < 1 || page > 10000) {
    return res.status(400).json({
      error: 'Invalid page number. Must be between 1 and 10000'
    });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      error: 'Invalid limit. Must be between 1 and 100'
    });
  }

  req.pagination = {
    page,
    limit,
    skip: (page - 1) * limit
  };

  next();
}