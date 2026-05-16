import crypto from 'crypto';
import db from '../db.js';
import { AppError } from './error.js';

export function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return next();
  }

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const key = db.prepare(`
    SELECT * FROM api_keys WHERE key_hash = ?
  `).get(keyHash);

  if (!key) {
    throw new AppError('Invalid API key', 401, 'INVALID_API_KEY');
  }

  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    throw new AppError('API key has expired', 401, 'API_KEY_EXPIRED');
  }

  db.prepare('UPDATE api_keys SET last_used_at = datetime(\'now\') WHERE id = ?').run(key.id);

  req.userId = key.user_id;
  req.apiKeyId = key.id;
  req.apiKeyScopes = (key.scopes || 'read,write').split(',');

  next();
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
