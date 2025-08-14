/**
 * NYLA Hybrid Retriever
 * Combines dense vector search + BM25 + multilingual cross-encoder reranking
 */

class NYLAHybridRetriever {
  constructor(vectorDB, embeddingService, options = {}) {
    this.vectorDB = vectorDB;
    this.embeddingService = embeddingService;
    
    this.options = {
      denseTopK: 40,        // Dense vector search top-k
      bm25TopK: 40,         // BM25 search top-k  
      rerankTopK: 10,       // Final reranked results
      fusionAlpha: 0.6,     // Dense vs BM25 fusion weight (0.6 = 60% dense, 40% BM25)
      minScore: 0.1,        // Minimum score threshold
      crossEncoderModel: 'Xenova/multilingual-e5-small', // For reranking
      queryRewriteEnabled: true,
      ...options
    };
    
    this.bm25Index = null;
    this.glossary = null;
    this.crossEncoder = null;
    this.initialized = false;
    
    console.log('🔍 Hybrid Retriever initialized');
  }

  /**
   * Initialize the hybrid retriever
   */
  async initialize(bm25Index, glossary) {
    console.log('🚀 Initializing hybrid retriever...');
    
    this.bm25Index = bm25Index;
    this.glossary = glossary;
    
    // Initialize cross-encoder for reranking (simplified - using same embedding service)
    this.crossEncoder = this.embeddingService;
    
    this.initialized = true;
    console.log('✅ Hybrid retriever initialized');
  }

  /**
   * Main retrieval function with hybrid approach
   * @param {string} query - User query
   * @param {Object} options - Retrieval options
   * @returns {Array} - Top retrieved and reranked chunks
   */
  async retrieve(query, options = {}) {
    if (!this.initialized) {
      throw new Error('Hybrid retriever not initialized');
    }
    
    const config = { ...this.options, ...options };
    const startTime = performance.now();
    
    console.log(`🔍 Hybrid retrieval for query: "${query}"`);
    
    try {
      // Step 1: Query preprocessing and rewriting
      const processedQuery = await this.preprocessQuery(query, config);
      console.log(`📝 Processed query: "${processedQuery.rewritten}"`);
      
      // Step 2: Parallel dense and BM25 search
      const [denseResults, bm25Results] = await Promise.all([
        this.denseSearch(processedQuery, config.denseTopK),
        this.bm25Search(processedQuery, config.bm25TopK)
      ]);
      
      console.log(`🎯 Dense: ${denseResults.length}, BM25: ${bm25Results.length} results`);
      
      // Step 3: Merge and deduplicate results
      const mergedResults = this.mergeAndDeduplicate(
        denseResults, 
        bm25Results, 
        config.fusionAlpha
      );
      
      console.log(`🔗 Merged to ${mergedResults.length} unique results`);
      
      // Step 4: Cross-encoder reranking
      const rerankedResults = await this.crossEncoderRerank(
        processedQuery.rewritten,
        mergedResults,
        config.rerankTopK
      );
      
      const retrievalTime = performance.now() - startTime;
      console.log(`✅ Hybrid retrieval completed in ${retrievalTime.toFixed(1)}ms`);
      
      return rerankedResults.map(result => ({
        ...result,
        retrieval_method: 'hybrid',
        retrieval_time: retrievalTime,
        query_processed: processedQuery
      }));
      
    } catch (error) {
      console.error('❌ Hybrid retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Preprocess and rewrite query using glossary
   */
  async preprocessQuery(query, config) {
    const processed = {
      original: query,
      rewritten: query,
      terms: [],
      language: this.detectQueryLanguage(query),
      expansions: []
    };
    
    if (!config.queryRewriteEnabled || !this.glossary) {
      processed.terms = this.tokenizeQuery(query);
      return processed;
    }
    
    // Language-specific preprocessing
    if (processed.language === 'zh') {
      processed.rewritten = await this.rewriteChineseQuery(query);
    } else if (processed.language === 'mixed') {
      processed.rewritten = await this.rewriteMixedLanguageQuery(query);
    }
    
    // Term expansion using glossary
    processed.expansions = this.expandQueryTerms(processed.rewritten);
    processed.terms = this.tokenizeQuery(processed.rewritten);
    
    return processed;
  }

  /**
   * Detect query language
   */
  detectQueryLanguage(query) {
    const chineseChars = (query.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = query.length;
    
    if (chineseChars === 0) return 'en';
    if (chineseChars === totalChars) return 'zh';
    return 'mixed';
  }

  /**
   * Rewrite Chinese query using glossary mappings
   */
  async rewriteChineseQuery(query) {
    let rewritten = query;
    
    if (!this.glossary) return rewritten;
    
    // Check all glossary categories
    const allTerms = Object.values(this.glossary).flatMap(category => 
      Object.entries(category)
    );
    
    for (const [zhTerm, termData] of allTerms) {
      if (query.includes(zhTerm)) {
        // Add English equivalent and synonyms
        const englishTerms = [
          termData.en_primary,
          ...(termData.en_synonyms || [])
        ].join(' ');
        
        rewritten += ` ${englishTerms}`;
      }
    }
    
    return rewritten;
  }

  /**
   * Rewrite mixed language query
   */
  async rewriteMixedLanguageQuery(query) {
    // For mixed queries, apply both Chinese and English processing
    const chineseExpanded = await this.rewriteChineseQuery(query);
    return this.expandEnglishTerms(chineseExpanded);
  }

  /**
   * Expand English terms using glossary
   */
  expandEnglishTerms(query) {
    let expanded = query.toLowerCase();
    
    if (!this.glossary) return expanded;
    
    // Check for English terms that need expansion
    const allTerms = Object.values(this.glossary).flatMap(category =>
      Object.entries(category)
    );
    
    for (const [zhTerm, termData] of allTerms) {
      if (expanded.includes(termData.en_primary.toLowerCase())) {
        // Add synonyms and abbreviations
        const synonyms = [
          ...(termData.en_synonyms || []),
          ...(termData.abbreviations || [])
        ].join(' ');
        
        expanded += ` ${synonyms}`;
      }
    }
    
    return expanded;
  }

  /**
   * Expand query terms using glossary
   */
  expandQueryTerms(query) {
    const expansions = [];
    
    if (!this.glossary || !this.glossary.query_rewrite_patterns) {
      return expansions;
    }
    
    const patterns = this.glossary.query_rewrite_patterns;
    
    // Check Chinese to English patterns
    if (patterns.chinese_to_english) {
      for (const [zhPattern, enEquivalents] of Object.entries(patterns.chinese_to_english)) {
        if (query.includes(zhPattern)) {
          expansions.push(...enEquivalents);
        }
      }
    }
    
    // Check expansion terms
    if (patterns.expansion_terms) {
      for (const [term, variants] of Object.entries(patterns.expansion_terms)) {
        if (query.toLowerCase().includes(term.toLowerCase())) {
          expansions.push(...variants);
        }
      }
    }
    
    return [...new Set(expansions)]; // Remove duplicates
  }

  /**
   * Tokenize query for search
   */
  tokenizeQuery(query) {
    const tokens = [];
    
    // Split by spaces and punctuation, preserve both English and Chinese
    const words = query.toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    for (const word of words) {
      tokens.push(word);
      
      // For Chinese text, also add individual characters as tokens
      if (/[\u4e00-\u9fff]/.test(word)) {
        tokens.push(...[...word].filter(char => /[\u4e00-\u9fff]/.test(char)));
      }
    }
    
    return [...new Set(tokens)];
  }

  /**
   * Dense vector search using semantic similarity
   */
  async denseSearch(processedQuery, topK) {
    try {
      // Generate query embedding
      const queryText = [
        processedQuery.rewritten,
        ...processedQuery.expansions
      ].join(' ');
      
      const queryEmbedding = await this.embeddingService.embed(queryText);
      
      // Search vector database
      const results = await this.vectorDB.search(queryEmbedding, topK);
      
      return results.map(result => ({
        ...result,
        dense_score: result.score || result.similarity || 0,
        search_method: 'dense'
      }));
      
    } catch (error) {
      console.error('❌ Dense search failed:', error);
      return [];
    }
  }

  /**
   * BM25 keyword search
   */
  async bm25Search(processedQuery, topK) {
    if (!this.bm25Index) {
      console.warn('⚠️ BM25 index not available');
      return [];
    }
    
    try {
      const queryTokens = [
        ...processedQuery.terms,
        ...this.tokenizeQuery(processedQuery.expansions.join(' '))
      ];
      
      const results = this.bm25Index.search(queryTokens, topK);
      
      return results.map(result => ({
        ...result,
        bm25_score: result.bm25_score || 0,
        search_method: 'bm25'
      }));
      
    } catch (error) {
      console.error('❌ BM25 search failed:', error);
      return [];
    }
  }

  /**
   * Merge dense and BM25 results with score fusion
   */
  mergeAndDeduplicate(denseResults, bm25Results, fusionAlpha) {
    const mergedMap = new Map();
    
    // Add dense results
    for (const result of denseResults) {
      const score = (result.dense_score || 0) * fusionAlpha;
      mergedMap.set(result.id || result.hash, {
        ...result,
        fusion_score: score,
        dense_score: result.dense_score || 0,
        bm25_score: 0
      });
    }
    
    // Add/merge BM25 results
    for (const result of bm25Results) {
      const bm25Score = (result.bm25_score || 0) * (1 - fusionAlpha);
      const id = result.id || result.hash;
      
      if (mergedMap.has(id)) {
        // Merge scores
        const existing = mergedMap.get(id);
        existing.fusion_score += bm25Score;
        existing.bm25_score = result.bm25_score || 0;
        existing.search_method = 'hybrid';
      } else {
        // Add new result
        mergedMap.set(id, {
          ...result,
          fusion_score: bm25Score,
          dense_score: 0,
          bm25_score: result.bm25_score || 0,
          search_method: 'bm25'
        });
      }
    }
    
    // Convert to array and sort by fusion score
    return Array.from(mergedMap.values())
      .sort((a, b) => b.fusion_score - a.fusion_score);
  }

  /**
   * Cross-encoder reranking for final relevance scoring
   */
  async crossEncoderRerank(query, candidates, topK) {
    if (candidates.length === 0) return [];
    
    try {
      // For now, use similarity scoring as cross-encoder replacement
      // In production, this would use a cross-encoder model
      const queryEmbedding = await this.embeddingService.embed(query);
      
      const scoredCandidates = [];
      
      for (const candidate of candidates) {
        let crossEncoderScore = candidate.fusion_score;
        
        // If candidate has embedding, compute similarity
        if (candidate.embedding) {
          const similarity = this.embeddingService.cosineSimilarity(
            queryEmbedding, 
            candidate.embedding
          );
          // Combine fusion score with cross-encoder similarity
          crossEncoderScore = (candidate.fusion_score * 0.3) + (similarity * 0.7);
        }
        
        scoredCandidates.push({
          ...candidate,
          cross_encoder_score: crossEncoderScore,
          final_score: crossEncoderScore
        });
      }
      
      // Sort by cross-encoder score and return top K
      return scoredCandidates
        .sort((a, b) => b.cross_encoder_score - a.cross_encoder_score)
        .slice(0, topK)
        .filter(result => result.final_score >= this.options.minScore);
        
    } catch (error) {
      console.error('❌ Cross-encoder reranking failed:', error);
      // Fallback to fusion scores
      return candidates
        .sort((a, b) => b.fusion_score - a.fusion_score)
        .slice(0, topK)
        .filter(result => result.fusion_score >= this.options.minScore);
    }
  }

  /**
   * Update retriever configuration
   */
  updateConfig(newOptions) {
    this.options = { ...this.options, ...newOptions };
    console.log('🔧 Hybrid retriever config updated');
  }

  /**
   * Get retriever statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      config: this.options,
      hasGlossary: !!this.glossary,
      hasBM25Index: !!this.bm25Index,
      vectorDBStats: this.vectorDB ? this.vectorDB.getStats() : null
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAHybridRetriever;
}
window.NYLAHybridRetriever = NYLAHybridRetriever;