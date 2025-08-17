/**
 * Test Chinese Intent Detection
 * Verify the new Chinese patterns work correctly
 */

// Test the enhanced Chinese patterns
function testChineseIntentDetection() {
  console.log('🧪 Testing Enhanced Chinese Intent Detection...\n');
  
  // Mock detectIntent function with the updated patterns
  function detectIntent(query) {
    const intents = {
      social_media: /(social|links|follow|contact|community|channels|where.*find|join.*community|official.*links|twitter|telegram|x\.com|linktree|x.*account|twitter.*account|社交|社区|联系|关注|加入|联系方式|官方.*账户|官方.*渠道|如何.*联系|在哪.*找到|怎么.*联系)/i,
      howTo: /^(how (to|do)|can i|what.*steps)/i,
      general: /(what|explain|tell me|describe)/i
    };
    
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(query)) {
        return intent;
      }
    }
    return 'general';
  }
  
  // Test queries with new Chinese patterns
  const testQueries = [
    // Original working patterns
    "請給我旺柴的社運連結",
    "旺柴的社区在哪里",
    "如何联系项目方",
    
    // New patterns I added
    "项目的联系方式是什么",     // 联系方式
    "官方账户在哪里",          // 官方账户  
    "官方渠道有哪些",          // 官方渠道
    "如何联系开发团队",        // 如何联系
    "在哪找到社区",           // 在哪找到
    "怎么联系客服",           // 怎么联系
    
    // Non-social queries (should NOT match)
    "项目的技术规格",
    "代币价格",
    "什么是区块链"
  ];
  
  console.log('📋 Testing social media intent detection:\n');
  
  testQueries.forEach(query => {
    const intent = detectIntent(query);
    const isSocial = intent === 'social_media';
    const icon = isSocial ? '✅' : '❌';
    console.log(`${icon} "${query}" → ${intent}`);
  });
  
  // Summary
  const socialQueries = testQueries.slice(0, 9); // First 9 should be social
  const nonSocialQueries = testQueries.slice(9); // Last 3 should NOT be social
  
  const socialDetected = socialQueries.filter(q => detectIntent(q) === 'social_media').length;
  const nonSocialCorrect = nonSocialQueries.filter(q => detectIntent(q) !== 'social_media').length;
  
  console.log('\n📊 Results Summary:');
  console.log(`✅ Social queries detected: ${socialDetected}/${socialQueries.length}`);
  console.log(`✅ Non-social queries correctly identified: ${nonSocialCorrect}/${nonSocialQueries.length}`);
  console.log(`🎯 Overall accuracy: ${((socialDetected + nonSocialCorrect) / testQueries.length * 100).toFixed(1)}%`);
}

testChineseIntentDetection();