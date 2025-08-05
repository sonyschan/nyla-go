/**
 * NYLA System Controller - V2-Only System Manager
 * Simplified controller for V2-only NYLA system
 */

class NYLASystemController {
  constructor() {
    this.isInitialized = false;
    this.initializationAttempts = 0;
    this.maxAttempts = 3;
    this.assistant = null;
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('NYLA System: Already initialized, skipping');
      return;
    }

    // Check if iOS device - disable NYLA tab due to WebGPU limitations
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS) {
      console.log('NYLA System: iOS detected - NYLA tab disabled (WebGPU not supported)');
      this.showIOSMessage();
      return;
    }

    this.initializationAttempts++;
    console.log(`NYLA System: === V2 Initialization attempt ${this.initializationAttempts} ===`);
    console.log('NYLA System: Checking dependencies...');

    // Check required dependencies
    const dependencies = this.checkDependencies();
    const missingDeps = Object.entries(dependencies).filter(([_, available]) => !available);
    
    if (missingDeps.length > 0) {
      console.error('NYLA System: Missing dependencies:', missingDeps.map(([dep]) => dep));
      if (this.initializationAttempts < this.maxAttempts) {
        console.log('NYLA System: Retrying in 1 second...');
        setTimeout(() => this.initialize(), 1000);
        return;
      } else {
        this.showErrorMessage('Missing required dependencies');
        return;
      }
    }

    console.log('NYLA System: ✅ All dependencies available');

    // Initialize V2 system
    const success = await this.initializeV2System();
    if (success) {
      this.isInitialized = true;
      console.log('NYLA System: ✅ V2 system initialized successfully');
      
      // Start preloading WebLLM engine in background for faster first response
      this.preloadLLMEngine();
    } else if (this.initializationAttempts < this.maxAttempts) {
      console.log('NYLA System: Retrying initialization...');
      setTimeout(() => this.initialize(), 1000);
    } else {
      console.error('NYLA System: All initialization attempts failed');
      this.showErrorMessage('System initialization failed after multiple attempts');
    }
  }

  /**
   * Check all required dependencies
   */
  checkDependencies() {
    const deps = {
      NYLAAssistantV2: typeof window.NYLAAssistantV2 !== 'undefined',
      NYLAConversationManagerV2: typeof window.NYLAConversationManagerV2 !== 'undefined',
      NYLAAssistantUIV2: typeof window.NYLAAssistantUIV2 !== 'undefined',
      NYLAKnowledgeBase: typeof window.NYLAKnowledgeBase !== 'undefined',
      NYLALLMEngine: typeof window.NYLALLMEngine !== 'undefined',
      NYLAWebFetcher: typeof window.NYLAWebFetcher !== 'undefined'
    };

    // Log dependency status
    Object.entries(deps).forEach(([dep, available]) => {
      console.log(`NYLA System: ${dep}: ${available ? '✅ Available' : '❌ Missing'}`);
    });

    return deps;
  }

  /**
   * Initialize V2 system
   */
  async initializeV2System() {
    try {
      console.log('NYLA System: Creating V2 assistant...');
      
      if (typeof NYLAAssistantV2 === 'undefined') {
        throw new Error('NYLAAssistantV2 not available');
      }

      this.assistant = new NYLAAssistantV2();
      console.log('NYLA System: Calling assistant.initialize()...');
      
      const success = await this.assistant.initialize();
      
      if (success) {
        console.log('NYLA System: ✅ V2 assistant initialized');
        
        // Set up global references for backward compatibility
        window.nylaAssistant = this.assistant;
        window.getNYLAAssistant = () => this.assistant;
        
        return true;
      } else {
        console.error('NYLA System: ❌ V2 assistant initialization returned false');
        return false;
      }
      
    } catch (error) {
      console.error('NYLA System: ❌ V2 initialization failed:', error);
      console.error('NYLA System: Error stack:', error.stack);
      return false;
    }
  }

  /**
   * Show error message to user
   */
  showErrorMessage(reason = 'Unknown error') {
    const nylaTab = document.getElementById('nylaTab');
    if (nylaTab) {
      nylaTab.innerHTML = `
        <div class="nyla-error-container">
          <div class="nyla-error-message">
            <h3>🤖 NYLA Assistant Unavailable</h3>
            <p>Sorry! NYLA is having trouble starting up.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <details style="margin-top: 12px;">
              <summary style="cursor: pointer; color: #FF6B35;">Browser Requirements</summary>
              <div style="margin-top: 8px; font-size: 14px; color: #888;">
                <p>NYLA requires a modern browser with:</p>
                <ul style="margin: 8px 0; padding-left: 20px;">
                  <li>WebAssembly support</li>
                  <li>ES2022 features</li>
                  <li>WebWorker support</li>
                  <li>At least 4GB available RAM</li>
                </ul>
              </div>
            </details>
            <button onclick="location.reload()" class="nyla-retry-btn" style="margin-top: 16px;">🔄 Retry</button>
          </div>
        </div>
      `;
    }
  }

  /**
   * Preload WebLLM engine in background for faster first response
   */
  async preloadLLMEngine() {
    try {
      console.log('NYLA System: 🚀 Starting WebLLM preload in background...');
      console.log('NYLA System: 💡 Users can continue using PWA while engine loads');
      
      // Get the LLM engine from the assistant and start preloading
      if (this.assistant && this.assistant.conversationManager && this.assistant.conversationManager.llmEngine) {
        // Start preload without awaiting - let it run in background
        this.assistant.conversationManager.llmEngine.preloadInitialize().then(() => {
          console.log('NYLA System: ✅ WebLLM preload completed - first click will be fast!');
        }).catch((error) => {
          console.log('NYLA System: ⚠️ WebLLM preload failed (fallback will still work):', error.message);
        });
      } else {
        console.log('NYLA System: ⚠️ Cannot preload - LLM engine not available');
      }
    } catch (error) {
      console.warn('NYLA System: Preload failed:', error.message);
      // Don't throw - preload failure shouldn't break the system
    }
  }

  /**
   * Show iOS-specific message explaining why NYLA is disabled
   */
  showIOSMessage() {
    const nylaTab = document.getElementById('nylaTab');
    if (nylaTab) {
      nylaTab.innerHTML = `
        <div class="nyla-ios-container">
          <div class="nyla-ios-message">
            <h3>🍎 NYLA on iOS</h3>
            <p>NYLA AI assistant is currently unavailable on iOS devices.</p>
            <div class="ios-explanation">
              <p><strong>Why?</strong></p>
              <ul style="margin: 8px 0; padding-left: 20px; text-align: left;">
                <li>NYLA requires WebGPU for AI processing</li>
                <li>iOS Safari doesn't yet support WebGPU</li>
                <li>CPU-only processing would be too slow</li>
              </ul>
            </div>
            <div class="ios-alternatives">
              <p><strong>You can still:</strong></p>
              <ul style="margin: 8px 0; padding-left: 20px; text-align: left;">
                <li>✅ Create transfer commands (Send tab)</li>
                <li>✅ Generate QR codes (Receive tab)</li>
                <li>✅ Access community features (Raid tab)</li>
              </ul>
            </div>
            <p style="margin-top: 16px; font-size: 14px; color: #888;">
              NYLA will be available on iOS when WebGPU support arrives! 🚀
            </p>
          </div>
        </div>
      `;
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    const status = {
      initialized: this.isInitialized,
      version: 'V2',
      assistant: !!this.assistant,
      attempts: this.initializationAttempts
    };
    
    // Add LLM engine status if available
    if (this.assistant && this.assistant.conversationManager && this.assistant.conversationManager.llmEngine) {
      status.llmEngine = this.assistant.conversationManager.llmEngine.getStatus();
    }
    
    return status;
  }

  /**
   * Get assistant instance
   */
  getAssistant() {
    return this.assistant;
  }
}

// Create global controller instance
const nylaSystemController = new NYLASystemController();

// Global error handler for NYLA system
window.addEventListener('error', (event) => {
  if (event.filename && event.filename.includes('nyla')) {
    console.error('NYLA System: Uncaught error in NYLA script:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.stack && event.reason.stack.includes('nyla')) {
    console.error('NYLA System: Unhandled promise rejection in NYLA:', event.reason);
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('NYLA System: DOM ready, starting initialization...');
    setTimeout(() => nylaSystemController.initialize(), 100);
  });
} else {
  console.log('NYLA System: DOM already ready, starting initialization...');
  setTimeout(() => nylaSystemController.initialize(), 100);
}

// Handle tab switching for NYLA tab
document.addEventListener('click', (e) => {
  if (e.target.getAttribute('data-tab') === 'nyla' && nylaSystemController.assistant) {
    nylaSystemController.assistant.onTabActivated();
  }
});

// Make globally available
window.nylaSystemController = nylaSystemController;
window.NYLASystemController = NYLASystemController;

// Development helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('NYLA System: Development helpers available');
  console.log('- window.nylaSystemController');
  console.log('- nylaSystemController.getStatus()');
  console.log('- nylaSystemController.getAssistant()');
}