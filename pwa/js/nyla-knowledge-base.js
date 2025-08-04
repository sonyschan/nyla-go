/**
 * NYLA Knowledge Base Management System
 * Fetches, parses, and manages NYLA documentation for AI assistant
 */

class NYLAKnowledgeBase {
  constructor() {
    this.sources = {
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
      stickersPath: '/design/stickers'
    };
    
    this.knowledgeBase = {};
    this.lastUpdated = {};
    this.webFetcher = new NYLAWebFetcher();
  }

  /**
   * Initialize knowledge base from localStorage or fetch fresh data
   */
  async initialize() {
    try {
      // Load existing knowledge base from localStorage
      const stored = localStorage.getItem('nyla_knowledge_base');
      const storedTimestamps = localStorage.getItem('nyla_kb_timestamps');
      
      if (stored && storedTimestamps) {
        this.knowledgeBase = JSON.parse(stored);
        this.lastUpdated = JSON.parse(storedTimestamps);
        console.log('NYLA KB: Loaded from localStorage');
      }
      
      // Check if we need updates (older than 24 hours)
      const needsUpdate = this.checkForUpdates();
      if (needsUpdate) {
        console.log('NYLA KB: Fetching updates...');
        await this.fetchAllSources();
      }
      
      // Always ensure we have sticker data
      await this.loadStickers();
      
      return this.knowledgeBase;
    } catch (error) {
      console.error('NYLA KB: Initialization failed', error);
      // Return basic knowledge base even if fetching fails
      return this.createFallbackKnowledgeBase();
    }
  }

  /**
   * Check if knowledge base needs updating (24 hour threshold)
   */
  checkForUpdates() {
    const now = Date.now();
    const updateThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const source of Object.keys(this.sources)) {
      const lastUpdate = this.lastUpdated[source] || 0;
      if (now - lastUpdate > updateThreshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * Fetch all knowledge sources
   */
  async fetchAllSources() {
    const fetchPromises = Object.entries(this.sources).map(([key, url]) => 
      this.fetchAndParseSource(key, url)
    );
    
    try {
      await Promise.allSettled(fetchPromises);
      this.saveToLocalStorage();
      console.log('NYLA KB: All sources updated');
    } catch (error) {
      console.error('NYLA KB: Batch fetch failed', error);
    }
  }

  /**
   * Fetch and parse individual source
   */
  async fetchAndParseSource(sourceKey, url) {
    try {
      console.log(`NYLA KB: Fetching ${sourceKey} from ${url}`);
      
      // Use WebFetch tool for cross-domain requests
      const response = await this.fetchWithCORS(url);
      const content = await this.parseContent(sourceKey, response);
      
      this.knowledgeBase[sourceKey] = {
        content,
        url,
        lastFetched: Date.now(),
        status: 'success'
      };
      
      this.lastUpdated[sourceKey] = Date.now();
      
    } catch (error) {
      console.error(`NYLA KB: Failed to fetch ${sourceKey}`, error);
      
      // Keep existing data if available, mark as stale
      if (this.knowledgeBase[sourceKey]) {
        this.knowledgeBase[sourceKey].status = 'stale';
      } else {
        this.knowledgeBase[sourceKey] = {
          content: null,
          url,
          lastFetched: Date.now(),
          status: 'failed',
          error: error.message
        };
      }
    }
  }

  /**
   * Fetch with CORS handling (fallback method)
   */
  async fetchWithCORS(url) {
    try {
      // Try direct fetch first
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.log('NYLA KB: Direct fetch failed, trying fallback methods');
    }
    
    // Note: In a real implementation, you might use a CORS proxy
    // For now, we'll simulate with a placeholder
    throw new Error(`CORS blocked or network error for ${url}`);
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
        '4BC0jtdv.jpg', '6KOnZCiV.jpg', 'DjU_F-A6.jpg', 'Uhe9-Mcn.jpg',
        'Yw9aQazP.jpg', 'ZtM3Lp25.jpg', 'j17SpWhM.jpg', 'xwve12Jz.jpg'
      ];
      
      // Map filenames to sentiments (these would need to be manually mapped)
      const stickerMap = {
        'Yw9aQazP.jpg': { sentiment: 'happy', emotion: 'joy' },
        '6KOnZCiV.jpg': { sentiment: 'helpful', emotion: 'support' },
        'DjU_F-A6.jpg': { sentiment: 'confused', emotion: 'question' },
        'j17SpWhM.jpg': { sentiment: 'excited', emotion: 'celebration' },
        'Uhe9-Mcn.jpg': { sentiment: 'sorry', emotion: 'apologetic' },
        'ZtM3Lp25.jpg': { sentiment: 'thinking', emotion: 'contemplative' },
        '4BC0jtdv.jpg': { sentiment: 'confident', emotion: 'assured' },
        'xwve12Jz.jpg': { sentiment: 'friendly', emotion: 'welcoming' }
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
   * Create fallback knowledge base for offline/error scenarios
   */
  createFallbackKnowledgeBase() {
    return {
      about: {
        content: {
          description: 'NYLA is an AI agent for cryptocurrency transfers and community building',
          features: ['Transfer tokens', 'Generate QR codes', 'Multi-blockchain support'],
          supportedBlockchains: ['Solana', 'Ethereum', 'Algorand']
        },
        status: 'fallback'
      },
      staticData: this.staticData,
      commonQuestions: this.getCommonQuestions(),
      limitations: this.getLimitations()
    };
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
        if (content.includes(queryLower)) {
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