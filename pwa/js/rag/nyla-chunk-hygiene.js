/**
 * NYLA Chunk Hygiene System
 * Enforces chunk sizes, computes hashes, and handles deduplication
 */

class NYLAChunkHygiene {
  constructor(options = {}) {
    this.options = {
      chunkSizeLimits: {
        english: {
          minTokens: 50,
          maxTokens: 300,
          targetTokens: 200
        },
        chinese: {
          minChars: 100,
          maxChars: 500,
          targetChars: 350
        }
      },
      hashAlgorithm: 'SHA-256',
      deduplication: {
        enabled: true,
        groupBySourceId: true,
        keepHighestScore: true
      },
      ...options
    };
    
    this.processedChunks = new Map(); // hash -> chunk
    this.sourceGroups = new Map(); // source_id -> chunks[]
  }

  /**
   * Process and validate chunk according to hygiene rules
   */
  async processChunk(chunk) {
    // 1. Validate required fields
    const validationErrors = this.validateChunkSchema(chunk);
    if (validationErrors.length > 0) {
      console.warn(`⚠️ Chunk validation errors for ${chunk.id}:`, validationErrors);
      return null;
    }
    
    // 2. Enforce chunk size limits
    const sizeValidation = this.validateChunkSize(chunk);
    if (!sizeValidation.valid) {
      console.warn(`⚠️ Chunk size violation for ${chunk.id}:`, sizeValidation.issues);
      // Don't reject, but log for monitoring
    }
    
    // 3. Compute content hash
    const contentHash = await this.computeContentHash(chunk);
    
    // 4. Create processed chunk with hygiene metadata
    const processedChunk = {
      ...chunk,
      _hygiene: {
        contentHash,
        processedAt: new Date().toISOString(),
        sizeValidation,
        tokenCount: this.estimateTokenCount(chunk.body, chunk.lang),
        charCount: chunk.body ? chunk.body.length : 0
      }
    };
    
    // 5. Update hash if not already set
    if (!processedChunk.hash || processedChunk.hash !== contentHash) {
      processedChunk.hash = contentHash;
    }
    
    return processedChunk;
  }

  /**
   * Validate chunk against required schema
   */
  validateChunkSchema(chunk) {
    const errors = [];
    const required = [
      'id', 'source_id', 'type', 'lang', 'title', 'section',
      'tags', 'as_of', 'stability', 'source_url', 'body',
      'summary_en', 'summary_zh'
    ];
    
    for (const field of required) {
      if (!chunk[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Type validation
    if (chunk.tags && !Array.isArray(chunk.tags)) {
      errors.push('tags must be an array');
    }
    
    if (chunk.lang && !['en', 'zh', 'bilingual'].includes(chunk.lang)) {
      errors.push('lang must be: en, zh, or bilingual');
    }
    
    if (chunk.stability && !['stable', 'volatile', 'evolving', 'deprecated'].includes(chunk.stability)) {
      errors.push('stability must be: stable, volatile, evolving, or deprecated');
    }
    
    return errors;
  }

  /**
   * Validate chunk size according to language rules
   */
  validateChunkSize(chunk) {
    const validation = {
      valid: true,
      issues: [],
      metrics: {}
    };
    
    if (!chunk.body) {
      validation.valid = false;
      validation.issues.push('Empty body');
      return validation;
    }
    
    const lang = chunk.lang;
    const body = chunk.body;
    
    if (lang === 'en' || lang === 'bilingual') {
      const tokenCount = this.estimateTokenCount(body, 'en');
      const limits = this.options.chunkSizeLimits.english;
      
      validation.metrics.tokens = tokenCount;
      
      if (tokenCount < limits.minTokens) {
        validation.valid = false;
        validation.issues.push(`Too few tokens: ${tokenCount} < ${limits.minTokens}`);
      }
      
      if (tokenCount > limits.maxTokens) {
        validation.valid = false;
        validation.issues.push(`Too many tokens: ${tokenCount} > ${limits.maxTokens}`);
      }
    }
    
    if (lang === 'zh' || lang === 'bilingual') {
      const charCount = [...body].length; // Handle multi-byte characters
      const limits = this.options.chunkSizeLimits.chinese;
      
      validation.metrics.chars = charCount;
      
      if (charCount < limits.minChars) {
        validation.valid = false;
        validation.issues.push(`Too few characters: ${charCount} < ${limits.minChars}`);
      }
      
      if (charCount > limits.maxChars) {
        validation.valid = false;
        validation.issues.push(`Too many characters: ${charCount} > ${limits.maxChars}`);
      }
    }
    
    return validation;
  }

  /**
   * Compute content hash for chunk
   */
  async computeContentHash(chunk) {
    // Create canonical content string for hashing
    const canonicalContent = [
      chunk.id,
      chunk.source_id,
      chunk.type,
      chunk.title,
      chunk.body,
      chunk.summary_en,
      chunk.summary_zh,
      (chunk.tags || []).sort().join(',')
    ].join('|');
    
    // Use Web Crypto API if available, fallback to simple hash
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(canonicalContent);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (error) {
        console.warn('⚠️ Crypto API failed, using fallback hash:', error);
      }
    }
    
    // Fallback: Simple hash function
    return this.simpleHash(canonicalContent);
  }

  /**
   * Simple hash function fallback
   */
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString(16);
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Estimate token count for text
   */
  estimateTokenCount(text, lang = 'en') {
    if (!text) return 0;
    
    if (lang === 'zh') {
      // For Chinese, roughly 1.5 characters per token
      return Math.ceil([...text].length / 1.5);
    } else {
      // For English, roughly 4 characters per token
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Process batch of chunks with deduplication
   */
  async processChunkBatch(chunks, onProgress) {
    const processedChunks = [];
    const duplicateChunks = [];
    
    console.log(`🧹 Processing ${chunks.length} chunks with hygiene controls...`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        const processedChunk = await this.processChunk(chunk);
        
        if (processedChunk) {
          // Check for duplicates by hash
          if (this.processedChunks.has(processedChunk.hash)) {
            duplicateChunks.push({
              current: processedChunk,
              existing: this.processedChunks.get(processedChunk.hash)
            });
            continue;
          }
          
          // Store processed chunk
          this.processedChunks.set(processedChunk.hash, processedChunk);
          processedChunks.push(processedChunk);
          
          // Group by source_id for later deduplication
          if (!this.sourceGroups.has(processedChunk.source_id)) {
            this.sourceGroups.set(processedChunk.source_id, []);
          }
          this.sourceGroups.get(processedChunk.source_id).push(processedChunk);
        }
        
        if (onProgress) {
          onProgress({
            stage: 'hygiene_processing',
            current: i + 1,
            total: chunks.length,
            percentage: Math.round(((i + 1) / chunks.length) * 100),
            duplicates: duplicateChunks.length
          });
        }
        
      } catch (error) {
        console.error(`❌ Error processing chunk ${chunk.id}:`, error);
      }
    }
    
    console.log(`✅ Hygiene processing complete: ${processedChunks.length} valid, ${duplicateChunks.length} duplicates`);
    
    return {
      processedChunks,
      duplicateChunks,
      stats: this.getHygieneStats()
    };
  }

  /**
   * Post-retrieval deduplication by source_id
   */
  deduplicateRetrievalResults(results) {
    if (!this.options.deduplication.enabled) {
      return results;
    }
    
    // Group results by source_id
    const sourceGroups = new Map();
    
    for (const result of results) {
      const sourceId = result.source_id || result.chunk?.source_id || 'unknown';
      
      if (!sourceGroups.has(sourceId)) {
        sourceGroups.set(sourceId, []);
      }
      sourceGroups.get(sourceId).push(result);
    }
    
    // Keep highest scored result per group
    const deduplicatedResults = [];
    
    for (const [sourceId, groupResults] of sourceGroups.entries()) {
      if (this.options.deduplication.keepHighestScore) {
        // Sort by score (highest first) and take the best
        const sortedResults = groupResults.sort((a, b) => {
          const scoreA = a.final_score || a.cross_encoder_score || a.fusion_score || a.score || 0;
          const scoreB = b.final_score || b.cross_encoder_score || b.fusion_score || b.score || 0;
          return scoreB - scoreA;
        });
        
        deduplicatedResults.push({
          ...sortedResults[0],
          _dedup_info: {
            source_id: sourceId,
            original_count: groupResults.length,
            kept_best_score: true
          }
        });
      } else {
        // Keep all results from this source
        deduplicatedResults.push(...groupResults);
      }
    }
    
    console.log(`🔄 Post-retrieval dedup: ${results.length} → ${deduplicatedResults.length} results`);
    
    return deduplicatedResults;
  }

  /**
   * Get hygiene processing statistics
   */
  getHygieneStats() {
    const stats = {
      totalProcessed: this.processedChunks.size,
      sourceGroups: this.sourceGroups.size,
      avgChunksPerSource: this.processedChunks.size / Math.max(this.sourceGroups.size, 1)
    };
    
    // Size distribution
    const sizes = Array.from(this.processedChunks.values()).map(chunk => 
      chunk._hygiene?.tokenCount || 0
    );
    
    if (sizes.length > 0) {
      stats.sizeStats = {
        min: Math.min(...sizes),
        max: Math.max(...sizes),
        avg: sizes.reduce((sum, size) => sum + size, 0) / sizes.length,
        median: sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)]
      };
    }
    
    return stats;
  }

  /**
   * Clear processed chunks cache
   */
  clearCache() {
    this.processedChunks.clear();
    this.sourceGroups.clear();
    console.log('🧹 Chunk hygiene cache cleared');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAChunkHygiene;
}
window.NYLAChunkHygiene = NYLAChunkHygiene;