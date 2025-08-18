/**
 * NYLA Cross-Encoder Reranker
 * Implements cross-encoder reranking for improved relevance scoring
 */

class NYLACrossEncoder {
  constructor(options = {}) {
    this.options = {
      modelName: 'Xenova/ms-marco-MiniLM-L-6-v2',
      batchSize: 8,
      maxLength: 512,
      useLocalFallback: true,
      fallbackWeight: 0.7,
      ...options
    };
    
    this.initialized = false;
    this.model = null;
    this.useLocalFallback = false;
    
    console.log('🎯 Cross-encoder initialized', {
      model: this.options.modelName,
      batchSize: this.options.batchSize
    });
  }
  
  /**
   * Initialize cross-encoder model (lazy loading)
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🎆 Loading Transformers.js for cross-encoder...');
      
      let pipeline;
      
      // Environment-aware loading (same approach as embedding service)
      if (typeof window === 'undefined') {
        // Node.js environment
        const transformers = await import('@xenova/transformers');
        pipeline = transformers.pipeline;
      } else {
        // Browser environment - use dynamic import to match embedding service
        const transformers = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
        pipeline = transformers.pipeline;
      }
      
      if (pipeline) {
        console.log('🎆 Transformers.js loaded, initializing cross-encoder model...');
        this.model = await pipeline('text-classification', this.options.modelName);
        console.log('✅ Cross-encoder model loaded:', this.options.modelName);
        this.useLocalFallback = false;
      } else {
        throw new Error('Transformers.js pipeline not available');
      }
      
      this.initialized = true;
    } catch (error) {
      console.warn('⚠️ Cross-encoder initialization failed, using fallback:', error.message);
      this.useLocalFallback = true;
      this.initialized = true;
    }
  }
  
  /**
   * Rerank results using cross-encoder scoring
   */
  async rerank(query, results, topK = 15) {
    await this.initialize();
    
    if (!results || results.length === 0) {
      return [];
    }
    
    if (results.length <= topK) {
      // If we have fewer results than topK, just score them all
      return this.scoreResults(query, results);
    }
    
    console.log(`🎯 Cross-encoder reranking ${results.length} results to top ${topK}...`);
    
    try {
      // Score all results
      const scoredResults = await this.scoreResults(query, results);
      
      // Sort by cross-encoder score and return top K
      return scoredResults
        .sort((a, b) => b.crossEncoderScore - a.crossEncoderScore)
        .slice(0, topK)
        .map((result, index) => ({
          ...result,
          crossEncoderRank: index + 1
        }));
        
    } catch (error) {
      console.error('❌ Cross-encoder reranking failed:', error);
      // Fallback to original order
      return results.slice(0, topK);
    }
  }
  
  /**
   * Score results using cross-encoder or fallback method
   */
  async scoreResults(query, results) {
    if (this.model && !this.useLocalFallback) {
      return this.scoreWithModel(query, results);
    } else {
      return this.scoreWithFallback(query, results);
    }
  }
  
  /**
   * Score using actual cross-encoder model
   */
  async scoreWithModel(query, results) {
    const scoredResults = [];
    
    // Process in batches to avoid memory issues
    for (let i = 0; i < results.length; i += this.options.batchSize) {
      const batch = results.slice(i, i + this.options.batchSize);
      
      // FIXED: Use string concatenation instead of object format for transformers.js
      const batchInputs = batch.map(result => {
        const document = result.text || result.content || '';
        return `${query} ${document}`;
      });
      
      try {
        const scores = await this.model(batchInputs);
        
        batch.forEach((result, batchIndex) => {
          const score = scores[batchIndex];
          // Extract relevance score (usually the positive class score)
          const relevanceScore = Array.isArray(score) ? 
            Math.max(...score.map(s => s.score || 0)) : 
            score.score || 0;
            
          scoredResults.push({
            ...result,
            crossEncoderScore: relevanceScore,
            crossEncoderMethod: 'model'
          });
        });
        
      } catch (error) {
        console.warn('⚠️ Batch scoring failed, using fallback for batch:', error);
        // Fallback for this batch
        batch.forEach(result => {
          scoredResults.push({
            ...result,
            crossEncoderScore: this.calculateFallbackScore(query, result),
            crossEncoderMethod: 'fallback'
          });
        });
      }
    }
    
    return scoredResults;
  }
  
  /**
   * Score using fallback method (enhanced similarity calculation)
   */
  scoreWithFallback(query, results) {
    return results.map(result => ({
      ...result,
      crossEncoderScore: this.calculateFallbackScore(query, result),
      crossEncoderMethod: 'fallback'
    }));
  }
  
  /**
   * Calculate fallback score using multiple signals
   */
  calculateFallbackScore(query, result) {
    const text = (result.text || result.content || '').toLowerCase();
    const queryLower = query.toLowerCase();
    
    // 1. Exact phrase matching (40% weight)
    const exactPhraseScore = this.calculateExactPhraseScore(queryLower, text);
    
    // 2. Term overlap score (30% weight)  
    const termOverlapScore = this.calculateTermOverlapScore(queryLower, text);
    
    // 3. Position/proximity score (20% weight)
    const positionScore = this.calculatePositionScore(queryLower, text);
    
    // 4. Use existing similarity if available (10% weight)
    const existingScore = result.finalScore || result.score || 0;
    
    const combinedScore = 
      exactPhraseScore * 0.4 +
      termOverlapScore * 0.3 +
      positionScore * 0.2 +
      existingScore * 0.1;
    
    return Math.min(combinedScore, 1.0); // Cap at 1.0
  }
  
  /**
   * Calculate exact phrase matching score
   */
  calculateExactPhraseScore(query, text) {
    // Check for exact query match
    if (text.includes(query)) {
      return 1.0;
    }
    
    // Check for partial phrase matches
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return 0;
    
    let phraseMatches = 0;
    for (let i = 0; i < queryWords.length - 1; i++) {
      const phrase = queryWords.slice(i, i + 2).join(' ');
      if (text.includes(phrase)) {
        phraseMatches++;
      }
    }
    
    return phraseMatches / Math.max(queryWords.length - 1, 1);
  }
  
  /**
   * Calculate term overlap score with IDF weighting
   */
  calculateTermOverlapScore(query, text) {
    const queryTerms = new Set(query.split(/\s+/).filter(w => w.length > 2));
    const textTerms = new Set(text.split(/\s+/).filter(w => w.length > 2));
    
    if (queryTerms.size === 0) return 0;
    
    const intersection = new Set([...queryTerms].filter(term => textTerms.has(term)));
    return intersection.size / queryTerms.size;
  }
  
  /**
   * Calculate position/proximity score
   */
  calculatePositionScore(query, text) {
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    const positions = [];
    
    queryWords.forEach(word => {
      const index = text.indexOf(word);
      if (index !== -1) {
        positions.push(index);
      }
    });
    
    if (positions.length === 0) return 0;
    if (positions.length === 1) return 0.5;
    
    // Calculate average distance between matched terms
    positions.sort((a, b) => a - b);
    let totalDistance = 0;
    for (let i = 1; i < positions.length; i++) {
      totalDistance += positions[i] - positions[i-1];
    }
    
    const avgDistance = totalDistance / (positions.length - 1);
    // Closer terms get higher score (inverse of distance)
    return Math.max(0, 1 - (avgDistance / 100));
  }
  
  /**
   * Get cross-encoder statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      modelLoaded: !!this.model,
      usingFallback: this.useLocalFallback,
      modelName: this.options.modelName
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLACrossEncoder;
}
window.NYLACrossEncoder = NYLACrossEncoder;