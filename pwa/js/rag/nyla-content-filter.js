/**
 * NYLA Content Filter Service
 * Implements marketing/boilerplate content blacklist and quality filtering
 */

class NYLAContentFilter {
  constructor(options = {}) {
    this.options = {
      // Filtering modes
      strictMode: false,            // Strict filtering for production
      marketingThreshold: 0.7,      // Threshold for marketing content detection
      boilerplateThreshold: 0.8,    // Threshold for boilerplate detection
      qualityThreshold: 0.3,        // Minimum quality score to keep content
      
      // Filter categories
      filterMarketing: true,        // Filter promotional content
      filterBoilerplate: true,      // Filter legal/template text
      filterLowQuality: true,       // Filter low-quality content
      filterDuplicates: false,      // Handle duplicates (use deduplication service instead)
      
      // Content length filters
      minContentLength: 20,         // Minimum characters
      maxContentLength: 5000,       // Maximum characters
      minWordCount: 5,              // Minimum words
      
      ...options
    };
    
    // Marketing/promotional patterns
    this.marketingPatterns = [
      // Promotional language
      /\b(amazing|incredible|fantastic|revolutionary|game[-\s]changing|breakthrough)\b/gi,
      /\b(best|top|#1|number one|leading|premier|ultimate|perfect)\b/gi,
      /\b(limited time|act now|don't miss|hurry|exclusive|special offer)\b/gi,
      /\b(free|discount|sale|save money|cheap|affordable|cost-effective)\b/gi,
      
      // Superlatives and hype
      /\b(most|fastest|easiest|simplest|smartest|safest|secure)\b/gi,
      /\b(guaranteed|promise|ensure|100%|completely|totally|absolutely)\b/gi,
      /\b(revolutionary|innovative|cutting[-\s]edge|state[-\s]of[-\s]the[-\s]art)\b/gi,
      
      // Call-to-action phrases
      /\b(try now|get started|sign up|join|download|install|click here)\b/gi,
      /\b(learn more|find out|discover|explore|check out)\b/gi,
      
      // Business/commercial terms
      /\b(enterprise|business|professional|commercial|corporate)\b/gi,
      /\b(solution|service|platform|product|offering)\b/gi
    ];
    
    // Boilerplate/template patterns
    this.boilerplatePatterns = [
      // Legal disclaimers
      /\b(terms of service|privacy policy|disclaimer|copyright|all rights reserved)\b/gi,
      /\b(not financial advice|do your own research|dyor|at your own risk)\b/gi,
      /\b(subject to terms|may apply|void where prohibited)\b/gi,
      
      // Template phrases
      /\b(lorem ipsum|placeholder|example text|sample content)\b/gi,
      /\b(to be determined|tbd|coming soon|under construction)\b/gi,
      /\b(contact us|customer service|support team|help desk)\b/gi,
      
      // Generic descriptions
      /\b(this section|in this article|as mentioned above|as we discussed)\b/gi,
      /\b(for more information|additional details|further reading)\b/gi,
      
      // Footer/header content
      /\b(home|about|services|contact|blog|news|faq|help)\b/gi,
      /\b(navigation|menu|sidebar|footer|header)\b/gi
    ];
    
    // Low quality indicators
    this.qualityPatterns = {
      // Positive quality indicators
      positive: [
        /\b(step|process|method|approach|technique|strategy)\b/gi,
        /\b(example|instance|demonstration|tutorial|guide)\b/gi,
        /\b(because|therefore|however|moreover|furthermore|additionally)\b/gi,
        /\b(first|second|third|then|next|finally|conclusion)\b/gi,
        /\b(\d+\.?\d*\s*(percent|%|seconds?|minutes?|usd|fees?))\b/gi
      ],
      
      // Negative quality indicators
      negative: [
        /\b(um|uh|like|you know|basically|literally|actually)\b/gi,
        /\b(thing|stuff|whatever|something|anything)\b/gi,
        /[.]{3,}|\?{2,}|!{2,}/g, // Excessive punctuation
        /[A-Z]{3,}/g, // ALL CAPS words
        /\b(\w)\1{2,}\b/g // Repeated characters (looool, etc.)
      ]
    };
    
    // Blockchain-specific quality indicators
    this.blockchainQuality = {
      technical: [
        /\b(transaction|hash|signature|consensus|validator|node|block|chain)\b/gi,
        /\b(smart contract|dapp|defi|nft|token|cryptocurrency|blockchain)\b/gi,
        /\b(wallet|address|private key|public key|mnemonic|seed phrase)\b/gi,
        /\b(gas|fee|tps|throughput|latency|confirmation|finality)\b/gi
      ],
      networks: [
        /\b(solana|ethereum|algorand|bitcoin|polygon|avalanche|cardano)\b/gi,
        /\b(mainnet|testnet|devnet|network|protocol|ecosystem)\b/gi
      ]
    };
    
    console.log('🚫 Content filter initialized', {
      strictMode: this.options.strictMode,
      filterCategories: {
        marketing: this.options.filterMarketing,
        boilerplate: this.options.filterBoilerplate,
        lowQuality: this.options.filterLowQuality
      }
    });
  }

  /**
   * Filter chunks based on content quality and type
   */
  filterChunks(chunks, options = {}) {
    const config = { ...this.options, ...options };
    
    if (!chunks || chunks.length === 0) {
      return {
        filtered: [],
        removed: [],
        statistics: {
          original: 0,
          kept: 0,
          removed: 0,
          filterReasons: {}
        }
      };
    }
    
    console.log(`🚫 Filtering ${chunks.length} chunks...`);
    
    const filtered = [];
    const removed = [];
    const filterReasons = {};
    
    for (const chunk of chunks) {
      const analysis = this.analyzeChunk(chunk, config);
      
      if (analysis.shouldKeep) {
        filtered.push({
          ...chunk,
          qualityScore: analysis.qualityScore,
          contentFlags: analysis.flags,
          filterAnalysis: analysis
        });
      } else {
        removed.push({
          ...chunk,
          filterReason: analysis.primaryReason,
          filterAnalysis: analysis
        });
        
        // Track filter reasons
        const reason = analysis.primaryReason;
        filterReasons[reason] = (filterReasons[reason] || 0) + 1;
      }
    }
    
    const statistics = {
      original: chunks.length,
      kept: filtered.length,
      removed: removed.length,
      filterReasons: filterReasons,
      qualityDistribution: this.calculateQualityDistribution(filtered)
    };
    
    console.log(`✅ Filtering complete: kept ${filtered.length}/${chunks.length} chunks`, filterReasons);
    
    return {
      filtered: filtered,
      removed: removed,
      statistics: statistics
    };
  }

  /**
   * Analyze a single chunk for filtering decisions
   */
  analyzeChunk(chunk, config) {
    const analysis = {
      qualityScore: 0,
      marketingScore: 0,
      boilerplateScore: 0,
      flags: [],
      reasons: [],
      shouldKeep: true,
      primaryReason: null
    };
    
    const text = chunk.text;
    const wordCount = text.split(/\s+/).length;
    const charCount = text.length;
    
    // Basic length filters
    if (charCount < config.minContentLength) {
      analysis.shouldKeep = false;
      analysis.primaryReason = 'too_short';
      analysis.reasons.push('Content too short');
      return analysis;
    }
    
    if (charCount > config.maxContentLength) {
      analysis.shouldKeep = false;
      analysis.primaryReason = 'too_long';
      analysis.reasons.push('Content too long');
      return analysis;
    }
    
    if (wordCount < config.minWordCount) {
      analysis.shouldKeep = false;
      analysis.primaryReason = 'insufficient_words';
      analysis.reasons.push('Insufficient word count');
      return analysis;
    }
    
    // Calculate marketing score
    if (config.filterMarketing) {
      analysis.marketingScore = this.calculateMarketingScore(text);
      
      if (analysis.marketingScore >= config.marketingThreshold) {
        analysis.flags.push('marketing');
        analysis.reasons.push('High marketing content');
        
        if (config.strictMode) {
          analysis.shouldKeep = false;
          analysis.primaryReason = 'marketing_content';
          return analysis;
        }
      }
    }
    
    // Calculate boilerplate score
    if (config.filterBoilerplate) {
      analysis.boilerplateScore = this.calculateBoilerplateScore(text);
      
      if (analysis.boilerplateScore >= config.boilerplateThreshold) {
        analysis.flags.push('boilerplate');
        analysis.reasons.push('High boilerplate content');
        
        if (config.strictMode) {
          analysis.shouldKeep = false;
          analysis.primaryReason = 'boilerplate_content';
          return analysis;
        }
      }
    }
    
    // Calculate overall quality score
    analysis.qualityScore = this.calculateQualityScore(text, chunk);
    
    if (config.filterLowQuality && analysis.qualityScore < config.qualityThreshold) {
      analysis.flags.push('low_quality');
      analysis.reasons.push('Low content quality');
      analysis.shouldKeep = false;
      analysis.primaryReason = 'low_quality';
      return analysis;
    }
    
    // Additional flags for borderline content
    if (analysis.marketingScore > 0.4) {
      analysis.flags.push('promotional');
    }
    if (analysis.boilerplateScore > 0.5) {
      analysis.flags.push('template');
    }
    
    return analysis;
  }

  /**
   * Calculate marketing content score
   */
  calculateMarketingScore(text) {
    let score = 0;
    let matchCount = 0;
    const textLower = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    
    // Count marketing pattern matches
    for (const pattern of this.marketingPatterns) {
      const matches = textLower.match(pattern);
      if (matches) {
        matchCount += matches.length;
        score += matches.length * 0.1;
      }
    }
    
    // Normalize by text length
    const density = matchCount / wordCount;
    score = Math.min(score + (density * 2), 1.0);
    
    // Additional marketing indicators
    if (text.includes('!')) {
      const exclamationCount = (text.match(/!/g) || []).length;
      score += Math.min(exclamationCount * 0.05, 0.2);
    }
    
    // Heavy use of superlatives
    if (/\b(most|best|top|#1|ultimate|perfect)\b/gi.test(text)) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate boilerplate content score
   */
  calculateBoilerplateScore(text) {
    let score = 0;
    let matchCount = 0;
    const textLower = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    
    // Count boilerplate pattern matches
    for (const pattern of this.boilerplatePatterns) {
      const matches = textLower.match(pattern);
      if (matches) {
        matchCount += matches.length;
        score += matches.length * 0.15;
      }
    }
    
    // Normalize by text length
    const density = matchCount / wordCount;
    score = Math.min(score + (density * 3), 1.0);
    
    // Check for repetitive structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
      const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
      const variance = sentences.reduce((sum, s) => sum + Math.pow(s.length - avgSentenceLength, 2), 0) / sentences.length;
      
      // Low variance suggests template-like structure
      if (variance < avgSentenceLength * 0.3) {
        score += 0.2;
      }
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate overall content quality score
   */
  calculateQualityScore(text, chunk) {
    let score = 0.5; // Base score
    const textLower = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    
    // Positive quality indicators
    for (const pattern of this.qualityPatterns.positive) {
      const matches = textLower.match(pattern);
      if (matches) {
        score += matches.length * 0.05;
      }
    }
    
    // Blockchain-specific technical content
    for (const patterns of Object.values(this.blockchainQuality)) {
      for (const pattern of patterns) {
        const matches = textLower.match(pattern);
        if (matches) {
          score += matches.length * 0.08;
        }
      }
    }
    
    // Negative quality indicators
    for (const pattern of this.qualityPatterns.negative) {
      const matches = textLower.match(pattern);
      if (matches) {
        score -= matches.length * 0.1;
      }
    }
    
    // Structural quality indicators
    const hasNumbers = /\b\d+\b/.test(text);
    const hasSteps = /\b(step|first|second|then|next)\b/i.test(text);
    const hasExamples = /\b(example|such as|for instance)\b/i.test(text);
    
    if (hasNumbers) score += 0.1;
    if (hasSteps) score += 0.15;
    if (hasExamples) score += 0.1;
    
    // Length-based quality
    if (wordCount >= 20 && wordCount <= 200) {
      score += 0.1; // Sweet spot for chunk length
    } else if (wordCount < 10) {
      score -= 0.2; // Too short
    } else if (wordCount > 300) {
      score -= 0.1; // Potentially too verbose
    }
    
    // Metadata-based quality
    if (chunk.metadata) {
      if (chunk.metadata.chunk_type === 'qa_pair') score += 0.1;
      if (chunk.metadata.chunk_type === 'how_to') score += 0.15;
      if (chunk.metadata.tags && chunk.metadata.tags.length > 0) score += 0.05;
    }
    
    // Existing retrieval score
    if (chunk.finalScore && chunk.finalScore > 0.7) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(score, 1.0));
  }

  /**
   * Filter content based on blacklisted keywords or phrases
   */
  filterByBlacklist(chunks, blacklist) {
    if (!blacklist || blacklist.length === 0) {
      return { filtered: chunks, removed: [] };
    }
    
    console.log(`🚫 Applying blacklist filter with ${blacklist.length} patterns...`);
    
    const filtered = [];
    const removed = [];
    
    for (const chunk of chunks) {
      let isBlacklisted = false;
      let matchedPattern = null;
      
      for (const pattern of blacklist) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern, 'gi') : pattern;
        if (regex.test(chunk.text)) {
          isBlacklisted = true;
          matchedPattern = pattern;
          break;
        }
      }
      
      if (isBlacklisted) {
        removed.push({
          ...chunk,
          filterReason: 'blacklisted',
          matchedPattern: matchedPattern
        });
      } else {
        filtered.push(chunk);
      }
    }
    
    console.log(`✅ Blacklist filtering complete: ${filtered.length}/${chunks.length} chunks kept`);
    
    return {
      filtered: filtered,
      removed: removed,
      statistics: {
        original: chunks.length,
        kept: filtered.length,
        removed: removed.length
      }
    };
  }

  /**
   * Calculate quality score distribution
   */
  calculateQualityDistribution(chunks) {
    if (chunks.length === 0) {
      return { high: 0, medium: 0, low: 0, average: 0 };
    }
    
    const scores = chunks.map(c => c.qualityScore || 0);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const distribution = {
      high: scores.filter(s => s >= 0.7).length,
      medium: scores.filter(s => s >= 0.4 && s < 0.7).length,
      low: scores.filter(s => s < 0.4).length,
      average: average
    };
    
    return distribution;
  }

  /**
   * Adaptive filtering based on query context
   */
  adaptiveFilter(chunks, query, options = {}) {
    const config = { ...this.options, ...options };
    
    // Adjust thresholds based on query characteristics
    const queryLower = query.toLowerCase();
    
    // For technical queries, be more lenient with marketing content
    if (/\b(how|technical|spec|fee|gas|cost)\b/.test(queryLower)) {
      config.marketingThreshold = Math.min(config.marketingThreshold + 0.2, 0.9);
    }
    
    // For general queries, be stricter
    if (/\b(what|explain|tell me)\b/.test(queryLower)) {
      config.qualityThreshold = Math.max(config.qualityThreshold + 0.1, 0.2);
    }
    
    return this.filterChunks(chunks, config);
  }

  /**
   * Get filter statistics and recommendations
   */
  analyzeFilteringEffectiveness(originalChunks, filteredResult) {
    const analysis = {
      filteringRate: filteredResult.statistics.removed / filteredResult.statistics.original,
      qualityImprovement: 0,
      recommendedAdjustments: []
    };
    
    // Calculate quality improvement
    if (originalChunks.length > 0) {
      const originalAvgQuality = originalChunks.reduce((sum, c) => sum + (c.qualityScore || 0.5), 0) / originalChunks.length;
      const filteredAvgQuality = filteredResult.statistics.qualityDistribution.average;
      analysis.qualityImprovement = filteredAvgQuality - originalAvgQuality;
    }
    
    // Provide recommendations
    if (analysis.filteringRate > 0.5) {
      analysis.recommendedAdjustments.push('Consider lowering filter thresholds - too aggressive');
    } else if (analysis.filteringRate < 0.1) {
      analysis.recommendedAdjustments.push('Consider raising filter thresholds - too permissive');
    }
    
    if (filteredResult.statistics.qualityDistribution.low > filteredResult.filtered.length * 0.3) {
      analysis.recommendedAdjustments.push('Increase quality threshold to filter more low-quality content');
    }
    
    return analysis;
  }

  /**
   * Get content filter statistics
   */
  getStats() {
    return {
      filterModes: {
        marketing: this.options.filterMarketing,
        boilerplate: this.options.filterBoilerplate,
        lowQuality: this.options.filterLowQuality
      },
      thresholds: {
        marketing: this.options.marketingThreshold,
        boilerplate: this.options.boilerplateThreshold,
        quality: this.options.qualityThreshold
      },
      strictMode: this.options.strictMode,
      patternCounts: {
        marketing: this.marketingPatterns.length,
        boilerplate: this.boilerplatePatterns.length,
        quality: this.qualityPatterns.positive.length + this.qualityPatterns.negative.length
      }
    };
  }

  /**
   * Update filter parameters
   */
  updateParameters(newOptions) {
    this.options = { ...this.options, ...newOptions };
    console.log('🚫 Content filter parameters updated:', newOptions);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAContentFilter;
}
window.NYLAContentFilter = NYLAContentFilter;