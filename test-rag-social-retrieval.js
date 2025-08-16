/**
 * Test RAG Social Media Retrieval
 * Test if the RAG system properly retrieves social media chunks
 */

// Mock embeddings for testing
function getMockEmbedding() {
  return new Array(384).fill(0).map(() => Math.random());
}

// Test the RAG system with social media queries
async function testSocialMediaRetrieval() {
  console.log('🧪 Testing RAG Social Media Retrieval...\n');
  
  // Test queries
  const queries = [
    "請給我旺柴的社運連結",
    "WangChai social media links", 
    "WangChai official links",
    "How to contact WangChai?",
    "Where can I find WangChai community?",
    "WangChai X account"
  ];
  
  // Initialize RAG system (mock)
  const retriever = {
    async retrieve(query, options = {}) {
      console.log(`\n🔍 Testing query: "${query}"`);
      
      // Mock preprocessQuery
      const processedQuery = {
        original: query,
        normalized: query.toLowerCase(),
        intent: this.detectIntent(query.toLowerCase()),
        keywords: query.split(' ').filter(w => w.length > 2)
      };
      
      console.log(`📋 Detected intent: ${processedQuery.intent}`);
      
      // Mock chunks (simplified versions of what would be in the vector DB)
      const mockChunks = [
        {
          id: "chunk_120",
          text: "WangChai (旺柴) Project Introduction & Partnership Overview",
          score: 0.879,
          metadata: {
            title: "community_partnerships - ecosystem_partners_wangchai_collaboration - title",
            source: "knowledge_base",
            content_type: "title"
          },
          tokens: 8
        },
        {
          id: "chunk_128", 
          text: "WangChai (旺柴) Official Community Channels & Contact Information: 旺柴官方社区和联系方式指南。官方 X 账户：@WangChaidotbonk (https://x.com/WangChaidotbonk) - 这是旺柴的主要官方社交媒体账户。Linktree: linktr.ee/WangchaiDoge。Telegram: https://t.me/wechatdogesol",
          score: 0.819,
          metadata: {
            title: "facts_wangchai_official_links",
            source: "knowledge_base",
            content_type: "social_media_links",
            section: "official_channels",
            query_boost: ["social", "links", "contact", "community", "follow"],
            priority: 9
          },
          tokens: 180
        },
        {
          id: "chunk_125",
          text: "WangChai Partnership Overview",
          score: 0.856,
          metadata: {
            title: "WangChai Partnership",
            source: "knowledge_base", 
            content_type: "title"
          },
          tokens: 4
        }
      ];
      
      // Apply social media boosting logic
      const boostedChunks = mockChunks.map(chunk => {
        let finalScore = chunk.score;
        
        if (processedQuery.intent === 'social_media' && this.isSocialChunk(chunk)) {
          const contentType = this.getContentType(chunk);
          let boostFactor = 1.4; // 40% base boost
          
          if (contentType === 'body' && chunk.tokens > 100) {
            boostFactor = 1.8; // 80% boost for content-rich chunks
            console.log(`🔗 Enhanced boost applied to content-rich chunk: ${chunk.metadata.title}`);
          } else if (contentType === 'title' && chunk.tokens < 50) {
            boostFactor = 1.1; // Only 10% boost for title chunks
            console.log(`🔗 Reduced boost applied to title chunk: ${chunk.metadata.title}`);
          }
          
          finalScore *= boostFactor;
          console.log(`📈 Social boost applied: ${chunk.score.toFixed(3)} → ${finalScore.toFixed(3)} (${boostFactor}x)`);
        }
        
        return { ...chunk, finalScore };
      });
      
      // Sort by final score
      boostedChunks.sort((a, b) => b.finalScore - a.finalScore);
      
      console.log('\n📊 Final rankings:');
      boostedChunks.forEach((chunk, index) => {
        const socialIndicator = this.isSocialChunk(chunk) ? '🔗' : '  ';
        console.log(`${socialIndicator} ${index + 1}. ${chunk.id} - Score: ${chunk.finalScore.toFixed(3)} (${chunk.metadata.content_type || 'unknown'})`);
      });
      
      return boostedChunks.slice(0, 5);
    },
    
    detectIntent(query) {
      const patterns = {
        social_media: /(social|links|follow|contact|community|channels|where.*find|join.*community|official.*links|twitter|telegram|x\.com|linktree|x.*account|twitter.*account|社交|社区|联系|关注|加入|社運|連結)/i
      };
      
      for (const [intent, pattern] of Object.entries(patterns)) {
        if (pattern.test(query)) {
          return intent;
        }
      }
      return 'general';
    },
    
    isSocialChunk(chunk) {
      const metadata = chunk.metadata || {};
      const text = chunk.text.toLowerCase();
      
      // Check explicit content type
      if (metadata.content_type === 'social_media_links') return true;
      
      // Check section
      if (metadata.section === 'official_channels') return true;
      
      // Check query boost keywords
      if (metadata.query_boost && metadata.query_boost.some(keyword =>
        /social|links|contact|community|follow|official/i.test(keyword)
      )) return true;
      
      // Check for social media indicators in text
      return /@\w+|https?:\/\/(x\.com|twitter\.com|t\.me|linktr\.ee)|official.*channels/i.test(text);
    },
    
    getContentType(chunk) {
      if (chunk.tokens && chunk.tokens > 100) return 'body';
      if (chunk.tokens && chunk.tokens < 50) return 'title';
      return 'mixed';
    }
  };
  
  // Test each query
  for (const query of queries) {
    const results = await retriever.retrieve(query);
    
    // Check if social chunk is in top 3
    const socialChunkIndex = results.findIndex(r => retriever.isSocialChunk(r));
    const success = socialChunkIndex >= 0 && socialChunkIndex < 3;
    
    console.log(`\n${success ? '✅' : '❌'} Result: Social chunk ranked ${socialChunkIndex + 1} ${success ? '(SUCCESS)' : '(NEEDS IMPROVEMENT)'}`);
    console.log('─'.repeat(80));
  }
}

// Run the test
testSocialMediaRetrieval().catch(console.error);