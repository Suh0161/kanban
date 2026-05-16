import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/error.js';

export function getColumnWorkspaceId(db, columnId) {
  const column = db.prepare('SELECT workspace_id FROM columns WHERE id = ?').get(columnId);
  if (!column) throw new AppError('Column not found', 404, 'NOT_FOUND');
  return column.workspace_id;
}

export function createColumn(db, { workspaceId, title }) {
  if (!title) throw new AppError('title is required', 400, 'VALIDATION_ERROR');

  const maxRow = db
    .prepare('SELECT MAX(position) as maxPos FROM columns WHERE workspace_id = ?')
    .get(workspaceId);
  const position = (maxRow?.maxPos ?? -1) + 1;
  const id = `col-${uuidv4()}`;

  db.prepare(
    'INSERT INTO columns (id, workspace_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, workspaceId, title, position);

  return db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
}

export function renameColumn(db, columnId, title) {
  if (!title) throw new AppError('title is required', 400, 'VALIDATION_ERROR');

  const existing = db.prepare('SELECT * FROM columns WHERE id = ?').get(columnId);
  if (!existing) throw new AppError('Column not found', 404, 'NOT_FOUND');

  db.prepare('UPDATE columns SET title = ? WHERE id = ?').run(title, columnId);
  return db.prepare('SELECT * FROM columns WHERE id = ?').get(columnId);
}

export function deleteColumn(db, columnId) {
  const existing = db.prepare('SELECT * FROM columns WHERE id = ?').get(columnId);
  if (!existing) throw new AppError('Column not found', 404, 'NOT_FOUND');

  db.prepare('DELETE FROM columns WHERE id = ?').run(columnId);
}

export function reorderColumns(db, { columnOrder }) {
  if (!Array.isArray(columnOrder) || columnOrder.length === 0) {
    throw new AppError('columnOrder must be a non-empty array', 400, 'VALIDATION_ERROR');
  }

  const update = db.prepare('UPDATE columns SET position = ? WHERE id = ?');
  db.transaction(() => {
    for (let i = 0; i < columnOrder.length; i++) {
      update.run(i, columnOrder[i]);
    }
  })();
}

export function archiveColumn(db, columnId) {
  const result = db
    .prepare("UPDATE columns SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL")
    .run(columnId);
  if (result.changes === 0) throw new AppError('Column not found', 404, 'NOT_FOUND');
}

export function restoreColumn(db, columnId) {
  const result = db
    .prepare('UPDATE columns SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL')
    .run(columnId);
  if (result.changes === 0) throw new AppError('Column not found', 404, 'NOT_FOUND');
}
