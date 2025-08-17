/**
 * Test Founder Query Analysis
 * Analyze why "NYLA創辦人有誰？" doesn't retrieve founder information
 */

const fs = require('fs');
const path = require('path');

function analyzeFounderQuery() {
  console.log('🔍 Analyzing Founder Query Retrieval Issue\n');
  
  // 1. Check if founder data exists in KB
  console.log('📚 1. Knowledge Base Analysis:');
  
  try {
    const teamFile = fs.readFileSync('pwa/kb/about/team.json', 'utf8');
    const teamData = JSON.parse(teamFile);
    
    console.log('✅ Found team.json with chunks:', teamData.chunks.length);
    
    const founderChunks = teamData.chunks.filter(chunk => 
      chunk.tags.includes('founder') || chunk.tags.includes('co-founder')
    );
    
    console.log('✅ Founder-related chunks:', founderChunks.length);
    founderChunks.forEach(chunk => {
      console.log(`   - ${chunk.id}: ${chunk.title}`);
      console.log(`     Tags: ${chunk.tags.join(', ')}`);
      console.log(`     Chinese summary: ${chunk.summary_zh}`);
    });
  } catch (error) {
    console.log('❌ Error reading team.json:', error.message);
  }
  
  // 2. Check glossary for Chinese founder terms
  console.log('\n📖 2. Glossary Analysis:');
  
  try {
    const glossaryFile = fs.readFileSync('pwa/kb/glossary/terms.json', 'utf8');
    const glossaryData = JSON.parse(glossaryFile);
    
    const founderTerms = ['創辦人', '創始人', '開發者', '團隊', 'founder', 'co-founder', 'team', 'developer'];
    
    console.log('Checking for founder-related terms in glossary:');
    founderTerms.forEach(term => {
      const found = JSON.stringify(glossaryData).includes(term);
      console.log(`   ${found ? '✅' : '❌'} "${term}": ${found ? 'FOUND' : 'MISSING'}`);
    });
  } catch (error) {
    console.log('❌ Error reading glossary:', error.message);
  }
  
  // 3. Analyze query rewrite patterns
  console.log('\n🔄 3. Query Rewrite Pattern Analysis:');
  
  try {
    const glossaryFile = fs.readFileSync('pwa/kb/glossary/terms.json', 'utf8');
    const glossaryData = JSON.parse(glossaryFile);
    
    if (glossaryData.query_rewrite_patterns) {
      console.log('✅ Query rewrite patterns exist');
      
      // Check if founder queries are covered
      const chinesePatterns = glossaryData.query_rewrite_patterns.chinese_to_english || {};
      const expansionTerms = glossaryData.query_rewrite_patterns.expansion_terms || {};
      
      console.log('Chinese founder patterns:');
      Object.entries(chinesePatterns).forEach(([chinese, english]) => {
        if (chinese.includes('創辦人') || chinese.includes('創始人') || chinese.includes('團隊')) {
          console.log(`   ✅ "${chinese}" → ${english.join(', ')}`);
        }
      });
      
      console.log('Expansion terms for founder concepts:');
      const founderKeys = ['founder', 'team', 'developer', 'creator'];
      founderKeys.forEach(key => {
        if (expansionTerms[key]) {
          console.log(`   ✅ ${key}: ${expansionTerms[key].join(', ')}`);
        } else {
          console.log(`   ❌ ${key}: MISSING`);
        }
      });
    } else {
      console.log('❌ No query rewrite patterns found');
    }
  } catch (error) {
    console.log('❌ Error analyzing patterns:', error.message);
  }
  
  // 4. Test query processing simulation
  console.log('\n🧪 4. Query Processing Simulation:');
  
  const testQuery = 'NYLA創辦人有誰？';
  console.log(`Query: "${testQuery}"`);
  
  // Simulate intent detection (current system)
  const currentIntentPatterns = {
    team: /team|founder|developer/i,  // Missing Chinese terms
    transfers: /send|transfer|payment/i,
    blockchain: /blockchain|solana|ethereum/i
  };
  
  console.log('Current intent detection:');
  Object.entries(currentIntentPatterns).forEach(([intent, pattern]) => {
    const matches = pattern.test(testQuery);
    console.log(`   ${intent}: ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
  });
  
  // Simulate improved intent detection
  const improvedIntentPatterns = {
    team: /team|founder|developer|創辦人|創始人|開發者|團隊/i,  // With Chinese terms
    transfers: /send|transfer|payment|發送|轉賬|支付/i,
    blockchain: /blockchain|solana|ethereum|區塊鏈/i
  };
  
  console.log('\nImproved intent detection (with Chinese):');
  Object.entries(improvedIntentPatterns).forEach(([intent, pattern]) => {
    const matches = pattern.test(testQuery);
    console.log(`   ${intent}: ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
  });
  
  // 5. Check embedding vector database
  console.log('\n🔢 5. Vector Database Analysis:');
  
  try {
    const vectorDbPath = 'pwa/data/nyla-vector-db.json';
    if (fs.existsSync(vectorDbPath)) {
      const vectorDbFile = fs.readFileSync(vectorDbPath, 'utf8');
      const vectorDb = JSON.parse(vectorDbFile);
      
      console.log(`✅ Vector database exists with ${vectorDb.chunks ? vectorDb.chunks.length : 'unknown'} chunks`);
      
      if (vectorDb.chunks) {
        const founderChunks = vectorDb.chunks.filter(chunk => 
          chunk.content && (
            chunk.content.includes('founder') || 
            chunk.content.includes('@shax_btc') || 
            chunk.content.includes('創辦人') ||
            chunk.content.includes('創始人')
          )
        );
        
        console.log(`✅ Chunks mentioning founder concepts: ${founderChunks.length}`);
        founderChunks.forEach(chunk => {
          console.log(`   - ID: ${chunk.id}`);
          console.log(`     Content preview: ${chunk.content.substring(0, 100)}...`);
        });
      }
    } else {
      console.log('❌ Vector database not found at pwa/data/nyla-vector-db.json');
    }
  } catch (error) {
    console.log('❌ Error reading vector database:', error.message);
  }
  
  // 6. Summary and recommendations
  console.log('\n📋 6. Summary & Recommendations:');
  console.log('');
  console.log('IDENTIFIED ISSUES:');
  console.log('1. ❌ Intent detection missing Chinese founder terms (創辦人, 創始人, 開發者, 團隊)');
  console.log('2. ❌ Glossary missing Chinese founder terminology');
  console.log('3. ❌ Query rewrite patterns missing founder-specific mappings');
  console.log('');
  console.log('REQUIRED FIXES:');
  console.log('1. 🔧 Add Chinese founder terms to intent detection patterns');
  console.log('2. 🔧 Update glossary with founder terminology in both languages');
  console.log('3. 🔧 Add query rewrite patterns for founder queries');
  console.log('4. 🔧 Rebuild RAG embeddings after KB updates');
  console.log('5. 🔧 Test founder query retrieval after fixes');
}

analyzeFounderQuery();