/**
 * NYLA AI Assistant UI Manager V2 - Phase 2 Enhanced Interface
 * Handles personal care interactions, enhanced animations, and improved UX
 */

class NYLAAssistantUIV2 {
  constructor(conversationManager) {
    this.conversation = conversationManager;
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
      
      console.log('NYLA UI V2: Step 4 - Showing enhanced welcome message...');
      await this.showEnhancedWelcomeMessage();
      console.log('NYLA UI V2: ✅ Enhanced welcome message shown');
      
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
        nylaTab.setAttribute('data-section-title', '🤖 NYLA AI Assistant');
        
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
          <div class="nyla-loading-spinner"></div>
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
   * Show enhanced welcome message with timezone info
   */
  async showEnhancedWelcomeMessage() {
    const userTimezone = this.conversation.userProfile?.timezone || 'UTC';
    const localTime = this.conversation.userProfile?.localTime || new Date().toLocaleString();
    const hour = new Date(localTime).getHours();
    
    let timeGreeting = '';
    if (hour < 12) {
      timeGreeting = 'Good morning! ☀️';
    } else if (hour < 18) {
      timeGreeting = 'Good afternoon! 🌟';
    } else {
      timeGreeting = 'Good evening! 🌙';
    }

    const welcomeMessage = {
      text: `${timeGreeting} I'm NYLA, your enhanced AI assistant! 🚀\n\nI'm here to help with crypto transfers, answer questions about NYLA, and even check in on how you're doing! I can understand your timezone (${userTimezone}) and provide personalized assistance.\n\nWhat interests you most today?`,
      sentiment: 'friendly',
      isWelcome: true,
      confidence: 0.95
    };

    await this.displayMessage(welcomeMessage, 'nyla');
    
    // Update timezone display
    this.updateTimezoneDisplay();
    
    // Show initial questions
    const questions = this.conversation.generateWelcomeQuestions();
    this.displayQuestions(questions);
    
    // Update stats and feature indicators
    this.updateStats();
    this.updateFeatureIndicators();
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
      const response = await this.conversation.processWithLLM(questionId, questionText, topic, onStreamChunk);
      
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
      await this.displayMessage(response.answer, 'nyla');
      
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
    const topic = button.getAttribute('data-topic');
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
      // Process the question (no more streaming for LLM)
      const questionPromise = this.conversation.processQuestion(questionId, questionText, topic);
      const uiTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('UI timeout after 60 seconds')), 60000);
      });
      
      console.log('NYLA UI V2: Processing question (UI timeout: 60s)...');
      const response = await Promise.race([questionPromise, uiTimeoutPromise]);
      
      // Hide typing indicator
      this.hideTyping();
      console.log('NYLA UI V2: ✅ Question processed successfully');
      console.log('NYLA UI V2: Response received:', {
        text: response.answer.text.substring(0, 100) + '...',
        isLLMGenerated: response.isLLMGenerated,
        sentiment: response.answer.sentiment
      });
      
      // Check if this response contains personal care
      const personalCareDetected = this.detectPersonalCareInResponse(response.answer.text);
      
      if (personalCareDetected) {
        // Split response and personal care
        const { mainResponse, carePrompt, careType } = this.extractPersonalCare(response.answer.text, response.answer.sentiment);
        
        // Display main response first
        if (mainResponse.trim()) {
          await this.displayMessage({
            text: mainResponse,
            sentiment: response.answer.sentiment,
            confidence: response.answer.confidence
          }, 'nyla');
        }
        
        // Show personal care prompt
        if (carePrompt) {
          await this.showPersonalCarePrompt(carePrompt, careType);
        }
      } else {
        // Display NYLA's response normally
        await this.displayMessage(response.answer, 'nyla');
      }
      
      // Show sticker if available
      if (response.sticker) {
        this.showSticker(response.sticker);
      }
      
      // Display follow-up questions (unless in personal care mode)
      if (!this.personalCareMode) {
        this.displayQuestions(response.followUps);
      }
      
      // Update stats
      this.updateStats();
      
    } catch (error) {
      console.error('NYLA UI V2: Question processing failed', error);
      this.hideTyping();
      
      let errorResponse;
      if (error.message.includes('timeout')) {
        console.log('NYLA UI V2: Timeout detected, providing timeout-specific response');
        errorResponse = {
          answer: { 
            text: "I'm taking longer than usual to respond - let me give you a quick answer while I continue learning! 🤔\n\nThe LLM is still initializing in the background. You can see the progress in the browser console, or I can answer using my built-in knowledge base right away!", 
            sentiment: 'helpful' 
          },
          followUps: [
            { id: 'what-is-nyla', text: 'What is NYLA?', topic: 'nyla' },
            { id: 'how-to-use', text: 'How do I use NYLA transfers?', topic: 'transfers' },
            { id: 'blockchain-info', text: 'Which blockchains are supported?', topic: 'blockchain' }
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
    if (this.elements.timezoneDisplay && this.conversation.userProfile) {
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
    super.onTabActivated();
    
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
      await this.displayMessage(response.answer, 'nyla');
      
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
      await this.displayMessage(response.answer, 'nyla');
      
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
    if (!questions || questions.length === 0) return;

    this.clearQuestions();

    questions.forEach(question => {
      const button = document.createElement('button');
      button.className = 'nyla-question-btn';
      button.setAttribute('data-question-id', question.id);
      button.setAttribute('data-topic', question.topic);
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

    // Animate buttons in
    this.animateQuestionsIn();
  }

  /**
   * Enhanced stats update
   */
  updateStats() {
    super.updateStats();
    
    // Update timezone display periodically
    this.updateTimezoneDisplay();
    
    // Show knowledge progress if available
    if (this.conversation.getKnowledgeStats) {
      this.updateKnowledgeProgress();
    }
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
          <div class="nyla-loading-spinner"></div>
        </div>
      `;
      
      existingTab.appendChild(basicChatContainer);
      chatContainer = basicChatContainer;
      console.log('NYLA UI V2: ✅ Basic chat container created');
    } else {
      console.log('NYLA UI V2: Chat container already exists, proceeding with enhancement');
    }
    
    // Now populate the chat container with V2 structure (no header for cleaner exploration)
    console.log('NYLA UI V2: Populating chat container with V2 structure...');
    chatContainer.innerHTML = `
      <!-- Chat Messages Container -->
      <div class="nyla-messages" id="nylaMessages">
        <!-- Messages will be dynamically added here -->
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
    
    // Add stats/info panel if it doesn't exist (knowledge progress only)
    if (!existingTab.querySelector('.nyla-info-panel')) {
      const infoPanelHTML = `
        <div class="nyla-info-panel" id="nylaInfoPanel">
          <div class="nyla-stats">
            <span class="stats-text" id="knowledgeStats" style="display: none;">0% NYLA knowledge gained</span>
          </div>
        </div>
      `;
      existingTab.insertAdjacentHTML('beforeend', infoPanelHTML);
      console.log('NYLA UI V2: ✅ Info panel added (knowledge stats only)');
    }
  }

  /**
   * Update knowledge progress display
   */
  updateKnowledgeProgress() {
    if (!this.conversation.getKnowledgeStats) return;
    
    const stats = this.conversation.getKnowledgeStats();
    const knowledgeStatsEl = document.getElementById('knowledgeStats');
    
    // Only show knowledge percentage if there's meaningful progress
    if (knowledgeStatsEl && stats && stats.percentage > 0) {
      knowledgeStatsEl.textContent = `${stats.percentage}% NYLA knowledge gained`;
      knowledgeStatsEl.style.display = 'block';
      knowledgeStatsEl.style.color = '#FF6B35';
    }
  }

  // ===== BASE UI METHODS (previously inherited from V1) =====

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
    
    const messageElement = document.createElement('div');
    messageElement.className = `nyla-message nyla-message-${sender}`;
    
    const avatar = sender === 'nyla' ? '<img src="icons/NYLA.png" alt="NYLA" class="nyla-avatar-img">' : '👤';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
      <div class="message-header">
        <span class="message-avatar">${avatar}</span>
        <span class="message-sender">${sender === 'nyla' ? 'NYLA' : 'You'}</span>
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-content" data-text="${message.text}">
        ${sender === 'nyla' ? '' : this.formatMessageText(message.text)}
      </div>
    `;

    this.elements.messagesContainer.appendChild(messageElement);

    // Typing effect for NYLA messages
    if (sender === 'nyla') {
      await this.typeMessage(messageElement.querySelector('.message-content'), message.text);
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
    
    const formattedText = this.formatMessageText(text);
    
    // Create a temporary element to get plain text for typing
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formattedText;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    let currentText = '';
    
    for (let i = 0; i < plainText.length; i++) {
      currentText += plainText[i];
      
      // Update the element with formatted version up to current position
      const currentFormatted = this.formatMessageText(currentText);
      element.innerHTML = currentFormatted;
      
      // Scroll to bottom during typing
      this.scrollToBottom();
      
      // Wait before next character
      await this.sleep(this.typingSpeed);
    }
    
    // Ensure final formatting is applied
    element.innerHTML = formattedText;
    this.isTyping = false;
  }

  /**
   * Format message text with basic markdown-like formatting
   */
  formatMessageText(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/• /g, '<span class="bullet">•</span> ')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
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
   * Disable question buttons during processing
   */
  disableQuestionButtons() {
    const buttons = this.elements.questionsContainer.querySelectorAll('.nyla-question-btn');
    buttons.forEach(button => {
      button.disabled = true;
      button.classList.add('disabled');
    });
  }

  /**
   * Enable question buttons
   */
  enableQuestionButtons() {
    const buttons = this.elements.questionsContainer.querySelectorAll('.nyla-question-btn');
    buttons.forEach(button => {
      button.disabled = false;
      button.classList.remove('disabled');
    });
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