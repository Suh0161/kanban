import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Droppable } from '@hello-pangea/dnd';
import DemoCard from './DemoCard.jsx';

export default function DemoColumn({
  column,
  tasks,
  allTasks = tasks,
  isFiltered = false,
  isCollapsed = false,
  onToggleCollapse,
}) {
  const count = isFiltered ? tasks.length : allTasks.length;
  const countLabel = isFiltered ? `${tasks.length} / ${allTasks.length}` : String(count);
  const isDense = (isFiltered ? allTasks : tasks).length >= 4;

  if (isCollapsed) {
    return (
      <div className={`demo-column board-column is-collapsed${isDense ? ' is-dense' : ''}`}>
        <button
          type="button"
          className="demo-column-collapsed column-collapsed"
          onClick={() => onToggleCollapse?.(column.id)}
          aria-label={`Expand ${column.title}`}
          title={`Expand ${column.title}`}
        >
          <ChevronRight size={14} className="demo-column-collapsed-chevron column-collapsed-chevron" />
          <span className="demo-column-collapsed-title column-collapsed-title">{column.title}</span>
          <span className="demo-column-collapsed-count column-collapsed-count">{countLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`demo-column board-column${isDense ? ' is-dense' : ''}`}>
      <div className="demo-column-header column-header">
        <div className="demo-column-title column-title">
          <h3>{column.title}</h3>
          <span className="demo-column-count task-count">{countLabel}</span>
        </div>
        <div className="demo-column-actions column-header-actions">
          <button
            type="button"
            className="demo-column-collapse-btn column-collapse-btn"
            onClick={() => onToggleCollapse?.(column.id)}
            aria-label={`Collapse ${column.title}`}
            title="Collapse column"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <span className="demo-column-menu" aria-hidden="true" />
        </div>
      </div>

      <Droppable droppableId={column.id} type="TASK" isDropDisabled={isFiltered}>
        {(provided, snapshot) => (
          <div
            className={`demo-column-body column-content${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {tasks.map((task, index) => (
              <DemoCard key={task.id} task={task} index={index} isFiltered={isFiltered} />
            ))}
            {provided.placeholder}
            {!isFiltered ? (
              <span className="demo-add-card" aria-hidden="true">+ Add card</span>
            ) : null}
          </div>
        )}
      </Droppable>
    </div>
  );
}
