/**
 * Test Team-Only Embedding
 * Try to build embeddings with only team.json to isolate the issue
 */

const fs = require('fs');
const path = require('path');

async function testTeamOnlyEmbedding() {
  console.log('🧪 Testing Team-Only Embedding Build\n');
  
  try {
    // Load the environment and utilities
    const { NYLAUtils, NYLAEmbeddingEnvironment } = require('./pwa/js/rag/nyla-environment.js');
    
    console.log('📁 1. Loading team.json directly:');
    const teamData = JSON.parse(fs.readFileSync('pwa/kb/about/team.json', 'utf8'));
    console.log(`✅ Loaded ${teamData.chunks.length} chunks from team.json`);
    
    // Check each chunk
    teamData.chunks.forEach((chunk, index) => {
      console.log(`   ${index + 1}. ${chunk.id}`);
      console.log(`      Type: ${chunk.type}`);
      console.log(`      Lang: ${chunk.lang}`);
      console.log(`      Body length: ${chunk.body.length} chars`);
      console.log(`      Has exclude_from_tech: ${!!chunk.exclude_from_tech}`);
      console.log('');
    });
    
    console.log('🔧 2. Testing chunk processing pipeline:');
    
    // Create a minimal KB with just team data
    const testKB = {
      about: {
        team: teamData.chunks
      }
    };
    
    // Try to process through the chunking system
    console.log('Attempting to process through normal chunking...');
    
    // Load the chunking service
    const { NYLAKnowledgeChunker } = require('./pwa/js/rag/nyla-knowledge-chunker.js');
    const chunker = new NYLAKnowledgeChunker();
    
    // Process the team data
    const processedChunks = chunker.chunkKnowledgeBase(testKB);
    console.log(`✅ Chunker produced ${processedChunks.length} chunks`);
    
    processedChunks.forEach(chunk => {
      console.log(`   - ${chunk.id}: ${chunk.content.substring(0, 50)}...`);
      console.log(`     Type: ${chunk.metadata?.type || 'undefined'}`);
      console.log(`     Include in embeddings: ${chunk.metadata?.exclude_from_tech !== true}`);
    });
    
    console.log('\n🔍 3. Testing content filtering:');
    
    // Test content filter
    const { NYLAContentFilter } = require('./pwa/js/rag/nyla-content-filter.js');
    const filter = new NYLAContentFilter();
    
    const filteredChunks = [];
    for (const chunk of processedChunks) {
      const shouldKeep = filter.shouldKeepChunk(chunk);
      const qualityScore = filter.getQualityScore(chunk);
      
      console.log(`   ${chunk.id}:`);
      console.log(`     Should keep: ${shouldKeep}`);
      console.log(`     Quality score: ${qualityScore.toFixed(3)}`);
      
      if (shouldKeep) {
        filteredChunks.push(chunk);
      }
    }
    
    console.log(`✅ After filtering: ${filteredChunks.length}/${processedChunks.length} chunks kept`);
    
    if (filteredChunks.length === 0) {
      console.log('❌ ALL CHUNKS FILTERED OUT - This explains the missing founder data!');
    }
    
    console.log('\n🎯 4. Summary:');
    console.log(`   Original chunks: ${teamData.chunks.length}`);
    console.log(`   After chunking: ${processedChunks.length}`);
    console.log(`   After filtering: ${filteredChunks.length}`);
    
  } catch (error) {
    console.log('❌ Error during testing:', error.message);
    console.log('   Stack:', error.stack);
    
    // Try a simpler test - just check if files are readable
    console.log('\n🔧 Fallback: Basic file accessibility test');
    
    try {
      const teamPath = path.join(process.cwd(), 'pwa/kb/about/team.json');
      const exists = fs.existsSync(teamPath);
      console.log(`   team.json exists: ${exists}`);
      
      if (exists) {
        const content = fs.readFileSync(teamPath, 'utf8');
        const data = JSON.parse(content);
        console.log(`   team.json is valid JSON with ${data.chunks.length} chunks`);
        
        // Check if it's in the ingest file list
        const envPath = 'pwa/js/rag/nyla-environment.js';
        const envContent = fs.readFileSync(envPath, 'utf8');
        const mentioned = envContent.includes('about/team.json');
        console.log(`   team.json mentioned in environment: ${mentioned}`);
      }
    } catch (fallbackError) {
      console.log('❌ Fallback test also failed:', fallbackError.message);
    }
  }
}

testTeamOnlyEmbedding();