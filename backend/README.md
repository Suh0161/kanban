# Elevate Backend API

The REST API for Elevate. Express on top of `better-sqlite3`, with Zod schemas that double as both request validators and the source of the OpenAPI spec.

For repo-wide context, demo credentials, and overall architecture, see the [top-level README](../README.md).

---

## Stack

| Layer    | Choice                                                          |
| -------- | --------------------------------------------------------------- |
| Runtime  | Node.js 20+ (ESM)                                               |
| Framework | Express 4                                                       |
| Database | SQLite via `better-sqlite3` (synchronous, single file)          |
| Auth     | JWT (HS256, 7d) + bcrypt (cost 12) + API keys (SHA-256) + OAuth 2.0 (Google, GitHub) |
| Validation | Zod 4                                                          |
| Spec      | `@asteasolutions/zod-to-openapi` → `docs/openapi.json`        |
| Uploads   | Multer at the edge → swappable storage backend (`services/storage/`) |
| Hardening | Helmet, `express-rate-limit`, CORS allowlist, audit log, SSRF guard on outbound webhooks |

---

## Prerequisites

- Node.js `>= 20`
- npm

---

## Installation

```bash
cd backend
npm install
cp .env.example .env             # then edit .env (see below)
npm run seed                     # demo data
npm run dev                      # http://localhost:3001
```

---

## Environment variables

All configuration is read from `backend/.env`. See `.env.example` for the full list with comments.

| Variable                | Purpose                                                            | Required |
| ----------------------- | ------------------------------------------------------------------ | -------- |
| `NODE_ENV`              | `development` / `production`                                       | no       |
| `PORT`                  | HTTP port                                                          | no (3001)|
| `FRONTEND_URL`          | Allowed CORS origin (comma-separate for multiple)                  | yes (prod)|
| `JWT_SECRET`            | HS256 signing secret. Min 32 chars in production. Rotating it invalidates all sessions. | yes (prod)|
| `DB_PATH`               | SQLite file path                                                   | no       |
| `DATABASE_URL`          | Postgres connection string when running off SQLite                 | no       |
| `AUDIT_LOG_ENABLED`     | Toggle the audit log lines in console                              | no       |
| `DEMO_PASSWORD`         | Used by `npm run seed` only                                        | no       |
| `GOOGLE_CLIENT_ID/SECRET`   | Enable Google OAuth (provider hidden if blank)                 | no       |
| `GITHUB_CLIENT_ID/SECRET`   | Enable GitHub OAuth (provider hidden if blank)                 | no       |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | When migrating off SQLite | no       |

The OAuth `/auth/oauth/providers` endpoint only advertises providers that have **both** client id and secret set, so the frontend never renders a button that won't work.

---

## Scripts

| Command                     | What it does                                                       |
| --------------------------- | ------------------------------------------------------------------ |
| `npm run dev`               | `node --watch src/server.js` on `:3001`. Regenerates `docs/openapi.json` on startup. |
| `npm start`                 | Production mode (no watcher).                                      |
| `npm run build`             | No compile step. Runs `prebuild` which regenerates the spec.       |
| `npm run seed`              | Populates `users`, `workspaces`, `workspace_members`, `columns`, `tasks`, sample comments + checklists. |
| `npm run lint`              | ESLint over `src/`.                                                |
| `npm run lint:fix`          | ESLint auto-fix.                                                   |
| `npm run openapi:generate`  | Rebuild `docs/openapi.json` from the routes that `loadRoutes.js` discovers. |
| `npm run openapi:check`     | CI guard. Rebuilds the spec in memory and exits non-zero if the committed file is stale. |

---

## Project structure

```
backend/src/
├── config.js                   # env vars + IS_DEV/IS_PROD + JWT/CORS guards
├── db.js                       # SQLite handle, schema bootstrap, idempotent migrations
├── seed.js                     # Demo data seeder
├── server.js                   # Middleware chain, route mounting, OpenAPI warm
│
├── middleware/
│   ├── apikey.js               # X-API-Key / ?api_key= auth
│   ├── audit.js                # Audit log for 401/403/429
│   ├── auth.js                 # JWT verification, requireAuth
│   ├── error.js                # AppError + global handler
│   ├── logger.js               # Request logging + X-Request-Id
│   └── validate.js             # sanitizeString / isValidEmail / isValidUUID
│
├── openapi/
│   ├── registry.js             # Single OpenAPIRegistry + buildOpenApiDocument
│   ├── schemas.js              # Shared domain Zod schemas (User, Task, Workspace, ...)
│   ├── route.js                # defineRoute / withPrefix / validate
│   ├── loadRoutes.js           # Walks routes/ and dynamic-imports each file
│   ├── generate.js             # CLI: writes docs/openapi.json
│   └── check.js                # CI: rebuilds in memory, diffs the committed spec
│
├── routes/                     # Auto-discovered by loadRoutes.js. No manual import list.
│   ├── activity.js             # Workspace activity feed
│   ├── api-keys.js             # API key CRUD (hashed, scoped, expiring)
│   ├── attachments.js          # File uploads + signed-URL stream
│   ├── auth.js                 # /auth/register, /auth/login, /auth/me
│   ├── avatars.js              # User avatar upload (object storage)
│   ├── board.js                # GET /board/:workspaceId
│   ├── checklists.js           # Checklists + items
│   ├── columns.js              # Kanban columns
│   ├── comments.js             # Task comments
│   ├── docs.js                 # Static docs portal + GET /api/spec
│   ├── oauth.js                # /auth/oauth/providers + /:provider/start + /:provider/callback
│   ├── presence.js             # Heartbeat + online users (in-memory)
│   ├── system.js               # GET /health
│   ├── tasks.js                # Tasks + move/batch/archive/restore/purge
│   ├── watchers.js             # Watch / unwatch a task
│   ├── webhooks.js             # Webhook CRUD + signing + test ping (SSRF-guarded)
│   ├── workspaceAssets.js      # Workspace logo + background upload
│   └── workspaces.js           # Workspace CRUD + members + transfer/leave
│
└── services/
    ├── storage/
    │   ├── index.js            # picks a backend; today only localDisk
    │   └── localDisk.js        # put/get/remove/exists on backend/uploads/
    ├── activityService.js
    ├── attachmentService.js
    ├── attachmentToken.js      # HMAC signed URLs for <img> tags
    ├── authService.js          # bcrypt + lockout + findOrCreateOAuthUser
    ├── avatarService.js
    ├── boardService.js
    ├── checklistService.js
    ├── columnService.js
    ├── commentService.js
    ├── oauthService.js         # Provider registry + HMAC-signed state for CSRF
    ├── taskService.js
    ├── watcherService.js
    ├── webhookService.js       # SSRF defense, HMAC signing, 5s timeout
    ├── workspaceAssetService.js
    └── workspaceService.js     # Role guards + transfer + leave + member CRUD
```

### Layering

- **Routes** parse the request, call services, format the response. **No SQL in routes.**
- **Services** own SQL and business invariants. They take `db` as the first arg so they're testable. They throw `AppError(message, status, code)` for known failures.
- **Middleware** is cross-cutting: auth, rate limit, logging, audit, error handling.

---

## API surface

```
GET  /api/health
*    /api/v1/auth/...
*    /api/v1/workspaces/...               # workspaces, members, activity, presence, api-keys, webhooks, assets
*    /api/v1/board/:workspaceId
*    /api/v1/columns/...
*    /api/v1/tasks/...                    # tasks + comments + attachments + checklists + watchers
*    /api/v1/checklists/:id/items
*    /api/v1/checklist-items/:id
*    /api/v1/avatars
GET  /api/docs                            # static portal
GET  /api/spec                            # generated OpenAPI 3.0 JSON
```

The full list lives in `docs/openapi.json` and renders at `http://localhost:3001/api/docs/reference`.

---

## Authentication

Two paths, both end with `req.userId` populated:

### JWT bearer (browsers)

```http
Authorization: Bearer <jwt>
```

- Tokens issued by `/auth/login`, `/auth/register`, or the OAuth callback (returned via URL fragment to the SPA's `/oauth/callback` page).
- HS256, 7-day expiry. Set `JWT_SECRET` to at least 32 chars in production.
- Account lockout after 5 failed logins → 15-minute lock.

### API key (bots / CI)

```http
X-API-Key: <key>
```

Or as a query parameter: `?api_key=<key>`.

- Stored as SHA-256 hashes; raw key is shown **once** at creation.
- Scoped (`read`, `write`) and optionally expiring (ISO timestamp).
- The frontend manages key rotation in workspace Settings → Integrations.

### OAuth 2.0 (Google, GitHub)

- Authorization Code flow with HMAC-signed state for CSRF.
- `findOrCreateOAuthUser` links by `(provider, provider_user_id)` first, then falls back to email match. Provider data only **seeds** the row on first link. Subsequent logins keep the existing row, so user edits to name and avatar survive.
- New providers are added by:
  1. Setting `<PROVIDER>_CLIENT_ID/SECRET` in `.env`.
  2. Registering the provider in `oauthService.js`.

---

## Permissions

Roles: `owner > admin > member > viewer`.

| Capability                | owner | admin | member | viewer |
| ------------------------- | :---: | :---: | :----: | :----: |
| View workspace + board    |   ✓   |   ✓   |   ✓    |   ✓    |
| Create/edit/move tasks    |   ✓   |   ✓   |   ✓    |        |
| Manage members            |   ✓   |   ✓   |        |        |
| Manage API keys/webhooks  |   ✓   |   ✓   |        |        |
| Rename/delete workspace   |   ✓   |   ✓   |        |        |
| Transfer ownership        |   ✓   |       |        |        |

Enforced by `assertWorkspaceMember`, `assertCanEdit`, `assertCanManageWorkspace`, `assertIsOwner` in `services/workspaceService.js`. The DB has a CHECK constraint on roles and a partial unique index that guarantees one owner per workspace.

---

## OpenAPI: spec is generated from code

Every route is registered through `defineRoute()` (see `src/openapi/route.js`), which:

1. Validates the request with a Zod schema (body, params, query)
2. Adds the route to the OpenAPI registry with the same schema

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
    // req.body is already validated
  }
);
```

Key points:

- `withPrefix(Router(), '/tasks')` sets the OpenAPI path prefix without changing how the router mounts in `server.js`. Keep them aligned.
- `path: '/:id/move'` (Express) becomes `/{id}/move` in the spec automatically.
- `public: true` opts out of the global security requirement.
- `multipart: SchemaForFormData` describes a file upload; pair with `middleware: [upload.single('file')]`.
- `errorResponse('msg')` from `openapi/schemas.js` produces a standard 4xx response entry.

### Workflow

```bash
# Add or change a route + Zod schema in src/routes/...
# Save the file. `npm run dev` regenerates docs/openapi.json automatically.
git add src/routes/yourfile.js src/services/yourService.js docs/openapi.json
```

### CI

```bash
npm run openapi:check
```

Rebuilds the spec in memory and exits non-zero if the committed `docs/openapi.json` is stale. CI uses this to keep the generated artifact in sync with the code.

> `routes/foo.js` files are auto-discovered by `openapi/loadRoutes.js`. There is no import list to update when you add a new route file.

---

## Database

- **Schema:** `database/schema.sql` is the source of truth. Applied at startup. Idempotent migrations in `db.js` (e.g. adding a column to `users` for OAuth nullability).
- **Default path:** `./database/jokel.db` (override with `DB_PATH`).
- **Foreign keys** are enforced (`PRAGMA foreign_keys = ON`).
- **Multi-write paths** must be wrapped in `db.transaction(...)`.
- **Timestamps** use `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` so they round-trip as ISO-8601 UTC. Old rows without `Z` are rewritten on boot.

Tables: `users`, `oauth_identities`, `workspaces`, `workspace_members`, `columns`, `tasks`, `task_tags`, `task_watchers`, `comments`, `attachments`, `checklists`, `checklist_items`, `activity_log`, `api_keys`, `webhooks`.

For Postgres / Supabase, `database/supabase/schema.sql` mirrors the schema and adds Row Level Security policies. The current code path is SQLite. Migration notes are in `docs/SECURITY.md`.

---

## File uploads

Three upload surfaces, all flowing through `services/storage/`:

| Surface                        | Route                                                          | Cap   | Storage key prefix |
| ------------------------------ | -------------------------------------------------------------- | ----- | ------------------ |
| Task attachments               | `POST /api/v1/tasks/:taskId/attachments`                       | 5 MB  | `task-<id>/`       |
| User avatar                    | `POST /api/v1/avatars`                                         | 2 MB  | `avatars/<userId>/`|
| Workspace logo                 | `POST /api/v1/workspaces/:id/assets/logo`                      | 2 MB  | `logos/`           |
| Workspace background           | `POST /api/v1/workspaces/:id/assets/background`                | 5 MB  | `backgrounds/`     |

- All uploads do **magic-byte sniffing** (don't trust `Content-Type`).
- DB rows store metadata: `storage_key`, `mime_type`, `size`, `sha256`. The `url` field is a stable API path so the storage layout can change without invalidating clients.
- **Serving:** `GET /api/v1/attachments/:id/file` streams bytes after auth + workspace-membership check. Browsers can't send `Authorization` on `<img src>`, so the API issues short-lived **HMAC signed URLs** (`?token=<...>`), the same approach as S3 presigned URLs (`services/attachmentToken.js`).
- **Cleanup:** `DELETE /api/v1/attachments/:id` removes the row and asks the storage backend to drop the bytes.

> **Local-disk storage is fine for a single-node deployment but does not survive multi-instance scale-out.** To move to S3, add `services/storage/s3.js` with the same four methods (`put`, `get`, `remove`, `exists`) and switch the import in `services/storage/index.js`. No route, schema, or client change required.

---

## Webhooks

Workspace-scoped outbound HTTP callbacks for task lifecycle events.

- Per-webhook `secret` signs every payload as `X-Elevate-Signature: sha256=<hex>` (HMAC-SHA256).
- Events are slugs (`task.created`, `task.updated`, `task.moved`, `task.deleted`, ...). The frontend whitelist + the backend Zod schema share a single source of truth in `frontend/.../webhookEvents.js`.
- **SSRF defense:** the dispatcher resolves the URL's hostname, rejects RFC1918 addresses, IPv4 link-local (`169.254/16`, AWS IMDS), IPv6 ULA + link-local + loopback. Manual redirect handling. 5-second timeout.
- **Test ping** sends a synthetic event so admins can verify the receiver before going live.

---

## Security defaults

- **Helmet** sets secure headers. CSP locked down, no `unsafe-eval`, no external script CDNs. `crossOriginResourcePolicy: cross-origin` only for static uploads.
- **Rate limit:** 100 req / 15 min globally (1000 in dev). Stricter 10 / 15 min on `/auth/*` in prod.
- **CORS:** explicit allowlist driven by `FRONTEND_URL`. Credentials enabled.
- **Input validation:** Zod on body, params, and query for every `defineRoute` call. The same schema drives the OpenAPI spec, so docs and runtime checks stay in sync.
- **Body limits:** JSON + URL-encoded payloads capped at `1mb`. Upload routes have their own caps.
- **Audit log:** 401 / 403 / 429 responses are logged with request id (`X-Request-Id`) for correlation.
- **No secrets in logs.** Strip `password`, `token`, `secret` before logging request bodies.

Full threat model lives in [`../docs/SECURITY.md`](../docs/SECURITY.md).

---

## Error format

All errors follow a consistent JSON shape:

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "requestId": "rq_abc123"
}
```

In `development`, an extra `stack` field is included.

| Code                    | Meaning                                          |
| ----------------------- | ------------------------------------------------ |
| `UNAUTHORIZED`          | Missing or invalid JWT / API key                 |
| `FORBIDDEN`             | Authenticated but role-gated                     |
| `NOT_FOUND`             | Route or resource missing                        |
| `VALIDATION_ERROR`      | Zod parse failed on body, params, or query       |
| `RATE_LIMITED`          | Too many requests                                |
| `INSUFFICIENT_SCOPE`    | API key missing the required scope               |
| `INTERNAL_ERROR`        | Unexpected server error                          |

---

## Verify with a throwaway test before pushing

Elevate doesn't ship a permanent test suite yet. For any non-trivial backend change, the workflow is:

1. Write a small scratch script at the backend root: `backend/tmp-test-<topic>.mjs`. **Don't put it under `src/`**, that path is reserved for production code.
2. Open an isolated `:memory:` SQLite (`new Database(':memory:')`) and load `database/schema.sql` against it. Don't touch the real `database/jokel.db`.
3. Import the service or route, call the function with the inputs that exercise your change, and assert with Node's built-in `node:assert/strict`.
4. Cover the happy path **and** the failure mode you're fixing or guarding against. A test that would have passed before the change isn't a real test.
5. Run `npm run lint` and `npm run openapi:check`, then run the scratch script. If it passes, **delete the file**.
6. `git status` must show zero `tmp-*` or `*.scratch.*` files before you commit. The PR diff should only contain the production change and the regenerated `docs/openapi.json` if it moved.
7. Mention what the scratch test asserted in the PR description. The script is gone, but the verification fact stays.

A working template lives in `AGENTS.md` under "Verify with a throwaway test before pushing".

Skip this for pure refactors covered by ESLint, doc-only changes, or spec regeneration with no behavior change.

---

## Health check

```http
GET /api/health
```

```json
{ "ok": true, "env": "production" }
```

Use this for load-balancer probes and to confirm the active environment.

---

## Conventions checklist (before opening a PR)

- [ ] `npm run lint` clean
- [ ] `npm run openapi:check` clean (commit `docs/openapi.json` if it changed)
- [ ] No SQL in routes
- [ ] No `await` on `better-sqlite3` queries
- [ ] Multi-write paths wrapped in `db.transaction(...)`
- [ ] No raw secrets, passwords, or full JWTs in logs
- [ ] CSP unchanged (no `unsafe-eval`, no external CDNs)
- [ ] Manual smoke test of the affected endpoint
- [ ] For non-trivial logic changes, ran a scratch test (against `:memory:`) and deleted it before commit
- [ ] `git status` shows no `tmp-*` or `*.scratch.*` files

See [`AGENTS.md`](./AGENTS.md) for the full backend ruleset.
