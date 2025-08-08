/**
 * NYLA Advanced Deduplication Service
 * Implements shingle hashing with MinHash/SimHash for duplicate detection
 */

class NYLADeduplicationService {
  constructor(options = {}) {
    this.options = {
      shingleSize: 3,           // N-gram size for shingles
      minHashPermutations: 128,  // Number of hash functions for MinHash
      simHashBits: 64,          // Bit length for SimHash
      similarityThreshold: 0.8, // Threshold for duplicate detection
      fingerprintBits: 16,      // Bits for locality sensitive hashing
      ...options
    };
    
    // Pre-computed random coefficients for MinHash
    this.minHashCoeffs = this.generateMinHashCoeffs();
    
    // Cache for computed hashes
    this.hashCache = new Map();
    
    console.log('🔍 Deduplication service initialized', {
      shingleSize: this.options.shingleSize,
      minHashPermutations: this.options.minHashPermutations,
      simHashBits: this.options.simHashBits
    });
  }

  /**
   * Generate coefficients for MinHash functions
   */
  generateMinHashCoeffs() {
    const coeffs = [];
    const prime = 2147483647; // Large prime number
    
    for (let i = 0; i < this.options.minHashPermutations; i++) {
      coeffs.push({
        a: Math.floor(Math.random() * prime),
        b: Math.floor(Math.random() * prime)
      });
    }
    
    return coeffs;
  }

  /**
   * Generate shingles (n-grams) from text
   */
  generateShingles(text, size = this.options.shingleSize) {
    const normalized = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = normalized.split(' ');
    const shingles = new Set();
    
    // Word-based shingles
    for (let i = 0; i <= words.length - size; i++) {
      const shingle = words.slice(i, i + size).join(' ');
      shingles.add(shingle);
    }
    
    // Character-based shingles for shorter texts
    if (words.length < size * 2) {
      const chars = normalized.replace(/\s/g, '');
      for (let i = 0; i <= chars.length - size; i++) {
        shingles.add(chars.substring(i, i + size));
      }
    }
    
    return shingles;
  }

  /**
   * Compute 32-bit hash for a string using FNV-1a algorithm
   */
  fnvHash(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash *= 16777619;
      hash = hash >>> 0; // Convert to unsigned 32-bit
    }
    return hash;
  }

  /**
   * Compute MinHash signature for a set of shingles
   */
  computeMinHash(shingles) {
    const signature = new Array(this.options.minHashPermutations).fill(Infinity);
    
    for (const shingle of shingles) {
      const baseHash = this.fnvHash(shingle);
      
      // Apply each hash function
      for (let i = 0; i < this.options.minHashPermutations; i++) {
        const coeff = this.minHashCoeffs[i];
        const hash = ((coeff.a * baseHash + coeff.b) % 2147483647) >>> 0;
        
        if (hash < signature[i]) {
          signature[i] = hash;
        }
      }
    }
    
    return signature;
  }

  /**
   * Compute SimHash for text using weighted features
   */
  computeSimHash(text) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordFreq = {};
    
    // Count word frequencies
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
    
    // Generate feature vector
    const vector = new Array(this.options.simHashBits).fill(0);
    
    for (const [word, freq] of Object.entries(wordFreq)) {
      const hash = this.fnvHash(word);
      const weight = Math.log(1 + freq); // TF weighting
      
      // Apply each bit of the hash
      for (let i = 0; i < this.options.simHashBits; i++) {
        const bit = (hash >>> i) & 1;
        vector[i] += bit ? weight : -weight;
      }
    }
    
    // Convert to binary hash
    let simHash = 0n;
    for (let i = 0; i < this.options.simHashBits; i++) {
      if (vector[i] > 0) {
        simHash |= 1n << BigInt(i);
      }
    }
    
    return simHash;
  }

  /**
   * Calculate Jaccard similarity between two MinHash signatures
   */
  jaccardSimilarity(sig1, sig2) {
    if (sig1.length !== sig2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < sig1.length; i++) {
      if (sig1[i] === sig2[i]) matches++;
    }
    
    return matches / sig1.length;
  }

  /**
   * Calculate Hamming distance between SimHash values
   */
  hammingDistance(hash1, hash2) {
    const xor = hash1 ^ hash2;
    let distance = 0;
    let temp = xor;
    
    // Count set bits
    while (temp > 0n) {
      if (temp & 1n) distance++;
      temp >>= 1n;
    }
    
    return distance;
  }

  /**
   * Calculate similarity from Hamming distance
   */
  simHashSimilarity(hash1, hash2) {
    const distance = this.hammingDistance(hash1, hash2);
    return 1 - (distance / this.options.simHashBits);
  }

  /**
   * Generate locality-sensitive hash fingerprint for fast clustering
   */
  generateFingerprint(minHashSig) {
    // Use first few hash values as fingerprint
    const fingerprintSize = Math.min(this.options.fingerprintBits, minHashSig.length);
    let fingerprint = 0;
    
    for (let i = 0; i < fingerprintSize; i++) {
      if (minHashSig[i] % 2 === 0) {
        fingerprint |= (1 << i);
      }
    }
    
    return fingerprint;
  }

  /**
   * Process a single chunk to generate all hash signatures
   */
  processChunk(chunk) {
    const cacheKey = `${chunk.id}_${this.options.shingleSize}`;
    
    // Check cache first
    if (this.hashCache.has(cacheKey)) {
      return this.hashCache.get(cacheKey);
    }
    
    try {
      const shingles = this.generateShingles(chunk.text);
      
      if (shingles.size === 0) {
        console.warn(`⚠️ No shingles generated for chunk ${chunk.id}`);
        return null;
      }
      
      const minHashSig = this.computeMinHash(shingles);
      const simHash = this.computeSimHash(chunk.text);
      const fingerprint = this.generateFingerprint(minHashSig);
      
      const result = {
        id: chunk.id,
        shingleCount: shingles.size,
        minHashSignature: minHashSig,
        simHash: simHash,
        fingerprint: fingerprint,
        textLength: chunk.text.length
      };
      
      // Cache result
      this.hashCache.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Error processing chunk ${chunk.id}:`, error);
      return null;
    }
  }

  /**
   * Find duplicates in a batch of chunks using multiple hash methods
   */
  findDuplicates(chunks, onProgress) {
    console.log(`🔍 Finding duplicates in ${chunks.length} chunks...`);
    
    const processed = [];
    const fingerprintGroups = new Map();
    
    // Step 1: Process all chunks and group by fingerprint
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const hashData = this.processChunk(chunk);
      
      if (hashData) {
        processed.push({ chunk, hashData });
        
        // Group by fingerprint for fast clustering
        const fp = hashData.fingerprint;
        if (!fingerprintGroups.has(fp)) {
          fingerprintGroups.set(fp, []);
        }
        fingerprintGroups.get(fp).push({ chunk, hashData });
      }
      
      if (onProgress && i % 50 === 0) {
        onProgress({
          stage: 'hashing',
          current: i + 1,
          total: chunks.length,
          percentage: Math.round(((i + 1) / chunks.length) * 50)
        });
      }
    }
    
    // Step 2: Find duplicates within and across fingerprint groups
    const duplicateGroups = [];
    const processedIds = new Set();
    
    // Check within fingerprint groups (high probability of similarity)
    for (const [fingerprint, group] of fingerprintGroups.entries()) {
      if (group.length > 1) {
        const groupDuplicates = this.findDuplicatesInGroup(group);
        duplicateGroups.push(...groupDuplicates);
        
        // Mark as processed
        for (const dupGroup of groupDuplicates) {
          for (const item of dupGroup) {
            processedIds.add(item.chunk.id);
          }
        }
      }
    }
    
    // Step 3: Cross-group comparison for remaining chunks (lower threshold)
    const remaining = processed.filter(p => !processedIds.has(p.chunk.id));
    if (remaining.length > 1) {
      const crossGroupDups = this.findCrossGroupDuplicates(remaining);
      duplicateGroups.push(...crossGroupDups);
    }
    
    if (onProgress) {
      onProgress({
        stage: 'complete',
        current: chunks.length,
        total: chunks.length,
        percentage: 100
      });
    }
    
    console.log(`✅ Found ${duplicateGroups.length} duplicate groups`);
    
    return {
      duplicateGroups: duplicateGroups,
      totalChunks: chunks.length,
      uniqueChunks: chunks.length - duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0),
      fingerprintGroups: fingerprintGroups.size
    };
  }

  /**
   * Find duplicates within a fingerprint group
   */
  findDuplicatesInGroup(group) {
    const duplicateGroups = [];
    const used = new Set();
    
    for (let i = 0; i < group.length; i++) {
      if (used.has(i)) continue;
      
      const current = group[i];
      const duplicateGroup = [current];
      used.add(i);
      
      // Compare with remaining items in group
      for (let j = i + 1; j < group.length; j++) {
        if (used.has(j)) continue;
        
        const other = group[j];
        
        // Use both MinHash and SimHash for robust detection
        const jaccardSim = this.jaccardSimilarity(
          current.hashData.minHashSignature,
          other.hashData.minHashSignature
        );
        
        const simHashSim = this.simHashSimilarity(
          current.hashData.simHash,
          other.hashData.simHash
        );
        
        // Combined similarity score
        const combinedSim = (jaccardSim * 0.6) + (simHashSim * 0.4);
        
        if (combinedSim >= this.options.similarityThreshold) {
          duplicateGroup.push(other);
          used.add(j);
        }
      }
      
      // Only add groups with actual duplicates
      if (duplicateGroup.length > 1) {
        duplicateGroups.push(duplicateGroup);
      }
    }
    
    return duplicateGroups;
  }

  /**
   * Find duplicates across different fingerprint groups
   */
  findCrossGroupDuplicates(remaining) {
    const duplicateGroups = [];
    const used = new Set();
    
    // Use lower threshold for cross-group comparison
    const crossGroupThreshold = this.options.similarityThreshold * 0.9;
    
    for (let i = 0; i < remaining.length; i++) {
      if (used.has(i)) continue;
      
      const current = remaining[i];
      const duplicateGroup = [current];
      used.add(i);
      
      // Compare with remaining items
      for (let j = i + 1; j < remaining.length; j++) {
        if (used.has(j)) continue;
        
        const other = remaining[j];
        
        // More conservative similarity check
        const simHashSim = this.simHashSimilarity(
          current.hashData.simHash,
          other.hashData.simHash
        );
        
        if (simHashSim >= crossGroupThreshold) {
          // Double-check with MinHash
          const jaccardSim = this.jaccardSimilarity(
            current.hashData.minHashSignature,
            other.hashData.minHashSignature
          );
          
          const combinedSim = (jaccardSim * 0.4) + (simHashSim * 0.6);
          
          if (combinedSim >= crossGroupThreshold) {
            duplicateGroup.push(other);
            used.add(j);
          }
        }
      }
      
      if (duplicateGroup.length > 1) {
        duplicateGroups.push(duplicateGroup);
      }
    }
    
    return duplicateGroups;
  }

  /**
   * Select best representative from duplicate group
   */
  selectBestRepresentative(duplicateGroup) {
    if (duplicateGroup.length === 1) {
      return duplicateGroup[0].chunk;
    }
    
    // Score each chunk based on multiple factors
    let bestChunk = null;
    let bestScore = -1;
    
    for (const { chunk, hashData } of duplicateGroup) {
      let score = 0;
      
      // Prefer longer, more informative text
      score += Math.log(1 + chunk.text.length) * 0.3;
      
      // Prefer chunks with more metadata
      const metadataCount = Object.keys(chunk.metadata || {}).length;
      score += metadataCount * 0.2;
      
      // Prefer chunks with higher retrieval scores if available
      if (chunk.finalScore) {
        score += chunk.finalScore * 0.4;
      }
      
      // Prefer chunks with more diverse vocabulary (more shingles)
      score += Math.log(1 + hashData.shingleCount) * 0.1;
      
      if (score > bestScore) {
        bestScore = score;
        bestChunk = chunk;
      }
    }
    
    return bestChunk;
  }

  /**
   * Remove duplicates from chunk array, keeping best representatives
   */
  removeDuplicates(chunks, onProgress) {
    const result = this.findDuplicates(chunks, onProgress);
    const toRemove = new Set();
    
    // For each duplicate group, keep only the best representative
    for (const duplicateGroup of result.duplicateGroups) {
      const representative = this.selectBestRepresentative(duplicateGroup);
      
      // Mark others for removal
      for (const { chunk } of duplicateGroup) {
        if (chunk.id !== representative.id) {
          toRemove.add(chunk.id);
        }
      }
    }
    
    // Filter out duplicates
    const deduplicated = chunks.filter(chunk => !toRemove.has(chunk.id));
    
    console.log(`🔄 Deduplication complete: ${chunks.length} → ${deduplicated.length} chunks`);
    
    return {
      chunks: deduplicated,
      removed: chunks.length - deduplicated.length,
      duplicateGroups: result.duplicateGroups.length,
      statistics: result
    };
  }

  /**
   * Clear hash cache
   */
  clearCache() {
    this.hashCache.clear();
    console.log('🧹 Hash cache cleared');
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      cacheSize: this.hashCache.size,
      options: this.options,
      memoryUsage: this.hashCache.size * 1024 // Rough estimate
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLADeduplicationService;
}
window.NYLADeduplicationService = NYLADeduplicationService;