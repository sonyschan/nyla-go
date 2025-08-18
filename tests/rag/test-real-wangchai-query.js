/**
 * Test Real WangChai Query Pipeline
 * Debug the exact query '旺柴的合約' to find where scores get flattened to 1.000
 */

// Mock browser globals for Node.js
global.window = { 
  indexedDB: null,
  nylaSemanticRetriever: null 
};
global.indexedDB = null;

console.log('🧪 Testing Real WangChai Query: "旺柴的合約"');

const NYLAVectorDB = require('../../pwa/js/rag/nyla-vector-db.js');
const NYLASemanticRetriever = require('../../pwa/js/rag/nyla-semantic-retriever.js');
const NYLABm25Index = require('../../pwa/js/rag/nyla-bm25-index.js');
const NYLACrossEncoder = require('../../pwa/js/rag/nyla-cross-encoder.js');
const NYLAParentChildAggregator = require('../../pwa/js/rag/nyla-parent-child-aggregator.js');

// Mock embedding service
const mockEmbedding = new Array(768).fill(0).map(() => Math.random());
const mockEmbeddingService = {
  async embed(text) { return mockEmbedding; },
  getCacheStats() { return {}; }
};

async function testRealWangChaiQuery() {
  console.log('🔄 Loading real vector database...');
  
  // Initialize vector DB with real data
  const vectorDB = new NYLAVectorDB();
  await vectorDB.initialize();
  
  // Load real pre-built data
  const fs = require('fs');
  const vectorData = JSON.parse(fs.readFileSync('./pwa/data/nyla-vector-db.json', 'utf8'));
  console.log('📦 Real vector data loaded:', {
    chunks: vectorData.chunks?.length || 0, 
    embeddings: vectorData.embeddings?.length || 0
  });
  
  // Initialize semantic retriever
  const retriever = new NYLASemanticRetriever(vectorDB, mockEmbeddingService, {
    bm25Enabled: true,
    topK: 25,
    bm25TopK: 25,
    crossEncoderTopK: 15,
    fusionTopK: 12,
    finalTopK: 3
  });
  
  // Expose globally for BM25 
  global.window.nylaSemanticRetriever = retriever;
  
  // Load real data
  console.log('🔄 Loading real data into vector DB...');
  await vectorDB.loadFromData(vectorData);
  
  console.log('✅ Vector DB loaded with BM25 status:', {
    bm25Ready: retriever.bm25Ready,
    bm25Stats: retriever.bm25Index?.getStats()
  });
  
  // The exact query from browser logs
  const query = '旺柴的合約';
  console.log(`\n🎯 Testing exact query: "${query}"`);
  
  // Step 1: Check query processing and intent detection
  console.log('\n📋 Step 1: Query Processing & Intent Detection');
  const processedQuery = retriever.processQuery(query);
  console.log('Query processing result:', {
    original: processedQuery.original,
    processed: processedQuery.processed,
    intentTypes: processedQuery.intentTypes,
    needsBM25: processedQuery.needsBM25,
    exactSignals: processedQuery.exactSignals
  });
  
  // Step 2: Hybrid retrieval (BM25 + Dense)
  console.log('\n📋 Step 2: Hybrid Retrieval (BM25 + Dense)');
  const hybridResults = await retriever.performHybridRetrieval(processedQuery, {
    topK: 25,
    bm25TopK: 25,
    bm25Enabled: true
  });
  
  console.log('Hybrid retrieval results:', {
    totalMerged: hybridResults.merged?.length || 0,
    bm25Count: hybridResults.bm25?.length || 0,
    denseCount: hybridResults.dense?.length || 0,
    topScores: hybridResults.merged?.slice(0, 3).map(r => ({
      id: r.id,
      finalScore: r.finalScore?.toFixed(4),
      source: r.source
    }))
  });
  
  // Step 3: Cross-encoder reranking
  if (hybridResults.merged && hybridResults.merged.length > 0) {
    console.log('\n📋 Step 3: Cross-Encoder Reranking');
    const crossEncoder = new NYLACrossEncoder();
    
    // Check what scores look like before cross-encoder
    console.log('Before cross-encoder:', hybridResults.merged.slice(0, 3).map(r => ({
      id: r.id,
      originalScore: r.finalScore?.toFixed(4),
      score: r.score?.toFixed(4)
    })));
    
    const rerankedResults = await crossEncoder.rerank(query, hybridResults.merged, 15);
    
    console.log('After cross-encoder:', rerankedResults.slice(0, 3).map(r => ({
      id: r.id,
      finalScore: r.finalScore?.toFixed(4),
      crossEncoderScore: r.crossEncoderScore?.toFixed(4)
    })));
  }
  
  // Step 4: Parent-child aggregation  
  console.log('\n📋 Step 4: Parent-Child Aggregation');
  const aggregator = new NYLAParentChildAggregator({
    maxParentTokens: 1200,
    scoreAggregationMethod: 'max_plus_mean',
    multiHitBonus: 0.1,
    maxMultiHitBonus: 0.3
  });
  
  // Use the actual results from the pipeline
  const finalResults = await retriever.retrieve(query, {
    topK: 25,
    bm25TopK: 25, 
    crossEncoderTopK: 15,
    fusionTopK: 12,
    finalTopK: 3,
    bm25Enabled: true,
    crossEncoderEnabled: true,
    parentChildEnabled: true
  });
  
  console.log('🏁 Final Pipeline Results:', finalResults.map((result, i) => ({
    rank: i + 1,
    id: result.id,
    finalScore: result.finalScore?.toFixed(4),
    source: result.source,
    title: result.metadata?.title?.substring(0, 50) || 'No title'
  })));
  
  // Check if scores are still 1.000
  const allScoresAreOne = finalResults.every(r => 
    Math.abs(r.finalScore - 1.0) < 0.001
  );
  
  console.log('\n📊 Score Analysis:');
  console.log('All scores are 1.000:', allScoresAreOne ? '❌ YES (BROKEN)' : '✅ NO (FIXED)');
  console.log('Score distribution:', finalResults.map(r => r.finalScore?.toFixed(4)).join(', '));
  
  if (allScoresAreOne) {
    console.log('\n🔍 INVESTIGATION NEEDED: Scores are still flattened to 1.000');
    console.log('The issue is somewhere in the pipeline that our previous fix missed.');
  } else {
    console.log('\n✅ SUCCESS: Score distribution is preserved!');
  }
}

testRealWangChaiQuery().catch(console.error);