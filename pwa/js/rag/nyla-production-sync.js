/**
 * NYLA Production Sync Manager
 * Handles downloading and updating pre-built vector embeddings from production
 */

class NYLAProductionSync {
  constructor(options = {}) {
    // Detect if running locally or in production
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.protocol === 'file:';
    
    // Use relative paths for local development, absolute for production
    const baseUrl = isLocalhost ? '' : 'https://sonyschan.github.io/NYLAgo/pwa';
    
    this.options = {
      // Production CDN endpoints - use relative paths when local
      indexUrl: isLocalhost ? 'nyla-knowledge-index.json.gz' : `${baseUrl}/nyla-knowledge-index.json.gz`,
      versionUrl: isLocalhost ? 'nyla-knowledge-version.json' : `${baseUrl}/nyla-knowledge-version.json`,
      
      // Local storage configuration
      localDBName: 'nyla-vector-db',
      versionStoreName: 'production-versions',
      
      // Update checking
      checkIntervalMs: 1000 * 60 * 30, // Check every 30 minutes
      forceCheckOnStartup: true,
      
      // Download settings
      maxRetries: 3,
      timeoutMs: 30000, // 30 seconds
      
      ...options
    };
    
    this.db = null;
    this.initialized = false;
    this.updateInProgress = false;
    this.lastCheckTime = 0;
    this.currentVersion = null;
    
    // Event listeners
    this.listeners = {
      updateAvailable: [],
      updateStarted: [],
      updateProgress: [],
      updateCompleted: [],
      updateFailed: []
    };
  }

  /**
   * Initialize production sync manager
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🌐 Initializing production sync manager...');
      
      // Open IndexedDB for version tracking
      this.db = await this.openDB();
      
      // Get current local version
      this.currentVersion = await this.getLocalVersion();
      
      this.initialized = true;
      console.log('✅ Production sync manager initialized');
      
      // Check for updates on startup if enabled
      if (this.options.forceCheckOnStartup) {
        setTimeout(() => this.checkForUpdates(), 1000);
      }
      
      // Set up periodic checking
      this.startPeriodicCheck();
      
    } catch (error) {
      console.error('❌ Production sync initialization failed:', error);
      throw error;
    }
  }

  /**
   * Open IndexedDB for version storage
   */
  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('nyla-production-sync', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.options.versionStoreName)) {
          db.createObjectStore(this.options.versionStoreName, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Get current local version information
   */
  async getLocalVersion() {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.options.versionStoreName], 'readonly');
      const store = transaction.objectStore(this.options.versionStoreName);
      const request = store.get('current');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Store version information
   */
  async storeVersion(versionInfo) {
    if (!this.db) await this.initialize();
    
    const data = {
      id: 'current',
      ...versionInfo,
      updatedAt: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.options.versionStoreName], 'readwrite');
      const store = transaction.objectStore(this.options.versionStoreName);
      const request = store.put(data);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.currentVersion = data;
        resolve();
      };
    });
  }

  /**
   * Check for production updates
   */
  async checkForUpdates() {
    if (this.updateInProgress) {
      console.log('🔄 Update already in progress, skipping check');
      return { updateAvailable: false, reason: 'update_in_progress' };
    }
    
    try {
      console.log('🔍 Checking for production updates...');
      this.lastCheckTime = Date.now();
      
      // Fetch production version info
      const productionVersion = await this.fetchProductionVersion();
      
      if (!productionVersion) {
        console.log('⚠️ Could not fetch production version');
        return { updateAvailable: false, reason: 'fetch_failed' };
      }
      
      // Compare versions
      const needsUpdate = this.compareVersions(this.currentVersion, productionVersion);
      
      if (needsUpdate.updateNeeded) {
        console.log(`🆕 Production update available: ${needsUpdate.reason}`);
        this.emit('updateAvailable', {
          current: this.currentVersion,
          production: productionVersion,
          reason: needsUpdate.reason
        });
        
        return {
          updateAvailable: true,
          currentVersion: this.currentVersion,
          productionVersion,
          reason: needsUpdate.reason
        };
      } else {
        console.log('✅ Local version is up-to-date');
        return { updateAvailable: false, reason: 'up_to_date' };
      }
      
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      return { updateAvailable: false, reason: 'error', error: error.message };
    }
  }

  /**
   * Fetch production version information
   */
  async fetchProductionVersion() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs);
      
      const response = await fetch(this.options.versionUrl, {
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const versionInfo = await response.json();
      return versionInfo;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('⏱️ Production version fetch timed out');
      } else {
        console.error('❌ Failed to fetch production version:', error);
      }
      return null;
    }
  }

  /**
   * Compare current vs production versions
   */
  compareVersions(current, production) {
    // No local version - definitely need update
    if (!current) {
      return { updateNeeded: true, reason: 'no_local_version' };
    }
    
    // Different version hashes
    if (current.hash !== production.hash) {
      return { updateNeeded: true, reason: 'content_changed' };
    }
    
    // Different build timestamps (production rebuilt)
    if (current.buildTime !== production.buildTime) {
      return { updateNeeded: true, reason: 'build_updated' };
    }
    
    // Different embedding models
    if (current.embeddingModel !== production.embeddingModel) {
      return { updateNeeded: true, reason: 'model_updated' };
    }
    
    // Check if local version is very old (force refresh)
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (current.updatedAt && Date.now() - new Date(current.updatedAt).getTime() > maxAge) {
      return { updateNeeded: true, reason: 'local_version_stale' };
    }
    
    return { updateNeeded: false, reason: 'up_to_date' };
  }

  /**
   * Download and install production update
   */
  async downloadAndInstall(options = {}) {
    if (this.updateInProgress) {
      throw new Error('Update already in progress');
    }
    
    this.updateInProgress = true;
    this.emit('updateStarted');
    
    try {
      console.log('📥 Downloading production vector database...');
      
      // Step 1: Download compressed index
      const indexData = await this.downloadIndex((progress) => {
        this.emit('updateProgress', { stage: 'download', ...progress });
      });
      
      // Step 2: Decompress and validate
      this.emit('updateProgress', { stage: 'processing', percentage: 0 });
      const processedData = await this.processIndexData(indexData);
      
      // Step 3: Update local vector DB
      this.emit('updateProgress', { stage: 'installing', percentage: 0 });
      await this.installToVectorDB(processedData, (progress) => {
        this.emit('updateProgress', { stage: 'installing', ...progress });
      });
      
      // Step 4: Update version tracking
      await this.storeVersion({
        hash: processedData.hash,
        buildTime: processedData.created_at,
        embeddingModel: processedData.model.name,
        chunkCount: processedData.chunks.length,
        downloadedAt: new Date().toISOString(),
        source: 'production'
      });
      
      console.log('✅ Production update installed successfully');
      this.emit('updateCompleted', {
        chunkCount: processedData.chunks.length,
        version: processedData.version
      });
      
      return {
        success: true,
        chunkCount: processedData.chunks.length,
        version: processedData.version
      };
      
    } catch (error) {
      console.error('❌ Production update failed:', error);
      this.emit('updateFailed', { error: error.message });
      throw error;
      
    } finally {
      this.updateInProgress = false;
    }
  }

  /**
   * Download compressed index with progress tracking
   */
  async downloadIndex(onProgress) {
    let retries = 0;
    
    while (retries < this.options.maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs * 2); // Longer timeout for download
        
        const response = await fetch(this.options.indexUrl, {
          signal: controller.signal,
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Get content length for progress tracking
        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let downloaded = 0;
        
        // Read response with progress tracking
        const chunks = [];
        const reader = response.body.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          downloaded += value.length;
          
          if (onProgress && total > 0) {
            onProgress({
              percentage: Math.round((downloaded / total) * 100),
              downloaded,
              total
            });
          }
        }
        
        // Combine chunks
        const uint8Array = new Uint8Array(downloaded);
        let offset = 0;
        for (const chunk of chunks) {
          uint8Array.set(chunk, offset);
          offset += chunk.length;
        }
        
        return uint8Array;
        
      } catch (error) {
        retries++;
        if (retries >= this.options.maxRetries) {
          throw new Error(`Download failed after ${this.options.maxRetries} retries: ${error.message}`);
        }
        
        console.warn(`⚠️ Download attempt ${retries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
      }
    }
  }

  /**
   * Process (decompress) downloaded index data
   */
  async processIndexData(compressedData) {
    try {
      // Decompress using pako or similar
      let jsonText;
      
      if (this.options.indexUrl.endsWith('.gz')) {
        // Use DecompressionStream if available (modern browsers)
        if ('DecompressionStream' in window) {
          const stream = new DecompressionStream('gzip');
          const writer = stream.writable.getWriter();
          const reader = stream.readable.getReader();
          
          writer.write(compressedData);
          writer.close();
          
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          
          const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
          let offset = 0;
          for (const chunk of chunks) {
            decompressed.set(chunk, offset);
            offset += chunk.length;
          }
          
          jsonText = new TextDecoder().decode(decompressed);
        } else {
          // Fallback: assume pako is available or load it dynamically
          console.warn('⚠️ DecompressionStream not available, attempting pako fallback');
          
          // Try to use pako if available
          if (typeof pako !== 'undefined') {
            const decompressed = pako.ungzip(compressedData);
            jsonText = new TextDecoder().decode(decompressed);
          } else {
            throw new Error('No decompression method available for .gz files');
          }
        }
      } else {
        // Not compressed
        jsonText = new TextDecoder().decode(compressedData);
      }
      
      const indexData = JSON.parse(jsonText);
      
      // Validate structure
      if (!indexData.chunks || !indexData.version) {
        throw new Error('Invalid index data structure');
      }
      
      console.log(`📦 Processed index: ${indexData.chunks.length} chunks, version ${indexData.version}`);
      return indexData;
      
    } catch (error) {
      throw new Error(`Failed to process index data: ${error.message}`);
    }
  }

  /**
   * Install processed data to local vector DB
   */
  async installToVectorDB(indexData, onProgress) {
    // Get vector DB instance
    const vectorDB = window.nylaVectorDB || new NYLAVectorDB();
    
    if (!vectorDB.initialized) {
      await vectorDB.initialize();
    }
    
    // Clear existing data
    await vectorDB.clear();
    
    // Install chunks in batches
    const batchSize = 50;
    const chunks = indexData.chunks;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Convert to expected format
      const formattedBatch = batch.map(chunk => ({
        id: chunk.id,
        text: chunk.text,
        embedding: new Float32Array(chunk.embedding),
        metadata: chunk.metadata
      }));
      
      await vectorDB.addChunks(formattedBatch);
      
      if (onProgress) {
        onProgress({
          percentage: Math.round(((i + batch.length) / chunks.length) * 100),
          processed: i + batch.length,
          total: chunks.length
        });
      }
    }
    
    console.log(`📚 Installed ${chunks.length} chunks to vector database`);
  }

  /**
   * Start periodic update checking
   */
  startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(() => {
      this.checkForUpdates().catch(console.error);
    }, this.options.checkIntervalMs);
    
    console.log(`🕒 Periodic update checking started (${this.options.checkIntervalMs / 1000 / 60} minutes)`);
  }

  /**
   * Stop periodic checking
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏹️ Periodic update checking stopped');
    }
  }

  /**
   * Event listener management
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      for (const callback of this.listeners[event]) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      updateInProgress: this.updateInProgress,
      currentVersion: this.currentVersion,
      lastCheckTime: this.lastCheckTime,
      periodicCheckEnabled: !!this.checkInterval
    };
  }

  /**
   * Force immediate update check and install
   */
  async forceUpdate() {
    const updateCheck = await this.checkForUpdates();
    
    if (updateCheck.updateAvailable) {
      return await this.downloadAndInstall();
    } else {
      console.log('✅ No update needed');
      return { success: true, message: 'Already up-to-date' };
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.stopPeriodicCheck();
    if (this.db) {
      this.db.close();
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAProductionSync;
}
window.NYLAProductionSync = NYLAProductionSync;