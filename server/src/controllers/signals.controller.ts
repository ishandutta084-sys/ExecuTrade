import type { FastifyRequest, FastifyReply } from 'fastify';
import { signalLedger } from '../services/signal-ledger.service.js';
import { TestSignalSchema } from '../schemas/signal.schema.js';
import { handleTradingViewWebhook } from './webhook.controller.js';

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

  // Inject into webhook processor with test tag
  const testPayload = {
    ...parse.data,
    secret: (req.body as any)?.secret || process.env.WEBHOOK_SECRET || 'mkl_executrade_secret_key_2026',
    timestamp: Date.now()
  };

  req.body = testPayload;
  return handleTradingViewWebhook(req, reply);
}

