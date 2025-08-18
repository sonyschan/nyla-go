#!/usr/bin/env node

/**
 * NYLA Knowledge Base Embeddings Builder (Node.js)
 * Generates embeddings for the knowledge base in Node.js environment
 * 
 * Usage:
 *   node build-embeddings-nodejs.js
 *   npm run build:embeddings
 */

const path = require('path');
const fs = require('fs').promises;

// Import environment abstraction layer
const { 
  NYLAStorage, 
  NYLAEmbeddingEnvironment, 
  NYLAUtils 
} = require('./nyla-environment.js');

// Simple Node.js compatible logger
class NYLALogger {
  constructor(component = 'System') {
    this.component = component;
  }
  
  log(message, ...args) {
    console.log(`[${this.component}] ${message}`, ...args);
  }
  
  success(message, ...args) {
    console.log(`[${this.component}] ✅ ${message}`, ...args);
  }
  
  error(message, ...args) {
    console.error(`[${this.component}] ❌ ${message}`, ...args);
  }
  
  warn(message, ...args) {
    console.warn(`[${this.component}] ⚠️ ${message}`, ...args);
  }
}

class NYLANodeEmbeddingBuilder {
  constructor() {
    this.logger = new NYLALogger('Build');
    this.storage = new NYLAStorage();
    this.embeddingService = new NYLAEmbeddingEnvironment();
    
    this.initialized = false;
    this.outputDir = path.join(process.cwd(), 'embeddings-data');
    this.webOutputDir = path.join(process.cwd(), 'pwa/data');
  }
  
  /**
   * Initialize the builder
   */
  async initialize() {
    if (this.initialized) return;
    
    this.logger.log('Initializing Node.js embedding builder...');
    
    try {
      // Initialize storage
      await this.storage.initialize();
      
      // Initialize embedding service with timeout
      this.logger.log('Loading embedding model (this may take several minutes on first run)...');
      this.logger.log('📥 Downloading AI model files (~50MB) - please be patient...');
      
      // Set a longer timeout for model initialization
      const initPromise = this.embeddingService.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Model initialization timeout (10 minutes)')), 600000);
      });
      
      await Promise.race([initPromise, timeoutPromise]);
      
      // Ensure output directories exist
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.webOutputDir, { recursive: true });
      
      this.initialized = true;
      this.logger.success('Builder initialized successfully');
      
    } catch (error) {
      this.logger.error('Initialization failed', error);
      
      if (error.message.includes('timeout')) {
        this.logger.error('Model download timed out. This can happen with slow internet.');
        this.logger.error('Try running again, or use the browser-based builder as fallback.');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        this.logger.error('Network error downloading model. Check your internet connection.');
        this.logger.error('Alternative: Use pwa/build-embeddings-browser.html');
      }
      
      throw error;
    }
  }
  
  /**
   * Load knowledge base from file system
   */
  async loadKnowledgeBase() {
    this.logger.log('Loading knowledge base...');
    
    try {
      const kb = await NYLAUtils.loadKnowledgeBase();
      
      this.logger.success(`Knowledge base loaded: ${Object.keys(kb).length} categories`);
      return kb;
      
    } catch (error) {
      this.logger.error('Failed to load knowledge base', error);
      throw error;
    }
  }
  
  /**
   * Chunk the knowledge base - Enhanced for multilingual content
   */
  chunkKnowledgeBase(knowledgeBase) {
    this.logger.log('Chunking knowledge base...');
    
    const chunks = [];
    let chunkId = 1;
    
    // knowledgeBase is actually an array of chunks from structured KB JSON files
    if (Array.isArray(knowledgeBase)) {
      // Handle structured KB format where knowledgeBase is the chunks array
      for (const kbChunk of knowledgeBase) {
        if (this.isValidKBChunk(kbChunk)) {
          // Create enhanced chunk with separate Dense/Sparse text views
          const enhancedChunk = this.createEnhancedChunk(
            chunkId++,
            kbChunk,
            {
              category: kbChunk.section || kbChunk.type || 'unknown',
              section: kbChunk.id,
              source: 'knowledge_base',
              title: kbChunk.title || `${kbChunk.section} - ${kbChunk.id}`,
              tags: kbChunk.tags || [],
              chunk_type: kbChunk.type || this.inferChunkType('kb_chunk', enhancedChunk.text),
              kb_id: kbChunk.id,
              kb_priority: kbChunk.priority || 5,
              updated_at: new Date().toISOString()
            }
          );
          
          chunks.push(enhancedChunk);
          
          // Also create separate summary chunks for focused retrieval
          if (kbChunk.summary_en || kbChunk.summary_zh) {
            const summaryText = [kbChunk.summary_en, kbChunk.summary_zh]
              .filter(text => text && text.length > 0)
              .join(' ');
            
            if (summaryText.length > 20) {
              chunks.push(this.createChunk(
                chunkId++,
                summaryText,
                {
                  category: kbChunk.section || kbChunk.type || 'unknown',
                  section: kbChunk.id,
                  subsection: 'summary',
                  source: 'knowledge_base',
                  title: `${kbChunk.title || kbChunk.id} - summary`,
                  tags: [...(kbChunk.tags || []), 'summary'],
                  chunk_type: 'summary',
                  kb_id: kbChunk.id,
                  kb_priority: kbChunk.priority || 5,
                  updated_at: new Date().toISOString()
                }
              ));
            }
          }
        }
      }
    } else {
      // Fallback: Handle legacy nested structure
      for (const [category, sections] of Object.entries(knowledgeBase)) {
        for (const [sectionKey, sectionData] of Object.entries(sections)) {
          if (typeof sectionData === 'object' && sectionData !== null) {
            // Handle nested structure
            for (const [key, value] of Object.entries(sectionData)) {
              if (typeof value === 'string' && value.length > 50) {
                chunks.push(this.createChunk(
                  chunkId++,
                  value,
                  {
                    category,
                    section: sectionKey,
                    subsection: key,
                    source: 'knowledge_base',
                    title: `${category} - ${sectionKey} - ${key}`,
                    tags: [category.toLowerCase(), sectionKey.toLowerCase()],
                    chunk_type: this.inferChunkType(key, value),
                    updated_at: new Date().toISOString()
                  }
                ));
              } else if (Array.isArray(value)) {
                // Handle arrays (like community links)
                value.forEach((item, index) => {
                  if (typeof item === 'string' && item.length > 20) {
                    chunks.push(this.createChunk(
                      chunkId++,
                      item,
                      {
                        category,
                        section: sectionKey,
                        subsection: `${key}_${index}`,
                        source: 'knowledge_base',
                        title: `${category} - ${sectionKey} - ${key}[${index}]`,
                        tags: [category.toLowerCase(), sectionKey.toLowerCase()],
                        chunk_type: 'list_item',
                        updated_at: new Date().toISOString()
                      }
                    ));
                  }
                });
              }
            }
          } else if (typeof sectionData === 'string' && sectionData.length > 50) {
            // Handle direct strings
            chunks.push(this.createChunk(
              chunkId++,
              sectionData,
              {
                category,
                section: sectionKey,
                source: 'knowledge_base',
                title: `${category} - ${sectionKey}`,
                tags: [category.toLowerCase()],
                chunk_type: this.inferChunkType(sectionKey, sectionData),
                updated_at: new Date().toISOString()
              }
            ));
          }
        }
      }
    }
    
    // Split long chunks
    const finalChunks = [];
    for (const chunk of chunks) {
      const splitChunks = this.splitLongChunk(chunk);
      finalChunks.push(...splitChunks);
    }
    
    this.logger.success(`Created ${finalChunks.length} chunks from knowledge base`);
    return finalChunks;
  }
  
  /**
   * Create a standardized chunk
   */
  createChunk(id, text, metadata) {
    return {
      id: `chunk_${id}`,
      text: text.trim(),
      tokens: this.estimateTokens(text),
      metadata: {
        created_at: new Date().toISOString(),
        ...metadata
      }
    };
  }
  
  /**
   * Split chunks that are too long with 15% overlap
   */
  splitLongChunk(chunk, maxTokens = 300) {
    if (chunk.tokens <= maxTokens) {
      return [chunk];
    }
    
    const sentences = chunk.text.split(/[.!?]+/).filter(s => s.trim());
    const subChunks = [];
    let currentSentences = [];
    let currentTokens = 0;
    let subChunkIndex = 1;
    
    // Configuration for overlap
    const OVERLAP_PERCENT = 0.15; // 15% overlap
    const MIN_OVERLAP_TOKENS = 20;
    const MAX_OVERLAP_TOKENS = 50;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (currentTokens + sentenceTokens > maxTokens && currentSentences.length > 0) {
        // Create sub-chunk
        const chunkText = currentSentences.join('. ');
        subChunks.push(this.createChunk(
          `${chunk.id}_${subChunkIndex}`,
          chunkText.trim(),
          {
            ...chunk.metadata,
            parent_chunk: chunk.id,
            chunk_part: subChunkIndex,
            has_overlap: subChunkIndex > 1
          }
        ));
        
        // Calculate overlap for next chunk
        const targetOverlapTokens = Math.min(
          Math.max(
            Math.floor(currentTokens * OVERLAP_PERCENT),
            MIN_OVERLAP_TOKENS
          ),
          MAX_OVERLAP_TOKENS
        );
        
        // Find sentences for overlap from the end of current chunk
        const overlapSentences = [];
        let overlapTokenCount = 0;
        
        for (let j = currentSentences.length - 1; j >= 0; j--) {
          const sent = currentSentences[j];
          const sentTokens = this.estimateTokens(sent);
          
          if (overlapTokenCount + sentTokens <= targetOverlapTokens) {
            overlapSentences.unshift(sent);
            overlapTokenCount += sentTokens;
          } else {
            break;
          }
        }
        
        // Start new chunk with overlap
        currentSentences = [...overlapSentences, sentence];
        currentTokens = overlapTokenCount + sentenceTokens;
        subChunkIndex++;
      } else {
        currentSentences.push(sentence);
        currentTokens += sentenceTokens;
      }
    }
    
    // Add final sub-chunk
    if (currentSentences.length > 0) {
      const chunkText = currentSentences.join('. ');
      subChunks.push(this.createChunk(
        `${chunk.id}_${subChunkIndex}`,
        chunkText.trim(),
        {
          ...chunk.metadata,
          parent_chunk: chunk.id,
          chunk_part: subChunkIndex,
          has_overlap: subChunkIndex > 1
        }
      ));
    }
    
    return subChunks;
  }
  
  /**
   * Infer chunk type from content
   */
  inferChunkType(key, content) {
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('how') || keyLower.includes('step')) {
      return 'how_to';
    } else if (keyLower.includes('fee') || keyLower.includes('tps') || keyLower.includes('consensus')) {
      return 'technical_spec';
    } else if (keyLower.includes('community') || keyLower.includes('link')) {
      return 'community_info';
    } else if (keyLower.includes('feature') || keyLower.includes('function')) {
      return 'feature';
    } else if (content.includes('?') && content.includes('answer')) {
      return 'qa_pair';
    } else {
      return 'general_info';
    }
  }
  
  /**
   * Simple token estimation
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Validate knowledge base chunk structure
   */
  isValidKBChunk(chunk) {
    return !!(chunk && 
           typeof chunk === 'object' && 
           chunk.id && 
           (chunk.content || chunk.body || chunk.summary_en || chunk.summary_zh));
  }
  
  /**
   * Build Dense Text View for embeddings (natural language descriptions)
   * CRITICAL: This is the ONLY content that gets embedded
   */
  buildDenseTextView(kbChunk) {
    const textParts = [];
    
    // Add title (always in both languages where available)
    if (kbChunk.title) {
      textParts.push(`# ${kbChunk.title}`);
    }
    
    // Add main content (primary field in new KB structure)
    if (kbChunk.content) {
      textParts.push(kbChunk.content);
    }
    
    // Add main body content (legacy field)
    if (kbChunk.body) {
      textParts.push(kbChunk.body);
    }
    
    // Add both English and Chinese summaries for multilingual embedding
    if (kbChunk.summary_en) {
      textParts.push(kbChunk.summary_en);
    }
    
    if (kbChunk.summary_zh) {
      textParts.push(kbChunk.summary_zh);
    }
    
    return textParts.filter(text => text && text.length > 0).join('\n\n');
  }
  
  /**
   * Build Sparse Text View for BM25 (keyword-oriented with synonyms, IDs, addresses)
   * CRITICAL: This is NOT embedded, only used for keyword matching
   */
  buildSparseTextView(kbChunk) {
    const keywordParts = [];
    
    // Add title for keyword matching
    if (kbChunk.title) {
      keywordParts.push(kbChunk.title);
    }
    
    // Add IDs and identifiers
    if (kbChunk.id) {
      keywordParts.push(kbChunk.id);
    }
    
    // Add contract addresses and technical specs
    if (kbChunk.technical_specs) {
      if (kbChunk.technical_specs.contract_address) {
        keywordParts.push(kbChunk.technical_specs.contract_address);
        keywordParts.push('contract address');
        keywordParts.push('合約地址');
        keywordParts.push('合約');  // Add standalone contract term
        keywordParts.push('CA');
      }
      if (kbChunk.technical_specs.ticker_symbol) {
        keywordParts.push(kbChunk.technical_specs.ticker_symbol);
        keywordParts.push('ticker');
        keywordParts.push('symbol');
      }
    }
    
    // Add official channels
    if (kbChunk.official_channels) {
      Object.entries(kbChunk.official_channels).forEach(([platform, url]) => {
        keywordParts.push(platform);
        keywordParts.push(url);
      });
    }
    
    // Add glossary terms and synonyms
    if (kbChunk.glossary_terms && Array.isArray(kbChunk.glossary_terms)) {
      keywordParts.push(...kbChunk.glossary_terms);
    }
    
    // Add key facts for keyword matching
    if (kbChunk.summary_en) {
      // Extract key terms from English summary
      const keyTerms = this.extractKeyTerms(kbChunk.summary_en);
      keywordParts.push(...keyTerms);
    }
    
    if (kbChunk.summary_zh) {
      // Extract key terms from Chinese summary
      const keyTerms = this.extractKeyTerms(kbChunk.summary_zh);
      keywordParts.push(...keyTerms);
    }
    
    return keywordParts.filter(text => text && text.length > 0).join(' ');
  }
  
  /**
   * Extract key terms for BM25 indexing
   */
  extractKeyTerms(text) {
    const terms = [];
    
    // Extract contract-like addresses (starts with uppercase letters/numbers)
    const addressPattern = /\b[A-Z0-9]{20,}\b/g;
    const addresses = text.match(addressPattern) || [];
    terms.push(...addresses);
    
    // Extract ticker symbols (2-10 uppercase letters)
    const tickerPattern = /\b[A-Z]{2,10}\b/g;
    const tickers = text.match(tickerPattern) || [];
    terms.push(...tickers);
    
    // Extract URLs
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlPattern) || [];
    terms.push(...urls);
    
    return terms;
  }
  
  /**
   * Build meta card for structured data attachment
   */
  buildMetaCard(kbChunk) {
    const metaData = {};
    
    // Contract information
    if (kbChunk.technical_specs) {
      if (kbChunk.technical_specs.contract_address) {
        metaData.contract_address = kbChunk.technical_specs.contract_address;
      }
      if (kbChunk.technical_specs.ticker_symbol) {
        metaData.ticker_symbol = kbChunk.technical_specs.ticker_symbol;
      }
      if (kbChunk.technical_specs.blockchain) {
        metaData.blockchain = kbChunk.technical_specs.blockchain;
      }
    }
    
    // Official channels
    if (kbChunk.official_channels) {
      metaData.official_channels = kbChunk.official_channels;
    }
    
    // Community information
    if (kbChunk.community_info) {
      metaData.community_info = kbChunk.community_info;
    }
    
    return Object.keys(metaData).length > 0 ? metaData : null;
  }
  
  /**
   * Build Facts database entry for direct key-value lookups
   */
  buildFactsEntry(kbChunk) {
    const facts = {};
    
    if (kbChunk.id) {
      // Contract address fact
      if (kbChunk.technical_specs?.contract_address) {
        facts[`${kbChunk.id}_contract_address`] = kbChunk.technical_specs.contract_address;
        facts[`${kbChunk.id}_ca`] = kbChunk.technical_specs.contract_address;
        facts[`${kbChunk.id}_合約`] = kbChunk.technical_specs.contract_address;
        facts[`${kbChunk.id}_合約地址`] = kbChunk.technical_specs.contract_address;
      }
      
      // Ticker symbol fact
      if (kbChunk.technical_specs?.ticker_symbol) {
        facts[`${kbChunk.id}_ticker`] = kbChunk.technical_specs.ticker_symbol;
        facts[`${kbChunk.id}_symbol`] = kbChunk.technical_specs.ticker_symbol;
      }
      
      // Official channels facts
      if (kbChunk.official_channels) {
        Object.entries(kbChunk.official_channels).forEach(([platform, url]) => {
          facts[`${kbChunk.id}_${platform}`] = url;
        });
      }
    }
    
    return Object.keys(facts).length > 0 ? facts : null;
  }
  
  /**
   * Create enhanced chunk with separate text views and metadata
   */
  createEnhancedChunk(id, kbChunk, metadata) {
    // Dense Text View - ONLY this goes to embeddings
    const denseText = this.buildDenseTextView(kbChunk);
    
    // Sparse Text View - for BM25 only, NOT embedded
    const sparseText = this.buildSparseTextView(kbChunk);
    
    // Meta card for structured data
    const metaCard = this.buildMetaCard(kbChunk);
    
    // Facts entry
    const facts = this.buildFactsEntry(kbChunk);
    
    return {
      id: `chunk_${id}`,
      text: denseText.trim(), // Dense text for embeddings
      search_text: sparseText.trim(), // Sparse text for BM25 (NOT embedded)
      meta_card: metaCard, // Structured data
      facts: facts, // Key-value facts
      tokens: this.estimateTokens(denseText),
      metadata: {
        created_at: new Date().toISOString(),
        ...metadata
      }
    };
  }
  
  /**
   * Generate embeddings for chunks
   */
  async generateEmbeddings(chunks) {
    this.logger.log(`Generating embeddings for ${chunks.length} chunks...`);
    
    const embeddings = [];
    const batchSize = 10; // Process in batches to avoid memory issues
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      this.logger.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
      
      for (const chunk of batch) {
        try {
          // CRITICAL: Only embed the 'text' field (Dense Text View)
          // search_text is for BM25 only and should NOT be embedded
          const textToEmbed = chunk.text; // Dense Text View only
          
          if (!textToEmbed || textToEmbed.trim().length === 0) {
            this.logger.warn(`Skipping chunk ${chunk.id} - no dense text content`);
            continue;
          }
          
          const embedding = await this.embeddingService.embed(textToEmbed);
          embeddings.push({
            id: chunk.id,
            embedding: embedding,
            metadata: chunk.metadata
          });
          
          // Small delay to prevent overwhelming the model
          await NYLAUtils.sleep(100);
          
        } catch (error) {
          this.logger.error(`Failed to generate embedding for chunk ${chunk.id}`, error);
          throw error;
        }
      }
      
      // Progress update
      const progress = Math.round((i + batch.length) / chunks.length * 100);
      this.logger.log(`Progress: ${progress}% (${i + batch.length}/${chunks.length})`);
    }
    
    this.logger.success(`Generated ${embeddings.length} embeddings`);
    return embeddings;
  }
  
  /**
   * Build Facts database from all chunks
   */
  buildFactsDatabase(chunks) {
    this.logger.log('Building Facts database...');
    
    const factsDb = {};
    let factCount = 0;
    
    for (const chunk of chunks) {
      if (chunk.facts) {
        Object.assign(factsDb, chunk.facts);
        factCount += Object.keys(chunk.facts).length;
      }
    }
    
    this.logger.success(`Facts database built: ${factCount} facts from ${chunks.length} chunks`);
    return factsDb;
  }
  
  /**
   * Save all data to files including Facts database
   */
  async saveData(chunks, embeddings) {
    this.logger.log('Saving data to files...');
    
    try {
      // Build Facts database
      const factsDb = this.buildFactsDatabase(chunks);
      
      // Save chunks to storage
      await this.storage.storeChunks(chunks);
      
      // Save embeddings to storage
      const vectorData = {
        embeddings: embeddings,
        dimension: embeddings.length > 0 ? embeddings[0].embedding.length : 768,
        count: embeddings.length,
        model: 'multilingual-e5-base',
        version: '1.0.0'
      };
      
      await this.storage.storeVectors(vectorData, {
        generated_at: new Date().toISOString(),
        kb_version: await this.generateKBHash(chunks),
        total_chunks: chunks.length
      });
      
      // Save Facts database separately
      const factsPath = path.join(this.webOutputDir, 'nyla-facts-db.json');
      await fs.writeFile(factsPath, JSON.stringify({
        facts: factsDb,
        metadata: {
          generated_at: new Date().toISOString(),
          version: '1.0.0',
          total_facts: Object.keys(factsDb).length,
          source_chunks: chunks.length
        }
      }, null, 2));
      
      // Also save to web-accessible format for PWA
      const webData = {
        chunks: chunks,
        embeddings: embeddings.map(e => ({
          id: e.id,
          embedding: Array.from(e.embedding), // Ensure it's an array
          metadata: e.metadata
        })),
        metadata: {
          generated_at: new Date().toISOString(),
          version: '1.0.0',
          model: 'multilingual-e5-base',
          dimension: vectorData.dimension,
          total_chunks: chunks.length
        }
      };
      
      const webDataPath = path.join(this.webOutputDir, 'nyla-vector-db.json');
      await fs.writeFile(webDataPath, JSON.stringify(webData, null, 2));
      
      this.logger.success(`Data saved successfully:
- Chunks: ${chunks.length}  
- Embeddings: ${embeddings.length}
- Dimension: ${vectorData.dimension}
- Facts: ${Object.keys(factsDb).length}
- Web data: ${webDataPath}
- Facts DB: ${factsPath}`);
      
    } catch (error) {
      this.logger.error('Failed to save data', error);
      throw error;
    }
  }
  
  /**
   * Generate hash for version tracking
   */
  async generateKBHash(chunks) {
    const crypto = require('crypto');
    const content = JSON.stringify(chunks.map(c => c.text).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  /**
   * Clean up resources and prepare for exit
   */
  async cleanup() {
    try {
      this.logger.log('🧹 Cleaning up resources...');
      
      // Clear embedding service references
      if (this.embeddingService) {
        this.embeddingService.pipeline = null;
        this.embeddingService.initialized = false;
      }
      
      // Clear storage references  
      if (this.storage && this.storage.db) {
        this.storage.db = null;
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Small delay to ensure all async operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.logger.success('✅ Cleanup completed');
      
    } catch (error) {
      this.logger.warn(`⚠️ Cleanup had minor issues: ${error.message}`);
    }
  }
  
  /**
   * Test network connectivity
   */
  async testConnectivity() {
    this.logger.log('🌐 Testing network connectivity...');
    
    try {
      const https = require('https');
      
      return new Promise((resolve, reject) => {
        const req = https.get('https://huggingface.co/Xenova/all-MiniLM-L6-v2', { timeout: 10000 }, (res) => {
          if (res.statusCode === 200 || res.statusCode === 302) {
            resolve(true);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
        
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Connection timeout'));
        });
        
        req.on('error', reject);
      });
      
    } catch (error) {
      throw new Error(`Network test failed: ${error.message}`);
    }
  }
  
  /**
   * Main build process
   */
  async build() {
    const startTime = Date.now();
    
    try {
      this.logger.log('🚀 Starting embedding build process...');
      
      // Test network connectivity first
      try {
        await this.testConnectivity();
        this.logger.success('✅ Network connectivity confirmed');
      } catch (error) {
        this.logger.warn(`⚠️ Network test failed: ${error.message}`);
        this.logger.log('Proceeding anyway - model might be cached locally...');
      }
      
      // Initialize
      await this.initialize();
      
      // Load knowledge base
      const knowledgeBase = await this.loadKnowledgeBase();
      
      // Create chunks
      const chunks = this.chunkKnowledgeBase(knowledgeBase);
      
      // Generate embeddings
      const embeddings = await this.generateEmbeddings(chunks);
      
      // Save data
      await this.saveData(chunks, embeddings);
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.logger.success(`✅ Build completed successfully in ${duration}s`);
      
      // Print summary
      console.log('\n📊 Build Summary:');
      console.log(`   • Knowledge Base Categories: ${Object.keys(knowledgeBase).length}`);
      console.log(`   • Total Chunks: ${chunks.length}`);
      console.log(`   • Total Embeddings: ${embeddings.length}`);
      console.log(`   • Embedding Dimension: ${embeddings[0]?.embedding.length || 'N/A'}`);
      console.log(`   • Build Time: ${duration}s`);
      
      // Clean up resources
      await this.cleanup();
      
    } catch (error) {
      this.logger.error('Build process failed', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const builder = new NYLANodeEmbeddingBuilder();
  builder.build()
    .then(() => {
      console.log('\n🎉 Build process completed successfully!');
      process.exit(0); // Exit with success code
    })
    .catch((error) => {
      console.error('\n❌ Build process failed:', error);
      process.exit(1); // Exit with error code
    });
}

module.exports = NYLANodeEmbeddingBuilder;