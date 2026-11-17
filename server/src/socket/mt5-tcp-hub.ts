import net from 'node:net';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { brokerNormalizer } from '../core/broker-normalizer.js';
import { positionTracker } from '../core/position-tracker.js';
import { equityHistoryService } from '../services/equity-history.service.js';
import { tradeLedgerService } from '../services/trade-ledger.service.js';
import { signalLedger } from '../services/signal-ledger.service.js';
import { wsTelemetry } from '../services/ws-telemetry.service.js';
import { db } from '../config/database.js';

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

type ResponseResolver = (data: any) => void;

class Mt5TcpHub {
  private server: net.Server | null = null;
  private activeSocket: net.Socket | null = null;
  private buffer = '';
  private pendingRequests = new Map<string, { resolve: ResponseResolver; reject: (err: any) => void; timer: NodeJS.Timeout }>();
  private lastHeartbeat = Date.now();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private latestAccountData: AccountSyncData | null = null;
  private onAccountSyncCallback: ((data: AccountSyncData) => void) | null = null;
  private previousPositions = new Map<number, any>();

  public start() {
    this.server = net.createServer((socket) => {
      logger.info({ remote: socket.remoteAddress }, 'MT5 Bridge EA connected via local TCP socket');

      if (this.activeSocket) {
        logger.warn('Replacing previous active MT5 socket connection');
        this.activeSocket.destroy();
      }

      this.activeSocket = socket;
      this.lastHeartbeat = Date.now();
      socket.setNoDelay(true); // Disable Nagle's algorithm for sub-ms packet transmission
      socket.setKeepAlive(true, 1000);

      socket.on('data', (data) => this.handleData(data));
      socket.on('close', () => {
        logger.warn('MT5 Bridge EA disconnected from local TCP socket');
        if (this.activeSocket === socket) {
          this.activeSocket = null;
        }
      });
      socket.on('error', (err) => {
        logger.error({ err: err.message }, 'MT5 Socket error');
      });
    });

    this.server.listen(env.MT5_TCP_PORT, '127.0.0.1', () => {
      logger.info({ port: env.MT5_TCP_PORT }, 'MT5 Local TCP Socket Server listening on 127.0.0.1');
    });

    // Start 1,000ms Heartbeat Ping
    this.heartbeatInterval = setInterval(() => this.checkHeartbeat(), 1000);
  }

  private handleData(data: Buffer) {
    this.lastHeartbeat = Date.now();
    this.buffer += data.toString('utf-8');

    // Messages are newline-delimited JSON (ndjson)
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (line.length > 0) {
        try {
          const msg = JSON.parse(line);
          this.processMessage(msg);
        } catch (err) {
          logger.error({ err, raw: line }, 'Failed to parse MT5 socket message');
        }
      }
      newlineIndex = this.buffer.indexOf('\n');
    }
  }

  private processMessage(msg: any) {
    // 1. Heartbeat Pong
    if (msg.event === 'PONG') {
      this.lastHeartbeat = Date.now();
      return;
    }

    // 2. Command Response (ORDER_RESULT / CLOSE_RESULT)
    if (msg.request_id && this.pendingRequests.has(msg.request_id)) {
      const pending = this.pendingRequests.get(msg.request_id)!;
      clearTimeout(pending.timer);
      this.pendingRequests.delete(msg.request_id);
      pending.resolve(msg);
      return;
    }

    // 3. Broker Specifications Handshake Sync
    if (msg.event === 'SPECS_SYNC' && Array.isArray(msg.specs)) {
      brokerNormalizer.updateSpecs(msg.specs);
      logger.info({ count: msg.specs.length }, 'Synchronized broker symbol specifications from MT5');
      return;
    }

    // 4. Deal Update Hook (from OnTradeTransaction)
    if (msg.event === 'DEAL_UPDATE') {
      if (msg.position_ticket && msg.action) {
        logger.info({ msg }, 'Received live deal transaction update from MT5');
        if (msg.is_closed) {
          positionTracker.recordClosePosition(msg.strategy, msg.symbol, msg.position_ticket);
        }
      }
      return;
    }

    // 5. Account Heartbeat Sync (every 1s)
    if (msg.event === 'ACCOUNT_SYNC') {
      this.latestAccountData = msg as AccountSyncData;
      equityHistoryService.recordSnapshot(this.latestAccountData);

      // Always broadcast live account & equity sync to all connected WebSocket clients
      try {
        wsTelemetry.broadcast({
          type: 'ACCOUNT_SYNC',
          payload: this.latestAccountData
        });
      } catch {}

      // Ingest & track positions
      if (Array.isArray(this.latestAccountData.open_positions)) {
        const currentTickets = new Set(this.latestAccountData.open_positions.map(p => p.ticket));

        // A. Auto-detect any NEW open positions in MT5 (manual trades or external orders)
        for (const p of this.latestAccountData.open_positions) {
          if (!this.previousPositions.has(p.ticket)) {
            try {
              const existing = db.prepare('SELECT ticket FROM trade_ledger WHERE ticket = ?').get(p.ticket);
              if (!existing) {
                const strategyName = p.magic === 0 ? 'MANUAL' : (p.comment || 'MANUAL_MT5');
                logger.info({ ticket: p.ticket, symbol: p.symbol, type: p.type }, 'Auto-detected manual MT5 trade; registering in ledger & logs');

                tradeLedgerService.recordOpenTrade({
                  ticket: p.ticket,
                  strategy: strategyName,
                  symbol: p.symbol,
                  action: p.type,
                  lot: p.lot,
                  open_price: p.open_price,
                  sl: (p as any).sl || 0,
                  tp: (p as any).tp || 0,
                  equity: this.latestAccountData.equity,
                  balance: this.latestAccountData.balance,
                  comment: p.comment || 'Manual MT5 Terminal Order'
                });

                // Record in signals ledger & execution logs
                const manualSigId = `MANUAL-${p.ticket}`;
                signalLedger.recordManualExecution({
                  signal_id: manualSigId,
                  strategy: strategyName,
                  action: p.type,
                  symbol: p.symbol,
                  lot: p.lot,
                  open_price: p.open_price,
                  sl: (p as any).sl || 0,
                  tp: (p as any).tp || 0,
                  order_ticket: p.ticket,
                  status: 'EXECUTED',
                  execution_message: `Manual MT5 Order #${p.ticket} (${p.type} ${p.lot} ${p.symbol}) detected & executed`
                });

                // Broadcast live signal event to console
                wsTelemetry.broadcast({
                  type: 'SIGNAL_RECEIVED',
                  payload: {
                    signal_id: manualSigId,
                    strategy: strategyName,
                    action: p.type,
                    symbol: p.symbol,
                    lot: p.lot,
                    status: 'EXECUTED'
                  }
                });
              }
            } catch (err: any) {
              logger.error({ err: err.message, ticket: p.ticket }, 'Failed to ingest newly detected manual trade');
            }
          }
        }

        // B. Detect positions that just closed in MT5 (e.g. TP/SL/Manual Close)
        for (const [ticket, prev] of this.previousPositions.entries()) {
          if (!currentTickets.has(ticket)) {
            const strategyName = prev.magic === 0 ? 'MANUAL' : (prev.comment || 'MANUAL_MT5');
            logger.info({ ticket, symbol: prev.symbol, pnl: prev.pnl }, 'Position closed in MT5; recording exit in ledger & logs');

            tradeLedgerService.recordCloseTrade({
              ticket,
              strategy: strategyName,
              symbol: prev.symbol,
              action: prev.type,
              lot: prev.lot,
              open_price: prev.open_price,
              close_price: prev.current_price || prev.open_price,
              profit_loss: prev.pnl,
              equity: this.latestAccountData.equity,
              balance: this.latestAccountData.balance,
              comment: 'MT5 Terminal Execution (Closed / TP / SL / Manual Exit)'
            });

            // Log closure in execution logs
            const closeSigId = `CLOSE-${ticket}-${Date.now().toString().slice(-4)}`;
            signalLedger.recordManualExecution({
              signal_id: closeSigId,
              strategy: strategyName,
              action: 'CLOSE',
              symbol: prev.symbol,
              lot: prev.lot,
              open_price: prev.current_price || prev.open_price,
              order_ticket: ticket,
              status: 'EXECUTED',
              execution_message: `Position #${ticket} closed | PnL: ${prev.pnl >= 0 ? '+' : ''}$${prev.pnl.toFixed(2)} | Equity: $${this.latestAccountData.equity.toFixed(2)}`
            });

            wsTelemetry.broadcast({
              type: 'SIGNAL_EXECUTED',
              payload: { signal_id: closeSigId, status: 'EXECUTED', ticket }
            });
          }
        }

        this.previousPositions.clear();
        for (const p of this.latestAccountData.open_positions) {
          this.previousPositions.set(p.ticket, p);
        }
      }

      if (this.onAccountSyncCallback) {
        this.onAccountSyncCallback(this.latestAccountData);
      }
      return;
    }
  }

  private checkHeartbeat() {
    if (!this.activeSocket) return;

    // Send PING
    try {
      this.activeSocket.write(JSON.stringify({ action: 'PING', timestamp: Date.now() }) + '\n');
    } catch {
      this.activeSocket.destroy();
      this.activeSocket = null;
      return;
    }

    // Check if pong missed for > 3,000ms
    if (Date.now() - this.lastHeartbeat > 3000) {
      logger.warn('MT5 TCP socket missed heartbeat (>3000ms). Forcing socket reconnection.');
      this.activeSocket.destroy();
      this.activeSocket = null;
    }
  }

  public async sendCommand<T = any>(command: any, timeoutMs = 4000): Promise<T> {
    if (!this.activeSocket || this.activeSocket.destroyed) {
      throw new Error('MT5 Bridge EA is not connected via local TCP socket (127.0.0.1:8282)');
    }

    const requestId = command.request_id || `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    command.request_id = requestId;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`MT5 execution timed out after ${timeoutMs}ms for request ${requestId}`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timer });

      try {
        const payload = JSON.stringify(command) + '\n';
        this.activeSocket!.write(payload);
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(requestId);
        reject(err);
      }
    });
  }

  public isConnected(): boolean {
    return this.activeSocket !== null && !this.activeSocket.destroyed;
  }

  public getAccountData(): AccountSyncData | null {
    return this.latestAccountData;
  }

  public setAccountSyncCallback(cb: (data: AccountSyncData) => void) {
    this.onAccountSyncCallback = cb;
  }

  public onAccountSync(cb: (data: AccountSyncData) => void) {
    this.onAccountSyncCallback = cb;
  }
}

export const mt5TcpHub = new Mt5TcpHub();

