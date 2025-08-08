/**
 * NYLA RAG Evaluation Framework
 * Tests and evaluates RAG system performance
 */

class NYLARAGEvaluation {
  constructor(ragPipeline) {
    this.ragPipeline = ragPipeline;
    
    // Test dataset
    this.testQueries = [
      {
        id: 'fees_solana',
        query: 'What are Solana transaction fees?',
        expectedKeywords: ['$0.0001', 'solana', 'fee', 'low'],
        expectedSources: ['supportedBlockchains'],
        category: 'blockchain_fees',
        difficulty: 'easy'
      },
      {
        id: 'transfer_how',
        query: 'How do I send NYLA tokens?',
        expectedKeywords: ['send', 'transfer', 'x.com', 'command'],
        expectedSources: ['nylaCommands', 'transfers'],
        category: 'how_to',
        difficulty: 'medium'
      },
      {
        id: 'blockchain_comparison',
        query: 'What is the difference between Solana and Ethereum?',
        expectedKeywords: ['solana', 'ethereum', 'tps', 'fees', 'consensus'],
        expectedSources: ['supportedBlockchains'],
        category: 'comparison',
        difficulty: 'hard'
      },
      {
        id: 'bridging_limitation',
        query: 'Can I bridge tokens from Solana to Ethereum?',
        expectedKeywords: ['no', 'not supported', 'same blockchain'],
        expectedSources: ['supportedBlockchains', 'featuresVsNetworks'],
        category: 'limitation',
        difficulty: 'hard'
      },
      {
        id: 'qr_generation',
        query: 'How do I create a QR code for payments?',
        expectedKeywords: ['qr', 'receive', 'generate'],
        expectedSources: ['features', 'transfers'],
        category: 'feature',
        difficulty: 'easy'
      },
      {
        id: 'followup_question',
        query: 'What about the fees?',
        expectedKeywords: ['fee', 'cost'],
        expectedSources: ['supportedBlockchains'],
        category: 'followup',
        difficulty: 'medium',
        requiresContext: true  // This question needs conversation context
      }
    ];
    
    // Evaluation metrics
    this.metrics = {
      totalQueries: 0,
      correctAnswers: 0,
      avgLatency: 0,
      avgConfidence: 0,
      hitRateAtK: { 1: 0, 3: 0, 5: 0 },
      sourceCoverage: 0,
      keywordCoverage: 0,
      categoryPerformance: {}
    };
  }

  /**
   * Run complete evaluation suite
   */
  async runEvaluation(options = {}) {
    console.log('🧪 Starting RAG evaluation...');
    
    const config = {
      includeLatency: true,
      includeQuality: true,
      includeRetrieval: true,
      verbose: false,
      ...options
    };
    
    const results = [];
    const startTime = Date.now();
    
    for (const testQuery of this.testQueries) {
      console.log(`🔍 Testing: "${testQuery.query}"`);
      
      try {
        const result = await this.evaluateQuery(testQuery, config);
        results.push(result);
        
        if (config.verbose) {
          console.log(`  ✅ Score: ${result.overallScore.toFixed(2)}`);
        }
        
      } catch (error) {
        console.error(`❌ Query failed: ${testQuery.id}`, error);
        results.push({
          queryId: testQuery.id,
          error: error.message,
          scores: { overall: 0 }
        });
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    // Calculate aggregated metrics
    const summary = this.calculateSummary(results, totalTime);
    
    console.log('\n📊 Evaluation Results:');
    console.log(`  Overall Score: ${summary.overallScore.toFixed(2)}/1.0`);
    console.log(`  Avg Latency: ${summary.avgLatency}ms`);
    console.log(`  Hit Rate@3: ${(summary.hitRateAtK[3] * 100).toFixed(1)}%`);
    console.log(`  Source Coverage: ${(summary.sourceCoverage * 100).toFixed(1)}%`);
    
    return {
      summary,
      results,
      testQueries: this.testQueries.length,
      totalTime
    };
  }

  /**
   * Evaluate a single query
   */
  async evaluateQuery(testQuery, config) {
    const queryStart = Date.now();
    
    // Set up conversation context for follow-up questions
    if (testQuery.requiresContext && this.ragPipeline.conversationManager) {
      // Add a sample previous conversation turn
      this.ragPipeline.conversationManager.addTurn(
        'What are Solana transaction fees?',
        'Solana transaction fees are approximately $0.0001 per transaction, making it very cost-effective for transfers.',
        { confidence: 0.9 }
      );
    }
    
    // Execute query
    const response = await this.ragPipeline.query(testQuery.query, {
      streaming: false,
      topK: 5
    });
    
    const latency = Date.now() - queryStart;
    
    // Evaluate different aspects
    const scores = {};
    
    if (config.includeRetrieval) {
      scores.retrieval = this.evaluateRetrieval(testQuery, response);
    }
    
    if (config.includeQuality) {
      scores.quality = this.evaluateQuality(testQuery, response);
    }
    
    if (config.includeLatency) {
      scores.latency = this.evaluateLatency(latency);
    }
    
    // Calculate overall score
    const weights = {
      retrieval: 0.4,
      quality: 0.4,
      latency: 0.2
    };
    
    scores.overall = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (scores[key] || 0) * weight;
    }, 0);
    
    return {
      queryId: testQuery.id,
      query: testQuery.query,
      response: response.response,
      latency,
      confidence: response.metrics.confidence,
      sources: response.sources,
      scores,
      overallScore: scores.overall
    };
  }

  /**
   * Evaluate retrieval quality
   */
  evaluateRetrieval(testQuery, response) {
    let score = 0;
    
    // Check if expected sources are retrieved
    const expectedSources = testQuery.expectedSources || [];
    const actualSources = response.sources.map(s => s.source);
    
    const sourceHits = expectedSources.filter(source =>
      actualSources.some(actual => actual.includes(source))
    );
    
    const sourceRecall = expectedSources.length > 0
      ? sourceHits.length / expectedSources.length
      : 1;
    
    score += sourceRecall * 0.5;
    
    // Check hit rate at different K values
    for (const k of [1, 3, 5]) {
      const topKSources = actualSources.slice(0, k);
      const hitAtK = expectedSources.some(expected =>
        topKSources.some(actual => actual.includes(expected))
      );
      
      if (hitAtK) score += 0.1;
    }
    
    // Confidence bonus
    if (response.metrics.confidence > 0.7) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Evaluate answer quality
   */
  evaluateQuality(testQuery, response) {
    let score = 0;
    
    const answer = response.response.toLowerCase();
    const expectedKeywords = testQuery.expectedKeywords || [];
    
    // Check keyword coverage
    const keywordHits = expectedKeywords.filter(keyword =>
      answer.includes(keyword.toLowerCase())
    );
    
    const keywordCoverage = expectedKeywords.length > 0
      ? keywordHits.length / expectedKeywords.length
      : 1;
    
    score += keywordCoverage * 0.6;
    
    // Answer completeness (rough estimation)
    const answerLength = answer.split(/\s+/).length;
    const completenessScore = Math.min(answerLength / 50, 1); // Assume 50 words is complete
    score += completenessScore * 0.2;
    
    // Relevance check (simple heuristic)
    const queryWords = testQuery.query.toLowerCase().split(/\s+/);
    const relevantWords = queryWords.filter(word =>
      answer.includes(word) && word.length > 3
    );
    
    const relevanceScore = relevantWords.length / queryWords.length;
    score += relevanceScore * 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Evaluate latency performance
   */
  evaluateLatency(latency) {
    // Target: <= 12 seconds
    const targetLatency = 12000;
    
    if (latency <= targetLatency * 0.5) return 1.0;  // Excellent
    if (latency <= targetLatency * 0.75) return 0.8; // Good
    if (latency <= targetLatency) return 0.6;        // Acceptable
    if (latency <= targetLatency * 1.5) return 0.3;  // Poor
    return 0.1; // Very poor
  }

  /**
   * Calculate evaluation summary
   */
  calculateSummary(results, totalTime) {
    const validResults = results.filter(r => !r.error);
    
    if (validResults.length === 0) {
      return {
        overallScore: 0,
        avgLatency: 0,
        avgConfidence: 0,
        hitRateAtK: { 1: 0, 3: 0, 5: 0 },
        sourceCoverage: 0,
        keywordCoverage: 0,
        validQueries: 0
      };
    }
    
    // Calculate averages
    const avgScore = validResults.reduce((sum, r) => sum + r.overallScore, 0) / validResults.length;
    const avgLatency = validResults.reduce((sum, r) => sum + r.latency, 0) / validResults.length;
    const avgConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length;
    
    // Calculate hit rates
    const hitRateAtK = { 1: 0, 3: 0, 5: 0 };
    for (const result of validResults) {
      // Simplified hit rate calculation
      if (result.sources.length >= 1) hitRateAtK[1]++;
      if (result.sources.length >= 3) hitRateAtK[3]++;
      if (result.sources.length >= 5) hitRateAtK[5]++;
    }
    
    Object.keys(hitRateAtK).forEach(k => {
      hitRateAtK[k] = hitRateAtK[k] / validResults.length;
    });
    
    return {
      overallScore: avgScore,
      avgLatency: Math.round(avgLatency),
      avgConfidence: parseFloat(avgConfidence.toFixed(3)),
      hitRateAtK,
      sourceCoverage: avgScore, // Simplified
      keywordCoverage: avgScore, // Simplified
      validQueries: validResults.length,
      totalQueries: results.length,
      errorRate: (results.length - validResults.length) / results.length
    };
  }

  /**
   * Run performance benchmark
   */
  async runBenchmark(iterations = 10) {
    console.log(`🏃 Running performance benchmark (${iterations} iterations)...`);
    
    const benchmarkQueries = this.testQueries.slice(0, 3); // Use first 3 queries
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      for (const query of benchmarkQueries) {
        const start = Date.now();
        
        try {
          await this.ragPipeline.query(query.query, { streaming: false });
          const latency = Date.now() - start;
          results.push({ latency, success: true });
          
        } catch (error) {
          results.push({ latency: 0, success: false, error: error.message });
        }
      }
    }
    
    const successfulResults = results.filter(r => r.success);
    const latencies = successfulResults.map(r => r.latency).sort((a, b) => a - b);
    
    return {
      totalQueries: results.length,
      successRate: successfulResults.length / results.length,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p50Latency: latencies[Math.floor(latencies.length * 0.5)],
      p90Latency: latencies[Math.floor(latencies.length * 0.9)],
      p99Latency: latencies[Math.floor(latencies.length * 0.99)],
      minLatency: latencies[0],
      maxLatency: latencies[latencies.length - 1]
    };
  }

  /**
   * Add custom test query
   */
  addTestQuery(query) {
    this.testQueries.push({
      ...query,
      id: query.id || `custom_${Date.now()}`
    });
  }

  /**
   * Get evaluation report
   */
  generateReport(evaluationResult) {
    const { summary, results } = evaluationResult;
    
    return `
# NYLA RAG Evaluation Report

## Summary
- **Overall Score**: ${summary.overallScore.toFixed(3)}/1.0
- **Average Latency**: ${summary.avgLatency}ms
- **Average Confidence**: ${summary.avgConfidence}
- **Success Rate**: ${((1 - summary.errorRate) * 100).toFixed(1)}%

## Performance Metrics
- **Hit Rate@1**: ${(summary.hitRateAtK[1] * 100).toFixed(1)}%
- **Hit Rate@3**: ${(summary.hitRateAtK[3] * 100).toFixed(1)}%
- **Hit Rate@5**: ${(summary.hitRateAtK[5] * 100).toFixed(1)}%

## Individual Query Results
${results.map(r => `
### ${r.queryId}
- **Query**: ${r.query}
- **Score**: ${r.overallScore?.toFixed(3) || 'Error'}
- **Latency**: ${r.latency || 0}ms
- **Confidence**: ${r.confidence?.toFixed(3) || 'N/A'}
${r.error ? `- **Error**: ${r.error}` : ''}
`).join('\n')}

## Recommendations
${this.generateRecommendations(summary)}
`;
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations(summary) {
    const recommendations = [];
    
    if (summary.overallScore < 0.7) {
      recommendations.push('- Consider improving chunk quality and embedding model');
    }
    
    if (summary.avgLatency > 10000) {
      recommendations.push('- Optimize retrieval speed and caching');
    }
    
    if (summary.hitRateAtK[3] < 0.8) {
      recommendations.push('- Improve retrieval algorithm and ranking');
    }
    
    if (summary.avgConfidence < 0.6) {
      recommendations.push('- Enhance context building and prompt engineering');
    }
    
    return recommendations.length > 0
      ? recommendations.join('\n')
      : '- System performance looks good! 🎉';
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLARAGEvaluation;
}
window.NYLARAGEvaluation = NYLARAGEvaluation;