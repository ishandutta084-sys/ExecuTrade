export interface ActivePosition {
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
declare class PositionTracker {
    private positions;
    private inFlightEntries;
    constructor();
    private hydrateFromDb;
    getKey(strategy: string, symbol: string): string;
    getActivePosition(strategy: string, symbol: string): ActivePosition | undefined;
    registerInFlight(strategy: string, symbol: string, promise: Promise<number | null>): void;
    awaitInFlight(strategy: string, symbol: string): Promise<number | null>;
    recordOpenPosition(pos: ActivePosition): void;
    recordClosePosition(strategy: string, symbol: string, positionTicket: number): void;
    updateMutatedTicket(oldTicket: number, newTicket: number, remainingLot: number): void;
    getAllActive(): ActivePosition[];
}
export declare const positionTracker: PositionTracker;
export {};
