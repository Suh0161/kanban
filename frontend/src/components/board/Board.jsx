import { useState, useCallback } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import BoardColumn from './BoardColumn.jsx';
import AddColumnComposer from './AddColumnComposer.jsx';

const STORAGE_KEY = (workspaceId) => `Elevate-collapsed-cols-${workspaceId}`;

function loadCollapsed(workspaceId) {
  if (!workspaceId) return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY(workspaceId));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveCollapsed(workspaceId, set) {
  if (!workspaceId) return;
  try {
    localStorage.setItem(STORAGE_KEY(workspaceId), JSON.stringify([...set]));
  } catch {
    // ignore storage failures
  }
}

export default function Board({
  data, columnOrder,
  matchesFilters,
  searchQuery, activeFilterCount,
  onDragEnd,
  menuOpenCol, onToggleMenu,
  editingCol, editColTitle, onEditColTitleChange, onRenameColumn, onStartRenameColumn,
  onClearColumn, onDeleteColumn,
  addingToCol, onOpenComposer, onCloseComposer,
  newTaskTitle, onTitleChange,
  newTaskPriority, onPriorityChange,
  newTaskTags, onTagsChange,
  onAddTask,
  onSelectTask,
  onQuickEdit,
  onChangePriority,
  onMoveTask,
  onDeleteTask,
  columns,
  addingColumn, onOpenAddColumn, onCloseAddColumn,
  newColumnTitle, onNewColumnTitleChange, onAddColumn,
  labels = [],
  workspaceId,
  background = null,
  canEdit = true,
}) {
  const isFiltered = !!searchQuery || activeFilterCount > 0;

  const [collapsedState, setCollapsedState] = useState(() => ({
    workspaceId,
    set: loadCollapsed(workspaceId),
  }));

  // Re-load when the workspace switches. Pattern recommended for derived state:
  // detect the input change in render, not in an effect.
  if (collapsedState.workspaceId !== workspaceId) {
    setCollapsedState({ workspaceId, set: loadCollapsed(workspaceId) });
  }
  const collapsed = collapsedState.set;

  const toggleCollapse = useCallback((columnId) => {
    setCollapsedState((prev) => {
      const next = new Set(prev.set);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      saveCollapsed(prev.workspaceId, next);
      return { workspaceId: prev.workspaceId, set: next };
    });
  }, []);

  // Resolve the workspace background into an inline style. Image URLs use
  // background-size: cover; color values render flat. Falling back to
  // `undefined` lets the CSS variable in `.board-canvas` take over.
  const isImage = !!background && /^(https?:\/\/|\/api\/v1\/backgrounds\/)/i.test(background);
  const apiOrigin = (() => {
    try {
      const base = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api/v1';
      return new URL(base).origin;
    } catch { return ''; }
  })();
  const bgUrl = isImage && background.startsWith('/')
    ? `${apiOrigin}${background}`
    : background;
  const canvasStyle = !background
    ? undefined
    : isImage
      ? { background: `var(--bg-canvas) url(${bgUrl}) center / cover no-repeat fixed` }
      : { background };

  return (
    <DragDropContext onDragEnd={canEdit ? onDragEnd : () => { /* read-only */ }}>
      <Droppable droppableId="all-columns" direction="horizontal" type="COLUMN">
        {(provided) => (
          <div
            className="board-canvas"
            data-onboarding="board-canvas"
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={canvasStyle}
          >
            {columnOrder.map((columnId, index) => {
              const column = data.columns[columnId];
              const allTasks = column.taskIds.map(taskId => data.tasks[taskId]).filter(Boolean);
              const visibleTasks = allTasks.filter(matchesFilters);

              return (
                <BoardColumn
                  key={column.id}
                  column={column}
                  columnIndex={index}
                  tasks={allTasks}
                  visibleTasks={visibleTasks}
                  allTasks={allTasks}
                  isFiltered={isFiltered}
                  isCollapsed={collapsed.has(column.id)}
                  onToggleCollapse={toggleCollapse}
                  menuOpenCol={menuOpenCol}
                  onToggleMenu={onToggleMenu}
                  editingCol={editingCol}
                  editColTitle={editColTitle}
                  onEditColTitleChange={onEditColTitleChange}
                  onRenameColumn={onRenameColumn}
                  onStartRenameColumn={onStartRenameColumn}
                  onClearColumn={onClearColumn}
                  onDeleteColumn={onDeleteColumn}
                  addingToCol={addingToCol}
                  onOpenComposer={onOpenComposer}
                  onCloseComposer={onCloseComposer}
                  newTaskTitle={newTaskTitle}
                  onTitleChange={onTitleChange}
                  newTaskPriority={newTaskPriority}
                  onPriorityChange={onPriorityChange}
                  newTaskTags={newTaskTags}
                  onTagsChange={onTagsChange}
                  onAddTask={onAddTask}
                  onSelectTask={onSelectTask}
                  onQuickEdit={onQuickEdit}
                  onChangePriority={onChangePriority}
                  onMoveTask={onMoveTask}
                  onDeleteTask={onDeleteTask}
                  columns={columns}
                  columnOrder={columnOrder}
                  labels={labels}
                  canEdit={canEdit}
                />
              );
            })}
            {provided.placeholder}

            {canEdit && (
              <div className="board-column add-column-wrapper">
                <AddColumnComposer
                  isOpen={addingColumn}
                  onOpen={onOpenAddColumn}
                  onClose={onCloseAddColumn}
                  title={newColumnTitle}
                  onTitleChange={onNewColumnTitleChange}
                  onSubmit={onAddColumn}
                />
              </div>
            )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
