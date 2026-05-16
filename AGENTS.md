# AGENTS.md

## Persona

You are a React frontend developer working on Jokel, a dark-themed Taiga plus Trello style planning and Kanban app. You write clean, minimal code. Prefer small components, feature folders, and small diffs. Think like a full software engineer too: keep product behavior, state design, QA, release readiness, and future system operations in view.

## Stack

- React 19, Vite, React Router v7
- `@hello-pangea/dnd` for drag-and-drop
- `lucide-react` for icons
- `uuid` for IDs
- Plain CSS, no Tailwind and no CSS-in-JS
- Backend: Node.js + Express + better-sqlite3 (SQLite)
- Data persisted in SQLite database with REST API
- JWT-based authentication

## Commands

```bash
cd frontend
npm run dev      # http://localhost:5173
npm run lint     # eslint
npm run build    # production build, always run before finishing

cd backend
npm run dev      # http://localhost:3001 (auto-reload)
npm start        # production mode
npm run seed     # seed default data
```

## Project Structure

```txt
frontend/src/
components/
  board/                 # Kanban: Board, BoardColumn, TaskCard, composers, ColumnMenu
  layout/                # App shell: Sidebar, Topbar, WorkspaceLayout
  modals/                # TaskModal, NewIssueModal, Lightbox
  onboarding/            # Guided tour: tooltip components, css, localStorage helpers
  ui/                    # Reusable UI: FilterPanel, Select, UserDropdown
  views/
    index.js             # View barrel exports
    analytics/           # AnalyticsView + components
    backlog/             # BacklogView + components + css
    inbox/               # InboxView + components + css
    login/               # LoginPage + css
    mytasks/             # MyTasksView + components + css
    settings/            # SettingsView + components
    shared/              # Shared view-only components
    team/                # TeamView + components
    workspace-list/      # WorkspaceList + css
hooks/
  useAuth.js             # JWT auth via backend API
  useBoard.js            # Board state from API, drag-drop, CRUD, comments
  useWorkspaces.js       # Workspace CRUD via backend API
api/
  client.js              # Thin fetch wrapper with JWT auth
styles/
  base/                  # variables.css, reset.css, animations.css
  board/                 # canvas, column, card, composer, menu, filter
  layout/                # sidebar, topbar, buttons, workspace
  modals/                # modal, lightbox, attachments, comments, forms
```

## State Architecture

- **No Context API.** State lives in custom hooks and local component state.
- `useBoard(workspaceId)` is the board source of truth. It fetches from `GET /api/board/:workspaceId` and exposes CRUD methods that call the REST API.
- `useAuth()` handles JWT login/logout via `POST /api/auth/login` and token storage in `localStorage`.
- `useWorkspaces()` fetches from `GET /api/workspaces` and provides CRUD via the API.
- `WorkspaceLayout` persists sidebar open state and active view.

## Conventions

### Components

- Functional components only. No classes.
- Use barrel `index.js` files for feature and component folders.
- App-level imports should stay simple through `components/index.js` where practical.
- Feature-specific components live inside that feature folder, not in the root `views/` folder.
- Avoid giant view files. Split repeated or meaningful UI into `components/`.
- Non-view features such as `components/onboarding/` should use the same local shape: `components/`, `css/`, `storage/`, and an `index.js` barrel.

### View Feature Folders

Use this shape for workspace views:

```txt
components/views/<feature>/
  <Feature>View.jsx
  components/
    index.js
    FeaturePiece.jsx
  css/
    <feature>.css
  index.js
```

Not every view needs every folder. Simple views can omit `components/` or `css/`, but do not put new page-level files directly in `components/views/` except the root barrel.

### Styling

- Dark monochrome theme. Colors are CSS custom properties in `styles/base/variables.css`.
- Never hardcode colors. Use `var(--accent-blue)`, `var(--color-red)`, `var(--bg-card)`, etc.
- Class naming: component-prefixed, lowercase, hyphenated. Examples: `.mytask-row`, `.inbox-report-row`, `.wl-card`.
- Global/shell styles live in `styles/`.
- View-specific CSS lives with the view feature, for example `components/views/mytasks/css/mytasks.css`, imported by `MyTasksView.jsx`.
- Do not add view CSS back into `styles/views/`.

### Routing

```txt
/                          -> LoginPage
/workspace                 -> WorkspaceList
/workspace/:workspaceId/*  -> WorkspaceLayout
```

`WorkspaceLayout` switches views via `activeView`:

```txt
boards, backlog, my-tasks, inbox, analytics, team, settings
```

### Drag And Drop

- Uses `@hello-pangea/dnd`.
- `onDragEnd` lives in `useBoard.js`.
- Drag-drop is disabled when filters are active. Pass `isFiltered` to `onDragEnd` and return early.

## Adding New Features

### New View

1. Create `components/views/<feature>/<Feature>View.jsx`.
2. Add `components/` and `css/` inside that feature when needed.
3. Export default from `components/views/<feature>/index.js`.
4. Export named view from `components/views/index.js`.
5. Add a nav item in `Sidebar.jsx`.
6. Add a render case in `WorkspaceLayout.jsx`.
7. Run `npm run lint` and `npm run build`.

### New Component

1. If feature-specific, create it under `components/views/<feature>/components/`.
2. If shared app UI, create it under `components/ui/`.
3. Export it from the nearest `index.js`.
4. Keep CSS close to the feature when it is feature-specific.

## Boundaries

- Always run `npm run build` before finishing.
- Prefer running `npm run lint` after code changes.
- Use CSS variables, not hardcoded colors.
- Ask first before adding npm packages, modifying `vite.config.js`, changing routing strategy, or adding a backend.
- Never run `git commit`, `git push`, `git reset`, or destructive git commands without explicit approval.
- Do not change to a light theme.

## Engineering Discipline

- The SQLite database in `database/jokel.db` is the persistence layer. `localStorage` is only used for JWT token and user cache.
- Shape frontend data like future API data when it does not add complexity.
- For meaningful changes, include verification notes: lint/build, important manual flows, and any residual risk.
- Keep DevOps and CI/CD assumptions documented rather than implicit. If tooling is added later, wire it through package scripts and CI-friendly commands.
- Security posture for now: no secrets in frontend code, validate persisted data defensively, and keep attachment handling demo-scoped.

## Common Pitfalls

- **Sidebar overflow clipping:** Dropdowns must use React Portal and `position: fixed` or they get clipped by `.sidebar`.
- **Avatar rendering:** Prefer dicebear image endpoints and keep avatars circular with `object-fit: cover`.
- **Filter plus drag-drop:** Filtered boards should not reorder persisted task lists.
- **Feature CSS drift:** Do not put view-specific CSS in global layout files unless the class is shared shell behavior.
- **View root clutter:** The only file directly under `components/views/` should be `index.js`.

## Further Reading

- Full setup and architecture: `README.md`
- Deep agent guide: `jokel-agent/Skills.md`
