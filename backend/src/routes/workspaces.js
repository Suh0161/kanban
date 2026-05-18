import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { sanitizeString } from '../middleware/validate.js';
import { auditLog } from '../middleware/audit.js';
import {
  assertWorkspaceMember,
  assertCanManageWorkspace,
  assertIsOwner,
  getWorkspacesForUser,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getMembers,
  createWorkspaceInviteByEmail,
  getWorkspaceInvites,
  getInvitesForUser,
  cancelWorkspaceInvite,
  acceptWorkspaceInvite,
  rejectWorkspaceInvite,
  removeMember,
  updateMemberRole,
  transferOwnership,
  leaveWorkspace,
} from '../services/workspaceService.js';
import { logActivity } from '../services/activityService.js';
import { defineRoute, withPrefix } from '../openapi/route.js';
import { Workspace, WorkspaceMember, errorResponse, jsonContent } from '../openapi/schemas.js';

const router = withPrefix(Router(), '/workspaces');
router.use(requireAuth);

// ---------- Schemas ----------

const IdParam = z.object({ id: z.string() });

const CreateWorkspaceBody = z.object({
  name: z.string().min(1).max(100),
});

const LabelSchema = z.object({
  id: z.string(),
  name: z.string().max(100).optional(),
  color: z.string().max(32).optional(),
});

const UpdateWorkspaceBody = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  customFields: z.array(z.any()).optional(),
  labels: z.array(LabelSchema).optional(),
  codePrefix: z.string().min(1).max(10).optional(),
  // Logo: nullable string (URL pointer or external https URL).
  logo: z.string().max(2048).nullable().optional(),
  // Background: CSS color (`#rrggbb`, `rgb(...)`) or URL pointer. nullable
  // means "reset to default canvas color".
  background: z.string().max(2048).nullable().optional(),
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
      403: errorResponse('User session required'),
    },
  },
  (req, res, next) => {
    try {
      if (req.apiKeyId) {
        throw new AppError('User session required to create a workspace', 403, 'INSUFFICIENT_SCOPE');
      }

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
      if (req.body.labels !== undefined) updates.labels = req.body.labels;
      if (req.body.codePrefix !== undefined) updates.codePrefix = req.body.codePrefix;
      if (req.body.logo !== undefined) updates.logo = req.body.logo;
      if (req.body.background !== undefined) updates.background = req.body.background;

      assertCanManageWorkspace(db, req.userId, id);
      res.json(updateWorkspace(db, id, updates, req.userId));
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
      assertIsOwner(db, req.userId, id);
      deleteWorkspace(db, id);
      auditLog('WORKSPACE_DELETED', { workspaceId: id, userId: req.userId });
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
    responses: { 200: jsonContent(z.array(WorkspaceMember), 'Member list') },
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
  role: z.enum(['member', 'admin', 'viewer']).optional(),
});

const WorkspaceInvite = z.object({
  id: z.string(),
  workspaceId: z.string(),
  workspaceName: z.string().optional(),
  inviteeUserId: z.string(),
  inviteeName: z.string().optional(),
  inviteeEmail: z.string().email().optional(),
  inviteeAvatar: z.string().nullable().optional(),
  invitedByUserId: z.string(),
  invitedByName: z.string().optional(),
  invitedByEmail: z.string().email().optional(),
  invitedByAvatar: z.string().nullable().optional(),
  role: z.enum(['admin', 'member', 'viewer']),
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']),
  createdAt: z.string(),
  respondedAt: z.string().nullable().optional(),
});

const InviteIdParam = z.object({ inviteId: z.string() });
const WorkspaceInviteIdParam = z.object({ id: z.string(), inviteId: z.string() });

defineRoute(
  router,
  {
    method: 'get',
    path: '/invites',
    tag: 'Workspaces',
    summary: 'List pending workspace invites for current user',
    responses: { 200: jsonContent(z.object({ invites: z.array(WorkspaceInvite) }), 'Invite list') },
  },
  (req, res, next) => {
    try {
      res.json({ invites: getInvitesForUser(db, req.userId) });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'post',
    path: '/:id/members',
    tag: 'Workspaces',
    summary: 'Invite member by email',
    params: IdParam,
    body: AddMemberBody,
    responses: {
      201: jsonContent(WorkspaceInvite, 'Invite sent'),
      403: errorResponse('Insufficient role'),
      404: errorResponse('User not found'),
      409: errorResponse('Already a member or invite already pending'),
    },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      const { email, role } = req.body;
      assertCanManageWorkspace(db, req.userId, id);
      const invite = createWorkspaceInviteByEmail(db, id, email, role || 'member', req.userId);
      logActivity(db, {
        userId: req.userId,
        workspaceId: id,
        event: 'INVITE_SENT',
        entityType: 'workspace_invite',
        entityId: invite.id,
        detail: JSON.stringify({ email, role: role || 'member', inviteeUserId: invite.inviteeUserId }),
      });
      res.status(201).json(invite);
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'get',
    path: '/:id/invites',
    tag: 'Workspaces',
    summary: 'List pending workspace invites',
    params: IdParam,
    responses: {
      200: jsonContent(z.object({ invites: z.array(WorkspaceInvite) }), 'Invite list'),
      403: errorResponse('Insufficient role'),
    },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      assertCanManageWorkspace(db, req.userId, id);
      res.json({ invites: getWorkspaceInvites(db, id) });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'delete',
    path: '/:id/invites/:inviteId',
    tag: 'Workspaces',
    summary: 'Cancel pending workspace invite',
    params: WorkspaceInviteIdParam,
    responses: {
      200: jsonContent(z.object({ success: z.boolean() }), 'Invite cancelled'),
      403: errorResponse('Insufficient role'),
      404: errorResponse('Invite not found'),
    },
  },
  (req, res, next) => {
    try {
      const { id, inviteId } = req.params;
      assertCanManageWorkspace(db, req.userId, id);
      const result = cancelWorkspaceInvite(db, id, inviteId);
      logActivity(db, {
        userId: req.userId,
        workspaceId: id,
        event: 'INVITE_CANCELLED',
        entityType: 'workspace_invite',
        entityId: inviteId,
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
    path: '/invites/:inviteId/accept',
    tag: 'Workspaces',
    summary: 'Accept workspace invite',
    params: InviteIdParam,
    responses: {
      200: jsonContent(WorkspaceInvite, 'Invite accepted'),
      404: errorResponse('Invite not found'),
    },
  },
  (req, res, next) => {
    try {
      const invite = acceptWorkspaceInvite(db, req.params.inviteId, req.userId);
      logActivity(db, {
        userId: req.userId,
        workspaceId: invite.workspaceId,
        event: 'INVITE_ACCEPTED',
        entityType: 'workspace_invite',
        entityId: invite.id,
        detail: JSON.stringify({ role: invite.role }),
      });
      res.json(invite);
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'post',
    path: '/invites/:inviteId/reject',
    tag: 'Workspaces',
    summary: 'Reject workspace invite',
    params: InviteIdParam,
    responses: {
      200: jsonContent(WorkspaceInvite, 'Invite rejected'),
      404: errorResponse('Invite not found'),
    },
  },
  (req, res, next) => {
    try {
      const invite = rejectWorkspaceInvite(db, req.params.inviteId, req.userId);
      logActivity(db, {
        userId: req.userId,
        workspaceId: invite.workspaceId,
        event: 'INVITE_REJECTED',
        entityType: 'workspace_invite',
        entityId: invite.id,
        detail: JSON.stringify({ role: invite.role }),
      });
      res.json(invite);
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
    description: 'Owners and admins may remove other members. Any member may remove themselves (leave). The owner cannot be removed without transferring ownership first.',
    params: z.object({ id: z.string(), userId: z.string() }),
    responses: {
      200: jsonContent(z.object({ success: z.boolean() }), 'Member removed'),
      403: errorResponse('Insufficient role'),
    },
  },
  (req, res, next) => {
    try {
      const { id, userId } = req.params;
      // Self-leave is allowed for any member; otherwise must be owner/admin.
      if (userId === req.userId) {
        leaveWorkspace(db, id, req.userId);
      } else {
        assertCanManageWorkspace(db, req.userId, id);
        removeMember(db, id, userId);
      }
      logActivity(db, {
        userId: req.userId,
        workspaceId: id,
        event: 'MEMBER_REMOVED',
        entityType: 'workspace',
        entityId: id,
        detail: JSON.stringify({ userId, self: userId === req.userId }),
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
    description: 'Owners may set member/admin/viewer. Admins may also set roles, but cannot promote to or change the owner.',
    params: z.object({ id: z.string(), userId: z.string() }),
    body: z.object({ role: z.enum(['member', 'admin', 'viewer']) }),
    responses: {
      200: jsonContent(z.object({ success: z.boolean(), role: z.string() }), 'Role updated'),
      403: errorResponse('Insufficient role'),
    },
  },
  (req, res, next) => {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;
      assertCanManageWorkspace(db, req.userId, id);
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

defineRoute(
  router,
  {
    method: 'post',
    path: '/:id/transfer-ownership',
    tag: 'Workspaces',
    summary: 'Transfer ownership',
    description: 'Move the owner role to another existing member. The current owner becomes admin.',
    params: IdParam,
    body: z.object({ newOwnerId: z.string() }),
    responses: {
      200: jsonContent(z.object({ success: z.boolean() }), 'Ownership transferred'),
      400: errorResponse('Validation error'),
      403: errorResponse('Only the owner can transfer ownership'),
      404: errorResponse('New owner is not a member'),
    },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;
      const { newOwnerId } = req.body;
      // assertIsOwner runs inside transferOwnership but we double-check for clarity.
      assertIsOwner(db, req.userId, id);
      transferOwnership(db, id, req.userId, newOwnerId);
      logActivity(db, {
        userId: req.userId,
        workspaceId: id,
        event: 'OWNERSHIP_TRANSFERRED',
        entityType: 'workspace',
        entityId: id,
        detail: JSON.stringify({ from: req.userId, to: newOwnerId }),
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
