export interface BridgeStatus {
  status: string;
  uptime_seconds: number;
  ea_ingestion_paused: boolean;
  mt5_connected: boolean;
  mt5_account?: number | null;
  balance: number;
  equity: number;
  queue_pending_count: number;
  ws_clients_count: number;
  max_spread_pips: number;
  max_slippage_points: number;
}

export interface ExecutionAlert {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO';
  title: string;
  description: string;
  created_at: string;
}

export interface EquityPoint {
  timestamp: number;
  time_str: string;
  date_str: string;
  balance: number;
  equity: number;
  floating_pnl: number;
  drawdown_pct: number;
}

export interface EquityCurveData {
  status: 'SUCCESS';
  account_number: number | null;
  current_balance: number;
  current_equity: number;
  starting_balance: number;
  peak_equity: number;
  max_drawdown_pct: number;
  floating_pnl: number;
  total_profit: number;
  total_profit_pct: number;
  points: EquityPoint[];
}

