/**
 * NYLA Environment Abstraction Layer
 * Provides unified API for Node.js and browser environments
 */

// Environment Detection
const isNode = typeof window === 'undefined' && typeof process !== 'undefined';
const isBrowser = typeof window !== 'undefined';

/**
 * Environment-aware storage abstraction
 */
class NYLAStorage {
  constructor() {
    this.isNode = isNode;
    this.isBrowser = isBrowser;
    
    if (this.isNode) {
      this.fs = require('fs').promises;
      this.path = require('path');
      this.storageDir = this.path.join(process.cwd(), 'embeddings-data');
    }
  }
  
  async initialize() {
    if (this.isNode) {
      // Ensure storage directory exists
      try {
        await this.fs.mkdir(this.storageDir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
    }
    // Browser uses IndexedDB, no initialization needed
  }
  
  // Vector storage methods
  async storeVectors(vectors, metadata = {}) {
    if (this.isNode) {
      const data = {
        vectors,
        metadata,
        timestamp: new Date().toISOString()
      };
      const filePath = this.path.join(this.storageDir, 'vectors.json');
      await this.fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return { success: true, path: filePath };
    } else {
      // Use IndexedDB for browser
      return await this._storeVectorsBrowser(vectors, metadata);
    }
  }
  
  async loadVectors() {
    if (this.isNode) {
      try {
        const filePath = this.path.join(this.storageDir, 'vectors.json');
        const data = await this.fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
    } else {
      return await this._loadVectorsBrowser();
    }
  }
  
  // Chunks storage methods
  async storeChunks(chunks) {
    if (this.isNode) {
      const filePath = this.path.join(this.storageDir, 'chunks.json');
      await this.fs.writeFile(filePath, JSON.stringify(chunks, null, 2));
      return { success: true, path: filePath };
    } else {
      return await this._storeChunksBrowser(chunks);
    }
  }
  
  async loadChunks() {
    if (this.isNode) {
      try {
        const filePath = this.path.join(this.storageDir, 'chunks.json');
        const data = await this.fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
    } else {
      return await this._loadChunksBrowser();
    }
  }
  
  // Browser-specific IndexedDB methods
  async _storeVectorsBrowser(vectors, metadata) {
    const db = await this._openDB();
    const transaction = db.transaction(['vectors'], 'readwrite');
    const store = transaction.objectStore('vectors');
    
    await store.put({
      id: 'main',
      vectors,
      metadata,
      timestamp: new Date().toISOString()
    });
    
    return { success: true };
  }
  
  async _loadVectorsBrowser() {
    const db = await this._openDB();
    const transaction = db.transaction(['vectors'], 'readonly');
    const store = transaction.objectStore('vectors');
    const result = await store.get('main');
    return result || null;
  }
  
  async _storeChunksBrowser(chunks) {
    const db = await this._openDB();
    const transaction = db.transaction(['chunks'], 'readwrite');
    const store = transaction.objectStore('chunks');
    
    await store.put({
      id: 'main',
      chunks,
      timestamp: new Date().toISOString()
    });
    
    return { success: true };
  }
  
  async _loadChunksBrowser() {
    const db = await this._openDB();
    const transaction = db.transaction(['chunks'], 'readonly');
    const store = transaction.objectStore('chunks');
    const result = await store.get('main');
    return result?.chunks || null;
  }
  
  async _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('nyla-embeddings-storage', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('vectors')) {
          db.createObjectStore('vectors', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'id' });
        }
      };
    });
  }
}

/**
 * Environment-aware embedding service
 */
class NYLAEmbeddingEnvironment {
  constructor() {
    this.isNode = isNode;
    this.isBrowser = isBrowser;
    this.initialized = false;
    this.pipeline = null;
  }
  
  async initialize() {
    if (this.initialized) return;
    
    if (this.isNode) {
      // Node.js: Use @xenova/transformers with retry logic
      const { pipeline, env } = await import('@xenova/transformers');
      
      // Configure for better Node.js compatibility
      env.allowLocalModels = false;
      env.useBrowserCache = false;
      env.remoteURL = 'https://huggingface.co/';
      env.remotePathTemplate = '{model}/resolve/{revision}/';
      
      // Retry logic for model loading
      let lastError;
      const models = [
        'Xenova/all-MiniLM-L6-v2',
        'sentence-transformers/all-MiniLM-L6-v2'
      ];
      
      for (const modelName of models) {
        try {
          console.log(`[NYLA] Attempting to load model: ${modelName}`);
          this.pipeline = await pipeline('feature-extraction', modelName, {
            quantized: true,
            progress_callback: (progress) => {
              if (progress.status === 'downloading') {
                console.log(`[NYLA] Downloading: ${Math.round(progress.progress || 0)}%`);
              }
            }
          });
          console.log(`[NYLA] ✅ Model loaded successfully: ${modelName}`);
          break;
        } catch (error) {
          console.log(`[NYLA] ❌ Failed to load ${modelName}: ${error.message}`);
          lastError = error;
          continue;
        }
      }
      
      if (!this.pipeline) {
        throw new Error(`Failed to load any embedding model. Last error: ${lastError?.message}`);
      }
    } else {
      // Browser: Use existing Transformers.js setup
      if (typeof window.transformers === 'undefined') {
        throw new Error('Transformers.js not loaded in browser');
      }
      this.pipeline = await window.transformers.pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2');
    }
    
    this.initialized = true;
  }
  
  async embed(text) {
    if (!this.initialized) await this.initialize();
    
    const result = await this.pipeline(text);
    
    if (this.isNode) {
      // Node.js returns tensor, extract data
      return Array.from(result.data);
    } else {
      // Browser returns array directly
      return result.data || result;
    }
  }
  
  async embedBatch(texts) {
    const embeddings = [];
    for (const text of texts) {
      embeddings.push(await this.embed(text));
    }
    return embeddings;
  }
}

/**
 * Environment-aware console logging
 */
class NYLALogger {
  constructor(prefix = 'NYLA') {
    this.prefix = prefix;
    this.isNode = isNode;
  }
  
  log(message, data = null) {
    if (this.isNode) {
      console.log(`[${this.prefix}] ${message}`);
      if (data) console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`%c[${this.prefix}]%c ${message}`, 'color: #FF6B35; font-weight: bold;', 'color: inherit;');
      if (data) console.log(data);
    }
  }
  
  error(message, error = null) {
    if (this.isNode) {
      console.error(`[${this.prefix}] ERROR: ${message}`);
      if (error) console.error(error);
    } else {
      console.error(`%c[${this.prefix}] ERROR:%c ${message}`, 'color: #FF6B35; font-weight: bold;', 'color: red;');
      if (error) console.error(error);
    }
  }
  
  warn(message) {
    if (this.isNode) {
      console.warn(`[${this.prefix}] WARNING: ${message}`);
    } else {
      console.warn(`%c[${this.prefix}] WARNING:%c ${message}`, 'color: #FF6B35; font-weight: bold;', 'color: orange;');
    }
  }
  
  success(message, data = null) {
    if (this.isNode) {
      console.log(`[${this.prefix}] ✅ ${message}`);
      if (data) console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`%c[${this.prefix}] ✅%c ${message}`, 'color: #FF6B35; font-weight: bold;', 'color: green;');
      if (data) console.log(data);
    }
  }
}

/**
 * Environment-aware utilities
 */
class NYLAUtils {
  static isNode() { return isNode; }
  static isBrowser() { return isBrowser; }
  
  static async loadKnowledgeBase() {
    // Load from structured KB only - single source of truth
    return await this.loadStructuredKB();
  }

  static async loadStructuredKB() {
    if (isNode) {
      // Node.js: Load structured KB from /pwa/kb directory
      const fs = require('fs').promises;
      const path = require('path');
      
      const kbDir = path.join(process.cwd(), 'pwa/kb');
      const chunks = [];
      
      // Define KB structure to load
      const kbFiles = [
        'about/team.json',
        'facts/contracts.algorand.json',
        'facts/contracts.ethereum.json', 
        'facts/contracts.solana.json',
        'facts/network-limitations.json',
        'facts/supported-networks.algorand.json',
        'facts/supported-networks.ethereum.json',
        'facts/supported-networks.solana.json',
        'faq/common.json',
        'glossary/terms.json',
        'howto/qr/create.json',
        'howto/qr/troubleshoot.json',
        'howto/raids/participate.json',
        'howto/transfers/receive.json',
        'howto/transfers/send.json',
        'marketing/brand.json',
        'policy/answer_templates.json',
        'policy/wording.json',
        'troubleshooting/transfers.json',
        'ecosystem/campaigns/algorand/2025-07-nyla-x-algorand-launch.json',
        'ecosystem/integrations/algorand/core-support.json',
        'ecosystem/integrations/algorand/pera-wallet.json',
        'ecosystem/integrations/ethereum/uniswap-v3.json',
        'ecosystem/integrations/solana/jupiter-routing.json',
        'ecosystem/partners/algorand/algorand-foundation.json',
        'ecosystem/partners/solana/solana-foundation.json'
      ];
      
      for (const filePath of kbFiles) {
        try {
          const fullPath = path.join(kbDir, filePath);
          const data = await fs.readFile(fullPath, 'utf-8');
          const jsonData = JSON.parse(data);
          
          if (jsonData.chunks && Array.isArray(jsonData.chunks)) {
            chunks.push(...jsonData.chunks);
          }
        } catch (error) {
          console.warn(`⚠️ Could not load ${filePath}:`, error.message);
        }
      }
      
      if (chunks.length === 0) {
        throw new Error('No valid chunks found in structured KB');
      }
      
      // Convert chunks to legacy KB format for compatibility
      const legacyKB = this.convertChunksToLegacyFormat(chunks);
      
      console.log(`✅ Loaded structured KB: ${chunks.length} chunks from ${kbFiles.length} files`);
      return legacyKB;
      
    } else {
      throw new Error('Structured KB loading only supported in Node.js environment');
    }
  }

  // Legacy KB loader removed - using structured KB from /pwa/kb as single source of truth

  static convertChunksToLegacyFormat(chunks) {
    // Convert structured chunks to legacy KB format for compatibility
    const legacyKB = {};
    
    for (const chunk of chunks) {
      const category = chunk.section || chunk.type || 'general';
      
      if (!legacyKB[category]) {
        legacyKB[category] = {};
      }
      
      // Create a section entry using chunk data
      const sectionKey = chunk.id || chunk.source_id || 'item';
      legacyKB[category][sectionKey] = {
        title: chunk.title || '',
        body: chunk.body || chunk.summary_en || '',
        summary: chunk.summary_en || '',
        tags: chunk.tags || [],
        priority: chunk.priority || 5,
        lastUpdated: chunk.as_of || new Date().toISOString()
      };
    }
    
    return legacyKB;
  }
  
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exports for both environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = {
    NYLAStorage,
    NYLAEmbeddingEnvironment,
    NYLALogger,
    NYLAUtils,
    isNode,
    isBrowser
  };
} else {
  // Browser
  window.NYLAStorage = NYLAStorage;
  window.NYLAEmbeddingEnvironment = NYLAEmbeddingEnvironment;
  window.NYLALogger = NYLALogger;
  window.NYLAUtils = NYLAUtils;
  window.NYLA_ENV = { isNode, isBrowser };
}