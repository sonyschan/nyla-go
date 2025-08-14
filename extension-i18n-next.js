/**
 * Extension i18next Integration  
 * Lightweight i18next system for Chrome Extension
 * Uses inline translations to avoid CORS issues with JSON loading
 */

class ExtensionI18nNext {
  constructor() {
    this.currentLanguage = 'en';
    this.isInitialized = false;
    this.observers = [];
    this.translations = this.getInlineTranslations();
    
    console.log('🌐 Extension i18next: Initializing...');
  }

  /**
   * Initialize with inline translations (no HTTP backend needed)
   */
  async initialize() {
    try {
      // For extension, we use inline translations to avoid CORS issues
      // but we still use i18next's features like interpolation
      
      // Properly detect language (async for chrome.storage)
      this.currentLanguage = await this.detectLanguage();
      
      // Store in chrome.storage if available
      if (chrome?.storage) {
        chrome.storage.sync.set({ language: this.currentLanguage });
      } else {
        localStorage.setItem('nylago-language', this.currentLanguage);
      }

      this.isInitialized = true;
      
      console.log(`✅ Extension i18next: Initialized with ${this.currentLanguage}`);
      
      // Translate the page immediately after initialization
      this.translatePage();
      
      // Notify observers
      this.notifyLanguageChange(this.currentLanguage);
      
      return true;
    } catch (error) {
      console.error('❌ Extension i18next: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Detect user's preferred language (async for chrome.storage)
   */
  async detectLanguage() {
    // Check Chrome storage first (properly async)
    if (chrome?.storage) {
      try {
        const result = await new Promise((resolve) => {
          chrome.storage.sync.get(['language'], resolve);
        });
        
        if (result.language && this.isLanguageSupported(result.language)) {
          console.log(`🔍 Extension i18n: Found saved language: ${result.language}`);
          return result.language;
        }
      } catch (error) {
        console.warn('⚠️ Extension i18n: Chrome storage access failed:', error);
      }
    } else {
      // Check localStorage
      const saved = localStorage.getItem('nylago-language');
      if (saved && this.isLanguageSupported(saved)) {
        console.log(`🔍 Extension i18n: Found localStorage language: ${saved}`);
        return saved;
      }
    }
    
    // Check browser language as fallback
    const browserLang = navigator.language || 'en';
    const langCode = browserLang.split('-')[0];
    const detectedLang = this.isLanguageSupported(langCode) ? langCode : 'en';
    
    console.log(`🔍 Extension i18n: Using browser/default language: ${detectedLang}`);
    return detectedLang;
  }

  /**
   * Get all translations (inline for extension to avoid CORS)
   */
  getInlineTranslations() {
    return {
      en: {
        // Header
        "header.tagline": "Your AI agent for payments and community",
        
        // Tabs
        "tab.send": "Send",
        "tab.receive": "Receive", 
        "tab.swap": "Swap",
        "tab.raid": "Community",
        
        // Extension Tabs (specific keys)
        "ext.tab.send": "Send",
        "ext.tab.receive": "Receive",
        "ext.tab.swap": "Swap",
        
        // Form Labels
        "send.recipient.label": "Recipient Username on X",
        "send.recipient.placeholder": "@username",
        "send.amount.token": "Amount & Token",
        "receive.username": "Your Username on X",
        "receive.amount.token": "Amount & Token", 
        "swap.amount.from": "Amount & From Token",
        "swap.to.token": "To Token",
        
        // Blockchain
        "ui.blockchain": "Blockchain",
        "ext.blockchain": "Blockchain",
        "blockchain.solana": "Solana",
        "blockchain.ethereum": "Ethereum",
        "blockchain.algorand": "Algorand",
        
        // Buttons
        "send.button": "💸 Send to X.com",
        "receive.button": "📤 Share Payment Request",
        "swap.button": "🔄 Send to X.com",
        "ui.back": "← Back",
        
        // Command Preview
        "send.command.preview": "Command Preview",
        "send.command.placeholder": "Fill in the fields above to see the command",
        "swap.command.placeholder": "Fill in the fields above to see the swap command",
        "ext.command.preview": "Command Preview",
        "ext.send.command.placeholder": "Fill in the fields above to see the command",
        "ext.swap.command.placeholder": "Fill in the fields above to see the swap command",
        
        // QR Toggle
        "send.qr.toggle": "Switch to QR Code",
        
        // QR Instructions
        "receive.qr.instruction": "📱 Share this QR code to receive NYLA payments",
        "receive.qr.instruction_dynamic": "📱 Share this QR code to receive {{token}} payments",
        "receive.qr.hint": "Others can scan to send you tokens instantly",
        
        // Extension QR (legacy keys for compatibility)
        "ext.qr.instruction": "📱 Share this QR code to receive NYLA payments",
        "ext.qr.instruction_dynamic": "📱 Share this QR code to receive {{token}} payments",
        "ext.qr.instruction.dynamic": "📱 Share this QR code to receive {{token}} payments",
        "ext.qr.hint": "Others can scan to send you tokens instantly",
        
        // Status
        "status.loading": "Loading...",
        "status.generating": "Generating QR Code...",
        "status.ready": "Ready",
        
        // Errors
        "error.network": "Network error, please try again",
        "error.invalid": "Invalid input",
        
        // Menu
        "menu.raids": "Community Raids",
        "menu.apps": "Community Apps",
        "menu.settings": "Settings",
        
        // Extension Menu (specific keys used by extension)
        "ext.menu.raids": "Community Raids",
        "ext.menu.apps": "Community Apps",
        "ext.menu.settings": "Settings",
        
        // Settings
        "settings.title": "⚙️ Settings",
        "settings.username": "Your X Username", 
        "settings.language": "Language",
        "settings.username_help": "This will be used in the Receive tab",
        
        // Navigation
        "ui.back": "← Back",
        
        // Community Raids
        "raids.title": "🎯 Community Raids",
        "raids.subtitle": "Join community engagement campaigns and support NYLA ecosystem growth",
        "raids.core.title": "NYLA Core",
        "raids.community.title": "Community",
        "raids.team.title": "The Team",
        "raids.team.description": "Key NYLA project contributors - support their posts",
        "raids.raiders.title": "Active NYLA Raiders",
        "raids.raiders.description": "Follow these community members' engagement patterns",
        "raids.ticker.title": "$NYLA ticker mentioned",
        "raids.ticker.description": "Engage top/latest X posts around $NYLA",
        
        // Extension-specific raid keys (matching shared data)
        "ext.raids.core.title": "NYLA Core",
        "ext.raids.community.title": "Community",
        "ext.raids.team.title": "The Team",
        "ext.raids.team.description": "Key NYLA project contributors - support their posts",
        "ext.raids.active.title": "Active NYLA Raiders",
        "ext.raids.active.description": "Follow these community members' engagement patterns",
        "ext.raids.ticker.title": "$NYLA ticker mentioned",
        "ext.raids.ticker.description": "Engage top/latest X posts around $NYLA",
        
        // Community Apps
        "apps.title": "🚀 Community Apps",
        "apps.subtitle": "Discover amazing applications built by the NYLA community",
        "apps.ecosystem.title": "🌐 Ecosystem",
        "apps.gaming.title": "🎯 Gaming",
        
        // App Details
        "apps.nyla.yuki.name": "NYLA x YUKI",
        "apps.nyla.yuki.author": "by @yukisofficial",
        "apps.nyla.yuki.description": "Interactive NYLA-powered experience with community features and engagement",
        "apps.moon.dodge.name": "Nyla Moon Dodge",
        "apps.moon.dodge.author": "by @AgentPuffle",
        "apps.moon.dodge.description": "Navigate through space obstacles in this exciting moon-themed dodge game",
        "apps.jump.name": "Nyla Jump", 
        "apps.jump.author": "by @AgentPuffle",
        "apps.jump.description": "Fun jumping game featuring NYLA themes and mechanics",
        
        // Extension-specific app keys (matching HTML data-i18n)
        "ext.apps.nyla.yuki.name": "NYLA x YUKI",
        "ext.apps.nyla.yuki.author": "by @yukisofficial",
        "ext.apps.nyla.yuki.description": "Interactive NYLA-powered experience with community features and engagement",
        "ext.apps.moon.dodge.name": "Nyla Moon Dodge",
        "ext.apps.moon.dodge.author": "by @AgentPuffle",
        "ext.apps.moon.dodge.description": "Navigate through space obstacles in this exciting moon-themed dodge game",
        "ext.apps.nyla.jump.name": "Nyla Jump", 
        "ext.apps.nyla.jump.author": "by @AgentPuffle",
        "ext.apps.nyla.jump.description": "Fun jumping game featuring NYLA themes and mechanics",
        
        // Footer
        "footer.version": "NYLA Go v{{version}}",
        "footer.feedback": "Feedback",
        "footer.donate": "Donate",
        "ext.feedback": "Feedback",
        "ext.donate": "Donate"
      },
      
      zh: {
        // Header  
        "header.tagline": "您的支付和社区AI代理",
        
        // Tabs
        "tab.send": "发送",
        "tab.receive": "接收",
        "tab.swap": "交换", 
        "tab.raid": "社区",
        
        // Extension Tabs (specific keys)
        "ext.tab.send": "发送",
        "ext.tab.receive": "接收", 
        "ext.tab.swap": "交换",
        
        // Form Labels
        "send.recipient.label": "收款人X用户名",
        "send.recipient.placeholder": "@用户名",
        "send.amount.token": "金额和代币",
        "receive.username": "您的X用户名",
        "receive.amount.token": "金额和代币",
        "swap.amount.from": "金额和源代币",
        "swap.to.token": "目标代币",
        
        // Blockchain
        "ui.blockchain": "区块链",
        "ext.blockchain": "区块链", 
        "blockchain.solana": "Solana", 
        "blockchain.ethereum": "以太坊",
        "blockchain.algorand": "Algorand",
        
        // Buttons
        "send.button": "💸 发送到X.com",
        "receive.button": "📤 分享付款请求",
        "swap.button": "🔄 发送到X.com",
        "ui.back": "← 返回",
        
        // Command Preview
        "send.command.preview": "命令预览",
        "send.command.placeholder": "填写上面的字段以查看转账命令",
        "swap.command.placeholder": "在上面选择不同的代币以查看交换命令", 
        "ext.command.preview": "命令预览",
        "ext.send.command.placeholder": "填写上面的字段以查看转账命令",
        "ext.swap.command.placeholder": "在上面选择不同的代币以查看交换命令",
        
        // QR Toggle
        "send.qr.toggle": "切换到二维码",
        
        // QR Instructions  
        "receive.qr.instruction": "📱 分享此二维码接收NYLA付款",
        "receive.qr.instruction_dynamic": "📱 分享此二维码接收{{token}}付款",
        "receive.qr.hint": "其他人可以扫描并立即向您付款",
        
        // Extension QR (legacy keys for compatibility)
        "ext.qr.instruction": "📱 分享此二维码接收NYLA付款", 
        "ext.qr.instruction_dynamic": "📱 分享此二维码接收{{token}}付款",
        "ext.qr.instruction.dynamic": "📱 分享此二维码接收{{token}}付款",
        "ext.qr.hint": "其他人可以扫描并立即向您付款",
        
        // Status
        "status.loading": "加载中...",
        "status.generating": "生成二维码中...",
        "status.ready": "准备就绪",
        
        // Errors
        "error.network": "网络错误，请重试",
        "error.invalid": "输入无效",
        
        // Menu
        "menu.raids": "社区活动",
        "menu.apps": "社区应用",
        "menu.settings": "设置",
        
        // Extension Menu (specific keys used by extension)
        "ext.menu.raids": "社区活动",
        "ext.menu.apps": "社区应用",
        "ext.menu.settings": "设置",
        
        // Settings
        "settings.title": "⚙️ 设置",
        "settings.username": "您的X用户名",
        "settings.language": "语言",
        "settings.username_help": "这将在接收标签中使用",
        
        // Navigation
        "ui.back": "← 返回",
        
        // Community Raids
        "raids.title": "🎯 社区活动",
        "raids.subtitle": "参与社区互动活动，支持NYLA生态系统发展",
        "raids.core.title": "NYLA核心",
        "raids.community.title": "社区",
        "raids.team.title": "团队",
        "raids.team.description": "关键NYLA项目贡献者 - 支持他们的帖子",
        "raids.raiders.title": "活跃NYLA突击队员",
        "raids.raiders.description": "关注这些社区成员的互动模式",
        "raids.ticker.title": "$NYLA代币提及",
        "raids.ticker.description": "参与围绕$NYLA的热门/最新X帖子",
        
        // Extension-specific raid keys (matching shared data)
        "ext.raids.core.title": "NYLA核心",
        "ext.raids.community.title": "社区",
        "ext.raids.team.title": "团队",
        "ext.raids.team.description": "关键NYLA项目贡献者 - 支持他们的帖子",
        "ext.raids.active.title": "活跃NYLA突击队员",
        "ext.raids.active.description": "关注这些社区成员的互动模式",
        "ext.raids.ticker.title": "$NYLA代币提及",
        "ext.raids.ticker.description": "参与围绕$NYLA的热门/最新X帖子",
        
        // Community Apps
        "apps.title": "🚀 社区应用", 
        "apps.subtitle": "发现NYLA社区构建的精彩应用程序",
        "apps.ecosystem.title": "🌐 生态系统",
        "apps.gaming.title": "🎯 游戏",
        
        // App Details
        "apps.nyla.yuki.name": "NYLA x YUKI",
        "apps.nyla.yuki.author": "来自 @yukisofficial",
        "apps.nyla.yuki.description": "互动式NYLA驱动体验，具有社区功能和参与度",
        "apps.moon.dodge.name": "Nyla月球躲避",
        "apps.moon.dodge.author": "来自 @AgentPuffle",
        "apps.moon.dodge.description": "在这个激动人心的月球主题躲避游戏中穿越太空障碍",
        "apps.jump.name": "Nyla跳跃",
        "apps.jump.author": "来自 @AgentPuffle", 
        "apps.jump.description": "以NYLA主题和机制为特色的有趣跳跃游戏",
        
        // Extension-specific app keys (matching HTML data-i18n)
        "ext.apps.nyla.yuki.name": "NYLA x YUKI",
        "ext.apps.nyla.yuki.author": "来自 @yukisofficial",
        "ext.apps.nyla.yuki.description": "互动式NYLA驱动体验，具有社区功能和参与度",
        "ext.apps.moon.dodge.name": "Nyla月球躲避",
        "ext.apps.moon.dodge.author": "来自 @AgentPuffle",
        "ext.apps.moon.dodge.description": "在这个激动人心的月球主题躲避游戏中穿越太空障碍",
        "ext.apps.nyla.jump.name": "Nyla跳跃",
        "ext.apps.nyla.jump.author": "来自 @AgentPuffle", 
        "ext.apps.nyla.jump.description": "以NYLA主题和机制为特色的有趣跳跃游戏",
        
        // Footer
        "footer.version": "NYLA Go v{{version}}",
        "footer.feedback": "反馈",
        "footer.donate": "捐赠",
        "ext.feedback": "反馈",
        "ext.donate": "捐赠"
      }
    };
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
   * Check if language is supported
   */
  isLanguageSupported(langCode) {
    return this.getSupportedLanguages().hasOwnProperty(langCode);
  }

  /**
   * Translate a key with interpolation support
   */
  t(key, options = {}) {
    if (!this.isInitialized) {
      console.warn(`⚠️ Extension i18next not initialized, returning key: ${key}`);
      return key;
    }

    const langTranslations = this.translations[this.currentLanguage];
    if (!langTranslations) {
      console.warn(`⚠️ No translations found for language: ${this.currentLanguage}`);
      return key;
    }

    let translation = langTranslations[key];
    if (!translation) {
      // Try fallback to English
      translation = this.translations.en[key];
      if (!translation) {
        console.warn(`⚠️ Translation not found for key: ${key}`);
        return key;
      }
    }

    // Simple interpolation (replace {{variable}} with value)
    if (options && typeof options === 'object') {
      Object.entries(options).forEach(([variable, value]) => {
        const regex = new RegExp(`{{\\s*${variable}\\s*}}`, 'g');
        translation = translation.replace(regex, value);
      });
    }

    return translation;
  }

  /**
   * Change language
   */
  async changeLanguage(langCode) {
    if (!this.isLanguageSupported(langCode)) {
      console.warn(`⚠️ Unsupported language: ${langCode}`);
      return false;
    }

    this.currentLanguage = langCode;
    
    // Store preference
    if (chrome?.storage) {
      chrome.storage.sync.set({ language: langCode });
    } else {
      localStorage.setItem('nylago-language', langCode);  
    }
    
    console.log(`✅ Extension language changed to: ${langCode}`);
    
    // Translate the page with new language
    this.translatePage();
    
    // Notify observers
    this.notifyLanguageChange(langCode);
    
    return true;
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLanguage;
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
   * Update dynamic text with variables
   */
  updateDynamicText(elementId, key, variables = {}) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = this.t(key, variables);
    }
  }

  /**
   * Translate all elements with data-i18n attributes
   */
  translatePage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      if (translation !== key) {
        if (element.tagName === 'INPUT' && (element.type === 'button' || element.type === 'submit')) {
          element.value = translation;
        } else {
          element.textContent = translation;
        }
      }
    });
    
    // Update placeholders
    this.updatePlaceholders();
  }

  /**
   * Update input placeholders
   */
  updatePlaceholders() {
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });
  }
}

// Global instance for extension
let extensionI18n = null;

/**
 * Get or create global extension i18n instance
 */
function getExtensionI18n() {
  if (!extensionI18n) {
    extensionI18n = new ExtensionI18nNext();
  }
  return extensionI18n;
}

// Export for extension environment
if (typeof window !== 'undefined') {
  window.ExtensionI18nNext = ExtensionI18nNext;
  window.getExtensionI18n = getExtensionI18n;
}