/**
 * NYLA Knowledge Base Content Creator
 * Streamlines the process of adding new knowledge with automatic translation
 * Development tool for easy KB maintenance
 */

class NYLAKBContentCreator {
  constructor(options = {}) {
    this.options = {
      kbBasePath: '/pwa/kb',
      autoTranslate: true,
      autoGenerateHash: true,
      validateSchema: true,
      interactiveMode: false,
      ...options
    };
    
    this.translationService = null;
    this.chunkHygiene = null;
    this.initialized = false;
  }

  /**
   * Initialize the content creator
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🛠️ Initializing KB Content Creator...');
    
    // Initialize translation service
    if (this.options.autoTranslate) {
      this.translationService = new NYLALLMTranslationService({
        debugMode: true,
        fallbackToTemplate: true
      });
      await this.translationService.initialize();
    }
    
    // Initialize chunk hygiene for validation
    this.chunkHygiene = new NYLAChunkHygiene();
    
    this.initialized = true;
    console.log('✅ Content Creator ready');
  }

  /**
   * Create new knowledge chunk with automatic translation
   */
  async createKnowledgeChunk(englishContent, metadata) {
    await this.initialize();
    
    console.log('📝 Creating new knowledge chunk...');
    
    // Validate required metadata
    const validation = this.validateMetadata(metadata);
    if (!validation.valid) {
      throw new Error(`Invalid metadata: ${validation.errors.join(', ')}`);
    }
    
    // Generate chunk ID if not provided
    if (!metadata.id) {
      metadata.id = this.generateChunkId(metadata);
    }
    
    // Set defaults
    const chunk = {
      id: metadata.id,
      source_id: metadata.source_id || metadata.id.split('_').slice(0, -1).join('_'),
      type: metadata.type,
      lang: metadata.lang || 'bilingual',
      title: metadata.title,
      section: metadata.section || metadata.type,
      tags: metadata.tags || [],
      as_of: metadata.as_of || new Date().toISOString().split('T')[0],
      stability: metadata.stability || 'stable',
      source_url: metadata.source_url || 'internal://kb/' + metadata.type,
      hash: '',
      body: englishContent,
      priority: metadata.priority || 5,
      related_chunks: metadata.related_chunks || [],
      glossary_terms: metadata.glossary_terms || []
    };
    
    // Generate bilingual summaries
    if (this.options.autoTranslate) {
      console.log('🌐 Generating bilingual summaries...');
      
      try {
        const summaries = await this.translationService.generateBilingualSummaries(
          englishContent,
          {
            title: chunk.title,
            type: chunk.type,
            tags: chunk.tags
          }
        );
        
        chunk.summary_en = summaries.summary_en;
        chunk.summary_zh = summaries.summary_zh;
        
        console.log('✅ Summaries generated:');
        console.log('   EN:', chunk.summary_en);
        console.log('   ZH:', chunk.summary_zh);
        
      } catch (error) {
        console.error('❌ Summary generation failed:', error);
        
        // Fallback to placeholder
        chunk.summary_en = `${chunk.title} - Content about ${chunk.tags.join(', ')}`;
        chunk.summary_zh = `${chunk.title} - 相关内容：${chunk.tags.join('、')}`;
      }
    } else {
      // Manual summaries required
      if (!metadata.summary_en || !metadata.summary_zh) {
        throw new Error('Manual summaries (summary_en, summary_zh) required when autoTranslate is disabled');
      }
      chunk.summary_en = metadata.summary_en;
      chunk.summary_zh = metadata.summary_zh;
    }
    
    // Add exclude_from_tech if specified
    if (metadata.exclude_from_tech) {
      chunk.exclude_from_tech = true;
    }
    
    // Add marketing-specific fields
    if (chunk.type === 'marketing') {
      chunk.evidence_url = metadata.evidence_url || 'internal://marketing/unverified';
      chunk.verified = metadata.verified !== undefined ? metadata.verified : false;
    }
    
    // Generate content hash
    if (this.options.autoGenerateHash) {
      chunk.hash = await this.chunkHygiene.computeContentHash(chunk);
    }
    
    // Validate final chunk
    if (this.options.validateSchema) {
      const processed = await this.chunkHygiene.processChunk(chunk);
      if (!processed) {
        throw new Error('Chunk failed hygiene validation');
      }
      
      // Use processed chunk with hygiene metadata
      Object.assign(chunk, processed);
    }
    
    return chunk;
  }

  /**
   * Create knowledge chunks in batch
   */
  async createKnowledgeBatch(contentArray) {
    const chunks = [];
    const errors = [];
    
    console.log(`📦 Processing ${contentArray.length} knowledge items...`);
    
    for (let i = 0; i < contentArray.length; i++) {
      const { content, metadata } = contentArray[i];
      
      try {
        const chunk = await this.createKnowledgeChunk(content, metadata);
        chunks.push(chunk);
        
        console.log(`✅ [${i + 1}/${contentArray.length}] Created: ${chunk.id}`);
        
      } catch (error) {
        errors.push({
          index: i,
          metadata,
          error: error.message
        });
        
        console.error(`❌ [${i + 1}/${contentArray.length}] Failed:`, error.message);
      }
    }
    
    console.log(`\n📊 Batch complete: ${chunks.length} created, ${errors.length} failed`);
    
    return { chunks, errors };
  }

  /**
   * Add chunk to appropriate KB file
   */
  async addToKnowledgeBase(chunk, options = {}) {
    const { dryRun = false, createBackup = true } = options;
    
    // Determine target file
    const targetFile = this.getTargetFile(chunk);
    console.log(`📁 Target file: ${targetFile}`);
    
    if (dryRun) {
      console.log('🔍 DRY RUN - Would add to:', targetFile);
      return { file: targetFile, chunk, dryRun: true };
    }
    
    try {
      // Read existing file
      let kbData = { chunks: [] };
      
      if (typeof window !== 'undefined') {
        // Browser environment
        try {
          const response = await fetch(targetFile);
          if (response.ok) {
            kbData = await response.json();
          }
        } catch (error) {
          console.log('📄 Creating new KB file');
        }
      } else {
        // Node environment
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
          const filePath = path.join(process.cwd(), targetFile);
          const content = await fs.readFile(filePath, 'utf-8');
          kbData = JSON.parse(content);
        } catch (error) {
          console.log('📄 Creating new KB file');
        }
      }
      
      // Check for duplicates
      const existingIndex = kbData.chunks.findIndex(c => c.id === chunk.id);
      if (existingIndex >= 0) {
        console.log('🔄 Updating existing chunk:', chunk.id);
        kbData.chunks[existingIndex] = chunk;
      } else {
        console.log('➕ Adding new chunk:', chunk.id);
        kbData.chunks.push(chunk);
      }
      
      // Sort chunks by priority and ID
      kbData.chunks.sort((a, b) => {
        if (a.priority !== b.priority) {
          return (b.priority || 5) - (a.priority || 5);
        }
        return a.id.localeCompare(b.id);
      });
      
      // Save file (Node.js only for development)
      if (typeof window === 'undefined') {
        const fs = require('fs').promises;
        const path = require('path');
        
        const filePath = path.join(process.cwd(), targetFile);
        
        // Create backup if requested
        if (createBackup && existingIndex < 0) {
          try {
            await fs.copyFile(filePath, filePath + '.backup');
            console.log('💾 Backup created');
          } catch (error) {
            // File might not exist yet
          }
        }
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Write file
        await fs.writeFile(
          filePath,
          JSON.stringify(kbData, null, 2),
          'utf-8'
        );
        
        console.log('✅ Knowledge base updated:', targetFile);
      } else {
        console.log('⚠️ Browser environment - file save not available');
        console.log('📋 Copy this content to', targetFile);
        console.log(JSON.stringify(kbData, null, 2));
      }
      
      return { file: targetFile, chunk, success: true };
      
    } catch (error) {
      console.error('❌ Failed to update KB:', error);
      throw error;
    }
  }

  /**
   * Validate metadata
   */
  validateMetadata(metadata) {
    const errors = [];
    const required = ['type', 'title'];
    
    for (const field of required) {
      if (!metadata[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate type
    const validTypes = ['facts', 'howto', 'policy', 'faq', 'troubleshooting', 'about', 'integration', 'ecosystem', 'marketing'];
    if (metadata.type && !validTypes.includes(metadata.type)) {
      errors.push(`Invalid type: ${metadata.type}. Must be one of: ${validTypes.join(', ')}`);
    }
    
    // Validate stability
    if (metadata.stability && !['stable', 'volatile', 'evolving', 'deprecated'].includes(metadata.stability)) {
      errors.push('Invalid stability value');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate chunk ID
   */
  generateChunkId(metadata) {
    const { type, title, section } = metadata;
    
    // Clean title for ID
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Add section if provided
    const parts = [type];
    if (section && section !== type) {
      parts.push(section);
    }
    parts.push(cleanTitle);
    
    return parts.join('_');
  }

  /**
   * Determine target KB file
   */
  getTargetFile(chunk) {
    const { type, section } = chunk;
    
    // Map type to directory structure
    const typeMap = {
      'facts': 'facts',
      'howto': 'howto',
      'policy': 'policy',
      'faq': 'faq',
      'troubleshooting': 'troubleshooting',
      'about': 'about',
      'integration': 'ecosystem/integrations', // Facts-grade integration records
      'ecosystem': 'ecosystem', // Partnership/campaign content
      'marketing': 'marketing'
    };
    
    let dir = typeMap[type] || 'misc';
    let filename = section || type;
    
    // Handle integration type (facts-grade canonical records)
    if (type === 'integration') {
      const network = this.detectNetwork(chunk.tags) || this.extractChainFromEntity(chunk);
      if (network) {
        dir = `ecosystem/integrations/${network}`;
        filename = this.generateIntegrationFilename(chunk);
      } else {
        // Fallback without network
        dir = 'ecosystem/integrations';
        filename = this.generateIntegrationFilename(chunk);
      }
    }
    
    // Handle ecosystem subcategories with network-specific routing
    else if (type === 'ecosystem') {
      // Detect network from tags
      const network = this.detectNetwork(chunk.tags);
      
      if (chunk.tags.includes('integration') || chunk.tags.includes('protocol') || chunk.tags.includes('technical')) {
        dir = `ecosystem/integrations${network ? '/' + network : ''}`;
        filename = this.generateIntegrationFilename(chunk);
      } else if (chunk.tags.includes('partner') || chunk.tags.includes('partnership') || chunk.tags.includes('organization') || chunk.tags.includes('foundation')) {
        dir = `ecosystem/partners${network ? '/' + network : ''}`;
        filename = this.generatePartnerFilename(chunk);
      } else if (chunk.tags.includes('campaign') || chunk.tags.includes('marketing') || chunk.tags.includes('event')) {
        dir = 'ecosystem/campaigns';
        filename = this.generateCampaignFilename(chunk);
      } else {
        // Default ecosystem placement
        dir = `ecosystem/integrations${network ? '/' + network : ''}`;
        filename = 'general-integration';
      }
    }
    
    // Handle marketing subcategories
    if (type === 'marketing') {
      filename = chunk.tags.includes('brand') ? 'brand' :
                chunk.tags.includes('blog') ? 'blogs' :
                chunk.tags.includes('announcement') ? 'announcements' :
                chunk.tags.includes('pr') ? 'pr' : 'brand';
    }
    
    // Legacy special cases (preserve existing logic)
    if (type === 'facts' && chunk.tags.includes('network')) {
      filename = 'networks';
    } else if (type === 'howto' && chunk.tags.includes('transfer')) {
      filename = 'transfers';
    } else if (type === 'howto' && chunk.tags.includes('raid')) {
      filename = 'raids';
    }
    
    return `${this.options.kbBasePath}/${dir}/${filename}.json`;
  }

  /**
   * Detect network from tags
   */
  detectNetwork(tags) {
    const networkMap = {
      'solana': 'solana',
      'ethereum': 'ethereum', 
      'algorand': 'algorand',
      'polygon': 'polygon',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'avalanche': 'avalanche'
    };
    
    for (const tag of tags) {
      if (networkMap[tag.toLowerCase()]) {
        return networkMap[tag.toLowerCase()];
      }
    }
    
    return null;
  }

  /**
   * Extract chain from entity or metadata
   */
  extractChainFromEntity(chunk) {
    // Check if chunk has explicit chain field (new integration format)
    if (chunk.chain) {
      return chunk.chain.toLowerCase();
    }
    
    // Try to extract from entity name
    if (chunk.entity) {
      const entityLower = chunk.entity.toLowerCase();
      if (entityLower.includes('solana') || entityLower.includes('phantom')) return 'solana';
      if (entityLower.includes('ethereum') || entityLower.includes('metamask')) return 'ethereum';
      if (entityLower.includes('algorand') || entityLower.includes('pera')) return 'algorand';
    }
    
    // Try to extract from title
    if (chunk.title) {
      const titleLower = chunk.title.toLowerCase();
      if (titleLower.includes('solana')) return 'solana';
      if (titleLower.includes('ethereum')) return 'ethereum';
      if (titleLower.includes('algorand')) return 'algorand';
    }
    
    return null;
  }

  /**
   * Generate integration filename based on content
   */
  generateIntegrationFilename(chunk) {
    const { title, tags } = chunk;
    
    // Look for specific integration patterns
    if (tags.includes('jupiter') || title.toLowerCase().includes('jupiter')) {
      return 'jupiter-routing';
    }
    if (tags.includes('uniswap') || title.toLowerCase().includes('uniswap')) {
      return title.toLowerCase().includes('v3') ? 'uniswap-v3' : 'uniswap-v2';
    }
    if (tags.includes('pera') || title.toLowerCase().includes('pera')) {
      return 'pera-wallet';
    }
    if (tags.includes('phantom') || title.toLowerCase().includes('phantom')) {
      return 'phantom-wallet';
    }
    if (tags.includes('metamask') || title.toLowerCase().includes('metamask')) {
      return 'metamask-wallet';
    }
    
    // Generic patterns
    if (tags.includes('wallet')) {
      const walletName = this.extractEntityName(title, tags);
      return `${walletName}-wallet`;
    }
    if (tags.includes('dex') || tags.includes('exchange')) {
      const dexName = this.extractEntityName(title, tags);
      return `${dexName}-dex`;
    }
    if (tags.includes('protocol')) {
      const protocolName = this.extractEntityName(title, tags);
      return `${protocolName}-protocol`;
    }
    
    // Fallback
    return this.slugify(title) || 'general-integration';
  }

  /**
   * Generate partner filename based on content
   */
  generatePartnerFilename(chunk) {
    const { title, tags } = chunk;
    
    // Look for foundation patterns
    if (tags.includes('foundation') || title.toLowerCase().includes('foundation')) {
      if (tags.includes('solana') || title.toLowerCase().includes('solana')) {
        return 'solana-foundation';
      }
      if (tags.includes('algorand') || title.toLowerCase().includes('algorand')) {
        return 'algorand-foundation';
      }
      if (tags.includes('ethereum') || title.toLowerCase().includes('ethereum')) {
        return 'ethereum-foundation';
      }
      
      const foundationName = this.extractEntityName(title, tags);
      return `${foundationName}-foundation`;
    }
    
    // Generic partner naming
    const partnerName = this.extractEntityName(title, tags);
    return `${partnerName}-partnership`;
  }

  /**
   * Generate campaign filename based on content and date
   */
  generateCampaignFilename(chunk) {
    const { title, tags, as_of } = chunk;
    
    // Extract year and quarter/month from as_of date or current date
    const date = new Date(as_of || Date.now());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Look for campaign patterns
    let campaignName = '';
    
    // Priority order: specific events first, then generic patterns
    if (title.toLowerCase().includes('ethdenver')) {
      campaignName = 'ethdenver';
    } else if (title.toLowerCase().includes('breakpoint')) {
      campaignName = 'breakpoint';
    } else if (title.toLowerCase().includes('launch')) {
      campaignName = 'launch';
    } else if (title.toLowerCase().includes('hackathon')) {
      campaignName = 'hackathon';
    } else {
      campaignName = this.slugify(title).split('-')[0] || 'campaign';
    }
    
    // Detect network for cross-promotion campaigns
    const network = this.detectNetwork(tags);
    const networkPart = network ? `-${network}` : '';
    
    return `${year}-${month}-nyla-x${networkPart}-${campaignName}`;
  }

  /**
   * Extract main entity name from title and tags
   */
  extractEntityName(title, tags) {
    // Try to extract from known entities in tags first
    const knownEntities = [
      'jupiter', 'uniswap', 'phantom', 'metamask', 'pera', 'backpack',
      'solana', 'ethereum', 'algorand', 'polygon', 'orca', 'raydium'
    ];
    
    for (const tag of tags) {
      if (knownEntities.includes(tag.toLowerCase())) {
        return tag.toLowerCase();
      }
    }
    
    // Try to extract from title
    const titleWords = title.toLowerCase().split(/\s+/);
    for (const word of titleWords) {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (knownEntities.includes(cleanWord) || cleanWord.length > 3) {
        return cleanWord;
      }
    }
    
    // Fallback to first meaningful word from title
    return this.slugify(title).split('-')[0] || 'unknown';
  }

  /**
   * Convert string to URL-friendly slug
   */
  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Interactive content creation (for CLI usage)
   */
  async interactiveCreate() {
    console.log('🎯 Interactive KB Content Creation\n');
    
    // This would normally use readline or inquirer for CLI interaction
    // For now, return example structure
    
    const example = {
      content: "NYLA supports three blockchain networks: Solana, Ethereum, and Polygon. Each network has different characteristics. Solana offers high speed and low fees, Ethereum provides the most liquidity and DeFi options, while Polygon offers a good balance of speed and cost as an Ethereum Layer 2 solution.",
      metadata: {
        type: "facts",
        title: "NYLA Supported Blockchain Networks",
        section: "networks",
        tags: ["blockchain", "networks", "solana", "ethereum", "polygon"],
        priority: 8,
        stability: "stable",
        source_url: "https://docs.nyla.ai/networks"
      }
    };
    
    console.log('📋 Example content structure:');
    console.log(JSON.stringify(example, null, 2));
    
    console.log('\n💡 To create content programmatically:');
    console.log('const creator = new NYLAKBContentCreator();');
    console.log('const chunk = await creator.createKnowledgeChunk(content, metadata);');
    console.log('await creator.addToKnowledgeBase(chunk);');
    
    return example;
  }

  /**
   * Get content creation statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      autoTranslate: this.options.autoTranslate,
      translationServiceReady: this.translationService?.initialized || false,
      translationStats: this.translationService?.getStats() || null
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAKBContentCreator;
}
window.NYLAKBContentCreator = NYLAKBContentCreator;