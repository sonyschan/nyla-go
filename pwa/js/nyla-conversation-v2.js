/**
 * NYLA Conversation Manager V2 - Phase 2 LLM-Powered System
 * Enhanced conversation intelligence with personal care features
 */

class NYLAConversationManagerV2 {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
    this.llmEngine = new NYLALLMEngine();
    
    // Conversation state
    this.conversationHistory = [];
    this.userProfile = this.createDefaultUserProfile();
    this.askedQuestions = new Set();
    this.currentContext = 'welcome';
    this.personalCareState = {
      lastMealCheck: null,
      lastMoodCheck: null,
      lastGeneralCheck: null,
      userResponses: {}
    };

    // Dynamic topic identification system (replaces v1 hardcoded topics)
    this.topicKeywords = {
      'nylagoCore': ['nyla', 'transfer', 'send', 'receive', 'command', 'how it works', 'how does', 'works', 'what is nyla', 'what does nyla do'],
      'supportedBlockchains': ['blockchain', 'chain', 'solana', 'ethereum', 'algorand', 'supported', 'which blockchain', 'what blockchain', 'network', 'fees', 'cost', 'cheap', 'expensive'],
      'platformLimitations': ['telegram', 'platform', 'support', 'twitter', 'x.com', 'social media', 'where can', 'which platform'],
      'raidFeature': ['raid', 'community', 'engage', 'engagement', 'three dots', '...', 'social', 'like', 'retweet', 'comment'],
      'qrCodes': ['qr', 'qr code', 'code', 'scan', 'payment', 'mobile', 'phone', 'share'],
      'nylaCommands': ['command', 'swap', 'transfer command', 'how to use', 'usage', 'syntax'],
      'about': ['about', 'what is', 'features', 'benefits', 'description', 'overview', 'introduction'],
      'stickers': ['sticker', 'emoji', 'reaction', 'fun', 'cute', 'image']
    };

    // Knowledge tracking and engagement
    this.knowledgeTracker = null;
    this.engagementState = {
      isShowingEngagement: false,
      currentEngagement: null,
      pendingFollowUps: null
    };

    // Initialize from storage
    this.loadFromStorage();
    this.initializeTimezone();
  }

  /**
   * Dynamically identify relevant knowledge base keys from user input
   * Replaces v1 hardcoded topic system with intelligent keyword matching
   */
  identifyRelevantKnowledgeKeys(userInput) {
    const inputLower = userInput.toLowerCase();
    const keywordScores = {};
    
    // Score each knowledge base key based on keyword matches
    for (const [knowledgeKey, keywords] of Object.entries(this.topicKeywords)) {
      let score = 0;
      
      for (const keyword of keywords) {
        if (inputLower.includes(keyword.toLowerCase())) {
          // Longer keywords get higher scores (more specific matches)
          score += keyword.length;
        }
      }
      
      if (score > 0) {
        keywordScores[knowledgeKey] = score;
      }
    }
    
    // Sort by score (highest first) and return top matches
    const sortedKeys = Object.entries(keywordScores)
      .sort(([,a], [,b]) => b - a)
      .map(([key]) => key);
    
    console.log('NYLA Conversation V2: Identified topics:', sortedKeys.slice(0, 3));
    
    return sortedKeys.slice(0, 3); // Return top 3 most relevant keys
  }

  /**
   * Initialize the conversation manager
   */
  async initialize() {
    try {
      console.log('NYLA Conversation V2: === Initializing ===');
      
      // Initialize knowledge tracker if available
      console.log('NYLA Conversation V2: Checking knowledge tracker availability...');
      if (typeof NYLAKnowledgeTracker !== 'undefined') {
        console.log('NYLA Conversation V2: Creating knowledge tracker...');
        this.knowledgeTracker = new NYLAKnowledgeTracker(this.kb);
        console.log('NYLA Conversation V2: ✅ Knowledge tracker initialized');
      } else {
        console.warn('NYLA Conversation V2: ⚠️ Knowledge tracker not available, engagement features disabled');
      }
      
      // Initialize LLM engine in background
      console.log('NYLA Conversation V2: Initializing LLM engine...');
      this.llmEngine.initialize().catch(error => {
        console.warn('NYLA Conversation V2: ⚠️ LLM initialization failed, falling back to rule-based system:', error);
      });

      console.log('NYLA Conversation V2: ✅ Initialized successfully');
      return true;
    } catch (error) {
      console.error('NYLA Conversation V2: ❌ Initialization failed:', error);
      console.error('NYLA Conversation V2: Error stack:', error.stack);
      return false;
    }
  }

  /**
   * Create default user profile with timezone detection
   */
  createDefaultUserProfile() {
    return {
      timezone: this.detectTimezone(),
      localTime: this.getLocalTime(),
      interests: [],
      conversationStyle: 'friendly',
      personalCarePreferences: {
        likesPersonalQuestions: null, // Will be learned
        preferredFrequency: 0.2
      },
      sessionStart: Date.now(),
      totalConversations: 0
    };
  }

  /**
   * Detect user's timezone
   */
  detectTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('NYLA Conversation V2: Timezone detection failed, using UTC');
      return 'UTC';
    }
  }

  /**
   * Get user's local time
   */
  getLocalTime() {
    try {
      const timezone = this.userProfile?.timezone || this.detectTimezone();
      return new Date().toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * Initialize timezone tracking
   */
  initializeTimezone() {
    // Update timezone and local time periodically
    setInterval(() => {
      this.userProfile.timezone = this.detectTimezone();
      this.userProfile.localTime = this.getLocalTime();
    }, 60000); // Update every minute
  }

  /**
   * Process user question with LLM enhancement
   * V2: Uses dynamic topic identification instead of hardcoded topics
   */
  async processQuestion(questionId, questionText) {
    try {
      console.log('NYLA Conversation V2: Processing question with LLM');
      
      // Identify relevant topics once and reuse throughout the process
      const identifiedTopics = this.identifyRelevantKnowledgeKeys(questionText);
      const primaryTopic = identifiedTopics.length > 0 ? identifiedTopics[0] : 'general';
      
      // Check if NYLA is on work break (only if knowledge tracker is available)
      if (this.knowledgeTracker) {
        const workStatus = this.knowledgeTracker.checkNYLAWorkStatus();
        if (workStatus.isWorking) {
          return this.generateWorkBreakResponse(workStatus);
        }
        
        // Handle NYLA just returned from work
        if (workStatus.justReturned) {
          return this.generateReturnFromWorkResponse(workStatus.returnMessage);
        }
      }
      
      // Update user profile
      this.userProfile.totalConversations++;
      this.userProfile.localTime = this.getLocalTime();
      
      // Track user interest using pre-identified topics
      this.trackUserInterest(primaryTopic);

      let response;
      
      // Hybrid approach: decide between LLM and rules
      const llmStatus = this.llmEngine.getStatus();
      console.log('NYLA Conversation V2: LLM Status:', llmStatus);
      
      const shouldUseLLM = this.shouldUseLLM(questionId, questionText);
      console.log('NYLA Conversation V2: Should use LLM:', shouldUseLLM, 'for question:', questionId);
      
      // Enhanced condition checking with detailed logging
      const llmConditionCheck = {
        shouldUseLLM: shouldUseLLM,
        llmInitialized: llmStatus.initialized,
        llmNotLoading: !llmStatus.loading,
        llmWarmedUp: llmStatus.warmedUp,
        overallCondition: shouldUseLLM && llmStatus.initialized && !llmStatus.loading && llmStatus.warmedUp
      };
      
      console.log('NYLA Conversation V2: 🔍 LLM Condition Check:', llmConditionCheck);
      console.log('NYLA Conversation V2: 📊 Full LLM Status:', llmStatus);
      
      // Check for Android debugging - try LLM even if not fully warmed up
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const shouldForceDebug = isMobile && shouldUseLLM && llmStatus.initialized && !llmStatus.loading;
      
      if (llmConditionCheck.overallCondition || shouldForceDebug) {
        if (shouldForceDebug) {
          console.log('NYLA Conversation V2: 🔧 ANDROID DEBUG: Forcing LLM attempt even if not warmed up');
        } else {
          console.log('NYLA Conversation V2: ✅ Using LLM for response generation');
        }
        response = await this.processWithLLM(questionId, questionText, identifiedTopics, null);
      } else {
        console.log('NYLA Conversation V2: ⚠️ Using rule-based system - LLM conditions not met');
        console.log('NYLA Conversation V2: 🚨 FAILING CONDITIONS:', {
          'shouldUseLLM (always true)': shouldUseLLM ? '✅' : '❌',
          'llmStatus.initialized': llmStatus.initialized ? '✅' : '❌',
          'NOT llmStatus.loading': !llmStatus.loading ? '✅' : '❌',
          'llmStatus.warmedUp': llmStatus.warmedUp ? '✅' : '❌',
          'isMobile': isMobile ? '✅' : '❌',
          'shouldForceDebug': shouldForceDebug ? '✅' : '❌'
        });
        
        // Special handling when engine is initializing but not warmed up
        if (llmStatus.initialized && !llmStatus.warmedUp) {
          console.log('NYLA Conversation V2: 🔥 LLM engine warming up GPU buffers...');
        }
        
        response = await this.processWithEnhancedRules(questionId, questionText, identifiedTopics);
      }
      
      // Track knowledge exposure (only if knowledge tracker is available)
      if (this.knowledgeTracker) {
        // Use pre-identified topics
        this.knowledgeTracker.trackKnowledgeFromConversation(questionId, questionText, primaryTopic, response.answer);
        
        // Check for engagement opportunity BEFORE generating follow-ups
        const shouldEngage = this.knowledgeTracker.shouldShowEngagementPrompt(this.isPersonalCareActive());
        
        if (shouldEngage) {
          // Store the original follow-ups for later
          this.engagementState.pendingFollowUps = response.followUps;
          
          // Generate engagement prompt
          const engagement = this.knowledgeTracker.generateEngagementPrompt();
          
          // Replace follow-ups with engagement actions
          response.followUps = this.convertEngagementToQuestions(engagement);
          response.engagementPrompt = engagement;
          
          this.engagementState.isShowingEngagement = true;
          this.engagementState.currentEngagement = engagement;
        }
      }
      
      return response;

    } catch (error) {
      console.error('NYLA Conversation V2: Question processing failed', error);
      return this.generateErrorResponse();
    }
  }

  /**
   * Determine if question should use LLM or rules (hybrid approach)
   * TEMPORARILY DISABLED: Always use LLM to test speed improvements
   */
  shouldUseLLM(questionId, questionText) {
    // TEMPORARILY: Always use LLM to test optimizations and knowledge base access
    return true;
    
    // Previous hybrid logic (commented out for testing)
    /*
    const ruleBasedQuestions = [
      'what-is-nyla',
      'how-to-send', 
      'how-to-receive',
      'supported-blockchains',
      'change-topic'
    ];
    
    // Note: V2 removed hardcoded topic checks, now uses dynamic identification
    if (ruleBasedQuestions.includes(questionId)) {
      return false;
    }
    
    const llmKeywords = ['why', 'how can', 'what if', 'compare', 'explain', 'understand', 'help me'];
    const hasComplexKeywords = llmKeywords.some(keyword => questionText.toLowerCase().includes(keyword));
    
    return hasComplexKeywords || questionText.length > 50;
    */
  }

  /**
   * Process question using LLM (supports streaming for UI)
   * Now uses dynamic topic identification instead of hardcoded topics
   */
  async processWithLLM(questionId, questionText, identifiedTopics, streamCallback = null) {
    console.log('🚀 NYLA Conversation V2: === processWithLLM CALLED ===');
    console.log('NYLA Conversation V2: LLM processing started for:', questionText);
    console.log('NYLA Conversation V2: QuestionId:', questionId);
    console.log('NYLA Conversation V2: Identified topics:', identifiedTopics);
    console.log('NYLA Conversation V2: Has stream callback:', !!streamCallback);
    
    // Check LLM engine status before proceeding
    const llmStatus = this.llmEngine.getStatus();
    console.log('NYLA Conversation V2: LLM Engine Status at start:', {
      initialized: llmStatus.initialized,
      loading: llmStatus.loading,
      ready: llmStatus.ready,
      warmedUp: llmStatus.warmedUp,
      model: llmStatus.model
    });
    
    // Use pre-identified topics from processQuestion method
    const relevantKeys = identifiedTopics || this.identifyRelevantKnowledgeKeys(questionText);
    
    // Use searchKnowledge to find relevant information for all identified keys
    let knowledgeContext = null;
    if (this.kb && this.kb.searchKnowledge) {
      const searchResults = [];
      
      // Search using the identified keys as search terms
      for (const key of relevantKeys) {
        const keywordSearch = this.topicKeywords[key]?.join(' ') || key;
        const result = this.kb.searchKnowledge(keywordSearch);
        if (result && result.length > 0) {
          searchResults.push(...result);
        }
      }
      
      // Also search using the original question text
      const directSearch = this.kb.searchKnowledge(questionText);
      if (directSearch && directSearch.length > 0) {
        searchResults.push(...directSearch);
      }
      
      // Combine and deduplicate results
      const uniqueResults = searchResults.filter((result, index, self) => 
        index === self.findIndex(r => r.source === result.source)
      );
      
      if (uniqueResults.length > 0) {
        knowledgeContext = {
          searchResults: uniqueResults,
          relevantKeys: relevantKeys,
          searchTerms: questionText
        };
      }
    }
    
    const conversationContext = {
      timezone: this.userProfile.timezone,
      localTime: this.userProfile.localTime,
      conversationHistory: this.conversationHistory.slice(-3), // Reduced from 5 to 3 for speed
      userProfile: this.userProfile,
      knowledgeContext: knowledgeContext
    };

    console.log('NYLA Conversation V2: Generating LLM response (timeout: 30s)...');
    console.log('NYLA Conversation V2: Question:', questionText);
    console.log('NYLA Conversation V2: Relevant knowledge keys:', relevantKeys);
    console.log('NYLA Conversation V2: Knowledge retrieved:', conversationContext.knowledgeContext);
    console.log('NYLA Conversation V2: Context provided to LLM:', {
      hasKnowledge: !!conversationContext.knowledgeContext,
      historyLength: conversationContext.conversationHistory.length,
      searchResultCount: conversationContext.knowledgeContext?.searchResults?.length || 0,
      relevantKeys: relevantKeys
    });
    
    // Set timeout to 30 seconds for LLM processing
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('LLM response timeout after 30 seconds')), 30000);
    });
    
    let llmResponse;
    try {
      // Use streaming or non-streaming based on whether callback is provided
      const llmPromise = streamCallback 
        ? this.llmEngine.generateStreamingResponse(questionText, conversationContext, streamCallback)
        : this.llmEngine.generateResponse(questionText, conversationContext);
      
      llmResponse = await Promise.race([llmPromise, timeoutPromise]);
      console.log('NYLA Conversation V2: ✅ LLM response completed');
      console.log('NYLA Conversation V2: LLM Response:', {
        text: llmResponse.text ? llmResponse.text.substring(0, 100) + '...' : 'No text',
        hasFollowUps: !!llmResponse.followUpSuggestions,
        followUpCount: llmResponse.followUpSuggestions ? llmResponse.followUpSuggestions.length : 0
      });
    } catch (error) {
      console.warn('NYLA Conversation V2: LLM timeout (30s) or error:', error.message);
      
      // Generate debug information instead of falling back to rules
      const llmStatus = this.llmEngine.getStatus();
      const debugInfo = {
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
        confidence: 1.0,
        isDebugInfo: true
      };
      
      // Return debug response instead of fallback
      return {
        answer: debugInfo,
        followUps: [
          { id: 'retry-llm', text: '🔄 Try again' },
          { id: 'what-is-nyla', text: 'What is NYLA?' },
          { id: 'how-to-use', text: 'How do I use NYLA transfers?' }
        ],
        isLLMGenerated: false,
        isDebugResponse: true
      };
    }
    
    // Process personal care if suggested by LLM (simplified)
    if (llmResponse.personalCare?.shouldAsk) {
      llmResponse.text += `\n\n${llmResponse.personalCare.message}`;
      this.trackPersonalCareQuestion(llmResponse.personalCare.type);
    }

    // Use pre-identified topics from processQuestion method
    const primaryTopic = identifiedTopics && identifiedTopics.length > 0 ? identifiedTopics[0] : 'general';
    
    // Debug LLM response before generating followups
    console.log('NYLA Conversation V2: LLM followup suggestions before generateIntelligentFollowUps:', llmResponse.followUpSuggestions);
    
    const followUps = this.generateIntelligentFollowUps(llmResponse, primaryTopic, questionText);
    
    // Select appropriate sticker
    const sticker = this.selectIntelligentSticker(llmResponse.sentiment, llmResponse.text, questionText);

    // Save conversation with primary identified topic
    this.saveConversation(questionText, llmResponse, primaryTopic);

    return {
      answer: {
        text: llmResponse.text,
        sentiment: llmResponse.sentiment,
        confidence: llmResponse.confidence || 0.8
      },
      followUps,
      sticker,
      timestamp: Date.now(),
      isLLMGenerated: true
    };
  }

  /**
   * Process with enhanced rule-based system (fallback)
   */
  async processWithEnhancedRules(questionId, questionText, identifiedTopics) {
    // Enhanced version of original rule-based system (V2 updated)
    const answer = await this.generateEnhancedAnswer(questionId, questionText, identifiedTopics);
    
    // Add personal care check with timezone awareness (20% probability)
    const personalCareCheck = this.generatePersonalCareCheck();
    if (personalCareCheck) {
      answer.text += `\n\n${personalCareCheck.message}`;
      this.trackPersonalCareQuestion(personalCareCheck.type);
    }

    // Use pre-identified topics from processQuestion method
    const primaryTopic = identifiedTopics.length > 0 ? identifiedTopics[0] : 'general';
    
    const followUps = this.generateContextualFollowUps(answer, primaryTopic, questionText, answer.isChangeTopicResponse);
    const sticker = this.selectSticker(answer.sentiment);

    this.saveConversation(questionText, answer, primaryTopic);

    return {
      answer,
      followUps,
      sticker,
      timestamp: Date.now(),
      isLLMGenerated: false
    };
  }

  /**
   * Generate personal care check with timezone awareness
   */
  generatePersonalCareCheck() {
    const shouldAsk = Math.random() < this.userProfile.personalCarePreferences.preferredFrequency;
    
    if (!shouldAsk) return null;

    const now = Date.now();
    const hour = new Date(this.userProfile.localTime).getHours();

    // Meal time checks
    if (hour >= 6 && hour < 10 && this.shouldAskMealCheck('breakfast')) {
      this.personalCareState.lastMealCheck = now;
      return {
        type: 'meal',
        message: `BTW, it's ${hour}:00 in your timezone - did you have breakfast yet? ☕`
      };
    }

    if (hour >= 12 && hour < 14 && this.shouldAskMealCheck('lunch')) {
      this.personalCareState.lastMealCheck = now;
      return {
        type: 'meal',
        message: `Oh, it's lunch time where you are (${hour}:00)! Taking a break? 🍽️`
      };
    }

    if (hour >= 18 && hour < 20 && this.shouldAskMealCheck('dinner')) {
      this.personalCareState.lastMealCheck = now;
      return {
        type: 'meal',
        message: `It's dinner time in your area (${hour}:00) - hope you're eating well! 🌙`
      };
    }

    // Late night check
    if ((hour >= 22 || hour < 6) && this.shouldAskGeneralCheck()) {
      this.personalCareState.lastGeneralCheck = now;
      return {
        type: 'general',
        message: `It's getting late where you are - don't stay up too late learning about crypto! 😴`
      };
    }

    // Mood check
    if (this.shouldAskMoodCheck()) {
      this.personalCareState.lastMoodCheck = now;
      return {
        type: 'mood',
        message: `BTW, how are you feeling today? 😊`
      };
    }

    return null;
  }

  /**
   * Check if should ask meal question
   */
  shouldAskMealCheck(mealType) {
    const lastCheck = this.personalCareState.lastMealCheck;
    if (!lastCheck) return true;
    
    // Don't ask again within 4 hours
    return (Date.now() - lastCheck) > (4 * 60 * 60 * 1000);
  }

  /**
   * Check if should ask mood question
   */
  shouldAskMoodCheck() {
    const lastCheck = this.personalCareState.lastMoodCheck;
    if (!lastCheck) return true;
    
    // Don't ask again within 6 hours
    return (Date.now() - lastCheck) > (6 * 60 * 60 * 1000);
  }

  /**
   * Check if should ask general question
   */
  shouldAskGeneralCheck() {
    const lastCheck = this.personalCareState.lastGeneralCheck;
    if (!lastCheck) return true;
    
    // Don't ask again within 2 hours
    return (Date.now() - lastCheck) > (2 * 60 * 60 * 1000);
  }

  /**
   * Track personal care question
   */
  trackPersonalCareQuestion(type) {
    const now = Date.now();
    
    switch (type) {
      case 'meal':
        this.personalCareState.lastMealCheck = now;
        break;
      case 'mood':
        this.personalCareState.lastMoodCheck = now;
        break;
      case 'general':
        this.personalCareState.lastGeneralCheck = now;
        break;
    }
  }

  /**
   * Handle personal care response
   */
  handlePersonalCareResponse(response, careType) {
    // Learn user preferences
    this.personalCareState.userResponses[careType] = this.personalCareState.userResponses[careType] || [];
    this.personalCareState.userResponses[careType].push({
      response: response.toLowerCase(),
      timestamp: Date.now()
    });

    // Adjust preference based on responses
    const responses = this.personalCareState.userResponses[careType];
    const recentResponses = responses.slice(-3); // Last 3 responses
    
    const positiveKeywords = ['good', 'great', 'fine', 'yes', 'yeah', 'thanks', 'appreciate'];
    const negativeKeywords = ['no', 'not', 'stop', 'enough', 'annoying'];
    
    const positiveCount = recentResponses.filter(r => 
      positiveKeywords.some(keyword => r.response.includes(keyword))
    ).length;
    
    const negativeCount = recentResponses.filter(r =>
      negativeKeywords.some(keyword => r.response.includes(keyword))
    ).length;

    if (negativeCount > positiveCount) {
      // User doesn't like personal questions, reduce frequency
      this.userProfile.personalCarePreferences.preferredFrequency = Math.max(0.05, this.userProfile.personalCarePreferences.preferredFrequency * 0.5);
      this.userProfile.personalCarePreferences.likesPersonalQuestions = false;
    } else if (positiveCount > 0) {
      // User likes personal questions, can maintain or slightly increase frequency
      this.userProfile.personalCarePreferences.likesPersonalQuestions = true;
    }

    // Generate appropriate response
    return this.generatePersonalCareResponse(response, careType);
  }

  /**
   * Generate response to personal care
   */
  generatePersonalCareResponse(userResponse, careType) {
    const standardResponses = {
      meal: {
        positive: ["That's great! Staying fueled is important 💪", "Good to hear! Enjoy your meal 😊", "Awesome! Good nutrition helps with everything 🌟"],
        negative: ["Make sure to grab something when you can! 🍽️", "Don't forget to eat - your brain needs fuel! 🧠", "Take care of yourself first! 💚"],
        default: ["Thanks for sharing! 😊"]
      },
      mood: {
        positive: ["So glad to hear that! ✨", "That's wonderful! 🌟", "Love the positive energy! 💫"],
        negative: ["I hope things get better soon 💚", "Take it easy on yourself 🌿", "Tomorrow's a new day! 🌅"],
        default: ["Thanks for letting me know 😊"]
      },
      general: {
        positive: ["Good call! Rest is important 😴", "Smart choice! Sleep well 🌙", "Take care of yourself! 💤"],
        default: ["Hope you get some good rest! 😊"]
      }
    };

    // Special responses for naughty/playful answers
    const naughtyResponses = {
      meal: [
        "Haha! I love that energy! 🔥 Knowledge is definitely nutritious for the soul 📚",
        "That's beautifully poetic! 💫 Just remember to feed your body too sometimes! 😄",
        "You're amazing! 🌟 But even awesome people need snacks sometimes! 🥨",
        "Living your best life! 🚀 Dreams and tokens are great, but don't forget the basics! 😊",
        "I admire the dedication! 💪 Just make sure being awesome includes self-care! 💚"
      ],
      mood: [
        "I absolutely LOVE this vibe! 💫 Your creativity is inspiring! ✨",
        "Wow, that's beautifully put! 😍 Loneliness as inspiration - you're a poet! 🎭",
        "Living deliciously! 😈 I can feel the good energy through the screen! ⚡",
        "That chaos energy is PERFECT for crypto! 🌪️ You're in the right place! 🔥",
        "Dangerous and crypto go hand in hand! 😎 Love the rebellious spirit! 🚀"
      ],
      general: [
        "Nighthawks unite! 🦉 The best conversations happen after dark! 🌙",
        "You're absolutely right! 🌟 Ordinary is overrated anyway! ✨",
        "YES! 🔥 The night brings out the best ideas! Prime time indeed! 🚀",
        "A creative soul! 🎨 Darkness does fuel the most amazing thoughts! 💫",
        "I'm here for this energy! ⭐ Let's make this late night productive! 💪"
      ]
    };

    const userLower = userResponse.toLowerCase();

    // Check for naughty/playful responses first
    const naughtyKeywords = {
      meal: ['hungry for knowledge', 'feasting on wisdom', 'appetite is for adventure', 'dining on dreams', 'too busy being awesome'],
      mood: ['lonely makes me feel inspiring', 'deliciously rebellious', 'mysteriously wonderful', 'chaos is my middle name', 'living dangerously'],
      general: ['nighthawk', 'sleep is for the ordinary', 'night is young', 'darkness fuels', 'late night = prime time']
    };

    const categoryKeywords = naughtyKeywords[careType] || naughtyKeywords.general;
    const isNaughtyResponse = categoryKeywords.some(keyword => userLower.includes(keyword.toLowerCase()));

    if (isNaughtyResponse) {
      const naughtyResponseArray = naughtyResponses[careType] || naughtyResponses.general;
      const randomNaughtyResponse = naughtyResponseArray[Math.floor(Math.random() * naughtyResponseArray.length)];
      
      return {
        text: randomNaughtyResponse,
        sentiment: 'excited',
        isPersonalCareResponse: true,
        isNaughtyResponse: true
      };
    }

    // Standard response logic
    const categoryResponses = standardResponses[careType] || standardResponses.general;

    let responseArray;
    if (userLower.includes('good') || userLower.includes('great') || userLower.includes('yes') || userLower.includes('fine')) {
      responseArray = categoryResponses.positive || categoryResponses.default;
    } else if (userLower.includes('not') || userLower.includes('bad') || userLower.includes('tired') || userLower.includes('no')) {
      responseArray = categoryResponses.negative || categoryResponses.default;
    } else {
      responseArray = categoryResponses.default;
    }

    const randomResponse = responseArray[Math.floor(Math.random() * responseArray.length)];
    
    return {
      text: randomResponse,
      sentiment: 'friendly',
      isPersonalCareResponse: true
    };
  }

  /**
   * Generate intelligent follow-ups using context
   */
  generateIntelligentFollowUps(llmResponse, topic, originalQuestion, isChangeTopicResponse = false) {
    let followUps = [];
    
    // Debug LLM followup suggestions at start of method
    console.log('NYLA Conversation V2: generateIntelligentFollowUps received:', {
      hasFollowUps: !!llmResponse.followUpSuggestions,
      followUpCount: llmResponse.followUpSuggestions ? llmResponse.followUpSuggestions.length : 0,
      followUps: llmResponse.followUpSuggestions
    });
    
    // Use LLM suggestions if available
    if (llmResponse.followUpSuggestions && llmResponse.followUpSuggestions.length > 0) {
      console.log('NYLA Conversation V2: ✅ Using LLM followup suggestions');
      followUps = llmResponse.followUpSuggestions.map((suggestion, index) => {
        // Handle both old format (strings) and new format (objects)
        let followUp;
        if (typeof suggestion === 'string') {
          followUp = {
            id: `llm-followup-${Date.now()}-${index}`,
            text: suggestion,
            topic: topic,
            source: 'llm'
          };
        } else {
          followUp = {
            id: `llm-followup-${Date.now()}-${index}`,
            text: suggestion.text,
            topic: suggestion.topic || topic,
            context: suggestion.context,
            source: 'llm'
          };
        }
        
        // Detect and convert actionable buttons (like "Try the Send tab")
        const actionableButton = this.detectActionableButton(followUp.text);
        if (actionableButton) {
          followUp.action = actionableButton.action;
          followUp.targetTab = actionableButton.targetTab;
          followUp.actionType = 'tabSwitch';
        }
        
        return followUp;
      });
    } else {
      console.log('NYLA Conversation V2: ⚠️ No LLM followups available, using contextual generation');
      // Fallback to contextual generation (topic parameter passed from calling method)
      followUps = this.generateContextualFollowUps({ sentiment: llmResponse.sentiment }, topic, originalQuestion);
    }

    // Apply Change Topic logic (unless this IS a change topic response or already has isChangeTopicResponse flag)
    if (!isChangeTopicResponse && !llmResponse.isChangeTopicResponse) {
      return this.addChangeTopicOption(followUps);
    }
    
    return followUps;
  }

  /**
   * Detect actionable buttons that should trigger tab switches
   */
  detectActionableButton(buttonText) {
    const actionPatterns = [
      {
        pattern: /try.*send.*tab/i,
        action: 'switchToSend',
        targetTab: 'send'
      },
      {
        pattern: /try.*receive.*tab/i,
        action: 'switchToReceive', 
        targetTab: 'receive'
      },
      {
        pattern: /try.*raid.*tab/i,
        action: 'switchToRaid',
        targetTab: 'raid'
      },
      {
        pattern: /explore.*send/i,
        action: 'switchToSend',
        targetTab: 'send'
      },
      {
        pattern: /explore.*receive/i,
        action: 'switchToReceive',
        targetTab: 'receive'
      },
      {
        pattern: /check.*raid/i,
        action: 'switchToRaid',
        targetTab: 'raid'
      }
    ];
    
    for (const actionPattern of actionPatterns) {
      if (actionPattern.pattern.test(buttonText)) {
        console.log(`NYLA Conversation V2: Detected actionable button: "${buttonText}" → ${actionPattern.action}`);
        return {
          action: actionPattern.action,
          targetTab: actionPattern.targetTab
        };
      }
    }
    
    return null;
  }

  /**
   * Add Change Topic option with proper limit management
   */
  addChangeTopicOption(followUps) {
    // If we have 5 or more options, remove the last one to make room
    if (followUps.length >= 5) {
      followUps = followUps.slice(0, 3); // Keep only first 3 to make room for Change Topic
    }
    
    // Add Change Topic as the last option
    followUps.push({
      id: 'change-topic',
      text: '🔄 Change topic',
      action: 'changeTopic',
      context: 'topic switch'
    });
    
    return followUps;
  }

  /**
   * Enhanced sticker selection with LLM context
   */
  selectIntelligentSticker(sentiment, responseText, originalQuestion) {
    const stickers = this.kb && this.kb.getKnowledge ? this.kb.getKnowledge('stickers') : null;
    if (!stickers || !stickers.sentimentMap) {
      return null;
    }

    // Analyze context for better sticker selection
    const textLower = (responseText + ' ' + originalQuestion).toLowerCase();
    
    // Context-aware sticker mapping
    if (textLower.includes('transfer') && textLower.includes('success')) {
      sentiment = 'excited'; // Celebration for successful transfers
    } else if (textLower.includes('sorry') || textLower.includes('error')) {
      sentiment = 'sorry';
    } else if (textLower.includes('question') || textLower.includes('help')) {
      sentiment = 'helpful';
    }

    // Find appropriate sticker
    for (const [filename, data] of Object.entries(stickers.sentimentMap)) {
      if (data.sentiment === sentiment) {
        return {
          filename,
          path: `${stickers.path}/${filename}`,
          emotion: data.emotion
        };
      }
    }

    // Default sticker
    return {
      filename: 'goodnight.jpg',
      path: `${stickers.path}/goodnight.jpg`,
      emotion: 'welcoming'
    };
  }

  // ... [Continue with rest of the methods, extending the original conversation manager]

  /**
   * Enhanced answer generation (fallback method)
   * Updated to use V2 dynamic topic identification
   */
  async generateEnhancedAnswer(questionId, questionText, identifiedTopics) {
    // This is an enhanced version of the original generateAnswer method
    // with better context awareness and timezone considerations
    
    // Use pre-identified topics from processQuestion method
    const relevantKeys = identifiedTopics;
    let knowledge = null;
    
    if (this.kb && this.kb.searchKnowledge) {
      const searchResults = [];
      
      // Search using identified keys
      for (const key of relevantKeys) {
        const keywordSearch = this.topicKeywords[key]?.join(' ') || key;
        const result = this.kb.searchKnowledge(keywordSearch);
        if (result && result.length > 0) {
          searchResults.push(...result);
        }
      }
      
      // Also search using the original question
      const directSearch = this.kb.searchKnowledge(questionText);
      if (directSearch && directSearch.length > 0) {
        searchResults.push(...directSearch);
      }
      
      // Use first result for compatibility with legacy code
      if (searchResults.length > 0) {
        knowledge = searchResults[0].data;
      }
    }
    
    switch (questionId) {
      case 'what-is-nyla':
        return this.generateWhatIsNYLAAnswerEnhanced(knowledge);
      case 'how-to-send':
        return this.generateTransferAnswerEnhanced(knowledge, 'send');
      case 'how-to-receive':
        return this.generateTransferAnswerEnhanced(knowledge, 'receive');
      default:
        return this.generateGenericAnswerEnhanced(questionText, knowledge);
    }
  }

  /**
   * Enhanced "What is NYLA" answer with personality
   */
  generateWhatIsNYLAAnswerEnhanced(knowledge) {
    const hour = new Date(this.userProfile.localTime).getHours();
    let greeting = '';
    
    if (hour < 12) {
      greeting = 'Good morning! ☀️ ';
    } else if (hour < 18) {
      greeting = 'Good afternoon! 🌟 ';
    } else {
      greeting = 'Good evening! 🌙 ';
    }

    return {
      text: `${greeting}Great question! Let me explain both NYLA and NYLAGo:\n\n**NYLA** 🧠 is the core AI token and ecosystem that powers blockchain transfers and community building.\n\n**NYLAGo** 🚀 is this user-friendly tutorial app you're using right now! It makes NYLA accessible by providing:\n\n• **Tutorial Interface**: Step-by-step guidance for crypto transfers\n• **Simple Forms**: Easy QR code generation and payment requests\n• **Multi-Chain Support**: Works with Solana, Ethereum, and Algorand\n• **Community Features**: Raids and app showcases\n• **Beginner-Friendly**: No technical expertise required!\n\nI'm NYLA's AI assistant, here to help you learn and navigate the crypto world through NYLAGo's interface! What would you like to explore first?`,
      sentiment: 'excited',
      confidence: 0.95
    };
  }

  /**
   * Enhanced generic answer for other questions
   */
  generateGenericAnswerEnhanced(questionText, knowledge) {
    const hour = new Date(this.userProfile.localTime).getHours();
    let greeting = '';
    
    if (hour < 12) {
      greeting = 'Good morning! ☀️ ';
    } else if (hour < 18) {
      greeting = 'Good afternoon! 🌟 ';
    } else {
      greeting = 'Good evening! 🌙 ';
    }

    // Use knowledge base if available
    if (knowledge && knowledge.content) {
      let response = `${greeting}Great question! `;
      
      if (knowledge.content.description) {
        response += knowledge.content.description;
      } else if (knowledge.content.answer) {
        response += knowledge.content.answer;
      } else if (typeof knowledge.content === 'string') {
        response += knowledge.content;
      } else {
        response += "I'd be happy to help you with NYLA and cryptocurrency questions!";
      }
      
      // Add helpful context about NYLAGo
      response += "\n\nRemember, you're using NYLAGo - the tutorial interface that makes NYLA accessible to everyone! Feel free to explore the Send, Receive, and Swap tabs to try out the features.";
      
      return {
        text: response,
        sentiment: 'helpful',
        confidence: 0.85
      };
    }

    // Fallback response when no knowledge available
    return {
      text: `${greeting}That's an interesting question! While I don't have specific information about that right now, I'm here to help you with NYLA transfers, blockchain basics, and using NYLAGo.\n\nNYLAGo is designed to make cryptocurrency accessible through simple tutorials and guided workflows. Would you like to learn about making transfers or exploring the community features?`,
      sentiment: 'helpful',
      confidence: 0.7
    };
  }

  /**
   * Enhanced transfer answer for send/receive questions
   */
  generateTransferAnswerEnhanced(knowledge, type) {
    const hour = new Date(this.userProfile.localTime).getHours();
    let greeting = '';
    
    if (hour < 12) {
      greeting = 'Good morning! ☀️ ';
    } else if (hour < 18) {
      greeting = 'Good afternoon! 🌟 ';
    } else {
      greeting = 'Good evening! 🌙 ';
    }

    let response = `${greeting}Great question about ${type === 'send' ? 'sending' : 'receiving'} NYLA! `;
    
    if (type === 'send') {
      response += `Here's how to send NYLA payments:\n\n• **Use the Send Tab**: Click on "Send" at the top of NYLAGo\n• **Enter Recipient**: Add their X (Twitter) username\n• **Choose Amount**: Select how much NYLA to send\n• **Pick Blockchain**: Solana, Ethereum, or Algorand\n• **Share on X**: Click "Send to X.com" to post the transfer request\n\nThe recipient can then claim the payment through the NYLA system! 💸`;
    } else {
      response += `Here's how to receive NYLA payments:\n\n• **Use the Receive Tab**: Click on "Receive" at the top of NYLAGo\n• **Set Your Details**: Enter your X username and desired amount\n• **Generate QR Code**: Automatically created for easy sharing\n• **Share Payment Request**: Use the QR code or share button\n• **Get Paid**: Others can scan or click to send you NYLA\n\nIt's that simple! The QR code makes it super easy for others to pay you. 💰`;
    }
    
    response += `\n\nNYLAGo makes crypto transfers as easy as social media posts. Try it out using the tabs above!`;
    
    return {
      text: response,
      sentiment: 'helpful',
      confidence: 0.9
    };
  }

  /**
   * Track user interests with enhanced analytics
   */
  trackUserInterest(topic) {
    // Ensure interests is an array (fix TypeError)
    if (!this.userProfile.interests || !Array.isArray(this.userProfile.interests)) {
      console.warn('NYLA Conversation V2: userProfile.interests is not an array, initializing:', this.userProfile.interests);
      this.userProfile.interests = [];
    }
    
    if (!this.userProfile.interests.includes(topic)) {
      this.userProfile.interests.push(topic);
    }
    
    // Keep only recent interests (max 10)
    if (this.userProfile.interests.length > 10) {
      this.userProfile.interests = this.userProfile.interests.slice(-10);
    }
  }

  /**
   * Save conversation with enhanced metadata
   */
  saveConversation(question, answer, topic) {
    const conversation = {
      question,
      answer: typeof answer === 'string' ? answer : answer.text,
      topic,
      timestamp: Date.now(),
      timezone: this.userProfile.timezone,
      localTime: this.userProfile.localTime,
      confidence: answer.confidence || 0.7,
      sentiment: answer.sentiment || 'helpful'
    };

    this.conversationHistory.push(conversation);
    
    // Keep only last 50 conversations
    if (this.conversationHistory.length > 50) {
      this.conversationHistory = this.conversationHistory.slice(-50);
    }
    
    this.saveToStorage();
  }

  /**
   * Enhanced storage save with V2 data
   */
  saveToStorage() {
    try {
      localStorage.setItem('nyla_conversation_history_v2', JSON.stringify(this.conversationHistory));
      localStorage.setItem('nyla_user_profile_v2', JSON.stringify(this.userProfile));
      localStorage.setItem('nyla_personal_care_state', JSON.stringify(this.personalCareState));
      localStorage.setItem('nyla_asked_questions_v2', JSON.stringify([...this.askedQuestions]));
    } catch (error) {
      console.error('NYLA Conversation V2: Failed to save to storage', error);
    }
  }

  /**
   * Enhanced storage load with V2 data
   */
  loadFromStorage() {
    try {
      // Load V2 data first, fallback to V1 if needed
      const historyV2 = localStorage.getItem('nyla_conversation_history_v2');
      if (historyV2) {
        this.conversationHistory = JSON.parse(historyV2);
      } else {
        // Migrate from V1
        const historyV1 = localStorage.getItem('nyla_conversation_history');
        if (historyV1) {
          this.conversationHistory = JSON.parse(historyV1);
        }
      }

      const profileV2 = localStorage.getItem('nyla_user_profile_v2');
      if (profileV2) {
        this.userProfile = { ...this.createDefaultUserProfile(), ...JSON.parse(profileV2) };
      } else {
        // Migrate from V1
        const profileV1 = localStorage.getItem('nyla_user_profile');
        if (profileV1) {
          const oldProfile = JSON.parse(profileV1);
          this.userProfile = { ...this.createDefaultUserProfile(), ...oldProfile };
        }
      }

      const personalCareState = localStorage.getItem('nyla_personal_care_state');
      if (personalCareState) {
        this.personalCareState = { ...this.personalCareState, ...JSON.parse(personalCareState) };
      }

      const questionsV2 = localStorage.getItem('nyla_asked_questions_v2');
      if (questionsV2) {
        this.askedQuestions = new Set(JSON.parse(questionsV2));
      }

    } catch (error) {
      console.error('NYLA Conversation V2: Failed to load from storage', error);
    }
  }

  /**
   * Get enhanced statistics
   */
  getStats() {
    return {
      totalConversations: this.conversationHistory.length,
      userInterests: this.userProfile.interests,
      timezone: this.userProfile.timezone,
      sessionDuration: Date.now() - this.userProfile.sessionStart,
      llmEnabled: this.llmEngine.isReady(),
      personalCareEnabled: this.userProfile.personalCarePreferences.likesPersonalQuestions !== false,
      averageConfidence: this.conversationHistory.length > 0 
        ? this.conversationHistory.reduce((sum, conv) => sum + (conv.confidence || 0.7), 0) / this.conversationHistory.length 
        : 0.7
    };
  }

  // Extend all other methods from original conversation manager...
  generateWelcomeQuestions() {
    const hour = new Date(this.userProfile.localTime).getHours();
    let timeContext = '';
    
    if (hour < 12) {
      timeContext = 'morning';
    } else if (hour < 18) {
      timeContext = 'afternoon';
    } else {
      timeContext = 'evening';
    }

    return [
      { id: 'what-is-nyla', text: 'What is NYLA?' },
      { id: 'how-to-send', text: 'How do I send tokens?' },
      { id: 'how-to-receive', text: 'How do I receive payments?' },
      { id: 'supported-blockchains', text: 'What blockchains are supported?' }
    ];
  }

  generateContextualFollowUps(answer, topic, originalQuestion, isChangeTopicResponse = false) {
    let contextualFollowUps = [];
    
    // Generate highly contextual follow-ups based on the actual response content
    const responseText = answer.text?.toLowerCase() || '';
    const questionText = originalQuestion?.toLowerCase() || '';
    
    // For "What is NYLA?" responses - provide exploration options mentioned in the response
    if (questionText.includes('what is nyla') || topic === 'nylagoCore' || topic === 'about') {
      contextualFollowUps = [
        { id: 'try-send-tab', text: '💸 Try the Send tab', context: 'hands-on practice' },
        { id: 'explore-receive', text: '💰 Explore Receive payments', context: 'hands-on practice' },
        { id: 'check-community', text: '🎯 Check out Raids & Apps', context: 'community features' },
        { id: 'learn-blockchains', text: '⛓️ Which blockchains are supported?', context: 'technical details' }
      ];
    }
    // For transfer-related responses
    else if (responseText.includes('transfer') || responseText.includes('send') || responseText.includes('receive') || topic === 'nylagoCore' || topic === 'nylaCommands') {
      contextualFollowUps = [
        { id: 'try-send-now', text: '💸 Try sending now', context: 'hands-on practice' },
        { id: 'qr-code-help', text: '📱 How do QR codes work?', context: 'technical details' },
        { id: 'blockchain-choice', text: '⛓️ Which blockchain should I use?', context: 'decision help' },
        { id: 'fees-info', text: '💰 What about fees?', context: 'cost information' }
      ];
    }
    // For community/feature responses
    else if (responseText.includes('community') || responseText.includes('raid') || responseText.includes('app') || topic === 'raidFeature') {
      contextualFollowUps = [
        { id: 'join-raid', text: '🎯 How do I join a raid?', context: 'participation guide' },
        { id: 'community-apps', text: '🚀 Show me community apps', context: 'app exploration' },
        { id: 'get-started-transfer', text: '💸 Get started with transfers', context: 'basic tutorial' },
        { id: 'social-features', text: '📱 Social media integration', context: 'social features' }
      ];
    }
    // For blockchain/technical responses
    else if (responseText.includes('blockchain') || responseText.includes('solana') || responseText.includes('ethereum') || topic === 'supportedBlockchains') {
      contextualFollowUps = [
        { id: 'try-solana', text: '🟢 Try Solana transfers', context: 'hands-on practice' },
        { id: 'try-ethereum', text: '🔷 Try Ethereum transfers', context: 'hands-on practice' },
        { id: 'blockchain-compare', text: '⚖️ Compare blockchains', context: 'comparison guide' },
        { id: 'gas-fees', text: '⛽ Understanding fees', context: 'cost education' }
      ];
    }
    // Generic fallback (should rarely be used)
    else {
      contextualFollowUps = [
        { id: 'what-is-nyla', text: '🧠 What is NYLA?', context: 'basic introduction' },
        { id: 'how-to-transfer', text: '💸 How do I make transfers?', context: 'tutorial' },
        { id: 'explore-features', text: '🚀 Explore NYLAGo features', context: 'feature overview' }
      ];
    }
    
    // Only add Change Topic option if this is NOT a change topic response
    if (!isChangeTopicResponse) {
      contextualFollowUps.push({ 
        id: 'change-topic', 
        text: '🔄 Ask about something else', 
        action: 'changeTopic',
        context: 'topic switch'
      });
    }
    
    return contextualFollowUps.slice(0, 4); // Limit to 4 follow-ups
  }

  selectSticker(sentiment) {
    return this.selectIntelligentSticker(sentiment, '', '');
  }

  generateErrorResponse() {
    return {
      answer: {
        text: "Oops! Something went wrong. 😅\n\nLet me try to help you with something else! What would you like to know about NYLA?",
        sentiment: 'apologetic',
        confidence: 0.5
      },
      followUps: this.generateWelcomeQuestions(),
      sticker: this.selectSticker('sorry'),
      timestamp: Date.now()
    };
  }

  /**
   * Handle Change Topic action with friendly responses
   */
  async handleChangeTopicAction() {
    this.currentContext = 'welcome';
    
    // Friendly responses for topic change as requested by user
    const friendlyResponses = [
      "Sure! What's in your mind? 🤔",
      "Of course! What would you like to talk about? ✨", 
      "Absolutely! What's on your mind today? 💫",
      "No problem! What interests you? 🚀",
      "Perfect! What would you like to explore? 🌟",
      "Great idea! What should we discuss? 💡",
      "Sure thing! What questions do you have? 🤗",
      "Let's do it! What topic catches your interest? 🎯"
    ];
    
    const randomResponse = friendlyResponses[Math.floor(Math.random() * friendlyResponses.length)];
    
    // Generate fresh welcome questions 
    const followUps = this.generateWelcomeQuestions();
    
    return {
      answer: {
        text: randomResponse,
        sentiment: 'friendly',
        confidence: 1.0,
        isChangeTopicResponse: true
      },
      followUps: followUps,
      sticker: this.selectSticker('friendly'),
      timestamp: Date.now(),
      isChangeTopicResponse: true
    };
  }

  // Keep the old method for backward compatibility
  changeTopicAction() {
    return this.handleChangeTopicAction();
  }

  /**
   * Check if personal care is active
   */
  isPersonalCareActive() {
    // Check if we recently showed personal care (within last 5 minutes)
    const recentCare = ['lastMealCheck', 'lastMoodCheck', 'lastGeneralCheck']
      .some(key => {
        const timestamp = this.personalCareState[key];
        return timestamp && (Date.now() - timestamp) < 5 * 60 * 1000;
      });
    
    return recentCare;
  }

  /**
   * Convert engagement prompt to question format
   */
  convertEngagementToQuestions(engagement) {
    return engagement.actions.map((action, index) => ({
      id: `engagement-${engagement.category}-${index}`,
      text: action.text,
      action: 'handleEngagement',
      engagementAction: action.action,
      engagementType: action.type,
      engagementCategory: engagement.category
    }));
  }

  /**
   * Handle engagement action responses
   */
  async handleEngagementAction(actionType, category) {
    this.engagementState.isShowingEngagement = false;
    
    const responses = {
      // Category 1: X.com Feedback
      openXFeedback: {
        text: "Awesome! 🎉 Thanks for helping spread the word about NYLAGo! Your feedback means the world to us! 💫",
        sentiment: 'excited',
        action: 'openXPost'
      },
      
      // Category 2: Community Engagement  
      navigateToRaids: {
        text: "LFG! 🔥 The community is going to love having you! Let's check out what raids are happening! 🎯",
        sentiment: 'excited',
        action: 'navigateToTab',
        tabTarget: 'raid'
      },
      
      // Category 3: Transfer Encouragement
      navigateToSend: {
        text: "Perfect! 💸 Let's create a transfer that gets everyone excited! Time to go viral with NYLA! 🚀",
        sentiment: 'excited',
        action: 'navigateToTab',
        tabTarget: 'send'
      },
      
      // Category 4: NYLA Work Break
      acceptNYLABreak: {
        text: "Thanks for understanding! 😊 I'll be back soon with fresh energy! 💪",
        sentiment: 'friendly',
        action: 'startWorkBreak'
      },
      
      tryToStayEngaged: {
        text: "Aww, you're so sweet! 🥺 Let me help with one more quick question, then I really need to go! 💙",
        sentiment: 'friendly',
        action: 'delayWorkBreak'
      },
      
      // Soft reject for all categories
      continueConversation: {
        text: "No worries at all! 😊 I'm here whenever you're ready! What else would you like to know? ✨",
        sentiment: 'friendly',
        action: 'continueNormal'
      }
    };
    
    const response = responses[actionType] || responses.continueConversation;
    
    // Handle special actions
    if (response.action === 'startWorkBreak' && this.knowledgeTracker) {
      const workBreak = this.knowledgeTracker.startNYLAWorkBreak();
      return {
        answer: response,
        followUps: [],
        workBreak: true,
        workStatus: workBreak,
        timestamp: Date.now()
      };
    }
    
    // For continue conversation, restore pending follow-ups
    let followUps = [];
    if (response.action === 'continueNormal' && this.engagementState.pendingFollowUps) {
      followUps = this.engagementState.pendingFollowUps;
      this.engagementState.pendingFollowUps = null;
    } else {
      followUps = this.generateWelcomeQuestions();
    }
    
    return {
      answer: response,
      followUps,
      navigationAction: response.action === 'navigateToTab' ? response.tabTarget : null,
      externalAction: response.action === 'openXPost' ? this.generateXPostURL() : null,
      timestamp: Date.now()
    };
  }

  /**
   * Generate X.com post URL with NYLA hashtag
   */
  generateXPostURL() {
    const messages = [
      "Just discovered @NYLAGo - making crypto transfers super easy! 🚀 #NYLAGo #CryptoMadeEasy",
      "Loving the @NYLAGo experience! Multi-blockchain transfers with QR codes 📱 #NYLAGo #Web3",
      "@NYLAGo is revolutionizing how we send crypto! Simple, fast, social 💫 #NYLAGo #DeFi",
      "Shoutout to @NYLAGo for making blockchain accessible to everyone! 🌟 #NYLAGo #CryptoForAll"
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const encodedMessage = encodeURIComponent(randomMessage);
    
    return `https://x.com/intent/post?text=${encodedMessage}`;
  }

  /**
   * Generate work break response
   */
  generateWorkBreakResponse(workStatus) {
    return {
      answer: {
        text: `${workStatus.message} ${workStatus.emoji}\n\nI'll be back in about ${workStatus.remainingMinutes} minutes! 💫`,
        sentiment: 'friendly',
        confidence: 1.0
      },
      followUps: [{
        id: 'check-nyla-back',
        text: 'Are you back yet? 👀',
        action: 'checkWorkStatus'
      }],
      workBreak: true,
      timestamp: Date.now()
    };
  }

  /**
   * Generate return from work response
   */
  generateReturnFromWorkResponse(returnMessage) {
    return {
      answer: {
        text: returnMessage,
        sentiment: 'excited',
        confidence: 1.0
      },
      followUps: this.generateWelcomeQuestions(),
      justReturned: true,
      timestamp: Date.now()
    };
  }

  /**
   * Handle tab switching actions
   */
  async handleTabSwitchAction(targetTab, originalButtonText) {
    console.log(`NYLA Conversation V2: Handling tab switch to ${targetTab}`);
    
    // Generate positive response messages
    const tabSwitchResponses = {
      send: [
        "Cool! Enjoy sending! 🚀 The Send tab is perfect for creating viral crypto transfers!",
        "Awesome! 💸 Time to make some transfers! The Send tab will guide you through everything!",
        "Perfect! 🌟 The Send tab makes crypto transfers super easy and social!",
        "Great choice! 💫 Let's get you set up for sending NYLA tokens!"
      ],
      receive: [
        "Excellent! 💰 The Receive tab is great for creating payment requests!",
        "Perfect! 📱 Time to generate some QR codes and get paid!",
        "Great idea! ✨ The Receive tab makes it super easy for others to send you tokens!",
        "Awesome! 🎯 Let's create a payment request that's easy to share!"
      ],
      raid: [
        "LFG! 🔥 The Raid tab is where the community action happens!",
        "Amazing! 🎯 Time to join the community raids and see what's trending!",
        "Perfect! 🚀 The Raid tab shows all the exciting community activities!",
        "Great choice! 💪 Let's see what raids are happening in the NYLA community!"
      ]
    };
    
    const responses = tabSwitchResponses[targetTab] || [
      "Cool! Enjoy exploring! 🌟 That tab has some great features waiting for you!"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Generate basic follow-up questions for the new tab
    const tabFollowUps = this.generateTabSpecificQuestions(targetTab);
    
    return {
      answer: {
        text: randomResponse,
        sentiment: 'excited',
        confidence: 1.0,
        isTabSwitchResponse: true
      },
      followUps: tabFollowUps,
      sticker: this.selectSticker('excited'),
      tabSwitch: {
        targetTab: targetTab,
        originalButton: originalButtonText
      },
      timestamp: Date.now(),
      isLLMGenerated: false // This is rule-based positive response
    };
  }

  /**
   * Generate tab-specific follow-up questions
   */
  generateTabSpecificQuestions(targetTab) {
    const tabQuestions = {
      send: [
        { id: 'send-steps', text: 'What are the steps to send tokens?', context: 'tutorial' },
        { id: 'blockchain-choice', text: 'Which blockchain should I choose?', context: 'decision help' },
        { id: 'send-fees', text: 'How much do send transactions cost?', context: 'cost information' },
        { id: 'social-sharing', text: 'How does social sharing work?', context: 'viral features' }
      ],
      receive: [
        { id: 'qr-generation', text: 'How do QR codes work?', context: 'technical details' },
        { id: 'payment-requests', text: 'How do I create payment requests?', context: 'tutorial' },
        { id: 'receive-fees', text: 'Are there fees for receiving?', context: 'cost information' },
        { id: 'sharing-requests', text: 'How do I share payment requests?', context: 'distribution' }
      ],
      raid: [
        { id: 'what-are-raids', text: 'What are community raids?', context: 'explanation' },
        { id: 'join-raids', text: 'How do I join a raid?', context: 'participation' },
        { id: 'raid-rewards', text: 'What rewards do raids offer?', context: 'incentives' },
        { id: 'community-apps', text: 'What community apps are available?', context: 'features' }
      ]
    };
    
    const questions = tabQuestions[targetTab] || [
      { id: 'what-is-nyla', text: 'What is NYLA?', context: 'basic introduction' },
      { id: 'how-transfers-work', text: 'How do transfers work?', context: 'tutorial' }
    ];
    
    // Add Change Topic option
    questions.push({ 
      id: 'change-topic', 
      text: '🔄 Ask about something else', 
      action: 'changeTopic',
      context: 'topic switch'
    });
    
    return questions.slice(0, 4); // Limit to 4 questions
  }

  /**
   * Get knowledge tracking statistics
   */
  getKnowledgeStats() {
    if (this.knowledgeTracker) {
      return this.knowledgeTracker.getKnowledgeBreakdown();
    }
    return null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAConversationManagerV2;
}

// Make globally available
window.NYLAConversationManagerV2 = NYLAConversationManagerV2;