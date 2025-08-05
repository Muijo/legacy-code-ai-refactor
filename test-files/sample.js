// Sample JavaScript file for testing the parser
import { readFile } from 'fs/promises';
import { join } from 'path';

class DataProcessor {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000000;
    this.timeout = options.timeout || 5000;
    this.cache = new Map();
  }

  async processData(filePath, transformOptions) {
    try {
      // Complex nested conditions - increases cyclomatic complexity
      if (!filePath) {
        throw new Error('File path is required');
      }

      if (typeof filePath !== 'string') {
        throw new Error('File path must be a string');
      }

      // Check cache first
      if (this.cache.has(filePath)) {
        const cached = this.cache.get(filePath);
        if (Date.now() - cached.timestamp < this.timeout) {
          return cached.data;
        }
      }

      const content = await readFile(filePath, 'utf8');
      
      // More complex logic
      let processedData;
      if (transformOptions && transformOptions.type === 'json') {
        try {
          processedData = JSON.parse(content);
          if (transformOptions.filter) {
            processedData = this.filterData(processedData, transformOptions.filter);
          }
          if (transformOptions.sort) {
            processedData = this.sortData(processedData, transformOptions.sort);
          }
        } catch (parseError) {
          throw new Error(`JSON parsing failed: ${parseError.message}`);
        }
      } else if (transformOptions && transformOptions.type === 'csv') {
        processedData = this.parseCSV(content);
      } else {
        processedData = content;
      }

      // Cache the result
      this.cache.set(filePath, {
        data: processedData,
        timestamp: Date.now()
      });

      return processedData;

    } catch (error) {
      console.error('Data processing failed:', error);
      throw error;
    }
  }

  filterData(data, filterOptions) {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.filter(item => {
      for (const [key, value] of Object.entries(filterOptions)) {
        if (item[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  sortData(data, sortOptions) {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.sort((a, b) => {
      for (const field of sortOptions.fields) {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal < bVal) {
          return sortOptions.direction === 'desc' ? 1 : -1;
        } else if (aVal > bVal) {
          return sortOptions.direction === 'desc' ? -1 : 1;
        }
      }
      return 0;
    });
  }

  parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const row = {};
        for (let j = 0; j < headers.length; j++) {
          row[headers[j].trim()] = values[j] ? values[j].trim() : '';
        }
        data.push(row);
      }
    }

    return data;
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

export default DataProcessor;