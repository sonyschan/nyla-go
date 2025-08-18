/**
 * Test Score Preservation Fix
 * Verify that scores are not flattened to 1.0 throughout the pipeline
 */

// Mock browser globals for Node.js
global.window = { 
  indexedDB: null,
  nylaSemanticRetriever: null 
};
global.indexedDB = null;

console.log('🧪 Testing Score Preservation Fix');

const NYLACrossEncoder = require('../../pwa/js/rag/nyla-cross-encoder.js');
const NYLAParentChildAggregator = require('../../pwa/js/rag/nyla-parent-child-aggregator.js');

async function testScorePreservation() {
  console.log('🔧 Testing Cross-Encoder Score Distribution...');
  
  // Test cross-encoder doesn't cap scores at 1.0
  const crossEncoder = new NYLACrossEncoder();
  
  // Create test cases with different score scenarios
  const testCases = [
    {
      query: '旺柴的合約',
      document: 'WangChai 旺柴 contract 合約 address technical specifications',
      expectedRange: 'high'
    },
    {
      query: '旺柴的合約', 
      document: 'Some random unrelated content about other things',
      expectedRange: 'low'
    },
    {
      query: '$NYLA ticker',
      document: 'NYLA ticker symbol $NYLA official token information',
      expectedRange: 'high'
    }
  ];
  
  console.log('📊 Cross-Encoder Fallback Scores:');
  const fallbackScores = [];
  
  for (const testCase of testCases) {
    const result = { text: testCase.document, finalScore: 0 };
    const score = crossEncoder.calculateFallbackScore(testCase.query, result);
    fallbackScores.push(score);
    console.log(`  Query: "${testCase.query}"`);
    console.log(`  Doc: "${testCase.document.substring(0, 50)}..."`);
    console.log(`  Score: ${score.toFixed(4)} (${testCase.expectedRange} expected)`);
    console.log('  ---');
  }
  
  // Check score distribution
  const minScore = Math.min(...fallbackScores);
  const maxScore = Math.max(...fallbackScores);
  const scoreRange = maxScore - minScore;
  
  console.log('📈 Score Distribution Analysis:');
  console.log(`  Min Score: ${minScore.toFixed(4)}`);
  console.log(`  Max Score: ${maxScore.toFixed(4)}`);
  console.log(`  Score Range: ${scoreRange.toFixed(4)}`);
  console.log(`  Distribution: ${scoreRange > 0.1 ? '✅ GOOD (varied)' : '❌ FLATTENED'}`);
  
  // Test Parent-Child Aggregator
  console.log('\n🔧 Testing Parent-Child Aggregator...');
  
  const aggregator = new NYLAParentChildAggregator({
    maxParentTokens: 1200,
    scoreAggregationMethod: 'max_plus_mean',
    multiHitBonus: 0.1,
    maxMultiHitBonus: 0.3
  });
  
  // Create mock chunks with different scores
  const mockChunks = [
    {
      id: 'chunk_117_1',
      finalScore: 1.5449,
      text: 'WangChai contract technical details',
      metadata: { source: 'chunk_117', parent_chunk: 'chunk_117' }
    },
    {
      id: 'chunk_118',
      finalScore: 1.4679,
      text: 'Technical specifications and community channels',
      metadata: { source: 'knowledge_base:ecosystem_wangchai_technical_details' }
    },
    {
      id: 'chunk_109',
      finalScore: 0.1628,
      text: 'Ethereum Uniswap v3 integration details',
      metadata: { source: 'knowledge_base:ethereum/uniswap-v3' }
    }
  ];
  
  const result = await aggregator.aggregateToParents(mockChunks, 3);
  
  console.log('🔍 Parent-Child Aggregation Results:');
  result.forEach((parent, i) => {
    console.log(`  Parent ${i + 1}: ${parent.parentId}`);
    console.log(`    Child Count: ${parent.childCount}`);
    console.log(`    Base Score: ${parent.baseScore?.toFixed(4) || 'N/A'}`);
    console.log(`    Multi-Hit Bonus: ${parent.multiHitBonus?.toFixed(4) || 'N/A'}`);
    console.log(`    Aggregated Score: ${parent.aggregatedScore.toFixed(4)}`);
    console.log(`    Original Child Score: ${parent.children[0]?.finalScore?.toFixed(4) || 'N/A'}`);
    console.log('    ---');
  });
  
  // Verify scores are not all 1.000
  const aggregatedScores = result.map(p => p.aggregatedScore);
  const aggMinScore = Math.min(...aggregatedScores);
  const aggMaxScore = Math.max(...aggregatedScores);
  const aggScoreRange = aggMaxScore - aggMinScore;
  
  console.log('📊 Final Score Analysis:');
  console.log(`  Min Aggregated Score: ${aggMinScore.toFixed(4)}`);
  console.log(`  Max Aggregated Score: ${aggMaxScore.toFixed(4)}`);
  console.log(`  Aggregated Score Range: ${aggScoreRange.toFixed(4)}`);
  
  const isFixed = !aggregatedScores.every(score => Math.abs(score - 1.0) < 0.001);
  console.log(`  Score Preservation: ${isFixed ? '✅ FIXED' : '❌ STILL BROKEN'}`);
  
  if (isFixed) {
    console.log('\n🎉 SUCCESS: Score distribution is preserved throughout the pipeline!');
  } else {
    console.log('\n❌ FAILURE: Scores are still being flattened to 1.000');
  }
}

testScorePreservation().catch(console.error);