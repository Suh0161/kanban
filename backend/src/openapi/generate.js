/**
 * Build `docs/openapi.json` from the live OpenAPI registry.
 *
 * Used in three places:
 *   1. `npm run openapi:generate` — local invocation, also wired to the
 *      backend `prebuild` script so deploys always ship a fresh spec.
 *   2. CI guard via `openapi:check` — re-derives the spec and diffs it
 *      against the committed file.
 *   3. Server startup (development only) — keeps the file fresh as you
 *      edit routes; production never writes to disk at runtime.
 *
 * Route discovery is automatic. `loadAllRoutes()` walks `src/routes/` and
 * imports every `*.js` file, so adding a new route file is enough — there
 * is no hand-maintained import list to forget.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { buildOpenApiDocument } from './registry.js';
import { loadAllRoutes } from './loadRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '..', '..', '..', 'docs', 'openapi.json');

/**
 * Build the spec in memory. Routes are auto-discovered.
 * @returns {Promise<object>} the OpenAPI 3.1 document
 */
export async function buildSpec() {
  await loadAllRoutes();
  return buildOpenApiDocument();
}

/**
 * Build + write the spec to disk. Returns the absolute output path.
 */
export async function writeOpenApiJson() {
  const doc = await buildSpec();
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  return OUTPUT;
}

// CLI entry — `node src/openapi/generate.js`
const invokedDirectly =
  import.meta.url === pathToFileURL(process.argv[1] || '').href;

if (invokedDirectly) {
  writeOpenApiJson()
    .then((path) => {
      console.log(`Wrote OpenAPI spec to ${path}`);
    })
    .catch((err) => {
      console.error('Failed to generate OpenAPI spec:', err);
      process.exit(1);
    });
}
