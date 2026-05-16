import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/error.js';

function buildTaskResponse(taskRow, tags = [], comments = [], attachments = [], checklists = []) {
  let labelIds = [];
  try {
    if (taskRow.label_ids) labelIds = JSON.parse(taskRow.label_ids);
  } catch (_e) {
    labelIds = [];
  }
  return {
    id: taskRow.id,
    title: taskRow.title,
    priority: taskRow.priority,
    tags,
    labelIds,
    metrics: {
      comments: comments.length,
      attachments: attachments.length,
    },
    code: taskRow.code,
    description: taskRow.description,
    assigneeId: taskRow.assignee_id,
    assigneeName: taskRow.assignee_name,
    assigneeImg: taskRow.assignee_img,
    comments,
    attachments,
    checklists,
    dueDate: taskRow.due_date,
    sprintId: taskRow.sprint_id || null,
  };
}

function fetchTaskExtras(db, taskId) {
  const tags = db
    .prepare('SELECT tag FROM task_tags WHERE task_id = ?')
    .all(taskId)
    .map((r) => r.tag);

  const comments = db
    .prepare(
      `SELECT id, text, author_name as author, author_avatar as avatar, created_at as time
       FROM comments WHERE task_id = ? ORDER BY created_at`
    )
    .all(taskId);

  const attachments = db
    .prepare('SELECT id, type, url, name FROM attachments WHERE task_id = ?')
    .all(taskId);

  const checklists = db
    .prepare('SELECT * FROM checklists WHERE task_id = ?')
    .all(taskId);
  const checklistIds = checklists.map((c) => c.id);
  let checklistItems = [];
  if (checklistIds.length > 0) {
    const placeholders = checklistIds.map(() => '?').join(',');
    checklistItems = db
      .prepare(`SELECT * FROM checklist_items WHERE checklist_id IN (${placeholders})`)
      .all(...checklistIds);
  }

  const itemsByChecklist = {};
  for (const item of checklistItems) {
    if (!itemsByChecklist[item.checklist_id])
      itemsByChecklist[item.checklist_id] = [];
    itemsByChecklist[item.checklist_id].push({
      id: item.id,
      text: item.text,
      done: !!item.done,
      targetCount: item.target_count || 1,
      currentCount: item.current_count || 0,
    });
  }

  const taskChecklists = checklists.map((c) => ({
    id: c.id,
    title: c.title,
    items: itemsByChecklist[c.id] || [],
  }));

  return { tags, comments, attachments, checklists: taskChecklists };
}

function getWorkspaceIdByColumnId(db, columnId) {
  const column = db.prepare('SELECT workspace_id FROM columns WHERE id = ?').get(columnId);
  if (!column) throw new AppError('Column not found', 404, 'NOT_FOUND');
  return column.workspace_id;
}

export function getTaskWorkspaceId(db, taskId) {
  const task = db.prepare('SELECT column_id FROM tasks WHERE id = ?').get(taskId);
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');
  return getWorkspaceIdByColumnId(db, task.column_id);
}

export function createTask(db, { columnId, title, priority, tags, description, dueDate, assigneeId }) {
  const maxRow = db
    .prepare('SELECT MAX(position) as maxPos FROM tasks WHERE column_id = ?')
    .get(columnId);
  const position = (maxRow?.maxPos ?? -1) + 1;
  const id = `task-${uuidv4()}`;

  // Get workspace prefix for issue code
  const workspace = db.prepare(
    `SELECT w.code_prefix FROM workspaces w
     JOIN columns c ON c.workspace_id = w.id
     WHERE c.id = ?`
  ).get(columnId);
  const prefix = workspace?.code_prefix || 'SKY';

  const maxCodeRow = db
    .prepare(`SELECT code FROM tasks WHERE code LIKE ? ORDER BY CAST(SUBSTR(code, LENGTH(?) + 2) AS INTEGER) DESC LIMIT 1`)
    .get(`${prefix}-%`, prefix);
  const nextNum = maxCodeRow ? parseInt(maxCodeRow.code.replace(`${prefix}-`, ''), 10) + 1 : 1000;
  const code = `${prefix}-${nextNum}`;

  db.prepare(
    `INSERT INTO tasks (id, column_id, title, priority, code, description, assignee_id, due_date, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, columnId, title, priority || 'Medium', code, description || '', assigneeId || null, dueDate || null, position);

  if (Array.isArray(tags) && tags.length > 0) {
    const insertTag = db.prepare('INSERT INTO task_tags (task_id, tag) VALUES (?, ?)');
    db.transaction(() => {
      for (const tag of tags) {
        insertTag.run(id, tag);
      }
    })();
  }

  const task = db
    .prepare(
      `SELECT t.*, u.name as assignee_name, u.avatar as assignee_img
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = ?`
    )
    .get(id);

  const { tags: taskTags } = fetchTaskExtras(db, id);
  return buildTaskResponse(task, taskTags, [], [], []);
}

export function updateTask(db, taskId, updates) {
  const { title, priority, tags, description, dueDate, assigneeId } = updates;

  const fields = [];
  const values = [];

  if (title !== undefined) {
    fields.push('title = ?');
    values.push(title);
  }
  if (priority !== undefined) {
    fields.push('priority = ?');
    values.push(priority);
  }
  if (description !== undefined) {
    fields.push('description = ?');
    values.push(description);
  }
  if (dueDate !== undefined) {
    fields.push('due_date = ?');
    values.push(dueDate);
  }
  if (assigneeId !== undefined) {
    fields.push('assignee_id = ?');
    values.push(assigneeId);
  }
  if (updates.customFields !== undefined) {
    fields.push('custom_fields = ?');
    values.push(JSON.stringify(updates.customFields));
  }
  if (updates.labelIds !== undefined) {
    fields.push('label_ids = ?');
    values.push(JSON.stringify(Array.isArray(updates.labelIds) ? updates.labelIds : []));
  }
  if (updates.sprintId !== undefined) {
    fields.push('sprint_id = ?');
    values.push(updates.sprintId || null);
  }

  if (fields.length > 0) {
    values.push(taskId);
    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  if (tags !== undefined) {
    db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId);
    if (Array.isArray(tags) && tags.length > 0) {
      const insertTag = db.prepare('INSERT INTO task_tags (task_id, tag) VALUES (?, ?)');
      db.transaction(() => {
        for (const tag of tags) {
          insertTag.run(taskId, tag);
        }
      })();
    }
  }

  const task = db
    .prepare(
      `SELECT t.*, u.name as assignee_name, u.avatar as assignee_img
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = ?`
    )
    .get(taskId);

  const { tags: taskTags, comments, attachments, checklists } = fetchTaskExtras(db, taskId);
  return buildTaskResponse(task, taskTags, comments, attachments, checklists);
}

export function deleteTask(db, taskId) {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  if (result.changes === 0) throw new AppError('Task not found', 404, 'NOT_FOUND');
}

export function moveTask(db, taskId, targetColumnId) {
  const task = db.prepare('SELECT title, column_id FROM tasks WHERE id = ?').get(taskId);
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

  const sourceColumn = db.prepare('SELECT title FROM columns WHERE id = ?').get(task.column_id);
  const targetColumn = db.prepare('SELECT title FROM columns WHERE id = ?').get(targetColumnId);

  const maxRow = db
    .prepare('SELECT MAX(position) as maxPos FROM tasks WHERE column_id = ?')
    .get(targetColumnId);
  const position = (maxRow?.maxPos ?? -1) + 1;

  db.prepare('UPDATE tasks SET column_id = ?, position = ? WHERE id = ?').run(
    targetColumnId,
    position,
    taskId
  );

  const updated = db
    .prepare(
      `SELECT t.*, u.name as assignee_name, u.avatar as assignee_img
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = ?`
    )
    .get(taskId);

  const { tags, comments, attachments, checklists } = fetchTaskExtras(db, taskId);
  
  return {
    task: buildTaskResponse(updated, tags, comments, attachments, checklists),
    activityDetail: {
      title: task.title,
      from: sourceColumn?.title || 'Unknown',
      to: targetColumn?.title || 'Unknown'
    }
  };
}

export function getTaskWithDetails(db, taskId) {
  const task = db
    .prepare(
      `SELECT t.*, u.name as assignee_name, u.avatar as assignee_img
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = ?`
    )
    .get(taskId);

  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

  const { tags, comments, attachments, checklists } = fetchTaskExtras(db, taskId);
  return buildTaskResponse(task, tags, comments, attachments, checklists);
}

export function batchMoveTasks(db, { taskIds, targetColumnId }) {
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    throw new AppError('taskIds must be a non-empty array', 400, 'VALIDATION_ERROR');
  }

  return db.transaction(() => {
    const maxRow = db
      .prepare('SELECT MAX(position) as maxPos FROM tasks WHERE column_id = ?')
      .get(targetColumnId);
    let position = (maxRow?.maxPos ?? -1) + 1;

    const updateStmt = db.prepare('UPDATE tasks SET column_id = ?, position = ? WHERE id = ?');

    for (const taskId of taskIds) {
      const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
      if (!task) throw new AppError(`Task not found: ${taskId}`, 404, 'NOT_FOUND');
      updateStmt.run(targetColumnId, position, taskId);
      position++;
    }

    return { moved: taskIds.length };
  })();
}

export function archiveTask(db, taskId) {
  const result = db
    .prepare("UPDATE tasks SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL")
    .run(taskId);
  if (result.changes === 0) throw new AppError('Task not found', 404, 'NOT_FOUND');
}

export function restoreTask(db, taskId) {
  const result = db
    .prepare('UPDATE tasks SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL')
    .run(taskId);
  if (result.changes === 0) throw new AppError('Task not found', 404, 'NOT_FOUND');
}

export function purgeArchivedTasks(db, workspaceId) {
  const count = db
    .prepare(
      `SELECT COUNT(*) as count FROM tasks t
       JOIN columns c ON t.column_id = c.id
       WHERE c.workspace_id = ? AND t.deleted_at < datetime('now', '-30 days')`
    )
    .get(workspaceId);

  db.prepare(
    `DELETE FROM tasks WHERE id IN (
       SELECT t.id FROM tasks t
       JOIN columns c ON t.column_id = c.id
       WHERE c.workspace_id = ? AND t.deleted_at < datetime('now', '-30 days')
     )`
  ).run(workspaceId);

  return { purged: count.count };
}
