/**
 * NYLA Semantic Retriever
 * Semantic-first retrieval with minimal high-precision guardrails
 * Replaces rule-based logic with multilingual dense retrieval + cross-encoder rerank
 */

class NYLASemanticRetriever {
  constructor(vectorDB, embeddingService, options = {}) {
    this.vectorDB = vectorDB;
    this.embeddingService = embeddingService;
    
    this.options = {
      topK: 20,              // Dense retrieval top-k
      bm25TopK: 10,          // BM25 top-k (when exact signals detected)
      finalTopK: 8,          // Final results after MMR
      minScore: 0.3,         // Maintain proper quality threshold
      mmrEnabled: true,      // Enable MMR for diversity
      mmrLambda: 0.5,        // Balance relevance vs diversity
      crossEncoderEnabled: false, // TODO: Enable when cross-encoder available
      ...options
    };
    
    // High-precision exact-match patterns (keep these minimal)
    this.exactPatterns = {
      ethAddress: /^0x[a-fA-F0-9]{40}$/,
      ethTxHash: /^0x[a-fA-F0-9]{64}$/,
      solanaAddress: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
      xHandle: /@([A-Za-z0-9_]{1,15})/g,
      ticker: /\$([A-Z0-9]{2,10})\b/g,
      numberWithUnit: /(\d+(?:\.\d+)?)\s*(USD|SOL|ALGO|ETH|%|s|min|hrs?|days?)\b/gi
    };
    
    // Glossary for query expansion (will be loaded from /glossary/terms.json)
    this.glossary = new Map();
    this.loadGlossary();
  }

  /**
   * Load bilingual glossary for query expansion
   */
  async loadGlossary() {
    try {
      const response = await fetch('/glossary/terms.json');
      if (response.ok) {
        const glossaryData = await response.json();
        
        // Build bidirectional term mapping
        for (const [en, translations] of Object.entries(glossaryData)) {
          this.glossary.set(en.toLowerCase(), translations);
          
          // Add reverse mappings (CN -> EN)
          if (translations.zh) {
            for (const zh of translations.zh) {
              if (!this.glossary.has(zh)) {
                this.glossary.set(zh, { en: [en] });
              }
            }
          }
        }
        
        console.log('✅ Loaded glossary with', this.glossary.size, 'term mappings');
      }
    } catch (error) {
      console.warn('⚠️ Could not load glossary:', error.message);
    }
  }

  /**
   * Main retrieval method - semantic-first with minimal guardrails
   */
  async retrieve(query, options = {}) {
    const config = { ...this.options, ...options };
    
    console.log(`🔍 Semantic retrieval for: "${query}"`);
    
    try {
      // 1. QUERY PREP: Detect exact signals & expand via glossary
      const processedQuery = await this.prepareQuery(query);
      
      // 2. RETRIEVE: Dense + BM25 (dynamic weighting)
      const retrievalResults = await this.performRetrieval(processedQuery, config);
      
      // 3. RERANK: Cross-encoder + MMR for diversity
      const rerankedResults = await this.rerankResults(retrievalResults, processedQuery, config);
      
      // 4. FILTER: Metadata gates & deduplication
      const filteredResults = this.applyMetadataFilters(rerankedResults, processedQuery, config);
      
      console.log('📊 Retrieval summary:', {
        query: query,
        hasExactSignals: processedQuery.exactSignals.length > 0,
        denseResults: retrievalResults.dense?.length || 0,
        bm25Results: retrievalResults.bm25?.length || 0,
        finalResults: filteredResults.length,
        topScore: filteredResults[0]?.finalScore?.toFixed(3)
      });
      
      return filteredResults.slice(0, config.finalTopK);
      
    } catch (error) {
      console.error('❌ Semantic retrieval failed:', error);
      throw error;
    }
  }

  /**
   * 1. QUERY PREP: Detect exact signals & expand via glossary
   */
  async prepareQuery(query) {
    // Detect exact signals (addresses, tickers, handles, etc.)
    const exactSignals = this.detectExactSignals(query);
    
    // Expand via glossary (EN↔ZH, no regex trees)
    const expandedQuery = this.expandQueryViaGlossary(query);
    
    // Determine query type from detected signals
    const queryType = this.inferQueryType(exactSignals);
    
    return {
      original: query,
      expanded: expandedQuery,
      exactSignals: exactSignals,
      queryType: queryType,
      needsBM25: exactSignals.length > 0 // Use BM25 when exact signals found
    };
  }

  /**
   * Detect high-precision exact signals
   */
  detectExactSignals(query) {
    const signals = [];
    
    // Ethereum addresses
    if (this.exactPatterns.ethAddress.test(query)) {
      signals.push({ type: 'eth_address', value: query.match(this.exactPatterns.ethAddress)[0] });
    }
    
    // Ethereum transaction hashes
    if (this.exactPatterns.ethTxHash.test(query)) {
      signals.push({ type: 'eth_tx', value: query.match(this.exactPatterns.ethTxHash)[0] });
    }
    
    // Solana addresses
    if (this.exactPatterns.solanaAddress.test(query)) {
      signals.push({ type: 'solana_address', value: query.match(this.exactPatterns.solanaAddress)[0] });
    }
    
    // X handles - optimize: direct iteration without Array.from
    for (const match of query.matchAll(this.exactPatterns.xHandle)) {
      signals.push({ type: 'x_handle', value: match[1] });
    }
    
    // Tickers/symbols - optimize: direct iteration
    for (const match of query.matchAll(this.exactPatterns.ticker)) {
      signals.push({ type: 'ticker', value: match[1] });
    }
    
    // Numbers with units - optimize: direct iteration
    for (const match of query.matchAll(this.exactPatterns.numberWithUnit)) {
      signals.push({ type: 'number_with_unit', value: match[0], number: match[1], unit: match[2] });
    }
    
    return signals;
  }

  /**
   * Expand query via glossary (single-pass, bidirectional)
   */
  expandQueryViaGlossary(query) {
    let expanded = query;
    const words = query.toLowerCase().split(/\s+/);
    const expansions = new Set();
    
    for (const word of words) {
      const cleanWord = word.replace(/[^\w\u4e00-\u9fff]/g, ''); // Keep alphanumeric + Chinese
      
      if (this.glossary.has(cleanWord)) {
        const translations = this.glossary.get(cleanWord);
        
        // Add English translations
        if (translations.en) {
          translations.en.forEach(term => expansions.add(term));
        }
        
        // Add Chinese translations
        if (translations.zh) {
          translations.zh.forEach(term => expansions.add(term));
        }
      }
    }
    
    // Append expansions to original query
    if (expansions.size > 0) {
      expanded = query + ' ' + [...expansions].join(' ');
      console.log('🔄 Query expanded:', { original: query, expanded: expanded });
    }
    
    return expanded;
  }

  /**
   * Infer query type from exact signals
   */
  inferQueryType(exactSignals) {
    if (exactSignals.length === 0) return 'semantic';
    
    const signalTypes = exactSignals.map(s => s.type);
    
    if (signalTypes.includes('eth_address') || signalTypes.includes('solana_address')) {
      return 'integration_support';  // Route to verified integrations
    }
    
    if (signalTypes.includes('ticker') || signalTypes.includes('number_unit')) {
      return 'facts_technical';      // Route to facts/technical specs
    }
    
    if (signalTypes.includes('x_handle')) {
      return 'integration_support';  // Social integration queries
    }
    
    return 'mixed';
  }

  /**
   * 2. RETRIEVE: Dynamic hybrid (dense + BM25 when exact signals present)
   */
  async performRetrieval(processedQuery, config) {
    const results = {};
    
    // Always do dense retrieval with multilingual embeddings
    const denseEmbedding = await this.embeddingService.embed(processedQuery.expanded);
    results.dense = await this.vectorDB.search(denseEmbedding, config.topK);
    
    // Add BM25 when exact signals detected (favor exact matches)
    if (processedQuery.needsBM25 && this.vectorDB.searchBM25) {
      results.bm25 = await this.vectorDB.searchBM25(processedQuery.original, config.bm25TopK);
      
      // Dynamic weighting: higher BM25 weight when exact signals found
      const bm25Weight = Math.min(0.4 + (processedQuery.exactSignals.length * 0.1), 0.8);
      const denseWeight = 1.0 - bm25Weight;
      
      console.log('⚖️ Dynamic hybrid weighting:', { dense: denseWeight, bm25: bm25Weight });
      
      // Merge and dedupe by source_id/hash
      results.merged = this.mergeAndDedupe(results.dense, results.bm25, denseWeight, bm25Weight);
    } else {
      // No BM25, but still need to set finalScore for filtering
      results.merged = results.dense.map(result => ({
        ...result,
        finalScore: result.score, // Copy score to finalScore for filtering
        sources: ['dense']
      }));
      
      console.log('🔍 Dense-only results:', {
        count: results.merged.length,
        topScores: results.merged.slice(0, 2).map(r => ({ id: r.id, finalScore: r.finalScore?.toFixed(4) }))
      });
    }
    
    return results;
  }

  /**
   * Merge dense + BM25 results with dynamic weighting
   */
  mergeAndDedupe(denseResults, bm25Results, denseWeight, bm25Weight) {
    const merged = new Map(); // Dedupe by source_id or content hash
    
    console.log('🔍 Merge Debug - Input:', {
      denseCount: denseResults.length,
      bm25Count: bm25Results.length,
      denseWeight: denseWeight.toFixed(3),
      bm25Weight: bm25Weight.toFixed(3),
      topDenseScores: denseResults.slice(0, 2).map(r => ({ id: r.id, score: r.score?.toFixed(4) }))
    });
    
    // Add dense results
    for (const result of denseResults) {
      const key = result.metadata?.source_id || result.id;
      if (!merged.has(key)) {
        const finalScore = result.score * denseWeight;
        merged.set(key, {
          ...result,
          finalScore: finalScore,
          sources: ['dense']
        });
        
        if (merged.size <= 2) { // Debug first few
          console.log('🔍 Added dense result:', { id: result.id, originalScore: result.score?.toFixed(4), finalScore: finalScore.toFixed(4) });
        }
      }
    }
    
    // Add BM25 results (boost if already exists)
    for (const result of bm25Results || []) {
      const key = result.metadata?.source_id || result.id;
      
      if (merged.has(key)) {
        // Boost existing result
        const existing = merged.get(key);
        existing.finalScore += result.score * bm25Weight;
        existing.sources.push('bm25');
      } else {
        // Add new result
        merged.set(key, {
          ...result,
          finalScore: result.score * bm25Weight,
          sources: ['bm25']
        });
      }
    }
    
    // Return sorted by final score
    // Optimize: collect and sort in single operation
    const sortedResults = [];
    for (const result of merged.values()) {
      sortedResults.push(result);
    }
    sortedResults.sort((a, b) => b.finalScore - a.finalScore);
    
    console.log('🔍 Merge Debug - Output:', {
      mergedCount: sortedResults.length,
      topFinalScores: sortedResults.slice(0, 2).map(r => ({ id: r.id, finalScore: r.finalScore?.toFixed(4) }))
    });
    
    return sortedResults;
  }

  /**
   * 3. RERANK: Cross-encoder + MMR for diversity
   */
  async rerankResults(retrievalResults, processedQuery, config) {
    let results = retrievalResults.merged || retrievalResults.dense;
    
    // TODO: Cross-encoder reranking (when available)
    if (config.crossEncoderEnabled && window.NYLACrossEncoder) {
      console.log('🔄 Applying cross-encoder reranking...');
      const crossEncoder = new window.NYLACrossEncoder();
      results = await crossEncoder.rerank(processedQuery.original, results);
    }
    
    // Apply MMR for diversity
    if (config.mmrEnabled && window.NYLAMMRReranker) {
      try {
        console.log('🔄 Applying MMR for diversity...');
        const mmrReranker = new window.NYLAMMRReranker(this.embeddingService, {
          lambda: config.mmrLambda
        });
        results = await mmrReranker.rerank(processedQuery.original, results, config.finalTopK * 2);
      } catch (error) {
        console.warn('⚠️ MMR reranking failed, using original results:', error);
      }
    }
    
    return results;
  }

  /**
   * 4. FILTER: Metadata gates & volatile chunk downweighting
   */
  applyMetadataFilters(results, processedQuery, config) {
    console.log('🔍 Filtering Debug - Input:', {
      resultsCount: results.length,
      queryType: processedQuery.queryType,
      minScore: config.minScore,
      topScores: results.slice(0, 3).map(r => ({ id: r.id, score: r.finalScore?.toFixed(4) }))
    });

    const filtered = results.filter(result => {
      // Route support/compatibility queries to verified integrations
      if (processedQuery.queryType === 'integration_support') {
        const metadata = result.metadata || {};
        if (metadata.type === 'integration') {
          // Only include verified and live/beta integrations
          if (!metadata.verified || !['beta', 'live'].includes(metadata.status)) {
            console.log('🚫 Filtered unverified integration:', result.id);
            return false;
          }
        }
      }
      
      // Exclude marketing/campaigns for technical queries by default
      if (processedQuery.queryType === 'facts_technical') {
        if (result.metadata?.excludeFromTech === true) {
          console.log('🚫 Filtered marketing content:', result.id);
          return false;
        }
      }
      
      // Downweight stale volatile chunks (but don't exclude completely)
      if (result.metadata?.volatile === true && result.metadata?.as_of) {
        const asOfDate = new Date(result.metadata.as_of);
        const daysSinceUpdate = (Date.now() - asOfDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate > 7) {
          result.finalScore *= 0.5; // Reduce score for stale volatile content
          console.log('📉 Downweighted stale volatile chunk:', result.id, `(${daysSinceUpdate.toFixed(1)} days old)`);
        }
      }
      
      // Apply minimum score threshold with debugging
      const passesThreshold = result.finalScore >= config.minScore;
      if (!passesThreshold) {
        console.log('🚫 Filtered by score threshold:', { 
          id: result.id, 
          score: result.finalScore?.toFixed(4), 
          threshold: config.minScore,
          title: result.metadata?.title 
        });
      }
      
      return passesThreshold;
    }).sort((a, b) => b.finalScore - a.finalScore);

    console.log('🔍 Filtering Debug - Output:', {
      originalCount: results.length,
      filteredCount: filtered.length,
      removedCount: results.length - filtered.length
    });

    return filtered;
  }

  /**
   * Get retrieval statistics
   */
  getStats() {
    return {
      type: 'semantic',
      exactPatternsCount: Object.keys(this.exactPatterns).length,
      glossarySize: this.glossary.size,
      minScore: this.options.minScore,
      mmrEnabled: this.options.mmrEnabled,
      topK: this.options.topK
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLASemanticRetriever;
}
window.NYLASemanticRetriever = NYLASemanticRetriever;