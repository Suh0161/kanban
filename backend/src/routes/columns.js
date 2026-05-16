import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error.js';
import { sanitizeString } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import db from '../db.js';
import { assertWorkspaceMember } from '../services/workspaceService.js';
import { logActivity } from '../services/activityService.js';
import { dispatchWebhook } from '../services/webhookService.js';
import {
  getColumnWorkspaceId,
  createColumn,
  renameColumn,
  deleteColumn,
  reorderColumns,
  archiveColumn,
  restoreColumn,
} from '../services/columnService.js';
import { defineRoute, withPrefix } from '../openapi/route.js';
import { Column, SlugId, jsonContent } from '../openapi/schemas.js';

const router = withPrefix(Router(), '/columns');
router.use(requireAuth);

const IdParam = z.object({ id: z.string() });

const CreateColumnBody = z.object({
  workspaceId: SlugId,
  title: z.string().min(1).max(200),
});

const UpdateColumnBody = z.object({
  title: z.string().min(1).max(200),
});

const ReorderBody = z.object({
  workspaceId: SlugId,
  columnOrder: z.array(z.string()),
});

const Ok = z.object({ ok: z.boolean() });
const SuccessFlag = z.object({ success: z.boolean() });

defineRoute(
  router,
  {
    method: 'post',
    path: '/',
    tag: 'Columns',
    summary: 'Create column',
    body: CreateColumnBody,
    responses: { 201: { description: 'Column created', schema: Column } },
  },
  (req, res, next) => {
    try {
      const { workspaceId } = req.body;
      const title = sanitizeString(req.body.title, 200);
      assertWorkspaceMember(db, req.userId, workspaceId);
      const column = createColumn(db, { workspaceId, title });

      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'COLUMN_CREATED',
        entityType: 'column',
        entityId: column.id,
        detail: JSON.stringify({ title: column.title }),
      });
      dispatchWebhook(workspaceId, 'column.created', { column: { id: column.id, title: column.title } });
      res.status(201).json(column);
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'patch',
    path: '/:id',
    tag: 'Columns',
    summary: 'Rename column',
    params: IdParam,
    body: UpdateColumnBody,
    responses: { 200: { description: 'Updated', schema: Column } },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      const title = sanitizeString(req.body.title, 200);
      const workspaceId = getColumnWorkspaceId(db, id);
      assertWorkspaceMember(db, req.userId, workspaceId);
      const updated = renameColumn(db, id, title);
      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'COLUMN_RENAMED',
        entityType: 'column',
        entityId: id,
        detail: JSON.stringify({ title }),
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'delete',
    path: '/:id',
    tag: 'Columns',
    summary: 'Delete column',
    params: IdParam,
    responses: { 200: jsonContent(SuccessFlag, 'Deleted') },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      const workspaceId = getColumnWorkspaceId(db, id);
      assertWorkspaceMember(db, req.userId, workspaceId);
      const colToDelete = db.prepare('SELECT title FROM columns WHERE id = ?').get(id);
      deleteColumn(db, id);
      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'COLUMN_DELETED',
        entityType: 'column',
        entityId: id,
      });
      dispatchWebhook(workspaceId, 'column.deleted', { column: { id, title: colToDelete?.title } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'post',
    path: '/reorder',
    tag: 'Columns',
    summary: 'Reorder columns',
    body: ReorderBody,
    responses: { 200: jsonContent(SuccessFlag, 'Reordered') },
  },
  (req, res, next) => {
    try {
      const { columnOrder, workspaceId } = req.body;
      assertWorkspaceMember(db, req.userId, workspaceId);
      for (const columnId of columnOrder) {
        const colWorkspaceId = getColumnWorkspaceId(db, columnId);
        if (colWorkspaceId !== workspaceId) {
          throw new AppError('Column not found', 404, 'NOT_FOUND');
        }
      }
      reorderColumns(db, { columnOrder });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'post',
    path: '/archive/:id',
    tag: 'Columns',
    summary: 'Archive column',
    params: IdParam,
    responses: { 200: jsonContent(Ok, 'Archived') },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      const workspaceId = getColumnWorkspaceId(db, id);
      assertWorkspaceMember(db, req.userId, workspaceId);
      const colToArchive = db.prepare('SELECT title FROM columns WHERE id = ?').get(id);
      archiveColumn(db, id);
      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'COLUMN_ARCHIVED',
        entityType: 'column',
        entityId: id,
      });
      dispatchWebhook(workspaceId, 'column.archived', { column: { id, title: colToArchive?.title } });
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
    path: '/restore/:id',
    tag: 'Columns',
    summary: 'Restore column',
    params: IdParam,
    responses: { 200: jsonContent(Ok, 'Restored') },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      const workspaceId = getColumnWorkspaceId(db, id);
      assertWorkspaceMember(db, req.userId, workspaceId);
      const colToRestore = db.prepare('SELECT title FROM columns WHERE id = ?').get(id);
      restoreColumn(db, id);
      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'COLUMN_RESTORED',
        entityType: 'column',
        entityId: id,
      });
      dispatchWebhook(workspaceId, 'column.restored', { column: { id, title: colToRestore?.title } });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
