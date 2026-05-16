import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/error.js';

export function assertWorkspaceMember(db, userId, workspaceId) {
  const member = db
    .prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(workspaceId, userId);
  if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');
}

export function getWorkspacesForUser(db, userId) {
  const rows = db.prepare(`
    SELECT w.id, w.name, w.description, w.custom_fields, w.labels, w.code_prefix, w.created_at,
           (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) AS members
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = ?
    ORDER BY w.created_at DESC
  `).all(userId);

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

export function updateWorkspace(db, workspaceId, updates) {
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

  if (fields.length > 0) {
    values.push(workspaceId);
    db.prepare(`UPDATE workspaces SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  const result = db.prepare(`
    SELECT id, name, description, custom_fields, labels, code_prefix, created_at,
           (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ?) AS members
    FROM workspaces
    WHERE id = ?
  `).get(workspaceId, workspaceId);

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
  delete result.custom_fields;
  delete result.code_prefix;

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

export function removeMember(db, workspaceId, userId) {
  const result = db.prepare(
    'DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).run(workspaceId, userId);
  if (result.changes === 0) {
    const err = new Error('Member not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { success: true };
}

export function updateMemberRole(db, workspaceId, userId, role) {
  const result = db.prepare(
    'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?'
  ).run(role, workspaceId, userId);
  if (result.changes === 0) {
    const err = new Error('Member not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { success: true, role };
}
