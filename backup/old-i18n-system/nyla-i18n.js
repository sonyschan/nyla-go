/**
 * NYLA Internationalization (i18n) System
 * Multi-language support for Extension and PWA
 */

class NYLAi18n {
  constructor() {
    this.currentLanguage = this.detectLanguage();
    this.fallbackLanguage = 'en';
    this.translations = {};
    this.observers = [];
    
    // Supported languages
    this.supportedLanguages = {
      'en': { name: 'English', nativeName: 'English' },
      'zh': { name: 'Chinese', nativeName: '中文' },
      'zh-CN': { name: 'Chinese Simplified', nativeName: '简体中文' },
      'zh-TW': { name: 'Chinese Traditional', nativeName: '繁體中文' }
    };
    
    console.log(`🌐 i18n: Initialized with language: ${this.currentLanguage}`);
  }

  /**
   * Detect user's preferred language
   */
  detectLanguage() {
    // 1. Check localStorage preference
    const savedLang = localStorage.getItem('nylago-language');
    if (savedLang && this.isLanguageSupported(savedLang)) {
      return savedLang;
    }
    
    // 2. Check browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (this.isLanguageSupported(browserLang)) {
      return browserLang;
    }
    
    // 3. Check browser language without region (e.g., 'zh' from 'zh-CN')
    const langCode = browserLang?.split('-')[0];
    if (this.isLanguageSupported(langCode)) {
      return langCode;
    }
    
    // 4. Default to English
    return 'en';
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(langCode) {
    return this.supportedLanguages.hasOwnProperty(langCode);
  }

  /**
   * Load translations for a language
   */
  async loadTranslations(langCode) {
    if (this.translations[langCode]) {
      return this.translations[langCode];
    }

    try {
      // Try to load from static file
      const response = await fetch(`./i18n/${langCode}.json`);
      if (response.ok) {
        this.translations[langCode] = await response.json();
        console.log(`✅ i18n: Loaded translations for ${langCode}`);
        return this.translations[langCode];
      }
    } catch (error) {
      console.warn(`⚠️ i18n: Failed to load ${langCode}.json:`, error);
    }

    // Fallback to inline translations if file loading fails
    this.translations[langCode] = this.getInlineTranslations(langCode);
    return this.translations[langCode];
  }

  /**
   * Get inline translations (fallback)
   */
  getInlineTranslations(langCode) {
    const translations = {
      'zh': {
        // Tab Navigation
        'tab.nyla': 'NYLA',
        'tab.send': '发送',
        'tab.receive': '接收',
        'tab.swap': '交换',
        
        // Common UI
        'ui.amount': '金额',
        'ui.token': '代币',
        'ui.blockchain': '区块链',
        'ui.username': '用户名',
        'ui.recipient': '收款人',
        'ui.generate': '生成',
        'ui.share': '分享',
        'ui.send': '发送',
        'ui.cancel': '取消',
        'ui.close': '关闭',
        'ui.loading': '加载中...',
        
        // Header
        'header.tagline': '您的支付和社区AI代理',
        
        // Send Tab
        'send.title': '💸 发送付款',
        'send.recipient.label': '收款人X用户名',
        'send.recipient.placeholder': '@用户名',
        'send.amount.label': '金额和代币',
        'send.button': '💸 发送到X.com',
        'send.preview': '命令预览',
        'send.preview.placeholder': '填写上面的字段以查看转账命令',
        
        // Receive Tab  
        'receive.title': '💰 接收付款',
        'receive.username.label': '您的X用户名',
        'receive.qr.instruction': '📱 分享此二维码接收 {token} 付款',
        'receive.qr.hint': '其他人可以扫描并立即向您付款',
        'receive.button': '📤 分享付款请求',
        
        // Swap Tab
        'swap.title': '🔄 代币交换',
        'swap.from.label': '金额和源代币',
        'swap.to.label': '目标代币',
        'swap.button': '🔄 发送到X.com',
        'swap.preview.placeholder': '在上面选择不同的代币以查看交换命令',
        
        // Blockchain Names
        'blockchain.solana': 'Solana',
        'blockchain.ethereum': '以太坊',  
        'blockchain.algorand': 'Algorand',
        
        // NYLA AI Assistant
        'nyla.title': '❤️ NYLA AI助手 (实验性)',
        'nyla.loading': 'NYLA正在启动...',
        'nyla.placeholder': '询问关于NYLA转账、QR码或区块链的问题...',
        'nyla.send': '发送',
        
        // Errors
        'error.network': '网络错误，请重试',
        'error.invalid.username': '无效的用户名格式',
        'error.invalid.amount': '请输入有效金额',
        'error.qr.generation': '二维码生成失败',
        
        // Footer
        'footer.version': 'NYLA Go v{version}',
        'footer.feedback': '反馈',
        'footer.donate': '捐赠'
      },
      
      'zh-CN': {
        // Inherit from 'zh' and override specific terms
        ...this.getInlineTranslations('zh'),
        'blockchain.ethereum': '以太坊',
        'nyla.title': '❤️ NYLA AI助理 (试验版)'
      },
      
      'zh-TW': {
        // Traditional Chinese variants
        'tab.nyla': 'NYLA',
        'tab.send': '傳送',
        'tab.receive': '接收',
        'tab.swap': '交換',
        
        'ui.amount': '金額',
        'ui.token': '代幣',
        'ui.blockchain': '區塊鏈',
        'header.tagline': '您的支付和社群AI代理',
        
        'send.title': '💸 傳送付款',
        'send.recipient.label': '收款人X用戶名',
        'send.button': '💸 傳送到X.com',
        
        'receive.title': '💰 接收付款', 
        'receive.username.label': '您的X用戶名',
        'receive.qr.instruction': '📱 分享此QR碼接收 {token} 付款',
        'receive.button': '📤 分享付款請求',
        
        'swap.title': '🔄 代幣交換',
        'blockchain.ethereum': '以太坊',
        'nyla.title': '❤️ NYLA AI助理 (實驗性)',
        'nyla.loading': 'NYLA正在啟動...'
      }
    };

    return translations[langCode] || {};
  }

  /**
   * Get translated text
   */
  t(key, params = {}) {
    const translation = this.getTranslation(key);
    
    // Replace parameters in translation
    return this.interpolate(translation, params);
  }

  /**
   * Get translation for a key
   */
  getTranslation(key) {
    // Try current language
    if (this.translations[this.currentLanguage]?.[key]) {
      return this.translations[this.currentLanguage][key];
    }
    
    // Try fallback language
    if (this.translations[this.fallbackLanguage]?.[key]) {
      return this.translations[this.fallbackLanguage][key];
    }
    
    // Return key if no translation found
    console.warn(`⚠️ i18n: Missing translation for key: ${key}`);
    return key;
  }

  /**
   * Interpolate parameters into translation string
   */
  interpolate(text, params) {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return params.hasOwnProperty(key) ? params[key] : match;
    });
  }

  /**
   * Change language
   */
  async setLanguage(langCode) {
    if (!this.isLanguageSupported(langCode)) {
      console.warn(`⚠️ i18n: Unsupported language: ${langCode}`);
      return false;
    }

    this.currentLanguage = langCode;
    localStorage.setItem('nylago-language', langCode);
    
    // Load translations
    await this.loadTranslations(langCode);
    
    // Update HTML lang attribute
    document.documentElement.lang = langCode;
    
    // Notify observers
    this.notifyLanguageChange(langCode);
    
    console.log(`🌐 i18n: Language changed to ${langCode}`);
    return true;
  }

  /**
   * Add language change observer
   */
  addLanguageObserver(callback) {
    this.observers.push(callback);
  }

  /**
   * Notify language change observers
   */
  notifyLanguageChange(langCode) {
    this.observers.forEach(callback => {
      try {
        callback(langCode);
      } catch (error) {
        console.error('⚠️ i18n: Language observer error:', error);
      }
    });
  }

  /**
   * Initialize i18n system
   */
  async initialize() {
    // Load translations for current language
    await this.loadTranslations(this.currentLanguage);
    
    // Load fallback language if different
    if (this.currentLanguage !== this.fallbackLanguage) {
      await this.loadTranslations(this.fallbackLanguage);
    }
    
    // Set HTML lang attribute
    document.documentElement.lang = this.currentLanguage;
    
    console.log(`✅ i18n: Initialized with ${this.currentLanguage}`);
    return this;
  }

  /**
   * Get current language info
   */
  getCurrentLanguageInfo() {
    return {
      code: this.currentLanguage,
      ...this.supportedLanguages[this.currentLanguage]
    };
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages() {
    return this.supportedLanguages;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAi18n;
}
window.NYLAi18n = NYLAi18n;