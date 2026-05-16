# AGENTS.md

## Persona

You are a backend engineer working on the Jokel REST API. You write small, focused modules with clear separation between routing, validation, business logic, and persistence. The OpenAPI spec is a build artifact, not a hand-written file. Keep diffs minimal, security defaults strict, and the route → service → db layering honest.

## Stack

- Node.js 20+ (ESM, `"type": "module"`)
- Express 4
- SQLite via `better-sqlite3` (synchronous, single file)
- JWT auth (`jsonwebtoken`) plus API keys (SHA-256 hashed)
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

## Project Structure

```txt
backend/src/
  config.js              # Env vars + IS_DEV/IS_PROD flags
  db.js                  # SQLite handle, schema bootstrap
  seed.js                # Demo data seeder
  server.js              # App entry: middleware chain, route mounting
  middleware/
    apikey.js            # X-API-Key header / ?api_key= query auth
    audit.js             # Audit log for 401/403/429 responses
    auth.js              # JWT verification, requireAuth
    error.js             # AppError + global error handler
    logger.js            # Request logging
    validate.js          # sanitizeString / isValidEmail / isValidUUID helpers
  openapi/
    registry.js          # Single OpenAPIRegistry instance + buildOpenApiDocument
    schemas.js           # Shared domain Zod schemas (User, Task, Workspace, ...)
    route.js             # defineRoute, withPrefix, validate
    generate.js          # Writes docs/openapi.json (CLI + dev startup)
    check.js             # CI drift guard
  routes/
    activity.js          # GET /workspaces/:id/activity
    api-keys.js          # API key CRUD
    attachments.js       # File uploads (multer)
    auth.js              # /auth/register, /auth/login, /auth/me
    board.js             # GET /board/:workspaceId
    checklists.js        # Checklists + items
    columns.js           # Kanban columns
    comments.js          # Task comments
    docs.js              # Static docs portal + GET /api/spec
    presence.js          # Heartbeat + online users (in-memory)
    system.js            # GET /health
    tasks.js             # Tasks + move/batch/archive/restore/purge
    webhooks.js          # Webhooks + signing + test ping
    workspaces.js        # Workspace CRUD + members
  services/
    activityService.js
    attachmentService.js
    authService.js
    boardService.js
    checklistService.js
    columnService.js
    commentService.js
    taskService.js
    webhookService.js
    workspaceService.js
```

## Source of Truth

- **OpenAPI:** `docs/openapi.json` is generated from `defineRoute()` calls in `routes/*.js`. Never hand-edit. CI runs `npm run openapi:check` to enforce.
- **Schemas:** Domain models live in `src/openapi/schemas.js` (`User`, `Task`, `Workspace`, etc.). Routes import these for both validation and spec entries.
- **DB:** SQL DDL lives in `database/schema.sql`. `db.js` applies it at startup. `localStorage` (frontend) is **not** persistence — only a JWT/user cache.

## The `defineRoute` Pattern

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

- `withPrefix(Router(), '/tasks')` sets the OpenAPI path prefix without changing how the router mounts in `server.js`.
- `path: '/:id/move'` (Express) becomes `/{id}/move` in the spec automatically.
- `public: true` opts out of the global security requirement.
- `multipart: SchemaForFormData` describes a file upload; pair with `middleware: [upload.single('file')]`.
- Use `errorResponse('msg')` from `openapi/schemas.js` for standard 4xx response entries.

## Conventions

### Layering

- **Routes** parse the request, call services, format the response. No SQL.
- **Services** own SQL and business invariants. They take `db` as the first arg so tests can inject. They throw `AppError` for known failures.
- **Middleware** is cross-cutting: auth, rate limit, logging, audit, error handling.

### Errors

- Throw `AppError(message, status, code)` from `middleware/error.js`. Don't return ad-hoc error JSON from handlers.
- Common codes: `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`, `INSUFFICIENT_SCOPE`.
- Validation errors come automatically from the Zod parser — don't wrap them.

### Security

- `helmet` is the baseline. Don't loosen `script-src` to `'unsafe-eval'` or add CDNs without a strong reason; the docs portal works without them.
- Auth has two paths: JWT bearer (browser) and API key (bots/CI). Both end with `req.userId` populated.
- API keys are stored as SHA-256 hashes; the raw key is shown once at creation.
- Webhook payloads are signed HMAC-SHA256 with a per-webhook secret.
- Rate limit: 100 req / 15 min in prod (1000 in dev), with a stricter 10 / 15 min on `/auth/*` in prod.
- Sanitize free-text fields with `sanitizeString(value, maxLength)` before insert.
- Never log raw secrets, passwords, or full JWTs.

### Database

- `better-sqlite3` is synchronous. No `await` for queries.
- Use prepared statements (`db.prepare(...)`) and pass parameters positionally.
- Wrap multi-write operations in `db.transaction(...)`.
- Schema changes go in `database/schema.sql`. Bump the implicit shape there, not via runtime migrations.
- Foreign keys are enforced (`PRAGMA foreign_keys = ON`). Plan delete cascades carefully.

### Routing

```txt
/api/health                          system
/api/v1/auth/*                       auth
/api/v1/workspaces/*                 workspaces, members, activity, presence, api-keys, webhooks
/api/v1/board/:workspaceId           board
/api/v1/columns/*                    columns
/api/v1/tasks/*                      tasks + comments + attachments + checklists
/api/v1/checklists/:id/items         checklist items
/api/v1/checklist-items/:id          toggle items
/api/docs                            static docs portal
/api/spec                            generated OpenAPI JSON
```

## Adding New Features

### New endpoint on an existing resource

1. Edit the right `routes/<resource>.js`. Add a `defineRoute(...)` block. Define the Zod body/params/query inline or import a shared schema from `openapi/schemas.js`.
2. Put business logic in the matching `services/<resource>Service.js`.
3. Run `npm run dev` (auto-regenerates the spec) or `npm run openapi:generate`.
4. Commit the route file, service file, and `docs/openapi.json` together.

### New resource (a new noun)

1. Create `routes/<resource>.js` and `services/<resource>Service.js`.
2. Add domain schema(s) to `openapi/schemas.js` and register them with `registry.register('Name', ...).openapi('Name')`.
3. Mount the router in `server.js` under the right prefix.
4. Add the side-effect import to **both** `openapi/generate.js` and `openapi/check.js` so the spec generator sees it.
5. Add a tag entry to `openapi/registry.js#buildOpenApiDocument().tags`.
6. Run `npm run openapi:generate` and commit.

### New shared schema

1. Add to `openapi/schemas.js` and register it on the registry.
2. Import it where needed. Reuse before duplicating.

## Boundaries

- Always run `npm run lint` and `npm run openapi:check` before finishing.
- Never hand-edit `docs/openapi.json`. Regenerate from code.
- Never bypass the `defineRoute` pattern. If a route exists in code but not in the spec, CI fails.
- Never add `'unsafe-eval'` or external script CDNs to CSP without explicit approval.
- Never log secrets, passwords, raw API keys, or full JWTs.
- Never run `git commit`, `git push`, `git reset`, or destructive git commands without explicit approval.
- Ask first before adding npm packages, changing the auth model, swapping the DB driver, or restructuring the route → service split.
- Don't introduce a separate validation layer; the Zod schema in `defineRoute` is the single source of truth.

## Engineering Discipline

- Routes stay thin: parse → call service → respond. Anything else belongs in a service.
- Services take `db` as the first argument so they're testable and composable.
- Treat `docs/openapi.json` like any generated artifact in modern repos (Prisma client, GraphQL schema, gRPC stubs): commit it so PR diffs show the API surface change.
- For meaningful changes, include verification notes: `npm run lint`, `npm run openapi:check`, and a manual smoke against the affected endpoint.
- Keep DevOps assumptions in `package.json` scripts so CI can run them verbatim.
- Security posture: validate aggressively at the edge with Zod, hash all stored secrets, sign all outbound webhooks, rate-limit by IP.

## Common Pitfalls

- **Spec drift:** Forgetting `npm run openapi:generate` after a route change. Use `npm run dev` while developing — it regenerates on every restart. CI's `openapi:check` is the safety net.
- **Forgetting the side-effect import:** Adding a new `routes/foo.js` but not importing it in `openapi/generate.js` and `check.js` means the route won't appear in the spec even though it works in Express.
- **Wrong prefix:** Using `withPrefix(Router(), '/tasks')` but mounting it at `/api/v1/cards` in `server.js` will produce a spec with paths that don't match the live API. Keep the prefix and the mount point aligned.
- **Path params on routes mounted under another prefix:** Route files mounted at `/api/v1` (comments, attachments, checklists, presence, activity, api-keys, webhooks) declare full paths like `/workspaces/:workspaceId/...`. Don't double-prefix them.
- **Sync DB ops in async handlers:** `better-sqlite3` is synchronous — no `await` on `db.prepare(...).run()`. Async handlers are fine; just don't `await` the queries.
- **Logging req.body for auth routes:** Strip `password`, `token`, `secret` before logging.
- **Missing transactions on multi-write paths:** Anything that updates more than one row in two tables should be wrapped in `db.transaction(...)`.

## Further Reading

- Top-level setup and architecture: `../README.md`
- Frontend conventions (theme/palette also bind the docs portal): `../AGENTS.md`
- Docs portal rules and renderer: `../docs/AGENTS.md`
- Backend setup and OpenAPI workflow: `README.md`
- Route + spec registration: `src/openapi/route.js`
- Shared schemas: `src/openapi/schemas.js`
