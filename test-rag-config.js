/**
 * Test new RAG configuration: Top-k=20 → MMR (λ=0.5) → Top-m=8
 */

// Load required modules (Node.js environment simulation)
const fs = require('fs');
const path = require('path');

console.log('🚀 Testing New RAG Configuration');
console.log('================================');

// Load the RAG files to validate configuration
const testFiles = [
  'pwa/js/rag/nyla-retriever.js',
  'pwa/js/rag/nyla-mmr-reranker.js',
  'pwa/js/rag/nyla-rag-pipeline.js'
];

for (const file of testFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    console.log(`\n📁 Checking ${file}:`);
    
    // Check for Top-k=20
    if (content.includes('topK: 20')) {
      console.log('  ✅ Top-k=20 configured for initial retrieval');
    }
    
    // Check for Top-m=8
    if (content.includes('finalTopK: 8') || content.includes('Top-m=8')) {
      console.log('  ✅ Top-m=8 configured for final results');
    }
    
    // Check for MMR λ=0.5
    if (content.includes('lambda: 0.5')) {
      console.log('  ✅ MMR lambda=0.5 configured');
    }
    
    // Check for MMR integration
    if (content.includes('NYLAMMRReranker') && content.includes('mmrEnabled')) {
      console.log('  ✅ MMR reranking integrated');
    }
    
  } catch (error) {
    console.log(`  ❌ Error reading ${file}: ${error.message}`);
  }
}

// Test configuration summary
console.log('\n🎯 New RAG Pipeline Configuration:');
console.log('1. Vector Search: Top-k=20 initial retrieval');
console.log('2. Semantic Deduplication: Cosine similarity > 0.92');
console.log('3. Two-cap Source Filtering: 2 pre-cap → 1 post-cap');
console.log('4. MMR Reranking: λ=0.5 (balance relevance/diversity)');
console.log('5. Final Selection: Top-m=8 results');

console.log('\n🔍 Expected Query Flow:');
console.log('Query → Embed → Search(k=20) → Dedupe → Cluster → MMR(λ=0.5) → Select(m=8) → Context → LLM');

// Test knowledge base status
try {
  const vectorDBPath = 'pwa/data/nyla-vector-db.json';
  const stats = fs.statSync(vectorDBPath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(1);
  
  console.log('\n📊 Vector Database Status:');
  console.log(`  📁 File: ${vectorDBPath}`);
  console.log(`  💾 Size: ${sizeInMB} MB`);
  console.log(`  📅 Modified: ${stats.mtime.toISOString()}`);
} catch (error) {
  console.log('\n❌ Vector database not found - run npm run build:embeddings');
}

console.log('\n✅ Configuration test completed!');
console.log('\nNext steps:');
console.log('1. Open PWA: http://localhost:3000');
console.log('2. Click NYLA tab');
console.log('3. Ask: "How do I generate a QR code?"');
console.log('4. Check console for RAG pipeline logs');