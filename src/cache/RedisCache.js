/**
 * Redis Cache Implementation
 * Provides caching layer for analysis results and generated code
 */

import { createClient } from 'redis';
import { createHash } from 'crypto';

export class RedisCache {
  constructor(options = {}) {
    this.options = {
      url: options.url || process.env.REDIS_URL || 'redis://localhost:6379',
      ttl: options.ttl || 3600, // Default TTL: 1 hour
      keyPrefix: options.keyPrefix || 'legacy-refactor:',
      enableCompression: options.enableCompression !== false,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };

    this.client = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  /**
   * Connect to Redis
   */
  async connect() {
    if (this.isConnected) return;
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  async _connect() {
    try {
      this.client = createClient({
        url: this.options.url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.options.maxRetries) {
              console.error('Max Redis reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return this.options.retryDelay;
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('Connected to Redis');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('Disconnected from Redis');
        this.isConnected = false;
      });

      await this.client.connect();
      
      return true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Generate cache key
   */
  generateKey(type, identifier) {
    const hash = createHash('md5').update(identifier).digest('hex');
    return `${this.options.keyPrefix}${type}:${hash}`;
  }

  /**
   * Get value from cache
   */
  async get(type, identifier) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const key = this.generateKey(type, identifier);
      const value = await this.client.get(key);
      
      if (!value) return null;
      
      // Parse JSON value
      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as string if not JSON
      }
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(type, identifier, value, ttl = null) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const key = this.generateKey(type, identifier);
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      
      const options = {};
      if (ttl !== null || this.options.ttl) {
        options.EX = ttl || this.options.ttl;
      }
      
      await this.client.set(key, serialized, options);
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(type, identifier) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const key = this.generateKey(type, identifier);
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(type, identifier) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const key = this.generateKey(type, identifier);
      return await this.client.exists(key) === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * Cache analysis results
   */
  async cacheAnalysisResult(filePath, analysisResult, ttl = 7200) {
    const cacheData = {
      ...analysisResult,
      cachedAt: Date.now()
    };
    
    return await this.set('analysis', filePath, cacheData, ttl);
  }

  /**
   * Get cached analysis result
   */
  async getCachedAnalysis(filePath) {
    const cached = await this.get('analysis', filePath);
    
    if (cached && cached.cachedAt) {
      // Add cache metadata
      cached._cached = true;
      cached._cacheAge = Date.now() - cached.cachedAt;
    }
    
    return cached;
  }

  /**
   * Cache generated code
   */
  async cacheGeneratedCode(analysisId, generatedCode, ttl = 3600) {
    const cacheData = {
      ...generatedCode,
      cachedAt: Date.now()
    };
    
    return await this.set('generated', analysisId, cacheData, ttl);
  }

  /**
   * Get cached generated code
   */
  async getCachedGeneratedCode(analysisId) {
    return await this.get('generated', analysisId);
  }

  /**
   * Cache test suite
   */
  async cacheTestSuite(codeId, testSuite, ttl = 3600) {
    const cacheData = {
      ...testSuite,
      cachedAt: Date.now()
    };
    
    return await this.set('tests', codeId, cacheData, ttl);
  }

  /**
   * Get cached test suite
   */
  async getCachedTestSuite(codeId) {
    return await this.get('tests', codeId);
  }

  /**
   * Cache migration plan
   */
  async cacheMigrationPlan(projectId, migrationPlan, ttl = 86400) {
    const cacheData = {
      ...migrationPlan,
      cachedAt: Date.now()
    };
    
    return await this.set('migration', projectId, cacheData, ttl);
  }

  /**
   * Get cached migration plan
   */
  async getCachedMigrationPlan(projectId) {
    return await this.get('migration', projectId);
  }

  /**
   * Clear all cache for a specific type
   */
  async clearCacheByType(type) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const pattern = `${this.options.keyPrefix}${type}:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      
      return keys.length;
    } catch (error) {
      console.error('Redis clear cache error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const info = await this.client.info('stats');
      const dbSize = await this.client.dbSize();
      
      // Count keys by type
      const types = ['analysis', 'generated', 'tests', 'migration'];
      const typeCounts = {};
      
      for (const type of types) {
        const pattern = `${this.options.keyPrefix}${type}:*`;
        const keys = await this.client.keys(pattern);
        typeCounts[type] = keys.length;
      }
      
      return {
        connected: this.isConnected,
        totalKeys: dbSize,
        keysByType: typeCounts,
        serverInfo: info
      };
    } catch (error) {
      console.error('Redis stats error:', error);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Implement cache-aside pattern for any operation
   */
  async cacheAside(type, identifier, operation, ttl = null) {
    // Try to get from cache first
    const cached = await this.get(type, identifier);
    if (cached) {
      return cached;
    }

    // Execute operation and cache result
    try {
      const result = await operation();
      if (result) {
        await this.set(type, identifier, result, ttl);
      }
      return result;
    } catch (error) {
      console.error('Cache-aside operation error:', error);
      throw error;
    }
  }

  /**
   * Batch get multiple values
   */
  async mget(type, identifiers) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const keys = identifiers.map(id => this.generateKey(type, id));
      const values = await this.client.mGet(keys);
      
      const results = {};
      identifiers.forEach((id, index) => {
        if (values[index]) {
          try {
            results[id] = JSON.parse(values[index]);
          } catch {
            results[id] = values[index];
          }
        } else {
          results[id] = null;
        }
      });
      
      return results;
    } catch (error) {
      console.error('Redis mget error:', error);
      return {};
    }
  }

  /**
   * Batch set multiple values
   */
  async mset(type, items, ttl = null) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const pipeline = this.client.multi();
      
      for (const [identifier, value] of Object.entries(items)) {
        const key = this.generateKey(type, identifier);
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        
        if (ttl !== null || this.options.ttl) {
          pipeline.setEx(key, ttl || this.options.ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Redis mset error:', error);
      return false;
    }
  }
}