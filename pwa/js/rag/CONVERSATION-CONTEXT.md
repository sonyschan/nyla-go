# NYLA Conversation Context System

The conversation context system enables NYLA to maintain awareness of previous interactions, allowing for natural follow-up questions and context-aware responses.

## 🎯 Overview

The conversation context manager tracks conversation history and enhances RAG queries with relevant context from previous turns, enabling:

- **Follow-up Questions**: "What about fees?" after discussing blockchains
- **Topic Continuation**: Maintaining topic awareness across multiple questions  
- **Intent Recognition**: Understanding user intent (how-to, comparison, appreciation)
- **Smart Context**: Including only relevant conversation history to stay within token budgets

## 🏗️ Architecture

```
User Query → Intent Detection → Context Building:
                                ├── Recent Conversation History (5 turns)
                                ├── Session Topics
                                ├── User Profile (if available)
                                └── Query Enhancement
                                      ↓
                               RAG Pipeline (with conversation context)
                                      ↓
                               Context-Aware Response
                                      ↓
                               Update Conversation History
```

## 🔧 Components

### NYLAConversationContext

The main conversation context manager that:
- Tracks conversation turns with metadata
- Builds context for RAG queries
- Detects follow-up questions and topic continuation
- Manages token budgets for conversation history

### Integration Points

1. **RAG Pipeline**: Conversation manager is passed to context builder
2. **Context Builder**: Includes conversation context in prompts
3. **Response Tracking**: Completed responses are added to conversation history

## 🚀 Usage Examples

### Basic Setup

```javascript
// Initialize conversation context
const conversationContext = new NYLAConversationContext({
  maxHistoryLength: 10,        // Keep last 10 conversation turns
  maxContextTokens: 250,       // Reserve 250 tokens for conversation context
  contextWindow: 5,            // Include last 5 turns in context
  includeUserProfile: true,    // Include user profile if available
  includePreviousAnswers: true // Include NYLA's previous responses
});

// Integrate with RAG pipeline
ragPipeline.setConversationManager(conversationContext);
```

### Natural Conversation Flow

```javascript
// First question
await ragPipeline.query("What are Solana transaction fees?");
// Response: "Solana fees are approximately $0.0001 per transaction..."

// Follow-up question (uses conversation context)
await ragPipeline.query("What about Ethereum?");
// Context-aware response: "Ethereum fees are much higher than Solana. While Solana maintains..."

// Another follow-up
await ragPipeline.query("Which is faster?");
// Uses context from previous Solana vs Ethereum discussion
```

### Manual Context Management

```javascript
// Add conversation turn manually
conversationContext.addTurn(
  "How do I send tokens?",
  "To send tokens, use the /transfer command on X.com...",
  {
    confidence: 0.9,
    sources: ['transfers', 'commands'],
    responseType: 'how_to'
  }
);

// Build context for a new query
const contextResult = conversationContext.buildContext(
  "Can I do that on Ethereum?",
  { maxContextTokens: 200 }
);
```

## 🎛️ Configuration Options

### Context Manager Options

```javascript
const options = {
  maxHistoryLength: 10,        // Maximum conversation turns to store
  maxContextTokens: 300,       // Maximum tokens for conversation context
  contextWindow: 5,            // Number of recent turns to include
  includeUserProfile: true,    // Include user preferences/knowledge level
  includePreviousAnswers: true // Include NYLA's previous responses
};
```

### Context Building Options

```javascript
const contextOptions = {
  maxContextTokens: 250,       // Override default token limit
  includeUserProfile: false,   // Disable user profile for this query
  includePreviousAnswers: true // Include NYLA's responses
};
```

## 🔍 Intent Detection

The system automatically detects user intent:

| Intent | Examples | Response Strategy |
|--------|----------|-------------------|
| `how_to` | "How do I...", "Can I...", "Show me..." | Step-by-step instructions |
| `comparison` | "Which is better?", "vs", "difference" | Comparative analysis |
| `explanation` | "What is...", "Explain...", "Tell me about" | Educational content |
| `cost_inquiry` | "fees", "cost", "expensive" | Pricing information |
| `troubleshooting` | "error", "problem", "fix" | Problem-solving guidance |
| `appreciation` | "thanks", "great", "awesome" | Acknowledgment response |
| `followup` | "what about", "and", "also" | Context-aware follow-up |

## 📊 Context Structure

### Generated Context Format

```
Conversation Context:
Recent conversation:
User: What are Solana transaction fees?
NYLA: Solana fees are approximately $0.0001 per transaction...

User: How does that compare to Ethereum?
NYLA: Ethereum fees are significantly higher...

Current session topics: solana, ethereum, fees.
This appears to be a follow-up question.

Knowledge Base Information:
[Retrieved chunks with relevant information]

Current Question: Which network is faster?

Please provide a helpful answer based on the context above, taking into account our previous conversation.
```

## 🧪 Testing Conversation Context

### Enable Debug Mode

```javascript
// Enable debug logging
localStorage.setItem('nyla-rag-debug', 'true');

// Run conversation demo
await runConversationDemo();
```

### Manual Testing

```javascript
// Test follow-up detection
const isFollowUp = conversationContext.detectFollowUp(
  "What about that?", 
  conversationHistory
);

// Test topic extraction
const topics = conversationContext.extractTopics(
  "How do Solana fees compare to Ethereum?"
);

// Test intent detection
const intent = conversationContext.detectIntent(
  "Can you show me how to send tokens?"
);
```

## 📈 Performance Impact

### Token Usage

- **Without Context**: ~600 tokens (knowledge only)
- **With Context**: ~850 tokens (knowledge + conversation)
- **Token Budget**: Context limited to 250 tokens maximum

### Latency Impact

- **Additional Processing**: ~50-100ms for context building
- **Overall Impact**: Minimal (within 12-second target)

### Memory Usage

- **History Storage**: ~1KB per conversation turn
- **Cleanup**: Automatic pruning after `maxHistoryLength`

## 🔧 Advanced Features

### User Profile Integration

```javascript
// Set user profile for personalized context
conversationContext.setUserProfile({
  timezone: 'America/New_York',
  interests: ['defi', 'trading', 'solana'],
  knowledgeLevel: 'intermediate'
});
```

### Topic Continuation Detection

```javascript
// Detects when queries continue previous topics
const continuedTopic = conversationContext.detectTopicContinuation(
  "What about their consensus mechanisms?",
  recentTurns
);
// Returns: 'blockchain' (from previous blockchain discussion)
```

### Context Optimization

```javascript
// Automatic token budget optimization
const optimizedContext = conversationContext.optimizeTokenBudget(
  contextSections,
  maxTokens
);
// Prioritizes: query context > history > session > profile
```

## 🎯 Best Practices

### For Developers

1. **Always Initialize**: Set up conversation context before first RAG query
2. **Handle Gracefully**: System works with or without conversation context
3. **Monitor Tokens**: Keep conversation context under 250 tokens
4. **Clear When Needed**: Reset conversation history for new sessions

### For Users

1. **Natural Language**: Use natural follow-up questions ("What about...", "And...")
2. **Stay on Topic**: Related questions get better context
3. **Be Specific**: Even with context, specific questions work better
4. **New Topics**: Clearly signal topic changes for best results

### Performance Tips

1. **Limit History**: Don't exceed 10 conversation turns
2. **Smart Truncation**: System automatically truncates old context
3. **Cache Warmup**: Conversation context is cached for repeated access
4. **Monitor Metrics**: Track `conversationTokens` in response metrics

## 🔍 Debugging

### Conversation Context Logs

```javascript
// Enable verbose logging
localStorage.setItem('nyla-rag-debug', 'true');

// Check conversation stats
const stats = conversationContext.getStats();
console.log('Conversation stats:', stats);

// Inspect context building
const result = conversationContext.buildContext(query);
console.log('Context result:', result.metadata);
```

### Common Issues

1. **No Context Applied**: Check if conversation manager is set on pipeline
2. **Token Overflow**: Reduce `maxContextTokens` or `contextWindow`
3. **Poor Follow-up Detection**: Add more follow-up indicators
4. **Memory Leaks**: Ensure conversation history is pruned

## 📚 API Reference

### NYLAConversationContext

#### Constructor Options
- `maxHistoryLength: number` - Maximum conversation turns to store
- `maxContextTokens: number` - Maximum tokens for conversation context  
- `contextWindow: number` - Number of recent turns to include
- `includeUserProfile: boolean` - Include user profile in context
- `includePreviousAnswers: boolean` - Include assistant responses

#### Methods
- `addTurn(query, response, metadata)` - Add conversation turn
- `buildContext(query, options)` - Build context for RAG query
- `setUserProfile(profile)` - Set user profile information
- `getStats()` - Get conversation statistics
- `clearHistory()` - Clear conversation history

#### Context Result
```javascript
{
  context: string,           // Formatted conversation context
  sections: array,           // Individual context sections
  metadata: {
    totalTokens: number,     // Total tokens used
    turnCount: number,       // Number of turns included
    hasProfile: boolean,     // Whether user profile was included
    sessionTopics: array     // Topics discussed in session
  }
}
```

## 🚀 Future Enhancements

### Planned Features

1. **Smarter Summarization**: Better compression of long conversations
2. **Multi-Session Memory**: Remember context across app sessions
3. **User Learning**: Adapt to user's knowledge level over time
4. **Topic Modeling**: Better automatic topic detection
5. **Emotional Context**: Understand user sentiment and adjust responses

### Integration Opportunities

1. **Knowledge Tracker**: Use learning progress for personalization
2. **User Analytics**: Track conversation patterns for improvements
3. **A/B Testing**: Compare context vs non-context response quality
4. **Multi-modal**: Include image/document context in conversations

---

**📝 Note**: The conversation context system is designed to enhance the RAG experience while maintaining the 12-second latency target and staying within token budget constraints.