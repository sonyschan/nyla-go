/**
 * NYLA Knowledge Base Keyword Calculator (DEPRECATED)
 * 
 * NOTE: This file is deprecated as of the structured KB migration.
 * Topic identification now uses dynamic metadata from /pwa/kb/ via RAG system.
 * 
 * Legacy hardcoded keywords have been replaced with:
 * - Dynamic 'type' categories: about, facts, howto, faq, etc.
 * - Dynamic 'section' groupings: team, transfers, supported_networks, etc. 
 * - Dynamic 'tags' from KB content
 * 
 * See nyla-conversation-v2.js identifyRelevantKnowledgeKeys() method.
 */

// DEPRECATED: Topic keywords now extracted dynamically from structured KB metadata
const deprecatedTopicKeywords = {
  // This data is no longer used - kept for reference only
};

// Concept keywords from nyla-knowledge-tracker.js
const conceptMappings = {
  'crypto-transfers': ['transfer', 'send', 'payment', 'transaction'],
  'multi-blockchain': ['blockchain', 'solana', 'ethereum', 'algorand', 'multi-chain'],
  'payment-requests': ['request', 'receive', 'payment', 'invoice'],
  'qr-generation': ['qr', 'code', 'scan', 'generate'],
  'community-building': ['community', 'together', 'ecosystem', 'social'],
  'social-viral': ['viral', 'share', 'post', 'social', 'x.com', 'twitter'],
  'token-economics': ['token', 'nyla', 'economics', 'value', 'utility'],
  'defi-integration': ['defi', 'decentralized', 'finance', 'protocol'],
  'user-experience': ['easy', 'simple', 'user', 'experience', 'interface'],
  'mobile-first': ['mobile', 'phone', 'app', 'pwa', 'responsive'],
  'web3-adoption': ['web3', 'adoption', 'mainstream', 'accessible'],
  'cross-chain': ['cross-chain', 'bridge', 'interoperability']
};

// Feature keywords from nyla-knowledge-tracker.js
const featureMappings = {
  'send-tokens': ['send', 'transfer', 'sending'],
  'receive-payments': ['receive', 'payment', 'receiving'],
  'generate-qr': ['generate', 'create', 'qr'],
  'scan-qr': ['scan', 'scanning', 'camera'],
  'share-request': ['share', 'sharing', 'link'],
  'join-raids': ['raid', 'community', 'engagement'],
  'community-apps': ['apps', 'application', 'community'],
  'extension-mode': ['extension', 'browser', 'chrome'],
  'pwa-mode': ['pwa', 'progressive', 'web app'],
  'x-integration': ['x.com', 'twitter', 'post'],
  'telegram-integration': ['telegram', 'bot', 'messaging'],
  'multi-token-support': ['token', 'multiple', 'different'],
  'custom-tokens': ['custom', 'add token', 'manage']
};

// Additional keywords from content.js
const additionalKeywords = ['nyla', 'agentnyla', 'agent nyla'];

// LLM keywords from nyla-conversation-v2.js
const llmKeywords = ['why', 'how can', 'what if', 'compare', 'explain', 'understand', 'help me'];

function calculateTotalKeywords() {
  const allKeywords = new Set();
  
  // Add topic keywords
  Object.values(topicKeywords).forEach(keywords => {
    keywords.forEach(keyword => allKeywords.add(keyword.toLowerCase()));
  });
  
  // Add concept keywords
  Object.values(conceptMappings).forEach(keywords => {
    keywords.forEach(keyword => allKeywords.add(keyword.toLowerCase()));
  });
  
  // Add feature keywords
  Object.values(featureMappings).forEach(keywords => {
    keywords.forEach(keyword => allKeywords.add(keyword.toLowerCase()));
  });
  
  // Add additional keywords
  additionalKeywords.forEach(keyword => allKeywords.add(keyword.toLowerCase()));
  
  // Add LLM keywords
  llmKeywords.forEach(keyword => allKeywords.add(keyword.toLowerCase()));
  
  return allKeywords;
}

function analyzeKeywordDistribution() {
  const allKeywords = calculateTotalKeywords();
  const keywordArray = Array.from(allKeywords).sort();
  
  console.log('=== NYLA Knowledge Base Keyword Analysis ===\n');
  
  console.log('📊 KEYWORD DISTRIBUTION BY CATEGORY:');
  console.log('=====================================');
  
  // Topic keywords
  const topicKeywordSet = new Set();
  Object.values(topicKeywords).forEach(keywords => {
    keywords.forEach(keyword => topicKeywordSet.add(keyword.toLowerCase()));
  });
  console.log(`Topic Keywords: ${topicKeywordSet.size} unique keywords`);
  
  // Concept keywords
  const conceptKeywordSet = new Set();
  Object.values(conceptMappings).forEach(keywords => {
    keywords.forEach(keyword => conceptKeywordSet.add(keyword.toLowerCase()));
  });
  console.log(`Concept Keywords: ${conceptKeywordSet.size} unique keywords`);
  
  // Feature keywords
  const featureKeywordSet = new Set();
  Object.values(featureMappings).forEach(keywords => {
    keywords.forEach(keyword => featureKeywordSet.add(keyword.toLowerCase()));
  });
  console.log(`Feature Keywords: ${featureKeywordSet.size} unique keywords`);
  
  // Additional keywords
  console.log(`Additional Keywords: ${additionalKeywords.length} keywords`);
  
  // LLM keywords
  console.log(`LLM Keywords: ${llmKeywords.length} keywords`);
  
  console.log('\n📈 TOTAL KEYWORDS:');
  console.log('==================');
  console.log(`Total unique keywords in KB: ${allKeywords.size}`);
  
  console.log('\n🔍 DETAILED KEYWORD BREAKDOWN:');
  console.log('==============================');
  
  // Show keywords by category
  console.log('\nTopic Keywords:');
  Array.from(topicKeywordSet).sort().forEach(keyword => {
    console.log(`  - ${keyword}`);
  });
  
  console.log('\nConcept Keywords:');
  Array.from(conceptKeywordSet).sort().forEach(keyword => {
    console.log(`  - ${keyword}`);
  });
  
  console.log('\nFeature Keywords:');
  Array.from(featureKeywordSet).sort().forEach(keyword => {
    console.log(`  - ${keyword}`);
  });
  
  console.log('\nAdditional Keywords:');
  additionalKeywords.forEach(keyword => {
    console.log(`  - ${keyword}`);
  });
  
  console.log('\nLLM Keywords:');
  llmKeywords.forEach(keyword => {
    console.log(`  - ${keyword}`);
  });
  
  console.log('\n🎯 KEYWORD MATCHING CAPABILITIES:');
  console.log('==================================');
  console.log(`• Total keywords available for matching: ${allKeywords.size}`);
  console.log(`• Keywords can be matched in user queries`);
  console.log(`• Keywords can be matched in knowledge base content`);
  console.log(`• Keywords support case-insensitive matching`);
  console.log(`• Keywords are used for topic identification and relevance scoring`);
  
  return {
    totalKeywords: allKeywords.size,
    topicKeywords: topicKeywordSet.size,
    conceptKeywords: conceptKeywordSet.size,
    featureKeywords: featureKeywordSet.size,
    additionalKeywords: additionalKeywords.length,
    llmKeywords: llmKeywords.length,
    allKeywords: keywordArray
  };
}

// Run the analysis
const analysis = analyzeKeywordDistribution();

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { analysis, calculateTotalKeywords, analyzeKeywordDistribution };
} 