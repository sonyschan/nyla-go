// Quick test to verify provider detection fix
// Run this in browser console to test the fix

console.log('=== PROVIDER DETECTION TEST ===');

const llmConfig = window.NYLALLMConfig;
if (!llmConfig) {
    console.error('❌ NYLALLMConfig not available');
} else {
    console.log('✅ NYLALLMConfig available');
    
    // Test the methods
    const providerObject = llmConfig.getCurrentProvider();
    const providerName = llmConfig.getCurrentProviderName();
    
    console.log('Provider Object:', providerObject);
    console.log('Provider Name:', providerName);
    console.log('');
    
    // Test the comparison that was failing
    console.log('Object === "hosted":', providerObject === 'hosted');
    console.log('Name === "hosted":', providerName === 'hosted');
    console.log('');
    
    // Test environment detection
    console.log('Environment:', llmConfig.isDevelopment() ? 'development' : 'production');
    console.log('Default Provider:', llmConfig.getEnvironmentDefaultProvider());
    console.log('');
    
    // Test the fixed logic
    const shouldSkipWebLLM = providerName === 'hosted';
    console.log('Should skip WebLLM preload:', shouldSkipWebLLM);
    
    if (shouldSkipWebLLM) {
        console.log('✅ WebLLM preload will be SKIPPED (correct for development)');
    } else {
        console.log('⚠️ WebLLM preload will run (check if this is intended)');
    }
}