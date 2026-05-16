/**
 * Local-disk storage backend. Files live under `backend/uploads/`,
 * organised by storage key. The HTTP layer never sees this path —
 * it only sees the storage key, which it passes back to `get` / `remove`.
 */

import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { dirname, resolve, sep } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = resolve(__dirname, '..', '..', '..', 'uploads');

function pathFor(key) {
  // Defensive: storage keys must not escape the uploads root
  const abs = resolve(UPLOADS_ROOT, key);
  const root = UPLOADS_ROOT.endsWith(sep) ? UPLOADS_ROOT : UPLOADS_ROOT + sep;
  if (!abs.startsWith(root) && abs !== UPLOADS_ROOT) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return abs;
}

export function localDiskStorage() {
  mkdirSync(UPLOADS_ROOT, { recursive: true });

  return {
    /**
     * Persist a file. Accepts a Buffer, a Readable stream, or a source path
     * (the multer-on-disk case — we copy the temp file into place).
     * Returns { key, size, sha256 }.
     */
    async put(source, { key }) {
      const abs = pathFor(key);
      mkdirSync(dirname(abs), { recursive: true });

      let readable;
      if (Buffer.isBuffer(source)) {
        readable = Readable.from(source);
      } else if (typeof source === 'string') {
        readable = createReadStream(source);
      } else if (source && typeof source.pipe === 'function') {
        readable = source;
      } else {
        throw new Error('storage.put: source must be Buffer, stream, or path');
      }

      const hash = createHash('sha256');
      let size = 0;
      const writable = createWriteStream(abs);

      await pipeline(
        readable,
        async function* (src) {
          for await (const chunk of src) {
            hash.update(chunk);
            size += chunk.length;
            yield chunk;
          }
        },
        writable
      );

      return {
        key,
        size,
        sha256: hash.digest('hex'),
      };
    },

    /** Returns a node Readable + size for streaming back to clients. */
    get(key) {
      const abs = pathFor(key);
      if (!existsSync(abs)) return null;
      const stat = statSync(abs);
      return {
        stream: createReadStream(abs),
        size: stat.size,
      };
    },

    remove(key) {
      const abs = pathFor(key);
      try {
        unlinkSync(abs);
      } catch {
        // Already gone — fine.
      }
    },

    exists(key) {
      return existsSync(pathFor(key));
    },
  };
}
