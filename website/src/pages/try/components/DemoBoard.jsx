import { DragDropContext } from '@hello-pangea/dnd';
import { useDemoBoard, matchesDemoTaskSearch } from '../useDemoBoard.js';
import DemoColumn from './DemoColumn.jsx';

const EMPTY_COLLAPSED = new Set();
const noop = () => {};

function DemoBoardCanvas({
  data,
  columnOrder,
  onDragEnd,
  collapsedColumns,
  onToggleCollapse,
  searchQuery = '',
}) {
  const isFiltered = Boolean(searchQuery.trim());
  const matchesSearch = (task) => matchesDemoTaskSearch(task, searchQuery);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        className={`demo-board board-canvas${isFiltered ? ' is-filtered' : ''}`}
        data-demo-board-canvas
      >
        {columnOrder.map((columnId) => {
          const column = data.columns[columnId];
          if (!column) return null;

          const allTasks = column.taskIds
            .map((taskId) => data.tasks[taskId])
            .filter(Boolean);
          const visibleTasks = isFiltered
            ? allTasks.filter(matchesSearch)
            : allTasks;

          return (
            <DemoColumn
              key={column.id}
              column={column}
              tasks={visibleTasks}
              allTasks={allTasks}
              isFiltered={isFiltered}
              isCollapsed={collapsedColumns.has(column.id)}
              onToggleCollapse={onToggleCollapse}
            />
          );
        })}
      </div>
    </DragDropContext>
  );
}

function DemoBoardWithState() {
  const {
    data,
    onDragEnd,
    collapsedColumns,
    onToggleCollapse,
    searchQuery,
  } = useDemoBoard();
  return (
    <DemoBoardCanvas
      data={data}
      columnOrder={data.columnOrder}
      onDragEnd={onDragEnd}
      collapsedColumns={collapsedColumns}
      onToggleCollapse={onToggleCollapse}
      searchQuery={searchQuery}
    />
  );
}

/**
 * Kanban canvas for the /try demo. Accepts hook state from a parent or
 * calls useDemoBoard() when data / columnOrder / onDragEnd are omitted.
 */
export default function DemoBoard({
  data: dataProp,
  columnOrder: columnOrderProp,
  onDragEnd: onDragEndProp,
  collapsedColumns: collapsedColumnsProp,
  onToggleCollapse: onToggleCollapseProp,
  searchQuery: searchQueryProp = '',
} = {}) {
  const hasExternalState =
    dataProp != null && columnOrderProp != null && onDragEndProp != null;

  if (hasExternalState) {
    return (
      <DemoBoardCanvas
        data={dataProp}
        columnOrder={columnOrderProp}
        onDragEnd={onDragEndProp}
        collapsedColumns={collapsedColumnsProp ?? EMPTY_COLLAPSED}
        onToggleCollapse={onToggleCollapseProp ?? noop}
        searchQuery={searchQueryProp}
      />
    );
  }

  return <DemoBoardWithState />;
}
