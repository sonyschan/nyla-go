/**
 * NYLA Knowledge Tracker - Monitors user knowledge acquisition and engagement
 * Tracks what percentage of NYLA knowledge the user has learned
 */

class NYLAKnowledgeTracker {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
    this.userKnowledge = {
      chunks: new Set(),           // Track individual knowledge chunks learned
      categories: new Set(),       // Track KB categories covered (about, howto, facts, etc.)
      tags: new Set(),            // Track tags encountered
      glossaryTerms: new Set(),   // Track glossary terms learned
      totalExposure: 0,
      lastEngagementPrompt: null,
      engagementHistory: [],
      lastKnowledgeUpdate: Date.now()
    };
    
    // Initialize structured KB stats
    this.structuredKB = null;
    this.kbStats = {
      totalChunks: 0,
      totalCategories: 0,
      totalTags: 0,
      totalGlossaryTerms: 0
    };
    
    // Load structured KB for knowledge calculation
    this.initializeStructuredKB();
    
    // Auto-save functionality
    this.autoSaveInterval = null;
    this.hasUnsavedChanges = false;
      
    this.loadFromStorage();
    this.startAutoSave();
    
    // Save on page unload
    window.addEventListener('beforeunload', () => {
      if (this.hasUnsavedChanges) {
        this.saveToStorage();
      }
    });
    
    // Save on visibility change (mobile background)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.hasUnsavedChanges) {
        this.saveToStorage();
      }
    });
  }

  /**
   * Initialize structured KB for accurate knowledge tracking
   */
  async initializeStructuredKB() {
    try {
      // Try to use RAG integration's loaded chunks if available
      if (window.ragIntegration && window.ragIntegration.ragPipeline) {
        const ragPipeline = window.ragIntegration.ragPipeline;
        if (ragPipeline.vectorDB && ragPipeline.vectorDB.chunks) {
          // Extract chunks from vector DB
          this.structuredKB = Array.from(ragPipeline.vectorDB.chunks.values());
          console.log(`📊 Knowledge Tracker: Using RAG pipeline chunks (${this.structuredKB.length})`);
        }
      }
      
      // Fallback: estimate KB size from known structure
      if (!this.structuredKB) {
        console.log('📊 Knowledge Tracker: Using estimated KB statistics');
        this.kbStats = {
          totalChunks: 87,       // Known from previous rebuild
          totalCategories: 8,    // about, facts, faq, glossary, howto, marketing, policy, troubleshooting, ecosystem
          totalTags: 45,         // Estimated unique tags
          totalGlossaryTerms: 60 // Estimated glossary terms
        };
        return;
      }
      
      // Calculate KB statistics from actual chunks
      this.calculateKBStats();
      
      console.log(`📊 Knowledge Tracker initialized with structured KB:`);
      console.log(`   Total chunks: ${this.kbStats.totalChunks}`);
      console.log(`   Categories: ${this.kbStats.totalCategories}`);
      console.log(`   Unique tags: ${this.kbStats.totalTags}`);
      console.log(`   Glossary terms: ${this.kbStats.totalGlossaryTerms}`);
    } catch (error) {
      console.warn('⚠️ Failed to load structured KB, using fallback tracking:', error);
      this.fallbackToLegacyTracking();
    }
  }

  /**
   * Calculate statistics from structured KB or metadata
   */
  calculateKBStats() {
    if (!this.structuredKB || this.structuredKB.length === 0) return;
    
    const allTags = new Set();
    const allCategories = new Set();
    const allGlossaryTerms = new Set();
    let totalChunks = 0;
    
    // Process all chunks from structured KB
    for (const chunk of this.structuredKB) {
      totalChunks++;
      
      // Track categories (from chunk metadata)
      const metadata = chunk.metadata || chunk;
      if (metadata.type) {
        allCategories.add(metadata.type);
      }
      if (metadata.section) {
        allCategories.add(metadata.section);
      }
      
      // Track tags
      if (metadata.tags && Array.isArray(metadata.tags)) {
        metadata.tags.forEach(tag => allTags.add(tag));
      }
      
      // Track glossary terms
      if (metadata.glossary_terms && Array.isArray(metadata.glossary_terms)) {
        metadata.glossary_terms.forEach(term => allGlossaryTerms.add(term));
      }
    }
    
    this.kbStats = {
      totalChunks,
      totalCategories: Math.max(allCategories.size, 8), // Ensure minimum categories
      totalTags: Math.max(allTags.size, 40),            // Ensure reasonable tag count
      totalGlossaryTerms: Math.max(allGlossaryTerms.size, 50) // Ensure reasonable term count
    };
  }

  /**
   * Track knowledge exposure from a conversation with structured KB approach
   */
  trackKnowledgeFromConversation(questionId, questionText, topic, answer) {
    const previousKnowledge = {
      chunks: this.userKnowledge.chunks.size,
      categories: this.userKnowledge.categories.size,
      tags: this.userKnowledge.tags.size,
      glossaryTerms: this.userKnowledge.glossaryTerms.size
    };
    
    // Track knowledge from RAG response if available
    if (answer && answer.ragResult && answer.ragResult.sources) {
      this.trackFromRAGSources(answer.ragResult.sources);
    }
    
    // Analyze text content for knowledge elements
    this.analyzeTextForKnowledge(questionText, answer);
    
    // Check if new knowledge was gained
    const currentKnowledge = {
      chunks: this.userKnowledge.chunks.size,
      categories: this.userKnowledge.categories.size,
      tags: this.userKnowledge.tags.size,
      glossaryTerms: this.userKnowledge.glossaryTerms.size
    };
    
    const hasNewKnowledge = Object.keys(currentKnowledge).some(
      key => currentKnowledge[key] > previousKnowledge[key]
    );
    
    if (hasNewKnowledge) {
      const percentage = this.getKnowledgePercentage();
      console.log(`📚 Knowledge gained:`);
      console.log(`   Chunks: ${previousKnowledge.chunks} → ${currentKnowledge.chunks}`);
      console.log(`   Categories: ${previousKnowledge.categories} → ${currentKnowledge.categories}`);
      console.log(`   Tags: ${previousKnowledge.tags} → ${currentKnowledge.tags}`);
      console.log(`   Glossary: ${previousKnowledge.glossaryTerms} → ${currentKnowledge.glossaryTerms}`);
      console.log(`   Overall: ${percentage.toFixed(1)}%`);
      
      this.userKnowledge.lastKnowledgeUpdate = Date.now();
      this.hasUnsavedChanges = true;
      this.saveToStorage();
    }
    
    // Increment total exposure
    this.userKnowledge.totalExposure++;
  }

  /**
   * Track knowledge from RAG sources (most accurate method)
   */
  trackFromRAGSources(sources) {
    for (const source of sources) {
      // Track chunk ID
      if (source.id) {
        this.userKnowledge.chunks.add(source.id);
      }
      
      // Track metadata elements
      if (source.metadata) {
        const metadata = source.metadata;
        
        // Track category/type
        if (metadata.type) {
          this.userKnowledge.categories.add(metadata.type);
        }
        
        // Track tags
        if (metadata.tags && Array.isArray(metadata.tags)) {
          metadata.tags.forEach(tag => this.userKnowledge.tags.add(tag));
        }
        
        // Track glossary terms
        if (metadata.glossary_terms && Array.isArray(metadata.glossary_terms)) {
          metadata.glossary_terms.forEach(term => this.userKnowledge.glossaryTerms.add(term));
        }
      }
    }
  }

  /**
   * Analyze text content for knowledge elements (fallback when no RAG data)
   */
  analyzeTextForKnowledge(questionText, answer) {
    const textToAnalyze = (questionText + ' ' + (typeof answer === 'string' ? answer : answer.text)).toLowerCase();
    
    // Infer categories from text patterns
    const categoryPatterns = {
      'about': ['team', 'founder', 'developer', 'creator', 'who made', 'who built'],
      'howto': ['how to', 'step', 'guide', 'tutorial', 'instructions'],
      'facts': ['contract', 'address', 'network', 'blockchain', 'supported'],
      'faq': ['what is', 'why', 'how does', 'frequently'],
      'troubleshooting': ['error', 'problem', 'issue', 'troubleshoot', 'fix']
    };
    
    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      if (patterns.some(pattern => textToAnalyze.includes(pattern))) {
        this.userKnowledge.categories.add(category);
      }
    }
    
    // Infer common tags from text
    const commonTags = [
      'transfer', 'send', 'receive', 'blockchain', 'solana', 'ethereum', 'algorand',
      'qr', 'code', 'community', 'raid', 'team', 'founder', 'developer',
      'NYLA', 'NYLAGo', 'token', 'payment', 'social', 'x.com', 'twitter'
    ];
    
    for (const tag of commonTags) {
      if (textToAnalyze.includes(tag.toLowerCase())) {
        this.userKnowledge.tags.add(tag.toLowerCase());
      }
    }
    
    // Infer glossary terms from text
    const commonTerms = [
      'blockchain', 'smart contract', 'wallet', 'token', 'cryptocurrency',
      'decentralized', 'web3', 'DeFi', 'NFT', 'stablecoin', 'gas fee',
      'private key', 'public key', 'seed phrase', 'consensus'
    ];
    
    for (const term of commonTerms) {
      if (textToAnalyze.includes(term.toLowerCase())) {
        this.userKnowledge.glossaryTerms.add(term.toLowerCase());
      }
    }
  }

  /**
   * Fallback to legacy tracking when structured KB is unavailable
   */
  fallbackToLegacyTracking() {
    console.warn('📚 Knowledge Tracker: Using legacy keyword-based tracking');
    
    // Reset to old structure for compatibility
    this.userKnowledge = {
      topics: new Set(),
      concepts: new Set(), 
      features: new Set(),
      mappedKeywords: new Set(),
      totalExposure: 0,
      lastEngagementPrompt: null,
      engagementHistory: [],
      lastKnowledgeUpdate: Date.now()
    };
    
    // Use legacy KB stats
    this.kbStats = {
      totalChunks: 150,        // Estimated legacy total
      totalCategories: 5,      // about, howto, facts, faq, troubleshooting
      totalTags: 50,           // Estimated unique tags
      totalGlossaryTerms: 100  // Estimated glossary terms
    };
  }

  /**
   * Calculate knowledge percentage based on structured KB coverage
   */
  getKnowledgePercentage() {
    if (!this.structuredKB) {
      // Fallback calculation for legacy tracking
      const mappedCount = this.userKnowledge.mappedKeywords ? this.userKnowledge.mappedKeywords.size : 0;
      return Math.min((mappedCount / 100) * 100, 100); // Assume 100 total for legacy
    }
    
    // Weighted calculation based on different knowledge dimensions
    const weights = {
      chunks: 0.5,           // 50% - most important (actual content learned)
      categories: 0.2,       // 20% - coverage breadth
      tags: 0.2,            // 20% - topic diversity  
      glossaryTerms: 0.1     // 10% - vocabulary depth
    };
    
    const scores = {
      chunks: Math.min(this.userKnowledge.chunks.size / this.kbStats.totalChunks, 1),
      categories: Math.min(this.userKnowledge.categories.size / this.kbStats.totalCategories, 1),
      tags: Math.min(this.userKnowledge.tags.size / this.kbStats.totalTags, 1),
      glossaryTerms: Math.min(this.userKnowledge.glossaryTerms.size / this.kbStats.totalGlossaryTerms, 1)
    };
    
    const weightedScore = Object.keys(weights).reduce((total, key) => {
      return total + (scores[key] * weights[key]);
    }, 0);
    
    return Math.min(Math.round(weightedScore * 10000) / 100, 100); // 2 decimal places, max 100%
  }

  /**
   * Calculate total available keywords from all mappings
   */
  calculateTotalKeywords() {
    const conceptMappings = {
      'crypto-transfers': ['transfer', 'send', 'payment', 'transaction'],
      'blockchain-networks': ['blockchain', 'solana', 'ethereum', 'algorand', 'network', 'networks', 'infrastructure'],
      'network-isolation': ['same-chain', 'within', 'independent', 'separate', 'isolated'],
      'payment-requests': ['request', 'receive', 'payment', 'invoice'],
      'qr-generation': ['qr', 'code', 'scan', 'generate'],
      'community-building': ['community', 'together', 'ecosystem', 'social'],
      'social-viral': ['viral', 'share', 'post', 'social', 'x.com', 'twitter'],
      'token-economics': ['token', 'nyla', 'economics', 'value', 'utility'],
      'defi-integration': ['defi', 'decentralized', 'finance', 'protocol'],
      'user-experience': ['easy', 'simple', 'user', 'experience', 'interface'],
      'mobile-first': ['mobile', 'phone', 'app', 'pwa', 'responsive'],
      'web3-adoption': ['web3', 'adoption', 'mainstream', 'accessible'],
      'nyla-lore': ['lore', 'story', 'background', 'history', 'journey', 'mission', 'vision', 'values', 'culture', 'spiritual', 'meaning', 'purpose', 'philosophy', 'origin', 'inspiration', 'soul']
    };
    
    const featureMappings = {
      'send-tokens': ['send', 'transfer', 'sending'],
      'receive-payments': ['receive', 'payment', 'receiving'],
      'generate-qr': ['generate', 'create', 'qr'],
      'scan-qr': ['scan', 'scanning', 'camera'],
      'share-request': ['share', 'sharing', 'link'],
      'join-raids': ['raid', 'community', 'engagement'],
      'community-apps': ['apps', 'application', 'community'],
      'extension-mode': ['extension', 'browser', 'chrome'],
      'pwa-mode': ['pwa', 'progressive', 'web app'],
      'x-integration': ['x.com', 'twitter', 'post'],
      'telegram-integration': ['telegram', 'bot', 'messaging'],
      'multi-token-support': ['token', 'multiple', 'different'],
      'custom-tokens': ['custom', 'add token', 'manage'],
      'team-info': ['team', 'founder', 'developer', 'creator', 'who made', 'built by', 'dev team', 'shax_btc', 'btcberries', 'chiefz_sol', 'h2crypto_eth', 'co-founder']
    };
    
    // Collect all unique keywords
    const allKeywords = new Set();
    
    // Add concept keywords
    Object.values(conceptMappings).forEach(keywords => 
      keywords.forEach(keyword => allKeywords.add(keyword.toLowerCase()))
    );
    
    // Add feature keywords
    Object.values(featureMappings).forEach(keywords => 
      keywords.forEach(keyword => allKeywords.add(keyword.toLowerCase()))
    );
    
    console.log(`NYLA Knowledge: Total unique keywords in KB: ${allKeywords.size}`);
    return allKeywords.size;
  }

  /**
   * Get detailed knowledge breakdown based on structured KB
   */
  getKnowledgeBreakdown() {
    const totalPercentage = this.getKnowledgePercentage();
    
    if (!this.structuredKB) {
      // Legacy fallback
      return {
        percentage: totalPercentage,
        chunks: { known: 0, total: 150, percentage: totalPercentage },
        categories: { known: 0, total: 5, percentage: 0 },
        tags: { known: 0, total: 50, percentage: 0 },
        glossaryTerms: { known: 0, total: 100, percentage: 0 },
        totalExposure: this.userKnowledge.totalExposure
      };
    }
    
    return {
      percentage: totalPercentage,
      chunks: {
        known: this.userKnowledge.chunks.size,
        total: this.kbStats.totalChunks,
        percentage: Math.round((this.userKnowledge.chunks.size / this.kbStats.totalChunks) * 100 * 10) / 10
      },
      categories: {
        known: this.userKnowledge.categories.size,
        total: this.kbStats.totalCategories,
        percentage: Math.round((this.userKnowledge.categories.size / this.kbStats.totalCategories) * 100 * 10) / 10
      },
      tags: {
        known: this.userKnowledge.tags.size,
        total: this.kbStats.totalTags,
        percentage: Math.round((this.userKnowledge.tags.size / this.kbStats.totalTags) * 100 * 10) / 10
      },
      glossaryTerms: {
        known: this.userKnowledge.glossaryTerms.size,
        total: this.kbStats.totalGlossaryTerms,
        percentage: Math.round((this.userKnowledge.glossaryTerms.size / this.kbStats.totalGlossaryTerms) * 100 * 10) / 10
      },
      totalExposure: this.userKnowledge.totalExposure
    };
  }

  /**
   * Check if user should receive engagement prompt based on structured KB progress
   */
  shouldShowEngagementPrompt(isGreetingActive = false) {
    // DISABLED FOR DEVELOPMENT - Always return false to prevent work breaks
    return false;
    
    // Don't show if greeting is active
    if (isGreetingActive) return false;
    
    const breakdown = this.getKnowledgeBreakdown();
    const percentage = breakdown.percentage;
    const timeSinceLastPrompt = this.userKnowledge.lastEngagementPrompt ? 
      Date.now() - this.userKnowledge.lastEngagementPrompt : Infinity;
    
    // Don't prompt again within 10 minutes
    if (timeSinceLastPrompt < 10 * 60 * 1000) return false;
    
    // Enhanced engagement logic based on structured KB metrics
    let probability = 0;
    let engagementReason = '';
    
    // Trigger 1: Good overall progress (50%+ knowledge)
    if (percentage >= 50) {
      probability = 0.2; // 20% chance
      engagementReason = 'high_knowledge';
    }
    // Trigger 2: Moderate progress but good category coverage
    else if (percentage >= 30 && breakdown.categories.known >= 4) {
      probability = 0.15; // 15% chance
      engagementReason = 'good_breadth';
    }
    // Trigger 3: Deep learning in specific area (high tag diversity)
    else if (breakdown.tags.known >= 15) {
      probability = 0.12; // 12% chance
      engagementReason = 'deep_learning';
    }
    // Trigger 4: Consistent learning (multiple chunks from different categories)
    else if (breakdown.chunks.known >= 10 && breakdown.categories.known >= 3) {
      probability = 0.1; // 10% chance
      engagementReason = 'consistent_learning';
    }
    
    if (probability > 0 && Math.random() < probability) {
      this.userKnowledge.lastEngagementPrompt = Date.now();
      console.log(`🎯 Engagement triggered: ${engagementReason} (${percentage}% knowledge, ${breakdown.chunks.known} chunks, ${breakdown.categories.known} categories)`);
      this.saveToStorage();
      return true;
    }
    
    return false;
  }

  /**
   * Generate engagement prompt based on structured KB progress and user learning patterns
   */
  generateEngagementPrompt() {
    const breakdown = this.getKnowledgeBreakdown();
    const percentage = breakdown.percentage;
    const gaps = this.getStructuredKnowledgeGaps ? this.getStructuredKnowledgeGaps() : null;
    
    // Avoid recently used categories
    const recentCategories = this.userKnowledge.engagementHistory
      .filter(entry => Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
      .map(entry => entry.category);
    
    const availableCategories = [1, 2, 3, 4].filter(cat => !recentCategories.includes(cat));
    
    // If all categories used recently, allow all again
    const categories = availableCategories.length > 0 ? availableCategories : [1, 2, 3, 4];
    
    // Smart category selection based on user progress
    let selectedCategory;
    if (percentage >= 60 && breakdown.categories.known >= 5) {
      // High knowledge users - focus on community engagement
      selectedCategory = availableCategories.includes(2) ? 2 : categories[0]; // Community engagement
    } else if (breakdown.chunks.known >= 15 && breakdown.categories.known >= 4) {
      // Experienced users - encourage sharing knowledge
      selectedCategory = availableCategories.includes(1) ? 1 : categories[0]; // Feedback
    } else if (breakdown.tags.known >= 10) {
      // Learning users - encourage practical application
      selectedCategory = availableCategories.includes(3) ? 3 : categories[0]; // Transfer encouragement
    } else {
      // Default random selection
      selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    }
    
    console.log(`🎯 Smart engagement: Selected category ${selectedCategory} based on progress:`);
    console.log(`   Knowledge: ${percentage}%, Chunks: ${breakdown.chunks.known}, Categories: ${breakdown.categories.known}, Tags: ${breakdown.tags.known}`);
    console.log(`   Recent categories in last 24h: [${recentCategories.join(', ')}]`);
    
    // Track this engagement attempt with enhanced metadata
    this.userKnowledge.engagementHistory.push({
      category: selectedCategory,
      timestamp: Date.now(),
      knowledgePercentage: percentage,
      chunksKnown: breakdown.chunks.known,
      categoriesKnown: breakdown.categories.known,
      tagsKnown: breakdown.tags.known,
      engagementReason: this.getEngagementReason(breakdown)
    });
    
    // Keep only last 10 engagement attempts
    if (this.userKnowledge.engagementHistory.length > 10) {
      this.userKnowledge.engagementHistory = this.userKnowledge.engagementHistory.slice(-10);
    }
    
    this.saveToStorage();
    
    return this.createEngagementPrompt(selectedCategory, percentage, breakdown, gaps);
  }
  
  /**
   * Determine engagement reason based on knowledge breakdown
   */
  getEngagementReason(breakdown) {
    if (breakdown.percentage >= 60) return 'expert_level';
    if (breakdown.categories.known >= 5) return 'broad_knowledge';
    if (breakdown.chunks.known >= 15) return 'deep_learning';
    if (breakdown.tags.known >= 10) return 'diverse_topics';
    return 'steady_progress';
  }
  
  /**
   * Get human-readable engagement trigger reason
   */
  getEngagementTriggerReason(percentage, breakdown) {
    if (percentage >= 60) return `Expert level (${percentage}% knowledge)`;
    if (breakdown.categories.known >= 5) return `Broad coverage (${breakdown.categories.known} categories)`;
    if (breakdown.chunks.known >= 15) return `Deep learning (${breakdown.chunks.known} chunks)`;
    if (breakdown.tags.known >= 10) return `Topic diversity (${breakdown.tags.known} tags)`;
    if (percentage >= 50) return `High knowledge (${percentage}%)`;
    if (percentage >= 30) return `Good progress (${percentage}%)`;
    return `Steady learning (${percentage}%)`;
  }

  /**
   * Create specific engagement prompt with structured KB context
   */
  createEngagementPrompt(category, percentage, breakdown, gaps = null) {
    const prompts = {
      1: { // Feedback Category
        messages: [
          "Hope so far my answers help! 🌟 Do you mind posting feedback about NYLAGo on your X? So that I can improve myself! 🐦",
          "You've learned quite a bit! 📚 Would you share your NYLAGo experience on X to help others discover us? 💫",
          "Loving our conversations! 😊 Feel like spreading the word about NYLAGo on your social media? ✨"
        ],
        actions: [
          { 
            text: "Yes, sure! Heading on my way to X! 🚀", 
            action: "openXFeedback",
            type: "positive"
          },
          { 
            text: "Maybe later 😊", 
            action: "continueConversation",
            type: "soft-reject"
          }
        ]
      },
      2: { // Community Engagement
        messages: [
          "Now you've learned quite a lot from me! 🎓 Do you want to check how NYLA community is vibing? 🌟",
          "You're becoming a NYLA expert! 💪 Ready to see what the community is up to? 🚀",
          "Great progress on your NYLA journey! 🎉 Want to dive into some community action? ⚡"
        ],
        actions: [
          { 
            text: "Sounds good! LFG! 🔥", 
            action: "navigateToRaids",
            type: "positive"
          },
          { 
            text: "I'll check it out later 👍", 
            action: "continueConversation",
            type: "soft-reject"
          }
        ]
      },
      3: { // Transfer Encouragement
        messages: [
          "Every NYLA transfer post is social-viral! 📈 If you haven't made one today, how about creating one? ✨",
          "Ready to put your NYLA knowledge into action? 💡 Let's create a transfer that gets the community excited! 🚀",
          "Time to go viral with NYLA! 🌟 Want to make a transfer post that showcases the ecosystem? 📱"
        ],
        actions: [
          { 
            text: "Lead me to it! 💸", 
            action: "navigateToSend",
            type: "positive"
          },
          { 
            text: "I'll do it later 😌", 
            action: "continueConversation",
            type: "soft-reject"
          }
        ]
      },
      4: { // NYLA Goes to Work
        messages: [
          "I need to engage with some community posts! 📱 Talk to you later! 👋",
          "Time for me to study some new blockchain tech! 🧠 See you in a bit! ✨",
          "Going to help other users for a while! 🤖 Catch you later! 🌟",
          "Community engagement time! 🎯 I'll be back soon! 💫"
        ],
        actions: [
          { 
            text: "Wait... I have more questions! 🙋", 
            action: "tryToStayEngaged",
            type: "retention"
          },
          { 
            text: "See you later, NYLA! 👋", 
            action: "acceptNYLABreak",
            type: "positive"
          }
        ]
      }
    };
    
    const categoryPrompt = prompts[category];
    
    // Add defensive check for invalid category
    if (!categoryPrompt) {
      console.error(`NYLA Knowledge Tracker: Invalid category ${category}. Available: ${Object.keys(prompts).join(', ')}`);
      // Fallback to category 1
      const fallbackPrompt = prompts[1];
      return {
        category: 1,
        message: fallbackPrompt.messages[0],
        actions: fallbackPrompt.actions,
        knowledgeContext: {
          percentage,
          breakdown, 
          gaps,
          trigger: this.getEngagementTriggerReason(percentage, breakdown),
          structuredProgress: {
            chunksLearned: breakdown.chunks.known,
            categoriesCovered: breakdown.categories.known,
            tagsDiversified: breakdown.tags.known,
            vocabularyBuilt: breakdown.glossaryTerms.known
          }
        }
      };
    }
    
    const randomMessage = categoryPrompt.messages[Math.floor(Math.random() * categoryPrompt.messages.length)];
    
    return {
      category,
      message: randomMessage,
      actions: categoryPrompt.actions,
      knowledgeContext: {
        percentage,
        breakdown,
        gaps,
        trigger: this.getEngagementTriggerReason(percentage, breakdown),
        structuredProgress: {
          chunksLearned: breakdown.chunks.known,
          categoriesCovered: breakdown.categories.known,
          tagsDiversified: breakdown.tags.known,
          vocabularyBuilt: breakdown.glossaryTerms.known
        }
      }
    };
  }

  /**
   * Handle NYLA "goes to work" state
   */
  startNYLAWorkBreak() {
    const breakDuration = (30 + Math.random() * 60) * 60 * 1000; // 30-90 minutes
    const breakEnd = Date.now() + breakDuration;
    
    const workStates = [
      { message: "(NYLA is not here)", emoji: "🚶‍♀️" },
      { message: "(NYLA looks busy)", emoji: "💼" },
      { message: "(NYLA is engaging community)", emoji: "🌟" },
      { message: "(NYLA is studying blockchain)", emoji: "📚" },
      { message: "(NYLA is helping other users)", emoji: "🤖" }
    ];
    
    const workState = workStates[Math.floor(Math.random() * workStates.length)];
    
    localStorage.setItem('nyla_work_break', JSON.stringify({
      active: true,
      startTime: Date.now(),
      endTime: breakEnd,
      state: workState
    }));
    
    return {
      isWorking: true,
      message: workState.message,
      emoji: workState.emoji,
      endTime: breakEnd,
      remainingMinutes: Math.round(breakDuration / (60 * 1000))
    };
  }

  /**
   * Check if NYLA is on work break
   */
  checkNYLAWorkStatus() {
    // DISABLED FOR DEVELOPMENT - Clear any existing work breaks and always return not working
    localStorage.removeItem('nyla_work_break');
    return { isWorking: false };
    
    const workBreak = localStorage.getItem('nyla_work_break');
    if (!workBreak) return { isWorking: false };
    
    const breakData = JSON.parse(workBreak);
    
    if (Date.now() >= breakData.endTime) {
      // Work break is over
      localStorage.removeItem('nyla_work_break');
      return { 
        isWorking: false, 
        justReturned: true,
        returnMessage: "I'm back! 🎉 Thanks for waiting! Ready to continue our conversation? ✨"
      };
    }
    
    return {
      isWorking: true,
      message: breakData.state.message,
      emoji: breakData.state.emoji,
      remainingMinutes: Math.round((breakData.endTime - Date.now()) / (60 * 1000))
    };
  }

  /**
   * Start auto-save timer
   */
  startAutoSave() {
    // Clear existing interval if any
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    // Save every 30 seconds if there are changes
    this.autoSaveInterval = setInterval(() => {
      if (this.hasUnsavedChanges) {
        console.log('NYLA Knowledge: Auto-saving progress...');
        this.saveToStorage();
      }
    }, 30000);
  }
  
  /**
   * Save knowledge state to localStorage with structured KB format
   */
  saveToStorage() {
    try {
      const data = {
        // New structured KB format (v3)
        chunks: [...(this.userKnowledge.chunks || [])],
        categories: [...(this.userKnowledge.categories || [])],
        tags: [...(this.userKnowledge.tags || [])],
        glossaryTerms: [...(this.userKnowledge.glossaryTerms || [])],
        
        // Legacy format for backward compatibility
        topics: [...(this.userKnowledge.topics || [])],
        concepts: [...(this.userKnowledge.concepts || [])],
        features: [...(this.userKnowledge.features || [])],
        mappedKeywords: [...(this.userKnowledge.mappedKeywords || [])],
        
        // Common fields
        totalExposure: this.userKnowledge.totalExposure,
        lastEngagementPrompt: this.userKnowledge.lastEngagementPrompt,
        engagementHistory: this.userKnowledge.engagementHistory,
        lastKnowledgeUpdate: this.userKnowledge.lastKnowledgeUpdate,
        version: 3, // Updated version for structured KB
        savedAt: Date.now()
      };
      
      // Primary save
      localStorage.setItem('nyla_knowledge_tracker', JSON.stringify(data));
      
      // Create backup with timestamp
      const backupKey = `nyla_knowledge_backup_${new Date().toISOString().split('T')[0]}`;
      localStorage.setItem(backupKey, JSON.stringify(data));
      
      // Session storage backup (survives refresh but not browser close)
      sessionStorage.setItem('nyla_knowledge_session', JSON.stringify(data));
      
      // Clean old backups
      this.cleanOldBackups();
      
      this.hasUnsavedChanges = false;
      const percentage = this.getKnowledgePercentage();
      const chunkCount = this.userKnowledge.chunks ? this.userKnowledge.chunks.size : 0;
      console.log(`NYLA Knowledge: Saved ${percentage}% progress (${chunkCount} chunks learned)`);
    } catch (error) {
      console.error('NYLA Knowledge Tracker: Failed to save to storage', error);
      
      // Try session storage as fallback
      try {
        const data = {
          topics: [...this.userKnowledge.topics],
          concepts: [...this.userKnowledge.concepts],
          features: [...this.userKnowledge.features],
          mappedKeywords: [...this.userKnowledge.mappedKeywords],
          savedAt: Date.now()
        };
        sessionStorage.setItem('nyla_knowledge_emergency', JSON.stringify(data));
        console.warn('NYLA Knowledge: Emergency save to session storage');
      } catch (e) {
        console.error('NYLA Knowledge: All storage methods failed');
      }
    }
  }

  /**
   * Clean old backup entries
   */
  cleanOldBackups() {
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter(k => k.startsWith('nyla_knowledge_backup_'));
      
      // Sort by date (newest first)
      backupKeys.sort().reverse();
      
      // Keep only last 7 backups
      if (backupKeys.length > 7) {
        for (let i = 7; i < backupKeys.length; i++) {
          localStorage.removeItem(backupKeys[i]);
          console.log(`Removed old backup: ${backupKeys[i]}`);
        }
      }
    } catch (error) {
      console.error('Failed to clean old backups:', error);
    }
  }
  
  /**
   * Load knowledge state from localStorage
   */
  loadFromStorage() {
    try {
      let data = null;
      let source = '';
      
      // Try primary storage first
      const stored = localStorage.getItem('nyla_knowledge_tracker');
      if (stored) {
        try {
          data = JSON.parse(stored);
          source = 'primary';
        } catch (e) {
          console.warn('Primary storage corrupted, trying alternatives...');
        }
      }
      
      // Try session storage
      if (!data) {
        const session = sessionStorage.getItem('nyla_knowledge_session');
        if (session) {
          try {
            data = JSON.parse(session);
            source = 'session';
            console.log('Recovered from session storage');
          } catch (e) {
            console.warn('Session storage corrupted');
          }
        }
      }
      
      // Try emergency session storage
      if (!data) {
        const emergency = sessionStorage.getItem('nyla_knowledge_emergency');
        if (emergency) {
          try {
            data = JSON.parse(emergency);
            source = 'emergency';
            console.log('Recovered from emergency storage');
          } catch (e) {
            console.warn('Emergency storage corrupted');
          }
        }
      }
      
      // Try backups
      if (!data) {
        const keys = Object.keys(localStorage);
        const backupKeys = keys.filter(k => k.startsWith('nyla_knowledge_backup_')).sort().reverse();
        
        for (const backupKey of backupKeys) {
          try {
            const backup = localStorage.getItem(backupKey);
            if (backup) {
              data = JSON.parse(backup);
              source = `backup (${backupKey})`;
              console.log(`Recovered from ${source}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      // Load the data with version compatibility
      if (data) {
        // Load structured KB format (v3) if available
        if (data.version >= 3) {
          this.userKnowledge.chunks = new Set(data.chunks || []);
          this.userKnowledge.categories = new Set(data.categories || []);
          this.userKnowledge.tags = new Set(data.tags || []);
          this.userKnowledge.glossaryTerms = new Set(data.glossaryTerms || []);
        } else {
          // Initialize empty sets for new format
          this.userKnowledge.chunks = new Set();
          this.userKnowledge.categories = new Set();
          this.userKnowledge.tags = new Set();
          this.userKnowledge.glossaryTerms = new Set();
        }
        
        // Load legacy format for backward compatibility
        this.userKnowledge.topics = new Set(data.topics || []);
        this.userKnowledge.concepts = new Set(data.concepts || []);
        this.userKnowledge.features = new Set(data.features || []);
        this.userKnowledge.mappedKeywords = new Set(data.mappedKeywords || []);
        
        // Common fields
        this.userKnowledge.totalExposure = data.totalExposure || 0;
        this.userKnowledge.lastEngagementPrompt = data.lastEngagementPrompt || null;
        this.userKnowledge.engagementHistory = data.engagementHistory || [];
        this.userKnowledge.lastKnowledgeUpdate = data.lastKnowledgeUpdate || Date.now();
        
        const percentage = this.getKnowledgePercentage();
        console.log(`NYLA Knowledge: Loaded ${percentage}% progress from ${source}`);
        console.log(`Keywords: ${this.userKnowledge.mappedKeywords.size}/${this.totalKeywords}`);
        
        // Check data age
        if (data.savedAt) {
          const hoursSinceSave = (Date.now() - data.savedAt) / (1000 * 60 * 60);
          if (hoursSinceSave > 24) {
            console.warn(`NYLA Knowledge: Data is ${Math.floor(hoursSinceSave)} hours old`);
          }
        }
      } else {
        console.log('NYLA Knowledge: Starting fresh (no saved data found)');
      }
    } catch (error) {
      console.error('NYLA Knowledge Tracker: Failed to load from storage', error);
    }
  }

  /**
   * Get structured knowledge gaps for targeted learning
   */
  getStructuredKnowledgeGaps() {
    const breakdown = this.getKnowledgeBreakdown();
    const userKnowledge = this.userKnowledge;
    
    console.log(`📊 Structured Knowledge Gap Analysis: ${breakdown.percentage}% overall coverage`);
    
    return {
      categories: {
        missing: ['about', 'facts', 'howto', 'faq', 'glossary', 'troubleshooting', 'marketing', 'ecosystem']
          .filter(cat => !(userKnowledge.categories || new Set()).has(cat)),
        coverage: breakdown.categories.percentage
      },
      tags: {
        missing: ['transfer', 'blockchain', 'solana', 'ethereum', 'algorand', 'qr', 'team', 'security']
          .filter(tag => !(userKnowledge.tags || new Set()).has(tag)),
        coverage: breakdown.tags.percentage
      },
      glossaryTerms: {
        missing: ['blockchain', 'smart contract', 'gas fee', 'defi', 'web3']
          .filter(term => !(userKnowledge.glossaryTerms || new Set()).has(term)),
        coverage: breakdown.glossaryTerms.percentage
      },
      chunks: {
        learned: breakdown.chunks.known,
        total: breakdown.chunks.total,
        coverage: breakdown.chunks.percentage
      }
    };
  }
  
  /**
   * Generate knowledge gap questions based on structured KB coverage
   */
  generateKnowledgeGapQuestions() {
    const currentPercentage = this.getKnowledgePercentage();
    const breakdown = this.getKnowledgeBreakdown();
    
    console.log(`🎯 Generating knowledge gaps from structured KB coverage: ${currentPercentage}%`);
    
    const gapQuestions = [];
    
    // Gap 1: Missing categories - identify unexplored KB sections
    const availableCategories = ['about', 'facts', 'howto', 'faq', 'glossary', 'troubleshooting', 'marketing', 'ecosystem'];
    const userCategories = this.userKnowledge.categories || new Set();
    const missingCategories = availableCategories.filter(cat => !userCategories.has(cat));
    
    const categoryQuestions = {
      'about': "Who are the people behind NYLA and what's the team structure?",
      'facts': "What are the technical contract addresses and network specifications?", 
      'howto': "How do I perform specific tasks like creating QR codes or joining raids?",
      'faq': "What are the most common questions and answers about NYLA?",
      'glossary': "What do key cryptocurrency and blockchain terms mean?",
      'troubleshooting': "How do I solve common issues with transfers and connections?",
      'marketing': "What's NYLA's brand identity and visual elements?",
      'ecosystem': "What partnerships and integrations does NYLA have?"
    };
    
    // Add category gap questions (prioritize important categories)
    const priorityCategories = ['about', 'howto', 'facts', 'ecosystem'];
    const categoryGaps = missingCategories.filter(cat => priorityCategories.includes(cat));
    
    for (const category of categoryGaps.slice(0, 2)) { // Max 2 category questions
      gapQuestions.push({
        text: categoryQuestions[category],
        targetCategory: category,
        source: 'category-gap',
        priority: priorityCategories.includes(category) ? 'high' : 'normal'
      });
    }
    
    // Gap 2: Missing important tags - identify unexplored topics
    const importantTags = [
      'transfer', 'send', 'receive', 'blockchain', 'solana', 'ethereum', 'algorand',
      'qr', 'team', 'founder', 'community', 'raid', 'smart contract', 'wallet',
      'security', 'fees', 'troubleshoot', 'integration', 'partnership'
    ];
    
    const userTags = this.userKnowledge.tags || new Set();
    const missingTags = importantTags.filter(tag => !userTags.has(tag));
    
    const tagQuestions = {
      'algorand': "What are the benefits of using Algorand blockchain with NYLA?",
      'ethereum': "How does NYLA work on the Ethereum network?",
      'solana': "What makes Solana special for NYLA transfers?",
      'smart contract': "How do NYLA's smart contracts ensure security?",
      'security': "What security measures does NYLA implement?",
      'fees': "How do transaction fees work across different networks?",
      'integration': "What external services and wallets integrate with NYLA?",
      'partnership': "What strategic partnerships does NYLA have?",
      'troubleshoot': "How do I resolve common transfer issues?",
      'raid': "How do community raids work and how can I participate?",
      'founder': "Who founded NYLA and what's their background?",
      'wallet': "Which wallets are supported and recommended?"
    };
    
    // Add tag gap questions (prioritize based on importance and user progress)
    const tagGaps = missingTags.slice(0, 3); // Max 3 tag questions
    for (const tag of tagGaps) {
      if (tagQuestions[tag]) {
        gapQuestions.push({
          text: tagQuestions[tag],
          targetTag: tag,
          source: 'tag-gap',
          priority: ['security', 'fees', 'integration'].includes(tag) ? 'high' : 'normal'
        });
      }
    }
    
    // Gap 3: Glossary terms - identify missing technical vocabulary
    const coreGlossaryTerms = [
      'blockchain', 'cryptocurrency', 'smart contract', 'wallet', 'private key',
      'gas fee', 'decentralized', 'web3', 'defi', 'consensus', 'stablecoin'
    ];
    
    const userGlossaryTerms = this.userKnowledge.glossaryTerms || new Set();
    const missingGlossaryTerms = coreGlossaryTerms.filter(term => !userGlossaryTerms.has(term));
    
    const glossaryQuestions = {
      'blockchain': "What is a blockchain and how does it work?",
      'smart contract': "What are smart contracts and how do they execute automatically?",
      'gas fee': "What are gas fees and how do they affect my transactions?",
      'defi': "What is DeFi and how does NYLA connect to decentralized finance?",
      'web3': "What is Web3 and how is NYLA part of this movement?",
      'consensus': "How do blockchain consensus mechanisms work?",
      'stablecoin': "What are stablecoins and why are they useful for transfers?"
    };
    
    // Add glossary gap questions (max 2)
    const glossaryGaps = missingGlossaryTerms.slice(0, 2);
    for (const term of glossaryGaps) {
      if (glossaryQuestions[term]) {
        gapQuestions.push({
          text: glossaryQuestions[term],
          targetGlossaryTerm: term,
          source: 'glossary-gap',
          priority: ['blockchain', 'smart contract', 'gas fee'].includes(term) ? 'high' : 'normal'
        });
      }
    }
    
    console.log(`🎯 Generated ${gapQuestions.length} structured KB gap questions:`);
    console.log(`   Category gaps: ${categoryGaps.length}, Tag gaps: ${tagGaps.length}, Glossary gaps: ${glossaryGaps.length}`);
    
    return gapQuestions;
  }

  /**
   * Reset knowledge tracking (for debugging)
   */
  resetTracking() {
    this.userKnowledge = {
      topics: new Set(),
      concepts: new Set(),
      features: new Set(),
      totalExposure: 0,
      lastEngagementPrompt: null,
      engagementHistory: []
    };
    
    localStorage.removeItem('nyla_knowledge_tracker');
    localStorage.removeItem('nyla_work_break');
    console.log('NYLA Knowledge Tracker: Reset complete');
  }

  /**
   * Debug: Simulate knowledge levels
   */
  dev_simulateKnowledge(percentage) {
    const targetItems = Math.round((percentage / 100) * this.totalKnowledgeItems);
    
    // Add topics first
    const topicsToAdd = Math.min(targetItems / 3, this.knowledgeUniverse.topics.length);
    for (let i = 0; i < topicsToAdd; i++) {
      this.userKnowledge.topics.add(this.knowledgeUniverse.topics[i]);
    }
    
    // Add concepts
    const conceptsToAdd = Math.min(targetItems / 3, this.knowledgeUniverse.concepts.length);
    for (let i = 0; i < conceptsToAdd; i++) {
      this.userKnowledge.concepts.add(this.knowledgeUniverse.concepts[i]);
    }
    
    // Add features
    const featuresToAdd = Math.min(targetItems / 3, this.knowledgeUniverse.features.length);
    for (let i = 0; i < featuresToAdd; i++) {
      this.userKnowledge.features.add(this.knowledgeUniverse.features[i]);
    }
    
    this.userKnowledge.totalExposure = targetItems;
    this.saveToStorage();
    
    console.log(`NYLA Knowledge Tracker: Simulated ${this.getKnowledgePercentage()}% knowledge`);
  }
  
  /**
   * Export knowledge data for debugging
   */
  exportKnowledgeData() {
    const data = {
      topics: [...this.userKnowledge.topics],
      concepts: [...this.userKnowledge.concepts],
      features: [...this.userKnowledge.features],
      mappedKeywords: [...this.userKnowledge.mappedKeywords],
      totalExposure: this.userKnowledge.totalExposure,
      percentage: this.getKnowledgePercentage(),
      lastUpdate: new Date(this.userKnowledge.lastKnowledgeUpdate).toISOString(),
      savedAt: new Date().toISOString()
    };
    
    // Create downloadable file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nyla-knowledge-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('Knowledge data exported:', data);
    return data;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAKnowledgeTracker;
}

// Make globally available
window.NYLAKnowledgeTracker = NYLAKnowledgeTracker;