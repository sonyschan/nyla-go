#!/usr/bin/env node

/**
 * Development Helper: Add Knowledge to NYLA KB
 * Quick CLI script for adding new knowledge with automatic translation
 * 
 * Usage:
 *   node dev-add-knowledge.js
 *   node dev-add-knowledge.js --interactive
 *   node dev-add-knowledge.js --file examples.json
 */

const fs = require('fs').promises;
const path = require('path');

// Mock implementations for Node.js environment
global.console = console;
global.performance = require('perf_hooks').performance;

// Import our services (mocked versions for Node.js)
class MockNYLAEmbeddingService {
  async initialize() { console.log('🤖 Mock embedding service initialized'); }
}

class MockNYLAChunkHygiene {
  async computeContentHash(chunk) {
    const crypto = require('crypto');
    const content = JSON.stringify({
      id: chunk.id,
      title: chunk.title,
      body: chunk.body
    });
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 12);
  }
  
  async processChunk(chunk) {
    // Basic validation
    const required = ['id', 'type', 'title', 'body'];
    for (const field of required) {
      if (!chunk[field]) {
        console.error(`❌ Missing required field: ${field}`);
        return null;
      }
    }
    return chunk;
  }
}

class MockTranslationService {
  constructor(options) {
    this.options = options;
    this.initialized = false;
  }
  
  async initialize() {
    this.initialized = true;
    console.log('🌐 Mock translation service initialized (using template mode)');
  }
  
  async generateBilingualSummaries(content, metadata) {
    const { title, type, tags = [] } = metadata;
    
    // Extract first two sentences
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    const firstTwoSentences = sentences.slice(0, 2).join(' ').trim();
    
    let summaryEn, summaryZh;
    
    switch (type) {
      case 'howto':
        summaryEn = `Step-by-step guide: ${title}`;
        summaryZh = `操作指南：${title || '详细步骤说明'}`;
        break;
        
      case 'facts':
        summaryEn = `Key information about ${tags[0] || 'blockchain'}: ${firstTwoSentences.substring(0, 100)}`;
        summaryZh = `关于${tags[0] || '区块链'}的重要信息`;
        break;
        
      case 'policy':
        summaryEn = `Policy guideline: ${title}`;
        summaryZh = `政策指南：${title || '重要规定说明'}`;
        break;
        
      case 'faq':
        summaryEn = `FAQ: ${firstTwoSentences.substring(0, 100)}`;
        summaryZh = `常见问题解答：${this.basicTranslation(title)}`;
        break;
        
      case 'troubleshooting':
        summaryEn = `Solution for: ${title}`;
        summaryZh = `解决方案：${title || '问题修复方法'}`;
        break;
        
      default:
        summaryEn = firstTwoSentences.substring(0, 100);
        summaryZh = this.basicTranslation(summaryEn.substring(0, 50));
    }
    
    return {
      summary_en: summaryEn,
      summary_zh: summaryZh,
      metadata: {
        generated_by: 'template',
        timestamp: new Date().toISOString()
      }
    };
  }
  
  basicTranslation(text) {
    const translations = {
      'blockchain': '区块链',
      'network': '网络', 
      'transaction': '交易',
      'wallet': '钱包',
      'transfer': '转账',
      'fee': '手续费',
      'token': '代币',
      'guide': '指南',
      'step': '步骤',
      'solution': '解决方案',
      'problem': '问题',
      'error': '错误',
      'support': '支持'
    };
    
    let result = text;
    for (const [en, zh] of Object.entries(translations)) {
      const regex = new RegExp(`\\b${en}\\b`, 'gi');
      result = result.replace(regex, zh);
    }
    
    return result;
  }
  
  getStats() {
    return { initialized: this.initialized, mode: 'template' };
  }
}

// Content Creator with mocked dependencies
class NYLAKBContentCreator {
  constructor(options = {}) {
    this.options = {
      kbBasePath: './pwa/kb',
      autoTranslate: true,
      autoGenerateHash: true,
      validateSchema: true,
      ...options
    };
    
    this.translationService = null;
    this.chunkHygiene = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('🛠️ Initializing KB Content Creator...');
    
    // Initialize mock services
    if (this.options.autoTranslate) {
      this.translationService = new MockTranslationService({
        debugMode: true,
        fallbackToTemplate: true
      });
      await this.translationService.initialize();
    }
    
    this.chunkHygiene = new MockNYLAChunkHygiene();
    this.initialized = true;
    console.log('✅ Content Creator ready');
  }

  async createKnowledgeChunk(englishContent, metadata) {
    await this.initialize();
    
    console.log(`📝 Creating chunk: ${metadata.title}`);
    
    // Generate chunk ID if not provided
    if (!metadata.id) {
      metadata.id = this.generateChunkId(metadata);
    }
    
    // Set defaults
    const chunk = {
      id: metadata.id,
      source_id: metadata.source_id || metadata.id.split('_').slice(0, -1).join('_'),
      type: metadata.type,
      lang: metadata.lang || 'bilingual',
      title: metadata.title,
      section: metadata.section || metadata.type,
      tags: metadata.tags || [],
      as_of: metadata.as_of || new Date().toISOString().split('T')[0],
      stability: metadata.stability || 'stable',
      source_url: metadata.source_url || 'internal://kb/' + metadata.type,
      hash: '',
      body: englishContent,
      priority: metadata.priority || 5,
      related_chunks: metadata.related_chunks || [],
      glossary_terms: metadata.glossary_terms || []
    };
    
    // Generate bilingual summaries
    if (this.options.autoTranslate) {
      const summaries = await this.translationService.generateBilingualSummaries(
        englishContent,
        {
          title: chunk.title,
          type: chunk.type,
          tags: chunk.tags
        }
      );
      
      chunk.summary_en = summaries.summary_en;
      chunk.summary_zh = summaries.summary_zh;
      
      console.log('   ✅ EN:', chunk.summary_en);
      console.log('   ✅ ZH:', chunk.summary_zh);
    }
    
    // Add exclude_from_tech if specified
    if (metadata.exclude_from_tech) {
      chunk.exclude_from_tech = true;
    }
    
    // Generate content hash
    chunk.hash = await this.chunkHygiene.computeContentHash(chunk);
    
    // Validate
    const processed = await this.chunkHygiene.processChunk(chunk);
    if (!processed) {
      throw new Error('Chunk validation failed');
    }
    
    return chunk;
  }

  generateChunkId(metadata) {
    const { type, title, section } = metadata;
    
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    
    const parts = [type];
    if (section && section !== type) {
      parts.push(section);
    }
    parts.push(cleanTitle);
    
    return parts.join('_');
  }

  getTargetFile(chunk) {
    const { type, section } = chunk;
    
    const typeMap = {
      'facts': 'facts',
      'howto': 'howto', 
      'policy': 'policy',
      'faq': 'faq',
      'troubleshooting': 'troubleshooting',
      'about': 'about'
    };
    
    const dir = typeMap[type] || 'misc';
    let filename = section || type;
    
    // Special filename logic
    if (type === 'facts' && chunk.tags.includes('network')) {
      filename = 'networks';
    } else if (type === 'howto' && chunk.tags.includes('transfer')) {
      filename = 'transfers';
    }
    
    return `${this.options.kbBasePath}/${dir}/${filename}.json`;
  }

  async addToKnowledgeBase(chunk, options = {}) {
    const targetFile = this.getTargetFile(chunk);
    console.log(`📁 Target: ${targetFile}`);
    
    try {
      // Read existing file
      let kbData = { chunks: [] };
      
      try {
        const content = await fs.readFile(targetFile, 'utf-8');
        kbData = JSON.parse(content);
      } catch (error) {
        console.log('📄 Creating new KB file');
      }
      
      // Check for duplicates
      const existingIndex = kbData.chunks.findIndex(c => c.id === chunk.id);
      if (existingIndex >= 0) {
        console.log('🔄 Updating existing chunk');
        kbData.chunks[existingIndex] = chunk;
      } else {
        console.log('➕ Adding new chunk');
        kbData.chunks.push(chunk);
      }
      
      // Sort by priority and ID
      kbData.chunks.sort((a, b) => {
        if (a.priority !== b.priority) {
          return (b.priority || 5) - (a.priority || 5);
        }
        return a.id.localeCompare(b.id);
      });
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(targetFile), { recursive: true });
      
      // Write file
      await fs.writeFile(
        targetFile,
        JSON.stringify(kbData, null, 2),
        'utf-8'
      );
      
      console.log('✅ Knowledge base updated');
      return { file: targetFile, chunk, success: true };
      
    } catch (error) {
      console.error('❌ Failed to update KB:', error);
      throw error;
    }
  }
}

// CLI Examples and interactive usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🚀 NYLA Knowledge Base Content Creator

Usage:
  node dev-add-knowledge.js                    Run examples
  node dev-add-knowledge.js --interactive      Interactive mode
  node dev-add-knowledge.js --file data.json   Process file

Examples:
  # Add single knowledge item
  node dev-add-knowledge.js

  # Process batch file
  echo '[{"content": "...", "metadata": {...}}]' > content.json
  node dev-add-knowledge.js --file content.json
`);
    return;
  }
  
  const creator = new NYLAKBContentCreator();
  
  if (args.includes('--file')) {
    const fileIndex = args.indexOf('--file') + 1;
    const filename = args[fileIndex];
    
    if (!filename) {
      console.error('❌ Please specify a file');
      return;
    }
    
    try {
      const content = await fs.readFile(filename, 'utf-8');
      const data = JSON.parse(content);
      
      for (const item of data) {
        const chunk = await creator.createKnowledgeChunk(item.content, item.metadata);
        await creator.addToKnowledgeBase(chunk);
      }
      
      console.log(`\n✅ Processed ${data.length} items from ${filename}`);
      
    } catch (error) {
      console.error('❌ File processing failed:', error.message);
    }
    
    return;
  }
  
  if (args.includes('--interactive')) {
    console.log('🎯 Interactive mode would go here');
    console.log('For now, check the examples below:\n');
  }
  
  // Run examples
  console.log('📚 NYLA Knowledge Creation Examples\n');
  
  const examples = [
    {
      content: "To transfer tokens using NYLA, you need to create a command like 'NYLA send 1 SOL to [recipient]' on X.com. Make sure your wallet is connected and you have sufficient balance. The transfer will be processed by the NYLA AI agent within minutes.",
      metadata: {
        type: "howto",
        title: "How to Send Tokens with NYLA",
        section: "transfers",
        tags: ["transfer", "send", "tokens", "tutorial"],
        priority: 9,
        stability: "stable",
        source_url: "https://docs.nyla.ai/transfers"
      }
    },
    {
      content: "Solana network offers the fastest transaction speeds in NYLA with fees typically under $0.01. It supports SOL, USDC, and thousands of SPL tokens. Solana is ideal for frequent traders and users who prioritize speed and low costs over maximum liquidity.",
      metadata: {
        type: "facts",
        title: "Solana Network Characteristics",
        section: "networks",
        tags: ["solana", "network", "speed", "fees", "SPL"],
        priority: 8,
        stability: "volatile", // Fees and speeds can change
        source_url: "https://solana.com"
      }
    }
  ];
  
  console.log('🔨 Processing examples...\n');
  
  for (let i = 0; i < examples.length; i++) {
    const { content, metadata } = examples[i];
    
    console.log(`\n--- Example ${i + 1}: ${metadata.title} ---`);
    
    try {
      const chunk = await creator.createKnowledgeChunk(content, metadata);
      const result = await creator.addToKnowledgeBase(chunk);
      
      console.log(`✅ Success: ${result.file}`);
      
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Examples complete!');
  console.log('\n📋 To add your own knowledge:');
  console.log('1. Copy this script');
  console.log('2. Replace examples array with your content');
  console.log('3. Run: node dev-add-knowledge.js');
  console.log('\n💡 For production use, integrate NYLAKBContentCreator into your web app');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { NYLAKBContentCreator };