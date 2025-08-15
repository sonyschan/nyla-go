/**
 * NYLA Device Detection Utility
 * Centralized device detection to eliminate redundant code
 */

class NYLADeviceUtils {
  static _cache = null;
  
  /**
   * Get device information (cached)
   */
  static getDeviceInfo() {
    if (!this._cache) {
      const userAgent = navigator.userAgent.toLowerCase();
      
      this._cache = {
        userAgent,
        isAndroid: userAgent.includes('android'),
        isIOS: /iphone|ipad|ipod/.test(userAgent),
        isMobile: /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent),
        isPWA: window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true ||
               document.referrer.includes('android-app://'),
        isExtension: !!(window.chrome?.runtime),
        
        get isMobilePWA() {
          return this.isMobile && (this.isPWA || !this.isExtension);
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