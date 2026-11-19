import type { FastifyRequest, FastifyReply } from 'fastify';
import { mt5TcpHub } from '../socket/mt5-tcp-hub.js';
import { logger } from '../utils/logger.js';
import { wsTelemetry } from '../services/ws-telemetry.service.js';

export async function flattenAllPositions(req: FastifyRequest, reply: FastifyReply) {
  logger.warn('Blocked attempt to flatten positions: Order execution is disabled on main branch');
  return reply.status(403).send({
    status: 'DISABLED',
    message: 'Emergency flatten is disabled on the main branch. ExecuTrade is running in monitor-only mode.'
  });
}

