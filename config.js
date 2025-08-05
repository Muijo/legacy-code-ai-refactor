/**
 * Production-ready configuration management
 */

export const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development'
  },

  // Security configuration
  security: {
    enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
    allowedOrigins: process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      (process.env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : ['*']),
    sessionSecret: process.env.SESSION_SECRET || 'change-this-in-production',
    jwtSecret: process.env.JWT_SECRET || 'change-this-jwt-secret-in-production',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret-in-production',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    cookieSecret: process.env.COOKIE_SECRET || 'change-this-cookie-secret',
    enableCSRF: process.env.ENABLE_CSRF !== 'false'
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    maxFiles: parseInt(process.env.MAX_FILES) || 10,
    allowedTypes: process.env.ALLOWED_FILE_TYPES ? 
      process.env.ALLOWED_FILE_TYPES.split(',') : 
      ['.js', '.jsx', '.ts', '.tsx', '.php', '.java', '.py'],
    uploadDir: process.env.UPLOAD_DIR || 'uploads'
  },

  // Database configuration
  database: {
    mongodb: {
      url: process.env.MONGODB_URL || 'mongodb://localhost:27017/legacy-refactor',
      options: {
        maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
        serverSelectionTimeoutMS: parseInt(process.env.DB_TIMEOUT) || 5000
      }
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES) || 3
    }
  },

  // Application configuration
  app: {
    maxProjectsPerUser: parseInt(process.env.MAX_PROJECTS_PER_USER) || 50,
    analysisTimeout: parseInt(process.env.ANALYSIS_TIMEOUT) || 5 * 60 * 1000, // 5 minutes
    refactoringTimeout: parseInt(process.env.REFACTORING_TIMEOUT) || 10 * 60 * 1000, // 10 minutes
    enableDemo: process.env.ENABLE_DEMO !== 'false'
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
    logDir: process.env.LOG_DIR || 'logs'
  },

  // Monitoring configuration
  monitoring: {
    enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT) || 9090
  }
};

// Validation function
export function validateConfig() {
  const errors = [];

  // Validate required production settings
  if (config.server.environment === 'production') {
    if (config.security.sessionSecret === 'change-this-in-production') {
      errors.push('SESSION_SECRET must be set in production');
    }

    if (config.security.allowedOrigins.includes('*')) {
      errors.push('ALLOWED_ORIGINS must be explicitly set in production');
    }

    if (!process.env.MONGODB_URL) {
      errors.push('MONGODB_URL must be set in production');
    }
  }

  // Validate numeric values
  if (config.upload.maxFileSize <= 0) {
    errors.push('MAX_FILE_SIZE must be a positive number');
  }

  if (config.upload.maxFiles <= 0) {
    errors.push('MAX_FILES must be a positive number');
  }

  return errors;
}

// Environment-specific overrides
if (config.server.environment === 'test') {
  config.database.mongodb.url = process.env.TEST_MONGODB_URL || 'mongodb://localhost:27017/legacy-refactor-test';
  config.app.enableDemo = false;
  config.logging.level = 'warn';
}

export default config;