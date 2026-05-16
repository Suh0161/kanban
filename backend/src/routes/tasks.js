import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error.js';
import { sanitizeString } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import db from '../db.js';
import { assertWorkspaceMember } from '../services/workspaceService.js';
import { getColumnWorkspaceId } from '../services/columnService.js';
import {
  getTaskWorkspaceId,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
  batchMoveTasks,
  archiveTask,
  restoreTask,
  purgeArchivedTasks,
} from '../services/taskService.js';
import { logActivity } from '../services/activityService.js';
import { dispatchWebhook } from '../services/webhookService.js';
import { defineRoute, withPrefix } from '../openapi/route.js';
import { Task, Priority, SlugId, jsonContent } from '../openapi/schemas.js';

const router = withPrefix(Router(), '/tasks');
router.use(requireAuth);

const IdParam = z.object({ id: z.string() });

const CreateTaskBody = z.object({
  columnId: SlugId,
  title: z.string().min(1).max(500),
  priority: Priority.optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().max(10000).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});

const UpdateTaskBody = z.object({
  title: z.string().max(500).optional(),
  priority: Priority.optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().max(10000).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  labelIds: z.array(z.string()).optional(),
  sprintId: z.string().nullable().optional(),
});

const MoveTaskBody = z.object({
  targetColumnId: SlugId,
});

const BatchMoveBody = z.object({
  taskIds: z.array(z.string()),
  targetColumnId: SlugId,
});

const PurgeBody = z.object({
  workspaceId: SlugId,
});

const Ok = z.object({ ok: z.boolean() });
const SuccessFlag = z.object({ success: z.boolean() });

defineRoute(
  router,
  {
    method: 'post',
    path: '/',
    tag: 'Tasks',
    summary: 'Create task',
    body: CreateTaskBody,
    responses: { 201: { description: 'Task created', schema: Task } },
  },
  async (req, res, next) => {
    try {
      const { columnId, priority, tags, dueDate, assigneeId } = req.body;
      const title = sanitizeString(req.body.title, 500);
      const description = sanitizeString(req.body.description || '', 10000);

      const workspaceId = getColumnWorkspaceId(db, columnId);
      assertWorkspaceMember(db, req.userId, workspaceId);

      const task = createTask(db, { columnId, title, priority, tags, description, dueDate, assigneeId });

      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'TASK_CREATED',
        entityType: 'task',
        entityId: task.id,
        detail: JSON.stringify({ title: task.title }),
      });
      dispatchWebhook(workspaceId, 'task.created', {
        task: { id: task.id, title: task.title, priority: task.priority },
      });
      res.status(201).json(task);
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
    tag: 'Tasks',
    summary: 'Update task',
    params: IdParam,
    body: UpdateTaskBody,
    responses: { 200: { description: 'Updated', schema: Task } },
  },
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, priority, tags, description, dueDate, assigneeId, customFields, labelIds, sprintId } = req.body;

      const workspaceId = getTaskWorkspaceId(db, id);
      assertWorkspaceMember(db, req.userId, workspaceId);

      // Snapshot old values for diff
      const oldTask = db.prepare('SELECT title, priority, description, due_date, assignee_id, custom_fields FROM tasks WHERE id = ?').get(id);
      const oldTags = db.prepare('SELECT tag FROM task_tags WHERE task_id = ?').all(id).map(r => r.tag);

      const task = updateTask(db, id, {
        title: title !== undefined ? sanitizeString(title, 500) : undefined,
        priority,
        tags,
        description: description !== undefined ? sanitizeString(description, 10000) : undefined,
        dueDate,
        assigneeId,
        customFields,
        labelIds,
        sprintId,
      });

      // Compute field-level changes
      const changes = [];
      if (title !== undefined && title !== oldTask.title) {
        changes.push({ field: 'title', from: oldTask.title, to: title });
      }
      if (priority !== undefined && priority !== oldTask.priority) {
        changes.push({ field: 'priority', from: oldTask.priority, to: priority });
      }
      if (description !== undefined && description !== oldTask.description) {
        changes.push({ field: 'description', from: null, to: null }); // don't store full text
      }
      if (dueDate !== undefined && dueDate !== oldTask.due_date) {
        changes.push({ field: 'dueDate', from: oldTask.due_date || null, to: dueDate || null });
      }
      if (assigneeId !== undefined && assigneeId !== oldTask.assignee_id) {
        changes.push({ field: 'assignee', from: oldTask.assignee_id || null, to: assigneeId || null });
      }
      if (tags !== undefined) {
        const oldSorted = [...oldTags].sort().join(',');
        const newSorted = [...(tags || [])].sort().join(',');
        if (oldSorted !== newSorted) {
          changes.push({ field: 'tags', from: oldTags, to: tags });
        }
      }
      if (labelIds !== undefined) {
        changes.push({ field: 'labels', from: null, to: null });
      }
      if (customFields !== undefined) {
        // Compute per-field diffs for custom fields
        let oldCustom = {};
        try { oldCustom = JSON.parse(oldTask.custom_fields || '{}'); } catch (_e) { /* */ }
        const newCustom = customFields || {};
        const allKeys = new Set([...Object.keys(oldCustom), ...Object.keys(newCustom)]);
        for (const key of allKeys) {
          const oldVal = oldCustom[key];
          const newVal = newCustom[key];
          if (oldVal !== newVal) {
            changes.push({ field: `customField:${key}`, from: oldVal || null, to: newVal || null });
          }
        }
      }

      // Only log if something actually changed
      if (changes.length > 0) {
        logActivity(db, {
          userId: req.userId,
          workspaceId,
          event: 'TASK_UPDATED',
          entityType: 'task',
          entityId: id,
          detail: JSON.stringify({ title: task.title, changes }),
        });
      }

      dispatchWebhook(workspaceId, 'task.updated', {
        task: { id: task.id, title: task.title, priority: task.priority },
      });
      res.json(task);
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
    tag: 'Tasks',
    summary: 'Delete task',
    params: IdParam,
    responses: { 200: jsonContent(SuccessFlag, 'Deleted') },
  },
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const workspaceId = getTaskWorkspaceId(db, id);
      assertWorkspaceMember(db, req.userId, workspaceId);
      const taskToDelete = db.prepare('SELECT title FROM tasks WHERE id = ?').get(id);
      deleteTask(db, id);
      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'TASK_DELETED',
        entityType: 'task',
        entityId: id,
      });
      dispatchWebhook(workspaceId, 'task.deleted', { task: { id, title: taskToDelete?.title } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'patch',
    path: '/:id/move',
    tag: 'Tasks',
    summary: 'Move task',
    params: IdParam,
    body: MoveTaskBody,
    responses: { 200: { description: 'Moved', schema: Task } },
  },
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { targetColumnId } = req.body;

      const sourceWorkspaceId = getTaskWorkspaceId(db, id);
      const targetWorkspaceId = getColumnWorkspaceId(db, targetColumnId);
      assertWorkspaceMember(db, req.userId, sourceWorkspaceId);
      assertWorkspaceMember(db, req.userId, targetWorkspaceId);

      const { task, activityDetail } = moveTask(db, id, targetColumnId);

      logActivity(db, {
        userId: req.userId,
        workspaceId: sourceWorkspaceId,
        event: 'TASK_MOVED',
        entityType: 'task',
        entityId: id,
        detail: JSON.stringify(activityDetail),
      });
      dispatchWebhook(sourceWorkspaceId, 'task.moved', {
        task: { id: task.id, title: task.title, fromColumnId: id, toColumnId: targetColumnId },
      });
      res.json(task);
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'post',
    path: '/batch/move',
    tag: 'Tasks',
    summary: 'Batch move tasks',
    body: BatchMoveBody,
    responses: { 200: jsonContent(z.object({ moved: z.number() }), 'Batch moved') },
  },
  async (req, res, next) => {
    try {
      const { taskIds, targetColumnId } = req.body;
      const targetWorkspaceId = getColumnWorkspaceId(db, targetColumnId);
      assertWorkspaceMember(db, req.userId, targetWorkspaceId);

      for (const taskId of taskIds) {
        const wsId = getTaskWorkspaceId(db, taskId);
        if (wsId !== targetWorkspaceId) {
          throw new AppError('Task not found', 404, 'NOT_FOUND');
        }
      }

      const result = batchMoveTasks(db, { taskIds, targetColumnId });
      logActivity(db, {
        userId: req.userId,
        workspaceId: targetWorkspaceId,
        event: 'TASKS_BATCH_MOVED',
        entityType: 'task',
        entityId: targetColumnId,
        detail: JSON.stringify({ count: taskIds.length, taskIds }),
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'post',
    path: '/:id/archive',
    tag: 'Tasks',
    summary: 'Archive task',
    params: IdParam,
    responses: { 200: jsonContent(Ok, 'Archived') },
  },
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const workspaceId = getTaskWorkspaceId(db, id);
      assertWorkspaceMember(db, req.userId, workspaceId);
      const taskToArchive = db.prepare('SELECT title FROM tasks WHERE id = ?').get(id);
      archiveTask(db, id);
      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'TASK_ARCHIVED',
        entityType: 'task',
        entityId: id,
      });
      dispatchWebhook(workspaceId, 'task.archived', { task: { id, title: taskToArchive?.title } });
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
    path: '/:id/restore',
    tag: 'Tasks',
    summary: 'Restore task',
    params: IdParam,
    responses: { 200: jsonContent(Ok, 'Restored') },
  },
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const workspaceId = getTaskWorkspaceId(db, id);
      assertWorkspaceMember(db, req.userId, workspaceId);
      const taskToRestore = db.prepare('SELECT title FROM tasks WHERE id = ?').get(id);
      restoreTask(db, id);
      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'TASK_RESTORED',
        entityType: 'task',
        entityId: id,
      });
      dispatchWebhook(workspaceId, 'task.restored', { task: { id, title: taskToRestore?.title } });
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
    path: '/purge-archived',
    tag: 'Tasks',
    summary: 'Purge archived tasks older than 30 days',
    body: PurgeBody,
    responses: { 200: jsonContent(z.object({ purged: z.number() }), 'Purged') },
  },
  async (req, res, next) => {
    try {
      const { workspaceId } = req.body;
      assertWorkspaceMember(db, req.userId, workspaceId);
      const result = purgeArchivedTasks(db, workspaceId);
      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'TASKS_PURGED',
        entityType: 'task',
        entityId: workspaceId,
        detail: JSON.stringify({ purged: result.purged }),
      });
      res.json({ purged: result.purged });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
