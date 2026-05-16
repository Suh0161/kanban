import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/error.js';

export function createChecklist(db, { taskId, title }) {
  if (!title) throw new AppError('title is required', 400, 'VALIDATION_ERROR');

  const checklistId = `cl-${uuidv4()}`;
  db.prepare('INSERT INTO checklists (id, task_id, title) VALUES (?, ?, ?)').run(
    checklistId,
    taskId,
    title
  );

  const checklist = db.prepare('SELECT * FROM checklists WHERE id = ?').get(checklistId);
  return { ...checklist, items: [] };
}

export function deleteChecklist(db, checklistId) {
  db.prepare('DELETE FROM checklist_items WHERE checklist_id = ?').run(checklistId);
  const result = db.prepare('DELETE FROM checklists WHERE id = ?').run(checklistId);
  if (result.changes === 0) throw new AppError('Checklist not found', 404, 'NOT_FOUND');
}

export function addChecklistItem(db, { checklistId, text, targetCount = 1 }) {
  if (!text) throw new AppError('text is required', 400, 'VALIDATION_ERROR');

  const itemId = `ci-${uuidv4()}`;
  const count = Math.max(1, Math.floor(targetCount));

  db.prepare(
    'INSERT INTO checklist_items (id, checklist_id, text, done, target_count, current_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(itemId, checklistId, text, 0, count, 0);

  const item = db.prepare('SELECT id, text, done, target_count, current_count FROM checklist_items WHERE id = ?').get(itemId);
  return formatItem(item);
}

export function toggleChecklistItem(db, itemId, done) {
  const item = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(itemId);
  if (!item) throw new AppError('Checklist item not found', 404, 'NOT_FOUND');

  // For counter items (target > 1), toggling "done" sets current to target or 0
  if (item.target_count > 1) {
    const newCount = done ? item.target_count : 0;
    db.prepare('UPDATE checklist_items SET done = ?, current_count = ? WHERE id = ?')
      .run(done ? 1 : 0, newCount, itemId);
  } else {
    db.prepare('UPDATE checklist_items SET done = ?, current_count = ? WHERE id = ?')
      .run(done ? 1 : 0, done ? 1 : 0, itemId);
  }

  const updated = db.prepare('SELECT id, text, done, target_count, current_count FROM checklist_items WHERE id = ?').get(itemId);
  return formatItem(updated);
}

export function updateChecklistItemCount(db, itemId, currentCount) {
  const item = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(itemId);
  if (!item) throw new AppError('Checklist item not found', 404, 'NOT_FOUND');

  const clamped = Math.max(0, Math.min(currentCount, item.target_count));
  const done = clamped >= item.target_count ? 1 : 0;

  db.prepare('UPDATE checklist_items SET current_count = ?, done = ? WHERE id = ?')
    .run(clamped, done, itemId);

  const updated = db.prepare('SELECT id, text, done, target_count, current_count FROM checklist_items WHERE id = ?').get(itemId);
  return formatItem(updated);
}

function formatItem(row) {
  return {
    id: row.id,
    text: row.text,
    done: Boolean(row.done),
    targetCount: row.target_count,
    currentCount: row.current_count,
  };
}

export function deleteChecklistItem(db, itemId) {
  const result = db.prepare('DELETE FROM checklist_items WHERE id = ?').run(itemId);
  if (result.changes === 0) throw new AppError('Checklist item not found', 404, 'NOT_FOUND');
}
