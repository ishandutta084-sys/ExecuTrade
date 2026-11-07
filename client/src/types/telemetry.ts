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

