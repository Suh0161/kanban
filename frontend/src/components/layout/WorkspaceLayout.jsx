import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import {
  Sidebar,
  Topbar,
  Board,
  TaskModal,
  NewIssueModal,
  Lightbox,
  BacklogView,
  MyTasksView,
  InboxView,
  AnalyticsView,
  TeamView,
  SettingsView
} from '../index.js';
import { useWorkspaces } from '../../hooks/useWorkspaces.js';
import { useBoard } from '../../hooks/useBoard.js';
import { initialData } from '../../constants.js';

export default function WorkspaceLayout() {
  const { workspaceId } = useParams();
  const { workspaces, updateWorkspace } = useWorkspaces();
  const board = useBoard(workspaceId);

  const currentWorkspace = workspaces.find(w => w.id === workspaceId);

  const [selectedTask, setSelectedTask] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [newIssueOpen, setNewIssueOpen] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '', priority: 'Low', tags: '', description: '', columnId: initialData.columnOrder[0], dueDate: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPriorities, setFilterPriorities] = useState([]);
  const [filterTags, setFilterTags] = useState([]);

  const [addingToCol, setAddingToCol] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Low');
  const [newTaskTags, setNewTaskTags] = useState('');

  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('jokel-sidebar-open') !== 'false');
  const [activeView, setActiveView] = useState(() => localStorage.getItem(`jokel-active-view-${workspaceId}`) || 'boards');

  const [menuOpenCol, setMenuOpenCol] = useState(null);
  const [editingCol, setEditingCol] = useState(null);
  const [editColTitle, setEditColTitle] = useState('');

  const [quickEditTask, setQuickEditTask] = useState(null);

  const activeFilterCount = filterPriorities.length + filterTags.length;
  const isFiltered = !!searchQuery || activeFilterCount > 0;
  const isBoardView = activeView === 'boards';

  useEffect(() => {
    localStorage.setItem('jokel-sidebar-open', sidebarOpen ? 'true' : 'false');
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem(`jokel-active-view-${workspaceId}`, activeView);
  }, [activeView, workspaceId]);

  const viewTitles = {
    boards: 'Boards',
    backlog: 'Backlog',
    'my-tasks': 'My Tasks',
    inbox: 'Inbox',
    analytics: 'Analytics',
    team: 'Team',
    settings: 'Settings'
  };

  const allTasks = useMemo(() => {
    return Object.values(board.data.tasks).map(task => {
      const column = Object.values(board.data.columns).find(col => col.taskIds.includes(task.id));
      return { ...task, columnId: column?.id, columnTitle: column?.title || 'Backlog' };
    });
  }, [board.data]);

  const matchesFilters = useCallback((task) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches = task.title.toLowerCase().includes(q) ||
        task.code.toLowerCase().includes(q) ||
        task.tags.some(tag => tag.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (filterPriorities.length > 0 && !filterPriorities.includes(task.priority)) return false;
    if (filterTags.length > 0 && !task.tags.some(tag => filterTags.includes(tag))) return false;
    return true;
  }, [searchQuery, filterPriorities, filterTags]);

  const handleAddTask = (columnId) => {
    if (!newTaskTitle.trim()) { setAddingToCol(null); return; }
    board.createTask(columnId, { title: newTaskTitle, priority: newTaskPriority, tags: newTaskTags });
    setNewTaskTitle('');
    setNewTaskTags('');
    setNewTaskPriority('Low');
  };

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) { setAddingColumn(false); return; }
    board.addColumn(newColumnTitle);
    setNewColumnTitle('');
    setAddingColumn(false);
  };

  const handleRenameColumn = (colId) => {
    board.renameColumn(colId, editColTitle);
    setEditingCol(null);
  };

  const startRenameColumn = (colId) => {
    setMenuOpenCol(null);
    if (!colId) { setEditingCol(null); return; }
    setEditColTitle(board.data.columns[colId].title);
    setEditingCol(colId);
  };

  const handleTogglePriority = (p, clear) => {
    if (clear) { setFilterPriorities([]); return; }
    setFilterPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleToggleTag = (tag, clear) => {
    if (clear) { setFilterTags([]); return; }
    setFilterTags(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]);
  };

  const handleNewIssue = () => {
    if (!newIssue.title.trim()) return;
    board.createTask(newIssue.columnId, newIssue);
    setNewIssueOpen(false);
    setNewIssue({ title: '', priority: 'Low', tags: '', description: '', columnId: board.data.columnOrder[0], dueDate: '' });
  };

  const handleDeleteTask = (taskId) => {
    board.deleteTask(taskId);
    setSelectedTask(null);
  };

  const handleUpdateTask = (taskId, updates) => {
    board.updateTask(taskId, updates);
    setSelectedTask(prev => prev ? ({ ...prev, ...updates }) : null);
  };

  const renderActiveView = () => {
    if (activeView === 'backlog') {
      return (
        <BacklogView
          tasks={allTasks}
          columns={board.data.columns}
          columnOrder={board.data.columnOrder}
          onSelectTask={setSelectedTask}
          onMoveTask={board.moveTask}
          onUpdateTask={handleUpdateTask}
        />
      );
    }
    if (activeView === 'my-tasks') {
      return (
        <MyTasksView
          tasks={allTasks}
          columns={board.data.columns}
          columnOrder={board.data.columnOrder}
          onSelectTask={setSelectedTask}
          onMoveTask={board.moveTask}
          onUpdateTask={handleUpdateTask}
        />
      );
    }
    if (activeView === 'inbox') {
      return (
        <InboxView
          tasks={allTasks}
          columns={board.data.columns}
          columnOrder={board.data.columnOrder}
          onSelectTask={setSelectedTask}
          onMoveTask={board.moveTask}
          onUpdateTask={handleUpdateTask}
        />
      );
    }
    if (activeView === 'analytics') return <AnalyticsView tasks={allTasks} onSelectTask={setSelectedTask} />;
    if (activeView === 'team') return <TeamView tasks={allTasks} onSelectTask={setSelectedTask} />;
    if (activeView === 'settings') {
      return (
        <SettingsView
          workspace={currentWorkspace}
          onUpdateWorkspace={(updates) => updateWorkspace(currentWorkspace.id, updates)}
        />
      );
    }

    return (
      <Board
        data={board.data}
        columnOrder={board.data.columnOrder}
        matchesFilters={matchesFilters}
        searchQuery={searchQuery}
        activeFilterCount={activeFilterCount}
        onDragEnd={(result) => board.onDragEnd(result, isFiltered)}
        menuOpenCol={menuOpenCol}
        onToggleMenu={setMenuOpenCol}
        editingCol={editingCol}
        editColTitle={editColTitle}
        onEditColTitleChange={setEditColTitle}
        onRenameColumn={handleRenameColumn}
        onStartRenameColumn={startRenameColumn}
        onClearColumn={board.clearColumn}
        onDeleteColumn={board.deleteColumn}
        addingToCol={addingToCol}
        onOpenComposer={setAddingToCol}
        onCloseComposer={() => {
          setAddingToCol(null);
          setNewTaskTitle('');
          setNewTaskTags('');
          setNewTaskPriority('Low');
        }}
        newTaskTitle={newTaskTitle}
        onTitleChange={setNewTaskTitle}
        newTaskPriority={newTaskPriority}
        onPriorityChange={setNewTaskPriority}
        newTaskTags={newTaskTags}
        onTagsChange={setNewTaskTags}
        onAddTask={handleAddTask}
        onSelectTask={setSelectedTask}
        onQuickEdit={setQuickEditTask}
        addingColumn={addingColumn}
        onOpenAddColumn={() => setAddingColumn(true)}
        onCloseAddColumn={() => { setAddingColumn(false); setNewColumnTitle(''); }}
        newColumnTitle={newColumnTitle}
        onNewColumnTitleChange={setNewColumnTitle}
        onAddColumn={handleAddColumn}
      />
    );
  };

  if (!currentWorkspace) {
    return <Navigate to="/workspace" replace />;
  }

  return (
    <div className={`app-container ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <Sidebar
        isOpen={sidebarOpen}
        activeView={activeView}
        onSelectView={setActiveView}
        onToggle={() => setSidebarOpen(v => !v)}
      />

      <main className="main-content">
        <Topbar
          activeViewTitle={viewTitles[activeView]}
          workspaceName={currentWorkspace.name}
          isBoardView={isBoardView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterOpen={filterOpen}
          onToggleFilter={setFilterOpen}
          filterPriorities={filterPriorities}
          onTogglePriority={handleTogglePriority}
          filterTags={filterTags}
          onToggleTag={handleToggleTag}
          allTags={board.allTags}
          activeFilterCount={activeFilterCount}
          onNewIssue={() => {
            setNewIssue(prev => ({ ...prev, columnId: board.data.columnOrder[0] }));
            setNewIssueOpen(true);
          }}
        />

        {renderActiveView()}
      </main>

      {selectedTask && board.data.tasks[selectedTask.id] && (
        <TaskModal
          task={board.data.tasks[selectedTask.id]}
          columnTitle={board.getColumnForTask(selectedTask.id)?.title || 'Unknown'}
          onClose={() => setSelectedTask(null)}
          onDelete={handleDeleteTask}
          onUpdateDescription={(taskId, desc) => handleUpdateTask(taskId, { description: desc })}
          onUpdateDueDate={(taskId, date) => handleUpdateTask(taskId, { dueDate: date || null })}
          onUpdateTask={handleUpdateTask}
          onMoveTask={board.moveTask}
          columns={board.data.columns}
          columnOrder={board.data.columnOrder}
          onAddComment={board.addComment}
          onFileSelect={board.handleFileSelect}
          onDeleteAttachment={board.deleteAttachment}
          onLightboxOpen={setLightboxImage}
          onAddChecklist={board.addChecklist}
          onAddChecklistItem={board.addChecklistItem}
          onToggleChecklistItem={board.toggleChecklistItem}
          onDeleteChecklist={board.deleteChecklist}
        />
      )}

      {/* Quick-edit modal */}
      {quickEditTask && (
        <div className="modal-overlay" onMouseDown={() => setQuickEditTask(null)}>
          <div className="quick-edit-modal" onMouseDown={e => e.stopPropagation()}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>{quickEditTask.code}</p>
            <textarea
              className="composer-textarea"
              autoFocus
              defaultValue={quickEditTask.title}
              rows={3}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleUpdateTask(quickEditTask.id, { title: e.target.value });
                  setQuickEditTask(null);
                }
                if (e.key === 'Escape') setQuickEditTask(null);
              }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 6 }}>Press Enter to save · Esc to cancel</p>
          </div>
        </div>
      )}

      <NewIssueModal
        isOpen={newIssueOpen}
        onClose={() => setNewIssueOpen(false)}
        data={board.data}
        newIssue={newIssue}
        setNewIssue={setNewIssue}
        onSubmit={handleNewIssue}
      />

      <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
