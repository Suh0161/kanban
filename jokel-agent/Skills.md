# Jokel Repo Skill

Use this when working on the Jokel frontend — a React 19 Kanban board app. This skill covers architecture, conventions, and common workflows.

## Scope

- Only applies to `frontend/` — the backend and database folders are empty.
- Do not introduce TypeScript, Next.js, or Tailwind. The stack is React 19 + Vite + plain CSS.
- Do not add a real backend or auth server. Auth is demo-only (`demo@demo.com` / `Demo123`).

## Project Map

```
frontend/src/
├── App.jsx              # Routes: / → LoginPage, /workspace → WorkspaceList, /workspace/:id → WorkspaceLayout
├── constants.js         # Demo seed data (tasks, columns, comments, attachments)
├── main.jsx             # ReactDOM root + BrowserRouter
│
├── components/
│   ├── board/           # Kanban components: Board, BoardColumn, TaskCard, composers, ColumnMenu
│   ├── layout/          # App shell: Sidebar, Topbar, WorkspaceLayout
│   ├── modals/          # TaskModal, NewIssueModal, Lightbox
│   ├── ui/              # Reusable: FilterPanel, Select, UserDropdown
│   └── views/           # Pages: LoginPage, WorkspaceList, MyTasksView, InboxView, AnalyticsView, TeamView, SettingsView
│
├── hooks/
│   ├── useAuth.js       # Demo auth with localStorage. login() only accepts demo@demo.com / Demo123
│   ├── useBoard.js      # All board state: tasks, columns, drag-drop, CRUD, comments, attachments
│   ├── useWorkspaces.js # Workspace list with localStorage persistence
│   └── useClickOutside.js
│
└── styles/
    ├── index.css        # @imports all CSS files
    ├── base/            # variables.css, reset.css, animations.css
    ├── layout/          # sidebar.css, topbar.css, buttons.css, workspace.css
    ├── board/           # canvas.css, column.css, card.css, composer.css, menu.css, filter.css
    ├── modals/          # modal.css, lightbox.css, attachments.css, comments.css, forms.css
    └── views/           # workspacelist.css, login.css
```

## How to Run

All commands run from `frontend/`:

```bash
npm install    # first time only
npm run dev    # dev server on http://localhost:5173
npm run build  # production build
npm run lint   # eslint
```

## Conventions

### Components

- Use functional components with hooks.
- Named exports from feature folders via `index.js` barrel files.
- Import pattern: `import { ComponentName } from '../components'` (uses `components/index.js`).
- Modals are controlled by state in `WorkspaceLayout.jsx`, not by URL routes.

### State

- **No context providers.** All state lives in custom hooks.
- `useBoard(workspaceId)` is the single source of truth for board data. It returns an object with:
  - `data: { tasks, columns, columnOrder }`
  - CRUD methods: `createTask`, `updateTask`, `deleteTask`, `addColumn`, `renameColumn`, `deleteColumn`, `clearColumn`
  - `onDragEnd(result, isFiltered)` for @hello-pangea/dnd
  - `addComment(taskId, text)`, `handleFileSelect(files, taskId)` (base64 via FileReader)
  - `allTags` (memoized)
- `useAuth()` returns `{ user, isLoggedIn, login, logout }`. Demo credentials only.
- `useWorkspaces()` persists to `localStorage` key `jokel-workspaces`.

### Styling

- **Plain CSS files**, no CSS-in-JS, no Tailwind.
- Dark monochrome theme. Colors are CSS custom properties in `styles/base/variables.css`:
  - `--bg-app: #000000`
  - `--bg-card: #121212`
  - `--bg-hover: #1a1a1a`
  - `--border-subtle: #222222`
  - `--border-strong: #333333`
  - `--text-primary: #ededed`
  - `--text-secondary: #a1a1aa`
  - `--text-tertiary: #71717a`
  - `--accent-blue: #0a84ff`
  - `--color-red: #ff453a`, `--color-orange: #ff9f0a`, `--color-yellow: #ffd60a`, etc.
- Class naming: component-prefixed lowercase with hyphens. Example: `.wl-card`, `.login-submit`, `.user-dropdown-menu`.
- Each feature folder has a matching CSS file in `styles/`. Add `@import` to `styles/index.css` for new files.
- Use existing CSS variables before hardcoding colors.

### Routing

```
/                          → LoginPage
/workspace                 → WorkspaceList
/workspace/:workspaceId/*  → WorkspaceLayout (renders Sidebar + active view)
```

`WorkspaceLayout` uses `activeView` state (`boards`, `my-tasks`, `inbox`, `analytics`, `team`, `settings`) to switch views inside the same route.

### Drag and Drop

- Uses `@hello-pangea/dnd`.
- Drag-drop is **disabled when filters are active** (`isFiltered` flag passed to `onDragEnd`).
- The `onDragEnd` handler lives in `useBoard.js`.

## Workflows

### Adding a new component

1. Create the `.jsx` file in the appropriate `components/` subfolder.
2. Add the export to that subfolder's `index.js`.
3. Create the `.css` file in the matching `styles/` subfolder.
4. Add `@import './path/file.css';` to `styles/index.css`.
5. Import the component from `../components` (or `../../components`, etc.).

### Adding a new workspace view

1. Create the view component in `components/views/`.
2. Export it from `components/views/index.js`.
3. Add a nav item in `Sidebar.jsx` `navItems` array.
4. Add a case in `WorkspaceLayout.jsx` `renderActiveView()`.

### Adding a new hook

1. Create the file in `src/hooks/`.
2. Export it as a named export.
3. Import directly from `../../hooks/hookName.js` (no barrel file for hooks).

### Persisting new data

- If it's workspace-level (like board data), extend `useBoard.js`.
- If it's app-level (like user preferences), use `localStorage` directly or extend an existing hook.
- Use a consistent key prefix: `jokel-{feature}`.

## Guardrails

- **Do not run `git commit`, `git push`, `git reset`, or `git rebase` unless explicitly asked.**
- **Do not install packages outside `frontend/` without confirmation.**
- **Do not change the dark theme to light.** The app is intentionally dark-only.
- **Do not add real backend auth.** The login page is a visual demo; `useAuth.js` handles validation client-side.
- **Minimal changes.** When fixing bugs, change the smallest amount of code needed. Do not refactor unrelated files.
- **Build before finishing.** Always run `npm run build` from `frontend/` to verify there are no compile errors.
- **Do not hardcode colors in CSS.** Use CSS custom properties from `styles/base/variables.css`.

## Common Pitfalls

- **Sidebar overflow clipping:** The sidebar has `overflow: hidden`. Dropdown menus (like `UserDropdown`) must use React Portal + `position: fixed` to render outside the sidebar bounds, or they get clipped.
- **Avatar rendering:** Dicebear SVGs can have viewBox issues when cropped to circles. Use the PNG endpoint (`.../notionists-neutral/png?seed=...`) and `object-fit: cover` for reliable circular avatars.
- **Task card `key` prop:** Task cards must use `task.id` as the React key, not index, because `column.taskIds` reordering depends on it.
- **Filter + drag-drop conflict:** When `filterPriorities` or `filterTags` are active, drag-drop must be disabled. Pass `isFiltered` to `onDragEnd` and return early if true.
- **Initial data:** `constants.js` contains seed data. Modifying it only affects new workspaces (or first loads without localStorage). Existing workspaces load from `localStorage`.
