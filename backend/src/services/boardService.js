import { AppError } from '../middleware/error.js';
import { signAttachmentToken } from './attachmentToken.js';

/**
 * Build a per-user signed URL for an attachment so `<img src>` requests
 * (which can't carry auth headers) still authenticate the viewer.
 */
function signedAttachmentUrl(attachmentId, baseUrl, userId) {
  if (!userId) return baseUrl;
  const token = signAttachmentToken({ attachmentId, userId });
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}token=${token}`;
}

export function getBoard(db, workspaceId, filters = {}, userId = null) {
  const workspace = db.prepare('SELECT id, custom_fields, labels FROM workspaces WHERE id = ?').get(workspaceId);
  if (!workspace) throw new AppError('Workspace not found or access denied', 404, 'NOT_FOUND');

  let workspaceCustomFields = [];
  try {
    workspaceCustomFields = JSON.parse(workspace.custom_fields || '[]');
  } catch (_e) {
    workspaceCustomFields = [];
  }

  let workspaceLabels = [];
  try {
    workspaceLabels = JSON.parse(workspace.labels || '[]');
  } catch (_e) {
    workspaceLabels = [];
  }

  const columns = db
    .prepare('SELECT * FROM columns WHERE workspace_id = ? AND deleted_at IS NULL ORDER BY position')
    .all(workspaceId);
  const columnIds = columns.map((c) => c.id);

  let tasks = [];
  if (columnIds.length > 0) {
    const placeholders = columnIds.map(() => '?').join(',');

    let whereClauses = [`t.column_id IN (${placeholders})`, 't.deleted_at IS NULL'];
    const params = [...columnIds];

    if (filters.search) {
      whereClauses.push('(t.title LIKE ? OR t.code LIKE ? OR t.description LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.priority) {
      whereClauses.push('t.priority = ?');
      params.push(filters.priority);
    }

    if (Array.isArray(filters.tags) && filters.tags.length > 0) {
      const tagPlaceholders = filters.tags.map(() => '?').join(',');
      whereClauses.push(`t.id IN (SELECT task_id FROM task_tags WHERE tag IN (${tagPlaceholders}))`);
      params.push(...filters.tags);
    }

    const whereClause = whereClauses.join(' AND ');

    tasks = db
      .prepare(
        `SELECT t.*, u.name as assignee_name, u.avatar as assignee_img
         FROM tasks t
         LEFT JOIN users u ON t.assignee_id = u.id
         WHERE ${whereClause}
         ORDER BY t.position`
      )
      .all(...params);
  }

  const taskIds = tasks.map((t) => t.id);

  const tagsByTask = {};
  const commentsByTask = {};
  const attachmentsByTask = {};
  const checklistsByTask = {};

  if (taskIds.length > 0) {
    const placeholders = taskIds.map(() => '?').join(',');

    const tags = db
      .prepare(`SELECT * FROM task_tags WHERE task_id IN (${placeholders})`)
      .all(...taskIds);
    for (const tag of tags) {
      if (!tagsByTask[tag.task_id]) tagsByTask[tag.task_id] = [];
      tagsByTask[tag.task_id].push(tag.tag);
    }

    const comments = db
      .prepare(
        `SELECT * FROM comments WHERE task_id IN (${placeholders}) ORDER BY created_at`
      )
      .all(...taskIds);
    for (const comment of comments) {
      if (!commentsByTask[comment.task_id]) commentsByTask[comment.task_id] = [];
      commentsByTask[comment.task_id].push({
        id: comment.id,
        text: comment.text,
        author: comment.author_name,
        avatar: comment.author_avatar,
        time: new Date(comment.created_at).toISOString(),
      });
    }

    const attachments = db
      .prepare(`SELECT * FROM attachments WHERE task_id IN (${placeholders})`)
      .all(...taskIds);
    for (const attachment of attachments) {
      if (!attachmentsByTask[attachment.task_id])
        attachmentsByTask[attachment.task_id] = [];
      attachmentsByTask[attachment.task_id].push({
        id: attachment.id,
        type: attachment.type,
        url: signedAttachmentUrl(attachment.id, attachment.url, userId),
        name: attachment.name,
      });
    }

    const checklists = db
      .prepare(`SELECT * FROM checklists WHERE task_id IN (${placeholders})`)
      .all(...taskIds);
    const checklistIds = checklists.map((c) => c.id);
    let checklistItems = [];
    if (checklistIds.length > 0) {
      const cplaceholders = checklistIds.map(() => '?').join(',');
      checklistItems = db
        .prepare(
          `SELECT * FROM checklist_items WHERE checklist_id IN (${cplaceholders})`
        )
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

    for (const checklist of checklists) {
      if (!checklistsByTask[checklist.task_id])
        checklistsByTask[checklist.task_id] = [];
      checklistsByTask[checklist.task_id].push({
        id: checklist.id,
        title: checklist.title,
        items: itemsByChecklist[checklist.id] || [],
      });
    }
  }

  const activitiesByTask = {};
  if (taskIds.length > 0) {
    const placeholders = taskIds.map(() => '?').join(',');
    const activities = db
      .prepare(`
        SELECT al.*, u.name as user_name, u.avatar as user_avatar 
        FROM activity_log al 
        LEFT JOIN users u ON al.user_id = u.id 
        WHERE al.entity_id IN (${placeholders}) AND al.entity_type = 'task' 
        ORDER BY al.created_at DESC
        LIMIT 500
      `)
      .all(...taskIds);
    
    for (const activity of activities) {
      if (!activitiesByTask[activity.entity_id]) activitiesByTask[activity.entity_id] = [];
      
      let parsedDetail = null;
      try {
        if (activity.detail) parsedDetail = JSON.parse(activity.detail);
      } catch (_e) {
        parsedDetail = activity.detail;
      }

      activitiesByTask[activity.entity_id].push({
        id: activity.id,
        event: activity.event,
        detail: parsedDetail,
        userName: activity.user_name || 'System',
        userAvatar: activity.user_avatar,
        time: activity.created_at,
      });
    }
  }

  const tasksMap = {};
  for (const t of tasks) {
    const taskComments = commentsByTask[t.id] || [];
    const taskAttachments = attachmentsByTask[t.id] || [];
    
    let parsedCustomFields = {};
    try {
      if (t.custom_fields) parsedCustomFields = JSON.parse(t.custom_fields);
    } catch (_e) {
      parsedCustomFields = {};
    }

    let parsedLabelIds = [];
    try {
      if (t.label_ids) parsedLabelIds = JSON.parse(t.label_ids);
    } catch (_e) {
      parsedLabelIds = [];
    }

    tasksMap[t.id] = {
      id: t.id,
      title: t.title,
      priority: t.priority,
      tags: tagsByTask[t.id] || [],
      labelIds: parsedLabelIds,
      metrics: {
        comments: taskComments.length,
        attachments: taskAttachments.length,
      },
      code: t.code,
      description: t.description,
      assigneeId: t.assignee_id,
      assigneeName: t.assignee_name,
      assigneeImg: t.assignee_img,
      comments: taskComments,
      attachments: taskAttachments,
      checklists: checklistsByTask[t.id] || [],
      dueDate: t.due_date,
      sprintId: t.sprint_id || null,
      customFields: parsedCustomFields,
      activities: activitiesByTask[t.id] || [],
    };
  }

  const columnsMap = {};
  for (const c of columns) {
    columnsMap[c.id] = {
      id: c.id,
      title: c.title,
      taskIds: tasks.filter((t) => t.column_id === c.id).map((t) => t.id),
    };
  }

  return {
    tasks: tasksMap,
    columns: columnsMap,
    columnOrder: columns.map((c) => c.id),
    customFields: workspaceCustomFields,
    labels: workspaceLabels,
  };
}
