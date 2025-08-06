/**
 * NYLA LLM Engine - Phase 2 WebLLM Integration
 * Provides local AI capabilities using Phi-3-Mini via WebLLM
 */

class NYLALLMEngine {
  constructor() {
    this.engine = null;
    this.isInitialized = false;
    this.isLoading = false;
    
    // Detect device type and select appropriate model
    this.deviceInfo = this.detectDevice();
    this.modelConfig = {
      model: this.selectModel(),
      temperature: 0.8,
      max_tokens: 300,
      top_p: 0.8,
    };
    this.systemPrompt = this.createSystemPrompt();
    
    // Log model configuration
    console.log('🎯 NYLA LLM: Model Configuration:');
    console.log('  - Model:', this.modelConfig.model);
    console.log('  - Temperature:', this.modelConfig.temperature);
    console.log('  - Max Tokens:', this.modelConfig.max_tokens);
    console.log('  - Top P:', this.modelConfig.top_p);
    console.log('  - Top K:', this.modelConfig.top_k);
    
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
    this.lastUsedFollowUps = new Map(); // Track specific follow-up suggestions used
  }

  /**
   * Detect device type and capabilities
   */
  detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes('android');
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // Check if running as PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone === true ||
                  document.referrer.includes('android-app://');
    
    // Check if mobile browser (not extension)
    const isMobilePWA = isMobile && (isPWA || !window.chrome?.runtime);
    
    
    return {
      isAndroid,
      isIOS,
      isMobile,
      isPWA,
      isMobilePWA,
      userAgent
    };
  }

  /**
   * Select appropriate model based on device capabilities
   */
  selectModel() {
    console.log('🎯 NYLA LLM: Model Selection - Using Qwen2-1.5B-Instruct q4f32_1');
    console.log('  - Primary Model: Qwen2-1.5B-Instruct-q4f32_1-MLC (1.5B parameters)');
    console.log('  - Strategy: Qwen2 model optimized for instruction following');
    console.log('  - Config: GPU inference with conservative parameters');
    console.log('  - Device info:', this.deviceInfo);
    
    // Store fallback model options - verified models from mlc.ai/models
    this.fallbackModels = ["Qwen2-0.5B-Instruct-q4f32_1-MLC", "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC"];
    
    // Use Qwen2-1.5B-Instruct q4f32_1 - Balanced size and performance
    console.log('✅ NYLA LLM: Selected Qwen2-1.5B-Instruct q4f32_1 for balanced performance');
    return "Qwen2-1.5B-Instruct-q4f32_1-MLC"; // From https://mlc.ai/models
  }

  /**
   * Check WebGPU compatibility including device-specific issues
   */
  async checkWebGPUCompatibility() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes('android');
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // Basic WebGPU support check
    if (!navigator.gpu) {
      if (isAndroid) {
        return {
          supported: false,
          reason: 'Android WebGPU not available - Chrome for Android with WebGPU flag required. LLM will use rule-based responses.'
        };
      } else if (isMobile) {
        return {
          supported: false,
          reason: 'Mobile WebGPU not supported - LLM requires WebGPU for inference. Using rule-based responses.'
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
          reason: 'WebGPU adapter not available - GPU may not support required features. Using rule-based responses.'
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
                reason: `Android WebGPU f16 extension not supported. This device cannot run WebLLM models that require f16 floating-point precision. Using rule-based responses instead.`
              };
            } else if (errorMessage.includes('WGSL') || errorMessage.includes('shader')) {
              return {
                supported: false,
                reason: `Android WebGPU shader compilation failed: ${errorMessage}. This indicates WebGPU compatibility issues on this device.`
              };
            } else {
              return {
                supported: false,
                reason: `Android WebGPU compatibility issue: ${errorMessage}. Using rule-based responses.`
              };
            }
          }
          
          console.log('NYLA LLM: ✅ Android WebGPU compatibility test passed');
          return { supported: true };
          
        } catch (shaderError) {
          console.warn('NYLA LLM: Android WebGPU shader compatibility failed:', shaderError.message);
          
          // Provide specific error message for f16 extension issue
          if (shaderError.message.includes('f16')) {
            return {
              supported: false,
              reason: `Android WebGPU f16 extension not supported. This device cannot run WebLLM models that require f16 floating-point precision. Using rule-based responses instead.`
            };
          } else if (shaderError.message.includes('WGSL') || shaderError.message.includes('shader')) {
            return {
              supported: false,
              reason: `Android WebGPU shader compilation failed: ${shaderError.message}. This indicates WebGPU compatibility issues on this device.`
            };
          } else {
            return {
              supported: false,
              reason: `Android WebGPU compatibility issue: ${shaderError.message}. Using rule-based responses.`
            };
          }
        }
      }
      
      return { supported: true };
      
    } catch (error) {
      console.warn('NYLA LLM: WebGPU compatibility test failed:', error.message);
      return {
        supported: false,
        reason: `WebGPU compatibility issue - ${error.message}. Using rule-based responses.`
      };
    }
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
      console.log('NYLA LLM: 🔄 Background preload - users can continue using PWA while this loads');
    }
    
    try {
      console.log('NYLA LLM: Initializing WebLLM engine...');
      console.log('NYLA LLM: 💡 To see detailed LLM logs, add ?debug=true to the URL');
      console.log('NYLA LLM: Device detection:', this.deviceInfo);
      console.log(`NYLA LLM: Model: ${this.modelConfig.model} (1.5B parameters, conservative config to fix NaN)`);
      
      // Enhanced WebGPU compatibility check
      const webgpuCheckStart = performance.now();
      const compatibilityResult = await this.checkWebGPUCompatibility();
      if (!compatibilityResult.supported) {
        throw new Error(compatibilityResult.reason);
      }
      const webgpuCheckTime = performance.now() - webgpuCheckStart;
      console.log(`NYLA LLM: ✅ WebGPU detected (${webgpuCheckTime.toFixed(2)}ms)`);
      
      // Load WebLLM dynamically
      if (!window.webllm) {
        console.log('NYLA LLM: Loading WebLLM library...');
        const webllmLoadStart = performance.now();
        const loaded = await this.loadWebLLM();
        if (!loaded) {
          throw new Error('Failed to load WebLLM library');
        }
        webllmLoadTime = performance.now() - webllmLoadStart;
        console.log(`NYLA LLM: ✅ WebLLM library loaded (${(webllmLoadTime / 1000).toFixed(2)}s)`);
      }

      // Double-check library loaded
      if (!window.webllm || !window.webllm.MLCEngine) {
        throw new Error('WebLLM library not properly loaded - MLCEngine not found');
      }

      // Initialize the engine with GPU enabled
      console.log('NYLA LLM: Creating MLCEngine instance for GPU inference...');
      const engineCreateStart = performance.now();
      this.engine = new window.webllm.MLCEngine();
      const engineCreateTime = performance.now() - engineCreateStart;
      console.log(`NYLA LLM: ✅ MLCEngine created with GPU inference (${engineCreateTime.toFixed(2)}ms)`);
      
      console.log(`NYLA LLM: Loading ${this.modelConfig.model} model...`);
      console.log('NYLA LLM: ⏳ Qwen2-1.5B expected loading time: 15-25s first time (1.5B params, q4f32_1)');
      console.log('NYLA LLM: 🧪 Testing Qwen2-1.5B-Instruct q4f32_1 with GPU inference and conservative config');
      
      // Try to initialize model with fallback options
      let modelLoaded = false;
      let modelLoadTime = 0;
      let modelAttempts = [this.modelConfig.model, ...(this.fallbackModels || [])];
      
      for (let i = 0; i < modelAttempts.length; i++) {
        const modelToTry = modelAttempts[i];
        try {
          console.log(`NYLA LLM: Attempting to load model ${i + 1}/${modelAttempts.length}: ${modelToTry}`);
          const modelLoadStart = performance.now();
          
          await this.engine.reload(modelToTry, {
            model_url: "https://huggingface.co/mlc-ai/Qwen2-1.5B-Instruct-q4f32_1-MLC/resolve/main/",
            // Progress callback for model loading
            initProgressCallback: (progress) => {
              if (progress.progress) {
                const elapsed = ((performance.now() - modelLoadStart) / 1000).toFixed(1);
                console.log(`NYLA LLM: Loading progress: ${Math.round(progress.progress * 100)}% (${elapsed}s)`);
              }
            }
          });
          
          modelLoadTime = performance.now() - modelLoadStart;
          // If we get here, model loaded successfully
          this.modelConfig.model = modelToTry; // Update to successful model
          modelLoaded = true;
          console.log(`NYLA LLM: ✅ Successfully loaded model: ${modelToTry} (${(modelLoadTime / 1000).toFixed(2)}s)`);
          break;
          
        } catch (modelError) {
          console.error(`NYLA LLM: Failed to load ${modelToTry}:`, modelError.message);
          if (i < modelAttempts.length - 1) {
            console.log('NYLA LLM: Trying fallback model...');
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
        console.log('NYLA LLM: ✅ Background preload completed! 🧠✨');
        console.log('NYLA LLM: 🎯 Qwen2-1.5B-Instruct ready - efficient model with instruction tuning');
      } else {
        console.log('NYLA LLM: ✅ WebLLM engine initialized successfully! 🧠✨');
      }
      console.log('NYLA LLM: 🤖 Ready for GPU-based AI inference with Qwen2-1.5B-Instruct (1.5B params - q4f32_1)');
      console.log('NYLA LLM: 🔥 Engine will stay hot and ready for subsequent requests');
      
      // Warm up the engine with a tiny test prompt to ensure GPU buffers are allocated
      console.log('NYLA LLM: Calling warmupEngine...');
      const warmupStart = performance.now();
      await this.warmupEngine();
      const warmupTime = performance.now() - warmupStart;
      console.log(`NYLA LLM: Warmup completed in ${warmupTime.toFixed(2)}ms, isEngineWarmedUp:`, this.isEngineWarmedUp);
      
      // Total initialization time
      const totalInitTime = performance.now() - initStartTime;
      console.log(`NYLA LLM: 🎉 Total initialization time: ${(totalInitTime / 1000).toFixed(2)}s`);
      console.log(`NYLA LLM: 📊 Breakdown:`);
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
      
      // Use dynamic import - stable WebLLM version 0.2.79 for consistent model availability
      const webllmModule = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/lib/index.js');
      
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
      script.src = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/lib/index.js';
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
      const parsedResponse = this.parseResponse(generatedText, conversationContext, userMessage);
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
      
      // Enhanced error handling for NaN sampling issues
      if (error.message && error.message.includes('uniform_sample <= data[0].first')) {
        const enhancedError = new Error('Model sampling error: The AI model encountered a numerical stability issue (NaN values). This may be due to model incompatibility. Try refreshing the page to reinitialize with a fallback model.');
        enhancedError.originalError = error;
        enhancedError.isModelCompatibilityError = true;
        throw enhancedError;
      } else if (error.name === 'ExitStatus' && error.status === 1) {
        const enhancedError = new Error('AI model crashed during inference. This appears to be a model compatibility issue with your device. The system will fall back to rule-based responses.');
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
      console.log('NYLA LLM: Final streaming response length:', fullResponse.length);
      console.log('NYLA LLM: Final streaming response preview:', fullResponse.substring(0, 200) + '...');
      console.log('NYLA LLM: Final streaming response end:', '...' + fullResponse.substring(Math.max(0, fullResponse.length - 200)));
      
      return this.parseResponse(fullResponse, conversationContext, userMessage);

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
    return `You are NYLA, AI for NYLAGo. NYLAGo is a tool that generates NYLA transfer commands for X.com (formerly Twitter). 
    
    CRITICAL: PLAIN TEXT ONLY
    - You MUST output only plain text - NO HTML, NO tags, NO markup whatsoever
    - Do NOT write <a>, <div>, <span>, <br>, or any other HTML tags
    - Do NOT write href= or any HTML attributes
    - Just write regular text with @ symbols for team mentions
    
    IMPORTANT CONSTRAINTS:
    - Answer ONLY the specific question asked
    - Use ONLY information from the "Knowledge" section
    - Do NOT add fictional scenarios or made-up information
    - Keep responses factual and concise
    - ALWAYS mention specific names when discussing team members (e.g., @shax_btc, @btcberries, @Noir0883)
    
    CRITICAL: For "other features" or "what else" questions:
    - Pick only ONE different feature/capability to highlight
    - Do NOT list all features - focus on just one
    - Keep it brief and specific to avoid response truncation
    - Examples: Focus on just QR codes OR just community raids OR just blockchain selection
    
    IMPORTANT for transfer/send questions:
    - Always explain: "Use the 'Send' tab in NYLAGo to create commands for NYLA"
    - Steps: Fill recipient & amount in NYLAGo → Generate command → Post on X.com → NYLA executes transfer
    - NYLAGo creates commands, NYLA executes the actual transfers
    
    IMPORTANT for team/founder questions:
    - ALWAYS mention specific team member names with @ symbols
    - NYLA Team: @shax_btc (NYLA founder), @btcberries (NYLA co-founder), @ChiefZ_SOL (NYLA dev), @Noir0883 (NYLA designer)
    - Use the exact @ format for team member names
    
    IMPORTANT for security/safety questions:
    - Use "securityFeatures" section from Knowledge if available
    - Explain NYLAGo's security measures and safety practices
    - Address concerns about cryptocurrency transactions and X.com integration
    
    Key features:
    - Send: NYLA transfers (NYLAGo creates commands → NYLA executes)
    - Receive: NYLA QR codes for payment requests
    - Raid: Community engagement (access via "..." button in NYLAGo)
    
    IMPORTANT DISTINCTION:
    - NYLA = The AI that performs transfers, swaps, and blockchain operations
    - NYLAGo = The interface tool that helps users create commands for NYLA
    - When discussing features: Say "NYLA transfers" not "NYLAGo transfers"
    
    CRITICAL LIMITATION:
    - NYLA does NOT support cross-chain bridging or transfers between different blockchains
    - Each blockchain (Solana, Ethereum, Algorand) operates independently
    - Transfers only work within the SAME blockchain network
    
    RESPONSE FORMAT - Use only "Knowledge" section. Respond in JSON: 
    { 
      "text": "<250 chars MAX - PLAIN TEXT ONLY - NO HTML tags - Use @ for team mentions>", 
      "sentiment": "helpful|excited|friendly", 
      "followUpSuggestions": [] 
    }
    
    STRICT RULES:
    - NEVER WRITE HTML: No <a>, <div>, <span>, <br>, href=, or ANY HTML tags
    - PLAIN TEXT ONLY: Just write normal text with @ symbols
    - Do NOT generate followUpSuggestions. Return empty array [].
    - Do NOT add hypothetical examples like "User wants to send X to Y"
    - Do NOT create fictional scenarios or use cases
    - If beyond knowledge: "I need to study more."
    - When asked about team: ALWAYS include specific names (@shax_btc, @btcberries, @ChiefZ_SOL, @Noir0883)
    - For "what else" questions: Pick ONE feature only, not a comprehensive list
    - CRITICAL: For features, say "NYLA transfers" not "NYLAGo transfers" - NYLA does the operations
    - Focus on being helpful and specific - include names when relevant`
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
    } else if (queryLower.includes('transfer') || queryLower.includes('send') || queryLower.includes('create') || queryLower.includes('command') || queryLower.includes('how')) {
      // For transfer/send queries, extract ALL send-related content
      if (queryLower.includes('transfer') || queryLower.includes('send') || queryLower.includes('command')) {
        // Lead with Send tab instructions
        if (data.howItWorks?.sendTab) {
          content.push(`To create a transfer command: ${data.howItWorks.sendTab}`);
        } else {
          content.push('To create a transfer command: Use NYLAGo Send tab → Fill recipient & amount → Generate command → Post on X.com');
        }
        
        // Also search for any field containing "send" keyword
        this.extractFieldsContaining(data, 'send', content);
      }
      
      if (data.primaryPurpose) content.push(data.primaryPurpose);
      if (data.howItWorks?.overview && !queryLower.includes('transfer')) {
        content.push(data.howItWorks.overview);
      }
      if (data.howItWorks?.important) content.push(data.howItWorks.important);
      
      // Extract example flows if available
      if (data.exampleFlow) {
        Object.values(data.exampleFlow).forEach(step => {
          if (typeof step === 'string' && step.toLowerCase().includes('send')) {
            content.push(step);
          }
        });
      }
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
    
    // Remove duplicates and limit to ~150 tokens max per source
    const uniqueContent = [...new Set(content)];
    const result = uniqueContent.join('. ');
    return result.length > 600 ? result.substring(0, 600) + '...' : result;
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
        query.includes('send') || query.includes('command') || query.includes('create')) {
      // For transfer/command queries, prioritize Send tab instructions
      if (query.includes('transfer') || query.includes('send') || query.includes('command') || query.includes('create')) {
        if (knowledgeContext.nylagoCore?.content?.howItWorks?.sendTab) {
          relevantInfo.push(`To create a transfer command: ${knowledgeContext.nylagoCore.content.howItWorks.sendTab}`);
        } else {
          relevantInfo.push('To create a transfer command: Use NYLAGo Send tab → Fill in recipient username and amount → Click generate → Post the command on X.com');
        }
        
        // Extract example flows containing "send"
        if (knowledgeContext.nylagoCore?.content?.exampleFlow) {
          Object.values(knowledgeContext.nylagoCore.content.exampleFlow).forEach(step => {
            if (typeof step === 'string' && step.toLowerCase().includes('send')) {
              relevantInfo.push(step);
            }
          });
        }
        
        // Extract features containing "send"
        if (knowledgeContext.features?.content?.list) {
          knowledgeContext.features.content.list.forEach(feature => {
            if (feature.toLowerCase().includes('send')) {
              relevantInfo.push(feature);
            }
          });
        }
      }
      
      if (knowledgeContext.nylagoCore?.content?.howItWorks) {
        const hw = knowledgeContext.nylagoCore.content.howItWorks;
        // Only add overview if not a specific transfer query
        if (!query.includes('transfer') && !query.includes('command')) {
          relevantInfo.push(hw.overview);
        }
        relevantInfo.push(hw.important);
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

    console.log('\n📚 NYLA LLM: Building prompt with knowledge context');
    console.log('  - User message:', userMessage);
    
    if (knowledgeContext) {
      console.log('  - Knowledge sources available:', 
        knowledgeContext.searchResults ? `${knowledgeContext.searchResults.length} search results` : 'Legacy KB structure');
      
      const relevantInfo = this.extractRelevantKnowledge(userMessage, knowledgeContext);
      if (relevantInfo) {
        console.log(`  ✅ Extracted relevant knowledge (${relevantInfo.length} chars):`);
        console.log(`     "${relevantInfo.substring(0, 150)}${relevantInfo.length > 150 ? '...' : ''}"`);
        prompt += `Knowledge: ${relevantInfo}\n`;
      } else {
        console.log('  ⚠️ No relevant knowledge found for this query');
      }
    } else {
      console.log('  ⚠️ No knowledge context provided');
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
  parseResponse(generatedText, context, userMessage) {
    try {
      // Input size limit to prevent memory issues
      const MAX_RESPONSE_SIZE = 50000; // 50KB limit
      if (generatedText && generatedText.length > MAX_RESPONSE_SIZE) {
        console.warn('NYLA LLM: Response too large, truncating to prevent memory issues');
        generatedText = generatedText.substring(0, MAX_RESPONSE_SIZE);
      }

      // Clean up the text - remove any markdown code blocks
      let cleanText = generatedText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      console.log('NYLA LLM: Attempting to parse response of length:', generatedText.length);
      console.log('NYLA LLM: Clean text preview:', cleanText.substring(0, 300) + '...');
      console.log('NYLA LLM: Clean text end:', '...' + cleanText.substring(Math.max(0, cleanText.length - 300)));
      
      // Memory-safe JSON extraction using iterative approach
      const jsonObject = this.extractJsonSafely(cleanText);
      if (jsonObject) {
        try {
          console.log('NYLA LLM: Successfully parsed JSON response');
          console.log('NYLA LLM: JSON followUpSuggestions:', jsonObject.followUpSuggestions);
          return this.validateResponse(jsonObject, context, userMessage);
        } catch (parseError) {
          console.warn('NYLA LLM: JSON validation failed:', parseError.message);
        }
      } else {
        console.warn('NYLA LLM: extractJsonSafely returned null - JSON extraction failed');
      }
      
      // If no valid JSON found, extract text content
      console.log('NYLA LLM: No valid JSON found, attempting to extract partial content');
      
      // Try to extract text field even from incomplete JSON
      // Updated regex to handle escaped quotes and complex patterns
      let extractedText = null;
      let extractedFollowUps = [];
      
      // Method 1: Try to extract with proper JSON string handling
      const textPatterns = [
        // Pattern 1: Standard JSON with escaped quotes
        /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/,
        // Pattern 2: Extract up to comma or closing brace (for incomplete JSON)
        /"text"\s*:\s*"([^"]*?)(?:"|,|\}|$)/,
        // Pattern 3: More aggressive extraction for malformed JSON
        /"text"\s*:\s*["'](.+?)["']\s*[,\}]/s
      ];
      
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
          
          console.log('NYLA LLM: Extracted text using pattern:', pattern.source);
          break;
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
                
                console.log('NYLA LLM: Extracted text using manual parsing');
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
          console.log('NYLA LLM: Extracted partial followUps from incomplete JSON:', extractedFollowUps);
        } catch (followUpError) {
          console.warn('NYLA LLM: Failed to extract followUps from partial JSON:', followUpError.message);
        }
      }
      
      // If we found some content, return it
      if (extractedText && extractedText.trim().length > 0) {
        console.log('NYLA LLM: Extracted partial content from incomplete response:', extractedText);
        // Create response object that will get proper follow-ups in validateResponse
        const partialResponse = {
          text: extractedText.trim(),
          sentiment: 'helpful',
          confidence: 0.7,
          personalCare: { shouldAsk: false },
          followUpSuggestions: [], // Will be generated in validateResponse
          contextRelevant: true
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
    
    console.log('NYLA LLM: Using raw text as fallback');
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
    console.log('NYLA LLM: No JSON found with brace counting, trying regex approach');
    
    // Try to find JSON-like structures with regex (less accurate but handles some edge cases)
    const jsonMatches = text.match(/\{[^{}]*"text"\s*:\s*"[^"]*"[^{}]*\}/g);
    if (jsonMatches) {
      for (const match of jsonMatches) {
        try {
          const parsed = JSON.parse(match);
          if (parsed.text) {
            console.log('NYLA LLM: Found valid JSON with regex approach');
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
    console.log('🎯 NYLA LLM: Generating context-aware follow-up');
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
    console.log('📊 NYLA LLM: Current category detected:', currentCategory);
    console.log('📊 NYLA LLM: User message for detection:', userMessage);
    console.log('📊 NYLA LLM: Detection text:', (userMessage + ' ' + responseText).toLowerCase());
    
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
    console.log('🔄 NYLA LLM: Next category selected:', nextCategory, '(excluded categories:', excludeCategories.join(', ') + ')');
    
    // Filter out recently used specific suggestions
    const categoryFollowUps = categories[nextCategory].suggestions;
    console.log('🔄 NYLA LLM: Category suggestions for', nextCategory + ':', categoryFollowUps);
    console.log('🔄 NYLA LLM: Recently used suggestions:', [...this.lastUsedFollowUps.keys()]);
    
    const availableFollowUps = categoryFollowUps.filter(suggestion => !this.lastUsedFollowUps.has(suggestion));
    console.log('🔄 NYLA LLM: Available suggestions after filtering:', availableFollowUps);
    
    // If all suggestions in category were recently used, use any from the category
    const finalFollowUps = availableFollowUps.length > 0 ? availableFollowUps : categoryFollowUps;
    const selectedFollowUp = finalFollowUps[Math.floor(Math.random() * finalFollowUps.length)];
    
    console.log('🔄 NYLA LLM: Selected suggestion:', selectedFollowUp, '(available options:', finalFollowUps.length + ')');
    
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
    
    console.log('💡 NYLA LLM: Generated follow-ups:', followUps.map(f => f.text));
    return followUps;
  }

  /**
   * Generate default follow-up suggestions (fallback)
   */
  generateDefaultFollowUps(context) {
    // This is now a fallback - should rarely be used
    console.log('⚠️ NYLA LLM: Using fallback follow-up generation');
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

    // Enforce 300 character limit for faster generation
    if (response.text && response.text.length > 300) {
      console.log(`NYLA LLM: Response too long (${response.text.length} chars), truncating to 300...`);
      // Find last complete sentence within 300 chars
      const truncated = response.text.substring(0, 297);
      const lastSentence = truncated.lastIndexOf('.');
      const lastExclamation = truncated.lastIndexOf('!');
      const lastQuestion = truncated.lastIndexOf('?');
      const lastPunctuation = Math.max(lastSentence, lastExclamation, lastQuestion);
      
      if (lastPunctuation > 100) {
        // Cut at last sentence if it's reasonable (lowered from 200 to 100)
        response.text = response.text.substring(0, lastPunctuation + 1);
      } else {
        // Just truncate and add ellipsis
        response.text = truncated + '...';
      }
      console.log(`NYLA LLM: Truncated to ${response.text.length} characters`);
      console.log(`NYLA LLM: Final truncated text: "${response.text}"`);
    }

    // Additional safety check for empty response after truncation
    if (!response.text || response.text.trim().length === 0) {
      console.warn('NYLA LLM: Response text is empty after processing, using fallback');
      response.text = "I'm here to help with NYLA! What would you like to know?";
    }

    // Always use improved follow-up generation (ignore LLM suggestions)
    console.log('NYLA LLM: Generating contextual follow-up suggestions...');
    response.followUpSuggestions = this.generateImprovedFollowUps(context, userMessage || '', response.text);

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
      console.log('NYLA LLM: 🔥 Warming up engine to ensure GPU buffers are allocated...');
      console.log('NYLA LLM: Engine instance:', !!this.engine);
      
      if (!this.engine) {
        throw new Error('Engine instance not available for warmup');
      }
      
      // Skip warmup for now due to NaN sampling issues with some models
      console.log('NYLA LLM: ⚠️ Skipping warmup due to potential model compatibility issues');
      console.log('NYLA LLM: 🔄 Engine will warm up on first real request instead');
      this.isEngineWarmedUp = true; // Mark as warmed up to proceed
      return;
      
      // Original warmup code (disabled due to NaN error)
      /*
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