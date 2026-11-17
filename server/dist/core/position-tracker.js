import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';
class PositionTracker {
    // In-memory active positions map: key is `${strategy}:${symbol}`
    positions = new Map();
    // In-flight barrier map: key is `${strategy}:${symbol}`, promise resolves when entry finishes
    inFlightEntries = new Map();
    constructor() {
        this.hydrateFromDb();
    }
    hydrateFromDb() {
        try {
            const rows = db.prepare(`
        SELECT strategy, symbol, position_ticket, order_ticket, deal_ticket, magic, action, lot, open_price, sl, tp
        FROM strategy_positions
        WHERE is_active = 1
      `).all();
            for (const row of rows) {
                const key = this.getKey(row.strategy, row.symbol);
                this.positions.set(key, {
                    strategy: row.strategy,
                    symbol: row.symbol,
                    position_ticket: row.position_ticket,
                    order_ticket: row.order_ticket,
                    deal_ticket: row.deal_ticket,
                    magic: row.magic,
                    action: row.action,
                    lot: row.lot,
                    open_price: row.open_price,
                    sl: row.sl,
                    tp: row.tp
                });
            }
            logger.info({ count: rows.length }, 'PositionTracker hydrated active positions from database');
        }
        catch (err) {
            logger.error({ err }, 'Failed to hydrate positions from database');
        }
    }
    getKey(strategy, symbol) {
        return `${strategy.toUpperCase().trim()}:${symbol.toUpperCase().trim()}`;
    }
    getActivePosition(strategy, symbol) {
        return this.positions.get(this.getKey(strategy, symbol));
    }
    registerInFlight(strategy, symbol, promise) {
        const key = this.getKey(strategy, symbol);
        this.inFlightEntries.set(key, promise);
        promise.finally(() => {
            this.inFlightEntries.delete(key);
        });
    }
    async awaitInFlight(strategy, symbol) {
        const key = this.getKey(strategy, symbol);
        const existing = this.inFlightEntries.get(key);
        if (existing) {
            logger.info({ strategy, symbol }, 'Holding EXIT signal until in-flight ENTRY completes (Casual Inversion Guard)');
            return await existing;
        }
        return null;
    }
    recordOpenPosition(pos) {
        const key = this.getKey(pos.strategy, pos.symbol);
        this.positions.set(key, pos);
        try {
            db.prepare(`
        INSERT INTO strategy_positions
        (strategy, symbol, position_ticket, order_ticket, deal_ticket, magic, action, lot, open_price, sl, tp, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(pos.strategy, pos.symbol, pos.position_ticket, pos.order_ticket || null, pos.deal_ticket || null, pos.magic, pos.action, pos.lot, pos.open_price, pos.sl, pos.tp);
            logger.info({ strategy: pos.strategy, symbol: pos.symbol, ticket: pos.position_ticket }, 'Recorded active position');
        }
        catch (err) {
            logger.error({ err, pos }, 'Failed to persist position to database');
        }
    }
    recordClosePosition(strategy, symbol, positionTicket) {
        const key = this.getKey(strategy, symbol);
        const active = this.positions.get(key);
        if (active && active.position_ticket === positionTicket) {
            this.positions.delete(key);
        }
        try {
            db.prepare(`
        UPDATE strategy_positions
        SET is_active = 0, closed_at = CURRENT_TIMESTAMP
        WHERE position_ticket = ?
      `).run(positionTicket);
            logger.info({ strategy, symbol, ticket: positionTicket }, 'Marked position as CLOSED in database');
        }
        catch (err) {
            logger.error({ err, positionTicket }, 'Failed to mark position as closed in database');
        }
    }
    updateMutatedTicket(oldTicket, newTicket, remainingLot) {
        for (const [key, pos] of this.positions.entries()) {
            if (pos.position_ticket === oldTicket) {
                pos.position_ticket = newTicket;
                pos.lot = remainingLot;
                this.positions.set(key, pos);
                try {
                    db.prepare(`
            UPDATE strategy_positions
            SET position_ticket = ?, lot = ?
            WHERE position_ticket = ?
          `).run(newTicket, remainingLot, oldTicket);
                    logger.info({ oldTicket, newTicket, remainingLot }, 'Updated mutated position ticket from partial close');
                }
                catch (err) {
                    logger.error({ err, oldTicket, newTicket }, 'Failed to update mutated ticket in database');
                }
                break;
            }
        }
    }
    getAllActive() {
        return Array.from(this.positions.values());
    }
}
export const positionTracker = new PositionTracker();
//# sourceMappingURL=position-tracker.js.map