/**
 * NYLA Device Detection Utility
 * Centralized device detection to eliminate redundant code
 * 
 * Key flags:
 * - isExtension: true when code is running INSIDE the Chrome Extension (popup.html, content scripts)
 * - isPWA: true when the web app is installed and running as a standalone PWA
 * - isPWACapable: true when the browser can install/run PWAs (has service worker, secure context)
 * - isPWAContext: true when either installed as PWA OR capable of being a PWA
 */

class NYLADeviceUtils {
  static _cache = null;
  
  /**
   * Get device information (cached)
   */
  static getDeviceInfo() {
    if (!this._cache) {
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Debug PWA capability detection
      const serviceWorkerSupported = 'serviceWorker' in navigator;
      // Check if we're running INSIDE the Chrome Extension context (popup or content script)
      // Extension pages have chrome.runtime.id and chrome-extension:// protocol
      const isExtension = !!(window.chrome?.runtime?.id && 
                           (window.location.protocol === 'chrome-extension:' || 
                            typeof chrome?.runtime?.sendMessage === 'function'));
      const isNotExtension = !isExtension;
      const isSecureContext = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      
      console.log('🔍 PWA Capability Debug:', {
        serviceWorkerSupported,
        isNotExtension,
        isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        chromeRuntime: window.chrome?.runtime,
        chromeRuntimeId: window.chrome?.runtime?.id
      });
      
      this._cache = {
        userAgent,
        isAndroid: userAgent.includes('android'),
        isIOS: /iphone|ipad|ipod/.test(userAgent),
        isMobile: /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent),
        isPWA: window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true ||
               document.referrer.includes('android-app://'),
        isPWACapable: serviceWorkerSupported && isNotExtension && isSecureContext,
        isExtension,
        
        get isMobilePWA() {
          return this.isMobile && (this.isPWA || !this.isExtension);
        },
        
        get isDesktopPWA() {
          return !this.isMobile && this.isPWA && !this.isExtension;
        },
        
        get isDesktop() {
          return !this.isMobile && !this.isExtension;
        },
        
        // Helper to determine if running in desktop browser (including non-installed PWA)
        get isDesktopBrowser() {
          return !this.isMobile && !this.isExtension;
        },
        
        // Helper to check if running in PWA context (installed or capable)
        get isPWAContext() {
          return this.isPWA || (this.isPWACapable && !this.isExtension);
        }
      };
    }
    
    return this._cache;
  }
  
  /**
   * Clear cache (for testing)
   */
  static clearCache() {
    this._cache = null;
  }
}

/**
 * NYLA Logger with Environment-Based Levels
 * Reduces production logging overhead
 */

class NYLALogger {
  static level = window.location.hostname === 'localhost' ? 'DEBUG' : 'WARN';
  
  static debug(message, ...args) {
    if (this.level === 'DEBUG') {
      console.log(message, ...args);
    }
  }
  
  static info(message, ...args) {
    if (['DEBUG', 'INFO'].includes(this.level)) {
      console.log(message, ...args);
    }
  }
  
  static warn(message, ...args) {
    if (['DEBUG', 'INFO', 'WARN'].includes(this.level)) {
      console.warn(message, ...args);
    }
  }
  
  static error(message, ...args) {
    console.error(message, ...args);
  }
}

// Export for use in other modules
window.NYLADeviceUtils = NYLADeviceUtils;
window.NYLALogger = NYLALogger;