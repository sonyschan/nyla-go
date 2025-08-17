#!/usr/bin/env node
/**
 * Test Proper Noun Expansion for RAG System
 * Tests the WangChai/旺柴 example and other cross-lingual aliases
 */

// Import required modules (simulating browser environment)
const fs = require('fs');
const path = require('path');

// Load the scripts
const glossaryCode = fs.readFileSync(path.join(__dirname, 'pwa/js/rag/nyla-proper-noun-glossary.js'), 'utf8');
const expanderCode = fs.readFileSync(path.join(__dirname, 'pwa/js/rag/nyla-query-expander.js'), 'utf8');

// Simulate browser environment
global.window = {};
global.performance = { now: () => Date.now() };

// Execute the scripts in global scope
eval(glossaryCode);
eval(expanderCode);

// Get the classes - they should be available globally
const NYLAProperNounGlossary = global.window.NYLAProperNounGlossary || global.NYLAProperNounGlossary;
const NYLAQueryExpander = global.window.NYLAQueryExpander || global.NYLAQueryExpander;

// Debug: check what's available
console.log('Available classes:');
console.log('NYLAProperNounGlossary:', typeof NYLAProperNounGlossary);
console.log('NYLAQueryExpander:', typeof NYLAQueryExpander);
console.log();

async function testProperNounExpansion() {
  console.log('🧪 Testing NYLA Proper Noun Expansion System');
  console.log('='.repeat(60));

  // Initialize components
  const glossary = new NYLAProperNounGlossary();
  const expander = new NYLAQueryExpander(glossary, { debug: true });

  // Test queries focusing on the original WangChai/旺柴 problem
  const testQueries = [
    // Primary test case: Chinese to English
    '旺柴',
    '跟我說說旺柴這個項目',
    '旺柴的社区在哪里?',
    
    // Reverse: English to Chinese 
    'WangChai',
    'Tell me about WangChai project',
    'Where is WangChai community?',
    
    // Mixed language
    'WangChai (旺柴) information',
    'What is 旺柴 and WangChai?',
    
    // Other proper nouns
    'NYLA agent capabilities',
    'How does Solana work?',
    '@shax_btc contact information',
    'BONK token price',
    
    // Complex queries
    '我想了解NYLA和旺柴的合作关系',
    'NYLA x WangChai AMA sessions',
    
    // No expansion expected
    'How do I send tokens?',
    'What are gas fees?',
  ];

  console.log('\n📊 Glossary Statistics:');
  console.log(glossary.getStats());
  console.log();

  let totalTests = 0;
  let expandedTests = 0;

  for (const query of testQueries) {
    totalTests++;
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔍 Query ${totalTests}: "${query}"`);
    console.log('─'.repeat(50));
    
    try {
      const result = await expander.expandQuery(query);
      
      console.log(`📝 Original: ${result.originalQuery}`);
      console.log(`🌐 Expanded Queries (${result.expandedQueries.length}):`);
      result.expandedQueries.forEach((q, i) => {
        const isOriginal = i === 0;
        console.log(`  ${i + 1}. ${isOriginal ? '(original)' : '(expanded)'} ${q}`);
      });
      
      if (result.matchedTerms.length > 0) {
        expandedTests++;
        console.log(`\n🏷️  Matched Terms (${result.matchedTerms.length}):`);
        result.matchedTerms.forEach(term => {
          console.log(`  - "${term.original}" → ${term.primary} [${term.category}]`);
        });
      }
      
      console.log(`\n⏱️  Processing: ${result.metadata.processingTime.toFixed(2)}ms`);
      console.log(`✨ Has Expansions: ${result.hasExpansions ? 'Yes' : 'No'}`);
      
      // Simulate what would happen in BM25 search (keep exact matches)
      if (result.hasExpansions && query.includes('旺柴')) {
        console.log('\n💡 BM25 Benefit: Original "旺柴" preserved for exact script matching');
        console.log('💡 Dense Search Benefit: "WangChai" variants for semantic similarity');
      }
      
    } catch (error) {
      console.error(`❌ Test failed for "${query}":`, error);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Queries Tested: ${totalTests}`);
  console.log(`Queries with Expansions: ${expandedTests}`);
  console.log(`Expansion Rate: ${((expandedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Performance test
  console.log('\n⚡ Performance Test: 100 rapid expansions');
  const perfStart = Date.now();
  for (let i = 0; i < 100; i++) {
    await expander.expandQuery('旺柴项目信息');
  }
  const perfEnd = Date.now();
  console.log(`Average expansion time: ${((perfEnd - perfStart) / 100).toFixed(2)}ms`);
  
  console.log('\n✅ Proper noun expansion testing completed!');
  
  return {
    totalTests,
    expandedTests,
    expansionRate: (expandedTests / totalTests) * 100
  };
}

// Run the tests
if (require.main === module) {
  testProperNounExpansion().then(results => {
    console.log(`\n🎯 Final Results: ${results.expandedTests}/${results.totalTests} queries expanded (${results.expansionRate.toFixed(1)}%)`);
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { testProperNounExpansion };