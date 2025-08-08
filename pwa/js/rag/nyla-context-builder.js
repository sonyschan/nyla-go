/**
 * NYLA Context Builder
 * Builds optimized context from retrieved chunks for LLM consumption
 */

class NYLAContextBuilder {
  constructor(options = {}) {
    this.options = {
      maxTokens: 800,              // Maximum context tokens
      maxChunks: 5,                // Maximum number of chunks
      deduplication: true,         // Remove duplicate information
      preserveCitations: true,     // Keep source references
      tokenEstimator: 'simple',    // Token counting method
      formatStyle: 'structured',   // Context formatting style
      ...options
    };
    
    // Token budgets
    this.tokenBudgets = {
      systemPrompt: 150,
      userQuery: 100,
      context: 600,
      buffer: 50
    };
  }

  /**
   * Build context from retrieved chunks with optional conversation history
   */
  buildContext(retrievedChunks, query, options = {}) {
    const config = { ...this.options, ...options };
    
    console.log(`📝 Building context from ${retrievedChunks.length} chunks...`);
    
    try {
      // Deduplicate chunks if enabled
      const processedChunks = config.deduplication
        ? this.deduplicateChunks(retrievedChunks)
        : retrievedChunks;
      
      // Build conversation context if available
      let conversationContext = null;
      let conversationTokens = 0;
      if (config.conversationManager) {
        const convResult = config.conversationManager.buildContext(query, {
          maxContextTokens: 250  // Reserve tokens for conversation context
        });
        conversationContext = convResult.context;
        conversationTokens = convResult.metadata.totalTokens;
        
        console.log(`💬 Added conversation context: ${conversationTokens} tokens`);
      }
      
      // Adjust knowledge context budget to account for conversation context
      const knowledgeContextBudget = this.tokenBudgets.context - conversationTokens;
      
      // Rank and select chunks within adjusted token budget
      const selectedChunks = this.selectChunks(
        processedChunks,
        Math.max(knowledgeContextBudget, 300) // Minimum 300 tokens for knowledge
      );
      
      // Format context based on style
      const formattedContext = this.formatContext(selectedChunks, config.formatStyle);
      
      // Build complete prompt with conversation context
      const prompt = this.buildPrompt(formattedContext, query, conversationContext);
      
      // Validate token count
      const tokenCount = this.estimateTokens(prompt.full);
      if (tokenCount > this.options.maxTokens) {
        console.warn(`⚠️ Context exceeds token limit: ${tokenCount} > ${this.options.maxTokens}`);
      }
      
      return {
        context: formattedContext,
        conversationContext,
        prompt: prompt,
        metadata: {
          chunksUsed: selectedChunks.length,
          totalChunks: retrievedChunks.length,
          estimatedTokens: tokenCount,
          conversationTokens,
          sources: this.extractSources(selectedChunks),
          hasConversationContext: !!conversationContext
        }
      };
      
    } catch (error) {
      console.error('❌ Context building failed:', error);
      throw error;
    }
  }

  /**
   * Deduplicate chunks to avoid redundant information
   */
  deduplicateChunks(chunks) {
    const seen = new Set();
    const deduplicated = [];
    
    for (const chunk of chunks) {
      // Create a normalized representation for comparison
      const normalized = this.normalizeForDedup(chunk.text);
      const hash = this.simpleHash(normalized);
      
      // Check for near-duplicates
      let isDuplicate = false;
      for (const seenHash of seen) {
        if (this.areSimilar(hash, seenHash)) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        seen.add(hash);
        deduplicated.push(chunk);
      }
    }
    
    console.log(`🔄 Deduplicated: ${chunks.length} → ${deduplicated.length} chunks`);
    return deduplicated;
  }

  /**
   * Normalize text for deduplication
   */
  normalizeForDedup(text) {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  /**
   * Simple hash function for text
   */
  simpleHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Check if two hashes represent similar content
   */
  areSimilar(hash1, hash2) {
    // For now, just check exact match
    // TODO: Implement fuzzy matching
    return hash1 === hash2;
  }

  /**
   * Select chunks within token budget
   */
  selectChunks(chunks, tokenBudget) {
    const selected = [];
    let currentTokens = 0;
    
    // Sort by score (highest first)
    const sortedChunks = [...chunks].sort((a, b) => b.finalScore - a.finalScore);
    
    for (const chunk of sortedChunks) {
      const chunkTokens = this.estimateTokens(chunk.text);
      
      // Check if adding this chunk would exceed budget
      if (currentTokens + chunkTokens > tokenBudget) {
        // Try to fit a truncated version
        const remainingTokens = tokenBudget - currentTokens;
        if (remainingTokens > 100) { // Minimum useful chunk size
          const truncated = this.truncateToTokens(chunk.text, remainingTokens - 20);
          selected.push({
            ...chunk,
            text: truncated,
            truncated: true
          });
          break;
        }
      } else {
        selected.push(chunk);
        currentTokens += chunkTokens;
        
        // Limit number of chunks
        if (selected.length >= this.options.maxChunks) {
          break;
        }
      }
    }
    
    return selected;
  }

  /**
   * Format context based on style
   */
  formatContext(chunks, style) {
    switch (style) {
      case 'structured':
        return this.formatStructured(chunks);
      case 'conversational':
        return this.formatConversational(chunks);
      case 'minimal':
        return this.formatMinimal(chunks);
      default:
        return this.formatStructured(chunks);
    }
  }

  /**
   * Structured format with clear sections
   */
  formatStructured(chunks) {
    const sections = [];
    
    for (const chunk of chunks) {
      const citation = this.options.preserveCitations
        ? `[Source: ${chunk.metadata.title || chunk.metadata.source}]`
        : '';
      
      sections.push(`${citation}
${chunk.text}${chunk.truncated ? '...' : ''}`);
    }
    
    return sections.join('\n\n---\n\n');
  }

  /**
   * Conversational format
   */
  formatConversational(chunks) {
    const parts = [];
    
    parts.push("Based on my knowledge:");
    
    for (const chunk of chunks) {
      parts.push(`• ${chunk.text}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Minimal format (just the facts)
   */
  formatMinimal(chunks) {
    return chunks.map(c => c.text).join(' ');
  }

  /**
   * Build complete prompt with optional conversation context
   */
  buildPrompt(context, query, conversationContext = null) {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(context, query, conversationContext);
    
    return {
      system: systemPrompt,
      user: userPrompt,
      full: `${systemPrompt}\n\n${userPrompt}`
    };
  }

  /**
   * Build system prompt
   */
  buildSystemPrompt() {
    return `You are NYLA, an AI assistant specializing in cryptocurrency transfers via social media. You help users understand and use the NYLA system for sending tokens on Solana, Ethereum, and Algorand networks.

IMPORTANT RULES:
1. Answer ONLY based on the provided context
2. If the information is not in the context, say "I don't have that information"
3. Be concise and accurate
4. Always clarify that operations work within single blockchains only (no cross-chain)
5. Focus on being helpful and user-friendly`;
  }

  /**
   * Build user prompt with context and optional conversation history
   */
  buildUserPrompt(context, query, conversationContext = null) {
    const sections = [];
    
    // Add conversation context first if available
    if (conversationContext) {
      sections.push(`Conversation Context:
${conversationContext}`);
    }
    
    // Add knowledge context
    sections.push(`Knowledge Base Information:
${context}`);
    
    // Add current user question
    sections.push(`Current Question: ${query}`);
    
    // Add instruction
    const instruction = conversationContext
      ? "Please provide a helpful answer based on the context above, taking into account our previous conversation."
      : "Please provide a helpful answer based only on the context above.";
    
    sections.push(instruction);
    
    return sections.join('\n\n');
  }

  /**
   * Estimate token count
   */
  estimateTokens(text) {
    if (this.options.tokenEstimator === 'simple') {
      // Simple estimation: ~1 token per 4 characters or 0.75 tokens per word
      const charCount = text.length / 4;
      const wordCount = text.split(/\s+/).length * 0.75;
      return Math.ceil(Math.max(charCount, wordCount));
    }
    
    // TODO: Implement more accurate tokenizer
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to approximate token count
   */
  truncateToTokens(text, maxTokens) {
    // Rough approximation
    const maxChars = maxTokens * 4;
    
    if (text.length <= maxChars) {
      return text;
    }
    
    // Try to break at sentence boundary
    const truncated = text.substring(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastPeriod > maxChars * 0.8) {
      return truncated.substring(0, lastPeriod + 1);
    } else if (lastSpace > maxChars * 0.9) {
      return truncated.substring(0, lastSpace);
    }
    
    return truncated;
  }

  /**
   * Extract sources from chunks
   */
  extractSources(chunks) {
    const sources = new Map();
    
    for (const chunk of chunks) {
      const source = chunk.metadata.source || 'unknown';
      const title = chunk.metadata.title || source;
      
      if (!sources.has(source)) {
        sources.set(source, {
          title: title,
          chunks: []
        });
      }
      
      sources.get(source).chunks.push(chunk.id);
    }
    
    return Array.from(sources.entries()).map(([key, value]) => ({
      source: key,
      ...value
    }));
  }

  /**
   * Get context statistics
   */
  getStats(context) {
    return {
      tokenCount: this.estimateTokens(context.prompt.full),
      chunksUsed: context.metadata.chunksUsed,
      sources: context.metadata.sources.length,
      tokenBudgets: this.tokenBudgets
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAContextBuilder;
}
window.NYLAContextBuilder = NYLAContextBuilder;