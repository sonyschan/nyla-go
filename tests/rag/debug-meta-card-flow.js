/**
 * Debug meta_card Data Flow to Cloud Run
 * Trace meta_card from chunks → context builder → RAG pipeline → hosted LLM
 */

// Mock browser globals for Node.js
global.window = { 
  indexedDB: null,
  NYLALLMConfig: {
    getHostedEndpoint: async () => 'https://nylago-594680195221.asia-southeast1.run.app/v1/infer'
  }
};
global.indexedDB = null;
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};
global.NYLALogger = {
  info: (...args) => console.log('[INFO]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args),
  error: (...args) => console.log('[ERROR]', ...args)
};

console.log('🔍 Debugging meta_card data flow to Cloud Run');

const NYLAVectorDB = require('../../pwa/js/rag/nyla-vector-db.js');
const NYLASemanticRetriever = require('../../pwa/js/rag/nyla-semantic-retriever.js');
const NYLAContextBuilder = require('../../pwa/js/rag/nyla-context-builder.js');
const NYLAHostedLLM = require('../../pwa/js/nyla-hosted-llm.js');

// Mock embedding service
const mockEmbedding = new Array(768).fill(0).map(() => Math.random());
const mockEmbeddingService = {
  async embed(text) { return mockEmbedding; },
  getCacheStats() { return {}; }
};

async function debugMetaCardFlow() {
  console.log('🔄 Loading real vector database...');
  
  // Initialize vector DB with real data
  const vectorDB = new NYLAVectorDB();
  await vectorDB.initialize();
  
  // Load real pre-built data
  const fs = require('fs');
  const vectorData = JSON.parse(fs.readFileSync('./pwa/data/nyla-vector-db.json', 'utf8'));
  
  // Initialize semantic retriever
  const retriever = new NYLASemanticRetriever(vectorDB, mockEmbeddingService, {
    bm25Enabled: true,
    topK: 25,
    crossEncoderTopK: 15,
    fusionTopK: 12,
    finalTopK: 3
  });
  
  global.window.nylaSemanticRetriever = retriever;
  
  // Load real data
  await vectorDB.loadFromData(vectorData);
  
  console.log('✅ Vector DB loaded, BM25 ready:', retriever.bm25Ready);
  
  const query = '旺柴的合約';
  console.log(`\n🎯 Testing query: "${query}"`);
  
  // Step 1: Get chunks from retrieval
  console.log('\n📋 Step 1: RAG Retrieval');
  const chunks = await retriever.retrieve(query, {
    topK: 25,
    crossEncoderTopK: 15,
    fusionTopK: 12,
    parentTopK: 3,
    finalTopK: 3,
    parentChildEnabled: true
  });
  
  console.log('Retrieved chunks:', chunks.map(c => ({
    id: c.id,
    finalScore: c.finalScore?.toFixed(3),
    hasMetaCard: !!c.meta_card,
    metaCardKeys: c.meta_card ? Object.keys(c.meta_card) : [],
    title: c.metadata?.title?.substring(0, 50) || 'No title'
  })));
  
  // Step 2: Context Builder processing
  console.log('\n📋 Step 2: Context Builder Processing');
  const contextBuilder = new NYLAContextBuilder(mockEmbeddingService);
  const context = await contextBuilder.buildContext(chunks, query);
  
  console.log('Context Builder result:', {
    hasContext: !!context.context,
    contextLength: context.context?.length || 0,
    contextPreview: context.context?.substring(0, 500) + '...' || 'No context',
    chunksUsed: context.metadata.chunksUsed,
    sources: context.metadata.sources
  });
  
  // Step 3: Check if meta_card data is in the formatted context
  console.log('\n📋 Step 3: Meta Card Data Check');
  const hasContractAddress = context.context?.includes('Contract Address') || false;
  const hasTechnicalDetails = context.context?.includes('Technical Details') || false;
  const hasWangChaiContent = context.context?.includes('WangChai') || context.context?.includes('旺柴') || false;
  
  console.log('Meta card presence in context:', {
    hasContractAddress,
    hasTechnicalDetails,
    hasWangChaiContent,
    fullContextSearch: {
      '合約': context.context?.includes('合約') || false,
      'contract': context.context?.toLowerCase().includes('contract') || false,
      'address': context.context?.toLowerCase().includes('address') || false
    }
  });
  
  // Step 4: Simulate hosted LLM API call (without actually calling)
  console.log('\n📋 Step 4: Hosted LLM API Payload Simulation');
  
  // Mock hosted LLM to capture what would be sent
  const mockHostedLLM = {
    isReady: true,
    requestCount: 0,
    sessionId: 'test-session',
    endpoint: 'https://nylago-594680195221.asia-southeast1.run.app/v1/infer',
    
    async generateResponse(userQuery, context, options = {}) {
      const requestBody = {
        user_query: userQuery,
        context: Array.isArray(context) ? context : [context],
        params: {
          max_tokens: 1200,
          temperature: 0.3,
          top_p: 0.9
        },
        ab: 'cloud',
        session_id: this.sessionId,
        tenant_id: 'nyla-pwa',
        language_preference: 'zh'
      };
      
      console.log('🌐 HOSTED LLM API CALL would send:', {
        user_query: requestBody.user_query,
        context_length: requestBody.context.length,
        context_first_item_length: requestBody.context[0]?.length || 0,
        context_has_contract: requestBody.context[0]?.includes('Contract Address') || false,
        context_has_wangchai: requestBody.context[0]?.includes('WangChai') || requestBody.context[0]?.includes('旺柴') || false,
        full_context_preview: requestBody.context[0]?.substring(0, 1000) + '...' || 'No context'
      });
      
      // Return mock success
      return {
        text: 'Mock response - would include contract address if present in context',
        sentiment: 'neutral',
        confidence: 1.0
      };
    }
  };
  
  // Simulate the API call
  const contextArray = [];
  if (context && context.context) {
    const formattedContext = `Here is relevant knowledge to help answer the user's question:\n\n${context.context}`;
    contextArray.push(formattedContext);
  }
  
  const mockResponse = await mockHostedLLM.generateResponse(query, contextArray);
  
  console.log('\n📊 Final Analysis:');
  console.log('✅ Meta card data flow traced successfully');
  console.log('Context includes contract info:', hasContractAddress);
  console.log('API payload would receive context with contract data:', 
    contextArray[0]?.includes('Contract Address') || false);
  
  if (!hasContractAddress) {
    console.log('\n❌ PROBLEM IDENTIFIED: meta_card data not reaching context');
    console.log('Possible causes:');
    console.log('1. Chunks missing meta_card field after parent-child aggregation');
    console.log('2. Context builder not finding meta_card in chunk objects');
    console.log('3. Vector DB not preserving meta_card during loadFromData');
  }
  
  return {
    chunks,
    context,
    hasContractAddress,
    contextArray
  };
}

debugMetaCardFlow().catch(console.error);