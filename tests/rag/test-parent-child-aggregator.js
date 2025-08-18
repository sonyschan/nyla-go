/**
 * Test Parent-Child Aggregator Fixes
 * Tests the redundant grouping and score normalization fixes
 */

// Mock test data that reproduces the reported issues
const mockChildResults = [
  {
    id: 'chunk_117',
    text: 'Individual chunk content',
    score: 0.85,
    finalScore: 0.85,
    metadata: {
      title: 'Individual chunk'
    }
  },
  {
    id: 'ecosystem_wangchai_1',
    text: 'WangChai technical details part 1',
    score: 0.92,
    finalScore: 0.92,
    metadata: {
      source: 'knowledge_base:ecosystem/wangchai/technical_details',
      category: 'ecosystem',
      section: 'technical_specs'
    }
  },
  {
    id: 'ecosystem_wangchai_2',
    text: 'WangChai technical details part 2',
    score: 0.88,
    finalScore: 0.88,
    metadata: {
      source: 'knowledge_base:ecosystem/wangchai/technical_details',
      category: 'ecosystem',
      section: 'technical_specs'
    }
  },
  {
    id: 'uniswap_v3_1',
    text: 'Uniswap V3 information part 1',
    score: 0.90,
    finalScore: 0.90,
    metadata: {
      source: 'knowledge_base:ethereum/uniswap-v3/overview',
      category: 'ethereum',
      section: 'defi'
    }
  },
  {
    id: 'uniswap_v3_2',
    text: 'Uniswap V3 information part 2',
    score: 0.87,
    finalScore: 0.87,
    metadata: {
      source: 'knowledge_base:ethereum/uniswap-v3/technical',
      category: 'ethereum',
      section: 'defi'
    }
  }
];

async function testParentChildAggregator() {
  console.log('🧪 Testing Parent-Child Aggregator Fixes...\n');
  
  // Test 1: Check grouping logic
  console.log('=== TEST 1: Parent Grouping Logic ===');
  const aggregator = new NYLAParentChildAggregator({
    maxParentTokens: 1200,
    scoreAggregationMethod: 'max_plus_mean',
    multiHitBonus: 0.1
  });
  
  // Test the grouping
  const groups = aggregator.groupByParent(mockChildResults);
  console.log(`✅ Created ${groups.size} parent groups (expected: 3)`);
  
  // Verify group structure
  for (const [parentId, children] of groups.entries()) {
    console.log(`   Group "${parentId}": ${children.length} children`);
    console.log(`     Child IDs: ${children.map(c => c.id).join(', ')}`);
  }
  
  // Test 2: Score aggregation and normalization
  console.log('\n=== TEST 2: Score Aggregation ===');
  const scoredParents = aggregator.scoreParentGroups(groups);
  
  console.log('Scored parent results:');
  scoredParents.forEach((parent, i) => {
    console.log(`   ${i + 1}. ${parent.parentId}:`);
    console.log(`      Base Score: ${parent.baseScore.toFixed(3)}`);
    console.log(`      Multi-hit Bonus: ${parent.multiHitBonus.toFixed(3)}`);
    console.log(`      Raw Final: ${parent.rawFinalScore.toFixed(3)}`);
    console.log(`      Final Score: ${parent.aggregatedScore.toFixed(3)}`);
    console.log(`      Child Count: ${parent.childCount}`);
  });
  
  // Test 3: Full aggregation pipeline
  console.log('\n=== TEST 3: Full Aggregation Pipeline ===');
  const parentBlocks = await aggregator.aggregateToParents(mockChildResults, 3);
  
  console.log(`✅ Generated ${parentBlocks.length} parent blocks`);
  parentBlocks.forEach((block, i) => {
    console.log(`   ${i + 1}. Parent ID: ${block.parentId}`);
    console.log(`      Final Score: ${block.finalScore.toFixed(3)}`);
    console.log(`      Child Count: ${block.childCount}`);
    console.log(`      Build Method: ${block.parentBuildMethod}`);
  });
  
  // Test 4: Verify score distribution
  console.log('\n=== TEST 4: Score Distribution Analysis ===');
  const scores = parentBlocks.map(b => b.finalScore);
  const uniqueScores = [...new Set(scores.map(s => s.toFixed(3)))];
  
  console.log(`✅ Score distribution: ${uniqueScores.join(', ')}`);
  console.log(`✅ Unique scores: ${uniqueScores.length} (should be > 1 if fixed)`);
  
  if (uniqueScores.length > 1) {
    console.log('🎉 SUCCESS: Score normalization bug is FIXED!');
  } else {
    console.log('❌ ISSUE: All scores are still the same');
  }
  
  // Test 5: Verify grouping efficiency  
  console.log('\n=== TEST 5: Grouping Efficiency ===');
  const totalInputChunks = mockChildResults.length;
  const groupCount = groups.size;
  const expectedGroups = 3; // chunk_117, knowledge_base:ecosystem/wangchai, knowledge_base:ethereum/uniswap-v3
  
  if (groupCount === expectedGroups) {
    console.log('🎉 SUCCESS: Redundant grouping is FIXED!');
  } else {
    console.log(`❌ ISSUE: Expected ${expectedGroups} groups, got ${groupCount}`);
  }
  
  console.log('\n🧪 Test completed!');
}

// Run the test if in browser environment
if (typeof window !== 'undefined' && window.NYLAParentChildAggregator) {
  testParentChildAggregator().catch(console.error);
} else {
  console.log('⚠️ NYLAParentChildAggregator not available. Load in browser environment.');
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testParentChildAggregator, mockChildResults };
}