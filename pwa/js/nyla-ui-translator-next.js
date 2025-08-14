/**
 * NYLA UI Translator (i18next Version)
 * Modern UI translation system using i18next
 */

class NYLAUITranslatorNext {
  constructor(i18n) {
    this.i18n = i18n;
    this.translationMap = new Map();
    this.dynamicElements = new Set();
    
    // Register for language changes
    this.i18n.addLanguageObserver((langCode) => {
      this.translatePage();
      this.updateLanguageSelector();
    });
    
    console.log('✅ NYLA UI Translator (i18next): Initialized');
  }

  /**
   * Initialize UI translation
   */
  initialize() {
    this.setupTranslationAttributes();
    this.translatePage();
    this.setupLanguageSelector();
    this.setupDynamicTranslations();
    
    console.log('✅ UI Translator (i18next): Ready');
  }

  /**
   * Setup translation data attributes on elements
   */
  setupTranslationAttributes() {
    // Most elements should already have data-i18n attributes from HTML
    // This method handles any programmatic attribute setup
    
    const translationMap = {
      // Tab buttons (if not already set)
      '[data-tab="nyla"]:not([data-i18n])': 'tab.nyla',
      '[data-tab="send"]:not([data-i18n])': 'tab.send',
      '[data-tab="receive"]:not([data-i18n])': 'tab.receive', 
      '[data-tab="swap"]:not([data-i18n])': 'tab.swap',
      
      // Dynamic elements that might not have attributes
      '.nyla-loading-placeholder p:not([data-i18n])': 'nyla.loading',
      '.command-preview.empty:not([data-i18n])': 'send.command.placeholder'
    };

    // Add missing data-i18n attributes
    Object.entries(translationMap).forEach(([selector, key]) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.setAttribute('data-i18n', key);
      });
    });
  }

  /**
   * Translate the entire page
   */
  translatePage() {
    if (!this.i18n.isInitialized) {
      console.warn('⚠️ Cannot translate page: i18next not initialized');
      return;
    }

    // Translate elements with data-i18n attributes
    const translatableElements = document.querySelectorAll('[data-i18n]');
    translatableElements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      this.translateElement(element, key);
    });

    // Update placeholders
    this.updatePlaceholders();
    
    // Update dynamic content
    this.updateDynamicContent();
    
    console.log(`✅ Page translated to: ${this.i18n.getCurrentLanguage()}`);
  }

  /**
   * Translate individual element
   */
  translateElement(element, key) {
    try {
      const translation = this.i18n.t(key);
      
      // Don't update if translation equals key (not found)
      if (translation === key) {
        console.warn(`⚠️ Translation not found for key: ${key}`);
        return;
      }

      // Update element content based on type
      if (element.tagName === 'INPUT') {
        if (element.type === 'button' || element.type === 'submit') {
          element.value = translation;
        } else {
          // For other input types, don't change the value, might be user input
          const placeholder = element.getAttribute('data-i18n-placeholder');
          if (placeholder) {
            element.placeholder = this.i18n.t(placeholder);
          }
        }
      } else if (element.tagName === 'OPTION') {
        element.textContent = translation;
      } else {
        element.textContent = translation;
      }
      
    } catch (error) {
      console.error(`❌ Error translating element with key ${key}:`, error);
    }
  }

  /**
   * Update input placeholders
   */
  updatePlaceholders() {
    const placeholderMap = {
      '#sendRecipient': 'send.recipient.placeholder',
      '#receiveUsername': 'receive.username.label',  
      '#nylaUserInput': 'nyla.placeholder'
    };

    Object.entries(placeholderMap).forEach(([selector, key]) => {
      const element = document.querySelector(selector);
      if (element) {
        element.placeholder = this.i18n.t(key);
      }
    });
  }

  /**
   * Update dynamic content
   */
  updateDynamicContent() {
    // Update QR instruction with current token
    this.updateQRInstruction();
    
    // Update version footer
    this.updateVersionFooter();
    
    // Update any other dynamic content
    this.updateCommandPreviews();
  }

  /**
   * Update QR instruction with current token
   */
  updateQRInstruction() {
    const qrInstruction = document.getElementById('qrInstructionText');
    if (qrInstruction) {
      const selectedToken = this.getCurrentToken();
      const key = selectedToken === 'NYLA' ? 'receive.qr.instruction' : 'receive.qr.instruction_dynamic';
      
      qrInstruction.textContent = this.i18n.t(key, { token: selectedToken });
    }
  }

  /**
   * Update version in footer
   */
  updateVersionFooter() {
    const versionElement = document.querySelector('.version-text, [data-i18n*="version"]');
    if (versionElement) {
      const version = this.getAppVersion();
      versionElement.textContent = this.i18n.t('footer.version', { version });
    }
  }

  /**
   * Update command preview placeholders
   */
  updateCommandPreviews() {
    const commandPreview = document.getElementById('commandPreview');
    if (commandPreview && commandPreview.classList.contains('empty')) {
      commandPreview.textContent = this.i18n.t('send.command.placeholder');
    }
    
    const swapPreview = document.getElementById('swapCommandPreview');
    if (swapPreview && swapPreview.classList.contains('empty')) {
      swapPreview.textContent = this.i18n.t('swap.command.placeholder');
    }
  }

  /**
   * Setup language selector
   */
  setupLanguageSelector() {
    // Create language selector if it doesn't exist
    let selector = document.getElementById('languageSelector');
    if (!selector) {
      selector = this.createLanguageSelector();
    }
    
    // Update selector with current language
    this.updateLanguageSelector();
    
    // Setup change handler
    selector.addEventListener('change', (e) => {
      this.i18n.changeLanguage(e.target.value);
    });
  }

  /**
   * Create language selector element
   */
  createLanguageSelector() {
    const selector = document.createElement('select');
    selector.id = 'languageSelector';
    selector.className = 'language-selector';
    
    const languages = this.i18n.getSupportedLanguages();
    Object.entries(languages).forEach(([code, info]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = info.nativeName;
      selector.appendChild(option);
    });
    
    // Add to header or appropriate location
    const header = document.querySelector('.header');
    if (header) {
      const langContainer = document.createElement('div');
      langContainer.className = 'language-selector-container';
      langContainer.appendChild(selector);
      header.appendChild(langContainer);
    }
    
    return selector;
  }

  /**
   * Update language selector to show current language
   */
  updateLanguageSelector() {
    const selector = document.getElementById('languageSelector');
    if (selector) {
      selector.value = this.i18n.getCurrentLanguage();
    }
  }

  /**
   * Setup dynamic translations for changing content
   */
  setupDynamicTranslations() {
    // Observe token changes for QR instruction updates
    const tokenSelectors = document.querySelectorAll('select[id$="Token"]');
    tokenSelectors.forEach(select => {
      select.addEventListener('change', () => {
        this.updateQRInstruction();
      });
    });
  }

  /**
   * Get current selected token
   */
  getCurrentToken() {
    // Try to get from receive tab token selector
    const receiveToken = document.querySelector('#receiveToken');
    if (receiveToken) {
      return receiveToken.value || 'NYLA';
    }
    
    // Fallback to default
    return 'NYLA';
  }

  /**
   * Get app version
   */
  getAppVersion() {
    // Try to extract from existing version display or default
    const existingVersion = document.querySelector('.version-text')?.textContent;
    if (existingVersion) {
      const match = existingVersion.match(/v([\d.]+)/);
      if (match) {
        return match[1];
      }
    }
    
    // Fallback to hardcoded version or try to get from app.js
    return '2.4.0'; // This should match the version in app.js
  }

  /**
   * Handle token change (called externally)
   */
  onTokenChange(token) {
    this.updateQRInstruction();
  }

  /**
   * Update dynamic text with variables
   */
  updateDynamicText(elementId, key, variables = {}) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = this.i18n.t(key, variables);
    }
  }

  /**
   * Get translation with fallback
   */
  t(key, options = {}) {
    return this.i18n.t(key, options);
  }
}

// Global instance  
let nylaUITranslator = null;

/**
 * Get or create global UI translator instance
 */
function getNYLAUITranslator(i18n) {
  if (!nylaUITranslator && i18n) {
    nylaUITranslator = new NYLAUITranslatorNext(i18n);
  }
  return nylaUITranslator;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NYLAUITranslatorNext, getNYLAUITranslator };
} else if (typeof window !== 'undefined') {
  window.NYLAUITranslatorNext = NYLAUITranslatorNext;
  window.getNYLAUITranslator = getNYLAUITranslator;
}