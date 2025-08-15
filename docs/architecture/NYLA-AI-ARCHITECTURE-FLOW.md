# NYLA AI System Architecture Flow Diagram

## Overview
The NYLA AI system is a sophisticated RAG-powered assistant that combines local LLM inference (WebLLM), vector search (FAISS), and hybrid retrieval to provide intelligent responses about cryptocurrency transfers and blockchain technology.

## Complete System Flow

```mermaid
graph TB
    %% User Input Layer
    User[User Input] --> UI[NYLAAssistantUIV2<br/>UI Manager]
    
    %% System Controller
    UI --> SC[NYLASystemController<br/>Main Entry Point]
    SC --> |Initialize| Assistant[NYLAAssistantV2<br/>Assistant Core]
    
    %% Assistant Initialization
    Assistant --> |1| KB[Knowledge Base<br/>Structured KB via RAG]
    Assistant --> |2| CM[NYLAConversationManagerV2<br/>Conversation Logic]
    Assistant --> |3| RAG[RAG Integration<br/>enhanceConversationManagerWithRAG]
    
    %% Conversation Manager Components
    CM --> |Initialize| LLM[NYLALLMEngine<br/>WebLLM Qwen2-1.5B]
    CM --> |Initialize| KT[Knowledge Tracker<br/>Engagement System]
    
    %% Question Processing Flow
    UI --> |handleQuestionClick| CM
    CM --> |processQuestion| TI[Topic Identification<br/>Semantic or Keyword]
    
    %% RAG Pipeline Branch
    TI --> |RAG Available| RP[NYLARAGPipeline<br/>Main RAG Orchestrator]
    TI --> |Fallback| RB[Rule-Based System<br/>Keyword Matching]
    
    %% RAG Components
    RP --> ES[NYLAEmbeddingService<br/>multilingual-e5-base]
    RP --> VDB[NYLAVectorDB<br/>FAISS + IndexedDB]
    RP --> HR[NYLAHybridRetriever<br/>Dense + BM25 + Rerank]
    
    %% Retrieval Flow
    ES --> |Query Embedding| HR
    VDB --> |Vector Search| HR
    HR --> |Top-K Results| CB[NYLAContextBuilder<br/>Context Assembly]
    
    %% Context Building
    CB --> |Deduplication| CS[NYLAClusteringService<br/>Semantic Clustering]
    CB --> |Compression| CMP[NYLACompressionService<br/>Token Optimization]
    CB --> |Conversation| CC[NYLAConversationContext<br/>History Management]
    
    %% LLM Generation
    CB --> |Optimized Context| LLM
    LLM --> |Generate Response| Response[Response Object]
    
    %% Response Enhancement
    Response --> |Follow-ups| FU[Follow-up Generation]
    Response --> |Stickers| ST[Sticker Selection]
    Response --> |Metadata| META[RAG Metadata]
    
    %% UI Display
    FU --> UI
    ST --> UI
    META --> UI
    UI --> |Display| User
    
    %% Background Services
    PS[NYLAProductionSync<br/>Knowledge Updates] --> |Update Available| RP
    VM[NYLAKBVersionManager<br/>Version Control] --> |Check Rebuild| RP
    
    %% Mobile/PWA Detection
    SC -.-> |iOS Detection| DisableLLM[Disable NYLA Tab<br/>WebGPU Not Supported]
    CM -.-> |Mobile Detection| DisableLLM2[No LLM Engine<br/>Rule-Based Only]

    %% Styling
    classDef userInterface fill:#FF6B35,stroke:#333,stroke-width:2px,color:#fff
    classDef core fill:#4A90E2,stroke:#333,stroke-width:2px,color:#fff
    classDef rag fill:#7B68EE,stroke:#333,stroke-width:2px,color:#fff
    classDef llm fill:#FF1493,stroke:#333,stroke-width:2px,color:#fff
    classDef storage fill:#32CD32,stroke:#333,stroke-width:2px,color:#fff
    classDef service fill:#FFD700,stroke:#333,stroke-width:2px,color:#000
    
    class User,UI userInterface
    class SC,Assistant,CM,KT core
    class RP,ES,VDB,HR,CB,CS,CMP,CC rag
    class LLM,Response llm
    class KB,PS,VM storage
    class FU,ST,META,TI,RB service
```

## Detailed Component Interactions

### 1. **User Query Processing Flow**

```mermaid
sequenceDiagram
    participant User
    participant UI as NYLAAssistantUIV2
    participant CM as ConversationManagerV2
    participant RAG as RAG Integration
    participant LLM as LLM Engine
    
    User->>UI: Click question button
    UI->>CM: processQuestion(id, text)
    CM->>CM: identifyRelevantKnowledgeKeys()
    
    alt RAG Available
        CM->>RAG: Semantic search
        RAG->>RAG: Query embeddings
        RAG->>RAG: Vector search
        RAG->>RAG: Hybrid retrieval
        RAG-->>CM: Relevant chunks
    else Fallback
        CM->>CM: Keyword matching
        CM-->>CM: Legacy search results
    end
    
    CM->>LLM: generateResponse(context)
    LLM->>LLM: Process with Qwen2-1.5B
    LLM-->>CM: Generated response
    CM->>UI: Display response
    UI->>User: Show answer + follow-ups
```

### 2. **RAG Pipeline Details**

```mermaid
graph LR
    Query[User Query] --> PE[Pre-processing<br/>Query Rewrite]
    PE --> EMB[Embedding<br/>Generation]
    
    EMB --> DS[Dense Search<br/>FAISS Vector]
    EMB --> BS[BM25 Search<br/>Keyword Match]
    
    DS --> MERGE[Merge Results<br/>α=0.6 fusion]
    BS --> MERGE
    
    MERGE --> RERANK[Cross-Encoder<br/>Reranking]
    RERANK --> DEDUP[Deduplication<br/>Clustering]
    
    DEDUP --> CTX[Context Builder<br/>Token Budget]
    CTX --> PROMPT[Prompt Assembly]
    
    PROMPT --> Output[Final Context]
```

### 3. **LLM Processing Flow**

```mermaid
stateDiagram-v2
    [*] --> CheckDevice: Initialize LLM
    
    CheckDevice --> CheckWebGPU: Desktop Device
    CheckDevice --> Disabled: Mobile Device
    
    CheckWebGPU --> LoadModel: WebGPU Available
    CheckWebGPU --> Fallback: No WebGPU
    
    LoadModel --> WarmUp: Load Qwen2-1.5B
    WarmUp --> Ready: GPU Buffers Ready
    
    Ready --> ProcessQuery: Receive Query
    ProcessQuery --> GenerateTokens: Stream Response
    GenerateTokens --> [*]: Complete Response
    
    Fallback --> RuleBased: Use Rules
    Disabled --> RuleBased: No LLM
    RuleBased --> [*]: Rule Response
```

## Key Data Transformations

### 1. **Query → Embeddings**
- Input: "How do I send tokens on Solana?"
- Tokenization: ~8 tokens
- Embedding: 768-dimensional vector (multilingual-e5-base)

### 2. **Embeddings → Retrieved Chunks**
- Vector Search: Top-20 similar chunks
- BM25 Search: Top-20 keyword matches
- Fusion: Weighted combination (α=0.6)
- Reranking: Top-8 final chunks

### 3. **Chunks → Context**
- Deduplication: Clustering at 0.92 cosine similarity
- Compression: Field-specific token limits
- Assembly: ~600 token budget for context

### 4. **Context → Response**
- System Prompt: 150 tokens
- User Query: 100 tokens
- Context: 600 tokens
- LLM Generation: Up to 600 tokens output

## Performance Optimizations

### 1. **Parallel Processing**
```
┌─────────────────┐     ┌─────────────────┐
│ Vector Search   │     │ LLM Warmup      │
│ (FAISS)         │     │ (GPU Buffers)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │   Merge &   │
              │   Process   │
              └─────────────┘
```

### 2. **Caching Layers**
- Embedding Cache: Text → Vector mappings
- Query Cache: Full query → Response (5 min TTL)
- Vector Index: Persistent in IndexedDB

### 3. **Progressive Enhancement**
1. Show typing indicator immediately
2. Stream LLM tokens as generated
3. Display follow-ups after response
4. Load stickers asynchronously

## Communication Between Components

### 1. **Initialization Chain**
```
SystemController
    → AssistantV2
        → ConversationManagerV2
            → LLMEngine (async)
            → KnowledgeTracker
        → RAGIntegration
            → RAGPipeline
                → EmbeddingService
                → VectorDB
                → Retriever
        → UIV2
```

### 2. **Query Processing Chain**
```
UI Event
    → ConversationManager.processQuestion()
        → Topic Identification (RAG or Keywords)
        → Knowledge Retrieval
        → Context Building
        → LLM Generation (or Rule-based)
        → Response Enhancement
    → UI.displayMessage()
    → UI.displayQuestions()
```

### 3. **Background Services**
- **Production Sync**: Hourly checks for knowledge updates
- **Version Manager**: Validates index freshness
- **Conversation Context**: Maintains rolling history window

## Error Handling & Fallbacks

1. **LLM Failures** → Fall back to rule-based responses
2. **RAG Failures** → Fall back to keyword search
3. **WebGPU Unavailable** → Disable LLM, use rules only
4. **iOS Detection** → Show friendly message, disable NYLA tab
5. **Timeout (30s)** → Return debug information

## Key Features

1. **Hybrid Search**: Combines semantic (dense) and keyword (sparse) retrieval
2. **Advanced Deduplication**: Two-cap approach with clustering
3. **Conversation Memory**: Context-aware responses
4. **Streaming Responses**: Real-time token generation
5. **Multilingual Support**: Chinese glossary integration
6. **Engagement Tracking**: Knowledge exposure monitoring
7. **Personal Care**: Timezone-aware check-ins
8. **Progressive Web App**: Offline capability with service workers