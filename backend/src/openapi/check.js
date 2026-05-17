/**
 * CI guard: regenerate the spec from code in memory and compare it to the
 * committed `docs/openapi.json`. Exits non-zero on drift so a PR that
 * changes routes without committing a fresh spec fails the build.
 *
 * Routes are auto-discovered via `loadAllRoutes()`.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { buildOpenApiDocument } from './registry.js';
import { loadAllRoutes } from './loadRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_FILE = join(__dirname, '..', '..', '..', 'docs', 'openapi.json');

await loadAllRoutes();

const generated = JSON.stringify(buildOpenApiDocument(), null, 2) + '\n';

let committed = '';
try {
  committed = readFileSync(SPEC_FILE, 'utf8');
} catch {
  console.error(`No committed spec at ${SPEC_FILE}.`);
  console.error('Run `npm run openapi:generate` and commit the result.');
  process.exit(1);
}

if (generated !== committed) {
  console.error('docs/openapi.json is out of sync with code.');
  console.error('Run `npm run openapi:generate` and commit the diff.');
  process.exit(1);
}

console.log('OK: docs/openapi.json matches generated spec.');
