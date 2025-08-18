/**
 * Test MMR Lambda Consistency
 * Verifies that MMR lambda is consistently set to 0.82 throughout the pipeline
 */

console.log('🎯 Testing MMR Lambda Consistency to 0.82');
console.log('===========================================');

// Test 1: Check that MMR Reranker default is 0.82
try {
  // Mock embedding service
  const mockEmbeddingService = {
    embed: () => [0.1, 0.2, 0.3],
    cosineSimilarity: () => 0.8
  };
  
  // Test MMR Reranker constructor default
  if (typeof NYLAMMRReranker !== 'undefined') {
    const mmrReranker = new NYLAMMRReranker(mockEmbeddingService);
    const stats = mmrReranker.getStats();
    
    if (stats.lambda === 0.82) {
      console.log('✅ MMR Reranker default lambda = 0.82');
    } else {
      console.log(`❌ MMR Reranker lambda = ${stats.lambda}, expected 0.82`);
    }
  } else {
    console.log('⚠️ NYLAMMRReranker not available in test environment');
  }
} catch (error) {
  console.log('⚠️ Could not test MMR Reranker constructor:', error.message);
}

// Test 2: Check that explicit lambda overrides are removed where appropriate
const testResults = [];

// Check files for lambda configuration
const filesToCheck = [
  'pwa/js/rag/nyla-mmr-reranker.js',
  'pwa/js/rag/nyla-semantic-retriever.js', 
  'pwa/js/rag/nyla-rag-pipeline.js',
  'pwa/js/rag/nyla-retriever.js'
];

if (typeof require !== 'undefined') {
  const fs = require('fs');
  
  for (const file of filesToCheck) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Count lambda configurations
      const lambda082Matches = (content.match(/lambda:\s*0\.82/g) || []).length;
      const lambda05Matches = (content.match(/lambda:\s*0\.5/g) || []).length;
      const mmrLambda082Matches = (content.match(/mmrLambda:\s*0\.82/g) || []).length;
      
      testResults.push({
        file: file.split('/').pop(),
        lambda082: lambda082Matches,
        lambda05: lambda05Matches,
        mmrLambda082: mmrLambda082Matches,
        hasOldValues: lambda05Matches > 0
      });
      
    } catch (error) {
      testResults.push({
        file: file.split('/').pop(),
        error: error.message
      });
    }
  }
  
  // Display results
  console.log('\n📊 Lambda Configuration Analysis:');
  console.log('================================');
  
  for (const result of testResults) {
    if (result.error) {
      console.log(`❌ ${result.file}: ${result.error}`);
    } else {
      const status = result.hasOldValues ? '⚠️' : '✅';
      console.log(`${status} ${result.file}:`);
      if (result.lambda082 > 0) {
        console.log(`   - lambda: 0.82 found ${result.lambda082} time(s)`);
      }
      if (result.mmrLambda082 > 0) {
        console.log(`   - mmrLambda: 0.82 found ${result.mmrLambda082} time(s)`);
      }
      if (result.lambda05 > 0) {
        console.log(`   ⚠️ OUTDATED: lambda: 0.5 found ${result.lambda05} time(s)`);
      }
    }
  }
}

// Test 3: Check configuration flow from pipeline to MMR
console.log('\n🔗 Configuration Flow Test:');
console.log('==========================');

if (typeof NYLASemanticRetriever !== 'undefined' && typeof NYLAMMRReranker !== 'undefined') {
  try {
    const mockVectorDB = { search: () => [] };
    const mockEmbeddingService = {
      embed: () => [0.1, 0.2, 0.3],
      cosineSimilarity: () => 0.8
    };
    
    // Create semantic retriever (this should have mmrLambda: 0.82)
    const retriever = new NYLASemanticRetriever(mockVectorDB, mockEmbeddingService);
    const retrieverOptions = retriever.options;
    
    if (retrieverOptions.mmrLambda === 0.82) {
      console.log('✅ Semantic Retriever mmrLambda = 0.82');
    } else {
      console.log(`❌ Semantic Retriever mmrLambda = ${retrieverOptions.mmrLambda}, expected 0.82`);
    }
    
    // Create MMR reranker directly (should default to 0.82)
    const mmrReranker = new NYLAMMRReranker(mockEmbeddingService);
    const mmrStats = mmrReranker.getStats();
    
    if (mmrStats.lambda === 0.82) {
      console.log('✅ MMR Reranker default lambda = 0.82');
    } else {
      console.log(`❌ MMR Reranker lambda = ${mmrStats.lambda}, expected 0.82`);
    }
    
    // Test override behavior
    const mmrWithOverride = new NYLAMMRReranker(mockEmbeddingService, { lambda: retrieverOptions.mmrLambda });
    const overrideStats = mmrWithOverride.getStats();
    
    if (overrideStats.lambda === 0.82) {
      console.log('✅ MMR Reranker with retriever config = 0.82');
    } else {
      console.log(`❌ MMR Reranker with retriever config = ${overrideStats.lambda}, expected 0.82`);
    }
    
  } catch (error) {
    console.log('⚠️ Could not test configuration flow:', error.message);
  }
} else {
  console.log('⚠️ Required classes not available for configuration flow test');
}

console.log('\n🎯 Test Summary:');
console.log('===============');
console.log('Expected behavior:');
console.log('1. MMR Reranker constructor default: lambda = 0.82');
console.log('2. Semantic Retriever option: mmrLambda = 0.82');
console.log('3. RAG Pipeline passes through: mmrLambda = 0.82');
console.log('4. No remaining lambda = 0.5 configurations');
console.log('5. Consistent 0.82 value throughout the pipeline');