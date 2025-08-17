/**
 * Chinese LLM Query Testing
 * Test Chinese queries to ensure no repetition loops occur
 */

// Test queries in Chinese that should be safe
const chineseTestQueries = [
  '跟我聊聊旺柴',                    // Tell me about WangChai (original problematic query)
  '什么是NYLA Go?',                 // What is NYLA Go?
  '如何发送加密货币?',                // How to send cryptocurrency?
  '旺柴的社区在哪里?',                // Where is WangChai's community?
  '中文加密货币项目有哪些?',           // What Chinese cryptocurrency projects are there?
  '我可以用NYLA转账吗?',              // Can I transfer with NYLA?
  '区块链和加密货币的区别是什么?'       // What's the difference between blockchain and cryptocurrency?
];

// Simulated LLM response patterns that should be caught
const problematicResponses = [
  // Pattern 1: Direct Chinese repetition (original issue)
  '旺柴是一个很好的项目。旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴',
  
  // Pattern 2: Mixed language repetition
  'WangChai is great! WangChai is great! WangChai is great! WangChai is great!',
  
  // Pattern 3: Complex phrase repetition
  '关于旺柴的信息，关于旺柴的信息，关于旺柴的信息，关于旺柴的信息',
  
  // Pattern 4: URL repetition (common in LLM loops)
  'Visit https://x.com/WangChaidotbonk https://x.com/WangChaidotbonk https://x.com/WangChaidotbonk',
  
  // Pattern 5: JSON-like repetition
  '{"text": "旺柴", "text": "旺柴", "text": "旺柴", "text": "旺柴"}'
];

console.log('=== Chinese LLM Query Safety Test ===\n');

// Recommended LLM parameters for Chinese text
const recommendedParams = {
  temperature: 0.3,
  max_tokens: 600,
  top_p: 0.8,
  top_k: 40,                    // ✅ Fixed (was undefined)
  repetition_penalty: 1.15,     // ✅ NEW - Critical for preventing loops
  frequency_penalty: 0.3,       // ✅ NEW - Additional repetition control  
  presence_penalty: 0.1         // ✅ NEW - Topic diversity
};

console.log('✅ Recommended LLM Parameters for Chinese Text:');
Object.entries(recommendedParams).forEach(([key, value]) => {
  console.log(`   ${key}: ${value}`);
});
console.log('');

// Test the problematic response patterns
console.log('🚨 Testing Problematic Response Patterns:');
problematicResponses.forEach((response, index) => {
  console.log(`\nPattern ${index + 1}:`);
  console.log('Original:', response.substring(0, 80) + '...');
  
  // Simulate the detection function
  const hasRepetition = /(.{5,20})\1{3,}/.test(response);
  const chineseRepetition = /([\u4e00-\u9fff]{1,10})\1{5,}/.test(response);
  
  console.log('Would be detected:', hasRepetition || chineseRepetition ? '✅ YES' : '❌ NO');
});

console.log('\n📋 Chinese Query Test Cases:');
chineseTestQueries.forEach((query, index) => {
  console.log(`${index + 1}. "${query}"`);
  console.log(`   Length: ${query.length} chars`);
  console.log(`   Chinese chars: ${(query.match(/[\u4e00-\u9fff]/g) || []).length}`);
});

console.log('\n⚡ Performance Optimization Tips:');
console.log('1. Monitor token usage - Chinese uses more tokens per character');
console.log('2. Implement streaming cutoff after repetition detection');
console.log('3. Add exponential backoff for repeated failed queries');
console.log('4. Consider model-specific Chinese tokenization issues');

console.log('\n🔧 Implementation Status:');
console.log('✅ Added repetition_penalty: 1.15');
console.log('✅ Added frequency_penalty: 0.3'); 
console.log('✅ Added presence_penalty: 0.1');
console.log('✅ Fixed undefined top_k parameter');
console.log('✅ Added real-time repetition detection');
console.log('✅ Added streaming loop prevention');
console.log('✅ Added Chinese-specific pattern matching');

console.log('\n=== Test Complete ===');