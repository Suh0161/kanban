import { Draggable, Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard.jsx';
import AddCardComposer from './AddCardComposer.jsx';
import ColumnMenu from './ColumnMenu.jsx';

export default function BoardColumn({
  column, columnIndex, visibleTasks, allTasks,
  isFiltered,
  menuOpenCol, onToggleMenu,
  editingCol, editColTitle, onEditColTitleChange, onRenameColumn, onStartRenameColumn,
  onClearColumn, onDeleteColumn,
  addingToCol, onOpenComposer, onCloseComposer,
  newTaskTitle, onTitleChange,
  newTaskPriority, onPriorityChange,
  newTaskTags, onTagsChange,
  onAddTask,
  onSelectTask,
  onQuickEdit
}) {
  const isEditing = editingCol === column.id;
  const isAdding = addingToCol === column.id;

  return (
    <Draggable draggableId={`col-drag-${column.id}`} index={columnIndex} type="COLUMN">
      {(colProvided) => (
        <div
          className="board-column"
          ref={colProvided.innerRef}
          {...colProvided.draggableProps}
        >
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
            <ColumnMenu
              columnId={column.id}
              menuOpenCol={menuOpenCol}
              onToggleMenu={onToggleMenu}
              onRename={onStartRenameColumn}
              onClear={onClearColumn}
              onDelete={onDeleteColumn}
            />
          </div>

          <Droppable droppableId={column.id} isDropDisabled={isFiltered} type="TASK">
            {(provided) => (
              <div
                className="column-content"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {(isFiltered ? visibleTasks : allTasks).map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    isFiltered={isFiltered}
                    onSelect={onSelectTask}
                    onQuickEdit={onQuickEdit}
                  />
                ))}
                {provided.placeholder}

                {!isFiltered && (
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
        </div>
      )}
    </Draggable>
  );
}
