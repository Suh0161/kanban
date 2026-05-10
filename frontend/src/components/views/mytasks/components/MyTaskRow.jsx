import { Calendar, CheckCircle2, MessageSquare, Paperclip } from 'lucide-react';
import Select from '../../../ui/Select.jsx';
import { formatDate, isOverdue } from '../../../../utils/helpers.js';

function dueLabel(date) {
  if (!date) return 'No due date';
  return formatDate(date);
}

export default function MyTaskRow({ task, columns, columnOrder, doneColumnId, onSelectTask, onMoveTask, onUpdateTask }) {
  const columnOptions = columnOrder
    .map(columnId => columns[columnId])
    .filter(Boolean)
    .map(column => ({ value: column.id, label: column.title }));

  return (
    <article className="mytask-row">
      <span className={`workspace-task-accent ${task.priority.toLowerCase()}`} />
      <div className="mytask-main">
        <div className="workspace-task-meta">
          <span>{task.code}</span>
          <span>{task.columnTitle}</span>
        </div>
        <button type="button" className="mytask-title" onClick={() => onSelectTask(task)}>
          {task.title}
        </button>
        <div className="workspace-task-tags">
          {task.tags.map(tag => <span key={tag}>{tag}</span>)}
          {task.dueDate && isOverdue(task.dueDate) && <span className="mytask-chip danger">Overdue</span>}
        </div>
      </div>

      <div className="mytask-field">
        <span>Status</span>
        <Select
          value={task.columnId || columnOptions[0]?.value}
          options={columnOptions}
          className="mytask-select"
          onChange={value => onMoveTask(task.id, value)}
        />
      </div>

      <label className="mytask-field">
        <span>Due</span>
        <input
          type="date"
          value={task.dueDate || ''}
          onChange={event => onUpdateTask(task.id, { dueDate: event.target.value || null })}
          aria-label={`${task.code} due date`}
        />
      </label>

      <div className="mytask-signals">
        <span className={`workspace-priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
        <span className="workspace-muted"><Calendar size={13} />{dueLabel(task.dueDate)}</span>
        <span className="workspace-muted"><MessageSquare size={13} />{task.metrics.comments}</span>
        <span className="workspace-muted"><Paperclip size={13} />{task.metrics.attachments}</span>
      </div>

      <div className="mytask-actions">
        {task.assigneeImg ? <img src={task.assigneeImg} alt="" className="avatar" /> : <span className="workspace-avatar-empty" />}
        <button className="btn btn-outline btn-sm" type="button" onClick={() => onSelectTask(task)}>Open</button>
        <button
          className="btn btn-outline btn-sm"
          type="button"
          onClick={() => doneColumnId && onMoveTask(task.id, doneColumnId)}
          disabled={!doneColumnId || task.columnTitle === 'Done'}
        >
          <CheckCircle2 size={13} /> Done
        </button>
      </div>
    </article>
  );
}
