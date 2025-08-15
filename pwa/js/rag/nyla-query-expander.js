/**
 * NYLA Query Expander
 * Expands queries with proper noun aliases and semantic variations
 * Integrates with the RAG pipeline for better multilingual retrieval
 */

class NYLAQueryExpander {
  constructor(glossary = null, options = {}) {
    this.glossary = glossary || new NYLAProperNounGlossary();
    this.options = {
      maxExpansions: 5,
      expandProperNouns: true,
      expandSynonyms: false, // Future: semantic synonyms
      preserveOriginal: true,
      debug: false,
      ...options
    };
    
    this.debug = this.options.debug;
    this.expansionCache = new Map();
  }

  /**
   * Main query expansion entry point
   * @param {string} query - Original query text
   * @param {Object} expansionOptions - Override default options
   * @returns {Promise<Object>} - Expanded query result
   */
  async expandQuery(query, expansionOptions = {}) {
    const options = { ...this.options, ...expansionOptions };
    
    if (this.debug) {
      console.log('🔄 Query Expansion Starting:', { query, options });
    }

    // Check cache first
    const cacheKey = this.getCacheKey(query, options);
    if (this.expansionCache.has(cacheKey)) {
      const cached = this.expansionCache.get(cacheKey);
      if (this.debug) {
        console.log('⚡ Using cached expansion:', cached);
      }
      return cached;
    }

    const result = {
      originalQuery: query,
      expandedQueries: [],
      expansionMethods: [],
      matchedTerms: [],
      hasExpansions: false,
      metadata: {
        processingTime: 0,
        cacheUsed: false
      }
    };

    const startTime = performance.now();

    try {
      // Step 1: Proper noun expansion
      if (options.expandProperNouns) {
        const properNounResult = await this.expandProperNouns(query, options);
        this.mergeExpansionResult(result, properNounResult, 'proper_nouns');
      }

      // Step 2: Future expansions (synonyms, semantic variations)
      if (options.expandSynonyms) {
        // TODO: Implement semantic synonym expansion
        // const synonymResult = await this.expandSynonyms(query, options);
        // this.mergeExpansionResult(result, synonymResult, 'synonyms');
      }

      // Ensure original query is included if preserveOriginal is true
      if (options.preserveOriginal && !result.expandedQueries.includes(query)) {
        result.expandedQueries.unshift(query);
      }

      // Limit total expansions
      if (result.expandedQueries.length > options.maxExpansions) {
        result.expandedQueries = result.expandedQueries.slice(0, options.maxExpansions);
      }

      result.hasExpansions = result.expandedQueries.length > 1 || result.matchedTerms.length > 0;
      result.metadata.processingTime = performance.now() - startTime;

      // Cache the result
      this.expansionCache.set(cacheKey, result);

      if (this.debug) {
        console.log('✅ Query Expansion Complete:', result);
      }

      return result;

    } catch (error) {
      console.error('❌ Query expansion failed:', error);
      
      // Return basic result with just the original query
      result.expandedQueries = [query];
      result.metadata.processingTime = performance.now() - startTime;
      result.metadata.error = error.message;
      
      return result;
    }
  }

  /**
   * Expand query with proper noun aliases
   */
  async expandProperNouns(query, options) {
    const glossaryResult = this.glossary.expandQuery(query, {
      maxExpansions: options.maxExpansions,
      preserveOriginal: options.preserveOriginal
    });

    return {
      expandedQueries: glossaryResult.expandedQueries,
      matchedTerms: glossaryResult.matchedTerms,
      method: 'proper_nouns',
      metadata: {
        glossaryStats: this.glossary.getStats()
      }
    };
  }

  /**
   * Future: Expand query with semantic synonyms
   */
  async expandSynonyms(query, options) {
    // TODO: Implement semantic synonym expansion
    // Could use embedding similarity to find synonymous terms
    // Or integrate with external thesaurus/synonym APIs
    
    return {
      expandedQueries: [query],
      matchedTerms: [],
      method: 'synonyms',
      metadata: {}
    };
  }

  /**
   * Merge expansion results from different methods
   */
  mergeExpansionResult(mainResult, expansionResult, method) {
    // Add unique expanded queries
    for (const expandedQuery of expansionResult.expandedQueries) {
      if (!mainResult.expandedQueries.includes(expandedQuery)) {
        mainResult.expandedQueries.push(expandedQuery);
      }
    }

    // Add matched terms
    mainResult.matchedTerms.push(...expansionResult.matchedTerms);
    
    // Track expansion methods used
    mainResult.expansionMethods.push({
      method,
      queriesAdded: expansionResult.expandedQueries.length,
      termsMatched: expansionResult.matchedTerms.length,
      metadata: expansionResult.metadata || {}
    });
  }

  /**
   * Generate cache key for expansion result
   */
  getCacheKey(query, options) {
    return `${query}|${JSON.stringify({
      maxExpansions: options.maxExpansions,
      expandProperNouns: options.expandProperNouns,
      expandSynonyms: options.expandSynonyms,
      preserveOriginal: options.preserveOriginal
    })}`;
  }

  /**
   * Clear expansion cache
   */
  clearCache() {
    this.expansionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.expansionCache.size,
      keys: Array.from(this.expansionCache.keys()).slice(0, 5) // First 5 keys for debugging
    };
  }

  /**
   * Enable debug logging
   */
  enableDebug() {
    this.debug = true;
    this.options.debug = true;
    if (this.glossary && typeof this.glossary.enableDebug === 'function') {
      this.glossary.enableDebug();
    }
  }

  /**
   * Get expansion statistics
   */
  getStats() {
    return {
      cache: this.getCacheStats(),
      glossary: this.glossary ? this.glossary.getStats() : null,
      options: this.options
    };
  }

  /**
   * Test expansion with a sample query
   */
  async testExpansion(query) {
    console.log(`\n🧪 Testing Query Expansion: "${query}"`);
    console.log('='.repeat(50));
    
    this.enableDebug();
    
    const result = await this.expandQuery(query);
    
    console.log('\n📊 Expansion Results:');
    console.log(`Original: ${result.originalQuery}`);
    console.log(`Expanded (${result.expandedQueries.length}):`);
    result.expandedQueries.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q}`);
    });
    
    console.log(`\n🏷️  Matched Terms (${result.matchedTerms.length}):`);
    result.matchedTerms.forEach(term => {
      console.log(`  - ${term.original} → ${term.primary} (${term.category})`);
    });
    
    console.log(`\n⏱️  Processing Time: ${result.metadata.processingTime.toFixed(2)}ms`);
    
    return result;
  }
}

// Export for both Node.js and Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAQueryExpander;
} else if (typeof window !== 'undefined') {
  window.NYLAQueryExpander = NYLAQueryExpander;
}