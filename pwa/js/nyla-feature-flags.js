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
        this.initializeFromURL();
        
        this._log('debug', '🎛️ Feature Flags: Initialized', {
            enabledFlags: Array.from(this.flags.keys()).filter(key => this.flags.get(key)),
            totalFlags: this.flags.size
        });
    }
    
    /**
     * Safe logging that works even if NYLALogger isn't available yet
     */
    _log(level, message, ...args) {
        try {
            if (typeof NYLALogger !== 'undefined' && NYLALogger[level]) {
                NYLALogger[level](message, ...args);
            } else if (typeof console !== 'undefined') {
                // Fallback to console with level prefix
                const prefix = `[${level.toUpperCase()}]`;
                console.log(prefix, message, ...args);
            }
        } catch (error) {
            // Silent fallback - logging shouldn't break feature flags
            if (typeof console !== 'undefined') {
                console.log('[FEATURE-FLAGS]', message, ...args);
            }
        }
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
                        this._log('debug', `🚀 Feature Flag: ${feature} enabled via URL`);
                    } else {
                        this._log('warn', `⚠️ Feature Flag: Invalid flag name '${feature}' in URL`);
                    }
                });
                
                if (features.length > 0) {
                    this._log('log', `🎛️ Feature Flags: Enabled ${features.length} flags from URL:`, features);
                }
            }
        } catch (error) {
            this._log('error', '🎛️ Feature Flags: URL parsing failed:', error);
        }
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
                this._log('debug', `🚀 Feature Flag: ${flagName} enabled programmatically`);
            }
            return true;
        } else {
            this._log('warn', `⚠️ Feature Flag: Invalid flag name '${flagName}'`);
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
            this._log('debug', `🔄 Feature Flag: ${flagName} disabled programmatically`);
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
                this._log('log', '🚀 Feature Flag: PROMPT_V2 applied to LLM engine');
            }
        }
        
        // Future: Apply other LLM-related flags here
        if (this.isEnabled('LLM_V3_ENABLED')) {
            this._log('debug', '🧪 Feature Flag: LLM_V3_ENABLED detected (not yet implemented)');
        }
    }
}

// Create global instance
window.NYLAFeatureFlags = window.NYLAFeatureFlags || new NYLAFeatureFlags();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NYLAFeatureFlags;
}