/**
 * NYLA Knowledge Tracker - Monitors user knowledge acquisition and engagement
 * Tracks what percentage of NYLA knowledge the user has learned
 */

class NYLAKnowledgeTracker {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
    this.userKnowledge = {
      topics: new Set(),
      concepts: new Set(),
      features: new Set(),
      mappedKeywords: new Set(), // Track unique mapped keywords
      totalExposure: 0,
      lastEngagementPrompt: null,
      engagementHistory: [],
      lastKnowledgeUpdate: Date.now()
    };
    
    // Calculate total available keywords from mappings
    this.totalKeywords = this.calculateTotalKeywords();
    
    // Define the complete NYLA knowledge universe
    this.knowledgeUniverse = {
      topics: [
        'what-is-nyla', 'nyla-token', 'transfers', 'qr-codes', 'blockchains',
        'solana', 'ethereum', 'algorand', 'community', 'raids', 'apps',
        'security', 'fees', 'wallet-integration', 'social-features',
        'team', 'contract-address', 'buy-links', 'site-stats'
      ],
      concepts: [
        'crypto-transfers', 'multi-blockchain', 'payment-requests', 'qr-generation',
        'community-building', 'social-viral', 'token-economics', 'defi-integration',
        'user-experience', 'mobile-first', 'web3-adoption', 'cross-chain'
      ],
      features: [
        'send-tokens', 'receive-payments', 'generate-qr', 'scan-qr', 'share-request',
        'join-raids', 'community-apps', 'extension-mode', 'pwa-mode', 'x-integration',
        'telegram-integration', 'multi-token-support', 'custom-tokens'
      ]
    };
    
    this.totalKnowledgeItems = 
      this.knowledgeUniverse.topics.length + 
      this.knowledgeUniverse.concepts.length + 
      this.knowledgeUniverse.features.length;
      
    this.loadFromStorage();
  }

  /**
   * Track knowledge exposure from a conversation
   */
  trackKnowledgeFromConversation(questionId, questionText, topic, answer) {
    // Store current mapped keywords count to detect new mappings
    const previousMappedKeywords = this.userKnowledge.mappedKeywords.size;
    
    // Track topic exposure
    if (topic) {
      this.userKnowledge.topics.add(topic);
    }
    
    // Analyze question and answer for concepts
    this.analyzeAndTrackConcepts(questionText, answer);
    
    // Track feature mentions
    this.trackFeatureMentions(questionText, answer);
    
    // Check if new keywords were mapped
    const currentMappedKeywords = this.userKnowledge.mappedKeywords.size;
    if (currentMappedKeywords > previousMappedKeywords) {
      const newKeywords = currentMappedKeywords - previousMappedKeywords;
      const percentage = this.getKnowledgePercentage();
      console.log(`NYLA Knowledge: ${newKeywords} new keyword(s) mapped (${previousMappedKeywords} → ${currentMappedKeywords})`);
      console.log(`NYLA Knowledge: Current percentage: ${percentage.toFixed(2)}% (${currentMappedKeywords}/${this.totalKeywords} keywords)`);
      this.userKnowledge.lastKnowledgeUpdate = Date.now();
      this.saveToStorage();
    }
    
    // Increment total exposure
    this.userKnowledge.totalExposure++;
  }

  /**
   * Analyze text for NYLA concepts
   */
  analyzeAndTrackConcepts(questionText, answer) {
    const textToAnalyze = (questionText + ' ' + (typeof answer === 'string' ? answer : answer.text)).toLowerCase();
    
    // Check for concept keywords
    const conceptMappings = {
      'crypto-transfers': ['transfer', 'send', 'payment', 'transaction'],
      'blockchain-networks': ['blockchain', 'solana', 'ethereum', 'algorand', 'network', 'networks', 'infrastructure'],
      'network-isolation': ['same-chain', 'within', 'independent', 'separate', 'isolated', 'no-bridging'],
      'payment-requests': ['request', 'receive', 'payment', 'invoice'],
      'qr-generation': ['qr', 'code', 'scan', 'generate'],
      'community-building': ['community', 'together', 'ecosystem', 'social'],
      'social-viral': ['viral', 'share', 'post', 'social', 'x.com', 'twitter'],
      'token-economics': ['token', 'nyla', 'economics', 'value', 'utility'],
      'defi-integration': ['defi', 'decentralized', 'finance', 'protocol'],
      'user-experience': ['easy', 'simple', 'user', 'experience', 'interface'],
      'mobile-first': ['mobile', 'phone', 'app', 'pwa', 'responsive'],
      'web3-adoption': ['web3', 'adoption', 'mainstream', 'accessible'],
      'cross-chain': ['cross-chain', 'bridge', 'bridging', 'interoperability', 'cross-blockchain', 'chain-to-chain']
    };
    
    for (const [concept, keywords] of Object.entries(conceptMappings)) {
      const matchedKeywords = keywords.filter(keyword => textToAnalyze.includes(keyword));
      if (matchedKeywords.length > 0) {
        this.userKnowledge.concepts.add(concept);
        // Track each matched keyword
        matchedKeywords.forEach(keyword => this.userKnowledge.mappedKeywords.add(keyword));
      }
    }
  }

  /**
   * Track feature mentions
   */
  trackFeatureMentions(questionText, answer) {
    const textToAnalyze = (questionText + ' ' + (typeof answer === 'string' ? answer : answer.text)).toLowerCase();
    
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
      'team-info': ['team', 'founder', 'developer', 'creator', 'who made', 'built by', 'dev team']
    };
    
    for (const [feature, keywords] of Object.entries(featureMappings)) {
      const matchedKeywords = keywords.filter(keyword => textToAnalyze.includes(keyword));
      if (matchedKeywords.length > 0) {
        this.userKnowledge.features.add(feature);
        // Track each matched keyword
        matchedKeywords.forEach(keyword => this.userKnowledge.mappedKeywords.add(keyword));
      }
    }
  }

  /**
   * Calculate knowledge percentage based on mapped keywords
   */
  getKnowledgePercentage() {
    const mappedCount = this.userKnowledge.mappedKeywords.size;
    const percentage = (mappedCount / this.totalKeywords) * 100;
    // Return percentage with 2 decimal places, capped at 100%
    return Math.min(Math.round(percentage * 100) / 100, 100);
  }

  /**
   * Calculate total available keywords from all mappings
   */
  calculateTotalKeywords() {
    const conceptMappings = {
      'crypto-transfers': ['transfer', 'send', 'payment', 'transaction'],
      'blockchain-networks': ['blockchain', 'solana', 'ethereum', 'algorand', 'network', 'networks', 'infrastructure'],
      'network-isolation': ['same-chain', 'within', 'independent', 'separate', 'isolated', 'no-bridging'],
      'payment-requests': ['request', 'receive', 'payment', 'invoice'],
      'qr-generation': ['qr', 'code', 'scan', 'generate'],
      'community-building': ['community', 'together', 'ecosystem', 'social'],
      'social-viral': ['viral', 'share', 'post', 'social', 'x.com', 'twitter'],
      'token-economics': ['token', 'nyla', 'economics', 'value', 'utility'],
      'defi-integration': ['defi', 'decentralized', 'finance', 'protocol'],
      'user-experience': ['easy', 'simple', 'user', 'experience', 'interface'],
      'mobile-first': ['mobile', 'phone', 'app', 'pwa', 'responsive'],
      'web3-adoption': ['web3', 'adoption', 'mainstream', 'accessible'],
      'cross-chain': ['cross-chain', 'bridge', 'bridging', 'interoperability', 'cross-blockchain', 'chain-to-chain']
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
      'team-info': ['team', 'founder', 'developer', 'creator', 'who made', 'built by', 'dev team']
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
   * Get detailed knowledge breakdown
   */
  getKnowledgeBreakdown() {
    const totalPercentage = this.getKnowledgePercentage();
    
    // Distribute the total percentage across categories proportionally
    const totalItems = this.userKnowledge.topics.size + this.userKnowledge.concepts.size + this.userKnowledge.features.size;
    
    return {
      percentage: totalPercentage,
      topics: {
        known: this.userKnowledge.topics.size,
        total: this.knowledgeUniverse.topics.length,
        percentage: totalItems > 0 ? Math.round((this.userKnowledge.topics.size / totalItems) * totalPercentage * 10) / 10 : 0
      },
      concepts: {
        known: this.userKnowledge.concepts.size,
        total: this.knowledgeUniverse.concepts.length,
        percentage: totalItems > 0 ? Math.round((this.userKnowledge.concepts.size / totalItems) * totalPercentage * 10) / 10 : 0
      },
      features: {
        known: this.userKnowledge.features.size,
        total: this.knowledgeUniverse.features.length,
        percentage: totalItems > 0 ? Math.round((this.userKnowledge.features.size / totalItems) * totalPercentage * 10) / 10 : 0
      },
      totalExposure: this.userKnowledge.totalExposure
    };
  }

  /**
   * Check if user should receive engagement prompt
   */
  shouldShowEngagementPrompt(isGreetingActive = false) {
    // Don't show if greeting is active
    if (isGreetingActive) return false;
    
    const percentage = this.getKnowledgePercentage();
    const timeSinceLastPrompt = this.userKnowledge.lastEngagementPrompt ? 
      Date.now() - this.userKnowledge.lastEngagementPrompt : Infinity;
    
    // Don't prompt again within 10 minutes
    if (timeSinceLastPrompt < 10 * 60 * 1000) return false;
    
    let probability = 0;
    
    if (percentage >= 66) {
      probability = 0.5; // 50% for 66%+ knowledge
    } else if (percentage >= 33) {
      probability = 0.33; // 33% for 33-65% knowledge
    }
    
    if (probability > 0 && Math.random() < probability) {
      this.userKnowledge.lastEngagementPrompt = Date.now();
      this.saveToStorage();
      return true;
    }
    
    return false;
  }

  /**
   * Generate engagement prompt based on user knowledge and history
   */
  generateEngagementPrompt() {
    const percentage = this.getKnowledgePercentage();
    const breakdown = this.getKnowledgeBreakdown();
    
    // Avoid recently used categories
    const recentCategories = this.userKnowledge.engagementHistory
      .filter(entry => Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
      .map(entry => entry.category);
    
    const availableCategories = [1, 2, 3, 4].filter(cat => !recentCategories.includes(cat));
    
    // If all categories used recently, allow all again
    const categories = availableCategories.length > 0 ? availableCategories : [1, 2, 3, 4];
    
    const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    
    console.log(`NYLA Knowledge Tracker: Selected category ${selectedCategory} from available [${categories.join(', ')}]`);
    console.log(`NYLA Knowledge Tracker: Recent categories in last 24h: [${recentCategories.join(', ')}]`);
    
    // Track this engagement attempt
    this.userKnowledge.engagementHistory.push({
      category: selectedCategory,
      timestamp: Date.now(),
      knowledgePercentage: percentage
    });
    
    // Keep only last 10 engagement attempts
    if (this.userKnowledge.engagementHistory.length > 10) {
      this.userKnowledge.engagementHistory = this.userKnowledge.engagementHistory.slice(-10);
    }
    
    this.saveToStorage();
    
    return this.createEngagementPrompt(selectedCategory, percentage, breakdown);
  }

  /**
   * Create specific engagement prompt
   */
  createEngagementPrompt(category, percentage, breakdown) {
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
          trigger: percentage >= 66 ? '66%+ knowledge' : '33%+ knowledge'
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
        trigger: percentage >= 66 ? '66%+ knowledge' : '33%+ knowledge'
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
   * Save knowledge state to localStorage
   */
  saveToStorage() {
    try {
      const data = {
        topics: [...this.userKnowledge.topics],
        concepts: [...this.userKnowledge.concepts],
        features: [...this.userKnowledge.features],
        mappedKeywords: [...this.userKnowledge.mappedKeywords],
        totalExposure: this.userKnowledge.totalExposure,
        lastEngagementPrompt: this.userKnowledge.lastEngagementPrompt,
        engagementHistory: this.userKnowledge.engagementHistory,
        lastKnowledgeUpdate: this.userKnowledge.lastKnowledgeUpdate
      };
      
      localStorage.setItem('nyla_knowledge_tracker', JSON.stringify(data));
    } catch (error) {
      console.error('NYLA Knowledge Tracker: Failed to save to storage', error);
    }
  }

  /**
   * Load knowledge state from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('nyla_knowledge_tracker');
      if (stored) {
        const data = JSON.parse(stored);
        this.userKnowledge.topics = new Set(data.topics || []);
        this.userKnowledge.concepts = new Set(data.concepts || []);
        this.userKnowledge.features = new Set(data.features || []);
        this.userKnowledge.mappedKeywords = new Set(data.mappedKeywords || []);
        this.userKnowledge.totalExposure = data.totalExposure || 0;
        this.userKnowledge.lastEngagementPrompt = data.lastEngagementPrompt || null;
        this.userKnowledge.engagementHistory = data.engagementHistory || [];
        this.userKnowledge.lastKnowledgeUpdate = data.lastKnowledgeUpdate || Date.now();
      }
    } catch (error) {
      console.error('NYLA Knowledge Tracker: Failed to load from storage', error);
    }
  }

  /**
   * Get keywords that haven't been mapped by user yet
   */
  getUnmappedKeywords() {
    const allKeywords = new Set();
    
    // Add all concept keywords
    const conceptMappings = {
      'crypto-transfers': ['transfer', 'send', 'payment', 'transaction'],
      'blockchain-networks': ['blockchain', 'solana', 'ethereum', 'algorand', 'network', 'networks', 'infrastructure'],
      'network-isolation': ['same-chain', 'within', 'independent', 'separate', 'isolated', 'no-bridging'],
      'payment-requests': ['request', 'receive', 'payment', 'invoice'],
      'qr-generation': ['qr', 'code', 'scan', 'generate'],
      'community-building': ['community', 'together', 'ecosystem', 'social'],
      'social-viral': ['viral', 'share', 'post', 'social', 'x.com', 'twitter'],
      'token-economics': ['token', 'nyla', 'economics', 'value', 'utility'],
      'defi-integration': ['defi', 'decentralized', 'finance', 'protocol'],
      'user-experience': ['easy', 'simple', 'user', 'experience', 'interface'],
      'mobile-first': ['mobile', 'phone', 'app', 'pwa', 'responsive'],
      'web3-adoption': ['web3', 'adoption', 'mainstream', 'accessible'],
      'cross-chain': ['cross-chain', 'bridge', 'bridging', 'interoperability', 'cross-blockchain', 'chain-to-chain']
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
      'team-info': ['team', 'founder', 'developer', 'creator', 'who made', 'built by', 'dev team']
    };
    
    // Collect all unique keywords
    Object.values(conceptMappings).forEach(keywords => 
      keywords.forEach(keyword => allKeywords.add(keyword.toLowerCase()))
    );
    Object.values(featureMappings).forEach(keywords => 
      keywords.forEach(keyword => allKeywords.add(keyword.toLowerCase()))
    );
    
    // Find unmapped keywords
    const unmappedKeywords = [];
    for (const keyword of allKeywords) {
      if (!this.userKnowledge.mappedKeywords.has(keyword)) {
        unmappedKeywords.push(keyword);
      }
    }
    
    console.log(`📊 Knowledge Gap Analysis: ${unmappedKeywords.length} unmapped out of ${allKeywords.size} total keywords`);
    return unmappedKeywords;
  }
  
  /**
   * Generate follow-up questions targeting unmapped keywords
   */
  generateKnowledgeGapQuestions() {
    const unmappedKeywords = this.getUnmappedKeywords();
    const currentPercentage = this.getKnowledgePercentage();
    
    // Keyword to question mapping for targeted discovery
    const keywordToQuestions = {
      // Blockchain diversity
      'algorand': "What are the benefits of using Algorand blockchain?",
      'multi-chain': "How does multi-chain functionality work?",
      'bridge': "What cross-chain bridging features are available?",
      'interoperability': "How does NYLA handle blockchain interoperability?",
      
      // Advanced features  
      'invoice': "Can I create invoice-style payment requests?",
      'defi': "How does NYLAGo integrate with DeFi protocols?",
      'protocol': "What cryptocurrency protocols does NYLA support?",
      'decentralized': "How does the decentralized system work?",
      
      // Platform features
      'chrome': "What unique features does the Chrome extension have?",
      'telegram': "Are there Telegram integration features?",
      'bot': "How does the Telegram bot functionality work?",
      'pwa': "What are the Progressive Web App features?",
      'responsive': "How does NYLAGo work on different screen sizes?",
      
      // Token economics
      'economics': "How does NYLA token economics work?",
      'utility': "What utility does the NYLA token provide?",
      'value': "What gives NYLA token its value?",
      
      // Social/Community
      'viral': "How do viral sharing features work?",
      'ecosystem': "What's the NYLA ecosystem like?",
      'together': "How does NYLA bring the community together?",
      'mainstream': "How is NYLA making crypto more mainstream?",
      'accessible': "What makes NYLAGo accessible to new users?",
      
      // Technical
      'camera': "How does the camera scanning feature work?",
      'interface': "What makes the user interface special?",
      'manage': "How do I manage custom tokens?",
      'custom': "Can I add custom tokens to NYLAGo?",
      
      // Team and Development
      'team': "Who is behind the NYLA project?",
      'founder': "Who founded NYLA?",
      'developer': "Who are the developers of NYLAGo?",
      'creator': "Who created NYLA?",
      'built': "Who built NYLAGo?"
    };
    
    const targetedQuestions = [];
    
    // Prioritize unmapped keywords by importance
    const priorityKeywords = unmappedKeywords.filter(keyword => 
      ['algorand', 'defi', 'telegram', 'pwa', 'economics', 'mainstream', 'bridge', 'custom', 'team', 'founder', 'developer', 'creator', 'built'].includes(keyword)
    );
    
    const keywordsToTarget = priorityKeywords.length > 0 ? priorityKeywords : unmappedKeywords.slice(0, 8);
    
    for (const keyword of keywordsToTarget) {
      if (keywordToQuestions[keyword]) {
        targetedQuestions.push({
          text: keywordToQuestions[keyword],
          targetKeyword: keyword,
          source: 'knowledge-gap',
          priority: priorityKeywords.includes(keyword) ? 'high' : 'normal'
        });
      }
    }
    
    console.log(`🎯 Generated ${targetedQuestions.length} knowledge-gap questions for keywords:`, keywordsToTarget);
    return targetedQuestions;
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAKnowledgeTracker;
}

// Make globally available
window.NYLAKnowledgeTracker = NYLAKnowledgeTracker;