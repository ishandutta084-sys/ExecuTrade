declare class SlidingWindowDeduplicator {
    private cache;
    private readonly windowMs;
    constructor(windowSeconds: number);
    /**
     * Checks whether the signal is a duplicate.
     * If not duplicate, records it and returns false.
     * If duplicate, returns true.
     */
    isDuplicate(signalId: string, payloadHash: string): boolean;
    private prune;
}
export declare const deduplicator: SlidingWindowDeduplicator;
export {};
