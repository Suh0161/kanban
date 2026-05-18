import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getActivityLog } from '../services/activityService.js';
import { assertWorkspaceMember } from '../services/workspaceService.js';
import db from '../db.js';
import { defineRoute, withDefaultMiddleware } from '../openapi/route.js';
import { jsonContent } from '../openapi/schemas.js';

const router = withDefaultMiddleware(Router(), [requireAuth]);

const Params = z.object({ workspaceId: z.string() });

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const ActivityEntry = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  userName: z.string().optional(),
  userAvatar: z.string().nullable().optional(),
  workspaceId: z.string(),
  event: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  taskCode: z.string().optional(),
  detail: z.string().optional(),
  createdAt: z.string(),
});

defineRoute(
  router,
  {
    method: 'get',
    path: '/workspaces/:workspaceId/activity',
    tag: 'Workspaces',
    summary: 'Get activity log',
    params: Params,
    query: Query,
    responses: { 200: jsonContent(z.object({ activity: z.array(ActivityEntry) }), 'Activity list') },
  },
  (req, res, next) => {
    try {
      assertWorkspaceMember(db, req.userId, req.params.workspaceId);
      const log = getActivityLog(db, req.params.workspaceId, {
        limit: req.query.limit,
        offset: req.query.offset,
      });
      res.json({ activity: log });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
