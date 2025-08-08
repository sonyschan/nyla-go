/**
 * NYLA RAG Pipeline
 * Orchestrates the complete RAG workflow with parallel processing
 */

class NYLARAGPipeline {
  constructor(options = {}) {
    this.options = {
      targetLatency: 12000,  // 12 seconds
      parallelProcessing: true,
      cacheEnabled: true,
      cacheTTL: 300000,  // 5 minutes
      streamingEnabled: true,
      ...options
    };
    
    // Component instances
    this.chunker = null;
    this.embeddingService = null;
    this.vectorDB = null;
    this.retriever = null;
    this.contextBuilder = null;
    this.llmEngine = null;
    this.conversationManager = null;
    this.versionManager = null;
    
    // Cache
    this.queryCache = new Map();
    this.lastCacheClean = Date.now();
    
    // Performance tracking
    this.metrics = {
      totalQueries: 0,
      avgLatency: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.initialized = false;
  }

  /**
   * Set conversation context manager
   */
  setConversationManager(conversationManager) {
    this.conversationManager = conversationManager;
    console.log('💬 Conversation context manager set');
  }

  /**
   * Initialize the RAG pipeline
   */
  async initialize(knowledgeBase, llmEngine) {
    if (this.initialized) return;
    
    console.log('🚀 Initializing RAG pipeline...');
    const startTime = Date.now();
    
    try {
      // Store LLM engine reference
      this.llmEngine = llmEngine;
      
      // Initialize components
      this.chunker = new NYLAKnowledgeChunker();
      this.embeddingService = getEmbeddingService();
      this.vectorDB = new NYLAVectorDB();
      this.contextBuilder = new NYLAContextBuilder();
      this.versionManager = new NYLAKBVersionManager();
      
      // Initialize in parallel where possible
      if (this.options.parallelProcessing) {
        await Promise.all([
          this.embeddingService.initialize(),
          this.vectorDB.initialize(),
          this.versionManager.initialize()
        ]);
      } else {
        await this.embeddingService.initialize();
        await this.vectorDB.initialize();
        await this.versionManager.initialize();
      }
      
      // Initialize retriever after dependencies
      this.retriever = new NYLARetriever(this.vectorDB, this.embeddingService);
      
      // Check if index needs building/rebuilding
      const stats = this.vectorDB.getStats();
      const versionCheck = await this.versionManager.needsRebuild(knowledgeBase, stats);
      
      if (versionCheck.needsRebuild) {
        console.log(`🔄 Rebuilding index: ${versionCheck.reasons.join(', ')}`);
        await this.buildIndex(knowledgeBase);
      } else {
        console.log('✅ Index is up-to-date, no rebuild needed');
      }
      
      this.initialized = true;
      const elapsed = Date.now() - startTime;
      console.log(`✅ RAG pipeline initialized in ${elapsed}ms`);
      
    } catch (error) {
      console.error('❌ RAG pipeline initialization failed:', error);
      throw error;
    }
  }

  /**
   * Build vector index from knowledge base
   */
  async buildIndex(knowledgeBase, onProgress) {
    console.log('🏗️ Building vector index...');
    
    try {
      // Chunk the knowledge base
      const chunks = await this.chunker.processKnowledgeBase(knowledgeBase);
      console.log(`📦 Created ${chunks.length} chunks`);
      
      // Generate embeddings
      const embeddedChunks = await this.embeddingService.processChunks(
        chunks,
        onProgress ? (p) => onProgress({ stage: 'embedding', ...p }) : null
      );
      
      // Add to vector database
      await this.vectorDB.addChunks(
        embeddedChunks,
        onProgress ? (p) => onProgress({ stage: 'indexing', ...p }) : null
      );
      
      console.log('✅ Vector index built successfully');
      
      // Mark version as up-to-date
      if (this.versionManager) {
        const vectorStats = this.vectorDB.getStats();
        await this.versionManager.markAsUpToDate(knowledgeBase, vectorStats, {
          chunkingStats: this.chunker.getStatistics()
        });
      }
      
      // Get statistics
      const stats = this.chunker.getStatistics();
      console.log('📊 Chunking statistics:', stats);
      
    } catch (error) {
      console.error('❌ Index building failed:', error);
      throw error;
    }
  }

  /**
   * Process a query through the RAG pipeline
   */
  async query(userQuery, options = {}) {
    if (!this.initialized) {
      throw new Error('RAG pipeline not initialized');
    }
    
    const queryId = this.generateQueryId();
    const startTime = Date.now();
    
    console.log(`🔍 Processing query: "${userQuery}"`);
    
    try {
      // Check cache first
      if (this.options.cacheEnabled) {
        const cached = this.checkCache(userQuery);
        if (cached) {
          this.metrics.cacheHits++;
          console.log('✅ Cache hit');
          return cached;
        }
        this.metrics.cacheMisses++;
      }
      
      // Track metrics
      this.metrics.totalQueries++;
      
      // Parallel processing: warm LLM while retrieving
      const tasks = [];
      
      // Task 1: Retrieval
      const retrievalTask = this.performRetrieval(userQuery, options);
      tasks.push(retrievalTask);
      
      // Task 2: LLM warmup (if supported)
      if (this.options.parallelProcessing && this.llmEngine?.warmup) {
        const warmupTask = this.llmEngine.warmup();
        tasks.push(warmupTask);
      }
      
      // Wait for retrieval (and warmup if applicable)
      const [retrievalResult] = await Promise.all(tasks);
      
      // Build context with conversation manager
      const contextOptions = {
        ...options.contextOptions,
        conversationManager: this.conversationManager
      };
      
      const context = this.contextBuilder.buildContext(
        retrievalResult.chunks,
        userQuery,
        contextOptions
      );
      
      // Generate response
      const response = await this.generateResponse(
        context,
        userQuery,
        {
          ...options,
          queryId,
          streaming: this.options.streamingEnabled && options.streaming !== false
        }
      );
      
      // Calculate latency
      const latency = Date.now() - startTime;
      this.updateMetrics(latency);
      
      // Add conversation turn if manager available
      if (this.conversationManager) {
        this.conversationManager.addTurn(
          userQuery,
          response.text,
          {
            confidence: retrievalResult.confidence,
            sources: context.metadata.sources,
            responseType: 'informative'
          }
        );
      }

      // Prepare result
      const result = {
        queryId,
        query: userQuery,
        response: response.text,
        sources: context.metadata.sources,
        metrics: {
          latency,
          chunksRetrieved: retrievalResult.chunks.length,
          tokensUsed: context.metadata.estimatedTokens,
          conversationTokens: context.metadata.conversationTokens || 0,
          confidence: retrievalResult.confidence,
          hasConversationContext: context.metadata.hasConversationContext
        },
        streaming: response.streaming
      };
      
      // Cache result
      if (this.options.cacheEnabled && !options.noCache) {
        this.cacheResult(userQuery, result);
      }
      
      console.log(`✅ Query processed in ${latency}ms`);
      return result;
      
    } catch (error) {
      console.error('❌ Query processing failed:', error);
      throw error;
    }
  }

  /**
   * Perform retrieval step
   */
  async performRetrieval(query, options) {
    const chunks = await this.retriever.retrieve(query, {
      topK: options.topK || 5,
      minScore: options.minScore || 0.5
    });
    
    // Calculate confidence based on scores
    const confidence = chunks.length > 0
      ? chunks.reduce((sum, c) => sum + c.finalScore, 0) / chunks.length
      : 0;
    
    return {
      chunks,
      confidence
    };
  }

  /**
   * Generate response using LLM
   */
  async generateResponse(context, query, options) {
    if (!this.llmEngine) {
      throw new Error('LLM engine not configured');
    }
    
    // Handle streaming response
    if (options.streaming) {
      const streamController = new AbortController();
      
      const stream = await this.llmEngine.generateStream(
        context.prompt.full,
        {
          ...options,
          signal: streamController.signal
        }
      );
      
      return {
        text: null,  // Will be accumulated by caller
        streaming: {
          stream,
          controller: streamController
        }
      };
    }
    
    // Non-streaming response
    const response = await this.llmEngine.generate(
      context.prompt.full,
      options
    );
    
    return {
      text: response,
      streaming: null
    };
  }

  /**
   * Check query cache
   */
  checkCache(query) {
    // Clean old cache entries periodically
    if (Date.now() - this.lastCacheClean > 60000) { // Every minute
      this.cleanCache();
    }
    
    const cached = this.queryCache.get(query);
    if (cached && Date.now() - cached.timestamp < this.options.cacheTTL) {
      return cached.result;
    }
    
    return null;
  }

  /**
   * Cache query result
   */
  cacheResult(query, result) {
    this.queryCache.set(query, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    const expired = [];
    
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.options.cacheTTL) {
        expired.push(key);
      }
    }
    
    expired.forEach(key => this.queryCache.delete(key));
    this.lastCacheClean = now;
    
    if (expired.length > 0) {
      console.log(`🧹 Cleaned ${expired.length} expired cache entries`);
    }
  }

  /**
   * Update performance metrics
   */
  updateMetrics(latency) {
    const n = this.metrics.totalQueries;
    this.metrics.avgLatency = (this.metrics.avgLatency * (n - 1) + latency) / n;
  }

  /**
   * Generate unique query ID
   */
  generateQueryId() {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get pipeline statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      metrics: this.metrics,
      cache: {
        size: this.queryCache.size,
        hitRate: this.metrics.totalQueries > 0
          ? (this.metrics.cacheHits / this.metrics.totalQueries * 100).toFixed(2) + '%'
          : '0%'
      },
      vectorDB: this.vectorDB ? this.vectorDB.getStats() : null,
      embedding: this.embeddingService ? this.embeddingService.getCacheStats() : null
    };
  }

  /**
   * Update vector index with new knowledge
   */
  async updateIndex(newKnowledgeBase, onProgress) {
    console.log('🔄 Updating vector index...');
    
    // Clear existing index
    await this.vectorDB.clear();
    
    // Rebuild with new knowledge
    await this.buildIndex(newKnowledgeBase, onProgress);
    
    // Clear query cache
    this.queryCache.clear();
    
    console.log('✅ Index updated successfully');
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up RAG pipeline...');
    
    if (this.embeddingService) {
      await this.embeddingService.cleanup();
    }
    
    if (this.vectorDB) {
      this.vectorDB.close();
    }
    
    this.queryCache.clear();
    this.initialized = false;
    
    console.log('✅ RAG pipeline cleaned up');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLARAGPipeline;
}
window.NYLARAGPipeline = NYLARAGPipeline;