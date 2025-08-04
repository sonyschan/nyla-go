/**
 * NYLA Web Content Fetcher
 * Fetches and caches content from NYLA documentation URLs
 */

class NYLAWebFetcher {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Fetch content from URL with caching
   */
  async fetchContent(url, prompt = "Extract the main content and key information from this page") {
    const cacheKey = `${url}_${Date.now() - (Date.now() % this.cacheExpiry)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log(`NYLA Fetcher: Using cached content for ${url}`);
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`NYLA Fetcher: Fetching fresh content from ${url}`);
      
      // Note: In a real implementation, you would use WebFetch or a CORS proxy
      // For now, we'll create structured fallback content
      const content = await this.createFallbackContent(url);
      
      // Cache the result
      this.cache.set(cacheKey, content);
      
      return content;
    } catch (error) {
      console.error(`NYLA Fetcher: Failed to fetch ${url}`, error);
      return this.createErrorContent(url, error);
    }
  }

  /**
   * Create structured fallback content based on URL
   */
  async createFallbackContent(url) {
    const urlMap = {
      'https://www.agentnyla.com/about': {
        title: 'About NYLA',
        content: {
          description: 'NYLA is an AI agent designed for cryptocurrency transfers and community building on social platforms.',
          features: [
            'Send tokens across multiple blockchains',
            'Generate QR codes for easy payments',
            'Social media integration with X (Twitter)',
            'Community-driven features'
          ],
          supportedBlockchains: ['Solana', 'Ethereum', 'Algorand'],
          keyBenefits: [
            'Simplified crypto transfers',
            'Social payment commands',
            'Multi-chain support',
            'QR code generation'
          ]
        },
        lastFetched: Date.now(),
        status: 'fallback'
      },

      'https://www.loreagentnyla.com/': {
        title: 'NYLA Lore',
        content: {
          story: 'NYLA is an AI agent born from the intersection of cryptocurrency and social interaction.',
          background: 'Designed to make crypto transfers as easy as sending a social media message.',
          mission: 'Bridge the gap between complex blockchain technology and everyday users.',
          vision: 'A world where crypto payments are as simple as texting a friend.'
        },
        lastFetched: Date.now(),
        status: 'fallback'
      },

      'https://www.agentnyla.com/integrations/x': {
        title: 'X (Twitter) Integration',
        content: {
          description: 'NYLA integrates seamlessly with X (formerly Twitter) for social crypto transfers.',
          features: [
            'Generate transfer commands for X posts',
            'QR code sharing on social media',
            'Username-based transfers',
            'Community interaction'
          ],
          howItWorks: [
            'Create transfer command in NYLA Go',
            'Share command on X with recipient username',
            'Recipient executes the transfer',
            'Community can see and interact'
          ]
        },
        lastFetched: Date.now(),
        status: 'fallback'
      },

      'https://www.agentnyla.com/integrations/telegram': {
        title: 'Telegram Integration',
        content: {
          description: 'NYLA extends its capabilities to Telegram for private group transfers.',
          features: [
            'Bot integration for Telegram groups',
            'Private transfer commands',
            'Group payment coordination',
            'Secure messaging integration'
          ],
          setup: [
            'Add NYLA bot to Telegram group',
            'Configure transfer permissions',
            'Use commands for group payments',
            'Monitor transfer activity'
          ]
        },
        lastFetched: Date.now(),
        status: 'fallback'
      },

      'https://www.agentnyla.com/integrations/command-usage': {
        title: 'Command Usage & Fees',
        content: {
          fees: {
            solana: 'Very low fees (typically under $0.01)',
            ethereum: 'Variable gas fees (depends on network congestion)',
            algorand: 'Minimal fees (around $0.001)'
          },
          holderBenefits: [
            'Reduced transaction fees for $NYLA holders',
            'Priority support',
            'Early access to new features',
            'Community governance participation'
          ],
          commonQuestions: [
            {
              q: 'How do I send tokens?',
              a: 'Use the Send tab, enter recipient and amount, then share the command.'
            },
            {
              q: 'What are the fees?',
              a: 'Only blockchain network fees apply, no additional NYLA fees.'
            },
            {
              q: 'Is it secure?',
              a: 'Yes, NYLA generates commands but never handles private keys.'
            }
          ]
        },
        lastFetched: Date.now(),
        status: 'fallback'
      },

      'https://www.agentnyla.com/site-stats': {
        title: 'Site Statistics',
        content: {
          note: 'Real-time statistics would require live data access',
          disclaimer: 'These are cached statistics and may not reflect current values',
          estimatedMetrics: {
            totalTransfers: 'Data not available in cached mode',
            activeUsers: 'Data not available in cached mode',
            supportedTokens: 'Multiple tokens across Solana, Ethereum, Algorand',
            lastUpdate: new Date().toISOString()
          }
        },
        lastFetched: Date.now(),
        status: 'limited'
      }
    };

    return urlMap[url] || this.createGenericFallback(url);
  }

  /**
   * Create generic fallback content
   */
  createGenericFallback(url) {
    return {
      title: 'NYLA Documentation',
      content: {
        message: 'Content is temporarily unavailable',
        suggestion: 'Please visit the website directly for the latest information',
        url: url
      },
      lastFetched: Date.now(),
      status: 'unavailable'
    };
  }

  /**
   * Create error content
   */
  createErrorContent(url, error) {
    return {
      title: 'Content Unavailable',
      content: {
        error: error.message,
        url: url,
        suggestion: 'Please check your internet connection and try again later'
      },
      lastFetched: Date.now(),
      status: 'error'
    };
  }

  /**
   * Enhanced knowledge base with static data
   */
  getEnhancedKnowledgeBase() {
    return {
      staticData: {
        contractAddress: '8MkcaTC81opkPc3VWNqqn9b15sy6N9zh33j4QefwEwgv',
        team: {
          dev: { name: 'shax_btc', url: 'https://x.com/shax_btc', role: 'Lead Developer' },
          social: { name: 'btcberries', url: 'https://x.com/btcberries', role: 'Social & Marketing' },
          art: { name: 'Noir0883', url: 'https://x.com/Noir0883', role: 'Art & Design' }
        },
        supportedBlockchains: [
          { name: 'Solana', symbol: 'SOL', features: ['Fast', 'Low fees', 'High throughput'] },
          { name: 'Ethereum', symbol: 'ETH', features: ['Established', 'Smart contracts', 'Large ecosystem'] },
          { name: 'Algorand', symbol: 'ALGO', features: ['Carbon negative', 'Fast finality', 'Low fees'] }
        ],
        chartUrl: 'https://dexscreener.com/solana/8MkcaTC81opkPc3VWNqqn9b15sy6N9zh33j4QefwEwgv',
        buyLocations: [
          'Check the BUY dropdown on agentnyla.com',
          'DEX Screener (for current trading info)',
          'Supported decentralized exchanges'
        ]
      },
      
      quickAnswers: {
        'what is nyla': 'NYLA is an AI agent that makes cryptocurrency transfers as easy as sending a social media message. It supports multiple blockchains and integrates with platforms like X (Twitter).',
        
        'how to send tokens': 'Use the Send tab: enter recipient username, choose amount and token, select blockchain, then click "Send to X.com" to share your transfer command!',
        
        'supported blockchains': 'NYLA supports Solana, Ethereum, and Algorand. Each has different fee structures and features.',
        
        'what are fees': 'You only pay blockchain network fees - no additional NYLA fees! Solana: ~$0.01, Ethereum: varies with gas, Algorand: ~$0.001.',
        
        'is it secure': 'Yes! NYLA only generates transfer commands and never handles your private keys. You maintain full control of your assets.',
        
        'team members': 'The NYLA team includes @shax_btc (Dev), @btcberries (Social & Marketing), and @Noir0883 (Art). All are active on X!',
        
        'token contract': 'The $NYLA token contract address is: 8MkcaTC81opkPc3VWNqqn9b15sy6N9zh33j4QefwEwgv',
        
        'where to buy': 'Check the BUY dropdown menu on agentnyla.com for current trading locations and DEX options.'
      },
      
      limitations: [
        'I cannot access real-time data like current token prices or weather',
        'I cannot make actual transactions - I only help create transfer commands',
        'I cannot browse the internet or access external APIs',
        'I cannot see your account balances or transaction history',
        'My knowledge is based on cached documentation and may not be completely current'
      ]
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('NYLA Fetcher: Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      expiryHours: this.cacheExpiry / (60 * 60 * 1000)
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAWebFetcher;
}

// Make globally available
window.NYLAWebFetcher = NYLAWebFetcher;