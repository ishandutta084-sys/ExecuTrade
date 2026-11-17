export interface OrderSendRequest {
    request_id: string;
    action: 'ORDER_SEND';
    strategy: string;
    magic: number;
    symbol: string;
    trade_type: 'BUY' | 'SELL';
    lot: number;
    sl: number;
    tp: number;
    max_deviation?: number;
}
export interface PositionCloseRequest {
    request_id: string;
    action: 'POSITION_CLOSE';
    strategy: string;
    magic: number;
    position_ticket: number;
    symbol: string;
    lot?: number;
}
export interface FlattenAllRequest {
    request_id: string;
    action: 'FLATTEN_ALL';
    magic?: number;
}
export interface AccountSyncData {
    account_number: number;
    balance: number;
    equity: number;
    free_margin: number;
    open_positions: Array<{
        ticket: number;
        symbol: string;
        type: 'BUY' | 'SELL';
        lot: number;
        open_price: number;
        current_price: number;
        pnl: number;
        magic: number;
        comment: string;
    }>;
}
declare class Mt5TcpHub {
    private server;
    private activeSocket;
    private buffer;
    private pendingRequests;
    private lastHeartbeat;
    private heartbeatInterval;
    private latestAccountData;
    private onAccountSyncCallback;
    private previousPositions;
    start(): void;
    private handleData;
    private processMessage;
    private checkHeartbeat;
    sendCommand<T = any>(command: any, timeoutMs?: number): Promise<T>;
    isConnected(): boolean;
    getAccountData(): AccountSyncData | null;
    setAccountSyncCallback(cb: (data: AccountSyncData) => void): void;
}
export declare const mt5TcpHub: Mt5TcpHub;
export {};
