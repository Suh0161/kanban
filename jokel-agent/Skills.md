# Jokel Deep Skill

Use this when `AGENTS.md` is not enough: complex feature work, debugging, architectural decisions, or refactors across view folders, hooks, and styles.

## When To Load This

- Adding or redesigning a workspace view
- Touching `useBoard.js`, task movement, persistence, or drag-drop
- Refactoring across multiple component layers
- Working on filter interactions, modal behavior, attachments, comments, or checklists
- Reorganizing feature folders

## Product Model

Jokel is a dark Taiga plus Trello style app:

- Trello-like board movement and card details
- Taiga-like backlog planning, grooming, sprint draft, and workspace administration
- Operational views for My Tasks and Inbox
- Backend API with SQLite persistence via better-sqlite3

## Engineering Skill Map

Use this guide as a total software engineering playbook, not only a frontend note. Keep decisions proportional to the current client-only product, but design changes so the app can grow into a real production system.

### Product Engineering

- Start from the workflow: board movement, backlog planning, intake, personal queue, analytics, team ownership, and settings.
- Prefer user-facing behavior over decorative UI. Every new surface should answer what the user can now do faster, safer, or more clearly.
- Keep demo data believable. Names, statuses, priorities, and counts should support the Taiga plus Trello concept.
- Make empty, loading, filtered, and error states feel intentional.

### Frontend Engineering

- Keep React components small, composable, and feature-scoped.
- Use custom hooks for state boundaries. Do not introduce Context API unless a cross-tree problem cannot be solved cleanly with props and hooks.
- Preserve old `localStorage` data with fallback reads when changing task, workspace, or user shapes.
- Keep interaction-heavy code readable: drag-drop, modals, filters, onboarding, and task editing need explicit names and narrow helpers.
- Verify responsive behavior for the sidebar, topbar tools, boards, modals, and view-specific grids.

### System Design

- Treat current `localStorage` as a mock persistence layer. Keep data shapes close to what an API could later return.
- Separate domain concepts from UI details: task, column, workspace, assignee, comment, checklist, attachment, status, priority, sprint draft.
- When adding backend-ready behavior, design API-shaped boundaries first: query, command, mutation result, validation error.
- Avoid coupling workspace views to a single board layout. Backlog, My Tasks, Inbox, Analytics, and Team should consume derived task data without owning board mutation logic.

### SystemOps

- Keep runtime assumptions explicit: browser-only app, no server process, no database, no secret handling.
- If a backend is added later, document environment variables, startup order, health checks, ports, and local development dependencies.
- Prefer reproducible setup commands and deterministic seed data over manual environment steps.
- Add operational notes when a feature creates data growth, storage pressure, or migration risk.

### DevOps

- Keep install, lint, build, preview, and future test commands documented.
- Use small PR-sized changes with clear verification notes.
- Do not add infrastructure, packages, or config churn unless it directly supports the requested feature.
- When adding tooling, prefer standard project scripts over one-off shell commands.

### CI/CD

- A healthy pipeline should run install, lint, tests when available, and production build.
- Keep CI fast for frontend-only changes. Add heavier checks only when they catch real regressions.
- Future deployment pipeline should build immutable frontend assets, publish artifacts, and separate preview/staging/production environments.
- Never rely on local-only generated files for deployment unless the generation step is part of CI.

### QA And Testing

- At minimum, run `npm run lint` and `npm run build` after code changes.
- Add focused tests when logic becomes shared, stateful, or easy to regress.
- Manually verify high-risk UI flows: drag-drop, filters plus drag-drop, modal edits, settings save/reset, onboarding replay, sidebar collapse, and responsive topbar behavior.
- For visual work, check real screens instead of trusting CSS by inspection.

### Security And Privacy

- Do not store secrets in the frontend or in docs.
- Treat `localStorage` as user-editable and untrusted. Validate and fallback when reading persisted data.
- Keep attachment handling conservative; base64 images are demo-friendly but not production storage.
- Future backend work should include auth boundaries, authorization by workspace, upload limits, audit logs, and input validation.

### Observability

- Current app has no telemetry. Debug through clear state boundaries and browser devtools.
- Future production work should add structured errors, user action breadcrumbs, release versioning, and client error reporting.
- Analytics views should distinguish product metrics from operational monitoring.

### Release Readiness

- Before finishing a meaningful change, confirm:
  - The user workflow still works end to end.
  - `localStorage` data remains compatible.
  - UI fits at desktop and narrow widths.
  - Lint and build pass.
  - Docs or agent guidance changed when architecture changed.

## State Management Deep Dive

### `useBoard(workspaceId)`

This hook is the brain of workspace board data.

```txt
data: { tasks, columns, columnOrder }

createTask(columnId, payload)
updateTask(taskId, partialTask)
deleteTask(taskId)
moveTask(taskId, targetColumnId)

addColumn(title)
renameColumn(columnId, title)
deleteColumn(columnId)
clearColumn(columnId)

addComment(taskId, text)
addChecklist(taskId, title)
addChecklistItem(taskId, checklistId, text)
toggleChecklistItem(taskId, checklistId, itemId)
deleteChecklist(taskId, checklistId)

handleFileSelect(files, taskId)
deleteAttachment(taskId, attachmentId)

onDragEnd(result, isFiltered)
allTags
getColumnForTask(taskId)
```

Board data is fetched from `GET /api/board/{workspaceId}` and all mutations call the REST API. When changing task shape, ensure the backend schema and frontend expectations stay aligned. Seed data lives in `backend/src/seed.js`.

### `useAuth.js`

```txt
login(email, password)  # demo@demo.com / Demo123
logout()
user
isLoggedIn
loading
```

Authenticates via `POST /api/auth/login`, stores the JWT token in `localStorage` key `jokel-token`, and caches the user object in `jokel-auth`. On mount, validates the token with `GET /api/auth/me`. The `jokel-welcome` session flag controls the workspace welcome toast.

### `useWorkspaces.js`

```txt
workspaces
addWorkspace(name)
deleteWorkspace(id)
updateWorkspace(id, updates)
```

Fetches from `GET /api/workspaces` and performs CRUD via the REST API.

## View Folder Architecture

Workspace views are feature folders:

```txt
components/views/<feature>/
  <Feature>View.jsx       # top-level orchestration
  components/             # view-specific pieces
    index.js
  css/                    # view-specific styles when needed
    <feature>.css
  index.js                # default export for the view
```

Current view folders:

```txt
analytics/
backlog/
inbox/
login/
mytasks/
settings/
shared/
team/
workspace-list/
```

Rules:

- Keep root `components/views/` clean. It should only contain `index.js` plus feature folders.
- View-specific components stay inside that view's `components/`.
- Shared view-only pieces go in `views/shared/`.
- Reusable primitives go in `components/ui/`.
- Non-view features such as onboarding keep their own local `components/`, `css/`, and `storage/` folders.
- View-specific CSS is colocated under the view's `css/` folder and imported by the view.
- Global shell, board, modal, and base styles stay under `src/styles/`.

## View Switching Pattern

`WorkspaceLayout.jsx` owns the app shell and modal state.

```jsx
const renderActiveView = () => {
  if (activeView === 'backlog') return <BacklogView tasks={allTasks} ... />;
  if (activeView === 'my-tasks') return <MyTasksView tasks={allTasks} ... />;
  if (activeView === 'inbox') return <InboxView tasks={allTasks} ... />;
  if (activeView === 'analytics') return <AnalyticsView tasks={allTasks} />;
  if (activeView === 'team') return <TeamView tasks={allTasks} />;
  if (activeView === 'settings') return <SettingsView workspace={currentWorkspace} ... />;
  return <Board data={board.data} onDragEnd={...} ... />;
};
```

Add new views by:

1. Creating `components/views/<feature>/<Feature>View.jsx`
2. Exporting default from `components/views/<feature>/index.js`
3. Exporting named view from `components/views/index.js`
4. Adding a sidebar nav item
5. Adding a `renderActiveView()` case

## Modal Pattern

Modals are controlled by `WorkspaceLayout.jsx` state. Do not route modals.

```jsx
const [selectedTask, setSelectedTask] = useState(null);

{selectedTask && (
  <TaskModal
    task={board.data.tasks[selectedTask.id]}
    onClose={() => setSelectedTask(null)}
    onUpdateTask={handleUpdateTask}
    onMoveTask={board.moveTask}
    columns={board.data.columns}
    columnOrder={board.data.columnOrder}
  />
)}
```

## Data Flow Examples

### Creating A Task

```txt
Topbar New Issue -> WorkspaceLayout opens NewIssueModal
Submit -> board.createTask(columnId, payload)
useBoard POSTs to /api/tasks and merges the response into local state
Board/views re-render from board.data
```

### Moving A Task

```txt
Board drag-drop or view Select/action -> board.moveTask(taskId, targetColumnId)
useBoard calls PATCH /api/tasks/{id}/move
useBoard updates local state optimistically
Board/views re-render from board.data
```

### Drag And Drop

```txt
TaskCard drag -> @hello-pangea/dnd result
WorkspaceLayout calls board.onDragEnd(result, isFiltered)
If filtered: return early
Otherwise: reorder column.taskIds immutably
Cross-column moves call PATCH /api/tasks/{id}/move
Column reorders call POST /api/columns/reorder
```

### File Attachment

```txt
TaskModal file input -> handleFileSelect(files, taskId)
Uploads actual files via FormData to POST /api/tasks/{taskId}/attachments
Server stores files in uploads/ and returns a URL
Lightbox displays attachment from the served URL
```

## CSS Architecture

### Variables

Use `styles/base/variables.css`.

```css
--bg-app
--bg-sidebar
--bg-header
--bg-card
--bg-card-hover
--bg-hover

--border-subtle
--border-strong
--border-focus

--text-primary
--text-secondary
--text-tertiary

--accent-color
--accent-color-hover
--accent-blue

--color-red
--color-orange
--color-yellow
--color-blue
--color-purple
```

### Adding CSS

For app-wide systems:

```txt
styles/base/
styles/layout/
styles/board/
styles/modals/
```

For view-specific surfaces:

```txt
components/views/<feature>/css/<feature>.css
```

Import feature CSS from the view file:

```jsx
import './css/mytasks.css';
```

## Current View Responsibilities

- **Board** - Drag-and-drop Kanban columns and cards.
- **Backlog** - Planning filters, readiness, sprint draft, priority/status/date edits.
- **My Tasks** - Personal open/urgent/watching/done queues with inline status and date edits.
- **Inbox** - Intake filtering, selection, bulk triage/archive, row-level routing.
- **Analytics** - Priority mix and board flow.
- **Team** - Workload and coverage.
- **Settings** - General, notifications, permissions, toggles, status aside.
- **Workspace List** - Workspace search and creation.
- **Login** - Demo login and guest entry.

## Known Limitations

- JWT auth with bcrypt password hashing and workspace-level authorization.
- Comments use ISO 8601 timestamps from the database.
- Attachments are stored as files on disk with image type validation and 5MB size limits.
- Analytics are derived from current board data, not historical events.
- Sprint draft is task metadata, not a full sprint/release model yet.
- Backend uses SQLite; for high traffic migrate to PostgreSQL.
- File uploads are local disk only; for production use S3-compatible object storage.

## Escape Hatches

- When state gets confusing, trace from `useBoard.js` outward.
- When a view grows, split it into `components/views/<feature>/components/`.
- When CSS conflicts arise, check whether the class belongs in feature CSS or shared `styles/layout/workspace.css`.
- When changing task shape, test against existing localStorage data or provide safe fallbacks.
