/**
 * LLM provider client - OpenAI integration with streaming support
 */

import OpenAI from 'openai';
import { LLMResponseSchema } from './validators.js';
import type { LLMParams, InferResponse } from './validators.js';
import { logger } from './logger.js';
import { generateFollowUps } from './followups.js';
import { config } from '../config.js';

export interface LLMClient {
  generateResponse(
    systemPrompt: string,
    userPrompt: string,
    params: LLMParams,
    correlationId: string
  ): Promise<InferResponse>;

  generateResponseStream(
    systemPrompt: string,
    userPrompt: string,
    params: LLMParams,
    correlationId: string
  ): AsyncGenerator<{ type: string; data: any }, void, unknown>;
}

/**
 * OpenAI client implementation
 */
export class OpenAIClient implements LLMClient {
  private client: OpenAI;
  private defaultModel: string;

  constructor() {
    const apiKey = config.openaiApiKey;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({
      apiKey,
      timeout: 30000, // 30 second timeout
    });
    
    this.defaultModel = config.defaultModel;
    logger.debug('OpenAI client initialized successfully');
  }

  /**
   * Generate non-streaming response
   */
  async generateResponse(
    systemPrompt: string,
    userPrompt: string,
    params: LLMParams,
    correlationId: string
  ): Promise<InferResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        response_format: { type: 'json_object' }
      });

      const latencyMs = Date.now() - startTime;
      const completion = response.choices[0]?.message?.content;

      if (!completion) {
        throw new Error('No completion received from OpenAI');
      }

      // Parse JSON response with confidence
      let parsedResponse: { answer: string; followups?: string[]; self_confidence?: number };
      let confidence: number = 0.5; // Default confidence if not provided
      
      try {
        parsedResponse = JSON.parse(completion);
        
        // Validate response structure
        const validationResult = LLMResponseSchema.safeParse(parsedResponse);
        if (validationResult.success) {
          confidence = validationResult.data.self_confidence;
        } else {
          logger.warn({ 
            correlationId, 
            validationErrors: validationResult.error.issues 
          }, 'LLM response validation failed, using fallback confidence');
        }
      } catch (parseError) {
        // Fallback: treat as plain text and generate followups
        logger.warn({ correlationId, error: parseError }, 'Failed to parse JSON response, using fallback');
        parsedResponse = {
          answer: completion,
          followups: generateFollowUps(userPrompt, completion)
        };
      }

      // Check if confidence is low and we should enhance followups
      let finalFollowups = parsedResponse.followups || [];
      
      if (confidence < 0.6 && (!finalFollowups.length || finalFollowups.length < 2)) {
        logger.info({ 
          correlationId, 
          confidence,
          existingFollowups: finalFollowups.length 
        }, 'Low confidence detected, enhancing followups');
        
        // Enhance with category-based followups when confidence is low
        const enhancedFollowups = generateFollowUps(userPrompt, parsedResponse.answer);
        finalFollowups = [...finalFollowups, ...enhancedFollowups].slice(0, 3);
      }

      const result: InferResponse = {
        answer: parsedResponse.answer,
        followups: finalFollowups.slice(0, 3) // Limit to 3
      };

      // Log metrics including confidence
      logger.info({
        type: 'llm_completion',
        correlationId,
        model: this.defaultModel,
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        latencyMs,
        provider: 'openai',
        confidence,
        followupsGenerated: finalFollowups.length
      }, 'OpenAI completion successful');

      return result;

    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      logger.error({
        correlationId,
        model: this.defaultModel,
        latencyMs,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'OpenAI completion failed');

      throw error;
    }
  }

  /**
   * Generate streaming response
   */
  async* generateResponseStream(
    systemPrompt: string,
    userPrompt: string,
    params: LLMParams,
    correlationId: string
  ): AsyncGenerator<{ type: string; data: any }, void, unknown> {
    const startTime = Date.now();

    try {
      const stream = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        stream: true
      });

      let fullResponse = '';
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        
        if (delta) {
          fullResponse += delta;
          outputTokens++;
          
          // Emit token event
          yield {
            type: 'token',
            data: delta
          };
        }

        // Track usage if available
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens || 0;
          outputTokens = chunk.usage.completion_tokens || 0;
        }
      }

      const latencyMs = Date.now() - startTime;

      // Emit final metadata event
      yield {
        type: 'meta',
        data: {
          tokens_used: inputTokens + outputTokens,
          model: this.defaultModel,
          latency_ms: latencyMs
        }
      };

      // Log completion metrics
      logger.info({
        type: 'llm_stream_completion',
        correlationId,
        model: this.defaultModel,
        inputTokens,
        outputTokens,
        latencyMs,
        provider: 'openai'
      }, 'OpenAI streaming completion successful');

    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      logger.error({
        correlationId,
        model: this.defaultModel,
        latencyMs,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'OpenAI streaming completion failed');

      // Emit error event
      yield {
        type: 'error',
        data: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      throw error;
    }
  }
}

/**
 * Create LLM client based on provider
 */
export function createLLMClient(provider: string = 'openai'): LLMClient {
  switch (provider) {
    case 'openai':
    case 'cloud':
      return new OpenAIClient();
    case 'local':
      // TODO: Implement local Qwen client
      throw new Error('Local provider not yet implemented');
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}