/**
 * NYLA Semantic Retriever
 * Semantic-first retrieval with minimal high-precision guardrails
 * Replaces rule-based logic with multilingual dense retrieval + cross-encoder rerank
 */

class NYLASemanticRetriever {
  constructor(vectorDB, embeddingService, options = {}) {
    this.vectorDB = vectorDB;
    this.embeddingService = embeddingService;
    
    this.options = {
      topK: 25,              // Dense retrieval top-k (BM25/Dense = 25 each)
      bm25TopK: 25,          // BM25 top-k (BM25/Dense = 25 each)  
      crossEncoderTopK: 15,  // Cross-encoder topK1 = 15
      fusionTopK: 12,        // Working-set fusion topK0/1 = 12
      parentTopK: 3,         // Parent-child aggregation topK_parent = 3
      finalTopK: 3,          // Final context segments = 3
      minScore: 0.3,         // Quality threshold
      highSimilarityThreshold: 0.8, // Score-driven strategy threshold
      mmrEnabled: true,      // Enable MMR for diversity
      mmrLambda: 0.5,        // Balance relevance vs diversity
      crossEncoderEnabled: true,  // Enable cross-encoder reranking
      parentChildEnabled: true,   // Enable parent-child aggregation
      scoreStrategyEnabled: true, // Enable score-driven strategy switch
      // Phase 2: BM25 hybrid retrieval options
      bm25Enabled: true,     // Enable BM25 retrieval
      dynamicWeighting: true, // Enable dynamic BM25/Dense weighting
      baseBm25Weight: 0.3,   // Base BM25 weight (when no exact signals)
      baseVectorWeight: 0.7, // Base vector weight (when no exact signals)
      maxBm25Weight: 0.8,    // Maximum BM25 weight (with many exact signals)
      minVectorWeight: 0.2,  // Minimum vector weight (with many exact signals)
      ...options
    };
    
    // Phase 2: Initialize BM25 index
    this.bm25Index = null;
    this.bm25Ready = false;
    
    // Phase 3: Language consistency checking
    this.languageConsistency = null;
    this.initializeLanguageConsistency();
    
    // High-precision exact-match patterns (keep these minimal)
    this.exactPatterns = {
      ethAddress: /^0x[a-fA-F0-9]{40}$/,
      ethTxHash: /^0x[a-fA-F0-9]{64}$/,
      solanaAddress: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
      xHandle: /@([A-Za-z0-9_]{1,15})/g,
      ticker: /\$([A-Z0-9]{2,10})\b/g,
      numberWithUnit: /(\d+(?:\.\d+)?)\s*(USD|SOL|ALGO|ETH|%|s|min|hrs?|days?)\b/gi
    };
    
    // Glossary for query expansion (will be loaded from /glossary/terms.json)
    this.glossary = new Map();
    this.loadGlossary();
    
    // Phase 2: Initialize BM25 index if available
    this.initializeBM25Index();
  }
  
  /**
   * Phase 3: Initialize language consistency service
   */
  initializeLanguageConsistency() {
    try {
      if (typeof window.NYLALanguageConsistency === 'undefined') {
        console.warn('⚠️ NYLALanguageConsistency not available, language consistency disabled');
        return;
      }
      
      this.languageConsistency = new window.NYLALanguageConsistency({
        enableLanguageDetection: true,
        enableConsistencyChecking: true,
        enableSelfRepair: true,
        consistencyThreshold: 0.7,
        maxRepairAttempts: 2
      });
      
      console.log('🌎 Language consistency service initialized');
      
    } catch (error) {
      console.warn('⚠️ Failed to initialize language consistency service:', error.message);
    }
  }
  
  /**
   * Phase 2: Initialize BM25 index for hybrid retrieval
   */
  async initializeBM25Index() {
    try {
      if (typeof window.NYLABm25Index === 'undefined') {
        console.warn('⚠️ NYLABm25Index not available, hybrid retrieval disabled');
        this.options.bm25Enabled = false;
        return;
      }
      
      this.bm25Index = new window.NYLABm25Index({
        k1: 1.2,
        b: 0.75,
        minScore: 0.1,
        maxResults: this.options.bm25TopK
      });
      
      console.log('🔍 BM25 index initialized, waiting for chunks to build index...');
      
    } catch (error) {
      console.warn('⚠️ Failed to initialize BM25 index:', error.message);
      this.options.bm25Enabled = false;
    }
  }
  
  /**
   * Phase 2: Build BM25 index from vector DB chunks
   */
  async buildBM25Index(chunks) {
    if (!this.bm25Index || !this.options.bm25Enabled) {
      return false;
    }
    
    try {
      await this.bm25Index.buildIndex(chunks);
      this.bm25Ready = true;
      console.log('✅ BM25 index built successfully for hybrid retrieval');
      return true;
    } catch (error) {
      console.warn('⚠️ Failed to build BM25 index:', error.message);
      this.bm25Ready = false;
      return false;
    }
  }

  /**
   * Load bilingual glossary for query expansion
   */
  async loadGlossary() {
    try {
      const response = await fetch('/glossary/terms.json');
      if (response.ok) {
        const glossaryData = await response.json();
        
        // Build bidirectional term mapping
        for (const [en, translations] of Object.entries(glossaryData)) {
          this.glossary.set(en.toLowerCase(), translations);
          
          // Add reverse mappings (CN -> EN)
          if (translations.zh) {
            for (const zh of translations.zh) {
              if (!this.glossary.has(zh)) {
                this.glossary.set(zh, { en: [en] });
              }
            }
          }
        }
        
        console.log('✅ Loaded glossary with', this.glossary.size, 'term mappings');
      }
    } catch (error) {
      console.warn('⚠️ Could not load glossary:', error.message);
    }
  }

  /**
   * Main retrieval method - semantic-first with minimal guardrails
   */
  async retrieve(query, options = {}) {
    const config = { ...this.options, ...options };
    
    console.log(`🔍 Semantic retrieval for: "${query}"`);
    
    try {
      // 1. QUERY PREP: Detect exact signals & expand via glossary
      const processedQuery = await this.prepareQuery(query);
      
      // 2. RETRIEVE: Dense + BM25 (dynamic weighting)
      const retrievalResults = await this.performRetrieval(processedQuery, config);
      
      // 3. RERANK: Cross-encoder + MMR for diversity
      const rerankedResults = await this.rerankResults(retrievalResults, processedQuery, config);
      
      // 4. FILTER: Metadata gates & deduplication
      const filteredResults = this.applyMetadataFilters(rerankedResults, processedQuery, config);
      
      // Phase 3: Language consistency checking and self-repair
      let finalResults = filteredResults.slice(0, config.finalTopK);
      if (this.languageConsistency) {
        const consistencyResult = await this.applyLanguageConsistency(query, finalResults, config);
        if (consistencyResult.applied) {
          finalResults = consistencyResult.results;
        }
      }
      
      console.log('📊 Retrieval summary:', {
        query: query,
        hasExactSignals: processedQuery.exactSignals.length > 0,
        hasSlotIntents: processedQuery.slotIntents?.length > 0,
        denseResults: retrievalResults.dense?.length || 0,
        bm25Results: retrievalResults.bm25?.length || 0,
        filteredResults: filteredResults.length,
        finalResults: finalResults.length,
        topScore: finalResults[0]?.finalScore?.toFixed(3),
        languageConsistencyApplied: this.languageConsistency ? true : false
      });
      
      return finalResults;
      
    } catch (error) {
      console.error('❌ Semantic retrieval failed:', error);
      throw error;
    }
  }

  /**
   * 1. QUERY PREP: Detect slot intents, exact signals & expand via glossary
   */
  async prepareQuery(query) {
    // Phase 1 Enhancement: Detect slot intents via keyword matching
    const slotIntents = this.detectSlotIntents(query);
    
    // Detect exact signals (addresses, tickers, handles, etc.)
    const exactSignals = this.detectExactSignals(query);
    
    // Expand via glossary (EN↔ZH, no regex trees)
    const expandedQuery = this.expandQueryViaGlossary(query);
    
    // Determine query type from slot intents and detected signals
    const queryType = this.inferQueryType(exactSignals, slotIntents);
    
    return {
      original: query,
      expanded: expandedQuery,
      slotIntents: slotIntents,
      exactSignals: exactSignals,
      queryType: queryType,
      needsBM25: exactSignals.length > 0 || slotIntents.length > 0 // Use BM25 when intents/signals found
    };
  }
  
  /**
   * Phase 1: Detect slot intents via keyword matching
   * Routes queries to appropriate Facts database or specialized retrieval
   */
  detectSlotIntents(query) {
    const intents = [];
    const queryLower = query.toLowerCase();
    
    // Contract Address Intent (合約/CA)
    const contractKeywords = [
      'contract address', 'contract', 'ca', 'smart contract',
      '合約', '合約地址', '合同地址', '智能合約地址', '智能合约地址'
    ];
    if (contractKeywords.some(keyword => queryLower.includes(keyword))) {
      intents.push({
        type: 'contract_address',
        confidence: 0.9,
        keywords: contractKeywords.filter(k => queryLower.includes(k))
      });
    }
    
    // Official Channel Intent
    const channelKeywords = [
      'official', 'twitter', 'telegram', 'discord', 'website', 'channel',
      '官方', '推特', '電報', '網站', '頻道', '社群', 'x.com', 't.me'
    ];
    if (channelKeywords.some(keyword => queryLower.includes(keyword))) {
      intents.push({
        type: 'official_channel',
        confidence: 0.8,
        keywords: channelKeywords.filter(k => queryLower.includes(k))
      });
    }
    
    // Ticker Symbol Intent - Enhanced Pattern Detection
    const tickerKeywords = [
      'ticker', 'symbol', 'token symbol', 'coin symbol',
      '代號', '符號', '代幣符號', '幣種符號'
    ];
    
    // Price-related context keywords
    const priceKeywords = [
      'price', 'cost', 'value', 'worth', 'market cap', 'mcap', 'volume',
      'trading', 'buy', 'sell', 'exchange', 'rate', 'usd', 'dollar',
      '價格', '價錢', '成本', '市值', '交易', '買', '賣', '匯率'
    ];
    
    const hasTickerKeyword = tickerKeywords.some(keyword => queryLower.includes(keyword));
    const hasPriceKeyword = priceKeywords.some(keyword => queryLower.includes(keyword));
    const tickerMatches = query.match(/\$([A-Z0-9]{2,10})\b/g);
    const hasTickerSymbol = tickerMatches && tickerMatches.length > 0;
    
    // Detect ticker intents with enhanced pattern matching
    if (hasTickerKeyword || (hasTickerSymbol && hasPriceKeyword) || hasTickerSymbol) {
      intents.push({
        type: 'ticker_symbol',
        confidence: hasTickerKeyword ? 0.8 : hasTickerSymbol ? 0.9 : 0.7,
        keywords: hasTickerSymbol ? tickerMatches : tickerKeywords.filter(k => queryLower.includes(k))
      });
    }
    
    // Technical Specs Intent
    const techKeywords = [
      'blockchain', 'tps', 'consensus', 'fee', 'gas', 'network',
      '區塊鏈', '共識', '手續費', '網路', '技術', '規格'
    ];
    if (techKeywords.some(keyword => queryLower.includes(keyword))) {
      intents.push({
        type: 'technical_specs',
        confidence: 0.7,
        keywords: techKeywords.filter(k => queryLower.includes(k))
      });
    }
    
    // How-to Intent
    const howtoKeywords = [
      'how to', 'how do', 'steps', 'tutorial', 'guide',
      '如何', '怎麼', '步驟', '教程', '指南'
    ];
    if (howtoKeywords.some(keyword => queryLower.includes(keyword))) {
      intents.push({
        type: 'how_to',
        confidence: 0.8,
        keywords: howtoKeywords.filter(k => queryLower.includes(k))
      });
    }
    
    console.log('🎯 Slot intents detected:', intents);
    return intents;
  }

  /**
   * Detect high-precision exact signals
   */
  detectExactSignals(query) {
    const signals = [];
    
    // Ethereum addresses
    if (this.exactPatterns.ethAddress.test(query)) {
      signals.push({ type: 'eth_address', value: query.match(this.exactPatterns.ethAddress)[0] });
    }
    
    // Ethereum transaction hashes
    if (this.exactPatterns.ethTxHash.test(query)) {
      signals.push({ type: 'eth_tx', value: query.match(this.exactPatterns.ethTxHash)[0] });
    }
    
    // Solana addresses
    if (this.exactPatterns.solanaAddress.test(query)) {
      signals.push({ type: 'solana_address', value: query.match(this.exactPatterns.solanaAddress)[0] });
    }
    
    // X handles - optimize: direct iteration without Array.from
    for (const match of query.matchAll(this.exactPatterns.xHandle)) {
      signals.push({ type: 'x_handle', value: match[1] });
    }
    
    // Tickers/symbols - optimize: direct iteration
    for (const match of query.matchAll(this.exactPatterns.ticker)) {
      signals.push({ type: 'ticker', value: match[1] });
    }
    
    // Numbers with units - optimize: direct iteration
    for (const match of query.matchAll(this.exactPatterns.numberWithUnit)) {
      signals.push({ type: 'number_with_unit', value: match[0], number: match[1], unit: match[2] });
    }
    
    return signals;
  }

  /**
   * Expand query via glossary (single-pass, bidirectional)
   */
  expandQueryViaGlossary(query) {
    let expanded = query;
    const words = query.toLowerCase().split(/\s+/);
    const expansions = new Set();
    
    for (const word of words) {
      const cleanWord = word.replace(/[^\w\u4e00-\u9fff]/g, ''); // Keep alphanumeric + Chinese
      
      if (this.glossary.has(cleanWord)) {
        const translations = this.glossary.get(cleanWord);
        
        // Add English translations
        if (translations.en) {
          translations.en.forEach(term => expansions.add(term));
        }
        
        // Add Chinese translations
        if (translations.zh) {
          translations.zh.forEach(term => expansions.add(term));
        }
      }
    }
    
    // Append expansions to original query
    if (expansions.size > 0) {
      expanded = query + ' ' + [...expansions].join(' ');
      console.log('🔄 Query expanded:', { original: query, expanded: expanded });
    }
    
    return expanded;
  }

  /**
   * Infer query type from slot intents and exact signals
   */
  inferQueryType(exactSignals, slotIntents) {
    // Prioritize slot intents over exact signals
    if (slotIntents.length > 0) {
      const intentTypes = slotIntents.map(intent => intent.type);
      
      if (intentTypes.includes('contract_address')) {
        return 'facts_lookup'; // Direct Facts database lookup
      }
      
      if (intentTypes.includes('official_channel')) {
        return 'facts_lookup'; // Direct Facts database lookup
      }
      
      if (intentTypes.includes('ticker_symbol')) {
        return 'facts_lookup'; // Direct Facts database lookup
      }
      
      if (intentTypes.includes('technical_specs')) {
        return 'facts_technical'; // Technical specs retrieval
      }
      
      if (intentTypes.includes('how_to')) {
        return 'how_to_guide'; // How-to guide retrieval
      }
    }
    
    // Fallback to exact signal inference
    if (exactSignals.length === 0) return 'semantic';
    
    const signalTypes = exactSignals.map(s => s.type);
    
    if (signalTypes.includes('eth_address') || signalTypes.includes('solana_address')) {
      return 'integration_support';  // Route to verified integrations
    }
    
    if (signalTypes.includes('ticker') || signalTypes.includes('number_unit')) {
      return 'facts_technical';      // Route to facts/technical specs
    }
    
    if (signalTypes.includes('x_handle')) {
      return 'integration_support';  // Social integration queries
    }
    
    return 'mixed';
  }

  /**
   * 2. RETRIEVE: Phase 2 Enhanced - Dynamic hybrid (dense + BM25 with adaptive weighting)
   */
  async performRetrieval(processedQuery, config) {
    const results = {};
    
    // Always do dense retrieval with multilingual embeddings
    const denseEmbedding = await this.embeddingService.embed(processedQuery.expanded);
    results.dense = await this.vectorDB.search(denseEmbedding, config.topK);
    
    // Phase 2: BM25 retrieval using search_text field
    if (processedQuery.needsBM25 && this.bm25Ready && config.bm25Enabled) {
      console.log('🔍 Phase 2: Performing BM25 + Dense hybrid retrieval');
      
      try {
        results.bm25 = await this.bm25Index.search(processedQuery.original, config.bm25TopK);
        
        // Phase 2: Dynamic weighting based on slot intents and exact signals
        const weights = this.calculateDynamicWeights(processedQuery);
        
        console.log('⚖️ Phase 2 Dynamic weighting:', {
          bm25: weights.bm25Weight.toFixed(3),
          dense: weights.denseWeight.toFixed(3),
          reason: weights.reason,
          exactSignals: processedQuery.exactSignals.length,
          slotIntents: processedQuery.slotIntents.length
        });
        
        // Merge and dedupe by source_id/hash with dynamic weights
        results.merged = this.mergeAndDedupe(results.dense, results.bm25, weights.denseWeight, weights.bm25Weight);
        
      } catch (error) {
        console.warn('⚠️ BM25 search failed, falling back to dense-only:', error.message);
        results.merged = this.createDenseOnlyResults(results.dense);
      }
      
    } else if (processedQuery.needsBM25 && this.vectorDB.searchBM25) {
      // Fallback: Use legacy vector DB BM25 if available
      console.log('🔍 Fallback: Using legacy vector DB BM25');
      results.bm25 = await this.vectorDB.searchBM25(processedQuery.original, config.bm25TopK);
      
      const bm25Weight = Math.min(0.4 + (processedQuery.exactSignals.length * 0.1), 0.8);
      const denseWeight = 1.0 - bm25Weight;
      
      results.merged = this.mergeAndDedupe(results.dense, results.bm25, denseWeight, bm25Weight);
      
    } else {
      // Dense-only retrieval
      results.merged = this.createDenseOnlyResults(results.dense);
    }
    
    return results;
  }
  
  /**
   * Phase 2: Calculate dynamic weights based on query characteristics
   */
  calculateDynamicWeights(processedQuery) {
    const { slotIntents, exactSignals } = processedQuery;
    
    // Base weights
    let bm25Weight = this.options.baseBm25Weight;
    let reason = 'base_weights';
    
    // Boost BM25 for slot intent queries (Facts lookup) - Optimized Weights
    if (slotIntents.length > 0) {
      const intentTypes = slotIntents.map(intent => intent.type);
      
      if (intentTypes.includes('contract_address')) {
        bm25Weight = 0.8; // Very high BM25 weight for contract addresses (exact facts)
        reason = 'contract_address_intent';
      } else if (intentTypes.includes('ticker_symbol')) {
        bm25Weight = 0.75; // High BM25 weight for ticker symbols
        reason = 'ticker_symbol_intent';
      } else if (intentTypes.includes('official_channel')) {
        bm25Weight = 0.65; // Medium-high BM25 weight for official links (increased)
        reason = 'official_channel_intent';
      } else if (intentTypes.includes('technical_specs')) {
        bm25Weight = 0.45; // Medium BM25 weight for technical specs (favor semantic)
        reason = 'technical_specs_intent';
      }
    }
    
    // Additional boost for exact signals (addresses, tickers, handles)
    if (exactSignals.length > 0) {
      const signalBoost = Math.min(exactSignals.length * 0.1, 0.2);
      bm25Weight = Math.min(bm25Weight + signalBoost, this.options.maxBm25Weight);
      reason += '_with_exact_signals';
    }
    
    // Ensure minimum vector weight
    const denseWeight = Math.max(1.0 - bm25Weight, this.options.minVectorWeight);
    bm25Weight = 1.0 - denseWeight; // Recalculate to maintain sum = 1.0
    
    return {
      bm25Weight,
      denseWeight,
      reason
    };
  }
  
  /**
   * Create dense-only results with proper format
   */
  createDenseOnlyResults(denseResults) {
    const results = denseResults.map(result => ({
      ...result,
      finalScore: result.score, // Copy score to finalScore for filtering
      sources: ['dense']
    }));
    
    console.log('🔍 Dense-only results:', {
      count: results.length,
      topScores: results.slice(0, 2).map(r => ({ id: r.id, finalScore: r.finalScore?.toFixed(4) }))
    });
    
    return results;
  }

  /**
   * Merge dense + BM25 results with dynamic weighting
   */
  mergeAndDedupe(denseResults, bm25Results, denseWeight, bm25Weight) {
    const merged = new Map(); // Dedupe by source_id or content hash
    
    console.log('🔍 Merge Debug - Input:', {
      denseCount: denseResults.length,
      bm25Count: bm25Results.length,
      denseWeight: denseWeight.toFixed(3),
      bm25Weight: bm25Weight.toFixed(3),
      topDenseScores: denseResults.slice(0, 2).map(r => ({ id: r.id, score: r.score?.toFixed(4) }))
    });
    
    // Add dense results
    for (const result of denseResults) {
      const key = result.metadata?.source_id || result.id;
      if (!merged.has(key)) {
        const finalScore = result.score * denseWeight;
        merged.set(key, {
          ...result,
          finalScore: finalScore,
          sources: ['dense']
        });
        
        if (merged.size <= 2) { // Debug first few
          console.log('🔍 Added dense result:', { id: result.id, originalScore: result.score?.toFixed(4), finalScore: finalScore.toFixed(4) });
        }
      }
    }
    
    // Add BM25 results (boost if already exists)
    for (const result of bm25Results || []) {
      const key = result.metadata?.source_id || result.id;
      
      if (merged.has(key)) {
        // Boost existing result
        const existing = merged.get(key);
        existing.finalScore += result.score * bm25Weight;
        existing.sources.push('bm25');
      } else {
        // Add new result
        merged.set(key, {
          ...result,
          finalScore: result.score * bm25Weight,
          sources: ['bm25']
        });
      }
    }
    
    // Return sorted by final score
    // Optimize: collect and sort in single operation
    const sortedResults = [];
    for (const result of merged.values()) {
      sortedResults.push(result);
    }
    sortedResults.sort((a, b) => b.finalScore - a.finalScore);
    
    console.log('🔍 Merge Debug - Output:', {
      mergedCount: sortedResults.length,
      topFinalScores: sortedResults.slice(0, 2).map(r => ({ id: r.id, finalScore: r.finalScore?.toFixed(4) }))
    });
    
    return sortedResults;
  }

  /**
   * 3. RERANK: Working-set fusion + Cross-encoder + Parent-child aggregation + Score-driven MMR
   */
  async rerankResults(retrievalResults, processedQuery, config) {
    let results = retrievalResults.merged || retrievalResults.dense;
    
    console.log(`🔄 Starting reranking pipeline with ${results.length} initial results...`);
    
    // Step 1: Working-set fusion (topK0/1 = 12)
    results = this.applyWorkingSetFusion(results, config.fusionTopK);
    
    // Step 2: Cross-encoder reranking (topK1 = 15)
    if (config.crossEncoderEnabled && window.NYLACrossEncoder) {
      console.log('🎯 Applying cross-encoder reranking...');
      const crossEncoder = new window.NYLACrossEncoder();
      results = await crossEncoder.rerank(processedQuery.original, results, config.crossEncoderTopK);
    }
    
    // Step 3: Parent-child aggregation (topK_parent = 3)
    if (config.parentChildEnabled && window.NYLAParentChildAggregator) {
      console.log('🏗️ Applying parent-child aggregation...');
      const aggregator = new window.NYLAParentChildAggregator();
      results = await aggregator.aggregateToParents(results, config.parentTopK);
    }
    
    // Step 4: Score-driven MMR strategy
    results = await this.applyScoreDrivenStrategy(results, processedQuery, config);
    
    return results;
  }

  /**
   * 4. FILTER: Metadata gates & volatile chunk downweighting
   */
  applyMetadataFilters(results, processedQuery, config) {
    console.log('🔍 Filtering Debug - Input:', {
      resultsCount: results.length,
      queryType: processedQuery.queryType,
      minScore: config.minScore,
      topScores: results.slice(0, 3).map(r => ({ id: r.id, score: r.finalScore?.toFixed(4) }))
    });

    const filtered = results.filter(result => {
      // Route support/compatibility queries to verified integrations
      if (processedQuery.queryType === 'integration_support') {
        const metadata = result.metadata || {};
        if (metadata.type === 'integration') {
          // Only include verified and live/beta integrations
          if (!metadata.verified || !['beta', 'live'].includes(metadata.status)) {
            console.log('🚫 Filtered unverified integration:', result.id);
            return false;
          }
        }
      }
      
      // Exclude marketing/campaigns for technical queries by default
      if (processedQuery.queryType === 'facts_technical') {
        if (result.metadata?.excludeFromTech === true) {
          console.log('🚫 Filtered marketing content:', result.id);
          return false;
        }
      }
      
      // Downweight stale volatile chunks (but don't exclude completely)
      if (result.metadata?.volatile === true && result.metadata?.as_of) {
        const asOfDate = new Date(result.metadata.as_of);
        const daysSinceUpdate = (Date.now() - asOfDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate > 7) {
          result.finalScore *= 0.5; // Reduce score for stale volatile content
          console.log('📉 Downweighted stale volatile chunk:', result.id, `(${daysSinceUpdate.toFixed(1)} days old)`);
        }
      }
      
      // Apply minimum score threshold with debugging
      const passesThreshold = result.finalScore >= config.minScore;
      if (!passesThreshold) {
        console.log('🚫 Filtered by score threshold:', { 
          id: result.id, 
          score: result.finalScore?.toFixed(4), 
          threshold: config.minScore,
          title: result.metadata?.title 
        });
      }
      
      return passesThreshold;
    }).sort((a, b) => b.finalScore - a.finalScore);

    console.log('🔍 Filtering Debug - Output:', {
      originalCount: results.length,
      filteredCount: filtered.length,
      removedCount: results.length - filtered.length
    });

    return filtered;
  }
  
  /**
   * Phase 3: Apply language consistency checking and self-repair
   */
  async applyLanguageConsistency(query, results, config) {
    if (!this.languageConsistency || results.length === 0) {
      return { applied: false, reason: 'no_consistency_service' };
    }
    
    try {
      console.log('🌎 Phase 3: Analyzing language consistency...');
      
      // Analyze consistency
      const analysis = this.languageConsistency.analyzeConsistency(query, results);
      
      if (analysis.consistent) {
        console.log('✅ Language consistency check passed:', analysis.consistency.overall.toFixed(3));
        return { applied: false, reason: 'already_consistent', analysis };
      }
      
      console.log('⚠️ Language consistency issues detected:', {
        score: analysis.consistency.overall.toFixed(3),
        threshold: config.consistencyThreshold || 0.7,
        recommendations: analysis.recommendations.length
      });
      
      // Attempt self-repair
      const repairResult = await this.languageConsistency.attemptSelfRepair(query, results, analysis);
      
      if (repairResult.repaired) {
        console.log('✅ Language consistency self-repair successful:', {
          improvement: repairResult.improvement.toFixed(3),
          attempts: repairResult.attempts,
          finalScore: repairResult.repairedScore.toFixed(3)
        });
        
        return {
          applied: true,
          reason: 'self_repair_successful',
          results: repairResult.repairedChunks,
          analysis,
          repairResult
        };
      } else {
        console.log('⚠️ Language consistency self-repair failed or insufficient improvement');
        return {
          applied: false,
          reason: 'self_repair_failed',
          results,
          analysis,
          repairResult
        };
      }
      
    } catch (error) {
      console.warn('⚠️ Language consistency check failed:', error.message);
      return { applied: false, reason: 'consistency_check_error', error: error.message };
    }
  }

  /**
   * Working-set fusion: Combine and limit candidates before cross-encoder
   */
  applyWorkingSetFusion(results, fusionTopK) {
    console.log(`🔗 Working-set fusion: limiting to ${fusionTopK} candidates`);
    
    // Sort by current scores and take top fusionTopK
    const fused = results
      .sort((a, b) => (b.finalScore || b.score || 0) - (a.finalScore || a.score || 0))
      .slice(0, fusionTopK)
      .map((result, index) => ({
        ...result,
        fusionRank: index + 1
      }));
    
    console.log(`✅ Working-set fusion: reduced from ${results.length} to ${fused.length} candidates`);
    
    return fused;
  }
  
  /**
   * Score-driven strategy: Bypass MMR for high-similarity same-section results
   */
  async applyScoreDrivenStrategy(results, processedQuery, config) {
    if (!config.scoreStrategyEnabled || results.length < 3) {
      // Fallback to regular MMR
      return this.applyRegularMMR(results, processedQuery, config);
    }
    
    const top3 = results.slice(0, 3);
    const allHighSimilarity = top3.every(r => 
      (r.crossEncoderScore || r.aggregatedScore || r.finalScore || 0) >= config.highSimilarityThreshold
    );
    
    const sameSection = this.checkSameSection(top3);
    
    if (allHighSimilarity && sameSection) {
      console.log('🎯 Score-driven strategy: Bypassing MMR for high-similarity same-section results');
      console.log('📊 Top-3 scores:', top3.map(r => ({
        id: r.id,
        score: (r.crossEncoderScore || r.aggregatedScore || r.finalScore || 0).toFixed(3),
        section: r.metadata?.section || r.parentId
      })));
      
      // Use neighbor expansion instead of MMR
      return this.applyNeighborExpansion(results, config.finalTopK);
    } else {
      console.log('🔄 Score-driven strategy: Using regular MMR (conditions not met)');
      console.log('📊 Analysis:', {
        allHighSimilarity,
        sameSection,
        top3Scores: top3.map(r => (r.crossEncoderScore || r.aggregatedScore || r.finalScore || 0).toFixed(3))
      });
      
      // Apply regular MMR
      return this.applyRegularMMR(results, processedQuery, config);
    }
  }
  
  /**
   * Check if top results come from the same section
   */
  checkSameSection(results) {
    if (results.length === 0) return false;
    
    const firstSection = results[0].metadata?.section || results[0].parentId;
    if (!firstSection) return false;
    
    return results.every(r => 
      (r.metadata?.section || r.parentId) === firstSection
    );
  }
  
  /**
   * Apply neighbor expansion for same-section high-similarity results
   */
  applyNeighborExpansion(results, finalTopK) {
    console.log('🔗 Applying neighbor expansion for contiguous context...');
    
    // Take top result and expand with adjacent chunks
    const expanded = results.slice(0, finalTopK).map((result, index) => ({
      ...result,
      expansionRank: index + 1,
      bypassedMMR: true
    }));
    
    console.log(`✅ Neighbor expansion: kept ${expanded.length} contiguous results`);
    
    return expanded;
  }
  
  /**
   * Apply regular MMR for diversity
   */
  async applyRegularMMR(results, processedQuery, config) {
    if (!config.mmrEnabled || !window.NYLAMMRReranker) {
      return results.slice(0, config.finalTopK);
    }
    
    try {
      console.log('🔄 Applying regular MMR for diversity...');
      const mmrReranker = new window.NYLAMMRReranker(this.embeddingService, {
        lambda: config.mmrLambda
      });
      return await mmrReranker.rerank(processedQuery.original, results, config.finalTopK);
    } catch (error) {
      console.warn('⚠️ MMR reranking failed, using original results:', error);
      return results.slice(0, config.finalTopK);
    }
  }
  
  /**
   * Get retrieval statistics (Enhanced with Phase 2 & 3)
   */
  getStats() {
    return {
      type: 'semantic_enhanced',
      phase1: {
        slotIntentDetection: true,
        factsStorage: true,
        dualTextViews: true
      },
      phase2: {
        bm25Enabled: this.options.bm25Enabled,
        bm25Ready: this.bm25Ready,
        hybridRetrieval: true,
        dynamicWeighting: this.options.dynamicWeighting
      },
      phase3: {
        languageConsistency: !!this.languageConsistency,
        selfRepairEnabled: this.languageConsistency?.options.enableSelfRepair || false,
        consistencyThreshold: this.languageConsistency?.options.consistencyThreshold || 0.7
      },
      exactPatternsCount: Object.keys(this.exactPatterns).length,
      glossarySize: this.glossary.size,
      options: {
        minScore: this.options.minScore,
        mmrEnabled: this.options.mmrEnabled,
        topK: this.options.topK,
        bm25TopK: this.options.bm25TopK,
        crossEncoderTopK: this.options.crossEncoderTopK,
        fusionTopK: this.options.fusionTopK,
        parentTopK: this.options.parentTopK,
        finalTopK: this.options.finalTopK
      }
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLASemanticRetriever;
}
window.NYLASemanticRetriever = NYLASemanticRetriever;