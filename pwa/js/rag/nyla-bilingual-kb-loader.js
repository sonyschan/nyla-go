/**
 * NYLA Bilingual Knowledge Base Loader
 * Loads structured KB files and initializes bilingual RAG system
 */

class NYLABilingualKBLoader {
  constructor(options = {}) {
    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    this.options = {
      useMultilingualEmbeddings: !isMobile, // Disable on mobile
      embeddingModel: 'Xenova/multilingual-e5-small',
      enableHybridRetrieval: !isMobile, // Disable on mobile
      mobileOptimized: isMobile,
      ...options
    };
    
    this.knowledgeBase = null;
    this.hybridRetriever = null;
    this.multilingualIngest = null;
    this.initialized = false;
    
    console.log('🌐 Bilingual KB Loader initialized');
  }

  /**
   * Initialize bilingual knowledge base system
   */
  async initialize() {
    const startTime = performance.now();
    console.log('🚀 Initializing bilingual knowledge base system...');
    
    try {
      // Check if mobile - use fallback immediately
      if (this.options.mobileOptimized) {
        console.log('📱 Mobile device detected - using fallback knowledge base');
        return this.initializeFallbackKB();
      }
      
      // Step 1: Initialize multilingual ingest system
      console.log('📚 Initializing multilingual ingest...');
      this.multilingualIngest = new NYLAMultilingualIngest({
        embeddingModel: this.options.embeddingModel
      });
      await this.multilingualIngest.initialize();
      
      // Step 2: Ingest structured KB files
      console.log('🏗️ Ingesting structured knowledge base...');
      const ingestResult = await this.multilingualIngest.ingestKnowledgeBase(
        this.onIngestProgress.bind(this)
      );
      
      // Step 3: Initialize hybrid retriever
      if (this.options.enableHybridRetrieval) {
        console.log('🔍 Initializing hybrid retriever...');
        this.hybridRetriever = new NYLAHybridRetriever(
          null, // Vector DB will be set up by ingest
          this.multilingualIngest.embeddingService
        );
        
        await this.hybridRetriever.initialize(
          ingestResult.bm25Index,
          this.multilingualIngest.glossary
        );
      }
      
      // Step 4: Create compatible knowledge base interface
      this.knowledgeBase = this.createBilingualKnowledgeBaseInterface(
        ingestResult.chunks,
        ingestResult.statistics
      );
      
      const totalTime = performance.now() - startTime;
      this.initialized = true;
      
      console.log(`✅ Bilingual KB system initialized in ${totalTime.toFixed(1)}ms`);
      console.log('📊 System statistics:', this.getSystemStats());
      
      return this.knowledgeBase;
      
    } catch (error) {
      console.error('❌ Bilingual KB initialization failed:', error);
      // Fallback to legacy system
      return this.initializeFallbackKB();
    }
  }

  /**
   * Progress callback for ingest process
   */
  onIngestProgress(progress) {
    const { stage, percentage, current, total } = progress;
    console.log(`📈 ${stage}: ${percentage}% (${current}/${total})`);
    
    // Emit progress event for UI updates
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('nyla-kb-progress', {
        detail: progress
      }));
    }
  }

  /**
   * Create compatible knowledge base interface
   */
  createBilingualKnowledgeBaseInterface(chunks, statistics) {
    return {
      // Legacy compatibility
      async searchKnowledge(query, options = {}) {
        return this.search(query, options);
      },
      
      // New bilingual search interface
      async search(query, options = {}) {
        if (!this.hybridRetriever) {
          console.warn('⚠️ Hybrid retriever not available, using simple search');
          return this.simpleSearch(query, chunks);
        }
        
        try {
          const results = await this.hybridRetriever.retrieve(query, options);
          return this.formatSearchResults(results);
        } catch (error) {
          console.error('❌ Hybrid search failed:', error);
          return this.simpleSearch(query, chunks);
        }
      },
      
      // Get knowledge by topic (legacy compatibility)
      getKnowledge(topic) {
        const topicChunks = chunks.filter(chunk => 
          chunk.type === topic || 
          chunk.source_id.includes(topic) ||
          chunk.tags.includes(topic)
        );
        
        if (topicChunks.length === 0) return null;
        
        return {
          content: this.aggregateChunkContent(topicChunks),
          lastFetched: Date.now(),
          status: 'structured',
          chunks: topicChunks.length
        };
      },
      
      // Bilingual query support
      async queryBilingual(query, language = 'auto', options = {}) {
        const searchOptions = {
          ...options,
          preferredLanguage: language
        };
        
        return this.search(query, searchOptions);
      },
      
      // Statistics and metadata
      getStats: () => ({
        totalChunks: chunks.length,
        languageBreakdown: statistics.languageBreakdown,
        embeddingModel: this.options.embeddingModel,
        hybridRetrieval: this.options.enableHybridRetrieval,
        initialized: this.initialized
      }),
      
      // Legacy properties for compatibility
      lastUpdated: { bilingual: Date.now() },
      chunks: chunks,
      statistics: statistics
    };
  }

  /**
   * Simple search fallback
   */
  simpleSearch(query, chunks) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    for (const chunk of chunks) {
      let score = 0;
      const searchText = [
        chunk.title,
        chunk.summary_en,
        chunk.summary_zh,
        chunk.body
      ].join(' ').toLowerCase();
      
      // Simple keyword matching
      const queryWords = queryLower.split(/\s+/);
      for (const word of queryWords) {
        if (word.length > 2 && searchText.includes(word)) {
          score += searchText.split(word).length - 1;
        }
      }
      
      if (score > 0) {
        results.push({
          chunk,
          score,
          relevance: score / queryWords.length
        });
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(result => this.formatSearchResult(result));
  }

  /**
   * Format search results for consistency
   */
  formatSearchResults(results) {
    return results.map(result => this.formatSearchResult(result));
  }

  /**
   * Format single search result
   */
  formatSearchResult(result) {
    const chunk = result.chunk || result;
    
    return {
      source: chunk.source_id || chunk.type,
      data: {
        title: chunk.title,
        content: chunk.body,
        summary_en: chunk.summary_en,
        summary_zh: chunk.summary_zh,
        tags: chunk.tags,
        type: chunk.type,
        language: chunk.lang
      },
      relevance: result.final_score || result.score || result.relevance || 0,
      metadata: {
        id: chunk.id,
        hash: chunk.hash,
        retrieval_method: result.retrieval_method || 'simple',
        cross_encoder_score: result.cross_encoder_score,
        dense_score: result.dense_score,
        bm25_score: result.bm25_score
      }
    };
  }

  /**
   * Aggregate chunk content for topic queries
   */
  aggregateChunkContent(chunks) {
    const aggregated = {
      overview: '',
      details: {},
      examples: [],
      related: []
    };
    
    // Group chunks by section
    const sections = {};
    for (const chunk of chunks) {
      if (!sections[chunk.section]) {
        sections[chunk.section] = [];
      }
      sections[chunk.section].push(chunk);
    }
    
    // Build aggregated content
    for (const [section, sectionChunks] of Object.entries(sections)) {
      aggregated.details[section] = sectionChunks.map(chunk => ({
        title: chunk.title,
        content: chunk.body,
        summary_en: chunk.summary_en,
        summary_zh: chunk.summary_zh,
        examples: chunk.examples
      }));
    }
    
    return aggregated;
  }

  /**
   * Initialize fallback KB for error scenarios
   */
  async initializeFallbackKB() {
    console.warn('⚠️ Using fallback knowledge base');
    
    // Use original NYLAKnowledgeBase as fallback
    const fallbackKB = new NYLAKnowledgeBase();
    return await fallbackKB.initialize();
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    return {
      initialized: this.initialized,
      multilingualEmbeddings: this.options.useMultilingualEmbeddings,
      embeddingModel: this.options.embeddingModel,
      hybridRetrieval: this.options.enableHybridRetrieval,
      ingestStats: this.multilingualIngest ? this.multilingualIngest.getStatistics() : null,
      retrieverStats: this.hybridRetriever ? this.hybridRetriever.getStats() : null
    };
  }

  /**
   * Update system configuration
   */
  updateConfig(newOptions) {
    this.options = { ...this.options, ...newOptions };
    
    if (this.hybridRetriever) {
      this.hybridRetriever.updateConfig(newOptions);
    }
    
    console.log('🔧 Bilingual KB config updated');
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.multilingualIngest && this.multilingualIngest.embeddingService) {
      await this.multilingualIngest.embeddingService.cleanup();
    }
    
    this.initialized = false;
    console.log('🧹 Bilingual KB system cleaned up');
  }
}

// Factory function for easy initialization
async function initializeBilingualKnowledgeBase(options = {}) {
  const loader = new NYLABilingualKBLoader(options);
  const knowledgeBase = await loader.initialize();
  
  // Store loader reference for access to advanced features
  knowledgeBase._loader = loader;
  
  return knowledgeBase;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NYLABilingualKBLoader, initializeBilingualKnowledgeBase };
}
window.NYLABilingualKBLoader = NYLABilingualKBLoader;
window.initializeBilingualKnowledgeBase = initializeBilingualKnowledgeBase;