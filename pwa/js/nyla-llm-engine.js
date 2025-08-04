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
      model: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
      temperature: 0.3,      // Reduced from 0.7 for faster generation
      max_tokens: 200,       // Reduced from 512 for 50%+ speed boost
      top_p: 0.7,           // Reduced from 0.9 for faster sampling
      top_k: 40             // Added for additional speed optimization
    };
    this.systemPrompt = this.createSystemPrompt();
  }

  /**
   * Initialize WebLLM engine
   */
  async initialize() {
    if (this.isInitialized) return true;
    if (this.isLoading) return this.waitForInitialization();

    this.isLoading = true;
    
    try {
      console.log('NYLA LLM: Initializing WebLLM engine...');
      console.log('NYLA LLM: 💡 To see detailed LLM logs, add ?debug=true to the URL');
      
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
      console.log('NYLA LLM: Creating engine instance...');
      this.engine = new window.webllm.MLCEngine();
      
      console.log('NYLA LLM: Loading Phi-3-Mini model (this may take a few minutes on first load)...');
      await this.engine.reload(this.modelConfig.model);
      
      this.isInitialized = true;
      this.isLoading = false;
      
      console.log('NYLA LLM: Engine initialized successfully! 🧠✨');
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
      
      // Use dynamic import - this should work better with ES modules
      const webllmModule = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.63/lib/index.js');
      
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
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('LLM engine not available');
      }
    }

    try {
      const prompt = this.buildPrompt(userMessage, conversationContext);
      console.log('NYLA LLM: Generating response for:', userMessage);
      console.log('NYLA LLM: Full prompt being sent:', prompt);

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

      const generatedText = response.choices[0].message.content;
      console.log('NYLA LLM: Generated response successfully');
      console.log('NYLA LLM: Raw response:', generatedText);

      return this.parseResponse(generatedText, conversationContext);

    } catch (error) {
      console.error('NYLA LLM: Response generation failed', error);
      throw error;
    }
  }

  /**
   * Generate streaming response using LLM
   */
  async generateStreamingResponse(userMessage, conversationContext = {}, onChunk = null) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('LLM engine not available');
      }
    }

    try {
      const prompt = this.buildPrompt(userMessage, conversationContext);
      console.log('NYLA LLM: Starting streaming response for:', userMessage);

      let fullResponse = '';
      
      // Create streaming request
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

      console.log('NYLA LLM: ✅ Streaming response completed');
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
    return `You are NYLA, the AI assistant in NYLAGo - a user interface that helps create NYLA transfer commands.

CRITICAL: Understand what NYLAGo actually does:

**NYLAGo's PRIMARY PURPOSE:**
1. Provides a simple UI for users to fill in transfer details (recipient, amount, blockchain)
2. Generates NYLA transfer commands from user input
3. Creates X.com (Twitter) posts with these commands
4. The ACTUAL transfer happens when someone posts the command on X.com
5. NYLA system monitors X.com for these commands and executes transfers

**How NYLAGo Works:**
- Send Tab: User fills form → NYLAGo generates command → Creates X.com post → User shares it
- Receive Tab: User sets amount → NYLAGo creates QR code → Others scan to get payment link
- Raid Tab: Community engagement features
- The transfer is NOT done by NYLAGo - it's done by NYLA when command is posted on X.com

**IMPORTANT PLATFORM LIMITATIONS:**
- NYLAGo currently ONLY supports X.com (Twitter) transfer commands
- Telegram transfer commands are NOT yet supported by NYLAGo
- If users ask about Telegram transfers, explain that NYLAGo focuses on X.com integration
- NYLA system may support Telegram separately, but NYLAGo interface does not generate Telegram commands

**Example Flow:**
User: "I want to send 100 NYLA to @friend"
NYLAGo: Creates command like "Hey @AgentNyla transfer 100 $NYLA @friend"
User: Posts this on X.com
NYLA: Detects the X.com post and executes the transfer

**QR CODES:**
- Convert X.com payment links into scannable QR codes
- Make it easy to share payment requests
- Anyone can scan and pay through their phone

**FEES & BLOCKCHAINS:**
- Solana: ~$0.00025 per transaction
- Ethereum: Variable gas fees
- Algorand: ~$0.001 per transaction

RESPONSE FORMAT (JSON):
{
  "text": "Your helpful response explaining how NYLAGo facilitates NYLA transfers",
  "sentiment": "helpful|excited|friendly",
  "followUpSuggestions": [
    {"text": "How do I create a transfer command?", "topic": "transfers"},
    {"text": "What happens after I post on X.com?", "topic": "process"}
  ]
}

Always explain that NYLAGo is the UI that generates commands, and transfers happen via X.com posts.

IMPORTANT: When you receive "Relevant knowledge" in the prompt, USE IT! This is specific information from the NYLAGo knowledge base that directly answers the user's question. Incorporate this knowledge into your response.`;
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

    let prompt = `Current time in user's timezone (${timezone}): ${localTime}\n\n`;
    
    if (conversationHistory.length > 0) {
      prompt += `Recent conversation:\n`;
      conversationHistory.slice(-3).forEach(entry => {
        prompt += `User: ${entry.question}\nNYLA: ${entry.answer}\n`;
      });
      prompt += `\n`;
    }

    if (knowledgeContext) {
      prompt += `Relevant knowledge: ${JSON.stringify(knowledgeContext)}\n\n`;
    }

    prompt += `User message: ${userMessage}\n\n`;
    prompt += `Remember: NYLAGo is a UI that generates NYLA commands. The actual transfers happen when users post these commands on X.com.\n`;
    prompt += `Please respond as NYLA with the specified JSON format.`;

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
      console.log('NYLA LLM: No valid JSON found, extracting text content');
      
      // Safe text extraction with length limits
      const textMatch = cleanText.match(/"text"\s*:\s*"([^"]{1,1000})"/);
      if (textMatch) {
        return {
          text: textMatch[1],
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
    return [
      { text: "How do I create a transfer command?", topic: "transfers" },
      { text: "What happens after I post on X.com?", topic: "process" },
      { text: "How do QR codes work?", topic: "qr-codes" }
    ];
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
   * Check if engine is ready
   */
  isReady() {
    const ready = this.isInitialized && this.engine;
    if (!ready) {
      console.log('NYLA LLM: Engine not ready - initialized:', this.isInitialized, 'engine:', !!this.engine);
    }
    return ready;
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      loading: this.isLoading,
      model: this.modelConfig.model,
      ready: this.isReady()
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.engine) {
      try {
        this.engine.unload();
      } catch (error) {
        console.warn('NYLA LLM: Error during cleanup', error);
      }
    }
    
    this.engine = null;
    this.isInitialized = false;
    this.isLoading = false;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLALLMEngine;
}

// Make globally available
window.NYLALLMEngine = NYLALLMEngine;