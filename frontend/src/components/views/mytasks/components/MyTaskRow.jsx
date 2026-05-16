import { CheckCircle2, MessageSquare, Paperclip } from 'lucide-react';
import Select from '../../../ui/Select.jsx';
import { formatDate, isOverdue } from '../../../../utils/helpers.js';

export default function MyTaskRow({ task, columns, columnOrder, doneColumnId, onSelectTask, onMoveTask, onUpdateTask }) {
  const columnOptions = columnOrder
    .map(id => columns[id])
    .filter(Boolean)
    .map(col => ({ value: col.id, label: col.title }));

  const overdue = task.dueDate && isOverdue(task.dueDate);

  return (
    <article className={`mytask-row ${overdue ? 'is-overdue' : ''}`}>
      <span className={`workspace-task-accent ${task.priority.toLowerCase()}`} />

      {/* Main info */}
      <div className="mytask-main">
        <div className="mytask-meta-top">
          <span className="mytask-code">{task.code}</span>
          <span className="mytask-col">{task.columnTitle}</span>
          {task.tags.map(tag => <span key={tag} className="mytask-tag">{tag}</span>)}
        </div>
        <button type="button" className="mytask-title" onClick={() => onSelectTask(task)}>
          {task.title}
        </button>
        <div className="mytask-badges">
          <span className={`mytask-priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
          {overdue && <span className="mytask-chip danger">Overdue</span>}
          {task.metrics.comments > 0 && (
            <span className="mytask-metric"><MessageSquare size={11} />{task.metrics.comments}</span>
          )}
          {task.metrics.attachments > 0 && (
            <span className="mytask-metric"><Paperclip size={11} />{task.metrics.attachments}</span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="mytask-field">
        <span>Status</span>
        <Select
          value={task.columnId || columnOptions[0]?.value}
          options={columnOptions}
          className="mytask-select"
          onChange={value => onMoveTask(task.id, value)}
        />
      </div>

      {/* Due date */}
      <label className="mytask-field">
        <span>Due date</span>
        <input
          type="date"
          value={task.dueDate || ''}
          onChange={e => onUpdateTask(task.id, { dueDate: e.target.value || null })}
          aria-label={`${task.code} due date`}
          className={overdue ? 'overdue-input' : ''}
        />
      </label>

      {/* Actions */}
      <div className="mytask-actions">
        {task.assigneeImg
          ? <img src={task.assigneeImg} alt={task.assigneeName || ''} className="avatar mytask-avatar" title={task.assigneeName} />
          : <span className="workspace-avatar-empty mytask-avatar" />
        }
        {task.dueDate && (
          <span className={`mytask-due-label ${overdue ? 'overdue' : ''}`}>{formatDate(task.dueDate)}</span>
        )}
        <div className="mytask-action-btns">
          <button className="btn btn-outline btn-sm" type="button" onClick={() => onSelectTask(task)}>
            Open
          </button>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={() => doneColumnId && onMoveTask(task.id, doneColumnId)}
            disabled={!doneColumnId || task.columnTitle === 'Done'}
          >
            <CheckCircle2 size={12} /> Done
          </button>
        </div>
      </div>
    </article>
  );
}
