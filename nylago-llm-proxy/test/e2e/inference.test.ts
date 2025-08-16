/**
 * E2E tests for inference endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { InferRequest, InferResponse, ContextChunk } from '../../src/lib/validators.js';

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/v1`;

describe('Inference API E2E Tests', () => {
  beforeAll(async () => {
    // Wait for server to be ready
    let attempts = 0;
    while (attempts < 10) {
      try {
        const response = await fetch(`${BASE_URL}/v1/health`);
        if (response.ok) break;
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  });

  describe('Health Checks', () => {
    it('should return service info on root endpoint', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.service).toBe('nylago-llm-proxy');
      expect(data.status).toBe('healthy');
    });

    it('should return API info on /v1 endpoint', async () => {
      const response = await fetch(`${API_BASE}`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.api_version).toBe('v1');
      expect(data.endpoints).toBeDefined();
      expect(data.supported_providers).toContain('openai');
    });

    it('should return detailed health status', async () => {
      const response = await fetch(`${API_BASE}/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.uptime).toBeTypeOf('number');
      expect(data.services.openai).toBeDefined();
    });
  });

  describe('Inference Endpoint', () => {
    it('should handle basic inference request', async () => {
      const request: InferRequest = {
        user_query: 'What is NYLA?',
        context: [],
        model: 'gpt-4o-mini',
        stream: false,
        provider: 'openai'
      };

      const response = await fetch(`${API_BASE}/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Correlation-ID')).toBeTruthy();
      
      const data: InferResponse = await response.json();
      expect(data.answer).toBeTruthy();
      expect(data.followups).toBeInstanceOf(Array);
      expect(data.metadata.model).toBe('gpt-4o-mini');
      expect(data.metadata.provider).toBe('openai');
      expect(data.metadata.correlation_id).toBeTruthy();
    });

    it('should handle inference with context', async () => {
      const context: ContextChunk[] = [
        {
          id: 'test_chunk_1',
          text: 'NYLA is an AI assistant specialized in cryptocurrency and blockchain technology.',
          metadata: {
            title: 'NYLA Overview',
            source: 'knowledge_base',
            score: 0.95
          }
        }
      ];

      const request: InferRequest = {
        user_query: 'Tell me about NYLA',
        context,
        model: 'gpt-4o-mini',
        stream: false,
        provider: 'openai'
      };

      const response = await fetch(`${API_BASE}/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      expect(response.status).toBe(200);
      
      const data: InferResponse = await response.json();
      expect(data.answer).toBeTruthy();
      expect(data.answer.toLowerCase()).toContain('nyla');
    });

    it('should handle Chinese language queries', async () => {
      const request: InferRequest = {
        user_query: '什么是NYLA？',
        context: [],
        model: 'gpt-4o-mini',
        stream: false,
        provider: 'openai'
      };

      const response = await fetch(`${API_BASE}/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      expect(response.status).toBe(200);
      
      const data: InferResponse = await response.json();
      expect(data.answer).toBeTruthy();
      expect(data.followups.length).toBeGreaterThan(0);
    });

    it('should validate request parameters', async () => {
      const invalidRequest = {
        user_query: '', // Empty query should fail
        model: 'invalid-model'
      };

      const response = await fetch(`${API_BASE}/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidRequest)
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.correlation_id).toBeTruthy();
    });

    it('should handle streaming responses', async () => {
      const request: InferRequest = {
        user_query: 'Explain blockchain technology',
        context: [],
        model: 'gpt-4o-mini',
        stream: true,
        provider: 'openai'
      };

      const response = await fetch(`${API_BASE}/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');
      expect(response.headers.get('X-Correlation-ID')).toBeTruthy();

      // Read streaming response
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      if (reader) {
        let chunks = 0;
        let done = false;
        
        while (!done && chunks < 5) { // Read first few chunks
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          
          if (value) {
            const text = new TextDecoder().decode(value);
            expect(text).toContain('data:');
            chunks++;
          }
        }
        
        reader.releaseLock();
        expect(chunks).toBeGreaterThan(0);
      }
    }, 15000); // Longer timeout for streaming test

    it('should handle custom LLM parameters', async () => {
      const request: InferRequest = {
        user_query: 'What is cryptocurrency?',
        context: [],
        params: {
          temperature: 0.1,
          max_tokens: 100,
          top_p: 0.9,
          frequency_penalty: 0.2,
          presence_penalty: 0.1
        },
        model: 'gpt-4o-mini',
        stream: false,
        provider: 'openai'
      };

      const response = await fetch(`${API_BASE}/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      expect(response.status).toBe(200);
      
      const data: InferResponse = await response.json();
      expect(data.answer).toBeTruthy();
      expect(data.answer.length).toBeLessThan(800); // Should be shorter due to max_tokens
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await fetch(`${API_BASE}/unknown`);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBe('NOT_FOUND');
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${API_BASE}/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      expect(response.status).toBe(400);
    });
  });
});