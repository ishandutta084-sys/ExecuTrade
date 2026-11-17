import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { initDatabase } from './config/database.js';
import { mt5TcpHub } from './socket/mt5-tcp-hub.js';
import { wsTelemetry } from './services/ws-telemetry.service.js';
import { handleTradingViewWebhook } from './controllers/webhook.controller.js';
import { getSignals, searchSignals, postTestSignal } from './controllers/signals.controller.js';
import { getLivePositions, closeSpecificPosition } from './controllers/positions.controller.js';
import { getBridgeStatus, togglePause, getAlerts, getEquityCurve } from './controllers/telemetry.controller.js';
import { flattenAllPositions } from './controllers/emergency.controller.js';
import { getTradesLedger, triggerSupabaseSync, getSupabaseConfig, updateSupabaseConfig } from './controllers/ledger.controller.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function bootstrap() {
    // 1. Initialize SQLite Database with WAL mode
    initDatabase();
    // 2. Start Local MT5 TCP Socket Server (127.0.0.1:8282)
    mt5TcpHub.start();
    // 3. Create Fastify Web Application
    const app = Fastify({
        logger: false, // We use custom pino logger for zero routing overhead
        bodyLimit: 1048576 // 1MB payload limit
    });
    // Accept both JSON and plain-text webhook signals (e.g. TradingView alert_message)
    app.addContentTypeParser(['application/json', 'text/plain'], { parseAs: 'string' }, (_req, body, done) => {
        try {
            const json = JSON.parse(body);
            done(null, json);
        }
        catch {
            done(null, body);
        }
    });
    await app.register(cors, {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    });
    // Serve React Single-Page Application (SPA) from client/dist
    const clientDistPath = path.resolve(__dirname, '../../client/dist');
    await app.register(fastifyStatic, {
        root: clientDistPath,
        prefix: '/',
        index: ['index.html']
    });
    app.setNotFoundHandler((req, reply) => {
        if (req.url.startsWith('/api') || req.url.startsWith('/wh') || req.url.startsWith('/webhook')) {
            reply.status(404).send({ status: 'ERROR', message: `Route ${req.method} ${req.url} not found` });
        }
        else {
            reply.sendFile('index.html');
        }
    });
    // ----------------------------------------------------
    // TRADINGVIEW WEBHOOK INGESTION ROUTES (Fast-ACK < 4ms)
    // ----------------------------------------------------
    app.post('/wh/v1/:token', handleTradingViewWebhook);
    app.post('/webhook/tradingview', handleTradingViewWebhook);
    // ----------------------------------------------------
    // GENERAL & REST TELEMETRY ROUTES
    // ----------------------------------------------------
    app.get('/health', async () => ({
        status: 'ONLINE',
        mt5_socket_connected: mt5TcpHub.isConnected(),
        uptime_seconds: process.uptime()
    }));
    app.get('/api/config', async () => ({
        supabase_url: env.SUPABASE_URL,
        supabase_anon_key: env.SUPABASE_ANON_KEY,
        admin_username: env.ADMIN_USERNAME
    }));
    app.get('/api/signals', getSignals);
    app.get('/api/search', searchSignals);
    app.post('/api/test-signal', postTestSignal);
    app.get('/api/positions', getLivePositions);
    app.post('/api/positions/:ticket/close', closeSpecificPosition);
    app.get('/api/bridge/status', getBridgeStatus);
    app.get('/api/bridge/toggle-state', getBridgeStatus);
    app.get('/api/telemetry/equity-curve', getEquityCurve);
    app.get('/api/equity-curve', getEquityCurve);
    app.post('/api/bridge/toggle-pause', togglePause);
    app.get('/api/alerts', getAlerts);
    app.get('/api/ledger/trades', getTradesLedger);
    app.post('/api/ledger/sync', triggerSupabaseSync);
    app.get('/api/ledger/supabase-config', getSupabaseConfig);
    app.post('/api/ledger/supabase-config', updateSupabaseConfig);
    app.post('/api/emergency/flatten-all', flattenAllPositions);
    // 4. Start HTTP Server & Attach WebSocket Telemetry Hub
    await app.listen({ port: env.PORT, host: env.HOST });
    wsTelemetry.initialize(app.server);
    logger.info({ port: env.PORT, host: env.HOST, mt5_tcp_port: env.MT5_TCP_PORT }, 'TI AUTOPILOT High-Throughput Engine online');
    // 5. Graceful Process Termination
    const shutdown = async (signal) => {
        logger.info({ signal }, 'Shutting down TI AUTOPILOT engine gracefully');
        await app.close();
        process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}
bootstrap().catch((err) => {
    logger.fatal({ err: err.message, stack: err.stack }, 'Fatal startup failure');
    process.exit(1);
});
//# sourceMappingURL=index.js.map