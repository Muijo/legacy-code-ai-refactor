/**
 * Side Effect Tracker
 * 
 * Monitors and tracks side effects during function execution including
 * file system changes, database operations, network calls, and global state modifications.
 */

import fs from 'fs';
import path from 'path';

class SideEffectTracker {
    constructor() {
        this.originalMethods = {};
        this.isTracking = false;
        this.currentSnapshot = null;
    }

    /**
     * Create a snapshot of the current system state
     * @returns {Object} System state snapshot
     */
    createSnapshot() {
        const snapshot = {
            timestamp: Date.now(),
            fileSystem: this.captureFileSystemState(),
            globalState: this.captureGlobalState(),
            environment: this.captureEnvironmentState(),
            network: { requests: [], responses: [] },
            database: { queries: [], transactions: [] },
            console: { logs: [], errors: [], warnings: [] }
        };

        this.startTracking(snapshot);
        return snapshot;
    }

    /**
     * Start tracking side effects from the given snapshot
     */
    startTracking(snapshot) {
        if (this.isTracking) {
            this.stopTracking();
        }

        this.isTracking = true;
        this.currentSnapshot = snapshot;

        // Intercept file system operations
        this.interceptFileSystemOperations();
        
        // Intercept console operations
        this.interceptConsoleOperations();
        
        // Intercept network operations (if available)
        this.interceptNetworkOperations();
        
        // Intercept database operations (if available)
        this.interceptDatabaseOperations();
    }

    /**
     * Stop tracking and restore original methods
     */
    stopTracking() {
        if (!this.isTracking) return;

        this.isTracking = false;
        this.restoreOriginalMethods();
        this.currentSnapshot = null;
    }

    /**
     * Detect changes since the snapshot was created
     * @param {Object} snapshot - Original snapshot to compare against
     * @returns {Object} Detected changes
     */
    detectChanges(snapshot) {
        if (!snapshot) {
            throw new Error('No snapshot provided for change detection');
        }

        const changes = {
            fileSystem: this.detectFileSystemChanges(snapshot),
            globalState: this.detectGlobalStateChanges(snapshot),
            environment: this.detectEnvironmentChanges(snapshot),
            network: snapshot.network,
            database: snapshot.database,
            console: snapshot.console
        };

        this.stopTracking();
        return changes;
    }

    /**
     * Capture current file system state
     */
    captureFileSystemState() {
        // For security and performance reasons, we'll track a limited set of directories
        const watchedDirectories = [
            process.cwd(),
            path.join(process.cwd(), 'temp'),
            path.join(process.cwd(), 'output'),
            path.join(process.cwd(), 'logs')
        ];

        const state = {
            files: new Map(),
            directories: new Set()
        };

        watchedDirectories.forEach(dir => {
            try {
                if (fs.existsSync(dir)) {
                    this.scanDirectory(dir, state);
                }
            } catch (error) {
                // Ignore permission errors or non-existent directories
            }
        });

        return {
            files: Array.from(state.files.entries()),
            directories: Array.from(state.directories),
            filesCreated: [],
            filesModified: [],
            filesDeleted: []
        };
    }

    /**
     * Recursively scan directory and capture file states
     */
    scanDirectory(dirPath, state, maxDepth = 3, currentDepth = 0) {
        if (currentDepth >= maxDepth) return;

        try {
            const items = fs.readdirSync(dirPath);
            state.directories.add(dirPath);

            items.forEach(item => {
                const itemPath = path.join(dirPath, item);
                try {
                    const stats = fs.statSync(itemPath);
                    
                    if (stats.isDirectory()) {
                        this.scanDirectory(itemPath, state, maxDepth, currentDepth + 1);
                    } else if (stats.isFile()) {
                        state.files.set(itemPath, {
                            size: stats.size,
                            mtime: stats.mtime.getTime(),
                            mode: stats.mode
                        });
                    }
                } catch (error) {
                    // Ignore permission errors
                }
            });
        } catch (error) {
            // Ignore permission errors
        }
    }

    /**
     * Capture current global state
     */
    captureGlobalState() {
        return {
            variables: this.captureGlobalVariables(),
            processEnv: { ...process.env },
            processArgv: [...process.argv]
        };
    }

    /**
     * Capture global variables (safely)
     */
    captureGlobalVariables() {
        const globalVars = {};
        
        // Capture common global variables that might be modified
        const commonGlobals = ['Buffer', 'console', 'process', 'global', '__dirname', '__filename'];
        
        commonGlobals.forEach(varName => {
            try {
                if (typeof global[varName] !== 'undefined') {
                    // Store a reference or serializable representation
                    if (typeof global[varName] === 'object' && global[varName] !== null) {
                        globalVars[varName] = '[Object]';
                    } else {
                        globalVars[varName] = global[varName];
                    }
                }
            } catch (error) {
                globalVars[varName] = '[Error accessing variable]';
            }
        });

        return globalVars;
    }

    /**
     * Capture environment state
     */
    captureEnvironmentState() {
        return {
            cwd: process.cwd(),
            platform: process.platform,
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };
    }

    /**
     * Intercept file system operations
     */
    interceptFileSystemOperations() {
        const self = this;

        // Store original methods
        this.originalMethods.fs = {
            writeFileSync: fs.writeFileSync,
            writeFile: fs.writeFile,
            appendFileSync: fs.appendFileSync,
            appendFile: fs.appendFile,
            unlinkSync: fs.unlinkSync,
            unlink: fs.unlink,
            mkdirSync: fs.mkdirSync,
            mkdir: fs.mkdir,
            rmdirSync: fs.rmdirSync,
            rmdir: fs.rmdir
        };

        // Intercept writeFileSync
        fs.writeFileSync = function(filePath, data, options) {
            if (self.isTracking && self.currentSnapshot) {
                self.currentSnapshot.fileSystem.filesCreated.push({
                    path: filePath,
                    operation: 'write',
                    timestamp: Date.now(),
                    size: Buffer.isBuffer(data) ? data.length : String(data).length
                });
            }
            return self.originalMethods.fs.writeFileSync.call(this, filePath, data, options);
        };

        // Intercept writeFile
        fs.writeFile = function(filePath, data, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }
            
            if (self.isTracking && self.currentSnapshot) {
                self.currentSnapshot.fileSystem.filesCreated.push({
                    path: filePath,
                    operation: 'write',
                    timestamp: Date.now(),
                    size: Buffer.isBuffer(data) ? data.length : String(data).length
                });
            }
            return self.originalMethods.fs.writeFile.call(this, filePath, data, options, callback);
        };

        // Intercept unlinkSync
        fs.unlinkSync = function(filePath) {
            if (self.isTracking && self.currentSnapshot) {
                self.currentSnapshot.fileSystem.filesDeleted.push({
                    path: filePath,
                    operation: 'delete',
                    timestamp: Date.now()
                });
            }
            return self.originalMethods.fs.unlinkSync.call(this, filePath);
        };

        // Add more file system method interceptions as needed...
    }

    /**
     * Intercept console operations
     */
    interceptConsoleOperations() {
        const self = this;

        this.originalMethods.console = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        console.log = function(...args) {
            if (self.isTracking && self.currentSnapshot) {
                self.currentSnapshot.console.logs.push({
                    message: args.join(' '),
                    timestamp: Date.now()
                });
            }
            return self.originalMethods.console.log.apply(this, args);
        };

        console.error = function(...args) {
            if (self.isTracking && self.currentSnapshot) {
                self.currentSnapshot.console.errors.push({
                    message: args.join(' '),
                    timestamp: Date.now()
                });
            }
            return self.originalMethods.console.error.apply(this, args);
        };

        console.warn = function(...args) {
            if (self.isTracking && self.currentSnapshot) {
                self.currentSnapshot.console.warnings.push({
                    message: args.join(' '),
                    timestamp: Date.now()
                });
            }
            return self.originalMethods.console.warn.apply(this, args);
        };
    }

    /**
     * Intercept network operations (basic HTTP interception)
     */
    interceptNetworkOperations() {
        // This would require more sophisticated interception of HTTP modules
        // For now, we'll provide a basic structure
        const self = this;

        try {
            const http = require('http');
            const https = require('https');

            if (!this.originalMethods.http) {
                this.originalMethods.http = {
                    request: http.request,
                    get: http.get
                };
            }

            if (!this.originalMethods.https) {
                this.originalMethods.https = {
                    request: https.request,
                    get: https.get
                };
            }

            // Intercept HTTP requests
            http.request = function(options, callback) {
                if (self.isTracking && self.currentSnapshot) {
                    self.currentSnapshot.network.requests.push({
                        protocol: 'http',
                        options: typeof options === 'string' ? { url: options } : options,
                        timestamp: Date.now()
                    });
                }
                return self.originalMethods.http.request.call(this, options, callback);
            };

            // Similar for HTTPS...
        } catch (error) {
            // HTTP modules might not be available in all environments
        }
    }

    /**
     * Intercept database operations (placeholder for database-specific implementations)
     */
    interceptDatabaseOperations() {
        // This would need to be implemented for specific database drivers
        // For now, we'll provide a basic structure that can be extended
        const self = this;

        // Example for common database libraries
        try {
            // MongoDB interception example
            const mongodb = require('mongodb');
            if (mongodb && mongodb.MongoClient) {
                // Intercept MongoDB operations
            }
        } catch (error) {
            // MongoDB not available
        }

        try {
            // MySQL interception example
            const mysql = require('mysql2');
            if (mysql) {
                // Intercept MySQL operations
            }
        } catch (error) {
            // MySQL not available
        }
    }

    /**
     * Restore all original methods
     */
    restoreOriginalMethods() {
        // Restore file system methods
        if (this.originalMethods.fs) {
            Object.keys(this.originalMethods.fs).forEach(method => {
                fs[method] = this.originalMethods.fs[method];
            });
        }

        // Restore console methods
        if (this.originalMethods.console) {
            Object.keys(this.originalMethods.console).forEach(method => {
                console[method] = this.originalMethods.console[method];
            });
        }

        // Restore HTTP methods
        if (this.originalMethods.http) {
            try {
                const http = require('http');
                Object.keys(this.originalMethods.http).forEach(method => {
                    http[method] = this.originalMethods.http[method];
                });
            } catch (error) {
                // HTTP module not available
            }
        }

        if (this.originalMethods.https) {
            try {
                const https = require('https');
                Object.keys(this.originalMethods.https).forEach(method => {
                    https[method] = this.originalMethods.https[method];
                });
            } catch (error) {
                // HTTPS module not available
            }
        }
    }

    /**
     * Detect file system changes
     */
    detectFileSystemChanges(snapshot) {
        const currentState = this.captureFileSystemState();
        const changes = {
            filesCreated: [...snapshot.fileSystem.filesCreated],
            filesModified: [...snapshot.fileSystem.filesModified],
            filesDeleted: [...snapshot.fileSystem.filesDeleted]
        };

        // Compare current state with snapshot to detect additional changes
        const originalFiles = new Map(snapshot.fileSystem.files);
        const currentFiles = new Map(currentState.files);

        // Detect new files
        currentFiles.forEach((fileInfo, filePath) => {
            if (!originalFiles.has(filePath)) {
                changes.filesCreated.push({
                    path: filePath,
                    operation: 'created',
                    timestamp: Date.now()
                });
            } else {
                // Check for modifications
                const originalInfo = originalFiles.get(filePath);
                if (fileInfo.mtime !== originalInfo.mtime || fileInfo.size !== originalInfo.size) {
                    changes.filesModified.push({
                        path: filePath,
                        operation: 'modified',
                        timestamp: Date.now(),
                        originalSize: originalInfo.size,
                        newSize: fileInfo.size
                    });
                }
            }
        });

        // Detect deleted files
        originalFiles.forEach((fileInfo, filePath) => {
            if (!currentFiles.has(filePath)) {
                changes.filesDeleted.push({
                    path: filePath,
                    operation: 'deleted',
                    timestamp: Date.now()
                });
            }
        });

        return changes;
    }

    /**
     * Detect global state changes
     */
    detectGlobalStateChanges(snapshot) {
        const currentState = this.captureGlobalState();
        const changes = {
            variables: {},
            environment: {},
            processEnv: {}
        };

        // Compare global variables
        Object.keys(currentState.variables).forEach(varName => {
            if (currentState.variables[varName] !== snapshot.globalState.variables[varName]) {
                changes.variables[varName] = {
                    original: snapshot.globalState.variables[varName],
                    current: currentState.variables[varName]
                };
            }
        });

        // Compare process environment
        Object.keys(currentState.processEnv).forEach(envVar => {
            if (currentState.processEnv[envVar] !== snapshot.globalState.processEnv[envVar]) {
                changes.processEnv[envVar] = {
                    original: snapshot.globalState.processEnv[envVar],
                    current: currentState.processEnv[envVar]
                };
            }
        });

        return changes;
    }

    /**
     * Detect environment changes
     */
    detectEnvironmentChanges(snapshot) {
        const currentState = this.captureEnvironmentState();
        const changes = {};

        Object.keys(currentState).forEach(key => {
            if (key === 'memoryUsage' || key === 'uptime') {
                // These naturally change, so we don't track them as side effects
                return;
            }
            
            if (currentState[key] !== snapshot.environment[key]) {
                changes[key] = {
                    original: snapshot.environment[key],
                    current: currentState[key]
                };
            }
        });

        return changes;
    }
}

export default SideEffectTracker;