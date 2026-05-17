/**
 * Auto-import every file under `src/routes/` so each `defineRoute()` call
 * registers its path with the OpenAPI registry.
 *
 * Why this exists: previously `generate.js` and `check.js` each kept a
 * hand-maintained list of route files. New routes silently dropped out of
 * the spec until both lists were updated. This module replaces those
 * lists with one filesystem walk so adding a route file is enough.
 *
 * Pure ESM: dynamic imports run sequentially and are awaited, so the
 * caller can rely on the registry being fully populated when this resolves.
 */

import { readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = join(__dirname, '..', 'routes');

let loaded = null;

/**
 * Load every `*.js` route module exactly once. Subsequent calls return
 * the cached promise, so the work is idempotent across `generate`,
 * `check`, and the running server.
 *
 * @returns {Promise<string[]>} the absolute paths that were imported
 */
export function loadAllRoutes() {
  if (loaded) return loaded;
  loaded = (async () => {
    const entries = readdirSync(ROUTES_DIR);
    const files = entries
      .filter((name) => name.endsWith('.js'))
      .filter((name) => {
        const abs = join(ROUTES_DIR, name);
        try { return statSync(abs).isFile(); } catch { return false; }
      })
      // Stable order so the generated spec is deterministic for diffs.
      .sort();
    for (const name of files) {
      const abs = join(ROUTES_DIR, name);
      // Cross-platform: file:// URL avoids "ERR_UNSUPPORTED_ESM_URL_SCHEME"
      // on Windows where bare paths aren't valid for dynamic import.
      await import(pathToFileURL(abs).href);
    }
    return files.map((f) => join(ROUTES_DIR, f));
  })();
  return loaded;
}
