import type { AccountSyncData } from '../socket/mt5-tcp-hub.js';
export interface EquityPoint {
    timestamp: number;
    time_str: string;
    date_str: string;
    balance: number;
    equity: number;
    floating_pnl: number;
    drawdown_pct: number;
}
export interface EquityCurveResponse {
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
declare class EquityHistoryService {
    private lastSnapshotTime;
    private lastRecordedEquity;
    private lastRecordedBalance;
    recordSnapshot(data: AccountSyncData): void;
    getEquityCurve(timeframe?: string, currentAccount?: AccountSyncData | null): EquityCurveResponse;
    private generateInitialSeedPoints;
    private downsamplePoints;
}
export declare const equityHistoryService: EquityHistoryService;
export {};
