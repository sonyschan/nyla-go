/**
 * NYLA Parent-Child Aggregator
 * Maps child chunks back to parent blocks for fuller context
 */

class NYLAParentChildAggregator {
  constructor(options = {}) {
    this.options = {
      maxParentTokens: 1200,      // Target parent block size
      minParentTokens: 600,       // Minimum parent block size
      multiHitBonus: 0.1,         // Bonus for multiple child hits
      maxMultiHitBonus: 0.3,      // Maximum multi-hit bonus
      scoreAggregationMethod: 'max_plus_mean', // 'max', 'mean', 'max_plus_mean'
      adjacentChunkExpansion: 2,   // ±N chunks for neighbor expansion
      ...options
    };
    
    console.log('🏗️ Parent-Child Aggregator initialized', {
      maxParentTokens: this.options.maxParentTokens,
      scoreMethod: this.options.scoreAggregationMethod
    });
  }
  
  /**
   * Aggregate child chunks into parent blocks
   */
  async aggregateToParents(childResults, topK = 3) {
    if (!childResults || childResults.length === 0) {
      return [];
    }
    
    console.log(`🏗️ Aggregating ${childResults.length} child chunks to ${topK} parent blocks...`);
    
    // Group chunks by parent identifier
    const parentGroups = this.groupByParent(childResults);
    
    // Score and rank parent groups
    const scoredParents = this.scoreParentGroups(parentGroups);
    
    // Select top K parents
    const topParents = scoredParents
      .sort((a, b) => b.aggregatedScore - a.aggregatedScore)
      .slice(0, topK);
    
    // Build parent blocks with full context
    const parentBlocks = await this.buildParentBlocks(topParents);
    
    console.log(`✅ Built ${parentBlocks.length} parent blocks from ${Object.keys(parentGroups).length} parent groups`);
    
    return parentBlocks;
  }
  
  /**
   * Group child chunks by parent identifier
   */
  groupByParent(childResults) {
    const groups = new Map();
    
    for (const child of childResults) {
      const parentId = this.getParentId(child);
      
      if (!groups.has(parentId)) {
        groups.set(parentId, []);
      }
      groups.get(parentId).push(child);
    }
    
    console.log(`📊 Grouped into ${groups.size} parent groups:`, 
      Array.from(groups.entries()).map(([id, children]) => `${id}: ${children.length} chunks`)
    );
    
    return groups;
  }
  
  /**
   * Get parent identifier for a chunk
   */
  getParentId(chunk) {
    // Priority order for parent identification:
    // 1. Explicit parent_chunk metadata
    // 2. Section + source combination
    // 3. Source + category combination
    // 4. Fallback to chunk id itself
    
    if (chunk.metadata?.parent_chunk) {
      return chunk.metadata.parent_chunk;
    }
    
    if (chunk.metadata?.section && chunk.metadata?.source) {
      return `${chunk.metadata.source}:${chunk.metadata.section}`;
    }
    
    if (chunk.metadata?.source && chunk.metadata?.category) {
      return `${chunk.metadata.category}:${chunk.metadata.source}`;
    }
    
    // Fallback: treat as its own parent
    return chunk.id || `chunk_${Date.now()}_${Math.random()}`;
  }
  
  /**
   * Score parent groups based on child scores and multi-hit bonus
   */
  scoreParentGroups(parentGroups) {
    const scoredParents = [];
    
    for (const [parentId, children] of parentGroups.entries()) {
      const scores = children.map(child => 
        child.crossEncoderScore || child.finalScore || child.score || 0
      );
      
      let aggregatedScore;
      
      switch (this.options.scoreAggregationMethod) {
        case 'max':
          aggregatedScore = Math.max(...scores);
          break;
        case 'mean':
          aggregatedScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          break;
        case 'max_plus_mean':
        default:
          const maxScore = Math.max(...scores);
          const meanScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          aggregatedScore = (maxScore * 0.7) + (meanScore * 0.3);
          break;
      }
      
      // Apply multi-hit bonus
      const multiHitBonus = Math.min(
        (children.length - 1) * this.options.multiHitBonus,
        this.options.maxMultiHitBonus
      );
      
      const finalScore = Math.min(aggregatedScore + multiHitBonus, 1.0);
      
      scoredParents.push({
        parentId,
        children,
        childCount: children.length,
        aggregatedScore: finalScore,
        baseScore: aggregatedScore,
        multiHitBonus,
        topChildScore: Math.max(...scores),
        avgChildScore: scores.reduce((sum, s) => sum + s, 0) / scores.length
      });
    }
    
    return scoredParents;
  }
  
  /**
   * Build full parent blocks with expanded context
   */
  async buildParentBlocks(topParents) {
    const parentBlocks = [];
    
    for (const parent of topParents) {
      try {
        const block = await this.buildSingleParentBlock(parent);
        if (block) {
          parentBlocks.push(block);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to build parent block for ${parent.parentId}:`, error);
        // Fallback: use largest child chunk
        const largestChild = parent.children.reduce((largest, child) => 
          (child.tokens || 0) > (largest.tokens || 0) ? child : largest
        );
        
        parentBlocks.push({
          ...largestChild,
          parentId: parent.parentId,
          isParentBlock: true,
          childCount: parent.children.length,
          aggregatedScore: parent.aggregatedScore,
          parentBuildMethod: 'fallback_largest_child'
        });
      }
    }
    
    return parentBlocks;
  }
  
  /**
   * Build a single parent block with full context
   */
  async buildSingleParentBlock(parent) {
    const { parentId, children, aggregatedScore } = parent;
    
    // Sort children by chunk position/order
    const sortedChildren = this.sortChildrenByPosition(children);
    
    // Try to build contiguous block
    const contiguousBlock = this.buildContiguousBlock(sortedChildren);
    
    if (contiguousBlock && this.isValidParentSize(contiguousBlock)) {
      return {
        id: `parent_${parentId}`,
        text: contiguousBlock.text,
        tokens: contiguousBlock.tokens,
        parentId,
        isParentBlock: true,
        childCount: children.length,
        aggregatedScore,
        finalScore: aggregatedScore,
        parentBuildMethod: 'contiguous',
        metadata: this.mergeChildMetadata(children),
        childChunks: children.map(c => ({
          id: c.id,
          score: c.crossEncoderScore || c.finalScore || c.score || 0,
          position: c.metadata?.chunk_part || 0
        }))
      };
    }
    
    // Fallback: concatenate top scoring children
    return this.buildConcatenatedBlock(parent);
  }
  
  /**
   * Sort children by their position in the parent document
   */
  sortChildrenByPosition(children) {
    return children.sort((a, b) => {
      // Use chunk_part if available
      const posA = a.metadata?.chunk_part || 0;
      const posB = b.metadata?.chunk_part || 0;
      
      if (posA !== posB) {
        return posA - posB;
      }
      
      // Fallback to score
      const scoreA = a.crossEncoderScore || a.finalScore || a.score || 0;
      const scoreB = b.crossEncoderScore || b.finalScore || b.score || 0;
      return scoreB - scoreA;
    });
  }
  
  /**
   * Build contiguous block from sorted children
   */
  buildContiguousBlock(sortedChildren) {
    if (sortedChildren.length === 0) return null;
    
    // For chunks with overlap, we need to merge carefully
    const mergedText = [];
    const mergedTokens = [];
    let totalTokens = 0;
    
    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      const childText = child.text || '';
      const childTokens = child.tokens || this.estimateTokens(childText);
      
      if (i === 0) {
        // First chunk: include entirely
        mergedText.push(childText);
        totalTokens += childTokens;
      } else {
        // Subsequent chunks: check for overlap and merge
        const prevChild = sortedChildren[i - 1];
        const overlapRemoved = this.removeOverlap(prevChild.text, childText);
        
        if (overlapRemoved) {
          mergedText.push(overlapRemoved);
          totalTokens += this.estimateTokens(overlapRemoved);
        }
      }
      
      // Stop if we exceed target size
      if (totalTokens > this.options.maxParentTokens) {
        break;
      }
    }
    
    return {
      text: mergedText.join(' '),
      tokens: totalTokens
    };
  }
  
  /**
   * Remove overlap between consecutive chunks
   */
  removeOverlap(prevText, currentText) {
    // Simple overlap detection: find common ending/beginning
    const prevSentences = prevText.split(/[.!?]+/).filter(s => s.trim());
    const currentSentences = currentText.split(/[.!?]+/).filter(s => s.trim());
    
    if (prevSentences.length === 0 || currentSentences.length === 0) {
      return currentText;
    }
    
    // Find overlap by comparing last sentences of prev with first sentences of current
    let overlapStart = 0;
    const maxOverlapCheck = Math.min(3, prevSentences.length, currentSentences.length);
    
    for (let i = 1; i <= maxOverlapCheck; i++) {
      const prevEnding = prevSentences.slice(-i);
      const currentBeginning = currentSentences.slice(0, i);
      
      if (prevEnding.some((sent, idx) => 
        sent.trim().toLowerCase() === currentBeginning[idx]?.trim().toLowerCase())) {
        overlapStart = i;
      }
    }
    
    // Return current text with overlap removed
    if (overlapStart > 0) {
      return currentSentences.slice(overlapStart).join('. ');
    }
    
    return currentText;
  }
  
  /**
   * Build concatenated block as fallback
   */
  buildConcatenatedBlock(parent) {
    const { parentId, children, aggregatedScore } = parent;
    
    // Take top scoring children up to token limit
    const sortedByScore = children.sort((a, b) => 
      (b.crossEncoderScore || b.finalScore || b.score || 0) - 
      (a.crossEncoderScore || a.finalScore || a.score || 0)
    );
    
    const selectedTexts = [];
    let totalTokens = 0;
    
    for (const child of sortedByScore) {
      const childText = child.text || '';
      const childTokens = child.tokens || this.estimateTokens(childText);
      
      if (totalTokens + childTokens <= this.options.maxParentTokens) {
        selectedTexts.push(childText);
        totalTokens += childTokens;
      } else {
        break;
      }
    }
    
    return {
      id: `parent_${parentId}`,
      text: selectedTexts.join('\n\n---\n\n'),
      tokens: totalTokens,
      parentId,
      isParentBlock: true,
      childCount: children.length,
      aggregatedScore,
      finalScore: aggregatedScore,
      parentBuildMethod: 'concatenated',
      metadata: this.mergeChildMetadata(children),
      childChunks: children.map(c => ({
        id: c.id,
        score: c.crossEncoderScore || c.finalScore || c.score || 0
      }))
    };
  }
  
  /**
   * Check if parent block size is valid
   */
  isValidParentSize(block) {
    return block.tokens >= this.options.minParentTokens && 
           block.tokens <= this.options.maxParentTokens;
  }
  
  /**
   * Merge metadata from child chunks
   */
  mergeChildMetadata(children) {
    const merged = {};
    const firstChild = children[0];
    
    // Copy common metadata from first child
    if (firstChild.metadata) {
      Object.assign(merged, firstChild.metadata);
    }
    
    // Collect unique tags, sources, etc.
    const allTags = new Set();
    const sources = new Set();
    
    children.forEach(child => {
      if (child.metadata?.tags) {
        child.metadata.tags.forEach(tag => allTags.add(tag));
      }
      if (child.metadata?.source) {
        sources.add(child.metadata.source);
      }
    });
    
    merged.tags = Array.from(allTags);
    merged.sources = Array.from(sources);
    merged.child_count = children.length;
    
    return merged;
  }
  
  /**
   * Simple token estimation
   */
  estimateTokens(text) {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }
  
  /**
   * Get aggregation statistics
   */
  getStats() {
    return {
      maxParentTokens: this.options.maxParentTokens,
      minParentTokens: this.options.minParentTokens,
      scoreMethod: this.options.scoreAggregationMethod,
      multiHitBonus: this.options.multiHitBonus
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAParentChildAggregator;
}
window.NYLAParentChildAggregator = NYLAParentChildAggregator;