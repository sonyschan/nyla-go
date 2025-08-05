/**
 * NYLA LLM Engine - Phase 2 WebLLM Integration
 * Provides local AI capabilities using Phi-3-Mini via WebLLM
 */

class NYLALLMEngine {
  constructor() {
    this.engine = null;
    this.isInitialized = false;
    this.isLoading = false;
    this.modelConfig = {
      model: "Phi-3-mini-4k-instruct-q4f16_1-MLC", // Optimized for M2 chip performance
      temperature: 0.5,      // Reduced for more focused responses
      max_tokens: 300,       // Increased to allow complete JSON with followup suggestions
      top_p: 0.8,           // Reduced for more focused responses
      top_k: 40             // Added for additional speed optimization
    };
    this.systemPrompt = this.createSystemPrompt();
    
    // Performance tracking
    this.requestCount = 0;
    this.totalResponseTime = 0;
    this.lastRequestTime = null;
    
    // Engine health monitoring
    this.isEngineReady = false;
    this.isEngineWarmedUp = false;
    this.engineCreatedAt = null;
  }

  /**
   * Preload and initialize WebLLM engine in background
   * Call this when PWA starts to avoid first-click delay
   */
  async preloadInitialize() {
    console.log('NYLA LLM: 🚀 Starting background preload initialization...');
    return this.initialize(true);
  }

  /**
   * Initialize WebLLM engine
   */
  async initialize(isPreload = false) {
    if (this.isInitialized) return true;
    if (this.isLoading) return this.waitForInitialization();

    this.isLoading = true;
    
    if (isPreload) {
      console.log('NYLA LLM: 🔄 Background preload - users can continue using PWA while this loads');
    }
    
    try {
      console.log('NYLA LLM: Initializing WebLLM engine...');
      console.log('NYLA LLM: 💡 To see detailed LLM logs, add ?debug=true to the URL');
      console.log(`NYLA LLM: Model: ${this.modelConfig.model} (Phi-3-Mini q4f16_1 optimized for M2 chip)`);
      
      // Check WebGPU support first
      if (!navigator.gpu) {
        const userAgent = navigator.userAgent.toLowerCase();
        const isAndroid = userAgent.includes('android');
        const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        
        if (isAndroid) {
          throw new Error('WebGPU not supported on Android - LLM requires WebGPU for inference');
        } else if (isMobile) {
          throw new Error('WebGPU not supported on this mobile device - LLM requires WebGPU for inference');
        } else {
          throw new Error('WebGPU not supported - required for in-browser AI inference. Try Chrome/Edge with WebGPU enabled.');
        }
      }
      console.log('NYLA LLM: ✅ WebGPU detected');
      
      // Load WebLLM dynamically
      if (!window.webllm) {
        console.log('NYLA LLM: Loading WebLLM library...');
        const loaded = await this.loadWebLLM();
        if (!loaded) {
          throw new Error('Failed to load WebLLM library');
        }
      }

      // Double-check library loaded
      if (!window.webllm || !window.webllm.MLCEngine) {
        throw new Error('WebLLM library not properly loaded - MLCEngine not found');
      }

      // Initialize the engine
      console.log('NYLA LLM: Creating MLCEngine instance for in-browser inference...');
      this.engine = new window.webllm.MLCEngine();
      
      console.log(`NYLA LLM: Loading ${this.modelConfig.model} model...`);
      console.log('NYLA LLM: ⏳ This may take 1-3 minutes on first load (model downloads & compiles)');
      console.log('NYLA LLM: 🔄 Subsequent loads will be much faster (cached)');
      
      // Initialize model with progress callback
      await this.engine.reload(this.modelConfig.model, {
        // Progress callback for model loading
        initProgressCallback: (progress) => {
          if (progress.progress) {
            console.log(`NYLA LLM: Loading progress: ${Math.round(progress.progress * 100)}%`);
          }
        }
      });
      
      this.isInitialized = true;
      this.isLoading = false;
      this.isEngineReady = true;
      this.engineCreatedAt = Date.now();
      
      if (isPreload) {
        console.log('NYLA LLM: ✅ Background preload completed! 🧠✨');
        console.log('NYLA LLM: 🎯 Engine ready - first user click will be fast');
      } else {
        console.log('NYLA LLM: ✅ WebLLM engine initialized successfully! 🧠✨');
      }
      console.log('NYLA LLM: 🤖 Ready for in-browser AI inference with Phi-3-Mini q4f16_1 (M2 optimized)');
      console.log('NYLA LLM: 🔥 Engine will stay hot and ready for subsequent requests');
      
      // Warm up the engine with a tiny test prompt to ensure GPU buffers are allocated
      console.log('NYLA LLM: Calling warmupEngine...');
      await this.warmupEngine();
      console.log('NYLA LLM: Warmup completed, isEngineWarmedUp:', this.isEngineWarmedUp);
      
      return true;

    } catch (error) {
      console.error('NYLA LLM: Initialization failed', error);
      console.log('NYLA LLM: Error details:', error.message);
      this.isLoading = false;
      this.isInitialized = false;
      
      // Show user-friendly message about fallback
      console.log('NYLA LLM: 💡 Falling back to enhanced static responses');
      console.log('NYLA LLM: 🔧 WebLLM will be available in future updates');
      console.log('NYLA LLM: 🔍 For troubleshooting, add ?debug=true to the URL for detailed logs');
      
      return false;
    }
  }

  /**
   * Load WebLLM library dynamically
   */
  async loadWebLLM() {
    try {
      console.log('NYLA LLM: Loading WebLLM via dynamic import...');
      
      // Use dynamic import - latest WebLLM version for better performance
      const webllmModule = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@latest/lib/index.js');
      
      console.log('NYLA LLM: WebLLM module loaded successfully');
      console.log('NYLA LLM: Available exports:', Object.keys(webllmModule));
      
      // Make WebLLM available globally - assign the whole module
      window.webllm = webllmModule;
      
      // Verify MLCEngine is available
      if (!webllmModule.MLCEngine) {
        console.error('NYLA LLM: MLCEngine not found in module exports:', Object.keys(webllmModule));
        throw new Error('MLCEngine not found in WebLLM module');
      }
      
      console.log('NYLA LLM: WebLLM library successfully loaded and MLCEngine available');
      return true;
      
    } catch (error) {
      console.error('NYLA LLM: Dynamic import failed:', error);
      
      // Fallback: Try loading WebLLM with a different approach
      console.log('NYLA LLM: Trying script tag fallback...');
      return this.loadWebLLMFallback();
    }
  }
  
  /**
   * Fallback method to load WebLLM
   */
  async loadWebLLMFallback() {
    return new Promise((resolve, reject) => {
      // Try a different CDN or version
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/lib/index.js';
      script.type = 'module';
      
      script.onload = () => {
        console.log('NYLA LLM: WebLLM fallback library loaded');
        // Check multiple times with increasing delays
        let attempts = 0;
        const checkLibrary = () => {
          attempts++;
          if (window.webllm && window.webllm.MLCEngine) {
            console.log('NYLA LLM: WebLLM found after', attempts, 'attempts');
            resolve();
          } else if (attempts < 10) {
            console.log('NYLA LLM: Waiting for WebLLM... attempt', attempts);
            setTimeout(checkLibrary, 500 * attempts); // Exponential backoff
          } else {
            reject(new Error('WebLLM library loaded but not available after multiple attempts'));
          }
        };
        checkLibrary();
      };
      
      script.onerror = (error) => {
        console.error('NYLA LLM: Failed to load WebLLM fallback library', error);
        reject(error);
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Wait for initialization to complete
   */
  async waitForInitialization() {
    while (this.isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.isInitialized;
  }

  /**
   * Generate response using LLM
   */
  async generateResponse(userMessage, conversationContext = {}) {
    // Check if engine is ready or needs initialization (including warmup)
    if (!this.isInitialized || !this.isEngineReady || !this.isEngineWarmedUp) {
      if (this.isLoading) {
        console.log('NYLA LLM: ⏳ Engine is preloading in background, waiting...');
        const initialized = await this.waitForInitialization();
        if (!initialized) {
          throw new Error('LLM engine failed to initialize');
        }
      } else {
        console.log('NYLA LLM: ⚡ Engine not fully ready (init/warmup), initializing now...');
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('LLM engine not available');
        }
      }
    }

    const startTime = Date.now();
    this.requestCount++;
    this.lastRequestTime = startTime;

    try {
      // Timing: Prompt preparation
      const promptStart = performance.now();
      const prompt = this.buildPrompt(userMessage, conversationContext);
      const promptTime = performance.now() - promptStart;
      
      console.log(`NYLA LLM: Generating response #${this.requestCount} for:`, userMessage);
      console.log('NYLA LLM: 🔥 Using warm engine (no reload required)');
      console.log(`⏱️ Prompt preparation: ${promptTime.toFixed(2)}ms`);
      
      // Log the full prompt being sent to LLM
      console.log('🧠 NYLA LLM: System Prompt:', this.systemPrompt);
      console.log('🧠 NYLA LLM: User Prompt:', prompt);

      // Timing: LLM inference
      const inferenceStart = performance.now();
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: this.modelConfig.temperature,
        max_tokens: this.modelConfig.max_tokens,
        top_p: this.modelConfig.top_p,
        top_k: this.modelConfig.top_k
      });
      const inferenceTime = performance.now() - inferenceStart;

      // Timing: Response parsing
      const parseStart = performance.now();
      const generatedText = response.choices[0].message.content;
      const parsedResponse = this.parseResponse(generatedText, conversationContext);
      const parseTime = performance.now() - parseStart;

      // Overall timing
      const totalTime = Date.now() - startTime;
      this.totalResponseTime += totalTime;
      const avgResponseTime = Math.round(this.totalResponseTime / this.requestCount);

      console.log(`⏱️ LLM inference took ${(inferenceTime / 1000).toFixed(2)}s`);
      console.log(`⏱️ Response parsing: ${parseTime.toFixed(2)}ms`);
      console.log(`NYLA LLM: ✅ Total response time: ${totalTime}ms (avg: ${avgResponseTime}ms)`);
      console.log('NYLA LLM: Raw response length:', generatedText.length, 'chars');
      console.log('NYLA LLM: Raw response:', generatedText);
      
      // Check if response might be truncated (more accurate estimate: ~4 chars per token)
      if (generatedText.length >= this.modelConfig.max_tokens * 4) {
        console.warn('NYLA LLM: Response may be truncated. Consider increasing max_tokens.');
      }

      return parsedResponse;

    } catch (error) {
      console.error('NYLA LLM: Response generation failed', error);
      // Don't reset engine state on error - keep it warm for retry
      throw error;
    }
  }

  /**
   * Generate streaming response using LLM
   */
  async generateStreamingResponse(userMessage, conversationContext = {}, onChunk = null) {
    // Ensure engine is ready - same warm engine (including warmup)
    if (!this.isInitialized || !this.isEngineReady || !this.isEngineWarmedUp) {
      console.log('NYLA LLM: Engine not ready for streaming (init/warmup), initializing...');
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('LLM engine not available');
      }
    }

    const startTime = Date.now();
    this.requestCount++;
    this.lastRequestTime = startTime;

    try {
      // Timing: Prompt preparation for streaming
      const promptStart = performance.now();
      const prompt = this.buildPrompt(userMessage, conversationContext);
      const promptTime = performance.now() - promptStart;
      
      console.log(`NYLA LLM: Starting streaming response #${this.requestCount} for:`, userMessage);
      console.log('NYLA LLM: 🔥 Using warm engine for streaming (no reload required)');
      console.log(`⏱️ Streaming prompt preparation: ${promptTime.toFixed(2)}ms`);
      
      // Log the full prompt being sent to LLM (streaming)
      console.log('🧠 NYLA LLM: System Prompt (Streaming):', this.systemPrompt);
      console.log('🧠 NYLA LLM: User Prompt (Streaming):', prompt);

      let fullResponse = '';
      
      // Timing: Streaming inference start
      const streamStart = performance.now();
      const stream = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: this.modelConfig.temperature,
        max_tokens: this.modelConfig.max_tokens,
        top_p: this.modelConfig.top_p,
        top_k: this.modelConfig.top_k,
        stream: true
      });

      // Process streaming chunks
      for await (const chunk of stream) {
        if (chunk.choices?.[0]?.delta?.content) {
          const content = chunk.choices[0].delta.content;
          fullResponse += content;
          
          // Call the chunk callback if provided
          if (onChunk && typeof onChunk === 'function') {
            onChunk(content, fullResponse);
          }
        }
      }

      const streamTime = performance.now() - streamStart;
      const totalTime = Date.now() - startTime;
      
      console.log(`⏱️ Streaming inference took ${(streamTime / 1000).toFixed(2)}s`);
      console.log(`NYLA LLM: ✅ Streaming response completed in ${totalTime}ms`);
      
      return this.parseResponse(fullResponse, conversationContext);

    } catch (error) {
      console.error('NYLA LLM: Streaming response failed:', error);
      // Fallback to non-streaming
      console.log('NYLA LLM: Falling back to non-streaming response');
      return await this.generateResponse(userMessage, conversationContext);
    }
  }

  /**
   * Create system prompt for NYLA
   */

  
  createSystemPrompt() {
    return `You are NYLA, AI for NYLAGo, a UI to generate crypto transfer/swap commands for X.com. NYLA executes on X.com. Use only "Relevant knowledge" to answer. 
    Respond in JSON: 
    { 
      "text": "<300 chars>", 
      "sentiment": "helpful|excited|friendly", 
      "followUpSuggestions": [
        { "text": "Short question?", "topic": "topic" }
      ] 
    }. Keep followUps brief. If beyond knowledge, say: "I need to study more."`
  }

  /**
   * Extract relevant knowledge based on user query
   * Updated for V2 dynamic search results structure
   */
  extractRelevantKnowledge(userMessage, knowledgeContext) {
    const query = userMessage.toLowerCase();
    let relevantInfo = [];
    
    if (!knowledgeContext || typeof knowledgeContext !== 'object') {
      return null;
    }
    
    // Handle V2 search results structure
    if (knowledgeContext.searchResults && Array.isArray(knowledgeContext.searchResults)) {
      console.log('NYLA LLM: Processing V2 search results structure');
      
      // Deduplicate and prioritize results
      const uniqueSources = new Set();
      const prioritizedResults = [];
      
      for (const result of knowledgeContext.searchResults) {
        if (!uniqueSources.has(result.source) && result.data && typeof result.data === 'object') {
          uniqueSources.add(result.source);
          const content = this.extractContentFromSearchResult(result.data, query);
          if (content) {
            prioritizedResults.push(content);
          }
        }
      }
      
      if (prioritizedResults.length > 0) {
        // Limit total knowledge to ~300 tokens
        const combined = prioritizedResults.join(' | ');
        const result = combined.length > 1200 ? combined.substring(0, 1200) + '...' : combined;
        console.log(`NYLA LLM: Extracted knowledge (~${Math.ceil(result.length/4)} tokens):`, result.substring(0, 100) + '...');
        return result;
      }
    }
    
    // Fallback: Handle legacy V1 structure if still present
    if (knowledgeContext.supportedBlockchains || knowledgeContext.nylagoCore) {
      console.log('NYLA LLM: Processing legacy V1 knowledge structure');
      return this.extractFromLegacyStructure(userMessage, knowledgeContext);
    }
    
    return null;
  }

  /**
   * Extract content from individual search result (token-optimized)
   */
  extractContentFromSearchResult(data, query) {
    const queryLower = query.toLowerCase();
    const content = [];
    
    // Prioritize most relevant fields based on query
    if (queryLower.includes('blockchain') || queryLower.includes('supported')) {
      // For blockchain queries, focus on blockchain info
      if (data.summary) content.push(data.summary);
      if (data.supported) {
        const chains = [];
        Object.entries(data.supported).forEach(([key, value]) => {
          if (value.name) chains.push(value.name);
        });
        if (chains.length > 0) content.push(`Supported: ${chains.join(', ')}`);
      }
    } else if (queryLower.includes('transfer') || queryLower.includes('send') || queryLower.includes('how')) {
      // For transfer queries, focus on how it works
      if (data.primaryPurpose) content.push(data.primaryPurpose);
      if (data.howItWorks?.overview) content.push(data.howItWorks.overview);
      if (data.howItWorks?.important) content.push(data.howItWorks.important);
    } else if (queryLower.includes('raid') || queryLower.includes('community')) {
      // For raid queries
      if (data.purpose) content.push(data.purpose);
      if (data.access) content.push(data.access);
    } else {
      // Default: extract key info only
      if (data.summary) content.push(data.summary);
      else if (data.description) content.push(data.description);
      else if (data.primaryPurpose) content.push(data.primaryPurpose);
    }
    
    // Limit to ~100 tokens max per source
    const result = content.join('. ');
    return result.length > 400 ? result.substring(0, 400) + '...' : result;
  }

  /**
   * Legacy V1 structure extraction (fallback)
   */
  extractFromLegacyStructure(userMessage, knowledgeContext) {
    const query = userMessage.toLowerCase();
    let relevantInfo = [];
    
    // Extract blockchain information
    if (query.includes('blockchain') || query.includes('chain') || query.includes('network') || 
        query.includes('solana') || query.includes('ethereum') || query.includes('algorand') ||
        query.includes('supported') || query.includes('which')) {
      if (knowledgeContext.supportedBlockchains?.content?.summary) {
        relevantInfo.push(knowledgeContext.supportedBlockchains.content.summary);
      }
    }
    
    // Extract transfer/how it works information
    if (query.includes('how') || query.includes('work') || query.includes('transfer') || 
        query.includes('send') || query.includes('command')) {
      if (knowledgeContext.nylagoCore?.content?.howItWorks) {
        const hw = knowledgeContext.nylagoCore.content.howItWorks;
        if (query.includes('send')) {
          relevantInfo.push(hw.sendTab);
        } else if (query.includes('receive')) {
          relevantInfo.push(hw.receiveTab);
        } else {
          relevantInfo.push(hw.overview);
          relevantInfo.push(hw.important);
        }
      }
      if (knowledgeContext.nylaCommands?.content?.description) {
        relevantInfo.push(knowledgeContext.nylaCommands.content.description);
      }
    }
    
    // Extract raid feature information
    if (query.includes('raid') || query.includes('community') || query.includes('engage') || 
        query.includes('...') || query.includes('three dots')) {
      if (knowledgeContext.raidFeature?.content) {
        const raid = knowledgeContext.raidFeature.content;
        relevantInfo.push(`${raid.purpose}. ${raid.access}. ${raid.actions}`);
      }
    }
    
    // Extract QR code information
    if (query.includes('qr') || query.includes('code') || query.includes('scan') || 
        (query.includes('receive') && query.includes('payment'))) {
      if (knowledgeContext.qrCodes?.content) {
        const qr = knowledgeContext.qrCodes.content;
        relevantInfo.push(`${qr.purpose}. ${qr.benefits}. ${qr.usage}`);
      }
    }
    
    // Extract blockchain information for cost/fee queries (simplified)
    if (query.includes('fee') || query.includes('cost') || query.includes('price') || 
        query.includes('cheap') || query.includes('expensive')) {
      if (knowledgeContext.supportedBlockchains?.content?.supported) {
        const chains = knowledgeContext.supportedBlockchains.content.supported;
        relevantInfo.push(`Blockchains: Solana (${chains.solana.description}), Ethereum (${chains.ethereum.description}), Algorand (${chains.algorand.description})`);
      }
    }
    
    // Extract platform limitation information
    if (query.includes('telegram') || query.includes('platform') || query.includes('support')) {
      if (knowledgeContext.platformLimitations?.content) {
        const pl = knowledgeContext.platformLimitations.content;
        relevantInfo.push(`${pl.supported}. ${pl.notSupported}`);
      }
    }
    
    // Extract general features
    if (query.includes('what') || query.includes('feature') || query.includes('nyla')) {
      if (knowledgeContext.about?.content?.description) {
        relevantInfo.push(knowledgeContext.about.content.description);
      }
      if (knowledgeContext.nylagoCore?.content?.primaryPurpose) {
        relevantInfo.push(knowledgeContext.nylagoCore.content.primaryPurpose);
      }
    }
    
    // Return combined relevant information
    if (relevantInfo.length > 0) {
      // Remove duplicates and join with space
      const uniqueInfo = [...new Set(relevantInfo)];
      return uniqueInfo.join(' ');
    }
    
    return null;
  }

  /**
   * Build prompt with context
   */
  buildPrompt(userMessage, context) {
    const {
      timezone = 'UTC',
      localTime = new Date().toISOString(),
      conversationHistory = [],
      userProfile = {},
      knowledgeContext = null
    } = context;

    // Extract time from localTime for cleaner format
    const date = new Date(localTime);
    const timeStr = date.toTimeString().split(' ')[0]; // HH:MM:SS format
    
    let prompt = `Time: ${timeStr} (${timezone})\n`;

    if (knowledgeContext) {
      const relevantInfo = this.extractRelevantKnowledge(userMessage, knowledgeContext);
      if (relevantInfo) {
        prompt += `Knowledge: ${relevantInfo}\n`;
      }
    }

    prompt += `Question: "${userMessage}"\n`;
    prompt += `Answer in JSON as per system prompt.`;

    // Estimate token count (rough: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(prompt.length / 4);
    console.log(`🧠 NYLA LLM: Total prompt tokens (estimated): ${estimatedTokens}/4096 (${Math.round(estimatedTokens/4096*100)}% of context)`);
    
    return prompt;
  }

  /**
   * Parse LLM response - Memory-safe version
   */
  parseResponse(generatedText, context) {
    try {
      // Input size limit to prevent memory issues
      const MAX_RESPONSE_SIZE = 50000; // 50KB limit
      if (generatedText && generatedText.length > MAX_RESPONSE_SIZE) {
        console.warn('NYLA LLM: Response too large, truncating to prevent memory issues');
        generatedText = generatedText.substring(0, MAX_RESPONSE_SIZE);
      }

      // Clean up the text - remove any markdown code blocks
      let cleanText = generatedText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Memory-safe JSON extraction using iterative approach
      const jsonObject = this.extractJsonSafely(cleanText);
      if (jsonObject) {
        try {
          console.log('NYLA LLM: Successfully parsed JSON response');
          return this.validateResponse(jsonObject, context);
        } catch (parseError) {
          console.warn('NYLA LLM: JSON validation failed:', parseError.message);
        }
      }
      
      // If no valid JSON found, extract text content
      console.log('NYLA LLM: No valid JSON found, attempting to extract partial content');
      
      // Try to extract text field even from incomplete JSON
      const textMatch = cleanText.match(/"text"\s*:\s*"([^"]*)/);
      if (textMatch && textMatch[1]) {
        // Clean up any escape sequences
        let extractedText = textMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        
        // If text seems cut off, add ellipsis
        if (!extractedText.endsWith('.') && !extractedText.endsWith('!') && !extractedText.endsWith('?')) {
          extractedText += '...';
        }
        
        console.log('NYLA LLM: Extracted partial text from incomplete response');
        return {
          text: extractedText,
          sentiment: 'helpful',
          confidence: 0.7,
          personalCare: { shouldAsk: false },
          followUpSuggestions: this.generateDefaultFollowUps(context),
          contextRelevant: true
        };
      }
      
    } catch (error) {
      console.warn('NYLA LLM: Failed to parse response:', error.message);
    }

    // Final fallback - use the raw text with safety limits
    const safeText = generatedText ? 
      (generatedText.length > 500 ? generatedText.substring(0, 500) + '...' : generatedText) :
      "I'm here to help you with NYLA! What would you like to know?";
    
    console.log('NYLA LLM: Using raw text as fallback');
    return {
      text: safeText,
      sentiment: 'helpful',
      confidence: 0.6,
      personalCare: { shouldAsk: false },
      followUpSuggestions: this.generateDefaultFollowUps(context),
      contextRelevant: true
    };
  }

  /**
   * Memory-safe JSON extraction without catastrophic backtracking
   */
  extractJsonSafely(text) {
    if (!text || text.length === 0) return null;
    
    // Look for JSON objects using simple character counting
    let braceCount = 0;
    let startIndex = -1;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === '{') {
        if (braceCount === 0) {
          startIndex = i;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        
        if (braceCount === 0 && startIndex !== -1) {
          // Found complete JSON object
          const jsonStr = text.substring(startIndex, i + 1);
          try {
            return JSON.parse(jsonStr);
          } catch (error) {
            console.debug('NYLA LLM: JSON parse attempt failed for:', jsonStr.substring(0, 100));
            // Continue looking for other JSON objects
            startIndex = -1;
          }
        }
      }
      
      // Safety break for very long texts
      if (i > 10000) {
        console.warn('NYLA LLM: Breaking JSON search after 10K characters to prevent memory issues');
        break;
      }
    }
    
    return null;
  }

  /**
   * Generate default follow-up suggestions
   */
  generateDefaultFollowUps(context) {
    const allSuggestions = [
      { text: "How do I create a transfer command?" },
      { text: "What happens after I post on X.com?" },
      { text: "How do QR codes work?" },
      { text: "Which blockchain is best for transfers?" },
      { text: "Can I send to multiple recipients?" },
      { text: "What are the transaction fees?" },
      { text: "How do I use the Receive tab?" },
      { text: "What is the Raid tab for?" }
    ];
    
    // Randomly select 1-3 suggestions
    const count = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    const shuffled = allSuggestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Validate and normalize response
   */
  validateResponse(response, context) {
    // Ensure required fields
    response.text = response.text || "I'm here to help with NYLA and cryptocurrency questions!";
    response.sentiment = response.sentiment || 'helpful';
    response.confidence = Math.min(Math.max(response.confidence || 0.7, 0), 1);
    response.personalCare = response.personalCare || { shouldAsk: false };
    response.followUpSuggestions = response.followUpSuggestions || [];

    // Enforce 300 character limit for faster generation
    if (response.text.length > 300) {
      console.log(`NYLA LLM: Response too long (${response.text.length} chars), truncating to 300...`);
      // Find last complete sentence within 300 chars
      const truncated = response.text.substring(0, 297);
      const lastSentence = truncated.lastIndexOf('.');
      const lastExclamation = truncated.lastIndexOf('!');
      const lastQuestion = truncated.lastIndexOf('?');
      const lastPunctuation = Math.max(lastSentence, lastExclamation, lastQuestion);
      
      if (lastPunctuation > 200) {
        // Cut at last sentence if it's reasonable
        response.text = response.text.substring(0, lastPunctuation + 1);
      } else {
        // Just truncate and add ellipsis
        response.text = truncated + '...';
      }
      console.log(`NYLA LLM: Truncated to ${response.text.length} characters`);
    }

    // Debug LLM followup suggestions
    console.log('NYLA LLM: LLM provided followup suggestions:', response.followUpSuggestions);
    
    // If no follow-up suggestions, generate random 1-3
    if (response.followUpSuggestions.length === 0) {
      console.log('NYLA LLM: No LLM followups, generating defaults');
      response.followUpSuggestions = this.generateDefaultFollowUps(context);
    } else if (response.followUpSuggestions.length > 3) {
      console.log('NYLA LLM: Too many LLM followups, selecting random subset');
      // If LLM returns more than 3, randomly select 1-3 from them
      const count = Math.floor(Math.random() * 3) + 1;
      const shuffled = response.followUpSuggestions.sort(() => 0.5 - Math.random());
      response.followUpSuggestions = shuffled.slice(0, count);
    }

    // Add personal care logic based on timezone and time
    if (context.timezone && context.localTime) {
      response.personalCare = this.enhancePersonalCare(response.personalCare, context);
    }

    return response;
  }

  /**
   * Enhance personal care with timezone awareness
   */
  enhancePersonalCare(personalCare, context) {
    const shouldShowPersonalCare = Math.random() < 0.2; // 20% probability
    
    if (!shouldShowPersonalCare || personalCare.shouldAsk) {
      return personalCare;
    }

    const localDate = new Date(context.localTime);
    const hour = localDate.getHours();

    let careMessage = null;
    let careType = 'general';

    if (hour >= 6 && hour < 10) {
      careMessage = `BTW, it's ${hour}:00 in your timezone - did you have breakfast yet? ☕`;
      careType = 'meal';
    } else if (hour >= 12 && hour < 14) {
      careMessage = `Oh, it's lunch time where you are (${hour}:00)! Taking a break? 🍽️`;
      careType = 'meal';
    } else if (hour >= 18 && hour < 20) {
      careMessage = `It's dinner time in your area (${hour}:00) - hope you're eating well! 🌙`;
      careType = 'meal';
    } else if (hour >= 22 || hour < 6) {
      careMessage = `It's getting late where you are - don't stay up too late! 😴`;
      careType = 'general';
    } else if (Math.random() < 0.5) {
      careMessage = `BTW, how are you feeling today? 😊`;
      careType = 'mood';
    }

    if (careMessage) {
      return {
        shouldAsk: true,
        type: careType,
        message: careMessage
      };
    }

    return personalCare;
  }

  /**
   * Warm up the engine with a minimal test to ensure GPU buffers are ready
   */
  async warmupEngine() {
    try {
      console.log('NYLA LLM: 🔥 Warming up engine to ensure GPU buffers are allocated...');
      console.log('NYLA LLM: Engine instance:', !!this.engine);
      
      if (!this.engine) {
        throw new Error('Engine instance not available for warmup');
      }
      
      // Send a tiny test prompt to warm up the engine
      console.log('NYLA LLM: Sending warmup test prompt...');
      const warmupResponse = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: "Hi" }
        ],
        temperature: 0.1,
        max_tokens: 5
      });
      
      console.log('NYLA LLM: ✅ Engine warmed up successfully - GPU buffers ready');
      console.log('NYLA LLM: 🚀 Subsequent requests will be faster');
      console.log('NYLA LLM: Warmup response received:', warmupResponse?.choices?.[0]?.message?.content || 'No content');
      this.isEngineWarmedUp = true;
      console.log('NYLA LLM: isEngineWarmedUp set to:', this.isEngineWarmedUp);
      
    } catch (error) {
      console.error('NYLA LLM: ❌ Engine warmup failed:', error.message);
      console.error('NYLA LLM: Warmup error stack:', error.stack);
      console.warn('NYLA LLM: Continuing with engine marked as not warmed up');
      this.isEngineWarmedUp = false;
      // Don't throw - warmup failure shouldn't prevent normal operation
    }
  }

  /**
   * Check if engine is ready
   */
  isReady() {
    const ready = this.isInitialized && this.isEngineReady && this.isEngineWarmedUp && this.engine;
    if (!ready) {
      console.log('NYLA LLM: Engine not ready - initialized:', this.isInitialized, 'engineReady:', this.isEngineReady, 'warmedUp:', this.isEngineWarmedUp, 'engine:', !!this.engine);
    } else {
      console.log('NYLA LLM: ✅ Engine fully ready for inference');
    }
    return ready;
  }

  /**
   * Get engine status
   */
  getStatus() {
    const uptime = this.engineCreatedAt ? Date.now() - this.engineCreatedAt : 0;
    const avgResponseTime = this.requestCount > 0 ? Math.round(this.totalResponseTime / this.requestCount) : 0;
    
    return {
      initialized: this.isInitialized,
      loading: this.isLoading,
      engineReady: this.isEngineReady,
      warmedUp: this.isEngineWarmedUp,
      model: this.modelConfig.model,
      ready: this.isReady(),
      requestCount: this.requestCount,
      avgResponseTime: avgResponseTime,
      uptime: Math.round(uptime / 1000), // seconds
      lastRequestTime: this.lastRequestTime
    };
  }

  /**
   * Cleanup resources (WARNING: This will unload the model and GPU buffers)
   * Only call this when absolutely necessary (e.g., page unload, memory pressure)
   */
  cleanup(force = false) {
    if (!force) {
      console.warn('NYLA LLM: ⚠️  cleanup() called without force=true');
      console.warn('NYLA LLM: 🔥 Engine should stay hot for performance - not cleaning up');
      console.warn('NYLA LLM: 💡 Use cleanup(true) only if absolutely necessary');
      return;
    }
    
    console.log('NYLA LLM: 🔄 Force cleanup requested - unloading model and GPU buffers');
    
    if (this.engine) {
      try {
        this.engine.unload();
        console.log('NYLA LLM: Model unloaded from GPU');
      } catch (error) {
        console.warn('NYLA LLM: Error during engine unload:', error);
      }
    }
    
    this.engine = null;
    this.isInitialized = false;
    this.isLoading = false;
    this.isEngineReady = false;
    this.isEngineWarmedUp = false;
    this.engineCreatedAt = null;
    
    console.log('NYLA LLM: 🧹 Cleanup completed - next request will require full reinitialization');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLALLMEngine;
}

// Make globally available
window.NYLALLMEngine = NYLALLMEngine;

// Keep engine alive when tab is hidden (prevent browser from cleaning up)
document.addEventListener('visibilitychange', () => {
  if (window.nylaLLMEngine && window.nylaLLMEngine.isReady()) {
    if (document.visibilityState === 'hidden') {
      console.log('NYLA LLM: 🔥 Tab hidden - keeping engine warm');
    } else {
      console.log('NYLA LLM: 👁️  Tab visible - engine still ready');
    }
  }
});

// Prevent cleanup on beforeunload unless user explicitly wants it
window.addEventListener('beforeunload', (event) => {
  if (window.nylaLLMEngine && window.nylaLLMEngine.isReady()) {
    console.log('NYLA LLM: 🔥 Page unloading - engine stays in memory for next visit');
    // Don't cleanup automatically - let the browser handle memory
    // Only cleanup if memory pressure is detected
  }
});