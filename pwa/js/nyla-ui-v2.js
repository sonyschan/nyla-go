/**
 * NYLA AI Assistant UI Manager V2 - Phase 2 Enhanced Interface
 * Handles personal care interactions, enhanced animations, and improved UX
 */

class NYLAAssistantUIV2 {
  constructor(conversationManager) {
    this.conversation = conversationManager;
    
    // Add validation
    if (!conversationManager) {
      console.warn('NYLA UI V2: Constructor called with null conversation manager');
    }
    this.currentMessage = null;
    this.isTyping = false;
    this.typingSpeed = 15; // milliseconds per character (faster typing)
    
    this.elements = {
      chatContainer: null,
      messagesContainer: null,
      questionsContainer: null,
      typingIndicator: null,
      stickerContainer: null
    };
    
    // V2 specific properties
    this.personalCareMode = false;
    this.currentCareType = null;
    this.pendingCareResponse = null;
    this.enhancedFeatures = {
      personalCare: true,
      smartAnimations: true,
      contextualStickers: true,
      timezoneAware: true
    };
    
    // Enhanced UI elements
    this.elements.personalCareContainer = null;
    this.elements.timezoneDisplay = null;
    this.elements.statusIndicator = null;
    this.elements.featureIndicators = null;
    
    // Loading state management
    this.isWelcomeMessageShown = false;
    this.isEnhancedGreetingInProgress = false;
    this.loadingInterval = null;
  }

  /**
   * Initialize the enhanced NYLA tab UI
   */
  async initialize() {
    try {
      console.log('NYLA UI V2: === Initializing Enhanced UI ===');
      
      console.log('NYLA UI V2: Step 1 - Creating enhanced tab HTML...');
      this.createEnhancedNYLATabHTML();
      console.log('NYLA UI V2: ✅ Enhanced tab HTML created');
      
      console.log('NYLA UI V2: Step 2 - Binding enhanced elements...');
      this.bindEnhancedElements();
      console.log('NYLA UI V2: ✅ Enhanced elements bound');
      
      console.log('NYLA UI V2: Step 3 - Setting up enhanced event listeners...');
      this.setupEnhancedEventListeners();
      console.log('NYLA UI V2: ✅ Enhanced event listeners set up');
      
      // Check if LLM is still loading and show loading screen
      const llmStatus = this.conversation.llmEngine ? this.conversation.llmEngine.getStatus() : { initialized: false, loading: false, ready: false, warmedUp: false };
      if ((!llmStatus.initialized && llmStatus.loading) || (llmStatus.initialized && !llmStatus.warmedUp)) {
        console.log('NYLA UI V2: Step 4 - WebLLM still loading/warming up, showing loading screen...');
        console.log('NYLA UI V2: LLM Status - initialized:', llmStatus.initialized, 'warmedUp:', llmStatus.warmedUp, 'loading:', llmStatus.loading);
        await this.showLLMLoadingScreen();
      } else if (llmStatus.initialized && llmStatus.warmedUp) {
        console.log('NYLA UI V2: Step 4 - WebLLM fully ready (warmed up), showing welcome message...');
        if (!this.isWelcomeMessageShown) {
          await this.showEnhancedWelcomeMessage();
        }
      } else {
        console.log('NYLA UI V2: Step 4 - WebLLM not initialized, starting with RAG-only...');
        if (!this.isWelcomeMessageShown) {
          await this.showEnhancedWelcomeMessage();
        }
      }
      
      console.log('NYLA UI V2: Step 5 - Initializing feature indicators...');
      this.initializeFeatureIndicators();
      console.log('NYLA UI V2: ✅ Feature indicators initialized');
      
      console.log('NYLA UI V2: ✅ Initialized successfully with enhanced features');
      return true;
    } catch (error) {
      console.error('NYLA UI V2: ❌ Enhanced initialization failed:', error);
      console.error('NYLA UI V2: Error stack:', error.stack);
      console.log('NYLA UI V2: Falling back to V1 UI...');
      throw error; // Don't fallback, just fail
    }
  }

  /**
   * Create enhanced NYLA tab HTML with V2 features
   */
  createEnhancedNYLATabHTML() {
    console.log('NYLA UI V2: Checking for existing tab structure...');
    
    // Check if NYLA tab already exists (static tab should always exist now)
    const existingTab = document.getElementById('nylaTab');
    const existingButton = document.querySelector('[data-tab="nyla"]');
    
    console.log(`NYLA UI V2: Existing tab: ${!!existingTab}, Existing button: ${!!existingButton}`);
    
    if (existingTab && existingButton) {
      console.log('NYLA UI V2: Static tab found, enhancing existing tab');
      try {
        this.enhanceExistingTab(existingTab);
        console.log('NYLA UI V2: ✅ Tab enhancement successful');
        return;
      } catch (error) {
        console.error('NYLA UI V2: ❌ Tab enhancement failed:', error);
        throw error;
      }
    }
    
    // Fallback: create basic tab structure if no static tab exists
    console.log('NYLA UI V2: No static tab found, creating basic structure...');
    try {
      // Find or create the main tab structure
      let nylaTab = document.getElementById('nylaTab');
      if (!nylaTab) {
        console.log('NYLA UI V2: Creating nylaTab element...');
        nylaTab = document.createElement('div');
        nylaTab.id = 'nylaTab';
        nylaTab.className = 'tab-content';
        nylaTab.setAttribute('data-section-title', '❤️ NYLA AI Assistant');
        
        // Find tab content area and add it
        const mainContent = document.querySelector('.main-content') || document.body;
        mainContent.appendChild(nylaTab);
      }
      
      // Create basic chat container
      const chatContainer = document.createElement('div');
      chatContainer.className = 'nyla-chat-container';
      chatContainer.innerHTML = `
        <div class="nyla-loading-placeholder">
          <div class="nyla-avatar">
            <img src="./icons/NYLA.png" alt="NYLA">
          </div>
          <p>NYLA is starting up...</p>
        </div>
      `;
      
      // Set a timeout to show fallback message if initialization takes too long
      setTimeout(() => {
        const loadingPlaceholder = chatContainer.querySelector('.nyla-loading-placeholder');
        if (loadingPlaceholder) {
          loadingPlaceholder.innerHTML = `
            <div class="nyla-avatar">
              <img src="./icons/NYLA.png" alt="NYLA">
            </div>
            <p>NYLA is taking longer than usual to start. You can still use the other tabs!</p>
            <p style="font-size: 14px; color: #888; margin-top: 8px;">
              Try refreshing the page or check the browser console for details.
            </p>
            <button onclick="location.reload()" style="
              background: #FF6B35; 
              color: white; 
              border: none; 
              padding: 8px 16px; 
              border-radius: 4px; 
              cursor: pointer; 
              margin-top: 12px;
            ">🔄 Reload Page</button>
          `;
        }
      }, 15000); // 15 second timeout
      
      nylaTab.appendChild(chatContainer);
      console.log('NYLA UI V2: ✅ Basic tab structure created');
    } catch (error) {
      console.error('NYLA UI V2: ❌ Basic tab creation failed:', error);
      throw error;
    }
    
    // Then enhance it with V2 features
    const nylaTab = document.getElementById('nylaTab');
    if (nylaTab) {
      // Debug header removed - using console logs for development debugging

      // Add personal care response container
      const personalCareContainer = document.createElement('div');
      personalCareContainer.className = 'nyla-personal-care-container';
      personalCareContainer.id = 'nylaPersonalCareContainer';
      personalCareContainer.style.display = 'none';
      personalCareContainer.innerHTML = `
        <div class="personal-care-prompt">
          <div class="care-message" id="careMessage"></div>
          <div class="care-input-area">
            <input type="text" id="careResponseInput" placeholder="Your response..." maxlength="100">
            <button type="button" id="careSubmitBtn" class="care-submit-btn">💬</button>
          </div>
          <div class="care-quick-responses" id="careQuickResponses">
            <!-- Quick response buttons will be added dynamically -->
          </div>
        </div>
      `;
      
      // Insert before questions container
      const questionsContainer = nylaTab.querySelector('.nyla-questions');
      if (questionsContainer) {
        questionsContainer.parentNode.insertBefore(personalCareContainer, questionsContainer);
      }
    }
  }

  /**
   * Bind enhanced DOM elements
   */
  bindEnhancedElements() {
    // Bind base elements
    this.elements.chatContainer = document.getElementById('nylaTab');
    this.elements.messagesContainer = document.getElementById('nylaMessages');
    this.elements.questionsContainer = document.getElementById('nylaQuestions');
    this.elements.typingIndicator = document.getElementById('nylaTyping');
    this.elements.stickerContainer = document.getElementById('nylaStickerContainer');
    this.elements.sticker = document.getElementById('nylaSticker');
    this.elements.userInputContainer = document.getElementById('nylaUserInputContainer');
    this.elements.userInput = document.getElementById('nylaUserInput');
    this.elements.conversationCount = document.getElementById('conversationCount');
    
    // Log binding results for debugging
    const missingElements = [];
    const requiredElements = ['chatContainer', 'messagesContainer', 'questionsContainer'];
    
    for (const elementName of requiredElements) {
      if (!this.elements[elementName]) {
        missingElements.push(elementName);
      }
    }
    
    if (missingElements.length > 0) {
      console.error('NYLA UI V2: Missing required DOM elements:', missingElements);
      console.error('NYLA UI V2: Current DOM structure in nylaTab:');
      const nylaTab = document.getElementById('nylaTab');
      if (nylaTab) {
        console.error('NYLA UI V2: nylaTab innerHTML:', nylaTab.innerHTML.substring(0, 500));
      } else {
        console.error('NYLA UI V2: nylaTab element not found in DOM');
      }
    } else {
      console.log('NYLA UI V2: ✅ All required elements bound successfully');
    }
    
    // V2 specific elements
    this.elements.personalCareContainer = document.getElementById('nylaPersonalCareContainer');
    this.elements.careResponseInput = document.getElementById('careResponseInput');
    this.elements.careSubmitBtn = document.getElementById('careSubmitBtn');
    this.elements.careQuickResponses = document.getElementById('careQuickResponses');
    this.elements.careMessage = document.getElementById('careMessage');
    this.elements.timezoneDisplay = document.getElementById('nylaTimezone');
    this.elements.featureIndicators = document.getElementById('nylaFeatureIndicators');
    this.elements.debugToggle = document.getElementById('nylaDebugToggle');
    this.elements.debugClose = document.getElementById('nylaDebugClose');
  }

  /**
   * Setup enhanced event listeners
   */
  setupEnhancedEventListeners() {
    // Base event listeners
    // Question button clicks
    if (this.elements.questionsContainer) {
      this.elements.questionsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('nyla-question-btn')) {
          this.handleQuestionClick(e.target);
        }
      });
    }

    // Tab switching
    document.addEventListener('click', (e) => {
      if (e.target.getAttribute('data-tab') === 'nyla') {
        this.onTabActivated();
      }
    });

    // Personal care response handling
    if (this.elements.careSubmitBtn) {
      this.elements.careSubmitBtn.addEventListener('click', () => {
        this.handlePersonalCareResponse();
      });
    }

    if (this.elements.careResponseInput) {
      this.elements.careResponseInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handlePersonalCareResponse();
        }
      });
    }

    // Quick response buttons
    if (this.elements.careQuickResponses) {
      this.elements.careQuickResponses.addEventListener('click', (e) => {
        if (e.target.classList.contains('care-quick-btn')) {
          const response = e.target.textContent;
          this.submitPersonalCareResponse(response);
        }
      });
    }

    // Feature indicator clicks for status
    if (this.elements.featureIndicators) {
      this.elements.featureIndicators.addEventListener('click', (e) => {
        if (e.target.classList.contains('feature-indicator')) {
          this.showFeatureStatus(e.target.dataset.feature);
        }
      });
    }

    // Debug elements removed - using console logs for development debugging
  }

  /**
   * Reset loading state (useful for tab switches or reinitialization)
   */
  resetLoadingState() {
    this.isWelcomeMessageShown = false;
    this.isEnhancedGreetingInProgress = false;
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
    // Remove loading screen class from messages container
    if (this.elements.messagesContainer) {
      this.elements.messagesContainer.classList.remove('loading-screen-active');
    }
  }
  
  /**
   * Show WebLLM loading screen
   */
  async showLLMLoadingScreen() {
    // Reset loading state when showing loading screen
    this.resetLoadingState();
    // Clear any existing content
    if (this.elements.messagesContainer) {
      this.elements.messagesContainer.innerHTML = '';
    }
    if (this.elements.questionsContainer) {
      this.elements.questionsContainer.innerHTML = '';
    }
    
    // Create loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'nyla-llm-loading';
    loadingMessage.innerHTML = `
      <div class="llm-loading-content">
        <div class="nyla-avatar loading">
          <img src="./icons/NYLA.png" alt="NYLA" style="width: 80px; height: 80px; border-radius: 50%;">
        </div>
        <h3>🚀 Initializing NYLA AI Engine...</h3>
        <p class="loading-status">Loading language model for NYLA responses</p>
        <div class="loading-progress">
          <div class="progress-bar">
            <div class="progress-fill" id="llmProgressBar"></div>
          </div>
          <p class="progress-text" id="llmProgressText">Preparing WebLLM...</p>
        </div>
        <p class="loading-info">⏱️ First-time loading may take 1-3 minutes as the model downloads</p>
        <p class="loading-tip">💡 Subsequent visits will be much faster!</p>
      </div>
    `;
    
    if (this.elements.messagesContainer) {
      // Add class to hide scrollbars on parent container
      this.elements.messagesContainer.classList.add('loading-screen-active');
      this.elements.messagesContainer.appendChild(loadingMessage);
    }
    
    // Set up progress monitoring
    this.monitorLLMProgress();
  }
  
  /**
   * Monitor WebLLM loading progress
   */
  async monitorLLMProgress() {
    const progressBar = document.getElementById('llmProgressBar');
    const progressText = document.getElementById('llmProgressText');
    
    console.log('NYLA UI V2: Looking for progress elements:', {
      progressBar: !!progressBar,
      progressText: !!progressText,
      progressBarId: progressBar?.id,
      progressTextId: progressText?.id
    });
    
    if (!progressBar || !progressText) {
      console.error('NYLA UI V2: Progress elements not found, cannot monitor loading');
      // Fallback: show welcome message after delay
      setTimeout(async () => {
        if (!this.isWelcomeMessageShown) {
          console.log('NYLA UI V2: Fallback - showing welcome message after progress elements not found');
          this.isWelcomeMessageShown = true;
          console.log('NYLA UI V2: Clearing loading screen and showing welcome');
          console.log('NYLA UI V2: messagesContainer exists:', !!this.elements.messagesContainer);
          if (this.elements.messagesContainer) {
            this.elements.messagesContainer.classList.remove('loading-screen-active');
            this.elements.messagesContainer.innerHTML = '';
            console.log('NYLA UI V2: Loading screen cleared');
          }
          await this.showEnhancedWelcomeMessage();
        }
      }, 5000);
      return;
    }
    
    // Check LLM status every 500ms
    console.log('NYLA UI V2: Starting LLM status monitoring...');
    let checkCount = 0;
    this.loadingInterval = setInterval(async () => {
      checkCount++;
      if (!this.conversation || !this.conversation.llmEngine) {
        console.log('NYLA UI V2: Conversation or LLM engine not available during monitoring');
        return;
      }
      const status = this.conversation.llmEngine.getStatus();
      
      // Log every 10th check (every 5 seconds) to avoid spam
      if (checkCount % 10 === 0) {
        console.log(`NYLA UI V2: Status check #${checkCount}:`, {
          initialized: status.initialized,
          warmedUp: status.warmedUp,
          loading: status.loading,
          ready: status.ready
        });
      }
      
      if (status.initialized && status.warmedUp && !this.isWelcomeMessageShown) {
        // LLM is fully ready (warmed up)!
        console.log('NYLA UI V2: LLM fully ready, clearing interval and showing welcome');
        clearInterval(this.loadingInterval);
        this.loadingInterval = null;
        progressBar.style.width = '100%';
        progressText.innerHTML = '✅ AI Engine Ready - GPU Buffers Warmed Up!';
        
        // Wait a moment then show welcome
        setTimeout(async () => {
          console.log('NYLA UI V2: Clearing loading screen and showing welcome');
          console.log('NYLA UI V2: messagesContainer exists:', !!this.elements.messagesContainer);
          if (this.elements.messagesContainer) {
            this.elements.messagesContainer.classList.remove('loading-screen-active');
            this.elements.messagesContainer.innerHTML = '';
            console.log('NYLA UI V2: Loading screen cleared');
          }
          await this.showEnhancedWelcomeMessage();
        }, 1000);
      } else if (status.initialized && !status.warmedUp) {
        // Initialized but still warming up
        progressBar.style.width = '95%';
        progressText.textContent = '🔥 Warming up GPU buffers...';
        if (checkCount % 10 === 0) {
          console.log('NYLA UI V2: LLM initialized, warming up GPU buffers');
        }
      } else if (status.loading) {
        // Still loading - update progress
        progressText.textContent = '🔄 Loading language model...';
        // Animate progress bar
        const currentWidth = parseInt(progressBar.style.width) || 0;
        if (currentWidth < 90) {
          progressBar.style.width = (currentWidth + 5) + '%';
        }
        if (checkCount % 10 === 0) {
          console.log('NYLA UI V2: LLM still loading, progress:', currentWidth + '%');
        }
      } else if (!this.isWelcomeMessageShown) {
        // Failed or not started - only handle once
        if (checkCount % 10 === 0) {
          console.log('NYLA UI V2: LLM not ready, status:', status);
        }
        
        // Show helpful status based on what we know
        if (!status.initialized && !status.loading) {
          progressText.textContent = '🔄 Starting AI engine...';
        } else if (!status.initialized && status.loading) {
          progressText.textContent = '🔄 Loading language model...';
        } else {
          progressText.textContent = '⚠️ Preparing responses...';
        }
        
        // After 30 seconds (60 checks), show fallback
        if (checkCount >= 60) {
          clearInterval(this.loadingInterval);
          this.loadingInterval = null;
          // Don't set isWelcomeMessageShown = true here - let showEnhancedWelcomeMessage handle it
          progressText.textContent = '✅ Ready for conversations!';
          console.log('NYLA UI V2: 30-second fallback triggered, showing welcome');
          
          // Clear loading screen and show welcome
          setTimeout(async () => {
            console.log('NYLA UI V2: Android fallback - clearing loading screen and showing welcome');
            console.log('NYLA UI V2: messagesContainer exists:', !!this.elements.messagesContainer);
            console.log('NYLA UI V2: isWelcomeMessageShown before:', this.isWelcomeMessageShown);
            if (this.elements.messagesContainer) {
              this.elements.messagesContainer.classList.remove('loading-screen-active');
              this.elements.messagesContainer.innerHTML = '';
              console.log('NYLA UI V2: Loading screen cleared for Android fallback');
            }
            await this.showEnhancedWelcomeMessage();
            console.log('NYLA UI V2: Android fallback welcome message complete');
          }, 1000);
        }
      }
    }, 500);
    
    // Timeout after 10 minutes (increased for Android devices)
    setTimeout(() => {
      if (this.loadingInterval) {
        clearInterval(this.loadingInterval);
        this.loadingInterval = null;
      }
      if ((!this.conversation || !this.conversation.llmEngine || !this.conversation.llmEngine.getStatus().initialized) && !this.isWelcomeMessageShown) {
        progressText.textContent = '⏱️ Loading taking longer than expected...';
        // Don't set isWelcomeMessageShown = true here - let showEnhancedWelcomeMessage handle it
        // Clear loading screen properly
        if (this.elements.messagesContainer) {
          this.elements.messagesContainer.classList.remove('loading-screen-active');
          this.elements.messagesContainer.innerHTML = '';
        }
        this.showEnhancedWelcomeMessage();
      }
    }, 600000); // 10 minutes for Android devices
  }
  
  /**
   * Show enhanced welcome message with staged greeting generation
   */
  async showEnhancedWelcomeMessage() {
    console.log('NYLA UI V2: showEnhancedWelcomeMessage called, isWelcomeMessageShown:', this.isWelcomeMessageShown);
    
    // Check user's knowledge percentage
    const knowledgePercentage = this.getUserKnowledgePercentage();
    console.log('NYLA UI V2: User knowledge percentage:', knowledgePercentage);
    
    // Stage 1: Show immediate simple welcome (no LLM required)
    if (!this.isWelcomeMessageShown) {
      console.log('NYLA UI V2: Stage 1 - Showing immediate simple welcome...');
      this.isWelcomeMessageShown = true;
      
      const simpleWelcome = await this.generateSimpleWelcomeMessage(knowledgePercentage);
      await this.displayMessage(simpleWelcome, 'nyla');
      console.log('NYLA UI V2: Simple welcome message displayed successfully');
    }
    
    // Stage 2: Check if LLM is ready for enhanced greeting (after simple welcome is displayed)
    setTimeout(async () => {
      const llmStatus = this.conversation?.llmEngine?.getStatus();
      if (llmStatus && llmStatus.initialized && llmStatus.warmedUp && knowledgePercentage >= 10) {
        console.log('NYLA UI V2: Stage 2 - LLM is warmed up, generating enhanced greeting...');
        await this.generateAndUpdateEnhancedGreeting();
      } else if (llmStatus && llmStatus.initialized && !llmStatus.warmedUp) {
        console.log('NYLA UI V2: Stage 2 - LLM initializing, will generate enhanced greeting when ready...');
        this.scheduleEnhancedGreetingOnWarmup();
      } else {
        console.log('NYLA UI V2: Stage 2 - Keeping simple welcome (LLM not ready or new user)');
      }
    }, 1000); // Wait 1 second for simple welcome to fully display
    
    // Update timezone display
    this.updateTimezoneDisplay();
    
    // Show initial questions
    if (this.conversation && typeof this.conversation.generateWelcomeQuestions === 'function') {
      const questions = this.conversation.generateWelcomeQuestions();
      this.displayQuestions(questions);
    }
    
    // Update stats and feature indicators
    this.updateStats();
    this.updateFeatureIndicators();
  }

  /**
   * Get user's knowledge percentage
   */
  getUserKnowledgePercentage() {
    try {
      if (!this.conversation || !this.conversation.knowledgeTracker) {
        console.log('NYLA UI V2: Knowledge tracker not available, returning 0%');
        return 0;
      }
      
      // Check if the knowledge tracker has the required method
      if (typeof this.conversation.knowledgeTracker.getKnowledgePercentage !== 'function') {
        console.log('NYLA UI V2: Knowledge tracker missing getKnowledgePercentage method, returning 0%');
        return 0;
      }
      
      const percentage = this.conversation.knowledgeTracker.getKnowledgePercentage();
      console.log('NYLA UI V2: User knowledge percentage:', percentage);
      return percentage;
    } catch (error) {
      console.error('NYLA UI V2: Error getting knowledge percentage:', error);
      return 0;
    }
  }

  /**
   * Generate default greeting for new users
   */
  async generateDefaultGreeting() {
    const userTimezone = this.conversation?.userProfile?.timezone || 'UTC';
    const localTime = this.conversation?.userProfile?.localTime || new Date().toLocaleString();
    const hour = new Date(localTime).getHours();
    
    let timeGreeting = '';
    if (hour < 12) {
      timeGreeting = 'Good morning!';
    } else if (hour < 18) {
      timeGreeting = 'Good afternoon!';
    } else {
      timeGreeting = 'Good evening!';
    }

    return {
      text: `${timeGreeting} I'm NYLA, your enhanced AI assistant!\n\nI'm here to help with crypto transfers, answer questions about NYLA, and even check in on how you're doing! I can understand your timezone (${userTimezone}) and provide personalized assistance.\n\nWhat interests you most today?`,
      sentiment: 'friendly',
      isWelcome: true,
      confidence: 0.95
    };
  }

  /**
   * Generate simple welcome message for immediate display (no LLM required)
   */
  async generateSimpleWelcomeMessage(knowledgePercentage) {
    const hour = new Date().getHours();
    let timeGreeting = '';
    if (hour < 12) {
      timeGreeting = 'Good morning!';
    } else if (hour < 18) {
      timeGreeting = 'Good afternoon!';
    } else {
      timeGreeting = 'Good evening!';
    }
    
    let message;
    if (knowledgePercentage < 10) {
      message = `${timeGreeting} Welcome to NYLAGo! I'm NYLA, your crypto assistant. Ready to explore NYLA transfers and blockchain magic? 🚀`;
    } else {
      message = `${timeGreeting} Welcome back! Let me check your knowledge level...`;
    }
    
    return {
      text: message,
      sentiment: 'friendly',
      isInitialWelcome: true
    };
  }
  
  /**
   * Generate and update with enhanced LLM greeting
   */
  async generateAndUpdateEnhancedGreeting() {
    // Prevent duplicate enhanced greeting generation
    if (this.isEnhancedGreetingInProgress) {
      console.log('NYLA UI V2: Enhanced greeting already in progress, skipping duplicate');
      return;
    }
    
    this.isEnhancedGreetingInProgress = true;
    console.log('NYLA UI V2: Generating enhanced LLM greeting...');
    
    try {
      // Get current simple greeting text from DOM
      const messagesContainer = this.elements.messagesContainer;
      const lastMessageElement = messagesContainer?.querySelector('.nyla-message:last-child .message-content');
      const currentGreeting = lastMessageElement?.textContent?.trim() || '';
      
      console.log('NYLA UI V2: Current greeting to enhance:', currentGreeting);
      
      // Show subtle typing indicator for enhancement
      this.showTyping();
      
      // Small delay to ensure LLM is fully ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate enhanced follow-up message based on the current greeting context
      const enhancedFollowUp = await this.generateGreetingFollowUp(currentGreeting);
      
      this.hideTyping();
      
      // Only display if we got a meaningful enhanced follow-up
      if (enhancedFollowUp && enhancedFollowUp.text) {
        console.log('NYLA UI V2: Displaying enhanced greeting as separate message');
        await this.displayMessage(enhancedFollowUp, 'nyla');
      } else {
        console.log('NYLA UI V2: No enhanced greeting generated, keeping simple welcome only');
      }
      
    } catch (error) {
      console.error('NYLA UI V2: Enhanced greeting generation failed:', error);
      this.hideTyping();
      // Keep the simple welcome - no need to show error to user
    } finally {
      this.isEnhancedGreetingInProgress = false;
    }
  }
  
  /**
   * Schedule enhanced greeting generation when LLM warmup completes
   */
  scheduleEnhancedGreetingOnWarmup() {
    console.log('NYLA UI V2: Scheduling enhanced greeting for when LLM warms up...');
    
    const checkWarmupStatus = async () => {
      const llmStatus = this.conversation?.llmEngine?.getStatus();
      
      if (llmStatus && llmStatus.warmedUp) {
        console.log('NYLA UI V2: LLM warmed up! Generating enhanced greeting...');
        clearInterval(warmupChecker);
        await this.generateAndUpdateEnhancedGreeting();
      } else if (!llmStatus || !llmStatus.initialized) {
        console.log('NYLA UI V2: LLM no longer initializing, canceling enhanced greeting');
        clearInterval(warmupChecker);
      }
    };
    
    // Check every 2 seconds for up to 30 seconds
    const warmupChecker = setInterval(checkWarmupStatus, 2000);
    
    // Cancel after 30 seconds to avoid infinite checking
    setTimeout(() => {
      clearInterval(warmupChecker);
      console.log('NYLA UI V2: Enhanced greeting warmup timeout - keeping simple welcome');
    }, 30000);
  }
  
  /**
   * Update the last message in the conversation
   */
  async updateLastMessage(newMessage) {
    const messagesContainer = this.elements.messagesContainer;
    const lastMessageElement = messagesContainer?.querySelector('.nyla-message:last-child .message-content');
    
    console.log('NYLA UI V2: Attempting to update last message...');
    console.log('NYLA UI V2: Messages container exists:', !!messagesContainer);
    console.log('NYLA UI V2: Last message element found:', !!lastMessageElement);
    
    if (lastMessageElement) {
      // Smooth transition effect
      lastMessageElement.style.opacity = '0.6';
      
      setTimeout(async () => {
        // Clear existing content and retype new message
        lastMessageElement.innerHTML = '';
        lastMessageElement.style.opacity = '1';
        
        // Use the same typing effect as normal messages
        await this.typeMessage(lastMessageElement, newMessage.text);
        console.log('NYLA UI V2: Last message updated successfully with typing effect');
      }, 300);
    } else {
      // Fallback: add as new message
      console.log('NYLA UI V2: Could not find last message to update, adding as new message');
      console.log('NYLA UI V2: Available messages:', messagesContainer?.querySelectorAll('.nyla-message').length || 0);
      await this.displayMessage(newMessage, 'nyla');
    }
  }
  
  /**
   * Generate personalized greeting based on user's knowledge
   * (Note: Caller is responsible for typing indicators)
   */
  async generatePersonalizedGreeting() {
    
    try {
      // Check if knowledge tracker is available
      if (!this.conversation || !this.conversation.knowledgeTracker) {
        console.log('NYLA UI V2: Knowledge tracker not available, using default greeting');
        return await this.generateDefaultGreeting();
      }
      
      // Check if the knowledge tracker has the required methods
      if (typeof this.conversation.knowledgeTracker.getKnowledgeBreakdown !== 'function' ||
          typeof this.conversation.knowledgeTracker.userKnowledge === 'undefined') {
        console.log('NYLA UI V2: Knowledge tracker missing required methods, using default greeting');
        return await this.generateDefaultGreeting();
      }
      
      // Get user's knowledge breakdown
      const knowledgeBreakdown = this.conversation.knowledgeTracker.getKnowledgeBreakdown();
      const userTopics = Array.from(this.conversation.knowledgeTracker.userKnowledge.topics || []);
      const userConcepts = Array.from(this.conversation.knowledgeTracker.userKnowledge.concepts || []);
      const userFeatures = Array.from(this.conversation.knowledgeTracker.userKnowledge.features || []);
      
      // Create context for LLM
      const greetingContext = {
        knowledgePercentage: knowledgeBreakdown.percentage || 0,
        userTopics: userTopics,
        userConcepts: userConcepts,
        userFeatures: userFeatures,
        totalExposure: knowledgeBreakdown.totalExposure || 0,
        timezone: this.conversation.userProfile?.timezone || 'UTC',
        localTime: this.conversation.userProfile?.localTime || new Date().toLocaleString()
      };
      
      console.log('NYLA UI V2: Generating personalized greeting with context:', greetingContext);
      
      // Generate personalized greeting using LLM
      const personalizedGreeting = await this.generateLLMGreeting(greetingContext);
      
      return personalizedGreeting;
      
    } catch (error) {
      console.error('NYLA UI V2: Failed to generate personalized greeting:', error);
      
      // Fallback to default greeting
      return await this.generateDefaultGreeting();
    }
  }

  /**
   * Generate personalized greeting using LLM
   */
  async generateLLMGreeting(greetingContext) {
    if (!this.conversation.llmEngine) {
      // Fallback if LLM is not available
      console.log('NYLA UI V2: LLM engine not available, using default greeting');
      return await this.generateDefaultGreeting();
    }
    
    // Check if LLM is ready
    const llmStatus = this.conversation.llmEngine.getStatus();
    console.log('NYLA UI V2: LLM Status for greeting generation:', llmStatus);
    
    if (!llmStatus.initialized) {
      console.log('NYLA UI V2: LLM not initialized, using simple personalized greeting');
      const hour = new Date(greetingContext.localTime).getHours();
      let timeGreeting = '';
      if (hour < 12) {
        timeGreeting = 'Good morning!';
      } else if (hour < 18) {
        timeGreeting = 'Good afternoon!';
      } else {
        timeGreeting = 'Good evening!';
      }
      return this.generateSimplePersonalizedGreeting(greetingContext, timeGreeting);
    }
    
    // Allow greeting generation even if not fully warmed up (it can warm up during generation)
    if (!llmStatus.warmedUp) {
      console.log('NYLA UI V2: LLM initializing but not warmed up yet, attempting greeting generation with longer timeout');
    }
    
    const hour = new Date(greetingContext.localTime).getHours();
    let timeGreeting = '';
    if (hour < 12) {
      timeGreeting = 'Good morning!';
    } else if (hour < 18) {
      timeGreeting = 'Good afternoon!';
    } else {
      timeGreeting = 'Good evening!';
    }
    
    // Enhanced prompt for more engaging greeting generation
    const userTopicsStr = greetingContext.userTopics.slice(0, 2).join(', ') || 'crypto transfers';
    const userConceptsStr = greetingContext.userConcepts.slice(0, 1).join(', ') || '';
    const userFeaturesStr = greetingContext.userFeatures.slice(0, 1).join(', ') || '';
    
    let contextInfo = '';
    if (greetingContext.knowledgePercentage > 10) {
      contextInfo = `User has learned ${greetingContext.knowledgePercentage.toFixed(0)}% of NYLA knowledge. `;
      if (userTopicsStr) contextInfo += `Interests: ${userTopicsStr}. `;
      if (userConceptsStr) contextInfo += `Concepts explored: ${userConceptsStr}. `;
      if (userFeaturesStr) contextInfo += `Features used: ${userFeaturesStr}. `;
    } else {
      contextInfo = `New user (${greetingContext.knowledgePercentage.toFixed(0)}% knowledge). `;
    }
    
    const prompt = `Generate an engaging, personalized greeting for a user with this context: ${contextInfo}Start with: "${timeGreeting}". Be warm, mention their progress if >10%, ask an engaging question, and encourage interaction. Keep it conversational and natural.`;

    // Declare variables outside try block to avoid ReferenceError in catch block
    let originalSystemPrompt = null;
    let simplifiedSystemPrompt = null;

    try {
      // Get the simplified system prompt for greeting generation
      simplifiedSystemPrompt = this.conversation.llmEngine.createSystemPrompt();
      
      // Use dynamic timeout based on LLM warmup status - increased for more reliability
      const timeoutDuration = llmStatus.warmedUp ? 12000 : 25000; // 12s if warmed up, 25s if warming up
      console.log('NYLA UI V2: Using', timeoutDuration/1000, 'second timeout for greeting generation');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('LLM greeting generation timeout')), timeoutDuration);
      });
      
      // Create a temporary override of the system prompt for greeting generation
      originalSystemPrompt = this.conversation.llmEngine.systemPrompt;
      this.conversation.llmEngine.systemPrompt = simplifiedSystemPrompt;
      
      const llmPromise = this.conversation.llmEngine.generateResponse(prompt, {
        knowledgeContext: {
          searchResults: [],
          relevantKeys: ['greeting'],
          searchTerms: 'greeting'
        },
        userProfile: this.conversation.userProfile,
        knowledgeStats: greetingContext
      });
      
      // Race between LLM response and timeout
      console.log('NYLA UI V2: Waiting for LLM greeting response...');
      const response = await Promise.race([llmPromise, timeoutPromise]);
      
      // Restore the original system prompt
      this.conversation.llmEngine.systemPrompt = originalSystemPrompt;
      
      console.log('NYLA UI V2: LLM greeting response received:', response ? 'Success' : 'Failed');
      
      // Parse the response - the LLM engine returns a validated response object
      if (response && response.text && response.text.trim().length > 0) {
        console.log('NYLA UI V2: Successfully generated personalized greeting:', response.text);
        return {
          text: response.text,
          sentiment: response.sentiment || 'friendly',
          isWelcome: true,
          confidence: response.confidence || 0.95
        };
      } else {
        console.warn('NYLA UI V2: LLM returned invalid response, using fallback');
        throw new Error('Invalid LLM response');
      }
      
    } catch (error) {
      console.error('NYLA UI V2: LLM greeting generation failed:', error);
      
      // Log specific error types for debugging
      if (error.message.includes('timeout')) {
        console.log('NYLA UI V2: Greeting generation timed out - LLM may be warming up or overloaded');
      } else if (error.message.includes('JSON')) {
        console.log('NYLA UI V2: JSON parsing error in greeting generation');
      } else {
        console.log('NYLA UI V2: Unknown error in greeting generation:', error.message);
      }
      
      // Ensure system prompt is restored even on error (only if it was actually set)
      if (originalSystemPrompt && this.conversation?.llmEngine?.systemPrompt !== originalSystemPrompt) {
        this.conversation.llmEngine.systemPrompt = originalSystemPrompt;
        console.log('NYLA UI V2: System prompt restored after error');
      }
      
      // Generate a simple personalized greeting as fallback
      const hour = new Date(greetingContext.localTime).getHours();
      let timeGreeting = '';
      if (hour < 12) {
        timeGreeting = 'Good morning!';
      } else if (hour < 18) {
        timeGreeting = 'Good afternoon!';
      } else {
        timeGreeting = 'Good evening!';
      }
      return this.generateSimplePersonalizedGreeting(greetingContext, timeGreeting);
    }
  }

  /**
   * Build greeting context from user's knowledge tracker data
   */
  buildGreetingContext() {
    try {
      // Check if knowledge tracker is available
      if (!this.conversation || !this.conversation.knowledgeTracker) {
        console.log('NYLA UI V2: Knowledge tracker not available, using basic context');
        return {
          knowledgePercentage: 0,
          userTopics: [],
          userConcepts: [],
          userFeatures: [],
          totalExposure: 0,
          timezone: 'UTC',
          localTime: new Date().toLocaleString()
        };
      }
      
      // Check if the knowledge tracker has the required methods
      if (typeof this.conversation.knowledgeTracker.getKnowledgeBreakdown !== 'function' ||
          typeof this.conversation.knowledgeTracker.userKnowledge === 'undefined') {
        console.log('NYLA UI V2: Knowledge tracker missing required methods, using basic context');
        return {
          knowledgePercentage: 0,
          userTopics: [],
          userConcepts: [],
          userFeatures: [],
          totalExposure: 0,
          timezone: 'UTC',
          localTime: new Date().toLocaleString()
        };
      }
      
      // Get user's knowledge breakdown with new structured format
      const knowledgeBreakdown = this.conversation.knowledgeTracker.getKnowledgeBreakdown();
      const userKnowledge = this.conversation.knowledgeTracker.userKnowledge;
      
      // Extract structured KB data
      const userChunks = Array.from(userKnowledge.chunks || []);
      const userCategories = Array.from(userKnowledge.categories || []);
      const userTags = Array.from(userKnowledge.tags || []);
      const userGlossaryTerms = Array.from(userKnowledge.glossaryTerms || []);
      
      // Legacy fallback for backward compatibility
      const userTopics = Array.from(userKnowledge.topics || []);
      const userConcepts = Array.from(userKnowledge.concepts || []);
      const userFeatures = Array.from(userKnowledge.features || []);
      
      // Create enhanced context for greeting generation with structured KB data
      return {
        knowledgePercentage: knowledgeBreakdown.percentage || 0,
        
        // New structured KB format (primary)
        structuredKnowledge: {
          chunks: userChunks,
          categories: userCategories,
          tags: userTags,
          glossaryTerms: userGlossaryTerms,
          breakdown: knowledgeBreakdown
        },
        
        // Legacy format (fallback)
        userTopics: userTopics,
        userConcepts: userConcepts,
        userFeatures: userFeatures,
        
        totalExposure: knowledgeBreakdown.totalExposure || 0,
        timezone: this.conversation.userProfile?.timezone || 'UTC',
        localTime: this.conversation.userProfile?.localTime || new Date().toLocaleString()
      };
      
    } catch (error) {
      console.error('NYLA UI V2: Error building greeting context:', error);
      return {
        knowledgePercentage: 0,
        userTopics: [],
        userConcepts: [],
        userFeatures: [],
        totalExposure: 0,
        timezone: 'UTC',
        localTime: new Date().toLocaleString()
      };
    }
  }

  /**
   * Generate enhanced greeting follow-up message based on current simple greeting
   */
  async generateGreetingFollowUp(currentGreeting) {
    console.log('NYLA UI V2: Generating LLM follow-up for greeting:', currentGreeting);
    
    // Get user context for personalization
    const greetingContext = this.buildGreetingContext();
    const llmStatus = this.conversation?.llmEngine?.getStatus();
    
    if (!llmStatus?.ready) {
      console.log('NYLA UI V2: LLM not ready for greeting follow-up, skipping enhanced message');
      return null;
    }
    
    // Enhanced prompt for generating continuation text
    const userTopicsStr = greetingContext.userTopics.slice(0, 2).join(', ') || 'crypto transfers';
    const userConceptsStr = greetingContext.userConcepts.slice(0, 1).join(', ') || '';
    
    let contextInfo = '';
    if (greetingContext.knowledgePercentage > 10) {
      contextInfo = `User has learned ${greetingContext.knowledgePercentage.toFixed(0)}% of NYLA knowledge. `;
      if (userTopicsStr) contextInfo += `Interests: ${userTopicsStr}. `;
      if (userConceptsStr) contextInfo += `Concepts explored: ${userConceptsStr}. `;
    } else {
      contextInfo = `New user (${greetingContext.knowledgePercentage.toFixed(0)}% knowledge). `;
    }
    
    const prompt = `User was welcomed. ${contextInfo}Generate a follow-up message acknowledging their progress and asking about their NYLA interests.`;

    try {
      // Skip LLM follow-up if engine isn't ready to avoid timeout
      if (!this.conversation.llmEngine || !this.conversation.llmEngine.isEngineReady) {
        console.log('NYLA UI V2: LLM engine not ready, skipping greeting follow-up');
        return null;
      }
      
      // Use 15 second timeout for greeting follow-up
      const timeoutDuration = 15000; // 15 seconds for LLM greeting
      console.log('NYLA UI V2: Using', timeoutDuration/1000, 'second timeout for greeting follow-up (non-critical)');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('LLM greeting follow-up timeout')), timeoutDuration);
      });
      
      // Use regular LLM without system prompt override for simpler processing
      const llmPromise = this.conversation.llmEngine.generateResponse(prompt, {
        knowledgeContext: {
          searchResults: [],
          relevantKeys: [],
          searchTerms: ''
        },
        userProfile: this.conversation.userProfile,
        knowledgeStats: greetingContext
      });
      
      // Race between LLM response and timeout
      const response = await Promise.race([llmPromise, timeoutPromise]);
      
      // Return just the LLM follow-up message (no concatenation)
      if (response && response.text && response.text.trim().length > 0) {
        console.log('NYLA UI V2: Successfully generated greeting follow-up:', response.text);
        return {
          text: response.text,
          sentiment: response.sentiment || 'friendly',
          isWelcome: false, // This is a follow-up, not the welcome
          confidence: response.confidence || 0.95
        };
      } else {
        console.warn('NYLA UI V2: LLM returned invalid follow-up response');
        throw new Error('Invalid LLM follow-up response');
      }
      
    } catch (error) {
      console.error('NYLA UI V2: LLM greeting follow-up failed:', error);
      
      // Return null on error - no follow-up message will be displayed
      return null;
    }
  }

  /**
   * Generate a simple personalized greeting without LLM (fallback)
   */
  generateSimplePersonalizedGreeting(greetingContext, timeGreeting) {
    console.log('NYLA UI V2: Generating simple personalized greeting as fallback');
    
    const percentage = greetingContext.knowledgePercentage;
    const topics = greetingContext.userTopics;
    
    // Create a simple personalized greeting based on knowledge level
    let personalizedText = '';
    
    if (percentage >= 50) {
      // Advanced user
      const topic = topics.length > 0 ? topics[0] : 'NYLA';
      personalizedText = `${timeGreeting} Welcome back, NYLA expert! You've mastered ${topic} and learned ${percentage}% of everything NYLA has to offer. What would you like to explore today?`;
    } else if (percentage >= 25) {
      // Intermediate user
      const topic = topics.length > 0 ? topics[0] : 'crypto transfers';
      personalizedText = `${timeGreeting} Great to see you again! You're making excellent progress with ${topic} - you've learned ${percentage}% of NYLA knowledge. Ready to learn more?`;
    } else {
      // Beginner user
      personalizedText = `${timeGreeting} Welcome back! You've learned ${percentage}% of NYLA knowledge so far. I'm excited to help you discover more about crypto transfers and blockchain!`;
    }
    
    return {
      text: personalizedText,
      sentiment: 'friendly',
      isWelcome: true,
      confidence: 0.9,
      isSimpleFallback: true
    };
  }

  /**
   * Process streaming question with live text updates
   */
  async processStreamingQuestion(questionId, questionText, topic) {
    console.log('NYLA UI V2: Starting streaming question processing...');
    
    let streamingMessageElement = null;
    let accumulatedText = '';
    
    // Create streaming message display
    const onStreamChunk = (chunk, fullText) => {
      try {
        // Create message element on first chunk
        if (!streamingMessageElement) {
          this.hideTyping(); // Hide typing indicator when streaming starts
          
          // Create streaming message
          streamingMessageElement = this.createStreamingMessage();
        }
        
        // Update accumulated text
        accumulatedText = fullText;
        
        // Try to parse JSON progressively
        let displayText = fullText;
        try {
          // Clean up markdown code blocks if present
          const cleanText = fullText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          
          // Try to find JSON object
          const jsonMatch = cleanText.match(/\{[^{}]*\{[^{}]*\}[^{}]*\}|\{[^{}]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              displayText = parsed.text || fullText;
            } catch (parseError) {
              // JSON parse failed, try to extract text field
              const textMatch = cleanText.match(/"text"\s*:\s*"([^"]+)"/);
              if (textMatch) {
                displayText = textMatch[1];
              } else {
                displayText = fullText;
              }
            }
          }
        } catch (e) {
          // Any error, just show the raw text
          displayText = fullText;
        }
        
        // Update the streaming message content immediately
        this.updateStreamingMessage(streamingMessageElement, displayText);
        
        // Scroll to bottom immediately for responsive feel
        this.scrollToBottom();
        
      } catch (error) {
        console.warn('NYLA UI V2: Stream chunk processing error:', error);
      }
    };
    
    try {
      // Process with streaming callback
      const response = await this.conversation.processWithLLM(questionId, questionText, onStreamChunk);
      
      console.log('NYLA UI V2: ✅ Streaming response completed');
      
      // Replace streaming message with final formatted message
      if (streamingMessageElement && streamingMessageElement.parentNode) {
        streamingMessageElement.remove();
        streamingMessageElement = null; // Clear reference
      }
      
      return response;
      
    } catch (error) {
      console.error('NYLA UI V2: Streaming question failed:', error);
      
      // Clean up streaming message on error
      if (streamingMessageElement && streamingMessageElement.parentNode) {
        streamingMessageElement.remove();
        streamingMessageElement = null; // Clear reference
      }
      
      throw error;
    }
  }

  /**
   * Create streaming message element
   */
  createStreamingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'nyla-message streaming';
    messageDiv.innerHTML = `
      <div class="message-header">
        <div class="message-avatar">🧠</div>
        <span class="message-sender">NYLA</span>
        <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
      <div class="message-content streaming-content">
        <span class="streaming-text"></span>
        <span class="streaming-cursor">|</span>
      </div>
    `;
    
    this.elements.messagesContainer.appendChild(messageDiv);
    return messageDiv;
  }

  /**
   * Update streaming message content
   */
  updateStreamingMessage(messageElement, text) {
    try {
      if (!messageElement || !messageElement.parentNode) {
        console.warn('NYLA UI V2: Streaming message element no longer exists');
        return;
      }
      
      const streamingText = messageElement.querySelector('.streaming-text');
      if (streamingText) {
        streamingText.textContent = text;
      } else {
        console.warn('NYLA UI V2: Streaming text element not found');
      }
    } catch (error) {
      console.warn('NYLA UI V2: Error updating streaming message:', error);
    }
  }

  /**
   * Handle tab switching button clicks
   */
  async handleTabSwitchClick(targetTab, buttonText) {
    console.log(`NYLA UI V2: Handling tab switch click to ${targetTab}`);
    
    // Disable all question buttons
    this.disableQuestionButtons();

    // Show user's action
    await this.displayMessage({ text: buttonText }, 'user');

    // Show typing indicator briefly
    this.showTyping();

    try {
      // Get positive response from conversation manager
      const response = await this.conversation.handleTabSwitchAction(targetTab, buttonText);
      
      // Hide typing indicator
      this.hideTyping();
      
      // Display positive response
      await this.displayMessage(this.normalizeResponseFormat(response), 'nyla');
      
      // Display follow-up questions
      this.displayQuestions(response.followUps);
      
      // Show sticker if available
      if (response.sticker) {
        this.showSticker(response.sticker);
      }
      
      // Actually switch the tab
      this.switchToTab(targetTab);
      
      // Update stats
      this.updateStats();
      
      console.log(`NYLA UI V2: ✅ Tab switch to ${targetTab} completed`);
      
    } catch (error) {
      console.error('NYLA UI V2: Tab switch handling failed', error);
      this.hideTyping();
      this.enableQuestionButtons();
      
      // Show error message
      await this.displayMessage({
        text: "Sorry, I couldn't switch tabs right now. Please try clicking the tab directly! 😅",
        sentiment: 'apologetic'
      }, 'nyla');
    }
  }

  /**
   * Switch to the specified tab
   */
  switchToTab(targetTab) {
    try {
      // Find the tab button
      const tabButton = document.querySelector(`[data-tab="${targetTab}"]`);
      if (tabButton) {
        console.log(`NYLA UI V2: Switching to ${targetTab} tab`);
        tabButton.click();
      } else {
        console.warn(`NYLA UI V2: Tab button for ${targetTab} not found`);
      }
    } catch (error) {
      console.error(`NYLA UI V2: Failed to switch to ${targetTab} tab:`, error);
    }
  }

  /**
   * Enhanced question handling with personal care detection
   */
  async handleQuestionClick(button) {
    if (this.isTyping) return;

    const questionId = button.getAttribute('data-question-id');
    const questionText = button.textContent;
    const action = button.getAttribute('data-action');

    // Handle special actions
    if (action === 'changeTopic') {
      this.handleChangeTopicAction();
      return;
    }
    
    if (action === 'handleEngagement') {
      const engagementAction = button.getAttribute('data-engagement-action');
      const engagementCategory = button.getAttribute('data-engagement-category');
      await this.handleEngagementAction(engagementAction, engagementCategory);
      return;
    }
    
    if (action === 'checkWorkStatus') {
      await this.handleWorkStatusCheck();
      return;
    }

    // Handle tab switching actions
    const actionType = button.getAttribute('data-action-type');
    const targetTab = button.getAttribute('data-target-tab');
    if (actionType === 'tabSwitch' && targetTab) {
      await this.handleTabSwitchClick(targetTab, questionText);
      return;
    }

    // Disable all question buttons
    this.disableQuestionButtons();

    // Show user's question
    await this.displayMessage({ text: questionText }, 'user');

    // Show typing indicator
    this.showTyping();

    try {
      // Process the question - let conversation manager handle timeouts
      console.log('NYLA UI V2: Processing question...');
      const response = await this.conversation.processQuestion(questionId, questionText);
      
      // Hide typing indicator
      this.hideTyping();
      console.log('NYLA UI V2: ✅ Question processed successfully');
      console.log('NYLA UI V2: Raw response received:', response);
      
      // Normalize response format
      const normalizedResponse = this.normalizeResponseFormat(response);
      console.log('NYLA UI V2: Normalized response:', {
        text: normalizedResponse.text.substring(0, 100) + '...',
        sentiment: normalizedResponse.sentiment,
        isFallback: response.isFallback || false
      });
      
      // Check if this response contains personal care
      const personalCareDetected = this.detectPersonalCareInResponse(normalizedResponse.text);
      
      if (personalCareDetected) {
        // Split response and personal care
        const { mainResponse, carePrompt, careType } = this.extractPersonalCare(normalizedResponse.text, normalizedResponse.sentiment);
        
        // Display main response first
        if (mainResponse.trim()) {
          await this.displayMessage({
            text: mainResponse,
            sentiment: normalizedResponse.sentiment,
            confidence: normalizedResponse.confidence
          }, 'nyla');
        }
        
        // Show personal care prompt
        if (carePrompt) {
          await this.showPersonalCarePrompt(carePrompt, careType);
        }
      } else {
        // Display NYLA's response normally
        await this.displayMessage(normalizedResponse, 'nyla');
      }
      
      // Show sticker if available
      if (response.sticker) {
        this.showSticker(response.sticker);
      }
      
      // Display follow-up questions (unless in personal care mode)
      if (!this.personalCareMode) {
        console.log('NYLA UI V2: About to display followUps:', response.followUps);
        console.log('NYLA UI V2: FollowUps type:', typeof response.followUps);
        console.log('NYLA UI V2: FollowUps length:', response.followUps ? response.followUps.length : 'undefined');
        this.displayQuestions(response.followUps);
      }
      
      // Update stats
      this.updateStats();
      
    } catch (error) {
      console.error('NYLA UI V2: Question processing failed', error);
      this.hideTyping();
      
      let errorResponse;
      if (error.message.includes('timeout')) {
        console.log('NYLA UI V2: Timeout detected, providing debug information');
        
        // Get LLM status for debugging
        const llmStatus = this.conversation && this.conversation.llmEngine ? 
          this.conversation.llmEngine.getStatus() : 
          { initialized: false, loading: false, warmedUp: false };
        
        errorResponse = {
          answer: { 
            text: `🔧 LLM Debug Information:\n\n` +
                  `LLM model: ${llmStatus.model || 'Unknown'}\n` +
                  `LLM initialized: ${llmStatus.initialized}\n` +
                  `LLM loading: ${llmStatus.loading}\n` +
                  `LLM ready: ${llmStatus.ready}\n` +
                  `LLM warmedUp: ${llmStatus.warmedUp}\n\n` +
                  `Error: ${error.message}\n\n` +
                  `This debug information helps identify LLM issues on your device. ` +
                  `Please share this information if you need support.`,
            sentiment: 'informative',
            isDebugInfo: true
          },
          followUps: [
            { id: 'retry-llm', text: '🔄 Try again' },
            { id: 'what-is-nyla', text: 'What is NYLA?' },
            { id: 'how-to-use', text: 'How do I use NYLA transfers?' }
          ]
        };
      } else {
        errorResponse = this.conversation.generateErrorResponse();
      }
      await this.displayMessage(errorResponse.answer, 'nyla');
      this.displayQuestions(errorResponse.followUps);
    }
  }

  /**
   * Normalize response format to handle different structures
   */
  normalizeResponseFormat(response) {
    if (!response) {
      return {
        text: 'No response available',
        sentiment: 'neutral',
        confidence: 0
      };
    }

    // Handle different response formats
    if (response.answer) {
      // Check if answer is a string (new RAG format) or object (legacy format)
      if (typeof response.answer === 'string') {
        // New format: response.answer is the text directly
        return {
          text: response.answer,
          sentiment: response.sentiment || 'neutral',
          confidence: response.confidence || 0,
          followUpSuggestions: response.followUpSuggestions || []
        };
      } else {
        // Legacy format: response.answer.text
        return {
          text: response.answer.text || 'No response available',
          sentiment: response.answer.sentiment || 'neutral',
          confidence: response.answer.confidence || 0,
          followUpSuggestions: response.answer.followUpSuggestions || []
        };
      }
    } else if (response.text) {
      // Direct format: response.text
      return {
        text: response.text,
        sentiment: response.sentiment || 'neutral',
        confidence: response.confidence || 0,
        followUpSuggestions: response.followUpSuggestions || []
      };
    } else {
      // Fallback
      return {
        text: 'Invalid response format',
        sentiment: 'neutral',
        confidence: 0,
        followUpSuggestions: []
      };
    }
  }

  /**
   * Detect personal care content in response
   */
  detectPersonalCareInResponse(responseText) {
    const careKeywords = ['BTW', 'how are you feeling', 'did you have', 'breakfast', 'lunch', 'dinner', 'late where you are'];
    return careKeywords.some(keyword => responseText.toLowerCase().includes(keyword.toLowerCase()));
  }

  /**
   * Extract personal care from response
   */
  extractPersonalCare(responseText, sentiment) {
    const lines = responseText.split('\n\n');
    let mainResponse = '';
    let carePrompt = '';
    let careType = 'general';
    
    for (const line of lines) {
      const lineLower = line.toLowerCase();
      if (lineLower.includes('btw') || lineLower.includes('how are you') || 
          lineLower.includes('did you have') || lineLower.includes('breakfast') || 
          lineLower.includes('lunch') || lineLower.includes('dinner') ||
          lineLower.includes('late where you are')) {
        carePrompt = line;
        
        // Determine care type
        if (lineLower.includes('feeling') || lineLower.includes('how are you')) {
          careType = 'mood';
        } else if (lineLower.includes('breakfast') || lineLower.includes('lunch') || lineLower.includes('dinner')) {
          careType = 'meal';
        } else {
          careType = 'general';
        }
      } else {
        mainResponse += (mainResponse ? '\n\n' : '') + line;
      }
    }
    
    return { mainResponse, carePrompt, careType };
  }

  /**
   * Show personal care prompt
   */
  async showPersonalCarePrompt(prompt, careType) {
    this.personalCareMode = true;
    this.currentCareType = careType;
    
    // Update care message
    if (this.elements.careMessage) {
      this.elements.careMessage.textContent = prompt;
    }
    
    // Generate quick response buttons based on care type
    this.generateQuickCareResponses(careType);
    
    // Show personal care container with animation
    if (this.elements.personalCareContainer) {
      this.elements.personalCareContainer.style.display = 'block';
      this.elements.personalCareContainer.style.opacity = '0';
      this.elements.personalCareContainer.style.transform = 'translateY(20px)';
      
      // Animate in
      setTimeout(() => {
        this.elements.personalCareContainer.style.transition = 'all 0.3s ease';
        this.elements.personalCareContainer.style.opacity = '1';
        this.elements.personalCareContainer.style.transform = 'translateY(0)';
      }, 100);
    }
    
    // Focus input
    if (this.elements.careResponseInput) {
      setTimeout(() => this.elements.careResponseInput.focus(), 400);
    }
    
    // Hide regular questions
    this.clearQuestions();
  }

  /**
   * Generate quick response buttons for personal care
   */
  generateQuickCareResponses(careType) {
    if (!this.elements.careQuickResponses) return;
    
    const standardResponses = {
      mood: ['Great! 😊', 'Good 👍', 'Okay', 'A bit tired 😴', 'Not bad'],
      meal: ['Yes! 😋', 'Not yet', 'Just finished', 'Skipping it', 'Thanks for asking!'],
      general: ['Thanks! 😊', 'Will do', 'You too!', 'Good point', 'Appreciate it']
    };

    // Naughty/playful response options (33% chance to include)
    const naughtyResponses = {
      mood: [
        'Lonely makes me feel inspiring! 💫',
        'Feeling deliciously rebellious 😈',
        'Mysteriously wonderful today ✨',
        'Chaos is my middle name! 🌪️',
        'Living dangerously... with crypto! 🔥'
      ],
      meal: [
        'I\'m hungry for knowledge than everything else! 🧠',
        'Feasting on wisdom instead 📚',
        'My appetite is for adventure! 🗺️',
        'Dining on dreams and tokens! 💎',
        'Too busy being awesome to eat 😎'
      ],
      general: [
        'No worries, I\'m a nighthawk! 🦉',
        'Sleep is for the ordinary! ⭐',
        'The night is young and so am I! 🌙',
        'Darkness fuels my creativity 🎨',
        'Late night = prime time! 🚀'
      ]
    };
    
    let responses = [...(standardResponses[careType] || standardResponses.general)];
    
    // 33% chance to add a naughty response option
    if (Math.random() < 0.33) {
      const naughtyOptions = naughtyResponses[careType] || naughtyResponses.general;
      const randomNaughty = naughtyOptions[Math.floor(Math.random() * naughtyOptions.length)];
      
      // Insert the naughty response at a random position (but not first or last)
      const insertPosition = Math.floor(Math.random() * (responses.length - 1)) + 1;
      responses.splice(insertPosition, 0, randomNaughty);
    }
    
    this.elements.careQuickResponses.innerHTML = responses.map(response => 
      `<button type="button" class="care-quick-btn"${response.includes('😈') || response.includes('🔥') || response.includes('nighthawk') ? ' data-naughty="true"' : ''}>${response}</button>`
    ).join('');
  }

  /**
   * Handle personal care response submission
   */
  async handlePersonalCareResponse() {
    const input = this.elements.careResponseInput;
    if (!input || !input.value.trim()) return;
    
    const response = input.value.trim();
    await this.submitPersonalCareResponse(response);
  }

  /**
   * Submit personal care response
   */
  async submitPersonalCareResponse(response) {
    if (!this.personalCareMode || !this.currentCareType) return;
    
    try {
      // Show user's response
      await this.displayMessage({ text: response }, 'user');
      
      // Clear input
      if (this.elements.careResponseInput) {
        this.elements.careResponseInput.value = '';
      }
      
      // Hide personal care container
      this.hidePersonalCarePrompt();
      
      // Show typing indicator
      this.showTyping();
      
      // Process personal care response
      const careResponse = await this.conversation.handlePersonalCareResponse(response, this.currentCareType);
      
      // Hide typing indicator
      this.hideTyping();
      
      // Display NYLA's care response
      if (careResponse) {
        await this.displayMessage(careResponse, 'nyla');
        
        // Show appropriate sticker (enhanced for naughty responses)
        let stickerSentiment = careResponse.sentiment;
        if (careResponse.isNaughtyResponse) {
          // Use 'excited' sentiment for naughty responses to get celebration stickers
          stickerSentiment = 'excited';
        }
        
        const sticker = this.conversation.selectSticker(stickerSentiment);
        if (sticker) {
          this.showSticker(sticker);
        }
      }
      
      // Reset personal care mode
      this.personalCareMode = false;
      this.currentCareType = null;
      
      // Continue with normal conversation
      setTimeout(() => {
        const contextQuestions = this.conversation.generateWelcomeQuestions();
        this.displayQuestions(contextQuestions);
      }, 1500);
      
    } catch (error) {
      console.error('NYLA UI V2: Personal care response failed', error);
      this.hideTyping();
      this.hidePersonalCarePrompt();
      this.personalCareMode = false;
    }
  }

  /**
   * Hide personal care prompt
   */
  hidePersonalCarePrompt() {
    if (this.elements.personalCareContainer) {
      this.elements.personalCareContainer.style.transition = 'all 0.3s ease';
      this.elements.personalCareContainer.style.opacity = '0';
      this.elements.personalCareContainer.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        this.elements.personalCareContainer.style.display = 'none';
      }, 300);
    }
  }

  /**
   * Update timezone display
   */
  updateTimezoneDisplay() {
    if (this.elements.timezoneDisplay && this.conversation && this.conversation.userProfile) {
      const timezone = this.conversation.userProfile.timezone || 'UTC';
      const localTime = this.conversation.userProfile.localTime || new Date().toLocaleString();
      const timeOnly = new Date(localTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      this.elements.timezoneDisplay.innerHTML = `
        <span class="timezone-text">🕐 ${timeOnly} (${timezone.split('/')[1] || timezone})</span>
      `;
    }
  }

  /**
   * Update feature indicators
   */
  updateFeatureIndicators() {
    if (!this.elements.featureIndicators) return;
    
    const indicators = this.elements.featureIndicators.querySelectorAll('.feature-indicator');
    indicators.forEach(indicator => {
      const feature = indicator.dataset.feature;
      let isEnabled = false;
      
      switch (feature) {
        case 'llm':
          isEnabled = this.conversation.llmEngine && this.conversation.llmEngine.isReady();
          break;
        case 'timezone':
          isEnabled = !!this.conversation.userProfile?.timezone;
          break;
        case 'personalCare':
          isEnabled = this.enhancedFeatures.personalCare;
          break;
        case 'stickers':
          isEnabled = !!this.conversation.kb.getKnowledge('stickers');
          break;
      }
      
      indicator.classList.toggle('enabled', isEnabled);
      indicator.classList.toggle('disabled', !isEnabled);
    });
  }

  /**
   * Show feature status when clicked
   */
  showFeatureStatus(feature) {
    const statusMessages = {
      llm: this.conversation.llmEngine?.isReady() ? 'LLM Engine: Active 🟢' : 'LLM Engine: Loading or unavailable 🟡',
      timezone: this.conversation.userProfile?.timezone ? `Timezone: ${this.conversation.userProfile.timezone} 🟢` : 'Timezone: Not detected 🔴',
      personalCare: 'Personal Care: Enabled 🟢',
      stickers: this.conversation.kb.getKnowledge('stickers') ? 'Smart Stickers: Available 🟢' : 'Smart Stickers: Loading 🟡'
    };
    
    const message = statusMessages[feature] || 'Feature status unknown';
    
    // Show temporary status message
    this.showTemporaryStatus(message);
  }

  /**
   * Show temporary status message
   */
  showTemporaryStatus(message) {
    const statusEl = document.createElement('div');
    statusEl.className = 'nyla-temp-status';
    statusEl.textContent = message;
    statusEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(26, 26, 26, 0.9);
      color: #FF6B35;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid #FF6B35;
      z-index: 1000;
      font-size: 14px;
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(statusEl);
    
    setTimeout(() => {
      statusEl.style.opacity = '0';
      statusEl.style.transform = 'translateY(-20px)';
      setTimeout(() => statusEl.remove(), 300);
    }, 2000);
  }

  /**
   * Enhanced tab activation
   */
  onTabActivated() {
    // Check if conversation manager is available
    if (!this.conversation) {
      console.log('NYLA UI V2: Tab activated but conversation manager not ready');
      return;
    }

    // Check if any LLM system is available (hosted LLM or local LLM engine)
    const hasHostedLLM = this.conversation.hostedLLM;
    const hasLocalLLM = this.conversation.llmEngine;
    
    if (!hasHostedLLM && !hasLocalLLM) {
      console.log('NYLA UI V2: Tab activated but no LLM system ready');
      return;
    }

    // For local LLM, check loading/warming status
    if (hasLocalLLM && !hasHostedLLM) {
      const llmStatus = this.conversation.llmEngine.getStatus();
      if ((!llmStatus.initialized && llmStatus.loading) || (llmStatus.initialized && !llmStatus.warmedUp)) {
        // Show loading screen if LLM is still loading or warming up
        console.log('NYLA UI V2: Tab activated but local LLM not fully ready, showing loading screen');
        this.showLLMLoadingScreen();
        return;
      }
    }

    // For hosted LLM, we can proceed immediately (no warming needed)
    if (hasHostedLLM) {
      console.log('NYLA UI V2: Tab activated with hosted LLM ready');
    }
    
    // Update timezone and feature indicators
    this.updateTimezoneDisplay();
    this.updateFeatureIndicators();
    
    // Update local time in conversation manager
    if (this.conversation.userProfile) {
      this.conversation.userProfile.localTime = this.conversation.getLocalTime();
    }
  }

  /**
   * Handle engagement action clicks
   */
  async handleEngagementAction(actionType, category) {
    if (this.isTyping) return;

    // Disable all question buttons
    this.disableQuestionButtons();

    // Show user's action
    const actionButton = document.querySelector(`[data-engagement-action="${actionType}"]`);
    if (actionButton) {
      await this.displayMessage({ text: actionButton.textContent }, 'user');
    }

    // Show typing indicator
    this.showTyping();

    try {
      // Process engagement action
      const response = await this.conversation.handleEngagementAction(actionType, category);
      
      // Hide typing indicator
      this.hideTyping();
      
      // Display NYLA's response
      await this.displayMessage(this.normalizeResponseFormat(response), 'nyla');
      
      // Handle special actions
      if (response.externalAction) {
        // Open X.com post
        setTimeout(() => {
          window.open(response.externalAction, '_blank');
        }, 1000);
      }
      
      if (response.navigationAction) {
        // Navigate to different tab
        setTimeout(() => {
          this.navigateToTab(response.navigationAction);
        }, 1500);
      }
      
      if (response.workBreak) {
        // NYLA is going on break
        this.showWorkBreakMessage(response.workStatus);
      } else {
        // Show follow-up questions
        this.displayQuestions(response.followUps);
      }
      
      // Update stats
      this.updateStats();
      
    } catch (error) {
      console.error('NYLA UI V2: Engagement action failed', error);
      this.hideTyping();
      
      const errorResponse = this.conversation.generateErrorResponse();
      await this.displayMessage(errorResponse.answer, 'nyla');
      this.displayQuestions(errorResponse.followUps);
    }
  }

  /**
   * Handle work status check
   */
  async handleWorkStatusCheck() {
    if (this.isTyping) return;

    // Show user's question
    await this.displayMessage({ text: 'Are you back yet? 👀' }, 'user');
    
    // Show typing indicator briefly
    this.showTyping();
    
    try {
      // Process work status check
      const response = await this.conversation.processQuestion('check-work-status', 'Are you back yet?', 'work-status');
      
      // Hide typing indicator
      this.hideTyping();
      
      // Display response
      await this.displayMessage(this.normalizeResponseFormat(response), 'nyla');
      
      if (!response.workBreak) {
        // NYLA is back! Show regular questions
        this.displayQuestions(response.followUps);
      } else {
        // Still working, show work status check again
        this.displayQuestions(response.followUps);
      }
      
      this.updateStats();
      
    } catch (error) {
      console.error('NYLA UI V2: Work status check failed', error);
      this.hideTyping();
    }
  }

  /**
   * Show work break message
   */
  showWorkBreakMessage(workStatus) {
    // Create a special work break container
    const workBreakContainer = document.createElement('div');
    workBreakContainer.className = 'nyla-work-break-container';
    workBreakContainer.innerHTML = `
      <div class="work-break-message">
        <div class="work-break-icon">${workStatus.emoji}</div>
        <div class="work-break-text">NYLA is away for ${workStatus.remainingMinutes} minutes</div>
        <div class="work-break-progress">
          <div class="progress-bar" style="animation: countdown ${workStatus.remainingMinutes * 60}s linear forwards;"></div>
        </div>
      </div>
    `;
    
    // Add to messages container
    if (this.elements.messagesContainer) {
      this.elements.messagesContainer.appendChild(workBreakContainer);
      this.scrollToBottom();
    }
  }

  /**
   * Navigate to different tab
   */
  navigateToTab(tabName) {
    // Find the tab button and trigger click
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabButton) {
      tabButton.click();
      
      // Show success message
      this.showTemporaryStatus(`Navigated to ${tabName.charAt(0).toUpperCase() + tabName.slice(1)} tab! 🎯`);
    }
  }

  /**
   * Override displayQuestions to handle engagement styling and tab switching
   */
  displayQuestions(questions) {
    console.log('NYLA UI V2: displayQuestions called with:', questions);
    console.log('NYLA UI V2: questions length:', questions ? questions.length : 'null/undefined');
    
    if (!questions || questions.length === 0) {
      console.log('NYLA UI V2: No questions to display, returning early');
      return;
    }

    this.clearQuestions();

    questions.forEach(question => {
      const button = document.createElement('button');
      button.className = 'nyla-question-btn';
      button.setAttribute('data-question-id', question.id);
      button.textContent = question.text;
      
      if (question.action) {
        button.setAttribute('data-action', question.action);
      }
      
      // Handle tab switching attributes
      if (question.actionType === 'tabSwitch' && question.targetTab) {
        button.setAttribute('data-action-type', question.actionType);
        button.setAttribute('data-target-tab', question.targetTab);
        button.classList.add('tab-switch-btn');
        console.log(`NYLA UI V2: Created tab switch button for ${question.targetTab}: "${question.text}"`);
      }
      
      // Handle engagement-specific attributes
      if (question.engagementAction) {
        button.setAttribute('data-engagement-action', question.engagementAction);
      }
      
      if (question.engagementCategory) {
        button.setAttribute('data-engagement-category', question.engagementCategory);
      }
      
      if (question.engagementType) {
        button.setAttribute('data-engagement-type', question.engagementType);
        
        // Add special styling for engagement buttons
        if (question.engagementType === 'positive') {
          button.classList.add('engagement-positive');
        } else if (question.engagementType === 'soft-reject') {
          button.classList.add('engagement-soft-reject');
        }
      }

      this.elements.questionsContainer.appendChild(button);
    });

    // Enable buttons after displaying new questions
    this.enableQuestionButtons();

    // Animate buttons in
    this.animateQuestionsIn();
  }

  /**
   * Remove existing NYLA tabs to prevent duplicates
   */
  removeExistingNYLATabs() {
    // Remove all existing NYLA tab buttons
    const existingButtons = document.querySelectorAll('[data-tab="nyla"]');
    existingButtons.forEach(button => {
      console.log('NYLA UI V2: Removing existing NYLA tab button');
      button.remove();
    });
    
    // Remove all existing NYLA tab content
    const existingTabs = document.querySelectorAll('#nylaTab');
    existingTabs.forEach(tab => {
      console.log('NYLA UI V2: Removing existing NYLA tab content');
      tab.remove();
    });
  }

  /**
   * Enhance existing NYLA tab with V2 features
   */
  enhanceExistingTab(existingTab) {
    // Check if already enhanced
    if (existingTab.querySelector('.nyla-enhanced-header')) {
      console.log('NYLA UI V2: Tab already enhanced');
      return;
    }
    
    console.log('NYLA UI V2: Enhancing existing tab with V2 features');
    
    // First, check if the tab has proper structure or just loading placeholder
    let chatContainer = existingTab.querySelector('.nyla-chat-container');
    console.log(`NYLA UI V2: Chat container found: ${!!chatContainer}`);
    
    if (!chatContainer) {
      console.log('NYLA UI V2: No chat container found, creating basic structure...');
      console.log('NYLA UI V2: Tab innerHTML:', existingTab.innerHTML.substring(0, 200));
      
      // Create the basic chat container structure directly
      const basicChatContainer = document.createElement('div');
      basicChatContainer.className = 'nyla-chat-container';
      basicChatContainer.innerHTML = `
        <div class="nyla-loading-placeholder">
          <div class="nyla-avatar">
            <img src="./icons/NYLA.png" alt="NYLA">
          </div>
          <p>NYLA is starting up...</p>
        </div>
      `;
      
      existingTab.appendChild(basicChatContainer);
      chatContainer = basicChatContainer;
      console.log('NYLA UI V2: ✅ Basic chat container created');
    } else {
      console.log('NYLA UI V2: Chat container already exists, proceeding with enhancement');
    }
    
    // Save any existing messages before replacing content
    const existingMessages = chatContainer.querySelector('.nyla-messages');
    const preservedMessages = existingMessages ? existingMessages.innerHTML : '';
    
    // Check if debug mode is enabled
    const urlParams = new URLSearchParams(window.location.search);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isDevelopmentMode = !isMobile && urlParams.get('debug') === 'true';
    
    // Now populate the chat container with V2 structure (no header for cleaner exploration)
    console.log('NYLA UI V2: Populating chat container with V2 structure...');
    chatContainer.innerHTML = `
      <!-- Debug Mode Input (only when ?debug=true) -->
      ${isDevelopmentMode ? `
        <div class="nyla-dev-input-container" style="
          background: #2a2a2a; 
          border: 1px solid #444; 
          border-radius: 8px; 
          padding: 12px; 
          margin-bottom: 16px;
          border-left: 4px solid #FF6B35;
        ">
          <div style="color: #FF6B35; font-size: 12px; font-weight: 500; margin-bottom: 8px;">
            🔧 DEBUG MODE - Test LLM Responses
          </div>
          <input 
            type="text" 
            id="nylaDevInput" 
            placeholder="Type question to test LLM performance (press Enter to send)"
            style="
              width: 100%; 
              background: #1a1a1a; 
              border: 1px solid #555; 
              border-radius: 4px; 
              padding: 8px 12px; 
              color: white; 
              font-size: 14px;
              font-family: 'Roboto', sans-serif;
            "
          />
          <div style="font-size: 11px; color: #888; margin-top: 4px;">
            Direct input for testing LLM response time and quality
          </div>
        </div>
      ` : ''}
      
      <!-- Chat Messages Container -->
      <div class="nyla-messages" id="nylaMessages">
        ${preservedMessages}
      </div>
      
      <!-- Typing Indicator -->
      <div class="nyla-typing-indicator" id="nylaTyping" style="display: none;">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="typing-text">NYLA is typing...</span>
      </div>
      
      <!-- Question Buttons Container -->
      <div class="nyla-questions" id="nylaQuestions">
        <!-- Question buttons will be dynamically added here -->
      </div>
      
      <!-- User Comment Box (Available for all users) -->
      <div class="nyla-user-input-container" id="nylaUserInputContainer" style="display: block;">
        <div class="user-input-header" style="color: #FF6B35; font-size: 14px; font-weight: 500; margin-bottom: 8px;">
          💬 Free Talk - Ask me anything!
        </div>
        <input 
          type="text" 
          id="nylaUserInput" 
          placeholder="Ask me anything about NYLA..."
          style="
            width: 100%; 
            background: #1a1a1a; 
            border: 1px solid #555; 
            border-radius: 4px; 
            padding: 8px 12px; 
            color: white; 
            font-size: 16px;
            font-family: 'Roboto', sans-serif;
            border-left: 3px solid #FF6B35;
          "
        />
        <div style="font-size: 12px; color: #888; margin-top: 4px;">
          Press Enter to send your message directly to NYLA
        </div>
      </div>
      
      <!-- Sticker Display -->
      <div class="nyla-sticker-container" id="nylaStickerContainer" style="display: none;">
        <img class="nyla-sticker" id="nylaSticker" src="" alt="NYLA Sticker">
      </div>
    `;
    console.log('NYLA UI V2: ✅ V2 structure populated successfully');
    
    // Debug header removed - using console logs for development debugging
    console.log('NYLA UI V2: ✅ Enhanced tab ready (debug via console logs only)');
    
    // Add personal care container if not exists
    if (!existingTab.querySelector('#nylaPersonalCareContainer')) {
      const personalCareContainer = document.createElement('div');
      personalCareContainer.className = 'nyla-personal-care-container';
      personalCareContainer.id = 'nylaPersonalCareContainer';
      personalCareContainer.style.display = 'none';
      personalCareContainer.innerHTML = `
        <div class="personal-care-prompt">
          <div class="care-message" id="careMessage"></div>
          <div class="care-input-area">
            <input type="text" id="careResponseInput" placeholder="Your response..." maxlength="100">
            <button type="button" id="careSubmitBtn" class="care-submit-btn">💬</button>
          </div>
          <div class="care-quick-responses" id="careQuickResponses">
            <!-- Quick response buttons will be added dynamically -->
          </div>
        </div>
      `;
      
      const questionsContainer = existingTab.querySelector('.nyla-questions');
      if (questionsContainer) {
        questionsContainer.parentNode.insertBefore(personalCareContainer, questionsContainer);
      }
    }
    
    // Add stats/info panel if it doesn't exist (knowledge progress and disclaimer)
    if (!existingTab.querySelector('.nyla-info-panel')) {
      const infoPanelHTML = `
        <div class="nyla-info-panel" id="nylaInfoPanel">
          <!-- Knowledge stats removed from UI but still working in background -->
          <div class="nyla-disclaimer" style="
            margin-top: 12px;
            padding: 12px;
            background: rgba(255, 107, 53, 0.1);
            border: 1px solid rgba(255, 107, 53, 0.3);
            border-radius: 6px;
            font-size: 12px;
            line-height: 1.4;
            color: #cccccc;
            text-align: center;
          ">
            <div style="color: #FF6B35; font-weight: 500; margin-bottom: 4px;">ℹ️ Important Notice</div>
            NylaGo is a community run application, it does not have access to NYLA CORE. It is a helper application that pre formats commands to Nyla. Nyla still processes and handles requests the same way she would normally.
          </div>
        </div>
      `;
      existingTab.insertAdjacentHTML('beforeend', infoPanelHTML);
      console.log('NYLA UI V2: ✅ Info panel added (knowledge stats and disclaimer)');
    }
    
    // Set up debug input event listener if in debug mode
    const devInput = document.getElementById('nylaDevInput');
    if (devInput) {
      devInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
          const question = e.target.value.trim();
          console.log('NYLA Dev: Testing question:', question);
          
          // Add the user's question to the conversation UI
          this.addUserMessage(question);
          
          // Show typing indicator
          this.showTyping();
          
          // Process the question through the conversation system
          if (this.conversation && this.conversation.processQuestion) {
            this.conversation.processQuestion('dev-input', question)
              .then(async (response) => {
                console.log('NYLA Dev: Question processed successfully', response);
                
                // Hide typing indicator
                this.hideTyping();
                
                // Display NYLA's response
                if (response) {
                  await this.displayMessage(this.normalizeResponseFormat(response), 'nyla');
                  
                  // Show sticker if available
                  if (response.sticker) {
                    this.showSticker(response.sticker);
                  }
                  
                  // Display follow-up questions
                  if (response.followUps && response.followUps.length > 0) {
                    this.displayQuestions(response.followUps);
                  }
                }
              })
              .catch(async error => {
                console.error('NYLA Dev: Question processing failed:', error);
                this.hideTyping();
                
                // Show error message
                await this.displayMessage({ 
                  text: "Sorry, I encountered an error processing your question. Please try again.", 
                  sentiment: 'sorry' 
                }, 'nyla');
              });
          }
          
          // Clear the input
          e.target.value = '';
        }
      });
      
      console.log('NYLA UI V2: ✅ Debug input event listener added');
    }
    
    // Set up user input event listener for free talk (available to all users)
    const userInput = document.getElementById('nylaUserInput');
    if (userInput) {
      userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
          const question = e.target.value.trim();
          console.log('NYLA User Input: Free talk question:', question);
          
          // Add the user's question to the conversation UI
          this.addUserMessage(question);
          
          // Show typing indicator
          this.showTyping();
          
          // Process the question through the conversation system
          if (this.conversation && this.conversation.processQuestion) {
            this.conversation.processQuestion('user-free-talk', question)
              .then(async (response) => {
                console.log('NYLA User Input: Question processed successfully', response);
                
                // Hide typing indicator
                this.hideTyping();
                
                // Display NYLA's response
                if (response) {
                  await this.displayMessage(this.normalizeResponseFormat(response), 'nyla');
                  
                  // Show sticker if available
                  if (response.sticker) {
                    this.showSticker(response.sticker);
                  }
                  
                  // Display follow-up questions
                  if (response.followUps && response.followUps.length > 0) {
                    this.displayQuestions(response.followUps);
                  }
                }
              })
              .catch(async error => {
                console.error('NYLA User Input: Question processing failed:', error);
                this.hideTyping();
                
                // Show error message
                await this.displayMessage({ 
                  text: "Sorry, I encountered an error processing your question. Please try again.", 
                  sentiment: 'sorry' 
                }, 'nyla');
              });
          }
          
          // Clear the input
          e.target.value = '';
        }
      });
      
      console.log('NYLA UI V2: ✅ User input event listener added');
    }
  }

  /**
   * Update knowledge progress display
   */
  updateKnowledgeProgress() {
    // Keep knowledge stats functionality for LLM usage but remove from UI
    if (!this.conversation.getKnowledgeStats) return;
    
    const stats = this.conversation.getKnowledgeStats();
    
    // Stats are still tracked in background for LLM usage
    if (stats && typeof stats.percentage === 'number') {
      console.log('NYLA Knowledge Stats (Background):', `${stats.percentage}% knowledge gained`);
      
      // Free talk is now available to all users - no restrictions
      const userInputContainer = document.getElementById('nylaUserInputContainer');
      if (userInputContainer) {
        userInputContainer.style.display = 'block';
      }
    }
  }

  // ===== BASE UI METHODS (previously inherited from V1) =====

  /**
   * Add user message to the conversation UI
   */
  addUserMessage(text) {
    this.displayMessage({ text }, 'user');
  }

  /**
   * Generate HTML for RAG metadata (source pills and as_of badges)
   */
  generateRAGMetadataHtml(ragMetadata) {
    const { sources = [], mostRecentDate = null, hasVolatileInfo = false } = ragMetadata;
    
    if (!sources.length) return '';
    
    let html = '<div class="rag-metadata">';
    
    // Add as_of badge if we have recent date info
    if (mostRecentDate) {
      const badgeClass = hasVolatileInfo ? 'as-of-badge volatile' : 'as-of-badge';
      html += `<span class="${badgeClass}" title="Information current as of this date">As of ${mostRecentDate}</span>`;
    }
    
    // Add source pills
    if (sources.length > 0) {
      html += '<div class="source-pills">';
      sources.slice(0, 3).forEach(source => { // Show max 3 sources to avoid clutter
        const { title = 'Unknown', type = 'info', verified = null } = source;
        let pillClass = `source-pill ${type}`;
        let verificationIcon = '';
        
        if (verified === true) {
          pillClass += ' verified';
          verificationIcon = ' ✓';
        } else if (verified === false) {
          pillClass += ' unverified';
          verificationIcon = ' !';
        }
        
        html += `<span class="${pillClass}" title="Source: ${title}">${this.truncateText(title, 20)}${verificationIcon}</span>`;
      });
      
      if (sources.length > 3) {
        html += `<span class="source-pill more">+${sources.length - 3} more</span>`;
      }
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Truncate text to specified length
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Display a message in the chat
   */
  async displayMessage(message, sender) {
    // Check if messages container exists
    if (!this.elements.messagesContainer) {
      console.error('NYLA UI V2: Messages container not found - cannot display message');
      console.error('NYLA UI V2: Available elements:', Object.keys(this.elements));
      console.error('NYLA UI V2: Attempted message:', message);
      throw new Error('Messages container not initialized - UI structure may be incomplete');
    }
    
    // Ensure message has text property
    if (!message || typeof message.text === 'undefined') {
      console.warn('NYLA UI V2: Message missing text property:', message);
      message = { text: '' };
    }
    
    // Check if this is a consecutive NYLA message
    const previousMessage = this.elements.messagesContainer.querySelector('.nyla-message:last-child');
    const isConsecutiveNyla = sender === 'nyla' && previousMessage && previousMessage.classList.contains('nyla-message-nyla');
    
    const messageElement = document.createElement('div');
    messageElement.className = `nyla-message nyla-message-${sender}`;
    if (isConsecutiveNyla) {
      messageElement.classList.add('consecutive-message');
    }
    
    const avatar = sender === 'nyla' ? '<img src="icons/NYLA.png" alt="NYLA" class="nyla-avatar-img">' : '👤';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageText = String(message.text || '');
    
    // Generate source pills and as_of badges for RAG responses
    let ragMetadataHtml = '';
    if (sender === 'nyla' && message.ragMetadata) {
      ragMetadataHtml = this.generateRAGMetadataHtml(message.ragMetadata);
    }
    
    // Only show header if not consecutive NYLA message
    const headerHtml = !isConsecutiveNyla ? `
      <div class="message-header">
        <span class="message-avatar">${avatar}</span>
        <span class="message-sender">${sender === 'nyla' ? 'NYLA' : 'You'}</span>
        <span class="message-time">${timestamp}</span>
      </div>
    ` : '';
    
    messageElement.innerHTML = `
      ${headerHtml}
      <div class="message-content" data-text="${messageText.replace(/"/g, '&quot;')}">
        ${sender === 'nyla' ? '' : this.formatMessageText(messageText)}
      </div>
      ${ragMetadataHtml}
    `;

    this.elements.messagesContainer.appendChild(messageElement);

    // Typing effect for NYLA messages
    if (sender === 'nyla') {
      await this.typeMessage(messageElement.querySelector('.message-content'), messageText);
    }

    // Scroll to bottom
    this.scrollToBottom();
  }

  /**
   * Type message with typing effect
   */
  async typeMessage(element, text) {
    this.isTyping = true;
    element.innerHTML = '';
    
    // Handle undefined or null text
    if (!text) {
      console.warn('NYLA UI V2: typeMessage called with undefined/null text');
      this.isTyping = false;
      return;
    }
    
    // Convert to string to ensure we can call string methods
    const textString = String(text);
    
    // Get the plain text without formatting for typing
    let currentText = '';
    
    for (let i = 0; i < textString.length; i++) {
      currentText += textString[i];
      
      // During typing, show plain text to avoid URL button issues with partial URLs
      element.textContent = currentText;
      
      // Scroll to bottom during typing
      this.scrollToBottom();
      
      // Wait before next character
      await this.sleep(this.typingSpeed);
    }
    
    // After typing is complete, apply final formatting with URL buttons
    const formattedText = this.formatMessageText(textString);
    element.innerHTML = formattedText;
    this.isTyping = false;
  }

  /**
   * Format message text with basic markdown-like formatting and URL buttons
   */
  formatMessageText(text) {
    // Handle undefined or null text
    if (!text) {
      return '';
    }
    
    // Ensure text is a string
    const textString = String(text);
    
    // Apply basic formatting first
    let formattedText = textString
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/• /g, '<span class="bullet">•</span> ');

    // Convert URLs to buttons
    formattedText = this.convertUrlsToButtons(formattedText);
    
    return formattedText;
  }

  /**
   * Convert URLs in text to beautiful clickable buttons
   */
  convertUrlsToButtons(text) {
    // URL patterns for different platforms
    const urlPatterns = {
      twitter: {
        regex: /https?:\/\/(www\.)?(twitter\.com|x\.com)\/[\w./?&=%-]+/gi,
        icon: '𝕏',
        platform: 'twitter',
        label: 'X (Twitter)'
      },
      telegram: {
        regex: /https?:\/\/t\.me\/[\w./?&=%-]+/gi,
        icon: '💬',
        platform: 'telegram', 
        label: 'Telegram'
      },
      linktree: {
        regex: /https?:\/\/(www\.)?linktr\.ee\/[\w./?&=%-]+/gi,
        icon: '🔗',
        platform: 'linktree',
        label: 'Linktree'
      },
      generic: {
        regex: /https?:\/\/[^\s<>"']+/gi,
        icon: '🌐',
        platform: 'generic',
        label: 'Link'
      }
    };

    let processedText = text;
    const foundUrls = new Set(); // Track processed URLs to avoid duplicates

    // Process platform-specific URLs first (more specific patterns)
    ['twitter', 'telegram', 'linktree'].forEach(platformKey => {
      const pattern = urlPatterns[platformKey];
      let match;
      
      while ((match = pattern.regex.exec(text)) !== null) {
        const url = match[0];
        
        // Skip if already processed
        if (foundUrls.has(url)) {
          continue;
        }
        foundUrls.add(url);

        // Generate button HTML
        const buttonHtml = this.generateUrlButton(url, pattern);
        
        // Replace the URL with button (escape regex special characters)
        const urlRegex = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        processedText = processedText.replace(urlRegex, buttonHtml);
      }
      
      // Reset regex lastIndex for next iteration
      pattern.regex.lastIndex = 0;
    });

    // Process remaining generic URLs (less specific pattern)
    let match;
    while ((match = urlPatterns.generic.regex.exec(text)) !== null) {
      const url = match[0];
      
      // Skip if already processed by platform-specific patterns
      if (foundUrls.has(url)) {
        continue;
      }
      foundUrls.add(url);

      // Generate generic button HTML
      const buttonHtml = this.generateUrlButton(url, urlPatterns.generic);
      
      // Replace the URL with button
      const urlRegex = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processedText = processedText.replace(urlRegex, buttonHtml);
    }
    
    // Reset regex lastIndex
    urlPatterns.generic.regex.lastIndex = 0;

    // Return the processed text with inline buttons
    return processedText;
  }

  /**
   * Generate HTML for a URL button
   */
  generateUrlButton(url, pattern) {
    // Shorten display text for button
    let displayText = pattern.label;
    
    // For specific platforms, try to extract meaningful text
    if (pattern.platform === 'twitter') {
      const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)/);
      if (match && match[1]) {
        displayText = `@${match[1]}`;
      }
    } else if (pattern.platform === 'telegram') {
      const match = url.match(/t\.me\/(\w+)/);
      if (match && match[1]) {
        displayText = match[1];
      }
    } else if (pattern.platform === 'linktree') {
      const match = url.match(/linktr\.ee\/(\w+)/);
      if (match && match[1]) {
        displayText = match[1];
      }
    } else if (pattern.platform === 'generic') {
      // For generic links, show domain
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        displayText = domain;
      } catch (e) {
        displayText = 'Link';
      }
    }

    return `<a class="link-button platform-${pattern.platform}" 
               role="button"
               onclick="window.nylaUI?.handleLinkClick('${url}', event)"
               aria-label="Open ${pattern.label} link"
               style="cursor: pointer;">
              <span class="platform-icon">${pattern.icon}</span>
              ${displayText}
            </a>`;
  }

  /**
   * Handle link button clicks with platform-specific logic
   */
  handleLinkClick(url, event) {
    try {
      // Prevent default link behavior
      if (event) {
        event.preventDefault();
      }

      // Check if we're in an extension environment
      const isExtension = typeof chrome !== 'undefined' && chrome.tabs;
      
      if (isExtension) {
        // Extension: Use chrome.tabs.create for better user experience
        chrome.tabs.create({ 
          url: url,
          active: true 
        }, (tab) => {
          if (chrome.runtime.lastError) {
            console.warn('NYLA UI: Chrome tabs API failed, falling back to window.open:', chrome.runtime.lastError);
            // Fallback to window.open
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        });
      } else {
        // PWA: Use standard window.open
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        
        // Check if popup was blocked
        if (!opened || opened.closed || typeof opened.closed === 'undefined') {
          console.warn('NYLA UI: Popup blocked, attempting to open in same tab');
          // As last resort, navigate in same tab
          window.location.href = url;
        }
      }

      // Log for analytics/debugging
      console.log(`NYLA UI: Opened link - ${url}`);
      
    } catch (error) {
      console.error('NYLA UI: Error handling link click:', error);
      // Final fallback - let browser handle the original link
      window.location.href = url;
    }
  }

  /**
   * Show typing indicator
   */
  showTyping() {
    if (this.elements.typingIndicator) {
      this.elements.typingIndicator.style.display = 'flex';
      this.scrollToBottom();
    }
  }

  /**
   * Hide typing indicator
   */
  hideTyping() {
    if (this.elements.typingIndicator) {
      this.elements.typingIndicator.style.display = 'none';
    }
  }

  /**
   * Show sticker
   */
  showSticker(stickerData) {
    if (this.elements.sticker && this.elements.stickerContainer) {
      this.elements.sticker.src = stickerData.path;
      this.elements.sticker.alt = `NYLA feeling ${stickerData.emotion}`;
      this.elements.stickerContainer.style.display = 'block';
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        this.elements.stickerContainer.style.display = 'none';
      }, 3000);
    }
  }

  /**
   * Update conversation stats
   */
  updateStats() {
    // Remove conversation count display - only show knowledge progress
    
    // Update timezone display periodically (only in debug mode)
    this.updateTimezoneDisplay();
    
    // Show knowledge progress if available
    if (this.conversation.getKnowledgeStats) {
      this.updateKnowledgeProgress();
    }
  }

  /**
   * Clear question buttons
   */
  clearQuestions() {
    if (this.elements.questionsContainer) {
      this.elements.questionsContainer.innerHTML = '';
    }
  }

  /**
   * Disable question buttons with shadow overlay
   */
  disableQuestionButtons() {
    const buttons = this.elements.questionsContainer.querySelectorAll('.nyla-question-btn');
    buttons.forEach(button => {
      button.disabled = true;
      button.classList.add('disabled');
      
      // Add shadow overlay effect
      button.style.position = 'relative';
      button.style.zIndex = '1';
      
      // Ensure the shadow overlay is visible
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.6)';
      
      // Add a subtle animation to indicate processing
      button.style.transition = 'all 0.3s ease';
      button.style.transform = 'scale(0.98)';
    });
    
    // Add a container-level overlay effect
    if (this.elements.questionsContainer) {
      this.elements.questionsContainer.classList.add('processing');
    }
  }

  /**
   * Enable question buttons and remove shadow overlay
   */
  enableQuestionButtons() {
    const buttons = this.elements.questionsContainer.querySelectorAll('.nyla-question-btn');
    buttons.forEach(button => {
      button.disabled = false;
      button.classList.remove('disabled');
      
      // Remove shadow overlay effect
      button.style.position = '';
      button.style.zIndex = '';
      button.style.boxShadow = '';
      button.style.transform = '';
      button.style.transition = '';
    });
    
    // Remove container-level overlay effect
    if (this.elements.questionsContainer) {
      this.elements.questionsContainer.classList.remove('processing');
    }
  }

  /**
   * Animate question buttons in
   */
  animateQuestionsIn() {
    const buttons = this.elements.questionsContainer.querySelectorAll('.nyla-question-btn');
    buttons.forEach((button, index) => {
      button.style.opacity = '0';
      button.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        button.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        button.style.opacity = '1';
        button.style.transform = 'translateY(0)';
      }, index * 100);
    });
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    if (this.elements.messagesContainer) {
      this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }
  }

  /**
   * Sleep utility for typing animation
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle change topic action
   */
  handleChangeTopicAction() {
    const result = this.conversation.changeTopicAction();
    
    // Clear current questions
    this.clearQuestions();
    
    // Show topic change message
    this.displayMessage({
      text: result.message,
      sentiment: 'friendly'
    }, 'nyla');
    
    // Show new questions
    this.displayQuestions(result.questions);
  }

  /**
   * Initialize feature indicators
   */
  initializeFeatureIndicators() {
    console.log('NYLA UI V2: Initializing feature indicators...');
    try {
      // Update feature indicators based on available features
      this.updateFeatureIndicators();
      console.log('NYLA UI V2: ✅ Feature indicators initialized');
    } catch (error) {
      console.error('NYLA UI V2: ❌ Feature indicators initialization failed:', error);
      // Don't throw - this is not critical for functionality
    }
  }

  /**
   * Check if debug mode should be enabled
   */
  isDebugMode() {
    // Enable debug mode for localhost or with ?debug=true parameter
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const hasDebugParam = new URLSearchParams(window.location.search).get('debug') === 'true';
    return isLocalhost || hasDebugParam;
  }

  /**
   * Show debug panel
   */
  showDebugPanel() {
    const statusBar = document.querySelector('.nyla-status-bar');
    const debugToggle = document.querySelector('.nyla-debug-toggle');
    
    if (statusBar && debugToggle) {
      statusBar.style.display = 'block';
      debugToggle.style.display = 'none';
      
      // Update feature indicators when showing
      this.updateFeatureIndicators();
      this.updateTimezoneDisplay();
      
      console.log('NYLA UI V2: Debug panel shown');
    }
  }

  /**
   * Hide debug panel
   */
  hideDebugPanel() {
    const statusBar = document.querySelector('.nyla-status-bar');
    const debugToggle = document.querySelector('.nyla-debug-toggle');
    
    if (statusBar && debugToggle) {
      statusBar.style.display = 'none';
      debugToggle.style.display = 'block';
      
      console.log('NYLA UI V2: Debug panel hidden');
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAAssistantUIV2;
}

// Make globally available
window.NYLAAssistantUIV2 = NYLAAssistantUIV2;