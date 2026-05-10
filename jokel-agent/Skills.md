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
- Client-only persistence through `localStorage`

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

Board data persists to `localStorage` key:

```txt
jokel-board-{workspaceId}
```

When changing task shape, make sure old saved tasks remain safe with fallback reads. Seed data lives in `constants.js`.

### `useAuth.js`

```txt
login(email, password)  # demo@demo.com / Demo123
logout()
user
isLoggedIn
```

Stores the user object in `localStorage` key `jokel-auth`. The `jokel-welcome` session flag controls the workspace welcome toast.

### `useWorkspaces.js`

```txt
workspaces
addWorkspace(name)
deleteWorkspace(id)
updateWorkspace(id, updates)
```

Persists to `localStorage` key `jokel-workspaces`.

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
useBoard adds task to tasks map and column.taskIds
Board/views re-render from board.data
```

### Moving A Task

```txt
Board drag-drop or view Select/action -> board.moveTask(taskId, targetColumnId)
useBoard removes task from source column.taskIds
useBoard appends task to target column.taskIds
localStorage persists the new board data
```

### Drag And Drop

```txt
TaskCard drag -> @hello-pangea/dnd result
WorkspaceLayout calls board.onDragEnd(result, isFiltered)
If filtered: return early
Otherwise: reorder column.taskIds immutably
localStorage persists board data
```

### File Attachment

```txt
TaskModal file input -> handleFileSelect(files, taskId)
FileReader.readAsDataURL()
Base64 string stored in task.attachments[]
Lightbox displays attachment directly
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

- Auth is demo-only with no backend validation.
- Comments use static timestamps.
- Attachments are base64 in local storage, not cloud storage.
- Analytics are derived from current board data, not historical events.
- Sprint draft is task metadata, not a full sprint/release model yet.

## Escape Hatches

- When state gets confusing, trace from `useBoard.js` outward.
- When a view grows, split it into `components/views/<feature>/components/`.
- When CSS conflicts arise, check whether the class belongs in feature CSS or shared `styles/layout/workspace.css`.
- When changing task shape, test against existing localStorage data or provide safe fallbacks.
