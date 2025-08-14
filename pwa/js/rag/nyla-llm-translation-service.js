/**
 * NYLA LLM-Based Translation and Summary Service
 * Uses Xenova/Transformers.js models for bilingual content generation
 * Development stage - for automatic knowledge base content creation
 */

class NYLALLMTranslationService {
  constructor(options = {}) {
    this.options = {
      // Model options for text generation
      summaryModel: 'Xenova/mt5-small', // Multilingual T5 for summarization
      translationModel: 'Xenova/opus-mt-en-zh', // English to Chinese translation
      alternativeModel: 'Xenova/mbart-large-50-many-to-many-mmt', // Fallback multilingual
      
      // Generation parameters
      maxSummaryLength: 100, // tokens for English
      maxSummaryLengthZh: 150, // tokens for Chinese (accounts for characters)
      temperature: 0.7,
      topK: 50,
      topP: 0.95,
      
      // Development options
      debugMode: true,
      fallbackToTemplate: true,
      cacheResults: true,
      
      ...options
    };
    
    this.summaryPipeline = null;
    this.translationPipeline = null;
    this.initialized = false;
    this.cache = new Map();
    
    console.log('🤖 LLM Translation Service created (Development Mode)');
  }

  /**
   * Initialize LLM pipelines
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🚀 Initializing LLM pipelines for translation and summarization...');
    
    try {
      // Dynamic import for browser/node compatibility
      let pipeline, env;
      if (typeof window !== 'undefined') {
        const transformers = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
        pipeline = transformers.pipeline;
        env = transformers.env;
      } else {
        const transformers = await import('@xenova/transformers');
        pipeline = transformers.pipeline;
        env = transformers.env;
      }
      
      // Configure environment for development
      env.allowRemoteModels = true;
      env.remoteURL = 'https://huggingface.co/';
      
      // Initialize pipelines
      console.log('📥 Loading summarization model...');
      this.summaryPipeline = await pipeline('summarization', this.options.summaryModel, {
        progress_callback: (progress) => {
          if (this.options.debugMode) {
            console.log(`Summary model loading: ${progress.status} - ${Math.round(progress.progress || 0)}%`);
          }
        }
      });
      
      console.log('📥 Loading translation model...');
      this.translationPipeline = await pipeline('translation', this.options.translationModel, {
        progress_callback: (progress) => {
          if (this.options.debugMode) {
            console.log(`Translation model loading: ${progress.status} - ${Math.round(progress.progress || 0)}%`);
          }
        }
      });
      
      this.initialized = true;
      console.log('✅ LLM pipelines initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize LLM pipelines:', error);
      
      // Fallback to template-based approach
      if (this.options.fallbackToTemplate) {
        console.log('⚠️ Falling back to template-based generation');
        this.initialized = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate bilingual summaries from content
   */
  async generateBilingualSummaries(content, metadata = {}) {
    await this.initialize();
    
    const { title, type, tags } = metadata;
    const cacheKey = this.getCacheKey(content, metadata);
    
    // Check cache
    if (this.options.cacheResults && this.cache.has(cacheKey)) {
      console.log('💾 Returning cached summaries');
      return this.cache.get(cacheKey);
    }
    
    try {
      let summaryEn, summaryZh;
      
      if (this.summaryPipeline && this.translationPipeline) {
        // Use LLM pipelines
        summaryEn = await this.generateEnglishSummary(content, metadata);
        summaryZh = await this.translateToChines(summaryEn);
      } else {
        // Fallback to template-based generation
        const summaries = this.generateTemplateSummaries(content, metadata);
        summaryEn = summaries.summary_en;
        summaryZh = summaries.summary_zh;
      }
      
      const result = {
        summary_en: summaryEn,
        summary_zh: summaryZh,
        metadata: {
          generated_by: this.summaryPipeline ? 'llm' : 'template',
          timestamp: new Date().toISOString(),
          model_used: this.summaryPipeline ? this.options.summaryModel : 'template'
        }
      };
      
      // Cache result
      if (this.options.cacheResults) {
        this.cache.set(cacheKey, result);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error generating summaries:', error);
      
      if (this.options.fallbackToTemplate) {
        return this.generateTemplateSummaries(content, metadata);
      }
      
      throw error;
    }
  }

  /**
   * Generate English summary using LLM
   */
  async generateEnglishSummary(content, metadata) {
    console.log('📝 Generating English summary...');
    
    // Prepare context-aware prompt
    const prompt = this.buildSummaryPrompt(content, metadata);
    
    try {
      const result = await this.summaryPipeline(prompt, {
        max_length: this.options.maxSummaryLength,
        min_length: 30,
        do_sample: true,
        temperature: this.options.temperature,
        top_k: this.options.topK,
        top_p: this.options.topP
      });
      
      const summary = result[0].summary_text;
      
      if (this.options.debugMode) {
        console.log('Generated English summary:', summary);
      }
      
      return this.postProcessSummary(summary, 'en');
      
    } catch (error) {
      console.error('❌ English summary generation failed:', error);
      throw error;
    }
  }

  /**
   * Translate English summary to Chinese
   */
  async translateToChines(englishSummary) {
    console.log('🌏 Translating to Chinese...');
    
    try {
      const result = await this.translationPipeline(englishSummary, {
        max_length: this.options.maxSummaryLengthZh,
        temperature: this.options.temperature
      });
      
      const translation = result[0].translation_text;
      
      if (this.options.debugMode) {
        console.log('Generated Chinese translation:', translation);
      }
      
      return this.postProcessSummary(translation, 'zh');
      
    } catch (error) {
      console.error('❌ Chinese translation failed:', error);
      throw error;
    }
  }

  /**
   * Build context-aware summary prompt
   */
  buildSummaryPrompt(content, metadata) {
    const { title, type, tags } = metadata;
    
    let contextHint = '';
    
    // Add type-specific context
    switch (type) {
      case 'howto':
        contextHint = 'Summarize this how-to guide focusing on the main steps: ';
        break;
      case 'facts':
        contextHint = 'Summarize these key facts about blockchain/crypto: ';
        break;
      case 'policy':
        contextHint = 'Summarize this policy or guideline: ';
        break;
      case 'faq':
        contextHint = 'Summarize this FAQ answer: ';
        break;
      case 'troubleshooting':
        contextHint = 'Summarize this troubleshooting solution: ';
        break;
      default:
        contextHint = 'Summarize the following content: ';
    }
    
    // Include title for better context
    const fullPrompt = `${contextHint}${title ? `"${title}". ` : ''}${content}`;
    
    return fullPrompt;
  }

  /**
   * Post-process generated summaries
   */
  postProcessSummary(summary, lang) {
    // Remove extra whitespace
    summary = summary.trim();
    
    // Ensure proper ending punctuation
    if (lang === 'en' && !summary.match(/[.!?]$/)) {
      summary += '.';
    }
    
    // Limit length
    if (lang === 'en') {
      const words = summary.split(' ');
      if (words.length > 100) {
        summary = words.slice(0, 100).join(' ') + '...';
      }
    } else if (lang === 'zh') {
      if (summary.length > 100) {
        summary = summary.substring(0, 100) + '...';
      }
    }
    
    return summary;
  }

  /**
   * Fallback template-based summary generation
   */
  generateTemplateSummaries(content, metadata) {
    const { title, type, tags = [] } = metadata;
    
    console.log('📋 Using template-based summary generation');
    
    // Extract key sentences
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    const firstTwoSentences = sentences.slice(0, 2).join(' ').trim();
    
    // Generate based on type
    let summaryEn, summaryZh;
    
    switch (type) {
      case 'howto':
        summaryEn = `Step-by-step guide: ${title || firstTwoSentences}`;
        summaryZh = `操作指南：${title || '详细步骤说明'}`;
        break;
        
      case 'facts':
        summaryEn = `Key information about ${tags[0] || 'blockchain'}: ${firstTwoSentences}`;
        summaryZh = `关于${tags[0] || '区块链'}的重要信息：${this.basicTranslation(firstTwoSentences)}`;
        break;
        
      case 'policy':
        summaryEn = `Policy guideline: ${title || firstTwoSentences}`;
        summaryZh = `政策指南：${title || '重要规定说明'}`;
        break;
        
      case 'faq':
        summaryEn = `Common question answered: ${firstTwoSentences}`;
        summaryZh = `常见问题解答：${this.basicTranslation(firstTwoSentences)}`;
        break;
        
      case 'troubleshooting':
        summaryEn = `Solution for: ${title || firstTwoSentences}`;
        summaryZh = `解决方案：${title || '问题修复方法'}`;
        break;
        
      default:
        summaryEn = firstTwoSentences.substring(0, 200);
        summaryZh = this.basicTranslation(summaryEn);
    }
    
    return {
      summary_en: this.postProcessSummary(summaryEn, 'en'),
      summary_zh: this.postProcessSummary(summaryZh, 'zh'),
      metadata: {
        generated_by: 'template',
        timestamp: new Date().toISOString(),
        fallback_reason: 'template_mode'
      }
    };
  }

  /**
   * Basic keyword-based translation for fallback
   */
  basicTranslation(text) {
    // Common crypto/blockchain terms mapping
    const translations = {
      'blockchain': '区块链',
      'network': '网络',
      'transaction': '交易',
      'wallet': '钱包',
      'transfer': '转账',
      'fee': '手续费',
      'token': '代币',
      'address': '地址',
      'balance': '余额',
      'security': '安全',
      'private key': '私钥',
      'public key': '公钥',
      'smart contract': '智能合约',
      'gas': '燃料费',
      'mining': '挖矿',
      'exchange': '交易所',
      'liquidity': '流动性',
      'stake': '质押',
      'yield': '收益',
      'DeFi': '去中心化金融',
      'NFT': '非同质化代币',
      'DAO': '去中心化自治组织'
    };
    
    let translated = text;
    
    // Replace known terms
    for (const [en, zh] of Object.entries(translations)) {
      const regex = new RegExp(`\\b${en}\\b`, 'gi');
      translated = translated.replace(regex, zh);
    }
    
    return translated;
  }

  /**
   * Generate cache key
   */
  getCacheKey(content, metadata) {
    const key = JSON.stringify({
      content: content.substring(0, 100),
      title: metadata.title,
      type: metadata.type
    });
    
    return this.simpleHash(key);
  }

  /**
   * Simple hash function
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 Translation cache cleared');
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      cacheSize: this.cache.size,
      modelsLoaded: {
        summary: !!this.summaryPipeline,
        translation: !!this.translationPipeline
      },
      options: this.options
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLALLMTranslationService;
}
window.NYLALLMTranslationService = NYLALLMTranslationService;