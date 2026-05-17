/**
 * Task watchers — minimal service to add/remove and list.
 *
 * "Watching" is a personal preference: the calling user can only toggle
 * their own watcher row. Anyone with read access to the workspace may
 * see who else is watching.
 *
 * Returned profiles are normalized so the frontend can render the same
 * way it renders members elsewhere ({ id, name, email, avatar }).
 */

import { AppError } from '../middleware/error.js';

export function listWatchers(db, taskId) {
  return db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar, w.created_at
    FROM task_watchers w
    JOIN users u ON u.id = w.user_id
    WHERE w.task_id = ?
    ORDER BY w.created_at ASC
  `).all(taskId);
}

export function isWatching(db, taskId, userId) {
  const row = db.prepare(
    'SELECT 1 FROM task_watchers WHERE task_id = ? AND user_id = ?'
  ).get(taskId, userId);
  return !!row;
}

export function watchTask(db, taskId, userId) {
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');
  // INSERT OR IGNORE keeps the operation idempotent — no error if
  // already watching.
  db.prepare(
    'INSERT OR IGNORE INTO task_watchers (task_id, user_id) VALUES (?, ?)'
  ).run(taskId, userId);
}

export function unwatchTask(db, taskId, userId) {
  db.prepare(
    'DELETE FROM task_watchers WHERE task_id = ? AND user_id = ?'
  ).run(taskId, userId);
}
