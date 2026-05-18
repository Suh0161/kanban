import crypto from 'crypto';
import db from '../db.js';
import { runWithRequestContext } from '../requestContext.js';
import { AppError } from './error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireApiKey(req, res, next) {
  if (req.query.api_key !== undefined) {
    throw new AppError('API keys must be sent in the X-API-Key header', 401, 'INVALID_API_KEY_LOCATION');
  }

  const apiKey = req.get('X-API-Key');

  if (!apiKey || typeof apiKey !== 'string') {
    return next();
  }
  // Reject obviously-wrong shapes without touching the DB.
  if (apiKey.length < 16 || apiKey.length > 256) {
    throw new AppError('Invalid API key', 401, 'INVALID_API_KEY');
  }

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const key = db.prepare(`
    SELECT id, user_id, workspace_id, scopes, expires_at
    FROM api_keys WHERE key_hash = ?
  `).get(keyHash);

  if (!key) {
    throw new AppError('Invalid API key', 401, 'INVALID_API_KEY');
  }

  if (key.expires_at) {
    const expiresMs = Date.parse(key.expires_at);
    if (Number.isNaN(expiresMs) || expiresMs < Date.now()) {
      throw new AppError('API key has expired', 401, 'API_KEY_EXPIRED');
    }
  }

  // Don't fail the request if last_used_at write fails (e.g. read-only mode).
  try {
    db.prepare("UPDATE api_keys SET last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(key.id);
  } catch { /* ignore */ }

  req.userId = key.user_id;
  req.apiKeyId = key.id;
  req.apiKeyScopes = (key.scopes || 'read,write')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const neededScope = SAFE_METHODS.has(req.method) ? 'read' : 'write';
  if (!req.apiKeyScopes.includes(neededScope)) {
    throw new AppError(`API key lacks required scope: ${neededScope}`, 403, 'INSUFFICIENT_SCOPE');
  }

  runWithRequestContext(
    {
      apiKey: {
        id: key.id,
        workspaceId: key.workspace_id,
        scopes: req.apiKeyScopes,
      },
    },
    () => next()
  );
}

export function requireApiKeyAuth(req, res, next) {
  if (!req.apiKeyId) {
    if (req.userId) return next();
    throw new AppError('API key required', 401, 'UNAUTHORIZED');
  }
  next();
}

export function requireScope(...scopes) {
  return (req, res, next) => {
    if (!req.apiKeyScopes) return next();

    const hasScope = scopes.some(s => req.apiKeyScopes.includes(s));
    if (!hasScope) {
      throw new AppError(`API key lacks required scope: ${scopes.join(', ')}`, 403, 'INSUFFICIENT_SCOPE');
    }
    next();
  };
}
