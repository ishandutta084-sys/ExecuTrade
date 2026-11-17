/**
 * Async Mutex Queue ensuring that orders are executed sequentially on MT5.
 * Prevents MT5 error 10027: "Trade Context Busy"
 */
declare class ExecutionMutex {
    private queue;
    private isLocked;
    acquire<T>(task: () => Promise<T>): Promise<T>;
    private next;
    get pendingCount(): number;
}
export declare const executionMutex: ExecutionMutex;
export {};
