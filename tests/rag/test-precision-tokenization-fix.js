/**
 * Test Enhanced BM25 Tokenization Precision Fix
 * Validates that noise bi-gram filtering eliminates false matches
 */

// Mock browser globals for Node.js
global.window = {};

console.log('🎯 Testing BM25 Tokenization Precision Fix');

// Load BM25 index module
const NYLABm25Index = require('../../pwa/js/rag/nyla-bm25-index.js');

async function testTokenizationPrecision() {
  console.log('🔧 Creating BM25 index with test data...');
  
  const bm25Index = new NYLABm25Index({
    minScore: 0.05,  // Lower threshold to capture all relevant results
    maxResults: 10
  });
  
  // Create test chunks simulating the precision problem
  const testChunks = [
    {
      id: 'chunk_wangchai_contract',
      text: 'WangChai contract technical specifications and official channels',
      search_text: 'WangChai 旺柴 contract 合約 合约地址 CA technical specifications 技术规格 official channels 官方渠道',
      metadata: {
        title: 'WangChai Contract Information',
        type: 'contract_info'
      }
    },
    {
      id: 'chunk_algorand_partnership', 
      text: 'Algorand Foundation partnership emphasizing sustainable blockchain',
      search_text: 'Algorand Foundation partnership 合作伙伴 sustainable blockchain partnership agreement 合作协议',
      metadata: {
        title: 'Algorand Foundation Partnership',
        type: 'partnership'
      }
    },
    {
      id: 'chunk_wangchai_project',
      text: 'WangChai comprehensive project overview and NYLA partnership',
      search_text: 'WangChai 旺柴 comprehensive project 项目概述 overview NYLA partnership 合作伙伴关系',
      metadata: {
        title: 'WangChai Project Overview',
        type: 'project_info'
      }
    }
  ];
  
  // Build BM25 index
  await bm25Index.buildIndex(testChunks);
  
  console.log('✅ BM25 index built with', testChunks.length, 'test chunks');
  
  // Test the problematic query that was returning wrong results
  const testQuery = '旺柴的合約';
  console.log(`\n🔍 Testing query: "${testQuery}"`);
  
  // Get tokenization details
  const queryTokens = bm25Index.tokenize(testQuery);
  console.log('📝 Query tokenization:', {
    query: testQuery,
    tokens: queryTokens,
    tokenCount: queryTokens.length,
    hasNoiseTokens: queryTokens.some(t => ['的合', '柴的', '合的', '约的'].includes(t))
  });
  
  // Perform search
  const results = await bm25Index.search(testQuery, 5);
  
  console.log('\n📊 Search Results:');
  results.forEach((result, i) => {
    console.log(`  ${i + 1}. ${result.id} - Score: ${result.score.toFixed(4)}`);
    console.log(`     Title: ${result.metadata.title}`);
    console.log(`     Type: ${result.metadata.type}`);
    console.log(`     Search Text Sample: "${result.search_text.substring(0, 60)}..."`);
  });
  
  // Validate precision improvement
  console.log('\n🎯 Precision Analysis:');
  
  const wangchaiResults = results.filter(r => 
    r.id.includes('wangchai') || r.metadata.title.includes('WangChai')
  );
  const algorandResults = results.filter(r => 
    r.id.includes('algorand') || r.metadata.title.includes('Algorand')
  );
  
  console.log('✅ WangChai-related results:', wangchaiResults.length);
  console.log('❌ Unrelated (Algorand) results:', algorandResults.length);
  
  // Expected behavior: WangChai results should rank higher than Algorand
  const topResult = results[0];
  const isWangchaiTopResult = topResult && (
    topResult.id.includes('wangchai') || 
    topResult.metadata.title.includes('WangChai')
  );
  
  console.log('\n📈 Precision Test Results:');
  console.log('- Top result is WangChai-related:', isWangchaiTopResult ? '✅ PASS' : '❌ FAIL');
  console.log('- No noise tokens in query:', !queryTokens.some(t => ['的合', '柴的'].includes(t)) ? '✅ PASS' : '❌ FAIL');
  console.log('- WangChai results found:', wangchaiResults.length > 0 ? '✅ PASS' : '❌ FAIL');
  
  // Test more queries to validate comprehensive fix
  console.log('\n🧪 Additional Test Cases:');
  
  const additionalTests = [
    '合約地址',
    'WangChai项目',
    '技术规格'
  ];
  
  for (const query of additionalTests) {
    const tokens = bm25Index.tokenize(query);
    const searchResults = await bm25Index.search(query, 3);
    
    console.log(`\nQuery "${query}":`, {
      tokenCount: tokens.length,
      noNoiseTokens: !tokens.some(t => ['的合', '柴的', '合的', '约的', '技的', '术的'].includes(t)),
      resultsFound: searchResults.length,
      topResultRelevant: searchResults[0] && (
        searchResults[0].search_text.includes(query) || 
        tokens.some(token => searchResults[0].search_text.includes(token))
      )
    });
  }
  
  console.log('\n🎉 Tokenization precision test completed!');
}

// Run the test
testTokenizationPrecision().catch(console.error);