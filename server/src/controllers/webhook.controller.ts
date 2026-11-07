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
  await executionMutex.acquire(async () => {
    const symbol = brokerNormalizer.resolveSymbol(signal.symbol);
    const magic = brokerNormalizer.getStrategyMagic(signal.strategy);

    // ----------------------------------------------------
    // CASE A: POSITION EXIT / CLOSE
    // ----------------------------------------------------
    if (signal.action === 'CLOSE' || signal.action === 'EXIT' || signal.action === 'FLATTEN') {
      // 1. Casual Inversion Barrier: Wait if an ENTRY is currently in-flight
      await positionTracker.awaitInFlight(signal.strategy, signal.symbol);

      const active = positionTracker.getActivePosition(signal.strategy, signal.symbol);
      if (!active) {
        logger.warn({ strategy: signal.strategy, symbol: signal.symbol }, 'No active position found to close');
        signalLedger.updateExecutionResult(signal.signal_id, 'DROPPED', {
          execution_message: 'No open position found for strategy to close'
        });
        return;
      }

      try {
        const res = await mt5TcpHub.sendCommand({
          action: 'POSITION_CLOSE',
          request_id: `close_${signal.signal_id}`,
          strategy: signal.strategy,
          magic: active.magic,
          position_ticket: active.position_ticket,
          symbol
        });

        if (res.status === 'EXECUTED') {
          positionTracker.recordClosePosition(signal.strategy, signal.symbol, active.position_ticket);
          signalLedger.updateExecutionResult(signal.signal_id, 'EXECUTED', {
            position_ticket: active.position_ticket,
            execution_message: 'Position closed successfully',
            latency_ms: Date.now() - startTime,
            executed_price: res.executed_price
          });

          wsTelemetry.broadcast({
            type: 'SIGNAL_EXECUTED',
            payload: { signal_id: signal.signal_id, status: 'EXECUTED', ticket: active.position_ticket }
          });
        } else {
          signalLedger.updateExecutionResult(signal.signal_id, 'FAILED', {
            execution_message: res.message || 'Position close rejected by broker'
          });
        }
      } catch (err: any) {
        signalLedger.updateExecutionResult(signal.signal_id, 'FAILED', {
          execution_message: `Close error: ${err.message}`
        });
      }
      return;
    }

    // ----------------------------------------------------
    // CASE B: ENTRY (BUY / SELL)
    // ----------------------------------------------------
    const lot = brokerNormalizer.normalizeLot(symbol, signal.lot);
    const clampedStops = brokerNormalizer.clampStops(symbol, signal.action, signal.price || 0, signal.sl, signal.tp);

    // Register in-flight barrier promise
    let resolveInFlight: (ticket: number | null) => void;
    const inFlightPromise = new Promise<number | null>((resolve) => {
      resolveInFlight = resolve;
    });
    positionTracker.registerInFlight(signal.strategy, signal.symbol, inFlightPromise);

    try {
      const res = await mt5TcpHub.sendCommand({
        action: 'ORDER_SEND',
        request_id: `order_${signal.signal_id}`,
        strategy: signal.strategy,
        magic,
        symbol,
        trade_type: signal.action,
        lot,
        sl: clampedStops.sl,
        tp: clampedStops.tp,
        max_deviation: signal.deviation || 30
      });

      if (res.status === 'EXECUTED') {
        const positionTicket = Number(res.position_ticket || res.order_ticket);
        resolveInFlight!(positionTicket);

        positionTracker.recordOpenPosition({
          strategy: signal.strategy,
          symbol: signal.symbol,
          position_ticket: positionTicket,
          order_ticket: res.order_ticket ? Number(res.order_ticket) : undefined,
          deal_ticket: res.deal_ticket ? Number(res.deal_ticket) : undefined,
          magic,
          action: signal.action,
          lot,
          open_price: res.executed_price || 0,
          sl: clampedStops.sl,
          tp: clampedStops.tp
        });

        signalLedger.updateExecutionResult(signal.signal_id, 'EXECUTED', {
          order_ticket: res.order_ticket,
          deal_ticket: res.deal_ticket,
          position_ticket: positionTicket,
          execution_message: 'Order filled successfully',
          latency_ms: Date.now() - startTime,
          executed_price: res.executed_price
        });

        wsTelemetry.broadcast({
          type: 'SIGNAL_EXECUTED',
          payload: { signal_id: signal.signal_id, status: 'EXECUTED', ticket: positionTicket }
        });
      } else {
        resolveInFlight!(null);
        signalLedger.updateExecutionResult(signal.signal_id, 'FAILED', {
          execution_message: res.message || 'Order rejected by MT5 broker'
        });
      }
    } catch (err: any) {
      resolveInFlight!(null);
      signalLedger.updateExecutionResult(signal.signal_id, 'FAILED', {
        execution_message: `Execution error: ${err.message}`
      });
    }
  });
}

