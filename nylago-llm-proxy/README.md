# NYLA LLM Proxy

A stateless LLM proxy service for NYLA Go, designed for deployment on Google Cloud Run. Provides high-performance OpenAI integration with streaming support, structured logging, and comprehensive validation.

## Features

- **🚀 High Performance**: Hono-based server with native fetch() streaming
- **🔒 Production Ready**: Security headers, CORS, validation, and error handling
- **📊 Observability**: Structured JSON logging for Cloud Run/Cloud Logging
- **🌐 Multi-language**: Optimized for English and Chinese queries
- **⚡ Streaming**: Real-time response streaming with Server-Sent Events
- **🔧 A/B Testing**: Easy toggle between local and cloud LLM providers

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set environment variables
export OPENAI_API_KEY="your-api-key"

# Start development server
npm run dev

# Test the API
curl -X POST http://localhost:8080/v1/infer \
  -H "Content-Type: application/json" \
  -d '{
    "user_query": "What is NYLA?",
    "model": "gpt-4o-mini",
    "stream": false
  }'
```

### Docker Development

```bash
# Build and run with Docker
npm run docker:build
npm run docker:run

# Server will be available at http://localhost:8080
```

## API Reference

### POST /v1/infer

Main inference endpoint for LLM requests (non-streaming).

**Request Schema:**
```json
{
  "user_query": "string",         // Required: User's question
  "context": ["string"],          // Optional: Array of context strings
  "system_prompt": "string",      // Optional: Custom system prompt
  "params": {                     // Optional: LLM parameters
    "max_tokens": 512,            // 1-4096, default 512
    "temperature": 0.3,           // 0-2, default 0.3
    "top_p": 0.9                  // 0-1, default 0.9
  },
  "ab": "local|cloud|auto"        // Optional: Provider selection (default "cloud")
}
```

**Response Schema:**
```json
{
  "answer": "string",
  "followups": ["string", "string"]  // Up to 3 follow-up suggestions
}
```

### POST /v1/infer/stream

Streaming inference endpoint that returns text/event-stream.

**Request Schema:** Same as `/v1/infer`

**Response Format:** Server-Sent Events (SSE)
```
event: token
data: "partial text"

event: token
data: " more text"

event: meta
data: {"tokens_used": 150, "model": "gpt-4o-mini", "latency_ms": 1250}
```

**Event Types:**
- `token`: Streaming text tokens
- `meta`: Final metadata (tokens used, model, latency)
- `error`: Error information

### Other Endpoints

- `GET /` - Service health and info
- `GET /v1` - API version and capabilities
- `GET /v1/health` - Detailed health check

## Cloud Run Deployment

### Prerequisites

1. Google Cloud Project with Cloud Run enabled
2. Docker and `gcloud` CLI installed
3. OpenAI API key stored in Secret Manager

### Setup Secret Manager

```bash
# Create secret for OpenAI API key
gcloud secrets create openai-api-key --data-file=-
# Enter your API key when prompted

# Grant Cloud Run access to the secret
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:YOUR-PROJECT-NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Deploy to Cloud Run

```bash
# Deploy directly from source
npm run deploy

# Or deploy with specific configuration
gcloud run deploy nylago-llm-proxy \
  --source . \
  --region northamerica-northeast2 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 1000 \
  --timeout 30s
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | OpenAI API key (use Secret Manager in prod) |
| `NODE_ENV` | No | `development` | Environment (development/production) |
| `PORT` | No | `8080` | Server port (Cloud Run sets this automatically) |
| `LOG_LEVEL` | No | `info` | Logging level (debug/info/warn/error) |

## Integration with NYLA Go

### Client-side Integration

```typescript
// NYLA Go client example
const response = await fetch('https://your-service.run.app/v1/infer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Provider': 'openai' // A/B testing header
  },
  body: JSON.stringify({
    user_query: userInput,
    context: ragResults,
    model: 'gpt-4o-mini',
    stream: true
  })
});

if (response.ok) {
  const reader = response.body.getReader();
  // Handle streaming response
}
```

### A/B Testing

Toggle between local Qwen and cloud OpenAI:

```typescript
const provider = useCloudLLM ? 'openai' : 'local';
const endpoint = provider === 'openai' 
  ? 'https://your-service.run.app/v1/infer'
  : '/api/local-llm';
```

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Lint code with ESLint

### Project Structure

```
src/
├── server.ts              # Main Hono application
├── routes/
│   └── infer.ts          # Inference endpoint
└── lib/
    ├── llm.ts            # OpenAI client implementation
    ├── prompt.ts         # Prompt assembly and formatting
    ├── followups.ts      # Follow-up question generation
    ├── validators.ts     # Zod validation schemas
    └── logger.ts         # Structured logging
```

### Testing

```bash
# Unit tests
npm test

# E2E tests (requires running server)
npm run dev &  # Start server in background
npm run test:e2e
```

## Monitoring and Observability

### Cloud Logging

The service outputs structured JSON logs compatible with Cloud Logging:

```json
{
  "severity": "INFO",
  "timestamp": "2024-08-16T00:00:00.000Z",
  "service": "nylago-llm-proxy",
  "type": "llm_completion",
  "correlationId": "uuid",
  "model": "gpt-4o-mini",
  "inputTokens": 150,
  "outputTokens": 200,
  "latencyMs": 1250,
  "provider": "openai"
}
```

### Key Metrics to Monitor

- **Request latency**: `latencyMs` field in completion logs
- **Token usage**: `inputTokens` and `outputTokens` for cost tracking
- **Error rates**: Error logs with correlation IDs for debugging
- **Model performance**: Response quality and follow-up relevance

### Health Checks

Cloud Run will automatically health check the service:
- **Startup probe**: `GET /v1/health`
- **Liveness probe**: `GET /v1/health` 
- **Custom health**: Docker HEALTHCHECK with 30s intervals

## Security

- **CORS**: Configured for NYLA Go domains and Chrome extensions
- **Headers**: Security headers via Hono middleware
- **Secrets**: API keys stored in Google Secret Manager
- **User**: Container runs as non-root user (nodejs:1001)
- **Validation**: All inputs validated with Zod schemas
- **Timeouts**: 29s global timeout (under Cloud Run's 30s limit)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.