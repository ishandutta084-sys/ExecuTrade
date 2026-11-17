import type { FastifyRequest, FastifyReply } from 'fastify';
import { tradeLedgerService } from '../services/trade-ledger.service.js';

export async function getTradesLedger(req: FastifyRequest, reply: FastifyReply) {
  const query = req.query as {
    status?: string;
    symbol?: string;
    limit?: string;
    offset?: string;
  };

  const limit = query.limit ? parseInt(query.limit, 10) : 100;
  const offset = query.offset ? parseInt(query.offset, 10) : 0;

  const result = tradeLedgerService.getLedger({
    status: query.status,
    symbol: query.symbol,
    limit,
    offset
  });

  return reply.send({
    status: 'SUCCESS',
    ...result
  });
}

export async function triggerSupabaseSync(req: FastifyRequest, reply: FastifyReply) {
  const result = await tradeLedgerService.syncPendingToSupabase();
  return reply.send({
    status: result.success ? 'SUCCESS' : 'ERROR',
    ...result
  });
}

export async function getSupabaseConfig(req: FastifyRequest, reply: FastifyReply) {
  const config = tradeLedgerService.getSupabaseConfig();
  return reply.send({
    status: 'SUCCESS',
    config
  });
}

export async function updateSupabaseConfig(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as { supabase_url?: string; supabase_key?: string };
  if (!body.supabase_url || !body.supabase_key) {
    return reply.status(400).send({
      status: 'ERROR',
      message: 'Both supabase_url and supabase_key are required'
    });
  }

  tradeLedgerService.setSupabaseConfig(body.supabase_url, body.supabase_key);
  const syncResult = await tradeLedgerService.syncPendingToSupabase();

  return reply.send({
    status: 'SUCCESS',
    message: 'Supabase configuration updated and synced',
    sync: syncResult
  });
}
