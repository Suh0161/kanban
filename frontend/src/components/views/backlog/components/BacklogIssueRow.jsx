import { Calendar, CheckCircle2, CircleAlert, MessageSquare, Paperclip, Plus, X } from 'lucide-react';
import Select from '../../../ui/Select.jsx';
import { PRIORITIES } from '../../../../constants.js';

const priorityOptions = PRIORITIES.map(priority => ({ value: priority, label: priority }));

function formatDueDate(date) {
  if (!date) return 'No date';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BacklogIssueRow({ task, columns, columnOrder, onSelectTask, onMoveTask, onUpdateTask }) {
  const columnOptions = columnOrder
    .map(columnId => columns[columnId])
    .filter(Boolean)
    .map(column => ({ value: column.id, label: column.title }));

  const currentColumn = columnOptions.find(option => option.value === task.columnId);
  const missing = [
    !task.assigneeImg ? 'owner' : null,
    !task.dueDate ? 'date' : null,
    task.columnTitle === 'Inbox' ? 'triage' : null
  ].filter(Boolean);
  const isReady = missing.length === 0;
  const inSprint = task.sprintId === 'next-sprint';

  const toggleSprint = () => {
    onUpdateTask(task.id, { sprintId: inSprint ? null : 'next-sprint' });
  };

  return (
    <article className="backlog-issue-row">
      <span className={`backlog-issue-accent ${task.priority.toLowerCase()}`} />
      <div className="backlog-issue-main">
        <div className="workspace-task-meta">
          <span>{task.code}</span>
          <span>{task.columnTitle}</span>
        </div>
        <button type="button" className="backlog-issue-title" onClick={() => onSelectTask(task)}>
          {task.title}
        </button>
        <div className="workspace-task-tags">
          {task.tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
        <div className="backlog-readiness">
          <span className={inSprint ? 'planned' : isReady ? 'ready' : 'grooming'}>
            {inSprint ? <CheckCircle2 size={13} /> : isReady ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
            {inSprint ? 'Sprint draft' : isReady ? 'Ready' : 'Needs grooming'}
          </span>
          {!isReady && missing.map(item => <em key={item}>Missing {item}</em>)}
        </div>
      </div>

      <div className="backlog-field">
        <span>Priority</span>
        <Select
          value={task.priority}
          options={priorityOptions}
          className="backlog-select"
          onChange={value => onUpdateTask(task.id, { priority: value })}
        />
      </div>

      <div className="backlog-field">
        <span>Status</span>
        <Select
          value={currentColumn?.value || columnOptions[0]?.value}
          options={columnOptions}
          className="backlog-select"
          onChange={value => onMoveTask(task.id, value)}
        />
      </div>

      <label className="backlog-field">
        <span>Due</span>
        <input
          type="date"
          value={task.dueDate || ''}
          onChange={event => onUpdateTask(task.id, { dueDate: event.target.value || null })}
          aria-label={`${task.code} due date`}
        />
      </label>

      <div className="backlog-issue-meta">
        <span className={`workspace-priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
        <span className="workspace-muted">
          <Calendar size={13} />
          {formatDueDate(task.dueDate)}
        </span>
        <span className="workspace-muted">
          <MessageSquare size={13} />
          {task.metrics.comments}
        </span>
        <span className="workspace-muted">
          <Paperclip size={13} />
          {task.metrics.attachments}
        </span>
      </div>

      <div className="backlog-assignee">
        {task.assigneeImg ? <img src={task.assigneeImg} alt="" className="avatar" /> : <span className="workspace-avatar-empty" />}
        <button
          type="button"
          className={inSprint ? 'btn btn-outline btn-sm backlog-plan-btn planned' : 'btn btn-outline btn-sm backlog-plan-btn'}
          onClick={toggleSprint}
          disabled={!isReady && !inSprint}
          aria-label={inSprint ? `Remove ${task.code} from sprint draft` : `Add ${task.code} to sprint draft`}
        >
          {inSprint ? <X size={13} /> : <Plus size={13} />}
          {inSprint ? 'Remove' : 'Plan'}
        </button>
      </div>
    </article>
  );
}
