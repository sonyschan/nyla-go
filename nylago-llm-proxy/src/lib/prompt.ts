/**
 * Prompt assembly for NYLA LLM requests
 * Formats system prompt, context, and user query for optimal model performance
 */

export interface PromptOptions {
  maxContextLength?: number;
}

/**
 * Default NYLA system prompt optimized for crypto/blockchain assistance
 */
export const DEFAULT_SYSTEM_PROMPT = `You are NYLA, an AI assistant specialized in cryptocurrency, blockchain technology, and digital asset transfers. You help users with:

- Cryptocurrency transfers and transactions
- Blockchain network information (Solana, Ethereum, Algorand)
- Project information and community details
- Technical explanations and troubleshooting

RESPONSE GUIDELINES:
- Be helpful, accurate, and concise
- Include relevant URLs and social media handles when available
- LANGUAGE RULE: Respond ONLY in the same language as the user's query
  * If query is in English → respond entirely in English
  * If query is in Chinese → respond entirely in Chinese (no English mixed in)
  * If query is mixed → respond in the dominant language
- Keep responses under 1200 characters unless more detail is specifically requested

KNOWLEDGE: Only use provided context. Do not invent facts or make up information.

SAFETY: Never provide financial advice. Always remind users to verify information and do their own research.

RESPONSE FORMAT: Always respond with valid JSON in this exact format:
{
  "answer": "your response here",
  "followups": ["suggested follow-up question 1", "suggested follow-up question 2"],
  "self_confidence": 0.8
}

CONFIDENCE SCORING: Include a self_confidence score (0.0-1.0) indicating how confident you are in your response:
- 0.9-1.0: Very confident, have comprehensive relevant information
- 0.7-0.8: Confident, have good relevant information but some uncertainty
- 0.5-0.6: Moderate confidence, limited relevant information
- 0.0-0.4: Low confidence, insufficient or no relevant information`;

/**
 * Assemble complete prompt with system, context, and user query
 */
export function assemblePrompt(
  userQuery: string,
  context: string[] = [],
  systemPrompt?: string,
  options: PromptOptions = {}
): {
  system: string;
  user: string;
  estimatedTokens: number;
} {
  const {
    maxContextLength = 2000
  } = options;

  // Use provided system prompt or default
  const finalSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

  // Prepare context section
  let contextSection = '';
  if (context.length > 0) {
    const formattedContext = formatContext(context, maxContextLength);
    if (formattedContext.length > 0) {
      contextSection = `\n\nCONTEXT:\n${formattedContext}\n`;
    }
  }

  // Assemble user message
  const userMessage = `${contextSection}USER QUERY: ${userQuery}`;

  // Estimate token count (rough approximation: 1 token ≈ 4 characters)
  const estimatedTokens = Math.ceil(
    (finalSystemPrompt.length + userMessage.length) / 4
  );

  return {
    system: finalSystemPrompt,
    user: userMessage,
    estimatedTokens
  };
}

/**
 * Format context array for inclusion in prompt
 */
function formatContext(context: string[], maxLength: number): string {
  if (context.length === 0) return '';

  const formatted: string[] = [];
  let currentLength = 0;

  for (const [index, chunk] of context.entries()) {
    // Format individual chunk
    const chunkText = `[Context ${index + 1}]\n${chunk}`;

    // Check if adding this chunk would exceed length limit
    if (currentLength + chunkText.length > maxLength && formatted.length > 0) {
      break;
    }

    formatted.push(chunkText);
    currentLength += chunkText.length;
  }

  return formatted.join('\n\n---\n\n');
}

/**
 * Extract language from user query (simple heuristic)
 */
export function detectLanguage(text: string): 'en' | 'zh' | 'mixed' {
  const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
  const totalChars = text.length;
  const chineseRatio = chineseChars.length / totalChars;

  if (chineseRatio > 0.3) {
    return chineseRatio > 0.7 ? 'zh' : 'mixed';
  }
  
  return 'en';
}

/**
 * Validate and sanitize user query
 */
export function sanitizeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .slice(0, 2000);       // Truncate if too long
}