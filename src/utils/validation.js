/**
 * Validation utilities for input sanitization and validation
 */

/**
 * Validate email format
 */
export function validateEmail(email) {
  if (!email) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }

  if (email.length > 255) {
    return 'Email must be less than 255 characters';
  }

  return null;
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  if (password.length > 128) {
    return 'Password must be less than 128 characters';
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }

  // Check for at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character';
  }

  // Check for common weak passwords
  const weakPasswords = [
    'password123', 'admin123', '12345678', 'qwerty123',
    'letmein123', 'welcome123', 'monkey123', 'dragon123'
  ];
  
  if (weakPasswords.includes(password.toLowerCase())) {
    return 'Password is too common. Please choose a stronger password';
  }

  return null;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input, maxLength = 1000) {
  if (!input) return '';
  
  // Convert to string and trim
  let sanitized = String(input).trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove potentially dangerous HTML/script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  
  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized;
}

/**
 * Validate file name
 */
export function validateFileName(fileName) {
  if (!fileName) {
    return 'File name is required';
  }

  // Check for path traversal attempts
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return 'Invalid file name';
  }

  // Check length
  if (fileName.length > 255) {
    return 'File name too long';
  }

  // Check for valid characters
  const validFileNameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!validFileNameRegex.test(fileName)) {
    return 'File name contains invalid characters';
  }

  return null;
}

/**
 * Validate project name
 */
export function validateProjectName(name) {
  if (!name || name.trim().length === 0) {
    return 'Project name is required';
  }

  if (name.length < 3) {
    return 'Project name must be at least 3 characters long';
  }

  if (name.length > 100) {
    return 'Project name must be less than 100 characters';
  }

  // Allow alphanumeric, spaces, hyphens, and underscores
  const validNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!validNameRegex.test(name)) {
    return 'Project name can only contain letters, numbers, spaces, hyphens, and underscores';
  }

  return null;
}

/**
 * Validate MongoDB ObjectId
 */
export function validateObjectId(id) {
  if (!id) {
    return 'ID is required';
  }

  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    return 'Invalid ID format';
  }

  return null;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page, limit) {
  const errors = {};

  // Validate page
  const pageNum = parseInt(page, 10);
  if (isNaN(pageNum) || pageNum < 1) {
    errors.page = 'Page must be a positive integer';
  } else if (pageNum > 10000) {
    errors.page = 'Page number too large';
  }

  // Validate limit
  const limitNum = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1) {
    errors.limit = 'Limit must be a positive integer';
  } else if (limitNum > 100) {
    errors.limit = 'Limit cannot exceed 100';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Validate date range
 */
export function validateDateRange(startDate, endDate) {
  const errors = {};

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      errors.startDate = 'Invalid start date format';
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      errors.endDate = 'Invalid end date format';
    }
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      errors.dateRange = 'Start date must be before end date';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Validate array of IDs
 */
export function validateIdArray(ids, maxLength = 100) {
  if (!Array.isArray(ids)) {
    return 'Must be an array';
  }

  if (ids.length === 0) {
    return 'Array cannot be empty';
  }

  if (ids.length > maxLength) {
    return `Array cannot contain more than ${maxLength} items`;
  }

  for (const id of ids) {
    const error = validateObjectId(id);
    if (error) {
      return `Invalid ID in array: ${error}`;
    }
  }

  return null;
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj, maxDepth = 10) {
  if (maxDepth <= 0) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1));
  }

  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = sanitizeObject(value, maxDepth - 1);
    }
    return sanitized;
  }

  return obj;
}