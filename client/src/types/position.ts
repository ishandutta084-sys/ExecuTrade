export interface BrokerPosition {
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  lot: number;
  open_price: number;
  current_price: number;
  pnl: number;
  magic: number;
  comment?: string;
}

export interface TrackedPosition {
  strategy: string;
  symbol: string;
  position_ticket: number;
  order_ticket?: number;
  deal_ticket?: number;
  magic: number;
  action: 'BUY' | 'SELL';
  lot: number;
  open_price: number;
  sl: number;
  tp: number;
}

