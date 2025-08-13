/**
 * NYLA Knowledge Base Version Manager
 * Tracks KB versions and triggers embedding regeneration when needed
 */

class NYLAKBVersionManager {
  constructor() {
    this.dbName = 'nyla-kb-versions';
    this.storeName = 'versions';
    this.db = null;
    
    // Files to track for changes - only actual KB files, not UI data
    this.trackedFiles = [
      // Legacy nyla-knowledge-base.js removed - using structured KB from /pwa/kb/ only
      // nylago-data.js is UI data for raids, not knowledge base content
    ];
    
    this.initialized = false;
  }

  /**
   * Initialize version manager
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Open IndexedDB for version storage
      this.db = await this.openDB();
      this.initialized = true;
      console.log('📋 KB Version Manager initialized');
    } catch (error) {
      console.error('❌ KB Version Manager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Open IndexedDB for version tracking
   */
  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Generate hash for knowledge base content
   */
  async generateKBHash(knowledgeBase) {
    // Convert knowledge base to string for hashing
    const kbString = JSON.stringify(knowledgeBase, Object.keys(knowledgeBase).sort());
    
    // Use Web Crypto API for consistent hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(kbString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }

  /**
   * Get stored KB version info
   */
  async getStoredVersion() {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get('kb-version');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Store KB version info
   */
  async storeVersion(versionInfo) {
    if (!this.db) await this.initialize();
    
    const data = {
      id: 'kb-version',
      ...versionInfo,
      updatedAt: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(data);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Check if KB needs rebuilding
   */
  async needsRebuild(knowledgeBase, vectorDBStats) {
    try {
      // Generate current KB hash
      const currentHash = await this.generateKBHash(knowledgeBase);
      
      // Get stored version
      const stored = await this.getStoredVersion();
      
      // Check various rebuild conditions
      const reasons = [];
      
      // 1. No stored version (first time)
      if (!stored) {
        reasons.push('no_previous_version');
      }
      
      // 2. KB content changed (hash mismatch)
      else if (stored.hash !== currentHash) {
        reasons.push('kb_content_changed');
      }
      
      // 3. Vector DB is empty
      if (!vectorDBStats || vectorDBStats.chunkCount === 0) {
        reasons.push('empty_vector_db');
      }
      
      // 4. Vector DB version mismatch
      if (stored && vectorDBStats && stored.vectorDBVersion !== vectorDBStats.version) {
        reasons.push('vector_db_version_mismatch');
      }
      
      return {
        needsRebuild: reasons.length > 0,
        reasons,
        currentHash,
        storedHash: stored?.hash,
        storedVersion: stored
      };
      
    } catch (error) {
      console.error('❌ Error checking rebuild status:', error);
      return {
        needsRebuild: true,
        reasons: ['error_checking_version'],
        error: error.message
      };
    }
  }

  /**
   * Mark embeddings as up-to-date
   */
  async markAsUpToDate(knowledgeBase, vectorDBStats, additionalInfo = {}) {
    try {
      const hash = await this.generateKBHash(knowledgeBase);
      
      const versionInfo = {
        hash,
        vectorDBVersion: vectorDBStats?.version || '1.0.0',
        chunkCount: vectorDBStats?.chunkCount || 0,
        embeddingModel: 'all-MiniLM-L6-v2',
        embeddingDimension: 384,
        generatedAt: new Date().toISOString(),
        ...additionalInfo
      };
      
      await this.storeVersion(versionInfo);
      
      console.log('✅ KB version marked as up-to-date:', {
        hash: hash.substring(0, 8) + '...',
        chunks: versionInfo.chunkCount
      });
      
      return versionInfo;
      
    } catch (error) {
      console.error('❌ Error marking KB as up-to-date:', error);
      throw error;
    }
  }

  /**
   * Get version info for debugging
   */
  async getVersionInfo() {
    try {
      const stored = await this.getStoredVersion();
      return {
        hasStoredVersion: !!stored,
        stored,
        manager: {
          initialized: this.initialized,
          trackedFiles: this.trackedFiles
        }
      };
    } catch (error) {
      console.error('❌ Error getting version info:', error);
      return { error: error.message };
    }
  }

  /**
   * Clear version tracking (force rebuild)
   */
  async clearVersion() {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete('kb-version');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('🧹 KB version tracking cleared - will force rebuild');
        resolve();
      };
    });
  }

  /**
   * Generate file-based hash for pre-commit checking
   */
  async generateFileHash(filePath) {
    try {
      // This would be used in Node.js environment for pre-commit hooks
      const fs = require('fs').promises;
      const crypto = require('crypto');
      
      const content = await fs.readFile(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      console.error(`❌ Error hashing file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if tracked files changed (for pre-commit)
   */
  async checkFileChanges(baseCommit = 'HEAD~1') {
    try {
      // This would run in Node.js environment
      const { execSync } = require('child_process');
      
      const changes = [];
      
      for (const file of this.trackedFiles) {
        try {
          // Check if file changed compared to base commit
          const output = execSync(`git diff --name-only ${baseCommit} -- ${file}`, { encoding: 'utf-8' });
          if (output.trim()) {
            changes.push({
              file,
              changed: true,
              newHash: await this.generateFileHash(file)
            });
          }
        } catch (error) {
          // File might be new or deleted
          changes.push({
            file,
            changed: true,
            error: error.message
          });
        }
      }
      
      return {
        hasChanges: changes.length > 0,
        changes
      };
      
    } catch (error) {
      console.error('❌ Error checking file changes:', error);
      return {
        hasChanges: true,  // Assume changes if we can't check
        error: error.message
      };
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAKBVersionManager;
}
window.NYLAKBVersionManager = NYLAKBVersionManager;