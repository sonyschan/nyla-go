#!/usr/bin/env node

/**
 * Test RAG queries to verify semantic matching improvements
 */

const fs = require('fs');
const path = require('path');

// Import environment and embedding utilities
const { NYLAUtils, NYLAEmbeddingEnvironment } = require('../pwa/js/rag/nyla-environment');

async function testRAGQueries() {
  console.log('🧪 Testing RAG Semantic Matching');
  console.log('='.repeat(50));

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

    // Test queries that should have high confidence now
    const testQueries = [
      'How do I send tokens?',
      'Send tokens step by step',
      'Transfer cryptocurrency',
      'How to receive payments?',
      'Generate QR code for payments',
      'What blockchains are supported?',
      'How does NYLA work?',
      'What happens after I post the command?'  // Target test query
    ];

    console.log('\n🔍 Testing Semantic Similarity');
    console.log('-'.repeat(40));

    for (const query of testQueries) {
      console.log(`\nQuery: "${query}"`);
      
      // Generate query embedding
      const queryEmbedding = await embeddingService.embed(query);
      
      // Calculate similarities with all chunks
      const similarities = vectorData.chunks.map((chunk, index) => {
        const chunkEmbedding = vectorData.embeddings[index].embedding; // Access .embedding field
        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
        
        return {
          similarity,
          title: chunk.metadata?.title || chunk.title || 'Untitled',
          content: (chunk.text || chunk.body || '').substring(0, 100) + '...',
          category: chunk.metadata?.category || chunk.category || 'unknown'
        };
      }).sort((a, b) => b.similarity - a.similarity);

      // Show top 3 matches
      const topMatches = similarities.slice(0, 3);
      topMatches.forEach((match, index) => {
        const confidence = (match.similarity * 100).toFixed(1);
        console.log(`  ${index + 1}. [${confidence}%] ${match.title}`);
        if (index === 0) {
          console.log(`     📝 ${match.content}`);
        }
      });

      // Check if confidence meets threshold
      const maxConfidence = topMatches[0].similarity;
      const meetsThreshold = maxConfidence >= 0.5; // minScore threshold
      const meetsMinConfidence = maxConfidence >= 0.3; // minConfidenceThreshold
      
      console.log(`     🎯 Max Confidence: ${(maxConfidence * 100).toFixed(1)}%`);
      console.log(`     ✅ Meets minScore (50%): ${meetsThreshold ? 'YES' : 'NO'}`);
      console.log(`     ✅ Meets minConfidence (30%): ${meetsMinConfidence ? 'YES' : 'NO'}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 RAG Testing Complete!');

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
  testRAGQueries().catch(console.error);
}

module.exports = { testRAGQueries };