/**
 * Test: LLM Decision Logic - Hosted vs Local Selection
 * Tests the environment-based decision logic for choosing between hosted and local LLM
 * and ensures warmup only occurs for local LLM scenarios
 */

// Mock dependencies
class MockNYLADeviceUtils {
    static getDeviceInfo() {
        return this._mockDeviceInfo || {
            isMobile: false,
            isPWA: true,
            isDesktopPWA: true,
            isDesktop: true,
            isExtension: false
        };
    }
    
    static setMockDeviceInfo(info) {
        this._mockDeviceInfo = info;
    }
}

class MockNYLALogger {
    static info(message, data) {
        console.log(`[INFO] ${message}`, data);
    }
    
    static warn(message, data) {
        console.log(`[WARN] ${message}`, data);
    }
}

// Mock global dependencies
global.NYLADeviceUtils = MockNYLADeviceUtils;
global.NYLALogger = MockNYLALogger;
global.window = {
    location: {
        hostname: 'localhost'
    }
};

// Import the LLM config (simulate loading)
eval(`
${require('fs').readFileSync('/Users/sonyschan/NYLAgo/pwa/js/nyla-llm-config.js', 'utf8')}
`);

describe('LLM Decision Logic Tests', () => {
    let originalLocation;
    
    beforeEach(() => {
        originalLocation = global.window.location;
        MockNYLADeviceUtils.setMockDeviceInfo(null); // Reset mock
    });
    
    afterEach(() => {
        global.window.location = originalLocation;
    });

    describe('Environment Detection', () => {
        test('should detect development environment correctly', () => {
            const testCases = [
                { hostname: 'localhost', expected: true },
                { hostname: '127.0.0.1', expected: true },
                { hostname: '192.168.1.100', expected: true },
                { hostname: 'myapp.local', expected: true },
                { hostname: 'myapp.github.io', expected: false },
                { hostname: 'production.com', expected: false }
            ];
            
            testCases.forEach(({ hostname, expected }) => {
                global.window.location = { hostname };
                const config = new NYLALLMConfig();
                expect(config.isDevelopment()).toBe(expected);
            });
        });
    });

    describe('Provider Selection Logic', () => {
        test('development environment should default to hosted LLM', () => {
            global.window.location = { hostname: 'localhost' };
            const config = new NYLALLMConfig();
            
            expect(config.getEnvironmentDefaultProvider()).toBe('hosted');
        });
        
        test('desktop PWA should use hosted LLM (no warmup needed)', () => {
            global.window.location = { hostname: 'myapp.github.io' }; // Production
            MockNYLADeviceUtils.setMockDeviceInfo({
                isMobile: false,
                isPWA: true,
                isDesktopPWA: true,
                isDesktop: true,
                isExtension: false
            });
            
            const config = new NYLALLMConfig();
            expect(config.getEnvironmentDefaultProvider()).toBe('hosted');
        });
        
        test('mobile PWA should use local LLM (warmup required)', () => {
            global.window.location = { hostname: 'myapp.github.io' }; // Production
            MockNYLADeviceUtils.setMockDeviceInfo({
                isMobile: true,
                isPWA: true,
                isDesktopPWA: false,
                isDesktop: false,
                isExtension: false
            });
            
            const config = new NYLALLMConfig();
            expect(config.getEnvironmentDefaultProvider()).toBe('local');
        });
        
        test('desktop browser should use hosted LLM', () => {
            global.window.location = { hostname: 'myapp.github.io' }; // Production
            MockNYLADeviceUtils.setMockDeviceInfo({
                isMobile: false,
                isPWA: false,
                isDesktopPWA: false,
                isDesktop: true,
                isExtension: false
            });
            
            const config = new NYLALLMConfig();
            expect(config.getEnvironmentDefaultProvider()).toBe('hosted');
        });
        
        test('unknown environment should fallback to hosted LLM (safer)', () => {
            global.window.location = { hostname: 'unknown.com' }; // Production
            // No device utils available
            global.NYLADeviceUtils = undefined;
            
            const config = new NYLALLMConfig();
            expect(config.getEnvironmentDefaultProvider()).toBe('hosted');
        });
    });

    describe('Warmup Requirements', () => {
        test('hosted LLM should not require warmup', () => {
            const config = new NYLALLMConfig();
            const hostedProvider = config.providers.hosted;
            
            expect(hostedProvider.requiresWebGPU).toBe(false);
            expect(hostedProvider.endpoint).toBeTruthy();
            // Hosted LLM uses API calls, no local model loading
        });
        
        test('local LLM should require warmup', () => {
            const config = new NYLALLMConfig();
            const localProvider = config.providers.local;
            
            expect(localProvider.requiresWebGPU).toBe(true);
            expect(localProvider.endpoint).toBeNull();
            // Local LLM needs model download and WebGPU setup
        });
    });

    describe('Real-world Scenarios', () => {
        test('desktop PWA production scenario should use hosted (current issue)', () => {
            // Simulate the exact scenario from the logs
            global.window.location = { hostname: 'nylago-app.github.io' }; // Production URL
            MockNYLADeviceUtils.setMockDeviceInfo({
                isMobile: false,
                isPWA: true,
                isDesktopPWA: true,
                isDesktop: true,
                isExtension: false
            });
            
            const config = new NYLALLMConfig();
            const defaultProvider = config.getEnvironmentDefaultProvider();
            const currentProvider = config.getCurrentProvider();
            
            // Should choose hosted LLM
            expect(defaultProvider).toBe('hosted');
            expect(currentProvider.requiresWebGPU).toBe(false);
            expect(currentProvider.endpoint).toContain('run.app'); // Cloud Run endpoint
            
            console.log('✅ Desktop PWA correctly routes to hosted LLM (no warmup)');
        });
        
        test('mobile production scenario should use local (warmup required)', () => {
            global.window.location = { hostname: 'nylago-app.github.io' }; // Production URL
            MockNYLADeviceUtils.setMockDeviceInfo({
                isMobile: true,
                isPWA: true,
                isDesktopPWA: false,
                isDesktop: false,
                isExtension: false
            });
            
            const config = new NYLALLMConfig();
            const defaultProvider = config.getEnvironmentDefaultProvider();
            const currentProvider = config.getCurrentProvider();
            
            // Should choose local LLM
            expect(defaultProvider).toBe('local');
            expect(currentProvider.requiresWebGPU).toBe(true);
            expect(currentProvider.endpoint).toBeNull(); // No endpoint, uses WebLLM
            
            console.log('✅ Mobile PWA correctly routes to local LLM (warmup required)');
        });
    });
});

// Test runner
function runTests() {
    console.log('🧪 Running LLM Decision Logic Tests...\n');
    
    const tests = [
        // Environment detection tests
        () => {
            console.log('Testing environment detection...');
            global.window.location = { hostname: 'localhost' };
            const config = new NYLALLMConfig();
            console.assert(config.isDevelopment() === true, 'localhost should be development');
            
            global.window.location = { hostname: 'myapp.github.io' };
            const config2 = new NYLALLMConfig();
            console.assert(config2.isDevelopment() === false, 'github.io should be production');
            console.log('✅ Environment detection working');
        },
        
        // Desktop PWA routing test
        () => {
            console.log('Testing desktop PWA routing...');
            global.window.location = { hostname: 'myapp.github.io' };
            MockNYLADeviceUtils.setMockDeviceInfo({
                isMobile: false,
                isPWA: true,
                isDesktopPWA: true,
                isDesktop: true,
                isExtension: false
            });
            
            const config = new NYLALLMConfig();
            const provider = config.getEnvironmentDefaultProvider();
            console.assert(provider === 'hosted', 'Desktop PWA should use hosted LLM');
            console.log('✅ Desktop PWA routes to hosted LLM (no warmup)');
        },
        
        // Mobile PWA routing test
        () => {
            console.log('Testing mobile PWA routing...');
            global.window.location = { hostname: 'myapp.github.io' };
            MockNYLADeviceUtils.setMockDeviceInfo({
                isMobile: true,
                isPWA: true,
                isDesktopPWA: false,
                isDesktop: false,
                isExtension: false
            });
            
            const config = new NYLALLMConfig();
            const provider = config.getEnvironmentDefaultProvider();
            console.assert(provider === 'local', 'Mobile PWA should use local LLM');
            console.log('✅ Mobile PWA routes to local LLM (warmup required)');
        },
        
        // Warmup requirements test
        () => {
            console.log('Testing warmup requirements...');
            const config = new NYLALLMConfig();
            
            const hosted = config.providers.hosted;
            const local = config.providers.local;
            
            console.assert(hosted.requiresWebGPU === false, 'Hosted should not require WebGPU');
            console.assert(local.requiresWebGPU === true, 'Local should require WebGPU');
            console.assert(hosted.endpoint !== null, 'Hosted should have endpoint');
            console.assert(local.endpoint === null, 'Local should not have endpoint');
            
            console.log('✅ Warmup requirements correctly configured');
        }
    ];
    
    tests.forEach((test, index) => {
        try {
            test();
        } catch (error) {
            console.error(`❌ Test ${index + 1} failed:`, error);
        }
    });
    
    console.log('\n🎉 LLM Decision Logic Tests Complete!');
}

// Export for Node.js or run in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests, NYLALLMConfig };
} else {
    // Run tests if in browser
    runTests();
}