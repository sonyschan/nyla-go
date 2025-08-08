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
      const knowledgeBase = this.conversationManager.kb.knowledgeBase;
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
        
        // Set up event listeners
        this.productionSync.on('updateAvailable', (data) => {
          console.log('🆕 Production update available:', data.reason);
          this.handleProductionUpdate(data);
        });
        
        console.log('🌐 Production sync integrated with RAG');
      }
      
      // Check if index needs to be built
      const stats = this.ragPipeline.getStats();
      if (stats.vectorDB && stats.vectorDB.chunkCount > 0) {
        this.indexBuilt = true;
        console.log(`✅ Using existing index with ${stats.vectorDB.chunkCount} chunks`);
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
      const knowledgeBase = this.conversationManager.kb.knowledgeBase;
      
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
    // Check if RAG is enabled and ready
    if (!this.config.enableRAG || !this.initialized || !this.indexBuilt) {
      console.log('⚠️ RAG not available, falling back to keyword search');
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
    console.log('🔍 Using keyword search fallback');
    
    // Use existing conversation manager's question processing
    return await this.conversationManager.processQuestionWithKeywords(
      questionId,
      questionText,
      options
    );
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
      // Check user preferences for auto-update
      const autoUpdate = localStorage.getItem('nyla-auto-update') === 'true';
      
      if (autoUpdate) {
        console.log('🔄 Auto-updating to production version...');
        await this.productionSync.downloadAndInstall();
        
        // Notify user of successful update
        this.showUpdateNotification('Update completed successfully!', 'success');
      } else {
        // Show update available notification
        this.showUpdateNotification(
          `New knowledge base update available (${updateData.reason})`,
          'info',
          () => this.promptUserForUpdate(updateData)
        );
      }
    } catch (error) {
      console.error('❌ Failed to handle production update:', error);
      this.showUpdateNotification('Update failed. Using local version.', 'error');
    }
  }

  /**
   * Prompt user for manual update
   */
  async promptUserForUpdate(updateData) {
    const shouldUpdate = confirm(
      `A new knowledge base update is available.\n\n` +
      `Reason: ${updateData.reason}\n` +
      `Current: ${updateData.current?.hash?.substring(0, 8) || 'none'}\n` +
      `New: ${updateData.production.hash.substring(0, 8)}\n\n` +
      `Download and install update now?`
    );
    
    if (shouldUpdate) {
      try {
        this.showUpdateNotification('Downloading update...', 'info');
        
        // Show progress during update
        this.productionSync.on('updateProgress', (progress) => {
          this.showUpdateProgress(progress);
        });
        
        await this.productionSync.downloadAndInstall();
        this.showUpdateNotification('Update completed successfully!', 'success');
        
      } catch (error) {
        console.error('❌ Manual update failed:', error);
        this.showUpdateNotification('Update failed. Continuing with local version.', 'error');
      }
    }
  }

  /**
   * Show update notification to user
   */
  showUpdateNotification(message, type = 'info', action = null) {
    // Try to use existing NYLA UI notification system
    if (window.nylaUI && window.nylaUI.showNotification) {
      window.nylaUI.showNotification(message, type, action);
    } else {
      // Fallback to console
      const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
      console.log(`${emoji} ${message}`);
      
      // Simple browser notification if available
      if (action && confirm(message + '\n\nTake action?')) {
        action();
      }
    }
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
  // Create RAG integration
  const ragIntegration = new NYLARAGIntegration(conversationManager);
  
  // Store reference
  conversationManager.ragIntegration = ragIntegration;
  
  // Override processQuestion method
  const originalProcessQuestion = conversationManager.processQuestion.bind(conversationManager);
  
  conversationManager.processQuestion = async function(questionId, questionText, primaryTopic, options = {}) {
    // Try RAG first if available
    if (ragIntegration.initialized && ragIntegration.config.enableRAG) {
      try {
        return await ragIntegration.processQuestion(questionId, questionText, options);
      } catch (error) {
        console.warn('RAG processing failed, falling back to original method:', error);
      }
    }
    
    // Fallback to original method
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