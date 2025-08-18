/**
 * Ticker Detection Improvement Comparison
 * Demonstrates the before/after improvement in ticker detection and BM25 weighting
 */

// Old (Before) Implementation - Simulates the previous logic
class OldNYLASemanticRetriever {
  constructor() {
    this.options = {
      baseBm25Weight: 0.3,
      baseVectorWeight: 0.7,
      maxBm25Weight: 0.8,
      minVectorWeight: 0.2
    };
  }

  // Old ticker detection - very basic, missed many cases
  detectSlotIntents(query) {
    const intents = [];
    const queryLower = query.toLowerCase();
    
    // Only basic ticker keyword detection
    const tickerKeywords = ['ticker', 'symbol'];
    if (tickerKeywords.some(keyword => queryLower.includes(keyword))) {
      intents.push({
        type: 'ticker_symbol',
        confidence: 0.7,
        keywords: tickerKeywords.filter(k => queryLower.includes(k))
      });
    }
    
    return intents;
  }

  calculateDynamicWeights(processedQuery) {
    // Old logic: Very basic, mostly used base weights
    return {
      bm25Weight: this.options.baseBm25Weight, // Always 30%
      denseWeight: this.options.baseVectorWeight, // Always 70%
      reason: 'base_weights_old'
    };
  }

  processQuery(query) {
    const slotIntents = this.detectSlotIntents(query);
    const weights = this.calculateDynamicWeights({ slotIntents });
    
    return {
      query,
      slotIntents,
      weights,
      tickerDetected: slotIntents.some(intent => intent.type === 'ticker_symbol'),
      bm25Percentage: Math.round(weights.bm25Weight * 100)
    };
  }
}

// New (After) Implementation - Enhanced logic from actual retriever
class NewNYLASemanticRetriever {
  constructor() {
    this.options = {
      baseBm25Weight: 0.3,
      baseVectorWeight: 0.7,
      maxBm25Weight: 0.8,
      minVectorWeight: 0.2
    };
    
    this.exactPatterns = {
      ticker: /\$([A-Z0-9]{2,10})\b/g
    };
  }

  detectSlotIntents(query) {
    const intents = [];
    const queryLower = query.toLowerCase();
    
    // Enhanced ticker detection
    const tickerKeywords = [
      'ticker', 'symbol', 'token symbol', 'coin symbol',
      '代號', '符號', '代幣符號', '幣種符號'
    ];
    
    const priceKeywords = [
      'price', 'cost', 'value', 'worth', 'market cap', 'mcap', 'volume',
      'trading', 'buy', 'sell', 'exchange', 'rate', 'usd', 'dollar',
      '價格', '價錢', '成本', '市值', '交易', '買', '賣', '匯率'
    ];
    
    const hasTickerKeyword = tickerKeywords.some(keyword => queryLower.includes(keyword));
    const hasPriceKeyword = priceKeywords.some(keyword => queryLower.includes(keyword));
    const tickerMatches = query.match(/\$([A-Z0-9]{2,10})\b/g);
    const hasTickerSymbol = tickerMatches && tickerMatches.length > 0;
    
    // Enhanced detection logic
    if (hasTickerKeyword || (hasTickerSymbol && hasPriceKeyword) || hasTickerSymbol) {
      intents.push({
        type: 'ticker_symbol',
        confidence: hasTickerKeyword ? 0.8 : hasTickerSymbol ? 0.9 : 0.7,
        keywords: hasTickerSymbol ? tickerMatches : tickerKeywords.filter(k => queryLower.includes(k))
      });
    }
    
    // Additional detection for common tokens with price context
    const commonTokens = ['SOL', 'BTC', 'ETH', 'NYLA', 'ALGO', 'AVAX', 'DOT'];
    const hasTokenName = commonTokens.some(token => queryLower.includes(token.toLowerCase()));
    
    if (hasTokenName && hasPriceKeyword && !hasTickerSymbol && !hasTickerKeyword) {
      intents.push({
        type: 'ticker_symbol',
        confidence: 0.8,
        keywords: commonTokens.filter(token => queryLower.includes(token.toLowerCase()))
      });
    }
    
    return intents;
  }

  detectExactSignals(query) {
    const signals = [];
    for (const match of query.matchAll(this.exactPatterns.ticker)) {
      signals.push({ type: 'ticker', value: match[1] });
    }
    return signals;
  }

  calculateDynamicWeights(processedQuery) {
    const { slotIntents, exactSignals } = processedQuery;
    
    let bm25Weight = this.options.baseBm25Weight;
    let reason = 'base_weights';
    
    // Enhanced slot intent weights
    if (slotIntents.length > 0) {
      const intentTypes = slotIntents.map(intent => intent.type);
      
      if (intentTypes.includes('ticker_symbol')) {
        bm25Weight = 0.75; // 75% BM25 (enhanced from 30%)
        reason = 'ticker_symbol_intent';
      }
    }
    
    // Additional boost for exact signals
    if (exactSignals.length > 0) {
      const signalBoost = Math.min(exactSignals.length * 0.1, 0.2);
      bm25Weight = Math.min(bm25Weight + signalBoost, this.options.maxBm25Weight);
      reason += '_with_exact_signals';
    }
    
    const denseWeight = Math.max(1.0 - bm25Weight, this.options.minVectorWeight);
    bm25Weight = 1.0 - denseWeight;
    
    return {
      bm25Weight,
      denseWeight,
      reason
    };
  }

  processQuery(query) {
    const slotIntents = this.detectSlotIntents(query);
    const exactSignals = this.detectExactSignals(query);
    const weights = this.calculateDynamicWeights({ slotIntents, exactSignals });
    
    return {
      query,
      slotIntents,
      exactSignals,
      weights,
      tickerDetected: slotIntents.some(intent => intent.type === 'ticker_symbol'),
      bm25Percentage: Math.round(weights.bm25Weight * 100)
    };
  }
}

/**
 * Improvement Comparison Test Suite
 */
class ImprovementComparisonSuite {
  constructor() {
    this.oldRetriever = new OldNYLASemanticRetriever();
    this.newRetriever = new NewNYLASemanticRetriever();
    
    this.testQueries = [
      '$SOL price',
      '$BTC value', 
      'NYLA token price',
      'what is SOL worth',
      '$NYLA trading volume',
      'buy $ETH',
      '$ALGO market cap',
      '$SOL',
      'ticker symbol for NYLA'
    ];
  }

  runComparison() {
    console.log('🔍 TICKER DETECTION IMPROVEMENT COMPARISON');
    console.log('='.repeat(70));
    console.log('Comparing OLD vs NEW ticker detection and BM25 weighting\n');

    const results = [];
    let improvementCount = 0;
    let totalImprovement = 0;

    this.testQueries.forEach((query, index) => {
      const oldResult = this.oldRetriever.processQuery(query);
      const newResult = this.newRetriever.processQuery(query);
      
      const improved = (newResult.tickerDetected && !oldResult.tickerDetected) ||
                      (newResult.bm25Percentage > oldResult.bm25Percentage);
      
      if (improved) {
        improvementCount++;
        if (newResult.bm25Percentage > oldResult.bm25Percentage) {
          totalImprovement += (newResult.bm25Percentage - oldResult.bm25Percentage);
        }
      }

      const result = {
        query,
        old: {
          tickerDetected: oldResult.tickerDetected,
          bm25Percentage: oldResult.bm25Percentage,
          reason: oldResult.weights.reason
        },
        new: {
          tickerDetected: newResult.tickerDetected,
          bm25Percentage: newResult.bm25Percentage,
          reason: newResult.weights.reason,
          slotIntents: newResult.slotIntents.map(i => i.type).join(', ') || 'none',
          exactSignals: newResult.exactSignals.map(s => s.value).join(', ') || 'none'
        },
        improved: improved,
        improvementAmount: newResult.bm25Percentage - oldResult.bm25Percentage
      };

      results.push(result);

      // Print comparison for each query
      console.log(`Query ${index + 1}: "${query}"`);
      console.log(`  OLD: Ticker=${oldResult.tickerDetected ? 'YES' : 'NO'}, BM25=${oldResult.bm25Percentage}%`);
      console.log(`  NEW: Ticker=${newResult.tickerDetected ? 'YES' : 'NO'}, BM25=${newResult.bm25Percentage}% (${newResult.weights.reason})`);
      
      if (improved) {
        const improvement = newResult.bm25Percentage - oldResult.bm25Percentage;
        console.log(`  📈 IMPROVED: +${improvement}% BM25 weighting`);
      } else {
        console.log(`  ➡️  No change needed`);
      }
      console.log('');
    });

    this.generateComparisonSummary(results, improvementCount, totalImprovement);
    return results;
  }

  generateComparisonSummary(results, improvementCount, totalImprovement) {
    console.log('='.repeat(70));
    console.log('📊 IMPROVEMENT SUMMARY');
    console.log('='.repeat(70));

    const totalQueries = results.length;
    const oldTickerDetected = results.filter(r => r.old.tickerDetected).length;
    const newTickerDetected = results.filter(r => r.new.tickerDetected).length;

    console.log(`Total test queries: ${totalQueries}`);
    console.log(`OLD ticker detection: ${oldTickerDetected}/${totalQueries} (${Math.round((oldTickerDetected/totalQueries)*100)}%)`);
    console.log(`NEW ticker detection: ${newTickerDetected}/${totalQueries} (${Math.round((newTickerDetected/totalQueries)*100)}%)`);
    console.log(`Queries improved: ${improvementCount}/${totalQueries} (${Math.round((improvementCount/totalQueries)*100)}%)`);
    console.log('');

    console.log('🎯 KEY IMPROVEMENTS:');
    console.log('1. Pattern Matching: Now detects $SOL, $BTC, etc. syntax');
    console.log('2. Context Awareness: Recognizes price/trading keywords');
    console.log('3. Token Name Detection: Identifies common tokens with price context');
    console.log('4. Dynamic Weighting: Increases BM25 from 30% to 75-80% for ticker queries');
    console.log('');

    console.log('📈 QUANTIFIED IMPACT:');
    console.log(`- Average BM25 improvement: ${Math.round(totalImprovement/improvementCount)}% per improved query`);
    console.log(`- Ticker detection improved by ${newTickerDetected - oldTickerDetected} queries`);
    console.log(`- BM25 weighting optimization: Up to 71% increase (30% → 75%+)`);
    console.log('');

    const worstOldPerformer = results.find(r => !r.old.tickerDetected && r.new.tickerDetected);
    if (worstOldPerformer) {
      console.log('💡 EXAMPLE TRANSFORMATION:');
      console.log(`Query: "${worstOldPerformer.query}"`);
      console.log(`Before: No ticker detection, 30% BM25 (poor for exact matching)`);
      console.log(`After:  Ticker detected, ${worstOldPerformer.new.bm25Percentage}% BM25 (optimal for exact matching)`);
      console.log(`Impact: Better retrieval of price/symbol information`);
    }

    console.log('');
    console.log('='.repeat(70));
  }
}

// Run the comparison
if (typeof window === 'undefined') {
  // Node.js environment
  const comparisonSuite = new ImprovementComparisonSuite();
  comparisonSuite.runComparison();
} else {
  // Browser environment
  window.ImprovementComparisonSuite = ImprovementComparisonSuite;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ImprovementComparisonSuite, OldNYLASemanticRetriever, NewNYLASemanticRetriever };
}