import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import BoardColumn from './BoardColumn.jsx';
import AddColumnComposer from './AddColumnComposer.jsx';

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
  addingColumn, onOpenAddColumn, onCloseAddColumn,
  newColumnTitle, onNewColumnTitleChange, onAddColumn
}) {
  const isFiltered = !!searchQuery || activeFilterCount > 0;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="all-columns" direction="horizontal" type="COLUMN">
        {(provided) => (
          <div
            className="board-canvas"
            ref={provided.innerRef}
            {...provided.droppableProps}
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
                />
              );
            })}
            {provided.placeholder}

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
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
