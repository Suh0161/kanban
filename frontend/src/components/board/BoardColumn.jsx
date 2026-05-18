import { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip } from '../ui';
import TaskCard from './TaskCard.jsx';
import AddCardComposer from './AddCardComposer.jsx';
import ColumnMenu from './ColumnMenu.jsx';

const INITIAL_VISIBLE = 8;

export default function BoardColumn({
  column, columnIndex, visibleTasks, allTasks,
  isFiltered,
  isCollapsed, onToggleCollapse,
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
  columnOrder,
  labels = [],
  canEdit = true,
}) {
  const isEditing = editingCol === column.id;
  const isAdding = addingToCol === column.id;
  const count = isFiltered ? visibleTasks.length : allTasks.length;
  const isDense = allTasks.length >= 8;
  const [expanded, setExpanded] = useState(false);

  const displayTasks = isFiltered ? visibleTasks : allTasks;
  const showMoreBtn = !expanded && !isFiltered && displayTasks.length > INITIAL_VISIBLE;
  const visibleCards = (expanded || isFiltered) ? displayTasks : displayTasks.slice(0, INITIAL_VISIBLE);
  const hiddenCount = displayTasks.length - INITIAL_VISIBLE;

  return (
    <Draggable
      draggableId={`col-drag-${column.id}`}
      index={columnIndex}
      type="COLUMN"
      isDragDisabled={isCollapsed || !canEdit}
    >
      {(colProvided) => (
        <div
          className={`board-column${isCollapsed ? ' is-collapsed' : ''}${isDense ? ' is-dense' : ''}`}
          ref={colProvided.innerRef}
          {...colProvided.draggableProps}
        >
          {isCollapsed ? (
            <Tooltip content={`Expand ${column.title}`} position="right">
              <button
                type="button"
                className="column-collapsed"
                onClick={() => onToggleCollapse(column.id)}
                aria-label={`Expand ${column.title}`}
                {...colProvided.dragHandleProps}
              >
                <ChevronRight size={14} className="column-collapsed-chevron" />
                <span className="column-collapsed-title">{column.title}</span>
                <span className="column-collapsed-count">{count}</span>
              </button>
            </Tooltip>
          ) : (
            <>
              <div className="column-header" {...colProvided.dragHandleProps}>
                {isEditing ? (
                  <div className="column-title-edit">
                    <input
                      value={editColTitle}
                      onChange={e => onEditColTitleChange(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') onRenameColumn(column.id);
                        if (e.key === 'Escape') onStartRenameColumn(null);
                      }}
                      onBlur={() => onRenameColumn(column.id)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="column-title">
                    <h3>{column.title}</h3>
                    <span className="task-count">{isFiltered ? `${visibleTasks.length} / ${allTasks.length}` : allTasks.length}</span>
                  </div>
                )}
                <div className="column-header-actions">
                  <Tooltip content="Collapse column">
                    <button
                      type="button"
                      className="column-collapse-btn"
                      onClick={() => onToggleCollapse(column.id)}
                      aria-label="Collapse column"
                    >
                      <ChevronLeft size={14} />
                    </button>
                  </Tooltip>
                  {canEdit && (
                    <ColumnMenu
                      columnId={column.id}
                      menuOpenCol={menuOpenCol}
                      onToggleMenu={onToggleMenu}
                      onRename={onStartRenameColumn}
                      onClear={onClearColumn}
                      onDelete={onDeleteColumn}
                    />
                  )}
                </div>
              </div>

              <Droppable droppableId={column.id} isDropDisabled={isFiltered || !canEdit} type="TASK">
                {(provided) => (
                  <div
                    className="column-content"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {visibleCards.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={index}
                        isFiltered={isFiltered}
                        onSelect={onSelectTask}
                        onQuickEdit={onQuickEdit}
                        onChangePriority={onChangePriority}
                        onMoveTask={onMoveTask}
                        onDeleteTask={onDeleteTask}
                        columns={columns}
                        columnOrder={columnOrder}
                        labels={labels}
                        canEdit={canEdit}
                      />
                    ))}
                    {provided.placeholder}

                    {showMoreBtn && (
                      <button
                        type="button"
                        className="column-show-more"
                        onClick={() => setExpanded(true)}
                      >
                        Show {hiddenCount} more card{hiddenCount === 1 ? '' : 's'}
                      </button>
                    )}

                    {expanded && displayTasks.length > INITIAL_VISIBLE && (
                      <button
                        type="button"
                        className="column-show-more"
                        onClick={() => setExpanded(false)}
                      >
                        Show less
                      </button>
                    )}

                    {canEdit && !isFiltered && (
                      <AddCardComposer
                        columnId={column.id}
                        isOpen={isAdding}
                        onOpen={() => onOpenComposer(column.id)}
                        onClose={onCloseComposer}
                        title={newTaskTitle}
                        onTitleChange={onTitleChange}
                        priority={newTaskPriority}
                        onPriorityChange={onPriorityChange}
                        tags={newTaskTags}
                        onTagsChange={onTagsChange}
                        onSubmit={onAddTask}
                      />
                    )}
                  </div>
                )}
              </Droppable>
            </>
          )}
        </div>
      )}
    </Draggable>
  );
}
