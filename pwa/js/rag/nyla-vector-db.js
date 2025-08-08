/**
 * NYLA Vector Database
 * Local vector search using FAISS-web with IndexedDB persistence
 */

class NYLAVectorDB {
  constructor(options = {}) {
    this.options = {
      dbName: 'NYLAVectorDB',
      storeName: 'vectors',
      indexName: 'nyla-faiss-index',
      dimension: 384,
      similarity: 'cosine',
      ...options
    };
    
    this.db = null;
    this.index = null;
    this.chunks = new Map(); // id -> chunk mapping
    this.initialized = false;
    this.faissModule = null;
  }

  /**
   * Initialize the vector database
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🗄️ Initializing vector database...');
    
    try {
      // Initialize IndexedDB
      await this.initIndexedDB();
      
      // Load FAISS module
      await this.loadFAISS();
      
      // Load or create index
      await this.loadOrCreateIndex();
      
      this.initialized = true;
      console.log('✅ Vector database initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize vector database:', error);
      throw error;
    }
  }

  /**
   * Initialize IndexedDB for persistence
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.options.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create vector store
        if (!db.objectStoreNames.contains(this.options.storeName)) {
          const store = db.createObjectStore(this.options.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Load FAISS WebAssembly module
   */
  async loadFAISS() {
    try {
      console.log('📥 Loading FAISS module...');
      
      // For production, we'll use a bundled version
      // For now, we'll implement a simple vector search
      this.faissModule = {
        createIndex: (dimension) => new SimpleVectorIndex(dimension),
        loaded: true
      };
      
      console.log('✅ FAISS module loaded');
    } catch (error) {
      console.error('❌ Failed to load FAISS:', error);
      throw error;
    }
  }

  /**
   * Load existing index or create new one
   */
  async loadOrCreateIndex() {
    try {
      // Try to load from IndexedDB
      const savedIndex = await this.loadFromIndexedDB();
      
      if (savedIndex) {
        console.log('📂 Loading existing index from storage...');
        await this.restoreIndex(savedIndex);
      } else {
        console.log('🆕 Creating new vector index...');
        this.createNewIndex();
      }
    } catch (error) {
      console.warn('⚠️ Failed to load saved index, creating new one:', error);
      this.createNewIndex();
    }
  }

  /**
   * Create a new vector index
   */
  createNewIndex() {
    this.index = this.faissModule.createIndex(this.options.dimension);
    this.chunks.clear();
  }

  /**
   * Add chunks to the index
   */
  async addChunks(chunks, onProgress) {
    if (!this.initialized) await this.initialize();
    
    console.log(`📝 Adding ${chunks.length} chunks to index...`);
    
    const startTime = Date.now();
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Validate chunk
      if (!chunk.embedding || chunk.embedding.length !== this.options.dimension) {
        console.warn(`⚠️ Skipping chunk ${chunk.id}: invalid embedding`);
        continue;
      }
      
      // Add to index
      this.index.add(chunk.embedding, chunk.id);
      
      // Store chunk data
      this.chunks.set(chunk.id, {
        id: chunk.id,
        text: chunk.text,
        metadata: chunk.metadata
      });
      
      // Report progress
      if (onProgress && i % 10 === 0) {
        onProgress({
          current: i + 1,
          total: chunks.length,
          percentage: Math.round(((i + 1) / chunks.length) * 100)
        });
      }
    }
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Added ${chunks.length} chunks in ${elapsed}ms`);
    
    // Save to IndexedDB
    await this.saveToIndexedDB();
  }

  /**
   * Search for similar vectors
   */
  async search(queryEmbedding, k = 5, filter = null) {
    if (!this.initialized) await this.initialize();
    
    // Validate query embedding
    if (!queryEmbedding || queryEmbedding.length !== this.options.dimension) {
      throw new Error('Invalid query embedding');
    }
    
    // Perform search
    const results = this.index.search(queryEmbedding, k * 2); // Get extra results for filtering
    
    // Apply filters and get chunk data
    const filteredResults = [];
    
    for (const result of results) {
      const chunk = this.chunks.get(result.id);
      
      if (!chunk) continue;
      
      // Apply metadata filter if provided
      if (filter && !this.matchesFilter(chunk, filter)) {
        continue;
      }
      
      filteredResults.push({
        id: chunk.id,
        text: chunk.text,
        metadata: chunk.metadata,
        score: result.similarity,
        distance: result.distance
      });
      
      if (filteredResults.length >= k) break;
    }
    
    return filteredResults;
  }

  /**
   * Check if chunk matches filter criteria
   */
  matchesFilter(chunk, filter) {
    if (!filter) return true;
    
    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      const chunkTags = chunk.metadata.tags || [];
      const hasMatchingTag = filter.tags.some(tag => chunkTags.includes(tag));
      if (!hasMatchingTag) return false;
    }
    
    // Filter by source
    if (filter.source && chunk.metadata.source !== filter.source) {
      return false;
    }
    
    // Filter by chunk type
    if (filter.chunkType && chunk.metadata.chunk_type !== filter.chunkType) {
      return false;
    }
    
    return true;
  }

  /**
   * Save index to IndexedDB
   */
  async saveToIndexedDB() {
    if (!this.db) return;
    
    try {
      const indexData = {
        id: this.options.indexName,
        timestamp: Date.now(),
        dimension: this.options.dimension,
        chunks: Array.from(this.chunks.entries()).map(([id, chunk]) => ({
          id,
          ...chunk
        })),
        indexState: this.index.serialize()
      };
      
      const transaction = this.db.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);
      await store.put(indexData);
      
      console.log('💾 Index saved to IndexedDB');
    } catch (error) {
      console.error('❌ Failed to save index:', error);
    }
  }

  /**
   * Load index from IndexedDB
   */
  async loadFromIndexedDB() {
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.options.storeName], 'readonly');
      const store = transaction.objectStore(this.options.storeName);
      const request = store.get(this.options.indexName);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Restore index from saved data
   */
  async restoreIndex(savedData) {
    if (!savedData) return;
    
    // Create new index
    this.createNewIndex();
    
    // Restore chunks
    this.chunks.clear();
    for (const chunk of savedData.chunks) {
      this.chunks.set(chunk.id, {
        id: chunk.id,
        text: chunk.text,
        metadata: chunk.metadata
      });
    }
    
    // Restore index state
    if (savedData.indexState) {
      this.index.deserialize(savedData.indexState);
    } else {
      // Rebuild index from chunks
      console.log('🔨 Rebuilding index from chunks...');
      for (const chunk of savedData.chunks) {
        if (chunk.embedding) {
          this.index.add(chunk.embedding, chunk.id);
        }
      }
    }
    
    console.log(`✅ Restored index with ${this.chunks.size} chunks`);
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      chunkCount: this.chunks.size,
      dimension: this.options.dimension,
      indexSize: this.index ? this.index.size() : 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage() {
    // Rough estimate
    const vectorMemory = this.chunks.size * this.options.dimension * 4; // 4 bytes per float
    const metadataMemory = this.chunks.size * 1024; // ~1KB per chunk metadata
    return vectorMemory + metadataMemory;
  }

  /**
   * Clear the index
   */
  async clear() {
    this.createNewIndex();
    
    // Clear from IndexedDB
    if (this.db) {
      const transaction = this.db.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);
      await store.delete(this.options.indexName);
    }
    
    console.log('🧹 Vector index cleared');
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initialized = false;
    console.log('🔒 Vector database closed');
  }
}

/**
 * Simple vector index implementation (placeholder for FAISS)
 * This will be replaced with actual FAISS bindings
 */
class SimpleVectorIndex {
  constructor(dimension) {
    this.dimension = dimension;
    this.vectors = [];
    this.ids = [];
  }

  add(vector, id) {
    this.vectors.push(vector);
    this.ids.push(id);
  }

  search(queryVector, k) {
    const similarities = [];
    
    // Calculate similarities
    for (let i = 0; i < this.vectors.length; i++) {
      const similarity = this.cosineSimilarity(queryVector, this.vectors[i]);
      similarities.push({
        id: this.ids[i],
        similarity: similarity,
        distance: 1 - similarity
      });
    }
    
    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return top k
    return similarities.slice(0, k);
  }

  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    return normA === 0 || normB === 0 ? 0 : dotProduct / (normA * normB);
  }

  size() {
    return this.vectors.length;
  }

  serialize() {
    return {
      vectors: this.vectors,
      ids: this.ids,
      dimension: this.dimension
    };
  }

  deserialize(data) {
    this.vectors = data.vectors || [];
    this.ids = data.ids || [];
    this.dimension = data.dimension || this.dimension;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAVectorDB;
}
window.NYLAVectorDB = NYLAVectorDB;