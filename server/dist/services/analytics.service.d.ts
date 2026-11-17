export interface TradeAnalytics {
    most_profitable_day_of_month: {
        day: number;
        label: string;
        avg_profit: number;
        total_profit: number;
        trade_count: number;
    };
    highest_profit_trade: {
        ticket: number;
        symbol: string;
        strategy: string;
        profit: number;
        profit_pct: number;
        pips: number;
        date: string;
        action: string;
    };
    highest_loss_trade: {
        ticket: number;
        symbol: string;
        strategy: string;
        loss: number;
        loss_pct: number;
        pips: number;
        date: string;
        action: string;
    };
    average_profit_per_win: number;
    average_loss_per_loss: number;
    maximum_pips_win: {
        pips: number;
        ticket: number;
        symbol: string;
        date: string;
    };
    maximum_pips_loss: {
        pips: number;
        ticket: number;
        symbol: string;
        date: string;
    };
    total_trades: number;
    win_trades: number;
    loss_trades: number;
    win_rate_pct: number;
    profit_factor: number;
    expectancy: number;
    risk_reward_ratio: number;
    net_profit: number;
    gross_profit: number;
    gross_loss: number;
    current_equity: number;
    current_balance: number;
    day_of_month_stats: Array<{
        day: number;
        avg_pnl: number;
        total_pnl: number;
        trades_count: number;
    }>;
    weekday_stats: Array<{
        weekday: string;
        avg_pnl: number;
        total_pnl: number;
        win_rate: number;
        trades_count: number;
    }>;
    recent_trades_performance: Array<{
        ticket: number;
        date: string;
        symbol: string;
        action: string;
        pips: number;
        pnl: number;
        equity: number;
    }>;
}
export declare function calculateTradePips(symbol: string, openPrice: number, closePrice: number | null, action: 'BUY' | 'SELL'): number;
declare class AnalyticsService {
    getAnalytics(): TradeAnalytics;
    private getOrdinalSuffix;
    private getEnrichedHistoricalDataset;
}
export declare const analyticsService: AnalyticsService;
export {};
