/**
 * NYLA Knowledge Chunker
 * Splits knowledge base into semantic chunks for vector embedding
 */

class NYLAKnowledgeChunker {
  constructor(options = {}) {
    this.options = {
      minChunkSize: 200,      // Minimum tokens per chunk
      maxChunkSize: 400,      // Maximum tokens per chunk
      overlapSize: 50,        // Token overlap between chunks
      tokenizer: 'simple',    // Tokenization method
      ...options
    };
    
    this.chunkId = 0;
    this.chunks = [];
  }

  /**
   * Process entire knowledge base into chunks
   */
  async processKnowledgeBase(knowledgeBase) {
    console.log('📦 Starting knowledge base chunking...');
    this.chunks = [];
    this.chunkId = 0;
    
    // Process each major section
    for (const [sectionKey, section] of Object.entries(knowledgeBase)) {
      if (section && section.content) {
        await this.processSection(sectionKey, section.content, section);
      }
    }
    
    console.log(`✅ Chunking complete: ${this.chunks.length} chunks created`);
    return this.chunks;
  }

  /**
   * Process a knowledge base section
   */
  async processSection(sectionKey, content, metadata = {}) {
    // Handle different content structures
    if (typeof content === 'string') {
      // Simple string content
      this.createChunksFromText(content, {
        source: sectionKey,
        section: sectionKey,
        title: this.generateTitle(sectionKey),
        ...metadata
      });
    } else if (Array.isArray(content)) {
      // Array content (e.g., features, questions)
      for (const item of content) {
        const text = typeof item === 'string' ? item : JSON.stringify(item);
        this.createChunksFromText(text, {
          source: sectionKey,
          section: sectionKey,
          title: this.generateTitle(sectionKey),
          type: 'list_item',
          ...metadata
        });
      }
    } else if (typeof content === 'object') {
      // Nested object content
      for (const [subKey, subContent] of Object.entries(content)) {
        await this.processSection(
          `${sectionKey}.${subKey}`,
          subContent,
          {
            source: sectionKey,
            section: `${sectionKey}.${subKey}`,
            parent: sectionKey,
            ...metadata
          }
        );
      }
    }
  }

  /**
   * Create chunks from text content
   */
  createChunksFromText(text, metadata) {
    // Skip empty or very short text
    if (!text || text.trim().length < 50) return;
    
    // Normalize text
    const normalizedText = this.normalizeText(text);
    
    // Split into sentences
    const sentences = this.splitIntoSentences(normalizedText);
    
    // Group sentences into chunks
    let currentChunk = [];
    let currentTokenCount = 0;
    
    for (const sentence of sentences) {
      const sentenceTokens = this.countTokens(sentence);
      
      // Check if adding this sentence would exceed max size
      if (currentTokenCount + sentenceTokens > this.options.maxChunkSize && currentChunk.length > 0) {
        // Save current chunk
        this.saveChunk(currentChunk, metadata);
        
        // Start new chunk with overlap
        const overlapSentences = this.getOverlapSentences(currentChunk);
        currentChunk = [...overlapSentences, sentence];
        currentTokenCount = this.countTokens(currentChunk.join(' '));
      } else {
        currentChunk.push(sentence);
        currentTokenCount += sentenceTokens;
      }
    }
    
    // Save final chunk if it meets minimum size
    if (currentTokenCount >= this.options.minChunkSize) {
      this.saveChunk(currentChunk, metadata);
    }
  }

  /**
   * Save a chunk with metadata
   */
  saveChunk(sentences, metadata) {
    const text = sentences.join(' ').trim();
    const tokenCount = this.countTokens(text);
    
    // Generate tags from content
    const tags = this.extractTags(text, metadata);
    
    const chunk = {
      id: `kb_chunk_${String(this.chunkId).padStart(4, '0')}`,
      text: text,
      metadata: {
        ...metadata,
        tags: tags,
        source_url: `internal://knowledge-base#${metadata.source}`,
        updated_at: new Date().toISOString(),
        token_count: tokenCount,
        chunk_index: this.chunkId,
        chunk_type: this.classifyChunkType(text, metadata)
      }
    };
    
    this.chunks.push(chunk);
    this.chunkId++;
  }

  /**
   * Normalize text for consistency
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/["""]/g, '"')         // Normalize quotes
      .replace(/['']/g, "'")          // Normalize apostrophes
      .replace(/\n+/g, ' ')           // Replace newlines with spaces
      .replace(/\s*[•·▪▫◦‣⁃]\s*/g, '. ') // Convert bullet points
      .trim();
  }

  /**
   * Split text into sentences
   */
  splitIntoSentences(text) {
    // Enhanced sentence splitter
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // Clean and filter sentences
    return sentences
      .map(s => s.trim())
      .filter(s => s.length > 20) // Remove very short sentences
      .filter(s => /[a-z]/i.test(s)); // Must contain letters
  }

  /**
   * Simple token counter (approximate)
   */
  countTokens(text) {
    // Rough approximation: ~1 token per 4 characters or 0.75 tokens per word
    const charCount = text.length / 4;
    const wordCount = text.split(/\s+/).length * 0.75;
    return Math.ceil(Math.max(charCount, wordCount));
  }

  /**
   * Get overlap sentences for continuity
   */
  getOverlapSentences(sentences) {
    const overlapTokens = this.options.overlapSize;
    const overlap = [];
    let tokenCount = 0;
    
    // Add sentences from end until we reach overlap size
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i];
      const tokens = this.countTokens(sentence);
      
      if (tokenCount + tokens <= overlapTokens) {
        overlap.unshift(sentence);
        tokenCount += tokens;
      } else {
        break;
      }
    }
    
    return overlap;
  }

  /**
   * Extract relevant tags from content
   */
  extractTags(text, metadata) {
    const tags = new Set();
    
    // Add section-based tags
    if (metadata.source) {
      tags.add(metadata.source.toLowerCase());
    }
    if (metadata.section) {
      metadata.section.split('.').forEach(part => {
        tags.add(part.toLowerCase());
      });
    }
    
    // Extract blockchain mentions
    const blockchains = ['solana', 'ethereum', 'algorand'];
    blockchains.forEach(chain => {
      if (text.includes(chain)) {
        tags.add(chain);
      }
    });
    
    // Extract feature mentions
    const features = ['transfer', 'swap', 'qr code', 'raid', 'fees', 'wallet'];
    features.forEach(feature => {
      if (text.includes(feature)) {
        tags.add(feature);
      }
    });
    
    // Extract technical terms
    const technicalTerms = ['proof of stake', 'proof of history', 'gas', 'tps', 'transaction'];
    technicalTerms.forEach(term => {
      if (text.includes(term)) {
        tags.add(term.replace(/\s+/g, '_'));
      }
    });
    
    return Array.from(tags);
  }

  /**
   * Classify chunk type for better retrieval
   */
  classifyChunkType(text, metadata) {
    // Detect question-answer pairs
    if (text.includes('?') && text.includes('.')) {
      return 'qa_pair';
    }
    
    // Detect technical specifications
    if (text.match(/\d+\s*(tps|transactions|fees?|%)/i)) {
      return 'technical_spec';
    }
    
    // Detect how-to content
    if (text.match(/^(how to|to \w+|step \d|first|then|finally)/i)) {
      return 'how_to';
    }
    
    // Detect feature descriptions
    if (metadata.source && metadata.source.includes('features')) {
      return 'feature';
    }
    
    // Detect blockchain info
    if (metadata.tags && metadata.tags.some(tag => ['solana', 'ethereum', 'algorand'].includes(tag))) {
      return 'blockchain_info';
    }
    
    return 'general';
  }

  /**
   * Generate human-readable title from section key
   */
  generateTitle(sectionKey) {
    return sectionKey
      .split(/[._]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Export chunks to JSON
   */
  exportChunks() {
    return {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      chunk_count: this.chunks.length,
      config: this.options,
      chunks: this.chunks
    };
  }

  /**
   * Get statistics about chunks
   */
  getStatistics() {
    const stats = {
      total_chunks: this.chunks.length,
      avg_chunk_size: 0,
      min_chunk_size: Infinity,
      max_chunk_size: 0,
      chunk_types: {},
      tags_frequency: {}
    };
    
    this.chunks.forEach(chunk => {
      const size = chunk.metadata.token_count;
      stats.avg_chunk_size += size;
      stats.min_chunk_size = Math.min(stats.min_chunk_size, size);
      stats.max_chunk_size = Math.max(stats.max_chunk_size, size);
      
      // Count chunk types
      const type = chunk.metadata.chunk_type;
      stats.chunk_types[type] = (stats.chunk_types[type] || 0) + 1;
      
      // Count tag frequency
      chunk.metadata.tags.forEach(tag => {
        stats.tags_frequency[tag] = (stats.tags_frequency[tag] || 0) + 1;
      });
    });
    
    stats.avg_chunk_size = Math.round(stats.avg_chunk_size / this.chunks.length);
    
    return stats;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAKnowledgeChunker;
}
window.NYLAKnowledgeChunker = NYLAKnowledgeChunker;