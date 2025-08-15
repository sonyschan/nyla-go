/**
 * NYLA Conversation Manager V2 - Phase 2 LLM-Powered System
 * Enhanced conversation intelligence with personal care features
 */

class NYLAConversationManagerV2 {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
    
    // Use centralized device detection
    const device = NYLADeviceUtils.getDeviceInfo();
    if (device.isMobile) {
      NYLALogger.debug('NYLA Conversation V2: Mobile device detected - skipping LLM engine initialization');
      this.llmEngine = null; // No LLM engine on mobile
    } else {
      NYLALogger.debug('NYLA Conversation V2: Desktop device detected - initializing LLM engine');
      this.llmEngine = new NYLALLMEngine();
    }
    
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

    // Topic identification now uses structured KB metadata (type, section, tags) via RAG system
    // No hardcoded keywords needed - topics are dynamically extracted from KB structure

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
   * Set UI reference for engagement functionality
   */
  setUI(ui) {
    this.ui = ui;
    NYLALogger.debug('NYLA Conversation V2: UI reference set');
  }

  /**
   * Identify relevant knowledge using RAG semantic search
   * Falls back to generic responses if RAG is not available
   */
  async identifyRelevantKnowledgeKeys(userInput) {
    // First try RAG-based semantic search if available
    if (this.ragIntegration && this.ragIntegration.initialized && this.ragIntegration.config.enableRAG) {
      try {
        NYLALogger.debug('NYLA Conversation V2: Using RAG semantic search for topic identification');
        
        // Use RAG pipeline to find semantically similar content
        const ragResult = await this.ragIntegration.ragPipeline.query(userInput, {
          topK: 3,
          minScore: 0.4
        });
        
        // Extract topic categories from RAG results using structured KB metadata
        const topicCounts = {};
        
        ragResult.sources.forEach(source => {
          const metadata = source.metadata || {};
          const score = source.score || 0.5;
          
          // Count by type (about, facts, howto, etc.)
          if (metadata.type) {
            topicCounts[metadata.type] = (topicCounts[metadata.type] || 0) + score;
          }
          
          // Count by section (team, transfers, supported_networks, etc.)
          if (metadata.section) {
            topicCounts[metadata.section] = (topicCounts[metadata.section] || 0) + score;
          }
          
          // Count by tags for more specific topics
          if (metadata.tags && Array.isArray(metadata.tags)) {
            metadata.tags.forEach(tag => {
              topicCounts[tag] = (topicCounts[tag] || 0) + (score * 0.7); // Tags get slightly lower weight
            });
          }
        });
        
        // Sort by score and return top topics
        const ragTopics = Object.entries(topicCounts)
          .sort(([,a], [,b]) => b - a)
          .map(([topic]) => topic)
          .slice(0, 3);
        
        NYLALogger.debug('NYLA Conversation V2: RAG identified topics:', ragTopics);
        return ragTopics.slice(0, 3);
        
      } catch (error) {
        console.warn('NYLA Conversation V2: RAG topic identification failed:', error);
      }
    }
    
    // Simple fallback: return generic topics when RAG is unavailable
    NYLALogger.debug('NYLA Conversation V2: RAG unavailable, using generic topics');
    const inputLower = userInput.toLowerCase();
    
    // Basic topic inference from common keywords
    if (inputLower.includes('team') || inputLower.includes('founder') || inputLower.includes('developer')) {
      return ['team', 'about'];
    } else if (inputLower.includes('send') || inputLower.includes('transfer') || inputLower.includes('payment')) {
      return ['transfers', 'howto'];
    } else if (inputLower.includes('blockchain') || inputLower.includes('solana') || inputLower.includes('ethereum')) {
      return ['supported_networks', 'facts'];
    } else if (inputLower.includes('raid') || inputLower.includes('community')) {
      return ['raids', 'howto'];
    } else {
      return ['about', 'general'];
    }
  }

  /**
   * Initialize the conversation manager
   */
  async initialize() {
    try {
      NYLALogger.debug('NYLA Conversation V2: === Initializing ===');
      
      // Initialize knowledge tracker if available
      NYLALogger.debug('NYLA Conversation V2: Checking knowledge tracker availability...');
      if (typeof NYLAKnowledgeTracker !== 'undefined') {
        NYLALogger.debug('NYLA Conversation V2: Creating knowledge tracker...');
        this.knowledgeTracker = new NYLAKnowledgeTracker(this.kb);
        NYLALogger.debug('NYLA Conversation V2: ✅ Knowledge tracker initialized');
      } else {
        console.warn('NYLA Conversation V2: ⚠️ Knowledge tracker not available, engagement features disabled');
      }
      
      // Initialize LLM engine in background (desktop only)
      if (this.llmEngine) {
        NYLALogger.debug('NYLA Conversation V2: Initializing LLM engine...');
        this.llmEngine.initialize().catch(error => {
          console.warn('NYLA Conversation V2: ⚠️ LLM initialization failed, falling back to RAG-only system:', error);
        });
      } else {
        NYLALogger.debug('NYLA Conversation V2: LLM engine disabled (mobile device)');
      }

      NYLALogger.debug('NYLA Conversation V2: ✅ Initialized successfully');
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
      NYLALogger.debug('NYLA Conversation V2: Processing question with LLM');
      
      // Identify relevant topics using semantic search (RAG) or keyword fallback
      const identifiedTopics = await this.identifyRelevantKnowledgeKeys(questionText);
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
      
      // Try LLM if available, otherwise fallback to "don't know" response
      const llmStatus = this.llmEngine ? this.llmEngine.getStatus() : { initialized: false, loading: false, ready: false, warmedUp: false };
      NYLALogger.debug('NYLA Conversation V2: LLM Status:', llmStatus);
      NYLALogger.debug('NYLA Conversation V2: LLM Engine isReady():', this.llmEngine ? this.llmEngine.isReady() : false);
      
      // Check for mobile device (LLM engine will be null on mobile)
      const device = NYLADeviceUtils.getDeviceInfo();
      
      // Use LLM if engine is ready, or force attempt on mobile for debugging
      const canUseLLM = llmStatus.initialized && !llmStatus.loading && llmStatus.warmedUp;
      const shouldForceDebug = device.isMobile && llmStatus.initialized && !llmStatus.loading;
      
      // Special case: If the user is interacting via conversation box, try LLM even if warmup flag is false
      // This handles race conditions where UI loads before warmup flag is set
      const shouldTryLLMDespiteWarmup = llmStatus.initialized && !llmStatus.loading && !llmStatus.warmedUp;
      
      if (canUseLLM || shouldForceDebug || shouldTryLLMDespiteWarmup) {
        if (shouldForceDebug) {
          NYLALogger.debug('NYLA Conversation V2: 🔧 MOBILE DEBUG: Forcing LLM attempt even if not warmed up');
        } else if (shouldTryLLMDespiteWarmup) {
          NYLALogger.debug('NYLA Conversation V2: ⚡ Trying LLM despite warmup flag being false (race condition handling)');
        } else {
          NYLALogger.debug('NYLA Conversation V2: ✅ Using LLM for response generation');
        }
        response = await this.processWithLLM(questionId, questionText, identifiedTopics, null);
        console.log('NYLA Conversation V2: 🔍 Response from processWithLLM:', {
          hasAnswer: !!response.answer,
          hasFollowUps: !!response.followUps,
          isFallback: response.isFallback || false,
          responseKeys: Object.keys(response)
        });
      } else {
        NYLALogger.debug('NYLA Conversation V2: ⚠️ LLM not ready - using fallback response');
        console.log('NYLA Conversation V2: 🚨 LLM Status:', {
          'llmStatus.initialized': llmStatus.initialized ? '✅' : '❌',
          'NOT llmStatus.loading': !llmStatus.loading ? '✅' : '❌',
          'llmStatus.warmedUp': llmStatus.warmedUp ? '✅' : '❌',
          'isMobile': isMobile ? '✅' : '❌'
        });
        
        // Special handling when engine is initializing but not warmed up
        if (llmStatus.initialized && !llmStatus.warmedUp) {
          NYLALogger.debug('NYLA Conversation V2: 🔥 LLM engine warming up GPU buffers...');
        }
        
        // Simplified fallback - just return "don't know" response
        response = {
          answer: { text: "Sorry, I don't know about this." },
          followUps: [],
          sticker: null,
          timestamp: Date.now(),
          isFallback: true
        };
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
          
          // Add defensive check for engagement
          if (!engagement || !engagement.message) {
            console.error('NYLA Conversation V2: Invalid engagement prompt generated');
            return response;
          }
          
          // First send NYLA's farewell message
          const farewellMessage = engagement.message;
          
          // Send farewell as NYLA's message with delay and typing indicator
          if (this.ui && this.ui.displayMessage) {
            // Add delay before showing engagement prompt (1-3 seconds)
            const delayMs = 1000 + Math.random() * 2000; // 1-3 second random delay
            
            // Show typing indicator
            if (this.ui.showTyping) {
              this.ui.showTyping();
            }
            
            // Wait for the delay
            await new Promise(resolve => setTimeout(resolve, delayMs));
            
            // Hide typing indicator and display message
            if (this.ui.hideTyping) {
              this.ui.hideTyping();
            }
            
            await this.ui.displayMessage({ text: farewellMessage }, 'nyla');
          } else {
            console.warn('NYLA Conversation V2: UI not available for engagement farewell message');
          }
          
          // Then create a separate response with engagement actions
          const engagementResponse = {
            text: "", // No additional text needed since farewell was already sent
            sentiment: "friendly",
            followUps: this.convertEngagementToQuestions(engagement),
            engagementPrompt: engagement,
            isEngagementResponse: true
          };
          
          this.engagementState.isShowingEngagement = true;
          this.engagementState.currentEngagement = engagement;
          
          // Display the engagement options
          setTimeout(() => {
            this.ui.displayQuestions(engagementResponse.followUps, engagementResponse);
          }, 1000); // Small delay to let farewell message be read
          
          // Return the original response without engagement modifications
          return response;
        }
      }
      
      console.log('NYLA Conversation V2: 🔍 Final response before return:', {
        hasAnswer: !!response.answer,
        hasFollowUps: !!response.followUps,
        isFallback: response.isFallback || false,
        responseKeys: Object.keys(response)
      });
      
      return response;

    } catch (error) {
      console.error('NYLA Conversation V2: Question processing failed', error);
      return this.generateErrorResponse();
    }
  }


  /**
   * Process question using LLM (supports streaming for UI)
   * Now uses dynamic topic identification instead of hardcoded topics
   */
  async processWithLLM(questionId, questionText, identifiedTopics, streamCallback = null) {
    NYLALogger.debug('🚀 NYLA Conversation V2: === processWithLLM CALLED ===');
    NYLALogger.debug('NYLA Conversation V2: LLM processing started for:', questionText);
    NYLALogger.debug('NYLA Conversation V2: QuestionId:', questionId);
    NYLALogger.debug('NYLA Conversation V2: Identified topics:', identifiedTopics);
    NYLALogger.debug('NYLA Conversation V2: Has stream callback:', !!streamCallback);
    
    // Check LLM engine status before proceeding
    const llmStatus = this.llmEngine ? this.llmEngine.getStatus() : { initialized: false, loading: false, ready: false, warmedUp: false };
    console.log('NYLA Conversation V2: LLM Engine Status at start:', {
      initialized: llmStatus.initialized,
      loading: llmStatus.loading,
      ready: llmStatus.ready,
      warmedUp: llmStatus.warmedUp,
      model: llmStatus.model
    });
    
    // Use pre-identified topics from processQuestion method
    const relevantKeys = identifiedTopics || await this.identifyRelevantKnowledgeKeys(questionText);
    
    // Use RAG-based semantic search to find relevant knowledge
    let knowledgeContext = null;
    
    // Try RAG-based semantic search first
    if (this.ragIntegration && this.ragIntegration.initialized && this.ragIntegration.config.enableRAG) {
      try {
        NYLALogger.debug('NYLA Conversation V2: Using RAG semantic search for knowledge context');
        
        const ragResult = await this.ragIntegration.ragPipeline.query(questionText, {
          topK: 5,
          minScore: 0.5
        });
        
        if (ragResult.sources && ragResult.sources.length > 0) {
          // Convert RAG results to legacy knowledge context format
          const searchResults = ragResult.sources.map(source => ({
            source: source.title,
            data: source.metadata.content || source.text,
            score: source.score
          }));
          
          knowledgeContext = {
            searchResults: searchResults,
            relevantKeys: relevantKeys,
            searchTerms: questionText,
            ragResult: ragResult, // Include original RAG result
            searchMethod: 'rag_semantic'
          };
          
          NYLALogger.debug('NYLA Conversation V2: RAG found', searchResults.length, 'relevant knowledge chunks');
        }
      } catch (error) {
        console.warn('NYLA Conversation V2: RAG knowledge search failed, using fallback:', error);
      }
    }
    
    // Fallback to legacy keyword search if RAG failed or unavailable
    if (!knowledgeContext && this.kb && this.kb.searchKnowledge) {
      NYLALogger.debug('NYLA Conversation V2: Using legacy keyword search for knowledge context');
      const searchResults = [];
      
      // Search using the identified keys directly as search terms
      for (const key of relevantKeys) {
        const result = this.kb.searchKnowledge(key);
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
          searchTerms: questionText,
          searchMethod: 'legacy_keyword'
        };
      }
    }
    
    // Enhanced context with structured KB data
    const structuredKnowledgeContext = this.knowledgeTracker ? {
      chunks: Array.from(this.knowledgeTracker.userKnowledge.chunks || []),
      categories: Array.from(this.knowledgeTracker.userKnowledge.categories || []),
      tags: Array.from(this.knowledgeTracker.userKnowledge.tags || []),
      glossaryTerms: Array.from(this.knowledgeTracker.userKnowledge.glossaryTerms || []),
      breakdown: this.knowledgeTracker.getKnowledgeBreakdown(),
      gaps: this.knowledgeTracker.getStructuredKnowledgeGaps ? 
        this.knowledgeTracker.getStructuredKnowledgeGaps() : null
    } : null;
    
    const conversationContext = {
      timezone: this.userProfile.timezone,
      localTime: this.userProfile.localTime,
      conversationHistory: this.conversationHistory.slice(-3), // Reduced from 5 to 3 for speed
      userProfile: this.userProfile,
      knowledgeContext: knowledgeContext,
      
      // Enhanced structured knowledge data
      structuredKnowledge: structuredKnowledgeContext,
      
      // Legacy compatibility
      knowledgeTracker: this.knowledgeTracker, // For knowledge gap analysis
      knowledgeStats: this.knowledgeTracker ? this.knowledgeTracker.getKnowledgeBreakdown() : null // For plateau detection
    };

    NYLALogger.debug('NYLA Conversation V2: Generating LLM response (timeout: 30s)...');
    NYLALogger.debug('NYLA Conversation V2: Question:', questionText);
    NYLALogger.debug('NYLA Conversation V2: Relevant knowledge keys:', relevantKeys);
    NYLALogger.debug('NYLA Conversation V2: Knowledge retrieved:', conversationContext.knowledgeContext);
    console.log('NYLA Conversation V2: Enhanced context provided to LLM:', {
      hasKnowledge: !!conversationContext.knowledgeContext,
      hasStructuredKB: !!conversationContext.structuredKnowledge,
      historyLength: conversationContext.conversationHistory.length,
      searchResultCount: conversationContext.knowledgeContext?.searchResults?.length || 0,
      userChunksLearned: conversationContext.structuredKnowledge?.chunks.length || 0,
      userCategories: conversationContext.structuredKnowledge?.categories.length || 0,
      userTags: conversationContext.structuredKnowledge?.tags.length || 0,
      knowledgePercentage: conversationContext.structuredKnowledge?.breakdown?.percentage || 0,
      relevantKeys: relevantKeys
    });
    
    // Set timeout to 30 seconds for LLM processing
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('LLM response timeout after 30 seconds')), 30000);
    });
    
    let llmResponse;
    try {
      // Use streaming or non-streaming based on whether callback is provided (if LLM available)
      if (!this.llmEngine) {
        throw new Error('LLM engine not available on mobile devices');
      }
      
      const llmPromise = streamCallback 
        ? this.llmEngine.generateStreamingResponse(questionText, conversationContext, streamCallback)
        : this.llmEngine.generateResponse(questionText, conversationContext);
      
      llmResponse = await Promise.race([llmPromise, timeoutPromise]);
      NYLALogger.debug('NYLA Conversation V2: ✅ LLM response completed');
      console.log('NYLA Conversation V2: LLM Response:', {
        text: llmResponse.text ? llmResponse.text.substring(0, 100) + '...' : 'No text',
        hasFollowUps: !!llmResponse.followUpSuggestions,
        followUpCount: llmResponse.followUpSuggestions ? llmResponse.followUpSuggestions.length : 0
      });
    } catch (error) {
      console.warn('NYLA Conversation V2: LLM timeout (30s) or error:', error.message);
      
      // Generate debug information instead of generic fallback
      const llmStatus = this.llmEngine ? this.llmEngine.getStatus() : { initialized: false, loading: false, ready: false, warmedUp: false, model: 'Not available on mobile' };
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
        isFallback: true,
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
    NYLALogger.debug('NYLA Conversation V2: LLM followup suggestions before generateIntelligentFollowUps:', llmResponse.followUpSuggestions);
    NYLALogger.debug('NYLA Conversation V2: Full LLM response keys:', Object.keys(llmResponse));
    NYLALogger.debug('NYLA Conversation V2: LLM response type:', typeof llmResponse.followUpSuggestions);
    
    const followUps = this.generateIntelligentFollowUps(llmResponse, primaryTopic, questionText);
    
    // Debug: Log the generated follow-ups
    NYLALogger.debug('NYLA Conversation V2: Generated followUps:', followUps);
    NYLALogger.debug('NYLA Conversation V2: FollowUps count:', followUps ? followUps.length : 0);
    
    // Select appropriate sticker
    const sticker = this.selectIntelligentSticker(llmResponse.sentiment, llmResponse.text, questionText);

    // Save conversation with primary identified topic
    this.saveConversation(questionText, llmResponse, primaryTopic);

    // Extract RAG metadata for UI display
    let ragMetadata = null;
    if (knowledgeContext && knowledgeContext.ragResult) {
      ragMetadata = this.extractRAGMetadata(knowledgeContext.ragResult);
    }

    return {
      answer: {
        text: llmResponse.text,
        sentiment: llmResponse.sentiment,
        confidence: llmResponse.confidence || 0.8,
        ragMetadata: ragMetadata
      },
      followUps,
      sticker,
      timestamp: Date.now()
    };
  }

  /**
   * Extract RAG metadata for UI display
   */
  extractRAGMetadata(ragResult) {
    if (!ragResult || !ragResult.sources) return null;
    
    const sources = ragResult.sources.map(source => ({
      title: source.metadata?.title || source.title || 'Unknown Source',
      type: source.metadata?.type || 'info',
      verified: source.metadata?.verified,
      as_of: source.metadata?.as_of
    }));
    
    // Find most recent date
    let mostRecentDate = null;
    let hasVolatileInfo = false;
    
    for (const source of ragResult.sources) {
      const asOfDate = source.metadata?.as_of;
      if (asOfDate) {
        if (!mostRecentDate || new Date(asOfDate) > new Date(mostRecentDate)) {
          mostRecentDate = asOfDate;
        }
      }
      
      // Check for volatile information
      if (source.metadata?.stability === 'volatile') {
        hasVolatileInfo = true;
      }
    }
    
    return {
      sources,
      mostRecentDate,
      hasVolatileInfo
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
      NYLALogger.debug('NYLA Conversation V2: ✅ Using LLM followup suggestions');
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
      NYLALogger.debug('NYLA Conversation V2: ⚠️ No LLM followups available, using contextual generation');
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
        NYLALogger.debug(`NYLA Conversation V2: Detected actionable button: "${buttonText}" → ${actionPattern.action}`);
        return {
          action: actionPattern.action,
          targetTab: actionPattern.targetTab
        };
      }
    }
    
    return null;
  }

  /**
   * Limit follow-ups to 3 for optimal UI layout (Change topic now handled by LLM)
   */
  addChangeTopicOption(followUps) {
    // Just limit to 3 followUps since LLM now generates change topic suggestions
    if (followUps.length > 3) {
      followUps = followUps.slice(0, 3);
    }
    
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
      llmEnabled: this.llmEngine ? this.llmEngine.isReady() : false,
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
    if (questionText.includes('what is nyla') || topic === 'about') {
      contextualFollowUps = [
        { id: 'try-send-tab', text: '💸 Try the Send tab', context: 'hands-on practice' },
        { id: 'explore-receive', text: '💰 Explore Receive payments', context: 'hands-on practice' },
        { id: 'check-community', text: '🎯 Check out Raids & Apps', context: 'community features' },
        { id: 'learn-blockchains', text: '⛓️ Which blockchains are supported?', context: 'technical details' }
      ];
    }
    // For transfer-related responses
    else if (responseText.includes('transfer') || responseText.includes('send') || responseText.includes('receive') || topic === 'about' || topic === 'transfers' || topic === 'howto') {
      contextualFollowUps = [
        { id: 'try-send-now', text: '💸 Try sending now', context: 'hands-on practice' },
        { id: 'qr-code-help', text: '📱 How do QR codes work?', context: 'technical details' },
        { id: 'blockchain-choice', text: '⛓️ Which blockchain should I use?', context: 'decision help' },
        { id: 'fees-info', text: '💰 What about fees?', context: 'cost information' }
      ];
    }
    // For community/feature responses
    else if (responseText.includes('community') || responseText.includes('raid') || responseText.includes('app') || topic === 'raids' || topic === 'community') {
      contextualFollowUps = [
        { id: 'join-raid', text: '🎯 How do I join a raid?', context: 'participation guide' },
        { id: 'community-apps', text: '🚀 Show me community apps', context: 'app exploration' },
        { id: 'get-started-transfer', text: '💸 Get started with transfers', context: 'basic tutorial' },
        { id: 'social-features', text: '📱 Social media integration', context: 'social features' }
      ];
    }
    // For blockchain/technical responses
    else if (responseText.includes('blockchain') || responseText.includes('solana') || responseText.includes('ethereum') || topic === 'supported_networks' || topic === 'facts') {
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
    // Add defensive checks to prevent undefined errors
    if (!engagement || !engagement.actions || !Array.isArray(engagement.actions)) {
      console.warn('NYLA Conversation V2: Invalid engagement object:', engagement);
      return [];
    }

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
    NYLALogger.debug(`NYLA Conversation V2: Handling tab switch to ${targetTab}`);
    
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
      timestamp: Date.now()
      // Tab switching is just UI navigation - no generation method flags needed
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