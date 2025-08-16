/**
 * Entry point for the NYLA LLM Proxy server
 */

import { serve } from '@hono/node-server';
import app from './server.js';

// Start the server
const server = serve({
  fetch: app.fetch,
  port: app.port
});

console.log(`🚀 NYLA LLM Proxy server running at http://localhost:${app.port}`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});