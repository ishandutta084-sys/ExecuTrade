import { db } from '../config/database.js';
class SignalLedgerService {
    createSignal(signal) {
        const stmt = db.prepare(`
      INSERT INTO webhook_signals
      (signal_id, strategy, action, symbol, lot, sl, tp, status, attempts)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0)
    `);
        const info = stmt.run(signal.signal_id, signal.strategy, signal.action, signal.symbol, signal.lot || 0.01, signal.sl || 0, signal.tp || 0);
        return Number(info.lastInsertRowid);
    }
    updateExecutionResult(signalId, status, data) {
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
    `).run(status, data.order_ticket ? String(data.order_ticket) : null, data.deal_ticket ? String(data.deal_ticket) : null, data.position_ticket ? String(data.position_ticket) : null, data.execution_message || null, data.latency_ms || null, data.executed_price || null, signalId);
        // Record to execution logs
        db.prepare(`
      INSERT INTO execution_logs
      (signal_id, attempt_number, status, order_ticket, message)
      VALUES (?, 1, ?, ?, ?)
    `).run(signalId, status, data.order_ticket ? String(data.order_ticket) : null, data.execution_message || (status === 'EXECUTED' ? 'Filled' : 'Rejected'));
    }
    recordManualExecution(data) {
        const existing = db.prepare('SELECT id FROM webhook_signals WHERE signal_id = ?').get(data.signal_id);
        if (!existing) {
            db.prepare(`
        INSERT INTO webhook_signals
        (signal_id, strategy, action, symbol, lot, sl, tp, status, order_ticket, position_ticket, executed_price, execution_message, latency_ms, attempts)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'EXECUTED', ?, ?, ?, ?, 0, 1)
      `).run(data.signal_id, data.strategy, data.action, data.symbol, data.lot, data.sl || 0, data.tp || 0, String(data.order_ticket), String(data.order_ticket), data.open_price, data.execution_message);
            db.prepare(`
        INSERT INTO execution_logs
        (signal_id, attempt_number, status, order_ticket, message)
        VALUES (?, 1, 'EXECUTED', ?, ?)
      `).run(data.signal_id, String(data.order_ticket), data.execution_message);
        }
    }
    getAllSignals(limit = 100) {
        return db.prepare(`
      SELECT *
      FROM webhook_signals
      ORDER BY id DESC
      LIMIT ?
    `).all(limit);
    }
    searchSignals(query, limit = 100) {
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
    `).all(q, q, q, q, q, q, limit);
    }
    getAlerts(limit = 15) {
        const logs = db.prepare(`
      SELECT *
      FROM execution_logs
      ORDER BY id DESC
      LIMIT ?
    `).all(limit);
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
//# sourceMappingURL=signal-ledger.service.js.map