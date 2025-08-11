/**
 * Extension i18n System
 * Lightweight translation system for Chrome Extension popup
 */

class ExtensionI18n {
  constructor() {
    this.currentLanguage = this.detectLanguage();
    this.translations = this.getInlineTranslations();
    
    // Initialize extension-specific features
    this.initializeExtension();
    
    console.log(`🌐 Extension i18n: Initialized with ${this.currentLanguage}`);
  }

  /**
   * Detect language (simplified for extension)
   */
  detectLanguage() {
    // Check Chrome storage first
    if (chrome?.storage) {
      chrome.storage.sync.get(['language'], (result) => {
        if (result.language && this.isSupported(result.language)) {
          this.setLanguage(result.language);
        }
      });
    }
    
    // Check browser language
    const browserLang = navigator.language || 'en';
    const langCode = browserLang.split('-')[0];
    
    return this.isSupported(langCode) ? langCode : 'en';
  }

  /**
   * Check if language is supported
   */
  isSupported(lang) {
    return ['en', 'zh'].includes(lang);
  }

  /**
   * Get all translations (inline for extension)
   */
  getInlineTranslations() {
    return {
      en: {
        // Extension Header
        'ext.tagline': 'Your AI agent for payments and community',
        
        // Form Labels
        'ext.recipient': 'Recipient Username on X',
        'ext.recipient.placeholder': '@username',
        'ext.amount': 'Amount',
        'ext.token': 'Token',
        'ext.blockchain': 'Blockchain',
        
        // Buttons
        'ext.send': 'Send to X.com',
        'ext.share': 'Share Payment Request',
        'ext.generate': 'Generate QR Code',
        
        // Tabs
        'ext.tab.send': 'Send',
        'ext.tab.receive': 'Receive',
        'ext.tab.swap': 'Swap',
        'ext.tab.raid': 'Community',
        
        // Blockchain options
        'ext.solana': 'Solana',
        'ext.ethereum': 'Ethereum',
        'ext.algorand': 'Algorand',
        
        // Status messages
        'ext.status.loading': 'Loading...',
        'ext.status.generating': 'Generating QR Code...',
        'ext.status.ready': 'Ready',
        
        // Errors
        'ext.error.network': 'Network error, please try again',
        'ext.error.invalid': 'Invalid input',
        
        // Menu Items
        'ext.menu.raids': 'Community Raids',
        'ext.menu.apps': 'Community Apps',
        'ext.menu.settings': 'Settings',
        
        // Settings
        'ext.settings.title': 'Settings',
        'ext.settings.username': 'Your X Username',
        'ext.settings.language': 'Language',
        'ext.settings.username.help': 'This will be used in the Receive tab',
        
        // Footer
        'ext.version': 'NYLA Go v{version}',
        'ext.feedback': 'Feedback'
      },
      
      zh: {
        // Extension Header
        'ext.tagline': '您的支付和社区AI代理',
        
        // Form Labels
        'ext.recipient': '收款人X用户名',
        'ext.recipient.placeholder': '@用户名',
        'ext.amount': '金额',
        'ext.token': '代币',
        'ext.blockchain': '区块链',
        
        // Buttons
        'ext.send': '发送到X.com',
        'ext.share': '分享付款请求',
        'ext.generate': '生成二维码',
        
        // Tabs
        'ext.tab.send': '发送',
        'ext.tab.receive': '接收',
        'ext.tab.swap': '交换',
        'ext.tab.raid': '社区',
        
        // Blockchain options
        'ext.solana': 'Solana',
        'ext.ethereum': '以太坊',
        'ext.algorand': 'Algorand',
        
        // Status messages
        'ext.status.loading': '加载中...',
        'ext.status.generating': '生成二维码中...',
        'ext.status.ready': '就绪',
        
        // Errors
        'ext.error.network': '网络错误，请重试',
        'ext.error.invalid': '输入无效',
        
        // Menu Items
        'ext.menu.raids': '社区活动',
        'ext.menu.apps': '社区应用',
        'ext.menu.settings': '设置',
        
        // Settings
        'ext.settings.title': '设置',
        'ext.settings.username': '您的X用户名',
        'ext.settings.language': '语言',
        'ext.settings.username.help': '这将在接收选项卡中使用',
        
        // Footer
        'ext.version': 'NYLA Go v{version}',
        'ext.feedback': '反馈'
      }
    };
  }

  /**
   * Get translation
   */
  t(key, params = {}) {
    const translation = this.translations[this.currentLanguage]?.[key] || 
                      this.translations['en']?.[key] || 
                      key;
    
    return this.interpolate(translation, params);
  }

  /**
   * Interpolate parameters
   */
  interpolate(text, params) {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return params.hasOwnProperty(key) ? params[key] : match;
    });
  }

  /**
   * Set language
   */
  setLanguage(langCode) {
    if (!this.isSupported(langCode)) return false;
    
    this.currentLanguage = langCode;
    
    // Save to Chrome storage
    if (chrome?.storage) {
      chrome.storage.sync.set({ language: langCode });
    }
    
    // Update UI
    this.translateExtensionUI();
    
    // Regenerate dynamic content that uses i18n
    this.updateDynamicContent();
    
    console.log(`🌐 Extension i18n: Changed to ${langCode}`);
    return true;
  }

  /**
   * Initialize extension-specific features
   */
  initializeExtension() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupExtensionTranslation();
      });
    } else {
      this.setupExtensionTranslation();
    }
  }

  /**
   * Setup extension translation
   */
  setupExtensionTranslation() {
    // Don't create automatic language selector - it will be in Settings
    
    // Translate initial UI
    this.translateExtensionUI();
  }

  /**
   * Translate extension UI
   */
  translateExtensionUI() {
    // Update common elements
    const translations = [
      { selector: '.header p', key: 'ext.tagline' },
      // Action tabs (main navigation)
      { selector: '.action-tab[data-tab="send"]', key: 'ext.tab.send' },
      { selector: '.action-tab[data-tab="receive"]', key: 'ext.tab.receive' },
      { selector: '.action-tab[data-tab="swap"]', key: 'ext.tab.swap' },
      // Legacy tab buttons (if any exist)
      { selector: '.tab-button[data-tab="send"]', key: 'ext.tab.send' },
      { selector: '.tab-button[data-tab="receive"]', key: 'ext.tab.receive' },
      { selector: '.tab-button[data-tab="raid"]', key: 'ext.tab.raid' },
      { selector: '.send-button', key: 'ext.send' },
      { selector: '.share-button', key: 'ext.share' },
      { selector: 'label[for="recipient"]', key: 'ext.recipient' },
      { selector: 'label[for="amount"]', key: 'ext.amount' },
      // Settings elements
      { selector: 'h3[data-i18n="ext.settings.title"]', key: 'ext.settings.title' },
      { selector: 'label[data-i18n="ext.settings.username"]', key: 'ext.settings.username' },
      { selector: 'label[data-i18n="ext.settings.language"]', key: 'ext.settings.language' },
      { selector: 'small[data-i18n="ext.settings.username.help"]', key: 'ext.settings.username.help' }
    ];

    translations.forEach(({ selector, key }) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.textContent = this.t(key);
      });
    });

    // Update placeholders
    const placeholders = [
      { selector: 'input[placeholder*="@"]', key: 'ext.recipient.placeholder' }
    ];

    placeholders.forEach(({ selector, key }) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.placeholder = this.t(key);
      });
    });

    // Update version text
    const versionElement = document.getElementById('appVersion');
    if (versionElement) {
      const versionMatch = versionElement.textContent.match(/v(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : '2.2.3';
      versionElement.textContent = this.t('ext.version', { version });
    }
  }

  /**
   * Create language selector for extension
   */
  createExtensionLanguageSelector() {
    const header = document.querySelector('.header');
    if (!header) return;

    const langSelector = document.createElement('select');
    langSelector.id = 'extLangSelector';
    langSelector.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      font-size: 11px;
      padding: 2px 4px;
      background: rgba(0,0,0,0.8);
      border: 1px solid #333;
      color: white;
      border-radius: 3px;
    `;

    // Add language options
    const languages = [
      { code: 'en', name: 'EN' },
      { code: 'zh', name: '中文' }
    ];

    languages.forEach(({ code, name }) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      if (code === this.currentLanguage) {
        option.selected = true;
      }
      langSelector.appendChild(option);
    });

    // Add change listener
    langSelector.addEventListener('change', (e) => {
      this.setLanguage(e.target.value);
    });

    header.style.position = 'relative';
    header.appendChild(langSelector);
  }

  /**
   * Update dynamic text (for use by app.js)
   */
  updateDynamicText(elementId, key, params = {}) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = this.t(key, params);
    }
  }

  /**
   * Update dynamic content when language changes
   */
  updateDynamicContent() {
    // Regenerate community menu if it exists
    if (typeof generateCommunityMenu === 'function') {
      generateCommunityMenu();
    }
  }

  /**
   * Get current language info
   */
  getCurrentLanguage() {
    return {
      code: this.currentLanguage,
      name: this.currentLanguage === 'zh' ? '中文' : 'English'
    };
  }
}

// Initialize extension i18n if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.extensionI18n = new ExtensionI18n();
} else {
  window.ExtensionI18n = ExtensionI18n;
}