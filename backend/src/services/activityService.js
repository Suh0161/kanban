import { v4 as uuidv4 } from 'uuid';

const DEDUP_WINDOW_MS = 30_000; // 30 seconds

/**
 * Log an activity entry with dedup: if the same user performed the same event
 * on the same entity within DEDUP_WINDOW_MS, merge the detail instead of creating a new row.
 */
export function logActivity(db, { userId, workspaceId, event, entityType, entityId, detail }) {
  // Try to find a recent duplicate to merge with
  if (userId && entityId && event === 'TASK_UPDATED') {
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
    const recent = db.prepare(
      `SELECT id, detail FROM activity_log
       WHERE user_id = ? AND entity_id = ? AND event = ? AND created_at > ?
       ORDER BY created_at DESC LIMIT 1`
    ).get(userId, entityId, event, cutoff);

    if (recent) {
      // Merge: combine the changes arrays
      const merged = mergeDetails(recent.detail, detail);
      db.prepare('UPDATE activity_log SET detail = ? WHERE id = ?').run(merged, recent.id);
      return { id: recent.id, userId, workspaceId, event, entityType, entityId, detail: merged };
    }
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO activity_log (id, user_id, workspace_id, event, entity_type, entity_id, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId || null, workspaceId, event, entityType || null, entityId || null, detail || null);
  return { id, userId, workspaceId, event, entityType, entityId, detail };
}

/**
 * Merge two detail JSON strings. Each detail is expected to be a JSON object
 * with a `changes` array of { field, from, to }. The merged result keeps only
 * the latest `to` value for each field.
 */
function mergeDetails(existingRaw, newRaw) {
  let existing = {};
  let incoming = {};
  try { existing = JSON.parse(existingRaw || '{}'); } catch (_e) { existing = {}; }
  try { incoming = JSON.parse(newRaw || '{}'); } catch (_e) { incoming = {}; }

  const existingChanges = existing.changes || [];
  const incomingChanges = incoming.changes || [];

  // Build a map keyed by field name — keep earliest `from`, latest `to`
  const map = new Map();
  for (const c of existingChanges) {
    map.set(c.field, { field: c.field, from: c.from, to: c.to });
  }
  for (const c of incomingChanges) {
    const prev = map.get(c.field);
    if (prev) {
      // Keep original `from`, update `to`
      map.set(c.field, { field: c.field, from: prev.from, to: c.to });
    } else {
      map.set(c.field, { field: c.field, from: c.from, to: c.to });
    }
  }

  // Remove no-ops (from === to after merge)
  const changes = [...map.values()].filter(c => c.from !== c.to);

  return JSON.stringify({ ...existing, ...incoming, changes });
}

export function getActivityLog(db, workspaceId, { limit = 50, offset = 0 } = {}) {
  const rows = db
    .prepare(
      `SELECT al.*, u.name as user_name, u.avatar as user_avatar
       FROM activity_log al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.workspace_id = ?
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(workspaceId, limit, offset);

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar,
    workspaceId: row.workspace_id,
    event: row.event,
    entityType: row.entity_type,
    entityId: row.entity_id,
    detail: row.detail,
    createdAt: row.created_at,
  }));
}
