import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { logger } from '../utils/logger.js';
import { mt5TcpHub, AccountSyncData } from '../socket/mt5-tcp-hub.js';

class WsTelemetryService {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  public initialize(server: Server) {
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
    mt5TcpHub.setAccountSyncCallback((data: AccountSyncData) => {
      this.broadcast({
        type: 'ACCOUNT_SYNC',
        payload: data
      });
    });
  }

  public broadcast(message: { type: string; payload: any }) {
    if (this.clients.size === 0) return;
    const json = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    }
  }

  private sendToClient(ws: WebSocket, message: { type: string; payload: any }) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public get clientCount(): number {
    return this.clients.size;
  }
}

export const wsTelemetry = new WsTelemetryService();

