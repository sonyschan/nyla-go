/**
 * NYLA RAG Integration
 * Integrates RAG pipeline with existing NYLA conversation system
 */

class NYLARAGIntegration {
  constructor(conversationManager) {
    this.conversationManager = conversationManager;
    this.ragPipeline = null;
    this.productionSync = null;
    this.semanticFollowups = null; // New semantic follow-up generator
    this.initialized = false;
    this.indexBuilt = false;
    this.indexBuildFailed = false; // Circuit breaker for index build failures
    
    // Configuration
    this.config = {
      enableRAG: true,
      minConfidenceThreshold: 0.3  // Minimum confidence required for RAG responses
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
      
      // Initialize semantic follow-up generator
      if (window.NYLASemanticFollowups) {
        this.semanticFollowups = new window.NYLASemanticFollowups(this.ragPipeline);
        console.log('🎯 Semantic follow-up generator initialized');
      } else {
        console.warn('⚠️ NYLASemanticFollowups not available, using fallback follow-ups');
      }
      
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
          console.log('🔍 RAG Debug: Vector data structure:', {
            hasChunks: !!vectorData.chunks,
            chunksLength: vectorData.chunks?.length || 0,
            hasEmbeddings: !!vectorData.embeddings,
            embeddingsLength: vectorData.embeddings?.length || 0,
            sampleChunkIds: vectorData.chunks?.slice(0, 3).map(c => c.id) || []
          });
          
          if (this.ragPipeline.vectorDB && typeof this.ragPipeline.vectorDB.loadFromData === 'function') {
            await this.ragPipeline.vectorDB.loadFromData(vectorData);
            const stats = this.ragPipeline.getStats();
            console.log('🔍 RAG Debug: Vector DB stats after loading:', stats);
            
            if (stats.vectorDB && stats.vectorDB.chunkCount > 0) {
              this.indexBuilt = true;
              console.log(`✅ Loaded pre-built vector database with ${stats.vectorDB.chunkCount} chunks`);
            } else {
              console.log('⚠️ Vector database loaded but is empty - detailed stats:', stats);
              this.indexBuilt = false;
              this.indexBuildFailed = true;
            }
          } else {
            console.log('⚠️ Vector database loadFromData method not available', {
              hasVectorDB: !!this.ragPipeline.vectorDB,
              hasLoadMethod: this.ragPipeline.vectorDB ? typeof this.ragPipeline.vectorDB.loadFromData : 'no vectorDB'
            });
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
      // Mark as failed but keep RAG enabled - we'll handle errors gracefully
      this.initialized = false;
      console.warn('⚠️ RAG will provide fallback responses when processing fails');
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
    // Check if RAG is enabled
    if (!this.config.enableRAG) {
      console.log('⚠️ RAG disabled in config, providing generic fallback');
      return this.createGenericFallbackResponse(questionId, questionText);
    }

    // Check if initialized
    if (!this.initialized) {
      console.log('⚠️ RAG not initialized, providing initialization fallback');
      return this.createInitializationFallbackResponse(questionId, questionText);
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
        console.log('⚠️ Index build failed permanently - providing fallback responses');
        return this.createIndexFailureFallbackResponse(questionId, questionText, error);
      }
    }
    
    // If index build failed previously, provide fallback
    if (this.indexBuildFailed) {
      console.log('⚠️ RAG disabled due to previous index build failure');
      return this.createIndexFailureFallbackResponse(questionId, questionText);
    }
    
    try {
      console.log(`🤖 Processing question with RAG: "${questionText}"`);
      
      // Process through RAG pipeline
      const ragResult = await this.ragPipeline.query(questionText, {
        streaming: options.streaming,
        topK: 3,
        minScore: 0.43  // Semantic similarity threshold (lowered to accept quality 48%+ matches)
      });
      
      // Debug: Log RAG results
      console.log('🔍 RAG Query Results:', {
        question: questionText,
        confidence: ragResult.metrics.confidence,
        threshold: this.config.minConfidenceThreshold,
        chunksFound: ragResult.sources ? ragResult.sources.length : 0,
        topChunk: ragResult.sources?.[0]?.title || 'none',
        ragMetrics: ragResult.metrics,
        topChunkScore: ragResult.sources?.[0]?.score || 'none'
      });
      
      // Additional debug: Check if chunks were retrieved but filtered out
      if (ragResult.metrics.chunksRetrieved > 0 && (!ragResult.sources || ragResult.sources.length === 0)) {
        console.log('⚠️ RAG Debug: Chunks were retrieved but filtered out', {
          retrieved: ragResult.metrics.chunksRetrieved,
          afterFiltering: ragResult.sources ? ragResult.sources.length : 0
        });
      }

      // Check confidence against minimum threshold
      if (ragResult.metrics.confidence < this.config.minConfidenceThreshold) {
        console.log(`⚠️ Low confidence RAG result (${ragResult.metrics.confidence.toFixed(3)} < ${this.config.minConfidenceThreshold}), providing low-confidence response`);
        return this.createLowConfidenceFallbackResponse(ragResult, questionId, questionText);
      }
      
      // Format response
      return await this.formatRAGResponse(ragResult, questionId, questionText, options);
      
    } catch (error) {
      console.error('❌ RAG processing failed:', error);
      return this.createProcessingErrorFallbackResponse(questionId, questionText, error);
    }
  }

  /**
   * Format RAG response for conversation system
   */
  async formatRAGResponse(ragResult, questionId, questionText, options) {
    // Build response with sources
    let answer = ragResult.response;
    
    // Add source citations if available
    if (ragResult.sources && ragResult.sources.length > 0) {
      answer += '\n\n📚 Sources: ' + ragResult.sources.map(s => s.title).join(', ');
    }
    
    // Determine response type
    const responseType = this.determineResponseType(ragResult.metrics.confidence);
    
    // Generate contextual follow-up suggestions using semantic approach
    let followUpSuggestions;
    try {
      followUpSuggestions = await this.generateSemanticRAGFollowUps(ragResult, questionText, answer);
    } catch (error) {
      console.warn('⚠️ Semantic follow-up generation failed, using fallback:', error);
      followUpSuggestions = this.generateRuleBasedFollowUps(ragResult, questionText);
    }
    
    // Convert followUpSuggestions to the format expected by UI
    const followUps = followUpSuggestions.map((suggestion, index) => ({
      id: `rag-followup-${Date.now()}-${index}`,
      text: suggestion,
      source: 'rag',
      topic: questionText.includes('transfer') || questionText.includes('send') ? 'transfers' : 
             questionText.includes('receive') || questionText.includes('QR') ? 'receiving' :
             questionText.includes('raid') || questionText.includes('community') ? 'community' : 'general'
    }));

    // Successful RAG responses are always RAG+LLM hybrid - no generation flags needed
    const response = {
      questionId,
      question: questionText,
      answer,
      sentiment: 'helpful',
      type: responseType,
      confidence: ragResult.metrics.confidence,
      sources: ragResult.sources,
      metrics: ragResult.metrics,
      streaming: ragResult.streaming,
      followUpSuggestions: followUpSuggestions,
      followUps: followUps,  // Add the property expected by UI
      timestamp: Date.now()
    };
    
    console.log('🔍 RAG Integration: Formatted RAG+LLM hybrid response:', {
      hasFollowUps: !!response.followUps,
      followUpsCount: response.followUps ? response.followUps.length : 0,
      confidence: response.confidence,
      hasSource: !!response.sources && response.sources.length > 0
    });
    
    return response;
  }

  /**
   * Generate semantic follow-up suggestions based on RAG response
   * Uses semantic similarity to create diverse, contextual follow-ups
   */
  async generateSemanticRAGFollowUps(ragResult, questionText, responseText) {
    try {
      if (this.semanticFollowups) {
        console.log('🎯 Generating semantic follow-ups...');
        const followUps = await this.semanticFollowups.generateSemanticFollowUps(
          ragResult, 
          questionText, 
          responseText
        );
        console.log('✅ Semantic follow-ups generated:', followUps);
        return followUps;
      } else {
        console.warn('⚠️ Semantic follow-ups not available, using rule-based fallback');
        return this.generateRuleBasedFollowUps(ragResult, questionText);
      }
    } catch (error) {
      console.error('❌ Semantic follow-up generation failed:', error);
      return this.generateRuleBasedFollowUps(ragResult, questionText);
    }
  }

  /**
   * Fallback rule-based follow-up generation
   * Used when semantic generation fails
   */
  generateRuleBasedFollowUps(ragResult, questionText) {
    const question = questionText.toLowerCase();
    
    // Simple rule-based fallback
    if (question.includes('send') || question.includes('transfer')) {
      return [
        "How do I receive payments?",
        "What are the transaction fees?", 
        "What's new with NYLA recently?"
      ];
    } else if (question.includes('receive') || question.includes('qr')) {
      return [
        "How do I send tokens?",
        "Which blockchain should I use?",
        "How does NYLA compare to other tools?"
      ];
    } else if (question.includes('workflow') || question.includes('happens after')) {
      return [
        "How long do transactions take?",
        "What are the different blockchain networks?",
        "What makes NYLA special?"
      ];
    } else {
      return [
        "How do I get started with NYLA?",
        "What are the main features?",
        "What can NYLA help me with?"
      ];
    }
  }

  /**
   * Create generic fallback response when RAG is disabled
   */
  createGenericFallbackResponse(questionId, questionText) {
    const followUpSuggestions = [
      "How do I send tokens with NYLAGo?",
      "How do I generate a QR code?", 
      "What blockchains does NYLAGo support?"
    ];
    
    return this.createFallbackResponseBase(
      questionId, 
      questionText,
      "I'm currently unable to access my knowledge base. Please try asking about basic NYLAGo features.",
      followUpSuggestions,
      'generic-fallback'
    );
  }

  /**
   * Create fallback response when RAG initialization failed
   */
  createInitializationFallbackResponse(questionId, questionText) {
    const followUpSuggestions = [
      "What is NYLAGo?",
      "How do transfers work?", 
      "What are the main features?"
    ];
    
    return this.createFallbackResponseBase(
      questionId, 
      questionText,
      "I'm still initializing my knowledge base. Please try again in a moment, or ask about basic NYLAGo concepts.",
      followUpSuggestions,
      'initialization-fallback'
    );
  }

  /**
   * Create fallback response when index building fails
   */
  createIndexFailureFallbackResponse(questionId, questionText, error = null) {
    const followUpSuggestions = [
      "How do I use the Send tab?",
      "How do I use the Receive tab?", 
      "What is the Raid feature?"
    ];
    
    const message = error 
      ? "I'm having trouble building my knowledge index. Please try basic questions about NYLAGo features."
      : "My knowledge index is temporarily unavailable. I can help with basic NYLAGo questions.";
    
    return this.createFallbackResponseBase(
      questionId, 
      questionText,
      message,
      followUpSuggestions,
      'index-failure-fallback'
    );
  }

  /**
   * Create fallback response for low confidence results
   */
  createLowConfidenceFallbackResponse(ragResult, questionId, questionText) {
    const followUpSuggestions = [
      "Can you rephrase your question?",
      "What specific NYLAGo feature interests you?", 
      "Would you like to know about transfers or receiving?"
    ];
    
    return this.createFallbackResponseBase(
      questionId, 
      questionText,
      `I'm not quite sure about that. Could you rephrase your question or be more specific? (Confidence: ${(ragResult.metrics.confidence * 100).toFixed(1)}%)`,
      followUpSuggestions,
      'low-confidence-fallback'
    );
  }

  /**
   * Create fallback response for processing errors
   */
  createProcessingErrorFallbackResponse(questionId, questionText, error) {
    const followUpSuggestions = [
      "Try asking again in a moment",
      "What is NYLAGo?", 
      "How do I get started?"
    ];
    
    return this.createFallbackResponseBase(
      questionId, 
      questionText,
      "I encountered an error while processing your question. Please try again or ask about basic NYLAGo features.",
      followUpSuggestions,
      'processing-error-fallback'
    );
  }

  /**
   * Base method for creating fallback responses
   */
  createFallbackResponseBase(questionId, questionText, message, followUpSuggestions, source) {
    // Convert to UI-expected format
    const followUps = followUpSuggestions.map((suggestion, index) => ({
      id: `${source}-${Date.now()}-${index}`,
      text: suggestion,
      source: source,
      topic: 'general'
    }));
    
    const response = {
      questionId,
      question: questionText,
      answer: message,
      text: message, // Also include as 'text' for compatibility
      sentiment: 'informative',
      confidence: 0.1, // Low confidence for fallback responses
      followUpSuggestions: followUpSuggestions,
      followUps: followUps,
      sources: [],
      timestamp: Date.now(),
      isFallback: true,
      fallbackReason: source
    };
    
    console.log(`🔍 RAG Fallback (${source}): Generated response with followUps:`, {
      hasFollowUps: !!response.followUps,
      followUpsCount: response.followUps ? response.followUps.length : 0,
      message: message.substring(0, 50) + '...'
    });
    
    return response;
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