# Jokel

A dark-themed Kanban board app for managing tasks across workspaces. Built with React 19 + Vite. Think Trello, but moodier.

![screenshot-placeholder]

## What is this?

Jokel is a client-side demo app that lets you:

- Create and switch between workspaces
- Drag-and-drop tasks across columns (Inbox → Triage → Investigating, or whatever you name them)
- Add tasks with priorities, tags, due dates, descriptions, and attachments
- Filter and search tasks by priority or tag
- Leave comments on tasks
- View tasks in different layouts (Board, My Tasks, Inbox, Analytics, Team, Settings)

Everything runs in the browser. No backend server needed — data persists in `localStorage`.

## Tech Stack

- **React 19** with hooks (no class components)
- **Vite** for dev server and builds
- **React Router v7** for routing (`/` → login, `/workspace` → workspace list, `/workspace/:id` → board)
- **@hello-pangea/dnd** for drag-and-drop
- **lucide-react** for icons
- **uuid** for generating IDs

## Quick Start

You need **Node.js 18+**.

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Demo Account

Use these credentials on the login page:

- **Email:** `demo@demo.com`
- **Password:** `Demo123`

Or click **"Use demo account"** to autofill.

You can also skip login and click **"Continue as guest"**.

## Available Scripts

| Script | What it does |
|--------|-------------|
| `npm run dev` | Start dev server on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
frontend/
├── src/
│   ├── App.jsx                 # Router root
│   ├── main.jsx                # Entry point
│   ├── constants.js            # Initial demo data (tasks, columns)
│   │
│   ├── components/
│   │   ├── board/              # Kanban board components
│   │   │   ├── Board.jsx
│   │   │   ├── BoardColumn.jsx
│   │   │   ├── TaskCard.jsx
│   │   │   ├── AddCardComposer.jsx
│   │   │   ├── AddColumnComposer.jsx
│   │   │   └── ColumnMenu.jsx
│   │   ├── layout/             # App shell
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Topbar.jsx
│   │   │   └── WorkspaceLayout.jsx
│   │   ├── modals/             # Modal overlays
│   │   │   ├── TaskModal.jsx
│   │   │   ├── NewIssueModal.jsx
│   │   │   └── Lightbox.jsx
│   │   ├── ui/                 # Reusable UI bits
│   │   │   ├── FilterPanel.jsx
│   │   │   ├── Select.jsx
│   │   │   └── UserDropdown.jsx
│   │   └── views/              # Full-page views
│   │       ├── LoginPage.jsx
│   │       ├── WorkspaceList.jsx
│   │       ├── MyTasksView.jsx
│   │       ├── InboxView.jsx
│   │       ├── AnalyticsView.jsx
│   │       ├── TeamView.jsx
│   │       └── SettingsView.jsx
│   │
│   ├── hooks/
│   │   ├── useAuth.js          # Demo auth (localStorage)
│   │   ├── useBoard.js         # All board state + CRUD + drag-drop
│   │   ├── useWorkspaces.js    # Workspace list (localStorage)
│   │   └── useClickOutside.js
│   │
│   ├── styles/
│   │   ├── index.css           # Imports all CSS files
│   │   ├── base/               # Variables, reset, animations
│   │   ├── layout/             # Sidebar, topbar, buttons
│   │   ├── board/              # Canvas, columns, cards
│   │   ├── modals/             # Modal styles
│   │   └── views/              # Page-specific styles
│   │
│   └── utils/
│       └── helpers.js
│
├── index.html
├── package.json
└── vite.config.js
```

## Architecture Notes

- **State lives in hooks, not context.** `useBoard.js` is the single source of truth for everything inside a workspace. It holds tasks, columns, drag-drop logic, and all CRUD operations.
- **Feature-based CSS.** Each component folder has a matching CSS file in `styles/`. No utility-class framework — just plain BEM-ish classes.
- **Dark theme only.** Colors are defined in `styles/base/variables.css`.
- **Client-side persistence.** Workspaces and auth state use `localStorage`. Board data is per-workspace but resets on hard refresh unless you wire up persistence in `useBoard.js`.

## Customizing

### Adding a new workspace view

1. Create the view component in `src/components/views/`
2. Export it from `src/components/views/index.js`
3. Add a nav item in `Sidebar.jsx`
4. Wire it up in `WorkspaceLayout.jsx` inside `renderActiveView()`

### Changing the color theme

Edit `src/styles/base/variables.css`. The app uses CSS custom properties throughout.

### Making board data persist

`useBoard.js` currently initializes fresh on every reload. Add `localStorage` get/set around the reducer if you want persistence.

## License

MIT — do whatever you want with it.
