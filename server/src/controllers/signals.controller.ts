import type { FastifyRequest, FastifyReply } from 'fastify';
import { signalLedger } from '../services/signal-ledger.service.js';
import { TestSignalSchema } from '../schemas/signal.schema.js';
import { handleTradingViewWebhook } from './webhook.controller.js';
import { mt5TcpHub } from '../socket/mt5-tcp-hub.js';
import { brokerNormalizer } from '../core/broker-normalizer.js';
import { tradeLedgerService } from '../services/trade-ledger.service.js';
import { wsTelemetry } from '../services/ws-telemetry.service.js';
import { env } from '../config/env.js';

export async function getSignals(req: FastifyRequest, reply: FastifyReply) {
  const query = req.query as { limit?: string };
  const limit = query.limit ? parseInt(query.limit) : 100;
  const signals = signalLedger.getAllSignals(limit);
  return reply.send(signals);
}

export async function searchSignals(req: FastifyRequest, reply: FastifyReply) {
  const query = req.query as { q?: string; limit?: string };
  const q = (query.q || '').trim();
  const limit = query.limit ? parseInt(query.limit) : 100;

  if (!q) {
    return reply.send(signalLedger.getAllSignals(limit));
  }

  const results = signalLedger.searchSignals(q, limit);
  return reply.send(results);
}

export async function postTestSignal(req: FastifyRequest, reply: FastifyReply) {
  const parse = TestSignalSchema.safeParse(req.body);
  if (!parse.success) {
    return reply.status(400).send({
      status: 'REJECTED',
      error: 'Invalid test signal format',
      issues: parse.error.issues
    });
  }

  // Inject into webhook processor with verified secret
  const testPayload = {
    ...parse.data,
    secret: env.WEBHOOK_SECRET,
    timestamp: Date.now()
  };

  req.body = testPayload;
  return handleTradingViewWebhook(req, reply);
}

export async function executeManualOrder(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as {
    symbol?: string;
    action?: 'BUY' | 'SELL';
    lot?: number;
    sl?: number;
    tp?: number;
    strategy?: string;
  };

  const rawSymbol = (body.symbol || 'XAUUSD').toUpperCase().trim();
  const action = (body.action || 'BUY').toUpperCase() as 'BUY' | 'SELL';
  const lot = body.lot || 0.01;
  const sl = body.sl || 0;
  const tp = body.tp || 0;
  const strategy = body.strategy || 'MANUAL';

  const brokerSymbol = brokerNormalizer.resolveSymbol(rawSymbol);
  const normalizedLot = brokerNormalizer.normalizeLot(brokerSymbol, lot);
  const clampedStops = brokerNormalizer.clampStops(brokerSymbol, action, 0, sl, tp);

  const signalId = `MANUAL-${Date.now()}`;

  try {
    const res = await mt5TcpHub.sendCommand({
      action: 'ORDER_SEND',
      request_id: `order_${signalId}`,
      strategy,
      magic: 0,
      symbol: brokerSymbol,
      trade_type: action,
      lot: normalizedLot,
      sl: clampedStops.sl,
      tp: clampedStops.tp,
      max_deviation: 30
    });

    if (res.status === 'EXECUTED') {
      const positionTicket = Number(res.position_ticket || res.order_ticket);
      const currentAccount = mt5TcpHub.getAccountData();

      tradeLedgerService.recordOpenTrade({
        ticket: positionTicket,
        strategy,
        symbol: brokerSymbol,
        action,
        lot: normalizedLot,
        open_price: res.executed_price || 0,
        sl: clampedStops.sl,
        tp: clampedStops.tp,
        equity: currentAccount?.equity || 629.82,
        balance: currentAccount?.balance || 629.82,
        comment: `Manual Dispatch: ${strategy}`
      });

      signalLedger.recordManualExecution({
        signal_id: signalId,
        strategy,
        action,
        symbol: brokerSymbol,
        lot: normalizedLot,
        open_price: res.executed_price || 0,
        sl: clampedStops.sl,
        tp: clampedStops.tp,
        order_ticket: positionTicket,
        status: 'EXECUTED',
        execution_message: `Manual Order #${positionTicket} (${action} ${normalizedLot} ${brokerSymbol}) executed at ${res.executed_price}`
      });

      wsTelemetry.broadcast({
        type: 'SIGNAL_RECEIVED',
        payload: {
          signal_id: signalId,
          strategy,
          action,
          symbol: brokerSymbol,
          lot: normalizedLot,
          status: 'EXECUTED'
        }
      });

      return reply.send({
        status: 'SUCCESS',
        signal_id: signalId,
        ticket: positionTicket,
        executed_price: res.executed_price,
        message: 'Manual trade executed successfully'
      });
    } else {
      return reply.status(400).send({
        status: 'FAILED',
        error: res.message || 'Execution failed on MT5'
      });
    }
  } catch (err: any) {
    return reply.status(500).send({
      status: 'ERROR',
      error: `Execution timeout or socket error: ${err.message}`
    });
  }
}

