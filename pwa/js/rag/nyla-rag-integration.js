/**
 * NYLA RAG Integration
 * Integrates RAG pipeline with existing NYLA conversation system
 */

class NYLARAGIntegration {
  constructor(conversationManager) {
    this.conversationManager = conversationManager;
    this.ragPipeline = null;
    this.productionSync = null;
    this.initialized = false;
    this.indexBuilt = false;
    this.indexBuildFailed = false; // Circuit breaker for index build failures
    
    // Configuration
    this.config = {
      enableRAG: true,
      fallbackToKeyword: true,
      hybridMode: true,  // Use both RAG and keyword matching
      ragWeight: 0.8,
      keywordWeight: 0.2
    };
  }

  /**
   * Initialize RAG integration
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🔌 Initializing RAG integration...');
    
    try {
      // Create RAG pipeline instance
      this.ragPipeline = new NYLARAGPipeline({
        targetLatency: 10000,  // 10s for RAG, leaving 2s buffer
        parallelProcessing: true,
        cacheEnabled: true,
        streamingEnabled: true
      });
      
      // Get knowledge base and LLM engine from conversation manager
      const knowledgeBase = this.conversationManager.kb;
      const llmEngine = this.conversationManager.llmEngine;
      
      // Initialize pipeline
      await this.ragPipeline.initialize(knowledgeBase, llmEngine);
      
      // Set up conversation context if available
      if (window.NYLAConversationContext) {
        const conversationContext = new window.NYLAConversationContext({
          maxHistoryLength: 10,
          maxContextTokens: 250,
          contextWindow: 5
        });
        this.ragPipeline.setConversationManager(conversationContext);
        console.log('💬 Conversation context integrated with RAG');
      }
      
      // Set up production sync if available
      if (window.NYLAProductionSync) {
        this.productionSync = new window.NYLAProductionSync({
          checkIntervalMs: 1000 * 60 * 60, // Check hourly
          forceCheckOnStartup: true
        });
        await this.productionSync.initialize();
        
        // Set up event listeners for silent auto-updates
        this.productionSync.on('updateAvailable', (data) => {
          console.log('🆕 Knowledge base update available:', data.reason);
          // Silently handle the update without user prompts
          this.handleProductionUpdate(data);
        });
        
        console.log('🌐 Production sync initialized with auto-update');
      }
      
      // Try to load pre-built embeddings from the web data file
      console.log('📥 Loading pre-built embeddings from data/nyla-vector-db.json...');
      try {
        const response = await fetch('data/nyla-vector-db.json');
        if (response.ok) {
          const vectorData = await response.json();
          
          // Load the data into the vector database
          if (this.ragPipeline.vectorDB && typeof this.ragPipeline.vectorDB.loadFromData === 'function') {
            await this.ragPipeline.vectorDB.loadFromData(vectorData);
            const stats = this.ragPipeline.getStats();
            if (stats.vectorDB && stats.vectorDB.chunkCount > 0) {
              this.indexBuilt = true;
              console.log(`✅ Loaded pre-built vector database with ${stats.vectorDB.chunkCount} chunks`);
            } else {
              console.log('⚠️ Vector database loaded but is empty');
              this.indexBuilt = false;
              this.indexBuildFailed = true;
            }
          } else {
            console.log('⚠️ Vector database loadFromData method not available');
            this.indexBuilt = false;
            this.indexBuildFailed = true;
          }
        } else {
          console.warn('⚠️ Could not fetch pre-built embeddings:', response.status);
          this.indexBuilt = false;
          this.indexBuildFailed = true;
        }
      } catch (error) {
        console.warn('⚠️ Failed to load pre-built embeddings:', error);
        this.indexBuilt = false;
        this.indexBuildFailed = true;
      }
      
      this.initialized = true;
      console.log('✅ RAG integration initialized');
      
    } catch (error) {
      console.error('❌ RAG integration initialization failed:', error);
      // Don't throw - allow fallback to keyword search
      this.config.enableRAG = false;
    }
  }

  /**
   * Build or rebuild the vector index
   */
  async buildIndex(onProgress) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    console.log('🏗️ Building RAG index...');
    
    try {
      const knowledgeBase = this.conversationManager.kb;
      
      // Show progress in UI if callback provided
      const progressWrapper = onProgress ? (progress) => {
        const message = progress.stage === 'embedding'
          ? `Generating embeddings: ${progress.percentage}%`
          : `Building index: ${progress.percentage}%`;
        
        onProgress({
          message,
          percentage: progress.percentage,
          stage: progress.stage
        });
      } : null;
      
      // Build index
      await this.ragPipeline.buildIndex(knowledgeBase, progressWrapper);
      
      this.indexBuilt = true;
      console.log('✅ RAG index built successfully');
      
    } catch (error) {
      console.error('❌ Index building failed:', error);
      throw error;
    }
  }

  /**
   * Process a question using RAG
   */
  async processQuestion(questionId, questionText, options = {}) {
    // Check if RAG is enabled and initialized
    if (!this.config.enableRAG || !this.initialized) {
      console.log('⚠️ RAG not enabled or initialized, falling back to keyword search');
      return this.fallbackToKeywordSearch(questionId, questionText, options);
    }
    
    // Build index if not already built (with circuit breaker)
    if (!this.indexBuilt && !this.indexBuildFailed) {
      console.log('🔨 Building vector index on first query...');
      try {
        await this.buildIndex((progress) => {
          console.log(`Building index: ${progress.percentage}%`);
        });
        console.log('✅ Vector index built successfully');
      } catch (error) {
        console.error('❌ Failed to build vector index:', error);
        this.indexBuildFailed = true; // Circuit breaker: don't retry index building
        console.log('⚠️ Index build failed permanently - disabling RAG for this session');
        return this.fallbackToKeywordSearch(questionId, questionText, options);
      }
    }
    
    // If index build failed previously, skip RAG
    if (this.indexBuildFailed) {
      console.log('⚠️ RAG disabled due to previous index build failure - using keyword search');
      return this.fallbackToKeywordSearch(questionId, questionText, options);
    }
    
    try {
      console.log(`🤖 Processing question with RAG: "${questionText}"`);
      
      // Process through RAG pipeline
      const ragResult = await this.ragPipeline.query(questionText, {
        streaming: options.streaming,
        topK: 3,
        minScore: 0.6
      });
      
      // Check confidence
      if (ragResult.metrics.confidence < 0.5 && this.config.fallbackToKeyword) {
        console.log('⚠️ Low confidence RAG result, enhancing with keyword search');
        return this.enhanceWithKeywordSearch(ragResult, questionId, questionText, options);
      }
      
      // Format response
      return this.formatRAGResponse(ragResult, questionId, questionText, options);
      
    } catch (error) {
      console.error('❌ RAG processing failed:', error);
      
      if (this.config.fallbackToKeyword) {
        return this.fallbackToKeywordSearch(questionId, questionText, options);
      }
      
      throw error;
    }
  }

  /**
   * Format RAG response for conversation system
   */
  formatRAGResponse(ragResult, questionId, questionText, options) {
    // Build response with sources
    let answer = ragResult.response;
    
    // Add source citations if available
    if (ragResult.sources && ragResult.sources.length > 0) {
      answer += '\n\n📚 Sources: ' + ragResult.sources.map(s => s.title).join(', ');
    }
    
    // Determine response type
    const responseType = this.determineResponseType(ragResult.metrics.confidence);
    
    return {
      questionId,
      question: questionText,
      answer,
      type: responseType,
      confidence: ragResult.metrics.confidence,
      sources: ragResult.sources,
      metrics: ragResult.metrics,
      streaming: ragResult.streaming
    };
  }

  /**
   * Fallback to keyword search
   */
  async fallbackToKeywordSearch(questionId, questionText, options) {
    console.log('🔍 Using keyword search fallback - bypassing RAG completely');
    
    // Generate a simple "don't know" response since we don't have rule-based fallback
    return {
      text: "Sorry, I don't know about this. My knowledge system is temporarily unavailable. Please try asking about basic NYLAGo features like sending transfers, generating QR codes, or blockchain information.",
      sentiment: 'informative',
      followUpSuggestions: [
        "How do I send tokens with NYLAGo?",
        "How do I generate a QR code?", 
        "What blockchains does NYLAGo support?"
      ],
      llmUsed: false,
      sources: [],
      timestamp: new Date().toISOString(),
      questionId: questionId
    };
  }

  /**
   * Enhance RAG result with keyword search
   */
  async enhanceWithKeywordSearch(ragResult, questionId, questionText, options) {
    // Get keyword search result
    const keywordResult = await this.fallbackToKeywordSearch(
      questionId,
      questionText,
      options
    );
    
    // Combine results based on weights
    const combinedAnswer = this.combineAnswers(
      ragResult.response,
      keywordResult.answer,
      this.config.ragWeight,
      this.config.keywordWeight
    );
    
    return {
      ...ragResult,
      answer: combinedAnswer,
      enhanced: true,
      keywordSources: keywordResult.sources
    };
  }

  /**
   * Combine RAG and keyword answers
   */
  combineAnswers(ragAnswer, keywordAnswer, ragWeight, keywordWeight) {
    // Simple combination for now
    // TODO: Implement more sophisticated answer fusion
    if (ragWeight >= 0.8) {
      return ragAnswer;
    }
    
    return `${ragAnswer}\n\nAdditional information: ${keywordAnswer}`;
  }

  /**
   * Handle production update notifications
   */
  async handleProductionUpdate(updateData) {
    try {
      // Check if we already have embeddings loaded
      if (this.indexBuilt && this.ragPipeline) {
        const stats = this.ragPipeline.getStats();
        if (stats.vectorDB && stats.vectorDB.chunkCount > 0) {
          console.log('✅ Knowledge base already loaded with', stats.vectorDB.chunkCount, 'chunks');
          return; // Skip update, we already have data
        }
      }
      
      // Always auto-update silently, especially for first-time use
      const isFirstTime = updateData.reason === 'no_local_version';
      
      if (isFirstTime) {
        console.log('🔄 First-time setup: Installing knowledge base...');
      } else {
        console.log('🔄 Auto-updating knowledge base...');
      }
      
      // Download and install silently
      await this.productionSync.downloadAndInstall();
      
      // Only log success, no user-facing notifications
      console.log('✅ Knowledge base updated successfully');
      
      // For non-first-time updates, optionally show a subtle notification
      if (!isFirstTime && window.nylaUI && window.nylaUI.showToast) {
        // Show a brief, non-intrusive toast notification
        window.nylaUI.showToast('Knowledge base updated', 'info', 2000);
      }
      
    } catch (error) {
      console.error('❌ Failed to update knowledge base:', error);
      // Silent failure - just use existing data
      console.log('📍 Using existing knowledge base');
    }
  }

  /**
   * Prompt user for manual update (deprecated - keeping for backwards compatibility)
   */
  async promptUserForUpdate(updateData) {
    // This method is deprecated as we now auto-update silently
    // Keeping it to avoid breaking existing code that might reference it
    console.log('⚠️ promptUserForUpdate called but auto-update is now automatic');
    await this.handleProductionUpdate(updateData);
  }

  /**
   * Show update notification to user
   */
  showUpdateNotification(message, type = 'info', action = null) {
    // Only log to console - no user-facing notifications for KB updates
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    console.log(`${emoji} ${message}`);
    
    // Never show confirm dialogs or browser notifications for KB updates
    // This prevents security concerns and improves UX
  }

  /**
   * Show update progress
   */
  showUpdateProgress(progress) {
    const { stage, percentage } = progress;
    const stageNames = {
      download: 'Downloading',
      processing: 'Processing',
      installing: 'Installing'
    };
    
    const stageName = stageNames[stage] || stage;
    const message = `${stageName}... ${percentage}%`;
    
    console.log(`🔄 ${message}`);
    
    // Update UI if available
    if (window.nylaUI && window.nylaUI.updateProgress) {
      window.nylaUI.updateProgress(message, percentage);
    }
  }

  /**
   * Determine response type based on confidence
   */
  determineResponseType(confidence) {
    if (confidence >= 0.8) return 'confident';
    if (confidence >= 0.6) return 'moderate';
    if (confidence >= 0.4) return 'uncertain';
    return 'low_confidence';
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('📝 RAG configuration updated:', this.config);
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      indexBuilt: this.indexBuilt,
      ragEnabled: this.config.enableRAG,
      config: this.config,
      pipelineStats: this.ragPipeline ? this.ragPipeline.getStats() : null
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.ragPipeline) {
      await this.ragPipeline.cleanup();
    }
    
    this.initialized = false;
    this.indexBuilt = false;
  }
}

// Enhance existing conversation manager with RAG
function enhanceConversationManagerWithRAG(conversationManager) {
  console.log('🔌 Starting RAG enhancement of conversation manager...');
  
  // Create RAG integration
  const ragIntegration = new NYLARAGIntegration(conversationManager);
  
  // Store reference
  conversationManager.ragIntegration = ragIntegration;
  console.log('✅ RAG integration object created and attached to conversation manager');
  
  // Override processQuestion method
  const originalProcessQuestion = conversationManager.processQuestion.bind(conversationManager);
  
  conversationManager.processQuestion = async function(questionId, questionText, primaryTopic, options = {}) {
    console.log('🔍 Processing question with RAG-enhanced manager. RAG initialized:', ragIntegration.initialized);
    
    // Initialize RAG if not already done
    if (!ragIntegration.initialized) {
      console.log('⚡ Initializing RAG integration on first query...');
      try {
        await ragIntegration.initialize();
        console.log('✅ RAG integration initialization completed successfully');
      } catch (error) {
        console.error('❌ RAG integration initialization failed:', error);
      }
    }
    
    // Try RAG first if available and enabled
    if (ragIntegration.initialized && ragIntegration.config.enableRAG) {
      console.log('🚀 Using RAG-powered query processing');
      try {
        return await ragIntegration.processQuestion(questionId, questionText, options);
      } catch (error) {
        console.warn('❌ RAG processing failed, falling back to original method:', error);
      }
    } else {
      console.log('⚠️ RAG not available - using original method. Initialized:', ragIntegration.initialized, 'Enabled:', ragIntegration.config.enableRAG);
    }
    
    // Fallback to original method
    console.log('📝 Using original processQuestion method');
    return originalProcessQuestion(questionId, questionText, primaryTopic, options);
  };
  
  // Add method to check RAG status
  conversationManager.getRAGStatus = function() {
    return ragIntegration.getStatus();
  };
  
  // Add method to build RAG index
  conversationManager.buildRAGIndex = async function(onProgress) {
    await ragIntegration.initialize();
    await ragIntegration.buildIndex(onProgress);
  };
  
  console.log('✅ Conversation manager enhanced with RAG capabilities');
  
  return conversationManager;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NYLARAGIntegration,
    enhanceConversationManagerWithRAG
  };
}
window.NYLARAGIntegration = NYLARAGIntegration;
window.enhanceConversationManagerWithRAG = enhanceConversationManagerWithRAG;