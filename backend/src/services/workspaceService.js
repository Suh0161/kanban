import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/error.js';
import { getRequestContext } from '../requestContext.js';

/**
 * Role hierarchy (highest first):
 *   owner  -> can do everything, exactly one per workspace
 *   admin  -> manage settings, invites, integrations
 *   member -> create/edit tasks but cannot change workspace settings
 *   viewer -> read-only access
 */
export const ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
});

export const ROLE_RANK = Object.freeze({
  [ROLES.VIEWER]: 0,
  [ROLES.MEMBER]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.OWNER]: 3,
});

export const VALID_ROLES = Object.freeze(Object.values(ROLES));

export function getMemberRole(db, userId, workspaceId) {
  const row = db
    .prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(workspaceId, userId);
  return row?.role || null;
}

function assertApiKeyWorkspace(workspaceId) {
  const apiKey = getRequestContext().apiKey;
  if (!apiKey?.workspaceId) return;
  if (apiKey.workspaceId !== workspaceId) {
    throw new AppError('API key is not scoped to this workspace', 403, 'INSUFFICIENT_SCOPE');
  }
}

export function assertWorkspaceMember(db, userId, workspaceId) {
  assertApiKeyWorkspace(workspaceId);
  const member = db
    .prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(workspaceId, userId);
  if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');
}

/**
 * Assert the user holds at least one of the required roles in the workspace.
 * Throws 403 if the user is not a member, or 403 if their role is not allowed.
 */
export function assertWorkspaceRole(db, userId, workspaceId, requiredRoles) {
  assertApiKeyWorkspace(workspaceId);
  const role = getMemberRole(db, userId, workspaceId);
  if (!role) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  const allowed = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  if (!allowed.includes(role)) {
    throw new AppError(
      `This action requires one of: ${allowed.join(', ')}`,
      403,
      'INSUFFICIENT_ROLE'
    );
  }
  return role;
}

/** Convenience: requires owner OR admin. Returns the actual role. */
export function assertCanManageWorkspace(db, userId, workspaceId) {
  return assertWorkspaceRole(db, userId, workspaceId, [ROLES.OWNER, ROLES.ADMIN]);
}

/** Convenience: requires owner. Returns the actual role. */
export function assertIsOwner(db, userId, workspaceId) {
  return assertWorkspaceRole(db, userId, workspaceId, [ROLES.OWNER]);
}

/** Convenience: requires write access (owner/admin/member). Viewers blocked. */
export function assertCanEdit(db, userId, workspaceId) {
  return assertWorkspaceRole(db, userId, workspaceId, [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER]);
}

export function getWorkspacesForUser(db, userId) {
  const apiKey = getRequestContext().apiKey;
  const rows = db.prepare(`
    SELECT w.id, w.name, w.description, w.custom_fields, w.labels, w.code_prefix,
           w.logo, w.background, w.created_at,
           wm.role AS my_role,
           (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) AS members
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = ?
      AND (? IS NULL OR w.id = ?)
    ORDER BY w.created_at DESC
  `).all(userId, apiKey?.workspaceId || null, apiKey?.workspaceId || null);

  return rows.map(row => {
    let customFields = [];
    let labels = [];
    try { customFields = JSON.parse(row.custom_fields || '[]'); } catch (_e) { /* */ }
    try { labels = JSON.parse(row.labels || '[]'); } catch (_e) { /* */ }
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      members: row.members,
      customFields,
      labels,
      codePrefix: row.code_prefix || 'SKY',
      logo: row.logo || null,
      background: row.background || null,
      myRole: row.my_role,
      created_at: row.created_at,
    };
  });
}

export function createWorkspace(db, userId, { name }) {
  if (!name) throw new AppError('Name is required', 400, 'VALIDATION_ERROR');

  const workspaceId =
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + uuidv4().slice(0, 4);

  const insertWorkspace = db.prepare(`
    INSERT INTO workspaces (id, name) VALUES (?, ?)
  `);
  const insertMember = db.prepare(`
    INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)
  `);
  const insertColumn = db.prepare(`
    INSERT INTO columns (id, workspace_id, title, position) VALUES (?, ?, ?, ?)
  `);

  db.transaction(() => {
    insertWorkspace.run(workspaceId, name);
    insertMember.run(workspaceId, userId, 'owner');

    const defaultColumns = ['To Do', 'In Progress', 'Done'];
    defaultColumns.forEach((title, index) => {
      insertColumn.run(`col-${uuidv4()}`, workspaceId, title, index);
    });
  })();

  return db.prepare(`
    SELECT id, name, created_at,
           (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ?) AS members
    FROM workspaces
    WHERE id = ?
  `).get(workspaceId, workspaceId);
}

export function updateWorkspace(db, workspaceId, updates, userId = null) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    if (!updates.name) throw new AppError('Name is required', 400, 'VALIDATION_ERROR');
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description || '');
  }

  if (updates.customFields !== undefined) {
    fields.push('custom_fields = ?');
    values.push(JSON.stringify(updates.customFields));
  }

  if (updates.labels !== undefined) {
    fields.push('labels = ?');
    values.push(JSON.stringify(updates.labels));
  }

  if (updates.codePrefix !== undefined) {
    const prefix = (updates.codePrefix || 'SKY').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    fields.push('code_prefix = ?');
    values.push(prefix);
  }

  // Branding pointers. Pass `null` to clear back to defaults; pass a URL
  // (storage pointer or external) to set. Background also accepts CSS
  // colors like `#0a0a0a`.
  if (updates.logo !== undefined) {
    fields.push('logo = ?');
    values.push(updates.logo || null);
  }
  if (updates.background !== undefined) {
    fields.push('background = ?');
    values.push(updates.background || null);
  }

  if (fields.length > 0) {
    values.push(workspaceId);
    db.prepare(`UPDATE workspaces SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  // Pull the row back with the caller's role joined in, so the response
  // matches the shape `getWorkspacesForUser` returns. Without this, the
  // frontend would see `myRole === undefined`, fall back to 'member', and
  // mid-session lose access to manager-only sections after a save.
  const result = db.prepare(`
    SELECT w.id, w.name, w.description, w.custom_fields, w.labels, w.code_prefix,
           w.logo, w.background, w.created_at,
           wm.role AS my_role,
           (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) AS members
    FROM workspaces w
    LEFT JOIN workspace_members wm
      ON wm.workspace_id = w.id AND wm.user_id = ?
    WHERE w.id = ?
  `).get(userId, workspaceId);

  try {
    result.customFields = JSON.parse(result.custom_fields || '[]');
  } catch (_e) {
    result.customFields = [];
  }
  try {
    result.labels = JSON.parse(result.labels || '[]');
  } catch (_e) {
    result.labels = [];
  }
  result.codePrefix = result.code_prefix || 'SKY';
  result.description = result.description || '';
  result.logo = result.logo || null;
  result.background = result.background || null;
  result.myRole = result.my_role || null;
  delete result.custom_fields;
  delete result.code_prefix;
  delete result.my_role;

  return result;
}

export function deleteWorkspace(db, workspaceId) {
  const result = db.prepare('DELETE FROM workspaces WHERE id = ?').run(workspaceId);
  if (result.changes === 0) throw new AppError('Workspace not found', 404, 'NOT_FOUND');
}

export function getMembers(db, workspaceId) {
  return db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar, wm.role
    FROM workspace_members wm
    JOIN users u ON wm.user_id = u.id
    WHERE wm.workspace_id = ?
    ORDER BY wm.role = 'owner' DESC, u.name ASC
  `).all(workspaceId);
}

export function addMemberByEmail(db, workspaceId, email, role = 'member') {
  if (!VALID_ROLES.includes(role) || role === ROLES.OWNER) {
    throw new AppError('Invalid role', 400, 'VALIDATION_ERROR');
  }
  const user = db.prepare('SELECT id, name, email, avatar FROM users WHERE email = ?').get(email);
  if (!user) {
    const err = new Error('No user with that email exists');
    err.status = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  const existing = db.prepare(
    'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, user.id);
  if (existing) {
    const err = new Error('User is already a member');
    err.status = 409;
    err.code = 'ALREADY_MEMBER';
    throw err;
  }
  db.prepare(
    'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)'
  ).run(workspaceId, user.id, role);
  return { ...user, role };
}

function assertInviteRole(role) {
  if (!VALID_ROLES.includes(role) || role === ROLES.OWNER) {
    throw new AppError('Invalid role', 400, 'VALIDATION_ERROR');
  }
}

function mapInviteRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    inviteeUserId: row.invitee_user_id,
    inviteeName: row.invitee_name,
    inviteeEmail: row.invitee_email,
    inviteeAvatar: row.invitee_avatar,
    invitedByUserId: row.invited_by_user_id,
    invitedByName: row.invited_by_name,
    invitedByEmail: row.invited_by_email,
    invitedByAvatar: row.invited_by_avatar,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

const INVITE_SELECT = `
  SELECT wi.*,
         w.name AS workspace_name,
         invitee.name AS invitee_name,
         invitee.email AS invitee_email,
         invitee.avatar AS invitee_avatar,
         inviter.name AS invited_by_name,
         inviter.email AS invited_by_email,
         inviter.avatar AS invited_by_avatar
  FROM workspace_invites wi
  JOIN workspaces w ON w.id = wi.workspace_id
  JOIN users invitee ON invitee.id = wi.invitee_user_id
  JOIN users inviter ON inviter.id = wi.invited_by_user_id
`;

export function createWorkspaceInviteByEmail(db, workspaceId, email, role = 'member', invitedByUserId) {
  assertInviteRole(role);
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = db.prepare('SELECT id, name, email, avatar FROM users WHERE email = ?').get(normalizedEmail);
  if (!user) {
    throw new AppError('No user with that email exists', 404, 'USER_NOT_FOUND');
  }
  if (user.id === invitedByUserId) {
    throw new AppError('You are already a member of this workspace', 409, 'ALREADY_MEMBER');
  }
  const existing = db.prepare(
    'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, user.id);
  if (existing) {
    throw new AppError('User is already a member', 409, 'ALREADY_MEMBER');
  }
  const pending = db.prepare(
    `SELECT 1 FROM workspace_invites
     WHERE workspace_id = ? AND invitee_user_id = ? AND status = 'pending'`
  ).get(workspaceId, user.id);
  if (pending) {
    throw new AppError('An invite is already pending for this user', 409, 'INVITE_PENDING');
  }

  const inviteId = `invite-${uuidv4()}`;
  db.prepare(
    `INSERT INTO workspace_invites (id, workspace_id, invitee_user_id, invited_by_user_id, role)
     VALUES (?, ?, ?, ?, ?)`
  ).run(inviteId, workspaceId, user.id, invitedByUserId, role);
  return getWorkspaceInviteById(db, inviteId);
}

export function getWorkspaceInviteById(db, inviteId) {
  return mapInviteRow(db.prepare(`${INVITE_SELECT} WHERE wi.id = ?`).get(inviteId));
}

export function getWorkspaceInvites(db, workspaceId, { status = 'pending' } = {}) {
  return db
    .prepare(`${INVITE_SELECT} WHERE wi.workspace_id = ? AND wi.status = ? ORDER BY wi.created_at DESC`)
    .all(workspaceId, status)
    .map(mapInviteRow);
}

export function getInvitesForUser(db, userId, { status = 'pending' } = {}) {
  return db
    .prepare(`${INVITE_SELECT} WHERE wi.invitee_user_id = ? AND wi.status = ? ORDER BY wi.created_at DESC`)
    .all(userId, status)
    .map(mapInviteRow);
}

export function cancelWorkspaceInvite(db, workspaceId, inviteId) {
  const invite = db.prepare(
    `SELECT status FROM workspace_invites WHERE id = ? AND workspace_id = ?`
  ).get(inviteId, workspaceId);
  if (!invite || invite.status !== 'pending') {
    throw new AppError('Pending invite not found', 404, 'NOT_FOUND');
  }
  db.prepare(
    `UPDATE workspace_invites
     SET status = 'cancelled', responded_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`
  ).run(inviteId);
  return { success: true };
}

export function acceptWorkspaceInvite(db, inviteId, userId) {
  const invite = db.prepare(
    `SELECT * FROM workspace_invites
     WHERE id = ? AND invitee_user_id = ? AND status = 'pending'`
  ).get(inviteId, userId);
  if (!invite) {
    throw new AppError('Pending invite not found', 404, 'NOT_FOUND');
  }

  db.transaction(() => {
    db.prepare(
      `UPDATE workspace_invites
       SET status = 'accepted', responded_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?`
    ).run(inviteId);
    db.prepare(
      `INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role)
       VALUES (?, ?, ?)`
    ).run(invite.workspace_id, userId, invite.role);
  })();

  return getWorkspaceInviteById(db, inviteId);
}

export function rejectWorkspaceInvite(db, inviteId, userId) {
  const invite = db.prepare(
    `SELECT * FROM workspace_invites
     WHERE id = ? AND invitee_user_id = ? AND status = 'pending'`
  ).get(inviteId, userId);
  if (!invite) {
    throw new AppError('Pending invite not found', 404, 'NOT_FOUND');
  }
  db.prepare(
    `UPDATE workspace_invites
     SET status = 'rejected', responded_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`
  ).run(inviteId);
  return getWorkspaceInviteById(db, inviteId);
}

export function removeMember(db, workspaceId, userId) {
  const target = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, userId);
  if (!target) {
    const err = new Error('Member not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (target.role === ROLES.OWNER) {
    throw new AppError(
      'The workspace owner cannot be removed. Transfer ownership first.',
      403,
      'OWNER_PROTECTED'
    );
  }
  db.prepare(
    'DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).run(workspaceId, userId);
  return { success: true };
}

export function updateMemberRole(db, workspaceId, userId, role) {
  if (!VALID_ROLES.includes(role)) {
    throw new AppError('Invalid role', 400, 'VALIDATION_ERROR');
  }
  if (role === ROLES.OWNER) {
    throw new AppError(
      'Use transfer ownership to assign the owner role',
      400,
      'USE_TRANSFER_OWNERSHIP'
    );
  }
  const target = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, userId);
  if (!target) {
    const err = new Error('Member not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (target.role === ROLES.OWNER) {
    throw new AppError(
      'The owner role can only be changed via transfer ownership',
      403,
      'OWNER_PROTECTED'
    );
  }
  db.prepare(
    'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?'
  ).run(role, workspaceId, userId);
  return { success: true, role };
}

/**
 * Move ownership from the current owner to another existing member.
 * Old owner becomes admin. Atomic.
 */
export function transferOwnership(db, workspaceId, currentOwnerId, newOwnerId) {
  if (currentOwnerId === newOwnerId) {
    throw new AppError('Cannot transfer ownership to yourself', 400, 'VALIDATION_ERROR');
  }
  const currentOwner = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, currentOwnerId);
  if (!currentOwner || currentOwner.role !== ROLES.OWNER) {
    throw new AppError('Only the current owner can transfer ownership', 403, 'FORBIDDEN');
  }
  const newOwner = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, newOwnerId);
  if (!newOwner) {
    throw new AppError('New owner must already be a workspace member', 404, 'NOT_FOUND');
  }

  db.transaction(() => {
    db.prepare(
      'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?'
    ).run(ROLES.ADMIN, workspaceId, currentOwnerId);
    db.prepare(
      'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?'
    ).run(ROLES.OWNER, workspaceId, newOwnerId);
  })();

  return { success: true };
}

/**
 * A non-owner can leave the workspace voluntarily.
 * Owner cannot leave; must transfer first.
 */
export function leaveWorkspace(db, workspaceId, userId) {
  const member = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, userId);
  if (!member) throw new AppError('Not a member', 404, 'NOT_FOUND');
  if (member.role === ROLES.OWNER) {
    throw new AppError(
      'Owners cannot leave. Transfer ownership first or delete the workspace.',
      403,
      'OWNER_PROTECTED'
    );
  }
  db.prepare(
    'DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).run(workspaceId, userId);
  return { success: true };
}
