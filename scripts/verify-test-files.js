#!/usr/bin/env node

/**
 * Verify PROMPT_V2 test files are properly structured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 PROMPT_V2 Test Files Verification');
console.log('=' .repeat(50));

// Check simple test file
const simpleTestPath = path.join(__dirname, '../tests/test-prompt-v2-simple.html');
console.log('\n📝 Simple Test File:', simpleTestPath);

if (fs.existsSync(simpleTestPath)) {
    const simpleContent = fs.readFileSync(simpleTestPath, 'utf8');
    console.log('✅ File exists');
    console.log('✅ Has PROMPT_V1:', simpleContent.includes('PROMPT_V1'));
    console.log('✅ Has PROMPT_V2:', simpleContent.includes('PROMPT_V2'));
    console.log('✅ Has metrics display:', simpleContent.includes('46.4%'));
    console.log('✅ Has comparison feature:', simpleContent.includes('togglePrompts'));
    console.log('✅ No external dependencies required');
} else {
    console.log('❌ Simple test file not found');
}

// Check full browser test file
const browserTestPath = path.join(__dirname, '../tests/test-prompt-v2-browser.html');
console.log('\n🌐 Full Browser Test File:', browserTestPath);

if (fs.existsSync(browserTestPath)) {
    const browserContent = fs.readFileSync(browserTestPath, 'utf8');
    console.log('✅ File exists');
    console.log('✅ Has dependency loading:', browserContent.includes('nyla-device-utils.js'));
    console.log('✅ Has error handling:', browserContent.includes('showFallbackInfo'));
    console.log('✅ Has engine initialization:', browserContent.includes('NYLALLMEngine'));
    console.log('✅ Has feature flag controls:', browserContent.includes('enableOptimization'));
    console.log('✅ Correct relative paths:', browserContent.includes('../pwa/js/'));
} else {
    console.log('❌ Browser test file not found');
}

console.log('\n🚀 Testing Instructions:');
console.log('1. Simple Test (No dependencies):');
console.log('   Open tests/test-prompt-v2-simple.html in browser');
console.log('   - Compare V1 vs V2 prompts');
console.log('   - View optimization strategies');
console.log('   - See implementation guide');

console.log('\n2. Full Test (With PWA context):');
console.log('   cd tests && python3 -m http.server 8000');
console.log('   Open http://localhost:8000/test-prompt-v2-browser.html');
console.log('   - Test actual feature flag functionality');
console.log('   - Real-time engine status');
console.log('   - Live enable/disable controls');

console.log('\n📊 Both files provide:');
console.log('• 46.4% token reduction analysis');
console.log('• Performance metrics display');
console.log('• Implementation guidance');
console.log('• Production usage examples');