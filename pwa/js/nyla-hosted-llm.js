/**
 * NYLA Hosted LLM Client
 * Handles communication with hosted LLM proxy service
 */

class NYLAHostedLLM {
    constructor() {
        this.endpoint = null;
        this.sessionId = this.generateSessionId();
        this.requestCount = 0;
        this.isReady = false;
        
        NYLALogger.debug('🌐 Hosted LLM: Initialized', {
            sessionId: this.sessionId
        });
    }

    /**
     * Initialize the hosted LLM client
     */
    async initialize() {
        try {
            this.endpoint = await window.NYLALLMConfig.getHostedEndpoint();
            if (!this.endpoint) {
                throw new Error('No hosted LLM endpoint available');
            }

            // Test connection
            const healthResponse = await fetch(this.endpoint.replace('/infer', '/health'), {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!healthResponse.ok) {
                throw new Error(`Health check failed: ${healthResponse.status}`);
            }

            this.isReady = true;
            NYLALogger.info('🌐 Hosted LLM: Initialized successfully', {
                endpoint: this.endpoint
            });

            return true;
        } catch (error) {
            NYLALogger.error('🌐 Hosted LLM: Initialization failed:', error);
            this.isReady = false;
            return false;
        }
    }

    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        return 'nyla-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate response from hosted LLM
     */
    async generateResponse(userQuery, context = []) {
        if (!this.isReady) {
            throw new Error('Hosted LLM not initialized');
        }

        const startTime = Date.now();
        this.requestCount++;

        try {
            const requestBody = {
                user_query: userQuery,
                context: Array.isArray(context) ? context : [context],
                params: {
                    max_tokens: 1200,
                    temperature: 0.3,
                    top_p: 0.9
                },
                ab: 'cloud',
                session_id: this.sessionId,
                tenant_id: 'nyla-pwa'
            };

            NYLALogger.debug('🌐 Hosted LLM: Sending request', {
                endpoint: this.endpoint,
                queryLength: userQuery.length,
                contextItems: requestBody.context.length
            });

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Correlation-ID': this.generateCorrelationId()
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            const latency = Date.now() - startTime;

            NYLALogger.info('🌐 Hosted LLM: Response received', {
                latency,
                answerLength: result.answer?.length || 0,
                followupsCount: result.followups?.length || 0
            });

            // Transform to match local LLM response format
            return {
                text: result.answer,
                sentiment: 'neutral', // Hosted LLM doesn't provide sentiment
                confidence: 1.0, // Hosted LLM manages confidence internally
                followUpSuggestions: result.followups || []
            };

        } catch (error) {
            const latency = Date.now() - startTime;
            NYLALogger.error('🌐 Hosted LLM: Request failed', {
                error: error.message,
                latency
            });
            throw error;
        }
    }

    /**
     * Generate streaming response from hosted LLM
     */
    async generateStreamingResponse(userQuery, context = [], streamCallback) {
        if (!this.isReady) {
            throw new Error('Hosted LLM not initialized');
        }

        const startTime = Date.now();
        this.requestCount++;

        try {
            const requestBody = {
                user_query: userQuery,
                context: Array.isArray(context) ? context : [context],
                params: {
                    max_tokens: 1200,
                    temperature: 0.3,
                    top_p: 0.9
                },
                ab: 'cloud',
                session_id: this.sessionId,
                tenant_id: 'nyla-pwa'
            };

            const streamEndpoint = this.endpoint + '/stream';
            NYLALogger.debug('🌐 Hosted LLM: Starting stream', {
                endpoint: streamEndpoint
            });

            const response = await fetch(streamEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Correlation-ID': this.generateCorrelationId()
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ') && line.length > 6) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                
                                if (line.startsWith('event: token')) {
                                    fullText += data;
                                    if (streamCallback) {
                                        streamCallback(data);
                                    }
                                } else if (line.startsWith('event: meta')) {
                                    NYLALogger.debug('🌐 Hosted LLM: Stream metadata', data);
                                }
                            } catch (parseError) {
                                // Ignore parse errors for streaming data
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }

            const latency = Date.now() - startTime;
            NYLALogger.info('🌐 Hosted LLM: Stream completed', {
                latency,
                totalLength: fullText.length
            });

            // Return final response in expected format
            return {
                text: fullText,
                sentiment: 'neutral',
                confidence: 1.0,
                followUpSuggestions: [] // Streaming doesn't include followups
            };

        } catch (error) {
            const latency = Date.now() - startTime;
            NYLALogger.error('🌐 Hosted LLM: Stream failed', {
                error: error.message,
                latency
            });
            throw error;
        }
    }

    /**
     * Generate correlation ID for request tracking
     */
    generateCorrelationId() {
        return `nyla-pwa-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }

    /**
     * Get status information
     */
    getStatus() {
        return {
            initialized: this.isReady,
            loading: false,
            ready: this.isReady,
            warmedUp: this.isReady,
            model: 'gpt-4o-mini',
            provider: 'hosted',
            endpoint: this.endpoint,
            requestCount: this.requestCount,
            sessionId: this.sessionId
        };
    }

    /**
     * Check if the hosted LLM is ready
     */
    isInitialized() {
        return this.isReady;
    }

    /**
     * Get warmup status (always true for hosted)
     */
    isWarmedUp() {
        return this.isReady;
    }

    /**
     * Reset session
     */
    resetSession() {
        this.sessionId = this.generateSessionId();
        NYLALogger.info('🌐 Hosted LLM: Session reset', {
            newSessionId: this.sessionId
        });
    }
}

// Export for use
window.NYLAHostedLLM = NYLAHostedLLM;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NYLAHostedLLM;
}