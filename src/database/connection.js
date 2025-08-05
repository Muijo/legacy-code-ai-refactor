/**
 * MongoDB Connection Manager
 * Handles database connection and configuration
 */

import mongoose from 'mongoose';
import config from '../../config.js';
import { logger } from '../utils/logger.js';

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.connection = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000; // 5 seconds
    this.reconnectTimer = null;
  }

  /**
   * Connect to MongoDB
   * @param {Object} options - Connection options
   * @returns {Promise<mongoose.Connection>}
   */
  async connect(options = {}) {
    if (this.isConnected) {
      logger.info('Already connected to MongoDB');
      return this.connection;
    }

    const connectionOptions = {
      ...config.database.mongodb.options,
      // Connection pooling
      maxPoolSize: config.database.mongodb.options.maxPoolSize || 10,
      minPoolSize: 2,
      
      // Timeout settings
      serverSelectionTimeoutMS: config.database.mongodb.options.serverSelectionTimeoutMS || 5000,
      socketTimeoutMS: 45000,
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // Write concern
      w: 'majority',
      wtimeoutMS: 10000,
      
      // Read preference
      readPreference: 'primaryPreferred',
      
      // Auto indexing (disable in production for performance)
      autoIndex: config.server.environment !== 'production',
    };

    try {
      // Set mongoose options
      mongoose.set('strictQuery', false);

      // Set up event handlers before connecting
      this.setupEventHandlers();

      // Connect
      await mongoose.connect(config.database.mongodb.url || options.url, connectionOptions);
      this.connection = mongoose.connection;
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      logger.info('MongoDB connected successfully', {
        database: mongoose.connection.db.databaseName,
        host: mongoose.connection.host,
        readyState: mongoose.connection.readyState
      });

      // Create indexes
      await this.createIndexes();

      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', {
        error: error.message,
        url: (config.database.mongodb.url || '').replace(/\/\/.*@/, '//***:***@'), // Hide credentials
        attempt: this.reconnectAttempts + 1
      });
      throw error;
    }
  }

  setupEventHandlers() {
    const db = mongoose.connection;

    db.on('connected', () => {
      this.isConnected = true;
      logger.info('MongoDB connected event');
      this.clearReconnectTimer();
    });

    db.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      if (!this.isConnected) {
        this.handleReconnection();
      }
    });

    db.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      this.isConnected = false;
      this.handleReconnection();
    });

    db.on('reconnected', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('MongoDB reconnected successfully');
    });

    // Monitor replica set events
    db.on('fullsetup', () => {
      logger.info('MongoDB replica set fully connected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.gracefulShutdown();
    });

    process.on('SIGTERM', async () => {
      await this.gracefulShutdown();
    });
  }

  async handleReconnection() {
    if (this.reconnectTimer) {
      return; // Already trying to reconnect
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Maximum reconnection attempts reached. Giving up.');
      process.exit(1);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.min(this.reconnectAttempts, 3); // Exponential backoff up to 3x
    
    logger.info(`Attempting to reconnect to MongoDB in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await mongoose.connect(config.database.mongodb.url);
        this.clearReconnectTimer();
      } catch (error) {
        logger.error('Reconnection attempt failed:', error.message);
        this.clearReconnectTimer();
        this.handleReconnection(); // Try again
      }
    }, delay);
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  async gracefulShutdown() {
    try {
      logger.info('Closing MongoDB connection...');
      this.clearReconnectTimer();
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
      process.exit(1);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      this.clearReconnectTimer();
      await mongoose.disconnect();
      logger.info('MongoDB disconnected successfully');
      this.isConnected = false;
      this.connection = null;
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Create database indexes
   */
  async createIndexes() {
    try {
      // Import models to ensure they're registered
      await import('./models/Project.js');
      await import('./models/Analysis.js');
      await import('./models/Refactoring.js');
      await import('./models/MigrationPlan.js');

      // Ensure indexes are created
      await mongoose.connection.db.collection('projects').createIndexes();
      await mongoose.connection.db.collection('analyses').createIndexes();
      await mongoose.connection.db.collection('refactorings').createIndexes();
      await mongoose.connection.db.collection('migrationplans').createIndexes();

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Error creating indexes:', error);
      // Non-critical error, continue
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.isConnected) {
      return {
        status: 'disconnected',
        message: 'Database is not connected'
      };
    }

    try {
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        message: 'Database is responsive',
        details: this.getStatus()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database is not responsive',
        error: error.message
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    if (!this.isConnected) {
      throw new Error('Database is not connected');
    }

    try {
      const dbStats = await mongoose.connection.db.stats();
      const collections = await mongoose.connection.db.listCollections().toArray();

      const collectionStats = await Promise.all(
        collections.map(async (col) => {
          const stats = await mongoose.connection.db.collection(col.name).stats();
          return {
            name: col.name,
            count: stats.count,
            size: stats.size,
            avgObjSize: stats.avgObjSize,
            storageSize: stats.storageSize,
            indexes: stats.nindexes
          };
        })
      );

      return {
        database: {
          collections: dbStats.collections,
          objects: dbStats.objects,
          avgObjSize: dbStats.avgObjSize,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize
        },
        collections: collectionStats
      };
    } catch (error) {
      logger.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Clear database (use with caution!)
   */
  async clearDatabase() {
    if (!this.isConnected) {
      throw new Error('Database is not connected');
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear database in production environment');
    }

    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        await mongoose.connection.db.collection(collection.name).deleteMany({});
      }

      logger.info('Database cleared successfully');
      return true;
    } catch (error) {
      logger.error('Error clearing database:', error);
      throw error;
    }
  }

  /**
   * Run transaction
   */
  async runTransaction(operations) {
    if (!this.isConnected) {
      throw new Error('Database is not connected');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await operations(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

// Export singleton instance
export const db = new DatabaseConnection();

// Export models for convenience
export { Project } from './models/Project.js';
export { Analysis } from './models/Analysis.js';
export { Refactoring } from './models/Refactoring.js';
export { MigrationPlan } from './models/MigrationPlan.js';