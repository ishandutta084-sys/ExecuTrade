import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger.js';
import { mt5TcpHub } from '../socket/mt5-tcp-hub.js';
class WsTelemetryService {
    wss = null;
    clients = new Set();
    initialize(server) {
        this.wss = new WebSocketServer({ server, path: '/ws' });
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            logger.info({ totalClients: this.clients.size }, 'React UI client connected to WebSocket telemetry');
            // Send initial state immediately
            const accountData = mt5TcpHub.getAccountData();
            if (accountData) {
                this.sendToClient(ws, {
                    type: 'ACCOUNT_SYNC',
                    payload: accountData
                });
            }
            ws.on('close', () => {
                this.clients.delete(ws);
            });
            ws.on('error', (err) => {
                logger.error({ err: err.message }, 'WebSocket client error');
                this.clients.delete(ws);
            });
        });
        // Wire MT5 TCP account sync directly to React UI broadcast
        mt5TcpHub.setAccountSyncCallback((data) => {
            this.broadcast({
                type: 'ACCOUNT_SYNC',
                payload: data
            });
        });
    }
    broadcast(message) {
        if (this.clients.size === 0)
            return;
        const json = JSON.stringify(message);
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(json);
            }
        }
    }
    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    get clientCount() {
        return this.clients.size;
    }
}
export const wsTelemetry = new WsTelemetryService();
//# sourceMappingURL=ws-telemetry.service.js.map