/**
 * NYLA Retrieval Logger
 * Comprehensive logging system for retrieval quality assurance
 */

class NYLARetrievalLogger {
  constructor(options = {}) {
    this.options = {
      enabled: true,
      logLevel: 'info', // 'debug', 'info', 'warn', 'error'
      maxLogEntries: 1000,
      persistToStorage: false,
      includeChunkContent: false, // For debugging only
      ...options
    };
    
    this.logs = [];
    this.sessionId = this.generateSessionId();
    this.queryCount = 0;
    
    console.log(`📊 Retrieval Logger initialized (Session: ${this.sessionId})`);
  }

  /**
   * Log a complete retrieval session
   */
  logRetrievalSession(sessionData) {
    if (!this.options.enabled) return;
    
    this.queryCount++;
    
    const logEntry = {
      sessionId: this.sessionId,
      queryId: sessionData.queryId || `q${this.queryCount}`,
      timestamp: new Date().toISOString(),
      query: {
        original: sessionData.query.original,
        processed: sessionData.query.processed,
        language: sessionData.query.language,
        expansions: sessionData.query.expansions,
        terms: sessionData.query.terms
      },
      retrieval: {
        denseResults: this.summarizeResults(sessionData.denseResults),
        bm25Results: this.summarizeResults(sessionData.bm25Results),
        mergedResults: this.summarizeResults(sessionData.mergedResults),
        finalResults: this.summarizeResults(sessionData.finalResults)
      },
      performance: {
        totalTime: sessionData.performance.totalTime,
        denseTime: sessionData.performance.denseTime,
        bm25Time: sessionData.performance.bm25Time,
        rerankTime: sessionData.performance.rerankTime
      },
      parameters: sessionData.parameters,
      metadata: {
        userId: sessionData.userId,
        context: sessionData.context,
        success: sessionData.success,
        errorMessage: sessionData.errorMessage
      }
    };
    
    // Add detailed chunk content for debugging (if enabled)
    if (this.options.includeChunkContent) {
      logEntry.chunks = sessionData.finalResults.map(result => ({
        id: result.id,
        title: result.title,
        content: result.body?.substring(0, 200) + '...',
        scores: {
          dense: result.dense_score,
          bm25: result.bm25_score,
          fusion: result.fusion_score,
          final: result.final_score
        }
      }));
    }
    
    this.addLogEntry(logEntry);
    
    // Log summary to console
    this.logToConsole('info', `🔍 Query processed: "${sessionData.query.original}"`, {
      results: sessionData.finalResults.length,
      time: sessionData.performance.totalTime + 'ms',
      topScore: sessionData.finalResults[0]?.final_score?.toFixed(3)
    });
  }

  /**
   * Log query preprocessing details
   */
  logQueryProcessing(queryData) {
    if (!this.options.enabled) return;
    
    this.logToConsole('debug', '📝 Query preprocessing', {
      original: queryData.original,
      processed: queryData.processed,
      language: queryData.language,
      expansions: queryData.expansions.length,
      terms: queryData.terms.length
    });
  }

  /**
   * Log retrieval stage results
   */
  logRetrievalStage(stage, results, timeTaken) {
    if (!this.options.enabled) return;
    
    const summary = this.summarizeResults(results);
    
    this.logToConsole('debug', `🎯 ${stage} retrieval`, {
      count: summary.count,
      avgScore: summary.avgScore,
      topScore: summary.topScore,
      time: timeTaken + 'ms'
    });
  }

  /**
   * Log reranking details
   */
  logReranking(beforeResults, afterResults, rerankTime) {
    if (!this.options.enabled) return;
    
    const positionChanges = this.calculatePositionChanges(beforeResults, afterResults);
    
    this.logToConsole('debug', '🔄 Reranking applied', {
      before: beforeResults.length,
      after: afterResults.length,
      time: rerankTime + 'ms',
      significantMoves: positionChanges.filter(change => Math.abs(change.movement) > 2).length
    });
  }

  /**
   * Log filtering and noise control
   */
  logFiltering(beforeFilter, afterFilter, filters) {
    if (!this.options.enabled) return;
    
    const filtersApplied = Object.entries(filters).filter(([key, value]) => value).map(([key]) => key);
    
    this.logToConsole('debug', '🎛️ Content filtering', {
      before: beforeFilter.length,
      after: afterFilter.length,
      removed: beforeFilter.length - afterFilter.length,
      filters: filtersApplied
    });
  }

  /**
   * Log volatility control actions
   */
  logVolatilityControl(volatilityStats) {
    if (!this.options.enabled) return;
    
    this.logToConsole('info', '⏰ Volatility control', {
      stable: volatilityStats.stable,
      volatile: volatilityStats.recent_volatile,
      outdated: volatilityStats.outdated,
      transformations: volatilityStats.transformations_applied
    });
  }

  /**
   * Log performance warning
   */
  logPerformanceWarning(metric, value, threshold) {
    if (!this.options.enabled) return;
    
    this.logToConsole('warn', `⚠️ Performance warning: ${metric}`, {
      value: value,
      threshold: threshold,
      difference: value - threshold
    });
  }

  /**
   * Log retrieval error
   */
  logError(error, context) {
    if (!this.options.enabled) return;
    
    this.logToConsole('error', `❌ Retrieval error: ${error.message}`, {
      context,
      stack: error.stack?.substring(0, 200) + '...'
    });
  }

  /**
   * Summarize results for logging
   */
  summarizeResults(results) {
    if (!results || results.length === 0) {
      return { count: 0, avgScore: 0, topScore: 0, bottomScore: 0 };
    }
    
    const scores = results.map(r => 
      r.final_score || r.cross_encoder_score || r.fusion_score || r.score || 0
    );
    
    return {
      count: results.length,
      avgScore: (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(3),
      topScore: Math.max(...scores).toFixed(3),
      bottomScore: Math.min(...scores).toFixed(3)
    };
  }

  /**
   * Calculate position changes in reranking
   */
  calculatePositionChanges(beforeResults, afterResults) {
    const changes = [];
    
    for (let i = 0; i < afterResults.length; i++) {
      const result = afterResults[i];
      const originalIndex = beforeResults.findIndex(r => r.id === result.id);
      
      if (originalIndex >= 0) {
        changes.push({
          id: result.id,
          originalPosition: originalIndex,
          newPosition: i,
          movement: originalIndex - i // Positive = moved up
        });
      }
    }
    
    return changes;
  }

  /**
   * Add log entry to storage
   */
  addLogEntry(logEntry) {
    this.logs.push(logEntry);
    
    // Trim logs if exceeding max entries
    if (this.logs.length > this.options.maxLogEntries) {
      this.logs = this.logs.slice(-this.options.maxLogEntries);
    }
    
    // Persist to storage if enabled
    if (this.options.persistToStorage) {
      this.persistLogs();
    }
  }

  /**
   * Log to console with appropriate level
   */
  logToConsole(level, message, data) {
    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = logLevels[this.options.logLevel] || 1;
    const messageLevel = logLevels[level] || 1;
    
    if (messageLevel >= currentLevel) {
      const logMethod = console[level] || console.log;
      logMethod(message, data);
    }
  }

  /**
   * Get retrieval analytics
   */
  getAnalytics(timeWindowHours = 24) {
    const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => new Date(log.timestamp) > cutoffTime);
    
    if (recentLogs.length === 0) {
      return { message: 'No recent retrieval data available' };
    }
    
    const analytics = {
      timeWindow: `${timeWindowHours} hours`,
      totalQueries: recentLogs.length,
      performance: {
        avgTotalTime: this.calculateAverage(recentLogs, 'performance.totalTime'),
        avgDenseTime: this.calculateAverage(recentLogs, 'performance.denseTime'),
        avgBm25Time: this.calculateAverage(recentLogs, 'performance.bm25Time'),
        avgRerankTime: this.calculateAverage(recentLogs, 'performance.rerankTime')
      },
      retrieval: {
        avgDenseResults: this.calculateAverage(recentLogs, 'retrieval.denseResults.count'),
        avgBm25Results: this.calculateAverage(recentLogs, 'retrieval.bm25Results.count'),
        avgFinalResults: this.calculateAverage(recentLogs, 'retrieval.finalResults.count'),
        avgTopScore: this.calculateAverage(recentLogs, 'retrieval.finalResults.topScore')
      },
      languages: this.getLanguageDistribution(recentLogs),
      queryTypes: this.getQueryTypeDistribution(recentLogs),
      successRate: this.getSuccessRate(recentLogs)
    };
    
    return analytics;
  }

  /**
   * Calculate average for nested property
   */
  calculateAverage(logs, property) {
    const values = logs.map(log => this.getNestedProperty(log, property)).filter(v => v !== undefined);
    if (values.length === 0) return 0;
    return (values.reduce((sum, val) => sum + parseFloat(val), 0) / values.length).toFixed(2);
  }

  /**
   * Get nested property value
   */
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get language distribution
   */
  getLanguageDistribution(logs) {
    const languages = {};
    logs.forEach(log => {
      const lang = log.query?.language || 'unknown';
      languages[lang] = (languages[lang] || 0) + 1;
    });
    return languages;
  }

  /**
   * Get query type distribution (based on first few words)
   */
  getQueryTypeDistribution(logs) {
    const types = {};
    logs.forEach(log => {
      const query = log.query?.original?.toLowerCase() || '';
      let type = 'other';
      
      if (query.startsWith('how')) type = 'how-to';
      else if (query.startsWith('what')) type = 'definition';
      else if (query.startsWith('why')) type = 'explanation';
      else if (query.includes('error') || query.includes('problem')) type = 'troubleshooting';
      else if (query.includes('fee') || query.includes('cost')) type = 'pricing';
      
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  /**
   * Calculate success rate
   */
  getSuccessRate(logs) {
    const successful = logs.filter(log => log.metadata?.success !== false).length;
    return ((successful / logs.length) * 100).toFixed(1) + '%';
  }

  /**
   * Export logs for manual analysis
   */
  exportLogs(format = 'json') {
    if (format === 'csv') {
      return this.exportLogsAsCSV();
    }
    
    return JSON.stringify({
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      totalQueries: this.logs.length,
      logs: this.logs
    }, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportLogsAsCSV() {
    const headers = [
      'timestamp', 'queryId', 'originalQuery', 'processedQuery', 'language',
      'expansions', 'denseResults', 'bm25Results', 'finalResults',
      'totalTime', 'denseTime', 'bm25Time', 'rerankTime', 'topScore', 'success'
    ];
    
    const rows = this.logs.map(log => [
      log.timestamp,
      log.queryId,
      `"${log.query?.original || ''}"`,
      `"${log.query?.processed || ''}"`,
      log.query?.language || '',
      log.query?.expansions?.length || 0,
      log.retrieval?.denseResults?.count || 0,
      log.retrieval?.bm25Results?.count || 0,
      log.retrieval?.finalResults?.count || 0,
      log.performance?.totalTime || 0,
      log.performance?.denseTime || 0,
      log.performance?.bm25Time || 0,
      log.performance?.rerankTime || 0,
      log.retrieval?.finalResults?.topScore || 0,
      log.metadata?.success ? 'true' : 'false'
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Persist logs to browser storage
   */
  persistLogs() {
    if (typeof localStorage !== 'undefined') {
      try {
        const logData = {
          sessionId: this.sessionId,
          logs: this.logs.slice(-100) // Keep only recent 100 logs
        };
        localStorage.setItem('nyla-retrieval-logs', JSON.stringify(logData));
      } catch (error) {
        console.warn('⚠️ Failed to persist retrieval logs:', error);
      }
    }
  }

  /**
   * Load persisted logs
   */
  loadPersistedLogs() {
    if (typeof localStorage !== 'undefined') {
      try {
        const logData = localStorage.getItem('nyla-retrieval-logs');
        if (logData) {
          const parsed = JSON.parse(logData);
          this.logs = parsed.logs || [];
          console.log(`📊 Loaded ${this.logs.length} persisted retrieval logs`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to load persisted logs:', error);
      }
    }
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return 'rs_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this.queryCount = 0;
    if (this.options.persistToStorage && typeof localStorage !== 'undefined') {
      localStorage.removeItem('nyla-retrieval-logs');
    }
    console.log('🧹 Retrieval logs cleared');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLARetrievalLogger;
}
window.NYLARetrievalLogger = NYLARetrievalLogger;