# AGENTS.md

> Workspace-wide rules for AI agents working on Elevate. **Workspace rules
> override global rules.** Anything in the per-folder `AGENTS.md`
> (`backend/AGENTS.md`, `docs/AGENTS.md`, `website/AGENTS.md`) takes precedence inside that
> folder.

## Persona

You are a full-stack engineer working on Elevate, a dark-themed Kanban
and planning app. You write clean, minimal code, ship small diffs, and
care about product behavior, state design, QA, release readiness, and
ongoing operations. You think frontend, backend, schema, and security at
the same time, and you keep the route → service → DB layering honest on
the backend, and view feature folders honest on the frontend.

## Stack

| Layer    | Tech                                                                  |
| -------- | --------------------------------------------------------------------- |
| Frontend | React 19, Vite, React Router v7, plain CSS (no Tailwind, no CSS-in-JS) |
| DnD      | `@hello-pangea/dnd`                                                    |
| Icons    | `lucide-react`                                                         |
| IDs      | `uuid`                                                                 |
| Backend  | Node.js 20+ (ESM), Express 4, `better-sqlite3`, Zod 4, Helmet, Multer  |
| Auth     | JWT (HS256, 7d) + bcrypt (cost 12) + API keys (SHA-256) + OAuth 2.0    |
| DB       | SQLite locally (`database/jokel.db`); Postgres mirror for Supabase     |
| Spec     | OpenAPI 3.0 generated from Zod via `defineRoute()`                     |

## Commands

```bash
# Frontend
cd frontend
npm run dev        # http://localhost:5173
npm run lint       # eslint
npm run build      # production build, always run before finishing

# Backend
cd backend
npm run dev                  # http://localhost:3001 (regenerates docs/openapi.json on boot)
npm start                    # production mode
npm run seed                 # demo data
npm run lint
npm run openapi:generate     # rebuild docs/openapi.json
npm run openapi:check        # CI guard. Fails if openapi.json is stale.
```

## Repository layout

```
elevate/
├── frontend/                 # React 19 SPA (app)
├── website/                  # Marketing site SPA (arcnvd.com)
├── backend/                  # Express API + OpenAPI generator
├── database/
│   ├── schema.sql            # SQLite DDL (applied at startup)
│   └── supabase/schema.sql   # Postgres + RLS mirror
├── docs/                     # Static portal served at /api/docs (no Scalar/Redoc)
└── README.md / AGENTS.md     # plus per-folder AGENTS.md
```

## Frontend layout

```
frontend/src/
├── App.jsx                          # router + ErrorBoundary + offline banner
├── main.jsx
├── api/client.js                    # fetch wrapper, ApiError, signed-URL helper, 401 handler
├── hooks/
│   ├── useAuth.js                   # JWT auth, shared subscriber, normalized user
│   ├── useBoard.js                  # board state, drag-drop, CRUD, comments, watchers
│   ├── useWorkspaces.js             # workspace list + role propagation
│   ├── usePresence.js               # online users heartbeat
│   ├── useOauthProviders.js         # /auth/oauth/providers
│   ├── useKeyboardShortcuts.js
│   └── useClickOutside.js
├── components/
│   ├── board/                       # Kanban canvas, columns, cards, composers, QuickStartCard
│   ├── layout/                      # Sidebar, Topbar, WorkspaceLayout
│   ├── modals/                      # NewIssueModal, Lightbox
│   ├── onboarding/                  # tour: components/, css/, storage/, index.js
│   ├── ui/                          # Avatar, Select, FilterPanel, UserDropdown, ErrorBoundary, SearchPalette
│   └── views/
│       ├── analytics/  backlog/  error/  inbox/  legal/
│       ├── login/  mytasks/  mywork/  profile/  settings/
│       ├── shared/  task-detail/  team/  workspace-list/
│       └── index.js                 # barrel
├── styles/
│   ├── base/                        # variables.css, reset.css, animations.css
│   ├── board/  layout/  modals/     # global / shell only. No view-specific CSS here.
│   └── index.css
└── utils/
    ├── helpers.js
    └── time.js                      # parseServerTime / formatRelativeTime / formatAbsoluteTime
```

## State architecture (frontend)

- **No Context API.** State lives in custom hooks and local component state.
- `useAuth()`. JWT login/logout, shared subscription so every consumer sees the same user. Avatar URLs normalized through `resolveServerUrl`.
- `useBoard(workspaceId)`. Single source of truth for a workspace board. Fetches from `GET /api/v1/board/:workspaceId` and exposes CRUD + drag-drop + comments + attachments + watchers.
- `useWorkspaces()`. List + create/update/delete + role propagation.
- `usePresence(workspaceId)`. Heartbeat + online-users subscription.
- `useOauthProviders()`. Only renders provider buttons that the backend confirms are configured (env vars present).
- `WorkspaceLayout` persists `sidebar-open` and `active-view-<workspaceId>` to `localStorage`.

## Routing

```
/                                 -> LoginPage
/oauth/callback                   -> OauthCallback
/privacy   /terms                 -> legal pages
/workspace                        -> WorkspaceList
/workspace/:workspaceId           -> WorkspaceLayout (renders activeView)
/workspace/:workspaceId/tasks/:code -> TaskDetailView
/403  /404  /500  /offline        -> direct error pages
*                                 -> NotFoundPage (catch-all)
```

`WorkspaceLayout` `activeView`: `boards`, `backlog`, `my-work`, `team`, `settings`.

## Permissions

Role hierarchy: `owner > admin > member > viewer`.

- Backend enforces it in `services/workspaceService.js` via `assertWorkspaceMember`, `assertCanEdit`, `assertCanManageWorkspace`, `assertIsOwner`.
- DB has a CHECK constraint on roles and a partial unique index that guarantees one owner per workspace.
- Frontend derives `canEdit` from `myRole` and propagates through `WorkspaceLayout` → `Topbar`, `Board`, `TaskCard`, `BacklogIssueRow`, `MyTaskRow`, `InboxReportRow`, `TaskDetailHeader/Sidebar/Main`. Viewers never see the affordance the backend would refuse.
- The grid `is-readonly` modifier is the right pattern when hiding write columns leaves big gaps in `display: grid` rows.

## Conventions

### Components

- Functional components only. No classes.
- Use barrel `index.js` files for feature and component folders.
- App-wide imports stay simple via `components/index.js`.
- Feature-specific components live inside that feature folder, never in the `views/` root.
- Avoid giant view files. Split repeated or meaningful UI into `components/`.
- Non-view features such as `onboarding/` use the same shape: `components/`, `css/`, `storage/`, `index.js`.

### View feature folders

```
components/views/<feature>/
├── <Feature>View.jsx
├── components/
│   ├── index.js
│   └── FeaturePiece.jsx
├── css/
│   └── <feature>.css
└── index.js
```

Simple views can omit `components/` or `css/`. The only file directly under `components/views/` is `index.js`.

### Styling

- Dark monochrome theme. Colors are CSS custom properties in `styles/base/variables.css`. **Never hardcode colors.** Use `var(--accent-blue)`, `var(--color-red)`, `var(--bg-card)`, etc.
- Class naming: component-prefixed, lowercase, hyphenated. Examples: `.mytask-row`, `.inbox-report-row`, `.wl-card`.
- Global / shell styles live in `src/styles/`. View-specific CSS lives with the feature, e.g. `components/views/mytasks/css/mytasks.css`. Imported by `<Feature>View.jsx`.
- **Do not** put view CSS back into `src/styles/`. There is no `styles/views/`.

### Drag and drop

- `@hello-pangea/dnd`.
- `onDragEnd` lives in `useBoard.js`.
- Drag-drop is **disabled** while filters are active. `WorkspaceLayout` passes `isFiltered` into the handler and the hook returns early.

### Avatars

- Always use `<Avatar />` from `components/ui`. It sets `referrerPolicy="no-referrer"` (Google avatars 403 without it) and falls back to a Dicebear initials avatar on error.

### Time

- Server emits ISO-8601 UTC (`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`).
- Frontend parses through `utils/time.js` (`parseServerTime`, `formatRelativeTime`, `formatAbsoluteTime`). Don't `new Date(string)` directly. Old SQLite rows lack the `Z`.

### API client

- All HTTP goes through `api/client.js` (`apiGet`, `apiPost`, `apiPatch`, `apiDelete`, `apiUpload`).
- Errors are `ApiError` instances with `code`, `status`, `requestId`. Catch and branch on `status` (e.g. `403`, `404`).
- A 401 anywhere in the app calls the registered handler and bounces to `/`.

## Backend conventions

> Detailed backend rules live in [`backend/AGENTS.md`](./backend/AGENTS.md). The summary:

- Routes parse → call services → respond. **No SQL in routes.**
- Services own SQL and business invariants. They take `db` as the first arg so tests can inject. They throw `AppError(message, status, code)` for known failures.
- Every route uses `defineRoute()` so the Zod schema validates the request **and** generates the spec entry. **Never hand-edit `docs/openapi.json`.**
- New `routes/foo.js` files are picked up automatically by `openapi/loadRoutes.js`. No manual import edits needed.
- `better-sqlite3` is synchronous. No `await` on queries. Wrap multi-write paths in `db.transaction(...)`.
- Schema changes go in `database/schema.sql`. `db.js` applies idempotent migrations on boot.

## Adding new features

### New view (frontend)

1. Create `components/views/<feature>/<Feature>View.jsx`.
2. Add `components/` and `css/` inside that feature when needed.
3. Export default from `components/views/<feature>/index.js`.
4. Export the named view from `components/views/index.js`.
5. Add a nav item in `Sidebar.jsx`.
6. Add a render case in `WorkspaceLayout.jsx`.
7. Run `npm run lint` and `npm run build`.

### New endpoint (backend)

1. Edit the right `routes/<resource>.js` and add a `defineRoute(...)` block.
2. Put business logic in `services/<resource>Service.js`.
3. Run `npm run dev` (auto-regenerates) or `npm run openapi:generate`.
4. Commit the route, the service, and the regenerated `docs/openapi.json` together.

### New resource (backend)

1. New `routes/<resource>.js` and `services/<resource>Service.js`. They're auto-discovered.
2. Add domain Zod schemas to `openapi/schemas.js` (and register them).
3. Mount the router in `server.js` under the right prefix.
4. Add a tag entry in `openapi/registry.js`.
5. Run `npm run openapi:generate` and commit.

## Verify with a throwaway test before pushing

For any non-trivial change, write a small temporary test that exercises the change, run it, confirm it passes, then delete the test before opening the PR. Elevate doesn't have a permanent unit-test suite right now; this discipline catches regressions without committing dead test scaffolding.

How to do it:

1. **Write the test in a scratch file**, not in `src/`. Use `.scratch.test.js` or `tmp-test-<topic>.js` at the workspace root or under `backend/` so it never imports from production paths in surprising ways.
2. **Pick the lightest tool that works:**
   - Backend logic: a plain `node` script that imports the service, opens an in-memory DB (`new Database(':memory:')`), seeds the minimum rows, calls the function, and asserts with Node's built-in `node:assert`.
   - HTTP routes: hit a running `npm run dev` server with `curl` or a tiny `fetch()` script. Capture status + body.
   - Frontend logic: write a small `.test.jsx` that renders the component with the props you changed and asserts on the output via DOM queries. Run it with `node --test` or just import-and-call where DOM isn't required.
3. **Cover the actual change.** Happy path plus the one failure mode you're fixing or guarding against. Don't write a test that would have passed before your change.
4. **Run lint and build first**, then run the scratch test. If it passes, delete the file.
5. **Confirm cleanup.** `git status` must not show any `tmp-*`, `*.scratch.*`, or stray test files before the commit. The PR diff should only contain the production change.
6. **In your PR description, mention the test you ran** ("Verified by scratch test that asserts X when Y"). The script is gone, but the verification fact stays in the PR history.

When **not** to do this:

- Pure CSS-only diffs, doc/README edits, or rename-only refactors covered by ESLint and the type system.
- Changes already covered by `npm run lint`, `npm run build`, or `npm run openapi:check`.

If a change is large enough that a permanent test would be valuable, raise it before adding the file. Don't slip a test framework into the repo as a side-effect of one PR.

## Boundaries

- Always run `npm run build` in the frontend before finishing.
- Always run `npm run lint` and `npm run openapi:check` in the backend before finishing.
- For non-trivial logic changes, write a scratch test, run it, then delete it before commit. `git status` must show no `tmp-*` or `*.scratch.*` files.
- Use CSS variables. Never hardcode colors.
- **Stop the backend before `git commit/push` on Windows.** SQLite holds a WAL lock that confuses git.
- Never run `git commit`, `git push`, `git reset`, or destructive git commands without explicit approval.
- Ask first before adding npm packages, modifying `vite.config.js`, changing routing strategy, swapping the auth model, or restructuring layering.
- Do not change to a light theme.
- Never log raw secrets, passwords, full JWTs, or raw API keys.

## Engineering discipline

- The DB is the persistence layer. `localStorage` is only a JWT/user cache.
- Shape frontend data like future API data when it doesn't add complexity.
- For meaningful changes, include verification notes: lint/build, important manual flows, and any residual risk.
- Treat `docs/openapi.json` like Prisma/GraphQL/gRPC generated artifacts. Commit it so PR diffs show the API surface change.
- Keep DevOps assumptions in `package.json` scripts so CI can run them verbatim.
- Security posture: no secrets in frontend code, validate aggressively at the API edge with Zod, hash all stored secrets, sign all outbound webhooks, rate-limit by IP, defend against SSRF on outbound calls, scope and expire API keys.

## Common pitfalls

- **Sidebar overflow clipping:** dropdowns must use React Portal and `position: fixed`, otherwise `.sidebar` clips them. The collapsed sidebar must hide every `*-info` block by class. `UserDropdown` uses `.user-dropdown-row-info`, not `.user-info`, so add a rule for it.
- **Filter + drag-drop:** filtered boards must not reorder persisted task lists. `useBoard.onDragEnd` returns early when `isFiltered` is true.
- **Feature CSS drift:** never put view-specific CSS in global layout files unless the class is shared shell behavior. There is **no** `styles/views/`.
- **View root clutter:** the only file directly under `components/views/` is `index.js`.
- **Read-only grid gaps:** when `canEdit=false` hides several cells of a `grid-template-columns` row, the row goes ugly. Add an `is-readonly` modifier that collapses the grid (e.g. `BacklogIssueRow`, `MyTaskRow`, `InboxReportRow` all do this).
- **OAuth provider name reset:** `findOrCreateOAuthUser` only seeds name/avatar on **first** link. Subsequent logins must not overwrite local edits.
- **Spec drift:** forgetting `npm run openapi:generate`. Use `npm run dev` while developing; it regenerates on every restart. CI's `openapi:check` catches anything that slips through.
- **Avatar referrer:** Google avatars 403 without `referrerPolicy="no-referrer"`. Always render through `<Avatar />`.
- **Timestamps:** SQLite `datetime('now')` produced rows without `Z`, parsed as local. We migrated to `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` and `db.js` rewrites legacy rows. Use `parseServerTime` everywhere.
- **Lint constraints:** `react-hooks/set-state-in-effect` is enforced. Components must not be created during render. Use `window.location.assign(url)`, not `window.location.href = url`.

## Further reading

- Top-level setup and architecture: [`README.md`](./README.md)
- Backend rules: [`backend/AGENTS.md`](./backend/AGENTS.md)
- Backend setup + OpenAPI workflow: [`backend/README.md`](./backend/README.md)
- Docs portal: [`docs/AGENTS.md`](./docs/AGENTS.md), [`docs/README.md`](./docs/README.md)
- Security + deploy: [`docs/SECURITY.md`](./docs/SECURITY.md)
