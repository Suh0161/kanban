import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { assertWorkspaceMember } from '../services/workspaceService.js';
import { getBoard } from '../services/boardService.js';
import { defineRoute, withPrefix } from '../openapi/route.js';
import { Task, Column } from '../openapi/schemas.js';
const router = withPrefix(Router(), '/board');
router.use(requireAuth);

const Params = z.object({ workspaceId: z.string() });

const Query = z.object({
  search: z.string().optional(),
  priority: z.string().optional(),
  tags: z.string().optional().openapi({ description: 'Comma-separated tags' }),
});

const BoardResponse = z.object({
  tasks: z.record(z.string(), Task),
  columns: z.record(z.string(), Column),
  columnOrder: z.array(z.string()),
});

defineRoute(
  router,
  {
    method: 'get',
    path: '/:workspaceId',
    tag: 'Board',
    summary: 'Get full board',
    description:
      'Returns the full board state for a workspace: all tasks, columns, and the column order.',
    params: Params,
    query: Query,
    responses: { 200: { description: 'Board state', schema: BoardResponse } },
  },
  (req, res, next) => {
    try {
      const { workspaceId } = req.params;
      assertWorkspaceMember(db, req.userId, workspaceId);
      const filters = {
        search: req.query.search,
        priority: req.query.priority,
        tags: req.query.tags ? req.query.tags.split(',') : undefined,
      };
      res.json(getBoard(db, workspaceId, filters, req.userId));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
