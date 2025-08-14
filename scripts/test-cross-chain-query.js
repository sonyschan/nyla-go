#!/usr/bin/env node

/**
 * Test specific cross-chain related queries to identify source of misinformation
 */

const fs = require('fs');
const path = require('path');

// Import environment and embedding utilities
const { NYLAUtils, NYLAEmbeddingEnvironment } = require('../pwa/js/rag/nyla-environment');

async function testCrossChainQuery() {
  console.log('🔍 Testing Cross-Chain Query Responses');
  console.log('='.repeat(60));

  try {
    // Initialize embedding service
    const embeddingService = new NYLAEmbeddingEnvironment();
    console.log('⚡ Initializing embedding service...');
    await embeddingService.initialize();
    console.log('✅ Embedding service ready');

    // Load the enhanced vector database
    const vectorDBPath = path.join(process.cwd(), 'pwa/data/nyla-vector-db.json');
    if (!fs.existsSync(vectorDBPath)) {
      throw new Error('Vector database not found. Run "npm run build:embeddings" first.');
    }

    const vectorData = JSON.parse(fs.readFileSync(vectorDBPath, 'utf-8'));
    console.log(`📊 Loaded vector DB: ${vectorData.chunks.length} chunks, ${vectorData.embeddings.length} embeddings`);

    // Test the exact query that's giving wrong information
    const query = "What is NYLA?";
    
    console.log(`\n🔍 Query: "${query}"`);
    console.log('-'.repeat(40));
    
    // Generate query embedding
    const queryEmbedding = await embeddingService.embed(query);
    
    // Calculate similarities with all chunks
    const similarities = vectorData.chunks.map((chunk, index) => {
      const chunkEmbedding = vectorData.embeddings[index].embedding;
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      
      return {
        similarity,
        title: chunk.metadata?.title || chunk.title || 'Untitled',
        content: chunk.text || chunk.body || '',
        category: chunk.metadata?.category || chunk.category || 'unknown',
        id: chunk.id || chunk.metadata?.id || 'unknown'
      };
    }).sort((a, b) => b.similarity - a.similarity);

    // Show top 10 matches to identify the problematic content
    const topMatches = similarities.slice(0, 10);
    
    console.log('\n📋 Top 10 Semantic Matches:');
    topMatches.forEach((match, index) => {
      const confidence = (match.similarity * 100).toFixed(1);
      console.log(`\n${index + 1}. [${confidence}%] ${match.title}`);
      console.log(`   ID: ${match.id}`);
      console.log(`   Category: ${match.category}`);
      
      // Show content preview
      let preview = match.content.substring(0, 200);
      if (match.content.length > 200) preview += '...';
      console.log(`   Content: ${preview}`);
      
      // Flag any mention of cross-chain
      if (match.content.toLowerCase().includes('cross-chain') || 
          match.content.toLowerCase().includes('cross chain') ||
          match.content.toLowerCase().includes('between different blockchain')) {
        const crossChainText = match.content.match(/[^.]*(?:cross-chain|cross chain|between different blockchain)[^.]*/gi);
        console.log(`   ⚠️  CROSS-CHAIN MENTION: ${crossChainText?.[0] || 'Found but unclear'}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎯 Analysis Complete - Review matches for problematic content');

  } catch (error) {
    console.error('❌ Testing failed:', error.message);
    process.exit(1);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must be same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// Run the test
if (require.main === module) {
  testCrossChainQuery().catch(console.error);
}

module.exports = { testCrossChainQuery };