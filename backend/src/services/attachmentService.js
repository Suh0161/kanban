/**
 * Attachment service. The DB owns metadata only:
 *   - id, taskId, name (display)
 *   - storage_key (opaque pointer into the storage backend)
 *   - mime_type, size, sha256 (content metadata)
 *   - url (the public, stable API path — `/api/v1/attachments/<id>/file`)
 *
 * Bytes live in the storage backend (`services/storage`), which can be
 * swapped from local disk to S3/R2/GCS without touching this file or
 * any consumer.
 */

import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { AppError } from '../middleware/error.js';
import { storage } from './storage/index.js';

const PUBLIC_URL = (id) => `/api/v1/attachments/${id}/file`;

/**
 * Create an attachment record from an already-uploaded file on disk.
 * (multer puts the upload at `tempPath`; we adopt it into our storage
 * layout, hash + size it, then write the row.)
 */
export async function createAttachmentFromUpload(db, {
  taskId,
  tempPath,
  originalName,
  mimeType,
  type,
}) {
  if (!taskId || !tempPath || !originalName) {
    throw new AppError('taskId, tempPath, and originalName are required', 400, 'VALIDATION_ERROR');
  }

  const id = `a-${uuidv4()}`;
  const ext = extname(originalName).toLowerCase();
  const storageKey = `attachments/${taskId}/${id}${ext}`;

  // Stream the temp file into storage; storage returns size + sha256.
  const { size, sha256 } = await storage.put(tempPath, { key: storageKey });

  // Clean up multer's temp copy now that storage owns it.
  try {
    const fs = await import('fs');
    fs.unlinkSync(tempPath);
  } catch {
    // Already gone — fine.
  }

  const url = PUBLIC_URL(id);

  db.prepare(
    `INSERT INTO attachments
       (id, task_id, type, url, name, storage_key, mime_type, size, sha256)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, taskId, type || 'image', url, originalName, storageKey, mimeType || null, size, sha256);

  return db.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
}

/**
 * Fetch attachment metadata + a readable stream for the bytes.
 * Returns null if the row exists but the bytes are missing
 * (caller decides how to surface that — usually 404).
 *
 * Async because the Supabase storage backend is HTTP-bound; the local
 * backend resolves synchronously and `await` is a no-op there.
 */
export async function readAttachment(db, attachmentId) {
  const row = db.prepare('SELECT * FROM attachments WHERE id = ?').get(attachmentId);
  if (!row) return null;
  if (!row.storage_key) return { row, file: null };
  const file = await storage.get(row.storage_key);
  return { row, file };
}

export function getAttachmentRow(db, attachmentId) {
  return db.prepare('SELECT * FROM attachments WHERE id = ?').get(attachmentId);
}

export async function deleteAttachment(db, attachmentId) {
  const row = db.prepare('SELECT * FROM attachments WHERE id = ?').get(attachmentId);
  if (!row) throw new AppError('Attachment not found', 404, 'NOT_FOUND');

  db.prepare('DELETE FROM attachments WHERE id = ?').run(attachmentId);

  if (row.storage_key) {
    // Best-effort cleanup; orphan bytes are tolerable, a failed network
    // round-trip shouldn't block the row delete.
    try { await storage.remove(row.storage_key); } catch { /* ignore */ }
  }
}
