/**
 * NYLA Retriever
 * Handles semantic and hybrid search with ranking
 */

class NYLARetriever {
  constructor(vectorDB, embeddingService, options = {}) {
    this.vectorDB = vectorDB;
    this.embeddingService = embeddingService;
    
    this.options = {
      topK: 20,              // Top-k=20 for initial retrieval
      finalTopK: 8,          // Top-m=8 for final results after MMR
      semanticWeight: 0.7,
      keywordWeight: 0.3,
      minScore: 0.5,
      reranking: true,
      mmrEnabled: true,      // Enable MMR reranking
      ...options
    };
    
    // Keyword boost configurations
    this.keywordBoosts = {
      exact: 0.3,      // Exact match boost
      partial: 0.15,   // Partial match boost
      stem: 0.1,       // Stemmed word boost
      tag: 0.2         // Tag match boost
    };
  }

  /**
   * Main retrieval method
   */
  async retrieve(query, options = {}) {
    const config = { ...this.options, ...options };
    
    console.log(`🔍 Retrieving for query: "${query}"`);
    
    try {
      // Preprocess query
      const processedQuery = this.preprocessQuery(query);
      
      // Generate query embedding
      const queryEmbedding = await this.embeddingService.embed(processedQuery.normalized);
      
      // Perform semantic search
      console.log('🔍 Calling vector DB search with:', {
        queryEmbeddingLength: queryEmbedding.length,
        topK: config.topK * 2,
        filter: processedQuery.filter
      });
      
      const semanticResults = await this.vectorDB.search(
        queryEmbedding,
        config.topK * 2,  // Get extra results for reranking
        processedQuery.filter
      );
      
      // Apply semantic scoring (RAG-only)
      const scoredResults = this.applySemanticScoring(
        semanticResults,
        processedQuery,
        config
      );
      
      // Rerank if enabled
      const rerankedResults = config.reranking
        ? this.rerankResults(scoredResults, processedQuery)
        : scoredResults;
      
      // Filter by minimum score
      const filteredResults = rerankedResults.filter(r => r.finalScore >= config.minScore);
      
      // Debug: Log retrieval results
      console.log('🔍 Retrieval Debug:', {
        query: query,
        totalResults: semanticResults.length,
        scoredResults: scoredResults.length,
        rerankedResults: rerankedResults.length,
        filteredResults: filteredResults.length,
        minScore: config.minScore,
        topScores: rerankedResults.slice(0, 3).map(r => ({
          score: r.finalScore,
          title: r.metadata?.title || 'untitled',
          passedFilter: r.finalScore >= config.minScore
        }))
      });
      
      // Apply MMR reranking if enabled
      let finalResults = filteredResults;
      if (config.mmrEnabled && typeof NYLAMMRReranker !== 'undefined') {
        try {
          const mmrReranker = new NYLAMMRReranker(this.embeddingService, {
            lambda: 0.5  // λ≈0.5 as specified
          });
          finalResults = await mmrReranker.rerank(
            query, 
            filteredResults, 
            config.finalTopK || 8  // Top-m=8 for final results
          );
        } catch (error) {
          console.warn('⚠️ MMR reranking failed, using original results:', error);
        }
      }
      
      // Return final top-m results (default 8)
      return finalResults.slice(0, config.finalTopK || 8);
      
    } catch (error) {
      console.error('❌ Retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Preprocess the query
   */
  preprocessQuery(query) {
    // Normalize query
    const normalized = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Extract keywords
    const keywords = this.extractKeywords(normalized);
    
    // Detect query intent
    const intent = this.detectIntent(normalized);
    
    // Build filter based on intent
    const filter = this.buildFilter(intent, keywords);
    
    return {
      original: query,
      normalized: normalized,
      keywords: keywords,
      intent: intent,
      filter: filter
    };
  }

  /**
   * Extract important keywords from query
   */
  extractKeywords(query) {
    const stopwords = new Set([
      'what', 'is', 'are', 'the', 'how', 'to', 'do', 'i', 'can',
      'does', 'when', 'where', 'why', 'which', 'with', 'for',
      'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'of'
    ]);
    
    const words = query.split(/\s+/);
    const keywords = [];
    
    for (const word of words) {
      if (!stopwords.has(word) && word.length > 2) {
        keywords.push({
          word: word,
          stem: this.stemWord(word),
          variations: this.getWordVariations(word)
        });
      }
    }
    
    return keywords;
  }

  /**
   * Simple word stemming
   */
  stemWord(word) {
    // Very basic stemming - remove common suffixes
    return word
      .replace(/ing$/, '')
      .replace(/ed$/, '')
      .replace(/s$/, '')
      .replace(/er$/, '')
      .replace(/est$/, '');
  }

  /**
   * Get word variations for fuzzy matching
   */
  getWordVariations(word) {
    const variations = [word];
    
    // Add common variations
    if (word.endsWith('y')) {
      variations.push(word.slice(0, -1) + 'ies');
    }
    if (word.endsWith('s')) {
      variations.push(word.slice(0, -1));
    }
    
    // Add blockchain-specific variations
    const blockchainMappings = {
      'sol': ['solana'],
      'eth': ['ethereum'],
      'algo': ['algorand'],
      'tx': ['transaction', 'transfer'],
      'fee': ['fees', 'cost', 'gas']
    };
    
    if (blockchainMappings[word]) {
      variations.push(...blockchainMappings[word]);
    }
    
    return variations;
  }

  /**
   * Detect query intent
   */
  detectIntent(query) {
    const intents = {
      howTo: /^(how (to|do)|can i|what.*steps)/i,
      comparison: /(difference|compare|vs|versus|better|which)/i,
      technical: /(fee|gas|tps|speed|cost|transaction|consensus)/i,
      feature: /(transfer|swap|qr|raid|send|receive)/i,
      blockchain: /(solana|ethereum|algorand|blockchain|network)/i,
      troubleshooting: /(error|fail|problem|issue|wrong|fix)/i,
      general: /(what|explain|tell me|describe)/i
    };
    
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(query)) {
        return intent;
      }
    }
    
    return 'general';
  }

  /**
   * Build filter based on intent
   */
  buildFilter(intent, keywords, options = {}) {
    const filter = {};
    
    // DEFAULT FILTERS - Always applied unless explicitly disabled
    if (!options.includeNonTech) {
      // Exclude team info, branding, and other non-technical content
      filter.excludeFromTech = { $ne: true };
    }
    
    // For support questions, prioritize verified integrations
    if (intent === 'technical' || intent === 'blockchain' || keywords.some(k => 
      ['transfer', 'send', 'wallet', 'integration', 'support'].includes(k.word.toLowerCase())
    )) {
      filter.$or = [
        { type: { $ne: 'integration' } },  // Include non-integration content
        { 
          type: 'integration',
          verified: true,
          status: { $in: ['beta', 'live'] }
        }
      ];
    }
    
    // Add intent-based filters
    switch (intent) {
      case 'howTo':
        filter.chunkType = 'how_to';
        break;
      case 'technical':
        filter.chunkType = 'technical_spec';
        break;
      case 'blockchain':
        // Check for specific blockchain mentions
        const blockchains = ['solana', 'ethereum', 'algorand'];
        const mentioned = keywords.find(k => 
          blockchains.some(b => k.word.includes(b) || k.variations.includes(b))
        );
        if (mentioned) {
          filter.tags = [mentioned.word];
        }
        break;
    }
    
    return Object.keys(filter).length > 0 ? filter : null;
  }

  /**
   * Apply semantic scoring (RAG-only, no keyword rules)
   */
  applySemanticScoring(semanticResults, processedQuery, config) {
    return semanticResults.map(result => {
      // RAG-only: Use purely semantic scoring (no keyword rules)
      const semanticScore = result.score;
      const finalScore = semanticScore;
      
      return {
        ...result,
        semanticScore,
        finalScore
        // keywordScore removed - RAG-only semantic scoring
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Calculate keyword matching score
   */
  calculateKeywordScore(result, keywords) {
    if (!keywords || keywords.length === 0) return 0;
    
    let score = 0;
    const text = result.text.toLowerCase();
    const tags = result.metadata.tags || [];
    
    for (const keyword of keywords) {
      // Exact match in text
      if (text.includes(keyword.word)) {
        score += this.keywordBoosts.exact;
      }
      // Stem match in text
      else if (text.includes(keyword.stem)) {
        score += this.keywordBoosts.stem;
      }
      // Variations match
      else if (keyword.variations.some(v => text.includes(v))) {
        score += this.keywordBoosts.partial;
      }
      
      // Tag match
      if (tags.includes(keyword.word) || tags.includes(keyword.stem)) {
        score += this.keywordBoosts.tag;
      }
    }
    
    // Normalize score
    return Math.min(score / keywords.length, 1);
  }

  /**
   * Rerank results using additional signals
   */
  rerankResults(results, processedQuery) {
    return results.map(result => {
      let boostScore = 0;
      
      // Boost recent content
      if (result.metadata.updated_at) {
        const age = Date.now() - new Date(result.metadata.updated_at).getTime();
        const ageInDays = age / (1000 * 60 * 60 * 24);
        if (ageInDays < 30) {
          boostScore += 0.1;
        }
      }
      
      // Boost based on chunk type matching intent
      if (this.matchesIntent(result.metadata.chunk_type, processedQuery.intent)) {
        boostScore += 0.15;
      }
      
      // Boost Q&A pairs for question queries
      if (processedQuery.original.includes('?') && result.metadata.chunk_type === 'qa_pair') {
        boostScore += 0.2;
      }
      
      // Apply boost
      return {
        ...result,
        boostScore,
        finalScore: Math.min(result.finalScore + boostScore, 1)
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Check if chunk type matches intent
   */
  matchesIntent(chunkType, intent) {
    const intentMapping = {
      howTo: ['how_to', 'qa_pair'],
      technical: ['technical_spec', 'blockchain_info'],
      feature: ['feature', 'how_to'],
      troubleshooting: ['qa_pair', 'how_to'],
      comparison: ['technical_spec', 'blockchain_info']
    };
    
    return intentMapping[intent]?.includes(chunkType) || false;
  }

  /**
   * Get retrieval statistics
   */
  getStats() {
    return {
      semanticWeight: this.options.semanticWeight,
      keywordWeight: this.options.keywordWeight,
      minScore: this.options.minScore,
      topK: this.options.topK
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLARetriever;
}
window.NYLARetriever = NYLARetriever;