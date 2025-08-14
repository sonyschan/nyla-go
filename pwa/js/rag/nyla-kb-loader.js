/**
 * NYLA Knowledge Base Loader
 * Browser-compatible KB loading from pre-built data
 */

class NYLAKnowledgeBaseLoader {
  constructor() {
    this.kbData = null;
    this.kbIndex = new Map();
    this.loaded = false;
  }

  /**
   * Load pre-built knowledge base data for browser
   */
  async loadKnowledgeBase() {
    if (this.loaded && this.kbData) {
      return this.kbData;
    }

    console.log('📚 Loading pre-built knowledge base...');
    
    try {
      // In browser, we load from the pre-built vector database
      // which contains all the knowledge chunks
      // Use relative path for proper loading in both local and production
      const response = await fetch('data/nyla-vector-db.json');
      if (!response.ok) {
        throw new Error(`Failed to load KB: HTTP ${response.status}`);
      }
      
      const vectorData = await response.json();
      
      // Convert chunks to legacy KB format for compatibility
      this.kbData = this.convertChunksToKnowledgeBase(vectorData.chunks || []);
      
      // Build index for fast lookup
      this.buildIndex(vectorData.chunks || []);
      
      this.loaded = true;
      console.log(`✅ Knowledge base loaded: ${Object.keys(this.kbData).length} categories`);
      
      return this.kbData;
      
    } catch (error) {
      console.error('❌ Failed to load knowledge base:', error);
      // Return minimal fallback KB
      return this.getFallbackKnowledgeBase();
    }
  }

  /**
   * Convert vector DB chunks to legacy KB format
   */
  convertChunksToKnowledgeBase(chunks) {
    const kb = {};
    
    for (const chunk of chunks) {
      const category = chunk.metadata?.category || 'general';
      const section = chunk.metadata?.section || 'info';
      
      if (!kb[category]) {
        kb[category] = {};
      }
      
      if (!kb[category][section]) {
        kb[category][section] = {
          title: chunk.metadata?.title || section,
          body: '',
          summary: '',
          items: []
        };
      }
      
      // Add chunk text to appropriate field
      if (chunk.metadata?.subsection === 'body') {
        kb[category][section].body = chunk.text;
      } else if (chunk.metadata?.subsection === 'summary') {
        kb[category][section].summary = chunk.text;
      } else {
        kb[category][section].items.push({
          text: chunk.text,
          metadata: chunk.metadata
        });
      }
    }
    
    return kb;
  }

  /**
   * Build index for fast chunk lookup
   */
  buildIndex(chunks) {
    this.kbIndex.clear();
    
    for (const chunk of chunks) {
      // Index by ID
      this.kbIndex.set(chunk.id, chunk);
      
      // Index by category
      const category = chunk.metadata?.category;
      if (category) {
        const categoryChunks = this.kbIndex.get(`category:${category}`) || [];
        categoryChunks.push(chunk);
        this.kbIndex.set(`category:${category}`, categoryChunks);
      }
      
      // Index by tags
      const tags = chunk.metadata?.tags || [];
      for (const tag of tags) {
        const tagChunks = this.kbIndex.get(`tag:${tag}`) || [];
        tagChunks.push(chunk);
        this.kbIndex.set(`tag:${tag}`, tagChunks);
      }
    }
  }

  /**
   * Get chunks by category
   */
  getChunksByCategory(category) {
    return this.kbIndex.get(`category:${category}`) || [];
  }

  /**
   * Get chunks by tag
   */
  getChunksByTag(tag) {
    return this.kbIndex.get(`tag:${tag}`) || [];
  }

  /**
   * Search chunks by text
   */
  searchChunks(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [key, value] of this.kbIndex.entries()) {
      if (key.startsWith('category:') || key.startsWith('tag:')) continue;
      
      const chunk = value;
      if (chunk.text && chunk.text.toLowerCase().includes(queryLower)) {
        results.push({
          chunk,
          relevance: this.calculateRelevance(chunk.text, queryLower)
        });
      }
    }
    
    return results.sort((a, b) => b.relevance - a.relevance).map(r => r.chunk);
  }

  /**
   * Simple relevance scoring
   */
  calculateRelevance(text, query) {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match scores highest
    if (textLower === queryLower) return 1.0;
    
    // Count occurrences
    const matches = (textLower.match(new RegExp(queryLower, 'g')) || []).length;
    
    // Score based on matches and position
    const firstIndex = textLower.indexOf(queryLower);
    const positionScore = firstIndex === -1 ? 0 : 1 - (firstIndex / text.length);
    
    return (matches * 0.3) + (positionScore * 0.7);
  }

  /**
   * Get fallback knowledge base
   */
  getFallbackKnowledgeBase() {
    return {
      general: {
        about: {
          title: 'About NYLAGo',
          body: 'NYLAGo is a cryptocurrency command generator for X.com (formerly Twitter). It helps users create transfer, swap, and receive commands for multiple blockchains.',
          summary: 'Cryptocurrency command generator for X.com'
        }
      },
      features: {
        transfer: {
          title: 'Transfer Feature',
          body: 'Generate transfer commands for Solana, Ethereum, and Algorand blockchains to send tokens via X.com posts.',
          summary: 'Send tokens on multiple blockchains'
        },
        swap: {
          title: 'Swap Feature',
          body: 'Create swap commands to exchange tokens within the same blockchain using integrated DEX protocols.',
          summary: 'Swap tokens on-chain'
        },
        receive: {
          title: 'Receive Feature',
          body: 'Generate QR codes for receiving payments on different blockchains.',
          summary: 'Receive payments via QR codes'
        }
      }
    };
  }
}

// Export for browser use
window.NYLAKnowledgeBaseLoader = NYLAKnowledgeBaseLoader;

// Add browser method to NYLAUtils
if (typeof window !== 'undefined' && window.NYLAUtils) {
  window.NYLAUtils.loadKnowledgeBase = async function() {
    const loader = new NYLAKnowledgeBaseLoader();
    return await loader.loadKnowledgeBase();
  };
}