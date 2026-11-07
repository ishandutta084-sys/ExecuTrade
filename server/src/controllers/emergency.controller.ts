import type { FastifyRequest, FastifyReply } from 'fastify';
import { mt5TcpHub } from '../socket/mt5-tcp-hub.js';
import { logger } from '../utils/logger.js';
import { wsTelemetry } from '../services/ws-telemetry.service.js';

export async function flattenAllPositions(req: FastifyRequest, reply: FastifyReply) {
  logger.warn('OPERATOR TRIGGERED EMERGENCY FLATTEN ALL POSITIONS');

  try {
    const res = await mt5TcpHub.sendCommand({
      action: 'FLATTEN_ALL',
      request_id: `flatten_${Date.now()}`
    }, 8000);

    wsTelemetry.broadcast({
      type: 'EMERGENCY_FLATTEN',
      payload: res
    });

    return reply.send({
      status: 'SUCCESS',
      message: 'Emergency flatten command executed',
      result: res
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Emergency flatten failed');
    return reply.status(500).send({
      status: 'FAILED',
      message: `Emergency flatten failed: ${err.message}`
    });
  }
}

