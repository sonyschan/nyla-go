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
    
    // Second pass: Extract Chinese terms - more conservative approach
    // Focus on meaningful Chinese terms rather than single characters
    const chineseChars = text.match(/[\u4e00-\u9fff]+/g) || [];
    
    for (const chineseStr of chineseChars) {
      // Add the full Chinese string if it's meaningful (2-8 characters)
      if (chineseStr.length >= 2 && chineseStr.length <= 8) {
        tokens.push(chineseStr);
      }
      
      // Add Chinese bi-grams for better matching
      if (chineseStr.length >= 2) {
        for (let i = 0; i < chineseStr.length - 1; i++) {
          const bigram = chineseStr.slice(i, i + 2);
          tokens.push(bigram);
        }
      }
      
      // Only add individual characters for very short strings (1-2 chars)
      if (chineseStr.length <= 2) {
        for (const char of chineseStr) {
          tokens.push(char);
        }
      }
    }
    
    // Remove duplicates and return
    return [...new Set(tokens)];
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
      return [];
    }
    
    console.log(`🔍 BM25 search for query: "${query}"`);
    console.log(`📝 Query tokens: [${queryTokens.join(', ')}]`);
    
    const scores = new Map(); // doc_id -> BM25 score
    
    // Calculate BM25 score for each document
    for (const [docId, docInfo] of this.documents.entries()) {
      let score = 0;
      const docTermFreq = this.index.get(docId);
      
      if (!docTermFreq) continue;
      
      for (const queryToken of queryTokens) {
        const tf = docTermFreq.get(queryToken) || 0; // term frequency in document
        const df = this.documentFreq.get(queryToken) || 0; // document frequency
        
        if (tf > 0 && df > 0) {
          // BM25 formula components
          const idf = Math.log((this.totalDocuments - df + 0.5) / (df + 0.5));
          const tfComponent = (tf * (this.options.k1 + 1)) / 
                            (tf + this.options.k1 * (1 - this.options.b + this.options.b * (docInfo.length / this.avgDocLength)));
          
          score += idf * tfComponent;
        }
      }
      
      if (score >= this.options.minScore) {
        scores.set(docId, score);
      }
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
   * Debug method to inspect index for a specific term
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
    
    return {
      term: lowerTerm,
      documentFrequency: df,
      totalDocuments: this.totalDocuments,
      idf: df > 0 ? Math.log((this.totalDocuments - df + 0.5) / (df + 0.5)) : 0,
      docsWithTerm: docsWithTerm.slice(0, 5) // Show first 5 for debugging
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLABm25Index;
}
window.NYLABm25Index = NYLABm25Index;