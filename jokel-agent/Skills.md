# Jokel Deep Skill

Use this when AGENTS.md context is not enough — complex feature work, debugging, or architectural decisions.

## When to Load This

- Adding a major new feature (e.g., new view type, new modal, new data model)
- Debugging state management issues in `useBoard.js`
- Refactoring across multiple component layers
- Working on drag-drop edge cases or filter interactions

## State Management Deep Dive

### useBoard.js

This hook is the brain of the app. It encapsulates:

```
data: { tasks, columns, columnOrder }

createTask(columnId, { title, priority, tags, description, dueDate })
updateTask(taskId, partialTask)
deleteTask(taskId)

addColumn(title)
renameColumn(columnId, title)
deleteColumn(columnId)
clearColumn(columnId)

addComment(taskId, text)
handleFileSelect(files, taskId)  // FileReader → base64

onDragEnd(result, isFiltered)    // @hello-pangea/dnd handler
allTags                          // memoized from tasks
```

**Important:** Board data is NOT persisted to localStorage yet. It resets on page refresh. If asked to add persistence, wire `localStorage` around the reducer in `useBoard.js` using key `jokel-board-{workspaceId}`.

### useAuth.js

```
login(email, password)  // Only accepts demo@demo.com / Demo123
logout()
user / isLoggedIn
```

Stores user object in `localStorage` key `jokel-auth`. Session flag `jokel-welcome` controls the welcome toast on `/workspace`.

### useWorkspaces.js

```
workspaces / addWorkspace(name) / deleteWorkspace(id)
```

Persists to `localStorage` key `jokel-workspaces`. Default workspace: `Trust & Safety`.

## Component Patterns

### Good vs Bad

```jsx
// ✅ Good — small, focused, uses existing hooks
export default function MyComponent() {
  const board = useBoard(workspaceId);
  return <div>{board.data.tasks[taskId].title}</div>;
}

// ❌ Bad — passes board data through 3 layers of props
function Parent({ board }) {
  return <Child board={board} />;
}
function Child({ board }) {
  return <Grandchild board={board} />;
}
```

```jsx
// ✅ Good — consumes hook directly where needed
const { createTask } = useBoard(workspaceId);

// ❌ Bad — lifting all hook methods to parent and drilling down
```

### Modal Pattern

Modals are controlled by `WorkspaceLayout.jsx` state:

```jsx
// WorkspaceLayout.jsx
const [selectedTask, setSelectedTask] = useState(null);

// In render:
<TaskModal
  task={selectedTask}
  onClose={() => setSelectedTask(null)}
  board={board}
/>
```

Never use URL routes for modals. Always lift modal state to `WorkspaceLayout`.

### View Switching Pattern

```jsx
// WorkspaceLayout.jsx
const renderActiveView = () => {
  if (activeView === 'my-tasks') return <MyTasksView tasks={allTasks} ... />;
  if (activeView === 'analytics') return <AnalyticsView ... />;
  return <Board data={board.data} onDragEnd={...} ... />;
};
```

Add new views by:
1. Creating the component in `components/views/`
2. Exporting from `components/views/index.js`
3. Adding to `Sidebar.jsx` `navItems`
4. Adding a case in `renderActiveView()`

## CSS Architecture

### Variable Reference

```css
/* Backgrounds */
--bg-app: #000000
--bg-sidebar: #0a0a0a
--bg-header: #0a0a0a
--bg-card: #121212
--bg-card-hover: #1a1a1a
--bg-hover: #1a1a1a

/* Borders */
--border-subtle: #222222
--border-strong: #333333
--border-focus: #ffffff

/* Text */
--text-primary: #ededed
--text-secondary: #a1a1aa
--text-tertiary: #71717a

/* Accents */
--accent-blue: #0a84ff
--color-red: #ff453a
--color-orange: #ff9f0a
--color-yellow: #ffd60a
--color-green: #30d158

/* Shadows */
--shadow-dropdown: 0 8px 24px rgba(0, 0, 0, 0.7)
```

### Adding a New CSS File

1. Create file in appropriate `styles/` subfolder
2. Add `@import './subfolder/file.css';` to `styles/index.css`
3. Use component-prefixed class names

## Data Flow Examples

### Creating a Task

```
User clicks "New Issue" → WorkspaceLayout opens NewIssueModal
User fills form → submits → board.createTask(columnId, payload)
useBoard adds task to tasks map + column.taskIds
Board re-renders → new TaskCard appears in column
```

### Drag and Drop

```
User drags TaskCard → @hello-pangea/dnd captures
onDragEnd fires → board.onDragEnd(result, isFiltered)
If isFiltered: return early (no reorder)
Otherwise: reorder column.taskIds immutably
Board re-renders with new order
```

### File Attachment

```
User drops file on TaskModal
handleFileSelect reads File → FileReader.readAsDataURL()
Base64 string stored in task.attachments[]
Lightbox can display it directly
```

## Known Limitations

- Board data is ephemeral (no localStorage persistence)
- Auth is demo-only (no real backend validation)
- Comments use static timestamps, not real-time
- Attachments are base64 in memory (no cloud storage)
- "Analytics", "Team", "Settings" views are placeholder shells

## Escape Hatches

- When adding a feature that touches multiple hooks: propose a plan first
- When state gets confusing: trace from `useBoard.js` outward
- When CSS conflicts arise: check `styles/index.css` import order
