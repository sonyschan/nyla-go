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
      maxCacheSize: 100,   // Maximum cache entries
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
      
      // Initialize components (chunker not needed - embeddings are pre-built)
      this.embeddingService = getEmbeddingService();
      this.vectorDB = new NYLAVectorDB();
      this.contextBuilder = new NYLAContextBuilder(this.embeddingService);
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
      
      // Initialize semantic retriever after dependencies
      this.retriever = new NYLASemanticRetriever(this.vectorDB, this.embeddingService, {
        topK: 25,              // Dense retrieval (BM25/Dense = 25 each)
        bm25TopK: 25,          // BM25 retrieval (BM25/Dense = 25 each)
        crossEncoderTopK: 15,  // Cross-encoder topK1 = 15  
        fusionTopK: 12,        // Working-set fusion topK0/1 = 12
        parentTopK: 3,         // Parent-child aggregation topK_parent = 3
        finalTopK: 3,          // Final context segments = 3
        minScore: 0.3,         // Quality threshold
        mmrEnabled: true,
        mmrLambda: 0.5,
        crossEncoderEnabled: true,
        parentChildEnabled: true,
        scoreStrategyEnabled: true
      });
      
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
   * Build vector index from knowledge base (using pre-built embeddings)
   */
  async buildIndex(knowledgeBase, onProgress) {
    console.log('🏗️ Loading pre-built vector index...');
    
    try {
      // The vector DB loads pre-built embeddings from nyla-vector-db.json
      // No chunking needed as embeddings are already generated
      if (onProgress) {
        onProgress({ stage: 'loading', progress: 50, status: 'Loading pre-built embeddings...' });
      }
      
      // Vector DB initialization handles loading the pre-built index
      await this.vectorDB.initialize();
      
      const stats = this.vectorDB.getStats();
      console.log(`📦 Loaded ${stats.totalChunks || 0} pre-built chunks`);
      
      if (onProgress) {
        onProgress({ stage: 'loading', progress: 100, status: 'Vector index loaded successfully' });
      }
      
      console.log('✅ Vector index loaded successfully');
      
      // Mark version as up-to-date
      if (this.versionManager) {
        const vectorStats = this.vectorDB.getStats();
        await this.versionManager.markAsUpToDate(knowledgeBase, vectorStats, {
          loadedFromPreBuilt: true,
          timestamp: new Date().toISOString()
        });
      }
      
      // Log statistics
      console.log('📊 Vector DB statistics:', stats);
      
    } catch (error) {
      console.error('❌ Vector index loading failed:', error);
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
      
      const context = await this.contextBuilder.buildContext(
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
      topK: options.topK || 25,              // Top-k=25 for dense/BM25 retrieval
      crossEncoderTopK: options.crossEncoderTopK || 15,   // Cross-encoder topK1=15
      fusionTopK: options.fusionTopK || 12,               // Working-set fusion topK0/1=12
      parentTopK: options.parentTopK || 3,               // Parent-child topK_parent=3
      finalTopK: options.finalTopK || 3,                 // Final segments=3
      minScore: options.minScore || 0.5,
      mmrEnabled: options.mmrEnabled !== false,
      crossEncoderEnabled: options.crossEncoderEnabled !== false,
      parentChildEnabled: options.parentChildEnabled !== false,
      scoreStrategyEnabled: options.scoreStrategyEnabled !== false
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
    
    // Check if this is a hosted LLM (simpler interface)
    if (this.llmEngine.constructor.name === 'NYLAHostedLLM') {
      try {
        // Debug: Log what context we received from context builder
        console.log('🌐 RAG Pipeline → Hosted LLM: Context received:', {
          hasContext: !!context,
          hasContextField: !!(context && context.context),
          contextType: typeof context?.context,
          contextLength: context?.context?.length || 0,
          contextPreview: context?.context?.substring(0, 200) + '...' || 'No context',
          metadata: context?.metadata
        });
        
        // For hosted LLM, format context properly as array of strings
        const contextArray = [];
        
        // The context object contains the formatted context which includes the knowledge
        // Extract the formatted context which already has the chunk content
        if (context && context.context) {
          // The hosted LLM expects an array of strings, not objects with role/content
          const formattedContext = `Here is relevant knowledge to help answer the user's question:\n\n${context.context}`;
          contextArray.push(formattedContext);
          
          console.log('🌐 RAG Pipeline → Hosted LLM: Sending context:', {
            contextArrayLength: contextArray.length,
            firstItemLength: formattedContext.length,
            firstItemPreview: formattedContext.substring(0, 300) + '...'
          });
        } else {
          console.warn('⚠️ RAG Pipeline → Hosted LLM: No context to send!', {
            context: context,
            hasContext: !!context,
            hasContextField: !!(context && context.context)
          });
        }
        
        // For hosted LLM, use simple generateResponse interface with string array context
        const response = await this.llmEngine.generateResponse(query, contextArray);
        
        return {
          text: response.text || response.answer || response,
          streaming: false,
          llmResponse: response
        };
      } catch (error) {
        console.error('❌ Hosted LLM generate response failed:', error);
        throw error;
      }
    }
    
    // Handle local WebLLM with streaming support
    if (options.streaming && this.llmEngine.generateStreamingResponse) {
      // Use the LLM engine's streaming method
      const streamResponse = await this.llmEngine.generateStreamingResponse(
        query,
        {
          knowledgeContext: context,
          sourceMetadata: context.metadata?.sources || [],
          contextStats: {
            chunksUsed: context.metadata?.chunksUsed || 0,
            totalChunks: context.metadata?.totalChunks || 0,
            estimatedTokens: context.metadata?.estimatedTokens || 0,
            conversationTokens: context.metadata?.conversationTokens || 0,
            hasConversationContext: context.metadata?.hasConversationContext || false
          },
          ...options
        },
        options.onChunk // Pass chunk callback if provided
      );
      
      return {
        text: streamResponse.text || streamResponse,
        streaming: true,
        llmResponse: streamResponse
      };
    }
    
    // Non-streaming response for local WebLLM
    const response = await this.llmEngine.generateResponse(
      query,
      {
        knowledgeContext: context,
        sourceMetadata: context.metadata?.sources || [],
        contextStats: {
          chunksUsed: context.metadata?.chunksUsed || 0,
          totalChunks: context.metadata?.totalChunks || 0,
          estimatedTokens: context.metadata?.estimatedTokens || 0,
          conversationTokens: context.metadata?.conversationTokens || 0,
          hasConversationContext: context.metadata?.hasConversationContext || false
        },
        ...options
      }
    );
    
    return {
      text: response.text || response,
      streaming: false,
      llmResponse: response
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
   * Clean expired cache entries and enforce size limit
   */
  cleanCache() {
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.options.cacheTTL) {
        this.queryCache.delete(key);
      }
    }
    
    // Enforce cache size limit (LRU eviction)
    if (this.queryCache.size > this.options.maxCacheSize) {
      const entries = Array.from(this.queryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp); // Oldest first
      
      const toDelete = entries.slice(0, entries.length - this.options.maxCacheSize);
      toDelete.forEach(([key]) => this.queryCache.delete(key));
      
      NYLALogger.debug(`🧹 Cache cleanup: removed ${toDelete.length} old entries`);
    }
    
    this.lastCacheClean = now;
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