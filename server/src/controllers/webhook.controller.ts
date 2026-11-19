import type { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sanitizeAndParseJson } from '../core/tolerant-json.js';
import { TradingSignalSchema, TradingSignal } from '../schemas/signal.schema.js';
import { deduplicator } from '../core/deduplicator.js';
import { marketGuard } from '../core/market-guard.js';
import { brokerNormalizer } from '../core/broker-normalizer.js';
import { positionTracker } from '../core/position-tracker.js';
import { executionMutex } from '../core/execution-mutex.js';
import { mt5TcpHub } from '../socket/mt5-tcp-hub.js';
import { signalLedger } from '../services/signal-ledger.service.js';
import { wsTelemetry } from '../services/ws-telemetry.service.js';
import { tradeLedgerService } from '../services/trade-ledger.service.js';

export async function handleTradingViewWebhook(req: FastifyRequest, reply: FastifyReply) {
  const startTime = Date.now();

  // 1. Authenticate Token (URL Param or Payload Secret)
  const params = req.params as { token?: string };
  const query = req.query as { token?: string };
  const requestToken = params.token || query.token;

  let rawBody = req.body;
  let parsedPayload: any;

  try {
    parsedPayload = typeof rawBody === 'string' ? sanitizeAndParseJson(rawBody) : rawBody;
  } catch (err: any) {
    return reply.status(400).send({
      status: 'REJECTED',
      error: 'Malformed JSON payload',
      details: err.message
    });
  }

  // Verify secret token (constant-time comparison)
  const incomingSecret = requestToken || parsedPayload.secret || '';
  const expectedSecret = env.WEBHOOK_SECRET;

  const isAuthed = incomingSecret.length === expectedSecret.length &&
    crypto.timingSafeEqual(Buffer.from(incomingSecret), Buffer.from(expectedSecret));

  if (!isAuthed) {
    logger.warn('Unauthorized webhook rejected (Invalid Secret)');
    return reply.status(401).send({ status: 'UNAUTHORIZED', error: 'Invalid secret token' });
  }

  // 2. Validate Payload Schema
  const parseResult = TradingSignalSchema.safeParse(parsedPayload);
  if (!parseResult.success) {
    return reply.status(422).send({
      status: 'REJECTED',
      error: 'Validation failed',
      issues: parseResult.error.issues
    });
  }

  const signal = parseResult.data;

  // 3. Sliding-Window Deduplication Filter
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify(signal)).digest('hex');
  if (deduplicator.isDuplicate(signal.signal_id, payloadHash)) {
    return reply.status(409).send({
      status: 'DROPPED_DUPLICATE',
      message: 'Signal already processed within deduplication window',
      signal_id: signal.signal_id
    });
  }

  // 4. Market Guard Check (Rollover, Weekend, Stale Signal)
  const sessionCheck = marketGuard.validateSignal(signal.timestamp, signal.is_test);
  if (!sessionCheck.allowed) {
    signalLedger.createSignal(signal);
    signalLedger.updateExecutionResult(signal.signal_id, 'DROPPED', {
      execution_message: sessionCheck.reason
    });
    return reply.status(200).send({
      status: 'DROPPED',
      reason: sessionCheck.reason,
      signal_id: signal.signal_id
    });
  }

  // 5. Persist to Database as PENDING
  signalLedger.createSignal(signal);

  // Broadcast to React UI
  wsTelemetry.broadcast({
    type: 'SIGNAL_RECEIVED',
    payload: signal
  });

  // 6. Fast-ACK: Respond HTTP 200 OK immediately (< 4ms)
  reply.status(200).send({
    status: 'QUEUED',
    message: 'Signal authenticated, validated and queued for execution',
    signal_id: signal.signal_id,
    strategy: signal.strategy,
    symbol: signal.symbol,
    action: signal.action,
    ingest_latency_ms: Date.now() - startTime
  });

  // 7. Background Asynchronous Processing via Execution Mutex
  processSignalInBackground(signal, startTime).catch((err) => {
    logger.error({ err: err.message, signal_id: signal.signal_id }, 'Background execution failure');
  });
}

async function processSignalInBackground(signal: TradingSignal, startTime: number) {
  // Main branch: Order execution is disabled. Run in monitor & logging mode only.
  const ingestLatency = Date.now() - startTime;
  logger.info(
    { signal_id: signal.signal_id, strategy: signal.strategy, symbol: signal.symbol, action: signal.action },
    'Processing signal in MONITOR-ONLY mode on main branch. Order placement is disabled.'
  );

  // Record safe execution result: signal received and stored in SQLite, order placement bypassed
  signalLedger.updateExecutionResult(signal.signal_id, 'MONITORED', {
    execution_message: 'Signal received, validated & stored in SQLite. Order execution is disabled on main branch (Monitor-only mode).',
    latency_ms: ingestLatency
  });

  // Broadcast to frontend live blotter that signal was monitored & recorded
  wsTelemetry.broadcast({
    type: 'SIGNAL_EXECUTED',
    payload: {
      signal_id: signal.signal_id,
      status: 'MONITORED',
      execution_message: 'Signal logged in monitor mode (Order execution disabled on main)'
    }
  });
}

