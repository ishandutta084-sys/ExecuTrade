import { z } from 'zod';

export const TradingSignalSchema = z.object({
  secret: z.string().optional(),
  signal_id: z.string().min(1).max(100),
  strategy: z.string().min(1).default('MKL_GCB'),
  action: z.enum(['BUY', 'SELL', 'CLOSE', 'EXIT', 'FLATTEN']),
  symbol: z.string().min(1),
  lot: z.coerce.number().positive().optional().default(0.01),
  sl: z.coerce.number().optional().default(0),
  tp: z.coerce.number().optional().default(0),
  price: z.coerce.number().optional(),
  deviation: z.coerce.number().optional().default(30),
  timestamp: z.union([z.number(), z.string()]).optional(),
  is_test: z.boolean().optional()
});

export type TradingSignal = z.infer<typeof TradingSignalSchema>;

export const TestSignalSchema = z.object({
  signal_id: z.string().min(1).max(100),
  strategy: z.string().min(1).default('MKL_GCB'),
  action: z.enum(['BUY', 'SELL']),
  symbol: z.string().min(1),
  lot: z.coerce.number().positive().default(0.01),
  sl: z.coerce.number().default(0),
  tp: z.coerce.number().default(0)
});

export type TestSignal = z.infer<typeof TestSignalSchema>;

