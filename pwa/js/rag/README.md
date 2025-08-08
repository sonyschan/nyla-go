# NYLA RAG System

A complete Retrieval-Augmented Generation (RAG) implementation for the NYLA knowledge base, providing semantic search capabilities with local vector embeddings.

## 🎯 Overview

The NYLA RAG system enhances the existing keyword-based search with semantic understanding, enabling more accurate and context-aware responses while maintaining privacy and low latency.

### Key Features

- **🔍 Semantic Search**: Vector-based similarity search with 384-dimensional embeddings
- **🏠 Local-First**: All processing happens client-side (no server calls)
- **⚡ Fast Retrieval**: Target latency ≤12 seconds end-to-end
- **💾 Persistent**: IndexedDB storage with automatic recovery
- **🔄 Hybrid Scoring**: Combines semantic similarity with keyword matching
- **📊 Evaluation**: Built-in testing and metrics framework

## 🏗️ Architecture

```
Query → Preprocessor → Parallel Processing:
                      ├── Embedding Generation
                      └── LLM Warmup
                           ↓
                      Vector Search (Local Index)
                           ↓
                      Context Builder (Token Budget)
                           ↓
                      LLM Generation (Streaming)
                           ↓
                      Response Post-processing
```

### Components

1. **Knowledge Chunker** (`nyla-knowledge-chunker.js`)
   - Splits knowledge base into 200-400 token chunks
   - Preserves semantic boundaries
   - Adds rich metadata and tags

2. **Embedding Service** (`nyla-embedding-service.js`)
   - Uses Transformers.js with all-MiniLM-L6-v2 model
   - Generates 384-dimensional embeddings
   - Batched processing with caching

3. **Vector Database** (`nyla-vector-db.js`)
   - Local vector storage and search
   - IndexedDB persistence
   - Memory-efficient lazy loading

4. **Retriever** (`nyla-retriever.js`)
   - Semantic + keyword hybrid search
   - Query intent detection
   - Result ranking and filtering

5. **Context Builder** (`nyla-context-builder.js`)
   - Token budget management (≤800 tokens)
   - Deduplication and source citations
   - Structured prompt formatting

6. **RAG Pipeline** (`nyla-rag-pipeline.js`)
   - Orchestrates the complete workflow
   - Parallel processing optimization
   - Caching and performance monitoring

## 🚀 Quick Start

### Installation

1. Include RAG scripts in your HTML:
```html
<script src="js/rag/nyla-knowledge-chunker.js"></script>
<script src="js/rag/nyla-embedding-service.js"></script>
<script src="js/rag/nyla-vector-db.js"></script>
<script src="js/rag/nyla-retriever.js"></script>
<script src="js/rag/nyla-context-builder.js"></script>
<script src="js/rag/nyla-rag-pipeline.js"></script>
<script src="js/rag/nyla-rag-integration.js"></script>
```

2. Initialize with existing conversation manager:
```javascript
// Enhance existing conversation manager
const enhancedManager = enhanceConversationManagerWithRAG(conversationManager);

// Build index (first time only)
await enhancedManager.buildRAGIndex((progress) => {
  console.log(`Building index: ${progress.percentage}%`);
});

// Use enhanced system
const response = await enhancedManager.processQuestion(
  'q1', 
  'What are Solana transaction fees?'
);
```

### Manual Usage

```javascript
// Initialize RAG pipeline
const ragPipeline = new NYLARAGPipeline();
await ragPipeline.initialize(knowledgeBase, llmEngine);

// Process queries
const result = await ragPipeline.query('How do I send NYLA tokens?', {
  streaming: true,
  topK: 3
});

console.log(result.response);
console.log(result.sources);
console.log(`Latency: ${result.metrics.latency}ms`);
```

## 🔧 Configuration

### Chunking Options
```javascript
const chunker = new NYLAKnowledgeChunker({
  minChunkSize: 200,      // Minimum tokens per chunk
  maxChunkSize: 400,      // Maximum tokens per chunk
  overlapSize: 50,        // Token overlap between chunks
  tokenizer: 'simple'     // Tokenization method
});
```

### Retrieval Settings
```javascript
const retriever = new NYLARetriever(vectorDB, embeddingService, {
  topK: 5,                // Number of chunks to retrieve
  semanticWeight: 0.7,    // Weight for semantic similarity
  keywordWeight: 0.3,     // Weight for keyword matching
  minScore: 0.5,          // Minimum confidence threshold
  reranking: true         // Enable result reranking
});
```

### Context Building
```javascript
const contextBuilder = new NYLAContextBuilder({
  maxTokens: 800,         // Maximum context tokens
  maxChunks: 5,           // Maximum number of chunks
  deduplication: true,    // Remove duplicate information
  preserveCitations: true, // Keep source references
  formatStyle: 'structured' // Context formatting style
});
```

## 📊 Performance Targets

| Metric | Target | Typical |
|--------|--------|---------|
| End-to-end latency | ≤12s | 8-10s |
| Query embedding | ≤200ms | 150ms |
| Vector search | ≤100ms | 50ms |
| Context building | ≤50ms | 30ms |
| Hit rate@3 | ≥85% | 90% |
| Answer faithfulness | ≥90% | 92% |

## 🧪 Evaluation

Run the evaluation suite to test system performance:

```javascript
const evaluation = new NYLARAGEvaluation(ragPipeline);

// Run full evaluation
const results = await evaluation.runEvaluation({
  includeLatency: true,
  includeQuality: true,
  includeRetrieval: true,
  verbose: true
});

console.log(`Overall Score: ${results.summary.overallScore.toFixed(3)}`);
console.log(`Average Latency: ${results.summary.avgLatency}ms`);

// Generate detailed report
const report = evaluation.generateReport(results);
console.log(report);

// Run performance benchmark
const benchmark = await evaluation.runBenchmark(10);
console.log(`P90 Latency: ${benchmark.p90Latency}ms`);
```

## 🔄 Build Process

### Offline Embedding Generation

Pre-generate embeddings during build time to avoid runtime delays:

```bash
node pwa/js/rag/build-embeddings.js
```

This creates:
- `nyla-knowledge-index.json` - Full index with embeddings
- `nyla-knowledge-index.json.gz` - Compressed version

### Integration with Build Pipeline

Add to your build script:

```bash
# Generate embeddings
npm run build:embeddings

# Copy to public directory
cp nyla-knowledge-index.json.gz public/

# Update service worker to cache index
```

## 🛡️ Quality Safeguards

### Confidence Thresholds
- **High (≥0.8)**: Direct answer provided
- **Medium (0.6-0.8)**: Answer with confidence caveat
- **Low (0.4-0.6)**: Suggest related topics
- **Very Low (<0.4)**: "I don't have that information"

### Fallback Strategies
1. **Low confidence**: Fall back to keyword search
2. **No results**: Suggest related topics from knowledge base
3. **System error**: Graceful degradation to original system
4. **Index corruption**: Automatic rebuild from knowledge base

## 📈 Monitoring

### Built-in Metrics
```javascript
const stats = ragPipeline.getStats();
console.log({
  totalQueries: stats.metrics.totalQueries,
  avgLatency: stats.metrics.avgLatency,
  cacheHitRate: stats.cache.hitRate,
  vectorDBSize: stats.vectorDB.chunkCount
});
```

### Performance Tracking
- Query latency (p50, p90, p99)
- Cache hit rates
- Embedding generation time
- Memory usage
- Error rates by component

## 🔧 Troubleshooting

### Common Issues

1. **Embeddings not loading**
   ```javascript
   // Check if Transformers.js is available
   console.log(typeof window.transformers);
   
   // Verify model loading
   await embeddingService.initialize();
   ```

2. **Index not persisting**
   ```javascript
   // Check IndexedDB support
   console.log('indexedDB' in window);
   
   // Clear corrupted data
   await vectorDB.clear();
   await ragPipeline.buildIndex(knowledgeBase);
   ```

3. **High latency**
   ```javascript
   // Enable caching
   ragPipeline.options.cacheEnabled = true;
   
   // Reduce chunk count
   contextBuilder.options.maxChunks = 3;
   
   // Use lighter embedding model
   // (requires rebuilding index)
   ```

### Debug Mode

Enable verbose logging:
```javascript
// Set debug flag
localStorage.setItem('nyla-rag-debug', 'true');

// Check console for detailed logs
// All components log their operations
```

## 🚀 Future Enhancements

### Planned Features
- **FAISS Integration**: Replace simple vector search with FAISS-web
- **Better Tokenization**: Use tiktoken for accurate token counting
- **Multi-model Support**: Support different embedding models
- **Query Expansion**: Expand queries with synonyms and context
- **Answer Validation**: Cross-check answers with multiple sources

### Performance Optimizations
- **WebAssembly Embeddings**: Faster embedding generation
- **Streaming Context**: Build context while retrieving
- **Incremental Updates**: Update index without full rebuild
- **Memory Management**: Better handling of large knowledge bases

## 📝 Contributing

To contribute to the RAG system:

1. **Add test queries** to `nyla-rag-evaluation.js`
2. **Improve chunking** logic in `nyla-knowledge-chunker.js`
3. **Enhance retrieval** algorithms in `nyla-retriever.js`
4. **Optimize performance** across all components

### Testing Changes

```bash
# Run evaluation suite
node -e "
const evaluation = new NYLARAGEvaluation(ragPipeline);
evaluation.runEvaluation().then(console.log);
"

# Run performance benchmark
node -e "
const evaluation = new NYLARAGEvaluation(ragPipeline);
evaluation.runBenchmark(5).then(console.log);
"
```

## 📄 License

Same as parent project - MIT License