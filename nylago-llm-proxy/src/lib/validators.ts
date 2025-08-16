/**
 * Zod validation schemas for API requests and responses
 */

import { z } from 'zod';

// LLM parameters schema - simplified
export const LLMParamsSchema = z.object({
  max_tokens: z.number().min(1).max(4096).default(512),
  temperature: z.number().min(0).max(2).default(0.3),
  top_p: z.number().min(0).max(1).default(0.9)
});

// Inference request schema - refactored to match requirements
export const InferRequestSchema = z.object({
  user_query: z.string().min(1).max(2000),
  context: z.array(z.string()).default([]),
  system_prompt: z.string().max(4000).optional(),
  params: LLMParamsSchema.optional(),
  ab: z.enum(['local', 'cloud', 'auto']).optional().default('cloud'),
  // Session tracking for follow-up deduplication
  tenant_id: z.string().optional(),
  session_id: z.string().optional()
});

// Internal LLM response schema (includes confidence)
export const LLMResponseSchema = z.object({
  answer: z.string(),
  followups: z.array(z.string()).max(3).default([]),
  self_confidence: z.number().min(0).max(1)
});

// Public inference response schema - simplified (no confidence exposed)
export const InferResponseSchema = z.object({
  answer: z.string(),
  followups: z.array(z.string()).max(3).default([])
});

// Streaming event types
export const StreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('token'),
    data: z.string()
  }),
  z.object({
    type: z.literal('meta'),
    data: z.object({
      tokens_used: z.number(),
      model: z.string(),
      latency_ms: z.number()
    })
  }),
  z.object({
    type: z.literal('error'),
    data: z.object({
      message: z.string()
    })
  })
]);

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string()
});

// Type exports
export type LLMParams = z.infer<typeof LLMParamsSchema>;
export type InferRequest = z.infer<typeof InferRequestSchema>;
export type InferResponse = z.infer<typeof InferResponseSchema>;
export type StreamEvent = z.infer<typeof StreamEventSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;