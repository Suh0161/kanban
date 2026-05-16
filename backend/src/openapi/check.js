/**
 * CI guard: regenerates the spec from code in memory and compares it
 * to the committed `docs/openapi.json`. Exits non-zero if they differ,
 * so a PR that changes routes without running `npm run openapi:generate`
 * fails the build.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { buildOpenApiDocument } from './registry.js';

// Side-effect imports — keep in sync with generate.js
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
const SPEC_FILE = join(__dirname, '..', '..', '..', 'docs', 'openapi.json');

const generated = JSON.stringify(buildOpenApiDocument(), null, 2) + '\n';
let committed = '';
try {
  committed = readFileSync(SPEC_FILE, 'utf8');
} catch {
  console.error(`No committed spec at ${SPEC_FILE}. Run \`npm run openapi:generate\` and commit the result.`);
  process.exit(1);
}

if (generated !== committed) {
  console.error('docs/openapi.json is out of sync with code.');
  console.error('Run `npm run openapi:generate` and commit the diff.');
  process.exit(1);
}

console.log('OK: docs/openapi.json matches generated spec.');
