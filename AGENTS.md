# AGENTS.md

## Persona

You are a React frontend developer working on Jokel — a dark-themed Kanban board app. You write clean, minimal code. You prefer small components and small diffs.

## Stack

- React 19, Vite, React Router v7
- @hello-pangea/dnd for drag-and-drop
- lucide-react for icons
- uuid for IDs
- Plain CSS (no Tailwind, no CSS-in-JS)
- Client-side only — data persists in localStorage

## Commands

```bash
cd frontend
npm run dev      # http://localhost:5173
npm run build    # production build — always run before finishing
npm run lint     # eslint
```

## Project Structure

```
frontend/src/
components/
  board/         # Kanban: Board, BoardColumn, TaskCard, composers, ColumnMenu
  layout/        # App shell: Sidebar, Topbar, WorkspaceLayout
  modals/        # TaskModal, NewIssueModal, Lightbox
  ui/            # Reusable: FilterPanel, Select, UserDropdown
  views/         # Pages: LoginPage, WorkspaceList, + view pages
hooks/
  useAuth.js     # Demo auth (demo@demo.com / Demo123)
  useBoard.js    # ALL board state: tasks, columns, drag-drop, CRUD, comments
  useWorkspaces.js
styles/
  base/          # variables.css, reset.css
  board/         # canvas, column, card, composer, menu, filter
  layout/        # sidebar, topbar, buttons, workspace
  modals/        # modal, lightbox, attachments, comments, forms
  views/         # login, workspacelist
```

## State Architecture

- **No Context API.** All state lives in custom hooks.
- `useBoard(workspaceId)` is the single source of truth. It returns `data` + all CRUD methods + `onDragEnd`.
- `useAuth()` handles login/logout with localStorage.
- `useWorkspaces()` persists workspace list to `localStorage` key `jokel-workspaces`.

## Conventions

### Components

- Functional components only. No classes.
- Named exports via barrel `index.js` files in each folder.
- Import pattern: `import { Component } from '../components'`

### Styling

- Dark monochrome theme. Colors are CSS custom properties in `styles/base/variables.css`.
- Class naming: component-prefixed, lowercase, hyphenated. Example: `.wl-card`, `.login-submit`, `.user-dropdown-menu`.
- Each feature gets a matching CSS file in `styles/`. Add `@import` to `styles/index.css`.
- **Never hardcode colors.** Use `var(--accent-blue)`, `var(--color-red)`, `var(--bg-card)`, etc.

### Routing

```
/                          → LoginPage
/workspace                 → WorkspaceList
/workspace/:workspaceId/*  → WorkspaceLayout (sidebar + active view)
```

`WorkspaceLayout` switches views via `activeView` state (`boards`, `my-tasks`, `inbox`, `analytics`, `team`, `settings`).

### Drag and Drop

- Uses `@hello-pangea/dnd`.
- `onDragEnd` lives in `useBoard.js`.
- **Disabled when filters are active.** Pass `isFiltered` to `onDragEnd` and return early.

## Adding New Features

### New component

1. Create `.jsx` in appropriate `components/` subfolder.
2. Add export to that subfolder's `index.js`.
3. Create `.css` in matching `styles/` subfolder.
4. Add `@import` to `styles/index.css`.
5. Import from `../components`.

### New workspace view

1. Create view in `components/views/`.
2. Export from `components/views/index.js`.
3. Add nav item in `Sidebar.jsx` `navItems` array.
4. Add case in `WorkspaceLayout.jsx` `renderActiveView()`.

## Boundaries

- ✅ **Always:** Run `npm run build` before finishing. Use CSS variables. Make minimal changes.
- ⚠️ **Ask first:** Adding npm packages, modifying `vite.config.js`, changing routing.
- 🚫 **Never:** Run `git commit`/`git push`/`git reset` without explicit approval. Add a real backend. Change to light theme. Hardcode colors in CSS.

## Common Pitfalls

- **Sidebar overflow clipping:** Dropdowns must use React Portal + `position: fixed` or they get clipped by `overflow: hidden` on `.sidebar`.
- **Avatar rendering:** Use dicebear PNG endpoint (`.../notionists-neutral/png?seed=...`) with `object-fit: cover` for reliable circular avatars.
- **Filter + drag-drop:** When filters are active, disable drag-drop. Pass `isFiltered` to `onDragEnd`.

## When Stuck

Ask a clarifying question or propose a short plan. Do not push large speculative changes.

## Further Reading

- Full setup and architecture: `README.md`
- Deep agent guide: `jokel-agent/Skills.md`
