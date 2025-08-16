/**
 * NYLA LLM Configuration Manager
 * Handles switching between local WebLLM and hosted LLM proxy
 */

class NYLALLMConfig {
    constructor() {
        this.providers = {
            local: {
                name: 'Local WebLLM',
                description: 'Local Qwen model via WebLLM',
                endpoint: null, // Uses WebLLM directly
                enabled: true,
                requiresWebGPU: true
            },
            hosted: {
                name: 'Hosted LLM Proxy',
                description: 'OpenAI GPT-4o-mini via Cloud Run',
                endpoint: 'https://nylago-594680195221.northamerica-northeast2.run.app/v1/infer',
                fallbackEndpoint: 'http://localhost:8081/v1/infer', // Only for proxy development
                enabled: true,
                requiresWebGPU: false
            }
        };

        // Default provider selection
        this.defaultProvider = 'hosted'; // Changed from 'local' to 'hosted'
        this.currentProvider = this.loadProviderPreference();
        
        NYLALogger.info('🔧 LLM Config: Initialized', {
            currentProvider: this.currentProvider,
            available: Object.keys(this.providers)
        });
    }

    /**
     * Get current provider configuration
     */
    getCurrentProvider() {
        return this.providers[this.currentProvider];
    }

    /**
     * Get current provider name
     */
    getCurrentProviderName() {
        return this.currentProvider;
    }

    /**
     * Switch to a different provider
     */
    switchProvider(providerName) {
        if (!this.providers[providerName]) {
            NYLALogger.error('🔧 LLM Config: Unknown provider:', providerName);
            return false;
        }

        const oldProvider = this.currentProvider;
        this.currentProvider = providerName;
        this.saveProviderPreference();

        NYLALogger.info('🔧 LLM Config: Provider switched', {
            from: oldProvider,
            to: providerName,
            config: this.getCurrentProvider()
        });

        return true;
    }

    /**
     * Check if current provider is available
     */
    async checkProviderAvailability() {
        const provider = this.getCurrentProvider();
        
        if (this.currentProvider === 'local') {
            // Check WebGPU availability for local provider
            if (!navigator.gpu) {
                NYLALogger.warn('🔧 LLM Config: WebGPU not available for local provider');
                return false;
            }
            return true;
        }

        if (this.currentProvider === 'hosted') {
            // Check if hosted endpoint is reachable
            try {
                // Try Cloud Run primary endpoint first
                const response = await fetch(provider.endpoint.replace('/infer', '/health'), {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    NYLALogger.info('🔧 LLM Config: Cloud Run endpoint available');
                    return true;
                }
                
                // Only try local fallback if explicitly needed for proxy development
                if (provider.fallbackEndpoint && window.location.search.includes('use_local_proxy')) {
                    const fallbackResponse = await fetch(provider.fallbackEndpoint.replace('/infer', '/health'), {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    if (fallbackResponse.ok) {
                        NYLALogger.info('🔧 LLM Config: Local proxy fallback available');
                        return true;
                    }
                }
                
                NYLALogger.warn('🔧 LLM Config: Cloud Run not reachable, will fall back to local WebLLM');
                return false;
            } catch (error) {
                NYLALogger.error('🔧 LLM Config: Error checking hosted provider:', error);
                return false;
            }
        }

        return false;
    }

    /**
     * Get the appropriate endpoint for hosted provider
     */
    async getHostedEndpoint() {
        const provider = this.getCurrentProvider();
        if (this.currentProvider !== 'hosted') return null;

        try {
            // Primary endpoint: Cloud Run (for both development and production)
            const response = await fetch(provider.endpoint.replace('/infer', '/health'), {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                NYLALogger.info('🔧 LLM Config: Using Cloud Run endpoint for development');
                return provider.endpoint;
            }
            
            // Only use local proxy if explicitly requested for proxy development
            if (provider.fallbackEndpoint && window.location.search.includes('use_local_proxy')) {
                const fallbackResponse = await fetch(provider.fallbackEndpoint.replace('/infer', '/health'), {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (fallbackResponse.ok) {
                    NYLALogger.info('🔧 LLM Config: Using local proxy for development (explicitly requested)');
                    return provider.fallbackEndpoint;
                }
            }
            
            NYLALogger.error('🔧 LLM Config: Cloud Run not available, will fall back to local WebLLM');
            return null;
        } catch (error) {
            NYLALogger.error('🔧 LLM Config: Error determining endpoint:', error);
            
            // Only return local proxy if explicitly requested
            if (provider.fallbackEndpoint && window.location.search.includes('use_local_proxy')) {
                NYLALogger.info('🔧 LLM Config: Falling back to local proxy due to error');
                return provider.fallbackEndpoint;
            }
            
            return null; // Let the system fall back to local WebLLM
        }
    }

    /**
     * Load provider preference from localStorage
     */
    loadProviderPreference() {
        try {
            const saved = localStorage.getItem('nylaLLMProvider');
            if (saved && this.providers[saved]) {
                NYLALogger.debug('🔧 LLM Config: Loaded saved provider:', saved);
                return saved;
            }
        } catch (error) {
            NYLALogger.warn('🔧 LLM Config: Could not load saved provider:', error);
        }
        
        NYLALogger.debug('🔧 LLM Config: Using default provider:', this.defaultProvider);
        return this.defaultProvider;
    }

    /**
     * Save provider preference to localStorage
     */
    saveProviderPreference() {
        try {
            localStorage.setItem('nylaLLMProvider', this.currentProvider);
            NYLALogger.debug('🔧 LLM Config: Saved provider preference:', this.currentProvider);
        } catch (error) {
            NYLALogger.warn('🔧 LLM Config: Could not save provider preference:', error);
        }
    }

    /**
     * Get configuration for UI display
     */
    getConfigForUI() {
        return {
            current: this.currentProvider,
            providers: Object.entries(this.providers).map(([key, config]) => ({
                key,
                name: config.name,
                description: config.description,
                enabled: config.enabled,
                requiresWebGPU: config.requiresWebGPU
            }))
        };
    }

    /**
     * Auto-select best available provider
     */
    async autoSelectProvider() {
        // Try current provider first
        if (await this.checkProviderAvailability()) {
            NYLALogger.info('🔧 LLM Config: Current provider available:', this.currentProvider);
            return this.currentProvider;
        }

        // Try other providers
        for (const [providerName] of Object.entries(this.providers)) {
            if (providerName !== this.currentProvider) {
                this.currentProvider = providerName;
                if (await this.checkProviderAvailability()) {
                    this.saveProviderPreference();
                    NYLALogger.info('🔧 LLM Config: Auto-selected provider:', providerName);
                    return providerName;
                }
            }
        }

        NYLALogger.error('🔧 LLM Config: No providers available');
        return null;
    }
}

// Create global instance
window.NYLALLMConfig = window.NYLALLMConfig || new NYLALLMConfig();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NYLALLMConfig;
}