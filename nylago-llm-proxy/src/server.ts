/**
 * NYLA LLM Proxy Server
 * Hono-based stateless LLM proxy for Cloud Run deployment
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { timeout } from 'hono/timeout';

import inferRoute from './routes/infer.js';
import { logger } from './lib/logger.js';
import { config, validateEnvironment } from './config.js';

// Create main app
const app = new Hono();

// Global middleware
app.use('*', secureHeaders());
app.use('*', prettyJSON());

// CORS configuration for NYLA Go clients
app.use('*', cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Allowed origins
    const allowedOrigins = [
      'https://sonyschan.github.io',  // PWA origin
      'http://localhost:3000',         // Local dev
      'http://localhost:5173',         // Vite dev
      'http://localhost:8080'          // Local proxy
    ];
    
    // Check if it's a Chrome extension
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    
    // Check allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log rejected origin for debugging
    logger.warn({ origin }, 'CORS origin rejected');
    callback(new Error('Not allowed by CORS'));
  },
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Correlation-ID'],
  exposeHeaders: ['X-Correlation-ID'],
  credentials: true
}));

// Request logging (structured for Cloud Run)
app.use('*', honoLogger((message, ...rest) => {
  logger.info({ 
    type: 'http_request',
    message,
    details: rest 
  });
}));

// Global timeout (29 seconds - just under Cloud Run's 30s limit)
app.use('*', timeout(29000));

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    service: 'nylago-llm-proxy',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    region: process.env.CLOUD_RUN_REGION || 'unknown'
  });
});

// API version endpoint
app.get('/v1', (c) => {
  return c.json({
    api_version: 'v1',
    endpoints: {
      inference: '/v1/infer',
      health: '/v1/health'
    },
    supported_providers: ['openai'],
    supported_models: [
      'gpt-4o-mini',
      'gpt-4o', 
      'gpt-3.5-turbo'
    ]
  });
});

// Health check with detailed status
app.get('/v1/health', async (c) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: {
      node_version: process.version,
      platform: process.platform,
      cloud_run: !!process.env.K_SERVICE
    },
    services: {
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        status: 'unknown' // Could add actual API health check
      }
    }
  };

  return c.json(health);
});

// Mount inference route
app.route('/v1/infer', inferRoute);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'NOT_FOUND',
    message: 'Endpoint not found',
    available_endpoints: [
      'GET /',
      'GET /v1',
      'GET /v1/health', 
      'POST /v1/infer'
    ]
  }, 404);
});

// Global error handler
app.onError((err, c) => {
  logger.error({
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    request: {
      method: c.req.method,
      url: c.req.url,
      headers: Object.fromEntries(c.req.header())
    }
  }, 'Unhandled error');

  return c.json({
    error: 'INTERNAL_ERROR',
    message: 'An internal server error occurred',
    timestamp: new Date().toISOString()
  }, 500);
});

// Validate environment before starting
try {
  validateEnvironment();
} catch (error) {
  logger.fatal({ error }, 'Environment validation failed');
  process.exit(1);
}

// Start server
const port = config.port;

logger.info({
  port,
  environment: config.nodeEnv,
  cloudRun: config.isCloudRun,
  defaultModel: config.defaultModel
}, 'Starting NYLA LLM Proxy server');

export default {
  port,
  fetch: app.fetch
};