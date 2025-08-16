/**
 * Configuration loader for environment variables
 * Loads from .env file in development
 */

import dotenv from 'dotenv';
import { logger } from './lib/logger.js';

// Load .env file in development
if (process.env.NODE_ENV !== 'production') {
  const result = dotenv.config();
  
  if (result.error) {
    logger.warn({ error: result.error }, 'Failed to load .env file');
  } else {
    logger.info('Loaded environment variables from .env file');
  }
}

// Validate required environment variables
export function validateEnvironment(): void {
  const required = ['OPENAI_API_KEY'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error({ missing }, error);
    throw new Error(error);
  }

  // Log configuration (without sensitive data)
  logger.info({
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 8080,
    logLevel: process.env.LOG_LEVEL || 'info',
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    defaultModel: process.env.DEFAULT_MODEL || 'gpt-4o-mini'
  }, 'Environment configuration loaded');
}

// Export configuration
export const config = {
  // Server
  port: Number(process.env.PORT) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  defaultModel: process.env.DEFAULT_MODEL || 'gpt-4o-mini',
  
  // Cloud Run
  isCloudRun: !!process.env.K_SERVICE,
  cloudRunRegion: process.env.CLOUD_RUN_REGION,
  cloudRunService: process.env.K_SERVICE,
  cloudRunRevision: process.env.K_REVISION
};