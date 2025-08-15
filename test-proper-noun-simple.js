#!/usr/bin/env node
/**
 * Simple Test for Proper Noun Expansion
 * Direct module testing
 */

// Directly require the modules using Node.js require 
const NYLAProperNounGlossary = require('./pwa/js/rag/nyla-proper-noun-glossary.js');
const NYLAQueryExpander = require('./pwa/js/rag/nyla-query-expander.js');

async function testBasicExpansion() {
  console.log('🧪 Testing Basic Proper Noun Expansion');
  console.log('='.repeat(50));
  
  // Test 1: Initialize components
  console.log('1. Initializing components...');
  const glossary = new NYLAProperNounGlossary();
  const expander = new NYLAQueryExpander(glossary);
  
  console.log('✅ Components initialized');
  
  // Test 2: Check glossary statistics
  console.log('\n2. Glossary statistics:');
  const stats = glossary.getStats();
  console.log(`   Entries: ${stats.entries}`);
  console.log(`   Total aliases: ${stats.totalAliases}`);
  console.log(`   Categories: ${stats.categories.join(', ')}`);
  
  // Test 3: Test key proper noun expansion
  const testQueries = [
    '旺柴',  // Chinese -> should expand to WangChai variants
    'WangChai', // English -> should expand to Chinese variants
    'NYLA agent', // Should expand NYLA variants
    'normal query' // Should not expand
  ];
  
  console.log('\n3. Testing query expansion:');
  
  for (const query of testQueries) {
    console.log(`\n   Query: "${query}"`);
    
    const result = await expander.expandQuery(query);
    
    console.log(`   Expansions (${result.expandedQueries.length}):`);
    result.expandedQueries.forEach((q, i) => {
      console.log(`     ${i + 1}. ${q}`);
    });
    
    if (result.matchedTerms.length > 0) {
      console.log(`   Matched terms:`);
      result.matchedTerms.forEach(term => {
        console.log(`     - ${term.original} → ${term.primary} [${term.category}]`);
      });
    } else {
      console.log(`   No matches found`);
    }
  }
  
  // Test 4: Specific WangChai test
  console.log('\n4. Specific WangChai/旺柴 test:');
  
  const wangchaiTests = [
    '旺柴项目怎么样?',
    'Tell me about WangChai project',
    'WangChai (旺柴) information'
  ];
  
  for (const query of wangchaiTests) {
    console.log(`\n   Query: "${query}"`);
    const result = await expander.expandQuery(query);
    
    if (result.hasExpansions) {
      console.log(`   ✅ Successfully expanded to ${result.expandedQueries.length} variants`);
      console.log(`   Original: ${query}`);
      console.log(`   Best expansion: ${result.expandedQueries[1] || 'none'}`);
    } else {
      console.log(`   ❌ No expansions found`);
    }
  }
  
  console.log('\n✅ Basic expansion testing completed!');
}

// Run the test
if (require.main === module) {
  testBasicExpansion().catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
}