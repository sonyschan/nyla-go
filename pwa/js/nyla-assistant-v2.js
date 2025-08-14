/**
 * NYLA AI Assistant V2 - Phase 2 Integration
 * Enhanced assistant with LLM capabilities and personal care features
 */

class NYLAAssistantV2 {
  constructor() {
    this.knowledgeBase = null;
    this.conversationManager = null;
    this.ui = null;
    this.isInitialized = false;
    this.initializationPromise = null;
    this.version = '2.0.0';
    
    // Phase 2 features
    this.llmEnabled = false;
    this.personalCareEnabled = true;
    this.features = {
      llm: false,
      timezone: false,
      personalCare: false,
      enhancedStickers: false
    };
  }

  /**
   * Initialize the NYLA Assistant V2 system
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
      console.log('NYLA Assistant V2: === Starting Phase 2 initialization ===');
      
      // Initialize structured knowledge base (RAG-based)
      console.log('NYLA Assistant V2: Step 1 - Loading structured KB from /pwa/kb directory...');
      try {
        if (typeof NYLAUtils !== 'undefined' && NYLAUtils.loadKnowledgeBase) {
          this.knowledgeBase = await NYLAUtils.loadKnowledgeBase();
          console.log('NYLA Assistant V2: ✅ Structured KB loaded:', Object.keys(this.knowledgeBase || {}).length, 'chunks');
        } else {
          throw new Error('NYLAUtils.loadKnowledgeBase not available');
        }
      } catch (error) {
        console.error('NYLA Assistant V2: ❌ Failed to load structured KB:', error);
        // Fallback compatibility interface
        this.knowledgeBase = {
          getStaticKnowledgeBase: () => ({ message: 'KB loading failed, using RAG fallback' }),
          getKnowledge: (topic) => {
            console.log(`NYLA Assistant V2: getKnowledge('${topic}') called - using RAG system instead`);
            return null;
          },
          topics: { transfers: true, qrCodes: true, blockchains: true },
          sources: {},
          lastUpdated: new Date().toISOString(),
          staticData: { message: 'Using structured KB via RAG system' }
        };
      }
      this.features.knowledgeBase = true;
      console.log('NYLA Assistant V2: ✅ Structured knowledge base ready (RAG-based)');
      
      // Initialize enhanced conversation manager V2
      console.log('NYLA Assistant V2: Step 2 - Setting up enhanced conversation manager...');
      if (typeof NYLAConversationManagerV2 === 'undefined') {
        throw new Error('NYLAConversationManagerV2 not available');
      }
      this.conversationManager = new NYLAConversationManagerV2(this.knowledgeBase);
      
      // Enhance with RAG capabilities for semantic search (replaces rule-based preprocessing)
      console.log('NYLA Assistant V2: Step 2a - Enhancing with RAG-based semantic search...');
      if (typeof enhanceConversationManagerWithRAG !== 'undefined') {
        this.conversationManager = enhanceConversationManagerWithRAG(this.conversationManager);
        console.log('NYLA Assistant V2: ✅ RAG integration enabled - all queries will use semantic search');
        this.features.rag = true;
      } else {
        console.warn('NYLA Assistant V2: ⚠️ RAG integration not available, using rule-based fallback');
        this.features.rag = false;
      }
      
      console.log('NYLA Assistant V2: Calling conversationManager.initialize()...');
      await this.conversationManager.initialize();
      console.log('NYLA Assistant V2: ✅ Conversation manager initialized');
      
      // Check which features are available
      console.log('NYLA Assistant V2: Step 3 - Checking feature availability...');
      this.checkFeatureAvailability();
      console.log('NYLA Assistant V2: ✅ Features checked:', this.features);
      
      // Initialize enhanced UI
      console.log('NYLA Assistant V2: Step 4 - Creating enhanced user interface...');
      if (typeof NYLAAssistantUIV2 === 'undefined') {
        throw new Error('NYLAAssistantUIV2 not available');
      }
      this.ui = new NYLAAssistantUIV2(this.conversationManager);
      
      // Set UI reference in conversation manager for engagement functionality
      this.conversationManager.setUI(this.ui);
      
      console.log('NYLA Assistant V2: Calling ui.initialize()...');
      await this.ui.initialize();
      console.log('NYLA Assistant V2: ✅ UI initialized');
      
      this.isInitialized = true;
      
      console.log('NYLA Assistant V2: ✅ Phase 2 initialization complete! 🧠✨');
      console.log('NYLA Assistant V2: Features enabled:', this.features);
      
      return true;
    } catch (error) {
      console.error('NYLA Assistant V2: ❌ Initialization failed:', error);
      console.error('NYLA Assistant V2: Error stack:', error.stack);
      this.showInitializationError(error);
      return false;
    }
  }


  /**
   * Check which Phase 2 features are available
   */
  checkFeatureAvailability() {
    // Check LLM availability
    this.features.llm = this.conversationManager.llmEngine && this.conversationManager.llmEngine.isReady();
    this.llmEnabled = this.features.llm;
    
    // Check timezone detection
    try {
      this.features.timezone = !!Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      this.features.timezone = false;
    }
    
    // Check personal care (always available in V2)
    this.features.personalCare = true;
    
    // Check enhanced stickers - disabled since we use RAG system now
    this.features.enhancedStickers = false;
    
    console.log('NYLA Assistant V2: Feature availability check complete');
  }

  /**
   * Show initialization error to user
   */
  showInitializationError(error) {
    const nylaTab = document.getElementById('nylaTab');
    if (nylaTab) {
      nylaTab.innerHTML = `
        <div class="nyla-error-container">
          <div class="nyla-error-message">
            <h3>🤖 NYLA Assistant Unavailable</h3>
            <p>Sorry! I'm having trouble starting up right now.</p>
            <p>This might be due to browser compatibility or network issues.</p>
            <button onclick="location.reload()" class="nyla-retry-btn">🔄 Retry</button>
            <details style="margin-top: 16px;">
              <summary style="cursor: pointer; color: #FF6B35;">Technical Details</summary>
              <pre style="font-size: 12px; color: #888; margin-top: 8px;">${error.message}</pre>
            </details>
          </div>
        </div>
      `;
    }
  }

  /**
   * Handle personal care responses
   */
  async handlePersonalCareResponse(response, careType) {
    if (this.conversationManager.handlePersonalCareResponse) {
      const careResponse = this.conversationManager.handlePersonalCareResponse(response, careType);
      
      // Display the care response
      if (this.ui && this.ui.displayMessage) {
        await this.ui.displayMessage(careResponse, 'nyla');
        
        // Show appropriate sticker for personal care
        const sticker = this.conversationManager.selectSticker(careResponse.sentiment);
        if (sticker) {
          this.ui.showSticker(sticker);
        }
        
        // Continue with original conversation context
        setTimeout(() => {
          const contextQuestions = this.conversationManager.generateWelcomeQuestions();
          this.ui.displayQuestions(contextQuestions);
        }, 1500);
      }
      
      return careResponse;
    }
    
    return null;
  }

  /**
   * Enhanced status check
   */
  isReady() {
    return this.isInitialized && this.ui && this.conversationManager && this.knowledgeBase;
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    const baseStatus = {
      version: this.version,
      initialized: this.isInitialized,
      ready: this.isReady(),
      features: this.features,
      llmEnabled: this.llmEnabled,
      personalCareEnabled: this.personalCareEnabled
    };

    if (this.conversationManager) {
      baseStatus.conversation = this.conversationManager.getStats();
    }

    if (this.knowledgeBase) {
      baseStatus.knowledgeBase = {
        sources: Object.keys(this.knowledgeBase.sources).length,
        lastUpdated: this.knowledgeBase.lastUpdated,
        stickersAvailable: false // RAG system doesn't use legacy stickers
      };
    }

    return baseStatus;
  }

  /**
   * Enhanced statistics with Phase 2 metrics
   */
  getStats() {
    const baseStats = this.getSystemStatus();
    
    if (this.conversationManager && this.conversationManager.userProfile) {
      baseStats.userProfile = {
        timezone: this.conversationManager.userProfile.timezone,
        localTime: this.conversationManager.userProfile.localTime,
        interests: this.conversationManager.userProfile.interests,
        totalConversations: this.conversationManager.userProfile.totalConversations,
        sessionDuration: Date.now() - this.conversationManager.userProfile.sessionStart,
        personalCarePreferences: this.conversationManager.userProfile.personalCarePreferences
      };
    }
    
    return baseStats;
  }

  /**
   * Force refresh knowledge base
   */
  async refreshKnowledgeBase() {
    if (!this.knowledgeBase) return false;
    
    try {
      console.log('NYLA Assistant V2: Refreshing knowledge base...');
      await this.knowledgeBase.fetchAllSources();
      console.log('NYLA Assistant V2: Knowledge base refreshed successfully');
      return true;
    } catch (error) {
      console.error('NYLA Assistant V2: Knowledge base refresh failed', error);
      return false;
    }
  }

  /**
   * Toggle personal care features
   */
  togglePersonalCare(enabled) {
    this.personalCareEnabled = enabled;
    
    if (this.conversationManager && this.conversationManager.userProfile) {
      this.conversationManager.userProfile.personalCarePreferences.likesPersonalQuestions = enabled;
      this.conversationManager.userProfile.personalCarePreferences.preferredFrequency = enabled ? 0.2 : 0;
      this.conversationManager.saveToStorage();
    }
    
    console.log(`NYLA Assistant V2: Personal care ${enabled ? 'enabled' : 'disabled'}`);
    return enabled;
  }

  /**
   * Export enhanced data for debugging
   */
  exportData() {
    if (!this.isReady()) return null;
    
    const data = {
      timestamp: new Date().toISOString(),
      version: this.version,
      systemStatus: this.getSystemStatus(),
      stats: this.getStats(),
      conversationHistory: this.conversationManager.conversationHistory,
      userProfile: this.conversationManager.userProfile,
      personalCareState: this.conversationManager.personalCareState,
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
    a.download = `nyla-assistant-v2-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Reset V2 assistant data
   */
  resetAssistant() {
    if (!confirm('Are you sure you want to reset NYLA Assistant V2? This will clear all conversation history, preferences, and personal care data.')) {
      return false;
    }
    
    try {
      // Clear V2 localStorage
      localStorage.removeItem('nyla_knowledge_base');
      localStorage.removeItem('nyla_kb_timestamps');
      localStorage.removeItem('nyla_conversation_history_v2');
      localStorage.removeItem('nyla_user_profile_v2');
      localStorage.removeItem('nyla_personal_care_state');
      localStorage.removeItem('nyla_asked_questions_v2');
      
      // Also clear V1 data for clean slate
      localStorage.removeItem('nyla_conversation_history');
      localStorage.removeItem('nyla_user_profile');
      localStorage.removeItem('nyla_asked_questions');
      
      // Reload page to reinitialize
      location.reload();
      
      return true;
    } catch (error) {
      console.error('NYLA Assistant V2: Reset failed', error);
      return false;
    }
  }

  /**
   * Handle tab activation with enhanced features
   */
  onTabActivated() {
    if (this.ui) {
      this.ui.onTabActivated();
    }
    
    // Update user activity for personal care timing
    if (this.conversationManager && this.conversationManager.userProfile) {
      this.conversationManager.userProfile.localTime = this.conversationManager.getLocalTime();
    }
  }

  /**
   * Get version info with Phase 2 details
   */
  getVersion() {
    return {
      assistant: this.version,
      phase: 2,
      components: {
        knowledgeBase: '1.0.0',
        conversationV2: '2.0.0',
        llmEngine: '1.0.0',
        uiV2: '2.0.0'
      },
      features: this.features,
      buildDate: new Date().toISOString().split('T')[0],
      llmModel: this.llmEnabled ? 'Phi-3-mini-4k-instruct' : 'Rule-based'
    };
  }

  /**
   * Development and debugging methods
   */
  dev_simulatePersonalCare(type = 'mood') {
    if (!this.conversationManager) return;
    
    const careCheck = this.conversationManager.generatePersonalCareCheck();
    if (careCheck) {
      console.log('Simulated personal care check:', careCheck);
      return careCheck;
    }
    
    // Force a care check for testing
    const mockCheck = {
      type: type,
      message: type === 'mood' ? 'How are you feeling today? 😊' : 'Did you have lunch yet? 🍽️'
    };
    
    console.log('Mock personal care check:', mockCheck);
    return mockCheck;
  }

  dev_testLLM(message = "Hello NYLA!") {
    if (this.conversationManager && this.conversationManager.llmEngine) {
      return this.conversationManager.llmEngine.generateResponse(message, {
        timezone: 'America/New_York',
        localTime: new Date().toISOString()
      });
    }
    return Promise.reject('LLM not available');
  }
}

// Global instance for V2
let nylaAssistantV2 = null;

/**
 * Initialize NYLA Assistant V2 when DOM is ready
 */
function initializeNYLAAssistantV2() {
  if (nylaAssistantV2) return nylaAssistantV2.initialize();
  
  nylaAssistantV2 = new NYLAAssistantV2();
  return nylaAssistantV2.initialize();
}

/**
 * Get global NYLA Assistant V2 instance
 */
function getNYLAAssistantV2() {
  return nylaAssistantV2;
}

// Auto-initialization is now handled by NYLASystemController

// Handle tab switching for V2
document.addEventListener('click', (e) => {
  if (e.target.getAttribute('data-tab') === 'nyla' && nylaAssistantV2) {
    nylaAssistantV2.onTabActivated();
  }
});

// Make globally available for tab switching integration
window.nylaAssistantV2 = nylaAssistantV2;
window.initializeNYLAAssistantV2 = initializeNYLAAssistantV2;
window.getNYLAAssistantV2 = getNYLAAssistantV2;

// Maintain backward compatibility - these will be set by the system controller
// window.nylaAssistant = nylaAssistantV2;
// window.initializeNYLAAssistant = initializeNYLAAssistantV2;
// window.getNYLAAssistant = getNYLAAssistantV2;

// Development helpers (only in development mode)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('NYLA Assistant V2: Development helpers available');
  console.log('- window.nylaAssistantV2');
  console.log('- window.initializeNYLAAssistantV2()');
  console.log('- window.getNYLAAssistantV2()');
  console.log('- nylaAssistantV2.dev_simulatePersonalCare()');
  console.log('- nylaAssistantV2.dev_testLLM()');
}

// Make globally available
window.NYLAAssistantV2 = NYLAAssistantV2;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NYLAAssistantV2,
    initializeNYLAAssistantV2,
    getNYLAAssistantV2
  };
}