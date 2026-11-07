import type { FastifyRequest, FastifyReply } from 'fastify';
import { mt5TcpHub } from '../socket/mt5-tcp-hub.js';
import { positionTracker } from '../core/position-tracker.js';

export async function getLivePositions(req: FastifyRequest, reply: FastifyReply) {
  const accountData = mt5TcpHub.getAccountData();
  const dbPositions = positionTracker.getAllActive();

  return reply.send({
    status: 'SUCCESS',
    account_number: accountData?.account_number || null,
    balance: accountData?.balance || 0,
    equity: accountData?.equity || 0,
    free_margin: accountData?.free_margin || 0,
    broker_positions: accountData?.open_positions || [],
    tracked_positions: dbPositions
  });
}

export async function closeSpecificPosition(req: FastifyRequest, reply: FastifyReply) {
  const params = req.params as { ticket: string };
  const ticket = parseInt(params.ticket);

  if (isNaN(ticket) || ticket <= 0) {
    return reply.status(400).send({ status: 'ERROR', message: 'Invalid position ticket' });
  }

  try {
    const res = await mt5TcpHub.sendCommand({
      action: 'POSITION_CLOSE',
      request_id: `manual_close_${ticket}_${Date.now()}`,
      position_ticket: ticket
    });

    return reply.send(res);
  } catch (err: any) {
    return reply.status(500).send({
      status: 'FAILED',
      message: `Failed to close position: ${err.message}`
    });
  }
}

