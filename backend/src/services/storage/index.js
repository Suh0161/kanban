/**
 * Storage abstraction. Routes call this; the concrete backend is
 * decided at boot. Today: local disk. Tomorrow: S3 / R2 / GCS.
 *
 * Contract:
 *   put(stream | buffer, { key, contentType }) -> { key, size, sha256 }
 *   get(key) -> { stream, size, contentType }
 *   remove(key) -> void
 *   exists(key) -> boolean
 *
 * Keys are opaque strings owned by the storage backend (e.g. on disk
 * `attachments/<task>/<uuid>.png`, on S3 the same path under the bucket).
 * Routes never assume a key is a URL.
 */

import { localDiskStorage } from './localDisk.js';

// Single shared instance. Swap this line when adding S3.
export const storage = localDiskStorage();
