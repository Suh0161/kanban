import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error.js';
import { sanitizeString } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import db from '../db.js';
import { assertCanEdit } from '../services/workspaceService.js';
import { getTaskWorkspaceId } from '../services/taskService.js';
import { addComment } from '../services/commentService.js';
import { logActivity } from '../services/activityService.js';
import { dispatchWebhook } from '../services/webhookService.js';
import { defineRoute, withDefaultMiddleware } from '../openapi/route.js';
import { Comment } from '../openapi/schemas.js';

const router = withDefaultMiddleware(Router(), [requireAuth]);

const TaskIdParam = z.object({ taskId: z.string() });
const CommentBody = z.object({ text: z.string().min(1).max(5000) });

defineRoute(
  router,
  {
    method: 'post',
    path: '/tasks/:taskId/comments',
    tag: 'Comments',
    summary: 'Add comment',
    params: TaskIdParam,
    body: CommentBody,
    responses: { 201: { description: 'Comment added', schema: Comment } },
  },
  (req, res, next) => {
    try {
      const { taskId } = req.params;
      const workspaceId = getTaskWorkspaceId(db, taskId);
      assertCanEdit(db, req.userId, workspaceId);

      const text = sanitizeString(req.body.text, 5000);
      const user = db.prepare('SELECT id, name, avatar FROM users WHERE id = ?').get(req.userId);
      if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

      const comment = addComment(db, {
        taskId,
        authorName: user.name,
        authorAvatar: user.avatar,
        text,
      });

      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'COMMENT_ADDED',
        entityType: 'comment',
        entityId: comment.id,
        detail: JSON.stringify({ taskId }),
      });
      dispatchWebhook(workspaceId, 'comment.added', {
        taskId,
        comment: { id: comment.id, text: comment.text },
      });
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
