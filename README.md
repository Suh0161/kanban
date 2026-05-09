# Jokel

A workspace-based Kanban task management application built with React 19 and Vite. Supports drag-and-drop task organization, priority filtering, inline comments, file attachments, and multi-workspace navigation.

## Features

- **Workspace management** - Create and switch between independent workspaces
- **Kanban board** - Drag-and-drop tasks across customizable columns via `@hello-pangea/dnd`
- **Task details** - Priority levels, tags, due dates, descriptions, and file attachments (base64)
- **Comments** - Threaded discussions on individual tasks
- **Search and filter** - Filter by priority or tag; search tasks by keyword
- **Multiple views** - Board, My Tasks, Inbox, Analytics, Team, Settings
- **Collapsible sidebar** - Animated sidebar with workspace navigation and user dropdown
- **Login flow** - Demo authentication with guest access option

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

Use the following credentials on the login page, or click **"Use demo account"** to autofill:

| Field | Value |
|-------|-------|
| Email | `demo@demo.com` |
| Password | `Demo123` |

Guest access is also available via **"Continue as guest"**.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the codebase |

## Project Structure

```
frontend/
src/
  App.jsx                 # Application router
  main.jsx                # React entry point
  constants.js            # Seed data for initial workspace

  components/
    board/                # Kanban components
      Board.jsx
      BoardColumn.jsx
      TaskCard.jsx
      AddCardComposer.jsx
      AddColumnComposer.jsx
      ColumnMenu.jsx
    layout/               # Application shell
      Sidebar.jsx
      Topbar.jsx
      WorkspaceLayout.jsx
    modals/               # Overlay modals
      TaskModal.jsx
      NewIssueModal.jsx
      Lightbox.jsx
    ui/                   # Shared UI primitives
      FilterPanel.jsx
      Select.jsx
      UserDropdown.jsx
    views/                # Page-level components
      LoginPage.jsx
      WorkspaceList.jsx
      MyTasksView.jsx
      InboxView.jsx
      AnalyticsView.jsx
      TeamView.jsx
      SettingsView.jsx

  hooks/
    useAuth.js            # Authentication state (localStorage)
    useBoard.js           # Board state, CRUD, drag-drop logic
    useWorkspaces.js      # Workspace list persistence
    useClickOutside.js

  styles/
    index.css             # Central CSS import file
    base/                 # CSS variables, reset, keyframes
    layout/               # Sidebar, topbar, buttons
    board/                # Board canvas, columns, cards
    modals/               # Modal, lightbox, attachments
    views/                # Page-specific styles

  utils/
    helpers.js
```

## Architecture

### State Management

State is managed through custom React hooks rather than Context API or external libraries:

- **`useBoard(workspaceId)`** - Single source of truth for all board data within a workspace. Exposes tasks, columns, drag-drop handlers, and CRUD operations.
- **`useAuth()`** - Handles demo login/logout with `localStorage` persistence.
- **`useWorkspaces()`** - Manages workspace list with `localStorage` key `jokel-workspaces`.

### Styling

The application uses a single dark theme. All colors are defined as CSS custom properties in `styles/base/variables.css`. Each feature folder has a corresponding stylesheet in `styles/`, imported via `styles/index.css`.

### Routing

React Router handles three routes:

| Route | Component |
|-------|-----------|
| `/` | `LoginPage` |
| `/workspace` | `WorkspaceList` |
| `/workspace/:workspaceId/*` | `WorkspaceLayout` |

`WorkspaceLayout` renders the sidebar and switches the main view based on `activeView` state.

### Data Persistence

- **Workspaces** and **auth state** persist to `localStorage`.
- **Board data** is per-workspace and currently resets on page reload. Persistence can be added by extending `useBoard.js`.

## Extending the Application

### Adding a New View

1. Create the component in `src/components/views/`
2. Export it from `src/components/views/index.js`
3. Add a navigation item in `src/components/layout/Sidebar.jsx`
4. Register the view in `src/components/layout/WorkspaceLayout.jsx` within `renderActiveView()`

### Adding a New Component

1. Create the `.jsx` file in the appropriate `components/` subfolder
2. Add the named export to the subfolder's `index.js`
3. Create the `.css` file in the matching `styles/` subfolder
4. Import the stylesheet in `styles/index.css`

### Theming

Edit `src/styles/base/variables.css`. The application references CSS custom properties throughout all stylesheets.
