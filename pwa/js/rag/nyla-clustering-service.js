/**
 * NYLA Clustering Service
 * Implements sentence embedding clustering with cosine similarity threshold
 */

class NYLAClusteringService {
  constructor(embeddingService, options = {}) {
    this.embeddingService = embeddingService;
    
    this.options = {
      similarityThreshold: 0.92,    // Cosine similarity threshold for clustering
      minClusterSize: 2,            // Minimum chunks per cluster
      maxClusterSize: 50,           // Maximum chunks per cluster
      algorithm: 'hierarchical',     // 'hierarchical' or 'dbscan'
      linkageType: 'average',       // 'single', 'complete', 'average' for hierarchical
      dbscanEpsilon: 0.08,          // DBSCAN epsilon (1 - similarity threshold)
      dbscanMinPoints: 2,           // DBSCAN minimum points per cluster
      maxClusters: 100,             // Maximum number of clusters to prevent memory issues
      ...options
    };
    
    console.log('🧩 Clustering service initialized', {
      algorithm: this.options.algorithm,
      similarityThreshold: this.options.similarityThreshold,
      minClusterSize: this.options.minClusterSize
    });
  }

  /**
   * Cluster chunks based on embedding similarity
   */
  async clusterChunks(chunks, onProgress) {
    if (!chunks || chunks.length < 2) {
      return {
        clusters: [],
        assignments: new Map(),
        statistics: {
          totalChunks: chunks.length,
          clusteredChunks: 0,
          clusterCount: 0,
          unclustered: chunks.length
        }
      };
    }
    
    console.log(`🧩 Clustering ${chunks.length} chunks...`);
    
    try {
      // Ensure all chunks have embeddings
      const chunksWithEmbeddings = await this.ensureEmbeddings(chunks, onProgress);
      
      // Apply clustering algorithm
      const clusterResult = this.options.algorithm === 'dbscan'
        ? this.applyDBSCAN(chunksWithEmbeddings, onProgress)
        : this.applyHierarchicalClustering(chunksWithEmbeddings, onProgress);
      
      // Post-process clusters
      const processedClusters = this.postProcessClusters(clusterResult, chunksWithEmbeddings);
      
      // Generate cluster assignments map
      const assignments = this.generateAssignments(processedClusters.clusters);
      
      console.log(`✅ Clustering complete: ${processedClusters.clusters.length} clusters from ${chunks.length} chunks`);
      
      return {
        clusters: processedClusters.clusters,
        assignments: assignments,
        statistics: processedClusters.statistics,
        metadata: {
          algorithm: this.options.algorithm,
          threshold: this.options.similarityThreshold,
          processingTime: processedClusters.processingTime
        }
      };
      
    } catch (error) {
      console.error('❌ Clustering failed:', error);
      throw error;
    }
  }

  /**
   * Ensure all chunks have embeddings
   */
  async ensureEmbeddings(chunks, onProgress) {
    const chunksWithEmbeddings = [];
    const missingEmbeddings = [];
    
    // Identify chunks without embeddings
    for (const chunk of chunks) {
      if (chunk.embedding && chunk.embedding.length > 0) {
        chunksWithEmbeddings.push(chunk);
      } else {
        missingEmbeddings.push(chunk);
      }
    }
    
    // Generate missing embeddings
    if (missingEmbeddings.length > 0) {
      console.log(`📊 Generating embeddings for ${missingEmbeddings.length} chunks...`);
      
      for (let i = 0; i < missingEmbeddings.length; i++) {
        const chunk = missingEmbeddings[i];
        try {
          const embedding = await this.embeddingService.embed(chunk.text);
          chunksWithEmbeddings.push({
            ...chunk,
            embedding: embedding
          });
        } catch (error) {
          console.warn(`⚠️ Failed to generate embedding for chunk ${chunk.id}:`, error);
        }
        
        if (onProgress && i % 10 === 0) {
          onProgress({
            stage: 'embeddings',
            current: i + 1,
            total: missingEmbeddings.length,
            percentage: Math.round(((i + 1) / missingEmbeddings.length) * 30)
          });
        }
      }
    }
    
    return chunksWithEmbeddings;
  }

  /**
   * Apply hierarchical clustering
   */
  applyHierarchicalClustering(chunks, onProgress) {
    console.log('🌳 Applying hierarchical clustering...');
    const startTime = Date.now();
    
    // Initialize each chunk as its own cluster
    let clusters = chunks.map((chunk, index) => ({
      id: index,
      chunks: [chunk],
      centroid: [...chunk.embedding],
      size: 1
    }));
    
    const mergeHistory = [];
    const threshold = this.options.similarityThreshold;
    
    // Iteratively merge clusters
    let iteration = 0;
    while (clusters.length > 1 && clusters.length < this.options.maxClusters) {
      iteration++;
      
      // Find the pair of clusters with highest similarity
      let bestSimilarity = -1;
      let bestPair = [-1, -1];
      
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const similarity = this.calculateClusterSimilarity(
            clusters[i],
            clusters[j],
            this.options.linkageType
          );
          
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestPair = [i, j];
          }
        }
      }
      
      // If best similarity is below threshold, stop merging
      if (bestSimilarity < threshold) {
        break;
      }
      
      // Merge the best pair
      const [i, j] = bestPair;
      const mergedCluster = this.mergeClusters(clusters[i], clusters[j]);
      
      // Record merge
      mergeHistory.push({
        iteration: iteration,
        cluster1: clusters[i].id,
        cluster2: clusters[j].id,
        similarity: bestSimilarity,
        newSize: mergedCluster.size
      });
      
      // Remove original clusters and add merged cluster
      const newClusters = clusters.filter((_, index) => index !== i && index !== j);
      newClusters.push(mergedCluster);
      clusters = newClusters;
      
      // Progress reporting
      if (onProgress && iteration % 100 === 0) {
        onProgress({
          stage: 'clustering',
          current: iteration,
          total: chunks.length,
          percentage: 30 + Math.round((iteration / chunks.length) * 40)
        });
      }
      
      // Prevent infinite loops
      if (iteration > chunks.length * 2) {
        console.warn('⚠️ Hierarchical clustering stopped: too many iterations');
        break;
      }
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`🌳 Hierarchical clustering completed in ${processingTime}ms (${iteration} merges)`);
    
    return {
      clusters: clusters,
      mergeHistory: mergeHistory,
      iterations: iteration,
      processingTime: processingTime
    };
  }

  /**
   * Apply DBSCAN clustering
   */
  applyDBSCAN(chunks, onProgress) {
    console.log('🎯 Applying DBSCAN clustering...');
    const startTime = Date.now();
    
    const epsilon = this.options.dbscanEpsilon;
    const minPoints = this.options.dbscanMinPoints;
    
    // Initialize
    const labels = new Array(chunks.length).fill(-1); // -1 = unclassified
    let clusterCount = 0;
    
    // For each point
    for (let i = 0; i < chunks.length; i++) {
      if (labels[i] !== -1) continue; // Already processed
      
      // Find neighbors
      const neighbors = this.findNeighbors(chunks, i, epsilon);
      
      if (neighbors.length < minPoints) {
        labels[i] = -2; // Mark as noise
        continue;
      }
      
      // Start new cluster
      const clusterId = clusterCount++;
      labels[i] = clusterId;
      
      // Expand cluster
      const seedSet = [...neighbors];
      let seedIndex = 0;
      
      while (seedIndex < seedSet.length) {
        const neighborIdx = seedSet[seedIndex];
        seedIndex++;
        
        // Change noise to border point
        if (labels[neighborIdx] === -2) {
          labels[neighborIdx] = clusterId;
        }
        
        // Already processed
        if (labels[neighborIdx] !== -1) continue;
        
        // Add to cluster
        labels[neighborIdx] = clusterId;
        
        // Find neighbors of neighbor
        const neighborNeighbors = this.findNeighbors(chunks, neighborIdx, epsilon);
        
        // If core point, add neighbors to seed set
        if (neighborNeighbors.length >= minPoints) {
          for (const nnIdx of neighborNeighbors) {
            if (!seedSet.includes(nnIdx)) {
              seedSet.push(nnIdx);
            }
          }
        }
      }
      
      // Progress reporting
      if (onProgress && i % 50 === 0) {
        onProgress({
          stage: 'clustering',
          current: i + 1,
          total: chunks.length,
          percentage: 30 + Math.round(((i + 1) / chunks.length) * 40)
        });
      }
    }
    
    // Convert labels to clusters
    const clusterMap = new Map();
    const noisyChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const label = labels[i];
      
      if (label === -2) {
        noisyChunks.push(chunks[i]);
      } else if (label >= 0) {
        if (!clusterMap.has(label)) {
          clusterMap.set(label, []);
        }
        clusterMap.get(label).push(chunks[i]);
      }
    }
    
    // Create cluster objects
    const clusters = Array.from(clusterMap.entries()).map(([id, chunkList]) => ({
      id: id,
      chunks: chunkList,
      centroid: this.calculateCentroid(chunkList),
      size: chunkList.length
    }));
    
    const processingTime = Date.now() - startTime;
    console.log(`🎯 DBSCAN completed in ${processingTime}ms: ${clusters.length} clusters, ${noisyChunks.length} noise points`);
    
    return {
      clusters: clusters,
      noisyChunks: noisyChunks,
      processingTime: processingTime
    };
  }

  /**
   * Find neighbors within epsilon distance
   */
  findNeighbors(chunks, pointIndex, epsilon) {
    const neighbors = [];
    const point = chunks[pointIndex];
    
    for (let i = 0; i < chunks.length; i++) {
      if (i === pointIndex) continue;
      
      const similarity = this.embeddingService.cosineSimilarity(
        point.embedding,
        chunks[i].embedding
      );
      
      const distance = 1 - similarity;
      if (distance <= epsilon) {
        neighbors.push(i);
      }
    }
    
    return neighbors;
  }

  /**
   * Calculate similarity between two clusters
   */
  calculateClusterSimilarity(cluster1, cluster2, linkageType) {
    switch (linkageType) {
      case 'single':
        return this.singleLinkage(cluster1, cluster2);
      case 'complete':
        return this.completeLinkage(cluster1, cluster2);
      case 'average':
      default:
        return this.averageLinkage(cluster1, cluster2);
    }
  }

  /**
   * Single linkage (minimum distance)
   */
  singleLinkage(cluster1, cluster2) {
    let maxSimilarity = -1;
    
    for (const chunk1 of cluster1.chunks) {
      for (const chunk2 of cluster2.chunks) {
        const similarity = this.embeddingService.cosineSimilarity(
          chunk1.embedding,
          chunk2.embedding
        );
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }
    
    return maxSimilarity;
  }

  /**
   * Complete linkage (maximum distance)
   */
  completeLinkage(cluster1, cluster2) {
    let minSimilarity = Infinity;
    
    for (const chunk1 of cluster1.chunks) {
      for (const chunk2 of cluster2.chunks) {
        const similarity = this.embeddingService.cosineSimilarity(
          chunk1.embedding,
          chunk2.embedding
        );
        minSimilarity = Math.min(minSimilarity, similarity);
      }
    }
    
    return minSimilarity;
  }

  /**
   * Average linkage (average distance)
   */
  averageLinkage(cluster1, cluster2) {
    let totalSimilarity = 0;
    let count = 0;
    
    for (const chunk1 of cluster1.chunks) {
      for (const chunk2 of cluster2.chunks) {
        const similarity = this.embeddingService.cosineSimilarity(
          chunk1.embedding,
          chunk2.embedding
        );
        totalSimilarity += similarity;
        count++;
      }
    }
    
    return count > 0 ? totalSimilarity / count : 0;
  }

  /**
   * Merge two clusters
   */
  mergeClusters(cluster1, cluster2) {
    const mergedChunks = [...cluster1.chunks, ...cluster2.chunks];
    const mergedCentroid = this.calculateCentroid(mergedChunks);
    
    return {
      id: `${cluster1.id}_${cluster2.id}`,
      chunks: mergedChunks,
      centroid: mergedCentroid,
      size: mergedChunks.length,
      parent1: cluster1.id,
      parent2: cluster2.id
    };
  }

  /**
   * Calculate centroid of a cluster
   */
  calculateCentroid(chunks) {
    if (chunks.length === 0) return [];
    if (chunks.length === 1) return [...chunks[0].embedding];
    
    const dimension = chunks[0].embedding.length;
    const centroid = new Array(dimension).fill(0);
    
    // Sum all embeddings
    for (const chunk of chunks) {
      for (let i = 0; i < dimension; i++) {
        centroid[i] += chunk.embedding[i];
      }
    }
    
    // Average
    for (let i = 0; i < dimension; i++) {
      centroid[i] /= chunks.length;
    }
    
    return centroid;
  }

  /**
   * Post-process clusters (filter by size, merge small clusters, etc.)
   */
  postProcessClusters(clusterResult, allChunks) {
    let { clusters } = clusterResult;
    const unclustered = [];
    
    // Filter clusters by minimum size
    const validClusters = [];
    for (const cluster of clusters) {
      if (cluster.size >= this.options.minClusterSize && cluster.size <= this.options.maxClusterSize) {
        validClusters.push(cluster);
      } else {
        // Add chunks from too-small clusters to unclustered
        unclustered.push(...cluster.chunks);
      }
    }
    
    // Generate cluster summaries
    const enrichedClusters = validClusters.map((cluster, index) => ({
      ...cluster,
      id: index,
      summary: this.generateClusterSummary(cluster),
      coherenceScore: this.calculateClusterCoherence(cluster),
      topicKeywords: this.extractClusterKeywords(cluster)
    }));
    
    const statistics = {
      totalChunks: allChunks.length,
      clusteredChunks: enrichedClusters.reduce((sum, c) => sum + c.size, 0),
      clusterCount: enrichedClusters.length,
      unclustered: unclustered.length,
      averageClusterSize: enrichedClusters.length > 0 
        ? enrichedClusters.reduce((sum, c) => sum + c.size, 0) / enrichedClusters.length 
        : 0,
      processingTime: clusterResult.processingTime
    };
    
    return {
      clusters: enrichedClusters,
      unclustered: unclustered,
      statistics: statistics,
      processingTime: clusterResult.processingTime
    };
  }

  /**
   * Generate cluster assignments map
   */
  generateAssignments(clusters) {
    const assignments = new Map();
    
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      for (const chunk of cluster.chunks) {
        assignments.set(chunk.id, i);
      }
    }
    
    return assignments;
  }

  /**
   * Generate a summary for a cluster
   */
  generateClusterSummary(cluster) {
    // Extract common themes from chunk texts
    const allTexts = cluster.chunks.map(c => c.text).join(' ');
    const words = allTexts.toLowerCase().match(/\b\w+\b/g) || [];
    
    // Count word frequencies
    const wordFreq = {};
    for (const word of words) {
      if (word.length > 3) { // Skip short words
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }
    
    // Get top words
    const topWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
    
    return {
      size: cluster.size,
      topWords: topWords,
      averageLength: cluster.chunks.reduce((sum, c) => sum + c.text.length, 0) / cluster.size
    };
  }

  /**
   * Calculate cluster coherence score
   */
  calculateClusterCoherence(cluster) {
    if (cluster.chunks.length < 2) return 1.0;
    
    let totalSimilarity = 0;
    let pairCount = 0;
    
    // Calculate average pairwise similarity within cluster
    for (let i = 0; i < cluster.chunks.length; i++) {
      for (let j = i + 1; j < cluster.chunks.length; j++) {
        const similarity = this.embeddingService.cosineSimilarity(
          cluster.chunks[i].embedding,
          cluster.chunks[j].embedding
        );
        totalSimilarity += similarity;
        pairCount++;
      }
    }
    
    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }

  /**
   * Extract topic keywords for a cluster
   */
  extractClusterKeywords(cluster) {
    // Simple keyword extraction based on frequency and cluster-specific terms
    const allTexts = cluster.chunks.map(c => c.text).join(' ');
    const words = allTexts.toLowerCase().match(/\b\w{4,}\b/g) || [];
    
    const wordFreq = {};
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
    
    // Filter by minimum frequency and get top keywords
    const minFreq = Math.max(2, Math.floor(cluster.size * 0.3));
    const keywords = Object.entries(wordFreq)
      .filter(([, freq]) => freq >= minFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
    
    return keywords;
  }

  /**
   * Find similar clusters to a query
   */
  async findSimilarClusters(query, clusterData, topK = 3) {
    if (!clusterData.clusters || clusterData.clusters.length === 0) {
      return [];
    }
    
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingService.embed(query);
      
      // Calculate similarity to each cluster centroid
      const similarities = clusterData.clusters.map(cluster => ({
        cluster: cluster,
        similarity: this.embeddingService.cosineSimilarity(queryEmbedding, cluster.centroid)
      }));
      
      // Sort by similarity and return top K
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      return similarities.slice(0, topK);
      
    } catch (error) {
      console.error('❌ Error finding similar clusters:', error);
      return [];
    }
  }

  /**
   * Get clustering service statistics
   */
  getStats() {
    return {
      algorithm: this.options.algorithm,
      similarityThreshold: this.options.similarityThreshold,
      minClusterSize: this.options.minClusterSize,
      maxClusterSize: this.options.maxClusterSize,
      maxClusters: this.options.maxClusters
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAClusteringService;
}
window.NYLAClusteringService = NYLAClusteringService;