#!/usr/bin/env node

/**
 * Find where chunk_128 (WangChai social links) ranks in search results
 */

const fs = require('fs');
const path = require('path');

// Import environment and embedding utilities
const { NYLAUtils, NYLAEmbeddingEnvironment } = require('./pwa/js/rag/nyla-environment');

async function findChunk128Ranking() {
  console.log('🔍 Finding chunk_128 ranking for WangChai social queries');
  
  try {
    // Initialize embedding service
    const embeddingService = new NYLAEmbeddingEnvironment();
    await embeddingService.initialize();

    // Load vector database
    const vectorDBPath = path.join(process.cwd(), 'pwa/data/nyla-vector-db.json');
    const vectorData = JSON.parse(fs.readFileSync(vectorDBPath, 'utf-8'));

    const testQuery = 'WangChai social media links';
    console.log(`\nQuery: "${testQuery}"`);
    
    // Generate query embedding
    const queryEmbedding = await embeddingService.embed(testQuery);
    
    // Calculate similarities with all chunks
    const similarities = vectorData.chunks.map((chunk, index) => {
      const chunkEmbedding = vectorData.embeddings[index].embedding;
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      
      return {
        similarity,
        id: chunk.id,
        title: chunk.metadata?.title || chunk.title || 'Untitled',
        section: chunk.metadata?.section || 'unknown',
        tokens: chunk.tokens || 0,
        textPreview: (chunk.text || '').substring(0, 200) + '...'
      };
    }).sort((a, b) => b.similarity - a.similarity);

    // Find chunk_128 position
    const chunk128Index = similarities.findIndex(item => item.id === 'chunk_128');
    
    if (chunk128Index !== -1) {
      const chunk128 = similarities[chunk128Index];
      console.log(`\n🎯 chunk_128 found at position: ${chunk128Index + 1}`);
      console.log(`   Similarity: ${(chunk128.similarity * 100).toFixed(1)}%`);
      console.log(`   Title: ${chunk128.title}`);
      console.log(`   Section: ${chunk128.section}`);
      console.log(`   Tokens: ${chunk128.tokens}`);
      console.log(`   Text: ${chunk128.textPreview}`);
      
      // Show top 10 for comparison
      console.log(`\n📊 Top 10 chunks for comparison:`);
      similarities.slice(0, 10).forEach((item, index) => {
        const marker = item.id === 'chunk_128' ? '👈 TARGET' : '';
        console.log(`${index + 1}. [${(item.similarity * 100).toFixed(1)}%] ${item.id} - ${item.title} ${marker}`);
      });
      
    } else {
      console.log(`❌ chunk_128 not found in results!`);
    }

    // Also find chunk_129 (summary)
    const chunk129Index = similarities.findIndex(item => item.id === 'chunk_129');
    if (chunk129Index !== -1) {
      const chunk129 = similarities[chunk129Index];
      console.log(`\n🎯 chunk_129 found at position: ${chunk129Index + 1}`);
      console.log(`   Similarity: ${(chunk129.similarity * 100).toFixed(1)}%`);
      console.log(`   Title: ${chunk129.title}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
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
  findChunk128Ranking().catch(console.error);
}

module.exports = { findChunk128Ranking };