# Jokel

Jokel is a dark-themed workspace Kanban app inspired by Taiga planning and Trello board movement. It is a client-side React app with workspace navigation, a live board, backlog planning, personal task queues, inbox triage, analytics, team workload, and workspace settings.

## Features

- **Workspace management** - Create and switch between independent workspaces.
- **Kanban board** - Drag-and-drop tasks across customizable columns with `@hello-pangea/dnd`.
- **Backlog planning** - Groom issues, mark sprint draft items, edit priority/status/due dates, and track planning health.
- **My Tasks** - Personal queues for open, urgent, watching, and done work with inline status and due-date edits.
- **Inbox triage** - Filter incoming reports, select reports, bulk triage/archive, and route issues into board lists.
- **Task details** - Editable title, status, priority, assignee, tags, due dates, descriptions, comments, checklists, and image attachments.
- **Analytics and team views** - Priority mix, board flow, workload, and coverage summaries.
- **Workspace settings** - General, notifications, and permissions settings with dropdowns, toggles, save/reset state, and status rail.
- **Collapsible sidebar** - Persistent sidebar state with compact and expanded modes.
- **Demo auth** - Demo login and guest access.

## Prerequisites

- Node.js 18 or higher
- npm or compatible package manager

## Installation

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

The development server starts at `http://localhost:5173`.

## Demo Credentials

Use the following credentials on the login page, or click **Use demo account** to autofill:

| Field | Value |
| --- | --- |
| Email | `demo@demo.com` |
| Password | `Demo123` |

Guest access is also available via **Continue as guest**.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the codebase |

## Project Structure

```txt
frontend/src/
  App.jsx                 # Application router
  main.jsx                # React entry point
  constants.js            # Seed data and priority constants

  components/
    board/                # Kanban board, columns, cards, composers, menus
    layout/               # Sidebar, Topbar, WorkspaceLayout
    modals/               # TaskModal, NewIssueModal, Lightbox
    onboarding/           # Guided tour tooltip components, storage, and styles
    ui/                   # Shared UI primitives: Select, FilterPanel, UserDropdown
    views/
      index.js            # Barrel exports for all views
      analytics/
        AnalyticsView.jsx
        components/
      backlog/
        BacklogView.jsx
        components/
        css/
      inbox/
        InboxView.jsx
        components/
        css/
      login/
        LoginPage.jsx
        css/
      mytasks/
        MyTasksView.jsx
        components/
        css/
      settings/
        SettingsView.jsx
        components/
      shared/
        ViewTaskRow.jsx
      team/
        TeamView.jsx
        components/
      workspace-list/
        WorkspaceList.jsx
        css/

  hooks/
    useAuth.js            # Demo authentication state
    useBoard.js           # Board state, CRUD, drag-drop, comments, attachments
    useWorkspaces.js      # Workspace list persistence
    useClickOutside.js

  styles/
    index.css             # Global CSS import file
    base/                 # Variables, reset, animations
    board/                # Board canvas, columns, cards, composers, filter
    layout/               # Sidebar, topbar, buttons, workspace shell
    modals/               # Modal, lightbox, attachments, comments, forms

  utils/
    helpers.js
```

## Architecture

### Engineering Playbook

Jokel is currently a client-side product, but the codebase is organized with production engineering habits in mind:

- **Product engineering** - Views map to real planning workflows: board, backlog, personal queue, intake, analytics, team, and settings.
- **Frontend engineering** - Feature folders, custom hooks, colocated view CSS, and small reusable UI primitives.
- **System design** - Board and workspace data are shaped so they can later move from `localStorage` to an API without rewriting every view.
- **SystemOps and DevOps** - Runtime assumptions, commands, and environment expectations should stay explicit in docs.
- **CI/CD readiness** - A future pipeline should install dependencies, run lint/tests, build production assets, and publish immutable artifacts.
- **QA and release discipline** - Verify drag-drop, filters, modals, settings, onboarding, sidebar collapse, and responsive layouts before shipping.
- **Security posture** - No frontend secrets, defensive persisted-data reads, and demo-scoped attachment storage.

### State Management

State is managed through custom hooks rather than Context API or external state libraries:

- **`useBoard(workspaceId)`** - Single source of truth for board data in a workspace. Exposes tasks, columns, drag-drop handlers, CRUD methods, comments, checklists, attachments, task movement, and task updates. Board data persists to `localStorage` key `jokel-board-{workspaceId}`.
- **`useAuth()`** - Handles demo login/logout with `localStorage` key `jokel-auth`.
- **`useWorkspaces()`** - Manages the workspace list with `localStorage` key `jokel-workspaces`.

### Styling

The app uses a single dark theme. Colors live in `styles/base/variables.css` and should be consumed through CSS custom properties.

Global/shell styles stay in `src/styles/`. View-specific styles live beside the view feature when that view has its own surface, for example `components/views/mytasks/css/mytasks.css`, and are imported by the view. Feature-level UI that is not a workspace view, such as onboarding, keeps its own `components/`, `css/`, and `storage/` folders under that feature.

### Routing

| Route | Component |
| --- | --- |
| `/` | `LoginPage` |
| `/workspace` | `WorkspaceList` |
| `/workspace/:workspaceId/*` | `WorkspaceLayout` |

`WorkspaceLayout` owns the app shell and switches the main view with `activeView`: `boards`, `backlog`, `my-tasks`, `inbox`, `analytics`, `team`, and `settings`.

### Data Persistence

- Auth state persists through `useAuth()`.
- Workspace list persists through `useWorkspaces()`.
- Board data persists per workspace through `useBoard(workspaceId)`.
- Sidebar open state and active view are persisted by `WorkspaceLayout`.

## Extending The App

### Adding A Workspace View

1. Create a feature folder under `src/components/views/<feature>/`.
2. Add `<Feature>View.jsx`.
3. Add `components/` for view-specific subcomponents when needed.
4. Add `css/<feature>.css` when the view has dedicated styling, and import it from `<Feature>View.jsx`.
5. Add `index.js` in the feature folder that exports the view as default.
6. Export the view from `src/components/views/index.js`.
7. Add the nav item in `Sidebar.jsx`.
8. Add the render case in `WorkspaceLayout.jsx`.

### Adding A Component

1. If it is feature-specific, place it under that feature's `components/` folder.
2. If it is app-wide reusable UI, place it under `components/ui/`.
3. Export through the nearest `index.js`.
4. Keep class names component-prefixed, lowercase, and hyphenated.

### Theming

Edit `src/styles/base/variables.css`. Avoid hardcoded colors in components and stylesheets.
