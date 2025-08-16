/**
 * Structured JSON logger for Cloud Run
 * Uses pino for performance and GCP-compatible structured logging
 */

import pino from 'pino';

// Cloud Run environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isCloudRun = process.env.K_SERVICE !== undefined;

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  
  // Cloud Run compatible structured logging
  formatters: {
    level: (label: string) => ({ severity: label.toUpperCase() }),
    log: (object: any) => ({
      ...object,
      timestamp: new Date().toISOString(),
      service: 'nylago-llm-proxy',
      version: process.env.K_REVISION || 'local'
    })
  },

  // Pretty print for local development
  transport: !isCloudRun ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    }
  } : undefined
});

/**
 * Create request-scoped logger with correlation ID
 */
export function createRequestLogger(correlationId: string) {
  return logger.child({ 
    correlationId,
    requestId: correlationId 
  });
}

/**
 * Log LLM request/response metrics
 */
export function logLLMMetrics(data: {
  correlationId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  provider: string;
}) {
  logger.info({
    type: 'llm_metrics',
    ...data
  }, 'LLM request completed');
}

/**
 * Log error with structured context
 */
export function logError(error: Error, context: Record<string, any> = {}) {
  logger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    ...context
  }, 'Error occurred');
}