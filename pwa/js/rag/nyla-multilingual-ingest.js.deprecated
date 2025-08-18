/**
 * NYLA Multilingual Knowledge Base Ingest Script
 * Processes structured KB files into multilingual embeddings with BM25 indexing
 */

class NYLAMultilingualIngest {
  constructor(options = {}) {
    this.options = {
      embeddingModel: 'Xenova/multilingual-e5-base', // Multilingual model (consistent with main system)
      dimension: 768,  // multilingual-e5-base dimensions
      chunkingRules: {
        english: {
          tokenRange: [200, 300],
          overlapPercent: 0.175 // 15-20% overlap
        },
        chinese: {
          charRange: [350, 500], 
          overlapPercent: 0.175
        },
        bilingual: {
          separateChunks: true // Create separate chunks for each language
        }
      },
      bm25Config: {
        k1: 1.2,
        b: 0.75,
        indexFields: ['title', 'summary_en', 'summary_zh', 'body_preview']
      },
      ...options
    };
    
    this.embeddingService = null;
    this.bm25Index = null;
    this.glossary = null;
    this.processedChunks = [];
    this.statistics = {
      totalFiles: 0,
      totalChunks: 0,
      languageBreakdown: { en: 0, zh: 0, bilingual: 0 },
      processingTime: 0,
      embeddingTime: 0,
      indexingTime: 0
    };
    
    console.log('🌐 Multilingual Ingest initialized with model:', this.options.embeddingModel);
  }

  /**
   * Initialize embedding service with multilingual model
   */
  async initialize() {
    console.log('🚀 Initializing multilingual embedding service...');
    
    // Initialize with multilingual model
    this.embeddingService = new NYLAEmbeddingService({
      modelName: this.options.embeddingModel,
      dimension: this.options.dimension,
      performanceLogging: true
    });
    
    await this.embeddingService.initialize();
    
    // Load glossary for query rewriting
    await this.loadGlossary();
    
    console.log('✅ Multilingual ingest service initialized');
  }

  /**
   * Load bilingual glossary
   */
  async loadGlossary() {
    try {
      const response = await fetch('/kb/glossary/terms.json');
      const glossaryData = await response.json();
      this.glossary = glossaryData.glossary;
      console.log('📚 Bilingual glossary loaded');
    } catch (error) {
      console.error('❌ Failed to load glossary:', error);
      this.glossary = {};
    }
  }

  /**
   * Process all KB files and create multilingual index
   */
  async ingestKnowledgeBase(onProgress) {
    const startTime = performance.now();
    console.log('🏗️ Starting multilingual knowledge base ingestion...');
    
    try {
      // Step 1: Load and validate all KB files
      const kbFiles = await this.loadKBFiles();
      console.log(`📂 Loaded ${kbFiles.length} KB files`);
      
      // Step 2: Process chunks with multilingual handling
      const allChunks = await this.processAllChunks(kbFiles, onProgress);
      console.log(`📦 Created ${allChunks.length} chunks`);
      
      // Step 3: Generate multilingual embeddings
      const embeddedChunks = await this.generateMultilingualEmbeddings(
        allChunks, 
        onProgress
      );
      console.log(`🧮 Generated embeddings for ${embeddedChunks.length} chunks`);
      
      // Step 4: Build BM25 index
      await this.buildBM25Index(embeddedChunks, onProgress);
      console.log('🔍 BM25 index built');
      
      // Step 5: Build vector index (FAISS)
      await this.buildVectorIndex(embeddedChunks, onProgress);
      console.log('🎯 Vector index built');
      
      const totalTime = performance.now() - startTime;
      this.statistics.processingTime = totalTime;
      
      console.log(`✅ Multilingual ingestion complete in ${totalTime.toFixed(1)}ms`);
      console.log('📊 Statistics:', this.getStatistics());
      
      return {
        chunks: embeddedChunks,
        bm25Index: this.bm25Index,
        statistics: this.getStatistics()
      };
      
    } catch (error) {
      console.error('❌ Multilingual ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Load all KB files from the structured directory
   */
  async loadKBFiles() {
    const kbStructure = [
      'facts/networks.json',
      'policy/wording.json', 
      'howto/qr_codes.json',
      'howto/transfers.json',
      'howto/raids.json',
      'about/team.json',
      'faq/common.json'
    ];
    
    const kbFiles = [];
    
    for (const filePath of kbStructure) {
      try {
        const response = await fetch(`/kb/${filePath}`);
        if (response.ok) {
          const fileData = await response.json();
          kbFiles.push({
            path: filePath,
            type: filePath.split('/')[0], // facts, policy, howto, etc.
            data: fileData
          });
        } else {
          console.warn(`⚠️ Could not load ${filePath}: ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ Error loading ${filePath}:`, error);
      }
    }
    
    this.statistics.totalFiles = kbFiles.length;
    return kbFiles;
  }

  /**
   * Process all chunks with language-aware chunking
   */
  async processAllChunks(kbFiles, onProgress) {
    const allChunks = [];
    let processedFiles = 0;
    
    for (const kbFile of kbFiles) {
      if (kbFile.data.chunks) {
        for (const chunk of kbFile.data.chunks) {
          // Validate chunk schema
          if (this.validateChunk(chunk)) {
            // Process based on language
            const processedChunks = await this.processChunkByLanguage(chunk);
            allChunks.push(...processedChunks);
          } else {
            console.warn('⚠️ Invalid chunk schema:', chunk.id);
          }
        }
      }
      
      processedFiles++;
      if (onProgress) {
        onProgress({
          stage: 'chunk_processing',
          current: processedFiles,
          total: kbFiles.length,
          percentage: Math.round((processedFiles / kbFiles.length) * 100)
        });
      }
    }
    
    this.statistics.totalChunks = allChunks.length;
    return allChunks;
  }

  /**
   * Validate chunk against schema
   */
  validateChunk(chunk) {
    const requiredFields = [
      'id', 'source_id', 'type', 'lang', 'title', 'section', 
      'tags', 'as_of', 'stability', 'source_url', 'hash', 
      'body', 'summary_en', 'summary_zh'
    ];
    
    return requiredFields.every(field => chunk.hasOwnProperty(field));
  }

  /**
   * Process chunk based on language type
   */
  async processChunkByLanguage(chunk) {
    const processedChunks = [];
    
    switch (chunk.lang) {
      case 'en':
        processedChunks.push(await this.processEnglishChunk(chunk));
        this.statistics.languageBreakdown.en++;
        break;
        
      case 'zh':
        processedChunks.push(await this.processChineseChunk(chunk));
        this.statistics.languageBreakdown.zh++;
        break;
        
      case 'bilingual':
        // Create separate chunks for each language
        const enChunk = await this.processEnglishChunk({
          ...chunk,
          id: chunk.id + '_en',
          lang: 'en',
          title: chunk.title,
          body: chunk.summary_en + '. ' + chunk.body // Enhance with English summary
        });
        
        const zhChunk = await this.processChineseChunk({
          ...chunk,
          id: chunk.id + '_zh', 
          lang: 'zh',
          title: chunk.title,
          body: chunk.summary_zh + '。' + chunk.body // Enhance with Chinese summary
        });
        
        // Cross-reference the chunks
        enChunk.related_chunks = [zhChunk.id];
        zhChunk.related_chunks = [enChunk.id];
        
        processedChunks.push(enChunk, zhChunk);
        this.statistics.languageBreakdown.bilingual++;
        break;
        
      default:
        console.warn(`⚠️ Unknown language type: ${chunk.lang}`);
        processedChunks.push(chunk);
    }
    
    return processedChunks;
  }

  /**
   * Process English chunk with token-based chunking
   */
  async processEnglishChunk(chunk) {
    const { tokenRange, overlapPercent } = this.options.chunkingRules.english;
    const tokens = this.tokenizeEnglish(chunk.body);
    
    if (tokens.length <= tokenRange[1]) {
      // Chunk is small enough, return as-is
      return {
        ...chunk,
        token_count: tokens.length,
        body_preview: tokens.slice(0, 50).join(' ') // First 50 tokens for BM25
      };
    }
    
    // TODO: Implement sliding window chunking for large content
    // For now, truncate to max tokens
    const truncatedTokens = tokens.slice(0, tokenRange[1]);
    
    return {
      ...chunk,
      body: truncatedTokens.join(' '),
      token_count: truncatedTokens.length,
      body_preview: truncatedTokens.slice(0, 50).join(' ')
    };
  }

  /**
   * Process Chinese chunk with character-based chunking
   */
  async processChineseChunk(chunk) {
    const { charRange, overlapPercent } = this.options.chunkingRules.chinese;
    const chars = [...chunk.body]; // Handle multi-byte characters correctly
    
    if (chars.length <= charRange[1]) {
      // Chunk is small enough, return as-is
      return {
        ...chunk,
        char_count: chars.length,
        body_preview: chars.slice(0, 100).join('') // First 100 chars for BM25
      };
    }
    
    // TODO: Implement sliding window chunking for large content
    // For now, truncate to max characters
    const truncatedChars = chars.slice(0, charRange[1]);
    
    return {
      ...chunk,
      body: truncatedChars.join(''),
      char_count: truncatedChars.length,
      body_preview: truncatedChars.slice(0, 100).join('')
    };
  }

  /**
   * Simple English tokenization
   */
  tokenizeEnglish(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Generate multilingual embeddings for all chunks
   */
  async generateMultilingualEmbeddings(chunks, onProgress) {
    const startTime = performance.now();
    console.log(`🧮 Generating multilingual embeddings for ${chunks.length} chunks...`);
    
    const texts = chunks.map(chunk => {
      // Create rich text for embedding that includes context
      const contextText = [
        chunk.title,
        chunk.summary_en,
        chunk.summary_zh,
        chunk.body
      ].filter(text => text && text.length > 0).join('. ');
      
      return contextText;
    });
    
    // Generate embeddings in batches
    const embeddings = await this.embeddingService.embedBatch(texts, (progress) => {
      if (onProgress) {
        onProgress({
          stage: 'embedding_generation',
          ...progress,
          estimatedTime: progress.estimatedTimeRemaining
        });
      }
    });
    
    // Combine chunks with embeddings and normalize
    const embeddedChunks = chunks.map((chunk, i) => ({
      ...chunk,
      embedding: this.l2Normalize(embeddings[i]),
      embedding_model: this.options.embeddingModel,
      embedding_dimension: this.options.dimension,
      embedding_text: texts[i] // Store text used for embedding
    }));
    
    const embeddingTime = performance.now() - startTime;
    this.statistics.embeddingTime = embeddingTime;
    
    console.log(`✅ Multilingual embeddings generated in ${embeddingTime.toFixed(1)}ms`);
    return embeddedChunks;
  }

  /**
   * L2 normalize embedding vector
   */
  l2Normalize(vector) {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? vector.map(val => val / norm) : vector;
  }

  /**
   * Build BM25 index for hybrid retrieval
   */
  async buildBM25Index(chunks, onProgress) {
    const startTime = performance.now();
    console.log('🔍 Building BM25 index...');
    
    // Create documents for BM25 indexing
    const documents = chunks.map(chunk => {
      const indexText = [
        chunk.title,
        chunk.summary_en,
        chunk.summary_zh,
        chunk.body_preview || chunk.body.slice(0, 500)
      ].filter(text => text && text.length > 0).join(' ');
      
      return {
        id: chunk.id,
        text: indexText,
        tokens: this.tokenizeForBM25(indexText),
        chunk: chunk
      };
    });
    
    // Build BM25 index (simplified implementation)
    this.bm25Index = new NYLABM25Index(documents, this.options.bm25Config);
    
    const indexingTime = performance.now() - startTime;
    this.statistics.indexingTime = indexingTime;
    
    console.log(`✅ BM25 index built in ${indexingTime.toFixed(1)}ms`);
    
    if (onProgress) {
      onProgress({
        stage: 'bm25_indexing',
        current: chunks.length,
        total: chunks.length,
        percentage: 100
      });
    }
  }

  /**
   * Tokenize text for BM25 (handles both English and Chinese)
   */
  tokenizeForBM25(text) {
    // Simple tokenization that works for both languages
    const tokens = [];
    
    // Split by spaces and punctuation
    const words = text.toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s]/g, ' ') // Keep alphanumeric and Chinese chars
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    // Add individual Chinese characters as tokens
    for (const word of words) {
      tokens.push(word);
      
      // If word contains Chinese characters, also add individual characters
      if (/[\u4e00-\u9fff]/.test(word)) {
        tokens.push(...[...word].filter(char => /[\u4e00-\u9fff]/.test(char)));
      }
    }
    
    return [...new Set(tokens)]; // Remove duplicates
  }

  /**
   * Build vector index using existing vector DB
   */
  async buildVectorIndex(chunks, onProgress) {
    console.log('🎯 Building vector index...');
    
    // Use existing vector DB infrastructure
    const vectorDB = new NYLAVectorDB();
    await vectorDB.initialize();
    
    // Add chunks to vector database
    await vectorDB.addChunks(chunks, onProgress);
    
    console.log('✅ Vector index built');
  }

  /**
   * Get processing statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      embeddingModel: this.options.embeddingModel,
      averageEmbeddingTime: this.statistics.totalChunks > 0 
        ? (this.statistics.embeddingTime / this.statistics.totalChunks).toFixed(2) + 'ms/chunk'
        : '0ms/chunk'
    };
  }
}

/**
 * Simplified BM25 Index Implementation
 */
class NYLABM25Index {
  constructor(documents, config = {}) {
    this.config = {
      k1: 1.2,
      b: 0.75,
      ...config
    };
    
    this.documents = documents;
    this.docCount = documents.length;
    this.avgDocLength = 0;
    this.termFreq = new Map(); // term -> document frequencies
    this.docTermFreq = new Map(); // doc_id -> term -> frequency
    
    this.buildIndex();
  }

  buildIndex() {
    let totalLength = 0;
    
    // Calculate term frequencies
    for (const doc of this.documents) {
      const termCounts = new Map();
      totalLength += doc.tokens.length;
      
      // Count term frequencies in this document
      for (const term of doc.tokens) {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
        
        // Update global term document frequency
        if (!this.termFreq.has(term)) {
          this.termFreq.set(term, new Set());
        }
        this.termFreq.get(term).add(doc.id);
      }
      
      this.docTermFreq.set(doc.id, termCounts);
    }
    
    this.avgDocLength = totalLength / this.docCount;
  }

  search(queryTokens, topK = 40) {
    const scores = new Map();
    
    for (const doc of this.documents) {
      let score = 0;
      const docLength = doc.tokens.length;
      const docTerms = this.docTermFreq.get(doc.id);
      
      for (const term of queryTokens) {
        const termFreq = docTerms.get(term) || 0;
        if (termFreq === 0) continue;
        
        const docFreq = this.termFreq.get(term)?.size || 0;
        if (docFreq === 0) continue;
        
        // BM25 formula
        const idf = Math.log((this.docCount - docFreq + 0.5) / (docFreq + 0.5));
        const tf = (termFreq * (this.config.k1 + 1)) / 
                  (termFreq + this.config.k1 * (1 - this.config.b + this.config.b * (docLength / this.avgDocLength)));
        
        score += idf * tf;
      }
      
      if (score > 0) {
        scores.set(doc.id, { score, chunk: doc.chunk });
      }
    }
    
    // Sort by score and return top K
    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(result => ({
        ...result.chunk,
        bm25_score: result.score
      }));
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NYLAMultilingualIngest, NYLABM25Index };
}
window.NYLAMultilingualIngest = NYLAMultilingualIngest;
window.NYLABM25Index = NYLABM25Index;