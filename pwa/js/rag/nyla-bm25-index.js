/**
 * NYLA BM25 Index
 * Implements BM25 keyword search using search_text field (Sparse Text View)
 * Phase 2 Enhancement: Enables hybrid Dense + BM25 retrieval fusion
 */

class NYLABm25Index {
  constructor(options = {}) {
    this.options = {
      k1: 1.2,        // BM25 term frequency saturation parameter
      b: 0.75,        // BM25 length normalization parameter
      minScore: 0.1,  // Minimum BM25 score threshold
      maxResults: 50, // Maximum results to return
      ...options
    };
    
    this.index = new Map();     // term -> document frequency map
    this.documents = new Map(); // doc_id -> {search_text, tokens, length}
    this.totalDocuments = 0;
    this.avgDocLength = 0;
    this.totalTokens = 0;
    
    this.isBuilt = false;
    
    console.log('🔍 NYLABm25Index initialized with options:', this.options);
  }
  
  /**
   * Build BM25 index from enhanced chunks with search_text field
   */
  async buildIndex(chunks) {
    console.log(`🏗️ Building BM25 index from ${chunks.length} chunks...`);
    
    this.index.clear();
    this.documents.clear();
    this.totalDocuments = 0;
    this.totalTokens = 0;
    
    const termDocFreq = new Map(); // term -> Set of doc_ids
    
    for (const chunk of chunks) {
      // Use search_text field (Sparse Text View) for BM25 indexing
      const searchText = chunk.search_text;
      if (!searchText || typeof searchText !== 'string') {
        console.warn(`⚠️ Chunk ${chunk.id} missing search_text field, skipping BM25 indexing`);
        continue;
      }
      
      // Tokenize search_text for keyword matching
      const tokens = this.tokenize(searchText);
      const docLength = tokens.length;
      
      if (docLength === 0) continue;
      
      // Store document info
      this.documents.set(chunk.id, {
        search_text: searchText,
        tokens: tokens,
        length: docLength,
        chunk: chunk
      });
      
      // Build term frequencies for this document
      const termFreq = new Map();
      for (const token of tokens) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
        
        // Track which documents contain this term
        if (!termDocFreq.has(token)) {
          termDocFreq.set(token, new Set());
        }
        termDocFreq.get(token).add(chunk.id);
      }
      
      // Store term frequencies
      this.index.set(chunk.id, termFreq);
      this.totalDocuments++;
      this.totalTokens += docLength;
    }
    
    // Calculate average document length
    this.avgDocLength = this.totalDocuments > 0 ? this.totalTokens / this.totalDocuments : 0;
    
    // Build document frequency index (term -> number of docs containing term)
    this.documentFreq = new Map();
    for (const [term, docSet] of termDocFreq.entries()) {
      this.documentFreq.set(term, docSet.size);
    }
    
    this.isBuilt = true;
    
    console.log(`✅ BM25 index built:`, {
      totalDocuments: this.totalDocuments,
      uniqueTerms: this.documentFreq.size,
      avgDocLength: Math.round(this.avgDocLength * 100) / 100,
      totalTokens: this.totalTokens
    });
    
    return this;
  }
  
  /**
   * Tokenize text for BM25 indexing
   * Optimized for crypto/blockchain terms and multilingual content (Chinese/English)
   */
  tokenize(text) {
    if (!text) return [];
    
    const tokens = [];
    
    // Convert to lowercase for English terms
    const lowerText = text.toLowerCase();
    
    // First pass: Extract English words and crypto patterns
    const englishTokens = lowerText
      .split(/[\s\.,;:!?()[\]{}"'`~\-_+=<>|\\\/]+/)
      .filter(token => {
        // Keep meaningful English tokens
        if (token.length < 2) return false;
        
        // Skip common stop words for English
        const stopWords = new Set([
          'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
          'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
          'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
        ]);
        
        if (stopWords.has(token)) return false;
        return true;
      });
    
    tokens.push(...englishTokens);
    
    // Second pass: Extract Chinese terms - IMPROVED precision approach
    // Focus on meaningful Chinese terms and avoid noise bi-grams
    const chineseChars = text.match(/[\u4e00-\u9fff]+/g) || [];
    
    // Comprehensive noise bi-gram patterns to avoid (connecting particles, meaningless fragments)
    const noiseBigrams = new Set([
      // Possessive particles causing noise matches
      '的合', '柴的', '个的', '们的', '它的', '他的', '她的', '我的', '你的', '其的',
      '是的', '了的', '在的', '有的', '也的', '都的', '很的', '就的', '要的', '会的',
      '可的', '能的', '说的', '做的', '来的', '去的', '对的', '向的', '从的', '与的',
      
      // Common grammatical connecting fragments  
      '的是', '的在', '的有', '的为', '的和', '的或', '的但', '的所', '的如', '的此',
      '和的', '或的', '但的', '所的', '如的', '此的', '等的', '及的', '以的', '用的',
      
      // Temporal/spatial meaningless fragments
      '时的', '候的', '间的', '里的', '上的', '下的', '前的', '后的', '左的', '右的',
      '内的', '外的', '中的', '间中', '中间', '之间', '之中', '之内', '之外', '之上',
      
      // Query-specific noise from contract searches
      '合的', '约的', '址的', '地的', '智的', '能的', '链的', '块的', '币的', '代的',
      '旺的', '柴的', '项的', '目的', '技的', '术的', '规的', '格的'
    ]);
    
    for (const chineseStr of chineseChars) {
      // ALWAYS add the full Chinese string (highest priority for exact matching)
      if (chineseStr.length >= 2 && chineseStr.length <= 8) {
        tokens.push(chineseStr);
      }
      
      // Add bi-grams ONLY for longer strings and AVOID noise patterns
      if (chineseStr.length >= 4) {
        for (let i = 0; i < chineseStr.length - 1; i++) {
          const bigram = chineseStr.slice(i, i + 2);
          // Skip noise bi-grams that create false matches
          if (!noiseBigrams.has(bigram)) {
            tokens.push(bigram);
          }
        }
      }
      
      // Add individual characters ONLY for 2-character terms (to preserve meaning)
      if (chineseStr.length === 2) {
        for (const char of chineseStr) {
          tokens.push(char);
        }
      }
    }
    
    // Remove duplicates and return
    const uniqueTokens = [...new Set(tokens)];
    
    // Debug tokenization for complex queries
    if (text.match(/[一-鿿]/) && uniqueTokens.length > 8) {
      console.log('🔍 Improved tokenization debug:', {
        original: text.substring(0, 100),
        englishTokens: englishTokens.slice(0, 10),
        chineseStrings: chineseChars.slice(0, 5),
        totalTokens: uniqueTokens.length,
        sampleTokens: uniqueTokens.slice(0, 15),
        noiseFiltered: '✅ Filtered noise bi-grams'
      });
    }
    
    return uniqueTokens;
  }
  
  /**
   * Analyze how query tokens match against the index
   */
  analyzeQueryTokens(queryTokens) {
    const analysis = {
      totalTokens: queryTokens.length,
      tokensWithMatches: 0,
      tokenDetails: {},
      coverage: 0
    };
    
    for (const token of queryTokens) {
      const df = this.documentFreq.get(token) || 0;
      analysis.tokenDetails[token] = {
        documentFrequency: df,
        hasMatches: df > 0,
        coverage: df > 0 ? (df / this.totalDocuments * 100).toFixed(1) + '%' : '0%'
      };
      
      if (df > 0) {
        analysis.tokensWithMatches++;
      }
    }
    
    analysis.coverage = analysis.totalTokens > 0 ? 
      (analysis.tokensWithMatches / analysis.totalTokens * 100).toFixed(1) + '%' : '0%';
    
    return analysis;
  }
  
  /**
   * Search using BM25 algorithm
   */
  async search(query, maxResults = null) {
    if (!this.isBuilt) {
      throw new Error('BM25 index not built. Call buildIndex() first.');
    }
    
    const limit = maxResults || this.options.maxResults;
    const queryTokens = this.tokenize(query);
    
    if (queryTokens.length === 0) {
      console.warn('⚠️ BM25 search: No valid tokens found in query:', query);
      return [];
    }
    
    console.log(`🔍 BM25 search for query: "${query}"`);
    console.log(`📝 Query tokens (${queryTokens.length}): [${queryTokens.join(', ')}]`);
    
    // Analyze token matches in index
    const tokenAnalysis = this.analyzeQueryTokens(queryTokens);
    console.log('🔍 Token analysis:', tokenAnalysis);
    
    const scores = new Map(); // doc_id -> BM25 score
    const scoringDetails = []; // For debugging
    
    // Calculate BM25 score for each document
    for (const [docId, docInfo] of this.documents.entries()) {
      let score = 0;
      const docTermFreq = this.index.get(docId);
      const termScores = {}; // Track individual term contributions
      
      if (!docTermFreq) continue;
      
      let hasAnyMatch = false;
      for (const queryToken of queryTokens) {
        const tf = docTermFreq.get(queryToken) || 0; // term frequency in document
        const df = this.documentFreq.get(queryToken) || 0; // document frequency
        
        if (tf > 0 && df > 0) {
          hasAnyMatch = true;
          // BM25 formula components
          const idf = Math.log((this.totalDocuments - df + 0.5) / (df + 0.5));
          const tfComponent = (tf * (this.options.k1 + 1)) / 
                            (tf + this.options.k1 * (1 - this.options.b + this.options.b * (docInfo.length / this.avgDocLength)));
          
          const termScore = idf * tfComponent;
          score += termScore;
          termScores[queryToken] = {
            tf: tf,
            df: df,
            idf: idf.toFixed(4),
            tfComponent: tfComponent.toFixed(4),
            termScore: termScore.toFixed(4)
          };
        }
      }
      
      if (score >= this.options.minScore) {
        scores.set(docId, score);
        
        // Store scoring details for top documents
        if (hasAnyMatch && scoringDetails.length < 5) {
          scoringDetails.push({
            docId: docId,
            title: docInfo.chunk.metadata?.title?.substring(0, 50) || 'No title',
            finalScore: score.toFixed(4),
            termMatches: Object.keys(termScores).length,
            termScores: termScores,
            searchTextSnippet: docInfo.search_text.substring(0, 100)
          });
        }
      }
    }
    
    // Log detailed scoring analysis
    if (scoringDetails.length > 0) {
      console.log('🔍 BM25 Scoring Details (top matches):');
      scoringDetails.forEach((detail, i) => {
        console.log(`  ${i + 1}. Doc ${detail.docId} (${detail.title}):`);
        console.log(`     Final Score: ${detail.finalScore}, Term Matches: ${detail.termMatches}`);
        console.log(`     Term Scores:`, detail.termScores);
        console.log(`     Text: "${detail.searchTextSnippet}..."`);
      });
    }
    
    // Sort by score and return results
    const results = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([docId, score]) => {
        const docInfo = this.documents.get(docId);
        return {
          id: docId,
          score: score,
          text: docInfo.chunk.text || docInfo.chunk.content, // Dense text for display
          search_text: docInfo.search_text, // Sparse text that matched
          metadata: docInfo.chunk.metadata,
          source: 'bm25'
        };
      });
    
    console.log(`📊 BM25 results: ${results.length} documents, top score: ${results[0]?.score?.toFixed(4) || 'N/A'}`);
    
    // Log final results summary
    if (results.length > 0) {
      console.log('📊 BM25 Final Results Summary:');
      results.slice(0, 3).forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.id} - Score: ${result.score.toFixed(4)} - ${result.metadata?.title?.substring(0, 50) || 'No title'}`);
      });
    } else {
      console.warn('⚠️ BM25 search returned no results above threshold:', this.options.minScore);
    }
    
    return results;
  }
  
  /**
   * Get index statistics
   */
  getStats() {
    return {
      isBuilt: this.isBuilt,
      totalDocuments: this.totalDocuments,
      uniqueTerms: this.documentFreq?.size || 0,
      avgDocLength: this.avgDocLength,
      totalTokens: this.totalTokens,
      options: this.options
    };
  }
  
  /**
   * Enhanced debug method to inspect index for a specific term
   */
  debugTerm(term) {
    if (!this.isBuilt) {
      return { error: 'Index not built' };
    }
    
    const lowerTerm = term.toLowerCase();
    const df = this.documentFreq.get(lowerTerm) || 0;
    const docsWithTerm = [];
    
    for (const [docId, termFreq] of this.index.entries()) {
      const tf = termFreq.get(lowerTerm);
      if (tf && tf > 0) {
        const docInfo = this.documents.get(docId);
        docsWithTerm.push({
          docId,
          termFreq: tf,
          docLength: docInfo.length,
          snippet: docInfo.search_text.substring(0, 100) + '...'
        });
      }
    }
    
    const debugInfo = {
      term: lowerTerm,
      documentFrequency: df,
      totalDocuments: this.totalDocuments,
      idf: df > 0 ? Math.log((this.totalDocuments - df + 0.5) / (df + 0.5)) : 0,
      coverage: df > 0 ? (df / this.totalDocuments * 100).toFixed(1) + '%' : '0%',
      docsWithTerm: docsWithTerm.slice(0, 5) // Show first 5 for debugging
    };
    
    console.log(`🔍 Debug term "${term}":`, debugInfo);
    return debugInfo;
  }
  
  /**
   * Debug a full query to understand tokenization and matching
   */
  debugQuery(query) {
    if (!this.isBuilt) {
      return { error: 'Index not built' };
    }
    
    const tokens = this.tokenize(query);
    const analysis = this.analyzeQueryTokens(tokens);
    
    console.log(`🔍 Full Query Debug for: "${query}"`);
    console.log('Tokenization:', {
      originalQuery: query,
      tokens: tokens,
      tokenCount: tokens.length
    });
    console.log('Token Analysis:', analysis);
    
    // Show which documents would match each token
    const tokenMatches = {};
    tokens.forEach(token => {
      const matchingDocs = [];
      for (const [docId, termFreq] of this.index.entries()) {
        const tf = termFreq.get(token);
        if (tf && tf > 0) {
          const docInfo = this.documents.get(docId);
          matchingDocs.push({
            docId: docId,
            termFreq: tf,
            title: docInfo.chunk.metadata?.title?.substring(0, 50) || 'No title'
          });
        }
      }
      tokenMatches[token] = matchingDocs.slice(0, 3); // Top 3 matches per token
    });
    
    console.log('Token Matches:', tokenMatches);
    
    return {
      query,
      tokens,
      analysis,
      tokenMatches
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLABm25Index;
}
window.NYLABm25Index = NYLABm25Index;