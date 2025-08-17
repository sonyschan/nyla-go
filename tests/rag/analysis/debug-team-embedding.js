/**
 * Debug Team Embedding Issue
 * Check if team.json is being processed correctly during embedding build
 */

const fs = require('fs');
const path = require('path');

async function debugTeamEmbedding() {
  console.log('🔍 Debugging Team Embedding Issue\n');
  
  // 1. Check if team.json exists and is readable
  console.log('📁 1. Checking team.json file:');
  try {
    const teamPath = 'pwa/kb/about/team.json';
    const teamContent = fs.readFileSync(teamPath, 'utf8');
    const teamData = JSON.parse(teamContent);
    
    console.log('✅ team.json exists and is valid JSON');
    console.log(`✅ Contains ${teamData.chunks.length} chunks`);
    
    teamData.chunks.forEach(chunk => {
      console.log(`   - ${chunk.id}: ${chunk.title}`);
      console.log(`     Type: ${chunk.type}, Lang: ${chunk.lang}`);
      console.log(`     Tags: ${chunk.tags.join(', ')}`);
      console.log(`     Body length: ${chunk.body.length} chars`);
      console.log(`     Has Chinese summary: ${!!chunk.summary_zh}`);
      console.log('');
    });
  } catch (error) {
    console.log('❌ Error reading team.json:', error.message);
    return;
  }
  
  // 2. Check if team.json is in the ingest file list
  console.log('📋 2. Checking ingest file lists:');
  
  try {
    // Check nyla-environment.js
    const envPath = 'pwa/js/rag/nyla-environment.js';
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasTeamInEnv = envContent.includes('about/team.json');
    console.log(`✅ team.json in nyla-environment.js: ${hasTeamInEnv}`);
    
    // Check nyla-multilingual-ingest.js
    const ingestPath = 'pwa/js/rag/nyla-multilingual-ingest.js';
    const ingestContent = fs.readFileSync(ingestPath, 'utf8');
    const hasTeamInIngest = ingestContent.includes('about/team.json');
    console.log(`✅ team.json in nyla-multilingual-ingest.js: ${hasTeamInIngest}`);
  } catch (error) {
    console.log('❌ Error checking ingest files:', error.message);
  }
  
  // 3. Check if team content is being filtered out
  console.log('\n🔍 3. Checking content filtering:');
  
  try {
    const teamData = JSON.parse(fs.readFileSync('pwa/kb/about/team.json', 'utf8'));
    
    // Simulate the filtering process
    const FilterService = require('./pwa/js/rag/nyla-content-filter.js');
    
    // This might fail if the module uses ES6 imports
    console.log('Attempting to test content filtering...');
  } catch (error) {
    console.log('⚠️ Cannot test filtering directly:', error.message);
    
    // Manual test of common filter patterns
    const teamData = JSON.parse(fs.readFileSync('pwa/kb/about/team.json', 'utf8'));
    const sampleChunk = teamData.chunks[0];
    
    // Test marketing patterns
    const marketingTerms = [
      'amazing', 'incredible', 'best', 'revolutionary', 'guaranteed',
      'enterprise', 'solution', 'platform', 'product'
    ];
    
    const hasMarketingTerms = marketingTerms.some(term => 
      sampleChunk.body.toLowerCase().includes(term)
    );
    
    console.log('✅ Sample chunk content:', sampleChunk.body.substring(0, 100) + '...');
    console.log(`✅ Contains marketing terms: ${hasMarketingTerms}`);
  }
  
  // 4. Check current vector database content
  console.log('\n📊 4. Checking current vector database:');
  
  try {
    const vectorDbPath = 'pwa/data/nyla-vector-db.json';
    if (fs.existsSync(vectorDbPath)) {
      const vectorDb = JSON.parse(fs.readFileSync(vectorDbPath, 'utf8'));
      
      console.log(`✅ Vector DB has ${vectorDb.chunks.length} total chunks`);
      
      // Search for team-related chunks in various ways
      const teamChunks = vectorDb.chunks.filter(chunk => {
        const searchFields = [
          chunk.id || '',
          chunk.content || '',
          chunk.source || '',
          chunk.type || ''
        ].join(' ').toLowerCase();
        
        return searchFields.includes('team') || 
               searchFields.includes('founder') || 
               searchFields.includes('shax_btc') ||
               searchFields.includes('創辦人') ||
               searchFields.includes('創始人');
      });
      
      console.log(`❌ Team-related chunks in vector DB: ${teamChunks.length}`);
      
      if (teamChunks.length > 0) {
        teamChunks.forEach(chunk => {
          console.log(`   Found: ${chunk.id} - ${chunk.content.substring(0, 50)}...`);
        });
      }
      
      // Check what types of chunks ARE in the vector DB
      const chunkTypes = [...new Set(vectorDb.chunks.map(c => c.type))];
      console.log(`✅ Chunk types in vector DB: ${chunkTypes.join(', ')}`);
      
      const aboutChunks = vectorDb.chunks.filter(c => c.type === 'about');
      console.log(`✅ About-type chunks in vector DB: ${aboutChunks.length}`);
      
      aboutChunks.slice(0, 3).forEach(chunk => {
        console.log(`   - ${chunk.id}: ${(chunk.content || '').substring(0, 50)}...`);
      });
      
    } else {
      console.log('❌ Vector database not found');
    }
  } catch (error) {
    console.log('❌ Error reading vector database:', error.message);
  }
  
  // 5. Recommend next steps
  console.log('\n📋 5. Debugging Summary:');
  console.log('');
  console.log('NEXT STEPS TO IDENTIFY THE ISSUE:');
  console.log('1. 🔧 Run embedding build with verbose logging');
  console.log('2. 🔧 Check if team chunks are created but filtered out'); 
  console.log('3. 🔧 Check if there\'s a type-based exclusion for "about" chunks');
  console.log('4. 🔧 Verify chunking process handles team.json correctly');
  console.log('5. 🔧 Test a manual rebuild focusing specifically on team.json');
}

debugTeamEmbedding();