import { logger } from '../utils/logger.js';
export async function flattenAllPositions(req, reply) {
    logger.warn('Blocked attempt to flatten positions: Order execution is disabled on main branch');
    return reply.status(403).send({
        status: 'DISABLED',
        message: 'Emergency flatten is disabled on the main branch. ExecuTrade is running in monitor-only mode.'
    });
}
//# sourceMappingURL=emergency.controller.js.map