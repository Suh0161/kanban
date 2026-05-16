import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

function requireEnv(key, fallback) {
  const value = process.env[key];
  if (value === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const NODE_ENV = requireEnv('NODE_ENV', 'development');
export const PORT = parseInt(requireEnv('PORT', '3001'), 10);
export const DB_PATH = requireEnv('DB_PATH', '../database/jokel.db');
export const JWT_SECRET = requireEnv('JWT_SECRET');
export const FRONTEND_URL = requireEnv('FRONTEND_URL', 'http://localhost:5173');

export const IS_DEV = NODE_ENV === 'development';
export const IS_PROD = NODE_ENV === 'production';

// Security: enforce minimum JWT secret length in production
if (IS_PROD && JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

// Audit logging config
export const AUDIT_LOG_ENABLED = requireEnv('AUDIT_LOG_ENABLED', 'true') === 'true';
