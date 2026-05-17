# Elevate Frontend

The React SPA that talks to the [backend API](../backend/README.md). Plain CSS, no frameworks beyond React and Vite. Uses the same dark theme as the docs portal.

For repo-wide context, demo credentials, and architecture, see the [top-level README](../README.md).

---

## Stack

- **React 19** with the new compiler-friendly hooks rules
- **Vite 8** dev server + production bundler (`vite build`)
- **React Router v7** with lazy-loaded route components
- **Plain CSS** (no Tailwind, no CSS-in-JS); variables in `src/styles/base/variables.css`
- **`@hello-pangea/dnd`** for drag-and-drop on the Kanban canvas
- **`lucide-react`** for icons, **`marked`** for Markdown in task descriptions and comments

---

## Scripts

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Vite dev server on `http://localhost:5173` with HMR |
| `npm run lint`    | ESLint over the whole project             |
| `npm run build`   | Production build into `dist/`             |
| `npm run preview` | Preview the built bundle locally          |

Run `npm run lint` after any change and `npm run build` before finishing.

---

## Environment

The dev server proxies API calls to `http://localhost:3001` by default. Override with:

```bash
# frontend/.env.local
VITE_API_URL=https://api.your-domain.example
```

If unset, requests go to a same-origin `/api` path (good for production deployments behind a reverse proxy).

---

## Project structure

```
frontend/src/
├── App.jsx                          # router + ErrorBoundary + offline banner
├── main.jsx                         # React entry
├── constants.js                     # priority list + small seed data
│
├── api/
│   └── client.js                    # fetch wrapper, ApiError, signed-URL helper, 401 handler
│
├── hooks/
│   ├── useAuth.js                   # JWT auth, shared subscription, normalized user
│   ├── useBoard.js                  # board state, drag-drop, CRUD, comments, attachments, watchers
│   ├── useWorkspaces.js             # workspace list + role propagation
│   ├── usePresence.js               # heartbeat-based "who's online"
│   ├── useOauthProviders.js         # /auth/oauth/providers (hides un-configured buttons)
│   ├── useKeyboardShortcuts.js      # ⌘K palette, j/k nav, etc.
│   └── useClickOutside.js
│
├── components/
│   ├── board/                       # Kanban canvas, columns, cards, composers, QuickStartCard
│   ├── layout/                      # Sidebar, Topbar, WorkspaceLayout
│   ├── modals/                      # NewIssueModal, Lightbox
│   ├── onboarding/                  # guided tour: components/, css/, storage/, index.js
│   ├── ui/                          # Avatar, Select, FilterPanel, UserDropdown, ErrorBoundary, SearchPalette
│   └── views/
│       ├── analytics/  backlog/  error/  inbox/  legal/
│       ├── login/  mytasks/  mywork/  profile/  settings/
│       ├── shared/  task-detail/  team/  workspace-list/
│       └── index.js                 # barrel
│
├── styles/
│   ├── base/                        # variables.css, reset.css, animations.css
│   ├── board/                       # canvas, column, card, composer, menu, filter
│   ├── layout/                      # sidebar, topbar, buttons, workspace shell
│   ├── modals/                      # modal, lightbox, attachments, comments, forms
│   └── index.css                    # entry stylesheet
│
└── utils/
    ├── helpers.js
    └── time.js                      # parseServerTime / formatRelativeTime / formatAbsoluteTime
```

### View feature folders

Each workspace view lives in its own folder with this shape:

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

---

## State architecture

No Context API, no Redux. State lives in custom hooks and local component state.

| Hook                         | Responsibility                                                       |
| ---------------------------- | -------------------------------------------------------------------- |
| `useAuth()`                  | Login/logout, JWT in `localStorage`, shared subscription so every consumer sees the same user object. |
| `useBoard(workspaceId)`      | Single source of truth for a workspace board. CRUD methods call the REST API and refetch only when needed. |
| `useWorkspaces()`            | Workspace list + create/update/delete + role propagation.            |
| `usePresence(workspaceId)`   | Heartbeat to `/presence/heartbeat`; reads online users.              |
| `useOauthProviders()`        | Returns the list of OAuth providers the backend has configured.      |
| `useKeyboardShortcuts(...)`  | Global shortcuts (⌘K palette, j/k nav, c to compose, etc.).         |

`WorkspaceLayout` persists `Elevate-sidebar-open` and `Elevate-active-view-<workspaceId>` to `localStorage`. Everything else is server-owned.

---

## Routing

| Path                                        | Component                              |
| ------------------------------------------- | -------------------------------------- |
| `/`                                         | LoginPage                              |
| `/oauth/callback`                           | OauthCallback                          |
| `/privacy` `/terms`                         | Legal                                  |
| `/workspace`                                | WorkspaceList                          |
| `/workspace/:workspaceId`                   | WorkspaceLayout (active view)          |
| `/workspace/:workspaceId/tasks/:taskCode`   | WorkspaceLayout → TaskDetailView       |
| `/403` `/404` `/500` `/offline`             | Direct error pages                     |
| `*`                                         | NotFoundPage (catch-all)               |

`WorkspaceLayout` swaps the main view via `activeView`: `boards`, `backlog`, `my-work`, `team`, `settings`.

---

## Permissions in the UI

The backend role hierarchy (`owner > admin > member > viewer`) is the source of truth. The frontend derives `canEdit` from `myRole` returned by the workspace API and propagates it down to:

- `Topbar` hides "New Issue" for viewers
- `Board` disables drag, hides AddCardComposer + AddColumn + ColumnMenu
- `TaskCard` disables drag, hides quick-edit + context menu
- `BacklogIssueRow`, `MyTaskRow`, `InboxReportRow` hide write fields and switch to an `is-readonly` grid
- `TaskDetailHeader/Sidebar/Main` render read-only spans for status/priority/assignee, hide the composer and delete

Viewers never see an affordance the backend would refuse. The server still enforces every mutation.

---

## Styling rules

- Dark monochrome theme. Variables live in `src/styles/base/variables.css`.
- **Never hardcode colors.** Use `var(--accent-blue)`, `var(--color-red)`, `var(--bg-card)`, etc.
- Class naming: component-prefixed, lowercase, hyphenated (e.g. `.mytask-row`, `.inbox-report-row`).
- Global / shell styles live in `src/styles/`. View-specific CSS lives **with the feature** (`components/views/mytasks/css/mytasks.css`) and is imported by the view file. There is no `styles/views/`.
- Use the `<Avatar />` primitive, not raw `<img>`. It sets `referrerPolicy="no-referrer"` (Google avatars 403 without it) and falls back to a Dicebear initials avatar on error.

---

## API contract

All API calls go through `src/api/client.js`. The wrapper:

- Adds the `Authorization: Bearer <jwt>` header automatically.
- Throws `ApiError` instances with `code`, `status`, `requestId`. Branch on `status` (e.g. `403`, `404`).
- Calls a registered 401 handler so an expired session bounces the user back to `/`.
- Provides `apiUpload()` for multipart uploads (avatar, workspace logo/background, task attachments).
- Provides `resolveServerUrl()` for normalizing partial paths (e.g. `/uploads/...`) into absolute URLs.

OAuth providers are advertised by `GET /auth/oauth/providers`. The login page only renders buttons for providers whose env vars are set on the backend.

---

## Lint constraints

The project enforces a couple of strict rules worth knowing:

- `react-hooks/set-state-in-effect`. Use the snapshot pattern instead of `setState` directly inside `useEffect`.
- Components must not be created during render (no inline `function Foo() {...}` returned from another component).
- Use `window.location.assign(url)` instead of `window.location.href = url`.

---

## Deployment

- **Vercel** is the intended target. `frontend/vercel.json` sets HSTS, CSP, and Permissions-Policy headers. Set `VITE_API_URL` in the project environment.
- Run `npm run build` to produce `dist/`.

---

## Verify with a throwaway test before pushing

There's no permanent test suite yet. For any non-trivial logic change (a hook, a state reducer, a non-obvious branch), write a small scratch test, run it, confirm it passes, then delete it before committing.

How to do it:

1. **Create a scratch file** at the workspace or `frontend/` root: `tmp-test-<topic>.mjs` or `<topic>.scratch.test.jsx`. Don't put it under `src/`.
2. **Pick the lightest tool that works:**
   - Pure functions / hooks that don't touch the DOM: import them in a `.mjs` script and assert with `node:assert`.
   - Components: render with `react-dom/server.renderToString` and assert on the markup, or stand up a minimal vitest run if you really need DOM.
3. **Cover the actual change.** Happy path plus the one failure mode you're fixing. Don't write a test that would have passed before.
4. **Run `npm run lint` and `npm run build` first**, then run your scratch test. If it passes, delete the file.
5. **`git status` must show zero scratch files** before commit.
6. **Mention the test in your PR description.** The script is gone, but the verification fact stays.

Skip this for:

- CSS-only diffs
- Pure renames or moves covered by the lint and build
- Doc-only changes

If a change feels big enough to deserve a permanent test, raise it before adding the file. Don't slip a test framework into the repo as a side-effect of one PR.

---

## Conventions checklist (before opening a PR)

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] CSS variables only. No hardcoded hex colors.
- [ ] Views live in feature folders with `components/`, `css/`, `index.js`
- [ ] No view CSS in `src/styles/`
- [ ] All HTTP through `api/client.js`
- [ ] Avatars rendered through `<Avatar />`
- [ ] Times rendered through `utils/time.js`
- [ ] `canEdit` propagated wherever a write affordance lives
- [ ] For non-trivial logic changes, ran a scratch test and deleted it before commit
- [ ] `git status` shows no `tmp-*` or `*.scratch.*` files

See [`../AGENTS.md`](../AGENTS.md) for the full ruleset.
