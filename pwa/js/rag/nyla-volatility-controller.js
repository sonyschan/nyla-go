/**
 * NYLA Volatility Controller
 * Handles time-sensitive data and prevents outdated information in responses
 */

class NYLAVolatilityController {
  constructor(options = {}) {
    this.options = {
      defaultAgeThresholdDays: 30,
      volatileIndicators: [
        'fee', 'price', 'tps', 'speed', 'cost', '$', 'USD', 'gas',
        'throughput', 'performance', 'latency', 'congestion'
      ],
      qualitativeReplacements: {
        // Numeric replacements
        'specific_fee': 'low fees',
        'exact_tps': 'high throughput', 
        'precise_time': 'fast confirmation',
        'dollar_amount': 'affordable cost',
        'gas_price': 'variable fees',
        'performance_number': 'good performance',
        
        // Pattern-based replacements
        'fee_pattern': /\$[\d.,]+|\d+[\s]*(?:USD|dollars?)/gi,
        'tps_pattern': /\d+[\s]*(?:TPS|transactions?[\s]*per[\s]*second)/gi,
        'time_pattern': /\d+[\s]*(?:seconds?|minutes?|ms|milliseconds?)/gi,
        'percentage_pattern': /\d+[\s]*%/gi
      },
      ...options
    };
    
    this.policyTemplates = null;
  }

  /**
   * Initialize with policy templates
   */
  async initialize(policyTemplates) {
    this.policyTemplates = policyTemplates;
    console.log('⏰ Volatility Controller initialized');
  }

  /**
   * Check if chunk contains volatile information
   */
  isVolatileChunk(chunk) {
    if (chunk.stability === 'volatile') {
      return true;
    }
    
    // Check for volatile indicators in content
    const textToCheck = [
      chunk.title,
      chunk.body,
      chunk.summary_en,
      chunk.summary_zh
    ].join(' ').toLowerCase();
    
    return this.options.volatileIndicators.some(indicator => 
      textToCheck.includes(indicator)
    );
  }

  /**
   * Check if volatile chunk is outdated
   */
  isOutdated(chunk, customThresholdDays = null) {
    if (!chunk.as_of) {
      return false; // No date info, assume current
    }
    
    const asOfDate = new Date(chunk.as_of);
    const now = new Date();
    const thresholdDays = customThresholdDays || this.options.defaultAgeThresholdDays;
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    
    return (now - asOfDate) > thresholdMs;
  }

  /**
   * Process chunks before context building to handle volatility
   */
  processChunksForVolatility(chunks) {
    const processedChunks = [];
    
    for (const chunk of chunks) {
      const processedChunk = { ...chunk };
      
      if (this.isVolatileChunk(chunk) && this.isOutdated(chunk)) {
        // Mark as outdated and apply qualitative transformations
        processedChunk._volatility_status = 'outdated';
        processedChunk._original_body = chunk.body;
        processedChunk.body = this.applyQualitativeTransformation(chunk.body);
        processedChunk.summary_en = this.applyQualitativeTransformation(chunk.summary_en);
        processedChunk.summary_zh = this.applyQualitativeTransformation(chunk.summary_zh);
        
        // Add qualifier
        processedChunk._volatility_qualifier = this.getVolatilityQualifier(chunk);
      } else if (this.isVolatileChunk(chunk)) {
        // Recent volatile data - mark but don't transform
        processedChunk._volatility_status = 'recent_volatile';
        processedChunk._volatility_qualifier = this.getRecentVolatileQualifier();
      } else {
        // Stable data
        processedChunk._volatility_status = 'stable';
      }
      
      processedChunks.push(processedChunk);
    }
    
    return processedChunks;
  }

  /**
   * Apply qualitative transformation to remove specific numbers
   */
  applyQualitativeTransformation(text) {
    if (!text) return text;
    
    let transformedText = text;
    
    // Replace specific fee amounts
    transformedText = transformedText.replace(
      this.options.qualitativeReplacements.fee_pattern,
      'low fees'
    );
    
    // Replace TPS numbers
    transformedText = transformedText.replace(
      this.options.qualitativeReplacements.tps_pattern,
      'high throughput'
    );
    
    // Replace timing numbers
    transformedText = transformedText.replace(
      this.options.qualitativeReplacements.time_pattern,
      'fast processing'
    );
    
    // Replace percentages in performance contexts
    transformedText = transformedText.replace(
      this.options.qualitativeReplacements.percentage_pattern,
      'good efficiency'
    );
    
    // Additional specific replacements
    const specificReplacements = {
      '~$0.0001': 'extremely low fees',
      '$5-$50+': 'variable fees',
      '65,000 TPS': 'very high throughput',
      '15-30 TPS': 'moderate throughput',
      '6,000 TPS': 'high throughput',
      '~$0.001': 'minimal fees'
    };
    
    for (const [specific, replacement] of Object.entries(specificReplacements)) {
      transformedText = transformedText.replace(
        new RegExp(specific.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        replacement
      );
    }
    
    return transformedText;
  }

  /**
   * Get volatility qualifier for outdated data
   */
  getVolatilityQualifier(chunk) {
    const age = this.getChunkAge(chunk);
    
    if (this.policyTemplates && this.policyTemplates.volatility_templates) {
      const template = this.policyTemplates.volatility_templates.outdated_fees;
      return {
        en: template.en + ` (Data from ${age} ago)`,
        zh: template.zh + `（${age}前的数据）`
      };
    }
    
    return {
      en: `Information may be outdated (from ${age} ago). Check current sources for latest data.`,
      zh: `信息可能已过时（${age}前）。请查看当前来源以获取最新数据。`
    };
  }

  /**
   * Get qualifier for recent volatile data
   */
  getRecentVolatileQualifier() {
    if (this.policyTemplates && this.policyTemplates.volatility_templates) {
      const template = this.policyTemplates.volatility_templates.qualitative_fallback;
      return {
        en: template.en,
        zh: template.zh
      };
    }
    
    return {
      en: 'Values may vary based on current market and network conditions.',
      zh: '数值可能因当前市场和网络状况而异。'
    };
  }

  /**
   * Get human-readable age of chunk
   */
  getChunkAge(chunk) {
    if (!chunk.as_of) return 'unknown time';
    
    const asOfDate = new Date(chunk.as_of);
    const now = new Date();
    const diffMs = now - asOfDate;
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    
    if (diffDays < 1) return 'today';
    if (diffDays === 1) return '1 day';
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month' : `${months} months`;
    }
    
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year' : `${years} years`;
  }

  /**
   * Add volatility disclaimers to final response
   */
  addVolatilityDisclaimers(response, processedChunks) {
    const hasVolatileContent = processedChunks.some(chunk => 
      chunk._volatility_status === 'outdated' || chunk._volatility_status === 'recent_volatile'
    );
    
    if (!hasVolatileContent) return response;
    
    const hasOutdatedContent = processedChunks.some(chunk => 
      chunk._volatility_status === 'outdated'
    );
    
    let disclaimer = '';
    
    if (hasOutdatedContent) {
      disclaimer = '\n\n⚠️ Note: Some information in this response may be outdated. Please verify current fees, performance metrics, and market conditions from official sources.';
    } else {
      disclaimer = '\n\n💡 Note: Fees and performance metrics vary based on current network conditions.';
    }
    
    return response + disclaimer;
  }

  /**
   * Get statistics about volatility handling
   */
  getVolatilityStats(processedChunks) {
    const stats = {
      total: processedChunks.length,
      stable: 0,
      recent_volatile: 0,
      outdated: 0,
      transformations_applied: 0
    };
    
    for (const chunk of processedChunks) {
      stats[chunk._volatility_status]++;
      if (chunk._original_body) {
        stats.transformations_applied++;
      }
    }
    
    return stats;
  }

  /**
   * Update volatility control parameters
   */
  updateParameters(newOptions) {
    this.options = { ...this.options, ...newOptions };
    console.log('⏰ Volatility control parameters updated');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAVolatilityController;
}
window.NYLAVolatilityController = NYLAVolatilityController;