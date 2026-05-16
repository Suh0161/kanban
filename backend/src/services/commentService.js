import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/error.js';

export function addComment(db, { taskId, authorName, authorAvatar, text }) {
  if (!text) throw new AppError('text is required', 400, 'VALIDATION_ERROR');

  const commentId = `c-${uuidv4()}`;
  db.prepare(
    'INSERT INTO comments (id, task_id, text, author_name, author_avatar) VALUES (?, ?, ?, ?, ?)'
  ).run(commentId, taskId, text, authorName, authorAvatar || null);

  return db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
}
