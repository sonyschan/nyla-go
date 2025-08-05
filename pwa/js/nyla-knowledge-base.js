/**
 * NYLA Knowledge Base Management System
 * Fetches, parses, and manages NYLA documentation for AI assistant
 */

class NYLAKnowledgeBase {
  constructor() {
    // External URLs preserved for development reference only
    // No longer used for runtime fetching - all content is static
    this.externalSources = {
      about: 'https://www.agentnyla.com/about',
      lore: 'https://www.loreagentnyla.com/',
      xIntegration: 'https://www.agentnyla.com/integrations/x',
      telegramIntegration: 'https://www.agentnyla.com/integrations/telegram',
      commandUsage: 'https://www.agentnyla.com/integrations/command-usage',
      siteStats: 'https://www.agentnyla.com/site-stats',
      chart: 'https://dexscreener.com/solana/8MkcaTC81opkPc3VWNqqn9b15sy6N9zh33j4QefwEwgv'
    };
    
    this.staticData = {
      contractAddress: '8MkcaTC81opkPc3VWNqqn9b15sy6N9zh33j4QefwEwgv',
      team: {
        dev: 'https://x.com/shax_btc',
        social: 'https://x.com/btcberries', 
        art: 'https://x.com/Noir0883'
      },
      stickersPath: 'design/stickers'
    };
    
    this.knowledgeBase = {};
    this.lastUpdated = {};
    // WebFetcher preserved for potential development use but not initialized by default
    this.webFetcher = null;
  }

  /**
   * Initialize knowledge base with static content only
   * No runtime fetching - uses pre-built static knowledge base
   */
  async initialize() {
    try {
      console.log('NYLA KB: === Initializing Knowledge Base (Static Mode) ===');
      
      // Use static knowledge base instead of fetching external URLs
      console.log('NYLA KB: Loading static knowledge base...');
      this.knowledgeBase = this.createStaticKnowledgeBase();
      this.lastUpdated = { static: Date.now() };
      console.log('NYLA KB: ✅ Static knowledge base loaded');
      
      // Always ensure we have sticker data
      console.log('NYLA KB: Loading stickers...');
      await this.loadStickers();
      console.log('NYLA KB: ✅ Stickers loaded');
      
      console.log('NYLA KB: ✅ Knowledge base initialized (static mode)');
      return this.knowledgeBase;
    } catch (error) {
      console.error('NYLA KB: ❌ Initialization failed:', error);
      console.error('NYLA KB: Error stack:', error.stack);
      console.log('NYLA KB: Creating fallback knowledge base...');
      // Return basic knowledge base even if static loading fails
      return this.createFallbackKnowledgeBase();
    }
  }

  /**
   * Create comprehensive static knowledge base
   * Contains all NYLA documentation without external fetching
   */
  createStaticKnowledgeBase() {
    return {
      // Core NYLAGo Purpose and How It Works
      nylagoCore: {
        content: {
          primaryPurpose: 'NYLAGo is a user interface that helps create NYLA transfer commands for cryptocurrency transfers on X.com',
          howItWorks: {
            overview: 'NYLAGo generates commands → User posts on X.com → NYLA system executes transfers',
            sendTab: 'User fills form with recipient and amount → NYLAGo generates command → Creates X.com post → User shares it',
            receiveTab: 'User sets amount → NYLAGo creates QR code → Others scan to get payment link',
            raidTab: 'Community engagement with NYLA-related X.com posts. Access via "..." button on bottom-right of screen',
            important: 'The transfer is NOT done by NYLAGo - it\'s done by NYLA when command is posted on X.com'
          },
          exampleFlow: {
            step1: 'User wants to send 100 NYLA to @friend',
            step2: 'NYLAGo creates command: "Hey @AgentNyla transfer 100 $NYLA @friend"',
            step3: 'User posts this on X.com',
            step4: 'NYLA detects the X.com post and executes the transfer'
          }
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      // Supported Blockchains - CRITICAL: Only these 3!
      supportedBlockchains: {
        content: {
          supported: {
            solana: { name: 'Solana', description: 'Fastest and cheapest' },
            ethereum: { name: 'Ethereum', description: 'Most popular' },
            algorand: { name: 'Algorand', description: 'Eco-friendly' }
          },
          notSupported: ['Base', 'Polygon', 'Arbitrum', 'Optimism', 'BSC', 'any other chains'],
          summary: 'NYLA supports 3 blockchains: Solana (fastest and cheapest), Ethereum (most popular), Algorand (eco-friendly). Choose based on your priorities!'
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      // Platform Limitations
      platformLimitations: {
        content: {
          supported: 'NYLAGo currently ONLY supports X.com transfer commands',
          notSupported: 'Telegram transfer commands are NOT yet supported by NYLAGo',
          explanation: 'If users ask about Telegram transfers, explain that NYLAGo focuses on X.com integration',
          note: 'NYLA system may support Telegram separately, but NYLAGo interface does not generate Telegram commands'
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      // Raid Feature Details
      raidFeature: {
        content: {
          purpose: 'Community engagement with NYLA-related X.com posts to create positive vibes',
          content: 'Features posts from the NYLA team, community members, or anyone mentioning $NYLA',
          access: 'Click the "..." (three dots) button on the bottom-right of the screen',
          important: 'NOT for creating raids or attacks - it\'s for SUPPORTING and ENGAGING with NYLA content',
          actions: 'Users can like, retweet, and comment on featured posts directly from NYLAGo'
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      // QR Code Functionality
      qrCodes: {
        content: {
          purpose: 'Convert X.com payment links into scannable QR codes',
          benefits: 'Make it easy to share payment requests',
          usage: 'Anyone can scan and pay through their phone'
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      // NYLA Commands
      nylaCommands: {
        content: {
          mainCommands: ['Transfer', 'Swap'],
          description: 'The most used NYLA commands are Transfer and Swap. You can easily find these 2 features in NYLAGo to transfer or swap tokens.',
          transferCommand: 'Transfer tokens between users',
          swapCommand: 'Swap between different cryptocurrencies'
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      about: {
        content: {
          description: 'NYLA is an AI agent designed for cryptocurrency transfers and community building on social platforms.',
          features: [
            'Send tokens across multiple blockchains (Solana, Ethereum, Algorand)',
            'Generate QR codes for easy payments and receiving',
            'Social media integration with X (Twitter) for public transfers',
            'Community-driven engagement and interactions',
            'Progressive Web App (PWA) and Chrome Extension versions',
            'Multi-chain support with low fees'
          ],
          keyBenefits: [
            'Simplified crypto transfers - as easy as sending a tweet',
            'Social payment commands for community interaction',
            'Multi-chain support without switching wallets',
            'QR code generation for mobile-friendly payments',
            'No additional fees - only network transaction costs'
          ],
          useCases: [
            'Send tokens to X (Twitter) usernames',
            'Generate QR codes for in-person payments',
            'Community giveaways and airdrops',
            'Cross-chain token transfers',
            'Social commerce and tipping'
          ]
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      lore: {
        content: {
          story: 'NYLA emerged from the vision of making cryptocurrency as accessible as social media.',
          background: 'Born from the intersection of blockchain technology and social interaction, NYLA bridges the gap between complex crypto operations and everyday users.',
          mission: 'To democratize cryptocurrency transfers by making them as simple as sending a message to a friend.',
          vision: 'A world where crypto payments are integrated seamlessly into social platforms, enabling global financial inclusion.',
          values: [
            'Simplicity over complexity',
            'Community over isolation', 
            'Accessibility over exclusivity',
            'Innovation over tradition'
          ],
          journey: {
            concept: 'Started with the idea that crypto transfers should be social',
            development: 'Built by a passionate team of developers, designers, and community builders',
            launch: 'Launched as both PWA and Chrome Extension for maximum accessibility',
            future: 'Continuously evolving based on community feedback and needs'
          }
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      xIntegration: {
        content: {
          description: 'NYLA integrates seamlessly with X (formerly Twitter) for social crypto transfers.',
          features: [
            'Generate transfer commands optimized for X posts',
            'Share transfer commands with recipient usernames',
            'QR code sharing for mobile users on X',
            'Community visibility for transfer commands',
            'Easy copy-paste commands for X posts'
          ],
          howItWorks: [
            '1. Create transfer command in NYLAGo Send tab',
            '2. Enter recipient\'s X username (without @)',
            '3. Specify amount and select blockchain',
            '4. Click "Send to X.com" to generate shareable command like "Hey @AgentNyla transfer 50 $NYLA @username"',
            '5. Share the command on X - NYLA detects and executes the transfer'
          ],
          benefits: [
            'Public transfer commands increase trust',
            'Community can see and verify transfers',
            'Social proof and engagement',
            'Easy discovery of NYLA ecosystem'
          ]
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      commandUsage: {
        content: {
          fees: {
            solana: 'Very low fees (typically under $0.01 per transaction)',
            ethereum: 'Variable gas fees (depends on network congestion, can range from $5-50+)',
            algorand: 'Minimal fees (around $0.001 per transaction)'
          },
          holderBenefits: [
            'Reduced transaction fees for $NYLA token holders',
            'Priority support and community access',
            'Early access to new features and integrations',
            'Community governance participation rights',
            'Exclusive holder-only features and perks'
          ],
          commonQuestions: [
            {
              q: 'How do I send tokens using NYLA?',
              a: 'Use the Send tab, enter recipient username, choose amount and token, select blockchain, then click "Send to X.com" to share your transfer command.'
            },
            {
              q: 'What are the transaction fees?',
              a: 'Only blockchain network fees apply - no additional NYLA fees. Solana: ~$0.01, Ethereum: varies with gas, Algorand: ~$0.001.'
            },
            {
              q: 'Is NYLA secure?',
              a: 'Yes! NYLA generates transfer commands but never handles your private keys. You maintain full control over your assets.'
            },
            {
              q: 'Which blockchains are supported?',
              a: 'Currently Solana, Ethereum, and Algorand with more chains planned based on community demand.'
            }
          ],
          securityFeatures: [
            'No private key handling - you control your assets',
            'Command-based transfers - transparent and verifiable',
            'Open source components for community review',
            'No custodial services - fully decentralized'
          ]
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      staticData: this.staticData,
      commonQuestions: this.getCommonQuestions(),
      limitations: this.getLimitations()
    };
  }
  
  // Legacy methods maintained for potential future development use
  // These are disabled in production but preserved for development
  
  /**
   * [DEV ONLY] Check if knowledge base needs updating
   * Disabled in production - no runtime fetching
   */
  checkForUpdates() {
    console.log('NYLA KB: Update checking disabled - using static content only');
    return false; // Never update in production
  }

  /**
   * [DEV ONLY] Fetch all knowledge sources
   * Disabled in production - call this manually during development only
   */
  async fetchAllSources() {
    console.warn('NYLA KB: External fetching disabled in production. Use development script if content updates needed.');
    return Promise.resolve();
  }

  /**
   * [DEV ONLY] Fetch and parse individual source  
   * Preserved for potential development use
   */
  async fetchAndParseSource(sourceKey, url) {
    console.warn(`NYLA KB: Skipping fetch for ${sourceKey} - static mode enabled`);
    return Promise.resolve();
  }

  /**
   * [DEV ONLY] Fetch with CORS handling
   * Preserved for potential development use
   */
  async fetchWithCORS(url) {
    console.warn('NYLA KB: CORS fetching disabled - static mode enabled');
    throw new Error('External fetching disabled in production mode');
  }

  /**
   * Parse content based on source type
   */
  async parseContent(sourceKey, htmlContent) {
    switch (sourceKey) {
      case 'about':
        return this.parseAboutPage(htmlContent);
      case 'lore':
        return this.parseLorePage(htmlContent);
      case 'xIntegration':
        return this.parseXIntegrationPage(htmlContent);
      case 'telegramIntegration':
        return this.parseTelegramIntegrationPage(htmlContent);
      case 'commandUsage':
        return this.parseCommandUsagePage(htmlContent);
      case 'siteStats':
        return this.parseSiteStatsPage(htmlContent);
      default:
        return this.parseGenericPage(htmlContent);
    }
  }

  /**
   * Parse About page content
   */
  parseAboutPage(html) {
    // Parse key sections from the about page
    const parsed = {
      description: this.extractTextBetween(html, '<h1>', '</h1>') || 'NYLA AI Agent for cryptocurrency transfers',
      features: this.extractListItems(html, 'features') || [],
      supportedBlockchains: this.extractIntegrationsFromFooter(html) || ['Solana', 'Ethereum', 'Algorand'],
      buyLinks: this.extractBuyLinks(html) || []
    };
    
    return parsed;
  }

  /**
   * Parse Site Stats with timestamp
   */
  parseSiteStatsPage(html) {
    const stats = {
      data: this.extractStatsData(html) || {},
      lastUpdated: Date.now(),
      timestamp: new Date().toISOString(),
      note: 'Stats are cached and may not reflect real-time data'
    };
    
    return stats;
  }

  /**
   * Load local sticker data
   */
  async loadStickers() {
    try {
      // Get list of sticker files from design/stickers directory
      const stickerFiles = [
        'agree.jpg', 'feelgood.jpg', 'goodnight.jpg', 'knockknock.jpg',
        'questioning.jpg', 'sad.jpg', 'shock.jpg', 'yessir.jpg'
      ];
      
      // Map filenames to sentiments (mapped to actual file names)
      const stickerMap = {
        'feelgood.jpg': { sentiment: 'happy', emotion: 'joy' },
        'agree.jpg': { sentiment: 'helpful', emotion: 'support' },
        'questioning.jpg': { sentiment: 'confused', emotion: 'question' },
        'yessir.jpg': { sentiment: 'excited', emotion: 'celebration' },
        'sad.jpg': { sentiment: 'sorry', emotion: 'apologetic' },
        'knockknock.jpg': { sentiment: 'thinking', emotion: 'contemplative' },
        'shock.jpg': { sentiment: 'confident', emotion: 'assured' },
        'goodnight.jpg': { sentiment: 'friendly', emotion: 'welcoming' }
      };
      
      this.knowledgeBase.stickers = {
        path: this.staticData.stickersPath,
        files: stickerFiles,
        sentimentMap: stickerMap,
        lastUpdated: Date.now()
      };
      
    } catch (error) {
      console.error('NYLA KB: Failed to load stickers', error);
      this.knowledgeBase.stickers = { error: error.message };
    }
  }

  /**
   * Create fallback knowledge base for error scenarios
   * Uses same static content as main knowledge base
   */
  createFallbackKnowledgeBase() {
    console.log('NYLA KB: Using fallback mode - loading static knowledge base');
    return this.createStaticKnowledgeBase();
  }

  /**
   * Get common questions for the AI to generate buttons
   */
  getCommonQuestions() {
    return {
      transfers: [
        'How do I send NYLA tokens?',
        'What blockchains are supported?',
        'How do I generate a QR code?',
        'What are the transfer fees?'
      ],
      features: [
        'What can NYLA Go do?',
        'How do I use the Extension?',
        'What\'s the difference between Extension and PWA?',
        'How do I scan QR codes?'
      ],
      tokens: [
        'What is $NYLA token?',
        'Where can I buy $NYLA?',
        'What are the holder benefits?',
        'What\'s the contract address?'
      ],
      troubleshooting: [
        'Why isn\'t my transfer working?',
        'QR code won\'t scan - help!',
        'How do I update the app?',
        'Extension not loading?'
      ]
    };
  }

  /**
   * Get AI limitations for transparency
   */
  getLimitations() {
    return [
      'I cannot access real-time data like current token prices or weather',
      'I cannot make actual transactions - I only help you create transfer commands',
      'I cannot access external APIs or browse the internet',
      'I cannot see your account balances or transaction history',
      'My knowledge is based on cached documentation and may not be completely current'
    ];
  }

  /**
   * Save knowledge base to localStorage
   */
  saveToLocalStorage() {
    try {
      localStorage.setItem('nyla_knowledge_base', JSON.stringify(this.knowledgeBase));
      localStorage.setItem('nyla_kb_timestamps', JSON.stringify(this.lastUpdated));
      console.log('NYLA KB: Saved to localStorage');
    } catch (error) {
      console.error('NYLA KB: Failed to save to localStorage', error);
    }
  }

  /**
   * Get knowledge for specific topic
   */
  getKnowledge(topic) {
    return this.knowledgeBase[topic] || null;
  }

  /**
   * Search knowledge base
   */
  searchKnowledge(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [source, data] of Object.entries(this.knowledgeBase)) {
      if (data.content && typeof data.content === 'object') {
        const content = JSON.stringify(data.content).toLowerCase();
        
        // Split query into individual terms and check each
        const queryTerms = queryLower.split(' ');
        let matches = 0;
        
        for (const term of queryTerms) {
          if (term.length > 2 && content.includes(term)) { // Only check terms longer than 2 chars
            matches++;
          }
        }
        
        if (matches > 0 || content.includes(queryLower)) {
          results.push({
            source,
            data: data.content,
            relevance: this.calculateRelevance(queryLower, content)
          });
        }
      }
    }
    
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Calculate relevance score for search results
   */
  calculateRelevance(query, content) {
    const words = query.split(' ');
    let score = 0;
    
    for (const word of words) {
      const occurrences = (content.match(new RegExp(word, 'g')) || []).length;
      score += occurrences;
    }
    
    return score;
  }

  // Utility parsing methods (to be implemented based on actual HTML structure)
  extractTextBetween(html, startTag, endTag) {
    const start = html.indexOf(startTag);
    const end = html.indexOf(endTag, start + startTag.length);
    if (start !== -1 && end !== -1) {
      return html.slice(start + startTag.length, end).trim();
    }
    return null;
  }

  extractListItems(html, section) {
    // Placeholder for extracting list items from HTML
    return [];
  }

  extractIntegrationsFromFooter(html) {
    // Placeholder for extracting supported blockchains from footer
    return ['Solana', 'Ethereum', 'Algorand'];
  }

  extractBuyLinks(html) {
    // Placeholder for extracting buy links from dropdown
    return [];
  }

  extractStatsData(html) {
    // Placeholder for extracting site statistics
    return {};
  }

  parseGenericPage(html) {
    // Placeholder for generic HTML parsing
    return { rawHtml: html.slice(0, 1000) + '...' };
  }

  parseLorePage(html) { return this.parseGenericPage(html); }
  parseXIntegrationPage(html) { return this.parseGenericPage(html); }
  parseTelegramIntegrationPage(html) { return this.parseGenericPage(html); }
  parseCommandUsagePage(html) { return this.parseGenericPage(html); }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAKnowledgeBase;
}

// Make globally available
window.NYLAKnowledgeBase = NYLAKnowledgeBase;