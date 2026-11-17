import { TradingSignal } from '../schemas/signal.schema.js';
export interface SignalRecord {
    id: number;
    signal_id: string;
    strategy: string;
    action: string;
    symbol: string;
    lot: number;
    sl: number;
    tp: number;
    status: string;
    order_ticket?: string | null;
    deal_ticket?: string | null;
    position_ticket?: string | null;
    execution_message?: string | null;
    latency_ms?: number | null;
    executed_price?: number | null;
    attempts: number;
    created_at: string;
    updated_at?: string | null;
}
declare class SignalLedgerService {
    createSignal(signal: TradingSignal): number;
    updateExecutionResult(signalId: string, status: 'EXECUTED' | 'FAILED' | 'DROPPED', data: {
        order_ticket?: string | number | null;
        deal_ticket?: string | number | null;
        position_ticket?: string | number | null;
        execution_message?: string | null;
        latency_ms?: number | null;
        executed_price?: number | null;
    }): void;
    recordManualExecution(data: {
        signal_id: string;
        strategy: string;
        action: string;
        symbol: string;
        lot: number;
        open_price: number;
        sl?: number;
        tp?: number;
        order_ticket: string | number;
        status: 'EXECUTED';
        execution_message: string;
    }): void;
    getAllSignals(limit?: number): SignalRecord[];
    searchSignals(query: string, limit?: number): SignalRecord[];
    getAlerts(limit?: number): {
        id: string;
        type: string;
        title: string;
        description: any;
        created_at: any;
    }[];
}
export declare const signalLedger: SignalLedgerService;
export {};
