import { Calendar, CheckCheck, MessageSquare, Paperclip } from 'lucide-react';
import Select from '../../../ui/Select.jsx';
import { PRIORITIES } from '../../../../constants.js';
import { formatDate } from '../../../../utils/helpers.js';

const priorityOptions = PRIORITIES.map(priority => ({ value: priority, label: priority }));

export default function InboxReportRow({
  task,
  selected,
  columns,
  columnOrder,
  triageColumnId,
  onToggleSelected,
  onSelectTask,
  onMoveTask,
  onUpdateTask,
  canEdit = true,
}) {
  const columnOptions = columnOrder
    .map(columnId => columns[columnId])
    .filter(Boolean)
    .map(column => ({ value: column.id, label: column.title }));

  return (
    <article className={`inbox-report-row ${selected ? 'selected' : ''} ${!canEdit ? 'is-readonly' : ''}`.trim()}>
      {canEdit && (
        <label className="inbox-check">
          <input type="checkbox" checked={selected} onChange={() => onToggleSelected(task.id)} aria-label={`Select ${task.code}`} />
          <span />
        </label>
      )}
      <span className={`workspace-task-accent ${task.priority.toLowerCase()}`} />
      <div className="inbox-report-main">
        <div className="workspace-task-meta">
          <span>{task.code}</span>
          <span>{task.assigneeImg ? 'Assigned' : 'Unassigned'}</span>
        </div>
        <button type="button" className="inbox-report-title" onClick={() => onSelectTask(task)}>
          {task.title}
        </button>
        <div className="workspace-task-tags">
          {task.tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
      </div>

      {canEdit && (
        <div className="inbox-field">
          <span>Priority</span>
          <Select
            value={task.priority}
            options={priorityOptions}
            className="inbox-select"
            onChange={value => onUpdateTask(task.id, { priority: value })}
          />
        </div>
      )}

      {canEdit && (
        <div className="inbox-field">
          <span>Route</span>
          <Select
            value={task.columnId || columnOptions[0]?.value}
            options={columnOptions}
            className="inbox-select"
            onChange={value => onMoveTask(task.id, value)}
          />
        </div>
      )}

      <div className="inbox-report-meta">
        <span className={`workspace-priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
        <span className="workspace-muted"><Calendar size={13} />{task.dueDate ? formatDate(task.dueDate) : 'No date'}</span>
        <span className="workspace-muted"><MessageSquare size={13} />{task.metrics.comments}</span>
        <span className="workspace-muted"><Paperclip size={13} />{task.metrics.attachments}</span>
      </div>

      <div className="inbox-report-actions">
        <button className="btn btn-outline btn-sm" type="button" onClick={() => onSelectTask(task)}>Open</button>
        {canEdit && (
          <button className="btn btn-primary btn-sm" type="button" onClick={() => onMoveTask(task.id, triageColumnId)}>
            <CheckCheck size={13} /> Triage
          </button>
        )}
      </div>
    </article>
  );
}
