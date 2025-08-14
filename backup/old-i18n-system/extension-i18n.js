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
        'ext.back': '← Back',
        
        // Tabs
        'ext.tab.send': 'Send',
        'ext.tab.receive': 'Receive',
        'ext.tab.swap': 'Swap',
        'ext.tab.raid': 'Community',
        
        // Blockchain options
        'ext.blockchain': 'Blockchain',
        'ext.solana': 'Solana',
        'ext.ethereum': 'Ethereum',
        'ext.algorand': 'Algorand',
        
        // Send tab
        'ext.send.amount.token': 'Amount & Token',
        
        // Receive tab
        'ext.receive.username': 'Your Username on X',
        'ext.receive.amount.token': 'Amount & Token',
        'ext.qr.instruction': '📱 Share this QR code to receive NYLA payments',
        'ext.qr.instruction.dynamic': '📱 Share this QR code to receive {token} payments',
        'ext.qr.hint': 'Others can scan to send you tokens instantly',
        
        // Swap tab
        'ext.swap.amount.from': 'Amount & From Token',
        'ext.swap.to.token': 'To Token',
        
        // Common
        'ext.command.preview': 'Command Preview',
        
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
        'ext.feedback': 'Feedback',
        'ext.donate': 'Donate',
        
        // Send tab
        'ext.send.command.placeholder': 'Fill in the fields above to see the command',
        'ext.swap.command.placeholder': 'Fill in the fields above to see the swap command',
        
        // Community Raids
        'ext.raids.title': 'Community Raids',
        'ext.raids.subtitle': 'Join community engagement campaigns and support NYLA ecosystem growth',
        'ext.raids.core.title': 'NYLA Core',
        'ext.raids.team.title': 'The Team',
        'ext.raids.team.description': 'Key NYLA project contributors - support their posts',
        'ext.raids.community.title': 'Community',
        'ext.raids.active.title': 'Active NYLA Raiders',
        'ext.raids.active.description': 'Follow these community members\' engagement patterns',
        'ext.raids.ticker.title': '$NYLA ticker mentioned',
        'ext.raids.ticker.description': 'Engage top/latest X posts around $NYLA',
        
        // Community Apps
        'ext.apps.title': 'Community Apps',
        'ext.apps.subtitle': 'Discover amazing applications built by the NYLA community',
        'ext.apps.ecosystem.title': 'Ecosystem',
        'ext.apps.gaming.title': 'Gaming',
        'ext.apps.nyla.yuki.name': 'NYLA x YUKI',
        'ext.apps.nyla.yuki.author': 'by @yukisofficial',
        'ext.apps.nyla.yuki.description': 'Interactive NYLA-powered experience with community features and engagement',
        'ext.apps.moon.dodge.name': 'Nyla Moon Dodge',
        'ext.apps.moon.dodge.author': 'by @AgentPuffle',
        'ext.apps.moon.dodge.description': 'Navigate through space obstacles in this exciting moon-themed dodge game',
        'ext.apps.nyla.jump.name': 'Nyla Jump',
        'ext.apps.nyla.jump.author': 'by @AgentPuffle',
        'ext.apps.nyla.jump.description': 'Fun jumping game featuring NYLA themes and mechanics'
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
        'ext.back': '← 返回',
        
        // Tabs
        'ext.tab.send': '发送',
        'ext.tab.receive': '接收',
        'ext.tab.swap': '交换',
        'ext.tab.raid': '社区',
        
        // Blockchain options
        'ext.blockchain': '区块链',
        'ext.solana': 'Solana',
        'ext.ethereum': '以太坊',
        'ext.algorand': 'Algorand',
        
        // Send tab
        'ext.send.amount.token': '金额和代币',
        
        // Receive tab
        'ext.receive.username': '您的X用户名',
        'ext.receive.amount.token': '金额和代币',
        'ext.qr.instruction': '📱 分享此二维码接收NYLA付款',
        'ext.qr.instruction.dynamic': '📱 分享此二维码接收{token}付款',
        'ext.qr.hint': '其他人可以扫描立即向您发送代币',
        
        // Swap tab
        'ext.swap.amount.from': '金额和源代币',
        'ext.swap.to.token': '目标代币',
        
        // Common
        'ext.command.preview': '命令预览',
        
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
        'ext.feedback': '反馈',
        'ext.donate': '捐赠',
        
        // Send tab
        'ext.send.command.placeholder': '填写上述字段以查看命令',
        'ext.swap.command.placeholder': '填写上述字段以查看交换命令',
        
        // Community Raids
        'ext.raids.title': '社区活动',
        'ext.raids.subtitle': '参与社区互动活动，支持NYLA生态系统发展',
        'ext.raids.core.title': 'NYLA核心',
        'ext.raids.team.title': '团队',
        'ext.raids.team.description': 'NYLA项目核心贡献者 - 支持他们的发布',
        'ext.raids.community.title': '社区',
        'ext.raids.active.title': '活跃NYLA突击队',
        'ext.raids.active.description': '跟随这些社区成员的互动模式',
        'ext.raids.ticker.title': '提及$NYLA代币',
        'ext.raids.ticker.description': '参与围绕$NYLA的热门/最新X帖子',
        
        // Community Apps
        'ext.apps.title': '社区应用',
        'ext.apps.subtitle': '探索NYLA社区构建的精彩应用程序',
        'ext.apps.ecosystem.title': '生态系统',
        'ext.apps.gaming.title': '游戏',
        'ext.apps.nyla.yuki.name': 'NYLA x YUKI',
        'ext.apps.nyla.yuki.author': '由 @yukisofficial 开发',
        'ext.apps.nyla.yuki.description': '具有社区功能和互动的NYLA驱动交互体验',
        'ext.apps.moon.dodge.name': 'Nyla 月球闪避',
        'ext.apps.moon.dodge.author': '由 @AgentPuffle 开发',
        'ext.apps.moon.dodge.description': '在这个令人兴奋的月球主题闪避游戏中穿越太空障碍',
        'ext.apps.nyla.jump.name': 'Nyla 跳跃',
        'ext.apps.nyla.jump.author': '由 @AgentPuffle 开发',
        'ext.apps.nyla.jump.description': '具有NYLA主题和机制的有趣跳跃游戏'
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
      // Send tab elements
      { selector: 'label[data-i18n="ext.send.amount.token"]', key: 'ext.send.amount.token' },
      // Receive tab elements
      { selector: 'label[data-i18n="ext.receive.username"]', key: 'ext.receive.username' },
      { selector: 'label[data-i18n="ext.receive.amount.token"]', key: 'ext.receive.amount.token' },
      { selector: 'p[data-i18n="ext.qr.instruction"]', key: 'ext.qr.instruction' },
      { selector: 'p[data-i18n="ext.qr.hint"]', key: 'ext.qr.hint' },
      // Swap tab elements
      { selector: 'label[data-i18n="ext.swap.amount.from"]', key: 'ext.swap.amount.from' },
      { selector: 'label[data-i18n="ext.swap.to.token"]', key: 'ext.swap.to.token' },
      { selector: 'label[data-i18n="ext.blockchain"]', key: 'ext.blockchain' },
      { selector: 'label[data-i18n="ext.command.preview"]', key: 'ext.command.preview' },
      // Back buttons
      { selector: 'button[data-i18n="ext.back"]', key: 'ext.back' },
      // Settings elements
      { selector: 'h3[data-i18n="ext.settings.title"]', key: 'ext.settings.title' },
      { selector: 'label[data-i18n="ext.settings.username"]', key: 'ext.settings.username' },
      { selector: 'label[data-i18n="ext.settings.language"]', key: 'ext.settings.language' },
      { selector: 'small[data-i18n="ext.settings.username.help"]', key: 'ext.settings.username.help' },
      // Community Raids elements
      { selector: 'h3[data-i18n="ext.raids.title"]', key: 'ext.raids.title' },
      { selector: 'p[data-i18n="ext.raids.subtitle"]', key: 'ext.raids.subtitle' },
      // Community Apps elements
      { selector: 'h3[data-i18n="ext.apps.title"]', key: 'ext.apps.title' },
      { selector: 'p[data-i18n="ext.apps.subtitle"]', key: 'ext.apps.subtitle' },
      { selector: 'h4[data-i18n="ext.apps.ecosystem.title"]', key: 'ext.apps.ecosystem.title' },
      { selector: 'h4[data-i18n="ext.apps.gaming.title"]', key: 'ext.apps.gaming.title' },
      { selector: 'div[data-i18n="ext.apps.nyla.yuki.name"]', key: 'ext.apps.nyla.yuki.name' },
      { selector: 'div[data-i18n="ext.apps.nyla.yuki.author"]', key: 'ext.apps.nyla.yuki.author' },
      { selector: 'div[data-i18n="ext.apps.nyla.yuki.description"]', key: 'ext.apps.nyla.yuki.description' },
      { selector: 'div[data-i18n="ext.apps.moon.dodge.name"]', key: 'ext.apps.moon.dodge.name' },
      { selector: 'div[data-i18n="ext.apps.moon.dodge.author"]', key: 'ext.apps.moon.dodge.author' },
      { selector: 'div[data-i18n="ext.apps.moon.dodge.description"]', key: 'ext.apps.moon.dodge.description' },
      { selector: 'div[data-i18n="ext.apps.nyla.jump.name"]', key: 'ext.apps.nyla.jump.name' },
      { selector: 'div[data-i18n="ext.apps.nyla.jump.author"]', key: 'ext.apps.nyla.jump.author' },
      { selector: 'div[data-i18n="ext.apps.nyla.jump.description"]', key: 'ext.apps.nyla.jump.description' },
      // Command preview elements
      { selector: 'div[data-i18n="ext.send.command.placeholder"]', key: 'ext.send.command.placeholder' },
      { selector: 'div[data-i18n="ext.swap.command.placeholder"]', key: 'ext.swap.command.placeholder' }
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
    // Regenerate community menu if callback exists
    if (window.nylaGoLanguageCallbacks && window.nylaGoLanguageCallbacks.updateCommunityMenu) {
      window.nylaGoLanguageCallbacks.updateCommunityMenu();
    }
    
    // Regenerate raid section if callback exists
    if (window.nylaGoLanguageCallbacks && window.nylaGoLanguageCallbacks.updateRaidSection) {
      window.nylaGoLanguageCallbacks.updateRaidSection();
    }
    
    // Regenerate footer if callback exists
    if (window.nylaGoLanguageCallbacks && window.nylaGoLanguageCallbacks.updateFooter) {
      window.nylaGoLanguageCallbacks.updateFooter();
    }
    
    // Update command previews if callback exists
    if (window.nylaGoLanguageCallbacks && window.nylaGoLanguageCallbacks.updateCommandPreviews) {
      window.nylaGoLanguageCallbacks.updateCommandPreviews();
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