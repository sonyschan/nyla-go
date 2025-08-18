/**
 * NYLA Language Consistency Service
 * Phase 3 Enhancement: Ensures coherent language output and self-repair mechanism
 * Addresses Chinese RAG specification requirements for language consistency
 */

class NYLALanguageConsistency {
  constructor(options = {}) {
    this.options = {
      enableLanguageDetection: true,
      enableConsistencyChecking: true,
      enableSelfRepair: true,
      maxRepairAttempts: 2,
      consistencyThreshold: 0.7, // Minimum consistency score
      preferredLanguage: 'auto',  // 'en', 'zh', 'auto'
      ...options
    };
    
    // Language patterns for detection
    this.languagePatterns = {
      chinese: /[\u4e00-\u9fff]/g,
      english: /[a-zA-Z]/g,
      numbers: /[0-9]/g,
      punctuation: /[.,;:!?()[\]{}"'`~\-_+=<>|\\\/]/g
    };
    
    // Consistency rules
    this.consistencyRules = {
      // Mixed language responses should maintain primary language dominance
      primaryLanguageDominance: 0.6,
      // Technical terms can be mixed but explanations should be consistent  
      technicalTermMixingAllowed: true,
      // Contract addresses, URLs, handles are language-neutral
      neutralTermsAllowed: ['contract', 'address', 'http', '@', '$', '0x']
    };
    
    console.log('🌐 NYLALanguageConsistency initialized with options:', this.options);
  }
  
  /**
   * Detect primary language of text
   */
  detectLanguage(text) {
    if (!text || text.length === 0) {
      return { primary: 'unknown', confidence: 0 };
    }
    
    const chineseMatches = (text.match(this.languagePatterns.chinese) || []).length;
    const englishMatches = (text.match(this.languagePatterns.english) || []).length;
    const totalChars = text.length;
    
    const chineseRatio = chineseMatches / totalChars;
    const englishRatio = englishMatches / totalChars;
    
    let primary, confidence;
    
    if (chineseRatio > englishRatio && chineseRatio > 0.1) {
      primary = 'zh';
      confidence = Math.min(chineseRatio * 2, 1); // Boost confidence for Chinese
    } else if (englishRatio > chineseRatio && englishRatio > 0.3) {
      primary = 'en';
      confidence = Math.min(englishRatio * 1.5, 1);
    } else if (chineseRatio > 0 && englishRatio > 0) {
      primary = 'mixed';
      confidence = 0.5;
    } else {
      primary = 'unknown';
      confidence = 0;
    }
    
    return {
      primary,
      confidence,
      ratios: {
        chinese: chineseRatio,
        english: englishRatio
      },
      characterCounts: {
        chinese: chineseMatches,
        english: englishMatches,
        total: totalChars
      }
    };
  }
  
  /**
   * Analyze language consistency of query and retrieved context
   */
  analyzeConsistency(query, retrievedChunks, options = {}) {
    const config = { ...this.options, ...options };
    
    if (!config.enableConsistencyChecking) {
      return { consistent: true, reason: 'consistency_checking_disabled' };
    }
    
    console.log('🔍 Analyzing language consistency...');
    
    // Detect query language
    const queryLang = this.detectLanguage(query);
    console.log('📝 Query language:', queryLang);
    
    // Analyze retrieved chunks
    const chunkAnalysis = retrievedChunks.map(chunk => {
      const chunkLang = this.detectLanguage(chunk.text || chunk.content || '');
      return {
        id: chunk.id,
        language: chunkLang,
        text: chunk.text || chunk.content || '',
        metadata: chunk.metadata
      };
    });
    
    // Calculate consistency scores
    const consistencyScore = this.calculateConsistencyScore(queryLang, chunkAnalysis);
    
    const analysis = {
      query: {
        text: query,
        language: queryLang
      },
      chunks: chunkAnalysis,
      consistency: consistencyScore,
      consistent: consistencyScore.overall >= config.consistencyThreshold,
      recommendations: this.generateRecommendations(queryLang, chunkAnalysis, consistencyScore)
    };
    
    console.log('📊 Language consistency analysis:', {
      queryLang: queryLang.primary,
      chunksAnalyzed: chunkAnalysis.length,
      overallScore: consistencyScore.overall.toFixed(3),
      consistent: analysis.consistent
    });
    
    return analysis;
  }
  
  /**
   * Calculate consistency score between query and chunks
   */
  calculateConsistencyScore(queryLang, chunkAnalysis) {
    let totalScore = 0;
    let weightSum = 0;
    const scores = [];
    
    for (let i = 0; i < chunkAnalysis.length; i++) {
      const chunk = chunkAnalysis[i];
      const weight = 1.0 / (i + 1); // Higher weight for more relevant chunks
      
      let chunkScore = 0;
      
      // Language alignment scoring
      if (queryLang.primary === chunk.language.primary) {
        chunkScore = 1.0; // Perfect match
      } else if (queryLang.primary === 'mixed' || chunk.language.primary === 'mixed') {
        chunkScore = 0.7; // Mixed is acceptable
      } else if (queryLang.primary === 'zh' && chunk.language.primary === 'en') {
        // Chinese query with English content - check if technical/factual
        if (this.isTechnicalContent(chunk.text)) {
          chunkScore = 0.8; // Technical content is acceptable in English
        } else {
          chunkScore = 0.4; // Lower score for non-technical English content
        }
      } else if (queryLang.primary === 'en' && chunk.language.primary === 'zh') {
        // English query with Chinese content
        chunkScore = 0.6; // Moderate penalty
      } else {
        chunkScore = 0.3; // Language mismatch
      }
      
      // Boost score for high-confidence language detection
      chunkScore *= (chunk.language.confidence * 0.3 + 0.7);
      
      scores.push({
        chunkId: chunk.id,
        score: chunkScore,
        weight: weight,
        reason: this.getScoreReason(queryLang.primary, chunk.language.primary, chunkScore)
      });
      
      totalScore += chunkScore * weight;
      weightSum += weight;
    }
    
    const overall = weightSum > 0 ? totalScore / weightSum : 0;
    
    return {
      overall,
      scores,
      details: {
        totalScore,
        weightSum,
        chunksAnalyzed: chunkAnalysis.length
      }
    };
  }
  
  /**
   * Check if content is technical/factual (language-neutral)
   */
  isTechnicalContent(text) {
    const technicalPatterns = [
      /0x[a-fA-F0-9]+/, // Contract addresses
      /\$[A-Z0-9]+/, // Ticker symbols
      /https?:\/\//, // URLs
      /@[a-zA-Z0-9_]+/, // Social handles
      /\b\d+\.\d+\.\d+\b/, // Version numbers
      /\b[A-Z]{2,10}\b/ // Acronyms
    ];
    
    return technicalPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Get reason for consistency score
   */
  getScoreReason(queryLang, chunkLang, score) {
    if (score >= 0.9) return 'perfect_language_match';
    if (score >= 0.8) return 'acceptable_technical_content';
    if (score >= 0.7) return 'mixed_language_acceptable';
    if (score >= 0.6) return 'moderate_language_mismatch';
    if (score >= 0.4) return 'significant_language_mismatch';
    return 'poor_language_alignment';
  }
  
  /**
   * Generate recommendations for improving consistency
   */
  generateRecommendations(queryLang, chunkAnalysis, consistencyScore) {
    const recommendations = [];
    
    if (consistencyScore.overall < this.options.consistencyThreshold) {
      recommendations.push({
        type: 'language_mismatch',
        severity: 'high',
        message: `Language consistency below threshold (${consistencyScore.overall.toFixed(2)} < ${this.options.consistencyThreshold})`,
        suggestion: 'Consider re-ranking chunks by language preference or requesting translation'
      });
    }
    
    // Check for too many language switches
    const languageChanges = this.countLanguageChanges(chunkAnalysis);
    if (languageChanges > 2) {
      recommendations.push({
        type: 'excessive_language_switching',
        severity: 'medium',
        message: `Too many language changes (${languageChanges}) in retrieved chunks`,
        suggestion: 'Group chunks by language or apply language-aware reranking'
      });
    }
    
    // Check for query-context mismatch
    if (queryLang.primary === 'zh' && !chunkAnalysis.some(c => c.language.primary === 'zh')) {
      recommendations.push({
        type: 'no_native_language_content',
        severity: 'medium',
        message: 'Chinese query but no Chinese content retrieved',
        suggestion: 'Expand search to include more Chinese content or provide translation'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Count language changes in chunk sequence
   */
  countLanguageChanges(chunkAnalysis) {
    if (chunkAnalysis.length <= 1) return 0;
    
    let changes = 0;
    for (let i = 1; i < chunkAnalysis.length; i++) {
      if (chunkAnalysis[i].language.primary !== chunkAnalysis[i-1].language.primary) {
        changes++;
      }
    }
    return changes;
  }
  
  /**
   * Self-repair mechanism: Attempt to improve language consistency
   */
  async attemptSelfRepair(query, retrievedChunks, consistencyAnalysis, options = {}) {
    const config = { ...this.options, ...options };
    
    if (!config.enableSelfRepair || consistencyAnalysis.consistent) {
      return { repaired: false, reason: 'no_repair_needed' };
    }
    
    console.log('🔧 Attempting self-repair for language consistency...');
    
    const repairAttempts = [];
    let repairedChunks = [...retrievedChunks];
    
    // Attempt 1: Rerank by language preference
    if (consistencyAnalysis.query.language.primary !== 'mixed') {
      const preferredLang = consistencyAnalysis.query.language.primary;
      repairedChunks = this.rerankByLanguagePreference(repairedChunks, preferredLang);
      repairAttempts.push('language_preference_reranking');
    }
    
    // Attempt 2: Filter out low-consistency chunks
    if (repairedChunks.length > 3) {
      const lowConsistencyIds = new Set(
        consistencyAnalysis.consistency.scores
          .filter(s => s.score < 0.5)
          .map(s => s.chunkId)
      );
      
      if (lowConsistencyIds.size > 0) {
        repairedChunks = repairedChunks.filter(chunk => !lowConsistencyIds.has(chunk.id));
        repairAttempts.push('low_consistency_filtering');
      }
    }
    
    // Attempt 3: Group by language to reduce switching
    if (repairedChunks.length > 2) {
      repairedChunks = this.groupByLanguage(repairedChunks, consistencyAnalysis.query.language.primary);
      repairAttempts.push('language_grouping');
    }
    
    // Re-analyze consistency
    const repairedAnalysis = this.analyzeConsistency(query, repairedChunks, config);
    
    const improvement = repairedAnalysis.consistency.overall - consistencyAnalysis.consistency.overall;
    
    const result = {
      repaired: improvement > 0.1,
      improvement,
      originalScore: consistencyAnalysis.consistency.overall,
      repairedScore: repairedAnalysis.consistency.overall,
      attempts: repairAttempts,
      repairedChunks: repairedChunks,
      repairedAnalysis: repairedAnalysis
    };
    
    console.log('🔧 Self-repair result:', {
      repaired: result.repaired,
      improvement: improvement.toFixed(3),
      attempts: repairAttempts.length,
      finalScore: result.repairedScore.toFixed(3)
    });
    
    return result;
  }
  
  /**
   * Rerank chunks by language preference
   */
  rerankByLanguagePreference(chunks, preferredLang) {
    return chunks.sort((a, b) => {
      const aLang = this.detectLanguage(a.text || a.content || '');
      const bLang = this.detectLanguage(b.text || b.content || '');
      
      const aMatch = aLang.primary === preferredLang ? 1 : 0;
      const bMatch = bLang.primary === preferredLang ? 1 : 0;
      
      if (aMatch !== bMatch) {
        return bMatch - aMatch; // Preferred language first
      }
      
      // If same language preference, maintain original order
      return 0;
    });
  }
  
  /**
   * Group chunks by language to reduce switching
   */
  groupByLanguage(chunks, preferredLang) {
    const langGroups = {
      preferred: [],
      mixed: [],
      other: []
    };
    
    for (const chunk of chunks) {
      const lang = this.detectLanguage(chunk.text || chunk.content || '');
      
      if (lang.primary === preferredLang) {
        langGroups.preferred.push(chunk);
      } else if (lang.primary === 'mixed') {
        langGroups.mixed.push(chunk);
      } else {
        langGroups.other.push(chunk);
      }
    }
    
    // Return grouped order: preferred -> mixed -> other
    return [...langGroups.preferred, ...langGroups.mixed, ...langGroups.other];
  }
  
  /**
   * Get consistency checking statistics
   */
  getStats() {
    return {
      enabled: this.options.enableConsistencyChecking,
      selfRepairEnabled: this.options.enableSelfRepair,
      consistencyThreshold: this.options.consistencyThreshold,
      maxRepairAttempts: this.options.maxRepairAttempts,
      supportedLanguages: ['en', 'zh', 'mixed'],
      technicalTermMixingAllowed: this.consistencyRules.technicalTermMixingAllowed
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLALanguageConsistency;
}
window.NYLALanguageConsistency = NYLALanguageConsistency;