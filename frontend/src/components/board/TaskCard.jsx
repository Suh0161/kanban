import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { MessageSquare, Paperclip, Calendar, Pencil, CheckSquare } from 'lucide-react';
import { formatDate, isOverdue, isDueToday } from '../../utils/helpers.js';

export default function TaskCard({ task, index, isFiltered, onSelect, onQuickEdit }) {
  const [hovered, setHovered] = useState(false);

  const dueDateClass = isOverdue(task.dueDate)
    ? 'overdue'
    : isDueToday(task.dueDate)
    ? 'due-today'
    : '';

  const totalChecks = task.checklists?.reduce((acc, cl) => acc + cl.items.length, 0) || 0;
  const doneChecks = task.checklists?.reduce((acc, cl) => acc + cl.items.filter(i => i.done).length, 0) || 0;
  const hasChecklists = totalChecks > 0;

  return (
    <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={isFiltered}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card ${snapshot.isDragging ? 'is-dragging' : ''}`}
          onClick={() => onSelect(task)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ position: 'relative', ...provided.draggableProps.style }}
        >
          {task.attachments && task.attachments.length > 0 && (
            <div className="card-cover">
              <img src={task.attachments[0].url} alt="cover" />
            </div>
          )}
          <div className="card-header">
            <span className="card-id">{task.code}</span>
            {task.dueDate && (
              <span className={`card-due ${dueDateClass}`}>
                <Calendar size={10} /> {formatDate(task.dueDate)}
              </span>
            )}
          </div>
          
          <div className="card-title-row">
            <h4 className="card-title" style={{ marginBottom: 0 }}>{task.title}</h4>
            <button
              className={`card-quick-edit ${hovered ? 'visible' : ''}`}
              title="Quick edit title"
              onClick={e => {
                e.stopPropagation();
                onQuickEdit(task);
              }}
            >
              <Pencil size={14} />
            </button>
          </div>

          <div className="tags" style={{ marginTop: 12 }}>
            <span className={`tag priority-${task.priority}`}>{task.priority}</span>
            {task.tags.map(tag => (
              <span key={tag} className="tag type-label">{tag}</span>
            ))}
          </div>
          <div className="card-footer">
            <div className="card-metrics">
              {task.metrics.comments > 0 && <span className="metric active"><MessageSquare size={12} /> {task.metrics.comments}</span>}
              {task.metrics.attachments > 0 && <span className="metric active"><Paperclip size={12} /> {task.metrics.attachments}</span>}
              {hasChecklists && (
                <span className={`metric ${doneChecks === totalChecks ? 'active done' : 'active'}`}>
                  <CheckSquare size={12} /> {doneChecks}/{totalChecks}
                </span>
              )}
            </div>
            <div className="card-assignees">
              {task.assigneeImg && (
                <img src={task.assigneeImg} alt="Assignee" className="avatar tiny" title={task.assigneeName || ''} />
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
