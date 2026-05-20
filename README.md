# Elevate

A dark-themed Kanban and planning app. The frontend is a React 19 SPA, the backend is a Node + Express API on SQLite, and the OpenAPI spec is generated from the same Zod schemas the API validates against. JWT and OAuth (Google, GitHub) for auth, API keys for bots, signed webhooks, and object-storage uploads for avatars, workspace logos, backgrounds, and task attachments.

The database is the source of truth. `localStorage` only holds the JWT and a cached copy of the current user.

---

## Repository layout

```
elevate/
├── frontend/                 # React 19 SPA (Vite)
├── backend/                  # Express API + OpenAPI generator
├── database/
│   ├── schema.sql            # SQLite DDL (single source of truth at runtime)
│   └── supabase/
│       └── schema.sql        # Postgres + RLS mirror for Supabase deploys
├── docs/
│   ├── index.html            # Static docs portal (served at /api/docs)
│   ├── reference.html        # Custom OpenAPI renderer (no Scalar/Redoc)
│   ├── guides/               # Quickstart, Auth, Webhooks
│   ├── openapi.json          # Generated artifact, committed
│   ├── README.md
│   ├── AGENTS.md
│   └── SECURITY.md           # Threat model + Vercel/Supabase hardening notes
├── AGENTS.md                 # Workspace-wide rules for AI agents
├── README.md                 # ← you are here
└── LICENSE
```

---

## Stack

| Layer    | Choice                                                      |
| -------- | ----------------------------------------------------------- |
| Frontend | React 19, Vite, React Router v7, plain CSS, `@hello-pangea/dnd`, `lucide-react`, `marked` |
| Backend  | Node.js 20+, Express 4, `better-sqlite3`, Zod 4, Helmet, `express-rate-limit`, Multer |
| Auth     | JWT (HS256, 7d), bcrypt (cost 12), API keys (SHA-256 hashed), OAuth 2.0 (Google, GitHub) |
| Storage  | Object storage abstraction (`services/storage/`); local disk today, S3 backend can drop in |
| Spec     | OpenAPI 3.0 generated from Zod schemas via `defineRoute()` |
| Deploy   | Vercel frontend + **Railway** backend (Docker + volume); Fly legacy in `fly.toml` |

---

## Quickstart

Two terminals, one per service.

```bash
# 1. Backend
cd backend
cp .env.example .env             # then edit .env (set JWT_SECRET, FRONTEND_URL)
npm install
npm run seed                     # creates demo workspaces, users, columns, tasks
npm run dev                      # http://localhost:3001

# 2. Frontend
cd ../frontend
npm install
npm run dev                      # http://localhost:5173
```

Open <http://localhost:5173>.

### Demo credentials

| Field    | Value           |
| -------- | --------------- |
| Email    | `demo@demo.com` |
| Password | `Demo123`       |

You can also click **Continue as guest**, or sign in with Google/GitHub if the OAuth env vars are set (see `backend/.env.example`).

---

## Scripts

### Frontend (`cd frontend`)

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Vite dev server on `:5173` with HMR           |
| `npm run lint`    | ESLint                                        |
| `npm run build`   | Production build into `frontend/dist/`        |
| `npm run preview` | Preview the production build                  |

### Backend (`cd backend`)

| Command                     | What it does                                                  |
| --------------------------- | ------------------------------------------------------------- |
| `npm run dev`               | `node --watch src/server.js` on `:3001` (also regenerates `docs/openapi.json` on boot) |
| `npm start`                 | Production mode                                                |
| `npm run seed`              | Seeds demo data                                                |
| `npm run lint`              | ESLint on `src/`                                               |
| `npm run openapi:generate`  | Rebuilds `docs/openapi.json` from registered routes            |
| `npm run openapi:check`     | CI guard. Exits non-zero if `docs/openapi.json` is stale       |
| `npm run build`             | No compile step; runs `prebuild` which regenerates the spec    |

---

## Architecture

### Frontend

- **No Context API.** State lives in custom hooks (`useAuth`, `useBoard(workspaceId)`, `useWorkspaces`, `usePresence`, `useOauthProviders`).
- Routes are split between top-level (login, OAuth callback, legal, error pages) and workspace-scoped (`/workspace/:workspaceId/*` rendered by `WorkspaceLayout`).
- Workspace nav: `boards`, `backlog`, `my-work`, `team`, `settings`. The active view is persisted per-workspace in `localStorage`.
- Drag-and-drop runs through `useBoard.onDragEnd`; reorder writes are skipped while filters are active.
- Permission gate: `myRole` from the workspace API drives `canEdit`. Viewers never see write affordances (composer, status pickers, drag handles, delete).

```
frontend/src/
├── App.jsx                       # Top-level router + ErrorBoundary + offline banner
├── main.jsx                      # React entry
├── constants.js                  # Priorities + seed data
│
├── api/
│   └── client.js                 # Fetch wrapper, ApiError, signed-URL helper, 401 handler
│
├── hooks/
│   ├── useAuth.js                # JWT flow, shared subscription, normalized user
│   ├── useBoard.js               # Board state, drag-drop, CRUD, comments, attachments, watchers
│   ├── useWorkspaces.js          # Workspace list + role propagation
│   ├── usePresence.js            # Heartbeat-based "who's online"
│   ├── useOauthProviders.js      # Reads /auth/oauth/providers; hides un-configured buttons
│   ├── useKeyboardShortcuts.js   # Global shortcuts: ⌘K palette, j/k nav, etc.
│   └── useClickOutside.js
│
├── components/
│   ├── board/                    # Kanban canvas, columns, cards, composers, QuickStartCard
│   ├── layout/                   # Sidebar, Topbar, WorkspaceLayout
│   ├── modals/                   # NewIssueModal, Lightbox
│   ├── onboarding/               # Guided tour (components/, css/, storage/)
│   ├── ui/                       # Avatar, Select, FilterPanel, UserDropdown, ErrorBoundary, SearchPalette
│   └── views/
│       ├── analytics/            # AnalyticsView + components + css
│       ├── backlog/              # BacklogView + components + css
│       ├── error/                # 403 / 404 / 500 / Offline pages + ErrorState + OfflineBanner
│       ├── inbox/                # InboxView + components + css (folded into MyWork)
│       ├── legal/                # Privacy, Terms
│       ├── login/                # LoginPage + OauthCallback + css
│       ├── mytasks/              # MyTasksView (used by MyWork)
│       ├── mywork/               # MyWorkView + css (combines tasks + inbox)
│       ├── profile/              # ProfileModal (edit name / avatar)
│       ├── settings/             # SettingsView + components + css
│       ├── shared/               # ViewTaskRow
│       ├── task-detail/          # TaskDetailView + components + css
│       ├── team/                 # TeamView + components + css
│       └── workspace-list/       # WorkspaceList + components + css
│
├── styles/
│   ├── base/                     # variables.css, reset.css, animations.css
│   ├── board/                    # canvas, column, card, composer, menu, filter
│   ├── layout/                   # sidebar, topbar, buttons, workspace shell
│   └── modals/                   # modal, lightbox, attachments, comments, forms
│
└── utils/
    ├── helpers.js
    └── time.js                   # parseServerTime / formatRelativeTime / formatAbsoluteTime
```

### Backend

```
backend/src/
├── config.js                     # Env + IS_DEV/IS_PROD + JWT/CORS guards
├── db.js                         # SQLite handle, schema bootstrap, idempotent migrations
├── seed.js                       # Demo data
├── server.js                     # Middleware chain, route mounting, OpenAPI warm
│
├── middleware/
│   ├── apikey.js                 # X-API-Key auth
│   ├── audit.js                  # Audit log for 401/403/429
│   ├── auth.js                   # JWT verification, requireAuth
│   ├── error.js                  # AppError + global handler
│   ├── logger.js                 # Request logging
│   └── validate.js               # sanitizeString / isValidEmail / isValidUUID
│
├── openapi/
│   ├── registry.js               # Single OpenAPIRegistry + buildOpenApiDocument
│   ├── schemas.js                # Shared domain Zod schemas (User, Task, Workspace, ...)
│   ├── route.js                  # defineRoute / withPrefix / validate
│   ├── loadRoutes.js             # Walks routes/ and dynamic-imports each file
│   ├── generate.js               # CLI: writes docs/openapi.json
│   └── check.js                  # CI: rebuilds in memory and diffs the committed spec
│
├── routes/                       # Auto-discovered via loadRoutes.js
│   ├── activity.js               # Workspace activity feed
│   ├── api-keys.js               # API key CRUD (hashed, scoped, expiring)
│   ├── attachments.js            # File uploads + signed-URL stream
│   ├── auth.js                   # /auth/register, /auth/login, /auth/me
│   ├── avatars.js                # User avatar upload (object storage)
│   ├── board.js                  # GET /board/:workspaceId
│   ├── checklists.js             # Checklists + items
│   ├── columns.js                # Kanban columns
│   ├── comments.js               # Task comments
│   ├── docs.js                   # Static docs portal + GET /api/spec
│   ├── oauth.js                  # /auth/oauth/providers + /:provider/start + /callback
│   ├── presence.js               # Heartbeat + online users (in-memory)
│   ├── system.js                 # GET /health
│   ├── tasks.js                  # Tasks + move/batch/archive/restore/purge
│   ├── watchers.js               # Watch/unwatch a task
│   ├── webhooks.js               # Webhooks + signing + test ping (with SSRF guard)
│   ├── workspaceAssets.js        # Workspace logo + background upload
│   └── workspaces.js             # Workspace CRUD + members + transfer/leave
│
└── services/
    ├── storage/                  # Object storage abstraction
    │   ├── index.js              # picks backend; today only localDisk
    │   └── localDisk.js          # put/get/remove/exists on backend/uploads/
    ├── activityService.js
    ├── attachmentService.js
    ├── attachmentToken.js        # HMAC signed URLs (browsers can't send Authorization on <img>)
    ├── authService.js            # bcrypt + lockout + findOrCreateOAuthUser
    ├── avatarService.js
    ├── boardService.js
    ├── checklistService.js
    ├── columnService.js
    ├── commentService.js
    ├── oauthService.js           # Provider registry + HMAC-signed state for CSRF
    ├── taskService.js
    ├── watcherService.js
    ├── webhookService.js         # SSRF defense, HMAC signing, 5s timeout
    ├── workspaceAssetService.js
    └── workspaceService.js       # Role guards + transfer + leave + member CRUD
```

### Database

| Asset                          | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `database/schema.sql`          | SQLite DDL applied at startup. Single source of truth.      |
| `database/supabase/schema.sql` | Postgres mirror with Row Level Security for Supabase.       |
| `database/jokel.db`            | Local dev DB. **Never committed** (gitignored).             |

Tables: `users`, `oauth_identities`, `workspaces`, `workspace_members`, `columns`, `tasks`, `task_tags`, `task_watchers`, `comments`, `attachments`, `checklists`, `checklist_items`, `activity_log`, `api_keys`, `webhooks`.

Timestamps are ISO-8601 UTC (`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`). The frontend parses them with `utils/time.js`, so timezone offsets stay correct.

---

## Routing

### Frontend routes (`App.jsx`)

| Path                                  | Component                            |
| ------------------------------------- | ------------------------------------ |
| `/`                                   | LoginPage                            |
| `/oauth/callback`                     | OauthCallback                        |
| `/privacy`                            | PrivacyPage                          |
| `/terms`                              | TermsPage                            |
| `/workspace`                          | WorkspaceList                        |
| `/workspace/:workspaceId`             | WorkspaceLayout (active view)        |
| `/workspace/:workspaceId/tasks/:code` | WorkspaceLayout → TaskDetailView     |
| `/403` `/404` `/500` `/offline`       | Direct error pages                   |
| `*`                                   | NotFoundPage (catch-all)             |

`WorkspaceLayout` swaps the main view via `activeView`: `boards`, `backlog`, `my-work`, `team`, `settings`.

### Backend routes

```
GET  /api/health
*    /api/v1/auth/...               register, login, me, oauth providers/start/callback
*    /api/v1/workspaces/...         workspaces, members, activity, presence, api-keys, webhooks, assets
*    /api/v1/board/:workspaceId
*    /api/v1/columns/...
*    /api/v1/tasks/...              tasks + comments + attachments + checklists + watchers
*    /api/v1/checklists/:id/items
*    /api/v1/checklist-items/:id
GET  /api/docs                      static docs portal
GET  /api/spec                      generated OpenAPI 3.0 JSON
```

---

## OpenAPI: spec is generated from code

Every route is registered through `defineRoute()` (see `backend/src/openapi/route.js`), which:

1. Validates the request with a Zod schema (body, params, query)
2. Adds the route to the OpenAPI registry with the same schema

`docs/openapi.json` is a build artifact, committed to git. CI runs `npm run openapi:check`, which rebuilds the spec in memory and exits non-zero if the committed file is stale.

```js
defineRoute(router, {
  method: 'post',
  path: '/',
  tag: 'Tasks',
  summary: 'Create task',
  body: CreateTaskBody,
  responses: { 201: { description: 'Created', schema: Task } },
}, (req, res, next) => {
  // req.body is already validated
});
```

The static docs portal at `/api/docs` is plain HTML/CSS/JS (no Scalar/Redoc/Swagger UI). The reference page fetches `/api/spec` on load and renders cards via `docs/assets/reference.js`.

---

## Auth, permissions, and security

- **JWT bearer** for browsers, **API key** for bots/CI. Both end with `req.userId` populated.
- **API keys**: SHA-256 hashed at rest, raw key shown once at creation, scoped (`read`/`write`), optional ISO expiry.
- **Role hierarchy**: `owner > admin > member > viewer`. Enforced by `assertWorkspaceMember`, `assertCanEdit`, `assertCanManageWorkspace`, `assertIsOwner` in `workspaceService.js`. Guarded by SQL CHECK + a partial unique index for one-owner-per-workspace.
- **Webhooks**: HMAC-SHA256 signed per-webhook secret, SSRF defense (DNS resolve + RFC1918/IMDS rejection, 5s timeout, manual redirect handling).
- **OAuth**: Authorization Code flow with HMAC-signed state for CSRF. Provider data only seeds the row on first link. Subsequent logins keep the existing row, so user edits to name and avatar survive.
- **CSP**: locked down via Helmet. No `unsafe-eval`, no external script CDNs.
- **Rate limit**: 100 / 15 min globally in production, stricter 10 / 15 min on `/auth/*`.
- **CORS**: explicit allowlist driven by `FRONTEND_URL`.

Full threat model and Vercel/Supabase hardening notes live in [`docs/SECURITY.md`](./docs/SECURITY.md).

---

## File uploads

Three upload surfaces, all flowing through `services/storage/`:

| Surface                  | Route                                                | Cap   | Storage key prefix |
| ------------------------ | ---------------------------------------------------- | ----- | ------------------ |
| Task attachments         | `POST /api/v1/tasks/:taskId/attachments`             | 5 MB  | `task-<id>/`       |
| User avatar              | `POST /api/v1/avatars`                               | 2 MB  | `avatars/<userId>/`|
| Workspace logo + background | `POST /api/v1/workspaces/:id/assets/{logo,background}` | 2 MB / 5 MB | `logos/`, `backgrounds/` |

All uploads do magic-byte sniffing, store SHA-256 + size + mime metadata in the DB, and serve through authenticated streams. Browsers can't send `Authorization` on `<img src>`, so the API issues short-lived HMAC-signed URLs (`?token=...`), the same approach as S3 presigned URLs. To move to S3, add a new file in `services/storage/` with the same `put/get/remove/exists` methods. No route or schema change needed.

---

## Development workflow

1. Make a change.
2. Backend: `npm run lint && npm run openapi:check`. Commit `docs/openapi.json` if it changed.
3. Frontend: `npm run lint && npm run build`.
4. For non-trivial logic changes, write a small scratch test (e.g. `tmp-test-foo.mjs` at the workspace root), run it, confirm it passes, then **delete it**. The PR diff should only contain production code. See `AGENTS.md` for the full convention.
5. Smoke the affected flow manually.
6. Open a PR (never push to `main` without one).

> ⚠️ On Windows, **stop the backend before running `git commit/push`**. SQLite holds a WAL lock on `database/jokel.db` that confuses git's working-tree scan.

---

## Deployment notes

- **Frontend on Vercel.** Set `VITE_API_BASE` to `https://app.arcnvd.com/api/v1`.
- **Backend on Railway.** Docker + volume at `/data`. Set `JWT_SECRET`, `FRONTEND_URL`, `PUBLIC_API_URL`, `DB_PATH=/data/elevate.db`, `UPLOADS_DIR=/data/uploads`. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
- **SQLite on Railway volume.** Single replica; backup `/data/elevate.db` periodically.
- **Postgres / Supabase.** `database/supabase/schema.sql` is a migration target, not the current runtime DB path. Supabase Storage can be used for uploads only; it does not make the main database Supabase unless the DB layer is migrated to `DATABASE_URL`. Migration notes are in `docs/SECURITY.md`.

---

## Documentation

| File                  | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `README.md`           | This file. Architecture overview + onboarding.           |
| `AGENTS.md`           | Workspace rules for AI agents (frontend persona).        |
| `frontend/README.md`  | Frontend-specific commands + structure                   |
| `backend/README.md`   | Backend setup + OpenAPI workflow                         |
| `backend/AGENTS.md`   | Backend rules for AI agents                              |
| `docs/README.md`      | Docs portal structure + conventions                      |
| `docs/AGENTS.md`      | Docs-portal rules for AI agents                          |
| `docs/SECURITY.md`    | Threat model + Vercel/Supabase deploy hardening          |

---

## License

See [`LICENSE`](./LICENSE).
