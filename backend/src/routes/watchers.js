/**
 * Task watcher routes.
 *
 * `GET /tasks/:taskId/watchers` — list everyone watching the task.
 *   Read access is enough; we use `assertWorkspaceMember`.
 *
 * `POST /tasks/:taskId/watchers` — start watching as the calling user.
 *   Idempotent. Member-level access required (writes a row scoped to
 *   the caller).
 *
 * `DELETE /tasks/:taskId/watchers` — stop watching as the calling user.
 *   Idempotent. Same access level.
 */

import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { assertWorkspaceMember } from '../services/workspaceService.js';
import { getTaskWorkspaceId } from '../services/taskService.js';
import {
  listWatchers,
  watchTask,
  unwatchTask,
  isWatching,
} from '../services/watcherService.js';
import { defineRoute, withDefaultMiddleware } from '../openapi/route.js';
import { jsonContent } from '../openapi/schemas.js';

const router = withDefaultMiddleware(Router(), [requireAuth]);

const TaskIdParam = z.object({ taskId: z.string() });

const Watcher = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().nullable().optional(),
});

const WatchersResponse = z.object({
  watchers: z.array(Watcher),
  watching: z.boolean(),
});

defineRoute(
  router,
  {
    method: 'get',
    path: '/tasks/:taskId/watchers',
    tag: 'Watchers',
    summary: 'List task watchers',
    params: TaskIdParam,
    responses: { 200: jsonContent(WatchersResponse, 'Watcher list + caller status') },
  },
  (req, res, next) => {
    try {
      const { taskId } = req.params;
      const workspaceId = getTaskWorkspaceId(db, taskId);
      assertWorkspaceMember(db, req.userId, workspaceId);
      res.json({
        watchers: listWatchers(db, taskId),
        watching: isWatching(db, taskId, req.userId),
      });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'post',
    path: '/tasks/:taskId/watchers',
    tag: 'Watchers',
    summary: 'Watch task',
    description: 'Adds the calling user as a watcher. Idempotent.',
    params: TaskIdParam,
    responses: { 200: jsonContent(WatchersResponse, 'Updated watcher list') },
  },
  (req, res, next) => {
    try {
      const { taskId } = req.params;
      const workspaceId = getTaskWorkspaceId(db, taskId);
      assertWorkspaceMember(db, req.userId, workspaceId);
      watchTask(db, taskId, req.userId);
      res.json({
        watchers: listWatchers(db, taskId),
        watching: true,
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
    path: '/tasks/:taskId/watchers',
    tag: 'Watchers',
    summary: 'Unwatch task',
    description: 'Removes the calling user from watchers. Idempotent.',
    params: TaskIdParam,
    responses: { 200: jsonContent(WatchersResponse, 'Updated watcher list') },
  },
  (req, res, next) => {
    try {
      const { taskId } = req.params;
      const workspaceId = getTaskWorkspaceId(db, taskId);
      assertWorkspaceMember(db, req.userId, workspaceId);
      unwatchTask(db, taskId, req.userId);
      res.json({
        watchers: listWatchers(db, taskId),
        watching: false,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
