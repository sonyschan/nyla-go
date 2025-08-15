/**
 * NYLA Feature Flag System
 * Handles URL query parameters and runtime feature flag management
 * 
 * Usage:
 * - URL: http://localhost:8080/?feature=PROMPT_V2_ENABLED,LLM_V3_ENABLED
 * - Runtime: NYLAFeatureFlags.isEnabled('PROMPT_V2_ENABLED')
 */

class NYLAFeatureFlags {
    constructor() {
        this.flags = new Map();
        this.initialized = false;
        
        // Defer initialization until NYLALogger is available
        this.deferredInit();
    }
    
    /**
     * Initialize when NYLALogger is available, or immediately if already loaded
     */
    deferredInit() {
        if (typeof NYLALogger !== 'undefined') {
            // NYLALogger is already available
            this.performInit();
        } else {
            // Wait for NYLALogger to be available
            const checkLogger = () => {
                if (typeof NYLALogger !== 'undefined') {
                    this.performInit();
                } else {
                    // Check again in next tick
                    setTimeout(checkLogger, 1);
                }
            };
            checkLogger();
        }
    }
    
    /**
     * Perform the actual initialization once NYLALogger is available
     */
    performInit() {
        if (this.initialized) return;
        
        this.initializeFromURL();
        this.initialized = true;
        
        NYLALogger.debug('🎛️ Feature Flags: Initialized', {
            enabledFlags: Array.from(this.flags.keys()).filter(key => this.flags.get(key)),
            totalFlags: this.flags.size
        });
    }
    
    /**
     * Initialize feature flags from URL query parameters
     * Supports: ?feature=FLAG1,FLAG2,FLAG3
     */
    initializeFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const featureParam = urlParams.get('feature');
            
            if (featureParam) {
                const features = featureParam.split(',').map(f => f.trim());
                features.forEach(feature => {
                    if (this.isValidFeatureFlag(feature)) {
                        this.flags.set(feature, true);
                        NYLALogger.debug(`🚀 Feature Flag: ${feature} enabled via URL`);
                    } else {
                        NYLALogger.warn(`⚠️ Feature Flag: Invalid flag name '${feature}' in URL`);
                    }
                });
                
                if (features.length > 0) {
                    NYLALogger.log(`🎛️ Feature Flags: Enabled ${features.length} flags from URL:`, features);
                }
            }
        } catch (error) {
            NYLALogger.error('🎛️ Feature Flags: URL parsing failed:', error);
        }
    }
    
    /**
     * Check if the feature flag system is ready
     * @returns {boolean} - True if initialized
     */
    isReady() {
        return this.initialized;
    }
    
    /**
     * Check if a feature flag is enabled
     * @param {string} flagName - Name of the feature flag
     * @returns {boolean} - True if enabled
     */
    isEnabled(flagName) {
        return this.flags.get(flagName) === true;
    }
    
    /**
     * Enable a feature flag at runtime
     * @param {string} flagName - Name of the feature flag
     * @param {boolean} notify - Whether to log the change
     */
    enable(flagName, notify = true) {
        if (this.isValidFeatureFlag(flagName)) {
            this.flags.set(flagName, true);
            if (notify) {
                NYLALogger.debug(`🚀 Feature Flag: ${flagName} enabled programmatically`);
            }
            return true;
        } else {
            NYLALogger.warn(`⚠️ Feature Flag: Invalid flag name '${flagName}'`);
            return false;
        }
    }
    
    /**
     * Disable a feature flag at runtime
     * @param {string} flagName - Name of the feature flag
     * @param {boolean} notify - Whether to log the change
     */
    disable(flagName, notify = true) {
        this.flags.set(flagName, false);
        if (notify) {
            NYLALogger.debug(`🔄 Feature Flag: ${flagName} disabled programmatically`);
        }
    }
    
    /**
     * Get all enabled feature flags
     * @returns {string[]} - Array of enabled flag names
     */
    getEnabledFlags() {
        return Array.from(this.flags.keys()).filter(key => this.flags.get(key));
    }
    
    /**
     * Get feature flag status report
     * @returns {Object} - Status object with enabled flags and metadata
     */
    getStatus() {
        const enabled = this.getEnabledFlags();
        const urlParams = new URLSearchParams(window.location.search);
        
        return {
            enabledFlags: enabled,
            totalFlags: this.flags.size,
            urlFeatures: urlParams.get('feature') || null,
            supportedFlags: this.getSupportedFlags()
        };
    }
    
    /**
     * Validate feature flag name
     * @param {string} flagName - Flag name to validate
     * @returns {boolean} - True if valid
     */
    isValidFeatureFlag(flagName) {
        const supportedFlags = this.getSupportedFlags();
        return supportedFlags.includes(flagName);
    }
    
    /**
     * Get list of supported feature flags
     * @returns {string[]} - Array of supported flag names
     */
    getSupportedFlags() {
        return [
            'PROMPT_V2_ENABLED',
            'LLM_V3_ENABLED',
            'RAG_DEBUG_ENABLED',
            'UI_BETA_ENABLED',
            'PERFORMANCE_MONITOR_ENABLED',
            'EXPERIMENTAL_FEATURES_ENABLED'
        ];
    }
    
    /**
     * Generate URL with current enabled flags
     * @returns {string} - URL with feature query parameter
     */
    generateFeatureURL() {
        const enabled = this.getEnabledFlags();
        if (enabled.length === 0) {
            return window.location.origin + window.location.pathname;
        }
        
        const url = new URL(window.location);
        url.searchParams.set('feature', enabled.join(','));
        return url.toString();
    }
    
    /**
     * Apply feature flags to LLM engine
     * @param {NYLALLMEngine} llmEngine - LLM engine instance
     */
    applyToLLMEngine(llmEngine) {
        if (!llmEngine) return;
        
        // Apply PROMPT_V2_ENABLED
        if (this.isEnabled('PROMPT_V2_ENABLED')) {
            if (!llmEngine.PROMPT_V2_ENABLED) {
                llmEngine.enablePromptOptimization();
                NYLALogger.log('🚀 Feature Flag: PROMPT_V2 applied to LLM engine');
            }
        }
        
        // Future: Apply other LLM-related flags here
        if (this.isEnabled('LLM_V3_ENABLED')) {
            NYLALogger.debug('🧪 Feature Flag: LLM_V3_ENABLED detected (not yet implemented)');
        }
    }
}

// Create global instance
window.NYLAFeatureFlags = window.NYLAFeatureFlags || new NYLAFeatureFlags();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NYLAFeatureFlags;
}