/**
 * Debug Score Flattening Issue
 * Focus on finding where scores get flattened to 1.000 in the parent-child aggregation
 */

// Mock browser globals
global.window = {};

console.log('🔍 Debugging Score Flattening in Parent-Child Pipeline');

const NYLAParentChildAggregator = require('../../pwa/js/rag/nyla-parent-child-aggregator.js');
const NYLACrossEncoder = require('../../pwa/js/rag/nyla-cross-encoder.js');

async function debugScoreFlattening() {
  console.log('📊 Testing with actual scores from browser logs...');
  
  // Recreate the exact scenario from browser logs
  const hybridResults = [
    {
      id: 'chunk_chunk_117_1',
      finalScore: 1.5449,  // Before parent-child
      originalScore: 0.8574,
      source: 'dense+bm25'
    },
    {
      id: 'chunk_118',
      finalScore: 1.4679,  // Before parent-child
      originalScore: 0.8374,
      source: 'dense+bm25'
    },
    {
      id: 'chunk_109',
      finalScore: 0.1628,  // Before parent-child
      originalScore: 0.8139,
      source: 'dense'
    }
  ];
  
  console.log('🔄 Input scores to Parent-Child Aggregator:', hybridResults.map(r => ({
    id: r.id,
    finalScore: r.finalScore,
    originalScore: r.originalScore
  })));
  
  // Test Cross-Encoder first to see if it's flattening scores
  console.log('\n📋 Step 1: Testing Cross-Encoder Score Impact');
  const crossEncoder = new NYLACrossEncoder();
  
  const query = '旺柴的合約';
  
  // Simulate cross-encoder processing
  for (let i = 0; i < hybridResults.length; i++) {
    const result = hybridResults[i];
    
    // Test the fallback scoring that might be capping
    const fallbackScore = crossEncoder.calculateFallbackScore(query, {
      text: `Mock document content for ${result.id}`,
      finalScore: result.originalScore
    });
    
    console.log(`Cross-encoder fallback for ${result.id}:`, {
      input: result.originalScore,
      fallback: fallbackScore.toFixed(4),
      capped: fallbackScore === 1.0 ? '❌ CAPPED' : '✅ NOT CAPPED'
    });
  }
  
  // Test parent-child aggregator
  console.log('\n📋 Step 2: Testing Parent-Child Aggregator');
  const aggregator = new NYLAParentChildAggregator({
    maxParentTokens: 1200,
    scoreAggregationMethod: 'max_plus_mean',
    multiHitBonus: 0.1,
    maxMultiHitBonus: 0.3
  });
  
  // Add metadata to match real scenario AND add crossEncoderScore to test priority fix
  const mockChunks = hybridResults.map(result => ({
    ...result,
    crossEncoderScore: 1.0,  // This was masking finalScore in the browser
    text: `Mock content for ${result.id}`,
    metadata: {
      source: result.id.includes('chunk_117') ? 'chunk_117' : 
              result.id.includes('chunk_118') ? 'knowledge_base:ecosystem_wangchai_technical_details' :
              'knowledge_base:ethereum/uniswap-v3',
      title: result.id.includes('wangchai') || result.id.includes('117') || result.id.includes('118') ? 
             'WangChai Project Info' : 'Other Content'
    }
  }));
  
  console.log('📊 Mock chunks for aggregation:', mockChunks.map(c => ({
    id: c.id,
    finalScore: c.finalScore,
    source: c.metadata.source
  })));
  
  // Run aggregation
  const aggregatedResults = await aggregator.aggregateToParents(mockChunks, 3);
  
  console.log('\n🏁 Parent-Child Aggregation Results:');
  aggregatedResults.forEach((result, i) => {
    console.log(`  ${i + 1}. ${result.id || result.parentId}:`);
    console.log(`     Final Score: ${result.finalScore || result.aggregatedScore}`);
    console.log(`     Original Input Score: ${hybridResults[i]?.finalScore || 'N/A'}`);
    console.log(`     Score Preserved: ${
      Math.abs((result.finalScore || result.aggregatedScore) - hybridResults[i]?.finalScore) < 0.1 ? 
      '✅ YES' : '❌ NO (FLATTENED)'
    }`);
  });
  
  // Check if all results are 1.000
  const allScoresOne = aggregatedResults.every(r => 
    Math.abs((r.finalScore || r.aggregatedScore) - 1.0) < 0.001
  );
  
  console.log('\n🎯 Final Diagnosis:');
  console.log(`All scores flattened to 1.000: ${allScoresOne ? '❌ YES' : '✅ NO'}`);
  
  if (allScoresOne) {
    console.log('\n🔍 PROBLEM FOUND: Parent-Child Aggregator is flattening scores to 1.000');
    console.log('This suggests the issue is in the aggregation logic, not the cross-encoder.');
  } else {
    console.log('\n✅ Parent-Child Aggregator preserves score distribution correctly');
    console.log('The issue must be elsewhere in the pipeline.');
  }
  
  // Additional debugging: Check if it's the score method
  console.log('\n🔬 Testing Different Aggregation Methods:');
  const methods = ['max', 'mean', 'max_plus_mean'];
  
  for (const method of methods) {
    const testAggregator = new NYLAParentChildAggregator({
      maxParentTokens: 1200,
      scoreAggregationMethod: method,
      multiHitBonus: 0.1,
      maxMultiHitBonus: 0.3
    });
    
    const testResults = await testAggregator.aggregateToParents(mockChunks, 3);
    const testScores = testResults.map(r => r.finalScore || r.aggregatedScore);
    
    console.log(`  ${method}: [${testScores.map(s => s?.toFixed(3)).join(', ')}]`);
  }
}

debugScoreFlattening().catch(console.error);