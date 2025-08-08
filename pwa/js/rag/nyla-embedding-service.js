/**
 * NYLA Embedding Service
 * Generates embeddings using Transformers.js with all-MiniLM-L6-v2 model
 */

class NYLAEmbeddingService {
  constructor(options = {}) {
    this.options = {
      modelName: 'Xenova/all-MiniLM-L6-v2',
      dimension: 384,
      maxSequenceLength: 256,
      batchSize: 32,
      cacheEnabled: true,
      ...options
    };
    
    this.pipeline = null;
    this.modelLoaded = false;
    this.embeddingCache = new Map();
    this.loadingPromise = null;
  }

  /**
   * Initialize the embedding model
   */
  async initialize() {
    if (this.modelLoaded) return;
    if (this.loadingPromise) return this.loadingPromise;
    
    this.loadingPromise = this._loadModel();
    await this.loadingPromise;
    this.loadingPromise = null;
  }

  /**
   * Load the transformer model
   */
  async _loadModel() {
    try {
      console.log('🤖 Loading embedding model...');
      
      let pipeline, env;
      
      // Environment-aware loading
      if (typeof window === 'undefined') {
        // Node.js environment
        const transformers = await import('@xenova/transformers');
        pipeline = transformers.pipeline;
        env = transformers.env;
        
        // Configure for Node.js
        env.allowLocalModels = true;
        env.useBrowserCache = false;
      } else {
        // Browser environment
        const transformers = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
        pipeline = transformers.pipeline;
        env = transformers.env;
        
        // Configure for browser
        env.allowLocalModels = false;
        env.useBrowserCache = true;
      }
      
      // Create feature extraction pipeline
      this.pipeline = await pipeline('feature-extraction', this.options.modelName, {
        quantized: true,  // Use quantized model for smaller size
        progress_callback: (progress) => {
          if (progress.status === 'downloading') {
            console.log(`📥 Downloading model: ${Math.round(progress.progress)}%`);
          }
        }
      });
      
      this.modelLoaded = true;
      console.log('✅ Embedding model loaded successfully');
      
      // Warm up the model
      await this._warmupModel();
      
    } catch (error) {
      console.error('❌ Failed to load embedding model:', error);
      throw error;
    }
  }

  /**
   * Warm up the model with a test embedding
   */
  async _warmupModel() {
    console.log('🔥 Warming up embedding model...');
    await this.embed('test query for model warmup');
    console.log('✅ Model warmed up');
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text) {
    await this.initialize();
    
    // Check cache first
    if (this.options.cacheEnabled && this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text);
    }
    
    try {
      // Truncate text if too long
      const truncatedText = this.truncateText(text);
      
      // Generate embedding
      const output = await this.pipeline(truncatedText, {
        pooling: 'mean',
        normalize: true
      });
      
      // Extract embedding array
      const embedding = Array.from(output.data);
      
      // Cache the result
      if (this.options.cacheEnabled) {
        this.embeddingCache.set(text, embedding);
      }
      
      return embedding;
      
    } catch (error) {
      console.error('❌ Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async embedBatch(texts, onProgress) {
    await this.initialize();
    
    const embeddings = [];
    const totalTexts = texts.length;
    
    // Process in batches
    for (let i = 0; i < totalTexts; i += this.options.batchSize) {
      const batch = texts.slice(i, i + this.options.batchSize);
      const batchEmbeddings = [];
      
      // Process each text in the batch
      for (const text of batch) {
        const embedding = await this.embed(text);
        batchEmbeddings.push(embedding);
      }
      
      embeddings.push(...batchEmbeddings);
      
      // Report progress
      if (onProgress) {
        const progress = Math.round((embeddings.length / totalTexts) * 100);
        onProgress({
          current: embeddings.length,
          total: totalTexts,
          percentage: progress
        });
      }
      
      // Small delay to prevent blocking UI
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return embeddings;
  }

  /**
   * Truncate text to fit within model's max sequence length
   */
  truncateText(text) {
    // Simple word-based truncation
    const words = text.split(/\s+/);
    const maxWords = Math.floor(this.options.maxSequenceLength * 0.75); // Conservative estimate
    
    if (words.length <= maxWords) {
      return text;
    }
    
    return words.slice(0, maxWords).join(' ') + '...';
  }

  /**
   * Process knowledge chunks to add embeddings
   */
  async processChunks(chunks, onProgress) {
    console.log(`🚀 Processing ${chunks.length} chunks for embeddings...`);
    
    const processedChunks = [];
    const texts = chunks.map(chunk => chunk.text);
    
    // Generate embeddings
    const embeddings = await this.embedBatch(texts, onProgress);
    
    // Combine chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      processedChunks.push({
        ...chunks[i],
        embedding: embeddings[i],
        embedding_model: this.options.modelName,
        embedding_dimension: this.options.dimension
      });
    }
    
    console.log('✅ All chunks processed with embeddings');
    return processedChunks;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }
    
    return dotProduct / (norm1 * norm2);
  }

  /**
   * Find most similar chunks to a query
   */
  async findSimilar(query, chunks, topK = 5) {
    // Generate query embedding
    const queryEmbedding = await this.embed(query);
    
    // Calculate similarities
    const similarities = chunks.map(chunk => ({
      chunk: chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by similarity and return top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, topK);
  }

  /**
   * Clear embedding cache
   */
  clearCache() {
    this.embeddingCache.clear();
    console.log('🧹 Embedding cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.embeddingCache.size,
      memoryUsage: this.embeddingCache.size * this.options.dimension * 4 // Rough estimate in bytes
    };
  }

  /**
   * Export embeddings to a format suitable for FAISS
   */
  exportForFAISS(chunks) {
    const embeddings = chunks.map(chunk => chunk.embedding);
    const ids = chunks.map(chunk => chunk.id);
    
    return {
      embeddings: embeddings,
      ids: ids,
      dimension: this.options.dimension,
      count: chunks.length
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.clearCache();
    this.pipeline = null;
    this.modelLoaded = false;
    console.log('🧹 Embedding service cleaned up');
  }
}

// Singleton instance for the app
let embeddingServiceInstance = null;

/**
 * Get or create embedding service instance
 */
function getEmbeddingService(options) {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new NYLAEmbeddingService(options);
  }
  return embeddingServiceInstance;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NYLAEmbeddingService, getEmbeddingService };
}
window.NYLAEmbeddingService = NYLAEmbeddingService;
window.getEmbeddingService = getEmbeddingService;