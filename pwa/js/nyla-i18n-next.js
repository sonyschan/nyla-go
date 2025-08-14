/**
 * NYLA i18next Integration
 * Modern internationalization system using i18next
 */

// Import i18next from CDN (for browser environment)
// Note: In production, consider bundling these dependencies

class NYLAi18nNext {
  constructor() {
    this.isInitialized = false;
    this.observers = [];
    this.currentLanguage = 'en';
    
    console.log('🌐 NYLA i18next: Initializing...');
  }

  /**
   * Initialize i18next with configuration
   */
  async initialize() {
    try {
      // Load i18next from CDN if not available
      if (typeof i18next === 'undefined') {
        await this.loadI18nextFromCDN();
      }

      // Initialize i18next
      await i18next
        .use(i18nextBrowserLanguageDetector)
        .use(i18nextHttpBackend)
        .init({
          fallbackLng: 'en',
          debug: false,
          
          // Backend configuration for loading JSON files
          backend: {
            loadPath: './locales/{{lng}}/{{ns}}.json',
            crossDomain: true
          },
          
          // Language detection configuration
          detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'nylago-language'
          },
          
          // Interpolation settings
          interpolation: {
            escapeValue: false // React already escapes values
          },
          
          // Default namespace
          defaultNS: 'common',
          ns: ['common']
        });

      this.currentLanguage = i18next.language;
      this.isInitialized = true;

      console.log(`✅ NYLA i18next: Initialized with language: ${this.currentLanguage}`);
      
      // Notify observers
      this.notifyLanguageChange(this.currentLanguage);
      
      return true;
    } catch (error) {
      console.error('❌ NYLA i18next: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Load i18next libraries from CDN (fallback)
   */
  async loadI18nextFromCDN() {
    const scripts = [
      'https://unpkg.com/i18next@23.7.16/dist/umd/i18next.min.js',
      'https://unpkg.com/i18next-browser-languagedetector@7.2.0/dist/umd/i18nextBrowserLanguageDetector.min.js', 
      'https://unpkg.com/i18next-http-backend@2.4.2/dist/umd/i18nextHttpBackend.min.js'
    ];

    for (const src of scripts) {
      await this.loadScript(src);
    }
  }

  /**
   * Load script dynamically
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Translate a key
   */
  t(key, options = {}) {
    if (!this.isInitialized) {
      console.warn(`⚠️ i18next not initialized, returning key: ${key}`);
      return key;
    }
    
    return i18next.t(key, options);
  }

  /**
   * Change language
   */
  async changeLanguage(langCode) {
    if (!this.isInitialized) {
      console.warn('⚠️ Cannot change language: i18next not initialized');
      return false;
    }

    try {
      await i18next.changeLanguage(langCode);
      this.currentLanguage = langCode;
      
      console.log(`✅ Language changed to: ${langCode}`);
      
      // Notify observers
      this.notifyLanguageChange(langCode);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to change language:', error);
      return false;
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return {
      'en': { name: 'English', nativeName: 'English' },
      'zh': { name: 'Chinese', nativeName: '中文' }
    };
  }

  /**
   * Add language change observer
   */
  addLanguageObserver(callback) {
    this.observers.push(callback);
  }

  /**
   * Remove language change observer  
   */
  removeLanguageObserver(callback) {
    this.observers = this.observers.filter(obs => obs !== callback);
  }

  /**
   * Notify all observers of language change
   */
  notifyLanguageChange(langCode) {
    this.observers.forEach(callback => {
      try {
        callback(langCode);
      } catch (error) {
        console.error('❌ Error in language observer:', error);
      }
    });
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(langCode) {
    return this.getSupportedLanguages().hasOwnProperty(langCode);
  }

  /**
   * Detect user's preferred language
   */
  detectLanguage() {
    // This is now handled by i18next's language detector
    return this.currentLanguage;
  }

  /**
   * Get translation with fallback
   */
  tWithFallback(key, fallback = null) {
    const translation = this.t(key);
    
    // If translation equals key, it means translation was not found
    if (translation === key) {
      return fallback || key;
    }
    
    return translation;
  }
}

// Global instance
let nylaI18n = null;

/**
 * Get or create global i18n instance
 */
function getNYLAi18n() {
  if (!nylaI18n) {
    nylaI18n = new NYLAi18nNext();
  }
  return nylaI18n;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NYLAi18nNext, getNYLAi18n };
} else if (typeof window !== 'undefined') {
  window.NYLAi18nNext = NYLAi18nNext;
  window.getNYLAi18n = getNYLAi18n;
}