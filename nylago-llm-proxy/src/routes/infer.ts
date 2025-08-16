/**
 * /infer endpoints - LLM inference routes
 */

import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { createLLMClient } from '../lib/llm.js';
import { assemblePrompt, sanitizeQuery } from '../lib/prompt.js';
import { 
  InferRequestSchema, 
  LLMParamsSchema,
  type InferRequest,
  type InferResponse,
  type ErrorResponse
} from '../lib/validators.js';
import { createRequestLogger, logError } from '../lib/logger.js';
import { followupCache } from '../lib/lru-cache.js';
import { randomUUID } from 'crypto';

const app = new Hono();

/**
 * POST /infer - Main inference endpoint (non-streaming)
 */
app.post('/', async (c) => {
  const correlationId = randomUUID();
  const reqLogger = createRequestLogger(correlationId);
  const startTime = Date.now();

  try {
    // Parse and validate request
    const body = await c.req.json();
    const validationResult = InferRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errorResponse: ErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request format'
      };
      
      reqLogger.warn({ 
        validationErrors: validationResult.error.issues,
        requestBody: body 
      }, 'Request validation failed');
      
      return c.json(errorResponse, 400);
    }

    const request: InferRequest = validationResult.data;
    
    // Log incoming request
    reqLogger.info({
      userQuery: request.user_query.slice(0, 100) + '...',
      contextItems: request.context.length,
      ab: request.ab,
      hasSystemPrompt: !!request.system_prompt
    }, 'Processing inference request');

    // Sanitize and prepare inputs
    const sanitizedQuery = sanitizeQuery(request.user_query);
    
    // Assemble prompt
    const { system, user, estimatedTokens } = assemblePrompt(
      sanitizedQuery,
      request.context,
      request.system_prompt
    );

    reqLogger.debug({
      estimatedTokens,
      systemPromptLength: system.length,
      userPromptLength: user.length
    }, 'Prompt assembled');

    // Merge provided params with defaults
    const params = LLMParamsSchema.parse(request.params || {});
    
    // Determine provider based on ab parameter
    const provider = request.ab === 'local' ? 'local' : 'cloud';
    
    // Check cache for existing followups
    const cachedFollowups = followupCache.get(
      sanitizedQuery,
      request.tenant_id,
      request.session_id
    );

    // Create LLM client
    const llmClient = createLLMClient(provider);

    // Generate response
    const response = await llmClient.generateResponse(
      system,
      user,
      params,
      correlationId
    );

    // Enhance followups with cache deduplication
    let finalFollowups = response.followups;
    
    if (cachedFollowups && cachedFollowups.length > 0) {
      // Deduplicate with cached followups
      const uniqueFollowups = response.followups.filter(
        followup => !cachedFollowups.some(
          cached => cached.toLowerCase().trim() === followup.toLowerCase().trim()
        )
      );
      
      // Combine unique new followups with some cached ones
      finalFollowups = [
        ...uniqueFollowups.slice(0, 2),
        ...cachedFollowups.slice(0, 1)
      ].slice(0, 3);

      reqLogger.debug({
        originalFollowups: response.followups.length,
        cachedFollowups: cachedFollowups.length,
        finalFollowups: finalFollowups.length
      }, 'Followup deduplication applied');
    } else {
      // Cache new followups for future requests
      if (finalFollowups.length > 0) {
        followupCache.set(
          sanitizedQuery,
          finalFollowups,
          request.tenant_id,
          request.session_id
        );
      }
    }

    // Update response with deduplicated followups
    const finalResponse: InferResponse = {
      answer: response.answer,
      followups: finalFollowups
    };

    const totalLatency = Date.now() - startTime;
    reqLogger.info({
      totalLatency,
      outputLength: finalResponse.answer.length,
      followupsCount: finalResponse.followups.length,
      cacheHit: !!cachedFollowups
    }, 'Inference completed');

    return c.json(finalResponse, {
      headers: {
        'X-Correlation-ID': correlationId
      }
    });

  } catch (error) {
    const totalLatency = Date.now() - startTime;
    logError(error as Error, { correlationId, totalLatency });

    const errorResponse: ErrorResponse = {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };

    c.header('X-Correlation-ID', correlationId);
    return c.json(errorResponse, 500);
  }
});

/**
 * POST /infer/stream - Streaming inference endpoint
 */
app.post('/stream', async (c) => {
  const correlationId = randomUUID();
  const reqLogger = createRequestLogger(correlationId);
  const startTime = Date.now();

  try {
    // Parse and validate request
    const body = await c.req.json();
    const validationResult = InferRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errorResponse: ErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request format'
      };
      
      return c.json(errorResponse, 400);
    }

    const request: InferRequest = validationResult.data;
    
    // Log incoming request
    reqLogger.info({
      userQuery: request.user_query.slice(0, 100) + '...',
      contextItems: request.context.length,
      ab: request.ab,
      streaming: true
    }, 'Processing streaming inference request');

    // Prepare prompt
    const sanitizedQuery = sanitizeQuery(request.user_query);
    const { system, user } = assemblePrompt(
      sanitizedQuery,
      request.context,
      request.system_prompt
    );

    // Get params
    const params = LLMParamsSchema.parse(request.params || {});
    
    // Determine provider
    const provider = request.ab === 'local' ? 'local' : 'cloud';
    
    // Create LLM client
    const llmClient = createLLMClient(provider);

    // Return streaming response
    return stream(c, async (stream) => {
      // Set headers
      c.header('Content-Type', 'text/event-stream');
      c.header('Cache-Control', 'no-cache');
      c.header('Connection', 'keep-alive');
      c.header('X-Correlation-ID', correlationId);
      
      try {
        const generator = llmClient.generateResponseStream(
          system,
          user,
          params,
          correlationId
        );

        for await (const event of generator) {
          // Write event in SSE format
          await stream.write(`event: ${event.type}\n`);
          await stream.write(`data: ${JSON.stringify(event.data)}\n\n`);
        }

        const totalLatency = Date.now() - startTime;
        reqLogger.info({ 
          totalLatency,
          streaming: true 
        }, 'Streaming inference completed');

      } catch (error) {
        logError(error as Error, { correlationId, streaming: true });
        
        // Send error event
        await stream.write(`event: error\n`);
        await stream.write(`data: ${JSON.stringify({
          message: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`);
      }
    });

  } catch (error) {
    const totalLatency = Date.now() - startTime;
    logError(error as Error, { correlationId, totalLatency });

    const errorResponse: ErrorResponse = {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };

    c.header('X-Correlation-ID', correlationId);
    return c.json(errorResponse, 500);
  }
});

/**
 * GET /infer - Health check for inference endpoint
 */
app.get('/', (c) => {
  return c.json({
    status: 'healthy',
    endpoints: {
      inference: 'POST /infer',
      streaming: 'POST /infer/stream'
    },
    timestamp: new Date().toISOString()
  });
});

export default app;