/**
 * NYLA Context Builder
 * Builds optimized context from retrieved chunks for LLM consumption
 */

class NYLAContextBuilder {
  constructor(embeddingService, options = {}) {
    this.embeddingService = embeddingService;
    this.options = {
      maxTokens: 800,              // Maximum context tokens
      maxChunks: 5,                // Maximum number of chunks
      deduplication: true,         // Remove duplicate information
      semanticDeduplication: true, // Use sentence embedding clustering
      cosineThreshold: 0.92,       // Cosine similarity threshold for clustering
      preserveCitations: true,     // Keep source references
      tokenEstimator: 'simple',    // Token counting method
      formatStyle: 'structured',   // Context formatting style
      ...options
    };
    
    // Initialize advanced RAG services
    this.clusteringService = null;
    this.deduplicationService = null;
    this.initializeAdvancedServices();
    
    // Token budgets
    this.tokenBudgets = {
      systemPrompt: 150,
      userQuery: 100,
      context: 600,
      buffer: 50
    };
  }

  /**
   * Initialize advanced RAG services
   */
  initializeAdvancedServices() {
    try {
      // Initialize clustering service with cosine threshold
      if (typeof NYLAClusteringService !== 'undefined') {
        this.clusteringService = new NYLAClusteringService(this.embeddingService, {
          similarityThreshold: this.options.cosineThreshold,
          minClusterSize: 1,  // Allow single-chunk clusters
          algorithm: 'hierarchical'
        });
        console.log('✅ Context Builder: Clustering service initialized');
      } else {
        console.warn('⚠️ Context Builder: NYLAClusteringService not available, falling back to basic deduplication');
      }

      // Initialize deduplication service as backup
      if (typeof NYLADeduplicationService !== 'undefined') {
        this.deduplicationService = new NYLADeduplicationService({
          similarityThreshold: 0.8  // Slightly lower threshold for backup
        });
        console.log('✅ Context Builder: Deduplication service initialized');
      }
    } catch (error) {
      console.warn('⚠️ Context Builder: Failed to initialize advanced services:', error);
    }
  }

  /**
   * Build context from retrieved chunks with optional conversation history
   */
  async buildContext(retrievedChunks, query, options = {}) {
    const config = { ...this.options, ...options };
    
    console.log(`📝 Building context from ${retrievedChunks.length} chunks...`);
    
    try {
      // Deduplicate chunks using advanced semantic clustering if enabled
      let processedChunks = retrievedChunks;
      if (config.deduplication) {
        processedChunks = await this.deduplicateChunksAdvanced(retrievedChunks, query);
      }
      
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
   * Advanced deduplication using two-cap approach with source_id uniqueness
   */
  async deduplicateChunksAdvanced(chunks, query) {
    if (!chunks || chunks.length <= 1) {
      return chunks;
    }

    try {
      console.log(`🧩 Advanced deduplication: Processing ${chunks.length} chunks...`);

      // Step 1: Extract/derive source_id for all chunks
      const chunksWithSourceId = this.ensureSourceIds(chunks);
      
      // Step 2: PRE-CAP - Keep top N_pre=2 per source_id by retrieval score
      const preCappedChunks = this.applyPreCap(chunksWithSourceId, 2);
      console.log(`🧩 Pre-cap: ${chunks.length} → ${preCappedChunks.length} chunks (max 2 per source)`);

      // Step 3: Apply clustering or advanced deduplication on pre-capped set
      let clusteredChunks = preCappedChunks;
      
      if (this.clusteringService && this.options.semanticDeduplication) {
        console.log(`🧩 Using clustering service with cosine threshold ${this.options.cosineThreshold}`);
        
        const clusterResult = await this.clusteringService.clusterChunks(preCappedChunks, (progress) => {
          console.log(`🧩 Clustering progress: ${progress.percentage}%`);
        });

        // Extract best representative from each cluster
        clusteredChunks = [];
        for (const cluster of clusterResult.clusters) {
          const representative = this.selectBestRepresentativeFromCluster(cluster, query);
          if (representative) {
            clusteredChunks.push(representative);
          }
        }

        // Add any unclustered chunks
        if (clusterResult.statistics.unclustered > 0) {
          const unclusteredChunks = preCappedChunks.filter(chunk => 
            !clusterResult.assignments.has(chunk.id)
          );
          clusteredChunks.push(...unclusteredChunks);
        }

        console.log(`🧩 Clustering: ${preCappedChunks.length} → ${clusteredChunks.length} chunks`);
        console.log(`🧩 Clusters created: ${clusterResult.clusters.length}, Unclustered: ${clusterResult.statistics.unclustered}`);
      
      } else if (this.deduplicationService) {
        console.log('🧩 Using deduplication service on pre-capped chunks');
        
        const dedupResult = this.deduplicationService.removeDuplicates(preCappedChunks, (progress) => {
          console.log(`🧩 Deduplication progress: ${progress.percentage}%`);
        });

        clusteredChunks = dedupResult.chunks;
        console.log(`🧩 Hash-based deduplication: ${preCappedChunks.length} → ${clusteredChunks.length} chunks`);
      }

      // Step 4: POST-CAP - Enforce N_post=1 per source_id in final selection
      const finalChunks = this.applyPostCap(clusteredChunks, 1);
      console.log(`🧩 Post-cap: ${clusteredChunks.length} → ${finalChunks.length} chunks (max 1 per source)`);

      console.log(`🧩 ✅ Two-cap deduplication complete: ${chunks.length} → ${finalChunks.length} chunks`);
      
      return finalChunks;

    } catch (error) {
      console.error('🧩 ❌ Advanced deduplication failed:', error);
      console.log('🧩 Falling back to basic deduplication');
      return this.deduplicateChunksBasic(chunks);
    }
  }

  /**
   * Ensure all chunks have source_id with fallback logic
   */
  ensureSourceIds(chunks) {
    const processedChunks = [];
    const unknownSources = new Map(); // Track chunks from same unknown origin

    for (const chunk of chunks) {
      let sourceId = null;
      
      // Method 1: Use existing source_id
      if (chunk.metadata && chunk.metadata.source_id) {
        sourceId = chunk.metadata.source_id;
      }
      
      // Method 2: Derive from URL or file_path
      else if (chunk.metadata && (chunk.metadata.url || chunk.metadata.file_path)) {
        const path = chunk.metadata.url || chunk.metadata.file_path;
        sourceId = this.hashString(path);
      }
      
      // Method 3: Use collection_id + doc_key
      else if (chunk.metadata && chunk.collection_id && chunk.doc_key) {
        sourceId = `${chunk.collection_id}:${chunk.doc_key}`;
      }
      
      // Method 4: Use chunk.id as last resort
      else if (chunk.id) {
        sourceId = chunk.id;
      }
      
      // Method 5: Synthetic grouping for unknown origins
      else {
        const domain = this.extractDomain(chunk.metadata?.url) || 'unknown';
        const syntheticId = `unknown::${domain}`;
        
        if (!unknownSources.has(syntheticId)) {
          unknownSources.set(syntheticId, []);
        }
        unknownSources.get(syntheticId).push(chunk);
        sourceId = syntheticId;
      }
      
      // Add source_id to chunk metadata
      const processedChunk = {
        ...chunk,
        metadata: {
          ...chunk.metadata,
          source_id: sourceId
        }
      };
      
      processedChunks.push(processedChunk);
    }

    console.log(`🧩 Source ID assignment: ${chunks.length} chunks processed`);
    
    return processedChunks;
  }

  /**
   * Apply pre-cap: Keep top N per source_id by retrieval score
   */
  applyPreCap(chunks, maxPerSource) {
    const sourceGroups = new Map();
    
    // Group by source_id
    for (const chunk of chunks) {
      const sourceId = chunk.metadata.source_id;
      if (!sourceGroups.has(sourceId)) {
        sourceGroups.set(sourceId, []);
      }
      sourceGroups.get(sourceId).push(chunk);
    }
    
    // Keep top N from each group
    const preCappedChunks = [];
    let totalRemoved = 0;
    
    for (const [sourceId, sourceChunks] of sourceGroups.entries()) {
      // Sort by priority ranking
      const sortedChunks = this.sortChunksByPriority(sourceChunks);
      const kept = sortedChunks.slice(0, maxPerSource);
      const removed = sortedChunks.length - kept.length;
      
      preCappedChunks.push(...kept);
      totalRemoved += removed;
      
      if (removed > 0) {
        console.log(`🧩 Pre-cap: source ${sourceId} - kept ${kept.length}/${sourceChunks.length} chunks`);
      }
    }
    
    console.log(`🧩 Pre-cap summary: ${sourceGroups.size} sources, removed ${totalRemoved} excess chunks`);
    
    return preCappedChunks;
  }

  /**
   * Apply post-cap: Enforce N per source_id in final selection
   */
  applyPostCap(chunks, maxPerSource) {
    const sourceGroups = new Map();
    
    // Group by source_id
    for (const chunk of chunks) {
      const sourceId = chunk.metadata.source_id;
      if (!sourceGroups.has(sourceId)) {
        sourceGroups.set(sourceId, []);
      }
      sourceGroups.get(sourceId).push(chunk);
    }
    
    // Keep top N from each group
    const postCappedChunks = [];
    let totalRemoved = 0;
    
    for (const [sourceId, sourceChunks] of sourceGroups.entries()) {
      // Sort by priority ranking
      const sortedChunks = this.sortChunksByPriority(sourceChunks);
      const kept = sortedChunks.slice(0, maxPerSource);
      const removed = sortedChunks.length - kept.length;
      
      postCappedChunks.push(...kept);
      totalRemoved += removed;
      
      if (removed > 0) {
        console.log(`🧩 Post-cap: source ${sourceId} - kept ${kept.length}/${sourceChunks.length} chunks`);
      }
    }
    
    console.log(`🧩 Post-cap summary: ${sourceGroups.size} sources, removed ${totalRemoved} excess chunks`);
    
    return postCappedChunks;
  }

  /**
   * Sort chunks by priority ranking: retrieval score → MMR score → token efficiency → metadata richness
   */
  sortChunksByPriority(chunks) {
    return chunks.sort((a, b) => {
      // Priority 1: Highest retrieval score
      const scoreA = a.finalScore !== undefined ? a.finalScore : (a.score || 0);
      const scoreB = b.finalScore !== undefined ? b.finalScore : (b.score || 0);
      
      if (Math.abs(scoreA - scoreB) > 0.001) {
        return scoreB - scoreA; // Higher score wins
      }
      
      // Priority 2: Highest MMR score (if available)
      const mmrA = a.mmrScore || 0;
      const mmrB = b.mmrScore || 0;
      
      if (Math.abs(mmrA - mmrB) > 0.001) {
        return mmrB - mmrA; // Higher MMR score wins
      }
      
      // Priority 3: Shortest that fully answers (lower token cost)
      const tokensA = this.estimateTokens(a.text || '');
      const tokensB = this.estimateTokens(b.text || '');
      
      // Prefer shorter if both are "complete enough" (>50 tokens)
      if (tokensA > 50 && tokensB > 50) {
        return tokensA - tokensB; // Shorter wins
      } else if (tokensA <= 50 && tokensB > 50) {
        return 1; // B wins (more complete)
      } else if (tokensA > 50 && tokensB <= 50) {
        return -1; // A wins (more complete)
      }
      
      // Priority 4: Richer metadata (tiebreaker)
      const metadataCountA = a.metadata ? Object.keys(a.metadata).length : 0;
      const metadataCountB = b.metadata ? Object.keys(b.metadata).length : 0;
      
      return metadataCountB - metadataCountA; // More metadata wins
    });
  }

  /**
   * Hash a string to create stable identifiers
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash)}`;
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return null;
    }
  }

  /**
   * Select best representative from a cluster based on query relevance and quality
   */
  selectBestRepresentativeFromCluster(cluster, query) {
    if (!cluster.chunks || cluster.chunks.length === 0) {
      return null;
    }

    if (cluster.chunks.length === 1) {
      return cluster.chunks[0];
    }

    let bestChunk = null;
    let bestScore = -1;

    for (const chunk of cluster.chunks) {
      let score = 0;

      // Factor 1: Existing retrieval score (40% weight)
      if (chunk.finalScore !== undefined) {
        score += chunk.finalScore * 0.4;
      } else if (chunk.score !== undefined) {
        score += chunk.score * 0.4;
      }

      // Factor 2: Content length and completeness (30% weight)
      const textLength = chunk.text ? chunk.text.length : 0;
      const lengthScore = Math.min(textLength / 500, 1); // Normalize to 0-1, optimal around 500 chars
      score += lengthScore * 0.3;

      // Factor 3: Metadata richness (20% weight)
      const metadataCount = chunk.metadata ? Object.keys(chunk.metadata).length : 0;
      const metadataScore = Math.min(metadataCount / 5, 1); // Normalize to 0-1
      score += metadataScore * 0.2;

      // Factor 4: Query keyword overlap (10% weight)
      if (query && chunk.text) {
        const queryWords = query.toLowerCase().split(/\s+/);
        const chunkText = chunk.text.toLowerCase();
        const matches = queryWords.filter(word => chunkText.includes(word)).length;
        const keywordScore = matches / queryWords.length;
        score += keywordScore * 0.1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestChunk = chunk;
      }
    }

    return bestChunk;
  }

  /**
   * Basic deduplication fallback (keep original logic for compatibility)
   */
  deduplicateChunksBasic(chunks) {
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
    
    console.log(`🔄 Basic deduplicated: ${chunks.length} → ${deduplicated.length} chunks`);
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