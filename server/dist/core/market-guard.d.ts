export interface MarketGuardResult {
    allowed: boolean;
    reason?: string;
}
declare class MarketGuard {
    /**
     * Checks whether the signal is within allowed market sessions and not stale.
     */
    validateSignal(createdTimestamp?: number | string, isTest?: boolean): MarketGuardResult;
    /**
     * Validates live broker spread before sending market order.
     */
    validateSpread(spreadPips: number): MarketGuardResult;
}
export declare const marketGuard: MarketGuard;
export {};
