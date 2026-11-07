import type { FastifyRequest, FastifyReply } from 'fastify';
import { mt5TcpHub } from '../socket/mt5-tcp-hub.js';
import { executionMutex } from '../core/execution-mutex.js';
import { signalLedger } from '../services/signal-ledger.service.js';
import { wsTelemetry } from '../services/ws-telemetry.service.js';
import { env } from '../config/env.js';

let isIngestionPaused = false;
const startTime = Date.now();

export function getIngestionPaused(): boolean {
  return isIngestionPaused;
}

export async function getBridgeStatus(req: FastifyRequest, reply: FastifyReply) {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const isMt5Connected = mt5TcpHub.isConnected();
  const accountData = mt5TcpHub.getAccountData();

  return reply.send({
    status: 'SUCCESS',
    uptime_seconds: uptimeSeconds,
    ea_ingestion_paused: isIngestionPaused,
    mt5_connected: isMt5Connected,
    mt5_account: accountData?.account_number || null,
    balance: accountData?.balance || 0,
    equity: accountData?.equity || 0,
    queue_pending_count: executionMutex.pendingCount,
    ws_clients_count: wsTelemetry.clientCount,
    max_spread_pips: env.MAX_SPREAD_PIPS,
    max_slippage_points: env.MAX_SLIPPAGE_POINTS
  });
}

export async function togglePause(req: FastifyRequest, reply: FastifyReply) {
  isIngestionPaused = !isIngestionPaused;
  return reply.send({
    status: 'SUCCESS',
    ea_ingestion_paused: isIngestionPaused,
    message: isIngestionPaused ? 'EA ingestion PAUSED' : 'EA ingestion RESUMED'
  });
}

export async function getAlerts(req: FastifyRequest, reply: FastifyReply) {
  const alerts = signalLedger.getAlerts(15);
  return reply.send({
    status: 'SUCCESS',
    unread_count: alerts.filter(a => a.type === 'ERROR').length,
    alerts
  });
}

