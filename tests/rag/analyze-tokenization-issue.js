/**
 * Analyze the BM25 Tokenization Issue for Chinese Queries
 * This test demonstrates the precision problem with aggressive bi-gram tokenization
 */

console.log('🔍 Analyzing BM25 Tokenization Issue for Chinese Queries\n');

// Mock browser globals for Node.js
global.window = { indexedDB: null };
global.indexedDB = null;

// Load the BM25 index class
const NYLABm25Index = require('../../pwa/js/rag/nyla-bm25-index.js');

function createTestData() {
  return [
    {
      id: 'wangchai_contract',
      text: 'WangChai contract address information',
      search_text: 'WangChai 旺柴 contract address 合約地址 83kGGSggYGP2ZEEyvX54SkZR1kFn84RgGCDyptbDbonk',
      metadata: { title: 'WangChai Contract Information' }
    },
    {
      id: 'algorand_partnership', 
      text: 'Algorand partnership details with various projects',
      search_text: 'Algorand partnership ecosystem 柴的其他项目 的合作伙伴关系',
      metadata: { title: 'Algorand Partnerships' }
    },
    {
      id: 'technical_specs',
      text: 'Technical specifications for blockchain projects',
      search_text: 'technical specs blockchain 技术规格 合約 details implementation',
      metadata: { title: 'Technical Specifications' }
    }
  ];
}

async function analyzeTokenization() {
  console.log('=== Current Tokenization Analysis ===\n');
  
  const bm25 = new NYLABm25Index();
  const testData = createTestData();
  
  // Build index
  await bm25.buildIndex(testData);
  console.log('📊 Index built with', bm25.getStats().totalDocuments, 'documents\n');
  
  // Test problematic query
  const query = '旺柴的合約';
  console.log(`🎯 Testing query: "${query}"\n`);
  
  // Get detailed tokenization
  const tokens = bm25.tokenize(query);
  console.log('📝 Current tokenization produces:', tokens);
  console.log('   - Full term:', tokens.includes('旺柴的合約') ? '✅' : '❌');
  console.log('   - Meaningful parts:', tokens.includes('旺柴') ? '✅ 旺柴' : '❌ 旺柴', tokens.includes('合約') ? '✅ 合約' : '❌ 合約');
  console.log('   - Noise tokens:', tokens.filter(t => ['柴的', '的合'].includes(t)).length, 'noise tokens');
  
  // Show which documents match each token
  console.log('\n🔍 Token → Document Matching:');
  for (const token of tokens) {
    const matchingDocs = [];
    for (const [docId, docInfo] of bm25.documents.entries()) {
      if (docInfo.tokens.includes(token)) {
        matchingDocs.push(docId);
      }
    }
    console.log(`   "${token}" → [${matchingDocs.join(', ')}] ${matchingDocs.length === 0 ? '❌' : matchingDocs.length > 1 ? '⚠️' : '✅'}`);
  }
  
  // Run actual search
  const results = await bm25.search(query, 10);
  console.log('\n📊 Search Results:');
  if (results.length > 0) {
    results.forEach((result, i) => {
      console.log(`   ${i+1}. ${result.id} (score: ${result.score.toFixed(3)})`);
      console.log(`      search_text: "${result.search_text.substring(0, 80)}..."`);
    });
  } else {
    console.log('   ❌ No results above threshold');
  }
  
  console.log('\n=== Problem Analysis ===');
  console.log('❌ Issue: Noise tokens "柴的" and "的合" create false matches');
  console.log('❌ Issue: Fragments match unrelated content (Algorand with "柴的")');
  console.log('❌ Issue: No exact "旺柴的合約" matching despite clear intent');
  
  return { tokens, results, bm25 };
}

async function demonstrateExactMatching() {
  console.log('\n=== Proposed Solution: Tag-Based Exact Matching ===\n');
  
  // Simulate improved tokenization focusing on exact terms and meaningful entities
  function improvedTokenize(text) {
    if (!text) return [];
    
    const tokens = [];
    
    // Extract English words and crypto patterns (unchanged)
    const englishTokens = text.toLowerCase()
      .split(/[\s\.,;:!?()[\]{}"'`~\-_+=<>|\\\/]+/)
      .filter(token => token.length >= 2 && !isStopWord(token));
    tokens.push(...englishTokens);
    
    // Extract Chinese terms - CONSERVATIVE approach
    const chineseChars = text.match(/[\u4e00-\u9fff]+/g) || [];
    
    for (const chineseStr of chineseChars) {
      // ALWAYS add the full Chinese string (most important)
      tokens.push(chineseStr);
      
      // Only add bi-grams for longer strings (4+ characters) to reduce noise
      if (chineseStr.length >= 4) {
        for (let i = 0; i < chineseStr.length - 1; i++) {
          const bigram = chineseStr.slice(i, i + 2);
          // Skip meaningless connecting bi-grams
          if (!['的合', '柴的', '个的', '们的', '它的'].includes(bigram)) {
            tokens.push(bigram);
          }
        }
      }
      
      // Add individual characters only for 2-character terms
      if (chineseStr.length === 2) {
        tokens.push(...chineseStr);
      }
    }
    
    return [...new Set(tokens)];
  }
  
  function isStopWord(token) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
    ]);
    return stopWords.has(token);
  }
  
  // Test improved tokenization
  const query = '旺柴的合約';
  const currentTokens = new NYLABm25Index().tokenize(query);
  const improvedTokens = improvedTokenize(query);
  
  console.log('📝 Current tokenization:', currentTokens);
  console.log('📝 Improved tokenization:', improvedTokens);
  
  console.log('\n✅ Improvements:');
  console.log('   - Preserves full query "旺柴的合約"');
  console.log('   - Keeps meaningful parts "旺柴", "合約"');
  console.log('   - Eliminates noise tokens "柴的", "的合"');
  console.log('   - Reduces false matches with unrelated content');
  
  return { currentTokens, improvedTokens };
}

async function runAnalysis() {
  try {
    await analyzeTokenization();
    await demonstrateExactMatching();
    
    console.log('\n=== Recommendations ===');
    console.log('1. 🎯 EXACT TAG MATCHING: Prioritize exact keyword matching for crypto terms');
    console.log('2. 🚫 NOISE REDUCTION: Filter out meaningless Chinese bi-grams like "的合", "柴的"');
    console.log('3. 🔍 HYBRID APPROACH: Combine exact matching with selective bi-grams');
    console.log('4. 📊 LENGTH THRESHOLD: Only bi-gram Chinese strings ≥4 characters');
    console.log('5. 🎨 SEMANTIC PRIORITY: Let semantic search handle natural language, BM25 handle exact terms');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

runAnalysis();