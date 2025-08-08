/**
 * NYLA Retriever
 * Handles semantic and hybrid search with ranking
 */

class NYLARetriever {
  constructor(vectorDB, embeddingService, options = {}) {
    this.vectorDB = vectorDB;
    this.embeddingService = embeddingService;
    
    this.options = {
      topK: 5,
      semanticWeight: 0.7,
      keywordWeight: 0.3,
      minScore: 0.5,
      reranking: true,
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
      const semanticResults = await this.vectorDB.search(
        queryEmbedding,
        config.topK * 2,  // Get extra results for reranking
        processedQuery.filter
      );
      
      // Apply hybrid scoring
      const hybridResults = this.applyHybridScoring(
        semanticResults,
        processedQuery,
        config
      );
      
      // Rerank if enabled
      const finalResults = config.reranking
        ? this.rerankResults(hybridResults, processedQuery)
        : hybridResults;
      
      // Filter by minimum score
      const filteredResults = finalResults.filter(r => r.finalScore >= config.minScore);
      
      // Return top K results
      return filteredResults.slice(0, config.topK);
      
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
  buildFilter(intent, keywords) {
    const filter = {};
    
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
   * Apply hybrid scoring
   */
  applyHybridScoring(semanticResults, processedQuery, config) {
    return semanticResults.map(result => {
      // Semantic score (already normalized 0-1)
      const semanticScore = result.score;
      
      // Calculate keyword score
      const keywordScore = this.calculateKeywordScore(
        result,
        processedQuery.keywords
      );
      
      // Combine scores
      const finalScore = 
        (semanticScore * config.semanticWeight) +
        (keywordScore * config.keywordWeight);
      
      return {
        ...result,
        semanticScore,
        keywordScore,
        finalScore
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