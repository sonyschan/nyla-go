#!/usr/bin/env node

/**
 * Test WangChai Social Media Query Fix
 * Validates improvements to RAG social media link retrieval
 */

const fs = require('fs');
const path = require('path');

// Import environment and embedding utilities
const { NYLAUtils, NYLAEmbeddingEnvironment } = require('./pwa/js/rag/nyla-environment');

async function testWangChaiSocialFix() {
  console.log('🔗 Testing WangChai Social Media Query Improvements');
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

    // Test queries specifically for WangChai social media links
    const socialQueries = [
      'WangChai social media links',
      'WangChai social links', 
      'WangChai Twitter',
      'WangChai X account',
      'WangChai community links',
      'WangChai Telegram',
      'Where to find WangChai?',
      'How to contact WangChai?',
      'WangChai official links',
      'Join WangChai community',
      'Follow WangChai'
    ];

    console.log('\n🔍 Testing WangChai Social Media Queries');
    console.log('-'.repeat(50));

    for (const query of socialQueries) {
      console.log(`\n🎯 Query: "${query}"`);
      
      // Generate query embedding
      const queryEmbedding = await embeddingService.embed(query);
      
      // Calculate similarities with all chunks
      const similarities = vectorData.chunks.map((chunk, index) => {
        const chunkEmbedding = vectorData.embeddings[index].embedding;
        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
        
        return {
          similarity,
          id: chunk.id,
          title: chunk.metadata?.title || chunk.title || 'Untitled',
          content_type: chunk.metadata?.content_type || 'unknown',
          section: chunk.metadata?.section || 'unknown',
          priority: chunk.metadata?.priority || 0,
          tags: chunk.metadata?.tags || [],
          content: (chunk.text || chunk.body || '').substring(0, 150) + '...'
        };
      }).sort((a, b) => b.similarity - a.similarity);

      // Show top 5 matches with detailed analysis
      const topMatches = similarities.slice(0, 5);
      topMatches.forEach((match, index) => {
        const confidence = (match.similarity * 100).toFixed(1);
        const isSocialChunk = match.content_type === 'social_media_links' || 
                              match.section === 'official_channels' ||
                              match.tags.some(tag => /social|links|contact|community|official/i.test(tag));
        const isWangChai = /wangchai|旺柴/i.test(match.title) || /wangchai|旺柴/i.test(match.content);
        
        console.log(`  ${index + 1}. [${confidence}%] ${match.title}`);
        console.log(`     📁 Type: ${match.content_type} | Section: ${match.section} | Priority: ${match.priority}`);
        console.log(`     🏷️ Social: ${isSocialChunk ? 'YES' : 'NO'} | WangChai: ${isWangChai ? 'YES' : 'NO'}`);
        
        if (index === 0) {
          console.log(`     📝 ${match.content}`);
          
          // Check if top result is the desired social links chunk (chunk_128 contains the full social links)
          const isCorrectChunk = match.id === 'chunk_128';
          console.log(`     ✅ Correct chunk (facts_wangchai_official_links): ${isCorrectChunk ? 'YES' : 'NO'}`);
          
          if (!isCorrectChunk) {
            console.log(`     ❌ Top result is: ${match.id}`);
          }
        }
      });

      // Overall assessment
      const topResult = topMatches[0];
      const confidence = topResult.similarity;
      const isCorrectChunk = topResult.id === 'chunk_128';
      
      console.log(`     🎯 Assessment:`);
      console.log(`       - Max Confidence: ${(confidence * 100).toFixed(1)}%`);
      console.log(`       - Meets threshold (50%): ${confidence >= 0.5 ? 'YES' : 'NO'}`);
      console.log(`       - Correct social chunk on top: ${isCorrectChunk ? '✅ YES' : '❌ NO'}`);
    }

    // Summary assessment
    console.log('\n' + '='.repeat(60));
    console.log('📊 WangChai Social Media Query Fix Summary:');
    
    // Check if social links chunk exists
    const socialChunk = vectorData.chunks.find(chunk => chunk.id === 'chunk_128');
    if (socialChunk) {
      console.log('✅ WangChai social links chunk found in vector DB');
      console.log(`   - Priority: ${socialChunk.metadata?.priority || 'unknown'}`);
      console.log(`   - Content Type: ${socialChunk.metadata?.content_type || 'none'}`);
      console.log(`   - Section: ${socialChunk.metadata?.section || 'unknown'}`);
      console.log(`   - Has social tags: ${socialChunk.metadata?.tags?.some(tag => /social|links|community/i.test(tag)) ? 'YES' : 'NO'}`);
    } else {
      console.log('❌ WangChai social links chunk NOT found in vector DB');
      console.log('   - Please rebuild embeddings: npm run build:embeddings');
    }

    console.log('\n🚀 Next Steps:');
    console.log('1. If chunks are missing or incorrect, rebuild embeddings: npm run build:embeddings');
    console.log('2. Test with actual RAG pipeline to verify end-to-end improvements');
    console.log('3. Monitor LLM responses to ensure @WangChaidotbonk instead of @WangChai');

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
  testWangChaiSocialFix().catch(console.error);
}

module.exports = { testWangChaiSocialFix };