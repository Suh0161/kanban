import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { sanitizeString } from '../middleware/validate.js';
import { auditLog } from '../middleware/audit.js';
import {
  assertWorkspaceMember,
  getWorkspacesForUser,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getMembers,
  addMemberByEmail,
  removeMember,
  updateMemberRole,
} from '../services/workspaceService.js';
import { logActivity } from '../services/activityService.js';
import { defineRoute, withPrefix } from '../openapi/route.js';
import { Workspace, User, errorResponse, jsonContent } from '../openapi/schemas.js';

const router = withPrefix(Router(), '/workspaces');
router.use(requireAuth);

// ---------- Schemas ----------

const IdParam = z.object({ id: z.string() });

const CreateWorkspaceBody = z.object({
  name: z.string().min(1).max(100),
});

const UpdateWorkspaceBody = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  customFields: z.array(z.any()).optional(),
  codePrefix: z.string().min(1).max(10).optional(),
});

// ---------- Routes ----------

defineRoute(
  router,
  {
    method: 'get',
    path: '/',
    tag: 'Workspaces',
    summary: 'List workspaces',
    description: 'List all workspaces the authenticated user is a member of.',
    responses: { 200: jsonContent(z.array(Workspace), 'Workspace list') },
  },
  (req, res, next) => {
    try {
      res.json(getWorkspacesForUser(db, req.userId));
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'post',
    path: '/',
    tag: 'Workspaces',
    summary: 'Create workspace',
    body: CreateWorkspaceBody,
    responses: {
      201: { description: 'Created', schema: Workspace },
      400: errorResponse('Validation error'),
    },
  },
  (req, res, next) => {
    try {
      const name = sanitizeString(req.body.name, 100);
      if (!name) throw new AppError('Name is required', 400, 'VALIDATION_ERROR');

      const workspace = createWorkspace(db, req.userId, { name });
      auditLog('WORKSPACE_CREATED', { workspaceId: workspace.id, userId: req.userId });
      logActivity(db, {
        userId: req.userId,
        workspaceId: workspace.id,
        event: 'WORKSPACE_CREATED',
        entityType: 'workspace',
        entityId: workspace.id,
        detail: JSON.stringify({ name: workspace.name }),
      });
      res.status(201).json(workspace);
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
    tag: 'Workspaces',
    summary: 'Update workspace',
    params: IdParam,
    body: UpdateWorkspaceBody,
    responses: {
      200: { description: 'Updated', schema: Workspace },
      403: errorResponse('Not a workspace member'),
    },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = {};
      if (req.body.name !== undefined) updates.name = sanitizeString(req.body.name, 100);
      if (req.body.description !== undefined) updates.description = sanitizeString(req.body.description, 500);
      if (req.body.customFields !== undefined) updates.customFields = req.body.customFields;
      if (req.body.codePrefix !== undefined) updates.codePrefix = req.body.codePrefix;

      assertWorkspaceMember(db, req.userId, id);
      res.json(updateWorkspace(db, id, updates));
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
    tag: 'Workspaces',
    summary: 'Delete workspace',
    params: IdParam,
    responses: {
      200: jsonContent(z.object({ success: z.boolean() }), 'Deleted'),
      403: errorResponse('Not a workspace member'),
    },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      assertWorkspaceMember(db, req.userId, id);
      deleteWorkspace(db, id);
      auditLog('WORKSPACE_DELETED', { workspaceId: id, userId: req.userId });
      logActivity(db, {
        userId: req.userId,
        workspaceId: id,
        event: 'WORKSPACE_DELETED',
        entityType: 'workspace',
        entityId: id,
        detail: JSON.stringify({ name: id }),
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
    method: 'get',
    path: '/:id/members',
    tag: 'Workspaces',
    summary: 'List members',
    params: IdParam,
    responses: { 200: jsonContent(z.array(User), 'Member list') },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      assertWorkspaceMember(db, req.userId, id);
      res.json(getMembers(db, id));
    } catch (err) {
      next(err);
    }
  }
);

const AddMemberBody = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'admin']).optional(),
});

defineRoute(
  router,
  {
    method: 'post',
    path: '/:id/members',
    tag: 'Workspaces',
    summary: 'Add member by email',
    params: IdParam,
    body: AddMemberBody,
    responses: {
      201: jsonContent(User, 'Member added'),
      404: errorResponse('User not found'),
      409: errorResponse('Already a member'),
    },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      const { email, role } = req.body;
      assertWorkspaceMember(db, req.userId, id);
      const member = addMemberByEmail(db, id, email, role || 'member');
      logActivity(db, {
        userId: req.userId,
        workspaceId: id,
        event: 'MEMBER_ADDED',
        entityType: 'workspace',
        entityId: id,
        detail: JSON.stringify({ email, role: role || 'member' }),
      });
      res.status(201).json(member);
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'delete',
    path: '/:id/members/:userId',
    tag: 'Workspaces',
    summary: 'Remove member',
    params: z.object({ id: z.string(), userId: z.string() }),
    responses: {
      200: jsonContent(z.object({ success: z.boolean() }), 'Member removed'),
    },
  },
  (req, res, next) => {
    try {
      const { id, userId } = req.params;
      assertWorkspaceMember(db, req.userId, id);
      removeMember(db, id, userId);
      logActivity(db, {
        userId: req.userId,
        workspaceId: id,
        event: 'MEMBER_REMOVED',
        entityType: 'workspace',
        entityId: id,
        detail: JSON.stringify({ userId }),
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
    method: 'patch',
    path: '/:id/members/:userId',
    tag: 'Workspaces',
    summary: 'Update member role',
    params: z.object({ id: z.string(), userId: z.string() }),
    body: z.object({ role: z.enum(['member', 'admin']) }),
    responses: {
      200: jsonContent(z.object({ success: z.boolean(), role: z.string() }), 'Role updated'),
    },
  },
  (req, res, next) => {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;
      assertWorkspaceMember(db, req.userId, id);
      const result = updateMemberRole(db, id, userId, role);
      logActivity(db, {
        userId: req.userId,
        workspaceId: id,
        event: 'MEMBER_ROLE_UPDATED',
        entityType: 'workspace',
        entityId: id,
        detail: JSON.stringify({ userId, role }),
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
