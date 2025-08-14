/**
 * NYLA Parameter Tuning System
 * Dynamic parameter adjustment based on retrieval quality metrics
 */

class NYLAParameterTuner {
  constructor(options = {}) {
    this.options = {
      autoTuningEnabled: false,
      tuningInterval: 24 * 60 * 60 * 1000, // 24 hours
      minQueriesForTuning: 50,
      ...options
    };
    
    // Default parameters
    this.parameters = {
      denseTopK: 40,
      bm25TopK: 40, 
      rerankTopK: 10,
      fusionAlpha: 0.6,
      minScore: 0.1,
      volatilityThresholdDays: 30,
      chunkSizeLimits: {
        english: { minTokens: 50, maxTokens: 300, targetTokens: 200 },
        chinese: { minChars: 100, maxChars: 500, targetChars: 350 }
      }
    };
    
    // Parameter bounds
    this.bounds = {
      denseTopK: { min: 10, max: 100 },
      bm25TopK: { min: 10, max: 100 },
      rerankTopK: { min: 3, max: 20 },
      fusionAlpha: { min: 0.1, max: 0.9 },
      minScore: { min: 0.01, max: 0.5 },
      volatilityThresholdDays: { min: 7, max: 90 }
    };
    
    // Performance tracking
    this.performanceHistory = [];
    this.lastTuningTime = 0;
    
    console.log('🎛️ Parameter Tuner initialized', this.parameters);
  }

  /**
   * Get current parameters
   */
  getParameters() {
    return { ...this.parameters };
  }

  /**
   * Set parameters with validation
   */
  setParameters(newParameters) {
    const validated = this.validateParameters(newParameters);
    this.parameters = { ...this.parameters, ...validated };
    
    console.log('🎛️ Parameters updated:', validated);
    return this.parameters;
  }

  /**
   * Validate parameters against bounds
   */
  validateParameters(params) {
    const validated = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (this.bounds[key]) {
        const { min, max } = this.bounds[key];
        validated[key] = Math.max(min, Math.min(max, value));
        
        if (validated[key] !== value) {
          console.warn(`⚠️ Parameter ${key} clamped: ${value} → ${validated[key]} (bounds: ${min}-${max})`);
        }
      } else {
        validated[key] = value;
      }
    }
    
    return validated;
  }

  /**
   * Record performance metrics for tuning
   */
  recordPerformance(metrics) {
    const performance = {
      timestamp: Date.now(),
      queryCount: metrics.queryCount || 1,
      avgRelevanceScore: metrics.avgRelevanceScore || 0,
      avgLatency: metrics.avgLatency || 0,
      successRate: metrics.successRate || 1,
      userSatisfaction: metrics.userSatisfaction || null,
      parameters: { ...this.parameters }
    };
    
    this.performanceHistory.push(performance);
    
    // Keep only recent history (last 1000 entries)
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }
    
    // Check if auto-tuning should trigger
    if (this.options.autoTuningEnabled) {
      this.checkAutoTuning();
    }
  }

  /**
   * Check if auto-tuning should be triggered
   */
  checkAutoTuning() {
    const now = Date.now();
    const timeSinceLastTuning = now - this.lastTuningTime;
    
    if (timeSinceLastTuning < this.options.tuningInterval) {
      return; // Too soon for tuning
    }
    
    const recentHistory = this.performanceHistory.filter(
      p => now - p.timestamp < this.options.tuningInterval
    );
    
    if (recentHistory.length < this.options.minQueriesForTuning) {
      return; // Not enough data
    }
    
    console.log('🎛️ Auto-tuning triggered with', recentHistory.length, 'queries');
    this.performAutoTuning(recentHistory);
  }

  /**
   * Perform automatic parameter tuning
   */
  performAutoTuning(recentHistory) {
    const currentPerformance = this.analyzePerformance(recentHistory);
    
    console.log('📊 Current performance baseline:', currentPerformance);
    
    // Generate parameter suggestions
    const suggestions = this.generateParameterSuggestions(currentPerformance);
    
    if (suggestions.length > 0) {
      console.log('💡 Auto-tuning suggestions:', suggestions);
      
      // Apply the most impactful suggestion
      const bestSuggestion = suggestions[0];
      this.setParameters({ [bestSuggestion.parameter]: bestSuggestion.value });
      
      this.lastTuningTime = Date.now();
    }
  }

  /**
   * Analyze performance metrics
   */
  analyzePerformance(history) {
    if (history.length === 0) return null;
    
    const metrics = {
      avgRelevanceScore: this.average(history.map(h => h.avgRelevanceScore)),
      avgLatency: this.average(history.map(h => h.avgLatency)),
      successRate: this.average(history.map(h => h.successRate)),
      totalQueries: history.reduce((sum, h) => sum + h.queryCount, 0)
    };
    
    // Calculate trend (comparing first half vs second half)
    const midpoint = Math.floor(history.length / 2);
    const firstHalf = history.slice(0, midpoint);
    const secondHalf = history.slice(midpoint);
    
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      metrics.relevanceTrend = this.average(secondHalf.map(h => h.avgRelevanceScore)) - 
                               this.average(firstHalf.map(h => h.avgRelevanceScore));
      metrics.latencyTrend = this.average(secondHalf.map(h => h.avgLatency)) - 
                            this.average(firstHalf.map(h => h.avgLatency));
    }
    
    return metrics;
  }

  /**
   * Generate parameter tuning suggestions
   */
  generateParameterSuggestions(performance) {
    const suggestions = [];
    
    if (!performance) return suggestions;
    
    // High latency - reduce search scope
    if (performance.avgLatency > 3000) { // > 3 seconds
      if (this.parameters.denseTopK > 20) {
        suggestions.push({
          parameter: 'denseTopK',
          value: Math.max(20, this.parameters.denseTopK - 10),
          reason: 'Reduce latency by limiting dense search scope',
          impact: 'high'
        });
      }
      
      if (this.parameters.bm25TopK > 20) {
        suggestions.push({
          parameter: 'bm25TopK', 
          value: Math.max(20, this.parameters.bm25TopK - 10),
          reason: 'Reduce latency by limiting BM25 search scope',
          impact: 'medium'
        });
      }
    }
    
    // Low relevance scores - expand search
    if (performance.avgRelevanceScore < 0.6) {
      if (this.parameters.denseTopK < 60) {
        suggestions.push({
          parameter: 'denseTopK',
          value: Math.min(60, this.parameters.denseTopK + 10),
          reason: 'Improve relevance by expanding dense search',
          impact: 'high'
        });
      }
      
      if (this.parameters.minScore > 0.05) {
        suggestions.push({
          parameter: 'minScore',
          value: Math.max(0.05, this.parameters.minScore - 0.05),
          reason: 'Include more candidates by lowering score threshold',
          impact: 'medium'
        });
      }
    }
    
    // Low success rate - adjust fusion
    if (performance.successRate < 0.8) {
      const currentAlpha = this.parameters.fusionAlpha;
      
      // If dense search seems weak, increase BM25 weight
      suggestions.push({
        parameter: 'fusionAlpha',
        value: Math.max(0.3, currentAlpha - 0.1),
        reason: 'Increase BM25 weight to improve success rate',
        impact: 'medium'
      });
    }
    
    // Declining relevance trend - increase rerank scope
    if (performance.relevanceTrend && performance.relevanceTrend < -0.1) {
      if (this.parameters.rerankTopK < 15) {
        suggestions.push({
          parameter: 'rerankTopK',
          value: Math.min(15, this.parameters.rerankTopK + 2),
          reason: 'Increase reranking scope to recover relevance',
          impact: 'medium'
        });
      }
    }
    
    // Sort by impact (high impact first)
    return suggestions.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  /**
   * Manual parameter optimization suggestions
   */
  getOptimizationSuggestions(targetMetric = 'relevance') {
    const recentHistory = this.performanceHistory.slice(-100);
    
    if (recentHistory.length < 10) {
      return { error: 'Insufficient performance data for optimization suggestions' };
    }
    
    const performance = this.analyzePerformance(recentHistory);
    
    const suggestions = {
      current: performance,
      recommendations: []
    };
    
    switch (targetMetric) {
      case 'speed':
        suggestions.recommendations = [
          {
            parameter: 'denseTopK',
            current: this.parameters.denseTopK,
            suggested: Math.max(10, this.parameters.denseTopK - 15),
            impact: 'Faster dense search',
            tradeoff: 'May reduce recall'
          },
          {
            parameter: 'rerankTopK',
            current: this.parameters.rerankTopK,
            suggested: Math.max(5, this.parameters.rerankTopK - 3),
            impact: 'Faster reranking',
            tradeoff: 'Less precise ranking'
          }
        ];
        break;
        
      case 'relevance':
        suggestions.recommendations = [
          {
            parameter: 'denseTopK',
            current: this.parameters.denseTopK,
            suggested: Math.min(80, this.parameters.denseTopK + 20),
            impact: 'Better semantic coverage',
            tradeoff: 'Slower retrieval'
          },
          {
            parameter: 'rerankTopK', 
            current: this.parameters.rerankTopK,
            suggested: Math.min(15, this.parameters.rerankTopK + 3),
            impact: 'More precise final ranking',
            tradeoff: 'Slower reranking'
          }
        ];
        break;
        
      case 'balanced':
        suggestions.recommendations = [
          {
            parameter: 'fusionAlpha',
            current: this.parameters.fusionAlpha,
            suggested: performance.avgRelevanceScore < 0.6 ? 0.7 : 0.5,
            impact: 'Optimized dense/BM25 balance',
            tradeoff: 'None - pure optimization'
          }
        ];
        break;
    }
    
    return suggestions;
  }

  /**
   * A/B test parameter configurations
   */
  setupABTest(testName, configurations, duration = 7 * 24 * 60 * 60 * 1000) {
    const test = {
      name: testName,
      startTime: Date.now(),
      duration: duration,
      configurations: configurations,
      currentConfig: 0,
      results: configurations.map(() => ({ queries: 0, performance: [] }))
    };
    
    this.activeABTest = test;
    
    console.log(`🧪 A/B test started: ${testName}`, {
      duration: duration / (24 * 60 * 60 * 1000) + ' days',
      configurations: configurations.length
    });
    
    return test;
  }

  /**
   * Get next A/B test configuration
   */
  getABTestConfig() {
    if (!this.activeABTest) return null;
    
    const test = this.activeABTest;
    const now = Date.now();
    
    if (now - test.startTime > test.duration) {
      return this.completeABTest();
    }
    
    // Round-robin through configurations
    const config = test.configurations[test.currentConfig];
    test.currentConfig = (test.currentConfig + 1) % test.configurations.length;
    
    return config;
  }

  /**
   * Record A/B test results
   */
  recordABTestResult(configIndex, performance) {
    if (!this.activeABTest || configIndex < 0 || configIndex >= this.activeABTest.results.length) {
      return;
    }
    
    const result = this.activeABTest.results[configIndex];
    result.queries++;
    result.performance.push(performance);
  }

  /**
   * Complete A/B test and return results
   */
  completeABTest() {
    if (!this.activeABTest) return null;
    
    const test = this.activeABTest;
    const results = {
      name: test.name,
      duration: Date.now() - test.startTime,
      configurations: test.configurations.map((config, i) => ({
        config: config,
        queries: test.results[i].queries,
        avgRelevance: this.average(test.results[i].performance.map(p => p.avgRelevanceScore)),
        avgLatency: this.average(test.results[i].performance.map(p => p.avgLatency)),
        successRate: this.average(test.results[i].performance.map(p => p.successRate))
      }))
    };
    
    // Find best configuration
    const bestConfig = results.configurations.reduce((best, current) => {
      const bestScore = (best.avgRelevance * 0.6) + (best.successRate * 0.4) - (best.avgLatency / 10000);
      const currentScore = (current.avgRelevance * 0.6) + (current.successRate * 0.4) - (current.avgLatency / 10000);
      return currentScore > bestScore ? current : best;
    });
    
    results.winner = bestConfig;
    
    console.log('🏆 A/B test completed:', test.name, results);
    
    this.activeABTest = null;
    return results;
  }

  /**
   * Calculate average of array
   */
  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Export tuning data
   */
  exportTuningData() {
    return {
      currentParameters: this.parameters,
      parameterBounds: this.bounds,
      performanceHistory: this.performanceHistory.slice(-100),
      activeABTest: this.activeABTest,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Reset to default parameters
   */
  resetToDefaults() {
    this.parameters = {
      denseTopK: 40,
      bm25TopK: 40,
      rerankTopK: 10,
      fusionAlpha: 0.6,
      minScore: 0.1,
      volatilityThresholdDays: 30
    };
    
    console.log('🔄 Parameters reset to defaults');
    return this.parameters;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAParameterTuner;
}
window.NYLAParameterTuner = NYLAParameterTuner;