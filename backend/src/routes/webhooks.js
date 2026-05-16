import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { assertWorkspaceMember } from '../services/workspaceService.js';
import { defineRoute, withDefaultMiddleware } from '../openapi/route.js';
import { Webhook, errorResponse, jsonContent } from '../openapi/schemas.js';

const router = withDefaultMiddleware(Router(), [requireAuth]);

const WorkspaceIdParam = z.object({ workspaceId: z.string() });
const WebhookPathParams = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

const CreateWebhookBody = z.object({
  url: z.string().url().max(500),
  events: z.string().optional(),
  active: z.boolean().optional(),
});

const UpdateWebhookBody = z.object({
  url: z.string().url().max(500).optional(),
  events: z.string().optional(),
  active: z.boolean().optional(),
});

const WebhookCreated = Webhook.extend({
  secret: z.string().openapi({ description: 'Returned only once. Store securely.' }),
  created_at: z.string(),
});

defineRoute(
  router,
  {
    method: 'get',
    path: '/workspaces/:workspaceId/webhooks',
    tag: 'Webhooks',
    summary: 'List webhooks',
    params: WorkspaceIdParam,
    responses: { 200: jsonContent(z.object({ webhooks: z.array(Webhook) }), 'Webhook list') },
  },
  (req, res, next) => {
    try {
      assertWorkspaceMember(db, req.userId, req.params.workspaceId);
      const webhooks = db.prepare(`
        SELECT id, url, events, active, created_at, updated_at
        FROM webhooks
        WHERE workspace_id = ?
        ORDER BY created_at DESC
      `).all(req.params.workspaceId);
      res.json({ webhooks });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'post',
    path: '/workspaces/:workspaceId/webhooks',
    tag: 'Webhooks',
    summary: 'Create webhook',
    description: 'Returns the signing secret only once at creation time.',
    params: WorkspaceIdParam,
    body: CreateWebhookBody,
    responses: { 201: { description: 'Webhook created', schema: WebhookCreated } },
  },
  (req, res, next) => {
    try {
      assertWorkspaceMember(db, req.userId, req.params.workspaceId);
      const id = uuidv4();
      const secret = crypto.randomBytes(24).toString('hex');
      const events = req.body.events || 'task.created,task.updated,task.moved,task.deleted';
      const active = req.body.active !== false ? 1 : 0;

      db.prepare(`
        INSERT INTO webhooks (id, workspace_id, url, events, secret, active)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, req.params.workspaceId, req.body.url, events, secret, active);

      res.status(201).json({
        id,
        url: req.body.url,
        events,
        secret,
        active: !!active,
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
    method: 'patch',
    path: '/workspaces/:workspaceId/webhooks/:id',
    tag: 'Webhooks',
    summary: 'Update webhook',
    params: WebhookPathParams,
    body: UpdateWebhookBody,
    responses: {
      200: jsonContent(z.object({ ok: z.boolean() }), 'Updated'),
      404: errorResponse('Webhook not found'),
    },
  },
  (req, res, next) => {
    try {
      assertWorkspaceMember(db, req.userId, req.params.workspaceId);
      const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ? AND workspace_id = ?')
        .get(req.params.id, req.params.workspaceId);
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found', code: 'NOT_FOUND' });
      }
      const updates = {};
      if (req.body.url !== undefined) updates.url = req.body.url;
      if (req.body.events !== undefined) updates.events = req.body.events;
      if (req.body.active !== undefined) updates.active = req.body.active ? 1 : 0;
      updates.updated_at = new Date().toISOString();

      const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      db.prepare(`UPDATE webhooks SET ${setClauses} WHERE id = ?`).run(...values, req.params.id);

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'delete',
    path: '/workspaces/:workspaceId/webhooks/:id',
    tag: 'Webhooks',
    summary: 'Delete webhook',
    params: WebhookPathParams,
    responses: {
      200: jsonContent(z.object({ ok: z.boolean() }), 'Deleted'),
      404: errorResponse('Webhook not found'),
    },
  },
  (req, res, next) => {
    try {
      assertWorkspaceMember(db, req.userId, req.params.workspaceId);
      const result = db.prepare('DELETE FROM webhooks WHERE id = ? AND workspace_id = ?')
        .run(req.params.id, req.params.workspaceId);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Webhook not found', code: 'NOT_FOUND' });
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'post',
    path: '/workspaces/:workspaceId/webhooks/:id/test',
    tag: 'Webhooks',
    summary: 'Send test ping',
    params: WebhookPathParams,
    responses: {
      200: jsonContent(z.object({ ok: z.boolean(), message: z.string() }), 'Test ping sent'),
      404: errorResponse('Webhook not found'),
    },
  },
  (req, res, next) => {
    try {
      assertWorkspaceMember(db, req.userId, req.params.workspaceId);
      const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ? AND workspace_id = ?')
        .get(req.params.id, req.params.workspaceId);
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found', code: 'NOT_FOUND' });
      }
      const payload = JSON.stringify({
        event: 'ping',
        workspace_id: req.params.workspaceId,
        timestamp: new Date().toISOString(),
      });
      const signature = crypto.createHmac('sha256', webhook.secret).update(payload).digest('hex');
      fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Jokel-Event': 'ping',
          'X-Jokel-Signature': signature,
        },
        body: payload,
      }).catch(() => {});
      res.json({ ok: true, message: 'Test ping sent' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
