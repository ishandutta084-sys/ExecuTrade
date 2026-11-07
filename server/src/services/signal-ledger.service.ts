import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { TradingSignal } from '../schemas/signal.schema.js';

export interface SignalRecord {
  id: number;
  signal_id: string;
  strategy: string;
  action: string;
  symbol: string;
  lot: number;
  sl: number;
  tp: number;
  status: string;
  order_ticket?: string | null;
  deal_ticket?: string | null;
  position_ticket?: string | null;
  execution_message?: string | null;
  latency_ms?: number | null;
  executed_price?: number | null;
  attempts: number;
  created_at: string;
  updated_at?: string | null;
}

class SignalLedgerService {
  public createSignal(signal: TradingSignal): number {
    const stmt = db.prepare(`
      INSERT INTO webhook_signals
      (signal_id, strategy, action, symbol, lot, sl, tp, status, attempts)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0)
    `);

    const info = stmt.run(
      signal.signal_id,
      signal.strategy,
      signal.action,
      signal.symbol,
      signal.lot || 0.01,
      signal.sl || 0,
      signal.tp || 0
    );

    return Number(info.lastInsertRowid);
  }

  public updateExecutionResult(
    signalId: string,
    status: 'EXECUTED' | 'FAILED' | 'DROPPED',
    data: {
      order_ticket?: string | number | null;
      deal_ticket?: string | number | null;
      position_ticket?: string | number | null;
      execution_message?: string | null;
      latency_ms?: number | null;
      executed_price?: number | null;
    }
  ) {
    db.prepare(`
      UPDATE webhook_signals
      SET status = ?,
          order_ticket = ?,
          deal_ticket = ?,
          position_ticket = ?,
          execution_message = ?,
          latency_ms = ?,
          executed_price = ?,
          updated_at = CURRENT_TIMESTAMP,
          attempts = attempts + 1
      WHERE signal_id = ?
    `).run(
      status,
      data.order_ticket ? String(data.order_ticket) : null,
      data.deal_ticket ? String(data.deal_ticket) : null,
      data.position_ticket ? String(data.position_ticket) : null,
      data.execution_message || null,
      data.latency_ms || null,
      data.executed_price || null,
      signalId
    );

    // Record to execution logs
    db.prepare(`
      INSERT INTO execution_logs
      (signal_id, attempt_number, status, order_ticket, message)
      VALUES (?, 1, ?, ?, ?)
    `).run(
      signalId,
      status,
      data.order_ticket ? String(data.order_ticket) : null,
      data.execution_message || (status === 'EXECUTED' ? 'Filled' : 'Rejected')
    );
  }

  public getAllSignals(limit = 100): SignalRecord[] {
    return db.prepare(`
      SELECT *
      FROM webhook_signals
      ORDER BY id DESC
      LIMIT ?
    `).all(limit) as unknown as SignalRecord[];
  }

  public searchSignals(query: string, limit = 100): SignalRecord[] {
    const q = `%${query.trim()}%`;
    return db.prepare(`
      SELECT *
      FROM webhook_signals
      WHERE signal_id LIKE ?
         OR symbol LIKE ?
         OR strategy LIKE ?
         OR order_ticket LIKE ?
         OR status LIKE ?
         OR action LIKE ?
      ORDER BY id DESC
      LIMIT ?
    `).all(q, q, q, q, q, q, limit) as unknown as SignalRecord[];
  }

  public getAlerts(limit = 15) {
    const logs = db.prepare(`
      SELECT *
      FROM execution_logs
      ORDER BY id DESC
      LIMIT ?
    `).all(limit) as any[];

    return logs.map(l => ({
      id: `log-${l.id}`,
      type: l.status === 'FAILED' ? 'ERROR' : 'SUCCESS',
      title: l.status === 'FAILED' ? `Failed: ${l.signal_id}` : `Order #${l.order_ticket || 'Filled'}`,
      description: l.message || l.status,
      created_at: l.created_at
    }));
  }
}

export const signalLedger = new SignalLedgerService();

