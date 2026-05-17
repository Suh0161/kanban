import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error.js';
import { sanitizeString } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import db from '../db.js';
import { assertCanEdit } from '../services/workspaceService.js';
import { getTaskWorkspaceId } from '../services/taskService.js';
import { logActivity } from '../services/activityService.js';
import { dispatchWebhook } from '../services/webhookService.js';
import {
  createChecklist,
  deleteChecklist,
  addChecklistItem,
  toggleChecklistItem,
  updateChecklistItemCount,
  deleteChecklistItem,
} from '../services/checklistService.js';
import { defineRoute, withDefaultMiddleware } from '../openapi/route.js';
import { Checklist, ChecklistItem, jsonContent } from '../openapi/schemas.js';

const router = withDefaultMiddleware(Router(), [requireAuth]);

const TaskIdParam = z.object({ taskId: z.string() });
const IdParam = z.object({ id: z.string() });

const CreateChecklistBody = z.object({ title: z.string().min(1).max(200) });
const AddItemBody = z.object({ text: z.string().min(1).max(500), targetCount: z.number().int().min(1).optional() });
const ToggleItemBody = z.object({ done: z.boolean().optional(), currentCount: z.number().int().min(0).optional() });

function assertChecklistAccess(checklistId, userId) {
  const cl = db
    .prepare(
      `SELECT cl.id, cl.task_id, c.workspace_id
       FROM checklists cl
       JOIN tasks t ON cl.task_id = t.id
       JOIN columns c ON t.column_id = c.id
       WHERE cl.id = ?`
    )
    .get(checklistId);
  if (!cl) throw new AppError('Checklist not found', 404, 'NOT_FOUND');
  assertCanEdit(db, userId, cl.workspace_id);
  return cl;
}

function assertChecklistItemAccess(itemId, userId) {
  const item = db
    .prepare(
      `SELECT ci.id, c.workspace_id
       FROM checklist_items ci
       JOIN checklists cl ON ci.checklist_id = cl.id
       JOIN tasks t ON cl.task_id = t.id
       JOIN columns c ON t.column_id = c.id
       WHERE ci.id = ?`
    )
    .get(itemId);
  if (!item) throw new AppError('Checklist item not found', 404, 'NOT_FOUND');
  assertCanEdit(db, userId, item.workspace_id);
}

defineRoute(
  router,
  {
    method: 'post',
    path: '/tasks/:taskId/checklists',
    tag: 'Checklists',
    summary: 'Create checklist',
    params: TaskIdParam,
    body: CreateChecklistBody,
    responses: { 201: { description: 'Created', schema: Checklist } },
  },
  (req, res, next) => {
    try {
      const { taskId } = req.params;
      const workspaceId = getTaskWorkspaceId(db, taskId);
      assertCanEdit(db, req.userId, workspaceId);

      const title = sanitizeString(req.body.title, 200);
      const checklist = createChecklist(db, { taskId, title });

      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'CHECKLIST_ADDED',
        entityType: 'checklist',
        entityId: checklist.id,
        detail: JSON.stringify({ title }),
      });
      dispatchWebhook(workspaceId, 'checklist.created', {
        taskId,
        checklist: { id: checklist.id, title },
      });
      res.status(201).json(checklist);
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'delete',
    path: '/checklists/:id',
    tag: 'Checklists',
    summary: 'Delete checklist',
    params: IdParam,
    responses: { 200: jsonContent(z.object({ success: z.boolean() }), 'Deleted') },
  },
  (req, res, next) => {
    try {
      const { id: checklistId } = req.params;
      const cl = assertChecklistAccess(checklistId, req.userId);
      const clToDelete = db.prepare('SELECT title, task_id FROM checklists WHERE id = ?').get(checklistId);
      deleteChecklist(db, checklistId);
      logActivity(db, {
        userId: req.userId,
        workspaceId: cl.workspace_id,
        event: 'CHECKLIST_DELETED',
        entityType: 'checklist',
        entityId: checklistId,
      });
      dispatchWebhook(cl.workspace_id, 'checklist.deleted', {
        taskId: clToDelete?.task_id,
        checklist: { id: checklistId, title: clToDelete?.title },
      });
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
    path: '/checklists/:id/items',
    tag: 'Checklists',
    summary: 'Add checklist item',
    params: IdParam,
    body: AddItemBody,
    responses: { 201: { description: 'Item added', schema: ChecklistItem } },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      assertChecklistAccess(id, req.userId);
      const text = sanitizeString(req.body.text, 500);
      const targetCount = req.body.targetCount || 1;
      const item = addChecklistItem(db, { checklistId: id, text, targetCount });
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'patch',
    path: '/checklist-items/:id',
    tag: 'Checklists',
    summary: 'Update checklist item',
    params: IdParam,
    body: ToggleItemBody,
    responses: { 200: { description: 'Updated', schema: ChecklistItem } },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      assertChecklistItemAccess(id, req.userId);
      const { done, currentCount } = req.body;

      if (currentCount !== undefined) {
        res.json(updateChecklistItemCount(db, id, currentCount));
      } else if (done !== undefined) {
        res.json(toggleChecklistItem(db, id, done));
      } else {
        res.json({ error: 'Provide done or currentCount' });
      }
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'delete',
    path: '/checklist-items/:id',
    tag: 'Checklists',
    summary: 'Delete checklist item',
    params: IdParam,
    responses: { 200: jsonContent(z.object({ success: z.boolean() }), 'Deleted') },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      assertChecklistItemAccess(id, req.userId);
      deleteChecklistItem(db, id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
