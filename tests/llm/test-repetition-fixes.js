/**
 * Test Repetition Detection Fixes
 * Run this to validate the LLM repetition fixes work correctly
 */

// Mock NYLALogger for testing
const NYLALogger = {
  debug: (...args) => console.log('[DEBUG]', ...args)
};

// Extract the detectAndFixRepetition function for testing
function detectAndFixRepetition(text) {
  if (!text || typeof text !== 'string') return text;

  // Pattern 1: Detect simple token repetition (like "旺柴旺柴旺柴")
  const simpleRepeatPattern = /(.{1,20})\1{3,}/g; // Same pattern repeated 3+ times
  if (simpleRepeatPattern.test(text)) {
    NYLALogger.debug('🚨 NYLA LLM: Detected simple repetition pattern, truncating...');
    // Keep only the first occurrence of the pattern
    text = text.replace(simpleRepeatPattern, '$1');
  }

  // Pattern 2: Detect phrase repetition (longer patterns)
  const phraseRepeatPattern = /(.{10,50})\1{2,}/g; // Phrases repeated 2+ times
  if (phraseRepeatPattern.test(text)) {
    NYLALogger.debug('🚨 NYLA LLM: Detected phrase repetition, truncating...');
    text = text.replace(phraseRepeatPattern, '$1');
  }

  // Pattern 3: Detect Chinese character loops specifically
  const chineseRepeatPattern = /([\u4e00-\u9fff]{1,10})\1{5,}/g; // Chinese chars repeated 5+ times
  if (chineseRepeatPattern.test(text)) {
    NYLALogger.debug('🚨 NYLA LLM: Detected Chinese character repetition, fixing...');
    text = text.replace(chineseRepeatPattern, '$1');
  }

  // Pattern 4: Emergency brake - if text is >80% repetitive characters
  const uniqueChars = new Set(text.split('')).size;
  const repetitionRatio = uniqueChars / text.length;
  if (repetitionRatio < 0.2 && text.length > 100) {
    NYLALogger.debug('🚨 NYLA LLM: Text >80% repetitive, emergency truncation');
    // Find the first complete sentence and cut there
    const sentences = text.match(/[^.!?]*[.!?]/g);
    if (sentences && sentences.length > 0) {
      text = sentences[0];
    } else {
      text = text.substring(0, Math.min(200, text.length)) + '...';
    }
  }

  return text;
}

// Test Cases
console.log('=== Testing Repetition Detection & Fixes ===\n');

// Test 1: Chinese character repetition (original issue)
const test1 = '旺柴是一个很好的项目。旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴';
console.log('Test 1 - Chinese repetition:');
console.log('Input:', test1);
console.log('Fixed:', detectAndFixRepetition(test1));
console.log('');

// Test 2: English repetition
const test2 = 'NYLA is great. NYLA is great. NYLA is great. NYLA is great. NYLA is great.';
console.log('Test 2 - English phrase repetition:');
console.log('Input:', test2);
console.log('Fixed:', detectAndFixRepetition(test2));
console.log('');

// Test 3: Short token repetition
const test3 = 'abc abc abc abc abc abc abc abc';
console.log('Test 3 - Short token repetition:');
console.log('Input:', test3);
console.log('Fixed:', detectAndFixRepetition(test3));
console.log('');

// Test 4: Mixed content (good content + repetition)
const test4 = 'WangChai (旺柴) is a community token on Solana. 旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴旺柴';
console.log('Test 4 - Mixed content:');
console.log('Input:', test4);
console.log('Fixed:', detectAndFixRepetition(test4));
console.log('');

// Test 5: High repetition ratio (emergency brake)
const test5 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
console.log('Test 5 - Emergency brake test:');
console.log('Input length:', test5.length, 'chars');
console.log('Fixed:', detectAndFixRepetition(test5));
console.log('');

// Test 6: Normal text (should remain unchanged)
const test6 = 'NYLA Go is a cryptocurrency command generator that works with Solana, Ethereum, and Algorand networks.';
console.log('Test 6 - Normal text (should remain unchanged):');
console.log('Input:', test6);
console.log('Fixed:', detectAndFixRepetition(test6));
console.log('');

console.log('=== Testing Complete ===');
console.log('Run: node test-repetition-fixes.js');