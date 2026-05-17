/**
 * Avatar storage. We deliberately keep avatars OUT of the database — the
 * row only stores a small URL pointer. Bytes live in the storage backend
 * (local disk today, Supabase Storage / S3 / R2 tomorrow).
 *
 * Layout: `avatars/<userId>/<uuid>.<ext>`
 * Public URL: `/api/v1/avatars/<userId>/<file>`
 *
 * On replacement we delete the previous file so the per-user folder stays
 * at a single object.
 */

import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/error.js';
import { storage } from './storage/index.js';

const MIME_EXT = {
  'image/png':  '.png',
  'image/jpeg': '.jpg',
  'image/jpg':  '.jpg',
  'image/gif':  '.gif',
  'image/webp': '.webp',
};

const PUBLIC_URL = (key) => `/api/v1/${key}`; // key already starts with avatars/
const SAFE_AVATAR_USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_AVATAR_FILENAME = /^[\w.-]+$/;

/**
 * Save an uploaded avatar for `userId`. Removes any previous avatar file
 * for the same user, writes the new one to storage, and updates `users.avatar`
 * with the URL pointer.
 *
 * @param {Database} db
 * @param {string} userId
 * @param {{ tempPath: string, mimeType: string }} file
 * @returns {{ url: string }}
 */
export async function saveAvatarFromUpload(db, userId, { tempPath, mimeType }) {
  const ext = MIME_EXT[mimeType];
  if (!ext) {
    throw new AppError('Unsupported avatar type', 400, 'VALIDATION_ERROR');
  }

  // Remove any previous file for this user. We don't enumerate the bucket;
  // we just look at the URL we stored last time and unlink that storage key.
  // `storage.remove` may be async (Supabase) or sync (local) — await is safe
  // for both, and a failure here is non-fatal (orphan bytes are tolerable).
  const prev = db.prepare('SELECT avatar FROM users WHERE id = ?').get(userId);
  if (prev?.avatar && prev.avatar.startsWith('/api/v1/avatars/')) {
    const prevKey = prev.avatar.replace('/api/v1/', '');
    try { await storage.remove(prevKey); } catch { /* ignore */ }
  }

  const key = `avatars/${userId}/${uuidv4()}${ext}`;
  await storage.put(tempPath, { key });

  const url = PUBLIC_URL(key);
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(url, userId);

  // Best-effort cleanup of multer temp file.
  try {
    const fs = await import('fs');
    fs.unlinkSync(tempPath);
  } catch { /* ignore */ }

  return { url };
}

/**
 * Stream an avatar by `userId` + `filename`. Public — avatars don't carry
 * sensitive content and they're served from <img> tags that can't send
 * Authorization headers. Same model as Slack/GitHub user-content URLs.
 *
 * Returns `null` for invalid keys or missing files; otherwise returns the
 * `{ stream, size }` shape both storage backends produce. The function is
 * async because the Supabase backend is HTTP-bound; the local backend
 * resolves synchronously and `await` is a no-op.
 */
export async function readAvatar(userId, filename) {
  if (!SAFE_AVATAR_USER_ID.test(userId) || !SAFE_AVATAR_FILENAME.test(filename)) {
    return null;
  }
  const key = `avatars/${userId}/${filename}`;
  return await storage.get(key);
}
