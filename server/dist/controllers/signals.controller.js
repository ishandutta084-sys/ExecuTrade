import { signalLedger } from '../services/signal-ledger.service.js';
import { TestSignalSchema } from '../schemas/signal.schema.js';
import { handleTradingViewWebhook } from './webhook.controller.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
export async function getSignals(req, reply) {
    const query = req.query;
    const limit = query.limit ? parseInt(query.limit) : 100;
    const signals = signalLedger.getAllSignals(limit);
    return reply.send(signals);
}
export async function searchSignals(req, reply) {
    const query = req.query;
    const q = (query.q || '').trim();
    const limit = query.limit ? parseInt(query.limit) : 100;
    if (!q) {
        return reply.send(signalLedger.getAllSignals(limit));
    }
    const results = signalLedger.searchSignals(q, limit);
    return reply.send(results);
}
export async function postTestSignal(req, reply) {
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
export async function executeManualOrder(req, reply) {
    const body = req.body;
    logger.warn({ body }, 'Blocked attempt to execute manual order: Order execution is disabled on main branch');
    return reply.status(403).send({
        status: 'DISABLED',
        message: 'Order execution is disabled on the main branch. ExecuTrade is running in monitor-only mode.'
    });
}
//# sourceMappingURL=signals.controller.js.map