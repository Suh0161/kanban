import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { assertWorkspaceMember } from '../services/workspaceService.js';
import db from '../db.js';
import { defineRoute, withDefaultMiddleware } from '../openapi/route.js';
import { jsonContent } from '../openapi/schemas.js';

// In-memory presence store (cleared on server restart)
const presenceMap = new Map();

const router = withDefaultMiddleware(Router(), [requireAuth]);

const WorkspaceIdParam = z.object({ workspaceId: z.string() });

const OnlineUser = z.object({
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
});

defineRoute(
  router,
  {
    method: 'post',
    path: '/workspaces/:workspaceId/presence/heartbeat',
    tag: 'Presence',
    summary: 'Send heartbeat',
    description: 'Call every 30 seconds to mark the user as active in a workspace.',
    params: WorkspaceIdParam,
    responses: { 200: jsonContent(z.object({ ok: z.boolean() }), 'OK') },
  },
  (req, res, next) => {
    try {
      assertWorkspaceMember(db, req.userId, req.params.workspaceId);
      if (!presenceMap.has(req.params.workspaceId)) {
        presenceMap.set(req.params.workspaceId, new Map());
      }
      presenceMap.get(req.params.workspaceId).set(req.userId, Date.now());
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'get',
    path: '/workspaces/:workspaceId/presence',
    tag: 'Presence',
    summary: 'Get online users',
    description: 'Returns users seen in the last 60 seconds.',
    params: WorkspaceIdParam,
    responses: { 200: jsonContent(z.object({ online: z.array(OnlineUser) }), 'Online users') },
  },
  (req, res, next) => {
    try {
      assertWorkspaceMember(db, req.userId, req.params.workspaceId);
      const workspacePresence = presenceMap.get(req.params.workspaceId);
      const now = Date.now();
      const online = [];
      if (workspacePresence) {
        for (const [userId, lastSeen] of workspacePresence) {
          if (now - lastSeen < 60000) {
            const user = db.prepare('SELECT id, name, avatar FROM users WHERE id = ?').get(userId);
            if (user) online.push({ userId: user.id, name: user.name, avatar: user.avatar });
          }
        }
      }
      res.json({ online });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
