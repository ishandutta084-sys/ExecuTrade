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
declare class TradeLedgerService {
    private supabaseUrl;
    private supabaseKey;
    private syncTimer;
    constructor();
    setSupabaseConfig(url: string, key: string): void;
    getSupabaseConfig(): {
        supabase_url: string;
        is_configured: boolean;
        has_key: boolean;
    };
    recordOpenTrade(data: {
        ticket: number;
        strategy: string;
        symbol: string;
        action: 'BUY' | 'SELL';
        lot: number;
        open_price: number;
        sl: number;
        tp: number;
        equity: number;
        balance: number;
        comment?: string;
    }): void;
    recordCloseTrade(data: {
        ticket: number;
        close_price: number;
        profit_loss?: number;
        equity: number;
        balance: number;
        close_time?: string;
        comment?: string;
    }): void;
    getLedger(options: {
        status?: string;
        symbol?: string;
        limit?: number;
        offset?: number;
    }): {
        records: TradeLedgerRecord[];
        total: number;
        summary: LedgerSummary;
    };
    getSummaryStats(): LedgerSummary;
    syncPendingToSupabase(): Promise<{
        success: boolean;
        synced: number;
        error?: string;
    }>;
    private seedInitialTradesIfEmpty;
}
export declare const tradeLedgerService: TradeLedgerService;
export {};
