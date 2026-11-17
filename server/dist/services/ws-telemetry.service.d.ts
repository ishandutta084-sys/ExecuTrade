import type { Server } from 'node:http';
declare class WsTelemetryService {
    private wss;
    private clients;
    initialize(server: Server): void;
    broadcast(message: {
        type: string;
        payload: any;
    }): void;
    private sendToClient;
    get clientCount(): number;
}
export declare const wsTelemetry: WsTelemetryService;
export {};
