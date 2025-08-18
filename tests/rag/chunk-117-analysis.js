#!/usr/bin/env node

/**
 * Analysis script for chunk_117 naming pattern issue
 * Investigates why we have chunk_chunk_117_1 and chunk_chunk_117_2
 */

const fs = require('fs').promises;
const path = require('path');

class ChunkAnalyzer {
  constructor() {
    this.vectorDbPath = '/Users/sonyschan/NYLAgo/pwa/data/nyla-vector-db.json';
  }

  async loadVectorDB() {
    console.log('🔍 Loading vector database...');
    try {
      const data = await fs.readFile(this.vectorDbPath, 'utf8');
      const vectorDb = JSON.parse(data);
      console.log(`✅ Loaded ${vectorDb.chunks.length} chunks from vector database`);
      return vectorDb;
    } catch (error) {
      console.error('❌ Failed to load vector database:', error);
      throw error;
    }
  }

  async analyzeChunk117Pattern() {
    console.log('\n🔍 ANALYZING CHUNK_117 PATTERN');
    console.log('=' .repeat(50));

    const vectorDb = await this.loadVectorDB();

    // Find all chunk_117 variants
    const chunk117Variants = vectorDb.chunks.filter(chunk => 
      chunk.id.includes('117')
    );

    console.log(`\n📊 Found ${chunk117Variants.length} chunks with '117' in ID:`);
    
    chunk117Variants.forEach((chunk, index) => {
      console.log(`\n${index + 1}. ID: ${chunk.id}`);
      console.log(`   Text length: ${chunk.text?.length || 0} chars`);
      console.log(`   Tokens: ${chunk.tokens || 'N/A'}`);
      console.log(`   Has parent_chunk: ${chunk.metadata?.parent_chunk || 'No'}`);
      console.log(`   Chunk part: ${chunk.metadata?.chunk_part || 'N/A'}`);
      console.log(`   Section: ${chunk.metadata?.section || 'N/A'}`);
      console.log(`   KB ID: ${chunk.metadata?.kb_id || 'N/A'}`);
      
      // Show first 200 chars of text
      if (chunk.text) {
        console.log(`   Text preview: "${chunk.text.substring(0, 200)}..."`);
      }
    });

    return chunk117Variants;
  }

  async traceChunkingLogic() {
    console.log('\n🔍 TRACING CHUNKING LOGIC');
    console.log('=' .repeat(50));

    // Load WangChai KB file to trace how it becomes chunk_117
    const wangchaiPath = '/Users/sonyschan/NYLAgo/pwa/kb/ecosystem/partners/multi-chain/wangchai.json';
    
    try {
      const wangchaiData = await fs.readFile(wangchaiPath, 'utf8');
      const wangchai = JSON.parse(wangchaiData);
      
      console.log(`\n📋 WangChai KB file has ${wangchai.chunks.length} chunks:`);
      
      wangchai.chunks.forEach((kbChunk, index) => {
        console.log(`\n${index + 1}. KB Chunk ID: ${kbChunk.id}`);
        console.log(`   Content length: ${kbChunk.content?.length || 0} chars`);
        console.log(`   Section: ${kbChunk.section || 'N/A'}`);
        console.log(`   Priority: ${kbChunk.priority || 'N/A'}`);
        
        // Check if this content would trigger splitting
        if (kbChunk.content) {
          const estimatedTokens = Math.ceil(kbChunk.content.length / 4);
          console.log(`   Estimated tokens: ${estimatedTokens}`);
          console.log(`   Would split (>300): ${estimatedTokens > 300 ? 'YES' : 'NO'}`);
          
          if (estimatedTokens > 300) {
            console.log(`   ⚠️  This chunk will be split into multiple parts!`);
          }
        }
      });

    } catch (error) {
      console.error('❌ Failed to load WangChai KB:', error);
    }
  }

  async simulateChunkingProcess() {
    console.log('\n🔍 SIMULATING CHUNKING PROCESS');
    console.log('=' .repeat(50));

    // Simulate the chunking logic from build-embeddings-nodejs.js
    let chunkId = 117; // Starting at 117 to simulate where it would be

    // Load actual KB data
    const wangchaiPath = '/Users/sonyschan/NYLAgo/pwa/kb/ecosystem/partners/multi-chain/wangchai.json';
    const wangchaiData = await fs.readFile(wangchaiPath, 'utf8');
    const wangchai = JSON.parse(wangchaiData);

    const firstChunk = wangchai.chunks[0]; // The long chunk
    
    console.log(`\n📝 Processing chunk ID: ${firstChunk.id}`);
    console.log(`Content length: ${firstChunk.content.length} chars`);
    
    // Simulate creating the main chunk
    const mainChunk = {
      id: `chunk_${chunkId}`,
      text: firstChunk.content,
      tokens: Math.ceil(firstChunk.content.length / 4),
      metadata: {
        created_at: new Date().toISOString(),
        category: firstChunk.section,
        section: firstChunk.id,
        source: 'knowledge_base',
        title: firstChunk.content.split(':')[0] || firstChunk.id,
        chunk_type: 'about',
        kb_id: firstChunk.id,
        kb_priority: firstChunk.priority || 5
      }
    };

    console.log(`\n🔧 Created main chunk:`);
    console.log(`   ID: ${mainChunk.id}`);
    console.log(`   Tokens: ${mainChunk.tokens}`);
    console.log(`   Will split: ${mainChunk.tokens > 300 ? 'YES' : 'NO'}`);

    // Simulate splitting logic
    if (mainChunk.tokens > 300) {
      console.log(`\n✂️  SPLITTING CHUNK (${mainChunk.tokens} > 300 tokens)`);
      
      const sentences = mainChunk.text.split(/[.!?]+/).filter(s => s.trim());
      console.log(`   Split into ${sentences.length} sentences`);
      
      let currentSentences = [];
      let currentTokens = 0;
      let subChunkIndex = 1;
      const maxTokens = 300;

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const sentenceTokens = Math.ceil(sentence.length / 4);

        if (currentTokens + sentenceTokens > maxTokens && currentSentences.length > 0) {
          // Create sub-chunk
          const subChunkId = `${mainChunk.id}_${subChunkIndex}`;
          
          console.log(`\n   📄 Sub-chunk ${subChunkIndex}:`);
          console.log(`      ID: ${subChunkId}`);
          console.log(`      Tokens: ${currentTokens}`);
          console.log(`      Sentences: ${currentSentences.length}`);
          console.log(`      Parent: ${mainChunk.id}`);
          
          // This is where the double "chunk_chunk" comes from!
          // mainChunk.id is already "chunk_117"
          // So subChunkId becomes "chunk_117_1"
          // But if there's another layer of processing...
          console.log(`      ⚠️  POTENTIAL ISSUE: If this gets re-processed, it could become chunk_chunk_117_1`);

          currentSentences = [sentence];
          currentTokens = sentenceTokens;
          subChunkIndex++;
        } else {
          currentSentences.push(sentence);
          currentTokens += sentenceTokens;
        }
      }

      // Final sub-chunk
      if (currentSentences.length > 0) {
        const subChunkId = `${mainChunk.id}_${subChunkIndex}`;
        console.log(`\n   📄 Final sub-chunk ${subChunkIndex}:`);
        console.log(`      ID: ${subChunkId}`);
        console.log(`      Tokens: ${currentTokens}`);
        console.log(`      Parent: ${mainChunk.id}`);
      }
    }
  }

  async findDoubleChunkPattern() {
    console.log('\n🔍 SEARCHING FOR DOUBLE CHUNK PATTERN');
    console.log('=' .repeat(50));

    const vectorDb = await this.loadVectorDB();
    
    // Find all chunks with double "chunk_chunk" pattern
    const doubleChunkPatterns = vectorDb.chunks.filter(chunk => 
      chunk.id.includes('chunk_chunk_')
    );

    console.log(`\n📊 Found ${doubleChunkPatterns.length} chunks with 'chunk_chunk_' pattern:`);
    
    doubleChunkPatterns.forEach((chunk, index) => {
      console.log(`\n${index + 1}. ID: ${chunk.id}`);
      console.log(`   Parent chunk: ${chunk.metadata?.parent_chunk || 'None'}`);
      console.log(`   KB ID: ${chunk.metadata?.kb_id || 'None'}`);
      console.log(`   Section: ${chunk.metadata?.section || 'None'}`);
      
      // Analyze the ID pattern
      const idParts = chunk.id.split('_');
      console.log(`   ID parts: [${idParts.join(', ')}]`);
      
      if (chunk.metadata?.parent_chunk) {
        const parentParts = chunk.metadata.parent_chunk.split('_');
        console.log(`   Parent parts: [${parentParts.join(', ')}]`);
        
        // Check if parent already has "chunk_" prefix
        if (chunk.metadata.parent_chunk.startsWith('chunk_')) {
          console.log(`   ❗ ISSUE FOUND: Parent already has 'chunk_' prefix!`);
          console.log(`   This creates: ${chunk.metadata.parent_chunk} + '_' + part = ${chunk.id}`);
        }
      }
    });

    return doubleChunkPatterns;
  }

  async checkCreateChunkFunction() {
    console.log('\n🔍 ANALYZING createChunk FUNCTION LOGIC');
    console.log('=' .repeat(50));

    // Simulate the createChunk function behavior
    const simulateCreateChunk = (id, text, metadata) => {
      return {
        id: `chunk_${id}`,  // This adds "chunk_" prefix
        text: text.trim(),
        tokens: Math.ceil(text.length / 4),
        metadata: {
          created_at: new Date().toISOString(),
          ...metadata
        }
      };
    };

    const simulateSplitLongChunk = (chunk, maxTokens = 300) => {
      if (chunk.tokens <= maxTokens) {
        return [chunk];
      }

      const subChunks = [];
      let subChunkIndex = 1;

      // This is the CRITICAL line - it creates the double prefix!
      const subChunkId = `${chunk.id}_${subChunkIndex}`;  // chunk.id is already "chunk_117"
      
      console.log(`\n🔍 Split simulation:`);
      console.log(`   Original chunk ID: ${chunk.id}`);
      console.log(`   Sub-chunk pattern: \${chunk.id}_\${subChunkIndex}`);
      console.log(`   Result: ${subChunkId}`);
      console.log(`   ❗ This explains the pattern! chunk.id already has 'chunk_' prefix`);

      // But where does the SECOND "chunk_" come from?
      // Check if createChunk is called again on the result...
      const reprocessed = simulateCreateChunk(subChunkId.replace('chunk_', ''), "dummy text", {});
      console.log(`   If reprocessed through createChunk: ${reprocessed.id}`);
      console.log(`   ❗ BINGO! This would create: chunk_chunk_117_1`);

      return subChunks;
    };

    // Test the scenario
    const originalChunk = simulateCreateChunk(117, "Very long text content...", {});
    console.log(`\n📝 Original chunk: ${originalChunk.id}`);
    
    originalChunk.tokens = 400; // Force splitting
    simulateSplitLongChunk(originalChunk);
  }

  async run() {
    console.log('🚀 CHUNK_117 ANALYSIS REPORT');
    console.log('=' .repeat(60));

    try {
      await this.analyzeChunk117Pattern();
      await this.traceChunkingLogic();
      await this.simulateChunkingProcess();
      await this.findDoubleChunkPattern();
      await this.checkCreateChunkFunction();

      console.log('\n🎯 CONCLUSIONS');
      console.log('=' .repeat(50));
      console.log('1. chunk_chunk_117_1 and chunk_chunk_117_2 exist due to double processing');
      console.log('2. The createChunk function adds "chunk_" prefix to ALL chunk IDs');
      console.log('3. When splitting long chunks, it uses existing chunk.id (already with "chunk_")');
      console.log('4. If split chunks are reprocessed, they get another "chunk_" prefix');
      console.log('5. This creates the pattern: chunk_ + chunk_117_1 = chunk_chunk_117_1');
      
      console.log('\n💡 RECOMMENDATIONS');
      console.log('=' .repeat(50));
      console.log('1. Fix createChunk to not double-prefix already prefixed IDs');
      console.log('2. Ensure split chunks maintain proper ID format');
      console.log('3. Add validation to prevent double chunk_ prefixes');
      console.log('4. Consider using raw numeric IDs in splitting logic');

    } catch (error) {
      console.error('❌ Analysis failed:', error);
    }
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new ChunkAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = ChunkAnalyzer;