/**
 * LRU Cache for follow-up deduplication with session support
 * Per user session caching with TTL and size limits
 */

import { createHash } from 'crypto';
import { logger } from './logger.js';

export interface CacheEntry {
  followups: string[];
  ts: number;
}

export interface CacheConfig {
  maxSize: number;
  ttlMs: number;
}

/**
 * LRU Cache with TTL support for follow-up deduplication
 */
export class SessionLRUCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>(); // Access timestamp for LRU
  private config: CacheConfig;
  private accessCounter = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000, // Default 1000 entries
      ttlMs: config.ttlMs || 5 * 60 * 1000 // Default 5 minutes
    };

    // Cleanup expired entries every minute
    setInterval(() => this.cleanupExpired(), 60 * 1000);

    logger.debug({
      maxSize: this.config.maxSize,
      ttlMs: this.config.ttlMs
    }, 'SessionLRUCache initialized');
  }

  /**
   * Generate cache key from session and question
   */
  private generateKey(
    question: string,
    tenantId?: string,
    sessionId?: string
  ): string {
    // Normalize question: lowercase, trim, collapse whitespace
    const normalized = question
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 500); // Limit length

    // Hash normalized question for consistent key
    const questionHash = createHash('sha256')
      .update(normalized)
      .digest('hex')
      .slice(0, 16); // Use first 16 chars of hash

    const tenant = tenantId || 'anon';
    const session = sessionId || 'default';

    return `${tenant}:${session}:${questionHash}`;
  }

  /**
   * Get cached followups if available and not expired
   */
  get(
    question: string,
    tenantId?: string,
    sessionId?: string
  ): string[] | null {
    const key = this.generateKey(question, tenantId, sessionId);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.ts > this.config.ttlMs) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      logger.debug({ key, age: now - entry.ts }, 'Cache entry expired');
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(key, ++this.accessCounter);

    logger.debug({ 
      key, 
      followupsCount: entry.followups.length,
      age: now - entry.ts 
    }, 'Cache hit');

    return entry.followups;
  }

  /**
   * Set cached followups for a question
   */
  set(
    question: string,
    followups: string[],
    tenantId?: string,
    sessionId?: string
  ): void {
    const key = this.generateKey(question, tenantId, sessionId);
    const now = Date.now();

    // Add/update entry
    this.cache.set(key, {
      followups: [...followups], // Copy array
      ts: now
    });

    // Update access order
    this.accessOrder.set(key, ++this.accessCounter);

    logger.debug({ 
      key, 
      followupsCount: followups.length,
      cacheSize: this.cache.size 
    }, 'Cache set');

    // Trigger cleanup if we're over size limit
    if (this.cache.size > this.config.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Remove expired entries based on TTL
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.ts > this.config.ttlMs) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.debug({
        removedCount,
        remainingSize: this.cache.size
      }, 'Cache TTL cleanup completed');
    }
  }

  /**
   * Evict least recently used entries when size limit exceeded
   */
  private evictLRU(): void {
    const targetSize = Math.floor(this.config.maxSize * 0.8); // Evict to 80% capacity
    const entriesToEvict = this.cache.size - targetSize;
    
    if (entriesToEvict <= 0) return;

    // Sort by access order (ascending = oldest first)
    const sortedByAccess = Array.from(this.accessOrder.entries())
      .sort(([, a], [, b]) => a - b)
      .slice(0, entriesToEvict);

    for (const [key] of sortedByAccess) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    logger.debug({
      evictedCount: entriesToEvict,
      newSize: this.cache.size,
      targetSize
    }, 'LRU eviction completed');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttlMs: number;
    accessCounter: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttlMs: this.config.ttlMs,
      accessCounter: this.accessCounter
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;

    logger.info({
      clearedEntries: previousSize
    }, 'Cache cleared');
  }
}

// Global cache instance
export const followupCache = new SessionLRUCache({
  maxSize: 1500, // Allow up to 1500 entries
  ttlMs: 5 * 60 * 1000 // 5 minutes TTL
});