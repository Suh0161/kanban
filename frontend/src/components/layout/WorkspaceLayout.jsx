import { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, Navigate, Routes, Route, useNavigate, useMatch } from 'react-router-dom';
import { Sidebar, Topbar, NewIssueModal, TaskDetailView } from '../index.js';
import { ErrorBoundary } from '../ui';
import SearchPalette from '../ui/SearchPalette.jsx';

const Board = lazy(() => import('../board/Board'));
const BacklogView = lazy(() => import('../views/backlog/BacklogView'));
const MyWorkView = lazy(() => import('../views/mywork/MyWorkView'));
const TeamView = lazy(() => import('../views/team/TeamView'));
const SettingsView = lazy(() => import('../views/settings/SettingsView'));
import { useWorkspaces } from '../../hooks/useWorkspaces.js';
import { useBoard } from '../../hooks/useBoard.js';
import { useAuth } from '../../hooks/useAuth.js';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts.js';
import usePresence from '../../hooks/usePresence.js';
import { OnboardingTour, isOnboardingComplete, setOnboardingComplete } from '../onboarding/index.js';

const WORKSPACE_ONBOARDING_STEPS = [
  {
    targetSelector: '[data-onboarding="workspace-switch"]',
    title: 'Workspace context',
    body: 'Use the breadcrumb to stay oriented as you move between workspaces, boards, and planning views.',
    placement: 'bottom',
    activeView: 'boards',
  },
  {
    targetSelector: '[data-onboarding="nav-boards"]',
    title: 'Move around fast',
    body: 'The sidebar connects the board, backlog, personal queue, planning views, people, and workspace settings.',
    placement: 'right',
    align: 'start',
    pad: 6,
    activeView: 'boards',
  },
  {
    targetSelector: '[data-onboarding="sidebar-collapse"]',
    title: 'Make more board room',
    body: 'Collapse the sidebar when you want a wider Kanban canvas. The icons stay available so navigation still feels quick.',
    placement: 'bottom',
    activeView: 'boards',
  },
  {
    targetSelector: '[data-onboarding="board-canvas"]',
    title: 'Run the board',
    body: 'Cards move through workflow lists just like Trello, with Taiga-style planning data kept close to each issue.',
    placement: 'bottom',
    activeView: 'boards',
  },
  {
    targetSelector: '[data-onboarding="topbar-board-tools"]',
    title: 'Find the right work',
    body: 'Search by title, code, or tags, then filter by priority or issue type before you update the board.',
    placement: 'bottom',
    activeView: 'boards',
  },
  {
    targetSelector: '[data-onboarding="new-issue"]',
    title: 'Create issues anywhere',
    body: 'Capture reports from any view and send them into the right list without breaking your current flow.',
    placement: 'bottom',
    activeView: 'boards',
  },
  {
    targetSelector: '[data-onboarding="nav-backlog"]',
    title: 'Plan before the board',
    body: 'Use Backlog to groom issues, stage sprint candidates, and spot work that is not ready yet.',
    placement: 'right',
    align: 'start',
    activeView: 'backlog',
  },
  {
    targetSelector: '[data-onboarding="nav-my-work"]',
    title: 'Your personal workspace',
    body: 'My Work combines your tasks, inbox, and completed items in one place for focused work.',
    placement: 'right',
    align: 'start',
    activeView: 'my-work',
  },
  {
    targetSelector: '[data-onboarding="sidebar-settings"]',
    title: 'Tune the workspace',
    body: 'Settings keeps workspace defaults, notifications, permissions, and the option to replay this tour.',
    placement: 'right',
    align: 'start',
    activeView: 'settings',
  },
];

const ViewFallback = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-sans)',
    fontSize: '14px',
  }}>
    Loading...
  </div>
);

export default function WorkspaceLayout() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { workspaces, loading: workspacesLoading, updateWorkspace } = useWorkspaces();
  const {
    data: boardData, isSearching,
    refetch, searchBoard,
    allTags, onDragEnd: boardOnDragEnd,
    createTask, addColumn, deleteColumn, clearColumn, renameColumn,
    deleteTask: boardDeleteTask, updateTask: boardUpdateTask, moveTask: boardMoveTask,
    addComment, handleFileSelect,
    addChecklist, addChecklistItem, toggleChecklistItem, updateChecklistItemCount, deleteChecklist, deleteChecklistItem,
    deleteAttachment,
    updateWorkspaceLabels,
  } = useBoard(workspaceId);

  const currentWorkspace = workspaces.find(w => w.id === workspaceId);

  const navigate = useNavigate();
  const taskRouteMatch = useMatch('/workspace/:workspaceId/tasks/:taskCode');
  const isTaskRoute = !!taskRouteMatch;

  const openTask = useCallback((task) => {
    if (!task?.code) return;
    navigate(`/workspace/${workspaceId}/tasks/${task.code}`);
  }, [navigate, workspaceId]);

  const [newIssueOpen, setNewIssueOpen] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '', priority: 'Low', tags: '', description: '', columnId: null, dueDate: ''
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
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingMountKey, setOnboardingMountKey] = useState(0);
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false);

  const autoTourStartedRef = useRef(false);
  const tourSnapshotViewRef = useRef('boards');

  const { onlineUsers } = usePresence(workspaceId);

  const activeFilterCount = filterPriorities.length + filterTags.length;
  const isFiltered = !!(searchQuery || filterPriorities.length > 0 || filterTags.length > 0);
  const isBoardView = activeView === 'boards';

  useEffect(() => {
    localStorage.setItem('jokel-sidebar-open', sidebarOpen ? 'true' : 'false');
  }, [sidebarOpen]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem(`jokel-active-view-${workspaceId}`, activeView);
  }, [activeView, workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    const filters = {};
    if (filterPriorities.length > 0 && filterPriorities.length < 4) {
      filters.priority = filterPriorities.join(',');
    }
    if (filterTags.length > 0) {
      filters.tags = filterTags;
    }
    if (searchQuery || filterPriorities.length > 0 || filterTags.length > 0) {
      searchBoard(searchQuery, filters);
    } else {
      refetch();
    }
  }, [searchQuery, filterPriorities, filterTags, workspaceId, searchBoard, refetch]);

  const beginOnboarding = useCallback((options = {}) => {
    const { forceBoards = false } = options;
    tourSnapshotViewRef.current = activeView;
    if (forceBoards) setActiveView('boards');
    setSidebarOpen(true);
    setOnboardingMountKey(k => k + 1);
    setOnboardingOpen(true);
  }, [activeView]);

  useEffect(() => {
    if (!workspaceId || !user || isOnboardingComplete(user)) return;
    if (autoTourStartedRef.current) return;
    autoTourStartedRef.current = true;
    beginOnboarding({ forceBoards: true });
  }, [workspaceId, user, beginOnboarding]);

  const finishOnboarding = useCallback(() => {
    setOnboardingOpen(false);
    if (user) setOnboardingComplete(user);
  }, [user]);

  const skipOnboarding = useCallback(() => {
    setOnboardingOpen(false);
    setActiveView(tourSnapshotViewRef.current);
    if (user) setOnboardingComplete(user);
  }, [user]);

  const handleTourStepChange = useCallback((step) => {
    if (step?.activeView) setActiveView(step.activeView);
  }, []);

  const replayGuidedTour = useCallback(() => {
    beginOnboarding({ forceBoards: true });
  }, [beginOnboarding]);

  const viewTitles = {
    boards: 'Boards',
    backlog: 'Backlog',
    'my-work': 'My Work',
    team: 'Team',
    settings: 'Settings'
  };

  const allTasks = useMemo(() => {
    return Object.values(boardData.tasks).map(task => {
      const column = Object.values(boardData.columns).find(col => col.taskIds.includes(task.id));
      return { ...task, columnId: column?.id, columnTitle: column?.title || 'Backlog' };
    });
  }, [boardData]);

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
    createTask(columnId, { title: newTaskTitle, priority: newTaskPriority, tags: newTaskTags });
    setAddingToCol(null);
    setNewTaskTitle('');
    setNewTaskTags('');
    setNewTaskPriority('Low');
  };

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) { setAddingColumn(false); return; }
    addColumn(newColumnTitle);
    setNewColumnTitle('');
    setAddingColumn(false);
  };

  const handleRenameColumn = (colId) => {
    renameColumn(colId, editColTitle);
    setEditingCol(null);
  };

  const startRenameColumn = (colId) => {
    setMenuOpenCol(null);
    if (!colId) { setEditingCol(null); return; }
    setEditColTitle(boardData.columns[colId].title);
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
    createTask(newIssue.columnId, newIssue);
    setNewIssueOpen(false);
    setNewIssue({ title: '', priority: 'Low', tags: '', description: '', columnId: boardData.columnOrder[0], dueDate: '' });
  };

  const handleDeleteTask = (taskId) => {
    boardDeleteTask(taskId);
  };

  const handleUpdateTask = (taskId, updates) => {
    boardUpdateTask(taskId, updates);
  };

  useKeyboardShortcuts({
    onCreateTask: () => {
      if (boardData.columnOrder.length > 0) {
        setAddingToCol(boardData.columnOrder[0]);
      }
    },
    onSearchFocus: () => {
      setFilterOpen(true);
    },
    selectedTask: null,
    onOpenTask: (task) => openTask(task),
    onCloseTask: () => {},
    onChangePriority: (taskId, priority) => {
      handleUpdateTask(taskId, { priority });
    },
    onDeleteTask: (taskId) => {
      handleDeleteTask(taskId);
    },
    onNextView: () => {
      const views = ['boards', 'backlog', 'my-work', 'team', 'settings'];
      const idx = views.indexOf(activeView);
      if (idx < views.length - 1) setActiveView(views[idx + 1]);
    },
    onPrevView: () => {
      const views = ['boards', 'backlog', 'my-work', 'team', 'settings'];
      const idx = views.indexOf(activeView);
      if (idx > 0) setActiveView(views[idx - 1]);
    },
    isModalOpen: isTaskRoute,
    isComposerOpen: !!addingToCol,
    activeView,
  });

  const renderActiveView = () => {
    if (activeView === 'backlog') {
      return (
        <ErrorBoundary key="backlog">
          <Suspense fallback={<ViewFallback />}>
            <BacklogView
              tasks={allTasks}
              columns={boardData.columns}
              columnOrder={boardData.columnOrder}
              onSelectTask={openTask}
              onMoveTask={boardMoveTask}
              onUpdateTask={handleUpdateTask}
            />
          </Suspense>
        </ErrorBoundary>
      );
    }
    if (activeView === 'my-work') {
      return (
        <ErrorBoundary key="my-work">
          <Suspense fallback={<ViewFallback />}>
            <MyWorkView
              tasks={allTasks}
              columns={boardData.columns}
              columnOrder={boardData.columnOrder}
              onSelectTask={openTask}
              onMoveTask={boardMoveTask}
              onUpdateTask={handleUpdateTask}
              user={user}
            />
          </Suspense>
        </ErrorBoundary>
      );
    }
    if (activeView === 'team') {
      return (
        <ErrorBoundary key="team">
          <Suspense fallback={<ViewFallback />}>
            <TeamView tasks={allTasks} onSelectTask={openTask} />
          </Suspense>
        </ErrorBoundary>
      );
    }
    if (activeView === 'settings') {
      return (
        <ErrorBoundary key="settings">
          <Suspense fallback={<ViewFallback />}>
            <SettingsView
              workspace={currentWorkspace}
              onUpdateWorkspace={async (updates) => {
                await updateWorkspace(currentWorkspace.id, updates);
                if (updates.customFields !== undefined || updates.labels !== undefined) {
                  refetch();
                }
              }}
              showReplayGuidedTour={!!user}
              onReplayGuidedTour={replayGuidedTour}
              labels={boardData.labels || []}
              onUpdateLabels={updateWorkspaceLabels}
            />
          </Suspense>
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary key="boards">
        <Suspense fallback={<ViewFallback />}>
          <Board
            data={boardData}
            columnOrder={boardData.columnOrder}
            matchesFilters={matchesFilters}
            searchQuery={searchQuery}
            activeFilterCount={activeFilterCount}
            onDragEnd={(result) => boardOnDragEnd(result, isFiltered)}
            menuOpenCol={menuOpenCol}
            onToggleMenu={setMenuOpenCol}
            editingCol={editingCol}
            editColTitle={editColTitle}
            onEditColTitleChange={setEditColTitle}
            onRenameColumn={handleRenameColumn}
            onStartRenameColumn={startRenameColumn}
            onClearColumn={clearColumn}
            onDeleteColumn={deleteColumn}
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
            onSelectTask={openTask}
            onQuickEdit={setQuickEditTask}
            onChangePriority={(taskId, priority) => handleUpdateTask(taskId, { priority })}
            onMoveTask={boardMoveTask}
            onDeleteTask={handleDeleteTask}
            columns={boardData.columns}
            addingColumn={addingColumn}
            onOpenAddColumn={() => setAddingColumn(true)}
            onCloseAddColumn={() => { setAddingColumn(false); setNewColumnTitle(''); }}
            newColumnTitle={newColumnTitle}
            onNewColumnTitleChange={setNewColumnTitle}
            onAddColumn={handleAddColumn}
            labels={boardData.labels || []}
            workspaceId={workspaceId}
          />
        </Suspense>
      </ErrorBoundary>
    );
  };

  if (workspacesLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    );
  }

  if (!currentWorkspace) {
    return <Navigate to="/workspace" replace />;
  }

  return (
    <div className={`app-container ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <Sidebar
        isOpen={sidebarOpen}
        activeView={activeView}
        onSelectView={(view) => {
          setActiveView(view);
          if (isTaskRoute) navigate(`/workspace/${workspaceId}`);
        }}
        onToggle={() => setSidebarOpen(v => !v)}
        onOpenSettings={() => setActiveView('settings')}
      />

      <main className="main-content">
        <Topbar
          activeViewTitle={isTaskRoute ? (taskRouteMatch?.params?.taskCode || 'Task') : viewTitles[activeView]}
          workspaceName={currentWorkspace.name}
          isBoardView={isBoardView && !isTaskRoute}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterOpen={filterOpen}
          onToggleFilter={setFilterOpen}
          filterPriorities={filterPriorities}
          onTogglePriority={handleTogglePriority}
          filterTags={filterTags}
          onToggleTag={handleToggleTag}
          allTags={allTags}
          activeFilterCount={activeFilterCount}
          onNewIssue={() => {
            setNewIssue(prev => ({ ...prev, columnId: boardData.columnOrder[0] }));
            setNewIssueOpen(true);
          }}
          isSearching={isSearching}
          onlineUsers={onlineUsers}
        />

        <div className="main-view" data-onboarding="main-view">
          <Routes>
            <Route
              path="tasks/:taskCode"
              element={
                <TaskDetailView
                  workspaceId={workspaceId}
                  boardData={boardData}
                  onDeleteTask={handleDeleteTask}
                  onUpdateTask={handleUpdateTask}
                  onUpdateDescription={(taskId, desc) => handleUpdateTask(taskId, { description: desc })}
                  onUpdateDueDate={(taskId, date) => handleUpdateTask(taskId, { dueDate: date || null })}
                  onMoveTask={boardMoveTask}
                  onAddComment={addComment}
                  onFileSelect={handleFileSelect}
                  onDeleteAttachment={deleteAttachment}
                  onAddChecklist={addChecklist}
                  onAddChecklistItem={addChecklistItem}
                  onToggleChecklistItem={toggleChecklistItem}
                  onUpdateChecklistItemCount={updateChecklistItemCount}
                  onDeleteChecklist={deleteChecklist}
                  onDeleteChecklistItem={deleteChecklistItem}
                />
              }
            />
            <Route path="*" element={renderActiveView()} />
          </Routes>
        </div>
      </main>

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
        data={boardData}
        newIssue={newIssue}
        setNewIssue={setNewIssue}
        onSubmit={handleNewIssue}
      />

      {searchPaletteOpen && (
        <SearchPalette
          tasks={boardData.tasks}
          columns={boardData.columns}
          columnOrder={boardData.columnOrder}
          onSelectTask={(task) => { openTask(task); }}
          onClose={() => setSearchPaletteOpen(false)}
        />
      )}

      <OnboardingTour
        key={onboardingMountKey}
        open={onboardingOpen}
        steps={WORKSPACE_ONBOARDING_STEPS}
        onDismiss={skipOnboarding}
        onFinish={finishOnboarding}
        onStepChange={handleTourStepChange}
      />
    </div>
  );
}
