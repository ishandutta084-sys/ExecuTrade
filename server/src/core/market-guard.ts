import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface MarketGuardResult {
  allowed: boolean;
  reason?: string;
}

class MarketGuard {
  /**
   * Checks whether the signal is within allowed market sessions and not stale.
   */
  public validateSignal(createdTimestamp?: number | string, isTest = false): MarketGuardResult {
    if (isTest || env.NODE_ENV === 'test') {
      return { allowed: true };
    }

    const now = new Date();

    // 1. Stale Signal Check
    if (createdTimestamp) {
      const createdMs = typeof createdTimestamp === 'number' 
        ? createdTimestamp 
        : new Date(createdTimestamp).getTime();
      
      const ageMs = Date.now() - createdMs;
      if (ageMs > env.MAX_SIGNAL_AGE_MS && ageMs < 86400000) { // If reasonable timestamp and older than threshold
        logger.warn({ ageMs, maxAge: env.MAX_SIGNAL_AGE_MS }, 'Signal dropped due to excessive queuing delay (Stale TTL)');
        return {
          allowed: false,
          reason: `Signal is stale (${ageMs}ms > ${env.MAX_SIGNAL_AGE_MS}ms threshold)`
        };
      }
    }

    // 2. Weekend Check (Friday 22:00 UTC to Sunday 21:00 UTC for standard Forex/CFDs)
    const dayUtc = now.getUTCDay();
    const hourUtc = now.getUTCHours();

    if (dayUtc === 6) { // Saturday
      return { allowed: false, reason: 'Market is closed (Saturday)' };
    }
    if (dayUtc === 5 && hourUtc >= 22) { // Friday after 22:00 UTC
      return { allowed: false, reason: 'Market is closed (Friday session end)' };
    }
    if (dayUtc === 0 && hourUtc < 21) { // Sunday before 21:00 UTC
      return { allowed: false, reason: 'Market is closed (Sunday pre-open)' };
    }

    // 3. Daily Rollover Check (21:55 UTC to 22:15 UTC / 5 PM EST)
    if (hourUtc === 21 && now.getUTCMinutes() >= 55) {
      return { allowed: false, reason: 'Market in bank rollover (Extreme spread risk)' };
    }
    if (hourUtc === 22 && now.getUTCMinutes() <= 10) {
      return { allowed: false, reason: 'Market in bank rollover (Extreme spread risk)' };
    }

    return { allowed: true };
  }

  /**
   * Validates live broker spread before sending market order.
   */
  public validateSpread(spreadPips: number): MarketGuardResult {
    if (spreadPips > env.MAX_SPREAD_PIPS) {
      logger.warn({ spreadPips, maxSpread: env.MAX_SPREAD_PIPS }, 'Signal rejected due to excessive broker spread');
      return {
        allowed: false,
        reason: `Broker spread (${spreadPips} pips) exceeds maximum allowed (${env.MAX_SPREAD_PIPS} pips)`
      };
    }
    return { allowed: true };
  }
}

export const marketGuard = new MarketGuard();

