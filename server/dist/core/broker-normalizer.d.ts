export interface BrokerSymbolSpec {
    symbol: string;
    digits: number;
    point: number;
    spread: number;
    stops_level: number;
    lot_min: number;
    lot_max: number;
    lot_step: number;
    contract_size: number;
    execution_mode: number;
    filling_mode: string;
}
declare class BrokerNormalizer {
    private specs;
    /**
     * Updates cached broker specifications reported by MT5 terminal.
     */
    updateSpecs(specsList: BrokerSymbolSpec[]): void;
    /**
     * Resolves incoming TradingView symbol to exact MT5 broker symbol (e.g. XAUUSD -> XAUUSD.m)
     */
    resolveSymbol(tvSymbol: string): string;
    /**
     * Generates a deterministic, unique 32-bit Magic Number for a given Strategy Name.
     */
    getStrategyMagic(strategy: string): number;
    /**
     * Sanitizes and rounds lot size to broker min/max and lot step.
     */
    normalizeLot(symbol: string, requestedLot?: number): number;
    /**
     * Clamps SL and TP distances to ensure they are beyond broker STOPS_LEVEL.
     */
    clampStops(symbol: string, action: 'BUY' | 'SELL', currentPrice: number, sl?: number, tp?: number): {
        sl: number;
        tp: number;
    };
}
export declare const brokerNormalizer: BrokerNormalizer;
export {};
