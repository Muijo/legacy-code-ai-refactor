import { readdir, stat, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { createReadStream } from 'fs';
import { Transform } from 'stream';
import { Worker } from 'worker_threads';
import { MultiLanguageParser } from '../parsers/MultiLanguageParser.js';

/**
 * Large codebase ingestion engine with memory optimization and streaming
 */
export class CodebaseIngestionEngine {
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    this.maxConcurrency = options.maxConcurrency || 4;
    this.chunkSize = options.chunkSize || 64 * 1024; // 64KB chunks
    this.supportedExtensions = options.supportedExtensions || [
      '.js', '.jsx', '.ts', '.tsx',
      '.php',
      '.java',
      '.py'
    ];
    this.excludePatterns = options.excludePatterns || [
      'node_modules',
      '.git',
      'vendor',
      'build',
      'dist',
      '.cache'
    ];
    this.parser = new MultiLanguageParser();
    this.activeWorkers = new Set();
    this.processedFiles = new Map();
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      skippedFiles: 0,
      errors: 0,
      totalSize: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Ingest entire codebase with streaming and parallel processing
   * @param {string} rootPath - Root directory to scan
   * @param {Object} options - Processing options
   * @returns {AsyncGenerator} Stream of processed file results
   */
  async* ingestCodebase(rootPath, options = {}) {
    this.stats.startTime = Date.now();
    console.log(`Starting codebase ingestion from: ${rootPath}`);

    try {
      // First pass: discover all files
      const files = await this.discoverFiles(rootPath);
      this.stats.totalFiles = files.length;
      console.log(`Discovered ${files.length} files to process`);

      // Process files in batches with memory management
      const batchSize = this.maxConcurrency;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const results = await this.processBatch(batch, options);
        
        for (const result of results) {
          if (result) {
            this.stats.processedFiles++;
            yield result;
          }
        }

        // Memory cleanup between batches
        if (global.gc) {
          global.gc();
        }
      }

      this.stats.endTime = Date.now();
      console.log(`Ingestion completed in ${this.stats.endTime - this.stats.startTime}ms`);
      
    } catch (error) {
      console.error('Codebase ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Discover all relevant files in the codebase
   */
  async discoverFiles(rootPath) {
    const files = [];
    
    const scanDirectory = async (dirPath) => {
      try {
        const entries = await readdir(dirPath);
        
        for (const entry of entries) {
          const fullPath = join(dirPath, entry);
          
          // Skip excluded patterns
          if (this.shouldExclude(entry, fullPath)) {
            continue;
          }

          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (stats.isFile()) {
            const ext = extname(entry).toLowerCase();
            if (this.supportedExtensions.includes(ext) && stats.size <= this.maxFileSize) {
              files.push({
                path: fullPath,
                size: stats.size,
                extension: ext,
                modified: stats.mtime
              });
              this.stats.totalSize += stats.size;
            } else if (stats.size > this.maxFileSize) {
              console.warn(`Skipping large file: ${fullPath} (${stats.size} bytes)`);
              this.stats.skippedFiles++;
            }
          }
        }
      } catch (error) {
        console.warn(`Error scanning directory ${dirPath}:`, error.message);
      }
    };

    await scanDirectory(rootPath);
    return files.sort((a, b) => a.size - b.size); // Process smaller files first
  }

  /**
   * Process a batch of files in parallel
   */
  async processBatch(files, options) {
    const promises = files.map(file => this.processFile(file, options));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Error processing ${files[index].path}:`, result.reason);
        this.stats.errors++;
        return null;
      }
    });
  }

  /**
   * Process a single file with streaming for large files
   */
  async processFile(fileInfo, options = {}) {
    try {
      const { path, size } = fileInfo;
      
      // For large files, use streaming
      if (size > this.chunkSize * 10) {
        return await this.processLargeFile(fileInfo, options);
      } else {
        return await this.processSmallFile(fileInfo, options);
      }
    } catch (error) {
      return {
        success: false,
        filePath: fileInfo.path,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Process small files directly in memory
   */
  async processSmallFile(fileInfo, options) {
    const content = await readFile(fileInfo.path, 'utf8');
    const parseResult = await this.parser.parse(content, null, fileInfo.path);
    
    return {
      ...parseResult,
      fileInfo,
      timestamp: Date.now(),
      processingMethod: 'memory'
    };
  }

  /**
   * Process large files with streaming
   */
  async processLargeFile(fileInfo, options) {
    return new Promise((resolve, reject) => {
      let content = '';
      const stream = createReadStream(fileInfo.path, { encoding: 'utf8' });
      
      const processor = new Transform({
        transform(chunk, encoding, callback) {
          content += chunk;
          callback();
        }
      });

      stream.pipe(processor);
      
      processor.on('finish', async () => {
        try {
          const parseResult = await this.parser.parse(content, null, fileInfo.path);
          resolve({
            ...parseResult,
            fileInfo,
            timestamp: Date.now(),
            processingMethod: 'streaming'
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', reject);
      processor.on('error', reject);
    });
  }

  /**
   * Check if file/directory should be excluded
   */
  shouldExclude(name, fullPath) {
    return this.excludePatterns.some(pattern => {
      if (pattern.startsWith('.')) {
        return name === pattern;
      }
      return fullPath.includes(pattern);
    });
  }

  /**
   * Get processing statistics
   */
  getStats() {
    const duration = this.stats.endTime ? 
      this.stats.endTime - this.stats.startTime : 
      Date.now() - this.stats.startTime;

    return {
      ...this.stats,
      duration,
      filesPerSecond: this.stats.processedFiles / (duration / 1000),
      bytesPerSecond: this.stats.totalSize / (duration / 1000),
      successRate: this.stats.processedFiles / (this.stats.processedFiles + this.stats.errors),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Process files using worker threads for CPU-intensive operations
   */
  async processWithWorkers(files, options = {}) {
    const results = [];
    const workerPromises = [];

    for (let i = 0; i < Math.min(files.length, this.maxConcurrency); i++) {
      const worker = new Worker('./src/workers/FileProcessor.js');
      this.activeWorkers.add(worker);
      
      const promise = new Promise((resolve, reject) => {
        worker.on('message', (result) => {
          results.push(result);
          resolve(result);
        });
        
        worker.on('error', reject);
        worker.on('exit', (code) => {
          this.activeWorkers.delete(worker);
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });

      worker.postMessage({
        files: files.slice(i, i + 1),
        options
      });

      workerPromises.push(promise);
    }

    await Promise.allSettled(workerPromises);
    return results;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Terminate all active workers
    for (const worker of this.activeWorkers) {
      await worker.terminate();
    }
    this.activeWorkers.clear();
    this.processedFiles.clear();
  }

  /**
   * Resume processing from a checkpoint
   */
  async resumeFromCheckpoint(checkpointData) {
    this.processedFiles = new Map(checkpointData.processedFiles);
    this.stats = { ...this.stats, ...checkpointData.stats };
    console.log(`Resuming from checkpoint with ${this.processedFiles.size} processed files`);
  }

  /**
   * Create a checkpoint for resuming later
   */
  createCheckpoint() {
    return {
      processedFiles: Array.from(this.processedFiles.entries()),
      stats: this.stats,
      timestamp: Date.now()
    };
  }
}