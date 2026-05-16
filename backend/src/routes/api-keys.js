import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { assertWorkspaceMember } from '../services/workspaceService.js';
import { defineRoute, withDefaultMiddleware } from '../openapi/route.js';
import { ApiKey, errorResponse, jsonContent } from '../openapi/schemas.js';

const router = withDefaultMiddleware(Router(), [requireAuth]);

const WorkspaceIdParam = z.object({ workspaceId: z.string() });
const KeyPathParams = z.object({
  workspaceId: z.string(),
  keyId: z.string(),
});

const CreateKeyBody = z.object({
  name: z.string().min(1).max(100),
  scopes: z.string().optional(),
  expires_at: z.string().optional(),
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
    params: WorkspaceIdParam,
    responses: { 200: jsonContent(z.object({ keys: z.array(ApiKey) }), 'API key list') },
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
    description: 'The raw key value is returned only once at creation time.',
    params: WorkspaceIdParam,
    body: CreateKeyBody,
    responses: { 201: { description: 'API key created', schema: KeyCreated } },
  },
  (req, res, next) => {
    try {
      assertWorkspaceMember(db, req.userId, req.params.workspaceId);
      const id = uuidv4();
      const rawKey = `jokel_${crypto.randomBytes(24).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const keyPrefix = rawKey.substring(0, 10);
      const scopes = req.body.scopes || 'read,write';
      const expiresAt = req.body.expires_at || null;

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
    params: KeyPathParams,
    responses: {
      200: jsonContent(z.object({ ok: z.boolean() }), 'Revoked'),
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
