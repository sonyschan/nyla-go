/**
 * NYLA Semantic Follow-up Generator
 * Generates contextual follow-up questions using RAG knowledge domains
 * Replaces rule-based topic system with semantic similarity
 */

class NYLASemanticFollowups {
  constructor(ragPipeline) {
    this.ragPipeline = ragPipeline;
    
    // Knowledge domains with representative questions
    this.knowledgeDomains = {
      // Same domain follow-ups
      'workflow_process': {
        name: 'Post-Command Workflow',
        questions: [
          "How long does NYLA take to process commands?",
          "What if my command fails to execute?",
          "How do I check transaction status?",
          "Can I cancel a command after posting?"
        ]
      },
      'basic_usage': {
        name: 'Basic Operations', 
        questions: [
          "How do I send different types of tokens?",
          "What's the command format for transfers?",
          "How do I specify the recipient correctly?",
          "Can I send to multiple recipients?"
        ]
      },
      'fees_costs': {
        name: 'Fees and Costs',
        questions: [
          "How much do transactions cost on different networks?",
          "Are there any NYLA service fees?",
          "Why are Ethereum fees so high?",
          "Which network has the lowest fees?"
        ]
      },
      'supported_networks': {
        name: 'Blockchain Networks',
        questions: [
          "What's the fastest blockchain network?",
          "Can I transfer between different blockchains?", 
          "Which network should I choose?",
          "What are the pros and cons of each network?"
        ]
      },
      'security_safety': {
        name: 'Security',
        questions: [
          "Is NYLA safe to use?",
          "How does NYLA protect my funds?",
          "What if someone copies my command?",
          "Does NYLA have access to my wallet?"
        ]
      },
      'qr_sharing': {
        name: 'QR Codes & Receiving',
        questions: [
          "How do I create payment QR codes?",
          "Can others scan my QR to send tokens?",
          "How do I share my receiving address?",
          "What QR code apps work best?"
        ]
      },
      'troubleshooting': {
        name: 'Problems & Solutions',
        questions: [
          "What if NYLA doesn't respond to my command?",
          "My transaction is taking too long, what should I do?",
          "How do I fix common command errors?",
          "Who can help if something goes wrong?"
        ]
      },
      'getting_started': {
        name: 'Getting Started',
        questions: [
          "How do I start using NYLA for the first time?",
          "What do I need to get started?",
          "Where can I learn more about NYLA?",
          "What are the main features?"
        ]
      }
    };

    // Random chat questions (domain-independent)
    this.randomChatQuestions = [
      "What's new with NYLA recently?",
      "How does NYLA compare to other crypto tools?",
      "What's the story behind NYLA?",
      "Any tips for using NYLA effectively?",
      "What's the NYLA community like?",
      "Are there any upcoming NYLA features?",
      "How can I provide feedback on NYLA?",
      "What makes NYLA special?"
    ];
  }

  /**
   * Generate semantic follow-up questions
   * @param {Object} ragResult - The RAG query result
   * @param {string} questionText - Original user question
   * @param {string} responseText - Generated response text
   * @returns {Array} Array of 3 follow-up questions
   */
  async generateSemanticFollowUps(ragResult, questionText, responseText) {
    try {
      // Step 1: Identify current domain from RAG sources
      const currentDomain = this.identifyCurrentDomain(ragResult);
      console.log('🎯 Current domain identified:', currentDomain);

      // Step 2: Generate domain-specific questions
      const samedomainQuestions = this.getSameDomainQuestions(currentDomain);
      const differentDomainQuestions = await this.getDifferentDomainQuestions(currentDomain, questionText);
      const randomChatQuestion = this.getRandomChatQuestion();

      // Step 3: Select best candidates using semantic similarity
      const followUp1 = await this.selectBestSameDomainQuestion(samedomainQuestions, responseText);
      const followUp2 = await this.selectBestDifferentDomainQuestion(differentDomainQuestions, questionText);
      const followUp3 = randomChatQuestion;

      return [followUp1, followUp2, followUp3];

    } catch (error) {
      console.error('❌ Semantic follow-up generation failed:', error);
      // Fallback to simple follow-ups
      return this.getFallbackFollowUps(questionText);
    }
  }

  /**
   * Identify current domain from RAG sources
   */
  identifyCurrentDomain(ragResult) {
    if (!ragResult.sources || ragResult.sources.length === 0) {
      return 'getting_started'; // Default domain
    }

    // Extract categories from top sources
    const categories = ragResult.sources
      .slice(0, 2) // Top 2 sources
      .map(source => {
        // Parse title like "workflow_process - faq_what_happens_after_post - body"
        if (source.title) {
          const parts = source.title.split(' - ');
          return parts[0]; // First part is category
        }
        return null;
      })
      .filter(cat => cat && this.knowledgeDomains[cat]);

    // Return most frequent category or default
    return categories[0] || 'getting_started';
  }

  /**
   * Get questions from same domain
   */
  getSameDomainQuestions(domain) {
    const domainData = this.knowledgeDomains[domain];
    return domainData ? domainData.questions : this.knowledgeDomains['getting_started'].questions;
  }

  /**
   * Get questions from different domains using semantic diversity
   */
  async getDifferentDomainQuestions(currentDomain, originalQuestion) {
    const differentDomains = Object.keys(this.knowledgeDomains)
      .filter(domain => domain !== currentDomain);
    
    // Get questions from different domains
    const allQuestions = [];
    for (const domain of differentDomains) {
      const questions = this.knowledgeDomains[domain].questions;
      questions.forEach(q => allQuestions.push({ question: q, domain }));
    }

    // Find most semantically different questions
    if (this.ragPipeline && this.ragPipeline.embeddingService) {
      try {
        const originalEmbedding = await this.ragPipeline.embeddingService.embed(originalQuestion);
        
        const questionSimilarities = [];
        for (const item of allQuestions.slice(0, 10)) { // Limit for performance
          const questionEmbedding = await this.ragPipeline.embeddingService.embed(item.question);
          const similarity = this.cosineSimilarity(originalEmbedding, questionEmbedding);
          questionSimilarities.push({ ...item, similarity });
        }

        // Sort by lowest similarity (most different)
        questionSimilarities.sort((a, b) => a.similarity - b.similarity);
        return questionSimilarities.map(item => item.question);

      } catch (error) {
        console.warn('⚠️ Semantic similarity calculation failed:', error);
      }
    }

    // Fallback: return random different domain questions
    return allQuestions.map(item => item.question);
  }

  /**
   * Select best same-domain question using response similarity
   */
  async selectBestSameDomainQuestion(questions, responseText) {
    if (!this.ragPipeline || !this.ragPipeline.embeddingService) {
      // Fallback: return first question
      return questions[0] || "Tell me more about this topic";
    }

    try {
      const responseEmbedding = await this.ragPipeline.embeddingService.embed(responseText);
      
      let bestQuestion = questions[0];
      let bestSimilarity = -1;

      for (const question of questions.slice(0, 4)) { // Limit for performance
        const questionEmbedding = await this.ragPipeline.embeddingService.embed(question);
        const similarity = this.cosineSimilarity(responseEmbedding, questionEmbedding);
        
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestQuestion = question;
        }
      }

      return bestQuestion;

    } catch (error) {
      console.warn('⚠️ Same-domain question selection failed:', error);
      return questions[0] || "Tell me more about this topic";
    }
  }

  /**
   * Select best different-domain question (most semantically different)
   */
  async selectBestDifferentDomainQuestion(questions, originalQuestion) {
    // Return first different question (already sorted by semantic difference)
    return questions[0] || "What else can NYLA help me with?";
  }

  /**
   * Get random chat question
   */
  getRandomChatQuestion() {
    const randomIndex = Math.floor(Math.random() * this.randomChatQuestions.length);
    return this.randomChatQuestions[randomIndex];
  }

  /**
   * Fallback follow-ups when semantic generation fails
   */
  getFallbackFollowUps(questionText) {
    const question = questionText.toLowerCase();
    
    if (question.includes('send') || question.includes('transfer')) {
      return [
        "How do I receive payments?",
        "What are the transaction fees?", 
        "What's new with NYLA recently?"
      ];
    } else if (question.includes('receive') || question.includes('qr')) {
      return [
        "How do I send tokens?",
        "Which blockchain should I use?",
        "How does NYLA compare to other tools?"
      ];
    } else {
      return [
        "How do I get started with NYLA?",
        "What are the main features?",
        "What makes NYLA special?"
      ];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Update domain questions based on knowledge base changes
   */
  updateDomainQuestions(domain, newQuestions) {
    if (this.knowledgeDomains[domain]) {
      this.knowledgeDomains[domain].questions = newQuestions;
    }
  }

  /**
   * Get current domain information
   */
  getDomainInfo(domain) {
    return this.knowledgeDomains[domain] || null;
  }

  /**
   * List all available domains
   */
  getAllDomains() {
    return Object.keys(this.knowledgeDomains);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLASemanticFollowups;
}
window.NYLASemanticFollowups = NYLASemanticFollowups;