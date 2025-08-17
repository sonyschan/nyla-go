/**
 * Test NYLA Founder Query
 * Verify if the Chinese founder query works correctly
 */

// Test the founder query processing
function testFounderQuery() {
  console.log('🧪 Testing NYLA Founder Query Processing...\n');
  
  const query = "NYLA創辦人有誰？";
  console.log(`📝 Testing query: "${query}"`);
  
  // Test intent detection with current patterns
  function detectIntent(query) {
    const intents = {
      team: /(team|founder|creator|developer|who.*created|who.*developed|who.*founded|who.*made|創辦人|創始人|開發者|團隊|誰創造|誰開發|開發團隊|創建者)/i,
      social_media: /(social|links|follow|contact|community|channels|where.*find|join.*community|official.*links|twitter|telegram|x\.com|linktree|x.*account|twitter.*account|社交|社区|联系|聯絡|连接|連結|关注|關注|加入|联系方式|聯絡方式|官方.*账户|官方.*帳戶|官方.*渠道|如何.*联系|如何.*聯絡|在哪.*找到|怎么.*联系|怎麼.*聯絡)/i,
      general: /(what|explain|tell me|describe)/i
    };
    
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(query)) {
        return intent;
      }
    }
    return 'general';
  }
  
  // Test the query
  const detectedIntent = detectIntent(query);
  console.log(`📋 Detected intent: ${detectedIntent}`);
  
  // Test individual Chinese founder terms
  const chineseTerms = ['創辦人', '創始人', '開發者', '團隊', '誰創造', '誰開發'];
  console.log('\n📚 Chinese term matching:');
  chineseTerms.forEach(term => {
    const found = query.includes(term);
    console.log(`  ${found ? '✅' : '❌'} "${term}" in query: ${found}`);
  });
  
  // Check if the pattern matches
  const teamPattern = /(team|founder|creator|developer|who.*created|who.*developed|who.*founded|who.*made|創辦人|創始人|開發者|團隊|誰創造|誰開發|開發團隊|創建者)/i;
  const patternMatch = teamPattern.test(query);
  console.log(`\n🎯 Team pattern match: ${patternMatch ? '✅ YES' : '❌ NO'}`);
  
  if (!patternMatch) {
    console.log('\n❌ ISSUE: Query not matching team pattern!');
    console.log('Query:', query);
    console.log('Pattern:', teamPattern.toString());
  } else {
    console.log('\n✅ SUCCESS: Query should be detected as team intent');
  }
}

testFounderQuery();