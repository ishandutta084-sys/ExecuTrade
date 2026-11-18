import { tradeLedgerService } from '../services/trade-ledger.service.js';
import { analyticsService } from '../services/analytics.service.js';
export async function getTradesLedger(req, reply) {
    const query = req.query;
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
export async function triggerSupabaseSync(req, reply) {
    const result = await tradeLedgerService.syncPendingToSupabase();
    return reply.send({
        status: result.success ? 'SUCCESS' : 'ERROR',
        ...result
    });
}
export async function getSupabaseConfig(req, reply) {
    const config = tradeLedgerService.getSupabaseConfig();
    return reply.send({
        status: 'SUCCESS',
        config
    });
}
export async function updateSupabaseConfig(req, reply) {
    const body = req.body;
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
export async function getAnalyticsSummary(req, reply) {
    const query = req.query;
    const analytics = analyticsService.getAnalytics(query.strategy);
    return reply.send({
        status: 'SUCCESS',
        analytics
    });
}
export async function backfillLedgerController(req, reply) {
    const result = tradeLedgerService.backfillLedger();
    return reply.send({
        status: 'SUCCESS',
        ...result
    });
}
//# sourceMappingURL=ledger.controller.js.map