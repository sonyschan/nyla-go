/**
 * PWA i18n System
 * Internationalization system for Progressive Web App
 * Adapted from extension-i18n.js for PWA environment
 */

class PWAI18n {
  constructor() {
    this.currentLanguage = this.detectLanguage();
    this.translations = this.getInlineTranslations();
    
    // Initialize PWA-specific features
    this.initializePWA();
    
    console.log(`🌐 PWA i18n: Initialized with ${this.currentLanguage}`);
  }

  /**
   * Detect language (PWA version)
   */
  detectLanguage() {
    // Check localStorage first
    const savedLang = localStorage.getItem('nylaGoLanguage');
    if (savedLang && this.isSupported(savedLang)) {
      return savedLang;
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
    return ['en', 'zh', 'es'].includes(lang);
  }

  /**
   * Get all translations (inline for PWA)
   */
  getInlineTranslations() {
    return {
      en: {
        // PWA Header
        'pwa.tagline': 'Your AI agent for payments and community',
        'pwa.title': 'NYLA GO - Payment Requests',
        
        // Navigation & Tabs
        'pwa.nav.nyla': 'NYLA',
        'pwa.nav.send': 'Send',
        'pwa.nav.receive': 'Receive',
        'pwa.nav.swap': 'Swap',
        'pwa.nav.community': 'Community',
        
        // Left Sidebar Menu (Desktop)
        'pwa.menu.community.raids': 'Community Raids',
        'pwa.menu.community.apps': 'Community Apps',
        'pwa.menu.settings': 'Settings',
        'pwa.menu.feedback': 'Feedback',
        'pwa.menu.donate': 'Donate',
        
        // Form Labels
        'pwa.form.recipient': 'Recipient Username on X',
        'pwa.form.recipient.placeholder': '@username',
        'pwa.form.amount': 'Amount',
        'pwa.form.token': 'Token',
        'pwa.form.blockchain': 'Blockchain',
        'pwa.form.amount.token': 'Amount & Token',
        
        // Buttons
        'pwa.button.send': 'Send to X.com',
        'pwa.button.share': 'Share Payment Request',
        'pwa.button.generate': 'Generate QR Code',
        'pwa.button.back': '← Back',
        'pwa.button.copy': 'Copy Command',
        
        // Send tab
        'pwa.send.command.placeholder': 'Fill in the fields above to see the command',
        
        // Receive tab
        'pwa.receive.username': 'Your Username on X',
        'pwa.receive.amount.token': 'Amount & Token',
        'pwa.qr.instruction': '📱 Share this QR code to receive NYLA payments',
        'pwa.qr.instruction.dynamic': '📱 Share this QR code to receive {token} payments',
        'pwa.qr.hint': 'Others can scan to send you tokens instantly',
        
        // Swap tab
        'pwa.swap.amount.from': 'Amount & From Token',
        'pwa.swap.to.token': 'To Token',
        'pwa.swap.command.placeholder': 'Fill in the fields above to see the swap command',
        
        // Common
        'pwa.command.preview': 'Command Preview',
        
        // Community Raids
        'pwa.raids.title': 'Community Raids',
        'pwa.raids.subtitle': 'Join community engagement campaigns and support NYLA ecosystem growth',
        'pwa.raids.core.title': 'NYLA Core',
        'pwa.raids.team.title': 'The Team',
        'pwa.raids.team.description': 'Key NYLA project contributors - support their posts',
        'pwa.raids.community.title': 'Community',
        'pwa.raids.active.title': 'Active NYLA Raiders',
        'pwa.raids.active.description': 'Follow these community members\' engagement patterns',
        'pwa.raids.ticker.title': '$NYLA ticker mentioned',
        'pwa.raids.ticker.description': 'Engage top/latest X posts around $NYLA',
        
        // Community Apps
        'pwa.apps.title': 'Community Apps',
        'pwa.apps.subtitle': 'Discover amazing applications built by the NYLA community',
        'pwa.apps.ecosystem.title': 'Ecosystem',
        'pwa.apps.gaming.title': 'Gaming',
        'pwa.apps.nyla.yuki.name': 'NYLA x YUKI',
        'pwa.apps.nyla.yuki.author': 'by @yukisofficial',
        'pwa.apps.nyla.yuki.description': 'Interactive NYLA-powered experience with community features and engagement',
        'pwa.apps.moon.dodge.name': 'Nyla Moon Dodge',
        'pwa.apps.moon.dodge.author': 'by @AgentPuffle',
        'pwa.apps.moon.dodge.description': 'Navigate through space obstacles in this exciting moon-themed dodge game',
        'pwa.apps.nyla.jump.name': 'Nyla Jump',
        'pwa.apps.nyla.jump.author': 'by @AgentPuffle',
        'pwa.apps.nyla.jump.description': 'Fun jumping game featuring NYLA themes and mechanics',
        
        // Settings
        'pwa.settings.title': 'Settings',
        'pwa.settings.username': 'Your X Username',
        'pwa.settings.language': 'Language',
        'pwa.settings.username.help': 'This will be used in the Receive tab',
        
        // Status messages
        'pwa.status.loading': 'Loading...',
        'pwa.status.generating': 'Generating QR Code...',
        'pwa.status.ready': 'Ready',
        'pwa.status.copied': 'Copied to clipboard!',
        
        // Footer
        'pwa.version': 'NYLA Go v{version}',
        'pwa.feedback': 'Feedback',
        'pwa.donate': 'Donate',
        
        // Responsive
        'pwa.menu.toggle': 'Menu',
        'pwa.menu.close': 'Close Menu'
      },
      
      zh: {
        // PWA Header
        'pwa.tagline': '您的支付和社区AI代理',
        'pwa.title': 'NYLA GO - 支付请求',
        
        // Navigation & Tabs
        'pwa.nav.nyla': 'NYLA',
        'pwa.nav.send': '发送',
        'pwa.nav.receive': '接收',
        'pwa.nav.swap': '交换',
        'pwa.nav.community': '社区',
        
        // Left Sidebar Menu (Desktop)
        'pwa.menu.community.raids': '社区活动',
        'pwa.menu.community.apps': '社区应用',
        'pwa.menu.settings': '设置',
        'pwa.menu.feedback': '反馈',
        'pwa.menu.donate': '捐赠',
        
        // Form Labels
        'pwa.form.recipient': '收款人X用户名',
        'pwa.form.recipient.placeholder': '@用户名',
        'pwa.form.amount': '金额',
        'pwa.form.token': '代币',
        'pwa.form.blockchain': '区块链',
        'pwa.form.amount.token': '金额和代币',
        
        // Buttons
        'pwa.button.send': '发送到X.com',
        'pwa.button.share': '分享付款请求',
        'pwa.button.generate': '生成二维码',
        'pwa.button.back': '← 返回',
        'pwa.button.copy': '复制命令',
        
        // Send tab
        'pwa.send.command.placeholder': '填写上述字段以查看命令',
        
        // Receive tab
        'pwa.receive.username': '您的X用户名',
        'pwa.receive.amount.token': '金额和代币',
        'pwa.qr.instruction': '📱 分享此二维码接收NYLA付款',
        'pwa.qr.instruction.dynamic': '📱 分享此二维码接收{token}付款',
        'pwa.qr.hint': '其他人可以扫描立即向您发送代币',
        
        // Swap tab
        'pwa.swap.amount.from': '金额和源代币',
        'pwa.swap.to.token': '目标代币',
        'pwa.swap.command.placeholder': '填写上述字段以查看交换命令',
        
        // Common
        'pwa.command.preview': '命令预览',
        
        // Community Raids
        'pwa.raids.title': '社区活动',
        'pwa.raids.subtitle': '参与社区互动活动，支持NYLA生态系统发展',
        'pwa.raids.core.title': 'NYLA核心',
        'pwa.raids.team.title': '团队',
        'pwa.raids.team.description': 'NYLA项目核心贡献者 - 支持他们的发布',
        'pwa.raids.community.title': '社区',
        'pwa.raids.active.title': '活跃NYLA突击队',
        'pwa.raids.active.description': '跟随这些社区成员的互动模式',
        'pwa.raids.ticker.title': '提及$NYLA代币',
        'pwa.raids.ticker.description': '参与围绕$NYLA的热门/最新X帖子',
        
        // Community Apps
        'pwa.apps.title': '社区应用',
        'pwa.apps.subtitle': '探索NYLA社区构建的精彩应用程序',
        'pwa.apps.ecosystem.title': '生态系统',
        'pwa.apps.gaming.title': '游戏',
        'pwa.apps.nyla.yuki.name': 'NYLA x YUKI',
        'pwa.apps.nyla.yuki.author': '由 @yukisofficial 开发',
        'pwa.apps.nyla.yuki.description': '具有社区功能和互动的NYLA驱动交互体验',
        'pwa.apps.moon.dodge.name': 'Nyla 月球闪避',
        'pwa.apps.moon.dodge.author': '由 @AgentPuffle 开发',
        'pwa.apps.moon.dodge.description': '在这个令人兴奋的月球主题闪避游戏中穿越太空障碍',
        'pwa.apps.nyla.jump.name': 'Nyla 跳跃',
        'pwa.apps.nyla.jump.author': '由 @AgentPuffle 开发',
        'pwa.apps.nyla.jump.description': '具有NYLA主题和机制的有趣跳跃游戏',
        
        // Settings
        'pwa.settings.title': '设置',
        'pwa.settings.username': '您的X用户名',
        'pwa.settings.language': '语言',
        'pwa.settings.username.help': '这将在接收选项卡中使用',
        
        // Status messages
        'pwa.status.loading': '加载中...',
        'pwa.status.generating': '生成二维码中...',
        'pwa.status.ready': '就绪',
        'pwa.status.copied': '已复制到剪贴板！',
        
        // Footer
        'pwa.version': 'NYLA Go v{version}',
        'pwa.feedback': '反馈',
        'pwa.donate': '捐赠',
        
        // Responsive
        'pwa.menu.toggle': '菜单',
        'pwa.menu.close': '关闭菜单'
      },
      
      es: {
        // PWA Header
        'pwa.tagline': 'Tu agente de IA para pagos y comunidad',
        'pwa.title': 'NYLA GO - Solicitudes de Pago',
        
        // Navigation & Tabs
        'pwa.nav.nyla': 'NYLA',
        'pwa.nav.send': 'Enviar',
        'pwa.nav.receive': 'Recibir',
        'pwa.nav.swap': 'Intercambiar',
        'pwa.nav.community': 'Comunidad',
        
        // Left Sidebar Menu (Desktop)
        'pwa.menu.community.raids': 'Raids de Comunidad',
        'pwa.menu.community.apps': 'Apps de Comunidad',
        'pwa.menu.settings': 'Configuración',
        'pwa.menu.feedback': 'Comentarios',
        'pwa.menu.donate': 'Donar',
        
        // Form Labels
        'pwa.form.recipient': 'Usuario X del Destinatario',
        'pwa.form.recipient.placeholder': '@usuario',
        'pwa.form.amount': 'Cantidad',
        'pwa.form.token': 'Token',
        'pwa.form.blockchain': 'Blockchain',
        'pwa.form.amount.token': 'Cantidad y Token',
        
        // Buttons
        'pwa.button.send': 'Enviar a X.com',
        'pwa.button.share': 'Compartir Solicitud de Pago',
        'pwa.button.generate': 'Generar Código QR',
        'pwa.button.back': '← Atrás',
        'pwa.button.copy': 'Copiar Comando',
        
        // Send tab
        'pwa.send.command.placeholder': 'Completa los campos de arriba para ver el comando',
        
        // Receive tab
        'pwa.receive.username': 'Tu Usuario de X',
        'pwa.receive.amount.token': 'Cantidad y Token',
        'pwa.qr.instruction': '📱 Comparte este código QR para recibir pagos NYLA',
        'pwa.qr.instruction.dynamic': '📱 Comparte este código QR para recibir pagos de {token}',
        'pwa.qr.hint': 'Otros pueden escanear para enviarte tokens al instante',
        
        // Swap tab
        'pwa.swap.amount.from': 'Cantidad y Token de Origen',
        'pwa.swap.to.token': 'Token de Destino',
        'pwa.swap.command.placeholder': 'Completa los campos de arriba para ver el comando de intercambio',
        
        // Common
        'pwa.command.preview': 'Vista Previa del Comando',
        
        // Community Raids
        'pwa.raids.title': 'Raids de Comunidad',
        'pwa.raids.subtitle': 'Únete a campañas de participación comunitaria y apoya el crecimiento del ecosistema NYLA',
        'pwa.raids.core.title': 'NYLA Core',
        'pwa.raids.team.title': 'El Equipo',
        'pwa.raids.team.description': 'Contribuidores clave del proyecto NYLA - apoya sus publicaciones',
        'pwa.raids.community.title': 'Comunidad',
        'pwa.raids.active.title': 'Raiders NYLA Activos',
        'pwa.raids.active.description': 'Sigue los patrones de participación de estos miembros de la comunidad',
        'pwa.raids.ticker.title': 'Ticker $NYLA mencionado',
        'pwa.raids.ticker.description': 'Participa en las publicaciones principales/más recientes de X sobre $NYLA',
        
        // Community Apps
        'pwa.apps.title': 'Apps de Comunidad',
        'pwa.apps.subtitle': 'Descubre aplicaciones increíbles construidas por la comunidad NYLA',
        'pwa.apps.ecosystem.title': 'Ecosistema',
        'pwa.apps.gaming.title': 'Juegos',
        'pwa.apps.nyla.yuki.name': 'NYLA x YUKI',
        'pwa.apps.nyla.yuki.author': 'por @yukisofficial',
        'pwa.apps.nyla.yuki.description': 'Experiencia interactiva impulsada por NYLA con características comunitarias y participación',
        'pwa.apps.moon.dodge.name': 'Nyla Moon Dodge',
        'pwa.apps.moon.dodge.author': 'por @AgentPuffle',
        'pwa.apps.moon.dodge.description': 'Navega a través de obstáculos espaciales en este emocionante juego de esquivar temático lunar',
        'pwa.apps.nyla.jump.name': 'Nyla Jump',
        'pwa.apps.nyla.jump.author': 'por @AgentPuffle',
        'pwa.apps.nyla.jump.description': 'Divertido juego de saltos con temas y mecánicas NYLA',
        
        // Settings
        'pwa.settings.title': 'Configuración',
        'pwa.settings.username': 'Tu Usuario de X',
        'pwa.settings.language': 'Idioma',
        'pwa.settings.username.help': 'Esto se usará en la pestaña Recibir',
        
        // Status messages
        'pwa.status.loading': 'Cargando...',
        'pwa.status.generating': 'Generando Código QR...',
        'pwa.status.ready': 'Listo',
        'pwa.status.copied': '¡Copiado al portapapeles!',
        
        // Footer
        'pwa.version': 'NYLA Go v{version}',
        'pwa.feedback': 'Comentarios',
        'pwa.donate': 'Donar',
        
        // Responsive
        'pwa.menu.toggle': 'Menú',
        'pwa.menu.close': 'Cerrar Menú'
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
    
    // Save to localStorage
    localStorage.setItem('nylaGoLanguage', langCode);
    
    // Update UI
    this.translatePWAUI();
    
    // Update dynamic content
    this.updateDynamicContent();
    
    console.log(`🌐 PWA i18n: Changed to ${langCode}`);
    return true;
  }

  /**
   * Initialize PWA-specific features
   */
  initializePWA() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupPWATranslation();
      });
    } else {
      this.setupPWATranslation();
    }
  }

  /**
   * Setup PWA translation
   */
  setupPWATranslation() {
    // Create language selector in settings
    this.createLanguageSettings();
    
    // Translate initial UI
    this.translatePWAUI();
  }

  /**
   * Translate PWA UI
   */
  translatePWAUI() {
    // Update common elements
    const translations = [
      // Header
      { selector: '[data-i18n="pwa.tagline"]', key: 'pwa.tagline' },
      
      // Navigation tabs
      { selector: '[data-i18n="pwa.nav.nyla"]', key: 'pwa.nav.nyla' },
      { selector: '[data-i18n="pwa.nav.send"]', key: 'pwa.nav.send' },
      { selector: '[data-i18n="pwa.nav.receive"]', key: 'pwa.nav.receive' },
      { selector: '[data-i18n="pwa.nav.swap"]', key: 'pwa.nav.swap' },
      { selector: '[data-i18n="pwa.nav.community"]', key: 'pwa.nav.community' },
      
      // Left sidebar menu
      { selector: '[data-i18n="pwa.menu.community.raids"]', key: 'pwa.menu.community.raids' },
      { selector: '[data-i18n="pwa.menu.community.apps"]', key: 'pwa.menu.community.apps' },
      { selector: '[data-i18n="pwa.menu.settings"]', key: 'pwa.menu.settings' },
      { selector: '[data-i18n="pwa.menu.feedback"]', key: 'pwa.menu.feedback' },
      { selector: '[data-i18n="pwa.menu.donate"]', key: 'pwa.menu.donate' },
      
      // Form elements
      { selector: '[data-i18n="pwa.form.recipient"]', key: 'pwa.form.recipient' },
      { selector: '[data-i18n="pwa.form.amount"]', key: 'pwa.form.amount' },
      { selector: '[data-i18n="pwa.form.token"]', key: 'pwa.form.token' },
      { selector: '[data-i18n="pwa.form.blockchain"]', key: 'pwa.form.blockchain' },
      { selector: '[data-i18n="pwa.form.amount.token"]', key: 'pwa.form.amount.token' },
      
      // Buttons
      { selector: '[data-i18n="pwa.button.send"]', key: 'pwa.button.send' },
      { selector: '[data-i18n="pwa.button.share"]', key: 'pwa.button.share' },
      { selector: '[data-i18n="pwa.button.generate"]', key: 'pwa.button.generate' },
      { selector: '[data-i18n="pwa.button.back"]', key: 'pwa.button.back' },
      { selector: '[data-i18n="pwa.button.copy"]', key: 'pwa.button.copy' },
      
      // Send/Receive/Swap tabs
      { selector: '[data-i18n="pwa.send.command.placeholder"]', key: 'pwa.send.command.placeholder' },
      { selector: '[data-i18n="pwa.receive.username"]', key: 'pwa.receive.username' },
      { selector: '[data-i18n="pwa.receive.amount.token"]', key: 'pwa.receive.amount.token' },
      { selector: '[data-i18n="pwa.qr.instruction"]', key: 'pwa.qr.instruction' },
      { selector: '[data-i18n="pwa.qr.hint"]', key: 'pwa.qr.hint' },
      { selector: '[data-i18n="pwa.swap.amount.from"]', key: 'pwa.swap.amount.from' },
      { selector: '[data-i18n="pwa.swap.to.token"]', key: 'pwa.swap.to.token' },
      { selector: '[data-i18n="pwa.swap.command.placeholder"]', key: 'pwa.swap.command.placeholder' },
      
      // Common elements
      { selector: '[data-i18n="pwa.command.preview"]', key: 'pwa.command.preview' },
      
      // Settings
      { selector: '[data-i18n="pwa.settings.title"]', key: 'pwa.settings.title' },
      { selector: '[data-i18n="pwa.settings.username"]', key: 'pwa.settings.username' },
      { selector: '[data-i18n="pwa.settings.language"]', key: 'pwa.settings.language' },
      { selector: '[data-i18n="pwa.settings.username.help"]', key: 'pwa.settings.username.help' },
      
      // Footer
      { selector: '[data-i18n="pwa.feedback"]', key: 'pwa.feedback' },
      { selector: '[data-i18n="pwa.donate"]', key: 'pwa.donate' },
      
      // Responsive menu
      { selector: '[data-i18n="pwa.menu.toggle"]', key: 'pwa.menu.toggle' },
      { selector: '[data-i18n="pwa.menu.close"]', key: 'pwa.menu.close' }
    ];

    translations.forEach(({ selector, key }) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.textContent = this.t(key);
      });
    });

    // Update placeholders
    const placeholders = [
      { selector: 'input[data-i18n-placeholder="pwa.form.recipient.placeholder"]', key: 'pwa.form.recipient.placeholder' }
    ];

    placeholders.forEach(({ selector, key }) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.placeholder = this.t(key);
      });
    });

    // Update version text
    const versionElement = document.getElementById('versionText');
    if (versionElement) {
      const versionMatch = versionElement.textContent.match(/v([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : '2.4.0';
      versionElement.textContent = this.t('pwa.version', { version });
    }
  }

  /**
   * Create language settings
   */
  createLanguageSettings() {
    // This will be called when settings section is created
    // Language selector will be added to the settings panel
  }

  /**
   * Update dynamic content when language changes
   */
  updateDynamicContent() {
    // Trigger callbacks for dynamic content updates
    if (window.nylaGoPWACallbacks) {
      Object.values(window.nylaGoPWACallbacks).forEach(callback => {
        if (typeof callback === 'function') {
          callback();
        }
      });
    }
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
   * Get current language info
   */
  getCurrentLanguage() {
    const languageNames = {
      'en': 'English',
      'zh': '中文',
      'es': 'Español'
    };
    
    return {
      code: this.currentLanguage,
      name: languageNames[this.currentLanguage] || 'English'
    };
  }
}

// Initialize PWA i18n
if (typeof window !== 'undefined') {
  window.pwaI18n = new PWAI18n();
  
  // Create global callbacks object for dynamic updates
  if (!window.nylaGoPWACallbacks) {
    window.nylaGoPWACallbacks = {};
  }
}