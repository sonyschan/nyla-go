# NYLA RAG Architecture Design

## 🎯 System Requirements

### Performance Targets
- **Latency**: ≤12 seconds end-to-end
- **Privacy**: No server calls by default (fully local)
- **Max Prompt Tokens**: 800-1000 tokens (optimized for 1.5B models)
- **Success Metrics**: 
  - Hit rate@k ≥ 85%
  - Answer faithfulness ≥ 90%
  - User satisfaction ≥ 4.5/5

## 🏗️ Architecture Overview

```
User Query → Query Preprocessor → Parallel Processing:
                                   ├── Embedding Generation
                                   └── LLM Warmup
                                        ↓
                                   Vector Search (FAISS)
                                        ↓
                                   Context Builder
                                        ↓
                                   LLM Generation (Streaming)
                                        ↓
                                   Response Post-processing
```

## 📊 Data Pipeline

### 1. Chunking Schema
```javascript
{
  id: "kb_chunk_001",
  text: "NYLA supports transfers on Solana with fees around $0.0001...",
  metadata: {
    source: "supportedBlockchains",
    section: "solana.baseKnowledge",
    title: "Solana Network Information",
    tags: ["blockchain", "solana", "fees", "transfers"],
    source_url: "internal://knowledge-base#solana",
    updated_at: "2025-08-07T00:00:00Z",
    token_count: 245,
    chunk_index: 1,
    total_chunks: 3
  }
}
```

### 2. Embedding Configuration
```javascript
{
  model: "all-MiniLM-L6-v2",  // 384 dimensions, 22.7MB
  dimension: 384,
  max_seq_length: 256,
  normalization: "l2"
}
```

### 3. Vector Index Structure
```javascript
{
  version: "1.0.0",
  model: "all-MiniLM-L6-v2",
  dimension: 384,
  chunks: [
    {
      id: "chunk_001",
      vector: Float32Array(384),
      metadata: {...},
      text: "..."
    }
  ],
  index_metadata: {
    created_at: "2025-08-07T00:00:00Z",
    total_chunks: 150,
    avg_chunk_size: 250
  }
}
```

## 🔧 Implementation Components

### 1. Knowledge Chunker (`nyla-knowledge-chunker.js`)
- Split JSON knowledge into semantic chunks
- Target size: 200-400 tokens
- Preserve context boundaries
- Add rich metadata

### 2. Text Normalizer (`nyla-text-normalizer.js`)
- Lowercase conversion
- Markup stripping
- Deduplication
- Sentence filtering

### 3. Embedding Service (`nyla-embedding-service.js`)
- Load ONNX model via Transformers.js
- Batch processing support
- Caching layer
- Progress tracking

### 4. Vector Database (`nyla-vector-db.js`)
- FAISS-web integration
- IndexedDB persistence
- Lazy loading
- Memory management

### 5. Retriever (`nyla-retriever.js`)
- Semantic search (top-k)
- Hybrid scoring (semantic + keyword)
- Metadata filtering
- Result ranking

### 6. Context Builder (`nyla-context-builder.js`)
- Chunk deduplication
- Token budget enforcement
- Citation preservation
- Context ordering

### 7. RAG Pipeline (`nyla-rag-pipeline.js`)
- Query preprocessing
- Parallel execution
- Streaming support
- Error handling

## 📈 Performance Optimizations

### Caching Strategy
1. **Embedding Cache**: Store query embeddings in memory
2. **Index Cache**: Keep FAISS index in memory after first load
3. **Result Cache**: Cache frequent query results (5-minute TTL)

### Latency Breakdown Target
- Query embedding: 200ms
- Vector search: 100ms
- Context building: 50ms
- LLM generation: 8-10s
- Post-processing: 50ms
- **Total**: ~10-11s (under 12s target)

## 🧪 Evaluation Framework

### Test Set Structure
```javascript
{
  queries: [
    {
      id: "test_001",
      query: "What are Solana transaction fees?",
      expected_chunks: ["kb_chunk_001", "kb_chunk_045"],
      expected_answer_contains: ["$0.0001", "extremely low", "Solana"],
      category: "blockchain_fees"
    }
  ]
}
```

### Metrics Tracking
- Hit rate@k (k=1,3,5)
- Mean Reciprocal Rank (MRR)
- Answer faithfulness score
- Latency percentiles (p50, p90, p99)
- User feedback scores

## 🔄 Update Pipeline

### Version Management
```javascript
// Index versioning
const INDEX_VERSION = "v1.0.0";
const INDEX_FILE = `nyla-kb-index-${INDEX_VERSION}.json`;

// Hot-swap support
async function updateIndex(newVersion) {
  // Download new index
  // Validate integrity
  // Atomic swap in IndexedDB
  // Clear old cache
}
```

### Build Process
1. Knowledge base changes detected
2. Run chunking pipeline
3. Generate embeddings (offline)
4. Build FAISS index
5. Version and compress
6. Deploy to PWA

## 🛡️ Quality Safeguards

### Confidence Thresholds
```javascript
const CONFIDENCE_THRESHOLDS = {
  high: 0.85,    // Direct answer
  medium: 0.70,  // Answer with caveat
  low: 0.50,     // Suggest related topics
  none: 0.0      // "I don't know"
};
```

### Fallback Strategies
1. No high-confidence chunks → "I couldn't find specific information..."
2. Multiple medium-confidence → Present options to user
3. System overload → Fallback to keyword search
4. Index corruption → Rebuild from cached knowledge base

## 🚀 Migration Plan

### Phase 1: Foundation (Week 1)
- Set up chunking pipeline
- Implement text normalization
- Create embedding service

### Phase 2: Vector DB (Week 2)
- Integrate FAISS-web
- Implement IndexedDB persistence
- Build retriever component

### Phase 3: Integration (Week 3)
- Create RAG pipeline
- Integrate with existing LLM
- Implement streaming

### Phase 4: Optimization (Week 4)
- Performance tuning
- Caching implementation
- Evaluation framework

### Phase 5: Production (Week 5)
- User testing
- Monitoring setup
- Documentation