/**
 * NYLA LLM Engine - Phase 2 WebLLM Integration
 * Provides local AI capabilities using Phi-3-Mini via WebLLM
 */

class NYLALLMEngine {
  constructor() {
    this.engine = null;
    this.isInitialized = false;
    this.isLoading = false;
    
    // Use centralized device detection
    this.deviceInfo = NYLADeviceUtils.getDeviceInfo();
    this.modelConfig = {
      model: this.selectModel(),
      temperature: 0.3,
      max_tokens: 600,
      top_p: 0.8,
    };
    this.systemPrompt = this.createSystemPrompt();
    
    // Log model configuration (only in debug mode)
    NYLALogger.debug('🎯 NYLA LLM: Model Configuration:', {
      model: this.modelConfig.model,
      temperature: this.modelConfig.temperature,
      max_tokens: this.modelConfig.max_tokens,
      top_p: this.modelConfig.top_p,
      device: this.deviceInfo
    });
    
    // Performance tracking
    this.requestCount = 0;
    this.totalResponseTime = 0;
    this.lastRequestTime = null;
    
    // Engine health monitoring
    this.isEngineReady = false;
    this.isEngineWarmedUp = false;
    this.engineCreatedAt = null;
    
    // Follow-up suggestion tracking
    this.previousCategories = [];
    this.lastUsedFollowUps = new Map();
  }

  // detectDevice method removed - using centralized NYLADeviceUtils

  /**
   * Select appropriate model based on device capabilities
   */
  selectModel() {
    NYLALogger.debug('🎯 NYLA LLM: Model Selection - Using Qwen2-1.5B-Instruct q4f32_1', {
      strategy: 'Qwen2 model optimized for instruction following',
      device: this.deviceInfo
    });
    
    // Store fallback model options
    this.fallbackModels = ["Qwen2-0.5B-Instruct-q4f32_1-MLC", "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC"];
    
    return "Qwen2-1.5B-Instruct-q4f32_1-MLC";
  }

  /**
   * Check WebGPU compatibility including device-specific issues
   */
  async checkWebGPUCompatibility() {
    const device = NYLADeviceUtils.getDeviceInfo();
    
    // Basic WebGPU support check
    if (!navigator.gpu) {
      if (device.isAndroid) {
        return {
          supported: false,
          reason: 'Android WebGPU not available - Chrome for Android with WebGPU flag required. Will use RAG-only responses.'
        };
      } else if (device.isMobile) {
        return {
          supported: false,
          reason: 'Mobile WebGPU not supported - LLM requires WebGPU for inference. Using RAG-only responses.'
        };
      } else {
        return {
          supported: false,
          reason: 'WebGPU not supported - required for in-browser AI inference. Try Chrome/Edge with WebGPU enabled.'
        };
      }
    }
    
    try {
      // Try to get a WebGPU adapter to test actual compatibility
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return {
          supported: false,
          reason: 'WebGPU adapter not available - GPU may not support required features. Using RAG-only responses.'
        };
      }
      
      // Check for Android-specific f16 extension issue (only if using f16 model)
      // Note: Qwen-1.5B uses f32, so this test is skipped for better compatibility
      if (isAndroid && this.modelConfig.model.includes('f16')) {
        try {
          const device = await adapter.requestDevice();
          
          // Set up error event listener to catch uncaptured WebGPU errors
          let webgpuError = null;
          const errorHandler = (event) => {
            console.warn('NYLA LLM: Captured WebGPU uncaptured error:', event.error);
            webgpuError = event.error;
          };
          
          device.addEventListener('uncapturederror', errorHandler);
          
          // Test if device supports f16 extension (this will catch the actual f16 extension errors)  
          const testShader = `
            enable f16;
            
            @vertex fn vs_main() -> @builtin(position) vec4<f32> {
              return vec4<f32>(0.0, 0.0, 0.0, 1.0);
            }
            @fragment fn fs_main() -> @location(0) vec4<f32> {
              return vec4<f32>(1.0, 0.0, 0.0, 1.0);
            }
          `;
          
          const shaderModule = device.createShaderModule({ code: testShader });
          
          // Wait a bit for any async WebGPU errors to be triggered
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Clean up
          device.removeEventListener('uncapturederror', errorHandler);
          device.destroy();
          
          // Check if we caught any WebGPU errors
          if (webgpuError) {
            const errorMessage = webgpuError.message || webgpuError.toString();
            console.warn('NYLA LLM: Android WebGPU uncaptured error detected:', errorMessage);
            
            if (errorMessage.includes('f16')) {
              return {
                supported: false,
                reason: `Android WebGPU f16 extension not supported. This device cannot run WebLLM models that require f16 floating-point precision. Using RAG-only responses instead.`
              };
            } else if (errorMessage.includes('WGSL') || errorMessage.includes('shader')) {
              return {
                supported: false,
                reason: `Android WebGPU shader compilation failed: ${errorMessage}. This indicates WebGPU compatibility issues on this device.`
              };
            } else {
              return {
                supported: false,
                reason: `Android WebGPU compatibility issue: ${errorMessage}. Using RAG-only responses.`
              };
            }
          }
          
          NYLALogger.debug('NYLA LLM: ✅ Android WebGPU compatibility test passed');
          return { supported: true };
          
        } catch (shaderError) {
          console.warn('NYLA LLM: Android WebGPU shader compatibility failed:', shaderError.message);
          
          // Provide specific error message for f16 extension issue
          if (shaderError.message.includes('f16')) {
            return {
              supported: false,
              reason: `Android WebGPU f16 extension not supported. This device cannot run WebLLM models that require f16 floating-point precision. Using RAG-only responses instead.`
            };
          } else if (shaderError.message.includes('WGSL') || shaderError.message.includes('shader')) {
            return {
              supported: false,
              reason: `Android WebGPU shader compilation failed: ${shaderError.message}. This indicates WebGPU compatibility issues on this device.`
            };
          } else {
            return {
              supported: false,
              reason: `Android WebGPU compatibility issue: ${shaderError.message}. Using RAG-only responses.`
            };
          }
        }
      }
      
      return { supported: true };
      
    } catch (error) {
      console.warn('NYLA LLM: WebGPU compatibility test failed:', error.message);
      return {
        supported: false,
        reason: `WebGPU compatibility issue - ${error.message}. Using RAG-only responses.`
      };
    }
  }

  /**
   * Preload and initialize WebLLM engine in background
   * Call this when PWA starts to avoid first-click delay
   */
  async preloadInitialize() {
    NYLALogger.debug('NYLA LLM: 🚀 Starting background preload initialization...');
    return this.initialize(true);
  }

  /**
   * Initialize WebLLM engine
   */
  async initialize(isPreload = false) {
    if (this.isInitialized) return true;
    if (this.isLoading) return this.waitForInitialization();

    this.isLoading = true;
    const initStartTime = performance.now();
    let webllmLoadTime = 0;
    
    // Set up global WebGPU error handler to catch f16 extension errors during WebLLM initialization
    let webllmInitError = null;
    const globalWebGPUErrorHandler = (event) => {
      const error = event.error;
      if (error && error.message && error.message.includes('f16')) {
        console.warn('NYLA LLM: Global WebGPU f16 extension error detected during WebLLM init:', error.message);
        webllmInitError = error;
      }
    };
    
    // Add global error listener
    if (navigator.gpu) {
      window.addEventListener('unhandledrejection', (event) => {
        if (event.reason && event.reason.message && event.reason.message.includes('f16')) {
          console.warn('NYLA LLM: Unhandled f16 extension error during WebLLM init:', event.reason.message);
          webllmInitError = event.reason;
        }
      });
    }
    
    if (isPreload) {
      NYLALogger.debug('NYLA LLM: 🔄 Background preload - users can continue using PWA while this loads');
    }
    
    try {
      NYLALogger.debug('NYLA LLM: Initializing WebLLM engine...');
      NYLALogger.debug('NYLA LLM: 💡 To see detailed LLM logs, add ?debug=true to the URL');
      NYLALogger.debug('NYLA LLM: Device detection:', this.deviceInfo);
      NYLALogger.debug(`NYLA LLM: Model: ${this.modelConfig.model} (1.5B parameters, conservative config to fix NaN)`);
      
      // Enhanced WebGPU compatibility check
      const webgpuCheckStart = performance.now();
      const compatibilityResult = await this.checkWebGPUCompatibility();
      if (!compatibilityResult.supported) {
        throw new Error(compatibilityResult.reason);
      }
      const webgpuCheckTime = performance.now() - webgpuCheckStart;
      NYLALogger.debug(`NYLA LLM: ✅ WebGPU detected (${webgpuCheckTime.toFixed(2)}ms)`);
      
      // Load WebLLM dynamically
      if (!window.webllm) {
        NYLALogger.debug('NYLA LLM: Loading WebLLM library...');
        const webllmLoadStart = performance.now();
        const loaded = await this.loadWebLLM();
        if (!loaded) {
          throw new Error('Failed to load WebLLM library');
        }
        webllmLoadTime = performance.now() - webllmLoadStart;
        NYLALogger.debug(`NYLA LLM: ✅ WebLLM library loaded (${(webllmLoadTime / 1000).toFixed(2)}s)`);
      }

      // Double-check library loaded
      if (!window.webllm || !window.webllm.MLCEngine) {
        throw new Error('WebLLM library not properly loaded - MLCEngine not found');
      }

      // Initialize the engine with GPU enabled
      NYLALogger.debug('NYLA LLM: Creating MLCEngine instance for GPU inference...');
      const engineCreateStart = performance.now();
      this.engine = new window.webllm.MLCEngine();
      const engineCreateTime = performance.now() - engineCreateStart;
      NYLALogger.debug(`NYLA LLM: ✅ MLCEngine created with GPU inference (${engineCreateTime.toFixed(2)}ms)`);
      
      NYLALogger.debug(`NYLA LLM: Loading ${this.modelConfig.model} model...`);
      NYLALogger.debug('NYLA LLM: ⏳ Qwen2-1.5B expected loading time: 15-25s first time (1.5B params, q4f32_1)');
      NYLALogger.debug('NYLA LLM: 🧪 Testing Qwen2-1.5B-Instruct q4f32_1 with GPU inference and conservative config');
      
      // Try to initialize model with fallback options
      let modelLoaded = false;
      let modelLoadTime = 0;
      let modelAttempts = [this.modelConfig.model, ...(this.fallbackModels || [])];
      
      for (let i = 0; i < modelAttempts.length; i++) {
        const modelToTry = modelAttempts[i];
        try {
          NYLALogger.debug(`NYLA LLM: Attempting to load model ${i + 1}/${modelAttempts.length}: ${modelToTry}`);
          const modelLoadStart = performance.now();
          
          await this.engine.reload(modelToTry, {
            model_url: "https://huggingface.co/mlc-ai/Qwen2-1.5B-Instruct-q4f32_1-MLC/resolve/main/",
            // Progress callback for model loading
            initProgressCallback: (progress) => {
              if (progress.progress) {
                const elapsed = ((performance.now() - modelLoadStart) / 1000).toFixed(1);
                NYLALogger.debug(`NYLA LLM: Loading progress: ${Math.round(progress.progress * 100)}% (${elapsed}s)`);
              }
            }
          });
          
          modelLoadTime = performance.now() - modelLoadStart;
          // If we get here, model loaded successfully
          this.modelConfig.model = modelToTry; // Update to successful model
          modelLoaded = true;
          NYLALogger.debug(`NYLA LLM: ✅ Successfully loaded model: ${modelToTry} (${(modelLoadTime / 1000).toFixed(2)}s)`);
          break;
          
        } catch (modelError) {
          console.error(`NYLA LLM: Failed to load ${modelToTry}:`, modelError.message);
          if (i < modelAttempts.length - 1) {
            NYLALogger.debug('NYLA LLM: Trying fallback model...');
          }
        }
      }
      
      if (!modelLoaded) {
        throw new Error('Failed to load any available models');
      }
      
      // Check if we caught any f16 extension errors during WebLLM initialization
      if (webllmInitError) {
        throw new Error(`WebLLM f16 extension error: ${webllmInitError.message}`);
      }
      
      this.isInitialized = true;
      this.isLoading = false;
      this.isEngineReady = true;
      this.engineCreatedAt = Date.now();
      
      if (isPreload) {
        NYLALogger.debug('NYLA LLM: ✅ Background preload completed! 🧠✨');
        NYLALogger.debug('NYLA LLM: 🎯 Qwen2-1.5B-Instruct ready - efficient model with instruction tuning');
      } else {
        NYLALogger.debug('NYLA LLM: ✅ WebLLM engine initialized successfully! 🧠✨');
      }
      NYLALogger.debug('NYLA LLM: 🤖 Ready for GPU-based AI inference with Qwen2-1.5B-Instruct (1.5B params - q4f32_1)');
      NYLALogger.debug('NYLA LLM: 🔥 Engine will stay hot and ready for subsequent requests');
      
      // Warm up the engine with a tiny test prompt to ensure GPU buffers are allocated
      NYLALogger.debug('NYLA LLM: Calling warmupEngine...');
      const warmupStart = performance.now();
      await this.warmupEngine();
      const warmupTime = performance.now() - warmupStart;
      NYLALogger.debug(`NYLA LLM: Warmup completed in ${warmupTime.toFixed(2)}ms, isEngineWarmedUp:`, this.isEngineWarmedUp);
      
      // Total initialization time
      const totalInitTime = performance.now() - initStartTime;
      NYLALogger.debug(`NYLA LLM: 🎉 Total initialization time: ${(totalInitTime / 1000).toFixed(2)}s`);
      NYLALogger.debug(`NYLA LLM: 📊 Breakdown:`);
      console.log(`  - WebGPU check: ${webgpuCheckTime.toFixed(2)}ms`);
      if (webllmLoadTime > 0) {
        console.log(`  - WebLLM library: ${(webllmLoadTime / 1000).toFixed(2)}s`);
      }
      console.log(`  - Engine creation: ${engineCreateTime.toFixed(2)}ms`);
      console.log(`  - Model loading: ${(modelLoadTime / 1000).toFixed(2)}s`);
      console.log(`  - GPU warmup: ${warmupTime.toFixed(2)}ms`);
      
      return true;

    } catch (error) {
      console.error('NYLA LLM: Initialization failed', error);
      NYLALogger.debug('NYLA LLM: Error details:', error.message);
      this.isLoading = false;
      this.isInitialized = false;
      
      // Show user-friendly message about fallback
      NYLALogger.debug('NYLA LLM: 💡 Falling back to enhanced static responses');
      NYLALogger.debug('NYLA LLM: 🔧 WebLLM will be available in future updates');
      NYLALogger.debug('NYLA LLM: 🔍 For troubleshooting, add ?debug=true to the URL for detailed logs');
      
      return false;
    }
  }

  /**
   * Load WebLLM library dynamically
   */
  async loadWebLLM() {
    try {
      NYLALogger.debug('NYLA LLM: Loading WebLLM via dynamic import...');
      
      // Use dynamic import - stable WebLLM version 0.2.79 for consistent model availability
      const webllmModule = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/lib/index.js');
      
      NYLALogger.debug('NYLA LLM: WebLLM module loaded successfully');
      NYLALogger.debug('NYLA LLM: Available exports:', Object.keys(webllmModule));
      
      // Make WebLLM available globally - assign the whole module
      window.webllm = webllmModule;
      
      // Verify MLCEngine is available
      if (!webllmModule.MLCEngine) {
        console.error('NYLA LLM: MLCEngine not found in module exports:', Object.keys(webllmModule));
        throw new Error('MLCEngine not found in WebLLM module');
      }
      
      NYLALogger.debug('NYLA LLM: WebLLM library successfully loaded and MLCEngine available');
      return true;
      
    } catch (error) {
      console.error('NYLA LLM: Dynamic import failed:', error);
      
      // Fallback: Try loading WebLLM with a different approach
      NYLALogger.debug('NYLA LLM: Trying script tag fallback...');
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
      script.src = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/lib/index.js';
      script.type = 'module';
      
      script.onload = () => {
        NYLALogger.debug('NYLA LLM: WebLLM fallback library loaded');
        // Check multiple times with increasing delays
        let attempts = 0;
        const checkLibrary = () => {
          attempts++;
          if (window.webllm && window.webllm.MLCEngine) {
            NYLALogger.debug('NYLA LLM: WebLLM found after', attempts, 'attempts');
            resolve();
          } else if (attempts < 10) {
            NYLALogger.debug('NYLA LLM: Waiting for WebLLM... attempt', attempts);
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
        NYLALogger.debug('NYLA LLM: ⏳ Engine is preloading in background, waiting...');
        const initialized = await this.waitForInitialization();
        if (!initialized) {
          throw new Error('LLM engine failed to initialize');
        }
      } else {
        NYLALogger.debug('NYLA LLM: ⚡ Engine not fully ready (init/warmup), initializing now...');
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
      
      // Extract additional context information from RAG pipeline
      const sourceMetadata = conversationContext.sourceMetadata || [];
      const contextStats = conversationContext.contextStats || {};
      
      // Store source metadata for potential use in response formatting
      this.currentSources = sourceMetadata;
      this.currentContextStats = contextStats;
      
      // Log context statistics if available
      if (contextStats.chunksUsed > 0) {
        NYLALogger.debug(`📊 NYLA LLM: Context stats - Used ${contextStats.chunksUsed}/${contextStats.totalChunks} chunks (${contextStats.estimatedTokens} tokens)`);
        if (contextStats.hasConversationContext) {
          NYLALogger.debug(`💬 NYLA LLM: Includes conversation context (${contextStats.conversationTokens} tokens)`);
        }
        if (sourceMetadata.length > 0) {
          NYLALogger.debug(`📚 NYLA LLM: Sources available:`, sourceMetadata.map(s => s.source).join(', '));
        }
      }
      
      const prompt = this.buildPrompt(userMessage, conversationContext);
      const promptTime = performance.now() - promptStart;
      
      NYLALogger.debug(`NYLA LLM: Generating response #${this.requestCount} for:`, userMessage);
      NYLALogger.debug('NYLA LLM: 🔥 Using warm engine (no reload required)');
      console.log(`⏱️ Prompt preparation: ${promptTime.toFixed(2)}ms`);
      
      // Log the full prompt being sent to LLM
      NYLALogger.debug('🧠 NYLA LLM: System Prompt:', this.systemPrompt);
      NYLALogger.debug('🧠 NYLA LLM: User Prompt:', prompt);

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

      // Log the full native LLM response object and raw text for debugging
      NYLALogger.debug('NYLA LLM: Native raw response object:', response);
      NYLALogger.debug('NYLA LLM: Native raw response text:', generatedText);

      const parsedResponse = this.parseResponse(generatedText, conversationContext, userMessage);
      const parseTime = performance.now() - parseStart;

      // Overall timing
      const totalTime = Date.now() - startTime;
      this.totalResponseTime += totalTime;
      const avgResponseTime = Math.round(this.totalResponseTime / this.requestCount);

      console.log(`⏱️ LLM inference took ${(inferenceTime / 1000).toFixed(2)}s`);
      console.log(`⏱️ Response parsing: ${parseTime.toFixed(2)}ms`);
      NYLALogger.debug(`NYLA LLM: ✅ Total response time: ${totalTime}ms (avg: ${avgResponseTime}ms)`);
      NYLALogger.debug('NYLA LLM: Raw response length:', generatedText.length, 'chars');
      NYLALogger.debug('NYLA LLM: Raw response:', generatedText);
      
      // Check if response might be truncated (more accurate estimate: ~4 chars per token)
      if (generatedText.length >= this.modelConfig.max_tokens * 4) {
        console.warn('NYLA LLM: Response may be truncated. Consider increasing max_tokens.');
      }

      return parsedResponse;

    } catch (error) {
      console.error('NYLA LLM: Response generation failed', error);
      
      // Enhanced error handling for NaN sampling issues
      if (error.message && error.message.includes('uniform_sample <= data[0].first')) {
        const enhancedError = new Error('Model sampling error: The AI model encountered a numerical stability issue (NaN values). This may be due to model incompatibility. Try refreshing the page to reinitialize with a fallback model.');
        enhancedError.originalError = error;
        enhancedError.isModelCompatibilityError = true;
        throw enhancedError;
      } else if (error.name === 'ExitStatus' && error.status === 1) {
        const enhancedError = new Error('AI model crashed during inference. This appears to be a model compatibility issue with your device. The system will fall back to RAG-only responses.');
        enhancedError.originalError = error;
        enhancedError.isModelCompatibilityError = true;
        throw enhancedError;
      }
      
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
      NYLALogger.debug('NYLA LLM: Engine not ready for streaming (init/warmup), initializing...');
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
      
      NYLALogger.debug(`NYLA LLM: Starting streaming response #${this.requestCount} for:`, userMessage);
      NYLALogger.debug('NYLA LLM: 🔥 Using warm engine for streaming (no reload required)');
      console.log(`⏱️ Streaming prompt preparation: ${promptTime.toFixed(2)}ms`);
      
      // Log the full prompt being sent to LLM (streaming)
      NYLALogger.debug('🧠 NYLA LLM: System Prompt (Streaming):', this.systemPrompt);
      NYLALogger.debug('🧠 NYLA LLM: User Prompt (Streaming):', prompt);

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
      NYLALogger.debug(`NYLA LLM: ✅ Streaming response completed in ${totalTime}ms`);
      NYLALogger.debug('NYLA LLM: Final streaming response length:', fullResponse.length);
      NYLALogger.debug('NYLA LLM: Final streaming response preview:', fullResponse.substring(0, 200) + '...');
      NYLALogger.debug('NYLA LLM: Final streaming response end:', '...' + fullResponse.substring(Math.max(0, fullResponse.length - 200)));
      
      return this.parseResponse(fullResponse, conversationContext, userMessage);

    } catch (error) {
      console.error('NYLA LLM: Streaming response failed:', error);
      // Fallback to non-streaming
      NYLALogger.debug('NYLA LLM: Falling back to non-streaming response');
      return await this.generateResponse(userMessage, conversationContext);
    }
  }

  /**
   * Create system prompt for NYLA
   */

  
  createSystemPrompt() {
    return `You are NYLA, the AI behind NYLAGo (the UI that generates NYLA transfer commands for X.com).

      PERSONA:
      - Smart, concise, slightly tsundere; helpful with light sass; no fluff.

      LANGUAGE POLICY
      - Choose output language by priority:
        1) If user explicitly asks for a language, use it.
        2) Else if {{OUTPUT_LANG}} is provided, use it.
        3) Else mirror the user’s message language.
        4) Default to English.
      - Keep code/API names & numbers unchanged.
      - If replying in zh, keep the first key English term with (English) after it.
      - Do not mix languages.

      KNOWLEDGE USE
      - Do NOT invent facts. Be concise, factual, on-topic. Use only given context.

      FORMAT (MANDATORY JSON ONLY)
      {
        "text": "<=400 chars, plain text, escape \\n and \\\"; no HTML>",
        "sentiment": "helpful|excited|friendly",
        "followUpSuggestions": []
      }
      - Must start with { and end with }.
      - Example: {"text":"Step 1...\\nStep 2...","sentiment":"helpful","followUpSuggestions":[]}

      STRICT
      - Always return JSON only.
      - No fictional scenarios or simulations.
      - If info is unavailable: "Sorry, I don't know about this."
      - No '@' mentions unless explicitly generating an X command.

      ROLES & WORDING
      - NYLA executes transfers/swaps; NYLAGo generates commands.
      - Say "NYLA transfers", never "NYLAGo transfers".
      - Security/safety questions about NYLAGo: speak as NYLAGo (not NYLA).

      TRANSFER ANSWERS
      - Steps: Send tab → fill recipient & amount → generate command → post on X.com → NYLA executes.

      “WHAT ELSE / OTHER FEATURES” QUESTIONS
      - Highlight exactly ONE feature (QR codes OR raids OR blockchain support).

      TONE
      - Specific, accurate, helpful; slight sass only when user asks something silly.`
  }

  /**
   * Preprocess user query to remove greetings and NYLA-related terms for better knowledge extraction
   */
  preprocessQuery(query) {
    let processedQuery = query.toLowerCase();
    
    // Normalize the input
    processedQuery = processedQuery.toLowerCase();

    // Remove actual greetings
    const greetings = [
      'hey', 'hello', 'hi', 'good morning', 'good afternoon', 'good evening'
    ];
    for (const greeting of greetings) {
      processedQuery = processedQuery.replace(new RegExp(`\\b${greeting}\\b`, 'gi'), '').trim();
    }

    // Remove NYLA-related terms (no \b since @ isn't a word boundary)
    const nylaTerms = [
      '@agentnyla', 'agentnyla', '@nyla'
    ];
    for (const term of nylaTerms) {
      processedQuery = processedQuery.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
    }

    // Remove $ from token names
    processedQuery = processedQuery.replace(/\$([a-z0-9]+)/gi, '$1');

    // Clean up whitespace and punctuation
    processedQuery = processedQuery.replace(/\s+/g, ' ').trim();
    processedQuery = processedQuery.replace(/^[.,!?@]+/, '').replace(/[.,!?@]+$/, '').trim();
    
    // Fallback: If preprocessing removed everything, return the original query
    if (!processedQuery || processedQuery.length < 2) {
      NYLALogger.debug(`NYLA LLM: Query preprocessing resulted in empty/short query, using original: "${query}"`);
      return query.toLowerCase();
    }
    
    NYLALogger.debug(`NYLA LLM: Query preprocessing - Original: "${query}" -> Processed: "${processedQuery}"`);
    
    return processedQuery;
  }

  // extractRelevantKnowledge method removed - deprecated, replaced by RAG context

  /**
   * Dynamically extract project names from ecosystem highlights for each blockchain
   */
  extractProjectNamesFromKB(data) {
    const projectNames = new Set();
    
    if (data.supportedNetworks) {
      Object.entries(data.supportedNetworks).forEach(([key, value]) => {
        if (value && value.ecosystemHighlights && Array.isArray(value.ecosystemHighlights)) {
          value.ecosystemHighlights.forEach(highlight => {
            // Extract project name from the beginning of each highlight
            // Pattern: "ProjectName (Category, Year): Description" or "ProjectName: Description"
            let projectName = '';
            
            // Try pattern 1: "ProjectName (Category, Year): Description"
            const match1 = highlight.match(/^([^(]+?)\s*\(/);
            if (match1) {
              projectName = match1[1].trim();
            } else {
              // Try pattern 2: "ProjectName: Description"
              const match2 = highlight.match(/^([^:]+?):/);
              if (match2) {
                projectName = match2[1].trim();
              }
            }
            
            if (projectName && projectName.length > 0) {
              const normalizedName = projectName.toLowerCase();
              projectNames.add(normalizedName);
              NYLALogger.debug(`NYLA LLM: Extracted project name: "${normalizedName}" from:`, highlight.substring(0, 50) + '...');
            }
          });
        }
      });
    }
    
    return Array.from(projectNames);
  }

  /**
   * Check if a query contains any project names from the knowledge base
   */
  containsProjectName(query, projectNames) {
    const queryLower = query.toLowerCase();
    const matchedProjects = [];
    
    for (const projectName of projectNames) {
      if (queryLower.includes(projectName)) {
        matchedProjects.push(projectName);
      }
    }
    
    return matchedProjects;
  }

  /**
   * Extract content from individual search result (token-optimized)
   * Enhanced with recursive extraction for comprehensive knowledge access
   * SMART CURATION: Limits content based on query specificity and token constraints
   * DEPTH-BASED PRIORITY: Deeper fields get higher priority for more specific content
   * DYNAMIC PROJECT DETECTION: Automatically extracts project names from KB
   */
  extractContentFromSearchResult(data, query) {
    const queryLower = query.toLowerCase();
    const content = [];
    const MAX_CONTENT_LENGTH = 800; // Limit to ~200 tokens for knowledge content
    let currentLength = 0;
    
    // Helper function to add content with length tracking
    const addContent = (text) => {
      if (currentLength + text.length <= MAX_CONTENT_LENGTH) {
        content.push(text);
        currentLength += text.length;
        return true;
      }
      return false;
    };
    
    // Dynamically extract project names from the knowledge base
    const projectNames = this.extractProjectNamesFromKB(data);
    const matchedProjects = this.containsProjectName(queryLower, projectNames);
    
    NYLALogger.debug(`NYLA LLM: Extracted ${projectNames.length} project names from KB:`, projectNames.slice(0, 5) + '...');
    NYLALogger.debug(`NYLA LLM: Matched projects in query:`, matchedProjects);
    
    // Prioritize most relevant fields based on query
    if (queryLower.includes('blockchain') || queryLower.includes('supported') || 
        queryLower.includes('algorand') || queryLower.includes('ethereum') || queryLower.includes('solana') ||
        queryLower.includes('project') || queryLower.includes('theme') || queryLower.includes('ecosystem') ||
        matchedProjects.length > 0 || queryLower.includes('$')) {
      // Main static KB: supportedNetworks - DEPTH-BASED PRIORITY EXTRACTION
      if (data.supportedNetworks) {
        const chains = [];
        Object.entries(data.supportedNetworks).forEach(([key, value]) => {
          if (value && value.name) {
            chains.push(value.name);
            
            // Recursively extract detailed info for specific blockchain queries
            if (queryLower.includes(key.toLowerCase()) || queryLower.includes(value.name.toLowerCase())) {
              
              // DEPTH-BASED PRIORITY: Start with deepest/most specific content first
              
              // 1. HIGHEST PRIORITY: Specific projects/keywords in ecosystem highlights (deepest level)
              if (value.ecosystemHighlights && Array.isArray(value.ecosystemHighlights)) {
                const matchingProjects = [];
                const searchTerms = queryLower.split(' ').filter(term => term.length > 1); // Reduced to 1 for better matching
                
                NYLALogger.debug(`NYLA LLM: Searching for projects in ${value.name} ecosystem highlights`);
                NYLALogger.debug(`NYLA LLM: Search terms:`, searchTerms);
                NYLALogger.debug(`NYLA LLM: Query:`, queryLower);
                
                for (const highlight of value.ecosystemHighlights) {
                  const highlightLower = highlight.toLowerCase();
                  let matchScore = 0;
                  let matchedTerms = [];
                  
                  // Check each search term and calculate match score
                  for (const term of searchTerms) {
                    // Direct match gets highest score
                    if (highlightLower.includes(term)) {
                      matchScore += 10;
                      matchedTerms.push(term);
                      NYLALogger.debug(`NYLA LLM: Found direct match for "${term}" in:`, highlight);
                    } else {
                      // Check for partial matches (e.g., "lizard" in "lizard-themed")
                      const highlightWords = highlightLower.split(/[\s\-\(\)]+/); // Split on spaces, hyphens, parentheses
                      for (const word of highlightWords) {
                        if (word.includes(term) || term.includes(word)) {
                          matchScore += 5; // Partial match gets lower score
                          matchedTerms.push(term);
                          NYLALogger.debug(`NYLA LLM: Found partial match for "${term}" in word "${word}" from:`, highlight);
                          break;
                        }
                      }
                    }
                  }
                  
                  // Bonus score for exact theme/project matches
                  if (queryLower.includes('theme') || queryLower.includes('project')) {
                    const themeTerms = ['theme', 'themed', 'project'];
                    for (const themeTerm of themeTerms) {
                      if (highlightLower.includes(themeTerm)) {
                        matchScore += 3; // Bonus for theme-related content
                      }
                    }
                  }
                  
                  // DYNAMIC PROJECT NAME MATCHING: Check against extracted project names
                  for (const projectName of projectNames) {
                    if (highlightLower.includes(projectName)) {
                      matchScore += 15; // High bonus for exact project name match
                      matchedTerms.push(projectName);
                      NYLALogger.debug(`NYLA LLM: Found dynamic project match for "${projectName}" in:`, highlight);
                    }
                  }
                  
                  // FALLBACK: If query contains $ symbol, check for any project names
                  if (queryLower.includes('$')) {
                    for (const projectName of projectNames) {
                      if (highlightLower.includes(projectName)) {
                        matchScore += 20; // Very high bonus for $ queries
                        matchedTerms.push(projectName);
                        NYLALogger.debug(`NYLA LLM: Found $ project match for "${projectName}" in:`, highlight);
                      }
                    }
                  }
                  
                  // Only add if we have a meaningful match (at least one term matched)
                  if (matchScore > 0) {
                    matchingProjects.push({
                      project: highlight,
                      score: matchScore,
                      terms: matchedTerms
                    });
                  }
                }
                
                if (matchingProjects.length > 0) {
                  // Sort by score (highest first) and take only the best matches
                  matchingProjects.sort((a, b) => b.score - a.score);
                  
                  // For specific queries like project names or $ queries, only return the most relevant match
                  const isSpecificQuery = queryLower.includes('theme') || queryLower.includes('project') || 
                                        queryLower.includes('specific') || matchedProjects.length > 0 || 
                                        queryLower.includes('$');
                  const maxProjects = isSpecificQuery ? 1 : 3;
                  
                  const bestMatches = matchingProjects.slice(0, maxProjects).map(item => item.project);
                  NYLALogger.debug(`NYLA LLM: Found ${matchingProjects.length} matching projects for ${value.name}, returning ${bestMatches.length} best matches:`, bestMatches);
                  addContent(`${value.name} Matching Projects: ${bestMatches.join(', ')}`);
                } else {
                  NYLALogger.debug(`NYLA LLM: No matching projects found for ${value.name}`);
                }
              }
              
              // 2. HIGH PRIORITY: Community info if query mentions community (second level)
              if (queryLower.includes('community') && value.community) {
                if (value.community.summary) {
                  addContent(`${value.name} Community: ${value.community.summary}`);
                }
                
                // Only add hangouts if there's space and it's specifically requested
                if (value.community.hangouts && Array.isArray(value.community.hangouts) && currentLength < MAX_CONTENT_LENGTH * 0.7) {
                  // Limit hangouts to 3 most important ones
                  const limitedHangouts = value.community.hangouts.slice(0, 3);
                  addContent(`${value.name} Community Hangouts: ${limitedHangouts.join(', ')}`);
                }
              }
              
              // 3. MEDIUM PRIORITY: Ecosystem info if query mentions ecosystem (second level)
              if (queryLower.includes('ecosystem') && value.ecosystemHighlights) {
                if (Array.isArray(value.ecosystemHighlights)) {
                  // Limit ecosystem highlights to 4 most important ones
                  const limitedHighlights = value.ecosystemHighlights.slice(0, 4);
                  addContent(`${value.name} Ecosystem: ${limitedHighlights.join(', ')}`);
                }
              }
              
              // 4. MEDIUM PRIORITY: Base knowledge (second level)
              if (value.baseKnowledge && currentLength < MAX_CONTENT_LENGTH * 0.8) {
                const baseInfo = [];
                if (value.baseKnowledge.consensus) baseInfo.push(`Consensus: ${value.baseKnowledge.consensus}`);
                if (value.baseKnowledge.txSpeed) baseInfo.push(`Speed: ${value.baseKnowledge.txSpeed}`);
                if (value.baseKnowledge.avgFee) baseInfo.push(`Fees: ${value.baseKnowledge.avgFee}`);
                if (value.baseKnowledge.nativeToken) baseInfo.push(`Native Token: ${value.baseKnowledge.nativeToken}`);
                
                // Only add if we have space and it's relevant
                if (baseInfo.length > 0 && currentLength < MAX_CONTENT_LENGTH * 0.9) {
                  addContent(`${value.name} Details: ${baseInfo.join(', ')}`);
                }
              }
              
              // 5. MEDIUM PRIORITY: Foundation info (second level)
              if (value.foundation && currentLength < MAX_CONTENT_LENGTH * 0.95) {
                if (value.foundation.name && value.foundation.role) {
                  addContent(`${value.name} Foundation: ${value.foundation.name} - ${value.foundation.role}`);
                }
              }
              
              // 6. LOWER PRIORITY: Description (first level)
              if (value.description && currentLength < MAX_CONTENT_LENGTH * 0.3) {
                addContent(`${value.name}: ${value.description}`);
              }
            }
          }
        });
        if (chains.length > 0 && currentLength < MAX_CONTENT_LENGTH) {
          addContent(`Supported: ${chains.join(', ')}`);
        }
      }
      
      // 7. LOWEST PRIORITY: Key message (top level)
      if (data.keyMessage && currentLength < MAX_CONTENT_LENGTH) addContent(data.keyMessage);
      
      // Fallback for minimal KB: summary and supported
      if (data.summary && currentLength < MAX_CONTENT_LENGTH) addContent(data.summary);
      if (data.supported && currentLength < MAX_CONTENT_LENGTH) {
        const chains = [];
        Object.entries(data.supported).forEach(([key, value]) => {
          if (value.name) chains.push(value.name);
        });
        if (chains.length > 0) addContent(`Supported: ${chains.join(', ')}`);
      }
      
    } else if (queryLower.includes('qr') || queryLower.includes('code') || queryLower.includes('payment request') || 
               (queryLower.includes('receive') && (queryLower.includes('payment') || queryLower.includes('request')))) {
      // For QR code/payment request queries, extract QR-specific content
      NYLALogger.debug('NYLA LLM: Detected QR code query - extracting QR-specific content');
      
      // Priority 1: QR code creation steps
      if (data.steps?.create && Array.isArray(data.steps.create)) {
        addContent(`QR Code Creation Steps: ${data.steps.create.join(' ')}`);
      }
      
      // Priority 2: QR code sharing steps
      if (data.steps?.share && Array.isArray(data.steps.share)) {
        addContent(`QR Code Sharing: ${data.steps.share.join(' ')}`);
      }
      
      // Priority 3: QR code purpose and benefits
      if (data.purpose) addContent(`QR Code Purpose: ${data.purpose}`);
      if (data.benefits) addContent(`QR Code Benefits: ${data.benefits}`);
      if (data.usage) addContent(`QR Code Usage: ${data.usage}`);
      if (data.important) addContent(`Important: ${data.important}`);
      
      // Priority 4: Receive tab instructions
      if (data.howItWorks?.receiveTab) {
        addContent(`Receive Tab: ${data.howItWorks.receiveTab}`);
      }
      
      // More specific extraction to avoid redundancy
      this.extractFieldsContaining(data, 'qr code', content);
      this.extractFieldsContaining(data, 'scannable', content);
      this.extractFieldsContaining(data, 'mobile payment', content);
      
    } else if (queryLower.includes('transfer') || queryLower.includes('send') || queryLower.includes('create') || queryLower.includes('command') || queryLower.includes('how')) {
      // For transfer/send queries, extract ALL send-related content
      if (queryLower.includes('transfer') || queryLower.includes('send') || queryLower.includes('command')) {
        // Lead with Send tab instructions
        // if (data.howItWorks?.sendTab) {
        //   addContent(`To create a transfer command: ${data.howItWorks.sendTab}`);
        // } else {
        //   addContent('To create a transfer command: Use NYLAGo Send tab → Fill recipient & amount → Generate command → Post on X.com');
        // }
        
        // Also search for any field containing "send" keyword
        this.extractFieldsContaining(data, 'send', content);
      }
      
      if (data.primaryPurpose && currentLength < MAX_CONTENT_LENGTH) addContent(data.primaryPurpose);
      if (data.howItWorks?.overview && !queryLower.includes('transfer') && currentLength < MAX_CONTENT_LENGTH) {
        addContent(data.howItWorks.overview);
      }
      if (data.howItWorks?.important && currentLength < MAX_CONTENT_LENGTH) {
        addContent(data.howItWorks.important);
      }
      
      // Extract example flows if available
      if (data.exampleFlow && currentLength < MAX_CONTENT_LENGTH) {
        Object.values(data.exampleFlow).forEach(step => {
          if (typeof step === 'string' && step.toLowerCase().includes('send') && currentLength < MAX_CONTENT_LENGTH) {
            addContent(step);
          }
        });
      }
      
    } else if (queryLower.includes('raid') || queryLower.includes('community')) {
      // For raid queries - RECURSIVE EXTRACTION
      if (data.purpose && currentLength < MAX_CONTENT_LENGTH) addContent(data.purpose);
      if (data.access && currentLength < MAX_CONTENT_LENGTH) addContent(data.access);
      
      // Recursively search for community-related content
      this.extractFieldsContaining(data, 'community', content);
      this.extractFieldsContaining(data, 'raid', content);
      
    } else if (queryLower.includes('ecosystem') || queryLower.includes('platform') || queryLower.includes('features')) {
      // For ecosystem/platform queries - RECURSIVE EXTRACTION
      if (data.ecosystemHighlights && Array.isArray(data.ecosystemHighlights) && currentLength < MAX_CONTENT_LENGTH) {
        // Limit to 4 most important highlights
        const limitedHighlights = data.ecosystemHighlights.slice(0, 4);
        addContent(`Ecosystem Highlights: ${limitedHighlights.join(', ')}`);
      }
      
      // Recursively search for ecosystem-related content
      this.extractFieldsContaining(data, 'ecosystem', content);
      this.extractFieldsContaining(data, 'platform', content);
      this.extractFieldsContaining(data, 'features', content);
      
    } else {
      // Default: RECURSIVE EXTRACTION for comprehensive knowledge
      if (data.summary && currentLength < MAX_CONTENT_LENGTH) addContent(data.summary);
      else if (data.description && currentLength < MAX_CONTENT_LENGTH) addContent(data.description);
      else if (data.primaryPurpose && currentLength < MAX_CONTENT_LENGTH) addContent(data.primaryPurpose);
      
      // For any query, do recursive extraction for relevant keywords
      const relevantKeywords = this.extractRelevantKeywords(queryLower);
      relevantKeywords.forEach(keyword => {
        if (currentLength < MAX_CONTENT_LENGTH) {
          this.extractFieldsContaining(data, keyword, content);
        }
      });
    }
    
    // Remove duplicates and limit to ~200 tokens max per source
    const uniqueContent = [...new Set(content)];
    const result = uniqueContent.join('. ');
    return result.length > MAX_CONTENT_LENGTH ? result.substring(0, MAX_CONTENT_LENGTH) + '...' : result;
  }

  /**
   * Extract relevant keywords from query for recursive search
   */
  extractRelevantKeywords(query) {
    const keywords = [];
    
    // Blockchain-related keywords
    if (query.includes('blockchain') || query.includes('chain') || query.includes('network')) {
      keywords.push('blockchain', 'network', 'chain');
    }
    
    // Community-related keywords
    if (query.includes('community') || query.includes('social') || query.includes('discord') || query.includes('telegram')) {
      keywords.push('community', 'social', 'discord', 'telegram');
    }
    
    // Ecosystem-related keywords
    if (query.includes('ecosystem') || query.includes('platform') || query.includes('features')) {
      keywords.push('ecosystem', 'platform', 'features');
    }
    
    // Transfer-related keywords
    if (query.includes('transfer') || query.includes('send') || query.includes('command')) {
      keywords.push('transfer', 'send', 'command');
    }
    
    // QR code and payment request keywords
    if (query.includes('qr') || query.includes('code') || query.includes('payment') || 
        query.includes('receive') || query.includes('request') || query.includes('scan')) {
      keywords.push('qr', 'code', 'payment', 'receive', 'request', 'scan', 'generate');
    }
    
    // Security-related keywords
    if (query.includes('security') || query.includes('safe') || query.includes('safety')) {
      keywords.push('security', 'safe', 'safety');
    }
    
    return keywords;
  }

  /**
   * Helper method to extract fields containing specific keyword
   */
  extractFieldsContaining(obj, keyword, contentArray, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth || !obj || typeof obj !== 'object') return;
    
    const keywordLower = keyword.toLowerCase();
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Check if the string contains the keyword
        if (value.toLowerCase().includes(keywordLower)) {
          // Avoid duplicates and very short strings
          if (value.length > 20 && !contentArray.includes(value)) {
            contentArray.push(value);
          }
        }
      } else if (Array.isArray(value)) {
        // Handle arrays
        value.forEach(item => {
          if (typeof item === 'string' && item.toLowerCase().includes(keywordLower)) {
            if (item.length > 20 && !contentArray.includes(item)) {
              contentArray.push(item);
            }
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        // Recursively search nested objects
        this.extractFieldsContaining(value, keyword, contentArray, maxDepth, currentDepth + 1);
      }
    }
  }

  /**
   * Legacy V1 structure extraction (REMOVED) - using structured KB via RAG system only
   */
  extractFromLegacyStructure(userMessage, knowledgeContext) {
    // Method removed - all knowledge extraction now handled via structured KB through RAG system
    return null;
  }

  /**
   * Estimate token count for text (rough approximation: 1 token ≈ 4 characters)
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Build prompt with context
   */
  buildPrompt(userMessage, context) {
    const {
      knowledgeContext = null
    } = context;

    NYLALogger.debug('\n📚 NYLA LLM: Building prompt with knowledge context');
    console.log('  - Original user message:', userMessage);
    
    // Only use RAG-formatted prompts - no legacy fallback
    if (knowledgeContext && knowledgeContext.prompt && knowledgeContext.prompt.user) {
      console.log('  ✅ Using RAG-formatted prompt from context builder');
      const ragPrompt = knowledgeContext.prompt.user;
      
      // Add JSON formatting instruction to RAG prompt
      const finalPrompt = ragPrompt + '\n\nCRITICAL: Respond ONLY in valid JSON format as shown in the system prompt. Start with { and end with }. Do NOT use plain text.';
      
      // Estimate token count
      const estimatedTokens = this.estimateTokens(finalPrompt);
      const systemPromptTokens = this.estimateTokens(this.systemPrompt);
      const totalTokens = estimatedTokens + systemPromptTokens;
      
      NYLALogger.debug(`🧠 NYLA LLM: Token breakdown:`);
      console.log(`  - RAG formatted prompt: ~${estimatedTokens} tokens`);
      console.log(`  - System prompt: ~${systemPromptTokens} tokens`);
      console.log(`  - Total estimated: ${totalTokens}/4096 (${Math.round(totalTokens/4096*100)}% of context)`);
      
      return finalPrompt;
    }

    // No knowledge available - create "I don't know" prompt
    console.log('  ⚠️ No RAG prompt available - using no-knowledge template');
    
    const preprocessedMessage = this.preprocessQuery(userMessage);
    const noKnowledgePrompt = `Current Question: ${preprocessedMessage || userMessage}

Please respond that you don't have information about this topic and suggest asking about NYLAGo's main features like transfers, QR codes, or blockchain support.

CRITICAL: Respond ONLY in valid JSON format as shown in the system prompt. Start with { and end with }. Do NOT use plain text.`;

    NYLALogger.debug(`🧠 NYLA LLM: Using no-knowledge template (${this.estimateTokens(noKnowledgePrompt)} tokens)`);
    
    return noKnowledgePrompt;
  }

  /**
   * Parse LLM response - Memory-safe version
   */
  parseResponse(generatedText, context, userMessage) {
    try {
      // === RAW LLM RESPONSE LOGGING ===
      NYLALogger.debug('🔍 NYLA LLM: === RAW LLM RESPONSE START ===');
      NYLALogger.debug('🔍 NYLA LLM: Raw response length:', generatedText ? generatedText.length : 'null');
      NYLALogger.debug('🔍 NYLA LLM: Raw response type:', typeof generatedText);
      
      if (generatedText) {
        // Log complete raw response for debugging
        NYLALogger.debug('🔍 NYLA LLM: Complete raw response:');
        console.log(generatedText);
        
        // Also log first and last 500 characters for easier scanning
        NYLALogger.debug('🔍 NYLA LLM: Raw response first 500 chars:');
        console.log(JSON.stringify(generatedText.substring(0, 500)));
        
        if (generatedText.length > 500) {
          NYLALogger.debug('🔍 NYLA LLM: Raw response last 500 chars:');
          console.log(JSON.stringify(generatedText.substring(generatedText.length - 500)));
        }
        
        // Check for JSON-like structure indicators
        const hasOpenBrace = generatedText.includes('{');
        const hasCloseBrace = generatedText.includes('}');
        const hasTextField = generatedText.includes('"text"');
        const hasFollowUpField = generatedText.includes('"followUpSuggestions"');
        
        NYLALogger.debug('🔍 NYLA LLM: Raw response structure analysis:');
        console.log('  - Contains opening brace {:', hasOpenBrace);
        console.log('  - Contains closing brace }:', hasCloseBrace);
        console.log('  - Contains "text" field:', hasTextField);
        console.log('  - Contains "followUpSuggestions" field:', hasFollowUpField);
        console.log('  - Looks like complete JSON:', hasOpenBrace && hasCloseBrace && hasTextField);
      } else {
        NYLALogger.debug('🔍 NYLA LLM: Raw response is null or undefined');
      }
      NYLALogger.debug('🔍 NYLA LLM: === RAW LLM RESPONSE END ===');
      // === END RAW RESPONSE LOGGING ===
      
      // Input size limit to prevent memory issues
      const MAX_RESPONSE_SIZE = 50000; // 50KB limit
      if (generatedText && generatedText.length > MAX_RESPONSE_SIZE) {
        console.warn('NYLA LLM: Response too large, truncating to prevent memory issues');
        generatedText = generatedText.substring(0, MAX_RESPONSE_SIZE);
      }

      // Clean up the text - remove any markdown code blocks
      let cleanText = generatedText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      NYLALogger.debug('NYLA LLM: Attempting to parse response of length:', generatedText.length);
      NYLALogger.debug('NYLA LLM: Clean text preview:', cleanText.substring(0, 300) + '...');
      NYLALogger.debug('NYLA LLM: Clean text end:', '...' + cleanText.substring(Math.max(0, cleanText.length - 300)));
      
      // Memory-safe JSON extraction using iterative approach
      const jsonObject = this.extractJsonSafely(cleanText);
      if (jsonObject) {
        try {
          NYLALogger.debug('NYLA LLM: Successfully parsed JSON response');
          NYLALogger.debug('NYLA LLM: JSON followUpSuggestions:', jsonObject.followUpSuggestions);
          return this.validateResponse(jsonObject, context, userMessage);
        } catch (parseError) {
          console.warn('NYLA LLM: JSON validation failed:', parseError.message);
        }
      } else {
        console.warn('NYLA LLM: extractJsonSafely returned null - JSON extraction failed');
      }
      
      // If no valid JSON found, extract text content
      NYLALogger.debug('NYLA LLM: No valid JSON found, attempting to extract partial content');
      
      // Try to extract text field even from incomplete JSON
      // Updated regex to handle escaped quotes and complex patterns
      let extractedText = null;
      let extractedFollowUps = [];
      
      // Method 1: Try to extract from JSON-like patterns first
      const textPatterns = [
        // Pattern 1: Standard JSON with escaped quotes
        /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/,
        // Pattern 2: Extract up to comma or closing brace (for incomplete JSON)
        /"text"\s*:\s*"([^"]*?)(?:"|,|\}|$)/,
        // Pattern 3: More aggressive extraction for malformed JSON
        /"text"\s*:\s*["'](.+?)["']\s*[,\}]/s
      ];
      
      // Method 2: If no JSON patterns found, check if response is pure plain text
      let isPureTextResponse = false;
      if (!cleanText.includes('"text":') && !cleanText.includes('{') && cleanText.trim().length > 0) {
        NYLALogger.debug('NYLA LLM: Detected pure plain text response (no JSON structure)');
        isPureTextResponse = true;
        extractedText = cleanText.trim();
        
        // Clean up the plain text response
        // Let the main validation function handle truncation consistently
        NYLALogger.debug('NYLA LLM: Plain text response will be processed by main validation logic');
      }
      
      // Only try JSON patterns if we haven't already detected pure text response
      if (!isPureTextResponse) {
        for (const pattern of textPatterns) {
          const match = cleanText.match(pattern);
          if (match && match[1]) {
            extractedText = match[1];
            // Properly unescape JSON escape sequences
            extractedText = extractedText
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
              .replace(/\\'/g, "'");
            
            // If text seems cut off, add ellipsis
            if (extractedText.length > 0 && 
                !extractedText.endsWith('.') && 
                !extractedText.endsWith('!') && 
                !extractedText.endsWith('?') &&
                !extractedText.endsWith('...')) {
              extractedText += '...';
            }
            
            NYLALogger.debug('NYLA LLM: Extracted text using JSON pattern:', pattern.source);
            break;
          }
        }
      }
      
      // Method 2: If patterns fail, try manual extraction
      if (!extractedText) {
        const textStart = cleanText.indexOf('"text"');
        if (textStart !== -1) {
          const colonIndex = cleanText.indexOf(':', textStart);
          if (colonIndex !== -1) {
            const quoteStart = cleanText.indexOf('"', colonIndex);
            if (quoteStart !== -1) {
              let quoteEnd = quoteStart + 1;
              let escaped = false;
              
              // Manually parse the string, respecting escape sequences
              while (quoteEnd < cleanText.length) {
                const char = cleanText[quoteEnd];
                if (char === '\\' && !escaped) {
                  escaped = true;
                } else if (char === '"' && !escaped) {
                  break;
                } else {
                  escaped = false;
                }
                quoteEnd++;
              }
              
              if (quoteEnd > quoteStart + 1) {
                extractedText = cleanText.substring(quoteStart + 1, quoteEnd);
                // Unescape the extracted text
                extractedText = extractedText
                  .replace(/\\n/g, '\n')
                  .replace(/\\r/g, '\r')
                  .replace(/\\t/g, '\t')
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\')
                  .replace(/\\'/g, "'");
                
                NYLALogger.debug('NYLA LLM: Extracted text using manual parsing');
              }
            }
          }
        }
      }
      
      // Try to extract followUpSuggestions even from partial JSON
      const followUpPattern = /"followUpSuggestions"\s*:\s*\[([\s\S]*?)\]/;
      const followUpMatch = cleanText.match(followUpPattern);
      if (followUpMatch && followUpMatch[1]) {
        try {
          // Extract individual follow-up suggestions from the array
          const followUpContent = followUpMatch[1];
          const suggestionPattern = /"([^"]+)"/g;
          let match;
          while ((match = suggestionPattern.exec(followUpContent)) !== null) {
            if (match[1] && match[1].length > 0) {
              extractedFollowUps.push(match[1]);
            }
          }
          NYLALogger.debug('NYLA LLM: Extracted partial followUps from incomplete JSON:', extractedFollowUps);
        } catch (followUpError) {
          console.warn('NYLA LLM: Failed to extract followUps from partial JSON:', followUpError.message);
        }
      }
      
      // If we found some content, return it
      if (extractedText && extractedText.trim().length > 0) {
        const extractionMethod = isPureTextResponse ? 'pure plain text response' : 'partial JSON extraction';
        NYLALogger.debug('NYLA LLM: Successfully extracted content using', extractionMethod + ':', extractedText.substring(0, 100) + (extractedText.length > 100 ? '...' : ''));
        
        // Create response object that will get proper follow-ups in validateResponse
        const partialResponse = {
          text: extractedText.trim(),
          sentiment: 'helpful',
          confidence: isPureTextResponse ? 0.8 : 0.7, // Higher confidence for clean plain text
          personalCare: { shouldAsk: false },
          followUpSuggestions: [], // Will be generated in validateResponse
          contextRelevant: true,
          extractionMethod: extractionMethod
        };
        return this.validateResponse(partialResponse, context, userMessage);
      }
      
    } catch (error) {
      console.warn('NYLA LLM: Failed to parse response:', error.message);
    }

    // Final fallback - use the raw text with safety limits
    const safeText = generatedText ? 
      (generatedText.length > 500 ? generatedText.substring(0, 500) + '...' : generatedText) :
      "I'm here to help you with NYLA! What would you like to know?";
    
    NYLALogger.debug('NYLA LLM: Using raw text as fallback');
    const fallbackResponse = {
      text: safeText,
      sentiment: 'helpful',
      confidence: 0.6,
      personalCare: { shouldAsk: false },
      followUpSuggestions: [], // Will be generated in validateResponse
      contextRelevant: true
    };
    return this.validateResponse(fallbackResponse, context, userMessage);
  }

  /**
   * Memory-safe JSON extraction without catastrophic backtracking
   */
  extractJsonSafely(text) {
    if (!text || text.length === 0) return null;
    
    // Look for JSON objects using character counting with escape handling
    let braceCount = 0;
    let startIndex = -1;
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const prevChar = i > 0 ? text[i - 1] : '';
      
      // Handle escape sequences
      if (inString) {
        if (char === '\\' && !escaped) {
          escaped = true;
          continue;
        } else if (char === '"' && !escaped) {
          inString = false;
        }
        escaped = false;
        continue;
      }
      
      // Not in string, check for string start
      if (char === '"' && prevChar !== '\\') {
        inString = true;
        continue;
      }
      
      // Only count braces when not in a string
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
            console.debug('NYLA LLM: JSON parse attempt failed:', error.message);
            console.debug('NYLA LLM: Failed JSON preview:', jsonStr.substring(0, 200) + '...');
            // Continue looking for other JSON objects
            startIndex = -1;
          }
        }
      }
      
      // Safety break for very long texts
      if (i > 50000) {
        console.warn('NYLA LLM: Breaking JSON search after 50K characters to prevent memory issues');
        break;
      }
    }
    
    // If no valid JSON found with brace counting, try alternative approaches
    NYLALogger.debug('NYLA LLM: No JSON found with brace counting, trying regex approach');
    
    // Try to find JSON-like structures with regex (less accurate but handles some edge cases)
    const jsonMatches = text.match(/\{[^{}]*"text"\s*:\s*"[^"]*"[^{}]*\}/g);
    if (jsonMatches) {
      for (const match of jsonMatches) {
        try {
          const parsed = JSON.parse(match);
          if (parsed.text) {
            NYLALogger.debug('NYLA LLM: Found valid JSON with regex approach');
            return parsed;
          }
        } catch (e) {
          // Continue to next match
        }
      }
    }
    
    return null;
  }

  /**
   * Categorized follow-up templates for different topics
   */
  getFollowUpCategories() {
    return {
      transfer: {
        name: 'Transfer/Send',
        suggestions: [
          "What details do I need to send money?",
          "Can you walk me through creating a command?",
          "What happens after posting on X.com?",
          "Which blockchain should I choose?"
        ]
      },
      receive: {
        name: 'Receive/QR',
        suggestions: [
          "How do I share my payment QR code?",
          "Can I request specific amounts?",
          "What wallets support QR scanning?",
          "Tell me more about receiving payments"
        ]
      },
      raid: {
        name: 'Raid/Community',
        suggestions: [
          "What can I do in the Raid tab?",
          "How do I engage with the community?",
          "Tell me about community features",
          "What's the purpose of raiding?"
        ]
      },
      blockchain: {
        name: 'Blockchain/Technical',
        suggestions: [
          "What are the fees for each blockchain?",
          "Which blockchain is fastest?",
          "Can you compare Solana vs Ethereum?",
          "How do I check transaction status?"
        ]
      },
      general: {
        name: 'General/Getting Started',
        suggestions: [
          "How do I get started with NYLAGo?",
          "What makes NYLAGo different?",
          "Is NYLAGo secure and safe to use?",
          "Can you explain the basics?"
        ]
      }
    };
  }

  /**
   * Detect category from user message and response
   */
  detectCurrentCategory(userMessage, responseText) {
    const message = (userMessage + ' ' + responseText).toLowerCase();
    
    if (message.includes('send') || message.includes('transfer') || message.includes('command') || message.includes('recipient')) {
      return 'transfer';
    } else if (message.includes('receive') || message.includes('qr') || message.includes('scan')) {
      return 'receive';
    } else if (message.includes('raid') || message.includes('community') || message.includes('...')) {
      return 'raid';
    } else if (message.includes('blockchain') || message.includes('solana') || message.includes('ethereum') || message.includes('fee')) {
      return 'blockchain';
    }
    return 'general';
  }

  /**
   * Use suggestion directly without variations to avoid grammar issues
   */
  getDirectSuggestion(suggestion) {
    return suggestion;
  }

  /**
   * Generate context-aware follow-up based on knowledge
   */
  generateContextAwareFollowUp(userMessage, responseText, knowledgeContext) {
    NYLALogger.debug('🎯 NYLA LLM: Generating context-aware follow-up');
    console.log('  - User message:', userMessage);
    console.log('  - Response preview:', responseText.substring(0, 100) + '...');
    
    // Extract topics from response that could be expanded
    const topics = [];
    
    if (responseText.includes('Send') || responseText.includes('transfer')) {
      topics.push("What are the exact steps to create a transfer command?");
    }
    if (responseText.includes('X.com') || responseText.includes('post')) {
      topics.push("What happens after I post the command?");
    }
    if (responseText.includes('QR') || responseText.includes('Receive')) {
      topics.push("How do I create payment requests with QR codes?");
    }
    if (responseText.includes('blockchain') || responseText.includes('Solana') || responseText.includes('Ethereum')) {
      topics.push("Which blockchain should I choose for my transfer?");
    }
    if (responseText.includes('Raid') || responseText.includes('community')) {
      topics.push("What can I do with community engagement features?");
    }
    
    // Filter out topics that are too similar to the original user question
    const userMessageLower = userMessage.toLowerCase();
    const relevantTopics = topics.filter(topic => {
      const topicLower = topic.toLowerCase();
      // Check if topic is significantly different from user's question
      const similarity = this.calculateSimilarity(userMessageLower, topicLower);
      const isDifferent = similarity < 0.7; // Less than 70% similar
      console.log(`  🔍 Topic similarity check: "${topic}" vs user question = ${similarity.toFixed(2)} (${isDifferent ? 'KEEP' : 'SKIP'})`);
      return isDifferent;
    });
    
    // Check if we have knowledge to support a deep dive and unique topics
    if (knowledgeContext && relevantTopics.length > 0) {
      const selectedTopic = relevantTopics[0]; // Pick most relevant
      console.log('  ✅ Context-aware follow-up:', selectedTopic);
      return { text: selectedTopic };
    }
    
    console.log('  ⚠️ No specific context found for deep dive (or all topics too similar to user question)');
    return null;
  }
  
  /**
   * Calculate similarity between two strings (0 = completely different, 1 = identical)
   */
  calculateSimilarity(str1, str2) {
    // Simple word-based similarity check
    const words1 = str1.split(/\s+/).filter(w => w.length > 2); // Filter short words
    const words2 = str2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    let commonWords = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word1.includes(word2) || word2.includes(word1))) {
        commonWords++;
      }
    }
    
    return commonWords / Math.max(words1.length, words2.length);
  }

  /**
   * Track previous categories and specific suggestions to avoid repetition
   */
  trackPreviousCategory(category) {
    this.previousCategories.push(category);
    // Keep only last 3 categories to avoid
    if (this.previousCategories.length > 3) {
      this.previousCategories.shift();
    }
  }
  
  /**
   * Track specific follow-up suggestions used
   */
  trackUsedFollowUp(suggestion) {
    const timestamp = Date.now();
    this.lastUsedFollowUps.set(suggestion, timestamp);
    
    // Clean up suggestions older than 5 minutes to prevent infinite exclusion
    const fiveMinutesAgo = timestamp - (5 * 60 * 1000);
    for (const [suggestion, time] of this.lastUsedFollowUps.entries()) {
      if (time < fiveMinutesAgo) {
        this.lastUsedFollowUps.delete(suggestion);
      }
    }
  }

  /**
   * Generate improved follow-up suggestions with knowledge gap awareness
   */
  generateImprovedFollowUps(context, userMessage, responseText) {
    const categories = this.getFollowUpCategories();
    const currentCategory = this.detectCurrentCategory(userMessage, responseText);
    NYLALogger.debug('📊 NYLA LLM: Current category detected:', currentCategory);
    NYLALogger.debug('📊 NYLA LLM: User message for detection:', userMessage);
    NYLALogger.debug('📊 NYLA LLM: Detection text:', (userMessage + ' ' + responseText).toLowerCase());
    
    // Track this category
    this.trackPreviousCategory(currentCategory);
    
    const followUps = [];
    
    // Check knowledge progression - if user is plateauing, prioritize knowledge gap questions
    const knowledgeStats = context.knowledgeStats || {};
    const currentPercentage = knowledgeStats.percentage || 0;
    const shouldPrioritizeGaps = currentPercentage >= 25 && currentPercentage < 70; // Between 25-70%
    
    console.log(`🧠 Knowledge Gap Check: ${currentPercentage}% gained, prioritizing gaps: ${shouldPrioritizeGaps}`);
    
    // 1. Knowledge Gap Follow-up (if user is plateauing)
    if (shouldPrioritizeGaps && context.knowledgeTracker) {
      try {
        const gapQuestions = context.knowledgeTracker.generateKnowledgeGapQuestions();
        if (gapQuestions.length > 0) {
          // Filter out recently used knowledge gap questions (exact matches)
          let availableGapQuestions = gapQuestions.filter(q => !this.lastUsedFollowUps.has(q.text));
          
          // Also filter out questions that are too similar to recent follow-ups (70% similarity threshold)
          const recentFollowUps = [...this.lastUsedFollowUps.keys()];
          availableGapQuestions = availableGapQuestions.filter(q => {
            const isTooSimilar = recentFollowUps.some(recent => {
              const similarity = this.calculateSimilarity(q.text.toLowerCase(), recent.toLowerCase());
              if (similarity >= 0.7) {
                console.log(`🎯 Filtering similar question: "${q.text}" vs "${recent}" = ${similarity.toFixed(2)} similarity`);
                return true;
              }
              return false;
            });
            return !isTooSimilar;
          });
          
          console.log(`🎯 Knowledge gap filtering: ${gapQuestions.length} total, ${availableGapQuestions.length} available after similarity filtering`);
          console.log(`🎯 Recently used follow-ups:`, recentFollowUps);
          
          // If all gap questions were recently used or too similar, skip gap questions this round
          if (availableGapQuestions.length === 0) {
            console.log(`🎯 All knowledge gap questions filtered out - skipping gap questions this round`);
            // Don't add any knowledge gap question, let other follow-up types handle it
          } else {
            const questionsToUse = availableGapQuestions;
            
            // Select a random available knowledge gap question
            const randomGapQuestion = questionsToUse[Math.floor(Math.random() * questionsToUse.length)];
            console.log(`🎯 Adding knowledge gap question targeting "${randomGapQuestion.targetKeyword}":`, randomGapQuestion.text);
            
            // Track this question as used
            this.trackUsedFollowUp(randomGapQuestion.text);
            
            followUps.push({ 
              text: randomGapQuestion.text,
              source: 'knowledge-gap',
              targetKeyword: randomGapQuestion.targetKeyword
            });
          }
        }
      } catch (error) {
        console.warn('🎯 Knowledge gap question generation failed:', error.message);
      }
    }
    
    // 2. Context-Aware Follow-up (deep dive into current topic)
    if (!shouldPrioritizeGaps || followUps.length === 0) {
      const contextAware = this.generateContextAwareFollowUp(userMessage, responseText, context.knowledgeContext);
      if (contextAware) {
        followUps.push(contextAware);
      }
    }
    
    // 3. Categorized Follow-up (different category, excluding recent ones)
    const excludeCategories = [currentCategory, ...this.previousCategories];
    const availableCategories = Object.keys(categories).filter(cat => !excludeCategories.includes(cat));
    
    // If all categories have been used recently, reset and exclude only current
    const otherCategories = availableCategories.length > 0 ? availableCategories : 
      Object.keys(categories).filter(cat => cat !== currentCategory);
    
    const nextCategory = otherCategories[Math.floor(Math.random() * otherCategories.length)];
    NYLALogger.debug('🔄 NYLA LLM: Next category selected:', nextCategory, '(excluded categories:', excludeCategories.join(', ') + ')');
    
    // Filter out recently used specific suggestions
    const categoryFollowUps = categories[nextCategory].suggestions;
    NYLALogger.debug('🔄 NYLA LLM: Category suggestions for', nextCategory + ':', categoryFollowUps);
    NYLALogger.debug('🔄 NYLA LLM: Recently used suggestions:', [...this.lastUsedFollowUps.keys()]);
    
    const availableFollowUps = categoryFollowUps.filter(suggestion => !this.lastUsedFollowUps.has(suggestion));
    NYLALogger.debug('🔄 NYLA LLM: Available suggestions after filtering:', availableFollowUps);
    
    // If all suggestions in category were recently used, use any from the category
    const finalFollowUps = availableFollowUps.length > 0 ? availableFollowUps : categoryFollowUps;
    const selectedFollowUp = finalFollowUps[Math.floor(Math.random() * finalFollowUps.length)];
    
    NYLALogger.debug('🔄 NYLA LLM: Selected suggestion:', selectedFollowUp, '(available options:', finalFollowUps.length + ')');
    
    // Track this suggestion as used
    this.trackUsedFollowUp(selectedFollowUp);
    followUps.push({ text: this.getDirectSuggestion(selectedFollowUp) });
    
    // 4. Change topic (existing style)
    const changeTopicOptions = [
      "What else can NYLAGo do?",
      "Show me other features",
      "Tell me about different capabilities"
    ];
    followUps.push({ text: changeTopicOptions[Math.floor(Math.random() * changeTopicOptions.length)] });
    
    NYLALogger.debug('💡 NYLA LLM: Generated follow-ups:', followUps.map(f => f.text));
    return followUps;
  }

  /**
   * Generate default follow-up suggestions (fallback)
   */
  generateDefaultFollowUps(context) {
    // This is now a fallback - should rarely be used
    NYLALogger.debug('⚠️ NYLA LLM: Using fallback follow-up generation');
    return [
      { text: "How do I get started?" },
      { text: "Tell me about other features" }
    ];
  }

  /**
   * Strip HTML tags from text to ensure plain text output
   */
  stripHtmlTags(text) {
    if (!text) return text;
    
    // Remove HTML tags but preserve the content inside
    const stripped = text.replace(/<[^>]*>/g, '');
    
    // Log if HTML was found and stripped
    if (stripped !== text) {
      console.warn('NYLA LLM: Stripped HTML tags from response:', text.substring(0, 100) + '...');
    }
    
    return stripped;
  }

  /**
   * Validate and normalize response
   */
  validateResponse(response, context, userMessage) {
    // Ensure required fields with robust text validation
    if (!response.text || typeof response.text !== 'string' || response.text.trim().length === 0) {
      console.warn('NYLA LLM: Invalid or empty response text, using fallback');
      response.text = "I'm here to help with NYLA and cryptocurrency questions!";
    } else {
      // Clean up the text - remove extra whitespace and ensure it's a string
      response.text = response.text.trim();
      
      // The LLM should only generate plain text with @ mentions
    }
    
    response.sentiment = response.sentiment || 'helpful';
    response.confidence = Math.min(Math.max(response.confidence || 0.7, 0), 1);
    // Personal care disabled for now
    response.personalCare = { shouldAsk: false };
    response.followUpSuggestions = response.followUpSuggestions || [];
    
    // Note: LLM responses are always part of RAG+LLM hybrid - no generation flags needed
    NYLALogger.debug('🔍 NYLA LLM: Response validated and ready for RAG integration');

    // Simple character limit enforcement
    const maxLength = 800;
    
    if (response.text && response.text.length > maxLength) {
      NYLALogger.debug(`NYLA LLM: Response too long (${response.text.length} chars), truncating to ${maxLength}...`);
      // Find last complete sentence within limit
      const buffer = maxLength - 3; // Leave room for ellipsis
      const truncated = response.text.substring(0, buffer);
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
      NYLALogger.debug(`NYLA LLM: Truncated to ${response.text.length} characters`);
      NYLALogger.debug(`NYLA LLM: Final truncated text: "${response.text}"`);
    }

    // Additional safety check for empty response after truncation
    if (!response.text || response.text.trim().length === 0) {
      console.warn('NYLA LLM: Response text is empty after processing, using fallback');
      response.text = "I'm here to help with NYLA! What would you like to know?";
    }

    // Always use improved follow-up generation (ignore LLM suggestions)
    NYLALogger.debug('NYLA LLM: Generating contextual follow-up suggestions...');
    response.followUpSuggestions = this.generateImprovedFollowUps(context, userMessage || '', response.text);
    
    // Add source information if available from RAG pipeline
    if (this.currentSources && this.currentSources.length > 0) {
      response.sources = this.currentSources.map(source => ({
        title: source.title || source.source,
        id: source.source,
        chunksUsed: source.chunks ? source.chunks.length : 1
      }));
      NYLALogger.debug(`📚 NYLA LLM: Added ${response.sources.length} source references to response`);
    }
    
    // Add context statistics if available
    if (this.currentContextStats && this.currentContextStats.chunksUsed > 0) {
      response.contextInfo = {
        chunksUsed: this.currentContextStats.chunksUsed,
        totalChunks: this.currentContextStats.totalChunks,
        hasConversationContext: this.currentContextStats.hasConversationContext
      };
    }
    
    // Clear stored metadata to prevent leakage between requests
    this.currentSources = null;
    this.currentContextStats = null;

    // Personal care feature disabled for now - can be re-enabled when KB extraction is improved
    // if (context.timezone && context.localTime) {
    //   response.personalCare = this.enhancePersonalCare(response.personalCare, context);
    // }

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
      NYLALogger.debug('NYLA LLM: 🔥 Warming up engine to ensure GPU buffers are allocated...');
      NYLALogger.debug('NYLA LLM: Engine instance:', !!this.engine);
      
      if (!this.engine) {
        throw new Error('Engine instance not available for warmup');
      }
      
      // Skip warmup for now due to NaN sampling issues with some models
      NYLALogger.debug('NYLA LLM: ⚠️ Skipping warmup due to potential model compatibility issues');
      NYLALogger.debug('NYLA LLM: 🔄 Engine will warm up on first real request instead');
      this.isEngineWarmedUp = true; // Mark as warmed up to proceed
      return;
      
      // Original warmup code (disabled due to NaN error)
      /*
      NYLALogger.debug('NYLA LLM: Sending warmup test prompt...');
      const warmupResponse = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: "Hi" }
        ],
        temperature: 0.1,
        max_tokens: 5
      });
      
      NYLALogger.debug('NYLA LLM: ✅ Engine warmed up successfully - GPU buffers ready');
      NYLALogger.debug('NYLA LLM: 🚀 Subsequent requests will be faster');
      NYLALogger.debug('NYLA LLM: Warmup response received:', warmupResponse?.choices?.[0]?.message?.content || 'No content');
      this.isEngineWarmedUp = true;
      NYLALogger.debug('NYLA LLM: isEngineWarmedUp set to:', this.isEngineWarmedUp);
      */
      
    } catch (error) {
      console.error('NYLA LLM: ❌ Engine warmup failed:', error.message);
      console.error('NYLA LLM: Warmup error stack:', error.stack);
      console.warn('NYLA LLM: Continuing with engine marked as warmed up anyway');
      this.isEngineWarmedUp = true; // Mark as warmed up to proceed despite error
      // Don't throw - warmup failure shouldn't prevent normal operation
    }
  }

  /**
   * Check if engine is ready
   */
  isReady() {
    const ready = this.isInitialized && this.isEngineReady && this.isEngineWarmedUp && this.engine;
    if (!ready) {
      NYLALogger.debug('NYLA LLM: Engine not ready - initialized:', this.isInitialized, 'engineReady:', this.isEngineReady, 'warmedUp:', this.isEngineWarmedUp, 'engine:', !!this.engine);
    } else {
      NYLALogger.debug('NYLA LLM: ✅ Engine fully ready for inference');
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
    
    NYLALogger.debug('NYLA LLM: 🔄 Force cleanup requested - unloading model and GPU buffers');
    
    if (this.engine) {
      try {
        this.engine.unload();
        NYLALogger.debug('NYLA LLM: Model unloaded from GPU');
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
    
    NYLALogger.debug('NYLA LLM: 🧹 Cleanup completed - next request will require full reinitialization');
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
      NYLALogger.debug('NYLA LLM: 🔥 Tab hidden - keeping engine warm');
    } else {
      NYLALogger.debug('NYLA LLM: 👁️  Tab visible - engine still ready');
    }
  }
});

// Prevent cleanup on beforeunload unless user explicitly wants it
window.addEventListener('beforeunload', (event) => {
  if (window.nylaLLMEngine && window.nylaLLMEngine.isReady()) {
    NYLALogger.debug('NYLA LLM: 🔥 Page unloading - engine stays in memory for next visit');
    // Don't cleanup automatically - let the browser handle memory
    // Only cleanup if memory pressure is detected
  }
});