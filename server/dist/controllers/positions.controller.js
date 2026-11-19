import { mt5TcpHub } from '../socket/mt5-tcp-hub.js';
import { positionTracker } from '../core/position-tracker.js';
export async function getLivePositions(req, reply) {
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
export async function closeSpecificPosition(req, reply) {
    const params = req.params;
    return reply.status(403).send({
        status: 'DISABLED',
        message: 'Position closing is disabled on the main branch. ExecuTrade is running in monitor-only mode.'
    });
}
//# sourceMappingURL=positions.controller.js.map