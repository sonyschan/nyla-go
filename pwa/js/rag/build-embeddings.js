/**
 * Build Embeddings Script
 * Offline script to pre-generate embeddings and save to file
 * Run this during build time to avoid runtime embedding generation
 */

async function buildEmbeddings() {
  console.log('🚀 Starting offline embedding generation...');
  
  try {
    // Import required modules
    // Legacy browser embedding build deprecated - use Node.js build: npm run build:embeddings
    throw new Error('Browser embedding build deprecated. Use: npm run build:embeddings');
    const { NYLAKnowledgeChunker } = await import('./nyla-knowledge-chunker.js');
    const { NYLAEmbeddingService } = await import('./nyla-embedding-service.js');
    
    // Initialize components
    console.log('📚 Loading knowledge base...');
    const kb = new NYLAKnowledgeBase();
    await kb.initialize();
    
    console.log('📦 Initializing chunker...');
    const chunker = new NYLAKnowledgeChunker({
      minChunkSize: 200,
      maxChunkSize: 400,
      overlapSize: 50
    });
    
    console.log('🤖 Initializing embedding service...');
    const embeddingService = new NYLAEmbeddingService({
      modelName: 'Xenova/all-MiniLM-L6-v2',
      batchSize: 32
    });
    await embeddingService.initialize();
    
    // Process knowledge base
    console.log('🔨 Chunking knowledge base...');
    const chunks = await chunker.processKnowledgeBase(kb.knowledgeBase);
    console.log(`✅ Created ${chunks.length} chunks`);
    
    // Get chunk statistics
    const stats = chunker.getStatistics();
    console.log('📊 Chunk statistics:', stats);
    
    // Generate embeddings with progress tracking
    console.log('🧮 Generating embeddings...');
    const startTime = Date.now();
    
    const embeddedChunks = await embeddingService.processChunks(chunks, (progress) => {
      process.stdout.write(`\r  Progress: ${progress.percentage}% (${progress.current}/${progress.total})`);
    });
    
    console.log('\n✅ Embeddings generated');
    
    const embeddingTime = Date.now() - startTime;
    console.log(`⏱️  Embedding time: ${(embeddingTime / 1000).toFixed(2)}s`);
    
    // Prepare index data
    const indexData = {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      model: {
        name: 'all-MiniLM-L6-v2',
        dimension: 384
      },
      statistics: {
        total_chunks: embeddedChunks.length,
        avg_chunk_size: stats.avg_chunk_size,
        chunk_types: stats.chunk_types,
        generation_time_ms: embeddingTime
      },
      chunks: embeddedChunks.map(chunk => ({
        id: chunk.id,
        text: chunk.text,
        embedding: chunk.embedding,
        metadata: chunk.metadata
      }))
    };
    
    // Save to file
    const outputPath = './nyla-knowledge-index.json';
    console.log(`💾 Saving index to ${outputPath}...`);
    
    const fs = require('fs').promises;
    await fs.writeFile(
      outputPath,
      JSON.stringify(indexData, null, 2),
      'utf-8'
    );
    
    // Calculate file size
    const fileStats = await fs.stat(outputPath);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ Index saved successfully (${fileSizeMB}MB)`);
    
    // Generate compressed version
    console.log('🗜️  Creating compressed version...');
    const zlib = require('zlib');
    const compressed = zlib.gzipSync(JSON.stringify(indexData));
    
    await fs.writeFile(
      './nyla-knowledge-index.json.gz',
      compressed
    );
    
    const compressedStats = await fs.stat('./nyla-knowledge-index.json.gz');
    const compressedSizeMB = (compressedStats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ Compressed index saved (${compressedSizeMB}MB)`);
    console.log(`📉 Compression ratio: ${((1 - compressedStats.size / fileStats.size) * 100).toFixed(1)}%`);
    
    // Summary
    console.log('\n📋 Build Summary:');
    console.log(`  • Chunks: ${embeddedChunks.length}`);
    console.log(`  • Embedding dimension: 384`);
    console.log(`  • Original size: ${fileSizeMB}MB`);
    console.log(`  • Compressed size: ${compressedSizeMB}MB`);
    console.log(`  • Build time: ${(embeddingTime / 1000).toFixed(2)}s`);
    
    console.log('\n✅ Embedding build complete!');
    
    // Cleanup
    await embeddingService.cleanup();
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  buildEmbeddings().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error(error);
    process.exit(1);
  });
}

// Export for use in build scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = buildEmbeddings;
}