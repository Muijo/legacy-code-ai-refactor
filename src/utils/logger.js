import winston from 'winston';
import path from 'path';
import fs from 'fs';
import config from '../../config.js';

// Ensure log directory exists
const logDir = config.logging.logDir || 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    info => `${info.timestamp} ${info.level}: ${info.message}` +
      (info.meta ? ` ${JSON.stringify(info.meta)}` : '')
  )
);

// Format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
    level: config.server.environment === 'production' ? 'info' : 'debug',
  }),
];

// Add file transports in production
if (config.logging.enableFileLogging || config.server.environment === 'production') {
  transports.push(
    // Error log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level || 'info',
  levels,
  transports,
  exitOnError: false,
});

// Create HTTP logger middleware
export const httpLogger = winston.createLogger({
  level: 'http',
  format: fileFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'http.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// HTTP logging middleware
export function httpLoggerMiddleware(req, res, next) {
  const start = Date.now();
  
  // Log response after it's sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    httpLogger.http({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    });
  });
  
  next();
}

// Security logger for authentication and authorization events
export const securityLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10, // Keep more security logs
    }),
  ],
});

// Performance logger for slow operations
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'performance.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Audit logger for data changes
export const auditLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10, // Keep more audit logs
    }),
  ],
});

// Helper functions
export function logError(error, context = {}) {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context,
  });
}

export function logSecurityEvent(event, userId, details = {}) {
  securityLogger.info({
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

export function logPerformance(operation, duration, details = {}) {
  if (duration > 1000) { // Log operations taking more than 1 second
    performanceLogger.warn({
      operation,
      duration: `${duration}ms`,
      slow: true,
      ...details,
    });
  } else {
    performanceLogger.info({
      operation,
      duration: `${duration}ms`,
      ...details,
    });
  }
}

export function logAudit(action, userId, resource, details = {}) {
  auditLogger.info({
    action,
    userId,
    resource,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

// Utility to measure async operation performance
export async function measurePerformance(operation, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logPerformance(operation, duration, { success: true });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logPerformance(operation, duration, { success: false, error: error.message });
    throw error;
  }
}

// Stream for real-time log monitoring
export function createLogStream(level = 'info') {
  const stream = new winston.transports.Stream({
    stream: process.stdout,
    level,
  });
  
  logger.add(stream);
  
  return {
    close: () => logger.remove(stream),
  };
}

// Export main logger
export { logger };

// Default export
export default logger;