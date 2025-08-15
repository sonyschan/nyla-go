/**
 * NYLA Proper Noun Glossary
 * Handles cross-lingual aliases and proper noun variations for RAG query expansion
 */

class NYLAProperNounGlossary {
  constructor() {
    this.glossary = this.initializeGlossary();
    this.reverseIndex = this.buildReverseIndex();
    this.debug = false;
  }

  /**
   * Initialize the proper noun glossary with all known aliases
   */
  initializeGlossary() {
    return {
      // Blockchain Projects & Tokens
      "wangchai": {
        "zh": ["旺柴"],
        "en": ["WangChai", "Wang-Chai", "Wang Chai", "WangChaidotbonk"],
        "variants": ["$旺柴", "WANGCHAI", "wangchai", "Wangchai"],
        "social": ["@WangChaidotbonk"],
        "category": "project",
        "primary": "WangChai (旺柴)"
      },
      
      "nyla": {
        "zh": ["NYLA", "奈拉"],
        "en": ["NYLA", "Agent NYLA", "AgentNyla"],
        "variants": ["$NYLA", "NYLA", "nyla"],
        "social": ["@AgentNyla"],
        "category": "project", 
        "primary": "NYLA"
      },
      
      "nylago": {
        "zh": ["NYLAGo", "奈拉Go"],
        "en": ["NYLAGo", "NYLA Go", "NYLAgo", "NylaGo"],
        "variants": ["nylago", "NYLAGO"],
        "category": "tool",
        "primary": "NYLAGo"
      },
      
      // Blockchain Networks
      "solana": {
        "zh": ["索拉纳", "Solana"],
        "en": ["Solana", "SOL"],
        "variants": ["solana", "SOLANA", "$SOL"],
        "category": "network",
        "primary": "Solana"
      },
      
      "ethereum": {
        "zh": ["以太坊", "Ethereum"],
        "en": ["Ethereum", "ETH"],
        "variants": ["ethereum", "ETHEREUM", "$ETH"],
        "category": "network", 
        "primary": "Ethereum"
      },
      
      "algorand": {
        "zh": ["阿尔戈兰德", "Algorand"],
        "en": ["Algorand", "ALGO"],
        "variants": ["algorand", "ALGORAND", "$ALGO"],
        "category": "network",
        "primary": "Algorand"
      },
      
      // Key Team Members & Handles
      "shax": {
        "zh": ["shax"],
        "en": ["shax", "shax_btc"],
        "variants": ["@shax_btc", "SHAX"],
        "social": ["@shax_btc"],
        "category": "person",
        "primary": "@shax_btc"
      },
      
      "btcberries": {
        "zh": ["btcberries"],
        "en": ["btcberries", "berries"],
        "variants": ["@btcberries", "BTCBERRIES"],
        "social": ["@btcberries"],
        "category": "person",
        "primary": "@btcberries"
      },
      
      "chiefz": {
        "zh": ["ChiefZ"],
        "en": ["ChiefZ", "Chief Z", "ChiefZ_SOL"],
        "variants": ["@ChiefZ_SOL", "CHIEFZ"],
        "social": ["@ChiefZ_SOL"],
        "category": "person",
        "primary": "@ChiefZ_SOL"
      },
      
      "noir": {
        "zh": ["Noir"],
        "en": ["Noir", "Noir0883"],
        "variants": ["@Noir0883", "NOIR"],
        "social": ["@Noir0883"],
        "category": "person",
        "primary": "@Noir0883"
      },
      
      // Popular Meme/DeFi Tokens
      "bonk": {
        "zh": ["BONK", "邦克"],
        "en": ["BONK", "bonk"],
        "variants": ["$BONK", "bonk", "BONK"],
        "category": "token",
        "primary": "BONK"
      },
      
      // Technical Terms
      "ama": {
        "zh": ["AMA", "问答", "问我任何事"],
        "en": ["AMA", "Ask Me Anything", "Ask-Me-Anything"],
        "variants": ["ama", "ASK ME ANYTHING"],
        "category": "event",
        "primary": "AMA"
      },
      
      "dex": {
        "zh": ["DEX", "去中心化交易所"],
        "en": ["DEX", "Decentralized Exchange", "decentralized exchange"],
        "variants": ["dex", "DeX"],
        "category": "protocol",
        "primary": "DEX"
      },
      
      // Geographic/Cultural Terms
      "chinese": {
        "zh": ["中文", "中国", "华人", "华语"],
        "en": ["Chinese", "China", "Mandarin"],
        "variants": ["chinese", "CHINESE", "中文市场"],
        "category": "language",
        "primary": "Chinese"
      }
    };
  }

  /**
   * Build reverse index for fast lookup
   */
  buildReverseIndex() {
    const index = new Map();
    
    for (const [key, entry] of Object.entries(this.glossary)) {
      // Add the primary key
      index.set(key.toLowerCase(), key);
      
      // Add all variants
      const allVariants = [
        ...(entry.zh || []),
        ...(entry.en || []),
        ...(entry.variants || []),
        ...(entry.social || [])
      ];
      
      for (const variant of allVariants) {
        const normalized = this.normalizeText(variant);
        index.set(normalized, key);
        
        // Also add without special characters for handles
        if (variant.startsWith('@')) {
          index.set(normalized.slice(1), key);
        }
        
        // Add without $ for tokens
        if (variant.startsWith('$')) {
          index.set(normalized.slice(1), key);
        }
      }
    }
    
    return index;
  }

  /**
   * Normalize text for consistent matching
   */
  normalizeText(text) {
    return text.toLowerCase()
      .trim()
      .replace(/[_-]/g, '')  // Remove underscores and hyphens
      .replace(/\s+/g, '');  // Remove spaces
  }

  /**
   * Expand query with proper noun aliases
   * @param {string} query - Original query text
   * @param {Object} options - Expansion options
   * @returns {Object} - Expanded query information
   */
  expandQuery(query, options = {}) {
    const {
      maxExpansions = 5,
      includeCategories = null, // Filter by category
      preserveOriginal = true,
      addWeights = false
    } = options;

    if (this.debug) {
      console.log('🔍 Proper Noun Expansion Input:', query);
    }

    const expansions = new Set();
    const matchedTerms = [];
    
    if (preserveOriginal) {
      expansions.add(query);
    }

    // Find all proper nouns in the query
    const foundMatches = this.findProperNouns(query);
    
    for (const match of foundMatches) {
      const { term, key, positions } = match;
      const entry = this.glossary[key];
      
      // Filter by category if specified
      if (includeCategories && !includeCategories.includes(entry.category)) {
        continue;
      }
      
      matchedTerms.push({
        original: term,
        key,
        category: entry.category,
        primary: entry.primary,
        positions
      });

      // Add all alias variations
      const aliases = [
        ...(entry.zh || []),
        ...(entry.en || []),
        ...(entry.variants || [])
      ];

      for (const alias of aliases) {
        if (alias.toLowerCase() !== term.toLowerCase()) {
          // Create expanded query by replacing the term
          const expandedQuery = this.replaceTermInQuery(query, term, alias, positions);
          expansions.add(expandedQuery);
          
          if (expansions.size >= maxExpansions) break;
        }
      }
      
      if (expansions.size >= maxExpansions) break;
    }

    const result = {
      originalQuery: query,
      expandedQueries: Array.from(expansions),
      matchedTerms,
      hasExpansions: matchedTerms.length > 0
    };

    if (this.debug) {
      console.log('✨ Proper Noun Expansion Result:', result);
    }

    return result;
  }

  /**
   * Find all proper nouns in the query text
   */
  findProperNouns(query) {
    const found = [];
    const queryLower = query.toLowerCase();
    
    // Sort by length (longest first) to handle overlapping matches properly
    const sortedEntries = Object.entries(this.glossary)
      .map(([key, entry]) => ({
        key,
        entry,
        allTerms: [
          key,
          ...(entry.zh || []),
          ...(entry.en || []),
          ...(entry.variants || []),
          ...(entry.social || [])
        ]
      }))
      .flatMap(({ key, entry, allTerms }) => 
        allTerms.map(term => ({ key, entry, term }))
      )
      .sort((a, b) => b.term.length - a.term.length);

    const usedPositions = new Set();

    for (const { key, entry, term } of sortedEntries) {
      const termLower = term.toLowerCase();
      let startIndex = 0;
      
      while (startIndex < queryLower.length) {
        const index = queryLower.indexOf(termLower, startIndex);
        
        if (index === -1) break;
        
        const endIndex = index + termLower.length;
        
        // Check if this position is already used by a longer match
        let positionUsed = false;
        for (let i = index; i < endIndex; i++) {
          if (usedPositions.has(i)) {
            positionUsed = true;
            break;
          }
        }
        
        if (!positionUsed) {
          // Mark positions as used
          for (let i = index; i < endIndex; i++) {
            usedPositions.add(i);
          }
          
          found.push({
            term: query.substring(index, endIndex),
            key,
            category: entry.category,
            positions: { start: index, end: endIndex }
          });
        }
        
        startIndex = index + 1;
      }
    }

    return found.sort((a, b) => a.positions.start - b.positions.start);
  }

  /**
   * Replace a specific term in query while preserving context
   */
  replaceTermInQuery(query, oldTerm, newTerm, positions) {
    const { start, end } = positions;
    return query.substring(0, start) + newTerm + query.substring(end);
  }

  /**
   * Get glossary entry for a term
   */
  getEntry(term) {
    const key = this.reverseIndex.get(this.normalizeText(term));
    return key ? this.glossary[key] : null;
  }

  /**
   * Get all aliases for a term
   */
  getAllAliases(term) {
    const entry = this.getEntry(term);
    if (!entry) return [];
    
    return [
      ...(entry.zh || []),
      ...(entry.en || []),
      ...(entry.variants || []),
      ...(entry.social || [])
    ];
  }

  /**
   * Enable debug logging
   */
  enableDebug() {
    this.debug = true;
  }

  /**
   * Get statistics about the glossary
   */
  getStats() {
    const entries = Object.keys(this.glossary).length;
    const totalAliases = Object.values(this.glossary)
      .reduce((sum, entry) => {
        return sum + 
          (entry.zh || []).length + 
          (entry.en || []).length + 
          (entry.variants || []).length + 
          (entry.social || []).length;
      }, 0);
    
    const categories = [...new Set(
      Object.values(this.glossary).map(entry => entry.category)
    )];

    return {
      entries,
      totalAliases,
      categories,
      reverseIndexSize: this.reverseIndex.size
    };
  }
}

// Export for both Node.js and Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAProperNounGlossary;
} else if (typeof window !== 'undefined') {
  window.NYLAProperNounGlossary = NYLAProperNounGlossary;
}