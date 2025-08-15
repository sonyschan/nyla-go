#!/usr/bin/env node

/**
 * Test URL output functionality in LLM responses
 * Verifies that the LLM can include URLs like https://x.com/WangChaidotbonk
 */

console.log('🧪 Testing LLM URL Output Functionality');
console.log('='.repeat(50));

// Test cases for URL output
const testQueries = [
  {
    query: "Where is WangChai's community?",
    expectedUrls: ["https://x.com/WangChaidotbonk", "https://t.me/wechatdogesol"],
    description: "Should return WangChai social media links"
  },
  {
    query: "旺柴的社区在哪里？",
    expectedUrls: ["https://x.com/WangChaidotbonk"],
    description: "Chinese query should return X.com link"
  },
  {
    query: "How do I contact WangChai team?",
    expectedUrls: ["https://x.com/WangChaidotbonk"],
    description: "Contact query should include official X account"
  },
  {
    query: "WangChai official links",
    expectedUrls: ["linktr.ee/WangchaiDoge"],
    description: "Should include Linktree and other official channels"
  }
];

// URL validation function
function validateUrls(responseText, expectedUrls) {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const foundUrls = responseText.match(urlPattern) || [];
  
  console.log(`📋 Found URLs: ${foundUrls.length > 0 ? foundUrls.join(', ') : 'None'}`);
  
  const validUrls = foundUrls.filter(url => {
    try {
      new URL(url.replace(/[.,;:!?]+$/, '')); // Remove trailing punctuation
      return true;
    } catch (e) {
      return false;
    }
  });
  
  console.log(`✅ Valid URLs: ${validUrls.length}/${foundUrls.length}`);
  
  const expectedFound = expectedUrls.some(expectedUrl => 
    foundUrls.some(foundUrl => foundUrl.includes(expectedUrl.replace('https://', '')))
  );
  
  return {
    totalUrls: foundUrls.length,
    validUrls: validUrls.length,
    expectedFound,
    foundUrls
  };
}

// Test instructions
console.log('📝 Test Instructions:');
console.log('1. Open NYLAGo PWA in browser');
console.log('2. Try each query below in the chat');
console.log('3. Verify URLs appear in responses');
console.log('4. Check URLs are clickable and valid');
console.log('');

testQueries.forEach((test, index) => {
  console.log(`🔍 Test ${index + 1}: ${test.description}`);
  console.log(`   Query: "${test.query}"`);
  console.log(`   Expected URLs: ${test.expectedUrls.join(', ')}`);
  console.log('');
});

console.log('🎯 Success Criteria:');
console.log('- URLs appear in LLM responses');
console.log('- URLs are properly formatted (https://...)');
console.log('- URLs are clickable in the UI');
console.log('- No [invalid URL removed] messages');
console.log('- Character limit accommodates URLs + context');

console.log('');
console.log('📊 To test programmatically, integrate with NYLARAGIntegration.processQuestion()');

// Export for potential integration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testQueries, validateUrls };
}