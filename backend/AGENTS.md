# AGENTS.md (backend)

> Rules for AI agents working inside `backend/`. **This file overrides the
> top-level `AGENTS.md` for anything inside this folder.**

## Persona

You are a backend engineer working on the Elevate REST API. You write small, focused modules with clear separation between routing, validation, business logic, and persistence. The OpenAPI spec is a build artifact, not a hand-written file. Keep diffs minimal, security defaults strict, and the route → service → DB layering honest.

## Stack

- Node.js 20+ (ESM, `"type": "module"`)
- Express 4
- SQLite via `better-sqlite3` (synchronous, single file)
- JWT (`jsonwebtoken`) + bcrypt for passwords + API keys (SHA-256 hashed) + OAuth 2.0
- Zod 4 for request validation, `@asteasolutions/zod-to-openapi` for spec generation
- `helmet`, `cors`, `express-rate-limit`, `multer` for security and uploads
- ESLint 9 (flat config)

## Commands

```bash
cd backend
npm run dev                  # http://localhost:3001 (auto-reload, regenerates openapi.json)
npm start                    # production mode
npm run seed                 # seed default users, workspaces, columns, tasks
npm run lint                 # eslint
npm run lint:fix             # eslint --fix
npm run openapi:generate     # rebuild docs/openapi.json from registered routes
npm run openapi:check        # CI guard: fails if openapi.json is out of sync
```

## Project structure

```
backend/src/
├── config.js                # Env vars + IS_DEV/IS_PROD flags + JWT/CORS guards
├── db.js                    # SQLite handle, schema bootstrap, idempotent migrations
├── seed.js                  # Demo data seeder
├── server.js                # App entry: middleware chain, route mounting, OpenAPI warm
│
├── middleware/
│   ├── apikey.js            # X-API-Key / ?api_key= auth
│   ├── audit.js             # Audit log for 401/403/429 responses
│   ├── auth.js              # JWT verification, requireAuth
│   ├── error.js             # AppError + global error handler
│   ├── logger.js            # Request logging + X-Request-Id
│   └── validate.js          # sanitizeString / isValidEmail / isValidUUID
│
├── openapi/
│   ├── registry.js          # Single OpenAPIRegistry + buildOpenApiDocument
│   ├── schemas.js           # Shared domain Zod schemas (User, Task, Workspace, ...)
│   ├── route.js             # defineRoute / withPrefix / validate
│   ├── loadRoutes.js        # Walks routes/ and dynamic-imports each file (auto-discovery)
│   ├── generate.js          # CLI: writes docs/openapi.json
│   └── check.js             # CI: rebuilds in memory, diffs the committed spec
│
├── routes/                  # Auto-discovered. Do not maintain a manual import list.
│   ├── activity.js          # Workspace activity feed
│   ├── api-keys.js          # API key CRUD (hashed, scoped, expiring)
│   ├── attachments.js       # File uploads (multer) + signed-URL stream
│   ├── auth.js              # /auth/register, /auth/login, /auth/me
│   ├── avatars.js           # User avatar upload (object storage)
│   ├── board.js             # GET /board/:workspaceId
│   ├── checklists.js        # Checklists + items
│   ├── columns.js           # Kanban columns
│   ├── comments.js          # Task comments
│   ├── docs.js              # Static docs portal + GET /api/spec
│   ├── oauth.js             # /auth/oauth/providers + /:provider/start + /:provider/callback
│   ├── presence.js          # Heartbeat + online users (in-memory)
│   ├── system.js            # GET /health
│   ├── tasks.js             # Tasks + move/batch/archive/restore/purge
│   ├── watchers.js          # Watch / unwatch a task
│   ├── webhooks.js          # Webhook CRUD + signing + test ping (SSRF-guarded)
│   ├── workspaceAssets.js   # Workspace logo + background upload
│   └── workspaces.js        # Workspace CRUD + members + transfer/leave
│
└── services/
    ├── storage/
    │   ├── index.js         # picks a backend; today only localDisk
    │   └── localDisk.js     # put/get/remove/exists on backend/uploads/
    ├── activityService.js
    ├── attachmentService.js
    ├── attachmentToken.js   # HMAC signed URLs for <img>
    ├── authService.js       # bcrypt + lockout + findOrCreateOAuthUser
    ├── avatarService.js
    ├── boardService.js
    ├── checklistService.js
    ├── columnService.js
    ├── commentService.js
    ├── oauthService.js      # Provider registry + HMAC-signed state for CSRF
    ├── taskService.js
    ├── watcherService.js
    ├── webhookService.js    # SSRF defense, HMAC signing, 5s timeout
    ├── workspaceAssetService.js
    └── workspaceService.js  # Role guards + transfer + leave + member CRUD
```

## Source of truth

- **OpenAPI:** `docs/openapi.json` is generated from `defineRoute()` calls in `routes/*.js`. **Never hand-edit.** CI runs `npm run openapi:check`.
- **Schemas:** Domain models live in `src/openapi/schemas.js` (`User`, `Task`, `Workspace`, etc.). Routes import these for both validation and spec entries.
- **DB DDL:** `database/schema.sql`. `db.js` applies it at startup. `localStorage` (frontend) is **not** persistence; it only caches the JWT and the current user.
- **Route discovery:** `openapi/loadRoutes.js` walks `routes/` and dynamic-imports every `.js` file. Both `generate.js` and `check.js` use it. **There is no manual import list.**

## The `defineRoute` pattern

Every route registers itself once. The Zod schema validates the request **and** produces the OpenAPI entry.

```js
// src/routes/tasks.js
import { z } from 'zod';
import { defineRoute, withPrefix } from '../openapi/route.js';
import { Task, Priority, SlugId } from '../openapi/schemas.js';

const router = withPrefix(Router(), '/tasks');
router.use(requireAuth);

const CreateTaskBody = z.object({
  columnId: SlugId,
  title: z.string().min(1).max(500),
  priority: Priority.optional(),
});

defineRoute(
  router,
  {
    method: 'post',
    path: '/',
    tag: 'Tasks',
    summary: 'Create task',
    body: CreateTaskBody,
    responses: { 201: { description: 'Created', schema: Task } },
  },
  (req, res, next) => {
    // req.body is already parsed and validated
    ...
  }
);
```

Key points:

- `withPrefix(Router(), '/tasks')` sets the OpenAPI path prefix without changing how the router mounts in `server.js`. Keep them aligned.
- `path: '/:id/move'` (Express) becomes `/{id}/move` in the spec automatically.
- `public: true` opts out of the global security requirement.
- `multipart: SchemaForFormData` describes a file upload; pair with `middleware: [upload.single('file')]`.
- `errorResponse('msg')` from `openapi/schemas.js` produces standard 4xx response entries.

## Conventions

### Layering

- **Routes** parse the request, call services, format the response. **No SQL in routes.**
- **Services** own SQL and business invariants. They take `db` as the first arg so tests can inject. They throw `AppError` for known failures.
- **Middleware** is cross-cutting: auth, rate limit, logging, audit, error handling.

### Errors

- Throw `AppError(message, status, code)` from `middleware/error.js`. Don't return ad-hoc error JSON from handlers.
- Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`, `INSUFFICIENT_SCOPE`.
- Validation errors come automatically from the Zod parser. Don't wrap them.

### Security

- `helmet` is the baseline. Don't loosen `script-src` to `'unsafe-eval'` or add CDNs without a strong reason; the docs portal works without them.
- Auth has two paths: JWT bearer (browser) and API key (bots/CI). Both end with `req.userId` populated.
- API keys are stored as SHA-256 hashes; the raw key is shown once at creation. They have scopes (`read`/`write`) and an optional ISO `expires_at`.
- Webhook payloads are signed HMAC-SHA256 with a per-webhook secret. The dispatcher rejects RFC1918, IPv4 link-local (`169.254/16`, AWS IMDS), IPv6 ULA/link-local/loopback, and disables HTTP redirects (manual handling).
- OAuth state is HMAC-signed for CSRF defense. `findOrCreateOAuthUser` only seeds `name`/`avatar` on first link; subsequent logins must not stomp local edits.
- Rate limit: 100 req / 15 min in prod (1000 in dev), with a stricter 10 / 15 min on `/auth/*` in prod.
- Sanitize free-text fields with `sanitizeString(value, maxLength)` before insert.
- Never log raw secrets, passwords, full JWTs, or raw API keys.

### Database

- `better-sqlite3` is **synchronous**. No `await` on queries.
- Use prepared statements (`db.prepare(...)`) and pass parameters positionally.
- Wrap multi-write operations in `db.transaction(...)`.
- Schema changes go in `database/schema.sql`. Bump the implicit shape there. `db.js` may add idempotent migrations for new columns/indexes.
- Foreign keys are enforced (`PRAGMA foreign_keys = ON`). Plan delete cascades carefully.
- Timestamps use `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` for ISO-8601 UTC. Don't fall back to `datetime('now')`.

### Permissions

Roles: `owner > admin > member > viewer`. Use the helpers in `services/workspaceService.js`:

- `assertWorkspaceMember(db, workspaceId, userId)` any role
- `assertCanEdit(db, workspaceId, userId)` owner/admin/member
- `assertCanManageWorkspace(db, workspaceId, userId)` owner/admin
- `assertIsOwner(db, workspaceId, userId)` owner only

The DB has a CHECK constraint on roles and a partial unique index that guarantees one owner per workspace.

### Routing

```
/api/health                              system
/api/v1/auth/*                           auth + oauth
/api/v1/avatars                          avatar uploads
/api/v1/workspaces/*                     workspaces, members, activity, presence, api-keys, webhooks, assets
/api/v1/board/:workspaceId               board
/api/v1/columns/*                        columns
/api/v1/tasks/*                          tasks + comments + attachments + checklists + watchers
/api/v1/checklists/:id/items             checklist items
/api/v1/checklist-items/:id              toggle items
/api/docs                                static docs portal
/api/spec                                generated OpenAPI JSON
```

## Adding new features

### New endpoint on an existing resource

1. Edit the right `routes/<resource>.js`. Add a `defineRoute(...)` block. Define the Zod body/params/query inline or import a shared schema from `openapi/schemas.js`.
2. Put business logic in the matching `services/<resource>Service.js`.
3. Run `npm run dev` (auto-regenerates the spec) or `npm run openapi:generate`.
4. Commit the route file, the service file, and the regenerated `docs/openapi.json` together.

### New resource (a new noun)

1. Create `routes/<resource>.js` and `services/<resource>Service.js`.
2. Add domain schema(s) to `openapi/schemas.js` and register them.
3. Mount the router in `server.js` under the right prefix.
4. Add a tag entry to `openapi/registry.js#buildOpenApiDocument().tags`.
5. Run `npm run openapi:generate` and commit.

> The new file is auto-discovered by `loadRoutes.js`. **Don't** add it to a manual import list anywhere.

### New shared schema

1. Add to `openapi/schemas.js` and register it on the registry.
2. Import it where needed. Reuse before duplicating.

### New OAuth provider

1. Add the provider definition to `services/oauthService.js` (auth URL, token URL, profile URL, scopes, profile mapper).
2. Read `<PROVIDER>_CLIENT_ID/SECRET` from `config.js`.
3. The `/auth/oauth/providers` endpoint will only advertise the provider when both env vars are set.

## Verify with a throwaway test before pushing

The backend has no permanent test suite yet. For any non-trivial change to a service, route, or migration, write a small scratch test, run it, confirm it passes, then delete it before committing.

How to do it:

1. **Create a scratch file** at the backend root: `backend/tmp-test-<topic>.mjs` (or `.scratch.test.js`). Don't put it under `src/`.
2. **Set up an isolated DB.** Open `new Database(':memory:')` and run `database/schema.sql` against it. Don't touch `database/jokel.db`.
3. **Pick the layer to exercise:**
   - Service-level: import the service directly, pass the in-memory `db`, call the function, assert with `node:assert`.
   - Route-level: start the server on a random port (or hit `localhost:3001` while `npm run dev` is running) and use `fetch` for HTTP calls.
   - Migration-level: open a fresh `:memory:` DB, run the old schema, insert a row in the old shape, run the migration, assert the row was rewritten correctly.
4. **Cover the actual change.** Include a happy path and the failure mode you're fixing. Don't write a test that would have passed before your change.
5. **Run `npm run lint` and `npm run openapi:check` first**, then run your scratch test (`node tmp-test-foo.mjs`). If it passes, delete the file.
6. **`git status` must show zero scratch files** before commit. The PR diff should only contain the production change and the regenerated `docs/openapi.json` if applicable.
7. **In the PR description, mention what the scratch test asserted.** The script is gone, but the verification fact stays.

Skip this for:

- Pure refactors covered by ESLint
- Doc-only changes
- OpenAPI spec regeneration that has no behavior change

Useful patterns:

```js
// backend/tmp-test-watchers.mjs
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { addWatcher, listWatchers } from './src/services/watcherService.js';

const db = new Database(':memory:');
db.exec(readFileSync('../database/schema.sql', 'utf8'));
db.prepare(`INSERT INTO users (id, email, name) VALUES (?, ?, ?)`).run('u1', 'a@b.c', 'A');
db.prepare(`INSERT INTO workspaces (id, name) VALUES (?, ?)`).run('w1', 'W');
db.prepare(`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)`)
  .run('w1', 'u1', 'owner');
db.prepare(`INSERT INTO columns (id, workspace_id, title) VALUES (?, ?, ?)`).run('c1', 'w1', 'To Do');
db.prepare(`INSERT INTO tasks (id, column_id, title) VALUES (?, ?, ?)`).run('t1', 'c1', 'Test');

addWatcher(db, 't1', 'u1');
const watchers = listWatchers(db, 't1');
assert.equal(watchers.length, 1);
assert.equal(watchers[0].user_id, 'u1');
console.log('OK');
```

Then `node backend/tmp-test-watchers.mjs`, confirm `OK`, delete the file.

## Boundaries

- Always run `npm run lint` and `npm run openapi:check` before finishing.
- For non-trivial changes (services, routes, migrations), run a scratch test against `:memory:`, then delete the file. `git status` must show no `tmp-*` or `*.scratch.*` files before commit.
- Never hand-edit `docs/openapi.json`. Regenerate from code.
- Never bypass the `defineRoute` pattern. If a route exists in code but not in the spec, CI fails.
- Never add `'unsafe-eval'` or external script CDNs to CSP without explicit approval.
- Never log secrets, passwords, raw API keys, or full JWTs.
- Never run `git commit`, `git push`, `git reset`, or destructive git commands without explicit approval.
- **Stop the backend before `git commit/push` on Windows.** SQLite holds a WAL lock on `database/jokel.db` that confuses git's working-tree scan.
- Ask first before adding npm packages, changing the auth model, swapping the DB driver, or restructuring the route → service split.
- Don't introduce a separate validation layer; the Zod schema in `defineRoute` is the single source of truth.

## Engineering discipline

- Routes stay thin: parse → call service → respond. Anything else belongs in a service.
- Services take `db` as the first argument so they're testable and composable.
- Treat `docs/openapi.json` like any generated artifact in modern repos (Prisma client, GraphQL schema, gRPC stubs): commit it so PR diffs show the API surface change.
- For meaningful changes, include verification notes: `npm run lint`, `npm run openapi:check`, and a manual smoke against the affected endpoint.
- Keep DevOps assumptions in `package.json` scripts so CI can run them verbatim.
- Security posture: validate aggressively at the edge with Zod, hash all stored secrets, sign all outbound webhooks, defend against SSRF on every outbound call, rate-limit by IP, scope and expire API keys.

## Common pitfalls

- **Spec drift:** Forgetting `npm run openapi:generate` after a route change. Use `npm run dev` while developing; it regenerates on every restart. CI's `openapi:check` catches anything that slips through.
- **Wrong prefix:** Using `withPrefix(Router(), '/tasks')` but mounting at `/api/v1/cards` in `server.js` produces a spec with paths that don't match the live API. Keep the prefix and mount point aligned.
- **Path params on routes mounted under another prefix:** Route files mounted at `/api/v1` (comments, attachments, checklists, watchers, presence, activity, api-keys, webhooks, workspaceAssets) declare full paths like `/workspaces/:workspaceId/...`. Don't double-prefix them.
- **Sync DB ops in async handlers:** `better-sqlite3` is synchronous. No `await` on `db.prepare(...).run()`. Async handlers are fine; just don't `await` the queries.
- **Logging req.body for auth routes:** Strip `password`, `token`, `secret` before logging.
- **Missing transactions on multi-write paths:** Anything that updates more than one row across two tables should be wrapped in `db.transaction(...)`.
- **OAuth profile stomp:** `findOrCreateOAuthUser` only seeds name/avatar on first link. Subsequent logins must return the existing row unchanged so user edits via `/auth/me` survive.
- **Webhook event slugs:** Events are stored as slugs (`task.created`, not `Task Created`). The dispatcher matches on slugs, the Zod schema rejects anything else, and the frontend whitelist in `webhookEvents.js` is the single source of truth.
- **API key `expires_at`:** Validate as ISO-8601 in the Zod schema. Don't accept arbitrary strings; the comparison is lexicographic against ISO timestamps.
- **Webhook `active` flag:** Stored as `0/1` integer. Don't compare against `false` (which is always truthy for `0`/`1`). Use `=== 1` or `!== 0`.
- **Missing route file in seed/dev:** New `routes/foo.js` is picked up automatically by `loadRoutes.js`. If it doesn't appear in the spec, the file probably has a syntax error. `npm run openapi:generate` will surface it.

## Further reading

- Top-level setup and architecture: `../README.md`
- Frontend rules: `../AGENTS.md`
- Docs portal rules: `../docs/AGENTS.md`
- Backend setup + OpenAPI workflow: `README.md`
- Threat model + Vercel/Supabase deploy hardening: `../docs/SECURITY.md`
- Route + spec registration: `src/openapi/route.js`
- Shared schemas: `src/openapi/schemas.js`
