import type { FastifyRequest, FastifyReply } from 'fastify';
export declare function getIngestionPaused(): boolean;
export declare function getBridgeStatus(req: FastifyRequest, reply: FastifyReply): Promise<never>;
export declare function togglePause(req: FastifyRequest, reply: FastifyReply): Promise<never>;
export declare function getAlerts(req: FastifyRequest, reply: FastifyReply): Promise<never>;
export declare function getEquityCurve(req: FastifyRequest, reply: FastifyReply): Promise<never>;
