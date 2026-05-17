/**
 * Storage adapter for workspace branding assets (logo + background image).
 *
 * Same model as `avatarService.js`:
 *   - bytes go to object storage,
 *   - the DB only keeps a small URL pointer,
 *   - replacement removes the previous file so each workspace owns at
 *     most one logo and one background object.
 *
 * Layout:
 *   logos/<workspaceId>/<uuid>.<ext>          → /api/v1/logos/<id>/<file>
 *   backgrounds/<workspaceId>/<uuid>.<ext>    → /api/v1/backgrounds/<id>/<file>
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

const KINDS = {
  logo:       { column: 'logo',       prefix: 'logos',       publicPath: 'logos' },
  background: { column: 'background', prefix: 'backgrounds', publicPath: 'backgrounds' },
};

const SAFE_WORKSPACE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_ASSET_FILENAME = /^[\w.-]+$/;

function publicUrl(kind, key) {
  return `/api/v1/${KINDS[kind].publicPath}/${key.split('/').slice(1).join('/')}`;
}

/**
 * Save an uploaded image as the workspace's logo or background. Removes
 * the previous file (if any) so per-workspace storage stays bounded to a
 * single object.
 *
 * @param {Database} db
 * @param {'logo'|'background'} kind
 * @param {string} workspaceId
 * @param {{ tempPath: string, mimeType: string }} file
 * @returns {Promise<{ url: string }>}
 */
export async function saveWorkspaceAsset(db, kind, workspaceId, { tempPath, mimeType }) {
  const cfg = KINDS[kind];
  if (!cfg) throw new AppError('Invalid asset kind', 400, 'VALIDATION_ERROR');
  const ext = MIME_EXT[mimeType];
  if (!ext) throw new AppError('Unsupported image type', 400, 'VALIDATION_ERROR');

  // Drop the previous file for this kind, if it lived in our storage.
  // `storage.remove` may be async (Supabase) or sync (local) — await is
  // safe for both, and a failure here is non-fatal.
  const prev = db
    .prepare(`SELECT ${cfg.column} AS value FROM workspaces WHERE id = ?`)
    .get(workspaceId);
  const prevUrl = prev?.value;
  if (prevUrl && typeof prevUrl === 'string' && prevUrl.startsWith(`/api/v1/${cfg.publicPath}/`)) {
    const prevKey = `${cfg.prefix}/${prevUrl.replace(`/api/v1/${cfg.publicPath}/`, '')}`;
    try { await storage.remove(prevKey); } catch { /* ignore */ }
  }

  const key = `${cfg.prefix}/${workspaceId}/${uuidv4()}${ext}`;
  await storage.put(tempPath, { key });

  const url = publicUrl(kind, key);
  db.prepare(`UPDATE workspaces SET ${cfg.column} = ? WHERE id = ?`).run(url, workspaceId);

  // Best-effort cleanup of multer temp file.
  try {
    const fs = await import('fs');
    fs.unlinkSync(tempPath);
  } catch { /* ignore */ }

  return { url };
}

/**
 * Stream a stored asset by workspace + filename. Public — workspace
 * branding is intended to render in `<img>` tags from any origin. Async
 * because the Supabase storage backend is HTTP-bound; the local backend
 * resolves synchronously and `await` is a no-op there.
 */
export async function readWorkspaceAsset(kind, workspaceId, filename) {
  const cfg = KINDS[kind];
  if (!cfg) return null;
  if (!SAFE_WORKSPACE_ID.test(workspaceId) || !SAFE_ASSET_FILENAME.test(filename)) {
    return null;
  }
  const key = `${cfg.prefix}/${workspaceId}/${filename}`;
  return await storage.get(key);
}
