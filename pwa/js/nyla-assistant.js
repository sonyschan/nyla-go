/**
 * NYLA AI Assistant - Main Integration
 * Coordinates knowledge base, conversation manager, and UI
 */

class NYLAAssistant {
  constructor() {
    this.knowledgeBase = null;
    this.conversationManager = null;
    this.ui = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize the NYLA Assistant system
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  async _performInitialization() {
    try {
      console.log('NYLA Assistant: Starting initialization...');
      
      // Initialize knowledge base
      console.log('NYLA Assistant: Loading knowledge base...');
      this.knowledgeBase = new NYLAKnowledgeBase();
      await this.knowledgeBase.initialize();
      
      // Initialize conversation manager
      console.log('NYLA Assistant: Setting up conversation manager...');
      this.conversationManager = new NYLAConversationManager(this.knowledgeBase);
      await this.conversationManager.initialize();
      
      // Initialize UI
      console.log('NYLA Assistant: Creating user interface...');
      this.ui = new NYLAAssistantUI(this.conversationManager);
      await this.ui.initialize();
      
      this.isInitialized = true;
      console.log('NYLA Assistant: Initialization complete! 🤖✨');
      
      return true;
    } catch (error) {
      console.error('NYLA Assistant: Initialization failed', error);
      this.showInitializationError(error);
      return false;
    }
  }

  /**
   * Show initialization error to user
   */
  showInitializationError(error) {
    // Create basic error UI if full initialization failed
    const nylaTab = document.getElementById('nylaTab');
    if (nylaTab) {
      nylaTab.innerHTML = `
        <div class="nyla-error-container">
          <div class="nyla-error-message">
            <h3>🤖 NYLA Assistant Unavailable</h3>
            <p>Sorry! I'm having trouble starting up right now.</p>
            <p>Please try refreshing the page or check back later.</p>
            <button onclick="location.reload()" class="nyla-retry-btn">🔄 Retry</button>
          </div>
        </div>
      `;
    }
  }

  /**
   * Check if assistant is ready
   */
  isReady() {
    return this.isInitialized && this.ui && this.conversationManager && this.knowledgeBase;
  }

  /**
   * Force refresh knowledge base
   */
  async refreshKnowledgeBase() {
    if (!this.knowledgeBase) return false;
    
    try {
      console.log('NYLA Assistant: Refreshing knowledge base...');
      await this.knowledgeBase.fetchAllSources();
      console.log('NYLA Assistant: Knowledge base refreshed successfully');
      return true;
    } catch (error) {
      console.error('NYLA Assistant: Knowledge base refresh failed', error);
      return false;
    }
  }

  /**
   * Get assistant statistics
   */
  getStats() {
    if (!this.isReady()) return null;
    
    return {
      conversations: this.conversationManager.getStats(),
      knowledgeBase: {
        sources: Object.keys(this.knowledgeBase.sources).length,
        lastUpdated: this.knowledgeBase.lastUpdated,
        status: 'ready'
      },
      ui: {
        initialized: !!this.ui,
        tabActive: document.querySelector('[data-tab="nyla"]')?.classList.contains('active') || false
      }
    };
  }

  /**
   * Export all data for debugging
   */
  exportData() {
    if (!this.isReady()) return null;
    
    const data = {
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      conversationHistory: this.conversationManager.conversationHistory,
      userProfile: this.conversationManager.userProfile,
      knowledgeBase: {
        sources: this.knowledgeBase.sources,
        lastUpdated: this.knowledgeBase.lastUpdated,
        staticData: this.knowledgeBase.staticData
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `nyla-assistant-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Reset all assistant data
   */
  resetAssistant() {
    if (!confirm('Are you sure you want to reset NYLA Assistant? This will clear all conversation history and preferences.')) {
      return false;
    }
    
    try {
      // Clear localStorage
      localStorage.removeItem('nyla_knowledge_base');
      localStorage.removeItem('nyla_kb_timestamps');
      localStorage.removeItem('nyla_conversation_history');
      localStorage.removeItem('nyla_user_profile');
      localStorage.removeItem('nyla_asked_questions');
      
      // Reload page to reinitialize
      location.reload();
      
      return true;
    } catch (error) {
      console.error('NYLA Assistant: Reset failed', error);
      return false;
    }
  }

  /**
   * Handle tab activation
   */
  onTabActivated() {
    if (this.ui) {
      this.ui.onTabActivated();
    }
  }

  /**
   * Get version info
   */
  getVersion() {
    return {
      assistant: '1.0.0',
      components: {
        knowledgeBase: '1.0.0',
        conversation: '1.0.0',
        ui: '1.0.0'
      },
      buildDate: new Date().toISOString().split('T')[0]
    };
  }
}

// Global instance
let nylaAssistant = null;

/**
 * Initialize NYLA Assistant when DOM is ready
 */
function initializeNYLAAssistant() {
  if (nylaAssistant) return nylaAssistant.initialize();
  
  nylaAssistant = new NYLAAssistant();
  return nylaAssistant.initialize();
}

/**
 * Get global NYLA Assistant instance
 */
function getNYLAAssistant() {
  return nylaAssistant;
}

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNYLAAssistant);
} else {
  // DOM already loaded
  initializeNYLAAssistant();
}

// Handle tab switching
document.addEventListener('click', (e) => {
  if (e.target.getAttribute('data-tab') === 'nyla' && nylaAssistant) {
    nylaAssistant.onTabActivated();
  }
});

// Development helpers (only in development mode)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.nylaAssistant = nylaAssistant;
  window.initializeNYLAAssistant = initializeNYLAAssistant;
  window.getNYLAAssistant = getNYLAAssistant;
  
  console.log('NYLA Assistant: Development helpers available');
  console.log('- window.nylaAssistant');
  console.log('- window.initializeNYLAAssistant()');
  console.log('- window.getNYLAAssistant()');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NYLAAssistant,
    initializeNYLAAssistant,
    getNYLAAssistant
  };
}