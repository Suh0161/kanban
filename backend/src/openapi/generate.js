/**
 * Generates `docs/openapi.json` from the live OpenAPI registry.
 *
 * Used in two places:
 *   1. CI / `npm run openapi:generate` — produces a committable artifact so
 *      PRs show a diff whenever the spec changes.
 *   2. Server startup (dev only) — keeps the file in sync as you edit routes.
 *
 * Importing this module imports every route file, which is what populates
 * the registry as a side effect of `defineRoute()` calls.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { buildOpenApiDocument } from './registry.js';

// Side-effect imports: every file that calls defineRoute() must be loaded
// here so the registry knows about its routes when the spec is generated.
import '../routes/auth.js';
import '../routes/workspaces.js';
import '../routes/board.js';
import '../routes/columns.js';
import '../routes/tasks.js';
import '../routes/comments.js';
import '../routes/attachments.js';
import '../routes/checklists.js';
import '../routes/activity.js';
import '../routes/presence.js';
import '../routes/api-keys.js';
import '../routes/webhooks.js';
import '../routes/system.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '..', '..', '..', 'docs', 'openapi.json');

export function writeOpenApiJson() {
  const doc = buildOpenApiDocument();
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  return OUTPUT;
}

// CLI entry — `node src/openapi/generate.js`
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const path = writeOpenApiJson();
  console.log(`Wrote OpenAPI spec to ${path}`);
}
