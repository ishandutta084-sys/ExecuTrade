import type { FastifyRequest, FastifyReply } from 'fastify';
import { signalLedger } from '../services/signal-ledger.service.js';
import { TestSignalSchema } from '../schemas/signal.schema.js';
import { handleTradingViewWebhook } from './webhook.controller.js';
import { mt5TcpHub } from '../socket/mt5-tcp-hub.js';
import { brokerNormalizer } from '../core/broker-normalizer.js';
import { tradeLedgerService } from '../services/trade-ledger.service.js';
import { wsTelemetry } from '../services/ws-telemetry.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

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

  logger.warn({ body }, 'Blocked attempt to execute manual order: Order execution is disabled on main branch');

  return reply.status(403).send({
    status: 'DISABLED',
    message: 'Order execution is disabled on the main branch. ExecuTrade is running in monitor-only mode.'
  });
}

