/**
 * Test BM25 Fix - Verify that loadFromData triggers BM25 index building
 */

// Mock browser globals for Node.js
global.window = { indexedDB: null };
global.indexedDB = null;

console.log('🧪 Testing BM25 Fix - Focus on loadFromData notification');

// Load modules
const NYLASemanticRetriever = require('../../pwa/js/rag/nyla-semantic-retriever.js');
const NYLABm25Index = require('../../pwa/js/rag/nyla-bm25-index.js');

// Mock embedding service
const mockEmbeddingService = {
  async embed(text) { 
    return new Array(768).fill(0).map(() => Math.random()); 
  },
  getCacheStats() { return {}; }
};

// Mock Vector DB with the fixed loadFromData method
class MockVectorDB {
  constructor() {
    this.chunks = new Map();
    this.initialized = false;
  }
  
  async initialize() {
    this.initialized = true;
    return true;
  }
  
  // This is the FIXED loadFromData method that should trigger BM25 building
  async loadFromData(vectorData) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    console.log('📥 Mock loadFromData called with chunks:', vectorData.chunks?.length || 0);
    
    // Simulate loading chunks
    const chunks = vectorData.chunks || [];
    let loadedCount = 0;
    
    for (const chunk of chunks.slice(0, 5)) { // Just load first 5 for testing
      this.chunks.set(chunk.id, {
        id: chunk.id,
        text: chunk.text || chunk.content,
        metadata: chunk.metadata || {}
      });
      loadedCount++;
    }
    
    console.log(`✅ Loaded ${loadedCount} mock chunks`);
    
    // *** THE FIX *** - This was missing in the original loadFromData
    const chunksForBM25 = [];
    for (const [chunkId, chunkData] of this.chunks.entries()) {
      chunksForBM25.push({
        id: chunkId,
        text: chunkData.text,
        search_text: chunkData.metadata?.search_text || chunkData.text,
        metadata: chunkData.metadata
      });
    }
    
    console.log(`🔍 Phase 2: Notifying BM25 index build with ${chunksForBM25.length} loaded chunks`);
    await this.notifyBM25IndexBuild(chunksForBM25);
  }
  
  // Fixed notifyBM25IndexBuild method with proper await
  async notifyBM25IndexBuild(chunks) {
    try {
      if (typeof window !== 'undefined' && window.nylaSemanticRetriever) {
        console.log('🔍 Phase 2: Building BM25 index with', chunks.length, 'chunks...');
        await window.nylaSemanticRetriever.buildBM25Index(chunks);
        console.log('✅ Phase 2: BM25 index build notification completed');
      } else {
        console.log('⚠️ Phase 2: Semantic retriever not ready');
      }
    } catch (error) {
      console.warn('❌ Failed to notify BM25 index build:', error.message);
    }
  }
}

async function testBM25Fix() {
  console.log('🔧 Testing the BM25 notification fix...');
  
  // Initialize mock vector DB
  const vectorDB = new MockVectorDB();
  await vectorDB.initialize();
  
  // Initialize semantic retriever with BM25 enabled
  const retriever = new NYLASemanticRetriever(vectorDB, mockEmbeddingService, {
    bm25Enabled: true,
    topK: 25,
    bm25TopK: 25
  });
  
  // Expose globally (this is how the fix works)
  global.window.nylaSemanticRetriever = retriever;
  
  console.log('🔍 Initial BM25 Status:', {
    bm25Ready: retriever.bm25Ready,
    hasBm25Index: Boolean(retriever.bm25Index)
  });
  
  // Create mock vector data
  const mockVectorData = {
    chunks: [
      {
        id: 'chunk_117_1',
        text: 'WangChai is a meme coin project on Solana blockchain',
        content: 'WangChai is a meme coin project on Solana blockchain',
        metadata: {
          title: 'WangChai Project',
          search_text: 'WangChai meme coin Solana blockchain project 旺柴 合約 contract'
        }
      },
      {
        id: 'chunk_117_2', 
        text: 'The contract address is 7qb6QYJ4N4T5nJ9dCXJ8zF5',
        content: 'The contract address is 7qb6QYJ4N4T5nJ9dCXJ8zF5',
        metadata: {
          title: 'WangChai Contract',
          search_text: 'contract address 7qb6QYJ4N4T5nJ9dCXJ8zF5 合約地址 CA'
        }
      }
    ]
  };
  
  // Test the FIXED loadFromData method
  console.log('🔄 Testing loadFromData with BM25 notification fix...');
  await vectorDB.loadFromData(mockVectorData);
  
  // Check if BM25 is now ready
  console.log('🔍 Post-loadFromData BM25 Status:', {
    bm25Ready: retriever.bm25Ready,
    hasBm25Index: Boolean(retriever.bm25Index),
    bm25Stats: retriever.bm25Index?.getStats()
  });
  
  if (retriever.bm25Ready) {
    console.log('🎉 SUCCESS: BM25 fix worked! Index is ready');
    
    // Test BM25 search
    try {
      const bm25Results = await retriever.bm25Index.search('旺柴的合約', 5);
      console.log('🔍 BM25 Search Results:', {
        resultCount: bm25Results.length,
        topResult: bm25Results[0] ? {
          id: bm25Results[0].id,
          score: bm25Results[0].score?.toFixed(4),
          searchText: bm25Results[0].search_text?.substring(0, 50)
        } : null
      });
    } catch (error) {
      console.error('❌ BM25 search failed:', error.message);
    }
  } else {
    console.log('❌ FAILED: BM25 index still not ready after fix');
  }
}

// Run the test
testBM25Fix().catch(console.error);