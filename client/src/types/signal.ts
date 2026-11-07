export interface Signal {
  id: number;
  signal_id: string;
  strategy: string;
  action: 'BUY' | 'SELL' | 'CLOSE' | 'EXIT' | 'FLATTEN';
  symbol: string;
  lot: number;
  sl: number;
  tp: number;
  status: 'PENDING' | 'PROCESSING' | 'EXECUTED' | 'FAILED' | 'DROPPED';
  order_ticket?: string | null;
  deal_ticket?: string | null;
  position_ticket?: string | null;
  execution_message?: string | null;
  latency_ms?: number | null;
  executed_price?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export type LedgerFilter = 'ALL' | 'PENDING' | 'EXECUTED' | 'FAILED';

