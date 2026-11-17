import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
class SlidingWindowDeduplicator {
    cache = new Map();
    windowMs;
    constructor(windowSeconds) {
        this.windowMs = windowSeconds * 1000;
        // Prune stale cache entries every 30s
        setInterval(() => this.prune(), 30000).unref();
    }
    /**
     * Checks whether the signal is a duplicate.
     * If not duplicate, records it and returns false.
     * If duplicate, returns true.
     */
    isDuplicate(signalId, payloadHash) {
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
    prune() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.windowMs) {
                this.cache.delete(key);
            }
        }
    }
}
export const deduplicator = new SlidingWindowDeduplicator(env.DEDUP_WINDOW_SECONDS);
//# sourceMappingURL=deduplicator.js.map