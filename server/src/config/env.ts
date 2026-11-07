import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or server
const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath, override: true });

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  WEBHOOK_SECRET: z.string().min(1).default('mkl_executrade_secret_key_2026'),
  MT5_API_KEY: z.string().min(1).default('mt5_bridge_secret_auth_token_99'),
  MT5_TCP_PORT: z.coerce.number().default(8282),
  DB_PATH: z.string().default(path.resolve(__dirname, '../../../tradebridge.db')),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('admin'),
  SUPABASE_URL: z.string().default(''),
  SUPABASE_ANON_KEY: z.string().default(''),
  MAX_SPREAD_PIPS: z.coerce.number().default(5.0),
  MAX_SLIPPAGE_POINTS: z.coerce.number().default(30),
  MAX_SIGNAL_AGE_MS: z.coerce.number().default(5000),
  DEDUP_WINDOW_SECONDS: z.coerce.number().default(60),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export const env = envSchema.parse(process.env);

