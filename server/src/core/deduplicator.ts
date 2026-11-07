import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

interface CacheEntry {
  timestamp: number;
  payloadHash: string;
}

class SlidingWindowDeduplicator {
  private cache = new Map<string, CacheEntry>();
  private readonly windowMs: number;

  constructor(windowSeconds: number) {
    this.windowMs = windowSeconds * 1000;

    // Prune stale cache entries every 30s
    setInterval(() => this.prune(), 30000).unref();
  }

  /**
   * Checks whether the signal is a duplicate.
   * If not duplicate, records it and returns false.
   * If duplicate, returns true.
   */
  public isDuplicate(signalId: string, payloadHash: string): boolean {
    const now = Date.now();
    const existing = this.cache.get(signalId);

    if (existing) {
      if (now - existing.timestamp < this.windowMs) {
        logger.warn({ signalId, ageMs: now - existing.timestamp }, 'Dropped duplicate signal inside deduplication window');
        return true;
      }
    }

    this.cache.set(signalId, { timestamp: now, payloadHash });
    return false;
  }

  private prune() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.windowMs) {
        this.cache.delete(key);
      }
    }
  }
}

export const deduplicator = new SlidingWindowDeduplicator(env.DEDUP_WINDOW_SECONDS);

