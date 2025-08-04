/**
 * NYLA AI Conversation Manager
 * Manages conversation flow, question generation, and user interactions
 */

class NYLAConversationManager {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
    this.conversationHistory = [];
    this.askedQuestions = new Set();
    this.userProfile = {
      interests: {},
      preferredTopics: [],
      conversationStyle: 'friendly',
      totalInteractions: 0
    };
    
    this.currentContext = 'welcome';
    this.loadFromStorage();
  }

  /**
   * Initialize conversation system
   */
  async initialize() {
    try {
      this.loadFromStorage();
      console.log('NYLA Conversation: Initialized');
      return true;
    } catch (error) {
      console.error('NYLA Conversation: Initialization failed', error);
      return false;
    }
  }

  /**
   * Generate initial welcome questions
   */
  generateWelcomeQuestions() {
    const welcomeQuestions = [
      {
        id: 'what-is-nyla',
        text: '🤖 What is NYLA?',
        topic: 'about',
        priority: 1
      },
      {
        id: 'how-to-transfer',
        text: '💸 How do I send tokens?',
        topic: 'transfers',
        priority: 1
      },
      {
        id: 'supported-chains',
        text: '⛓️ What blockchains work?',
        topic: 'features',
        priority: 1
      }
    ];

    return this.personalizeQuestions(welcomeQuestions);
  }

  /**
   * Generate contextual follow-up questions
   */
  generateFollowUpQuestions(previousAnswer, topic) {
    const followUpMap = {
      'about': [
        { id: 'nyla-features', text: '✨ What features does NYLA have?', topic: 'features' },
        { id: 'team-info', text: '👥 Who built NYLA?', topic: 'team' }
      ],
      'transfers': [
        { id: 'transfer-fees', text: '💰 What are the fees?', topic: 'fees' },
        { id: 'qr-codes', text: '📱 How do QR codes work?', topic: 'qr' }
      ],
      'features': [
        { id: 'extension-vs-pwa', text: '🔧 Extension vs PWA?', topic: 'comparison' },
        { id: 'mobile-usage', text: '📱 How to use on mobile?', topic: 'mobile' }
      ],
      'troubleshooting': [
        { id: 'common-issues', text: '🔧 Common problems?', topic: 'issues' },
        { id: 'get-help', text: '🆘 Where to get support?', topic: 'support' }
      ]
    };

    const questions = followUpMap[topic] || [];
    
    // Add universal "Change Topic" option
    questions.push({
      id: 'change-topic',
      text: '🔄 Change Topic',
      topic: 'navigation',
      action: 'changeTopic'
    });

    return this.filterAskedQuestions(questions);
  }

  /**
   * Generate topic-specific questions
   */
  generateTopicQuestions(topic) {
    const topicQuestions = {
      transfers: [
        { id: 'send-process', text: '📤 How to send tokens step-by-step?', topic: 'transfers' },
        { id: 'receive-tokens', text: '📥 How to receive tokens?', topic: 'transfers' },
        { id: 'swap-tokens', text: '🔄 How to swap tokens?', topic: 'transfers' }
      ],
      features: [
        { id: 'qr-generation', text: '📱 QR code generation?', topic: 'qr' },
        { id: 'multi-chain', text: '⛓️ Multi-blockchain support?', topic: 'chains' },
        { id: 'security', text: '🔒 Is NYLA secure?', topic: 'security' }
      ],
      tokens: [
        { id: 'nyla-token', text: '🪙 About $NYLA token?', topic: 'token' },
        { id: 'where-buy', text: '🛒 Where to buy $NYLA?', topic: 'buy' },
        { id: 'holder-benefits', text: '💎 Holder benefits?', topic: 'benefits' }
      ],
      troubleshooting: [
        { id: 'qr-not-scanning', text: '📱 QR code won\'t scan?', topic: 'qr-issues' },
        { id: 'transfer-failed', text: '❌ Transfer not working?', topic: 'transfer-issues' },
        { id: 'extension-problems', text: '🔧 Extension issues?', topic: 'extension-issues' }
      ]
    };

    return topicQuestions[topic] || this.generateWelcomeQuestions();
  }

  /**
   * Process user question selection
   */
  async processQuestion(questionId, questionText, topic) {
    try {
      // Mark question as asked
      this.askedQuestions.add(questionId);
      
      // Track user interest
      this.trackUserInterest(topic);
      
      // Generate answer
      const answer = await this.generateAnswer(questionId, questionText, topic);
      
      // Save conversation
      this.saveConversation(questionText, answer, topic);
      
      // Generate follow-up questions
      const followUps = this.generateFollowUpQuestions(answer, topic);
      
      return {
        answer,
        followUps,
        sticker: this.selectSticker(answer.sentiment || 'helpful'),
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('NYLA Conversation: Question processing failed', error);
      return this.generateErrorResponse();
    }
  }

  /**
   * Generate answer based on knowledge base
   */
  async generateAnswer(questionId, questionText, topic) {
    // Get relevant knowledge
    const knowledge = this.kb.getKnowledge(topic) || this.kb.searchKnowledge(questionText);
    
    // Generate answer based on question type
    switch (questionId) {
      case 'what-is-nyla':
        return this.generateWhatIsNYLAAnswer(knowledge);
      
      case 'how-to-transfer':
        return this.generateTransferAnswer(knowledge);
      
      case 'supported-chains':
        return this.generateChainsAnswer(knowledge);
      
      case 'nyla-token':
        return this.generateTokenAnswer(knowledge);
      
      case 'where-buy':
        return this.generateBuyAnswer(knowledge);
      
      case 'transfer-fees':
        return this.generateFeesAnswer(knowledge);
      
      case 'team-info':
        return this.generateTeamAnswer();
      
      default:
        return this.generateGenericAnswer(questionText, knowledge);
    }
  }

  /**
   * Generate specific answer responses
   */
  generateWhatIsNYLAAnswer(knowledge) {
    return {
      text: `NYLA is an AI agent designed to make cryptocurrency transfers simple and social! 🚀\n\nI help you:\n• Send tokens across multiple blockchains\n• Generate QR codes for easy payments\n• Connect with the crypto community\n• Make transfers as easy as sending a tweet!`,
      sentiment: 'excited',
      confidence: 0.9,
      sources: ['about']
    };
  }

  generateTransferAnswer(knowledge) {
    return {
      text: `Sending tokens with NYLA is super easy! 💸\n\n1. Open the Send tab\n2. Enter recipient's username\n3. Choose amount and token\n4. Select blockchain (Solana, Ethereum, or Algorand)\n5. Click "Send to X.com" to share your transfer command!\n\nThe recipient can then execute the transfer. Simple as that! ✨`,
      sentiment: 'helpful',
      confidence: 0.95,
      sources: ['features']
    };
  }

  generateChainsAnswer(knowledge) {
    const chains = this.kb.staticData?.supportedBlockchains || ['Solana', 'Ethereum', 'Algorand'];
    return {
      text: `NYLA supports multiple blockchains! ⛓️\n\nCurrently supported:\n${chains.map(chain => `• ${chain}`).join('\n')}\n\nThis means you can send tokens across different networks using the same simple interface. Pretty cool, right? 🌟`,
      sentiment: 'confident',
      confidence: 0.9,
      sources: ['integrations']
    };
  }

  generateTokenAnswer(knowledge) {
    const contractAddress = this.kb.staticData?.contractAddress || '8MkcaTC81opkPc3VWNqqn9b15sy6N9zh33j4QefwEwgv';
    return {
      text: `$NYLA is the native token that powers the NYLA ecosystem! 🪙\n\n📋 Contract: ${contractAddress}\n\n$NYLA holders get special benefits and help support the development of new features. The token is used for community governance and accessing premium features!`,
      sentiment: 'informative',
      confidence: 0.85,
      sources: ['token']
    };
  }

  generateBuyAnswer(knowledge) {
    return {
      text: `You can buy $NYLA from several places! 🛒\n\n• Check the "BUY" dropdown menu on agentnyla.com\n• DEX Screener: Available for trading\n• Various decentralized exchanges\n\nI can't provide real-time prices (that would require live data I don't have), but you can check the current chart and trading info! 📈`,
      sentiment: 'helpful',
      confidence: 0.8,
      sources: ['buy'],
      limitation: 'no-live-prices'
    };
  }

  generateFeesAnswer(knowledge) {
    return {
      text: `Transfer fees depend on the blockchain you choose! 💰\n\n• Solana: Very low fees (usually under $0.01)\n• Ethereum: Variable gas fees (can be higher during network congestion)\n• Algorand: Minimal fees (around $0.001)\n\nNYLA itself doesn't charge additional fees - you only pay the network fees for your chosen blockchain! 🎯`,
      sentiment: 'informative',
      confidence: 0.85,
      sources: ['fees']
    };
  }

  generateTeamAnswer() {
    const team = this.kb.staticData?.team || {};
    return {
      text: `The NYLA team is awesome! 👥\n\n🔧 Dev: @shax_btc - The mastermind behind the code\n📱 Social & Marketing: @btcberries - Spreading the NYLA love\n🎨 Art: @Noir0883 - Making everything look beautiful\n\nThey're all active on X (Twitter) if you want to follow their updates! 🚀`,
      sentiment: 'friendly',
      confidence: 1.0,
      sources: ['team']
    };
  }

  generateGenericAnswer(question, knowledge) {
    if (this.isLimitationQuery(question)) {
      return this.generateLimitationResponse(question);
    }

    return {
      text: `That's a great question! 🤔\n\nI'd love to help, but I might need more specific information to give you the best answer. Could you try asking about:\n• How to use specific features\n• Token transfers\n• Supported blockchains\n• The NYLA team\n\nOr feel free to change topics! 🔄`,
      sentiment: 'apologetic',
      confidence: 0.6,
      sources: []
    };
  }

  /**
   * Check if question is about limitations
   */
  isLimitationQuery(question) {
    const limitationKeywords = ['weather', 'news', 'price', 'real-time', 'current', 'today', 'now', 'latest'];
    return limitationKeywords.some(keyword => question.toLowerCase().includes(keyword));
  }

  /**
   * Generate limitation response
   */
  generateLimitationResponse(question) {
    const limitations = this.kb.getLimitations();
    return {
      text: `I'd love to help, but I can't access real-time data like current prices, weather, or live news! 😔\n\nHere's what I CAN help with:\n• NYLA features and how to use them\n• Token transfer processes\n• Supported blockchains\n• Team information\n• Troubleshooting common issues\n\nWhat would you like to know about NYLA? 🤖`,
      sentiment: 'apologetic',
      confidence: 0.9,
      limitation: true,
      sources: ['limitations']
    };
  }

  /**
   * Select appropriate sticker based on sentiment
   */
  selectSticker(sentiment) {
    const stickers = this.kb.getKnowledge('stickers');
    if (!stickers || !stickers.sentimentMap) {
      return null;
    }

    // Find sticker matching sentiment
    for (const [filename, data] of Object.entries(stickers.sentimentMap)) {
      if (data.sentiment === sentiment) {
        return {
          filename,
          path: `${stickers.path}/${filename}`,
          emotion: data.emotion
        };
      }
    }

    // Default to friendly sticker
    return {
      filename: 'xwve12Jz.jpg',
      path: `${stickers.path}/xwve12Jz.jpg`,
      emotion: 'welcoming'
    };
  }

  /**
   * Track user interest for personalization
   */
  trackUserInterest(topic, engagement = 1) {
    this.userProfile.interests[topic] = (this.userProfile.interests[topic] || 0) + engagement;
    this.userProfile.totalInteractions++;
    
    // Update preferred topics
    const sortedInterests = Object.entries(this.userProfile.interests)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    this.userProfile.preferredTopics = sortedInterests.map(([topic]) => topic);
    this.saveToStorage();
  }

  /**
   * Personalize questions based on user interests
   */
  personalizeQuestions(questions) {
    return questions.sort((a, b) => {
      const aInterest = this.userProfile.interests[a.topic] || 0;
      const bInterest = this.userProfile.interests[b.topic] || 0;
      return bInterest - aInterest;
    });
  }

  /**
   * Filter out recently asked questions
   */
  filterAskedQuestions(questions) {
    return questions.filter(q => !this.askedQuestions.has(q.id));
  }

  /**
   * Save conversation to history
   */
  saveConversation(question, answer, topic) {
    const conversation = {
      id: Date.now().toString(),
      question,
      answer: answer.text,
      topic,
      timestamp: Date.now(),
      sentiment: answer.sentiment
    };
    
    this.conversationHistory.push(conversation);
    
    // Keep only last 50 conversations
    if (this.conversationHistory.length > 50) {
      this.conversationHistory = this.conversationHistory.slice(-50);
    }
    
    this.saveToStorage();
  }

  /**
   * Generate error response
   */
  generateErrorResponse() {
    return {
      answer: {
        text: "Oops! Something went wrong. 😅\n\nLet me try to help you with something else! What would you like to know about NYLA?",
        sentiment: 'apologetic',
        confidence: 0.5
      },
      followUps: this.generateWelcomeQuestions(),
      sticker: this.selectSticker('sorry'),
      timestamp: Date.now()
    };
  }

  /**
   * Handle change topic action
   */
  changeTopicAction() {
    this.currentContext = 'welcome';
    return {
      questions: this.generateWelcomeQuestions(),
      message: "What would you like to explore? 🚀"
    };
  }

  /**
   * Save conversation state to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('nyla_conversation_history', JSON.stringify(this.conversationHistory));
      localStorage.setItem('nyla_user_profile', JSON.stringify(this.userProfile));
      localStorage.setItem('nyla_asked_questions', JSON.stringify([...this.askedQuestions]));
    } catch (error) {
      console.error('NYLA Conversation: Failed to save to storage', error);
    }
  }

  /**
   * Load conversation state from localStorage
   */
  loadFromStorage() {
    try {
      const history = localStorage.getItem('nyla_conversation_history');
      const profile = localStorage.getItem('nyla_user_profile');
      const asked = localStorage.getItem('nyla_asked_questions');
      
      if (history) {
        this.conversationHistory = JSON.parse(history);
      }
      
      if (profile) {
        this.userProfile = { ...this.userProfile, ...JSON.parse(profile) };
      }
      
      if (asked) {
        this.askedQuestions = new Set(JSON.parse(asked));
      }
      
    } catch (error) {
      console.error('NYLA Conversation: Failed to load from storage', error);
    }
  }

  /**
   * Get conversation statistics
   */
  getStats() {
    return {
      totalConversations: this.conversationHistory.length,
      totalQuestions: this.askedQuestions.size,
      topTopics: this.userProfile.preferredTopics,
      totalInteractions: this.userProfile.totalInteractions
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAConversationManager;
}