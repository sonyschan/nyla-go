/**
 * NYLA Maximum Marginal Relevance (MMR) Reranker
 * Implements MMR algorithm for diverse and relevant result selection
 */

class NYLAMMRReranker {
  constructor(embeddingService, options = {}) {
    this.embeddingService = embeddingService;
    
    this.options = {
      lambda: 0.5,              // Balance between relevance and diversity (0 = diversity only, 1 = relevance only)
      diversityWeight: 0.3,     // Weight for diversity scoring
      maxIterations: 100,       // Maximum iterations to prevent infinite loops
      minSimilarity: 0.1,       // Minimum similarity to consider for selection
      adaptiveLambda: true,     // Adjust lambda based on query type
      ...options
    };
    
    console.log('🎯 MMR Reranker initialized', {
      lambda: this.options.lambda,
      diversityWeight: this.options.diversityWeight,
      adaptiveLambda: this.options.adaptiveLambda
    });
  }

  /**
   * Apply MMR reranking to search results
   */
  async rerank(query, results, topK, options = {}) {
    const config = { ...this.options, ...options };
    
    if (!results || results.length === 0) {
      return [];
    }
    
    if (results.length <= 1) {
      return results;
    }
    
    console.log(`🎯 Applying MMR reranking to ${results.length} results...`);
    
    try {
      // Generate query embedding if not provided
      let queryEmbedding = options.queryEmbedding;
      if (!queryEmbedding) {
        queryEmbedding = await this.embeddingService.embed(query);
      }
      
      // Ensure all results have embeddings
      const resultsWithEmbeddings = await this.ensureEmbeddings(results);
      
      // Detect query intent and adjust lambda if enabled
      const adjustedLambda = config.adaptiveLambda
        ? this.adaptLambda(query, config.lambda)
        : config.lambda;
      
      // Apply MMR algorithm
      const rerankedResults = this.applyMMR(
        queryEmbedding,
        resultsWithEmbeddings,
        topK,
        adjustedLambda
      );
      
      console.log(`✅ MMR reranking complete: selected ${rerankedResults.length} results`);
      
      return rerankedResults;
      
    } catch (error) {
      console.error('❌ MMR reranking failed:', error);
      // Fallback to original results
      return results.slice(0, topK);
    }
  }

  /**
   * Ensure all results have embeddings
   */
  async ensureEmbeddings(results) {
    const resultsWithEmbeddings = [];
    
    for (const result of results) {
      if (result.embedding) {
        resultsWithEmbeddings.push(result);
      } else {
        // Generate embedding for this result
        try {
          const embedding = await this.embeddingService.embed(result.text);
          resultsWithEmbeddings.push({
            ...result,
            embedding: embedding
          });
        } catch (error) {
          console.warn(`⚠️ Failed to generate embedding for result ${result.id}:`, error);
          // Include without embedding (will get lower diversity score)
          resultsWithEmbeddings.push(result);
        }
      }
    }
    
    return resultsWithEmbeddings;
  }

  /**
   * Adapt lambda based on query characteristics
   */
  adaptLambda(query, baseLambda) {
    const queryLower = query.toLowerCase();
    
    // For specific technical queries, prefer relevance over diversity
    const technicalPatterns = [
      /\b(fee|gas|cost|tps|transaction|speed|consensus|algorithm)\b/i,
      /\bhow (to|do)\b/i,
      /\bstep\b/i,
      /\bprocess\b/i
    ];
    
    const isTechnical = technicalPatterns.some(pattern => pattern.test(queryLower));
    if (isTechnical) {
      return Math.min(baseLambda + 0.2, 0.9); // Increase relevance weight
    }
    
    // For general or exploratory queries, prefer more diversity
    const exploratoryPatterns = [
      /\b(what|explain|tell me|describe|overview)\b/i,
      /\b(compare|difference|vs|versus)\b/i,
      /\b(options|choices|alternatives)\b/i
    ];
    
    const isExploratory = exploratoryPatterns.some(pattern => pattern.test(queryLower));
    if (isExploratory) {
      return Math.max(baseLambda - 0.2, 0.1); // Increase diversity weight
    }
    
    return baseLambda;
  }

  /**
   * Core MMR algorithm implementation
   */
  applyMMR(queryEmbedding, results, k, lambda) {
    const selected = [];
    const remaining = [...results];
    
    // Pre-compute relevance scores for all results
    const relevanceScores = this.computeRelevanceScores(queryEmbedding, remaining);
    
    // Select first result (highest relevance)
    let bestIdx = 0;
    let bestScore = relevanceScores[0];
    
    for (let i = 1; i < relevanceScores.length; i++) {
      if (relevanceScores[i] > bestScore) {
        bestScore = relevanceScores[i];
        bestIdx = i;
      }
    }
    
    // Move best result to selected list
    selected.push(remaining.splice(bestIdx, 1)[0]);
    relevanceScores.splice(bestIdx, 1);
    
    // Select remaining k-1 results using MMR
    let iterations = 0;
    while (selected.length < k && remaining.length > 0 && iterations < this.options.maxIterations) {
      iterations++;
      
      let bestMmrScore = -Infinity;
      let bestMmrIdx = -1;
      
      for (let i = 0; i < remaining.length; i++) {
        const result = remaining[i];
        const relevanceScore = relevanceScores[i];
        
        // Calculate diversity score (maximum similarity to already selected)
        const diversityScore = this.calculateDiversityScore(result, selected);
        
        // MMR formula: λ * relevance - (1-λ) * max_similarity_to_selected
        const mmrScore = (lambda * relevanceScore) - ((1 - lambda) * diversityScore);
        
        if (mmrScore > bestMmrScore) {
          bestMmrScore = mmrScore;
          bestMmrIdx = i;
        }
      }
      
      if (bestMmrIdx >= 0 && bestMmrScore >= this.options.minSimilarity) {
        // Move selected result
        const selectedResult = remaining.splice(bestMmrIdx, 1)[0];
        relevanceScores.splice(bestMmrIdx, 1);
        
        // Add MMR score to result metadata
        selectedResult.mmrScore = bestMmrScore;
        selectedResult.mmrRank = selected.length + 1;
        
        selected.push(selectedResult);
      } else {
        // No more suitable results
        break;
      }
    }
    
    console.log(`🔄 MMR selected ${selected.length} results in ${iterations} iterations`);
    
    return selected;
  }

  /**
   * Compute relevance scores for all results
   */
  computeRelevanceScores(queryEmbedding, results) {
    return results.map(result => {
      // Use existing score if available, otherwise compute cosine similarity
      if (result.finalScore !== undefined) {
        return result.finalScore;
      } else if (result.score !== undefined) {
        return result.score;
      } else if (result.embedding) {
        return this.embeddingService.cosineSimilarity(queryEmbedding, result.embedding);
      } else {
        // Fallback for results without embeddings
        return 0.5;
      }
    });
  }

  /**
   * Calculate diversity score (maximum similarity to already selected results)
   */
  calculateDiversityScore(candidate, selectedResults) {
    if (!candidate.embedding || selectedResults.length === 0) {
      return 0; // No diversity penalty if no embedding or no selected results
    }
    
    let maxSimilarity = 0;
    
    for (const selected of selectedResults) {
      if (selected.embedding) {
        const similarity = this.embeddingService.cosineSimilarity(
          candidate.embedding,
          selected.embedding
        );
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }
    
    return maxSimilarity;
  }

  /**
   * Batch MMR reranking for multiple queries
   */
  async rerankBatch(queryResultPairs, options = {}) {
    const config = { ...this.options, ...options };
    const results = [];
    
    console.log(`🎯 Batch MMR reranking for ${queryResultPairs.length} queries...`);
    
    for (let i = 0; i < queryResultPairs.length; i++) {
      const { query, results: queryResults, topK = 5 } = queryResultPairs[i];
      
      try {
        const reranked = await this.rerank(query, queryResults, topK, config);
        results.push({
          query,
          results: reranked,
          originalCount: queryResults.length,
          rerankedCount: reranked.length
        });
      } catch (error) {
        console.error(`❌ Batch reranking failed for query "${query}":`, error);
        results.push({
          query,
          results: queryResults.slice(0, topK),
          error: error.message
        });
      }
    }
    
    console.log(`✅ Batch MMR reranking complete`);
    
    return results;
  }

  /**
   * Advanced MMR with clustering-aware diversity
   */
  async rerankWithClustering(query, results, topK, clusterData, options = {}) {
    const config = { ...this.options, ...options };
    
    if (!clusterData || !clusterData.clusters) {
      // Fallback to standard MMR
      return this.rerank(query, results, topK, config);
    }
    
    console.log(`🎯 Applying cluster-aware MMR reranking...`);
    
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingService.embed(query);
      
      // Group results by cluster
      const clusterGroups = this.groupResultsByClusters(results, clusterData);
      
      // Apply MMR within each cluster first
      const clusterRepresentatives = [];
      for (const [clusterId, clusterResults] of clusterGroups.entries()) {
        if (clusterResults.length > 0) {
          const clusterK = Math.max(1, Math.ceil(topK * clusterResults.length / results.length));
          const clusterMMR = await this.rerank(query, clusterResults, clusterK, {
            ...config,
            lambda: config.lambda + 0.1 // Slightly favor relevance within clusters
          });
          
          // Mark results with cluster info
          clusterMMR.forEach(result => {
            result.clusterId = clusterId;
            result.clusterRank = clusterRepresentatives.length + 1;
          });
          
          clusterRepresentatives.push(...clusterMMR);
        }
      }
      
      // Apply final MMR across cluster representatives
      const finalResults = await this.rerank(query, clusterRepresentatives, topK, {
        ...config,
        lambda: config.lambda - 0.1 // Slightly favor diversity across clusters
      });
      
      console.log(`✅ Cluster-aware MMR complete: ${finalResults.length} results from ${clusterGroups.size} clusters`);
      
      return finalResults;
      
    } catch (error) {
      console.error('❌ Cluster-aware MMR failed:', error);
      return this.rerank(query, results, topK, config);
    }
  }

  /**
   * Group results by their cluster assignments
   */
  groupResultsByClusters(results, clusterData) {
    const clusterGroups = new Map();
    
    for (const result of results) {
      let clusterId = -1; // Default unclustered
      
      // Find cluster assignment for this result
      if (result.clusterId !== undefined) {
        clusterId = result.clusterId;
      } else if (clusterData.assignments && result.id) {
        clusterId = clusterData.assignments.get(result.id) || -1;
      }
      
      if (!clusterGroups.has(clusterId)) {
        clusterGroups.set(clusterId, []);
      }
      clusterGroups.get(clusterId).push(result);
    }
    
    return clusterGroups;
  }

  /**
   * Analyze MMR effectiveness
   */
  analyzeMMREffectiveness(originalResults, mmrResults) {
    const analysis = {
      originalCount: originalResults.length,
      mmrCount: mmrResults.length,
      diversityImprovement: 0,
      relevanceChange: 0,
      positionChanges: []
    };
    
    // Calculate average pairwise similarity before and after
    if (originalResults.length > 1) {
      const originalDiversity = this.calculateAveragePairwiseSimilarity(originalResults);
      const mmrDiversity = this.calculateAveragePairwiseSimilarity(mmrResults);
      analysis.diversityImprovement = originalDiversity - mmrDiversity;
    }
    
    // Track position changes
    for (let i = 0; i < mmrResults.length; i++) {
      const result = mmrResults[i];
      const originalPosition = originalResults.findIndex(r => r.id === result.id);
      if (originalPosition >= 0) {
        analysis.positionChanges.push({
          id: result.id,
          originalPosition: originalPosition,
          mmrPosition: i,
          positionChange: originalPosition - i
        });
      }
    }
    
    return analysis;
  }

  /**
   * Calculate average pairwise similarity in results
   */
  calculateAveragePairwiseSimilarity(results) {
    if (results.length < 2) return 0;
    
    let totalSimilarity = 0;
    let pairCount = 0;
    
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        if (results[i].embedding && results[j].embedding) {
          const similarity = this.embeddingService.cosineSimilarity(
            results[i].embedding,
            results[j].embedding
          );
          totalSimilarity += similarity;
          pairCount++;
        }
      }
    }
    
    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }

  /**
   * Get MMR statistics
   */
  getStats() {
    return {
      lambda: this.options.lambda,
      diversityWeight: this.options.diversityWeight,
      adaptiveLambda: this.options.adaptiveLambda,
      maxIterations: this.options.maxIterations
    };
  }

  /**
   * Update MMR parameters
   */
  updateParameters(newOptions) {
    this.options = { ...this.options, ...newOptions };
    console.log('🎯 MMR parameters updated:', newOptions);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAMMRReranker;
}
window.NYLAMMRReranker = NYLAMMRReranker;