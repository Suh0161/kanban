import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../db.js';
import { IS_PROD } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { assertWorkspaceMember, assertCanManageWorkspace } from '../services/workspaceService.js';
import { dispatchSingleWebhook } from '../services/webhookService.js';
import { defineRoute, withDefaultMiddleware } from '../openapi/route.js';
import { Webhook, errorResponse, jsonContent } from '../openapi/schemas.js';

const router = withDefaultMiddleware(Router(), [requireAuth]);

const WorkspaceIdParam = z.object({ workspaceId: z.string() });
const WebhookPathParams = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

const webhookUrl = z
  .string()
  .url()
  .max(500)
  .refine(
    (val) => {
      try {
        const u = new URL(val);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
        if (IS_PROD && u.protocol !== 'https:') return false;
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Webhook URL must be HTTPS' }
  );

const KNOWN_EVENT_SLUGS = new Set([
  'task.created', 'task.updated', 'task.moved', 'task.deleted',
  'task.archived', 'task.restored',
  'column.created', 'column.deleted', 'column.archived', 'column.restored',
  'comment.added',
  'checklist.created', 'checklist.deleted',
]);

/**
 * Parse a comma-separated `events` string into a clean, validated list.
 * Drops blanks and unknown slugs so a typo can't slip into storage and
 * silently disable a webhook.
 */
function parseEvents(raw) {
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => KNOWN_EVENT_SLUGS.has(s));
}

const eventsField = z
  .string()
  .max(500)
  .refine(
    (val) => parseEvents(val).length > 0,
    { message: 'events must contain at least one known slug' }
  );

const CreateWebhookBody = z.object({
  url: webhookUrl,
  events: eventsField.optional(),
  active: z.boolean().optional(),
});

const UpdateWebhookBody = z.object({
  url: webhookUrl.optional(),
  events: eventsField.optional(),
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
      const rows = db.prepare(`
        SELECT id, url, events, active, created_at, updated_at
        FROM webhooks
        WHERE workspace_id = ?
        ORDER BY created_at DESC
      `).all(req.params.workspaceId);
      const webhooks = rows.map((w) => ({ ...w, active: !!w.active }));
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
      assertCanManageWorkspace(db, req.userId, req.params.workspaceId);
      const id = uuidv4();
      const secret = crypto.randomBytes(24).toString('hex');
      const events = parseEvents(req.body.events).join(',') ||
        'task.created,task.updated,task.moved,task.deleted';
      const active = req.body.active === false ? 0 : 1;

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
      assertCanManageWorkspace(db, req.userId, req.params.workspaceId);
      const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ? AND workspace_id = ?')
        .get(req.params.id, req.params.workspaceId);
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found', code: 'NOT_FOUND' });
      }
      const updates = {};
      if (req.body.url !== undefined) updates.url = req.body.url;
      if (req.body.events !== undefined) {
        updates.events = parseEvents(req.body.events).join(',');
        if (!updates.events) {
          return res.status(400).json({ error: 'events must contain at least one known slug', code: 'VALIDATION_ERROR' });
        }
      }
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
      assertCanManageWorkspace(db, req.userId, req.params.workspaceId);
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
  async (req, res, next) => {
    try {
      assertCanManageWorkspace(db, req.userId, req.params.workspaceId);
      const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ? AND workspace_id = ?')
        .get(req.params.id, req.params.workspaceId);
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found', code: 'NOT_FOUND' });
      }
      const result = await dispatchSingleWebhook({
        url: webhook.url,
        secret: webhook.secret,
        event: 'ping',
        payload: {
          event: 'ping',
          workspace_id: req.params.workspaceId,
          timestamp: new Date().toISOString(),
        },
      });
      if (!result.ok) {
        return res.status(400).json({ error: `Refused: ${result.reason}`, code: 'WEBHOOK_BLOCKED' });
      }
      res.json({ ok: true, message: 'Test ping sent' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
