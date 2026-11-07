import { DatabaseSync } from 'node:sqlite';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const db = new DatabaseSync(env.DB_PATH);

// Configure WAL mode for concurrency and performance
try {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA busy_timeout = 5000');
} catch (err: any) {
  logger.warn({ err: err.message }, 'Failed to set some SQLite pragmas');
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signal_id TEXT UNIQUE NOT NULL,
      strategy TEXT NOT NULL,
      action TEXT NOT NULL,
      symbol TEXT NOT NULL,
      lot REAL NOT NULL,
      sl REAL NOT NULL,
      tp REAL NOT NULL,
      status TEXT DEFAULT 'PENDING',
      order_ticket TEXT,
      deal_ticket TEXT,
      position_ticket TEXT,
      execution_message TEXT,
      latency_ms INTEGER,
      executed_price REAL,
      attempts INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_signals_status ON webhook_signals(status);
    CREATE INDEX IF NOT EXISTS idx_signals_symbol ON webhook_signals(symbol);
    CREATE INDEX IF NOT EXISTS idx_signals_created ON webhook_signals(created_at DESC);
  `);

  // Migrate any missing columns in webhook_signals
  try {
    const cols = (db.prepare('PRAGMA table_info(webhook_signals)').all() as any[]).map(c => c.name);
    const needed: Record<string, string> = {
      deal_ticket: 'TEXT',
      position_ticket: 'TEXT',
      latency_ms: 'INTEGER',
      executed_price: 'REAL'
    };
    for (const [col, type] of Object.entries(needed)) {
      if (!cols.includes(col)) {
        db.exec(`ALTER TABLE webhook_signals ADD COLUMN ${col} ${type}`);
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Column migration warning');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS execution_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signal_id TEXT NOT NULL,
      attempt_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      order_ticket TEXT,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_logs_signal_id ON execution_logs(signal_id);

    CREATE TABLE IF NOT EXISTS strategy_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strategy TEXT NOT NULL,
      symbol TEXT NOT NULL,
      position_ticket INTEGER NOT NULL,
      order_ticket INTEGER,
      deal_ticket INTEGER,
      magic INTEGER NOT NULL,
      action TEXT NOT NULL,
      lot REAL NOT NULL,
      open_price REAL,
      sl REAL,
      tp REAL,
      is_active INTEGER DEFAULT 1,
      opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_positions_active ON strategy_positions(strategy, symbol, is_active);
    CREATE INDEX IF NOT EXISTS idx_positions_ticket ON strategy_positions(position_ticket);
  `);

  logger.info({ path: env.DB_PATH }, 'SQLite database initialized with built-in node:sqlite WAL mode');
}

// Auto-initialize tables immediately upon module load
initDatabase();
