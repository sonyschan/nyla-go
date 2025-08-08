/**
 * NYLA Answer-Aware Compression Service
 * Implements field-specific token limits and intelligent content compression
 */

class NYLACompressionService {
  constructor(options = {}) {
    this.options = {
      // Field-specific token budgets
      fieldLimits: {
        technical_spec: 150,      // Technical specifications
        how_to: 200,              // How-to instructions
        blockchain_info: 120,     // Blockchain information
        feature: 100,             // Feature descriptions
        qa_pair: 180,             // Q&A pairs
        general: 130,             // General information
        marketing: 50,            // Marketing content (heavily compressed)
        boilerplate: 30           // Boilerplate text (minimal)
      },
      
      // Compression strategies
      preserveKeywords: true,       // Keep important keywords
      maintainStructure: true,      // Preserve logical structure
      summarizationLevel: 'moderate', // 'light', 'moderate', 'aggressive'
      compressionRatio: 0.7,        // Target compression ratio
      
      // Answer-aware settings
      queryAware: true,             // Compress based on query relevance
      contextualRanking: true,      // Rank sentences by importance
      preserveExamples: true,       // Keep concrete examples
      
      ...options
    };
    
    // Pre-defined patterns for different content types
    this.contentPatterns = {
      technical: /\b(fee|gas|cost|tps|consensus|algorithm|protocol|transaction|block|hash|signature|wallet|address|private key|public key)\b/gi,
      procedural: /\b(step|first|second|then|next|finally|click|select|enter|copy|paste|scan|send|receive)\b/gi,
      blockchain: /\b(solana|ethereum|algorand|bitcoin|blockchain|network|mainnet|testnet|token|coin|smart contract)\b/gi,
      quantitative: /\b(\d+\.?\d*\s*(percent|%|seconds?|minutes?|hours?|days?|weeks?|months?|years?|usd|dollars?|cents?))\b/gi,
      examples: /\b(example|instance|such as|like|including|e\.g\.|for example)\b/gi
    };
    
    console.log('🗜️ Compression service initialized', {
      fieldLimits: Object.keys(this.options.fieldLimits).length,
      queryAware: this.options.queryAware,
      summarizationLevel: this.options.summarizationLevel
    });
  }

  /**
   * Compress chunks based on field type and query context
   */
  compressChunks(chunks, query, options = {}) {
    const config = { ...this.options, ...options };
    
    if (!chunks || chunks.length === 0) {
      return { chunks: [], statistics: { originalTokens: 0, compressedTokens: 0, compressionRatio: 0 } };
    }
    
    console.log(`🗜️ Compressing ${chunks.length} chunks for query: "${query.substring(0, 50)}..."`);
    
    try {
      // Analyze query to understand compression priorities
      const queryContext = this.analyzeQuery(query);
      
      let originalTokens = 0;
      let compressedTokens = 0;
      const compressedChunks = [];
      
      for (const chunk of chunks) {
        const originalLength = this.estimateTokens(chunk.text);
        originalTokens += originalLength;
        
        // Determine chunk type and get appropriate limit
        const chunkType = this.inferChunkType(chunk);
        const tokenLimit = config.fieldLimits[chunkType] || config.fieldLimits.general;
        
        // Apply compression if needed
        let compressedText = chunk.text;
        if (originalLength > tokenLimit) {
          compressedText = this.compressText(
            chunk.text,
            tokenLimit,
            queryContext,
            chunkType,
            config
          );
        }
        
        const compressedLength = this.estimateTokens(compressedText);
        compressedTokens += compressedLength;
        
        // Create compressed chunk
        compressedChunks.push({
          ...chunk,
          text: compressedText,
          originalLength: originalLength,
          compressedLength: compressedLength,
          compressionRatio: compressedLength / originalLength,
          chunkType: chunkType,
          compressionApplied: compressedLength < originalLength
        });
      }
      
      const overallCompressionRatio = originalTokens > 0 ? compressedTokens / originalTokens : 1;
      
      console.log(`✅ Compression complete: ${originalTokens} → ${compressedTokens} tokens (${(overallCompressionRatio * 100).toFixed(1)}%)`);
      
      return {
        chunks: compressedChunks,
        statistics: {
          originalTokens: originalTokens,
          compressedTokens: compressedTokens,
          compressionRatio: overallCompressionRatio,
          chunksCompressed: compressedChunks.filter(c => c.compressionApplied).length,
          averageCompression: compressedChunks
            .filter(c => c.compressionApplied)
            .reduce((sum, c, _, arr) => sum + c.compressionRatio / arr.length, 0)
        },
        queryContext: queryContext
      };
      
    } catch (error) {
      console.error('❌ Compression failed:', error);
      return { 
        chunks: chunks, 
        statistics: { originalTokens: 0, compressedTokens: 0, compressionRatio: 1, error: error.message } 
      };
    }
  }

  /**
   * Analyze query to understand compression priorities
   */
  analyzeQuery(query) {
    const context = {
      queryLength: query.length,
      keywords: [],
      intent: 'general',
      priority: 'balanced',
      preservePatterns: []
    };
    
    const queryLower = query.toLowerCase();
    
    // Extract keywords
    const words = queryLower.match(/\b\w{3,}\b/g) || [];
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);
    
    context.keywords = words.filter(word => !stopWords.has(word));
    
    // Detect query intent
    if (/\b(how to|step|process|tutorial)\b/i.test(query)) {
      context.intent = 'procedural';
      context.preservePatterns.push('procedural');
    } else if (/\b(fee|cost|gas|price|expensive|cheap)\b/i.test(query)) {
      context.intent = 'financial';
      context.preservePatterns.push('quantitative', 'technical');
    } else if (/\b(fast|slow|speed|time|duration|tps)\b/i.test(query)) {
      context.intent = 'performance';
      context.preservePatterns.push('quantitative', 'technical');
    } else if (/\b(solana|ethereum|algorand|blockchain|network)\b/i.test(query)) {
      context.intent = 'blockchain';
      context.preservePatterns.push('blockchain', 'technical');
    } else if (/\b(example|show|demo)\b/i.test(query)) {
      context.intent = 'example';
      context.preservePatterns.push('examples', 'procedural');
    }
    
    // Set compression priority
    if (context.keywords.length <= 2) {
      context.priority = 'conservative'; // Less compression for simple queries
    } else if (context.keywords.length > 5) {
      context.priority = 'aggressive';   // More compression for complex queries
    }
    
    return context;
  }

  /**
   * Infer chunk type from metadata and content
   */
  inferChunkType(chunk) {
    // Use metadata if available
    if (chunk.metadata && chunk.metadata.chunk_type) {
      return chunk.metadata.chunk_type;
    }
    
    // Infer from content patterns
    const text = chunk.text.toLowerCase();
    
    if (/\b(step|first|second|then|next|finally)\b/i.test(text)) {
      return 'how_to';
    } else if (/\b(fee|gas|cost|tps|consensus|algorithm)\b/i.test(text)) {
      return 'technical_spec';
    } else if (/\b(solana|ethereum|algorand|blockchain)\b/i.test(text)) {
      return 'blockchain_info';
    } else if (/\b(feature|functionality|capability|support)\b/i.test(text)) {
      return 'feature';
    } else if (/[?].*[.]|question.*answer/i.test(text)) {
      return 'qa_pair';
    } else if (/\b(amazing|best|great|easy|simple|powerful)\b/i.test(text)) {
      return 'marketing';
    } else if (/\b(terms|conditions|policy|legal|disclaimer)\b/i.test(text)) {
      return 'boilerplate';
    }
    
    return 'general';
  }

  /**
   * Compress text using multiple strategies
   */
  compressText(text, tokenLimit, queryContext, chunkType, config) {
    // Split into sentences for granular compression
    const sentences = this.splitIntoSentences(text);
    
    if (sentences.length <= 1) {
      // Single sentence - apply word-level compression
      return this.compressWords(text, tokenLimit, queryContext);
    }
    
    // Score sentences by importance
    const scoredSentences = sentences.map(sentence => ({
      text: sentence,
      score: this.scoreSentence(sentence, queryContext, chunkType),
      tokens: this.estimateTokens(sentence)
    }));
    
    // Sort by score (highest first)
    scoredSentences.sort((a, b) => b.score - a.score);
    
    // Select sentences within token budget
    const selectedSentences = [];
    let currentTokens = 0;
    
    for (const sentence of scoredSentences) {
      if (currentTokens + sentence.tokens <= tokenLimit) {
        selectedSentences.push(sentence);
        currentTokens += sentence.tokens;
      } else {
        // Try to fit a compressed version of high-scoring sentence
        if (sentence.score > 0.7 && selectedSentences.length < 2) {
          const remainingTokens = tokenLimit - currentTokens;
          if (remainingTokens > 20) {
            const compressedSentence = this.compressWords(
              sentence.text,
              remainingTokens,
              queryContext
            );
            selectedSentences.push({
              text: compressedSentence,
              score: sentence.score,
              tokens: this.estimateTokens(compressedSentence)
            });
            break;
          }
        }
      }
    }
    
    // Reconstruct text maintaining logical order
    if (config.maintainStructure) {
      return this.reconstructOrderedText(selectedSentences, sentences);
    } else {
      return selectedSentences.map(s => s.text).join(' ');
    }
  }

  /**
   * Split text into sentences
   */
  splitIntoSentences(text) {
    // Simple sentence splitting with some context awareness
    return text
      .replace(/([.!?])\s+/g, '$1|SPLIT|')
      .split('|SPLIT|')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Score sentence importance based on query context and content type
   */
  scoreSentence(sentence, queryContext, chunkType) {
    let score = 0.3; // Base score
    
    const sentenceLower = sentence.toLowerCase();
    
    // Query keyword matching
    let keywordMatches = 0;
    for (const keyword of queryContext.keywords) {
      if (sentenceLower.includes(keyword)) {
        keywordMatches++;
        score += 0.2;
      }
    }
    
    // Boost for exact phrase matches
    if (keywordMatches > 1) {
      score += 0.1;
    }
    
    // Pattern-based scoring based on query intent
    for (const pattern of queryContext.preservePatterns) {
      if (this.contentPatterns[pattern]) {
        const matches = sentence.match(this.contentPatterns[pattern]);
        if (matches) {
          score += matches.length * 0.1;
        }
      }
    }
    
    // Content type specific scoring
    switch (chunkType) {
      case 'how_to':
        // Prefer numbered steps or action verbs
        if (/\b(\d+\.|step|first|click|select|enter)\b/i.test(sentence)) {
          score += 0.2;
        }
        break;
        
      case 'technical_spec':
        // Prefer sentences with technical metrics or specifications
        if (/\b(\d+\.?\d*\s*(seconds?|ms|tps|percent|%|usd))\b/i.test(sentence)) {
          score += 0.2;
        }
        break;
        
      case 'qa_pair':
        // Prefer direct answers
        if (/^(yes|no|you can|it is|the answer)\b/i.test(sentence)) {
          score += 0.2;
        }
        break;
        
      case 'marketing':
      case 'boilerplate':
        // Heavily penalize unless directly relevant
        if (keywordMatches === 0) {
          score *= 0.3;
        }
        break;
    }
    
    // Penalize very short or very long sentences
    const wordCount = sentence.split(/\s+/).length;
    if (wordCount < 5) {
      score *= 0.8;
    } else if (wordCount > 50) {
      score *= 0.9;
    }
    
    // Boost sentences with concrete examples
    if (this.options.preserveExamples && /\b(example|such as|like|including|e\.g\.)\b/i.test(sentence)) {
      score += 0.15;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Compress at word level for single sentences
   */
  compressWords(text, tokenLimit, queryContext) {
    const words = text.split(/\s+/);
    
    if (words.length <= tokenLimit * 0.75) { // Rough word-to-token conversion
      return text;
    }
    
    // Score words by importance
    const scoredWords = words.map(word => ({
      word: word,
      score: this.scoreWord(word, queryContext)
    }));
    
    // Keep highest scoring words within budget
    const targetWords = Math.floor(tokenLimit * 0.75);
    scoredWords.sort((a, b) => b.score - a.score);
    
    const keepWords = new Set(scoredWords.slice(0, targetWords).map(w => w.word));
    
    // Reconstruct sentence preserving order
    const compressed = words.filter(word => keepWords.has(word));
    
    // Ensure minimum coherence
    if (compressed.length < 3) {
      return words.slice(0, targetWords).join(' ');
    }
    
    return compressed.join(' ');
  }

  /**
   * Score individual words
   */
  scoreWord(word, queryContext) {
    const wordLower = word.toLowerCase();
    let score = 0.1; // Base score
    
    // Keyword matching
    if (queryContext.keywords.includes(wordLower)) {
      score += 0.8;
    }
    
    // Content pattern matching
    for (const [patternName, pattern] of Object.entries(this.contentPatterns)) {
      if (queryContext.preservePatterns.includes(patternName) && pattern.test(word)) {
        score += 0.4;
      }
    }
    
    // Structural importance
    if (/^\d+\.?$/.test(word)) { // Numbers
      score += 0.3;
    } else if (word.length > 6) { // Longer words often more important
      score += 0.2;
    } else if (/^(and|the|of|to|in|for|with|on|at|by)$/i.test(word)) { // Common function words
      score -= 0.2;
    }
    
    return Math.max(score, 0);
  }

  /**
   * Reconstruct text maintaining logical sentence order
   */
  reconstructOrderedText(selectedSentences, originalSentences) {
    const selectedTexts = new Set(selectedSentences.map(s => s.text));
    const ordered = [];
    
    for (const sentence of originalSentences) {
      if (selectedTexts.has(sentence)) {
        ordered.push(sentence);
      }
    }
    
    return ordered.join(' ');
  }

  /**
   * Apply answer-aware compression based on expected response type
   */
  compressForAnswerType(chunks, query, expectedAnswerType, options = {}) {
    const config = { ...this.options, ...options };
    
    // Adjust field limits based on answer type
    const adjustedLimits = { ...config.fieldLimits };
    
    switch (expectedAnswerType) {
      case 'short_answer':
        // Heavily compress for short answers
        Object.keys(adjustedLimits).forEach(key => {
          adjustedLimits[key] = Math.floor(adjustedLimits[key] * 0.5);
        });
        break;
        
      case 'step_by_step':
        // Preserve procedural content
        adjustedLimits.how_to = Math.floor(adjustedLimits.how_to * 1.3);
        adjustedLimits.general = Math.floor(adjustedLimits.general * 0.8);
        break;
        
      case 'detailed_explanation':
        // Allow more content for detailed explanations
        Object.keys(adjustedLimits).forEach(key => {
          adjustedLimits[key] = Math.floor(adjustedLimits[key] * 1.2);
        });
        break;
        
      case 'comparison':
        // Preserve technical specs and features
        adjustedLimits.technical_spec = Math.floor(adjustedLimits.technical_spec * 1.3);
        adjustedLimits.feature = Math.floor(adjustedLimits.feature * 1.2);
        break;
    }
    
    return this.compressChunks(chunks, query, { ...config, fieldLimits: adjustedLimits });
  }

  /**
   * Estimate token count (simple approximation)
   */
  estimateTokens(text) {
    // Rough estimation: ~1 token per 4 characters or 0.75 tokens per word
    const charCount = text.length / 4;
    const wordCount = text.split(/\s+/).length * 0.75;
    return Math.ceil(Math.max(charCount, wordCount));
  }

  /**
   * Get compression statistics
   */
  getStats() {
    return {
      fieldLimits: this.options.fieldLimits,
      summarizationLevel: this.options.summarizationLevel,
      compressionRatio: this.options.compressionRatio,
      queryAware: this.options.queryAware,
      contextualRanking: this.options.contextualRanking
    };
  }

  /**
   * Update compression parameters
   */
  updateParameters(newOptions) {
    this.options = { ...this.options, ...newOptions };
    console.log('🗜️ Compression parameters updated:', newOptions);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLACompressionService;
}
window.NYLACompressionService = NYLACompressionService;