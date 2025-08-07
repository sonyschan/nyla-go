/**
 * NYLA Knowledge Base Management System
 * Fetches, parses, and manages NYLA documentation for AI assistant
 */

class NYLAKnowledgeBase {
  constructor() {
    // Check if mobile device - prevent initialization on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.isMobile = isMobile;
    
    if (isMobile) {
      console.log('NYLA KB: Mobile device detected - knowledge base will use minimal mode');
    }
    
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
      if (this.isMobile) {
        console.log('NYLA KB: Mobile device - using minimal knowledge base');
        this.knowledgeBase = this.createMinimalKnowledgeBase();
        this.lastUpdated = { static: Date.now() };
        console.log('NYLA KB: ✅ Minimal knowledge base loaded for mobile');
        return this.knowledgeBase;
      }
      
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
            overview: 'NYLAGo generates commands, user posts on X.com, NYLA system executes transfers',
            sendTab: 'User fills form with recipient and amount, NYLAGo generates command, creates X.com post, user shares it',
            receiveTab: 'User sets amount, NYLAGo creates QR code, others scan to get payment link',
            raidTab: 'Community engagement with NYLA-related X.com posts. Access via three dots button on bottom-right of screen',
            important: 'The transfer is NOT done by NYLAGo - it is done by NYLA when command is posted on X.com'
          },
          exampleFlow: {
            step1: 'User wants to send 100 NYLA to @friend',
            step2: 'NYLAGo creates command like: Hey @AgentNyla transfer 100 $NYLA @friend',
            step3: 'User posts this on X.com',
            step4: 'NYLA detects the X.com post and executes the transfer'
          }
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      // Supported Blockchains - CRITICAL: These are NETWORKS, not FEATURES!
      supportedBlockchains: {
        content: {
          conceptClarification: {
            important: 'BLOCKCHAINS are NETWORKS, NOT features. NYLA operates on 3 separate blockchain networks',
            distinction: 'Blockchain = Network infrastructure. Features = Operations you can do (transfer, swap)',
            wrongConcept: 'DO NOT say "3 blockchain features" - Say "3 blockchain networks"'
          },
          supportedNetworks: {
            count: 3,
            solana: {
              name: 'Solana Network',
              description: 'An independent blockchain known for being one of the fastest and lowest-cost networks. It uses a combination of Proof of History and Proof of Stake to achieve high throughput.',
              operations: 'Supports token transfers and swaps *within* the Solana network only.',
              baseKnowledge: {
                consensus: 'Proof of History + Proof of Stake',
                txSpeed: 'Up to 65,000 transactions per second (theoretical)',
                avgFee: 'Average transaction fee is around $0.0001 USD',
                ecosystem: 'Rapidly growing in NFTs, DeFi, and GameFi. Popular wallets include Phantom and Solflare.',
                nativeToken: 'SOL'
              },
              community: {
                summary: 'A passionate and developer-friendly community focused on speed, usability, and innovation.',
                hangouts: ['X (Solana Foundation)', 'Solana Discord', 'Solana Hacker Houses', 'Buildoooor events']
              },
              ecosystemHighlights: [
                'Magic Eden (NFT Marketplace)',
                'Jito (Liquid Staking)',
                'Marinade Finance (Staking)',
                'Meteora (Liquidity Layer)',
                'Pump.fun (Meme Coin Launchpad)',
                'Jupiter Aggregator (DEX Routing)'
              ],
              foundation: {
                name: 'Solana Foundation',
                role: 'Supports core protocol development, ecosystem grants, and community events',
                url: 'https://solana.org'
              }
            },
            ethereum: {
              name: 'Ethereum Network',
              description: 'The most well-known blockchain platform, foundational to smart contracts, DeFi, and NFTs.',
              operations: 'Supports token transfers and swaps *within* the Ethereum network only.',
              baseKnowledge: {
                consensus: 'Proof of Stake (since The Merge)',
                txSpeed: 'Around 15–30 transactions per second (mainnet)',
                avgFee: 'Highly variable gas fees, typically $5–$50+ USD per transaction',
                ecosystem: 'Largest DApp ecosystem. Common wallets include MetaMask.',
                nativeToken: 'ETH'
              },
              community: {
                summary: 'A global, open-source developer community built around decentralization, innovation, and neutrality.',
                hangouts: ['Ethereum Magicians', 'ETHGlobal hackathons', 'Ethereum StackExchange', 'r/ethereum']
              },
              ecosystemHighlights: [
                'Uniswap (DeFi)',
                'OpenSea (NFT Marketplace)',
                'Lido (Liquid Staking)',
                'Aave (Lending)',
                'ENS (Ethereum Name Service)',
                'Arbitrum & Optimism (L2 Scaling)'
              ],
              foundation: {
                name: 'Ethereum Foundation',
                role: 'Non-profit organization that supports Ethereum protocol research and core development',
                url: 'https://ethereum.foundation'
              }
            },
            algorand: {
              name: 'Algorand Network',
              description: 'An independent blockchain known for its energy efficiency, fast finality, and low-cost transactions, using Pure Proof of Stake. Designed for sustainable and scalable dApps.',
              operations: 'Supports token transfers, swaps, and smart contracts within the Algorand network only.',
              baseKnowledge: {
                consensus: 'Pure Proof of Stake (PPoS) with VRF-based randomness',
                txSpeed: '~6,000 transactions per second',
                blockFinality: '~4-5 seconds for transaction finality',
                avgFee: 'Average transaction fee ~$0.001 USD',
                sustainability: 'Carbon-negative, <0.0001 kWh per transaction',
                smartContracts: 'TEAL-based smart contracts, PyTeal for developer-friendly coding',
                staking: 'Passive staking for ALGO holders with variable APY via governance',
                ecosystem: 'Focused on ESG, public-sector use cases, DeFi, and NFTs. Supported wallets include Pera Wallet.',
                nativeToken: 'ALGO',
                roadmap: 'Targeting >10,000 TPS and cross-chain interoperability via State Proofs',
                history: 'Launched in 2019 by Turing Award winner Silvio Micali'
              },
              community: {
                summary: 'An active and growing community focused on sustainable blockchain adoption, real-world use cases, inclusive finance, and SocialFi innovation. Strong emphasis on developer and user onboarding through accessible tools like NYLA.',
                hangouts: [
                  'Algorand Discord (discord.gg/algorand)',
                  'AlgoFam on X (#ALGO, #Algorand)',
                  'r/AlgorandOfficial and r/algorand on Reddit',
                  'Algorand Forum (forum.algorand.org)',
                  'Algorand Dev Portal (developer.algorand.org)',
                  'AlgoHubs (regional meetups)'
                ],
                metrics: 'Over 76K Reddit subscribers (r/AlgorandOfficial), 100K+ X followers (@AlgoFoundation), and 1.3M+ monthly active users as of September 2024.',
                initiatives: [
                  'NYLA Collaboration: Enables sending $ALGO and ASAs via X and Telegram handles, auto-generating wallets for recipients to onboard new users (e.g., Sydney Sweeney received 6.9 $ALGO via X). Launched July 2025 with Algorand Foundation endorsement.',
                  'xGov Council: Community-elected governance body formed in 2025, empowering ALGO holders to vote on ecosystem proposals.',
                  'Algorand Assembly: Bi-monthly community calls discussing ecosystem analytics, projects like NYLA, and events like Decipher.',
                  'X Spaces: Regular discussions with community members (e.g., Geek.Algo, Fisherman.Algo) and project leads like Navi (NYLA CBDO) to promote collaboration.'
                ],
                sentiment: 'Highly positive, with enthusiasm for NYLA’s SocialFi integration as a "Venmo of Web3" and Algorand’s low-fee, eco-friendly infrastructure driving mass adoption.'
              },
              ecosystemHighlights: [
                'NYLA (SocialFi Payments, launched July 2025): Enables sending $ALGO and ASAs via X and Telegram handles, auto-generating wallets for recipients. Supports multichain (Solana, Ethereum, Algorand) and drives mass adoption, e.g., Sydney Sweeney onboarded with 6.9 $ALGO. Endorsed by Algorand Foundation.',
                'Pera Wallet (Official Wallet): Open-source wallet with NFT tracking, Mastercard integration via Immersve (2025), and Galxe partnership for ALGO/USDC rewards via on-chain quests.',
                'Folks Finance (DeFi Lending): Highest TVL DeFi protocol on Algorand. Launched xChain for cross-chain operations and xALGO liquid staking in 2025.',
                'Tinyman (DEX): Decentralized exchange for ASA trading, supporting liquid governance and DeFi liquidity.',
                'Algofi (Legacy DeFi protocol, ceased 2023): Early DeFi platform, now inactive but foundational for Algorand’s DeFi growth.',
                'NFDomains (Naming service): Provides user-friendly naming for Algorand wallets and assets.',
                'Koibanx (GovTech & Tokenized Infrastructure): Powers tokenized infrastructure for Latin American governments, e.g., El Salvador’s blockchain initiatives.',
                'Hex Trust (Institutional Staking, partnered 2025): Brings institutional-grade staking to Algorand, enhancing network security and participation.',
                'Zebec HQ (Card & Payroll Tools, integrated 2025): Integrates Algorand for crypto payroll and card services, expanding real-world payment use cases.',
                'Paycode (Digital Identity & Payments, partnered June 2025): Strengthens digital identity for secure, inclusive payments in Africa (e.g., Afghanistan, Ghana, Zambia).',
                'Lofty (Real-World Asset Tokenization): Tokenizes real estate for fractional ownership, integrated with CompX for yield optimization.',
                'World Chess (FIDE Online Arena, partnered 2025): Introduces portable, verifiable credentials for chess players, enhancing fairness and rewards.',
                'Monko (Meme Coin, 2025): Leading meme coin with creative art and strong community on Telegram/Discord. Highlighted by Algorand Foundation for driving engagement.',
                'Ballsack (Meme Coin, 2025): Humorous meme coin gaining traction on Vestige and Pera Wallet, part of Algorand’s vibrant meme scene.',
                'Gonna (Meme Coin, 2025): Lizard-themed meme coin with creative marketing, traded on Tinyman and Vestige, boosting community engagement.',
                'AlphaArcade (Gaming/Meme Project, 2025): Arcade-style gaming project with meme elements, leveraging Algorand’s low fees for in-game transactions.',
                'AKITA (Meme Coin/NFT, Ongoing): Community-driven meme coin with Akita Kennel Club NFTs, known for its loyal following and 2023 Meme of the Year contest.',
                'MOOJ (Meme Coin, 2025): Sustainable meme coin with a growing community, seen as a hidden gem with smart developers.',
                'Vestige V2 (Marketplace/Analytics, 2025): Upgraded platform for trading and analytics of Algorand assets, supporting meme coins and NFTs.',
                'CompX (DeFi/RWA, 2025): DeFi platform for yield optimization, integrated with Lofty for real estate tokenization and passive income.',
                'GORA (Oracle/Utility, Ongoing): Decentralized oracle network providing data feeds for Algorand dApps, enhancing DeFi and application functionality.',
                'Wormhole NTT Integration (Cross-Chain, July 2025): Enables seamless cross-chain token transfers across 40+ blockchains, led by Folks Finance.'
              ],
              foundation: {
                name: 'Algorand Foundation',
                role: 'Supports ecosystem growth, education, and decentralized governance (xGovs)',
                url: 'https://algorand.foundation',
                resources: [
                  'Developer Portal: developer.algorand.org',
                  'Documentation: docs.algorand.org',
                  'GitHub: github.com/algorand',
                  'Whitepaper: https://algorand.foundation/algorand-protocol'
                ]
              },
              security: {
                features: 'Post-quantum secure, VRF-based consensus for tamper-proof randomness',
                reliability: '100% network uptime since 2019 mainnet launch'
              },
              positioning: {
                usp: 'Eco-friendly, scalable, developer-friendly with no forks and instant finality',
                competitors: 'Competes with Ethereum, Solana, Cardano with lower fees and faster finality'
              }
            }
          },
          operationalModel: {
            supportedOperations: 'Transfer and swap tokens WITHIN the same blockchain network',
            criticalLimitation: 'NO operations BETWEEN different blockchain networks (no bridging)',
            examples: {
              solanaOperations: 'Solana wallet A → Solana wallet B (✅ Supported)',
              ethereumOperations: 'Ethereum wallet A → Ethereum wallet B (✅ Supported)',
              algorandOperations: 'Algorand wallet A → Algorand wallet B (✅ Supported)',
              crossChainAttempts: 'Solana → Ethereum, Ethereum → Algorand, any cross-network (❌ NOT Supported)'
            }
          },
          notSupported: ['Base', 'Polygon', 'Arbitrum', 'Optimism', 'BSC', 'any other blockchain networks'],
          keyMessage: 'NYLA supports 3 separate blockchain NETWORKS, each operating independently with no cross-network bridging'
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      // CRITICAL: Features vs Networks Distinction
      featuresVsNetworks: {
        content: {
          criticalDistinction: {
            networks: 'Blockchain NETWORKS are the infrastructure (Solana, Ethereum, Algorand)',
            features: 'FEATURES are the operations you can perform (transfer, swap, generate QR codes)',
            wrongStatement: 'NEVER say "NYLA supports 3 blockchain features"',
            correctStatement: 'ALWAYS say "NYLA supports 3 blockchain networks" or "NYLA operates on 3 blockchains"'
          },
          nylaFeatures: {
            actualFeatures: [
              'Transfer tokens (within same network)',
              'Swap tokens (within same network)', 
              'Generate QR codes',
              'Create X.com commands',
              'Community engagement (raids)'
            ],
            notFeatures: ['Solana', 'Ethereum', 'Algorand'] // These are NETWORKS, not features
          },
          nylaNetworks: {
            supportedNetworks: ['Solana network', 'Ethereum network', 'Algorand network'],
            networkLimitation: 'Each network operates independently - no cross-network operations',
            featureAvailability: 'Transfer and swap features work WITHIN each network separately'
          },
          correctExplanation: {
            structure: 'NYLA supports [FEATURES] on [NETWORKS]',
            example: 'NYLA supports transfer and swap features on Solana, Ethereum, and Algorand networks',
            emphasis: 'Features work within each network independently - no bridging between networks'
          }
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      // Platform Limitations & Telegram Support
      platformLimitations: {
        content: {
          nylagoSupported: 'NYLAGo currently ONLY supports X.com transfer command generation',
          nylagoLimitations: {
            telegramCommands: 'NYLAGo does NOT generate Telegram transfer commands yet',
            chatTransfers: 'NYLAGo does NOT support transfers or swaps from the chat window',
            explanation: 'NYLAGo is a command generator interface focused on X.com integration'
          },
          nylaSystemSupport: {
            telegram: 'NYLA system DOES support Telegram transfers, swaps, and LP operations',
            platforms: 'NYLA works on both X.com and Telegram independently',
            clarification: 'NYLA (the AI agent) supports Telegram, but NYLAGo (the interface) focuses on X.com only'
          },
          importantDistinction: {
            nyla: 'NYLA = The AI agent that executes transfers on multiple platforms including Telegram',
            nylago: 'NYLAGo = The command generator interface that currently only creates X.com commands'
          }
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      // Raid Feature Details
      raidFeature: {
        content: {
          purpose: 'Community engagement with NYLA-related X.com posts to create positive vibes',
          content: 'Features posts from the NYLA team, community members, or anyone mentioning $NYLA',
          access: 'Click the three dots button on the bottom-right of the screen',
          important: 'NOT for creating raids or attacks - it is for SUPPORTING and ENGAGING with NYLA content',
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
          transferCommand: 'Transfer tokens between users on the SAME blockchain only',
          swapCommand: 'Swap between different cryptocurrencies on the SAME blockchain only',
          criticalLimitation: 'IMPORTANT: All NYLA operations (transfer/swap) work within the SAME blockchain only - NO cross-chain bridging supported',
          transactionStatus: {
            process: 'After users send NYLA commands in X.com, NYLA will comment the transaction result on the post after the blockchain transaction finishes. The whole process usually takes about a minute.',
            timeline: 'Typically 1 minute from command post to transaction completion comment',
            feedback: 'NYLA comments on your X.com post with transaction results',
            tracking: 'Users can check their X.com post for NYLA response to see transaction status'
          }
        },
        lastFetched: Date.now(),
        status: 'static'
      },
      
      about: {
        content: {
          description: 'NYLA is an AI agent designed for cryptocurrency transfers and community building on social platforms.',
          features: [
            'Send tokens on multiple blockchains (Solana, Ethereum, Algorand)',
            'Generate QR codes for easy payments and receiving',
            'Social media integration with X (Twitter) for public transfers',
            'Community-driven engagement and interactions',
            'Progressive Web App (PWA) and Chrome Extension versions',
            'Multi-chain support with low fees'
          ],
          keyBenefits: [
            'Your social account is your wallet',
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
            'Multi-chain token transfers',
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
      
      // Telegram Integration Information
      telegramIntegration: {
        content: {
          nylaSupport: {
            available: 'NYLA (the AI agent) fully supports Telegram for transfers, swaps, and LP operations',
            features: ['Transfer tokens between users', 'Swap cryptocurrencies', 'Liquidity pool operations'],
            access: 'Users can interact with NYLA directly on Telegram for crypto operations'
          },
          nylagoLimitations: {
            commandGeneration: 'NYLAGo does NOT generate Telegram commands yet - only X.com commands',
            chatInterface: 'NYLAGo does NOT support transfers or swaps from within the chat interface',
            focus: 'NYLAGo is designed as an X.com command generator, not a Telegram interface'
          },
          clarification: {
            distinction: 'NYLA (AI agent) ≠ NYLAGo (command generator interface)',
            summary: 'NYLA works on Telegram independently, but NYLAGo focuses on X.com command generation only',
            futureSupport: 'Telegram command generation may be added to NYLAGo in future updates'
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
            '2. Enter recipient X username (without @)',
            '3. Specify amount and select blockchain',
            '4. Click Send to X.com to generate shareable command like: Hey @AgentNyla transfer 50 $NYLA @username',
            '5. Share the command on X - NYLA detects and executes the transfer',
            '6. NYLA comments on your X.com post with transaction results (usually takes about 1 minute)'
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
            solana: 'Extremely low fees (average around $0.0001 per transaction)',
            ethereum: 'Variable gas fees (depends on network congestion, typically $5-50+ per transaction)',
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
              a: 'Use the Send tab, enter recipient username, choose amount and token, select blockchain, then click Send to X.com to share your transfer command.'
            },
            {
              q: 'What are the transaction fees?',
              a: 'Only blockchain network fees apply - no additional NYLA fees. Solana: ~$0.0001, Ethereum: $5-$50+ (varies with gas), Algorand: ~$0.001.'
            },
            {
              q: 'How do I check transaction status?',
              a: 'After posting your NYLA command on X.com, NYLA will comment on your post with the transaction result. This usually takes about a minute to complete.'
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
      
      // Team and Development Information
      team: {
        content: {
          overview: 'NYLA is built by a passionate team of developers, designers, and community builders',
          nylaTeam: {
            founder: {
              name: '@shax_btc',
              role: 'NYLA Founder and Architecturer',
              responsibilities: 'Founded the NYLA project, handles smart contracts, backend systems, and core NYLA functionality',
              contact: 'https://x.com/shax_btc',
              project: 'NYLA (AI Agent)'
            },
            coFounder: {
              name: '@btcberries',
              role: 'NYLA Co-Founder, Social and Marketing Manager', 
              responsibilities: 'Co-founded NYLA, manages community engagement, social presence, marketing, and user feedback',
              contact: 'https://x.com/btcberries',
              project: 'NYLA (AI Agent)'
            },
            dev: {
              name: '@ChiefZ_SOL',
              role: 'NYLA Lead Developer', 
              responsibilities: 'Project development',
              contact: 'https://x.com/ChiefZ_SOL',
              project: 'NYLA (AI Agent)'
            },
            designer: {
              name: '@Noir0883',
              role: 'NYLA Visual Designer and Brand Artist',
              responsibilities: 'Creates visual branding, graphics, stickers, and artistic elements for the NYLA ecosystem',
              contact: 'https://x.com/Noir0883',
              specialties: 'Visual design, digital art, and brand identity',
              project: 'NYLA (AI Agent)'
            }
          },
          teamMembers: {
            development: {
              lead: 'Core developer and technical lead',
              contact: this.staticData.team.dev,
              role: 'Handles smart contracts, backend systems, and core NYLA functionality'
            },
            social: {
              lead: 'Community and social media manager',
              contact: this.staticData.team.social,
              role: 'Manages community engagement, social presence, and user feedback'
            },
            design: {
              lead: 'UI/UX designer and visual artist',
              contact: this.staticData.team.art,
              role: 'Creates user interface, graphics, stickers, and visual branding'
            }
          },
          keyDistinctions: {
            nylaTeam: 'NYLA Team: @shax_btc (founder), @btcberries (co-founder), @ChiefZ_SOL (Lead dev), @Noir0883 (visual designer)',
            projectSeparation: 'NYLA = AI agent that executes blockchain operations, NYLAGo = Interface tool for creating commands',
            collaboration: 'The projects work together - NYLA provides the AI functionality while NYLAGo provides the user interface'
          },
          philosophy: {
            mission: 'To democratize cryptocurrency transfers by making them as simple as sending a message to a friend',
            values: ['Simplicity over complexity', 'Community over isolation', 'Accessibility over exclusivity', 'Innovation over tradition'],
            approach: 'Community-driven development with continuous feedback and iteration'
          },
          contact: 'You can reach the founders and creators through their X.com profiles for questions, feedback, or collaboration'
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
   * Creates a minimal knowledge base for mobile devices
   * Contains only essential information to reduce memory usage
   */
  createMinimalKnowledgeBase() {
    return {
      // Essential NYLA information only
      nylagoCore: {
        content: {
          primaryPurpose: 'NYLAGo helps create NYLA transfer commands for X.com',
          howItWorks: {
            overview: 'Fill in recipient, amount, and token - generates transfer command',
            sendTab: 'Create transfer commands to send tokens',
            receiveTab: 'Generate QR codes for payment requests'
          }
        }
      },
      // Minimal blockchain info
      supportedBlockchains: {
        content: {
          summary: 'Supports Solana (default), Ethereum, and Algorand networks',
          supported: {
            solana: { name: 'Solana', description: 'Fast and low-cost' },
            ethereum: { name: 'Ethereum', description: 'Most established' },
            algorand: { name: 'Algorand', description: 'Pure proof-of-stake' }
          }
        }
      },
      // Basic NYLA commands
      nylaCommands: {
        content: {
          description: 'Hey @AgentNyla transfer [amount] $[token] @[username] [blockchain]'
        }
      }
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
        'What is the difference between Extension and PWA?',
        'How do I scan QR codes?'
      ],
      tokens: [
        'What is $NYLA token?',
        'Where can I buy $NYLA?',
        'What are the holder benefits?',
        'What is the contract address?'
      ],
      troubleshooting: [
        'Why is my transfer not working?',
        'How do I check my transaction status?',
        'QR code will not scan - help!',
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