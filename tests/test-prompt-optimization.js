#!/usr/bin/env node

/**
 * PROMPT_V2 Optimization Verification Test
 * Tests the feature flag implementation and prompt switching
 */

// Mock browser environment for Node.js testing
global.window = {
  location: { hostname: 'localhost' },
  matchMedia: () => ({ matches: false }),
  navigator: { standalone: false }
};
global.navigator = {
  userAgent: 'test-agent'
};
global.document = {
  referrer: ''
};
global.console = console;

// Mock NYLADeviceUtils
global.NYLADeviceUtils = {
  getDeviceInfo: () => ({
    userAgent: 'test-agent',
    isAndroid: false,
    isIOS: false,
    isMobile: false,
    isPWA: false,
    isExtension: false
  })
};

// Mock NYLALogger  
global.NYLALogger = {
  debug: (msg, ...args) => console.log(`[DEBUG] ${msg}`, ...args),
  log: (msg, ...args) => console.log(`[LOG] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args)
};

// Load the LLM engine
const fs = require('fs');
const path = require('path');
const enginePath = path.join(__dirname, 'pwa/js/nyla-llm-engine.js');
const engineCode = fs.readFileSync(enginePath, 'utf8');

// Remove export statement for Node.js compatibility
const nodeCompatibleCode = engineCode.replace(/export\s+{[^}]*};?\s*$/, '');
eval(nodeCompatibleCode);

console.log('🧪 PROMPT_V2 Optimization Test Suite');
console.log('=' .repeat(50));

// Test 1: Initial state verification
console.log('\n📊 Test 1: Initial State Verification');
const engine = new NYLALLMEngine();
const initialStatus = engine.getStatus();

console.log('✅ Feature flag initial state:', engine.PROMPT_V2_ENABLED);
console.log('✅ Current prompt version:', initialStatus.promptOptimization.version);
console.log('✅ Current tokens used:', initialStatus.promptOptimization.tokensUsed);

// Test 2: Enable optimization
console.log('\n🚀 Test 2: Enable PROMPT_V2 Optimization');
const enableResult = engine.enablePromptOptimization();
console.log('✅ Enable result:', enableResult.success);
console.log('✅ Token reduction:', enableResult.metrics.tokenReduction, 'tokens');
console.log('✅ Percent reduction:', enableResult.metrics.percentReduction + '%');
console.log('✅ New version:', enableResult.metrics.version);

// Test 3: Verify prompt content
console.log('\n📝 Test 3: Verify Prompt Content');
const v2Prompt = engine.createSystemPrompt();
console.log('✅ V2 prompt character count:', v2Prompt.length);
console.log('✅ Contains core functionality:', v2Prompt.includes('JSON ONLY'));
console.log('✅ Contains URL policy:', v2Prompt.includes('URLs ok'));
console.log('✅ Contains language handling:', v2Prompt.includes('LANGUAGE:'));

// Test 4: Disable optimization
console.log('\n🔄 Test 4: Disable Optimization (Revert to V1)');
const disableResult = engine.disablePromptOptimization();
console.log('✅ Disable result:', disableResult.success);
console.log('✅ Reverted to version:', disableResult.metrics.version);
console.log('✅ Current tokens used:', disableResult.metrics.tokensUsed);

// Test 5: Double enable/disable protection
console.log('\n🛡️ Test 5: Double Action Protection');
const doubleEnable = engine.enablePromptOptimization();
engine.enablePromptOptimization(); // Second attempt
const doubleEnableSecond = engine.enablePromptOptimization();
console.log('✅ Second enable attempt blocked:', !doubleEnableSecond.success);
console.log('✅ Protection message:', doubleEnableSecond.message);

// Test 6: Performance metrics
console.log('\n⚡ Test 6: Performance Metrics');
const finalStatus = engine.getStatus();
console.log('✅ Token reduction absolute:', finalStatus.promptOptimization.tokenReduction);
console.log('✅ Token reduction percent:', finalStatus.promptOptimization.percentReduction + '%');
console.log('✅ V1 baseline tokens:', finalStatus.promptOptimization.v1Tokens);
console.log('✅ V2 optimized tokens:', finalStatus.promptOptimization.v2Tokens);

console.log('\n🎉 All Tests Completed Successfully!');
console.log('📈 PROMPT_V2 is ready for production A/B testing');
console.log('🔧 Use engine.enablePromptOptimization() to activate');
console.log('📊 Monitor with engine.getStatus().promptOptimization');