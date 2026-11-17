import { signalLedger } from '../services/signal-ledger.service.js';
import { TestSignalSchema } from '../schemas/signal.schema.js';
import { handleTradingViewWebhook } from './webhook.controller.js';
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
    // Inject into webhook processor with test tag
    const testPayload = {
        ...parse.data,
        secret: req.body?.secret || process.env.WEBHOOK_SECRET || 'mkl_executrade_secret_key_2026',
        timestamp: Date.now()
    };
    req.body = testPayload;
    return handleTradingViewWebhook(req, reply);
}
//# sourceMappingURL=signals.controller.js.map