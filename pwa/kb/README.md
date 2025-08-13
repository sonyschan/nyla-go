# NYLA Bilingual Knowledge Base

## 📁 Directory Structure

```
/pwa/kb/
├── schema.json              # Chunk schema definition
├── glossary/
│   └── terms.json          # Bilingual term mappings (ZH ↔ EN)
├── facts/
│   └── networks.json       # Blockchain network information
├── policy/
│   └── wording.json        # Terminology and wording guidelines
├── howto/
│   ├── qr_codes.json       # QR code creation steps
│   ├── transfers.json      # Token transfer guide
│   └── raids.json          # Community engagement guide
├── about/
│   └── team.json           # Team and project information
├── faq/
│   └── common.json         # Frequently asked questions
├── marketing/              # Marketing content (empty)
└── changelog/              # Version changelog (empty)
```

## 🎯 Purpose

This knowledge base supports:
- **Bilingual RAG System**: English and Chinese language support
- **Structured Content**: JSON files with consistent schema
- **Runtime Loading**: Dynamically loaded by PWA and Extension
- **Hybrid Search**: Dense vector + BM25 keyword search

## 📋 Chunk Schema

Each knowledge chunk follows this structure:

### Required Fields
- `id`: Unique identifier
- `source_id`: Source document/topic identifier  
- `type`: Content type (facts|howto|policy|faq|marketing|changelog|about)
- `lang`: Language (en|zh|bilingual)
- `title`: Human readable title
- `section`: Subsection within source
- `tags`: Searchable keywords array
- `as_of`: ISO date of last verification
- `stability`: stable|evolving|deprecated
- `source_url`: Reference URL
- `hash`: Content hash for deduplication
- `body`: Main content
- `summary_en`: English summary (50-100 words)
- `summary_zh`: Chinese summary (50-100 characters)

### Optional Fields
- `priority`: Relevance weight (1-10)
- `related_chunks`: Related chunk IDs
- `examples`: Code/usage examples
- `glossary_terms`: Terms needing translation context

## 🌐 Bilingual Support

### Glossary System
- **Chinese → English**: Term mappings with synonyms
- **Query Rewriting**: Automatic query expansion
- **Context Awareness**: Domain-specific translations

### Language Handling
- **English**: 200-300 token chunks, 15-20% overlap
- **Chinese**: 350-500 character chunks, 15-20% overlap  
- **Bilingual**: Separate chunks per language with cross-references

## 🔍 Search Integration

### Hybrid Retrieval
1. **Query Preprocessing**: Glossary-based rewriting
2. **Dense Search**: Multilingual embeddings (top-40)
3. **BM25 Search**: Keyword matching (top-40)
4. **Fusion**: 60% dense + 40% BM25 weighting
5. **Reranking**: Cross-encoder scoring (top-10)

### Access Patterns
```javascript
// Direct file loading
const response = await fetch('/kb/facts/networks.json');

// Via multilingual ingest
const ingest = new NYLAMultilingualIngest();
await ingest.ingestKnowledgeBase();

// Via bilingual KB loader  
const kb = await initializeBilingualKnowledgeBase();
const results = await kb.search('query', options);
```

## 📱 Mobile Optimization

- **Desktop**: Full bilingual RAG with hybrid search
- **Mobile**: Fallback to original minimal KB (performance)
- **Progressive Enhancement**: Advanced features on capable devices

## 🛠️ Development

### Adding New Content
1. Create JSON file in appropriate directory
2. Follow chunk schema exactly
3. Include bilingual summaries
4. Add relevant tags and metadata

### Content Types
- **facts/**: Technical specifications and authoritative information
- **howto/**: Step-by-step tutorials and guides
- **policy/**: Rules, guidelines, and terminology standards
- **faq/**: Common questions and answers
- **about/**: Team, project, and organizational information

### Validation
- Schema validation during build process
- JSON syntax checking
- Cross-reference validation
- Bilingual content completeness

## 🚀 Performance

### Loading Strategy
- **Lazy Loading**: Load only needed sections
- **Parallel Loading**: Multiple files simultaneously  
- **Caching**: Individual file caching vs monolithic
- **Mobile Fallback**: Skip heavy processing on mobile

### Search Performance
- **Multilingual Embeddings**: ~384 dimensions
- **BM25 Index**: Combined EN/ZH tokenization
- **Vector Search**: FAISS-based similarity
- **Response Time**: Target <2s for hybrid queries

## 📊 Statistics

Current KB contains:
- **7 active files** across 6 content types
- **~25 structured chunks** with bilingual support
- **Comprehensive glossary** with 50+ term mappings
- **Mobile-optimized** fallback system

---

*Generated for NYLA Bilingual RAG System v2.4.0*