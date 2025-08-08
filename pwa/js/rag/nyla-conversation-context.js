/**
 * NYLA Conversation Context Manager
 * Manages conversation history and context for RAG pipeline
 */

class NYLAConversationContext {
  constructor(options = {}) {
    this.options = {
      maxHistoryLength: 10,        // Maximum conversation turns to keep
      maxContextTokens: 300,       // Max tokens for conversation context
      contextWindow: 5,            // Number of recent turns to include
      includeUserProfile: true,    // Include user profile in context
      includePreviousAnswers: true, // Include NYLA's previous responses
      ...options
    };
    
    // Conversation state
    this.conversationHistory = [];
    this.userProfile = null;
    this.currentSession = {
      startTime: Date.now(),
      turnCount: 0,
      topics: new Set()
    };
  }

  /**
   * Add a conversation turn
   */
  addTurn(userQuery, nylaResponse, metadata = {}) {
    const turn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      user: {
        query: userQuery,
        intent: metadata.intent || this.detectIntent(userQuery),
        topics: metadata.topics || this.extractTopics(userQuery)
      },
      assistant: {
        response: nylaResponse,
        confidence: metadata.confidence || 0.7,
        sources: metadata.sources || [],
        type: metadata.responseType || 'informative'
      },
      context: {
        turnNumber: this.currentSession.turnCount + 1,
        sessionTime: Date.now() - this.currentSession.startTime
      }
    };
    
    this.conversationHistory.push(turn);
    this.currentSession.turnCount++;
    
    // Add topics to session
    if (turn.user.topics) {
      turn.user.topics.forEach(topic => this.currentSession.topics.add(topic));
    }
    
    // Limit history length
    if (this.conversationHistory.length > this.options.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.options.maxHistoryLength);
    }
    
    console.log(`💬 Added conversation turn: ${this.conversationHistory.length} total`);
  }

  /**
   * Build conversation context for RAG
   */
  buildContext(currentQuery, options = {}) {
    const config = { ...this.options, ...options };
    
    // Get recent conversation history
    const recentTurns = this.conversationHistory.slice(-config.contextWindow);
    
    // Build context sections
    const contextSections = [];
    
    // 1. User Profile Context (if available and enabled)
    if (config.includeUserProfile && this.userProfile) {
      const profileContext = this.buildProfileContext();
      if (profileContext) {
        contextSections.push({
          type: 'profile',
          content: profileContext,
          tokens: this.estimateTokens(profileContext)
        });
      }
    }
    
    // 2. Session Context
    if (this.currentSession.topics.size > 0) {
      const sessionContext = this.buildSessionContext();
      if (sessionContext) {
        contextSections.push({
          type: 'session',
          content: sessionContext,
          tokens: this.estimateTokens(sessionContext)
        });
      }
    }
    
    // 3. Conversation History Context
    if (recentTurns.length > 0) {
      const historyContext = this.buildHistoryContext(recentTurns, config);
      if (historyContext) {
        contextSections.push({
          type: 'history',
          content: historyContext,
          tokens: this.estimateTokens(historyContext)
        });
      }
    }
    
    // 4. Current Query Context Enhancement
    const queryContext = this.buildQueryContext(currentQuery, recentTurns);
    if (queryContext) {
      contextSections.push({
        type: 'query',
        content: queryContext,
        tokens: this.estimateTokens(queryContext)
      });
    }
    
    // Fit within token budget
    const optimizedSections = this.optimizeTokenBudget(contextSections, config.maxContextTokens);
    
    // Combine into final context
    const finalContext = optimizedSections.map(s => s.content).join('\n\n');
    
    return {
      context: finalContext,
      sections: optimizedSections,
      metadata: {
        totalTokens: optimizedSections.reduce((sum, s) => sum + s.tokens, 0),
        turnCount: recentTurns.length,
        hasProfile: !!this.userProfile,
        sessionTopics: Array.from(this.currentSession.topics)
      }
    };
  }

  /**
   * Build user profile context
   */
  buildProfileContext() {
    if (!this.userProfile) return null;
    
    const context = [];
    
    // Basic preferences
    if (this.userProfile.timezone) {
      context.push(`User timezone: ${this.userProfile.timezone}`);
    }
    
    if (this.userProfile.interests && this.userProfile.interests.length > 0) {
      context.push(`User interests: ${this.userProfile.interests.join(', ')}`);
    }
    
    // Experience level (inferred from knowledge tracker)
    const knowledgeLevel = this.inferKnowledgeLevel();
    if (knowledgeLevel) {
      context.push(`User knowledge level: ${knowledgeLevel}`);
    }
    
    return context.length > 0 ? context.join('. ') + '.' : null;
  }

  /**
   * Build session context
   */
  buildSessionContext() {
    const topics = Array.from(this.currentSession.topics);
    if (topics.length === 0) return null;
    
    return `Current session topics: ${topics.join(', ')}.`;
  }

  /**
   * Build conversation history context
   */
  buildHistoryContext(recentTurns, config) {
    if (recentTurns.length === 0) return null;
    
    const historyItems = [];
    
    for (const turn of recentTurns) {
      // Add user query
      historyItems.push(`User: ${turn.user.query}`);
      
      // Add assistant response (if enabled)
      if (config.includePreviousAnswers) {
        const response = this.summarizeResponse(turn.assistant.response);
        historyItems.push(`NYLA: ${response}`);
      }
    }
    
    return `Recent conversation:\n${historyItems.join('\n')}`;
  }

  /**
   * Build query context enhancement
   */
  buildQueryContext(currentQuery, recentTurns) {
    const enhancements = [];
    
    // Check for follow-up indicators
    const isFollowUp = this.detectFollowUp(currentQuery, recentTurns);
    if (isFollowUp) {
      enhancements.push('This appears to be a follow-up question');
      
      // Add context from previous query
      if (recentTurns.length > 0) {
        const lastTurn = recentTurns[recentTurns.length - 1];
        enhancements.push(`Previous topic: ${lastTurn.user.topics?.join(', ') || 'general'}`);
      }
    }
    
    // Check for topic continuation
    const continuedTopic = this.detectTopicContinuation(currentQuery, recentTurns);
    if (continuedTopic) {
      enhancements.push(`Continuing discussion about: ${continuedTopic}`);
    }
    
    return enhancements.length > 0 ? enhancements.join('. ') + '.' : null;
  }

  /**
   * Optimize context sections to fit token budget
   */
  optimizeTokenBudget(sections, maxTokens) {
    // Sort by priority: query, history, session, profile
    const priorityOrder = ['query', 'history', 'session', 'profile'];
    const sortedSections = sections.sort((a, b) => {
      return priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type);
    });
    
    const optimized = [];
    let totalTokens = 0;
    
    for (const section of sortedSections) {
      if (totalTokens + section.tokens <= maxTokens) {
        optimized.push(section);
        totalTokens += section.tokens;
      } else {
        // Try to fit a truncated version
        const remainingTokens = maxTokens - totalTokens;
        if (remainingTokens > 50) { // Minimum useful section size
          const truncated = this.truncateSection(section, remainingTokens);
          if (truncated) {
            optimized.push(truncated);
            totalTokens += truncated.tokens;
          }
        }
        break;
      }
    }
    
    return optimized;
  }

  /**
   * Truncate a section to fit token budget
   */
  truncateSection(section, maxTokens) {
    if (section.type === 'history') {
      // Truncate from oldest turns
      const lines = section.content.split('\n');
      const header = lines[0]; // "Recent conversation:"
      let content = header + '\n';
      let tokens = this.estimateTokens(header);
      
      // Add lines from newest to oldest until budget is reached
      for (let i = lines.length - 1; i >= 1; i--) {
        const lineTokens = this.estimateTokens(lines[i]);
        if (tokens + lineTokens <= maxTokens) {
          content = header + '\n' + lines.slice(Math.max(1, i), lines.length).join('\n');
          tokens += lineTokens;
        } else {
          break;
        }
      }
      
      return {
        ...section,
        content: content,
        tokens: tokens,
        truncated: true
      };
    }
    
    // For other sections, simple truncation
    const truncatedContent = this.truncateToTokens(section.content, maxTokens - 10);
    return {
      ...section,
      content: truncatedContent + '...',
      tokens: maxTokens,
      truncated: true
    };
  }

  /**
   * Detect if current query is a follow-up
   */
  detectFollowUp(query, recentTurns) {
    if (recentTurns.length === 0) return false;
    
    const followUpIndicators = [
      'what about', 'how about', 'and', 'also', 'what else',
      'can you', 'tell me more', 'explain', 'elaborate',
      'that', 'it', 'this', 'them', 'those'
    ];
    
    const queryLower = query.toLowerCase();
    return followUpIndicators.some(indicator => queryLower.includes(indicator));
  }

  /**
   * Detect topic continuation
   */
  detectTopicContinuation(query, recentTurns) {
    if (recentTurns.length === 0) return null;
    
    const lastTurn = recentTurns[recentTurns.length - 1];
    const lastTopics = lastTurn.user.topics || [];
    
    const currentTopics = this.extractTopics(query);
    
    // Find common topics
    const commonTopics = lastTopics.filter(topic =>
      currentTopics.includes(topic)
    );
    
    return commonTopics.length > 0 ? commonTopics[0] : null;
  }

  /**
   * Detect query intent
   */
  detectIntent(query) {
    const queryLower = query.toLowerCase();
    
    if (/^(how|what.*steps|can i|show me)/.test(queryLower)) return 'how_to';
    if (/(compare|difference|vs|better|which)/.test(queryLower)) return 'comparison';
    if (/(what is|what are|explain|tell me about)/.test(queryLower)) return 'explanation';
    if (/(fee|cost|price|gas|expensive)/.test(queryLower)) return 'cost_inquiry';
    if (/(error|fail|problem|wrong|fix)/.test(queryLower)) return 'troubleshooting';
    if (/(thanks|thank you|great|good|awesome)/.test(queryLower)) return 'appreciation';
    
    return 'general';
  }

  /**
   * Extract topics from query
   */
  extractTopics(query) {
    const topics = [];
    const queryLower = query.toLowerCase();
    
    // Blockchain networks
    if (queryLower.includes('solana')) topics.push('solana');
    if (queryLower.includes('ethereum')) topics.push('ethereum');
    if (queryLower.includes('algorand')) topics.push('algorand');
    
    // Features
    if (/(transfer|send)/.test(queryLower)) topics.push('transfer');
    if (/(swap|exchange)/.test(queryLower)) topics.push('swap');
    if (/(qr|code)/.test(queryLower)) topics.push('qr_code');
    if (/(fee|cost|gas)/.test(queryLower)) topics.push('fees');
    if (/(raid|community)/.test(queryLower)) topics.push('community');
    
    // Technical terms
    if (/(wallet|address)/.test(queryLower)) topics.push('wallet');
    if (/(transaction|tx)/.test(queryLower)) topics.push('transaction');
    if (/(blockchain|network)/.test(queryLower)) topics.push('blockchain');
    
    return topics;
  }

  /**
   * Summarize assistant response for context
   */
  summarizeResponse(response) {
    if (!response) return '';
    
    // Take first sentence or first 100 characters
    const sentences = response.split(/[.!?]+/);
    const firstSentence = sentences[0]?.trim();
    
    if (firstSentence && firstSentence.length <= 100) {
      return firstSentence + '.';
    }
    
    return response.substring(0, 97) + '...';
  }

  /**
   * Infer user knowledge level
   */
  inferKnowledgeLevel() {
    // This would integrate with the knowledge tracker
    // For now, simple heuristic based on question types
    if (this.conversationHistory.length < 3) return 'beginner';
    
    const technicalQuestions = this.conversationHistory.filter(turn =>
      turn.user.intent === 'technical' || turn.user.topics.includes('blockchain')
    );
    
    if (technicalQuestions.length > this.conversationHistory.length * 0.6) {
      return 'advanced';
    } else if (technicalQuestions.length > this.conversationHistory.length * 0.3) {
      return 'intermediate';
    }
    
    return 'beginner';
  }

  /**
   * Simple token estimation
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to approximate token count
   */
  truncateToTokens(text, maxTokens) {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    
    // Try to break at sentence boundary
    const truncated = text.substring(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastPeriod > maxChars * 0.8) {
      return truncated.substring(0, lastPeriod + 1);
    } else if (lastSpace > maxChars * 0.9) {
      return truncated.substring(0, lastSpace);
    }
    
    return truncated;
  }

  /**
   * Set user profile
   */
  setUserProfile(profile) {
    this.userProfile = profile;
    console.log('💭 User profile updated for conversation context');
  }

  /**
   * Get conversation statistics
   */
  getStats() {
    return {
      totalTurns: this.conversationHistory.length,
      sessionDuration: Date.now() - this.currentSession.startTime,
      sessionTopics: Array.from(this.currentSession.topics),
      avgTurnLength: this.conversationHistory.length > 0
        ? this.conversationHistory.reduce((sum, turn) => sum + turn.user.query.length, 0) / this.conversationHistory.length
        : 0,
      hasProfile: !!this.userProfile
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    this.currentSession = {
      startTime: Date.now(),
      turnCount: 0,
      topics: new Set()
    };
    console.log('🧹 Conversation context cleared');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAConversationContext;
}
window.NYLAConversationContext = NYLAConversationContext;