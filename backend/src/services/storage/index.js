/**
 * Storage abstraction. Routes call this; the concrete backend is
 * decided at boot from STORAGE_BACKEND in the env.
 *
 * Contract every backend must satisfy:
 *   put(source, { key, contentType })
 *     source: Buffer | Readable | path string
 *     -> { key, size, sha256 }
 *   get(key) -> { stream, size, contentType? } | null
 *   remove(key) -> void
 *   exists(key) -> boolean
 *
 * Keys are opaque strings owned by the storage backend (e.g. on disk
 * `attachments/<task>/<uuid>.png`, on Supabase the same path inside the
 * bucket). Routes never assume a key is a URL — the API serves bytes
 * through its own authenticated stream endpoint and hands clients short
 * HMAC-signed URLs (see services/attachmentToken.js).
 */

import { localDiskStorage } from './localDisk.js';
import { supabaseStorage } from './supabase.js';

const BACKEND = (process.env.STORAGE_BACKEND || 'local').trim().toLowerCase();

function pickBackend() {
  if (BACKEND === 'supabase') {
    const url            = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket         = process.env.SUPABASE_STORAGE_BUCKET || 'elevate';
    if (!url || !serviceRoleKey) {
      throw new Error(
        'STORAGE_BACKEND=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      );
    }
    return supabaseStorage({ url, serviceRoleKey, bucket });
  }
  if (BACKEND !== 'local') {
    throw new Error(`Unknown STORAGE_BACKEND: ${BACKEND}`);
  }
  return localDiskStorage();
}

export const storage = pickBackend();
export const storageBackend = BACKEND;

if (process.env.NODE_ENV === 'production') {
  if (BACKEND === 'local') {
    const where = process.env.UPLOADS_DIR || '<repo>/uploads';
    console.log(`[storage] local disk at ${where}`);
  } else {
    console.log(`[storage] backend=${BACKEND} bucket=${process.env.SUPABASE_STORAGE_BUCKET || 'elevate'}`);
  }
}
