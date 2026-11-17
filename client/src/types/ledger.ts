export interface TradeLedgerRecord {
  id?: number;
  ticket: number;
  strategy: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  lot: number;
  open_price: number;
  close_price: number | null;
  sl: number;
  tp: number;
  profit_loss: number;
  profit_loss_pct: number;
  equity_after_trade: number;
  balance_after_trade: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  open_time: string;
  close_time: string | null;
  comment: string | null;
  sync_status: 'SYNCED' | 'PENDING' | 'ERROR';
  created_at?: string;
  updated_at?: string;
}

export interface LedgerSummary {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  total_net_pnl: number;
  profit_factor: number;
  current_equity: number;
  current_balance: number;
  supabase_connected: boolean;
  synced_count: number;
  pending_sync_count: number;
}
