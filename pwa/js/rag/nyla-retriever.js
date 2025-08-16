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
      team: /(team|founder|creator|developer|who.*created|who.*developed|who.*founded|who.*made|創辦人|創始人|開發者|團隊|誰創造|誰開發|開發團隊|創建者)/i,
      social_media: /(social|links|follow|contact|community|channels|where.*find|join.*community|official.*links|twitter|telegram|x\.com|linktree|x.*account|twitter.*account|社交|社区|联系|聯絡|连接|連結|关注|關注|加入|联系方式|聯絡方式|官方.*账户|官方.*帳戶|官方.*渠道|如何.*联系|如何.*聯絡|在哪.*找到|怎么.*联系|怎麼.*聯絡)/i,
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
    
    // SIMPLIFIED: Use semantic similarity instead of complex metadata filtering
    // The semantic embedding model is better at determining relevance than rigid rules
    //
    // // DEFAULT FILTERS - Always applied unless explicitly disabled
    // if (!options.includeNonTech) {
    //   // Exclude team info, branding, and other non-technical content
    //   filter.excludeFromTech = { $ne: true };
    // }
    // 
    // // For support questions, prioritize verified integrations
    // if (intent === 'technical' || intent === 'blockchain' || keywords.some(k => 
    //   ['transfer', 'send', 'wallet', 'integration', 'support'].includes(k.word.toLowerCase())
    // )) {
    //   filter.$or = [
    //     { type: { $ne: 'integration' } },  // Include non-integration content
    //     { 
    //       type: 'integration',
    //       verified: true,
    //       status: { $in: ['beta', 'live'] }
    //     }
    //   ];
    // }
    
    // DISABLED: Intent-based filters are too restrictive and create mismatches
    // Let semantic similarity handle content relevance instead of rigid metadata filtering
    // 
    // // Add intent-based filters
    // switch (intent) {
    //   case 'howTo':
    //     filter.chunkType = 'how_to';
    //     break;
    //   case 'technical':
    //     filter.chunkType = 'technical_spec';
    //     break;
    //   case 'blockchain':
    //     // Check for specific blockchain mentions
    //     const blockchains = ['solana', 'ethereum', 'algorand'];
    //     const mentioned = keywords.find(k => 
    //       blockchains.some(b => k.word.includes(b) || k.variations.includes(b))
    //     );
    //     if (mentioned) {
    //       filter.tags = [mentioned.word];
    //     }
    //     break;
    // }
    
    return Object.keys(filter).length > 0 ? filter : null;
  }

  /**
   * Apply semantic scoring (RAG-only, no keyword rules)
   */
  applySemanticScoring(semanticResults, processedQuery, config) {
    return semanticResults.map(result => {
      // RAG-only: Use purely semantic scoring (no keyword rules)
      let semanticScore = result.score;
      
      // Apply intent-based boosting for team/founder queries
      if (processedQuery.intent === 'team' && this.isTeamChunk(result)) {
        // Strong boost for team chunks when asking about founders/team
        let boostFactor = 2.0; // 100% boost for team chunks on founder queries
        
        const contentType = this.getContentType(result);
        if (contentType === 'body' && result.tokens > 50) {
          boostFactor = 2.5; // 150% boost for content-rich team chunks
          console.log(`👥 Enhanced team boost applied to content-rich chunk: ${result.metadata?.title || 'untitled'}`);
        } else {
          console.log(`👥 Standard team boost applied to chunk: ${result.metadata?.title || 'untitled'}`);
        }
        
        semanticScore *= boostFactor;
        console.log(`📈 Team boost applied: ${result.score.toFixed(3)} → ${semanticScore.toFixed(3)} (${boostFactor}x)`);
      }
      // Apply intent-based boosting for social media queries
      else if (processedQuery.intent === 'social_media' && this.isSocialChunk(result)) {
        // Base social boost
        let boostFactor = 1.4; // 40% base boost for social chunks on social queries
        
        // Additional boost based on content richness for social queries
        const contentType = this.getContentType(result);
        if (contentType === 'body' && result.tokens && result.tokens > 100) {
          boostFactor = 1.8; // 80% boost for content-rich body chunks
          console.log(`🔗 Enhanced social media boost applied to content-rich chunk: ${result.metadata?.title || 'untitled'}`);
        } else if (contentType === 'title' && result.tokens && result.tokens < 50) {
          boostFactor = 1.1; // Only 10% boost for title-only chunks to de-prioritize them
          console.log(`🔗 Reduced social media boost applied to title chunk: ${result.metadata?.title || 'untitled'}`);
        } else {
          console.log(`🔗 Standard social media boost applied to chunk: ${result.metadata?.title || 'untitled'}`);
        }
        
        semanticScore *= boostFactor;
      }
      
      const finalScore = semanticScore;
      
      return {
        ...result,
        semanticScore,
        finalScore,
        socialBoost: processedQuery.intent === 'social_media' && this.isSocialChunk(result)
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
      comparison: ['technical_spec', 'blockchain_info'],
      social_media: ['facts', 'ecosystem'] // Social info is often in facts or ecosystem chunks
    };
    
    return intentMapping[intent]?.includes(chunkType) || false;
  }

  /**
   * Check if a chunk contains social media information
   */
  isSocialChunk(result) {
    const metadata = result.metadata || {};
    const tags = metadata.tags || [];
    const title = (metadata.title || '').toLowerCase();
    const text = (result.text || '').toLowerCase();
    
    // Check for explicit content type marking
    const explicitSocialType = metadata.content_type === 'social_media_links';
    
    // Check for social media indicators in tags
    const socialTags = tags.some(tag => 
      /social|links|contact|community|official.*channels|twitter|telegram|x\.com|linktree|社交|社区|联系|官方|channels/i.test(tag)
    );
    
    // Check for social media indicators in title
    const socialTitle = /social|links|contact|community|official.*channels|twitter|telegram|official.*links/i.test(title);
    
    // Check for social media URLs or handles in text
    const socialText = /@\w+|https?:\/\/(x\.com|twitter\.com|t\.me|linktr\.ee|discord\.gg)|social|community.*channels|official.*links|contact.*information|官方.*账户|联系方式|社区.*渠道|官方.*渠道/i.test(text);
    
    // Check specific section indicators
    const socialSection = metadata.section === 'official_channels' || metadata.section === 'community_links';
    
    // Check query boost keywords
    const hasQueryBoost = metadata.query_boost && metadata.query_boost.some(keyword =>
      /social|links|contact|community|follow|official/i.test(keyword)
    );
    
    return explicitSocialType || socialTags || socialTitle || socialText || socialSection || hasQueryBoost;
  }

  /**
   * Check if a chunk contains team/founder information
   */
  isTeamChunk(result) {
    const metadata = result.metadata || {};
    const tags = metadata.tags || [];
    const title = (metadata.title || '').toLowerCase();
    const text = (result.text || '').toLowerCase();
    const category = (metadata.category || '').toLowerCase();
    
    // Check for explicit team categories
    const teamCategories = ['team_nyla', 'team_collaboration', 'team_credentials'].includes(category);
    
    // Check for team indicators in tags
    const teamTags = tags.some(tag => 
      /team|founder|developer|creator|about.*team|team.*nyla/i.test(tag)
    );
    
    // Check for team indicators in title
    const teamTitle = /team|founder|co.*founder|developer|creator|about.*team|team.*nyla/i.test(title);
    
    // Check for team indicators in text content
    const teamText = /@\w+.*founder|founder.*@\w+|team.*nyla|nyla.*team|@shax_btc|@btcberries|@chiefz_sol|@noir0883|founded.*nyla|co.*founded/i.test(text);
    
    return teamCategories || teamTags || teamTitle || teamText;
  }

  /**
   * Determine the content type of a chunk (title, summary, body)
   */
  getContentType(result) {
    const metadata = result.metadata || {};
    const title = (metadata.title || '').toLowerCase();
    
    // Check for explicit subsection marking
    if (metadata.subsection) {
      return metadata.subsection; // 'title', 'summary', 'body'
    }
    
    // Infer from title pattern
    if (title.includes(' - title')) {
      return 'title';
    } else if (title.includes(' - summary')) {
      return 'summary';
    } else if (title.includes(' - body')) {
      return 'body';
    }
    
    // Infer from token count
    const tokens = result.tokens || 0;
    if (tokens < 30) {
      return 'title';
    } else if (tokens < 80) {
      return 'summary';
    } else {
      return 'body';
    }
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