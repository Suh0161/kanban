import { config } from 'dotenv';
import crypto from 'crypto';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

function requireEnv(key, fallback) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const NODE_ENV = requireEnv('NODE_ENV', 'development');
export const PORT = parseInt(requireEnv('PORT', '3001'), 10);
export const DB_PATH = requireEnv('DB_PATH', '../database/Elevate.db');

export const IS_DEV = NODE_ENV === 'development';
export const IS_PROD = NODE_ENV === 'production';

// JWT secret. Required in production; dev/test gets an ephemeral secret when
// none is configured, so missing env no longer means a predictable signer.
export const JWT_SECRET = (() => {
  const value = process.env.JWT_SECRET;
  if (!value || value === 'change-me-to-a-long-random-string-min-32-chars') {
    if (IS_PROD) {
      throw new Error('JWT_SECRET is required and must not be the example value in production');
    }
    console.warn('[config] JWT_SECRET not set; using an ephemeral development secret. Set one in .env.');
    return crypto.randomBytes(48).toString('base64url');
  }
  if (IS_PROD && value.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  return value;
})();

// CORS: accept a comma-separated list, trim entries, drop blanks.
const RAW_FRONTEND_URL = requireEnv('FRONTEND_URL', 'http://localhost:5173');
export const FRONTEND_URLS = RAW_FRONTEND_URL
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
// Back-compat alias for code that expects a single string.
export const FRONTEND_URL = FRONTEND_URLS[0];

// Audit logging config
export const AUDIT_LOG_ENABLED = requireEnv('AUDIT_LOG_ENABLED', 'true') === 'true';

// Optional: when set, the API runs in Postgres mode (Supabase or self-hosted).
// We don't switch the runtime yet — see docs/SECURITY.md — but exposing the
// flag lets us short-circuit unsafe behaviour (e.g. don't write SQLite WAL).
export const DATABASE_URL = process.env.DATABASE_URL || null;
export const USE_POSTGRES = !!DATABASE_URL;
