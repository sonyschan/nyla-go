#!/usr/bin/env node

/**
 * Test script to demonstrate the chunk_chunk_117 issue and verify fix
 * 
 * ISSUE ANALYSIS:
 * 1. createChunk(id) always prefixes with "chunk_", creating chunk_117
 * 2. splitLongChunk() calls createChunk(`${chunk.id}_${subChunkIndex}`)
 * 3. Since chunk.id is already "chunk_117", this becomes createChunk("chunk_117_1")
 * 4. createChunk() then prefixes again: "chunk_" + "chunk_117_1" = "chunk_chunk_117_1"
 * 
 * ROOT CAUSE: Double prefixing in splitLongChunk when calling createChunk
 */

class ChunkFixTester {
  
  // =========== CURRENT BROKEN CODE ===========
  
  createChunkBroken(id, text, metadata) {
    return {
      id: `chunk_${id}`,  // Always adds chunk_ prefix
      text: text.trim(),
      tokens: this.estimateTokens(text),
      metadata: {
        created_at: new Date().toISOString(),
        ...metadata
      }
    };
  }

  splitLongChunkBroken(chunk, maxTokens = 300) {
    if (chunk.tokens <= maxTokens) {
      return [chunk];
    }
    
    const sentences = chunk.text.split(/[.!?]+/).filter(s => s.trim());
    const subChunks = [];
    let currentSentences = [];
    let currentTokens = 0;
    let subChunkIndex = 1;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (currentTokens + sentenceTokens > maxTokens && currentSentences.length > 0) {
        // BUG: This calls createChunk with already-prefixed chunk.id
        const chunkText = currentSentences.join('. ');
        subChunks.push(this.createChunkBroken(
          `${chunk.id}_${subChunkIndex}`,  // chunk.id is already "chunk_117"
          chunkText.trim(),
          {
            ...chunk.metadata,
            parent_chunk: chunk.id,
            chunk_part: subChunkIndex,
            has_overlap: subChunkIndex > 1
          }
        ));
        
        currentSentences = [sentence];
        currentTokens = sentenceTokens;
        subChunkIndex++;
      } else {
        currentSentences.push(sentence);
        currentTokens += sentenceTokens;
      }
    }
    
    // Final sub-chunk - SAME BUG
    if (currentSentences.length > 0) {
      const chunkText = currentSentences.join('. ');
      subChunks.push(this.createChunkBroken(
        `${chunk.id}_${subChunkIndex}`,  // Double prefixing again!
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

  // =========== FIXED CODE ===========
  
  createChunkFixed(id, text, metadata) {
    // Check if ID already has chunk_ prefix to avoid double prefixing
    const idStr = String(id);
    const finalId = idStr.startsWith('chunk_') ? idStr : `chunk_${idStr}`;
    
    return {
      id: finalId,
      text: text.trim(),
      tokens: this.estimateTokens(text),
      metadata: {
        created_at: new Date().toISOString(),
        ...metadata
      }
    };
  }

  splitLongChunkFixed(chunk, maxTokens = 300) {
    if (chunk.tokens <= maxTokens) {
      return [chunk];
    }
    
    const sentences = chunk.text.split(/[.!?]+/).filter(s => s.trim());
    const subChunks = [];
    let currentSentences = [];
    let currentTokens = 0;
    let subChunkIndex = 1;
    
    // Extract base ID without chunk_ prefix for clean sub-chunk naming
    const baseId = chunk.id.replace(/^chunk_/, '');
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (currentTokens + sentenceTokens > maxTokens && currentSentences.length > 0) {
        const chunkText = currentSentences.join('. ');
        subChunks.push(this.createChunkFixed(
          `${baseId}_${subChunkIndex}`,  // Use base ID, createChunk will add prefix
          chunkText.trim(),
          {
            ...chunk.metadata,
            parent_chunk: chunk.id,
            chunk_part: subChunkIndex,
            has_overlap: subChunkIndex > 1
          }
        ));
        
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
      const chunkText = currentSentences.join('. ');
      subChunks.push(this.createChunkFixed(
        `${baseId}_${subChunkIndex}`,  // Clean sub-chunk ID
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

  // =========== UTILITY ===========
  
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  // =========== TESTS ===========
  
  testBrokenBehavior() {
    console.log('🔴 TESTING BROKEN BEHAVIOR');
    console.log('=' .repeat(50));

    // Create a long chunk that will be split
    const longText = "WangChai (旺柴) - Comprehensive Project Overview & NYLA Partnership: WangChai (旺柴) Complete Project Overview. This is a very long piece of text that will definitely exceed 300 tokens when processed. " + 
      "Additional content to make it longer. ".repeat(30);

    const originalChunk = this.createChunkBroken(117, longText, {
      category: 'community_partnerships',
      section: 'ecosystem_wangchai_project_overview',
      kb_id: 'ecosystem_wangchai_project_overview'
    });

    console.log(`\n📝 Original chunk:`);
    console.log(`   ID: ${originalChunk.id}`);
    console.log(`   Tokens: ${originalChunk.tokens}`);

    const splitChunks = this.splitLongChunkBroken(originalChunk);
    
    console.log(`\n✂️  Split results (BROKEN):`);
    splitChunks.forEach((chunk, i) => {
      console.log(`   ${i + 1}. ID: ${chunk.id}`);
      console.log(`      Parent: ${chunk.metadata.parent_chunk}`);
      console.log(`      Part: ${chunk.metadata.chunk_part}`);
      console.log(`      ❌ DOUBLE PREFIX: ${chunk.id.includes('chunk_chunk_') ? 'YES' : 'NO'}`);
    });

    return splitChunks;
  }

  testFixedBehavior() {
    console.log('\n\n🟢 TESTING FIXED BEHAVIOR');
    console.log('=' .repeat(50));

    // Same long text
    const longText = "WangChai (旺柴) - Comprehensive Project Overview & NYLA Partnership: WangChai (旺柴) Complete Project Overview. This is a very long piece of text that will definitely exceed 300 tokens when processed. " + 
      "Additional content to make it longer. ".repeat(30);

    const originalChunk = this.createChunkFixed(117, longText, {
      category: 'community_partnerships',
      section: 'ecosystem_wangchai_project_overview',
      kb_id: 'ecosystem_wangchai_project_overview'
    });

    console.log(`\n📝 Original chunk:`);
    console.log(`   ID: ${originalChunk.id}`);
    console.log(`   Tokens: ${originalChunk.tokens}`);

    const splitChunks = this.splitLongChunkFixed(originalChunk);
    
    console.log(`\n✂️  Split results (FIXED):`);
    splitChunks.forEach((chunk, i) => {
      console.log(`   ${i + 1}. ID: ${chunk.id}`);
      console.log(`      Parent: ${chunk.metadata.parent_chunk}`);
      console.log(`      Part: ${chunk.metadata.chunk_part}`);
      console.log(`      ✅ CORRECT FORMAT: ${chunk.id.match(/^chunk_\d+_\d+$/) ? 'YES' : 'NO'}`);
    });

    return splitChunks;
  }

  testEdgeCases() {
    console.log('\n\n🧪 TESTING EDGE CASES');
    console.log('=' .repeat(50));

    // Test 1: Already prefixed ID
    console.log('\n1. Testing already prefixed ID:');
    const prefixed = this.createChunkFixed('chunk_123', 'test', {});
    console.log(`   Input: 'chunk_123' → Output: '${prefixed.id}'`);
    console.log(`   ✅ No double prefix: ${!prefixed.id.includes('chunk_chunk_')}`);

    // Test 2: Numeric ID
    console.log('\n2. Testing numeric ID:');
    const numeric = this.createChunkFixed(456, 'test', {});
    console.log(`   Input: 456 → Output: '${numeric.id}'`);
    console.log(`   ✅ Correct format: ${numeric.id === 'chunk_456'}`);

    // Test 3: String ID without prefix
    console.log('\n3. Testing string ID without prefix:');
    const string = this.createChunkFixed('789', 'test', {});
    console.log(`   Input: '789' → Output: '${string.id}'`);
    console.log(`   ✅ Correct format: ${string.id === 'chunk_789'}`);
  }

  run() {
    console.log('🧪 CHUNK_117 DOUBLE PREFIX BUG TEST');
    console.log('=' .repeat(60));
    console.log('Demonstrates the bug and validates the fix\n');

    const brokenResults = this.testBrokenBehavior();
    const fixedResults = this.testFixedBehavior();
    this.testEdgeCases();

    console.log('\n\n📊 COMPARISON SUMMARY');
    console.log('=' .repeat(50));
    console.log('Broken vs Fixed behavior for splitting chunk_117:');
    
    brokenResults.forEach((brokenChunk, i) => {
      const fixedChunk = fixedResults[i];
      console.log(`\n${i + 1}. Chunk part ${brokenChunk.metadata.chunk_part}:`);
      console.log(`   Broken: ${brokenChunk.id}`);
      console.log(`   Fixed:  ${fixedChunk.id}`);
      console.log(`   Issue:  ${brokenChunk.id.includes('chunk_chunk_') ? '❌ Double prefix' : '✅ Correct'}`);
    });

    console.log('\n\n🎯 VERIFICATION');
    console.log('=' .repeat(50));
    const hasDoublePrefixBroken = brokenResults.some(chunk => chunk.id.includes('chunk_chunk_'));
    const hasDoublePrefixFixed = fixedResults.some(chunk => chunk.id.includes('chunk_chunk_'));
    
    console.log(`Broken code produces chunk_chunk_: ${hasDoublePrefixBroken ? '❌ YES (BUG)' : '✅ NO'}`);
    console.log(`Fixed code produces chunk_chunk_:  ${hasDoublePrefixFixed ? '❌ YES (BUG)' : '✅ NO'}`);
    
    console.log('\n💡 IMPLEMENTATION NOTES');
    console.log('=' .repeat(50));
    console.log('1. Fix involves checking for existing chunk_ prefix in createChunk()');
    console.log('2. In splitLongChunk(), use base ID without prefix for sub-chunks');
    console.log('3. This ensures clean chunk_117_1, chunk_117_2 format');
    console.log('4. Parent-child relationships remain intact');
    console.log('5. No breaking changes to existing functionality');
  }
}

// Run the test
if (require.main === module) {
  const tester = new ChunkFixTester();
  tester.run();
}

module.exports = ChunkFixTester;