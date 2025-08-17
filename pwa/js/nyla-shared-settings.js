/**
 * NYLA Shared Settings
 * Manages settings shared between Extension and PWA via localStorage
 */

class NYLASharedSettings {
    constructor() {
        // Storage keys
        this.KEYS = {
            LANGUAGE: 'nylago-language',
            USERNAME: 'nylaGoUsername',
            CUSTOM_TOKENS: 'nylaGoCustomTokens',
            THEME: 'nylago-theme',
            NOTIFICATIONS: 'nylago-notifications'
        };

        // Default values
        this.DEFAULTS = {
            LANGUAGE: 'en',
            USERNAME: '',
            CUSTOM_TOKENS: [],
            THEME: 'dark',
            NOTIFICATIONS: true
        };

        // Supported languages
        this.SUPPORTED_LANGUAGES = ['en', 'zh'];

        console.log('⚙️ Shared Settings initialized');
    }

    /**
     * Get language preference
     * @returns {string} Language code ('en' or 'zh')
     */
    getLanguage() {
        const saved = localStorage.getItem(this.KEYS.LANGUAGE);
        if (saved && this.SUPPORTED_LANGUAGES.includes(saved)) {
            return saved;
        }
        return this.DEFAULTS.LANGUAGE;
    }

    /**
     * Set language preference
     * @param {string} langCode - Language code ('en' or 'zh')
     */
    setLanguage(langCode) {
        if (!this.SUPPORTED_LANGUAGES.includes(langCode)) {
            console.warn(`⚠️ Unsupported language: ${langCode}`);
            return false;
        }

        localStorage.setItem(this.KEYS.LANGUAGE, langCode);
        console.log(`✅ Language preference set to: ${langCode}`);
        
        // Dispatch event for other components to react
        window.dispatchEvent(new CustomEvent('nyla-language-changed', { 
            detail: { language: langCode } 
        }));
        
        return true;
    }

    /**
     * Get username
     * @returns {string} Saved username or empty string
     */
    getUsername() {
        return localStorage.getItem(this.KEYS.USERNAME) || this.DEFAULTS.USERNAME;
    }

    /**
     * Set username
     * @param {string} username - Username to save
     */
    setUsername(username) {
        const cleanUsername = username.trim();
        localStorage.setItem(this.KEYS.USERNAME, cleanUsername);
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('nyla-username-changed', { 
            detail: { username: cleanUsername } 
        }));
        
        return true;
    }

    /**
     * Get custom tokens
     * @returns {Array} Array of custom token symbols
     */
    getCustomTokens() {
        try {
            const saved = localStorage.getItem(this.KEYS.CUSTOM_TOKENS);
            return saved ? JSON.parse(saved) : this.DEFAULTS.CUSTOM_TOKENS;
        } catch (error) {
            console.error('❌ Failed to parse custom tokens:', error);
            return this.DEFAULTS.CUSTOM_TOKENS;
        }
    }

    /**
     * Set custom tokens
     * @param {Array} tokens - Array of custom token symbols
     */
    setCustomTokens(tokens) {
        if (!Array.isArray(tokens)) {
            console.error('❌ Custom tokens must be an array');
            return false;
        }

        localStorage.setItem(this.KEYS.CUSTOM_TOKENS, JSON.stringify(tokens));
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('nyla-tokens-changed', { 
            detail: { tokens } 
        }));
        
        return true;
    }

    /**
     * Get theme preference
     * @returns {string} Theme name ('dark' or 'light')
     */
    getTheme() {
        return localStorage.getItem(this.KEYS.THEME) || this.DEFAULTS.THEME;
    }

    /**
     * Set theme preference
     * @param {string} theme - Theme name ('dark' or 'light')
     */
    setTheme(theme) {
        if (!['dark', 'light'].includes(theme)) {
            console.warn(`⚠️ Unsupported theme: ${theme}`);
            return false;
        }

        localStorage.setItem(this.KEYS.THEME, theme);
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('nyla-theme-changed', { 
            detail: { theme } 
        }));
        
        return true;
    }

    /**
     * Get notifications preference
     * @returns {boolean} Whether notifications are enabled
     */
    getNotifications() {
        const saved = localStorage.getItem(this.KEYS.NOTIFICATIONS);
        return saved !== null ? saved === 'true' : this.DEFAULTS.NOTIFICATIONS;
    }

    /**
     * Set notifications preference
     * @param {boolean} enabled - Whether to enable notifications
     */
    setNotifications(enabled) {
        localStorage.setItem(this.KEYS.NOTIFICATIONS, String(enabled));
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('nyla-notifications-changed', { 
            detail: { enabled } 
        }));
        
        return true;
    }

    /**
     * Get all settings as an object
     * @returns {Object} All current settings
     */
    getAllSettings() {
        return {
            language: this.getLanguage(),
            username: this.getUsername(),
            customTokens: this.getCustomTokens(),
            theme: this.getTheme(),
            notifications: this.getNotifications()
        };
    }

    /**
     * Reset all settings to defaults
     */
    resetToDefaults() {
        Object.keys(this.KEYS).forEach(key => {
            localStorage.removeItem(this.KEYS[key]);
        });
        
        console.log('✅ All settings reset to defaults');
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('nyla-settings-reset'));
    }

    /**
     * Export settings for backup
     * @returns {string} JSON string of all settings
     */
    exportSettings() {
        return JSON.stringify(this.getAllSettings(), null, 2);
    }

    /**
     * Import settings from backup
     * @param {string} jsonString - JSON string of settings
     */
    importSettings(jsonString) {
        try {
            const settings = JSON.parse(jsonString);
            
            // Validate and apply each setting
            if (settings.language) this.setLanguage(settings.language);
            if (settings.username) this.setUsername(settings.username);
            if (settings.customTokens) this.setCustomTokens(settings.customTokens);
            if (settings.theme) this.setTheme(settings.theme);
            if (settings.notifications !== undefined) this.setNotifications(settings.notifications);
            
            console.log('✅ Settings imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to import settings:', error);
            return false;
        }
    }
}

// Create singleton instance
window.NYLASharedSettings = window.NYLASharedSettings || new NYLASharedSettings();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NYLASharedSettings;
}