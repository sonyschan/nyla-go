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
   * Chunk the knowledge base
   */
  chunkKnowledgeBase(knowledgeBase) {
    this.logger.log('Chunking knowledge base...');
    
    const chunks = [];
    let chunkId = 1;
    
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
   * Split chunks that are too long
   */
  splitLongChunk(chunk, maxTokens = 400) {
    if (chunk.tokens <= maxTokens) {
      return [chunk];
    }
    
    const sentences = chunk.text.split(/[.!?]+/).filter(s => s.trim());
    const subChunks = [];
    let currentChunk = '';
    let currentTokens = 0;
    let subChunkIndex = 1;
    
    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
        // Create sub-chunk
        subChunks.push(this.createChunk(
          `${chunk.id}_${subChunkIndex}`,
          currentChunk.trim(),
          {
            ...chunk.metadata,
            parent_chunk: chunk.id,
            chunk_part: subChunkIndex
          }
        ));
        
        currentChunk = sentence;
        currentTokens = sentenceTokens;
        subChunkIndex++;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
        currentTokens += sentenceTokens;
      }
    }
    
    // Add final sub-chunk
    if (currentChunk.trim()) {
      subChunks.push(this.createChunk(
        `${chunk.id}_${subChunkIndex}`,
        currentChunk.trim(),
        {
          ...chunk.metadata,
          parent_chunk: chunk.id,
          chunk_part: subChunkIndex
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
          const embedding = await this.embeddingService.embed(chunk.text);
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
   * Save all data to files
   */
  async saveData(chunks, embeddings) {
    this.logger.log('Saving data to files...');
    
    try {
      // Save chunks to storage
      await this.storage.storeChunks(chunks);
      
      // Save embeddings to storage
      const vectorData = {
        embeddings: embeddings,
        dimension: embeddings.length > 0 ? embeddings[0].embedding.length : 384,
        count: embeddings.length,
        model: 'all-MiniLM-L6-v2',
        version: '1.0.0'
      };
      
      await this.storage.storeVectors(vectorData, {
        generated_at: new Date().toISOString(),
        kb_version: await this.generateKBHash(chunks),
        total_chunks: chunks.length
      });
      
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
          model: 'all-MiniLM-L6-v2',
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
- Web data: ${webDataPath}`);
      
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