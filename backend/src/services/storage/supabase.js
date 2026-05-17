/**
 * Supabase Storage backend.
 *
 * Implements the same { put, get, remove, exists } contract as
 * localDisk.js, but writes to a private Supabase bucket. The
 * service-role key bypasses RLS — only ever read it from server-side
 * env (never ship it to the browser).
 *
 * Wire it up by setting:
 *   STORAGE_BACKEND=supabase
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=ey...
 *   SUPABASE_STORAGE_BUCKET=elevate     (or whatever you named the bucket)
 *
 * The bucket should be PRIVATE. Public reads happen through the API's
 * signed-URL stream, same as the local-disk backend. RLS policies on the
 * bucket aren't required when using the service-role key, but they're a
 * good idea if you ever expose a public-anon-key path.
 */

import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

function readableFrom(source) {
  if (Buffer.isBuffer(source)) return Readable.from(source);
  if (typeof source === 'string') {
    // Path string: stream the file from disk. The localDisk backend uses
    // the same trick so callers can stay agnostic to which backend they
    // got back from storage/index.js.
    return createReadStream(source);
  }
  if (source && typeof source.pipe === 'function') return source;
  throw new Error('storage.put: source must be Buffer, stream, or path');
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export function supabaseStorage({ url, serviceRoleKey, bucket }) {
  if (!url || !serviceRoleKey || !bucket) {
    throw new Error('supabaseStorage: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET are required');
  }

  const base = `${url.replace(/\/$/, '')}/storage/v1/object`;
  const headers = {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  };

  // Defensive: storage keys must not start with "/", contain "..", or
  // resolve outside the bucket scope. The Supabase API treats keys as
  // opaque paths within the bucket, so we mirror localDisk's check.
  function assertSafeKey(key) {
    if (typeof key !== 'string' || key.length === 0) throw new Error('storage: empty key');
    if (key.includes('..') || key.startsWith('/') || key.includes('\\')) {
      throw new Error(`Invalid storage key: ${key}`);
    }
  }

  return {
    async put(source, { key, contentType }) {
      assertSafeKey(key);

      const buf = Buffer.isBuffer(source)
        ? source
        : await streamToBuffer(readableFrom(source));

      const sha256 = createHash('sha256').update(buf).digest('hex');

      // POST writes a new object; use upsert via x-upsert: true so retries
      // and re-uploads with the same key replace the old bytes instead of
      // 409-ing.
      const res = await fetch(`${base}/${encodeURIComponent(bucket)}/${encodeURI(key)}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': contentType || 'application/octet-stream',
          'x-upsert': 'true',
          'cache-control': 'private, max-age=0, must-revalidate',
        },
        body: buf,
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Supabase storage put failed (${res.status}): ${detail}`);
      }

      return { key, size: buf.length, sha256 };
    },

    async get(key) {
      assertSafeKey(key);
      const res = await fetch(`${base}/${encodeURIComponent(bucket)}/${encodeURI(key)}`, {
        method: 'GET',
        headers,
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Supabase storage get failed (${res.status}): ${detail}`);
      }
      // Convert the global ReadableStream the fetch API returns to a node
      // Readable so callers (which pipe to res) can stay backend-agnostic.
      const stream = res.body ? Readable.fromWeb(res.body) : null;
      const size = Number(res.headers.get('content-length')) || null;
      const contentType = res.headers.get('content-type') || null;
      return { stream, size, contentType };
    },

    async remove(key) {
      assertSafeKey(key);
      const res = await fetch(`${base}/${encodeURIComponent(bucket)}/${encodeURI(key)}`, {
        method: 'DELETE',
        headers,
      });
      // 404 is fine — the file's already gone, we got what we wanted.
      if (!res.ok && res.status !== 404) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Supabase storage remove failed (${res.status}): ${detail}`);
      }
    },

    async exists(key) {
      assertSafeKey(key);
      // HEAD on the object endpoint returns 200 / 404.
      const res = await fetch(`${base}/${encodeURIComponent(bucket)}/${encodeURI(key)}`, {
        method: 'HEAD',
        headers,
      });
      return res.ok;
    },
  };
}
