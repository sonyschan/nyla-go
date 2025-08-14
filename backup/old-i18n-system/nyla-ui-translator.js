/**
 * NYLA UI Translator
 * Automatically translates UI elements based on data attributes
 */

class NYLAUITranslator {
  constructor(i18n) {
    this.i18n = i18n;
    this.translationMap = new Map();
    this.dynamicElements = new Set();
    
    // Register for language changes
    this.i18n.addLanguageObserver((langCode) => {
      this.translatePage();
    });
  }

  /**
   * Initialize UI translation
   */
  initialize() {
    this.setupTranslationAttributes();
    this.translatePage();
    this.setupLanguageSelector();
    console.log('✅ UI Translator: Initialized');
  }

  /**
   * Setup translation data attributes on elements
   */
  setupTranslationAttributes() {
    // This would ideally be done in HTML, but we can do it programmatically
    const translationMap = {
      // Tab buttons
      '[data-tab="nyla"]': 'tab.nyla',
      '[data-tab="send"]': 'tab.send', 
      '[data-tab="receive"]': 'tab.receive',
      '[data-tab="swap"]': 'tab.swap',
      
      // Header
      '.header p': 'header.tagline',
      
      // Send tab
      'label[for="sendRecipient"]': 'send.recipient.label',
      'label[for="sendAmount"]': 'send.amount.label',
      'label[for="sendToken"]': 'send.amount.label',
      '#sendButton': 'send.button',
      
      // Receive tab
      'label[for="receiveUsername"]': 'receive.username.label',
      'label[for="receiveAmount"]': 'receive.amount.label', 
      '#shareButton': 'receive.button',
      
      // Swap tab
      'label[for="swapAmount"]': 'swap.from.label',
      'label[for="swapToToken"]': 'swap.to.label',
      '#swapButton': 'swap.button',
      
      // Blockchain labels
      'label[for="sendSolana"]': 'blockchain.solana',
      'label[for="sendEthereum"]': 'blockchain.ethereum',
      'label[for="sendAlgorand"]': 'blockchain.algorand',
      'label[for="receiveSolana"]': 'blockchain.solana',
      'label[for="receiveEthereum"]': 'blockchain.ethereum',
      'label[for="receiveAlgorand"]': 'blockchain.algorand',
      'label[for="swapSolana"]': 'blockchain.solana',
      'label[for="swapEthereum"]': 'blockchain.ethereum',
      'label[for="swapAlgorand"]': 'blockchain.algorand',
      
      // NYLA Assistant
      '[data-section-title]': 'nyla.title',
      '.nyla-loading-placeholder p': 'nyla.loading'
    };

    // Add data-i18n attributes to elements
    Object.entries(translationMap).forEach(([selector, key]) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.setAttribute('data-i18n', key);
        this.translationMap.set(element, key);
      });
    });
  }

  /**
   * Translate the entire page
   */
  translatePage() {
    // Translate elements with data-i18n attributes
    const translatableElements = document.querySelectorAll('[data-i18n]');
    translatableElements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      this.translateElement(element, key);
    });

    // Update placeholders
    this.updatePlaceholders();
    
    // Update section titles
    this.updateSectionTitles();
    
    // Update dynamic content
    this.updateDynamicContent();
    
    console.log(`🌐 UI Translator: Page translated to ${this.i18n.currentLanguage}`);
  }

  /**
   * Translate a single element
   */
  translateElement(element, key, params = {}) {
    const translation = this.i18n.t(key, params);
    
    if (element.tagName === 'INPUT' && element.type === 'submit') {
      element.value = translation;
    } else if (element.hasAttribute('title')) {
      element.title = translation;
    } else if (element.hasAttribute('aria-label')) {
      element.setAttribute('aria-label', translation);
    } else {
      element.textContent = translation;
    }
  }

  /**
   * Update input placeholders
   */
  updatePlaceholders() {
    const placeholderMap = {
      '#sendRecipient': 'send.recipient.placeholder',
      '#receiveUsername': 'receive.username.label',
      '#sendAmount': 'ui.amount',
      '#receiveAmount': 'ui.amount',
      '#swapAmount': 'ui.amount'
    };

    Object.entries(placeholderMap).forEach(([selector, key]) => {
      const element = document.querySelector(selector);
      if (element) {
        element.placeholder = this.i18n.t(key);
      }
    });
  }

  /**
   * Update section titles (data-section-title attributes)
   */
  updateSectionTitles() {
    const elements = document.querySelectorAll('[data-section-title]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        const translation = this.i18n.t(key);
        element.setAttribute('data-section-title', translation);
      }
    });
  }

  /**
   * Update dynamic content that changes frequently
   */
  updateDynamicContent() {
    // Update QR instruction text
    this.updateQRInstructions();
    
    // Update command previews
    this.updateCommandPreviews();
    
    // Update version text
    this.updateVersionText();
  }

  /**
   * Update QR code instructions
   */
  updateQRInstructions() {
    const qrInstructionElement = document.getElementById('qrInstructionText');
    if (qrInstructionElement) {
      // Get current token from UI state
      const tokenSelect = document.getElementById('receiveToken');
      const token = tokenSelect?.value || 'NYLA';
      
      const translation = this.i18n.t('receive.qr.instruction', { token });
      qrInstructionElement.textContent = translation;
      
      // Store for dynamic updates
      this.dynamicElements.add({
        element: qrInstructionElement,
        key: 'receive.qr.instruction',
        getParams: () => ({ token: tokenSelect?.value || 'NYLA' })
      });
    }
  }

  /**
   * Update command preview placeholders
   */
  updateCommandPreviews() {
    const previews = [
      { id: 'sendCommandPreview', key: 'send.preview.placeholder' },
      { id: 'swapCommandPreview', key: 'swap.preview.placeholder' }
    ];

    previews.forEach(({ id, key }) => {
      const element = document.getElementById(id);
      if (element && element.textContent.includes('Fill in') || element.textContent.includes('选择')) {
        element.textContent = this.i18n.t(key);
      }
    });
  }

  /**
   * Update version text in footer
   */
  updateVersionText() {
    const versionElement = document.getElementById('versionText');
    if (versionElement) {
      // Extract version number from current text
      const versionMatch = versionElement.textContent.match(/v(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : '2.2.3';
      
      versionElement.textContent = this.i18n.t('footer.version', { version });
    }
  }

  /**
   * Setup language selector UI
   */
  setupLanguageSelector() {
    // Create language selector if it doesn't exist
    let langSelector = document.getElementById('languageSelector');
    if (!langSelector) {
      langSelector = this.createLanguageSelector();
    }
    
    // Add event listener
    langSelector.addEventListener('change', (e) => {
      this.i18n.setLanguage(e.target.value);
    });
    
    // Set current language
    langSelector.value = this.i18n.currentLanguage;
  }

  /**
   * Create language selector dropdown
   */
  createLanguageSelector() {
    const selector = document.createElement('select');
    selector.id = 'languageSelector';
    selector.className = 'language-selector';
    
    const languages = this.i18n.getSupportedLanguages();
    Object.entries(languages).forEach(([code, info]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = `${info.nativeName} (${info.name})`;
      selector.appendChild(option);
    });
    
    // Add to header or footer
    const header = document.querySelector('.header');
    if (header) {
      const langContainer = document.createElement('div');
      langContainer.className = 'language-container';
      langContainer.appendChild(selector);
      header.appendChild(langContainer);
    }
    
    return selector;
  }

  /**
   * Register element for dynamic translation updates
   */
  registerDynamicElement(element, key, getParams) {
    this.dynamicElements.add({ element, key, getParams });
  }

  /**
   * Update all dynamic elements
   */
  updateDynamicElements() {
    this.dynamicElements.forEach(({ element, key, getParams }) => {
      if (element && document.contains(element)) {
        const params = getParams ? getParams() : {};
        this.translateElement(element, key, params);
      }
    });
  }

  /**
   * Handle token change for QR instructions
   */
  onTokenChange(token) {
    const qrInstructionElement = document.getElementById('qrInstructionText');
    if (qrInstructionElement) {
      const translation = this.i18n.t('receive.qr.instruction', { token });
      qrInstructionElement.textContent = translation;
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAUITranslator;
}
window.NYLAUITranslator = NYLAUITranslator;