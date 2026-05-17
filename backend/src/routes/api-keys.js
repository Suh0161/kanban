import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { assertWorkspaceMember, assertCanEdit } from '../services/workspaceService.js';
import { defineRoute, withDefaultMiddleware } from '../openapi/route.js';
import { ApiKey, errorResponse, jsonContent } from '../openapi/schemas.js';

const router = withDefaultMiddleware(Router(), [requireAuth]);

const WorkspaceIdParam = z.object({ workspaceId: z.string() });
const KeyPathParams = z.object({
  workspaceId: z.string(),
  keyId: z.string(),
});

const SCOPE_VALUES = new Set(['read', 'write']);

function parseScopes(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return ['read', 'write'];
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => SCOPE_VALUES.has(s));
  // De-dup, keep order stable.
  return Array.from(new Set(list));
}

function requireUserSession(req, _res, next) {
  if (req.apiKeyId) {
    return next(new AppError('User session required to manage API keys', 403, 'INSUFFICIENT_SCOPE'));
  }
  return next();
}

const CreateKeyBody = z.object({
  name: z.string().min(1).max(100),
  // Comma-separated, only `read` and `write` allowed. Anything else is
  // dropped silently rather than failing validation, so a frontend that
  // doesn't yet know a future scope can still call the endpoint.
  scopes: z.string().max(200).optional(),
  // ISO-8601 datetime. We parse + range-check on top of the format check
  // because `new Date('garbage')` is NaN and would silently never expire.
  expires_at: z
    .string()
    .max(64)
    .optional()
    .refine(
      (val) => {
        if (val === undefined || val === '') return true;
        const t = Date.parse(val);
        if (Number.isNaN(t)) return false;
        // Refuse a date already in the past — the key would be born expired.
        return t > Date.now();
      },
      { message: 'expires_at must be a future ISO timestamp' }
    ),
});

const KeyCreated = ApiKey.extend({
  key: z.string().openapi({ description: 'Returned only once. Store securely.' }),
  created_at: z.string(),
});

defineRoute(
  router,
  {
    method: 'get',
    path: '/workspaces/:workspaceId/api-keys',
    tag: 'API Keys',
    summary: 'List API keys',
    middleware: [requireUserSession],
    params: WorkspaceIdParam,
    responses: {
      200: jsonContent(z.object({ keys: z.array(ApiKey) }), 'API key list'),
      403: errorResponse('User session required'),
    },
  },
  (req, res, next) => {
    try {
      assertWorkspaceMember(db, req.userId, req.params.workspaceId);
      const keys = db.prepare(`
        SELECT id, name, key_prefix, scopes, last_used_at, expires_at, created_at
        FROM api_keys
        WHERE workspace_id = ? AND user_id = ?
        ORDER BY created_at DESC
      `).all(req.params.workspaceId, req.userId);
      res.json({ keys });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'post',
    path: '/workspaces/:workspaceId/api-keys',
    tag: 'API Keys',
    summary: 'Create API key',
    description: 'The raw key value is returned only once at creation time. Viewers cannot create API keys.',
    middleware: [requireUserSession],
    params: WorkspaceIdParam,
    body: CreateKeyBody,
    responses: {
      201: { description: 'API key created', schema: KeyCreated },
      403: errorResponse('User session required'),
    },
  },
  (req, res, next) => {
    try {
      assertCanEdit(db, req.userId, req.params.workspaceId);
      const id = uuidv4();
      const rawKey = `Elevate_${crypto.randomBytes(24).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const keyPrefix = rawKey.substring(0, 12);
      const scopes = parseScopes(req.body.scopes).join(',');
      const expiresAt = req.body.expires_at
        ? new Date(req.body.expires_at).toISOString()
        : null;

      db.prepare(`
        INSERT INTO api_keys (id, user_id, workspace_id, name, key_hash, key_prefix, scopes, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.userId, req.params.workspaceId, req.body.name, keyHash, keyPrefix, scopes, expiresAt);

      res.status(201).json({
        id,
        name: req.body.name,
        key: rawKey,
        key_prefix: keyPrefix,
        scopes,
        last_used_at: null,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'delete',
    path: '/workspaces/:workspaceId/api-keys/:keyId',
    tag: 'API Keys',
    summary: 'Revoke API key',
    middleware: [requireUserSession],
    params: KeyPathParams,
    responses: {
      200: jsonContent(z.object({ ok: z.boolean() }), 'Revoked'),
      403: errorResponse('User session required'),
      404: errorResponse('API key not found'),
    },
  },
  (req, res, next) => {
    try {
      assertWorkspaceMember(db, req.userId, req.params.workspaceId);
      const result = db.prepare(`
        DELETE FROM api_keys WHERE id = ? AND user_id = ? AND workspace_id = ?
      `).run(req.params.keyId, req.userId, req.params.workspaceId);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'API key not found', code: 'NOT_FOUND' });
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
