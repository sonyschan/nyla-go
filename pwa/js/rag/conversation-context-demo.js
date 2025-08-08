/**
 * Conversation Context Demo
 * Demonstrates the conversation-aware RAG system
 */

async function runConversationDemo() {
  console.log('🎯 Starting conversation context demo...');
  
  try {
    // Initialize conversation context manager
    const conversationContext = new NYLAConversationContext({
      maxHistoryLength: 10,
      maxContextTokens: 300,
      contextWindow: 5
    });
    
    // Simulate a conversation sequence
    const conversation = [
      {
        user: "What are Solana transaction fees?",
        assistant: "Solana transaction fees are approximately $0.0001 per transaction, making it one of the most cost-effective blockchain networks for transfers."
      },
      {
        user: "How does that compare to Ethereum?",
        assistant: "Ethereum fees are significantly higher than Solana. Ethereum fees can range from $5-50+ during peak times, while Solana maintains consistent low fees around $0.0001."
      },
      {
        user: "What about speed?",  // This is a follow-up question
        expectedContext: "Should reference previous discussion about Solana and Ethereum"
      }
    ];
    
    console.log('\n💬 Building conversation history...');
    
    // Add the first two turns to conversation history
    for (let i = 0; i < 2; i++) {
      const turn = conversation[i];
      conversationContext.addTurn(turn.user, turn.assistant, {
        confidence: 0.9,
        topics: conversationContext.extractTopics(turn.user)
      });
      
      console.log(`  Added turn ${i + 1}: "${turn.user}"`);
    }
    
    // Test context building for the follow-up question
    console.log('\n🔍 Testing follow-up question context...');
    const followUpQuery = conversation[2].user;
    
    const contextResult = conversationContext.buildContext(followUpQuery, {
      maxContextTokens: 300
    });
    
    console.log('\n📊 Context Analysis:');
    console.log('  Query:', followUpQuery);
    console.log('  Is Follow-up:', conversationContext.detectFollowUp(followUpQuery, conversationContext.conversationHistory));
    console.log('  Topics:', conversationContext.extractTopics(followUpQuery));
    console.log('  Context Tokens:', contextResult.metadata.totalTokens);
    console.log('  Turn Count:', contextResult.metadata.turnCount);
    console.log('  Session Topics:', contextResult.metadata.sessionTopics);
    
    console.log('\n📝 Generated Context:');
    console.log('---');
    console.log(contextResult.context);
    console.log('---');
    
    // Test different query types
    console.log('\n🧪 Testing different query types...');
    
    const testQueries = [
      "Thanks, that's helpful!",  // Appreciation
      "Can you explain more?",     // Follow-up
      "What is blockchain?",       // New topic
      "How do I fix errors?"       // Troubleshooting
    ];
    
    for (const query of testQueries) {
      const intent = conversationContext.detectIntent(query);
      const isFollowUp = conversationContext.detectFollowUp(query, conversationContext.conversationHistory);
      const topics = conversationContext.extractTopics(query);
      
      console.log(`  "${query}":`);
      console.log(`    Intent: ${intent}`);
      console.log(`    Follow-up: ${isFollowUp}`);
      console.log(`    Topics: [${topics.join(', ')}]`);
    }
    
    // Show conversation statistics
    console.log('\n📈 Conversation Statistics:');
    const stats = conversationContext.getStats();
    console.log('  Total turns:', stats.totalTurns);
    console.log('  Session duration:', Math.round(stats.sessionDuration / 1000), 'seconds');
    console.log('  Session topics:', stats.sessionTopics);
    console.log('  Average turn length:', Math.round(stats.avgTurnLength), 'characters');
    
    console.log('\n✅ Conversation context demo completed!');
    
    return {
      conversationContext,
      contextResult,
      stats
    };
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

// Export for testing
if (typeof window !== 'undefined') {
  window.runConversationDemo = runConversationDemo;
}

// Auto-run demo if NYLAConversationContext is available
if (typeof window !== 'undefined' && window.NYLAConversationContext) {
  // Wait a bit for other components to load
  setTimeout(() => {
    if (localStorage.getItem('nyla-rag-debug') === 'true') {
      runConversationDemo().catch(console.error);
    }
  }, 2000);
}